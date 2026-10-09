/* 013 Domino Start — Reset · ACT · Getting Started
 * Mechanism: behavioural activation and the two-minute start, with implementation intentions (Gollwitzer 1999): a task
 * shrunk to a tiny first action is easy to begin, and beginning builds momentum. Dominoes make momentum visible: a domino
 * can topple one about 1.5 times its size (Whitehead 1983), so a tiny first step really can bring the big thing down.
 * Verb: topple (drag each step domino into the glowing sweet spot, where it snaps; build a ladder of bigger dominoes up to
 * the giant task domino; then flick the tiny one). Finale: the chain clatters faster and faster while the camera pulls
 * back, the giant falls in slow motion and rings the bell, the fallen line lights up like a fuse from the tiny domino to
 * the bell, confetti bursts, and a card names your first domino.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;

  /* Micro-step ladders. The first step is the tiniest; each is an action, never a claim about the player's life. */
  const TEMPLATES = [
    { re: /\b(e-?mails?|inbox|repl(y|ies)|respond\w*|messages?)\b/i, steps: ['Open the email', 'Read it once', 'Type one rough line', 'Fix one sentence', 'Save it as a draft'] },
    { re: /\b(essay|assignment|thesis|dissertation|article|blog|chapter|write|writing|draft\w*|paper|story)\b/i, steps: ['Open the doc', 'Type the title', 'Write one messy line', 'Write the next line', 'Write one more'] },
    { re: /\b(presentation|slides?|deck|pitch|speech|talk|report|proposal)\b/i, steps: ['Open a blank slide', 'Type the title', 'Jot three points', 'Fill in point one', 'Say line one out loud'] },
    { re: /\b(clean\w*|tidy|tidying|laundry|dishes|washing up|vacuum\w*|declutter\w*|chores?|mess|messy)\b/i, steps: ['Put on one song', 'Pick up five things', 'Clear one surface', 'Start one load', 'Wipe one bench'] },
    { re: /\b(gym|exercis\w*|workout|work out|running|jog\w*|yoga|stretch\w*|fitness|swim\w*)\b/i, steps: ['Put your shoes on', 'Fill a water bottle', 'Step outside', 'Move for two minutes', 'Keep going for five'] },
    { re: /\b(call|phone|appointment|booking|doctor|gp|dentist)\b/i, steps: ['Find the number', 'Write your first line', 'Open the dialler', 'Press call', 'Say line one'] },
    { re: /\b(study|studying|exams?|revis\w*|homework|learn\w*|course|notes|lecture|maths?)\b/i, steps: ['Open your notes', 'Read one paragraph', 'Write one thing you know', 'Try one question', 'Try the next one'] },
    { re: /\b(jobs?|cv|resume|cover letter|applications?|apply|applying)\b/i, steps: ['Open your CV', 'Fix one line', 'Save one job link', 'Write the first line', 'Write the next line'] },
    { re: /\b(tax|taxes|budget\w*|bills?|invoices?|forms?|paperwork|admin)\b/i, steps: ['Open the form', 'Read question one', 'Find one document', 'Fill in one box', 'Fill in the next'] },
    { re: /\b(code|coding|bug|app|website|project)\b/i, steps: ['Open the project', 'Read your last change', 'Make one tiny change', 'Run it once', 'Make the next change'] }
  ];
  const GENERIC = ['Open it', 'Look at it for ten seconds', 'Do one tiny bit', 'Do the next tiny bit', 'Keep going for five minutes'];
  const CARE_STEPS = ['Write down your one question', 'Find who can answer it', 'Save their number', 'Pick a time to call', 'Make the call'];

  /* Today's table (daily), each with its own bell for the collection. */
  const VENUES = [
    { id: 'kitchen', name: 'kitchen table', amb: 'dawn', bell: 'Brass Bell', tone: 1, bellKind: 'brass', table: 'oak' },
    { id: 'desk', name: 'writing desk', amb: 'room', bell: 'Silver Bell', tone: 1.26, bellKind: 'silver', table: 'walnut' },
    { id: 'cafe', name: 'corner café', amb: 'rain', bell: 'Shop Bell', tone: 1.5, bellKind: 'shop', table: 'marble' },
    { id: 'garden', name: 'garden table', amb: 'prairie', bell: 'Copper Cowbell', tone: 0.8, bellKind: 'cow', table: 'teak' }
  ];
  const TABLES = {
    oak: { base: [214, 167, 108], dark: [158, 108, 58], light: [240, 206, 152], kind: 'plank', seam: 64, edge: [146, 94, 50], dust: ['rgba(226,196,148,0.6)', 'rgba(250,232,200,0.5)'] },
    walnut: { base: [124, 80, 50], dark: [76, 45, 26], light: [164, 112, 72], kind: 'plank', seam: 85, edge: [82, 50, 29], dust: ['rgba(206,168,126,0.55)', 'rgba(240,214,180,0.45)'] },
    marble: { base: [236, 233, 227], dark: [150, 146, 140], light: [255, 255, 252], kind: 'marble', edge: [196, 191, 183], dust: ['rgba(240,238,232,0.6)', 'rgba(220,214,204,0.5)'] },
    teak: { base: [176, 132, 90], dark: [112, 78, 48], light: [208, 168, 122], kind: 'slat', seam: 48, edge: [114, 80, 50], dust: ['rgba(220,186,146,0.55)', 'rgba(244,222,190,0.45)'] }
  };
  /* Domino sets: tiers unlock them (skill, never time). */
  const SETS = {
    ivory: { name: 'Ivory', face: [247, 239, 223], pip: '#211b16', pin: '#c9a14a' },
    ebony: { name: 'Ebony', face: [62, 52, 50], pip: '#f5ebd7', pin: '#e0bc5c' },
    jade: { name: 'Jade', face: [132, 204, 178], pip: '#0e3a2e', pin: '#f1dd94' },
    gold: { name: 'Gold Leaf', face: [244, 208, 116], pip: '#3a2805', pin: '#fff4cc' }
  };
  const SET_ORDER = ['ivory', 'ebony', 'jade', 'gold'];
  const TIER_SET = { Bronze: 'ebony', Silver: 'jade', Gold: 'gold' };
  const PIP_MICRO = [[0, 1], [1, 1], [1, 2], [2, 2]];
  const PIP_BOOST = [[2, 3], [3, 3], [3, 4], [4, 5]];
  /* pip spots inside one half: [along the height, along the depth] */
  const PIPXY = { 0: [], 1: [[0.5, 0.5]], 2: [[0.26, 0.26], [0.74, 0.74]], 3: [[0.24, 0.24], [0.5, 0.5], [0.76, 0.76]], 4: [[0.26, 0.26], [0.26, 0.74], [0.74, 0.26], [0.74, 0.74]],
    5: [[0.24, 0.24], [0.24, 0.76], [0.5, 0.5], [0.76, 0.24], [0.76, 0.76]], 6: [[0.22, 0.27], [0.5, 0.27], [0.78, 0.27], [0.22, 0.73], [0.5, 0.73], [0.78, 0.73]] };
  const NOTES = ['F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'G5', 'A5', 'C6', 'D6', 'F6'];

  (env.games = env.games || []).push({
    id: 'domino-start', mode: 'reset', name: 'Domino Start', verb: 'topple', family: 'ACT', minutes: 2,
    parents: ['Getting Started', 'Performance / Confidence', 'Mental Overload / Working Memory'],
    cast: ['rush', 'patch'], poster: { char: 'rush', mood: 'celebrate' },
    fonts: ['Fraunces:wght@600;700;800'],
    tagline: 'Line up tiny steps, flick the smallest, watch the big thing fall.',
    why: 'For a task you keep putting off: one tiny first move can topple the big thing.',
    css: `
.g-domino-start { --ds-cream: #fff4dd; --ds-gold: #ffd27a; --ds-ink: #2a1a0e; --ds-font: "Fraunces", Georgia, "Times New Roman", serif; }
.g-domino-start .ds-fx { position: absolute; inset: 0; z-index: 20; pointer-events: none; overflow: hidden; }
.g-domino-start .ds-tag { position: absolute; left: 0; top: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; width: max-content; max-width: 188px; padding: 8px 13px 9px; border-radius: 10px; box-sizing: border-box;
  background: linear-gradient(180deg, #fff9ec, #f2e1bd); color: var(--ds-ink); box-shadow: 0 8px 18px rgba(20, 8, 0, 0.38), inset 0 -2px 0 rgba(120, 80, 30, 0.2); transform-origin: 50% 100%; opacity: 0; transition: opacity 0.35s ease; will-change: transform; }
.g-domino-start .ds-tag.on { opacity: 1; }
.g-domino-start .ds-tag.ds-snap { transition: none; }
.g-domino-start .ds-tag::after { content: ""; position: absolute; left: 50%; bottom: -6px; width: 12px; height: 12px; margin-left: -6px; background: #f2e1bd; transform: rotate(45deg); box-shadow: 3px 3px 5px rgba(20, 8, 0, 0.18); }
.g-domino-start .ds-tag-k { font: 700 12px/1 var(--ds-font); letter-spacing: 0.14em; text-transform: uppercase; color: #9a5a1c; }
.g-domino-start .ds-tag-t { font: 700 16px/1.18 var(--ds-font); text-align: center; text-wrap: balance; }
.g-domino-start .ds-ftag { position: absolute; left: 0; top: 0; padding: 6px 10px 5px; border-radius: 8px; background: rgba(255, 247, 228, 0.97); color: var(--ds-ink); font: 700 15px/1.15 var(--ds-font); width: max-content; max-width: 196px;
  text-align: center; box-shadow: 0 6px 14px rgba(0, 0, 0, 0.32); transform: translate(-50%, -100%); opacity: 0; transition: opacity 0.15s ease; text-wrap: balance; }
.g-domino-start .ds-ftag.on { opacity: 1; }
.g-domino-start .ds-flick { position: absolute; z-index: 25; left: 0; top: 0; width: 132px; height: 170px; margin: -85px 0 0 -66px; border-radius: 36px; touch-action: none; cursor: grab; outline: none; }
.g-domino-start .ds-flick:focus-visible { box-shadow: 0 0 0 3px var(--ds-gold); }
.g-domino-start .ds-rack { position: absolute; z-index: 34; left: 10px; right: 10px; bottom: calc(env(safe-area-inset-bottom, 0px) + 16px); height: 168px; border-radius: 20px; padding: 9px 9px 9px; box-sizing: border-box;
  background: linear-gradient(180deg, #82502a 0%, #5e3619 52%, #4a2911 100%); box-shadow: inset 0 2px 0 rgba(255, 222, 170, 0.38), inset 0 -3px 0 rgba(0, 0, 0, 0.32), 0 14px 30px rgba(0, 0, 0, 0.45);
  display: flex; flex-direction: column; gap: 7px; transition: transform 0.5s cubic-bezier(.2, .9, .3, 1), opacity 0.4s ease; }
.g-domino-start .ds-rack.off { transform: translateY(calc(100% + 34px)); opacity: 0; }
.g-domino-start .ds-rack-h { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding: 0 5px; }
.g-domino-start .ds-rack-t { font: 700 13px/1.1 var(--ds-font); letter-spacing: 0.11em; text-transform: uppercase; color: #ffe2ad; text-shadow: 0 1px 0 rgba(0, 0, 0, 0.45); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.g-domino-start .ds-rack-s { font: 600 13px/1.1 var(--font-ui); color: var(--ds-gold); white-space: nowrap; }
.g-domino-start .ds-rack-b { flex: 1; min-height: 0; display: flex; gap: 7px; border-radius: 14px; padding: 7px; background: radial-gradient(120% 150% at 50% 0%, #2f5d47, #1a372a 72%); box-shadow: inset 0 3px 9px rgba(0, 0, 0, 0.6), 0 1px 0 rgba(255, 220, 170, 0.18); }
.g-domino-start .ds-rack-b.ds-list { flex-direction: column; justify-content: center; gap: 1px; padding: 5px 12px; }
.g-domino-start .ds-tile { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 5px; padding: 6px 4px 5px; border-radius: 12px; box-sizing: border-box;
  border: 1.5px dashed rgba(255, 230, 180, 0.3); color: var(--ds-cream); touch-action: none; cursor: grab; outline: none; transition: background 0.2s ease, border-color 0.2s ease, opacity 0.3s ease, box-shadow 0.2s ease; }
.g-domino-start .ds-tile svg { flex: none; overflow: visible; filter: drop-shadow(0 4px 3px rgba(0, 0, 0, 0.5)); transition: opacity 0.2s ease; }
.g-domino-start .ds-tile.is-next { border-style: solid; border-color: var(--ds-gold); background: rgba(255, 214, 140, 0.14); box-shadow: 0 0 18px rgba(255, 196, 96, 0.38), inset 0 0 12px rgba(255, 210, 122, 0.12); }
.g-domino-start .ds-tile.is-next svg { animation: domino-start-nudge 2.6s ease-in-out infinite; }
.g-domino-start .ds-tile.is-later { opacity: 0.62; cursor: default; }
.g-domino-start .ds-tile.is-done { opacity: 0.5; cursor: default; }
.g-domino-start .ds-tile.is-done svg { opacity: 0.14; animation: none; }
.g-domino-start .ds-tile.is-lifted svg { animation: none; transition: none; filter: drop-shadow(0 12px 8px rgba(0, 0, 0, 0.5)); position: relative; z-index: 2; }
.g-domino-start .ds-tile.is-lifted.is-over svg { opacity: 0; }
.g-domino-start .ds-tile:focus-visible { box-shadow: 0 0 0 3px var(--ds-gold); }
.g-domino-start .ds-tl { font: 600 15px/1.14 var(--ds-font); text-align: center; text-wrap: balance; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; max-width: 100%; }
.g-domino-start .ds-tx { font: 800 19px/1 var(--ds-font); color: var(--ds-gold); }
.g-domino-start .ds-row { display: flex; align-items: center; gap: 9px; min-height: 22px; color: var(--ds-cream); }
.g-domino-start .ds-num { flex: none; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font: 700 12px/1 var(--font-ui); background: rgba(255, 240, 215, 0.12); color: #ffe2ad; border: 1.5px solid rgba(255, 226, 170, 0.45);
  transition: background 0.2s ease, transform 0.3s cubic-bezier(.2, 1.6, .4, 1), color 0.2s ease; box-sizing: border-box; }
.g-domino-start .ds-row.done .ds-num { background: var(--ds-gold); color: #3a2405; border-color: var(--ds-gold); transform: scale(1.14); }
.g-domino-start .ds-rl { font: 600 15px/1.15 var(--ds-font); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; transition: color 0.3s ease; }
.g-domino-start .ds-row.done .ds-rl { color: #fff8e8; }
.g-domino-start .ds-row.big .ds-rl { font-weight: 800; color: var(--ds-gold); }
.g-domino-start .ds-pop { position: absolute; z-index: 36; left: 0; top: 0; transform: translate(-50%, -50%); font: 800 21px/1 var(--ds-font); letter-spacing: 0.03em; color: var(--ds-gold); white-space: nowrap; pointer-events: none;
  text-shadow: 0 2px 0 #5a2f0b, 0 0 14px rgba(255, 190, 90, 0.65); animation: domino-start-pop 1.05s ease-out both; }
.g-domino-start .ds-pop.soft { color: #fff1d6; font-size: 17px; text-shadow: 0 2px 0 rgba(60, 30, 8, 0.85), 0 0 10px rgba(0, 0, 0, 0.35); }
.g-domino-start .ds-card { position: absolute; z-index: 40; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 190px); width: min(330px, calc(100% - 40px)); padding: 15px 18px 14px; border-radius: 16px; text-align: center; box-sizing: border-box;
  background: linear-gradient(180deg, #fffaf0, #f3e2c0); color: var(--ds-ink); box-shadow: 0 18px 44px rgba(20, 8, 0, 0.5), inset 0 -3px 0 rgba(140, 90, 30, 0.22); animation: domino-start-card 0.75s cubic-bezier(.2, 1.3, .4, 1) both; transform: translateX(-50%); }
.g-domino-start .ds-card-k { font: 700 12px/1 var(--ds-font); letter-spacing: 0.16em; text-transform: uppercase; color: #9a5a1c; }
.g-domino-start .ds-card-t { display: block; margin-top: 8px; font: 800 22px/1.15 var(--ds-font); text-wrap: balance; }
.g-domino-start .ds-card-s { margin-top: 7px; font: 600 15px/1.3 var(--font-ui); color: #5a3b1d; text-wrap: balance; }
.g-domino-start .ds-card-pips { display: flex; justify-content: center; margin-bottom: 8px; }
.g-domino-start.ds-duo .gk-char .gk-bubble { max-width: min(280px, calc(100cqw - var(--sz) * 2 - 58px)); }
@keyframes domino-start-nudge { 0%, 68%, 100% { transform: translateY(0) rotate(0deg); } 76% { transform: translateY(-6px) rotate(-5deg); } 84% { transform: translateY(-2px) rotate(4deg); } 92% { transform: translateY(0) rotate(-1deg); } }
@keyframes domino-start-pop { 0% { opacity: 0; transform: translate(-50%, -30%) scale(0.7); } 18% { opacity: 1; transform: translate(-50%, -50%) scale(1.12); } 70% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -115%); } }
@keyframes domino-start-card { from { opacity: 0; transform: translate(-50%, 18px) scale(0.92); } to { opacity: 1; transform: translateX(-50%); } }
@container (min-width: 700px) {
  .g-domino-start .ds-rack { left: 50%; right: auto; width: 660px; height: 160px; transform: translateX(-50%); }
  .g-domino-start .ds-rack.off { transform: translate(-50%, calc(100% + 34px)); }
  .g-domino-start .ds-tl { font-size: 16px; }
  .g-domino-start .ds-rack-b.ds-list { padding: 6px 22px; }
  .g-domino-start .ds-card { top: 96px; width: 390px; }
  .g-domino-start .ds-card-t { font-size: 26px; }
  .g-domino-start .ds-tag { max-width: 220px; }
  .g-domino-start .ds-tag-t { font-size: 17px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      const an = ctx.analysis || {};
      const inten = ctx.intensity, line = (o) => ctx.line(o), visits = K.visits();
      const care = an.safety === 'care';
      const NMICRO = [3, 3, 4][inten], NBOOST = [2, 3, 4][inten], GROW = 1.5;
      const GMIN = [0.1, 0.15, 0.18][inten], GMAX = [0.95, 0.9, 0.85][inten];
      const SWEET = [0.2, 0.16, 0.12][inten], PERF = [0.08, 0.055, 0.045][inten];
      const GRAV = [28, 33, 36][inten];
      const KX = 0.42, KY = 0.3, ZB = 3.6, PAR = 46;
      const LX = 0.618, LY = 0.786;               // light from the window side (right, high)
      const V = K.dailyPick(VENUES, 2), TB = TABLES[V.table];
      const clamp = K.clamp;

      /* ---------------- today's set (tiers unlock more; a fresh unlock shows up first) ---------------- */
      const owned = (S.store.get('domino-start:sets', null) || ['ivory']).filter(k => SETS[k]);
      if (!owned.includes('ivory')) owned.unshift('ivory');
      const fresh = S.store.get('domino-start:fresh', '');
      const setKey = fresh && owned.includes(fresh) ? fresh : owned[(K.daily() + 1) % owned.length];
      if (fresh) S.store.set('domino-start:fresh', '');
      const SET = SETS[setKey];

      /* ---------------- the player's task and its tiny steps ---------------- */
      const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
      function pickContent(a) {
        let taskRaw = K.clean(a.task || '', 70).replace(/[.!?…]+$/, '');
        const cut = taskRaw.split(/\s+(?:but|and then|because|cos|so that|though|although|which|while|before|after)\s+|\s*[,;:(]\s*/i)[0];
        if (cut && cut.split(/\s+/).length >= 2) taskRaw = cut;
        const FILLER = /^(THAT THING I SAID|TOMORROW.S LIST|WHAT IF IT GOES WRONG|SHOULD.VE DONE BETTER|WHAT THEY THINK|EVERYTHING AT ONCE|THE BIG WORRY)$/;
        const todo = !taskRaw ? (a.strands || []).concat(a.core ? [a.core] : []).find(s => s && s.loop === 'todo' && s.label && !FILLER.test(s.label)) : null;
        let task = taskRaw ? cap(K.words(taskRaw, 7)) : todo ? todo.label : '';
        const own = !!task;
        if (!task) task = 'The thing I’m putting off';
        const corpus = [taskRaw, todo ? todo.label : '', ctx.text || ''].join(' ');
        const tpl = TEMPLATES.find(t => t.re.test(corpus));
        let base = (tpl ? tpl.steps : care ? CARE_STEPS : GENERIC).slice();
        const ts = K.clean(a.tinyStep || '', 90).replace(/[.!]+$/, '');
        const startish = /\b(open|write|type|start|pick|put|find|list|read|clear|draft|grab|fill|jot|save|first (line|step|bit|two))\b/i;
        const calmish = /\b(breath\w*|breathe|water|window|lights?|phone|worry slot|bed|sleep|wait)\b/i;
        let steps = base;
        const fits = own || a.parent === 'Getting Started' || a.parent === 'Performance / Confidence';
        // the AI's tiny step is specific, so it leads; the local reader's is generic, so a matching template wins
        if (ts && startish.test(ts) && !calmish.test(ts) && fits && (a.source === 'ai' || !tpl)) steps = [K.words(cap(ts), 10)].concat(base.slice(2), base.slice(1, 2));
        return { task, own, steps: steps.slice(0, NMICRO), tpl: !!tpl };
      }
      let CT = pickContent(an);

      /* ---------------- dominoes ---------------- */
      const fmtX = (s) => (s < 3 ? String(Math.round(s * 100) / 100) : (Math.round(s * 10) / 10).toFixed(1)) + '×';
      function mkDom(kind, s, label, pips, idx) {
        return { kind, idx, s, H: s, T: 0.2 * s, D: 0.55 * s, x: 0, ix: 0, tx: null, base: 0, lift: 0, vy: 0, th: 0, om: 0, jig: 0, jv: 0, sq: 0,
          st: 'tray', label, pips, glow: 0, grade: '', q: 0, push: 0, landedOnce: false, ticked: false };
      }
      const DOMS = [];
      for (let i = 0; i < NMICRO; i++) DOMS.push(mkDom('micro', 1, CT.steps[i], PIP_MICRO[i], i));
      for (let j = 0; j < NBOOST; j++) { const s = Math.pow(GROW, j + 1); DOMS.push(mkDom('boost', s, fmtX(s), PIP_BOOST[j], NMICRO + j)); }
      const GI = DOMS.length, giant = mkDom('giant', Math.pow(GROW, NBOOST + 1), CT.task, [6, 6], GI);
      DOMS.push(giant);
      { let back = 0; for (let i = 1; i < DOMS.length; i++) { back += DOMS[i - 1].T + 0.5 * DOMS[i - 1].H; DOMS[i].ix = back; } }
      DOMS[0].st = 'stand';
      giant.x = giant.ix; giant.st = 'hidden';
      const BELL = { th: 0.84, psi: 0, pv: 0, hit: false, rb: 0, Lb: 0, pvx: 0, pvy: 0, post: 0, top: 0, z: 0, lastSign: 0 };
      (function layoutBell() {
        const g = giant, rb = 0.14 * g.H, bc = { x: g.x + g.T + g.H * Math.sin(BELL.th), y: g.H * Math.cos(BELL.th) }, Lb = rb * 1.25 + 0.08 * g.H;
        Object.assign(BELL, { rb, Lb, pvx: bc.x, pvy: bc.y + Lb, post: bc.x + rb * 1.25 + 0.2 * g.H, top: bc.y + Lb + 0.07 * g.H + 0.098 * g.H, z: g.D * 0.5 });
      })();

      /* ---------------- state ---------------- */
      const G = { phase: 'intro', cur: -1, queue: [], busy: false, grades: [], qs: [], ts: 1, slow: false, flash: 0, demo: null, finished: false, camK: 3, framer: null, perfectRun: 0, idle: 0, started: false };
      const setPhase = (p) => { G.phase = p; ctx.track('phase', { p }); };
      const CAM = { x: 3, Z: 40, tx: 3, tZ: 40, w: 390, h: 844, ybase: 590, top: 182, rackTop: 660, shake: 0, ox: 0, oy: 0 };
      let phone = true;

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.5 });
      const fx = h('div', { class: 'ds-fx' });
      const tag = h('div', { class: 'ds-tag', 'aria-hidden': 'true' }, h('span', { class: 'ds-tag-k', text: 'The big one' }), h('span', { class: 'ds-tag-t gk-user', text: CT.task }));
      const ftag = h('div', { class: 'ds-ftag gk-user', 'aria-hidden': 'true' });
      fx.append(tag, ftag);
      const flickEl = h('div', { class: 'ds-flick', role: 'button', tabindex: '0', 'aria-label': 'Flick the tiny domino', hidden: true });
      const rack = h('div', { class: 'ds-rack', role: 'group', 'aria-label': 'Domino box' },
        h('div', { class: 'ds-rack-h' }, h('span', { class: 'ds-rack-t', text: '' }), h('span', { class: 'ds-rack-s', 'aria-live': 'polite', text: '' })),
        h('div', { class: 'ds-rack-b' }));
      rack.classList.add('off');
      el.append(fx, flickEl, rack);
      const rackT = rack.querySelector('.ds-rack-t'), rackS = rack.querySelector('.ds-rack-s'), rackB = rack.querySelector('.ds-rack-b');
      const rush = K.character('rush', { side: 'right', mood: care ? 'think' : 'worried', x: 10, y: 64 });
      const patch = K.character('patch', { side: 'left', mood: 'think', x: 300, y: 64 });
      patch.show(false);
      const say = (c, text, o) => { (c === rush ? patch : rush).hush(); return c.say(text, o); };

      /* ---------------- audio: a warm tabletop swing that ducks for the cascade ---------------- */
      const amb = K.ambience(V.amb);
      amb.level(V.amb === 'rain' ? 0.2 : 0.26, 2);
      const MZ = { next: 0, i: 0, bpm: 90, vol: 0.85, duck: 1, duckT: 1, layer: 0, live: false };
      const PROG = [['F2', ['A3', 'C4', 'E4']], ['D2', ['F3', 'A3', 'C4']], ['A#1', ['D4', 'F4', 'A4']], ['C2', ['E4', 'G4', 'A#4']]];
      K.loop((dt) => {
        if (!A.ctx) return;
        if (!MZ.live) { MZ.live = true; MZ.next = A.now() + 0.15; }
        MZ.duck += (MZ.duckT - MZ.duck) * Math.min(1, dt * 3);
        const spb = 60 / MZ.bpm, ahead = A.now() + 0.22;
        while (MZ.next < ahead) {
          const t = MZ.next, i = MZ.i, b = i % 4, bar = Math.floor(i / 4) % PROG.length, pr = PROG[bar], v = MZ.vol * MZ.duck;
          if (v > 0.03) {
            if (b === 0) {
              A.pluck(A.note(pr[0]), { when: t, vol: 0.26 * v, damp: 0.993, lp: 620, bus: 'music' });
              pr[1].forEach((n, k) => A.tone({ when: t + k * 0.014, type: 'triangle', freq: A.note(n), dur: spb * 3.7, vol: 0.026 * v, attack: 0.04, lp: 1500, verb: 0.35, bus: 'music' }));
            }
            if (b === 2) A.pluck(A.note(pr[0]) * 1.5, { when: t, vol: 0.17 * v, damp: 0.992, lp: 600, bus: 'music' });
            if (b === 1 || b === 3) A.noise({ when: t + spb * 0.02, filter: 'bandpass', freq: 2300 + b * 120, q: 7, dur: 0.035, vol: 0.05 * v, bus: 'music' });
            A.noise({ when: t + spb * 0.64, filter: 'bandpass', freq: 3100, q: 8, dur: 0.025, vol: 0.028 * v, bus: 'music' });
            if (MZ.layer >= 1) A.noise({ when: t + spb * 0.5, filter: 'highpass', freq: 7200, dur: 0.05, attack: 0.012, vol: 0.016 * v, bus: 'music' });
            if (MZ.layer >= 2 && (b === 1 || b === 3) && (i >> 1) % 3 !== 2) A.chime(A.note(pr[1][(i >> 1) % pr[1].length]) * 2, { when: t + spb * 0.32, vol: 0.022 * v, dur: 1.1, verb: 0.4, bus: 'music' });
          }
          MZ.i++; MZ.next += spb;
        }
      });
      const now = () => performance.now();
      const sync = (n) => { if (A.ctx) A.sync(n, now()); };
      function sLift() { if (!A.ctx) return; A.wood(undefined, 0.07, 2.1); A.noise({ filter: 'bandpass', freq: 1400, to: 2600, q: 0.9, dur: 0.14, attack: 0.05, vol: 0.05 }); sync('lift'); }
      function sLand(s) { if (!A.ctx) return; const p = 1 / Math.sqrt(s); A.tone({ type: 'sine', freq: 190 * p, to: 80 * p, glide: 0.07, dur: 0.17, vol: 0.2 }); A.wood(undefined, 0.17, 1.05 * p); A.noise({ filter: 'lowpass', freq: 1300 * p, dur: 0.05, vol: 0.07 }); sync('land'); }
      function sClack(s, pow) {
        if (!A.ctx) return; const p = 1 / Math.sqrt(s);
        A.wood(undefined, 0.2 * pow, 1.4 * p);
        A.noise({ filter: 'bandpass', freq: 3600 * p, q: 2, dur: 0.025 + 0.02 * s, vol: 0.12 * pow });
        if (s > 1.2) A.tone({ type: 'sine', freq: 230 * p, to: 70 * p, glide: 0.1, dur: 0.12 + 0.05 * s, vol: 0.1 * pow * Math.min(2, s) });
        sync('clack');
      }
      function sNote(i, vol) { if (A.ctx) A.pluck(A.note(NOTES[Math.min(NOTES.length - 1, i)]), { vol: vol || 0.15, damp: 0.995, verb: 0.3 }); }
      function sChord(i) { if (!A.ctx) return; const pr = PROG[Math.floor(MZ.i / 4) % PROG.length][1]; A.chime(A.note(pr[i % pr.length]) * 2, { vol: 0.07, dur: 1.3 }); }
      function sBell(pow) {
        if (!A.ctx) return;
        const f = 520 * V.tone;
        const parts = V.bellKind === 'cow' ? [[1, 0.55, 1.3], [1.48, 0.38, 1], [2.1, 0.3, 0.75], [2.9, 0.2, 0.55], [4.2, 0.12, 0.4]]
          : [[0.5, 0.3, 4.6], [1, 0.55, 3.9], [1.19, 0.28, 3.1], [1.5, 0.2, 2.6], [2, 0.38, 2.2], [2.52, 0.16, 1.5], [3.01, 0.1, 1.1], [4.07, 0.07, 0.7]];
        parts.forEach(([m, v, d]) => { A.tone({ type: 'sine', freq: f * m, dur: d * (0.45 + 0.55 * pow), vol: 0.17 * v * pow, attack: 0.002, verb: 0.5 }); A.tone({ type: 'sine', freq: f * m * 1.0045, dur: d * 0.7, vol: 0.06 * v * pow, attack: 0.002 }); });
        A.noise({ filter: 'highpass', freq: 5000, dur: 0.04, vol: 0.12 * pow });
        sync('bell');
      }
      function sThud(s) { if (!A.ctx) return; A.tone({ type: 'sine', freq: 120, to: 38, glide: 0.18, dur: 0.5, vol: 0.32 * Math.min(1.4, s / 4) }); A.noise({ filter: 'lowpass', freq: 500, dur: 0.3, vol: 0.18 }); A.wood(undefined, 0.2, 0.5); sync('thud'); }
      function sBoing() { if (A.ctx) { A.boing({ freq: 320, vol: 0.08 }); sync('boing'); } }
      function sTick(i) { if (!A.ctx) return; A.click({ vol: 0.09 }); A.chime(A.note(NOTES[Math.min(NOTES.length - 1, i + 3)]) * 2, { vol: 0.04, dur: 0.6 }); }
      let felt = null;
      S.onDestroy(() => { if (felt) felt.stop(); });

      /* ---------------- projection (oblique 2.5D: depth runs up and to the right) ---------------- */
      const sx = (x, z) => CAM.w / 2 + (x - CAM.x) * CAM.Z + (z || 0) * CAM.Z * KX + CAM.ox;
      const sy = (y, z) => CAM.ybase - y * CAM.Z - (z || 0) * CAM.Z * KY + CAM.oy;
      const shadeCache = new Map();
      function shade(c, k) {
        const q = Math.round(k * 50), key = c[0] + ',' + c[1] + ',' + c[2] + ':' + q;
        let v = shadeCache.get(key);
        if (!v) { const f = q / 50; v = 'rgb(' + Math.min(255, Math.round(c[0] * f)) + ',' + Math.min(255, Math.round(c[1] * f)) + ',' + Math.min(255, Math.round(c[2] * f)) + ')'; shadeCache.set(key, v); }
        return v;
      }

      /* ---------------- layout + painted caches ---------------- */
      let BG = null, WOOD = null, WPAT = null, BELLSPR = null, VIG = null, CHARMS = [];
      function placeChars() {
        const w = CAM.w, sz = phone ? 72 : 100;
        rush.el.style.setProperty('--sz', sz + 'px'); patch.el.style.setProperty('--sz', sz + 'px');
        rush.place(phone ? 10 : 26, phone ? 64 : 74);
        patch.place(w - sz - (phone ? 10 : 26), phone ? 64 : 74);
      }
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        phone = w < 700;
        CAM.w = w; CAM.h = H;
        const wasOff = rack.classList.contains('off');
        if (wasOff) rack.style.transition = 'none';
        rack.classList.remove('off');
        const rr = K.rectIn(rack, el);
        if (wasOff) { rack.classList.add('off'); void rack.offsetWidth; rack.style.transition = ''; }
        CAM.rackTop = rr.h > 20 ? rr.y : H - 16 - (phone ? 168 : 160);
        CAM.ybase = Math.round(CAM.rackTop - (phone ? 112 : 92));
        CAM.top = phone ? 198 : 200;
        placeChars();
        paintCaches();
        if (G.framer) G.framer();
        CAM.x = CAM.tx; CAM.Z = CAM.tZ;
        tagSize = null;
      }
      function off(w, hh, dpr) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(hh * dpr)); const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return { c, g }; }
      function grad(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(s => gr.addColorStop(s[0], s[1])); return gr; }
      function rrect(g, x, y, w, hh, r) { r = Math.min(r, w / 2, hh / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function paintCaches() {
        const D = K.dark(), w = CAM.w, H = CAM.h, dpr = cv.dpr || 1;
        const b = off(w + PAR * 2, H, dpr);
        paintBG(b.g, w + PAR * 2, H, D);
        BG = b.c;
        WOOD = paintWood(D); WPAT = null;
        BELLSPR = paintBell(V.bellKind);
        CHARMS = K.collection().map(n => VENUES.find(v => v.bell === n)).filter(v => v && v.id !== V.id).slice(0, 3).map(v => paintBell(v.bellKind));
        const v = off(w, H, dpr), vg = v.g.createRadialGradient(w / 2, H * 0.46, Math.min(w, H) * 0.3, w / 2, H * 0.5, Math.max(w, H) * 0.78);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, D ? 'rgba(4,2,10,0.5)' : 'rgba(60,30,8,0.26)');
        v.g.fillStyle = vg; v.g.fillRect(0, 0, w, H); VIG = v.c;
      }

      /* ---- the room behind the table (screen space, cached; a little parallax) ---- */
      function paintBG(g, w, H, D) {
        const R = K.rng(K.daily() * 7 + 3), yb = CAM.ybase;
        const win = phone ? { x: w * 0.55, y: H * 0.2, w: w * 0.36, h: H * 0.22 } : { x: w * 0.6, y: H * 0.11, w: w * 0.24, h: H * 0.34 };
        const beam = (col, a) => {
          g.save(); g.globalCompositeOperation = 'lighter';
          for (let l = 0; l < 3; l++) {
            const e = l * 0.06 * w, gr = g.createLinearGradient(win.x, win.y + win.h, win.x - w * 0.3, yb);
            gr.addColorStop(0, col.replace('A', String(a * 0.3))); gr.addColorStop(1, col.replace('A', '0'));
            g.fillStyle = gr; g.beginPath(); g.moveTo(win.x + 10 + e * 0.3, win.y + win.h); g.lineTo(win.x + win.w - 10 - e * 0.3, win.y + win.h); g.lineTo(win.x + win.w - w * 0.2 - e, yb + 20); g.lineTo(win.x - w * 0.42 + e, yb + 20); g.closePath(); g.fill();
          }
          g.restore();
        };
        const windowFrame = (sky, frame) => {
          g.fillStyle = 'rgba(0,0,0,0.25)'; rrect(g, win.x - 10, win.y - 10, win.w + 20, win.h + 24, 6); g.fill();
          g.fillStyle = sky; g.fillRect(win.x, win.y, win.w, win.h);
          g.strokeStyle = frame; g.lineWidth = 7; g.strokeRect(win.x, win.y, win.w, win.h);
          g.lineWidth = 4; g.beginPath(); g.moveTo(win.x + win.w / 2, win.y); g.lineTo(win.x + win.w / 2, win.y + win.h); g.moveTo(win.x, win.y + win.h * 0.5); g.lineTo(win.x + win.w, win.y + win.h * 0.5); g.stroke();
          g.fillStyle = frame; g.fillRect(win.x - 12, win.y + win.h + 2, win.w + 24, 8);
          g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(win.x - 12, win.y + win.h + 10, win.w + 24, 4);
        };
        const stars = (n, x0, y0, x1, y1) => { g.fillStyle = '#fff'; for (let i = 0; i < n; i++) { g.globalAlpha = 0.3 + R() * 0.6; const s = R() < 0.15 ? 2 : 1.2; g.fillRect(x0 + R() * (x1 - x0), y0 + R() * (y1 - y0), s, s); } g.globalAlpha = 1; };
        const moon = (x, y, r) => { const mg = g.createRadialGradient(x, y, r * 0.3, x, y, r * 4); mg.addColorStop(0, 'rgba(255,244,214,0.35)'); mg.addColorStop(1, 'rgba(255,244,214,0)'); g.fillStyle = mg; g.fillRect(x - r * 4, y - r * 4, r * 8, r * 8); g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = 'rgba(200,190,160,0.35)'; g.beginPath(); g.arc(x - r * 0.3, y + r * 0.2, r * 0.22, 0, TAU); g.arc(x + r * 0.25, y - r * 0.3, r * 0.14, 0, TAU); g.fill(); };
        const lampGlow = (x, y, r, a) => { const lg = g.createRadialGradient(x, y, 4, x, y, r); lg.addColorStop(0, 'rgba(255,214,150,' + a + ')'); lg.addColorStop(1, 'rgba(255,190,120,0)'); g.fillStyle = lg; g.fillRect(x - r, y - r, r * 2, r * 2); };
        const plant = (x, y, s, leaf, pot) => {
          g.fillStyle = pot; g.beginPath(); g.moveTo(x - 13 * s, y); g.lineTo(x + 13 * s, y); g.lineTo(x + 10 * s, y + 22 * s); g.lineTo(x - 10 * s, y + 22 * s); g.closePath(); g.fill();
          g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x - 13 * s, y, 26 * s, 4 * s);
          for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.33; g.fillStyle = i % 2 ? leaf[0] : leaf[1]; g.beginPath(); g.ellipse(x + Math.cos(a) * 15 * s, y - 4 * s + Math.sin(a) * 16 * s, 5 * s, 15 * s, a + Math.PI / 2, 0, TAU); g.fill(); }
        };
        if (V.id === 'kitchen') {
          g.fillStyle = grad(g, 0, 0, 0, H, D ? [[0, '#3c2d2b'], [1, '#261c1f']] : [[0, '#f5e9d2'], [1, '#e7d0a6']]); g.fillRect(0, 0, w, H);
          const ty = Math.round(H * (phone ? 0.47 : 0.5)), tw = phone ? 34 : 46, th = tw / 2;
          for (let y = ty, r = 0; y < H; y += th, r++) for (let x = -(r % 2) * tw / 2; x < w; x += tw) {
            const k = 0.94 + R() * 0.08;
            g.fillStyle = D ? shade([76, 62, 58], k) : shade([250, 244, 232], k); rrect(g, x + 1, y + 1, tw - 2, th - 2, 3); g.fill();
            g.fillStyle = D ? 'rgba(255,230,200,0.06)' : 'rgba(255,255,255,0.6)'; g.fillRect(x + 3, y + 2, tw - 8, 2);
          }
          g.fillStyle = D ? '#4c3a35' : '#d9c39c'; g.fillRect(0, ty - 6, w, 7);
          windowFrame(grad(g, 0, win.y, 0, win.y + win.h, D ? [[0, '#172042'], [0.6, '#3a3566'], [1, '#c4705a']] : [[0, '#8fc9f4'], [0.65, '#d0e9fb'], [1, '#ffe7c2']]), D ? '#d9c8b0' : '#fffaf0');
          if (D) { stars(28, win.x, win.y, win.x + win.w, win.y + win.h * 0.6); moon(win.x + win.w * 0.72, win.y + win.h * 0.26, 9); }
          else { const sx0 = win.x + win.w * 0.3, sy0 = win.y + win.h * 0.78; const sg = g.createRadialGradient(sx0, sy0, 2, sx0, sy0, 50); sg.addColorStop(0, 'rgba(255,248,214,0.95)'); sg.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = sg; g.fillRect(sx0 - 50, sy0 - 50, 100, 100); }
          for (const side of [-1, 1]) { // gingham curtains
            const cx = side < 0 ? win.x - 8 : win.x + win.w - 22, cw = 30;
            for (let y = win.y - 12; y < win.y + win.h + 8; y += 8) for (let x = 0; x < cw; x += 8) { g.fillStyle = ((x + y) / 8) % 2 < 1 ? (D ? '#8a3b3b' : '#e0565a') : (D ? '#d9c8b0' : '#fff6ee'); g.fillRect(cx + x, y, 8, 8); }
            g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(cx + (side < 0 ? cw - 6 : 0), win.y - 12, 6, win.h + 20);
          }
          g.fillStyle = D ? '#6b5240' : '#b48a5a'; g.fillRect(win.x - 18, win.y - 16, win.w + 36, 6);
          const shx = phone ? w * 0.08 : w * 0.12, shy = phone ? H * 0.34 : H * 0.3, shw = phone ? w * 0.38 : w * 0.26;
          g.fillStyle = D ? '#5a4232' : '#a87a4c'; g.fillRect(shx, shy, shw, 7); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(shx, shy + 7, shw, 4);
          const jars = [[0.1, 30, '#c9e2d6'], [0.32, 40, '#f2d7a0'], [0.56, 26, '#e7b9a8']];
          jars.forEach(([fx2, jh, col]) => { const jx = shx + shw * fx2; g.fillStyle = D ? 'rgba(160,190,200,0.35)' : 'rgba(255,255,255,0.55)'; rrect(g, jx, shy - jh, 24, jh, 5); g.fill(); g.fillStyle = D ? shade([120, 100, 90], 1) : col; rrect(g, jx + 3, shy - jh * 0.6, 18, jh * 0.6 - 2, 3); g.fill(); g.fillStyle = D ? '#8a6a52' : '#c08a52'; g.fillRect(jx - 1, shy - jh - 5, 26, 6); });
          plant(shx + shw * 0.86, shy - 22, 0.9, D ? ['#2d4a3b', '#3b5c48'] : ['#4f9a6a', '#6cb47f'], D ? '#7a4a36' : '#c4704e');
          if (D) { lampGlow(w * 0.42, H * 0.06, H * 0.42, 0.34); g.fillStyle = '#2a201c'; g.fillRect(w * 0.42 - 1, 0, 2, H * 0.06); g.fillStyle = '#d9a35a'; g.beginPath(); g.moveTo(w * 0.42 - 26, H * 0.06 + 20); g.lineTo(w * 0.42 + 26, H * 0.06 + 20); g.lineTo(w * 0.42 + 12, H * 0.06); g.lineTo(w * 0.42 - 12, H * 0.06); g.closePath(); g.fill(); }
          beam(D ? 'rgba(255,170,110,A)' : 'rgba(255,236,190,A)', D ? 0.12 : 0.22);
        } else if (V.id === 'desk') {
          g.fillStyle = grad(g, 0, 0, 0, H, D ? [[0, '#1d2436'], [1, '#121827']] : [[0, '#e1e9e1'], [1, '#c6d4c9']]); g.fillRect(0, 0, w, H);
          g.fillStyle = D ? 'rgba(255,255,255,0.025)' : 'rgba(40,70,50,0.05)'; for (let x = 0; x < w; x += 22) g.fillRect(x, 0, 9, H);
          windowFrame(grad(g, 0, win.y, 0, win.y + win.h, D ? [[0, '#0b1230'], [1, '#26305a']] : [[0, '#9ccff4'], [1, '#e6f3fb']]), D ? '#3a4258' : '#f4f6f2');
          if (D) { stars(36, win.x, win.y, win.x + win.w, win.y + win.h); moon(win.x + win.w * 0.3, win.y + win.h * 0.3, 10); }
          else { for (let i = 0; i < 3; i++) { const cx = win.x + win.w * (0.2 + i * 0.3), cy = win.y + win.h * (0.25 + (i % 2) * 0.2); g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(cx, cy, 18, 7, 0, 0, TAU); g.ellipse(cx + 10, cy - 4, 12, 7, 0, 0, TAU); g.fill(); } }
          const bx = phone ? w * 0.09 : w * 0.14, by = phone ? H * 0.22 : H * 0.14, bw2 = phone ? w * 0.34 : w * 0.22, bh2 = phone ? H * 0.16 : H * 0.24;
          g.fillStyle = D ? '#5a4030' : '#7a5232'; rrect(g, bx - 6, by - 6, bw2 + 12, bh2 + 12, 4); g.fill();
          g.fillStyle = D ? '#8a6a48' : '#c99a64'; g.fillRect(bx, by, bw2, bh2);
          for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(80,50,20,' + (0.08 + R() * 0.1) + ')'; g.fillRect(bx + R() * bw2, by + R() * bh2, 2, 2); }
          const notes = ['#fff2a8', '#ffd0d6', '#c8ecff', '#d9f5c8'];
          for (let i = 0; i < 4; i++) { const nx = bx + 10 + (i % 2) * bw2 * 0.48 + R() * 8, ny = by + 10 + Math.floor(i / 2) * bh2 * 0.48 + R() * 6; g.save(); g.translate(nx + 20, ny + 18); g.rotate((R() - 0.5) * 0.25); g.fillStyle = D ? shade([200, 190, 160], 0.6) : notes[i]; g.fillRect(-20, -18, Math.min(46, bw2 * 0.4), Math.min(38, bh2 * 0.4)); g.fillStyle = 'rgba(60,40,30,0.25)'; for (let l = 0; l < 3; l++) g.fillRect(-14, -8 + l * 8, 26 - l * 5, 2); g.fillStyle = '#d9483b'; g.beginPath(); g.arc(0, -15, 3, 0, TAU); g.fill(); g.restore(); }
          const sy0 = win.y + win.h + 46, sx0 = win.x - 10;
          g.fillStyle = D ? '#3a2a20' : '#8a5e3a'; g.fillRect(sx0 - 20, sy0, win.w + 60, 7);
          let bxx = sx0 - 10; const cols = D ? ['#4a3a5a', '#5a3a30', '#2f4a4a', '#5a5030', '#3a3a5a'] : ['#7d5ba6', '#c0573f', '#3d8a8a', '#d9a440', '#4a6ab0'];
          for (let i = 0; i < 9 && bxx < sx0 + win.w + 30; i++) { const bw3 = 9 + R() * 8, bh3 = 26 + R() * 18; g.fillStyle = cols[i % cols.length]; g.fillRect(bxx, sy0 - bh3, bw3, bh3); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(bxx + 2, sy0 - bh3 + 6, bw3 - 4, 2); bxx += bw3 + 1.5; }
          if (D) lampGlow(win.x + win.w * 0.2, yb - 70, phone ? 260 : 380, 0.3);
          beam(D ? 'rgba(170,190,255,A)' : 'rgba(255,244,214,A)', D ? 0.08 : 0.2);
        } else if (V.id === 'cafe') {
          g.fillStyle = D ? '#3e231d' : '#b4614a'; g.fillRect(0, 0, w, H);
          const bh = 11, bw = 26;
          for (let y = 0, r = 0; y < H; y += bh, r++) for (let x = -(r % 2) * bw / 2; x < w; x += bw) { g.fillStyle = D ? shade([74, 42, 34], 0.85 + R() * 0.3) : shade([186, 100, 74], 0.86 + R() * 0.24); g.fillRect(x + 1, y + 1, bw - 2, bh - 2); }
          const ww = phone ? { x: w * 0.5, y: H * 0.16, w: w * 0.44, h: H * 0.28 } : { x: w * 0.56, y: H * 0.08, w: w * 0.34, h: H * 0.4 };
          Object.assign(win, ww);
          g.fillStyle = grad(g, 0, win.y, 0, win.y + win.h, D ? [[0, '#121a30'], [1, '#2a2440']] : [[0, '#9fb6c6'], [1, '#d9e3e8']]); g.fillRect(win.x, win.y, win.w, win.h);
          for (let i = 0; i < 26; i++) { const bx2 = win.x + R() * win.w, by2 = win.y + win.h * (0.45 + R() * 0.5), br = 4 + R() * 12; const warm = R() < 0.6; g.fillStyle = warm ? 'rgba(255,190,110,' + (D ? 0.42 : 0.3) + ')' : 'rgba(150,200,255,' + (D ? 0.32 : 0.22) + ')'; g.beginPath(); g.arc(bx2, by2, br, 0, TAU); g.fill(); }
          g.strokeStyle = D ? 'rgba(200,220,255,0.18)' : 'rgba(255,255,255,0.45)'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 40; i++) { const rx = win.x + R() * win.w, ry = win.y + R() * win.h; g.moveTo(rx, ry); g.lineTo(rx - 2, ry + 10); } g.stroke();
          g.strokeStyle = D ? '#20160f' : '#2b2b2b'; g.lineWidth = 8; g.strokeRect(win.x, win.y, win.w, win.h); g.lineWidth = 4; g.beginPath(); g.moveTo(win.x + win.w / 2, win.y); g.lineTo(win.x + win.w / 2, win.y + win.h); g.stroke();
          for (let x = win.x - 14, i = 0; x < win.x + win.w + 14; x += 18, i++) { g.fillStyle = i % 2 ? (D ? '#d9c8b0' : '#fff4e6') : (D ? '#7a2a2a' : '#d6453c'); g.beginPath(); g.moveTo(x, win.y - 30); g.lineTo(x + 18, win.y - 30); g.lineTo(x + 18, win.y - 10); g.quadraticCurveTo(x + 9, win.y - 2, x, win.y - 10); g.closePath(); g.fill(); }
          const cbx = phone ? w * 0.1 : w * 0.16, cby = phone ? H * 0.28 : H * 0.16, cbw = phone ? w * 0.3 : w * 0.2, cbh = phone ? H * 0.14 : H * 0.26;
          g.fillStyle = D ? '#4a3220' : '#7a5232'; rrect(g, cbx - 7, cby - 7, cbw + 14, cbh + 14, 5); g.fill();
          g.fillStyle = D ? '#16221c' : '#1f3229'; g.fillRect(cbx, cby, cbw, cbh);
          g.strokeStyle = 'rgba(240,240,230,0.55)'; g.lineWidth = 2; g.lineCap = 'round';
          for (let l = 0; l < 4; l++) { g.beginPath(); const ly = cby + 16 + l * (cbh - 24) / 3; g.moveTo(cbx + 12, ly); for (let x = cbx + 12; x < cbx + cbw * (0.55 + R() * 0.35); x += 6) g.lineTo(x, ly + Math.sin(x * 0.5) * 2); g.stroke(); }
          g.lineCap = 'butt';
          for (const lx of phone ? [w * 0.3] : [w * 0.32, w * 0.5]) { g.strokeStyle = D ? '#140c08' : '#3a2a20'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx, H * 0.08); g.stroke(); lampGlow(lx, H * 0.1, H * 0.3, D ? 0.36 : 0.18); g.fillStyle = D ? '#2a4a3a' : '#2f5a46'; g.beginPath(); g.ellipse(lx, H * 0.08 + 12, 24, 14, 0, Math.PI, 0); g.fill(); g.fillStyle = '#ffe6b0'; g.beginPath(); g.ellipse(lx, H * 0.08 + 12, 10, 4, 0, 0, Math.PI); g.fill(); }
          beam(D ? 'rgba(255,190,120,A)' : 'rgba(255,242,214,A)', D ? 0.07 : 0.16);
        } else {
          g.fillStyle = grad(g, 0, 0, 0, yb, D ? [[0, '#0a1230'], [0.6, '#20265a'], [1, '#4a3860']] : [[0, '#7fb6e6'], [0.55, '#ffd6a6'], [1, '#ff9e78']]); g.fillRect(0, 0, w, H);
          if (D) { stars(90, 0, 0, w, yb * 0.6); moon(w * (phone ? 0.78 : 0.7), H * 0.14, 14); }
          else { const sx0 = w * (phone ? 0.74 : 0.7), sy0 = yb - H * 0.16; const sg = g.createRadialGradient(sx0, sy0, 6, sx0, sy0, 160); sg.addColorStop(0, 'rgba(255,250,220,1)'); sg.addColorStop(0.12, 'rgba(255,236,180,0.9)'); sg.addColorStop(1, 'rgba(255,200,140,0)'); g.fillStyle = sg; g.fillRect(sx0 - 160, sy0 - 160, 320, 320); }
          const hills = D ? ['#1c2448', '#151b36', '#0f1428'] : ['#c49a9a', '#8a9a7a', '#5f7a4e'];
          hills.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, H); const base = yb - H * (0.2 - i * 0.055); for (let x = 0; x <= w + 20; x += 20) g.lineTo(x, base - Math.sin(x * (0.008 + i * 0.004) + i * 2) * (16 + i * 6) - (R() * 6)); g.lineTo(w, H); g.closePath(); g.fill(); });
          g.fillStyle = D ? '#0c1a10' : '#3f6a3a';
          g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= w + 16; x += 16) g.lineTo(x, yb - 70 - Math.abs(Math.sin(x * 0.07)) * 14 - R() * 6); g.lineTo(w, H); g.closePath(); g.fill();
          const y0 = H * 0.09, sag = H * 0.06;
          g.strokeStyle = D ? 'rgba(20,20,30,0.9)' : 'rgba(60,50,40,0.7)'; g.lineWidth = 1.5; g.beginPath();
          for (let i = 0; i <= 40; i++) { const tt = i / 40, x = tt * w, y = y0 + Math.sin(tt * Math.PI) * sag; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
          g.stroke();
          const nb = phone ? 9 : 15;
          for (let i = 1; i < nb; i++) { const tt = i / nb, x = tt * w, y = y0 + Math.sin(tt * Math.PI) * sag + 6, c = ['#ffd98a', '#ffb0a0', '#bfe3ff', '#d9ffb8'][i % 4]; const bg2 = g.createRadialGradient(x, y, 0, x, y, D ? 22 : 12); bg2.addColorStop(0, K.hexA(c, D ? 0.7 : 0.5)); bg2.addColorStop(1, K.hexA(c, 0)); g.fillStyle = bg2; g.fillRect(x - 22, y - 22, 44, 44); g.fillStyle = c; g.beginPath(); g.ellipse(x, y, 2.6, 3.4, 0, 0, TAU); g.fill(); }
          plant(phone ? w * 0.14 : w * 0.18, yb - 96, 1.3, D ? ['#1f3a2a', '#2a4a34'] : ['#4a8a52', '#5ea064'], D ? '#5a3a2a' : '#b8643e');
        }
        const sh = g.createLinearGradient(0, yb - 160, 0, yb);
        sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, D ? 'rgba(0,0,0,0.35)' : 'rgba(60,30,10,0.16)');
        g.fillStyle = sh; g.fillRect(0, yb - 160, w, 170);
      }
      function paintWood(D) {
        const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
        const g = c.getContext('2d'), R = K.rng(77 + V.table.length);
        g.scale(2, 2);
        const k = D ? 0.7 : 1, tint = (col, f) => [col[0] * k * f, col[1] * k * f, col[2] * k * (f + (D ? 0.04 : 0))];
        g.fillStyle = shade(tint(TB.base, 1), 1); g.fillRect(0, 0, 512, 256);
        if (TB.kind === 'marble') {
          for (let i = 0; i < 14; i++) {
            const y0 = R() * 256, a = 6 + R() * 22, f = 1 + Math.floor(R() * 3), ph = R() * TAU, gold = R() < 0.25;
            g.strokeStyle = gold ? 'rgba(200,170,110,' + (0.25 + R() * 0.25) + ')' : 'rgba(120,118,112,' + (0.12 + R() * 0.2) + ')'; g.lineWidth = 0.6 + R() * 1.6;
            g.beginPath(); for (let x = 0; x <= 512; x += 6) { const y = y0 + Math.sin(x / 512 * TAU * f + ph) * a + Math.sin(x / 512 * TAU * (f + 2) + ph * 2) * a * 0.3; if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
          }
          for (let i = 0; i < 400; i++) { g.fillStyle = 'rgba(255,255,255,' + R() * 0.25 + ')'; g.fillRect(R() * 512, R() * 256, 2, 2); }
        } else {
          const seam = TB.seam;
          for (let py = 0; py < 256; py += seam) {
            const pk = 0.9 + R() * 0.16;
            g.fillStyle = shade(tint(TB.base, pk), 1); g.fillRect(0, py, 512, seam);
            for (let i = 0; i < 14; i++) {
              const y0 = py + R() * seam, a = 1 + R() * 4, f = 1 + Math.floor(R() * 3), ph = R() * TAU, dk = R() < 0.7;
              g.strokeStyle = dk ? 'rgba(' + TB.dark.map(v => Math.round(v * k)).join(',') + ',' + (0.12 + R() * 0.2) + ')' : 'rgba(' + TB.light.map(v => Math.round(v * k)).join(',') + ',' + (0.12 + R() * 0.18) + ')';
              g.lineWidth = 0.6 + R() * 1.8;
              g.beginPath(); for (let x = 0; x <= 512; x += 8) { const y = y0 + Math.sin(x / 512 * TAU * f + ph) * a; if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
            }
            if (R() < 0.6) { const kx = R() * 480 + 16, ky = py + seam * (0.3 + R() * 0.4); g.strokeStyle = 'rgba(' + TB.dark.map(v => Math.round(v * k)).join(',') + ',0.35)'; g.lineWidth = 1.2; for (let r = 0; r < 4; r++) { g.beginPath(); g.ellipse(kx, ky, 4 + r * 4, 2 + r * 1.6, 0, 0, TAU); g.stroke(); } }
            g.fillStyle = TB.kind === 'slat' ? 'rgba(20,10,4,0.75)' : 'rgba(30,16,6,0.35)'; g.fillRect(0, py, 512, TB.kind === 'slat' ? 4 : 1.5);
            g.fillStyle = 'rgba(255,240,210,0.12)'; g.fillRect(0, py + (TB.kind === 'slat' ? 4 : 1.5), 512, 1);
          }
        }
        return c;
      }
      function paintBell(kind) {
        const c = document.createElement('canvas'); c.width = 240; c.height = 300;
        const g = c.getContext('2d'); g.translate(120, 40); // pivot (top of the crown loop) at (120, 40); body radius 70px
        const cols = kind === 'silver' ? ['#4e565e', '#c8d0d8', '#ffffff', '#9aa6b2', '#3e464e'] : kind === 'cow' ? ['#5a250f', '#c46a3a', '#ffd0a8', '#a8542a', '#4a1f0c'] : ['#6b420e', '#d9a43a', '#fff0b3', '#c48a24', '#5a360a'];
        const r = 70;
        g.strokeStyle = cols[0]; g.lineWidth = 9; g.beginPath(); g.arc(0, 14, 13, Math.PI * 1.1, Math.PI * 1.9 + 0.3); g.stroke();
        const body = new Path2D();
        if (kind === 'cow') {
          body.moveTo(-0.42 * r, 0.28 * r); body.lineTo(0.42 * r, 0.28 * r); body.quadraticCurveTo(0.52 * r, 0.3 * r, 0.56 * r, 0.5 * r); body.lineTo(0.78 * r, 1.9 * r); body.quadraticCurveTo(0.8 * r, 2.02 * r, 0.66 * r, 2.02 * r);
          body.lineTo(-0.66 * r, 2.02 * r); body.quadraticCurveTo(-0.8 * r, 2.02 * r, -0.78 * r, 1.9 * r); body.lineTo(-0.56 * r, 0.5 * r); body.quadraticCurveTo(-0.52 * r, 0.3 * r, -0.42 * r, 0.28 * r); body.closePath();
        } else {
          const s = kind === 'shop' ? 0.86 : 1;
          body.moveTo(-0.46 * r * s, 0.32 * r); body.bezierCurveTo(-0.46 * r * s, 0.12 * r, 0.46 * r * s, 0.12 * r, 0.46 * r * s, 0.32 * r);
          body.bezierCurveTo(0.6 * r * s, 0.85 * r, 0.56 * r * s, 1.35 * r, 0.86 * r * s, 1.84 * r); body.bezierCurveTo(0.98 * r * s, 1.98 * r, 1.02 * r * s, 2.04 * r, 0.98 * r * s, 2.08 * r);
          body.lineTo(-0.98 * r * s, 2.08 * r); body.bezierCurveTo(-1.02 * r * s, 2.04 * r, -0.98 * r * s, 1.98 * r, -0.86 * r * s, 1.84 * r);
          body.bezierCurveTo(-0.56 * r * s, 1.35 * r, -0.6 * r * s, 0.85 * r, -0.46 * r * s, 0.32 * r); body.closePath();
        }
        g.fillStyle = cols[4]; g.beginPath(); g.ellipse(0, 2.05 * r, 0.9 * r, 0.16 * r, 0, 0, TAU); g.fill();
        g.fillStyle = cols[0]; g.beginPath(); g.arc(0, 2.06 * r, 0.16 * r, 0, TAU); g.fill();
        const hg = g.createLinearGradient(-r, 0, r, 0);
        hg.addColorStop(0, cols[0]); hg.addColorStop(0.28, cols[1]); hg.addColorStop(0.42, cols[2]); hg.addColorStop(0.58, cols[3]); hg.addColorStop(1, cols[4]);
        g.fillStyle = hg; g.fill(body);
        const vg = g.createLinearGradient(0, 0.2 * r, 0, 2.1 * r); vg.addColorStop(0, 'rgba(255,255,255,0.12)'); vg.addColorStop(0.7, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.25)');
        g.fillStyle = vg; g.fill(body);
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; g.stroke(body);
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 1.86 * r, 0.82 * r * (kind === 'shop' ? 0.86 : 1), 0.09 * r, 0, 0.1, Math.PI - 0.1); g.stroke();
        g.strokeStyle = 'rgba(255,250,230,0.55)'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-0.3 * r, 0.5 * r); g.quadraticCurveTo(-0.4 * r, 1.2 * r, -0.62 * r, 1.7 * r); g.stroke();
        return { c, px: 120, py: 40, r: 70 };
      }

      /* ---------------- geometry ---------------- */
      function corners(d) {
        const a = (d.st === 'fall' || d.st === 'lean' || d.st === 'down') ? d.th : d.jig;
        const sq = d.sq || 0, H = d.H * (1 - 0.07 * sq), T = d.T * (1 + 0.12 * sq), base = d.base + d.lift;
        let px, L;
        if (a >= 0) { px = d.x + d.T; L = [[-T, 0], [0, 0], [0, H], [-T, H]]; }
        else { px = d.x; L = [[0, 0], [T, 0], [T, H], [0, H]]; }
        const c = Math.cos(a), s = Math.sin(a);
        return L.map(([u, v]) => [px + u * c + v * s, base - u * s + v * c]);
      }
      const tipOf = (d, th) => [d.x + d.T + d.H * Math.sin(th), d.base + d.H * Math.cos(th)];
      function backLine(n) { const c = Math.cos(n.th), s = Math.sin(n.th), px = n.x + n.T, py = n.base; return { bx: px - n.T * c, by: py + n.T * s, nx: -c, ny: s }; }
      const gapF = (d, th, L) => { const p = tipOf(d, th); return (p[0] - L.bx) * L.nx + (p[1] - L.by) * L.ny; };

      /* placement window for domino i (in back-face x) */
      function feasible(i) {
        const d = DOMS[i], p = DOMS[i - 1], pf = p.x + p.T;
        let lo = pf + GMIN * p.H, hi = pf + GMAX * p.H, ideal = pf + 0.5 * p.H;
        if (d.kind === 'boost') {
          let rMin = 0, rMax = 0, gaps = 0.5 * p.H, thick = d.T;
          for (let j = i; j < GI; j++) { const a = DOMS[j], nb = DOMS[j + 1], tn = nb === giant ? 0 : nb.T; rMin += GMIN * a.H + tn; rMax += GMAX * a.H + tn; gaps += 0.5 * a.H; thick += tn; }
          lo = Math.max(lo, giant.x - rMax - d.T); hi = Math.min(hi, giant.x - rMin - d.T);
          const k = Math.max(0.3, (giant.x - pf - thick) / gaps);
          ideal = pf + 0.5 * p.H * k;
        }
        if (hi < lo) hi = lo;
        return { lo, hi, ideal: clamp(ideal, lo, hi), p };
      }
      /* where the rest of the ladder would ideally go (for the dashed silhouettes) */
      function ladder(from) {
        const out = []; let pf = DOMS[from - 1].x + DOMS[from - 1].T;
        let gaps = 0, thick = 0;
        for (let j = from - 1; j < GI; j++) { gaps += 0.5 * DOMS[j].H; if (j + 1 < GI) thick += DOMS[j + 1].T; }
        const k = Math.max(0.3, (giant.x - pf - thick) / gaps);
        for (let j = from; j < GI; j++) { const x = pf + 0.5 * DOMS[j - 1].H * k; out.push({ j, x }); pf = x + DOMS[j].T; }
        return out;
      }

      /* ---------------- camera ---------------- */
      function frame(x0, x1, top, head) {
        const m = phone ? 18 : 80, availW = CAM.w - 2 * m, availH = Math.max(140, CAM.ybase - CAM.top - (head || 0));
        const z = Math.min(availW / Math.max(0.4, x1 - x0), availH / Math.max(0.4, top), phone ? 140 : 175);
        CAM.tZ = Math.max(10, z); CAM.tx = (x0 + x1) / 2;
      }
      const setFrame = (fn) => { G.framer = fn; fn(); };
      const frameAll = () => setFrame(() => frame(-0.9, BELL.post + 0.3 + giant.D * KX, Math.max(giant.H, BELL.top) + giant.D * KY + 0.25, 78));
      const frameTiny = () => setFrame(() => frame(-1.25, 2.3, 2.15));
      const frameReveal = () => setFrame(() => frame(giant.x - 1.3, giant.x + giant.T + giant.D * KX + 1.3, giant.H + giant.D * KY + 0.1, 86));
      const frameTwist = () => setFrame(() => frame(giant.x - 2.6, BELL.post + 0.3 + giant.D * KX * 0.6, Math.max(giant.H, BELL.top) + giant.D * KY + 0.1, 86));
      frameAll();
      function framePlace(i) {
        setFrame(() => {
          const d = DOMS[i], p = DOMS[i - 1], F = feasible(i);
          const x0 = DOMS[Math.max(0, i - 2)].x - 0.5 * p.H;
          if (i === GI - 1) frame(x0, giant.x + giant.T + giant.D * KX + 0.35, giant.H + giant.D * KY + 0.15, 86);
          else frame(x0, F.ideal + d.T + d.D * KX + 0.55 * d.H, Math.max(d.H, p.H) * 1.16 + d.D * KY + 0.15);
        });
      }
      function followCascade() {
        let f = -1; for (let i = 0; i < DOMS.length; i++) if (DOMS[i].st === 'fall') f = i;
        if (f < 0) return;
        const d = DOMS[f];
        if (d === giant) { frame(d.x - 1.4, BELL.post + 0.5 + d.D * KX, Math.max(d.H, BELL.top) + d.D * KY + 0.2); return; }
        const n = DOMS[f + 1], x0 = DOMS[Math.max(0, f - 2)].x - 0.3 * d.H, x1 = n.x + n.T + n.D * KX + 0.45 * n.H;
        frame(x0, x1, n.H * 1.12 + n.D * KY + 0.1);
      }

      /* ---------------- the rack (the domino box) ---------------- */
      let tiles = {}, rows = {};
      function miniSVG(d, hgt) {
        const w = Math.round(hgt * 0.5), c = SET.face, f = 'rgb(' + c.join(',') + ')', e = shade(c, 0.78);
        let pips = '';
        const r = Math.max(2, w * 0.1);
        [[d.pips[0], 0], [d.pips[1], 1]].forEach(([n, half]) => { (PIPXY[n] || []).forEach(([a, b]) => { const cy = half * hgt / 2 + (0.16 + 0.68 * a) * hgt / 2, cx = (0.18 + 0.64 * b) * w; pips += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + SET.pip + '"/>'; }); });
        return '<svg width="' + (w + 4) + '" height="' + (hgt + 4) + '" viewBox="-1 -1 ' + (w + 4) + ' ' + (hgt + 4) + '" aria-hidden="true"><rect x="2" y="2" width="' + w + '" height="' + hgt + '" rx="' + (w * 0.16).toFixed(1) + '" fill="' + e + '"/><rect x="0" y="0" width="' + w + '" height="' + hgt + '" rx="' + (w * 0.16).toFixed(1) + '" fill="' + f + '"/>' +
          '<line x1="' + (w * 0.14).toFixed(1) + '" y1="' + (hgt / 2) + '" x2="' + (w * 0.86).toFixed(1) + '" y2="' + (hgt / 2) + '" stroke="' + SET.pip + '" stroke-opacity="0.5" stroke-width="1.4"/>' + pips + '<circle cx="' + (w / 2) + '" cy="' + (hgt / 2) + '" r="' + (r * 0.8).toFixed(1) + '" fill="' + SET.pin + '"/></svg>';
      }
      function setRack(mode) {
        rackB.innerHTML = ''; tiles = {}; rows = {};
        rackB.classList.toggle('ds-list', mode === 'list');
        if (mode === 'build' || mode === 'boost') {
          const ids = []; for (let i = mode === 'build' ? 1 : NMICRO; i < (mode === 'build' ? NMICRO : GI); i++) ids.push(i);
          ids.forEach((i, k) => {
            const d = DOMS[i], hh = mode === 'build' ? (phone ? 40 : 46) : Math.round((phone ? 42 : 46) * (1 + 0.17 * k));
            const tile = h('div', { class: 'ds-tile', role: 'button', tabindex: '0', 'aria-label': (d.kind === 'micro' ? 'Step domino: ' + d.label : 'Bigger domino, ' + d.label + ' the tiny one') + '. Drag it into the glowing spot.' });
            tile.innerHTML = miniSVG(d, hh);
            tile.append(d.kind === 'micro' ? h('span', { class: 'ds-tl gk-user', text: d.label }) : h('span', { class: 'ds-tx', text: d.label }));
            rackB.append(tile); tiles[i] = tile; bindTile(tile, i);
          });
          rackT.textContent = mode === 'build' ? 'Line up the small steps' : 'Build up · each 1.5× bigger';
        } else if (mode === 'list') {
          for (let i = 0; i < NMICRO; i++) { const r = h('div', { class: 'ds-row' }, h('span', { class: 'ds-num', text: String(i + 1) }), h('span', { class: 'ds-rl gk-user', text: DOMS[i].label })); rackB.append(r); rows[i] = r; }
          const r = h('div', { class: 'ds-row big' }, h('span', { class: 'ds-num', text: '★' }), h('span', { class: 'ds-rl gk-user', text: CT.task })); rackB.append(r); rows[GI] = r;
          rackT.textContent = 'Your chain';
        }
        refreshTiles();
      }
      function refreshTiles() {
        Object.keys(tiles).forEach(k => {
          const i = Number(k), d = DOMS[i], t = tiles[i];
          const done = d.st !== 'tray' && d.st !== 'drag';
          t.classList.toggle('is-done', done);
          t.classList.toggle('is-next', !done && i === G.cur);
          t.classList.toggle('is-later', !done && i !== G.cur);
          t.setAttribute('tabindex', !done && i === G.cur ? '0' : '-1');
        });
        const placed = G.grades.length, perf = G.grades.filter(x => x === 'perfect').length;
        rackS.textContent = G.phase === 'build' || G.phase === 'boost' ? (placed ? perf + ' perfect' : '') : G.phase === 'ready' ? 'Ready' : '';
      }
      function tickRow(i) { const r = rows[i]; if (!r || r.classList.contains('done')) return; r.classList.add('done'); r.querySelector('.ds-num').textContent = '✓'; }

      /* ---------------- input: drag a domino from the box onto the table ---------------- */
      let DR = null;
      const canPlace = (i) => (G.phase === 'build' || G.phase === 'boost') && G.cur === i && !G.busy && !DR;
      function bindTile(tile, i) {
        K.drag(tile, {
          space: el,
          start: (p) => { if (!canPlace(i)) return false; beginDrag(i, p); },
          move: (p) => moveDrag(p),
          end: () => endDrag()
        });
        S.listen(tile, 'keydown', (e) => { if ((e.code === 'Enter' || e.code === 'Space') && canPlace(i)) { e.preventDefault(); A.unlock(); keyPlace(i); } });
      }
      function fingerToBack(px, d) { return CAM.x + (px - CAM.w / 2 - CAM.ox) / CAM.Z - d.D * KX / 2 - d.T / 2; }
      function beginDrag(i, p) {
        const d = DOMS[i];
        DR = { i, d, px: p.x, py: p.y, x0: p.x, y0: p.y, over: false, x: d.x, swing: 0, sv: 0, vx: 0, lt: now(), svg: tiles[i].querySelector('svg') };
        d.st = 'drag'; G.idle = 0;
        tiles[i].classList.add('is-lifted');
        if (d.kind === 'micro') ftag.textContent = d.label;
        K.guide(null);
        sLift();
        if (A.ctx && !felt) felt = A.loop({ filter: 'bandpass', freq: 650, q: 0.7 });
      }
      function moveDrag(p) {
        if (!DR) return;
        const t = now(), dt = Math.max(8, t - DR.lt);
        DR.vx = DR.vx * 0.6 + ((p.x - DR.px) / dt * 1000) * 0.4; DR.lt = t;
        DR.px = p.x; DR.py = p.y;
        const wasOver = DR.over;
        DR.over = p.y < CAM.rackTop - 2 && p.y > CAM.top - 70;
        if (DR.over) {
          const F = feasible(DR.i);
          let x = fingerToBack(p.x, DR.d);
          if (Math.abs(x - F.ideal) < 0.12 * F.p.H) x += (F.ideal - x) * 0.35;
          DR.x = x;
          if (!wasOver) { if (A.ctx) A.wood(undefined, 0.06, 1.3); }
        }
        const tile = tiles[DR.i];
        if (tile) tile.classList.toggle('is-over', DR.over);
        if (DR.svg && !DR.over) DR.svg.style.transform = 'translate(' + (p.x - DR.x0).toFixed(1) + 'px,' + (p.y - DR.y0).toFixed(1) + 'px) rotate(' + (DR.swing * 30).toFixed(1) + 'deg)';
        ftag.classList.toggle('on', DR.over && DR.d.kind === 'micro');
        if (felt) felt.level(DR.over ? Math.min(0.07, Math.abs(DR.vx) / 9000) : 0.0001, 0.05);
      }
      function endDrag() {
        if (!DR) return;
        const i = DR.i;
        ftag.classList.remove('on');
        if (DR.svg) DR.svg.style.transform = '';
        if (tiles[i]) tiles[i].classList.remove('is-over');
        if (felt) felt.level(0.0001, 0.05);
        if (DR.over && tryPlace(i, DR.x)) { DR = null; return; }
        DR = null;
        const d = DOMS[i]; d.st = 'tray';
        tiles[i] && tiles[i].classList.remove('is-lifted');
        sBoing();
        say(rush, line(K.pick([{ Jolly: 'Just inside the glow, so it can reach.', Cheeky: 'Not there. The glow. The GLOW.', Unfiltered: 'Into the glow.' }, { Jolly: 'Into the golden bit, where it can reach!', Cheeky: 'Close-ish. Aim for the shiny bit.', Unfiltered: 'Golden bit. Try again.' }])), { mood: 'think', ms: 2400 });
        guidePlace(i, 900);
      }
      function keyPlace(i) {
        const F = feasible(i);
        DOMS[i].st = 'drag';
        tryPlace(i, F.ideal + 0.08 * SWEET * F.p.H);
      }
      function tryPlace(i, x) {
        const d = DOMS[i], F = feasible(i), p = F.p, tol = 0.24 * p.H;
        if (x < F.lo - tol || x > F.hi + tol) return false;
        const xx = clamp(x, F.lo, F.hi), err = Math.abs(xx - F.ideal) / p.H;
        const grade = err <= PERF ? 'perfect' : err <= SWEET ? 'good' : 'nudged';
        d.x = xx; d.tx = grade === 'nudged' ? F.ideal + Math.sign(xx - F.ideal) * SWEET * p.H * 0.85 : null;
        d.st = 'place'; d.lift = 0.32; d.vy = 0; d.grade = grade; d.q = clamp(1 - err / 0.45, 0, 1);
        G.grades.push(grade); G.qs.push(d.q); G.busy = true;
        refreshTiles();
        return true;
      }
      function landed(d) {
        if (d === giant) { giantLanded(); return; }
        d.st = 'stand'; d.sq = 1; d.jig = 0; d.jv = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5);
        const i = d.idx;
        [DOMS[i - 1], DOMS[i + 1]].forEach(n => { if (n && n.st === 'stand') n.jv += (Math.random() - 0.5) * 0.9; });
        sLand(d.s);
        const bx = sx(d.x + d.T / 2, d.D / 2), by = sy(0, d.D / 2);
        PW.emit('dust', bx - d.T * CAM.Z, by, 6, { colors: TB.dust, angle: Math.PI, spread: 1.2, speed: [20, 60] });
        PW.emit('dust', bx + d.T * CAM.Z, by, 6, { colors: TB.dust, angle: 0, spread: 1.2, speed: [20, 60] });
        if (!K.reduced()) CAM.shake = Math.min(1, 0.12 + 0.06 * d.s);
        const topX = sx(d.x + d.T / 2, d.D / 2), topY = sy(d.H, d.D / 2) - 22;
        const g = d.grade;
        if (g === 'perfect') { G.perfectRun++; pop('Perfect!', topX, topY); sChord(G.perfectRun); K.sfx.sparkle(); PW.emit('star', topX, topY + 18, 12, { colors: ['#fff3c4', '#ffd36b', '#ffb84a'], speed: [50, 160] }); S.buzz && S.buzz(12); }
        else if (g === 'good') { G.perfectRun = 0; pop('Nice', topX, topY, 'soft'); K.sfx.good(undefined, 3 + (i % 4)); }
        else { G.perfectRun = 0; pop('Nudged in', topX, topY, 'soft'); K.sfx.soft(); }
        reactPlace(d);
        refreshTiles();
        S.later(() => { G.busy = false; nextPlacement(); }, g === 'perfect' ? 700 : 560);
      }
      function reactPlace(d) {
        const g = d.grade, boost = d.kind === 'boost', k = boost ? d.idx - NMICRO : d.idx - 1;
        if (boost) {
          const bl = [{ Jolly: 'Bigger…', Cheeky: 'Biggerer…', Unfiltered: 'Bigger.' }, { Jolly: 'Even bigger!', Cheeky: 'Chonky. I respect it.', Unfiltered: 'Bigger again.' }, { Jolly: 'Nearly as big as the big one!', Cheeky: 'Absolute unit.', Unfiltered: 'Nearly there.' }, { Jolly: 'Last one before the big one!', Cheeky: 'The big one’s sweating now.', Unfiltered: 'Last one.' }];
          say(rush, line(bl[Math.min(bl.length - 1, d.idx === GI - 1 ? 3 : k)]), { mood: g === 'perfect' ? 'wow' : 'happy', moodMs: 1400, ms: 1900 });
          if (d.idx === GI - 1 && patch.el.hidden === false) patch.face('happy', 1600);
          return;
        }
        const L2 = g === 'perfect' ? [{ Jolly: 'Perfect spacing!', Cheeky: 'Ooh, precise. Show-off.', Unfiltered: 'Perfect.' }, { Jolly: 'Right in the sweet spot!', Cheeky: 'Bullseye. Annoyingly good.', Unfiltered: 'Spot on.' }]
          : g === 'good' ? [{ Jolly: 'Nice, that’ll fall right.', Cheeky: 'Good enough to topple. Which is the whole point.', Unfiltered: 'Good. It’ll reach.' }]
            : [{ Jolly: 'Close! I nudged it into the sweet spot.', Cheeky: 'Bit wonky. Fixed it. You’re welcome.', Unfiltered: 'Nudged it in. Fine.' }];
        say(rush, line(L2[k % L2.length]), { mood: g === 'perfect' ? 'celebrate' : 'happy', moodMs: 1400, ms: 1900 });
      }
      function pop(text, x, y, kind) {
        const p = h('div', { class: 'ds-pop' + (kind ? ' ' + kind : ''), 'aria-hidden': 'true', text });
        p.style.left = clamp(x, 70, CAM.w - 70) + 'px'; p.style.top = clamp(y, CAM.top - 10, CAM.ybase - 30) + 'px';
        el.append(p); S.later(() => p.remove(), 1100);
      }
      function guidePlace(i, delay) {
        const tile = tiles[i]; if (!tile) return;
        const F = feasible(i), d = DOMS[i];
        const tx = CAM.w / 2 + (F.ideal + d.T / 2 + d.D * KX / 2 - CAM.tx) * CAM.tZ, ty = CAM.ybase - Math.min(60, d.H * CAM.tZ * 0.3);
        const r = K.rectIn(tile, el);
        const label = d.kind === 'boost' ? 'BIGGER ONE: INTO GLOW' : i === 1 ? 'DRAG INTO THE GLOW' : 'NEXT ONE: INTO GLOW';
        K.guide({ id: 'place-' + i, g: 'drag', target: tile, oy: 0.35, dx: tx - r.cx, dy: ty - (r.y + r.h * 0.35), label, ms: 2000, delay: delay ?? 650 });
      }
      function nextPlacement() {
        if (G.phase !== 'build' && G.phase !== 'boost') return;
        const i = G.queue.shift();
        if (i == null) { if (G.phase === 'build') twist(); else ready(); return; }
        G.cur = i; refreshTiles(); G.camK = 4.2; framePlace(i);
        guidePlace(i);
        if (G.phase === 'build' && i === 1) MZ.layer = Math.max(MZ.layer, 1);
      }

      /* ---------------- flick ---------------- */
      K.drag(flickEl, {
        space: el,
        start: () => { if (G.phase !== 'ready') return false; },
        move: (p, dd) => { if (G.phase === 'ready' && dd.dx > 14) flick(Math.max(dd.vx, 320)); },
        end: (p, dd) => { if (G.phase === 'ready') flick(Math.max(260, dd.vx || 0)); }
      });
      K.onKey(['ArrowRight', 'Space', 'Enter'], (e) => { if (G.phase === 'ready') { e.preventDefault(); A.unlock(); flick(420); } });
      function flick(v) {
        if (G.phase !== 'ready') return;
        setPhase('cascade'); flickEl.hidden = true; K.guide(null);
        const d = DOMS[0]; d.st = 'fall'; d.th = 0.01; d.om = clamp(2.7 + v / 900, 2.7, 5.4); d.jig = 0;
        K.sfx.tap(); if (A.ctx) A.wood(undefined, 0.12, 2.4);
        const px = sx(d.x, d.D / 2), py = sy(d.H * 0.85, d.D / 2);
        PW.emit('star', px, py, 8, { colors: ['#fff3c4', '#ffd36b'], speed: [40, 120] });
        MZ.duckT = 0.22; G.camK = 4.5;
        say(rush, line({ Jolly: 'Here it goes!', Cheeky: 'Ooooh!', Unfiltered: 'Go.' }), { mood: 'wow', ms: 1600 });
        rackS.textContent = 'Toppling…';
        ctx.track('flick', { v: Math.round(v) });
      }

      /* ---------------- the cascade (rigid dominoes pivoting on their front edge) ---------------- */
      function hit(d, n) {
        const need = Math.sqrt(0.0571 * GRAV / n.s) * 1.55 + 0.35;
        n.om = Math.max(need, d.om * 0.8 * Math.sqrt(d.H / n.H));
        n.st = 'fall'; n.th = Math.max(n.th, 0.003); n.push = 0.7 / n.s; n.jig = 0;
        d.st = 'lean'; d.om = Math.min(d.om, n.om * 1.2);
        const pow = clamp(0.55 + d.om * 0.09, 0.5, 1.25);
        sClack(n.s, pow); sNote(d.idx + (d.kind === 'boost' ? 1 : 0), 0.13 + 0.02 * Math.min(4, n.s));
        const tp = tipOf(d, d.th), cx = sx(tp[0], d.D / 2), cy = sy(tp[1], d.D / 2);
        PW.emit('dust', cx, cy, Math.round(4 + n.s * 2), { colors: TB.dust, speed: [20, 50 + 20 * n.s] });
        if (!K.reduced() && n.s > 1.2) CAM.shake = Math.min(1, 0.1 + 0.08 * n.s);
        if (d.kind === 'micro') { tickRow(d.idx); sTick(d.idx); }
        if (n === giant) {
          G.slow = true;
          if (A.ctx) { A.tone({ type: 'sine', freq: 95, to: 52, glide: 1.4, dur: 1.6, vol: 0.18, attack: 0.05 }); A.noise({ pink: true, filter: 'lowpass', freq: 260, to: 700, dur: 2.2, attack: 0.6, vol: 0.12 }); }
          say(rush, line({ Jolly: 'It’s reaching the big one…', Cheeky: 'Is it…? IS IT…?', Unfiltered: 'Here it comes…' }), { mood: 'surprised', ms: 2400 });
          if (!patch.el.hidden) patch.face('wow');
        } else if (n.kind === 'boost' && n.idx === NMICRO) rush.face('wow');
        S.buzz && S.buzz(Math.round(6 + n.s * 4));
      }
      function giantChecks(d) {
        if (BELL.hit) return;
        const tp = tipOf(d, d.th), bx = BELL.pvx + BELL.Lb * Math.sin(BELL.psi), by = BELL.pvy - BELL.Lb * Math.cos(BELL.psi);
        if (Math.hypot(tp[0] - bx, tp[1] - by) < BELL.rb * 1.05) {
          BELL.hit = true;
          BELL.pv += Math.min(4.2, d.om * d.H * 0.75 / BELL.Lb + 1.2);
          d.om *= 0.84;
          sBell(1); ringBell(1);
          if (!K.reduced()) { G.flash = 1; CAM.shake = 1; }
          const p = bellScreen();
          PW.emit('star', p.x, p.y, 24, { colors: ['#fffbe6', '#ffe58a', '#ffd36b'], speed: [80, 260] });
          PW.emit('confetti', p.x, p.y, 40, { angle: -Math.PI / 2, spread: 2.2, speed: [140, 360], colors: ['#ff5fa2', '#ffd36b', '#3fd0c9', '#8f7bff', '#7be08a', '#ff8a4d'] });
          tickRow(GI); sTick(NMICRO + 2); rackS.textContent = 'All down!';
          for (let i = NMICRO; i < GI; i++) DOMS[i].ticked = true;
          G.slowEnd = now() + 500;
          S.buzz && S.buzz([30, 40, 70]);
        }
      }
      function giantLanded() {
        if (giant.st === 'drop') {
          giant.st = 'stand'; giant.sq = 1; giant.jv = 0.4;
          sThud(giant.s);
          if (!K.reduced()) CAM.shake = 1;
          const bx = sx(giant.x + giant.T / 2, giant.D / 2), by = sy(0, giant.D / 2);
          PW.emit('dust', bx - giant.T * CAM.Z, by, 22, { colors: TB.dust, angle: Math.PI, spread: 1.4, speed: [40, 160] });
          PW.emit('dust', bx + giant.T * CAM.Z, by, 22, { colors: TB.dust, angle: 0, spread: 1.4, speed: [40, 160] });
          DOMS.forEach(n => { if (n !== giant && n.st === 'stand') n.jv += (Math.random() - 0.5) * 2.4; });
          BELL.pv += 0.9; ringSmall(0.5);
        }
      }
      function ringSmall(a) { if (!A.ctx) return; const f = 520 * V.tone * 2; A.tone({ type: 'sine', freq: f, dur: 1.4, vol: 0.05 * a, attack: 0.002, verb: 0.5 }); A.tone({ type: 'sine', freq: f * 1.5, dur: 0.9, vol: 0.025 * a, attack: 0.002 }); }
      function cascade(dt) {
        const n = 4, hs = dt / n;
        for (let sIdx = 0; sIdx < n; sIdx++) {
          for (let i = 0; i < DOMS.length; i++) {
            const d = DOMS[i];
            if (d.st !== 'fall' && d.st !== 'lean') continue;
            const c = Math.cos(d.th), sn = Math.sin(d.th);
            const al = 1.5 * GRAV * (d.H * sn - d.T * c) / (d.H * d.H + d.T * d.T) + (d.st === 'fall' ? d.push : 0);
            d.om += al * hs; d.om = Math.min(d.om, 12 / Math.sqrt(d.s));
            const prevTh = d.th; d.th += d.om * hs;
            const nx = DOMS[i + 1];
            if (d.st === 'fall' && nx && nx.st === 'stand') { if (gapF(d, d.th, backLine(nx)) <= 0) hit(d, nx); }
            if (d.st === 'lean' && nx) {
              const Lb = backLine(nx);
              if (gapF(d, d.th, Lb) < 0) {
                let lo = 0, hi = d.th;
                if (gapF(d, prevTh, Lb) >= 0) lo = prevTh;
                for (let k = 0; k < 16; k++) { const m = (lo + hi) / 2; if (gapF(d, m, Lb) < 0) hi = m; else lo = m; }
                d.th = lo; d.om = Math.min(d.om, Math.max(0, nx.om));
              }
            }
            if (d === giant && d.st === 'fall') giantChecks(d);
            if (d.th >= Math.PI / 2) {
              d.th = Math.PI / 2;
              if (d === giant) {
                if (!d.landedOnce) { d.landedOnce = true; sThud(d.s); if (!K.reduced()) CAM.shake = 1; const y0 = sy(0, d.D / 2); for (let k = 0; k < 6; k++) PW.emit('dust', sx(d.x + d.T + d.H * (k / 5), d.D / 2), y0, 7, { colors: TB.dust, angle: -Math.PI / 2, spread: 2.6, speed: [30, 130] }); S.later(finale, 650); }
                if (d.om > 1.1) d.om = -d.om * 0.18; else { d.om = 0; d.st = 'down'; }
              } else { d.om = 0; d.st = 'down'; }
            }
          }
        }
      }
      function bellStep(dt) {
        const gg = GRAV * 0.5, prev = BELL.pv;
        BELL.pv += (-(gg / BELL.Lb) * Math.sin(BELL.psi) - 0.5 * BELL.pv) * dt;
        BELL.psi += BELL.pv * dt;
        if ((prev > 0) !== (BELL.pv > 0) && Math.abs(BELL.psi) > 0.08 && BELL.hit) ringSmall(Math.min(1.4, Math.abs(BELL.psi) * 2.2));
      }
      function bellScreen() { const bx = BELL.pvx + BELL.Lb * Math.sin(BELL.psi), by = BELL.pvy - BELL.Lb * Math.cos(BELL.psi); return { x: sx(bx, BELL.z), y: sy(by, BELL.z) }; }

      /* ---------------- per-frame physics ---------------- */
      function step(dt) {
        for (const d of DOMS) {
          if (d.st === 'place' || d.st === 'drop') { d.vy -= (d.st === 'drop' ? 44 : 30) * dt; d.lift += d.vy * dt; if (d.lift <= 0) { d.lift = 0; if (d.st === 'drop') giantLanded(); else landed(d); } }
          if (d.tx != null) { d.x += (d.tx - d.x) * Math.min(1, dt * 12); if (Math.abs(d.tx - d.x) < 0.0008) { d.x = d.tx; d.tx = null; } }
          if (d.sq > 0) d.sq = Math.max(0, d.sq - dt * 5);
          if (d.st === 'stand') { d.jv += (-170 * d.jig - 9 * d.jv) * dt; d.jig += d.jv * dt; if (Math.abs(d.jig) < 0.0005 && Math.abs(d.jv) < 0.005) { d.jig = 0; d.jv = 0; } }
          if (d.glow > 0) d.glow = Math.max(0, d.glow - dt * 0.4);
        }
        if (DR) { const target = clamp(-DR.vx * 0.00045, -0.4, 0.4); DR.sv += (target - DR.swing) * 60 * dt - DR.sv * 8 * dt; DR.swing += DR.sv * dt; DR.vx *= Math.pow(0.02, dt); }
        if (G.phase === 'cascade' || G.phase === 'finale') cascade(dt);
        bellStep(dt);
        if (G.demo) G.demo.t += dt;
      }

      /* ---------------- rendering ---------------- */
      const PW = K.particles({ max: 520 }), PS = K.particles({ max: 60 });
      let lastCam = null;
      function shiftWorldParticles() {
        if (!lastCam) { lastCam = { x: CAM.x, Z: CAM.Z, ox: CAM.ox, oy: CAM.oy }; return; }
        const r = CAM.Z / lastCam.Z;
        if (Math.abs(r - 1) > 1e-6 || Math.abs(CAM.x - lastCam.x) > 1e-6) {
          for (const q of PW.list) { q.x = CAM.w / 2 + (q.x - CAM.w / 2 - lastCam.ox) * r + (lastCam.x - CAM.x) * CAM.Z + CAM.ox; q.y = CAM.ybase - (CAM.ybase - q.y + lastCam.oy) * r + CAM.oy; }
        }
        lastCam.x = CAM.x; lastCam.Z = CAM.Z; lastCam.ox = CAM.ox; lastCam.oy = CAM.oy;
      }
      function poly(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
      function hull(pts) {
        pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        const lo = [], up = [];
        for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
        for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
        up.pop(); lo.pop(); return lo.concat(up);
      }
      function shadowOf(g, W4, z0, D, a) {
        const pts = [];
        for (const z of [z0, z0 + D]) for (const p of W4) { const X = p[0] - p[1] * 0.62, Zz = z + p[1] * 0.42; pts.push([sx(X, Zz), sy(0, Zz)]); }
        const hl = hull(pts);
        g.fillStyle = 'rgba(38,18,4,' + a + ')'; poly(g, hl); g.fill();
      }
      /* a lit box: 4 world corners (counter-clockwise from bottom-left) extruded D into the depth */
      function prism(g, W4, z0, D, rgb, o) {
        o = o || {};
        const Z = CAM.Z, dx = D * Z * KX, dy = -D * Z * KY;
        const F = W4.map(p => [sx(p[0], z0), sy(p[1], z0)]), B = F.map(p => [p[0] + dx, p[1] + dy]);
        const faces = [];
        g.lineWidth = 1; g.strokeStyle = o.edge || 'rgba(40,24,10,0.28)'; g.lineJoin = 'round';
        for (let k = 0; k < 4; k++) {
          const a = W4[k], b = W4[(k + 1) % 4], ex = b[0] - a[0], ey = b[1] - a[1], len = Math.hypot(ex, ey) || 1, nx = ey / len, ny = -ex / len;
          if (nx * KX + ny * KY <= 0.002) continue;
          const lit = (o.amb || 0.62) + 0.42 * Math.max(0, nx * LX + ny * LY);
          g.fillStyle = shade(rgb, lit); poly(g, [F[k], F[(k + 1) % 4], B[(k + 1) % 4], B[k]]); g.fill(); g.stroke();
          faces.push({ k, nx, ny });
        }
        g.fillStyle = shade(rgb, (o.amb || 0.62) + 0.2); poly(g, F); g.fill();
        if (o.gloss) { const top = F[2][1] < F[1][1] ? F[2] : F[1], bot = F[0]; const gl = g.createLinearGradient(top[0], top[1], bot[0], bot[1]); gl.addColorStop(0, 'rgba(255,255,255,' + o.gloss + ')'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fill(); }
        g.stroke();
        return { F, B, dx, dy, faces };
      }
      function drawDomino(g, d, W4, o) {
        o = o || {};
        const z0 = 0, rgb = SET.face, al = g.globalAlpha;
        const pr = prism(g, W4, z0, d.D, rgb, { gloss: 0.22, edge: o.edge });
        const dpr = cv.dpr || 1;
        for (const f of pr.faces) {
          if (f.k !== 1 && f.k !== 3) continue;
          const O = f.k === 1 ? pr.F[1] : pr.F[0], top = f.k === 1 ? pr.F[2] : pr.F[3], Ux = top[0] - O[0], Uy = top[1] - O[1];
          if (Math.abs(pr.dx) < 3) continue;
          g.setTransform(dpr * Ux, dpr * Uy, dpr * pr.dx, dpr * pr.dy, dpr * O[0], dpr * O[1]);
          g.fillStyle = SET.pip; g.globalAlpha = al * 0.55; g.fillRect(0.494, 0.14, 0.012, 0.72); g.globalAlpha = al;
          const ru = 0.052, rv = 0.052 / 0.55;
          [[d.pips[0], 0], [d.pips[1], 0.5]].forEach(([nn, u0]) => {
            const spots = PIPXY[nn] || [];
            for (const [a, b] of spots) { const u = u0 + (0.14 + 0.72 * a) * 0.5, v = 0.16 + 0.68 * b; g.beginPath(); g.ellipse(u, v, ru, rv, 0, 0, TAU); g.fill(); }
          });
          g.fillStyle = SET.pin; g.beginPath(); g.ellipse(0.5, 0.5, ru * 0.75, rv * 0.75, 0, 0, TAU); g.fill();
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        if (d.glow > 0.02 || o.hi) {
          const gl = Math.max(d.glow, o.hi || 0);
          g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 * gl * al; g.fillStyle = '#ffb84a';
          poly(g, pr.F); g.fill(); for (const f of pr.faces) { poly(g, [pr.F[f.k], pr.F[(f.k + 1) % 4], pr.B[(f.k + 1) % 4], pr.B[f.k]]); g.fill(); }
          const c = pr.F[2], spr = K.glowSprite('rgba(255,200,110,0.9)'), r = Math.max(30, d.H * CAM.Z * 0.6);
          g.globalAlpha = 0.6 * gl; g.drawImage(spr, (pr.F[0][0] + c[0]) / 2 - r, (pr.F[0][1] + c[1]) / 2 - r, r * 2, r * 2);
          g.restore();
        }
        return pr;
      }
      function drawTable(g) {
        const w = CAM.w, H = CAM.h, Z = CAM.Z, dpr = cv.dpr || 1, D = K.dark();
        const zF = -((H - CAM.ybase + 60) / (Z * KY));  // we sit at the table: its near edge is always below the screen
        const xL = CAM.x + (-60 - w / 2 - ZB * Z * KX) / Z - 1, xR = CAM.x + (w + 60 - w / 2 - zF * Z * KX) / Z + 1;
        if (!WPAT) { WPAT = g.createPattern(WOOD, 'repeat'); try { WPAT.setTransform(new DOMMatrix([1 / 128, 0, 0, 1 / 128, 0, 0])); } catch (e) { /* old browser: texture at 1px per unit */ } }
        g.setTransform(dpr * Z, 0, dpr * Z * KX, -dpr * Z * KY, dpr * (w / 2 - CAM.x * Z + CAM.ox), dpr * (CAM.ybase + CAM.oy));
        g.fillStyle = WPAT; g.fillRect(xL, zF, xR - xL, ZB - zF);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const yB = sy(0, ZB);
        const tg = g.createLinearGradient(0, yB, 0, H);
        tg.addColorStop(0, D ? 'rgba(4,2,10,0.5)' : 'rgba(40,20,4,0.26)'); tg.addColorStop(0.32, 'rgba(0,0,0,0)'); tg.addColorStop(0.7, D ? 'rgba(255,200,140,0.04)' : 'rgba(255,240,210,0.1)'); tg.addColorStop(1, D ? 'rgba(0,0,0,0.3)' : 'rgba(40,20,4,0.12)');
        g.fillStyle = tg; g.fillRect(0, yB, w, H - yB);
        const ly = (yB + CAM.ybase) / 2, lp = g.createRadialGradient(w * 0.74, ly, 10, w * 0.74, ly, Math.max(w, H) * 0.55);
        lp.addColorStop(0, D ? 'rgba(255,190,120,0.16)' : 'rgba(255,244,214,0.24)'); lp.addColorStop(1, 'rgba(255,240,200,0)');
        g.fillStyle = lp; g.fillRect(0, yB, w, H - yB);
        g.fillStyle = D ? 'rgba(0,0,0,0.45)' : 'rgba(40,20,0,0.2)'; g.fillRect(0, yB - 4, w, 4);
        g.fillStyle = D ? 'rgba(255,220,180,0.12)' : 'rgba(255,248,230,0.45)'; g.fillRect(0, yB, w, 1.5);
      }
      function drawCoaster(g, t) {
        const d = DOMS[0], cx = d.x + d.T / 2 + 0.02, cz = d.D / 2, r = 0.62, Z = CAM.Z, dpr = cv.dpr || 1;
        g.setTransform(dpr * Z, 0, dpr * Z * KX, -dpr * Z * KY, dpr * (CAM.w / 2 - CAM.x * Z + CAM.ox), dpr * (CAM.ybase + CAM.oy));
        g.fillStyle = 'rgba(30,14,4,0.25)'; g.beginPath(); g.arc(cx - 0.05, cz + 0.06, r + 0.04, 0, TAU); g.fill();
        g.fillStyle = K.dark() ? '#8a5a34' : '#c98e54'; g.beginPath(); g.arc(cx, cz, r, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,236,200,0.55)'; g.lineWidth = 0.035; g.beginPath(); g.arc(cx, cz, r * 0.82, 0, TAU); g.stroke();
        const pulse = G.phase === 'ready' || G.phase === 'establish' ? 0.35 + 0.25 * Math.sin(t * 4) : 0.12;
        g.strokeStyle = 'rgba(255,214,120,' + pulse + ')'; g.lineWidth = 0.06; g.beginPath(); g.arc(cx, cz, r * 1.08, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(255,236,200,0.6)'; K.starPath(g, cx + r * 0.55, cz - r * 0.1, 0.13, 0.055, 5, 0); g.fill();
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      function bandQuad(g, x0, x1, z0, z1) { poly(g, [[sx(x0, z0), sy(0, z0)], [sx(x1, z0), sy(0, z0)], [sx(x1, z1), sy(0, z1)], [sx(x0, z1), sy(0, z1)]]); }
      function drawBands(g, t) {
        const i = G.cur; if (i < 1 || (G.phase !== 'build' && G.phase !== 'boost') || G.busy) return;
        const d = DOMS[i], F = feasible(i), p = F.p, z1 = d.D + 0.08, act = DR ? 1 : 0.75;
        g.fillStyle = 'rgba(255,250,236,' + (0.13 * act) + ')'; bandQuad(g, F.lo, F.hi + d.T, -0.08, z1); g.fill();
        const s0 = Math.max(F.lo, F.ideal - SWEET * p.H), s1 = Math.min(F.hi, F.ideal + SWEET * p.H);
        const inside = DR && DR.over && DR.x >= s0 && DR.x <= s1;
        const pul = 0.28 + 0.14 * Math.sin(t * 4.2);
        const sp = K.glowSprite('rgba(255,196,90,0.85)'), gx = sx(F.ideal + d.T / 2, d.D / 2), gy = sy(0, d.D / 2), gr = Math.max(26, (s1 - s0 + d.T) * CAM.Z * 0.9);
        g.globalAlpha = (inside ? 0.85 : 0.45 + 0.2 * Math.sin(t * 4.2)) * act; g.drawImage(sp, gx - gr, gy - gr * 0.55, gr * 2, gr * 1.1); g.globalAlpha = 1;
        g.fillStyle = inside ? 'rgba(255,214,120,0.62)' : 'rgba(255,196,90,' + (pul * act + 0.08) + ')'; bandQuad(g, s0, s1 + d.T, -0.08, z1); g.fill();
        g.strokeStyle = 'rgba(255,226,150,' + (0.6 * act + 0.25) + ')'; g.lineWidth = 2; bandQuad(g, s0, s1 + d.T, -0.08, z1); g.stroke();
        g.strokeStyle = 'rgba(255,248,220,' + (0.75 * act + 0.2) + ')'; g.lineWidth = 2.5;
        bandQuad(g, F.ideal, F.ideal + d.T, 0, d.D); g.stroke();
        if (d.kind === 'boost') {
          g.save(); g.setLineDash([5, 5]); g.lineWidth = 1.5;
          ladder(i).slice(0, 2).forEach(({ j, x }, k) => {
            const b = DOMS[j];
            g.strokeStyle = 'rgba(255,236,200,' + (k === 0 ? 0.6 : 0.22) + ')';
            const W4 = [[x, 0], [x + b.T, 0], [x + b.T, b.H], [x, b.H]];
            const F2 = W4.map(q => [sx(q[0], 0), sy(q[1], 0)]), dx = b.D * CAM.Z * KX, dy = -b.D * CAM.Z * KY;
            poly(g, F2); g.stroke();
            g.beginPath(); g.moveTo(F2[3][0], F2[3][1]); g.lineTo(F2[3][0] + dx, F2[3][1] + dy); g.lineTo(F2[2][0] + dx, F2[2][1] + dy); g.lineTo(F2[1][0] + dx, F2[1][1] + dy); g.moveTo(F2[2][0], F2[2][1]); g.lineTo(F2[2][0] + dx, F2[2][1] + dy); g.stroke();
          });
          g.restore();
        }
        const pv = [sx(p.x + p.T, p.D / 2), sy(0, p.D / 2)], R = p.H * CAM.Z;
        g.save(); g.setLineDash([3, 7]); g.strokeStyle = 'rgba(255,236,200,' + (0.35 + 0.3 * act) + ')'; g.lineWidth = 2;
        g.beginPath(); g.arc(pv[0], pv[1], R, -Math.PI / 2, -Math.PI / 2 + Math.asin(clamp((F.hi - p.x - p.T) / p.H, 0, 1)) + 0.08); g.stroke(); g.restore();
      }
      function drawStand(g, t) {
        if (giant.st === 'hidden' && G.phase === 'intro') { /* still shown: the bell waits at the far end */ }
        const Hs = giant.H, wood = K.dark() ? [104, 68, 40] : [138, 90, 52], th = 0.07 * Hs, z0 = BELL.z - 0.18 * Hs, D = 0.36 * Hs;
        const px = BELL.post;
        prism(g, [[px - th * 2.6, 0], [px + th * 2.6, 0], [px + th * 2.6, th * 0.8], [px - th * 2.6, th * 0.8]], z0 - 0.08 * Hs, D + 0.16 * Hs, wood, { amb: 0.6 });
        prism(g, [[px - th, th * 0.8], [px + th, th * 0.8], [px + th, BELL.top], [px - th, BELL.top]], z0, D, wood, { amb: 0.62 });
        prism(g, [[BELL.pvx - th * 0.8, BELL.top - th * 1.4], [px + th, BELL.top - th * 1.4], [px + th, BELL.top], [BELL.pvx - th * 0.8, BELL.top]], z0, D, wood, { amb: 0.66 });
        g.strokeStyle = '#3a2a1c'; g.lineWidth = Math.max(1.5, 0.012 * Hs * CAM.Z);
        g.beginPath(); g.moveTo(sx(BELL.pvx, BELL.z), sy(BELL.top - th * 1.4, BELL.z)); g.lineTo(sx(BELL.pvx, BELL.z), sy(BELL.pvy, BELL.z)); g.stroke();
        // bells rung on other days hang from the arm as little charms: the collection, in the world
        CHARMS.forEach((spr, k) => {
          const hx = BELL.pvx + (px - BELL.pvx) * (0.48 + 0.22 * k), hy = BELL.top - th * 1.4, cl = 0.07 * Hs + 0.03 * Hs * (k % 2), r = BELL.rb * 0.5;
          const a = Math.sin(t * 1.3 + k * 1.7) * 0.05 + BELL.psi * 0.35, ax = sx(hx, BELL.z), ay = sy(hy, BELL.z), bx = ax + Math.sin(a) * cl * CAM.Z, by = ay + Math.cos(a) * cl * CAM.Z;
          g.strokeStyle = 'rgba(58,42,28,0.9)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
          const sc = r * CAM.Z / spr.r; g.save(); g.translate(bx, by); g.rotate(-a); g.drawImage(spr.c, -spr.px * sc, -spr.py * sc, spr.c.width * sc, spr.c.height * sc); g.restore();
        });
      }
      function standShadow(g) {
        const Hs = giant.H, th = 0.07 * Hs, z0 = BELL.z - 0.18 * Hs, px = BELL.post;
        shadowOf(g, [[px - th, 0], [px + th, 0], [px + th, BELL.top], [px - th, BELL.top]], z0, 0.36 * Hs, 0.14);
      }
      function drawBell(g) {
        const p = [sx(BELL.pvx, BELL.z), sy(BELL.pvy, BELL.z)], sc = BELL.rb * CAM.Z / BELLSPR.r;
        g.save(); g.translate(p[0], p[1]); g.rotate(-BELL.psi);
        const shake = BELL.hit ? 0 : 0;
        g.drawImage(BELLSPR.c, -BELLSPR.px * sc + shake, -BELLSPR.py * sc, BELLSPR.c.width * sc, BELLSPR.c.height * sc);
        g.restore();
      }
      function drawDemo(g) {
        const dm = G.demo; if (!dm) return;
        const t = dm.t, d = dm.d;
        let th = 0;
        if (t < 0.5) th = 0.52 * Math.pow(t / 0.5, 2);
        else if (t < 0.85) { th = 0.52 - 0.34 * Math.sin((t - 0.5) / 0.35 * Math.PI / 2); if (!dm.bonk) { dm.bonk = true; sClack(0.8, 0.6); giant.jv += 0.06; const tp = tipOf(d, 0.52); pop('Too small!', sx(tp[0], d.D / 2), sy(tp[1], d.D / 2) - 30, 'soft'); } }
        else th = Math.max(0, 0.18 * Math.cos((t - 0.85) * 9) * Math.exp(-(t - 0.85) * 4));
        const a = t < 1.4 ? 0.62 : Math.max(0, 0.62 - (t - 1.4) * 1.5);
        if (a <= 0) { G.demo = null; return; }
        d.th = th; d.st = 'fall';
        g.globalAlpha = a; shadowOf(g, corners(d), 0, d.D, 0.14); drawDomino(g, d, corners(d), { edge: 'rgba(255,240,210,0.6)' }); g.globalAlpha = 1;
      }
      function drawDrag(g, t) {
        const d = DR.d;
        if (DR.over) {
          const lift = 0.1 + 0.03 * Math.sin(t * 6);
          const W4 = [[DR.x, lift], [DR.x + d.T, lift], [DR.x + d.T, lift + d.H], [DR.x, lift + d.H]];
          const a = DR.swing * 0.3, cx0 = DR.x + d.T / 2, c = Math.cos(a), s = Math.sin(a);
          const W4r = W4.map(([x, y]) => [cx0 + (x - cx0) * c + (y - lift) * s, lift - (x - cx0) * s + (y - lift) * c]);
          shadowOf(g, W4r, 0, d.D, 0.2);
          drawDomino(g, d, W4r, { hi: 0.25 });
          const top = [sx(DR.x + d.T / 2, d.D / 2), sy(d.H + lift, d.D / 2)];
          ftag.style.left = clamp(top[0], 104, CAM.w - 104) + 'px'; ftag.style.top = Math.max(CAM.top - 30, top[1] - 12) + 'px';
        }
      }
      function drawNumbers(g) {
        if (CAM.Z < 58) return;
        g.font = '700 13px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (let i = 0; i < NMICRO; i++) {
          const d = DOMS[i]; if (d.st === 'tray' || d.st === 'drag' || d.st === 'place') continue;
          const x = sx(d.x + d.T / 2, -0.42), y = sy(0, -0.42);
          if (x < -20 || x > CAM.w + 20) continue;
          g.fillStyle = 'rgba(40,20,6,0.35)'; g.beginPath(); g.arc(x, y + 1, 10, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,244,220,0.92)'; g.beginPath(); g.arc(x, y, 10, 0, TAU); g.fill();
          g.fillStyle = '#5a3412'; g.fillText(String(i + 1), x, y + 0.5);
        }
      }
      let tagSize = null, tagAng = 0, tagAv = 0, tagLast = null;
      function placeTag(t, dt) {
        if (!tagSize) tagSize = { w: tag.offsetWidth || 160, h: tag.offsetHeight || 60 };
        const hw = tagSize.w / 2, th = tagSize.h;
        let ax, ay, show, loose;
        if (giant.st === 'hidden' || giant.st === 'drop') { ax = sx(BELL.post, BELL.z); ay = sy(BELL.top, BELL.z) - 6; show = G.phase !== 'intro' && giant.st === 'hidden'; loose = true; }
        else { ax = sx(giant.x + giant.T * 0.5, giant.D * 0.5); ay = sy(giant.H, giant.D * 0.5) - 18; show = giant.st === 'stand' || (giant.st === 'fall' && giant.th < 0.2); loose = G.phase === 'twist'; }
        const inX = loose ? (ax > -hw && ax < CAM.w + hw) : (ax > hw + 6 && ax < CAM.w - hw - 6);
        tag.classList.toggle('ds-snap', !inX);
        show = show && inX && ay - th > CAM.top - 34 && G.phase !== 'finale';
        tag.classList.toggle('on', show);
        G.tagPin = show && giant.st !== 'hidden' ? { x: ax, y: ay } : null;
        if (!show) { tagLast = null; return; }
        const x = clamp(ax, hw + 8, CAM.w - hw - 8), y = ay - th;
        if (tagLast != null) { const vx = (x - tagLast) / Math.max(dt, 0.001); tagAv += (-vx * 0.0004 - tagAng * 28 - tagAv * 3) * dt; }
        tagAng += tagAv * dt; tagLast = x;
        const rot = clamp(tagAng + Math.sin(t * 1.4) * 0.012, -0.12, 0.12);
        tag.style.transform = 'translate(' + (x - hw).toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + rot.toFixed(3) + 'rad)';
      }
      function drawPin(g) {
        const p = G.tagPin; if (!p) return;
        g.strokeStyle = 'rgba(70,44,20,0.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x, p.y - 2); g.lineTo(p.x, p.y + 17); g.stroke();
        g.fillStyle = '#c9493b'; g.beginPath(); g.arc(p.x, p.y + 17, 3.2, 0, TAU); g.fill();
      }
      /* The room, the tabletop and the vignette are one cached picture while the camera rests; only the moving parts are drawn each frame. */
      let BGC = null, bgcKey = '';
      function paintStatic(g) {
        const w = CAM.w, H = CAM.h;
        if (BG) { const par = clamp((3 - CAM.x) * 5, -PAR, PAR); g.drawImage(BG, -PAR + par, 0, w + PAR * 2, H); }
        drawTable(g);
        if (VIG) g.drawImage(VIG, 0, 0, w, H);
      }
      function draw(g, t, dt) {
        const w = CAM.w, H = CAM.h, dpr = cv.dpr || 1;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const settled = Math.abs(CAM.tx - CAM.x) * CAM.Z < 0.3 && Math.abs(CAM.tZ - CAM.Z) < CAM.Z * 0.002 && !CAM.ox && !CAM.oy;
        if (settled) {
          const key = CAM.x.toFixed(4) + ':' + CAM.Z.toFixed(3) + ':' + w + 'x' + H + '@' + dpr + (K.dark() ? 'd' : 'b');
          if (!BGC || key !== bgcKey) {
            if (!BGC) BGC = document.createElement('canvas');
            const pw = Math.round(w * dpr), ph = Math.round(H * dpr);
            if (BGC.width !== pw || BGC.height !== ph) { BGC.width = pw; BGC.height = ph; }
            const bg = BGC.getContext('2d'); bg.setTransform(dpr, 0, 0, dpr, 0, 0); paintStatic(bg); bgcKey = key;
          }
          g.drawImage(BGC, 0, 0, w, H);
        } else paintStatic(g);
        drawCoaster(g, t);
        drawBands(g, t);
        g.save(); g.beginPath(); g.rect(0, sy(0, ZB), w, H); g.clip();
        standShadow(g);
        for (const d of DOMS) {
          if (d.st === 'tray' || d.st === 'drag' || d.st === 'hidden') continue;
          const sa = 0.22 / Math.sqrt(0.55 + 0.45 * d.s);
          if (d.lift > 0.01) { const l = d.lift; d.lift = 0; shadowOf(g, corners(d), 0, d.D, sa / (1 + l * 0.8)); d.lift = l; }
          else shadowOf(g, corners(d), 0, d.D, sa);
        }
        g.restore();
        drawStand(g, t);
        drawNumbers(g);
        for (const d of DOMS) {
          if (d.st === 'tray' || d.st === 'drag' || d.st === 'hidden') continue;
          const hi = (G.phase === 'ready' && d.idx === 0) ? 0.25 + 0.2 * Math.sin(t * 5) : 0;
          drawDomino(g, d, corners(d), { hi });
        }
        drawBell(g);
        drawPin(g);
        drawDemo(g);
        if (DR) drawDrag(g, t);
        PW.update(dt * G.ts); PW.draw(g);
        PS.update(dt); PS.draw(g);
        drawRings(g);
        if (G.flash > 0) { g.fillStyle = 'rgba(255,246,214,' + (G.flash * 0.38) + ')'; g.fillRect(0, 0, w, H); }
      }
      function ringBell(power) {
        (G.rings = G.rings || []).push({ t0: now(), p: power }, { t0: now() + 160, p: power * 0.7 }, { t0: now() + 330, p: power * 0.5 });
        G.bloom = Math.max(G.bloom || 0, power);
      }
      function drawRings(g) {
        const bp = bellScreen(), tn = now(), r0 = BELL.rb * CAM.Z;
        if (G.bloom > 0.01) {
          g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, G.bloom) * 0.6;
          const R = r0 * 5; g.drawImage(K.glowSprite('rgba(255,214,130,0.9)'), bp.x - R, bp.y - R, R * 2, R * 2); g.restore();
        }
        if (!G.rings || !G.rings.length) return;
        G.rings = G.rings.filter(r => tn - r.t0 < 1400);
        g.save(); g.lineWidth = 3;
        for (const r of G.rings) {
          const age = (tn - r.t0) / 1400; if (age < 0) continue;
          g.strokeStyle = 'rgba(255,226,150,' + ((1 - age) * 0.7 * r.p).toFixed(3) + ')';
          g.beginPath(); g.ellipse(bp.x, bp.y, r0 * (1.2 + age * 7), r0 * (1.2 + age * 7) * 0.92, 0, 0, TAU); g.stroke();
        }
        g.restore();
      }
      /* is anything moving that needs every frame? */
      function busy() {
        if (DR || PW.list.length || G.demo || G.flash > 0 || CAM.shake > 0 || Math.abs(BELL.pv) > 0.003 || G.phase === 'cascade' || (G.rings && G.rings.length) || G.bloom > 0.01) return true;
        if (Math.abs(CAM.tx - CAM.x) * CAM.Z > 0.3 || Math.abs(CAM.tZ - CAM.Z) > CAM.Z * 0.002) return true;
        for (const d of DOMS) if (d.st === 'place' || d.st === 'drop' || d.st === 'fall' || d.jig || d.tx != null || d.sq > 0 || d.glow > 0.02) return true;
        return false;
      }

      K.loop((capDt, t) => {
        const g = cv.g; if (!g || !BG) return;
        // wall-clock time (the engine caps dt per frame): on a busy device the dominoes still fall in real time
        const tn = now(), rawDt = clamp(G.lastNow ? (tn - G.lastNow) / 1000 : capDt, 0.001, 0.5); G.lastNow = tn;
        const target = G.slow && !(G.slowEnd && now() > G.slowEnd) ? (K.reduced() ? 0.6 : 0.3) : 1;
        G.ts += (target - G.ts) * Math.min(1, rawDt * 6);
        if (G.slow && G.slowEnd && now() > G.slowEnd + 200) G.slow = false;
        const simDt = rawDt * G.ts, nSub = Math.min(30, Math.ceil(simDt / 0.017));
        for (let si = 0; si < nSub; si++) step(simDt / nSub);
        if (G.phase === 'cascade') followCascade();
        const ck = 1 - Math.exp(-rawDt * (K.reduced() ? Math.max(7, G.camK) : G.camK));
        CAM.x += (CAM.tx - CAM.x) * ck;
        CAM.Z = Math.exp(Math.log(CAM.Z) + (Math.log(CAM.tZ) - Math.log(CAM.Z)) * ck);
        CAM.shake = Math.max(0, CAM.shake - rawDt * 2.6);
        const sh = K.reduced() ? 0 : CAM.shake * CAM.shake * 7;
        CAM.ox = sh ? (Math.random() - 0.5) * sh : 0; CAM.oy = sh ? (Math.random() - 0.5) * sh : 0;
        G.flash = Math.max(0, G.flash - rawDt * 2.2);
        G.bloom = Math.max(0, (G.bloom || 0) - rawDt * 0.9);
        if (Math.abs(CAM.tx - CAM.x) * CAM.Z < 0.3 && Math.abs(CAM.tZ - CAM.Z) < CAM.Z * 0.002) { CAM.x = CAM.tx; CAM.Z = CAM.tZ; }
        shiftWorldParticles();
        if (Math.random() < rawDt * 2.5 && G.phase !== 'finale') PS.emit('mote', CAM.w * (0.35 + Math.random() * 0.6), CAM.h * (0.15 + Math.random() * 0.45), 1, { colors: K.dark() ? ['rgba(255,214,160,0.7)'] : ['rgba(255,250,230,0.85)'], speed: [4, 14] });
        // under the blurred title card and behind the results card the scene holds still (the browser can reuse its blur);
        // when nothing is moving but the dust in the light, draw every other frame
        G.acc = (G.acc || 0) + rawDt;
        if (G.phase === 'intro' && G.drawn > 1) return;
        if (G.finished && now() - G.finishedAt > 900) return;
        if (!busy() && (G.half ^= 1)) return;
        draw(g, t, G.acc); G.acc = 0; G.drawn = (G.drawn || 0) + 1;
        placeTag(t, rawDt);
        if (G.phase === 'ready' && !flickEl.hidden) { const d = DOMS[0]; flickEl.style.left = sx(d.x + d.T / 2, d.D / 2).toFixed(1) + 'px'; flickEl.style.top = sy(d.H * 0.55, d.D / 2).toFixed(1) + 'px'; }
      });

      /* ---------------- flow ---------------- */
      const until = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 20000)) await K.wait(60); };
      const beat = (ms) => K.wait(K.reduced() ? Math.round(ms * 0.8) : ms); // dialogue beats keep their length with reduced motion
      // a tap on the table gets a little knock back, and the nearest standing domino rocks
      S.listen(el, 'pointerdown', (e) => {
        if (!e.target || !e.target.closest || e.target.closest('.ds-rack, .ds-flick, .gk-intro') || !BG) return;
        const p = K.local(e, el); if (p.y < sy(0, ZB)) return;
        if (A.ctx) { A.wood(undefined, 0.07, 0.9 + Math.random() * 0.3); A.sync('knock', now()); }
        PW.emit('dust', p.x, p.y, 5, { colors: TB.dust, speed: [12, 40] });
        let best = null, bd = 1e9;
        for (const d of DOMS) { if (d.st !== 'stand') continue; const dd = Math.abs(sx(d.x + d.T / 2, d.D / 2) - p.x); if (dd < bd) { bd = dd; best = d; } }
        if (best && bd < 160) best.jv += (Math.random() < 0.5 ? -1 : 1) * 0.5;
      });
      async function twist() {
        setPhase('twist'); G.cur = -1; K.guide(null);
        setRack('list');
        MZ.layer = 2;
        say(rush, line({ Jolly: 'Small steps, all lined up. Now, the big one…', Cheeky: 'Look at that tidy little row. Now for the boss…', Unfiltered: 'Small ones done. Now the big one.' }), { mood: 'happy', ms: 2200 });
        await beat(600);
        G.camK = 2.6; frameReveal();
        await beat(1000);
        giant.st = 'drop'; giant.lift = 7.5; giant.vy = 0;
        if (A.ctx) A.tone({ type: 'sine', freq: 1300, to: 260, glide: 0.6, dur: 0.62, vol: 0.05 });
        await until(() => giant.st === 'stand', 3000);
        await beat(250);
        say(rush, line(care ? { Jolly: 'That’s the big one. It’s okay that it looks heavy.', Cheeky: 'That’s the big one. Heavy. Real. We’ll build up to it.', Unfiltered: 'That’s the big one. It’s heavy.' }
          : { Jolly: 'Wait. THAT’s the domino?! It’s enormous!', Cheeky: 'Oh no. Who made it HUGE? Was it you? It was your brain.', Unfiltered: 'That’s the task. It’s massive.' }), { mood: care ? 'worried' : 'panic', ms: 2600 });
        if (!care) rush.react('shake');
        await beat(1300);
        G.camK = 3; frameTwist();
        await beat(550);
        const ghost = mkDom('micro', 1, '', [0, 1], -1); ghost.x = giant.x - 0.5 - ghost.T; ghost.st = 'fall';
        G.demo = { t: 0, d: ghost, bonk: false };
        await beat(800);
        say(rush, line({ Jolly: 'Boop. Nothing. Too small to move that.', Cheeky: 'A tiny bonk. Zero effect. Humbling.', Unfiltered: 'Too small. Bounced off.' }), { mood: 'confused', ms: 2000 });
        await beat(1100);
        el.classList.add('ds-duo'); patch.show(true); patch.react('bounce');
        say(patch, line({ Jolly: 'The trick: a domino can topple one about 1.5× its size. So we build up!', Cheeky: 'Physics fact: a domino can knock one 1.5× its size. Small, bigger, BIG.', Unfiltered: 'A domino topples one 1.5× its size. Build up.' }), { mood: 'idea', ms: 3600 });
        await beat(2700);
        say(rush, line({ Jolly: 'Bigger ones in between. On it!', Cheeky: 'A size ladder. I love a ladder.', Unfiltered: 'Bigger each time. Go.' }), { mood: 'cool', ms: 2200 });
        setPhase('boost'); G.queue = []; for (let i = NMICRO; i < GI; i++) G.queue.push(i);
        setRack('boost'); rack.classList.remove('off');
        await beat(560);
        nextPlacement();
      }
      function ready() {
        setPhase('ready'); G.cur = -1; K.guide(null);
        setRack('list'); refreshTiles();
        frameTiny();
        say(rush, line(care ? { Jolly: 'All set. One small flick is all it takes.', Cheeky: 'Everything’s lined up. Just the tiny one now.', Unfiltered: 'Ready. Flick the tiny one.' }
          : { Jolly: 'Can I flick it? Please? …Fine. You do it. Just the tiny one!', Cheeky: 'I’m vibrating. Flick it. FLICK IT. Gently.', Unfiltered: 'Flick the tiny one. That’s the whole job.' }), { mood: care ? 'determined' : 'speed', ms: 3400 });
        patch.face('happy');
        DOMS[0].glow = 0.8;
        flickEl.hidden = false;
        S.later(() => { if (G.phase === 'ready') K.guide({ id: 'flick', g: 'drag', dir: 'r', d: 70, target: flickEl, oy: 0.3, label: 'FLICK THE TINY ONE', ms: 1400, delay: 200 }); }, 1000);
      }
      async function finale() {
        if (G.phase === 'finale') return;
        setPhase('finale'); G.slow = false;
        MZ.duckT = 0.9; MZ.layer = 3; G.camK = 2;
        frameAll();
        rush.base('celebrate');
        say(rush, line(care ? { Jolly: 'It fell. All of it started with one tiny move.', Cheeky: 'Down it went. From one small flick.', Unfiltered: 'Down. From one tiny move.' }
          : { Jolly: 'DING! The big one fell. From one tiny flick!', Cheeky: 'Hear that? That’s the sound of a thing getting done.', Unfiltered: 'Ding. The big one’s down.' }), { ms: 3400 });
        patch.face('laugh', 2600);
        S.later(() => { if (!G.finished) say(patch, line({ Jolly: 'Small really does move big.', Cheeky: 'Told you. Physics is on your side.', Unfiltered: 'Small moved big.' }), { mood: 'celebrate', ms: 3000 }); rush.hush(); }, 2600);
        DOMS.forEach((d, i) => S.later(() => {
          d.glow = 1; sNote(i, 0.12);
          const W4 = corners(d), c = [sx((W4[0][0] + W4[2][0]) / 2, d.D / 2), sy((W4[0][1] + W4[2][1]) / 2, d.D / 2)];
          PW.emit('star', c[0], c[1], 6 + Math.round(d.s * 2), { colors: ['#fff3c4', '#ffd36b'], speed: [30, 100] });
        }, 500 + i * 190));
        await beat(500 + DOMS.length * 190);
        const bp = bellScreen();
        BELL.pv += 1.6; sBell(0.8); ringBell(0.8);
        K.finale('confetti', { from: [bp], colors: ['#ffd36b', '#ff8a4d', '#ff5fa2', '#7be08a', '#3fd0c9', '#fff3c4'], chord: ['F3', 'A3', 'C4', 'E4', 'G4'], ms: 3800 });
        await beat(700);
        const card = h('div', { class: 'ds-card', role: 'status' },
          h('div', { class: 'ds-card-pips', html: miniSVG(DOMS[0], 40) }),
          h('div', { class: 'ds-card-k', text: 'Your first domino' }),
          h('span', { class: 'ds-card-t gk-user', text: DOMS[0].label }),
          h('div', { class: 'ds-card-s', text: care ? 'Two minutes. Someone qualified can help with the rest.' : 'Two minutes. That’s all it asks.' }));
        el.append(card);
        if (A.ctx) K.sfx.paper();
        await beat(2700);
        finish();
      }
      function finish() {
        if (G.finished) return;
        const n = G.qs.length, prec = n ? G.qs.reduce((a, b) => a + b, 0) / n : 0.8;
        const pct = Math.round(prec * 100), perfect = G.grades.filter(x => x === 'perfect').length;
        const badges = [];
        const pb = K.best('precision', pct, 'higher');
        if (pb.isNew) badges.push('New best: ' + pct + '% precise'); else if (pb.first) badges.push('First chain: ' + pct + '% precise');
        const tier = K.tier(prec, [0.55, 0.74, 0.88]);
        if (tier) {
          const got = owned.slice(), reach = ['Bronze', 'Silver', 'Gold'].slice(0, ['Bronze', 'Silver', 'Gold'].indexOf(tier) + 1);
          const fresh2 = reach.map(tn => TIER_SET[tn]).find(k => !got.includes(k)) || '';
          if (fresh2) { got.push(fresh2); S.store.set('domino-start:sets', SET_ORDER.filter(k => got.includes(k))); S.store.set('domino-start:fresh', fresh2); badges.push(tier + ': new ' + SETS[fresh2].name + ' set'); }
          else badges.push(tier + ': steady hands');
        }
        const col = K.collect(V.bell);
        badges.push((col.isNew ? 'Collected: ' : 'Rang again: ') + V.bell + ' (' + Math.min(col.count, VENUES.length) + ' of ' + VENUES.length + ')');
        ctx.track('done', { prec: pct, perfect, n: DOMS.length, venue: V.id, set: setKey });
        G.finished = true; G.finishedAt = now();
        ctx.finish({
          title: 'The big one fell', mood: 'celebrate',
          lines: ['First domino: ' + DOMS[0].label, perfect + ' of ' + n + ' placed perfectly', 'Toppled a domino ' + fmtX(giant.s) + ' the size of the first'],
          share: 'Tipped one tiny domino. The big one fell too.', badges
        });
      }

      /* ---------------- start ---------------- */
      cv.onResize(() => { if (cv.w !== CAM.w || cv.h !== CAM.h || !BG) layout(); });
      S.on('theme', () => { paintCaches(); });
      if (ctx.analysisReady && an.source !== 'ai') ctx.analysisReady.then((a2) => {
        if (!a2 || a2.source !== 'ai' || G.started) return;
        CT = pickContent(a2);
        for (let i = 0; i < NMICRO; i++) DOMS[i].label = CT.steps[i];
        giant.label = CT.task; tag.querySelector('.ds-tag-t').textContent = CT.task; tagSize = null;
      }).catch(() => {});
      (async () => {
        await K.intro({ title: 'Domino Start', sub: 'The big thing you keep putting off? We’re going to knock it over, starting tiny.', how: 'Drag each domino into the glow. Then flick the tiny one.', char: 'rush', mood: 'happy' });
        G.started = true;
        setPhase('establish');
        frameAll(); CAM.x = CAM.tx; CAM.Z = CAM.tZ * 1.06;
        say(rush, line(care ? { Jolly: 'That bell at the end is the big thing. We’ll get there gently, one small step at a time.', Cheeky: 'Big thing at the end. No jokes about it. We just start small.', Unfiltered: 'Big thing at the end. We start small.' }
          : visits >= 1 ? { Jolly: 'Back at the ' + V.name + '! See the bell? That’s the big thing. Let’s knock it over.', Cheeky: 'Oh hey, you again. Bell at the end, tiny domino here. You know the drill.', Unfiltered: 'Bell at the end. Tiny domino here. Again.' }
            : { Jolly: 'See the bell at the end? That’s the thing you keep putting off. We’re knocking it over.', Cheeky: 'That bell? That’s the dreaded thing. We topple it with a baby domino.', Unfiltered: 'Bell at the end: the thing you’re avoiding. We knock it over.' }), { mood: care ? 'think' : 'idea', ms: 3600 });
        await beat(2300);
        G.camK = 2.6; frameTiny();
        DOMS[0].glow = 1; sChord(0);
        await beat(1000);
        say(rush, line({ Jolly: 'This little one’s your first step. Tiny on purpose.', Cheeky: 'Meet your first domino. Small. Unthreatening. Sneaky.', Unfiltered: 'First domino. Tiny. That’s the point.' }), { mood: 'wink', ms: 3000 });
        G.camK = 3;
        setPhase('build'); G.queue = []; for (let i = 1; i < NMICRO; i++) G.queue.push(i);
        setRack('build'); rack.classList.remove('off');
        await beat(560);
        nextPlacement();
      })();

      return {
        async autoplay() {
          await until(() => !!el.querySelector('.gk-intro') || G.phase !== 'intro', 4000);
          const intro = el.querySelector('.gk-intro');
          if (intro) await K.sim.tap(intro);
          await until(() => G.phase === 'build', 30000);
          let guard = 0;
          while (G.phase !== 'ready' && G.phase !== 'cascade' && G.phase !== 'finale' && guard++ < 30) {
            await until(() => (G.phase === 'build' || G.phase === 'boost') && G.cur > 0 && !G.busy && !DR && tiles[G.cur] && !rack.classList.contains('off'), 25000);
            if (G.phase !== 'build' && G.phase !== 'boost') { await K.wait(200); continue; }
            await until(() => Math.abs(CAM.x - CAM.tx) * CAM.Z < 3 && Math.abs(CAM.Z - CAM.tZ) < 1, 2000);
            await K.wait(120);
            const i = G.cur, d = DOMS[i], tile = tiles[i], r = K.rectIn(tile, el), F = feasible(i);
            const tx = CAM.w / 2 + (F.ideal + d.T / 2 + d.D * KX / 2 - CAM.tx) * CAM.tZ, ty = CAM.ybase - 30;
            await K.sim.drag(tile, { x: r.w / 2, y: r.h * 0.4 }, { x: tx - r.x, y: ty - r.y }, 560, 10);
            await until(() => G.cur !== i || G.phase === 'twist' || G.phase === 'ready', 5000);
          }
          await until(() => G.phase === 'ready', 40000);
          await K.wait(1000);
          const fr = K.rectIn(flickEl, el);
          await K.sim.drag(flickEl, { x: fr.w * 0.45, y: fr.h * 0.35 }, { x: fr.w * 0.45 + 80, y: fr.h * 0.35 }, 150, 6);
          await until(() => G.finished, 60000);
        }
      };
    }
  });
})(window.TSG_ENV);
