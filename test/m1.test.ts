// Tests de M1 escritos desde la especificación de comportamiento, no desde la implementación.
import { describe, expect, it } from 'vitest';
import { activePage, newDoc, uid, type ShapeObj } from '../src/model';
import { addLayer, moveLayer, moveObjToLayer, removeLayer } from '../src/layers';
import { snapBox } from '../src/guides';
import { bbox, computeAlign } from '../src/align';

function rect(x: number, y: number, w: number, h: number): ShapeObj {
  return { id: uid(), shape: 'rect', name: 'r', x, y, w, h, fill: '#000000', stroke: null, strokeWidth: 0 };
}

function pageWith(nLayers: number) {
  const doc = newDoc('test');
  const page = activePage(doc);
  page.layers = Array.from({ length: nLayers }, (_, i) => ({
    id: uid(), name: `L${i}`, visible: true, locked: false, opacity: 1, objects: [],
  }));
  return page;
}

// ================= CAPAS =================
describe('capas: el panel puede crear, quitar, reordenar y mover objetos entre capas', () => {
  it('addLayer inserta justo por encima de la capa indicada', () => {
    const page = pageWith(2);
    const l = addLayer(page, page.layers[0].id);
    expect(page.layers[1].id).toBe(l.id);
    expect(page.layers.length).toBe(3);
  });

  it('addLayer sin referencia inserta al tope', () => {
    const page = pageWith(2);
    const l = addLayer(page, null);
    expect(page.layers[page.layers.length - 1].id).toBe(l.id);
  });

  it('los nombres de capa nuevos no se repiten', () => {
    const page = pageWith(1);
    page.layers[0].name = 'Capa';
    const a = addLayer(page, null);
    const b = addLayer(page, null);
    const names = page.layers.map((l) => l.name);
    expect(new Set(names).size).toBe(names.length);
    expect(a.name).not.toBe('Capa');
    expect(b.name).not.toBe(a.name);
  });

  it('una página nunca se queda sin capas', () => {
    const page = pageWith(1);
    expect(removeLayer(page, page.layers[0].id)).toBe(false);
    expect(page.layers.length).toBe(1);

    const page2 = pageWith(2);
    expect(removeLayer(page2, page2.layers[1].id)).toBe(true);
    expect(page2.layers.length).toBe(1);
  });

  it('subir y bajar una capa respeta los límites', () => {
    const page = pageWith(3);
    const ids = page.layers.map((l) => l.id);
    expect(moveLayer(page, ids[0], 1)).toBe(true);
    expect(page.layers.map((l) => l.id)).toEqual([ids[1], ids[0], ids[2]]);
    expect(moveLayer(page, ids[2], 1)).toBe(false); // tope: no hay nada por encima
    expect(moveLayer(page, ids[1], -1)).toBe(false); // base: no hay nada por debajo
    expect(page.layers.map((l) => l.id)).toEqual([ids[1], ids[0], ids[2]]); // intacto
  });

  it('mover un objeto a otra capa lo saca de la original', () => {
    const page = pageWith(2);
    const o = rect(0, 0, 10, 10);
    page.layers[0].objects.push(o);
    expect(moveObjToLayer(page, o.id, page.layers[1].id)).toBe(true);
    expect(page.layers[0].objects.length).toBe(0);
    expect(page.layers[1].objects.map((x) => x.id)).toEqual([o.id]);
  });

  it('mover un objeto a su misma capa no duplica nada', () => {
    const page = pageWith(1);
    const o = rect(0, 0, 10, 10);
    page.layers[0].objects.push(o);
    expect(moveObjToLayer(page, o.id, page.layers[0].id)).toBe(false);
    expect(page.layers[0].objects.length).toBe(1);
  });
});

// ================= SMART GUIDES =================
describe('smart guides: arrastrar engancha a bordes, centros y bordes de página', () => {
  const PAGE = { width: 800, height: 600 };
  const TOL = 6;

  it('engancha el borde izquierdo al borde de página', () => {
    const s = snapBox({ x: 4, y: 200, w: 100, h: 50 }, [], PAGE, TOL);
    expect(s.dx).toBe(-4);
    expect(s.guides).toContainEqual({ axis: 'v', pos: 0 });
  });

  it('engancha el centro al centro de página', () => {
    // caja con centro en 397 → centro de página 400
    const s = snapBox({ x: 347, y: 100, w: 100, h: 50 }, [], PAGE, TOL);
    expect(s.dx).toBe(3);
    expect(s.guides.some((g) => g.axis === 'v' && g.pos === 400)).toBe(true);
  });

  it('engancha a otro objeto: bordes y centros ajenos son objetivo', () => {
    const other = { x: 200, y: 100, w: 100, h: 100 };
    // caja cuyo borde derecho queda a 3 de x=200 del otro
    const s = snapBox({ x: 97, y: 400, w: 100, h: 40 }, [other], PAGE, TOL);
    expect(s.dx).toBe(3);
    expect(s.guides.some((g) => g.axis === 'v' && g.pos === 200)).toBe(true);
  });

  it('fuera de tolerancia no engancha', () => {
    const s = snapBox({ x: 100, y: 100, w: 50, h: 50 }, [], PAGE, TOL);
    expect(s.dx).toBe(0);
    expect(s.dy).toBe(0);
    expect(s.guides).toEqual([]);
  });

  it('eje vertical y horizontal son independientes', () => {
    // x enganchado a 0, y libre
    const s = snapBox({ x: 2, y: 123, w: 60, h: 60 }, [], PAGE, TOL);
    expect(s.dx).toBe(-2);
    expect(s.dy).toBe(0);
    expect(s.guides.length).toBe(1);
  });

  it('elige el imán más cercano cuando hay varios', () => {
    const other = { x: 100, y: 100, w: 100, h: 100 }; // objetivos v: 100, 150, 200
    // único candidato dentro de tolerancia: borde izquierdo 98 → 100 (d=2).
    // centro 158 (d=-8) y borde derecho 218 (d=-18) quedan fuera de TOL=6.
    const s = snapBox({ x: 98, y: 400, w: 120, h: 40 }, [other], PAGE, TOL);
    expect(s.dx).toBe(2);
    expect(s.guides.filter((g) => g.axis === 'v')).toEqual([{ axis: 'v', pos: 100 }]);
  });

  it('el desplazamiento devuelto aplica el imán exactamente', () => {
    const s = snapBox({ x: 5, y: 4, w: 40, h: 40 }, [], PAGE, TOL);
    expect(s.dx).toBe(-5);
    expect(s.dy).toBe(-4);
    expect(5 + s.dx).toBe(0);
    expect(4 + s.dy).toBe(0);
  });

  it('un ancla justo fuera de tolerancia no engancha', () => {
    // distancia 7 > TOL=6: no debe enganchar al borde de página
    const s = snapBox({ x: 7, y: 200, w: 40, h: 40 }, [], PAGE, TOL);
    expect(s.dx).toBe(0);
    expect(s.guides).toEqual([]);
  });
});

