import type { Layer, Obj, Page } from './model';
import type { View } from './view';

export function hitTest(page: Page, wx: number, wy: number): Obj | null {
  for (let i = page.layers.length - 1; i >= 0; i--) {
    const l = page.layers[i];
    if (!l.visible || l.locked) continue;
    for (let j = l.objects.length - 1; j >= 0; j--) {
      const o = l.objects[j];
      if (wx >= o.x && wx <= o.x + o.w && wy >= o.y && wy <= o.y + o.h) return o;
    }
  }
  return null;
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

export type HandleRole = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

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
  return [
    { role: 'nw', x: x0, y: y0 },
    { role: 'n', x: mx, y: y0 },
    { role: 'ne', x: x1, y: y0 },
    { role: 'e', x: x1, y: my },
    { role: 'se', x: x1, y: y1 },
    { role: 's', x: mx, y: y1 },
    { role: 'sw', x: x0, y: y1 },
    { role: 'w', x: x0, y: my },
  ];
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
