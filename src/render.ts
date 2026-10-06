import type { Obj, Page, ShapeKind } from './model';
import type { View } from './view';
import type { Guide } from './guides';
import { findObj, handles } from './hit';

export interface Draft {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: ShapeKind;
}

export interface Scene {
  page: Page;
  view: View;
  selectedId: string | null;
  selectedIds: string[];
  draft: Draft | null;
  guides: Guide[];
}

const WORKSPACE = '#0e1013';
const PAGE_BG = '#ffffff';
const ACCENT = '#4f8cff';

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d no disponible');
    this.ctx = ctx;
  }

  resize(cssW: number, cssH: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(cssW * dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * dpr));
  }

  draw(scene: Scene): void {
    // ponytail: redraw completo por cambio, agrupado con rAF. Dirty-rects +
    // caché offscreen por capa en M1, cuando los documentos crezcan.
    const { ctx, canvas } = this;
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;
    const v = scene.view;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = WORKSPACE;
    ctx.fillRect(0, 0, cw, ch);

    const px = v.panX;
    const py = v.panY;
    const pw = scene.page.width * v.zoom;
    const ph = scene.page.height * v.zoom;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 24;
    ctx.fillStyle = PAGE_BG;
    ctx.fillRect(px, py, pw, ph);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();

    for (const layer of scene.page.layers) {
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;
      for (const o of layer.objects) this.drawObj(o, v);
    }
    ctx.globalAlpha = 1;

    if (scene.draft) {
      ctx.strokeStyle = ACCENT;
      ctx.setLineDash([4, 3]);
      this.path(scene.draft, v);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // smart guides: líneas de imán sobre la página
    if (scene.guides.length) {
      ctx.strokeStyle = '#ff5fa2';
      ctx.lineWidth = 1;
      for (const g of scene.guides) {
        ctx.beginPath();
        if (g.axis === 'v') {
          const sx = g.pos * v.zoom + v.panX;
          ctx.moveTo(sx, py);
          ctx.lineTo(sx, py + ph);
        } else {
          const sy = g.pos * v.zoom + v.panY;
          ctx.moveTo(px, sy);
          ctx.lineTo(px + pw, sy);
        }
        ctx.stroke();
      }
    }
    ctx.restore();

    const sel = findObj(scene.page, scene.selectedId);
    if (sel) {
      const x = sel.x * v.zoom + v.panX;
      const y = sel.y * v.zoom + v.panY;
      const w = sel.w * v.zoom;
      const h = sel.h * v.zoom;
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
      for (const hd of handles(sel, v)) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hd.x - 3.5, hd.y - 3.5, 7, 7);
        ctx.strokeRect(hd.x - 3.5, hd.y - 3.5, 7, 7);
      }
    }
    // selección múltiple: contorno fino sin asas
    for (const id of scene.selectedIds) {
      if (id === scene.selectedId) continue;
      const o = findObj(scene.page, id);
      if (!o) continue;
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 1;
      ctx.strokeRect(o.x * v.zoom + v.panX - 0.5, o.y * v.zoom + v.panY - 0.5, o.w * v.zoom + 1, o.h * v.zoom + 1);
    }
  }

  private path(o: { x: number; y: number; w: number; h: number; shape: ShapeKind }, v: View): void {
    const ctx = this.ctx;
    const x = o.x * v.zoom + v.panX;
    const y = o.y * v.zoom + v.panY;
    const w = o.w * v.zoom;
    const h = o.h * v.zoom;
    ctx.beginPath();
    if (o.shape === 'ellipse') {
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else if (o.shape === 'line') {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  private drawObj(o: Obj, v: View): void {
    const ctx = this.ctx;
    this.path(o, v);
    if (o.fill) {
      ctx.fillStyle = o.fill;
      ctx.fill();
    }
    if (o.stroke && o.strokeWidth > 0) {
      ctx.strokeStyle = o.stroke;
      ctx.lineWidth = o.strokeWidth * v.zoom;
      ctx.stroke();
    }
  }
}
