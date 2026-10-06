// @vitest-environment node
// Tests de src/store.ts función por función, contra un IndexedDB real (fake-indexeddb).
// Escritos desde la especificación: qué debe devolver loadDoc/saveDoc, no qué hace el código.
import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { loadDoc, saveDoc } from '../src/store';
import { activePage, newDoc, uid, type Doc } from '../src/model';

function docWith(objects: number): Doc {
  const doc = newDoc('store-test');
  const page = activePage(doc);
  for (let i = 0; i < objects; i++) {
    page.layers[0].objects.push({
      id: uid(), type: 'rect', name: `r${i}`, x: i * 10, y: i * 20, w: 30, h: 40,
      fill: '#123456', stroke: null, strokeWidth: 0,
    });
  }
  return doc;
}

const open = (): Promise<IDBDatabase> =>
  new Promise((res) => {
    const req = indexedDB.open('pyra', 1);
    req.onsuccess = () => res(req.result);
  });

const putRaw = (value: unknown): Promise<void> =>
  open().then((db) =>
    new Promise<void>((res) => {
      const tx = db.transaction('documents', 'readwrite');
      tx.objectStore('documents').put(value, 'doc');
      tx.oncomplete = () => res();
    }),
  );

const clearRaw = (): Promise<void> =>
  open().then((db) =>
    new Promise<void>((res) => {
      const tx = db.transaction('documents', 'readwrite');
      tx.objectStore('documents').clear();
      tx.oncomplete = () => res();
    }),
  );

const keys = (): Promise<string[]> =>
  open().then((db) =>
    new Promise<string[]>((res) => {
      const req = db.transaction('documents', 'readonly').objectStore('documents').getAllKeys();
      req.onsuccess = () => res(req.result.map(String));
    }),
  );

describe('saveDoc: guarda bajo una única clave', () => {
  it('escribe en la clave "doc" y no acumula versiones', async () => {
    await saveDoc(docWith(1));
    await saveDoc(docWith(2));
    expect(await keys()).toEqual(['doc']);
  });
});

describe('loadDoc: ida y vuelta exacta', () => {
  it('un documento guardado se recupera idéntico, objeto por objeto', async () => {
    const doc = docWith(3);
    await saveDoc(doc);
    expect(await loadDoc()).toEqual(doc);
  });

  it('un documento válido sin objetos se recupera tal cual', async () => {
    const doc = docWith(0);
    await saveDoc(doc);
    expect(await loadDoc()).toEqual(doc);
  });
});

describe('loadDoc: almacén vacío', () => {
  it('devuelve null, no un documento inventado', async () => {
    await clearRaw();
    expect(await loadDoc()).toBeNull();
  });
});

describe('loadDoc: límite de confianza (documentos inválidos no entran)', () => {
  it('rechaza una versión desconocida', async () => {
    await putRaw({ version: 2, name: 'v2', activePageId: 'p', pages: [{ id: 'p', name: 'P', width: 1, height: 1, layers: [] }] });
    expect(await loadDoc()).toBeNull();
  });

  it('rechaza un documento sin páginas', async () => {
    await putRaw({ version: 1, name: 'vacío', activePageId: 'p', pages: [] });
    expect(await loadDoc()).toBeNull();
  });

  it('rechaza un valor que no es un documento', async () => {
    await putRaw('no soy un documento');
    expect(await loadDoc()).toBeNull();
  });

  it('rechaza páginas que no son un array', async () => {
    await putRaw({ version: 1, name: 'roto', activePageId: 'p', pages: 'no' });
    expect(await loadDoc()).toBeNull();
  });
});

describe('loadDoc: normalización de la página activa', () => {
  it('si activePageId no existe, apunta a la primera página', async () => {
    const doc = docWith(1);
    doc.activePageId = 'una-pagina-borrada';
    await saveDoc(doc);
    const back = await loadDoc();
    expect(back!.activePageId).toBe(back!.pages[0].id);
    expect(activePage(back!)).toBe(back!.pages[0]);
  });

  it('si activePageId sí existe, no lo modifica', async () => {
    const doc = docWith(1);
    doc.pages.push({ ...doc.pages[0], id: uid(), name: 'Página 2' });
    doc.activePageId = doc.pages[1].id;
    await saveDoc(doc);
    const back = await loadDoc();
    expect(back!.activePageId).toBe(doc.pages[1].id);
  });
});

describe('store: un fallo de apertura no envenena la sesión', () => {
  // módulo fresco: la conexión cacheada de los tests anteriores no debe enmascarar el caso
  const fresh = async (): Promise<typeof import('../src/store')> => {
    await vi.resetModules();
    return import('../src/store');
  };

  it('tras un open fallido, loadDoc devuelve null y la siguiente llamada reintenta', async () => {
    const store = await fresh();
    const real = indexedDB.open.bind(indexedDB);
    let calls = 0;
    (indexedDB as { open: unknown }).open = (name: string, version?: number): IDBOpenDBRequest => {
      if (calls++ > 0) return real(name, version);
      // open que falla al instante: la promesa debe rechazarse y NO quedarse cacheada
      return {
        onupgradeneeded: null,
        onsuccess: null,
        set onerror(handler: () => void) {
          handler();
        },
      } as unknown as IDBOpenDBRequest;
    };
    expect(await store.loadDoc()).toBeNull();
    (indexedDB as { open: unknown }).open = real;
    const doc = docWith(2);
    await store.saveDoc(doc);
    expect(await store.loadDoc()).toEqual(doc);
  });

  it('saveDoc no lanza aunque la apertura falle', async () => {
    const store = await fresh();
    (indexedDB as { open: unknown }).open = () => {
      throw new Error('IndexedDB no disponible');
    };
    await expect(store.saveDoc(docWith(1))).resolves.toBeUndefined();
    (indexedDB as { open: unknown }).open = indexedDB.open;
  });
});
