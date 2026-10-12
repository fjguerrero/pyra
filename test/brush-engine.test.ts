// Tests del motor de pinceles vectoriales: pureza matemática sin DOM.
import { describe, expect, it } from 'vitest';
import {
  applyTaper, BRUSH_PRESETS, demoStroke, interpolateStamps, resampleSmooth,
  StrokeCapture, strokeOutline, widthAt,
} from '../src/brush-engine';

const P = { size: 10, minFactor: 0.5, pressureExp: 1, opacity: 1, stabilize: 0, taper: 0, velocityDynamics: false };

describe('widthAt: modelo de ancho', () => {
  it('ratón sin dinámica: ancho completo siempre', () => {
    expect(widthAt(P, 0, 'mouse', 9999)).toBe(10);
  });
  it('lápiz digital: presión 0 → minFactor, presión 1 → completo', () => {
    expect(widthAt(P, 0, 'pen', 0)).toBe(5);
    expect(widthAt(P, 1, 'pen', 0)).toBe(10);
    expect(widthAt(P, 0.5, 'pen', 0)).toBe(7.5);
  });
  it('presión de ratón (0.5 fake) no activa presión: solo el lápiz', () => {
    expect(widthAt(P, 0.5, 'mouse', 0)).toBe(10);
  });
  it('dinámica de velocidad: rápido afina, lento no', () => {
    const q = { ...P, velocityDynamics: true };
    expect(widthAt(q, 0, 'mouse', 0)).toBe(10);
    expect(widthAt(q, 0, 'mouse', 1500)).toBeLessThan(10);
  });
});

describe('StrokeCapture: rejilla y estabilizador', () => {
  it('respeta la distancia mínima entre puntos (rejilla)', () => {
    const c = new StrokeCapture(P, 5);
    for (let x = 0; x <= 100; x += 1) c.feed(x, 0, 1, 'mouse', x * 16);
    const d = c.pts.map((p, i) => (i ? Math.hypot(p.x - c.pts[i - 1].x, p.y - c.pts[i - 1].y) : 0));
    expect(Math.min(...d.slice(1))).toBeGreaterThanOrEqual(4.99);
    expect(c.pts.length).toBeLessThan(25); // 100px con paso 5 ≈ 21 puntos
  });
  it('el estabilizador suaviza un zigzag: los puntos salen menos desviados', () => {
    const raw = new StrokeCapture(P, 0);
    const smooth = new StrokeCapture({ ...P, stabilize: 0.8 }, 0);
    for (let x = 0; x <= 60; x += 2) {
      const y = x % 4 === 0 ? 10 : -10;
      raw.feed(x, y, 1, 'mouse', x * 16);
      smooth.feed(x, y, 1, 'mouse', x * 16);
    }
    const dev = (pts: { y: number }[]) => Math.max(...pts.slice(5).map((p) => Math.abs(p.y))); // sin los 5 primeros: el seed parte crudo
    expect(dev(smooth.pts)).toBeLessThan(dev(raw.pts));
  });
  it('primer punto siempre entra (un clic = un punto)', () => {
    const c = new StrokeCapture(P, 5);
    c.feed(10, 10, 1, 'mouse', 0);
    expect(c.pts.length).toBe(1);
  });
});

describe('applyTaper: afinado de extremos', () => {
  const pts = Array.from({ length: 21 }, (_, i) => ({ x: i * 10, y: 0, w: 10 }));
  it('afina primero y último hacia ~0 y deja el centro intacto', () => {
    const out = applyTaper(pts, 1);
    expect(out[0].w).toBeLessThan(1);
    expect(out[out.length - 1].w).toBeLessThan(1);
    expect(out[10].w).toBe(10);
  });
  it('taper 0 no toca nada', () => {
    expect(applyTaper(pts, 0).map((p) => p.w)).toEqual(pts.map(() => 10));
  });
  it('monótono creciente desde el extremo al centro', () => {
    const out = applyTaper(pts, 0.8);
    for (let i = 0; i < 10; i++) expect(out[i + 1].w).toBeGreaterThanOrEqual(out[i].w);
  });
});

