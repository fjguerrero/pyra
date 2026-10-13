// Exportación SVG: serializa la página de forma fiel, vector siempre que puede.
// Trazos del motor de pinceles → path con quads+arcos (fill-rule nonzero da el
// mismo alfa uniforme que el render). Polígonos suavizados → cúbicas de Bézier
// (misma familia Catmull-Rom que usa el render). Bitmaps → <image> con recorte
// (clip), goma (mask) y ajustes (filters). Módulo puro: testeable en node.

import {
  lineEnds, polyPoints,
  type BitmapObj, type Fx, type Gradient, type Obj, type Page, type ShapeObj, type TextObj,
} from './model';
import { flattenLayers } from './layers';
import { resampleSmooth, strokeOutline, type OutlineOp, type WPt } from './brush-engine';

const n2 = (v: number): string => String(Math.round(v * 100) / 100);
const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": 'apos' }[c]!};`);

export interface SvgExportOpts {
  /** Color de fondo de la página (el mismo del lienzo en la app). */
  bg: string;
  /** Dimensiones naturales de un data-URL de bitmap; null = desconocidas.
   *  En el navegador se resuelven decodificando la imagen; en tests, mapa fijo. */
  bitmapDims?: (src: string) => { w: number; h: number } | null;
}

interface Ctx {
  defs: string[];
  seq: number;
}

const nextId = (c: Ctx, p: string): string => `${p}${c.seq++}`;

/** Paradas del degradado: las intermedias mandan si hay >=2 (igual que en canvas). */
function stopsMarkup(g: Gradient): string {
  const st = g.stops && g.stops.length >= 2 ? [...g.stops].sort((a, b) => a.p - b.p) : [{ p: 0, c: g.from }, { p: 1, c: g.to }];
  return st.map((s) => `<stop offset="${n2(Math.max(0, Math.min(1, s.p)))}" stop-color="${esc(s.c)}"/>`).join('');
}

/** Gradiente lineal (ángulo CSS-like: 0° izq→der, 90° arriba→abajo). */
function gradientDef(c: Ctx, g: Gradient): string {
  const id = nextId(c, 'grad');
  if (g.radial) {
    // objectBoundingBox: el círculo se deforma a la elipse del bbox (igual que el canvas)
    c.defs.push(
      `<radialGradient id="${id}" cx="0.5" cy="0.5" r="0.5">` +
      stopsMarkup(g) + `</radialGradient>`,
    );
    return `url(#${id})`;
  }
  const rad = (g.angle * Math.PI) / 180;
  const dx = Math.cos(rad) / 2;
  const dy = Math.sin(rad) / 2;
  c.defs.push(
    `<linearGradient id="${id}" x1="${n2(0.5 - dx)}" y1="${n2(0.5 - dy)}" x2="${n2(0.5 + dx)}" y2="${n2(0.5 + dy)}">` +
    stopsMarkup(g) + `</linearGradient>`,
  );
  return `url(#${id})`;
}

/** Filtros de efectos (sombra, brillo, desenfoque) y ajustes de bitmap. */
function fxFilter(c: Ctx, fx: Fx | undefined, sat?: number, bri?: number): string | null {
  const parts: string[] = [];
  if (sat !== undefined && sat !== 1) parts.push(`<feColorMatrix type="saturate" values="${n2(sat)}"/>`);
  if (bri !== undefined && bri !== 1)
    parts.push(
      `<feComponentTransfer><feFuncR type="linear" slope="${n2(bri)}"/><feFuncG type="linear" slope="${n2(bri)}"/><feFuncB type="linear" slope="${n2(bri)}"/></feComponentTransfer>`,
    );
  if (fx?.blur) parts.push(`<feGaussianBlur stdDeviation="${n2(fx.blur / 2)}"/>`);
  if (fx?.shadow)
    parts.push(
      `<feDropShadow dx="${n2(fx.shadow.x)}" dy="${n2(fx.shadow.y)}" stdDeviation="${n2(fx.shadow.blur / 2)}" flood-color="${esc(fx.shadow.color)}"/>`,
    );
  if (fx?.glow)
    parts.push(`<feDropShadow dx="0" dy="0" stdDeviation="${n2(fx.glow.blur / 2)}" flood-color="${esc(fx.glow.color)}"/>`);
  if (!parts.length) return null;
  const id = nextId(c, 'fx');
  c.defs.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">${parts.join('')}</filter>`);
  return `url(#${id})`;
}

const rotAttr = (o: { x: number; y: number; w: number; h: number; rot?: number; flipH?: boolean; flipV?: boolean }): string => {
  const parts: string[] = [];
  if (o.rot) parts.push(`rotate(${n2(o.rot)} ${n2(o.x + o.w / 2)} ${n2(o.y + o.h / 2)})`);
  if (o.flipH || o.flipV) {
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    parts.push(`translate(${n2(cx)} ${n2(cy)}) scale(${o.flipH ? -1 : 1} ${o.flipV ? -1 : 1}) translate(${n2(-cx)} ${n2(-cy)})`);
  }
  return parts.length ? ` transform="${parts.join(' ')}"` : '';
};

