import { describe, expect, it } from 'vitest';
import { newDoc, activePage, type RectObj } from '../src/model';
import { applyResize, hitTest, findObj, hitHandle, handles } from '../src/hit';
import { History } from '../src/history';
import { screenToWorld, worldToScreen, fitAll } from '../src/view';

const rect = (x: number, y: number, w: number, h: number): RectObj => ({
  id: 'r1',
  type: 'rect',
  name: 'r',
  x,
  y,
  w,
  h,
  fill: '#000',
  stroke: null,
  strokeWidth: 0,
});

describe('hit test', () => {
  it('selecciona el objeto superior de la capa superior', () => {
    const doc = newDoc();
    const page = activePage(doc);
    const a = rect(0, 0, 100, 100);
    const b = rect(50, 50, 100, 100);
    page.layers[0].objects.push(a, b);
    expect(hitTest(page, 60, 60)?.id).toBe(b.id);
    expect(hitTest(page, 10, 10)?.id).toBe(a.id);
    expect(hitTest(page, 500, 500)).toBeNull();
  });

  it('ignora capas ocultas y bloqueadas', () => {
    const doc = newDoc();
    const page = activePage(doc);
    const a = rect(0, 0, 100, 100);
    page.layers[0].objects.push(a);
    page.layers[0].visible = false;
    expect(hitTest(page, 10, 10)).toBeNull();
    page.layers[0].visible = true;
    page.layers[0].locked = true;
    expect(hitTest(page, 10, 10)).toBeNull();
  });
});

describe('resize', () => {
  it('mantiene la esquina opuesta quieta', () => {
    const o = rect(10, 10, 100, 50);
    applyResize(o, { x: 10, y: 10, w: 100, h: 50 }, 'se', 20, -10);
    expect(o).toMatchObject({ x: 10, y: 10, w: 120, h: 40 });
  });

  it('el asa oeste mueve x y encoge w', () => {
    const o = rect(10, 10, 100, 50);
    applyResize(o, { x: 10, y: 10, w: 100, h: 50 }, 'w', 30, 0);
    expect(o).toMatchObject({ x: 40, y: 10, w: 70, h: 50 });
  });

  it('no permite tamaño < 1', () => {
    const o = rect(10, 10, 100, 50);
    applyResize(o, { x: 10, y: 10, w: 100, h: 50 }, 'e', -200, 0);
    expect(o.w).toBe(1);
  });
});

describe('handles', () => {
  it('8 asas, la esquina se corresponde con el objeto', () => {
    const o = rect(10, 20, 100, 50);
    const v = { zoom: 2, panX: 5, panY: 7 };
    const hs = handles(o, v);
    expect(hs.length).toBe(8);
    const nw = hs.find((h) => h.role === 'nw')!;
    expect(worldToScreen(v, o.x, o.y)).toEqual({ x: nw.x, y: nw.y });
    expect(hitHandle(nw.x, nw.y, hs)?.role).toBe('nw');
    expect(hitHandle(nw.x + 50, nw.y, hs)).toBeNull();
  });
});

describe('view', () => {
  it('screenToWorld es inversa de worldToScreen', () => {
    const v = { zoom: 1.7, panX: -30, panY: 12 };
    const s = worldToScreen(v, 123, 456);
    const w = screenToWorld(v, s.x, s.y);
    expect(w.x).toBeCloseTo(123);
    expect(w.y).toBeCloseTo(456);
  });

  it('fitAll deja la página dentro del viewport', () => {
    const v = { zoom: 1, panX: 0, panY: 0 };
    fitAll(v, { width: 1280, height: 800 }, 800, 600);
    expect(v.zoom).toBeGreaterThan(0);
    expect(v.panX).toBeGreaterThanOrEqual(0);
    expect(v.panX + 1280 * v.zoom).toBeLessThanOrEqual(800);
  });
});

describe('history', () => {
  it('undo/redo restauran el estado', () => {
    const o = rect(0, 0, 10, 10);
    const h = new History();
    h.run({ label: 'mover', do: () => (o.x = 50), undo: () => (o.x = 0) });
    expect(o.x).toBe(50);
    expect(h.undo()).toBe(true);
    expect(o.x).toBe(0);
    expect(h.redo()).toBe(true);
    expect(o.x).toBe(50);
    expect(h.undo()).toBe(true);
    expect(h.undo()).toBe(false);
  });

  it('un nuevo comando invalida el redo', () => {
    const o = rect(0, 0, 10, 10);
    const h = new History();
    h.run({ label: 'a', do: () => (o.x = 1), undo: () => (o.x = 0) });
    h.undo();
    h.run({ label: 'b', do: () => (o.x = 2), undo: () => (o.x = 1) });
    expect(h.redo()).toBe(false);
  });
});

describe('model', () => {
  it('findObj recorre capas', () => {
    const doc = newDoc();
    const page = activePage(doc);
    page.layers[0].objects.push(rect(0, 0, 1, 1));
    expect(findObj(page, 'r1')?.id).toBe('r1');
    expect(findObj(page, 'nope')).toBeNull();
    expect(findObj(page, null)).toBeNull();
  });
});
