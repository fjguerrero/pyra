import { flattenLayers } from './layers';
import type { Fx, Obj, Page, ShapeKind } from './model';
import type { View } from './view';
import type { Guide } from './guides';
import { findObj, handles } from './hit';
import { drawTextObj } from './text';
import { gradientFill } from './gradient';
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
  /** Rectángulo de selección por marco (marquee) en coords de mundo. */
  marquee?: { x: number; y: number; w: number; h: number } | null;
  guides: Guide[];
  /** Fondo del área de trabajo: color sólido y/o rejilla de cuadrados. */
  workspace?: { color?: string; grid?: number };
}

const WORKSPACE = '#0e1013';
const PAGE_BG = '#ffffff';
const ACCENT = '#4f8cff';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private imgs = new Map<string, { el: HTMLImageElement; ready: boolean }>();

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d no disponible');
    this.ctx = ctx;
  }

  /** Caché de imágenes decodificadas; `onReady` pide redraw cuando llegan. */
  private img(src: string): { el: HTMLImageElement; ready: boolean } | null {
    let e = this.imgs.get(src);
    if (!e) {
      const el = new Image();
      e = { el, ready: false };
      this.imgs.set(src, e);
      el.onload = () => {
        e!.ready = true;
        this.onImgReady?.();
      };
      el.src = src;
    }
    return e;
  }

  onImgReady: (() => void) | null = null;

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
    const ws = scene.workspace;
    ctx.fillStyle = ws?.color || WORKSPACE;
    ctx.fillRect(0, 0, cw, ch);
    if (ws?.grid) {
      // rejilla de cuadrados sobre el fondo
      const g = ws.grid;
      ctx.fillStyle = 'rgba(128,128,128,0.18)';
      for (let y = 0; y < ch; y += g * 2)
        for (let x = 0; x < cw; x += g * 2) ctx.fillRect(x, y, g, g);
    }

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

    for (const layer of flattenLayers(scene.page.layers)) {
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;
      for (const o of layer.objects) this.drawObj(o, v);
    }
    ctx.globalAlpha = 1;

    // guías manuales de la página
    if (scene.page.guides?.length) {
      ctx.strokeStyle = '#00b0ff';
      ctx.lineWidth = 1;
      for (const g of scene.page.guides) {
        ctx.beginPath();
        if (g.axis === 'v') {
          const x = g.pos * v.zoom + v.panX;
          ctx.moveTo(x, v.panY);
          ctx.lineTo(x, v.panY + scene.page.height * v.zoom);
        } else {
          const y = g.pos * v.zoom + v.panY;
          ctx.moveTo(v.panX, y);
          ctx.lineTo(v.panX + scene.page.width * v.zoom, y);
        }
        ctx.stroke();
      }
    }

    if (scene.draft) {
      ctx.strokeStyle = ACCENT;
      ctx.setLineDash([4, 3]);
      this.path(scene.draft, v);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (scene.marquee) {
      const m = scene.marquee;
      ctx.strokeStyle = ACCENT;
      ctx.fillStyle = 'rgba(79,140,255,0.08)';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.rect(m.x * v.zoom + v.panX, m.y * v.zoom + v.panY, m.w * v.zoom, m.h * v.zoom);
      ctx.fill();
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
      const srot = sel.rot ?? 0;
      if (srot) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate((srot * Math.PI) / 180);
        ctx.translate(-(x + w / 2), -(y + h / 2));
      }
      ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
      if (srot) ctx.restore();
      for (const hd of handles(sel, v)) {
        if (hd.role === 'rot') {
          // línea del centro a la manija + círculo
          const cx = x + w / 2;
          ctx.beginPath();
          ctx.moveTo(cx, y);
          ctx.lineTo(hd.x, hd.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(hd.x, hd.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.stroke();
          continue;
        }
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

  /** Render plano de la página a un canvas aparte (para exportar PNG). */
  async exportPage(page: Page): Promise<HTMLCanvasElement> {
    const off = document.createElement('canvas');
    off.width = page.width;
    off.height = page.height;
    const saved = this.ctx;
    const c2 = off.getContext('2d');
    if (!c2) throw new Error('canvas 2d no disponible');
    this.ctx = c2;
    try {
      c2.fillStyle = PAGE_BG;
      c2.fillRect(0, 0, page.width, page.height);
      c2.save();
      c2.beginPath();
      c2.rect(0, 0, page.width, page.height);
      c2.clip();
      for (const layer of flattenLayers(page.layers)) {
        if (!layer.visible) continue;
        c2.globalAlpha = layer.opacity;
        for (const o of layer.objects) this.drawObj(o, { zoom: 1, panX: 0, panY: 0 });
      }
      c2.globalAlpha = 1;
      c2.restore();
      await new Promise<void>((res) => {
        // deja decodificar los bitmaps antes de devolver
        if ([...this.imgs.values()].every((i) => i.ready)) return res();
        const prev = this.onImgReady;
        this.onImgReady = () => {
          if ([...this.imgs.values()].every((i) => i.ready)) {
            this.onImgReady = prev;
            res();
          }
        };
      });
    } finally {
      this.ctx = saved;
    }
    return off;
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

  private applyFx(fx: Fx | undefined, zoom: number): string | null {
    // devuelve el filtro CSS a limpiar después; sombra/glow van por ctx.shadow*
    const ctx = this.ctx;
    const filters: string[] = [];
    if (fx?.blur) filters.push(`blur(${fx.blur * zoom}px)`);
    if (fx?.shadow) {
      ctx.shadowColor = fx.shadow.color;
      ctx.shadowBlur = fx.shadow.blur * zoom;
      ctx.shadowOffsetX = fx.shadow.x * zoom;
      ctx.shadowOffsetY = fx.shadow.y * zoom;
    }
    if (fx?.glow) {
      ctx.shadowColor = fx.glow.color;
      ctx.shadowBlur = fx.glow.blur * zoom;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
    if (filters.length) ctx.filter = filters.join(' ');
    return filters.length ? 'filters' : fx?.shadow || fx?.glow ? 'shadow' : null;
  }

  private clearFx(what: string | null): void {
    const ctx = this.ctx;
    if (what === 'filters') ctx.filter = 'none';
    if (what === 'shadow' || what === 'filters') {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
  }

  private drawObj(o: Obj, v: View): void {
    const rot = o.rot ?? 0;
    if (!rot) return this.drawObjRaw(o, v);
    // rotación visual alrededor del centro del bbox
    const ctx = this.ctx;
    const cx = (o.x + o.w / 2) * v.zoom + v.panX;
    const cy = (o.y + o.h / 2) * v.zoom + v.panY;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.translate(-cx, -cy);
    this.drawObjRaw(o, v);
    ctx.restore();
  }

  private drawObjRaw(o: Obj, v: View): void {
    const ctx = this.ctx;
    if (o.shape === 'bitmap') {
      const im = this.img(o.src);
      if (!im || !im.ready) return;
      const c = o.crop ?? { x: 0, y: 0, w: im.el.naturalWidth, h: im.el.naturalHeight };
      const filters = [];
      if (o.sat !== 1) filters.push(`saturate(${o.sat})`);
      if (o.bri !== 1) filters.push(`brightness(${o.bri})`);
      if (o.fx?.blur) filters.push(`blur(${o.fx.blur * v.zoom}px)`);
      if (filters.length) ctx.filter = filters.join(' ');
      const shadow = o.fx?.shadow ?? o.fx?.glow;
      if (shadow) {
        const s = shadow as { x?: number; y?: number; blur: number; color: string };
        ctx.shadowColor = s.color;
        ctx.shadowBlur = s.blur * v.zoom;
        ctx.shadowOffsetX = (s.x ?? 0) * v.zoom;
        ctx.shadowOffsetY = (s.y ?? 0) * v.zoom;
      }
      ctx.drawImage(im.el, c.x, c.y, c.w, c.h, o.x * v.zoom + v.panX, o.y * v.zoom + v.panY, o.w * v.zoom, o.h * v.zoom);
      if (filters.length) ctx.filter = 'none';
      if (shadow) {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
      return;
    }
    const what = this.applyFx(o.fx, v.zoom);
    if (o.shape === 'text') {
      drawTextObj(ctx, o, v.zoom, v.panX, v.panY);
      this.clearFx(what);
      return;
    }
    this.path(o, v);
    if (o.fill) {
      ctx.fillStyle = o.gradient ? gradientFill(ctx, o, o.gradient, v.zoom, v.panX, v.panY) : o.fill;
      ctx.fill();
    }
    if (o.stroke && o.strokeWidth > 0) {
      ctx.strokeStyle = o.stroke;
      ctx.lineWidth = o.strokeWidth * v.zoom;
      ctx.stroke();
    }
    this.clearFx(what);
  }
}
