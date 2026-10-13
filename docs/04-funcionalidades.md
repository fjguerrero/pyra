# Pyra — complete Fireworks feature inventory

Source: **official Adobe Fireworks CS6 reference manual** (full PDF, extracted
and analyzed — complete TOC) + Fireworks 2/MX/MX 2004 manuals for what CS6 takes
for granted. This is the complete map; at the end, what Pyra adopts and in which phase.

## 1. Documents and files
- Fireworks `.png` documents (editable source embedded in the PNG).
- Create documents from HTML files (CS6).
- Open/import: PSD (preserving Photoshop layers and effects as editable), AI, Flash,
  GIF, JPEG, TIFF, SVG (extension), FXG. Export: PNG/GIF/JPEG/TIFF/SWF/PDF/BMP/WBMP.
- Export Wizard, Image Preview, export by email, mobile emulators.
- Batch-processing, custom commands, scripting (JS), find & replace.

## 2. Workspace
- Canvas: resize, Fit/Trim canvas, background color, gray work area
  (what falls outside the canvas is not exported).
- Navigation: zoom, pan, screen modes (standard / full with menus / full).
- Original / 2-Up / 4-Up preview with optimization settings.
- Undo and "repeat multiple actions" (repeat an action N times).
- Smart guides, manual guides, grid + snap, rulers, info panel.

## 3. Selection and transformation
- Object and pixel selection (bitmap selection tools: lasso, magic
  wand, marquee; Subselection of path points).
- Transform: scale, skew, distort, rotate, free transform.
- Group/ungroup, stacking order (bring/send), align and distribute, lock,
  hide, duplicate/clone, paste inside (clipping when pasting inside a path).
- Modify selection: expand, contract, smooth, transform pixel selection.

## 4. Bitmap
- Tools: paintbrush, eraser, pencil, spray can, airbrush, smudge, blur,
  sharpen, dodge, burn, sponge, replace color, red-eye removal, rubber stamp,
  pen (editing selections), crop, feather.
- Add noise; adjust color and tone (levels, brightness/contrast, hue/saturation,
  color balance, fill color, web snap); blur/sharpen.
- Bitmap masks; image modes.

## 5. Vector
- Auto Shapes (shape library: arrows, stars, callouts, notes).
- Basic shapes (rect, ellipse, line, polygon), compound shapes, free-form
  (pen tool, vector pencil, reshape tools: freeform reshape, reshape area,
  path scrubber add/subtract).
- Path operations: unite, intersect, punch out, simplify, exclude, add path,
  subtract path.
- Subselection editing: move/add/delete/bisect points, convert
  corner/smooth point, open/close path, expand stroke to path.
- Strokes and fills: solids, gradients, pattern fills,
  strokes with varied styles; textures.
- 9-slice scaling (keep corners when scaling symbols).

## 6. Text
- Text tool on-canvas + Text Editor; paragraphs (indent, space above/below, leading
  in px or %), reusable character and paragraph styles (Style panel), kerning
  manual/auto, skew, horizontal scale, antialiasing.
- Text always editable, even with Live Effects applied.
- Warp text along a path; text inside a path.

## 7. Color
- Color Mixer (solids and gradients), Swatches (library with libraries),
  eyedropper, web-safe snap, reusable color styles.

## 8. Live Filters (Live Effects)
- Non-destructive on **vectors, bitmaps, and text**; they update when the
  object changes (make the rectangle circular, the bevel adapts).
- Bevels and embossing, drop shadow, inner shadow, glow (inner/outer),
  drop/bevel glow, color correction, blur/sharpen, Gaussian blur,
  Photoshop Live Effects (CS3+ compatibility).
- Stackable in sequence per object.

## 9. Layers, masks, and blending
- Layers: show/hide, lock, rename, duplicate, reorder (auto-scroll),
  opacity and blending per layer; layers larger than the canvas.
- Masking: vector mask over bitmap or object (mask group).
- Full blending modes (multiply, screen, overlay…).

## 10. Styles, symbols, URLs
- Styles: reusable packages of fill+stroke+effects+text applicable to any
  object (the "visual component" of FW).
- Symbols: library (Assets panel), instances, editing the master propagates;
  button symbols with states.
- URLs per object/slice/hotspot.

## 11. Slices, hotspots, rollovers (web export)
- Slices (object and user-defined), hotspots/image maps, rollovers (swap image,
  swap overlay), pop-up menus, buttons with states, HTML+CSS export.

## 12. Pages and prototyping
- Multiple pages per document; navigable prototypes between pages; slide shows.
- Flex/AIR prototypes (CS4-CS6).

## 13. Animation
- States per page/frame; tweening; onion skinning; animation symbols;
  animated GIF export.

## 14. Optimization
- Optimize panel: format, palette, quality, transparency per document and per slice;
  multi-file export from the workspace.

---

## What Pyra adopts (mapping to phases)

| FW area | Pyra | Phase |
|---|---|---|
| Editable PNG document | `.f.png` | M6 (from M0 it saves to IndexedDB) |
| Canvas, zoom/pan, undo | core | M0 |
| Layers, blending, opacity, masking | full | M1 |
| Smart guides, snap, align/distribute, transform, group, stacking | full | M1 |
| Object selection | full (pixel selection in M3) | M0/M1 |
| Auto shapes, shapes, pen, path ops, subselection, strokes/fills/gradients | full | M2 |
| Bitmap: import, cropping, filters, retouch, color/tone adjustment | the essentials | M3 |
| Text: paragraph, styles, kerning/leading, text on path | full without path-text in M4 | M4 |
| Live Filters (shadows, glow, bevel, blur, color correction) | full | M5 |
| Styles (reusable packages) | yes — it's the key idea of FW | M5 |
| Symbols + library | yes | M6 |
| Pages | yes | M1 |
| States/animation/onion skin | not for now | — |
| Slices/hotspots/rollovers/HTML export | no (dropped) | — |
| Optimize panel | simple export by selection | M6 |
| Batch/scripting/commands | not for now | — |
| Dreamweaver/Flash/PSD integration | import PNG/JPEG; PSD later | — |
