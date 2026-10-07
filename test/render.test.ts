// @vitest-environment jsdom
// Tests de Renderer función por función. En lugar de un canvas real se usa un contexto de
// registro: verifica QUÉ se dibuja, con qué argumentos y con qué estilos, no cuántos píxeles
// salen. Escritos desde la especificación visual, no desde el cuerpo de render.ts.
import { beforeEach, describe, expect, it } from 'vitest';
import { Renderer, type Scene } from '../src/render';
import { activePage, newDoc, uid, type ShapeObj } from '../src/model';

type Op = { op: string; args: unknown[] };

function fakeCtx(): { ctx: CanvasRenderingContext2D; ops: Op[] } {
  const ops: Op[] = [];
  const call = (op: string) => (...args: unknown[]) => {
    ops.push({ op, args });
    return undefined as never;
  };
  const ctx = {} as Record<string, unknown>;
  for (const m of ['fillRect', 'strokeRect', 'fillText', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'fill', 'rect', 'ellipse', 'clip', 'save', 'restore', 'setTransform', 'setLineDash', 'closePath', 'arc']) {
    ctx[m] = call(m);
  }
  // los estilos se asignan por propiedad, no por método: hay que interceptar el setter
  for (const p of ['fillStyle', 'strokeStyle', 'lineWidth', 'globalAlpha', 'shadowColor', 'shadowBlur']) {
    Object.defineProperty(ctx, p, {
      get: () => undefined,
      set: (v: unknown) => {
        ops.push({ op: `set:${p}`, args: [v] });
      },
    });
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, ops };
}

const filled = (ops: Op[]) => ops.filter((o) => o.op === 'fillRect').map((o) => o.args);
const strokes = (ops: Op[]) => ops.filter((o) => o.op === 'strokeRect').map((o) => o.args);
const lines = (ops: Op[]) => ops.filter((o) => o.op === 'moveTo' || o.op === 'lineTo').map((o) => o.args);
const styleOrder = (ops: Op[], prop: string) => ops.filter((o) => o.op === `set:${prop}`).map((o) => o.args[0]);
/** Caminos de forma construidos dentro del recorte de la página (lo que se pinta de los objetos). */
function shapePaths(ops: Op[], op: string): unknown[][] {
  const start = ops.findIndex((o) => o.op === 'clip');
  const end = ops.findIndex((o, i) => i > start && o.op === 'restore');
  return ops.slice(start + 1, end).filter((o) => o.op === op).map((o) => o.args);
}

function fakeCanvas(ctx: CanvasRenderingContext2D, width = 1000, height = 700): HTMLCanvasElement {
  return { width, height, getContext: () => ctx } as unknown as HTMLCanvasElement;
}

function rect(x: number, y: number, w: number, h: number, fill = '#ff0000'): ShapeObj {
  return { id: uid(), shape: 'rect', name: 'r', x, y, w, h, fill, stroke: null, strokeWidth: 0 };
}

function scene(partial: Partial<Scene> = {}): Scene {
  return {
    page: activePage(newDoc('render-test')),
    view: { zoom: 1, panX: 0, panY: 0 },
    selectedId: null,
    selectedIds: [],
    draft: null,
    guides: [],
    ...partial,
  };
}

function draw(s: Scene): Op[] {
  const { ctx, ops } = fakeCtx();
  new Renderer(fakeCanvas(ctx)).draw(s);
  return ops;
}

