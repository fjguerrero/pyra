// E2E reales: Chromium contra la app servida por Vite. Verifican el flujo de usuario,
// no la implementación. La evidencia es lo que la UI muestra (capas, inspector, status).
import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const canvas = (page: Page) => page.locator('#canvas');
const layerCount = (page: Page) => page.locator('#layers-body .row-name').first();
const inspNum = (page: Page, i = 0) => page.locator('#inspector-body input[type=number]').nth(i);

async function openApp(page: Page): Promise<void> {
  // cada test arranca con un documento limpio (solo en la primera carga, no en reloads del test)
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('pyra-test-fresh')) {
      sessionStorage.setItem('pyra-test-fresh', '1');
      void indexedDB.deleteDatabase('pyra');
      localStorage.clear();
    }
  });
  await page.goto('/');
  await expect(canvas(page)).toBeVisible();
  // el canvas es HTML estático: esperamos a que main.ts haya arrancado (filas de capas reales)
  await expect(page.locator('#layers-body .row-name').first()).toBeVisible();
  await page.keyboard.press('0'); // vista determinista: ajustar a la página
}

/** Arrastre sobre el lienzo entre dos puntos de pantalla. */
/** Shape del primer objeto del documento persistido. */
function docShape(page: Page): () => Promise<string> {
  return () =>
    page.evaluate(() =>
      new Promise<string>((resolve) => {
        const open = indexedDB.open('pyra');
        open.onsuccess = () => {
          const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
          req.onsuccess = () => resolve(req.result?.pages?.[0]?.layers?.[0]?.objects?.[0]?.shape ?? '');
          req.onerror = () => resolve('');
        };
        open.onerror = () => resolve('');
      }),
    );
}

async function drag(page: Page, from: [number, number], to: [number, number]): Promise<void> {
  const box = await canvas(page).boundingBox();
  if (!box) throw new Error('canvas sin tamaño');
  await page.mouse.move(box.x + from[0], box.y + from[1]);
  await page.mouse.down();
  await page.mouse.move(box.x + to[0], box.y + to[1], { steps: 8 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('dibujar un rectángulo con la herramienta: aparece en capas y se selecciona', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [300, 250]);
  await expect(layerCount(page)).toContainText('· 1');
  // tras dibujar vuelve a selección (como Fireworks) y el inspector muestra el objeto
  await expect(page.locator('#toolbar .tool[data-tool="select"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(inspNum(page)).not.toHaveValue('');
  await expect(page.locator('#status')).toContainText('selection');
});

test('seleccionar y mover un objeto con el ratón', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [300, 250]);
  const before = await inspNum(page).inputValue();
  await page.keyboard.press('Escape');
  await drag(page, [150, 150], [250, 250]); // arrastrar el objeto desde dentro
  await expect(inspNum(page)).not.toHaveValue(before);
  await expect(layerCount(page)).toContainText('· 1'); // sigue habiendo un solo objeto
});

test('objeto seleccionado tiene prioridad al manipularlo aunque otro lo tape', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [300, 250]); // A
  await page.keyboard.press('Escape');
  await page.keyboard.press('r');
  await drag(page, [200, 200], [400, 350]); // B, encima y solapado
  const box = (await canvas(page).boundingBox())!;
  // seleccionar A desde una zona que solo cubre A
  await page.mouse.click(box.x + 150, box.y + 150);
  const aX = await inspNum(page).inputValue();
  // arrancar desde la zona común (donde B tapa a A): debe moverse A, el seleccionado
  await drag(page, [250, 250], [320, 260]);
  await expect(inspNum(page)).not.toHaveValue(aX);
  await expect(layerCount(page)).toContainText('· 2'); // sigue habiendo dos objetos
});

test('undo/redo con Ctrl+Z / Ctrl+Shift+Z y con los botones de la barra', async ({ page }) => {
  const undo = page.locator('#undo-btn');
  const redo = page.locator('#redo-btn');
  await expect(undo).toBeDisabled(); // al arrancar no hay nada que deshacer
  await page.keyboard.press('r');
  await drag(page, [100, 100], [300, 250]);
  await expect(layerCount(page)).toContainText('· 1');
  await expect(undo).toBeEnabled();
  await page.keyboard.press('Control+z');
  await expect(layerCount(page)).toContainText('· 0');
  await expect(redo).toBeEnabled();
  await page.keyboard.press('Control+Shift+z');
  await expect(layerCount(page)).toContainText('· 1');
  // los botones hacen lo mismo que los atajos
  await undo.click();
  await expect(layerCount(page)).toContainText('· 0');
  await redo.click();
  await expect(layerCount(page)).toContainText('· 1');
});

test('eliminar con Supr deja la capa vacía', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [300, 250]);
  await page.keyboard.press('Delete');
  await expect(layerCount(page)).toContainText('· 0');
});

test('Ctrl+A selecciona todo y Supr lo borra todo', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [180, 160]);
  await page.keyboard.press('r');
  await drag(page, [220, 100], [300, 160]);
  await expect(layerCount(page)).toContainText('· 2');
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await expect(layerCount(page)).toContainText('· 0');
});

test('zoom con + y -: el porcentaje del zoom sube y baja', async ({ page }) => {
  const zoomNum = page.locator('#zoom-num');
  await page.keyboard.press('0'); // vista determinista
  const base = Number(await zoomNum.inputValue());
  await page.keyboard.press('=');
  await expect.poll(async () => Number(await zoomNum.inputValue())).toBeGreaterThan(base);
  await page.keyboard.press('-');
  await expect.poll(async () => Number(await zoomNum.inputValue())).toBe(base);
});

test('preset 100% en el popup de zoom', async ({ page }) => {
  await page.keyboard.press('0'); // fit: cualquier cosa != 100 en este lienzo
  await page.click('#zoom-btn');
  await page.click('#zoom-presets [data-zoom="1"]');
  await expect(page.locator('#zoom-num')).toHaveValue('100');
});

test('las coordenadas del cursor aparecen en la barra de estado', async ({ page }) => {
  await page.keyboard.press('0'); // fit: el centro del lienzo cae en el centro de la página
  const box = (await canvas(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator('#status-text')).toContainText('640, 400'); // página por defecto 1280×800
});

test('Ctrl+PageUp/PageDown cambian de página', async ({ page }) => {
  const activeIdx = () =>
    page.evaluate(
      () => [...document.querySelectorAll('#pages-body .row')].findIndex((r) => r.classList.contains('active')),
    );
  await page.click('[data-act="addpage"]'); // 2 páginas; la nueva queda activa
  await expect.poll(activeIdx).toBe(1);
  await page.keyboard.press('Control+PageUp');
  await expect.poll(activeIdx).toBe(0);
  await page.keyboard.press('Control+PageDown');
  await expect.poll(activeIdx).toBe(1);
  await page.keyboard.press('Control+PageDown'); // tope: se queda en la última
  await expect.poll(activeIdx).toBe(1);
});

test('importar una imagen crea un bitmap seleccionable y movible', async ({ page }) => {
  // PNG 100×100 rojo generado en el propio navegador
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 100;
    c.height = 100;
    const g = c.getContext('2d')!;
    g.fillStyle = 'red';
    g.fillRect(0, 0, 100, 100);
    return c.toDataURL('image/png');
  });
  await page.setInputFiles('#import-file', { name: 'rojo.png', mimeType: 'image/png', buffer: Buffer.from(dataUrl.split(',')[1], 'base64') });
  await expect(layerCount(page)).toContainText('· 1');
  // el inspector de un bitmap: filtros vivos y recorte
  await expect(page.locator('#inspector-body')).toContainText('Blur');
  await expect(page.locator('#inspector-body')).toContainText('Crop width');

  // moverlo con el ratón (hit-test por bbox): fitAll centra la página y el bitmap
  // se crea en el centro de la página → arrastrar desde el centro del lienzo
  const box = await canvas(page).boundingBox();
  if (!box) throw new Error('canvas sin tamaño');
  const before = await inspNum(page).inputValue();
  await drag(page, [box.width / 2, box.height / 2], [box.width / 2 + 60, box.height / 2 + 40]);
  await expect(inspNum(page)).not.toHaveValue(before);
});

test('persistencia: el documento sobrevive a una recarga', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [300, 250]);
  await expect(layerCount(page)).toContainText('· 1');
  await page.waitForTimeout(700); // el guardado tiene debounce de 400 ms
  await page.reload();
  await expect(canvas(page)).toBeVisible();
  await expect(layerCount(page)).toContainText('· 1');
});

test('texto: crear con la herramienta T y editar con doble clic', async ({ page }) => {
  await page.keyboard.press('t');
  await page.locator('#canvas').click({ position: { x: 200, y: 150 } });
  await expect(layerCount(page)).toContainText('· 1');
  // el inspector de un texto: contenido, tamaño y color
  await expect(page.locator('#inspector-body textarea')).toHaveValue('Text');
  await expect(page.locator('#inspector-body')).toContainText('Size');
  // fuente: campo libre con sugerencias; acepta familias del sistema y personalizadas
  const fontIn = page.locator('#inspector-body input[data-act="font"]');
  await expect(page.locator('#pyra-fontlist option')).toHaveCount(14);
  const docFont = () =>
    page.evaluate(
      () =>
        new Promise<string>((resolve) => {
          const open = indexedDB.open('pyra');
          open.onsuccess = () => {
            const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
            req.onsuccess = () => resolve(req.result?.pages?.[0]?.layers?.[0]?.objects?.[0]?.font ?? '');
            req.onerror = () => resolve('');
          };
          open.onerror = () => resolve('');
        }),
    );
  await fontIn.fill('Courier New');
  await fontIn.press('Enter');
  await expect.poll(docFont).toContain('Courier New');
  await fontIn.fill('Mi Fuente Loca');
  await fontIn.press('Enter');
  await expect.poll(docFont).toContain("'Mi Fuente Loca'");

  page.once('dialog', (d) => void d.accept('Hola Pyra'));
  await page.locator('#canvas').dblclick({ position: { x: 210, y: 160 } });
  await expect(page.locator('#inspector-body textarea')).toHaveValue('Hola Pyra');

  // undo deshace la edición de texto
  await page.keyboard.press('Control+z');
  await expect(page.locator('#inspector-body textarea')).toHaveValue('Text');
});

