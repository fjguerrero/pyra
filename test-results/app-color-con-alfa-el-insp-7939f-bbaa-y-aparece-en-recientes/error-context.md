# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> color con alfa: el inspector emite #rrggbbaa y aparece en recientes
- Location: e2e/app.spec.ts:357:1

# Error details

```
Error: locator.fill: Error: strict mode violation: locator('#inspector-body .color-field input[type=number]') resolved to 2 elements:
    1) <input min="0" max="1" step="0.05" type="number" title="Alpha"/> aka locator('label').filter({ hasText: 'Fillα' }).getByRole('spinbutton')
    2) <input min="0" max="1" step="0.05" type="number" title="Alpha"/> aka locator('label').filter({ hasText: 'Stroke colorα' }).getByRole('spinbutton')

Call log:
  - waiting for locator('#inspector-body .color-field input[type=number]')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - button "Selection (V)" [pressed] [ref=e5] [cursor=pointer]
      - button "Rectangle (R)" [ref=e8] [cursor=pointer]
      - button "Ellipse (E)" [ref=e11] [cursor=pointer]
      - button "Line (L)" [ref=e14] [cursor=pointer]
      - button "Pen (P)" [ref=e17] [cursor=pointer]
      - button "Pencil (N)" [ref=e20] [cursor=pointer]
      - button "Polygon pencil" [ref=e23] [cursor=pointer]
      - button "Eraser (X)" [ref=e26] [cursor=pointer]
      - button "Paint brush (B)" [ref=e29] [cursor=pointer]
      - button "Text (T)" [ref=e32] [cursor=pointer]
      - button "Import image" [ref=e36] [cursor=pointer]
      - button "Export" [ref=e39] [cursor=pointer]
      - button "Fit zoom (0)" [ref=e42] [cursor=pointer]
    - generic [ref=e47]:
      - generic [ref=e48]:
        - generic [ref=e49] [cursor=pointer]: ▾ Layers
        - generic [ref=e50]:
          - generic [ref=e51] [cursor=pointer]:
            - button "Hide layer" [pressed] [ref=e52]
            - button "Lock layer" [ref=e55]
            - generic "Double-click to rename" [ref=e58]: Capa 1 · 1
            - button "Move layer up" [ref=e59]
            - button "Move layer down" [ref=e62]
            - button "Delete layer" [ref=e65]
          - button "Create layer" [ref=e69] [cursor=pointer]
      - generic [ref=e72]:
        - generic [ref=e73] [cursor=pointer]: ▾ Pages
        - generic [ref=e74]:
          - generic [ref=e75] [cursor=pointer]: Página 1
          - button "Create page" [ref=e77] [cursor=pointer]
      - generic [ref=e80]:
        - generic [ref=e81] [cursor=pointer]: ▾ Properties
        - generic [ref=e82]:
          - generic [ref=e83]:
            - generic [ref=e84]: X
            - spinbutton "X" [ref=e85]: "73"
          - generic [ref=e86]:
            - generic [ref=e87]: "Y"
            - spinbutton "Y" [ref=e88]: "52"
          - generic [ref=e89]:
            - generic [ref=e90]: Width
            - spinbutton "Width" [ref=e91]: "168"
          - generic [ref=e92]:
            - generic [ref=e93]: Height
            - spinbutton "Height" [ref=e94]: "112"
          - generic [ref=e95]:
            - generic [ref=e96]: Fill
            - generic [ref=e97]: α
            - textbox "Fill α" [ref=e98]: "#4f8cff"
            - spinbutton "Alpha" [ref=e99]: "1"
          - button "Add current color to custom palette" [ref=e100] [cursor=pointer]
          - button "No fill" [ref=e103] [cursor=pointer]
          - generic [ref=e104]:
            - generic [ref=e105]: Stroke color
            - generic [ref=e106]: α
            - textbox "Stroke color α" [ref=e107]: "#000000"
            - spinbutton "Alpha" [ref=e108]: "1"
          - button "Add current color to custom palette" [ref=e109] [cursor=pointer]
          - generic [ref=e112]:
            - generic [ref=e113]: Stroke width
            - spinbutton "Stroke width" [ref=e114]: "0"
          - button "Solid" [ref=e115] [cursor=pointer]
          - generic [ref=e116]:
            - generic [ref=e117]: Rotation
            - spinbutton "Rotation" [ref=e118]: "0"
          - button "Add gradient" [ref=e119] [cursor=pointer]
          - generic [ref=e120]: Live effects
          - generic [ref=e121]:
            - generic [ref=e122]: Blur
            - spinbutton "Blur" [ref=e123]: "0"
          - generic [ref=e124]:
            - generic [ref=e125]: Bevel
            - spinbutton "Bevel" [ref=e126]: "0"
          - button "Add shadow" [ref=e127] [cursor=pointer]
          - button "Add glow" [ref=e128] [cursor=pointer]
          - generic [ref=e129]: Styles
          - button "Save style" [ref=e130] [cursor=pointer]
      - generic [ref=e131]:
        - generic [ref=e132] [cursor=pointer]: ▾ Align
        - generic [ref=e133]:
          - generic [ref=e134]:
            - button "Align left" [ref=e135] [cursor=pointer]
            - button "Center horizontally" [ref=e138] [cursor=pointer]
            - button "Align right" [ref=e141] [cursor=pointer]
            - button "Align top" [ref=e144] [cursor=pointer]
            - button "Center vertically" [ref=e147] [cursor=pointer]
            - button "Align bottom" [ref=e150] [cursor=pointer]
            - button "Distribute horizontally" [ref=e154] [cursor=pointer]
            - button "Distribute vertically" [ref=e157] [cursor=pointer]
          - generic [ref=e160]:
            - button "Bring to front" [ref=e161] [cursor=pointer]
            - button "Bring forward" [ref=e164] [cursor=pointer]
            - button "Send backward" [ref=e167] [cursor=pointer]
            - button "Send to back" [ref=e170] [cursor=pointer]
          - generic [ref=e173]: With 1 object aligns to the page; with 2+, to the group
  - generic [ref=e174]:
    - generic [ref=e175]: selection 168×112
    - generic [ref=e176]:
      - button "Zoom" [ref=e177] [cursor=pointer]
      - spinbutton "Zoom" [ref=e180]: "71"
  - button "Settings" [ref=e181] [cursor=pointer]
```

