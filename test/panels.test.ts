// @vitest-environment jsdom
// Tests de renderPanels: cada control del panel debe existir, ser un <button> real y
// invocar la acción correcta con los argumentos correctos. Escrito desde la especificación
// de la UI (Fireworks), no desde cómo está implementado panels.ts.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderPanels, type PanelApi } from '../src/panels';
import { activePage, newDoc, uid, type Doc, type ShapeObj } from '../src/model';
import type { View } from '../src/view';

function rect(x: number, y: number, w: number, h: number, name = 'r'): ShapeObj {
  return { id: uid(), shape: 'rect', name, x, y, w, h, fill: '#000000', stroke: null, strokeWidth: 0 };
}

function fixture(): { doc: Doc; view: View; api: PanelApi; calls: string[] } {
  const doc = newDoc('panel-test');
  const page = activePage(doc);
  page.layers[0].objects.push(rect(10, 20, 30, 40, 'A'), rect(100, 100, 50, 60, 'B'));
  const view: View = { zoom: 0.5, panX: 12, panY: 34 };
  const calls: string[] = [];
  const api: PanelApi = {
    editObj: vi.fn((o, p) => calls.push(`editObj:${o.name}:${JSON.stringify(p)}`)),
    editLayer: vi.fn((_id, p) => calls.push(`editLayer:${JSON.stringify(Object.keys(p))}`)),
    selectLayer: vi.fn((_id) => calls.push('selectLayer')),
    addLayer: vi.fn(() => calls.push('addLayer')),
    removeLayer: vi.fn(() => calls.push('removeLayer')),
    moveLayer: vi.fn((_id, d) => calls.push(`moveLayer:${d}`)),
    align: vi.fn((k) => calls.push(`align:${k}`)),
    selectPage: vi.fn((_id) => calls.push('selectPage')),
    addPage: vi.fn(() => calls.push('addPage')),
    removePage: vi.fn(() => calls.push('removePage')),
  };
  return { doc, view, api, calls };
}

function mount(doc: Doc, selectedId: string | null, selectedLayerId: string | null, selectedIds: string[], view: View, api: PanelApi): void {
  document.body.innerHTML = `
    <div id="inspector"><div id="inspector-body"></div></div>
    <div id="align-body"></div>
    <div id="layers-body"></div>
    <div id="pages-body"></div>
    <div id="status"></div>`;
  renderPanels(doc, selectedId, selectedLayerId, selectedIds, view, api);
}

const buttonsIn = (sel: string): HTMLButtonElement[] =>
  [...document.querySelectorAll<HTMLButtonElement>(`${sel} button`)];

const clickByText = (sel: string, text: string): void => {
  const b = buttonsIn(sel).find((x) => x.textContent === text);
  if (!b) throw new Error(`botón ${JSON.stringify(text)} no encontrado en ${sel}`);
  b.click();
};

describe('Alinear: 8 botones reales, uno por cada operación', () => {
  const EXPECTED: [string, string][] = [
    ['⇤', 'left'],
    ['↔', 'hcenter'],
    ['⇥', 'right'],
    ['⤒', 'top'],
    ['↕', 'vcenter'],
    ['⤓', 'bottom'],
    ['⇱', 'hdist'],
    ['⇲', 'vdist'],
  ];

  it('existen exactamente 8 botones y son <button> con aria-pressed', () => {
    const f = fixture();
    mount(f.doc, null, null, [], f.view, f.api);
    const bs = buttonsIn('#align-body');
    expect(bs.length).toBe(8);
    expect(bs.every((b) => b.tagName === 'BUTTON' && b.type === 'button')).toBe(true);
    expect(bs.every((b) => b.hasAttribute('aria-pressed'))).toBe(true);
    expect(bs.every((b) => b.title.length > 0)).toBe(true);
  });

  it.each(EXPECTED)('el botón %s invoca align(%s)', (glyph, kind) => {
    const f = fixture();
    mount(f.doc, null, null, [], f.view, f.api);
    clickByText('#align-body', glyph);
    expect(f.api.align).toHaveBeenCalledWith(kind);
  });

  it('pulsar un botón de alinear no dispara además la fila de capa que lo contiene', () => {
    const f = fixture();
    mount(f.doc, null, null, [], f.view, f.api);
    clickByText('#align-body', '⇤');
    expect(f.api.selectLayer).not.toHaveBeenCalled();
  });
});

