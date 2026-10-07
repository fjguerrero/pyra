// v1.2: unión booleana, polígono (pen), goma bitmap, distribución con grupos, igual distancia.
import { describe, expect, it } from 'vitest';
import { convexHull, polyPoints, type Obj, type Page, type ShapeObj } from '../src/model';
import { unionCmd } from '../src/commands';
import { computeAlign } from '../src/align';
import { snapBox } from '../src/guides';
import { hitTest } from '../src/hit';

const shape = (over: Partial<ShapeObj>): ShapeObj => ({
  id: Math.random().toString(36).slice(2),
  shape: 'rect',
  name: 'r',
  x: 0, y: 0, w: 10, h: 10,
  fill: '#000', stroke: null, strokeWidth: 0,
  ...over,
});

const pageOf = (objects: Obj[]): Page => ({
  id: 'p', name: 'p', width: 200, height: 200,
  layers: [{ id: 'l', name: 'l', visible: true, locked: false, opacity: 1, objects }],
});

describe('convexHull + unión', () => {
  it('hull de un cuadrado son sus 4 esquinas', () => {
    const h = convexHull([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 5, y: 5 }]);
    expect(h.length).toBe(4);
    expect(h.every((p) => p.x === 0 || p.x === 10 || p.y === 0 || p.y === 10)).toBe(true);
  });

  it('unión de dos rects solapados = un polígono undoable', () => {
    const a = shape({ x: 0, y: 0, w: 40, h: 40 });
    const b = shape({ x: 30, y: 10, w: 40, h: 40 });
    const page = pageOf([a, b]);
    const u = unionCmd(page, [a, b]);
    expect(u).not.toBeNull();
    u!.cmd.do();
    expect(page.layers[0].objects).toEqual([u!.result]);
    expect(u!.result.shape).toBe('polygon');
    expect(u!.result.poly!.length).toBeGreaterThanOrEqual(4);
    expect(polyPoints(u!.result).some((p) => p.x === 70 && p.y === 10)).toBe(true);
    u!.cmd.undo();
    expect(page.layers[0].objects).toEqual([a, b]);
  });
});

describe('polígono: hit-test', () => {
  it('dentro/fuera del triángulo', () => {
    const tri = shape({
      shape: 'polygon', x: 0, y: 0, w: 100, h: 100,
      poly: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
    });
    const page = pageOf([tri]);
    expect(hitTest(page, 10, 10, 0)?.id).toBe(tri.id);
    expect(hitTest(page, 90, 90, 0)).toBeNull();
  });
});

describe('distribución con grupos', () => {
  it('un grupo se mueve como una unidad', () => {
    const a = shape({ x: 0, y: 0, w: 10, h: 10, group: 'g' });
    const b = shape({ x: 0, y: 20, w: 10, h: 10, group: 'g' }); // grupo bbox 10x30
    const mid = shape({ x: 40, y: 0, w: 10, h: 10 });
    const last = shape({ x: 90, y: 0, w: 10, h: 10 });
    const moves = computeAlign([a, b, mid, last], 'hdist', { width: 100, height: 100 });
    const dx = (o: Obj) => moves.find((m) => m.obj === o)!.to.x - o.x;
    expect(dx(b)).toBe(dx(a)); // el grupo se mueve junto
    expect(last.x + dx(last)).toBe(90); // el último queda en su sitio
    expect(mid.x + dx(mid)).toBe(45); // huecos iguales: 0..10, 45..55, 90..100
  });
});

describe('guía de igual distancia', () => {
  it('encaja el hueco justo entre dos objetos', () => {
    const others = [{ x: 0, y: 0, w: 20, h: 20 }, { x: 100, y: 0, w: 20, h: 20 }];
    const s = snapBox({ x: 52, y: 0, w: 20, h: 20 }, others, { width: 200, height: 200 }, 6);
    expect(s.dx).toBe(-2); // centro del hueco 20..100 → caja 50..70, huecos de 30 a ambos lados
  });

  it('sin dos objetos de referencia no hay guía de hueco', () => {
    const s = snapBox({ x: 52, y: 0, w: 20, h: 20 }, [], { width: 200, height: 200 }, 6);
    expect(s.dx).toBe(0);
  });

  it('los imanes a página y guías manuales se marcan page (no se dibujan); los de objeto, obj', () => {
    const page = { width: 200, height: 200, guides: [{ axis: 'v' as const, pos: 60 }] };
    const s = snapBox({ x: 57, y: 123, w: 20, h: 20 }, [], page, 6);
    expect(s.dx).toBe(3); // engancha a la guía manual
    expect(s.guides).toEqual([{ axis: 'v', pos: 60, kind: 'page' }]);
  });
});
