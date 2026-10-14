// Scene graph: Document → Page → Layer → objects.
// ponytail: M3 (bitmap) y M4 (texto) ampliarán el union; todo lo que consume objetos
// (hit, asas, resize, align, guías) trabaja solo sobre el bbox x/y/w/h.

export type ShapeKind = 'rect' | 'ellipse' | 'line' | 'stroke' | 'polygon';

/** Punta del pincel: 'round' = punta redonda, 'square' = punta cuadrada. */
export type BrushShape = 'round' | 'square';

/** Ajustes de la herramienta pincel (como las Options de los Paint Tools de Fireworks). */
export interface BrushSettings {
  size: number;
  pressure: number; // 0..1: grosor de la traza
  opacity: number; // 0..1
  shape: BrushShape;
  /** Imagen usada como punta (SVG o bitmap en data URL); null = punta vectorial. */
  tip: string | null;
}

/** Esquina del bbox donde empieza una línea: el arrastre puede ir en cualquier signo (↖↗↙↘). */
export type LineFrom = 'nw' | 'ne' | 'sw' | 'se';

/** Modos de mezcla (los 15 de CSS blending + normal): canvas usa globalCompositeOperation, SVG mix-blend-mode. */
export type BlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
  | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light'
  | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';

export const BLEND_MODES: BlendMode[] = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light',
  'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
];

export interface Fx {
  shadow: { x: number; y: number; blur: number; color: string } | null;
  glow: { blur: number; color: string } | null;
  blur: number; // px de desenfoque aplicado al dibujar, 0 = ninguno
  /** Bisel: grosor del relieve interior dibujado al rellenar, 0 = ninguno. */
  bevel?: number;
  /** Modo de mezcla con lo ya pintado en la página (Fireworks: blending); ausente = normal. */
  blend?: BlendMode;
  /** Opacidad del objeto al pintarse (1 = opaco); ausente = 1. Se multiplica con la de la capa. */
  opacity?: number;
}

/** Efectos en vivo no destructivos: válidos para cualquier objeto. */
export type WithFx = { fx?: Fx };

export const NO_FX: Fx = { shadow: null, glow: null, blur: 0 };

/** Relleno con degradado lineal: 0° = izquierda→derecha, 90° = arriba→abajo. */
export interface Gradient {
  from: string;
  to: string;
  angle: number;
  radial?: boolean; // true = radial elíptico ajustado al bbox (Fireworks: Fill → Radial)
  stops?: { p: number; c: string }[]; // paradas intermedias (Fireworks: grad editor); si hay >=2 sustituyen a from/to
}

export interface ShapeObj {
  id: string;
  shape: ShapeKind;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke: string | null;
  strokeWidth: number;
  /** Relleno con degradado lineal; si está, sustituye a `fill` (que sigue guardando el color base). */
  gradient?: Gradient | null;
  fx?: Fx;
  /** Rotación en grados alrededor del centro del bbox. */
  rot?: number;
  /** Espejo alrededor del centro del bbox (Fireworks: Transform → Flip). */
  flipH?: boolean;
  flipV?: boolean;
  /** Radio de esquina en px solo para rect (Fireworks: live corner radius); 0/undefined = esquina viva. */
  rx?: number;
  /** Id de grupo: los objetos con el mismo id se seleccionan y mueven juntos (Ctrl+G). */
  group?: string;
  /** Pincel del trazo; undefined = redondo. */
  brush?: BrushShape;
  /** Traza del pincel: puntos normalizados 0..1 dentro del bbox, con su presión (1 = completo). */
  points?: { x: number; y: number; p: number }[];
  /** Imagen usada como punta del pincel (SVG o bitmap), estampada a lo largo de la traza. */
  tip?: string | null;
  /** Polígono (pen tool): vértices normalizados 0..1 dentro del bbox; se escala con el bbox. */
  poly?: { x: number; y: number }[];
  /** Asas Bézier por vértice, estilo FreeHand: offset relativo al vértice, normalizado como poly
   * (el mismo asa se usa espejada a ambos lados = nodo suave). null/ausente = nodo esquina (sin curva). */
  polyH?: ({ x: number; y: number } | null)[];
  /** Asa del lado entrante para nodos cúspide (pico anguloso, FreeHand): solo con polyH[i] puesto.
   * Ausente = el nodo es suave (asa espejada). */
  polyH2?: ({ x: number; y: number } | null)[];
  /** Trazo/lápiz suavizado o polígono con vértices curvos: se dibuja con Catmull-Rom. */
  smooth?: boolean;
  /** Guión del borde de un polígono (px de mundo); undefined = línea continua. */
  dash?: number[] | null;
  /** Opacidad del trazo (1 = opaco). */
  strokeOpacity?: number;
  /** Esquina de inicio del trazo de una línea; undefined = 'nw'. */
  lineFrom?: LineFrom;
}

