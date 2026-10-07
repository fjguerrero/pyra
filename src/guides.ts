// Smart guides: imanes a bordes, centros y bordes de página (el corazón del maquetado en Fireworks),
// más la guía de "igual distancia": encajar el hueco justo entre dos objetos.

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Guide {
  axis: 'v' | 'h';
  pos: number; // coordenada de mundo
  /** 'page' = borde/centro de página. Solo las de objeto se dibujan: son las que el usuario ve como referencia real. */
  kind?: 'obj' | 'page';
}

export interface Snap {
  dx: number;
  dy: number;
  guides: Guide[];
}

interface Target {
  v: number;
  lo: number; // la caja debe quedar dentro de [lo, hi] para usar este imán
  hi: number;
  kind: 'obj' | 'page';
}

const anchors = (a: number, b: number): number[] => [a, (a + b) / 2, b];
const ANY: Target = { v: 0, lo: -Infinity, hi: Infinity, kind: 'page' };
const target = (v: number, kind: 'obj' | 'page' = 'page'): Target => ({ ...ANY, v, kind });

function bestDelta(from: number[], targets: Target[], tol: number, size: number): { d: number; at: number; kind: 'obj' | 'page' } | null {
  let best: { d: number; at: number; kind: 'obj' | 'page' } | null = null;
  for (const t of targets) {
    for (const a of from) {
      const d = t.v - a;
      // para un imán de hueco, la caja debe caber a un lado del punto medio
      if (t.hi < Infinity && a + d < t.lo && a + d + size > t.hi) continue;
      if (Math.abs(d) <= tol && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, at: t.v, kind: t.kind };
    }
  }
  return best;
}

/** Desplazamiento de imán para `box`, ignorando los objetos ya seleccionados (los otros). */
export function snapBox(
  box: Box,
  others: Box[],
  page: { width: number; height: number; guides?: { axis: 'v' | 'h'; pos: number }[] },
  tol: number,
): Snap {
  const xTargets: Target[] = [target(0), target(page.width / 2), target(page.width)];
  const yTargets: Target[] = [target(0), target(page.height / 2), target(page.height)];
  for (const g of page.guides ?? []) (g.axis === 'v' ? xTargets : yTargets).push(target(g.pos));
  for (const o of others) {
    xTargets.push(...anchors(o.x, o.x + o.w).map((v) => target(v, 'obj')));
    yTargets.push(...anchors(o.y, o.y + o.h).map((v) => target(v, 'obj')));
  }
  // igual distancia: el punto medio entre anclas de dos objetos distintos = huecos iguales a ambos
  const us = others;
  for (let i = 0; i < us.length; i++)
    for (let j = i + 1; j < us.length; j++) {
      for (const [a, b] of [[us[i].x, us[j].x], [us[i].x + us[i].w, us[j].x + us[j].w], [us[i].x, us[j].x + us[j].w], [us[i].x + us[i].w, us[j].x]] as const)
        if (Math.abs(b - a) >= 8) xTargets.push({ v: (a + b) / 2, lo: Math.min(a, b), hi: Math.max(a, b), kind: 'obj' });
      for (const [a, b] of [[us[i].y, us[j].y], [us[i].y + us[i].h, us[j].y + us[j].h], [us[i].y, us[j].y + us[j].h], [us[i].y + us[i].h, us[j].y]] as const)
        if (Math.abs(b - a) >= 8) yTargets.push({ v: (a + b) / 2, lo: Math.min(a, b), hi: Math.max(a, b), kind: 'obj' });
    }

  const out: Snap = { dx: 0, dy: 0, guides: [] };
  const bx = bestDelta(anchors(box.x, box.x + box.w), xTargets, tol, box.w);
  if (bx) {
    out.dx = bx.d;
    out.guides.push({ axis: 'v', pos: bx.at, kind: bx.kind });
  }
  const by = bestDelta(anchors(box.y, box.y + box.h), yTargets, tol, box.h);
  if (by) {
    out.dy = by.d;
    out.guides.push({ axis: 'h', pos: by.at, kind: by.kind });
  }
  return out;
}
