# Análisis: Macromedia / Adobe Fireworks

## Qué era

Fireworks (1998, Macromedia; adquirida por Adobe en 2005; discontinuado en mayo de 2013,
CS6 fue la última versión). Un editor **híbrido bitmap + vector** dirigido a una sola tarea:
producir los gráficos de los que se ensambla una interfaz. No era "otro Photoshop" ni
"otro Illustrator": era la herramienta con la que se diseñaron Gmail, Google Maps o Google
Docs en los 2000.

## Modelo mental (lo que lo hacía único)

1. **Un solo lienzo híbrido.** Píxeles y paths en el mismo documento, sin cambiar de
   aplicación ni de modo. Seleccionabas una foto y una forma vectorial con la misma
   herramienta de selección.
2. **El documento ERA un PNG.** El formato nativo era `.png` con la fuente editable
   embebida en los metadatos del propio PNG. Cada archivo era su propia preview:
   cualquier navegador o viewer mostraba la imagen; Fireworks la reabría editable.
3. **Capas de primera clase.** Panel de capas simple y rápido: visibilidad, bloqueo,
   opacidad, blending, renombrar, reordenar. Las capas podían exceder el lienzo.
   La maquetación (colocar, alinear, agrupar) era directa, sin fricción.
4. **Páginas y estados.** Un documento con múltiples páginas (pantallas) navegables al
   instante, y "states" por página para animaciones GIF/prototipos.
5. **Símbolos.** Instancias reutilizables con biblioteca; editar el maestro propagaba
   el cambio a todas las instancias. Quince años antes que los componentes de Figma.
6. **Live effects.** Sombras, brillos, bisels, emboss… aplicados como atributos
   editables del objeto — sobre vectores Y sobre texto — sin aplanar nunca nada.
7. **Property Inspector.** Un panel de propiedades contextuales (heredado de
   Dreamweaver) que mostraba exactamente lo editable del objeto seleccionado.
8. **Slices y hotspots.** Recortar regiones del lienzo con compresión por slice y
   export HTML/imágenes optimizados. El flujo "diseñar → exportar assets" integrado.
9. **Smart guides y snapping.** Guías magnéticas a bordes/centros de objetos, snapping
   a guías y a otros objetos. Colocar bien era fácil sin esfuerzo.
10. **Herramientas compartidas.** La misma selección, transformación y edición servía
    para bitmap y vector. Auto-shapes, pen tool sencillo, texto con control tipográfico.

## La UI original

- Barra de herramientas a la izquierda (herramientas compartidas bitmap/vector).
- Property Inspector arriba (contextual, lo más característico de la app).
- Panel de Pages y de Frames/States a la derecha; Layers y Symbols debajo.
- Paneles flotantes o acoplables en grupos.
- Atajos de teclado agresivos; flujo de trabajo rápido y directo, sin diálogos.

## Lo que la gente echa de menos (recopilado de comunidades HN/foros + consenso)

- **El lienzo híbrido**: nada posterior combinó bitmap y vector con esa naturalidad
  (Affinity Designer es lo más cercano; Figma es vector-only).
- **PNG como fuente editable**: el archivo auto-preview no lo ha igualado nadie.
- **Live effects no destructivos sobre todo**, incluido texto.
- **Lo fácil que era maquetar**: capas simples, smart guides, snapping, páginas
  multi-pantalla. "Fireworks could have been Figma."
- **Symbols antes de tiempo.**
- **Ligereza y velocidad**: app nativa, arrancaba al instante, sin plataforma alrededor.
- **Property Inspector**: propiedades del objeto a mano, siempre, sin cavar en menús.

## Qué NO era (para no clonar sus errores)

- No era para impresión ni fotografía (CMYK, gestión de color pobre).
- UI de 1998: paneles flotantes densos, sin HiDPI (murió literalmente por la pantalla
  retina), sin colaboración, sin componentes responsive.
- Rendimiento malo con documentos grandes en las últimas versiones.
