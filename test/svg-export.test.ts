// Tests del exportador SVG: comprueba el MARKUP generado (qué elementos, con qué
// atributos), no píxeles. Es un módulo puro, así que va en node sin jsdom.
import { describe, expect, it } from 'vitest';
import {
  activePage, newDoc,
  type BitmapObj, type ShapeObj, type TextObj,
} from '../src/model';
import { exportSvg, type SvgExportOpts } from '../src/svg-export';

const shape = (over: Partial<ShapeObj> & { shape: ShapeObj['shape'] }): ShapeObj => ({
  id: 's1', name: '', x: 10, y: 20, w: 100, h: 50, fill: '#ff0000', stroke: null, strokeWidth: 0, ...over,
});
const bitmap = (over: Partial<BitmapObj>): BitmapObj => ({
  id: 'b1', shape: 'bitmap', name: '', x: 0, y: 0, w: 200, h: 100, src: 'data:image/png;base64,AAA', crop: null, sat: 1, bri: 1, ...over,
});
const text = (over: Partial<TextObj>): TextObj => ({
  id: 't1', shape: 'text', name: '', x: 5, y: 7, w: 80, h: 20, text: 'hola', font: 'Arial', size: 16, fill: '#000', ...over,
});
const svgOf = (objs: unknown[], opts: Partial<SvgExportOpts> & { bg?: string } = {}) => {
  const d = newDoc('prueba');
  activePage(d).layers[0].objects.push(...(objs as never[]));
  return exportSvg(activePage(d), { bg: '#ffffff', ...opts });
};

describe('exportSvg: documento', () => {
  it('cabecera, viewBox y fondo de página', () => {
    const svg = svgOf([], { bg: '#101010' });
    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('width="1280" height="800" viewBox="0 0 1280 800"');
    expect(svg).toContain('<rect x="0" y="0" width="1280" height="800" fill="#101010"/>');
  });

  it('capa oculta no se exporta; capa con opacidad va en grupo con opacity', () => {
    const d = newDoc('prueba');
    const p = activePage(d);
    p.layers[0].visible = false;
    p.layers[0].objects.push(shape({ shape: 'rect' }));
    p.layers.push({ id: 'l2', name: 'l2', visible: true, locked: false, opacity: 0.5, objects: [shape({ id: 's2', shape: 'ellipse' })] });
    const svg = exportSvg(p, { bg: '#fff' });
    expect(svg).not.toContain('<rect x="10"');
    expect(svg).toContain('<g opacity="0.5">');
    expect(svg).toContain('<ellipse');
  });
});

