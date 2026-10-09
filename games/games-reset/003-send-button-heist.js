/* 003 Send Button Heist — Reset · CHOOSE · Urges / Habit Loops
 * Mechanism: urge surfing (Marlatt; Bowen et al.). An urge rises, peaks and passes within minutes if you don't act on it.
 * The player guards a vault while the urge (Rush, a cat burglar) sneaks toward the SEND button; every laser re-route costs
 * him time, so the impulsive send is delayed by about 75 seconds while the urge wave crests and falls, then becomes a draft.
 * Verb: guard (tap laser switches to block his lane). Finale: Rush falls asleep at the pedestal, SEND turns into a locked
 * DRAFT SAVED deposit box, the alarm red cools to blue and your own laser beams shower down as sparkles.
 */
(function (env) {
  'use strict';
  (env.games = env.games || []).push({
    id: 'send-button-heist', mode: 'reset', name: 'Send Button Heist', verb: 'guard', family: 'CHOOSE', minutes: 2,
    parents: ['Urges / Habit Loops', 'Communication / Boundaries'],
    cast: ['rush'], poster: { char: 'rush', mood: 'determined' },
    tagline: 'Guard the SEND button with lasers while the urge peaks and passes.',
    why: 'For an urge to send, text or act right now: ride the wave out without acting on it.',
    css: `
.g-send-button-heist { --hb-fg: #eef1ff; }
.g-send-button-heist .hb-hud { position: absolute; z-index: 32; left: 12px; right: 12px; top: calc(env(safe-area-inset-top, 0px) + 60px); margin: 0 auto; max-width: 520px; padding: 7px 12px 6px; border-radius: 16px;
  background: linear-gradient(180deg, rgba(18, 20, 48, 0.86), rgba(8, 10, 28, 0.82)); border: 1px solid rgba(150, 165, 255, 0.26); box-shadow: 0 10px 28px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.07);
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); color: var(--hb-fg); pointer-events: none; }
.g-send-button-heist .hb-row { display: flex; align-items: center; gap: 8px; font: 700 12px/1 var(--font-ui); letter-spacing: 0.12em; text-transform: uppercase; white-space: nowrap; }
.g-send-button-heist .hb-ph { padding: 4px 8px 3px; border-radius: 999px; background: rgba(255, 61, 99, 0.26); color: #ffd6df; transition: background 0.6s ease, color 0.6s ease; }
.g-send-button-heist .hb-ph.peak { background: rgba(255, 45, 85, 0.62); color: #fff; }
.g-send-button-heist .hb-ph.fall { background: rgba(90, 184, 255, 0.26); color: #dcefff; }
.g-send-button-heist .hb-re { color: #b9c2ee; letter-spacing: 0.08em; }
.g-send-button-heist .hb-tm { margin-left: auto; font: 700 14px/1 var(--font-ui); letter-spacing: 0.03em; font-variant-numeric: tabular-nums; }
.g-send-button-heist .hb-wave { position: relative; height: 30px; margin-top: 5px; }
.g-send-button-heist .hb-target { position: absolute; z-index: 20; left: 50%; top: 0; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; gap: 9px; pointer-events: none; }
.g-send-button-heist .hb-neon { font: 800 16px/1.15 var(--font-ui); letter-spacing: 0.08em; text-transform: uppercase; color: #ffe6f6; text-align: center; padding: 6px 13px 5px; border-radius: 10px; width: max-content;
  max-width: min(300px, calc(100cqw - 40px)); border: 2px solid rgba(255, 92, 200, 0.92); background: rgba(42, 6, 38, 0.7); text-wrap: balance;
  box-shadow: 0 0 16px rgba(255, 70, 190, 0.55), inset 0 0 12px rgba(255, 70, 190, 0.35); text-shadow: 0 0 8px rgba(255, 90, 200, 0.95); transition: color 1.2s ease, border-color 1.2s ease, box-shadow 1.2s ease, text-shadow 1.2s ease, background 1.2s ease; }
.g-send-button-heist .hb-calm .hb-neon { color: #e4f3ff; border-color: rgba(110, 196, 255, 0.92); background: rgba(6, 22, 48, 0.72); box-shadow: 0 0 16px rgba(80, 170, 255, 0.5), inset 0 0 12px rgba(80, 170, 255, 0.3); text-shadow: 0 0 8px rgba(110, 196, 255, 0.95); }
.g-send-button-heist .hb-btn { position: relative; width: 108px; height: 64px; transition: transform 0.45s cubic-bezier(.5, -0.4, .7, 1), opacity 0.4s ease; }
.g-send-button-heist .hb-dome { position: absolute; left: 8px; right: 8px; top: 0; bottom: 12px; border-radius: 50% 50% 14px 14px / 78% 78% 14px 14px; display: grid; place-items: center;
  background: radial-gradient(ellipse at 50% 24%, #ffd0da 0%, #ff4a6e 34%, #d1103a 70%, #6e0018 100%); box-shadow: 0 0 calc(16px + var(--pulse, 0) * 26px) rgba(255, 40, 80, 0.85), inset 0 -7px 10px rgba(0, 0, 0, 0.35), inset 0 3px 4px rgba(255, 255, 255, 0.35); }
.g-send-button-heist .hb-dome b { font: 800 18px/1 var(--font-display); letter-spacing: 0.08em; color: #fff; text-shadow: 0 2px 0 rgba(90, 0, 20, 0.6), 0 0 10px rgba(255, 200, 210, 0.6); padding-top: 4px; }
.g-send-button-heist .hb-base { position: absolute; left: 0; right: 0; bottom: 0; height: 16px; border-radius: 8px; background: linear-gradient(180deg, #5b6386, #262a44 60%, #15172a); box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5); }
.g-send-button-heist .hb-drafted .hb-btn::before { content: "DRAFT"; position: absolute; z-index: 2; right: -16px; top: -10px; font: 800 12px/1 var(--font-ui); letter-spacing: 0.08em; color: #251a05; background: #ffd36b; padding: 5px 7px 4px; border-radius: 6px; transform: rotate(10deg); box-shadow: 0 3px 8px rgba(0, 0, 0, 0.45); }
.g-send-button-heist .hb-shield .hb-btn::after { content: ""; position: absolute; left: -6px; right: -6px; top: -10px; bottom: 6px; border-radius: 50% 50% 18px 18px / 80% 80% 18px 18px; border: 2px solid rgba(140, 214, 255, 0.95);
  background: radial-gradient(ellipse at 50% 30%, rgba(170, 225, 255, 0.4), rgba(80, 160, 255, 0.14) 62%, rgba(80, 160, 255, 0.05)); box-shadow: 0 0 22px rgba(90, 180, 255, 0.75), inset 0 0 14px rgba(140, 214, 255, 0.45); }
.g-send-button-heist .hb-lock { position: absolute; left: 50%; top: calc(100% + 8px); transform: translateX(-50%); white-space: nowrap; font: 700 13px/1 var(--font-ui); letter-spacing: 0.06em; text-transform: uppercase; color: #d8efff;
  background: rgba(8, 26, 56, 0.88); border: 1px solid rgba(130, 205, 255, 0.7); border-radius: 999px; padding: 6px 10px 5px; box-shadow: 0 0 14px rgba(90, 180, 255, 0.45); }
.g-send-button-heist .hb-box { position: absolute; left: 50%; bottom: 0; width: 138px; height: 84px; margin-left: -69px; border-radius: 12px; opacity: 0; transform: scale(0.4) translateY(30px); transform-origin: 50% 100%;
  background: linear-gradient(180deg, #a6b6da 0%, #6476a3 40%, #3c4a72 100%); border: 2px solid #c9d7f6; box-shadow: 0 0 26px rgba(90, 170, 255, 0.6), inset 0 2px 0 rgba(255, 255, 255, 0.45), inset 0 -6px 12px rgba(0, 0, 0, 0.3);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding-top: 10px; overflow: hidden; transition: transform 0.6s cubic-bezier(.2, 1.45, .4, 1), opacity 0.3s ease; }
.g-send-button-heist .hb-slot { position: absolute; top: 9px; left: 50%; width: 64px; height: 6px; margin-left: -32px; border-radius: 3px; background: #1a2240; box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.7), 0 1px 0 rgba(255, 255, 255, 0.35); }
.g-send-button-heist .hb-box-t { font: 800 15px/1.05 var(--font-display); letter-spacing: 0.06em; color: #fff; text-shadow: 0 2px 0 rgba(20, 30, 70, 0.55); }
.g-send-button-heist .hb-box-s { font: 600 13px/1.1 var(--font-ui); color: #eaf3ff; text-shadow: 0 1px 0 rgba(20, 30, 70, 0.6); }
.g-send-button-heist .hb-bolt { position: absolute; right: -2px; bottom: 7px; width: 46px; height: 12px; border-radius: 6px 0 0 6px; background: linear-gradient(180deg, #f3f7ff, #9aa9cc); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  transform: translateX(52px); transition: transform 0.22s cubic-bezier(.6, 0, .9, .4); }
.g-send-button-heist .hb-morph .hb-btn { transform: scale(0.1) translateY(30px); opacity: 0; }
.g-send-button-heist .hb-morph .hb-box { opacity: 1; transform: none; }
.g-send-button-heist .hb-locked .hb-bolt { transform: none; }
.g-send-button-heist .hb-locked .hb-box { animation: hb-chunk 0.38s ease; }
@keyframes hb-chunk { 0% { transform: none; } 30% { transform: translateY(3px) scale(1.02, 0.97); } 60% { transform: translateY(-1px); } 100% { transform: none; } }
.g-send-button-heist .hb-ask { position: absolute; z-index: 33; left: 50%; top: 0; transform: translateX(-50%); width: max-content; max-width: min(320px, calc(100% - 32px)); text-align: center; display: flex; flex-direction: column; gap: 3px;
  font: 500 15px/1.35 var(--font-ui); color: var(--ui-fg); background: var(--ui-surface); border: 1px solid var(--ui-line); border-radius: 16px; padding: 11px 16px 12px; box-shadow: 0 14px 34px rgba(0, 0, 0, 0.45); animation: gk-say 0.3s cubic-bezier(.2, 1.4, .4, 1) both; }
.g-send-button-heist .hb-ask b { font: 700 17px/1.2 var(--font-ui); }
.g-send-button-heist .hb-ask::before { content: ""; position: absolute; left: 50%; top: -7px; width: 13px; height: 13px; margin-left: -7px; background: inherit; border-left: 1px solid var(--ui-line); border-top: 1px solid var(--ui-line); transform: rotate(45deg); }
.g-send-button-heist .hb-ctrl { position: absolute; z-index: 34; left: 0; right: 0; bottom: calc(env(safe-area-inset-bottom, 0px) + 16px); height: 106px; pointer-events: none; transition: opacity 0.6s ease, transform 0.6s ease; }
.g-send-button-heist .hb-ctrl.hb-gone { opacity: 0; transform: translateY(18px); }
.g-send-button-heist .hb-sw { pointer-events: auto; position: absolute; bottom: 30px; left: 0; width: var(--sww, 104px); height: 70px; margin-left: calc(var(--sww, 104px) / -2); padding: 7px 6px 8px; border-radius: 18px; cursor: pointer; touch-action: manipulation;
  display: flex; flex-direction: column; align-items: center; justify-content: space-between; gap: 4px; color: #e9edff; font: 700 14px/1 var(--font-ui); letter-spacing: 0.08em; text-transform: uppercase;
  background: linear-gradient(180deg, #2a3160 0%, #171b38 55%, #0f1229 100%); border: 1px solid rgba(130, 150, 255, 0.4); box-shadow: 0 8px 18px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  transition: transform 0.12s ease, box-shadow 0.25s ease, border-color 0.25s ease, opacity 0.3s ease; }
.g-send-button-heist .hb-sw:active { transform: scale(0.95); }
.g-send-button-heist .hb-sw:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.g-send-button-heist .hb-sw-top { display: flex; align-items: center; gap: 8px; }
.g-send-button-heist .hb-led { width: 10px; height: 10px; border-radius: 50%; background: #4a1a2a; box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.6); transition: background 0.2s ease, box-shadow 0.2s ease; }
.g-send-button-heist .hb-lev { position: relative; width: 34px; height: 22px; border-radius: 11px; background: #0a0c1d; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.8), 0 1px 0 rgba(255, 255, 255, 0.1); }
.g-send-button-heist .hb-lev::after { content: ""; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #f4f6ff, #8d96c4 70%, #5a6290); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.6); transition: transform 0.18s cubic-bezier(.3, 1.6, .5, 1), background 0.2s ease; }
.g-send-button-heist .hb-sw[aria-pressed="true"] { border-color: #ff4d6d; box-shadow: 0 0 0 1px rgba(255, 77, 109, 0.9), 0 0 24px rgba(255, 45, 85, 0.6), inset 0 0 18px rgba(255, 45, 85, 0.3); background: linear-gradient(180deg, #4a1f3a 0%, #24122a 60%, #160c1f 100%); }
.g-send-button-heist .hb-sw[aria-pressed="true"] .hb-led { background: #ff3d63; box-shadow: 0 0 10px #ff3d63, 0 0 3px #fff inset; }
.g-send-button-heist .hb-sw[aria-pressed="true"] .hb-lev::after { transform: translateX(12px); background: radial-gradient(circle at 40% 35%, #fff2f4, #ff6a86 60%, #c2183e); }
.g-send-button-heist .hb-sw.hb-drop { animation: hb-drop 0.5s ease; }
@keyframes hb-drop { 0%, 100% { border-color: rgba(130, 150, 255, 0.4); } 35% { border-color: #ffd36b; box-shadow: 0 0 18px rgba(255, 211, 107, 0.6); } }
.g-send-button-heist .hb-power { position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); display: flex; align-items: center; gap: 6px; white-space: nowrap; font: 700 12px/1 var(--font-ui); letter-spacing: 0.12em; text-transform: uppercase;
  color: #c9d0f5; background: rgba(8, 10, 26, 0.72); border: 1px solid rgba(130, 150, 255, 0.22); padding: 5px 11px 4px; border-radius: 999px; }
.g-send-button-heist .hb-power i { width: 15px; height: 7px; border-radius: 4px; background: rgba(255, 255, 255, 0.16); transition: background 0.2s ease, box-shadow 0.2s ease; }
.g-send-button-heist .hb-power i.on { background: #ff3d63; box-shadow: 0 0 8px rgba(255, 61, 99, 0.85); }
.g-send-button-heist .hb-choosing .hb-sw, .g-send-button-heist .hb-choosing .hb-power { opacity: 0; pointer-events: none; }
.g-send-button-heist .hb-choice { position: absolute; left: 12px; right: 12px; bottom: 34px; display: flex; justify-content: center; }
.g-send-button-heist .hb-choice .gk-chips { gap: 10px; }
.g-send-button-heist .hb-choice .gk-chip { pointer-events: auto; font: 700 16px/1.1 var(--font-ui); min-height: 52px; padding: 14px 20px; box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45); animation: gk-say 0.3s cubic-bezier(.2, 1.4, .4, 1) both; }
.g-send-button-heist .hb-choice .gk-chip:first-child { background: var(--ui-accent); color: var(--ui-accent-ink); border-color: transparent; }
.g-send-button-heist .hb-rush .gk-bubble { max-width: min(250px, calc(100cqw - 24px)); }
.g-send-button-heist .hb-rush.gk-side-above .gk-bubble::after, .g-send-button-heist .hb-rush.gk-side-below .gk-bubble::after { content: ""; position: absolute; left: calc(var(--ax, 40px) - 7px); width: 13px; height: 13px; background: inherit; transform: rotate(45deg); }
.g-send-button-heist .hb-rush.gk-side-above .gk-bubble::after { bottom: -7px; border-right: 1px solid var(--ui-line); border-bottom: 1px solid var(--ui-line); }
.g-send-button-heist .hb-rush.gk-side-below .gk-bubble::after { top: -7px; border-left: 1px solid var(--ui-line); border-top: 1px solid var(--ui-line); }
@container (min-width: 700px) {
  .g-send-button-heist .hb-btn { width: 128px; height: 74px; }
  .g-send-button-heist .hb-dome b { font-size: 22px; }
  .g-send-button-heist .hb-neon { font-size: 18px; max-width: 420px; }
  .g-send-button-heist .hb-box { width: 168px; height: 98px; margin-left: -84px; }
  .g-send-button-heist .hb-box-t { font-size: 18px; } .g-send-button-heist .hb-box-s { font-size: 14px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis;
      const inten = ctx.intensity;
      const LANES = [2, 3, 4][inten], POWER = LANES - 1, BASE_T = [55, 70, 85][inten], SPD = [0.8, 1, 1.12][inten];
      const GATES = [0.25, 0.5, 0.75], XP = 0.4, STOP = 0.045, PLEA_X = 0.54;
      const FONT = '"Fredoka", "Nunito", "Trebuchet MS", system-ui, sans-serif';
      const urgeLabel = cleanUrge(an.urge) || 'SEND IT NOW';
      const line = (o) => ctx.line(o);

      /* ---------------- lines (every vibe) ---------------- */
      const LN = {
        start: { Jolly: 'Psst! That SEND button is calling my name. Bet you can’t stop me!', Cheeky: 'Nice vault. Shame about the security. Back in a sec with that SEND.', Unfiltered: 'I want it and I want it NOW. Try and stop me.' },
        block1: { Jolly: 'Lasers?! Rude. Re-routing…', Cheeky: 'Oh, we’re doing lasers. Fine. Plan B.', Unfiltered: 'Ugh. Lasers. Going round.' },
        block: { Jolly: ['Hmph. Another way, then!', 'You’re annoyingly good at this.', 'Blocked again!'], Cheeky: ['Rude. Re-routing.', 'Okay, show-off.', 'Do you ever blink?'], Unfiltered: ['Seriously?', 'Again?!', 'Fine. Round the side.'] },
        slip: { Jolly: ['Wheee! Too slow!', 'One gate down!'], Cheeky: ['Yoink. Through!', 'Missed me!'], Unfiltered: ['Through. Ha.', 'Next gate.'] },
        peak: { Jolly: 'Peak urge! My fanciest move. This is the hardest bit, and it passes.', Cheeky: 'Behold my best move. Also the hardest bit. It passes. Annoyingly.', Unfiltered: 'This is the peak. Hardest bit. It passes. Just not yet!' },
        plea: { Jolly: 'Just one tiny peek? Pleeease?', Cheeky: 'Just one tiny peek? I’ll be quick. Ish.', Unfiltered: 'Just one tiny peek. Come on.' },
        notNow: { Jolly: 'Fair enough. Worth a try!', Cheeky: 'Rejected. Classic. I respect it.', Unfiltered: 'Fine. Noted. Sulking now.' },
        draft: { Jolly: 'A draft! Not a no, just a later. I can live with later.', Cheeky: 'Ooh, a draft. Safe, just not sent. Sneaky.', Unfiltered: 'Draft. Not sent. Fine, I’ll take it.' },
        silent: { Jolly: 'I’ll take that as a not now.', Cheeky: 'Silence. Got it. Not now.', Unfiltered: 'No answer. Fine. Not now.' },
        fall: { Jolly: 'Is it me, or is that button less shiny now? Yawn.', Cheeky: 'Still want it. Just… less. Yawn.', Unfiltered: 'Losing steam. Don’t tell anyone.' },
        fall2: { Jolly: 'Maybe I’ll just… sit for a sec.', Cheeky: 'This heist is… quite long, actually.', Unfiltered: 'Legs tired. Urge tired. Me tired.' },
        reach: { Jolly: 'Made it! …Huh. Do I still want this?', Cheeky: 'Ta-da! Now… do I actually want this?', Unfiltered: 'Got here. Weirdly less fussed now.' },
        wait: { Jolly: 'Thirty seconds. I’ll just… wander back.', Cheeky: 'Thirty whole seconds? Rude. Fine.', Unfiltered: 'Thirty seconds. Ugh. Okay.' },
        shield: { Jolly: 'Boing! Still time-locked. Fair.', Cheeky: 'A force field? Who installs a force field?', Unfiltered: 'Locked. Of course it is.' },
        sleep: { Jolly: 'Zzz… decide tomorrow… zzz…', Cheeky: 'Wake me tomorrow. Or don’t.', Unfiltered: 'Done. Asleep. Tomorrow.' }
      };

      /* ---------------- state ---------------- */
      const W = { stage: 'intro', t: 0, T: BASE_T, urge: urgeAt(0), phase: 'rise', tint: 0, tintGoal: 0, flat: 0, peaked: false, fell: false, plead: false, said: {},
        lock: -1, reaches: 0, choice: null, choiceT: 0, draft: false, alarm: 0, taps: 0, shower: 0, endT: 0 };
      const RU = { v: 0, lx: Math.floor((LANES - 1) / 2), tl: 0, state: 'idle', timer: 0, reroutes: 0, slips: 0, sx: 0, sy: 0, sz: 76, stepT: 0, lineAt: -9, bonks: 0, burst: 0, sleepK: 0 };
      RU.tl = RU.lx;
      const lasers = Array.from({ length: LANES }, () => ({ up: false, k: 0, at: 0, ph: Math.random() * 6 }));
      let seq = 0, finished = false;

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el);
      const P = K.particles({ max: 720 });
      const hudPh = h('span', { class: 'hb-ph', text: 'Rising' });
      const hudRe = h('span', { class: 'hb-re', text: 'Re-routes 0' });
      const hudTm = h('span', { class: 'hb-tm', text: '0:00' });
      const waveWrap = h('div', { class: 'hb-wave' });
      const hud = h('div', { class: 'hb-hud', role: 'status' }, h('div', { class: 'hb-row' }, h('span', { text: 'Urge' }), hudPh, hudRe, hudTm), waveWrap);
      const neon = h('div', { class: 'hb-neon gk-user', text: urgeLabel });
      const dome = h('div', { class: 'hb-dome' }, h('b', { text: 'SEND' }));
      const lockPill = h('div', { class: 'hb-lock', hidden: true }, 'Time-lock ', h('span', { text: '0:30' }));
      const btn = h('div', { class: 'hb-btn' }, dome, h('i', { class: 'hb-base' }), lockPill);
      const box = h('div', { class: 'hb-box', hidden: true }, h('i', { class: 'hb-slot' }), h('span', { class: 'hb-box-t', text: 'DRAFT SAVED' }), h('span', { class: 'hb-box-s', text: 'decide tomorrow' }), h('i', { class: 'hb-bolt' }));
      const target = h('div', { class: 'hb-target' }, neon, btn, box);
      const ask = h('div', { class: 'hb-ask', role: 'status', hidden: true }, h('b', { text: 'Still want to send?' }), h('span', { text: 'Wait 30 more seconds?' }));
      const ctrl = h('div', { class: 'hb-ctrl' });
      const sw = [];
      for (let i = 0; i < LANES; i++) {
        const b = h('button', { type: 'button', class: 'hb-sw', 'aria-pressed': 'false', 'aria-label': 'Laser switch, lane ' + (i + 1) + ' of ' + LANES },
          h('span', { class: 'hb-sw-top' }, h('i', { class: 'hb-led' }), h('i', { class: 'hb-lev' })), h('span', { class: 'hb-sw-t', text: 'Block' }));
        K.tap(b, () => toggle(i));
        sw.push(b); ctrl.append(b);
      }
      const pips = [];
      const power = h('div', { class: 'hb-power' }, h('span', { text: 'Laser power' }));
      for (let i = 0; i < POWER; i++) { const p = h('i'); pips.push(p); power.append(p); }
      const choiceWrap = h('div', { class: 'hb-choice' });
      ctrl.append(power, choiceWrap);
      el.append(target, ask, hud, ctrl);
      const wv = K.canvas(waveWrap);
      const rush = K.character('rush', { side: 'above', mood: 'determined', x: -300, y: -300, size: 76 });
      rush.el.classList.add('hb-rush');
      K.onKey(['Digit1', 'Digit2', 'Digit3', 'Digit4'], (e) => { const i = Number(String(e.code).slice(-1)) - 1; if (i < LANES) toggle(i); });

      const music = K.music('arcade');
      music.level(0.3);
      let hum = null;

      /* ---------------- geometry: one-point perspective vault ---------------- */
      const L = { w: 390, h: 844, cx: 195, yNear: 692, yFar: 300, half: 183, K: 784, yH: -92, pedH: 58, pedW: 86, base: 76, ring: 80, ringY: 210, phone: true };
      function zOfV(v) { const sy = L.yNear - v * (L.yNear - L.yFar); return L.K / (sy - L.yH); }
      function proj(x, y, z) { return [L.cx + L.half * x / z, L.yH + (L.K - y * L.half) / z]; }
      const laneWX = (lx) => -1 + (2 * lx + 1) / LANES;
      const laneSX = (lx, z) => L.cx + L.half * laneWX(lx) / z;
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700;
        L.w = w; L.h = H; L.phone = phone; L.cx = w / 2;
        L.yNear = H - (phone ? 152 : 160);
        L.yFar = Math.round(phone ? Math.max(290, H * 0.355) : Math.max(320, H * 0.4));
        L.half = Math.min(w / 2 - (phone ? 12 : 60), phone ? 196 : 320);
        L.K = 2 * (L.yNear - L.yFar); L.yH = 2 * L.yFar - L.yNear;
        L.pedH = phone ? 58 : 76; L.pedW = phone ? 86 : 118;
        L.base = phone ? 76 : 96;
        const btnH = phone ? 64 : 74;
        L.ringY = L.yFar - L.pedH - btnH * 0.5 - 4;
        L.ring = Math.min(L.half * 0.5 * 0.9, phone ? 84 : 118, L.yFar - L.ringY - 6);
        L.boxY = L.yFar - L.pedH - (phone ? 42 : 49);
        target.style.top = (L.yFar - L.pedH + 4) + 'px';
        ask.style.top = (L.yFar + 18) + 'px';
        const ySw = H - 16 - 30 - 35, zSw = L.K / (ySw - L.yH);
        const spread = Math.min(L.half / zSw, (w - 24) / 2 - (w - 24) / (2 * LANES));
        const sww = Math.min((2 * spread) / Math.max(1, LANES - 1) - 10, phone ? 112 : 150, (w - 24) / LANES - 8);
        sw.forEach((b, i) => { b.style.left = (L.cx + (LANES > 1 ? (-1 + 2 * i / (LANES - 1)) * spread : 0)) + 'px'; b.style.setProperty('--sww', Math.max(64, sww) + 'px'); });
        buildBg();
        placeRush(0);
      }

      /* ---------------- the static vault, drawn once per size ---------------- */
      let bgC = null;
      function poly(g, pts) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); }
      function neonLine(g, a, b, col, wid) {
        g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
        [[wid * 4, 0.1], [wid * 2, 0.22], [wid, 0.9]].forEach(([lw, al]) => { g.strokeStyle = K.hexA(col, al); g.lineWidth = lw; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); });
        g.restore();
      }
      function buildBg() {
        const w = L.w, H = L.h, dpr = Math.min(2, window.devicePixelRatio || 1);
        if (!w || !H) return;
        if (!bgC) bgC = document.createElement('canvas');
        bgC.width = Math.max(1, Math.round(w * dpr)); bgC.height = Math.max(1, Math.round(H * dpr));
        const g = bgC.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const D = K.dark();
        const C = D ? { void: '#04050d', wallA: '#151a3c', wallB: '#0a0d24', floorA: '#141842', floorB: '#06071a', box: [26, 31, 70], far: '#0d1030', ped: ['#3a4270', '#1a1e3c', '#0c0e20'], cyan: '#36e2ff', mag: '#ff3fd2' }
          : { void: '#0b1230', wallA: '#2a3570', wallB: '#18204c', floorA: '#25306a', floorB: '#111a42', box: [44, 54, 112], far: '#1a2356', ped: ['#56609a', '#2a3366', '#171d40'], cyan: '#5cf0ff', mag: '#ff6fe0' };
        const zN = 0.3, WH = 4.4;
        g.fillStyle = C.void; g.fillRect(0, 0, w, H);
        // far wall
        poly(g, [proj(-1, 0, 2), proj(1, 0, 2), proj(1, WH, 2), proj(-1, WH, 2)]);
        g.fillStyle = C.far; g.fill();
        const fx0 = proj(-1, 0, 2)[0], fx1 = proj(1, 0, 2)[0];
        g.strokeStyle = 'rgba(255,255,255,0.045)'; g.lineWidth = 1;
        for (let x = fx0 + 12; x < fx1; x += 14) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, L.yFar); g.stroke(); }
        // floor
        poly(g, [proj(-1, 0, zN), proj(1, 0, zN), proj(1, 0, 2), proj(-1, 0, 2)]);
        let gr = g.createLinearGradient(0, L.yFar, 0, H); gr.addColorStop(0, C.floorB); gr.addColorStop(1, C.floorA);
        g.fillStyle = gr; g.fill();
        // floor tiles
        g.save(); poly(g, [proj(-1, 0, zN), proj(1, 0, zN), proj(1, 0, 2), proj(-1, 0, 2)]); g.clip();
        for (let z = 0.6; z <= 2.001; z += 0.1) { const a = proj(-1, 0, z), b = proj(1, 0, z); g.strokeStyle = `rgba(150,170,255,${0.05 + 0.04 / z})`; g.lineWidth = 1; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
        for (let x = -1; x <= 1.001; x += 2 / (LANES * 2)) { const a = proj(x, 0, zN), b = proj(x, 0, 2); g.strokeStyle = 'rgba(150,170,255,0.05)'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
        const sheen = g.createRadialGradient(L.cx, L.yFar + 30, 10, L.cx, L.yFar + 30, L.half * 1.3);
        sheen.addColorStop(0, D ? 'rgba(120,140,255,0.16)' : 'rgba(150,170,255,0.2)'); sheen.addColorStop(1, 'rgba(120,140,255,0)');
        g.fillStyle = sheen; g.fillRect(0, L.yFar, w, H - L.yFar);
        g.restore();
        // side walls with safe-deposit boxes
        for (const sx of [-1, 1]) {
          poly(g, [proj(sx, 0, zN), proj(sx, 0, 2), proj(sx, WH, 2), proj(sx, WH, zN)]);
          gr = g.createLinearGradient(sx < 0 ? 0 : w, 0, L.cx + sx * L.half * 0.5, 0); gr.addColorStop(0, C.wallA); gr.addColorStop(1, C.wallB);
          g.fillStyle = gr; g.fill();
          const zs = []; for (let z = 0.36; z < 2; z *= 1.16) zs.push(z); zs.push(2);
          for (let c = 0; c < zs.length - 1; c++) {
            for (let y = 0.22; y < WH - 0.2; y += 0.34) {
              const z0 = zs[c] + 0.012 * zs[c], z1 = zs[c + 1] - 0.012 * zs[c], y0 = y + 0.03, y1 = y + 0.31;
              const q = [proj(sx, y0, z0), proj(sx, y0, z1), proj(sx, y1, z1), proj(sx, y1, z0)];
              if (Math.max(q[0][1], q[1][1]) < -10 || Math.min(q[2][1], q[3][1]) > H + 10) continue;
              const shade = 0.8 + 0.4 * (((c * 7 + Math.round(y * 10) * 3) % 5) / 5), dz = 1 / Math.max(0.6, zs[c]);
              poly(g, q); g.fillStyle = `rgb(${Math.round(C.box[0] * shade + 6 * dz)},${Math.round(C.box[1] * shade + 6 * dz)},${Math.round(C.box[2] * shade + 10 * dz)})`; g.fill();
              g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke();
              const m = proj(sx, (y0 + y1) / 2, (z0 + z1) / 2), r = Math.max(0.8, 2.6 / ((z0 + z1) / 2));
              g.fillStyle = 'rgba(200,210,255,0.35)'; g.beginPath(); g.arc(m[0], m[1], r, 0, K.TAU); g.fill();
            }
          }
          neonLine(g, proj(sx, 0, zN), proj(sx, 0, 2), C.cyan, 1.4);
          neonLine(g, proj(sx, 0, 2), proj(sx, WH, 2), sx < 0 ? C.mag : C.cyan, 1.2);
        }
        neonLine(g, proj(-1, 0, 2), proj(1, 0, 2), C.cyan, 1.2);
        // vault ring behind the button
        const rx = L.cx, ry = L.ringY, rr = L.ring;
        g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(rx, ry + 3, rr + 9, 0, K.TAU); g.fill();
        const disk = g.createRadialGradient(rx, ry - rr * 0.3, rr * 0.1, rx, ry, rr);
        disk.addColorStop(0, D ? '#262c58' : '#323a74'); disk.addColorStop(1, D ? '#0b0d22' : '#151b44');
        g.fillStyle = disk; g.beginPath(); g.arc(rx, ry, rr - 5, 0, K.TAU); g.fill();
        g.strokeStyle = D ? '#1d2246' : '#283068'; g.lineWidth = Math.max(4, rr * 0.07); g.lineCap = 'round';
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.2; g.beginPath(); g.moveTo(rx + Math.cos(a) * rr * 0.3, ry + Math.sin(a) * rr * 0.3); g.lineTo(rx + Math.cos(a) * rr * 0.78, ry + Math.sin(a) * rr * 0.78); g.stroke(); }
        const torus = g.createLinearGradient(rx - rr, ry - rr, rx + rr, ry + rr);
        torus.addColorStop(0, '#d7def6'); torus.addColorStop(0.45, '#56608e'); torus.addColorStop(0.7, '#2c3358'); torus.addColorStop(1, '#a6b0d6');
        g.strokeStyle = torus; g.lineWidth = Math.max(8, rr * 0.13); g.beginPath(); g.arc(rx, ry, rr, 0, K.TAU); g.stroke();
        for (let i = 0; i < 16; i++) { const a = i * K.TAU / 16; g.fillStyle = '#e6ebff'; g.beginPath(); g.arc(rx + Math.cos(a) * rr, ry + Math.sin(a) * rr, Math.max(1.6, rr * 0.03), 0, K.TAU); g.fill(); }
        // pedestal
        const pw = L.pedW, top = L.yFar - L.pedH, px0 = L.cx - pw / 2;
        g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(L.cx, L.yFar + 4, pw * 0.72, 10, 0, 0, K.TAU); g.fill();
        gr = g.createLinearGradient(px0, 0, px0 + pw, 0); gr.addColorStop(0, C.ped[1]); gr.addColorStop(0.35, C.ped[0]); gr.addColorStop(0.7, C.ped[1]); gr.addColorStop(1, C.ped[2]);
        g.fillStyle = gr; g.beginPath(); g.moveTo(px0 + 6, top + 4); g.lineTo(px0 + pw - 6, top + 4); g.lineTo(px0 + pw, L.yFar); g.lineTo(px0, L.yFar); g.closePath(); g.fill();
        g.fillStyle = C.ped[0]; g.beginPath(); g.ellipse(L.cx, top + 4, pw / 2 + 4, 6, 0, 0, K.TAU); g.fill();
        neonLine(g, [px0 + pw * 0.3, top + 12], [px0 + pw * 0.28, L.yFar - 4], C.cyan, 1);
        neonLine(g, [px0 + pw * 0.7, top + 12], [px0 + pw * 0.72, L.yFar - 4], C.cyan, 1);
        // the guard's console (near edge)
        const cy0 = H - (L.phone ? 124 : 130);
        gr = g.createLinearGradient(0, cy0, 0, H); gr.addColorStop(0, D ? '#1b2048' : '#26306a'); gr.addColorStop(0.12, D ? '#0e1130' : '#151c48'); gr.addColorStop(1, D ? '#05060f' : '#0a0f2c');
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, cy0 + 10); g.quadraticCurveTo(L.cx, cy0 - 8, w, cy0 + 10); g.lineTo(w, H); g.lineTo(0, H); g.closePath(); g.fill();
        g.save(); g.globalCompositeOperation = 'lighter';
        [[5, 0.1], [2.2, 0.3], [1, 0.9]].forEach(([lw, al]) => { g.strokeStyle = K.hexA(C.cyan, al); g.lineWidth = lw; g.beginPath(); g.moveTo(0, cy0 + 10); g.quadraticCurveTo(L.cx, cy0 - 8, w, cy0 + 10); g.stroke(); });
        g.restore();
        // vignette
        const vg = g.createRadialGradient(L.cx, H * 0.48, Math.min(w, H) * 0.25, L.cx, H * 0.5, Math.max(w, H) * 0.75);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, D ? 'rgba(0,0,0,0.62)' : 'rgba(4,8,30,0.5)');
        g.fillStyle = vg; g.fillRect(0, 0, w, H);
      }

      /* ---------------- the urge wave (rises, peaks, passes) ---------------- */
      function urgeAt(t) {
        const x = t / BASE_T;
        if (x >= 1) return 0.08;
        let s;
        if (x < XP) { const k = x / XP; s = 0.5 - 0.5 * Math.cos(Math.PI * k); }
        else { const k = (x - XP) / (1 - XP); s = 0.5 + 0.5 * Math.cos(Math.PI * Math.pow(k, 0.85)); }
        return 0.08 + 0.92 * s + 0.035 * Math.sin(x * 23) * s;
      }
      function phaseAt(t) { const x = t / BASE_T; return x < XP - 0.07 ? 'rise' : x < XP + 0.08 ? 'peak' : 'fall'; }

      /* ---------------- sound ---------------- */
      const snd = {
        up(pan) { if (!A.ctx) return; A.tone({ type: 'sawtooth', freq: 160, to: 1250, glide: 0.12, dur: 0.2, vol: 0.045, lp: 2600, pan }); A.noise({ filter: 'highpass', freq: 5200, dur: 0.12, vol: 0.035, pan }); },
        down(pan, soft) { if (!A.ctx) return; A.tone({ type: 'sawtooth', freq: 900, to: 110, glide: 0.2, dur: 0.24, vol: soft ? 0.025 : 0.035, lp: 1800, pan }); },
        bonk(pan) { if (!A.ctx) return; A.tone({ type: 'square', freq: 150, to: 82, glide: 0.1, dur: 0.14, vol: 0.05, lp: 1100, pan }); A.noise({ filter: 'bandpass', freq: 3200, q: 1.5, dur: 0.1, vol: 0.07, pan }); },
        step(pan) { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: 2300 + Math.random() * 700, q: 3, dur: 0.025, vol: 0.02, pan }); },
        whoop() { if (!A.ctx) return; const t0 = A.now(); [0, 0.27].forEach(d => A.tone({ when: t0 + d, type: 'square', freq: 620, to: 930, glide: 0.22, dur: 0.25, vol: 0.02, lp: 1700 })); },
        aww() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 760, to: 520, glide: 0.45, dur: 0.55, vol: 0.06, verb: 0.3 }); },
        shield() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 300, to: 620, glide: 0.35, dur: 0.8, vol: 0.07, verb: 0.5 }); A.chime(A.note('E5'), { vol: 0.06 }); },
        boing() { if (!A.ctx) return; A.boing({ freq: 330, vol: 0.1 }); },
        tick() { if (!A.ctx) return; A.wood(undefined, 0.045, 1.6); },
        clank() { if (!A.ctx) return; A.tone({ type: 'square', freq: 96, to: 58, glide: 0.12, dur: 0.2, vol: 0.12, lp: 700 }); A.noise({ filter: 'bandpass', freq: 1700, q: 5, dur: 0.14, vol: 0.12 }); }
      };

      /* ---------------- lasers + switches ---------------- */
      function upCount() { return lasers.reduce((n, l) => n + (l.up ? 1 : 0), 0); }
      function setLaser(i, up, why) {
        const Lz = lasers[i];
        if (Lz.up === up) return;
        Lz.up = up; Lz.at = ++seq;
        sw[i].setAttribute('aria-pressed', String(up));
        sw[i].querySelector('.hb-sw-t').textContent = up ? 'Blocked' : 'Block';
        const pan = laneWX(i) * 0.7;
        if (up) snd.up(pan); else snd.down(pan, why === 'power');
        if (why === 'power') { sw[i].classList.remove('hb-drop'); void sw[i].offsetWidth; sw[i].classList.add('hb-drop'); }
        GATES.forEach((gv) => { const z = zOfV(gv), a = proj(-1 + 2 * i / LANES, 0.05, z), b = proj(-1 + 2 * (i + 1) / LANES, 0.05, z); P.emit('spark', (a[0] + b[0]) / 2, a[1], up ? 5 : 3, { colors: up ? ['#ff4d6d', '#ffd1dc'] : ['#ff8fb1', '#7fd8ff'], speed: [40, 140] }); });
        const n = upCount(); pips.forEach((p, j) => p.classList.toggle('on', j < n));
      }
      function toggle(i) {
        if (W.stage !== 'play' || W.choice) return;
        K.sfx.tap();
        if (lasers[i].up) setLaser(i, false);
        else {
          const ups = []; lasers.forEach((l, j) => { if (l.up) ups.push(j); });
          if (ups.length >= POWER) { ups.sort((a, b) => lasers[a].at - lasers[b].at); setLaser(ups[0], false, 'power'); }
          setLaser(i, true); W.taps++;
        }
        rushReact();
      }

      /* ---------------- Rush, the urge: run, bonk, re-route ---------------- */
      function nextGate(v) { for (let g = 0; g < GATES.length; g++) if (GATES[g] > v + 0.0005) return g; return -1; }
      function laneAhead() { return RU.state === 'shift' ? RU.tl : Math.round(RU.lx); }
      function nearestOpen(from) { let best = -1, bd = 99; for (let i = 0; i < LANES; i++) { if (lasers[i].up) continue; const d = Math.abs(i - from) + Math.random() * 0.01; if (d < bd) { bd = d; best = i; } } return best; }
      function guideLane() { const a = laneAhead(); if (!lasers[a].up) return a; const o = nearestOpen(RU.lx); return o >= 0 ? o : a; }
      function say(key, o) { const txt = line(LN[key]); rush.say(txt, Object.assign({ ms: Math.max(2600, txt.length * 62) }, o || {})); RU.lineAt = W.t; }
      function float(text, x, y, col) { floats.push({ text, x, y, t: 0, col }); }
      const floats = [];
      function think(sec) { RU.state = 'think'; RU.timer = sec; }
      function thinkTime() { return W.phase === 'peak' ? 0.16 : (0.24 + 0.85 * (1 - W.urge)) * (inten === 0 ? 1.25 : 1); }
      function rushReact() {
        if (RU.state === 'shift' && lasers[RU.tl].up) { RU.reroutes++; float('RE-ROUTE', RU.sx, RU.sy - RU.sz - 6, '#7fe8ff'); think(Math.min(0.3, thinkTime())); }
        else if (RU.state === 'wait') RU.timer = Math.min(RU.timer, 0.12);
      }
      function plan() {
        const o = nearestOpen(RU.lx);
        if (o < 0) { RU.state = 'wait'; RU.timer = 0.3; return; }
        RU.tl = o;
        if (Math.abs(o - RU.lx) < 0.01) { RU.lx = o; RU.state = 'run'; }
        else { RU.state = 'shift'; if (A.ctx) A.whoosh({ vol: 0.05, dur: 0.22, pan: laneWX(o) * 0.6 }); }
      }
      function bonk(lane, g) {
        RU.reroutes++; RU.bonks++;
        hudRe.textContent = 'Re-routes ' + RU.reroutes;
        snd.bonk(laneWX(lane) * 0.7);
        const z = zOfV(GATES[g]), p = proj(laneWX(lane), 0.16, z);
        P.emit('spark', p[0], p[1], 12, { colors: ['#ff4d6d', '#fff1f4', '#ffb3c4'], speed: [60, 220] });
        float('RE-ROUTE', RU.sx, RU.sy - RU.sz - 6, '#7fe8ff');
        rush.face(W.phase === 'fall' ? 'sad' : 'angry', 800);
        rush.react('shake');
        if (RU.bonks === 1) say('block1');
        else if (W.t - RU.lineAt > 7 && Math.random() < 0.45) say('block');
        think(thinkTime());
        ctx.track('reroute', { n: RU.reroutes });
      }
      function passGate(g, lane) {
        RU.slips++;
        W.alarm = 1;
        snd.whoop();
        const z = zOfV(GATES[g]), p = proj(laneWX(lane), 0.1, z);
        P.emit('star', p[0], p[1], 6, { colors: ['#ffe58a', '#ff8fb1'] });
        if (W.t - RU.lineAt > 6 && Math.random() < 0.6) say('slip');
      }
      function rushUpdate(dt, t) {
        const u = W.urge, peak = W.phase === 'peak';
        const fwd = (0.04 + 0.17 * u) * SPD * (peak ? 1.22 : 1);
        const side = (1.3 + 3.2 * u) * SPD * (peak ? 1.35 : 1);
        if (RU.state === 'run') {
          const lane = Math.round(RU.lx), g = nextGate(RU.v);
          let nv = RU.v + fwd * dt;
          if (g >= 0 && lasers[lane].up) {
            const stopAt = GATES[g] - STOP;
            if (RU.v <= stopAt + 0.004 && nv >= stopAt) { RU.v = stopAt; bonk(lane, g); return; }
          }
          if (g >= 0 && RU.v < GATES[g] && nv >= GATES[g]) passGate(g, lane);
          RU.v = Math.min(1, nv);
          RU.stepT -= dt * (1.2 + 3 * u);
          if (RU.stepT <= 0) { RU.stepT = 0.28; snd.step(laneWX(RU.lx) * 0.6); }
          if (W.phase === 'fall' && u < 0.42 && !peak && Math.random() < dt * 0.06) { RU.state = 'sit'; RU.timer = 1.4; rush.face('calm', 1400); }
          if (RU.v >= 1) reach();
        } else if (RU.state === 'think' || RU.state === 'wait' || RU.state === 'sit') {
          RU.timer -= dt; if (RU.timer <= 0) plan();
        } else if (RU.state === 'shift') {
          const d = RU.tl - RU.lx, st = side * dt;
          if (Math.abs(d) <= st) { RU.lx = RU.tl; RU.state = 'run'; } else RU.lx += Math.sign(d) * st;
        } else if (RU.state === 'return') {
          RU.v = Math.max(0, RU.v - dt * 0.85);
          RU.lx += (Math.floor((LANES - 1) / 2) - RU.lx) * Math.min(1, dt * 2);
          if (RU.v <= 0) { RU.lx = Math.round(RU.lx); think(0.9); }
        }
        void t;
      }

      /* ---------------- choices (plea + the button's question) ---------------- */
      function openChoice(kind, items, onPick) {
        W.choice = kind; W.choiceT = 0;
        ctrl.classList.add('hb-choosing');
        choiceWrap.innerHTML = '';
        const chips = K.chips(choiceWrap, items, (it) => { if (W.choice !== kind) return; K.sfx.ok(); closeChoice(); onPick(it.id); }, { label: kind === 'plea' ? 'Answer Rush' : 'Answer the button' });
        K.guide({ id: 'choose-' + kind, g: 'choose', target: () => Array.from(chips.querySelectorAll('button')), label: 'PICK ONE', delay: 600 });
      }
      function closeChoice() { W.choice = null; ctrl.classList.remove('hb-choosing'); choiceWrap.innerHTML = ''; }
      function guardGuide(label, id, delay) { K.guide({ id, g: 'tap', target: () => sw[guideLane()], oy: 0.75, label, delay: delay ?? 700 }); }
      function plea() {
        W.plead = true; RU.state = 'plea';
        rush.face('E94'); snd.aww();
        const txt = line(LN.plea); rush.say(txt, { ms: 0 });
        openChoice('plea', [{ id: 'not', label: 'Not now' }, { id: 'draft', label: 'Save as draft' }], (id) => {
          if (id === 'draft') { markDraft(); say('draft', { mood: 'happy', moodMs: 1600 }); }
          else say('notNow', { mood: 'sad', moodMs: 1600 });
          rush.base('calm'); think(1.1);
          guardGuide('KEEP GUARDING', 'guard2', 1800);
          ctx.track('plea', { pick: id === 'draft' ? 1 : 0 });
        });
      }
      function markDraft() { if (!W.draft) { W.draft = true; target.classList.add('hb-drafted'); K.sfx.paper(); } }
      function reach() {
        RU.v = 1;
        if (W.t < W.lock) {
          RU.reroutes++; hudRe.textContent = 'Re-routes ' + RU.reroutes;
          snd.boing(); rush.react('spin'); rush.face('surprised', 900);
          float('TIME-LOCKED', RU.sx, RU.sy - RU.sz - 6, '#9fdcff');
          if (W.t - RU.lineAt > 5) say('shield');
          RU.state = 'return'; return;
        }
        W.reaches++; RU.state = 'reached';
        K.sfx.thud(); rush.face('think');
        const txt = line(LN.reach); rush.say(txt, { ms: 0 });
        ask.hidden = false;
        openChoice('reach', [{ id: 'wait', label: 'Wait 30 seconds' }, { id: 'draft', label: 'Save as draft' }], (id) => resolveReach(id));
      }
      function resolveReach(id) {
        ask.hidden = true;
        W.lock = W.t + 30; W.T = Math.max(W.T, W.t + 30);
        target.classList.add('hb-shield'); lockPill.hidden = false;
        snd.shield();
        if (id === 'draft') markDraft();
        say('wait', { mood: 'sleepy', moodMs: 1800 });
        rush.base(W.phase === 'fall' ? 'calm' : 'determined');
        rush.react('spin'); snd.boing();
        RU.state = 'return';
        guardGuide('KEEP GUARDING', 'guard3', 2200);
        ctx.track('reach', { n: W.reaches, pick: id === 'draft' ? 1 : 0 });
      }

      /* ---------------- per-frame logic ---------------- */
      let lastRe = -1, lastTm = '', lastPh = '', lastLock = '';
      function step(dt, t) {
        if (W.stage === 'play') {
          W.t += dt;
          W.urge = urgeAt(W.t);
          const ph = phaseAt(W.t);
          if (ph !== W.phase) {
            W.phase = ph;
            if (ph === 'peak' && !W.peaked) {
              W.peaked = true; RU.burst = 1;
              say('peak', { mood: 'speed', moodMs: 4200, ms: 4600 }); rush.react('spin');
              K.sfx.rise(); K.sfx.heartbeat();
              guardGuide('PEAK: KEEP BLOCKING', 'peak', 300);
            }
            if (ph === 'fall' && !W.fell) { W.fell = true; rush.base('calm'); }
          }
          const x = W.t / BASE_T;
          if (!W.plead && x >= PLEA_X && !W.choice && RU.state !== 'return') plea();
          if (W.plead && !W.said.fall && x >= 0.68 && !W.choice) { W.said.fall = true; say('fall', { mood: 'E44', moodMs: 1500 }); }
          if (W.plead && !W.said.fall2 && x >= 0.86 && !W.choice) { W.said.fall2 = true; say('fall2', { mood: 'calm' }); }
          if (W.choice) {
            W.choiceT += dt;
            if (W.choice === 'plea' && W.choiceT > 9) { closeChoice(); say('silent', { mood: 'calm' }); rush.base('calm'); think(1); guardGuide('KEEP GUARDING', 'guard2', 1500); }
          } else rushUpdate(dt, t);
          if (W.t >= W.T) {
            if (W.choice === 'reach') { closeChoice(); ask.hidden = true; }
            else if (W.choice) closeChoice();
            finale();
          }
          if (W.lock > 0 && W.t >= W.lock) { W.lock = -1; target.classList.remove('hb-shield'); lockPill.hidden = true; }
          if (W.lock > 0) { const s = Math.max(0, Math.ceil(W.lock - W.t)), txt = '0:' + String(s).padStart(2, '0'); if (txt !== lastLock) { lastLock = txt; lockPill.lastChild.textContent = txt; if (s <= 5 && s > 0) snd.tick(); } }
        }
        // lasers animate up/down
        lasers.forEach(l => { l.k += ((l.up ? 1 : 0) - l.k) * Math.min(1, dt * 14); });
        W.tint += (W.tintGoal - W.tint) * Math.min(1, dt * 0.9);
        W.flat += ((W.stage === 'end' ? 1 : 0) - W.flat) * Math.min(1, dt * 1.5);
        W.alarm = Math.max(0, W.alarm - dt * 0.8);
        // HUD text (only on change)
        if (RU.reroutes !== lastRe) { lastRe = RU.reroutes; hudRe.textContent = 'Re-routes ' + RU.reroutes; }
        const sec = Math.floor(W.t), tm = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
        if (tm !== lastTm) { lastTm = tm; hudTm.textContent = tm; }
        const phTxt = W.stage === 'end' ? 'Passed' : W.phase === 'rise' ? 'Rising' : W.phase === 'peak' ? 'Peak' : (W.T - W.t < 10 ? 'Fading' : 'Passing');
        if (phTxt !== lastPh) { lastPh = phTxt; hudPh.textContent = phTxt; hudPh.className = 'hb-ph' + (W.phase === 'peak' && W.stage === 'play' ? ' peak' : W.phase === 'fall' || W.stage === 'end' ? ' fall' : ''); }
        dome.style.setProperty('--pulse', (0.4 + 0.6 * W.urge * (0.6 + 0.4 * Math.sin(t * 5))).toFixed(3));
        // sound beds follow the urge
        if (W.stage !== 'end') { music.level(0.16 + 0.22 * W.urge); music.tempo(96 + 30 * W.urge); }
        if (!hum && A.ctx) { hum = A.loop({ filter: 'bandpass', freq: 130, q: 9 }); S.onDestroy(() => { if (hum) hum.stop(); }); }
        if (hum) hum.level(W.stage === 'end' ? 0.0001 : 0.01 * upCount(), 0.12);
        // finale sparkle shower built from the laser colours
        if (W.shower > 0) {
          W.shower -= dt;
          if (Math.random() < 0.85) P.emit('snow', L.cx + (Math.random() - 0.5) * L.half * 2.1, L.yFar - 120 + Math.random() * 60, 2, { colors: ['#ff6b8b', '#ffb3c4', '#7fd8ff', '#c6f0ff', '#ffe58a'], speed: [10, 50] });
        }
      }

      /* ---------------- placement of Rush + his bubble ---------------- */
      let bubbleUp = true, lastSz = 0;
      function placeRush(t) {
        let sx, sy, sz;
        const z = zOfV(RU.v), scale = 0.62 + 0.38 * Math.max(0, Math.min(1, 2 - z));
        sz = Math.round(L.base * scale);
        if (RU.state === 'reached' || RU.state === 'sleep') {
          sz = Math.round(L.base * (RU.state === 'sleep' ? 0.74 : 0.66));
          sx = L.cx - L.pedW / 2 - sz * 0.32; sy = L.yFar + 6;
        } else { sx = laneSX(RU.lx, z); sy = L.yNear - RU.v * (L.yNear - L.yFar); }
        if (RU.state === 'sleepwalk') { const k = RU.sleepK; sx = K.lerp(laneSX(RU.lx, z), L.cx - L.pedW / 2 - sz * 0.32, k); }
        const running = RU.state === 'run' || RU.state === 'shift' || RU.state === 'return' || RU.state === 'sleepwalk';
        const bob = running && !K.reduced() ? Math.abs(Math.sin(t * (9 + 8 * W.urge))) * 4 * scale : 0;
        RU.sx = sx; RU.sy = sy; RU.sz = sz;
        if (Math.abs(sz - lastSz) >= 1) { lastSz = sz; rush.el.style.setProperty('--sz', sz + 'px'); }
        rush.el.style.left = (sx - sz / 2).toFixed(1) + 'px';
        rush.el.style.top = (sy - sz + 3 - bob).toFixed(1) + 'px';
        const tilt = RU.state === 'shift' ? Math.sign(RU.tl - RU.lx) * 9 : running && !K.reduced() ? Math.sin(t * 9) * 3 : 0;
        rush.img.style.rotate = tilt.toFixed(1) + 'deg';
        const b = rush.bubble;
        if (!b.hidden) {
          const top = sy - sz;
          const up = top > L.yFar + 70 && RU.state !== 'reached';
          if (up !== bubbleUp) { bubbleUp = up; rush.side(up ? 'above' : 'below'); }
          const bw = b.offsetWidth || 220, left = K.clamp(sx - bw / 2, 10, L.w - 10 - bw);
          b.style.left = (left - (sx - sz / 2)).toFixed(1) + 'px';
          b.style.setProperty('--ax', K.clamp(sx - left, 20, bw - 20).toFixed(1) + 'px');
        }
      }

      /* ---------------- render ---------------- */
      const LASER = { core: '#fff3f6', mid: '#ff3d63', glow: '#ff2d55' };
      const HB = inten === 2 ? [0.07, 0.17, 0.27] : [0.08, 0.22];
      function mixRGB(a, b, k) { return [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)]; }
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !bgC) return;
        step(dt, t);
        placeRush(t);
        const w = L.w, H = L.h, calm = W.tint, red = mixRGB([255, 42, 74], [70, 160, 255], calm);
        g.drawImage(bgC, 0, 0, w, H);
        g.save(); g.globalCompositeOperation = 'lighter';
        // vault ring rim glow
        const pulse = 0.55 + 0.45 * Math.sin(t * (2 + 3 * W.urge));
        g.strokeStyle = `rgba(${red[0]},${red[1]},${red[2]},${(0.25 + 0.35 * W.urge * (1 - calm) + 0.3 * calm) * pulse})`;
        g.lineWidth = 3; g.beginPath(); g.arc(L.cx, L.ringY, L.ring - L.ring * 0.1, 0, K.TAU); g.stroke();
        g.lineWidth = 9; g.strokeStyle = `rgba(${red[0]},${red[1]},${red[2]},${0.08 * pulse})`; g.stroke();
        // alarm beacons sweeping
        const alarmLvl = Math.min(1, (0.35 + 0.65 * W.urge) * (1 - calm) + W.alarm * 0.5) + calm * 0.45;
        for (const s of [-1, 1]) {
          const b = proj(s, 2.5, 1.55), ang = K.reduced() ? (s < 0 ? 0.6 : Math.PI - 0.6) : t * (2.2 + 2.5 * W.urge) * s + (s > 0 ? Math.PI : 0);
          const len = Math.max(w, H) * 0.9, sp = 0.32;
          const gr = g.createRadialGradient(b[0], b[1], 2, b[0], b[1], len);
          gr.addColorStop(0, `rgba(${red[0]},${red[1]},${red[2]},${0.3 * alarmLvl})`); gr.addColorStop(1, `rgba(${red[0]},${red[1]},${red[2]},0)`);
          g.fillStyle = gr; g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(b[0] + Math.cos(ang - sp) * len, b[1] + Math.sin(ang - sp) * len); g.lineTo(b[0] + Math.cos(ang + sp) * len, b[1] + Math.sin(ang + sp) * len); g.closePath(); g.fill();
          const bg2 = g.createRadialGradient(b[0], b[1], 1, b[0], b[1], 26);
          bg2.addColorStop(0, `rgba(255,255,255,${0.9 * alarmLvl})`); bg2.addColorStop(0.3, `rgba(${red[0]},${red[1]},${red[2]},${0.8 * alarmLvl})`); bg2.addColorStop(1, `rgba(${red[0]},${red[1]},${red[2]},0)`);
          g.fillStyle = bg2; g.fillRect(b[0] - 26, b[1] - 26, 52, 52);
        }
        // pedestal glow
        const pg = g.createRadialGradient(L.cx, L.yFar - L.pedH, 4, L.cx, L.yFar - L.pedH, L.pedW * 1.4);
        pg.addColorStop(0, calm > 0.5 ? 'rgba(120,200,255,0.35)' : `rgba(255,70,110,${0.18 + 0.2 * W.urge})`); pg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = pg; g.fillRect(L.cx - L.pedW * 1.4, L.yFar - L.pedH - L.pedW * 1.4, L.pedW * 2.8, L.pedW * 2.8);
        // spotlight following Rush
        if (W.stage !== 'intro') {
          const z = zOfV(RU.v), sr = 70 / z;
          const sl = g.createRadialGradient(RU.sx, RU.sy, 2, RU.sx, RU.sy, sr);
          sl.addColorStop(0, `rgba(190,215,255,${0.16 * (1 - calm)})`); sl.addColorStop(1, 'rgba(190,215,255,0)');
          g.fillStyle = sl; g.beginPath(); g.ellipse(RU.sx, RU.sy, sr, sr * 0.42, 0, 0, K.TAU); g.fill();
        }
        g.restore();
        // Rush's plan: a dotted line up his lane to the next laser (or the button)
        if ((RU.state === 'run' || RU.state === 'shift' || RU.state === 'think') && W.stage === 'play') {
          const lane = laneAhead();
          let vEnd = 1, blockedG = -1;
          for (let gi = 0; gi < GATES.length; gi++) if (GATES[gi] > RU.v + 0.001 && lasers[lane].up) { vEnd = GATES[gi] - STOP; blockedG = gi; break; }
          g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(127,232,255,0.75)';
          for (let v = RU.v + 0.04; v < vEnd; v += 0.035) { const z = zOfV(v), x = K.lerp(laneSX(RU.lx, z), laneSX(lane, z), Math.min(1, (v - RU.v) * 8)), y = L.yNear - v * (L.yNear - L.yFar); g.beginPath(); g.arc(x, y, 2.4 / z, 0, K.TAU); g.fill(); }
          if (blockedG >= 0) { const z = zOfV(vEnd), x = laneSX(lane, z), y = L.yNear - vEnd * (L.yNear - L.yFar), r = 5 / z; g.strokeStyle = 'rgba(255,90,120,0.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.moveTo(x + r, y - r); g.lineTo(x - r, y + r); g.stroke(); }
          g.restore();
        }
        // lasers: emitters, beams rising out of the floor, reflections
        for (let gi = 0; gi < GATES.length; gi++) {
          const z = zOfV(GATES[gi]);
          for (let i = 0; i < LANES; i++) {
            const l = lasers[i], x0 = -1 + 2 * i / LANES + 0.03, x1 = -1 + 2 * (i + 1) / LANES - 0.03;
            const a = proj(x0, 0, z), b = proj(x1, 0, z), er = 4.2 / z;
            g.fillStyle = '#20264a'; g.beginPath(); g.ellipse(a[0], a[1], er * 1.6, er * 0.7, 0, 0, K.TAU); g.ellipse(b[0], b[1], er * 1.6, er * 0.7, 0, 0, K.TAU); g.fill();
            g.fillStyle = l.k > 0.1 ? '#ff3d63' : 'rgba(255,61,99,0.35)';
            g.beginPath(); g.arc(a[0], a[1] - er * 0.2, er * 0.5, 0, K.TAU); g.arc(b[0], b[1] - er * 0.2, er * 0.5, 0, K.TAU); g.fill();
            if (l.k < 0.02) { g.strokeStyle = 'rgba(255,61,99,0.18)'; g.lineWidth = 1.5 / z; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); continue; }
            const fl = 0.82 + 0.18 * Math.sin(t * 31 + l.ph + gi * 2) * (K.reduced() ? 0 : 1);
            g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
            for (const hb of HB) {
              const y = hb * l.k, p0 = proj(x0, y, z), p1 = proj(x1, y, z), r0 = proj(x0, -y * 0.55, z), r1 = proj(x1, -y * 0.55, z);
              g.strokeStyle = `rgba(255,45,85,${0.07 * l.k})`; g.lineWidth = 5 / z; g.beginPath(); g.moveTo(r0[0], r0[1]); g.lineTo(r1[0], r1[1]); g.stroke();
              g.strokeStyle = `rgba(255,45,85,${0.16 * fl * l.k})`; g.lineWidth = 10 / z; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
              g.strokeStyle = `rgba(255,61,99,${0.55 * fl * l.k})`; g.lineWidth = 3.6 / z; g.stroke();
              g.strokeStyle = `rgba(255,243,246,${0.95 * l.k})`; g.lineWidth = 1.4 / z; g.stroke();
            }
            g.restore();
          }
        }
        // Rush's shadow
        if (RU.state !== 'idle' || W.stage === 'intro') { g.fillStyle = 'rgba(0,0,0,0.42)'; g.beginPath(); g.ellipse(RU.sx, RU.sy + 1, RU.sz * 0.34, RU.sz * 0.09, 0, 0, K.TAU); g.fill(); }
        P.update(dt); P.draw(g);
        // floating texts
        for (let i = floats.length - 1; i >= 0; i--) {
          const f = floats[i]; f.t += dt;
          if (f.t > 1) { floats.splice(i, 1); continue; }
          g.globalAlpha = 1 - f.t; g.font = '700 13px ' + FONT; g.textAlign = 'center'; g.fillStyle = 'rgba(4,6,20,0.7)';
          g.fillText(f.text, f.x + 1, f.y - f.t * 26 + 1); g.fillStyle = f.col; g.fillText(f.text, f.x, f.y - f.t * 26);
        }
        g.globalAlpha = 1;
        // room light: alarm red cooling to calm blue
        const wash = (0.05 + 0.07 * W.urge * (0.7 + 0.3 * Math.sin(t * 3))) * (1 - calm) + 0.09 * calm + W.alarm * 0.05;
        g.fillStyle = `rgba(${red[0]},${red[1]},${red[2]},${wash.toFixed(3)})`; g.fillRect(0, 0, w, H);
        drawWave(t);
      });
      function drawWave(t) {
        const g = wv.g; if (!g) return;
        const w = wv.w, hh = wv.h, T = W.T, now = Math.min(W.t, T), pad = 5;
        g.clearRect(0, 0, w, hh);
        const X = (s) => pad + (w - 2 * pad) * (s / T), Y = (u) => hh - 3 - (hh - 8) * u;
        g.strokeStyle = 'rgba(255,255,255,0.1)'; g.lineWidth = 1; g.beginPath(); g.moveTo(pad, Y(0.08)); g.lineTo(w - pad, Y(0.08)); g.stroke();
        const px = X(XP * BASE_T);
        g.fillStyle = 'rgba(255,90,120,0.55)'; g.beginPath(); g.moveTo(px - 4, 1); g.lineTo(px + 4, 1); g.lineTo(px, 6); g.closePath(); g.fill();
        g.setLineDash([3, 4]); g.strokeStyle = `rgba(200,210,255,${0.35 * (1 - W.flat)})`; g.lineWidth = 1.5; g.beginPath();
        let first = true;
        for (let s = now; s <= T + 0.001; s += T / 80) { const x = X(s), y = Y(urgeAt(s)); if (first) { g.moveTo(x, y); first = false; } else g.lineTo(x, y); }
        g.stroke(); g.setLineDash([]);
        const grd = g.createLinearGradient(pad, 0, w - pad, 0);
        grd.addColorStop(0, '#ffa04a'); grd.addColorStop(Math.min(0.98, XP * BASE_T / T), '#ff2d55'); grd.addColorStop(Math.min(0.99, (XP + 0.25) * BASE_T / T), '#b07bff'); grd.addColorStop(1, '#5ab8ff');
        g.beginPath(); g.moveTo(X(0), Y(urgeAt(0)));
        for (let s = 0; s < now; s += T / 120) g.lineTo(X(s), Y(urgeAt(s)));
        g.lineTo(X(now), Y(urgeAt(now)));
        g.strokeStyle = grd; g.lineWidth = 2.4; g.globalAlpha = 1 - W.flat * 0.5; g.stroke();
        g.lineTo(X(now), hh); g.lineTo(X(0), hh); g.closePath(); g.globalAlpha = 0.2 * (1 - W.flat * 0.5); g.fillStyle = grd; g.fill(); g.globalAlpha = 1;
        if (W.flat > 0.02) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(110,200,255,${0.9 * W.flat})`; g.lineWidth = 2.4; g.beginPath(); g.moveTo(pad, Y(0.08)); g.lineTo(pad + (w - 2 * pad) * W.flat, Y(0.08)); g.stroke(); g.lineWidth = 7; g.strokeStyle = `rgba(110,200,255,${0.18 * W.flat})`; g.stroke(); g.restore(); }
        const nx = X(now), ny = Y(urgeAt(now)), col = W.phase === 'fall' || W.stage === 'end' ? '127,200,255' : '255,80,110';
        const dg = g.createRadialGradient(nx, ny, 0, nx, ny, 10); dg.addColorStop(0, `rgba(${col},0.9)`); dg.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = dg; g.fillRect(nx - 10, ny - 10, 20, 20);
        g.fillStyle = '#fff'; g.beginPath(); g.arc(nx, ny, 2.6 + Math.sin(t * 6) * 0.4, 0, K.TAU); g.fill();
      }

      /* ---------------- finale ---------------- */
      async function finale() {
        if (W.stage === 'end') return;
        W.stage = 'end'; W.endT = W.t;
        K.guide(null); closeChoice(); ask.hidden = true; rush.hush();
        target.classList.remove('hb-shield'); lockPill.hidden = true;
        ctrl.classList.add('hb-gone');
        music.level(0.14); music.tempo(80);
        W.tintGoal = 1; target.classList.add('hb-calm');
        // your lasers power down, one by one, and burst into light
        const order = [];
        for (let i = 0; i < LANES; i++) order.push(i);
        order.forEach((i, n) => K.later(() => {
          const was = lasers[i].k;
          lasers[i].up = true; lasers[i].k = Math.max(was, 0.85);
          K.later(() => { lasers[i].up = false; snd.down(laneWX(i) * 0.7, true); }, 160);
          GATES.forEach((gv) => {
            const z = zOfV(gv);
            for (let k = 0; k < 7; k++) { const x = -1 + 2 * (i + (k + 0.5) / 7) / LANES, p = proj(x, 0.15, z); P.emit('star', p[0], p[1], 2, { colors: ['#ff6b8b', '#ffd1dc', '#7fd8ff', '#ffe58a'], speed: [30, 120], angle: -Math.PI / 2, spread: 1.8 }); }
          });
          K.sfx.sparkle();
        }, 220 * n));
        pips.forEach(p => p.classList.remove('on'));
        // Rush gives up the heist and curls up at the pedestal
        RU.state = 'sleepwalk'; RU.sleepK = 0; rush.base('sleepy');
        const v0 = RU.v;
        await K.anim(1700, (k) => { RU.v = K.lerp(v0, 1, k); RU.sleepK = k; }, K.ease.inOutCubic);
        RU.state = 'sleep';
        say('sleep', { mood: 'sleepy', ms: 0 });
        // SEND morphs into the draft deposit box, which locks with a chunk
        box.hidden = false; void box.offsetWidth;
        target.classList.add('hb-morph'); K.sfx.whoosh();
        await K.sleep(760);
        target.classList.add('hb-locked'); K.sfx.lock(); snd.clank(); K.sfx.thud();
        if (!K.reduced()) { el.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(2px,-3px)' }, { transform: 'translate(-2px,2px)' }, { transform: 'translate(0,0)' }], { duration: 260, easing: 'ease-out' }); }
        P.emit('spark', L.cx, L.boxY, 26, { colors: ['#9fdcff', '#ffffff', '#7fd8ff'], speed: [80, 260] });
        W.shower = 3.2;
        ctx.track('heist_end', { seconds: Math.round(W.t), reroutes: RU.reroutes, slips: RU.slips, reaches: W.reaches, draft: W.draft ? 1 : 0, taps: W.taps });
        await K.finale('ripple', { from: [{ x: L.cx, y: L.boxY }, { x: RU.sx, y: RU.sy - RU.sz * 0.5 }], colors: ['#7fd8ff', '#5aa9ff', '#b79bff', '#9be7ff', '#7fd8ff'], chord: ['D4', 'A4', 'D5', 'F#5'], ms: 4400 });
        finished = true;
        const secs = Math.round(W.endT);
        ctx.finish({
          title: 'The urge passed', mood: 'sleepy',
          lines: ['Urge peaked and passed in ' + secs + ' seconds', 'Nothing sent. Draft saved for tomorrow.', RU.reroutes ? 'Rush re-routed ' + RU.reroutes + ' time' + (RU.reroutes === 1 ? '' : 's') : 'You guarded the vault the whole way'],
          share: 'Rode out an urge for ' + secs + ' seconds. Nothing sent.'
        });
      }

      /* ---------------- start ---------------- */
      cv.onResize(layout);
      S.on('theme', () => buildBg());
      (async () => {
        await K.intro({ title: 'Send Button Heist', sub: 'The urge wants to hit SEND right now. Guard the vault while the wave rises, peaks and passes.', how: 'Tap a switch to raise lasers in Rush’s lane.', char: 'rush', mood: 'determined' });
        say('start', { mood: 'wink', moodMs: 1400 });
        rush.react('bounce');
        await K.sleep(1300);
        W.stage = 'play'; RU.state = 'run';
        guardGuide('TAP A SWITCH: BLOCK', 'block', 900);
      })();

      return {
        async autoplay() {
          while (W.stage === 'intro') await K.wait(120);
          let last = 0;
          while (W.stage === 'play') {
            await K.wait(110);
            if (W.choice) {
              const kind = W.choice;
              await K.wait(1300);
              const bs = choiceWrap.querySelectorAll('button');
              if (W.choice === kind && bs.length) await K.sim.tap(kind === 'plea' ? bs[1] : bs[0]);
              continue;
            }
            const slack = W.t > 6 && W.t < 20 && !W.reaches;
            if (slack || W.stage !== 'play') continue;
            const lane = laneAhead();
            if (!lasers[lane].up && performance.now() - last > 420 && (RU.state === 'run' || RU.state === 'shift')) { last = performance.now(); await K.sim.tap(sw[lane]); }
          }
          while (!finished) await K.wait(200);
        }
      };

      function cleanUrge(s) {
        let t = String(s || '').replace(/[“”"‘’]/g, '').replace(/…/g, ' ').replace(/\s+/g, ' ').trim().replace(/[.!?,;:]+$/, '').trim();
        if (!t) return '';
        const w = t.split(' ');
        if (w.length > 6) t = w.slice(0, 6).join(' ');
        return t.toUpperCase();
      }
    }
  });
})(window.TSG_ENV);