/** Bitmap: la imagen se guarda embebida (data URL); crop son píxeles de la fuente original. */
export interface BitmapObj {
  id: string;
  shape: 'bitmap';
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
  crop: { x: number; y: number; w: number; h: number } | null;
  sat: number; // 1 = original
  bri: number; // 1 = original
  fx?: Fx;
  rot?: number;
  flipH?: boolean;
  flipV?: boolean;
  /** Id de grupo: los objetos con el mismo id se seleccionan y mueven juntos (Ctrl+G). */
  group?: string;
  /** Goma de borrar: círculos borrados en coordenadas normalizadas 0..1 del bbox. */
  erase?: { x: number; y: number; r: number }[];
}

export type Obj = ShapeObj | BitmapObj | TextObj;

/** Extremos reales de una línea según su bbox y su esquina de inicio. */
export function lineEnds(o: { x: number; y: number; w: number; h: number; lineFrom?: LineFrom }): {
  x1: number; y1: number; x2: number; y2: number;
} {
  const from = o.lineFrom ?? 'nw';
  const west = from === 'nw' || from === 'sw';
  const north = from === 'nw' || from === 'ne';
  return {
    x1: west ? o.x : o.x + o.w,
    y1: north ? o.y : o.y + o.h,
    x2: west ? o.x + o.w : o.x,
    y2: north ? o.y + o.h : o.y,
  };
}

/** Espejo de un punto por el centro del bbox; autoinverso: sirve para ir y volver. */
export const flipPt = (o: { x: number; y: number; w: number; h: number; flipH?: boolean; flipV?: boolean }, p: { x: number; y: number }): { x: number; y: number } => ({
  x: o.flipH ? o.x + o.w - p.x : p.x,
  y: o.flipV ? o.y + o.h - p.y : p.y,
});

/** Líneas y trazos de pincel: se pintan con trazo, no con relleno. */
export const isLineLike = (o: { shape: string }): boolean => o.shape === 'line' || o.shape === 'stroke';

/** Vértices de mundo de un polígono (pen tool). */
export const polyPoints = (o: { x: number; y: number; w: number; h: number; poly?: { x: number; y: number }[] }): { x: number; y: number }[] =>
  (o.poly ?? []).map((p) => ({ x: o.x + p.x * o.w, y: o.y + p.y * o.h }));

/** ¿El polígono tiene nodos Bézier (asas polyH)? Entonces manda la curva cúbica sobre `smooth`. */
export const polyHasCurves = (o: { polyH?: ({ x: number; y: number } | null)[]; polyH2?: ({ x: number; y: number } | null)[] }): boolean => !!o.polyH?.some(Boolean) || !!o.polyH2?.some(Boolean);

type WPt = { x: number; y: number };
/** Polígono con asas Bézier (entrada de polySegs/polyOutline). */
export type PolyBezier = { x: number; y: number; w: number; h: number; poly?: WPt[]; polyH?: ({ x: number; y: number } | null)[]; polyH2?: ({ x: number; y: number } | null)[] };

