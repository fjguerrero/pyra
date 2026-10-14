# Pyra — registro de versiones

## v1.4 — 2026-10-13

### Correcciones
- Puntos blancos en trazos (causa raíz): en `fillRibbon` los arcos de tope se dibujaban clockwise mientras los quads de `strokeOutline` van al contrario; con winding opuesto el fill nonzero dejaba un agujero en cada punto de captura. Arcos ahora antihorarios; confirmado con sonda de canvas headless y check e2e de píxeles sobre la línea de captura.

### Herramientas
- Herramienta de nodos (`A`, subselect): remodela vectores como el puntero de FreeHand. Con un vector seleccionado (trazo/polilínea/línea) muestra sus vértices como cuadrados negros en vez de asas de marco; arrastrar un vértice remodela el objeto (recalcula bbox y re-normaliza puntos) y muestra lectura flotante con ángulo (0–360°) y longitud del segmento, como hacía FreeHand. Un solo Ctrl+Z por arrastre. Botón en barra, icono, i18n es/en y ayuda.
- Nodos Bézier estilo FreeHand (nodo esquina vs nodo con punto): en polígonos, Alt+clic o doble clic en un vértice alterna esquina ↔ nodo Bézier con asa arrastrable (se genera sobre la tangente media); el asa se espeja al lado opuesto (nodo suave) y se dibuja como FreeHand (línea fina + punto blanco). Arrastrar el asa deforma la curva. Nodos y asas encajan con página, objetos y guías (magnet); Ctrl = libre. Hit-test, contorno y export SVG siguen la curva (`C`/`L` por segmento). Alt+clic sigue haciendo pan salvo sobre vértices en modo nodos. Un Ctrl+Z por edición.
- Nodos cúspide (picos angulosos de FreeHand): Alt+arrastrar un asa rompe el espejo — se crea la segunda asa (`polyH2`, lado entrante) y desde ahí cada lado se arrastra independiente; se dibujan ambas puntas con lectura de ángulo/longitud por lado y snap. Sin `polyH2` el nodo sigue siendo suave. Undo restaura el espejo; el toggle a esquina limpia la cúspide. La curva asimétrica llega sola a render, hit-test, contorno y SVG vía `polySegs`.
- Ciclo de tipo de nodo con un solo gesto: doble clic o Alt+clic en un vértice cicla esquina → suave → cúspide → esquina (el segundo gesto crea la segunda asa espejada, antes alcanzable solo con Alt+arrastrar; el tercero vuelve a esquina). Los nodos se distinguen en el lienzo por icono según tipo: cuadrado (esquina), círculo (suave), triángulo (cúspide).
- Nodo activo reconocible: el último nodo clickeado/alternado/arrastrado con la herramienta A se resalta en azul conservando su icono de tipo; se desactiva solo si su objeto deja de estar seleccionado.
- Flechas con nodo activo: con la herramienta A y un nodo activo, las flechas del teclado mueven solo ese nodo (con snap y un Ctrl+Z por pulsación); sin nodo activo siguen moviendo el objeto entero, como siempre. Ayuda es/en actualizada.
- Insertar/borrar nodos estilo FreeHand: doble clic sobre un tramo (no un vértice) de un polígono o trazo inserta un nodo en el punto más cercano; en tramos curvos la cúbica se parte por de Casteljau y la forma queda idéntica (el nodo nuevo recibe las dos asas del corte y los vecinos solo cambian el asa del lado partido; un nodo suave vecino pasa a cúspide asimétrica con asas colineales, sigue viéndose suave). Con un nodo activo, Supr borra solo ese nodo (mínimo 3 vértices en polígonos, 2 puntos en trazos). Un Ctrl+Z por operación. `setNode` se traslada a `model.ts` compartido con la geometría nueva. Ayuda es/en actualizada.

### Interfaz
- Barra de menús superior: la barra inferior de estado desaparece y se sustituye por una barra de 34px arriba con la marca (◆ Pyra) y dos menús: **Archivo** (importar imagen + todos los formatos de exportación + calidad) y **Configuración** (idioma, tema, fondo, color de nodos, color de marcos, ayuda). Solo un desplegable abierto a la vez; clic fuera cierra. El texto de estado y los controles de zoom pasan al lado derecho de la barra. Los botones de importar/exportar de la barra lateral se retiran (viven en Archivo); Ajustar se queda en la barra de herramientas. Estilo sobrio tipo Linear: superficies por luminancia, bordes finos, peso medio. i18n es/en con claves nuevas (`menu_file`, `node_color`, `frame_color`).
- Colores configurables de la interfaz de dibujo: **color de nodos** (vértices de paths) y **color de marcos** (marco de selección, selección múltiple y contorno de grupo) con selectores de color en Configuración. Se persisten en `pyra:ui` (localStorage) y llegan al renderizador vía `Scene.ui` (`nodeColor`/`frameColor`). Por defecto sin cambios (`#111111` nodos, `#4f8cff` marcos); el nodo activo sigue en azul.
- Drag & drop de imágenes: al soltar un archivo de imagen sobre la ventana se importa por la misma ruta que el botón Importar (bitmap centrado y undoable; si el PNG lleva fuente Pyra embebida, reabre el documento). Un único `handleFile` compartido, sin código paralelo.
- Proporción al redimensionar: las asas de esquina mantienen la proporción original por defecto (el cursor se proyecta sobre la diagonal ancla→esquina, estilo FreeHand/Figma); mantener Ctrl/⌘ mientras se arrastra una esquina libera la escala. Las asas de lado siguen escalando en un solo eje. Ayuda actualizada (es/en).

