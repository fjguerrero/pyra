import { activePage, type Doc, type Obj, type ShapeObj } from './model';
import { findObj } from './hit';
import type { View } from './view';
import type { AlignKind } from './align';

export interface PanelApi {
  editObj(obj: Obj, patch: Partial<ShapeObj>): void;
  editLayer(layerId: string, patch: { visible?: boolean; locked?: boolean; opacity?: number; name?: string }): void;
  selectLayer(layerId: string | null): void;
  addLayer(): void;
  removeLayer(layerId: string): void;
  moveLayer(layerId: string, delta: number): void;
  align(kind: AlignKind): void;
  selectPage(pageId: string): void;
  addPage(): void;
  removePage(pageId: string): void;
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

const ALIGN_BUTTONS: [AlignKind, string, string][] = [
  ['left', '⇤', 'Alinear a la izquierda'],
  ['hcenter', '↔', 'Centrar horizontalmente'],
  ['right', '⇥', 'Alinear a la derecha'],
  ['top', '⤒', 'Alinear arriba'],
  ['vcenter', '↕', 'Centrar verticalmente'],
  ['bottom', '⤓', 'Alinear abajo'],
  ['hdist', '⇱', 'Distribuir horizontalmente'],
  ['vdist', '⇲', 'Distribuir verticalmente'],
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
      op.innerHTML = '<span>Opacidad capa</span>';
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
        `<span class="hint">${esc(doc.name)} · ${page.name} · ${page.width}×${page.height} px</span>`,
      );
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
    num('w', 'Ancho');
    num('h', 'Alto');

    // una línea no se rellena: su color es el trazo
    const colorKey = obj.shape === 'line' ? 'stroke' : 'fill';
    const wrap = document.createElement('label');
    wrap.className = 'field';
    wrap.innerHTML = `<span>${obj.shape === 'line' ? 'Color trazo' : 'Relleno'}</span>`;
    const color = document.createElement('input');
    color.type = 'color';
    color.value = (obj[colorKey] as string) || '#000000';
    color.addEventListener('change', () => api.editObj(obj, { [colorKey]: color.value } as Partial<ShapeObj>));
    wrap.appendChild(color);
    insp.appendChild(wrap);
  }

  // ---- Alinear / distribuir: panel de la columna derecha (como Fireworks) ----
  const ab = $('align-body');
  ab.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'aligngrid';
  for (const [kind, glyph, title] of ALIGN_BUTTONS) {
    grid.appendChild(btn('', glyph, title, false, () => api.align(kind)));
  }
  ab.appendChild(grid);
  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = selectedIds.length >= 3 ? 'Distribuir reparte el hueco por igual' : 'Con 1 objeto se alinea a la página; con 2+, al grupo';
  ab.appendChild(hint);

  // ---- Capas: completas (visibilidad, bloqueo, opacidad, orden, crear, borrar) ----
  const lb = $('layers-body');
  lb.innerHTML = '';
  for (const l of [...page.layers].reverse()) {
    const row = document.createElement('div');
    row.className =
      'row' + (l.visible ? '' : ' off') + (l.id === selectedLayerId ? ' active' : '');
    row.addEventListener('click', () => api.selectLayer(l.id === selectedLayerId ? null : l.id));

    row.appendChild(btn('', l.visible ? '👁' : '–', l.visible ? 'Ocultar capa' : 'Mostrar capa', l.visible, () => api.editLayer(l.id, { visible: !l.visible })));
    row.appendChild(btn('', l.locked ? '🔒' : '🔓', l.locked ? 'Desbloquear capa' : 'Bloquear capa', l.locked, () => api.editLayer(l.id, { locked: !l.locked })));

    const name = document.createElement('span');
    name.className = 'row-name';
    name.textContent = `${l.name} · ${l.objects.length}`;
    name.title = 'Doble clic para renombrar';
    name.addEventListener('dblclick', () => {
      const v = window.prompt('Nombre de la capa', l.name);
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
  const sel = obj ? ` · selección ${Math.round(obj.w)}×${Math.round(obj.h)}${n > 1 ? ` (${n} objetos)` : ''}` : '';
  $('status').textContent = `${Math.round(view.zoom * 100)}%${sel}`;
}
