import { activePage, type Doc, type Obj, type RectObj } from './model';
import { findObj } from './hit';
import type { View } from './view';

export interface PanelApi {
  editObj(obj: Obj, patch: Partial<RectObj>): void;
}

const $ = (id: string): HTMLElement => document.getElementById(id)!;

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

export function renderPanels(doc: Doc, selectedId: string | null, view: View, api: PanelApi): void {
  const page = activePage(doc);
  const obj = findObj(page, selectedId);

  // Inspector contextual: documento → objeto (como Fireworks).
  const insp = $('inspector-body');
  insp.innerHTML = '';
  if (!obj) {
    insp.innerHTML = `<span class="hint">${esc(doc.name)} · ${page.width}×${page.height} px</span>`;
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
        if (Number.isFinite(val)) api.editObj(obj, { [key]: val } as Partial<RectObj>);
      });
      wrap.appendChild(input);
      insp.appendChild(wrap);
    };
    num('x', 'X');
    num('y', 'Y');
    num('w', 'Ancho');
    num('h', 'Alto');

    const wrap = document.createElement('label');
    wrap.className = 'field';
    wrap.innerHTML = '<span>Relleno</span>';
    const color = document.createElement('input');
    color.type = 'color';
    color.value = obj.fill;
    color.addEventListener('change', () => api.editObj(obj, { fill: color.value }));
    wrap.appendChild(color);
    insp.appendChild(wrap);
  }

  // Capas (solo lectura en M0; edición completa en M1).
  const lb = $('layers-body');
  lb.innerHTML = '';
  for (const l of [...page.layers].reverse()) {
    const row = document.createElement('div');
    row.className = 'row' + (l.visible ? '' : ' off');
    row.textContent = `${l.name} · ${l.objects.length}`;
    lb.appendChild(row);
  }

  const pb = $('pages-body');
  pb.innerHTML = '';
  for (const p of doc.pages) {
    const row = document.createElement('div');
    row.className = 'row active';
    row.textContent = p.name;
    pb.appendChild(row);
  }

  const sel = obj ? ` · selección ${Math.round(obj.w)}×${Math.round(obj.h)}` : '';
  $('status').textContent = `${Math.round(view.zoom * 100)}%${sel}`;
}
