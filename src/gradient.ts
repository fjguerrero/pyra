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
