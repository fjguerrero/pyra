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
- [ ] F7 Ayuda y textos: actualizar `help_html` (en/es) con presets, [ ],
  goma con tamaño; coherencia de textos del panel.
- [ ] F8 UI/UX pase Jobs: abrir la app en el navegador (dev :5199 o build),
  frotar cada flujo (crear forma → editar → exportar), corregir fricción real
  que se observe; panel ALINEAR con ventana baja (pendiente de docs).
- [ ] F9 Exportar SVG: serializador vectorial de la página (rect/ellipse/
  line/stroke→path con la cinta, polygon, text, bitmap→embebido). Tests.
- [ ] F10 Fase final: docs/02 al día, CHANGELOG, gh-pages, resumen.

## Registro de progreso
- 00:32 F1–F6 completadas y commiteadas (797bf59). Gate completo verde.
