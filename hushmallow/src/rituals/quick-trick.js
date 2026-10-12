// QUICK TRICK — plays one trick from the locked ThinkStill 1,000.
// Any Mallow, in its own realm. The copy is used exactly as locked; this
// module only turns it into something you do:
//
//   0 MISSION    the Mallow's line (Jolly / Cheeky / Unfiltered) + the setup
//   1 CALL IT    lock in a guess first (dial, yes/no, choice, count or seal)
//   2 YOUR MOVE  do the move, paced by a ring you start yourself
//   3 PLOT TWIST flip the card, then check your guess against what happened
//   4 MIND BEND  the bend spirals in; why it works is one tap away
//
// Paid tricks are attention and action tricks. Ultra plot twists are the
// reframing ones; the host only runs those with an Ultra entitlement.

import { h, wait, openSheet } from '../app/ui.js';
import { MALLOWS } from '../mallows/registry.js';
import { titleCase } from '../engine/tricks.js';

export const meta = { id: 'quick-trick' };

const ACCENT = { glitzi: '#3ee8ff', blubi: '#7fd4ff', zuzu: '#39f0ff', boppo: '#ffd23a', pipzi: '#ffcf4a', loomi: '#a8f0ff', noomi: '#fff4c8' };
const GUESS_FACE = { called: { proud: 0.6, happy: 0.4 }, close: { curious: 0.7, playful: 0.3 }, whoa: { surprised: 0.7, awe: 0.3 } };