# Test source

```ts
  261 |   await page.setInputFiles('#import-file', path);
  262 |   await expect(layerCount(page)).toContainText('· 1');
  263 | });
  264 | 
  265 | test('páginas: crear y cambiar', async ({ page }) => {
  266 |   await page.locator('#pages-body [data-act="addpage"]').click();
  267 |   await expect(page.locator('#pages-body .row')).toHaveCount(2);
  268 |   await expect(page.locator('#pages-body .row.active')).toContainText('Page 2');
  269 |   await page.locator('#pages-body .row').first().click();
  270 |   await expect(page.locator('#pages-body .row.active')).toContainText('Página 1');
  271 | });
  272 | 
  273 | test('rotación: campo en el inspector y hit-test rotado', async ({ page }) => {
  274 |   await page.keyboard.press('r');
  275 |   await drag(page, [100, 100], [220, 140]); // rect ancho y bajo
  276 |   // poner rotación 90 desde el inspector
  277 |   const rotInput = page.locator('#inspector-body .field:has(span:text-is("Rotation")) input[type=number]');
  278 |   await rotInput.fill('90');
  279 |   await rotInput.dispatchEvent('change');
  280 |   // el centro sigue siendo hit-testable (el rect girado pasa por ahí)
  281 |   const box = await canvas(page).boundingBox();
  282 |   await page.keyboard.press('Escape');
  283 |   await page.mouse.click(box!.x + 160, box!.y + 120);
  284 |   await expect(page.locator('#inspector-body .field:has(span:text-is("Rotation")) input[type=number]')).toHaveValue('90');
  285 | });
  286 | 
  287 | test('agrupar: Ctrl+G selecciona el grupo entero al tocar un miembro', async ({ page }) => {
  288 |   await page.keyboard.press('r');
  289 |   await drag(page, [60, 60], [140, 120]);
  290 |   await page.keyboard.press('r');
  291 |   await drag(page, [160, 60], [240, 120]);
  292 |   // seleccionar ambos y agrupar
  293 |   const box = await canvas(page).boundingBox();
  294 |   await page.keyboard.press('Escape');
  295 |   await page.mouse.click(box!.x + 100, box!.y + 90);
  296 |   await page.keyboard.down('Shift');
  297 |   await page.mouse.click(box!.x + 200, box!.y + 90);
  298 |   await page.keyboard.up('Shift');
  299 |   await page.keyboard.press('Control+g');
  300 |   // clic en uno selecciona los dos
  301 |   await page.keyboard.press('Escape');
  302 |   await page.mouse.click(box!.x + 100, box!.y + 90);
  303 |   await expect(page.locator('#status')).toContainText('(2 objects)');
  304 |   // desagrupar
  305 |   await page.keyboard.press('Control+Shift+G');
  306 |   await page.keyboard.press('Escape');
  307 |   await page.mouse.click(box!.x + 100, box!.y + 90);
  308 |   await expect(page.locator('#status')).not.toContainText('(2 objects)');
  309 | });
  310 | 
  311 | test('exportar PNG plano descarga un .png', async ({ page }) => {
  312 |   await page.keyboard.press('r');
  313 |   await drag(page, [100, 100], [220, 180]);
  314 |   await page.locator('#toolbar .tool[data-export-menu]').click();
  315 |   const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export-menu [data-export-png]')]);
  316 |   expect(dl.suggestedFilename()).toMatch(/\.png$/);
  317 | });
  318 | 
  319 | test('exportar JPEG y WebP descarga los formatos del navegador', async ({ page }) => {
  320 |   await page.keyboard.press('r');
  321 |   await drag(page, [100, 100], [220, 180]);
  322 |   await page.locator('#toolbar .tool[data-export-menu]').click();
  323 |   const [jpg] = await Promise.all([page.waitForEvent('download'), page.click('#export-menu [data-export-jpeg]')]);
  324 |   expect(jpg.suggestedFilename()).toMatch(/\.jpg$/);
  325 |   await page.locator('#toolbar .tool[data-export-menu]').click();
  326 |   const [webp] = await Promise.all([page.waitForEvent('download'), page.click('#export-menu [data-export-webp]')]);
  327 |   expect(webp.suggestedFilename()).toMatch(/\.webp$/);
  328 | });
  329 | 
  330 | test('rect/óvalo con borde: el inspector ofrece color de trazo, grosor y sin relleno', async ({ page }) => {
  331 |   await page.keyboard.press('r');
  332 |   await drag(page, [100, 100], [220, 180]);
  333 |   await expect(page.locator('#inspector-body', { hasText: 'Stroke color' })).toBeVisible();
  334 |   await expect(page.locator('#inspector-body', { hasText: 'Stroke width' })).toBeVisible();
  335 |   // poner un borde: el rect se queda sin relleno y solo con contorno
  336 |   await page.locator('#inspector-body button', { hasText: 'No fill' }).click();
  337 |   const strokeInput = page.locator('#inspector-body input[type=color]').last();
  338 |   await strokeInput.evaluate((el: HTMLElement) => el.click());
  339 |   await expect(page.locator('#inspector-body button', { hasText: 'No fill' })).toHaveAttribute('aria-pressed', 'true');
  340 | });
  341 | 
  342 | test('exportar SVG: vector real (formas y trazos como paths)', async ({ page }) => {
  343 |   const fs = await import('node:fs/promises');
  344 |   await page.keyboard.press('r');
  345 |   await drag(page, [100, 100], [220, 180]);
  346 |   await page.keyboard.press('n'); // lápiz: trazo vectorial
  347 |   await drag(page, [300, 120], [420, 200]);
  348 |   await page.locator('#toolbar .tool[data-export-menu]').click();
  349 |   const [svg] = await Promise.all([page.waitForEvent('download'), page.click('#export-menu [data-export-svg]')]);
  350 |   expect(svg.suggestedFilename()).toMatch(/\.svg$/);
  351 |   const body = await fs.readFile((await svg.path())!, 'utf8');
  352 |   expect(body).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
  353 |   expect(body).toContain('<rect'); // la forma vectorial, no un bitmap pegado
  354 |   expect(body).toContain('fill-rule="nonzero"'); // la cinta del pincel, alfa uniforme
  355 | });
  356 | 
  357 | test('color con alfa: el inspector emite #rrggbbaa y aparece en recientes', async ({ page }) => {
  358 |   await page.keyboard.press('r');
  359 |   await drag(page, [100, 100], [220, 180]);
  360 |   const alpha = page.locator('#inspector-body .color-field input[type=number]');
> 361 |   await alpha.fill('0.5');
      |               ^ Error: locator.fill: Error: strict mode violation: locator('#inspector-body .color-field input[type=number]') resolved to 2 elements:
  362 |   await alpha.dispatchEvent('change');
  363 |   await expect(page.locator('#inspector-body .swatch').first()).toHaveAttribute('title', /80$/);
  364 |   // el color con alfa sobrevive a un re-render del inspector
  365 |   await page.keyboard.press('Escape');
  366 |   await page.keyboard.press('r');
  367 |   await drag(page, [300, 100], [420, 180]);
  368 |   await expect(page.locator('#inspector-body .swatch').first()).toHaveAttribute('title', /80$/);
  369 | });
  370 | 
  371 | /** ¿Hay píxeles del color del trazo cerca de un punto del lienzo? */
  372 | async function inkNear(page: Page, x: number, y: number, r = 8): Promise<boolean> {
  373 |   return page.evaluate(
  374 |     ([x, y, r]) => {
  375 |       const c = document.getElementById('canvas') as HTMLCanvasElement;
  376 |       const dpr = devicePixelRatio;
  377 |       const ctx = c.getContext('2d')!;
  378 |       const x0 = Math.max(0, Math.round((x - r) * dpr)), y0 = Math.max(0, Math.round((y - r) * dpr));
  379 |       const w = Math.round(2 * r * dpr), h = Math.round(2 * r * dpr);
  380 |       const d = ctx.getImageData(x0, y0, w, h).data;
  381 |       for (let i = 0; i < d.length; i += 4)
  382 |         if (Math.abs(d[i] - 0x4f) < 40 && Math.abs(d[i + 1] - 0x8c) < 40 && Math.abs(d[i + 2] - 0xff) < 40) return true;
  383 |       return false;
  384 |     },
  385 |     [x, y, r],
  386 |   );
  387 | }
  388 | 
  389 | test('líneas: el trazo sigue el sentido del arrastre en las cuatro direcciones', async ({ page }) => {
  390 |   const box = await canvas(page).boundingBox();
  391 |   if (!box) throw new Error('canvas sin tamaño');
  392 |   const A: [number, number] = [120, 320];
  393 |   const B: [number, number] = [340, 120];
  394 |   const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  395 | 
  396 |   // arrastre ↗: A→B. El trazo real pasa por el punto medio; la diagonal opuesta queda limpia.
  397 |   await page.keyboard.press('l');
  398 |   await drag(page, A, B);
  399 |   await page.keyboard.press('Escape'); // sin contorno de selección: solo el objeto
  400 |   await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  401 |   await expect(inkNear(page, ...mid(A, B))).resolves.toBe(true);
  402 |   await expect(inkNear(page, A[0], B[1])).resolves.toBe(false); // esquina NW del bbox: fuera del trazo
  403 |   await expect(inkNear(page, B[0], A[1])).resolves.toBe(false); // esquina SE
  404 | });
  405 | 
  406 | test('pincel: pintar libre crea un trazo y su inspector trae tamaño, presión y opacidad', async ({ page }) => {
  407 |   await page.keyboard.press('b');
  408 |   // sin dibujar: el inspector contextual muestra los ajustes del pincel
  409 |   const size = page.locator('#inspector-body .field:has(span:text-is("Size")) input[type=number]');
  410 |   await expect(size).toHaveValue('8');
  411 |   await expect(page.locator('#inspector-body .field:has(span:text-is("Pressure")) input[type=number]')).toHaveValue('1');
  412 |   await expect(page.locator('#inspector-body .field:has(span:text-is("Opacity")) input[type=number]')).toHaveValue('1');
  413 | 
  414 |   await drag(page, [150, 150], [250, 250]); // arrastre en diagonal
  415 |   await expect(layerCount(page)).toContainText('· 1');
  416 |   // el objeto creado trae su propio pincel editable
  417 |   await expect(size).toHaveValue('8');
  418 |   await page.locator('#inspector-body .field:has(span:text-is("Size")) input[type=number]').fill('24');
  419 |   await page.locator('#inspector-body .field:has(span:text-is("Size")) input[type=number]').dispatchEvent('change');
  420 |   await expect(size).toHaveValue('24');
  421 | });
  422 | 
  423 | test('pincel personalizado: una punta SVG se estampa a lo largo del trazo', async ({ page }) => {
  424 |   const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="8" fill="#ff00aa"/></svg>';
  425 |   await page.keyboard.press('b');
  426 |   await page.locator('#inspector-body input[type=file]').setInputFiles({
  427 |     name: 'tip.svg',
  428 |     mimeType: 'image/svg+xml',
  429 |     buffer: Buffer.from(svg),
  430 |   });
  431 |   const size = page.locator('#inspector-body .field:has(span:text-is("Size")) input[type=number]');
  432 |   await size.fill('40');
  433 |   await size.dispatchEvent('change');
  434 |   await drag(page, [420, 140], [560, 220]);
  435 |   await page.keyboard.press('Escape');
  436 |   // la punta es una imagen: se pinta cuando carga
  437 |   await expect
  438 |     .poll(async () => {
  439 |       return page.evaluate(() => {
  440 |         const c = document.getElementById('canvas') as HTMLCanvasElement;
  441 |         const dpr = devicePixelRatio;
  442 |         const d = c.getContext('2d')!.getImageData(410 * dpr, 130 * dpr, 170 * dpr, 110 * dpr).data;
  443 |         let magenta = 0;
  444 |         for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] < 60 && d[i + 2] > 150) magenta++;
  445 |         return magenta;
  446 |       });
  447 |     })
  448 |     .toBeGreaterThan(200);
  449 | });
  450 | 
  451 | test('guías manuales: clic derecho crea, clic derecho sobre ella borra', async ({ page }) => {
  452 |   const box = await canvas(page).boundingBox();
  453 |   await page.mouse.click(box!.x + 300, box!.y + 200, { button: 'right' });
  454 |   await page.mouse.click(box!.x + 300, box!.y + 200, { button: 'right' }); // borrar
  455 |   // tamaño de página desde el inspector sin selección
  456 |   await page.locator('#inspector-body input[type=number]').nth(0).fill('900');
  457 |   await page.locator('#inspector-body input[type=number]').nth(0).dispatchEvent('change');
  458 |   await expect(page.locator('#inspector-body input[type=number]').nth(0)).toHaveValue('900');
  459 | });
  460 | 
  461 | test('i18n: el idioma guardado cambia la UI (es) y hay selector con 15 idiomas en el menú de configuración', async ({ page }) => {
```