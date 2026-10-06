// Scene graph: Document → Page → Layer → objects.
// ponytail: M3 (bitmap) y M4 (texto) ampliarán el union; todo lo que consume objetos
// (hit, asas, resize, align, guías) trabaja solo sobre el bbox x/y/w/h.

export type ShapeKind = 'rect' | 'ellipse' | 'line';

export interface Fx {
  shadow: { x: number; y: number; blur: number; color: string } | null;
  glow: { blur: number; color: string } | null;
  blur: number; // px de desenfoque aplicado al dibujar, 0 = ninguno
}

/** Efectos en vivo no destructivos: válidos para cualquier objeto. */
export type WithFx = { fx?: Fx };

export const NO_FX: Fx = { shadow: null, glow: null, blur: 0 };

/** Relleno con degradado lineal: 0° = izquierda→derecha, 90° = arriba→abajo. */
export interface Gradient {
  from: string;
  to: string;
  angle: number;
}

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
  /** Relleno con degradado lineal; si está, sustituye a `fill` (que sigue guardando el color base). */
  gradient?: Gradient | null;
  fx?: Fx;
  /** Rotación en grados alrededor del centro del bbox. */
  rot?: number;
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
  sat: number; // 1 = original
  bri: number; // 1 = original
  fx?: Fx;
  rot?: number;
}

export type Obj = ShapeObj | BitmapObj | TextObj;

/** Texto: bbox medido desde el contenido; se edita como objeto normal. */
export interface TextObj {
  id: string;
  shape: 'text';
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  font: string; // CSS font-family
  size: number; // px
  fill: string;
  fx?: Fx;
  rot?: number;
}

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
  /** Estilos reutilizables (como los Styles de Fireworks): paquetes de aspecto aplicables a cualquier objeto. */
  styles?: Style[];
}

/** Paquete de aspecto: fill/stroke/degradado/efectos. Sin geometría: se aplica a lo que sea. */
export interface Style {
  id: string;
  name: string;
  fill: string;
  stroke: string | null;
  strokeWidth: number;
  gradient?: Gradient | null;
  fx?: Fx;
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
