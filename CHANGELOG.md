# Pyra — registro de versiones

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
