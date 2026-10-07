// Tests escritos desde la especificación de comportamiento (Fireworks), no desde la
// implementación. Cada test construye su propio fixture: sin estado compartido.
// Si un test falla, el bug está en el código, no en el test.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { activePage, newDoc, uid, type Doc, type Page, type ShapeObj } from '../src/model';
import { applyResize, findLayer, findObj, handles, hitHandle, hitObj, hitTest } from '../src/hit';
import { History } from '../src/history';
import { fitAll, screenToWorld, worldToScreen, type View } from '../src/view';
import { loadDoc, saveDoc } from '../src/store';

// ---- helpers de fixture (puros, sin estado) ----
function rect(x: number, y: number, w: number, h: number, name = 'r'): ShapeObj {
  return {
    id: uid(),
    shape: 'rect',
    name,
    x,
    y,
    w,
    h,
    fill: '#000000',
    stroke: null,
    strokeWidth: 0,
  };
}

/** Doc mínimo con N capas (nombre 'L0'..), todas visibles y sin bloquear. */
function docWithLayers(n: number): { doc: Doc; page: Page } {
  const doc = newDoc('test');
  const page = activePage(doc);
  page.layers = Array.from({ length: n }, (_, i) => ({
    id: uid(),
    name: `L${i}`,
    visible: true,
    locked: false,
    opacity: 1,
    objects: [],
  }));
  return { doc, page };
}

