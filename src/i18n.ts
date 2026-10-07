// i18n mínimo: diccionario por idioma, detección por navegador, override en localStorage ('pyra:lang').
// Sin dependencias ni frameworks: t(key) y statusText(). Fallback a inglés.
export type Lang = 'en' | 'es' | 'zh' | 'hi' | 'ar' | 'pt' | 'ru' | 'ja' | 'fr' | 'de' | 'ko' | 'it' | 'tr' | 'vi' | 'nl';

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ar', label: 'العربية' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'ja', label: '日本語' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ko', label: '한국어' },
  { code: 'it', label: 'Italiano' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'nl', label: 'Nederlands' },
];

type Msg = {
  tool_select: string; tool_rect: string; tool_ellipse: string; tool_line: string; tool_text: string;
  import_image: string; export_fpng: string; export_png: string; fit_zoom: string; change_lang: string;
  panel_layers: string; panel_pages: string; panel_inspector: string; panel_align: string;
  layer_opacity: string; show_layer: string; hide_layer: string; unlock_layer: string; lock_layer: string;
  rename_hint: string; layer_name: string; move_up: string; move_down: string; delete_layer: string; new_layer: string; create_layer: string;
  delete_page: string; new_page: string; create_page: string; page: string; layer: string;
  page_width: string; page_height: string; width: string; height: string;
  saturation: string; brightness: string; crop_x: string; crop_y: string; crop_w: string; crop_h: string; remove_crop: string; show_full_image: string;
  text: string; size: string; font: string; bold: string; italic: string; color: string; stroke_color: string; fill: string; rotation: string;
  remove_gradient: string; add_gradient: string; gradient_hint: string; gradient_from: string; gradient_to: string; angle: string;
  live_effects: string; blur: string; remove_shadow: string; add_shadow: string; shadow_hint: string;
  shadow_x: string; shadow_y: string; shadow_blur: string; shadow_color: string;
  remove_glow: string; add_glow: string; glow_hint: string; glow_blur: string; glow_color: string;
  styles: string; save_style: string; save_style_hint: string; delete_style: string;
  align_left: string; align_hcenter: string; align_right: string; align_top: string; align_vcenter: string; align_bottom: string;
  dist_h: string; dist_v: string; align_hint_multi: string; align_hint_single: string;
  order_front: string; order_up: string; order_down: string; order_back: string;
  status_selection: string; status_objects: string;
  obj_rect: string; obj_ellipse: string; obj_line: string; obj_text: string; default_layer: string; default_page: string;
  settings: string; theme: string; theme_system: string; theme_light: string; theme_dark: string;
  language: string; zoom: string; bg: string; bg_grid: string; bg_none: string;
  alpha: string; recent_colors: string; custom_colors: string; add_color: string; remove_color: string;
  export_menu: string; export_jpeg: string; export_webp: string; export_quality: string;
  tool_brush: string; tool_eraser: string; export_asset: string; obj_stroke: string; brush_size: string; brush_pressure: string; brush_opacity: string;
  bevel: string; tool_pen: string; tool_pencil: string; pencil_continuous: string; pencil_smooth: string; pen_curved: string; pen_straight: string; pencil_polygon: string; poly_freehand: string; poly_straight: string; stroke_width: string; stroke_style: string; stroke_solid: string; stroke_dashed: string; no_fill: string; obj_polygon: string; union: string; union_hint: string;
  help: string; help_html: string;
  brush_round: string; brush_square: string; brush_tip: string; brush_tip_none: string;
};

const en: Msg = {
  order_front: 'Bring to front', order_up: 'Bring forward', order_down: 'Send backward', order_back: 'Send to back',
  tool_pencil: 'Pencil (N)', pencil_continuous: 'Continuous', pencil_smooth: 'Smoothed', pen_curved: 'Curved', pen_straight: 'Straight', pencil_polygon: 'Polygon pencil', poly_freehand: 'Freehand', poly_straight: 'Straight lines', stroke_width: 'Stroke width', stroke_style: 'Stroke style', stroke_solid: 'Solid', stroke_dashed: 'Dashed', no_fill: 'No fill',
  tool_select: 'Selection (V)', tool_rect: 'Rectangle (R)', tool_ellipse: 'Ellipse (E)', tool_line: 'Line (L)', tool_text: 'Text (T)',
  import_image: 'Import image', export_fpng: 'Export .f.png', export_png: 'Export flat PNG', fit_zoom: 'Fit zoom (0)', change_lang: 'Change language',
  panel_layers: 'Layers', panel_pages: 'Pages', panel_inspector: 'Properties', panel_align: 'Align',
  layer_opacity: 'Layer opacity', show_layer: 'Show layer', hide_layer: 'Hide layer', unlock_layer: 'Unlock layer', lock_layer: 'Lock layer',
  rename_hint: 'Double-click to rename', layer_name: 'Layer name', move_up: 'Move layer up', move_down: 'Move layer down', delete_layer: 'Delete layer', new_layer: '+ New layer', create_layer: 'Create layer',
  delete_page: 'Delete page', new_page: '+ New page', create_page: 'Create page', page: 'Page', layer: 'Layer',
  page_width: 'Page width', page_height: 'Page height', width: 'Width', height: 'Height',
  saturation: 'Saturation', brightness: 'Brightness', crop_x: 'Crop X', crop_y: 'Crop Y', crop_w: 'Crop width', crop_h: 'Crop height', remove_crop: 'Remove crop', show_full_image: 'Show the full image',
  text: 'Text', size: 'Size', font: 'Font', bold: 'Bold', italic: 'Italic', color: 'Color', stroke_color: 'Stroke color', fill: 'Fill', rotation: 'Rotation',
  remove_gradient: 'Remove gradient', add_gradient: 'Add gradient', gradient_hint: 'Linear gradient fill', gradient_from: 'Gradient from', gradient_to: 'Gradient to', angle: 'Angle',
  live_effects: 'Live effects', blur: 'Blur', remove_shadow: 'Remove shadow', add_shadow: 'Add shadow', shadow_hint: 'Live drop shadow',
  shadow_x: 'Shadow X', shadow_y: 'Shadow Y', shadow_blur: 'Shadow blur', shadow_color: 'Shadow color',
  remove_glow: 'Remove glow', add_glow: 'Add glow', glow_hint: 'Live glow', glow_blur: 'Glow blur', glow_color: 'Glow color',
  styles: 'Styles', save_style: 'Save style', save_style_hint: 'Save this object\u2019s look as a reusable style', delete_style: 'Delete style',
  align_left: 'Align left', align_hcenter: 'Center horizontally', align_right: 'Align right', align_top: 'Align top', align_vcenter: 'Center vertically', align_bottom: 'Align bottom',
  dist_h: 'Distribute horizontally', dist_v: 'Distribute vertically', align_hint_multi: 'Distribute spreads the gaps evenly', align_hint_single: 'With 1 object aligns to the page; with 2+, to the group',
  status_selection: 'selection', status_objects: 'objects',
  obj_rect: 'Rectangle', obj_ellipse: 'Ellipse', obj_line: 'Line', obj_text: 'Text', default_layer: 'Layer 1', default_page: 'Page',
  settings: 'Settings', theme: 'Theme', theme_system: 'System', theme_light: 'Light', theme_dark: 'Dark',
  language: 'Language', zoom: 'Zoom', bg: 'Background', bg_grid: 'Grid', bg_none: 'Solid',
  alpha: 'Alpha', recent_colors: 'Recent colors', custom_colors: 'Custom colors', add_color: 'Add current color to custom palette', remove_color: 'Remove color',
  export_menu: 'Export', export_jpeg: 'Export JPEG', export_webp: 'Export WebP', export_quality: 'Quality (JPEG/WebP)',
    tool_brush: 'Paint brush (B)', tool_eraser: 'Eraser (X)', export_asset: 'Export selection as PNG', obj_stroke: 'Brush stroke',
  bevel: 'Bevel', tool_pen: 'Pen (P)', obj_polygon: 'Polygon', union: 'Union', union_hint: 'Merge selected shapes into one', brush_size: 'Size', brush_pressure: 'Pressure', brush_opacity: 'Opacity',
  help: 'Help', help_html: `<h4>Tools</h4><p><code>V</code> select · <code>R</code> rectangle · <code>E</code> ellipse · <code>L</code> line · <code>P</code> pen (click vertices, Shift toggles curved/straight, click first point or Enter to close) · <code>N</code> pencil (freehand stroke: continuous or smoothed) · <code>G</code> poly-pen (draw polygons freehand: straight or stylized, separate stroke and fill) · <code>B</code> paint brush (size/pressure/opacity, custom SVG/bitmap tips) · <code>T</code> text · <code>X</code> eraser (bitmap).</p>
<h4>Selection & editing</h4><p>Click or marquee-drag to select; Shift adds. Move/resize with handles; Shift while dragging locks to one axis; Ctrl disables snapping. Arrow keys nudge (Shift=10px). <code>Ctrl+D</code> duplicate, <code>Ctrl+C/V</code> copy-paste, <code>Ctrl+G</code>/<code>Ctrl+Shift+G</code> group/ungroup, <code>[</code>/<code>]</code> z-order, <code>Ctrl+U</code> union of shapes, <code>Delete</code> delete. <code>Ctrl+Z</code>/<code>Ctrl+Shift+Z</code> undo/redo everything.</p>
<h4>Smart guides & snapping</h4><p>Guides appear only against real references (other objects, page rules, manual guides). Snaps to them; hold <code>Ctrl</code> while dragging to move freely. Right-click the canvas creates a manual guide; right-click on it deletes it; drag it to move.</p>
<h4>Layers & pages</h4><p>Layers panel: visibility, lock, opacity, drag to reorder/nest, z-order buttons. Pages panel: multiple pages per document. Panels are collapsible and reorderable.</p>
<h4>Fills, styles & effects</h4><p>Solid color with alpha, linear gradients, reusable Styles (save from an object, apply to another), live effects: shadow, glow, blur, bevel. Polygon objects keep stroke and fill independent (color, width, dashed, no-fill).</p>
<h4>Text</h4><p>Double-click to edit; system font picker; bold/italic; bbox re-measured.</p>
<h4>Files</h4><p>Import images (PNG/JPEG/WebP/GIF/SVG). <code>.f.png</code> export/import keeps the full editable document. Export flat PNG, JPEG, WebP (quality configurable) or one PNG per selected object. Autosaves to your browser (IndexedDB).</p>
<h4>View & settings</h4><p>Scroll to zoom, middle-drag or Space to pan, <code>0</code> fit page. Settings (bottom-left): language (15), theme (light/dark/system), workspace background color and grid.</p>`,
  brush_round: 'Round tip', brush_square: 'Square tip', brush_tip: 'Custom tip (SVG or image)', brush_tip_none: 'Remove custom tip',
};

