// Scene graph: Document → Page → Layer → objects.
// ponytail: M3 (bitmap) y M4 (texto) ampliarán el union; todo lo que consume objetos
// (hit, asas, resize, align, guías) trabaja solo sobre el bbox x/y/w/h.

export type ShapeKind = 'rect' | 'ellipse' | 'line' | 'stroke' | 'polygon';

/** Punta del pincel: 'round' = punta redonda, 'square' = punta cuadrada. */
export type BrushShape = 'round' | 'square';

/** Ajustes de la herramienta pincel (como las Options de los Paint Tools de Fireworks). */
export interface BrushSettings {
  size: number;
  pressure: number; // 0..1: grosor de la traza
  opacity: number; // 0..1
  shape: BrushShape;
  /** Imagen usada como punta (SVG o bitmap en data URL); null = punta vectorial. */
  tip: string | null;
}

/** Esquina del bbox donde empieza una línea: el arrastre puede ir en cualquier signo (↖↗↙↘). */
export type LineFrom = 'nw' | 'ne' | 'sw' | 'se';

export interface Fx {
  shadow: { x: number; y: number; blur: number; color: string } | null;
  glow: { blur: number; color: string } | null;
  blur: number; // px de desenfoque aplicado al dibujar, 0 = ninguno
  /** Bisel: grosor del relieve interior dibujado al rellenar, 0 = ninguno. */
  bevel?: number;
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
  /** Id de grupo: los objetos con el mismo id se seleccionan y mueven juntos (Ctrl+G). */
  group?: string;
  /** Pincel del trazo; undefined = redondo. */
  brush?: BrushShape;
  /** Traza del pincel: puntos normalizados 0..1 dentro del bbox, con su presión (1 = completo). */
  points?: { x: number; y: number; p: number }[];
  /** Imagen usada como punta del pincel (SVG o bitmap), estampada a lo largo de la traza. */
  tip?: string | null;
  /** Polígono (pen tool): vértices normalizados 0..1 dentro del bbox; se escala con el bbox. */
  poly?: { x: number; y: number }[];
  /** Trazo/lápiz suavizado o polígono con vértices curvos: se dibuja con Catmull-Rom. */
  smooth?: boolean;
  /** Guión del borde de un polígono (px de mundo); undefined = línea continua. */
  dash?: number[] | null;
  /** Opacidad del trazo (1 = opaco). */
  strokeOpacity?: number;
  /** Esquina de inicio del trazo de una línea; undefined = 'nw'. */
  lineFrom?: LineFrom;
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
  /** Id de grupo: los objetos con el mismo id se seleccionan y mueven juntos (Ctrl+G). */
  group?: string;
  /** Goma de borrar: círculos borrados en coordenadas normalizadas 0..1 del bbox. */
  erase?: { x: number; y: number; r: number }[];
}

export type Obj = ShapeObj | BitmapObj | TextObj;

/** Extremos reales de una línea según su bbox y su esquina de inicio. */
export function lineEnds(o: { x: number; y: number; w: number; h: number; lineFrom?: LineFrom }): {
  x1: number; y1: number; x2: number; y2: number;
} {
  const from = o.lineFrom ?? 'nw';
  const west = from === 'nw' || from === 'sw';
  const north = from === 'nw' || from === 'ne';
  return {
    x1: west ? o.x : o.x + o.w,
    y1: north ? o.y : o.y + o.h,
    x2: west ? o.x + o.w : o.x,
    y2: north ? o.y + o.h : o.y,
  };
}

/** Líneas y trazos de pincel: se pintan con trazo, no con relleno. */
export const isLineLike = (o: { shape: string }): boolean => o.shape === 'line' || o.shape === 'stroke';

/** Vértices de mundo de un polígono (pen tool). */
export const polyPoints = (o: { x: number; y: number; w: number; h: number; poly?: { x: number; y: number }[] }): { x: number; y: number }[] =>
  (o.poly ?? []).map((p) => ({ x: o.x + p.x * o.w, y: o.y + p.y * o.h }));

/** Hull convexo (Andrew's monotone chain): la unión aproximada de varias formas. */
export function convexHull(pts: { x: number; y: number }[]): { x: number; y: number }[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: { x: number; y: number }[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: { x: number; y: number }[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

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
  bold?: boolean;
  italic?: boolean;
  fill: string;
  fx?: Fx;
  rot?: number;
  /** Id de grupo: los objetos con el mismo id se seleccionan y mueven juntos (Ctrl+G). */
  group?: string;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  objects: Obj[];
  /** Capa padre (nesting). Ausente = raíz. */
  parent?: string;
}

/** Guía manual de página (arrastrable; Alt+clic la borra). */
export interface PageGuide {
  axis: 'v' | 'h';
  pos: number; // coordenada de mundo
}

export interface Page {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: Layer[];
  guides?: PageGuide[];
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
