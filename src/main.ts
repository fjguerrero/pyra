import { activePage, isLineLike, newDoc, uid, type BitmapObj, type BrushSettings, type Doc, type LineFrom, type Obj, type ShapeKind, type ShapeObj, type Style, type TextObj } from './model';
import { History, type Command } from './history';
import type { Draft } from './render';
import { fitAll, screenToWorld, type View } from './view';
import { applyResize, findObj, hitHandle, hitTest, handles, type HandleRole } from './hit';
import { addLayer, moveLayer, reorderLayer } from './layers';
import { snapBox, type Guide, type Snap } from './guides';
import { rdpSimplify } from './freehand';
import { computeAlign, type AlignKind, type Move } from './align';
import { Renderer } from './render';
import { DEFAULT_FONT, measureText } from './text';
import { duplicateCmd, groupCmd, pasteCmd, unionCmd, zOrderCmd } from './commands';
import { loadDoc, saveDoc } from './store';
import { exportFpng, importFpng, downloadBlob } from './export';
import { renderPanels, type BrushPanelArg } from './panels';
import { icon } from './icons';
import { LANGS, currentLang, setLang, t } from './i18n';

const doc: Doc = (await loadDoc()) ?? newDoc();
// Color de trazo: el último color usado (lo que pinta el inspector).
let lastStroke = '#4f8cff';
const brushColor = (): string => lastStroke;

// Pincel: tamaño, presión y opacidad (como las Options de los Paint Tools de Fireworks).
const brush: BrushSettings = { size: 8, pressure: 1, opacity: 1, shape: 'round', tip: null };
let brushPanel: BrushPanelArg | undefined;
function setBrush(patch: Partial<BrushSettings>): void {
  Object.assign(brush, patch);
  invalidate();
}
const history = new History();
const view: View = { zoom: 1, panX: 0, panY: 0 };
let selectedId: string | null = null;
let selectedIds: string[] = [];
let selectedLayerId: string | null = null;
let tool: 'select' | ShapeKind | 'text' | 'brush' | 'pen' | 'pencil' | 'polypen' | 'eraser' = 'select';
let draft: Draft | null = null;
// vértices de la pluma en coords de mundo; c = vértice curvo (Shift o modo curvo)
let penPts: { x: number; y: number; c: boolean }[] = [];

// Lápiz: modo continuo (MS Paint) o suavizado; grosor propio. Persistido.
type PencilSettings = { mode: 'continuous' | 'smooth'; size: number };
const pencil: PencilSettings = { mode: 'continuous', size: 3, ...JSON.parse(localStorage.getItem('pyra:pencil') || '{}') };
function setPencil(patch: Partial<PencilSettings>): void {
  Object.assign(pencil, patch);
  localStorage.setItem('pyra:pencil', JSON.stringify(pencil));
  invalidate();
}

// Lápiz de polígonos: modo líneas rectas (RDP) o estilizado; borde y relleno propios. Persistido.
type PolySettings = { mode: 'straight' | 'stylized'; fill: string; noFill: boolean; stroke: string; width: number; dash: boolean };
const poly: PolySettings = { mode: 'straight', fill: '#4f8cff', noFill: false, stroke: '#4f8cff', width: 2, dash: false, ...JSON.parse(localStorage.getItem('pyra:poly') || '{}') };
function setPoly(patch: Partial<PolySettings>): void {
  Object.assign(poly, patch);
  localStorage.setItem('pyra:poly', JSON.stringify(poly));
  invalidate();
}

// Pluma: vértices curvos por defecto (Shift los invierte). Persistido.
const penOpt: { curved: boolean } = { curved: false, ...JSON.parse(localStorage.getItem('pyra:pen') || '{}') };
function setPenOpt(patch: Partial<{ curved: boolean }>): void {
  Object.assign(penOpt, patch);
  localStorage.setItem('pyra:pen', JSON.stringify(penOpt));
  invalidate();
}
let eraserDrag: { obj: BitmapObj; start: NonNullable<BitmapObj['erase']>; moved: boolean } | null = null;
let marquee: { x: number; y: number; w: number; h: number } | null = null;
let clipboard: Obj[] = [];
let guides: Guide[] = [];

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const wrap = document.getElementById('canvas-wrap')!;
const renderer = new Renderer(canvas);

