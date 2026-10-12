// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { Renderer } from '../src/render';
import { fillGradient, gradientFill } from '../src/gradient';
import { activePage, newDoc, uid, type ShapeObj } from '../src/model';

const rect = (partial: Partial<ShapeObj> = {}): ShapeObj => ({
  id: uid(), shape: 'rect', name: 'r', x: 0, y: 0, w: 100, h: 50, fill: '#f00', stroke: null, strokeWidth: 0, ...partial,
});

describe('gradientFill', () => {
  it('crea un degradado lineal recortado al bbox (ángulo 0 = horizontal)', () => {
    const coords: number[] = [];
    const stops: [number, string][] = [];
    const ctx = {
      createLinearGradient: (x0: number, y0: number, x1: number, y1: number) => {
        coords.push(x0, y0, x1, y1);
        return { addColorStop: (o: number, c: string) => stops.push([o, c]) };
      },
    } as unknown as CanvasRenderingContext2D;
    const g = gradientFill(ctx, rect({ x: 10, y: 20, w: 100, h: 50 }), { from: '#000', to: '#fff', angle: 0 }, 1, 0, 0);
    expect(g).toBeTruthy();
    // horizontal sobre el centro del bbox: de x=10 a x=110, y=45
    expect(coords).toEqual([10, 45, 110, 45]);
    expect(stops).toEqual([[0, '#000'], [1, '#fff']]);
  });

  it('ángulo 90 = vertical', () => {
    const coords: number[] = [];
    const ctx = {
      createLinearGradient: (x0: number, y0: number, x1: number, y1: number) => {
        coords.push(x0, y0, x1, y1);
        return { addColorStop: () => {} };
      },
    } as unknown as CanvasRenderingContext2D;
    gradientFill(ctx, rect({ x: 0, y: 0, w: 100, h: 50 }), { from: '#000', to: '#fff', angle: 90 }, 1, 0, 0);
    coords.forEach((c, i) => expect(c).toBeCloseTo([50, 0, 50, 50][i], 6));
  });
});

describe('render con degradado', () => {
  it('usa createLinearGradient como fillStyle cuando hay gradient', () => {
    const ops: string[] = [];
    const grad = { addColorStop: () => {} };
    const ctx: Record<string, unknown> = {
      setTransform: () => {}, save: () => {}, restore: () => {}, beginPath: () => {},
      rect: () => {}, clip: () => {}, fill: () => ops.push('fill'), stroke: () => {}, fillRect: () => {},
      strokeRect: () => {}, moveTo: () => {}, lineTo: () => {}, ellipse: () => {}, setLineDash: () => {},
      createLinearGradient: () => { ops.push('gradient'); return grad; },
    };
    for (const p of ['fillStyle', 'strokeStyle', 'lineWidth', 'filter', 'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'globalAlpha']) {
      Object.defineProperty(ctx, p, { get: () => undefined, set: (v: unknown) => { if (p === 'fillStyle' && v === grad) ops.push('fillStyle=grad'); } });
    }
    const r = new Renderer({ width: 200, height: 200, getContext: () => ctx } as unknown as HTMLCanvasElement);
    const doc = newDoc('g');
    const page = activePage(doc);
    page.layers[0].objects.push(rect({ gradient: { from: '#000', to: '#fff', angle: 0 } }));
    r.draw({ page, view: { zoom: 1, panX: 0, panY: 0 }, selectedId: null, selectedIds: [], draft: null, guides: [] });
    expect(ops).toContain('gradient');
    expect(ops).toContain('fillStyle=grad');
  });
});

describe('fillGradient', () => {
  it('radial: crea un degradado radial unitario centrado y escala al bbox', () => {
    const ops: string[] = [];
    const stops: [number, string][] = [];
    const ctx = {
      save: () => ops.push('save'),
      restore: () => ops.push('restore'),
      translate: (x: number, y: number) => ops.push(`translate ${x} ${y}`),
      scale: (x: number, y: number) => ops.push(`scale ${x} ${y}`),
      fill: () => ops.push('fill'),
      createRadialGradient: (x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) => {
        ops.push(`radial ${x0} ${y0} ${r0} ${x1} ${y1} ${r1}`);
        return { addColorStop: (o: number, c: string) => stops.push([o, c]) };
      },
    } as unknown as CanvasRenderingContext2D;
    fillGradient(ctx, rect({ x: 10, y: 20, w: 100, h: 50 }), { from: '#000', to: '#fff', angle: 0, radial: true }, 1, 0, 0);
    expect(ops).toEqual([
      'save', 'translate 60 45', 'scale 100 50', 'radial 0 0 0 0 0 0.5', 'fill', 'restore',
    ]);
    expect(stops).toEqual([[0, '#000'], [1, '#fff']]);
  });

  it('lineal: rellena con el degradado lineal de siempre', () => {
    const ops: string[] = [];
    const ctx = {
      fill: () => ops.push('fill'),
      createLinearGradient: () => ({ addColorStop: () => {} }),
    } as unknown as CanvasRenderingContext2D;
    fillGradient(ctx, rect(), { from: '#000', to: '#fff', angle: 0 }, 1, 0, 0);
    expect(ops).toEqual(['fill']);
  });
});
