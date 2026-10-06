// E2E reales: Chromium contra la app servida por Vite. Verifican el flujo de usuario,
// no la implementación. La evidencia es lo que la UI muestra (capas, inspector, status).
import { test, expect, type Page } from '@playwright/test';

const canvas = (page: Page) => page.locator('#canvas');
const layerCount = (page: Page) => page.locator('#layers-body .row-name').first();
const inspNum = (page: Page, i = 0) => page.locator('#inspector-body input[type=number]').nth(i);

async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(canvas(page)).toBeVisible();
  await page.keyboard.press('0'); // vista determinista: ajustar a la página
}

/** Arrastre sobre el lienzo entre dos puntos de pantalla. */
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
  await expect(page.locator('#status')).toContainText('selección');
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
  await expect(page.locator('#inspector-body')).toContainText('Desenfoque');
  await expect(page.locator('#inspector-body')).toContainText('Recorte ancho');

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
  await expect(page.locator('#inspector-body textarea')).toHaveValue('Texto');
  await expect(page.locator('#inspector-body')).toContainText('Tamaño');

  page.once('dialog', (d) => void d.accept('Hola Pyra'));
  await page.locator('#canvas').dblclick({ position: { x: 210, y: 160 } });
  await expect(page.locator('#inspector-body textarea')).toHaveValue('Hola Pyra');

  // undo deshace la edición de texto
  await page.keyboard.press('Control+z');
  await expect(page.locator('#inspector-body textarea')).toHaveValue('Texto');
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
  await page.locator('#inspector-body button', { hasText: 'Añadir degradado' }).click();
  await expect(page.locator('#inspector-body')).toContainText('Degradado desde');
  await expect(page.locator('#inspector-body')).toContainText('Ángulo');
  await page.locator('#inspector-body button', { hasText: 'Quitar degradado' }).click();
  await expect(page.locator('#inspector-body')).not.toContainText('Degradado desde');
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
  await page.locator('#inspector-body button', { hasText: 'Guardar estilo' }).click();
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
  await expect(page.locator('#status')).toContainText('(2 objetos)');
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
  await page.locator('#toolbar .tool[data-export]').click();
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
  await page.getByText('＋ Nueva página').click();
  await expect(page.locator('#pages-body .row')).toHaveCount(2);
  await expect(page.locator('#pages-body .row.active')).toContainText('Página 2');
  await page.locator('#pages-body .row').first().click();
  await expect(page.locator('#pages-body .row.active')).toContainText('Página 1');
});
