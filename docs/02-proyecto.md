# Pyra — a Fireworks clone for the web (2026)

## Thesis

Rebuild what Fireworks did and nobody has done since: **bitmap and vector on the
same canvas, simple layers, frictionless layout, live non-destructive effects**,
as a genuinely fast web app. Not a Figma-lite: a Fireworks with 25 years of improvements.

## Design principles (inherited from Fireworks)

1. **One canvas, two natures.** Bitmap objects and vector objects coexist; the same
   selection, transformation and editing applies to both.
2. **Layers first.** Always-visible layers panel: visibility, lock, opacity,
   blending, reorder. Layout is the main flow, not an extra.
3. **Non-destructive always.** Effects (shadow, glow, bevel, blur) as attributes of
   the object, editable at any time, on bitmap, vector and text.
4. **Contextual Property Inspector.** The selected object's properties, at hand,
   always. No digging through menus or modal dialogs.
5. **Pages.** One document = several screens navigable instantly.
6. **Fast.** "Super optimized" is a requirement, not a wish (see architecture).

## Deliberate differences from the original UI

- We do not replicate the 1998 floating panels. Modern fixed layout: left toolbar,
  right inspector (properties + layers + pages in columns), central canvas.
- 2026 look: dense dark theme, linear iconography, clean typography, native HiDPI,
  keyboard shortcuts first.
- No slices/HTML export (the user rules it out): image export (PNG with
  embedded editable source, like Fireworks) + per-selection asset export.

## Architecture (optimization as a requirement)

- **Strict TypeScript, no UI framework.** Minimal DOM for panels; canvas for
  everything else. Zero render dependencies (no React). Vite as bundler.
- **Own scene graph**: documents → pages → layers → objects. Flat model with
  indices; no clones per frame.
- **Canvas2D rendering with dirty-rects + per-layer cache**: only what changes is
  repainted; static layers to offscreen canvas. Target: 60fps with thousands of objects.
