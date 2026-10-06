// Operaciones de capa puras: todo lo que el panel de capas necesita poder hacer.
import { uid, type Layer, type Page } from './model';

function uniqueName(page: Page, base: string): string {
  const taken = new Set(page.layers.map((l) => l.name));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
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