/** Segmentos de mundo de un polígono cerrado (FreeHand): cúbicos si el nodo tiene asa, rectos si es esquina.
 * Sin polyH2, el asa se espeja a ambos lados (nodo suave); con polyH2 el lado entrante es libre (cúspide/pico). */
export function polySegs(o: PolyBezier): { a: WPt; b: WPt; c1?: WPt; c2?: WPt }[] {
  const v = polyPoints(o);
  const H = (o.polyH ?? []).map((h) => (h ? { x: h.x * o.w, y: h.y * o.h } : null));
  const H2 = (o.polyH2 ?? []).map((h) => (h ? { x: h.x * o.w, y: h.y * o.h } : null));
  const segs: { a: WPt; b: WPt; c1?: WPt; c2?: WPt }[] = [];
  for (let i = 0; i < v.length; i++) {
    const a = v[i], b = v[(i + 1) % v.length], ha = H[i], hb = H[(i + 1) % v.length], hb2 = H2[(i + 1) % v.length];
    if (!ha && !hb) segs.push({ a, b });
    else segs.push({ a, b, c1: { x: a.x + (ha?.x ?? 0), y: a.y + (ha?.y ?? 0) }, c2: hb2 ? { x: b.x + hb2.x, y: b.y + hb2.y } : { x: b.x - (hb?.x ?? 0), y: b.y - (hb?.y ?? 0) } });
  }
  return segs;
}

/** Contorno de mundo de un polígono: aplanado si tiene curvas (para hit-test y unión). */
export function polyOutline(o: PolyBezier, samples = 12): WPt[] {
  if (!polyHasCurves(o)) return polyPoints(o);
  const out: WPt[] = [];
  for (const s of polySegs(o)) {
    out.push(s.a);
    if (s.c1 && s.c2)
      for (let k = 1; k <= samples; k++) {
        const t = k / samples, u = 1 - t;
        out.push({
          x: u ** 3 * s.a.x + 3 * u * u * t * s.c1.x + 3 * u * t * t * s.c2.x + t ** 3 * s.b.x,
          y: u ** 3 * s.a.y + 3 * u * u * t * s.c1.y + 3 * u * t * t * s.c2.y + t ** 3 * s.b.y,
        });
      }
    else out.push(s.b);
  }
  out.pop(); // cerrado: el último punto coincide con el primero
  return out;
}

/** Segmento de mundo de un polígono (salida de polySegs). */
export type Seg = { a: WPt; b: WPt; c1?: WPt; c2?: WPt };

/** Punto de un segmento en el parámetro t (0..1). */
export const segPoint = (s: Seg, t: number): WPt => {
  if (!s.c1 || !s.c2) return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
  const u = 1 - t;
  return {
    x: u ** 3 * s.a.x + 3 * u * u * t * s.c1.x + 3 * u * t * t * s.c2.x + t ** 3 * s.b.x,
    y: u ** 3 * s.a.y + 3 * u * u * t * s.c1.y + 3 * u * t * t * s.c2.y + t ** 3 * s.b.y,
  };
};

/** Parte un segmento en t (de Casteljau): al insertar un nodo la curva queda idéntica. */
export function splitSeg(s: Seg, t: number): [Seg, Seg] {
  const lerp = (p: WPt, q: WPt): WPt => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
  if (!s.c1 || !s.c2) { const m = lerp(s.a, s.b); return [{ a: s.a, b: m }, { a: m, b: s.b }]; }
  const A = lerp(s.a, s.c1), B = lerp(s.c1, s.c2), C = lerp(s.c2, s.b);
  const D = lerp(A, B), E = lerp(B, C), M = lerp(D, E);
  return [{ a: s.a, b: M, c1: A, c2: D }, { a: M, b: s.b, c1: E, c2: C }];
}