describe('Capas: cada fila expone visibilidad, bloqueo, orden y borrado', () => {
  it('renderiza una fila por capa, de la superior a la inferior (orden del panel invertido)', () => {
    const f = fixture();
    const page = activePage(f.doc);
    page.layers.push(
      { id: uid(), name: 'L1', visible: true, locked: false, opacity: 1, objects: [] },
      { id: uid(), name: 'L2', visible: true, locked: false, opacity: 1, objects: [] },
    );
    mount(f.doc, null, null, [], f.view, f.api);
    const names = [...document.querySelectorAll('#layers-body .row-name')].map((n) => n.textContent);
    expect(names.map((n) => n!.split(' · ')[0])).toEqual(['L2', 'L1', 'Capa 1']);
  });

  it('el botón de visibilidad alterna visible y su glyph', () => {
    const f = fixture();
    const layer = activePage(f.doc).layers[0];
    mount(f.doc, null, null, [], f.view, f.api);
    clickByText('#layers-body', '👁');
    expect(f.api.editLayer).toHaveBeenCalledWith(layer.id, { visible: false });

    layer.visible = false;
    mount(f.doc, null, null, [], f.view, f.api);
    expect(buttonsIn('#layers-body').some((b) => b.textContent === '–')).toBe(true);
    clickByText('#layers-body', '–');
    expect(f.api.editLayer).toHaveBeenLastCalledWith(layer.id, { visible: true });
  });

  it('el botón de bloqueo alterna locked', () => {
    const f = fixture();
    const layer = activePage(f.doc).layers[0];
    mount(f.doc, null, null, [], f.view, f.api);
    clickByText('#layers-body', '🔓');
    expect(f.api.editLayer).toHaveBeenCalledWith(layer.id, { locked: true });
  });

  it('↑ y ↓ invocan moveLayer con +1 y -1', () => {
    const f = fixture();
    const layer = activePage(f.doc).layers[0];
    mount(f.doc, null, null, [], f.view, f.api);
    clickByText('#layers-body', '↑');
    expect(f.api.moveLayer).toHaveBeenCalledWith(layer.id, 1);
    clickByText('#layers-body', '↓');
    expect(f.api.moveLayer).toHaveBeenLastCalledWith(layer.id, -1);
  });

  it('✕ elimina la capa de esa fila', () => {
    const f = fixture();
    const page = activePage(f.doc);
    page.layers.push({ id: uid(), name: 'Extra', visible: true, locked: false, opacity: 1, objects: [] });
    mount(f.doc, null, null, [], f.view, f.api);
    const row = [...document.querySelectorAll('#layers-body .row')].find((r) => r.textContent!.includes('Extra'))!;
    row.querySelector<HTMLButtonElement>('button.danger')!.click();
    expect(f.api.removeLayer).toHaveBeenCalledWith(page.layers[1].id);
  });

  it('hay un botón para crear capa', () => {
    const f = fixture();
    mount(f.doc, null, null, [], f.view, f.api);
    clickByText('#layers-body', '＋ Nueva capa');
    expect(f.api.addLayer).toHaveBeenCalledOnce();
  });

  it('el nombre de la fila muestra cuántos objetos contiene la capa', () => {
    const f = fixture();
    mount(f.doc, null, null, [], f.view, f.api);
    const name = document.querySelector('#layers-body .row-name')!.textContent!;
    expect(name).toContain('· 2');
  });

  it('pulsar la fila selecciona la capa; pulsarla otra vez la deselecciona', () => {
    const f = fixture();
    const layer = activePage(f.doc).layers[0];
    mount(f.doc, null, null, [], f.view, f.api);
    document.querySelector<HTMLElement>('#layers-body .row')!.click();
    expect(f.api.selectLayer).toHaveBeenCalledWith(layer.id);
    mount(f.doc, null, layer.id, [], f.view, f.api);
    document.querySelector<HTMLElement>('#layers-body .row')!.click();
    expect(f.api.selectLayer).toHaveBeenLastCalledWith(null);
  });
});

