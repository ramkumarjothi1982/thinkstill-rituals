// Line icons for the Hushfold shell (24px grid, 2px rounded strokes), drawn
// as inline SVG so nothing extra loads. Decorative unless given a label.

const P = {
  pause: 'M9 6v12M15 6v12',
  play: 'M8 5.5v13l10.5-6.5z',
  replay: 'M4.5 12a7.5 7.5 0 107.5-7.5H8.5M8.5 1.8 5.8 4.5l2.7 2.7',
  skip: 'M6 6l7 6-7 6zM17 6v12',
  next: 'M9 6l6 6-6 6',
  prev: 'M15 6l-6 6 6 6',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  gear: 'M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z M19.4 13a7.6 7.6 0 000-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 00-1.7-1L15 3h-4l-.4 2.6a7.4 7.4 0 00-1.7 1l-2.4-1-2 3.4L6.6 11a7.6 7.6 0 000 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.8 1.7 1L11 21h4l.4-2.6c.6-.2 1.2-.6 1.7-1l2.4 1 2-3.4z',
  panel: 'M4 7h7M15 7h5M4 12h3M11 12h9M4 17h9M17 17h3M13 5v4M9 10v4M15 15v4',
  talk: 'M5 18.5V7.5A2.5 2.5 0 017.5 5h9A2.5 2.5 0 0119 7.5v6a2.5 2.5 0 01-2.5 2.5H9l-4 2.5z M9 10.5h6',
  mic: 'M12 14.5a3 3 0 003-3v-5a3 3 0 00-6 0v5a3 3 0 003 3z M6.5 11.5a5.5 5.5 0 0011 0M12 17v3.5',
  send: 'M5 12h13M13 6l6 6-6 6',
  camera: 'M4 8.5h3l2-3h6l2 3h3V19H4z M12 16.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  support: 'M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0112 7.6a4.4 4.4 0 017.5 2.8c0 5.5-7.5 10.1-7.5 10.1z',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  garden: 'M12 20v-7M12 13c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6zM12 15c0-2.8-2-5-5-5 0 2.8 2 5 5 5zM7 20h10',
  library: 'M4.5 5h4v14h-4zM10 5h4v14h-4zM16.3 5.6l3.5 1-3.4 12.5-3.5-1z',
  journey: 'M4 20V10M10 20V4M16 20v-7M21 20H3',
  stay: 'M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z',
  finish: 'M5 12.5l4.5 4.5L19 7.5',
  speed: 'M12 20a8 8 0 118-8M12 12l4-4',
  chev: 'M9 6l6 6-6 6',
  sparkle: 'M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6.3 6.3l2.6 2.6M15.1 15.1l2.6 2.6M17.7 6.3l-2.6 2.6M8.9 15.1l-2.6 2.6',
};
const FILLED = new Set(['play', 'star']);

export function hfIcon(name, { label, filled } = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', filled ?? FILLED.has(name) ? 'currentColor' : 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); } else svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', P[name] || P.sparkle);
  svg.append(p);
  return svg;
}
