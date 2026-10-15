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

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const R = r / 255, G = g / 255, B = b / 255;
  const mx = Math.max(R, G, B), d = mx - Math.min(R, G, B);
  const h = d === 0 ? 0 : 60 * (mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4);
  return { h: (h + 360) % 360, s: mx === 0 ? 0 : d / mx, v: mx };
}