/** Punto más cercano al contorno del polígono (mundo): segmento i y parámetro t; null si pasa de tol. */
export function polyNearestSeg(o: PolyBezier, p: WPt, tol: number): { i: number; t: number } | null {
  let best: { i: number; t: number; d: number } | null = null;
  polySegs(o).forEach((s, i) => {
    // ponytail: 16 muestras por tramo curvo bastan para el hit-test; subir si se nota impreciso
    const steps = s.c1 && s.c2 ? 16 : 1;
    let prev = segPoint(s, 0);
    for (let k = 1; k <= steps; k++) {
      const q = segPoint(s, k / steps);
      const dx = q.x - prev.x, dy = q.y - prev.y, L2 = dx * dx + dy * dy || 1;
      const u = Math.max(0, Math.min(1, ((p.x - prev.x) * dx + (p.y - prev.y) * dy) / L2));
      const d = Math.hypot(p.x - (prev.x + dx * u), p.y - (prev.y + dy * u));
      if (d <= tol && (!best || d < best.d)) best = { i, t: (k - 1 + u) / steps, d };
      prev = q;
    }
  });
  return best;
}

type NH = ({ x: number; y: number } | null);
const padArr = <T,>(a: T[] | undefined, n: number, d: T): T[] => Array.from({ length: n }, (_, i) => a?.[i] ?? d);

/** Vértices y asas del polígono en coords de mundo, con longitudes parejas. */
const polyToWorld = (o: PolyBezier): { v: WPt[]; H: NH[]; H2: NH[] } => {
  const v = polyPoints(o);
  const sc = (a: NH[] | undefined): NH[] => padArr(a ?? [], v.length, null).map((h) => (h ? { x: h.x * o.w, y: h.y * o.h } : null));
  return { v, H: sc(o.polyH), H2: sc(o.polyH2) };
};

/** Reconstruye el bbox desde los vértices de mundo y re-normaliza puntos y asas (formato de creación). */
function polyReflow(o: ShapeObj, v: WPt[], H: NH[], H2: NH[]): void {
  const xs = v.map((q) => q.x), ys = v.map((q) => q.y);
  const x = Math.round(Math.min(...xs)), y = Math.round(Math.min(...ys));
  const w = Math.max(1, Math.round(Math.max(...xs) - x)), h = Math.max(1, Math.round(Math.max(...ys) - y));
  Object.assign(o, { x, y, w, h });
  o.poly = v.map((q) => ({ x: (q.x - x) / w, y: (q.y - y) / h }));
  if (H.some(Boolean)) o.polyH = H.map((hh) => (hh ? { x: hh.x / w, y: hh.y / h } : null)); else delete o.polyH;
  if (H2.some(Boolean)) o.polyH2 = H2.map((hh) => (hh ? { x: hh.x / w, y: hh.y / h } : null)); else delete o.polyH2;
}

/** Inserta un nodo en el segmento i en t, partiendo la curva (de Casteljau) sin cambiar la forma. Devuelve el índice nuevo. */
export function polyInsertOnSeg(o: ShapeObj, i: number, t: number): number {
  const { v, H, H2 } = polyToWorld(o);
  const segs = polySegs(o);
  const [s1, s2] = splitSeg(segs[i], t);
  const m = s1.b, ni = i + 1; // cerrado: el último tramo termina en v[0] → el nodo nuevo va al final
  const curved = !!(segs[i].c1 && segs[i].c2);
  const n = v.length, bOrig = (i + 1) % n;
  const hOutA = H[i], hInA = H2[i], hOutB = H[bOrig], hInB = H2[bOrig]; // asas originales, antes del splice
  v.splice(ni, 0, m); H.splice(ni, 0, null); H2.splice(ni, 0, null);
  if (curved) {
    // Forma exacta (como los editores vectoriales): el nodo nuevo recibe las dos asas del
    // corte y los vecinos SOLO cambian el lado del tramo partido; su saliente no se toca.
    // Un nodo suave vecino pasa a cúspide asimétrica (asas colineales: sigue viéndose suave).
    if (hOutA) {
      H[i] = { x: s1.c1!.x - v[i].x, y: s1.c1!.y - v[i].y }; // saliente = A
      if (!hInA) H2[i] = { x: -hOutA.x, y: -hOutA.y }; // conservamos el entrante original (era espejo)
    }
    H[ni] = { x: s2.c1!.x - m.x, y: s2.c1!.y - m.y }; // saliente = E
    H2[ni] = { x: s1.c2!.x - m.x, y: s1.c2!.y - m.y }; // entrante = D
    if (Math.abs(H2[ni]!.x + H[ni]!.x) < 1e-9 && Math.abs(H2[ni]!.y + H[ni]!.y) < 1e-9) H2[ni] = null; // exacto en t=0.5: sigue siendo espejo
    const b = bOrig === 0 ? 0 : i + 2; // el vértice destino tras el splice
    if (hOutB || hInB) H2[b] = { x: s2.c2!.x - v[b].x, y: s2.c2!.y - v[b].y }; // entrante = C; el saliente no se toca
  }
  polyReflow(o, v, H, H2);
  return ni;
}

