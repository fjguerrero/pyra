import type { Doc } from './model';

const DB_NAME = 'pyra';
const STORE = 'documents';
const KEY = '***';

// Una sola conexión reutilizada: abrir por cada save bloqueaba opens posteriores.
let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
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