let dirty = false;
// ponytail: mientras hay un puntero presionado dentro del inspector no se reconstruye (un slider en pleno drag se destruiría);
// el canvas sí se actualiza en vivo. En pointerup se refresca el panel.
let pointerDownInInspector = false;
const inspPanel = document.querySelector<HTMLElement>('.panel[data-panel="inspector"]')!;
inspPanel.addEventListener('pointerdown', () => { pointerDownInInspector = true; });
window.addEventListener('pointerup', () => {
  if (pointerDownInInspector) { pointerDownInInspector = false; invalidate(); }
});
function invalidate(): void {
  if (dirty) return;
  dirty = true;
  requestAnimationFrame(() => {
    dirty = false;
    renderer.draw({ page: activePage(doc), view, selectedId, selectedIds, groupHandles: selectedIds.length > 1, draft, marquee, guides, workspace: bg });
    if (!pointerDownInInspector) renderPanels(doc, selectedId, selectedLayerId, selectedIds, view, panelApi, brushPanel);
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
  expandGroups();
}

/** Si un objeto seleccionado pertenece a un grupo, se selecciona el grupo entero. */
function expandGroups(): void {
  if (!selectedId) return;
  const page = activePage(doc);
  const o = findObj(page, selectedId);
  if (!o?.group) return;
  const members = page.layers.flatMap((l) => l.objects).filter((x) => x.group === o.group).map((x) => x.id);
  selectedIds = [...new Set([...selectedIds, ...members])];
}

function selectedObjs(): Obj[] {
  const page = activePage(doc);
  return selectedIds.map((id) => findObj(page, id)).filter((o): o is Obj => o !== null);
}

type Pt = { x: number; y: number };

type Drag =
  | { mode: 'pan'; sx: number; sy: number; panX: number; panY: number }
  | { mode: 'create'; ox: number; oy: number }
  | { mode: 'paint'; pts: { x: number; y: number; p: number }[] }
  | { mode: 'pencil'; pts: Pt[] }
  | { mode: 'polypen'; pts: Pt[] }
  | { mode: 'marquee'; ox: number; oy: number; additive: boolean }
  | { mode: 'move'; items: { obj: Obj; start: { x: number; y: number } }[]; grab: { x: number; y: number }; moved: boolean; axis?: 'x' | 'y'; toggle?: Obj | null }
  | { mode: 'resize'; obj: Obj; role: HandleRole; start: { x: number; y: number; w: number; h: number; size?: number }; grab: { x: number; y: number } }
  | { mode: 'rotate'; obj: Obj; startRot: number; grabAngle: number }
  | { mode: 'guide'; index: number; startPos: number }
  | { mode: 'erase' }
  | { mode: 'groupresize'; objs: { obj: Obj; start: { x: number; y: number; w: number; h: number } }[]; start: { x: number; y: number; w: number; h: number }; role: HandleRole; grab: { x: number; y: number } };

const NAMES: Record<ShapeKind, string> = { rect: t('obj_rect'), ellipse: t('obj_ellipse'), line: t('obj_line'), stroke: t('obj_stroke'), polygon: t('obj_polygon') };

/** Añadir un objeto creado a la capa activa, con undo. */
function pushCreateCmd(obj: Obj): void {
  const page = activePage(doc);
  const layer =
    (selectedLayerId ? page.layers.find((l) => l.id === selectedLayerId && !l.locked) : null) ??
    page.layers.find((l) => l.visible && !l.locked);
  if (!layer) return;
  const cmd: Command = {
    label: `crear ${obj.shape}`,
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
}

/** Goma: añade un círculo borrado (normalizado al bbox) a un objeto bitmap. */
function eraseAt(obj: BitmapObj, wx: number, wy: number): void {
  (obj.erase ??= []).push({ x: (wx - obj.x) / obj.w, y: (wy - obj.y) / obj.h, r: 8 / view.zoom / obj.w });
}

/** Cerrar la pluma: los vértices de mundo pasan a `poly` normalizada (curvos = Catmull-Rom). */
function finishPen(): void {
  const pts = penPts;
  penPts = [];
  draft = null;
  if (pts.length < 3) {
    invalidate();
    return;
  }
  const x0 = Math.min(...pts.map((p) => p.x)), y0 = Math.min(...pts.map((p) => p.y));
  const w = Math.max(1, Math.max(...pts.map((p) => p.x)) - x0), h = Math.max(1, Math.max(...pts.map((p) => p.y)) - y0);
  const curved = pts.some((p) => p.c);
  const obj: ShapeObj = {
    id: uid(),
    shape: 'polygon',
    name: NAMES.polygon,
    x: Math.round(x0), y: Math.round(y0), w: Math.round(w), h: Math.round(h),
    fill: '#4f8cff',
    stroke: null,
    strokeWidth: 0,
    poly: pts.map((p) => ({ x: (p.x - x0) / w, y: (p.y - y0) / h })),
    smooth: curved,
  };
  pushCreateCmd(obj);
  setTool('select');
}

let drag: Drag | null = null;

// Modelo de herramientas de Fireworks: la herramienta define qué hace el arrastre.
function setTool(t: 'select' | ShapeKind | 'text' | 'brush' | 'pen' | 'pencil' | 'polypen' | 'eraser'): void {
  tool = t;
  penPts = [];
  document.querySelectorAll<HTMLElement>('#toolbar .tool[data-tool]').forEach((el) => {
    const on = el.dataset.tool === t;
    el.classList.toggle('active', on);
    el.setAttribute('aria-pressed', String(on));
  });
  canvas.style.cursor = t === 'select' ? 'default' : 'crosshair';
  brushPanel = t === 'brush' ? { s: brush, set: setBrush, pressure: true }
    : t === 'pencil' ? { s: { size: pencil.size, pressure: 1, opacity: 1, shape: 'round', tip: null }, set: (p) => setPencil({ size: p.size ?? pencil.size, mode: p.shape === 'square' ? 'continuous' : 'smooth' }), mode: pencil.mode, modes: ['pencil_continuous', 'pencil_smooth'] }
    : t === 'polypen' ? { s: { size: poly.width, pressure: 1, opacity: 1, shape: 'round', tip: null }, set: (p) => setPoly({ width: p.size ?? poly.width, dash: p.shape === 'square' }), mode: poly.mode, modes: ['poly_freehand', 'poly_straight'], colors: [{ labelKey: 'stroke_color', value: poly.stroke, set: (v) => setPoly({ stroke: v }) }, { labelKey: 'fill', value: poly.noFill ? '' : poly.fill, set: (v) => setPoly({ fill: v || '#4f8cff', noFill: !v }) }] }
    : t === 'pen' ? { s: undefined, mode: penOpt.curved ? 'pen_curved' : 'pen_straight', modes: ['pen_curved', 'pen_straight'], setMode: (m) => setPenOpt({ curved: m === 'pen_curved' }) }
    : undefined;
  invalidate();
}
// ---- i18n: textos estáticos del HTML + selector de idioma ----
function applyStaticI18n(): void {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as never);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle as never);
  });
  document.querySelectorAll<HTMLElement>('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon!);
  });
}
const langSel = document.getElementById('lang') as HTMLSelectElement;
langSel.innerHTML = LANGS.map((l) => `<option value="${l.code}">${l.label}</option>`).join('');
langSel.value = currentLang();
langSel.addEventListener('change', () => {
  setLang(langSel.value as never);
  applyStaticI18n();
  invalidate();
});



