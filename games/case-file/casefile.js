/* Case File — a ThinkStill Reframe game.
 * Mechanism: separate what a camera could record from what the brain added (source monitoring),
 * surface the information that is missing, weigh rival explanations that all fit the facts
 * (the feared one stays in the lineup), and re-rate certainty with hunch chips.
 * It never manufactures reassurance: when the facts support the fear, the verdict says so.
 */
(function (global) {
  'use strict';
  const TS = global.TS, A = TS.audio, CF = global.CaseFile, h = TS.h, $ = TS.$;
  TS.game = { id: 'case-file', mode: 'reframe', startedAt: 0 };
  const TAU = Math.PI * 2;

  const app = $('#app'), room = $('#room'), glitchEl = $('#glitch'), glitchImg = $('#glitchImg'), bubble = $('#bubble');

  const G = {
    coffee: '../../bubble-expressions/glitch_E74.webp', smug: '../../bubble-expressions/glitch_E07.webp',
    smug2: '../../bubble-expressions/glitch_E31.webp', shades: '../../bubble-expressions/glitch_E35.webp',
    scan: '../../bubble-expressions/glitch_E46.webp', forensic: '../../bubble-expressions/glitch_E77.webp',
    sideeye: '../../bubble-expressions/glitch_E08.webp', meltdown: '../../bubble-expressions/glitch_E11.webp',
    dizzy: '../../bubble-expressions/glitch_E80.webp', sweat: '../../bubble-expressions/glitch_E36.webp',
    facepalm: '../../bubble-expressions/glitch_E64.webp', ponder: '../../bubble-expressions/glitch_E65.webp',
    idea: '../../bubble-expressions/glitch_E52.webp', bulb: '../../bubble-expressions/glitch_E90.webp',
    startled: '../../bubble-expressions/glitch_E37.webp', gasp: '../../bubble-expressions/glitch_E34.webp',
    stars: '../../bubble-expressions/glitch_E21.webp', wide: '../../bubble-expressions/glitch_E25.webp'
  };
  const CAST = [
    { name: 'Patch', idle: '../../bubble-expressions/patch_E01.webp', talk: '../../bubble-expressions/patch_E24.webp' },
    { name: 'Drop', idle: '../../bubble-expressions/drop_E12.webp', talk: '../../bubble-expressions/drop_E03.webp' },
    { name: 'Rush', idle: '../../bubble-expressions/rush_E01.webp', talk: '../../bubble-expressions/rush_E17.webp' },
    { name: 'Still', idle: '../../bubble-expressions/still_E12.webp', talk: '../../bubble-expressions/still_E17.webp' }
  ];
  const FEAR_ACTOR = { name: 'Sync', idle: '../../bubble-expressions/sync_E26.webp', talk: '../../bubble-expressions/sync_E01.webp' };
  [...Object.values(G), ...CAST.flatMap(c => [c.idle, c.talk]), FEAR_ACTOR.idle, FEAR_ACTOR.talk].forEach(src => { const i = new Image(); i.src = src; });

  /* ---------------- state ---------------- */
  const S = {
    text: '', sample: null, quick: null, analysis: null, aiPending: false, aiFailed: false, source: 'local',
    certainty: 75, caseNo: '0417', userKind: {}, disagree: 0, witnessTwist: false,
    flipped: new Set(), picked: null, chips: {}, selected: null, lead: null, verdict: null, filed: false
  };

  /* ---------------- Glitch ---------------- */
  function setFace(img, src) {
    if (img.getAttribute('src') !== src) img.src = src;
    img.classList.remove('pop'); void img.offsetWidth; img.classList.add('pop');
  }
  let placedOnce = false;
  function placeGlitch(folder) {
    if (!placedOnce) { glitchEl.style.transition = 'none'; requestAnimationFrame(() => requestAnimationFrame(() => { glitchEl.style.transition = ''; })); placedOnce = true; }
    const r = folder.getBoundingClientRect(), a = app.getBoundingClientRect();
    const size = glitchEl.offsetWidth || 138;
    const x = Math.max(8, r.left - a.left - 2), y = r.top - a.top - size - 26;
    glitchEl.style.transform = `translate(${x}px, ${y}px)`;
    glitchEl.dataset.x = x; glitchEl.dataset.y = y;
    const bx = x + size + 2, maxW = Math.max(150, Math.min(r.right - a.left, a.width - 12) - bx);
    bubble.style.left = bx + 'px'; bubble.style.top = Math.max(60, y + 8) + 'px'; bubble.style.maxWidth = maxW + 'px';
  }
  let bubbleTimer = 0;
  function sayBig(text, ms) {
    clearTimeout(bubbleTimer);
    if (!text) { bubble.hidden = true; return Promise.resolve(); }
    const p = TS.ui.say(bubble, text, { tick: () => blip() });
    if (ms) bubbleTimer = setTimeout(() => { bubble.hidden = true; }, ms);
    return p;
  }
  function strip(id, face, text) {
    const el = $('#' + id), img = $('img', el), line = $('.line', el);
    if (face) setFace(img, face);
    return TS.ui.say(line, text, { tick: () => blip() });
  }
  /* Intensity: Gentle drops the glitch and shake effects, Full adds a stamp shake. */
  function shake() {
    if (TS.reduced() || TS.intensity() < 2 || !app.animate) return;
    app.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-5px,3px)' }, { transform: 'translate(4px,-2px)' }, { transform: 'translate(-2px,1px)' }, { transform: 'translate(0,0)' }], { duration: 260, easing: 'ease-out' });
  }
  function malfunction(el) {
    if (TS.reduced() || TS.intensity() === 0) return;
    el.classList.remove('malfunction'); void el.offsetWidth; el.classList.add('malfunction');
    setTimeout(() => el.classList.remove('malfunction'), 950);
  }
  const voice = (key, vars) => {
    const ai = S.analysis && S.analysis.glitch && S.analysis.glitch[key];
    let line = ai || TS.line(CF.VOICE[key]);
    if (vars) Object.entries(vars).forEach(([k, v]) => { line = line.replace('{' + k + '}', v); });
    return line;
  };

  /* ---------------- audio ---------------- */
  function blip() { if (A.ctx && TS.settings.sound) A.tone({ type: 'square', freq: 300 + Math.random() * 120, dur: 0.025, vol: 0.018, lp: 1400 }); }
  const sfx = {
    stamp() { if (!A.ctx) return; A.thud({ vol: 0.7 }); A.paper({ freq: 1800, vol: 0.16, dur: 0.12 }); },
    slide() { if (A.ctx) A.paper({ vol: 0.14, dur: 0.2 }); },
    flip() { if (!A.ctx) return; A.paper({ freq: 3200, vol: 0.12, dur: 0.14 }); A.click({ vol: 0.06 }); },
    pin() { if (A.ctx) A.click({ vol: 0.14 }); },
    string() { if (A.ctx) A.pluck(A.note('E5'), { vol: 0.12, damp: 0.985, dur: 0.6 }); },
    shutter() { if (!A.ctx) return; const t = A.now(); A.click({ when: t, vol: 0.18 }); A.noise({ when: t + 0.04, filter: 'highpass', freq: 2500, dur: 0.05, vol: 0.12 }); A.click({ when: t + 0.09, vol: 0.12 }); },
    bloop() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 420, to: 190, glide: 0.18, dur: 0.24, vol: 0.18 }); A.tone({ type: 'sine', freq: 840, to: 380, glide: 0.18, dur: 0.16, vol: 0.05 }); },
    chip() { if (A.ctx) A.wood(undefined, 0.16, 1.7 + Math.random() * 0.2); },
    step() { if (A.ctx) A.tone({ type: 'sine', freq: 90, to: 60, dur: 0.18, vol: 0.25 }); },
    glitch() {
      if (!A.ctx) return; const t = A.now();
      for (let i = 0; i < 10; i++) A.tone({ when: t + i * 0.035, type: 'square', freq: 180 + Math.random() * 1600, dur: 0.03, vol: 0.05, lp: 3000 });
      A.noise({ when: t, filter: 'bandpass', freq: 1200, q: 0.6, dur: 0.4, vol: 0.12 });
      A.tone({ when: t + 0.4, type: 'sawtooth', freq: 220, to: 70, glide: 0.5, dur: 0.6, vol: 0.08, lp: 900 });
    },
    sting(dark) { if (!A.ctx) return; const t = A.now(); const notes = dark ? ['D3', 'F3', 'Ab3', 'C4'] : ['D3', 'F3', 'A3', 'C4']; notes.forEach((n, i) => A.tone({ when: t + i * 0.02, type: 'triangle', freq: A.note(n), dur: 1.6, vol: 0.06, attack: 0.01, lp: 1800, verb: 0.4, bus: 'music' })); }
  };

  /* Noir jazz loop: walking bass, brushes, vibraphone. Layers change per room. */
  const music = { on: false, next: 0, beat: 0, bpm: 76, layers: { bass: true, brush: true, vibes: false, tense: false } };
  const BASS = [['D2', 'F2', 'A2', 'C3'], ['G2', 'A#2', 'D3', 'F3'], ['E2', 'G2', 'A2', 'C#3'], ['D2', 'A2', 'F2', 'E2']];
  const VIBES = [['F4', 'A4', 'C5', 'E5'], ['F4', 'A#4', 'D5', 'F5'], ['G4', 'A#4', 'C#5', 'E5'], ['F4', 'A4', 'D5', 'E5']];
  function musicTick() {
    if (!music.on || !A.ctx) return;
    const ahead = A.now() + 0.2;
    while (music.next < ahead) {
      const t = music.next, i = music.beat, bar = Math.floor(i / 4) % 4, b = i % 4, L = music.layers;
      const swing = (60 / music.bpm) * 0.66;
      if (L.bass) A.pluck(A.note(BASS[bar][b]), { when: t, vol: 0.42, damp: 0.991, lp: 650, bus: 'music' });
      if (L.brush) { if (b === 1 || b === 3) A.brush(t, 0.07, 0.16); else A.brush(t, 0.03, 0.34); A.shaker(t + swing, 0.02); }
      if (L.vibes && (b === 0 || (b === 2 && i % 8 === 2))) VIBES[bar].forEach((n, k) => { A.tone({ when: t + k * 0.012, type: 'sine', freq: A.note(n), dur: 1.4, vol: 0.035, attack: 0.004, verb: 0.45, bus: 'music' }); A.tone({ when: t + k * 0.012, type: 'sine', freq: A.note(n) * 4, dur: 0.25, vol: 0.006, bus: 'music' }); });
      if (L.tense && b === 0) A.tone({ when: t, type: 'triangle', freq: A.note('D2'), dur: 60 / music.bpm * 4, vol: 0.06, attack: 0.4, lp: 400, bus: 'music' });
      music.beat++; music.next += 60 / music.bpm;
    }
  }
  function musicStart() { if (!A.ctx || music.on) return; music.on = true; music.next = A.now() + 0.1; music.beat = 0; A.busLevel('music', [0.38, 0.6, 0.72][TS.intensity()]); }
  TS.on('settings', ({ key }) => { if (key === 'intensity') A.busLevel('music', [0.38, 0.6, 0.72][TS.intensity()]); });
  function layers(o) { Object.assign(music.layers, o); }
  let amb = null;
  TS.on('audio-ready', () => { if (!amb) amb = A.ambience('rain'); musicStart(); });

  /* ---------------- rain window ---------------- */
  const rainCanvas = $('#rain');
  let rain = null;
  function buildRain() {
    const r = rainCanvas.getBoundingClientRect();
    if (!r.width) return;
    const { ctx, dpr } = TS.fitCanvas(rainCanvas, r.width, r.height, 2);
    const w = r.width, H = r.height, rnd = TS.rng(9), dark = TS.scene() === 'dark';
    // static backdrop: sky, skyline, lit windows, bokeh
    const bg = document.createElement('canvas'); bg.width = Math.ceil(w * dpr); bg.height = Math.ceil(H * dpr);
    const g = bg.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sk = g.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, TS.token('--sky')); sk.addColorStop(1, TS.token('--sky-2'));
    g.fillStyle = sk; g.fillRect(0, 0, w, H);
    let x = -10;
    while (x < w) {
      const bw = 26 + rnd() * 50, bh = H * (0.25 + rnd() * 0.45), y = H - bh;
      g.fillStyle = dark ? `rgba(8,10,20,${0.75 + rnd() * 0.2})` : `rgba(90,100,115,${0.45 + rnd() * 0.25})`;
      g.fillRect(x, y, bw, bh);
      for (let wy = y + 6; wy < H - 4; wy += 9) for (let wx = x + 4; wx < x + bw - 4; wx += 7) {
        if (rnd() < (dark ? 0.32 : 0.12)) { g.fillStyle = dark ? (rnd() < 0.8 ? 'rgba(255,196,110,0.75)' : 'rgba(150,220,255,0.6)') : 'rgba(230,236,242,0.55)'; g.fillRect(wx, wy, 3, 4); }
      }
      x += bw + 2 + rnd() * 6;
    }
    if (dark) for (let i = 0; i < 22; i++) {
      const bx = rnd() * w, by = H * (0.35 + rnd() * 0.6), br = 6 + rnd() * 18, col = rnd() < 0.5 ? '255,180,90' : rnd() < 0.5 ? '255,95,162' : '63,208,201';
      const gg = g.createRadialGradient(bx, by, 0, bx, by, br); gg.addColorStop(0, `rgba(${col},0.35)`); gg.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gg; g.fillRect(bx - br, by - br, br * 2, br * 2);
    }
    const drops = Array.from({ length: Math.round(w * H / 900) }, () => ({ x: rnd() * w, y: rnd() * H, l: 8 + rnd() * 14, v: 380 + rnd() * 260 }));
    const beads = Array.from({ length: Math.round(w * H / 5200) }, () => ({ x: rnd() * w, y: rnd() * H, r: 1.2 + rnd() * 2.6, v: rnd() < 0.3 ? 8 + rnd() * 30 : 0 }));
    rain = { ctx, bg, w, H, drops, beads, dark };
  }
  function drawRain(dt) {
    if (!rain || room.hidden) return;
    const { ctx, bg, w, H, drops, beads, dark } = rain;
    ctx.drawImage(bg, 0, 0, w, H);
    const slow = TS.reduced() ? 0.35 : 1;
    ctx.strokeStyle = dark ? 'rgba(170,190,230,0.32)' : 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1; ctx.beginPath();
    for (const d of drops) {
      d.y += d.v * dt * slow; d.x -= d.v * dt * 0.18 * slow;
      if (d.y > H) { d.y = -d.l; d.x = Math.random() * (w + 40); }
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l * 0.18, d.y - d.l);
    }
    ctx.stroke();
    for (const b of beads) {
      if (b.v) { b.y += b.v * dt * slow; if (b.y > H + 4) { b.y = -4; b.x = Math.random() * w; } }
      ctx.fillStyle = dark ? 'rgba(200,220,255,0.18)' : 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.fillStyle = dark ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.35, 0, TAU); ctx.fill();
    }
  }

  /* ---------------- scenes ---------------- */
  const stage = new TS.Stage(app);
  const sc = {};
  ['intake', 'closed', 'dust', 'desk', 'board', 'lineup', 'verdict'].forEach(n => { sc[n] = { el: $('#sc-' + n), transition: 'fade' }; stage.add(n, sc[n]); });
  function office(on) {
    room.hidden = !on; glitchEl.style.opacity = on ? '1' : '0';
    if (!on) bubble.hidden = true;
    if (on && !rain) requestAnimationFrame(buildRain);
  }

  /* Intake */
  const caseText = $('#caseText');
  const samplesEl = $('#samples');
  CF.SAMPLES.forEach(sm => {
    const b = h('button', { type: 'button', class: 'ts-chip', text: sm.chip });
    b.addEventListener('click', () => { caseText.value = sm.text; S.sample = sm; A.unlock(); sfx.slide(); TS.$$('.ts-chip', samplesEl).forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
    samplesEl.append(b);
  });
  caseText.addEventListener('input', () => { if (S.sample && TS.clean(caseText.value, 900) !== TS.clean(S.sample.text, 900)) { S.sample = null; TS.$$('.ts-chip', samplesEl).forEach(x => x.setAttribute('aria-pressed', 'false')); } });
  const vibesEl = $('#vibes');
  function renderVibes() {
    vibesEl.innerHTML = '';
    TS.VIBES.forEach(v => { const b = h('button', { type: 'button', class: 'ts-chip', 'aria-pressed': String(TS.settings.vibe === v), text: v }); b.addEventListener('click', () => TS.set('vibe', v)); vibesEl.append(b); });
  }
  renderVibes();
  TS.on('settings', ({ key }) => { if (key === 'vibe') renderVibes(); });

  sc.intake.enter = () => {
    office(true);
    layers({ bass: true, brush: true, vibes: false, tense: false });
    setFace(glitchImg, G.coffee);
    requestAnimationFrame(() => { placeGlitch($('#intakeFolder')); sayBig(TS.line({ Jolly: 'Got a case? I solve them fast. Very fast.', Cheeky: 'Another case? Fine. I’ll have it solved before my coffee cools.', Unfiltered: 'Spill it. I’ll solve it in under a second.' }), 0); });
  };

  $('#openCase').addEventListener('click', openCase);
  async function openCase() {
    A.unlock();
    const text = TS.clean(caseText.value, 900);
    if (text.split(/\s+/).length < 4) { TS.ui.toast('Tell the Inspector a little more: what happened, and what you think it means.'); caseText.focus(); return; }
    if (TS.safety.screen(text) === 'support') { TS.safety.show({ backLabel: 'Back to the office', onBack: () => stage.go('intake') }); return; }
    if (aiCtl) { aiCtl.abort(); aiCtl = null; }
    Object.assign(S, { text, analysis: null, aiPending: false, aiFailed: false, blocked: false, userKind: {}, disagree: 0, witnessTwist: false, flipped: new Set(), picked: null, chips: {}, selected: null, lead: null, verdict: null, filed: false });
    S.caseNo = String(Math.floor(1000 + Math.random() * 8999));
    S.quick = CF.localAnalysis(text);
    TS.game.startedAt = Date.now();
    TS.track('start', { sample: S.sample ? S.sample.key : 'own', vibe: TS.settings.vibe });
    if (S.sample) { S.analysis = CF.normalise(S.sample.analysis, text); S.source = 'sample'; }
    else requestAnalysis(text);
    stage.go('closed');
  }

  let aiCtl = null;
  async function requestAnalysis(text) {
    const token = S.caseNo; // a newer case must never receive an older case's answer
    S.aiPending = true; S.source = 'local';
    const via = await TS.ai.available();
    if (token !== S.caseNo) return;
    if (!via) { S.analysis = CF.normalise(S.quick, text); S.aiPending = false; TS.emit('analysis'); return; }
    const ctl = new AbortController(); aiCtl = ctl;
    try {
      const raw = await TS.ai.json(CF.prompt(text, TS.settings.vibe), { tier: 'default', signal: ctl.signal });
      if (token !== S.caseNo) return;
      const norm = CF.normalise(raw, text);
      if (!norm) throw { code: 'invalid_json' };
      norm.safety = TS.safety.merge(TS.safety.screen(text), norm.safety);
      if (!S.analysis) { S.analysis = norm; S.source = 'ai'; }
    } catch (e) {
      if (token !== S.caseNo) return;
      const kind = TS.ai.failure(e);
      if (kind !== 'cancelled' && !S.analysis) { S.analysis = CF.normalise(S.quick, text); S.aiFailed = true; }
    }
    if (aiCtl === ctl) aiCtl = null;
    S.aiPending = false;
    TS.emit('analysis');
  }
  TS.on('analysis', () => {
    if (S.analysis && S.analysis.safety === 'support' && !S.blocked) {
      S.blocked = true;
      stage.go('intake');
      TS.safety.show({ backLabel: 'Back to the office' });
    }
  });

  /* Closed */
  const certainty = $('#certainty'), certOut = $('#certOut');
  certainty.addEventListener('input', () => { S.certainty = Number(certainty.value); certOut.textContent = S.certainty + '%'; if (A.ctx) A.click({ vol: 0.05 }); });
  sc.closed.enter = async () => {
    office(true);
    $('#closedFolder').dataset.tab = 'CASE No. ' + S.caseNo; $('#caseNo').textContent = 'CASE No. ' + S.caseNo;
    const verdict = ((S.analysis || S.quick).conclusion || '').replace(/[.\u2026]+$/, '') + '.';
    $('#verdictText').textContent = verdict;
    S.certainty = 75; certainty.value = '75'; certOut.textContent = '75%';
    const stampEl = $('#closedStamp'); stampEl.classList.remove('slam');
    requestAnimationFrame(() => placeGlitch($('#closedFolder')));
    setFace(glitchImg, G.smug);
    await TS.sleep(450);
    stampEl.classList.add('slam'); sfx.stamp(); TS.buzz(20); shake();
    await TS.sleep(250);
    sayBig(voice('closed', { verdict }), 0);
  };
  $('#toEvidence').addEventListener('click', () => {
    if (S.blocked) return;
    TS.track('rating_before', { value: S.certainty });
    stage.go(S.analysis && !S.aiPending ? 'desk' : 'dust');
  });

  /* Dust (turns the wait for the AI into play) */
  const dustCanvas = $('#dustCanvas'), dustCard = $('#dustCard'), labLine = $('#labLine'), quickLab = $('#quickLab');
  let dust = null;
  function fingerprintSprite(size) {
    const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
    g.strokeStyle = 'rgba(240,240,250,0.85)'; g.lineWidth = 1.6;
    for (let r = 4; r < size / 2 - 2; r += 4.2) {
      g.beginPath();
      for (let a = 0; a <= TAU + 0.01; a += 0.08) { const rr = r * (1 + 0.08 * Math.sin(a * 3 + r)), x = size / 2 + Math.cos(a) * rr * 0.78, y = size / 2 + Math.sin(a) * rr; if (a === 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.stroke();
    }
    return c;
  }
  sc.dust.enter = () => {
    office(true);
    setFace(glitchImg, G.scan);
    requestAnimationFrame(() => {
      placeGlitch($('#sc-dust .folder'));
      sayBig(voice('dust'), 0);
      const r = dustCard.getBoundingClientRect();
      const { ctx } = TS.fitCanvas(dustCanvas, r.width, r.height, 2);
      ctx.fillStyle = '#15171d'; ctx.fillRect(0, 0, r.width, r.height);
      const fp = fingerprintSprite(110);
      const prints = [[r.width * 0.28, r.height * 0.45, -0.4], [r.width * 0.55, r.height * 0.38, 0.3], [r.width * 0.78, r.height * 0.55, 0.9]];
      dust = { ctx, w: r.width, h: r.height, fp, prints, cells: new Set(), started: performance.now(), done: false };
    });
    const msgs = ['Running fingerprints…', 'Comparing handwriting…', 'Checking alibis…', 'Interviewing the coffee machine…', 'Enhancing. Enhancing again…'];
    let k = 0; labLine.textContent = msgs[0];
    const cycle = setInterval(() => { if (!dust || dust.done) { clearInterval(cycle); return; } k = (k + 1) % msgs.length; labLine.textContent = msgs[k]; }, 1700);
    quickLab.hidden = true;
    const quickTimer = setTimeout(() => { if (dust && !dust.done) quickLab.hidden = false; }, 22000);
    sc.dust.exit = () => { clearInterval(cycle); clearTimeout(quickTimer); };
    checkDust();
  };
  function dustAt(x, y) {
    if (!dust) return;
    const { ctx, fp, prints } = dust, rr = 26;
    const pg = ctx.createRadialGradient(x, y, 0, x, y, rr);
    pg.addColorStop(0, 'rgba(230,230,240,0.22)'); pg.addColorStop(1, 'rgba(230,230,240,0)');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.clip();
    prints.forEach(([px, py, rot]) => { ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.globalAlpha = 0.5; ctx.drawImage(fp, -55, -55); ctx.restore(); });
    ctx.restore();
    dust.cells.add(Math.floor(x / (dust.w / 10)) + ':' + Math.floor(y / (dust.h / 6)));
    if (A.ctx && Math.random() < 0.3) A.noise({ filter: 'highpass', freq: 5000, dur: 0.06, vol: 0.03 });
    $('#dustHint').hidden = true;
    checkDust();
  }
  let dusting = false;
  dustCard.addEventListener('pointerdown', (e) => { dusting = true; dustCard.setPointerCapture(e.pointerId); const r = dustCard.getBoundingClientRect(); dustAt(e.clientX - r.left, e.clientY - r.top); });
  dustCard.addEventListener('pointermove', (e) => { if (!dusting) return; const r = dustCard.getBoundingClientRect(); dustAt(e.clientX - r.left, e.clientY - r.top); });
  ['pointerup', 'pointercancel'].forEach(ev => dustCard.addEventListener(ev, () => { dusting = false; }));
  function checkDust() {
    if (!dust || dust.done || S.blocked) return;
    if (S.analysis && !S.aiPending) {
      const covered = dust.cells.size / 60, waited = performance.now() - dust.started;
      if (covered > 0.18 || waited > 2600) {
        dust.done = true;
        labLine.textContent = S.aiFailed ? 'The lab’s down, so the quick lab took over. ' + S.analysis.exhibits.length + ' exhibits found.' : 'Prints lifted. ' + S.analysis.exhibits.length + ' exhibits found.';
        setFace(glitchImg, G.stars);
        sfx.sting(false);
        setTimeout(() => { if (stage.current === sc.dust) stage.go('desk'); }, 1200);
      } else setTimeout(checkDust, 400);
    }
  }
  TS.on('analysis', () => { if (stage.current === sc.dust) checkDust(); });
  quickLab.addEventListener('click', () => { if (aiCtl) aiCtl.abort(); S.analysis = CF.normalise(S.quick, S.text); S.aiPending = false; S.source = 'local'; TS.emit('analysis'); });

  /* Desk: sort the evidence */
  const pile = $('#pile'), trayCam = $('#trayCam'), trayBrain = $('#trayBrain');
  let queue = [], current = null, busy = false;
  sc.desk.enter = () => {
    office(false);
    layers({ vibes: true });
    queue = S.analysis.exhibits.slice();
    $('#countCam').textContent = '0'; $('#countBrain').textContent = '0'; $('#slipsCam').innerHTML = ''; $('#slipsBrain').innerHTML = '';
    strip('deskStrip', G.shades, voice('sort'));
    renderPile();
  };
  function exhibitCard(e, i, peek) {
    const isW = e.id === S.analysis.witness_id;
    const card = h('div', { class: 'exhibit' + (isW ? ' witness' : '') + (peek ? ' peek' : ''), role: peek ? null : 'group', 'aria-label': peek ? null : 'Exhibit ' + letter(i) + ': ' + e.text },
      h('span', { class: 'clip', 'aria-hidden': 'true' }),
      h('div', { class: 'tag' }, h('span', { text: isW ? 'Star witness statement' : 'Exhibit ' + letter(i) }), h('span', { text: (i + 1) + ' / ' + S.analysis.exhibits.length })),
      h('div', { class: 'txt', text: isW ? '“' + e.text.replace(/\.$/, '') + '.”' : e.text }),
      isW ? h('div', { class: 'sig', text: 'Signed: ______________' }) : null,
      h('span', { class: 'hint-l', text: 'CAMERA' }), h('span', { class: 'hint-r', text: 'BRAIN' })
    );
    return card;
  }
  const letter = (i) => String.fromCharCode(65 + i);
  function renderPile() {
    pile.innerHTML = '';
    const all = S.analysis.exhibits;
    const idx = all.length - queue.length;
    queue.slice(0, 3).reverse().forEach((e, k, arr) => {
      const depth = arr.length - 1 - k;
      const card = exhibitCard(e, idx + depth, depth > 0);
      card.style.transform = `translate(${depth * 6}px, ${depth * 8}px) rotate(${depth ? (depth % 2 ? 2.5 : -2) : -0.8}deg)`;
      card.style.zIndex = String(10 - depth);
      if (depth > 0) card.style.filter = 'brightness(0.92)';
      pile.append(card);
      if (depth === 0) { current = { e, card }; bindDrag(card); }
    });
    if (!queue.length) current = null;
    $('#sortHint').textContent = queue.length ? 'Swipe the slip left or right, or tap a tray' : '';
    if (A.ctx && queue.length) { const t = A.now(); for (let i = 0; i < 4; i++) A.typeKey({ when: t + i * 0.07, vol: 0.05 }); }
  }
  function bindDrag(card) {
    let sx = 0, sy = 0, dx = 0, dy = 0, t0 = 0, dragging = false;
    const hl = $('.hint-l', card), hr = $('.hint-r', card);
    card.addEventListener('pointerdown', (ev) => { if (busy) return; dragging = true; sx = ev.clientX; sy = ev.clientY; t0 = performance.now(); card.setPointerCapture(ev.pointerId); card.style.transition = 'none'; A.unlock(); });
    card.addEventListener('pointermove', (ev) => {
      if (!dragging) return;
      dx = ev.clientX - sx; dy = ev.clientY - sy;
      card.style.transform = `translate(${dx}px, ${dy * 0.4}px) rotate(${dx * 0.06 - 0.8}deg)`;
      const k = TS.clamp(Math.abs(dx) / 110, 0, 1);
      hl.style.opacity = dx < 0 ? k : 0; hr.style.opacity = dx > 0 ? k : 0;
      trayCam.classList.toggle('hot', dx < -40); trayBrain.classList.toggle('hot', dx > 40);
    });
    const end = () => {
      if (!dragging) return; dragging = false;
      trayCam.classList.remove('hot'); trayBrain.classList.remove('hot');
      const v = Math.abs(dx) / Math.max(1, performance.now() - t0);
      if (Math.abs(dx) > 90 || (Math.abs(dx) > 40 && v > 0.6)) sort(dx < 0 ? 'camera' : 'brain');
      else { card.style.transition = 'transform 0.35s cubic-bezier(.2,1.4,.4,1)'; card.style.transform = 'rotate(-0.8deg)'; hl.style.opacity = 0; hr.style.opacity = 0; }
      dx = dy = 0;
    };
    card.addEventListener('pointerup', end); card.addEventListener('pointercancel', end);
  }
  trayCam.addEventListener('click', () => sort('camera'));
  trayBrain.addEventListener('click', () => sort('brain'));
  global.addEventListener('keydown', (ev) => {
    if (stage.current !== sc.desk || busy) return;
    if (ev.key === 'ArrowLeft') sort('camera'); else if (ev.key === 'ArrowRight') sort('brain');
  });

  async function sort(kind) {
    if (!current || busy) return;
    busy = true;
    const { e, card } = current;
    const isW = e.id === S.analysis.witness_id;
    if (kind !== e.kind) {
      S.disagree++;
      const choice = await forensicsNote(e, kind);
      if (choice === 'move') kind = e.kind;
    }
    S.userKind[e.id] = kind;
    await flyToTray(card, kind);
    const tray = kind === 'camera' ? 'Cam' : 'Brain';
    const countEl = $('#count' + tray); countEl.textContent = String(Number(countEl.textContent) + 1);
    $('#slips' + tray).append(h('i'));
    if (kind === 'camera') sfx.shutter(); else sfx.bloop();
    queue.shift();
    if (isW) {
      if (kind === 'brain') {
        S.witnessTwist = true;
        malfunction($('#deskStrip')); sfx.glitch(); TS.buzz([30, 40, 30]);
        await strip('deskStrip', G.meltdown, voice('witness'));
        await TS.sleep(1300);
        setFace($('#deskStrip img'), G.dizzy);
        TS.track('witness_reveal', { twist: true });
      } else {
        await strip('deskStrip', G.sideeye, voice('witnessKept'));
        TS.track('witness_reveal', { twist: false });
        await TS.sleep(900);
      }
    } else if (kind === e.kind && Math.random() < 0.6) {
      strip('deskStrip', TS.pick([G.shades, G.smug2, G.idea]), TS.line(CF.VOICE.agree));
    }
    busy = false;
    if (queue.length) renderPile();
    else { current = null; TS.track('sorted', { disagree: S.disagree, n: S.analysis.exhibits.length }); setTimeout(() => stage.go('board'), 1300); }
  }
  function flyToTray(card, kind) {
    return new Promise(res => {
      const tray = kind === 'camera' ? trayCam : trayBrain;
      const cr = card.getBoundingClientRect(), tr = tray.getBoundingClientRect();
      const tx = tr.left + tr.width / 2 - (cr.left + cr.width / 2), ty = tr.top + tr.height / 2 - (cr.top + cr.height / 2);
      card.style.transition = TS.reduced() ? 'opacity 0.2s ease' : 'transform 0.45s cubic-bezier(.5,0,.2,1), opacity 0.45s ease';
      card.style.transform = `translate(${tx}px, ${ty}px) rotate(${kind === 'camera' ? -18 : 18}deg) scale(0.2)`;
      card.style.opacity = '0';
      sfx.slide();
      setTimeout(res, TS.reduced() ? 200 : 430);
    });
  }
  function forensicsNote(e, chosen) {
    return new Promise(res => {
      const other = e.kind === 'camera' ? 'Camera' : 'Brain';
      const note = h('div', { class: 'note', role: 'dialog', 'aria-label': 'Forensics note' },
        h('div', { class: 'who', text: 'Forensics note' }),
        h('p', { text: e.why }),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'ts-btn ts-btn-quiet', text: 'Keep it in ' + (chosen === 'camera' ? 'Camera' : 'Brain') }),
          h('button', { type: 'button', class: 'ts-btn', text: 'Move to ' + other })
        )
      );
      const [keep, move] = TS.$$('button', note);
      keep.addEventListener('click', () => { note.remove(); TS.track('sort_kept', {}); res('keep'); });
      move.addEventListener('click', () => { note.remove(); res('move'); });
      if (current) { current.card.style.transition = 'transform 0.3s ease'; current.card.style.transform = 'rotate(-0.8deg)'; TS.$$('.hint-l,.hint-r', current.card).forEach(x => { x.style.opacity = 0; }); }
      pile.append(note);
      setFace($('#deskStrip img'), G.forensic);
      if (A.ctx) A.paper({ vol: 0.12 });
      setTimeout(() => move.focus(), 50);
    });
  }

  /* Corkboard: blank spots */
  const factsEl = $('#facts'), blanksEl = $('#blanks'), stringsEl = $('#strings'), toLineup = $('#toLineup');
  sc.board.enter = async () => {
    office(false);
    layers({ vibes: true, brush: false });
    factsEl.innerHTML = ''; blanksEl.innerHTML = ''; stringsEl.innerHTML = '';
    S.flipped = new Set(); S.picked = null;
    toLineup.disabled = true; toLineup.textContent = 'Flip every blank spot';
    const camFacts = S.analysis.exhibits.filter(e => S.userKind[e.id] === 'camera').slice(0, 4);
    camFacts.forEach((e, i) => factsEl.append(h('div', { class: 'fact', 'data-id': e.id, style: { '--r': (i % 2 ? 1.4 : -1.2) + 'deg' }, text: e.text })));
    if (!camFacts.length) factsEl.append(h('div', { class: 'fact', text: 'No camera facts on file. Everything so far is interpretation.' }));
    S.analysis.unknowns.forEach((u, i) => {
      const b = h('button', { class: 'blank', type: 'button', 'data-id': u.id, 'data-about': u.about, 'aria-label': 'Blank spot ' + (i + 1) + ', tap to reveal' },
        h('div', { class: 'face front', text: '?' }),
        h('div', { class: 'face back', text: u.text }),
        h('span', { class: 'ring', 'aria-hidden': 'true', html: '<svg viewBox="0 0 200 140" preserveAspectRatio="none" width="100%" height="100%"><path d="M100 8 C 170 6, 196 40, 192 74 C 188 112, 140 134, 96 132 C 44 130, 8 108, 8 70 C 8 34, 46 10, 108 12"/></svg>' })
      );
      b.addEventListener('click', () => blankTap(b, u));
      blanksEl.append(b);
    });
    strip('boardStrip', G.ponder, voice('unknowns'));
    requestAnimationFrame(() => requestAnimationFrame(drawStrings));
  };
  function drawStrings() {
    const br = $('#board').getBoundingClientRect();
    stringsEl.setAttribute('viewBox', `0 0 ${br.width} ${br.height}`);
    let html = '';
    TS.$$('.blank', blanksEl).forEach(b => {
      const about = b.getAttribute('data-about');
      const f = $(`.fact[data-id="${about}"]`, factsEl) || TS.$$('.fact', factsEl)[0];
      if (!f) return;
      const fr = f.getBoundingClientRect(), r = b.getBoundingClientRect();
      const x1 = fr.left + fr.width / 2 - br.left, y1 = fr.top - br.top + 2, x2 = r.left + r.width / 2 - br.left, y2 = r.top - br.top + 2;
      const sag = 28;
      html += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} Q ${((x1 + x2) / 2).toFixed(1)} ${(Math.max(y1, y2) + sag).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="var(--string)" stroke-width="2" stroke-linecap="round" opacity="0.85"/>`;
    });
    stringsEl.innerHTML = html;
  }
  global.addEventListener('resize', () => { if (stage.current === sc.board) drawStrings(); if (rain) buildRain(); });
  async function blankTap(b, u) {
    A.unlock();
    if (!S.flipped.has(u.id)) {
      S.flipped.add(u.id); b.classList.add('flipped'); b.setAttribute('aria-label', u.text); sfx.flip(); setTimeout(sfx.pin, 300);
      if (S.flipped.size === S.analysis.unknowns.length) {
        await TS.sleep(500);
        strip('boardStrip', G.idea, voice('pick'));
        toLineup.textContent = 'Circle the one that matters most';
        TS.$$('.blank', blanksEl).forEach(x => x.setAttribute('aria-label', 'Circle: ' + x.querySelector('.back').textContent));
      }
      return;
    }
    if (S.flipped.size < S.analysis.unknowns.length) return;
    S.picked = u.id;
    TS.$$('.blank', blanksEl).forEach(x => x.classList.toggle('picked', x === b));
    sfx.string();
    toLineup.disabled = false; toLineup.textContent = 'Bring in the suspects';
    TS.track('unknown_pick', {});
  }
  toLineup.addEventListener('click', () => stage.go('lineup'));

  /* Lineup */
  const suspectsEl = $('#suspects'), dossier = $('#dossier'), chipDots = $('#chipDots'), chipLeft = $('#chipLeft'), lockIn = $('#lockIn');
  const marks = $('#marks');
  [200, 190, 180, 170, 160].forEach((cm, i) => marks.append(h('span', { style: { top: (i * 25 - 1) + '%' }, text: cm + ' cm' })));
  const placed = () => Object.values(S.chips).reduce((a, b) => a + b, 0);
  sc.lineup.enter = () => {
    office(false);
    layers({ vibes: false, brush: true, tense: true });
    suspectsEl.innerHTML = '';
    S.chips = {}; S.selected = null;
    let c = 0;
    S.analysis.suspects.forEach((s) => {
      const actor = s.fear ? FEAR_ACTOR : CAST[c++ % CAST.length];
      s._actor = actor; S.chips[s.id] = 0;
      const out = h('output', { text: '0' });
      const minus = h('button', { type: 'button', 'aria-label': 'Remove a hunch chip from ' + s.name, text: '−' });
      const plus = h('button', { type: 'button', 'aria-label': 'Add a hunch chip to ' + s.name, text: '+' });
      const btn = h('button', { type: 'button', class: 'suspect' + (s.fear ? ' fear' : ''), 'aria-pressed': 'false', 'aria-label': 'Question ' + s.name },
        h('span', { class: 'spot', 'aria-hidden': 'true' }),
        h('img', { src: actor.idle, alt: '' }),
        h('span', { class: 'placard', text: s.name }),
        h('span', { class: 'pct', text: '0%' })
      );
      const col = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' } }, btn, h('div', { class: 'chiprow' }, minus, out, plus));
      btn.addEventListener('click', () => select(s));
      plus.addEventListener('click', () => chip(s, 1));
      minus.addEventListener('click', () => chip(s, -1));
      s._els = { btn, out, minus, plus, pct: $('.pct', btn), img: $('img', btn) };
      suspectsEl.append(col);
    });
    renderChips();
    strip('lineupStrip', G.forensic, voice('lineup'));
    select(S.analysis.suspects[0]);
  };
  function select(s) {
    A.unlock();
    if (S.selected === s) return;
    S.analysis.suspects.forEach(x => { x._els.btn.setAttribute('aria-pressed', String(x === s)); x._els.img.src = x === s ? x._actor.talk : x._actor.idle; });
    S.selected = s; sfx.step();
    const cams = S.analysis.exhibits.filter(e => S.userKind[e.id] === 'camera');
    const fits = cams.map(e => {
      const aiCam = e.kind === 'camera';
      const ok = s.fits.includes(e.id);
      const cls = !aiCam ? 'q' : ok ? 'y' : 'n';
      return h('li', { class: cls }, h('i', { text: !aiCam ? '?' : ok ? '✓' : '✗' }), h('span', { text: e.text + (!aiCam ? ' (you filed this as fact; not checked)' : '') }));
    });
    dossier.innerHTML = '';
    dossier.append(
      h('h3', null, h('span', { text: s.name }), h('small', { text: 'Played by ' + s._actor.name })),
      h('p', { class: 'theory', text: s.theory }),
      h('p', { class: 'quote', text: '“' + (s.line || 'No comment.') + '”' }),
      h('div', { class: 'lbl', style: { font: '600 10.5px/1 var(--font-ui)', letterSpacing: '0.14em', color: 'var(--ink-soft)', textTransform: 'uppercase' }, text: 'Fits the camera facts' }),
      h('ul', { class: 'fits' }, fits.length ? fits : [h('li', { class: 'q' }, h('i', { text: '?' }), h('span', { text: 'No camera facts were filed.' }))]),
      h('div', { class: 'meta' }, h('span', null, 'Would need: ', h('b', { text: s.needs || '—' }))),
      h('div', { class: 'meta' }, h('span', null, 'Inspector’s estimate: ', h('b', { text: s.plausibility.toUpperCase() })), s.fear ? h('span', { text: 'The one you walked in with' }) : null)
    );
  }
  function chip(s, d) {
    A.unlock();
    const left = 10 - placed();
    if (d > 0 && left <= 0) { TS.ui.toast('All 10 chips are placed. Take one back to move it.'); return; }
    if (d < 0 && S.chips[s.id] <= 0) return;
    S.chips[s.id] += d; sfx.chip();
    if (S.selected !== s) select(s);
    renderChips();
  }
  function renderChips() {
    const used = placed();
    chipDots.innerHTML = ''; for (let i = 0; i < 10; i++) chipDots.append(h('i', { class: i < used ? 'used' : '' }));
    chipLeft.textContent = used === 10 ? 'All chips placed' : (10 - used) + (10 - used === 1 ? ' hunch chip' : ' hunch chips') + ' to place';
    S.analysis.suspects.forEach(s => {
      const n = S.chips[s.id] || 0; s._els.out.textContent = String(n); s._els.pct.textContent = n * 10 + '%';
      s._els.minus.disabled = n <= 0; s._els.plus.disabled = used >= 10;
    });
    lockIn.disabled = used !== 10;
  }
  lockIn.addEventListener('click', () => {
    const fear = S.analysis.suspects.find(s => s.fear);
    S.after = (S.chips[fear.id] || 0) * 10;
    TS.track('chips', { fear: S.after, before: S.certainty });
    if (A.ctx) sfx.sting(true);
    stage.go('verdict');
  });

  /* Verdict */
  const leadsEl = $('#leads');
  sc.verdict.enter = async () => {
    office(false);
    layers({ tense: false, vibes: true, brush: true });
    const a = S.analysis, fear = a.suspects.find(s => s.fear);
    const others = a.suspects.filter(s => !s.fear).sort((x, y) => (S.chips[y.id] || 0) - (S.chips[x.id] || 0));
    const top = others[0];
    let type;
    if (a.fear_support === 'strong') type = 'supported';
    else if (a.fear_support === 'some' && S.after >= 40) type = 'partly';
    else if (S.after <= 30) type = 'reopened';
    else if (S.after >= 70) type = 'thin';
    else type = 'pending';
    S.verdict = type;
    const STAMP = { supported: 'Concern supported', partly: 'Partly supported', reopened: 'Case reopened', thin: 'Unproven', pending: 'Case pending' };
    const stampEl = $('#verdictStamp');
    stampEl.textContent = STAMP[type]; stampEl.classList.toggle('amber', type === 'supported' || type === 'partly'); stampEl.classList.remove('slam');
    $('#fileNo').textContent = 'CASE No. ' + S.caseNo;
    $('#fileDate').textContent = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    $('#fileTitle').textContent = a.case_title;
    let sayTxt;
    const titleCase = (t) => t.toLowerCase().replace(/(^|[\s-])\w/g, m => m.toUpperCase());
    if (type === 'reopened') sayTxt = 'More than one explanation fits the facts.' + (top && S.chips[top.id] ? ' \u201c' + titleCase(top.name) + '\u201d got the most of your chips.' : '');
    else if (type === 'pending') sayTxt = 'Your fear is one live possibility among others. The facts on record don’t settle it yet.';
    else if (type === 'thin') sayTxt = 'Your hunch is strong, but nothing on record points to it more than the others. Worth checking before you believe it.';
    else sayTxt = (a.support_reason || 'The facts give this worry a real basis.') + ' It deserves a plan, not a pep talk.';
    if (a.safety === 'care') sayTxt += ' Someone qualified can tell you exactly where you stand.';
    $('#verdictSay').textContent = sayTxt;
    const fb = $('#barBefore'), fa = $('#barAfter');
    fb.style.width = '0'; fa.style.width = '0';
    $('#numBefore').textContent = S.certainty + '%'; $('#numAfter').textContent = S.after + '%';
    $('#helpSlot').innerHTML = '';
    S.lead = null; S.filed = false; $('#fileIt').textContent = 'File case'; $('#fileIt').disabled = false;
    // leads: the one that fills the circled blank spot goes first
    const leads = a.leads.slice().sort((x, y) => (y.for === S.picked) - (x.for === S.picked));
    leadsEl.innerHTML = '';
    leads.forEach(l => {
      const b = h('button', { type: 'button', class: 'lead', 'aria-pressed': 'false' }, h('em', { text: { ask: 'Find out', prepare: 'Prepare', steady: 'Steady' }[l.kind] || 'Lead' }), h('span', { text: l.text + (l.for && l.for === S.picked ? '  — fills your circled blank spot' : '') }));
      b.addEventListener('click', () => pickLead(b, l));
      leadsEl.append(b);
    });
    const faces = { supported: G.idea, partly: G.idea, reopened: G.sweat, thin: G.ponder, pending: G.ponder };
    const lineKey = { supported: 'supported', partly: 'supported', reopened: 'reopened', thin: 'thin', pending: 'pending' }[type];
    await TS.sleep(350);
    stampEl.classList.add('slam'); sfx.stamp(); TS.buzz(25); shake();
    requestAnimationFrame(() => { fb.style.width = S.certainty + '%'; setTimeout(() => { fa.style.width = S.after + '%'; }, 450); });
    strip('verdictStrip', faces[type], voice(lineKey));
    TS.track('complete', { verdict: type, before: S.certainty, after: S.after, support: a.fear_support, source: S.source, twist: S.witnessTwist, disagree: S.disagree, seconds: Math.round((Date.now() - TS.game.startedAt) / 1000) });
  };
  function pickLead(b, l) {
    S.lead = l;
    TS.$$('.lead', leadsEl).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    TS.track('lead_pick', { kind: l.kind });
    if (A.ctx) A.click({ vol: 0.1 });
    const slot = $('#helpSlot');
    slot.innerHTML = '';
    const quoted = /[“"](.+?)[”"]/.exec(l.text);
    if (quoted) {
      const copy = h('button', { type: 'button', class: 'ts-btn ts-btn-quiet', text: 'Copy the message' });
      copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(quoted[1]); copy.textContent = 'Copied'; } catch (e) { copy.textContent = 'Press and hold the lead to copy'; } });
      slot.append(h('div', { class: 'copyrow' }, copy));
    }
    TS.ui.helpCheck(slot, { question: 'Did this case help?' });
  }
  $('#fileIt').addEventListener('click', () => {
    if (S.filed) return;
    S.filed = true;
    CF.fileCase({ id: S.caseNo + '-' + Date.now(), no: S.caseNo, title: S.analysis.case_title, date: Date.now(), before: S.certainty, after: S.after, verdict: S.verdict, outcome: null });
    $('#fileIt').textContent = 'Filed'; $('#fileIt').disabled = true;
    TS.track('file_case', {});
    TS.ui.toast('Filed in your Case Archive. Come back and record what actually happened.');
  });
  $('#newCase').addEventListener('click', () => { TS.track('replay', {}); caseText.value = ''; S.sample = null; TS.$$('.ts-chip', samplesEl).forEach(x => x.setAttribute('aria-pressed', 'false')); stage.go('intake'); });
  $('#shareCover').addEventListener('click', shareCover);

  /* Case archive: the long game. Tracks how often the fear turned out true. */
  $('#archiveBtn').addEventListener('click', openArchive);
  function openArchive() {
    const close = () => wrap.remove();
    const body = h('div', { class: 'arch' });
    const render = () => {
      body.innerHTML = '';
      const list = CF.archive();
      const resolved = list.filter(c => c.outcome && c.outcome !== 'unknown');
      const came = resolved.filter(c => c.outcome === 'true').length;
      body.append(h('p', { class: 'record', text: resolved.length ? `Resolved cases: ${resolved.length}. Your fear came true in ${came}.` : 'File a case, then come back once you know what happened. Over time this shows how often your fears turn out true.' }));
      if (!list.length) body.append(h('p', { class: 'ts-sheet-note', text: 'No cases filed yet.' }));
      list.forEach(c => {
        const status = c.outcome === 'true' ? 'Fear came true' : c.outcome === 'other' ? 'Something else happened' : c.outcome === 'unknown' ? 'Still unknown' : 'Open';
        const item = h('div', { class: 'arch-item' },
          h('b', { text: c.title }),
          h('div', { class: 'meta' }, h('span', null, 'No. ', h('b', { text: c.no })), h('span', { text: new Date(c.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) }), h('span', null, 'Fear: ', h('b', { text: c.before + '% → ' + c.after + '%' })), h('span', { text: status }))
        );
        if (!c.outcome || c.outcome === 'unknown') {
          const row = h('div', { class: 'row' });
          [['true', 'The fear came true'], ['other', 'Something else'], ['unknown', 'Still unknown']].forEach(([v, label]) => {
            const b = h('button', { type: 'button', class: 'ts-chip', text: label });
            b.addEventListener('click', () => { CF.updateCase(c.id, { outcome: v }); TS.track('case_outcome', { outcome: v }); render(); });
            row.append(b);
          });
          item.append(h('span', { class: 'ts-field-label', text: 'What actually happened?' }), row);
        }
        body.append(item);
      });
    };
    render();
    const wrap = h('div', { class: 'ts-sheet-wrap' }, h('div', { class: 'ts-sheet-scrim', onclick: close }),
      h('section', { class: 'ts-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Case archive' },
        h('div', { class: 'ts-sheet-head' }, h('h2', { text: 'Case archive' }), (() => { const b = h('button', { type: 'button', class: 'ts-icon-btn', 'aria-label': 'Close', html: TS.ui.ICON.close }); b.addEventListener('click', close); return b; })()),
        h('p', { class: 'ts-sheet-note', text: 'Only titles and numbers are kept, on this device. Never what you typed.' }), body));
    document.body.append(wrap);
  }

  /* Share: a redacted case-file cover. The redaction is the style. */
  async function shareCover() {
    try { await Promise.all(['72px Anton', '40px "Special Elite"', '60px Limelight'].map(f => document.fonts.load(f))); } catch (e) { /* fallback */ }
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#1b140f'; g.fillRect(0, 0, W, H);
    const fg = g.createLinearGradient(0, 160, 0, H - 80); fg.addColorStop(0, '#e6c88f'); fg.addColorStop(1, '#c9a464');
    g.fillStyle = fg; g.beginPath(); g.roundRect ? g.roundRect(80, 190, W - 160, H - 300, 18) : g.rect(80, 190, W - 160, H - 300); g.fill();
    g.beginPath(); g.roundRect ? g.roundRect(80, 130, 360, 90, 16) : g.rect(80, 130, 360, 90); g.fill();
    g.fillStyle = '#5d554a'; g.font = '38px "Special Elite", "Courier New", monospace'; g.fillText('CASE No. ' + S.caseNo, 112, 190);
    g.fillStyle = '#23201b'; g.font = '64px Limelight, Georgia, serif'; g.fillText('CASE FILE', 140, 330);
    g.font = '40px "Special Elite", "Courier New", monospace'; g.fillStyle = '#23201b';
    const title = (S.analysis.case_title || 'The Case of the Closed Conclusion').toUpperCase();
    const m = /^(THE CASE OF THE)\s+(.*)$/.exec(title);
    g.fillText(m ? m[1] : 'THE CASE OF', 140, 430);
    const words = (m ? m[2] : title).split(/\s+/);
    let x = 140, y = 500;
    words.forEach(wd => { const ww = Math.max(70, g.measureText(wd).width); if (x + ww > W - 140) { x = 140; y += 70; } g.fillStyle = '#111'; g.fillRect(x, y - 40, ww, 52); x += ww + 24; });
    const STAMP = { supported: 'CONCERN SUPPORTED', partly: 'PARTLY SUPPORTED', reopened: 'CASE REOPENED', thin: 'UNPROVEN', pending: 'CASE PENDING' };
    g.save(); g.translate(W / 2, 820); g.rotate(-0.16);
    const col = (S.verdict === 'supported' || S.verdict === 'partly') ? '#b9741a' : '#b8322a';
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 12; g.font = '120px Anton, Impact, sans-serif'; g.textAlign = 'center';
    const st = STAMP[S.verdict] || 'CASE REOPENED'; const sw = g.measureText(st).width;
    g.globalAlpha = 0.88; g.strokeRect(-sw / 2 - 34, -118, sw + 68, 160); g.fillText(st, 0, 4); g.restore();
    g.fillStyle = '#23201b'; g.font = '44px "Special Elite", "Courier New", monospace'; g.textAlign = 'left';
    g.fillText('Certainty in the fear: ' + S.certainty + '% → ' + S.after + '%', 140, 1010);
    g.font = '34px "IBM Plex Sans Condensed", sans-serif'; g.fillStyle = '#5d554a'; g.fillText('Investigated with Inspector Glitch  ·  ThinkStill', 140, 1110);
    try { const img = new Image(); img.src = G.sweat; await img.decode(); g.drawImage(img, W - 330, 180, 220, 220); } catch (e) { /* image optional */ }
    TS.ui.share(c, { heading: 'Share the case cover', filename: 'case-file', alt: 'A redacted case-file cover with the verdict stamp', note: 'The details are redacted. Only the verdict and your numbers show.' });
  }

  /* ---------------- boot ---------------- */
  TS.ui.bar(app, { mode: 'Reframe · Case File' });
  TS.on('theme', () => { rain = null; if (!room.hidden) buildRain(); });
  global.addEventListener('resize', () => { if (stage.current === sc.intake) placeGlitch($('#intakeFolder')); if (stage.current === sc.closed) placeGlitch($('#closedFolder')); });
  document.addEventListener('visibilitychange', () => { if (!A.ctx) return; if (document.hidden) A.ctx.suspend().catch(() => {}); else A.ctx.resume().catch(() => {}); });
  TS.ready(() => {
    stage.go('intake', {}, { duration: 0 });
    TS.loop((dt) => { musicTick(); drawRain(dt); });
  });
  global.__casefile = { S, stage, sc };
})(window);
