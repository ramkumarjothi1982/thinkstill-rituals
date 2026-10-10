/* 034 Circle of Control — Reframe · REFRAME · Uncertainty / Future Worry / Reassurance
 * Mechanism: the dichotomy of control (Epictetus; Stoic practice), as used in ACT's acceptance and committed action
 * (Hayes, Strosahl & Wilson) and in Covey's circles of control and influence: sorting what is on your mind into what you
 * can do, what you can only nudge and what is not yours turns a diffuse worry into a few concrete actions and lets the
 * rest be. Each ring answers physically: CONTROL turns a stone into a lever, INFLUENCE grows a bridge toward the centre,
 * NOT MINE lifts the stone away as a cloud that drifts over the town.
 * Verb: sort (drag worry stones into three raked rings), split (tap the big stone), pull (the levers). Twist: the big
 * stone, the player's own feared outcome, looks out of their hands, but a small piece of it is theirs: three taps split it
 * off and it becomes a lever. Finale: every lever sends light down a garden path into the miniature town, the worries
 * that are not yours drift past as clouds, and a rake sweeps the sand back into calm rings.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const hexRgb = (hx) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hx || ''); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [128, 128, 128]; };
  const mixC = (a, b, k) => { const A = hexRgb(a), B = hexRgb(b); return '#' + [0, 1, 2].map(i => Math.max(0, Math.min(255, Math.round(A[i] + (B[i] - A[i]) * k))).toString(16).padStart(2, '0')).join(''); };
  const shade = (a, k) => (k < 1 ? mixC(a, '#000000', 1 - k) : mixC(a, '#ffffff', k - 1));
  const rgba = (hx, a) => { const c = hexRgb(hx); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  const lum = (hx) => { const c = hexRgb(hx); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; };
  function poly(g, p) { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); }
  /* No GPU (VMs, blocklisted devices): every canvas pixel is rasterised on the CPU, so the garden draws at a lower density there. */
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

  /* Daily season: the town's trees, roofs, ground and what drifts through the air. */
  const SEASONS = [
    { key: 'spring', name: 'Spring garden', ground: '#7f9c60', ground2: '#6b8a50', moss: '#97b172', canopy: ['#f2b3c6', '#f7cad8', '#e48fab'], trunk: '#6d4c3d', roofs: ['#4f5d7a', '#62708c', '#7b5b4c'], wall: '#efe7d6', wood: '#6b4a33', fall: 'petal', fallCols: ['#ffc4d6', '#ffd9e6', '#fff3f6'] },
    { key: 'summer', name: 'Summer garden', ground: '#5f8f4e', ground2: '#4f7f42', moss: '#78a75c', canopy: ['#3f7d3a', '#59984a', '#2f6b33'], trunk: '#5e4330', roofs: ['#3f566e', '#4f6a52', '#7a4b3c'], wall: '#f1ead9', wood: '#5e4330', fall: 'firefly', fallCols: ['#f3ff9a', '#fff3a0'] },
    { key: 'autumn', name: 'Autumn garden', ground: '#8a8450', ground2: '#787240', moss: '#a39958', canopy: ['#d9622b', '#ea9a3c', '#b8432a'], trunk: '#5e3f2e', roofs: ['#4a4f63', '#6a4a3a', '#5a5f4a'], wall: '#efe4d0', wood: '#5e3f2e', fall: 'leaf', fallCols: ['#d9622b', '#e8a03a', '#b8432a'] },
    { key: 'winter', name: 'Winter garden', ground: '#d3dbe4', ground2: '#c1cad6', moss: '#e6ebf1', canopy: ['#2f5a48', '#3d6a55', '#28503f'], trunk: '#5a4a40', roofs: ['#eef2f7', '#e3e8f0', '#e9edf3'], wall: '#e7dfd2', wood: '#5a4a40', fall: 'snow', fallCols: ['#ffffff', '#eef4ff'], snow: true }
  ];
  /* Today's worry stones are cut from one stone (a collection that fills by coming back on different days, never by chance). */
  const STONES = [
    { name: 'River pebble', col: '#7f8a96' }, { name: 'Basalt', col: '#585d68' }, { name: 'Jade', col: '#5f927a' }, { name: 'Rose quartz', col: '#c08c97' },
    { name: 'Moonstone', col: '#a9aec0' }, { name: 'Sandstone', col: '#b0875c' }, { name: 'Slate', col: '#5b6c82' }
  ];
  const ICON = {
    lever: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18.5h14V21H5z" fill="currentColor"/><path d="M12 18.5 16.4 6.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="17" cy="5.2" r="3.1" fill="currentColor"/></svg>',
    bridge: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 17c4-8.5 16-8.5 20 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M5.5 13v6M9.5 10.8v8.2M14.5 10.8v8.2M18.5 13v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18.5h10.6a4.1 4.1 0 0 0 .5-8.2 5.6 5.6 0 0 0-10.8 1.3A3.5 3.5 0 0 0 7 18.5z" fill="currentColor"/></svg>',
    stone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 14.5C3.5 10 8 6.5 13 6.5s7.5 3 7.5 6.6-3.4 6.4-8.6 6.4-8.4-1.2-8.4-5z" fill="currentColor"/></svg>'
  };
  const F1 = 0.4, F2 = 0.7; // ring boundaries as a fraction of the garden's radius: CONTROL < F1 < INFLUENCE < F2 < NOT MINE < 1

  (env.games = env.games || []).push({
    id: 'circle-of-control', mode: 'reframe', name: 'Circle of Control', verb: 'sort', family: 'REFRAME', minutes: 2,
    parents: ['Uncertainty / Future Worry / Reassurance', 'Mental Overload / Working Memory', 'Decision Pressure'],
    cast: ['still', 'rush', 'patch'], poster: { char: 'still', mood: 'calm' },
    fonts: ['Shippori+Mincho:wght@700;800', 'Zen+Maru+Gothic:wght@500;700'],
    tagline: 'Sort your worry stones: levers to pull, bridges, passing clouds.',
    why: 'For a head full of worries: find the part that is yours to do and let the rest drift.',
    css: `
.g-circle-of-control { --cc-disp: "Shippori Mincho", "Hoefler Text", "Iowan Old Style", Georgia, serif; --cc-ui: "Zen Maru Gothic", "Nunito", "Trebuchet MS", system-ui, sans-serif; }
.g-circle-of-control .cc-hud { position: absolute; z-index: 26; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 60px); transform: translateX(-50%); display: flex; align-items: center; gap: 9px; padding: 6px 14px 6px 9px;
  border-radius: 999px; background: color-mix(in srgb, var(--ui-surface) 90%, transparent); border: 1px solid var(--ui-line); color: var(--ui-fg); font: 700 14px/1 var(--cc-ui); box-shadow: 0 6px 16px rgba(0, 0, 0, .2);
  white-space: nowrap; pointer-events: none; }
.g-circle-of-control .cc-hud span { display: inline-flex; align-items: center; gap: 4px; font-variant-numeric: tabular-nums; }
.g-circle-of-control .cc-hud svg { width: 17px; height: 17px; flex: none; }
.g-circle-of-control .cc-hud .cc-sorted svg { color: #8d93a4; }
.g-circle-of-control .cc-hud .cc-hl svg { color: #d6452f; } .g-circle-of-control .cc-hud .cc-hb svg { color: #c98a3a; } .g-circle-of-control .cc-hud .cc-hc svg { color: #8a9bd6; }
.g-circle-of-control .cc-hud i { width: 1px; height: 16px; background: var(--ui-line); }
.g-circle-of-control .cc-hud .bump { animation: circle-of-control-bump .5s cubic-bezier(.2, 1.6, .4, 1); }
@keyframes circle-of-control-bump { 0% { scale: 1; } 40% { scale: 1.35; } 100% { scale: 1; } }
.g-circle-of-control .cc-ring { position: absolute; z-index: 18; left: 0; top: 0; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 5px; padding: 4px 10px 4px 7px; border-radius: 999px;
  font: 700 12px/1 var(--cc-ui); letter-spacing: .12em; text-transform: uppercase; white-space: nowrap; pointer-events: none; color: #fff8ec; background: rgba(43, 36, 30, .66);
  box-shadow: 0 2px 8px rgba(0, 0, 0, .28); transition: background .25s ease, box-shadow .25s ease, scale .25s ease; }
.g-circle-of-control .cc-ring svg { width: 15px; height: 15px; flex: none; }
.g-circle-of-control .cc-ring.hot { background: #b8402c; box-shadow: 0 0 0 2px #ffd27a, 0 0 18px rgba(255, 210, 122, .65); scale: 1.08; }
.g-circle-of-control .cc-ring.dim { opacity: .55; }
.g-circle-of-control .cc-sand { position: absolute; z-index: 5; left: 0; top: 0; border-radius: 50%; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.g-circle-of-control .cc-stone, .g-circle-of-control .cc-lever { position: absolute; z-index: 20; left: 0; top: 0; margin: 0; padding: 0; border: 0; background: transparent; border-radius: 40%;
  touch-action: none; cursor: grab; -webkit-tap-highlight-color: transparent; }
.g-circle-of-control .cc-lever { z-index: 21; border-radius: 14px; }
.g-circle-of-control .cc-stone:focus-visible, .g-circle-of-control .cc-lever:focus-visible, .g-circle-of-control .cc-cloudlab:focus-visible { outline: 3px solid #ffd27a; outline-offset: 3px; }
.g-circle-of-control .cc-lab { position: absolute; z-index: 22; left: 0; top: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none;
  font: 700 13px/1.12 var(--cc-ui); color: #fffaf0; text-shadow: 0 1px 2px rgba(0, 0, 0, .8), 0 0 7px rgba(0, 0, 0, .4); text-wrap: balance; overflow-wrap: anywhere; transition: opacity .3s ease; }
.g-circle-of-control .cc-lab.dark { color: #24222a; text-shadow: 0 1px 0 rgba(255, 255, 255, .55), 0 0 6px rgba(255, 255, 255, .35); }
.g-circle-of-control .cc-lab .gk-user { font: 700 15px/1.12 var(--cc-ui); }
.g-circle-of-control .cc-lab small { display: block; font: 700 12px/1 var(--cc-ui); letter-spacing: .08em; text-transform: uppercase; opacity: .9; margin-bottom: 3px; }
.g-circle-of-control .cc-cloudlab { position: absolute; z-index: 24; left: 0; top: 0; margin: 0; padding: 4px 6px; border: 0; background: transparent; min-height: 44px; display: flex; align-items: center; justify-content: center;
  text-align: center; font: 700 13px/1.15 var(--cc-ui); color: #353854; text-wrap: balance; cursor: pointer; transition: opacity .6s ease; -webkit-tap-highlight-color: transparent; }
.g-circle-of-control .cc-cloudlab .gk-user { font: 700 15px/1.15 var(--cc-ui); }
.g-circle-of-control .cc-card { position: absolute; z-index: 34; left: 50%; top: 0; width: min(340px, calc(100% - 32px)); transform: translate(-50%, 12px); opacity: 0; pointer-events: none; padding: 10px 14px 12px;
  border-radius: 12px; background: linear-gradient(180deg, #fffaf0, #f2e6cd); color: #2b2a33; box-shadow: 0 0 0 2px #e2a83f, 0 12px 28px rgba(0, 0, 0, .35); transition: opacity .35s ease, transform .5s cubic-bezier(.2, 1.3, .4, 1); }
.g-circle-of-control .cc-card.on { opacity: 1; transform: translate(-50%, 0); }
.g-circle-of-control .cc-card small, .g-circle-of-control .cc-plan small { display: flex; align-items: center; gap: 6px; font: 700 12px/1 var(--cc-ui); letter-spacing: .12em; text-transform: uppercase; color: #b1432c; margin-bottom: 6px; }
.g-circle-of-control .cc-card small svg, .g-circle-of-control .cc-plan small svg { width: 15px; height: 15px; }
.g-circle-of-control .cc-card span { display: block; font: 700 15px/1.3 var(--cc-ui); }
.g-circle-of-control .cc-plan { position: absolute; z-index: 34; left: 50%; top: 0; width: min(380px, calc(100% - 28px)); transform: translate(-50%, 16px); opacity: 0; pointer-events: none; padding: 11px 14px 12px;
  border-radius: 14px; background: linear-gradient(180deg, rgba(255, 250, 240, .97), rgba(242, 230, 205, .97)); color: #2b2a33; box-shadow: 0 0 0 2px #e2a83f, 0 0 34px rgba(255, 210, 122, .45), 0 14px 30px rgba(0, 0, 0, .35);
  transition: opacity .5s ease, transform .7s cubic-bezier(.2, 1.3, .4, 1); }
.g-circle-of-control .cc-plan.on { opacity: 1; transform: translate(-50%, 0); }
.g-circle-of-control .cc-plan b { display: block; font: 800 19px/1.15 var(--cc-disp); margin-bottom: 7px; }
.g-circle-of-control .cc-plan ol { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.g-circle-of-control .cc-plan li { display: flex; gap: 8px; align-items: flex-start; font: 700 14px/1.28 var(--cc-ui); }
.g-circle-of-control .cc-plan li svg { flex: none; width: 17px; height: 17px; margin-top: 1px; color: #d6452f; }
.g-circle-of-control .cc-plan em { display: block; margin-top: 7px; font: 600 13px/1.3 var(--cc-ui); font-style: normal; color: #6b4a1a; }
.g-circle-of-control .gk-char .gk-bubble { max-width: var(--cc-bub, 280px); }
.g-circle-of-control .cc-rr.gk-side-above .gk-bubble { left: auto; right: 0; }
.g-circle-of-control .cc-mid.gk-side-above .gk-bubble { left: calc(var(--sz, 56px) / 2 - var(--cc-bh, 120px)); }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const clamp = K.clamp, lerp = K.lerp, now = () => performance.now(), RM = () => K.reduced();
      const L = (o) => ctx.line(o) || '';
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return (sp > n * 0.6 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; };
      const sent = (s) => { s = String(s || '').trim(); if (!s) return s; s = s[0].toUpperCase() + s.slice(1); return /[.!?…"”')]$/.test(s) ? s : s + '.'; };
      const inten = ctx.intensity, care = an.safety === 'care', serious = an.fear_support === 'strong';
      const noWords = !String(ctx.text || '').trim(), visits = K.visits(), bright = () => S.scene() === 'bright';
      const season = K.dailyPick(SEASONS, 34), stoneType = K.dailyPick(STONES, 77);
      const PENT = ['D4', 'F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'G5', 'A5', 'C6', 'D6', 'F6'];

      /* ---------------- the stones: three kinds of everyday worry, plus the player's own big one ---------------- */
      const leads = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text);
      const leadOf = (k, fb) => sent(clip((leads.find(l => l.kind === k) || {}).text || fb, 118));
      const ACT = { ask: leadOf('ask', 'Ask one simple question that would fill the biggest gap.'), prepare: leadOf('prepare', 'Write down one thing you can do, and when.'), steady: leadOf('steady', 'Do one small, kind thing for yourself tonight.') };
      const userTwist = !noWords && !!String(an.conclusion || an.thought || '').trim();
      const twistText = userTwist ? sent(clip(an.conclusion || an.thought, 64)) : 'Whether it all works out';
      const LIB = {
        c1: { kind: 'control', label: 'Whether I ask', act: ACT.ask },
        c2: { kind: 'control', label: 'How I spend tonight', act: ACT.steady },
        i1: { kind: 'influence', label: 'What happens next' },
        i2: { kind: 'influence', label: 'How well I sleep' },
        n0: { kind: 'notmine', label: 'The weather tomorrow' },
        n1: { kind: 'notmine', label: 'Other people’s moods' },
        n2: { kind: 'notmine', label: 'What already happened' }
      };
      const ORDER = [['c2', 'n0', 'i1'], ['c1', 'n1', 'i1', 'c2'], ['c1', 'n1', 'i1', 'n0', 'c2', 'i2']][inten] || ['c1', 'n1', 'i1', 'c2'];
      const TWIST_AT = Math.ceil(ORDER.length / 2); // the big stone rolls in halfway through

      /* ---------------- lines (every one in three vibes) ---------------- */
      const LINES = {
        intro: visits
          ? { Jolly: 'Back in the garden! Same three rings: yours to do, yours to nudge, and weather.', Cheeky: 'Welcome back. The stones missed you. Mostly.', Unfiltered: 'Back. Three rings. Sort.' }
          : { Jolly: 'Three rings. Inside: yours to do. Middle: yours to nudge. Outside: just weather.', Cheeky: 'Three rings and a pile of worry stones. Let’s tidy your head.', Unfiltered: 'Three rings. Sort the stones.' },
        intro2: { Jolly: 'Pick a stone and ask: is this mine to do?', Cheeky: 'One question per stone: can I actually do this?', Unfiltered: 'Ask: can I do this?' },
        lever1: { Jolly: 'A LEVER? Can I pull it? Can I pull it now?', Cheeky: 'Ooh, a lever. My favourite shape.', Unfiltered: 'Lever. Want.' },
        lever1b: { Jolly: 'Soon. Sort the rest first.', Cheeky: 'Patience. Sort first, pull later.', Unfiltered: 'Later.' },
        lever: { Jolly: 'Yours. Another lever.', Cheeky: 'Yours. Lever installed.', Unfiltered: 'Yours.' },
        bridge1: { Jolly: 'A bridge! You can’t steer it, but you can reach toward it.', Cheeky: 'Bridge built. Not control, but not nothing.', Unfiltered: 'You can nudge it. Bridge.' },
        bridge: { Jolly: 'Another bridge. Reach, don’t grab.', Cheeky: 'Nudgeable. Bridged.', Unfiltered: 'Bridge.' },
        cloud1: { Jolly: 'Wait, come back! I wasn’t done worrying about you!', Cheeky: 'Bye, worry. Don’t write.', Unfiltered: 'Gone? Fine.' },
        cloud1b: { Jolly: 'Not yours. Let it be weather.', Cheeky: 'That one’s weather. Watch it float off.', Unfiltered: 'Not yours. Let it drift.' },
        cloud: { Jolly: 'Up it goes. Weather.', Cheeky: 'More weather. Lovely.', Unfiltered: 'Weather.' },
        noCtl: { Jolly: 'I’ll pull it! …It isn’t connected to anything.', Cheeky: 'I yanked it. Nothing. It’s not wired to us.', Unfiltered: 'Not connected.' },
        noCtlI: { Jolly: 'It wobbles. You can nudge this one, not decide it.', Cheeky: 'Half a lever. That’s a nudge, not a switch.', Unfiltered: 'Nudge, not switch.' },
        noInf: { Jolly: 'I can’t build a bridge to that one. It’s out of reach.', Cheeky: 'No bridge reaches that far. Not ours.', Unfiltered: 'Out of reach.' },
        noInfC: { Jolly: 'You can do more than nudge this one. It’s all yours.', Cheeky: 'Why just nudge? You can actually do it.', Unfiltered: 'You can do it. All of it.' },
        noOut: { Jolly: 'Too heavy to float off. That one’s yours, actually.', Cheeky: 'It won’t fly. Because it’s yours.', Unfiltered: 'Yours. Won’t float.' },
        noOutI: { Jolly: 'Not quite weather. You can reach this one a little.', Cheeky: 'Not weather. You’ve got a little pull here.', Unfiltered: 'Not weather. Nudge it.' },
        big: { Jolly: 'Uh-oh. Here comes the big one.', Cheeky: 'The boulder. It’s always the boulder.', Unfiltered: 'Big one.' },
        crack: serious
          ? { Jolly: 'This one might really happen. Not all of it is yours to decide, but a piece is. Split it off.', Cheeky: 'Real worry. Not all yours, but a piece is. Crack it.', Unfiltered: 'Real. A piece is yours. Split it.' }
          : { Jolly: 'Look closer. There’s a small piece of this one that’s yours.', Cheeky: 'Hold on. A little bit of this boulder is yours.', Unfiltered: 'Part of it’s yours. Split it.' },
        split: { Jolly: 'THAT bit’s mine? I’ll take it!', Cheeky: 'A pebble I can actually lift. Lovely.', Unfiltered: 'Mine. Got it.' },
        restCloud: { Jolly: 'And the rest of it can be weather.', Cheeky: 'The rest? Weather. Off it goes.', Unfiltered: 'Rest: weather.' },
        restBridge: { Jolly: 'And the rest, you can nudge.', Cheeky: 'The rest gets a bridge. Nudge, don’t grab.', Unfiltered: 'Rest: nudge.' },
        pull: { Jolly: 'Now pull what’s yours. Watch the town.', Cheeky: 'Lever time. Pull the stuff you can actually do.', Unfiltered: 'Pull your levers.' },
        pullRush: { Jolly: 'FINALLY.', Cheeky: 'My time has come.', Unfiltered: 'Yes.' },
        notYet: { Jolly: 'Not yet! Sort the stones first.', Cheeky: 'Patience. Stones first.', Unfiltered: 'Stones first.' },
        lit: [{ Jolly: 'Lights! Look at that street go.', Cheeky: 'One lever, one glowing street. Efficient.', Unfiltered: 'Lit.' }, { Jolly: 'Another street! Small action, lots of light.', Cheeky: 'Look at it. Doing things suits you.', Unfiltered: 'More light.' }, { Jolly: 'The whole town’s waking up!', Cheeky: 'Full power. Somebody stop me.', Unfiltered: 'All lit.' }],
        litPatch: { Jolly: 'And the bridges carry a little light too.', Cheeky: 'Even the nudges glow a bit.', Unfiltered: 'Bridges glow.' },
        fin: { Jolly: 'Balance. Yours done, the rest drifting.', Cheeky: 'Levers pulled. Clouds drifting. Sand raked.', Unfiltered: 'Yours: done. Rest: weather.' },
        finRush: { Jolly: 'We did the bits we could do. The rest is… clouds.', Cheeky: 'I didn’t control the weather and I feel fine.', Unfiltered: 'Did ours. Rest drifts.' },
        finCare: { Jolly: 'And for the facts, someone qualified can tell you where you stand.', Cheeky: 'For the real facts, ask someone qualified.', Unfiltered: 'Facts: ask someone qualified.' },
        cloudTap: { Jolly: 'Off you float.', Cheeky: 'Shoo, cloud.', Unfiltered: 'Drift.' }
      };

      /* ---------------- state ---------------- */
      const st = { phase: 'intro', finished: false, sorted: 0, sortedGen: 0, misses: 0, drag: null, hot: null, lockTray: false, twistOut: false, statOK: false, gardenOK: false, trayDirty: true, trayOK: false, trayA: 1,
        ripples: [], orbs: [], cards: [], cardOn: false, shakeT: 0, shakeA: 0, rakeT0: 0, rakeA: 0, firstCloud: false, firstLever: false, firstBridge: false, saidNotYet: false, said: {}, litN: 0, fn: 0, slow: 0, q: 1 };
      const M = { W: 0, H: 0 };
      const P = K.particles({ max: 380 });
      const MU = { on: false, next: 0, i: 0, bpm: 66, layers: 0, vol: 1 };

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: softwareGfx() ? 1.25 : 2 });
      const stat = document.createElement('canvas'), gcv = document.createElement('canvas'), scv = document.createElement('canvas');
      const sand = h('div', { class: 'cc-sand', 'aria-hidden': 'true' });
      const layer = h('div');
      const hud = h('div', { class: 'cc-hud', role: 'status', 'aria-live': 'off' });
      const hS = h('span', { class: 'cc-sorted', html: ICON.stone }), hL = h('span', { class: 'cc-hl', html: ICON.lever }), hB = h('span', { class: 'cc-hb', html: ICON.bridge }), hC = h('span', { class: 'cc-hc', html: ICON.cloud });
      [hS, hL, hB, hC].forEach(x => x.append(h('b')));
      hud.append(hS, h('i'), hL, hB, hC);
      const RING = { control: { name: 'Control', icon: ICON.lever }, influence: { name: 'Influence', icon: ICON.bridge }, notmine: { name: 'Not mine', icon: ICON.cloud } };
      Object.keys(RING).forEach(k => { RING[k].el = h('div', { class: 'cc-ring', 'aria-hidden': 'true', html: RING[k].icon }); RING[k].el.append(h('span', { text: RING[k].name })); });
      const card = h('div', { class: 'cc-card', role: 'status' }, h('small', { html: ICON.lever + '<span>Lever on</span>' }), h('span'));
      const plan = h('div', { class: 'cc-plan', role: 'status' });
      el.append(sand, layer, RING.notmine.el, RING.influence.el, RING.control.el, hud, card, plan);
      const still = K.character('still', { side: 'above', mood: 'calm', x: 12, y: 600, size: 56 });
      const patch = K.character('patch', { side: 'above', mood: 'neutral', x: 160, y: 600, size: 56, voice: 600 });
      const rush = K.character('rush', { side: 'above', mood: 'worried', x: 300, y: 600, size: 56, voice: 700 });
      function say(c, line, o) { if (!line) return; if (!M.side) [still, patch, rush].forEach(x => { if (x !== c) x.hush(); }); c.say(line, o); }

      /* ---------------- stones ---------------- */
      let sid = 0;
      const stones = [];
      function mkStone(o) {
        const s = Object.assign({ uid: ++sid, state: 'wait', x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, lift: 0, rot: 0, rv: 0, sq: 0, sqv: 0, tries: 0, ring: null, gu: 0, gv: 0, alpha: 1, crack: 0, taps: 0,
          lever: null, bk: 0, t0: 0, sp: null, spKey: '', ox: 0, oy: 0, first: null }, o);
        s.size = o.big ? 1.42 : o.pebble ? 0.6 : 1;
        s.seed = 101 + sid * 37;
        s.el = h('button', { type: 'button', class: 'cc-stone', hidden: true, 'aria-label': (o.big ? 'The big stone: ' : 'Worry stone: ') + o.label + '. Drag it into a ring.' });
        const dark = lum(stoneType.col) > 0.55;
        s.lab = h('div', { class: 'cc-lab' + (dark ? ' dark' : ''), 'aria-hidden': 'true' });
        if (o.user) s.lab.append(h('span', { class: 'gk-user', text: o.label }));
        else { if (o.example) s.lab.append(h('small', { text: 'For example' })); s.lab.append(h('span', { text: o.label })); }
        s.lab.style.opacity = '0';
        layer.append(s.el, s.lab);
        bindStone(s);
        stones.push(s);
        return s;
      }
      ORDER.forEach(id => mkStone(Object.assign({ id }, LIB[id])));
      const twist = mkStone({ id: 't', kind: 'twist', label: twistText, user: userTwist, example: !userTwist, act: ACT.prepare, big: true });
      let pebble = null;
      const isGen = (s) => s.kind !== 'twist' && !s.pebble;

      /* ---------------- layout ---------------- */
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        M.W = W; M.H = H; M.phone = W < 700; M.side = W >= 900 && H >= 600;
        const k = M.k = M.side ? clamp(Math.min(W / 1100, H / 800), 1, 1.3) : clamp(Math.min(W / 390, H / 760), 0.86, 1.2);
        M.sw = Math.round(82 * k); M.sh = Math.round(M.sw * 0.66);
        M.csz = M.side ? 96 : Math.round(56 * clamp(k, 0.92, 1.1));
        const top = 100, trayN = ORDER.length;
        M.rows = !M.side && trayN > 4 ? 2 : 1;
        const trayH = M.rows * (M.sh + 14) + 18;
        if (M.side) {
          M.rx = Math.round(clamp(W * 0.22, 230, 300)); M.ry = Math.round(M.rx * 0.78);
          const free = H - top - trayH - 40;
          M.ry = Math.min(M.ry, Math.round((free - 84) / 2)); M.rx = Math.round(M.ry / 0.78);
          M.cx = Math.round(W / 2); M.cy = Math.round(top + 84 + M.ry);
          const tw = Math.min(W * 0.6, 820);
          M.tray = { x: Math.round(M.cx - tw / 2), w: Math.round(tw), y: Math.round(M.cy + M.ry + 20), h: trayH };
        } else {
          M.rx = Math.round(Math.min(W / 2 - 14, 200 * k)); M.ry = Math.round(M.rx * 0.78);
          const charTop = H - 14 - M.csz, avail = charTop - top - trayH - 18;
          M.ry = Math.max(90, Math.min(M.ry, Math.round((avail - 60 - 96) / 2))); M.rx = Math.min(M.rx, Math.round(M.ry / 0.78));
          const spare = Math.max(0, avail - 2 * M.ry - 60 - 96);
          M.cx = Math.round(W / 2); M.cy = Math.round(top + 60 + spare * 0.42 + M.ry);
          M.tray = { x: 10, w: W - 20, y: Math.round(M.cy + M.ry + 14), h: trayH };
          M.charTop = charTop;
        }
        // where the lights go: one district per lever, with a garden path to each
        const nL = leverCount();
        if (M.side) {
          const west = { x: Math.round((M.cx - M.rx) * 0.45), y: M.cy }, east = { x: Math.round(W - (W - M.cx - M.rx) * 0.45), y: M.cy }, north = { x: M.cx, y: Math.round((top + M.cy - M.ry) / 2) + 4 };
          M.anchors = nL >= 3 ? [west, north, east] : [west, east];
        } else {
          const ny = Math.round((top + M.cy - M.ry) / 2) + 6, sy = Math.round((M.tray.y + M.tray.h + M.charTop) / 2);
          M.anchors = nL >= 3 ? [{ x: Math.round(W * 0.23), y: ny }, { x: Math.round(W * 0.77), y: ny }, { x: Math.round(W * 0.5), y: sy }] : [{ x: Math.round(W * 0.5), y: ny }, { x: Math.round(W * 0.5), y: sy }];
        }
        M.paths = M.anchors.map(a => { const ang = Math.atan2((a.y - M.cy) / M.ry, (a.x - M.cx) / M.rx), e = { x: M.cx + Math.cos(ang) * M.rx * 1.06, y: M.cy + Math.sin(ang) * M.ry * 1.07 }; return { ang, e, a, lan: [] }; });
        M.paths.forEach(p => { const d = Math.hypot(p.a.x - p.e.x, p.a.y - p.e.y), n = Math.max(1, Math.floor(d / (34 * k))); for (let i = 1; i <= n; i++) { const u = i / (n + 0.6), x = lerp(p.e.x, p.a.x, u), y = lerp(p.e.y, p.a.y, u), nx = -(p.a.y - p.e.y) / d, ny = (p.a.x - p.e.x) / d, sd = i % 2 ? 1 : -1; p.lan.push({ x: x + nx * sd * 11 * k, y: y + ny * sd * 11 * k, lit: 0 }); } });
        buildTown();
        // ring labels on the far side of each band
        const ry = M.ry;
        place(RING.notmine.el, M.cx, M.cy - ry * (F2 + 1) / 2 - 1);
        place(RING.influence.el, M.cx, M.cy - ry * (F1 + F2) / 2);
        place(RING.control.el, M.cx, M.cy - ry * F1 * 0.62);
        Object.assign(sand.style, { left: (M.cx - M.rx) + 'px', top: (M.cy - M.ry) + 'px', width: (M.rx * 2) + 'px', height: (M.ry * 2) + 'px' });
        // characters
        if (M.side) {
          const sz = M.csz, gx0 = M.cx - M.rx - 24, bub = Math.round(clamp(gx0 - 36 - sz - 14, 170, 300));
          [still, patch, rush].forEach(c => { c.el.style.setProperty('--sz', sz + 'px'); c.el.style.setProperty('--cc-bub', bub + 'px'); c.el.classList.remove('cc-rr', 'cc-mid'); });
          still.place(36, Math.round(M.cy - M.ry * 0.62)); still.side('right');
          patch.place(36, Math.round(M.cy + M.ry * 0.28)); patch.side('right');
          rush.place(W - 36 - sz, Math.round(M.cy - M.ry * 0.25)); rush.side('left');
        } else {
          const sz = M.csz, y = H - 14 - sz;
          [still, patch, rush].forEach(c => { c.el.style.setProperty('--sz', sz + 'px'); c.el.style.setProperty('--cc-bub', Math.round(Math.min(300, W - 24)) + 'px'); c.side('above'); });
          still.place(12, y); patch.place(Math.round(W / 2 - sz / 2), y); rush.place(W - 12 - sz, y);
          rush.el.classList.add('cc-rr'); patch.el.classList.add('cc-mid'); patch.el.style.setProperty('--cc-bh', Math.round(Math.min(150, W / 2 - 14)) + 'px');
        }
        st.statOK = false; st.gardenOK = false; st.trayDirty = true; st.trayOK = false;
        stones.forEach(s => { s.sp = null; });
        clouds.forEach(c => { c.sp = null; });
        if (card.classList.contains('on')) placeCard();
        if (plan.classList.contains('on')) placePlan();
        scv.width = 0; // scuffs are dropped on a new layout
      }
      function place(e, x, y) { e.style.left = Math.round(x) + 'px'; e.style.top = Math.round(y) + 'px'; }
      function leverCount() { return ORDER.filter(id => LIB[id].kind === 'control').length + 1; }

      /* ---------------- the miniature town ---------------- */
      let town = { items: [], houses: [] };
      function buildTown() {
        const W = M.W, H = M.H, k = M.k, R = K.rng(7 + Math.round(W) * 3 + Math.round(H)), items = [], houses = [];
        const cell = (M.side ? 54 : 46) * k, rowH = cell * 0.78;
        const segD = (x, y, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, u = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1); return Math.hypot(x - (a.x + dx * u), y - (a.y + dy * u)); };
        const blocked = (x, y, m) => {
          if (y < 60 + m || y > H - 6) return true;
          if (Math.abs(x - W / 2) < 150 && y < 104 + m) return true;
          const u = (x - M.cx) / (M.rx * 1.1 + m), v = (y - M.cy) / (M.ry * 1.12 + m); if (u * u + v * v < 1) return true;
          const T = M.tray; if (x > T.x - m && x < T.x + T.w + m && y > T.y - m - 8 && y < T.y + T.h + m) return true;
          if (!M.side && y > M.charTop - 8) return true;
          if (M.paths.some(p => segD(x, y, p.e, { x: p.a.x + (p.a.x - p.e.x) * 0.25, y: p.a.y + (p.a.y - p.e.y) * 0.25 }) < 14 * k + m)) return true;
          return false;
        };
        // houses gather into one district per lever (each lights up as a whole), with orchards and open meadow between
        const reach = (M.side ? 175 : 150) * k;
        for (let y = 70; y < H; y += rowH) {
          const off = (Math.round(y / rowH) % 2) * cell * 0.5;
          for (let x = -cell * 0.3 + off; x < W + cell * 0.3; x += cell) {
            const jx = x + (R() - 0.5) * cell * 0.35, jy = y + (R() - 0.5) * rowH * 0.3, r0 = R();
            const da = Math.min(...M.anchors.map(a => Math.hypot(jx - a.x, (jy - a.y) * 1.25))) / reach, pH = clamp(0.92 - da * 0.62, 0.1, 0.86);
            const r = r0 < pH ? r0 * 0.6 / pH : r0 < pH + (1 - pH) * 0.4 ? 0.6 + (r0 - pH) / ((1 - pH) * 0.4) * 0.24 : r0 < pH + (1 - pH) * 0.46 ? 0.86 : 0.95;
            if (r < 0.6) {
              const w = (25 + R() * 12) * k;
              if (blocked(jx, jy, w * 0.45)) continue;
              const hs = { t: 'house', x: jx, y: jy, w, d: (9 + R() * 4) * k, rh: (11 + R() * 4) * k, roof: season.roofs[Math.floor(R() * season.roofs.length)], wall: mixC(season.wall, '#d8c9ad', R() * 0.4), wins: 1 + Math.floor(R() * 3), litAt: 0, ph: R() * 6 };
              items.push(hs); houses.push(hs);
            } else if (r < 0.84) { if (!blocked(jx, jy, 10 * k)) items.push({ t: 'tree', x: jx, y: jy, r: (9 + R() * 6) * k, c: season.canopy[Math.floor(R() * season.canopy.length)], ph: R() * 6 }); }
            else if (r < 0.9) { if (!blocked(jx, jy, 6 * k)) items.push({ t: 'lantern', x: jx, y: jy, litAt: 0 }); }
          }
        }
        // landmarks that appear as you keep coming back (the town grows; nothing is ever taken away)
        const marks = [];
        if (visits >= 1) marks.push('tea'); if (visits >= 3) marks.push('pagoda'); if (visits >= 5) marks.push('pond');
        marks.forEach((m, i) => { const a = M.anchors[i % M.anchors.length]; let best = null, bd = 1e9; houses.forEach(hs => { if (hs.mark) return; const d = Math.hypot(hs.x - a.x, hs.y - a.y); if (d < bd) { bd = d; best = hs; } }); if (best) { best.mark = m; if (m === 'tea') best.w *= 1.35; } });
        houses.forEach(hs => { let bi = 0, bd = 1e9; M.anchors.forEach((a, i) => { const d = Math.hypot(hs.x - a.x, hs.y - a.y); if (d < bd) { bd = d; bi = i; } }); hs.dist = bi; hs.dd = bd; });
        items.filter(o => o.t === 'lantern').forEach(o => { let bi = 0, bd = 1e9; M.anchors.forEach((a, i) => { const d = Math.hypot(o.x - a.x, o.y - a.y); if (d < bd) { bd = d; bi = i; } }); o.dist = bi; o.dd = bd; });
        items.sort((a, b) => a.y - b.y);
        // keep what was already lit when the screen changes shape
        (town.litDistricts || []).forEach(d => items.forEach(o => { if (o.dist === d && (o.t === 'house' || o.t === 'lantern')) o.litAt = 1; }));
        town = { items, houses, litDistricts: town.litDistricts || [] };
        M.marks = marks;
      }

      /* ---------------- static paint: ground, paths, town, tray (cached; repainted on resize or theme) ---------------- */
      function renderStatic() {
        const W = M.W, H = M.H, k = M.k, dp = cv.dpr || 1, br = bright();
        stat.width = Math.max(2, Math.round(W * dp)); stat.height = Math.max(2, Math.round(H * dp));
        const g = stat.getContext('2d', { alpha: false }); g.setTransform(dp, 0, 0, dp, 0, 0);
        let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, shade(season.ground, 1.04)); gr.addColorStop(1, season.ground2); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        const R = K.rng(91);
        for (let i = 0; i < Math.round(W * H / 900); i++) { g.fillStyle = R() < 0.5 ? rgba(season.moss, 0.5) : rgba(shade(season.ground2, 0.8), 0.35); const x = R() * W, y = R() * H, r = (0.8 + R() * 2.2) * k; g.beginPath(); g.ellipse(x, y, r * 1.6, r, 0, 0, TAU); g.fill(); }
        // gravel paths from the garden to each district
        M.paths.forEach(p => {
          const ex = { x: p.a.x + (p.a.x - p.e.x) * 0.25, y: p.a.y + (p.a.y - p.e.y) * 0.25 };
          g.lineCap = 'round';
          g.strokeStyle = rgba(shade(season.ground2, 0.7), 0.6); g.lineWidth = 17 * k; g.beginPath(); g.moveTo(p.e.x, p.e.y); g.lineTo(ex.x, ex.y); g.stroke();
          g.strokeStyle = season.snow ? '#eef2f6' : '#d8ceb5'; g.lineWidth = 13 * k; g.beginPath(); g.moveTo(p.e.x, p.e.y); g.lineTo(ex.x, ex.y); g.stroke();
          const d = Math.hypot(ex.x - p.e.x, ex.y - p.e.y), n = Math.floor(d / (9 * k)), RR = K.rng(5 + Math.round(p.ang * 100));
          for (let i = 0; i < n; i++) { const u = i / n, x = lerp(p.e.x, ex.x, u) + (RR() - 0.5) * 8 * k, y = lerp(p.e.y, ex.y, u) + (RR() - 0.5) * 6 * k; g.fillStyle = RR() < 0.5 ? 'rgba(120,105,80,0.35)' : 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(x, y, 2.2 * k, 1.5 * k, 0, 0, TAU); g.fill(); }
          p.lan.forEach(l => drawStoneLantern(g, l.x, l.y, k));
        });
        town.items.forEach(o => { if (o.t === 'house') drawHouse(g, o, k); else if (o.t === 'tree') drawTree(g, o, k); else drawStoneLantern(g, o.x, o.y, k); });
        // light and mood: moonlit night in dark, late gold in bright (the garden keeps its own light)
        grade(g, br, 0, 0, W, H);
        st.statOK = true;
      }
      function grade(g, br, x, y, w, hh) {
        g.globalCompositeOperation = 'multiply'; g.fillStyle = br ? '#fff1dc' : '#56659a'; g.fillRect(x, y, w, hh); g.globalCompositeOperation = 'source-over';
        const gr = g.createRadialGradient(M.cx, M.cy, M.rx * 0.6, M.cx, M.cy, Math.hypot(M.W, M.H) * 0.62); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, br ? 'rgba(70,50,20,0.18)' : 'rgba(5,8,25,0.5)'); g.fillStyle = gr; g.fillRect(x, y, w, hh);
      }
      /* the tray: a little wooden deck at the garden's edge where the stones wait (its own layer, so it can sink away once they're sorted) */
      const trayC = document.createElement('canvas');
      function renderTray() {
        const T = M.tray, k = M.k, dk = 7 * k, pad = Math.ceil(16 * k), dp = cv.dpr || 1, w = T.w + pad * 2, hh = T.h + dk + pad * 2;
        trayC.width = Math.max(2, Math.ceil(w * dp)); trayC.height = Math.max(2, Math.ceil(hh * dp));
        const g = trayC.getContext('2d'); g.setTransform(dp, 0, 0, dp, 0, 0); g.clearRect(0, 0, w, hh); g.translate(pad - T.x, pad - T.y);
        g.fillStyle = 'rgba(20,16,10,0.28)'; g.beginPath(); g.ellipse(T.x + T.w / 2, T.y + T.h + dk, T.w * 0.52, 10 * k, 0, 0, TAU); g.fill();
        g.fillStyle = '#5a3d27'; g.beginPath(); g.roundRect(T.x, T.y + dk, T.w, T.h, 10 * k); g.fill();
        const gr = g.createLinearGradient(0, T.y, 0, T.y + T.h); gr.addColorStop(0, '#b98a5c'); gr.addColorStop(1, '#9a6e46'); g.fillStyle = gr; g.beginPath(); g.roundRect(T.x, T.y, T.w, T.h, 10 * k); g.fill();
        g.strokeStyle = 'rgba(70,45,25,0.35)'; g.lineWidth = 1; for (let y = T.y + 12 * k; y < T.y + T.h - 4; y += 13 * k) { g.beginPath(); g.moveTo(T.x + 6, y); g.lineTo(T.x + T.w - 6, y); g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(T.x + 8, T.y + 2, T.w - 16, 1.5);
        g.save(); g.beginPath(); g.roundRect(T.x, T.y, T.w, T.h + dk, 10 * k); g.clip(); grade(g, bright(), T.x - 2, T.y - 2, T.w + 4, T.h + dk + 4); g.restore(); // the same grade as the ground, on the deck only
        M.trayPad = pad; st.trayOK = true;
      }
      function drawHouse(g, o, k) {
        const { x, y, w, d, rh } = o, roof = o.mark === 'pagoda' ? '#7a3a2c' : o.roof, wood = season.wood;
        g.fillStyle = 'rgba(20,25,18,0.28)'; poly(g, [x - w / 2, y, x + w / 2, y, x + w / 2 + 9 * k, y - 5 * k, x - w / 2 + 9 * k, y - 5 * k]); g.fill();
        if (o.mark === 'pagoda') { // three tiers
          for (let i = 0; i < 3; i++) { const ww = w * (1 - i * 0.22), yy = y - i * (d + rh * 0.7); g.fillStyle = o.wall; g.fillRect(x - ww * 0.36, yy - d, ww * 0.72, d); roofShape(g, x, yy - d, ww * 1.05, rh * 0.8, roof, k); }
          g.strokeStyle = '#3a2a20'; g.lineWidth = 1.4 * k; g.beginPath(); g.moveTo(x, y - 3 * (d + rh * 0.7) + rh * 0.2); g.lineTo(x, y - 3 * (d + rh * 0.7) - 6 * k); g.stroke();
          o.winY = [y - d * 0.55]; o.winX = [x - w * 0.12, x + w * 0.12]; return;
        }
        g.fillStyle = o.wall; g.fillRect(x - w / 2, y - d, w, d);
        g.fillStyle = wood; g.fillRect(x - w / 2, y - 1.6 * k, w, 1.6 * k); g.fillRect(x - w / 2, y - d, 1.6 * k, d); g.fillRect(x + w / 2 - 1.6 * k, y - d, 1.6 * k, d);
        o.winX = []; o.winY = [y - d * 0.56];
        for (let i = 0; i < o.wins; i++) { const wx = x - w / 2 + (i + 0.5) * w / o.wins; o.winX.push(wx); g.fillStyle = '#4a4038'; g.fillRect(wx - 2.6 * k, y - d * 0.78, 5.2 * k, d * 0.46); g.fillStyle = wood; g.fillRect(wx - 0.4 * k, y - d * 0.78, 0.8 * k, d * 0.46); }
        roofShape(g, x, y - d, w, rh, roof, k);
        if (o.mark === 'tea') { g.strokeStyle = '#3a2a20'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x - w / 2 - 6 * k, y - d - 2 * k); g.quadraticCurveTo(x, y - d + 5 * k, x + w / 2 + 6 * k, y - d - 2 * k); g.stroke(); o.tea = true; }
      }
      function roofShape(g, x, ey, w, rh, roof, k) {
        const ov = 4 * k, e0 = x - w / 2 - ov, e1 = x + w / 2 + ov, r0 = x - w * 0.22, r1 = x + w * 0.22, top = ey - rh;
        g.fillStyle = shade(roof, 1.18); poly(g, [r0, top, r1, top, r1 - w * 0.06, top - rh * 0.32, r0 + w * 0.06, top - rh * 0.32]); g.fill();
        g.fillStyle = roof; g.beginPath(); g.moveTo(e0 - 2 * k, ey - 2.5 * k); g.quadraticCurveTo(x, ey + 2 * k, e1 + 2 * k, ey - 2.5 * k); g.lineTo(r1, top); g.lineTo(r0, top); g.closePath(); g.fill();
        g.strokeStyle = shade(roof, 0.72); g.lineWidth = 1; g.beginPath(); for (let i = 1; i < 6; i++) { const u = i / 6; g.moveTo(lerp(e0, e1, u), ey + 0.5 * k); g.lineTo(lerp(r0, r1, u), top + 1); } g.stroke();
        g.strokeStyle = shade(roof, 0.55); g.lineWidth = 1.6 * k; g.beginPath(); g.moveTo(e0 - 2 * k, ey - 2.5 * k); g.quadraticCurveTo(x, ey + 2 * k, e1 + 2 * k, ey - 2.5 * k); g.stroke();
        g.strokeStyle = shade(roof, 1.3); g.lineWidth = 1.2 * k; g.beginPath(); g.moveTo(r0, top); g.lineTo(r1, top); g.stroke();
      }
      function drawTree(g, o, k) {
        const { x, y, r } = o;
        g.fillStyle = 'rgba(20,25,18,0.3)'; g.beginPath(); g.ellipse(x + 6 * k, y + 1, r * 1.05, r * 0.42, 0, 0, TAU); g.fill();
        g.fillStyle = season.trunk; g.fillRect(x - 1.6 * k, y - r * 0.7, 3.2 * k, r * 0.72);
        if (season.snow) { // snowy pines
          for (let i = 0; i < 3; i++) { const yy = y - r * (0.5 + i * 0.55), ww = r * (1.1 - i * 0.28); g.fillStyle = o.c; poly(g, [x - ww, yy, x + ww, yy, x, yy - r * 0.8]); g.fill(); g.fillStyle = '#f4f7fb'; poly(g, [x - ww * 0.55, yy - r * 0.32, x + ww * 0.55, yy - r * 0.32, x, yy - r * 0.8]); g.fill(); }
          return;
        }
        [[-0.42, -0.95, 0.72], [0.4, -0.92, 0.7], [0, -1.32, 0.78]].forEach(([dx, dy, s]) => { g.fillStyle = shade(o.c, 0.84); g.beginPath(); g.arc(x + dx * r, y + dy * r + 1.5 * k, r * s, 0, TAU); g.fill(); });
        [[-0.42, -0.95, 0.66], [0.4, -0.92, 0.64], [0, -1.32, 0.72]].forEach(([dx, dy, s]) => { g.fillStyle = o.c; g.beginPath(); g.arc(x + dx * r, y + dy * r, r * s, 0, TAU); g.fill(); });
        g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.arc(x - r * 0.25, y - r * 1.55, r * 0.28, 0, TAU); g.fill();
      }
      function drawStoneLantern(g, x, y, k) {
        g.fillStyle = 'rgba(20,25,18,0.3)'; g.beginPath(); g.ellipse(x + 3 * k, y + 1, 5 * k, 2 * k, 0, 0, TAU); g.fill();
        g.fillStyle = '#8d8a84'; g.fillRect(x - 1.8 * k, y - 8 * k, 3.6 * k, 8 * k);
        g.fillStyle = '#a7a39b'; g.fillRect(x - 3.6 * k, y - 13 * k, 7.2 * k, 5.5 * k);
        g.fillStyle = '#3e3a36'; g.fillRect(x - 1.6 * k, y - 12 * k, 3.2 * k, 3 * k);
        g.fillStyle = '#7a776f'; poly(g, [x - 5 * k, y - 13 * k, x + 5 * k, y - 13 * k, x, y - 17 * k]); g.fill();
      }

      /* ---------------- the garden: raked sand, three rings, ripples around every placed stone ---------------- */
      const GS = () => (bright() ? { sand: '#ece2c8', sandD: '#d8caa6', dk: 'rgba(112,88,52,0.30)', lt: 'rgba(255,255,255,0.6)', bd: 'rgba(92,70,40,0.55)', ctl: 'rgba(255,190,80,0.14)', out: 'rgba(110,140,200,0.10)' }
        : { sand: '#a9adbd', sandD: '#8c90a3', dk: 'rgba(28,32,58,0.42)', lt: 'rgba(230,236,255,0.32)', bd: 'rgba(18,22,44,0.62)', ctl: 'rgba(255,205,120,0.15)', out: 'rgba(150,170,235,0.10)' });
      function gardenPad() { return Math.round(26 * M.k); }
      function renderGarden() {
        const rx = M.rx, ry = M.ry, pad = gardenPad(), bw = rx * 2 + pad * 2, bh = ry * 2 + pad * 2, dp = cv.dpr || 1, C = GS();
        M.gb = { x: M.cx - rx - pad, y: M.cy - ry - pad, w: bw, h: bh };
        gcv.width = Math.round(bw * dp); gcv.height = Math.round(bh * dp);
        if (scv.width !== gcv.width || scv.height !== gcv.height) { scv.width = gcv.width; scv.height = gcv.height; }
        const g = gcv.getContext('2d'); g.setTransform(dp, 0, 0, dp, 0, 0); g.clearRect(0, 0, bw, bh); g.translate(rx + pad, ry + pad);
        g.fillStyle = 'rgba(10,10,20,0.35)'; g.beginPath(); g.ellipse(4, 7 * M.k, rx * 1.08, ry * 1.09, 0, 0, TAU); g.fill();
        const gr = g.createRadialGradient(-rx * 0.2, -ry * 0.35, 8, 0, 0, rx * 1.05); gr.addColorStop(0, shade(C.sand, 1.06)); gr.addColorStop(1, C.sandD);
        g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
        g.fillStyle = C.ctl; g.beginPath(); g.ellipse(0, 0, rx * F1, ry * F1, 0, 0, TAU); g.fill();
        g.fillStyle = C.out; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.ellipse(0, 0, rx * F2, ry * F2, 0, 0, TAU); g.fill('evenodd');
        for (let r = 0.055; r < 0.985; r += 0.031) {
          if (Math.abs(r - F1) < 0.018 || Math.abs(r - F2) < 0.018) continue;
          g.lineWidth = 1; g.strokeStyle = C.dk; g.beginPath(); g.ellipse(0, 0.7, rx * r, ry * r, 0, 0, TAU); g.stroke();
          g.strokeStyle = C.lt; g.beginPath(); g.ellipse(0, -0.6, rx * r, ry * r, 0, 0, TAU); g.stroke();
        }
        [F1, F2].forEach(f => { g.strokeStyle = C.bd; g.lineWidth = 2.6; g.beginPath(); g.ellipse(0, 1, rx * f, ry * f, 0, 0, TAU); g.stroke(); g.strokeStyle = C.lt; g.lineWidth = 1.3; g.beginPath(); g.ellipse(0, -1.2, rx * f, ry * f, 0, 0, TAU); g.stroke(); });
        // every stone that stays in the sand gets its own raked ripples
        stones.forEach(s => {
          if (!(s.state === 'lever' || s.state === 'bridge' || s.state === 'placed')) return;
          const px = s.gu * rx, py = s.gv * ry, R0 = stoneW(s) * (s.state === 'lever' ? 0.44 : 0.52);
          g.save(); g.beginPath(); g.ellipse(px, py, R0 * 1.75, R0 * 1.75 * 0.8, 0, 0, TAU); g.fillStyle = gr; g.fill(); if (s.ring === 'control') { g.fillStyle = C.ctl; g.fill(); }
          for (let i = 1; i <= 3; i++) { const rr = R0 * (0.95 + i * 0.26); g.lineWidth = 1; g.strokeStyle = C.dk; g.beginPath(); g.ellipse(px, py + 0.7, rr, rr * 0.8, 0, 0, TAU); g.stroke(); g.strokeStyle = C.lt; g.beginPath(); g.ellipse(px, py - 0.6, rr, rr * 0.8, 0, 0, TAU); g.stroke(); }
          g.restore();
        });
        // the stone border, back half first so the front cobbles overlap the sand edge
        const n = Math.round((rx + ry) * 0.17), RR = K.rng(19), cob = bright() ? ['#8c8a84', '#a19d94', '#77746e'] : ['#5d6070', '#6c6f80', '#4f5262'];
        for (let i = 0; i < n; i++) {
          const a = i / n * TAU + RR() * 0.05, x = Math.cos(a) * rx * 1.035, y = Math.sin(a) * ry * 1.045, s2 = (5 + RR() * 3) * M.k, c = cob[Math.floor(RR() * 3)];
          g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x + 1, y + s2 * 0.45, s2 * 1.05, s2 * 0.55, 0, 0, TAU); g.fill();
          g.fillStyle = c; g.beginPath(); g.ellipse(x, y, s2 * 1.12, s2 * 0.78, a * 0.3, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(x - s2 * 0.3, y - s2 * 0.3, s2 * 0.42, s2 * 0.24, 0, 0, TAU); g.fill();
        }
        st.gardenOK = true;
      }
      function bandPath(g, ring) {
        const f0 = ring === 'control' ? 0 : ring === 'influence' ? F1 : F2, f1 = ring === 'control' ? F1 : ring === 'influence' ? F2 : 1;
        g.beginPath(); g.ellipse(M.cx, M.cy, M.rx * f1, M.ry * f1, 0, 0, TAU); if (f0) g.ellipse(M.cx, M.cy, M.rx * f0, M.ry * f0, 0, 0, TAU);
      }
      function ringAt(x, y) { const u = (x - M.cx) / M.rx, v = (y - M.cy) / M.ry, d = Math.sqrt(u * u + v * v); return d < F1 ? 'control' : d < F2 ? 'influence' : d < 1.03 ? 'notmine' : null; }
      function scuff(x0, y0, x1, y1, w) { // dragging a stone across the sand leaves a furrow (the rake smooths it at the end)
        if (!scv.width || !M.gb) return;
        const dp = cv.dpr || 1, g = scv.getContext('2d'); g.setTransform(dp, 0, 0, dp, 0, 0);
        const ox = M.gb.x, oy = M.gb.y, C = GS(), len = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
        g.save(); g.beginPath(); g.ellipse(M.cx - ox, M.cy - oy, M.rx * 0.985, M.ry * 0.985, 0, 0, TAU); g.clip();
        // three fine grooves, as if the stone's underside combed the sand: a shadowed lip and a lit one
        g.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          const o = i * w * 0.15, ax = x0 - ox + nx * o, ay = y0 - oy + ny * o, bx = x1 - ox + nx * o, by = y1 - oy + ny * o;
          g.lineWidth = 1.5; g.strokeStyle = bright() ? 'rgba(120,92,52,0.3)' : 'rgba(22,26,52,0.34)'; g.beginPath(); g.moveTo(ax, ay + 0.8); g.lineTo(bx, by + 0.8); g.stroke();
          g.lineWidth = 1; g.strokeStyle = C.lt; g.beginPath(); g.moveTo(ax, ay - 0.7); g.lineTo(bx, by - 0.7); g.stroke();
        }
        g.restore();
      }

      /* ---------------- sprites ---------------- */
      const stoneW = (s) => M.sw * s.size, stoneH = (s) => M.sh * s.size;
      function sprite(s) {
        const w = Math.round(stoneW(s)), hh = Math.round(stoneH(s)), key = w + 'x' + hh + (bright() ? 'b' : 'd');
        if (s.sp && s.spKey === key) return s.sp;
        const R = K.rng(s.seed), pad = 6, dpr = Math.min(2, cv.dpr || 1), c = document.createElement('canvas');
        c.width = Math.ceil((w + pad * 2) * dpr); c.height = Math.ceil((hh + pad * 2) * dpr);
        const g = c.getContext('2d'); g.scale(dpr, dpr); g.translate(pad + w / 2, pad + hh / 2);
        const col = s.kind === 'twist' ? mixC(stoneType.col, '#6a6258', 0.35) : bright() ? stoneType.col : shade(stoneType.col, 0.86), n = 10, pts = [];
        for (let i = 0; i < n; i++) { const a = i / n * TAU + (R() - 0.5) * 0.32, rf = 0.86 + R() * 0.15; pts.push([Math.cos(a) * w / 2 * rf, Math.sin(a) * hh / 2 * rf]); }
        const th = hh * 0.17;
        const path = (dy) => { g.beginPath(); const z = pts[n - 1], p0 = pts[0]; g.moveTo((z[0] + p0[0]) / 2, (z[1] + p0[1]) / 2 + dy); for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; g.quadraticCurveTo(p[0], p[1] + dy, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + dy); } g.closePath(); };
        g.save(); g.scale(1, (hh - th) / hh); g.translate(0, -th * 0.4);
        path(th * 1.15); g.fillStyle = shade(col, 0.58); g.fill();
        path(0); const gr = g.createRadialGradient(-w * 0.18, -hh * 0.3, 2, 0, 0, Math.max(w, hh) * 0.62); gr.addColorStop(0, shade(col, 1.3)); gr.addColorStop(0.55, col); gr.addColorStop(1, shade(col, 0.76)); g.fillStyle = gr; g.fill();
        path(0); g.clip();
        for (let i = 0; i < 30; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)'; g.beginPath(); g.arc((R() - 0.5) * w, (R() - 0.5) * hh, 0.6 + R() * 1.3, 0, TAU); g.fill(); }
        g.strokeStyle = 'rgba(255,255,255,0.38)'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(-w * 0.05, -hh * 0.05, w * 0.36, hh * 0.32, 0, Math.PI * 1.08, Math.PI * 1.62); g.stroke();
        g.restore();
        s.sp = { c, w: w + pad * 2, h: hh + pad * 2 }; s.spKey = key; s.crackPts = null;
        return s.sp;
      }
      const clouds = [];
      function cloudSprite(c) {
        const w = Math.round(c.w), hh = Math.round(c.h), key = w + 'x' + hh + (bright() ? 'b' : 'd');
        if (c.sp && c.spKey === key) return c.sp;
        const R = K.rng(c.seed), pad = 10, dpr = Math.min(2, cv.dpr || 1), cc = document.createElement('canvas');
        cc.width = Math.ceil((w + pad * 2) * dpr); cc.height = Math.ceil((hh + pad * 2) * dpr);
        const g = cc.getContext('2d'); g.scale(dpr, dpr); g.translate(pad + w / 2, pad + hh / 2);
        const puffs = [], n = 5 + Math.floor(w / 46);
        for (let i = 0; i < n; i++) { const u = i / (n - 1), x = (u - 0.5) * w * 0.8, r = hh * (0.3 + 0.2 * Math.sin(Math.PI * u)) * (0.86 + R() * 0.28); puffs.push([x, hh * 0.16 - r * 0.32, r]); }
        for (let i = 0; i < 3; i++) puffs.push([(R() - 0.5) * w * 0.44, -hh * 0.1 + (R() - 0.5) * 5, hh * (0.33 + R() * 0.09)]);
        const base = bright() ? '#ffffff' : '#e9e8f6', sh = bright() ? '#cfd3ea' : '#a9abcb';
        g.fillStyle = sh; puffs.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y + 3.5, r, 0, TAU); g.fill(); });
        const gr = g.createLinearGradient(0, -hh / 2, 0, hh / 2); gr.addColorStop(0, base); gr.addColorStop(1, mixC(base, sh, 0.35)); g.fillStyle = gr;
        puffs.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r * 0.95, 0, TAU); g.fill(); });
        c.sp = { c: cc, w: w + pad * 2, h: hh + pad * 2 }; c.spKey = key;
        return c.sp;
      }

      /* ---------------- sound ---------------- */
      const SFX = {
        clack(v) { if (!A.ctx) return; const t = A.now(); A.wood(t, 0.1 + 0.12 * (v || 0.5), 0.42 + Math.random() * 0.08); A.noise({ when: t, filter: 'highpass', freq: 3200, dur: 0.025, vol: 0.05 * (v || 0.5) }); },
        sand() { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: 1700 + Math.random() * 500, q: 0.6, dur: 0.28, attack: 0.06, vol: 0.05 }); },
        land(v) { if (!A.ctx) return; A.thud({ vol: 0.18 + 0.1 * (v || 0) }); SFX.sand(); },
        flute(n, when) { if (!A.ctx) return; const f = A.note(n), t = when || A.now(); A.tone({ when: t, type: 'sine', freq: f * 0.985, to: f, glide: 0.12, dur: 1.3, vol: 0.06, attack: 0.09, verb: 0.45 }); A.noise({ when: t, filter: 'bandpass', freq: f * 2, q: 7, dur: 0.5, attack: 0.08, vol: 0.012 }); },
        lever() { if (!A.ctx) return; A.boing({ freq: 520, vol: 0.05 }); A.wood(undefined, 0.16, 1.15); },
        bridge() { if (!A.ctx) return; const t = A.now(); A.tone({ type: 'triangle', freq: 320, to: 270, glide: 0.25, dur: 0.3, vol: 0.03, lp: 1200 }); ['F4', 'A4', 'C5'].forEach((n, i) => A.pluck(A.note(n), { when: t + 0.1 + i * 0.12, vol: 0.12, damp: 0.994, verb: 0.3 })); },
        cloud() { if (!A.ctx) return; A.noise({ filter: 'lowpass', freq: 900, to: 3200, dur: 1.4, attack: 0.55, vol: 0.06 }); A.chime(A.note('C6'), { vol: 0.05, dur: 2 }); },
        refuse() { if (!A.ctx) return; A.tone({ type: 'triangle', freq: 250, to: 150, glide: 0.22, dur: 0.3, vol: 0.07 }); A.wood(undefined, 0.1, 0.7); },
        rumble() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 48, to: 70, glide: 1.4, dur: 1.8, vol: 0.14, attack: 0.3 }); A.noise({ filter: 'lowpass', freq: 220, dur: 1.4, attack: 0.3, vol: 0.09 }); },
        crack(i) { if (!A.ctx) return; const t = A.now(); A.noise({ when: t, filter: 'highpass', freq: 2400 + i * 400, dur: 0.06, vol: 0.13 }); A.chime(A.note(['A5', 'C6', 'D6'][i % 3]), { when: t + 0.02, vol: 0.045, dur: 0.8 }); A.wood(t, 0.12, 0.55); },
        split() { if (!A.ctx) return; const t = A.now(); A.noise({ when: t, filter: 'bandpass', freq: 1800, q: 0.7, dur: 0.35, vol: 0.14 }); A.thud({ vol: 0.25 }); ['D6', 'A6', 'D7'].forEach((n, i) => A.chime(A.note(n), { when: t + 0.05 + i * 0.07, vol: 0.05, dur: 1.6 })); },
        ratchet() { if (!A.ctx) return; A.click({ vol: 0.07 }); A.wood(undefined, 0.04, 1.6); },
        clunk() { if (!A.ctx) return; A.thud({ vol: 0.38 }); A.wood(undefined, 0.24, 0.5); },
        orb() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 520, to: 1500, glide: 0.7, dur: 0.8, vol: 0.05, verb: 0.4 }); },
        tink(i, when) { if (!A.ctx) return; A.chime(A.note(PENT[Math.min(PENT.length - 1, i)]), { vol: 0.035, dur: 1.3, when }); },
        bell() { if (!A.ctx) return; A.chime(A.note('D3'), { vol: 0.16, dur: 5, verb: 0.65 }); A.chime(A.note('A3'), { when: A.now() + 0.02, vol: 0.06, dur: 4, verb: 0.65 }); },
        rake(ms) { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: 900, to: 2300, q: 0.5, dur: ms / 1000, attack: 0.35, vol: 0.07 }); },
        whoosh() { if (!A.ctx) return; A.whoosh({ vol: 0.07, dur: 0.6 }); }
      };
      function gridT(div) { if (!A.ctx) return 0; const t = A.now() + 0.015; if (!MU.on) return t; const bl = 60 / MU.bpm / (div || 2); let q = MU.next; while (q - bl > t) q -= bl; while (q < t) q += bl; return q; }
      /* music: a slow koto line over a D drone, filling in as the garden settles */
      const KOTO = ['D4', 'F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'A5'], PAT = [0, 2, 4, 3, 5, 4, 2, 1, 0, 3, 5, 7, 6, 4, 3, 2];
      function musicOn() { if (!A.ctx || MU.on) return; MU.on = true; MU.next = A.now() + 0.2; }
      S.on('audio-ready', musicOn);
      K.loop(() => {
        if (!MU.on || !A.ctx) return;
        const ahead = A.now() + 0.25, beat = 60 / MU.bpm;
        while (MU.next < ahead) {
          const time = MU.next, i = MU.i, b = i % 4, bar = Math.floor(i / 4), v = MU.vol, lay = MU.layers;
          if (b === 0) { A.tone({ when: time, type: 'triangle', freq: A.note(bar % 2 ? 'A2' : 'D2'), dur: beat * 3.9, vol: 0.05 * v, attack: 0.5, lp: 480, bus: 'music' }); A.tone({ when: time, type: 'sine', freq: A.note('D3'), dur: beat * 3.9, vol: 0.025 * v, attack: 0.7, bus: 'music' }); }
          const n1 = KOTO[PAT[(i * 2) % 16]], n2 = KOTO[PAT[(i * 2 + 1) % 16]];
          if (b % 2 === 0 || lay >= 1) A.pluck(A.note(n1), { when: time, vol: 0.085 * v, damp: 0.993, verb: 0.35, bus: 'music' });
          if (lay >= 1) A.pluck(A.note(n2), { when: time + beat / 2, vol: 0.055 * v, damp: 0.992, verb: 0.35, bus: 'music' });
          if (lay >= 2 && inten > 0 && b === 0) A.drum(time, 0.1 * v, 0.62, 0.08);
          if (lay >= 2 && inten > 0 && b === 2) A.wood(time, 0.04 * v, 0.9);
          if (lay >= 3 && i % 8 === 0) A.chime(A.note(i % 16 === 0 ? 'D6' : 'A5'), { when: time, vol: 0.03 * v, dur: 2.4, bus: 'music' });
          MU.i++; MU.next += beat;
        }
      });
      const amb = K.ambience(bright() ? 'dawn' : 'prairie'); amb.level(0.35, 1.5);

      /* ---------------- input: stones ---------------- */
      function bindStone(s) {
        K.drag(s.el, {
          space: el,
          start: (p) => {
            if (s.state === 'cracked') return false;
            if (st.phase !== 'sort' || s.state !== 'tray' || st.lockTray) { if (s.state === 'tray') { s.rv += 4; s.sqv -= 2; SFX.clack(0.25); } return false; }
            s.state = 'drag'; st.drag = { s, ox: p.x - s.x, oy: p.y - s.y, lx: s.x, ly: s.y, ring: null };
            s.sqv -= 2.4; SFX.clack(0.7); K.guide(null); S.buzz(6);
          },
          move: (p) => {
            const d = st.drag; if (!d || d.s !== s) return;
            s.tx = p.x - d.ox; s.ty = p.y - d.oy - 10 * M.k;
            const r = ringAt(s.tx, s.ty + stoneH(s) * 0.2);
            if (r !== d.ring) { d.ring = r; setHot(r); if (r) SFX.flute({ control: 'D5', influence: 'A4', notmine: 'F5' }[r]); }
            const dd = Math.hypot(s.x - d.lx, s.y - d.ly);
            if (dd > 12 * M.k) { if (ringAt(s.x, s.y + stoneH(s) * 0.25)) { scuff(d.lx, d.ly + stoneH(s) * 0.25, s.x, s.y + stoneH(s) * 0.25, stoneW(s)); if (!RM() && Math.random() < 0.5) P.emit('dust', s.x, s.y + stoneH(s) * 0.3, 1, { colors: [rgba(GS().sand, 0.7)] }); } d.lx = s.x; d.ly = s.y; }
          },
          end: () => { const d = st.drag; if (!d || d.s !== s) return; st.drag = null; setHot(null); drop(s, s.tx, s.ty + stoneH(s) * 0.2); }
        });
        K.tap(s.el, () => { if (s.state === 'cracked') tapSplit(s); });
        S.listen(s.el, 'keydown', (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault();
          if (s.state === 'cracked') { tapSplit(s); return; }
          if (st.phase === 'sort' && s.state === 'tray' && !st.lockTray) { const pt = ringPoint(s.kind === 'twist' ? 'notmine' : s.kind); s.tries++; drop(s, pt.x, pt.y, true); }
        });
      }
      function setHot(r) { if (st.hot === r) return; st.hot = r; Object.keys(RING).forEach(k => RING[k].el.classList.toggle('hot', k === r)); }
      function ringPoint(ring, ang) { const a = ang != null ? ang : ring === 'influence' ? 2.6 : 3.6, f = ring === 'control' ? 0.12 : ring === 'influence' ? (F1 + F2) / 2 : (F2 + 1) / 2; return { x: M.cx + Math.cos(a) * M.rx * f, y: M.cy + Math.sin(a) * M.ry * f }; }
      // slots: levers sit in a neat triangle in the centre; bridges spread round the middle ring, away from the labels at the top
      const LSLOT = [[150, 0.2], [30, 0.2], [90, 0.22], [270, 0.12]].map(([a, r]) => ({ a: a * Math.PI / 180, r }));
      const ISLOT = [205, 335, 155, 25, 115, 65].map(a => ({ a: a * Math.PI / 180, r: (F1 + F2) / 2 + 0.02 }));
      const used = (sl) => stones.some(s => s.slot === sl);
      function freeSlot(list, near) { let best = null, bd = 1e9; list.forEach(sl => { if (used(sl)) return; const d = near == null ? 0 : Math.abs(Math.atan2(Math.sin(sl.a - near), Math.cos(sl.a - near))); if (d < bd) { bd = d; best = sl; } }); return best || list[list.length - 1]; }

      function drop(s, x, y, kb) {
        const ring = ringAt(x, y);
        if (!ring) { s.state = 'tray'; st.trayDirty = true; SFX.clack(0.3); guideNow(1200); return; }
        if (!kb) s.tries++;
        if (s.kind === 'twist') { placeTwist(s, ring, x, y); return; }
        if (ring !== s.kind) { refuse(s, ring, x, y); return; }
        accept(s, ring, x, y);
      }
      function settleAt(s, gu, gv, then) { s.gu = gu; s.gv = gv; s.state = 'placing'; s.t0 = now(); s.then = then; st.trayDirty = true; }
      function accept(s, ring, x, y) {
        if (s.first == null) s.first = s.tries <= 1;
        s.ring = ring; st.sorted++; if (isGen(s)) st.sortedGen++;
        ctx.track('coc_sort', { k: ring[0], t: s.tries });
        const ang = Math.atan2((y - M.cy) / M.ry, (x - M.cx) / M.rx);
        if (ring === 'control') { const sl = freeSlot(LSLOT, null); s.slot = sl; settleAt(s, Math.cos(sl.a) * sl.r, Math.sin(sl.a) * sl.r, () => becomeLever(s)); }
        else if (ring === 'influence') { const sl = freeSlot(ISLOT, ang); s.slot = sl; settleAt(s, Math.cos(sl.a) * sl.r, Math.sin(sl.a) * sl.r, () => becomeBridge(s)); }
        else { const f = (F2 + 1) / 2 + 0.02; settleAt(s, Math.cos(ang) * f, Math.sin(ang) * f, () => becomeCloud(s)); }
        rippleAt(x, y, ring);
        MU.layers = Math.max(MU.layers, st.sortedGen >= 1 ? 1 : 0, st.sortedGen >= TWIST_AT ? 2 : 0);
        if (!st.twistOut && st.sortedGen >= TWIST_AT) { st.twistOut = true; K.later(twistArrive, 1100); }
        hudTick(true);
        K.later(checkSorted, 700);
      }
      function refuse(s, ring, x, y) {
        st.misses++; s.state = 'refuse'; s.t0 = now(); s.sqv += 4.5; s.rv += (Math.random() < 0.5 ? -1 : 1) * 5;
        SFX.refuse(); S.buzz([10, 40, 10]);
        ctx.track('coc_refuse', { k: s.kind[0], r: ring[0] });
        if (!RM()) P.emit(ring === 'control' ? 'spark' : ring === 'influence' ? 'dust' : 'smoke', x, y - 6, ring === 'notmine' ? 4 : 8, { colors: ring === 'control' ? ['#ffd27a', '#ff9a5a'] : ring === 'influence' ? ['#b0703c', '#d9a46a'] : ['rgba(220,225,245,0.5)'] });
        const key = { control: s.kind === 'influence' ? 'noCtlI' : 'noCtl', influence: s.kind === 'control' ? 'noInfC' : 'noInf', notmine: s.kind === 'influence' ? 'noOutI' : 'noOut' }[ring];
        const who = key === 'noCtl' ? rush : (key === 'noInf' || key === 'noOutI' || key === 'noCtlI') ? patch : still;
        say(who, L(LINES[key]), { mood: who === rush ? 'confused' : 'think', moodMs: 2200, ms: 3000 });
        K.later(() => { if (s.state === 'refuse') { s.state = 'tray'; st.trayDirty = true; guideNow(1400); } }, 700);
      }

      /* ---------------- what each ring does to a stone ---------------- */
      function becomeLever(s) {
        s.state = 'lever'; s.lever = { phi: 0, pop: 0, popT0: now(), pulled: false, back: 0, tick: 0, el: null };
        SFX.lever(); SFX.flute(PENT[5 + Math.min(4, levers().length)], gridT(2));
        if (!RM()) P.emit('spark', s.x, s.y - 10, 10, { colors: ['#ffe6a8', '#ffd27a', '#ffffff'] });
        const btn = h('button', { type: 'button', class: 'cc-lever', 'aria-label': 'Lever: ' + (s.act || s.label) + '. Pull it down.' });
        layer.append(btn); s.lever.el = btn; bindLever(s);
        st.gardenOK = false;
        if (!st.firstLever) { st.firstLever = true; say(rush, L(LINES.lever1), { mood: 'wow', moodMs: 1800, ms: 2600 }); K.later(() => { if (st.phase === 'sort') say(still, L(LINES.lever1b), { mood: 'happy', ms: 2400 }); }, 2400); }
        else if (!s.pebble) say(still, L(LINES.lever), { mood: 'happy', ms: 2000 });
        hudTick(true); guideNow(1500);
      }
      function becomeBridge(s) {
        s.state = 'bridge'; s.bk = 0; s.bT0 = now();
        SFX.bridge(); SFX.flute(PENT[3 + Math.min(4, bridges().length)], gridT(2));
        st.gardenOK = false;
        if (!st.firstBridge) { st.firstBridge = true; patch.react('bounce'); say(patch, L(LINES.bridge1), { mood: 'love', moodMs: 2200, ms: 3400 }); patch.base('happy'); }
        else if (s.kind !== 'twist') say(patch, L(LINES.bridge), { mood: 'happy', ms: 2000 });
        hudTick(true); guideNow(1500);
      }
      function becomeCloud(s) {
        s.state = 'cloud'; s.lab.style.opacity = '0';
        const lw = Math.min(M.side ? 200 : 150, Math.max(96, s.label.length * 7.2 + 26)) * (s.user ? 1.15 : 1);
        const c = { s, seed: s.seed + 5, w: lw + 40 * M.k, h: (s.user ? 74 : 60) * M.k, x: s.x, y: s.y, t0: now(), rise: 1, x0: s.x, y0: s.y, lane: clouds.length % 2, vx: (8 + Math.random() * 6) * (Math.random() < 0.5 ? -1 : 1), ph: Math.random() * 6, sp: null, boost: 0 };
        const lab = h('button', { type: 'button', class: 'cc-cloudlab', 'aria-label': 'A worry drifting by as a cloud: ' + s.label + '. Tap to help it drift.' });
        lab.append(s.user ? h('span', { class: 'gk-user', text: s.label }) : h('span', { text: s.label }));
        lab.style.width = Math.round(lw) + 'px'; lab.style.opacity = '0'; layer.append(lab); c.lab = lab;
        K.tap(lab, () => { c.boost = 1; SFX.whoosh(); if (!RM()) P.emit('smoke', c.x, c.y + c.h * 0.2, 4, { colors: ['rgba(235,235,250,0.35)'] }); if (!st.said.cloudTap) { st.said.cloudTap = true; say(still, L(LINES.cloudTap), { mood: 'happy', ms: 1600 }); } });
        clouds.push(c);
        SFX.cloud(); SFX.flute(PENT[8], gridT(2));
        if (!RM()) P.emit('smoke', s.x, s.y, 8, { colors: ['rgba(235,235,250,0.4)'] });
        if (!st.firstCloud && s.kind !== 'twist') { st.firstCloud = true; say(rush, L(LINES.cloud1), { mood: 'surprised', moodMs: 1800, ms: 2600 }); rush.react('bounce'); K.later(() => say(still, L(LINES.cloud1b), { mood: 'calm', ms: 2600 }), 2300); }
        else if (s.kind !== 'twist') say(still, L(LINES.cloud), { mood: 'calm', ms: 1800 });
        hudTick(true); guideNow(1500);
      }
      const levers = () => stones.filter(s => s.state === 'lever');
      const bridges = () => stones.filter(s => s.state === 'bridge');
      function rippleAt(x, y, ring) { st.ripples.push({ x, y, t0: now(), max: (ring === 'notmine' ? 46 : 38) * M.k }); }

      /* ---------------- the twist: the big stone, and the part of it that's yours ---------------- */
      function twistArrive() {
        if (st.phase !== 'sort') return;
        twist.state = 'deal'; twist.x = M.W + stoneW(twist); twist.y = M.tray.y + M.tray.h / 2; twist.el.hidden = false; st.trayDirty = true;
        SFX.rumble(); st.shakeT = now(); st.shakeA = 3;
        say(rush, L(LINES.big), { mood: 'worried', ms: 2600 }); rush.base('worried');
        K.later(() => { if (twist.state === 'deal') twist.state = 'tray'; st.trayDirty = true; guideNow(900); }, 900);
      }
      function placeTwist(s, ring, x, y) {
        if (s.first == null) s.first = true; // there's no wrong ring for this one: every ring finds the piece that's yours
        s.ring = ring; st.sorted++;
        const ang = Math.atan2((y - M.cy) / M.ry, (x - M.cx) / M.rx), f = ring === 'control' ? 0.05 : ring === 'influence' ? (F1 + F2) / 2 : (F2 + 1) / 2;
        settleAt(s, ring === 'control' ? 0 : Math.cos(ang) * f, ring === 'control' ? 0.04 : Math.sin(ang) * f, () => {
          s.state = 'cracked'; s.crack = 0.22; st.lockTray = true; SFX.crack(0); s.sqv += 3;
          if (!RM()) P.emit('dust', s.x, s.y, 8, { colors: [rgba(stoneType.col, 0.8), '#ffd27a'] });
          say(still, L(LINES.crack), { mood: serious ? 'think' : 'idea', ms: serious ? 5200 : 3600 }); rush.base('confused');
          guideNow(1600);
        });
        rippleAt(x, y, ring);
        ctx.track('coc_big', { r: ring[0] });
      }
      function tapSplit(s) {
        if (s.state !== 'cracked') return;
        s.taps++; s.crack = [0.22, 0.55, 0.84, 1][Math.min(3, s.taps)];
        SFX.crack(s.taps); s.sqv += 3.5; s.rv += (s.taps % 2 ? 1 : -1) * 3; st.shakeT = now(); st.shakeA = 2; S.buzz(8);
        if (!RM()) P.emit('dust', s.x + (Math.random() - 0.5) * 20, s.y - 6, 9, { colors: [rgba(stoneType.col, 0.9), '#ffd27a', '#fff3c4'] });
        K.guide(null);
        if (s.taps >= 3) split(s); else guideNow(2200);
      }
      function split(s) {
        s.state = 'splitting'; SFX.split(); st.shakeT = now(); st.shakeA = 4;
        if (!RM()) { P.emit('star', s.x, s.y - 8, 18, { colors: ['#fff6d0', '#ffd27a', '#ffffff'] }); P.emit('dust', s.x, s.y, 14, { colors: [rgba(stoneType.col, 0.9)] }); }
        pebble = mkStone({ id: 'p', kind: 'control', label: 'My part', act: ACT.prepare, pebble: true });
        pebble.x = s.x + stoneW(s) * 0.25; pebble.y = s.y - 6; pebble.el.hidden = false; pebble.ring = 'control'; pebble.first = true;
        const sl = freeSlot(LSLOT, null); pebble.slot = sl; pebble.hop = { x0: pebble.x, y0: pebble.y, t0: now(), dur: RM() ? 300 : 800 };
        settleAt(pebble, Math.cos(sl.a) * sl.r, Math.sin(sl.a) * sl.r, () => becomeLever(pebble));
        K.later(() => say(rush, L(LINES.split), { mood: 'celebrate', moodMs: 2200, ms: 2600 }), 500);
        rush.base('determined');
        // the rest of the big stone: weather if you called it not yours, a bridge otherwise (you can nudge it, not decide it)
        s.size = 1.12; s.sp = null; s.crack = 0; s.lab.style.opacity = '0';
        K.later(() => {
          st.lockTray = false;
          if (s.ring === 'notmine') { becomeCloud(s); K.later(() => say(still, L(LINES.restCloud), { mood: 'calm', ms: 2600 }), 1700); }
          else { s.ring = 'influence'; const sl2 = freeSlot(ISLOT, Math.atan2(s.gv, s.gu) || 2.6); s.slot = sl2; settleAt(s, Math.cos(sl2.a) * sl2.r, Math.sin(sl2.a) * sl2.r, () => becomeBridge(s)); K.later(() => say(still, L(LINES.restBridge), { mood: 'calm', ms: 2600 }), 1700); }
          K.later(checkSorted, 900);
        }, RM() ? 300 : 700);
        ctx.track('coc_split', {});
      }
      function checkSorted() {
        if (st.phase !== 'sort' || !st.twistOut) return;
        // stones still waiting for the player: the next sort (or the split) checks again
        if (stones.some(s => ['wait', 'tray', 'cracked'].includes(s.state))) return;
        // stones still settling into the sand: look again in a moment (never strand the round here)
        if (stones.some(s => ['deal', 'drag', 'refuse', 'placing', 'splitting'].includes(s.state)) || levers().some(s => s.lever && s.lever.pop < 1)) { K.later(checkSorted, 300); return; }
        startPull();
      }

      /* ---------------- levers ---------------- */
      function bindLever(s) {
        const Lv = s.lever;
        K.drag(Lv.el, {
          space: el,
          start: (p) => {
            if (st.phase !== 'pull' || Lv.pulled) { if (!Lv.pulled) { Lv.back = 0.35; SFX.ratchet(); if (!st.saidNotYet) { st.saidNotYet = true; say(still, L(LINES.notYet), { mood: 'happy', ms: 1800 }); } } return false; }
            Lv.drag = { y0: p.y, phi0: Lv.phi }; K.guide(null); SFX.ratchet();
          },
          move: (p) => {
            if (!Lv.drag) return;
            const len = 34 * M.k, phi = clamp(Lv.drag.phi0 + (p.y - Lv.drag.y0) / (len * 1.15) * 1.9, 0, 1.9);
            if (Math.floor(phi / 0.24) !== Math.floor(Lv.phi / 0.24)) SFX.ratchet();
            Lv.phi = phi;
          },
          end: () => { if (!Lv.drag) return; Lv.drag = null; if (Lv.phi >= 1.2) lockLever(s); else { Lv.back = 1; if (A.ctx) A.boing({ freq: 300, vol: 0.05 }); guideNow(1200); } }
        });
        S.listen(Lv.el, 'keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && st.phase === 'pull' && !Lv.pulled) { e.preventDefault(); lockLever(s); } });
      }
      function startPull() {
        if (st.phase !== 'sort') return;
        st.phase = 'pull'; MU.layers = 3; K.guide(null);
        say(still, L(LINES.pull), { mood: 'happy', ms: 3200 }); still.base('happy');
        K.later(() => say(rush, L(LINES.pullRush), { mood: 'determined', ms: 1600 }), 2600); rush.base('determined');
        Object.keys(RING).forEach(k => RING[k].el.classList.add('dim'));
        guideNow(1400);
      }
      function lockLever(s) {
        const Lv = s.lever; if (Lv.pulled) return;
        Lv.pulled = true; Lv.drag = null; Lv.lockT0 = now(); Lv.phiFrom = Lv.phi;
        SFX.clunk(); st.shakeT = now(); st.shakeA = 3; S.buzz([12, 30, 20]);
        const kn = knobPos(s);
        if (!RM()) P.emit('spark', kn.x, kn.y, 16, { colors: ['#fff3c4', '#ffd27a', '#ff9a5a'] });
        const idx = levers().filter(x => x.lever.pulled).length - 1, d = Math.min(idx, M.paths.length - 1);
        Lv.dist = d;
        launchOrb(s, d);
        showCard(s.act || s.label);
        ctx.track('coc_pull', { n: idx + 1 });
        hudTick(true);
        guideNow(2600);
      }
      function knobPos(s) {
        const Lv = s.lever, k = M.k, piv = { x: s.x, y: s.y - stoneH(s) * 0.62 * 0.2 }, len = 30 * k * K.ease.outBack(clamp(Lv.pop, 0, 1)), phi = Lv.phi;
        return { x: piv.x, y: piv.y - len * Math.cos(phi) + len * 0.5 * Math.sin(phi), piv, len };
      }

      /* ---------------- light: an orb down the garden path, then a district of the town lights up ---------------- */
      function launchOrb(s, d) {
        const p = M.paths[d], kn = knobPos(s);
        st.orbs.push({ pts: [{ x: kn.x, y: kn.y }, p.e, p.a], seg: 0, u: 0, d, t0: now(), last: null });
        SFX.orb();
      }
      function lightDistrict(d) {
        if (!town.litDistricts.includes(d)) town.litDistricts.push(d);
        const list = town.items.filter(o => o.dist === d && (o.t === 'house' || o.t === 'lantern') && !o.litAt).sort((a, b) => a.dd - b.dd), t0 = now();
        list.forEach((o, i) => { o.litAt = t0 + Math.min(1500, i * (RM() ? 20 : 70)); });
        let n = 0; const base = gridT(4);
        for (let i = 0; i < Math.min(7, list.length); i++) SFX.tink(4 + n++ + d, base + i * 0.12);
        st.litN++;
        const ln = LINES.lit[Math.min(LINES.lit.length - 1, st.litN - 1)];
        if (st.litN === 2 && bridges().length) say(patch, L(LINES.litPatch), { mood: 'love', ms: 2600 }); else say(rush, L(ln), { mood: 'celebrate', moodMs: 2200, ms: 2400 });
        rush.react('bounce');
        if (levers().every(x => x.lever.pulled) && st.phase === 'pull') K.later(finale, RM() ? 900 : 1600);
      }
      function showCard(text) {
        st.cards.push(text);
        if (!st.cardOn) nextCard();
      }
      function nextCard() {
        const t = st.cards.shift(); if (!t) { st.cardOn = false; card.classList.remove('on'); return; }
        st.cardOn = true; card.lastChild.textContent = t; placeCard(); card.classList.remove('on'); void card.offsetWidth; card.classList.add('on');
        K.later(() => { card.classList.remove('on'); K.later(nextCard, 380); }, 3400);
      }
      function placeCard() { const ch = card.offsetHeight || 80, cw = card.offsetWidth || 340, top = Math.round(M.side ? M.tray.y + 6 : clamp(M.tray.y + 2, 0, M.charTop - ch - 90)); card.style.top = top + 'px'; M.cardBox = { x: (M.W - cw) / 2 - 8, y: top - 8, w: cw + 16, h: ch + 24 }; }
      const cardBoxes = () => [st.cardOn && M.cardBox, st.planOn && M.planBox].filter(Boolean);

      /* ---------------- finale: lights, drifting clouds, the rake ---------------- */
      async function finale() {
        if (st.phase !== 'pull') return;
        st.phase = 'finale'; K.guide(null);
        MU.vol = 1.15; SFX.bell();
        say(still, L(LINES.fin), { mood: 'celebrate', ms: 0 }); still.base('celebrate'); patch.base('love'); rush.base('happy');
        st.rakeT0 = now(); st.rakeDur = RM() ? 900 : 2600; st.rakeA = 0; SFX.rake(st.rakeDur);
        stones.filter(s => s.state === 'lever' || s.state === 'bridge').forEach((s, i) => K.later(() => { rippleAt(s.x, s.y, 'influence'); SFX.tink(5 + i, gridT(4)); }, 500 + i * 260));
        clouds.forEach(c => { c.vx *= 1.6; });
        // dusk settles over the town so every window you lit glows, and paper lanterns rise from the lit districts
        st.duskT0 = now(); st.lanterns = []; st.lantQ = [];
        const perD = [4, 6, 8][inten];
        town.litDistricts.forEach((d, di) => { for (let i = 0; i < perD; i++) st.lantQ.push({ d, at: now() + 900 + di * 380 + i * (RM() ? 120 : 420) + Math.random() * 200, first: i === 0 }); });
        K.finale('stars', { colors: ['#fff3c4', '#ffd27a', '#ffe9a8', '#cfe0ff'], chord: ['D3', 'A3', 'D4', 'F4', 'A4'], ms: 5200 });
        await K.wait(RM() ? 1000 : 2700);
        showPlan();
        K.later(() => say(rush, L(LINES.finRush), { mood: 'happy', ms: 0 }), 600);
        if (care) K.later(() => say(still, L(LINES.finCare), { mood: 'calm', ms: 0 }), 3200);
        await K.wait(RM() ? 2200 : (care ? 6200 : 4600));
        finish();
      }
      function showPlan() {
        plan.innerHTML = '';
        plan.append(h('small', { html: ICON.lever + '<span>Yours to do</span>' }), h('b', { text: serious ? 'A real worry, a real plan' : 'Your levers' }));
        const ol = h('ol');
        stones.filter(s => s.state === 'lever').sort((a, b) => (a.lever.dist || 0) - (b.lever.dist || 0)).forEach(s => ol.append(h('li', { html: ICON.lever }, h('span', { text: s.act || s.label }))));
        plan.append(ol);
        if (care) plan.append(h('em', { text: 'For the facts, ask someone qualified.' }));
        placePlan(); void plan.offsetWidth; plan.classList.add('on'); st.planOn = true;
        if (A.ctx) A.chime(A.note('D5'), { vol: 0.06, dur: 2 });
      }
      function placePlan() { const ph = plan.offsetHeight || 150, pw = plan.offsetWidth || 380, top = Math.round(M.side ? M.tray.y - 6 : clamp(M.tray.y - 10, M.cy, M.charTop - ph - 100)); plan.style.top = top + 'px'; M.planBox = { x: (M.W - pw) / 2 - 8, y: top - 8, w: pw + 16, h: ph + 26 }; }
      function finish() {
        if (st.finished) return; st.finished = true; st.phase = 'done';
        const lv = levers(), nL = lv.length, nB = bridges().length, nC = clouds.length;
        const sortedAll = stones.filter(s => s.first != null && !s.pebble), firstTry = sortedAll.filter(s => s.first).length, score = sortedAll.length ? firstTry / sortedAll.length : 1, pct = Math.round(score * 100);
        const tier = K.tier(score, [0.5, 0.75, 0.99]), badges = [];
        if (tier) badges.push(tier + ' · clear sorting');
        const b = K.best('clear', pct, 'higher');
        if (b.isNew) badges.push('New best: ' + pct + '% sorted first try'); else if (b.first) badges.push(pct + '% sorted first try');
        const items = [stoneType.name + ' stones', season.name].concat((M.marks || []).map(m => ({ tea: 'Tea house', pagoda: 'Pagoda', pond: 'Koi pond' })[m]));
        let firstNew = null, count = 0; items.forEach(it => { const c = K.collect(it); count = c.count; if (c.isNew && !firstNew) firstNew = it; });
        if (firstNew) badges.push('Collected: ' + firstNew + ' · ' + count + ' so far');
        const pl = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
        const firstAct = (lv.slice().sort((a, b2) => (a.lever.dist || 0) - (b2.lever.dist || 0))[0] || {}).act || ACT.prepare;
        const lines = ['Yours to do: ' + clip(firstAct, 92), pl(nL, 'lever') + ' pulled, ' + pl(nB, 'bridge') + ' built, ' + pl(nC, 'cloud') + ' let drift', serious ? 'A real worry: the outcome isn’t all yours, your part is' : 'Split the big worry and found the part that’s yours'];
        ctx.finish({ title: 'The garden is in balance', mood: 'calm', lines, share: 'Sorted my worries: ' + pl(nL, 'lever') + ', ' + pl(nB, 'bridge') + ', ' + pl(nC, 'cloud') + ' drifting by.', badges: badges.slice(0, 4) });
      }

      /* ---------------- guide (an arrow on every step) ---------------- */
      function nextTray() { return twist.state === 'tray' ? twist : stones.find(s => s.state === 'tray' && isGen(s)) || stones.find(s => s.state === 'tray'); }
      function guideNow(delay) {
        if (st.phase === 'sort') {
          if (twist.state === 'cracked') { K.guide({ id: 'split' + twist.taps, g: 'tap', target: twist.el, label: twist.taps ? 'KEEP TAPPING' : 'TAP TO SPLIT IT', place: twist.y > M.cy - M.ry * 0.3 ? 'below' : 'above', delay: delay ?? 900 }); return; }
          const s = nextTray(); if (!s) { K.guide(null); return; }
          const first = st.sorted === 0, tp = first ? ringPoint(s.kind === 'twist' ? 'notmine' : s.kind, s.kind === 'control' ? -Math.PI / 2 : null) : { x: M.cx, y: M.cy + M.ry * 0.97 };
          if (first && s.kind === 'control') tp.y = M.cy;
          K.guide({ id: 'sort-' + s.uid + (first ? 'f' : ''), g: 'drag', target: s.el, dx: Math.round(tp.x - s.x), dy: Math.round(tp.y - s.y), label: first ? 'DRAG IT TO ITS RING' : s.kind === 'twist' ? 'DROP IT IN A RING' : 'SORT THE NEXT STONE', place: 'below', delay: delay ?? 1000 });
          return;
        }
        if (st.phase === 'pull') {
          const s = levers().find(x => !x.lever.pulled); if (!s) { K.guide(null); return; }
          K.guide({ id: 'pull-' + s.uid, g: 'drag', target: s.lever.el, oy: 0.2, dx: 0, dy: Math.round(46 * M.k), label: levers().some(x => x.lever.pulled) ? 'PULL THE NEXT LEVER' : 'PULL THE LEVER', place: 'above', delay: delay ?? 1000 });
          return;
        }
        K.guide(null);
      }

      /* ---------------- tray ---------------- */
      function traySlots() {
        const list = stones.filter(s => ['tray', 'deal', 'drag', 'refuse'].includes(s.state));
        list.sort((a, b) => (a.kind === 'twist' ? 1.5 : ORDER.indexOf(a.id)) - (b.kind === 'twist' ? 1.5 : ORDER.indexOf(b.id)));
        const T = M.tray, gap = 10 * M.k, rows = list.length > (M.side ? 7 : 4) ? 2 : 1, per = Math.ceil(list.length / rows), out = new Map();
        for (let r = 0; r < rows; r++) {
          const row = list.slice(r * per, (r + 1) * per), tw = row.reduce((a, s) => a + stoneW(s), 0) + gap * Math.max(0, row.length - 1);
          let x = T.x + T.w / 2 - tw / 2; const y = T.y + (r + 0.5) * (T.h - 10) / rows + 4;
          row.forEach(s => { out.set(s, { x: x + stoneW(s) / 2, y }); x += stoneW(s) + gap; });
        }
        return out;
      }

      /* ---------------- per frame ---------------- */
      let slots = new Map();
      function update(dt, t) {
        const tn = now(), rdt = st.lastTn ? Math.min(0.25, (tn - st.lastTn) / 1000) : 0.016; st.lastTn = tn;
        if (st.trayDirty) { slots = traySlots(); st.trayDirty = false; }
        stones.forEach(s => {
          if (s.state === 'wait') return;
          let tx = s.x, ty = s.y, kk = 170, cc = 19;
          if (['tray', 'deal', 'refuse'].includes(s.state)) { const sl = slots.get(s); if (sl) { tx = sl.x; ty = sl.y; } if (s.state === 'refuse') { kk = 60; cc = 14; } }
          else if (s.state === 'drag') { tx = s.tx; ty = s.ty; kk = 520; cc = 34; }
          else if (['placing', 'lever', 'bridge', 'cracked', 'splitting', 'placed'].includes(s.state)) { tx = M.cx + s.gu * M.rx; ty = M.cy + s.gv * M.ry; kk = 190; cc = 21; }
          if (s.hop && s.state === 'placing') { // the split-off pebble hops into the centre
            const k = clamp((tn - s.hop.t0) / s.hop.dur, 0, 1), e = K.ease.inOutCubic(k);
            s.x = lerp(s.hop.x0, tx, e); s.y = lerp(s.hop.y0, ty, e) - Math.sin(Math.PI * k) * 60 * M.k; s.vx = s.vy = 0;
            if (k >= 1) { s.hop = null; s.state = 'placed'; S.buzz(6); SFX.land(0.3); rippleAt(s.x, s.y, 'control'); if (s.then) { const f = s.then; s.then = null; f(); } }
          } else if (s.state !== 'cloud' && s.state !== 'gone') {
            s.vx += ((tx - s.x) * kk - s.vx * cc) * rdt; s.vy += ((ty - s.y) * kk - s.vy * cc) * rdt;
            s.x += s.vx * rdt; s.y += s.vy * rdt;
            if (s.state === 'placing' && ((Math.abs(tx - s.x) < 1.5 && Math.abs(ty - s.y) < 1.5 && Math.hypot(s.vx, s.vy) < 30) || tn - s.t0 > 900)) { s.state = 'placed'; SFX.land(s.big ? 1 : 0.2); s.sqv += 2; if (s.then) { const f = s.then; s.then = null; f(); } }
          }
          s.lift += ((s.state === 'drag' ? 12 * M.k : 0) - s.lift) * Math.min(1, rdt * 14);
          s.sqv += (-s.sq * 240 - s.sqv * 13) * rdt; s.sq = clamp(s.sq + s.sqv * rdt, -0.2, 0.2);
          s.rv += (-s.rot * 150 - s.rv * 10) * rdt; s.rot += s.rv * rdt; if (s.state === 'drag') s.rot += clamp(s.vx * 0.00025, -0.2, 0.2) * rdt * 10;
          if (s.lever) {
            const Lv = s.lever; Lv.pop = clamp((tn - Lv.popT0) / (RM() ? 150 : 450), 0, 1);
            if (Lv.pulled) { const k = clamp((tn - Lv.lockT0) / 160, 0, 1); Lv.phi = lerp(Lv.phiFrom, 1.9, K.ease.outCubic(k)); }
            else if (!Lv.drag && Lv.back > 0) { Lv.phi = Math.max(0, Lv.phi - rdt * 6); if (Lv.back < 1) { Lv.phi = Math.sin(tn / 60) * 0.12 * Lv.back; Lv.back = Math.max(0, Lv.back - rdt); } else if (Lv.phi <= 0) Lv.back = 0; }
          }
          if (s.state === 'bridge') s.bk = clamp((tn - s.bT0) / (RM() ? 200 : 900), 0, 1);
        });
        clouds.forEach((c, i) => {
          const lanes = cloudLanes();
          const ly = lanes[c.lane % lanes.length];
          if (c.rise) { const k = clamp((tn - c.t0) / (RM() ? 500 : 1700), 0, 1), e = K.ease.inOutCubic(k); c.x = lerp(c.x0, c.x0 + c.vx * 2, e); c.y = lerp(c.y0, ly, e) - Math.sin(Math.PI * k) * 26 * M.k; c.grow = clamp(k * 1.6, 0, 1); if (k >= 1) c.rise = 0; }
          else { c.boost = Math.max(0, c.boost - rdt * 0.6); c.x += c.vx * (1 + c.boost * 5) * rdt; c.y = ly + Math.sin(tn / 1400 + c.ph) * 5 * M.k + i * 3; const hw = c.w / 2 + 30; if (c.x > M.W + hw) c.x = -hw; if (c.x < -hw) c.x = M.W + hw; }
        });
        st.orbs.forEach(o => {
          if (o.done) return;
          const a = o.pts[o.seg], b = o.pts[o.seg + 1], len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
          o.u += (RM() ? 900 : 330) * M.k * rdt / len;
          if (o.u >= 1) { o.u = 0; o.seg++; if (o.seg >= o.pts.length - 1) { o.done = true; lightDistrict(o.d); return; } }
          const aa = o.pts[o.seg], bb = o.pts[o.seg + 1]; o.x = lerp(aa.x, bb.x, o.u); o.y = lerp(aa.y, bb.y, o.u);
          if (!RM() && Math.random() < 0.7) P.emit('ember', o.x, o.y, 1, { colors: ['#ffd27a', '#fff3c4'] });
          M.paths[o.d].lan.forEach(l => { if (!l.lit && Math.hypot(l.x - o.x, l.y - o.y) < 16 * M.k) { l.lit = tn; if (A.ctx) A.chime(A.note(PENT[7 + (M.paths[o.d].lan.indexOf(l) % 4)]), { vol: 0.02, dur: 0.8 }); } });
        });
        st.orbs = st.orbs.filter(o => !o.done);
        st.ripples = st.ripples.filter(r => tn - r.t0 < 1400);
        if (st.rakeT0) { st.rakeA = clamp((tn - st.rakeT0) / st.rakeDur, 0, 1); }
        if (st.duskT0) st.duskK = clamp((tn - st.duskT0) / 2400, 0, 1);
        st.trayA += ((['pull', 'finale', 'done'].includes(st.phase) ? 0 : 1) - st.trayA) * Math.min(1, rdt * 3.5); // the empty deck sinks away once every stone has a place
        if (st.lantQ && st.lantQ.length) st.lantQ = st.lantQ.filter(q => { // sky lanterns leave their district one by one
          if (tn < q.at) return true;
          const a = M.anchors[q.d] || { x: M.W / 2, y: M.H / 2 };
          st.lanterns.push({ x: a.x + (Math.random() - 0.5) * 80 * M.k, y: a.y + (Math.random() - 0.5) * 26 * M.k, vy: -(18 + Math.random() * 14) * M.k, ph: Math.random() * 6, s: (1.05 + Math.random() * 0.55) * M.k * (M.side ? 1.3 : 1), t0: tn });
          if (q.first) SFX.tink(7 + q.d, gridT(2));
          return false;
        });
        if (st.lanterns && st.lanterns.length) { st.lanterns.forEach(l => { l.vy -= 5 * M.k * rdt; l.y += l.vy * rdt; l.x += Math.sin(tn / 900 + l.ph) * 8 * M.k * rdt; }); st.lanterns = st.lanterns.filter(l => l.y > -40); }
        // the season drifts through the air
        if (!RM() && Math.random() < rdt * (season.fall === 'firefly' ? 2.2 : 1.6)) {
          if (season.fall === 'firefly') P.emit('mote', Math.random() * M.W, Math.random() * M.H, 1, { colors: season.fallCols });
          else P.emit(season.fall, Math.random() * M.W * 1.1 - M.W * 0.05, -10, 1, { angle: Math.PI / 2 + 0.3, spread: 0.5, speed: [20, 50], colors: season.fallCols });
        }
        P.update(rdt);
      }
      function cloudLanes() { return M.side ? [Math.round(M.cy - M.ry - 58 * M.k), Math.round(M.tray.y + M.tray.h + 46 * M.k)] : [Math.round((100 + M.cy - M.ry) / 2) - 4, Math.round((M.tray.y + M.tray.h + M.charTop) / 2) - 10]; }

      function draw(g, t) {
        const tn = now(), k = M.k, br = bright(), dp = cv.dpr || 1;
        g.drawImage(stat, 0, 0, stat.width, stat.height, 0, 0, stat.width / dp, stat.height / dp);
        if (st.duskK) { g.fillStyle = 'rgba(16,14,44,' + ((br ? 0.42 : 0.24) * K.ease.inOutSine(st.duskK)).toFixed(3) + ')'; g.fillRect(0, 0, M.W, M.H); } // dusk over the town (the garden stays lit)
        drawTownLights(g, t, tn, br);
        if (!st.trayOK) renderTray();
        if (st.trayA > 0.01) { const pad = M.trayPad, slide = (1 - st.trayA) * 26 * k; g.globalAlpha = st.trayA; g.drawImage(trayC, 0, 0, trayC.width, trayC.height, M.tray.x - pad, M.tray.y - pad + slide, trayC.width / dp, trayC.height / dp); g.globalAlpha = 1; }
        // garden + furrows + rake
        if (!st.gardenOK) renderGarden();
        const gb = M.gb;
        g.drawImage(gcv, 0, 0, gcv.width, gcv.height, gb.x, gb.y, gcv.width / dp, gcv.height / dp);
        if (scv.width) {
          if (st.rakeT0 && st.rakeA > 0) { // the rake wipes the furrows as it passes
            const sg = scv.getContext('2d'); sg.setTransform(dp, 0, 0, dp, 0, 0); sg.save(); sg.globalCompositeOperation = 'destination-out'; sg.beginPath(); sg.moveTo(M.cx - gb.x, M.cy - gb.y);
            const a0 = -Math.PI / 2; sg.arc(M.cx - gb.x, M.cy - gb.y, Math.max(gb.w, gb.h), a0, a0 + TAU * st.rakeA); sg.closePath(); sg.fill(); sg.restore();
          }
          g.drawImage(scv, 0, 0, scv.width, scv.height, gb.x, gb.y, scv.width / dp, scv.height / dp);
        }
        if (st.hot) { g.save(); g.globalCompositeOperation = 'lighter'; bandPath(g, st.hot); g.fillStyle = 'rgba(255,214,140,' + (0.13 + 0.06 * Math.sin(t * 6)).toFixed(3) + ')'; g.fill('evenodd'); g.restore(); }
        st.ripples.forEach(r => { const a = (tn - r.t0) / 1400; for (let i = 0; i < 3; i++) { const q = a - i * 0.16; if (q <= 0) continue; const rr = r.max * (0.25 + q); g.strokeStyle = 'rgba(255,255,255,' + (0.5 * (1 - q)).toFixed(3) + ')'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(r.x, r.y, rr, rr * 0.78, 0, 0, TAU); g.stroke(); } });
        if (st.rakeT0 && st.rakeA > 0 && st.rakeA < 1) drawRake(g, st.rakeA, k);
        // in the sand: bridges, then the stones that live there (back to front)
        stones.filter(s => s.state === 'bridge').forEach(s => drawBridge(g, s, k, tn));
        const inSand = stones.filter(s => ['placing', 'placed', 'lever', 'bridge', 'cracked', 'splitting'].includes(s.state) && !(s.state === 'placing' && s.hop)).sort((a, b) => a.y - b.y);
        inSand.forEach(s => { if (s.state === 'lever') drawLever(g, s, k, tn); else drawStone(g, s, s.x, s.y, s.state === 'bridge' ? 0.78 : 1, s.lift); });
        // on the tray, then anything in the air
        stones.filter(s => ['tray', 'deal', 'refuse'].includes(s.state)).forEach(s => drawStone(g, s, s.x, s.y, 1, s.lift));
        stones.filter(s => s.state === 'drag' || (s.state === 'placing' && s.hop)).forEach(s => drawStone(g, s, s.x, s.y, 1, s.state === 'drag' ? s.lift : 14 * k));
        st.orbs.forEach(o => { if (o.x == null) return; const r = 16 * k; g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(K.glowSprite('#ffd27a'), o.x - r * 2, o.y - r * 2, r * 4, r * 4); g.fillStyle = '#fffbe6'; g.beginPath(); g.arc(o.x, o.y, 3.4 * k, 0, TAU); g.fill(); g.restore(); });
        // clouds: shadows on the town, then the clouds
        clouds.forEach(c => { const sh = (c.grow == null ? 1 : c.grow); g.globalAlpha = (br ? 0.16 : 0.22) * sh; g.drawImage(K.glowSprite('#000000'), c.x - c.w * 0.55 + 14 * k, c.y + 30 * k - c.h * 0.35, c.w * 1.1, c.h * 0.7); });
        g.globalAlpha = 1;
        clouds.forEach(c => { const sp = cloudSprite(c), sc = 0.4 + 0.6 * (c.grow == null ? 1 : c.grow); g.globalAlpha = clamp((c.grow == null ? 1 : c.grow) * 1.4, 0, 1); g.drawImage(sp.c, c.x - sp.w * sc / 2, c.y - sp.h * sc / 2, sp.w * sc, sp.h * sc); });
        g.globalAlpha = 1;
        if (st.lanterns && st.lanterns.length) { // paper lanterns: a warm halo, then the paper and its flame
          const spr = K.glowSprite('#ffb85a');
          g.save(); g.globalCompositeOperation = 'lighter';
          st.lanterns.forEach(l => { const r = 24 * l.s; g.globalAlpha = 0.75 * clamp((tn - l.t0) / 500, 0, 1) * (0.85 + 0.15 * Math.sin(tn / 140 + l.ph)); g.drawImage(spr, l.x - r, l.y - r, r * 2, r * 2); });
          g.restore();
          st.lanterns.forEach(l => { const s = l.s; g.globalAlpha = clamp((tn - l.t0) / 500, 0, 1); g.fillStyle = '#ffc77c'; g.beginPath(); g.moveTo(l.x - 4.2 * s, l.y - 6.5 * s); g.lineTo(l.x + 4.2 * s, l.y - 6.5 * s); g.lineTo(l.x + 5.4 * s, l.y + 5 * s); g.lineTo(l.x - 5.4 * s, l.y + 5 * s); g.closePath(); g.fill(); g.fillStyle = '#fff3d2'; g.fillRect(l.x - 2.2 * s, l.y + 0.6 * s, 4.4 * s, 3.4 * s); });
          g.globalAlpha = 1;
        }
        P.draw(g);
      }
      function drawTownLights(g, t, tn, br) {
        const k = M.k, warm = '#ffd27a';
        const lit = town.items.filter(o => o.litAt && tn >= o.litAt);
        lit.forEach(o => { const a = clamp((tn - o.litAt) / 280, 0, 1) * (0.88 + 0.12 * Math.sin(t * 2.2 + (o.ph || 0)));
          g.globalAlpha = a; g.fillStyle = br ? '#ffcf5a' : warm;
          if (o.t === 'house' && o.winX) o.winX.forEach(wx => g.fillRect(wx - 2.6 * k, (o.winY[0]) - o.d * 0.22, 5.2 * k, o.d * 0.46));
          else if (o.t === 'lantern') g.fillRect(o.x - 1.6 * k, o.y - 12 * k, 3.2 * k, 3 * k);
        });
        M.paths.forEach(p => p.lan.forEach(l => { if (!l.lit) return; g.globalAlpha = clamp((tn - l.lit) / 250, 0, 1); g.fillStyle = warm; g.fillRect(l.x - 1.6 * k, l.y - 12 * k, 3.2 * k, 3 * k); }));
        g.globalAlpha = 1;
        g.save(); g.globalCompositeOperation = 'lighter';
        const spr = K.glowSprite(br ? '#ffcf6a' : '#ffc46b');
        const glowA = br ? 0.32 + 0.3 * (st.duskK || 0) : 0.55 + 0.15 * (st.duskK || 0);
        lit.forEach(o => { const a = clamp((tn - o.litAt) / 400, 0, 1) * glowA * (0.85 + 0.15 * Math.sin(t * 2.2 + (o.ph || 0))), r = (o.t === 'house' ? 22 : 14) * k * (o.tea ? 1.4 : 1); g.globalAlpha = a; g.drawImage(spr, o.x - r, (o.t === 'house' ? o.y - o.d * 0.6 : o.y - 11 * k) - r, r * 2, r * 2); });
        M.paths.forEach(p => p.lan.forEach(l => { if (!l.lit) return; const r = 15 * k; g.globalAlpha = clamp((tn - l.lit) / 300, 0, 1) * (br ? 0.35 : 0.6); g.drawImage(spr, l.x - r, l.y - 11 * k - r, r * 2, r * 2); }));
        g.restore(); g.globalAlpha = 1;
      }
      function drawStone(g, s, x, y, sc, lift) {
        const sp = sprite(s); if (!sp) return;
        const w = sp.w * sc, hh = sp.h * sc;
        g.globalAlpha = s.alpha;
        g.fillStyle = 'rgba(15,12,8,' + (0.3 - Math.min(0.16, lift * 0.01)).toFixed(3) + ')';
        g.beginPath(); g.ellipse(x + 2 + lift * 0.4, y + hh * 0.26 + lift * 0.55, w * (0.4 + lift * 0.004), hh * 0.2, 0, 0, TAU); g.fill();
        g.save(); g.translate(x, y - lift); if (s.rot) g.rotate(s.rot); if (s.sq) g.scale(1 + s.sq, 1 - s.sq);
        g.drawImage(sp.c, -w / 2, -hh / 2, w, hh);
        if (s.crack > 0) drawCrack(g, s, w - 12 * sc, hh - 12 * sc);
        g.restore(); g.globalAlpha = 1;
      }
      function drawCrack(g, s, w, hh) {
        if (!s.crackPts) { const R = K.rng(s.seed + 3), pts = []; for (let i = 0; i <= 7; i++) pts.push([-w * 0.42 + i / 7 * w * 0.8, (R() - 0.5) * hh * 0.4 - hh * 0.05]); s.crackPts = pts; }
        const n = Math.max(1, Math.round(s.crackPts.length * s.crack)), pts = s.crackPts.slice(0, n + 1);
        g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
        g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,200,90,0.55)'; g.lineWidth = 6; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
        g.globalCompositeOperation = 'source-over'; g.strokeStyle = '#3a2410'; g.lineWidth = 2.2; g.stroke(); g.strokeStyle = '#ffd27a'; g.lineWidth = 1.1; g.stroke();
        g.restore();
      }
      function drawLever(g, s, k, tn) {
        const Lv = s.lever, sc = 0.62;
        drawStone(g, s, s.x, s.y, sc, 0);
        const kn = knobPos(s), piv = kn.piv, pop = K.ease.outBack(clamp(Lv.pop, 0, 1));
        if (pop <= 0.01) return;
        g.fillStyle = '#3a2a1e'; g.fillRect(piv.x - 6 * k, piv.y - 2 * k, 12 * k, 5 * k);
        g.strokeStyle = '#5a3a22'; g.lineWidth = 4.4 * k; g.lineCap = 'round'; g.beginPath(); g.moveTo(piv.x, piv.y); g.lineTo(kn.x, kn.y); g.stroke();
        g.strokeStyle = '#a4703f'; g.lineWidth = 2.2 * k; g.beginPath(); g.moveTo(piv.x - 0.6 * k, piv.y); g.lineTo(kn.x - 0.6 * k, kn.y); g.stroke();
        const r = (5.8 + 2.2 * Math.sin(Lv.phi)) * k * pop, on = Lv.pulled;
        if (on) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55 + 0.15 * Math.sin(tn / 300); g.drawImage(K.glowSprite('#ffd27a'), kn.x - r * 4, kn.y - r * 4, r * 8, r * 8); g.restore(); }
        const gr = g.createRadialGradient(kn.x - r * 0.35, kn.y - r * 0.4, 0.5, kn.x, kn.y, r); gr.addColorStop(0, on ? '#fff6cf' : '#ff8a6a'); gr.addColorStop(1, on ? '#f0a83a' : '#b8321f');
        g.fillStyle = gr; g.beginPath(); g.arc(kn.x, kn.y, r, 0, TAU); g.fill();
      }
      function drawBridge(g, s, k, tn) {
        // a little arched footbridge from the stone, over the ring line, reaching into the circle of what's yours
        const ang = Math.atan2(s.gv, s.gu), x0 = s.x - Math.cos(ang) * stoneW(s) * 0.3, y0 = s.y - Math.sin(ang) * stoneH(s) * 0.26, x1e = M.cx + Math.cos(ang) * M.rx * F1 * 0.74, y1e = M.cy + Math.sin(ang) * M.ry * F1 * 0.74;
        const kk = K.ease.outCubic(s.bk), x1 = lerp(x0, x1e, kk), y1 = lerp(y0, y1e, kk), len = Math.hypot(x1 - x0, y1 - y0); if (len < 2) return;
        const nx = -(y1 - y0) / len, ny = (x1 - x0) / len, wd = 6.5 * k, arch = 13 * k * kk, mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - arch;
        g.fillStyle = 'rgba(10,8,5,0.25)'; g.beginPath(); g.moveTo(x0 + nx * wd, y0 + ny * wd + 3 * k); g.quadraticCurveTo(mx + nx * wd, my + ny * wd + 3 * k + arch, x1 + nx * wd, y1 + ny * wd + 3 * k); g.lineTo(x1 - nx * wd, y1 - ny * wd + 3 * k); g.quadraticCurveTo(mx - nx * wd, my - ny * wd + 3 * k + arch, x0 - nx * wd, y0 - ny * wd + 3 * k); g.closePath(); g.fill();
        g.fillStyle = '#8a5a36'; g.beginPath(); g.moveTo(x0 + nx * wd, y0 + ny * wd); g.quadraticCurveTo(mx + nx * wd, my + ny * wd, x1 + nx * wd, y1 + ny * wd); g.lineTo(x1 - nx * wd, y1 - ny * wd); g.quadraticCurveTo(mx - nx * wd, my - ny * wd, x0 - nx * wd, y0 - ny * wd); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(40,25,12,0.5)'; g.lineWidth = 1; g.beginPath(); for (let i = 1; i < 6; i++) { const u = i / 6, bx = (1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * mx + u * u * x1, by = (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * my + u * u * y1; g.moveTo(bx + nx * wd, by + ny * wd); g.lineTo(bx - nx * wd, by - ny * wd); } g.stroke();
        const bz = (u) => ({ x: (1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * mx + u * u * x1, y: (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * my + u * u * y1 });
        g.strokeStyle = '#8f2f20'; g.lineWidth = 1.5 * k; g.lineCap = 'round';
        [0.05, 0.5, 0.95].forEach(u => { if (u > kk + 0.02) return; const b = bz(u); [1, -1].forEach(sd => { g.beginPath(); g.moveTo(b.x + nx * wd * sd, b.y + ny * wd * sd); g.lineTo(b.x + nx * wd * sd, b.y + ny * wd * sd - 4 * k); g.stroke(); }); });
        g.strokeStyle = '#c9452f'; g.lineWidth = 2.2 * k;
        [1, -1].forEach(sd => { g.beginPath(); g.moveTo(x0 + nx * wd * sd, y0 + ny * wd * sd - 4 * k); g.quadraticCurveTo(mx + nx * wd * sd, my + ny * wd * sd - 4 * k, x1 + nx * wd * sd, y1 + ny * wd * sd - 4 * k); g.stroke(); });
        if (st.phase === 'finale' || st.litN >= 2) { const r = 12 * k; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 + 0.2 * Math.sin(tn / 400 + s.seed); g.drawImage(K.glowSprite('#ffc46b'), mx - r, my - 4 * k - r, r * 2, r * 2); g.restore(); g.fillStyle = '#fff1c4'; g.beginPath(); g.arc(mx, my - 4 * k, 1.8 * k, 0, TAU); g.fill(); }
      }
      function drawRake(g, a, k) {
        const ang = -Math.PI / 2 + TAU * a, c = Math.cos(ang), sn = Math.sin(ang);
        const x0 = M.cx + c * M.rx * 0.18, y0 = M.cy + sn * M.ry * 0.18, x1 = M.cx + c * M.rx * 0.98, y1 = M.cy + sn * M.ry * 0.98;
        g.save(); g.lineCap = 'round';
        g.strokeStyle = 'rgba(10,8,5,0.28)'; g.lineWidth = 6 * k; g.beginPath(); g.moveTo(x0 + 3, y0 + 8 * k); g.lineTo(x1 + 3, y1 + 8 * k); g.stroke();
        g.strokeStyle = '#7a5332'; g.lineWidth = 5 * k; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        g.strokeStyle = '#b07f50'; g.lineWidth = 2 * k; g.beginPath(); g.moveTo(x0, y0 - 1); g.lineTo(x1, y1 - 1); g.stroke();
        g.strokeStyle = '#5a3a22'; g.lineWidth = 1.6 * k; g.beginPath(); for (let i = 0; i <= 8; i++) { const u = 0.2 + i / 8 * 0.78, px = M.cx + c * M.rx * u, py = M.cy + sn * M.ry * u; g.moveTo(px, py); g.lineTo(px - sn * 6 * k, py + c * 6 * k * 0.8 + 3 * k); } g.stroke();
        g.restore();
        if (!RM() && Math.random() < 0.6) P.emit('dust', lerp(x0, x1, Math.random()), lerp(y0, y1, Math.random()), 1, { colors: [rgba(GS().sand, 0.8)] });
      }

      /* ---------------- DOM that follows the canvas ---------------- */
      function domTick() {
        stones.forEach(s => {
          const show = !['wait', 'cloud', 'gone'].includes(s.state);
          if (s.el.hidden === show) s.el.hidden = !show;
          if (!show) { if (s.lab.style.opacity !== '0') s.lab.style.opacity = '0'; return; }
          const inLever = s.state === 'lever', inBridge = s.state === 'bridge', sc = inLever ? 0.62 : inBridge ? 0.78 : 1, w = Math.max(48, stoneW(s) * sc), hh = Math.max(48, stoneH(s) * sc + (inLever ? 30 * M.k : 0));
          const x = s.x - w / 2, y = s.y - s.lift - hh / 2 - (inLever ? 14 * M.k : 0);
          const key = Math.round(x) + ',' + Math.round(y) + ',' + Math.round(w) + ',' + Math.round(hh);
          if (key !== s.key) { s.key = key; Object.assign(s.el.style, { transform: 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)', width: Math.round(w) + 'px', height: Math.round(hh) + 'px' }); }
          if (inLever && s.lever.el) { const kn = knobPos(s), lw = 54 * M.k, lh = 70 * M.k, lx = s.x - lw / 2, ly = kn.piv.y - 40 * M.k; const lk = Math.round(lx) + ',' + Math.round(ly); if (lk !== s.lk) { s.lk = lk; Object.assign(s.lever.el.style, { transform: 'translate(' + Math.round(lx) + 'px,' + Math.round(ly) + 'px)', width: Math.round(lw) + 'px', height: Math.round(lh) + 'px' }); } }
          const labOn = ['tray', 'deal', 'drag', 'refuse', 'placing', 'cracked'].includes(s.state) && !(s.pebble && s.state !== 'tray') && s.x - stoneW(s) / 2 > 2 && s.x + stoneW(s) / 2 < M.W - 2; // a stone sliding in from the edge shows its words once it's inside
          const op = labOn ? '1' : '0'; if (s.lab.style.opacity !== op) s.lab.style.opacity = op;
          if (labOn) { const lw = stoneW(s) - 8, lx = s.x - lw / 2, ly = s.y - s.lift - stoneH(s) * 0.5 + 2, lk = Math.round(lx) + ',' + Math.round(ly) + ',' + Math.round(lw); if (lk !== s.labk) { s.labk = lk; Object.assign(s.lab.style, { transform: 'translate(' + Math.round(lx) + 'px,' + Math.round(ly) + 'px) rotate(' + (s.rot * 0.6).toFixed(3) + 'rad)', width: Math.round(lw) + 'px', height: Math.round(stoneH(s) - 6) + 'px' }); } }
        });
        clouds.forEach(c => {
          const g0 = c.grow == null ? 1 : c.grow, lw = parseFloat(c.lab.style.width) || 120, x = c.x - lw / 2, y = c.y - 22 - 2 * M.k;
          const key = Math.round(x) + ',' + Math.round(y); if (key !== c.key) { c.key = key; c.lab.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)'; }
          // the words ride along while the cloud is in view and fade before it slips off an edge (drift speed sets the margin)
          const m = 14 + Math.abs(c.vx) * (1 + c.boost * 5) * 0.8, hid = cardBoxes().some(b => x < b.x + b.w && x + lw > b.x && y < b.y + b.h && y + 48 > b.y); // never peek out from under a card
          const op = g0 > 0.85 && x > m && x + lw < M.W - m && !hid ? '1' : '0'; if (c.lab.style.opacity !== op) c.lab.style.opacity = op;
        });
      }
      const HUDC = { s: -1, l: -1, b: -1, c: -1 };
      function hudTick(bump) {
        const total = ORDER.length + 1, ns = Math.min(total, st.sorted), nl = levers().filter(s => st.phase === 'sort' || s.lever.pulled || st.phase !== 'pull').length, nb = bridges().length, nc = clouds.length;
        const set = (el2, key, v, txt) => { if (HUDC[key] === v) return; HUDC[key] = v; el2.lastChild.textContent = txt; if (bump) { el2.classList.remove('bump'); void el2.offsetWidth; el2.classList.add('bump'); } };
        set(hS, 's', ns, ns + '/' + total + ' sorted');
        set(hL, 'l', st.phase === 'pull' || st.phase === 'finale' || st.phase === 'done' ? 'p' + levers().filter(s => s.lever.pulled).length : nl, st.phase === 'pull' || st.phase === 'finale' || st.phase === 'done' ? levers().filter(s => s.lever.pulled).length + '/' + levers().length : String(nl));
        set(hB, 'b', nb, String(nb)); set(hC, 'c', nc, String(nc));
      }
      hS.setAttribute('aria-label', 'Stones sorted'); hL.setAttribute('aria-label', 'Levers'); hB.setAttribute('aria-label', 'Bridges'); hC.setAttribute('aria-label', 'Clouds');

      /* ---------------- tapping the sand: it answers too ---------------- */
      K.press(sand, { down: (p) => { if (st.drag) return; const x = p.x + M.cx - M.rx, y = p.y + M.cy - M.ry; if (!ringAt(x, y)) return; rippleAt(x, y, 'influence'); SFX.sand(); if (A.ctx) SFX.flute(PENT[2 + Math.floor(Math.random() * 5)], gridT(2)); } });

      /* ---------------- frame loop ---------------- */
      cv.onResize(() => layout());
      S.on('theme', () => { st.statOK = false; st.gardenOK = false; st.trayOK = false; stones.forEach(s => { s.sp = null; }); clouds.forEach(c => { c.sp = null; }); });
      const SOFT = softwareGfx();
      let odd = false;
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !M.W) return;
        if (SOFT && !st.drag && (odd = !odd)) return; // CPU-only rendering: an even 30 fps (the sim runs on real time), full rate while a stone is in hand
        st.fn++; if (dt > 0.034) st.slow++;
        if (st.fn >= 120) { if (st.slow > 40 && st.q > 0.7) { st.q = 0.7; cv.setQuality(st.q); } st.fn = 0; st.slow = 0; }
        if (!st.statOK) renderStatic();
        update(dt, t);
        const sh = st.shakeT && !RM() ? Math.max(0, 1 - (now() - st.shakeT) / 260) * st.shakeA : 0;
        g.save(); if (sh > 0.05) g.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
        draw(g, t);
        g.restore();
        domTick();
      });

      /* ---------------- start ---------------- */
      (async () => {
        hudTick(false); // the counters read 0 from the first frame, never blank
        await K.intro({ title: 'Circle of Control', sub: 'Some worries are yours to act on. Some you can only nudge. Some are just weather.', how: 'Drag each stone into a ring. Split the big one. Pull your levers.', char: 'still', mood: 'calm' });
        musicOn();
        st.phase = 'deal';
        say(still, L(LINES.intro), { mood: 'calm', ms: 4600 });
        if (M.marks && M.marks.length) { const m = M.marks[M.marks.length - 1]; K.later(() => say(patch, L({ Jolly: 'Look, the town built a ' + ({ tea: 'tea house', pagoda: 'pagoda', pond: 'koi pond' })[m] + ' since you were last here!', Cheeky: 'New in town: a ' + ({ tea: 'tea house', pagoda: 'pagoda', pond: 'koi pond' })[m] + '. Fancy.', Unfiltered: 'New: ' + ({ tea: 'tea house', pagoda: 'pagoda', pond: 'koi pond' })[m] + '.' }), { mood: 'happy', ms: 3000 }), 4800); }
        stones.filter(isGen).forEach((s, i) => { s.state = 'wait'; K.later(() => { s.x = M.W + stoneW(s); s.y = M.tray.y + M.tray.h / 2; s.state = 'deal'; s.el.hidden = false; st.trayDirty = true; K.later(() => { if (s.state === 'deal') { s.state = 'tray'; SFX.clack(0.5); } }, 380); }, (RM() ? 80 : 220) * i + 200); });
        await K.wait((RM() ? 80 : 220) * ORDER.length + 800);
        st.phase = 'sort'; hudTick(false);
        guideNow(1600);
        K.later(() => { if (st.phase === 'sort' && st.sorted === 0) say(still, L(LINES.intro2), { mood: 'think', ms: 3200 }); }, 4600);
      })();

      return {
        async autoplay() {
          const wait = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(90); return fn(); };
          const dragTo = async (s, pt) => { const r = K.rectIn(s.el); await K.sim.drag(s.el, { x: r.w / 2, y: r.h / 2 }, { x: pt.x - r.x, y: pt.y - r.y - 0.2 * stoneH(s) + 10 * M.k }, 700, 18); };
          await wait(() => st.phase === 'sort', 30000);
          await K.wait(900);
          let wrong = false;
          const t0 = now();
          while (st.phase === 'sort' && now() - t0 < 90000) {
            if (twist.state === 'cracked') { await K.sim.tap(twist.el); await K.wait(520); continue; }
            const s = nextTray();
            if (!s || st.lockTray) { await K.wait(200); continue; }
            let ring = s.kind === 'twist' ? 'notmine' : s.kind;
            if (!wrong && s.kind === 'notmine') { ring = 'control'; wrong = true; }
            const pt = ring === 'control' ? { x: M.cx, y: M.cy } : ringPoint(ring, ring === 'influence' ? 3.6 : 2.4);
            await dragTo(s, pt);
            await wait(() => !['drag', 'placing', 'refuse'].includes(s.state), 4000);
            await K.wait(650);
          }
          await wait(() => st.phase === 'pull', 30000);
          await K.wait(1200);
          for (let i = 0; i < 6 && st.phase === 'pull'; i++) {
            const s = levers().find(x => !x.lever.pulled); if (!s) break;
            const r = K.rectIn(s.lever.el);
            await K.sim.drag(s.lever.el, { x: r.w / 2, y: r.h * 0.25 }, { x: r.w / 2, y: r.h * 0.25 + 80 * M.k }, 650, 16);
            await K.wait(1500);
          }
          await wait(() => st.finished, 40000);
        }
      };
    }
  });
})(window.TSG_ENV);
