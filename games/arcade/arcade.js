/* ThinkStill Reset / Reframe console.
 * Reads what the person types, routes them to the right game (the Reset console's 22 DNA parents), hosts the game in
 * its own scope, and owns the before/after rating, "did it help", momentum XP, shift records, sharing and metrics.
 */
(function (env) {
  'use strict';
  const TS = env.TS, A = TS.audio, UI = TS.ui, h = TS.h;
  const MODE = (TS.opts.mode || env.mode || 'reset') === 'reframe' ? 'reframe' : 'reset';
  const root = TS.root;
  root.classList.add('tsg-arcade', 'tsg-mode-' + MODE);
  TS.fonts('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Fredoka:wght@400;500;600;700&display=swap');

  /* ---------------- product taxonomy (same parents and families as the Reset Console v40) ---------------- */
  const PARENT_FAMILY = {
    'Attention / Grounding / Mental Quiet': 'GROUND', 'Beliefs / Evidence': 'REFRAME', 'Communication / Boundaries': 'CONNECT', 'Creativity / Mind Play': 'PLAY',
    'Decision Pressure': 'CHOOSE', 'Emotion': 'FEEL', 'Getting Started': 'ACT', 'Identity / Self': 'CLARIFY', 'Inner Speech / Mental Text': 'INTERRUPT',
    'Memory / Replay / Rumination': 'INTERRUPT', 'Mental Imagery': 'DISTANCE', 'Mental Overload / Working Memory': 'ORGANISE', 'Overthinking / Thought Fusion': 'INTERRUPT',
    'Panic / Body Alarm': 'GROUND', 'Performance / Confidence': 'ACT', 'Positive State': 'AMPLIFY', 'Sleep / Winding Down': 'QUIET', 'Social / Team / Perspective': 'CONNECT',
    'Support First / Safety': 'SUPPORT', 'Uncertainty / Future Worry / Reassurance': 'DISTANCE', 'Urges / Habit Loops': 'CHOOSE', 'Values / Meaning / Grief': 'CLARIFY'
  };
  TS.PARENT_FAMILY = PARENT_FAMILY;
  TS.PARENTS = Object.keys(PARENT_FAMILY);
  const FAMILY = {
    GROUND: { label: 'Ground', color: '#3fc7a8' }, INTERRUPT: { label: 'Interrupt', color: '#8f7bff' }, DISTANCE: { label: 'Distance', color: '#5aa9ff' },
    ORGANISE: { label: 'Organise', color: '#f2b84b' }, ACT: { label: 'Act', color: '#ff7a59' }, CHOOSE: { label: 'Choose', color: '#ff5f8f' },
    FEEL: { label: 'Feel', color: '#ff8fb1' }, CLARIFY: { label: 'Clarify', color: '#b49cff' }, CONNECT: { label: 'Connect', color: '#46c9e5' },
    PLAY: { label: 'Play', color: '#ffc93f' }, QUIET: { label: 'Quiet', color: '#7f8cff' }, AMPLIFY: { label: 'Amplify', color: '#ffcf6b' },
    REFRAME: { label: 'Reframe', color: '#ffb24f' }, EXPLORE: { label: 'Explore', color: '#9ad17f' }
  };
  TS.FAMILY = FAMILY;

  const CFG = {
    reset: {
      title: 'RESET CONSOLE', tagline: 'Change your state in about two minutes.', host: 'still', voice: 560,
      ask: 'What’s going on right now?', placeholder: 'e.g. My head keeps replaying the meeting and my chest feels tight',
      rate: { q: 'How strong is it right now?', after: 'How strong is it now?', min: 0, max: 10, step: 1, unit: '', fmt: (v) => String(v) },
      greet: { Jolly: 'Hey you. Tell me what’s going on and I’ll pick a game that helps.', Cheeky: 'Go on then. What’s rattling around in there?', Unfiltered: 'What’s wrong? Type it. I’ll find the right game.' }
    },
    reframe: {
      title: 'REFRAME CONSOLE', tagline: 'Change the story. Keep the facts.', host: 'glitch', voice: 380,
      ask: 'What happened, and what are you telling yourself about it?', placeholder: 'e.g. My boss messaged “can we chat tomorrow?” No context. I’m definitely getting fired.',
      rate: { q: 'How true does that thought feel?', after: 'How true does it feel now?', min: 0, max: 100, step: 5, unit: '%', fmt: (v) => v + '%' },
      greet: { Jolly: 'Got a story stuck on repeat? Let’s check it like detectives.', Cheeky: 'Tell me the facts. Then tell me the drama. I’ll sort them.', Unfiltered: 'What happened, and what’s your brain saying it means? Spill.' }
    }
  }[MODE];
  const TITLE = String(TS.opts.title || CFG.title);

  /* ---------------- games ---------------- */
  const GAMES = (env.games || []).filter(g => g && g.mode === MODE && typeof g.mount === 'function');
  GAMES.forEach((g, i) => { g.order = i; g.family = g.family || PARENT_FAMILY[(g.parents || [])[0]] || 'EXPLORE'; g.parents = g.parents || []; });
  const byId = (id) => GAMES.find(g => g.id === id);
  TS.arcadeGames = GAMES;

  /* ---------------- markup ---------------- */
  const uid = 'ar' + Math.random().toString(36).slice(2, 7);
  root.insertAdjacentHTML('beforeend', `
  <div class="a-bg" aria-hidden="true"><canvas class="a-bgc"></canvas></div>
  <section class="scene a-home" aria-label="${TITLE}">
    <div class="a-col">
      <header class="a-hero">
        <div class="a-hostline"><img class="a-host" alt="" draggable="false"><div class="a-hostsay" aria-live="polite"><span></span></div></div>
        <h1 class="a-title">${TITLE}</h1>
        <p class="a-tagline">${CFG.tagline}</p>
      </header>
      <div class="a-xp" role="group" aria-label="Momentum"><span class="a-lvl">Level 1</span><span class="a-xpbar"><i></i></span><span class="a-xpnum">0 XP</span></div>
      <div class="a-card a-ask">
        <label class="a-label" for="${uid}-t">${CFG.ask}</label>
        <textarea id="${uid}-t" class="a-text" rows="3" maxlength="700" placeholder="${CFG.placeholder}"></textarea>
        <div class="a-examples" aria-label="Examples"></div>
        <div class="a-row"><div class="a-vibes" role="group" aria-label="Vibe"></div><div class="a-ints" role="group" aria-label="Intensity"></div></div>
        <div class="a-row a-go"><button type="button" class="a-link a-browse">Browse all ${GAMES.length} games</button><button type="button" class="ts-btn a-find">Find my game</button></div>
        <p class="a-fine">Stays on this device. Nothing you type is shared or stored.</p>
      </div>
      <div class="a-recent" hidden><h2 class="a-h2">Jump back in</h2><div class="a-strip"></div></div>
    </div>
  </section>
  <section class="scene a-check" hidden aria-label="Check in">
    <div class="a-col">
      <div class="a-card a-rate">
        <div class="a-reading" aria-live="polite"><img class="a-host2" alt="" draggable="false"><span class="a-readline">Reading it…</span></div>
        <div class="a-dialwrap"></div>
      </div>
      <h2 class="a-h2">Best games for this</h2>
      <div class="a-recs"></div>
      <div class="a-row a-more"><button type="button" class="a-link a-surprise">Surprise me</button><button type="button" class="a-link a-browse2">Browse all ${GAMES.length}</button><button type="button" class="a-link a-back1">Edit what I wrote</button></div>
    </div>
  </section>
  <section class="scene a-lib" hidden aria-label="All games">
    <div class="a-libhead">
      <div class="a-row"><h2 class="a-h2">All ${GAMES.length} games</h2><button type="button" class="ts-btn ts-btn-quiet a-libback">Back</button></div>
      <input class="a-search" type="search" placeholder="Search games" aria-label="Search games">
      <div class="a-fams" role="group" aria-label="Filter by family"></div>
    </div>
    <div class="a-grid" role="list"></div>
  </section>
  <section class="scene a-play" hidden aria-label="Game">
    <div class="a-stage"></div>
    <div class="a-gamebar"><button type="button" class="ts-icon-btn a-leave" aria-label="Leave game"></button><span class="a-gname"></span></div>
  </section>`);
  const $ = (s) => root.querySelector(s);
  const textEl = $('.a-text'), stageEl = $('.a-stage');
  $('.a-leave').innerHTML = UI.ICON.close;

  /* ---------------- background ---------------- */
  const bgCanvas = $('.a-bgc');
  let bg = null;
  function buildBg() {
    const w = root.clientWidth || 390, H = root.clientHeight || 844;
    bg = { fit: TS.fitCanvas(bgCanvas, w, H, 1.5), w, h: H, dots: [] };
    const r = TS.rng(MODE === 'reset' ? 11 : 23);
    for (let i = 0; i < Math.round(w * H / 9000); i++) bg.dots.push({ x: r() * w, y: r() * H, s: 0.6 + r() * 1.6, p: r() * 6.28, v: 0.2 + r() * 0.6 });
  }
  function drawBg(t) {
    if (!bg || stage.current === sc.play) return;
    const g = bg.fit.ctx, w = bg.w, H = bg.h, dark = TS.scene() === 'dark';
    g.clearRect(0, 0, w, H);
    const c1 = TS.token('--a-glow1'), c2 = TS.token('--a-glow2');
    const x1 = w * (0.25 + 0.08 * Math.sin(t * 0.07)), y1 = H * (0.18 + 0.05 * Math.cos(t * 0.05));
    const x2 = w * (0.8 + 0.06 * Math.cos(t * 0.06)), y2 = H * (0.7 + 0.05 * Math.sin(t * 0.08));
    [[x1, y1, c1], [x2, y2, c2]].forEach(([x, y, c]) => { const gr = g.createRadialGradient(x, y, 0, x, y, Math.max(w, H) * 0.6); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, H); });
    g.fillStyle = dark ? '#ffffff' : '#3a3550';
    bg.dots.forEach(d => { g.globalAlpha = (dark ? 0.5 : 0.18) * (0.5 + 0.5 * Math.sin(t * d.v + d.p)); g.fillRect(d.x, d.y, d.s, d.s); });
    g.globalAlpha = 1;
  }

  /* ---------------- host character ---------------- */
  const hostImg = $('.a-host'), hostSay = $('.a-hostsay'), hostSpan = $('.a-hostsay span');
  const hostFace = (m) => { const u = TS.faceUrl(CFG.host, m); if (hostImg.getAttribute('src') !== u) hostImg.src = u; hostImg.classList.remove('gk-pop'); void hostImg.offsetWidth; hostImg.classList.add('gk-pop'); };
  function host(line, mood) { if (mood) hostFace(mood); return UI.say(hostSay, line, { target: hostSpan, tick: () => { if (A.ctx && TS.settings.sound && Math.random() < 0.5) A.tone({ type: 'sine', freq: CFG.voice + Math.random() * 100, dur: 0.035, vol: 0.02 }); } }); }

  /* ---------------- vibe + intensity ---------------- */
  function renderPrefs() {
    const v = $('.a-vibes'), it = $('.a-ints');
    v.innerHTML = ''; it.innerHTML = '';
    TS.VIBES.forEach(x => { const b = h('button', { type: 'button', class: 'ts-chip', 'aria-pressed': String(TS.settings.vibe === x), text: x }); b.addEventListener('click', () => TS.set('vibe', x)); v.append(b); });
    TS.INTENSITIES.forEach(x => { const b = h('button', { type: 'button', class: 'ts-chip', 'aria-pressed': String(TS.settings.intensity === x), text: x }); b.addEventListener('click', () => TS.set('intensity', x)); it.append(b); });
  }
  TS.on('settings', ({ key }) => { if (key === 'vibe' || key === 'intensity') renderPrefs(); if (key === 'vibe' && stage.current === sc.home) host(TS.line(CFG.greet), 'happy'); });

  /* ---------------- XP ---------------- */
  function renderXP(flash) {
    let xp = 0;
    try { const raw = JSON.parse(TS.store.getRaw('__ts_thinkstill_experience_v1') || 'null'); xp = raw && raw.xp ? Number(raw.xp) : 0; } catch (e) { xp = 0; }
    const L = TS.level(xp);
    root.querySelectorAll('.a-lvl').forEach(el => { el.textContent = 'Level ' + L.level; });
    root.querySelectorAll('.a-xpbar i').forEach(el => { el.style.width = L.pct.toFixed(1) + '%'; });
    root.querySelectorAll('.a-xpnum').forEach(el => { el.textContent = xp + ' XP'; });
    if (flash) root.querySelectorAll('.a-xp').forEach(el => { el.classList.remove('a-flash'); void el.offsetWidth; el.classList.add('a-flash'); });
    return L;
  }

  /* ---------------- session + analysis ---------------- */
  const session = { text: '', analysis: null, ready: null, before: null, after: null, seed: Date.now() % 100000, aiToken: 0, source: 'local' };
  const AN = TS.analysis;
  function analyse(text) {
    const local = AN.local(text);
    session.analysis = local; session.source = 'local';
    const token = ++session.aiToken;
    session.ready = (async () => {
      if (!text.trim()) return local;
      try {
        const via = await TS.ai.available();
        if (!via) return local;
        const ctl = new AbortController();
        const kill = TS.later(() => ctl.abort(), 12000);
        const raw = await TS.ai.json(AN.prompt(text, TS.settings.vibe), { tier: AN.tier || 'quick', signal: ctl.signal });
        TS.cancel(kill);
        if (token !== session.aiToken) return session.analysis;
        const norm = AN.normalise(raw, text, local);
        if (norm) { norm.safety = TS.safety.merge(local.safety, norm.safety); session.analysis = norm; session.source = 'ai'; TS.emit('analysis', norm); }
        return session.analysis;
      } catch (e) { TS.ai.failure(e); return session.analysis; }
    })();
    return local;
  }

  /* ---------------- router ---------------- */
  const recentKey = 'arcade-recent-' + MODE;
  const recent = () => TS.store.get(recentKey, []);
  function recommend(an, n) {
    const r = TS.rng(session.seed + (an.parent || '').length);
    const fam = PARENT_FAMILY[an.parent] || 'EXPLORE';
    const rec = recent();
    return GAMES.map(g => {
      let s = 0;
      if (g.parents.includes(an.parent)) s += 5;
      if (an.parents2 && g.parents.some(p => an.parents2.includes(p))) s += 1.6;
      if (g.family === fam) s += 1.8;
      if ((an.intensity || 0) >= 7 && g.family === 'GROUND') s += 1.4;
      if (g.flagship) s += 0.9;
      if (g.needs && g.needs.includes('text') && !session.text) s -= 4;
      const ri = rec.indexOf(g.id); if (ri >= 0) s -= 3.2 * (1 - ri / 24);
      s += r() * 1.1;
      return { g, s };
    }).sort((a, b) => b.s - a.s).slice(0, n).map(x => x.g);
  }

  /* ---------------- dial ---------------- */
  function dial(parent, o) {
    const R = CFG.rate;
    const wrap = h('div', { class: 'a-dial' });
    const id = uid + '-' + Math.random().toString(36).slice(2, 5);
    const q = h('label', { class: 'a-dialq', for: id, text: o.q });
    const num = h('output', { class: 'a-dialnum', for: id, text: o.value == null ? '–' : R.fmt(o.value) });
    const input = h('input', { id, class: 'a-range', type: 'range', min: R.min, max: R.max, step: R.step, value: o.value == null ? Math.round((R.max - R.min) / 2) : o.value, 'aria-valuetext': o.value == null ? 'not set' : R.fmt(o.value) });
    const track = h('div', { class: 'a-rangewrap' }, input, o.ghost != null ? h('span', { class: 'a-ghost', style: { left: `calc(${((o.ghost - R.min) / (R.max - R.min)) * 100}% * (1 - 28px / 100%) + 14px)` }, title: 'Before', 'aria-hidden': 'true' }) : null);
    const ends = h('div', { class: 'a-ends' }, h('span', { text: MODE === 'reset' ? '0 calm' : '0% not true' }), h('span', { text: MODE === 'reset' ? '10 overwhelming' : '100% totally true' }));
    wrap.append(h('div', { class: 'a-dialtop' }, q, num), track, ends);
    let set = o.value != null;
    input.addEventListener('input', () => { set = true; const v = Number(input.value); num.textContent = R.fmt(v); input.setAttribute('aria-valuetext', R.fmt(v)); wrap.classList.add('a-set'); if (A.ctx) A.wood(undefined, 0.06, 0.8 + (v - R.min) / (R.max - R.min) * 0.7); o.onInput && o.onInput(v); });
    input.addEventListener('change', () => o.onChange && o.onChange(Number(input.value)));
    if (set) wrap.classList.add('a-set');
    parent.append(wrap);
    return { wrap, input, value: () => (set ? Number(input.value) : null) };
  }

  /* ---------------- cards ---------------- */
  function gameCard(g, o) {
    o = o || {};
    const fam = FAMILY[g.family] || FAMILY.EXPLORE;
    const ch = (g.poster && g.poster.char) || (g.cast && g.cast[0]) || CFG.host;
    const mood = (g.poster && g.poster.mood) || 'happy';
    const b = h('button', { type: 'button', class: 'a-gcard' + (o.big ? ' a-big' : ''), role: o.list ? 'listitem' : null, style: { '--fam': fam.color }, 'aria-label': g.name + '. ' + (g.tagline || '') },
      h('span', { class: 'a-gart', 'aria-hidden': 'true' }, h('img', { alt: '', loading: 'lazy', draggable: 'false', src: TS.faceUrl(ch, mood) })),
      h('span', { class: 'a-gtext' },
        h('span', { class: 'a-gfam', text: fam.label + (g.minutes ? ' · ' + g.minutes + ' min' : '') }),
        h('span', { class: 'a-gname2', text: g.name }),
        h('span', { class: 'a-gtag', text: o.why ? (g.why || g.tagline || '') : (g.tagline || '') })));
    b.addEventListener('click', () => { A.unlock(); launch(g, { from: o.from || 'card' }); });
    return b;
  }

  /* ---------------- scenes ---------------- */
  const stage = new TS.Stage();
  const sc = { home: { el: $('.a-home') }, check: { el: $('.a-check') }, lib: { el: $('.a-lib') }, play: { el: $('.a-play') } };
  Object.keys(sc).forEach(k => { sc[k].el.classList.add('scene-rise'); stage.add(k, sc[k]); });

  /* Home */
  const EX = (AN.EXAMPLES || []).slice(0, 5);
  EX.forEach(([label, text]) => {
    const b = h('button', { type: 'button', class: 'ts-chip', text: label });
    b.addEventListener('click', () => { textEl.value = text; A.unlock(); if (A.ctx) A.pop({ vol: 0.1 }); homeGuide(); });
    $('.a-examples').append(b);
  });
  textEl.addEventListener('input', () => homeGuide());
  function homeGuide() {
    if (stage.current !== sc.home) return;
    const n = TS.clean(textEl.value, 700).split(/\s+/).filter(Boolean).length;
    if (n >= 3) UI.guide.set({ id: 'home-find', g: 'tap', target: $('.a-find'), label: 'FIND MY GAME', delay: 500 });
    else UI.guide.set({ id: 'home-type', g: 'type', target: textEl, label: MODE === 'reset' ? 'TYPE WHAT’S GOING ON' : 'TYPE WHAT HAPPENED', oy: 0.35, delay: 1200 });
  }
  function renderRecent() {
    const ids = recent().slice(0, 8), strip = $('.a-strip');
    strip.innerHTML = '';
    const list = ids.map(byId).filter(Boolean);
    $('.a-recent').hidden = !list.length;
    list.forEach(g => strip.append(gameCard(g, { from: 'recent' })));
  }
  sc.home.enter = () => {
    if (A.ctx) A.busLevel('music', 0.6);
    renderXP(); renderPrefs(); renderRecent();
    hostFace('happy');
    host(TS.line(CFG.greet), 'happy');
    homeGuide();
  };
  $('.a-find').addEventListener('click', () => findGame());
  textEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) findGame(); });
  $('.a-browse').addEventListener('click', () => { A.unlock(); stage.go('lib'); });
  function findGame() {
    A.unlock();
    const text = TS.clean(textEl.value, 700);
    if (text.split(/\s+/).filter(Boolean).length < 2) { UI.toast(MODE === 'reset' ? 'Type a few words about what’s going on.' : 'Type what happened and what you think it means.'); textEl.focus(); return; }
    if (TS.safety.screen(text) === 'support') { support(); return; }
    session.text = text; session.before = null; session.seed = Date.now() % 100000;
    analyse(text);
    TS.track('console_find', { mode: MODE, words: text.split(/\s+/).length });
    stage.go('check');
  }
  function support() { UI.guide.clear(); TS.safety.show({ backLabel: 'Back to the console', onBack: () => stage.go('home') }); }

  /* Check-in */
  let checkDial = null;
  sc.check.enter = async () => {
    const wrap = $('.a-dialwrap'); wrap.innerHTML = '';
    const img2 = $('.a-host2'); img2.src = TS.faceUrl(CFG.host, 'think');
    $('.a-readline').textContent = MODE === 'reset' ? 'Reading the pattern…' : 'Checking the story…';
    checkDial = dial(wrap, { q: CFG.rate.q, value: null, onInput: (v) => { session.before = v; UI.guide.set({ id: 'check-pick', g: 'choose', target: () => Array.from(root.querySelectorAll('.a-recs .a-gcard')), label: 'PICK A GAME', delay: 900 }); } });
    renderRecs();
    UI.guide.set({ id: 'check-rate', g: 'drag', dir: 'r', d: 70, target: checkDial.input, label: MODE === 'reset' ? 'SLIDE: HOW STRONG?' : 'SLIDE: HOW TRUE?', delay: 700 });
    const an = await session.ready;
    if (stage.current !== sc.check) return;
    if (an && an.safety === 'support') { support(); return; }
    img2.src = TS.faceUrl(CFG.host, 'idea');
    $('.a-readline').textContent = readLine(an);
    renderRecs();
  };
  function readLine(an) {
    const fam = FAMILY[PARENT_FAMILY[an.parent] || 'EXPLORE'];
    const label = an.patternName || an.parent;
    return (session.source === 'ai' ? 'Pattern: ' : 'Looks like: ') + label + (fam ? ' · ' + fam.label : '');
  }
  function renderRecs() {
    const box = $('.a-recs'); box.innerHTML = '';
    recommend(session.analysis, 3).forEach((g, i) => box.append(gameCard(g, { big: i === 0, why: true, from: 'rec' })));
  }
  TS.on('analysis', () => { if (stage.current === sc.check) { $('.a-readline').textContent = readLine(session.analysis); renderRecs(); } });
  $('.a-surprise').addEventListener('click', () => { const list = recommend(session.analysis, 8); launch(list[Math.floor(Math.random() * list.length)], { from: 'surprise' }); });
  $('.a-browse2').addEventListener('click', () => stage.go('lib'));
  $('.a-back1').addEventListener('click', () => stage.go('home'));

  /* Library */
  const grid = $('.a-grid'), search = $('.a-search'), fams = $('.a-fams');
  let famFilter = 'ALL';
  const famsPresent = ['ALL'].concat(Object.keys(FAMILY).filter(f => GAMES.some(g => g.family === f)));
  famsPresent.forEach(f => {
    const b = h('button', { type: 'button', class: 'ts-chip', 'aria-pressed': String(f === 'ALL'), text: f === 'ALL' ? 'All' : FAMILY[f].label, style: f === 'ALL' ? null : { '--fam': FAMILY[f].color } });
    b.addEventListener('click', () => { famFilter = f; fams.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); renderGrid(); });
    fams.append(b);
  });
  search.addEventListener('input', () => renderGrid());
  function renderGrid() {
    const q = search.value.trim().toLowerCase();
    grid.innerHTML = '';
    const list = GAMES.filter(g => (famFilter === 'ALL' || g.family === famFilter) && (!q || (g.name + ' ' + (g.tagline || '') + ' ' + (g.verb || '') + ' ' + g.parents.join(' ')).toLowerCase().includes(q)));
    list.forEach(g => grid.append(gameCard(g, { list: true, from: 'library' })));
    if (!list.length) grid.append(h('p', { class: 'a-empty', text: 'No games match that. Try another word.' }));
  }
  sc.lib.enter = () => { renderGrid(); UI.guide.set({ id: 'lib-pick', g: 'choose', target: () => Array.from(grid.querySelectorAll('.a-gcard')).slice(0, 3), label: 'PICK ANY GAME', delay: 1400 }); };
  $('.a-libback').addEventListener('click', () => stage.go(session.text ? 'check' : 'home'));

  /* ---------------- play host ---------------- */
  let current = null;
  async function launch(g, o) {
    if (!g) return;
    o = o || {};
    UI.guide.clear();
    unmount();
    if (session.before == null && checkDial) session.before = checkDial.value();
    if (session.ready && session.source !== 'ai') { // give the AI a moment if it is nearly there
      const wait = TS.sleep(o.instant ? 0 : 1800);
      await Promise.race([session.ready, wait]);
    }
    if (session.analysis && session.analysis.safety === 'support') { support(); return; }
    const an = session.analysis || AN.local(session.text || '');
    $('.a-gname').textContent = g.name;
    const el = h('div', { class: 'gk-game g-' + g.id, 'aria-label': g.name });
    stageEl.append(el);
    if (g.css) TS.css('game-' + g.id, g.css);
    if (g.fonts) TS.fonts('https://fonts.googleapis.com/css2?' + g.fonts.map(f => 'family=' + f).join('&') + '&display=swap');
    const S = TS.scope(el);
    const K = TS.makeKit(S);
    Object.assign(TS.game, { id: g.id, mode: MODE, family: g.family, parent: an.parent || g.parents[0] || '' });
    TS.newSession();
    const rec = recent().filter(x => x !== g.id); rec.unshift(g.id); TS.store.set(recentKey, rec.slice(0, 30));
    const ctx = {
      el, TS: S, kit: K, A, ui: UI, h, mode: MODE, game: g,
      text: session.text || '', analysis: an, analysisReady: session.ready || Promise.resolve(an), source: session.source,
      before: session.before, vibe: TS.settings.vibe, intensity: TS.intensity(),
      line: (lines) => TS.line(lines), track: (name, data) => TS.track(name, data),
      ai: async (prompt, ao) => {
        ao = ao || {};
        try { if (!(await TS.ai.available())) return ao.fallback ?? null; const r = await TS.ai.json(TS.ai.GUARDRAILS + '\n\n' + prompt, { tier: ao.tier || 'quick' }); return r ?? ao.fallback ?? null; }
        catch (e) { TS.ai.failure(e); return ao.fallback ?? null; }
      },
      finish: (result) => finish(result),
      exit: () => leave()
    };
    current = { g, S, K, el, ctx, done: false, t0: performance.now(), api: null };
    TS.track('start', { mode: MODE, from: o.from || 'card', source: session.source, before: session.before, hasText: !!session.text });
    await stage.go('play', {}, { duration: 380 });
    if (!current || current.g !== g) return;
    try { current.api = (await g.mount(ctx)) || {}; }
    catch (e) { console.error('game failed', g.id, e); TS.track('game_error', { id: g.id }); UI.toast('That game hit a snag. Try another.'); leave(); }
  }
  function unmount() {
    if (!current) return;
    try { current.S.destroy(); } catch (e) { console.error(e); }
    try { current.el.remove(); } catch (e) { /* gone */ }
    root.querySelectorAll('.a-after').forEach(x => x.remove());
    current = null;
    UI.guide.clear();
    if (A.ctx) { A.busLevel('music', 0.6, 0.4); A.busLevel('amb', 0.55, 0.4); A.busLevel('sfx', 0.9, 0.2); }
  }
  function leave() {
    if (current && !current.done) TS.track('quit', { id: current.g.id, seconds: Math.round((performance.now() - current.t0) / 1000) });
    unmount();
    stage.go(session.text ? 'check' : 'home');
  }
  $('.a-leave').addEventListener('click', () => {
    if (!current || current.done) { leave(); return; }
    const bar = $('.a-gamebar');
    if (bar.querySelector('.a-confirm')) return;
    const box = h('div', { class: 'a-confirm', role: 'dialog', 'aria-label': 'Leave game?' }, h('span', { text: 'Leave this game?' }));
    const keep = h('button', { type: 'button', class: 'ts-btn ts-btn-quiet', text: 'Keep playing' }), go = h('button', { type: 'button', class: 'ts-btn', text: 'Leave' });
    keep.addEventListener('click', () => box.remove()); go.addEventListener('click', () => { box.remove(); leave(); });
    box.append(keep, go); bar.append(box);
    TS.later(() => keep.focus(), 30);
  });

  /* ---------------- after the game ---------------- */
  function finish(result) {
    if (!current || current.done) return;
    current.done = true;
    result = result || {};
    const g = current.g, secs = Math.round((performance.now() - current.t0) / 1000);
    UI.guide.clear();
    TS.awardXP(12, 'game:' + g.id + ':' + TS.game.session);
    TS.store.set('guide-learned:' + g.id, (TS.store.get('guide-learned:' + g.id, 0) || 0) + 1);
    TS.track('complete', { id: g.id, seconds: secs, before: session.before, source: session.source, result: result.code || '' });
    const after = h('div', { class: 'a-after', role: 'dialog', 'aria-label': 'How did it go?' });
    const card = h('div', { class: 'a-card a-aftercard' });
    after.append(h('div', { class: 'a-afterscrim' }), card);
    const R = CFG.rate;
    card.append(
      h('div', { class: 'a-afterhead' }, h('img', { class: 'a-afterimg', alt: '', src: TS.faceUrl((g.cast && g.cast[0]) || CFG.host, result.mood || 'celebrate') }),
        h('div', null, h('span', { class: 'a-gfam', text: g.name }), h('h2', { class: 'a-aftertitle', text: result.title || 'Nicely done' }))),
      result.lines && result.lines.length ? h('ul', { class: 'a-lines' }, result.lines.slice(0, 3).map(l => h('li', { text: l }))) : null,
      result.badges && result.badges.length ? h('div', { class: 'a-badges' }, result.badges.slice(0, 4).map(b => h('span', { class: 'a-badge', text: b }))) : null
    );
    if (result.badges && result.badges.length && A.ctx) TS.later(() => { ['E5', 'G5', 'C6'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + i * 0.08, vol: 0.07, dur: 1.2 })); }, 500);
    const deltaEl = h('p', { class: 'a-delta', 'aria-live': 'polite' });
    const d = dial(card, {
      q: R.after, value: null, ghost: session.before,
      onInput: (v) => { session.after = v; deltaEl.textContent = deltaText(session.before, v); },
      onChange: (v) => {
        TS.track('rating_after', { value: v, before: session.before, id: g.id });
        if (session.before != null) { const drop = MODE === 'reset' ? session.before - v : (session.before - v) / 10; TS.recordShift(drop >= 4 ? 3 : drop >= 2 ? 2 : drop >= 1 ? 1 : 0); }
      }
    });
    card.append(deltaEl);
    if (session.analysis && session.analysis.safety === 'care') card.append(h('p', { class: 'a-care', text: TS.safety.CARE_LINE }));
    const helpSlot = h('div', { class: 'a-help' }); card.append(helpSlot); UI.helpCheck(helpSlot);
    const L = renderXP(true);
    card.append(h('div', { class: 'a-xp a-xpafter' }, h('span', { class: 'a-lvl', text: 'Level ' + L.level }), h('span', { class: 'a-xpbar' }, h('i', { style: { width: L.pct.toFixed(1) + '%' } })), h('span', { class: 'a-xpnum', text: '+12 XP' })));
    const next = recommend(session.analysis || AN.local(''), 4).find(x => x.id !== g.id);
    const again = h('button', { type: 'button', class: 'ts-btn', text: next ? 'Play ' + next.name : 'Play another' });
    const share = h('button', { type: 'button', class: 'ts-btn ts-btn-quiet', text: 'Share' });
    const back = h('button', { type: 'button', class: 'ts-btn ts-btn-quiet', text: 'Console' });
    again.addEventListener('click', () => { session.before = session.after != null ? session.after : session.before; launch(next || recommend(session.analysis, 1)[0], { from: 'next' }); });
    share.addEventListener('click', () => shareCard(g, result));
    back.addEventListener('click', () => { unmount(); stage.go('home'); });
    card.append(h('div', { class: 'a-actions' }, share, back, again));
    root.querySelector('.a-play').append(after);
    if (A.ctx) { A.busLevel('music', 0.35, 0.8); }
    UI.guide.set({ id: 'after-rate', g: 'drag', dir: 'r', d: 70, target: d.input, label: 'SLIDE TO RATE', place: 'below', delay: 1500 });
    d.input.addEventListener('input', () => UI.guide.clear(), { once: true });
    TS.emit('game-finished', { id: g.id, result });
  }
  function deltaText(b, a) {
    const f = CFG.rate.fmt;
    if (b == null) return 'Noted: ' + f(a) + '. It stays on this device.';
    if (a < b) return f(b) + ' → ' + f(a) + '. That’s a real shift.';
    if (a === b) return 'Same as before (' + f(a) + '). Some days need a second round, or a different game.';
    return f(b) + ' → ' + f(a) + '. Thanks for being honest. Try a Gentle round or a grounding game.';
  }
  async function shareCard(g, result) {
    try { await document.fonts.load('800 60px "Baloo 2"'); } catch (e) { /* fallback */ }
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, MODE === 'reset' ? '#0b1030' : '#121018'); gr.addColorStop(1, MODE === 'reset' ? '#14385a' : '#3a2410');
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
    const fam = FAMILY[g.family] || FAMILY.EXPLORE;
    x.fillStyle = fam.color; x.globalAlpha = 0.18; x.beginPath(); x.arc(W * 0.8, H * 0.2, 380, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
    x.fillStyle = '#ffffff'; x.textAlign = 'center';
    x.font = '800 54px "Baloo 2", sans-serif'; x.fillText(TITLE, W / 2, 170);
    x.font = '800 92px "Baloo 2", sans-serif'; x.fillText(g.name.toUpperCase(), W / 2, 560, W - 120);
    x.font = '600 44px Fredoka, sans-serif'; x.fillStyle = 'rgba(255,255,255,0.85)';
    if (session.before != null && session.after != null) x.fillText(CFG.rate.fmt(session.before) + '  →  ' + CFG.rate.fmt(session.after), W / 2, 700);
    x.font = '500 36px Fredoka, sans-serif'; x.fillText(result.share || (result.title || ''), W / 2, 800, W - 140);
    x.font = '600 34px Fredoka, sans-serif'; x.fillStyle = 'rgba(255,255,255,0.9)'; x.fillText('ThinkStill', W / 2, H - 90);
    try { const im = new Image(); im.crossOrigin = 'anonymous'; im.src = TS.faceUrl((g.cast && g.cast[0]) || CFG.host, 'celebrate'); await im.decode(); x.drawImage(im, W / 2 - 130, 230, 260, 260); } catch (e) { /* optional */ }
    try { UI.share(c, { heading: 'Share your round', filename: 'thinkstill-' + g.id, alt: 'A card with the game name and your before and after', note: 'Only the game and your numbers. Nothing you typed.' }); }
    catch (e) { UI.toast('Sharing isn’t available here.'); }
  }

  /* ---------------- boot ---------------- */
  UI.bar({ mode: MODE === 'reset' ? 'Reset' : 'Reframe' });
  let rq = false;
  try { const ro = new ResizeObserver(() => { if (rq) return; rq = true; requestAnimationFrame(() => { rq = false; buildBg(); }); }); ro.observe(root); TS.onDestroy(() => ro.disconnect()); } catch (e) { TS.listen(window, 'resize', buildBg); }
  TS.ready(() => {
    buildBg();
    const q = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(''); } })();
    const direct = TS.opts.game || q.get('game');
    const g0 = direct && byId(direct);
    if (g0) {
      const text = TS.opts.text != null ? TS.opts.text : (q.get('text') != null ? q.get('text') : (AN.EXAMPLES[0] || ['', ''])[1]);
      session.text = TS.clean(text, 700); analyse(session.text); session.before = q.get('before') != null ? Number(q.get('before')) : (MODE === 'reset' ? 7 : 80);
      stage.go('home', {}, { duration: 0 }).then(() => launch(g0, { from: 'direct', instant: true }));
    } else stage.go('home', {}, { duration: 0 });
    TS.loop((dt, t) => drawBg(t));
  });

  if (TS.isDev()) {
    window.__arcade = window.__arcade || {};
    window.__arcade[MODE] = {
      games: GAMES.map(g => ({ id: g.id, name: g.name, family: g.family, parents: g.parents, verb: g.verb })),
      launch: (id, o) => launch(byId(id), Object.assign({ from: 'test', instant: true }, o || {})),
      setText: (t) => { session.text = TS.clean(t, 700); analyse(session.text); return session.ready; },
      session, current: () => current && { id: current.g.id, done: current.done, api: current.api },
      autoplay: async () => { if (!current || !current.api || !current.api.autoplay) return 'no-autoplay'; await current.api.autoplay(); return 'ok'; },
      syncLog: () => A.syncLog(), guide: () => UI.guide.state(), stage: () => Object.keys(sc).find(k => sc[k] === stage.current)
    };
  }
})(window.TSG_ENV);