describe('exportSvg: formas', () => {
  it('rect con relleno, borde, guión y rotación', () => {
    const svg = svgOf([shape({ shape: 'rect', stroke: '#00f', strokeWidth: 2, dash: [6, 4], rot: 45 })]);
    expect(svg).toContain('<rect x="10" y="20" width="100" height="50" fill="#ff0000"');
    expect(svg).toContain('stroke="#00f" stroke-width="2" stroke-opacity="1" stroke-dasharray="6 4"');
    expect(svg).toContain('transform="rotate(45 60 45)"');
  });

  it('flipH/flipV producen un transform de espejo sobre el centro del bbox', () => {
    const svg = svgOf([shape({ shape: 'rect', flipH: true })]);
    expect(svg).toContain('transform="translate(60 45) scale(-1 1) translate(-60 -45)"');
    const both = svgOf([shape({ shape: 'rect', flipV: true, rot: 90 })]);
    expect(both).toContain('transform="rotate(90 60 45) translate(60 45) scale(1 -1) translate(-60 -45)"');
  });

  it('ellipse usa cx/cy/rx/ry', () => {
    const svg = svgOf([shape({ shape: 'ellipse' })]);
    expect(svg).toContain('<ellipse cx="60" cy="45" rx="50" ry="25"');
  });

  it('line respeta la esquina de inicio (lineFrom)', () => {
    const svg = svgOf([shape({ shape: 'line', stroke: '#000', strokeWidth: 1, lineFrom: 'ne' })]);
    // ne: empieza en la esquina superior derecha del bbox
    expect(svg).toContain('<line x1="110" y1="20" x2="10" y2="70"');
  });

  it('polígono: vértices como path cerrado; suavizado usa cúbicas', () => {
    const poly = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }];
    const hard = svgOf([shape({ shape: 'polygon', poly })]);
    expect(hard).toContain('<path d="M 10 20 L 110 20 L 60 70 Z"');
    const soft = svgOf([shape({ shape: 'polygon', poly, smooth: true })]);
    expect(soft).toContain(' C ');
    expect(soft).toContain(' Z"');
  });

  it('polígono con nodos Bézier (polyH): C en los tramos con asa, L en las esquinas', () => {
    const s = svgOf([shape({
      shape: 'polygon',
      poly: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
      polyH: [null, { x: -0.3, y: 0 }, null, null],
    })]);
    // nodo 1 con asa → tramos 0→1 y 1→2 con C (asa espejada); el resto, L
    expect(s).toContain('C 10 20 140 20 110 20'); // 0→1: c2 = b - asa(−30) = 140
    expect(s).toContain('C 80 20 110 70 110 70'); // 1→2: c1 = a + asa = 80
    expect(s).toContain('L 10 70'); // 2→3 recta
    expect(s).toContain(' Z"');
  });

  it('nodo cúspide (polyH2): el lado entrante es libre → pico anguloso', () => {
    const s = svgOf([shape({
      shape: 'polygon',
      poly: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
      polyH: [null, { x: -0.3, y: 0 }, null, null],
      polyH2: [null, { x: 0, y: 0.5 }, null, null],
    })]);
    // tramo 0→1: c2 = nodo1 + polyH2 = (110, 20+25) en vez del espejo (140,20)
    expect(s).toContain('C 10 20 110 45 110 20');
    expect(s).toContain('C 80 20 110 70 110 70'); // el lado saliente no cambia
  });

  it('degradado: defs con linearGradient y stops', () => {
    const svg = svgOf([shape({ shape: 'rect', gradient: { from: '#f00', to: '#00f', angle: 90 } })]);
    expect(svg).toContain('<linearGradient id="grad0"');
    expect(svg).toContain('<stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#00f"/>');
    expect(svg).toContain('fill="url(#grad0)"');
  });

  it('degradado radial: defs con radialGradient en coordenadas de bbox', () => {
    const svg = svgOf([shape({ shape: 'rect', gradient: { from: '#f00', to: '#00f', angle: 0, radial: true } })]);
    expect(svg).toContain('<radialGradient id="grad0" cx="0.5" cy="0.5" r="0.5">');
    expect(svg).toContain('fill="url(#grad0)"');
    expect(svg).not.toContain('<linearGradient');
  });
  it('degradado con paradas intermedias: stops en el defs', () => {
    const svg = svgOf([shape({ shape: 'rect', gradient: { from: '#000000', to: '#ffffff', angle: 0, stops: [{ p: 0, c: '#000000' }, { p: 0.5, c: '#ff0000' }, { p: 1, c: '#ffffff' }] } })]);
    expect(svg).toContain('<stop offset="0" stop-color="#000000"/>');
    expect(svg).toContain('<stop offset="0.5" stop-color="#ff0000"/>');
    expect(svg).toContain('<stop offset="1" stop-color="#ffffff"/>');
  });
  it('rect con esquinas redondeadas: atributo rx limitado a la mitad del lado corto', () => {
    const svg = svgOf([shape({ shape: 'rect', rx: 8 })]);
    expect(svg).toContain('<rect x="10" y="20" width="100" height="50" rx="8"');
    const big = svgOf([shape({ shape: 'rect', rx: 999 })]);
    expect(big).toContain('rx="25"');
  });
});

describe('exportSvg: trazos del motor de pinceles', () => {
  const strokeObj = shape({
    shape: 'stroke', x: 0, y: 0, w: 100, h: 10, strokeWidth: 4, stroke: '#123456',
    points: [{ x: 0, y: 0.5, p: 1 }, { x: 0.5, y: 0.5, p: 0.5 }, { x: 1, y: 0.5, p: 1 }],
  });

  it('cinta de alfa uniforme: path único con fill-rule=nonzero y arcos de tope', () => {
    const svg = svgOf([strokeObj]);
    expect(svg).toContain('fill="#123456" fill-opacity="1" fill-rule="nonzero"');
    // topes redondos como arcos A exactos (no polilíneas aproximadas)
    expect(svg).toContain(' A 2 2 0 1 0 ');
    expect(svg).toContain(' A 1 1 0 1 0 '); // punto intermedio más fino
  });

  it('opacidad de trazo y suavizado: se re-muestrea antes de contornear', () => {
    const svg = svgOf([{ ...strokeObj, strokeOpacity: 0.4, smooth: true }]);
    expect(svg).toContain('fill-opacity="0.4"');
    // re-muestreado: muchos más segmentos que los 3 puntos crudos
    const d = svg.match(/ d="([^"]+)"/)![1];
    expect((d.match(/L /g) ?? []).length).toBeGreaterThan(6);
  });
});

