// Conversión de color para el mezclador (estilo Fireworks: campo HSV + tono + alfa).

export type Rgba = { r: number; g: number; b: number; a: number };

export function hexToRgba(hex: string): Rgba {
  const h = hex.replace('#', '');
  const f = (s: string) => parseInt(s, 16);
  if (h.length === 8) return { r: f(h.slice(0, 2)), g: f(h.slice(2, 4)), b: f(h.slice(4, 6)), a: f(h.slice(6, 8)) / 255 };
  const s = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return { r: f(s.slice(0, 2)), g: f(s.slice(2, 4)), b: f(s.slice(4, 6)), a: 1 };
}

export function rgbaToHex(c: Rgba): string {
  const h = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  const s = `#${h(c.r)}${h(c.g)}${h(c.b)}`;
  return c.a < 1 ? s + h(c.a * 255) : s;
}

/** h en grados 0..360, s y v en 0..1. */
export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255 };
}

/**
 * Paleta de `count` colores por median-cut sobre píxeles RGBA; ignora los transparentes (a<128).
 * ponytail: median-cut clásico, suficiente para muestras de unos pocos miles de píxeles.
 */
export function extractPalette(px: Uint8ClampedArray, count = 8): string[] {
  type Box = number[][];
  const boxes: Box[] = [[]];
  for (let i = 0; i + 3 < px.length; i += 4) if (px[i + 3] >= 128) boxes[0].push([px[i], px[i + 1], px[i + 2]]);
  if (!boxes[0].length) return [];
  const spread = (b: Box, ch: number) => b.reduce((m, p) => Math.max(m, p[ch]), 0) - b.reduce((m, p) => Math.min(m, p[ch]), 255);
  while (boxes.length < count) {
    let bi = -1, ch = 0, best = 0;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      for (let c = 0; c < 3; c++) {
        const r = spread(boxes[i], c);
        if (r > best) { best = r; bi = i; ch = c; }
      }
    }
    if (bi < 0) break; // todo monocromo: no hay más que partir
    const b = boxes[bi].sort((p, q) => p[ch] - q[ch]);
    const mid = b.length >> 1;
    boxes.splice(bi, 1, b.slice(0, mid), b.slice(mid));
  }
  const out: string[] = [];
  for (const b of boxes) {
    if (!b.length) continue;
    const s = [0, 0, 0];
    for (const p of b) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; }
    const hex = rgbaToHex({ r: s[0] / b.length, g: s[1] / b.length, b: s[2] / b.length, a: 1 });
    if (!out.includes(hex)) out.push(hex);
  }
  return out;
}

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const R = r / 255, G = g / 255, B = b / 255;
  const mx = Math.max(R, G, B), d = mx - Math.min(R, G, B);
  const h = d === 0 ? 0 : 60 * (mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4);
  return { h: (h + 360) % 360, s: mx === 0 ? 0 : d / mx, v: mx };
}
