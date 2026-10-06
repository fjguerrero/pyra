import { activePage, newDoc, uid, type Doc, type RectObj } from './model';
import { History, type Command } from './history';
import { fitAll, screenToWorld, type View } from './view';
import { applyResize, findObj, hitHandle, hitTest, handles, type HandleRole } from './hit';
import { Renderer } from './render';
import { loadDoc, saveDoc } from './store';
import { renderPanels } from './panels';

const doc: Doc = (await loadDoc()) ?? newDoc();
const history = new History();
const view: View = { zoom: 1, panX: 0, panY: 0 };
let selectedId: string | null = null;
let tool: 'select' | 'rect' = 'select';
let draft: { x: number; y: number; w: number; h: number } | null = null;

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const wrap = document.getElementById('canvas-wrap')!;
const renderer = new Renderer(canvas);

let dirty = false;
function invalidate(): void {
  if (dirty) return;
  dirty = true;
  requestAnimationFrame(() => {
    dirty = false;
    renderer.draw({ page: activePage(doc), view, selectedId, draft });
    renderPanels(doc, selectedId, view, panelApi);
  });
}

let saveTimer = 0;
function persist(): void {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void saveDoc(doc), 400);
}

type Drag =
  | { mode: 'pan'; sx: number; sy: number; panX: number; panY: number }
  | { mode: 'create'; ox: number; oy: number }
  | { mode: 'move'; obj: RectObj; start: { x: number; y: number }; grab: { x: number; y: number }; moved: boolean }
  | { mode: 'resize'; obj: RectObj; role: HandleRole; start: { x: number; y: number; w: number; h: number }; grab: { x: number; y: number } };

let drag: Drag | null = null;

// Modelo de herramientas de Fireworks: la herramienta define qué hace el arrastre.
function setTool(t: 'select' | 'rect'): void {
  tool = t;
  document.querySelectorAll<HTMLElement>('#toolbar .tool[data-tool]').forEach((el) => {
    const on = el.dataset.tool === t;
    el.classList.toggle('active', on);
    el.setAttribute('aria-pressed', String(on));
  });
  canvas.style.cursor = t === 'rect' ? 'crosshair' : 'default';
}
document.querySelectorAll<HTMLElement>('#toolbar .tool[data-tool]').forEach((el) =>
  el.addEventListener('click', () => setTool(el.dataset.tool as 'select' | 'rect')),
);
document.querySelector<HTMLElement>('#toolbar .tool[data-fit]')?.addEventListener('click', () => {
  fitAll(view, activePage(doc), canvas.clientWidth, canvas.clientHeight);
  invalidate();
});

function localXY(e: { clientX: number; clientY: number }): { px: number; py: number; wx: number; wy: number } {
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const w = screenToWorld(view, px, py);
  return { px, py, wx: w.x, wy: w.y };
}

function resizeCanvas(): void {
  renderer.resize(wrap.clientWidth, wrap.clientHeight);
  invalidate();
}

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  const page = activePage(doc);

  if (e.button === 1 || e.altKey) {
    drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, panX: view.panX, panY: view.panY };
    return;
  }

  const { px, py, wx, wy } = localXY(e);

  if (tool === 'rect') {
    drag = { mode: 'create', ox: wx, oy: wy };
    draft = { x: wx, y: wy, w: 0, h: 0 };
    invalidate();
    return;
  }

  const sel = findObj(page, selectedId);
  const h = sel ? hitHandle(px, py, handles(sel, view)) : null;
  if (h && sel) {
    drag = {
      mode: 'resize',
      obj: sel as RectObj,
      role: h.role,
      start: { x: sel.x, y: sel.y, w: sel.w, h: sel.h },
      grab: { x: wx, y: wy },
    };
    return;
  }

  const hit = hitTest(page, wx, wy);
  if (hit) {
    selectedId = hit.id;
    drag = { mode: 'move', obj: hit as RectObj, start: { x: hit.x, y: hit.y }, grab: { x: wx, y: wy }, moved: false };
    invalidate();
    return;
  }

  selectedId = null;
  invalidate();
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;

  if (drag.mode === 'pan') {
    view.panX = drag.panX + (e.clientX - drag.sx);
    view.panY = drag.panY + (e.clientY - drag.sy);
    invalidate();
    return;
  }

  const { wx, wy } = localXY(e);

  if (drag.mode === 'create' && draft) {
    draft = {
      x: Math.min(drag.ox, wx),
      y: Math.min(drag.oy, wy),
      w: Math.abs(wx - drag.ox),
      h: Math.abs(wy - drag.oy),
    };
    invalidate();
    return;
  }

  if (drag.mode === 'move') {
    // posición absoluta desde el inicio del arrastre: sin deriva acumulada
    drag.obj.x = drag.start.x + (wx - drag.grab.x);
    drag.obj.y = drag.start.y + (wy - drag.grab.y);
    drag.moved = true;
    invalidate();
    return;
  }

  if (drag.mode === 'resize') {
    applyResize(drag.obj, drag.start, drag.role, wx - drag.grab.x, wy - drag.grab.y);
    invalidate();
  }
});