// ================= ALINEAR / DISTRIBUIR =================
describe('alinear: con uno respeta la página, con varios respeta el grupo', () => {
  it('1 objeto: alinear a la izquierda de la página', () => {
    const o = rect(300, 100, 50, 50);
    const moves = computeAlign([o], 'left', { width: 800, height: 600 });
    expect(moves[0].to).toEqual({ x: 0, y: 100 });
  });

  it('1 objeto: centrar horizontal y verticalmente en la página', () => {
    const o = rect(10, 10, 100, 60);
    const h = computeAlign([o], 'hcenter', { width: 800, height: 600 })[0].to;
    expect(h.x).toBe(350);
    expect(h.y).toBe(10);
    const v = computeAlign([o], 'vcenter', { width: 800, height: 600 })[0].to;
    expect(v.y).toBe(270);
    expect(v.x).toBe(10);
  });

  it('varios: alinearse no mueve el grupo (el bbox conserva su borde)', () => {
    const a = rect(100, 50, 40, 40);
    const b = rect(160, 90, 40, 40);
    const before = bbox([a, b]);
    const moves = computeAlign([a, b], 'left', { width: 800, height: 600 });
    for (const m of moves) Object.assign(m.obj, m.to);
    const after = bbox([a, b]);
    expect(after.x).toBe(before.x); // el grupo no se desplaza
    expect(after.y).toBe(before.y);
    expect(a.x).toBe(b.x); // todos al mismo borde
  });

  it('varios: alinear a la derecha conserva el borde derecho del grupo', () => {
    const a = rect(100, 50, 40, 40);
    const b = rect(160, 90, 60, 40);
    const right = 220;
    for (const m of computeAlign([a, b], 'right', { width: 800, height: 600 })) Object.assign(m.obj, m.to);
    expect(a.x + a.w).toBe(right);
    expect(b.x + b.w).toBe(right);
  });

  it('varios: centrar verticalmente centra cada objeto en el bbox del grupo', () => {
    const a = rect(0, 0, 100, 10);
    const b = rect(0, 90, 20, 10);
    for (const m of computeAlign([a, b], 'vcenter', { width: 800, height: 600 })) Object.assign(m.obj, m.to);
    expect(a.y + a.h / 2).toBe(50);
    expect(b.y + b.h / 2).toBe(50);
  });

  it('distribuir horizontal: huecos iguales entre el primer y último borde del grupo', () => {
    const a = rect(0, 0, 10, 10);
    const b = rect(50, 20, 10, 10);
    const c = rect(100, 5, 10, 10);
    for (const m of computeAlign([a, b, c], 'hdist', { width: 800, height: 600 })) Object.assign(m.obj, m.to);
    const sorted = [a, b, c].sort((p, q) => p.x - q.x);
    const gaps = [sorted[1].x - (sorted[0].x + sorted[0].w), sorted[2].x - (sorted[1].x + sorted[1].w)];
    expect(gaps[0]).toBeCloseTo(gaps[1]);
    expect(sorted[0].x).toBe(0); // el grupo no se mueve
    expect(sorted[2].x + sorted[2].w).toBe(110);
  });

  it('distribuir con menos de 3 objetos no hace nada', () => {
    const a = rect(0, 0, 10, 10);
    const b = rect(50, 0, 10, 10);
    expect(computeAlign([a, b], 'hdist', { width: 800, height: 600 })).toEqual([]);
    expect(computeAlign([], 'left', { width: 800, height: 600 })).toEqual([]);
  });

  it('cada movimiento informa su posición anterior (deshacible)', () => {
    const a = rect(30, 30, 10, 10);
    const [m] = computeAlign([a], 'left', { width: 800, height: 600 });
    expect(m.from).toEqual({ x: 30, y: 30 });
    expect(m.obj).toBe(a);
  });
});