const es: Partial<Msg> = {
  ...en,
  order_front: 'Traer al frente', order_up: 'Traer adelante', order_down: 'Enviar atrás', order_back: 'Enviar al fondo',
  tool_pencil: 'Lápiz (N)', pencil_continuous: 'Continuo', pencil_smooth: 'Suavizado', pen_curved: 'Curvado', pen_straight: 'Recto', pencil_polygon: 'Lápiz de polígonos', poly_freehand: 'A mano alzada', poly_straight: 'Líneas rectas', stroke_width: 'Grosor del trazo', stroke_style: 'Estilo del trazo', stroke_solid: 'Sólido', stroke_dashed: 'Discontinuo', no_fill: 'Sin relleno',
  tool_select: 'Selección (V)', tool_rect: 'Rectángulo (R)', tool_ellipse: 'Elipse (E)', tool_line: 'Línea (L)', tool_text: 'Texto (T)',
  import_image: 'Importar imagen', export_fpng: 'Exportar .f.png', export_png: 'Exportar PNG plano', fit_zoom: 'Zoom ajustar (0)', change_lang: 'Cambiar idioma',
  panel_layers: 'Capas', panel_pages: 'Páginas', panel_inspector: 'Propiedades', panel_align: 'Alinear',
  layer_opacity: 'Opacidad capa', show_layer: 'Mostrar capa', hide_layer: 'Ocultar capa', unlock_layer: 'Desbloquear capa', lock_layer: 'Bloquear capa',
  rename_hint: 'Doble clic para renombrar', layer_name: 'Nombre de la capa', move_up: 'Subir capa', move_down: 'Bajar capa', delete_layer: 'Eliminar capa', new_layer: '＋ Nueva capa', create_layer: 'Crear capa',
  delete_page: 'Eliminar página', new_page: '＋ Nueva página', create_page: 'Crear página', page: 'Página', layer: 'Capa',
  page_width: 'Ancho página', page_height: 'Alto página', width: 'Ancho', height: 'Alto',
  saturation: 'Saturación', brightness: 'Brillo', crop_x: 'Recorte X', crop_y: 'Recorte Y', crop_w: 'Recorte ancho', crop_h: 'Recorte alto', remove_crop: 'Quitar recorte', show_full_image: 'Mostrar la imagen completa',
  text: 'Texto', size: 'Tamaño', font: 'Fuente', bold: 'Negrita', italic: 'Cursiva', color: 'Color', stroke_color: 'Color trazo', fill: 'Relleno', rotation: 'Rotación',
  remove_gradient: 'Quitar degradado', add_gradient: 'Añadir degradado', gradient_hint: 'Relleno con degradado lineal', gradient_from: 'Degradado desde', gradient_to: 'Degradado hasta', angle: 'Ángulo',
  live_effects: 'Efectos en vivo', blur: 'Desenfoque', remove_shadow: 'Quitar sombra', add_shadow: 'Añadir sombra', shadow_hint: 'Sombra paralela en vivo',
  shadow_x: 'Sombra X', shadow_y: 'Sombra Y', shadow_blur: 'Sombra desenfoque', shadow_color: 'Sombra color',
  remove_glow: 'Quitar glow', add_glow: 'Añadir glow', glow_hint: 'Resplandor en vivo', glow_blur: 'Glow desenfoque', glow_color: 'Glow color',
  styles: 'Estilos', save_style: 'Guardar estilo', save_style_hint: 'Guardar el aspecto de este objeto como estilo reutilizable', delete_style: 'Eliminar estilo',
  align_left: 'Alinear a la izquierda', align_hcenter: 'Centrar horizontalmente', align_right: 'Alinear a la derecha', align_top: 'Alinear arriba', align_vcenter: 'Centrar verticalmente', align_bottom: 'Alinear abajo',
  dist_h: 'Distribuir horizontalmente', dist_v: 'Distribuir verticalmente', align_hint_multi: 'Distribuir reparte el hueco por igual', align_hint_single: 'Con 1 objeto se alinea a la página; con 2+, al grupo',
  status_selection: 'selección', status_objects: 'objetos',
  obj_rect: 'Rectángulo', obj_ellipse: 'Elipse', obj_line: 'Línea', obj_text: 'Texto', default_layer: 'Capa 1', default_page: 'Página',
  settings: 'Configuración', theme: 'Tema', theme_system: 'Sistema', theme_light: 'Claro', theme_dark: 'Oscuro',
  language: 'Idioma', zoom: 'Zoom', bg: 'Fondo', bg_grid: 'Cuadrícula', bg_none: 'Sólido',
  alpha: 'Alfa', recent_colors: 'Colores recientes', custom_colors: 'Colores personalizados', add_color: 'Añadir el color actual a la paleta personalizada', remove_color: 'Eliminar color',
  export_menu: 'Exportar', export_jpeg: 'Exportar JPEG', export_webp: 'Exportar WebP', export_quality: 'Calidad (JPEG/WebP)',
  tool_brush: 'Pincel (B)', tool_eraser: 'Goma de borrar (X)', export_asset: 'Exportar selección como PNG', obj_stroke: 'Trazo de pincel', brush_size: 'Tamaño', brush_pressure: 'Presión', brush_opacity: 'Opacidad',
  bevel: 'Bisel', tool_pen: 'Lápiz (P)', obj_polygon: 'Polígono', union: 'Unión', union_hint: 'Unir las formas seleccionadas en una sola',
  help: 'Ayuda', help_html: `<h4>Herramientas</h4><p><code>V</code> seleccionar · <code>R</code> rectángulo · <code>E</code> elipse · <code>L</code> línea · <code>P</code> pluma (clic en vértices, Shift alterna curvo/recto, clic en el primer punto o Enter para cerrar) · <code>N</code> lápiz (trazo libre: continuo o suavizado) · <code>G</code> polilápiz (dibuja polígonos a mano alzada: rectos o estilizados, borde y relleno independientes) · <code>B</code> pincel (tamaño/presión/opacidad, puntas SVG/bitmap) · <code>T</code> texto · <code>X</code> goma (bitmap).</p>
<h4>Selección y edición</h4><p>Clic o arrastre por marco para seleccionar; Shift añade. Mueve y redimensiona con las asas; Shift durante el arrastre bloquea a un eje; Ctrl desactiva el snap. Flechas mueven (Shift=10px). <code>Ctrl+D</code> duplicar, <code>Ctrl+C/V</code> copiar/pegar, <code>Ctrl+G</code>/<code>Ctrl+Shift+G</code> agrupar/desagrupar, <code>[</code>/<code>]</code> orden de apilado, <code>Ctrl+U</code> unión de formas, <code>Supr</code> eliminar. <code>Ctrl+Z</code>/<code>Ctrl+Shift+Z</code> deshacer/rehacer de todo.</p>
<h4>Guías inteligentes y snap</h4><p>Las guías aparecen solo ante referencias reales (otros objetos, reglas de página, guías manuales) y atraen el snap; mantén <code>Ctrl</code> durante el arrastre para moverte libre. Clic derecho en el lienzo crea una guía manual; clic derecho sobre ella la borra; arrástrala para moverla.</p>
<h4>Capas y páginas</h4><p>Panel de capas: visibilidad, bloqueo, opacidad, drag para reordenar/anidar, botones de orden. Panel de páginas: varias páginas por documento. Los paneles se colapsan y reordenan.</p>
<h4>Rellenos, estilos y efectos</h4><p>Color sólido con alfa, degradados lineales, Styles reutilizables (guardar desde un objeto, aplicar a otro), efectos en vivo: sombra, glow, blur, bisel. Los polígonos mantienen borde y relleno independientes (color, grosor, discontinuo, sin relleno).</p>
<h4>Texto</h4><p>Doble clic para editar; selector de fuentes del sistema; negrita/cursiva; el bbox se re-mide.</p>
<h4>Archivos</h4><p>Importa imágenes (PNG/JPEG/WebP/GIF/SVG). Exportar/importar <code>.f.png</code> conserva el documento editable completo. Exporta PNG plano, JPEG, WebP (calidad configurable) o un PNG por objeto seleccionado. Autoguardado en el navegador (IndexedDB).</p>
<h4>Vista y ajustes</h4><p>Rueda para zoom, arrastre con rueda/Space para mover, <code>0</code> ajustar a página. Ajustes (abajo a la izquierda): idioma (15), tema (claro/oscuro/sistema), color de fondo del área de trabajo y cuadrícula.</p>`,
  brush_round: 'Punta redonda', brush_square: 'Punta cuadrada', brush_tip: 'Punta personalizada (SVG o imagen)', brush_tip_none: 'Quitar punta personalizada',
};