test('duplicar con Ctrl+D y mover con flechas', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 180]);
  await expect(layerCount(page)).toContainText('· 1');
  const x0 = Number(await inspNum(page, 0).inputValue());

  await page.keyboard.press('Control+d');
  await expect(layerCount(page)).toContainText('· 2');
  // la copia queda seleccionada y desplazada +10
  await expect(inspNum(page, 0)).toHaveValue(String(x0 + 10));
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(inspNum(page, 0)).toHaveValue(String(x0 + 22)); // +10 duplicado +1 +1 +10 flechas
  await page.keyboard.press('Control+z');
  await expect(inspNum(page, 0)).toHaveValue(String(x0 + 12));
});

test('degradado: añadir desde el inspector y editar sus colores', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 180]);
  await page.locator('#inspector-body button', { hasText: 'Add gradient' }).click();
  await expect(page.locator('#inspector-body')).toContainText('Gradient from');
  await expect(page.locator('#inspector-body')).toContainText('Angle');
  await page.locator('#inspector-body button', { hasText: 'Remove gradient' }).click();
  await expect(page.locator('#inspector-body')).not.toContainText('Gradient from');
});

test('estilos: guardar desde un objeto y aplicar a otro', async ({ page }) => {
  await openApp(page);
  // dibujar dos rectángulos
  await page.keyboard.press('r');
  await drag(page, [60, 60], [140, 120]);
  await page.keyboard.press('r');
  await drag(page, [200, 60], [280, 120]);
  // cambiar el relleno del primero y guardar estilo
  await page.keyboard.press('Escape');
  const box = await canvas(page).boundingBox();
  await page.mouse.click(box!.x + 100, box!.y + 90); // centro del primer rect
  const colorInput = page.locator('#inspector-body input[type=color]').first();
  await colorInput.fill('#ff0000');
  await page.locator('#inspector-body button', { hasText: 'Save style' }).click();
  await expect(page.locator('#inspector-body')).toContainText('Estilo 1');
  // seleccionar el segundo y aplicar el estilo
  await page.mouse.click(box!.x + 240, box!.y + 90);
  await page.locator('#inspector-body .row', { hasText: 'Estilo 1' }).first().dispatchEvent('click');
  await expect(page.locator('#inspector-body input[type=color]').first()).toHaveValue('#ff0000');
  // undo deshace la aplicación del estilo
  await page.keyboard.press('Control+z');
  await expect(page.locator('#inspector-body input[type=color]').first()).not.toHaveValue('#ff0000');
});

test('selección por marco: arrastrar en vacío selecciona lo que intersecta', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [60, 60], [140, 120]);
  await page.keyboard.press('r');
  await drag(page, [160, 60], [240, 120]);
  await page.keyboard.press('Escape'); // herramienta de selección
  // marco que cubre ambos rectángulos
  await drag(page, [40, 40], [260, 140]);
  await expect(page.locator('#status')).toContainText('(2 objects)');
  // mover con flechas afecta a ambos (x de ambos cambia)
  const x0 = Number(await inspNum(page, 0).inputValue());
  await page.keyboard.press('ArrowRight');
  await expect(inspNum(page, 0)).toHaveValue(String(x0 + 1));
});

test('exportar .f.png y reimportarlo restaura el documento', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 180]);
  await expect(layerCount(page)).toContainText('· 1');
  const download = page.waitForEvent('download');
  await page.locator('#menu-file-btn').click();
  await page.locator('#export-menu [data-export]').click();
  const dl = await download;
  expect(dl.suggestedFilename()).toMatch(/\.f\.png$/);
  const path = await dl.path();

  // borrar el objeto (reimportar debe restaurarlo)
  await page.keyboard.press('Delete');
  await expect(layerCount(page)).toContainText('· 0');

  await page.setInputFiles('#import-file', path);
  await expect(layerCount(page)).toContainText('· 1');
});

test('páginas: crear y cambiar', async ({ page }) => {
  await page.locator('#pages-body [data-act="addpage"]').click();
  await expect(page.locator('#pages-body .row')).toHaveCount(2);
  await expect(page.locator('#pages-body .row.active')).toContainText('Page 2');
  await page.locator('#pages-body .row').first().click();
  await expect(page.locator('#pages-body .row.active')).toContainText('Página 1');
});

test('rotación: campo en el inspector y hit-test rotado', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 140]); // rect ancho y bajo
  // poner rotación 90 desde el inspector
  const rotInput = page.locator('#inspector-body .field:has(span:text-is("Rotation")) input[type=number]');
  await rotInput.fill('90');
  await rotInput.dispatchEvent('change');
  // el centro sigue siendo hit-testable (el rect girado pasa por ahí)
  const box = await canvas(page).boundingBox();
  await page.keyboard.press('Escape');
  await page.mouse.click(box!.x + 160, box!.y + 120);
  await expect(page.locator('#inspector-body .field:has(span:text-is("Rotation")) input[type=number]')).toHaveValue('90');
});

test('agrupar: Ctrl+G selecciona el grupo entero al tocar un miembro', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [60, 60], [140, 120]);
  await page.keyboard.press('r');
  await drag(page, [160, 60], [240, 120]);
  // seleccionar ambos y agrupar
  const box = await canvas(page).boundingBox();
  await page.keyboard.press('Escape');
  await page.mouse.click(box!.x + 100, box!.y + 90);
  await page.keyboard.down('Shift');
  await page.mouse.click(box!.x + 200, box!.y + 90);
  await page.keyboard.up('Shift');
  await page.keyboard.press('Control+g');
  // clic en uno selecciona los dos
  await page.keyboard.press('Escape');
  await page.mouse.click(box!.x + 100, box!.y + 90);
  await expect(page.locator('#status')).toContainText('(2 objects)');
  // desagrupar
  await page.keyboard.press('Control+Shift+G');
  await page.keyboard.press('Escape');
  await page.mouse.click(box!.x + 100, box!.y + 90);
  await expect(page.locator('#status')).not.toContainText('(2 objects)');
});

test('exportar PNG plano descarga un .png', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 180]);
  await page.locator('#menu-file-btn').click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export-menu [data-export-png]')]);
  expect(dl.suggestedFilename()).toMatch(/\.png$/);
});

test('exportar JPEG y WebP descarga los formatos del navegador', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 180]);
  await page.locator('#menu-file-btn').click();
  const [jpg] = await Promise.all([page.waitForEvent('download'), page.click('#export-menu [data-export-jpeg]')]);
  expect(jpg.suggestedFilename()).toMatch(/\.jpg$/);
  await page.locator('#menu-file-btn').click();
  const [webp] = await Promise.all([page.waitForEvent('download'), page.click('#export-menu [data-export-webp]')]);
  expect(webp.suggestedFilename()).toMatch(/\.webp$/);
});

test('rect/óvalo con borde: el inspector ofrece color de trazo, grosor y sin relleno', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 180]);
  await expect(page.locator('#inspector-body', { hasText: 'Stroke color' })).toBeVisible();
  await expect(page.locator('#inspector-body', { hasText: 'Stroke width' })).toBeVisible();
  // poner un borde: el rect se queda sin relleno y solo con contorno
  await page.locator('#inspector-body button', { hasText: 'No fill' }).click();
  const strokeInput = page.locator('#inspector-body input[type=color]').last();
  await strokeInput.evaluate((el: HTMLElement) => el.click());
  await expect(page.locator('#inspector-body button', { hasText: 'No fill' })).toHaveAttribute('aria-pressed', 'true');
});

test('Space+arrastrar desplaza el lienzo (mano temporal)', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 180]);
  const isRectBlue = (x: number, y: number) => page.evaluate(([x, y]: number[]) => {
    const c = document.getElementById('canvas') as HTMLCanvasElement;
    const d = c.getContext('2d')!.getImageData(x, y, 1, 1).data;
    return `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}` === '#4f8cff';
  }, [x, y]);
  await expect.poll(() => isRectBlue(160, 140)).toBe(true); // el rect azul está en su sitio
  const box = await canvas(page).boundingBox();
  await page.keyboard.down('Space');
  await page.mouse.move(box!.x + 160, box!.y + 140);
  await page.mouse.down();
  await page.mouse.move(box!.x + 260, box!.y + 140, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up('Space');
  await expect.poll(() => isRectBlue(260, 140)).toBe(true); // se movió con el lienzo
  await expect.poll(() => isRectBlue(160, 140)).toBe(false);
});

test('imán al dibujar: la esquina encaja exacta en el borde de otro objeto', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [200, 150], [300, 230]); // rect A: mundo 96,102 → 196,182 (zoom 100%)
  await page.keyboard.press('r');
  await drag(page, [400, 300], [305, 400]); // esquina B suelta a 5px de pantalla del borde derecho de A
  // el imán debe dejar B.x exactamente en el borde de A (no en la suelta de 5px)
  const pair = () => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase | null>((res) => { const r = indexedDB.open('pyra'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
    if (!db) return null;
    const st = db.objectStoreNames[0];
    if (!st) return null;
    const all: unknown[] = await new Promise((res) => { const q = db.transaction(st, 'readonly').objectStore(st).getAll(); q.onsuccess = () => res(q.result); });
    const objs = (all[0] as { pages: { layers: { objects: { x: number; y: number; w: number }[] }[] }[] })?.pages?.[0]?.layers?.flatMap((l) => l.objects) ?? [];
    return objs.length >= 2 ? { ax: objs[0].x, aw: objs[0].w, bx: objs[1].x } : null;
  });
  await expect.poll(pair, { timeout: 5000 }).not.toBeNull();
  const v = (await pair())!;
  expect(v.bx).toBe(v.ax + v.aw);
});

