import { activePage, newDoc, uid, type BitmapObj, type Doc, type Obj, type ShapeKind, type ShapeObj, type Style, type TextObj } from './model';
import { History, type Command } from './history';
import { fitAll, screenToWorld, type View } from './view';
import { applyResize, findObj, hitHandle, hitTest, handles, type HandleRole } from './hit';
import { addLayer, moveLayer } from './layers';
import { snapBox, type Guide } from './guides';
import { computeAlign, type AlignKind, type Move } from './align';
import { Renderer } from './render';
import { measureText } from './text';
import { duplicateCmd, pasteCmd, zOrderCmd } from './commands';
import { loadDoc, saveDoc } from './store';
import { exportFpng, importFpng, downloadBlob } from './export';
import { renderPanels } from './panels';

const doc: Doc = (await loadDoc()) ?? newDoc();
const history = new History();
const view: View = { zoom: 1, panX: 0, panY: 0 };
let selectedId: string | null = null;
let selectedIds: string[] = [];
let selectedLayerId: string | null = null;
let tool: 'select' | ShapeKind | 'text' = 'select';
let draft: { x: number; y: number; w: number; h: number; shape: ShapeKind } | null = null;
let marquee: { x: number; y: number; w: number; h: number } | null = null;
let clipboard: Obj[] = [];
let guides: Guide[] = [];

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const wrap = document.getElementById('canvas-wrap')!;
const renderer = new Renderer(canvas);

let dirty = false;
function invalidate(): void {
  if (dirty) return;
  dirty = true;
  requestAnimationFrame(() => {
    dirty = false;
    renderer.draw({ page: activePage(doc), view, selectedId, selectedIds, draft, marquee, guides });
    renderPanels(doc, selectedId, selectedLayerId, selectedIds, view, panelApi);
  });
}

let saveTimer = 0;
function persist(): void {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void saveDoc(doc), 400);
}

function select(id: string | null, additive = false): void {
  if (!id) {
    selectedId = null;
    selectedIds = [];
    return;
  }
  if (additive) {
    selectedIds = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    selectedId = selectedIds[selectedIds.length - 1] ?? null;
  } else {
    selectedId = id;
    selectedIds = [id];
  }
  selectedLayerId = null;
}

function selectedObjs(): Obj[] {
  const page = activePage(doc);
  return selectedIds.map((id) => findObj(page, id)).filter((o): o is Obj => o !== null);
}

type Drag =
  | { mode: 'pan'; sx: number; sy: number; panX: number; panY: number }
  | { mode: 'create'; ox: number; oy: number }
  | { mode: 'marquee'; ox: number; oy: number; additive: boolean }
  | { mode: 'move'; items: { obj: Obj; start: { x: number; y: number } }[]; grab: { x: number; y: number }; moved: boolean }
  | { mode: 'resize'; obj: Obj; role: HandleRole; start: { x: number; y: number; w: number; h: number; size?: number }; grab: { x: number; y: number } }
  | { mode: 'rotate'; obj: Obj; startRot: number; grabAngle: number };

const NAMES: Record<ShapeKind, string> = { rect: 'Rectángulo', ellipse: 'Elipse', line: 'Línea' };

let drag: Drag | null = null;

// Modelo de herramientas de Fireworks: la herramienta define qué hace el arrastre.
function setTool(t: 'select' | ShapeKind | 'text'): void {
  tool = t;
  document.querySelectorAll<HTMLElement>('#toolbar .tool[data-tool]').forEach((el) => {
    const on = el.dataset.tool === t;
    el.classList.toggle('active', on);
    el.setAttribute('aria-pressed', String(on));
  });
  canvas.style.cursor = t === 'select' ? 'default' : 'crosshair';
}
document.querySelectorAll<HTMLElement>('#toolbar .tool[data-tool]').forEach((el) =>
  el.addEventListener('click', () => setTool(el.dataset.tool as 'select' | ShapeKind | 'text')),
);
document.querySelector<HTMLElement>('#toolbar .tool[data-fit]')?.addEventListener('click', () => {
  fitAll(view, activePage(doc), canvas.clientWidth, canvas.clientHeight);
  invalidate();
});

