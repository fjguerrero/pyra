// Smart guides: imanes a bordes, centros y bordes de página (el corazón del maquetado en Fireworks).
// ponytail: solo bordes/centros/página; la guía de "igual distancia" entre objetos entra cuando se note.

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Guide {
  axis: 'v' | 'h';
  pos: number; // coordenada de mundo
}

export interface Snap {
  dx: number;
  dy: number;
  guides: Guide[];
}

const anchors = (a: number, b: number): number[] => [a, (a + b) / 2, b];

function bestDelta(from: number[], targets: number[], tol: number): { d: number; at: number } | null {
  let best: { d: number; at: number } | null = null;
  for (const t of targets) {
    for (const a of from) {
      const d = t - a;
      if (Math.abs(d) <= tol && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, at: t };
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
  const xTargets = [0, page.width / 2, page.width];
  const yTargets = [0, page.height / 2, page.height];
  for (const g of page.guides ?? []) (g.axis === 'v' ? xTargets : yTargets).push(g.pos);
  for (const o of others) {
    xTargets.push(...anchors(o.x, o.x + o.w));
    yTargets.push(...anchors(o.y, o.y + o.h));
  }

  const out: Snap = { dx: 0, dy: 0, guides: [] };
  const bx = bestDelta(anchors(box.x, box.x + box.w), xTargets, tol);
  if (bx) {
    out.dx = bx.d;
    out.guides.push({ axis: 'v', pos: bx.at });
  }
  const by = bestDelta(anchors(box.y, box.y + box.h), yTargets, tol);
  if (by) {
    out.dy = by.d;
    out.guides.push({ axis: 'h', pos: by.at });
  }
  return out;
}