### Inspector
- Selección de color (causa raíz): al soltar el click dentro del inspector, `renderPanels` reconstruía el panel y destruía el `<input type=color>` antes de que abriera su diálogo nativo (y a mitad de selección). Ahora soltar sobre un campo del panel (input/select/textarea, salvo sliders y checkboxes) no lo reconstruye, y mientras un selector de color tiene el foco se pospone el re-render: el diálogo abre, permanece abierto durante la selección y el color se aplica en vivo.
- Estilos de trazo cambiables: el selector sustituye al antiguo botón único de discontinuo — sólido, discontinuo, punteado y raya-punto sobre el mismo `dash` del objeto, aplicable en cualquier momento desde el inspector. El punteado usa puntas redondas (ya por defecto) para puntos reales en canvas y SVG export. i18n en 15 idiomas.
- Inspector sin barras de scroll: `scrollbar-width:none` en `#side` (la rueda sigue desplazando) y filas `.field` encogibles (`range` con flex, `number` con `min-width:0`) para que ninguna fila sobresalga del panel de 232px.

Verificación: `tsc --noEmit` limpio, 293 tests unitarios, 67 e2e Playwright.

## v1.3 — 2026-10-13

### Herramientas y objetos
- Motor de pinceles vectoriales (`brush-engine.ts`): estabilizador de doble EMA, ancho por presión real o velocidad, afinado de extremos (taper) y contorno con relleno de alfa uniforme.
- Lápiz (`N`) con presets Lápiz/Pluma/Marcador/Pincel suave, sliders (tamaño, opacidad, estabilizador, afinado) y vista previa real del trazo.
- Polilápiz (`G`): simplificación RDP antes de curvar, curvas Catmull-Rom reales en modo Estilizado, estabilizador en la captura y alternancia guion↔curva sobre el mismo objeto.
- Goma (`X`): surco continuo con stamps interpolados sin huecos en saltos rápidos; tamaño ajustable.
- Cuentagotas (`I`): muestrea el píxel real, lo aplica a la selección, fija el color por defecto de formas/trazos y lo añade a muestras recientes.

### Rellenos, estilos y efectos
- Degradado radial elíptico ajustado al bbox y toggle Lineal/Radial en el inspector.
- Degradados multi-parada: editor de paradas (posición %, color, borrar; mínimo 2) en canvas y SVG.
- Radio de esquina en rectángulos (`rx`) editable en vivo; `roundRect` nativo en canvas, `rx` en SVG.
- Voltear espejo H/V de la selección (`Ctrl+Shift+H/V`), undoable, botones en ALINEAR.
- 16 modos de mezcla (`fx.blend`, los 15 CSS + Normal): canvas con `globalCompositeOperation` dentro del clip y reset por objeto; SVG con `mix-blend-mode` en envoltorio; viajan con los Styles.
- Opacidad por objeto (`fx.opacity`): se multiplica con la alfa de capa y se restaura tras el objeto; SVG con `opacity` en el envoltorio.

### Edición y vista
- Panel de opciones por herramienta real (modos que sí llaman a `setMode`, sliders, toggles, colores); el inspector se recalcula en cada render (corregido el bug de la foto fija de `setTool`).
- Anillo de cursor con el tamaño real en pantalla (lápiz/pincel/goma), estilo Sketchbook.
- Atajos `[` / `]` para el grosor de la herramienta de dibujo activa.
- Mano con Space+arrastrar; `Shift+0` zoom a la selección; imán al dibujar formas nuevas (encaja en bordes/centros, página y guías).
- Panel ALINEAR sticky al fondo, siempre accesible en ventanas bajas.
- Edición multi-objeto: con varios seleccionados, el inspector cambia a la vez todos los objetos del mismo tipo (relleno, borde, efectos, tipografía) en un solo paso de deshacer; posición y tamaño solo en el de referencia.

### Archivo
- Exportar SVG: formas vectoriales, trazos como path nonzero con alfa uniforme, polígonos suaves como cúbicas, bitmaps con crop/goma vía clip/mask/filters y efectos con feDropShadow.

### Calidad
- TypeScript estricto sin errores; 269 tests unitarios (Vitest); 57 tests e2e (Playwright).
- Fix de raíz: las teclas sueltas de herramienta ignoran modificadores (`Ctrl+V` pegar ya no se lo comía la herramienta de selección).

## v1.2 — 2026-10-07

