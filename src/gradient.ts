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
  grad.addColorStop(0, g.from);
  grad.addColorStop(1, g.to);
  return grad;
}

/**
 * Pinta el relleno con degradado (lineal o radial). El path ya está construido
 * en espacio de dispositivo, así que para el radial basta con escalar el
 * sistema de coordenadas y crear un círculo unitario: sale elipse ajustada al bbox.
 */
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
  grad.addColorStop(0, g.from);
  grad.addColorStop(1, g.to);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}