/** Borra el vértice i con sus asas; false si bajaría de 3 (el mínimo de un polígono). */
export function polyDeleteVertex(o: ShapeObj, i: number): boolean {
  const { v, H, H2 } = polyToWorld(o);
  if (v.length <= 3) return false;
  v.splice(i, 1); H.splice(i, 1); H2.splice(i, 1);
  polyReflow(o, v, H, H2);
  return true;
}

/** Reconstruye el bbox del trazo desde sus puntos de mundo (media anchura incluida) y re-normaliza. */
function strokeReflow(o: ShapeObj, pts: { x: number; y: number; pr: number }[]): void {
  const half = (o.strokeWidth * Math.max(0.05, ...pts.map((q) => q.pr))) / 2;
  const xs = pts.map((q) => q.x), ys = pts.map((q) => q.y);
  const x0 = Math.round(Math.min(...xs) - half), y0 = Math.round(Math.min(...ys) - half);
  const w = Math.max(1, Math.round(Math.max(...xs) + half - x0)), h = Math.max(1, Math.round(Math.max(...ys) + half - y0));
  Object.assign(o, { x: x0, y: y0, w, h });
  o.points = pts.map((q) => ({ x: (q.x - x0) / w, y: (q.y - y0) / h, p: q.pr }));
}

/** Punto más cercano a la polilínea del trazo (mundo): índice del punto previo y parámetro t; null si pasa de tol. */
export function strokeNearestPoint(o: ShapeObj, p: WPt, tol: number): { i: number; t: number } | null {
  const pts = (o.points ?? []).map((q) => ({ x: o.x + q.x * o.w, y: o.y + q.y * o.h }));
  let best: { i: number; t: number; d: number } | null = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2));
    const d = Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
    if (d <= tol && (!best || d < best.d)) best = { i, t, d };
  }
  return best;
}

/** Inserta un punto en el tramo i del trazo en t (presión interpolada). Devuelve el índice nuevo. */
export function strokeInsertPoint(o: ShapeObj, i: number, t: number): number {
  const pts = (o.points ?? []).map((q) => ({ x: o.x + q.x * o.w, y: o.y + q.y * o.h, pr: q.p }));
  const a = pts[i], b = pts[i + 1];
  pts.splice(i + 1, 0, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, pr: a.pr + (b.pr - a.pr) * t });
  strokeReflow(o, pts);
  return i + 1;
}

/** Borra el punto i del trazo; false si bajaría de 2. */
export function strokeDeletePoint(o: ShapeObj, i: number): boolean {
  const pts = (o.points ?? []).map((q) => ({ x: o.x + q.x * o.w, y: o.y + q.y * o.h, pr: q.p }));
  if (pts.length <= 2) return false;
  pts.splice(i, 1);
  strokeReflow(o, pts);
  return true;
}