/** PRNG determinista: los tests no dependen de la entropía real. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

// ================= SELECCIÓN (hit test) =================
describe('selección: el punto devuelve el objeto visible más cercano a la superficie', () => {
  it('entre dos objetos solapados gana el último dibujado de la misma capa', () => {
    const { page } = docWithLayers(1);
    const bajo = rect(0, 0, 200, 200, 'bajo');
    const alto = rect(100, 100, 200, 200, 'alto');
    page.layers[0].objects.push(bajo, alto);

    expect(hitTest(page, 150, 150)?.id).toBe(alto.id); // zona común
    expect(hitTest(page, 10, 10)?.id).toBe(bajo.id); // solo el bajo
    expect(hitTest(page, 250, 250)?.id).toBe(alto.id); // solo el alto
  });

  it('entre capas gana la capa superior del panel (índice mayor)', () => {
    const { page } = docWithLayers(2);
    const inferior = rect(0, 0, 100, 100, 'inferior');
    const superior = rect(0, 0, 100, 100, 'superior');
    page.layers[0].objects.push(inferior);
    page.layers[1].objects.push(superior);

    expect(hitTest(page, 50, 50)?.id).toBe(superior.id);
  });

  it('fuera de todo objeto no hay selección', () => {
    const { page } = docWithLayers(1);
    page.layers[0].objects.push(rect(0, 0, 50, 50));
    expect(hitTest(page, 500, 500)).toBeNull();
    expect(hitTest(page, -1, 25)).toBeNull();
  });

  it('los bordes del rectángulo son seleccionables', () => {
    const { page } = docWithLayers(1);
    const o = rect(10, 10, 100, 60);
    page.layers[0].objects.push(o);
    expect(hitTest(page, 10, 10)?.id).toBe(o.id); // esquina
    expect(hitTest(page, 110, 40)?.id).toBe(o.id); // borde derecho
    expect(hitTest(page, 60, 70)?.id).toBe(o.id); // borde inferior
  });

  it('una capa oculta no es seleccionable, y no tapa lo que hay debajo', () => {
    const { page } = docWithLayers(2);
    const deAbajo = rect(0, 0, 100, 100, 'abajo');
    const oculta = rect(0, 0, 100, 100, 'oculta');
    page.layers[0].objects.push(deAbajo);
    page.layers[1].objects.push(oculta);
    page.layers[1].visible = false;

    expect(hitTest(page, 50, 50)?.id).toBe(deAbajo.id);
  });

  it('una capa bloqueada no es seleccionable, y no tapa lo que hay debajo', () => {
    const { page } = docWithLayers(2);
    const deAbajo = rect(0, 0, 100, 100, 'abajo');
    const bloqueada = rect(0, 0, 100, 100, 'bloqueada');
    page.layers[0].objects.push(deAbajo);
    page.layers[1].objects.push(bloqueada);
    page.layers[1].locked = true;

    expect(hitTest(page, 50, 50)?.id).toBe(deAbajo.id);
  });
});

describe('hitObj: la detección sigue la forma del objeto', () => {
  const shape = (kind: 'ellipse' | 'line', x: number, y: number, w: number, h: number): ShapeObj => ({
    ...rect(x, y, w, h, kind),
    shape: kind,
  });

  it('un rectángulo es sólido: cualquier punto de su bbox cuenta', () => {
    const o = rect(100, 100, 100, 60);
    expect(hitObj(o, 100, 100)).toBe(true);
    expect(hitObj(o, 200, 160)).toBe(true);
    expect(hitObj(o, 99, 130)).toBe(false);
  });

  it('una elipse deja fuera las esquinas de su bounding box', () => {
    // bbox 100,100 → 300,200; centro 200,150; radios 100,50
    const o = shape('ellipse', 100, 100, 200, 100);
    expect(hitObj(o, 200, 150)).toBe(true); // centro
    expect(hitObj(o, 200, 100)).toBe(true); // tangente superior
    expect(hitObj(o, 100, 100)).toBe(false); // esquina del bbox: fuera de la elipse
    expect(hitObj(o, 300, 200)).toBe(false); // otra esquina
    expect(hitObj(o, 110, 105)).toBe(false); // cerca de la esquina, sigue fuera
  });

  it('una línea solo capta su trazo, no el área que lo rodea', () => {
    // bbox 0,0 → 100,100: la va de (0,0) a (100,100)
    const o = shape('line', 0, 0, 100, 100);
    expect(hitObj(o, 50, 50)).toBe(true); // sobre el trazo
    expect(hitObj(o, 0, 0)).toBe(true); // extremo
    expect(hitObj(o, 100, 100)).toBe(true); // otro extremo
    expect(hitObj(o, 90, 10)).toBe(false); // dentro del bbox pero lejos del trazo
    expect(hitObj(o, 10, 90)).toBe(false);
  });

  it('una línea no se prolonga más allá de sus extremos', () => {
    // bbox 0,0 → 100,10: la va de (0,0) a (100,10), recta y = 0.1x
    const o = shape('line', 0, 0, 100, 10);
    // (110,20) cae sobre la RECTA prolongada (a ~9 con margen 12) pero no sobre el segmento:
    // el extremo (100,10) está a 14.1
    expect(hitObj(o, 110, 20, 12)).toBe(false);
    expect(hitObj(o, 105, 10.5, 12)).toBe(true); // junto al extremo sí
  });

  it('una línea arrastrada hacia arriba-derecha traza hacia arriba-derecha, no reflejada', () => {
    // bbox 0,0 → 100,100 pero el arrastre fue de (100,100) a (0,0): lineFrom 'se'
    const o = { ...shape('line', 0, 0, 100, 100), lineFrom: 'se' as const };
    expect(hitObj(o, 50, 50)).toBe(true); // la diagonal sigue siendo la misma
    expect(hitObj(o, 90, 10)).toBe(false);
    // la otra diagonal (↙→↗) es la que capta estos puntos
    const up = { ...shape('line', 0, 0, 100, 100), lineFrom: 'sw' as const };
    expect(hitObj(up, 90, 10)).toBe(true); // trazo (0,100)→(100,0)
    expect(hitObj(up, 10, 90)).toBe(true);
    expect(hitObj(up, 50, 50)).toBe(true);
    expect(hitObj(up, 90, 90)).toBe(false); // fuera del trazo real
  });

  it('las cuatro esquinas de inicio cubren los cuatro sentidos del arrastre', () => {
    const o = (from: 'nw' | 'ne' | 'sw' | 'se') => ({ ...shape('line', 0, 0, 100, 100), lineFrom: from });
    expect(hitObj(o('nw'), 80, 80)).toBe(true); // (0,0)→(100,100)
    expect(hitObj(o('se'), 80, 80)).toBe(true); // (100,100)→(0,0): mismo trazo
    expect(hitObj(o('sw'), 80, 20)).toBe(true); // (0,100)→(100,0)
    expect(hitObj(o('ne'), 80, 20)).toBe(true);
    expect(hitObj(o('nw'), 80, 20)).toBe(false);
    expect(hitObj(o('sw'), 80, 80)).toBe(false);
  });

  it('la tolerancia amplía la zona capturable sin volverla sólida', () => {
    const o = shape('line', 0, 0, 100, 100);
    // (90,84) está a ~4.2 del trazo y=x
    expect(hitObj(o, 90, 84, 1)).toBe(false); // lejos con margen pequeño
    expect(hitObj(o, 90, 84, 15)).toBe(true); // dentro con margen 15
    expect(hitObj(o, 90, 10, 15)).toBe(false); // a 56 del trazo: sigue fuera
    const e = shape('ellipse', 100, 100, 200, 100);
    expect(hitObj(e, 100, 100, 2)).toBe(false);
    expect(hitObj(e, 100, 100, 60)).toBe(true); // la esquina entra al agrandar los radios
  });

  it('hitTest usa la forma: un punto en la esquina de una elipse selecciona lo que hay debajo', () => {
    const { page } = docWithLayers(1);
    const bajo = rect(0, 0, 300, 300, 'bajo');
    const elipse = shape('ellipse', 100, 100, 200, 100);
    page.layers[0].objects.push(bajo, elipse);

    expect(hitTest(page, 200, 150)?.id).toBe(elipse.id); // dentro de la elipse
    expect(hitTest(page, 100, 100)?.id).toBe(bajo.id); // esquina: atraviesa la elipse
  });
});

// ================= REDIMENSIONADO =================
describe('redimensionado: el asa arrastrada se mueve, la opuesta queda quieta', () => {
  // Especificación: para cada asa, qué bordes deben conservar su posición exacta.
  // 'x' = borde izquierdo, 'xr' = borde derecho (x+w), 'y' = superior, 'yr' = inferior (y+h).
  const INVARIANT: Record<string, string[]> = {
    nw: ['xr', 'yr'], // opuesta: se
    n: ['x', 'xr', 'yr'], // opuesta: s
    ne: ['x', 'yr'], // opuesta: sw
    e: ['x', 'y', 'yr'], // opuesta: w
    se: ['x', 'y'], // opuesta: nw
    s: ['x', 'xr', 'y'], // opuesta: n
    sw: ['xr', 'y'], // opuesta: ne
    w: ['xr', 'y', 'yr'], // opuesta: e
  };

  const START = { x: 40, y: 30, w: 160, h: 120 };

  for (const role of Object.keys(INVARIANT)) {
    it(`asa ${role}: conserva los bordes opuestos`, () => {
      const o = rect(START.x, START.y, START.w, START.h);
      const dx = 25;
      const dy = -15;
      applyResize(o, START, role as never, dx, dy);

      const edges: Record<string, () => number> = {
        x: () => o.x,
        xr: () => o.x + o.w,
        y: () => o.y,
        yr: () => o.y + o.h,
      };
      const fixed: Record<string, number> = {
        x: START.x,
        xr: START.x + START.w,
        y: START.y,
        yr: START.y + START.h,
      };
      for (const key of INVARIANT[role]) expect(edges[key]()).toBeCloseTo(fixed[key], 9);

      // y el asa arrastrada sí se ha movido
      const moved: Record<string, number> = { x: o.x, xr: o.x + o.w, y: o.y, yr: o.y + o.h };
      const dragged = { nw: ['x', 'y'], n: ['y'], ne: ['xr', 'y'], e: ['xr'], se: ['xr', 'yr'], s: ['yr'], sw: ['x', 'yr'], w: ['x'] }[role]!;
      for (const key of dragged) expect(moved[key]).not.toBeCloseTo(fixed[key], 9);

      expect(o.w).toBeGreaterThan(0);
      expect(o.h).toBeGreaterThan(0);
    });
  }

  it('arrastrar el asa este ensancha sin mover x', () => {
    const o = rect(40, 30, 160, 120);
    applyResize(o, START, 'e', 50, 0);
    expect(o).toMatchObject({ x: 40, y: 30, w: 210, h: 120 });
  });

  it('arrastrar el asa oeste mueve x y conserva el borde derecho', () => {
    const o = rect(40, 30, 160, 120);
    applyResize(o, START, 'w', 50, 0);
    expect(o.x).toBe(90);
    expect(o.x + o.w).toBe(200);
  });

  it('un arrastre más allá de la dimensión no produce ancho ni alto < 1', () => {
    // colapsar desde la derecha: el asa e cruza el borde izquierdo
    const o = rect(40, 30, 160, 120);
    applyResize(o, START, 'e', -400, 0);
    expect(o.w).toBe(1);
    expect(o.x).toBe(40); // el lado opuesto sigue en su sitio

    // colapsar desde arriba: el asa n cruza el borde inferior
    const o2 = rect(40, 30, 160, 120);
    applyResize(o2, START, 'n', 0, 400);
    expect(o2.h).toBe(1);
    expect(o2.y + o2.h).toBe(150); // el borde inferior sigue en su sitio
  });

  it('arrastrar hacia fuera amplía en esa dirección (no colapsa)', () => {
    const o = rect(40, 30, 160, 120);
    applyResize(o, START, 'n', 0, -400);
    expect(o.h).toBe(520);
    expect(o.y + o.h).toBe(150);
  });

  it('dx=0, dy=0 no altera el objeto', () => {
    const o = rect(40, 30, 160, 120);
    applyResize(o, START, 'se', 0, 0);
    expect(o).toMatchObject({ x: 40, y: 30, w: 160, h: 120 });
  });
});

// ================= ASAS =================
describe('asas: 8 puntos en coordenadas de pantalla, consistentes con la vista', () => {
  it('para zoom/pan arbitrarios, cada asa coincide con su posición geométrica', () => {
    const rand = rng(7);
    for (let iter = 0; iter < 20; iter++) {
      const o = rect(
        Math.round(rand() * 500),
        Math.round(rand() * 500),
        20 + Math.round(rand() * 300),
        20 + Math.round(rand() * 300),
      );
      const v: View = { zoom: 0.1 + rand() * 4, panX: rand() * 400 - 200, panY: rand() * 400 - 200 };
      const hs = handles(o, v);
      expect(hs.filter((h) => h.role !== 'rot')).toHaveLength(8);
      expect(hs.some((h) => h.role === 'rot')).toBe(true);

      const x0 = o.x, y0 = o.y, x1 = o.x + o.w, y1 = o.y + o.h;
      const expectScreen = (wx: number, wy: number) => worldToScreen(v, wx, wy);
      const want: Record<string, { x: number; y: number }> = {
        nw: expectScreen(x0, y0),
        n: expectScreen((x0 + x1) / 2, y0),
        ne: expectScreen(x1, y0),
        e: expectScreen(x1, (y0 + y1) / 2),
        se: expectScreen(x1, y1),
        s: expectScreen((x0 + x1) / 2, y1),
        sw: expectScreen(x0, y1),
        w: expectScreen(x0, (y0 + y1) / 2),
      };
      for (const [role, pt] of Object.entries(want)) {
        const h = hs.find((h) => h.role === role)!;
        // coincidencia geométrica, no bit a bit: el orden de operaciones difiere
        expect(h.x).toBeCloseTo(pt.x, 9);
        expect(h.y).toBeCloseTo(pt.y, 9);
      }

    }
  });

  it('hitHandle encuentra el asa bajo el cursor y no fuera de su radio', () => {
    const o = rect(10, 10, 100, 60);
    const v: View = { zoom: 1, panX: 0, panY: 0 };
    const hs = handles(o, v);
    const se = hs.find((h) => h.role === 'se')!;
    expect(hitHandle(se.x, se.y, hs)?.role).toBe('se');
    expect(hitHandle(se.x + 6, se.y - 6, hs)?.role).toBe('se'); // dentro del radio
    expect(hitHandle(se.x + 30, se.y, hs)).toBeNull(); // lejos
    expect(hitHandle(0, 0, hs)).toBeNull();
  });
});

// ================= VISTA =================
describe('vista: la transformación es una biyección afín', () => {
  it('screenToWorld deshace worldToScreen para cualquier vista', () => {
    const rand = rng(11);
    for (let i = 0; i < 50; i++) {
      const v: View = { zoom: 0.02 + rand() * 60, panX: rand() * 2000 - 1000, panY: rand() * 2000 - 1000 };
      const x = rand() * 4000 - 2000;
      const y = rand() * 4000 - 2000;
      const s = worldToScreen(v, x, y);
      const w = screenToWorld(v, s.x, s.y);
      expect(w.x).toBeCloseTo(x, 6);
      expect(w.y).toBeCloseTo(y, 6);
    }
  });

  it('un desplazamiento de pantalla equivale a un desplazamiento de mundo coherente', () => {
    const v: View = { zoom: 2.5, panX: 100, panY: -40 };
    const a = screenToWorld(v, 300, 300);
    const b = screenToWorld(v, 340, 300);
    expect(b.x - a.x).toBeCloseTo(40 / v.zoom);
    expect(b.y - a.y).toBeCloseTo(0);
  });
});

describe('fitAll: la página entra entera, centrada, y el zoom es el máximo que cabe', () => {
  it('página grande: cabe en el viewport y queda centrada', () => {
    const v: View = { zoom: 1, panX: 0, panY: 0 };
    const cw = 900;
    const ch = 600;
    fitAll(v, { width: 1600, height: 1000 }, cw, ch);

    expect(v.zoom).toBeGreaterThan(0);
    expect(v.panX).toBeGreaterThanOrEqual(0);
    expect(v.panY).toBeGreaterThanOrEqual(0);
    expect(v.panX + 1600 * v.zoom).toBeLessThanOrEqual(cw);
    expect(v.panY + 1000 * v.zoom).toBeLessThanOrEqual(ch);
    // centrada
    expect(v.panX).toBeCloseTo((cw - 1600 * v.zoom) / 2, 6);
    expect(v.panY).toBeCloseTo((ch - 1000 * v.zoom) / 2, 6);
  });

  it('no deforma: la proporción de la página ajustada es la original', () => {
    const v: View = { zoom: 1, panX: 0, panY: 0 };
    fitAll(v, { width: 1600, height: 1000 }, 900, 600);
    expect(1600 * v.zoom / (1000 * v.zoom)).toBeCloseTo(1600 / 1000);
  });

  it('monótono: un viewport mayor no da un zoom menor', () => {
    const a: View = { zoom: 1, panX: 0, panY: 0 };
    const b: View = { zoom: 1, panX: 0, panY: 0 };
    fitAll(a, { width: 1600, height: 1000 }, 900, 600);
    fitAll(b, { width: 1600, height: 1000 }, 1800, 1200);
    expect(b.zoom).toBeGreaterThanOrEqual(a.zoom);
  });

  it('página pequeña: amplía por encima del 100% (como View Fit Page)', () => {
    const v: View = { zoom: 1, panX: 0, panY: 0 };
    fitAll(v, { width: 40, height: 30 }, 900, 600);
    expect(v.zoom).toBeGreaterThan(1);
    expect(v.panX + 40 * v.zoom).toBeLessThanOrEqual(900);
  });

  it('viewport estrecho: no produce zoom <= 0 ni NaN', () => {
    const v: View = { zoom: 1, panX: 0, panY: 0 };
    fitAll(v, { width: 1280, height: 800 }, 60, 40);
    expect(Number.isFinite(v.zoom)).toBe(true);
    expect(v.zoom).toBeGreaterThan(0);
  });
});

// ================= HISTORIAL =================
describe('historial: undo y redo son inversos exactos', () => {
  it('run aplica el comando y undo lo revierte al estado original', () => {
    const o = rect(0, 0, 10, 10);
    const h = new History();
    h.run({ label: 'mover', do: () => (o.x = 50), undo: () => (o.x = 0) });
    expect(o.x).toBe(50);
    expect(h.undo()).toBe(true);
    expect(o.x).toBe(0);
    expect(h.redo()).toBe(true);
    expect(o.x).toBe(50);
  });

  it('una pila vacía no deshace nada', () => {
    const h = new History();
    expect(h.undo()).toBe(false);
    expect(h.redo()).toBe(false);
  });

  it('un comando nuevo invalida el redo pendiente', () => {
    const o = rect(0, 0, 10, 10);
    const h = new History();
    h.run({ label: 'a', do: () => (o.x = 1), undo: () => (o.x = 0) });
    h.undo();
    h.run({ label: 'b', do: () => (o.y = 2), undo: () => (o.y = 0) });
    expect(h.redo()).toBe(false);
    expect(o.x).toBe(0);
    expect(o.y).toBe(2);
  });

  it('record registra sin volver a ejecutar el do()', () => {
    const o = rect(0, 0, 10, 10);
    let calls = 0;
    const h = new History();
    // el drag en vivo ya aplicó el cambio; record no debe aplicarlo otra vez
    o.x = 77;
    h.record({ label: 'drag', do: () => { calls++; o.x = 77; }, undo: () => (o.x = 0) });
    expect(calls).toBe(0);
    expect(o.x).toBe(77);
    expect(h.undo()).toBe(true);
    expect(o.x).toBe(0);
  });

  it('secuencia larga: deshacer todo devuelve el estado inicial y rehacer todo el final', () => {
    const o = rect(0, 0, 10, 10);
    const h = new History();
    const initial = { ...o };
    const n = 25;
    for (let i = 1; i <= n; i++) {
      const prev = { ...o };
      h.run({ label: `op${i}`, do: () => (o.x = i * 3), undo: () => Object.assign(o, prev) });
    }
    expect(o.x).toBe(n * 3);
    for (let i = 0; i < n; i++) expect(h.undo()).toBe(true);
    expect(o).toMatchObject(initial);
    expect(h.undo()).toBe(false);
    for (let i = 0; i < n; i++) expect(h.redo()).toBe(true);
    expect(o.x).toBe(n * 3);
    expect(h.redo()).toBe(false);
  });
});

// ================= MODELO =================
describe('modelo: un documento nuevo es siempre editable', () => {
  it('newDoc tiene al menos una página con una capa visible y sin bloquear', () => {
    const doc = newDoc();
    expect(doc.pages.length).toBeGreaterThan(0);
    const page = activePage(doc);
    expect(page.layers.length).toBeGreaterThan(0);
    expect(page.layers.some((l) => l.visible && !l.locked)).toBe(true);
    expect(page.width).toBeGreaterThan(0);
    expect(page.height).toBeGreaterThan(0);
    expect(doc.version).toBe(1);
  });

  it('los ids generados son únicos', () => {
    const ids = new Set(Array.from({ length: 2000 }, () => uid()));
    expect(ids.size).toBe(2000);
  });

  it('findObj recorre todas las capas y no inventa objetos', () => {
    const { page } = docWithLayers(3);
    const o = rect(0, 0, 1, 1);
    page.layers[2].objects.push(o);
    expect(findObj(page, o.id)?.id).toBe(o.id);
    expect(findObj(page, 'inexistente')).toBeNull();
    expect(findObj(page, null)).toBeNull();
  });

  it('findLayer devuelve la capa que contiene el objeto', () => {
    const { page } = docWithLayers(2);
    const o = rect(0, 0, 1, 1);
    page.layers[1].objects.push(o);
    expect(findLayer(page, o)?.id).toBe(page.layers[1].id);
  });
});

// ================= PERSISTENCIA (límite de confianza) =================
describe('persistencia: nunca lanza, y no acepta documentos inválidos', () => {
  it('sin IndexedDB disponible, loadDoc devuelve null en lugar de romper la app', async () => {
    expect(await loadDoc()).toBeNull();
  });

  it('saveDoc no lanza aunque no haya almacenamiento', async () => {
    await expect(saveDoc(newDoc())).resolves.toBeUndefined();
  });
});

// ================= UI: paneles laterales =================
describe('UI: las propiedades van en el panel derecho, debajo de las páginas', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

  it('#inspector-body está en #side, después de pages-body', () => {
    const side = /<div id="side">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/.exec(html);
    expect(side).not.toBeNull();
    expect(side![1]).toContain('id="pages-body"');
    expect(side![1]).toContain('id="inspector-body"');
    expect(side![1].indexOf('id="pages-body"')).toBeLessThan(side![1].indexOf('id="inspector-body"'));
  });

  it('cada panel es colapsable y arrastrable', () => {
    expect(css).toContain('.panel.collapsed');
    expect(css).toContain('.panel.dragging');
    const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    expect(main).toContain('data-panel');
    expect(main).toContain('draggable = true');
  });

  it('las herramientas de la barra son botones reales, no divs', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const tools = [...html.matchAll(/<([a-z]+)[^>]*class="tool[^"]*"[^>]*>/g)].map((m) => m[1]);
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.every((t) => t === 'button')).toBe(true);
    expect(html).toContain('aria-pressed');
  });
});