const dashAttr = (o: ShapeObj): string => (o.dash ? ` stroke-dasharray="${o.dash.map(n2).join(' ')}"` : '');

const strokeAttrs = (o: ShapeObj): string =>
  o.stroke && o.strokeWidth > 0
    ? ` stroke="${esc(o.stroke)}" stroke-width="${n2(o.strokeWidth)}" stroke-opacity="${n2(o.strokeOpacity ?? 1)}"${dashAttr(o)} stroke-linecap="${o.brush === 'square' ? 'butt' : 'round'}" stroke-linejoin="${o.brush === 'square' ? 'miter' : 'round'}"`
    : '';

const fillAttr = (c: Ctx, o: ShapeObj): string =>
  o.gradient ? ` fill="${gradientDef(c, o.gradient)}"` : o.fill ? ` fill="${esc(o.fill)}"` : ' fill="none"';

/** Curvas cerradas Catmull-Rom → cúbicas de Bézier (mis familia que el render). */
function smoothClosedPath(P: { x: number; y: number }[]): string {
  const n = P.length;
  let d = `M ${n2(P[0].x)} ${n2(P[0].y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    d += ` C ${n2(p1.x + (p2.x - p0.x) / 6)} ${n2(p1.y + (p2.y - p0.y) / 6)} ${n2(p2.x - (p3.x - p1.x) / 6)} ${n2(p2.y - (p3.y - p1.y) / 6)} ${n2(p2.x)} ${n2(p2.y)}`;
  }
  return d + ' Z';
}

/** Contorno del trazo variable → path único; con fill-rule=nonzero el solape
 *  no duplica el alfa (igual que el canvas). */
function ribbonPath(ops: OutlineOp[]): string {
  let d = '';
  for (const op of ops) {
    if (op.op === 'arc') {
      const r = n2(op.r);
      d += ` M ${n2(op.x - op.r)} ${n2(op.y)} A ${r} ${r} 0 1 0 ${n2(op.x + op.r)} ${n2(op.y)} A ${r} ${r} 0 1 0 ${n2(op.x - op.r)} ${n2(op.y)} Z`;
    } else {
      d += ` ${op.op === 'move' ? 'M' : 'L'} ${n2(op.x)} ${n2(op.y)}`;
      // cerrar cada quad (4 vértices) como hace el relleno del canvas
    }
  }
  return d;
}

function shapeSvg(c: Ctx, o: ShapeObj): string {
  const common = `${rotAttr(o)}${strokeAttrs(o)}`;
  switch (o.shape) {
    case 'rect':
      return `<rect x="${n2(o.x)}" y="${n2(o.y)}" width="${n2(o.w)}" height="${n2(o.h)}"${o.rx ? ` rx="${n2(Math.min(o.rx, o.w / 2, o.h / 2))}"` : ''}${fillAttr(c, o)}${common}/>`;
    case 'ellipse':
      return `<ellipse cx="${n2(o.x + o.w / 2)}" cy="${n2(o.y + o.h / 2)}" rx="${n2(o.w / 2)}" ry="${n2(o.h / 2)}"${fillAttr(c, o)}${common}/>`;
    case 'line': {
      const e = lineEnds(o);
      return `<line x1="${n2(e.x1)}" y1="${n2(e.y1)}" x2="${n2(e.x2)}" y2="${n2(e.y2)}" fill="none"${common}/>`;
    }
    case 'polygon': {
      const P = polyPoints(o);
      if (P.length < 2) return '';
      const d = o.smooth && P.length >= 3 ? smoothClosedPath(P) : `M ${P.map((p) => `${n2(p.x)} ${n2(p.y)}`).join(' L ')} Z`;
      return `<path d="${d}"${o.fill ? fillAttr(c, o) : ' fill="none"'}${common}/>`;
    }
    case 'stroke': {
      if (!o.points?.length) return '';
      const base = Math.max(0.5, o.strokeWidth);
      const raw: WPt[] = o.points.map((p) => ({ x: o.x + p.x * o.w, y: o.y + p.y * o.h, w: base * Math.max(0.05, p.p) }));
      const dense = o.smooth ? resampleSmooth(raw, 2) : raw;
      const color = o.stroke ?? '#000000';
      if (o.tip) {
        // punta con imagen: se aproxima con la cinta del ancho base (sin doble alfa)
        const d = ribbonPath(strokeOutline(dense));
        return `<path d="${d}" fill="${esc(color)}" fill-opacity="${n2(o.strokeOpacity ?? 1)}" fill-rule="nonzero"${rotAttr(o)}/>`;
      }
      const d = ribbonPath(strokeOutline(dense));
      return `<path d="${d}" fill="${esc(color)}" fill-opacity="${n2(o.strokeOpacity ?? 1)}" fill-rule="nonzero"${rotAttr(o)}/>`;
    }
  }
  return '';
}

function bitmapSvg(c: Ctx, o: BitmapObj, dims: SvgExportOpts['bitmapDims']): string {
  const attrs: string[] = [];
  const filter = fxFilter(c, o.fx, o.sat, o.bri);
  if (filter) attrs.push(` filter="${filter}"`);
  let inner = '';
  const d = dims?.(o.src) ?? null;
  if (o.crop && d) {
    const sx = o.w / o.crop.w;
    const clip = nextId(c, 'clip');
    c.defs.push(`<clipPath id="${clip}"><rect x="${n2(o.x)}" y="${n2(o.y)}" width="${n2(o.w)}" height="${n2(o.h)}"/></clipPath>`);
    inner =
      `<g clip-path="url(#${clip})"><image href="${esc(o.src)}" x="${n2(o.x - o.crop.x * sx)}" y="${n2(o.y - o.crop.y * sx)}" width="${n2(d.w * sx)}" height="${n2(d.h * sx)}" preserveAspectRatio="none"/></g>`;
  } else {
    inner = `<image href="${esc(o.src)}" x="${n2(o.x)}" y="${n2(o.y)}" width="${n2(o.w)}" height="${n2(o.h)}" preserveAspectRatio="none"/>`;
  }
  if (o.erase?.length) {
    const mask = nextId(c, 'mask');
    const holes = o.erase
      .map((s) => `<circle cx="${n2(o.x + s.x * o.w)}" cy="${n2(o.y + s.y * o.h)}" r="${n2(s.r * o.w)}" fill="#000"/>`)
      .join('');
    c.defs.push(`<mask id="${mask}"><rect x="${n2(o.x)}" y="${n2(o.y)}" width="${n2(o.w)}" height="${n2(o.h)}" fill="#fff"/>${holes}</mask>`);
    inner = `<g mask="url(#${mask})">${inner}</g>`;
  }
  return `<g${rotAttr(o)}${attrs}>${inner}</g>`;
}

function textSvg(c: Ctx, o: TextObj): string {
  const filter = fxFilter(c, o.fx);
  const f = ` font-family="${esc(o.font)}" font-size="${n2(o.size)}"${o.bold ? ' font-weight="bold"' : ''}${o.italic ? ' font-style="italic"' : ''}`;
  const lines = o.text.split('\n');
  const ascent = o.size * 0.8;
  const body = lines
    .map((ln, i) => (i === 0 ? esc(ln) : `<tspan x="${n2(o.x)}" dy="${n2(o.size * 1.2)}">${esc(ln)}</tspan>`))
    .join('');
  return `<text x="${n2(o.x)}" y="${n2(o.y + ascent)}" fill="${esc(o.fill)}"${f}${filter ? ` filter="${filter}"` : ''}${rotAttr(o)} xml:space="preserve">${body}</text>`;
}

function objSvg(c: Ctx, o: Obj, opts: SvgExportOpts): string {
  // mezcla y opacidad: atributos en un envoltorio (mismo orden que el canvas: sobre lo ya pintado)
  let wrap = '';
  if (o.fx?.blend && o.fx.blend !== 'normal') wrap += ` style="mix-blend-mode:${o.fx.blend}"`;
  if (o.fx?.opacity !== undefined && o.fx.opacity < 1) wrap += ` opacity="${n2(o.fx.opacity)}"`;
  const blend = wrap;
  if (o.shape === 'text') {
    const s = textSvg(c, o);
    return blend ? `<g${blend}>${s}</g>` : s;
  }
  if (o.shape === 'bitmap') {
    const s = bitmapSvg(c, o, opts.bitmapDims);
    return blend ? `<g${blend}>${s}</g>` : s;
  }
  const filter = fxFilter(c, o.fx);
  const s = shapeSvg(c, o);
  if (!s) return '';
  if (filter) return `<g filter="${filter}"${blend}>${s}</g>`;
  return blend ? `<g${blend}>${s}</g>` : s;
}

/** SVG de una página completa (fondo incluido), en coordenadas de mundo. */
export function exportSvg(page: Page, opts: SvgExportOpts): string {
  const c: Ctx = { defs: [], seq: 0 };
  const body: string[] = [`<rect x="0" y="0" width="${n2(page.width)}" height="${n2(page.height)}" fill="${esc(opts.bg)}"/>`];
  for (const layer of flattenLayers(page.layers)) {
    if (!layer.visible) continue;
    const objs = layer.objects.map((o) => objSvg(c, o, opts)).filter(Boolean).join('');
    if (!objs) continue;
    body.push(layer.opacity < 1 ? `<g opacity="${n2(layer.opacity)}">${objs}</g>` : objs);
  }
  const defs = c.defs.length ? `<defs>${c.defs.join('')}</defs>` : '';
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${n2(page.width)}" height="${n2(page.height)}" viewBox="0 0 ${n2(page.width)} ${n2(page.height)}">` +
    `${defs}${body.join('')}</svg>`
  );
}
