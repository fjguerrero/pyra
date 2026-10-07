// Helpers de dibujo a mano libre: suavizado Catmull-Rom y simplificación RDP.
// Sin dependencias; usados por render (trazos suavizados), hit (polígonos curvos) y main (lápiz de polígonos).

type Pt = { x: number; y: number };

/** Muestreo cúbico de un segmento Catmull-Rom entre p1→p2 con vecinos p0,p3. */
function catmullSegment(p0: Pt, p1: Pt, p2: Pt, p3: Pt, samples: number): Pt[] {
  const out: Pt[] = [];
  for (let k = 1; k <= samples; k++) {
    const t = k / samples;
    const t2 = t * t, t3 = t2 * t;
    out.push({
      x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    });
  }
  return out;
}

/** Polilínea abierta suavizada (extremos fijos): puntos extra para dibujar/trazar. */
export function smoothPolyline(pts: Pt[], samples = 10): Pt[] {
  if (pts.length < 3) return [...pts];
  const out: Pt[] = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    out.push(...catmullSegment(p0, p1, p2, p3, samples));
  }
  return out;
}

/** Polígono cerrado suavizado (índices envolventes): puntos extra para dibujar/hit-test. */
export function smoothClosedPolygon(pts: Pt[], samples = 12): Pt[] {
  const n = pts.length;
  if (n < 3) return [...pts];
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    out.push(...catmullSegment(pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n], samples));
  }
  return out;
}

/** Simplificación Ramer–Douglas–Peucker: convierte un trazo libre en polígono de líneas rectas. */
export function rdpSimplify(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return [...pts];
  // punto más lejano de la recta first→last
  const a = pts[0], b = pts[pts.length - 1];
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  let worst = 0, wi = -1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = len === 0 ? Math.hypot(pts[i].x - a.x, pts[i].y - a.y)
      : Math.abs(dy * pts[i].x - dx * pts[i].y + b.x * a.y - b.y * a.x) / len;
    if (d > worst) { worst = d; wi = i; }
  }
  if (worst <= eps || wi < 0) return [a, b];
  const left = rdpSimplify(pts.slice(0, wi + 1), eps);
  const right = rdpSimplify(pts.slice(wi), eps);
  return [...left.slice(0, -1), ...right];
}
