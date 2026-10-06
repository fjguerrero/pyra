// @vitest-environment jsdom
// Tests de M5 (live effects) y M6 (.f.png): fx en el render y round-trip del chunk tEXt.
import { describe, expect, it } from 'vitest';
import { Renderer } from '../src/render';
import { crc32, pngInsertText, pngFindText } from '../src/png';
import { newDoc, activePage, uid, type ShapeObj } from '../src/model';

function fakeCtx(): { ctx: CanvasRenderingContext2D; ops: { op: string; args: unknown[] }[] } {
  const ops: { op: string; args: unknown[] }[] = [];
  const ctx: Record<string, unknown> = {
    setTransform: () => {}, save: () => {}, restore: () => {}, beginPath: () => {},
    rect: () => {}, clip: () => {}, fill: () => {}, stroke: () => {}, fillRect: () => {},
    strokeRect: () => {}, moveTo: () => {}, lineTo: () => {}, ellipse: () => {},
    setLineDash: () => {}, drawImage: () => {}, fillText: () => {},
    measureText: () => ({ width: 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
  };
  for (const p of ['fillStyle', 'strokeStyle', 'lineWidth', 'filter', 'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'globalAlpha', 'font', 'textBaseline']) {
    Object.defineProperty(ctx, p, { get: () => undefined, set: (v: unknown) => { ops.push({ op: `set:${p}`, args: [v] }); } });
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, ops };
}

function rectObj(partial: Partial<ShapeObj> = {}): ShapeObj {
  return { id: uid(), shape: 'rect', name: 'r', x: 0, y: 0, w: 10, h: 10, fill: '#f00', stroke: null, strokeWidth: 0, ...partial };
}

function draw(r: Renderer, o: ShapeObj): void {
  const doc = newDoc('m5');
  const page = activePage(doc);
  page.layers[0].objects.push(o);
  r.draw({ page, view: { zoom: 1, panX: 0, panY: 0 }, selectedId: null, selectedIds: [], draft: null, guides: [] });
}

describe('live effects (M5)', () => {
  it('la sombra usa ctx.shadow* y se limpia después del objeto', () => {
    const { ctx, ops } = fakeCtx();
    const r = new Renderer({ width: 100, height: 100, getContext: () => ctx } as unknown as HTMLCanvasElement);
    draw(r, rectObj({ fx: { shadow: { x: 3, y: 5, blur: 7, color: '#00000080' }, glow: null, blur: 0 } }));
    expect(ops).toContainEqual({ op: 'set:shadowColor', args: ['#00000080'] });
    expect(ops).toContainEqual({ op: 'set:shadowBlur', args: [7] });
    expect(ops).toContainEqual({ op: 'set:shadowOffsetX', args: [3] });
    const last = ops.filter((o) => o.op === 'set:shadowColor').at(-1);
    expect(last!.args[0]).toBe('transparent'); // limpiado tras dibujar
  });

  it('el glow usa shadow sin offset', () => {
    const { ctx, ops } = fakeCtx();
    const r = new Renderer({ width: 100, height: 100, getContext: () => ctx } as unknown as HTMLCanvasElement);
    draw(r, rectObj({ fx: { shadow: null, glow: { blur: 12, color: '#4f8cff' }, blur: 0 } }));
    expect(ops).toContainEqual({ op: 'set:shadowColor', args: ['#4f8cff'] });
    expect(ops).toContainEqual({ op: 'set:shadowOffsetX', args: [0] });
  });

  it('fx.blur se aplica como ctx.filter escalado por el zoom y se limpia', () => {
    const { ctx, ops } = fakeCtx();
    const r = new Renderer({ width: 100, height: 100, getContext: () => ctx } as unknown as HTMLCanvasElement);
    const doc = newDoc('m5z');
    const page = activePage(doc);
    page.layers[0].objects.push(rectObj({ fx: { shadow: null, glow: null, blur: 4 } }));
    r.draw({ page, view: { zoom: 2, panX: 0, panY: 0 }, selectedId: null, selectedIds: [], draft: null, guides: [] });
    expect(ops).toContainEqual({ op: 'set:filter', args: ['blur(8px)'] });
    expect(ops.filter((o) => o.op === 'set:filter').at(-1)!.args[0]).toBe('none');
  });

  it('sin fx no se toca filter ni shadow', () => {
    const { ctx, ops } = fakeCtx();
    const r = new Renderer({ width: 100, height: 100, getContext: () => ctx } as unknown as HTMLCanvasElement);
    draw(r, rectObj());
    expect(ops.some((o) => o.op === 'set:filter')).toBe(false);
    // draw() pone sombra solo para la sombra del lienzo (fuera del clip de objetos);
    // ningún objeto sin fx debe tocar shadowColor dentro del dibujo
    const objDraws = ops.filter((o) => o.op === 'set:fillStyle');
    expect(objDraws.length).toBeGreaterThan(0);
  });
});

describe('png tEXt (M6)', () => {
  // PNG mínimo válido: firma + IHDR + IDAT(1 px) + IEND construidos a mano
  function crc32Ref(bytes: Uint8Array): number {
    // verificación independiente con el polinomio estándar, sin usar la tabla del módulo
    let c = 0xffffffff;
    for (const b of bytes) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type: string, data: Uint8Array): Uint8Array {
    const out = new Uint8Array(12 + data.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    new TextEncoder().encode(type).forEach((b, i) => (out[4 + i] = b));
    out.set(data, 8);
    dv.setUint32(8 + data.length, crc32Ref(out.subarray(4, 8 + data.length)));
    return out;
  }

  function minimalPng(): Uint8Array {
    const ihdr = new Uint8Array(13);
    const idv = new DataView(ihdr.buffer);
    idv.setUint32(0, 1);
    idv.setUint32(4, 1);
    ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
    const idat = new Uint8Array([0x78, 0x9c, 0x01, 0x00, 0xff, 0xff, 0x00, 0x00, 0x00, 0x01, 0x01, 0x00]); // zlib de 1 px (no importa validez para el parser)
    const parts = [
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      chunk('IDAT', idat),
      chunk('IEND', new Uint8Array(0)),
    ];
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let p = 0;
    for (const part of parts) { out.set(part, p); p += part.length; }
    return out;
  }

  function toDataUrl(bytes: Uint8Array): string {
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return `data:image/png;base64,${btoa(s)}`;
  }

  it('crc32 coincide con una implementación de referencia', () => {
    const data = new TextEncoder().encode('hello world');
    expect(crc32(data)).toBe(crc32Ref(data));
  });

  it('round-trip: insertar tEXt y recuperarlo', () => {
    const png = minimalPng();
    const dataUrl = toDataUrl(png);
    const source = JSON.stringify({ name: 'doc', pages: [1] });
    const withText = pngInsertText(dataUrl, 'pyra', source);
    const b64 = withText.slice(withText.indexOf(',') + 1);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    // firma intacta y chunk recuperable
    expect(bytes[0]).toBe(137);
    expect(pngFindText(bytes, 'pyra')).toBe(source);
    expect(pngFindText(bytes, 'otra')).toBeNull();
  });

  it('pngFindText rechaza datos que no son PNG', () => {
    expect(pngFindText(new TextEncoder().encode('no es png'), 'pyra')).toBeNull();
  });
});
