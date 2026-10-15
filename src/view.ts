export interface View {
  zoom: number;
  panX: number;
  panY: number;
}

export interface Size {
  width: number;
  height: number;
}

export const worldToScreen = (v: View, x: number, y: number) => ({
  x: x * v.zoom + v.panX,
  y: y * v.zoom + v.panY,
});

export const screenToWorld = (v: View, x: number, y: number) => ({
  x: (x - v.panX) / v.zoom,
  y: (y - v.panY) / v.zoom,
});

export function fitAll(v: View, page: Size, cw: number, ch: number, margin = 48): void {
  fitRect(v, { x: 0, y: 0, width: page.width, height: page.height }, cw, ch, margin);
}

/** Encuadra un rectángulo del mundo en el lienzo (Ctrl+0: ajustar a la selección). */
export function fitRect(v: View, r: { x: number; y: number; width: number; height: number }, cw: number, ch: number, margin = 48, maxZoom = Infinity): void {
  const z = Math.min((cw - margin * 2) / r.width, (ch - margin * 2) / r.height);
  v.zoom = Math.max(0.02, Math.min(maxZoom, z));
  v.panX = cw / 2 - (r.x + r.width / 2) * v.zoom;
  v.panY = ch / 2 - (r.y + r.height / 2) * v.zoom;
}
