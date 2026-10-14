# WORKLOG — noche autónoma 2026-10-13 (00:10 → 09:00)

Petición de Yo: probar todas las funcionalidades y pulir (lápices deficientes,
líneas estilizadas que no eran curvas, goma con huecos entre frames), crear un
sistema de pinceles vectoriales completo estilo Sketchbook, luego UI/UX estilo
Jobs, luego más funcionalidad. Tests y commits siempre. Autónomo: no preguntar,
resolver los problemas por uno mismo y continuar.

## Protocolo (para el agente del cron)
1. Carga la skill `pyra-milestone-work` y síguela (gate, commit, publicar).
2. Lock: si `~/devai/pyra/.agent-lock` existe con mtime < 20 min, hay otro
   agente trabajando → no tocar el repo y responder «otro agente activo».
   Si no, `touch .agent-lock` y trabajar; al terminar `rm .agent-lock`.
3. Si el árbol está sucio (trabajador anterior cortado): gate (`npx tsc
   --noEmit && npx vitest run`); verde → commit «wip: …»; rojo → `git stash
   push -m rescate` y anótalo aquí.
4. Elige la siguiente tarea sin marcar de este fichero. Impléntala completa
   (código + tests unitarios + e2e si aplica). Gate completo verde:
   `npx tsc --noEmit && npx vitest run && npx playwright test`.
5. Un commit por feature (mensaje en español). Actualiza el Estado de
   `docs/02-proyecto.md` y marca la tarea aquí con la línea de commit.
   `git push`. Publicar: `npm run build && git subtree push --prefix dist origin gh-pages`.
6. Si `date +%H` es >= 8: fase final en vez de tarea nueva — gate completo,
   gh-pages publicado, docs al día, borrar el cronjob «pyra-noche»
   (cronjob_manage action=list → job_id → remove) y resumen final.

## Plan
- [x] F1 Motor de pinceles vectoriales (`src/brush-engine.ts`): estabilizador
  doble EMA, ancho por presión real (lápiz digital) o velocidad, afinado de
  extremos (taper), contorno quads+círculos con relleno de alfa uniforme.
- [x] F2 Lápiz (N) con presets Lápiz/Pluma/Marcador/Pincel suave + sliders
  (tamaño, opacidad, estabilizador, afinado) + vista previa real del trazo.
- [x] F3 Goma: surco continuo con stamps interpolados (sin huecos) + tamaño
  ajustable (panel y atajos [ ]).
- [x] F4 Polilápiz (G): RDP antes de curvar → curvas Catmull-Rom reales en
  modo Estilizado; estabilizador en la captura; toggle guion real.
- [x] F5 Atajos [ / ] para el grosor de la herramienta activa.
- [x] F6 Panel de opciones por herramienta: modos reales (antes los botones de
  modo no llamaban a setMode), sliders, toggles, colores.
  → commit 797bf59 (222 unit + 39 e2e verdes).
- [x] F7 Ayuda y textos: `help_html` (en/es) con presets, [ ], goma con tamaño;
  además se encontró y arregló un bug real: el panel del inspector era una foto
  fija de setTool (los presets/sliders/modos no se refrescaban) → ahora se
  calcula en cada render. → commit 1f3b7d0.
- [x] F7b e2e de calidad de trazo: polilápiz estilizado (RDP+smooth, pocos
  vértices) y goma continua sin huecos en saltos rápidos. → commit 7f746e1.
- [x] F8a Anillo de cursor estilo Sketchbook (tamaño real en pantalla de
  lápiz/pincel/goma, crece con ], oculto para herramientas sin tamaño).
  → commit aae653e (222 unit + 43 e2e verdes).
- [x] F9 Exportar SVG: `src/svg-export.ts` (formas vectoriales, trazos como
  path nonzero con alfa uniforme, polígonos suaves como cúbicas, bitmaps con
  crop/goma/ajustes vía clip/mask/filters, efectos con feDropShadow). Menú
  Exportar → SVG en 15 idiomas. → commit d89a02c (236 unit + 44 e2e verdes).
- [x] F8 UI/UX pase Jobs: auditoría real en el navegador (dev :5199, flujos
  rect/lápiz/exportar/ayuda/tema/idioma). Fricciones reales corregidas: borde
  en rect/óvalo desde el inspector (ac9eb31), e2e de alfa concreto (1ed933d),
  artefactos de Playwright fuera del repo (5c9deb9), panel ALINEAR sticky en
  ventanas bajas con e2e a 470px probado por stash (ef0bd34).
- [x] F10 Cuentagotas (I): muestrea píxel real, aplica a la selección, fija el
  color por defecto de formas/trazos y lo mete en muestras recientes; icono,
  atajo, ayuda en/es, i18n 15 idiomas, e2e con espera de repintado.
  → commit 4b22fef.
- [x] F11 Degradado radial elíptico (canvas: transform unitario; SVG:
  radialGradient objectBoundingBox) + toggle Lineal/Radial en inspector.
  → commit 33a31da (239 unit + 48 e2e verdes).
