// Motor de pinceles vectoriales (estilo Sketchbook): captura con estabilizador,
// modelo de ancho (presión real / velocidad), afinado de extremos (taper) y
// generación del contorno (quads + círculos) para un relleno de alfa uniforme.
// Módulo puro: sin DOM, testeable en node. El render lo reproduce con llamadas
// beginPath/moveTo/lineTo/arc + fill('nonzero' implícito).

import { catmullAt } from './freehand';

export type BrushPreset = 'pencil' | 'pen' | 'marker' | 'brush';

export interface BrushParams {
  size: number; // diámetro en px de mundo a presión completa
  minFactor: number; // fracción del ancho a presión cero
  pressureExp: number; // curva de respuesta a la presión (1 = lineal)
  opacity: number; // 0..1
  stabilize: number; // 0..0.9 fuerza del estabilizador (lag)
  taper: number; // 0..1 afinado de extremos
  velocityDynamics: boolean; // ratón: el ancho baja con la velocidad (taper natural)
}

/** Presets al estilo Sketchbook: cada uno define su carácter de trazo. */
export const BRUSH_PRESETS: Record<BrushPreset, BrushParams> = {
  pencil: { size: 3,  minFactor: 0.7,  pressureExp: 1,   opacity: 0.9,  stabilize: 0.2,  taper: 0.15, velocityDynamics: false },
  pen:    { size: 4,  minFactor: 0.08, pressureExp: 0.8, opacity: 1,    stabilize: 0.35, taper: 0.7,  velocityDynamics: false },
  marker: { size: 18, minFactor: 0.85, pressureExp: 1,   opacity: 0.45, stabilize: 0.2,  taper: 0,    velocityDynamics: false },
  brush:  { size: 10, minFactor: 0.15, pressureExp: 1,   opacity: 1,    stabilize: 0.45, taper: 0.85, velocityDynamics: true },
};

export const PRESET_ORDER: BrushPreset[] = ['pencil', 'pen', 'marker', 'brush'];

export type WPt = { x: number; y: number; w: number };

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

/** Ancho del trazo para una entrada: presión real solo con lápiz digital;
 * el ratón usa 1 (uniforme) o la velocidad si el preset tiene dinámica. */
export function widthAt(p: BrushParams, pressure: number, pointerType: string, speedWorldPxS: number): number {
  let f = 1;
  if (pointerType === 'pen') f = Math.pow(clamp(pressure, 0, 1), p.pressureExp);
  else if (p.velocityDynamics) f = clamp(1 - speedWorldPxS / 1500, 0.3, 1);
  return p.size * (p.minFactor + (1 - p.minFactor) * f);
}

/** Captura de un trazo: doble EMA (menos lag que una media móvil simple para
 * la misma suavidad) + rejilla de distancia mínima + ancho por punto. */
export class StrokeCapture {
  pts: WPt[] = [];
  private s1: { x: number; y: number } | null = null;
  private s2: { x: number; y: number } | null = null;
  private rawLast: { x: number; y: number } | null = null;
  private lastT = 0;
  private speed = 0; // px de mundo/s suavizado (EMA)

  constructor(private p: BrushParams, private minDist: number) {}

  feed(x: number, y: number, pressure: number, pointerType: string, tMs: number): void {
    if (this.rawLast) {
      const dt = Math.max(8, tMs - this.lastT) / 1000;
      const inst = Math.hypot(x - this.rawLast.x, y - this.rawLast.y) / dt;
      this.speed = this.speed * 0.7 + inst * 0.3;
    }
    this.rawLast = { x, y };
    this.lastT = tMs;

    const a = 1 - clamp(this.p.stabilize, 0, 0.9) * 0.95;
    if (!this.s1 || !this.s2) {
      this.s1 = { x, y };
      this.s2 = { x, y };
    } else {
      this.s1 = { x: this.s1.x + (x - this.s1.x) * a, y: this.s1.y + (y - this.s1.y) * a };
      this.s2 = { x: this.s2.x + (this.s1.x - this.s2.x) * a, y: this.s2.y + (this.s1.y - this.s2.y) * a };
    }

    const last = this.pts[this.pts.length - 1];
    if (last && Math.hypot(this.s2.x - last.x, this.s2.y - last.y) < this.minDist) return;
    this.pts.push({ x: this.s2.x, y: this.s2.y, w: widthAt(this.p, pressure, pointerType, this.speed) });
  }
}

/** Afinado de extremos: los primeros/últimos k puntos afinan el ancho hacia ~0.
 * `taper` escala la fuerza; 0 no toca nada. */
