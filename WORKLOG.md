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
- [x] F17 Radio de esquina en rects (`ShapeObj.rx`): campo en el inspector, canvas vía roundRect nativo y SVG vía rx (limitado a mitad del lado corto), i18n es/en, ayuda. Tests render+svg+e2e.

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