describe('strokeOutline: contorno de alfa uniforme', () => {
  it('un círculo por punto + quads entre vecinos', () => {
    const P2 = [{ x: 0, y: 0, w: 4 }, { x: 10, y: 0, w: 4 }];
    const ops = strokeOutline(P2);
    expect(ops.filter((o) => o.op === 'arc')).toHaveLength(2);
    expect(ops.filter((o) => o.op === 'line')).toHaveLength(3); // un quad (la 4ª la cierra el fill)
    expect(ops.filter((o) => o.op === 'move')).toHaveLength(1); // el quad abre camino; los arcs lo traen en el render
  });
  it('punto único: solo su círculo (un punto = un punto de tinta)', () => {
    const ops = strokeOutline([{ x: 5, y: 5, w: 6 }]);
    expect(ops).toEqual([{ op: 'arc', x: 5, y: 5, r: 3 }]);
  });
  it('radios nunca menores que 0.05 (anchos mínimos no colapsan)', () => {
    const ops = strokeOutline([{ x: 0, y: 0, w: 0.0001 }]);
    expect((ops[0] as { r: number }).r).toBe(0.05);
  });
});

describe('resampleSmooth: curvas reales, no polilíneas', () => {
  it('pasa por los extremos y densifica una línea recta', () => {
    const P2 = [{ x: 0, y: 0, w: 4 }, { x: 50, y: 0, w: 4 }, { x: 100, y: 0, w: 4 }];
    const out = resampleSmooth(P2, 5);
    expect(out[0]).toEqual({ x: 0, y: 0, w: 4 });
    expect(out[out.length - 1]).toEqual({ x: 100, y: 0, w: 4 });
    expect(out.length).toBeGreaterThan(P2.length);
    for (const p of out) expect(Math.abs(p.y)).toBeLessThan(0.001);
  });
  it('interpola el ancho a lo largo de la curva', () => {
    const P2 = [{ x: 0, y: 0, w: 2 }, { x: 50, y: 0, w: 10 }, { x: 100, y: 0, w: 10 }];
    const out = resampleSmooth(P2, 5);
    expect(out.some((p) => p.w > 2.5 && p.w < 10)).toBe(true);
  });
});

describe('interpolateStamps: goma sin huecos', () => {
  it('ningún salto mayor que el paso entre stamps consecutivos', () => {
    const stamps = interpolateStamps({ x: 0, y: 0 }, { x: 100, y: 0 }, 4);
    const prev = [{ x: 0, y: 0 }, ...stamps];
    for (let i = 1; i < prev.length; i++) {
      expect(Math.hypot(prev[i].x - prev[i - 1].x, prev[i].y - prev[i - 1].y)).toBeLessThanOrEqual(4.001);
    }
    expect(stamps[stamps.length - 1]).toEqual({ x: 100, y: 0 });
  });
  it('mismo punto: un solo stamp (no inunda de tinta)', () => {
    expect(interpolateStamps({ x: 1, y: 1 }, { x: 1, y: 1 }, 4)).toEqual([{ x: 1, y: 1 }]);
  });
});

describe('presets y demo', () => {
  it('los 4 presets tienen parámetros sensatos', () => {
    for (const p of Object.values(BRUSH_PRESETS)) {
      expect(p.size).toBeGreaterThan(0);
      expect(p.minFactor).toBeGreaterThan(0);
      expect(p.minFactor).toBeLessThanOrEqual(1);
      expect(p.opacity).toBeGreaterThan(0);
      expect(p.stabilize).toBeGreaterThanOrEqual(0);
      expect(p.taper).toBeLessThanOrEqual(1);
    }
  });
  it('la demo de un preset con taper acaba afinada (la vista previa es honesta)', () => {
    const pts = demoStroke(240, 64, BRUSH_PRESETS.pen);
    expect(pts[0].w).toBeLessThan(BRUSH_PRESETS.pen.size);
    expect(pts[pts.length - 1].w).toBeLessThan(BRUSH_PRESETS.pen.size);
    expect(Math.max(...pts.map((p) => p.w))).toBeCloseTo(BRUSH_PRESETS.pen.size, 0);
  });
});
