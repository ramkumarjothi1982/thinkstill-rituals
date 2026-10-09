/* ThinkStill shared game chrome (instance-scoped): top bar, settings sheet, generic sheets, toasts,
 * the optional "did that help?" check, the privacy-first share sheet, typed speech, and the guide hand.
 *
 * The guide hand follows the Release Arcade's arrow grammar (Creative Standards: "an arrow in every game,
 * every step"): a white cartoon glove with a navy outline performs the exact gesture on the live target,
 * a gold 3D chevron bobs toward it, and a short uppercase label (2-4 words) says what to do. It fades the
 * instant a finger lands, re-shows after 4 s idle, re-shows immediately when the step changes, and sits
 * still with a gentle opacity pulse under reduced motion.
 */
(function (env) {
  'use strict';
  const TS = env.TS;
  const h = TS.h;
  const UI = (TS.ui = {});

  const ICON = {
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  UI.ICON = ICON;

  /* Overlays live inside the root, above the game, so nothing escapes into the host page. */
  const overlays = h('div', { class: 'tsg-overlays' });
  TS.root.append(overlays);

  function iconButton(name, label, onClick) {
    const b = h('button', { type: 'button', class: 'ts-icon-btn', 'aria-label': label, title: label, html: ICON[name] });
    b.addEventListener('click', onClick);
    return b;
  }
  UI.iconButton = iconButton;

  /* Top bar: brand + game name on the left, sound and settings (and an optional close) on the right. */
  UI.bar = (o) => {
    o = o || {};
    if (TS.opts.hideBar) return null;
    const soundBtn = iconButton(TS.settings.sound ? 'sound' : 'mute', TS.settings.sound ? 'Mute sound' : 'Turn sound on', () => TS.set('sound', !TS.settings.sound));
    TS.on('settings', ({ key, value }) => {
      if (key !== 'sound') return;
      soundBtn.innerHTML = value ? ICON.sound : ICON.mute;
      soundBtn.setAttribute('aria-label', value ? 'Mute sound' : 'Turn sound on');
    });
    const closeBtn = typeof TS.opts.onExit === 'function' ? iconButton('close', 'Leave game', () => TS.exit('close')) : null;
    const bar = h('header', { class: 'ts-bar' },
      h('div', { class: 'ts-brand' },
        h('span', { class: 'ts-brand-mark', 'aria-hidden': 'true' }),
        h('span', { class: 'ts-brand-name', text: 'ThinkStill' }),
        h('span', { class: 'ts-brand-mode', text: o.mode || '' })
      ),
      h('div', { class: 'ts-bar-actions' }, soundBtn, iconButton('gear', 'Game settings', () => UI.settings()), closeBtn)
    );
    TS.root.append(bar);
    return bar;
  };

  function segmented(label, key, options, labels) {
    const id = 'tsg-seg-' + key + '-' + Math.random().toString(36).slice(2, 6);
    const group = h('div', { class: 'ts-seg', role: 'radiogroup', 'aria-labelledby': id });
    options.forEach((v, i) => {
      const b = h('button', { type: 'button', role: 'radio', 'aria-checked': String(TS.settings[key] === v), class: 'ts-seg-opt', text: labels ? labels[i] : v });
      b.addEventListener('click', () => {
        TS.set(key, v);
        TS.$$('.ts-seg-opt', group).forEach(x => x.setAttribute('aria-checked', String(x === b)));
      });
      group.append(b);
    });
    return h('div', { class: 'ts-field' }, h('span', { class: 'ts-field-label', id, text: label }), group);
  }

  /* Generic bottom sheet. Returns { wrap, close }. */
  UI.sheet = (o) => {
    o = o || {};
    const prev = overlays.querySelector('.ts-sheet-wrap'); if (prev) prev.remove();
    let closed = false;
    const close = () => {
      if (closed) return; closed = true;
      wrap.classList.add('ts-closing');
      TS.later(() => wrap.remove(), TS.reduced() ? 0 : 220);
      if (o.onClose) o.onClose();
    };
    const sheet = h('section', { class: 'ts-sheet' + (o.className ? ' ' + o.className : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title || 'Panel' },
      h('div', { class: 'ts-sheet-head' }, h('h2', { text: o.title || '' }), iconButton('close', 'Close', close)),
      o.note ? h('p', { class: 'ts-sheet-note', text: o.note }) : null,
      o.body || null
    );
    const wrap = h('div', { class: 'ts-sheet-wrap' }, h('div', { class: 'ts-sheet-scrim', onclick: close }), sheet);
    wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    overlays.append(wrap);
    TS.later(() => { const b = sheet.querySelector(o.focus || 'button'); if (b) b.focus(); }, 40);
    return { wrap, sheet, close };
  };

  /* Product-wide preferences. */
  UI.settings = () => UI.sheet({
    title: 'Settings', focus: '.ts-seg-opt[aria-checked="true"]',
    body: h('div', { class: 'ts-fields' },
      segmented('Vibe', 'vibe', TS.VIBES),
      segmented('Intensity', 'intensity', TS.INTENSITIES),
      segmented('Look', 'theme', ['system', 'dark', 'bright'], ['Auto', 'Dark', 'Bright']),
      segmented('Motion', 'motion', ['system', 'reduced'], ['Auto', 'Reduced']),
      h('p', { class: 'ts-sheet-note', text: 'Vibe changes how characters talk. Intensity changes speed, timing windows and spectacle.' })
    )
  });

  /* Toast */
  UI.toast = (msg, ms) => {
    const old = overlays.querySelector('.ts-toast'); if (old) old.remove();
    const t = h('div', { class: 'ts-toast', role: 'status', text: msg });
    overlays.append(t);
    TS.later(() => t.classList.add('ts-toast-out'), ms || 2400);
    TS.later(() => t.remove(), (ms || 2400) + 400);
  };

  /* Optional one-tap usefulness check. Never blocks the ending. */
  UI.helpCheck = (container, o) => {
    o = o || {};
    const wrap = h('div', { class: 'ts-help' }, h('span', { class: 'ts-help-q', text: o.question || 'Did that help?' }));
    const row = h('div', { class: 'ts-help-row' });
    [['yes', 'Yes'], ['bit', 'A bit'], ['no', 'Not really']].forEach(([v, label]) => {
      const b = h('button', { type: 'button', class: 'ts-chip', text: label });
      b.addEventListener('click', () => {
        TS.track('helpful', { value: v });
        TS.recordShift({ yes: 3, bit: 2, no: 0 }[v]);
        TS.awardXP(6, 'game:' + TS.game.id + ':' + TS.game.session + ':rated');
        row.replaceWith(h('span', { class: 'ts-help-thanks', text: v === 'no' ? 'Thanks for saying so. That helps us make better games.' : 'Thanks. Noted, privately.' }));
        if (o.onAnswer) o.onAnswer(v);
      });
      row.append(b);
    });
    wrap.append(row);
    container.append(wrap);
    return wrap;
  };

  /* Share sheet: always previews exactly what would be shared. */
  UI.share = async (canvas, o) => {
    o = o || {};
    TS.track('share_preview', {});
    const url = canvas.toDataURL('image/png');
    const status = h('p', { class: 'ts-share-status', text: o.note || 'Nothing you typed is on this card.' });
    const saveBtn = h('button', { type: 'button', class: 'ts-btn', text: 'Save image' });
    saveBtn.addEventListener('click', async () => {
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      const name = (o.filename || 'thinkstill') + '.png';
      try {
        const file = blob && new File([blob], name, { type: 'image/png' });
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: o.title || 'ThinkStill' });
          TS.track('share_done', { via: 'web-share' }); status.textContent = 'Shared.'; return;
        }
      } catch (e) { if (e && e.name === 'AbortError') return; }
      try {
        const dl = window.claude && window.claude.use && !TS.opts.framer ? await window.claude.use('downloads') : null;
        if (dl) { await dl.save({ filename: name, data: blob }); TS.track('share_done', { via: 'download' }); status.textContent = 'Saved.'; return; }
      } catch (e) { /* declined */ }
      try {
        if (TS.opts.framer || !window.claude) {
          const a = document.createElement('a'); a.href = url; a.download = name; a.rel = 'noopener';
          document.body.append(a); a.click(); a.remove();
          TS.track('share_done', { via: 'link' }); status.textContent = 'Saved to your downloads.'; return;
        }
      } catch (e) { /* blocked */ }
      status.textContent = 'Press and hold the image to save it.';
    });
    UI.sheet({ title: o.heading || 'Share card', className: 'ts-share', body: h('div', { class: 'ts-share-body' }, h('img', { src: url, alt: o.alt || 'Share card preview', class: 'ts-share-img' }), status, h('div', { class: 'ts-share-actions' }, saveBtn)) });
  };

  /* Speech that types its text. Resolves when typing ends. A newer call on the same element wins. */
  UI.say = (el, text, o) => {
    o = o || {};
    el.hidden = false;
    el.classList.remove('ts-say-in');
    void el.offsetWidth;
    el.classList.add('ts-say-in');
    const target = o.target || el;
    const token = (target.__tsgSay = (target.__tsgSay || 0) + 1);
    if (TS.reduced() || o.instant) { target.textContent = text; return Promise.resolve(); }
    target.textContent = '';
    const chars = Array.from(text);
    const speed = o.speed || 18;
    const shown = document.createTextNode('');
    const rest = document.createElement('span');
    rest.className = 'ts-say-rest'; rest.setAttribute('aria-hidden', 'true'); rest.textContent = text;
    target.append(shown, rest);
    return new Promise((resolve) => {
      let i = 0;
      const step = () => {
        if (target.__tsgSay !== token) { resolve(); return; }
        i = Math.min(chars.length, i + 2);
        if (i >= chars.length) { target.textContent = text; resolve(); return; }
        shown.data = chars.slice(0, i).join('');
        rest.textContent = chars.slice(i).join('');
        if (o.tick && i % 6 === 0) o.tick();
        TS.later(step, speed);
      };
      step();
    });
  };

  /* ------------------------------------------------------------------ guide hand ------------------------------------------------------------------ */
  const HAND = '<svg class="tsg-hand" viewBox="0 0 64 64" aria-hidden="true"><g fill="#fff" stroke="#1b1650" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
    '<path d="M14.5 37c-4.6-2.6-9.6.6-7.4 5.6l5.6 9.4"/>' +
    '<rect x="13" y="29" width="36" height="25" rx="11"/>' +
    '<circle cx="30" cy="31" r="6"/><circle cx="38.5" cy="31.5" r="6"/><circle cx="46" cy="34" r="5.2"/>' +
    '<rect x="15.5" y="3" width="11" height="34" rx="5.5"/>' +
    '<rect x="20" y="51" width="27" height="10" rx="4"/>' +
    '</g><path d="M26 42h14M27 47h12" stroke="#1b1650" stroke-width="2" stroke-linecap="round" opacity=".5"/></svg>';
  const CHEVRON = '<svg class="tsg-chev" viewBox="0 0 44 44" aria-hidden="true"><defs><linearGradient id="tsgGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF0A6"/><stop offset=".45" stop-color="#FFC531"/><stop offset="1" stop-color="#E07A00"/></linearGradient></defs>' +
    '<path d="M15 5h14v15h9L22 39 6 20h9z" fill="url(#tsgGold)" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>';

  const G = UI.guide = (() => {
    const layer = h('div', { class: 'tsg-guide', 'aria-hidden': 'true', hidden: true });
    const halos = h('div', { class: 'tsg-guide-halos' });
    const anchor = h('div', { class: 'tsg-guide-anchor' });
    const demo = h('div', { class: 'tsg-guide-demo' });
    const orbit = h('div', { class: 'tsg-guide-orbit' });
    const handWrap = h('div', { class: 'tsg-guide-handwrap', html: HAND });
    const ring1 = h('span', { class: 'tsg-guide-ripple' }), ring2 = h('span', { class: 'tsg-guide-ripple r2' });
    const holdRing = h('span', { class: 'tsg-guide-holdring', html: '<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" pathLength="100"/></svg>' });
    const path = h('span', { class: 'tsg-guide-path' });
    const pointer = h('div', { class: 'tsg-guide-pointer' }, h('span', { class: 'tsg-guide-label' }), h('span', { class: 'tsg-guide-chevwrap', html: CHEVRON }));
    orbit.append(handWrap);
    demo.append(path, ring1, ring2, holdRing, orbit);
    anchor.append(demo, pointer);
    layer.append(halos, anchor);
    const sr = h('div', { class: 'tsg-sr', 'aria-live': 'polite' });
    overlays.append(layer, sr);
    const labelEl = pointer.querySelector('.tsg-guide-label');

    let spec = null, visible = false, showTimer = 0, idleTimer = 0, raf = 0, frame = 0, lastKey = '', labelW = 0;
    const learnedKey = () => 'guide-learned:' + TS.game.id;
    const veteran = () => (TS.store.get(learnedKey(), 0) || 0) >= 2;
    const idleMs = () => (spec && spec.idle) || (veteran() ? 6000 : 4000);

    function targetPoint() {
      if (!spec) return null;
      const rr = TS.root.getBoundingClientRect();
      const scale = rr.width && TS.root.offsetWidth ? rr.width / TS.root.offsetWidth : 1; // Framer canvas zoom
      const rel = (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - rr.left) / scale, y: (r.top - rr.top) / scale, w: r.width / scale, h: r.height / scale }; };
      let t = spec.target;
      if (typeof t === 'function') t = t();
      if (!t) return null;
      if (Array.isArray(t)) {
        const list = t.filter(el => el && el.isConnected && el.getClientRects().length);
        if (!list.length) return null;
        const rects = list.map(rel);
        // point at the top row (or the bottom row with place:'below') so the label sits outside the set, not over an option
        const below = spec.place === 'below';
        const edge = below ? Math.max(...rects.map(r => r.y + r.h)) : Math.min(...rects.map(r => r.y));
        const row = rects.filter(r => (below ? Math.abs(r.y + r.h - edge) : Math.abs(r.y - edge)) < 6);
        const a = row[Math.floor((row.length - 1) / 2)] || rects[0];
        return { x: a.x + a.w * (spec.ox ?? 0.5), y: a.y + a.h * (spec.oy ?? (below ? 0.62 : 0.38)), rects };
      }
      if (t.nodeType === 1) {
        if (!t.isConnected || !t.getClientRects().length) return null;
        const r = rel(t);
        return { x: r.x + r.w * (spec.ox ?? 0.5), y: r.y + r.h * (spec.oy ?? 0.5), rects: [r] };
      }
      if (typeof t.x === 'number') return { x: t.x, y: t.y, rects: null };
      return null;
    }

    function place() {
      const p = targetPoint();
      if (!p) { layer.classList.add('tsg-guide-lost'); return; }
      layer.classList.remove('tsg-guide-lost');
      const W = TS.root.offsetWidth || 390, H = TS.root.offsetHeight || 700;
      let above = spec.place === 'below' ? false : spec.place === 'above' ? true : p.y > 120;
      if (!above && p.y + 150 > H) above = true;   // never push the label off the bottom
      if (above && p.y < 70 && p.y + 150 <= H) above = false;
      const key = Math.round(p.x / 2) + ':' + Math.round(p.y / 2) + ':' + above + ':' + W;
      if (key !== lastKey) {
        lastKey = key;
        anchor.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)';
        anchor.classList.toggle('tsg-below', !above);
        if (!labelW) labelW = labelEl.offsetWidth || 120;
        const half = labelW / 2, margin = 12;
        const shift = Math.max(margin + half - p.x, Math.min(0, W - margin - half - p.x));
        pointer.style.setProperty('--shift', shift.toFixed(1) + 'px');
        if (spec.g === 'choose' && p.rects) {
          halos.innerHTML = '';
          p.rects.forEach((r, i) => halos.append(h('span', { class: 'tsg-halo', style: { left: (r.x - 5) + 'px', top: (r.y - 5) + 'px', width: (r.w + 10) + 'px', height: (r.h + 10) + 'px', '--i': String(i) } })));
        } else if (halos.firstChild) halos.innerHTML = '';
      }
    }
    function tick() {
      raf = 0;
      if (!visible || TS.destroyed) return;
      if (frame++ % 3 === 0) place();
      raf = requestAnimationFrame(tick);
    }
    function show() {
      if (!spec || TS.destroyed || TS.opts.staticRender) return;
      TS.cancel(showTimer);
      layer.hidden = false;
      layer.className = 'tsg-guide g-' + (spec.g || 'tap') + (TS.reduced() ? ' tsg-calm' : '');
      // every gesture variable lives on the anchor, so the demo AND the label/chevron can use it
      const d = spec.d || 80, dir = spec.dir || 'r';
      const vec = spec.dx != null || spec.dy != null ? [spec.dx || 0, spec.dy || 0] : ({ r: [d, 0], l: [-d, 0], u: [0, -d], d: [0, d], ur: [d * 0.7, -d * 0.7], ul: [-d * 0.7, -d * 0.7], dr: [d * 0.7, d * 0.7], dl: [-d * 0.7, d * 0.7] }[dir] || [d, 0]);
      anchor.style.setProperty('--r', (spec.r || 60) + 'px');
      anchor.style.setProperty('--d', d + 'px');
      anchor.style.setProperty('--dx', vec[0].toFixed(1) + 'px');
      anchor.style.setProperty('--dy', vec[1].toFixed(1) + 'px');
      anchor.style.setProperty('--len', Math.hypot(vec[0], vec[1]).toFixed(1) + 'px');
      anchor.style.setProperty('--ang', (Math.atan2(vec[1], vec[0]) * 180 / Math.PI).toFixed(1) + 'deg');
      anchor.style.setProperty('--ms', (spec.ms || 1800) + 'ms');
      demo.setAttribute('data-dir', dir);
      if (labelEl.textContent !== spec.label) { labelEl.textContent = spec.label || ''; labelW = 0; }
      if (sr.textContent !== spec.label) sr.textContent = spec.label || '';
      lastKey = '';
      place();
      void layer.offsetWidth;
      layer.classList.add('tsg-on');
      visible = true;
      if (!raf) raf = requestAnimationFrame(tick);
      TS.emit('guide', { visible: true, label: spec.label, g: spec.g, id: spec.id });
    }
    function hide() {
      TS.cancel(showTimer);
      if (!visible) return;
      visible = false;
      layer.classList.remove('tsg-on');
      showTimer = TS.later(() => { if (!visible) layer.hidden = true; }, 180);
      TS.emit('guide', { visible: false, label: spec && spec.label, g: spec && spec.g, id: spec && spec.id });
    }
    const downs = new Map(); // pointers currently pressed in the game
    const pressing = () => { const now = performance.now(); downs.forEach((t, id) => { if (now - t > 30000) downs.delete(id); }); return downs.size > 0; };
    const lift = (e) => { downs.delete(e.pointerId); };
    TS.listen(window, 'pointerup', lift, { capture: true, passive: true });
    TS.listen(window, 'pointercancel', lift, { capture: true, passive: true });
    function armIdle() {
      TS.cancel(idleTimer);
      if (!spec || spec.once) return;
      const wake = () => { if (!spec || visible) return; if (pressing()) { idleTimer = TS.later(wake, 700); return; } show(); };
      idleTimer = TS.later(wake, idleMs());
    }
    /* Pointer down anywhere in the game hides the hand; idle brings it back (never mid-drag). */
    TS.listen(TS.root, 'pointerdown', (e) => {
      downs.set(e.pointerId, performance.now());
      if (!spec) return;
      if (e.target && e.target.closest && e.target.closest('.ts-sheet-wrap, .ts-support')) return;
      hide(); armIdle();
    }, { capture: true, passive: true });
    TS.listen(TS.root, 'keydown', () => { if (spec) { hide(); armIdle(); } }, { capture: true, passive: true });
    TS.on('motion', () => { if (visible) show(); });
    TS.on('destroy', () => { if (raf) cancelAnimationFrame(raf); });

    return {
      /* spec: { id, g: tap|hold|circle|sweep|drag|choose|type|still, target: Element | Element[] | () => ({x,y}) , label, r, d, dir, ms, delay, place, ox, oy } */
      set(next) {
        if (!next) { this.clear(); return; }
        const same = spec && spec.id === next.id;
        spec = next;
        if (same && visible) { show(); return; }
        hide();
        TS.cancel(showTimer); TS.cancel(idleTimer);
        showTimer = TS.later(show, next.delay ?? 700);
      },
      clear() { spec = null; TS.cancel(idleTimer); hide(); sr.textContent = ''; },
      progress() { hide(); armIdle(); },
      nudge() { if (spec) show(); },
      learned() { TS.store.set(learnedKey(), (TS.store.get(learnedKey(), 0) || 0) + 1); },
      state() { return { visible, label: spec && spec.label, g: spec && spec.g, id: spec && spec.id }; }
    };
  })();
  void G;
})(window.TSG_ENV);
