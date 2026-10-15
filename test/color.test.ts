import { describe, expect, it } from 'vitest';
import { hexToRgba, hsvToRgb, rgbToHsv, rgbaToHex } from '../src/color';

describe('color: conversiones del mezclador', () => {
  it('hex → rgba con y sin alfa', () => {
    expect(hexToRgba('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(hexToRgba('#ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 128 / 255 });
    expect(hexToRgba('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('rgba → hex omite el alfa solo si es opaco', () => {
    expect(rgbaToHex({ r: 255, g: 0, b: 0, a: 1 })).toBe('#ff0000');
    expect(rgbaToHex({ r: 255, g: 0, b: 0, a: 0.5 })).toBe('#ff000080');
  });

  it('hsv ↔ rgb: primarios y vuelta con error < 1', () => {
    expect(hsvToRgb(0, 1, 1)).toEqual({ r: 255, g: 0, b: 0 });
    expect(hsvToRgb(120, 1, 1)).toEqual({ r: 0, g: 255, b: 0 });
    expect(hsvToRgb(240, 1, 1)).toEqual({ r: 0, g: 0, b: 255 });
    for (const [r, g, b] of [[210, 30, 140], [0, 0, 0], [255, 255, 255], [13, 200, 77]] as const) {
      const h = rgbToHsv(r, g, b);
      const back = hsvToRgb(h.h, h.s, h.v);
      expect(Math.abs(back.r - r)).toBeLessThan(1);
      expect(Math.abs(back.g - g)).toBeLessThan(1);
      expect(Math.abs(back.b - b)).toBeLessThan(1);
    }
  });
});
