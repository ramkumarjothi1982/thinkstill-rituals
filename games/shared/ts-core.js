/* ThinkStill game core (instance-scoped)
 * Every game runs inside one root element and one environment object, so it can be mounted by a
 * Framer code component, a claude.ai artifact or a plain page, and fully torn down on unmount.
 *
 * Integration with the existing ThinkStill product (same keys as the Reset Console v40):
 *   __ts_chat_theme_v181          dark / bright choice shared with the consoles
 *   __ts_thinkstill_experience_v1 momentum XP (+12 per completed game, +6 for a rating)
 *   __ts_shift_records_v1         shift ratings that feed the console's adaptive "Reset DNA"
 *   __ts_growth_events_v1         product analytics events (never user text)
 *   __ts_reset_shared_media_v1    avatars / music published by Reset (read only)
 */
(function (env) {
  'use strict';
  const TS = (env.TS = env.TS || {});
  const opts = (TS.opts = env.opts || {});
  const root = (TS.root = env.root);

  /* ---------- lifecycle: every listener, timer and loop is registered for cleanup ---------- */
  const disposers = [];
  TS.destroyed = false;
  TS.onDestroy = (fn) => { disposers.push(fn); };
  TS.listen = (target, type, fn, o) => {
    if (!target || !target.addEventListener) return () => {};
    target.addEventListener(type, fn, o);
    const off = () => { try { target.removeEventListener(type, fn, o); } catch (e) { /* gone */ } };
    disposers.push(off);
    return off;
  };
  const timers = new Set();
  TS.later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); if (!TS.destroyed) fn(); }, ms);
    timers.add(id);
    return id;
  };
  TS.cancel = (id) => { clearTimeout(id); clearInterval(id); timers.delete(id); };
  TS.every = (fn, ms) => { const id = setInterval(() => { if (!TS.destroyed) fn(); }, ms); timers.add(id); return id; };
  TS.sleep = (ms) => new Promise(r => TS.later(r, ms));
  TS.destroy = () => {
    if (TS.destroyed) return;
    TS.emit('destroy');
    TS.destroyed = true;
    timers.forEach(id => { clearTimeout(id); clearInterval(id); });
    timers.clear();
    disposers.splice(0).reverse().forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
    try { root.innerHTML = ''; } catch (e) { /* ignore */ }
  };

  /* ---------- storage (never throws) ---------- */
  const ls = (() => { try { return window.localStorage; } catch (e) { return null; } })();
  const rawGet = (key) => { try { return ls ? ls.getItem(key) : null; } catch (e) { return null; } };
  const rawSet = (key, v) => { try { if (ls) ls.setItem(key, v); } catch (e) { /* storage unavailable */ } };
  TS.store = {
    get(key, fallback) { const v = rawGet('thinkstill:' + key); if (v == null) return fallback; try { return JSON.parse(v); } catch (e) { return fallback; } },
    set(key, value) { rawSet('thinkstill:' + key, JSON.stringify(value)); },
    getRaw: rawGet, setRaw: rawSet
  };
  const lsJson = (key, fb) => { const v = rawGet(key); if (!v) return fb; try { const p = JSON.parse(v); return p == null ? fb : p; } catch (e) { return fb; } };

  /* ---------- events ---------- */
  const listeners = {};
  TS.on = (name, fn) => { (listeners[name] = listeners[name] || []).push(fn); return () => TS.off(name, fn); };
  TS.off = (name, fn) => { listeners[name] = (listeners[name] || []).filter(f => f !== fn); };
  TS.emit = (name, data) => (listeners[name] || []).slice().forEach(fn => { try { fn(data); } catch (e) { console.error(e); } });

  /* ---------- settings ---------- */
  TS.VIBES = ['Jolly', 'Cheeky', 'Unfiltered'];
  TS.INTENSITIES = ['Gentle', 'Standard', 'Full'];
  const defaults = { vibe: 'Jolly', intensity: 'Standard', theme: 'system', sound: true, motion: 'system' };
  const settings = Object.assign({}, defaults, TS.store.get('settings', {}));
  ['vibe', 'intensity', 'theme', 'motion'].forEach(k => { if (opts[k]) settings[k] = opts[k]; });
  if (typeof opts.sound === 'boolean') settings.sound = opts.sound;
  try {
    const q = new URLSearchParams(window.location.search);
    ['vibe', 'intensity', 'theme', 'motion'].forEach(k => { if (q.get(k)) settings[k] = q.get(k); });
    if (q.get('sound')) settings.sound = q.get('sound') !== '0';
  } catch (e) { /* no query string */ }
  if (!TS.VIBES.includes(settings.vibe)) settings.vibe = 'Jolly';
  if (!TS.INTENSITIES.includes(settings.intensity)) settings.intensity = 'Standard';
  if (!['system', 'dark', 'bright'].includes(settings.theme)) settings.theme = 'system';
  TS.settings = settings;

  TS.set = (key, value) => {
    settings[key] = value;
    TS.store.set('settings', settings);
    if (key === 'theme') { if (value === 'dark' || value === 'bright') rawSet('__ts_chat_theme_v181', value); applyTheme(); }
    if (key === 'motion') applyMotion();
    TS.emit('settings', { key, value });
  };

  /* Theme: the game's own choice, then the console's shared choice, then the host page, then the OS. */
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  TS.scene = () => {
    if (settings.theme === 'dark' || settings.theme === 'bright') return settings.theme;
    const consoleTheme = rawGet('__ts_chat_theme_v181');
    if (consoleTheme === 'dark' || consoleTheme === 'bright') return consoleTheme;
    const host = document.documentElement.getAttribute('data-theme');
    if (host === 'dark') return 'dark';
    if (host === 'light') return 'bright';
    return mq && mq.matches ? 'dark' : 'bright';
  };
  function applyTheme() {
    const s = TS.scene();
    if (root.getAttribute('data-scene') !== s) { root.setAttribute('data-scene', s); TS.emit('theme', s); }
  }
  if (mq) TS.listen(mq, 'change', applyTheme);
  TS.listen(window, 'storage', (e) => { if (e.key === '__ts_chat_theme_v181') applyTheme(); });
  try {
    const mo = new MutationObserver(applyTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    TS.onDestroy(() => mo.disconnect());
  } catch (e) { /* old browser */ }

  const rmq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  TS.reduced = () => settings.motion === 'reduced' || (settings.motion === 'system' && !!(rmq && rmq.matches));
  function applyMotion() { root.classList.toggle('reduced-motion', TS.reduced()); TS.emit('motion', TS.reduced()); }
  if (rmq) TS.listen(rmq, 'change', applyMotion);
  TS.intensity = () => ({ Gentle: 0, Standard: 1, Full: 2 }[settings.intensity] ?? 1);

  TS.isDev = () => { try { const h = window.location.hostname; return window.location.protocol === 'file:' || h === 'localhost' || h === '127.0.0.1' || /[?&]tsgdev=1/.test(window.location.search); } catch (e) { return false; } };

  /* ---------- host bridge (Framer component props, or a parent page via postMessage) ---------- */
  const inFrame = (() => { try { return window.parent && window.parent !== window; } catch (e) { return true; } })();
  TS.post = (msg) => {
    const m = Object.assign({ source: 'thinkstill-game' }, msg);
    if (typeof opts.onMessage === 'function') { try { opts.onMessage(m); } catch (e) { /* host error */ } }
    if (inFrame && !opts.noParentPost) { try { window.parent.postMessage(m, '*'); } catch (e) { /* ignore */ } }
  };
  TS.listen(window, 'message', (ev) => {
    const m = ev.data;
    if (!m || typeof m !== 'object' || m.source === 'thinkstill-game') return;
    if (m.type === 'thinkstill:init') {
      ['vibe', 'intensity', 'theme', 'motion', 'sound'].forEach(k => { if (m[k] != null) TS.set(k, m[k]); });
      if (m.aiBridge) TS.aiBridge = true;
      TS.emit('init', m);
    }
    TS.emit('host-message', m);
  });
  TS.exit = (reason) => {
    TS.track('exit', { reason: reason || 'close' });
    TS.post({ type: 'thinkstill:exit', reason: reason || 'close' });
    if (typeof opts.onExit === 'function') { try { opts.onExit(reason || 'close'); } catch (e) { /* host */ } }
    TS.emit('exit');
  };

  /* ---------- metrics: game events + the console's growth events. Free text never leaves. ---------- */
  TS.game = { id: 'unknown', mode: 'unknown', family: 'EXPLORE', parent: '', startedAt: 0, session: '' };
  TS.newSession = () => { TS.game.session = Date.now().toString(36) + Math.random().toString(36).slice(2, 7); TS.game.startedAt = Date.now(); return TS.game.session; };
  const clean = (o) => { const c = {}; Object.keys(o || {}).forEach(k => { const v = o[k]; if (typeof v === 'string' && v.length > 48) return; if (v && typeof v === 'object') return; c[k] = v; }); return c; };
  TS.track = (name, data) => {
    const evt = Object.assign({ name, game: TS.game.id, mode: TS.game.mode, session: TS.game.session, t: Date.now() }, clean(data));
    const log = TS.store.get('events', []);
    log.push(evt);
    TS.store.set('events', log.slice(-400));
    const growth = lsJson('__ts_growth_events_v1', []);
    growth.push(Object.assign({ name: 'game_' + name, at: evt.t, product: TS.game.mode, game: TS.game.id }, clean(data)));
    rawSet('__ts_growth_events_v1', JSON.stringify(growth.slice(-500)));
    try { window.dispatchEvent(new CustomEvent('thinkstill:growth', { detail: { name: 'game_' + name, game: TS.game.id } })); } catch (e) { /* old browser */ }
    if (typeof opts.onEvent === 'function') { try { opts.onEvent(evt); } catch (e) { /* host */ } }
    TS.post({ type: 'thinkstill:event', event: evt });
    TS.emit('track', evt);
  };

  /* Momentum XP shared with the Reset Console (same structure and constants). */
  TS.awardXP = (points, sig) => {
    const raw = lsJson('__ts_thinkstill_experience_v1', null);
    const xp = { xp: 0, ritualSigs: [], responseSigs: [] };
    if (raw && typeof raw === 'object') { xp.xp = Math.max(0, Math.floor(Number(raw.xp || 0))); xp.ritualSigs = Array.isArray(raw.ritualSigs) ? raw.ritualSigs : []; xp.responseSigs = Array.isArray(raw.responseSigs) ? raw.responseSigs : []; }
    const list = points >= 12 ? xp.ritualSigs : xp.responseSigs;
    if (sig && list.includes(sig)) return xp.xp;
    if (sig) list.push(sig);
    xp.xp += points;
    rawSet('__ts_thinkstill_experience_v1', JSON.stringify({ xp: xp.xp, ritualSigs: xp.ritualSigs.slice(-5000), responseSigs: xp.responseSigs.slice(-5000) }));
    return xp.xp;
  };
  TS.level = (xpIn) => {
    const safe = Math.max(0, Math.floor(Number(xpIn || 0)));
    let level = 1, start = 0, need = 60;
    while (safe >= start + need && level < 100) { start += need; level += 1; need = Math.min(300, 60 + (level - 1) * 20); }
    return { level, into: safe - start, need, pct: Math.min(100, ((safe - start) / need) * 100) };
  };
  /* A 0-3 shift rating, in the console's ShiftRecord shape, so its adaptive router learns from games too. */
  TS.recordShift = (rating) => {
    const sig = 'game:' + TS.game.id + ':' + TS.game.session;
    const records = lsJson('__ts_shift_records_v1', {});
    records[sig] = { rating: Math.max(0, Math.min(3, Math.round(rating))), family: TS.game.family, ritualId: 'GAME-' + TS.game.id.toUpperCase(), thinkingError: TS.game.parent, preciseSubpattern: '', updatedAt: Date.now() };
    rawSet('__ts_shift_records_v1', JSON.stringify(records));
  };
  /* Shared avatars and music published by the Reset Console (null when absent). */
  TS.sharedMedia = () => { const m = lsJson('__ts_reset_shared_media_v1', null); return m && typeof m === 'object' ? m : null; };

  /* ---------- helpers ---------- */
  TS.$ = (sel, r) => (r || root).querySelector(sel);
  TS.$$ = (sel, r) => Array.from((r || root).querySelectorAll(sel));
  TS.h = (tag, attrs, ...kids) => {
    const node = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.entries(v).forEach(([sk, sv]) => { if (sk.startsWith('--')) node.style.setProperty(sk, sv); else node.style[sk] = sv; });
      else node.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach(k => { if (k != null && k !== false) node.append(k.nodeType ? k : document.createTextNode(String(k))); });
    return node;
  };
  TS.layer = () => TS.$('.tsg-overlays') || root; // overlays (sheets, toasts, support) live inside the root
  TS.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  TS.lerp = (a, b, t) => a + (b - a) * t;
  TS.ease = {
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    outElastic: t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
    inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2
  };
  TS.rng = (seed) => {
    let s = typeof seed === 'string' ? Array.from(seed).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 2166136261) : (seed >>> 0) || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  };
  TS.pick = (arr, r) => arr[Math.floor((r ? r() : Math.random()) * arr.length) % arr.length];
  TS.words = (s, n) => { const w = String(s || '').trim().split(/\s+/).filter(Boolean); return w.length <= n ? w.join(' ') : w.slice(0, n).join(' ') + '…'; };
  TS.clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 280);
  TS.line = (lines, r) => {
    if (!lines) return '';
    if (Array.isArray(lines)) return TS.pick(lines, r);
    const set = lines[settings.vibe] || lines.Jolly || Object.values(lines)[0];
    return Array.isArray(set) ? TS.pick(set, r) : set;
  };
  TS.buzz = (pattern) => { if (TS.reduced() && Array.isArray(pattern)) pattern = pattern[0]; try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* refused */ } };

  /* Expression art: the same GitHub base the Release Arcade uses, overridable from Framer. */
  TS.ASSET_BASE = String(opts.assetBase || env.assetBase || 'https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/main/bubble-expressions/').replace(/\/?$/, '/');
  TS.face = (slug, e) => {
    const key = slug + '_' + e;
    if (env.assets && env.assets[key]) return env.assets[key];
    return TS.ASSET_BASE + key + '.webp';
  };

  /* ---------- per-game scope: a game gets its own element and lifecycle inside the console ----------
     Everything registered through a scope (timers, listeners, loops, event subscriptions) is released when
     the console unmounts that game, so 100+ games can share one engine without leaking. */
  TS.scope = (el) => {
    const S = Object.create(TS);
    const offs = [], ids = new Set();
    let dead = false;
    S.root = el; S.destroyed = false; S.parent = TS;
    S.$ = (sel, r) => (r || el).querySelector(sel);
    S.$$ = (sel, r) => Array.from((r || el).querySelectorAll(sel));
    S.onDestroy = (fn) => { offs.push(fn); };
    S.listen = (target, type, fn, o) => {
      if (!target || !target.addEventListener) return () => {};
      target.addEventListener(type, fn, o);
      const off = () => { try { target.removeEventListener(type, fn, o); } catch (e) { /* gone */ } };
      offs.push(off);
      return off;
    };
    S.later = (fn, ms) => { const id = TS.later(() => { ids.delete(id); if (!dead) fn(); }, ms); ids.add(id); return id; };
    S.every = (fn, ms) => { const id = TS.every(() => { if (!dead) fn(); }, ms); ids.add(id); return id; };
    S.cancel = (id) => { TS.cancel(id); ids.delete(id); };
    S.sleep = (ms) => new Promise(r => S.later(r, ms)); // never resolves after unmount, so awaiting code simply stops
    S.on = (name, fn) => { const off = TS.on(name, fn); offs.push(off); return off; };
    S.loop = (fn) => { const ctl = TS.loop((dt, t) => { if (!dead) fn(dt, t); }); offs.push(() => ctl.stop()); return ctl; };
    S.Stage = class extends TS.Stage { constructor() { super(el); } };
    S.destroy = () => {
      if (dead) return;
      dead = true; S.destroyed = true;
      ids.forEach(id => TS.cancel(id)); ids.clear();
      offs.splice(0).reverse().forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
      try { el.innerHTML = ''; } catch (e) { /* gone */ }
    };
    return S;
  };

  /* ---------- scene manager ---------- */
  TS.Stage = class Stage {
    constructor(scopeEl) { this.current = null; this.scenes = {}; this.token = 0; this.el = scopeEl || null; }
    add(name, scene) { this.scenes[name] = scene; scene.name = name; return this; }
    async go(name, data, o) {
      const next = this.scenes[name];
      if (!next) throw new Error('No scene ' + name);
      const token = ++this.token;
      const prev = this.current;
      this.current = next;
      const t = TS.reduced() ? 0 : ((o && o.duration) ?? 480);
      TS.track('scene', { scene: name });
      if (prev && prev.exit) { try { prev.exit(); } catch (e) { console.error(e); } }
      if (prev && prev.el && prev !== next) { prev.el.classList.add('scene-out'); prev.el.style.setProperty('--scene-t', t + 'ms'); }
      if (t) await TS.sleep(t * 0.5);
      if (token !== this.token) return; // a newer go() took over
      Object.values(this.scenes).forEach(sc => { const s = sc.el; if (s && s !== next.el) { s.hidden = true; s.classList.remove('scene-out', 'scene-in'); } });
      if (next.el) {
        next.el.hidden = false;
        next.el.style.setProperty('--scene-t', t + 'ms');
        next.el.classList.remove('scene-out');
        next.el.classList.add('scene-in');
        void next.el.offsetWidth;
        next.el.classList.add('scene-in-active');
        TS.later(() => next.el.classList.remove('scene-in', 'scene-in-active'), t + 40);
      }
      if (next.enter) await next.enter(data || {});
    }
  };

  /* Animation frame loop that pauses on hidden tabs and stops on destroy. */
  TS.loop = (fn) => {
    let raf = 0, last = performance.now(), running = true, frames = 0;
    const tick = (now) => {
      if (!running || TS.destroyed) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      try { fn(dt, now / 1000); } catch (e) { console.error(e); }
      // Framer canvas / thumbnails: draw a settled frame, then stop spending battery.
      if (opts.staticRender && ++frames > 90) { running = false; return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const ctl = { stop() { running = false; cancelAnimationFrame(raf); }, start() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); } } };
    TS.onDestroy(() => ctl.stop());
    return ctl;
  };

  TS.token = (name) => getComputedStyle(root).getPropertyValue(name).trim();
  TS.fitCanvas = (canvas, w, h, maxDpr) => {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr || 2);
    const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, dpr };
  };

  /* Fonts: inject a Google Fonts stylesheet once per document (Framer pages have no <head> access). */
  TS.fonts = (href) => {
    if (!href) return;
    if (document.querySelector('link[data-tsg-font="' + href + '"]')) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.setAttribute('data-tsg-font', href);
    document.head.appendChild(l);
  };
  TS.css = (id, text) => {
    if (root.querySelector('style[data-tsg-css="' + id + '"]')) return;
    const s = document.createElement('style'); s.setAttribute('data-tsg-css', id); s.textContent = text;
    const prev = root.querySelectorAll('style[data-tsg-css]'); // keep declaration order: shared first, game after
    if (prev.length) prev[prev.length - 1].after(s); else root.prepend(s);
  };

  /* Boot: styles shipped with the build (Framer has no stylesheet of its own), then theme and motion. */
  root.classList.add('tsg');
  if (env.css) Object.keys(env.css).forEach(k => TS.css(k, env.css[k]));
  applyTheme();
  applyMotion();
  TS.ready = (fn) => {
    const go = () => {
      const hot = window.claude && window.claude.hot;
      if (hot && hot.ready && !opts.framer) hot.ready(fn); else fn((hot && hot.data) || {});
    };
    if (document.readyState === 'loading') TS.listen(document, 'DOMContentLoaded', go); else go();
  };
})(window.TSG_ENV);