/** Mover el nodo i: recalcula el bbox y re-normaliza (mismo formato que al crear). */
export function setNode(o: Obj, i: number, p: { x: number; y: number }): void {
  if (o.shape === 'stroke' && o.points) {
    const pts = o.points.map((q) => ({ x: o.x + q.x * o.w, y: o.y + q.y * o.h, pr: q.p }));
    pts[i] = { x: p.x, y: p.y, pr: pts[i].pr };
    strokeReflow(o, pts);
  } else if (o.shape === 'polygon' && o.poly) {
    const { v, H, H2 } = polyToWorld(o);
    v[i] = { x: p.x, y: p.y };
    polyReflow(o, v, H, H2);
  } else if (o.shape === 'line') {
    const e = lineEnds(o);
    let a = { x: e.x1, y: e.y1 }, b = { x: e.x2, y: e.y2 };
    if (i === 0) a = p;
    else b = p;
    const x = Math.round(Math.min(a.x, b.x)), y = Math.round(Math.min(a.y, b.y));
    const w = Math.max(1, Math.round(Math.abs(b.x - a.x))), h = Math.max(1, Math.round(Math.abs(b.y - a.y)));
    Object.assign(o, { x, y, w, h, lineFrom: (`${a.y < b.y ? 'n' : 's'}${a.x < b.x ? 'w' : 'e'}`) as LineFrom });
  }
}

/** Hull convexo (Andrew's monotone chain): la unión aproximada de varias formas. */
export function convexHull(pts: { x: number; y: number }[]): { x: number; y: number }[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: { x: number; y: number }[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: { x: number; y: number }[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Texto: bbox medido desde el contenido; se edita como objeto normal. */
export interface TextObj {
  id: string;
  shape: 'text';
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  font: string; // CSS font-family
  size: number; // px
  bold?: boolean;
  italic?: boolean;
  fill: string;
  fx?: Fx;
  rot?: number;
  flipH?: boolean;
  flipV?: boolean;
  /** Id de grupo: los objetos con el mismo id se seleccionan y mueven juntos (Ctrl+G). */
  group?: string;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  objects: Obj[];
  /** Capa padre (nesting). Ausente = raíz. */
  parent?: string;
}

/** Guía manual de página (arrastrable; Alt+clic la borra). */
export interface PageGuide {
  axis: 'v' | 'h';
  pos: number; // coordenada de mundo
}

export interface Page {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: Layer[];
  guides?: PageGuide[];
}

export interface Doc {
  version: 1;
  name: string;
  activePageId: string;
  pages: Page[];
  /** Estilos reutilizables (como los Styles de Fireworks): paquetes de aspecto aplicables a cualquier objeto. */
  styles?: Style[];
  /** Unidad de visualización del inspector (el modelo interno siempre es px). */
  unit?: Unit;
  /** Resolución de impresión en dpi: ancla de la conversión de unidades y del pHYs del PNG exportado. */
  dpi?: number;
}

/** Unidades de inspección/impresión. px es la interna; las demás se derivan del dpi del documento. */
export type Unit = 'px' | 'in' | 'cm' | 'mm';

export const docDpi = (doc: Doc): number => doc.dpi ?? 72;

/** Píxeles por unidad de visualización; 1 para px. */
export const unitFactor = (doc: Doc): number => {
  const dpi = docDpi(doc);
  if (doc.unit === 'in') return dpi;
  if (doc.unit === 'cm') return dpi / 2.54;
  if (doc.unit === 'mm') return dpi / 25.4;
  return 1;
};

/** Paquete de aspecto: fill/stroke/degradado/efectos. Sin geometría: se aplica a lo que sea. */
export interface Style {
  id: string;
  name: string;
  fill: string;
  stroke: string | null;
  strokeWidth: number;
  gradient?: Gradient | null;
  fx?: Fx;
}

export const uid = (): string => crypto.randomUUID();

export function newDoc(name = 'Sin título'): Doc {
  const page: Page = {
    id: uid(),
    name: 'Página 1',
    width: 1280,
    height: 800,
    layers: [{ id: uid(), name: 'Capa 1', visible: true, locked: false, opacity: 1, objects: [] }],
  };
  return { version: 1, name, activePageId: page.id, pages: [page] };
}

/** La página activa; si la referencia no existe, la primera (nunca undefined). */
export function activePage(doc: Doc): Page {
  return doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];
}
