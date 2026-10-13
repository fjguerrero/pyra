# Pyra — un clon de Fireworks para la web (2026)

## Tesis

Reconstruir lo que Fireworks hacía y nadie ha vuelto a hacer: **bitmap y vector en el
mismo lienzo, capas simples, maquetación sin fricción, efectos vivos no destructivos**,
como app web rápida de verdad. No un Figma-lite: un Fireworks con 25 años de mejoras.

## Principios de diseño (heredados de Fireworks)

1. **Un lienzo, dos naturalezas.** Objetos bitmap y objetos vector coexisten; la misma
   selección, transformación y edición aplica a ambos.
2. **Capas primero.** Panel de capas visible siempre: visibilidad, bloqueo, opacidad,
   blending, reorden. La maquetación es el flujo principal, no un extra.
3. **No destructivo siempre.** Efectos (sombra, glow, bevel, blur) como atributos del
   objeto, editables en cualquier momento, sobre bitmap, vector y texto.
4. **Property Inspector contextual.** Las propiedades del objeto seleccionado, a mano,
   siempre. Sin cavar menús ni diálogos modales.
5. **Páginas.** Un documento = varias pantallas navegables al instante.
6. **Rápido.** "Súper optimizado" es un requisito, no un deseo (ver arquitectura).

## Diferencias conscientes con la UI original

- No replicamos los paneles flotantes de 1998. Layout fijo moderno: toolbar izquierda,
  inspector derecho (propiedades + capas + páginas en columnas), canvas central.
- Look 2026: tema oscuro denso, iconografía lineal, tipografía limpia, HiDPI nativo,
  atajos de teclado primero.
- Nada de slices/HTML export (el usuario lo descarta): export de imágenes (PNG con
  fuente editable embebida, como Fireworks) + export de assets por selección.

## Arquitectura (optimización como requisito)

- **TypeScript estricto, sin framework de UI.** DOM mínimo para paneles; canvas para todo
  lo demás. Cero dependencias de render (no React). Vite como bundler.
- **Scene graph propio**: documentos → páginas → capas → objetos. Modelo plano con
  índices; sin clones por frame.
- **Render Canvas2D con dirty-rects + cache por capa**: solo se repinta lo que cambia;
  capas estáticas a offscreen canvas. Objetivo: 60fps con miles de objetos.
- **Undo/redo por comandos** (no snapshots de documento).
- **Persistencia**: IndexedDB para sesiones; archivo `.f.png` (PNG normal con la fuente
  editable embebida en metadatos — el truco de Fireworks con `.fw.png`, igual que él)
  para export/import.
- **Sin servidor, sin cuenta, sin colaboración** (por ahora). Local-first.

## Fases

- **M0 — Núcleo**: scene graph, canvas con pan/zoom, selección, transformación,
  undo/redo, persistencia IndexedDB.
- **M1 — Capas y maquetación**: panel de capas completo, smart guides, snapping,
  alineación/distribución, páginas.
- **M2 — Vector**: formas (rect, elipse, polígono, línea), pen tool simplificado,
  relleno/borde, unión booleana básica.
- **M3 — Bitmap**: importar imágenes como objetos, recorte, filtros básicos
  (blur, niveles, saturación) como efectos vivos.
- **M4 — Texto**: text tool, tipografía en inspector, texto como objeto editable.
- **M5 — Live effects**: sombra, glow, bevel, blur como atributos no destructivos
  sobre cualquier objeto.
- **M6 — Archivo**: `.f.png` (PNG + fuente embebida), export de assets, import de PNG
  con fuente.

Cada fase: usable de verdad antes de pasar a la siguiente.

## Estado v1 (2026-10-06)

M0–M6 completados, más lo que hace que se sienta como Fireworks:

- Tools: V (selección + marquee), R, E, L, T. Tras dibujar vuelve a V (como FW).
- Capas, páginas, smart guides (bordes/centros/página/guías manuales), align, undo/redo por comandos, IndexedDB.
- Objetos: rect, elipse, línea, bitmap (import, recorte, saturación/brillo/blur), texto editable.
- Rotación con manija (Shift=pasos 15°), grupos (Ctrl+G), duplicar/pegar, z-order, nudge.
- Relleno con degradado lineal; Styles reutilizables (la idea clave de FW).
- Live effects: sombra, glow, blur no destructivos.
- Guías manuales de página (clic derecho crea, clic sobre ella borra, arrastrable; el snap las usa).
- Tamaño de página desde el inspector. Paneles derechos colapsables/reordenables.
- Archivo: `.f.png` (PNG con fuente embebida) + export PNG plano.

Verificación: `tsc --noEmit` limpio, 172 tests unitarios, 17 e2e Playwright (×2 pasadas sin flakies).

## Estado v1.1 (2026-10-07)