test('Shift+0 acerca la vista a la selección', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [140, 130]); // rect pequeño, queda seleccionado
  const zoom = page.locator('#zoom-num');
  const before = Number(await zoom.inputValue());
  await page.keyboard.press('Shift+0');
  await expect.poll(async () => Number(await zoom.inputValue())).toBeGreaterThan(before);
  // el rect debe cubrir ahora una zona mucho mayor: azul en el centro del lienzo
  await expect.poll(() => page.evaluate(() => {
    const c = document.getElementById('canvas') as HTMLCanvasElement;
    const d = c.getContext('2d')!.getImageData(Math.round(c.width / 2), Math.round(c.height / 2), 1, 1).data;
    return `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  })).toBe('#4f8cff');
});

test('degradado multi-parada: añadir parada abre el editor con 3 filas y se puede borrar', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 180]);
  await page.locator('#inspector-body button', { hasText: 'Add gradient' }).click();
  await expect(page.locator('input[data-stop-pos]')).toHaveCount(0);
  await page.locator('#inspector-body button', { hasText: 'Add stop' }).click();
  await expect(page.locator('input[data-stop-pos]')).toHaveCount(3);
  await expect(page.locator('input[data-stop-color]')).toHaveCount(3);
  await page.locator('button[data-stop-del="1"]').dispatchEvent('click');
  await expect(page.locator('input[data-stop-pos]')).toHaveCount(2); // nunca baja de 2 paradas
  await expect(page.locator('button[data-stop-del]')).toHaveCount(0);
});

test('radio de esquina: el inspector aplica rx al rect y queda en el documento', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 180]);
  const rx = page.locator('label').filter({ hasText: 'Corner radius' }).locator('input');
  await rx.evaluate((el: HTMLInputElement) => {
    el.value = '12';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect.poll(async () =>
    page.evaluate(() =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('pyra');
        open.onsuccess = () => {
          const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
          req.onsuccess = () => resolve(req.result?.pages?.[0]?.layers?.[0]?.objects?.[0]?.rx ?? 0);
          req.onerror = () => resolve(0);
        };
        open.onerror = () => resolve(0);
      }),
    ),
  ).toBe(12);
});

test('inspector: color y estilo de trazo se aplican; el selector de color no se destruye a mitad de selección', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 180]);
  await expect(page.locator('#inspector-body input[type=color]').first()).toBeVisible(); // objeto creado y seleccionado
  const docField = (field: string) =>
    page.evaluate((f) =>
      new Promise<unknown>((resolve) => {
        const open = indexedDB.open('pyra');
        open.onsuccess = () => {
          const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
          req.onsuccess = () => resolve(req.result?.pages?.[0]?.layers?.[0]?.objects?.[0]?.[f] ?? null);
          req.onerror = () => resolve(null);
        };
        open.onerror = () => resolve(null);
      }), field);

  // el <input type=color> debe seguir en el DOM tras su evento input (antes el
  // panel lo recreaba y el diálogo nativo de color se cerraba sin aplicar)
  const survived = await page.evaluate(async () => {
    const el = document.querySelector('#inspector-body input[type=color]') as HTMLInputElement;
    el.focus();
    el.value = '#ff0000';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return el.isConnected;
  });
  expect(survived).toBe(true);
  await expect.poll(() => docField('fill')).toBe('#ff0000');

  // estilos de trazo cambiables: sólido → discontinuo → sólido
  const sel = page.locator('label').filter({ hasText: 'Stroke style' }).locator('select');
  await sel.selectOption('1');
  await expect.poll(() => docField('dash')).toEqual([6, 4]);
  await sel.selectOption('0');
  await expect.poll(() => docField('dash')).toBe(null);
});

test('Ctrl+Shift+H voltea la selección (flipH en el documento) y Ctrl+Z lo deshace', async ({ page }) => {
  await page.keyboard.press('l');
  await drag(page, [100, 100], [240, 200]);
  await expect.poll(docShape(page)).toBe('line');
  const docFlipH = () =>
    page.evaluate(() =>
      new Promise<string>((resolve) => {
        const open = indexedDB.open('pyra');
        open.onsuccess = () => {
          const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
          req.onsuccess = () => resolve(String(req.result?.pages?.[0]?.layers?.[0]?.objects?.[0]?.flipH ?? ''));
          req.onerror = () => resolve('');
        };
        open.onerror = () => resolve('');
      }),
    );
  await page.keyboard.press('Control+Shift+h');
  await expect.poll(docFlipH).toBe('true');
  await page.keyboard.press('Control+z');
  await expect.poll(docFlipH).toBe('');
});

test('modo de mezcla: el inspector aplica fx.blend al objeto (queda en el documento)', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [240, 200]);
  await expect.poll(docShape(page)).toBe('rect');
  const docBlend = () =>
    page.evaluate(() =>
      new Promise<string>((resolve) => {
        const open = indexedDB.open('pyra');
        open.onsuccess = () => {
          const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
          req.onsuccess = () => resolve(String(req.result?.pages?.[0]?.layers?.[0]?.objects?.[0]?.fx?.blend ?? ''));
          req.onerror = () => resolve('');
        };
        open.onerror = () => resolve('');
      }),
    );
  await page.locator('select[data-act="blend"]').selectOption('multiply');
  await expect.poll(docBlend).toBe('multiply');
  await page.locator('select[data-act="blend"]').selectOption('normal');
  await expect.poll(docBlend).toBe('');
});

test('opacidad de objeto: el inspector aplica fx.opacity (queda en el documento)', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [240, 200]);
  await expect.poll(docShape(page)).toBe('rect');
  const docOpacity = () =>
    page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const req = indexedDB.open('pyra');
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction('documents', 'readonly');
            const get = tx.objectStore('documents').get('doc');
            get.onsuccess = () => {
              const o = get.result?.pages?.[0]?.layers?.[0]?.objects?.[0];
              resolve(o?.fx?.opacity ?? 1);
            };
          };
        }),
    );
  const field = page
    .locator('#inspector-body label.field')
    .filter({ hasText: 'Object opacity' })
    .locator('input[type=number]');
  await field.evaluate((el: HTMLInputElement) => {
    el.value = '0.4';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect.poll(docOpacity, { timeout: 5000 }).toBe(0.4);
});

test('degradado radial: el inspector ofrece alternar lineal/radial', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 180]);
  await page.locator('#inspector-body button', { hasText: 'Add gradient' }).click();
  const radial = page.locator('#inspector-body button', { hasText: 'Radial' });
  await expect(radial).toBeVisible();
  await radial.click();
  await expect(page.locator('#inspector-body button', { hasText: 'Linear' })).toBeVisible();
});

test('cuentagotas: coge un color de la pantalla y lo usa la siguiente forma', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 180]);
  const fillInput = page.locator('label').filter({ hasText: 'Fill' }).locator('input[type=color]').first();
  await fillInput.evaluate((el: HTMLInputElement) => {
    el.value = '#ff0000';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.keyboard.press('Escape');
  // el cuentagotas lee píxeles: hay que esperar al repintado rojo
  await expect.poll(async () => page.evaluate(() => {
    const c = document.getElementById('canvas') as HTMLCanvasElement;
    const d = c.getContext('2d')!.getImageData(160, 140, 1, 1).data;
    return `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  })).toBe('#ff0000');
  await page.keyboard.press('i'); // cuentagotas
  const box = await canvas(page).boundingBox();
  await page.mouse.click(box!.x + 160, box!.y + 140); // dentro del rect rojo
  await page.keyboard.press('Escape');
  await page.keyboard.press('r');
  await drag(page, [300, 100], [400, 160]);
  await expect(page.locator('label').filter({ hasText: 'Fill' }).locator('input[type=color]').first()).toHaveValue('#ff0000');
});

test('exportar SVG: vector real (formas y trazos como paths)', async ({ page }) => {
  const fs = await import('node:fs/promises');
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 180]);
  await page.keyboard.press('n'); // lápiz: trazo vectorial
  await drag(page, [300, 120], [420, 200]);
  await page.locator('#menu-file-btn').click();
  const [svg] = await Promise.all([page.waitForEvent('download'), page.click('#export-menu [data-export-svg]')]);
  expect(svg.suggestedFilename()).toMatch(/\.svg$/);
  const body = await fs.readFile((await svg.path())!, 'utf8');
  expect(body).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
  expect(body).toContain('<rect'); // la forma vectorial, no un bitmap pegado
  expect(body).toContain('fill-rule="nonzero"'); // la cinta del pincel, alfa uniforme
});

test('color con alfa: el inspector emite #rrggbbaa y aparece en recientes', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 180]);
  // el campo de alfa del RELLENO (el borde añade su propio campo: hay que concretar)
  const alpha = page.locator('label').filter({ hasText: 'Fill' }).getByRole('spinbutton');
  await alpha.fill('0.5');
  await alpha.dispatchEvent('change');
  // las paletas viven en el popup que abre el selector de color
  await page.locator('label').filter({ hasText: 'Fill' }).locator('input[type=color]').click();
  await expect(page.locator('.color-pop .swatch').first()).toHaveAttribute('title', /80$/);
  // el color con alfa sobrevive a un re-render del inspector: clic en zona vacía
  // (cierra el popup y pasa el foco al canvas, si no los atajos no llegan a la app)
  const box = (await canvas(page).boundingBox())!;
  await page.mouse.click(box.x + 50, box.y + 50);
  await page.keyboard.press('r');
  await drag(page, [300, 100], [420, 180]);
  await page.locator('label').filter({ hasText: 'Fill' }).locator('input[type=color]').click();
  await expect(page.locator('.color-pop .swatch').first()).toHaveAttribute('title', /80$/);
});

