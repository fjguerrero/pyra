// Relleno con degradado lineal (Fireworks: Fill → Linear).
import type { Gradient, ShapeObj } from './model';

/**
 * Degradado lineal sobre el bbox del objeto, recortado al bbox como Fireworks
 * (los extremos del degradado caen en los bordes del bounding box).
 */
export function gradientFill(ctx: CanvasRenderingContext2D, o: ShapeObj, g: Gradient, zoom: number, panX: number, panY: number): CanvasGradient {
  const rad = (g.angle * Math.PI) / 180;
  const cx = o.x * zoom + panX + (o.w * zoom) / 2;
  const cy = o.y * zoom + panY + (o.h * zoom) / 2;
  // media diagonal proyectada sobre la dirección del ángulo
  const half = (Math.abs(Math.cos(rad)) * o.w + Math.abs(Math.sin(rad)) * o.h) / 2 * zoom;
  const dx = Math.cos(rad) * half;
  const dy = Math.sin(rad) * half;
  const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  applyStops(grad, g);
  return grad;
}

/**
 * Pinta el relleno con degradado (lineal o radial). El path ya está construido
 * en espacio de dispositivo, así que para el radial basta con escalar el
 * sistema de coordenadas y crear un círculo unitario: sale elipse ajustada al bbox.
 */
/** Paradas efectivas: las intermedias mandan si hay al menos dos; si no, from/to. */
export function stopsOf(g: Gradient): { p: number; c: string }[] {
  if (g.stops && g.stops.length >= 2) return [...g.stops].sort((a, b) => a.p - b.p);
  return [{ p: 0, c: g.from }, { p: 1, c: g.to }];
}

function applyStops(grad: CanvasGradient, g: Gradient): void {
  for (const s of stopsOf(g)) grad.addColorStop(Math.max(0, Math.min(1, s.p)), s.c);
}

const hex2 = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (v: number): string => Math.round(v).toString(16).padStart(2, '0');

/** Inserta una parada en el hueco más ancho, con el color medio de sus vecinos (editor de degradado). */
export function addStopAt(g: Gradient): { p: number; c: string }[] {
  const st = stopsOf(g);
  let bi = 0;
  let bw = -1;
  for (let i = 0; i < st.length - 1; i++) {
    const w = st[i + 1].p - st[i].p;
    if (w > bw) { bw = w; bi = i; }
  }
  const a = st[bi];
  const b = st[bi + 1];
  const p = (a.p + b.p) / 2;
  const [r1, g1, b1] = hex2(a.c);
  const [r2, g2, b2] = hex2(b.c);
  const c = `#${toHex((r1 + r2) / 2)}${toHex((g1 + g2) / 2)}${toHex((b1 + b2) / 2)}`;
  return [...st, { p, c }].sort((x, y) => x.p - y.p);
}

export function fillGradient(ctx: CanvasRenderingContext2D, o: ShapeObj, g: Gradient, zoom: number, panX: number, panY: number): void {
  if (!g.radial) {
    ctx.fillStyle = gradientFill(ctx, o, g, zoom, panX, panY);
    ctx.fill();
    return;
  }
  const cx = o.x * zoom + panX + (o.w * zoom) / 2;
  const cy = o.y * zoom + panY + (o.h * zoom) / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(Math.max(0.001, o.w * zoom), Math.max(0.001, o.h * zoom));
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.5);
  applyStops(grad, g);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}
