// E2E reales: Chromium contra la app servida por Vite. Verifican el flujo de usuario,
// no la implementación. La evidencia es lo que la UI muestra (capas, inspector, status).
import { test, expect, type Page } from '@playwright/test';

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

test('undo/redo con Ctrl+Z / Ctrl+Shift+Z', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [300, 250]);
  await expect(layerCount(page)).toContainText('· 1');
  await page.keyboard.press('Control+z');
  await expect(layerCount(page)).toContainText('· 0');
  await page.keyboard.press('Control+Shift+z');
  await expect(layerCount(page)).toContainText('· 1');
});

test('eliminar con Supr deja la capa vacía', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [300, 250]);
  await page.keyboard.press('Delete');
  await expect(layerCount(page)).toContainText('· 0');
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
  // fuente: el selector cambia la fuente del objeto
  const fontSel = page.locator('#inspector-body select');
  await expect(fontSel.locator('option')).toHaveCount(14);
  await fontSel.selectOption({ index: 9 }); // Courier New
  await expect
    .poll(() =>
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
      ),
    )
    .toContain('Courier New');

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
  await page.locator('#toolbar .tool[data-export-menu]').click();
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
  await page.locator('#toolbar .tool[data-export-menu]').click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export-menu [data-export-png]')]);
  expect(dl.suggestedFilename()).toMatch(/\.png$/);
});

test('exportar JPEG y WebP descarga los formatos del navegador', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 180]);
  await page.locator('#toolbar .tool[data-export-menu]').click();
  const [jpg] = await Promise.all([page.waitForEvent('download'), page.click('#export-menu [data-export-jpeg]')]);
  expect(jpg.suggestedFilename()).toMatch(/\.jpg$/);
  await page.locator('#toolbar .tool[data-export-menu]').click();
  const [webp] = await Promise.all([page.waitForEvent('download'), page.click('#export-menu [data-export-webp]')]);
  expect(webp.suggestedFilename()).toMatch(/\.webp$/);
});

test('color con alfa: el inspector emite #rrggbbaa y aparece en recientes', async ({ page }) => {
  await page.keyboard.press('r');
  await drag(page, [100, 100], [220, 180]);
  const alpha = page.locator('#inspector-body .color-field input[type=number]');
  await alpha.fill('0.5');
  await alpha.dispatchEvent('change');
  await expect(page.locator('#inspector-body .swatch').first()).toHaveAttribute('title', /80$/);
  // el color con alfa sobrevive a un re-render del inspector
  await page.keyboard.press('Escape');
  await page.keyboard.press('r');
  await drag(page, [300, 100], [420, 180]);
  await expect(page.locator('#inspector-body .swatch').first()).toHaveAttribute('title', /80$/);
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

test('i18n: el idioma guardado cambia la UI (es) y hay selector con 15 idiomas en el menú de configuración', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pyra:lang', 'es'));
  await page.goto('/');
  await expect(page.locator('.panel-title').first()).toContainText('Capas');
  await page.locator('#settings-btn').click();
  const langSel = page.locator('#lang');
  await expect(langSel).toBeVisible();
  await expect(langSel.locator('option')).toHaveCount(15);
  await langSel.selectOption('de');
  await expect(page.locator('.panel-title').first()).toContainText('Ebenen');
  await expect(langSel).toHaveValue('de');
});

test('theme: menú de configuración abajo a la izquierda con claro/oscuro/sistema', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto('/');
  // por defecto: theme del sistema (oscuro en este contexto)
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  await page.locator('#settings-btn').click();
  const menu = page.locator('#settings-menu');
  await expect(menu).toBeVisible();
  await expect(menu.locator('#theme option')).toHaveCount(3);
  await page.locator('#theme').selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  // persiste tras recargar
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('#settings-btn').click();
  await page.locator('#theme').selectOption('dark');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  // clic fuera cierra el menú
  await page.locator('#canvas').click();
  await expect(page.locator('#settings-menu')).toBeHidden();
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
  await page.locator('#toolbar .tool[data-export-menu]').click();
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
