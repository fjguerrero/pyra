import { describe, expect, it } from 'vitest';
import { rdpSimplify, smoothClosedPolygon, smoothPolyline } from '../src/freehand';

describe('freehand: suavizado y simplificación', () => {
  it('rdpSimplify reduce un trazo con vibración a sus vértices reales', () => {
    // una "Z": recta, diagonal, recta, con ruido de ±1px
    const pts: { x: number; y: number }[] = [];
    for (let x = 0; x <= 100; x += 2) pts.push({ x, y: 0 });
    for (let x = 100; x >= 0; x -= 2) pts.push({ x, y: 100 + (x % 4 ? 1 : -1) });
    for (let x = 0; x <= 100; x += 2) pts.push({ x, y: 100 });
    const s = rdpSimplify(pts, 4);
    expect(s.length).toBeLessThanOrEqual(5);
    expect(s[0]).toEqual({ x: 0, y: 0 });
    expect(s[s.length - 1]).toEqual({ x: 100, y: 100 });
    // conserva la esquina superior derecha
    expect(s.some((p) => p.x === 100 && p.y === 100)).toBe(true);
  });

  it('rdpSimplify de una línea recta queda en 2 puntos', () => {
    const pts = Array.from({ length: 20 }, (_, i) => ({ x: i * 5, y: i * 5 }));
    expect(rdpSimplify(pts, 3)).toEqual([{ x: 0, y: 0 }, { x: 95, y: 95 }]);
  });

  it('smoothPolyline mantiene extremos y añade puntos intermedios', () => {
    const pts = [{ x: 0, y: 0 }, { x: 50, y: 100 }, { x: 100, y: 0 }];
    const s = smoothPolyline(pts, 8);
    expect(s[0]).toEqual(pts[0]);
    expect(s[s.length - 1]).toEqual(pts[2]);
    expect(s.length).toBeGreaterThan(pts.length);
    // la curva pasa cerca del punto de control pero no lo atraviesa brusco: monótona en x
    for (let i = 1; i < s.length; i++) expect(s[i].x).toBeGreaterThanOrEqual(s[i - 1].x - 1e-9);
  });

  it('smoothClosedPolygon genera un lazo cerrado suave', () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
    const s = smoothClosedPolygon(pts, 6);
    expect(s.length).toBe(24);
    // cerrado: el último punto está junto al primero
    expect(Math.hypot(s[s.length - 1].x - s[0].x, s[s.length - 1].y - s[0].y)).toBeLessThan(20);
  });

  it('casos degenerados: menos de 3 puntos se copian', () => {
    expect(smoothPolyline([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toEqual([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
    expect(smoothClosedPolygon([{ x: 0, y: 0 }])).toEqual([{ x: 0, y: 0 }]);
  });
});