// ---- Theme: oscuro / claro / como el sistema (persistido en pyra:theme) ----
type Theme = 'system' | 'light' | 'dark';
const themeSel = document.getElementById('theme') as HTMLSelectElement;
const mediaDark = window.matchMedia('(prefers-color-scheme: dark)');
function currentTheme(): Theme {
  const v = localStorage.getItem('pyra:theme');
  return v === 'light' || v === 'dark' ? v : 'system';
}
function applyTheme(): void {
  const th = currentTheme();
  const dark = th === 'dark' || (th === 'system' && mediaDark.matches);
  if (dark) document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', 'light');
  themeSel.value = th;
  themeSel.options[0].textContent = t('theme_system');
  themeSel.options[1].textContent = t('theme_light');
  themeSel.options[2].textContent = t('theme_dark');
}
themeSel.addEventListener('change', () => {
  localStorage.setItem('pyra:theme', themeSel.value);
  applyTheme();
});
mediaDark.addEventListener('change', () => {
  if (currentTheme() === 'system') applyTheme();
});
applyTheme();

// ---- Menú de configuración (abajo a la izquierda) ----
const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
const settingsMenu = document.getElementById('settings-menu') as HTMLElement;
settingsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  settingsMenu.hidden = !settingsMenu.hidden;
});
document.addEventListener('pointerdown', (e) => {
  if (!settingsMenu.hidden && !settingsMenu.contains(e.target as Node) && e.target !== settingsBtn) {
    settingsMenu.hidden = true;
  }
});

// ---- Fondo del área de trabajo: color y/o rejilla de cuadrados (pyra:bg) ----
type WsBg = { color: string; grid: number };
function currentBg(): WsBg {
  try {
    const b = JSON.parse(localStorage.getItem('pyra:bg') ?? '');
    if (b && typeof b.color === 'string') return { color: b.color, grid: Number(b.grid) || 0 };
  } catch { /* sin estado previo */ }
  return { color: '#0e1013', grid: 0 };
}
const bg = currentBg();
const bgColor = document.getElementById('bg-color') as HTMLInputElement;
const bgGrid = document.getElementById('bg-grid') as HTMLSelectElement;
bgColor.value = bg.color;
bgGrid.value = String(bg.grid);
const saveBg = (): void => {
  localStorage.setItem('pyra:bg', JSON.stringify(bg));
  invalidate();
};
bgColor.addEventListener('input', () => {
  bg.color = bgColor.value;
  saveBg();
});
bgGrid.addEventListener('change', () => {
  bg.grid = Number(bgGrid.value) || 0;
  saveBg();
});

// ---- Ayuda: modal con todas las funcionalidades (texto i18n ya formateado) ----
const helpBtn = document.getElementById('help-btn') as HTMLButtonElement;
const helpModal = document.getElementById('help-modal') as HTMLElement;
helpBtn.addEventListener('click', () => {
  helpModal.innerHTML = `<div class="card">${t('help_html')}</div>`;
  helpModal.hidden = false;
  settingsMenu.hidden = true;
});
helpModal.addEventListener('click', () => { helpModal.hidden = true; });

applyStaticI18n();

