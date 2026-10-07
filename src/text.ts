// Medición y dibujo de texto: un único medidor para que el bbox del modelo y lo que
// se pinta en pantalla coincidan exactamente.
import type { TextObj } from './model';

//** Fuentes del selector: todas del sistema, sin descargas. */
export const FONTS: { label: string; css: string }[] = [
  { label: 'System UI', css: 'system-ui, sans-serif' },
  { label: 'Arial / Helvetica', css: 'Arial, Helvetica, sans-serif' },
  { label: 'Verdana', css: 'Verdana, Geneva, sans-serif' },
  { label: 'Tahoma', css: 'Tahoma, Geneva, sans-serif' },
  { label: 'Trebuchet MS', css: "'Trebuchet MS', Tahoma, sans-serif" },
  { label: 'Georgia', css: 'Georgia, serif' },
  { label: 'Times New Roman', css: "'Times New Roman', Times, serif" },
  { label: 'Palatino', css: 'Palatino, "Palatino Linotype", serif' },
  { label: 'Garamond', css: 'Garamond, serif' },
  { label: 'Courier New', css: "'Courier New', monospace" },
  { label: 'Consolas / Monaco', css: 'Consolas, Monaco, monospace' },
  { label: 'Impact', css: 'Impact, Haettenschweiler, sans-serif' },
  { label: 'Comic Sans MS', css: "'Comic Sans MS', cursive" },
  { label: 'Brush Script MT', css: "'Brush Script MT', cursive" },
];

export const DEFAULT_FONT = FONTS[0].css;

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