const zh: Partial<Msg> = {
  ...en,
  order_front: '置于顶层', order_up: '上移一层', order_down: '下移一层', order_back: '置于底层',
  tool_pencil: '铅笔 (N)', pencil_continuous: '连续', pencil_smooth: '平滑', pen_curved: '曲线', pen_straight: '直线', pencil_polygon: '多边形铅笔', poly_freehand: '手绘', poly_straight: '直线', stroke_width: '描边宽度', stroke_style: '描边样式', stroke_solid: '实线', stroke_dashed: '虚线', no_fill: '无填充',
  tool_select: '选择 (V)', tool_rect: '矩形 (R)', tool_ellipse: '椭圆 (E)', tool_line: '直线 (L)', tool_text: '文本 (T)',
  import_image: '导入图像', export_fpng: '导出 .f.png', export_png: '导出平面 PNG', fit_zoom: '缩放适配 (0)', change_lang: '更改语言',
  panel_layers: '图层', panel_pages: '页面', panel_inspector: '属性', panel_align: '对齐',
  layer_opacity: '图层不透明度', show_layer: '显示图层', hide_layer: '隐藏图层', unlock_layer: '解锁图层', lock_layer: '锁定图层',
  rename_hint: '双击重命名', layer_name: '图层名称', move_up: '上移图层', move_down: '下移图层', delete_layer: '删除图层', new_layer: '＋ 新建图层', create_layer: '创建图层',
  delete_page: '删除页面', new_page: '＋ 新建页面', create_page: '创建页面', page: '页面', layer: '图层',
  page_width: '页面宽度', page_height: '页面高度', width: '宽度', height: '高度',
  saturation: '饱和度', brightness: '亮度', crop_x: '裁剪 X', crop_y: '裁剪 Y', crop_w: '裁剪宽度', crop_h: '裁剪高度', remove_crop: '移除裁剪', show_full_image: '显示完整图像',
  text: '文本', size: '字号', font: '字体', bold: '粗体', italic: '斜体', color: '颜色', stroke_color: '描边颜色', fill: '填充', rotation: '旋转',
  remove_gradient: '移除渐变', add_gradient: '添加渐变', gradient_hint: '线性渐变填充', gradient_from: '渐变起始', gradient_to: '渐变结束', angle: '角度',
  live_effects: '实时效果', blur: '模糊', remove_shadow: '移除阴影', add_shadow: '添加阴影', shadow_hint: '实时投影',
  shadow_x: '阴影 X', shadow_y: '阴影 Y', shadow_blur: '阴影模糊', shadow_color: '阴影颜色',
  remove_glow: '移除光晕', add_glow: '添加光晕', glow_hint: '实时光晕', glow_blur: '光晕模糊', glow_color: '光晕颜色',
  styles: '样式', save_style: '保存样式', save_style_hint: '将此对象的外观保存为可复用样式', delete_style: '删除样式',
  align_left: '左对齐', align_hcenter: '水平居中', align_right: '右对齐', align_top: '顶部对齐', align_vcenter: '垂直居中', align_bottom: '底部对齐',
  dist_h: '水平分布', dist_v: '垂直分布', align_hint_multi: '分布会平均分配间距', align_hint_single: '1 个对象时对齐页面；2 个以上时对齐所选组',
  status_selection: '选中', status_objects: '个对象',
  settings: '设置', theme: '主题', theme_system: '跟随系统', theme_light: '浅色', theme_dark: '深色',
};

const hi: Partial<Msg> = {
  ...en,
  order_front: 'सामने लाएँ', order_up: 'आगे लाएँ', order_down: 'पीछे भेजें', order_back: 'पीछे भेजें',
  tool_pencil: 'पेंसिल (N)', pencil_continuous: 'निरंतर', pencil_smooth: 'कोमल', pen_curved: 'वक्र', pen_straight: 'सीधा', pencil_polygon: 'बहुभुज पेंसिल', poly_freehand: 'हस्तचित्र', poly_straight: 'सीधी रेखाएँ', stroke_width: 'स्ट्रोक चौड़ाई', stroke_style: 'स्ट्रोक शैली', stroke_solid: 'ठोस', stroke_dashed: 'डैश', no_fill: 'कोई भराव नहीं',
  tool_select: 'चयन (V)', tool_rect: 'आयत (R)', tool_ellipse: 'अंडाकार (E)', tool_line: 'रेखा (L)', tool_text: 'पाठ (T)',
  import_image: 'छवि आयात करें', export_fpng: '.f.png निर्यात करें', export_png: 'सपाट PNG निर्यात करें', fit_zoom: 'ज़ूम फ़िट (0)', change_lang: 'भाषा बदलें',
  panel_layers: 'लेयर', panel_pages: 'पृष्ठ', panel_inspector: 'गुण', panel_align: 'संरेखित करें',
  layer_opacity: 'लेयर अपारदर्शिता', show_layer: 'लेयर दिखाएँ', hide_layer: 'लेयर छिपाएँ', unlock_layer: 'लेयर अनलॉक करें', lock_layer: 'लेयर लॉक करें',
  rename_hint: 'नाम बदलने के लिए डबल-क्लिक', layer_name: 'लेयर का नाम', move_up: 'लेयर ऊपर ले जाएँ', move_down: 'लेयर नीचे ले जाएँ', delete_layer: 'लेयर हटाएँ', new_layer: '＋ नई लेयर', create_layer: 'लेयर बनाएँ',
  delete_page: 'पृष्ठ हटाएँ', new_page: '＋ नया पृष्ठ', create_page: 'पृष्ठ बनाएँ', page: 'पृष्ठ', layer: 'लेयर',
  page_width: 'पृष्ठ की चौड़ाई', page_height: 'पृष्ठ की ऊँचाई', width: 'चौड़ाई', height: 'ऊँचाई',
  saturation: 'संतृप्ति', brightness: 'चमक', crop_x: 'क्रॉप X', crop_y: 'क्रॉप Y', crop_w: 'क्रॉप चौड़ाई', crop_h: 'क्रॉप ऊँचाई', remove_crop: 'क्रॉप हटाएँ', show_full_image: 'पूरी छवि दिखाएँ',
  text: 'पाठ', size: 'आकार', font: 'फ़ॉन्ट', bold: 'बोल्ड', italic: 'इटैलिक', color: 'रंग', stroke_color: 'स्ट्रोक रंग', fill: 'फ़िल', rotation: 'घूर्णन',
  remove_gradient: 'ग्रेडिएंट हटाएँ', add_gradient: 'ग्रेडिएंट जोड़ें', gradient_hint: 'रेखीय ग्रेडिएंट फ़िल', gradient_from: 'ग्रेडिएंट से', gradient_to: 'ग्रेडिएंट तक', angle: 'कोण',
  live_effects: 'लाइव प्रभाव', blur: 'धुंधलापन', remove_shadow: 'छाया हटाएँ', add_shadow: 'छाया जोड़ें', shadow_hint: 'लाइव ड्रॉप छाया',
  shadow_x: 'छाया X', shadow_y: 'छाया Y', shadow_blur: 'छाया धुंधलापन', shadow_color: 'छाया रंग',
  remove_glow: 'ग्लो हटाएँ', add_glow: 'ग्लो जोड़ें', glow_hint: 'लाइव ग्लो', glow_blur: 'ग्लो धुंधलापन', glow_color: 'ग्लो रंग',
  styles: 'स्टाइल', save_style: 'स्टाइल सहेजें', save_style_hint: 'इस ऑब्जेक्ट का रूप दोबारा उपयोग योग्य स्टाइल के रूप में सहेजें', delete_style: 'स्टाइल हटाएँ',
  align_left: 'बाएँ संरेखित करें', align_hcenter: 'क्षैतिज केंद्रित करें', align_right: 'दाएँ संरेखित करें', align_top: 'ऊपर संरेखित करें', align_vcenter: 'ऊर्ध्वाधर केंद्रित करें', align_bottom: 'नीचे संरेखित करें',
  dist_h: 'क्षैतिज वितरित करें', dist_v: 'ऊर्ध्वाधर वितरित करें', align_hint_multi: 'वितरण अंतराल समान बाँटता है', align_hint_single: '1 ऑब्जेक्ट पर पृष्ठ के साथ; 2+ पर समूह के साथ',
  status_selection: 'चयन', status_objects: 'ऑब्जेक्ट',
  settings: 'सेटिंग्स', theme: 'थीम', theme_system: 'सिस्टम', theme_light: 'हल्का', theme_dark: 'गहरा',
};

