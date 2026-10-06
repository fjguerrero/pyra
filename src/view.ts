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
  const z = Math.min((cw - margin * 2) / page.width, (ch - margin * 2) / page.height);
  v.zoom = Math.max(0.02, z);
  v.panX = (cw - page.width * v.zoom) / 2;
  v.panY = (ch - page.height * v.zoom) / 2;
}