### Herramientas y objetos
- Lápiz (P): polígono clic a clic, cierre en el primer vértice o con Enter; Escape descarta.
- Lápiz (N): dos modos — continuo (trazo tipo MS Paint) y suavizado (Catmull-Rom); crea un objeto `stroke` vectorial editable (grosor/color en el inspector), undoable.
- Polilápiz (G): dibuja polígonos vectoriales arrastrando a mano alzada; modo recto (simplificación RDP → líneas rectas) o estilizado (curvas suaves). Borde y relleno independientes (color, grosor, línea discontinua, sin relleno), configurables en el panel de la herramienta y en el inspector del objeto.
- Pluma (P) con vértices curvos/rectos alternables con Shift durante el trazado.
- Goma de borrar (X) bitmap: borra píxeles reales de imágenes importadas (`destination-out`), undoable, como el Paint Eraser de Fireworks.
- Unión booleana (Ctrl+U o botón en ALINEAR): fusiona las formas seleccionadas en un polígono, undoable.
- Bisel: campo en efectos en vivo (luz/sombra interior recortada a la forma).
- Negrita/cursiva en texto con re-medición del bbox.

### Selección y guías
- Multi-selección con asas del bbox común: redimensionar todas las formas a la vez.
- Alinear/distribuir trata los grupos como unidades.
- Smart guides con imán de "igual distancia" (huecos iguales entre objetos).

### Export
- Export de assets individuales: un PNG por objeto seleccionado (menú Exportar).
- Fondo del área de trabajo: cuadrícula de líneas (no cuadrados rellenos). Botón de Ayuda en el menú de configuración (abajo a la izquierda) con la documentación completa de la app (es/en; el resto de idiomas usa el texto en inglés).


## v0.2 — 2026-10-07

### Herramientas y objetos
- Pincel (B): puntas redonda/cuadrada, tamaño/presión/opacidad configurables, presión real con lápiz; puntas personalizadas SVG/bitmap estampadas a lo largo del trazo.
- Líneas: sentido real del arrastre en las cuatro direcciones (`lineFrom` + `lineEnds` para render y hit-test).
- Texto: selector de 14 fuentes del sistema con previsualización; re-medición del bbox al cambiar fuente o tamaño.

### Color y paletas
- Color con alfa (`#rrggbbaa`) en el inspector.
- Dos paletas: recientes (auto, deduplicada, tope 12) y personalizados persistentes; ambas ordenables por drag y eliminables.

### Export e interfaz
- Export JPEG y WebP además de `.f.png` y PNG plano.
- Toolbar rediseñada con iconos SVG lineales; zoom centrado editable; fondo con rejilla configurable.
- i18n completo en 15 idiomas (incl. RTL árabe); tema claro/oscuro/sistema.
- Sliders con edición numérica; correcciones de layout (color picker, scroll único de paneles, alpha redondeado).

### Calidad
- 185 tests unitarios + 25 e2e; build de producción verificado (~34 kB gzip JS).

## v0.1 — 2026-10-06

Clon web de Fireworks: bitmap y vector en el mismo lienzo, local-first, sin cuenta ni servidor.

### Núcleo
- Lienzo Canvas2D con pan/zoom, ajuste de vista (0), smart guides (imán a bordes, centros y bordes de página).
- Capas (crear, ocultar, bloquear, renombrar, reordenar, eliminar, opacidad) y páginas múltiples.
- Undo/redo por comandos; persistencia automática en IndexedDB.

### Herramientas y objetos
- Tools V/R/E/L/T como Fireworks: tras dibujar vuelve a la selección.
- Rect, elipse, línea; importar imágenes como bitmaps con recorte y filtros vivos (saturación, brillo, desenfoque).
- Texto editable (clic para crear, doble clic para editar, tipografía en inspector).

### Edición
- Selección por clic, Shift+clic y marco (marquee).
- Rotación con manija (Shift = pasos de 15°) y campo en inspector.
- Grupos (Ctrl+G / Ctrl+Shift+G; tocar un miembro selecciona el grupo).
- Duplicar (Ctrl+D), copiar/pegar (Ctrl+C/V), traer al frente / enviar al fondo ([ ]), nudge con flechas (Shift = 10 px).
- Alinear y distribuir; guías manuales de página (clic derecho crea, clic sobre ella borra, arrastrables; el snapping las usa).

### Apariencia
- Relleno con degradado lineal (desde/hasta/ángulo).
- Styles reutilizables: paquetes de relleno/trazo/degradado/efectos con swatches, guardar y aplicar (undoable).
- Efectos en vivo no destructivos: sombra, glow, desenfoque.

### Archivo
- `.f.png`: PNG normal con la fuente editable embebida (chunk tEXt), reimportable.
- Export PNG plano de la página activa.

### Interfaz
- Paneles derechos colapsables y reordenables (orden persistido).
- Propiedades en panel derecho bajo Páginas; tamaño de página editable.

### Calidad
- TypeScript estricto sin errores; 172 tests unitarios (Vitest); 17 tests e2e (Playwright) estables en múltiples pasadas.

### Pendientes para v0.2
- Pen tool, unión booleana de formas, bevel, distribución con selección de grupo, dirty-rects/offscreen para miles de objetos.