describe('exportSvg: bitmap y texto', () => {
  it('bitmap se embute como data URL', () => {
    const svg = svgOf([bitmap({ x: 10, y: 10 })]);
    expect(svg).toContain('<image href="data:image/png;base64,AAA" x="10" y="10" width="200" height="100"');
  });

  it('goma: máscara con agujeros negros en coordenadas de mundo', () => {
    const svg = svgOf([bitmap({ x: 100, y: 50, w: 400, h: 200, erase: [{ x: 0.5, y: 0.5, r: 0.1 }] })]);
    expect(svg).toContain('<mask id="mask0"><rect x="100" y="50" width="400" height="200" fill="#fff"/>');
    expect(svg).toContain('<circle cx="300" cy="150" r="40" fill="#000"/>');
    expect(svg).toContain('mask="url(#mask0)"');
  });

  it('crop: recorte real si se conocen las dimensiones de la fuente', () => {
    const svg = svgOf([bitmap({ x: 0, y: 0, w: 100, h: 100, crop: { x: 50, y: 0, w: 100, h: 100 } })],
      { bg: '#fff', bitmapDims: () => ({ w: 300, h: 200 }) });
    expect(svg).toContain('<clipPath id="clip0"><rect x="0" y="0" width="100" height="100"/></clipPath>');
    // scale = 100/100 = 1 → la imagen completa desplazada -50px, recortada al bbox
    expect(svg).toContain('<image href="data:image/png;base64,AAA" x="-50" y="0" width="300" height="200"');
  });

  it('ajustes sat/bri y efectos van a filters', () => {
    const svg = svgOf([bitmap({ sat: 0, bri: 1.5 })]);
    expect(svg).toContain('<feColorMatrix type="saturate" values="0"/>');
    expect(svg).toContain('<feFuncR type="linear" slope="1.5"/>');
    const s = svgOf([shape({ shape: 'rect', fx: { shadow: { x: 3, y: 4, blur: 6, color: '#000' }, glow: null, blur: 0 } })]);
    expect(s).toContain('<feDropShadow dx="3" dy="4" stdDeviation="3" flood-color="#000"/>');
  });

  it('blend: mix-blend-mode en un envoltorio; sin blend no hay mezcla', () => {
    const s = svgOf([shape({ shape: 'rect', fx: { shadow: null, glow: null, blur: 0, blend: 'multiply' } })]);
    expect(s).toContain('<g style="mix-blend-mode:multiply">');
    const plain = svgOf([shape({ shape: 'rect' })]);
    expect(plain).not.toContain('mix-blend-mode');
  });

  it('opacidad por objeto: opacity en el envoltorio; 1 no emite nada', () => {
    const s = svgOf([shape({ shape: 'rect', fx: { shadow: null, glow: null, blur: 0, opacity: 0.4 } })]);
    expect(s).toContain('<g opacity="0.4">');
    const both = svgOf([shape({ shape: 'rect', fx: { shadow: null, glow: null, blur: 0, opacity: 0.4, blend: 'screen' } })]);
    expect(both).toContain('<g style="mix-blend-mode:screen" opacity="0.4">');
    const plain = svgOf([shape({ shape: 'rect' })]);
    expect(plain).not.toContain('opacity=');
  });

  it('texto: fuente, multilinea con tspans y escape XML', () => {
    const svg = svgOf([text({ text: 'a<b>&c\nsegunda', bold: true, size: 20 })]);
    expect(svg).toContain('<text x="5" y="23" fill="#000" font-family="Arial" font-size="20" font-weight="bold"');
    expect(svg).toContain('a&lt;b&gt;&amp;c');
    expect(svg).toContain('<tspan x="5" dy="24">segunda</tspan>');
  });
});