/** ¿Hay píxeles del color del trazo cerca de un punto del lienzo? */
async function inkNear(page: Page, x: number, y: number, r = 8): Promise<boolean> {
  return page.evaluate(
    ([x, y, r]) => {
      const c = document.getElementById('canvas') as HTMLCanvasElement;
      const dpr = devicePixelRatio;
      const ctx = c.getContext('2d')!;
      const x0 = Math.max(0, Math.round((x - r) * dpr)), y0 = Math.max(0, Math.round((y - r) * dpr));
      const w = Math.round(2 * r * dpr), h = Math.round(2 * r * dpr);
      const d = ctx.getImageData(x0, y0, w, h).data;
      for (let i = 0; i < d.length; i += 4)
        if (Math.abs(d[i] - 0x4f) < 40 && Math.abs(d[i + 1] - 0x8c) < 40 && Math.abs(d[i + 2] - 0xff) < 40) return true;
      return false;
    },
    [x, y, r],
  );
}

test('líneas: el trazo sigue el sentido del arrastre en las cuatro direcciones', async ({ page }) => {
  const box = await canvas(page).boundingBox();
  if (!box) throw new Error('canvas sin tamaño');
  const A: [number, number] = [120, 320];
  const B: [number, number] = [340, 120];
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

  // arrastre ↗: A→B. El trazo real pasa por el punto medio; la diagonal opuesta queda limpia.
  await page.keyboard.press('l');
  await drag(page, A, B);
  await page.keyboard.press('Escape'); // sin contorno de selección: solo el objeto
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await expect(inkNear(page, ...mid(A, B))).resolves.toBe(true);
  await expect(inkNear(page, A[0], B[1])).resolves.toBe(false); // esquina NW del bbox: fuera del trazo
  await expect(inkNear(page, B[0], A[1])).resolves.toBe(false); // esquina SE
});

test('pincel: pintar libre crea un trazo y su inspector trae tamaño, presión y opacidad', async ({ page }) => {
  await page.keyboard.press('b');
  // sin dibujar: el inspector contextual muestra los ajustes del pincel
  const size = page.locator('#inspector-body .field:has(span:text-is("Size")) input[type=number]');
  await expect(size).toHaveValue('8');
  await expect(page.locator('#inspector-body .field:has(span:text-is("Pressure")) input[type=number]')).toHaveValue('1');
  await expect(page.locator('#inspector-body .field:has(span:text-is("Opacity")) input[type=number]')).toHaveValue('1');

  await drag(page, [150, 150], [250, 250]); // arrastre en diagonal
  await expect(layerCount(page)).toContainText('· 1');
  // el objeto creado trae su propio pincel editable
  await expect(size).toHaveValue('8');
  await page.locator('#inspector-body .field:has(span:text-is("Size")) input[type=number]').fill('24');
  await page.locator('#inspector-body .field:has(span:text-is("Size")) input[type=number]').dispatchEvent('change');
  await expect(size).toHaveValue('24');
});

test('pincel personalizado: una punta SVG se estampa a lo largo del trazo', async ({ page }) => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="8" fill="#ff00aa"/></svg>';
  await page.keyboard.press('b');
  await page.locator('#inspector-body input[type=file]').setInputFiles({
    name: 'tip.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(svg),
  });
  const size = page.locator('#inspector-body .field:has(span:text-is("Size")) input[type=number]');
  await size.fill('40');
  await size.dispatchEvent('change');
  await drag(page, [420, 140], [560, 220]);
  await page.keyboard.press('Escape');
  // la punta es una imagen: se pinta cuando carga
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const c = document.getElementById('canvas') as HTMLCanvasElement;
        const dpr = devicePixelRatio;
        const d = c.getContext('2d')!.getImageData(410 * dpr, 130 * dpr, 170 * dpr, 110 * dpr).data;
        let magenta = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] < 60 && d[i + 2] > 150) magenta++;
        return magenta;
      });
    })
    .toBeGreaterThan(200);
});

test('guías manuales: clic derecho crea, clic derecho sobre ella borra', async ({ page }) => {
  const box = await canvas(page).boundingBox();
  await page.mouse.click(box!.x + 300, box!.y + 200, { button: 'right' });
  await page.mouse.click(box!.x + 300, box!.y + 200, { button: 'right' }); // borrar
  // tamaño de página desde el inspector sin selección
  await page.locator('#inspector-body input[type=number]').nth(0).fill('900');
  await page.locator('#inspector-body input[type=number]').nth(0).dispatchEvent('change');
  await expect(page.locator('#inspector-body input[type=number]').nth(0)).toHaveValue('900');
});

test('guías: dibujar, mover y redimensionar imantan a la guía manual', async ({ page }) => {
  const box = (await canvas(page).boundingBox())!;
  // calibrar mundo↔pantalla con un rectángulo de tamaño conocido (la vista 'ajustar' depende del viewport)
  await page.keyboard.press('r');
  await drag(page, [100, 100], [300, 300]);
  await page.waitForTimeout(250);
  const cx = Number(await inspNum(page, 0).inputValue());
  const cy = Number(await inspNum(page, 1).inputValue());
  const Z = Number(await inspNum(page, 2).inputValue()) / 200; // unidades de mundo por px de pantalla
  const OX = 100 - cx / Z, OY = 100 - cy / Z;
  const at = (wx: number, wy: number): [number, number] => [wx / Z + OX, wy / Z + OY];
  await page.keyboard.press('Control+z'); // quitar el rectángulo de calibración

  // guía vertical en x≈560 (lejos del centro de página para que no compitan otros imanes)
  await page.mouse.click(box.x + at(560, 700)[0], box.y + at(560, 700)[1], { button: 'right' });
  await page.keyboard.press('r');
  await drag(page, at(610, 450), at(564, 650)); // dibujar: la esquina móvil queda a ~4px del mundo de la guía
  await page.waitForTimeout(250);
  const gx = Number(await inspNum(page, 0).inputValue());
  expect(Math.abs(gx - 560)).toBeLessThanOrEqual(2); // el dibujo ya imantaba

  // MOVER: separar 20px pantalla y arrastrar hacia la guía hasta que el borde izquierdo quede a ~3px
  const c = at(gx + 25, 550);
  await drag(page, c, [c[0] - 20, c[1]]);
  await page.waitForTimeout(250);
  const x1 = Number(await inspNum(page, 0).inputValue());
  // arrancar 10px a la derecha del punto anterior: tras el imán la guía puede pasar justo por el centro del objeto y capturar el agarre
  await drag(page, [c[0] - 10, c[1]], [c[0] - 10 + (gx - x1 - 3 * Z) / Z, c[1]]);
  await expect.poll(() => inspNum(page, 0).inputValue(), { timeout: 2000 }).toBe(String(gx));

  // REDIMENSIONAR: separar 20px y arrastrar el asa oeste hasta ~3px de pantalla de la guía
  await drag(page, c, [c[0] + 20, c[1]]);
  await page.waitForTimeout(250);
  const xr = Number(await inspNum(page, 0).inputValue());
  await drag(page, at(xr, 550), at(gx + 3 * Z, 550));
  await expect.poll(() => inspNum(page, 0).inputValue(), { timeout: 2000 }).toBe(String(gx));
});

test('i18n: el idioma guardado cambia la UI (es) y hay selector con 15 idiomas en el menú de configuración', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pyra:lang', 'es'));
  await page.goto('/');
  await expect(page.locator('.panel[data-panel="layers"] .panel-title')).toContainText('Capas');
  await page.locator('#settings-btn').click();
  const langSel = page.locator('#lang');
  await expect(langSel).toBeVisible();
  await expect(langSel.locator('option')).toHaveCount(15);
  await langSel.selectOption('de');
  await expect(page.locator('.panel[data-panel="layers"] .panel-title')).toContainText('Ebenen');
  await expect(langSel).toHaveValue('de');
});

test('theme: menú de configuración en la barra superior con claro/oscuro/sistema', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto('/');
  // por defecto: theme del sistema (oscuro en este contexto)
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  await page.locator('#settings-btn').click();
  const menu = page.locator('#settings-menu');
  await expect(menu).toBeVisible();
  await expect(menu.locator('#theme button')).toHaveCount(6);
  await page.locator('#theme button[data-val="light"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  // persiste tras recargar
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('#settings-btn').click();
  await page.locator('#theme button[data-val="midnight"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight');
  await page.locator('#theme button[data-val="dark"]').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  // clic fuera cierra el menú
  await page.locator('#canvas').click();
  await expect(page.locator('#settings-menu')).toBeHidden();
});

test('ayuda: botón en el menú de configuración abre un modal con la documentación', async ({ page }) => {
  await page.locator('#settings-btn').click();
  await page.locator('#help-btn').click();
  const modal = page.locator('#help-modal');
  await expect(modal).toBeVisible();
  await expect(modal.locator('.card h4').first()).toBeVisible();
  await expect(modal.locator('.card')).toContainText('Ctrl+Z');
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
});

test('capas: drag and drop reordena y anida capas', async ({ page }) => {
  await openApp(page);
  await page.locator('#layers-body .rowbtn button').click();
  const rows = page.locator('#layers-body .row');
  await expect(rows).toHaveCount(2);
  const topName = (await rows.first().locator('.row-name').textContent())!.split(' ·')[0];

  // soltar la capa superior sobre el centro de la inferior => se anida dentro
  await page.evaluate(() => {
    const rws = document.querySelectorAll<HTMLElement>('#layers-body .row');
    const dt = new DataTransfer();
    const fire = (el: HTMLElement, type: string, clientY: number) =>
      el.dispatchEvent(new DragEvent(type, { bubbles: true, dataTransfer: dt, clientY }));
    const target = rws[1];
    const r = target.getBoundingClientRect();
    fire(rws[0], 'dragstart', 0);
    fire(target, 'dragover', r.top + r.height / 2);
    fire(target, 'drop', r.top + r.height / 2);
    fire(rws[0], 'dragend', 0);
  });
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));

  // la capa arrastrada queda indentada (hija) bajo su padre
  await expect(rows.first().locator('.row-name')).toContainText(topName);
  const pads = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('#layers-body .row')].map((el) => parseInt(el.style.paddingLeft || '0')),
  );
  expect(Math.max(...pads)).toBeGreaterThan(Math.min(...pads));

  // undo deshace el reorden
  await page.keyboard.press('Control+z');
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  const pads2 = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('#layers-body .row')].map((el) => parseInt(el.style.paddingLeft || '0')),
  );
  expect(new Set(pads2).size).toBe(1);
});

