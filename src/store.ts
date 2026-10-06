import type { Doc } from './model';

const DB_NAME = 'pyra';
const STORE = 'documents';
const KEY = 'doc';

// Una sola conexión reutilizada: abrir por cada save bloqueaba opens posteriores.
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('no se pudo abrir IndexedDB'));
    req.onblocked = () => reject(req.error ?? new Error('IndexedDB bloqueado'));
  });
}

function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    // un open fallido no puede envenenar la sesión: la próxima llamada reintenta
    dbPromise = openDb().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

export async function loadDoc(): Promise<Doc | null> {
  try {
    const d = await db();
    const doc = await new Promise<Doc | null>((resolve, reject) => {
      const req = d.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    // límite de confianza: un doc corrupto o de otra versión no entra al modelo
    if (!doc || doc.version !== 1 || !Array.isArray(doc.pages) || doc.pages.length === 0) return null;
    // normalización: documentos guardados antes de las páginas múltiples
    if (!doc.pages.some((p) => p.id === doc.activePageId)) doc.activePageId = doc.pages[0].id;
    // normalización: objetos guardados antes de las formas vectoriales (M0/M1) eran rectángulos
    for (const p of doc.pages)
      for (const l of p.layers)
        for (const o of l.objects) {
          if (!('shape' in o)) (o as { shape: string }).shape = 'rect';
          if (o.shape === 'bitmap') {
            o.crop ??= null;
            o.blur ??= 0;
            o.sat ??= 1;
            o.bri ??= 1;
          }
        }
    return doc;
  } catch {
    return null;
  }
}

export async function saveDoc(doc: Doc): Promise<void> {
  try {
    const d = await db();
    await new Promise<void>((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(doc, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // persistencia best-effort en M0
  }
}