const ar: Partial<Msg> = {
  ...en,
  order_front: 'إحضار إلى المقدمة', order_up: 'إحضار للأمام', order_down: 'إرسال للخلف', order_back: 'إرسال إلى المؤخرة',
  tool_pencil: 'رصاص (N)', pencil_continuous: 'متصل', pencil_smooth: 'ناعم', pen_curved: 'منحني', pen_straight: 'مستقيم', pencil_polygon: 'رصاص المضلعات', poly_freehand: 'حر', poly_straight: 'خطوط مستقيمة', stroke_width: 'سماكة الخط', stroke_style: 'نمط الخط', stroke_solid: 'متصل', stroke_dashed: 'متقطع', no_fill: 'بدون تعبئة',
  tool_select: 'تحديد (V)', tool_rect: 'مستطيل (R)', tool_ellipse: 'قطع ناقص (E)', tool_line: 'خط (L)', tool_text: 'نص (T)',
  import_image: 'استيراد صورة', export_fpng: 'تصدير ‎.f.png', export_png: 'تصدير PNG مسطحة', fit_zoom: 'تكييف التكبير (0)', change_lang: 'تغيير اللغة',
  panel_layers: 'الطبقات', panel_pages: 'الصفحات', panel_inspector: 'الخصائص', panel_align: 'محاذاة',
  layer_opacity: 'عتمة الطبقة', show_layer: 'إظهار الطبقة', hide_layer: 'إخفاء الطبقة', unlock_layer: 'إلغاء قفل الطبقة', lock_layer: 'قفل الطبقة',
  rename_hint: 'نقر مزدوج لإعادة التسمية', layer_name: 'اسم الطبقة', move_up: 'تحريك الطبقة لأعلى', move_down: 'تحريك الطبقة لأسفل', delete_layer: 'حذف الطبقة', new_layer: '＋ طبقة جديدة', create_layer: 'إنشاء طبقة',
  delete_page: 'حذف الصفحة', new_page: '＋ صفحة جديدة', create_page: 'إنشاء صفحة', page: 'صفحة', layer: 'طبقة',
  page_width: 'عرض الصفحة', page_height: 'ارتفاع الصفحة', width: 'العرض', height: 'الارتفاع',
  saturation: 'التشبع', brightness: 'السطوع', crop_x: 'اقتصاص X', crop_y: 'اقتصاص Y', crop_w: 'عرض الاقتصاص', crop_h: 'ارتفاع الاقتصاص', remove_crop: 'إزالة الاقتصاص', show_full_image: 'إظهار الصورة كاملة',
  text: 'نص', size: 'الحجم', font: 'الخط', bold: 'عريض', italic: 'مائل', color: 'اللون', stroke_color: 'لون الحد', fill: 'التعبئة', rotation: 'التدوير',
  remove_gradient: 'إزالة التدرج', add_gradient: 'إضافة تدرج', gradient_hint: 'تعبئة بتدرج خطي', gradient_from: 'بداية التدرج', gradient_to: 'نهاية التدرج', angle: 'الزاوية',
  live_effects: 'تأثيرات مباشرة', blur: 'طمس', remove_shadow: 'إزالة الظل', add_shadow: 'إضافة ظل', shadow_hint: 'ظل مباشر',
  shadow_x: 'ظل X', shadow_y: 'ظل Y', shadow_blur: 'طمس الظل', shadow_color: 'لون الظل',
  remove_glow: 'إزالة التوهج', add_glow: 'إضافة توهج', glow_hint: 'توهج مباشر', glow_blur: 'طمس التوهج', glow_color: 'لون التوهج',
  styles: 'الأنماط', save_style: 'حفظ النمط', save_style_hint: 'حفظ مظهر هذا الكائن كنمط قابل لإعادة الاستخدام', delete_style: 'حذف النمط',
  align_left: 'محاذاة لليسار', align_hcenter: 'توسيط أفقي', align_right: 'محاذاة لليمين', align_top: 'محاذاة للأعلى', align_vcenter: 'توسيط عمودي', align_bottom: 'محاذاة للأسفل',
  dist_h: 'توزيع أفقي', dist_v: 'توزيع عمودي', align_hint_multi: 'التوزيع يوزع المسافات بالتساوي', align_hint_single: 'مع كائن واحد يحاذي الصفحة؛ مع كائنين أو أكثر يحاذي المجموعة',
  status_selection: 'تحديد', status_objects: 'كائنات',
  settings: 'الإعدادات', theme: 'السمة', theme_system: 'النظام', theme_light: 'فاتح', theme_dark: 'داكن',
};

const pt: Partial<Msg> = {
  ...en,
  order_front: 'Trazer para a frente', order_up: 'Trazer para frente', order_down: 'Enviar para trás', order_back: 'Enviar para o fundo',
  tool_pencil: 'Lápis (N)', pencil_continuous: 'Contínuo', pencil_smooth: 'Suavizado', pen_curved: 'Curvado', pen_straight: 'Reto', pencil_polygon: 'Lápis de polígonos', poly_freehand: 'À mão livre', poly_straight: 'Linhas retas', stroke_width: 'Espessura do traço', stroke_style: 'Estilo do traço', stroke_solid: 'Sólido', stroke_dashed: 'Tracejado', no_fill: 'Sem preenchimento',
  tool_select: 'Seleção (V)', tool_rect: 'Retângulo (R)', tool_ellipse: 'Elipse (E)', tool_line: 'Linha (L)', tool_text: 'Texto (T)',
  import_image: 'Importar imagem', export_fpng: 'Exportar .f.png', export_png: 'Exportar PNG plano', fit_zoom: 'Ajustar zoom (0)', change_lang: 'Mudar idioma',
  panel_layers: 'Camadas', panel_pages: 'Páginas', panel_inspector: 'Propriedades', panel_align: 'Alinhar',
  layer_opacity: 'Opacidade da camada', show_layer: 'Mostrar camada', hide_layer: 'Ocultar camada', unlock_layer: 'Desbloquear camada', lock_layer: 'Bloquear camada',
  rename_hint: 'Clique duplo para renomear', layer_name: 'Nome da camada', move_up: 'Mover camada para cima', move_down: 'Mover camada para baixo', delete_layer: 'Excluir camada', new_layer: '＋ Nova camada', create_layer: 'Criar camada',
  delete_page: 'Excluir página', new_page: '＋ Nova página', create_page: 'Criar página', page: 'Página', layer: 'Camada',
  page_width: 'Largura da página', page_height: 'Altura da página', width: 'Largura', height: 'Altura',
  saturation: 'Saturação', brightness: 'Brilho', crop_x: 'Recorte X', crop_y: 'Recorte Y', crop_w: 'Recorte largura', crop_h: 'Recorte altura', remove_crop: 'Remover recorte', show_full_image: 'Mostrar a imagem completa',
  text: 'Texto', size: 'Tamanho', font: 'Fonte', bold: 'Negrito', italic: 'Itálico', color: 'Cor', stroke_color: 'Cor do traço', fill: 'Preenchimento', rotation: 'Rotação',
  remove_gradient: 'Remover gradiente', add_gradient: 'Adicionar gradiente', gradient_hint: 'Preenchimento com gradiente linear', gradient_from: 'Gradiente de', gradient_to: 'Gradiente até', angle: 'Ângulo',
  live_effects: 'Efeitos ao vivo', blur: 'Desfoque', remove_shadow: 'Remover sombra', add_shadow: 'Adicionar sombra', shadow_hint: 'Sombra projetada ao vivo',
  shadow_x: 'Sombra X', shadow_y: 'Sombra Y', shadow_blur: 'Desfoque da sombra', shadow_color: 'Cor da sombra',
  remove_glow: 'Remover brilho', add_glow: 'Adicionar brilho', glow_hint: 'Brilho ao vivo', glow_blur: 'Desfoque do brilho', glow_color: 'Cor do brilho',
  styles: 'Estilos', save_style: 'Salvar estilo', save_style_hint: 'Salvar a aparência deste objeto como um estilo reutilizável', delete_style: 'Excluir estilo',
  align_left: 'Alinhar à esquerda', align_hcenter: 'Centralizar horizontalmente', align_right: 'Alinhar à direita', align_top: 'Alinhar ao topo', align_vcenter: 'Centralizar verticalmente', align_bottom: 'Alinhar à base',
  dist_h: 'Distribuir horizontalmente', dist_v: 'Distribuir verticalmente', align_hint_multi: 'Distribuir divide os espaços por igual', align_hint_single: 'Com 1 objeto alinha à página; com 2+, ao grupo',
  status_selection: 'seleção', status_objects: 'objetos',
  settings: 'Configurações', theme: 'Tema', theme_system: 'Sistema', theme_light: 'Claro', theme_dark: 'Escuro',
};