document.querySelectorAll<HTMLElement>('#toolbar .tool[data-tool]').forEach((el) =>
  el.addEventListener('click', () => setTool(el.dataset.tool as 'select' | ShapeKind | 'text' | 'brush' | 'pen' | 'eraser')),
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
      const before = { name: doc.name, pages: doc.pages, activePageId: doc.activePageId };
      history.run({
        label: 'importar documento',
        do: () => {
          doc.name = restored.name;
          doc.pages = restored.pages;
          doc.activePageId = restored.activePageId;
        },
        undo: () => {
          doc.name = before.name;
          doc.pages = before.pages;
          doc.activePageId = before.activePageId;
        },
      });
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

// ---- Exportar: menú con .f.png, PNG, JPEG y WebP (formatos del navegador) ----
const exportMenu = document.getElementById('export-menu')!;
document.querySelector<HTMLElement>('#toolbar .tool[data-export-menu]')?.addEventListener('click', (e) => {
  e.stopPropagation();
  exportMenu.hidden = !exportMenu.hidden;
});
document.addEventListener('pointerdown', (e) => {
  if (!exportMenu.hidden && !exportMenu.contains(e.target as Node) && !(e.target as HTMLElement).closest?.('[data-export-menu]'))
    exportMenu.hidden = true;
});
const baseName = () => doc.name || 'pyra';
document.querySelector<HTMLElement>('#export-menu [data-export]')?.addEventListener('click', async () => {
  downloadBlob(await exportFpng(doc, renderer), `${baseName()}.f.png`);
  exportMenu.hidden = true;
});
const exportQuality = document.getElementById('export-quality') as HTMLInputElement;
exportQuality.value = localStorage.getItem('pyra:export-quality') ?? '92';
exportQuality.addEventListener('change', () => {
  const v = Math.min(100, Math.max(10, Number(exportQuality.value) || 92));
  exportQuality.value = String(v);
  localStorage.setItem('pyra:export-quality', String(v));
});
const exportQualityValue = (): number => Number(exportQuality.value) / 100;
const exportRaster = (mime: string, ext: string): void => {
  void renderer.exportPage(activePage(doc)).then((off) => {
    off.toBlob((b) => b && downloadBlob(b, `${baseName()}.${ext}`), mime, mime === 'image/png' ? undefined : exportQualityValue());
  });
};
document.querySelector<HTMLElement>('#export-menu [data-export-png]')?.addEventListener('click', () => { exportRaster('image/png', 'png'); exportMenu.hidden = true; });
document.querySelector<HTMLElement>('#export-menu [data-export-jpeg]')?.addEventListener('click', () => { exportRaster('image/jpeg', 'jpg'); exportMenu.hidden = true; });
document.querySelector<HTMLElement>('#export-menu [data-export-webp]')?.addEventListener('click', () => { exportRaster('image/webp', 'webp'); exportMenu.hidden = true; });
// assets individuales: un PNG por objeto seleccionado (export de assets)
document.querySelector<HTMLElement>('#export-menu [data-export-asset]')?.addEventListener('click', async () => {
  const objs = selectedObjs();
  for (const o of objs) {
    const off = await renderer.exportObj(o);
    off.toBlob((b) => b && downloadBlob(b, `${baseName()}-${o.name || o.id}.png`), 'image/png');
  }
  exportMenu.hidden = true;
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
    const title = p.querySelector<HTMLElement>('.panel-title')!;
    title.draggable = true;
    title.addEventListener('dragstart', () => p.classList.add('dragging'));
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

function remeasureText(o: TextObj): void {
  const m = measureText(canvas.getContext('2d')!, o.text, o.font, o.size, o.bold, o.italic);
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
    name: t('obj_text'),
    x: Math.round(wx),
    y: Math.round(wy),
    w: 1,
    h: 1,
    text: t('obj_text'),
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
  const hit = hitTest(activePage(doc), wx, wy, 4 / view.zoom, selectedIds);
  if (!hit || hit.shape !== 'text') return;
  const newText = window.prompt(t('text'), hit.text);
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

const RESIZE_CURSORS: Record<HandleRole, string> = {
  nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize',
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', rot: 'grab',
};

// ponytail: hit-test por pointermove, O(objetos) por movimiento; vale para documentos de tamaño normal
function hoverCursor(px: number, py: number, wx: number, wy: number): string {
  if (tool !== 'select') return 'crosshair';
  const page = activePage(doc);
  if ((page.guides ?? []).some((g) => Math.abs((g.axis === 'v' ? wx : wy) - g.pos) <= 5 / view.zoom)) return 'grab';
  const sel = findObj(page, selectedId);
  const h = sel ? hitHandle(px, py, handles(sel, view)) : null;
  if (h) return RESIZE_CURSORS[h.role];
  if (hitTest(page, wx, wy, 4 / view.zoom, selectedIds)) return 'move';
  return 'default';
}

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  const page = activePage(doc);

  if (e.button === 1 || e.altKey) {
    drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, panX: view.panX, panY: view.panY };
    canvas.style.cursor = 'grabbing';
    return;
  }

  const { px, py, wx, wy } = localXY(e);

  if (tool === 'text') {
    createTextObj(wx, wy); // como Fireworks: clic y a editar
    return;
  }

  if (tool === 'brush') {
    drag = { mode: 'paint', pts: [{ x: wx, y: wy, p: brush.pressure }] };
    invalidate();
    return;
  }

  if (tool === 'pencil') {
    drag = { mode: 'pencil', pts: [{ x: wx, y: wy }] };
    invalidate();
    return;
  }

  if (tool === 'polypen') {
    drag = { mode: 'polypen', pts: [{ x: wx, y: wy }] };
    invalidate();
    return;
  }

  if (tool === 'pen') {
    if (penPts.length >= 3 && Math.hypot(wx - penPts[0].x, wy - penPts[0].y) < 8 / view.zoom) {
      finishPen(); // clic sobre el primer vértice = cerrar
      return;
    }
    // modo curvo por defecto; Shift invierte el vértice (curvo↔recto)
    penPts.push({ x: wx, y: wy, c: e.shiftKey ? !penOpt.curved : penOpt.curved });
    draft = { x: 0, y: 0, w: 0, h: 0, shape: 'polygon', poly: penPts, smooth: penPts.some((p) => p.c) };
    invalidate();
    return;
  }

  if (tool === 'eraser') {
    const hit = hitTest(page, wx, wy, 4 / view.zoom);
    const obj = hit ? findObj(page, hit.id) : null;
    if (obj && obj.shape === 'bitmap') {
      eraserDrag = { obj, start: [...(obj.erase ?? [])], moved: false };
      drag = { mode: 'erase' };
      eraseAt(obj, wx, wy);
      invalidate();
      return;
    }
    return;
  }

  if (tool !== 'select') {
    drag = { mode: 'create', ox: wx, oy: wy };
    draft = { x: wx, y: wy, w: 0, h: 0, shape: tool, lineFrom: 'nw' };
    invalidate();
    return;
  }

  // guías manuales: arrastrar con V para mover
  const gi = (page.guides ?? []).findIndex((g) => Math.abs((g.axis === 'v' ? wx : wy) - g.pos) <= 5 / view.zoom);
  if (gi >= 0) {
    drag = { mode: 'guide', index: gi, startPos: page.guides![gi].pos };
    canvas.style.cursor = 'grabbing';
    return;
  }

  const sel = findObj(page, selectedId);
  const h = sel ? hitHandle(px, py, handles(sel, view)) : null;
  if (!h && selectedIds.length > 1) {
    // asas del bbox común: redimensionar todo el grupo a la vez
    const objs = selectedObjs();
    const gx = Math.min(...objs.map((o) => o.x)), gy = Math.min(...objs.map((o) => o.y));
    const gw = Math.max(...objs.map((o) => o.x + o.w)) - gx, gh0 = Math.max(...objs.map((o) => o.y + o.h)) - gy;
    const gh = handles({ ...objs[0], x: gx, y: gy, w: gw, h: gh0 } as Obj, view).filter((x) => x.role !== 'rot');
    const ghHit = hitHandle(px, py, gh);
    if (ghHit) {
      drag = {
        mode: 'groupresize',
        objs: objs.map((o) => ({ obj: o, start: { x: o.x, y: o.y, w: o.w, h: o.h } })),
        start: { x: gx, y: gy, w: gw, h: gh0 },
        role: ghHit.role,
        grab: { x: wx, y: wy },
      };
      canvas.style.cursor = RESIZE_CURSORS[ghHit.role];
      return;
    }
  }
  if (h && sel && h.role === 'rot') {
    const cx = sel.x + sel.w / 2, cy = sel.y + sel.h / 2;
    drag = { mode: 'rotate', obj: sel, startRot: sel.rot ?? 0, grabAngle: Math.atan2(wy - cy, wx - cx) };
    canvas.style.cursor = 'grab';
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
    canvas.style.cursor = RESIZE_CURSORS[h.role];
    return;
  }

  const hit = hitTest(page, wx, wy, 4 / view.zoom, e.shiftKey ? undefined : selectedIds); // margen constante en pantalla
  if (hit) {
    // Shift sobre un objeto ya seleccionado: no lo deselecta al empezar (rompería el drag);
    // el toggle aditivo se aplica en pointerup solo si no hubo movimiento
    const toggle = e.shiftKey && selectedIds.includes(hit.id) ? hit : null;
    if (e.shiftKey && !toggle) select(hit.id, true);
    else if (!selectedIds.includes(hit.id)) select(hit.id);
    drag = {
      mode: 'move',
      items: selectedObjs().map((o) => ({ obj: o, start: { x: o.x, y: o.y } })),
      grab: { x: wx, y: wy },
      moved: false,
      toggle,
    };
    canvas.style.cursor = 'move';
    invalidate();
    return;
  }

  select(null);
  drag = { mode: 'marquee', ox: wx, oy: wy, additive: e.shiftKey };
  invalidate();
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) {
    const { px, py, wx, wy } = localXY(e);
    canvas.style.cursor = hoverCursor(px, py, wx, wy);
    return;
  }

  if (drag.mode === 'pan') {
    view.panX = drag.panX + (e.clientX - drag.sx);
    view.panY = drag.panY + (e.clientY - drag.sy);
    invalidate();
    return;
  }

  if (drag.mode === 'guide') {
    const page = activePage(doc);
    const g = page.guides![drag.index];
    const { wx, wy } = localXY(e);
    g.pos = Math.round(g.axis === 'v' ? wx : wy);
    invalidate();
    return;
  }

  const { wx, wy } = localXY(e);

  if (drag.mode === 'paint') {
    const last = drag.pts[drag.pts.length - 1];
    // un punto cada ~2px de mundo: suficiente para una traza suave sin explotar el tamaño
    if (Math.hypot(wx - last.x, wy - last.y) > 2 / view.zoom)
      // presión real solo con lápiz; el ratón reporta 0.5 constante
      drag.pts.push({ x: wx, y: wy, p: e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : brush.pressure });
    invalidate();
    return;
  }

  if (drag.mode === 'pencil' || drag.mode === 'polypen') {
    const last = drag.pts[drag.pts.length - 1];
    if (Math.hypot(wx - last.x, wy - last.y) > 2 / view.zoom) {
      drag.pts.push({ x: wx, y: wy });
      draft = drag.mode === 'pencil'
        ? { x: 0, y: 0, w: 0, h: 0, shape: 'stroke', pts: drag.pts.map((p) => ({ x: p.x, y: p.y, p: 1 })), stroke: brushColor(), strokeWidth: pencil.size, brush: pencil.mode === 'smooth' ? 'round' : 'square', smooth: pencil.mode === 'smooth' }
        : { x: 0, y: 0, w: 0, h: 0, shape: 'polygon', poly: drag.pts, smooth: poly.mode === 'stylized' };
    }
    invalidate();
    return;
  }

  if (drag.mode === 'erase' && eraserDrag) {
    const last = eraserDrag.obj.erase?.[eraserDrag.obj.erase.length - 1];
    if (!last || Math.hypot(wx - (eraserDrag.obj.x + last.x * eraserDrag.obj.w), wy - (eraserDrag.obj.y + last.y * eraserDrag.obj.h)) > 4 / view.zoom) {
      eraseAt(eraserDrag.obj, wx, wy);
      eraserDrag.moved = true;
    }
    invalidate();
    return;
  }

  if (drag.mode === 'create' && draft) {
    draft = {
      x: Math.min(drag.ox, wx),
      y: Math.min(drag.oy, wy),
      w: Math.abs(wx - drag.ox),
      h: Math.abs(wy - drag.oy),
      shape: draft.shape,
      // desde qué esquina se arrastra: ↘='nw' ↖='se' ↗='sw' ↙='ne'
      lineFrom: (`${wy < drag.oy ? 'n' : 's'}${wx < drag.ox ? 'w' : 'e'}`) as LineFrom,
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
    let dx = wx - drag.grab.x;
    let dy = wy - drag.grab.y;
    // Shift = eje único: la primera dirección con movimiento real manda (como Fireworks)
    if (e.shiftKey && !drag.axis && (Math.abs(dx) > 2 || Math.abs(dy) > 2))
      drag.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    if (drag.axis === 'x') dy = 0;
    if (drag.axis === 'y') dx = 0;
    // smart guides: imán a bordes/centros de objetos visibles y de la página; Ctrl = movimiento libre
    const items = drag.items;
    const primary = items[0];
    const others = page.layers
      .filter((l) => l.visible)
      .flatMap((l) => l.objects)
      .filter((o) => !items.some((i) => i.obj === o))
      .map((o) => ({ x: o.x, y: o.y, w: o.w, h: o.h }));
    let snap: Snap = { dx: 0, dy: 0, guides: [] };
    if (!e.ctrlKey) {
      snap = snapBox(
        { x: primary.start.x + dx, y: primary.start.y + dy, w: primary.obj.w, h: primary.obj.h },
        others,
        { width: page.width, height: page.height, guides: page.guides },
        6 / view.zoom, // tolerancia constante en pantalla
      );
      if (drag.axis === 'x') snap.dy = 0;
      if (drag.axis === 'y') snap.dx = 0;
    }
    // solo se dibujan las líneas que referencian un objeto real (las de página/guías ya están en pantalla)
    guides = snap.guides.filter((g) => g.kind === 'obj');
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
    return;
  }

  if (drag.mode === 'groupresize') {
    // cada objeto se escala en la misma proporción del bbox común
    const dx = wx - drag.grab.x, dy = wy - drag.grab.y;
    const s = { ...drag.start };
    const target = { x: s.x, y: s.y, w: s.w, h: s.h };
    applyResize(target as Obj, drag.start, drag.role, dx, dy);
    const sx = target.w / Math.max(1, s.w), sy = target.h / Math.max(1, s.h);
    for (const it of drag.objs) {
      it.obj.x = Math.round(target.x + (it.start.x - s.x) * sx);
      it.obj.y = Math.round(target.y + (it.start.y - s.y) * sy);
      it.obj.w = Math.max(1, Math.round(it.start.w * sx));
      it.obj.h = Math.max(1, Math.round(it.start.h * sy));
    }
    invalidate();
  }
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const page = activePage(doc);
  const { wx, wy } = localXY(e);
  const gi = (page.guides ?? []).findIndex((g) => Math.abs((g.axis === 'v' ? wx : wy) - g.pos) <= 5 / view.zoom);
  if (gi >= 0) {
    const [g] = page.guides!.splice(gi, 1);
    history.record({
      label: 'eliminar guía',
      do: () => { const j = (page.guides ?? []).indexOf(g); if (j >= 0) page.guides!.splice(j, 1); },
      undo: () => (page.guides ??= []).splice(gi, 0, g),
    });
  } else {
    const axis: 'v' | 'h' = Math.abs(wx - page.width / 2) < Math.abs(wy - page.height / 2) ? 'v' : 'h';
    const g = { axis, pos: Math.round(axis === 'v' ? wx : wy) };
    history.run({
      label: 'crear guía',
      do: () => (page.guides ??= []).push(g),
      undo: () => { const j = (page.guides ?? []).indexOf(g); if (j >= 0) page.guides!.splice(j, 1); },
    });
  }
  persist();
  invalidate();
});

canvas.addEventListener('pointerup', (e) => {
  if (!drag) return;
  const page = activePage(doc);
  { const { px, py, wx, wy } = localXY(e); canvas.style.cursor = hoverCursor(px, py, wx, wy); }

  if (drag.mode === 'guide') {
    const g = page.guides![drag.index];
    const startPos = drag.startPos;
    if (g && g.pos !== startPos) {
      const end = g.pos;
      history.record({
        label: 'mover guía',
        do: () => { g.pos = end; },
        undo: () => { g.pos = startPos; },
      });
    }
    persist();
  }

  if (drag.mode === 'erase' && eraserDrag) {
    const { obj, start, moved } = eraserDrag;
    eraserDrag = null;
    if (moved) {
      const now = [...(obj.erase ?? [])];
      history.record({
        label: 'goma',
        do: () => { obj.erase = now; },
        undo: () => { obj.erase = start.length ? start : undefined; },
      });
      persist();
    }
  }

  if (drag.mode === 'groupresize') {
    const items = drag.objs.map((it) => ({ obj: it.obj, from: it.start, to: { x: it.obj.x, y: it.obj.y, w: it.obj.w, h: it.obj.h } }));
    history.record({
      label: 'redimensionar grupo',
      do: () => items.forEach((it) => Object.assign(it.obj, it.to)),
      undo: () => items.forEach((it) => Object.assign(it.obj, it.from)),
    });
    persist();
  } else if (drag.mode === 'paint') {
    guides = [];
    const pts = drag.pts;
    if (pts.length > 1) {
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const x0 = Math.min(...xs), y0 = Math.min(...ys);
      const w = Math.max(1, Math.max(...xs) - x0), h = Math.max(1, Math.max(...ys) - y0);
      const obj: ShapeObj = {
        id: uid(),
        shape: 'stroke',
        name: NAMES.stroke,
        x: Math.round(x0), y: Math.round(y0), w: Math.round(w), h: Math.round(h),
        fill: '',
        stroke: brushColor(),
        strokeWidth: brush.size,
        strokeOpacity: brush.opacity,
        brush: brush.shape,
        tip: brush.tip,
        points: pts.map((p) => ({ x: (p.x - x0) / w, y: (p.y - y0) / h, p: p.p })),
      };
      pushCreateCmd(obj);
    }
  } else if (drag.mode === 'pencil') {
    guides = [];
    draft = null;
    const pts = drag.pts;
    if (pts.length > 1) {
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const x0 = Math.min(...xs), y0 = Math.min(...ys);
      const w = Math.max(1, Math.max(...xs) - x0), h = Math.max(1, Math.max(...ys) - y0);
      const obj: ShapeObj = {
        id: uid(),
        shape: 'stroke',
        name: NAMES.stroke,
        x: Math.round(x0), y: Math.round(y0), w: Math.round(w), h: Math.round(h),
        fill: '',
        stroke: brushColor(),
        strokeWidth: pencil.size,
        points: pts.map((p) => ({ x: (p.x - x0) / w, y: (p.y - y0) / h, p: 1 })),
        smooth: pencil.mode === 'smooth',
      };
      pushCreateCmd(obj);
    }
  } else if (drag.mode === 'polypen') {
    guides = [];
    draft = null;
    let pts = drag.pts;
    if (pts.length > 2) {
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const x0 = Math.min(...xs), y0 = Math.min(...ys);
      const w = Math.max(1, Math.max(...xs) - x0), h = Math.max(1, Math.max(...ys) - y0);
      if (poly.mode === 'straight') pts = rdpSimplify(pts, Math.max(4, poly.width * 2));
      if (pts.length > 2) {
        const obj: ShapeObj = {
          id: uid(),
          shape: 'polygon',
          name: NAMES.polygon,
          x: Math.round(x0), y: Math.round(y0), w: Math.round(w), h: Math.round(h),
          fill: poly.noFill ? '' : poly.fill,
          stroke: poly.stroke,
          strokeWidth: poly.width,
          poly: pts.map((p) => ({ x: (p.x - x0) / w, y: (p.y - y0) / h })),
          smooth: poly.mode === 'stylized',
          dash: poly.dash ? [6, 4] : null,
        };
        pushCreateCmd(obj);
      }
    }
  } else if (drag.mode === 'create' && draft) {
    const d = draft;
    draft = null;
    guides = [];
    const big = isLineLike(d) ? Math.hypot(d.w, d.h) > 2 : d.w > 2 && d.h > 2;
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
          fill: isLineLike(d) ? '' : '#4f8cff',
          stroke: isLineLike(d) ? brushColor() : null,
          strokeWidth: d.shape === 'line' ? 2 : 0,
          lineFrom: d.lineFrom,
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
        if (obj.shape !== 'stroke') setTool('select'); // como Fireworks: tras dibujar, vuelve a la selección
        persist();
      }
    }
  } else if (drag.mode === 'move') {
    guides = [];
    if (drag.moved) {
      const items = drag.items.map((it) => ({ obj: it.obj, from: it.start, to: { x: it.obj.x, y: it.obj.y } }));
      history.record({
        label: 'mover',
        do: () => items.forEach((it) => Object.assign(it.obj, it.to)),
        undo: () => items.forEach((it) => Object.assign(it.obj, it.from)),
      });
      persist();
    } else if (drag.toggle) {
      select(drag.toggle.id, true); // Shift+clic sin mover = deselectar (toggle aditivo)
    }
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
          expandGroups();
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
    // recordar el último color usado: es el que pintan el pincel y las líneas
    const c = (patch as { stroke?: string | null }).stroke ?? (patch as { fill?: string }).fill;
    if (typeof c === 'string' && /^#[0-9a-f]{6,8}$/i.test(c)) lastStroke = c;
    history.run({
      label: 'editar',
      do: () => {
        Object.assign(obj, patch);
        if (obj.shape === 'text' && ('font' in patch || 'size' in patch || 'bold' in patch || 'italic' in patch)) remeasureText(obj);
      },
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
    if (selectedLayerId) layer.parent = selectedLayerId; // capa dentro de la capa seleccionada
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
  reorderLayer(layerId: string, targetId: string, mode: 'before' | 'after' | 'child'): void {
    const page = activePage(doc);
    const before = page.layers.map((l) => ({ id: l.id, parent: l.parent }));
    if (!reorderLayer(page, layerId, targetId, mode)) return;
    history.record({
      label: 'reordenar capa',
      do: () => {},
      undo: () => {
        for (const b of before) {
          const l = page.layers.find((x) => x.id === b.id);
          if (!l) continue;
          if (b.parent) l.parent = b.parent;
          else delete l.parent;
        }
        page.layers = before.map((b) => page.layers.find((l) => l.id === b.id)!).filter(Boolean);
      },
    });
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
  order(kind: 'front' | 'up' | 'down' | 'back'): void {
    const page = activePage(doc);
    const moves = selectedObjs().map((o) => {
      const li = page.layers.findIndex((l) => l.objects.includes(o));
      return { o, li, from: li >= 0 ? page.layers[li].objects.indexOf(o) : -1 };
    }).filter((m) => m.from >= 0);
    if (moves.length) {
      const apply = () => {
        for (const m of moves) {
          const arr = page.layers[m.li].objects;
          const i = arr.indexOf(m.o);
          if (i < 0) continue;
          arr.splice(i, 1);
          const j = kind === 'front' ? arr.length : kind === 'back' ? 0
            : kind === 'up' ? Math.min(i + 1, arr.length) : Math.max(i - 1, 0);
          arr.splice(j, 0, m.o);
        }
      };
      history.run({
        label: `orden ${kind}`,
        do: apply,
        undo: () => {
          for (const m of [...moves].reverse()) {
            const arr = page.layers[m.li].objects;
            const i = arr.indexOf(m.o);
            if (i >= 0) arr.splice(i, 1);
            arr.splice(m.from, 0, m.o);
          }
        },
      });
      persist();
    }
    invalidate();
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
  union(): void {
    const u = unionCmd(activePage(doc), selectedObjs());
    if (u) {
      history.run(u.cmd);
      select(u.result.id);
      persist();
    }
    invalidate();
  },
  editPage(patch: { width?: number; height?: number }): void {
    const page = activePage(doc);
    const before = { width: page.width, height: page.height };
    history.run({
      label: 'tamaño de página',
      do: () => Object.assign(page, patch),
      undo: () => Object.assign(page, before),
    });
    persist();
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
      name: `${t('default_page')} ${doc.pages.length + 1}`,
      width: base.width,
      height: base.height,
      layers: [{ id: uid(), name: t('default_layer'), visible: true, locked: false, opacity: 1, objects: [] }],
    };
    history.run({
      label: 'crear página',
      do: () => doc.pages.push(page),
      undo: () => {
        const i = doc.pages.indexOf(page);
        if (i >= 0) doc.pages.splice(i, 1);
        if (doc.activePageId === page.id) doc.activePageId = base.id;
      },
    });
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
    const page = doc.pages[i];
    const prevActive = doc.activePageId;
    history.run({
      label: 'eliminar página',
      do: () => {
        const j = doc.pages.indexOf(page);
        if (j >= 0) doc.pages.splice(j, 1);
        if (doc.activePageId === pageId) doc.activePageId = doc.pages[Math.max(0, j - 1)].id;
      },
      undo: () => {
        doc.pages.splice(i, 0, page);
        doc.activePageId = prevActive;
      },
    });
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
    history.run({
      label: 'crear estilo',
      do: () => doc.styles!.push(style),
      undo: () => {
        const i = doc.styles!.indexOf(style);
        if (i >= 0) doc.styles!.splice(i, 1);
      },
    });
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
          if (isLineLike(o)) Object.assign(o, { stroke: style.stroke, strokeWidth: style.strokeWidth });
          else Object.assign(o, patch);
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
      const style = doc.styles![i];
      history.run({
        label: 'eliminar estilo',
        do: () => {
          const j = doc.styles!.findIndex((s) => s.id === styleId);
          if (j >= 0) doc.styles!.splice(j, 1);
        },
        undo: () => doc.styles!.splice(i, 0, style),
      });
      persist();
      invalidate();
    }
  },
};

// ---- Zoom: control en la barra de estado (número editable + slider al pulsar el icono) ----
const zoomNum = document.getElementById('zoom-num') as HTMLInputElement;
const zoomRange = document.getElementById('zoom-range') as HTMLInputElement;
const zoomPop = document.getElementById('zoom-pop')!;
document.getElementById('zoom-btn')!.addEventListener('click', (e) => {
  e.stopPropagation();
  zoomPop.hidden = !zoomPop.hidden;
});
document.addEventListener('pointerdown', (e) => {
  if (!zoomPop.hidden && !zoomPop.contains(e.target as Node) && !(e.target as HTMLElement).closest?.('#zoom-ctl'))
    zoomPop.hidden = true;
});
function setZoom(z: number, keepCenter = true): void {
  const nz = Math.min(6.4, Math.max(0.05, z));
  if (!keepCenter) {
    view.zoom = nz;
    invalidate();
    return;
  }
  const cx = canvas.clientWidth / 2;
  const cy = canvas.clientHeight / 2;
  const before = screenToWorld(view, cx, cy);
  view.zoom = nz;
  const after = screenToWorld(view, cx, cy);
  view.panX += (after.x - before.x) * view.zoom;
  view.panY += (after.y - before.y) * view.zoom;
  invalidate();
}
zoomNum.addEventListener('change', () => {
  const v = Number(zoomNum.value);
  if (Number.isFinite(v) && v > 0) setZoom(v / 100);
});
zoomRange.addEventListener('input', () => setZoom(Number(zoomRange.value) / 100));

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
    if (!helpModal.hidden) {
      helpModal.hidden = true;
      return;
    }
    if (penPts.length) {
      penPts = [];
      draft = null;
      invalidate();
      return;
    }
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
  } else if (e.key === 'b' || e.key === 'B') {
    setTool('brush');
  } else if (e.key === 'p' || e.key === 'P') {
    setTool('pen');
  } else if (e.key === 'n' || e.key === 'N') {
    setTool('pencil');
  } else if (!mod && (e.key === 'g' || e.key === 'G')) {
    setTool('polypen');
  } else if (e.key === 'x' || e.key === 'X') {
    setTool('eraser');
  } else if (mod && (e.key === 'u' || e.key === 'U')) {
    e.preventDefault();
    const u = unionCmd(activePage(doc), selectedObjs());
    if (u) {
      history.run(u.cmd);
      select(u.result.id);
      persist();
      invalidate();
    }
  } else if (mod && (e.key === 'd' || e.key === 'D')) {
    e.preventDefault();
    const dup = duplicateCmd(activePage(doc), selectedObjs());
    if (dup) {
      history.run(dup.cmd);
      select(dup.clones[dup.clones.length - 1].id); // como Fireworks: la copia queda seleccionada
      persist();
      invalidate();
    }
  } else if (mod && (e.key === 'g' || e.key === 'G')) {
    e.preventDefault();
    const objs = selectedObjs();
    if (objs.length < 2) return;
    const ungroup = e.shiftKey;
    history.run(groupCmd(objs, ungroup ? undefined : uid()));
    if (ungroup) selectedIds = [selectedId ?? ''].filter(Boolean);
    persist();
    invalidate();
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