- [ ] F12 Fase final: docs/02 al día, CHANGELOG, gh-pages, resumen. → pospuesta (hay features nuevas); se ejecuta cuando `date +%H` >= 8.
- [x] F13 mano con Space+arrastrar. → commit dec8e68.
- [x] F14 Shift+0 zoom a la selección. → commit 31c2d0b.
- [x] F15 Imán al dibujar formas nuevas (esquina arrastrada encaja en bordes/centros, página, guías). → commit 4556596.
- [x] F16 Degradado multi-parada: `Gradient.stops` + editor de paradas en el inspector (posición %, color, borrar; nunca <2), canvas y SVG con las paradas, i18n 15 idiomas, ayuda es/en. Rescatado de un trabajador cortado; corregido su e2e (esperaba volver a from/to al borrar) y rama muerta en panels.ts.
- [x] F17 Radio de esquina en rects (`ShapeObj.rx`): campo en el inspector, canvas vía roundRect nativo y SVG vía rx (limitado a mitad del lado corto), i18n es/en, ayuda. Tests render+svg+e2e. → commit 692a084.
- [x] F18 Voltear H/V (`flipH`/`flipV` en todos los objetos): espejo sobre el centro del bbox en canvas/hit/SVG/unión, comando undoable, botones en ALINEAR, atajos Ctrl+Shift+H/V, ayuda es/en. Además fix de raíz: todas las teclas sueltas de herramienta protegidas con !mod (Ctrl+V pegar estaba roto y sin test). → commit 648244e.
- [x] F19 Modos de mezcla (`fx.blend`): 15 modos CSS + Normal; canvas globalCompositeOperation dentro del clip con reset tras el objeto, SVG mix-blend-mode envuelto, selector en Efectos en vivo (viaja con Styles), i18n es/en, ayuda. Fix colateral: select de fuente con data-act=font (el inspector ya no tiene un solo select y el e2e de texto se rompió). → commit a4c740c.
- [x] F20 Opacidad por objeto (`fx.opacity`): slider en Efectos en vivo; canvas multiplica la alfa de capa y la restaura tras el objeto, SVG opacity en el envoltorio junto a mix-blend-mode; i18n es/en, ayuda. → commit 43666ef.
- [x] F21 Edición multi-objeto en el inspector: `editObj` (punto único por el que pasan todos los llamadores) aplica el parche de estilo a todos los seleccionados del mismo tipo en un solo comando de historial; x/y/w/h solo al de referencia; gradientes/fx clonados por destino. Cuentagotas hereda el comportamiento. Ayuda es/en. e2e con dos rects + marco + undo único. → commit 56309f5.
- [x] F22 Fix puntos blancos en trazos (winding opuesto arcos/quads en `fillRibbon`; arcos antihorarios, sonda headless + e2e de píxeles) y herramienta de nodos (`A`, subselect): vértices como cuadrados negros, arrastre remodela el vector con lectura FreeHand de ángulo+longitud, un undo por arrastre; botón+icono, i18n es/en, ayuda. 2 unit + 2 e2e nuevos. → commit 524b314.
- [x] F23 Nodos Bézier estilo FreeHand (c3939dc): `polyH` por vértice (esquina vs nodo suave con asa espejada), Alt+clic alterna esquina↔Bézier, asa arrastrable dibujada como FreeHand, snap de nodos y asas (página/objetos/guías, Ctrl libre), hit-test/contorno/SVG siguen la curva (C/L). Alt+clic sigue siendo pan salvo sobre vértices. 4 unit + 1 e2e nuevos.
- [x] F24 Nodos cúspide estilo FreeHand (55b40e0): `polyH2` = asa del lado entrante; Alt+arrastrar un asa rompe el espejo → pico anguloso con asas independientes (ambas puntas dibujadas, lectura por lado, snap). Undo restaura el espejo; toggle a esquina limpia la cúspide. Doble clic como gesto de toggle. 1 unit SVG + e2e ampliado.
- [x] F25 Fix selección de color en el inspector (causa raíz: el pointerup sobre controles del panel lo reconstruía y destruía el `<input type=color>` antes/de mitad del diálogo nativo; ahora soltar sobre un campo no reconstruye y con un selector de color enfocado el re-render se pospone) + estilos de trazo cambiables (sólido/discontinuo/punteado/raya-punto sobre `dash` existente, i18n 15 idiomas). 1 e2e nuevo.
- [x] F26 ciclo de nodo esquina→suave→cúspide con doble clic/Alt+clic + iconos por tipo (cuadrado/círculo/triángulo). → commit 1d3dd3f.
- [x] F26b nodo activo resaltado en azul conservando el icono de tipo. → commit b414e91.
- [x] F26c flechas con nodo activo: mueven solo ese nodo (setNode, undo por nudge); sin nodo activo mueven el objeto. → commit 141715b.
- [x] F27 insertar/borrar nodos estilo FreeHand: doble clic en un tramo lo parte exacto (de Casteljau, `splitSeg`/`polyInsertOnSeg` en model.ts) sin cambiar la forma; Supr borra solo ese nodo; `setNode` a model.ts. → commit 5ef63c1.
- [x] F28 barra de menús superior (Archivo/Configuración, uno abierto a la vez, estado+zoom a la derecha) sustituyendo la barra inferior; colores configurables de nodos y marcos (`pyra:ui`, `Scene.ui`). → commit 7bf4110.
- [x] Fix inspector sin barras de scroll (scrollbar-width:none en #side + filas .field encogibles). → commit 296e6d9.

## Registro de progreso
- 00:32 F1–F6 completadas y commiteadas (797bf59). Gate completo verde.
- 01:10 F7, F7b y F8a commiteadas (1f3b7d0, 7f746e1, aae653e). 222 unit + 43 e2e verdes.
- 01:35 F8 completada: auditoría de navegador + borde en rect/óvalo + ALINEAR
  sticky (ac9eb31, 1ed933d, 5c9deb9, ef0bd34). Suite 45 e2e.
- 01:58 F10 y F11 commiteadas (4b22fef, 33a31da). 239 unit + 48 e2e verdes.
- 02:12 F13 mano con Space+arrastrar (dec8e68). 239 unit + 49 e2e.
- 02:32 F14 Shift+0 zoom a la selección (31c2d0b). 239 unit + 49 e2e.
- 02:49 F15 imán al dibujar (4556596). Trabajador cortado a mitad de F16.
- 03:55 F16 rescatada y completada: multi-parada en canvas+SVG+inspector, e2e corregido, docs/02 v1.3 al día. 251 unit + 52 e2e verdes.
- 04:05 F17 radio de esquina en rects (roundRect nativo + rx en SVG + campo inspector). 255 unit + 53 e2e verdes.
- 05:15 F18 voltear H/V (canvas/hit/SVG/unión + botones ALINEAR + Ctrl+Shift+H/V) y fix !mod de teclas de herramienta (Ctrl+V roto). 263 unit + 54 e2e verdes (un fallo e2e fue flaky: re-run limpio).
- 06:40 F19 modos de mezcla (fx.blend: canvas gco + reset, SVG mix-blend-mode, selector inspector, i18n es/en, ayuda) + fix data-act=font. 266 unit + 55 e2e verdes (fallos sueltos por run completo: flaky, re-run limpio).
- 06:55 F20 opacidad por objeto (fx.opacity: alfa multiplicativa con restauración, SVG opacity, slider inspector, i18n, ayuda). 269 unit + 56 e2e verdes. gh-pages publicado vía clon+commit (subtree push no funciona: dist/ está en .gitignore; force-push bloqueado en cron).
- 08:05 F21 edición multi-objeto en el inspector (56309f5): editObj aplica estilos a todos los seleccionados del mismo tipo, un undo revierte en todos; x/y/w/h solo al de referencia. 269 unit + 57 e2e verdes (un fallo en re-run parcial fue flaky: suite completa limpia). Fase final: docs/02, CHANGELOG y gh-pages al día; cron «pyra-noche» retirado.
- 11:05 F22 fix puntos blancos en trazos + herramienta de nodos estilo FreeHand (524b314). 271 unit + 59 e2e verdes. Docs de proyecto (docs/01–04) pasados a inglés in situ; docs/02, CHANGELOG y WORKLOG al día con v1.4.
- 12:13 F23 nodos Bézier estilo FreeHand en la herramienta de nodos (c3939dc): esquina↔curva con Alt+clic, asas arrastrables espejadas, snap de nodos/asas, SVG C/L. 275 unit + 60 e2e verdes.
- 13:48 F24 nodos cúspide (picos angulosos): Alt+arrastrar rompe el espejo con `polyH2`, asas independientes por lado con lectura y snap; doble clic como toggle. 276 unit + 60 e2e verdes.
- 14:34 F25 fix selección de color (re-render del inspector destruía el input de color) + selector de estilos de trazo (sólido/discontinuo/punteado/raya-punto). 276 unit + 61 e2e verdes.
- 19:38 F26/F26b/F26c (ciclo de tipo de nodo + iconos, nodo activo azul, flechas por nodo) y fix scroll del inspector. 278 unit + 62 e2e verdes (verificado 2026-10-14). Docs (docs/02, CHANGELOG, WORKLOG) puestos al día con F26.
- 21:41 F27 insertar/borrar nodos estilo FreeHand (doble clic parte el tramo exacto por de Casteljau; Supr borra solo el nodo activo; setNode a model.ts). 286 unit + 64 e2e verdes. Docs al día con F27.
- 22:14 F28 barra de menús superior (Archivo/Configuración) sustituyendo la barra inferior + colores configurables de nodos y marcos (pyra:ui). Verificado visualmente en :5199. 290 unit + 65 e2e verdes. Docs al día con F28.
