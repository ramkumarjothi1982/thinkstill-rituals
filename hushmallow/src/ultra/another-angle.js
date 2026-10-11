// ANOTHER ANGLE — Hushmallow Ultra's Reframe experience, guided by Zuzu in
// the Spiral Observatory. Entirely rule-based: authored frameworks + the
// person's own words. It never invents facts about anyone, never insists on
// a positive explanation, and keeps "your worry might be partly right" and
// "not enough information yet" on the table.
//
//  0 TELL        what happened + what your brain decided (safety check first)
//  1 SPLIT       Fact or Fiction: drag the pieces into two portals
//  2 X-RAY       sweep a lens over the thought to find hidden assumptions
//  3 ORBIT       Evidence Orbit: fits / doesn't fit / still unknown
//  4 PORTAL      Perspective Portal: rotate through plausible angles, rate them
//  5 NEXT        the Possibility Machine: one useful next move (+ practise words)
//  6 STAR MAP    your new angle, assembled

import { h, wait, openSheet } from '../app/ui.js';

const SVGNS = 'http://www.w3.org/2000/svg';

export async function run(ctx, { frameworks: F, engine: E }) {
  const { world, audio, haptic, setMove, dock, signal } = ctx;
  const say = (t, ms, who = 'Zuzu') => ctx.say(t, { who, ms });
  const realm = () => world.realm;
  const out = { completed: false, scenario: null, facts: [], added: [], patterns: [], evidence: { supports: [], against: [], missing: [] }, kept: [], dismissed: [], next: null };
  let scenarioForLines = F.GENERAL;
  const guide = (stage) => {
    try { const c = E.pickCameo(scenarioForLines, stage); if (c?.text && c.role !== 'cameo') return c.text; } catch { /* fall through */ }
    return F.GUIDE_LINES?.zuzu?.[stage]?.[0] || null;
  };
  const stageEl = h('div', { class: 'angle-stage', style: { position: 'fixed', inset: '0', zIndex: '3', pointerEvents: 'none' } });
  document.body.append(stageEl);
  const cleanup = () => { stageEl.remove(); world.fx.replaceChildren(); world.fx.classList.remove('live'); portalSound?.stop?.(); };
  signal.addEventListener('abort', cleanup);
  let portalSound = null;
  const waitFor = (btn) => new Promise((r) => { btn.onclick = () => r(true); signal.addEventListener('abort', () => r(false)); });

  world.setEmotion({ curious: 0.7, hopeful: 0.3 }, 0.7);
  realm()?.setMood?.({ clarity: 0.1, agitation: 0.35, heaviness: 0.2, warmth: 0.2 });

  // ================================================================ TELL ==
  setMove(0, { eyebrow: 'Hushmallow Ultra · Another Angle', title: 'There’s more than one way to see it.', prompt: '' });
  world.place({ x: 50, y: 25, scale: 0.6 });
  const ta = h('textarea', { class: 'feel', 'aria-label': 'What happened, and what did your brain decide it means?', placeholder: 'e.g. “My boss criticised my work. I think I’m terrible at my job.”' });
  ta.value = ctx.input.text || '';
  const go = h('button', { class: 'btn ultra block' }, 'Ready for the plot twist?');
  dock.replaceChildren(h('div', { class: 'card', style: { padding: '14px' } },
    h('p', { style: { margin: '0 0 8px', fontWeight: 700 } }, 'What happened — and what did your brain decide it means?'), ta,
    h('p', { class: 'muted', style: { margin: '8px 0 10px' } }, 'Two sentences is plenty. Your words stay on this phone.'), go));
  say(guide('welcome') || 'Ooh, a thought to look at! Tell me what happened, and what your brain made of it.', 3600);
  for (;;) {
    if (!(await waitFor(go))) return out;
    if (ta.value.trim().length < 6) { ctx.toast('Tell Zuzu a little more first'); continue; }
    break;
  }
  const text = ta.value.trim();
  const safety = E.checkSafety(text);
  if (!safety.reframeAppropriate) {
    world.setStage('comforting');
    dock.replaceChildren(h('div', { class: 'card' },
      h('h3', {}, safety.level === 'crisis' ? 'This needs a real person' : 'This isn’t one to reframe'),
      h('p', {}, safety.message),
      h('button', { class: 'btn primary block', style: { marginTop: '12px' }, onclick: () => import('../app/scenes/support.js').then((m) => m.openSupport(ctx.app || { world }, { urgent: safety.level === 'crisis' })) }, 'See support options')));
    await new Promise((r) => signal.addEventListener('abort', r));
    return out;
  }

  // confirm the situation (rule-based guess, the person decides)
  const matches = E.matchScenarios(text, { limit: 3 });
  let scenario = matches[0]?.scenario || F.GENERAL;
  setMove(0, { eyebrow: 'Another Angle', title: 'Is this about…', prompt: 'Pick what fits best. It just helps Zuzu bring the right lenses.' });
  const picks = h('div', { style: { display: 'grid', gap: '8px' } });
  const seen = new Set();
  for (const m of matches) {
    if (seen.has(m.scenario.id)) continue;
    seen.add(m.scenario.id);
    const b = h('button', { class: 'choice', 'aria-pressed': String(m.scenario === scenario) }, m.scenario.id === F.GENERAL.id ? 'Something else' : m.scenario.title);
    b.onclick = () => { scenario = m.scenario; picks.querySelectorAll('.choice').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); audio.ui?.('select'); };
    picks.append(b);
  }
  if (!seen.has(F.GENERAL.id)) {
    const b = h('button', { class: 'choice', 'aria-pressed': 'false' }, 'Something else');
    b.onclick = () => { scenario = F.GENERAL; picks.querySelectorAll('.choice').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); };
    picks.append(b);
  }
  const ok = h('button', { class: 'btn ultra block', style: { marginTop: '10px' } }, 'That’s it');
  dock.replaceChildren(picks, ok);
  if (!(await waitFor(ok))) return out;
  out.scenario = scenario;
  scenarioForLines = scenario;

  // ======================================================== 1. SPLIT ==
  setMove(1, { eyebrow: 'Fact or fiction', title: 'Pull it apart', prompt: 'Drag each piece into a portal: what a camera would catch, or what your brain added.' });
  world.place({ x: 50, y: 66, scale: 0.3 });
  world.setEmotion({ curious: 1 }, 0.8);
  audio.fx?.('portal', { intensity: 0.6 });
  const pieces = E.splitThought(text).map((p, i) => ({ ...p, key: `p${i}`, side: null }));
  const portals = {
    fact: mkPortal('What happened', 'fact', '#39f0ff', 25),
    added: mkPortal('What my brain added', 'added', '#ff5be9', 75),
  };
  const pieceLayer = h('div', { style: { position: 'absolute', inset: '0', pointerEvents: 'none' } });
  stageEl.append(portals.fact.el, portals.added.el, pieceLayer);
  const crystal = h('div', { style: crystalStyle() }, text);
  pieceLayer.append(crystal);
  await wait(700);
  crystal.style.transform = 'translate(-50%,-50%) scale(1.06)';
  crystal.style.opacity = '0';
  audio.fx?.('separate', { intensity: 0.8 });
  haptic('pop');
  await wait(380);
  crystal.remove();
  const placeY = (i) => 30 + i * 11;
  const pieceEls = pieces.map((p, i) => {
    const el = h('div', { class: 'piece', style: pieceStyle(placeY(i)), role: 'group', 'aria-label': `Piece: ${p.text}` },
      h('div', { style: { fontWeight: 700, fontSize: '15.5px', lineHeight: '1.3' } }, p.text),
      h('div', { style: { display: 'flex', gap: '6px', marginTop: '8px' } },
        h('button', { class: 'chip', style: { minHeight: '34px', fontSize: '13px' }, onclick: () => drop(p, 'fact') }, '← Happened'),
        h('button', { class: 'chip', style: { minHeight: '34px', fontSize: '13px' }, onclick: () => drop(p, 'added') }, 'Brain added →')));
    makeDraggable(el, (x) => drop(p, x < innerWidth / 2 ? 'fact' : 'added'));
    pieceLayer.append(el);
    p.el = el;
    return el;
  });
  function drop(p, side) {
    p.side = side;
    const P = portals[side];
    p.el.style.transition = 'all 520ms var(--ease-out)';
    p.el.style.left = `${P.x}%`;
    p.el.style.top = '76%';
    p.el.style.transform = 'translate(-50%,-50%) scale(.4)';
    p.el.style.opacity = '0';
    setTimeout(() => { p.el.style.display = 'none'; }, 540);
    P.add(p.text);
    audio.fx?.('drop-in', { pan: side === 'fact' ? -0.6 : 0.6 });
    haptic('light');
    realm()?.pulse?.('ripple', { x: innerWidth * P.x / 100, y: innerHeight * 0.76 });
    refreshSplit();
  }
  const addFact = h('button', { class: 'btn ghost', style: { minHeight: '40px' } }, '+ Add what happened');
  const splitDone = h('button', { class: 'btn ultra block', disabled: true }, 'Split it');
  dock.replaceChildren(h('div', { style: { display: 'flex', justifyContent: 'center' } }, addFact), splitDone);
  addFact.onclick = () => {
    const input = h('input', { class: 'text', placeholder: scenario.factPrompt || 'What would a camera have caught?', autofocus: true });
    const s = openSheet({ title: 'What actually happened?', body: h('div', {}, h('p', { class: 'muted', style: { margin: '0 0 8px' } }, scenario.factPrompt || 'Just what a camera would catch.'), input),
      foot: h('button', { class: 'btn primary block', onclick: () => { if (input.value.trim()) { const p = { text: input.value.trim(), key: `x${Date.now()}`, guess: 'fact', el: h('div') }; pieces.push(p); drop(p, 'fact'); } s.close(); } }, 'Add') });
  };
  function refreshSplit() {
    const f = pieces.filter((p) => p.side === 'fact').length, a = pieces.filter((p) => p.side === 'added').length;
    const left = pieces.filter((p) => !p.side).length;
    splitDone.disabled = !(f && a) || left > 0;
    if (!left && !a) { splitDone.disabled = false; splitDone.textContent = 'Carry on'; }
    if (!left && !f) say('Hmm — nothing in “what happened” yet. Add the camera-only version?', 3000);
  }
  if (!(await waitFor(splitDone))) return out;
  out.facts = pieces.filter((p) => p.side === 'fact').map((p) => p.text);
  out.added = pieces.filter((p) => p.side === 'added').map((p) => p.text);
  if (!out.added.length) out.added = [scenario.commonInterpretations?.[0] || 'It means something bad about me'];
  audio.fx?.('separate', { intensity: 1 });
  haptic('pop');
  world.react('gasp');
  realm()?.setMood?.({ clarity: 0.3 });
  realm()?.transform?.(0.2);
  portals.fact.el.style.transform = 'translate(-50%,-50%) translateX(-14vw) scale(.8)';
  portals.added.el.style.transform = 'translate(-50%,-50%) translateX(14vw) scale(.8)';
  await say('See that gap between them? That’s where the plot twist lives.', 2600);
  stageEl.replaceChildren();

  // ======================================================== 2. X-RAY ==
  setMove(2, { eyebrow: 'Thought X-ray', title: 'What’s hiding in the thought?', prompt: 'Drag the lens across what your brain added.' });
  world.place({ x: 84, y: 52, scale: 0.3 });
  const addedText = out.added.join(' ');
  const found = E.detectPatterns(addedText);
  const words = h('div', { style: { position: 'absolute', left: '50%', top: '38%', transform: 'translate(-50%,-50%)', width: 'min(88vw, 420px)', textAlign: 'center',
    font: '700 26px/1.35 var(--font-display)', color: '#fff', textShadow: '0 2px 18px rgba(20,0,60,.6)', pointerEvents: 'none' } });
  // wrap matched spans so the lens can light them
  const spans = [];
  let html = escapeHtml(addedText);
  const marks = [];
  for (const f of found) for (const m of f.matches || []) marks.push({ ...m, pattern: f.pattern });
  marks.sort((a, b) => a.index - b.index);
  for (let i = marks.length - 1; i > 0; i--) if (marks[i].index < marks[i - 1].index + marks[i - 1].text.length) marks.splice(i, 1);
  marks.reverse();
  for (const m of marks) {
    const s = escapeHtml(addedText.slice(0, m.index)).length;
    const e = s + escapeHtml(m.text).length;
    html = `${html.slice(0, s)}<mark data-p="${m.pattern.id}" style="background:none;color:inherit;border-radius:8px;padding:0 3px;transition:all 300ms">${html.slice(s, e)}</mark>${html.slice(e)}`;
  }
  words.innerHTML = html;
  stageEl.append(words);
  words.querySelectorAll('mark').forEach((m) => spans.push(m));
  const lens = h('div', { 'aria-hidden': 'true', style: { position: 'absolute', left: '50%', top: '62%', width: '120px', height: '120px', marginLeft: '-60px', marginTop: '-60px', borderRadius: '50%',
    border: '3px solid rgba(57,240,255,.9)', boxShadow: '0 0 30px rgba(57,240,255,.55), inset 0 0 30px rgba(57,240,255,.25)', background: 'radial-gradient(circle, rgba(57,240,255,.12), rgba(196,20,230,.08))',
    pointerEvents: 'auto', touchAction: 'none', cursor: 'grab', backdropFilter: 'saturate(1.6) brightness(1.15)' } });
  stageEl.append(lens);
  const cards = h('div', { style: { display: 'grid', gap: '8px', maxHeight: '34dvh', overflowY: 'auto' } });
  const xrDone = h('button', { class: 'btn ultra block' }, found.length ? 'Keep scanning, or carry on' : 'Carry on');
  dock.replaceChildren(cards, xrDone);
  const lit = new Set();
  const scanAll = h('button', { class: 'btn ghost', style: { minHeight: '38px' }, onclick: () => spans.forEach((s) => light(s)) }, 'Scan it all for me');
  cards.append(h('div', { style: { display: 'flex', justifyContent: 'center' } }, scanAll));
  function light(span) {
    const id = span.dataset.p;
    span.style.background = 'rgba(255,91,233,.35)';
    span.style.boxShadow = '0 0 18px rgba(255,91,233,.6)';
    if (lit.has(id)) return;
    lit.add(id);
    const pat = F.THOUGHT_PATTERNS.find((p) => p.id === id);
    if (!pat) return;
    audio.fx?.('lens-focus', { intensity: 0.7 });
    haptic('tick');
    world.react('gasp');
    const card = h('div', { class: 'card', style: { padding: '12px 14px', boxShadow: 'none' } },
      h('div', { class: 'eyebrow', style: { color: '#ff9cf0' } }, 'Found: ' + pat.name),
      h('p', { style: { margin: '4px 0 0', color: 'var(--text-1)' } }, pat.explain),
      h('p', { style: { margin: '4px 0 0', fontStyle: 'italic' } }, pat.question));
    cards.prepend(card);
    if (!out.patterns.includes(id)) out.patterns.push(id);
  }
  makeLens(lens, () => {
    const r = lens.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (const s of spans) {
      const b = s.getBoundingClientRect();
      if (cx > b.left - 40 && cx < b.right + 40 && cy > b.top - 50 && cy < b.bottom + 50) light(s);
    }
  });
  if (!found.length) {
    // nothing matched the word lists: offer the patterns common in this
    // situation and let the person decide whether any fit
    const likely = (scenario.likelyPatterns || []).map((id) => F.THOUGHT_PATTERNS.find((p) => p.id === id)).filter(Boolean).slice(0, 3);
    cards.append(h('p', { class: 'muted', style: { margin: '0' } }, 'No obvious assumption words — nice. In situations like this, these sometimes sneak in. Any of them there?'),
      ...likely.map((p) => {
        const b = h('button', { class: 'choice', 'aria-pressed': 'false' }, h('b', {}, p.name), h('div', { class: 'muted', style: { marginTop: '2px' } }, p.explain));
        b.onclick = () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); out.patterns = on ? [...out.patterns, p.id] : out.patterns.filter((x) => x !== p.id); };
        return b;
      }));
  }
  say(guide('patterns') || 'Brains love shortcuts. Let’s see which ones snuck in.', 3000);
  if (!(await waitFor(xrDone))) return out;
  stageEl.replaceChildren();
  realm()?.setMood?.({ clarity: 0.45 });
  realm()?.transform?.(0.35);

  // ======================================================= 3. ORBIT ==
  setMove(3, { eyebrow: 'Evidence orbit', title: 'What does the evidence say?', prompt: 'For each card: does it fit the worry, not fit it, or is it still unknown? Skip anything that doesn’t apply.' });
  world.place({ x: 50, y: 33, scale: 0.42 });
  world.setEmotion({ curious: 0.6, calm: 0.4 }, 0.7);
  const orbit = drawOrbit();
  stageEl.append(orbit.svg);
  const ev = scenario.evidence || { supports: [], against: [], missing: [] };
  const deck = interleave([shuffle(ev.supports).slice(0, 3), shuffle(ev.against).slice(0, 3), shuffle(ev.missing).slice(0, 2)]);
  const cardEl = h('div', { class: 'card', style: { padding: '14px', minHeight: '86px' } });
  const btns = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '8px' } });
  const mkB = (label, bucket, col) => h('button', { class: 'btn', style: { minHeight: '48px', fontSize: '13.5px', padding: '0 8px', borderColor: col }, onclick: () => place(bucket) }, label);
  btns.append(mkB('Fits the worry', 'supports', '#ff5be9'), mkB('Doesn’t fit', 'against', '#39f0ff'), mkB('Still unknown', 'missing', '#ffd98a'));
  const skip = h('button', { class: 'btn ghost', style: { minHeight: '38px' }, onclick: () => nextCard() }, 'Doesn’t apply · skip');
  const own = h('button', { class: 'btn ghost', style: { minHeight: '38px' }, onclick: () => addOwn() }, '+ My own');
  const orbitDone = h('button', { class: 'btn ultra block', style: { marginTop: '8px' } }, 'That’s enough evidence');
  dock.replaceChildren(cardEl, btns, h('div', { style: { display: 'flex', justifyContent: 'space-between' } }, skip, own), orbitDone);
  let di = 0;
  function showCard() {
    const c = deck[di];
    cardEl.replaceChildren(c ? h('p', { style: { margin: 0, color: 'var(--text-1)', fontWeight: 650, fontSize: '16.5px' } }, c.text)
      : h('p', { style: { margin: 0, color: 'var(--text-2)' } }, 'That’s the deck. Add your own, or carry on.'));
    btns.style.opacity = c ? '1' : '.4';
    btns.querySelectorAll('button').forEach((b) => { b.disabled = !c; });
  }
  function nextCard() { di++; showCard(); }
  function place(bucket, custom) {
    const c = custom || deck[di];
    if (!c) return;
    out.evidence[bucket].push(c.text);
    orbit.add(bucket, c.text);
    audio.fx?.('star', { pitch: bucket === 'supports' ? 0.8 : bucket === 'against' ? 1.2 : 1 });
    haptic('light');
    if (!custom) nextCard();
    const s = out.evidence;
    if (s.supports.length + s.against.length + s.missing.length === 3) say(guide('evidence') || 'Look at that orbit. Everything counts, even the bits that agree with the worry.', 3200);
  }
  function addOwn() {
    const input = h('input', { class: 'text', placeholder: 'Something you know', autofocus: true });
    let bucket = 'against';
    const seg = h('div', { class: 'chips', style: { marginTop: '10px' } }, ...[['supports', 'Fits the worry'], ['against', 'Doesn’t fit'], ['missing', 'Unknown']].map(([b, l]) => {
      const c = h('button', { class: 'chip', 'aria-pressed': String(b === bucket) }, l);
      c.onclick = () => { bucket = b; seg.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === c))); };
      return c;
    }));
    const s = openSheet({ title: 'Add your own evidence', body: h('div', {}, input, seg), foot: h('button', { class: 'btn primary block', onclick: () => { if (input.value.trim()) place(bucket, { text: input.value.trim() }); s.close(); } }, 'Add to orbit') });
  }
  showCard();
  if (!(await waitFor(orbitDone))) return out;
  stageEl.replaceChildren();
  realm()?.setMood?.({ clarity: 0.6, agitation: 0.2 });
  realm()?.transform?.(0.5);

  // ====================================================== 4. PORTAL ==
  setMove(4, { eyebrow: 'Perspective portal', title: 'Turn the portal', prompt: 'Each turn shows another plausible angle. Keep the ones that could be true.' });
  world.place({ x: 50, y: 70, scale: 0.28 });
  world.setEmotion({ awe: 0.6, curious: 0.4 }, 0.75);
  const angles = E.buildAngles(scenario, { interpretation: addedText, patterns: out.patterns }).slice(0, 8);
  const portal = mkPerspectivePortal(angles);
  stageEl.append(portal.el);
  portalSound = audio.hold?.('hum', { intensity: 0.3 }) || null;
  const keep = h('button', { class: 'btn', style: { borderColor: '#39f0ff' } }, 'Could be');
  const notThis = h('button', { class: 'btn' }, 'Not this one');
  const prev = h('button', { class: 'icon-btn', 'aria-label': 'Previous angle', onclick: () => portal.turn(-1) }, '‹');
  const next = h('button', { class: 'icon-btn', 'aria-label': 'Next angle', onclick: () => portal.turn(1) }, '›');
  const portalDone = h('button', { class: 'btn ultra block', disabled: true }, 'I’ve seen enough angles');
  dock.replaceChildren(h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, prev, h('div', { class: 'row-btns', style: { flex: '1' } }, notThis, keep), next), portalDone);
  keep.onclick = () => rate(true);
  notThis.onclick = () => rate(false);
  function rate(yes) {
    const a = angles[portal.index];
    if (!a) return;
    out.kept = out.kept.filter((x) => x.id !== a.id);
    out.dismissed = out.dismissed.filter((x) => x.id !== a.id);
    (yes ? out.kept : out.dismissed).push(a);
    portal.mark(yes);
    audio.fx?.(yes ? 'chime' : 'rotate-tick');
    haptic(yes ? 'success' : 'light');
    if (yes) world.react('nod');
    const explored = out.kept.length + out.dismissed.length;
    realm()?.setMood?.({ clarity: 0.6 + 0.4 * Math.min(1, explored / 5) });
    realm()?.transform?.(0.5 + 0.35 * Math.min(1, explored / 5));
    portalDone.disabled = explored < 2;
    if (explored === 2) say(guide('angles') || 'Every angle you check makes the picture less wobbly.', 2800);
    setTimeout(() => portal.turn(1), 380);
  }
  if (!(await waitFor(portalDone))) return out;
  portalSound?.stop?.();
  stageEl.replaceChildren();
  const cameo = E.pickCameo(scenario, 'angles');

  // ======================================================== 5. NEXT ==
  setMove(5, { eyebrow: 'The possibility machine', title: 'Your next move?', prompt: 'Pick one useful step. Or practise what you might say.' });
  world.place({ x: 50, y: 20, scale: 0.46 });
  world.setEmotion({ hopeful: 0.6, determined: 0.4 }, 0.7);
  const steps = (scenario.nextSteps || []).slice(0, 6);
  const grid = h('div', { style: { display: 'grid', gap: '8px', maxHeight: '44dvh', overflowY: 'auto' } });
  const nextDone = h('button', { class: 'btn ultra block', disabled: true }, 'Show me my new angle');
  for (const st of steps) {
    const b = h('button', { class: 'choice', 'aria-pressed': 'false' }, st.text);
    b.onclick = () => { out.next = st; grid.querySelectorAll('.choice').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); nextDone.disabled = false; audio.ui?.('select'); haptic('light'); };
    grid.append(b);
  }
  if (scenario.conversation?.openers?.length) grid.append(h('button', { class: 'btn ghost block', onclick: () => practise(scenario.conversation) }, `Practise what to say to ${scenario.conversation.with || 'them'} →`));
  if (cameo?.text) {
    grid.prepend(h('div', { class: 'card', style: { padding: '10px 12px', display: 'flex', gap: '10px', alignItems: 'center', boxShadow: 'none' } },
      h('img', { src: new URL(`../../assets/mallows/${cameo.mallow}.png`, import.meta.url).href, alt: '', style: { width: '40px', height: '40px', objectFit: 'contain', flex: '0 0 auto' } }),
      h('p', { style: { margin: 0, color: 'var(--text-1)', fontSize: '14.5px' } }, h('b', {}, `${cap(cameo.mallow)}: `), cameo.text)));
  }
  dock.replaceChildren(grid, nextDone);
  if (!(await waitFor(nextDone))) return out;

  // =================================================== 6. STAR MAP ==
  setMove(6, { eyebrow: 'Your new angle', title: 'Here’s the bigger picture', prompt: '' });
  world.place({ x: 50, y: 17, scale: 0.5 });
  realm()?.transform?.(1);
  realm()?.pulse?.('success', { x: innerWidth / 2, y: innerHeight * 0.3 });
  audio.fx?.('bloom', { intensity: 0.9 });
  haptic('success');
  world.setEmotion({ hopeful: 0.5, happy: 0.3, awe: 0.2 }, 0.75);
  world.react('celebrate');
  const composed = E.composeAngle({ fact: out.facts.join(' '), interpretation: addedText, evidence: out.evidence, keptAngles: out.kept, nextStep: out.next });
  out.composed = composed;
  const map = h('div', { class: 'summary-card' }, ...composed.lines.flatMap((l) => [h('div', { class: 'k' }, l.label), h('div', { class: 'v' }, l.text)]));
  const fin = h('button', { class: 'btn ultra block', style: { marginTop: '10px' } }, 'Finish');
  dock.replaceChildren(h('div', { style: { maxHeight: '52dvh', overflowY: 'auto' } }, map), fin);
  const finished = waitFor(fin);
  say(guide('done') || 'Same situation. Bigger picture. That’s the plot twist.', 3000);
  if (!(await finished)) return out;
  cleanup();
  out.completed = true;
  out.summary = composed.lines;
  out.share = { title: 'Another Angle', subtitle: 'Zuzu helped me see it from more than one side.' };
  return out;

  // ------------------------------------------------------------ helpers --
  function mkPortal(label, key, col, x) {
    const list = h('div', { style: { fontSize: '12.5px', color: 'var(--text-2)', marginTop: '6px', maxHeight: '64px', overflow: 'hidden' } });
    const el = h('div', { 'aria-label': label, role: 'region', style: { position: 'absolute', left: `${x}%`, top: '76%', transform: 'translate(-50%,-50%)', width: '42vw', maxWidth: '210px',
      aspectRatio: '1 / .78', borderRadius: '50%', display: 'grid', placeItems: 'center', textAlign: 'center', padding: '14px', transition: 'transform 700ms var(--ease-spring)',
      background: `radial-gradient(closest-side, ${col}33, ${col}11 60%, transparent 72%)`, boxShadow: `inset 0 0 0 2px ${col}aa, 0 0 40px ${col}55`, pointerEvents: 'none' } },
    h('div', {}, h('div', { style: { font: '800 11px/1.2 var(--font-ui)', letterSpacing: '.14em', textTransform: 'uppercase', color: col } }, label), list));
    return { el, x, add: (t) => list.append(h('div', {}, '• ' + t)) };
  }
  function crystalStyle() {
    return { position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%,-50%)', width: 'min(84vw, 380px)', padding: '20px', borderRadius: '26px', textAlign: 'center',
      font: '700 20px/1.35 var(--font-display)', color: '#fff', background: 'linear-gradient(135deg, rgba(57,240,255,.22), rgba(196,20,230,.28))', border: '1px solid rgba(255,255,255,.35)',
      boxShadow: '0 0 50px rgba(150,80,255,.45), inset 0 1px 0 rgba(255,255,255,.4)', backdropFilter: 'blur(10px)', transition: 'all 380ms var(--ease-out)' };
  }
  function pieceStyle(top) {
    return { position: 'absolute', left: '50%', top: `${top}%`, transform: 'translate(-50%,-50%)', width: 'min(82vw, 360px)', padding: '12px 14px', borderRadius: '20px', color: '#fff',
      background: 'linear-gradient(135deg, rgba(57,240,255,.16), rgba(196,20,230,.22))', border: '1px solid rgba(255,255,255,.3)', backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(20,0,60,.4)',
      pointerEvents: 'auto', touchAction: 'none', cursor: 'grab', animation: 'fadeIn 420ms var(--ease-out) both' };
  }
  function makeDraggable(el, onDrop) {
    let sx = 0, sy = 0, ox = 0, oy = 0, drag = false;
    el.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; drag = true; sx = e.clientX; sy = e.clientY; el.setPointerCapture?.(e.pointerId); el.style.transition = 'none'; });
    el.addEventListener('pointermove', (e) => { if (!drag) return; ox = e.clientX - sx; oy = e.clientY - sy; el.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px)) rotate(${ox / 30}deg)`; });
    el.addEventListener('pointerup', (e) => {
      if (!drag) return;
      drag = false;
      if (oy > 80 || Math.abs(ox) > 90) onDrop(e.clientX);
      else { el.style.transition = 'transform 300ms var(--ease-spring)'; el.style.transform = 'translate(-50%,-50%)'; }
      ox = oy = 0;
    });
  }
  function makeLens(el, onMove) {
    let drag = false, dx = 0, dy = 0;
    el.addEventListener('pointerdown', (e) => { drag = true; el.setPointerCapture?.(e.pointerId); const r = el.getBoundingClientRect(); dx = e.clientX - (r.left + r.width / 2); dy = e.clientY - (r.top + r.height / 2); });
    el.addEventListener('pointermove', (e) => {
      if (!drag) return;
      el.style.left = `${e.clientX - dx}px`; el.style.top = `${e.clientY - dy}px`;
      onMove();
    });
    el.addEventListener('pointerup', () => { drag = false; });
  }
  function drawOrbit() {
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible');
    const cx = innerWidth / 2, cy = innerHeight * 0.3;
    const rings = { supports: [70, '#ff5be9'], against: [112, '#39f0ff'], missing: [152, '#ffd98a'] };
    const g = document.createElementNS(SVGNS, 'g');
    svg.append(g);
    for (const [k, [r, col]] of Object.entries(rings)) {
      const c = document.createElementNS(SVGNS, 'ellipse');
      Object.entries({ cx, cy, rx: r * 1.15, ry: r * 0.42, fill: 'none', stroke: col, 'stroke-opacity': '.55', 'stroke-width': '1.5', 'stroke-dasharray': k === 'missing' ? '4 7' : 'none' }).forEach(([a, v]) => c.setAttribute(a, v));
      g.append(c);
    }
    const moons = [];
    let t = 0, raf = 0;
    const tick = () => {
      t += ctx.reducedMotion ? 0.002 : 0.008;
      for (const m of moons) {
        const [r] = rings[m.k];
        const a = m.a + t * (m.k === 'supports' ? 1.3 : m.k === 'against' ? 1 : 0.7);
        m.el.setAttribute('cx', cx + Math.cos(a) * r * 1.15);
        m.el.setAttribute('cy', cy + Math.sin(a) * r * 0.42);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    signal.addEventListener('abort', () => cancelAnimationFrame(raf));
    return {
      svg,
      add(k, label) {
        const el = document.createElementNS(SVGNS, 'circle');
        el.setAttribute('r', '7'); el.setAttribute('fill', rings[k][1]);
        el.setAttribute('style', `filter: drop-shadow(0 0 6px ${rings[k][1]})`);
        const title = document.createElementNS(SVGNS, 'title'); title.textContent = label; el.append(title);
        g.append(el);
        moons.push({ el, k, a: Math.random() * Math.PI * 2 });
      },
    };
  }
  function mkPerspectivePortal(list) {
    const size = Math.min(innerWidth * 0.86, 360);
    const el = h('div', { style: { position: 'absolute', left: '50%', top: '40%', width: `${size}px`, height: `${size}px`, transform: 'translate(-50%,-50%)', pointerEvents: 'auto', touchAction: 'none' } });
    const ring = h('div', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', borderRadius: '50%', transition: 'transform 600ms var(--ease-spring)',
      background: 'conic-gradient(from 0deg, #39f0ff, #c414e6, #7a3cff, #ffd98a, #39f0ff)', WebkitMask: 'radial-gradient(circle, transparent 62%, #000 63%, #000 70%, transparent 71%)', mask: 'radial-gradient(circle, transparent 62%, #000 63%, #000 70%, transparent 71%)' } });
    const ticks = h('div', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', transition: 'transform 600ms var(--ease-spring)' } },
      ...list.map((_, i) => h('i', { style: { position: 'absolute', left: '50%', top: '50%', width: '10px', height: '10px', marginLeft: '-5px', marginTop: '-5px', borderRadius: '50%', background: 'rgba(255,255,255,.35)',
        transform: `rotate(${(i / list.length) * 360}deg) translateY(-${size * 0.5 - 8}px)` } })));
    const lensEl = h('div', { style: { position: 'absolute', inset: '15%', borderRadius: '50%', display: 'grid', placeItems: 'center', padding: '10%', textAlign: 'center',
      background: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,.16), rgba(60,20,120,.55) 60%, rgba(20,6,50,.85))', boxShadow: 'inset 0 0 40px rgba(57,240,255,.35), 0 0 60px rgba(150,80,255,.35)' } });
    const kindEl = h('div', { style: { font: '800 10.5px/1.2 var(--font-ui)', letterSpacing: '.14em', textTransform: 'uppercase', color: '#9ff4ff', marginBottom: '8px' } });
    const textEl = h('div', { 'aria-live': 'polite', style: { font: '650 16px/1.38 var(--font-ui)', color: '#fff', transition: 'opacity 260ms, filter 260ms' } });
    lensEl.append(h('div', {}, kindEl, textEl));
    el.append(ring, ticks, lensEl);
    const KIND = { context: 'Bigger picture', benign: 'A kinder possibility', neutral: 'Just the facts', growth: 'Something to build', 'self-compassion': 'Go easy on yourself',
      'worry-partly-true': 'Takes your worry seriously', 'not-enough-info': 'Not enough to know yet', eyes: 'Another pair of eyes' };
    const api = {
      el, index: 0,
      async turn(d) {
        api.index = (api.index + d + list.length) % list.length;
        ring.style.transform = `rotate(${-api.index * (360 / list.length)}deg)`;
        ticks.style.transform = `rotate(${-api.index * (360 / list.length)}deg)`;
        textEl.style.opacity = '0'; textEl.style.filter = 'blur(6px)';
        audio.fx?.('rotate-tick');
        haptic('tick');
        await wait(220);
        show();
      },
      mark(yes) {
        const t = ticks.children[api.index];
        if (t) t.style.background = yes ? '#39f0ff' : 'rgba(255,255,255,.12)';
      },
    };
    function show() {
      const a = list[api.index];
      kindEl.textContent = KIND[a.kind] || 'Another angle';
      textEl.textContent = a.text;
      textEl.style.opacity = '1'; textEl.style.filter = 'none';
    }
    // drag around the ring to turn it
    let startA = null, acc = 0;
    const angle = (e) => { const r = el.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)); };
    el.addEventListener('pointerdown', (e) => { startA = angle(e); acc = 0; el.setPointerCapture?.(e.pointerId); });
    el.addEventListener('pointermove', (e) => {
      if (startA == null) return;
      const a = angle(e);
      let d = a - startA; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
      acc += d; startA = a;
      ring.style.transition = 'none';
      ring.style.transform = `rotate(${-api.index * (360 / list.length) + (acc * 180) / Math.PI}deg)`;
      if (Math.abs(acc) > 0.6) { ring.style.transition = ''; api.turn(acc > 0 ? 1 : -1); acc = 0; }
    });
    el.addEventListener('pointerup', () => { startA = null; ring.style.transition = ''; ring.style.transform = `rotate(${-api.index * (360 / list.length)}deg)`; });
    show();
    return api;
  }
  function practise(conv) {
    const body = h('div', {});
    const draw = (opener) => {
      body.replaceChildren(
        h('p', { class: 'muted', style: { margin: '0 0 10px' } }, `Pick an opener for ${conv.with || 'them'}. Then see how it might go — these are possibilities, not predictions.`),
        ...conv.openers.map((o, i) => h('button', { class: 'choice', 'aria-pressed': String(opener === i), style: { width: '100%', marginBottom: '8px' }, onclick: () => draw(i) }, typeof o === 'string' ? o : o.text)),
        opener != null ? h('div', { style: { marginTop: '6px' } },
          h('div', { class: 'eyebrow', style: { margin: '8px 0' } }, 'They might say…'),
          ...(conv.replies || []).map((r) => h('div', { class: 'card', style: { padding: '12px', boxShadow: 'none', marginBottom: '8px' } },
            h('p', { style: { margin: 0, color: 'var(--text-1)' } }, `“${typeof r === 'string' ? r : r.text}”`),
            (r.yourMove || r.tip) ? h('p', { class: 'muted', style: { margin: '6px 0 0' } }, r.yourMove || r.tip) : null)),
          ...(conv.tips || []).slice(0, 2).map((t) => h('p', { class: 'muted', style: { margin: '6px 0 0' } }, '• ' + t)),
          conv.note ? h('p', { class: 'muted', style: { marginTop: '10px' } }, conv.note) : null) : null);
    };
    draw(null);
    openSheet({ title: 'Practise the words', body, full: true });
  }
}

function escapeHtml(s) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function shuffle(a) { const b = [...(a || [])]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
function interleave(lists) { const out = []; for (let i = 0; lists.some((l) => l[i]); i++) for (const l of lists) if (l[i]) out.push(l[i]); return out; }