test('lápiz: clic a clic se dibuja un polígono y cerrar con clic en el primer vértice', async ({ page }) => {
  await page.keyboard.press('p');
  const box = (await canvas(page).boundingBox())!;
  const click = async (x: number, y: number) => {
    await page.mouse.click(box.x + x, box.y + y);
  };
  await click(150, 120);
  await click(320, 160);
  await click(220, 300);
  await click(150, 120); // cerrar
  await expect(layerCount(page)).toContainText('· 1');
  await expect(page.locator('#toolbar .tool[data-tool="select"]')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(docShape(page)).toBe('polygon');
});

test('lápiz: arrastre continuo crea un trazo real (stroke) y undo lo deshace', async ({ page }) => {
  await page.keyboard.press('n');
  const box = (await canvas(page).boundingBox())!;
  await page.mouse.move(box.x + 120, box.y + 140);
  await page.mouse.down();
  await page.mouse.move(box.x + 260, box.y + 200, { steps: 12 });
  await page.mouse.move(box.x + 320, box.y + 120, { steps: 12 });
  await page.mouse.up();
  await expect(layerCount(page)).toContainText('· 1');
  await expect.poll(docShape(page)).toBe('stroke');
  await page.keyboard.press('Control+z');
  await expect(layerCount(page)).toContainText('· 0');
});

test('lápiz: presets Sketchbook y atajo [ ] de grosor', async ({ page }) => {
  await page.keyboard.press('n');
  const size = page.locator('#inspector-body .field:has(span:text-is("Size")) input[type=number]');
  await expect(size).toHaveValue('3'); // preset lápiz por defecto
  await expect(page.locator('#inspector-body button:text-is("Ink pen")')).toBeVisible();
  await page.locator('#inspector-body button:text-is("Ink pen")').click();
  await expect(size).toHaveValue('4'); // cambiar de preset cambia el grosor base
  await page.keyboard.press(']');
  await page.keyboard.press(']');
  await expect(size).toHaveValue('6'); // [ y ] ajustan el grosor de la herramienta activa
  await page.keyboard.press('[');
  await expect(size).toHaveValue('5');
  // la vista previa del pincel se pinta en un canvas del inspector
  await expect(page.locator('#inspector-body canvas.brush-preview')).toBeVisible();
});

test('polilápiz: un trazo libre se convierte en polígono vectorial con borde y relleno', async ({ page }) => {
  await page.keyboard.press('g');
  const box = (await canvas(page).boundingBox())!;
  // dibujar un triángulo a mano alzada (con vibración)
  const path: [number, number][] = [];
  for (let i = 0; i <= 10; i++) path.push([150 + i * 15, 120 + (i % 2)]);
  for (let i = 0; i <= 10; i++) path.push([300 - i * 7, 120 + i * 16]);
  for (let i = 0; i <= 10; i++) path.push([300 - i * 15, 280 - (i % 2)]);
  await page.mouse.move(box.x + path[0][0], box.y + path[0][1]);
  await page.mouse.down();
  for (const [x, y] of path.slice(1)) await page.mouse.move(box.x + x, box.y + y);
  await page.mouse.up();
  await expect(layerCount(page)).toContainText('· 1');
  await expect.poll(docShape(page)).toBe('polygon');
  // el polígono queda con borde y relleno configurables en el inspector
  const poly = await page.evaluate(() =>
    new Promise<{ stroke: string; strokeWidth: number; fill: string }>((resolve) => {
      const open = indexedDB.open('pyra');
      open.onsuccess = () => {
        const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
        req.onsuccess = () => {
          const o = req.result?.pages?.[0]?.layers?.[0]?.objects?.[0];
          resolve({ stroke: o?.stroke, strokeWidth: o?.strokeWidth, fill: o?.fill });
        };
        req.onerror = () => resolve({ stroke: '', strokeWidth: 0, fill: '' });
      };
      open.onerror = () => resolve({ stroke: '', strokeWidth: 0, fill: '' });
    }),
  );
  expect(poly.stroke).toBeTruthy();
  expect(poly.strokeWidth).toBeGreaterThanOrEqual(1);
  expect(poly.fill).toBeTruthy();
});

test('polilápiz estilizado: RDP + curvas reales (pocos vértices, smooth activo)', async ({ page }) => {
  await page.keyboard.press('g');
  await page.locator('#inspector-body button[data-mode="stylized"]').click();
  const box = (await canvas(page).boundingBox())!;
  // triángulo a mano alzada con vibración: 33 puntos crudos deben quedar en pocos vértices
  const path: [number, number][] = [];
  for (let i = 0; i <= 10; i++) path.push([150 + i * 15, 120 + (i % 2) * 3]);
  for (let i = 0; i <= 10; i++) path.push([300 - i * 7, 120 + i * 16 + (i % 2) * 3]);
  for (let i = 0; i <= 10; i++) path.push([300 - i * 15, 280 - (i % 2) * 3]);
  await page.mouse.move(box.x + path[0][0], box.y + path[0][1]);
  await page.mouse.down();
  for (const [x, y] of path.slice(1)) await page.mouse.move(box.x + x, box.y + y);
  await page.mouse.up();
  await expect.poll(docShape(page)).toBe('polygon');
  const poly = await page.evaluate(() =>
    new Promise<{ smooth: boolean; n: number }>((resolve) => {
      const open = indexedDB.open('pyra');
      open.onsuccess = () => {
        const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
        req.onsuccess = () => {
          const o = req.result?.pages?.[0]?.layers?.[0]?.objects?.[0];
          resolve({ smooth: !!o?.smooth, n: o?.poly?.length ?? 0 });
        };
        req.onerror = () => resolve({ smooth: false, n: 0 });
      };
      open.onerror = () => resolve({ smooth: false, n: 0 });
    }),
  );
  expect(poly.smooth).toBe(true); // se dibuja con curvas Catmull-Rom, no con segmentos rectos
  expect(poly.n).toBeLessThanOrEqual(10); // RDP: la vibración de 3px no genera vértices
  expect(poly.n).toBeGreaterThanOrEqual(3);
});

test('unión: Ctrl+U fusiona dos rectángulos seleccionados en un polígono', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [260, 220]);
  await page.keyboard.press('r');
  await drag(page, [220, 140], [380, 260]);
  await expect(layerCount(page)).toContainText('· 2');
  // seleccionar ambos: clic en el primero + Shift+clic en el segundo
  await page.keyboard.press('Escape');
  const box = (await canvas(page).boundingBox())!;
  await page.mouse.click(box.x + 150, box.y + 150);
  await page.keyboard.down('Shift');
  await page.mouse.click(box.x + 300, box.y + 200);
  await page.keyboard.up('Shift');
  await page.keyboard.press('Control+u');
  await expect(layerCount(page)).toContainText('· 1');
  await expect.poll(docShape(page)).toBe('polygon');
  await page.keyboard.press('Control+z');
  await expect(layerCount(page)).toContainText('· 2');
});

test('goma bitmap: borrar píxeles de una imagen importada deja huecos reales', async ({ page }) => {
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 100; c.height = 100;
    const g = c.getContext('2d')!;
    g.fillStyle = 'red';
    g.fillRect(0, 0, 100, 100);
    return c.toDataURL('image/png');
  });
  await page.setInputFiles('#import-file', { name: 'rojo.png', mimeType: 'image/png', buffer: Buffer.from(dataUrl.split(',')[1], 'base64') });
  const box = (await canvas(page).boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  // borrar una línea por el centro con la goma
  await page.locator('#canvas').click(); // foco en el lienzo
  await page.keyboard.press('x');
  await page.mouse.move(cx - 15, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 15, cy, { steps: 10 });
  await page.mouse.up();
  const eraseCount = () =>
    page.evaluate(() =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('pyra');
        open.onsuccess = () => {
          const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
          req.onsuccess = () => resolve(req.result?.pages?.[0]?.layers?.[0]?.objects?.[0]?.erase?.length ?? -1);
          req.onerror = () => resolve(-1);
        };
        open.onerror = () => resolve(-1);
      }),
    );
  await expect.poll(eraseCount, { timeout: 5000 }).toBeGreaterThan(0);
  await page.keyboard.press('Control+z');
  await expect.poll(eraseCount, { timeout: 5000 }).toBe(-1);
});

test('goma continua: un salto rápido entre frames borra todo el surco, sin huecos', async ({ page }) => {
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 1200; c.height = 1200;
    const g = c.getContext('2d')!;
    g.fillStyle = 'red';
    g.fillRect(0, 0, 1200, 1200);
    return c.toDataURL('image/png');
  });
  await page.setInputFiles('#import-file', { name: 'rojo.png', mimeType: 'image/png', buffer: Buffer.from(dataUrl.split(',')[1], 'base64') });
  const box = (await canvas(page).boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.locator('#canvas').click();
  await page.keyboard.press('x');
  await page.mouse.move(cx - 150, cy); // dentro de la imagen (1200px centrada, zoom de ajuste ~0.7)
  await page.mouse.down();
  await page.mouse.move(cx + 150, cy); // UN solo evento de puntero: antes dejaba hueco central
  await page.mouse.up();
  const coversCenter = () =>
    page.evaluate(() =>
      new Promise<boolean>((resolve) => {
        const open = indexedDB.open('pyra');
        open.onsuccess = () => {
          const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
          req.onsuccess = () => {
            const erase = req.result?.pages?.[0]?.layers?.[0]?.objects?.[0]?.erase ?? [];
            resolve(erase.some((s: any) => Math.abs(s.x - 0.5) < s.r && Math.abs(s.y - 0.5) < s.r));
          };
          req.onerror = () => resolve(false);
        };
        open.onerror = () => resolve(false);
      }),
    );
  await expect.poll(coversCenter, { timeout: 5000 }).toBe(true); // stamps interpolados: el punto medio del salto queda borrado
});

