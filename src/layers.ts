// Operaciones de capa puras: todo lo que el panel de capas necesita poder hacer.
import { uid, type Layer, type Page } from './model';

function uniqueName(page: Page, base: string): string {
  const taken = new Set(page.layers.map((l) => l.name));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}

/**
 * Orden de pintado (z-order) dado el array plano de capas + `parent`.
 * Un hijo se pinta justo después de su padre (por encima de él).
 * Robusto: capas con padre inexistente o ciclos se tratan como raíz.
 */
export function flattenLayers(layers: Layer[]): Layer[] {
  const ids = new Set(layers.map((l) => l.id));
  const children = new Map<string, Layer[]>();
  const roots: Layer[] = [];
  for (const l of layers) {
    if (l.parent && ids.has(l.parent) && l.parent !== l.id) {
      (children.get(l.parent) ?? children.set(l.parent, []).get(l.parent)!).push(l);
    } else {
      roots.push(l);
    }
  }
  const out: Layer[] = [];
  const seen = new Set<string>();
  const walk = (l: Layer): void => {
    if (seen.has(l.id)) return;
    seen.add(l.id);
    out.push(l);
    for (const c of children.get(l.id) ?? []) walk(c);
  };
  for (const r of roots) walk(r);
  for (const l of layers) if (!seen.has(l.id)) out.push(l); // ciclos: al final
  return out;
}

/** ¿`id` es descendiente de `ancestorId`? */
export function isDescendant(layers: Layer[], ancestorId: string, id: string): boolean {
  let cur = layers.find((l) => l.id === id);
  while (cur?.parent) {
    if (cur.parent === ancestorId) return true;
    cur = layers.find((l) => l.id === cur!.parent);
  }
  return false;
}

/**
 * Reordenar/nestear: mueve la capa (con su subárbol) junto a `targetId`.
 * mode 'before'/'after' = hermana junto al objetivo; 'child' = hija del objetivo.
 * Muta `layers` (orden plano) y `parent`. Devuelve false si es inválido (ciclo).
 */
export function reorderLayer(
  page: Page,
  id: string,
  targetId: string,
  mode: 'before' | 'after' | 'child',
): boolean {
  if (id === targetId) return false;
  const flat = flattenLayers(page.layers);
  if (isDescendant(page.layers, id, targetId)) return false; // no mover dentro de sí misma
  const k = flat.findIndex((l) => l.id === id);
  if (k < 0) return false;
  const subtree = [flat[k]];
  const collect = (l: Layer): void => {
    for (const c of flat) if (c.parent === l.id) { subtree.push(c); collect(c); }
  };
  collect(flat[k]);
  const subtreeIds = new Set(subtree.map((l) => l.id));
  const rest = flat.filter((l) => !subtreeIds.has(l.id));
  const t = rest.findIndex((l) => l.id === targetId);
  if (t < 0) return false;
  let insertAt: number;
  if (mode === 'before') {
    insertAt = t;
  } else if (mode === 'after') {
    insertAt = t + 1;
    while (insertAt < rest.length && isDescendant(page.layers, targetId, rest[insertAt].id)) insertAt++;
  } else {
    insertAt = t + 1;
    while (insertAt < rest.length && isDescendant(page.layers, targetId, rest[insertAt].id)) insertAt++;
    page.layers.find((l) => l.id === id)!.parent = targetId;
  }
  if (mode !== 'child') {
    const tp = page.layers.find((l) => l.id === targetId)!.parent;
    if (tp) page.layers.find((l) => l.id === id)!.parent = tp;
    else delete page.layers.find((l) => l.id === id)!.parent;
  }
  rest.splice(insertAt, 0, ...subtree);
  page.layers = rest;
  return true;
}

/** Nueva capa justo por encima de `aboveId` (o al tope si no se indica), como Fireworks. */
export function addLayer(page: Page, aboveId: string | null = null): Layer {
  const layer: Layer = { id: uid(), name: uniqueName(page, 'Capa'), visible: true, locked: false, opacity: 1, objects: [] };
  const i = aboveId ? page.layers.findIndex((l) => l.id === aboveId) : page.layers.length - 1;
  page.layers.splice(i + 1, 0, layer);
  return layer;
}

/** Nunca deja una página sin capas. */
export function removeLayer(page: Page, id: string): boolean {
  if (page.layers.length <= 1) return false;
  const i = page.layers.findIndex((l) => l.id === id);
  if (i < 0) return false;
  page.layers.splice(i, 1);
  return true;
}

/** delta>0 sube en el panel (hacia la superficie). */
export function moveLayer(page: Page, id: string, delta: number): boolean {
  const i = page.layers.findIndex((l) => l.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= page.layers.length) return false;
  const [l] = page.layers.splice(i, 1);
  page.layers.splice(j, 0, l);
  return true;
}

/** Mover un objeto a otra capa (arrastrar entre capas en el panel). */
export function moveObjToLayer(page: Page, objId: string, layerId: string): boolean {
  const from = page.layers.find((l) => l.objects.some((o) => o.id === objId));
  const to = page.layers.find((l) => l.id === layerId);
  if (!from || !to || from === to) return false;
  const i = from.objects.findIndex((o) => o.id === objId);
  const [o] = from.objects.splice(i, 1);
  to.objects.push(o);
  return true;
}