const ru: Partial<Msg> = {
  ...en,
  order_front: 'На передний план', order_up: 'Назад на один слой', order_down: 'Вперёд на один слой', order_back: 'На задний план',
  tool_pencil: 'Карандаш (N)', pencil_continuous: 'Непрерывный', pencil_smooth: 'Сглаженный', pen_curved: 'Изогнутый', pen_straight: 'Прямой', pencil_polygon: 'Карандаш полигонов', poly_freehand: 'От руки', poly_straight: 'Прямые линии', stroke_width: 'Толщина штриха', stroke_style: 'Стиль штриха', stroke_solid: 'Сплошной', stroke_dashed: 'Штриховой', no_fill: 'Без заливки',
  tool_select: 'Выделение (V)', tool_rect: 'Прямоугольник (R)', tool_ellipse: 'Эллипс (E)', tool_line: 'Линия (L)', tool_text: 'Текст (T)',
  import_image: 'Импорт изображения', export_fpng: 'Экспорт .f.png', export_png: 'Экспорт плоского PNG', fit_zoom: 'Вписать масштаб (0)', change_lang: 'Сменить язык',
  panel_layers: 'Слои', panel_pages: 'Страницы', panel_inspector: 'Свойства', panel_align: 'Выравнивание',
  layer_opacity: 'Непрозрачность слоя', show_layer: 'Показать слой', hide_layer: 'Скрыть слой', unlock_layer: 'Разблокировать слой', lock_layer: 'Заблокировать слой',
  rename_hint: 'Двойной клик для переименования', layer_name: 'Имя слоя', move_up: 'Поднять слой выше', move_down: 'Опустить слой ниже', delete_layer: 'Удалить слой', new_layer: '＋ Новый слой', create_layer: 'Создать слой',
  delete_page: 'Удалить страницу', new_page: '＋ Новая страница', create_page: 'Создать страницу', page: 'Страница', layer: 'Слой',
  page_width: 'Ширина страницы', page_height: 'Высота страницы', width: 'Ширина', height: 'Высота',
  saturation: 'Насыщенность', brightness: 'Яркость', crop_x: 'Обрезка X', crop_y: 'Обрезка Y', crop_w: 'Обрезка ширины', crop_h: 'Обрезка высоты', remove_crop: 'Убрать обрезку', show_full_image: 'Показать изображение целиком',
  text: 'Текст', size: 'Размер', font: 'Шрифт', bold: 'Жирный', italic: 'Курсив', color: 'Цвет', stroke_color: 'Цвет обводки', fill: 'Заливка', rotation: 'Поворот',
  remove_gradient: 'Убрать градиент', add_gradient: 'Добавить градиент', gradient_hint: 'Заливка линейным градиентом', gradient_from: 'Градиент от', gradient_to: 'Градиент до', angle: 'Угол',
  live_effects: 'Живые эффекты', blur: 'Размытие', remove_shadow: 'Убрать тень', add_shadow: 'Добавить тень', shadow_hint: 'Живая падающая тень',
  shadow_x: 'Тень X', shadow_y: 'Тень Y', shadow_blur: 'Размытие тени', shadow_color: 'Цвет тени',
  remove_glow: 'Убрать свечение', add_glow: 'Добавить свечение', glow_hint: 'Живое свечение', glow_blur: 'Размытие свечения', glow_color: 'Цвет свечения',
  styles: 'Стили', save_style: 'Сохранить стиль', save_style_hint: 'Сохранить вид этого объекта как переиспользуемый стиль', delete_style: 'Удалить стиль',
  align_left: 'Выровнять по левому краю', align_hcenter: 'Центрировать по горизонтали', align_right: 'Выровнять по правому краю', align_top: 'Выровнять по верхнему краю', align_vcenter: 'Центрировать по вертикали', align_bottom: 'Выровнять по нижнему краю',
  dist_h: 'Распределить по горизонтали', dist_v: 'Распределить по вертикали', align_hint_multi: 'Распределение делит промежутки поровну', align_hint_single: 'С 1 объектом выравнивает по странице; с 2+ — по группе',
  status_selection: 'выделение', status_objects: 'объектов',
  settings: 'Настройки', theme: 'Тема', theme_system: 'Системная', theme_light: 'Светлая', theme_dark: 'Тёмная',
};

const ja: Partial<Msg> = {
  ...en,
  order_front: '最前面へ', order_up: '手前に移動', order_down: '奥に移動', order_back: '最背面へ',
  tool_pencil: 'ペンシル (N)', pencil_continuous: '連続', pencil_smooth: '滑らか', pen_curved: '曲線', pen_straight: '直線', pencil_polygon: 'ポリゴンペンシル', poly_freehand: 'フリーハンド', poly_straight: '直線', stroke_width: '線幅', stroke_style: '線の種類', stroke_solid: '実線', stroke_dashed: '破線', no_fill: '塗りなし',
  tool_select: '選択 (V)', tool_rect: '長方形 (R)', tool_ellipse: '楕円 (E)', tool_line: '直線 (L)', tool_text: 'テキスト (T)',
  import_image: '画像を読み込む', export_fpng: '.f.png として書き出す', export_png: 'フラット PNG を書き出す', fit_zoom: 'ズーム調整 (0)', change_lang: '言語を変更',
  panel_layers: 'レイヤー', panel_pages: 'ページ', panel_inspector: 'プロパティ', panel_align: '整列',
  layer_opacity: 'レイヤーの不透明度', show_layer: 'レイヤーを表示', hide_layer: 'レイヤーを隠す', unlock_layer: 'レイヤーのロックを解除', lock_layer: 'レイヤーをロック',
  rename_hint: 'ダブルクリックで名前を変更', layer_name: 'レイヤー名', move_up: 'レイヤーを上げる', move_down: 'レイヤーを下げる', delete_layer: 'レイヤーを削除', new_layer: '＋ 新規レイヤー', create_layer: 'レイヤーを作成',
  delete_page: 'ページを削除', new_page: '＋ 新規ページ', create_page: 'ページを作成', page: 'ページ', layer: 'レイヤー',
  page_width: 'ページ幅', page_height: 'ページ高さ', width: '幅', height: '高さ',
  saturation: '彩度', brightness: '明度', crop_x: '切り抜き X', crop_y: '切り抜き Y', crop_w: '切り抜き幅', crop_h: '切り抜き高さ', remove_crop: '切り抜きを解除', show_full_image: '画像全体を表示',
  text: 'テキスト', size: 'サイズ', font: 'フォント', bold: '太字', italic: '斜体', color: '色', stroke_color: '線の色', fill: '塗り', rotation: '回転',
  remove_gradient: 'グラデーションを削除', add_gradient: 'グラデーションを追加', gradient_hint: '線形グラデーション塗り', gradient_from: 'グラデーション開始', gradient_to: 'グラデーション終了', angle: '角度',
  live_effects: 'ライブ効果', blur: 'ぼかし', remove_shadow: '影を削除', add_shadow: '影を追加', shadow_hint: 'ライブドロップシャドウ',
  shadow_x: '影 X', shadow_y: '影 Y', shadow_blur: '影のぼかし', shadow_color: '影の色',
  remove_glow: 'グローを削除', add_glow: 'グローを追加', glow_hint: 'ライブグロー', glow_blur: 'グローのぼかし', glow_color: 'グローの色',
  styles: 'スタイル', save_style: 'スタイルを保存', save_style_hint: 'このオブジェクトの外観を再利用可能なスタイルとして保存', delete_style: 'スタイルを削除',
  align_left: '左揃え', align_hcenter: '水平中央揃え', align_right: '右揃え', align_top: '上揃え', align_vcenter: '垂直中央揃え', align_bottom: '下揃え',
  dist_h: '水平分布', dist_v: '垂直分布', align_hint_multi: '分布は間隔を均等に配置します', align_hint_single: '1 個ならページに整列、2 個以上なら選択グループに整列',
  status_selection: '選択', status_objects: 'オブジェクト',
  settings: '設定', theme: 'テーマ', theme_system: 'システム', theme_light: 'ライト', theme_dark: 'ダーク',
};

const fr: Partial<Msg> = {
  ...en,
  order_front: 'Envoyer à l\'avant', order_up: 'Avancer', order_down: 'Reculer', order_back: 'Envoyer à l\'arrière',
  tool_pencil: 'Crayon (N)', pencil_continuous: 'Continu', pencil_smooth: 'Adouci', pen_curved: 'Courbé', pen_straight: 'Droit', pencil_polygon: 'Crayon de polygones', poly_freehand: 'À main levée', poly_straight: 'Lignes droites', stroke_width: 'Épaisseur du trait', stroke_style: 'Style du trait', stroke_solid: 'Plein', stroke_dashed: 'Pointillés', no_fill: 'Sans remplissage',
  tool_select: 'Sélection (V)', tool_rect: 'Rectangle (R)', tool_ellipse: 'Ellipse (E)', tool_line: 'Ligne (L)', tool_text: 'Texte (T)',
  import_image: 'Importer une image', export_fpng: 'Exporter .f.png', export_png: 'Exporter PNG à plat', fit_zoom: 'Ajuster le zoom (0)', change_lang: 'Changer de langue',
  panel_layers: 'Calques', panel_pages: 'Pages', panel_inspector: 'Propriétés', panel_align: 'Aligner',
  layer_opacity: 'Opacité du calque', show_layer: 'Afficher le calque', hide_layer: 'Masquer le calque', unlock_layer: 'Déverrouiller le calque', lock_layer: 'Verrouiller le calque',
  rename_hint: 'Double-clic pour renommer', layer_name: 'Nom du calque', move_up: 'Monter le calque', move_down: 'Descendre le calque', delete_layer: 'Supprimer le calque', new_layer: '＋ Nouveau calque', create_layer: 'Créer un calque',
  delete_page: 'Supprimer la page', new_page: '＋ Nouvelle page', create_page: 'Créer une page', page: 'Page', layer: 'Calque',
  page_width: 'Largeur de page', page_height: 'Hauteur de page', width: 'Largeur', height: 'Hauteur',
  saturation: 'Saturation', brightness: 'Luminosité', crop_x: 'Recadrage X', crop_y: 'Recadrage Y', crop_w: 'Recadrage largeur', crop_h: 'Recadrage hauteur', remove_crop: 'Supprimer le recadrage', show_full_image: 'Afficher l’image entière',
  text: 'Texte', size: 'Taille', font: 'Police', bold: 'Gras', italic: 'Italique', color: 'Couleur', stroke_color: 'Couleur du contour', fill: 'Remplissage', rotation: 'Rotation',
  remove_gradient: 'Supprimer le dégradé', add_gradient: 'Ajouter un dégradé', gradient_hint: 'Remplissage en dégradé linéaire', gradient_from: 'Dégradé depuis', gradient_to: 'Dégradé vers', angle: 'Angle',
  live_effects: 'Effets en direct', blur: 'Flou', remove_shadow: 'Supprimer l’ombre', add_shadow: 'Ajouter une ombre', shadow_hint: 'Ombre portée en direct',
  shadow_x: 'Ombre X', shadow_y: 'Ombre Y', shadow_blur: 'Flou de l’ombre', shadow_color: 'Couleur de l’ombre',
  remove_glow: 'Supprimer la lueur', add_glow: 'Ajouter une lueur', glow_hint: 'Lueur en direct', glow_blur: 'Flou de la lueur', glow_color: 'Couleur de la lueur',
  styles: 'Styles', save_style: 'Enregistrer le style', save_style_hint: 'Enregistrer l’apparence de cet objet comme style réutilisable', delete_style: 'Supprimer le style',
  align_left: 'Aligner à gauche', align_hcenter: 'Centrer horizontalement', align_right: 'Aligner à droite', align_top: 'Aligner en haut', align_vcenter: 'Centrer verticalement', align_bottom: 'Aligner en bas',
  dist_h: 'Répartir horizontalement', dist_v: 'Répartir verticalement', align_hint_multi: 'Répartir répartit les espaces également', align_hint_single: 'Avec 1 objet, aligne sur la page ; avec 2+, sur le groupe',
  status_selection: 'sélection', status_objects: 'objets',
  settings: 'Paramètres', theme: 'Thème', theme_system: 'Système', theme_light: 'Clair', theme_dark: 'Sombre',
};

