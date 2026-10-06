// PNG con fuente embebida (el truco .fw.png de Fireworks): un chunk tEXt con
// keyword 'pyra' y la fuente en base64 (UTF-8) para que sea ASCII-safe en tEXt.
// ponytail: CRC32 propio (tabla estándar); upgrade: pako/fflate si algún día comprimimos.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  const CHUNK = 8192; // String.fromCharCode(...) con arrays grandes desborda la pila
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(out);
}

/** Inserta el chunk tEXt justo tras IHDR (orden válido según la spec PNG). */
export function pngInsertText(dataUrl: string, keyword: string, text: string): string {
  const bytes = base64ToBytes(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const payload = new TextEncoder().encode(`${keyword}\0${btoa(text)}`);
  const chunk = new Uint8Array(12 + payload.length);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, payload.length);
  chunk.set(new TextEncoder().encode('tEXt'), 4);
  chunk.set(payload, 8);
  dv.setUint32(8 + payload.length, crc32(chunk.subarray(4, 8 + payload.length)));
  const srcDv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ihdrEnd = 8 + 4 + 4 + srcDv.getUint32(8) + 4; // firma + (longitud+tipo+datos+CRC) de IHDR
  const out = new Uint8Array(bytes.length + chunk.length);
  out.set(bytes.subarray(0, ihdrEnd), 0);
  out.set(chunk, ihdrEnd);
  out.set(bytes.subarray(ihdrEnd), ihdrEnd + chunk.length);
  return `data:image/png;base64,${bytesToBase64(out)}`;
}

/** Devuelve el texto del chunk tEXt con esa keyword, o null si no lo hay. */
export function pngFindText(bytes: Uint8Array, keyword: string): string | null {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!sig.every((b, i) => bytes[i] === b)) return null;
  let p = 8;
  while (p + 8 <= bytes.length) {
    const len = dv.getUint32(p);
    const type = new TextDecoder().decode(bytes.subarray(p + 4, p + 8));
    if (type === 'tEXt') {
      const data = new TextDecoder('latin1').decode(bytes.subarray(p + 8, p + 8 + len));
      const nul = data.indexOf('\0');
      if (nul >= 0 && data.slice(0, nul) === keyword) {
        try {
          return atob(data.slice(nul + 1));
        } catch {
          return null;
        }
      }
    }
    if (type === 'IEND') break;
    p += 12 + len;
  }
  return null;
}