export async function run(ctx) {
  const { world, audio, haptic, setMove, dock, signal } = ctx;
  const t = ctx.ritual.trick;
  const m = MALLOWS[t.mallow];
  const rm = ctx.reducedMotion;
  const realm = () => world.realm;
  const say = (text, ms = 3200) => ctx.say(text, { who: m.name, ms });
  const vibe = ctx.app?.prefs?.get?.('trickVoice') || 'jolly';
  const accent = ACCENT[t.mallow] || '#ffd98a';
  const ultra = t.tier === 'ultra';
  const result = { completed: false, trick: t.ref, guess: null, verdict: null, replays: 0, timed: 0 };
  const cleanups = [];
  const until = (fn) => new Promise((resolve) => { fn(resolve); signal.addEventListener('abort', () => resolve(null), { once: true }); });
  const label = ultra ? 'Plot twist · Ultra' : `Quick trick · ${m.name}`;

  // the sealed guess rides along at the top of the dock for the rest of the trick
  const callChip = () => (result.guess ? h('div', { class: 'qt-call', style: { '--qt-accent': `${accent}88` } }, `Your call: ${result.guess}`) : null);
  const fill = (...kids) => dock.replaceChildren(...kids.filter(Boolean));
  const cleanup = () => { cleanups.splice(0).forEach((f) => { try { f(); } catch { /* already gone */ } }); };
  signal.addEventListener('abort', cleanup, { once: true });

  realm()?.setMood?.({ clarity: 0.3, agitation: 0.3 });
  realm()?.transform?.(0);

  // ============================================================ MISSION ==
  setMove(0, { eyebrow: label, title: titleCase(t.title), prompt: t.mission });
  world.place({ x: 50, y: 40, scale: 0.78 });
  world.setEmotion({ playful: 0.6, curious: 0.4 }, 0.7);
  world.react('hop');
  say(t.lines[vibe] || t.lines.jolly, 3600);
  const go = h('button', { class: `btn ${ultra ? 'ultra' : 'primary'} block` }, t.care === 'extra' ? 'Okay, let’s go' : 'Let’s play');
  const small = h('button', { class: 'btn ghost block', style: { minHeight: '40px', fontSize: '14px' } }, 'Small print');
  small.onclick = () => openSheet({ title: 'Before you start', body: h('p', { style: { margin: 0, color: 'var(--text-2)' } }, t.safety) });
  fill(
    t.care === 'extra'
      ? h('div', { class: 'card', style: { padding: '14px', marginBottom: '10px' } },
        h('div', { class: 'eyebrow', style: { color: accent } }, 'Gentle one'), h('p', { style: { margin: '6px 0 0' } }, t.safety))
      : null,
    h('p', { class: 'qt-note' }, `About ${t.sec} seconds. No wrong answers.`),
    go, t.care === 'extra' ? null : small);
  if (!(await until((r) => { go.onclick = () => r(true); }))) return result;
  audio.ui?.('open');

  // replays loop back here
  for (;;) {
    // ========================================================== CALL IT ==
    setMove(1, { eyebrow: 'Call it first', title: 'What’s your guess?', prompt: t.rule });
    world.place({ x: 50, y: 37, scale: 0.7 });
    world.setEmotion({ curious: 0.8, playful: 0.2 }, 0.75);
    realm()?.setMood?.({ clarity: 0.4 });
    const guess = await callIt();
    if (signal.aborted) return result;
    result.guess = guess;
    world.react('nod');
    audio.fx?.('chime', { pitch: 1.1 });
    haptic('success');
    realm()?.pulse?.('success', { nx: 0.5, ny: 0.4 });
    realm()?.transform?.(0.2);
    await wait(500);

    // ======================================================== YOUR MOVE ==
    setMove(2, { eyebrow: 'Your move', title: 'Try it now', prompt: t.move });
    world.place({ x: 50, y: 33, scale: 0.6 });
    world.setEmotion({ determined: 0.5, curious: 0.5 }, 0.7);
    const secs = moveSeconds(t);
    const moved = await yourMove(secs);
    if (signal.aborted || moved == null) return result;
    result.timed = moved;
    realm()?.transform?.(0.5);

    // ======================================================= PLOT TWIST ==
    setMove(3, { eyebrow: 'Plot twist', title: 'Flip it', prompt: 'Tap the card.' });
    world.place({ x: 50, y: 28, scale: 0.55 });
    world.setEmotion({ curious: 0.6, surprised: 0.4 }, 0.7);
    const verdict = await plotTwist();
    if (signal.aborted || verdict == null) return result;
    result.verdict = verdict;
    world.setEmotion(GUESS_FACE[verdict], 0.85);
    world.react(verdict === 'whoa' ? 'gasp' : verdict === 'called' ? 'success' : 'nod');
    say(verdict === 'called' ? pickLine(m.voice.cheer) || 'Called it. Show-off.' : verdict === 'whoa' ? 'Ha! Brains are weird. That’s the fun bit.' : 'Close-ish. Guessing is how you catch it.', 2600);
    realm()?.transform?.(0.75);
    await wait(900);

    // ======================================================== MIND BEND ==
    setMove(4, { eyebrow: 'Mind bend', title: '', prompt: '' });
    world.place({ x: 50, y: 30, scale: 0.6 });
    world.setEmotion({ awe: 0.7, happy: 0.3 }, 0.8);
    realm()?.transform?.(1);
    realm()?.pulse?.('clear', { nx: 0.5, ny: 0.35 });
    audio.fx?.('clear', { intensity: 0.7 });
    haptic('success');
    const next = await mindBend();
    if (signal.aborted || next == null) return result;
    if (next === 'again') {
      result.replays++;
      result.guess = null;
      realm()?.transform?.(0.1);
      audio.ui?.('whoosh');
      continue;
    }
    break;
  }

  // =========================================================== FINALE ==
  fill();
  world.place({ x: 50, y: 50, scale: 1 });
  world.setEmotion({ happy: 0.6, playful: 0.4 }, 0.8);
  world.react('celebrate');
  await say(pickLine(m.voice.cheer) || 'Trick complete.', 2200);
  cleanup();
  result.completed = true;
  result.summary = [
    { label: ultra ? 'Plot twist' : 'Quick trick', text: `${titleCase(t.title)} with ${m.name}` },
    { label: 'Your call', text: result.guess || '—' },
    { label: 'How it went', text: { called: 'Called it', close: 'Not quite', whoa: 'Totally surprised' }[result.verdict] || '—' },
    { label: 'Mind bend', text: t.bend },
  ];
  result.share = { title: titleCase(t.title), subtitle: `A ${ultra ? 'plot twist' : 'quick trick'} with ${m.name}` };
  return result;

  // ------------------------------------------------------------ pieces --
  function callIt() {
    const p = t.predict;
    const lock = h('button', { class: `btn ${ultra ? 'ultra' : 'primary'} block`, style: { marginTop: '12px' } }, 'Lock it in');
    return until((done) => {
      if (p.kind === 'percent') {
        const out = h('div', { 'aria-hidden': 'true', style: { font: '800 54px var(--font-display)', textAlign: 'center', color: accent, textShadow: `0 0 24px ${accent}66` } }, '50%');
        const range = h('input', { type: 'range', class: 'range', min: 0, max: 100, step: 5, value: 50, 'aria-label': 'Your guess, 0 to 100 percent' });
        range.addEventListener('input', () => { out.textContent = `${range.value}%`; haptic('tick'); audio.fx?.('rotate-tick', { pitch: 0.8 + range.value / 160 }); });
        lock.onclick = () => done(`${range.value}%`);
        fill(h('div', { class: 'card', style: { padding: '16px' } }, out, range), lock);
      } else if (p.kind === 'yesno' || p.kind === 'either') {
        const opts = p.kind === 'yesno' ? ['Yes', 'No'] : p.options.map((o) => o.charAt(0).toUpperCase() + o.slice(1));
        const grid = h('div', { class: 'choice-grid', style: { gridTemplateColumns: opts.length === 3 ? '1fr 1fr 1fr' : '1fr 1fr' } },
          ...opts.map((o) => h('button', { class: 'choice', style: { textAlign: 'center', fontSize: o.length > 28 ? '14px' : '16px' }, onclick: () => done(o) }, o)));
        fill(grid);
      } else if (p.kind === 'count') {
        let n = 3;
        const num = h('div', { 'aria-live': 'polite', style: { font: '800 54px var(--font-display)', minWidth: '84px', textAlign: 'center', color: accent } }, String(n));
        const step = (d) => { n = Math.max(0, Math.min(99, n + d)); num.textContent = String(n); haptic('tick'); audio.fx?.('rotate-tick', { pitch: 0.8 + n / 30 }); if (!rm) num.animate?.([{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }], 220); };
        const minus = h('button', { class: 'icon-btn', style: { width: '56px', height: '56px', fontSize: '26px' }, 'aria-label': 'One fewer', onclick: () => step(-1) }, '−');
        const plus = h('button', { class: 'icon-btn', style: { width: '56px', height: '56px', fontSize: '26px' }, 'aria-label': 'One more', onclick: () => step(1) }, '+');
        lock.onclick = () => done(String(n));
        fill(h('div', { class: 'card', style: { padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px' } }, minus, num, plus), lock);
      } else {
        sealGuess(done);
      }
    });
  }

  // press and hold to seal a guess you keep in your head
  function sealGuess(done) {
    const ring = h('canvas', { width: 264, height: 264, 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', width: '100%', height: '100%' } });
    const txt = h('span', { style: { position: 'relative', font: '800 15px var(--font-display)', letterSpacing: '.06em' } }, 'HOLD');
    const btn = h('button', { class: 'hold-target', 'aria-label': 'Make a guess in your head, then press and hold to seal it. Or press Enter.' }, ring, txt);
    const tap = h('button', { class: 'btn ghost block' }, 'Can’t hold? Tap to seal');
    fill(h('p', { class: 'qt-note' }, 'Make your guess in your head. Then seal it.'), btn, tap);
    const g = ring.getContext('2d');
    let held = false, k = 0, raf = 0, prev = performance.now(), finished = false;
    const draw = () => {
      g.clearRect(0, 0, 264, 264);
      const R = 58 + k * 8;
      const gr = g.createRadialGradient(132, 132, 10, 132, 132, R + 24);
      gr.addColorStop(0, `${accent}ee`); gr.addColorStop(0.6, `${accent}44`); gr.addColorStop(1, `${accent}00`);
      g.fillStyle = gr; g.beginPath(); g.arc(132, 132, R + 24, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1b1440'; g.beginPath(); g.arc(132, 132, 50, 0, Math.PI * 2); g.fill();
      g.strokeStyle = accent; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.arc(132, 132, 58, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke();
    };
    const tick = (now) => {
      // real elapsed time (not capped per frame) so a janky phone doesn't make holding take longer
      const dt = Math.max(0, Math.min(0.25, (now - prev) / 1000)); prev = now;
      k = held ? Math.min(1, k + dt / 1.1) : Math.max(0, k - dt * 1.5);
      draw();
      if (held && Math.random() < 0.3) haptic('tick');
      if (k >= 1) return seal();
      raf = requestAnimationFrame(tick);
    };
    const seal = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      txt.textContent = 'SEALED';
      done('sealed in your head');
    };
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); held = true; btn.setPointerCapture?.(e.pointerId); audio.fx?.('portal', { intensity: 0.3 }); });
    const off = () => { held = false; };
    btn.addEventListener('pointerup', off); btn.addEventListener('pointercancel', off);
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seal(); } });
    tap.onclick = seal;
    raf = requestAnimationFrame(tick);
    signal.addEventListener('abort', () => cancelAnimationFrame(raf), { once: true });
  }

  function yourMove(secs) {
    const ring = h('canvas', { width: 264, height: 264, 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', width: '100%', height: '100%' } });
    const txt = h('span', { style: { position: 'relative', font: '800 22px var(--font-display)' } }, 'GO');
    const start = h('button', { class: 'hold-target', 'aria-label': `Start a ${secs} second pacing ring` }, ring, txt);
    const doneBtn = h('button', { class: `btn ${ultra ? 'ultra' : 'primary'} block`, style: { marginTop: '12px' } }, 'I did it');
    const cue = h('p', { class: 'qt-note', 'aria-live': 'polite', style: { margin: '10px 0 0', minHeight: '20px' } }, `Tap GO for a ${secs}-second ring, or just do it your way.`);
    fill(callChip(), start, cue, doneBtn);
    const g = ring.getContext('2d');
    let t0 = 0, raf = 0, rung = false;
    const draw = (k) => {
      g.clearRect(0, 0, 264, 264);
      g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 8;
      g.beginPath(); g.arc(132, 132, 60, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = accent; g.lineCap = 'round';
      g.beginPath(); g.arc(132, 132, 60, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke();
      g.fillStyle = '#1b1440'; g.beginPath(); g.arc(132, 132, 50, 0, Math.PI * 2); g.fill();
    };
    draw(0);
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / (secs * 1000));
      draw(k);
      txt.textContent = String(Math.ceil(secs * (1 - k)));
      realm()?.transform?.(0.2 + k * 0.3);
      if (k >= 1) {
        txt.textContent = '✓';
        cue.textContent = 'Time. Notice what happened.';
        audio.fx?.('chime', { pitch: 1.3 });
        haptic('success');
        world.react('nod');
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    start.onclick = () => {
      if (rung) return;
      rung = true;
      t0 = performance.now();
      cue.textContent = 'Go. Ring’s running.';
      audio.fx?.('portal', { intensity: 0.4 });
      haptic('light');
      raf = requestAnimationFrame(tick);
    };
    signal.addEventListener('abort', () => cancelAnimationFrame(raf), { once: true });
    return until((done) => { doneBtn.onclick = () => { cancelAnimationFrame(raf); done(rung ? Math.round(Math.min(secs, (performance.now() - t0) / 1000)) : 0); }; });
  }

  function plotTwist() {
    const face = (side, kids, extra = {}) => h('div', { style: {
      position: 'absolute', inset: '0', borderRadius: '22px', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
      display: 'grid', placeItems: 'center', padding: '18px', textAlign: 'center', ...extra } }, ...kids);
    const front = face('front', [h('div', {},
      h('div', { 'aria-hidden': 'true', style: { font: '800 54px var(--font-display)', color: accent, textShadow: `0 0 28px ${accent}` } }, '?'),
      h('div', { class: 'eyebrow', style: { marginTop: '4px' } }, 'Tap to flip'))],
    { background: `radial-gradient(120% 120% at 50% 0%, ${accent}33, rgba(20,14,52,.92) 60%)`, border: `1px solid ${accent}66`, boxShadow: `0 0 30px ${accent}22` });
    const back = face('back', [h('p', { style: { margin: 0, font: '700 18px/1.35 var(--font-ui)', color: '#1d1638' } }, t.twist)],
      { background: 'rgba(255,255,255,.95)', transform: 'rotateY(180deg)' });
    const inner = h('div', { style: { position: 'absolute', inset: '0', transformStyle: 'preserve-3d', transition: rm ? 'none' : 'transform 700ms cubic-bezier(.2,.8,.2,1.15)' } }, front, back);
    const card = h('button', { 'aria-label': 'Plot twist card. Press to flip.', style: { position: 'relative', width: '100%', height: '158px', perspective: '900px', background: 'none', border: '0', padding: '0', cursor: 'pointer', touchAction: 'manipulation' } }, inner);
    fill(callChip(), card);
    return until((done) => {
      let flipped = false;
      card.onclick = async () => {
        if (flipped) return;
        flipped = true;
        if (rm) { front.style.visibility = 'hidden'; back.style.transform = 'none'; } else inner.style.transform = 'rotateY(180deg)';
        card.setAttribute('aria-label', `Plot twist: ${t.twist}`);
        audio.fx?.('separate', { intensity: 0.6 });
        haptic('pop');
        world.react('gasp');
        realm()?.pulse?.('burst', { nx: 0.5, ny: 0.45 });
        setMove(3, { eyebrow: 'Plot twist', title: 'How did your guess do?', prompt: '' });
        await wait(rm ? 100 : 650);
        const row = h('div', { class: 'choice-grid', style: { gridTemplateColumns: '1fr 1fr 1fr', marginTop: '12px' } },
          ...[['called', 'Called it'], ['close', 'Not quite'], ['whoa', 'Whoa']].map(([id, l]) => h('button', { class: 'choice', style: { textAlign: 'center', minHeight: '54px' }, onclick: () => done(id) }, l)));
        dock.append(row);
      };
    });
  }

  function mindBend() {
    const words = t.bend.split(/\s+/);
    const line = h('p', { 'aria-label': t.bend, style: { margin: 0, font: '700 22px/1.3 var(--font-display)', textAlign: 'center', color: '#fff', textShadow: `0 0 24px ${accent}88` } },
      ...words.map((w, i) => h('span', { 'aria-hidden': 'true', style: { display: 'inline-block', marginRight: '.28em', opacity: rm ? '1' : '0',
        transform: rm ? 'none' : `rotate(${(i % 2 ? 1 : -1) * 40}deg) scale(.4) translateY(14px)`, transition: `opacity 500ms ${i * 70}ms, transform 700ms ${i * 70}ms var(--ease-out)` } }, w)));
    const why = h('button', { class: 'btn block', style: { minHeight: '44px', fontSize: '15px' } }, 'Why does this work?');
    why.onclick = () => openSheet({ title: 'Why it works', body: h('div', {},
      h('p', { style: { margin: '0 0 10px' } }, t.why),
      h('p', { class: 'muted', style: { margin: '0 0 10px', fontSize: '14px' } }, `Draws on: ${t.basis}.`),
      h('p', { class: 'muted', style: { margin: 0, fontSize: '14px' } }, t.safety)) });
    const again = h('button', { class: 'btn block', style: { fontSize: '14px', minHeight: '48px' } }, t.loop);
    const done = h('button', { class: `btn ${ultra ? 'ultra' : 'primary'} block` }, 'Done');
    fill(h('div', { class: 'card', style: { padding: '20px 16px', marginBottom: '10px', background: 'rgba(20,14,52,.78)' } }, line), why, again, done);
    if (!rm) requestAnimationFrame(() => requestAnimationFrame(() => line.querySelectorAll('span').forEach((s) => { s.style.opacity = '1'; s.style.transform = 'none'; })));
    return until((resolve) => { again.onclick = () => resolve('again'); done.onclick = () => resolve('done'); });
  }
}

function pickLine(arr) { return Array.isArray(arr) && arr.length ? arr[Math.floor(Math.random() * arr.length)] : null; }

/** Seconds for the pacing ring: what the move says ("for 20 sec"), else a share of the trick. */
export function moveSeconds(t) {
  const m = /(\d+)\s*(?:sec|seconds?|s)\b/i.exec(t.move);
  const n = m ? Number(m[1]) : Math.round(t.sec * 0.45);
  return Math.max(10, Math.min(60, n));
}