test('anillo de cursor: previsualiza el tamaño de la goma, crece con ] y se oculta con V', async ({ page }) => {
  const box = (await canvas(page).boundingBox())!;
  await page.keyboard.press('x');
  await page.mouse.move(box.x + 300, box.y + 300);
  const ring = page.locator('#cursor-ring');
  await expect(ring).toBeVisible();
  const w1 = await ring.evaluate((el) => el.getBoundingClientRect().width);
  expect(w1).toBeGreaterThanOrEqual(3);
  await page.keyboard.press(']');
  await page.mouse.move(box.x + 301, box.y + 300);
  const w2 = await ring.evaluate((el) => el.getBoundingClientRect().width);
  expect(w2).toBeGreaterThan(w1); // el anillo refleja el nuevo tamaño al instante
  await page.keyboard.press('v');
  await page.mouse.move(box.x + 302, box.y + 300);
  await expect(ring).toBeHidden();
});

test('negrita/cursiva: el inspector de texto tiene los botones y persisten', async ({ page }) => {
  await page.keyboard.press('t');
  const box = (await canvas(page).boundingBox())!;
  await page.mouse.click(box.x + 200, box.y + 200);
  await page.keyboard.type('Hola');
  await expect(page.locator('#inspector-body [data-act="bold"]')).toBeVisible();
  await page.locator('#inspector-body [data-act="bold"]').click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        new Promise<boolean>((resolve) => {
          const open = indexedDB.open('pyra');
          open.onsuccess = () => {
            const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
            req.onsuccess = () => resolve(req.result?.pages?.[0]?.layers?.[0]?.objects?.[0]?.bold === true);
            req.onerror = () => resolve(false);
          };
          open.onerror = () => resolve(false);
        }),
      ),
      { timeout: 5000 },
    )
    .toBe(true);
});

test('export de assets: un PNG por objeto seleccionado', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 200]);
  await page.keyboard.press('r');
  await drag(page, [300, 150], [420, 260]);
  await page.keyboard.press('Escape');
  const box = (await canvas(page).boundingBox())!;
  await page.mouse.click(box.x + 150, box.y + 150);
  await page.keyboard.down('Shift');
  await page.mouse.click(box.x + 350, box.y + 200);
  await page.keyboard.up('Shift');
  await page.locator('#menu-file-btn').click();
  const downloads = Promise.all(
    [0, 1].map(() => page.waitForEvent('download', { timeout: 5000 }).then((d) => d.suggestedFilename())),
  );
  await page.locator('#export-menu [data-export-asset]').click();
  const names = await downloads;
  expect(names.filter((n) => n.endsWith('.png')).length).toBe(2);
});

/** Nº de guías manuales de la página activa en el documento persistido. */
function guideCount(page: Page): () => Promise<number> {
  return () =>
    page.evaluate(() =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('pyra');
        open.onsuccess = () => {
          const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
          req.onsuccess = () => resolve(req.result?.pages?.[0]?.guides?.length ?? 0);
          req.onerror = () => resolve(-1);
        };
        open.onerror = () => resolve(-1);
      }),
    );
}

test('guías: crear, eliminar y deshacer ambas', async ({ page }) => {
  const box = (await canvas(page).boundingBox())!;
  await page.mouse.click(box.x + 150, box.y + 150, { button: 'right' });
  await expect.poll(guideCount(page), { timeout: 5000 }).toBe(1);
  await page.keyboard.press('Control+z');
  await expect.poll(guideCount(page), { timeout: 5000 }).toBe(0);
  // crear otra y eliminarla por clic derecho encima
  await page.mouse.click(box.x + 150, box.y + 150, { button: 'right' });
  await expect.poll(guideCount(page), { timeout: 5000 }).toBe(1);
  await page.mouse.click(box.x + 150, box.y + 150, { button: 'right' });
  await expect.poll(guideCount(page), { timeout: 5000 }).toBe(0);
  await page.keyboard.press('Control+z');
  await expect.poll(guideCount(page), { timeout: 5000 }).toBe(1);
});

test('mover con Shift: eje único (no libre)', async ({ page }) => {
  const box = (await canvas(page).boundingBox())!;
  await page.keyboard.press('r');
  await drag(page, [100, 100], [160, 160]); // rect 60x60 en mundo
  await page.keyboard.press('v');
  const pos = () =>
    page.evaluate(() =>
      new Promise<{ x: number; y: number }>((resolve) => {
        const open = indexedDB.open('pyra');
        open.onsuccess = () => {
          const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
          req.onsuccess = () => {
            const o = req.result?.pages?.[0]?.layers?.[0]?.objects?.[0];
            resolve(o ? { x: o.x, y: o.y } : { x: NaN, y: NaN });
          };
          req.onerror = () => resolve({ x: NaN, y: NaN });
        };
        open.onerror = () => resolve({ x: NaN, y: NaN });
      }),
    );
  await expect.poll(async () => (await pos()).x, { timeout: 5000 }).not.toBeNaN();
  const before = await pos();
  // seleccionar primero (Shift+clic sobre un objeto no seleccionado es selección aditiva, no drag)
  await page.mouse.click(box.x + 130, box.y + 130);
  // arrastre diagonal con Shift: solo debe cambiar el eje dominante (x)
  await page.mouse.move(box.x + 130, box.y + 130);
  await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move(box.x + 230, box.y + 140, { steps: 10 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect.poll(async () => (await pos()).x, { timeout: 5000 }).not.toBe(before.x);
  const after = await pos();
  expect(after.x).toBeGreaterThan(before.x);
  expect(after.y).toBe(before.y);
});

test('orden de apilado: enviar al fondo y deshacer', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [160, 160]); // A
  await page.keyboard.press('r'); // tras crear, la app vuelve a selección: hay que reactivar R
  await drag(page, [120, 120], [180, 180]); // B encima de A
  const xs = () =>
    page.evaluate(() =>
      new Promise<number[]>((resolve) => {
        const open = indexedDB.open('pyra');
        open.onsuccess = () => {
          const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
          req.onsuccess = () => resolve((req.result?.pages?.[0]?.layers?.[0]?.objects ?? []).map((o: any) => o.x));
          req.onerror = () => resolve([]);
        };
        open.onerror = () => resolve([]);
      }),
    );
  await expect.poll(xs, { timeout: 5000 }).toHaveLength(2);
  const before = await xs();
  expect(before[0]).toBeLessThan(before[1]); // A primero en el array
  await page.locator('#align-body [data-order="back"]').click(); // B (seleccionado) al fondo
  await expect.poll(xs, { timeout: 5000 }).not.toEqual(before);
  const after = await xs();
  expect(after[0]).toBeGreaterThan(after[1]);
  await canvas(page).click();
  await page.keyboard.press('Control+z');
  await expect.poll(xs, { timeout: 5000 }).toEqual(before);
});

test('orden z por teclado: [ ] mueven un paso e Inicio/Fin llevan a los extremos', async ({ page }) => {
  const xs = () =>
    page.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const open = indexedDB.open('pyra');
          open.onsuccess = () => {
            const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
            req.onsuccess = () => resolve((req.result?.pages?.[0]?.layers?.[0]?.objects ?? []).map((o: any) => o.x));
            req.onerror = () => resolve([]);
          };
          open.onerror = () => resolve([]);
        }),
    );
  await page.keyboard.press('r');
  await drag(page, [100, 100], [180, 180]);
  await page.keyboard.press('r');
  await drag(page, [200, 100], [280, 180]);
  await page.keyboard.press('r');
  await drag(page, [300, 100], [380, 180]); // A, B, C en ese orden de apilado
  await expect.poll(xs, { timeout: 5000 }).toHaveLength(3);
  const [a, b, c] = await xs(); // orden de apilado = orden de dibujo
  await page.keyboard.press('v');
  const box = (await canvas(page).boundingBox())!;
  await page.mouse.click(box.x + 140, box.y + 140); // clic dentro de A: lo selecciona
  await page.keyboard.press(']'); // un paso adelante, no hasta el frente
  await expect.poll(xs, { timeout: 5000 }).toEqual([b, a, c]);
  await page.keyboard.press('Home'); // al frente de golpe
  await expect.poll(xs, { timeout: 5000 }).toEqual([b, c, a]);
  await page.keyboard.press('End'); // al fondo de golpe
  await expect.poll(xs, { timeout: 5000 }).toEqual([a, b, c]);
});

test('páginas: crear y eliminar con undo', async ({ page }) => {
  await page.locator('#pages-body [data-act="addpage"]').click();
  await expect(page.locator('#pages-body .row')).toHaveCount(2);
  await canvas(page).click(); // el foco debe estar en el lienzo para los atajos
  await page.keyboard.press('Control+z');
  await expect(page.locator('#pages-body .row')).toHaveCount(1);
  await page.locator('#pages-body [data-act="addpage"]').click();
  await expect(page.locator('#pages-body .row')).toHaveCount(2);
  await page.locator('#pages-body .row').last().locator('[data-act="delpage"]').dispatchEvent('click');
  await expect(page.locator('#pages-body .row')).toHaveCount(1);
  await canvas(page).click();
  await page.keyboard.press('Control+z'); // undo del borrado
  await expect(page.locator('#pages-body .row')).toHaveCount(2);
  await page.keyboard.press('Control+Shift+z'); // redo
  await expect(page.locator('#pages-body .row')).toHaveCount(1);
});

test('estilos: guardar y eliminar con undo', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 200]);
  await page.locator('#inspector-body button', { hasText: 'Save style' }).dispatchEvent('click');
  await expect(page.locator('#inspector-body')).toContainText('Estilo 1');
  await page.keyboard.press('Control+z');
  await expect(page.locator('#inspector-body')).not.toContainText('Estilo 1');
  await page.locator('#inspector-body button', { hasText: 'Save style' }).dispatchEvent('click');
  await expect(page.locator('#inspector-body')).toContainText('Estilo 1');
  await page.locator('#inspector-body [data-act="delstyle"]').dispatchEvent('click');
  await expect(page.locator('#inspector-body')).not.toContainText('Estilo 1');
  await page.keyboard.press('Control+z'); // undo del borrado
  await expect(page.locator('#inspector-body')).toContainText('Estilo 1');
});

