/* 004 Wrong Answers Only — Reset · ACT · Getting Started
 * Mechanism: shrink the activation energy. Absurdly huge "first steps" make the real first step feel small by contrast
 * (contrast effect), humour lowers the threat of starting, and the round ends in an implementation intention plus a
 * two-minute start (Gollwitzer 1999; the two-minute rule): pick the tiniest real step and do it while the show waits.
 * Verb: buzz (lock the answer the chase light is on, then cue the applause on the beat). Finale: confetti cannons,
 * sweeping studio lights and a golden STARTER STEP trophy rising with the player's tiny step on its plaque.
 */
(function (env) {
  'use strict';
  /* Worst first steps run from mildly silly to wildly absurd (that order is their laugh score); tiny steps run smallest first. */
  const TEMPLATES = [
    { re: /\b(e-?mails?|inbox|reply|replies|respond|messages?|dms?)\b/i,
      wrong: ['Reread every email since 2009 first', 'Draft it fourteen times, then sleep on it', 'Colour-code your whole inbox by mood', 'Take a touch-typing course first', 'Write the reply as a sonnet', 'Print every email and file it by hand', 'Start a new inbox under a fake name', 'Train a pigeon to deliver it instead'],
      tiny: ['Open the email and read it once', 'Type one rough sentence back', 'Write just the subject line'], decoy: 'Clear the whole inbox tonight' },
    { re: /\b(essay|assignment|thesis|dissertation|paper|article|blog|chapter|write|writing|draft)\b/i,
      wrong: ['Rename the file forty times', 'Reorganise every folder on your laptop', 'Buy a quill and an inkwell', 'Read the entire library, alphabetically', 'Design a brand-new font just for it', 'Learn Latin first, for the vibe', 'Move to a cabin in the woods for focus', 'Wait for a sign from the universe'],
      tiny: ['Open the doc and type the title', 'Write one messy sentence', 'Paste the question at the top'], decoy: 'Write the full introduction' },
    { re: /\b(report|presentation|slides?|deck|proposal|pitch|speech|talk)\b/i,
      wrong: ['Spend an hour picking the font', 'Research the history of slideshows', 'Make 200 slides about slide design', 'Get a haircut that says expert', 'Rehearse in front of 1,000 mirrors', 'Commission an oil painting of your chart', 'Hire an orchestra for the intro', 'Invent a new language to present in'],
      tiny: ['Open a blank slide and add a title', 'Write your three main points', 'Name the file properly'], decoy: 'Finish every slide today' },
    { re: /\b(clean\w*|tidy\w*|laundry|dishes|washing up|vacuum\w*|declutter\w*|chores?|mess|messy|kitchen|bedroom)\b/i,
      wrong: ['Watch nine hours of cleaning videos', 'Alphabetise your socks first', 'Buy forty matching storage boxes', 'Hold a farewell party for every crumb', 'Rent a skip for one coffee cup', 'Train a raccoon as your assistant', 'Wait until you move house', 'Invent a self-cleaning floor first'],
      tiny: ['Put one cup in the sink', 'Pick up five things', 'Clear one small surface'], decoy: 'Deep clean the whole place' },
    { re: /\b(gym|exercise|workout|work out|run|running|jog\w*|walk|yoga|stretch\w*|fitness|swim\w*)\b/i,
      wrong: ['Research perfect trainers for a week', 'Buy twelve matching gym outfits', 'Study the history of the push-up', 'Build a home gym in the garage first', 'Wait for perfect weather on a Tuesday', 'Hire a choir to sing you motivation', 'Buy a treadmill shaped like a swan', 'Train for an Olympic marathon first'],
      tiny: ['Put your trainers by the door', 'Stand up and do one stretch', 'Walk to the window and back'], decoy: 'Do a full hour-long workout' },
    { re: /\b(call|ring|phone|appointment|booking)\b/i,
      wrong: ['Practise saying hello for a week', 'Write a forty-page script for the call', 'Wait until they call you first', 'Rehearse with a full cast of actors', 'Learn to speak fluent whale', 'Send a carrier pigeon instead', 'Move somewhere without phones', 'Build a robot to make the call'],
      tiny: ['Find the number and save it', 'Write your first sentence down', 'Open the dialler with the number ready'], decoy: 'Make every call this afternoon' },
    { re: /\b(study|studying|exams?|revise|revision|test|homework|learn|course|notes|lecture)\b/i,
      wrong: ['Buy forty highlighters in every colour', 'Make a timetable for your timetable', 'Turn your desk into a fortress', 'Read the textbook backwards for fun', 'Memorise the dictionary first', 'Learn speed-reading from a parrot', 'Wait until the night before', 'Build a time machine for extra time'],
      tiny: ['Open your notes to page one', 'Read one paragraph out loud', 'Write three things you already know'], decoy: 'Revise the whole chapter tonight' },
    { re: /\b(job|jobs|cv|resume|cover letter|application|apply|applying)\b/i,
      wrong: ['Retake your profile photo nine times', 'Research every company on Earth', 'Buy a suit to fill in a form', 'Write your life story as chapter one', 'Learn five languages, just in case', 'Get a tattoo that says HIRE ME', 'Wait for a job to find you', 'Start your own country instead'],
      tiny: ['Open your CV and fix one line', 'Save one job link to apply for', 'Write the first line of the letter'], decoy: 'Send ten applications today' },
    { re: /\b(tax|taxes|budget|bills?|invoices?|forms?|paperwork|admin)\b/i,
      wrong: ['Make a folder for your folders', 'Buy a fancy pen just for signing', 'Print everything since birth', 'Build a filing cabinet from scratch', 'Become a certified accountant first', 'Ask a fortune teller for the numbers', 'Wait for the forms to fill themselves', 'Move to an island with no post'],
      tiny: ['Open the form and read question one', 'Find one document you need', 'Make a folder and name it'], decoy: 'Finish all the paperwork today' }
  ];
  const GENERIC = {
    wrong: ['Wait until you feel 100% ready', 'Reorganise your entire house first', 'Buy a new laptop, desk and lamp', 'Make a 50-slide plan about planning', 'Ask thirty people for their opinion', 'Read every book ever written about it', 'Learn a new language, just in case', 'Start at 3am for dramatic effect'],
    tiny: ['Open it and look for ten seconds', 'Write down the very next action', 'Set a two-minute timer and begin'], decoy: 'Finish the whole thing tonight'
  };

  /* An opaque, DPR-aware canvas with the kit's canvas interface ({ el, g, w, h, dpr, onResize, fit }). Opaque layers let the
     compositor skip blending and cull what is underneath, which keeps a full-screen animated scene smooth on weaker devices. */
  function opaqueCanvas(parent, o, S) {
    const c = document.createElement('canvas');
    c.className = 'gk-canvas'; c.setAttribute('aria-hidden', 'true');
    parent.append(c);
    const st = { el: c, g: null, w: 0, h: 0, dpr: 1 }, cbs = [];
    st.fit = () => {
      const w = c.clientWidth || parent.clientWidth, hh = c.clientHeight || parent.clientHeight;
      if (!w || !hh) return;
      const dpr = Math.min(window.devicePixelRatio || 1, o.maxDpr || 2), pw = Math.round(w * dpr), ph = Math.round(hh * dpr);
      if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
      c.style.width = w + 'px'; c.style.height = hh + 'px';
      st.g = st.g || c.getContext('2d', { alpha: false });
      st.g.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.dpr = dpr; st.w = w; st.h = hh;
      cbs.forEach(f => { try { f(st); } catch (e) { console.error(e); } });
    };
    st.onResize = (f) => { cbs.push(f); if (st.w) f(st); };
    try { const ro = new ResizeObserver(() => st.fit()); ro.observe(c); S.onDestroy(() => ro.disconnect()); } catch (e) { S.listen(window, 'resize', st.fit); }
    st.fit();
    return st;
  }
  /* Software-rendered canvases (no GPU: VMs, old or blocklisted devices) get a 1x canvas so motion stays smooth. */
  function softwareGfx() {
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r);
    } catch (e) { return false; }
  }
  (env.games = env.games || []).push({
    id: 'wrong-answers-only', mode: 'reset', name: 'Wrong Answers Only', verb: 'buzz', family: 'ACT', minutes: 2,
    parents: ['Getting Started', 'Performance / Confidence'],
    cast: ['rush'], poster: { char: 'rush', mood: 'laugh' },
    tagline: 'Game show: buzz the worst first steps, then find the tiniest real one.',
    why: 'For a task you keep putting off: absurd giant steps make one tiny real start feel easy.',
    css: `
.g-wrong-answers-only { --wa-a: #ff4fa3; --wa-b: #3fe0d0; --wa-c: #ffd36b; }
.g-wrong-answers-only .wa-ui { position: absolute; z-index: 20; left: 0; right: 0; top: calc(env(safe-area-inset-top, 0px) + 60px); bottom: 0; display: flex; flex-direction: column; align-items: center;
  padding: 0 14px calc(env(safe-area-inset-bottom, 0px) + 10px); pointer-events: none; }
.g-wrong-answers-only .wa-marquee { flex: none; position: relative; width: min(100%, 540px); height: 58px; margin-top: 8px; border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  background: linear-gradient(180deg, #2c0d40 0%, #16061f 100%); border: 2px solid rgba(255, 222, 150, 0.6); box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.6), 0 8px 22px rgba(0, 0, 0, 0.45); }
.g-wrong-answers-only .wa-title { font: 800 clamp(19px, 6cqw, 30px)/1 var(--font-display); letter-spacing: 0.07em; color: #fff7de; text-shadow: 0 0 6px var(--wa-c), 0 0 18px var(--wa-a); white-space: nowrap; }
.g-wrong-answers-only .wa-ep { font: 700 12px/1 var(--font-ui); letter-spacing: 0.12em; text-transform: uppercase; color: #ffdcf2; white-space: nowrap; }
.g-wrong-answers-only .wa-meter { flex: none; width: min(100%, 540px); display: flex; align-items: center; gap: 8px; margin-top: 9px; }
.g-wrong-answers-only .wa-sign { flex: none; font: 800 12px/1 var(--font-ui); letter-spacing: 0.14em; padding: 6px 8px 5px; border-radius: 6px; background: #3a1626; color: #c58a99; border: 1px solid rgba(255, 120, 140, 0.4); transition: background 0.08s, color 0.08s, box-shadow 0.08s; }
.g-wrong-answers-only .wa-sign.on { background: #ff3355; color: #fff; border-color: #fff; box-shadow: 0 0 14px rgba(255, 51, 85, 0.95); }
.g-wrong-answers-only .wa-leds { flex: 1; display: grid; grid-template-columns: repeat(20, 1fr); gap: 3px; height: 20px; padding: 3px; border-radius: 7px; background: rgba(10, 4, 20, 0.82); border: 1px solid rgba(255, 255, 255, 0.14); }
.g-wrong-answers-only .wa-leds i { border-radius: 2px; background: rgba(255, 255, 255, 0.09); transition: background 0.18s; }
.g-wrong-answers-only .wa-leds i.on { background: var(--c); }
.g-wrong-answers-only .wa-host { flex: none; width: min(100%, 600px); height: 110px; }
.g-wrong-answers-only .wa-q { flex: none; width: min(100%, 600px); text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 0 10px; transition: opacity 0.35s ease; }
.g-wrong-answers-only .wa-round { font: 800 12px/1 var(--font-ui); letter-spacing: 0.16em; text-transform: uppercase; color: var(--wa-c); text-shadow: 0 1px 6px rgba(0, 0, 0, 0.6); }
.g-wrong-answers-only .wa-ask { font: 700 21px/1.15 var(--font-ui); color: #fff; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.55); text-wrap: balance; }
.g-wrong-answers-only .wa-task { font: 700 15px/1.2 var(--font-ui); color: #2a1300; background: linear-gradient(180deg, #ffefb8, #ffc94d); padding: 6px 13px 5px; border-radius: 999px; max-width: 100%; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35); }
.g-wrong-answers-only .wa-board { flex: 1 1 auto; min-height: 0; width: min(100%, 600px); display: flex; flex-direction: column; justify-content: center; gap: 8px; transition: opacity 0.35s ease; }
.g-wrong-answers-only .wa-panel { position: relative; display: flex; align-items: center; gap: 10px; min-height: 56px; padding: 7px 12px 7px 9px; border-radius: 14px; color: #f4f6ff; text-align: left;
  font: 600 15px/1.25 var(--font-ui); background: linear-gradient(180deg, #24317e 0%, #131b50 100%); border: 2px solid rgba(125, 155, 255, 0.55); box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.16);
  transform: perspective(700px) rotateX(86deg); opacity: 0; transition: transform 0.4s cubic-bezier(.2, 1.4, .4, 1), opacity 0.2s ease; }
.g-wrong-answers-only .wa-panel.in { transform: none; opacity: 1; }
.g-wrong-answers-only .wa-let { flex: none; width: 36px; height: 34px; display: grid; place-items: center; font: 800 17px/1 var(--font-display); color: #2a1300; background: linear-gradient(180deg, #fff3c0, #ffc23d);
  clip-path: polygon(24% 3%, 76% 3%, 100% 50%, 76% 97%, 24% 97%, 0 50%); }
.g-wrong-answers-only .wa-txt { flex: 1; min-width: 0; }
.g-wrong-answers-only .wa-stars { flex: none; font: 800 12px/1.1 var(--font-ui); letter-spacing: 0.06em; color: #ffd36b; text-align: right; opacity: 0; transition: opacity 0.3s ease; white-space: nowrap; }
.g-wrong-answers-only .wa-stars b { display: block; font-size: 14px; letter-spacing: 0.1em; }
.g-wrong-answers-only .wa-panel.lit { background: linear-gradient(180deg, #4d5ee8 0%, #28329e 100%); border-color: #fff; }
.g-wrong-answers-only .wa-chase { position: absolute; z-index: 21; left: 0; top: 0; width: 10px; height: 10px; border-radius: 16px; pointer-events: none; opacity: 0; will-change: transform;
  box-shadow: 0 0 0 3px var(--wa-a), 0 0 22px var(--wa-a), inset 0 0 14px rgba(255, 255, 255, 0.25); transition: opacity 0.15s ease; }
.g-wrong-answers-only .wa-chase.on { opacity: 1; }
.g-wrong-answers-only .wa-panel.locked { background: linear-gradient(180deg, #fff2b8 0%, #ffbd36 100%); color: #2a1300; border-color: #fff; box-shadow: 0 0 0 3px var(--wa-c), 0 0 28px var(--wa-c); transform: none; animation: wa-stamp 0.45s cubic-bezier(.2, 1.6, .4, 1); }
.g-wrong-answers-only .wa-panel.locked .wa-let { background: #2a1300; color: #ffd36b; }
.g-wrong-answers-only .wa-panel.locked .wa-stars { color: #7a3500; }
.g-wrong-answers-only .wa-panel.dim { opacity: 0.55; }
.g-wrong-answers-only .wa-panel.out { opacity: 0.32; }
.g-wrong-answers-only .wa-panel.out .wa-txt { text-decoration: line-through; text-decoration-thickness: 2px; }
.g-wrong-answers-only .wa-panel.show .wa-stars { opacity: 1; }
@keyframes wa-stamp { 0% { transform: scale(1.1); } 55% { transform: scale(0.97); } 100% { transform: none; } }
.g-wrong-answers-only .wa-buzzwrap { flex: none; position: relative; width: 100%; height: 176px; transition: opacity 0.45s ease; }
.g-wrong-answers-only .wa-buzzer { pointer-events: auto; position: absolute; left: 50%; top: 16px; width: 112px; height: 112px; margin-left: -56px; border-radius: 50%; border: 0; padding: 0; cursor: pointer; touch-action: manipulation; will-change: transform;
  background: radial-gradient(circle at 50% 50%, #d9dde8 0 55%, #8e94a8 56% 61%, #3b3f4d 62% 100%); box-shadow: 0 9px 0 #22242e, 0 16px 26px rgba(0, 0, 0, 0.5); -webkit-tap-highlight-color: transparent; }
.g-wrong-answers-only .wa-buzzer b { position: absolute; inset: 12px; border-radius: 50%; display: grid; place-items: center; font: 800 19px/1 var(--font-display); letter-spacing: 0.08em; color: #fff; text-shadow: 0 2px 0 rgba(90, 0, 10, 0.6);
  background: radial-gradient(circle at 42% 30%, #ffc0c0 0%, #ff3b3b 30%, #c40d1f 70%, #6e0010 100%); box-shadow: inset 0 -8px 12px rgba(0, 0, 0, 0.35), inset 0 4px 6px rgba(255, 255, 255, 0.4), 0 6px 0 #7a0714; transition: transform 0.05s ease, box-shadow 0.05s ease; }
.g-wrong-answers-only .wa-buzzer.down b { transform: translateY(5px); box-shadow: inset 0 -4px 8px rgba(0, 0, 0, 0.35), inset 0 3px 5px rgba(255, 255, 255, 0.35), 0 1px 0 #7a0714; }
.g-wrong-answers-only .wa-buzzer:focus-visible { outline: 3px solid #fff; outline-offset: 6px; }
.g-wrong-answers-only .wa-clock { flex: 1 1 auto; min-height: 0; width: min(100%, 520px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; pointer-events: auto; animation: gk-say 0.35s cubic-bezier(.2, 1.4, .4, 1) both; }
.g-wrong-answers-only .wa-hold { font: 800 13px/1.2 var(--font-ui); letter-spacing: 0.14em; text-transform: uppercase; color: #ffe2f3; text-align: center; text-shadow: 0 1px 8px rgba(0, 0, 0, 0.6); }
.g-wrong-answers-only .wa-step { font: 700 19px/1.3 var(--font-ui); color: #2a1300; background: linear-gradient(180deg, #fff4c8, #ffcf5c); border-radius: 16px; padding: 13px 20px; text-align: center; box-shadow: 0 0 0 3px #fff, 0 0 26px var(--wa-c); max-width: 100%; text-wrap: balance; }
.g-wrong-answers-only .wa-led { font: 700 60px/1 ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; letter-spacing: 0.04em; color: #ffb547; text-shadow: 0 0 10px rgba(255, 170, 60, 0.9), 0 0 24px rgba(255, 140, 40, 0.5);
  background: #140a06; border: 3px solid #3c2616; border-radius: 16px; padding: 10px 22px 8px; font-variant-numeric: tabular-nums; box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.8), 0 10px 24px rgba(0, 0, 0, 0.45); }
.g-wrong-answers-only .wa-led.calm { color: #8fe8ff; text-shadow: 0 0 10px rgba(80, 200, 255, 0.9), 0 0 24px rgba(80, 200, 255, 0.5); }
.g-wrong-answers-only .wa-btns { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.g-wrong-answers-only .wa-btns .ts-btn { min-height: 52px; font-size: 17px; padding: 14px 24px; }
.g-wrong-answers-only .wa-btns .ts-btn-quiet { color: #fff; border: 1px solid rgba(255, 255, 255, 0.55); background: rgba(24, 8, 40, 0.72); }
.g-wrong-answers-only .wa-gone { opacity: 0 !important; pointer-events: none !important; }
.g-wrong-answers-only .wa-gone * { pointer-events: none !important; }
.g-wrong-answers-only .wa-win { position: absolute; z-index: 24; left: 50%; top: 0; transform: translate(-50%, -50%) scale(0.6); opacity: 0; pointer-events: none; white-space: nowrap; text-align: center;
  font: 800 clamp(34px, 11cqw, 64px)/1 var(--font-display); letter-spacing: 0.04em; color: #fff3c4; text-shadow: 0 3px 0 #b8741e, 0 6px 0 #6e3d0a, 0 0 30px rgba(255, 200, 80, 0.75); transition: transform 0.6s cubic-bezier(.2, 1.5, .4, 1), opacity 0.3s ease; }
.g-wrong-answers-only .wa-win.on { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.g-wrong-answers-only .wa-plaque { position: absolute; z-index: 24; left: 50%; top: 0; transform: translateX(-50%); width: max-content; max-width: min(300px, calc(100% - 48px)); text-align: center; padding: 8px 14px 9px; border-radius: 10px;
  background: linear-gradient(180deg, #43301a, #1d1306); border: 2px solid #ffd36b; box-shadow: 0 0 18px rgba(255, 200, 80, 0.5), 0 8px 18px rgba(0, 0, 0, 0.5); opacity: 0; transition: opacity 0.5s ease; pointer-events: none; }
.g-wrong-answers-only .wa-plaque.on { opacity: 1; }
.g-wrong-answers-only .wa-plaque small { display: block; font: 800 12px/1 var(--font-ui); letter-spacing: 0.22em; color: #ffd36b; margin-bottom: 6px; }
.g-wrong-answers-only .wa-plaque span { display: block; font: 700 16px/1.25 var(--font-ui); color: #fff4d6; text-wrap: balance; }
.g-wrong-answers-only .gk-char.wa-rush .gk-bubble { max-width: min(280px, calc(100cqw - var(--sz) - 44px)); }
@container (min-width: 700px) {
  .g-wrong-answers-only .wa-marquee { height: 72px; margin-top: 10px; }
  .g-wrong-answers-only .wa-ep { font-size: 13px; }
  .g-wrong-answers-only .wa-host { height: 132px; }
  .g-wrong-answers-only .wa-ask { font-size: 27px; }
  .g-wrong-answers-only .wa-task { font-size: 17px; }
  .g-wrong-answers-only .wa-board { display: grid; grid-template-columns: 1fr 1fr; align-content: center; gap: 12px; }
  .g-wrong-answers-only .wa-panel { min-height: 80px; font-size: 17px; padding: 10px 14px 10px 10px; }
  .g-wrong-answers-only .wa-buzzwrap { height: 196px; }
  .g-wrong-answers-only .wa-buzzer { width: 128px; height: 128px; margin-left: -64px; }
  .g-wrong-answers-only .wa-led { font-size: 72px; }
  .g-wrong-answers-only .wa-plaque span { font-size: 18px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis;
      const inten = ctx.intensity, line = (o) => ctx.line(o);
      const VISITS = K.visits();

      /* ---------------- today's episode (palette, prize) and the show's season (grows with visits) ---------------- */
      const THEME = K.dailyPick([
        { name: 'Disco Night', a: '#ff4fa3', b: '#3fe0d0', c: '#ffd36b', prize: 'Glitter Mic' },
        { name: 'Golden Hour', a: '#ff6b4a', b: '#ffc93f', c: '#ffe08a', prize: 'Golden Buzzer' },
        { name: 'Electric Blue', a: '#4da3ff', b: '#a77bff', c: '#8ff3ff', prize: 'Neon Bow Tie' },
        { name: 'Lime Light', a: '#9dff3d', b: '#ff4fd8', c: '#fff36b', prize: 'Lucky Cue Card' },
        { name: 'Sunset Strip', a: '#ff8a3d', b: '#ff5fa2', c: '#ffd36b', prize: 'Confetti Cannon' },
        { name: 'Velvet Retro', a: '#ff3d6e', b: '#ffb347', c: '#ffe9b0', prize: 'Velvet Curtain' }
      ], 4);
      el.style.setProperty('--wa-a', THEME.a); el.style.setProperty('--wa-b', THEME.b); el.style.setProperty('--wa-c', THEME.c);
      const SEASON = 1 + Math.floor(VISITS / 6), EPISODE = (VISITS % 6) + 1;
      const TEMPO = [[92, 100, 84], [104, 112, 92], [112, 122, 98]][inten], STEP = inten === 0 ? 2 : 1;
      const CONF = [THEME.a, THEME.b, THEME.c, '#ffffff', '#ff8fb1'];

      /* ---------------- what the show is about (never jokes about a care topic) ---------------- */
      const care = an.safety === 'care';
      const task = care ? '' : K.clean(an.task || '', 60);
      const FILLER = /^(THAT THING I SAID|TOMORROW.S LIST|WHAT IF IT GOES WRONG|SHOULD.VE DONE BETTER|WHAT THEY THINK|EVERYTHING AT ONCE|THE BIG WORRY)$/;
      const todo = !task && !care ? (an.strands || []).concat(an.core ? [an.core] : []).find(s => s && s.loop === 'todo' && !FILLER.test(s.label || '')) : null;
      const subject = task || (todo && todo.label) || (!care && an.core && an.core.label) || '';
      const chip = subject ? K.words(subject, 7).toUpperCase().replace(/[.!?,;:]+$/, '') : 'GETTING STARTED';
      const askWrong = task || todo || !subject ? 'What’s the WORST first step?' : 'What’s the WORST first step for this?';
      const corpus = care ? '' : [task, ctx.text, (an.strands || []).map(s => s.label).join(' ')].join(' ');
      const TPL = TEMPLATES.find(t => t.re.test(corpus)) || GENERIC;
      const CONTENT = { wrong: TPL.wrong.slice(), tiny: TPL.tiny.slice(), decoy: TPL.decoy, source: 'template' };
      const aiP = care ? Promise.resolve(null) : ctx.ai([
        'Game: Wrong Answers Only, a playful TV game show about getting started.',
        task ? 'The player is putting off this task: "' + task + '".' : 'What is on the player’s mind: "' + (subject || 'getting started on something') + '".',
        'Reply with only this JSON: {"wrong":["..."],"tiny":["..."]}',
        'wrong: 8 absurdly huge, harmless, funny WORST first steps for it, each at most 9 words, ordered from mildly silly to wildly absurd. Never mock the player; nothing unsafe, cruel or risky.',
        'tiny: 3 genuinely helpful first steps that take under 2 minutes, each at most 10 words, ordered from smallest to slightly bigger.'
      ].join('\n'), { tier: 'quick', fallback: null });
      function adopt(r) {
        if (!r || typeof r !== 'object') return;
        const ok = (arr, maxW) => (Array.isArray(arr) ? arr : []).filter(x => typeof x === 'string').map(x => K.clean(x, 90).replace(/^[-•\d.)\s]+/, '').replace(/[.!]+$/, ''))
          .filter(x => x.length >= 6 && x.split(/\s+/).length <= maxW + 2);
        const wr = ok(r.wrong, 9), ti = ok(r.tiny, 10);
        if (wr.length >= 6 && ti.length >= 2) {
          CONTENT.wrong = wr.slice(0, 8).concat(TPL.wrong).slice(0, 8);
          CONTENT.tiny = ti.slice(0, 3).concat(TPL.tiny).slice(0, 3);
          CONTENT.source = 'ai';
        }
      }

      /* ---------------- lines (every vibe) ---------------- */
      const LN = {
        welcome: { Jolly: 'Welcome to WRONG ANSWERS ONLY! The worse the answer, the louder they cheer.', Cheeky: 'Welcome to the only show where being wrong pays. Gloriously.', Unfiltered: 'Wrong answers only. Dumber is better. Let’s go.' },
        back: { Jolly: 'Welcome back, champ! The crowd remembers you.', Cheeky: 'Oh, it’s YOU again. The crowd’s thrilled. Mostly.', Unfiltered: 'Returning champ. Don’t get cocky. Get wrong.' },
        r1: { Jolly: 'Round one! Lock in the most gloriously terrible first step.', Cheeky: 'Round one. Give me your most magnificently awful first step.', Unfiltered: 'Round one. Worst first step. Go big.' },
        r2: { Jolly: 'Round two! Bigger, sillier, and the lights are faster!', Cheeky: 'Round two. Lights go faster. Standards go lower.', Unfiltered: 'Round two. Faster. Worse. Go.' },
        big: { Jolly: 'Ha! Gloriously terrible. They’re on their feet!', Cheeky: 'Oh, that’s AWFUL. I love it. They love it.', Unfiltered: 'Ridiculous. Perfect. Crowd’s losing it.' },
        mid: { Jolly: 'Terrible! Wonderfully terrible.', Cheeky: 'Solid nonsense. Respect.', Unfiltered: 'Bad. Very bad. Good.' },
        small: { Jolly: 'A gentle wrong! Still gets a giggle.', Cheeky: 'Mildly wrong. We’ll allow it.', Unfiltered: 'Weak wrong. Still wrong. Fine.' },
        pump: { Jolly: 'Cue the applause! Buzz on the beat!', Cheeky: 'Hype them up, maestro. On the beat.', Unfiltered: 'Pump the crowd. Buzz on the beat.' },
        pumpGood: { Jolly: 'Listen to that crowd!', Cheeky: 'Rhythm AND bad ideas. Impressive.', Unfiltered: 'Crowd’s wild. Nice.' },
        twist: { Jolly: 'Plot twist! Now the RIGHT answer: the SMALLEST first step.', Cheeky: 'Twist! Now be right. Annoying, I know. Smallest step wins.', Unfiltered: 'Twist. Now get it right. Smallest first step.' },
        decoy: { Jolly: 'Ooh, close! That’s a whole step. Smaller!', Cheeky: 'That’s a staircase, not a step. Smaller!', Unfiltered: 'Too big. Smaller.' },
        tiniest: { Jolly: 'THAT’S the one! Tiny, real, doable.', Cheeky: 'Look at that. Tiny. Suspiciously easy.', Unfiltered: 'Yes. That. Tiny. Doable.' },
        tiny: { Jolly: 'Tiny enough! That’s a real start.', Cheeky: 'Small enough to sneak past your brain. Nice.', Unfiltered: 'Small. Good. That works.' },
        clock: { Jolly: 'Do it now, we’ll hold the show. The audience promises not to stare.', Cheeky: 'Go on, we’ll wait. The audience will pretend to check their phones.', Unfiltered: 'Go do it. We’ll wait right here.' },
        clockMid: { Jolly: 'No rush. Well, I’m Rush. But no rush.', Cheeky: 'Still here. Totally relaxed. Very calm. Ish.', Unfiltered: 'Take your time. Seriously.' },
        overtime: { Jolly: 'Overtime is fine. Take all the time you need.', Cheeky: 'Overtime! Very dramatic. Keep going.', Unfiltered: 'Over two minutes. Doesn’t matter. Keep going.' },
        did: { Jolly: 'YOU DID IT! Starter step: done!', Cheeky: 'Look who actually started. Show-off.', Unfiltered: 'Done. Told you it was tiny.' },
        later: { Jolly: 'Saved for later! It’ll be right here, nice and tiny.', Cheeky: 'Later it is. Tiny steps keep fresh.', Unfiltered: 'Later. Fine. It’s tiny. It’ll keep.' },
        trophy: { Jolly: 'And the trophy goes to… YOU!', Cheeky: 'Your trophy. Try not to let it go to your head.', Unfiltered: 'Trophy. Yours. Earned it.' }
      };

      /* ---------------- state ---------------- */
      const G = { stage: 'intro', round: -1, set: [], active: [], lit: -1, step: STEP, fb: 0, boff: null, cues: 0, hits: 0, meter: 0, excite: 0.3, laugh: 0, cheer: 0, applause: 0,
        cueBeats: [], tickSched: -1, chosen: null, result: '', secs: 0, clockT0: 0, said60: false, saidOver: false, lockResolve: null, clockResolve: null, twist: 0, flash: 0, trophy: null, press: 0, rain: 0, giggle: 0, frozen: true };
      let finished = false;

      /* ---------------- DOM ---------------- */
      /* SOFT: no GPU raster here, so the canvas draws at 1x and half rate; the beat-locked chase (DOM), input and audio stay at full rate */
      const SOFT = softwareGfx(), cvOpt = { maxDpr: SOFT ? 1 : 1.5 }, cv = opaqueCanvas(el, cvOpt, S);
      let accDt = 0, frameN = 0;
      /* adaptive pacing on software raster: if the device is starved (many long frames), draw every third frame instead of every second */
      const PACE = { rate: 2, n: 0, slow: 0, calm: 0 };
      function paceTick(rawDt) {
        if (!SOFT) return;
        PACE.n++; if (rawDt > 0.04) PACE.slow++;
        if (PACE.n >= 60) {
          const r = PACE.slow / PACE.n; PACE.n = 0; PACE.slow = 0;
          if (r > 0.08) { PACE.rate = 3; PACE.calm = 0; } else if (r < 0.02 && ++PACE.calm >= 3) PACE.rate = 2;
        }
      }
      /* adaptive resolution: if this device can't hold ~50 fps, render the canvas at a lower pixel ratio (DOM text stays crisp) */
      const PERF = { n: 0, sum: 0, slow: 0, skip: 20 };
      function perfWatch(dt) {
        if (cvOpt.maxDpr <= 1 || PERF.skip-- > 0 || dt > 0.25) return;
        PERF.n++; PERF.sum += dt; if (dt > 0.026) PERF.slow++;
        if (PERF.n >= 40) {
          const avg = PERF.sum / PERF.n, slow = PERF.slow / PERF.n;
          PERF.n = 0; PERF.sum = 0; PERF.slow = 0;
          if (avg > 0.0185 || slow > 0.06) { cvOpt.maxDpr = cvOpt.maxDpr > 1.25 ? 1.25 : 1; PERF.skip = 10; cv.fit(); }
        }
      }
      const P = K.particles({ max: 700 });
      const ui = h('div', { class: 'wa-ui' });
      const epEl = h('div', { class: 'wa-ep', text: 'Season ' + SEASON + ' · Episode ' + EPISODE + ' · ' + THEME.name });
      const marquee = h('div', { class: 'wa-marquee' }, h('div', { class: 'wa-title', text: 'WRONG ANSWERS ONLY' }), epEl);
      const sign = h('span', { class: 'wa-sign', text: 'APPLAUSE' });
      const leds = h('div', { class: 'wa-leds', 'aria-hidden': 'true' });
      const ledEls = [];
      for (let i = 0; i < 20; i++) { const d = h('i', { style: { '--c': i < 12 ? '#5dff8f' : i < 17 ? '#ffe14d' : '#ff4d5e' } }); ledEls.push(d); leds.append(d); }
      const meter = h('div', { class: 'wa-meter', role: 'meter', 'aria-label': 'Applause', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, sign, leds);
      const host = h('div', { class: 'wa-host' });
      const qRound = h('div', { class: 'wa-round' }), qAsk = h('div', { class: 'wa-ask' }), qTask = h('div', { class: 'wa-task gk-user', text: chip });
      const q = h('div', { class: 'wa-q', 'aria-live': 'polite' }, qRound, qAsk, qTask);
      const board = h('div', { class: 'wa-board', role: 'list', 'aria-label': 'Answers' });
      const chaseEl = h('div', { class: 'wa-chase', 'aria-hidden': 'true' });
      const panels = ['A', 'B', 'C', 'D'].map(L => { const p = h('div', { class: 'wa-panel', role: 'listitem' }, h('span', { class: 'wa-let', text: L }), h('span', { class: 'wa-txt' }), h('span', { class: 'wa-stars' })); board.append(p); return p; });
      const clockHold = h('div', { class: 'wa-hold', text: 'Do it now · we’ll hold the show' });
      const clockStep = h('div', { class: 'wa-step' });
      const clockLed = h('div', { class: 'wa-led', role: 'timer', 'aria-label': 'Studio clock', text: '2:00' });
      const didBtn = K.button('I did it!', () => clockDone('done'));
      const laterBtn = K.button('Save it for later', () => clockDone('later'), { quiet: true });
      const clock = h('div', { class: 'wa-clock', hidden: true }, clockHold, clockStep, clockLed, h('div', { class: 'wa-btns' }, didBtn, laterBtn));
      const buzzer = h('button', { type: 'button', class: 'wa-buzzer', 'aria-label': 'Buzzer: lock the lit answer' }, h('b', { text: 'BUZZ' }));
      const buzzwrap = h('div', { class: 'wa-buzzwrap' }, buzzer);
      ui.append(marquee, meter, host, q, board, clock, buzzwrap);
      const win = h('div', { class: 'wa-win', 'aria-hidden': 'true', text: 'STARTER STEP!' });
      const plaqueTxt = h('span', { class: 'gk-user' });
      const plaque = h('div', { class: 'wa-plaque', role: 'status' }, h('small', { text: 'STARTER STEP' }), plaqueTxt);
      el.append(ui, chaseEl, win, plaque);
      const rush = K.character('rush', { side: 'right', mood: 'happy', x: 14, y: 150, size: K.phone() ? 74 : 100 });
      rush.el.classList.add('wa-rush');
      const music = K.music('playful');
      music.level(0.5);
      let clap = null;

      /* ---------------- beat clock: the music's own scheduler, so lights and ticks land on its beats ---------------- */
      const curBpm = () => music.bpm || TEMPO[0];
      function rawBeat() { const now = A.now() - A.latency(); return music.beat - (music.next - now) * music.bpm / 60; }
      function beatPos() {
        if (A.ctx && music.next > 0) { const mb = rawBeat(); if (G.boff == null) G.boff = Math.round(G.fb - mb); return mb + G.boff; }
        return G.fb;
      }
      const mod = (a, n) => ((a % n) + n) % n;

      /* ---------------- sound design ---------------- */
      const snd = {
        press() { if (!A.ctx) return; A.tone({ type: 'square', freq: 540, to: 380, glide: 0.06, dur: 0.08, vol: 0.045, lp: 2400 }); },
        tick(i, when) { if (!A.ctx) return; A.tone({ when, type: 'triangle', freq: A.note(['E5', 'G5', 'A5', 'C6'][i % 4]), dur: 0.1, vol: 0.06, lp: 3200 }); },
        lock() { if (!A.ctx) return; const t = A.now(); A.tone({ when: t, type: 'square', freq: 880, dur: 0.08, vol: 0.05, lp: 3200 }); A.tone({ when: t + 0.09, type: 'square', freq: 1318, dur: 0.18, vol: 0.05, lp: 3200 }); },
        rimshot() { if (!A.ctx) return; const t = A.now() + 0.12; A.drum(t, 0.28, 1.25); A.drum(t + 0.15, 0.22, 1.5); A.kick(t + 0.32, 0.32); A.noise({ when: t + 0.32, filter: 'highpass', freq: 6500, dur: 0.7, attack: 0.004, vol: 0.07 }); },
        laugh(vol, voices, dur) {
          if (!A.ctx) return;
          G.giggle = Math.max(G.giggle, dur);
          for (let v = 0; v < Math.min(4, voices); v++) {
            const base = 160 + Math.random() * 220, pan = Math.random() * 1.6 - 0.8, rate = 0.13 + Math.random() * 0.04, n = Math.max(3, Math.floor(dur / rate * 0.7));
            K.later(() => { if (!A.ctx) return; const st = A.now() + 0.02; for (let k = 0; k < n; k++) { const f = base * (1 - k * 0.022); A.tone({ when: st + k * rate, type: 'sawtooth', freq: f, to: f * 0.86, glide: 0.08, dur: 0.08, vol: vol * (1 - k / n * 0.6), attack: 0.012, lp: 1300, pan }); } }, v * 70 + Math.random() * 120);
          }
        },
        whistle() { if (!A.ctx) return; const t = A.now() + Math.random() * 0.2; A.tone({ when: t, type: 'sine', freq: 1100, to: 2100, glide: 0.3, dur: 0.42, vol: 0.035, pan: Math.random() - 0.5 }); A.tone({ when: t + 0.45, type: 'sine', freq: 1500, to: 1150, glide: 0.25, dur: 0.3, vol: 0.03 }); },
        drumroll(dur) { if (!A.ctx) return; const t0 = A.now(), n = Math.round(dur * 24); for (let i = 0; i < n; i++) A.noise({ when: t0 + i / 24, filter: 'bandpass', freq: 1700 + Math.random() * 300, q: 0.9, dur: 0.05, vol: 0.025 + 0.08 * i / n }); A.kick(t0 + dur, 0.45); A.noise({ when: t0 + dur, filter: 'highpass', freq: 6000, dur: 0.9, vol: 0.08 }); },
        cannon() { if (!A.ctx) return; A.kick(A.now(), 0.5); A.noise({ filter: 'lowpass', freq: 900, dur: 0.4, vol: 0.2 }); A.noise({ filter: 'highpass', freq: 5000, to: 2500, dur: 0.5, vol: 0.05 }); },
        dingding() { if (!A.ctx) return; const t = A.now(); ['E6', 'G#6', 'B6'].forEach((n, i) => A.chime(A.note(n), { when: t + i * 0.09, vol: 0.07, dur: 1.4 })); }
      };
      function roar(k) { G.applause = Math.min(1.4, G.applause + k); G.excite = Math.min(1, G.excite + k); }

      /* ---------------- layout + the static studio ---------------- */
      const L = { w: 390, h: 844, phone: true, rush: { cx: 50, bottom: 230, sz: 74 }, buzz: { cx: 195, cy: 700, r: 56 }, marq: null, wall: null, aud: [], seq: [] };
      let bgC = null;
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        L.w = w; L.h = H; L.phone = w < 700;
        const hr = K.rectIn(host), sz = L.phone ? 74 : 100;
        rush.el.style.setProperty('--sz', sz + 'px');
        rush.place(Math.round(hr.x + 4), Math.round(hr.y + 2));
        L.rush = { cx: hr.x + 4 + sz / 2, bottom: hr.y + 2 + sz, sz };
        const br = K.rectIn(buzzer); L.buzz = { cx: br.cx, cy: br.cy, r: br.w / 2 };
        L.marq = K.rectIn(marquee);
        const bw = K.rectIn(buzzwrap), colW = Math.min(600, w - 28);
        L.wall = { x: (w - colW) / 2 - 8, y: hr.y + hr.h - 2, w: colW + 16, h: bw.y - (hr.y + hr.h) - 2 };
        const cupH = L.phone ? 1.25 : 1.5;
        L.trophy = { s: cupH, y: H - (L.phone ? 196 : 214) };
        win.style.top = Math.round(hr.y + hr.h + (L.trophy.y - 190 * cupH - (hr.y + hr.h)) * 0.5) + 'px';
        plaque.style.top = Math.round(L.trophy.y + 12 * cupH) + 'px';
        buildAudience(); buildSequins(); buildBg();
        G.drawn = 0;
      }
      function buildAudience() {
        const R = K.rng(41), rows = VISITS >= 3 ? 3 : 2, out = [], base = L.h + 4, sc = L.phone ? 1 : 1.25;
        for (let r = rows - 1; r >= 0; r--) {
          const rad = (10 + r * 2.2) * sc, gap = (VISITS >= 6 ? 36 : 40) * sc, y = base - 26 * sc - r * 13 * sc * -1 - (rows - 1 - r) * 15 * sc;
          for (let x = -10 + (r % 2) * gap * 0.5; x < L.w + 20; x += gap + (R() - 0.5) * 8) out.push({ x, y: y + (R() - 0.5) * 4, r: rad * (0.9 + R() * 0.2), ph: R(), row: r, hair: Math.floor(R() * 4), shade: Math.floor(R() * 3) });
        }
        // fans with signs once you are a regular
        L.signs = [];
        if (VISITS >= 2) { const front = out.filter(a => a.row === 0); if (front.length > 4) { L.signs.push({ a: front[Math.floor(front.length * 0.22)], text: 'GO YOU!' }); if (VISITS >= 5) L.signs.push({ a: front[Math.floor(front.length * 0.78)], text: 'TINY STEPS!' }); } }
        L.aud = out;
      }
      function buildSequins() {
        const R = K.rng(9), s = L.rush.sz / 74, out = [];
        for (let i = 0; i < 26; i++) { const yy = R(), half = 22 + yy * 20; out.push({ x: (R() * 2 - 1) * half * s, y: (3 + yy * 26) * s, ph: R() * 6.28 }); }
        L.seq = out.filter(p => Math.abs(p.x) > 10 * s + p.y * 0.0);
      }
      function poly(g, pts) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); }
      function buildBg() {
        const w = L.w, H = L.h, dpr = cv.dpr || 1;
        if (!w || !H) return;
        if (!bgC) bgC = document.createElement('canvas');
        bgC.width = Math.max(1, Math.round(w * dpr)); bgC.height = Math.max(1, Math.round(H * dpr));
        const g = bgC.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const D = K.dark();
        let gr = g.createLinearGradient(0, 0, 0, H);
        if (D) { gr.addColorStop(0, '#0d0520'); gr.addColorStop(0.42, '#24093e'); gr.addColorStop(1, '#3a0d3a'); }
        else { gr.addColorStop(0, '#3a1a72'); gr.addColorStop(0.42, '#6e2c8e'); gr.addColorStop(1, '#b44784'); }
        g.fillStyle = gr; g.fillRect(0, 0, w, H);
        // back wall: rows of soft studio bulbs
        g.fillStyle = D ? 'rgba(255,220,170,0.07)' : 'rgba(255,240,220,0.12)';
        for (let y = 70; y < H * 0.62; y += 26) for (let x = 13 + ((y / 26) % 2) * 13; x < w; x += 26) { g.beginPath(); g.arc(x, y, 1.6, 0, K.TAU); g.fill(); }
        // velvet curtains with folds
        const cw = Math.max(26, w * 0.1);
        for (const side of [0, 1]) {
          const x0 = side ? w - cw : 0;
          const cg = g.createLinearGradient(x0, 0, x0 + cw, 0);
          for (let k = 0; k <= 6; k++) { const v = 0.55 + 0.45 * Math.sin(k * 2.1 + side); cg.addColorStop(k / 6, `rgb(${Math.round((D ? 120 : 190) * v)},${Math.round((D ? 14 : 30) * v)},${Math.round((D ? 52 : 80) * v)})`); }
          g.fillStyle = cg; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + cw, 0);
          if (side) { g.quadraticCurveTo(x0 - cw * 0.1, H * 0.45, x0 + cw * 0.35, H); g.lineTo(w, H); } else { g.lineTo(x0 + cw, 0); g.quadraticCurveTo(x0 + cw * 1.1, H * 0.45, x0 + cw * 0.65, H); g.lineTo(0, H); }
          g.closePath(); g.fill();
        }
        // valance
        g.fillStyle = D ? '#5a0c2c' : '#a3204f';
        g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, 50);
        for (let x = w; x >= 0; x -= 36) g.quadraticCurveTo(x - 18, 70, x - 36, 50);
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,214,120,0.55)'; g.lineWidth = 2; g.beginPath(); for (let x = w; x >= 0; x -= 36) { g.moveTo(x, 50); g.quadraticCurveTo(x - 18, 70, x - 36, 50); } g.stroke();
        // the answer wall: an LED board frame behind the panels
        const W2 = L.wall;
        if (W2 && W2.h > 40 && !L.noWall) {
          g.save(); g.shadowColor = THEME.a; g.shadowBlur = 22;
          g.fillStyle = D ? 'rgba(8,4,22,0.7)' : 'rgba(30,10,50,0.62)';
          g.beginPath(); g.roundRect ? g.roundRect(W2.x, W2.y, W2.w, W2.h, 20) : g.rect(W2.x, W2.y, W2.w, W2.h); g.fill(); g.restore();
          g.strokeStyle = K.hexA(THEME.a, 0.75); g.lineWidth = 2; g.stroke();
          g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 1; g.beginPath(); g.roundRect ? g.roundRect(W2.x + 5, W2.y + 5, W2.w - 10, W2.h - 10, 15) : g.rect(W2.x + 5, W2.y + 5, W2.w - 10, W2.h - 10); g.stroke();
        }
        // stage floor
        const fy = L.buzz.cy - 10;
        gr = g.createLinearGradient(0, fy, 0, H);
        gr.addColorStop(0, D ? 'rgba(30,8,40,0)' : 'rgba(80,20,70,0)'); gr.addColorStop(0.25, D ? '#1a0626' : '#5a1d55'); gr.addColorStop(1, D ? '#0a0310' : '#2c0c2c');
        g.fillStyle = gr; g.fillRect(0, fy, w, H - fy);
        const pool = g.createRadialGradient(L.buzz.cx, L.buzz.cy + 70, 10, L.buzz.cx, L.buzz.cy + 70, Math.min(w, 520) * 0.55);
        pool.addColorStop(0, K.hexA(THEME.c, 0.22)); pool.addColorStop(1, K.hexA(THEME.c, 0));
        g.fillStyle = pool; g.fillRect(0, fy, w, H - fy);
        // contestant podium
        const pw = L.phone ? 96 : 118, pt = L.buzz.cy + 26, px = L.buzz.cx;
        gr = g.createLinearGradient(px - pw, 0, px + pw, 0);
        gr.addColorStop(0, '#2b1240'); gr.addColorStop(0.5, '#5a2a7a'); gr.addColorStop(1, '#22102f');
        g.fillStyle = gr; poly(g, [[px - pw * 0.82, pt], [px + pw * 0.82, pt], [px + pw, H + 2], [px - pw, H + 2]]); g.fill();
        g.fillStyle = K.hexA(THEME.c, 0.9); g.fillRect(px - pw * 0.84, pt - 4, pw * 1.68, 5);
        // vignette
        const vg = g.createRadialGradient(w / 2, H * 0.45, Math.min(w, H) * 0.3, w / 2, H * 0.5, Math.max(w, H) * 0.8);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, D ? 'rgba(0,0,0,0.55)' : 'rgba(30,0,40,0.35)');
        g.fillStyle = vg; g.fillRect(0, 0, w, H);
      }

      /* ---------------- panels + question ---------------- */
      function setQuestion(round, ask, showTask) { qRound.textContent = round; qAsk.textContent = ask; qTask.hidden = !showTask; }
      function stars(it) {
        if (it.kind === 'wrong') { const n = it.a >= 2.4 ? 3 : it.a >= 1.7 ? 2 : 1; return { s: '★'.repeat(n) + '☆'.repeat(3 - n), l: 'LAUGHS' }; }
        if (it.kind === 'decoy') return { s: '✕', l: 'TOO BIG' };
        return { s: it.size === 0 ? '★★★' : '★★', l: it.size === 0 ? 'TINIEST' : 'TINY' };
      }
      async function revealPanels(set) {
        G.set = set;
        panels.forEach((p, i) => {
          p.className = 'wa-panel';
          p.querySelector('.wa-txt').textContent = K.words(set[i].text, 11);
          const st = stars(set[i]), sEl = p.querySelector('.wa-stars');
          sEl.innerHTML = ''; sEl.append(h('b', { text: st.s }), document.createTextNode(st.l));
        });
        for (let i = 0; i < panels.length; i++) {
          await K.sleep(i ? 210 : 120);
          panels[i].classList.add('in');
          if (A.ctx) A.chime(A.note(['C5', 'E5', 'G5', 'C6'][i]), { vol: 0.06, dur: 0.9 });
        }
        await K.sleep(420);
      }
      async function clearPanels() {
        setLit(-1);
        panels.forEach(p => p.classList.remove('in', 'lit'));
        if (A.ctx) A.whoosh({ vol: 0.08, dur: 0.3 });
        await K.sleep(380);
      }
      /* one glowing frame jumps between panels on the beat (a composited move, no re-painting of glows) */
      function setLit(i) {
        if (i === G.lit) return;
        if (G.lit >= 0) panels[G.lit].classList.remove('lit');
        G.lit = i;
        if (i >= 0) {
          panels[i].classList.add('lit');
          const r = K.rectIn(panels[i]);
          if (chaseEl.__w !== r.w || chaseEl.__h !== r.h) { chaseEl.__w = r.w; chaseEl.__h = r.h; chaseEl.style.width = r.w + 'px'; chaseEl.style.height = r.h + 'px'; }
          chaseEl.style.transform = 'translate3d(' + r.x.toFixed(1) + 'px,' + r.y.toFixed(1) + 'px,0)';
          chaseEl.classList.add('on');
        } else chaseEl.classList.remove('on');
      }
      function setMeter(v) {
        G.meter = K.clamp(v, 0, 100);
        const n = Math.round(G.meter / 5);
        ledEls.forEach((d, i) => d.classList.toggle('on', i < n));
        meter.setAttribute('aria-valuenow', String(Math.round(G.meter)));
      }

      /* ---------------- the buzzer ---------------- */
      let lastBuzz = 0;
      function buzz() {
        const now = performance.now(); if (now - lastBuzz < 110) return; lastBuzz = now;
        if (G.stage === 'end' || G.stage === 'clock') return;
        K.sfx.tap(); snd.press();
        buzzer.classList.add('down'); K.later(() => buzzer.classList.remove('down'), 110);
        G.press = 1;
        P.emit('spark', L.buzz.cx, L.buzz.cy - L.buzz.r * 0.6, 8, { colors: [THEME.c, '#ffffff', THEME.a], angle: -Math.PI / 2, spread: 1.6, speed: [80, 220] });
        if (G.stage === 'chase') lockLit();
        else if (G.stage === 'pump') pumpHit();
      }
      K.tap(buzzer, () => buzz());
      K.onKey(['Space'], (e) => { if (document.activeElement !== buzzer) { e.preventDefault(); buzz(); } });

      function lockLit() {
        const i = G.lit; if (i < 0) return;
        const bp = beatPos(), iv = 60 / curBpm(), f = mod(bp / G.step, 1), after = f * G.step * iv, before = (1 - f) * G.step * iv;
        const onBeat = after < 0.14 || before < 0.07;
        G.stage = 'locked';
        chaseEl.classList.remove('on');
        snd.lock();
        panels[i].classList.remove('lit'); panels[i].classList.add('locked', 'show');
        const r = K.rectIn(panels[i]);
        P.emit('star', r.cx, r.cy, 14, { colors: [THEME.c, '#ffffff'], speed: [80, 240] });
        if (onBeat) K.pop('ON THE BEAT!', { x: r.cx, y: r.y - 6, kind: 'great' });
        ctx.track('lock', { round: G.round, onBeat: onBeat ? 1 : 0 });
        if (G.lockResolve) { const res = G.lockResolve; G.lockResolve = null; res({ i, onBeat }); }
      }
      const waitLock = () => new Promise(res => { G.lockResolve = res; });

      /* ---------------- rounds ---------------- */
      function hostSay(key, mood, ms) { rush.say(line(LN[key]), { mood, moodMs: 1800, ms }); }
      function chase(guideId, label) {
        G.stage = 'chase'; G.tickSched = -1;
        K.guide({ id: guideId, g: 'tap', target: buzzer, label, delay: 1100 });
      }
      async function wrongRound(r) {
        G.round = r; G.stage = 'reveal'; setLit(-1);
        music.tempo(TEMPO[r]); music.level(0.5);
        setQuestion('Round ' + (r + 1) + ' · Wrong answers only', askWrong, true);
        const R = K.rng((K.daily() * 31 + VISITS * 7 + r * 101) >>> 0);
        const idx = r === 0 ? [0, 2, 5, 7] : [1, 3, 4, 6];
        await revealPanels(K.shuffle(idx.map(k => ({ text: CONTENT.wrong[k], a: 1 + 2 * k / 7, kind: 'wrong' })), R));
        hostSay(r === 0 ? 'r1' : 'r2', r === 0 ? 'wink' : 'silly');
        G.active = [0, 1, 2, 3];
        chase('lock' + r, 'BUZZ TO LOCK IT');
        const pick = await waitLock();
        K.guide(null);
        const it = G.set[pick.i];
        panels.forEach((p, k) => { if (k !== pick.i) p.classList.add('dim', 'show'); });
        snd.rimshot();
        K.later(() => { snd.laugh(0.035 + 0.012 * it.a, 3 + Math.round(it.a * 1.5), 1 + it.a * 0.35); G.laugh = 0.8 + it.a * 0.25; roar(0.35 + it.a * 0.2); if (it.a >= 2.4) snd.whistle(); }, 380);
        setMeter(G.meter + 6 + it.a * 4 + (pick.onBeat ? 3 : 0));
        rush.react(it.a >= 2.4 ? 'spin' : 'bounce');
        hostSay(it.a >= 2.4 ? 'big' : it.a >= 1.7 ? 'mid' : 'small', it.a >= 2.4 ? 'laugh' : 'happy');
        await K.sleep(1700);
        await pump(r);
        await clearPanels();
      }
      async function pump(r) {
        hostSay('pump', 'celebrate');
        const first = Math.floor(beatPos()) + 2;
        G.cueBeats = [0, 1, 2, 3].map(k => ({ b: first + k, hit: false }));
        G.cues += 4; G.stage = 'pump';
        K.guide({ id: 'pump' + r, g: 'tap', target: buzzer, label: 'BUZZ ON THE BEAT', delay: 150, ms: Math.round(60000 / curBpm()) });
        while (beatPos() < first + 3.6) await K.wait(30);
        G.stage = 'post'; sign.classList.remove('on');
        K.guide(null);
        const got = G.cueBeats.filter(c => c.good).length;
        if (got >= 3) { hostSay('pumpGood', 'cool'); snd.whistle(); }
        await K.sleep(500);
      }
      let lastPop = null;
      function popOnce(text, o) { if (lastPop) lastPop.remove(); lastPop = K.pop(text, o); }
      function pumpHit() {
        const bp = beatPos(), iv = 60 / curBpm();
        let best = null, bd = 9;
        G.cueBeats.forEach(c => { if (c.hit) return; const d = Math.abs(bp - c.b); if (d < bd) { bd = d; best = c; } });
        if (!best || bd > 0.55) return;
        const dt = bd * iv, perfect = [0.11, 0.09, 0.075][inten] + iv * 0.04, good = [0.21, 0.17, 0.14][inten] + iv * 0.05;
        best.hit = true;
        const x = L.buzz.cx, y = L.buzz.cy - L.buzz.r - 26;
        if (dt <= good) {
          best.good = true; G.hits++;
          const pf = dt <= perfect;
          popOnce(pf ? 'PERFECT!' : 'GOOD!', { x, y, kind: pf ? 'great' : 'good' });
          P.emit('confetti', x, L.buzz.cy - L.buzz.r, pf ? 26 : 16, { angle: -Math.PI / 2, spread: 1.3, speed: [260, 520], colors: CONF });
          roar(pf ? 0.6 : 0.4); setMeter(G.meter + (pf ? 4 : 3));
          if (A.ctx) A.chime(A.note(['C6', 'D6', 'E6', 'G6'][Math.min(3, G.cueBeats.indexOf(best))]), { vol: 0.07, dur: 0.8 });
          if (pf && Math.random() < 0.5) snd.whistle();
        } else {
          popOnce('CLOSE!', { x, y, kind: 'soft' });
          roar(0.15); setMeter(G.meter + 1);
        }
      }
      async function tinyRound() {
        G.round = 2; G.stage = 'twist'; setLit(-1);
        G.twist = 1; G.flash = 1;
        music.level(0.22);
        snd.drumroll(1.5);
        setQuestion('Round 3 · The twist', 'Now the RIGHT answer: the SMALLEST first step.', true);
        hostSay('twist', 'wow', 4200);
        rush.react('glitch');
        await K.sleep(1800);
        music.tempo(TEMPO[2]); music.level(0.4);
        const R = K.rng((K.daily() * 17 + VISITS * 3) >>> 0);
        const set = K.shuffle(CONTENT.tiny.slice(0, 3).map((t, i) => ({ text: t, size: i, kind: 'tiny' })).concat([{ text: CONTENT.decoy, size: 9, kind: 'decoy' }]), R);
        await revealPanels(set);
        G.active = [0, 1, 2, 3];
        chase('tiny', 'BUZZ THE TINIEST');
        for (;;) {
          const pick = await waitLock();
          const it = G.set[pick.i];
          if (it.kind === 'decoy') {
            K.sfx.no();
            panels[pick.i].classList.remove('locked'); panels[pick.i].classList.add('out', 'show');
            hostSay('decoy', 'think'); rush.react('shake');
            G.active = G.active.filter(x => x !== pick.i); setLit(-1);
            await K.sleep(700);
            chase('tiny2', 'SMALLER! BUZZ AGAIN');
            continue;
          }
          G.chosen = it;
          K.guide(null);
          panels.forEach((p, k) => { if (k !== pick.i) p.classList.add('dim'); });
          snd.dingding(); K.sfx.great();
          roar(0.7); G.cheer = 1.4; setMeter(G.meter + (it.size === 0 ? 14 : 10));
          hostSay(it.size === 0 ? 'tiniest' : 'tiny', 'celebrate');
          rush.react('bounce');
          const r = K.rectIn(panels[pick.i]);
          P.emit('confetti', r.cx, r.cy, 40, { colors: CONF, speed: [200, 420] });
          await K.sleep(2000);
          break;
        }
      }
      async function clockPhase() {
        q.classList.add('wa-gone'); board.classList.add('wa-gone'); buzzwrap.classList.add('wa-gone');
        await K.sleep(380);
        q.hidden = true; board.hidden = true;
        clockStep.textContent = G.chosen.text;
        clock.hidden = false;
        G.stage = 'clock'; G.clockT0 = performance.now();
        G.twist = 0; G.excite = 0.08;
        music.level(0.14); music.tempo(84);
        hostSay('clock', 'calm', 6000);
        K.guide({ id: 'did', g: 'choose', target: [didBtn, laterBtn], label: 'TAP WHEN YOU’RE DONE', delay: 2600 });
        const res = await new Promise(r => { G.clockResolve = r; });
        G.result = res; G.secs = Math.round((performance.now() - G.clockT0) / 1000);
      }
      function clockDone(kind) {
        if (G.stage !== 'clock' || !G.clockResolve) return;
        K.sfx.ok();
        const r = G.clockResolve; G.clockResolve = null; r(kind);
      }

      /* ---------------- finale ---------------- */
      function cannon(side) {
        const x = side < 0 ? 8 : L.w - 8, y = L.h - 70;
        P.emit('confetti', x, y, 55, { angle: side < 0 ? -Math.PI * 0.3 : -Math.PI * 0.7, spread: 0.55, speed: [430, 780], colors: CONF });
        P.emit('spark', x, y, 10, { angle: side < 0 ? -Math.PI * 0.3 : -Math.PI * 0.7, spread: 0.7, speed: [200, 420], colors: ['#ffffff', THEME.c] });
        snd.cannon();
      }
      async function finale() {
        G.stage = 'end';
        K.guide(null);
        clock.classList.add('wa-gone');
        music.level(0.55); music.tempo(TEMPO[1] + 6);
        setMeter(100); sign.classList.add('on');
        plaqueTxt.textContent = G.chosen.text;
        L.noWall = true; buildBg();
        G.trophy = { k: 0 }; G.cheer = 3; roar(1.2);
        snd.dingding();
        hostSay(G.result === 'done' ? 'did' : 'later', 'celebrate', 3000);
        rush.react('bounce');
        [0, 280, 620, 1100].forEach((d, i) => K.later(() => cannon(i % 2 ? 1 : -1), d));
        K.later(() => { snd.laugh(0.03, 4, 1.2); snd.whistle(); snd.whistle(); }, 300);
        await K.sleep(1300);
        win.classList.add('on'); plaque.classList.add('on');
        epEl.textContent = 'Next time · Episode ' + (EPISODE === 6 ? 1 : EPISODE + 1) + (EPISODE === 6 ? ' of Season ' + (SEASON + 1) : '');
        K.sfx.great();
        K.later(() => hostSay('trophy', 'love', 0), 1400);
        // mastery: steady timing when cueing the crowd (a calm, rhythmic skill)
        const cues = Math.max(1, G.cues), pct = G.hits / cues;
        const tier = K.tier(pct, [0.35, 0.6, 0.85]);
        const best = K.best('beat', Math.round(pct * 100), 'higher');
        const col = K.collect(THEME.prize);
        const badges = [tier ? tier + ' timing' : 'Show contestant', best.isNew ? 'New best: ' + G.hits + '/' + cues + ' on the beat' : null, col.isNew ? 'Collected: ' + THEME.prize : null,
          G.result === 'done' ? 'Started in under 2 min' : 'Step saved for later'].filter(Boolean).slice(0, 4);
        ctx.track('show_end', { result: G.result, secs: G.secs, hits: G.hits, cues, source: CONTENT.source === 'ai' ? 1 : 0 });
        if (A.ctx) { A.pad(['C4', 'E4', 'G4', 'C5'].map(n => A.note(n)), { dur: 5, vol: 0.16, attack: 0.6 }); A.sync('finale', performance.now()); }
        G.rain = 2.6;
        await K.sleep(3800);
        finished = true;
        ctx.finish({
          title: G.result === 'done' ? 'You started!' : 'Starter step saved', mood: 'celebrate',
          lines: ['Starter step: ' + G.chosen.text, G.result === 'done' ? (G.secs <= 120 ? 'Done in under 2 minutes' : 'Done. Started is started.') : 'Saved for later', G.hits + '/' + cues + ' applause cues on the beat'],
          badges,
          share: 'Won the STARTER STEP trophy on Wrong Answers Only.'
        });
      }

      /* ---------------- render ---------------- */
      function drawSpots(g, bp, t) {
        const D = K.dark(), w = L.w, H = L.h, sway = SOFT ? 0.08 : Math.sin(bp * Math.PI / 2) * (K.reduced() ? 0.05 : 0.22);
        const end = G.stage === 'end', twist = G.twist;
        const tx = end ? w / 2 : null, ty = end ? L.trophy.y - 120 : null;
        const spots = [[w * 0.06, 54, THEME.a, 0.6 + sway], [w * 0.94, 54, THEME.b, Math.PI - 0.6 - sway], [w * 0.5, 40, THEME.c, Math.PI / 2 + sway * 0.6]];
        g.save(); g.globalCompositeOperation = D ? 'lighter' : 'source-over';
        spots.forEach(([x, y, col, ang], i) => {
          if (twist > 0.5 && i !== 2) return;
          const a = end ? Math.atan2(ty - y, tx - x) + Math.sin(t * 2 + i) * 0.08 : ang, len = H * 1.05, sp = twist > 0.5 ? 0.12 : 0.17;
          const gr = g.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
          gr.addColorStop(0, K.hexA(col, D ? 0.32 : 0.22)); gr.addColorStop(1, K.hexA(col, 0));
          g.fillStyle = gr; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a - sp) * len, y + Math.sin(a - sp) * len); g.lineTo(x + Math.cos(a + sp) * len, y + Math.sin(a + sp) * len); g.closePath(); g.fill();
        });
        g.restore();
      }
      function drawBulbs(g, bp) {
        const m = L.marq; if (!m) return;
        const pad = 7, x0 = m.x - pad, y0 = m.y - pad, x1 = m.x + m.w + pad, y1 = m.y + m.h + pad, sp = 15;
        const pts = [];
        for (let x = x0; x <= x1; x += sp) pts.push([x, y0]);
        for (let y = y0 + sp; y <= y1; y += sp) pts.push([x1, y]);
        for (let x = x1 - sp; x >= x0; x -= sp) pts.push([x, y1]);
        for (let y = y1 - sp; y > y0; y -= sp) pts.push([x0, y]);
        const ph = Math.floor(bp * 2), end = G.stage === 'end';
        g.fillStyle = 'rgba(60,30,10,0.9)';
        pts.forEach(p => { g.beginPath(); g.arc(p[0], p[1], 3.2, 0, K.TAU); g.fill(); });
        pts.forEach((p, i) => {
          const on = end ? (i + ph) % 2 === 0 : (i + ph) % 3 === 0;
          g.fillStyle = on ? '#fff3c4' : 'rgba(255,200,120,0.35)';
          g.beginPath(); g.arc(p[0], p[1], on ? 2.6 : 1.8, 0, K.TAU); g.fill();
          if (on) { g.fillStyle = K.hexA(THEME.c, 0.28); g.beginPath(); g.arc(p[0], p[1], 6, 0, K.TAU); g.fill(); }
        });
      }
      function drawJacket(g, t) {
        const R = L.rush, s = R.sz / 74, x = R.cx, y = R.bottom - 3 * s;
        g.save();
        const gr = g.createLinearGradient(x - 44 * s, y, x + 44 * s, y + 30 * s);
        gr.addColorStop(0, K.hexA(THEME.a, 1)); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(0.55, K.hexA(THEME.a, 1)); gr.addColorStop(1, '#3a0a3a');
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(x - 20 * s, y); g.quadraticCurveTo(x - 40 * s, y + 2 * s, x - 44 * s, y + 30 * s); g.lineTo(x + 44 * s, y + 30 * s); g.quadraticCurveTo(x + 40 * s, y + 2 * s, x + 20 * s, y); g.closePath(); g.fill();
        g.fillStyle = '#ffffff'; poly(g, [[x - 11 * s, y], [x + 11 * s, y], [x, y + 24 * s]]); g.fill();
        g.fillStyle = '#1a0a1e'; poly(g, [[x - 11 * s, y], [x - 20 * s, y], [x - 4 * s, y + 30 * s], [x - 2 * s, y + 24 * s]]); g.fill();
        poly(g, [[x + 11 * s, y], [x + 20 * s, y], [x + 4 * s, y + 30 * s], [x + 2 * s, y + 24 * s]]); g.fill();
        g.fillStyle = THEME.b; poly(g, [[x, y + 5 * s], [x - 10 * s, y + 1 * s], [x - 10 * s, y + 10 * s]]); g.fill(); poly(g, [[x, y + 5 * s], [x + 10 * s, y + 1 * s], [x + 10 * s, y + 10 * s]]); g.fill();
        g.beginPath(); g.arc(x, y + 5.5 * s, 2.6 * s, 0, K.TAU); g.fill();
        L.seq.forEach((p, i) => { const tw = Math.pow(Math.max(0, Math.sin(t * 2.6 + p.ph + i)), 10); if (tw < 0.05) return; g.fillStyle = `rgba(255,255,255,${tw.toFixed(2)})`; K.starPath(g, x + p.x, y + p.y, 3.2 * s * tw + 0.8, 0.8, 4, 0); g.fill(); });
        // hand mic
        g.strokeStyle = '#2a2a33'; g.lineWidth = 3.4 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + 46 * s, y + 26 * s); g.lineTo(x + 54 * s, y + 8 * s); g.stroke();
        g.fillStyle = '#5c5f70'; g.beginPath(); g.arc(x + 55 * s, y + 5 * s, 5.4 * s, 0, K.TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(x + 53.5 * s, y + 3.5 * s, 1.8 * s, 0, K.TAU); g.fill();
        g.restore();
      }
      function drawAudience(g, bp, t) {
        const D = K.dark(), up = G.cheer > 0, jig = G.laugh > 0 && !K.reduced();
        const cols = D ? ['#07020c', '#0c0414', '#120619'] : ['#2a0c2a', '#341035', '#3f1440'];
        let row = -1;
        for (const a of L.aud) {
          if (a.row !== row) { row = a.row; }
          const amp = a.r * (0.12 + 0.55 * G.excite) * (K.reduced() ? 0.3 : 1);
          const bob = -Math.abs(Math.sin(Math.PI * (bp + a.ph))) * amp + (jig ? Math.sin(t * 28 + a.ph * 9) * a.r * 0.08 * G.laugh : 0);
          const x = a.x, y = a.y + bob, r = a.r;
          g.fillStyle = cols[a.shade];
          if (up) {
            const wave = Math.sin(t * 7 + a.ph * 6) * r * 0.35;
            g.strokeStyle = cols[a.shade]; g.lineWidth = r * 0.5; g.lineCap = 'round';
            g.beginPath(); g.moveTo(x - r * 1.1, y + r * 1.5); g.lineTo(x - r * 1.6 + wave, y - r * 1.3); g.moveTo(x + r * 1.1, y + r * 1.5); g.lineTo(x + r * 1.6 + wave, y - r * 1.3); g.stroke();
          }
          g.beginPath(); g.ellipse(x, y + r * 2.1, r * 1.75, r * 1.3, 0, Math.PI, 0); g.fill();
          g.beginPath(); g.arc(x, y, r, 0, K.TAU); g.fill();
          if (a.hair === 1) { g.beginPath(); g.arc(x, y - r * 0.95, r * 0.45, 0, K.TAU); g.fill(); }
          else if (a.hair === 2) { g.beginPath(); g.ellipse(x, y - r * 0.3, r * 1.15, r * 0.8, 0, Math.PI, 0); g.fill(); }
          g.strokeStyle = K.hexA(THEME.a, D ? 0.45 : 0.6); g.lineWidth = 1.4; g.beginPath(); g.arc(x, y, r, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
        }
        (L.signs || []).forEach((sg, i) => {
          const a = sg.a, bob = -Math.abs(Math.sin(Math.PI * (bp + a.ph))) * a.r * 0.4, x = K.clamp(a.x, 44, L.w - 44), y = a.y + bob - a.r * 3.6;
          g.save(); g.translate(x, y); g.rotate((i ? 0.08 : -0.08) + Math.sin(t * 3 + i) * 0.05);
          g.fillStyle = '#fffaf0'; g.fillRect(-34, -13, 68, 26); g.strokeStyle = THEME.a; g.lineWidth = 2; g.strokeRect(-34, -13, 68, 26);
          g.fillStyle = '#2a0c2a'; g.font = '800 12px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sg.text, 0, 1);
          g.restore();
          g.strokeStyle = '#07020c'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y + 13); g.lineTo(a.x, a.y + bob); g.stroke();
        });
      }
      function drawBuzzerFx(g, bp) {
        const b = L.buzz, f = mod(bp, 1), pulse = Math.pow(1 - f, 3);
        const gl = g.createRadialGradient(b.cx, b.cy, b.r * 0.6, b.cx, b.cy, b.r * 1.9);
        gl.addColorStop(0, `rgba(255,70,80,${(0.22 + 0.3 * pulse + 0.3 * G.press).toFixed(3)})`); gl.addColorStop(1, 'rgba(255,70,80,0)');
        g.fillStyle = gl; g.fillRect(b.cx - b.r * 2, b.cy - b.r * 2, b.r * 4, b.r * 4);
        // podium bulbs chase on eighth notes
        const pw = L.phone ? 96 : 118, pt = b.cy + 26, n = 9, ph = Math.floor(bp * 2);
        for (let i = 0; i < n; i++) { const x = b.cx - pw * 0.78 + (pw * 1.56) * i / (n - 1), on = (i + ph) % 2 === 0; g.fillStyle = on ? '#fff3c4' : 'rgba(255,210,140,0.35)'; g.beginPath(); g.arc(x, pt + 12, on ? 3 : 2, 0, K.TAU); g.fill(); }
        // approach rings: a cue shrinks onto the buzzer exactly on its beat
        if (G.stage === 'pump') {
          G.cueBeats.forEach(c => {
            const k = c.b - bp; if (c.hit || k > 1.05 || k < -0.25) return;
            const rr = b.r * (1.05 + Math.max(0, k) * 1.4), al = k < 0 ? Math.max(0, 1 + k * 4) : Math.min(1, (1.05 - k) * 2.5);
            g.strokeStyle = K.hexA(THEME.c, 0.9 * al); g.lineWidth = 4; g.beginPath(); g.arc(b.cx, b.cy, rr, 0, K.TAU); g.stroke();
            g.strokeStyle = `rgba(255,255,255,${(0.5 * al).toFixed(3)})`; g.lineWidth = 1.5; g.stroke();
          });
        }
      }
      function drawTrophy(g, dt, t) {
        const T = G.trophy; if (!T) return;
        T.k = Math.min(1, T.k + dt / 1.4);
        const e = K.reduced() ? 1 : K.ease.outBack(T.k), s = L.trophy.s, cx = L.w / 2;
        const by = K.lerp(L.h + 260 * s, L.trophy.y, e), rimY = by - 150 * s, botY = by - 62 * s;
        // rays and glow
        g.save(); g.globalCompositeOperation = K.dark() ? 'lighter' : 'source-over';
        const gy = by - 110 * s;
        for (let i = 0; i < 12; i++) { const a = t * 0.25 + i * K.TAU / 12, l = 230 * s; g.fillStyle = K.hexA(THEME.c, 0.07); g.beginPath(); g.moveTo(cx, gy); g.lineTo(cx + Math.cos(a - 0.09) * l, gy + Math.sin(a - 0.09) * l); g.lineTo(cx + Math.cos(a + 0.09) * l, gy + Math.sin(a + 0.09) * l); g.closePath(); g.fill(); }
        const gl = g.createRadialGradient(cx, gy, 8, cx, gy, 150 * s);
        gl.addColorStop(0, 'rgba(255,215,110,0.5)'); gl.addColorStop(1, 'rgba(255,215,110,0)');
        g.fillStyle = gl; g.fillRect(cx - 150 * s, gy - 150 * s, 300 * s, 300 * s);
        g.restore();
        // riser (the plaque sits on its front)
        let gr = g.createLinearGradient(cx - 112 * s, 0, cx + 112 * s, 0);
        gr.addColorStop(0, '#2a1240'); gr.addColorStop(0.5, '#4d2368'); gr.addColorStop(1, '#22102f');
        g.fillStyle = gr; g.fillRect(cx - 112 * s, by, 224 * s, 90 * s);
        g.fillStyle = THEME.c; g.fillRect(cx - 116 * s, by - 3, 232 * s, 6);
        // past trophies from earlier visits line the riser
        const past = Math.min(VISITS, L.phone ? 2 : 4);
        for (let i = 0; i < past; i++) { const side = i % 2 ? 1 : -1, k = Math.floor(i / 2); miniCup(g, cx + side * (88 + k * 30) * s, by - 2, 0.26 * s, i); }
        // base
        g.fillStyle = '#26160a'; g.fillRect(cx - 50 * s, by - 20 * s, 100 * s, 20 * s);
        g.fillStyle = '#3a2410'; g.fillRect(cx - 38 * s, by - 32 * s, 76 * s, 13 * s);
        g.fillStyle = THEME.c; g.fillRect(cx - 50 * s, by - 21 * s, 100 * s, 2.5 * s);
        // stem + cup in gold
        gr = g.createLinearGradient(cx - 60 * s, 0, cx + 60 * s, 0);
        gr.addColorStop(0, '#9c5d14'); gr.addColorStop(0.3, '#ffe7a0'); gr.addColorStop(0.55, '#f2b33a'); gr.addColorStop(1, '#a8661a');
        g.fillStyle = gr;
        poly(g, [[cx - 12 * s, by - 32 * s], [cx + 12 * s, by - 32 * s], [cx + 6 * s, botY], [cx - 6 * s, botY]]); g.fill();
        g.beginPath(); g.ellipse(cx, botY + 4 * s, 14 * s, 5 * s, 0, 0, K.TAU); g.fill();
        g.beginPath(); g.moveTo(cx - 56 * s, rimY); g.bezierCurveTo(cx - 56 * s, rimY + 62 * s, cx - 22 * s, botY, cx, botY); g.bezierCurveTo(cx + 22 * s, botY, cx + 56 * s, rimY + 62 * s, cx + 56 * s, rimY); g.closePath(); g.fill();
        g.strokeStyle = gr; g.lineWidth = 8 * s;
        g.beginPath(); g.arc(cx - 56 * s, rimY + 30 * s, 20 * s, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
        g.beginPath(); g.arc(cx + 56 * s, rimY + 30 * s, 20 * s, -Math.PI * 0.5, Math.PI * 0.5); g.stroke();
        g.fillStyle = '#fff1c4'; g.beginPath(); g.ellipse(cx, rimY, 56 * s, 9 * s, 0, 0, K.TAU); g.fill();
        g.fillStyle = '#c9861f'; g.beginPath(); g.ellipse(cx, rimY + 1.5 * s, 49 * s, 6 * s, 0, 0, K.TAU); g.fill();
        g.fillStyle = '#fffbe8'; K.starPath(g, cx, rimY + 40 * s, 17 * s, 7 * s, 5, 0); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(cx - 32 * s, rimY + 30 * s, 6 * s, 22 * s, 0.25, 0, K.TAU); g.fill();
        // sparkles
        for (let i = 0; i < 5; i++) { const tw = Math.pow(Math.max(0, Math.sin(t * 2.2 + i * 1.7)), 6); if (tw < 0.05) continue; g.fillStyle = `rgba(255,255,240,${tw.toFixed(2)})`; K.starPath(g, cx + Math.cos(i * 2.4) * 70 * s, rimY + 20 * s + Math.sin(i * 1.9) * 50 * s, 9 * s * tw, 2, 4, 0); g.fill(); }
      }
      function miniCup(g, x, y, s, i) {
        const col = i % 3 === 0 ? ['#7a7f90', '#eef1f8', '#a9afc0'] : i % 3 === 1 ? ['#8a4f1c', '#f3c08a', '#b8732f'] : ['#9c5d14', '#ffe7a0', '#d99a2b'];
        const gr = g.createLinearGradient(x - 60 * s, 0, x + 60 * s, 0); gr.addColorStop(0, col[0]); gr.addColorStop(0.35, col[1]); gr.addColorStop(1, col[2]);
        g.fillStyle = '#26160a'; g.fillRect(x - 40 * s, y - 24 * s, 80 * s, 24 * s);
        g.fillStyle = gr; g.fillRect(x - 9 * s, y - 70 * s, 18 * s, 48 * s);
        g.beginPath(); g.moveTo(x - 50 * s, y - 150 * s); g.bezierCurveTo(x - 50 * s, y - 90 * s, x - 20 * s, y - 66 * s, x, y - 66 * s); g.bezierCurveTo(x + 20 * s, y - 66 * s, x + 50 * s, y - 90 * s, x + 50 * s, y - 150 * s); g.closePath(); g.fill();
      }

      let lastLed = '';
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !bgC) return;
        perfWatch(dt);
        G.fb += dt * curBpm() / 60;
        const bp = beatPos();
        // chase: the light hops one panel per step, in time with the music
        if (G.stage === 'chase' && G.active.length) {
          const pos = Math.floor(bp / G.step);
          setLit(G.active[mod(pos, G.active.length)]);
          if (A.ctx && music.next > 0) {
            const spb = 60 / music.bpm, rb = rawBeat(), nb = (Math.floor((rb) / G.step) + 1) * G.step, tB = music.next - (music.beat - nb) * spb;
            if (nb !== G.tickSched && tB - A.now() < 0.12) { G.tickSched = nb; snd.tick(mod(Math.round(nb / G.step) + (G.boff || 0), 4), Math.max(A.now(), tB)); }
          }
        }
        if (G.stage === 'pump') sign.classList.toggle('on', K.reduced() || mod(bp, 1) < 0.5);
        // crowd energy
        G.excite += ((G.stage === 'clock' ? 0.08 : 0.3) - G.excite) * Math.min(1, dt * 0.8);
        G.applause = Math.max(0, G.applause - dt * 0.45); G.laugh = Math.max(0, G.laugh - dt * 0.6); G.cheer = Math.max(0, G.cheer - dt * 0.7);
        G.press = Math.max(0, G.press - dt * 5); G.flash = Math.max(0, G.flash - dt * 1.5);
        if (G.rain > 0) { G.rain -= dt; if (Math.random() < 0.7) P.emit('confetti', Math.random() * L.w, -10, 3, { angle: Math.PI / 2, spread: 0.8, speed: [60, 200], colors: CONF }); }
        if (!clap && A.ctx) { clap = A.loop({ filter: 'bandpass', freq: 2300, q: 0.6 }); S.onDestroy(() => { if (clap) clap.stop(); }); }
        G.giggle = Math.max(0, G.giggle - dt);
        if (clap) clap.level(Math.max(0.0001, Math.min(1, G.applause) * 0.075 * (0.5 + 0.5 * Math.random()) + (G.giggle > 0 ? 0.03 * Math.max(0, Math.sin(t * 34)) * Math.min(1, G.giggle) : 0)), 0.012);
        // studio clock
        if (G.stage === 'clock') {
          const el2 = (performance.now() - G.clockT0) / 1000, rem = Math.max(0, 120 - el2);
          const txt = rem > 0 ? Math.floor(rem / 60) + ':' + String(Math.ceil(rem % 60) === 60 ? 0 : Math.ceil(rem % 60)).padStart(2, '0') : '0:00';
          if (txt !== lastLed) { lastLed = txt; clockLed.textContent = rem > 0 && Math.ceil(rem) === 120 ? '2:00' : txt; }
          if (!G.said60 && el2 > 60) { G.said60 = true; hostSay('clockMid', 'calm', 4000); }
          if (!G.saidOver && rem <= 0) { G.saidOver = true; clockLed.classList.add('calm'); clockHold.textContent = 'Overtime is fine · take your time'; hostSay('overtime', 'calm', 5000); }
        }
        // draw (held still under the intro card, whose blurred backdrop would otherwise re-render every frame)
        if (G.frozen && G.drawn > 1) return;
        accDt += dt; paceTick(dt);
        if (SOFT && (++frameN % PACE.rate) && G.drawn > 2) return;
        if (SOFT && G.drawn > 2) {
          // software raster: redraw only when something visible changed (moving particles and rings draw every other frame)
          const busy = P.count() > 0 || G.stage === 'pump' || (G.trophy && G.trophy.k < 1) || G.flash > 0 || G.press > 0 || G.cheer > 0 || G.laugh > 0;
          const key = busy ? '' : Math.floor(bp * 4) + ':' + G.stage + ':' + G.twist + ':' + (L.noWall ? 1 : 0);
          if (key && key === G.vkey) return;
          G.vkey = key;
        }
        dt = Math.min(0.1, accDt); accDt = 0;
        G.drawn = (G.drawn || 0) + 1;
        g.drawImage(bgC, 0, 0, L.w, L.h);
        drawSpots(g, bp, t);
        if (G.twist > 0.5) { g.fillStyle = 'rgba(4,0,12,0.35)'; g.fillRect(0, 0, L.w, L.h); }
        drawBulbs(g, bp);
        drawJacket(g, t);
        if (G.stage !== 'end' && G.stage !== 'clock') drawBuzzerFx(g, bp);
        drawTrophy(g, dt, t);
        drawAudience(g, bp, t);
        P.update(dt); P.draw(g);
        if (G.flash > 0 && !K.reduced()) { g.fillStyle = `rgba(255,255,255,${(G.flash * 0.18).toFixed(3)})`; g.fillRect(0, 0, L.w, L.h); }
      });

      /* ---------------- start ---------------- */
      cv.onResize(() => layout());
      S.on('theme', () => buildBg());
      S.later(layout, 60);
      (async () => {
        await K.intro({ title: 'Wrong Answers Only', sub: 'The game show where the WORST first step wins. Then one tiny real step takes the trophy.', how: 'Buzz to lock the answer the light is on.', char: 'rush', mood: 'laugh' });
        G.frozen = false; layout();
        hostSay(VISITS ? 'back' : 'welcome', 'laugh', 3600);
        roar(0.5); snd.whistle();
        await Promise.race([aiP.then(adopt), K.wait(1800)]);
        await K.sleep(900);
        await wrongRound(0);
        await wrongRound(1);
        await tinyRound();
        await clockPhase();
        await finale();
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = performance.now(); while (!fn() && performance.now() - t0 < (ms || 60000)) await K.wait(25); };
          const lockOn = async (i) => { await until(() => G.stage === 'chase' && G.lit === i); await K.wait(35); if (G.stage === 'chase' && G.lit === i) await K.sim.tap(buzzer); };
          for (let r = 0; r < 2; r++) {
            await until(() => G.stage === 'chase' && G.round === r);
            const want = G.set.reduce((bi, it, i) => (it.a > G.set[bi].a ? i : bi), 0);
            while (G.stage === 'chase') await lockOn(want);
            await until(() => G.stage === 'pump');
            for (let k = 0; k < 4 && G.stage === 'pump'; k++) {
              const c = G.cueBeats[k], ms = (c.b - beatPos()) * 60000 / curBpm();
              if (ms > 15) await K.wait(ms - 12);
              if (G.stage === 'pump') await K.sim.tap(buzzer);
            }
          }
          await until(() => G.stage === 'chase' && G.round === 2);
          if (inten > 0) { const d = G.set.findIndex(x => x.kind === 'decoy'); await lockOn(d); await until(() => G.stage === 'chase' || G.chosen); }
          const tiniest = G.set.findIndex(x => x.kind === 'tiny' && x.size === 0);
          while (!G.chosen) { await lockOn(tiniest); await K.wait(60); }
          await until(() => G.stage === 'clock' && !clock.hidden);
          await K.wait(2600);
          await K.sim.tap(didBtn);
          await until(() => finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
