// DOM helpers for the Hushmates interface.
// Text from people is only ever inserted as text nodes (never innerHTML).

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') for (const [p, val] of Object.entries(v)) { if (val == null) continue; if (p.startsWith('--')) el.style.setProperty(p, val); else el.style[p] = val; }
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

// line icons in the landing page's hand: 1.9 stroke, round caps and joins
const P = {
  back: 'M15 5l-7 7 7 7',
  arrow: 'M4 12h15m-5-5 5 5-5 5',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  send: 'M12 19V5M5.5 11.5 12 5l6.5 6.5',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chevron: 'M9 5l7 7-7 7',
  heart: 'M12 20s-7-4.4-9.2-9A5 5 0 0112 5.5 5 5 0 0121.2 11C19 15.6 12 20 12 20z',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z',
  help: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.2-1.5 2.2M12 17h.01',
  mail: 'M4 6.5h16v11H4zM4.5 7l7.5 6 7.5-6',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  moon: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  block: 'M12 21a9 9 0 100-18 9 9 0 000 18zM5.6 5.6l12.8 12.8',
  leave: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  bellOff: 'M3 3l18 18M9 21h6M18 14V10a6 6 0 00-9.7-4.7M6 9.8V14l-2 3h12',
  eyeOff: 'M3 3l18 18M10.6 6.1A9.8 9.8 0 0112 6c5 0 9 6 9 6a17 17 0 01-2.6 3.2M6.6 6.6C4.3 8.1 3 12 3 12s4 6 9 6a9 9 0 004.4-1.1M9.9 9.9a3 3 0 004.2 4.2',
  pause: 'M9 5v14M15 5v14',
  orb: 'M12 20a8 8 0 100-16 8 8 0 000 16zM9 9.5a3.5 3.5 0 013-1.5',
  catch: 'M5 11a7 7 0 0014 0M12 4v7M9 8l3 3 3-3',
  path: 'M5 19c3 0 3-5 7-5s4-5 7-5M5 19h.01M19 9h.01',
  home: 'M4 11l8-6 8 6M6 9.5V19h12V9.5',
  share: 'M12 4v11M7.5 8.5 12 4l4.5 4.5M6 13v6h12v-6',
  sound: 'M5 9v6h3l5 4V5L8 9zM16.5 9a4 4 0 010 6',
  mute: 'M5 9v6h3l5 4V5L8 9zM17 10l4 4M21 10l-4 4',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  star: 'M12 4c.6 3.4 1.6 4.6 5 5.4-3.4.8-4.4 2-5 5.4-.6-3.4-1.6-4.6-5-5.4 3.4-.8 4.4-2 5-5.4zM18.5 15c.3 1.6.8 2.2 2.5 2.5-1.7.3-2.2.9-2.5 2.5-.3-1.6-.8-2.2-2.5-2.5 1.7-.3 2.2-.9 2.5-2.5z',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  refresh: 'M20 11a8 8 0 10-2.3 5.7M20 5v6h-6',
  key: 'M14 10a4 4 0 10-3.5 4L4 20.5V22h3v-2h2v-2h2l1.5-1.5A4 4 0 0014 10zM16 8h.01',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18',
  wifiOff: 'M3 3l18 18M8.5 16.5a5 5 0 017 0M5 12.5a10 10 0 015.2-2.8M19 12.5a10 10 0 00-2.4-1.7M12 20h.01',
  text: 'M4 7V5h12v2M10 5v14M8 19h4M15 13v-1h6v1M18 12v7M17 19h2',
  plus: 'M12 5v14M5 12h14',
  filter: 'M4 6h16M7 12h10M10 18h4',
};

export function icon(name, label) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', name === 'heart' ? 'currentColor' : 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', name === 'more' ? '3' : '1.9');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', 'kit-ico');
  if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); } else svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', P[name] || P.sparkle);
  svg.append(p);
  return svg;
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
export const fmtTime = (t) => timeFmt.format(new Date(t));
export function fmtDay(t) {
  const d = new Date(t); const now = new Date();
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86400e3);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return dayFmt.format(d);
}
/**
 * What to tell a person when something didn't work. Only words written for people are shown: the
 * service's own refusals (marked `human` by the link) and the network's. Anything else (a browser,
 * parsing or programming error) becomes one gentle line; its details never reach the screen.
 */
const NETWORK_WORDS = {
  network: 'You’re offline. Nothing was sent; try again when you’re back.',
  'response-lost': 'The connection dropped before we heard back. It’s safe to try again: nothing is sent twice.',
};
export const GENTLE = 'Something went wrong. Please try again in a moment.';
export function humane(e) {
  if (NETWORK_WORDS[e?.code]) return NETWORK_WORDS[e.code];
  if (e?.human && typeof e.message === 'string' && e.message.trim()) return e.message;
  return GENTLE;
}

/** "just now", "12 min ago", "3 h ago" measured on the service's clock (which can differ from this device's). */
export function fmtAgo(t, now = Date.now()) {
  const diff = Math.max(0, now - t);
  if (diff < 60e3) return 'just now';
  if (diff < 3600e3) return `${Math.floor(diff / 60e3)} min ago`;
  if (diff < 86400e3) return `${Math.floor(diff / 3600e3)} h ago`;
  return fmtDay(t);
}
/** A gentle span of time: "about 23 hours", "12 minutes", "under a minute". */
export function fmtSpan(ms) {
  const m = Math.max(0, Math.round(ms / 60e3));
  if (m < 1) return 'under a minute';
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'}`;
  const hrs = Math.round(m / 60);
  return hrs >= 24 ? `${Math.round(hrs / 24)} day${hrs >= 36 ? 's' : ''}` : `about ${hrs} hour${hrs === 1 ? '' : 's'}`;
}