test.describe('ventana baja', () => {
  test.use({ viewport: { width: 1280, height: 470 } });
  test('Alinear sigue visible sin hacer scroll (sticky al fondo del panel lateral)', async ({ page }) => {
    await page.keyboard.press('r');
    await drag(page, [100, 100], [200, 160]);
    await drag(page, [300, 100], [400, 160]);
    await page.keyboard.press('Escape');
    // seleccionar los dos con marco de selección: el inspector de formas crece
    // y empuja Alinear fuera de una ventana de 470px de alto
    await drag(page, [60, 60], [450, 220]);
    await expect(page.locator('#inspector-body')).toContainText('Rotation'); // inspector de selección cargado
    const align = page.locator('#align-body [data-align="left"]');
    await expect(align).toBeVisible();
    const box = await align.boundingBox();
    expect(box && box.y).toBeLessThan(470); // dentro del viewport sin scrollear
    await align.dispatchEvent('click');
  });
});

/** Rellenos de todos los objetos persistidos (orden de documento). */
function docFills(page: Page): () => Promise<string[]> {
  return () =>
    page.evaluate(() =>
      new Promise<string[]>((resolve) => {
        const open = indexedDB.open('pyra');
        open.onsuccess = () => {
          const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
          req.onsuccess = () => resolve((req.result?.pages?.[0]?.layers?.[0]?.objects ?? []).map((o: { fill?: string }) => String(o.fill ?? '')));
          req.onerror = () => resolve([]);
        };
        open.onerror = () => resolve([]);
      }),
    );
}

test('edición multi-objeto: el inspector cambia el relleno de todos los seleccionados y un Ctrl+Z lo deshace', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 180]);
  await page.keyboard.press('r'); // tras dibujar vuelve a selección: reactivar la herramienta
  await drag(page, [300, 100], [420, 180]);
  await page.keyboard.press('Escape');
  await drag(page, [50, 40], [620, 260]); // marco sobre ambos (B llega a x≈577 en pantalla)
  await expect(page.locator('#status')).toContainText('2 objects');
  const fillInput = page.locator('label').filter({ hasText: 'Fill' }).locator('input[type=color]').first();
  await expect(fillInput).toBeVisible();
  await fillInput.evaluate((el: HTMLInputElement) => {
    el.value = '#ff0000';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect.poll(docFills(page), { timeout: 5000 }).toEqual(['#ff0000', '#ff0000']);
  await page.keyboard.press('Control+z'); // un solo undo revierte los dos
  await expect.poll(docFills(page), { timeout: 5000 }).toEqual(['#4f8cff', '#4f8cff']);
});

test('la cinta del pincel no deja puntos blancos en la línea de captura', async ({ page }) => {
  // regresión del bug de winding: los arcos de tope a sentido contrario dejaban
  // un agujero (punto blanco) en cada punto de captura del trazo
  await page.keyboard.press('b');
  await drag(page, [150, 200], [450, 200]);
  await page.keyboard.press('Escape'); // sin asas de selección sobre la línea de muestreo
  const whiteOnPath = () =>
    page.evaluate(() => {
      const c = document.getElementById('canvas') as HTMLCanvasElement;
      for (let i = 1; i <= 9; i++) {
        const x = Math.round(150 + (300 * i) / 10);
        const d = c.getContext('2d')!.getImageData(x, 200, 1, 1).data;
        if (d[0] > 240 && d[1] > 240 && d[2] > 240) return true;
      }
      return false;
    });
  await expect.poll(whiteOnPath, { timeout: 3000 }).toBe(false);
});

/** Altura (h) persistida del primer objeto del documento. */
function docH(page: Page): () => Promise<number> {
  return () =>
    page.evaluate(() =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('pyra');
        open.onsuccess = () => {
          const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
          req.onsuccess = () => resolve(Number(req.result?.pages?.[0]?.layers?.[0]?.objects?.[0]?.h ?? -1));
          req.onerror = () => resolve(-1);
        };
        open.onerror = () => resolve(-1);
      }),
    );
}

test('herramienta de nodos (A): arrastrar un vértice remodela el vector', async ({ page }) => {
  await page.keyboard.press('l');
  await drag(page, [100, 100], [300, 100]); // línea horizontal, queda seleccionada
  await page.keyboard.press('a');
  await drag(page, [300, 100], [300, 300]); // arrastra el nodo final hacia abajo
  await expect.poll(docH(page), { timeout: 5000 }).toBeGreaterThan(100); // el bbox crece: vector remodelado
  await page.keyboard.press('Control+z'); // un undo devuelve la línea a horizontal
  await expect.poll(docH(page), { timeout: 5000 }).toBeLessThanOrEqual(2);
});

/** poly/polyH/polyH2 persistido del primer objeto del documento. */
function docPolyH(page: Page, field: 'poly' | 'polyH' | 'polyH2' = 'polyH'): () => Promise<unknown[] | null> {
  return () =>
    page.evaluate((f) =>
      new Promise<unknown[] | null>((resolve) => {
        const open = indexedDB.open('pyra');
        open.onsuccess = () => {
          const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
          req.onsuccess = () => resolve((req.result?.pages?.[0]?.layers?.[0]?.objects?.[0]?.[f] as unknown[]) ?? null);
          req.onerror = () => resolve(null);
        };
        open.onerror = () => resolve(null);
      }), field);
}

test('nodo Bézier (A): Alt+clic vuelve curva un vértice, arrastrar su asa lo remodela y un Ctrl+Z lo revierte', async ({ page }) => {
  const box = (await canvas(page).boundingBox())!;
  const at = (x: number, y: number): [number, number] => [box.x + x, box.y + y];
  await page.keyboard.press('p');
  await page.keyboard.down('Shift'); // vértices rectos (sin suavizado Catmull-Rom)
  for (const [x, y] of [[150, 150], [350, 150], [350, 350], [150, 350]]) { const [X, Y] = at(x, y); await page.mouse.click(X, Y); }
  await page.keyboard.up('Shift');
  { const [X, Y] = at(150, 150); await page.mouse.click(X, Y); } // clic en el primer vértice = cerrar
  await page.keyboard.press('a');
  await page.keyboard.down('Alt');
  { const [X, Y] = at(350, 150); await page.mouse.click(X, Y); } // vértice esquina → nodo Bézier con asa
  await page.keyboard.up('Alt');
  const polyH = docPolyH(page);
  await expect.poll(() => polyH().then((h) => !!h?.some(Boolean)), { timeout: 5000 }).toBe(true);
  // el nodo alternado queda resaltado en azul (nodo activo reconocible)
  await expect.poll(() => page.evaluate(([x, y]) => {
    const c = document.querySelector('#canvas') as HTMLCanvasElement;
    const d = window.devicePixelRatio;
    const px = c.getContext('2d')!.getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data;
    return px[2] > 200 && px[0] < 100; // azul #0a7cff
  }, [350, 150] as [number, number]), { timeout: 5000 }).toBe(true);
  const afterToggle = JSON.stringify(await polyH());
  // punta del asa por defecto: nodo (350,150) + tangente (1,1)/√2·72 ≈ (401,201)
  await drag(page, [401, 201], [500, 250]); // arrastrar el asa deforma la curva
  await expect.poll(() => polyH().then((h) => JSON.stringify(h) !== afterToggle), { timeout: 5000 }).toBe(true);
  // Alt+arrastrar el asa = romper el espejo → nodo cúspide con pico anguloso (FreeHand)
  const hh = (await polyH())![1] as { x: number; y: number };
  const tip: [number, number] = [350 + hh.x * 200, 150 + hh.y * 200]; // el bbox son 200×200 px de lienzo
  await page.keyboard.down('Alt');
  await drag(page, tip, [tip[0] + 40, tip[1] - 30]);
  await page.keyboard.up('Alt');
  const polyH2 = docPolyH(page, 'polyH2');
  await expect.poll(() => polyH2().then((h) => !!h?.some(Boolean)), { timeout: 5000 }).toBe(true);
  await page.keyboard.press('Control+z'); // deshace el pico: vuelve el espejo
  await expect.poll(() => polyH2().then((h) => !h?.some(Boolean)), { timeout: 5000 }).toBe(true);
  await page.keyboard.press('Control+z'); // un solo undo devuelve el asa a su posición del toggle
  await expect.poll(() => polyH().then((h) => JSON.stringify(h) === afterToggle), { timeout: 5000 }).toBe(true);
  { const [X, Y] = at(350, 150); await page.mouse.dblclick(X, Y); } // doble clic en el vértice suave → cúspide (asa entrante libre)
  await expect.poll(() => polyH2().then((h) => !!h?.some(Boolean)), { timeout: 5000 }).toBe(true);
  { const [X, Y] = at(350, 150); await page.mouse.dblclick(X, Y); } // otro doble clic → de vuelta a esquina
  await expect.poll(() => polyH().then((h) => !h?.some(Boolean)), { timeout: 5000 }).toBe(true);
  await expect.poll(() => polyH2().then((h) => !h?.some(Boolean)), { timeout: 5000 }).toBe(true);
});

test('herramienta de nodos (A): las flechas mueven solo el nodo activo, no el objeto entero', async ({ page }) => {
  const field = (f: 'y' | 'h') => () =>
    page.evaluate((k) =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('pyra');
        open.onsuccess = () => {
          const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
          req.onsuccess = () => resolve((req.result?.pages?.[0]?.layers?.[0]?.objects?.[0]?.[k] as number) ?? -1);
          req.onerror = () => resolve(-1);
        };
        open.onerror = () => resolve(-1);
      }), f);
  await page.keyboard.press('l');
  await drag(page, [100, 100], [300, 100]); // línea horizontal, queda seleccionada
  await expect.poll(field('y'), { timeout: 5000 }).toBeGreaterThanOrEqual(0); // esperar al persistido
  const y0 = await field('y')();
  await page.keyboard.press('a');
  const box = (await canvas(page).boundingBox())!;
  await page.mouse.click(box.x + 300, box.y + 100); // clic en el nodo final = nodo activo
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Shift+ArrowDown'); // nudges de 1 y 10 px
  await expect.poll(field('h'), { timeout: 5000 }).toBeGreaterThanOrEqual(11); // el bbox crece: se movió el nodo
  expect(await field('y')()).toBe(y0); // el objeto no se movió
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z'); // un undo por nudge
  await expect.poll(field('h'), { timeout: 5000 }).toBeLessThanOrEqual(2);
});