describe('Renderer.draw: workspace y página', () => {
  it('pinta el workspace entero y después la página a su escala y posición', () => {
    const s = scene({ view: { zoom: 0.5, panX: 40, panY: 20 } });
    s.page.width = 800;
    s.page.height = 600;
    const rects = filled(draw(s));
    expect(rects[0]).toEqual([0, 0, 1000, 700]);
    expect(rects[1]).toEqual([40, 20, 400, 300]);
  });

  it('la cuadrícula del fondo son líneas, no cuadrados rellenos', () => {
    const s = scene({ workspace: { color: '#111111', grid: 20 } });
    const ops = draw(s);
    const gridIdx = ops.findIndex((o) => o.op === 'set:strokeStyle' && String(o.args[0]).includes('128'));
    expect(gridIdx).toBeGreaterThan(-1);
    // tras el color de fondo, la cuadrícula se traza con moveTo/lineTo + stroke
    const bgIdx = ops.findIndex((o) => o.op === 'fillRect');
    expect(gridIdx).toBeGreaterThan(bgIdx);
    expect(ops.some((o, i) => i > gridIdx && o.op === 'lineTo')).toBe(true);
    expect(ops.some((o, i) => i > gridIdx && o.op === 'stroke')).toBe(true);
  });

  it('recorta a la página antes de dibujar los objetos', () => {
    const s = scene();
    s.page.layers[0].objects.push(rect(10, 10, 30, 30));
    const ops = draw(s);
    const clipIdx = ops.findIndex((o) => o.op === 'clip');
    const objIdx = ops.findIndex((o) => o.op === 'rect' && o.args[0] === 10);
    expect(clipIdx).toBeGreaterThan(-1);
    expect(objIdx).toBeGreaterThan(clipIdx);
  });
});

describe('Renderer.draw: objetos y capas', () => {
  it('dibuja cada objeto en su posición de pantalla con su color de relleno', () => {
    const s = scene({ view: { zoom: 2, panX: 100, panY: 50 } });
    s.page.layers[0].objects.push(rect(10, 20, 30, 40, '#00ff00'));
    const ops = draw(s);
    expect(ops.some((o) => o.op === 'rect' && o.args[0] === 120 && o.args[1] === 90 && o.args[2] === 60 && o.args[3] === 80)).toBe(true);
    expect(styleOrder(ops, 'fillStyle')).toContain('#00ff00');
    expect(ops.some((o) => o.op === 'fill')).toBe(true);
  });

  it('la capa superior se pinta después que la inferior (la tapa)', () => {
    const s = scene();
    s.page.layers[0].objects.push(rect(0, 0, 50, 50, '#0000ff'));
    s.page.layers.push({ id: uid(), name: 'superior', visible: true, locked: false, opacity: 1, objects: [rect(0, 0, 50, 50, '#ff0000')] });
    const styles = styleOrder(draw(s), 'fillStyle');
    expect(styles.indexOf('#ff0000')).toBeGreaterThan(styles.indexOf('#0000ff'));
  });

  it('una capa oculta no pinta nada', () => {
    const s = scene();
    s.page.layers[0].objects.push(rect(10, 10, 30, 30));
    s.page.layers[0].visible = false;
    expect(filled(draw(s)).some((a) => a[0] === 10 && a[1] === 10)).toBe(false);
  });

  it('aplica la opacidad de la capa y la restaura al terminar', () => {
    const s = scene();
    s.page.layers[0].objects.push(rect(10, 10, 30, 30));
    s.page.layers[0].opacity = 0.4;
    const alphas = styleOrder(draw(s), 'globalAlpha');
    expect(alphas).toContain(0.4);
    expect(alphas.at(-1)).toBe(1);
  });

  it('un objeto sin relleno no produce rectángulo relleno', () => {
    const s = scene();
    s.page.layers[0].objects.push(rect(10, 10, 30, 30, ''));
    expect(filled(draw(s)).some((a) => a[0] === 10 && a[1] === 10)).toBe(false);
  });

  it('un trazo se dibuja con su grosor escalado por el zoom', () => {
    const s = scene({ view: { zoom: 2, panX: 0, panY: 0 } });
    const o = rect(5, 5, 20, 20, '');
    o.stroke = '#000000';
    o.strokeWidth = 3;
    s.page.layers[0].objects.push(o);
    const ops = draw(s);
    expect(ops.some((o) => o.op === 'rect' && o.args[0] === 10 && o.args[2] === 40)).toBe(true);
    expect(ops.some((o) => o.op === 'stroke')).toBe(true);
    expect(styleOrder(ops, 'lineWidth')).toContain(6);
    expect(styleOrder(ops, 'strokeStyle')).toContain('#000000');
  });
});

