// F27: insertar/borrar nodos estilo FreeHand. Geometría pura: tests en node, sin jsdom.
import { describe, expect, it } from 'vitest';
import {
  polyDeleteVertex, polyInsertOnSeg, polyNearestSeg, polySegs, segPoint, setNode,
  splitSeg, strokeDeletePoint, strokeInsertPoint, strokeNearestPoint, type ShapeObj,
} from '../src/model';

const poly = (over: Partial<ShapeObj> = {}): ShapeObj => ({
  id: 'p1', name: '', shape: 'polygon', x: 0, y: 0, w: 100, h: 100,
  poly: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
  fill: '#000', stroke: null, strokeWidth: 0, ...over,
} as ShapeObj);
const stroke = (over: Partial<ShapeObj> = {}): ShapeObj => ({
  id: 's1', name: '', shape: 'stroke', x: 0, y: 0, w: 100, h: 100,
  points: [{ x: 0, y: 0, p: 1 }, { x: 1, y: 1, p: 1 }],
  fill: null, stroke: '#000', strokeWidth: 2, ...over,
} as ShapeObj);

describe('splitSeg', () => {
  it('recta: parte en el punto exacto', () => {
    const [l, r] = splitSeg({ a: { x: 0, y: 0 }, b: { x: 10, y: 0 } }, 0.25);
    expect(l.b).toEqual({ x: 2.5, y: 0 });
    expect(r.a).toEqual(l.b);
  });
  it('curva: las dos mitudes muestrean la curva original (de Casteljau exacto)', () => {
    const s = { a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, c1: { x: 30, y: 50 }, c2: { x: 70, y: 50 } };
    const [l, r] = splitSeg(s, 0.4);
    for (const u of [0, 0.25, 0.5, 0.75, 1]) {
      expect(segPoint(l, u).x).toBeCloseTo(segPoint(s, 0.4 * u).x, 9);
      expect(segPoint(l, u).y).toBeCloseTo(segPoint(s, 0.4 * u).y, 9);
      expect(segPoint(r, u).x).toBeCloseTo(segPoint(s, 0.4 + 0.6 * u).x, 9);
      expect(segPoint(r, u).y).toBeCloseTo(segPoint(s, 0.4 + 0.6 * u).y, 9);
    }
  });
});

describe('polyInsertOnSeg', () => {
  it('en un tramo curvo: los dos tramos nuevos son EXACTAMENTE las dos mitades (la forma no cambia)', () => {
    const k = 0.5523;
    const o = poly({ polyH: [{ x: k, y: 0 }, { x: 0, y: k }, { x: -k, y: 0 }, { x: 0, y: -k }] });
    const before = polySegs(o);
    const [L, R] = splitSeg(before[0], 0.5);
    const ni = polyInsertOnSeg(o, 0, 0.5);
    expect(ni).toBe(1);
    expect(o.poly!.length).toBe(5);
    const after = polySegs(o);
    for (const key of ['a', 'b', 'c1', 'c2'] as const) {
      expect(after[0][key]!.x).toBeCloseTo(L[key]!.x, 6);
      expect(after[0][key]!.y).toBeCloseTo(L[key]!.y, 6);
      expect(after[1][key]!.x).toBeCloseTo(R[key]!.x, 6);
      expect(after[1][key]!.y).toBeCloseTo(R[key]!.y, 6);
    }
    for (let k = 1; k < 4; k++) // los otros tramos, idénticos: el saliente de los vecinos no se toca
      for (const key of ['a', 'b', 'c1', 'c2'] as const) {
        expect(after[k + 1][key]!.x).toBeCloseTo(before[k][key]!.x, 6);
        expect(after[k + 1][key]!.y).toBeCloseTo(before[k][key]!.y, 6);
      }
  });
  it('en un tramo recto: +1 vértice sin asas, bbox intacto', () => {
    const o = poly();
    const ni = polyInsertOnSeg(o, 0, 0.5);
    expect(ni).toBe(1);
    expect(o.poly!.length).toBe(5);
    expect(o.poly![1]).toEqual({ x: 0.5, y: 0 });
    expect(o.polyH).toBeUndefined();
    expect({ x: o.x, y: o.y, w: o.w, h: o.h }).toEqual({ x: 0, y: 0, w: 100, h: 100 });
  });
});

describe('polyNearestSeg', () => {
  it('cerca del punto medio del tramo 0 → i=0, t≈0.5; fuera de tol → null', () => {
    const o = poly();
    const hit = polyNearestSeg(o, { x: 50, y: -3 }, 5);
    expect(hit && hit.i).toBe(0);
    expect(hit!.t).toBeCloseTo(0.5, 2);
    expect(polyNearestSeg(o, { x: 50, y: -20 }, 5)).toBeNull();
  });
});

describe('polyDeleteVertex', () => {
  it('cuadrado → triángulo; con 3 vértices ya no borra', () => {
    const o = poly();
    expect(polyDeleteVertex(o, 2)).toBe(true);
    expect(o.poly!.length).toBe(3);
    expect(polyDeleteVertex(o, 0)).toBe(false);
    expect(o.poly!.length).toBe(3);
  });
});

describe('trazo: insertar/borrar puntos', () => {
  it('inserta en el tramo con presión interpolada y borra; con 2 puntos ya no borra', () => {
    const o = stroke({ points: [{ x: 0, y: 0, p: 0.2 }, { x: 1, y: 1, p: 1 }] });
    const hit = strokeNearestPoint(o, { x: 48, y: 52 }, 5);
    expect(hit!.i).toBe(0);
    expect(hit!.t).toBeCloseTo(0.5, 2);
    const ni = strokeInsertPoint(o, hit!.i, hit!.t);
    expect(ni).toBe(1);
    expect(o.points!.length).toBe(3);
    expect(o.points![1].x).toBeCloseTo(hit!.t, 6);
    expect(o.points![1].p).toBeCloseTo(0.2 + 0.8 * hit!.t, 6);
    expect(strokeDeletePoint(o, 1)).toBe(true);
    expect(o.points!.length).toBe(2);
    expect(strokeDeletePoint(o, 0)).toBe(false);
  });
});

describe('setNode (movido a model.ts)', () => {
  it('mover un vértice fuera del bbox lo recalcula y re-normaliza', () => {
    const o = poly();
    setNode(o, 0, { x: -10, y: -10 });
    expect({ x: o.x, y: o.y, w: o.w, h: o.h }).toEqual({ x: -10, y: -10, w: 110, h: 110 });
    expect(o.poly![0]).toEqual({ x: 0, y: 0 });
  });
});
