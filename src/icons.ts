// Iconos SVG de trazo (24×24). Un solo set para toda la app.
// ponytail: paths mínimos a mano; si hiciera falta un set completo, lucide.

const P: Record<string, string> = {
  cursor: 'M5 3l14 8-6 2-2 6z',
  rect: 'M4 5h16v14H4z',
  ellipse: 'M12 5a8 7 0 1 0 0 14a8 7 0 1 0 0-14',
  line: 'M5 19L19 5',
  brush: 'M4 20c2-1 2-3 4-3M9 17l9-9 3 3-9 9zM14 6l3 3',
  brushRound: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8',
  brushSquare: 'M8 8h8v8H8z',
  pen: 'M4 20l3.5-1L19 7.5 21 9.5 9.5 21zM15 6l3 3',
  pencil: 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3',
  polypen: 'M12 4l7 4v8l-7 4-7-4V8zM12 4v16',
  eraser: 'M8 18h9M10 21h7M5 13l7-7 6 6-7 7H6z',
  text: 'M5 6h14M12 6v13',
  hand: 'M8 13V6a1.5 1.5 0 0 1 3 0v6M11 12V5a1.5 1.5 0 0 1 3 0v7M14 12V7a1.5 1.5 0 0 1 3 0v7a6 6 0 0 1-6 6h-1a5 5 0 0 1-4-2l-2.5-3.5a1.6 1.6 0 0 1 2.6-1.8L8 15',
  import: 'M12 4v10m-4-4 4 4 4-4M5 19h14',
  export: 'M12 15V5m-4 4 4-4 4 4M5 19h14',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  settings:
    'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2',
  zoom: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M16 16l5 5',
  eye: 'M12 6c5 0 8 6 8 6s-3 6-8 6-8-6-8-6 3-6 8-6M12 10a2 2 0 1 0 0 4a2 2 0 1 0 0-4',
  eyeOff: 'M4 4l16 16M12 6c5 0 8 6 8 6s-3 6-8 6-8-6-8-6 3-6 8-6',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z',
  unlock: 'M7 11V8a5 5 0 0 1 9.5-2M5 11h14v9H5z',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  up: 'M12 19V5m-6 6 6-6 6 6',
  down: 'M12 5v14m-6-6 6 6 6-6',
  layers: 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5',
  pages: 'M8 3h8l4 4v14H8zM16 3v4h4',
  sliders: 'M4 8h10M18 8h2M4 16h4M12 16h8M14 5v6M8 13v6',
  alignLeft: 'M4 4v16M8 7h9M8 14h5',
  alignHCenter: 'M12 4v16M7 7h10M9 14h6',
  alignRight: 'M20 4v16M7 7h9M11 14h5',
  alignTop: 'M4 4h16M7 8v9M14 8v5',
  alignVCenter: 'M4 12h16M7 7v10M14 9v6',
  alignBottom: 'M4 20h16M7 7v9M14 11v5',
  hdist: 'M4 4v16M12 4v16M20 4v16M7 10v4M15 10v4',
  vdist: 'M4 4h16M4 12h16M4 20h16M10 7h4M10 15h4',
  front: 'M4 4h16M12 20V8m-5 5 5-5 5 5',
  back: 'M4 20h16M12 4v12m-5-5 5 5 5-5',
  check: 'M5 13l4 4L19 7',
};

export function hasIcon(name: string): boolean {
  return name in P;
}

export function icon(name: string, size = 16): string {
  const d = P[name] || P.settings;
  return (
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" ` +
    `stroke="currentColor" stroke-width="1.7" stroke-linecap="round" ` +
    `stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`
  );
}
