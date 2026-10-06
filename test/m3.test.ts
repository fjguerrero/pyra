// @vitest-environment jsdom
// Tests de M3 (bitmap): hit-test, dibujo con crop/filtros, migración en store.
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Renderer, type Scene } from '../src/render';
import { activePage, newDoc, uid, type BitmapObj, type Doc } from '../src/model';
import { hitObj, hitTest } from '../src/hit';
import { loadDoc, saveDoc } from '../src/store';

function bitmap(x: number, y: number, w: number, h: number): BitmapObj {
  return {
    id: uid(), shape: 'bitmap', name: 'img', x, y, w, h,
    src: 'data:image/png;base64,AAAA', crop: null, sat: 1, bri: 1,
  };
}

// ================= hit-test =================
describe('hitObj/hitTest: bitmap', () => {
  it('un punto dentro del bbox de un bitmap es un hit', () => {
    const o = bitmap(10, 10, 100, 80);
    expect(hitObj(o, 50, 50)).toBe(true);
    expect(hitObj(o, 109, 89)).toBe(true);
  });

  it('un punto fuera del bbox no es un hit', () => {
    const o = bitmap(10, 10, 100, 80);
    expect(hitObj(o, 111, 50)).toBe(false);
    expect(hitObj(o, 50, 91)).toBe(false);
  });

  it('hitTest devuelve el bitmap como cualquier otro objeto', () => {
    const doc = newDoc('m3');
    const page = activePage(doc);
    const o = bitmap(0, 0, 50, 50);
    page.layers[0].objects.push(o);
    expect(hitTest(page, 25, 25)?.id).toBe(o.id);
  });
});

// ================= render =================
type Op = { op: string; args: unknown[] };

function fakeCtx(): { ctx: CanvasRenderingContext2D; ops: Op[] } {
  const ops: Op[] = [];
  const ctx = {} as Record<string, unknown>;
  for (const m of ['fillRect', 'strokeRect', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'fill', 'rect', 'ellipse', 'clip', 'save', 'restore', 'setTransform', 'setLineDash', 'drawImage']) {
    ctx[m] = (...args: unknown[]) => {
      ops.push({ op: m, args });
      return undefined as never;
    };
  }
  for (const p of ['fillStyle', 'strokeStyle', 'lineWidth', 'globalAlpha', 'filter']) {
    Object.defineProperty(ctx, p, {
      get: () => undefined,
      set: (v: unknown) => {
        ops.push({ op: `set:${p}`, args: [v] });
      },
    });
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, ops };
}

function scene(partial: Partial<Scene> = {}): Scene {
  return {
    page: activePage(newDoc('m3-render')),
    view: { zoom: 1, panX: 0, panY: 0 },
    selectedId: null,
    selectedIds: [],
    draft: null,
    guides: [],
    ...partial,
  };
}

function bitmapScene(o: BitmapObj, view = { zoom: 1, panX: 0, panY: 0 }): Scene {
  const s = scene({ view });
  s.page.layers[0].objects.push(o);
  return s;
}