// ---- Importar imagen (M3) / importar .f.png (M6): un solo handler ----
const importFile = document.getElementById('import-file') as HTMLInputElement;
document.querySelector<HTMLElement>('#toolbar .tool[data-import]')?.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', () => {
  const file = importFile.files?.[0];
  importFile.value = '';
  if (!file) return;
  void (async () => {
    const restored = await importFpng(file); // ¿PNG con fuente Pyra? → reabrir documento
    if (restored) {
      doc.name = restored.name;
      doc.pages = restored.pages;
      doc.activePageId = restored.activePageId;
      history.clear();
      select(null);
      await saveDoc(doc);
      invalidate();
      return;
    }
    importBitmapFile(file);
  })();
});

function importBitmapFile(file: File): void {
  const reader = new FileReader();
  reader.onload = () => {
    const src = String(reader.result);
    const probe = new Image();
    probe.onload = () => {
      const page = activePage(doc);
      const layer =
        (selectedLayerId ? page.layers.find((l) => l.id === selectedLayerId && !l.locked) : null) ??
        page.layers.find((l) => l.visible && !l.locked);
      if (!layer) return;
      const obj: BitmapObj = {
        id: uid(),
        shape: 'bitmap',
        name: file.name,
        x: Math.round((page.width - probe.naturalWidth) / 2),
        y: Math.round((page.height - probe.naturalHeight) / 2),
        w: probe.naturalWidth,
        h: probe.naturalHeight,
        src,
        crop: null,
        sat: 1,
        bri: 1,
      };
      const cmd: Command = {
        label: 'importar imagen',
        do: () => layer.objects.push(obj),
        undo: () => {
          const i = layer.objects.indexOf(obj);
          if (i >= 0) layer.objects.splice(i, 1);
          if (selectedId === obj.id) select(null);
        },
      };
      history.run(cmd);
      select(obj.id);
      persist();
      invalidate();
    };
    probe.src = src;
  };
  reader.readAsDataURL(file);
}

// ---- Exportar .f.png (M6): PNG con la fuente Pyra embebida ----
document.querySelector<HTMLElement>('#toolbar .tool[data-export]')?.addEventListener('click', async () => {
  const blob = await exportFpng(doc, renderer);
  downloadBlob(blob, `${doc.name || 'pyra'}.f.png`);
});

renderer.onImgReady = invalidate;

