// Tests de M4 (texto): medición, dibujo, hit-test.
import { describe, expect, it } from 'vitest';
import { measureText, drawTextObj } from '../src/text';
import { hitObj, hitTest } from '../src/hit';
import { newDoc, activePage, uid, type TextObj } from '../src/model';

function fakeCtx(): { ctx: CanvasRenderingContext2D; ops: { op: string; args: unknown[] }[] } {
  const ops: { op: string; args: unknown[] }[] = [];
  const ctx = {} as Record<string, unknown>;
  for (const m of ['fillText', 'measureText']) {
    ctx[m] = (...args: unknown[]) => {
      ops.push({ op: m, args });
      return m === 'measureText'
        ? { width: String(args[0]).length * 10, actualBoundingBoxAscent: 16, actualBoundingBoxDescent: 4 }
        : undefined;
    };
  }
  for (const p of ['font', 'fillStyle', 'textBaseline']) {
    Object.defineProperty(ctx, p, { get: () => undefined, set: (v: unknown) => { ops.push({ op: `set:${p}`, args: [v] }); } });
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, ops };
}

function textObj(partial: Partial<TextObj> = {}): TextObj {
  return {
    id: uid(), shape: 'text', name: 'Texto', x: 0, y: 0, w: 1, h: 1,
    text: 'Texto', font: 'sans-serif', size: 24, fill: '#111111', ...partial,
  };
}

describe('measureText', () => {
  it('mide el ancho de la línea más larga y la altura por líneas', () => {
    const { ctx } = fakeCtx();
    const m = measureText(ctx, 'ab\ncdefghijklmnop', 'sans-serif', 20);
    expect(m.w).toBe(140); // 14 chars × 10
    expect(m.h).toBe(2 * 20 * 1.2);
    expect(m.ascent).toBe(16);
  });

  it('el texto vacío no da bbox cero', () => {
    const { ctx } = fakeCtx();
    const m = measureText(ctx, '', 'sans-serif', 20);
    expect(m.w).toBeGreaterThanOrEqual(1);
    expect(m.h).toBe(24);
  });
});

describe('drawTextObj', () => {
  it('dibuja cada línea con la fuente escalada por el zoom', () => {
    const { ctx, ops } = fakeCtx();
    const o = textObj({ text: 'hola\nmundo', x: 10, y: 20, size: 24 });
    drawTextObj(ctx, o, 2, 100, 50);
    expect(ops.find((o) => o.op === 'set:font')!.args[0]).toBe('48px sans-serif');
    const texts = ops.filter((o) => o.op === 'fillText');
    expect(texts.map((t) => t.args[0])).toEqual(['hola', 'mundo']);
    expect(Number(texts[0].args[1])).toBe(120); // 10*2 + 100
    expect(Number(texts[1].args[2])).toBe(Number(texts[0].args[2]) + 48 * 1.2);
  });
});

describe('hitObj/hitTest: text', () => {
  it('un punto dentro del bbox de un texto es un hit', () => {
    const o = textObj({ x: 10, y: 10, w: 100, h: 40 });
    expect(hitObj(o, 50, 30)).toBe(true);
    expect(hitObj(o, 111, 30)).toBe(false);
  });

  it('un texto entra en el hit-test de la página', () => {
    const doc = newDoc('m4');
    const page = activePage(doc);
    const o = textObj({ x: 0, y: 0, w: 50, h: 30 });
    page.layers[0].objects.push(o);
    expect(hitTest(page, 25, 15)?.id).toBe(o.id);
  });
});