describe('Renderer.draw: formas vectoriales', () => {
  it('una elipse se traza como elipse inscrita en su bounding box', () => {
    const s = scene();
    const o = rect(100, 50, 80, 40, '#ff0000');
    o.shape = 'ellipse';
    s.page.layers[0].objects.push(o);
    const ops = draw(s);
    expect(ops.some((o) => o.op === 'ellipse' && o.args[0] === 140 && o.args[1] === 70 && o.args[2] === 40 && o.args[3] === 20)).toBe(true);
    // tras recortar a la página no queda ningún camino rectangular
    expect(shapePaths(ops, 'rect')).toEqual([]);
  });

  it('una línea va de la esquina superior-izquierda a la inferior-derecha de su bbox', () => {
    const s = scene();
    const o = rect(10, 20, 100, 60, '');
    o.shape = 'line';
    o.stroke = '#000000';
    o.strokeWidth = 1;
    s.page.layers[0].objects.push(o);
    const ops = draw(s);
    expect(lines(ops)).toContainEqual([10, 20]);
    expect(lines(ops)).toContainEqual([110, 80]);
    expect(ops.some((o) => o.op === 'fill')).toBe(false); // una línea no se rellena
  });

  it('una línea arrastrada hacia arriba respeta su sentido: no se refleja', () => {
    const mk = (lineFrom: 'nw' | 'sw') => {
      const o = rect(10, 20, 100, 60, '');
      o.shape = 'line';
      o.stroke = '#000000';
      o.strokeWidth = 1;
      o.lineFrom = lineFrom;
      return o;
    };
    const down = draw(Object.assign(scene(), { page: (() => { const s = scene(); s.page.layers[0].objects.push(mk('nw')); return s.page; })() }));
    expect(lines(down)).toContainEqual([10, 20]);
    expect(lines(down)).toContainEqual([110, 80]);

    const s2 = scene();
    s2.page.layers[0].objects.push(mk('sw')); // trazo (10,80) → (110,20)
    const up = draw(s2);
    expect(lines(up)).toContainEqual([10, 80]);
    expect(lines(up)).toContainEqual([110, 20]);
    expect(lines(up)).not.toContainEqual([10, 20]);
  });

  it('un trazo de pincel se pinta como polilínea con grosor por presión', () => {
    const o = rect(0, 0, 100, 100, '');
    o.shape = 'stroke';
    o.stroke = '#123456';
    o.strokeWidth = 10;
    o.brush = 'square';
    o.points = [
      { x: 0, y: 0, p: 1 },
      { x: 0.5, y: 0.5, p: 0.5 },
      { x: 1, y: 1, p: 1 },
    ];
    const s = scene();
    s.page.layers[0].objects.push(o);
    const ops = draw(s);
    expect(styleOrder(ops, 'strokeStyle')).toContain('#123456');
    // un segmento por cada par de puntos, con el grosor medio de sus presiones
    const widths = styleOrder(ops, 'lineWidth').filter((w) => w === 10 || w === 7.5);
    expect(widths.length).toBe(2);
    expect(lines(ops)).toContainEqual([0, 0]);
    expect(lines(ops)).toContainEqual([50, 50]);
    expect(lines(ops)).toContainEqual([100, 100]);
    expect(ops.some((o) => o.op === 'fill')).toBe(false); // un trazo no se rellena
  });

  it('el borrador de una elipse se traza como elipse, no como rectángulo', () => {
    const s = scene({ draft: { x: 10, y: 10, w: 40, h: 30, shape: 'ellipse' } });
    const ops = draw(s);
    expect(ops.some((o) => o.op === 'ellipse' && o.args[0] === 30 && o.args[2] === 20)).toBe(true);
    expect(shapePaths(ops, 'rect')).toEqual([]);
  });
});

