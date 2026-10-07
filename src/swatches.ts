// Paleta compartida: recientes (máx. 12) + personalizados persistentes.
// #rrggbb y #rrggbbaa. Orden y contenido persistidos en localStorage.

export type Swatch = { id: string; color: string };

const KEY = 'pyra:swatches';
const MAX_RECENT = 12;

export type SwatchStore = { recent: Swatch[]; custom: Swatch[] };

const uid = () => Math.random().toString(36).slice(2, 10);

export function loadSwatches(): SwatchStore {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && Array.isArray(s.recent) && Array.isArray(s.custom)) return s;
  } catch {
    /* ignore */
  }
  return { recent: [], custom: [] };
}

export function saveSwatches(s: SwatchStore) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function normalizeColor(v: string): string {
  const s = (v || '').trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  if (/^#[0-9a-f]{8}$/.test(s)) return s;
  if (/^#[0-9a-f]{3}$/.test(s))
    return '#' + s.slice(1).split('').map((c) => c + c).join('');
  return s;
}

export function addRecent(s: SwatchStore, color: string) {
  const c = normalizeColor(color);
  if (!/^#[0-9a-f]{6,8}$/.test(c)) return;
  s.recent = [{ id: uid(), color: c }, ...s.recent.filter((x) => x.color !== c)].slice(0, MAX_RECENT);
  saveSwatches(s);
}

export function addCustom(s: SwatchStore, color: string) {
  const c = normalizeColor(color);
  if (!/^#[0-9a-f]{6,8}$/.test(c)) return;
  if (!s.custom.some((x) => x.color === c)) s.custom.push({ id: uid(), color: c });
  saveSwatches(s);
}

export function removeSwatch(s: SwatchStore, id: string) {
  s.recent = s.recent.filter((x) => x.id !== id);
  s.custom = s.custom.filter((x) => x.id !== id);
  saveSwatches(s);
}

// mover `id` junto a `targetId` (antes/después) dentro de su lista
export function moveSwatch(s: SwatchStore, id: string, targetId: string, after: boolean) {
  for (const list of [s.recent, s.custom]) {
    const from = list.findIndex((x) => x.id === id);
    if (from < 0) continue;
    let to = list.findIndex((x) => x.id === targetId);
    if (to < 0 || id === targetId) return;
    const [it] = list.splice(from, 1);
    to = list.findIndex((x) => x.id === targetId);
    list.splice(after ? to + 1 : to, 0, it);
    saveSwatches(s);
    return;
  }
}