- Pincel (B): redondo/cuadrado, tamaño/presión/opacidad, presión real con lápiz, puntas personalizadas SVG/bitmap.
- Lápiz (N): trazo continuo o suavizado (objeto `stroke` vectorial con grosor/color). Polilápiz (G): polígonos a mano alzada, rectos (RDP) o estilizados (Catmull-Rom), borde y relleno independientes. Helpers en `src/freehand.ts` (rdpSimplify, smoothPolyline, smoothClosedPolygon).
- Líneas con sentido real del arrastre (`lineFrom`/`lineEnds`).
- Texto con selector de 14 fuentes del sistema y re-medición del bbox.
- Color con alfa; paletas recientes + personalizados (drag/eliminar); export JPEG/WebP.
- Toolbar con iconos SVG, zoom editable, fondo con rejilla, i18n 15 idiomas, tema claro/oscuro.

Verificación: `tsc --noEmit` limpio, 185 tests unitarios, 25 e2e Playwright, `vite build` correcto (34 kB gzip JS).

## Estado v1.3 (noche 2026-10-13)

- Motor de pinceles vectoriales (`src/brush-engine.ts`): estabilizador doble EMA, ancho por presión real (lápiz) o velocidad, afinado de extremos (taper), contorno quads+círculos con alfa uniforme.
- Lápiz (N) con presets Lápiz/Pluma tinta/Marcador/Pincel suave + sliders (tamaño, opacidad, estabilizador, afinado) + vista previa real del trazo. Panel de opciones por herramienta con modos reales, refrescado en cada render.
- Goma (X): surco continuo con stamps interpolados (sin huecos), tamaño ajustable con `[`/`]` (también grosor de la herramienta activa).
- Polilápiz (G): RDP antes de curvar, curvas Catmull-Rom reales en modo Estilizado, estabilizador en la captura.
- Anillo de cursor estilo Sketchbook (tamaño real en pantalla; oculto sin herramienta de tamaño).
- Exportar SVG (`src/svg-export.ts`): formas vectoriales, trazos como path, bitmaps con clip/mask/filters, efectos con feDropShadow.
- Cuentagotas (I): muestrea píxel real, lo aplica a la selección y al color por defecto, lo guarda en muestras recientes.
- Degradado radial elíptico ajustado al bbox + degradado multi-parada (`Gradient.stops`, editor de paradas en el inspector: posición %, color, borrar; canvas y SVG usan las paradas).
- Rectángulos con radio de esquina en vivo (`ShapeObj.rx`): `roundRect` nativo en canvas, `rx` en SVG, campo en el inspector; limitado a la mitad del lado corto.
- Voltear espejo H/V de la selección (`flipH`/`flipV` en todos los objetos): canvas con `scale` sobre el centro, hit-test al espacio local, SVG con `transform`, unión con contorno volteado; botones en ALINEAR y `Ctrl+Shift+H/V`; comando undoable. Fix de raíz: las teclas sueltas de herramienta ahora ignoran modificadores (Ctrl+V pegar ya no se lo comía la herramienta de selección).
- Opacidad por objeto (`fx.opacity` en todos los objetos): slider «Opacidad del objeto» en Efectos en vivo; canvas multiplica la alfa de la capa y la restaura tras el objeto; SVG exporta `opacity` en el envoltorio junto a `mix-blend-mode`; viaja con los Styles por vivir en `Fx`.
- Modos de mezcla (`fx.blend` en todos los objetos): los 15 modos de blending CSS + Normal; canvas aplica `globalCompositeOperation` dentro del clip de la página y lo resetea tras cada objeto; SVG exporta `mix-blend-mode` en un envoltorio; selector «Modo de mezcla» en Efectos en vivo del inspector (viaja con los Styles por vivir en `Fx`); nombres clásicos en es/en (Multiplicar, Trama, Superponer…) con fallback en los demás idiomas.
- Edición multi-objeto en el inspector: con varios seleccionados, `editObj` aplica el parche de estilo (relleno, borde, efectos, tipografía…) a todos los objetos del mismo tipo en un solo comando de historial; la geometría absoluta x/y/w/h solo al objeto de referencia. Un único Ctrl+Z revierte el cambio en todos. El cuentagotas y cualquier llamador del panel heredan el comportamiento.
- Mano con Space+arrastrar; Shift+0 zoom a la selección; imán al dibujar formas nuevas (la esquina arrastrada encaja en bordes/centros, página y guías).
- Panel ALINEAR sticky al fondo (siempre accesible en ventanas bajas); auditoría de fricciones UI en navegador real.

Verificación: `tsc --noEmit` limpio, 269 tests unitarios, 57 e2e Playwright.

## Pendientes

- Deuda técnica:
  - Dirty-rects/offscreen para miles de objetos (redraw completo con rAF, `ponytail:` en `render.ts`).
  - Fuentes web descargables (solo fuentes del sistema por ahora).
  - Unión booleana por convex hull (suficiente para formas convexas; unión exacta con huecos requiere clipping de paths).
