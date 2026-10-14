// Unidades e impresión: el modelo es px; las unidades sólo formatean y el PNG
// exportado debe llevar su tamaño de impresión (chunk pHYs) con CRC válido.
import { describe, expect, it } from 'vitest';
import { docDpi, newDoc, unitFactor } from '../src/model';
import { crc32, pngInsertPhys } from '../src/png';

describe('unidades del documento', () => {
  it('por defecto: px y 72 dpi', () => {
    const doc = newDoc();
    expect(docDpi(doc)).toBe(72);
    expect(unitFactor(doc)).toBe(1);
  });

  it('in/cm/mm se derivan del dpi del documento', () => {
    const doc = newDoc();
    doc.dpi = 300;
    doc.unit = 'in';
    expect(unitFactor(doc)).toBe(300);
    doc.unit = 'mm';
    expect(unitFactor(doc)).toBeCloseTo(300 / 25.4, 10);
    doc.unit = 'cm';
    expect(unitFactor(doc)).toBeCloseTo(300 / 2.54, 10);
  });
});

describe('pngInsertPhys', () => {
  const enc = new TextEncoder();
  const chunk = (type: string, data: Uint8Array): Uint8Array => {
    const out = new Uint8Array(12 + data.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    out.set(enc.encode(type), 4);
    out.set(data, 8);
    dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  };
  const fakePng = (): Uint8Array => {
    const ihdr = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]); // 1x1 RGB
    const parts = [[137, 80, 78, 71, 13, 10, 26, 10], chunk('IHDR', ihdr), chunk('IEND', new Uint8Array(0))];
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let at = 0;
    for (const p of parts) { out.set(p, at); at += p.length; }
    return out;
  };
  const walk = (bytes: Uint8Array): { type: string; data: Uint8Array; crcOk: boolean }[] => {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const out: { type: string; data: Uint8Array; crcOk: boolean }[] = [];
    let p = 8;
    while (p + 8 <= bytes.length) {
      const len = dv.getUint32(p);
      const type = new TextDecoder().decode(bytes.subarray(p + 4, p + 8));
      const data = bytes.subarray(p + 8, p + 8 + len);
      out.push({ type, data, crcOk: dv.getUint32(p + 8 + len) === crc32(bytes.subarray(p + 4, p + 8 + len)) });
      if (type === 'IEND') break;
      p += 12 + len;
    }
    return out;
  };

  it('crc32 coincide con zlib: el CRC del tipo IEND es 0xAE426082', () => {
    expect(crc32(enc.encode('IEND'))).toBe(0xae426082);
  });

  it('inserta pHYs tras IHDR con dpi en píxeles/metro y CRC válido', () => {
    const src = fakePng();
    const out = pngInsertPhys(src, 300);
    expect(out.length).toBe(src.length + 21);
    const chunks = walk(out);
    expect(chunks.map((c) => c.type)).toEqual(['IHDR', 'pHYs', 'IEND']);
    const phys = chunks[1];
    expect(phys.crcOk).toBe(true);
    const dv = new DataView(phys.data.buffer, phys.data.byteOffset, phys.data.byteLength);
    expect(dv.getUint32(0)).toBe(11811); // 300 dpi → 11811 px/m
    expect(dv.getUint32(4)).toBe(11811);
    expect(phys.data[8]).toBe(1); // unidad = metro
    // CRC del chunk completo (tipo+datos) verificado de forma independiente con zlib
    const physAt = chunks[1].data.byteOffset - 4; // inicio del tipo pHYs
    const dvOut = new DataView(out.buffer, out.byteOffset, out.byteLength);
    expect(dvOut.getUint32(physAt + 13)).toBe(0x78a53f76);
    for (const c of chunks) expect(c.crcOk).toBe(true);
  });
});
