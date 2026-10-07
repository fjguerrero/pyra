// Alinear y distribuir. Con 1 objeto, respecto a la página; con varios, respecto a su bounding box.
// Los objetos con el mismo `group` se tratan como una unidad (se mueven juntos).
import type { Obj } from './model';

export type AlignKind = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom' | 'hdist' | 'vdist';

export interface Move {
  obj: Obj;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

// alineación solo necesita el bbox: sirve para cualquier Obj
type BBoxable = Pick<Obj, 'x' | 'y' | 'w' | 'h'>;

interface Unit {
  objs: Obj[];
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Agrupa por `group`: cada grupo es una unidad con su bbox común. */
function units(objs: Obj[]): Unit[] {
  const byGroup = new Map<string, Obj[]>();
  const out: Unit[] = [];
  for (const o of objs) {
    if (!o.group) {
      out.push({ objs: [o], x: o.x, y: o.y, w: o.w, h: o.h });
      continue;
    }
    const g = byGroup.get(o.group) ?? [];
    g.push(o);
    byGroup.set(o.group, g);
  }
  for (const g of byGroup.values()) {
    const x0 = Math.min(...g.map((o) => o.x));
    const y0 = Math.min(...g.map((o) => o.y));
    out.push({ objs: g, x: x0, y: y0, w: Math.max(...g.map((o) => o.x + o.w)) - x0, h: Math.max(...g.map((o) => o.y + o.h)) - y0 });
  }
  return out;
}

export function bbox(objs: BBoxable[]): { x: number; y: number; w: number; h: number } {
  const x0 = Math.min(...objs.map((o) => o.x));
  const y0 = Math.min(...objs.map((o) => o.y));
  const x1 = Math.max(...objs.map((o) => o.x + o.w));
  const y1 = Math.max(...objs.map((o) => o.y + o.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function computeAlign(
  objs: Obj[],
  kind: AlignKind,
  page: { width: number; height: number },
): Move[] {
  if (objs.length === 0) return [];
  const us = units(objs);
  if ((kind === 'hdist' || kind === 'vdist') && us.length < 3) return [];

  const ref = us.length === 1 ? { x: 0, y: 0, w: page.width, h: page.height } : bbox(us);
  const moves: Move[] = [];
  const push = (u: Unit, x: number, y: number): void => {
    for (const o of u.objs) moves.push({ obj: o, from: { x: o.x, y: o.y }, to: { x: o.x + x - u.x, y: o.y + y - u.y } });
  };

  if (kind === 'hdist' || kind === 'vdist') {
    const horiz = kind === 'hdist';
    const sorted = [...us].sort((a, b) => (horiz ? a.x - b.x : a.y - b.y));
    const total = sorted.reduce((s, u) => s + (horiz ? u.w : u.h), 0);
    const span = horiz ? ref.w : ref.h;
    const gap = (span - total) / (sorted.length - 1);
    let cur = horiz ? ref.x : ref.y;
    for (const u of sorted) {
      if (horiz) push(u, cur, u.y);
      else push(u, u.x, cur);
      cur += (horiz ? u.w : u.h) + gap;
    }
    return moves;
  }

  for (const u of us) {
    let { x, y } = u;
    if (kind === 'left') x = ref.x;
    else if (kind === 'right') x = ref.x + ref.w - u.w;
    else if (kind === 'hcenter') x = ref.x + (ref.w - u.w) / 2;
    else if (kind === 'top') y = ref.y;
    else if (kind === 'bottom') y = ref.y + ref.h - u.h;
    else if (kind === 'vcenter') y = ref.y + (ref.h - u.h) / 2;
    push(u, x, y);
  }
  return moves;
}
