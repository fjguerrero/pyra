# Pyra — registro de versiones

## v1.2 — 2026-10-07

### Herramientas y objetos
- Lápiz (P): polígono clic a clic, cierre en el primer vértice o con Enter; Escape descarta.
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
