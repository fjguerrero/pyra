// M6: exportar/importar .f.png — un PNG normal con la fuente Pyra embebida
// (chunk tEXt 'pyra'), como el .fw.png de Fireworks: se ve en cualquier visor
// y Pyra puede reimportarlo y seguir editándolo.
import { activePage, type Doc } from './model';
import { Renderer } from './render';
import { pngFindText, pngInsertText } from './png';

export const FX_KEYWORD = 'pyra';

export async function exportFpng(doc: Doc, renderer: Renderer): Promise<Blob> {
  const page = activePage(doc);
  const canvas = await renderer.exportPage(page);
  const dataUrl = canvas.toDataURL('image/png');
  const withSource = pngInsertText(dataUrl, FX_KEYWORD, JSON.stringify(doc));
  const b64 = withSource.slice(withSource.indexOf(',') + 1);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

export async function importFpng(file: File): Promise<Doc | null> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const src = pngFindText(bytes, FX_KEYWORD);
  if (!src) return null;
  try {
    const doc = JSON.parse(atob(src)) as Doc;
    if (!Array.isArray(doc.pages) || doc.pages.length === 0) return null;
    return doc;
  } catch {
    return null;
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