canvas.addEventListener('pointerup', () => {
  if (!drag) return;
  const page = activePage(doc);

  if (drag.mode === 'create' && draft) {
    const d = draft;
    draft = null;
    if (d.w > 2 && d.h > 2) {
      const layer = page.layers.find((l) => l.visible && !l.locked);
      if (layer) {
        const obj: RectObj = {
          id: uid(),
          type: 'rect',
          name: 'Rectángulo',
          x: Math.round(d.x),
          y: Math.round(d.y),
          w: Math.round(d.w),
          h: Math.round(d.h),
          fill: '#4f8cff',
          stroke: null,
          strokeWidth: 0,
        };
        const cmd: Command = {
          label: 'crear rect',
          do: () => layer.objects.push(obj),
          undo: () => {
            const i = layer.objects.indexOf(obj);
            if (i >= 0) layer.objects.splice(i, 1);
            if (selectedId === obj.id) selectedId = null;
          },
        };
        history.run(cmd);
        selectedId = obj.id;
        setTool('select'); // como Fireworks: tras dibujar, vuelve a la selección
        persist();
      }
    }
  } else if (drag.mode === 'move' && drag.moved) {
    const { obj, start } = drag;
    const end = { x: obj.x, y: obj.y };
    history.record({
      label: 'mover',
      do: () => Object.assign(obj, end),
      undo: () => Object.assign(obj, start),
    });
    persist();
  } else if (drag.mode === 'resize') {
    const { obj, start } = drag;
    const end = { x: obj.x, y: obj.y, w: obj.w, h: obj.h };
    history.record({
      label: 'redimensionar',
      do: () => Object.assign(obj, end),
      undo: () => Object.assign(obj, start),
    });
    persist();
  }

  drag = null;
  invalidate();
});

const panelApi = {
  editObj(obj: RectObj, patch: Partial<RectObj>): void {
    const before = { ...obj };
    history.run({
      label: 'editar',
      do: () => Object.assign(obj, patch),
      undo: () => Object.assign(obj, before),
    });
    persist();
    invalidate();
  },
};

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const { px, py } = localXY(e);
  const before = screenToWorld(view, px, py);
  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  view.zoom = Math.min(64, Math.max(0.02, view.zoom * factor));
  const after = screenToWorld(view, px, py);
  view.panX += (after.x - before.x) * view.zoom;
  view.panY += (after.y - before.y) * view.zoom;
  invalidate();
});

window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).tagName === 'INPUT') return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    if (history.undo()) {
      persist();
      invalidate();
    }
  } else if (mod && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    if (history.redo()) {
      persist();
      invalidate();
    }
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    const page = activePage(doc);
    for (const l of page.layers) {
      const i = l.objects.findIndex((o) => o.id === selectedId);
      if (i >= 0) {
        const obj = l.objects[i];
        history.run({
          label: 'eliminar',
          do: () => l.objects.splice(i, 1),
          undo: () => l.objects.splice(i, 0, obj),
        });
        selectedId = null;
        persist();
        invalidate();
        break;
      }
    }
  } else if (e.key === '0') {
    fitAll(view, activePage(doc), canvas.clientWidth, canvas.clientHeight);
    invalidate();
  } else if (e.key === 'v' || e.key === 'V') {
    setTool('select');
  } else if (e.key === 'r' || e.key === 'R') {
    setTool('rect');
  }
});

window.addEventListener('resize', resizeCanvas);

resizeCanvas();
fitAll(view, activePage(doc), canvas.clientWidth, canvas.clientHeight);
invalidate();
