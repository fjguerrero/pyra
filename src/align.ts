// Alinear y distribuir. Con 1 objeto, respecto a la página; con varios, respecto a su bounding box.
import type { ShapeObj } from './model';

export type AlignKind = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom' | 'hdist' | 'vdist';

export interface Move {
  obj: ShapeObj;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export function bbox(objs: ShapeObj[]): { x: number; y: number; w: number; h: number } {
  const x0 = Math.min(...objs.map((o) => o.x));
  const y0 = Math.min(...objs.map((o) => o.y));
  const x1 = Math.max(...objs.map((o) => o.x + o.w));
  const y1 = Math.max(...objs.map((o) => o.y + o.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function computeAlign(
  objs: ShapeObj[],
  kind: AlignKind,
  page: { width: number; height: number },
): Move[] {
  if (objs.length === 0) return [];
  if ((kind === 'hdist' || kind === 'vdist') && objs.length < 3) return [];

  const ref = objs.length === 1 ? { x: 0, y: 0, w: page.width, h: page.height } : bbox(objs);
  const moves: Move[] = [];

  if (kind === 'hdist' || kind === 'vdist') {
    const horiz = kind === 'hdist';
    const sorted = [...objs].sort((a, b) => (horiz ? a.x - b.x : a.y - b.y));
    const total = sorted.reduce((s, o) => s + (horiz ? o.w : o.h), 0);
    const span = horiz ? ref.w : ref.h;
    const gap = (span - total) / (sorted.length - 1);
    let cur = horiz ? ref.x : ref.y;
    for (const o of sorted) {
      moves.push({ obj: o, from: { x: o.x, y: o.y }, to: horiz ? { x: cur, y: o.y } : { x: o.x, y: cur } });
      cur += (horiz ? o.w : o.h) + gap;
    }
    return moves;
  }

  for (const o of objs) {
    let { x, y } = o;
    if (kind === 'left') x = ref.x;
    else if (kind === 'right') x = ref.x + ref.w - o.w;
    else if (kind === 'hcenter') x = ref.x + (ref.w - o.w) / 2;
    else if (kind === 'top') y = ref.y;
    else if (kind === 'bottom') y = ref.y + ref.h - o.h;
    else if (kind === 'vcenter') y = ref.y + (ref.h - o.h) / 2;
    moves.push({ obj: o, from: { x: o.x, y: o.y }, to: { x, y } });
  }
  return moves;
}
