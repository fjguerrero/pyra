// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { newDoc, activePage, type ShapeObj } from '../src/model';
import { duplicateCmd, groupCmd, pasteCmd, zOrderCmd } from '../src/commands';
import { History } from '../src/history';

function docWith(objs: ShapeObj[]) {
  const doc = newDoc('t');
  const page = activePage(doc);
  page.layers[0].objects.push(...objs);
  return { doc, page };
}

const rect = (x: number, y: number): ShapeObj => ({
  id: `r${x}-${y}`, shape: 'rect', name: 'r', x, y, w: 10, h: 10, fill: '#f00', stroke: null, strokeWidth: 0,
});

describe('duplicateCmd', () => {
  it('copia con id nuevo desplazada +10, undoable', () => {
    const a = rect(0, 0);
    const { page } = docWith([a]);
    const h = new History();
    const { cmd } = duplicateCmd(page, [a])!;
    h.run(cmd);
    expect(page.layers[0].objects.length).toBe(2);
    const clone = page.layers[0].objects[1];
    expect(clone.id).not.toBe(a.id);
    expect([clone.x, clone.y]).toEqual([10, 10]);
    h.undo();
    expect(page.layers[0].objects).toEqual([a]);
  });
});

describe('pasteCmd', () => {
  it('pega el portapapeles en la misma posición con ids nuevos', () => {
    const a = rect(50, 50);
    const { page } = docWith([]);
    const { cmd } = pasteCmd(page, [structuredClone(a)])!;
    cmd.do();
    expect(page.layers[0].objects.length).toBe(1);
    expect(page.layers[0].objects[0].x).toBe(50);
    expect(page.layers[0].objects[0].id).not.toBe(a.id);
    cmd.undo();
    expect(page.layers[0].objects.length).toBe(0);
  });
});

describe('zOrderCmd', () => {
  it('traer al frente y enviar al fondo, undoable', () => {
    const a = rect(0, 0), b = rect(20, 0), c = rect(40, 0);
    const { page } = docWith([a, b, c]);
    const h = new History();
    h.run(zOrderCmd(page, [a], 1)!);
    expect(page.layers[0].objects.map((o) => o.id)).toEqual(['r20-0', 'r40-0', 'r0-0']);
    h.undo();
    expect(page.layers[0].objects.map((o) => o.id)).toEqual(['r0-0', 'r20-0', 'r40-0']);
    h.run(zOrderCmd(page, [c], -1)!);
    expect(page.layers[0].objects.map((o) => o.id)).toEqual(['r40-0', 'r0-0', 'r20-0']);
    h.undo();
    expect(page.layers[0].objects.map((o) => o.id)).toEqual(['r0-0', 'r20-0', 'r40-0']);
  });

  it('sin selección no devuelve comando', () => {
    const { page } = docWith([rect(0, 0)]);
    expect(zOrderCmd(page, [], 1)).toBeNull();
  });
});

describe('rotación', () => {
  it('hitObj deshace la rotación para el hit-test', async () => {
    const { hitObj } = await import('../src/hit');
    const o = { id: 'x', shape: 'rect' as const, name: 'r', x: 0, y: 0, w: 100, h: 20, fill: '#000', stroke: null, strokeWidth: 0, rot: 90 };
    // girado 90°: ocupa verticalmente x∈[40,60], y∈[-40,60]
    expect(hitObj(o, 50, 50)).toBe(true);
    expect(hitObj(o, 90, 10)).toBe(false);
  });
});

describe('agrupar', () => {
  it('groupCmd asigna grupo común y undo lo quita', () => {
    const h = new History();
    const a: ShapeObj = { id: 'a', shape: 'rect', name: 'a', x: 0, y: 0, w: 10, h: 10, fill: '#000', stroke: null, strokeWidth: 0 };
    const b: ShapeObj = { ...a, id: 'b', name: 'b' };
    h.run(groupCmd([a, b], 'g1'));
    expect(a.group).toBe('g1');
    expect(b.group).toBe('g1');
    h.undo();
    expect(a.group).toBeUndefined();
    expect(b.group).toBeUndefined();
  });
});