describe('Renderer.draw: borrador de dibujo', () => {
  it('el borrador se dibuja como contorno discontinuo y la discontinuidad se limpia', () => {
    const s = scene({ draft: { x: 100, y: 100, w: 60, h: 40, shape: 'rect' } });
    const ops = draw(s);
    expect(ops.some((o) => o.op === 'rect' && o.args[0] === 100 && o.args[2] === 60)).toBe(true);
    const dashes = ops.filter((o) => o.op === 'setLineDash').map((o) => o.args[0]);
    expect(dashes[0]).toEqual([4, 3]);
    expect(dashes.at(-1)).toEqual([]);
  });

  it('sin borrador no hay contornos discontinuos', () => {
    expect(draw(scene({ draft: null })).some((o) => o.op === 'setLineDash')).toBe(false);
  });
});

describe('Renderer.draw: smart guides', () => {
  it('una guía vertical cruza la página de arriba a abajo en su posición de pantalla', () => {
    const s = scene({ view: { zoom: 2, panX: 10, panY: 20 }, guides: [{ axis: 'v', pos: 100 }] });
    s.page.width = 400;
    s.page.height = 300;
    const ops = draw(s);
    expect(lines(ops)).toContainEqual([210, 20]);
    expect(lines(ops)).toContainEqual([210, 620]);
    expect(styleOrder(ops, 'strokeStyle')).toContain('#ff5fa2');
  });

  it('una guía horizontal cruza la página de lado a lado', () => {
    const s = scene({ guides: [{ axis: 'h', pos: 150 }] });
    s.page.width = 400;
    s.page.height = 300;
    const ops = draw(s);
    expect(lines(ops)).toContainEqual([0, 150]);
    expect(lines(ops)).toContainEqual([400, 150]);
  });

  it('sin guías no se traza ninguna línea', () => {
    expect(draw(scene({ guides: [] })).some((o) => o.op === 'moveTo')).toBe(false);
  });
});

describe('Renderer.draw: selección', () => {
  it('el objeto seleccionado se contorna y recibe 8 asas', () => {
    const s = scene();
    const o = rect(10, 10, 100, 60);
    s.page.layers[0].objects.push(o);
    s.selectedId = o.id;
    const ops = draw(s);
    expect(strokes(ops)).toContainEqual([9.5, 9.5, 101, 61]);
    expect(filled(ops).filter((a) => a[2] === 7 && a[3] === 7).length).toBe(8);
  });

  it('sin selección no hay contorno ni asas', () => {
    const s = scene();
    s.page.layers[0].objects.push(rect(10, 10, 100, 60));
    expect(filled(draw(s)).some((a) => a[2] === 7)).toBe(false);
  });

  it('la selección múltiple contorna a todos pero asas solo al principal', () => {
    const s = scene();
    const a = rect(0, 0, 40, 40);
    const b = rect(100, 0, 40, 40);
    s.page.layers[0].objects.push(a, b);
    s.selectedId = a.id;
    s.selectedIds = [a.id, b.id];
    const ops = draw(s);
    expect(strokes(ops)).toContainEqual([99.5, -0.5, 41, 41]);
    expect(filled(ops).filter((x) => x[2] === 7).length).toBe(8);
  });

  it('un id seleccionado que ya no existe no rompe el dibujo', () => {
    expect(() => draw(scene({ selectedId: 'borrado', selectedIds: ['borrado'] }))).not.toThrow();
  });
});

describe('Renderer.resize: tamaño del lienzo', () => {
  it('multiplica el tamaño CSS por el devicePixelRatio', () => {
    window.devicePixelRatio = 2;
    const { ctx } = fakeCtx();
    const canvas = fakeCanvas(ctx, 1, 1);
    new Renderer(canvas).resize(500, 300);
    expect([canvas.width, canvas.height]).toEqual([1000, 600]);
  });

  it('un DPR ausente o un CSS de 0 no producen un lienzo de 0 píxeles', () => {
    // @ts-expect-error entorno sin DPR definido
    window.devicePixelRatio = undefined;
    const { ctx } = fakeCtx();
    const canvas = fakeCanvas(ctx, 1, 1);
    new Renderer(canvas).resize(0, 0);
    expect(canvas.width).toBeGreaterThanOrEqual(1);
    expect(canvas.height).toBeGreaterThanOrEqual(1);
  });
});

beforeEach(() => {
  window.devicePixelRatio = 1;
});