// ---- Paneles laterales: colapsables y reordenables con drag ----
{
  const side = document.getElementById('side')!;
  const KEY = 'pyra:side';
  type SideState = { order: string[]; collapsed: Record<string, boolean> };
  const state: SideState = (() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) ?? '');
      if (Array.isArray(s.order) && s.collapsed) return s;
    } catch { /* sin estado previo */ }
    return { order: [], collapsed: {} };
  })();
  const save = (): void => localStorage.setItem(KEY, JSON.stringify(state));

  const panels = [...side.querySelectorAll<HTMLElement>('.panel[data-panel]')];
  for (const p of panels) {
    const id = p.dataset.panel!;
    if (state.collapsed[id]) p.classList.add('collapsed');
    p.querySelector('.panel-title')!.addEventListener('click', () => {
      p.classList.toggle('collapsed');
      state.collapsed[id] = p.classList.contains('collapsed');
      save();
    });
    p.draggable = true;
    p.addEventListener('dragstart', () => p.classList.add('dragging'));
    p.addEventListener('dragend', () => {
      p.classList.remove('dragging');
      state.order = [...side.querySelectorAll<HTMLElement>('.panel[data-panel]')].map((el) => el.dataset.panel!);
      save();
    });
  }
  side.addEventListener('dragover', (e) => {
    const dragging = side.querySelector('.panel.dragging');
    if (!dragging) return;
    const after = [...side.querySelectorAll<HTMLElement>('.panel:not(.dragging)')]
      .find((p) => { const r = p.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
    if (after) side.insertBefore(dragging, after);
    else side.appendChild(dragging);
  });
  // restaurar el orden guardado
  for (const id of state.order) {
    const p = panels.find((el) => el.dataset.panel === id);
    if (p) side.appendChild(p);
  }
}

// ---- Texto (M4): clic con la herramienta → objeto editable en el acto ----
const DEFAULT_FONT = 'system-ui, sans-serif';

function remeasureText(o: TextObj): void {
  const m = measureText(canvas.getContext('2d')!, o.text, o.font, o.size);
  o.w = m.w;
  o.h = m.h;
}

function createTextObj(wx: number, wy: number): void {
  const page = activePage(doc);
  const layer =
    (selectedLayerId ? page.layers.find((l) => l.id === selectedLayerId && !l.locked) : null) ??
    page.layers.find((l) => l.visible && !l.locked);
  if (!layer) return;
  const obj: TextObj = {
    id: uid(),
    shape: 'text',
    name: 'Texto',
    x: Math.round(wx),
    y: Math.round(wy),
    w: 1,
    h: 1,
    text: 'Texto',
    font: DEFAULT_FONT,
    size: 24,
    fill: '#111111',
  };
  remeasureText(obj);
  const cmd: Command = {
    label: 'crear texto',
    do: () => layer.objects.push(obj),
    undo: () => {
      const i = layer.objects.indexOf(obj);
      if (i >= 0) layer.objects.splice(i, 1);
      if (selectedId === obj.id) select(null);
    },
  };
  history.run(cmd);
  select(obj.id);
  setTool('select'); // como Fireworks: tras crear, vuelve a la selección
  persist();
  invalidate();
}

/** Redimensionar texto = escalar la fuente; el bbox se recalcula midiendo. */
function resizeText(obj: TextObj, start: { x: number; y: number; w: number; h: number; size: number }, role: HandleRole): void {
  const s = Math.max(0.1, role.includes('e') || role.includes('w') ? obj.w / start.w : obj.h / start.h);
  obj.size = Math.max(1, Math.round(start.size * s));
  remeasureText(obj);
  if (role.includes('w')) obj.x = start.x + start.w - obj.w;
  if (role.includes('n')) obj.y = start.y + start.h - obj.h;
}

// doble clic sobre un texto → editarlo (como el rename de capas)
canvas.addEventListener('dblclick', (e) => {
  const { wx, wy } = localXY(e);
  const hit = hitTest(activePage(doc), wx, wy, 4 / view.zoom);
  if (!hit || hit.shape !== 'text') return;
  const newText = window.prompt('Texto', hit.text);
  if (newText === null) return;
  const before = { text: hit.text, w: hit.w, h: hit.h };
  const after = { text: newText };
  history.run({
    label: 'editar texto',
    do: () => {
      hit.text = after.text;
      remeasureText(hit);
    },
    undo: () => Object.assign(hit, before),
  });
  persist();
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

  if (tool === 'text') {
    createTextObj(wx, wy); // como Fireworks: clic y a editar
    return;
  }

  if (tool !== 'select') {
    drag = { mode: 'create', ox: wx, oy: wy };
    draft = { x: wx, y: wy, w: 0, h: 0, shape: tool };
    invalidate();
    return;
  }

  const sel = findObj(page, selectedId);
  const h = sel ? hitHandle(px, py, handles(sel, view)) : null;
  if (h && sel && h.role === 'rot') {
    const cx = sel.x + sel.w / 2, cy = sel.y + sel.h / 2;
    drag = { mode: 'rotate', obj: sel, startRot: sel.rot ?? 0, grabAngle: Math.atan2(wy - cy, wx - cx) };
    invalidate();
    return;
  }
  if (h && sel) {
    drag = {
      mode: 'resize',
      obj: sel,
      role: h.role,
      start: { x: sel.x, y: sel.y, w: sel.w, h: sel.h, size: sel.shape === 'text' ? sel.size : undefined },
      grab: { x: wx, y: wy },
    };
    return;
  }

  const hit = hitTest(page, wx, wy, 4 / view.zoom); // margen constante en pantalla
  if (hit) {
    if (e.shiftKey) select(hit.id, true);
    else if (!selectedIds.includes(hit.id)) select(hit.id);
    drag = {
      mode: 'move',
      items: selectedObjs().map((o) => ({ obj: o, start: { x: o.x, y: o.y } })),
      grab: { x: wx, y: wy },
      moved: false,
    };
    invalidate();
    return;
  }

  select(null);
  drag = { mode: 'marquee', ox: wx, oy: wy, additive: e.shiftKey };
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
      shape: draft.shape,
    };
    invalidate();
    return;
  }

  if (drag.mode === 'marquee') {
    draft = null;
    marquee = {
      x: Math.min(drag.ox, wx),
      y: Math.min(drag.oy, wy),
      w: Math.abs(wx - drag.ox),
      h: Math.abs(wy - drag.oy),
    };
    invalidate();
    return;
  }

  if (drag.mode === 'move') {
    const page = activePage(doc);
    const dx = wx - drag.grab.x;
    const dy = wy - drag.grab.y;
    // smart guides: imán a bordes/centros de objetos visibles y de la página
    const items = drag.items;
    const primary = items[0];
    const others = page.layers
      .filter((l) => l.visible)
      .flatMap((l) => l.objects)
      .filter((o) => !items.some((i) => i.obj === o))
      .map((o) => ({ x: o.x, y: o.y, w: o.w, h: o.h }));
    const snap = snapBox(
      { x: primary.start.x + dx, y: primary.start.y + dy, w: primary.obj.w, h: primary.obj.h },
      others,
      { width: page.width, height: page.height },
      6 / view.zoom, // tolerancia constante en pantalla
    );
    guides = snap.guides;
    for (const it of drag.items) {
      it.obj.x = Math.round(it.start.x + dx + snap.dx);
      it.obj.y = Math.round(it.start.y + dy + snap.dy);
    }
    drag.moved = true;
    invalidate();
    return;
  }

  if (drag.mode === 'rotate') {
    const o = drag.obj;
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    let delta = (Math.atan2(wy - cy, wx - cx) - drag.grabAngle) * 180 / Math.PI;
    if (e.shiftKey) delta = Math.round(delta / 15) * 15; // Shift = pasos de 15°
    o.rot = Math.round(((drag.startRot + delta) % 360 + 360) % 360);
    invalidate();
    return;
  }

  if (drag.mode === 'resize') {
    applyResize(drag.obj, drag.start, drag.role, wx - drag.grab.x, wy - drag.grab.y);
    if (drag.obj.shape === 'text') resizeText(drag.obj, { ...drag.start, size: drag.start.size ?? drag.obj.size } as { x: number; y: number; w: number; h: number; size: number }, drag.role); // escalar la fuente, no estirar glifos
    invalidate();
  }
});

