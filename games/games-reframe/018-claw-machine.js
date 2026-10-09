/* 018 Claw Machine — Reframe · REFRAME · Overthinking / Thought Fusion
 * Mechanism: workability from ACT (Hayes, Strosahl & Wilson: "is gripping this thought working for you?") and a CBT
 * cost-benefit analysis (Burns 1980; Beck): weighing what holding a thought costs (sleep, mood, time, confidence, people)
 * against what it gives (protection, motivation, feeling prepared) loosens the grip on unhelpful thoughts while a workable
 * version is kept. A thought that is let go is not destroyed (defusion, not suppression): its capsule floats back into the
 * machine, lighter. Rewards are earned by skill (steady grabs), never by chance; the slip is the same for everyone.
 * Verb: grab (drag the joystick to steer the swinging claw, tap DROP), weigh (tap what holding it costs and gives), then
 * pry the claw open to let go. Finale: the steady claw drops the golden prize capsule down the chute, the prize door pops,
 * the capsule opens on a bubble-character figurine holding the workable thought, and stars rain on the machine.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
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
  function rr(g, x, y, w, hh, r) { r = Math.max(0, Math.min(r, w / 2, hh / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  const ICO = {
    sleep: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3a8.2 8.2 0 1 0 6 13.4A9 9 0 0 1 15 3z" fill="currentColor"/></svg>',
    mood: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/><circle cx="15" cy="10" r="1.5" fill="currentColor"/><path d="M8 16.6q4-3.2 8 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    time: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 7v5l3.4 2.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    confidence: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6 6.7 19.4l1.2-6L3.4 9.3l6-.7z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
    people: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.4" fill="currentColor"/><circle cx="16.5" cy="9" r="2.8" fill="currentColor" opacity=".7"/><path d="M2.5 20c.6-4.4 3.3-6.4 6.5-6.4s5.9 2 6.5 6.4z" fill="currentColor"/><path d="M14.6 20c.4-3 2-4.8 4-4.8s3.4 1.8 3.8 4.8z" fill="currentColor" opacity=".7"/></svg>',
    protection: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l8 3v6c0 5-3.5 8.7-8 10-4.5-1.3-8-5-8-10v-6z" fill="currentColor"/></svg>',
    motivation: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2L4 14h6.5l-1.5 8 9.5-12.5H12z" fill="currentColor"/></svg>',
    prepared: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17.5" rx="2.4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M8.5 10.4l2.1 2.1 4.2-4.3M8.5 16.3h7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  (env.games = env.games || []).push({
    id: 'claw-machine', mode: 'reframe', name: 'Claw Machine', verb: 'grab', family: 'REFRAME', minutes: 2,
    parents: ['Overthinking / Thought Fusion', 'Decision Pressure', 'Mental Overload / Working Memory'],
    cast: ['loopie', 'glitch', 'rush'], poster: { char: 'loopie', mood: 'wow' },
    fonts: ['Lilita+One', 'Patrick+Hand'],
    tagline: 'Grab the thoughts you keep gripping. Weigh them. Let go of one.',
    why: 'For a head full of thoughts you can’t put down: weigh what each costs, then loosen your grip.',
    css: `
.g-claw-machine { --cm-a: #ff6fb5; --cm-b: #4fe0c0; --cm-c: #ffc93f; --cm-ink: #3b1f3d; --cm-body: #ff8cc8;
  --cm-disp: "Lilita One", "Arial Rounded MT Bold", "Baloo 2", system-ui, sans-serif;
  --cm-hand: "Patrick Hand", "Segoe Print", "Bradley Hand", "Comic Sans MS", system-ui, sans-serif; }
.g-claw-machine .cm-hud { position: absolute; z-index: 26; left: 10px; right: 10px; top: calc(env(safe-area-inset-top, 0px) + 60px); display: flex; justify-content: space-between; gap: 8px; pointer-events: none; }
.g-claw-machine .cm-pill { display: flex; align-items: center; gap: 7px; padding: 5px 12px 5px 5px; border-radius: 999px; background: #fffdf8; color: var(--cm-ink); font: 400 15px/1 var(--cm-disp); letter-spacing: .02em;
  box-shadow: 0 3px 0 rgba(60, 20, 60, .18), 0 8px 18px rgba(0, 0, 0, .18); transition: transform .3s cubic-bezier(.2, 1.6, .4, 1); }
.g-claw-machine .cm-pill i { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: var(--cm-b); color: #fff; font-style: normal; }
.g-claw-machine .cm-pill i svg { width: 16px; height: 16px; }
.g-claw-machine .cm-pill b { font-weight: 400; font-variant-numeric: tabular-nums; }
.g-claw-machine .cm-pill.bump { transform: scale(1.14); }
.g-claw-machine .cm-marquee { position: absolute; z-index: 15; display: grid; place-items: center; text-align: center; font: 400 25px/1 var(--cm-disp); color: #fff; letter-spacing: .05em; pointer-events: none;
  text-shadow: 0 3px 0 rgba(80, 20, 70, .35), 0 0 16px rgba(255, 255, 255, .55); white-space: nowrap; }
.g-claw-machine .cm-lcd { position: absolute; z-index: 16; display: flex; flex-direction: column; justify-content: center; gap: 3px; padding: 6px 12px; border-radius: 12px; background: linear-gradient(180deg, #14302a, #0e2420);
  border: 3px solid #0a1914; box-shadow: inset 0 0 18px rgba(80, 255, 180, .16), 0 2px 0 rgba(255, 255, 255, .45); color: #b8ffe0; overflow: hidden; }
.g-claw-machine .cm-lcd small { font: 400 12px/1 var(--cm-disp); letter-spacing: .1em; text-transform: uppercase; color: #6fe6b2; }
.g-claw-machine .cm-lcd span { font: 400 17px/1.12 var(--cm-hand); color: #d6ffee; text-shadow: 0 0 8px rgba(120, 255, 190, .45); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.g-claw-machine .cm-lcd .gk-user { font: 400 17px/1.12 var(--cm-hand); }
.g-claw-machine .cm-lcd.hot { box-shadow: inset 0 0 22px rgba(255, 220, 120, .3), 0 0 0 3px #ffd36b, 0 2px 0 rgba(255, 255, 255, .45); }
.g-claw-machine .cm-rail { position: absolute; z-index: 18; height: 58px; border-radius: 29px; background: linear-gradient(180deg, #3b2a46, #231a2c); box-shadow: inset 0 3px 8px rgba(0, 0, 0, .55), 0 2px 0 rgba(255, 255, 255, .4); touch-action: none; cursor: grab; }
.g-claw-machine .cm-rail::before { content: ""; position: absolute; left: 22px; right: 22px; top: 50%; height: 6px; margin-top: -3px; border-radius: 3px; background: repeating-linear-gradient(90deg, rgba(255, 255, 255, .28) 0 2px, transparent 2px 14px); }
.g-claw-machine .cm-rail:focus-visible { outline: 3px solid var(--cm-c); outline-offset: 3px; }
.g-claw-machine .cm-knob { position: absolute; top: 50%; left: 0; width: 54px; height: 54px; margin: -27px 0 0 -27px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle at 37% 30%, #ffffff, var(--cm-a) 52%, color-mix(in srgb, var(--cm-a) 55%, #000)); box-shadow: 0 5px 0 rgba(0, 0, 0, .3), 0 10px 18px rgba(0, 0, 0, .3), inset 0 -4px 6px rgba(0, 0, 0, .15); transition: transform .12s ease; }
.g-claw-machine .cm-rail.drag .cm-knob { transform: scale(1.1); }
.g-claw-machine .cm-drop { position: absolute; z-index: 18; width: 78px; height: 78px; margin: -39px 0 0 -39px; border-radius: 50%; border: 0; padding: 0; cursor: pointer; display: grid; place-items: center; color: #fff;
  background: radial-gradient(circle at 40% 32%, #fff4c9, var(--cm-c) 45%, color-mix(in srgb, var(--cm-c) 55%, #a0400a)); box-shadow: 0 7px 0 color-mix(in srgb, var(--cm-c) 40%, #5a2006), 0 14px 22px rgba(0, 0, 0, .3); transition: transform .08s ease, box-shadow .08s ease, filter .3s ease; }
.g-claw-machine .cm-drop b { font: 400 19px/1 var(--cm-disp); letter-spacing: .04em; text-shadow: 0 2px 0 rgba(120, 40, 0, .5); }
.g-claw-machine .cm-drop:active, .g-claw-machine .cm-drop.down { transform: translateY(5px); box-shadow: 0 2px 0 color-mix(in srgb, var(--cm-c) 40%, #5a2006), 0 6px 12px rgba(0, 0, 0, .3); }
.g-claw-machine .cm-drop.off { filter: saturate(.3) brightness(.85); }
.g-claw-machine .cm-drop.ready::after { content: ""; position: absolute; inset: -5px; border-radius: 50%; border: 3px solid #fff; animation: claw-machine-ring 1.2s ease-out infinite; pointer-events: none; }
.g-claw-machine .cm-drop:focus-visible { outline: 3px solid #fff; outline-offset: 6px; }
@keyframes claw-machine-ring { from { opacity: .9; transform: scale(1); } to { opacity: 0; transform: scale(1.45); } }
.g-claw-machine .cm-chips { position: absolute; z-index: 19; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; animation: claw-machine-in .4s cubic-bezier(.2, 1.3, .4, 1) both; }
.g-claw-machine .cm-chip { --c: #ff4d6a; appearance: none; border: 0; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-height: 46px; padding: 5px 3px; border-radius: 14px; background: #fffdf8; color: var(--cm-ink);
  border-top: 3px solid var(--c); box-shadow: 0 3px 0 color-mix(in srgb, var(--c) 40%, #8a6a7a), 0 6px 12px rgba(0, 0, 0, .18); font: 400 12px/1.05 var(--cm-disp); letter-spacing: 0; transition: transform .15s ease, opacity .25s ease, background .2s ease; text-align: center; min-width: 0; }
.g-claw-machine .cm-chip i { flex: none; display: grid; place-items: center; width: 20px; height: 20px; color: var(--c); }
.g-claw-machine .cm-chip i svg { width: 19px; height: 19px; }
.g-claw-machine .cm-chip span { max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.g-claw-machine .cm-chip[data-side="gives"] { --c: #19a87e; }
.g-claw-machine .cm-chip.on { background: color-mix(in srgb, var(--c) 22%, #fffdf8); box-shadow: 0 0 0 3px var(--c), 0 6px 12px rgba(0, 0, 0, .18); transform: translateY(2px); }
.g-claw-machine .cm-chip:focus-visible { outline: 3px solid var(--cm-c); outline-offset: 2px; }
.g-claw-machine .cm-chips.done .cm-chip:not(.on) { opacity: .35; }
.g-claw-machine .cm-acts { position: absolute; z-index: 20; display: flex; flex-direction: column; align-items: center; gap: 10px; animation: claw-machine-in .4s cubic-bezier(.2, 1.3, .4, 1) both; }
.g-claw-machine .cm-act { appearance: none; border: 0; cursor: pointer; min-height: 52px; padding: 0 24px; border-radius: 999px; color: #fff; font: 400 18px/1 var(--cm-disp); letter-spacing: .03em;
  background: linear-gradient(180deg, color-mix(in srgb, var(--cm-a) 80%, #fff), var(--cm-a)); box-shadow: 0 5px 0 color-mix(in srgb, var(--cm-a) 50%, #400), 0 12px 20px rgba(0, 0, 0, .25); text-shadow: 0 2px 0 rgba(0, 0, 0, .2); }
.g-claw-machine .cm-act:active { transform: translateY(3px); }
.g-claw-machine .cm-quiet { appearance: none; cursor: pointer; min-height: 44px; padding: 0 18px; border-radius: 999px; border: 2px solid rgba(59, 31, 61, .25); background: rgba(255, 253, 248, .92); color: var(--cm-ink); font: 600 15px/1 var(--font-ui); }
.g-claw-machine .cm-act:focus-visible, .g-claw-machine .cm-quiet:focus-visible { outline: 3px solid var(--cm-c); outline-offset: 3px; }
.g-claw-machine .cm-handle { position: absolute; z-index: 22; width: 74px; height: 74px; margin: -37px 0 0 -37px; border-radius: 50%; touch-action: none; cursor: ew-resize; display: grid; place-items: center;
  border: 3px dashed rgba(255, 255, 255, .95); background: radial-gradient(circle, rgba(255, 255, 255, .28), rgba(255, 255, 255, .06)); box-shadow: 0 0 0 4px rgba(255, 111, 181, .55), 0 0 26px rgba(255, 255, 255, .7); animation: claw-machine-breathe 1.6s ease-in-out infinite; }
.g-claw-machine .cm-handle b { position: absolute; top: calc(100% + 6px); left: 50%; transform: translateX(-50%); padding: 4px 9px; border-radius: 999px; background: #fffdf8; color: var(--cm-ink); font: 400 13px/1 var(--cm-disp); white-space: nowrap; box-shadow: 0 3px 8px rgba(0, 0, 0, .2); }
.g-claw-machine .cm-handle:focus-visible { outline: 3px solid var(--cm-c); outline-offset: 4px; }
@keyframes claw-machine-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.07); } }
.g-claw-machine .cm-sign { position: absolute; z-index: 24; left: 0; right: 0; margin: 0 auto; width: min(330px, calc(100% - 40px)); display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 16px 14px; border-radius: 18px; text-align: center;
  background: #fffdf6; color: var(--cm-ink); box-shadow: 0 6px 0 rgba(120, 70, 20, .25), 0 18px 34px rgba(0, 0, 0, .3); border: 3px solid var(--cm-c); animation: claw-machine-pop .6s cubic-bezier(.2, 1.5, .4, 1) both; }
.g-claw-machine .cm-sign small { font: 400 13px/1 var(--cm-disp); letter-spacing: .1em; text-transform: uppercase; color: #c2410c; }
.g-claw-machine .cm-sign span { font: 400 19px/1.22 var(--cm-hand); text-wrap: balance; }
.g-claw-machine .cm-sign em { font: 500 13px/1.25 var(--font-ui); font-style: normal; color: #6b4b5b; }
@keyframes claw-machine-in { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes claw-machine-pop { 0% { opacity: 0; transform: scale(.4) rotate(-6deg); } 100% { opacity: 1; transform: none; } }
.g-claw-machine .gk-char .gk-bubble { max-width: var(--cm-bub, 240px); }
.g-claw-machine .cm-low .gk-bubble { top: auto; bottom: 2px; }
.g-claw-machine .cm-low.gk-side-right .gk-bubble::before, .g-claw-machine .cm-low.gk-side-left .gk-bubble::before { top: auto; bottom: 22px; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const clamp = K.clamp, lerp = K.lerp, hexA = K.hexA, now = () => performance.now();
      const L = (o, sub) => { let s = ctx.line(o) || ''; if (sub) Object.keys(sub).forEach(k => { s = s.split('{' + k + '}').join(String(sub[k])); }); return s; };
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return (sp > n * 0.6 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; };
      const inten = ctx.intensity;
      const care = an.safety === 'care';
      const support = an.fear_support === 'strong' ? 'strong' : an.fear_support === 'some' ? 'some' : 'weak';
      const serious = support === 'strong';
      const noWords = !String(ctx.text || '').trim();
      const visits = K.visits();
      const bright = () => S.scene() === 'bright';
      const SOFT = softwareGfx();
      const PICK = inten === 0 ? 2 : 3, DAMP = [2.8, 2.1, 1.55][inten] || 2.1, MAXT = inten === 0 ? 2 : 3;

      /* ---------------- the thoughts in the capsules (the player's words only as the analysis gives them) ---------------- */
      const nWords = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
      const PRON = /^(i|im|ive|ill|me|my|mine|myself|you|youre|youve|youll|your|yours|yourself)$/;
      const key3 = (t) => String(t || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').trim().split(/\s+/).filter(w => w && !PRON.test(w)).slice(-3).join(' ');
      const pool = [];
      const addT = (t, user) => { t = String(t || '').replace(/\s+/g, ' ').trim(); if (nWords(t) < 3) return; t = K.sentence(clip(t, 84)); const k = key3(t); if (pool.some(p => p.k === k)) return; pool.push({ text: t, user, k }); };
      if (!noWords) {
        (Array.isArray(an.spans) ? an.spans : []).filter(s => s && s.kind === 'brain' && s.quote).forEach(s => addT(s.quote, true));
        addT(an.thought || an.conclusion, true);
        (Array.isArray(an.exhibits) ? an.exhibits : []).filter(e => e && e.kind === 'brain').forEach(e => addT(e.text, true));
      }
      const hotK = key3(an.thought || an.conclusion);
      // as many rounds as the player has real thoughts (2-3); warm generic ones only when there are no words to use
      const NT = noWords ? MAXT : clamp(pool.length, 2, MAXT);
      ['I should have handled it better.', 'Everyone must have noticed.', 'What if it all goes wrong?'].forEach(t => { if (pool.length < NT) addT(t, false); });
      // gentlest first, the hottest thought last (the one you finally choose to let go of)
      const hot = pool.find(p => p.k === hotK && p.user), rest = pool.filter(p => p !== hot).sort((a, b) => (a.user ? 1 : 0) - (b.user ? 1 : 0));
      const thoughts = rest.slice(0, hot ? NT - 1 : NT).concat(hot ? [hot] : []);
      const leads = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text);
      const lead = (k, fb) => clip((leads.find(l => l.kind === k) || {}).text || fb, 110);
      const lc = (s) => s ? s[0].toLowerCase() + s.slice(1) : s;
      const prizeText = noWords ? 'A thought is just a thought. I can hold it lightly.'
        : serious ? 'One thing I can do: ' + lc(lead('prepare', 'Make a simple plan for the next step.'))
          : clip(an.balanced || 'It fits more than one story, and I don’t know the ending yet.', 130);
      const prizeNote = care ? 'For the facts, ask someone qualified.' : serious ? 'A real worry, held with a plan.' : '';
      const COSTS = [['sleep', 'Sleep'], ['mood', 'Mood'], ['time', 'Time'], ['confidence', 'Confidence'], ['people', 'People']];
      const GIVES = [['protection', 'Protection'], ['motivation', 'Motivation'], ['prepared', 'Prepared', 'Feeling prepared']];
      const SKINS = [
        { key: 'Bubblegum', a: '#ff6fb5', b: '#33d1ad', c: '#ffc23d', d: '#9b8cff', body: ['#ffb6dc', '#ff7cc0'], trim: '#fff0f8', rd: ['#2a1030', '#10050f'], rb: ['#fff4fa', '#ffe0ef'] },
        { key: 'Lemon Soda', a: '#ffb81f', b: '#22b8b2', c: '#ff6f6f', d: '#6f9bff', body: ['#ffeb94', '#ffc93f'], trim: '#fffbe6', rd: ['#231f0e', '#0d0b04'], rb: ['#fffbea', '#fff0c2'] },
        { key: 'Grape Fizz', a: '#8f7bff', b: '#8ad64a', c: '#ff7fbf', d: '#4fc3ff', body: ['#cbbfff', '#9b8cff'], trim: '#f3efff', rd: ['#1a1230', '#090512'], rb: ['#f6f2ff', '#e4daff'] },
        { key: 'Sky Candy', a: '#3fa9ff', b: '#ff9a6b', c: '#ffd23f', d: '#ff7fae', body: ['#acdcff', '#5bb6ff'], trim: '#eef8ff', rd: ['#0e1a2e', '#040912'], rb: ['#eef8ff', '#d6ecff'] },
        { key: 'Cherry Cola', a: '#ff4d6a', b: '#ffcf5a', c: '#3fd6b4', d: '#a98cff', body: ['#ffa0ae', '#ff5d73'], trim: '#fff0f2', rd: ['#2a0c12', '#100306'], rb: ['#fff2f3', '#ffdde2'] }
      ];
      const skin = K.dailyPick(SKINS, 11);
      el.style.setProperty('--cm-a', skin.a); el.style.setProperty('--cm-b', skin.b); el.style.setProperty('--cm-c', skin.c);
      const FIGS = ['loopie', 'glitch', 'patch', 'drop', 'rush', 'still', 'sync'];
      const FIGN = { loopie: 'Loopie', glitch: 'Glitch', patch: 'Patch', drop: 'Drop', rush: 'Rush', still: 'Still', sync: 'Sync' };
      const fig = FIGS[visits % FIGS.length];
      const figImg = new Image(); figImg.src = K.face(fig, 'celebrate');

      /* ---------------- lines (every one in three vibes) ---------------- */
      const LINES = {
        open: visits ? { Jolly: 'Back again! The machine restocked my thoughts overnight.', Cheeky: 'Fresh capsules. Same grip. Let’s see about that.', Unfiltered: 'New day. Same grip. Let’s go.' }
          : { Jolly: 'A whole machine full of my thoughts. I want to hold ALL of them.', Cheeky: 'My thoughts, in capsules. Naturally I must grab every one.', Unfiltered: 'All my thoughts. I grip every one.' },
        rush: { Jolly: 'Grab them! Grab them ALL!', Cheeky: 'Speed run! Grab everything!', Unfiltered: 'Grab. Now.' },
        how: { Jolly: 'Steer with the joystick. Let the swing settle, then drop.', Cheeky: 'Joystick, wait for the wobble to stop, then DROP.', Unfiltered: 'Steer. Settle. Drop.' },
        whiff: { Jolly: 'The swing carried it off line. Let it settle, then drop.', Cheeky: 'Swingy claw. Wait for stillness, then strike.', Unfiltered: 'Let the swing settle first.' },
        assist: { Jolly: 'I steadied the claw for you. Try again.', Cheeky: 'Claw on calm mode now. Go.', Unfiltered: 'Steadier now. Again.' },
        got: { Jolly: 'Got one! Now: what does holding it cost you?', Cheeky: 'Caught it. Time for the price tag.', Unfiltered: 'Got it. Weigh it.' },
        weigh: { Jolly: 'Tap {n} things: what gripping this costs you, or what it gives you.', Cheeky: 'Price tag: pick {n}. Costs on the left, gains on the right.', Unfiltered: 'Pick {n}. Costs or gains.' },
        vCost: { Jolly: 'Huh. It costs me more than it gives.', Cheeky: 'This thought is charging me rent.', Unfiltered: 'Costs more than it gives.' },
        vEven: { Jolly: 'It gives a little, and costs a little.', Cheeky: 'Break-even. Still heavy to carry.', Unfiltered: 'Even. Still heavy.' },
        vGive: { Jolly: 'Oh, it does give me something useful.', Cheeky: 'Okay, it’s not ALL bad.', Unfiltered: 'It gives something.' },
        carry: { Jolly: 'Never let go! Carry it to the prize chute!', Cheeky: 'Hold on tight! Chute! GO!', Unfiltered: 'Carry it to the chute.' },
        slip: { Jolly: 'NO! It slipped! This machine is RIGGED!', Cheeky: 'RIGGED. Every claw machine is rigged.', Unfiltered: 'It slipped.' },
        twist: { Jolly: 'Sometimes the best grip is letting go.', Cheeky: 'Sometimes the best grip is letting go. The claw knew.', Unfiltered: 'Sometimes the best grip is letting go.' },
        after: { Jolly: 'It fell… and it’s still in there. I just stopped carrying it.', Cheeky: 'Wait. It’s still in the machine. I’m just not lugging it around.', Unfiltered: 'Still there. Not carrying it.' },
        open1: { Jolly: 'This one costs more than it gives. Open your hand.', Cheeky: 'Your call. But your claw looks tired. Pry it open.', Unfiltered: 'Open the claw. Let it fall.' },
        openGive: { Jolly: 'It gives a little. No death grip needed: open up, or keep it lightly.', Cheeky: 'Useful-ish. Death grip optional.', Unfiltered: 'Hold it lightly or let it go.' },
        letGo: { Jolly: 'Lighter. Weirdly lighter.', Cheeky: 'Oh. I don’t have to carry that. Huh.', Unfiltered: 'Lighter.' },
        kept: { Jolly: 'Kept it, without the death grip.', Cheeky: 'Holding it like a teacup, not a grudge.', Unfiltered: 'Kept. Lightly.' },
        rushCalm: { Jolly: 'Okay… maybe I don’t need ALL of them.', Cheeky: 'Fine. Grabbing everything was a bad plan.', Unfiltered: 'Fewer. Fine.' },
        prize: serious ? { Jolly: 'Under the pile: a plan worth holding. Steady grip now.', Cheeky: 'Found the useful one: a plan. Grab it.', Unfiltered: 'A plan. Grab it.' }
          : { Jolly: 'Look! Under the pile, a thought worth keeping. Steady grip.', Cheeky: 'Plot twist: a GOOD one was hiding under the pile.', Unfiltered: 'One worth keeping. Grab it.' },
        prizeGot: { Jolly: 'Steady hands! To the prize chute!', Cheeky: 'Smooth. Chute time.', Unfiltered: 'Chute.' },
        fin: care ? { Jolly: 'I kept the one that helps. And I’ll get proper advice on the facts.', Cheeky: 'Kept the useful one. Proper advice next.', Unfiltered: 'Kept the useful one. Get advice.' }
          : { Jolly: 'I let go of the heavy ones and kept the one that helps!', Cheeky: 'Lighter pockets, better prize.', Unfiltered: 'Let go. Kept one. Done.' }
      };

      /* ---------------- state ---------------- */
      const st = { phase: 'intro', round: 0, letGo: 0, slipped: 0, kept: 0, clean: 0, grabs: 0, roundDrops: 0, totalDrops: 0, acc: [], picks: [], finished: false, assist: false,
        over: null, guideKey: '', fullN: 2, finT: 0, slow: 0, fn: 0, q: 1, chuteT: 0, door: 0, figT: 0, stars: [] };
      const M = { w: 0, h: 0, phone: true, side: false, sc: 1 };
      const C = { x: 0, tx: 0, v: 0, th: 0, om: 0, L: 40, L0: 40, open: 1, openT: 1, mode: 'idle', holding: null, damp: DAMP, modeT: 0, carryFrom: 0, carryTo: 0, slipAt: -1 };
      const caps = [];
      const P = K.particles({ max: 360 });

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1.25 : 2 });
      const hud = h('div', { class: 'cm-hud' });
      const pillGo = h('div', { class: 'cm-pill', role: 'status' }, h('i', { html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V11M10 10V5a1.5 1.5 0 0 1 3 0v5M13 10.5V6a1.5 1.5 0 0 1 3 0v6M16 11.5V9a1.5 1.5 0 0 1 3 0v5.5c0 3.6-2.6 6.5-6.4 6.5-2.4 0-4-1-5.3-3L4.4 14a1.5 1.5 0 0 1 2.4-1.8L8 13.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }), h('span', { text: 'Let go ' }), h('b', { text: '0/' + NT }));
      const pillGrab = h('div', { class: 'cm-pill', role: 'status' }, h('i', { html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v6M7 9l5 3 5-3M7 9l-2 6 3 4M17 9l2 6-3 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }), h('span', { text: 'Steady grabs ' }), h('b', { text: '0' }));
      hud.append(pillGo, pillGrab);
      const marquee = h('div', { class: 'cm-marquee', text: 'THOUGHT GRABBER' });
      const lcd = h('div', { class: 'cm-lcd', role: 'status', 'aria-live': 'polite' }, h('small', { text: 'Thought grabber' }), h('span', { text: 'Steer, then drop.' }));
      const rail = h('div', { class: 'cm-rail', role: 'slider', tabindex: '0', 'aria-label': 'Joystick: steer the claw left and right', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '50' }, h('i', { class: 'cm-knob' }));
      const knob = rail.firstChild;
      const dropBtn = h('button', { type: 'button', class: 'cm-drop off', 'aria-label': 'Drop the claw' }, h('b', { text: 'DROP' }));
      const handle = h('div', { class: 'cm-handle', role: 'button', tabindex: '0', 'aria-label': 'Drag sideways to open the claw and let the thought go', hidden: true }, h('b', { text: 'Pull apart' }));
      el.append(marquee, lcd, rail, dropBtn, handle, hud);
      const loopie = K.character('loopie', { side: 'right', mood: 'worried', x: 10, y: 600, size: 64 });
      const glitch = K.character('glitch', { side: 'left', mood: 'scan', x: 300, y: 600, size: 64 });
      const rush = K.character('rush', { side: 'left', mood: 'speed', x: 300, y: 600, size: 64 });
      rush.show(false);
      const music = K.music('playful'); music.level(0.3);
      // phones share one speech zone: one bubble at a time; Rush and Glitch take turns in the right-hand corner
      function say(c, line, o) {
        if (!M.side) { [loopie, glitch, rush].forEach(x => { if (x !== c) x.hush(); }); if (c === rush) { glitch.show(false); rush.show(true); } else if (c === glitch) { rush.show(false); glitch.show(true); } }
        else if (c === rush) rush.show(true);
        return c.say(line, o);
      }

      /* ---------------- layout ---------------- */
      let statOK = false, firstLayout = true;
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        const old = M.gx0 != null ? { gx0: M.gx0, gw: M.gx1 - M.gx0, pitY: M.pitY } : null;
        M.w = W; M.h = H; M.phone = W < 700; M.side = W >= 980 && H >= 640;
        let cw, cx, cy0, cy1;
        if (M.side) { cw = Math.round(clamp(H * 0.6, 440, 520)); cy0 = 104; cy1 = H - 22; }
        else { cw = Math.min(W - 20, 470); cy0 = 102; cy1 = H - clamp(H * 0.18, 140, 170); }
        cx = Math.round((W - cw) / 2);
        const ch = cy1 - cy0, sc = clamp(cw / 370, 0.85, 1.4);
        Object.assign(M, { cx, cy0, cw, ch, cy1, sc });
        M.marq = { x: cx + 16, y: cy0 + 4, w: cw - 32, h: Math.round(40 * Math.min(1.2, sc)) };
        M.gx0 = cx + 12; M.gx1 = cx + cw - 12; M.gy0 = M.marq.y + M.marq.h + 6;
        M.deckH = Math.round(clamp(ch * 0.35, 208, 256)); M.frontH = Math.round(clamp(ch * 0.09, 48, 62));
        M.gy1 = cy1 - M.deckH - M.frontH; M.deckY = cy1 - M.deckH;
        M.Rc = Math.round(clamp(27 * sc, 25, 36));
        M.pitY = M.gy1 - Math.round(24 * sc);
        M.chuteR = M.gx0 + Math.round(M.Rc * 2.7); M.chuteX = (M.gx0 + M.chuteR) / 2; M.chuteTop = M.pitY - Math.round(12 * sc);
        M.gantryY = M.gy0 + Math.round(12 * sc); M.pivotY = M.gantryY + 10;
        M.gcx = (M.chuteR + M.gx1) / 2;
        M.pl = Math.round(M.Rc * 1.25 + 4); M.tipOff = Math.round(6 + M.pl * 0.92);
        C.L0 = Math.round(34 * sc);
        if (firstLayout) { C.x = C.tx = M.gcx; C.L = C.L0; buildCaps(); firstLayout = false; }
        else if (old) { const kx = (M.gx1 - M.gx0) / old.gw; caps.forEach(c => { c.x = M.gx0 + (c.x - old.gx0) * kx; c.y = M.pitY + (c.y - old.pitY); c.r = M.Rc; }); C.x = M.gx0 + (C.x - old.gx0) * kx; C.tx = M.gx0 + (C.tx - old.gx0) * kx; }
        placeDom();
        statOK = false;
      }
      function placeDom() {
        const W = M.w, H = M.h, sc = M.sc;
        Object.assign(marquee.style, { left: M.marq.x + 'px', top: M.marq.y + 'px', width: M.marq.w + 'px', height: M.marq.h + 'px', fontSize: Math.round(24 * Math.min(1.25, sc)) + 'px' });
        const lcdH = Math.round(72 * Math.min(1.12, sc));
        Object.assign(lcd.style, { left: (M.cx + 16) + 'px', top: (M.deckY + 8) + 'px', width: (M.cw - 32) + 'px', height: lcdH + 'px' });
        M.ctrlY = M.deckY + 8 + lcdH + 10; M.ctrlH = M.cy1 - 10 - M.ctrlY;
        const dbx = M.cx + M.cw - 22 - 39, dby = M.ctrlY + M.ctrlH / 2;
        Object.assign(dropBtn.style, { left: dbx + 'px', top: dby + 'px' });
        const rx = M.cx + 16, rw = dbx - 39 - 18 - rx;
        Object.assign(rail.style, { left: rx + 'px', top: (dby - 29) + 'px', width: rw + 'px' });
        M.rail = { x: rx, w: rw };
        knobTo();
        if (st.chips) placeChips();
        if (st.acts) placeActs();
        if (!handle.hidden) placeHandle();
        if (st.sign) placeSign();
        if (M.side) {
          const sz = 112, ly = Math.round(H * 0.5), lx = Math.max(14, M.cx - 380), gx = Math.min(W - sz - 14, M.cx + M.cw + 268), bw = M.cx - 16 - (lx + sz + 10), bw2 = (gx - 10) - (M.cx + M.cw + 16);
          [[loopie, lx, ly, 'right', bw], [glitch, gx, ly - 70, 'left', bw2], [rush, gx, ly + 110, 'left', bw2]].forEach(([c, x, y, side, b]) => { c.el.style.setProperty('--sz', sz + 'px'); c.place(x, y); c.side(side); c.el.classList.remove('cm-low'); c.el.style.setProperty('--cm-bub', Math.max(150, Math.min(250, b)) + 'px'); });
          if (st.phase !== 'intro') rush.show(true);
          hud.style.left = M.cx + 'px'; hud.style.right = (W - M.cx - M.cw) + 'px';
        } else {
          const sz = M.phone ? 64 : 80, y = H - 14 - sz, bw = W - 2 * (10 + sz) - 28;
          [[loopie, 10, 'right'], [glitch, W - 10 - sz, 'left'], [rush, W - 10 - sz, 'left']].forEach(([c, x, side]) => { c.el.style.setProperty('--sz', sz + 'px'); c.place(x, y); c.side(side); c.el.classList.add('cm-low'); c.el.style.setProperty('--cm-bub', Math.max(150, Math.min(300, bw)) + 'px'); });
          hud.style.left = '10px'; hud.style.right = '10px';
        }
      }
      const railToX = (kx) => lerp(M.chuteR + M.Rc * 0.6, M.gx1 - M.Rc * 0.9, clamp((kx - 27) / Math.max(1, M.rail.w - 54), 0, 1));
      const xToRail = (x) => 27 + clamp((x - (M.chuteR + M.Rc * 0.6)) / ((M.gx1 - M.Rc * 0.9) - (M.chuteR + M.Rc * 0.6)), 0, 1) * (M.rail.w - 54);
      function knobTo() { if (!M.rail) return; knob.style.left = xToRail(C.tx) + 'px'; rail.setAttribute('aria-valuenow', String(Math.round(clamp((xToRail(C.tx) - 27) / Math.max(1, M.rail.w - 54), 0, 1) * 100))); }

      /* ---------------- capsules ---------------- */
      const COLS = [skin.a, skin.b, skin.c, skin.d];
      function buildCaps() {
        caps.length = 0;
        const n = thoughts.length, span = M.gx1 - M.Rc - (M.chuteR + M.Rc), r = M.Rc;
        thoughts.forEach((t, i) => {
          const fx = n === 1 ? 0.5 : [0.18, 0.86, 0.52, 0.34][i % 4];
          caps.push({ id: i, kind: 'thought', text: t.text, user: t.user, x: M.chuteR + r + span * fx, y: M.pitY - r * 0.82, vx: 0, vy: 0, r, rot: (i - 1) * 0.5, vr: 0, col: COLS[i % COLS.length], state: 'pile', a: 1 });
        });
        caps.push({ id: 9, kind: 'prize', text: prizeText, x: M.chuteR + r + span * 0.62, y: M.pitY + r * 1.2, vx: 0, vy: 0, r: r * 1.06, rot: 0, vr: 0, col: '#ffd23f', state: 'hidden', a: 1 });
      }
      const target = () => caps.filter(c => (c.state === 'pile' && c.kind === 'thought') || (c.state === 'pile' && c.kind === 'prize' && st.phase !== 'intro' && st.prizeOut));

      /* ---------------- claw physics (a pendulum on a sprung carriage; deterministic, never random) ---------------- */
      function hub() { return { x: C.x + Math.sin(C.th) * C.L, y: M.pivotY + Math.cos(C.th) * C.L }; }
      function tip() { const l = C.L + M.tipOff; return { x: C.x + Math.sin(C.th) * l, y: M.pivotY + Math.cos(C.th) * l }; }
      let motor = null;
      function clawStep(dt) {
        const n = Math.max(1, Math.ceil(dt / (1 / 120))), hs = dt / n, gg = 980 * M.sc;
        for (let i = 0; i < n; i++) {
          const a = 44 * (C.tx - C.x) - 11 * C.v;
          const v0 = C.v; C.v = clamp(C.v + a * hs, -520 * M.sc, 520 * M.sc); C.x += C.v * hs;
          const ax = (C.v - v0) / hs, Lm = Math.max(26, C.L + M.tipOff * 0.6);
          C.om += (-(gg / Lm) * Math.sin(C.th) - (ax / Lm) * Math.cos(C.th) * 0.7 - C.damp * C.om) * hs;
          C.th = clamp(C.th + C.om * hs, -0.6, 0.6);
        }
        C.modeT += dt;
        if (C.mode === 'drop') {
          C.L += 300 * M.sc * dt;
          const tp = tip(), stop = dropStop(tp.x);
          if (tp.y >= stop) { C.L -= tp.y - stop; C.mode = 'close'; C.modeT = 0; C.openT = 0.1; sfxClamp(); }
        } else if (C.mode === 'close' && C.modeT > 0.34) grabCheck();
        else if (C.mode === 'lift') { C.L = Math.max(C.L0, C.L - 240 * M.sc * dt); if (C.L <= C.L0 + 0.5) { C.L = C.L0; C.mode = 'idle'; onTop(); } }
        else if (C.mode === 'carry') {
          const k = Math.abs(C.x - C.carryFrom) / Math.max(1, Math.abs(C.carryTo - C.carryFrom));
          if (C.slipAt > 0 && k >= C.slipAt) { C.slipAt = -1; slip(); }
          if (Math.abs(C.x - C.carryTo) < 2.5 && Math.abs(C.v) < 12) { C.mode = 'idle'; onCarried(); }
        }
        C.open += (C.openT - C.open) * Math.min(1, dt * 10);
        if (C.holding) { const hp = hub(), d = M.tipOff - C.holding.r * 0.12; C.holding.x = hp.x + Math.sin(C.th) * d; C.holding.y = hp.y + Math.cos(C.th) * d; C.holding.rot = C.th * 0.8; }
        if (motor) { const sp = Math.abs(C.v) / (520 * M.sc) + (C.mode === 'drop' || C.mode === 'lift' ? 0.45 : 0); motor.level(Math.min(0.05, sp * 0.06), 0.06); motor.freq(220 + sp * 380, 0.08); }
      }
      function dropStop(tx) {
        let y = M.pitY - 4;
        caps.forEach(c => { if ((c.state === 'pile' || c.state === 'light') && Math.abs(c.x - tx) < c.r * 0.95) y = Math.min(y, c.y - c.r * 0.15); });
        return y;
      }
      function grabCheck() {
        const tp = tip(); let best = null, bd = 1e9;
        target().forEach(c => { const dx = Math.abs(c.x - tp.x), lim = c.r * (st.assist || c.kind === 'prize' ? 1.25 : 1); if (dx < lim && Math.abs(c.y - tp.y) < c.r * 1.5 && dx < bd) { bd = dx; best = c; } });
        C.mode = 'lift'; C.modeT = 0;
        if (best) {
          const lim = best.r, acc = clamp(1 - bd / lim, 0, 1);
          if (best.kind === 'thought' && !best.opened) { const t = thoughts[Math.min(st.round, thoughts.length - 1)]; best.text = t.text; best.user = t.user; best.opened = true; }
          best.state = 'held'; C.holding = best; C.openT = 0.5;
          st.grabs++; st.acc.push(acc); if (st.roundDrops === 1) { st.clean++; pillGrab.lastChild.textContent = String(st.clean); bump(pillGrab); }
          ctx.track('claw_grab', { round: st.round, acc: Math.round(acc * 100), drops: st.roundDrops });
          K.sfx.good(undefined, 5); if (A.ctx) { A.wood(A.now() + 0.02, 0.14, 1.5); A.noise({ when: A.now() + 0.03, filter: 'highpass', freq: 3500, dur: 0.05, vol: 0.05 }); }
          if (!K.reduced()) P.emit('star', best.x, best.y, 10, { colors: ['#ffffff', best.col] });
          lcdSay(best.kind === 'prize' ? 'Got the keeper' : 'You’re holding', best.text, best.user);
          lcd.classList.add('hot');
        } else {
          C.openT = 0.02; st.roundMiss = (st.roundMiss || 0) + 1; K.sfx.soft();
          if (!K.reduced()) P.emit('dust', tp.x, tp.y + 6, 8, { colors: ['rgba(255,255,255,0.7)'] });
          ctx.track('claw_miss', { round: st.round });
        }
      }

      /* ---------------- free capsules (falls, bounces, the pile) ---------------- */
      function capsStep(dt) {
        const n = Math.max(1, Math.ceil(dt / (1 / 120))), hs = dt / n, gg = 1500 * M.sc;
        const live = caps.filter(c => c.state === 'pile' || c.state === 'light' || c.state === 'fall' || c.state === 'chute');
        for (let s = 0; s < n; s++) {
          live.forEach(c => { c.vy += gg * hs; c.x += c.vx * hs; c.y += c.vy * hs; c.rot += c.vr * hs; c.vx *= 0.999; });
          for (let it = 0; it < 2; it++) {
            live.forEach(c => {
              if (c.state === 'chute') { const xl = M.gx0 + c.r, xr = M.chuteR - c.r; if (c.x < xl) { c.x = xl; c.vx = Math.abs(c.vx) * 0.3; } if (c.x > xr) { c.x = xr; c.vx = -Math.abs(c.vx) * 0.3; } return; }
              const fy = M.pitY - c.r * 0.82;
              if (c.y > fy) { c.y = fy; if (c.vy > 0) { if (c.vy > 160 * M.sc) landed(c); c.vy = -c.vy * 0.3; if (Math.abs(c.vy) < 30) c.vy = 0; } c.vx *= 0.9; c.vr = c.vx / c.r; if (c.state === 'fall' && Math.abs(c.vy) < 1 && Math.abs(c.vx) < 8) settled(c); }
              const xl = M.chuteR + c.r * 0.9, xr = M.gx1 - c.r;
              if (c.x < xl) { c.x = xl; c.vx = Math.abs(c.vx) * 0.4; } if (c.x > xr) { c.x = xr; c.vx = -Math.abs(c.vx) * 0.4; }
            });
            for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
              const a = live[i], b = live[j]; if (a.state === 'chute' || b.state === 'chute') continue;
              const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), R = (a.r + b.r) * 0.86;
              if (d > 0.01 && d < R) { const push = (R - d) / 2, nx = dx / d, ny = dy / d; a.x -= nx * push; a.y -= ny * push * 0.6; b.x += nx * push; b.y += ny * push * 0.6; const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (rv < 0) { const j2 = -rv * 0.6; a.vx -= j2 * nx * 0.5; a.vy -= j2 * ny * 0.5; b.vx += j2 * nx * 0.5; b.vy += j2 * ny * 0.5; } }
            }
          }
        }
        caps.forEach(c => { if (c.state === 'chute' && c.y > M.gy1 + c.r) { c.state = 'gone'; prizeDoor(); } if (c.state === 'rise') { c.y += (c.ty - c.y) * Math.min(1, dt * 4); if (Math.abs(c.ty - c.y) < 2.5) { c.y = c.ty; c.state = 'pile'; c.vx = 0; c.vy = 0; } } });
      }
      function landed(c) { if (A.ctx) { const t0 = A.now(); A.wood(t0, 0.09, 1.7 + Math.random() * 0.3); A.noise({ when: t0, filter: 'bandpass', freq: 2400, q: 2, dur: 0.06, vol: 0.05 }); } if (!K.reduced()) P.emit('dust', c.x, M.pitY - 2, 6, { colors: [hexA(c.col, 0.6)] }); }
      function settled(c) { if (c.kind === 'thought') { c.state = 'light'; } }

      /* ---------------- sprites + static layer ---------------- */
      const spr = {};
      const stat = document.createElement('canvas');
      function capSprite(col, prize) {
        const d = cv.dpr || 1, key = 'cap' + col + (prize ? 'p' : '') + M.Rc + ':' + d; if (spr[key]) return spr[key];
        const R = M.Rc * (prize ? 1.06 : 1) * d, pad = prize ? R * 0.7 : 4, s = Math.ceil(R * 2 + pad * 2), c = document.createElement('canvas'); c.width = c.height = s;
        const x = c.getContext('2d'), m = s / 2;
        if (prize) { const gl = x.createRadialGradient(m, m, R * 0.6, m, m, R + pad); gl.addColorStop(0, 'rgba(255,220,90,0.75)'); gl.addColorStop(1, 'rgba(255,220,90,0)'); x.fillStyle = gl; x.fillRect(0, 0, s, s); }
        // clear bottom half with a rolled note inside
        x.save(); x.beginPath(); x.arc(m, m, R, 0, TAU); x.clip();
        let gr = x.createLinearGradient(0, m - R, 0, m + R); gr.addColorStop(0, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(210,235,255,0.55)'); x.fillStyle = gr; x.fillRect(0, 0, s, s);
        x.fillStyle = '#fffaf0'; x.save(); x.translate(m, m + R * 0.35); x.rotate(-0.35); rr(x, -R * 0.55, -R * 0.16, R * 1.1, R * 0.32, R * 0.14); x.fill(); x.strokeStyle = 'rgba(160,120,90,0.5)'; x.lineWidth = Math.max(1, R * 0.04); x.beginPath(); x.moveTo(-R * 0.35, 0); x.lineTo(R * 0.3, 0); x.stroke(); x.restore();
        // coloured top dome
        gr = x.createRadialGradient(m - R * 0.3, m - R * 0.7, R * 0.1, m, m - R * 0.2, R * 1.2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, col); gr.addColorStop(1, hexA(col, 1));
        x.fillStyle = gr; x.fillRect(0, 0, s, m + R * 0.04);
        x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(0, m - R * 0.02, s, R * 0.12);
        x.restore();
        x.strokeStyle = 'rgba(70,30,60,0.35)'; x.lineWidth = Math.max(1.2, R * 0.05); x.beginPath(); x.arc(m, m, R - x.lineWidth / 2, 0, TAU); x.stroke();
        x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.ellipse(m - R * 0.38, m - R * 0.5, R * 0.22, R * 0.13, -0.6, 0, TAU); x.fill();
        if (prize) { x.fillStyle = '#ffffff'; x.font = '700 ' + Math.round(R * 0.6) + 'px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('★', m, m - R * 0.42); }
        c.css = s / d; spr[key] = c; return c;
      }
      function renderStatic() {
        const W = M.w, H = M.h, d = cv.dpr || 1, br = bright(), sk = skin;
        stat.width = Math.max(2, Math.round(W * d)); stat.height = Math.max(2, Math.round(H * d));
        const g = stat.getContext('2d', { alpha: false }); g.setTransform(d, 0, 0, d, 0, 0);
        // room: a cosy arcade corner (night) or a sunny one (day)
        let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, br ? sk.rb[0] : sk.rd[0]); gr.addColorStop(1, br ? sk.rb[1] : sk.rd[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        const bokeh = K.rng(11);
        for (let i = 0; i < 26; i++) { const x = bokeh() * W, y = bokeh() * H * 0.7, r = 10 + bokeh() * 34, c = COLS[i % 4], rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, hexA(c, br ? 0.16 : 0.2)); rg.addColorStop(1, hexA(c, 0)); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); }
        // floor: checker tiles in perspective
        const hz = H * 0.8; g.fillStyle = br ? 'rgba(120,80,110,0.08)' : 'rgba(255,255,255,0.04)'; g.fillRect(0, hz, W, H - hz);
        g.strokeStyle = br ? 'rgba(120,80,110,0.12)' : 'rgba(255,255,255,0.06)'; g.lineWidth = 1; g.beginPath();
        for (let i = -16; i <= 16; i++) { g.moveTo(W / 2 + i * 30, hz); g.lineTo(W / 2 + i * 150, H); }
        for (let j = 0; j < 6; j++) { const y = hz + (H - hz) * Math.pow(j / 6, 1.6); g.moveTo(0, y); g.lineTo(W, y); }
        g.stroke();
        // the rest of the arcade corner on wide screens: two more prize machines glow softly
        if (M.side) {
          [[M.cx - 170, 0.82, 1], [M.cx + M.cw + 170, 0.82, 2], [M.cx - 360, 0.66, 3], [M.cx + M.cw + 360, 0.66, 0]].forEach(([mx, k, ci]) => {
            const w = 190 * k, hh = 430 * k, x = mx - w / 2, y = hz - hh + 10, col = COLS[ci];
            if (x + w < 0 || x > W) return;
            g.save(); g.globalAlpha = br ? 0.5 : 0.55;
            rr(g, x, y, w, hh, 18 * k); g.fillStyle = br ? hexA(col, 0.45) : hexA(col, 0.35); g.fill();
            rr(g, x + 10 * k, y + 14 * k, w - 20 * k, 26 * k, 8 * k); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill();
            rr(g, x + 12 * k, y + 50 * k, w - 24 * k, hh * 0.46, 10 * k); g.fillStyle = br ? 'rgba(255,255,255,0.6)' : 'rgba(30,24,50,0.85)'; g.fill();
            for (let i = 0; i < 6; i++) { const bx = x + 26 * k + (i % 3) * (w - 52 * k) / 2, by = y + 50 * k + hh * 0.46 - 16 * k - Math.floor(i / 3) * 22 * k; g.fillStyle = hexA(COLS[(i + ci) % 4], 0.9); g.beginPath(); g.arc(bx, by, 11 * k, 0, TAU); g.fill(); }
            rr(g, x + 14 * k, y + hh * 0.62, w - 28 * k, hh * 0.12, 8 * k); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fill();
            g.restore();
          });
        }
        // cabinet body
        const { cx, cy0, cw, ch } = M;
        g.save(); g.shadowColor = br ? 'rgba(120,60,100,0.35)' : 'rgba(0,0,0,0.6)'; g.shadowBlur = 36; g.shadowOffsetY = 18;
        rr(g, cx, cy0, cw, ch, 26); gr = g.createLinearGradient(cx, 0, cx + cw, 0); gr.addColorStop(0, sk.body[1]); gr.addColorStop(0.18, sk.body[0]); gr.addColorStop(0.82, sk.body[0]); gr.addColorStop(1, sk.body[1]); g.fillStyle = gr; g.fill(); g.restore();
        g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 3; rr(g, cx + 3, cy0 + 3, cw - 6, ch - 6, 23); g.stroke();
        // candy stripes on the lower cabinet
        g.save(); rr(g, cx, M.gy1, cw, M.cy1 - M.gy1, 0); g.clip(); g.globalAlpha = 0.18; g.fillStyle = '#ffffff';
        for (let x = cx - ch; x < cx + cw; x += 28) { g.beginPath(); g.moveTo(x, M.cy1); g.lineTo(x + 14, M.cy1); g.lineTo(x + 14 + (M.cy1 - M.gy1), M.gy1); g.lineTo(x + (M.cy1 - M.gy1), M.gy1); g.closePath(); g.fill(); }
        g.restore();
        // marquee panel
        rr(g, M.marq.x, M.marq.y, M.marq.w, M.marq.h, 14); gr = g.createLinearGradient(0, M.marq.y, 0, M.marq.y + M.marq.h); gr.addColorStop(0, hexA(sk.a, 1)); gr.addColorStop(1, hexA(sk.d, 1)); g.fillStyle = gr; g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2; g.stroke();
        // glass box interior
        rr(g, M.gx0, M.gy0, M.gx1 - M.gx0, M.gy1 - M.gy0, 14); gr = g.createLinearGradient(0, M.gy0, 0, M.gy1);
        gr.addColorStop(0, br ? '#f4fbff' : '#2b2440'); gr.addColorStop(0.6, br ? '#e3f3ff' : '#1c1830'); gr.addColorStop(1, br ? '#d2e8fb' : '#151225'); g.fillStyle = gr; g.fill();
        // interior light from the top
        gr = g.createRadialGradient(M.gcx, M.gy0, 10, M.gcx, M.gy0, (M.gy1 - M.gy0) * 1.1); gr.addColorStop(0, br ? 'rgba(255,255,255,0.7)' : 'rgba(255,240,210,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(M.gx0, M.gy0, M.gx1 - M.gx0, M.gy1 - M.gy0);
        // back wall pattern (soft dots)
        g.fillStyle = br ? 'rgba(120,150,200,0.12)' : 'rgba(255,255,255,0.05)';
        for (let y = M.gy0 + 16; y < M.pitY - 20; y += 22) for (let x = M.gx0 + 14 + ((y / 22) % 2) * 11; x < M.gx1 - 8; x += 22) { g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill(); }
        // gantry rail
        g.fillStyle = br ? '#b9c3d4' : '#6c6a86'; rr(g, M.gx0 + 6, M.gantryY - 4, M.gx1 - M.gx0 - 12, 8, 4); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(M.gx0 + 10, M.gantryY - 3, M.gx1 - M.gx0 - 20, 2);
        // ball pit (soft filler under the capsules)
        const pr = K.rng(5), pit = [];
        for (let row = 0; row < 3; row++) for (let x = M.chuteR + 6; x < M.gx1 - 4; x += 15 * M.sc) pit.push([x + pr() * 8, M.pitY - 4 + row * 9 * M.sc + pr() * 4, (7 + pr() * 2.5) * M.sc, COLS[Math.floor(pr() * 4)]]);
        pit.sort((a, b) => a[1] - b[1]).forEach(([x, y, r, c]) => { const rg = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.35, hexA(c, br ? 0.85 : 0.75)); rg.addColorStop(1, hexA(c, 0.95)); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
        // prize chute: a hole with an acrylic wall
        g.fillStyle = br ? '#2e2340' : '#07050c'; rr(g, M.gx0 + 4, M.chuteTop, M.chuteR - M.gx0 - 6, M.gy1 - M.chuteTop + 2, 6); g.fill();
        gr = g.createLinearGradient(0, M.chuteTop, 0, M.gy1); gr.addColorStop(0, 'rgba(255,255,255,0.08)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)'); g.fillStyle = gr; g.fill();
        g.fillStyle = 'rgba(200,230,255,0.35)'; g.fillRect(M.chuteR - 4, M.chuteTop - 26 * M.sc, 5, M.gy1 - M.chuteTop + 26 * M.sc);
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5; g.strokeRect(M.chuteR - 4, M.chuteTop - 26 * M.sc, 5, M.gy1 - M.chuteTop + 26 * M.sc);
        g.fillStyle = sk.c; rr(g, M.gx0 + 6, M.chuteTop - 8, M.chuteR - M.gx0 - 10, 8, 4); g.fill();
        // glass frame
        g.strokeStyle = sk.trim; g.lineWidth = 6; rr(g, M.gx0 - 1, M.gy0 - 1, M.gx1 - M.gx0 + 2, M.gy1 - M.gy0 + 2, 15); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1.5; rr(g, M.gx0 + 2, M.gy0 + 2, M.gx1 - M.gx0 - 4, M.gy1 - M.gy0 - 4, 12); g.stroke();
        // front panel: the prize door and a little speaker grille
        const fy = M.gy1 + 8, fh = M.frontH - 16;
        M.door = { x: M.cx + 22, y: fy, w: Math.round(M.Rc * 2.6), h: fh };
        rr(g, M.door.x, M.door.y, M.door.w, M.door.h, 10); g.fillStyle = '#1b1324'; g.fill(); g.strokeStyle = sk.trim; g.lineWidth = 3; g.stroke();
        g.fillStyle = '#ffffff'; g.font = '400 12px ' + 'Lilita One, Arial Rounded MT Bold, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('PRIZE', M.door.x + M.door.w / 2, M.door.y + M.door.h / 2);
        const gx = M.cx + M.cw - 22 - 90, gy = fy + 6; g.fillStyle = 'rgba(60,30,60,0.35)';
        for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 9; xx++) { g.beginPath(); g.arc(gx + xx * 10, gy + yy * 10 * (fh / 40), 2.2, 0, TAU); g.fill(); }
        // control deck surface
        rr(g, M.cx + 8, M.deckY, M.cw - 16, M.cy1 - M.deckY - 8, 18); gr = g.createLinearGradient(0, M.deckY, 0, M.cy1); gr.addColorStop(0, sk.trim); gr.addColorStop(1, hexA(sk.body[0], 1)); g.fillStyle = gr; g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2; g.stroke();
        statOK = true; st.fullN = 2;
      }
      function glareSprite() {
        const key = 'glare' + M.w + 'x' + M.h; if (spr[key]) return spr[key];
        const w = Math.max(2, Math.round(M.gx1 - M.gx0)), hh = Math.max(2, Math.round(M.gy1 - M.gy0)), c = document.createElement('canvas'); c.width = w; c.height = hh;
        const x = c.getContext('2d'); x.fillStyle = 'rgba(255,255,255,0.13)'; x.beginPath(); x.moveTo(w * 0.08, 0); x.lineTo(w * 0.3, 0); x.lineTo(w * 0.05, hh); x.lineTo(0, hh); x.lineTo(0, hh * 0.5); x.closePath(); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.08)'; x.beginPath(); x.moveTo(w * 0.36, 0); x.lineTo(w * 0.42, 0); x.lineTo(w * 0.16, hh); x.lineTo(w * 0.1, hh); x.closePath(); x.fill();
        spr[key] = c; return c;
      }

      /* ---------------- frame ---------------- */
      let tPrev = 0;
      K.loop((dt0, t) => {
        const g = cv.g; if (!g || !M.w) { tPrev = t; return; }
        if (SOFT && tPrev && t - tPrev < 0.03) return;
        const dt = tPrev ? Math.min(0.25, Math.max(0, t - tPrev)) : dt0;
        st.fn++; if (dt > 0.034) st.slow++;
        if (st.fn >= 90) { if (st.slow > 20 && st.q > 0.6) { st.q = st.q > 0.85 ? 0.75 : 0.6; cv.setQuality(st.q); statOK = false; Object.keys(spr).forEach(k => delete spr[k]); } st.fn = 0; st.slow = 0; }
        if (!statOK) renderStatic();
        clawStep(dt); capsStep(dt); scaleStep(dt); P.update(dt);
        steerWatch();
        draw(g, t, dt);
        tPrev = t;
      });
      function draw(g, t, dt) {
        const W = M.w, H = M.h, br = bright();
        const full = st.fullN > 0, x0 = Math.max(0, M.cx - 14), y0 = Math.max(0, M.cy0 - 14), w0 = Math.min(W, M.cx + M.cw + 14) - x0, h0 = Math.min(H, M.cy1 + 22) - y0;
        if (full) { st.fullN--; g.drawImage(stat, 0, 0, W, H); }
        else { const d = stat.width / W; g.drawImage(stat, x0 * d, y0 * d, w0 * d, h0 * d, x0, y0, w0, h0); g.save(); g.beginPath(); g.rect(x0, y0, w0, h0); g.clip(); }
        // marquee bulbs
        const nb = Math.max(8, Math.floor(M.marq.w / 22)), party = st.phase === 'finale' || st.phase === 'done';
        for (let i = 0; i < nb; i++) { const on = party ? (i + Math.floor(t * 8)) % 2 === 0 : (i + Math.floor(t * 4)) % 3 === 0, bx = M.marq.x + 11 + i * ((M.marq.w - 22) / (nb - 1)); [M.marq.y - 1, M.marq.y + M.marq.h + 1].forEach(by => { if (on) { g.globalAlpha = 0.9; g.drawImage(K.glowSprite(COLS[i % 4]), bx - 8, by - 8, 16, 16); g.globalAlpha = 1; g.fillStyle = '#ffffff'; } else g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(bx, by, 2.4, 0, TAU); g.fill(); }); }
        // capsules in the pile (behind the claw)
        const bob = (c) => c.state === 'light' ? Math.sin(t * 1.4 + c.id * 1.7) * 3 * M.sc : 0;
        g.fillStyle = 'rgba(26,15,32,0.2)';
        caps.forEach(c => { if (c.state === 'pile' || c.state === 'light') { g.beginPath(); g.ellipse(c.x + 3, M.pitY + c.r * 0.12, c.r * 0.92, c.r * 0.24, 0, 0, TAU); g.fill(); } });
        caps.forEach(c => { if (c.state === 'hidden' || c.state === 'gone' || c.state === 'held' || c.state === 'door') return; drawCap(g, c, bob(c), c.state === 'light' ? 0.5 : 1, t); });
        // claw: carriage, cable, back prong, held capsule, front prongs
        drawClaw(g, t);
        // the weighing scale
        if (SC.on > 0.01) drawScale(g, t);
        // prize at the door / the figurine stage
        if (st.door) drawDoor(g, t);
        // glass glare on top
        g.globalAlpha = br ? 0.7 : 1; g.drawImage(glareSprite(), M.gx0, M.gy0, M.gx1 - M.gx0, M.gy1 - M.gy0); g.globalAlpha = 1;
        // falling stars in the finale
        if (st.stars.length) drawStars(g, dt);
        P.draw(g);
        if (!full) g.restore();
      }
      function drawCap(g, c, dy, alpha, t) {
        const s = capSprite(c.col, c.kind === 'prize'), cs = s.css;
        g.save(); g.globalAlpha = alpha * (c.a == null ? 1 : c.a); g.translate(c.x, c.y + dy); g.rotate(c.rot); g.drawImage(s, -cs / 2, -cs / 2, cs, cs); g.restore();
        if (c.kind === 'prize' && c.state === 'pile' && !K.reduced()) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + 0.25 * Math.sin(t * 4); g.drawImage(K.glowSprite('#ffe27a'), c.x - c.r * 2, c.y - c.r * 2, c.r * 4, c.r * 4); g.restore(); }
      }
      function drawClaw(g, t) {
        const hp = hub(), th = C.th, sc = M.sc, metal = (y0, y1) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#f6f8fc'); gr.addColorStop(0.5, '#bcc3d3'); gr.addColorStop(1, '#7a8298'); return gr; };
        // the claw's shadow on the pit: where it will land (the cue real players aim with)
        const tp = tip(), lift = clamp((M.pitY - tp.y) / (M.pitY - M.gy0), 0, 1);
        g.save(); g.globalAlpha = 0.28 - lift * 0.14; g.fillStyle = '#1a0f20'; g.beginPath(); g.ellipse(tp.x, M.pitY - 3, (14 + lift * 10) * sc, (4 + lift * 2) * sc, 0, 0, TAU); g.fill(); g.restore();
        // carriage on the gantry
        rr(g, C.x - 20 * sc, M.gantryY - 7 * sc, 40 * sc, 16 * sc, 5 * sc); g.fillStyle = metal(M.gantryY - 7 * sc, M.gantryY + 9 * sc); g.fill(); g.strokeStyle = 'rgba(40,40,60,0.45)'; g.lineWidth = 1; g.stroke();
        g.fillStyle = COLS[0]; g.beginPath(); g.arc(C.x - 11 * sc, M.gantryY + 1, 2.4 * sc, 0, TAU); g.arc(C.x + 11 * sc, M.gantryY + 1, 2.4 * sc, 0, TAU); g.fill();
        // cable: dark core with a thin highlight
        g.lineCap = 'round';
        g.strokeStyle = '#464c60'; g.lineWidth = 2.6 * sc; g.beginPath(); g.moveTo(C.x, M.pivotY); g.lineTo(hp.x, hp.y - 12 * sc); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 0.9 * sc; g.beginPath(); g.moveTo(C.x + 0.7 * sc, M.pivotY); g.lineTo(hp.x + 0.7 * sc, hp.y - 12 * sc); g.stroke();
        const open = clamp(C.open, 0, 1), pl = M.pl, a = 0.16 + open * 0.64;
        const prong = (side, back) => {
          g.save(); g.scale(side, 1); g.rotate(-a);
          const ex = 7.5 * sc, ey = 6 * sc + pl * 0.55, tx = 2.5 * sc - open * 3 * sc, ty = 6 * sc + pl;
          const path = () => { g.beginPath(); g.moveTo(4 * sc, 5 * sc); g.lineTo(ex, ey); g.lineTo(tx, ty); };
          g.lineCap = 'round'; g.lineJoin = 'round';
          g.strokeStyle = back ? '#6e7488' : '#7f879b'; g.lineWidth = (back ? 5.5 : 7) * sc; path(); g.stroke();
          g.strokeStyle = back ? '#a4aabb' : '#e6eaf2'; g.lineWidth = (back ? 3 : 4) * sc; path(); g.stroke();
          g.fillStyle = back ? '#9097aa' : '#f8fafd'; g.beginPath(); g.arc(ex, ey, 3.4 * sc, 0, TAU); g.fill();
          g.strokeStyle = back ? '#5e6476' : '#7c8398'; g.lineWidth = 1.2; g.stroke();
          g.fillStyle = back ? '#555b6c' : '#646b80'; g.beginPath(); g.arc(tx, ty, 2.8 * sc, 0, TAU); g.fill();
          g.restore();
        };
        g.save(); g.translate(hp.x, hp.y); g.rotate(-th);
        g.save(); g.globalAlpha = 0.95; g.scale(0.55, 1); prong(1, true); g.restore();
        g.restore();
        if (C.holding) {
          const c = C.holding, hgt = clamp((M.pitY - c.y) / (M.pitY - M.gy0), 0, 1);
          g.save(); g.globalAlpha = 0.2 * (1 - hgt * 0.6); g.fillStyle = '#1a0f20'; g.beginPath(); g.ellipse(c.x, M.pitY - 2, c.r * (0.9 - hgt * 0.3), c.r * 0.2, 0, 0, TAU); g.fill(); g.restore();
          drawCap(g, c, 0, 1, t);
        }
        g.save(); g.translate(hp.x, hp.y); g.rotate(-th);
        prong(-1, false); prong(1, false);
        rr(g, -8 * sc, -15 * sc, 16 * sc, 10 * sc, 3 * sc); g.fillStyle = '#5a6074'; g.fill();
        rr(g, -13 * sc, -7 * sc, 26 * sc, 16 * sc, 7 * sc); g.fillStyle = metal(hp.y - 7 * sc, hp.y + 9 * sc); g.fill(); g.strokeStyle = 'rgba(40,40,60,0.5)'; g.lineWidth = 1; g.stroke();
        g.fillStyle = COLS[0]; g.fillRect(-13 * sc, 0, 26 * sc, 3 * sc);
        g.fillStyle = C.holding ? '#7dffb6' : '#ff8fb5'; g.beginPath(); g.arc(0, -3 * sc, 2.4 * sc, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(-10 * sc, -5 * sc, 7 * sc, 1.6 * sc);
        g.restore();
      }
      const SC = { on: 0, ang: 0, av: 0, costs: [], gives: [] };
      function scaleStep(dt) {
        SC.on += ((st.phase === 'weigh' || st.phase === 'decide' ? 1 : 0) - SC.on) * Math.min(1, dt * 5);
        const tgt = clamp((SC.costs.length - SC.gives.length) * 0.15, -0.4, 0.4), n = Math.max(1, Math.ceil(dt / 0.012)), hs = dt / n;
        for (let i = 0; i < n; i++) { SC.av += ((tgt - SC.ang) * 60 - SC.av * 7) * hs; SC.ang = clamp(SC.ang + SC.av * hs, -0.5, 0.5); }
      }
      function drawScale(g, t) {
        const sc = M.sc, k = K.ease.outBack(clamp(SC.on, 0, 1)), px = M.gcx, py = M.gy0 + (M.gy1 - M.gy0) * 0.5 + (1 - k) * 60, half = Math.min(105 * sc, (M.gx1 - M.chuteR) * 0.36);
        g.save(); g.globalAlpha = clamp(SC.on, 0, 1);
        // stand
        g.fillStyle = '#c8973a'; rr(g, px - 4 * sc, py, 8 * sc, 54 * sc, 3 * sc); g.fill();
        rr(g, px - 26 * sc, py + 50 * sc, 52 * sc, 10 * sc, 5 * sc); g.fillStyle = '#a8772a'; g.fill();
        // beam
        g.save(); g.translate(px, py); g.rotate(-SC.ang);
        const brass = g.createLinearGradient(0, -5 * sc, 0, 5 * sc); brass.addColorStop(0, '#ffe7a3'); brass.addColorStop(1, '#c8902a');
        rr(g, -half, -4 * sc, half * 2, 8 * sc, 4 * sc); g.fillStyle = brass; g.fill();
        g.restore();
        g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(px, py, 7 * sc, 0, TAU); g.fill();
        [[-1, SC.costs, '#ff5d73', 'COSTS'], [1, SC.gives, '#19a87e', 'GIVES']].forEach(([s, list, col, lab]) => {
          const ex = px + Math.cos(SC.ang) * half * s, ey = py - Math.sin(SC.ang) * half * s, pyy = ey + 30 * sc;
          g.strokeStyle = 'rgba(120,80,30,0.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex - 20 * sc, pyy); g.moveTo(ex, ey); g.lineTo(ex + 20 * sc, pyy); g.stroke();
          g.fillStyle = brass2(g, pyy, sc); g.beginPath(); g.ellipse(ex, pyy, 28 * sc, 9 * sc, 0, 0, Math.PI); g.fill();
          list.forEach((c, i) => { const cx2 = ex + ((i % 3) - 1) * 13 * sc, cy2 = pyy - 4 * sc - Math.floor(i / 3) * 10 * sc; g.fillStyle = col; g.beginPath(); g.arc(cx2, cy2, 6 * sc, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(cx2 - 2 * sc, cy2 - 2 * sc, 1.8 * sc, 0, TAU); g.fill(); });
          g.font = '400 ' + Math.round(13 * sc) + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top';
          const tw = g.measureText(lab).width + 12; rr(g, ex - tw / 2, pyy + 10 * sc, tw, 18 * sc, 9 * sc); g.fillStyle = 'rgba(255,253,248,0.92)'; g.fill(); g.fillStyle = col; g.fillText(lab, ex, pyy + 12 * sc);
        });
        g.restore();
      }
      function brass2(g, y, sc) { const gr = g.createLinearGradient(0, y, 0, y + 9 * sc); gr.addColorStop(0, '#ffe7a3'); gr.addColorStop(1, '#b8801f'); return gr; }

      /* ---------------- HUD helpers ---------------- */
      function bump(e) { e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); K.later(() => e.classList.remove('bump'), 360); }
      function lcdSay(top, text, user) { lcd.firstChild.textContent = top; const sp = lcd.lastChild; sp.className = user ? 'gk-user' : ''; sp.textContent = text; }

      /* ---------------- steering and dropping ---------------- */
      function setTx(x) { C.tx = clamp(x, M.chuteR + M.Rc * 0.6, M.gx1 - M.Rc * 0.9); knobTo(); }
      K.drag(rail, {
        start: (p) => { if (st.phase !== 'steer') return false; rail.classList.add('drag'); K.sfx.tap(); setTx(railToX(p.x)); },
        move: (p) => { if (st.phase !== 'steer') return; setTx(railToX(p.x)); if (A.ctx && Math.random() < 0.25) A.click({ vol: 0.03 }); },
        end: () => { rail.classList.remove('drag'); if (st.assist && st.phase === 'steer') { const near = nearestTarget(C.tx); if (near && Math.abs(near.x - C.tx) < near.r * 1.6) setTx(near.x); } }
      });
      S.listen(rail, 'keydown', (e) => { if (st.phase !== 'steer') return; if (e.key === 'ArrowLeft') { e.preventDefault(); setTx(C.tx - 14 * M.sc); } else if (e.key === 'ArrowRight') { e.preventDefault(); setTx(C.tx + 14 * M.sc); } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startDrop(); } });
      K.tap(dropBtn, () => startDrop());
      function nearestTarget(x) { let best = null, bd = 1e9; target().forEach(c => { const d = Math.abs(c.x - x); if (d < bd) { bd = d; best = c; } }); return best; }
      function startDrop() {
        if (st.phase !== 'steer' || C.mode !== 'idle') return;
        st.phase = 'drop'; st.roundDrops++; st.totalDrops++;
        dropBtn.classList.add('off'); dropBtn.classList.remove('ready'); K.guide(null);
        C.mode = 'drop'; C.modeT = 0; C.openT = 1;
        K.sfx.thud(); if (A.ctx) A.tone({ type: 'sawtooth', freq: 260, to: 120, glide: 1.1, dur: 1.2, vol: 0.025, lp: 900 });
      }
      function sfxClamp() { if (!A.ctx) return; const t0 = A.now(); A.tone({ when: t0, type: 'square', freq: 180, to: 120, glide: 0.12, dur: 0.14, vol: 0.04, lp: 1400 }); A.noise({ when: t0 + 0.05, filter: 'highpass', freq: 2800, dur: 0.04, vol: 0.05 }); }
      function steerWatch() {
        if (st.phase !== 'steer') return;
        const tp = tip(), near = nearestTarget(tp.x), over = !!(near && Math.abs(near.x - tp.x) < near.r * (st.assist ? 1.2 : 0.75) && Math.abs(C.th) < 0.05 && Math.abs(C.v) < 30 * M.sc);
        if (over !== st.over) {
          st.over = over; dropBtn.classList.toggle('ready', over);
          if (over) { if (A.ctx) A.tone({ type: 'sine', freq: 1320, dur: 0.06, vol: 0.03 }); K.guide({ id: 'drop' + st.round, g: 'tap', target: dropBtn, label: 'TAP: DROP THE CLAW', delay: 350 }); }
          else steerGuide(900);
        }
      }
      function steerGuide(delay) {
        const near = nearestTarget(C.tx); if (!near) return;
        const kx = xToRail(C.tx), to = xToRail(near.x);
        K.guide({ id: 'steer' + st.round + ':' + Math.round(to), g: 'drag', target: rail, ox: kx / Math.max(1, M.rail.w), dx: (to - kx) || 40, dy: 0, label: 'DRAG TO STEER', delay: delay == null ? 900 : delay, place: 'above' });
      }

      /* ---------------- rounds ---------------- */
      function startRound() {
        st.phase = 'steer'; st.over = null; st.roundDrops = 0; st.roundMiss = 0;
        lcd.classList.remove('hot');
        lcdSay(st.prizeOut ? 'Last one: the keeper' : 'Capsule ' + (st.round + 1) + ' of ' + NT, st.prizeOut ? 'Grab the golden capsule.' : 'Steer, wait for the swing, then drop.', false);
        rail.hidden = false; dropBtn.hidden = false; dropBtn.classList.add('off');
        K.later(() => { if (st.phase === 'steer') { dropBtn.classList.remove('off'); steerGuide(600); } }, 250);
      }
      function onTop() {
        if (!C.holding) { // missed: back to steering, with a calmer claw after two misses
          if (st.roundMiss >= 2 && !st.assist) { st.assist = true; C.damp = Math.max(C.damp, 4.5); say(glitch, L(LINES.assist), { mood: 'happy', ms: 2600 }); }
          else say(glitch, L(LINES.whiff), { mood: 'think', ms: 2600 });
          startRound(); return;
        }
        if (C.holding.kind === 'prize') { st.phase = 'carry'; say(rush, L(LINES.prizeGot), { mood: 'celebrate', ms: 2200 }); carryTo(M.chuteX, -1); return; }
        st.phase = 'center';
        C.tx = M.gcx; knobTo();
        const wait = () => { if (Math.abs(C.x - C.tx) < 3 && Math.abs(C.v) < 10) startWeigh(); else K.later(wait, 80); };
        K.later(wait, 120);
        if (st.round === 0) say(glitch, L(LINES.got), { mood: 'scan', ms: 2600 });
      }
      function carryTo(x, slipAt) { C.mode = 'carry'; C.carryFrom = C.x; C.carryTo = x; C.slipAt = slipAt; C.tx = x; knobTo(); if (A.ctx) A.tone({ type: 'sawtooth', freq: 150, to: 220, glide: 0.8, dur: 0.9, vol: 0.02, lp: 700 }); }

      /* ---------------- weigh: what holding it costs, what it gives ---------------- */
      function startWeigh() {
        if (st.phase !== 'center') return;
        st.phase = 'weigh'; SC.costs = []; SC.gives = []; st.picksRound = [];
        rail.hidden = true; dropBtn.hidden = true;
        const box = h('div', { class: 'cm-chips', role: 'group', 'aria-label': 'What does holding this thought cost, and what does it give?' });
        const mk = ([id, label, full], side) => { const b = h('button', { type: 'button', class: 'cm-chip', 'data-side': side, 'aria-pressed': 'false', 'aria-label': (side === 'costs' ? 'Holding it costs me ' : 'Holding it gives me ') + (full || label).toLowerCase() }, h('i', { html: ICO[id] }), h('span', { text: label })); K.tap(b, () => pickChip(b, id, side)); return b; };
        COSTS.forEach(c => box.append(mk(c, 'costs')));
        GIVES.forEach(c => box.append(mk(c, 'gives')));
        lcdSay('Pick ' + PICK + ': red costs, green gives', C.holding.text, C.holding.user);
        el.append(box); st.chips = box; placeChips();
        say(glitch, L(LINES.weigh, { n: PICK }), { mood: 'nerd', ms: 3600 });
        K.guide({ id: 'chips' + st.round, g: 'choose', target: () => Array.from(box.querySelectorAll('.cm-chip')).slice(0, 4), label: 'TAP ' + PICK + ' THAT FIT', delay: 1000, place: 'above' });
      }
      function placeChips() { const b = st.chips; if (!b) return; Object.assign(b.style, { left: (M.cx + 16) + 'px', top: (M.ctrlY - 2) + 'px', width: (M.cw - 32) + 'px' }); }
      function pickChip(b, id, side) {
        if (st.phase !== 'weigh' || b.classList.contains('on') || st.picksRound.length >= PICK) return;
        b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); st.picksRound.push({ id, side }); st.picks.push(id);
        (side === 'costs' ? SC.costs : SC.gives).push(id);
        if (A.ctx) { const t0 = A.now(); A.tone({ when: t0, type: 'sine', freq: side === 'costs' ? 880 : 1180, dur: 0.08, vol: 0.05 }); A.chime(A.note(side === 'costs' ? 'E6' : 'A6'), { when: t0 + 0.05, vol: 0.04, dur: 0.6 }); A.tone({ when: t0 + 0.1, type: 'sawtooth', freq: 90, to: 70, glide: 0.3, dur: 0.35, vol: 0.02, lp: 500 }); }
        K.sfx.tap();
        ctx.track('claw_weigh', { round: st.round, side: side === 'costs' ? 1 : 0 });
        if (st.picksRound.length >= PICK) { st.chips.classList.add('done'); K.guide(null); K.later(verdict, 500); }
      }
      function verdict() {
        const c = SC.costs.length, gv = SC.gives.length, v = c > gv ? 'cost' : c === gv ? 'even' : 'give';
        st.verdict = v; st.phase = 'decide';
        lcdSay(v === 'cost' ? 'Costs more than it gives' : v === 'even' ? 'Costs as much as it gives' : 'It gives you something', C.holding.text, C.holding.user);
        say(loopie, L(v === 'cost' ? LINES.vCost : v === 'even' ? LINES.vEven : LINES.vGive), { mood: v === 'cost' ? 'worried' : 'think', ms: 2600 });
        K.later(() => {
          if (st.chips) { st.chips.remove(); st.chips = null; }
          if (st.round === 0) offerCarry(); else offerOpen();
        }, 1300);
      }
      function placeActs() { const a = st.acts; if (!a) return; Object.assign(a.style, { left: (M.cx + 16) + 'px', width: (M.cw - 32) + 'px', top: (M.ctrlY + 4) + 'px' }); }
      function offerCarry() {
        const acts = h('div', { class: 'cm-acts' });
        const b = h('button', { type: 'button', class: 'cm-act', text: 'Carry it to the chute' });
        acts.append(b); el.append(acts); st.acts = acts; placeActs();
        say(rush, L(LINES.carry), { mood: 'determined', ms: 2600 });
        K.tap(b, () => { if (st.phase !== 'decide') return; K.sfx.ok(); acts.remove(); st.acts = null; K.guide(null); st.phase = 'carry'; idleControls(); carryTo(M.chuteX, 0.55); });
        K.guide({ id: 'carry', g: 'tap', target: b, label: 'TAP: HOLD ON TIGHT', delay: 900 });
      }
      function slip() {
        const c = C.holding; if (!c) return;
        C.holding = null; C.openT = 0.85; c.state = 'fall'; c.vx = C.v * 0.6; c.vy = 40; c.vr = (Math.random() - 0.5) * 6;
        st.slipped++; st.letGo++; pillGo.lastChild.textContent = st.letGo + '/' + NT; bump(pillGo);
        if (A.ctx) { const t0 = A.now(); A.boing({ freq: 300, vol: 0.12 }); A.tone({ when: t0 + 0.05, type: 'triangle', freq: 400, to: 160, glide: 0.5, dur: 0.55, vol: 0.06 }); }
        lcd.classList.remove('hot'); lcdSay('It slipped', c.text, c.user);
        say(rush, L(LINES.slip), { mood: 'fume', ms: 2400 }); if (!K.reduced()) rush.react('shake');
        ctx.track('claw_slip', {});
        st.phase = 'slip';
        K.later(() => { say(glitch, L(LINES.twist), { mood: 'wink', ms: 3200 }); }, 1900);
        K.later(() => { say(loopie, L(LINES.after), { mood: 'wow', ms: 3400 }); loopie.base('think'); }, 4600);
        K.later(() => { C.tx = M.gcx; knobTo(); C.openT = 1; nextRound(); }, 6300);
      }
      function onCarried() {
        if (st.phase === 'carry' && C.holding && C.holding.kind === 'prize') {
          const c = C.holding; C.holding = null; C.openT = 1; c.state = 'chute'; c.vx = 0; c.vy = 30; c.vr = 0;
          if (A.ctx) { A.boing({ freq: 420, vol: 0.1 }); A.noise({ when: A.now() + 0.15, filter: 'lowpass', freq: 400, dur: 0.6, vol: 0.12 }); }
          st.phase = 'chute';
        }
      }
      function offerOpen() {
        const acts = h('div', { class: 'cm-acts' });
        const keep = h('button', { type: 'button', class: 'cm-quiet', text: 'Keep it, lightly' });
        acts.append(keep); el.append(acts); st.acts = acts; placeActs();
        K.tap(keep, () => { if (st.phase !== 'decide') return; keepLightly(); });
        handle.hidden = false; placeHandle(); st.openAmt = 0;
        say(glitch, L(st.verdict === 'give' ? LINES.openGive : LINES.open1), { mood: st.verdict === 'give' ? 'think' : 'determined', ms: 3600 });
        K.guide({ id: 'open' + st.round, g: 'drag', target: handle, dir: 'r', d: Math.round(78 * M.sc), label: 'DRAG: OPEN THE CLAW', delay: 1000, place: 'below' });
      }
      function placeHandle() { const hp = hub(); Object.assign(handle.style, { left: hp.x + 'px', top: (hp.y + 14 * M.sc) + 'px' }); }
      K.drag(handle, {
        start: () => { if (st.phase !== 'decide') return false; K.guide(null); K.sfx.tap(); if (A.ctx && !st.creak) { st.creak = A.loop({ filter: 'bandpass', freq: 500, q: 6 }); S.onDestroy(() => st.creak && st.creak.stop()); } },
        move: (p, d) => { if (st.phase !== 'decide') return; const k = clamp(Math.abs(d.dx) / (70 * M.sc), 0, 1); C.openT = 0.5 + k * 0.5; if (st.creak) { st.creak.level(0.02 + k * 0.03, 0.05); st.creak.freq(380 + k * 500, 0.05); } if (k >= 0.92) letGo(); },
        end: (p, d) => { if (st.creak) st.creak.level(0.0001, 0.05); if (st.phase === 'decide') { C.openT = 0.5; K.sfx.soft(); K.guide({ id: 'open-again' + st.round, g: 'drag', target: handle, dir: 'r', d: Math.round(84 * M.sc), label: 'PULL FURTHER APART', delay: 1200, place: 'below' }); } }
      });
      S.listen(handle, 'keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && st.phase === 'decide') { e.preventDefault(); letGo(); } });
      function letGo() {
        if (st.phase !== 'decide' || !C.holding) return;
        const c = C.holding; C.holding = null; C.openT = 1; c.state = 'fall'; c.vx = C.v * 0.3 + (Math.random() - 0.5) * 30; c.vy = 20; c.vr = (Math.random() - 0.5) * 4;
        st.letGo++; pillGo.lastChild.textContent = st.letGo + '/' + NT; bump(pillGo);
        handle.hidden = true; if (st.acts) { st.acts.remove(); st.acts = null; } if (st.creak) st.creak.level(0.0001, 0.05); idleControls();
        if (A.ctx) { const t0 = A.now(); A.boing({ freq: 520, vol: 0.08 }); ['C5', 'E5', 'G5', 'C6', 'E6'].forEach((n, i) => A.chime(A.note(n), { when: t0 + 0.12 + i * 0.07, vol: 0.05, dur: 1.4 })); }
        K.sfx.great();
        if (!K.reduced()) P.emit('bubble', c.x, c.y, 16, { colors: ['rgba(255,255,255,0.9)', hexA(c.col, 0.8)] });
        lcd.classList.remove('hot'); lcdSay('Let go. Still in there, lighter', c.text, c.user);
        say(loopie, L(LINES.letGo), { mood: 'calm', ms: 2600 }); loopie.base(st.letGo >= 2 ? 'happy' : 'calm');
        ctx.track('claw_letgo', { round: st.round, verdict: st.verdict });
        st.phase = 'released';
        K.later(nextRound, 2200);
      }
      function keepLightly() {
        if (st.phase !== 'decide' || !C.holding) return;
        const c = C.holding; C.holding = null; C.openT = 0.75; c.state = 'fall'; c.vx = 0; c.vy = 0; c.vr = 0;
        st.kept++; handle.hidden = true; if (st.acts) { st.acts.remove(); st.acts = null; } K.guide(null); idleControls();
        K.sfx.ok(); lcdSay('Kept, lightly', c.text, c.user);
        say(loopie, L(LINES.kept), { mood: 'calm', ms: 2600 });
        ctx.track('claw_keep', { round: st.round });
        st.phase = 'released';
        K.later(nextRound, 2000);
      }
      // between steps the joystick and DROP stay on the deck, dimmed, so the machine never looks empty
      function idleControls() { rail.hidden = false; dropBtn.hidden = false; dropBtn.classList.add('off'); dropBtn.classList.remove('ready'); }
      function nextRound() {
        st.round++;
        if (st.round < NT) { if (st.round === NT - 1 && NT > 2) say(rush, L(LINES.rushCalm), { mood: 'think', ms: 2600 }); C.tx = M.gcx; knobTo(); C.openT = 1; startRound(); return; }
        revealPrize();
      }

      /* ---------------- the keeper: a golden capsule rises out of the pile ---------------- */
      function revealPrize() {
        st.phase = 'reveal'; st.prizeOut = true; st.assist = true; C.damp = Math.max(C.damp, 5);
        const p = caps.find(c => c.kind === 'prize'); p.state = 'rise'; p.ty = M.pitY - p.r * 0.82; p.x = clamp(M.gcx + (M.gx1 - M.gcx) * 0.35, M.chuteR + p.r * 2, M.gx1 - p.r * 1.2);
        // the light capsules make room
        caps.forEach(c => { if (c.state === 'light' && Math.abs(c.x - p.x) < p.r * 2.2) c.vx += (c.x < p.x ? -1 : 1) * 160 * M.sc; });
        if (A.ctx) { K.sfx.rise(); A.pad(['C4', 'E4', 'G4', 'C5'].map(n => A.note(n)), { dur: 2.4, vol: 0.1, attack: 0.4 }); }
        if (!K.reduced()) P.emit('star', p.x, M.pitY - 10, 22, { colors: ['#ffe27a', '#ffffff'] });
        say(glitch, L(LINES.prize), { mood: 'idea', ms: 3800 });
        lcdSay('A keeper appeared', serious ? 'One thing you can do.' : 'The workable version.', false);
        const ready = () => { if (p.state === 'pile') { st.round = NT; startRound(); } else K.later(ready, 100); };
        K.later(ready, 900);
      }
      function prizeDoor() {
        if (st.door) return;
        st.door = { t0: now(), x: M.door.x + M.door.w / 2, y: M.door.y + M.door.h / 2 };
        if (A.ctx) { const t0 = A.now(); A.thud({ vol: 0.3 }); A.wood(t0 + 0.08, 0.15, 0.9); }
        K.later(finale, 450);
      }
      function drawDoor(g, t) {
        const D = st.door, k = clamp((now() - D.t0) / 900, 0, 1), e = K.ease.outCubic(k);
        // the capsule rolls out of the prize door onto the deck, then pops open on a figurine
        const fs = Math.min(M.Rc * 3.2, M.ctrlH - 30), sx = D.x, sy = D.y, tx = M.cx + M.cw / 2, ty = M.ctrlY + M.ctrlH - 16 - M.Rc * 0.7;
        const open = clamp((now() - D.t0 - 900) / 500, 0, 1), r = M.Rc * 1.06;
        const x = lerp(sx, tx, e), y = lerp(sy, ty, e) - Math.sin(e * Math.PI) * 30 * M.sc;
        if (open > 0) {
          // pedestal + figurine (the bubble character art, whole and uncropped)
          const pk = K.ease.outBack(open), py = M.ctrlY + M.ctrlH - 14;
          const tierCol = st.tierCol || '#ffd23f';
          g.save(); g.globalAlpha = Math.min(1, open * 1.5);
          g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(tx, py + 10 * M.sc, fs * 0.55, 8 * M.sc, 0, 0, TAU); g.fill();
          const pg = g.createLinearGradient(0, py - 6 * M.sc, 0, py + 10 * M.sc); pg.addColorStop(0, '#ffffff'); pg.addColorStop(1, tierCol);
          g.fillStyle = pg; rr(g, tx - fs * 0.5, py - 4 * M.sc, fs, 14 * M.sc, 7 * M.sc); g.fill();
          if (!K.reduced()) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 * open; g.drawImage(K.glowSprite('#ffe9a0'), tx - fs, py - fs * 1.4, fs * 2, fs * 2); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
          if (figImg.complete && figImg.naturalWidth) { const s = fs * pk; g.drawImage(figImg, tx - s / 2, py - 4 * M.sc - s, s, s); }
          g.restore();
          // capsule halves fly apart
          const hk = open, s = capSprite('#ffd23f', true), cs = s.css;
          [[-1, -0.7], [1, 0.7]].forEach(([dir, rot]) => { g.save(); g.globalAlpha = 1 - hk; g.translate(tx + dir * hk * fs * 0.8, ty - hk * 20 * M.sc); g.rotate(rot * hk * 2); g.beginPath(); g.rect(dir < 0 ? -cs / 2 : 0, -cs / 2, cs / 2, cs); g.clip(); g.drawImage(s, -cs / 2, -cs / 2, cs, cs); g.restore(); });
        } else { const s = capSprite('#ffd23f', true), cs = s.css; g.save(); g.translate(x, y); g.rotate(e * 6); g.drawImage(s, -cs / 2, -cs / 2, cs, cs); g.restore(); }
      }
      function drawStars(g, dt) {
        for (let i = st.stars.length - 1; i >= 0; i--) {
          const s = st.stars[i]; s.vy += 260 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += s.vr * dt;
          if (s.y > M.h + 20) { st.stars.splice(i, 1); continue; }
          g.save(); g.translate(s.x, s.y); g.rotate(s.r); g.fillStyle = s.c; K.starPath(g, 0, 0, s.s, s.s * 0.45, 5, 0); g.fill(); g.restore();
        }
      }

      /* ---------------- finale ---------------- */
      let sign = null;
      function placeSign() { if (!st.sign) return; st.sign.style.top = Math.round(M.gy0 + (M.gy1 - M.gy0) * 0.16) + 'px'; }
      async function finale() {
        if (st.phase === 'finale' || st.finished) return;
        st.phase = 'finale'; st.finT = now();
        rail.hidden = true; dropBtn.hidden = true; handle.hidden = true; K.guide(null);
        const acc = st.acc.length ? st.acc.reduce((a, b) => a + b, 0) / st.acc.length : 0.7;
        const firstTry = st.grabs ? st.clean / Math.max(1, NT + 1) : 0;
        st.score = clamp(acc * 0.55 + firstTry * 0.45, 0, 1);
        st.tier = K.tier(st.score, [0.3, 0.55, 0.78]);
        st.tierCol = st.tier === 'Gold' ? '#ffd23f' : st.tier === 'Silver' ? '#d9e2ef' : st.tier === 'Bronze' ? '#e0a36a' : '#ffb6dc';
        music.level(0.55);
        // prize-chute fanfare
        if (A.ctx) { const t0 = A.now(); ['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6'].forEach((n, i) => A.tone({ when: t0 + i * 0.09, type: i % 2 ? 'triangle' : 'square', freq: A.note(n), dur: 0.14, vol: 0.035, lp: 3000 })); K.later(() => K.sfx.win(), 650); K.later(() => K.sfx.pop(undefined, 700), 950); }
        lcdSay('Prize: ' + FIGN[fig] + ' figurine' + (st.tier ? ' · ' + st.tier : ''), 'Holding the thought you kept.', false);
        lcd.classList.add('hot');
        K.later(() => {
          sign = h('div', { class: 'cm-sign', role: 'status' }, h('small', { text: serious ? 'The keeper: a plan' : 'The keeper' }), h('span', { text: prizeText }), prizeNote ? h('em', { text: prizeNote }) : null);
          el.append(sign); st.sign = sign; placeSign();
          for (let i = 0; i < (K.reduced() ? 18 : 70); i++) st.stars.push({ x: M.cx + Math.random() * M.cw, y: M.cy0 - 20 - Math.random() * 260, vx: (Math.random() - 0.5) * 40, vy: 40 + Math.random() * 80, r: Math.random() * 6, vr: (Math.random() - 0.5) * 6, s: (4 + Math.random() * 5) * M.sc, c: [skin.a, skin.b, skin.c, skin.d, '#ffffff', '#ffe27a'][i % 6] });
        }, 1250);
        say(loopie, L(LINES.fin), { mood: 'celebrate', ms: 0 }); loopie.base('celebrate'); loopie.react('bounce');
        glitch.face('happy'); if (M.side) { rush.show(true); rush.face('celebrate'); }
        await K.finale('confetti', { from: [{ x: M.cx + M.cw / 2, y: M.deckY + 20 }], colors: [skin.a, skin.b, skin.c, skin.d, '#ffffff'], ms: 4200, chord: ['C4', 'E4', 'G4', 'C5'] });
        await K.wait(K.reduced() ? 300 : 1100);
        finishGame();
      }
      function finishGame() {
        if (st.finished) return; st.finished = true; st.phase = 'done';
        const pct = Math.round((st.acc.length ? st.acc.reduce((a, b) => a + b, 0) / st.acc.length : 0) * 100);
        const badges = [];
        if (st.tier) badges.push(st.tier + ' steady grip');
        const b = K.best('steady', pct, 'higher'); if (b.isNew) badges.push('New best: ' + pct + '% steady grabs'); else if (b.first) badges.push('Steady grabs: ' + pct + '%');
        const item = FIGN[fig] + ' figurine' + (st.tier ? ' (' + st.tier + ')' : '');
        const col = K.collect(item); if (col.isNew) badges.push('Collected: ' + item + ' · ' + col.count + ' so far');
        const lg = st.letGo;
        ctx.finish({
          title: serious ? 'Lighter grip, a plan kept' : 'Lighter grip', mood: 'celebrate',
          lines: ['Let go of ' + lg + ' thought' + (lg === 1 ? '' : 's') + (st.slipped ? ' (one slipped on its own)' : '') + (st.kept ? ', kept ' + st.kept + ' lightly' : ''), 'Kept: ' + clip(prizeText, 80), 'Steady grabs: ' + st.clean + ' first try · ' + pct + '% centred'],
          share: 'Let go of ' + lg + ' thought' + (lg === 1 ? '' : 's') + ', kept 1 that actually helps.', badges: badges.slice(0, 4)
        });
      }

      /* ---------------- flow ---------------- */
      cv.onResize(() => layout());
      S.on('theme', () => { statOK = false; Object.keys(spr).forEach(k => delete spr[k]); });
      function startMotor() { if (!A.ctx || motor) return; motor = A.loop({ filter: 'bandpass', freq: 260, q: 3 }); S.onDestroy(() => motor && motor.stop()); }
      startMotor(); S.on('audio-ready', startMotor);
      (async () => {
        await K.intro({ title: 'Claw Machine', sub: 'A machine full of the thoughts you keep gripping.', how: 'Steer, drop, grab. Weigh what it costs. Then open your hand.', char: 'loopie', mood: 'wow' });
        layout(); st.phase = 'boot';
        if (A.ctx) { const t0 = A.now(); ['G5', 'C6', 'E6'].forEach((n, i) => A.chime(A.note(n), { when: t0 + i * 0.08, vol: 0.05, dur: 1 })); }
        say(loopie, L(LINES.open), { mood: 'worried', ms: 3200 });
        await K.wait(K.reduced() ? 800 : 2400);
        say(rush, L(LINES.rush), { mood: 'speed', ms: 2200 }); if (!K.reduced()) rush.react('bounce');
        await K.wait(K.reduced() ? 600 : 1700);
        say(glitch, L(LINES.how), { mood: 'scan', ms: 3600 });
        startRound();
      })();

      return {
        async autoplay() {
          const wait = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(80); };
          const steerAndDrop = async () => {
            for (let attempt = 0; attempt < 5; attempt++) {
              await wait(() => st.phase === 'steer' && !dropBtn.classList.contains('off') && target().length > 0, 20000);
              const tg = nearestTarget(C.tx); if (!tg) return;
              const from = xToRail(C.tx), to = xToRail(tg.x);
              await K.sim.drag(rail, { x: from, y: 29 }, { x: to, y: 29 }, 700, 14);
              await wait(() => Math.abs(C.x - C.tx) < 2 && Math.abs(C.th) < 0.025 && Math.abs(C.v) < 8, 6000);
              const t2 = nearestTarget(tip().x);
              if (t2 && Math.abs(t2.x - tip().x) > t2.r * 0.3) { await K.sim.drag(rail, { x: xToRail(C.tx), y: 29 }, { x: xToRail(t2.x), y: 29 }, 400, 8); await wait(() => Math.abs(C.x - C.tx) < 2 && Math.abs(C.th) < 0.025 && Math.abs(C.v) < 8, 5000); }
              await K.wait(120);
              await K.sim.tap(dropBtn);
              await wait(() => st.phase !== 'drop' && C.mode !== 'drop' && C.mode !== 'close' && C.mode !== 'lift', 12000);
              if (C.holding || st.phase !== 'steer') return;
            }
          };
          for (let r = 0; r < NT; r++) {
            await steerAndDrop();
            await wait(() => st.phase === 'weigh' && st.chips, 15000);
            await K.wait(700);
            const chips = Array.from(st.chips.querySelectorAll('.cm-chip'));
            const order = ['Sleep', 'Time', 'Mood', 'Protection', 'People'];
            for (let i = 0; i < PICK; i++) { const b = chips.find(x => x.textContent.indexOf(order[i]) >= 0 && !x.classList.contains('on')); if (b) { await K.sim.tap(b); await K.wait(350); } }
            await wait(() => st.phase === 'decide' && (st.acts || !handle.hidden), 8000);
            await K.wait(700);
            if (r === 0) { const b = st.acts && st.acts.querySelector('.cm-act'); if (b) await K.sim.tap(b); await wait(() => st.round >= 1 && st.phase === 'steer', 20000); }
            else { await wait(() => !handle.hidden, 4000); await K.sim.drag(handle, { x: 37, y: 37 }, { x: 37 + 110 * M.sc, y: 37 }, 900, 18); await wait(() => st.phase !== 'decide', 3000); if (st.phase === 'decide') { const k = st.acts && st.acts.querySelector('.cm-quiet'); if (k) await K.sim.tap(k); } }
          }
          await wait(() => st.prizeOut && st.phase === 'steer', 20000);
          await steerAndDrop();
          await wait(() => st.finished, 45000);
        }
      };
    }
  });
})(window.TSG_ENV);
