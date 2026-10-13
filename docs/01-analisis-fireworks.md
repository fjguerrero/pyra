# Analysis: Macromedia / Adobe Fireworks

## What it was

Fireworks (1998, Macromedia; acquired by Adobe in 2005; discontinued in May 2013,
CS6 was the last version). A **hybrid bitmap + vector** editor aimed at a single task:
producing the graphics from which a user interface is assembled. It wasn't "another
Photoshop" or "another Illustrator": it was the tool with which Gmail, Google Maps, and
Google Docs were designed in the 2000s.

## Mental model (what made it unique)

1. **A single hybrid canvas.** Pixels and paths in the same document, without switching
   application or mode. You selected a photo and a vector shape with the same
   selection tool.
2. **The document WAS a PNG.** The native format was `.png` with the editable source
   embedded in the PNG's own metadata. Each file was its own preview:
   any browser or viewer displayed the image; Fireworks reopened it as editable.
3. **First-class layers.** A simple, fast layers panel: visibility, locking,
   opacity, blending, renaming, reordering. Layers could extend beyond the canvas.
   Layout (placing, aligning, grouping) was direct, without friction.
4. **Pages and states.** A document with multiple pages (screens) navigable
   instantly, plus "states" per page for GIF animations/prototypes.
5. **Symbols.** Reusable instances with a library; editing the master propagated
   the change to all instances. Fifteen years before Figma's components.
6. **Live effects.** Shadows, glows, bevels, emboss... applied as editable
   object attributes — on vectors AND on text — never flattening anything.
7. **Property Inspector.** A contextual properties panel (inherited from
   Dreamweaver) that showed exactly what was editable about the selected object.
8. **Slices and hotspots.** Cropping regions of the canvas with per-slice compression
   and exporting optimized HTML/images. The "design → export assets" workflow was
   built in.
9. **Smart guides and snapping.** Magnetic guides to object edges/centers, snapping
   to guides and to other objects. Placing things well was easy, with no effort.
10. **Shared tools.** The same selection, transformation, and editing worked
    for bitmap and vector. Auto-shapes, a simple pen tool, text with typographic control.

## The original UI

- Toolbar on the left (shared bitmap/vector tools).
- Property Inspector at the top (contextual, the app's most distinctive feature).
- Pages panel and Frames/States panel on the right; Layers and Symbols below.
- Floating panels or dockable in groups.
- Aggressive keyboard shortcuts; a fast, direct workflow, without dialogs.

## What people miss (gathered from HN/forum communities + consensus)

- **The hybrid canvas**: nothing later combined bitmap and vector with that naturalness
  (Affinity Designer is the closest; Figma is vector-only).
- **PNG as the editable source**: the self-previewing file has never been matched.
- **Non-destructive live effects on everything**, including text.
- **How easy layout was**: simple layers, smart guides, snapping, multi-screen
  pages. "Fireworks could have been Figma."
- **Symbols ahead of their time.**
- **Lightness and speed**: native app, launched instantly, no platform around it.
- **Property Inspector**: the object's properties at hand, always, without digging
  through menus.

## What it was NOT (so as not to clone its mistakes)

- It was not for print or photography (CMYK, poor color management).
- A 1998 UI: dense floating panels, no HiDPI (it literally died from the retina
  display), no collaboration, no responsive components.
- Poor performance with large documents in the last versions.
