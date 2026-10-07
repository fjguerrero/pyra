import { activePage, isLineLike, NO_FX, type BitmapObj, type BrushSettings, type Doc, type Fx, type Layer, type Obj, type ShapeObj, type TextObj } from './model';
import { findObj } from './hit';
import type { View } from './view';
import { statusText, t } from './i18n';
import { flattenLayers } from './layers';
import type { AlignKind } from './align';
import { icon, hasIcon } from './icons';
import { addCustom, addRecent, loadSwatches, moveSwatch, removeSwatch, type SwatchStore } from './swatches';

/** Ajustes del pincel cuando la herramienta activa es el pincel. */
export type BrushPanelArg = { s: BrushSettings; set: (patch: Partial<BrushSettings>) => void };

export interface PanelApi {
  editObj(obj: Obj, patch: Partial<ShapeObj> | Partial<BitmapObj> | Partial<TextObj> | { fx: Fx }): void;
  editLayer(layerId: string, patch: { visible?: boolean; locked?: boolean; opacity?: number; name?: string }): void;
  selectLayer(layerId: string | null): void;
  addLayer(): void;
  removeLayer(layerId: string): void;
  moveLayer(layerId: string, delta: number): void;
  reorderLayer(layerId: string, targetId: string, mode: 'before' | 'after' | 'child'): void;
  align(kind: AlignKind): void;
  selectPage(pageId: string): void;
  editPage(patch: { width?: number; height?: number }): void;
  addPage(): void;
  removePage(pageId: string): void;
  saveStyle(obj: Obj): void;
  applyStyle(styleId: string): void;
  removeStyle(styleId: string): void;
}

const $ = (id: string): HTMLElement => document.getElementById(id)!;

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

function btn(cls: string, label: string, title: string, on: boolean, onClick: () => void, iconName?: string): HTMLElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'iconbtn' + (cls ? ' ' + cls : '') + (on ? ' on' : '');
  if (iconName && hasIcon(iconName)) b.innerHTML = icon(iconName);
  else b.textContent = label;
  b.title = title;
  b.setAttribute('aria-pressed', String(on));
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

const ALIGN_BUTTONS: [AlignKind, string, 'align_left' | 'align_hcenter' | 'align_right' | 'align_top' | 'align_vcenter' | 'align_bottom' | 'dist_h' | 'dist_v'][] = [
  ['left', 'alignLeft', 'align_left'],
  ['hcenter', 'alignHCenter', 'align_hcenter'],
  ['right', 'alignRight', 'align_right'],
  ['top', 'alignTop', 'align_top'],
  ['vcenter', 'alignVCenter', 'align_vcenter'],
  ['bottom', 'alignBottom', 'align_bottom'],
  ['hdist', 'hdist', 'dist_h'],
  ['vdist', 'vdist', 'dist_v'],
];

// ---- Colores: selector con alfa + paletas (recientes / personalizados) ----
function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
  const h = hex.replace('#', '');
  const f = (s: string) => parseInt(s, 16);
  if (h.length === 8) return { r: f(h.slice(0, 2)), g: f(h.slice(2, 4)), b: f(h.slice(4, 6)), a: f(h.slice(6, 8)) / 255 };
  const s = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return { r: f(s.slice(0, 2)), g: f(s.slice(2, 4)), b: f(s.slice(4, 6)), a: 1 };
}