canvas.addEventListener('pointerup', () => {
  if (!drag) return;
  const page = activePage(doc);

  if (drag.mode === 'create' && draft) {
    const d = draft;
    draft = null;
    guides = [];
    const big = d.shape === 'line' ? Math.hypot(d.w, d.h) > 2 : d.w > 2 && d.h > 2;
    if (big) {
      const layer =
        (selectedLayerId ? page.layers.find((l) => l.id === selectedLayerId && !l.locked) : null) ??
        page.layers.find((l) => l.visible && !l.locked);
      if (layer) {
        const obj: ShapeObj = {
          id: uid(),
          shape: d.shape,
          name: NAMES[d.shape],
          x: Math.round(d.x),
          y: Math.round(d.y),
          w: Math.round(d.w),
          h: Math.round(d.h),
          fill: d.shape === 'line' ? '' : '#4f8cff',
          stroke: d.shape === 'line' ? '#4f8cff' : null,
          strokeWidth: d.shape === 'line' ? 2 : 0,
        };
        const cmd: Command = {
          label: `crear ${d.shape}`,
          do: () => layer.objects.push(obj),
          undo: () => {
            const i = layer.objects.indexOf(obj);
            if (i >= 0) layer.objects.splice(i, 1);
            if (selectedId === obj.id) select(null);
          },
        };
        history.run(cmd);
        select(obj.id);
        setTool('select'); // como Fireworks: tras dibujar, vuelve a la selección
        persist();
      }
    }
  } else if (drag.mode === 'move' && drag.moved) {
    guides = [];
    const items = drag.items.map((it) => ({ obj: it.obj, from: it.start, to: { x: it.obj.x, y: it.obj.y } }));
    history.record({
      label: 'mover',
      do: () => items.forEach((it) => Object.assign(it.obj, it.to)),
      undo: () => items.forEach((it) => Object.assign(it.obj, it.from)),
    });
    persist();
  } else if (drag.mode === 'marquee') {
    const m = marquee;
    marquee = null;
    if (m && (m.w > 2 || m.h > 2)) {
      const hits = page.layers
        .filter((l) => l.visible && !l.locked)
        .flatMap((l) => l.objects)
        .filter((o) => o.x < m.x + m.w && o.x + o.w > m.x && o.y < m.y + m.h && o.y + o.h > m.y);
      if (hits.length) {
        if (drag.additive) hits.forEach((o) => select(o.id, true));
        else {
          select(null);
          selectedIds = hits.map((o) => o.id);
          selectedId = selectedIds[selectedIds.length - 1] ?? null;
        }
      }
    }
  } else if (drag.mode === 'rotate') {
    const { obj, startRot } = drag;
    const endRot = obj.rot ?? 0;
    history.record({
      label: 'rotar',
      do: () => { obj.rot = endRot; },
      undo: () => { obj.rot = startRot; },
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
  editObj(obj: Obj, patch: Partial<ShapeObj> | Partial<BitmapObj>): void {
    const before = { ...obj };
    history.run({
      label: 'editar',
      do: () => Object.assign(obj, patch),
      undo: () => Object.assign(obj, before),
    });
    persist();
    invalidate();
  },
  editLayer(layerId: string, patch: { visible?: boolean; locked?: boolean; opacity?: number; name?: string }): void {
    const page = activePage(doc);
    const layer = page.layers.find((l) => l.id === layerId);
    if (!layer) return;
    const before = { ...layer };
    history.run({
      label: 'capa',
      do: () => Object.assign(layer, patch),
      undo: () => Object.assign(layer, before),
    });
    persist();
    invalidate();
  },
  selectLayer(layerId: string | null): void {
    selectedLayerId = layerId;
    if (layerId) select(null);
    invalidate();
  },
  addLayer(): void {
    const page = activePage(doc);
    const above = selectedLayerId ?? page.layers[page.layers.length - 1].id;
    const layer = addLayer(page, above);
    const i = page.layers.indexOf(layer);
    history.record({
      label: 'crear capa',
      do: () => {},
      undo: () => {
        const j = page.layers.indexOf(layer);
        if (j >= 0) page.layers.splice(j, 1);
        if (selectedLayerId === layer.id) selectedLayerId = null;
      },
    });
    selectedLayerId = layer.id;
    void i;
    persist();
    invalidate();
  },
  removeLayer(layerId: string): void {
    const page = activePage(doc);
    if (page.layers.length <= 1) return;
    const i = page.layers.findIndex((l) => l.id === layerId);
    if (i < 0) return;
    const [layer] = page.layers.splice(i, 1);
    history.record({
      label: 'eliminar capa',
      do: () => {},
      undo: () => page.layers.splice(i, 0, layer),
    });
    if (selectedLayerId === layerId) selectedLayerId = null;
    persist();
    invalidate();
  },
  moveLayer(layerId: string, delta: number): void {
    const page = activePage(doc);
    const from = page.layers.findIndex((l) => l.id === layerId);
    if (moveLayer(page, layerId, delta)) {
      history.record({
        label: 'reordenar capa',
        do: () => {},
        undo: () => {
          const j = page.layers.findIndex((l) => l.id === layerId);
          if (j >= 0) {
            const [l] = page.layers.splice(j, 1);
            page.layers.splice(from, 0, l);
          }
        },
      });
      persist();
      invalidate();
    }
  },
  align(kind: AlignKind): void {
    const page = activePage(doc);
    const moves: Move[] = computeAlign(selectedObjs(), kind, { width: page.width, height: page.height });
    if (moves.length) {
      history.run({
        label: `alinear ${kind}`,
        do: () => moves.forEach((m) => Object.assign(m.obj, m.to)),
        undo: () => moves.forEach((m) => Object.assign(m.obj, m.from)),
      });
      persist();
    }
    invalidate();
  },
  selectPage(pageId: string): void {
    doc.activePageId = pageId;
    select(null);
    selectedLayerId = null;
    fitAll(view, activePage(doc), canvas.clientWidth, canvas.clientHeight);
    persist();
    invalidate();
  },
  addPage(): void {
    const base = activePage(doc);
    const page = {
      id: uid(),
      name: `Página ${doc.pages.length + 1}`,
      width: base.width,
      height: base.height,
      layers: [{ id: uid(), name: 'Capa 1', visible: true, locked: false, opacity: 1, objects: [] }],
    };
    doc.pages.push(page);
    doc.activePageId = page.id;
    select(null);
    selectedLayerId = null;
    persist();
    invalidate();
  },
  removePage(pageId: string): void {
    if (doc.pages.length <= 1) return;
    const i = doc.pages.findIndex((p) => p.id === pageId);
    if (i < 0) return;
    doc.pages.splice(i, 1);
    if (doc.activePageId === pageId) doc.activePageId = doc.pages[Math.max(0, i - 1)].id;
    select(null);
    selectedLayerId = null;
    persist();
    invalidate();
  },
  saveStyle(obj: Obj): void {
    doc.styles ??= [];
    const shape = obj as Partial<ShapeObj>;
    const style: Style = {
      id: uid(),
      name: `Estilo ${doc.styles.length + 1}`,
      fill: shape.fill ?? '#000000',
      stroke: shape.stroke ?? null,
      strokeWidth: shape.strokeWidth ?? 0,
      gradient: shape.gradient ?? null,
      fx: obj.fx ? structuredClone(obj.fx) : undefined,
    };
    doc.styles.push(style);
    persist();
    invalidate();
  },
  applyStyle(styleId: string): void {
    const style = (doc.styles ?? []).find((s) => s.id === styleId);
    const objs = selectedObjs();
    if (!style || !objs.length) return;
    const before = objs.map((o) => ({
      o,
      state: { fill: (o as Partial<ShapeObj>).fill, stroke: (o as Partial<ShapeObj>).stroke, strokeWidth: (o as Partial<ShapeObj>).strokeWidth, gradient: (o as Partial<ShapeObj>).gradient, fx: o.fx },
    }));
    history.run({
      label: 'aplicar estilo',
      do: () => {
        for (const o of objs) {
          const patch: Partial<ShapeObj> = { fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth, gradient: style.gradient ?? null };
          if (o.shape !== 'line') Object.assign(o, patch);
          o.fx = style.fx ? structuredClone(style.fx) : undefined;
        }
      },
      undo: () => {
        for (const { o, state } of before) {
          Object.assign(o, { fill: state.fill, stroke: state.stroke, strokeWidth: state.strokeWidth, gradient: state.gradient });
          o.fx = state.fx;
        }
      },
    });
    persist();
    invalidate();
  },
  removeStyle(styleId: string): void {
    const i = (doc.styles ?? []).findIndex((s) => s.id === styleId);
    if (i >= 0) {
      doc.styles!.splice(i, 1);
      persist();
      invalidate();
    }
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
    const removed: { layerIndex: number; index: number; obj: Obj }[] = [];
    page.layers.forEach((l, li) => {
      l.objects.forEach((o, oi) => {
        if (selectedIds.includes(o.id)) removed.push({ layerIndex: li, index: oi, obj: o });
      });
    });
    if (!removed.length) return;
    history.run({
      label: 'eliminar',
      do: () => {
        for (const r of removed) {
          const i = page.layers[r.layerIndex].objects.indexOf(r.obj);
          if (i >= 0) page.layers[r.layerIndex].objects.splice(i, 1);
        }
      },
      undo: () => {
        for (const r of [...removed].reverse()) page.layers[r.layerIndex].objects.splice(r.index, 0, r.obj);
      },
    });
    select(null);
    persist();
    invalidate();
  } else if (e.key === '0') {
    fitAll(view, activePage(doc), canvas.clientWidth, canvas.clientHeight);
    invalidate();
  } else if (e.key === 'Escape') {
    select(null);
    selectedLayerId = null;
    invalidate();
  } else if (e.key === 'v' || e.key === 'V') {
    setTool('select');
  } else if (e.key === 'r' || e.key === 'R') {
    setTool('rect');
  } else if (e.key === 'e' || e.key === 'E') {
    setTool('ellipse');
  } else if (e.key === 'l' || e.key === 'L') {
    setTool('line');
  } else if (e.key === 't' || e.key === 'T') {
    setTool('text');
  } else if (mod && (e.key === 'd' || e.key === 'D')) {
    e.preventDefault();
    const dup = duplicateCmd(activePage(doc), selectedObjs());
    if (dup) {
      history.run(dup.cmd);
      select(dup.clones[dup.clones.length - 1].id); // como Fireworks: la copia queda seleccionada
      persist();
      invalidate();
    }
  } else if (mod && (e.key === 'c' || e.key === 'C')) {
    clipboard = selectedObjs().map((o) => structuredClone(o));
  } else if (mod && (e.key === 'v' || e.key === 'V')) {
    if (!clipboard.length) return;
    const paste = pasteCmd(activePage(doc), clipboard);
    if (paste) {
      history.run(paste.cmd);
      select(paste.clones[paste.clones.length - 1].id);
      persist();
      invalidate();
    }
  } else if (e.key === '[' || e.key === ']') {
    const cmd = zOrderCmd(activePage(doc), selectedObjs(), e.key === ']' ? 1 : -1);
    if (cmd) {
      history.run(cmd);
      persist();
      invalidate();
    }
  } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    const step = e.shiftKey ? 10 : 1;
    const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
    const objs = selectedObjs();
    if (!objs.length) return;
    history.run({
      label: 'mover',
      do: () => objs.forEach((o) => { o.x += dx; o.y += dy; }),
      undo: () => objs.forEach((o) => { o.x -= dx; o.y -= dy; }),
    });
    persist();
    invalidate();
  }
});

window.addEventListener('resize', resizeCanvas);

resizeCanvas();
fitAll(view, activePage(doc), canvas.clientWidth, canvas.clientHeight);
invalidate();