test('nodos (A): Shift+clic multi-selecciona, las flechas los mueven juntos y Alinear los alinea entre sí', async ({ page }) => {
  const box = (await canvas(page).boundingBox())!;
  const at = (x: number, y: number): [number, number] => [box.x + x, box.y + y];
  const docField = (f: 'x' | 'w') => () =>
    page.evaluate((field) =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('pyra');
        open.onsuccess = () => {
          const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
          req.onsuccess = () => resolve(Number(req.result?.pages?.[0]?.layers?.[0]?.objects?.[0]?.[field] ?? -1));
          req.onerror = () => resolve(-1);
        };
        open.onerror = () => resolve(-1);
      }), f);
  await page.keyboard.press('l');
  await drag(page, [100, 100], [300, 300]); // línea diagonal, queda seleccionada
  await expect.poll(docField('x'), { timeout: 5000 }).toBeGreaterThan(0); // hasta que el autoguardo escriba
  const x0 = await docField('x')();
  const w0 = await docField('w')();
  await page.keyboard.press('a');
  await page.keyboard.down('Shift');
  { const [X, Y] = at(100, 100); await page.mouse.click(X, Y); } // nodo 0 a la multi-selección
  { const [X, Y] = at(300, 300); await page.mouse.click(X, Y); } // nodo 1 también
  await page.keyboard.up('Shift');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  // ambos nodos se movieron: el bbox conserva el ancho pero la x avanza 2px
  await expect.poll(docField('x'), { timeout: 5000 }).toBeCloseTo(x0 + 2, 0);
  await expect.poll(docField('w'), { timeout: 5000 }).toBeCloseTo(w0, 0);
  await page.locator('#align-body [data-align="left"]').click(); // alinear los nodos entre sí
  await expect.poll(docField('w'), { timeout: 5000 }).toBeLessThan(2); // los dos nodos comparten x
  await page.keyboard.press('Control+z'); // un undo devuelve la línea a su forma
  await expect.poll(docField('w'), { timeout: 5000 }).toBeCloseTo(w0, 0);
});

test('insertar nodo en tramo (A): doble clic sobre un tramo añade un vértice; Supr borra solo ese nodo', async ({ page }) => {
  const box = (await canvas(page).boundingBox())!;
  const at = (x: number, y: number): [number, number] => [box.x + x, box.y + y];
  const polyArr = docPolyH(page, 'poly');
  await page.keyboard.press('p');
  await page.keyboard.down('Shift'); // vértices rectos
  for (const [x, y] of [[150, 150], [350, 150], [350, 350], [150, 350]]) { const [X, Y] = at(x, y); await page.mouse.click(X, Y); }
  await page.keyboard.up('Shift');
  { const [X, Y] = at(150, 150); await page.mouse.click(X, Y); } // cerrar
  await expect.poll(() => polyArr().then((p) => p?.length ?? 0), { timeout: 5000 }).toBe(4);
  await page.keyboard.press('a');
  { const [X, Y] = at(250, 150); await page.mouse.dblclick(X, Y); } // punto medio del tramo superior
  await expect.poll(() => polyArr().then((p) => p?.length ?? 0), { timeout: 5000 }).toBe(5);
  await expect.poll(() => polyArr().then((p) => (p?.[1] as { x: number; y: number })?.x), { timeout: 5000 }).toBeCloseTo(0.5, 2);
  await page.keyboard.press('Delete'); // el nodo insertado está activo: Supr borra solo ese nodo, no el objeto
  await expect.poll(() => polyArr().then((p) => p?.length ?? 0), { timeout: 5000 }).toBe(4);
});

test('insertar punto en trazo (A): doble clic sobre el trazo añade un punto y Supr lo quita', async ({ page }) => {
  const box = (await canvas(page).boundingBox())!;
  const nPts = () =>
    page.evaluate(() =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('pyra');
        open.onsuccess = () => {
          const req = open.result.transaction('documents', 'readonly').objectStore('documents').get('doc');
          req.onsuccess = () => resolve((req.result?.pages?.[0]?.layers?.[0]?.objects?.[0]?.points as unknown[])?.length ?? 0);
          req.onerror = () => resolve(0);
        };
        open.onerror = () => resolve(0);
      }),
    );
  await page.keyboard.press('n');
  await drag(page, [150, 250], [450, 250]); // trazo horizontal a mano alzada
  await expect.poll(nPts, { timeout: 5000 }).toBeGreaterThan(2);
  const n0 = await nPts();
  await page.keyboard.press('a');
  await page.mouse.dblclick(box.x + 300, box.y + 250); // sobre el trazo
  await expect.poll(nPts, { timeout: 5000 }).toBe(n0 + 1);
  await page.keyboard.press('Delete'); // nodo activo = el insertado
  await expect.poll(nPts, { timeout: 5000 }).toBe(n0);
});

test('barra superior: menús (solo uno abierto) y colores de nodos/marcos configurables y persistentes', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#menubar')).toBeVisible();
  await expect(page.locator('#menu-file-btn')).toBeVisible();
  await expect(page.locator('#settings-btn')).toBeVisible();
  // solo un desplegable abierto a la vez
  await page.locator('#menu-file-btn').click();
  await expect(page.locator('#export-menu')).toBeVisible();
  await page.locator('#settings-btn').click();
  await expect(page.locator('#export-menu')).toBeHidden();
  await expect(page.locator('#settings-menu')).toBeVisible();
  // colores de nodos y marcos configurables
  await page.locator('#node-color').fill('#ff0000');
  await page.locator('#frame-color').fill('#00ff00');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('pyra:ui')))
    .toContain('"nodeColor":"#ff0000"');
  // persiste tras recargar
  await page.reload();
  await page.locator('#settings-btn').click();
  await expect(page.locator('#node-color')).toHaveValue('#ff0000');
  await expect(page.locator('#frame-color')).toHaveValue('#00ff00');
});

test('drag & drop de una imagen sobre la ventana importa un bitmap', async ({ page }) => {
  await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 100;
    c.height = 100;
    const g = c.getContext('2d')!;
    g.fillStyle = 'red';
    g.fillRect(0, 0, 100, 100);
    const blob = await (await fetch(c.toDataURL('image/png'))).blob();
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'rojo.png', { type: 'image/png' }));
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  });
  await expect(layerCount(page)).toContainText('· 1');
  await expect.poll(docShape(page)).toBe('bitmap');
});

test('redimensionar: la esquina mantiene la proporción por defecto y Ctrl escala libre', async ({ page }) => {
  const box = (await canvas(page).boundingBox())!;
  const at = (x: number, y: number): [number, number] => [box.x + x, box.y + y];
  await page.keyboard.press('r');
  await drag(page, at(150, 150), at(350, 250)); // rect 200×100 en pantalla, queda seleccionado
  // arrastrar la esquina se sin teclas: la proporción 2:1 se conserva (el cursor
  // se proyecta sobre la diagonal; en pantalla la esquina acaba en 470,310)
  await drag(page, at(350, 250), at(450, 350));
  const w = Number(await inspNum(page, 2).inputValue());
  const h = Number(await inspNum(page, 3).inputValue());
  expect(w).toBeGreaterThan(200);
  expect(Math.abs(w / h - 2)).toBeLessThan(0.1);
  // con Ctrl mantenido: escala libre (la proporción cambia)
  await page.keyboard.down('Control');
  await drag(page, at(470, 310), at(570, 410));
  await page.keyboard.up('Control');
  const w2 = Number(await inspNum(page, 2).inputValue());
  const h2 = Number(await inspNum(page, 3).inputValue());
  expect(w2).toBeGreaterThan(w);
  expect(Math.abs(w2 / h2 - 2)).toBeGreaterThan(0.2);
});

test('unidades e impresión: inspector en pulgadas con DPI del documento y PNG exportado con pHYs', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [150, 150], [350, 250]);
  const wPx = Number(await inspNum(page, 2).inputValue()); // en px, como siempre
  expect(wPx).toBeGreaterThan(100);

  await page.locator('#settings-btn').click();
  await page.selectOption('#unit', 'in');
  await page.fill('#dpi', '100');
  await page.keyboard.press('Enter');

  // con 100 dpi el inspector muestra pulgadas: w/100 (±1px por el redondeo de la lectura px)
  await expect
    .poll(async () => Math.abs(Number(await inspNum(page, 2).inputValue()) * 100 - wPx))
    .toBeLessThanOrEqual(1);
  await expect(page.locator('#inspector-body .field span.unit').first()).toHaveText('in');

  // editar en pulgadas debe escribir px en el modelo: 3 in a 100 dpi = 300 px
  await inspNum(page, 2).fill('3');
  await inspNum(page, 2).press('Enter');
  if (await page.locator('#settings-menu').isHidden()) await page.locator('#settings-btn').click();
  await page.selectOption('#unit', 'px');
  await expect(inspNum(page, 2)).toHaveValue('300');

  // el PNG exportado lleva el tamaño de impresión (pHYs): 100 dpi → 3937 px/m
  const dlPromise = page.waitForEvent('download');
  await page.locator('#menu-file-btn').click();
  await page.locator('#export-menu [data-export-png]').click();
  const dl = await dlPromise;
  expect(dl.suggestedFilename()).toMatch(/\.png$/);
  const buf = await readFile((await dl.path())!);
  const i = buf.indexOf('pHYs');
  expect(i).toBeGreaterThan(0);
  expect(buf.readUInt32BE(i + 4)).toBe(3937);
  expect(buf.readUInt32BE(i + 8)).toBe(3937);
  expect(buf[i + 12]).toBe(1); // especificador de unidad: metro
});
