/* 003 Prediction Vault — Reframe · REFRAME · Uncertainty / Future Worry / Reassurance
 * Mechanism: prediction testing, a CBT behavioural experiment (Beck; Bennett-Levy et al. 2004, Oxford Guide to Behavioural
 * Experiments): write the feared prediction specifically, estimate its odds, set a check date, and compare with what really
 * happens. Due boxes are opened first, so over visits the archive calibrates the person's fears against reality.
 * Only { title, p, due, created, outcome } is stored, never the player's words.
 * Verb: seal (pick the prediction, turn the combination dial to set the odds, pick a check day, spin the wheel 1.5 turns).
 * Finale: the box glides into its slot glowing with its date, the door swings shut with gears turning, bolts throw,
 * a light sweep runs across the brass and gold dust hangs in the air.
 */
(function (env) {
  'use strict';
  /* No GPU (VMs, blocklisted devices): every canvas pixel is rasterised on the CPU, so the canvas runs at 1x and ~30 fps
   * there (even motion beats dropped frames). Devices with a GPU keep the crisp 2x, 60 fps picture. */
  let softMemo = null;
  function softwareGfx() {
    if (softMemo != null) return softMemo;
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl');
      if (!gl) return (softMemo = true);
      const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return (softMemo = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r));
    } catch (e) { return (softMemo = false); }
  }
  /* K.canvas with an opaque backing store: the scene covers every pixel, so the compositor never blends what's under it. */
  function opaqueCanvas(parent, o, S) {
    const c = document.createElement('canvas'); c.className = 'gk-canvas'; c.setAttribute('aria-hidden', 'true'); parent.append(c);
    const st = { el: c, g: null, w: 0, h: 0, dpr: 1 }, cbs = [];
    st.fit = () => {
      const w = c.clientWidth || parent.clientWidth, hh = c.clientHeight || parent.clientHeight; if (!w || !hh) return;
      const dpr = Math.min(window.devicePixelRatio || 1, o.maxDpr || 2), pw = Math.round(w * dpr), ph = Math.round(hh * dpr);
      if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
      st.g = st.g || c.getContext('2d', { alpha: false }); st.g.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.dpr = dpr; st.w = w; st.h = hh;
      cbs.forEach(f => { try { f(st); } catch (e) { console.error(e); } });
    };
    st.onResize = (f) => { cbs.push(f); if (st.w) f(st); };
    try { const ro = new ResizeObserver(() => st.fit()); ro.observe(c); S.onDestroy(() => ro.disconnect()); } catch (e) { S.listen(window, 'resize', st.fit); }
    st.fit();
    return st;
  }
  /* the kit's particles, drawn with cached glow sprites instead of a fresh gradient per particle per frame */
  function particleDrawer(K) {
    const cache = {}, TAU = Math.PI * 2;
    const glow = (col) => cache[col] || (cache[col] = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return c; })());
    return (g, P) => {
      for (const q of P.list) {
        const p = q.p, k = 1 - q.age / q.life, a = p.flicker ? k * (0.6 + 0.4 * Math.sin(q.age * 30 + q.ph)) : k, s = q.size * (p.grow ? 1 + (1 - k) * 1.6 : 1);
        g.globalAlpha = Math.max(0, Math.min(1, a));
        if (p.glow) g.drawImage(glow(q.col), q.x - s * 3, q.y - s * 3, s * 6, s * 6);
        g.fillStyle = q.col; g.strokeStyle = q.col;
        if (p.star) { K.starPath(g, q.x, q.y, s * 1.6, s * 0.6, 4, q.rot); g.fill(); }
        else if (p.rect) { g.save(); g.translate(q.x, q.y); g.rotate(q.rot); g.fillRect(-s / 2, -s / 4, s, s / 2); g.restore(); }
        else if (p.petal) { g.save(); g.translate(q.x, q.y); g.rotate(q.rot); g.beginPath(); g.ellipse(0, 0, s, s * 0.5, 0, 0, TAU); g.fill(); g.restore(); }
        else if (p.ring) { g.lineWidth = 1.2; g.beginPath(); g.arc(q.x, q.y, s, 0, TAU); g.stroke(); }
        else { g.beginPath(); g.arc(q.x, q.y, s, 0, TAU); g.fill(); }
      }
      g.globalAlpha = 1;
    };
  }
  (env.games = env.games || []).push({
    id: 'prediction-vault', mode: 'reframe', name: 'Prediction Vault', verb: 'seal', family: 'REFRAME', minutes: 2,
    parents: ['Uncertainty / Future Worry / Reassurance', 'Performance / Confidence'],
    cast: ['glitch'], poster: { char: 'glitch', mood: 'cool' },
    tagline: 'Seal your prediction in the vault. Reality opens it later.',
    why: 'For a fear about what will happen: write it as a prediction, set the odds, check it on the day.',
    css: `
.g-prediction-vault .pv-hit { position: absolute; z-index: 12; border-radius: 50%; touch-action: none; cursor: grab; }
.g-prediction-vault .pv-hit[hidden] { display: none; }
.g-prediction-vault .pv-hud { position: absolute; z-index: 18; right: 12px; top: calc(env(safe-area-inset-top, 0px) + 60px); max-width: min(250px, calc(100% - 150px)); padding: 7px 11px 8px; border-radius: 12px; pointer-events: none;
  background: linear-gradient(180deg, #3a2a12, #23180a); color: #ffe6a8; border: 1.5px solid #c9973e; box-shadow: inset 0 1px 0 rgba(255, 236, 190, .35), 0 8px 18px rgba(0, 0, 0, .4); font: 600 12px/1.25 var(--font-ui); letter-spacing: .02em; text-align: right; }
.g-prediction-vault .pv-hud.pv-one { padding: 5px 10px 6px; }
.g-prediction-vault .pv-hud.pv-one b { display: inline; margin-right: 6px; }
.g-prediction-vault .pv-hud b { display: block; font: 800 12px/1.1 var(--font-ui); letter-spacing: .12em; text-transform: uppercase; color: #f5c66a; margin-bottom: 2px; }
.g-prediction-vault .pv-cards { position: absolute; z-index: 32; left: 50%; transform: translateX(-50%); width: min(380px, calc(100% - 24px)); display: flex; flex-direction: column; gap: 10px; }
.g-prediction-vault .pv-cards[hidden] { display: none; }
.g-prediction-vault .pv-cards::before { content: ""; position: absolute; z-index: -1; inset: -60px -40px; background: radial-gradient(closest-side, rgba(10, 6, 2, .72), rgba(10, 6, 2, 0)); pointer-events: none; }
.g-prediction-vault .pv-tag { position: absolute; z-index: 17; transform: translate(-50%, 0); padding: 5px 9px; border-radius: 8px; font: 800 12px/1 var(--font-ui); letter-spacing: .08em; white-space: nowrap; pointer-events: none;
  color: #2b1a05; background: linear-gradient(180deg, #fff1c2, #e2b04f); border: 1px solid #8a5a17; box-shadow: 0 0 18px rgba(255, 207, 107, .75), 0 4px 10px rgba(0, 0, 0, .45); animation: pv-tagin .7s cubic-bezier(.2, 1.5, .4, 1) both; }
@keyframes pv-tagin { from { opacity: 0; transform: translate(-50%, 8px) scale(.7); } to { opacity: 1; transform: translate(-50%, 0); } }
.g-prediction-vault .pv-cardq { font: 700 13px/1.2 var(--font-ui); letter-spacing: .12em; text-transform: uppercase; text-align: center; color: #ffe2a0; text-shadow: 0 2px 6px rgba(0, 0, 0, .6); }
.g-prediction-vault .pv-card { appearance: none; text-align: left; cursor: pointer; border: 0; border-radius: 6px 16px 16px 6px; padding: 11px 14px 12px 16px; position: relative; color: #2a1d10; min-height: 56px;
  background: linear-gradient(180deg, #fffaf0, #f6ead2); box-shadow: 0 2px 0 #d8c39b, 0 12px 24px rgba(0, 0, 0, .45); display: flex; flex-direction: column; gap: 3px; transition: transform .18s cubic-bezier(.2, 1.4, .4, 1), box-shadow .2s ease;
  animation: pv-cardin .5s cubic-bezier(.2, 1.3, .4, 1) backwards; }
.g-prediction-vault .pv-card:nth-child(3) { animation-delay: .08s; } .g-prediction-vault .pv-card:nth-child(4) { animation-delay: .16s; }
.g-prediction-vault .pv-card::before { content: ""; position: absolute; left: 0; top: 8px; bottom: 8px; width: 5px; border-radius: 3px; background: linear-gradient(#e2a84a, #b9762a); }
.g-prediction-vault .pv-card:active { transform: scale(.97); }
.g-prediction-vault .pv-card:focus-visible { outline: 3px solid #ffd36b; outline-offset: 3px; }
.g-prediction-vault .pv-card small { font: 800 12px/1 var(--font-ui); letter-spacing: .1em; text-transform: uppercase; color: #9a6418; }
.g-prediction-vault .pv-card .gk-user { font: 600 16px/1.3 var(--font-ui); }
.g-prediction-vault .pv-card.pick { transform: scale(1.03); box-shadow: 0 0 0 3px #ffd36b, 0 16px 30px rgba(0, 0, 0, .5); }
.g-prediction-vault .pv-card.gone { opacity: 0; transform: translateY(20px) scale(.9); transition: opacity .3s ease, transform .3s ease; }
@keyframes pv-cardin { from { opacity: 0; transform: translateY(18px) rotate(-1.5deg); } to { opacity: 1; transform: none; } }
.g-prediction-vault .pv-panel { position: absolute; z-index: 30; padding: 12px 14px 13px; border-radius: 18px; display: flex; flex-direction: column; gap: 9px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--ui-surface) 96%, #c9973e), var(--ui-surface)); color: var(--ui-fg); border: 1.5px solid color-mix(in srgb, #c9973e 70%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, .25), 0 14px 30px rgba(0, 0, 0, .4); transition: opacity .3s ease, transform .4s cubic-bezier(.2, 1.3, .4, 1); }
.g-prediction-vault .pv-panel.off { opacity: 0; transform: translateY(10px); pointer-events: none; }
.g-prediction-vault .pv-step { display: flex; align-items: center; justify-content: space-between; gap: 8px; font: 800 12px/1 var(--font-ui); letter-spacing: .12em; text-transform: uppercase; color: var(--ui-accent); }
.g-prediction-vault .pv-step i { font-style: normal; color: var(--ui-muted); letter-spacing: .06em; }
.g-prediction-vault .pv-q { font: 700 17px/1.25 var(--font-ui); }
.g-prediction-vault .pv-pred { font: 600 15px/1.3 var(--font-ui); padding: 8px 10px; border-radius: 10px; background: color-mix(in srgb, var(--ui-fg) 6%, transparent); border-left: 4px solid #d79a3d; }
.g-prediction-vault .pv-oddsrow { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.g-prediction-vault .pv-oddsrow .pv-q { flex: 1; }
.g-prediction-vault .pv-big { font: 800 40px/1 var(--font-display); color: var(--ui-accent); font-variant-numeric: tabular-nums; text-align: center; }
.g-prediction-vault .pv-row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.g-prediction-vault .pv-day { appearance: none; cursor: pointer; flex: 1 1 0; min-width: 92px; min-height: 58px; border-radius: 12px; padding: 8px 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  background: linear-gradient(180deg, #f7dc96, #d9a54a 55%, #b77a26); color: #2b1a05; border: 1px solid #8a5a17; box-shadow: inset 0 1px 0 rgba(255, 255, 255, .6), 0 4px 0 #7a4f12, 0 8px 14px rgba(0, 0, 0, .3); transition: transform .12s ease; }
.g-prediction-vault .pv-day b { font: 800 15px/1 var(--font-ui); }
.g-prediction-vault .pv-day span { font: 600 12px/1 var(--font-ui); opacity: .85; }
.g-prediction-vault .pv-day:active { transform: translateY(3px); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .6), 0 1px 0 #7a4f12; }
.g-prediction-vault .pv-day:focus-visible, .g-prediction-vault .pv-ans:focus-visible { outline: 3px solid var(--ui-accent); outline-offset: 2px; }
.g-prediction-vault .pv-ans { appearance: none; cursor: pointer; flex: 1 1 0; min-width: 80px; min-height: 48px; border-radius: 999px; font: 700 15px/1 var(--font-ui); border: 1.5px solid var(--ui-line); background: var(--ui-surface); color: var(--ui-fg); transition: transform .12s ease; }
.g-prediction-vault .pv-ans:active { transform: scale(.95); }
.g-prediction-vault .pv-note { font: 500 14px/1.35 var(--font-ui); color: var(--ui-muted); }
.g-prediction-vault .pv-note b { color: var(--ui-fg); }
.g-prediction-vault .pv-plan { font: 600 14px/1.35 var(--font-ui); padding: 8px 10px; border-radius: 12px; background: color-mix(in srgb, var(--ui-accent) 15%, transparent); border: 1px solid color-mix(in srgb, var(--ui-accent) 45%, transparent); }
.g-prediction-vault .pv-plan b { color: var(--ui-accent); }
.g-prediction-vault .pv-meter { height: 10px; border-radius: 6px; background: color-mix(in srgb, var(--ui-fg) 12%, transparent); overflow: hidden; }
.g-prediction-vault .pv-meter i { display: block; height: 100%; width: 0; border-radius: 6px; background: linear-gradient(90deg, #f7dc96, #d9a54a, #ffcf6b); transition: width .12s linear; }
.g-prediction-vault .pv-due { position: absolute; z-index: 32; left: 50%; transform: translateX(-50%); width: min(360px, calc(100% - 28px)); padding: 14px 16px; border-radius: 14px; text-align: center; color: #2b1a05;
  background: linear-gradient(180deg, #f9e3a6, #dcae58 60%, #c08a35); border: 2px solid #7a4f12; box-shadow: inset 0 2px 0 rgba(255, 255, 255, .55), inset 0 -3px 0 rgba(90, 55, 10, .35), 0 18px 40px rgba(0, 0, 0, .55);
  display: flex; flex-direction: column; gap: 6px; animation: pv-duein .6s cubic-bezier(.2, 1.3, .4, 1) both; pointer-events: none; }
.g-prediction-vault .pv-due small { font: 800 12px/1 var(--font-ui); letter-spacing: .14em; text-transform: uppercase; color: #6b420c; }
.g-prediction-vault .pv-due b { font: 800 19px/1.15 var(--font-display); }
.g-prediction-vault .pv-due span { font: 600 14px/1.3 var(--font-ui); color: #4a2f08; }
.g-prediction-vault .pv-due .pv-stamp { position: absolute; right: 12px; top: -14px; font: 900 15px/1 var(--font-ui); letter-spacing: .1em; padding: 6px 10px; border-radius: 6px; border: 3px solid currentColor; transform: rotate(8deg); background: #fff8e8; animation: pv-stamp .4s cubic-bezier(.2, 1.6, .4, 1) both; }
@keyframes pv-duein { from { opacity: 0; transform: translateX(-50%) translateY(-30px) scale(.6); } to { opacity: 1; transform: translateX(-50%); } }
@keyframes pv-stamp { from { opacity: 0; transform: rotate(8deg) scale(2.2); } to { opacity: 1; transform: rotate(8deg); } }
.g-prediction-vault .pv-slot { position: absolute; z-index: 9; border-radius: 4px; pointer-events: none; box-shadow: 0 0 0 2px #ffcf6b, 0 0 14px rgba(255, 207, 107, .9); animation: pv-slotpulse 1.4s ease-in-out infinite; }
@keyframes pv-slotpulse { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
.g-prediction-vault .gk-char { left: 14px; bottom: calc(env(safe-area-inset-bottom, 0px) + 16px); }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const TAU = Math.PI * 2, clamp = K.clamp, lerp = K.lerp, hexA = K.hexA;
      const now = () => performance.now();
      const L = (o, sub) => { let s = ctx.line(o) || ''; if (sub) Object.keys(sub).forEach(k => { s = s.split('{' + k + '}').join(sub[k]); }); return s; };
      // trims to n characters on a word boundary, and closes a quote the reader's sentence split left open (at the end of the
      // quoted sentence, restoring the question mark of an obvious question such as "Can we talk")
      const shut = (s) => {
        const fix = (s, at, close) => {
          if (at < 0) return s;
          const m = /[.!?…](?=\s|$)/.exec(s.slice(at + 1)), q = /^(can|could|would|will|do|does|did|are|is|should|shall|may|have|has)\s+(we|you|i|he|she|they|it|someone|anyone)\b/i.test(s.slice(at + 1).trim()) ? '?' : '';
          if (!m) return s + q + close;
          const end = at + 1 + m.index;
          return s[end] === '.' ? s.slice(0, end) + (q || '.') + close + s.slice(end + 1) : s.slice(0, end + 1) + close + s.slice(end + 1);
        };
        s = fix(s, (s.match(/"/g) || []).length % 2 ? s.lastIndexOf('"') : -1, '"');
        return fix(s, (s.match(/“/g) || []).length > (s.match(/”/g) || []).length ? s.lastIndexOf('“') : -1, '”');
      };
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return shut(s); const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return shut((sp > n * 0.6 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'); };
      const care = an.safety === 'care';
      const support = an.fear_support === 'strong' ? 'strong' : an.fear_support === 'some' ? 'some' : 'weak';
      const serious = support !== 'weak';
      const inten = ctx.intensity;
      const visits = K.visits();
      const bright = () => S.scene() === 'bright';
      const leads = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text);
      const lead = (k) => clip((leads.find(l => l.kind === k) || leads[0] || { text: 'Write down one small step you can take before the check day.' }).text, 120);

      /* ---------------- dates and the archive (only title, odds, dates and outcome are stored) ---------------- */
      const KEY = 'prediction-vault:boxes';
      const dayKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const today = new Date(); today.setHours(12, 0, 0, 0);
      const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };
      const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const fmt = (d) => DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()];
      const parseKey = (k) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(k || '')); if (!m) return null; const d = new Date(+m[1], +m[2] - 1, +m[3], 12); return isNaN(d) ? null : d; };
      const nextDow = (dow) => { const d = new Date(today); let k = (dow - d.getDay() + 7) % 7; if (k === 0) k = 7; d.setDate(d.getDate() + k); return d; };
      const DAYS = (() => {
        const tom = addDays(1), wk = addDays(7), out = [{ id: 'tomorrow', label: 'Tomorrow', say: 'tomorrow', d: tom }];
        let fri = nextDow(5);
        if (dayKey(fri) === dayKey(tom) || dayKey(fri) === dayKey(wk)) { const mon = nextDow(1); out.push({ id: 'monday', label: 'Monday', say: 'on Monday', d: dayKey(mon) === dayKey(tom) ? addDays(3) : mon }); }
        else out.push({ id: 'friday', label: 'Friday', say: 'on Friday', d: fri });
        out.push({ id: 'week', label: 'Next week', say: 'next week', d: wk });
        return out;
      })();
      let boxes = S.store.get(KEY, []);
      if (!Array.isArray(boxes)) boxes = [];
      boxes = boxes.filter(b => b && typeof b === 'object' && typeof b.p === 'number').slice(-60);
      const todayKey = dayKey(today);
      const due = boxes.filter(b => !b.outcome && b.due && b.due <= todayKey).slice(0, 3);
      function calib() {
        const res = boxes.filter(b => b.outcome), yes = res.filter(b => b.outcome === 'yes').length, part = res.filter(b => b.outcome === 'partly').length;
        return { n: res.length, yes, part, avgP: res.length ? Math.round(res.reduce((a, b) => a + (b.p || 0), 0) / res.length) : 0, rate: res.length ? Math.round((yes + part * 0.5) / res.length * 100) : 0 };
      }
      const calLine = (c) => 'Your sealed fears came true ' + c.yes + ' of ' + c.n + ' time' + (c.n === 1 ? '' : 's') + (c.part ? ' (' + c.part + ' partly)' : '');

      /* ---------------- the prediction, three ways (never adds facts) ---------------- */
      const conc = clip(an.conclusion || an.thought || 'The worst will happen.', 120);
      const core = conc.replace(/\b(definitely|clearly|obviously|for sure|totally|certainly|surely|absolutely|100%)\s+/gi, '').replace(/\s+/g, ' ').trim().replace(/[.!?…]+$/, '');
      const lc = (s) => (/^(You|Your|She|He|They|It|There|This|That|My|Everyone|Nobody|People|We|Everybody|Someone)\b/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
      const OPTS = [
        { id: 'written', tag: 'As you put it', text: K.sentence(conc) },
        { id: 'specific', tag: 'Specific and dated', text: 'Within a week, it’ll be clear that ' + lc(core) + '.' },
        { id: 'softer', tag: 'With honest doubt', text: 'There’s a chance ' + lc(core) + '.' }
      ];
      let aiDone = false;
      ctx.ai('Rewrite this feared prediction for a prediction-testing exercise. Fear: "' + conc + '". Facts: "' + clip(an.situation || '', 160) + '". Reply with only JSON {"specific":"...","softer":"..."}. specific: concrete, observable, checkable within a week, second person, at most 16 words, no new facts. softer: the same claim with honest uncertainty, at most 14 words.', { tier: 'quick', fallback: null })
        .then(r => { if (aiDone || !r || typeof r !== 'object') return; if (typeof r.specific === 'string' && r.specific.trim().length > 8) OPTS[1].text = K.sentence(clip(r.specific, 120)); if (typeof r.softer === 'string' && r.softer.trim().length > 8) OPTS[2].text = K.sentence(clip(r.softer, 120)); })
        .catch(() => {});

      /* ---------------- daily vault ---------------- */
      const METALS = [
        { key: 'brass', brass0: '#fff0b8', brass1: '#e2b04f', brass2: '#9a6418', glow: '#ffcf6b', steel0: '#d7dce6', steel1: '#8f97a8', steel2: '#3e4452', wall0: '#2a2017', wall1: '#120d08', box: '#3a2d1f', boxRim: '#6b5232', plate: '#c9973e' },
        { key: 'copper', brass0: '#ffe0cc', brass1: '#e08f62', brass2: '#8a3f1c', glow: '#ffb38a', steel0: '#e2dcdc', steel1: '#9a8f92', steel2: '#463c40', wall0: '#2b1b1a', wall1: '#120a0a', box: '#3c2522', boxRim: '#714436', plate: '#d0805a' },
        { key: 'silver', brass0: '#f4f1e2', brass1: '#c9bf95', brass2: '#7a6a3a', glow: '#ffe7a8', steel0: '#e0e8f2', steel1: '#93a2b8', steel2: '#3a4558', wall0: '#1c2230', wall1: '#0a0d14', box: '#283246', boxRim: '#4d5c78', plate: '#b8aa7a' }
      ];
      const metal0 = K.dailyPick(METALS, 4);
      const LIGHT = { brass0: '#fff6d2', brass1: '#e7b85a', brass2: '#a06a1c', glow: '#ffd27a', steel0: '#f4f6fa', steel1: '#b4bccb', steel2: '#5d6577', wall0: '#f1e6cf', wall1: '#d9c6a2', box: '#e6d6b6', boxRim: '#cdb486', plate: '#b98a3a' };
      const MT = () => (bright() ? Object.assign({}, metal0, LIGHT) : metal0);
      const SEALS = ['Owl Seal', 'Comet Seal', 'Moth Seal', 'Anchor Seal', 'Key Seal', 'Fern Seal', 'Lighthouse Seal'];
      const seal = K.dailyPick(SEALS, 5);

      /* ---------------- state ---------------- */
      const st = { phase: 'intro', choice: null, odds: clamp(Math.round(((ctx.before != null ? ctx.before : 60)) / 5) * 5, 0, 100), oddsSet: false, day: null, spin: 0, spinTarget: Math.PI * 3, spinV: [], ajar: 1, boxT: 0, bolts: 0, sealed: false, sweep: -1, finished: false, dueBox: null, gear: 0, wheel: 0, dialAng: 0, kick: 0, flash: 0, lastTick: -1, lastClick: 0 };
      st.dialAng = -st.odds / 100 * TAU;
      const M = { w: 0, h: 0, cx: 0, cy: 0, R: 140, phone: true, wide: false, box: { x: 0, y: 0, w: 120, h: 64 }, slot: { x: 0, y: 0 }, wallBoxes: [] };
      const P = K.particles(), drawP = particleDrawer(K);
      const dialC = () => ({ x: M.cx - M.R * 0.08 * st.ajar, y: M.cy });
      let fontCache = '';
      const uiFont = () => fontCache || (fontCache = (getComputedStyle(el).getPropertyValue('--font-ui') || '').trim() || 'sans-serif');
      const PENT = ['A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5'];
      let dirty = true; const mark = () => { dirty = true; };
      const slotEl = h('div', { class: 'pv-slot', 'aria-hidden': 'true' });

      /* ---------------- DOM ---------------- */
      const SOFT = softwareGfx(), cvOpts = { maxDpr: SOFT ? 1 : 2 }, cv = opaqueCanvas(el, cvOpts, S), qual = { acc: 0, n: 0, steps: 0 };
      const base = document.createElement('canvas');
      let baseOK = false;
      const hit = h('div', { class: 'pv-hit', role: 'slider', tabindex: '0', 'aria-label': 'Vault dial', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(st.odds), hidden: true });
      const hud = h('div', { class: 'pv-hud', hidden: true });
      const cards = h('div', { class: 'pv-cards', hidden: true });
      const panel = h('div', { class: 'pv-panel off', role: 'group', 'aria-live': 'polite' });
      el.append(hit, hud, cards, panel);
      const glitch = K.character('glitch', { side: 'right', mood: 'happy', size: K.phone() ? 74 : 92 });
      const music = K.music('space'); music.level(0.42);
      let hum = null;
      function beds() { if (!A.ctx || hum) return; hum = A.loop({ filter: 'lowpass', freq: 62, q: 7, bus: 'amb' }); if (hum) { hum.level(0.05, 2); S.onDestroy(() => hum && hum.stop()); } }
      beds(); S.on('audio-ready', beds);

      /* ---------------- sounds: metal, gears, ratchets ---------------- */
      function clunk(v) { if (!A.ctx) return; const t = A.now(); A.tone({ when: t, type: 'sine', freq: 92, to: 44, glide: 0.18, dur: 0.5, vol: 0.36 * (v || 1) }); A.noise({ when: t, filter: 'lowpass', freq: 520, dur: 0.18, vol: 0.2 * (v || 1) }); A.tone({ when: t + 0.01, type: 'square', freq: 210, to: 160, glide: 0.06, dur: 0.08, vol: 0.05 * (v || 1), lp: 900 }); A.sync('clunk', now()); }
      function ratchet(big) { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: big ? 2400 : 3400, q: 5, dur: 0.025, vol: big ? 0.16 : 0.09 }); A.tone({ type: 'square', freq: big ? 520 : 760, dur: 0.018, vol: 0.025, lp: 2600 }); }
      function gearGrind(v) { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: 380 + Math.random() * 120, q: 3, dur: 0.12, vol: 0.05 * v }); }
      function shimmer() { if (!A.ctx) return; ['E5', 'G5', 'B5', 'E6'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + i * 0.07, vol: 0.06, dur: 1.6 })); }

      /* ---------------- layout ---------------- */
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        M.w = W; M.h = H; M.phone = W < 700; M.wide = W >= 900;
        if (M.wide) { M.R = Math.min(H * 0.285, 246); M.cx = Math.round(W * 0.38); M.cy = Math.round(64 + M.R + 46); }
        else { M.R = Math.min(W * 0.37, 150, (H - 400) / 2.5); M.cx = W / 2; M.cy = Math.round(82 + M.R + 34); }
        const bw = M.phone ? 132 : 156, bh = M.phone ? 66 : 78;
        M.box = { x: M.cx - bw / 2, y: M.cy + M.R + (M.phone ? 30 : 34), w: bw, h: bh };
        // the wall of deposit boxes around the door
        const cw = M.phone ? 52 : 58, chh = M.phone ? 34 : 38, gx = M.cx - Math.ceil(M.cx / cw + 1) * cw, cols = Math.ceil((W - gx) / cw) + 1;
        M.wallBoxes = [];
        const top = M.phone ? 60 : 64, rows = Math.ceil((M.box.y - 10 - top) / chh);
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const x = gx + c * cw, y = top + r * chh, bx = x + cw / 2, by = y + chh / 2;
          if (Math.hypot(bx - M.cx, by - M.cy) < M.R * 1.16 + 18) continue;
          if (x + cw < -10 || x > W + 10) continue;
          M.wallBoxes.push({ x: x + 3, y: y + 3, w: cw - 6, h: chh - 6, r, c });
        }
        // the new box's slot: the wall box nearest the door's right shoulder
        const target = { x: M.cx + (M.wide ? -1 : 1) * M.R * 1.36, y: M.cy - M.R * 0.15 };
        let best = null, bd = 1e9;
        M.wallBoxes.forEach(b => { const d = Math.hypot(b.x + b.w / 2 - target.x, b.y + b.h / 2 - target.y); if (d < bd && b.x + b.w < W - 6 && b.x > 6 && (!M.phone || b.y > 100)) { bd = d; best = b; } });
        M.slot = best || { x: M.cx + M.R + 20, y: M.cy, w: 40, h: 26 };
        // past predictions live in the boxes closest to the door
        const sorted = M.wallBoxes.filter(b => b !== M.slot).sort((a, b) => Math.hypot(a.x - M.cx, a.y - M.cy) - Math.hypot(b.x - M.cx, b.y - M.cy));
        M.archive = boxes.slice(-24).map((bx, i) => ({ data: bx, at: sorted[i] })).filter(o => o.at);
        // controls
        const hr = M.R * 1.05;
        Object.assign(hit.style, { left: (M.cx - hr) + 'px', top: (M.cy - hr) + 'px', width: hr * 2 + 'px', height: hr * 2 + 'px' });
        if (M.wide) { Object.assign(panel.style, { left: Math.round(W * 0.64) + 'px', right: 'auto', width: Math.min(400, W * 0.32) + 'px', top: Math.round(M.cy - 110) + 'px', bottom: 'auto' }); }
        else { Object.assign(panel.style, { left: '12px', right: '12px', width: 'auto', top: 'auto', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 104px)' }); }
        cards.style.top = M.wide ? Math.round(M.cy - 150) + 'px' : (M.phone ? 96 : 110) + 'px';
        if (M.wide) Object.assign(hud.style, { left: 'auto', right: '16px', top: 'calc(env(safe-area-inset-top, 0px) + 60px)', transform: 'none' }); else Object.assign(hud.style, { left: '12px', right: 'auto', top: 'calc(env(safe-area-inset-top, 0px) + 60px)', transform: 'none', textAlign: 'left', maxWidth: 'calc(100% - 24px)' }); hud.classList.toggle('pv-one', !M.wide);
        if (M.wide) { cards.style.left = Math.round(W * 0.64 + Math.min(400, W * 0.32) / 2) + 'px'; }
        renderBase();
        if (!slotEl.isConnected) el.append(slotEl);
        Object.assign(slotEl.style, { left: (M.slot.x - 1) + 'px', top: (M.slot.y - 1) + 'px', width: (M.slot.w + 2) + 'px', height: (M.slot.h + 2) + 'px', display: st.sealed ? 'none' : '' });
        mark();
      }

      /* ---------------- static vault wall, pre-rendered ---------------- */
      function sprite(w, hh, fn) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(hh)); fn(c.getContext('2d'), w, hh); return c; }
      const glowCache = {};
      function glow(col) { if (glowCache[col]) return glowCache[col]; return (glowCache[col] = sprite(64, 64, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, hexA(col, 0.95)); gr.addColorStop(0.32, hexA(col, 0.36)); gr.addColorStop(1, hexA(col, 0)); g.fillStyle = gr; g.fillRect(0, 0, s, s); })); }
      function rr(g, x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function drawWallBox(g, b, T, lit) {
        const gr = g.createLinearGradient(0, b.y, 0, b.y + b.h); gr.addColorStop(0, lit ? T.brass1 : T.boxRim); gr.addColorStop(1, lit ? T.brass2 : T.box);
        g.fillStyle = gr; rr(g, b.x, b.y, b.w, b.h, 3); g.fill();
        g.strokeStyle = hexA('#000000', 0.45); g.lineWidth = 1; g.stroke();
        g.fillStyle = lit ? T.brass0 : T.plate; g.globalAlpha = lit ? 0.95 : 0.55; rr(g, b.x + b.w * 0.3, b.y + b.h * 0.22, b.w * 0.4, b.h * 0.26, 1.5); g.fill(); g.globalAlpha = 1;
        g.fillStyle = hexA('#000000', 0.55); g.beginPath(); g.arc(b.x + b.w / 2, b.y + b.h * 0.7, Math.max(1.4, b.h * 0.07), 0, TAU); g.fill();
      }
      function renderBase() {
        const W = M.w, H = M.h, dpr = cv.dpr || 1, T = MT(), br = bright();
        base.width = Math.max(2, Math.round(W * dpr)); base.height = Math.max(2, Math.round(H * dpr));
        const g = base.getContext('2d', { alpha: false }); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, T.wall0); gr.addColorStop(1, T.wall1); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        M.wallBoxes.forEach(b => drawWallBox(g, b, T, false));
        // warm light falls on the door; the vault's edges sink into shadow
        gr = g.createRadialGradient(M.cx, M.cy, M.R * 1.1, M.cx, M.cy, Math.max(W, H) * 0.78); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, br ? 'rgba(96,66,26,0.5)' : 'rgba(0,0,0,0.6)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        // floor: polished marble with a long reflection
        const fy = M.box.y + M.box.h * 0.75;
        gr = g.createLinearGradient(0, fy, 0, H); gr.addColorStop(0, br ? '#d8c7a6' : '#1b140d'); gr.addColorStop(1, br ? '#b9a57f' : '#070504'); g.fillStyle = gr; g.fillRect(0, fy, W, H - fy);
        g.strokeStyle = hexA(T.brass1, br ? 0.6 : 0.35); g.lineWidth = 2; g.beginPath(); g.moveTo(0, fy); g.lineTo(W, fy); g.stroke();
        for (let i = 0; i < 9; i++) { const x = (i / 8) * W; g.strokeStyle = hexA(br ? '#8a7350' : '#3a2c1c', 0.35); g.lineWidth = 1; g.beginPath(); g.moveTo(M.cx + (x - M.cx) * 0.3, fy); g.lineTo(x + (x - M.cx) * 0.8, H); g.stroke(); }
        // the door's collar set into the wall, warm light pooled around it
        const R = M.R, cx = M.cx, cy = M.cy;
        g.save(); g.globalCompositeOperation = br ? 'source-over' : 'lighter'; g.globalAlpha = br ? 0.25 : 0.32; g.drawImage(glow(T.glow), cx - R * 2.2, cy - R * 2.2, R * 4.4, R * 4.4); g.restore();
        gr = g.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.22); gr.addColorStop(0, hexA('#000000', 0.8)); gr.addColorStop(1, hexA('#000000', 0)); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R * 1.24, 0, TAU); g.fill();
        gr = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R); gr.addColorStop(0, T.brass0); gr.addColorStop(0.45, T.brass1); gr.addColorStop(1, T.brass2);
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R * 1.13, 0, TAU); g.arc(cx, cy, R * 1.03, 0, TAU, true); g.fill();
        g.fillStyle = br ? '#2a1c0a' : '#050302'; g.beginPath(); g.arc(cx, cy, R * 1.03, 0, TAU); g.fill();
        for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, x = cx + Math.cos(a) * R * 1.08, y = cy + Math.sin(a) * R * 1.08; g.fillStyle = T.brass2; g.beginPath(); g.arc(x, y, R * 0.017 + 1, 0, TAU); g.fill(); g.fillStyle = T.brass0; g.beginPath(); g.arc(x - 0.6, y - 0.6, R * 0.009 + 0.5, 0, TAU); g.fill(); }
        // the tray the new box waits on
        const bx = M.box;
        g.fillStyle = hexA('#000000', 0.45); g.beginPath(); g.ellipse(cx, bx.y + bx.h + 6, bx.w * 0.75, 9, 0, 0, TAU); g.fill();
        gr = g.createLinearGradient(0, bx.y + bx.h - 6, 0, bx.y + bx.h + 8); gr.addColorStop(0, T.brass1); gr.addColorStop(1, T.brass2); g.fillStyle = gr; rr(g, cx - bx.w * 0.72, bx.y + bx.h - 4, bx.w * 1.44, 10, 4); g.fill();
        // pre-render door parts
        doorSprite = makeDoor(); wheelSprite = makeWheel(); dialSprite = makeDial(); gearSprite = makeGear();
        // past predictions glow in their boxes
        (M.archive || []).forEach(o => drawWallBox(g, o.at, T, true));
        baseOK = true;
      }
      let doorSprite = null, wheelSprite = null, dialSprite = null, gearSprite = null;
      function makeDoor() {
        const R = M.R, s = R * 2 + 8, T = MT(), dpr = cv.dpr || 1;
        return sprite(s * dpr, s * dpr, (g) => {
          g.scale(dpr, dpr); const c = s / 2;
          let gr = g.createRadialGradient(c - R * 0.35, c - R * 0.4, R * 0.1, c, c, R); gr.addColorStop(0, T.steel0); gr.addColorStop(0.55, T.steel1); gr.addColorStop(1, T.steel2);
          g.fillStyle = gr; g.beginPath(); g.arc(c, c, R, 0, TAU); g.fill();
          // machined rings
          [0.94, 0.8, 0.66].forEach((k, i) => { g.strokeStyle = hexA(i % 2 ? '#ffffff' : '#000000', i % 2 ? 0.25 : 0.3); g.lineWidth = i === 0 ? 4 : 2; g.beginPath(); g.arc(c, c, R * k, 0, TAU); g.stroke(); });
          for (let k = 0; k < 40; k++) { g.strokeStyle = hexA('#ffffff', 0.035); g.lineWidth = 1; g.beginPath(); g.arc(c, c, R * (0.3 + k * 0.016), 0, TAU); g.stroke(); }
          // brass rim + rivets
          gr = g.createLinearGradient(c - R, c - R, c + R, c + R); gr.addColorStop(0, T.brass0); gr.addColorStop(0.5, T.brass1); gr.addColorStop(1, T.brass2);
          g.strokeStyle = gr; g.lineWidth = R * 0.07; g.beginPath(); g.arc(c, c, R * 0.965, 0, TAU); g.stroke();
          for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + 0.1, x = c + Math.cos(a) * R * 0.965, y = c + Math.sin(a) * R * 0.965; g.fillStyle = T.brass2; g.beginPath(); g.arc(x, y, R * 0.022 + 0.8, 0, TAU); g.fill(); g.fillStyle = T.brass0; g.beginPath(); g.arc(x - 0.7, y - 0.7, R * 0.011 + 0.4, 0, TAU); g.fill(); }
          // hinges on the left
          [-0.42, 0.42].forEach(k => { const y = c + k * R; gr = g.createLinearGradient(0, y - R * 0.08, 0, y + R * 0.08); gr.addColorStop(0, T.brass0); gr.addColorStop(1, T.brass2); g.fillStyle = gr; rr(g, c - R * 1.04, y - R * 0.09, R * 0.2, R * 0.18, R * 0.04); g.fill(); });
          // maker's plate
          g.fillStyle = hexA(T.brass1, 0.9); rr(g, c - R * 0.22, c + R * 0.72, R * 0.44, R * 0.1, 3); g.fill();
        });
      }
      function makeWheel() {
        const R = M.R * 0.62, s = R * 2 + 24, T = MT(), dpr = cv.dpr || 1;
        return sprite(s * dpr, s * dpr, (g) => {
          g.scale(dpr, dpr); const c = s / 2;
          g.lineCap = 'round';
          for (let i = 0; i < 4; i++) {
            const a = i / 4 * TAU + Math.PI / 4, x = c + Math.cos(a) * R, y = c + Math.sin(a) * R;
            g.strokeStyle = hexA('#000000', 0.35); g.lineWidth = R * 0.12; g.beginPath(); g.moveTo(c + 2, c + 3); g.lineTo(x + 2, y + 3); g.stroke();
            const gr = g.createLinearGradient(c, c, x, y); gr.addColorStop(0, T.brass2); gr.addColorStop(0.5, T.brass0); gr.addColorStop(1, T.brass1);
            g.strokeStyle = gr; g.lineWidth = R * 0.1; g.beginPath(); g.moveTo(c, c); g.lineTo(x, y); g.stroke();
            const kg = g.createRadialGradient(x - 3, y - 3, 1, x, y, R * 0.13); kg.addColorStop(0, T.brass0); kg.addColorStop(1, T.brass2); g.fillStyle = kg; g.beginPath(); g.arc(x, y, R * 0.12, 0, TAU); g.fill();
          }
          g.strokeStyle = hexA(T.brass1, 0.9); g.lineWidth = R * 0.05; g.beginPath(); g.arc(c, c, R * 0.86, 0, TAU); g.stroke();
          g.strokeStyle = hexA('#ffffff', 0.35); g.lineWidth = 1.2; g.beginPath(); g.arc(c, c, R * 0.86 - R * 0.02, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
        });
      }
      function makeDial() {
        const R = M.R * 0.34, s = R * 2 + 6, T = MT(), dpr = cv.dpr || 1, fs = Math.max(12, Math.round(R * 0.2));
        return sprite(s * dpr, s * dpr, (g) => {
          g.scale(dpr, dpr); const c = s / 2;
          let gr = g.createRadialGradient(c - R * 0.3, c - R * 0.3, 1, c, c, R); gr.addColorStop(0, T.brass0); gr.addColorStop(0.6, T.brass1); gr.addColorStop(1, T.brass2);
          g.fillStyle = gr; g.beginPath(); g.arc(c, c, R, 0, TAU); g.fill();
          gr = g.createRadialGradient(c, c - R * 0.2, 1, c, c, R * 0.86); gr.addColorStop(0, '#2a2f3a'); gr.addColorStop(1, '#0d1016'); g.fillStyle = gr; g.beginPath(); g.arc(c, c, R * 0.86, 0, TAU); g.fill();
          for (let i = 0; i < 100; i += 2) { const a = i / 100 * TAU - Math.PI / 2, big = i % 10 === 0, r0 = R * (big ? 0.66 : 0.74); g.strokeStyle = big ? '#fff1c8' : hexA('#ffffff', 0.6); g.lineWidth = big ? 1.6 : 1; g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * R * 0.83, c + Math.sin(a) * R * 0.83); g.stroke(); }
          g.fillStyle = '#fff1c8'; g.font = '700 ' + fs + 'px ' + uiFont(); g.textAlign = 'center'; g.textBaseline = 'middle';
          for (let i = 0; i < 100; i += 20) { const a = i / 100 * TAU - Math.PI / 2; g.fillText(String(i), c + Math.cos(a) * R * 0.48, c + Math.sin(a) * R * 0.48); }
          g.fillStyle = T.brass1; g.beginPath(); g.arc(c, c, R * 0.16, 0, TAU); g.fill();
          g.fillStyle = T.brass0; g.beginPath(); g.arc(c - R * 0.04, c - R * 0.04, R * 0.07, 0, TAU); g.fill();
        });
      }
      function makeGear() {
        const R = M.R * 0.36, s = R * 2 + 10, T = MT(), dpr = cv.dpr || 1;
        return sprite(s * dpr, s * dpr, (g) => {
          g.scale(dpr, dpr); const c = s / 2, n = 14;
          g.beginPath();
          for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, r = i % 2 ? R * 0.84 : R; const a2 = (i + 1) / (n * 2) * TAU; g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); g.lineTo(c + Math.cos(a2 - 0.04) * r, c + Math.sin(a2 - 0.04) * r); }
          g.closePath(); const gr = g.createRadialGradient(c - R * 0.3, c - R * 0.3, 1, c, c, R); gr.addColorStop(0, T.brass0); gr.addColorStop(1, T.brass2); g.fillStyle = gr; g.fill();
          g.fillStyle = hexA('#000000', 0.5); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.beginPath(); g.arc(c + Math.cos(a) * R * 0.48, c + Math.sin(a) * R * 0.48, R * 0.14, 0, TAU); g.fill(); }
          g.fillStyle = T.brass2; g.beginPath(); g.arc(c, c, R * 0.16, 0, TAU); g.fill();
        });
      }

      /* ---------------- render ---------------- */
      cv.onResize(() => layout());
      S.on('theme', () => { if (M.w) renderBase(); mark(); });
      // 30 fps when the CPU keeps up; a starved device steps down to 20 then 15 fps within half a second, and back up after calm
      function pace(dt0, t) {
        PACE.n++; if (dt0 > 0.04) PACE.slow++;
        if (PACE.n >= 30) {
          const r = PACE.slow / PACE.n; PACE.n = 0; PACE.slow = 0;
          if (r > 0.04) { PACE.gap = Math.min(0.062, PACE.gap + 0.017); PACE.calm = 0; } else if (!r && ++PACE.calm >= 4) { PACE.gap = Math.max(0.028, PACE.gap - 0.017); PACE.calm = 0; }
        }
        return t - lastDraw < PACE.gap;
      }
      let lastDraw = -1, dtAcc = 0;
      const PACE = { gap: 0.028, n: 0, slow: 0, calm: 0 };
      K.loop((dt0, t) => {
        const g = cv.g; if (!g || !baseOK) return;
        // software rendering: at most every other display frame (every third when starved), so frames stay even
        dtAcc += dt0; if (SOFT && pace(dt0, t)) return;
        const dt = Math.min(0.1, dtAcc); dtAcc = 0;
        qual.acc += dt; qual.n++;
        const due0 = st.phase === 'due' || st.phase === 'intro2';
        if (!(dirty || P.count() > 0 || st.kick > 0.001 || st.flash > 0.001 || st.sweep >= 0 || st.sealed || st.goldDust || due0 || (st.phase === 'spin' && st.boxT > 0.98))) return;
        dirty = false; lastDraw = t;
        if (dt > 0.03) qual.slow = (qual.slow || 0) + 1;
        if (qual.n >= 60) { if ((qual.acc / qual.n > 0.024 || qual.slow > 7) && qual.steps < 2 && (cv.dpr || 1) > 1.05) { qual.steps++; cvOpts.maxDpr = qual.steps === 1 ? 1.5 : 1.15; cv.fit(); } qual.acc = 0; qual.n = 0; qual.slow = 0; }
        const W = M.w, H = M.h, T = MT(), br = bright(), R = M.R, cx = M.cx, cy = M.cy;
        st.kick = Math.max(0, st.kick - dt * 3); st.flash = Math.max(0, st.flash - dt * 2.5);
        const shx = K.reduced() ? 0 : Math.sin(t * 50) * st.kick * 2.4, shy = K.reduced() ? 0 : Math.cos(t * 43) * st.kick * 1.6;
        g.save(); g.translate(shx, shy);
        g.drawImage(base, 0, 0, W, H);
        if (st.sealed) {
          const k = clamp((now() - (st.sealT || 0)) / 900, 0, 1), rot = t * 0.07;
          g.save(); g.translate(cx, cy); g.rotate(rot); g.globalCompositeOperation = br ? 'source-over' : 'lighter';
          for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, L0 = R * (2.4 + 0.3 * Math.sin(t + i)), wA = 0.07; const gr = g.createLinearGradient(0, 0, Math.cos(a) * L0, Math.sin(a) * L0); gr.addColorStop(0, hexA(T.glow, (br ? 0.35 : 0.3) * k)); gr.addColorStop(1, hexA(T.glow, 0)); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - wA) * L0, Math.sin(a - wA) * L0); g.lineTo(Math.cos(a + wA) * L0, Math.sin(a + wA) * L0); g.closePath(); g.fill(); }
          g.restore();
        }
        // gears behind the collar turn with the wheel
        const gs = gearSprite.width / (cv.dpr || 1);
        [[-1, 1], [1, -1]].forEach(([sx, dir], i) => { g.save(); g.translate(cx + sx * R * 1.12, cy + R * 0.82 * (i ? -1 : 1)); g.rotate(st.gear * dir * (i ? 1.3 : 1)); g.globalAlpha = 0.9; g.drawImage(gearSprite, -gs / 2, -gs / 2, gs, gs); g.restore(); });
        // archive boxes: due ones pulse
        (M.archive || []).forEach(o => { if (!o.data.outcome && o.data.due && o.data.due <= todayKey) { const k = 0.5 + 0.5 * Math.sin(t * 4); g.globalAlpha = 0.5 * k; g.drawImage(glow(T.glow), o.at.x - 10, o.at.y - 10, o.at.w + 20, o.at.h + 20); g.globalAlpha = 1; } });
        // the open box slot (its pulse is a composited CSS glow, so idle frames cost nothing)
        const sl = M.slot;
        if (!st.sealed) { g.fillStyle = '#050302'; rr(g, sl.x, sl.y, sl.w, sl.h, 3); g.fill(); }
        // glowing light in the gap while the door is ajar
        const aj = st.ajar;
        if (aj > 0.01) { g.save(); g.beginPath(); g.arc(cx, cy, R * 1.03, 0, TAU); g.clip(); const gx = cx + R - R * 0.16 * aj; g.globalCompositeOperation = br ? 'source-over' : 'lighter'; g.globalAlpha = Math.min(1, aj * 1.2); g.drawImage(glow('#fff1c0'), gx - R * 0.5, cy - R * 1.1, R * 1.1, R * 2.2); g.restore(); }
        // the door (ajar = hinged on the left, foreshortened)
        const sx = 1 - 0.08 * aj, hx = cx - R;
        g.save(); g.translate(hx, cy); g.scale(sx, 1); g.translate(-hx, -cy);
        const ds = doorSprite.width / (cv.dpr || 1); g.drawImage(doorSprite, cx - ds / 2, cy - ds / 2, ds, ds);
        // locking bolts thrown into the collar when sealed
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU + Math.PI / 8, out = st.bolts, r0 = R * 0.9, r1 = R * (0.97 + 0.1 * out);
          if (out < 0.02) continue;
          g.lineCap = 'butt'; g.strokeStyle = T.steel2; g.lineWidth = R * 0.085; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke();
          g.strokeStyle = T.steel0; g.lineWidth = R * 0.05; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke();
          g.fillStyle = T.brass1; g.beginPath(); g.arc(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, R * 0.035, 0, TAU); g.fill();
        }
        // wheel and combination dial
        const ws = wheelSprite.width / (cv.dpr || 1); g.save(); g.translate(cx, cy); g.rotate(st.wheel); g.drawImage(wheelSprite, -ws / 2, -ws / 2, ws, ws); g.restore();
        const dsz = dialSprite.width / (cv.dpr || 1); g.save(); g.translate(cx, cy); g.rotate(st.dialAng); g.drawImage(dialSprite, -dsz / 2, -dsz / 2, dsz, dsz); g.restore();
        // shading as the door turns away from the light
        if (aj > 0.01) { g.fillStyle = hexA('#000000', 0.22 * aj); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill(); }
        // light sweep across the brass (finale)
        if (st.sweep >= 0) {
          g.save(); g.beginPath(); g.arc(cx, cy, R * 1.0, 0, TAU); g.clip();
          const x = cx - R * 1.6 + st.sweep * R * 3.2, gr = g.createLinearGradient(x - R * 0.2, cy - R, x + R * 0.2, cy + R);
          gr.addColorStop(0, 'rgba(255,230,160,0)'); gr.addColorStop(0.5, br ? 'rgba(255,248,225,0.6)' : 'rgba(255,226,150,0.42)'); gr.addColorStop(1, 'rgba(255,230,160,0)');
          g.globalCompositeOperation = br ? 'source-over' : 'screen'; g.globalAlpha = 0.8; g.fillStyle = gr; g.fillRect(cx - R, cy - R, R * 2, R * 2); g.restore();
        }
        g.restore();
        if (st.sealed) { const k = 0.6 + 0.4 * Math.sin(t * 2.2); g.save(); if (!br) g.globalCompositeOperation = 'lighter'; g.strokeStyle = hexA(T.glow, (br ? 0.5 : 0.38) * k); g.lineWidth = 10; g.beginPath(); g.arc(cx, cy, R * 1.17, 0, TAU); g.stroke(); g.strokeStyle = hexA('#fff6d8', 0.5 * k); g.lineWidth = 2; g.stroke(); g.restore(); }
        // pointer above the dial
        const pr = R * 0.38, dcp = dialC(); g.fillStyle = T.brass1; g.strokeStyle = T.brass2; g.lineWidth = 1.5; g.beginPath(); g.moveTo(dcp.x - 8, cy - pr - 12); g.lineTo(dcp.x + 8, cy - pr - 12); g.lineTo(dcp.x, cy - pr + 1); g.closePath(); g.fill(); g.stroke();
        if (st.phase === 'odds') { const a = -Math.PI / 2, k = st.odds / 100; g.strokeStyle = hexA(T.glow, 0.9); g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.arc(dcp.x, cy, R * 0.41, a, a + Math.max(0.001, k) * TAU); g.stroke(); }
        if (st.phase === 'spin') {
          const k = clamp(Math.abs(st.spin) / st.spinTarget, 0, 1), turns = k * 1.5, dc = dialC();
          g.strokeStyle = hexA('#000000', 0.35); g.lineWidth = 8; g.beginPath(); g.arc(dc.x, dc.y, R * 0.74, 0, TAU); g.stroke();
          g.lineCap = 'round'; g.strokeStyle = T.glow; g.lineWidth = 5; g.beginPath(); g.arc(dc.x, dc.y, R * 0.74, -Math.PI / 2, -Math.PI / 2 + Math.min(1, turns) * TAU); g.stroke();
          if (turns > 1) { g.strokeStyle = '#fff6d8'; g.lineWidth = 3; g.beginPath(); g.arc(dc.x, dc.y, R * 0.79, -Math.PI / 2, -Math.PI / 2 + (turns - 1) * TAU); g.stroke(); }
        }
        drawBox(g, t, T, br);
        P.update(dt); drawP(g, P);
        if (st.goldDust && Math.random() < dt * 12) P.emit('mote', Math.random() * W, Math.random() * H * 0.85, 1, { colors: ['#ffe9a8', '#ffd36b', '#ffc24a'], speed: [6, 26], size: [2, 4.2], life: [2.4, 4.4] });
        if (st.goldDust && Math.random() < dt * 22) P.emit('dust', Math.random() * W, Math.random() * H * 0.85, 1, { colors: ['rgba(255,214,120,0.85)', 'rgba(255,236,180,0.8)'], speed: [4, 18], size: [1.2, 2.6], life: [2.2, 4] });
        g.restore();
        if (st.flash > 0) { g.fillStyle = 'rgba(255,240,200,' + (st.flash * 0.3).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
        void dt;
      });

      /* the new deposit box: card in, odds tag, date plate, then it glides into its slot */
      function boxPos() {
        const b = M.box, k = st.boxT, e = K.ease.inOutCubic(k), sl = M.slot;
        const s = lerp(1, sl.w / b.w, e), x = lerp(b.x + b.w / 2, sl.x + sl.w / 2, e), y = lerp(b.y + b.h / 2, sl.y + sl.h / 2, e) - Math.sin(e * Math.PI) * M.R * 0.5;
        return { x, y, s };
      }
      function drawBox(g, t, T, br) {
        if (st.phase === 'intro' || st.phase === 'due') return;
        const b = M.box, q = boxPos(), w = b.w * q.s, hh = b.h * q.s;
        g.save(); g.translate(q.x, q.y);
        if (st.boxT > 0.98) { g.globalAlpha = 0.85 + 0.15 * Math.sin(t * 3); g.drawImage(glow(T.glow), -w, -hh * 1.4, w * 2, hh * 2.8); g.globalAlpha = 1; }
        const gr = g.createLinearGradient(0, -hh / 2, 0, hh / 2); gr.addColorStop(0, T.brass0); gr.addColorStop(0.5, T.brass1); gr.addColorStop(1, T.brass2);
        g.fillStyle = gr; rr(g, -w / 2, -hh / 2, w, hh, 6 * q.s); g.fill(); g.strokeStyle = hexA('#3a2405', 0.8); g.lineWidth = 1.5; g.stroke();
        // lid seam and handle
        g.strokeStyle = hexA('#3a2405', 0.45); g.lineWidth = 1; g.beginPath(); g.moveTo(-w / 2 + 4, -hh * 0.18); g.lineTo(w / 2 - 4, -hh * 0.18); g.stroke();
        g.strokeStyle = T.brass2; g.lineWidth = 3 * q.s; g.beginPath(); g.moveTo(-w * 0.14, -hh * 0.34); g.lineTo(w * 0.14, -hh * 0.34); g.stroke();
        if (q.s > 0.6) {
          const fsz = Math.max(12, Math.round(hh * 0.27));
          g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 ' + fsz + 'px ' + uiFont();
          if (st.choice) { g.save(); g.translate(-w * 0.22, hh * 0.02); g.rotate(-0.08); g.fillStyle = '#fff8e6'; rr(g, -w * 0.17, -hh * 0.2, w * 0.34, hh * 0.42, 3); g.fill(); g.strokeStyle = hexA('#6b420c', 0.7); g.lineWidth = 1.2; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-w * 0.12, -hh * 0.09 + i * hh * 0.1); g.lineTo(w * (i === 2 ? 0.02 : 0.12), -hh * 0.09 + i * hh * 0.1); g.stroke(); } g.restore(); }
          if (st.oddsSet || st.phase === 'odds') { g.fillStyle = '#2b1a05'; g.fillText(st.odds + '%', w * 0.22, hh * 0.06); }
          if (st.day) { g.fillStyle = hexA('#2b1a05', 0.9); rr(g, -w * 0.44, hh * 0.27, w * 0.88, hh * 0.21, 3); g.fill(); g.fillStyle = '#ffe6a8'; g.font = '800 12px ' + uiFont(); g.fillText(fmt(st.day.d).toUpperCase(), 0, hh * 0.375 + 0.5); }
        }
        // wax seal
        if (st.sealed) { g.fillStyle = '#a3122c'; g.beginPath(); g.arc(w * 0.36, -hh * 0.3, Math.max(4, 9 * q.s), 0, TAU); g.fill(); g.fillStyle = '#e04a5f'; g.beginPath(); g.arc(w * 0.36 - 1.5 * q.s, -hh * 0.3 - 1.5 * q.s, Math.max(1.5, 3.5 * q.s), 0, TAU); g.fill(); }
        g.restore();
        void br;
      }

      /* ---------------- panel helpers ---------------- */
      function setPanel(kids) { panel.replaceChildren(...kids.filter(Boolean)); panel.classList.remove('off'); }
      const stepTag = (n, label) => h('div', { class: 'pv-step' }, h('span', { text: 'Step ' + n + ' of 4 · ' + label }), h('i', { text: ['', 'pick', 'odds', 'day', 'seal'].map((x, i) => (i && i <= n ? '●' : i ? '○' : '')).join('') }));
      function updateHud() {
        const c = calib(), sealedN = boxes.length;
        if (!sealedN) { hud.hidden = true; return; }
        hud.hidden = false;
        hud.replaceChildren(h('b', { text: 'The archive' }), document.createTextNode(c.n ? (M.wide ? calLine(c) : c.yes + ' of ' + c.n + ' fears came true') : sealedN + ' prediction' + (sealedN === 1 ? '' : 's') + ' sealed'));
      }

      /* ---------------- step 0: open what's due ---------------- */
      async function openDue() {
        for (const bx of due) {
          st.phase = 'due'; st.dueBox = bx;
          const card = h('div', { class: 'pv-due' }, h('small', { text: bx.due === todayKey ? 'Box due today' : 'Box ready to open' }), h('b', { text: clip(bx.title || 'A sealed prediction', 60) }), h('span', { text: 'Sealed at ' + bx.p + '% · due ' + (parseKey(bx.due) ? fmt(parseKey(bx.due)) : bx.due) }));
          card.style.top = (M.wide ? M.cy - 70 : M.cy - 60) + 'px'; card.style.left = M.cx + 'px';
          el.append(card); clunk(0.7); K.sfx.whoosh(); st.kick = 0.6;
          glitch.say(L(LINES.due), { mood: 'scan', ms: 4200 });
          const answer = await new Promise(res => {
            const btn = (id, label) => { const b = h('button', { type: 'button', class: 'pv-ans', text: label }); K.tap(b, () => res(id)); return b; };
            setPanel([h('div', { class: 'pv-step' }, h('span', { text: 'Opening day' }), h('i', { text: (due.indexOf(bx) + 1) + ' of ' + due.length })), h('div', { class: 'pv-q', text: 'Did it happen?' }), h('div', { class: 'pv-row' }, btn('yes', 'Yes'), btn('no', 'No'), btn('partly', 'Partly'))]);
            K.guide({ id: 'due', g: 'choose', target: () => Array.from(panel.querySelectorAll('.pv-ans')), label: 'DID IT HAPPEN?', delay: 900 });
          });
          K.guide(null);
          bx.outcome = answer; bx.opened = todayKey;
          S.store.set(KEY, boxes.map(b => ({ title: String(b.title || '').slice(0, 80), p: b.p, due: b.due, created: b.created, outcome: b.outcome || null })));
          ctx.track('due_outcome', { o: answer === 'yes' ? 1 : answer === 'no' ? 0 : 2 });
          const stamp = h('span', { class: 'pv-stamp', text: answer === 'yes' ? 'HAPPENED' : answer === 'no' ? 'DIDN’T' : 'PARTLY' });
          stamp.style.color = answer === 'yes' ? '#a3122c' : answer === 'no' ? '#1e6b3a' : '#7a4f12';
          card.append(stamp); clunk(0.9); K.sfx.thud(); st.kick = 0.8;
          glitch.say(L(answer === 'yes' ? LINES.yes : answer === 'no' ? LINES.no : LINES.partly), { mood: answer === 'yes' ? 'think' : answer === 'no' ? 'wow' : 'smug', ms: 3200 });
          updateHud();
          await K.wait(K.reduced() ? 700 : 1600);
          card.remove();
        }
        const c = calib();
        if (c.n) {
          glitch.say(L(LINES.cal, { line: calLine(c) }), { mood: 'nerd', ms: 4600 });
          setPanel([h('div', { class: 'pv-step' }, h('span', { text: 'Your archive' })), h('div', { class: 'pv-q', text: calLine(c) + '.' }), h('div', { class: 'pv-note' }, 'You gave them ', h('b', { text: c.avgP + '%' }), ' on average. Reality said ', h('b', { text: c.rate + '%' }), '.')]);
          shimmer();
          await K.wait(K.reduced() ? 1200 : 3400);
        }
      }

      /* ---------------- step 1: pick the version you'd bet on ---------------- */
      function stepPick() {
        aiDone = true; st.phase = 'pick'; panel.classList.add('off');
        cards.replaceChildren(h('div', { class: 'pv-cardq', text: 'Which prediction goes in the box?' }));
        OPTS.forEach((o, i) => {
          const b = h('button', { type: 'button', class: 'pv-card', 'data-i': String(i) }, h('small', { text: o.tag }), h('span', { class: 'gk-user', text: o.text }));
          K.tap(b, () => pick(i, b)); cards.append(b);
        });
        cards.hidden = false;
        glitch.say(L(LINES.pick), { mood: 'think', ms: 4200 });
        K.guide({ id: 'pick', g: 'choose', target: () => Array.from(cards.querySelectorAll('.pv-card')), label: 'PICK YOUR PREDICTION', delay: 1000 });
      }
      function pick(i, b) {
        if (st.phase !== 'pick') return;
        st.phase = 'picked'; st.choice = OPTS[i]; K.guide(null); mark(); K.later(mark, 600);
        b.classList.add('pick'); K.sfx.paper(); K.sfx.pop(undefined, 700);
        cards.querySelectorAll('.pv-card').forEach(x => { if (x !== b) x.classList.add('gone'); });
        ctx.track('pick', { i });
        K.later(() => { b.classList.add('gone'); K.sfx.paper(); clunk(0.4); P.emit('spark', M.cx, M.box.y + 10, 14, { colors: ['#fff1c8', '#ffd36b'] }); }, 520);
        K.later(() => { cards.hidden = true; stepOdds(); }, 860);
      }

      /* ---------------- step 2: the combination dial sets the odds ---------------- */
      function stepOdds() {
        st.phase = 'odds'; hit.hidden = false; mark(); hit.setAttribute('aria-label', 'Odds dial. Drag around the dial, or use the arrow keys.'); hit.setAttribute('aria-valuenow', String(st.odds));
        const big = h('div', { class: 'pv-big', text: st.odds + '%' });
        const lock = K.button('Lock in ' + st.odds + '%', () => lockOdds(), {});
        const c = calib();
        setPanel([stepTag(1 + 1, 'the odds'), h('div', { class: 'pv-pred gk-user', text: st.choice.text }), h('div', { class: 'pv-oddsrow' }, h('div', { class: 'pv-q', text: 'Honestly, how likely is it?' }), big),
          c.n >= 2 ? h('div', { class: 'pv-note' }, 'Past fears came true ', h('b', { text: c.rate + '%' }), ' of the time.') : null, lock]);
        st.oddsEls = { big, lock };
        glitch.say(L(LINES.odds), { mood: 'scan', ms: 3800 });
        K.guide({ id: 'odds', g: 'circle', target: () => dialC(), r: M.R * 0.42, label: 'TURN THE DIAL', delay: 900 });
      }
      function setOdds(v) {
        v = clamp(Math.round(v), 0, 100);
        if (v === st.odds) return;
        const prev = st.odds; st.odds = v; st.dialAng = -v / 100 * TAU; mark();
        const step5 = Math.floor(v / 5) !== Math.floor(prev / 5);
        if (now() - st.lastClick > 28) { st.lastClick = now(); ratchet(v % 25 === 0); if (v % 25 === 0) TS_buzz(12); }
        if (step5 && A.ctx) A.tone({ type: 'sine', freq: 300 + v * 6, dur: 0.08, vol: 0.035 });
        if (st.oddsEls) { st.oddsEls.big.textContent = v + '%'; st.oddsEls.lock.textContent = 'Lock in ' + v + '%'; }
        hit.setAttribute('aria-valuenow', String(v));
      }
      function TS_buzz(ms) { try { S.buzz(ms); } catch (e) { /* no vibration */ } }
      function lockOdds() {
        if (st.phase !== 'odds') return;
        st.oddsSet = true; st.phase = 'day'; K.guide(null); clunk(0.8); K.sfx.lock(); st.kick = 0.6; mark();
        P.emit('spark', M.cx + M.box.w * 0.2, M.box.y + M.box.h * 0.6, 16, { colors: ['#fff1c8', '#ffd36b'] });
        ctx.track('odds', { p: st.odds });
        // the halfway twist: how true it felt versus what you'd actually bet
        const bf = ctx.before;
        if (bf != null && Math.abs(bf - st.odds) >= 15) {
          const low = st.odds < bf;
          st.twist = { low, line: L(low ? LINES.gapLow : LINES.gapHigh, { feel: bf + '%', odds: st.odds + '%' }), note: 'It felt ' + bf + '% true. You’d bet ' + st.odds + '%.' };
          K.pop(low ? 'FEELING ≠ ODDS' : 'BOLD ODDS', { x: M.cx, y: M.cy - M.R * 0.62, kind: 'great' }); K.sfx.sparkle();
          glitch.face(low ? 'idea' : 'gasp', 1600);
        } else glitch.face(st.odds >= 70 ? 'gasp' : 'nerd', 900);
        K.later(stepDay, 420);
      }

      /* ---------------- step 3: the check day ---------------- */
      function stepDay() {
        hit.hidden = true;
        const row = h('div', { class: 'pv-row' });
        DAYS.forEach(d => { const b = h('button', { type: 'button', class: 'pv-day' }, h('b', { text: d.label }), h('span', { text: fmt(d.d) })); K.tap(b, () => pickDay(d)); row.append(b); });
        setPanel([stepTag(3, 'check day'), st.twist ? h('div', { class: 'pv-note' }, h('b', { text: st.twist.note })) : null, h('div', { class: 'pv-q', text: 'When do we open it?' }), row, serious ? h('div', { class: 'pv-plan' }, h('b', { text: 'Meanwhile: ' }), lead('prepare')) : null]);
        if (st.twist && !serious) glitch.say(st.twist.line, { mood: st.twist.low ? 'idea' : 'gasp', ms: 4600 });
        else glitch.say(L(serious ? LINES.daySerious : LINES.day), { mood: serious ? 'determined' : 'think', ms: 4200 });
        K.guide({ id: 'day', g: 'choose', target: () => Array.from(panel.querySelectorAll('.pv-day')), label: 'PICK A CHECK DAY', delay: 900 });
      }
      function pickDay(d) {
        if (st.phase !== 'day') return;
        st.day = d; st.phase = 'stamped'; K.guide(null); mark();
        K.sfx.thud(); clunk(0.6); st.kick = 0.9; st.flash = 0.25;
        P.emit('dust', M.cx, M.box.y + M.box.h * 0.85, 12);
        ctx.track('day', { id: d.id === 'tomorrow' ? 1 : d.id === 'week' ? 7 : 3 });
        K.later(stepSpin, 520);
      }

      /* ---------------- step 4: spin the wheel 1.5 turns to seal ---------------- */
      function stepSpin() {
        st.phase = 'spin'; hit.hidden = false; mark(); hit.setAttribute('aria-label', 'Vault wheel. Spin it one and a half turns, or press Space.');
        const meter = h('div', { class: 'pv-meter' }, h('i'));
        setPanel([stepTag(4, 'seal'), h('div', { class: 'pv-q', text: 'Spin the wheel 1½ turns to seal it.' }), meter, h('div', { class: 'pv-note' }, 'Sealed at ', h('b', { text: st.odds + '%' }), ' · opens ', h('b', { text: st.day.say + ' (' + fmt(st.day.d) + ')' }))]);
        st.meter = meter.firstChild;
        glitch.say(L(LINES.spin), { mood: 'determined', ms: 3800 });
        K.guide({ id: 'spin', g: 'circle', target: () => dialC(), r: M.R * 0.66, label: 'SPIN 1½ TURNS', delay: 900 });
      }
      function addSpin(da, dtMs) {
        if (st.phase !== 'spin') return;
        const before = Math.abs(st.spin);
        st.spin += da; st.wheel += da; st.gear += da * 0.6; mark();
        const k = clamp(Math.abs(st.spin) / st.spinTarget, 0, 1);
        if (dtMs > 0 && Math.abs(da) > 0.002) st.spinV.push(Math.abs(da) / dtMs);
        // the machine follows the spin: the box glides into its slot, then the door swings shut and the bolts throw
        st.boxT = clamp(k / 0.55, 0, 1);
        st.ajar = 1 - clamp((k - 0.45) / 0.5, 0, 1);
        st.bolts = clamp((k - 0.9) / 0.1, 0, 1);
        const notch = Math.floor(Math.abs(st.spin) / (TAU / 24));
        if (notch !== st.lastTick) { st.lastTick = notch; ratchet(notch % 6 === 0); if (notch % 3 === 0) gearGrind(0.8); if (A.ctx && notch % 2 === 0) A.pluck(A.note(PENT[Math.min(PENT.length - 1, Math.floor(k * PENT.length))]), { vol: 0.07, damp: 0.995, verb: 0.35, lp: 3600 }); }
        if (st.meter) st.meter.style.width = (k * 100).toFixed(1) + '%';
        if (before / st.spinTarget < 0.55 && k >= 0.55) { K.sfx.chime(4); P.emit('star', M.slot.x + M.slot.w / 2, M.slot.y + M.slot.h / 2, 12, { colors: ['#fff1c8', '#ffd36b'] }); }
        if (k >= 1) sealIt();
      }

      /* ---------------- finale ---------------- */
      async function sealIt() {
        if (st.phase !== 'spin') return;
        st.phase = 'sealing'; hit.hidden = true; K.guide(null);
        st.boxT = 1; st.ajar = 0; st.bolts = 1; st.sealed = true; slotEl.style.display = 'none';
        clunk(1.2); K.later(() => clunk(0.9), 140); K.sfx.lock(); st.kick = 1.2; st.flash = 0.3; TS_buzz(30); st.sealT = now();
        const created = todayKey, rec = { title: clip(an.case_title || 'A sealed prediction', 80), p: st.odds, due: dayKey(st.day.d), created, outcome: null };
        boxes.push(rec);
        S.store.set(KEY, boxes.slice(-60).map(b => ({ title: String(b.title || '').slice(0, 80), p: b.p, due: b.due, created: b.created, outcome: b.outcome || null })));
        ctx.track('sealed', { p: st.odds, days: Math.round((st.day.d - today) / 86400000) });
        updateHud();
        panel.classList.add('off');
        const tag = h('div', { class: 'pv-tag', text: fmt(st.day.d).toUpperCase() + ' · ' + st.odds + '%' }); const sl = M.slot; tag.style.top = (sl.y + sl.h + 6) + 'px'; el.append(tag); const tw = (tag.offsetWidth || 150) / 2 + 8; tag.style.left = clamp(sl.x + sl.w / 2, tw, M.w - tw) + 'px';
        glitch.say(L(serious ? LINES.endSerious : LINES.end, { day: st.day.say }), { mood: serious ? 'determined' : 'celebrate', ms: 0 });
        // gears turn on, light sweeps across the brass, gold dust hangs in the air
        st.goldDust = true; shimmer();
        if (A.ctx) A.pad(['A2', 'E3', 'A3', 'C#4', 'E4'].map(n => A.note(n)), { dur: 5.5, vol: 0.16, attack: 0.5 });
        const t0 = now();
        await new Promise(res => { const lp = K.loop(() => { const k = (now() - t0) / 1500; st.gear += 0.03; st.sweep = clamp(k, 0, 1); if (k >= 1) { lp.stop(); st.sweep = -1; res(); } }); });
        for (let i = 0; i < 26; i++) P.emit('mote', M.cx + (Math.random() - 0.5) * M.R * 2.4, M.cy + (Math.random() - 0.5) * M.R * 2, 1, { colors: ['#ffe9a8', '#ffd36b'], speed: [10, 40] });
        const c = calib();
        setPanel([h('div', { class: 'pv-step' }, h('span', { text: 'Sealed' }), h('i', { text: seal })), h('div', { class: 'pv-big', text: st.odds + '%' }), h('div', { class: 'pv-note' }, 'Opens ', h('b', { text: st.day.say + ' · ' + fmt(st.day.d) }), '. Reality gets the final say.'),
          serious ? h('div', { class: 'pv-plan' }, h('b', { text: 'Meanwhile: ' }), lead('prepare')) : (c.n ? h('div', { class: 'pv-note', text: calLine(c) + '.' }) : null),
          care ? h('div', { class: 'pv-note', text: 'Someone qualified can tell you exactly where you stand.' }) : null]);
        await K.wait(K.reduced() ? 1800 : 3600);
        finishGame();
      }
      function finishGame() {
        if (st.finished) return; st.finished = true;
        const v = st.spinV.slice(4), mean = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
        const sd = v.length ? Math.sqrt(v.reduce((a, b) => a + (b - mean) * (b - mean), 0) / v.length) : 0;
        const steady = mean ? clamp(1 - sd / (mean * 1.2), 0, 1) : 0.8, pct = Math.round(steady * 100);
        const best = K.best('steady', pct, 'higher'), tier = K.tier(steady, [0.45, 0.65, 0.82]), col = K.collect(seal);
        const badges = [];
        if (best.isNew) badges.push('New best: ' + pct + '% steady seal'); else if (best.first) badges.push('Steady seal: ' + pct + '%');
        if (tier) badges.push(tier + ' seal');
        if (col.isNew) badges.push('Collected: ' + seal + ' (' + Math.min(col.count, SEALS.length) + '/' + SEALS.length + ')');
        const c = calib(); if (c.n >= 3 && badges.length < 4) badges.push(c.n + ' predictions checked');
        const lines = ['Sealed at ' + st.odds + '%', 'Open ' + st.day.say + ' (' + fmt(st.day.d) + ')'];
        if (c.n) lines.push(calLine(c)); else if (serious) lines.push('Meanwhile: ' + clip(lead('prepare'), 60));
        ctx.finish({ title: 'Sealed until ' + (st.day.id === 'tomorrow' ? 'tomorrow' : st.day.id === 'week' ? 'next week' : st.day.label), mood: 'cool', lines: lines.slice(0, 3), share: 'I sealed a worry in the vault at ' + st.odds + '%. Reality opens it ' + st.day.say + '.', badges: badges.slice(0, 4) });
      }

      /* ---------------- input: circular drags on the door ---------------- */
      let lastA = null, lastT = 0;
      const angAt = (p) => { const c = dialC(); return Math.atan2(p.y - c.y, p.x - c.x); };
      K.drag(hit, {
        space: el,
        start: (p) => { if (st.phase !== 'odds' && st.phase !== 'spin') return false; lastA = angAt(p); lastT = now(); ratchet(false); st.kick = 0.15; },
        move: (p) => {
          if (lastA == null) return;
          const a = angAt(p); let da = a - lastA; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; lastA = a;
          const tNow = now(), dtMs = tNow - lastT; lastT = tNow;
          if (st.phase === 'odds') setOdds(st.odds + da / TAU * 100 * 0.9);
          else if (st.phase === 'spin') addSpin(da, dtMs);
        },
        end: () => { lastA = null; if (st.phase === 'spin' && Math.abs(st.spin) < st.spinTarget) K.guide({ id: 'spin2', g: 'circle', target: () => dialC(), r: M.R * 0.66, label: 'KEEP SPINNING', delay: 1200 }); }
      });
      K.onKey(['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'Space', 'Enter'], (e) => {
        if (st.phase === 'odds') { if (e.code === 'Enter') { lockOdds(); return; } const d = e.code === 'ArrowRight' || e.code === 'ArrowUp' ? 5 : e.code === 'ArrowLeft' || e.code === 'ArrowDown' ? -5 : 0; if (d) { e.preventDefault(); setOdds(st.odds + d); } }
        else if (st.phase === 'spin' && (e.code === 'Space' || e.code === 'ArrowRight')) { e.preventDefault(); addSpin(TAU / 12, 120); }
      });

      /* ---------------- lines (every one in three vibes) ---------------- */
      const LINES = {
        intro: visits ? { Jolly: 'Back in the vault! Let’s seal today’s worry and let reality grade it.', Cheeky: 'Welcome back, depositor. Another worry for the archive?', Unfiltered: 'Vault’s open. Seal it, then check it later.' }
          : { Jolly: 'Welcome to the vault. We don’t argue with worries here. We seal them and check later.', Cheeky: 'Your brain makes predictions all day. Let’s actually keep score.', Unfiltered: 'Write the prediction. Set the odds. Check it on the day.' },
        due: { Jolly: 'This one’s ready to open! Did it actually happen?', Cheeky: 'Box due. Moment of truth. Did it happen?', Unfiltered: 'Due. Did it happen?' },
        yes: { Jolly: 'It happened. Thanks for being honest. That’s how the archive learns.', Cheeky: 'Fair play, that one landed. Honest records only.', Unfiltered: 'It happened. Logged honestly.' },
        no: { Jolly: 'It didn’t happen. Filed. The archive keeps the score.', Cheeky: 'Didn’t happen. The vault is taking notes.', Unfiltered: 'Didn’t happen. Logged.' },
        partly: { Jolly: 'Partly. Real life loves a middle answer.', Cheeky: 'Partly. Reality hates our all-or-nothing plots.', Unfiltered: 'Partly. Logged as half.' },
        cal: { Jolly: '{line}. That’s your real record.', Cheeky: '{line}. The vault never forgets.', Unfiltered: '{line}. That’s the data.' },
        pick: { Jolly: 'Pick the version you’d actually bet on.', Cheeky: 'Choose your fighter. Which version goes in the box?', Unfiltered: 'Which version are you predicting?' },
        odds: { Jolly: 'Now the odds. Turn the dial. Honestly, how likely?', Cheeky: 'Dial it in. No judging, just numbers.', Unfiltered: 'Set the odds. Be honest.' },
        day: { Jolly: 'When should we open it? Pick a day you’ll actually know.', Cheeky: 'Set a date. Reality will be there.', Unfiltered: 'Pick the check day.' },
        daySerious: { Jolly: 'This worry has real backing, so plan for it while it’s sealed. When do we check?', Cheeky: 'Not a silly worry, so: plan and a date. When do we open?', Unfiltered: 'Real worry. Plan meanwhile. Pick the check day.' },
        gapLow: { Jolly: 'It felt {feel} true, but you’d bet {odds}. Feelings and odds aren’t the same thing.', Cheeky: '{feel} gut feeling, {odds} betting money. Interesting.', Unfiltered: 'Felt {feel}. Bet {odds}. Note the gap.' },
        gapHigh: { Jolly: 'You’d bet even more than it feels. Reality will tell us.', Cheeky: 'Bold odds! Let’s see if reality agrees.', Unfiltered: 'Higher than the feeling. We’ll check.' },
        spin: { Jolly: 'Spin the big wheel, one and a half turns. Feel those gears.', Cheeky: 'Give it a good spin. One and a half turns. Dramatically.', Unfiltered: 'Spin 1½ turns. Seal it.' },
        end: { Jolly: 'Sealed! Reality gets the final say {day}.', Cheeky: 'Locked tight. We find out who was right {day}.', Unfiltered: 'Sealed. Check it {day}.' },
        endSerious: { Jolly: 'Sealed, with a plan for the meantime. Check it {day}.', Cheeky: 'Locked, and you’ve got a plan. Check it {day}.', Unfiltered: 'Sealed. Do the plan. Check it {day}.' }
      };

      /* ---------------- flow ---------------- */
      updateHud();
      (async () => {
        await K.intro({ title: 'Prediction Vault', sub: 'Worries are predictions. Seal yours, set the odds, and let reality open it.', how: 'Pick the prediction. Turn the dial. Pick a day. Spin to seal.', char: 'glitch', mood: 'cool' });
        st.phase = 'intro2';
        glitch.say(L(LINES.intro), { mood: 'cool', ms: 3800 });
        if (due.length) { await K.wait(800); await openDue(); }
        else await K.wait(K.reduced() ? 300 : 900);
        stepPick();
      })();

      return {
        async autoplay() {
          const wait = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(90); };
          await wait(() => st.phase === 'due' || st.phase === 'pick');
          while (st.phase === 'due') { await K.wait(700); const b = panel.querySelector('.pv-ans:nth-child(2)'); if (b) await K.sim.tap(b); await wait(() => st.phase !== 'due' || !panel.querySelector('.pv-ans'), 4000); await K.wait(300); }
          await wait(() => st.phase === 'pick');
          await K.wait(900);
          const c = cards.querySelectorAll('.pv-card')[1]; if (c) await K.sim.tap(c);
          await wait(() => st.phase === 'odds');
          await K.wait(700);
          // turn the dial from its current value to 30 points lower or higher
          const r = M.R * 0.4, a0 = -Math.PI / 2 + 0.3, steps = 18, hr = K.rectIn(hit), target = st.odds >= 50 ? -1 : 1;
          const pt = (a) => ({ x: M.cx + Math.cos(a) * r - hr.x, y: M.cy + Math.sin(a) * r - hr.y });
          const hp = await K.sim.press(hit, pt(a0).x, pt(a0).y);
          for (let i = 1; i <= steps; i++) { await K.wait(45); const q = pt(a0 + target * i / steps * TAU * 0.33); hp.move(q.x, q.y); }
          hp.up(pt(a0 + target * TAU * 0.33).x, pt(a0 + target * TAU * 0.33).y);
          await K.wait(600);
          const lock = panel.querySelector('.ts-btn'); if (lock) await K.sim.tap(lock);
          await wait(() => st.phase === 'day');
          await K.wait(900);
          const days = panel.querySelectorAll('.pv-day'); if (days[1]) await K.sim.tap(days[1]);
          await wait(() => st.phase === 'spin');
          await K.wait(800);
          const R2 = M.R * 0.66, hr2 = K.rectIn(hit), pt2 = (a) => ({ x: M.cx + Math.cos(a) * R2 - hr2.x, y: M.cy + Math.sin(a) * R2 - hr2.y });
          const sp = await K.sim.press(hit, pt2(-Math.PI / 2).x, pt2(-Math.PI / 2).y);
          for (let i = 1; i <= 60 && st.phase === 'spin'; i++) { await K.wait(40); const q = pt2(-Math.PI / 2 + i / 60 * TAU * 1.62); sp.move(q.x, q.y); }
          sp.up(0, 0);
          await wait(() => st.finished, 20000);
        }
      };
    }
  });
})(window.TSG_ENV);
