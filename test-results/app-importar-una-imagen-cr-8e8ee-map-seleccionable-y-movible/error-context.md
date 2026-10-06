# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> importar una imagen crea un bitmap seleccionable y movible
- Location: e2e/app.spec.ts:74:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#inspector-body')
Expected substring: "Recorte ancho"
Received string:    "XYWidthHeightSaturationBrightnessCrop XCrop YCrop widthCrop heightRemove cropLive effectsBlurAdd shadowAdd glowStylesSave style"
Timeout: 5000ms

Call log:
  - Expect "toContainText" locator('#inspector-body') with timeout 5000ms
  - waiting for locator('#inspector-body')
    14 × locator resolved to <div id="inspector-body">…</div>
       - unexpected value "XYWidthHeightSaturationBrightnessCrop XCrop YCrop widthCrop heightRemove cropLive effectsBlurAdd shadowAdd glowStylesSave style"

```

```yaml
- text: X
- spinbutton "X": "590"
- text: "Y"
- spinbutton "Y": "350"
- text: Width
- spinbutton "Width": "100"
- text: Height
- spinbutton "Height": "100"
- text: Saturation
- slider "Saturation": "1"
- text: Brightness
- slider "Brightness": "1"
- text: Crop X
- spinbutton "Crop X"
- text: Crop Y
- spinbutton "Crop Y"
- text: Crop width
- spinbutton "Crop width"
- text: Crop height
- spinbutton "Crop height"
- button "Remove crop"
- text: Live effects Blur
- spinbutton "Blur": "0"
- button "Add shadow"
- button "Add glow"
- text: Styles
- button "Save style"
```

# Test source

```ts
  1   | // E2E reales: Chromium contra la app servida por Vite. Verifican el flujo de usuario,
  2   | // no la implementación. La evidencia es lo que la UI muestra (capas, inspector, status).
  3   | import { test, expect, type Page } from '@playwright/test';
  4   | 
  5   | const canvas = (page: Page) => page.locator('#canvas');
  6   | const layerCount = (page: Page) => page.locator('#layers-body .row-name').first();
  7   | const inspNum = (page: Page, i = 0) => page.locator('#inspector-body input[type=number]').nth(i);
  8   | 
  9   | async function openApp(page: Page): Promise<void> {
  10  |   // cada test arranca con un documento limpio (solo en la primera carga, no en reloads del test)
  11  |   await page.addInitScript(() => {
  12  |     if (!sessionStorage.getItem('pyra-test-fresh')) {
  13  |       sessionStorage.setItem('pyra-test-fresh', '1');
  14  |       void indexedDB.deleteDatabase('pyra');
  15  |       localStorage.clear();
  16  |     }
  17  |   });
  18  |   await page.goto('/');
  19  |   await expect(canvas(page)).toBeVisible();
  20  |   await page.keyboard.press('0'); // vista determinista: ajustar a la página
  21  | }
  22  | 
  23  | /** Arrastre sobre el lienzo entre dos puntos de pantalla. */
  24  | async function drag(page: Page, from: [number, number], to: [number, number]): Promise<void> {
  25  |   const box = await canvas(page).boundingBox();
  26  |   if (!box) throw new Error('canvas sin tamaño');
  27  |   await page.mouse.move(box.x + from[0], box.y + from[1]);
  28  |   await page.mouse.down();
  29  |   await page.mouse.move(box.x + to[0], box.y + to[1], { steps: 8 });
  30  |   await page.mouse.up();
  31  | }
  32  | 
  33  | test.beforeEach(async ({ page }) => {
  34  |   await openApp(page);
  35  | });
  36  | 
  37  | test('dibujar un rectángulo con la herramienta: aparece en capas y se selecciona', async ({ page }) => {
  38  |   await page.keyboard.press('r');
  39  |   await drag(page, [100, 100], [300, 250]);
  40  |   await expect(layerCount(page)).toContainText('· 1');
  41  |   // tras dibujar vuelve a selección (como Fireworks) y el inspector muestra el objeto
  42  |   await expect(page.locator('#toolbar .tool[data-tool="select"]')).toHaveAttribute('aria-pressed', 'true');
  43  |   await expect(inspNum(page)).not.toHaveValue('');
  44  |   await expect(page.locator('#status')).toContainText('selection');
  45  | });
  46  | 
  47  | test('seleccionar y mover un objeto con el ratón', async ({ page }) => {
  48  |   await page.keyboard.press('r');
  49  |   await drag(page, [100, 100], [300, 250]);
  50  |   const before = await inspNum(page).inputValue();
  51  |   await page.keyboard.press('Escape');
  52  |   await drag(page, [150, 150], [250, 250]); // arrastrar el objeto desde dentro
  53  |   await expect(inspNum(page)).not.toHaveValue(before);
  54  |   await expect(layerCount(page)).toContainText('· 1'); // sigue habiendo un solo objeto
  55  | });
  56  | 
  57  | test('undo/redo con Ctrl+Z / Ctrl+Shift+Z', async ({ page }) => {
  58  |   await page.keyboard.press('r');
  59  |   await drag(page, [100, 100], [300, 250]);
  60  |   await expect(layerCount(page)).toContainText('· 1');
  61  |   await page.keyboard.press('Control+z');
  62  |   await expect(layerCount(page)).toContainText('· 0');
  63  |   await page.keyboard.press('Control+Shift+z');
  64  |   await expect(layerCount(page)).toContainText('· 1');
  65  | });
  66  | 
  67  | test('eliminar con Supr deja la capa vacía', async ({ page }) => {
  68  |   await page.keyboard.press('r');
  69  |   await drag(page, [100, 100], [300, 250]);
  70  |   await page.keyboard.press('Delete');
  71  |   await expect(layerCount(page)).toContainText('· 0');
  72  | });
  73  | 
  74  | test('importar una imagen crea un bitmap seleccionable y movible', async ({ page }) => {
  75  |   // PNG 100×100 rojo generado en el propio navegador
  76  |   const dataUrl = await page.evaluate(() => {
  77  |     const c = document.createElement('canvas');
  78  |     c.width = 100;
  79  |     c.height = 100;
  80  |     const g = c.getContext('2d')!;
  81  |     g.fillStyle = 'red';
  82  |     g.fillRect(0, 0, 100, 100);
  83  |     return c.toDataURL('image/png');
  84  |   });
  85  |   await page.setInputFiles('#import-file', { name: 'rojo.png', mimeType: 'image/png', buffer: Buffer.from(dataUrl.split(',')[1], 'base64') });
  86  |   await expect(layerCount(page)).toContainText('· 1');
  87  |   // el inspector de un bitmap: filtros vivos y recorte
  88  |   await expect(page.locator('#inspector-body')).toContainText('Blur');
> 89  |   await expect(page.locator('#inspector-body')).toContainText('Recorte ancho');
      |                                                 ^ Error: expect(locator).toContainText(expected) failed
  90  | 
  91  |   // moverlo con el ratón (hit-test por bbox): fitAll centra la página y el bitmap
  92  |   // se crea en el centro de la página → arrastrar desde el centro del lienzo
  93  |   const box = await canvas(page).boundingBox();
  94  |   if (!box) throw new Error('canvas sin tamaño');
  95  |   const before = await inspNum(page).inputValue();
  96  |   await drag(page, [box.width / 2, box.height / 2], [box.width / 2 + 60, box.height / 2 + 40]);
  97  |   await expect(inspNum(page)).not.toHaveValue(before);
  98  | });
  99  | 
  100 | test('persistencia: el documento sobrevive a una recarga', async ({ page }) => {
  101 |   await page.keyboard.press('r');
  102 |   await drag(page, [100, 100], [300, 250]);
  103 |   await expect(layerCount(page)).toContainText('· 1');
  104 |   await page.waitForTimeout(700); // el guardado tiene debounce de 400 ms
  105 |   await page.reload();
  106 |   await expect(canvas(page)).toBeVisible();
  107 |   await expect(layerCount(page)).toContainText('· 1');
  108 | });
  109 | 
  110 | test('texto: crear con la herramienta T y editar con doble clic', async ({ page }) => {
  111 |   await page.keyboard.press('t');
  112 |   await page.locator('#canvas').click({ position: { x: 200, y: 150 } });
  113 |   await expect(layerCount(page)).toContainText('· 1');
  114 |   // el inspector de un texto: contenido, tamaño y color
  115 |   await expect(page.locator('#inspector-body textarea')).toHaveValue('Text');
  116 |   await expect(page.locator('#inspector-body')).toContainText('Size');
  117 | 
  118 |   page.once('dialog', (d) => void d.accept('Hola Pyra'));
  119 |   await page.locator('#canvas').dblclick({ position: { x: 210, y: 160 } });
  120 |   await expect(page.locator('#inspector-body textarea')).toHaveValue('Hola Pyra');
  121 | 
  122 |   // undo deshace la edición de texto
  123 |   await page.keyboard.press('Control+z');
  124 |   await expect(page.locator('#inspector-body textarea')).toHaveValue('Text');
  125 | });
  126 | 
  127 | test('duplicar con Ctrl+D y mover con flechas', async ({ page }) => {
  128 |   await page.keyboard.press('r');
  129 |   await drag(page, [100, 100], [220, 180]);
  130 |   await expect(layerCount(page)).toContainText('· 1');
  131 |   const x0 = Number(await inspNum(page, 0).inputValue());
  132 | 
  133 |   await page.keyboard.press('Control+d');
  134 |   await expect(layerCount(page)).toContainText('· 2');
  135 |   // la copia queda seleccionada y desplazada +10
  136 |   await expect(inspNum(page, 0)).toHaveValue(String(x0 + 10));
  137 |   await page.keyboard.press('ArrowRight');
  138 |   await page.keyboard.press('ArrowRight');
  139 |   await page.keyboard.press('Shift+ArrowRight');
  140 |   await expect(inspNum(page, 0)).toHaveValue(String(x0 + 22)); // +10 duplicado +1 +1 +10 flechas
  141 |   await page.keyboard.press('Control+z');
  142 |   await expect(inspNum(page, 0)).toHaveValue(String(x0 + 12));
  143 | });
  144 | 
  145 | test('degradado: añadir desde el inspector y editar sus colores', async ({ page }) => {
  146 |   await page.keyboard.press('r');
  147 |   await drag(page, [100, 100], [220, 180]);
  148 |   await page.locator('#inspector-body button', { hasText: 'Add gradient' }).click();
  149 |   await expect(page.locator('#inspector-body')).toContainText('Gradient from');
  150 |   await expect(page.locator('#inspector-body')).toContainText('Angle');
  151 |   await page.locator('#inspector-body button', { hasText: 'Remove gradient' }).click();
  152 |   await expect(page.locator('#inspector-body')).not.toContainText('Gradient from');
  153 | });
  154 | 
  155 | test('estilos: guardar desde un objeto y aplicar a otro', async ({ page }) => {
  156 |   await openApp(page);
  157 |   // dibujar dos rectángulos
  158 |   await page.keyboard.press('r');
  159 |   await drag(page, [60, 60], [140, 120]);
  160 |   await page.keyboard.press('r');
  161 |   await drag(page, [200, 60], [280, 120]);
  162 |   // cambiar el relleno del primero y guardar estilo
  163 |   await page.keyboard.press('Escape');
  164 |   const box = await canvas(page).boundingBox();
  165 |   await page.mouse.click(box!.x + 100, box!.y + 90); // centro del primer rect
  166 |   const colorInput = page.locator('#inspector-body input[type=color]').first();
  167 |   await colorInput.fill('#ff0000');
  168 |   await page.locator('#inspector-body button', { hasText: 'Save style' }).click();
  169 |   await expect(page.locator('#inspector-body')).toContainText('Estilo 1');
  170 |   // seleccionar el segundo y aplicar el estilo
  171 |   await page.mouse.click(box!.x + 240, box!.y + 90);
  172 |   await page.locator('#inspector-body .row', { hasText: 'Estilo 1' }).first().dispatchEvent('click');
  173 |   await expect(page.locator('#inspector-body input[type=color]').first()).toHaveValue('#ff0000');
  174 |   // undo deshace la aplicación del estilo
  175 |   await page.keyboard.press('Control+z');
  176 |   await expect(page.locator('#inspector-body input[type=color]').first()).not.toHaveValue('#ff0000');
  177 | });
  178 | 
  179 | test('selección por marco: arrastrar en vacío selecciona lo que intersecta', async ({ page }) => {
  180 |   await page.keyboard.press('r');
  181 |   await drag(page, [60, 60], [140, 120]);
  182 |   await page.keyboard.press('r');
  183 |   await drag(page, [160, 60], [240, 120]);
  184 |   await page.keyboard.press('Escape'); // herramienta de selección
  185 |   // marco que cubre ambos rectángulos
  186 |   await drag(page, [40, 40], [260, 140]);
  187 |   await expect(page.locator('#status')).toContainText('(2 objects)');
  188 |   // mover con flechas afecta a ambos (x de ambos cambia)
  189 |   const x0 = Number(await inspNum(page, 0).inputValue());
```