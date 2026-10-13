import { describe, expect, it } from 'vitest';
import { snapBox, snapPoint } from '../src/guides';

const PAGE = { width: 800, height: 600 };

describe('snapBox', () => {
  it('imanta el borde al borde de otro objeto dentro de tolerancia', () => {
    const s = snapBox({ x: 157, y: 50, w: 40, h: 30 }, [{ x: 200, y: 10, w: 50, h: 50 }], PAGE, 6);
    expect(s.dx).toBe(3); // borde derecho 197 → 200
    expect(s.guides.some((g) => g.axis === 'v' && g.pos === 200)).toBe(true);
  });
  it('encuentra el imán más cercano y genera guía de objeto', () => {
    const s = snapBox({ x: 97, y: 0, w: 10, h: 10 }, [{ x: 100, y: 100, w: 20, h: 20 }], PAGE, 6);
    expect(s.dx).toBe(-2); // el ancla más cercana es el centro 102 → 100 (borde del objeto)
    expect(s.guides.some((g) => g.axis === 'v' && g.pos === 100 && g.kind === 'obj')).toBe(true);
  });
  it('ignora el imán fuera de tolerancia', () => {
    const s = snapBox({ x: 90, y: 0, w: 10, h: 10 }, [{ x: 100, y: 100, w: 20, h: 20 }], PAGE, 6);
    expect(s.dx).toBe(0);
  });
  it('hueco igual: encaja centrado entre dos objetos', () => {
    const s = snapBox({ x: 148, y: 0, w: 10, h: 10 }, [{ x: 100, y: 100, w: 20, h: 20 }, { x: 200, y: 100, w: 20, h: 20 }], PAGE, 6);
    // centro objetivo (120+210)/2? anclas: 148,153,158; imán hueco entre 120 y 200 → v=160: centro 153→160 d=7 fuera; 158→? usa (120+200)/2=160: ancla 158 d=2 ✓
    expect(s.dx).toBe(2);
  });
});

describe('snapPoint', () => {
  it('imanta la esquina al borde de un objeto', () => {
    const s = snapPoint(103, 500, [{ x: 100, y: 100, w: 50, h: 50 }], PAGE, 6);
    expect(s.x).toBe(100);
    expect(s.y).toBe(500);
    expect(s.guides.some((g) => g.axis === 'v' && g.pos === 100 && g.kind === 'obj')).toBe(true);
  });
  it('imanta al centro de página y no genera guía visible', () => {
    const s = snapPoint(402, 10, [], PAGE, 6);
    expect(s.x).toBe(400);
    expect(s.guides).toEqual([]);
  });
  it('respeta las guías manuales de la página', () => {
    const s = snapPoint(253, 10, [], { ...PAGE, guides: [{ axis: 'v' as const, pos: 250 }] }, 6);
    expect(s.x).toBe(250);
    expect(s.guides).toEqual([]); // las de página ya se dibujan de serie
  });
  it('fuera de tolerancia no imanta', () => {
    const s = snapPoint(110, 10, [{ x: 100, y: 100, w: 50, h: 50 }], PAGE, 6);
    expect(s.x).toBe(110);
  });
});
