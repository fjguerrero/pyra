// Scene graph: Document → Page → Layer → objects.
// ponytail: M3 (bitmap) y M4 (texto) ampliarán el union; todo lo que consume objetos
// (hit, asas, resize, align, guías) trabaja solo sobre el bbox x/y/w/h.

export type ShapeKind = 'rect' | 'ellipse' | 'line';

export interface ShapeObj {
  id: string;
  shape: ShapeKind;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke: string | null;
  strokeWidth: number;
}

/** Bitmap: la imagen se guarda embebida (data URL); crop son píxeles de la fuente original. */
export interface BitmapObj {
  id: string;
  shape: 'bitmap';
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
  crop: { x: number; y: number; w: number; h: number } | null;
  blur: number; // px de desenfoque, 0 = ninguno
  sat: number; // 1 = original
  bri: number; // 1 = original
}

export type Obj = ShapeObj | BitmapObj;

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  objects: Obj[];
}

export interface Page {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: Layer[];
}

export interface Doc {
  version: 1;
  name: string;
  activePageId: string;
  pages: Page[];
}

export const uid = (): string => crypto.randomUUID();

export function newDoc(name = 'Sin título'): Doc {
  const page: Page = {
    id: uid(),
    name: 'Página 1',
    width: 1280,
    height: 800,
    layers: [{ id: uid(), name: 'Capa 1', visible: true, locked: false, opacity: 1, objects: [] }],
  };
  return { version: 1, name, activePageId: page.id, pages: [page] };
}

/** La página activa; si la referencia no existe, la primera (nunca undefined). */
export function activePage(doc: Doc): Page {
  return doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];
}
