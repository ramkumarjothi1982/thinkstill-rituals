/* Tiny DOM helpers for the Reflect console and rituals (no framework, so the same code runs in Framer, the artifact
 * and the dev page). */
type Kid = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Record<string, any> | null, ...kids: (Kid | Kid[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) for (const k of Object.keys(attrs)) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') for (const p of Object.keys(v)) setStyle(el, p, v[p]);
    else if (k === 'text') el.textContent = String(v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  const add = (c: Kid | Kid[]) => {
    if (Array.isArray(c)) { c.forEach(add); return; }
    if (c == null || c === false) return;
    el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
}

/* Reflect often lives inside a frame (a Framer component on a wider page), so sizes must follow the frame, not the browser
 * window. The console root is a size container named `rf`: cqw/cqh and @container queries measure the frame. Browsers
 * without container queries keep the viewport-unit / @media version written first. */
export const toCq = (v: string) => v.replace(/(\d)vw\b/g, '$1cqw').replace(/(\d)vh\b/g, '$1cqh');
const VIEWPORT_UNIT = /\d(?:vw|vh)\b/;

/** Set one inline style; a value in vw/vh is set again in cqw/cqh (ignored by browsers that cannot parse it). */
export function setStyle(el: HTMLElement, prop: string, val: any) {
  (el.style as any)[prop] = val;
  if (typeof val === 'string' && VIEWPORT_UNIT.test(val)) (el.style as any)[prop] = toCq(val);
}

/** Rewrite a stylesheet for the `rf` container: every declaration using vw/vh gets a cqw/cqh twin after it, and each
 * `@media (min|max-width:Npx){…}` block becomes `@container rf (…){…}` plus the original media block for browsers
 * without container queries. */
export function cq(css: string): string {
  css = css.replace(/([{;]\s*)([a-z-]+)\s*:\s*([^;{}]*\d(?:vw|vh)\b[^;{}]*)(?=[;}])/g, (_m, pre, prop, val) => `${pre}${prop}:${val};${prop}:${toCq(val)}`);
  const re = /@media\s*\((min|max)-width:\s*(\d+)px\)\s*\{/g;
  let out = '', i = 0, m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    let depth = 1, j = re.lastIndex;
    while (j < css.length && depth > 0) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
    const inner = css.slice(re.lastIndex, j - 1), q = `(${m[1]}-width:${m[2]}px)`;
    out += css.slice(i, m.index) + `@container rf ${q}{${inner}}@supports not (container-type:size){@media ${q}{${inner}}}`;
    i = j; re.lastIndex = j;
  }
  return out + css.slice(i);
}

/** Width of the Reflect frame an element sits in (the `rf` container), falling back to the window. */
export function frameWidth(el: Element): number {
  const root = el.closest('.rf');
  return root ? root.getBoundingClientRect().width : innerWidth;
}

export function clear(el: Element) { while (el.firstChild) el.removeChild(el.firstChild); }

export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = {
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  back: (t: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  elastic: (t: number) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1)
};

/** A canvas that tracks its CSS size and device pixel ratio. */
export class Surface {
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  w = 1; h = 1; dpr = 1;
  maxDpr = 2;
  constructor(cls = '') {
    this.canvas = h('canvas', { class: cls });
    this.g = this.canvas.getContext('2d')!;
  }
  /** Resize the backing store to the element's CSS box; returns true if it changed. */
  fit(cssW?: number, cssH?: number): boolean {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(cssW ?? r.width)), hh = Math.max(1, Math.round(cssH ?? r.height));
    const dpr = Math.min(this.maxDpr, Math.max(1, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1)));
    if (w === this.w && hh === this.h && dpr === this.dpr) return false;
    this.w = w; this.h = hh; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(hh * dpr);
    return true;
  }
  get pw() { return this.canvas.width; }
  get ph() { return this.canvas.height; }
}

/** Pointer drag helper: calls back with element-local CSS coordinates; supports touch, pen and mouse. */
export function drag(el: HTMLElement, cb: { down?: (x: number, y: number, e: PointerEvent) => void | boolean; move?: (x: number, y: number, e: PointerEvent) => void; up?: (x: number, y: number, e: PointerEvent) => void; hover?: (x: number, y: number, e: PointerEvent) => void }) {
  let id: number | null = null;
  const loc = (e: PointerEvent) => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as [number, number]; };
  const down = (e: PointerEvent) => {
    if (id !== null) return;
    const [x, y] = loc(e);
    if (cb.down && cb.down(x, y, e) === false) return;
    id = e.pointerId;
    try { el.setPointerCapture(e.pointerId); } catch (_) { /* not capturable */ }
    e.preventDefault();
  };
  const move = (e: PointerEvent) => {
    const [x, y] = loc(e);
    if (id === e.pointerId) { cb.move && cb.move(x, y, e); e.preventDefault(); }
    else if (id === null && e.pointerType === 'mouse' && cb.hover) cb.hover(x, y, e);
  };
  const up = (e: PointerEvent) => { if (id !== e.pointerId) return; id = null; const [x, y] = loc(e); cb.up && cb.up(x, y, e); };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
}

/** Press-and-hold with progress (wax seals, confirmations). Keyboard: Enter/Space held. */
export function hold(el: HTMLElement, ms: number, cb: { progress: (k: number) => void; done: () => void; start?: () => void; cancel?: () => void }) {
  let t0 = 0, raf = 0, active = false;
  const tick = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    cb.progress(k);
    if (k >= 1) { active = false; cb.done(); return; }
    raf = requestAnimationFrame(tick);
  };
  const start = (e?: Event) => { if (active) return; active = true; t0 = performance.now(); cb.start && cb.start(); raf = requestAnimationFrame(tick); if (e) e.preventDefault(); };
  // released after the full time but before a frame noticed (a busy or slow device): that still counts
  const stop = () => { if (!active) return; active = false; cancelAnimationFrame(raf); if (performance.now() - t0 >= ms) { cb.progress(1); cb.done(); return; } cb.progress(0); cb.cancel && cb.cancel(); };
  el.addEventListener('pointerdown', (e) => { try { el.setPointerCapture(e.pointerId); } catch (_) { /* ok */ } start(e); });
  el.addEventListener('pointerup', stop); el.addEventListener('pointercancel', stop); el.addEventListener('pointerleave', stop);
  el.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) start(e); });
  el.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') stop(); });
}

export function prefersReducedMotion() {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
}
