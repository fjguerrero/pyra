# Pyra — inventario completo de funcionalidades de Fireworks

Fuente: **manual de referencia oficial de Adobe Fireworks CS6** (PDF completo, extraído
y analizado — TOC íntegro) + manuales de Fireworks 2/MX/MX 2004 para lo que CS6 da por
sentado. Este es el mapa completo; al final, qué adopta Pyra y en qué fase.

## 1. Documentos y archivo
- Documentos `.png` de Fireworks (fuente editable embebida en el PNG).
- Crear documentos desde archivos HTML (CS6).
- Abrir/importar: PSD (conservando capas y efectos de Photoshop editables), AI, Flash,
  GIF, JPEG, TIFF, SVG (extensión), FXG. Export: PNG/GIF/JPEG/TIFF/SWF/PDF/BMP/WBMP.
- Export Wizard, Image Preview, export por email, emuladores móviles.
- Batch-processing, comandos personalizados, scripting (JS), find & replace.

## 2. Workspace
- Canvas: redimensionar, Fit/Trim canvas, color de fondo, área de trabajo gris
  (lo que sale del canvas no se exporta).
- Navegación: zoom, pan, modos de pantalla (standard / full con menús / full).
- Preview Original / 2-Up / 4-Up con ajustes de optimización.
- Undo y "repeat multiple actions" (repetir una acción N veces).
- Smart guides, guías manuales, grid + snap, reglas, info panel.

## 3. Selección y transformación
- Selección por objeto y por píxel (herramientas de selección bitmap: lasso, magic
  wand, marquee; subselección de puntos de path).
- Transformar: escalar, skew, distort, rotar, transformar libremente.
- Agrupar/desagrupar, apilar orden (bring/send), alinear y distribuir, bloquear,
  ocultar, duplicar/clone, paste inside (recortar al pegar dentro de un path).
- Modificar selección: expandir, contraer, suavizar, transformar selección de píxeles.

## 4. Bitmap
- Herramientas: paintbrush, eraser, pencil, spray can, airbrush, smudge, blur,
  sharpen, dodge, burn, sponge, color replace, red-eye, clone stamp, pen (edición
  de selecciones), crop, feather.
- Añadir ruido; ajustar color y tono (levels, brightness/contrast, hue/saturation,
  color balance, fill color, web snap); desenfocar/afilar.
- Máscaras de bitmap; modos de imagen.

## 5. Vector
- Auto Shapes (biblioteca de formas: flechas, estrellas, callouts, notas).
- Formas básicas (rect, elipse, línea, polígono), compound shapes, free-form
  (pen tool, pencil vectorial, reshape tools: freeform reshape, reshape area,
  path scrubber add/subtract).
- Path operations: union, intersect, punch out, simplify, exclude, plus, minus.
- Edición de subselección: mover/añadir/eliminar/bisectar puntos, convertir
  esquina/suave, open/close path, expandir stroke a path.
- Strokes y fills: sólidos, gradientes, patrones/roturas (pattern fills),
  strokes con estilos variados; texturas.
- 9-slice scaling (mantener esquinas al escalar símbolos).

## 6. Texto
- Text tool on-canvas + Text Editor; párrafos (indent, space above/below, leading
  en px o %), estilos de carácter y párrafo reutilizables (Style panel), kerning
  manual/auto, sesgo, escala horizontal, antialiasing.
- Texto siempre editable, incluso con Live Effects aplicados.
- Curvar texto sobre path; texto dentro de path.

## 7. Color
- Color Mixer (sólidos y gradientes), Swatches (biblioteca con librerías),
  eyedropper, web-safe snap, estilos de color reutilizables.

## 8. Live Filters (Live Effects)
- No destructivos sobre **vectores, bitmaps y texto**; se actualizan al modificar
  el objeto (hagas el rectángulo circular, el bevel se adapta).
- Bevels y embossing, drop shadow, inner shadow, glow (inner/outer),
  drop/bevel glow, color correction, blur/sharpen, Gaussian blur,
  Photoshop Live Effects (compatibilidad CS3+).
- Apilables en secuencia por objeto.

## 9. Capas, máscaras y blending
- Layers: mostrar/ocultar, bloquear, renombrar, duplicar, reordenar (auto-scroll),
  opacidad y blending por capa; capas más grandes que el canvas.
- Masking: máscara de vector sobre bitmap u objeto (mask group).
- Blending modes completos (multiply, screen, overlay…).

## 10. Estilos, símbolos, URLs
- Styles: paquetes reutilizables de fill+stroke+effects+texto aplicables a cualquier
  objeto (el "componente visual" de FW).
- Symbols: biblioteca (Assets panel), instancias, edición del maestro propaga;
  símbolos de botón con estados.
- URLs por objeto/slice/hotspot.

## 11. Slices, hotspots, rollovers (web export)
- Slices (objeto y user-defined), hotspots/image maps, rollovers (swap image,
  swap overlay), menús pop-up, botones con estados, export HTML+CSS.

## 12. Páginas y prototipado
- Páginas múltiples por documento; prototipos navegables entre páginas; slide shows.
- Prototipos Flex/AIR (CS4-CS6).

## 13. Animación
- States por página/frame; tweening; onion skinning; símbolos de animación;
  GIF animado export.

## 14. Optimización
- Optimize panel: formato, paleta, calidad, transparencia por documento y por slice;
  export multi-archivo desde el workspace.

---

## Qué adopta Pyra (mapeo a fases)

| Área FW | Pyra | Fase |
|---|---|---|
| Documento PNG editable | `.f.png` | M6 (desde M0 se guarda en IndexedDB) |
| Canvas, zoom/pan, undo | núcleo | M0 |
| Capas, blending, opacidad, masking | completo | M1 |
| Smart guides, snap, alinear/distribuir, transformar, agrupar, apilar | completo | M1 |
| Selección por objeto | completo (por píxel en M3) | M0/M1 |
| Auto shapes, formas, pen, path ops, subselección, strokes/fills/gradientes | completo | M2 |
| Bitmap: importar, recorte, filtros, retouch, ajuste color/tono | lo esencial | M3 |
| Texto: párrafo, estilos, kerning/leading, texto sobre path | completo sin path-text en M4 | M4 |
| Live Filters (sombras, glow, bevel, blur, color correction) | completo | M5 |
| Styles (paquetes reutilizables) | sí — es la idea clave de FW | M5 |
| Symbols + biblioteca | sí | M6 |
| Páginas | sí | M1 |
| States/animación/onion skin | no por ahora | — |
| Slices/hotspots/rollovers/HTML export | no (descartado) | — |
| Optimize panel | export simple por selección | M6 |
| Batch/scripting/comandos | no por ahora | — |
| Integración con Dreamweaver/Flash/PSD | import PNG/JPEG; PSD después | — |