export function applyTaper(pts: WPt[], taper: number): WPt[] {
  if (taper <= 0 || pts.length < 3) return pts;
  const n = pts.length;
  const k = clamp(Math.round(n / 8), 2, 14);
  const out = pts.map((q) => ({ ...q }));
  for (let i = 0; i < n; i++) {
    let r = 1;
    if (i < k) r = i / k;
    else if (i >= n - k) r = (n - 1 - i) / k;
    if (r < 1) out[i].w *= 1 - taper + taper * Math.max(0.06, r);
  }
  return out;
}

export type OutlineOp =
  | { op: 'move' | 'line'; x: number; y: number }
  | { op: 'arc'; x: number; y: number; r: number };

/** Contorno del trazo variable: quads entre puntos consecutivos + círculo en
 * cada punto. Rellenados juntos (nonzero) dan una cinta con uniones redondas
 * y alfa uniforme — sin doble oscurecimiento en las juntas.
 * ponytail: quads con orientación consistente; un hairpin cerrado con ruido
 * podría girar un quad — el estabilizador + la rejilla de captura lo evitan. */
export function strokeOutline(P: WPt[]): OutlineOp[] {
  const out: OutlineOp[] = [];
  if (!P.length) return out;
  const nrm: { x: number; y: number }[] = [];
  let prev = { x: 0, y: 1 };
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)];
    const b = P[Math.min(P.length - 1, i + 1)];
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const len = Math.hypot(tx, ty);
    if (len < 1e-6) nrm.push(prev);
    else {
      prev = { x: -ty / len, y: tx / len };
      nrm.push(prev);
    }
  }
  for (let i = 0; i < P.length; i++) {
    const r = Math.max(0.05, P[i].w / 2);
    out.push({ op: 'arc', x: P[i].x, y: P[i].y, r });
    if (i + 1 < P.length) {
      const r2 = Math.max(0.05, P[i + 1].w / 2);
      const n1 = nrm[i];
      const n2 = nrm[i + 1];
      out.push(
        { op: 'move', x: P[i].x + n1.x * r, y: P[i].y + n1.y * r },
        { op: 'line', x: P[i + 1].x + n2.x * r2, y: P[i + 1].y + n2.y * r2 },
        { op: 'line', x: P[i + 1].x - n2.x * r2, y: P[i + 1].y - n2.y * r2 },
        { op: 'line', x: P[i].x - n1.x * r, y: P[i].y - n1.y * r },
      );
    }
  }
  return out;
}

/** Remuestrea la curva Catmull-Rom que pasa por los puntos con paso fijo,
 * interpolando el ancho: da la línea base densa y suave del modo suavizado. */
export function resampleSmooth(P: WPt[], step = 2): WPt[] {
  if (P.length < 3) return P.map((q) => ({ ...q }));
  const out: WPt[] = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[Math.min(P.length - 1, i + 2)];
    const seg = Math.max(1, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / step));
    for (let k = 0; k < seg; k++) {
      const t = k / seg;
      const q = catmullAt(p0, p1, p2, p3, t);
      out.push({ x: q.x, y: q.y, w: p1.w + (p2.w - p1.w) * t });
    }
  }
  out.push({ ...P[P.length - 1] });
  return out;
}

/** Puntos intermedios entre dos posiciones a paso fijo: la goma pinta surcos
 * continuos aunque el puntero salte entre frames (sin huecos). */
export function interpolateStamps(from: { x: number; y: number }, to: { x: number; y: number }, step: number): { x: number; y: number }[] {
  const d = Math.hypot(to.x - from.x, to.y - from.y);
  if (d < 1e-9) return [to];
  const n = Math.max(1, Math.ceil(d / Math.max(0.5, step)));
  const out: { x: number; y: number }[] = [];
  for (let i = 1; i <= n; i++) out.push({ x: from.x + (to.x - from.x) * i / n, y: from.y + (to.y - from.y) * i / n });
  return out;
}

/** Trazo de muestra (senoide) con el ancho/afinado de un preset: para la
 * vista previa en vivo del panel de opciones. */
export function demoStroke(width: number, height: number, p: BrushParams): WPt[] {
  const pts: WPt[] = [];
  const n = 48;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = width * (0.06 + 0.88 * t);
    const y = height / 2 + Math.sin(t * Math.PI * 2) * height * 0.3;
    const fakeP = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 - Math.PI / 2); // 0→1→0
    pts.push({ x, y, w: widthAt(p, fakeP, 'pen', 0) });
  }
  return applyTaper(pts, p.taper);
}
