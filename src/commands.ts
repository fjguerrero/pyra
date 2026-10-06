// Comandos de edición sobre la selección: duplicar, pegar, orden de apilado.
// Cada uno devuelve un Command undoable listo para history.run().
import { uid, type Obj, type Page } from './model';
import type { Command } from './history';

function cloneInto(page: Page, o: Obj, dx: number, dy: number): { clone: Obj; layerIndex: number } | null {
  const layerIndex = page.layers.findIndex((l) => l.objects.includes(o));
  if (layerIndex < 0) return null;
  const clone = structuredClone(o);
  clone.id = uid();
  clone.x += dx;
  clone.y += dy;
  return { clone, layerIndex };
}

function insertRemoveCmd(label: string, page: Page, items: { clone: Obj; layerIndex: number }[]): Command {
  return {
    label,
    do: () => {
      for (const it of items) page.layers[it.layerIndex].objects.push(it.clone);
    },
    undo: () => {
      for (const it of [...items].reverse()) {
        const i = page.layers[it.layerIndex].objects.indexOf(it.clone);
        if (i >= 0) page.layers[it.layerIndex].objects.splice(i, 1);
      }
    },
  };
}

/** Duplicar: copia con ids nuevos desplazada (como Ctrl+D de Fireworks) y seleccionada. */
export function duplicateCmd(page: Page, objs: Obj[], offset = 10): { cmd: Command; clones: Obj[] } | null {
  const items = objs.map((o) => cloneInto(page, o, offset, offset)).filter((x): x is NonNullable<typeof x> => x !== null);
  if (!items.length) return null;
  return { cmd: insertRemoveCmd('duplicar', page, items), clones: items.map((i) => i.clone) };
}

/** Pegar: copia del portapapeles en la misma posición (ids nuevos). */
export function pasteCmd(page: Page, clipboard: Obj[]): { cmd: Command; clones: Obj[] } | null {
  const items = clipboard.map((o) => {
    const clone = structuredClone(o);
    clone.id = uid();
    const layerIndex = page.layers.findIndex((l) => l.visible && !l.locked);
    return layerIndex < 0 ? null : { clone, layerIndex };
  }).filter((x): x is NonNullable<typeof x> => x !== null);
  if (!items.length) return null;
  return { cmd: insertRemoveCmd('pegar', page, items), clones: items.map((i) => i.clone) };
}

/** Orden de apilado dentro de la capa: dir=1 traer al frente, dir=-1 enviar al fondo. */
export function zOrderCmd(page: Page, objs: Obj[], dir: 1 | -1): Command | null {
  const moves = objs.map((o) => {
    const layerIndex = page.layers.findIndex((l) => l.objects.includes(o));
    if (layerIndex < 0) return null;
    const objects = page.layers[layerIndex].objects;
    const from = objects.indexOf(o);
    const to = dir === 1 ? objects.length - 1 : 0;
    return to === from ? null : { layerIndex, from, to, obj: o };
  }).filter((x): x is NonNullable<typeof x> => x !== null);
  if (!moves.length) return null;
  const apply = (m: { layerIndex: number; from: number; to: number }[]): void => {
    for (const m2 of m) {
      const objects = page.layers[m2.layerIndex].objects;
      const [o] = objects.splice(m2.from, 1);
      objects.splice(m2.to, 0, o);
    }
  };
  return {
    label: dir === 1 ? 'traer al frente' : 'enviar al fondo',
    do: () => apply(moves),
    undo: () => apply(moves.map((m) => ({ ...m, from: m.to, to: m.from }))),
  };
}

/** Agrupar: asigna un id de grupo común (Ctrl+G). Desagrupar: lo quita. */
export function groupCmd(objs: Obj[], group: string | undefined): Command {
  const before = objs.map((o) => ({ o, group: o.group }));
  return {
    label: group ? 'agrupar' : 'desagrupar',
    do: () => objs.forEach((o) => { o.group = group; }),
    undo: () => before.forEach(({ o, group }) => { o.group = group; }),
  };
}
