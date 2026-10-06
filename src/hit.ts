import type { Layer, Obj, Page } from './model';
import type { View } from './view';

export function hitTest(page: Page, wx: number, wy: number, tol = 0): Obj | null {
  for (let i = page.layers.length - 1; i >= 0; i--) {
    const l = page.layers[i];
    if (!l.visible || l.locked) continue;
    for (let j = l.objects.length - 1; j >= 0; j--) {
      const o = l.objects[j];
      if (hitObj(o, wx, wy, tol)) return o;
    }
  }
  return null;
}

/** Punto dentro del objeto según su forma. `tol` es un margen en unidades de mundo. */
export function hitObj(o: Obj, wx: number, wy: number, tol = 0): boolean {
  const rot = o.rot ?? 0;
  if (rot) {
    // llevar el punto al espacio local del objeto (deshacer la rotación)
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    const a = (-rot * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
    const dx = wx - cx, dy = wy - cy;
    wx = cx + dx * c - dy * sn;
    wy = cy + dx * sn + dy * c;
  }
  if (wx < o.x - tol || wx > o.x + o.w + tol || wy < o.y - tol || wy > o.y + o.h + tol) return false;
  if (o.shape === 'rect' || o.shape === 'bitmap' || o.shape === 'text') return true;

  const cx = o.x + o.w / 2;
  const cy = o.y + o.h / 2;
  const rx = o.w / 2 + tol;
  const ry = o.h / 2 + tol;
  if (rx <= 0 || ry <= 0) return false;

  if (o.shape === 'ellipse') return ((wx - cx) / rx) ** 2 + ((wy - cy) / ry) ** 2 <= 1;

  // línea: cerca del segmento que va de la esquina superior-izquierda a la inferior-derecha
  const x0 = o.x;
  const y0 = o.y;
  const x1 = o.x + o.w;
  const y1 = o.y + o.h;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(wx - x0, wy - y0) <= tol;
  const t = Math.max(0, Math.min(1, ((wx - x0) * dx + (wy - y0) * dy) / len2));
  return Math.hypot(wx - (x0 + t * dx), wy - (y0 + t * dy)) <= tol;
}

export function findObj(page: Page, id: string | null): Obj | null {
  if (!id) return null;
  for (const l of page.layers) {
    const o = l.objects.find((o) => o.id === id);
    if (o) return o;
  }
  return null;
}

export function findLayer(page: Page, obj: Obj): Layer | null {
  return page.layers.find((l) => l.objects.includes(obj)) ?? null;
}

export type HandleRole = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rot';

export interface Handle {
  role: HandleRole;
  x: number;
  y: number;
}

/** 8 asas de redimensionado en coordenadas de pantalla. */
export function handles(obj: Obj, v: View): Handle[] {
  const x0 = obj.x * v.zoom + v.panX;
  const y0 = obj.y * v.zoom + v.panY;
  const x1 = (obj.x + obj.w) * v.zoom + v.panX;
  const y1 = (obj.y + obj.h) * v.zoom + v.panY;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const pts: [HandleRole, number, number][] = [
    ['nw', x0, y0], ['n', mx, y0], ['ne', x1, y0], ['e', x1, my],
    ['se', x1, y1], ['s', mx, y1], ['sw', x0, y1], ['w', x0, my],
    ['rot', mx, y0 - 18], // manija de rotación sobre el asa superior
  ];
  const rot = obj.rot ?? 0;
  if (rot) {
    // girar las asas alrededor del centro, como el propio objeto
    const a = (rot * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
    for (const p of pts) {
      const dx = p[1] - mx, dy = p[2] - my;
      p[1] = mx + dx * c - dy * sn;
      p[2] = my + dx * sn + dy * c;
    }
  }
  return pts.map(([role, x, y]) => ({ role, x, y }));
}

export function hitHandle(px: number, py: number, hs: Handle[], r = 7): Handle | null {
  for (const h of hs) {
    if (Math.abs(px - h.x) <= r && Math.abs(py - h.y) <= r) return h;
  }
  return null;
}

export function applyResize(
  obj: Obj,
  start: { x: number; y: number; w: number; h: number },
  role: HandleRole,
  dxw: number,
  dyw: number,
): void {
  let { x, y, w, h } = start;
  if (role.includes('w')) {
    x = start.x + dxw;
    w = start.w - dxw;
  }
  if (role.includes('e')) w = start.w + dxw;
  if (role.includes('n')) {
    y = start.y + dyw;
    h = start.h - dyw;
  }
  if (role.includes('s')) h = start.h + dyw;
  if (w < 1) {
    if (role.includes('w')) x = start.x + start.w - 1;
    w = 1;
  }
  if (h < 1) {
    if (role.includes('n')) y = start.y + start.h - 1;
    h = 1;
  }
  obj.x = x;
  obj.y = y;
  obj.w = w;
  obj.h = h;
}