const de: Partial<Msg> = {
  ...en,
  order_front: 'In den Vordergrund', order_up: 'Nach vorne', order_down: 'Nach hinten', order_back: 'In den Hintergrund',
  tool_pencil: 'Bleistift (N)', pencil_continuous: 'Durchgehend', pencil_smooth: 'Geglättet', pen_curved: 'Gebogen', pen_straight: 'Gerade', pencil_polygon: 'Polygonstift', poly_freehand: 'Freihand', poly_straight: 'Gerade Linien', stroke_width: 'Strichstärke', stroke_style: 'Strichstil', stroke_solid: 'Durchgehend', stroke_dashed: 'Gestrichelt', no_fill: 'Keine Füllung',
  tool_select: 'Auswahl (V)', tool_rect: 'Rechteck (R)', tool_ellipse: 'Ellipse (E)', tool_line: 'Linie (L)', tool_text: 'Text (T)',
  import_image: 'Bild importieren', export_fpng: '.f.png exportieren', export_png: 'Flaches PNG exportieren', fit_zoom: 'Zoom anpassen (0)', change_lang: 'Sprache wechseln',
  panel_layers: 'Ebenen', panel_pages: 'Seiten', panel_inspector: 'Eigenschaften', panel_align: 'Ausrichten',
  layer_opacity: 'Ebenendeckkraft', show_layer: 'Ebene anzeigen', hide_layer: 'Ebene ausblenden', unlock_layer: 'Ebene entsperren', lock_layer: 'Ebene sperren',
  rename_hint: 'Doppelklick zum Umbenennen', layer_name: 'Ebenenname', move_up: 'Ebene nach oben', move_down: 'Ebene nach unten', delete_layer: 'Ebene löschen', new_layer: '＋ Neue Ebene', create_layer: 'Ebene erstellen',
  delete_page: 'Seite löschen', new_page: '＋ Neue Seite', create_page: 'Seite erstellen', page: 'Seite', layer: 'Ebene',
  page_width: 'Seitenbreite', page_height: 'Seitenhöhe', width: 'Breite', height: 'Höhe',
  saturation: 'Sättigung', brightness: 'Helligkeit', crop_x: 'Beschnitt X', crop_y: 'Beschnitt Y', crop_w: 'Beschnitt Breite', crop_h: 'Beschnitt Höhe', remove_crop: 'Beschnitt entfernen', show_full_image: 'Vollständiges Bild anzeigen',
  text: 'Text', size: 'Größe', font: 'Schrift', bold: 'Fett', italic: 'Kursiv', color: 'Farbe', stroke_color: 'Konturfarbe', fill: 'Füllung', rotation: 'Drehung',
  remove_gradient: 'Verlauf entfernen', add_gradient: 'Verlauf hinzufügen', gradient_hint: 'Lineare Verlaufsfüllung', gradient_from: 'Verlauf von', gradient_to: 'Verlauf nach', angle: 'Winkel',
  live_effects: 'Live-Effekte', blur: 'Unschärfe', remove_shadow: 'Schatten entfernen', add_shadow: 'Schatten hinzufügen', shadow_hint: 'Live-Schlagschatten',
  shadow_x: 'Schatten X', shadow_y: 'Schatten Y', shadow_blur: 'Schattenunschärfe', shadow_color: 'Schattenfarbe',
  remove_glow: 'Glühen entfernen', add_glow: 'Glühen hinzufügen', glow_hint: 'Live-Glühen', glow_blur: 'Glühunschärfe', glow_color: 'Glühfarbe',
  styles: 'Styles', save_style: 'Style speichern', save_style_hint: 'Aussehen dieses Objekts als wiederverwendbaren Style speichern', delete_style: 'Style löschen',
  align_left: 'Links ausrichten', align_hcenter: 'Horizontal zentrieren', align_right: 'Rechts ausrichten', align_top: 'Oben ausrichten', align_vcenter: 'Vertikal zentrieren', align_bottom: 'Unten ausrichten',
  dist_h: 'Horizontal verteilen', dist_v: 'Vertikal verteilen', align_hint_multi: 'Verteilen teilt die Abstände gleichmäßig auf', align_hint_single: 'Mit 1 Objekt an der Seite; mit 2+ an der Gruppe ausrichten',
  status_selection: 'Auswahl', status_objects: 'Objekte',
  settings: 'Einstellungen', theme: 'Design', theme_system: 'System', theme_light: 'Hell', theme_dark: 'Dunkel',
};

const ko: Partial<Msg> = {
  ...en,
  order_front: '맨 앞으로', order_up: '앞으로 이동', order_down: '뒤로 이동', order_back: '맨 뒤로',
  tool_pencil: '연필 (N)', pencil_continuous: '연속', pencil_smooth: '부드럽게', pen_curved: '곡선', pen_straight: '직선', pencil_polygon: '다각형 연필', poly_freehand: '손그림', poly_straight: '직선', stroke_width: '선 두께', stroke_style: '선 스타일', stroke_solid: '실선', stroke_dashed: '점선', no_fill: '채우기 없음',
  tool_select: '선택 (V)', tool_rect: '사각형 (R)', tool_ellipse: '타원 (E)', tool_line: '선 (L)', tool_text: '텍스트 (T)',
  import_image: '이미지 가져오기', export_fpng: '.f.png 내보내기', export_png: '플랫 PNG 내보내기', fit_zoom: '확대 맞춤 (0)', change_lang: '언어 변경',
  panel_layers: '레이어', panel_pages: '페이지', panel_inspector: '속성', panel_align: '정렬',
  layer_opacity: '레이어 불투명도', show_layer: '레이어 표시', hide_layer: '레이어 숨기기', unlock_layer: '레이어 잠금 해제', lock_layer: '레이어 잠금',
  rename_hint: '더블 클릭으로 이름 변경', layer_name: '레이어 이름', move_up: '레이어 올리기', move_down: '레이어 내리기', delete_layer: '레이어 삭제', new_layer: '＋ 새 레이어', create_layer: '레이어 만들기',
  delete_page: '페이지 삭제', new_page: '＋ 새 페이지', create_page: '페이지 만들기', page: '페이지', layer: '레이어',
  page_width: '페이지 너비', page_height: '페이지 높이', width: '너비', height: '높이',
  saturation: '채도', brightness: '밝기', crop_x: '자르기 X', crop_y: '자르기 Y', crop_w: '자르기 너비', crop_h: '자르기 높이', remove_crop: '자르기 제거', show_full_image: '전체 이미지 표시',
  text: '텍스트', size: '크기', font: '글꼴', bold: '굵게', italic: '기울임', color: '색상', stroke_color: '선 색상', fill: '채우기', rotation: '회전',
  remove_gradient: '그라데이션 제거', add_gradient: '그라데이션 추가', gradient_hint: '선형 그라데이션 채우기', gradient_from: '그라데이션 시작', gradient_to: '그라데이션 끝', angle: '각도',
  live_effects: '라이브 효과', blur: '흐림', remove_shadow: '그림자 제거', add_shadow: '그림자 추가', shadow_hint: '라이브 드롭 섀도',
  shadow_x: '그림자 X', shadow_y: '그림자 Y', shadow_blur: '그림자 흐림', shadow_color: '그림자 색상',
  remove_glow: '발광 제거', add_glow: '발광 추가', glow_hint: '라이브 발광', glow_blur: '발광 흐림', glow_color: '발광 색상',
  styles: '스타일', save_style: '스타일 저장', save_style_hint: '이 개체의 모양을 재사용 가능한 스타일로 저장', delete_style: '스타일 삭제',
  align_left: '왼쪽 정렬', align_hcenter: '가로 가운데 정렬', align_right: '오른쪽 정렬', align_top: '위쪽 정렬', align_vcenter: '세로 가운데 정렬', align_bottom: '아래쪽 정렬',
  dist_h: '가로 분산', dist_v: '세로 분산', align_hint_multi: '분산은 간격을 균등하게 배치합니다', align_hint_single: '1개면 페이지에, 2개 이상이면 선택 그룹에 정렬',
  status_selection: '선택', status_objects: '개체',
  settings: '설정', theme: '테마', theme_system: '시스템', theme_light: '라이트', theme_dark: '다크',
};

