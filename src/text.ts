// Medición y dibujo de texto: un único medidor para que el bbox del modelo y lo que
// se pinta en pantalla coincidan exactamente.
import type { TextObj } from './model';

export interface TextMetrics {
  w: number;
  h: number;
  ascent: number;
  lineHeight: number;
}

export function measureText(ctx: CanvasRenderingContext2D, text: string, font: string, size: number): TextMetrics {
  ctx.font = `${size}px ${font}`;
  const lines = text.split('\n');
  const m = ctx.measureText(lines[0] || ' ');
  const w = Math.max(1, ...lines.map((l) => ctx.measureText(l || ' ').width));
  const ascent = m.actualBoundingBoxAscent || size * 0.8;
  return { w, h: lines.length * size * 1.2, ascent, lineHeight: size * 1.2 };
}

export function drawTextObj(ctx: CanvasRenderingContext2D, o: TextObj, zoom: number, panX: number, panY: number): void {
  ctx.font = `${o.size * zoom}px ${o.font}`;
  ctx.fillStyle = o.fill;
  ctx.textBaseline = 'alphabetic';
  const m = measureText(ctx, o.text, o.font, o.size * zoom);
  o.text.split('\n').forEach((line, i) => {
    ctx.fillText(line, o.x * zoom + panX, o.y * zoom + panY + m.ascent + i * m.lineHeight);
  });
}