- **Undo/redo by commands** (not document snapshots).
- **Persistence**: IndexedDB for sessions; `.f.png` file (a normal PNG with the
  editable source embedded in metadata — Fireworks' `.fw.png` trick, same as his)
  for export/import.
- **No server, no account, no collaboration** (for now). Local-first.

## Phases

- **M0 — Core**: scene graph, canvas with pan/zoom, selection, transformation,
  undo/redo, IndexedDB persistence.
- **M1 — Layers and layout**: full layers panel, smart guides, snapping,
  alignment/distribution, pages.
- **M2 — Vector**: shapes (rect, ellipse, polygon, line), simplified pen tool,
  fill/stroke, basic boolean union.
- **M3 — Bitmap**: import images as objects, cropping, basic filters
  (blur, levels, saturation) as live effects.
- **M4 — Text**: text tool, typography in inspector, text as an editable object.
- **M5 — Live effects**: shadow, glow, bevel, blur as non-destructive attributes
  on any object.
- **M6 — File**: `.f.png` (PNG + embedded source), asset export, PNG import
  with source.

Each phase: genuinely usable before moving on to the next.

## Status v1 (2026-10-06)

M0–M6 completed, plus what makes it feel like Fireworks:

- Tools: V (selection + marquee), R, E, L, T. Returns to V after drawing (like FW).
- Layers, pages, smart guides (edges/centers/page/manual guides), align, undo/redo by commands, IndexedDB.
- Objects: rect, ellipse, line, bitmap (import, crop, saturation/brightness/blur), editable text.
- Rotation with handle (Shift=15° steps), groups (Ctrl+G), duplicate/paste, z-order, nudge.
- Linear gradient fill; reusable Styles (FW's key idea).
- Live effects: non-destructive shadow, glow, blur.
- Manual page guides (right-click creates, click on it deletes, draggable; snapping uses them).
- Page size from the inspector. Right panels collapsible/reorderable.
- File: `.f.png` (PNG with embedded source) + flat PNG export.

Verification: clean `tsc --noEmit`, 172 unit tests, 17 Playwright e2e (×2 passes without flakies).

## Status v1.1 (2026-10-07)

- Brush (B): round/square, size/pressure/opacity, real pressure with pen, custom SVG/bitmap tips.
- Pencil (N): continuous or smoothed stroke (vector `stroke` object with thickness/color). Poly-pencil (G): freehand polygons, straight (RDP) or stylized (Catmull-Rom), independent stroke and fill. Helpers in `src/freehand.ts` (rdpSimplify, smoothPolyline, smoothClosedPolygon).
- Lines with real drag direction (`lineFrom`/`lineEnds`).
- Text with a selector of 14 system fonts and bbox re-measurement.
- Color with alpha; recent palettes + custom ones (drag/delete); JPEG/WebP export.
- Toolbar with SVG icons, editable zoom, background with grid, i18n 15 languages, light/dark theme.

Verification: clean `tsc --noEmit`, 185 unit tests, 25 Playwright e2e, successful `vite build` (34 kB gzip JS).

## Status v1.3 (night of 2026-10-13)

- Vector brush engine (`src/brush-engine.ts`): double-EMA stabilizer, width by real pressure (pen) or speed, end tuning (taper), quads+circles outline with uniform alpha.
- Pencil (N) with Pencil/Ink pen/Marker/Soft brush presets + sliders (size, opacity, stabilizer, tuning) + real stroke preview. Per-tool options panel with real modes, refreshed on each render.
- Eraser (X): continuous groove with interpolated stamps (no gaps), size adjustable with `[`/`]` (also the active tool's thickness).
- Poly-pencil (G): RDP before curving, real Catmull-Rom curves in Stylized mode, stabilizer in the capture.
- Sketchbook-style cursor ring (real on-screen size; hidden without a sized tool).
- SVG export (`src/svg-export.ts`): vector shapes, strokes as path, bitmaps with clip/mask/filters, effects with feDropShadow.
- Eyedropper (I): samples the real pixel, applies it to the selection and to the default color, saves it in recent swatches.
- Radial gradient elliptical fitted to the bbox + multi-stop gradient (`Gradient.stops`, stop editor in the inspector: position %, color, delete; canvas and SVG use the stops).
- Rectangles with live corner radius (`ShapeObj.rx`): native `roundRect` in canvas, `rx` in SVG, field in the inspector; clamped to half the short side.
- Horizontal/vertical mirror flip of the selection (`flipH`/`flipV` on all objects): canvas with `scale` about the center, hit-test to local space, SVG with `transform`, union with flipped outline; buttons in ALIGN and `Ctrl+Shift+H/V`; undoable command. Root-cause fix: bare tool keys now ignore modifiers (Ctrl+V paste was being eaten by the selection tool).
- Per-object opacity (`fx.opacity` on all objects): "Object opacity" slider in Live Effects; canvas multiplies the layer alpha and restores it after the object; SVG exports `opacity` on the wrapper next to `mix-blend-mode`; travels with the Styles by living in `Fx`.
- Blend modes (`fx.blend` on all objects): the 15 CSS blending modes + Normal; canvas applies `globalCompositeOperation` inside the page clip and resets it after each object; SVG exports `mix-blend-mode` in a wrapper; "Blend mode" selector in the inspector's Live Effects (travels with the Styles by living in `Fx`); classic names in es/en (Multiplicar, Trama, Superponer…) with fallback in the other languages.
- Multi-object editing in the inspector: with several selected, `editObj` applies the style patch (fill, stroke, effects, typography…) to all objects of the same type in a single history command; absolute x/y/w/h geometry only to the reference object. A single Ctrl+Z reverts the change in all of them. The eyedropper and any panel caller inherit the behavior.
- Hand with Space+drag; Shift+0 zoom to selection; magnet when drawing new shapes (the dragged corner snaps to edges/centers, page and guides).
- ALIGN panel sticky to the bottom (always accessible in short windows); UI friction audit in a real browser.

Verification: clean `tsc --noEmit`, 269 unit tests, 57 Playwright e2e.

## Status v1.4 (2026-10-13)

- White dots in strokes fixed (root cause): in `fillRibbon` the cap arcs were drawn clockwise while `strokeOutline` quads run the other way; with opposite winding, the nonzero fill left a hole (white dot) at every capture point. Arcs now drawn anticlockwise. Confirmed with a headless canvas probe and an e2e pixel check along the capture line.
- Node tool (A, `subselect`): FreeHand-style vector reshaping. With a vector selected (stroke/poly-line/line) it shows its vertices as black squares instead of bbox handles; dragging a vertex reshapes the vector (bbox recomputed and points re-normalized, same format as at creation) and shows a floating FreeHand-like readout with the segment's angle (0–360°, CCW from east) and length. Body drag = select/move; empty canvas = marquee. One history command per drag (single Ctrl+Z). Toolbar button, icon, es/en i18n and help updated.
- Bézier nodes (FreeHand corner/point model): polygon vertices can be corner nodes (no handles, straight segments) or Bézier nodes with a draggable handle mirrored to both sides (smooth node). `polyH` stores per-vertex normalized handle offsets; `polySegs` builds cubic/straight segments for render, hit-testing, outline commands and SVG export (`C`/`L`). Alt+click or double-click a vertex toggles corner ↔ Bézier (handle auto-generated along the average tangent); the handle tip is drawn as FreeHand did (thin line + small white circle) and drags with the same magnet snapping to page/objects/guides (Ctrl = free) as node dragging. Alt+click still pans everywhere except over a vertex in node mode. One Ctrl+Z per edit.
- Cusp nodes (FreeHand angular peaks): `polyH2` stores the incoming-side handle per vertex; Alt+drag a handle breaks the mirror (second handle created mirrored, then each side drags independently, both tips drawn, per-side angle/length readout). Without `polyH2` the node stays smooth. Undo restores the mirror; corner toggle clears the cusp. Asymmetric curves flow through render, hit-test, outline and SVG export automatically via `polySegs`.
- Node-type cycle in one gesture: double-click or Alt+click on a vertex cycles corner → smooth → cusp → corner (the second gesture creates the mirrored second handle, previously only reachable via Alt+drag; the third returns to corner). Nodes are type-coded on canvas: square (corner), circle (smooth), triangle (cusp).
- Recognizable active node: the last node clicked/toggled/dragged with the node tool is highlighted in blue keeping its type icon; it deactivates only when its object leaves the selection.
- Arrow keys with an active node: with the node tool and an active node, arrow keys move only that node (snapping, one Ctrl+Z per keypress); without an active node they still move the whole object. es/en help updated.
- FreeHand-style node insert/delete: double-clicking a segment (not a vertex) of a polygon or stroke inserts a node at the nearest point; curved segments are split exactly via de Casteljau (`splitSeg`/`polyInsertOnSeg` in `model.ts`) — the shape is untouched, the new node gets both split handles and neighbors only change the handle on the split side (a neighboring smooth node becomes an asymmetric cusp with collinear handles, still visually smooth). With an active node, Delete removes just that node (minimum 3 vertices in polygons, 2 points in strokes). One Ctrl+Z per operation. `setNode` moved to `model.ts`, shared with the new geometry. es/en help updated.
- Top menu bar replaces the bottom status bar: a 34px bar with brand, **File** menu (import image + all export formats + quality) and **Settings** menu (language, theme, background, node color, frame color, help); only one dropdown open at a time, click-outside closes. Status text and zoom controls moved to the right side of the bar; the old bottom bar and floating settings button are gone. New i18n keys (es/en).
- Configurable drawing-UI colors: node color (path vertices) and selection-frame color are now settings with color pickers, persisted in `pyra:ui` (localStorage) and passed to the renderer via `Scene.ui` (`nodeColor`/`frameColor`); defaults unchanged (`#111111` nodes, `#4f8cff` frames), active node stays blue.

- Color picking fixed (root cause): releasing a click inside the inspector used to rebuild the panel, destroying the `<input type=color>` before its native dialog could open (or mid-selection). Releasing over a panel field (input/select/textarea, except sliders and checkboxes) no longer rebuilds it, and while a color input has focus the re-render is deferred: the dialog opens, stays open during selection and the color applies live.
- Changeable stroke styles: a selector replaces the old single dashed toggle — solid, dashed, dotted and dash-dot over the object's existing `dash`, changeable at any time from the inspector. Dotted relies on the default round caps for real dots in canvas and SVG export. i18n in 15 languages.

- Drag & drop images: dropping an image file anywhere over the window routes through the same import path as the File > Import button (one shared `handleFile`): plain images become centered, undoable bitmaps; a `.f.png` with embedded Pyra source reopens the document. No parallel code path.

- Aspect-locked resizing: corner handles keep the original aspect ratio by default (the cursor is projected onto the anchor→corner diagonal, FreeHand/Figma style); holding Ctrl/⌘ while dragging a corner scales freely. Edge handles stay single-axis. Help text updated (es/en).

- Units & print size: the document stores `unit` (px/in/cm/mm) and `dpi` (default 72), configurable under Settings; the inspector shows and edits X/Y/W/H and page size in the chosen unit while the internal model stays px (the unit only formats, via `unitFactor`). Exported PNGs carry a `pHYs` chunk with the print size (dpi→pixels/metre, CRC verified against zlib) — honored by GIMP, ImageMagick, Word and print dialogs; browsers ignore it. Re-importing a `.f.png` syncs the controls with the document's units/dpi.

Verification: clean `tsc --noEmit`, 297 unit tests, 68 Playwright e2e.

## Status v1.5 (2026-10-15)

- Custom fonts: the font-family field is free text with a `datalist` of built-in and session-loaded families, plus a file loader for `.woff2/.woff/.ttf/.otf` via `FontFace` (session-only; `ponytail:` note for future binary persistence). `normalizeFontFamily` builds a valid CSS stack (quotes names with spaces, keeps identifiers and generic keywords bare).
- Left toolbar redesign (Linear/Raycast-style): 34px buttons, 8px radius, 20px icons, subtle hover, active state with accent tint + left indicator bar, visible focus outline. Icon pass: subselect, serif-T text, quill pen, eraser, polygon, import.
- Multi-node selection: Shift+click toggles nodes inside the active object (Inkscape-style `nodeSel`); selected nodes drag together (magnet propagated), arrow keys move the set, Delete removes the block, and the Align tools align node-to-node in node mode (dedicated panel hint). Render highlights the whole set (`nodes.activeList`).
- Order panel improved: unambiguous icons (stacked squares = to front/back, arrow+bar = one step; separate arrows for layer movement), separators between align/order/flip groups, buttons disabled without a selection, shortcuts in tooltips and labels. `[`/`]` move one step in z-order and `Home`/`End` go to the extremes (previously jumped straight); with a drawing tool active, `[`/`]` adjust its size instead. Dead z-order branch in keydown removed.
- Undo/redo buttons in the top bar: always visible, disabled when the stack is empty (`History` exposes `canUndo`/`canRedo` and an `onChange` notifier); tooltips with shortcuts in 15 languages; keyboard and buttons share one `undoAction`/`redoAction` path.
- New shortcuts: `Ctrl+A` select all (visible unlocked layers, groups expanded), `+`/`-` keyboard zoom, `Ctrl+S` save now (bypasses the autosave debounce), `Ctrl+PageUp/PageDown` switch pages (reuses the panel's `selectPage`). Help updated (es/en), including the previously undocumented `Shift+0` fit-to-selection.
- Zoom popup presets (Fit / 50% / 100% / 200%); fixed the popup being covered by the canvas (missing z-index).
- Alt+click a layer's eye isolates it (`soloLayer`, one history step; Alt+click again restores all). Eye tooltip mentions it (15 languages).
- `fitRect` in `view.ts` frames any world rect; `fitAll` and the Shift+0 selection zoom now share it.
- Cursor coordinates (world units) shown in the status bar; cleared on pointer leave. `statusText` takes an optional cursor.

Verification: clean `tsc --noEmit`, 312 unit tests, 76 Playwright e2e.

## Pending

- Technical debt:
  - Dirty-rects/offscreen for thousands of objects (full redraw with rAF, `ponytail:` in `render.ts`).
  - Downloadable web fonts (system fonts only for now).
  - Boolean union via convex hull (enough for convex shapes; exact union with holes requires path clipping).