const it: Partial<Msg> = {
  ...en,
  order_front: 'Porta in primo piano', order_up: 'Porta avanti', order_down: 'Porta indietro', order_back: 'Porta in fondo',
  tool_pencil: 'Matita (N)', pencil_continuous: 'Continuo', pencil_smooth: 'Levigato', pen_curved: 'Curvo', pen_straight: 'Dritto', pencil_polygon: 'Matita poligoni', poly_freehand: 'A mano libera', poly_straight: 'Linee rette', stroke_width: 'Spessore tratto', stroke_style: 'Stile tratto', stroke_solid: 'Continuo', stroke_dashed: 'Tratteggiato', no_fill: 'Nessun riempimento',
  tool_select: 'Selezione (V)', tool_rect: 'Rettangolo (R)', tool_ellipse: 'Ellisse (E)', tool_line: 'Linea (L)', tool_text: 'Testo (T)',
  import_image: 'Importa immagine', export_fpng: 'Esporta .f.png', export_png: 'Esporta PNG piatta', fit_zoom: 'Adatta zoom (0)', change_lang: 'Cambia lingua',
  panel_layers: 'Livelli', panel_pages: 'Pagine', panel_inspector: 'Proprietà', panel_align: 'Allinea',
  layer_opacity: 'Opacità livello', show_layer: 'Mostra livello', hide_layer: 'Nascondi livello', unlock_layer: 'Sblocca livello', lock_layer: 'Blocca livello',
  rename_hint: 'Doppio clic per rinominare', layer_name: 'Nome del livello', move_up: 'Livello su', move_down: 'Livello giù', delete_layer: 'Elimina livello', new_layer: '＋ Nuovo livello', create_layer: 'Crea livello',
  delete_page: 'Elimina pagina', new_page: '＋ Nuova pagina', create_page: 'Crea pagina', page: 'Pagina', layer: 'Livello',
  page_width: 'Larghezza pagina', page_height: 'Altezza pagina', width: 'Larghezza', height: 'Altezza',
  saturation: 'Saturazione', brightness: 'Luminosità', crop_x: 'Ritaglio X', crop_y: 'Ritaglio Y', crop_w: 'Ritaglio larghezza', crop_h: 'Ritaglio altezza', remove_crop: 'Rimuovi ritaglio', show_full_image: 'Mostra l’immagine completa',
  text: 'Testo', size: 'Dimensione', font: 'Carattere', bold: 'Grassetto', italic: 'Corsivo', color: 'Colore', stroke_color: 'Colore contorno', fill: 'Riempimento', rotation: 'Rotazione',
  remove_gradient: 'Rimuovi sfumatura', add_gradient: 'Aggiungi sfumatura', gradient_hint: 'Riempimento con sfumatura lineare', gradient_from: 'Sfumatura da', gradient_to: 'Sfumatura a', angle: 'Angolo',
  live_effects: 'Effetti live', blur: 'Sfocatura', remove_shadow: 'Rimuovi ombra', add_shadow: 'Aggiungi ombra', shadow_hint: 'Ombra portata live',
  shadow_x: 'Ombra X', shadow_y: 'Ombra Y', shadow_blur: 'Sfocatura ombra', shadow_color: 'Colore ombra',
  remove_glow: 'Rimuovi bagliore', add_glow: 'Aggiungi bagliore', glow_hint: 'Bagliore live', glow_blur: 'Sfocatura bagliore', glow_color: 'Colore bagliore',
  styles: 'Stili', save_style: 'Salva stile', save_style_hint: 'Salva l’aspetto di questo oggetto come stile riutilizzabile', delete_style: 'Elimina stile',
  align_left: 'Allinea a sinistra', align_hcenter: 'Centra orizzontalmente', align_right: 'Allinea a destra', align_top: 'Allinea in alto', align_vcenter: 'Centra verticalmente', align_bottom: 'Allinea in basso',
  dist_h: 'Distribuisci orizzontalmente', dist_v: 'Distribuisci verticalmente', align_hint_multi: 'Distribuisci ripartisce gli spazi in modo uniforme', align_hint_single: 'Con 1 oggetto allinea alla pagina; con 2+, al gruppo',
  status_selection: 'selezione', status_objects: 'oggetti',
  settings: 'Impostazioni', theme: 'Tema', theme_system: 'Sistema', theme_light: 'Chiaro', theme_dark: 'Scuro',
};

const tr: Partial<Msg> = {
  ...en,
  order_front: 'Öne getir', order_up: 'Öne taşı', order_down: 'Geriye taşı', order_back: 'Arkaya gönder',
  tool_pencil: 'Kalem (N)', pencil_continuous: 'Sürekli', pencil_smooth: 'Yumuşatılmış', pen_curved: 'Eğri', pen_straight: 'Düz', pencil_polygon: 'Çokgen kalemi', poly_freehand: 'Serbest el', poly_straight: 'Düz çizgiler', stroke_width: 'Kontur kalınlığı', stroke_style: 'Kontur stili', stroke_solid: 'Düz', stroke_dashed: 'Kesik çizgi', no_fill: 'Dolgu yok',
  tool_select: 'Seçim (V)', tool_rect: 'Dikdörtgen (R)', tool_ellipse: 'Elips (E)', tool_line: 'Çizgi (L)', tool_text: 'Metin (T)',
  import_image: 'Görüntü içe aktar', export_fpng: '.f.png dışa aktar', export_png: 'Düz PNG dışa aktar', fit_zoom: 'Yakınlaştırmayı sığdır (0)', change_lang: 'Dili değiştir',
  panel_layers: 'Katmanlar', panel_pages: 'Sayfalar', panel_inspector: 'Özellikler', panel_align: 'Hizala',
  layer_opacity: 'Katman opaklığı', show_layer: 'Katmanı göster', hide_layer: 'Katmanı gizle', unlock_layer: 'Katmanın kilidini aç', lock_layer: 'Katmanı kilitle',
  rename_hint: 'Yeniden adlandırmak için çift tıklayın', layer_name: 'Katman adı', move_up: 'Katmanı yukarı taşı', move_down: 'Katmanı aşağı taşı', delete_layer: 'Katmanı sil', new_layer: '＋ Yeni katman', create_layer: 'Katman oluştur',
  delete_page: 'Sayfayı sil', new_page: '＋ Yeni sayfa', create_page: 'Sayfa oluştur', page: 'Sayfa', layer: 'Katman',
  page_width: 'Sayfa genişliği', page_height: 'Sayfa yüksekliği', width: 'Genişlik', height: 'Yükseklik',
  saturation: 'Doygunluk', brightness: 'Parlaklık', crop_x: 'Kırpma X', crop_y: 'Kırpma Y', crop_w: 'Kırpma genişliği', crop_h: 'Kırpma yüksekliği', remove_crop: 'Kırpmayı kaldır', show_full_image: 'Tüm görüntüyü göster',
  text: 'Metin', size: 'Boyut', font: 'Yazı tipi', bold: 'Kalın', italic: 'İtalik', color: 'Renk', stroke_color: 'Çizgi rengi', fill: 'Dolgu', rotation: 'Döndürme',
  remove_gradient: 'Gradyanı kaldır', add_gradient: 'Gradyan ekle', gradient_hint: 'Doğrusal gradyan dolgu', gradient_from: 'Gradyan başlangıcı', gradient_to: 'Gradyan sonu', angle: 'Açı',
  live_effects: 'Canlı efektler', blur: 'Bulanıklık', remove_shadow: 'Gölgeyi kaldır', add_shadow: 'Gölge ekle', shadow_hint: 'Canlı düşme gölgesi',
  shadow_x: 'Gölge X', shadow_y: 'Gölge Y', shadow_blur: 'Gölge bulanıklığı', shadow_color: 'Gölge rengi',
  remove_glow: 'Işıltıyı kaldır', add_glow: 'Işıltı ekle', glow_hint: 'Canlı ışıltı', glow_blur: 'Işıltı bulanıklığı', glow_color: 'Işıltı rengi',
  styles: 'Stiller', save_style: 'Stil kaydet', save_style_hint: 'Bu nesnenin görünümünü yeniden kullanılabilir stil olarak kaydet', delete_style: 'Stili sil',
  align_left: 'Sola hizala', align_hcenter: 'Yatay ortala', align_right: 'Sağa hizala', align_top: 'Üste hizala', align_vcenter: 'Dikey ortala', align_bottom: 'Alta hizala',
  dist_h: 'Yatay dağıt', dist_v: 'Dikey dağıt', align_hint_multi: 'Dağıt, aralıkları eşit paylaştırır', align_hint_single: '1 nesnede sayfaya hizalar; 2+ nesnede gruba hizalar',
  status_selection: 'seçim', status_objects: 'nesne',
  settings: 'Ayarlar', theme: 'Tema', theme_system: 'Sistem', theme_light: 'Açık', theme_dark: 'Koyu',
};

