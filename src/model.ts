// Scene graph: Document → Page → Layer → objects.
// ponytail: M0 solo tiene Rect; el union Obj crece en M2 (vector), M3 (bitmap), M4 (texto).

export interface RectObj {
  id: string;
  type: 'rect';
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke: string | null;
  strokeWidth: number;
}

export type Obj = RectObj;

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
  pages: Page[];
}

export const uid = (): string => crypto.randomUUID();

export function newDoc(name = 'Sin título'): Doc {
  return {
    version: 1,
    name,
    pages: [
      {
        id: uid(),
        name: 'Página 1',
        width: 1280,
        height: 800,
        layers: [
          { id: uid(), name: 'Capa 1', visible: true, locked: false, opacity: 1, objects: [] },
        ],
      },
    ],
  };
}

// ponytail: página única en M0; la navegación multi-página es M1.
export const activePage = (doc: Doc): Page => doc.pages[0];