describe('Páginas: listar, cambiar, crear y borrar', () => {
  it('renderiza una fila por página y marca la activa', () => {
    const f = fixture();
    const doc = f.doc;
    doc.pages.push({ ...doc.pages[0], id: uid(), name: 'Página 2' });
    mount(doc, null, null, [], f.view, f.api);
    const rows = [...document.querySelectorAll('#pages-body .row')];
    expect(rows.length).toBe(2);
    expect(rows[0].className).toContain('active');
    expect(rows[1].className).not.toContain('active');
  });

  it('pulsar una fila de página invoca selectPage con su id', () => {
    const f = fixture();
    const doc = f.doc;
    doc.pages.push({ ...doc.pages[0], id: uid(), name: 'Página 2' });
    mount(doc, null, null, [], f.view, f.api);
    [...document.querySelectorAll<HTMLElement>('#pages-body .row')][1].click();
    expect(f.api.selectPage).toHaveBeenCalledWith(doc.pages[1].id);
  });

  it('con una sola página no se ofrece borrarla', () => {
    const f = fixture();
    mount(f.doc, null, null, [], f.view, f.api);
    expect(buttonsIn('#pages-body').map((b) => b.textContent)).not.toContain('✕');
  });

  it('con dos páginas cada una ofrece borrar', () => {
    const f = fixture();
    const doc = f.doc;
    doc.pages.push({ ...doc.pages[0], id: uid(), name: 'Página 2' });
    mount(doc, null, null, [], f.view, f.api);
    expect([...document.querySelectorAll('#pages-body .row')].every((r) => r.querySelector('button.danger'))).toBe(true);
    document.querySelector<HTMLButtonElement>('#pages-body .row button.danger')!.click();
    expect(f.api.removePage).toHaveBeenCalledWith(doc.pages[0].id);
  });

  it('hay un botón para crear página', () => {
    const f = fixture();
    mount(f.doc, null, null, [], f.view, f.api);
    clickByText('#pages-body', '＋ Nueva página');
    expect(f.api.addPage).toHaveBeenCalledOnce();
  });
});