const vi: Partial<Msg> = {
  ...en,
  order_front: 'Đưa lên trước', order_up: 'Đưa lên trước một lớp', order_down: 'Đưa xuống sau một lớp', order_back: 'Đưa xuống dưới cùng',
  tool_pencil: 'Bút chì (N)', pencil_continuous: 'Liên tục', pencil_smooth: 'Làm mượt', pen_curved: 'Cong', pen_straight: 'Thẳng', pencil_polygon: 'Bút chì đa giác', poly_freehand: 'Vẽ tay', poly_straight: 'Đường thẳng', stroke_width: 'Độ nét', stroke_style: 'Kiểu nét', stroke_solid: 'Liền', stroke_dashed: 'Nét đứt', no_fill: 'Không tô',
  tool_select: 'Chọn (V)', tool_rect: 'Hình chữ nhật (R)', tool_ellipse: 'Hình elip (E)', tool_line: 'Đường thẳng (L)', tool_text: 'Văn bản (T)',
  import_image: 'Nhập ảnh', export_fpng: 'Xuất .f.png', export_png: 'Xuất PNG phẳng', fit_zoom: 'Vừa zoom (0)', change_lang: 'Đổi ngôn ngữ',
  panel_layers: 'Lớp', panel_pages: 'Trang', panel_inspector: 'Thuộc tính', panel_align: 'Căn chỉnh',
  layer_opacity: 'Độ mờ lớp', show_layer: 'Hiện lớp', hide_layer: 'Ẩn lớp', unlock_layer: 'Mở khóa lớp', lock_layer: 'Khóa lớp',
  rename_hint: 'Nhấp đúp để đổi tên', layer_name: 'Tên lớp', move_up: 'Đưa lớp lên', move_down: 'Đưa lớp xuống', delete_layer: 'Xóa lớp', new_layer: '＋ Lớp mới', create_layer: 'Tạo lớp',
  delete_page: 'Xóa trang', new_page: '＋ Trang mới', create_page: 'Tạo trang', page: 'Trang', layer: 'Lớp',
  page_width: 'Chiều rộng trang', page_height: 'Chiều cao trang', width: 'Chiều rộng', height: 'Chiều cao',
  saturation: 'Độ bão hòa', brightness: 'Độ sáng', crop_x: 'Cắt X', crop_y: 'Cắt Y', crop_w: 'Cắt chiều rộng', crop_h: 'Cắt chiều cao', remove_crop: 'Bỏ cắt', show_full_image: 'Hiện ảnh đầy đủ',
  text: 'Văn bản', size: 'Kích cỡ', font: 'Phông chữ', bold: 'Đậm', italic: 'Nghiêng', color: 'Màu', stroke_color: 'Màu viền', fill: 'Tô', rotation: 'Xoay',
  remove_gradient: 'Bỏ chuyển màu', add_gradient: 'Thêm chuyển màu', gradient_hint: 'Tô chuyển màu tuyến tính', gradient_from: 'Chuyển màu từ', gradient_to: 'Chuyển màu đến', angle: 'Góc',
  live_effects: 'Hiệu ứng trực tiếp', blur: 'Làm mờ', remove_shadow: 'Bỏ bóng', add_shadow: 'Thêm bóng', shadow_hint: 'Bóng đổ trực tiếp',
  shadow_x: 'Bóng X', shadow_y: 'Bóng Y', shadow_blur: 'Làm mờ bóng', shadow_color: 'Màu bóng',
  remove_glow: 'Bỏ phát sáng', add_glow: 'Thêm phát sáng', glow_hint: 'Phát sáng trực tiếp', glow_blur: 'Làm mờ phát sáng', glow_color: 'Màu phát sáng',
  styles: 'Kiểu', save_style: 'Lưu kiểu', save_style_hint: 'Lưu giao diện của đối tượng này thành kiểu tái sử dụng', delete_style: 'Xóa kiểu',
  align_left: 'Căn trái', align_hcenter: 'Canh giữa ngang', align_right: 'Căn phải', align_top: 'Căn trên', align_vcenter: 'Canh giữa dọc', align_bottom: 'Căn dưới',
  dist_h: 'Phân bố ngang', dist_v: 'Phân bố dọc', align_hint_multi: 'Phân bố chia đều khoảng trống', align_hint_single: 'Với 1 đối tượng canh theo trang; với 2+, canh theo nhóm',
  status_selection: 'đã chọn', status_objects: 'đối tượng',
  settings: 'Cài đặt', theme: 'Chủ đề', theme_system: 'Hệ thống', theme_light: 'Sáng', theme_dark: 'Tối',
};

const nl: Partial<Msg> = {
  ...en,
  order_front: 'Naar de voorgrond', order_up: 'Naar voren', order_down: 'Naar achteren', order_back: 'Naar de achtergrond',
  tool_pencil: 'Potlood (N)', pencil_continuous: 'Doorlopend', pencil_smooth: 'Vloog', pen_curved: 'Gebogen', pen_straight: 'Recht', pencil_polygon: 'Polygoonpotlood', poly_freehand: 'Vrije hand', poly_straight: 'Rechte lijnen', stroke_width: 'Lijndikte', stroke_style: 'Lijnstijl', stroke_solid: 'Doorlopend', stroke_dashed: 'Gestippeld', no_fill: 'Geen vulling',
  tool_select: 'Selectie (V)', tool_rect: 'Rechthoek (R)', tool_ellipse: 'Ellips (E)', tool_line: 'Lijn (L)', tool_text: 'Tekst (T)',
  import_image: 'Afbeelding importeren', export_fpng: '.f.png exporteren', export_png: 'Platte PNG exporteren', fit_zoom: 'Zoom aanpassen (0)', change_lang: 'Taal wisselen',
  panel_layers: 'Lagen', panel_pages: 'Pagina\u2019s', panel_inspector: 'Eigenschappen', panel_align: 'Uitlijnen',
  layer_opacity: 'Laagdekking', show_layer: 'Laag tonen', hide_layer: 'Laag verbergen', unlock_layer: 'Laag ontgrendelen', lock_layer: 'Laag vergrendelen',
  rename_hint: 'Dubbelklik om te hernoemen', layer_name: 'Laagnaam', move_up: 'Laag omhoog', move_down: 'Laag omlaag', delete_layer: 'Laag verwijderen', new_layer: '＋ Nieuwe laag', create_layer: 'Laag maken',
  delete_page: 'Pagina verwijderen', new_page: '＋ Nieuwe pagina', create_page: 'Pagina maken', page: 'Pagina', layer: 'Laag',
  page_width: 'Paginabreedte', page_height: 'Paginahoogte', width: 'Breedte', height: 'Hoogte',
  saturation: 'Verzadiging', brightness: 'Helderheid', crop_x: 'Bijsnijden X', crop_y: 'Bijsnijden Y', crop_w: 'Bijsnijden breedte', crop_h: 'Bijsnijden hoogte', remove_crop: 'Bijsnijden verwijderen', show_full_image: 'Volledige afbeelding tonen',
  text: 'Tekst', size: 'Grootte', font: 'Lettertype', bold: 'Vet', italic: 'Cursief', color: 'Kleur', stroke_color: 'Lijnkleur', fill: 'Vulling', rotation: 'Rotatie',
  remove_gradient: 'Verloop verwijderen', add_gradient: 'Verloop toevoegen', gradient_hint: 'Vulling met lineair verloop', gradient_from: 'Verloop van', gradient_to: 'Verloop naar', angle: 'Hoek',
  live_effects: 'Live-effecten', blur: 'Vervaging', remove_shadow: 'Schaduw verwijderen', add_shadow: 'Schaduw toevoegen', shadow_hint: 'Live slagschaduw',
  shadow_x: 'Schaduw X', shadow_y: 'Schaduw Y', shadow_blur: 'Schaduvervaging', shadow_color: 'Schaduwkleur',
  remove_glow: 'Gloed verwijderen', add_glow: 'Gloed toevoegen', glow_hint: 'Live gloed', glow_blur: 'Gloedvervaging', glow_color: 'Gloedkleur',
  styles: 'Stijlen', save_style: 'Stijl opslaan', save_style_hint: 'Het uiterlijk van dit object opslaan als herbruikbare stijl', delete_style: 'Stijl verwijderen',
  align_left: 'Links uitlijnen', align_hcenter: 'Horizontaal centreren', align_right: 'Rechts uitlijnen', align_top: 'Boven uitlijnen', align_vcenter: 'Verticaal centreren', align_bottom: 'Onder uitlijnen',
  dist_h: 'Horizontaal verdelen', dist_v: 'Verticaal verdelen', align_hint_multi: 'Verdelen verdeelt de ruimtes gelijk', align_hint_single: 'Met 1 object uitlijnen op de pagina; met 2+ op de groep',
  status_selection: 'selectie', status_objects: 'objecten',
  settings: 'Instellingen', theme: 'Thema', theme_system: 'Systeem', theme_light: 'Licht', theme_dark: 'Donker',
};

const LOCALES: Record<Lang, Partial<Msg>> = { en, es, zh, hi, ar, pt, ru, ja, fr, de, ko, it, tr, vi, nl };

const RTL: Lang[] = ['ar'];

function detect(): Lang {
  const saved = localStorage.getItem('pyra:lang') as Lang | null;
  if (saved && LOCALES[saved]) return saved;
  const nav = (navigator.language ?? 'en').slice(0, 2) as Lang;
  return LOCALES[nav] ? nav : 'en';
}

let lang: Lang = typeof localStorage === 'undefined' ? 'en' : detect();

export function currentLang(): Lang { return lang; }

export function setLang(l: Lang): void {
  lang = l;
  localStorage.setItem('pyra:lang', l);
  document.documentElement.lang = l;
  document.documentElement.dir = RTL.includes(l) ? 'rtl' : 'ltr';
}

export function t(key: keyof Msg): string {
  return LOCALES[lang][key] ?? en[key];
}

/** Barra de estado: `120% · selección 30×40 (2 objetos)`. */
export function statusText(zoomPct: number, selW: number, selH: number, n: number): string {
  void zoomPct; // el zoom se muestra en su propio control de la barra
  if (selW <= 0) return '';
  return `${t('status_selection')} ${Math.round(selW)}×${Math.round(selH)}${n > 1 ? ` (${n} ${t('status_objects')})` : ''}`;
}
