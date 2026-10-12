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
//  4½ LENSES     optional: "Want another lens?" — up to two picked by rules
//                (engine.recommendLenses) from Zoom Out, Future Lens and the
//                Meaning Mixer; each feeds the star map
//  5 NEXT        the Possibility Machine: one useful next move (+ practise words)
//  6 STAR MAP    your new angle, assembled

import { h, wait, openSheet } from '../app/ui.js';
import * as LX from './lenses.js';

const SVGNS = 'http://www.w3.org/2000/svg';

export async function run(ctx, { frameworks: F, engine: E }) {
  const { world, audio, haptic, setMove, dock, signal } = ctx;
  const say = (t, ms, who = 'Zuzu') => ctx.say(t, { who, ms });
  const realm = () => world.realm;
  const out = { completed: false, scenario: null, facts: [], added: [], patterns: [], evidence: { supports: [], against: [], missing: [] }, kept: [], dismissed: [], next: null, lensOffer: [], lenses: {} };
  const ABORT = Symbol('abort');
  // Sealed Future Lens predictions live on this phone only, and only when the
  // person has switched on "Keep my saved angles" (prefs.saveWords).
  const SEAL_KEY = 'ultra.sealedPredictions';
  const sealStore = (() => {
    try {
      const app = ctx.app;
      if (!app?.prefs?.get?.('saveWords') || !app?.store) return null;
      return {
        all: () => { try { const v = app.store.get(SEAL_KEY, []); return Array.isArray(v) ? v : []; } catch { return []; } },
        save: (list) => { try { return app.store.set(SEAL_KEY, list.slice(-12)); } catch { return false; } },
      };
    } catch { return null; }
  })();
  let userAdded = false;
  let lensLayout = null;   // the active lens's layout(); re-run on resize
  let lensSeq = 0;         // which lens is showing (stale cameo pop-ins check this)
  let zuzuCorner = false;  // is Zuzu tucked in the corner (no room above the lens)?
  let activeCameo = null;  // dismisses the cameo pop-in that's showing, if any
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
  const dueSeal = (sealStore?.all() || []).filter((p) => p && !p.outcome && (p.when === 'after' || Date.now() >= (p.dueAt || 0)));
  dock.replaceChildren(...(dueSeal.length ? [h('div', { style: { display: 'flex', justifyContent: 'center' } },
    h('button', { class: 'chip', style: { gap: '8px' }, onclick: () => openSealed(dueSeal[0]) }, lensIcon('future', 22), 'A sealed prediction is ready to open'))] : []),
  h('div', { class: 'card', style: { padding: '14px' } },
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
  userAdded = out.added.length > 0;
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

  // ================================================= 4½. LENSES (optional) ==
  if (!(await offerLenses())) return out;
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
  const composed = E.composeAngle({ fact: out.facts.join(' '), interpretation: addedText, evidence: out.evidence, keptAngles: out.kept, nextStep: out.next, lenses: out.lenses });
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
  // ============================================================= LENSES ==
  // Optional lenses after the Perspective Portal. Each lens returns its result
  // for the star map, or ABORT when the ritual is left. Every gesture has a
  // button and keyboard alternative; motion is skipped with reduced motion.
  async function offerLenses() {
    const mixSource = userAdded ? out.added.map((t) => E.tidySentence(t)).join(' ') : text;
    let recs = [];
    try { recs = E.recommendLenses({ text, interpretation: mixSource, patterns: out.patterns, scenario }); } catch (e) { console.warn(e); }
    out.lensOffer = recs.map((r) => r.id);
    const done = [];
    for (let round = 0; round < 2; round++) {
      const left = recs.filter((r) => !done.includes(r.id));
      if (!left.length) break;
      const pick = await lensMenu(left, round);
      if (pick === ABORT) return false;
      if (!pick) break;
      done.push(pick);
      const lensFn = pick === 'zoom' ? lensZoom : pick === 'future' ? lensFuture : lensMixer;
      lensSeq++;
      const res = await withLayout(() => lensFn(mixSource));
      if (res === ABORT) return false;
      if (res) out.lenses[pick] = res;
      stageEl.replaceChildren();
    }
    out.lensesUsed = done;
    return true;
  }

  // Runs a lens with a shared re-layout hook (resize, dock changes).
  async function withLayout(fn) {
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => relayout()) : null;
    ro?.observe(dock);
    addEventListener('resize', relayout);
    try { return await fn(); } finally { ro?.disconnect(); removeEventListener('resize', relayout); lensLayout = null; }
  }
  function relayout() { if (lensLayout) requestAnimationFrame(() => lensLayout?.()); }

  function compact() { return innerHeight < 700; }
  /** Zuzu speaks in a bubble only when she has her own patch of sky and the space is tall enough
   *  not to cover the lens; otherwise the line goes in the lens's inline caption (if it has one). */
  function sayLens(t, ms = 2800, inline = null) {
    if (!t) return;
    if (!zuzuCorner && zoneRect().height >= 300) { say(t, ms); return; }
    say('');
    if (inline) inline.textContent = t;
  }
  function lensLine(lens, beat) { return LX.LENS_LINES[lens]?.[beat] || null; }
  function choose(pairs) {
    return new Promise((resolve) => {
      let settled = false;
      const fin = (v) => { if (!settled) { settled = true; resolve(v); } };
      for (const [el, v] of pairs) el.addEventListener('click', () => fin(v));
      if (signal.aborted) fin(ABORT);
      signal.addEventListener('abort', () => fin(ABORT));
    });
  }
  /** The free space between the title block and the dock, in px. */
  function zoneRect() {
    const t = [...document.querySelectorAll('#scene .move-title')].map((e) => e.getBoundingClientRect()).find((r) => r.height > 0);
    const d = dock.getBoundingClientRect();
    const top = Math.round((t ? t.bottom : 120) + 14);
    const bottom = Math.round((d.height ? d.top : innerHeight - 240) - 12);
    const left = Math.max(10, Math.round(d.width ? d.left : 16));
    const right = Math.min(innerWidth - 10, Math.round(d.width ? d.right : innerWidth - 16));
    return { top, bottom, left, right, width: right - left, height: Math.max(70, bottom - top), cx: (left + right) / 2, cy: (top + Math.max(top + 70, bottom)) / 2 };
  }
  /** Zuzu sits above the lens content when there's room, else small in the corner. → { top } where the content may start */
  function placeZuzu(z, contentH, maxScale = 0.4) {
    const room = z.height - contentH - 6;
    if (room >= 120) {
      if (world.fitBetween) world.fitBetween(z.top, z.top + room, { maxScale });
      else world.place({ x: 50, y: ((z.top + room / 2) / innerHeight) * 100, scale: Math.min(maxScale, room / 320) });
      zuzuCorner = false;
      return { top: z.top + room + 6, corner: false };
    }
    world.place({ x: 87, y: ((z.top + 22) / innerHeight) * 100, scale: 0.2 });
    zuzuCorner = true;
    return { top: z.top, corner: true };
  }
  function setZuzu(mix, spin, spinJitter, intensity = 0.7) {
    world.setEmotion(mix, intensity, { extra: { spin, spinJitter } });
  }
  function svgEl(tag, attrs = {}, ...kids) {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, String(v));
    el.append(...kids);
    return el;
  }
  /** Small line icons for the three lenses (drawn, not font glyphs). */
  function lensIcon(id, size = 24) {
    const s = svgEl('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'aria-hidden': 'true' });
    if (id === 'zoom') s.append(svgEl('circle', { cx: 10.5, cy: 10.5, r: 6.5 }), svgEl('path', { d: 'M7.6 10.5h5.8M15.3 15.3l5 5' }), svgEl('circle', { cx: 10.5, cy: 10.5, r: 9.6, 'stroke-dasharray': '1.5 3', opacity: 0.6 }));
    else if (id === 'future') s.append(svgEl('circle', { cx: 12, cy: 11, r: 8 }), svgEl('path', { d: 'M4.3 11h15.4' }), svgEl('path', { d: 'M7 14.5c1.6.8 3 .8 5 0s3.4-.8 5 0', opacity: 0.8 }), svgEl('path', { d: 'M8 21h8' }));
    else s.append(svgEl('circle', { cx: 12, cy: 12, r: 6.5 }), svgEl('path', { d: 'M12 12l3.6-3.6' }), svgEl('path', { d: 'M3.5 16.5l1.6-.9M2.6 12h1.8M3.5 7.5l1.6.9M7.5 3.5l.9 1.6M12 2.6v1.8M16.5 3.5l-.9 1.6M20.5 7.5l-1.6.9M21.4 12h-1.8M20.5 16.5l-1.6-.9' }));
    return s;
  }
  function lensOrb(id, size) {
    const L = LX.LENSES[id];
    const o = h('span', { 'aria-hidden': 'true', style: { flex: '0 0 auto', width: `${size}px`, height: `${size}px`, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#fff',
      background: `radial-gradient(circle at 34% 28%, rgba(255,255,255,.55), ${L.hue}66 36%, rgba(30,10,70,.78) 74%)`,
      boxShadow: `0 0 0 2px ${L.hue}bb, 0 0 ${Math.round(size * 0.45)}px ${L.hue}77, inset 0 0 ${Math.round(size * 0.25)}px rgba(255,255,255,.28)` } });
    o.append(lensIcon(id, Math.round(size * 0.56)));
    return o;
  }
  function dismissCameo() { activeCameo?.(); activeCameo = null; }
  /** The scenario's cameo Mallow pops in once per lens, then floats away. */
  function cameoPop(lensId, seq = lensSeq) {
    if (seq !== lensSeq || signal.aborted) return;
    let c = null;
    try { c = E.pickLensCameo(scenario, lensId); } catch { /* none */ }
    if (!c?.text) return;
    const z = zoneRect();
    const w = Math.min(z.width, 380);
    // over Zuzu's patch of sky when Zuzu has one, else just above the controls
    const at = zuzuCorner ? { bottom: `${Math.round(innerHeight - z.bottom)}px` } : { top: `${Math.round(z.top)}px` };
    const el = h('div', { class: 'card', role: 'status', style: { position: 'absolute', left: `${Math.round(z.cx - w / 2)}px`, ...at, width: `${w}px`, boxSizing: 'border-box',
      padding: '10px 12px', display: 'flex', gap: '10px', alignItems: 'center', pointerEvents: 'auto', boxShadow: '0 12px 40px rgba(10,0,40,.5)', animation: ctx.reducedMotion ? 'none' : 'bubbleIn 380ms var(--ease-spring) both' } },
    h('img', { src: new URL(`../../assets/mallows/${c.mallow}.png`, import.meta.url).href, alt: '', style: { width: '40px', height: '40px', objectFit: 'contain', flex: '0 0 auto' } }),
    h('p', { style: { margin: 0, color: 'var(--text-1)', fontSize: '14px', lineHeight: '1.35' } }, h('b', {}, `${cap(c.mallow)}: `), c.text));
    const bye = () => { if (activeCameo === bye) activeCameo = null; el.style.transition = 'opacity 280ms'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); };
    el.onclick = bye;
    dismissCameo();
    activeCameo = bye;
    stageEl.append(el);
    audio.fx?.('star', { pitch: 1.4, intensity: 0.45 });
    setTimeout(bye, 4800);
  }

  // ----------------------------------------------------- the lens menu --
  async function lensMenu(recs, round) {
    zuzuCorner = false;   // Zuzu stands centre stage here
    say('');
    setMove(4, { eyebrow: 'Optional lenses', title: round ? 'One more lens?' : 'Want another lens?',
      prompt: round ? 'Or head on to your next move.' : compact() ? 'Optional — about a minute each.' : 'Totally optional. Zuzu picked these for your thought — about a minute each.' });
    setZuzu({ curious: 0.6, playful: 0.4 }, 1.1, 0.2);
    const items = recs.map((r) => h('button', { class: 'choice', 'data-lens': r.id, style: { display: 'flex', gap: '12px', alignItems: 'center', width: '100%', padding: '11px 14px' } },
      lensOrb(r.id, compact() ? 38 : 44),
      h('span', { style: { minWidth: '0' } },
        h('b', { style: { display: 'block', fontSize: '16px' } }, r.name),
        h('span', { style: { display: 'block', marginTop: '2px', color: 'var(--text-2)', fontSize: '13.5px', fontWeight: '500', lineHeight: '1.35' } }, r.reason))));
    const skip = h('button', { class: 'btn ghost block' }, round ? 'On to my next move' : 'Skip — on to my next move');
    dock.replaceChildren(...items, skip);
    const orbs = recs.map((r, i) => {
      const o = lensOrb(r.id, 72);
      Object.assign(o.style, { position: 'absolute', pointerEvents: 'auto', cursor: 'pointer', transform: 'translate(-50%,-50%)', transition: 'left 400ms var(--ease-out), top 400ms var(--ease-out)' });
      o.addEventListener('click', () => items[i].click());
      stageEl.append(o);
      if (!ctx.reducedMotion) o.animate?.([{ transform: 'translate(-50%,-50%) translateY(-6px)' }, { transform: 'translate(-50%,-50%) translateY(6px)' }], { duration: 2100 + i * 500, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
      return o;
    });
    lensLayout = () => {
      const z = zoneRect();
      const size = Math.max(52, Math.min(80, z.height * 0.4));
      if (world.fitBetween) world.fitBetween(z.top, z.bottom, { maxScale: 0.5 });
      else world.place({ x: 50, y: (z.cy / innerHeight) * 100, scale: 0.4 });
      orbs.forEach((o, i) => {
        const x = orbs.length === 1 ? z.left + z.width * 0.8 : z.left + z.width * (i ? 0.84 : 0.16);
        Object.assign(o.style, { left: `${x}px`, top: `${z.cy}px`, width: `${size}px`, height: `${size}px` });
      });
    };
    requestAnimationFrame(() => lensLayout?.());
    sayLens(lensLine('offer', round ? 'again' : 'first'), 3000);
    const pick = await choose([...items.map((b, i) => [b, recs[i].id]), [skip, null]]);
    if (pick && pick !== ABORT) { audio.fx?.('portal', { intensity: 0.5 }); haptic('pop'); }
    lensLayout = null;
    stageEl.replaceChildren();
    return pick;
  }

  // ---------------------------------------------------------- ZOOM OUT --
  async function lensZoom() {
    const STOPS = LX.ZOOM_STOPS;
    const N = STOPS.length - 1;
    const rm = !!ctx.reducedMotion;
    setMove(4, { eyebrow: 'Zoom out', title: 'Pull the camera back', prompt: compact() ? '' : 'Pinch, drag upwards or use the slider. Tap anything that’s true for you.' });
    setZuzu({ curious: 0.8, awe: 0.2 }, 1.4, 0.5);
    audio.fx?.('portal', { intensity: 0.35, pitch: 0.8 });
    const chosen = new Map(STOPS.map((s) => [s.id, []]));
    let z = 0, stop = -1, maxStop = 0, tween = 0, wheelT = 0, cameoShown = false;
    const spoken = new Set();

    // the scene: rings for each stop, little "other moments", and your moment
    const box = h('div', { tabindex: '0', role: 'slider', 'aria-label': 'Zoom out from this moment. Arrow keys change the zoom.', 'aria-valuemin': '0', 'aria-valuemax': String(N),
      style: { position: 'absolute', pointerEvents: 'auto', touchAction: 'none', cursor: 'grab', borderRadius: '30px', outline: 'none', overflow: 'hidden', userSelect: 'none', WebkitUserSelect: 'none',
        WebkitMaskImage: 'radial-gradient(closest-side, #000 74%, transparent 100%)', maskImage: 'radial-gradient(closest-side, #000 74%, transparent 100%)' } });
    const svg = svgEl('svg', { width: '100%', height: '100%', style: 'position:absolute;inset:0;overflow:visible', 'aria-hidden': 'true' });
    const defs = svgEl('defs');
    const grad = svgEl('radialGradient', { id: 'zoomGlow' }, svgEl('stop', { offset: '0%', 'stop-color': '#9ff4ff', 'stop-opacity': 0.55 }), svgEl('stop', { offset: '100%', 'stop-color': '#7a3cff', 'stop-opacity': 0 }));
    defs.append(grad);
    const halo = svgEl('ellipse', { fill: 'url(#zoomGlow)' });
    svg.append(defs, halo);
    const RING_COL = ['#ffffff', '#39f0ff', '#9f8bff', '#ff5be9', '#ffd98a'];
    const rings = [null];
    for (let i = 1; i <= N; i++) {
      const e = svgEl('ellipse', { fill: 'none', stroke: RING_COL[i], 'stroke-width': 1.6, 'stroke-dasharray': i === N ? '3 7' : i % 2 ? 'none' : '1 6', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' });
      rings.push(e);
      svg.append(e);
    }
    const stars = [];
    for (let i = 1; i <= N; i++) {
      for (let j = 0; j < 9; j++) {
        const el = svgEl('circle', { r: j % 3 ? 1.3 : 1.9, fill: '#fff' });
        stars.push({ el, band: i, theta: ((j * 137.5 + i * 41) * Math.PI) / 180, f: 0.2 + (((j * 0.618 + i * 0.37) % 1) * 0.7), tw: (j + i) % 4 });
        svg.append(el);
      }
    }
    const litLayer = svgEl('g');
    svg.append(litLayer);
    const lit = [];
    const labels = [null];
    const labelLayer = h('div', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', pointerEvents: 'none' } });
    for (let i = 1; i <= N; i++) {
      const l = h('div', { style: { position: 'absolute', left: '0', top: '0', font: '800 10.5px/1 var(--font-ui)', letterSpacing: '.14em', textTransform: 'uppercase', color: RING_COL[i], whiteSpace: 'nowrap',
        padding: '4px 8px', borderRadius: '999px', background: 'rgba(14,8,40,.55)', transition: rm ? 'none' : 'opacity 240ms, box-shadow 240ms' } }, STOPS[i].label);
      labels.push(l);
      labelLayer.append(l);
    }
    const momentText = (out.facts[0] ? `${E.tidySentence(out.facts[0])} ` : '') + E.tidySentence(out.added[0] || text);
    const card = h('div', { 'aria-hidden': 'true', style: { position: 'absolute', left: '50%', top: '50%', padding: '14px 16px', borderRadius: '22px', textAlign: 'center', color: '#fff', transformOrigin: '50% 50%',
      font: '700 16px/1.32 var(--font-display)', background: 'linear-gradient(135deg, rgba(57,240,255,.24), rgba(196,20,230,.3))', border: '1px solid rgba(255,255,255,.4)',
      boxShadow: '0 0 40px rgba(150,80,255,.45), inset 0 1px 0 rgba(255,255,255,.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', overflow: 'hidden',
      display: '-webkit-box', WebkitLineClamp: '4', WebkitBoxOrient: 'vertical' } }, momentText);
    const here = h('div', { 'aria-hidden': 'true', style: { position: 'absolute', left: '50%', top: '50%', width: '12px', height: '12px', margin: '-6px 0 0 -6px', borderRadius: '50%', background: '#fff',
      boxShadow: '0 0 0 3px rgba(255,91,233,.55), 0 0 22px 6px rgba(255,91,233,.55)', opacity: '0', pointerEvents: 'none' } });
    const hereTag = h('div', { 'aria-hidden': 'true', style: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, 14px)', textShadow: '0 1px 6px #12062e', font: '700 11px/1 var(--font-ui)', color: '#ffc2f5', opacity: '0', whiteSpace: 'nowrap' } }, 'this moment');
    box.append(svg, labelLayer, card, here, hereTag);
    stageEl.append(box);

    // dock: the stop's question + pick-what's-true lines, zoom controls, done
    const stopEye = h('div', { class: 'eyebrow', style: { color: '#9ff4ff' } });
    const stopQ = h('p', { style: { margin: '4px 0 0', fontWeight: '700', color: 'var(--text-1)', fontSize: compact() ? '14.5px' : '15.5px', lineHeight: '1.3' } });
    const row = h('div', { class: 'chips scroll', role: 'group', 'aria-label': 'Lines that might be true for you', style: { margin: '10px -14px 0', padding: '2px 14px 4px', scrollSnapType: 'x proximity', scrollPadding: '0 14px', gap: '8px' } });
    const promptCard = h('div', { class: 'card', style: { padding: '12px 14px 10px', boxShadow: 'none', minWidth: '0', overflow: 'hidden' } }, stopEye, stopQ, row);
    const zin = h('button', { class: 'icon-btn', 'aria-label': 'Zoom in', style: { fontSize: '22px', fontWeight: '700' } }, '+');
    const zout = h('button', { class: 'icon-btn', 'aria-label': 'Zoom out', style: { fontSize: '22px', fontWeight: '700' } }, '−');
    const slider = h('input', { type: 'range', class: 'range', min: '0', max: String(N * 100), step: '1', value: '0', 'aria-label': 'Zoom level, from this moment to the whole picture', style: { flex: '1', minWidth: '0', accentColor: '#39f0ff' } });
    const doneBtn = h('button', { class: 'btn ultra block', disabled: true }, 'Done zooming');
    dock.replaceChildren(promptCard, h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: '0' } }, zin, slider, zout), doneBtn);

    function render() {
      const W = box.clientWidth, H = box.clientHeight;
      if (!W || !H) return;
      const cx = W / 2, cy = H / 2;
      const s = Math.pow(2, -z);
      const base = Math.min(W * 0.4, 170);
      const ry = (rx) => rx * 0.6;
      card.style.width = `${Math.round(base * 2)}px`;
      card.style.transform = `translate(-50%,-50%) scale(${Math.max(s, 0.035)})`;
      card.style.opacity = String(Math.min(1, s * 5));
      const dot = Math.max(0, Math.min(1, (0.32 - s) / 0.18));
      here.style.opacity = String(dot);
      hereTag.style.opacity = String(Math.max(0, Math.min(1, (0.2 - s) / 0.1)));
      halo.setAttribute('cx', cx); halo.setAttribute('cy', cy);
      halo.setAttribute('rx', Math.max(30, base * 1.8 * s + 40)); halo.setAttribute('ry', Math.max(20, ry(base * 1.8 * s + 40)));
      const ringR = (i) => base * 1.55 * Math.pow(2, i - 1);
      const lab = [];
      for (let i = 1; i <= N; i++) {
        const rx = ringR(i) * s, r2 = ry(rx);
        rings[i].setAttribute('cx', cx); rings[i].setAttribute('cy', cy);
        rings[i].setAttribute('rx', rx); rings[i].setAttribute('ry', r2);
        const fit = rx < W * 0.5 ? 1 : Math.max(0, 1 - (rx - W * 0.5) / (W * 0.35));
        const tooSmall = rx < 22 ? Math.max(0, (rx - 8) / 14) : 1;
        rings[i].style.opacity = String(fit * tooSmall * (i === stop ? 1 : 0.5));
        const ly = cy - r2 - 10;
        lab[i] = { ly, fit, ok: fit > 0.05 && r2 > 18 && ly > 10 };
      }
      let lastY = -Infinity;
      for (let i = N; i >= 1; i--) {
        const L = lab[i];
        const roomy = L.ly - lastY >= 22;
        const show = L.ok && (roomy || i === stop);
        if (show) lastY = L.ly;
        labels[i].style.transform = `translate(${cx}px, ${L.ly}px) translate(-50%, -50%)`;
        labels[i].style.opacity = show ? String(Math.min(1, L.fit) * (i === stop ? 1 : 0.7)) : '0';
        labels[i].style.boxShadow = i === stop ? `0 0 0 1px ${RING_COL[i]}99, 0 0 16px ${RING_COL[i]}55` : 'none';
      }
      for (const st of stars) {
        const rIn = st.band === 1 ? base * 1.05 : ringR(st.band - 1);
        const r = (rIn + (ringR(st.band) - rIn) * st.f) * s;
        const x = cx + Math.cos(st.theta) * r, y = cy + Math.sin(st.theta) * ry(r);
        st.el.setAttribute('cx', x.toFixed(1)); st.el.setAttribute('cy', y.toFixed(1));
        const inView = x > -4 && x < W + 4 && y > -4 && y < H + 4;
        st.el.style.opacity = inView ? String(0.25 + st.tw * 0.15) : '0';
      }
      for (const L of lit) {
        const rIn = L.band === 1 ? base * 1.05 : ringR(L.band - 1);
        const r = (rIn + (ringR(L.band) - rIn) * 0.62) * s;
        L.el.setAttribute('cx', (cx + Math.cos(L.theta) * r).toFixed(1));
        L.el.setAttribute('cy', (cy + Math.sin(L.theta) * ry(r)).toFixed(1));
      }
    }
    function setZ(v, { fromSlider = false } = {}) {
      z = Math.max(0, Math.min(N, v));
      if (!fromSlider) slider.value = String(Math.round(z * 100));
      render();
      const k = Math.round(z);
      if (k !== stop) onStop(k);
    }
    function cancelTween() { cancelAnimationFrame(tween); tween = 0; }
    function goTo(target) {
      cancelTween();
      const to = Math.max(0, Math.min(N, Math.round(target)));
      if (rm) { setZ(to); return; }
      const from = z, t0 = performance.now(), dur = 460;
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        setZ(from + (to - from) * (1 - Math.pow(1 - p, 3)));
        if (p < 1 && !signal.aborted) tween = requestAnimationFrame(tick);
      };
      tween = requestAnimationFrame(tick);
    }
    function onStop(k) {
      const prev = stop;
      stop = k;
      maxStop = Math.max(maxStop, k);
      const S = STOPS[k];
      box.setAttribute('aria-valuenow', String(k));
      box.setAttribute('aria-valuetext', S.label);
      slider.setAttribute('aria-valuetext', S.label);
      zin.disabled = k === 0;
      zout.disabled = k === N;
      zin.style.opacity = k === 0 ? '.4' : '1';
      zout.style.opacity = k === N ? '.4' : '1';
      doneBtn.disabled = maxStop < 1;
      doneBtn.textContent = maxStop >= N ? 'That’s the bigger picture' : 'Done zooming';
      stopEye.textContent = k ? `${S.label} · ${k} of ${N}` : S.label;
      const zp = E.zoomPrompts(scenario, S.id);
      stopQ.textContent = k ? zp.question : 'Right now this moment fills the whole view.';
      row.replaceChildren();
      if (!k) {
        row.append(h('button', { class: 'choice', style: lineStyle(), onclick: () => goTo(1) }, h('b', {}, 'Pull back to today →'), h('span', { style: { display: 'block', color: 'var(--text-2)', fontSize: '13px', fontWeight: '500', marginTop: '2px' } }, 'Or pinch, drag up, or use the slider.')));
      } else {
        for (const line of zp.lines) {
          const on = chosen.get(S.id).includes(line.text);
          const b = h('button', { class: 'choice', 'aria-pressed': String(on), style: lineStyle() }, line.text);
          b.onclick = () => toggle(S, line, b);
          row.append(b);
        }
      }
      row.scrollLeft = 0;
      render();
      if (prev !== -1) {
        audio.fx?.('rotate-tick', { pitch: 0.8 + k * 0.12 });
        haptic('tick');
      }
      // Zuzu's spirals calm down as the camera pulls back
      setZuzu(k >= 3 ? { awe: 0.6, calm: 0.4 } : k === 2 ? { curious: 0.5, calm: 0.5 } : { curious: 0.8, awe: 0.2 }, Math.max(0.25, 1.4 - k * 0.3), Math.max(0, 0.5 - k * 0.16));
      realm()?.setMood?.({ clarity: 0.6 + k * 0.1 });
      if (!spoken.has(S.id) && prev !== -1) { spoken.add(S.id); sayLens(lensLine('zoom', S.id), 2600); }
      if (k === N && !cameoShown) { cameoShown = true; const seq = lensSeq; setTimeout(() => cameoPop('zoom', seq), 900); audio.fx?.('bloom', { intensity: 0.5 }); }
    }
    function lineStyle() {
      return { flex: '0 0 auto', width: compact() ? 'min(70vw, 230px)' : 'min(64vw, 240px)', minHeight: compact() ? '50px' : '58px', padding: compact() ? '6px 12px' : '8px 12px', fontSize: compact() ? '13.5px' : '14px', lineHeight: '1.3', whiteSpace: 'normal', scrollSnapAlign: 'start' };
    }
    function toggle(S, line, b) {
      const list = chosen.get(S.id);
      const on = !list.includes(line.text);
      chosen.set(S.id, on ? [...list, line.text] : list.filter((t) => t !== line.text));
      b.setAttribute('aria-pressed', String(on));
      audio.ui?.('select');
      haptic('light');
      const k = STOPS.indexOf(S);
      if (on) {
        world.react('nod');
        const theta = ((list.length * 97 + k * 53 + 20) * Math.PI) / 180;
        const el = svgEl('circle', { r: 4, fill: '#ffd98a', style: 'filter: drop-shadow(0 0 6px #ffd98a)' });
        litLayer.append(el);
        lit.push({ el, band: k, theta, text: line.text });
        if (!rm) el.animate?.([{ r: 9, opacity: 0.2 }, { r: 4, opacity: 1 }], { duration: 520, easing: 'ease-out' });
        audio.fx?.('star', { pitch: 1 + k * 0.1, intensity: 0.5 });
      } else {
        const i = lit.findIndex((L) => L.text === line.text && L.band === k);
        if (i >= 0) { lit[i].el.remove(); lit.splice(i, 1); }
      }
      render();
    }

    // gestures: drag up / pinch to zoom out, wheel, keyboard, slider, buttons
    const pts = new Map();
    let g0 = null;
    const snapshot = () => ({ z, pts: new Map([...pts].map(([k, v]) => [k, { ...v }])) });
    box.addEventListener('pointerdown', (e) => {
      box.setPointerCapture?.(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      cancelTween();
      g0 = snapshot();
      box.style.cursor = 'grabbing';
    });
    box.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId) || !g0) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const now = [...pts.values()], then = [...g0.pts.values()];
      if (now.length >= 2 && then.length >= 2) {
        const d0 = Math.hypot(then[0].x - then[1].x, then[0].y - then[1].y), d = Math.hypot(now[0].x - now[1].x, now[0].y - now[1].y);
        if (d0 > 12 && d > 12) setZ(g0.z + Math.log2(d0 / d) * 1.4);
      } else if (now.length === 1 && then.length === 1) {
        setZ(g0.z + (then[0].y - now[0].y) / 120);
      }
    });
    const release = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size) { g0 = snapshot(); return; }
      g0 = null;
      box.style.cursor = 'grab';
      goTo(z);
    };
    box.addEventListener('pointerup', release);
    box.addEventListener('pointercancel', release);
    box.addEventListener('wheel', (e) => { e.preventDefault(); cancelTween(); setZ(z + e.deltaY * 0.004); clearTimeout(wheelT); wheelT = setTimeout(() => goTo(z), 220); }, { passive: false });
    box.addEventListener('keydown', (e) => {
      const out1 = ['ArrowUp', 'ArrowRight', 'PageDown', '-', '_'], in1 = ['ArrowDown', 'ArrowLeft', 'PageUp', '+', '='];
      if (out1.includes(e.key)) goTo(Math.round(z) + 1);
      else if (in1.includes(e.key)) goTo(Math.round(z) - 1);
      else if (e.key === 'Home') goTo(0);
      else if (e.key === 'End') goTo(N);
      else return;
      e.preventDefault();
    });
    slider.addEventListener('input', () => { cancelTween(); setZ(Number(slider.value) / 100, { fromSlider: true }); });
    slider.addEventListener('change', () => goTo(Number(slider.value) / 100));
    zin.onclick = () => goTo(Math.round(z) - 1);
    zout.onclick = () => goTo(Math.round(z) + 1);

    lensLayout = () => {
      const zr = zoneRect();
      const { top } = placeZuzu(zr, Math.min(zr.height, 230), 0.3);
      const h0 = Math.max(70, zr.bottom - top);
      Object.assign(box.style, { left: `${zr.left}px`, top: `${top}px`, width: `${zr.width}px`, height: `${h0}px` });
      render();
    };
    lensLayout();
    setZ(0);
    requestAnimationFrame(() => lensLayout?.());
    sayLens(lensLine('zoom', 'intro'), 3000);
    const r = await choose([[doneBtn, true]]);
    cancelTween();
    if (r === ABORT) return ABORT;
    audio.fx?.('chime', { intensity: 0.6 });
    haptic('success');
    sayLens(lensLine('zoom', 'done'), 2400);
    const lines = STOPS.flatMap((S) => chosen.get(S.id));
    return { lines, reached: STOPS[maxStop].id };
  }

  // ------------------------------------------------------- FUTURE LENS --
  async function lensFuture() {
    const rm = !!ctx.reducedMotion;
    const deck = E.buildFutureDeck(scenario, { facts: out.facts, added: userAdded ? out.added : [] });
    const C = deck.copy;
    const res = { known: [], predicted: [], unsure: [], certainty: null, sealed: null };
    setMove(4, { eyebrow: 'Future lens', title: 'Known, or predicted?', prompt: compact() ? 'Drag it into the lens, or tap.' : 'Drop each piece into the lens: the clear half if it’s known, the misty half if it hasn’t happened yet.' });
    setZuzu({ curious: 0.7, awe: 0.3 }, 1.6, 0.35);
    audio.fx?.('lens-focus', { intensity: 0.6 });

    // the lens: clear "known" half above the NOW line, misty "predicted" half below
    const lens = h('div', { role: 'group', 'aria-label': 'Future lens', style: { position: 'absolute', borderRadius: '50%', pointerEvents: 'none', transition: rm ? 'none' : 'transform 500ms var(--ease-spring), opacity 400ms' } });
    const ring = h('div', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '-7px', borderRadius: '50%',
      background: 'conic-gradient(from 0deg, #39f0ff, #9f8bff, #c414e6, #ffd98a, #39f0ff)', WebkitMask: 'radial-gradient(circle, transparent 66%, #000 67.5%, #000 70.5%, transparent 72%)', mask: 'radial-gradient(circle, transparent 66%, #000 67.5%, #000 70.5%, transparent 72%)' } });
    const glass = h('div', { style: { position: 'absolute', inset: '0', borderRadius: '50%', overflow: 'hidden', background: 'rgba(16,8,50,.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
      boxShadow: 'inset 0 0 40px rgba(57,240,255,.25), 0 0 60px rgba(120,90,255,.4)' } });
    const mkHalf = (top) => h('div', { style: { position: 'absolute', left: '0', right: '0', [top ? 'top' : 'bottom']: '0', height: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: top ? 'flex-end' : 'flex-start', padding: top ? '0 15% 10px' : '12px 15% 0', textAlign: 'center', transition: 'background 220ms',
      background: top ? 'radial-gradient(120% 100% at 50% 100%, rgba(57,240,255,.2), rgba(57,240,255,.03) 70%)' : 'radial-gradient(120% 100% at 50% 0%, rgba(196,140,255,.3), rgba(80,40,160,.16) 70%)' } });
    const knownHalf = mkHalf(true), predHalf = mkHalf(false);
    const tagStyle = (col) => ({ font: '800 10px/1.2 var(--font-ui)', letterSpacing: '.13em', textTransform: 'uppercase', color: col, marginBottom: '4px' });
    const knownTag = h('div', { style: tagStyle('#9ff4ff') }, 'Known');
    const predTag = h('div', { style: tagStyle('#d9c2ff') }, 'Predicted');
    const listStyle = { fontSize: '12px', lineHeight: '1.3', color: 'var(--text-1)', maxWidth: '100%', overflow: 'hidden' };
    const knownList = h('div', { style: listStyle });
    const predList = h('div', { style: { ...listStyle, color: '#efe4ff' } });
    knownHalf.append(knownTag, knownList);
    predHalf.append(predTag, predList);
    const fog = [0, 1, 2].map((i) => h('div', { 'aria-hidden': 'true', style: { position: 'absolute', left: `${-30 + i * 25}%`, width: '90%', top: `${58 + i * 11}%`, height: '30%', borderRadius: '50%',
      background: 'radial-gradient(closest-side, rgba(255,255,255,.16), transparent)', filter: 'blur(6px)', pointerEvents: 'none' } }));
    const horizon = h('div', { 'aria-hidden': 'true', style: { position: 'absolute', left: '5%', right: '5%', top: '50%', height: '2px', marginTop: '-1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.85), transparent)' } },
      h('span', { style: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', padding: '2px 7px', borderRadius: '999px', background: '#1a0d44', border: '1px solid rgba(255,255,255,.5)', font: '800 9px/1.2 var(--font-ui)', letterSpacing: '.16em', color: '#fff' } }, 'NOW'));
    const centre = h('div', { style: { position: 'absolute', left: '12%', right: '12%', top: '50%', transform: 'translateY(-50%)', textAlign: 'center', opacity: '0', transition: rm ? 'none' : 'opacity 400ms, filter 300ms', pointerEvents: 'none' } });
    glass.append(knownHalf, predHalf, ...fog, horizon, centre);
    const arc = svgEl('svg', { viewBox: '0 0 100 100', style: 'position:absolute;inset:-14px;width:calc(100% + 28px);height:calc(100% + 28px);overflow:visible;opacity:0;transition:opacity 400ms', 'aria-hidden': 'true' });
    const arcTrack = svgEl('circle', { cx: 50, cy: 50, r: 48, fill: 'none', stroke: 'rgba(255,255,255,.12)', 'stroke-width': 1.6 });
    const arcFill = svgEl('circle', { cx: 50, cy: 50, r: 48, fill: 'none', stroke: '#ffd98a', 'stroke-width': 2.4, 'stroke-linecap': 'round', transform: 'rotate(-90 50 50)', 'stroke-dasharray': '0 302', style: 'filter: drop-shadow(0 0 3px #ffd98a); transition: stroke-dasharray 160ms' });
    arc.append(arcTrack, arcFill);
    lens.append(ring, glass, arc);
    stageEl.append(lens);
    if (!rm) {
      ring.animate?.([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 24000, iterations: Infinity });
      fog.forEach((f, i) => f.animate?.([{ transform: 'translateX(-8%)' }, { transform: 'translateX(10%)' }], { duration: 5200 + i * 1300, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }));
    }
    let lensSize = 240;
    let focusText = null;
    let phase = 'sort';
    lensLayout = () => {
      const zr = zoneRect();
      const size = Math.round(Math.max(120, Math.min(330, zr.width * 0.84, zr.height - 14)));
      const { top } = placeZuzu(zr, size + 14, 0.32);
      lensSize = size;
      const y = top + Math.max(7, (zr.bottom - top - size) / 2);
      Object.assign(lens.style, { width: `${size}px`, height: `${size}px`, left: `${zr.cx - size / 2}px`, top: `${y}px` });
      const fs = size < 170 ? 10.5 : size < 220 ? 11.5 : 12.5;
      knownList.style.fontSize = predList.style.fontSize = `${fs}px`;
      if (focusText) focusText.style.fontSize = `${size < 170 ? 12.5 : size < 220 ? 14 : 16.5}px`;
      const tiny = phase !== 'sort' && size < 200;
      knownHalf.style.visibility = predHalf.style.visibility = tiny ? 'hidden' : 'visible';
    };
    lensLayout();

    function renderLists() {
      const show = (list, el) => {
        el.replaceChildren(...list.slice(-2).map((t) => h('div', { style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, t)));
        if (list.length > 2) el.prepend(h('div', { style: { opacity: '.7' } }, `+${list.length - 2} more`));
      };
      show(res.known, knownList);
      show(res.predicted, predList);
    }

    // --- 1. sort
    const pieces = deck.pieces.slice();
    let idx = 0;
    const srcTag = h('div', { class: 'eyebrow', style: { color: '#d9c2ff' } });
    const ptext = h('div', { style: { fontWeight: '700', fontSize: '16.5px', lineHeight: '1.3', color: 'var(--text-1)', marginTop: '4px' } });
    const count = h('div', { class: 'muted', style: { marginTop: '6px', fontSize: '12.5px' } });
    const pcard = h('div', { class: 'card', role: 'group', style: { padding: '12px 14px', boxShadow: 'none', touchAction: 'none', cursor: 'grab', position: 'relative', zIndex: '2', userSelect: 'none', WebkitUserSelect: 'none' } }, srcTag, ptext, count);
    const mkB = (label, col, side) => h('button', { class: 'btn', style: { minHeight: '48px', fontSize: innerWidth < 360 ? '12.5px' : '13.5px', padding: '0 4px', borderColor: col }, onclick: () => sort(side) }, label);
    const bKnown = mkB('Known ↑', '#39f0ff', 'known'), bPred = mkB('Predicted ↓', '#c48cff', 'predicted'), bUnsure = mkB(C.unsureLabel || 'Not sure', '#ffd98a', 'unsure');
    const sortRow = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' } }, bKnown, bPred, bUnsure);
    dock.replaceChildren(pcard, sortRow);
    let sortDone = null;
    const sorted = new Promise((r) => { sortDone = r; });
    function showPiece() {
      const p = pieces[idx];
      if (!p) { sortDone(true); return; }
      srcTag.textContent = p.source === 'you' ? 'Your words' : p.guess === 'predicted' ? 'A common prediction here' : 'Often part of this';
      ptext.textContent = p.text;
      count.textContent = compact() ? `Piece ${idx + 1} of ${pieces.length}` : `Piece ${idx + 1} of ${pieces.length} · drag it into the lens, or tap a button`;
      pcard.style.opacity = '1';
      if (!rm) pcard.animate?.([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' });
    }
    function sort(side, ghost = null) {
      const p = pieces[idx];
      if (!p) return;
      res[side].push(p.text);
      if (side !== 'unsure') flyTo(side === 'known', ghost);
      else ghost?.remove();
      audio.fx?.(side === 'unsure' ? 'rotate-tick' : 'drop-in', { pan: 0, pitch: side === 'known' ? 1.15 : 0.85 });
      haptic('light');
      if (side === 'predicted') world.react('gasp');
      renderLists();
      idx++;
      showPiece();
    }
    function mkGhost(r, t) {
      return h('div', { 'aria-hidden': 'true', style: { position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, padding: '12px 14px', borderRadius: '20px', color: '#fff', fontWeight: '700', fontSize: '16px', lineHeight: '1.3',
        background: 'linear-gradient(135deg, rgba(57,240,255,.28), rgba(196,20,230,.34))', border: '1px solid rgba(255,255,255,.45)', boxShadow: '0 14px 40px rgba(10,0,40,.55)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', pointerEvents: 'none', zIndex: '5' } }, t);
    }
    function flyTo(top, ghost) {
      const L = lens.getBoundingClientRect();
      const tx0 = L.left + L.width / 2, ty0 = L.top + L.height * (top ? 0.3 : 0.7);
      realm()?.pulse?.('ripple', { x: tx0, y: ty0 });
      if (rm) { ghost?.remove(); return; }
      const g = ghost || mkGhost(pcard.getBoundingClientRect(), ptext.textContent);
      if (!ghost) stageEl.append(g);
      const from = g.getBoundingClientRect();
      const base = getComputedStyle(g).transform;
      const tx = tx0 - (from.left + from.width / 2), ty = ty0 - (from.top + from.height / 2);
      const start = base && base !== 'none' ? base : 'none';
      const a = g.animate?.([{ transform: start, opacity: 1 }, { transform: `translate(${tx}px, ${ty}px) ${start === 'none' ? '' : start} scale(.22)`, opacity: 0 }], { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
      if (a) a.onfinish = () => g.remove(); else g.remove();
      signal.addEventListener('abort', () => g.remove());
    }
    // drag the piece up into either half of the lens
    let drag = null;
    const overHalf = (x, y) => {
      const L = lens.getBoundingClientRect();
      const dx = x - (L.left + L.width / 2), dy = y - (L.top + L.height / 2);
      if (Math.hypot(dx, dy) > L.width / 2 + 24) return null;
      return dy < 0 ? 'known' : 'predicted';
    };
    const glow = (side) => {
      knownHalf.style.background = side === 'known' ? 'radial-gradient(120% 100% at 50% 100%, rgba(57,240,255,.45), rgba(57,240,255,.08) 75%)' : 'radial-gradient(120% 100% at 50% 100%, rgba(57,240,255,.2), rgba(57,240,255,.03) 70%)';
      predHalf.style.background = side === 'predicted' ? 'radial-gradient(120% 100% at 50% 0%, rgba(196,140,255,.55), rgba(80,40,160,.25) 75%)' : 'radial-gradient(120% 100% at 50% 0%, rgba(196,140,255,.3), rgba(80,40,160,.16) 70%)';
    };
    // the dragged piece is a floating copy in the stage, so it passes over the lens
    pcard.addEventListener('pointerdown', (e) => { if (!pieces[idx] || e.button > 0) return; drag = { x: e.clientX, y: e.clientY, moved: false, ghost: null, rect: pcard.getBoundingClientRect() }; pcard.setPointerCapture?.(e.pointerId); });
    pcard.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 6) {
        drag.moved = true;
        drag.ghost = mkGhost(drag.rect, pieces[idx].text);
        stageEl.append(drag.ghost);
        pcard.style.opacity = '.3';
      }
      if (!drag.moved) return;
      drag.ghost.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 40}deg) scale(${dy < -40 ? 0.9 : 1})`;
      glow(overHalf(e.clientX, e.clientY));
    });
    const drop = (e) => {
      if (!drag) return;
      const { moved, ghost } = drag;
      const side = moved ? overHalf(e.clientX, e.clientY) : null;
      drag = null;
      glow(null);
      if (side) { sort(side, ghost); return; }
      pcard.style.opacity = '1';
      if (ghost && !rm) {
        const a = ghost.animate?.([{ transform: ghost.style.transform }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.34,1.56,.64,1)' });
        if (a) a.onfinish = () => ghost.remove(); else ghost.remove();
      } else ghost?.remove();
    };
    pcard.addEventListener('pointerup', drop);
    pcard.addEventListener('pointercancel', drop);
    showPiece();
    sayLens(lensLine('future', 'intro'), 3000);
    const sortedOk = await Promise.race([sorted, new Promise((r) => signal.addEventListener('abort', () => r(false)))]);
    if (!sortedOk || signal.aborted) return ABORT;
    haptic('pop');
    audio.fx?.('separate', { intensity: 0.6 });

    // --- 2. how sure does the prediction feel?
    const focus = res.predicted.find((t) => deck.ownPredictions.includes(t)) || res.predicted[0];
    if (!focus) {
      setMove(4, { eyebrow: 'Future lens', title: 'No crystal ball needed', prompt: '' });
      sayLens(lensLine('future', 'noPrediction'), 3000);
      const carry = h('button', { class: 'btn ultra block' }, 'Carry on');
      dock.replaceChildren(h('div', { class: 'card', style: { padding: '12px 14px', boxShadow: 'none' } },
        h('p', { style: { margin: 0, color: 'var(--text-1)' } }, lensLine('future', 'noPrediction'))), carry);
      if ((await choose([[carry, true]])) === ABORT) return ABORT;
      return res;
    }
    setMove(4, { eyebrow: 'Future lens', title: 'How sure does it feel?', prompt: compact() ? '' : 'There’s no right number. 0 is a wild guess; 100 is certain.' });
    sayLens(lensLine('future', 'sorted'), 2600);
    { const seq = lensSeq; setTimeout(() => cameoPop('future', seq), 3000); }
    const unknownLines = deck.unknowns.slice(0, 2);
    knownList.replaceChildren(h('div', {}, res.known.length ? `${res.known.length} known ${res.known.length === 1 ? 'thing' : 'things'}` : 'Nothing known yet'));
    phase = 'rate';
    predTag.textContent = 'Still unknown';
    // known count up at the rim, unknowns down in the mist, the prediction in focus between
    Object.assign(knownHalf.style, { justifyContent: 'flex-start', padding: '11% 18% 0' });
    Object.assign(predHalf.style, { justifyContent: 'flex-end', padding: '0 16% 12%' });
    predList.replaceChildren(...unknownLines.map((t) => h('div', { style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: '.85' } }, t)));
    focusText = h('div', { style: { font: `700 ${lensSize < 170 ? 12.5 : lensSize < 220 ? 14 : 16.5}px/1.3 var(--font-display)`, color: '#fff', textShadow: '0 2px 12px rgba(10,0,40,.8)' } }, `“${focus}”`);
    centre.replaceChildren(
      h('div', { style: { font: '800 9.5px/1.2 var(--font-ui)', letterSpacing: '.14em', textTransform: 'uppercase', color: '#ffd98a', marginBottom: '4px' } }, 'Your prediction'), focusText);
    centre.style.background = 'radial-gradient(closest-side, rgba(16,8,50,.92), rgba(16,8,50,.6) 70%, transparent)';
    centre.style.padding = '12px 6px';
    centre.style.opacity = '1';
    horizon.style.opacity = '0';
    arc.style.opacity = '1';
    const num = h('div', { 'aria-hidden': 'true', style: { font: '700 34px/1 var(--font-display)', color: '#ffd98a', minWidth: '2.2em', textAlign: 'right' } }, '–');
    const sure = h('input', { type: 'range', class: 'range', min: '0', max: '100', step: '1', value: '50', 'aria-label': C.sureQuestion, style: { flex: '1', minWidth: '0' } });
    const band = h('p', { 'aria-live': 'polite', style: { margin: '8px 0 0', color: 'var(--text-2)', fontSize: '14px', minHeight: '2.6em' } }, 'Slide to show how sure it feels. You can leave it if you’d rather not.');
    const sealBtn = h('button', { class: 'btn', style: { fontSize: innerWidth < 360 ? '14px' : '15px' } }, 'Seal for later');
    const carry = h('button', { class: 'btn ultra', style: { fontSize: innerWidth < 360 ? '14px' : '15px' } }, 'Carry on');
    dock.replaceChildren(h('div', { class: 'card', style: { padding: '12px 14px', boxShadow: 'none' } },
      h('div', { class: 'eyebrow', style: { color: '#ffd98a' } }, 'How sure, from 0 to 100?'),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' } }, sure, num), band),
    h('div', { class: 'row-btns' }, sealBtn, carry));
    const onSure = () => {
      const n = Number(sure.value);
      res.certainty = n;
      num.textContent = String(n);
      band.textContent = E.certaintyBand(n).text;
      arcFill.setAttribute('stroke-dasharray', `${(n / 100) * 301.6} 302`);
      centre.style.filter = `blur(${((100 - n) / 100) * 0.8}px)`;
      // Zuzu's spirals spin faster the surer the forecast feels
      setZuzu(n >= 80 ? { curious: 0.5, anxious: 0.5 } : n >= 40 ? { curious: 0.8, calm: 0.2 } : { calm: 0.6, curious: 0.4 }, 0.3 + (n / 100) * 2, n >= 80 ? 0.6 : 0.1, 0.65);
    };
    let lastTick = -1;
    sure.addEventListener('input', () => { onSure(); const b = Math.round(Number(sure.value) / 10); if (b !== lastTick) { lastTick = b; audio.fx?.('rotate-tick', { pitch: 0.7 + b * 0.06 }); haptic('tick'); } });
    let choice = await choose([[sealBtn, 'seal'], [carry, 'carry']]);
    if (choice === ABORT) return ABORT;

    // --- 3. optional: seal it to open later
    if (choice === 'seal') {
      dismissCameo();
      let when = 'month';
      const chips = h('div', { role: 'group', 'aria-label': C.sealQuestion, style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '8px' } }, ...LX.SEAL_WHEN.map((w) => {
        const c = h('button', { class: 'chip', 'aria-pressed': String(w.id === when), style: { justifyContent: 'center', textAlign: 'center', padding: '4px 6px', fontSize: '13px', lineHeight: '1.15', whiteSpace: 'normal' } }, w.label);
        c.onclick = () => { when = w.id; chips.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === c))); audio.ui?.('select'); };
        return c;
      }));
      setMove(4, { eyebrow: 'Future lens', title: 'Seal the prediction?', prompt: compact() ? '' : 'Future-you gets to open it and see what really happened.' });
      const note = sealStore ? (compact() ? 'Kept on this phone only.' : 'Kept on this phone only. Another Angle will offer to open it when it’s time.')
        : compact() ? 'Saved angles are off in Settings, so it stays in today’s star map only.' : '“Keep my saved angles” is off in Settings, so this stays in today’s star map only — nothing is saved.';
      const doSeal = h('button', { class: 'btn ultra' }, 'Seal it');
      const back = h('button', { class: 'btn' }, 'Not now');
      dock.replaceChildren(h('div', { class: 'card', style: { padding: '12px 14px', boxShadow: 'none' } },
        h('p', { style: { margin: 0, fontWeight: '700', color: 'var(--text-1)', fontSize: compact() ? '14.5px' : '16px' } }, C.sealQuestion), chips,
        h('p', { class: 'muted', style: { margin: '8px 0 0' } }, note)), h('div', { class: 'row-btns' }, back, doSeal));
      choice = await choose([[doSeal, 'seal'], [back, 'skip']]);
      if (choice === ABORT) return ABORT;
      if (choice === 'seal') {
        let stored = false;
        if (sealStore) {
          const w = LX.SEAL_WHEN.find((x) => x.id === when);
          const now = Date.now();
          const entry = { id: `seal-${now}`, text: focus, certainty: res.certainty, when, sealedAt: now, dueAt: now + (w?.days || 0) * 86400000, scenario: scenario.id };
          stored = sealStore.save([...sealStore.all(), entry]) !== false;
        }
        res.sealed = { when, stored };
        setMove(4, { eyebrow: 'Future lens', title: 'Sealed', prompt: '' });
        phase = 'sealed';
        await sealAnimation();
        if (signal.aborted) return ABORT;
        sayLens(lensLine('future', stored ? 'sealed' : 'sealedSession'), 3000);
        const fin = h('button', { class: 'btn ultra block' }, 'Carry on');
        dock.replaceChildren(h('div', { class: 'card', style: { padding: '12px 14px', boxShadow: 'none' } },
          h('div', { class: 'eyebrow', style: { color: '#ffd98a' } }, 'Sealed'),
          h('p', { style: { margin: '4px 0 0', color: 'var(--text-1)' } }, `${LX.SEAL_WHEN.find((x) => x.id === when)?.label || 'Later'}, open it and see how it really went.`),
          h('p', { class: 'muted', style: { margin: '6px 0 0' } }, stored ? 'Saved on this phone only.' : 'Not saved anywhere — it’s in today’s star map.')), fin);
        if ((await choose([[fin, true]])) === ABORT) return ABORT;
      }
    }
    sayLens(lensLine('future', 'done'), 2400);
    return res;

    async function sealAnimation() {
      audio.fx?.('snap', { intensity: 0.8 });
      haptic('success');
      world.react('celebrate');
      const seal = svgEl('svg', { viewBox: '-50 -50 100 100', 'aria-hidden': 'true', style: `position:absolute;left:50%;top:50%;width:46%;height:46%;transform:translate(-50%,-50%) scale(${rm ? 1 : 0.2});opacity:${rm ? 1 : 0};transition:transform 520ms var(--ease-spring), opacity 300ms;overflow:visible` });
      const g = svgEl('radialGradient', { id: 'sealWax', cx: '35%', cy: '30%' }, svgEl('stop', { offset: '0%', 'stop-color': '#ff9cf0' }), svgEl('stop', { offset: '60%', 'stop-color': '#c414e6' }), svgEl('stop', { offset: '100%', 'stop-color': '#5a1aa8' }));
      let d = 'M0 0';
      for (let t = 0; t < 14; t += 0.25) d += ` L${(Math.cos(t) * t * 2.3).toFixed(2)} ${(Math.sin(t) * t * 2.3).toFixed(2)}`;
      seal.append(svgEl('defs', {}, g), svgEl('path', { d: 'M0-46 C14-46 18-38 30-35 S46-18 44-2 S40 26 30 34 S10 47-2 46 S-28 40-36 30 S-48 8-45-8 S-36-36-24-41 S-12-46 0-46Z', fill: 'url(#sealWax)', stroke: 'rgba(255,255,255,.35)', 'stroke-width': 1.2 }),
        svgEl('path', { d, fill: 'none', stroke: 'rgba(255,255,255,.85)', 'stroke-width': 3, 'stroke-linecap': 'round' }));
      centre.style.opacity = '0';
      knownHalf.style.opacity = predHalf.style.opacity = '0.25';
      arc.style.opacity = '0.4';
      glass.append(seal);
      if (!rm) {
        lens.style.transform = 'scale(.9)';
        await wait(30);
        seal.style.transform = 'translate(-50%,-50%) scale(1)';
        seal.style.opacity = '1';
        await wait(260);
        lens.style.transform = 'none';
      }
      audio.fx?.('chime', { intensity: 0.7 });
      realm()?.pulse?.('success', { x: innerWidth / 2, y: lens.getBoundingClientRect().top + lensSize / 2 });
      await wait(rm ? 120 : 520);
    }
  }

  // ----------------------------------------------------- MEANING MIXER --
  async function lensMixer(mixSource) {
    const rm = !!ctx.reducedMotion;
    const mx = E.buildMixer(mixSource);
    const picks = mx.dials.map(() => 0);
    let cur = E.mixSentence(mx, picks);
    let turns = 0;
    setMove(4, { eyebrow: 'Meaning mixer', title: 'Turn the dials', prompt: compact() ? '' : 'Turn a dial on the loud words. Keep whichever version feels most accurate — even the first.' });
    setZuzu({ curious: 0.6, anxious: 0.4 }, 1.4, 0.8, 0.65);
    audio.fx?.('lens-focus', { intensity: 0.5, pitch: 1.2 });

    // stage: the sentence with glowing dial words, and the heaviness meter
    const block = h('div', { style: { position: 'absolute', textAlign: 'center', pointerEvents: 'none' } });
    const sentence = h('div', { 'aria-live': 'polite', style: { font: '700 22px/1.42 var(--font-display)', color: '#fff', textShadow: '0 2px 18px rgba(20,0,60,.7)', textWrap: 'balance' } });
    const meterLbl = h('span', { style: { font: '800 10.5px/1 var(--font-ui)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-2)' } }, 'How heavy it sounds');
    const meterBand = h('span', { style: { font: '800 10.5px/1 var(--font-ui)', letterSpacing: '.14em', textTransform: 'uppercase', color: '#ff9cf0' } });
    const fill = h('i', { style: { transition: rm ? 'none' : 'width 420ms var(--ease-out)' } });
    const meter = h('div', { class: 'meter', role: 'meter', 'aria-label': 'How heavy the sentence sounds', 'aria-valuemin': '0', 'aria-valuemax': '100', style: { height: '10px', marginTop: '6px', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)' } }, fill);
    const caption = h('p', { style: { margin: '10px auto 0', maxWidth: '34ch', color: 'var(--text-2)', fontSize: '13.5px', minHeight: '1.4em', transition: 'opacity 300ms' } });
    const meterWrap = h('div', { style: { margin: '14px auto 0', maxWidth: '300px', textAlign: 'left' } }, h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '8px' } }, meterLbl, meterBand), meter);
    block.append(sentence, meterWrap, caption);
    stageEl.append(block);

    // dock: one knob per loud word, then the choice
    const knobs = mx.dials.map((d, i) => mkKnob(d, i));
    const keepOrig = h('button', { class: 'btn', style: { fontSize: innerWidth < 360 ? '14px' : '15px' } }, 'Keep my words');
    const keepMix = h('button', { class: 'btn ultra', disabled: true, style: { fontSize: innerWidth < 360 ? '14px' : '15px' } }, 'Keep this mix');
    dock.replaceChildren(
      h('div', { style: { display: 'flex', justifyContent: 'center', gap: compact() ? '8px' : '14px' } }, ...knobs.map((k) => k.wrap)),
      h('p', { class: 'muted', style: { margin: '2px 0 0', textAlign: 'center' } }, 'Which version feels most accurate?'),
      h('div', { class: 'row-btns' }, keepOrig, keepMix));

    lensLayout = () => {
      const zr = zoneRect();
      const fs = zr.height < 190 ? 18 : zr.height < 260 ? 20 : 23;
      sentence.style.fontSize = `${fs}px`;
      block.style.width = `${Math.min(zr.width - 8, 420)}px`;
      block.style.left = `${zr.cx}px`;
      block.style.transform = 'translateX(-50%)';
      const bh = block.offsetHeight || 160;
      const { top } = placeZuzu(zr, bh, 0.34);
      block.style.top = `${Math.round(top + Math.max(0, (zr.bottom - top - bh) / 2))}px`;
    };
    function renderAll(changedIdx = -1) {
      cur = E.mixSentence(mx, picks);
      sentence.replaceChildren(...cur.segments.map((sg) => {
        if (sg.dial == null) return document.createTextNode(sg.text);
        const d = mx.dials[sg.dial];
        const opt = d.options[picks[sg.dial]];
        const hot = opt.heat;
        const col = hot >= 0.8 ? '#ff5be9' : hot >= 0.55 ? '#c48cff' : '#39f0ff';
        const sp = h('span', { style: { padding: '0 6px', margin: '0 1px', borderRadius: '10px', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', cursor: 'pointer', pointerEvents: 'auto',
          background: `linear-gradient(180deg, ${col}33, ${col}22)`, boxShadow: `inset 0 0 0 1.5px ${col}cc, 0 0 16px ${col}55`, transition: rm ? 'none' : 'box-shadow 300ms' } }, sg.text);
        sp.onclick = () => turn(sg.dial, 1, true);
        if (sg.dial === changedIdx && !rm) sp.animate?.([{ transform: 'translateY(-8px)', opacity: 0, filter: 'blur(4px)' }, { transform: 'none', opacity: 1, filter: 'none' }], { duration: 360, easing: 'cubic-bezier(.22,1,.36,1)' });
        return sp;
      }));
      const pct = Math.round(cur.heat * 100);
      fill.style.width = `${pct}%`;
      meter.setAttribute('aria-valuenow', String(pct));
      meter.setAttribute('aria-valuetext', cur.band);
      meterBand.textContent = cur.band;
      keepMix.disabled = !cur.changed;
      knobs.forEach((k) => k.sync());
      lensLayout?.();
    }
    function turn(i, delta, wrap = false) {
      const d = mx.dials[i];
      const n = d.options.length;
      let k = picks[i] + delta;
      k = wrap ? ((k % n) + n) % n : Math.max(0, Math.min(n - 1, k));
      if (k === picks[i]) return;
      picks[i] = k;
      turns++;
      renderAll(i);
      audio.fx?.('rotate-tick', { pitch: 0.8 + k * 0.15 });
      haptic('tick');
      const heat = cur.heat;
      // Zuzu's face follows how heavy the words are: fast wobbly spirals for
      // the heaviest, slower and steadier as the sentence gets plainer
      setZuzu(heat >= 0.8 ? { anxious: 0.45, curious: 0.55 } : heat >= 0.5 ? { curious: 0.8, hopeful: 0.2 } : { calm: 0.5, hopeful: 0.5 }, heat >= 0.8 ? 1.5 : heat >= 0.5 ? 0.85 : 0.35, heat >= 0.8 ? 0.85 : heat >= 0.5 ? 0.3 : 0, 0.65);
      world.react(heat < 0.5 ? 'nod' : 'tap');
      caption.textContent = picks.every((p) => p === 0) ? lensLine('mixer', 'back') : lensLine('mixer', 'turned');
      if (turns === 2) { const seq = lensSeq; setTimeout(() => cameoPop('mixer', seq), 700); }
    }
    function mkKnob(d, i) {
      const size = compact() ? 56 : 64;
      const n = d.options.length;
      const angleFor = (k) => -135 + (n > 1 ? (270 * k) / (n - 1) : 0);
      const svg = svgEl('svg', { viewBox: '0 0 100 100', width: size, height: size, 'aria-hidden': 'true', style: `overflow:visible;display:block;width:${size}px;height:${size}px` });
      const gid = `knob${i}`;
      svg.append(svgEl('defs', {}, svgEl('radialGradient', { id: gid, cx: '38%', cy: '30%' }, svgEl('stop', { offset: '0%', 'stop-color': '#5b3bb0' }), svgEl('stop', { offset: '100%', 'stop-color': '#1b0d44' }))));
      svg.append(svgEl('circle', { cx: 50, cy: 50, r: 34, fill: `url(#${gid})`, stroke: 'rgba(255,255,255,.35)', 'stroke-width': 1.5 }));
      const ticks = [];
      for (let k = 0; k < n; k++) {
        const a = ((angleFor(k) - 90) * Math.PI) / 180;
        const t = svgEl('circle', { cx: 50 + Math.cos(a) * 45, cy: 50 + Math.sin(a) * 45, r: 4, fill: 'rgba(255,255,255,.3)' });
        ticks.push(t);
        svg.append(t);
      }
      const pointer = svgEl('g', { style: `transform-origin:50px 50px;transition:${rm ? 'none' : 'transform 320ms cubic-bezier(.34,1.56,.64,1)'}` },
        svgEl('line', { x1: 50, y1: 50, x2: 50, y2: 22, stroke: '#fff', 'stroke-width': 5, 'stroke-linecap': 'round' }),
        svgEl('circle', { cx: 50, cy: 50, r: 6, fill: '#fff' }));
      svg.append(pointer);
      const btn = h('button', { class: 'icon-btn', style: { width: `${size + 10}px`, height: `${size + 10}px`, touchAction: 'none', background: 'radial-gradient(circle, rgba(196,20,230,.25), rgba(20,10,50,.6))', boxShadow: '0 0 24px rgba(196,20,230,.35)' } }, svg);
      const word = h('div', { 'aria-hidden': 'true', style: { font: '800 9.5px/1.1 var(--font-ui)', letterSpacing: '.12em', textTransform: 'uppercase', color: '#ff9cf0', marginTop: '6px', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, E.dialKey(d));
      const now = h('div', { 'aria-hidden': 'true', style: { fontSize: '12px', color: 'var(--text-1)', marginTop: '2px', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } });
      const wrap = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 1 112px', minWidth: '0', textAlign: 'center' } }, btn, word, now);
      let suppress = false;
      btn.addEventListener('click', () => { if (suppress) { suppress = false; return; } turn(i, 1, true); });
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') turn(i, 1);
        else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') turn(i, -1);
        else if (e.key === 'Home') turn(i, -picks[i]);
        else if (e.key === 'End') turn(i, n - 1 - picks[i]);
        else return;
        e.preventDefault();
      });
      // drag up/right (or round the dial) to turn it
      let g = null;
      btn.addEventListener('pointerdown', (e) => { g = { x: e.clientX, y: e.clientY, k: picks[i], moved: false }; btn.setPointerCapture?.(e.pointerId); });
      btn.addEventListener('pointermove', (e) => {
        if (!g) return;
        const dist = (e.clientX - g.x) - (e.clientY - g.y);
        if (Math.abs(dist) > 8) g.moved = true;
        if (!g.moved) return;
        const target = Math.max(0, Math.min(n - 1, g.k + Math.round(dist / 30)));
        if (target !== picks[i]) turn(i, target - picks[i]);
      });
      const up = () => { if (g?.moved) suppress = true; g = null; setTimeout(() => { suppress = false; }, 350); };
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      function sync() {
        const k = picks[i];
        pointer.style.transform = `rotate(${angleFor(k)}deg)`;
        ticks.forEach((t, j) => { t.setAttribute('fill', j === k ? (k ? '#39f0ff' : '#ff5be9') : 'rgba(255,255,255,.3)'); t.setAttribute('r', j === k ? 5.5 : 4); });
        const opt = d.options[k];
        now.textContent = k ? opt.text : 'as you wrote it';
        btn.setAttribute('aria-label', `Dial for “${E.dialKey(d)}”. Now: ${k ? `“${opt.text}”` : 'your own words'}, setting ${k + 1} of ${n}. Press to turn.`);
      }
      return { wrap, sync };
    }
    renderAll();
    requestAnimationFrame(() => lensLayout?.());
    sayLens(mx.dials.length ? lensLine('mixer', 'intro') : lensLine('mixer', 'none'), 3200, caption);
    const pick = await choose([[keepOrig, 'original'], [keepMix, 'mix']]);
    if (pick === ABORT) return ABORT;
    if (pick === 'mix') { audio.fx?.('chime', { intensity: 0.7 }); haptic('success'); world.react('celebrate'); sayLens(lensLine('mixer', 'mixed'), 2800); }
    else { audio.fx?.('star', { intensity: 0.5 }); haptic('light'); world.react('nod'); sayLens(lensLine('mixer', 'kept'), 2800); }
    await wait(rm ? 200 : 650);
    return { original: mx.text, chosen: pick === 'mix' ? cur.text : mx.text, choice: pick, picks: picks.slice() };
  }

  // ------------------------------------- opening a sealed prediction later --
  function openSealed(p) {
    const body = h('div', {});
    const when = new Date(p.sealedAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    const draw = (reply) => {
      body.replaceChildren(
        h('p', { class: 'muted', style: { margin: '0 0 8px' } }, `Sealed on ${when}${Number.isFinite(p.certainty) ? ` · it felt ${p.certainty}/100 sure` : ''}`),
        h('p', { style: { margin: '0 0 14px', font: '700 20px/1.35 var(--font-display)', color: 'var(--text-1)' } }, `“${p.text}”`),
        h('p', { style: { margin: '0 0 8px', fontWeight: '700' } }, 'How did it go?'),
        h('div', { class: 'chips' }, ...LX.SEAL_OUTCOMES.map((o) => h('button', { class: 'chip', 'aria-pressed': String(reply?.id === o.id), onclick: () => record(o) }, o.label))),
        reply ? h('p', { style: { margin: '12px 0 0', color: 'var(--text-2)' } }, reply.reply) : null,
        h('button', { class: 'btn ghost block', style: { marginTop: '14px' }, onclick: () => { sealStore?.save(sealStore.all().filter((x) => x.id !== p.id)); sheet.close(); ctx.toast('Deleted from this phone'); } }, 'Delete it'));
    };
    const record = (o) => {
      if (sealStore) {
        const list = sealStore.all().map((x) => (x.id !== p.id ? x : o.id === 'unknown' ? { ...x, when: x.when === 'after' ? 'after' : 'week', dueAt: Date.now() + 7 * 86400000 } : { ...x, outcome: o.id, openedAt: Date.now() }));
        sealStore.save(list);
      }
      audio.ui?.('select');
      draw(o);
    };
    draw(null);
    const sheet = openSheet({ title: 'Your sealed prediction', body });
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
