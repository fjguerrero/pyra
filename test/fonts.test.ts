// @vitest-environment jsdom
// Fuentes personalizadas: normalización de familias CSS y carga de archivos.
import { describe, expect, it, vi } from 'vitest';
import { loadFontFile, normalizeFontFamily } from '../src/text';

describe('normalizeFontFamily', () => {
  it('deja intactas las familias tipo identificador y los generic keywords', () => {
    expect(normalizeFontFamily('Arial')).toBe('Arial');
    expect(normalizeFontFamily('Arial, Helvetica, sans-serif')).toBe('Arial, Helvetica, sans-serif');
  });
  it('entrecomilla los nombres con espacios', () => {
    expect(normalizeFontFamily('Courier New')).toBe("'Courier New'");
    expect(normalizeFontFamily('Garamond Premr Pro, Times New Roman')).toBe("'Garamond Premr Pro', 'Times New Roman'");
  });
  it('respeta las comillas ya puestas y descarta trozos vacíos', () => {
    expect(normalizeFontFamily('"Times New Roman", , Arial')).toBe('"Times New Roman", Arial');
  });
});

describe('loadFontFile', () => {
  it('registra la fuente y devuelve su familia CSS', async () => {
    const added: unknown[] = [];
    class FakeFace {
      constructor(public family: string, public src: unknown) {}
      load = vi.fn(async () => this);
    }
    vi.stubGlobal('FontFace', FakeFace);
    vi.stubGlobal('document', { ...document, fonts: { add: (f: unknown) => added.push(f) } });
    const file = new File([new Uint8Array([0, 1, 2])], 'Mi Fuente Loca.woff2');
    const css = await loadFontFile(file);
    expect(css).toBe("'Mi Fuente Loca'");
    expect(added).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});
