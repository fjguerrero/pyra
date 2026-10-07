# Pyra

Un clon web de **Macromedia/Adobe Fireworks**: editor híbrido vector + bitmap para diseñar y exportar los gráficos de una interfaz. Vanilla TypeScript + Canvas 2D, sin framework ni dependencias de runtime.

Herramientas: selección, rectángulo, elipse, línea, pluma (vértices curvos/rectos), lápiz (trazo continuo o suavizado), polilápiz (polígonos a mano alzada, rectos o estilizados), pincel, goma, texto; capas y páginas, guías inteligentes con snap, estilos reutilizables, efectos (sombra/glow/blur/bisel), unión de formas, undo/redo completo, importación de imágenes, exportación PNG/JPEG/WebP y `.f.png` (documento editable embebido en un PNG). Interfaz en 15 idiomas.

## Construido con Hermes Agent

Este proyecto está **enteramente construido por [Hermes Agent](https://hermes-agent.nousresearch.com) ([Nous Research](https://nousresearch.com))** — el agente escribió el código, los tests y la documentación en sesiones de trabajo iterativas.

Es además una **prueba de [Qwen3.8-Flash-Next](https://huggingface.co/Qwen/Qwen3.8-Flash-Next)** servido localmente con **[Strata](https://github.com/Niko1221/Strata)**, un motor de inferencia que ejecuta este MoE de 125B (6B activos por token) en hardware de consumo (GPU de 12 GB + 64 GB de RAM) y expone una API OpenAI/Anthropic-compatible en localhost. El agente se conecta a él como provider custom (`qwen3.8-flash-next`, cuantización IQ3_XXS).

| | |
|---|---|
| Agente | [Hermes Agent](https://hermes-agent.nousresearch.com) · [GitHub](https://github.com/NousResearch/hermes-agent) |
| Modelo | [Qwen3.8-Flash-Next](https://huggingface.co/Qwen/Qwen3.8-Flash-Next) · [Qwen](https://qwen.ai) |
| Inferencia local | [Strata](https://github.com/Niko1221/Strata) |

## Stack

TypeScript · [Vite](https://vitejs.dev) · Canvas 2D · IndexedDB · [Vitest](https://vitest.dev) · [Playwright](https://playwright.dev). Sin dependencias de producción.

## Uso

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # tsc --noEmit + tests unitarios
npx playwright test   # tests e2e
```

## Docs

- `docs/01-analisis-fireworks.md` — qué era Fireworks y qué se clona
- `docs/02-proyecto.md` — arquitectura y estado
- `docs/03-ui.md` · `docs/04-funcionalidades.md` — UI y funcionalidades
- `CHANGELOG.md` — historial de versiones
- Dentro de la app: menú ⚙ → **Ayuda** (documentación completa de funcionalidades y atajos)

## Licencia

MIT.