// jsdom/node no decodifican imágenes: stub con carga inmediata y tamaño natural fijo.
class FakeImage {
  naturalWidth = 200;
  naturalHeight = 100;
  onload: (() => void) | null = null;
  set src(_v: string) {
    queueMicrotask(() => this.onload?.());
  }
}
const RealImage = globalThis.Image;
beforeEach(() => {
  window.devicePixelRatio = 1;
  globalThis.Image = FakeImage as unknown as typeof RealImage;
});
afterEach(() => {
  globalThis.Image = RealImage as unknown as typeof RealImage;
});
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('Renderer.draw: bitmap', () => {
  it('una imagen no decodificada no rompe; al decodificarse se dibuja escalada', async () => {
      const { ctx, ops } = fakeCtx();
      const r = new Renderer({ width: 1000, height: 700, getContext: () => ctx } as unknown as HTMLCanvasElement);
      const s = bitmapScene(bitmap(10, 20, 60, 40), { zoom: 2, panX: 100, panY: 50 });
      r.draw(s); // primera pasada: aún no decodificada
      expect(ops.some((o) => o.op === 'drawImage')).toBe(false);
      await settle();
      r.draw(s); // segunda: decodificada
      const di = ops.find((o) => o.op === 'drawImage')!;
      expect(di.args.slice(5)).toEqual([120, 90, 120, 80]);
  });

  it('crop: dibuja solo el rectángulo recortado de la fuente', async () => {
      const o = bitmap(10, 20, 60, 40);
      o.crop = { x: 5, y: 6, w: 70, h: 50 };
      const { ctx, ops } = fakeCtx();
      const r = new Renderer({ width: 1000, height: 700, getContext: () => ctx } as unknown as HTMLCanvasElement);
      const s = bitmapScene(o, { zoom: 2, panX: 100, panY: 50 });
      r.draw(s);
      await settle();
      r.draw(s);
      const di = ops.find((o) => o.op === 'drawImage')!;
      // args: img, sx, sy, sw, sh, dx, dy, dw, dh
      expect(di.args.slice(1, 5)).toEqual([5, 6, 70, 50]);
      expect(di.args.slice(5)).toEqual([120, 90, 120, 80]);
  });

  it('sin crop usa la imagen completa con su tamaño natural', async () => {
      const { ctx, ops } = fakeCtx();
      const r = new Renderer({ width: 1000, height: 700, getContext: () => ctx } as unknown as HTMLCanvasElement);
      const o = bitmap(0, 0, 200, 100);
      const s = bitmapScene(o);
      r.draw(s);
      await settle();
      r.draw(s);
      const di = ops.find((o) => o.op === 'drawImage')!;
      expect(di.args.slice(1, 5)).toEqual([0, 0, 200, 100]);
  });

  it('los filtros vivos (blur/sat/bri) se aplican como ctx.filter y se limpian', async () => {
      const o = bitmap(0, 0, 200, 100);
      o.fx = { shadow: null, glow: null, blur: 4 };
      o.sat = 0.5;
      o.bri = 1.2;
      const { ctx, ops } = fakeCtx();
      const r = new Renderer({ width: 1000, height: 700, getContext: () => ctx } as unknown as HTMLCanvasElement);
      const s = bitmapScene(o);
      r.draw(s);
      await settle();
      r.draw(s);
      const filters = ops.filter((o) => o.op === 'set:filter').map((o) => o.args[0]);
      expect(filters).toContain('saturate(0.5) brightness(1.2) blur(4px)');
      expect(filters.at(-1)).toBe('none');
  });

  it('un bitmap sin filtros no establece ningún filtro', async () => {
      const { ctx, ops } = fakeCtx();
      const r = new Renderer({ width: 1000, height: 700, getContext: () => ctx } as unknown as HTMLCanvasElement);
      const s = bitmapScene(bitmap(0, 0, 200, 100));
      r.draw(s);
      await settle();
      r.draw(s);
      expect(ops.some((o) => o.op === 'set:filter')).toBe(false);
  });
});

// ================= store: migración =================
describe('loadDoc: normaliza bitmaps antiguos', () => {
  it('un bitmap guardado sin crop/blur/sat/bri entra al modelo con valores por defecto', async () => {
    const doc = newDoc('m3-store');
    const o = bitmap(0, 0, 10, 10);
    delete (o as Partial<BitmapObj>).crop;
    delete (o as Partial<BitmapObj>).sat;
    delete (o as Partial<BitmapObj>).bri;
    (o as { blur?: number }).blur = 7; // legado M3 → fx.blur
    activePage(doc).layers[0].objects.push(o as BitmapObj);
    await saveDoc(doc as unknown as Doc);
    const loaded = await loadDoc();
    expect(loaded).not.toBeNull();
    const back = activePage(loaded!).layers[0].objects[0] as BitmapObj;
    expect(back.shape).toBe('bitmap');
    expect(back.crop).toBeNull();
    expect(back.fx?.blur).toBe(7);
    expect(back.sat).toBe(1);
    expect(back.bri).toBe(1);
  });
});
