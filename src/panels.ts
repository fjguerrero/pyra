import { activePage, NO_FX, type BitmapObj, type Doc, type Fx, type Obj, type ShapeObj, type TextObj } from './model';
import { findObj } from './hit';
import type { View } from './view';
import { statusText, t } from './i18n';
import type { AlignKind } from './align';

export interface PanelApi {
  editObj(obj: Obj, patch: Partial<ShapeObj> | Partial<BitmapObj> | Partial<TextObj> | { fx: Fx }): void;
  editLayer(layerId: string, patch: { visible?: boolean; locked?: boolean; opacity?: number; name?: string }): void;
  selectLayer(layerId: string | null): void;
  addLayer(): void;
  removeLayer(layerId: string): void;
  moveLayer(layerId: string, delta: number): void;
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

function btn(cls: string, label: string, title: string, on: boolean, onClick: () => void): HTMLElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'iconbtn' + (cls ? ' ' + cls : '') + (on ? ' on' : '');
  b.textContent = label;
  b.title = title;
  b.setAttribute('aria-pressed', String(on));
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

const ALIGN_BUTTONS: [AlignKind, string, 'align_left' | 'align_hcenter' | 'align_right' | 'align_top' | 'align_vcenter' | 'align_bottom' | 'dist_h' | 'dist_v'][] = [
  ['left', '⇤', 'align_left'],
  ['hcenter', '↔', 'align_hcenter'],
  ['right', '⇥', 'align_right'],
  ['top', '⤒', 'align_top'],
  ['vcenter', '↕', 'align_vcenter'],
  ['bottom', '⤓', 'align_bottom'],
  ['hdist', '⇱', 'dist_h'],
  ['vdist', '⇲', 'dist_v'],
];

export function renderPanels(
  doc: Doc,
  selectedId: string | null,
  selectedLayerId: string | null,
  selectedIds: string[],
  view: View,
  api: PanelApi,
): void {
  const page = activePage(doc);
  const obj = findObj(page, selectedId);

  // ---- Property Inspector contextual: documento → objeto (como Fireworks) ----
  const insp = $('inspector-body');
  insp.innerHTML = '';
  if (!obj) {
    const layer = page.layers.find((l) => l.id === selectedLayerId) ?? null;
    if (layer) {
      const op = document.createElement('label');
      op.className = 'field';
      op.innerHTML = `<span>${t('layer_opacity')}</span>`;
      const rng = document.createElement('input');
      rng.type = 'range';
      rng.min = '0';
      rng.max = '1';
      rng.step = '0.01';
      rng.value = String(layer.opacity);
      rng.addEventListener('input', () => api.editLayer(layer.id, { opacity: Number(rng.value) }));
      op.appendChild(rng);
      insp.appendChild(op);
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
      const slider = (label: string, key: 'sat' | 'bri', min: number, max: number, step: number) => {
        const wrap = document.createElement('label');
        wrap.className = 'field';
        wrap.innerHTML = `<span>${label}</span>`;
        const rng = document.createElement('input');
        rng.type = 'range';
        rng.min = String(min);
        rng.max = String(max);
        rng.step = String(step);
        rng.value = String(obj[key]);
        rng.addEventListener('input', () => api.editObj(obj, { [key]: Number(rng.value) } as Partial<BitmapObj>));
        wrap.appendChild(rng);
        insp.appendChild(wrap);
      };
      slider(t('saturation'), 'sat', 0, 2, 0.05);
      slider(t('brightness'), 'bri', 0, 2, 0.05);

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

      const colorWrap = document.createElement('label');
      colorWrap.className = 'field';
      colorWrap.innerHTML = `<span>${t('color')}</span>`;
      const color = document.createElement('input');
      color.type = 'color';
      color.value = obj.fill;
      color.addEventListener('change', () => api.editObj(obj, { fill: color.value }));
      colorWrap.appendChild(color);
      insp.appendChild(colorWrap);
    } else {
      // una línea no se rellena: su color es el trazo
      const colorKey = obj.shape === 'line' ? 'stroke' : 'fill';
      const wrap = document.createElement('label');
      wrap.className = 'field';
      wrap.innerHTML = `<span>${obj.shape === 'line' ? t('stroke_color') : t('fill')}</span>`;
      const color = document.createElement('input');
      color.type = 'color';
      color.value = (obj[colorKey] as string) || '#000000';
      color.addEventListener('change', () => api.editObj(obj, { [colorKey]: color.value } as Partial<ShapeObj>));
      wrap.appendChild(color);
      insp.appendChild(wrap);
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
      if (obj.shape !== 'line') {
        const g = obj.gradient ?? null;
        insp.appendChild(btn('', g ? t('remove_gradient') : t('add_gradient'), t('gradient_hint'), false, () =>
          api.editObj(obj, { gradient: g ? null : { from: obj.fill, to: '#ffffff', angle: 0 } })));
        if (g) {
          const gradField = (label: string, value: string, onSet: (v: string) => void) => {
            const w = document.createElement('label');
            w.className = 'field';
            w.innerHTML = `<span>${label}</span>`;
            const c = document.createElement('input');
            c.type = 'color';
            c.value = value;
            c.addEventListener('change', () => onSet(c.value));
            w.appendChild(c);
            insp.appendChild(w);
          };
          gradField(t('gradient_from'), g.from, (v) => api.editObj(obj, { gradient: { ...g, from: v } }));
          gradField(t('gradient_to'), g.to, (v) => api.editObj(obj, { gradient: { ...g, to: v } }));
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
    const colorField = (label: string, value: string, onSet: (v: string) => void) => {
      const wrap = document.createElement('label');
      wrap.className = 'field';
      wrap.innerHTML = `<span>${label}</span>`;
      const input = document.createElement('input');
      input.type = 'color';
      input.value = value;
      input.addEventListener('change', () => onSet(input.value));
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
      colorField(t('shadow_color'), fx.shadow.color.slice(0, 7), (v) => editFx({ shadow: { ...fx.shadow!, color: v } }));
    }
    insp.appendChild(btn('', fx.glow ? t('remove_glow') : t('add_glow'), t('glow_hint'), Boolean(fx.glow), () =>
      editFx({ glow: fx.glow ? null : { blur: 12, color: '#4f8cff' } }),
    ));
    if (fx.glow) {
      numField(t('glow_blur'), fx.glow.blur, (v) => editFx({ glow: { ...fx.glow!, blur: Math.max(0, v) } }));
      colorField(t('glow_color'), fx.glow.color.slice(0, 7), (v) => editFx({ glow: { ...fx.glow!, color: v } }));
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
      row.appendChild(btn('danger', '×', t('delete_style'), false, () => api.removeStyle(s.id)));
      insp.appendChild(row);
    }
  }

  // ---- Alinear / distribuir: panel de la columna derecha (como Fireworks) ----
  const ab = $('align-body');
  ab.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'aligngrid';
  for (const [kind, glyph, titleKey] of ALIGN_BUTTONS) {
    grid.appendChild(btn('', glyph, t(titleKey), false, () => api.align(kind)));
  }
  ab.appendChild(grid);
  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = selectedIds.length >= 3 ? t('align_hint_multi') : t('align_hint_single');
  ab.appendChild(hint);

  // ---- Capas: completas (visibilidad, bloqueo, opacidad, orden, crear, borrar) ----
  const lb = $('layers-body');
  lb.innerHTML = '';
  for (const l of [...page.layers].reverse()) {
    const row = document.createElement('div');
    row.className =
      'row' + (l.visible ? '' : ' off') + (l.id === selectedLayerId ? ' active' : '');
    row.addEventListener('click', () => api.selectLayer(l.id === selectedLayerId ? null : l.id));

    row.appendChild(btn('', l.visible ? '👁' : '–', l.visible ? t('hide_layer') : t('show_layer'), l.visible, () => api.editLayer(l.id, { visible: !l.visible })));
    row.appendChild(btn('', l.locked ? '🔒' : '🔓', l.locked ? t('unlock_layer') : t('lock_layer'), l.locked, () => api.editLayer(l.id, { locked: !l.locked })));

    const name = document.createElement('span');
    name.className = 'row-name';
    name.textContent = `${l.name} · ${l.objects.length}`;
    name.title = t('rename_hint');
    name.addEventListener('dblclick', () => {
      const v = window.prompt(t('layer_name'), l.name);
      if (v && v.trim()) api.editLayer(l.id, { name: v.trim() });
    });
    row.appendChild(name);

    row.appendChild(btn('', '↑', 'Subir capa', false, () => api.moveLayer(l.id, 1)));
    row.appendChild(btn('', '↓', 'Bajar capa', false, () => api.moveLayer(l.id, -1)));
    row.appendChild(btn('danger', '✕', 'Eliminar capa', false, () => api.removeLayer(l.id)));
    lb.appendChild(row);
  }
  const addRow = document.createElement('div');
  addRow.className = 'rowbtn';
  addRow.appendChild(btn('', '＋ Nueva capa', 'Crear capa', false, () => api.addLayer()));
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
      row.appendChild(btn('danger', '✕', 'Eliminar página', false, () => api.removePage(p.id)));
    }
    pb.appendChild(row);
  }
  const prow = document.createElement('div');
  prow.className = 'rowbtn';
  prow.appendChild(btn('', '＋ Nueva página', 'Crear página', false, () => api.addPage()));
  pb.appendChild(prow);

  const n = selectedIds.length;
  $('status').textContent = statusText(Math.round(view.zoom * 100), obj ? obj.w : 0, obj ? obj.h : 0, n);
}