describe('Property Inspector: campos según lo seleccionado', () => {
  it('sin selección muestra el documento y la página (nombre y tamaño)', () => {
    const f = fixture();
    mount(f.doc, null, null, [], f.view, f.api);
    const text = document.getElementById('inspector-body')!.textContent!;
    expect(text).toContain('panel-test');
    expect(text).toContain('Página 1');
    expect(text).toContain('1280×800');
  });

  it('con un objeto seleccionado expone X, Y, ancho y alto con sus valores', () => {
    const f = fixture();
    const obj = activePage(f.doc).layers[0].objects[1];
    mount(f.doc, obj.id, null, [obj.id], f.view, f.api);
    const inputs = [...document.querySelectorAll<HTMLInputElement>('#inspector-body input[type=number]')];
    expect(inputs.map((i) => i.value)).toEqual(['100', '100', '50', '60']);
  });

  it('cambiar X invoca editObj con solo esa propiedad', () => {
    const f = fixture();
    const obj = activePage(f.doc).layers[0].objects[0];
    mount(f.doc, obj.id, null, [obj.id], f.view, f.api);
    const x = [...document.querySelectorAll<HTMLInputElement>('#inspector-body input[type=number]')][0];
    x.value = '77';
    x.dispatchEvent(new Event('change'));
    expect(f.api.editObj).toHaveBeenCalledWith(obj, { x: 77 });
  });

  it('un valor no numérico en un campo no invoca editObj', () => {
    const f = fixture();
    const obj = activePage(f.doc).layers[0].objects[0];
    mount(f.doc, obj.id, null, [obj.id], f.view, f.api);
    const x = [...document.querySelectorAll<HTMLInputElement>('#inspector-body input[type=number]')][0];
    x.value = 'abc';
    x.dispatchEvent(new Event('change'));
    expect(f.api.editObj).not.toHaveBeenCalled();
  });

  it('el color de relleno se edita con un input de color', () => {
    const f = fixture();
    const obj = activePage(f.doc).layers[0].objects[0];
    obj.fill = '#ff0000';
    mount(f.doc, obj.id, null, [obj.id], f.view, f.api);
    const color = document.querySelector<HTMLInputElement>('#inspector-body input[type=color]')!;
    expect(color.value).toBe('#ff0000');
    color.value = '#00ff00';
    color.dispatchEvent(new Event('change'));
    expect(f.api.editObj).toHaveBeenCalledWith(obj, { fill: '#00ff00' });
  });

  it('con una capa seleccionada expone su opacidad', () => {
    const f = fixture();
    const layer = activePage(f.doc).layers[0];
    mount(f.doc, null, layer.id, [], f.view, f.api);
    const range = document.querySelector<HTMLInputElement>('#inspector-body input[type=range]')!;
    expect(range.value).toBe('1');
    range.value = '0.4';
    range.dispatchEvent(new Event('input'));
    expect(f.api.editLayer).toHaveBeenCalledWith(layer.id, { opacity: 0.4 });
  });
});

describe('Barra de estado: zoom y selección', () => {
  it('muestra el zoom como porcentaje', () => {
    const f = fixture();
    mount(f.doc, null, null, [], { zoom: 0.46, panX: 0, panY: 0 }, f.api);
    expect(document.getElementById('status')!.textContent).toContain('46%');
  });

  it('con un objeto seleccionado muestra su tamaño', () => {
    const f = fixture();
    const obj = activePage(f.doc).layers[0].objects[0];
    mount(f.doc, obj.id, null, [obj.id], f.view, f.api);
    expect(document.getElementById('status')!.textContent).toContain('selección 30×40');
  });

  it('con selección múltiple indica cuántos objetos hay', () => {
    const f = fixture();
    const objs = activePage(f.doc).layers[0].objects;
    mount(f.doc, objs[1].id, null, objs.map((o) => o.id), f.view, f.api);
    expect(document.getElementById('status')!.textContent).toContain('(2 objetos)');
  });
});

describe('renderPanels: robustez', () => {
  it('una selección que ya no existe no rompe el inspector (cae al estado de documento)', () => {
    const f = fixture();
    const obj = activePage(f.doc).layers[0].objects[0];
    activePage(f.doc).layers[0].objects.length = 0;
    expect(() => mount(f.doc, obj.id, null, [obj.id], f.view, f.api)).not.toThrow();
    expect(document.getElementById('inspector-body')!.textContent).toContain('panel-test');
  });

  it('no deja controles duplicados al re-renderizar', () => {
    const f = fixture();
    mount(f.doc, null, null, [], f.view, f.api);
    const first = buttonsIn('#align-body').length;
    mount(f.doc, null, null, [], f.view, f.api);
    expect(buttonsIn('#align-body').length).toBe(first);
    expect(document.querySelectorAll('#layers-body .row').length).toBe(1);
  });

  it('los nombres con HTML se escapan y no crean nodos', () => {
    const f = fixture();
    f.doc.name = '<img id="boom" src=x>';
    mount(f.doc, null, null, [], f.view, f.api);
    expect(document.getElementById('boom')).toBeNull();
    expect(document.getElementById('inspector-body')!.textContent).toContain('<img id="boom" src=x>');
  });
});

beforeEach(() => {
  document.body.innerHTML = '';
});