function colorField(label: string, value: string, onSet: (v: string) => void): void {
  const insp = $('inspector-body');
  const wrap = document.createElement('label');
  wrap.className = 'field color-field';
  wrap.innerHTML = `<span>${label}</span>`;
  const rgba = hexToRgba(value || '#000000');
  const base = `#${[rgba.r, rgba.g, rgba.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

  const picker = document.createElement('input');
  picker.type = 'color';
  picker.value = base;

  const alphaLabel = document.createElement('span');
  alphaLabel.textContent = 'α';
  wrap.appendChild(alphaLabel);
  const alpha = document.createElement('input');
  alpha.type = 'number';
  alpha.min = '0';
  alpha.max = '1';
  alpha.step = '0.05';
  alpha.value = String(Math.round(rgba.a * 100) / 100);
  alpha.title = t('alpha');

  const emit = (): void => {
    const a = Math.max(0, Math.min(1, Number(alpha.value)));
    const hex = Number.isFinite(a) && a < 1
      ? picker.value + Math.round(a * 255).toString(16).padStart(2, '0')
      : picker.value;
    onSet(hex);
    addRecent(loadSwatches(), hex);
  };
  picker.addEventListener('input', emit);
  alpha.addEventListener('change', emit);
  wrap.append(picker, alpha);
  insp.appendChild(wrap);
  swatchPalette(insp, base, (c) => {
    picker.value = c.slice(0, 7);
    alpha.value = c.length === 9 ? String(Math.round((parseInt(c.slice(7, 9), 16) / 255) * 100) / 100) : '1';
    onSet(c);
  });
}

function swatchPalette(insp: HTMLElement, current: string, pick: (color: string) => void): void {
  const store: SwatchStore = loadSwatches();
  const section = (title: string, list: SwatchStore['recent']) => {
    if (!list.length) return;
    insp.insertAdjacentHTML('beforeend', `<span class="hint">${title}</span>`);
    const row = document.createElement('div');
    row.className = 'swatches';
    for (const s of list) {
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'swatch';
      sw.style.background = s.color;
      sw.title = s.color;
      sw.draggable = true;
      sw.addEventListener('click', () => pick(s.color));
      sw.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData('text/plain', s.id);
        row.dataset.dragId = s.id;
      });
      sw.addEventListener('dragover', (e) => {
        e.preventDefault();
        sw.classList.add('drop-after');
      });
      sw.addEventListener('dragleave', () => sw.classList.remove('drop-after'));
      sw.addEventListener('drop', (e) => {
        e.preventDefault();
        sw.classList.remove('drop-after');
        const id = row.dataset.dragId || e.dataTransfer?.getData('text/plain');
        if (id) moveSwatch(store, id, s.id, true);
        renderNow();
      });
      row.appendChild(sw);
      const del = btn('danger', '×', t('remove_color'), false, () => {
        removeSwatch(store, s.id);
        renderNow();
      }, 'close');
      row.appendChild(del);
    }
    insp.appendChild(row);
  };
  section(t('recent_colors'), store.recent);
  section(t('custom_colors'), store.custom);
  insp.appendChild(btn('', t('add_color'), t('add_color'), false, () => {
    addCustom(store, current);
    renderNow();
  }, 'plus'));
}

/** Ajustes del pincel: tamaño/presión/opacidad + punta redonda/cuadrada + punta imagen. */
function brushFields(s: BrushSettings, set: (patch: Partial<BrushSettings>) => void, withPressure: boolean): void {
  const insp = $('inspector-body');
  sliderField(t('brush_size'), s.size, 1, 200, 1, (v) => set({ size: Math.max(1, Math.round(v)) }));
  if (withPressure) sliderField(t('brush_pressure'), s.pressure, 0.05, 1, 0.05, (v) => set({ pressure: v }));
  sliderField(t('brush_opacity'), s.opacity, 0.05, 1, 0.05, (v) => set({ opacity: v }));
  const row = document.createElement('div');
  row.className = 'field';
  row.append(
    btn('', t('brush_round'), t('brush_round'), s.shape !== 'square', () => set({ shape: 'round' }), 'brushRound'),
    btn('', t('brush_square'), t('brush_square'), s.shape === 'square', () => set({ shape: 'square' }), 'brushSquare'),
  );
  insp.appendChild(row);
  if (s.tip) insp.appendChild(btn('', t('brush_tip_none'), t('brush_tip_none'), false, () => set({ tip: null }), 'close'));
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'image/svg+xml,image/*';
  file.title = t('brush_tip');
  file.addEventListener('change', () => {
    const f = file.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => set({ tip: String(r.result) });
    r.readAsDataURL(f);
  });
  insp.appendChild(file);
}

function renderBrushPanel(bp: BrushPanelArg): void {
  brushFields(bp.s, bp.set, true);
}

let renderNow: () => void = () => {};

// slider + campo numérico: siempre editable a mano
function sliderField(label: string, value: number, min: number, max: number, step: number, onSet: (v: number) => void): void {
  const insp = $('inspector-body');
  const wrap = document.createElement('label');
  wrap.className = 'field';
  wrap.innerHTML = `<span>${label}</span>`;
  const rng = document.createElement('input');
  rng.type = 'range';
  rng.min = String(min);
  rng.max = String(max);
  rng.step = String(step);
  rng.value = String(value);
  const num = document.createElement('input');
  num.type = 'number';
  num.min = String(min);
  num.max = String(max);
  num.step = String(step);
  num.value = String(value);
  rng.addEventListener('input', () => {
    num.value = rng.value;
    onSet(Number(rng.value));
  });
  num.addEventListener('change', () => {
    const v = Number(num.value);
    if (Number.isFinite(v)) {
      rng.value = String(Math.max(min, Math.min(max, v)));
      onSet(v);
    }
  });
  wrap.append(rng, num);
  insp.appendChild(wrap);
}

export function renderPanels(
  doc: Doc,
  selectedId: string | null,
  selectedLayerId: string | null,
  selectedIds: string[],
  view: View,
  api: PanelApi,
  brushPanel?: BrushPanelArg,
): void {
  const page = activePage(doc);
  const obj = findObj(page, selectedId);

  renderNow = () => renderPanels(doc, selectedId, selectedLayerId, selectedIds, view, api, brushPanel);

  // ---- Property Inspector contextual: pincel → documento → objeto (como Fireworks) ----
  const insp = $('inspector-body');
  insp.innerHTML = '';
  if (brushPanel && !obj) {
    renderBrushPanel(brushPanel);
    return;
  }
  if (!obj) {
    const layer = page.layers.find((l) => l.id === selectedLayerId) ?? null;
    if (layer) {
      sliderField(t('layer_opacity'), layer.opacity, 0, 1, 0.01, (v) => api.editLayer(layer.id, { opacity: v }));
      insp.insertAdjacentHTML('beforeend', `<span class="hint">${esc(layer.name)}</span>`);
    } else {
      insp.insertAdjacentHTML(
        'beforeend',
        `<span class="hint">${esc(doc.name)} · ${page.name}</span>`,
      );
      const num = (key: 'width' | 'height', label: string) => {
        const wrap = document.createElement('label');
        wrap.className = 'field';
        wrap.innerHTML = `<span>${label}</span>`;
        const input = document.createElement('input');
        input.type = 'number';
        input.value = String(page[key]);
        input.addEventListener('change', () => {
          const val = Number(input.value);
          if (input.value.trim() !== '' && Number.isFinite(val) && val > 0) api.editPage({ [key]: Math.round(val) });
        });
        wrap.appendChild(input);
        insp.appendChild(wrap);
      };
      num('width', t('page_width'));
      num('height', t('page_height'));
    }
  } else {
    const num = (key: 'x' | 'y' | 'w' | 'h', label: string) => {
      const wrap = document.createElement('label');
      wrap.className = 'field';
      wrap.innerHTML = `<span>${label}</span>`;
      const input = document.createElement('input');
      input.type = 'number';
      input.value = String(Math.round(obj[key]));
      input.addEventListener('change', () => {
        const val = Number(input.value);
        // campo vacío o no numérico: no mueve el objeto a 0
        if (input.value.trim() !== '' && Number.isFinite(val)) api.editObj(obj, { [key]: val } as Partial<ShapeObj>);
      });
      wrap.appendChild(input);
      insp.appendChild(wrap);
    };
    num('x', 'X');
    num('y', 'Y');
    num('w', t('width'));
    num('h', t('height'));

    if (obj.shape === 'bitmap') {
      sliderField(t('saturation'), obj.sat, 0, 2, 0.05, (v) => api.editObj(obj, { sat: v } as Partial<BitmapObj>));
      sliderField(t('brightness'), obj.bri, 0, 2, 0.05, (v) => api.editObj(obj, { bri: v } as Partial<BitmapObj>));

      // recorte en píxeles de la fuente original; campos vacíos = imagen completa
      const cropInputs: Record<'x' | 'y' | 'w' | 'h', HTMLInputElement> = { x: null!, y: null!, w: null!, h: null! };
      const applyCrop = (): void => {
        const c = { x: Number(cropInputs.x.value), y: Number(cropInputs.y.value), w: Number(cropInputs.w.value), h: Number(cropInputs.h.value) };
        if (Object.values(c).every(Number.isFinite) && c.w > 0 && c.h > 0) api.editObj(obj, { crop: c });
      };
      for (const [key, label] of [['x', t('crop_x')], ['y', t('crop_y')], ['w', t('crop_w')], ['h', t('crop_h')]] as const) {
        const wrap = document.createElement('label');
        wrap.className = 'field';
        wrap.innerHTML = `<span>${label}</span>`;
        const input = document.createElement('input');
        input.type = 'number';
        input.value = obj.crop ? String(obj.crop[key]) : '';
        input.placeholder = t('show_full_image');
        input.addEventListener('change', applyCrop);
        cropInputs[key] = input;
        wrap.appendChild(input);
        insp.appendChild(wrap);
      }
      insp.appendChild(btn('', t('remove_crop'), t('show_full_image'), false, () => api.editObj(obj, { crop: null })));
    } else if (obj.shape === 'text') {
      const taWrap = document.createElement('label');
      taWrap.className = 'field';
      taWrap.innerHTML = `<span>${t('text')}</span>`;
      const ta = document.createElement('textarea');
      ta.value = obj.text;
      ta.rows = 3;
      ta.addEventListener('change', () => api.editObj(obj, { text: ta.value }));
      taWrap.appendChild(ta);
      insp.appendChild(taWrap);

      const sizeWrap = document.createElement('label');
      sizeWrap.className = 'field';
      sizeWrap.innerHTML = `<span>${t('size')}</span>`;
      const size = document.createElement('input');
      size.type = 'number';
      size.min = '1';
      size.value = String(obj.size);
      size.addEventListener('change', () => {
        const v = Number(size.value);
        if (Number.isFinite(v) && v >= 1) api.editObj(obj, { size: v });
      });
      sizeWrap.appendChild(size);
      insp.appendChild(sizeWrap);

      colorField(t('color'), obj.fill, (v) => api.editObj(obj, { fill: v }));
    } else {
      // una línea no se rellena: su color es el trazo
      const colorKey = isLineLike(obj) ? 'stroke' : 'fill';
      colorField(isLineLike(obj) ? t('stroke_color') : t('fill'), (obj[colorKey] as string) || '#000000', (v) => api.editObj(obj, { [colorKey]: v } as Partial<ShapeObj>));
      if (isLineLike(obj)) {
        // el pincel del objeto: tamaño = grosor del trazo
        brushFields(
          { size: obj.strokeWidth, pressure: 1, opacity: obj.strokeOpacity ?? 1, shape: obj.brush ?? 'round', tip: obj.tip ?? null },
          (patch) => api.editObj(obj, {
            ...(patch.size !== undefined ? { strokeWidth: patch.size } : {}),
            ...(patch.opacity !== undefined ? { strokeOpacity: patch.opacity } : {}),
            ...(patch.shape !== undefined ? { brush: patch.shape } : {}),
            ...(patch.tip !== undefined ? { tip: patch.tip } : {}),
          } as Partial<ShapeObj>),
          false,
        );
      }
      const rotWrap = document.createElement('label');
      rotWrap.className = 'field';
      rotWrap.innerHTML = `<span>${t('rotation')}</span>`;
      const rotInput = document.createElement('input');
      rotInput.type = 'number';
      rotInput.value = String(obj.rot ?? 0);
      rotInput.addEventListener('change', () => api.editObj(obj, { rot: Number(rotInput.value) } as Partial<ShapeObj>));
      rotWrap.appendChild(rotInput);
      insp.appendChild(rotWrap);


      // ---- Degradado lineal (solo formas con relleno) ----
      if (!isLineLike(obj)) {
        const g = obj.gradient ?? null;
        insp.appendChild(btn('', g ? t('remove_gradient') : t('add_gradient'), t('gradient_hint'), false, () =>
          api.editObj(obj, { gradient: g ? null : { from: obj.fill, to: '#ffffff', angle: 0 } })));
        if (g) {
          colorField(t('gradient_from'), g.from, (v) => api.editObj(obj, { gradient: { ...g, from: v } }));
          colorField(t('gradient_to'), g.to, (v) => api.editObj(obj, { gradient: { ...g, to: v } }));
          const angleWrap = document.createElement('label');
          angleWrap.className = 'field';
          angleWrap.innerHTML = `<span>${t('angle')}</span>`;
          const angle = document.createElement('input');
          angle.type = 'number';
          angle.value = String(g.angle);
          angle.addEventListener('change', () => api.editObj(obj, { gradient: { ...g, angle: Number(angle.value) } }));
          angleWrap.appendChild(angle);
          insp.appendChild(angleWrap);
        }
      }
    }

    // ---- Efectos en vivo (M5): válidos para cualquier objeto ----
    const fx: Fx = obj.fx ?? { ...NO_FX };
    const editFx = (patch: Partial<Fx>): void => api.editObj(obj, { fx: { ...fx, ...patch } });
    insp.insertAdjacentHTML('beforeend', `<span class="hint">${t('live_effects')}</span>`);
    const numField = (label: string, value: number, onSet: (v: number) => void) => {
      const wrap = document.createElement('label');
      wrap.className = 'field';
      wrap.innerHTML = `<span>${label}</span>`;
      const input = document.createElement('input');
      input.type = 'number';
      input.value = String(value);
      input.addEventListener('change', () => {
        const v = Number(input.value);
        if (Number.isFinite(v)) onSet(v);
      });
      wrap.appendChild(input);
      insp.appendChild(wrap);
    };
    numField(t('blur'), fx.blur, (v) => editFx({ blur: Math.max(0, v) }));
    insp.appendChild(btn('', fx.shadow ? t('remove_shadow') : t('add_shadow'), t('shadow_hint'), Boolean(fx.shadow), () =>
      editFx({ shadow: fx.shadow ? null : { x: 4, y: 4, blur: 8, color: '#00000080' } }),
    ));
    if (fx.shadow) {
      numField(t('shadow_x'), fx.shadow.x, (v) => editFx({ shadow: { ...fx.shadow!, x: v } }));
      numField(t('shadow_y'), fx.shadow.y, (v) => editFx({ shadow: { ...fx.shadow!, y: v } }));
      numField(t('shadow_blur'), fx.shadow.blur, (v) => editFx({ shadow: { ...fx.shadow!, blur: Math.max(0, v) } }));
      colorField(t('shadow_color'), fx.shadow.color, (v) => editFx({ shadow: { ...fx.shadow!, color: v } }));
    }
    insp.appendChild(btn('', fx.glow ? t('remove_glow') : t('add_glow'), t('glow_hint'), Boolean(fx.glow), () =>
      editFx({ glow: fx.glow ? null : { blur: 12, color: '#4f8cff' } }),
    ));
    if (fx.glow) {
      numField(t('glow_blur'), fx.glow.blur, (v) => editFx({ glow: { ...fx.glow!, blur: Math.max(0, v) } }));
      colorField(t('glow_color'), fx.glow.color, (v) => editFx({ glow: { ...fx.glow!, color: v } }));
    }

    // ---- Styles (M5): paquetes reutilizables de aspecto, como Fireworks ----
    insp.insertAdjacentHTML('beforeend', `<span class="hint">${t('styles')}</span>`);
    insp.appendChild(btn('', t('save_style'), t('save_style_hint'), false, () => api.saveStyle(obj)));
    for (const s of doc.styles ?? []) {
      const row = document.createElement('div');
      row.className = 'row';
      const swatch = document.createElement('span');
      swatch.style.cssText = `width:14px;height:14px;border-radius:3px;flex:none;background:${s.gradient ? `linear-gradient(90deg, ${s.gradient.from}, ${s.gradient.to})` : s.fill}`;
      const name = document.createElement('span');
      name.className = 'row-name';
      name.textContent = s.name;
      row.append(swatch, name);
      row.addEventListener('click', () => api.applyStyle(s.id));
      const ds = btn('danger', '', t('delete_style'), false, () => api.removeStyle(s.id), 'close');
      ds.dataset.act = 'delstyle';
      row.appendChild(ds);
      insp.appendChild(row);
    }
  }

  // ---- Alinear / distribuir: panel de la columna derecha (como Fireworks) ----
  const ab = $('align-body');
  ab.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'aligngrid';
  for (const [kind, iconName, titleKey] of ALIGN_BUTTONS) {
    if (kind === 'hdist') grid.insertAdjacentHTML('beforeend', '<span class="asep"></span>');
    const ab2 = btn('', '', t(titleKey), false, () => api.align(kind), iconName);
    ab2.dataset.align = kind;
    grid.appendChild(ab2);
  }
  ab.appendChild(grid);
  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = selectedIds.length >= 3 ? t('align_hint_multi') : t('align_hint_single');
  ab.appendChild(hint);

  // ---- Capas: completas (visibilidad, bloqueo, opacidad, orden, crear, borrar) ----
  const lb = $('layers-body');
  lb.innerHTML = '';
  // árbol de capas (padre arriba, hijos indentados debajo), como Fireworks
  const flat = flattenLayers(page.layers);
  const depthOf = (l: Layer): number => {
    let d = 0;
    let cur = l;
    while (cur.parent) {
      const p = page.layers.find((x) => x.id === cur.parent);
      if (!p) break;
      d++;
      cur = p;
    }
    return d;
  };
  let dragId: string | null = null;
  for (const l of [...flat].reverse()) {
    const depth = depthOf(l);
    const row = document.createElement('div');
    row.className =
      'row' + (l.visible ? '' : ' off') + (l.id === selectedLayerId ? ' active' : '');
    row.draggable = true;
    row.dataset.layerId = l.id;
    row.style.paddingLeft = `${8 + depth * 18}px`;
    if (depth > 0) {
      const guide = document.createElement('span');
      guide.textContent = '⌞ ';
      guide.style.color = 'var(--dim)';
      row.prepend(guide);
    }
    row.addEventListener('click', () => api.selectLayer(l.id === selectedLayerId ? null : l.id));
    row.addEventListener('dragstart', (e) => {
      dragId = l.id;
      e.dataTransfer?.setData('text/plain', l.id);
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => {
      dragId = null;
      row.classList.remove('dragging');
      lb.querySelectorAll('.drop-before,.drop-after,.drop-child').forEach((el) =>
        el.classList.remove('drop-before', 'drop-after', 'drop-child'),
      );
    });
    row.addEventListener('dragover', (e) => {
      if (!dragId || dragId === l.id) return;
      e.preventDefault();
      const r = row.getBoundingClientRect();
      const f = (e.clientY - r.top) / r.height;
      const mode = f < 0.3 ? 'before' : f > 0.7 ? 'after' : 'child';
      row.classList.remove('drop-before', 'drop-after', 'drop-child');
      row.classList.add(`drop-${mode}`);
    });
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!dragId || dragId === l.id) return;
      const r = row.getBoundingClientRect();
      const f = (e.clientY - r.top) / r.height;
      const mode = f < 0.3 ? 'before' : f > 0.7 ? 'after' : 'child';
      api.reorderLayer(dragId, l.id, mode);
      dragId = null;
    });

    const vb = btn('', '', l.visible ? t('hide_layer') : t('show_layer'), l.visible, () => api.editLayer(l.id, { visible: !l.visible }), l.visible ? 'eye' : 'eyeOff');
    vb.dataset.act = 'visible';
    row.appendChild(vb);
    const lb2 = btn('', '', l.locked ? t('unlock_layer') : t('lock_layer'), l.locked, () => api.editLayer(l.id, { locked: !l.locked }), l.locked ? 'lock' : 'unlock');
    lb2.dataset.act = 'locked';
    row.appendChild(lb2);

    const name = document.createElement('span');
    name.className = 'row-name';
    name.textContent = `${l.name} · ${l.objects.length}`;
    name.title = t('rename_hint');
    name.addEventListener('dblclick', () => {
      const v = window.prompt(t('layer_name'), l.name);
      if (v && v.trim()) api.editLayer(l.id, { name: v.trim() });
    });
    row.appendChild(name);

    for (const [act, ic, title, fn] of [
      ['up', 'up', t('move_up'), () => api.moveLayer(l.id, 1)],
      ['down', 'down', t('move_down'), () => api.moveLayer(l.id, -1)],
      ['del', 'close', t('delete_layer'), () => api.removeLayer(l.id)],
    ] as const) {
      const b = btn(act === 'del' ? 'danger' : '', '', title, false, fn, ic);
      b.dataset.act = act;
      row.appendChild(b);
    }
    lb.appendChild(row);
  }
  const addRow = document.createElement('div');
  addRow.className = 'rowbtn';
  const addBtn = btn('', t('new_layer'), t('create_layer'), false, () => api.addLayer(), 'plus');
  addBtn.dataset.act = 'add';
  addRow.appendChild(addBtn);
  lb.appendChild(addRow);

  // ---- Páginas ----
  const pb = $('pages-body');
  pb.innerHTML = '';
  for (const p of doc.pages) {
    const row = document.createElement('div');
    row.className = 'row' + (p.id === page.id ? ' active' : '');
    row.textContent = p.name;
    row.addEventListener('click', () => api.selectPage(p.id));
    if (doc.pages.length > 1) {
      const dp = btn('danger', '', t('delete_page'), false, () => api.removePage(p.id), 'close');
      dp.dataset.act = 'delpage';
      row.appendChild(dp);
    }
    pb.appendChild(row);
  }
  const prow = document.createElement('div');
  prow.className = 'rowbtn';
  const ap = btn('', t('new_page'), t('create_page'), false, () => api.addPage(), 'plus');
  ap.dataset.act = 'addpage';
  prow.appendChild(ap);
  pb.appendChild(prow);

  const n = selectedIds.length;
  const target = document.getElementById('status-text') ?? $('status');
  target.textContent = statusText(Math.round(view.zoom * 100), obj ? obj.w : 0, obj ? obj.h : 0, n);
  const zoomPct = String(Math.round(view.zoom * 100));
  const zn = document.getElementById('zoom-num') as HTMLInputElement | null;
  const zr = document.getElementById('zoom-range') as HTMLInputElement | null;
  if (zn && document.activeElement !== zn) zn.value = zoomPct;
  if (zr) zr.value = zoomPct;
}
