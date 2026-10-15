// Belief Mallows inside Another Angle (hushmallow Beyond): the flow, and the few seams it needs in another-angle.js.
//
// An authored, optional look at a story that keeps coming back. The person names it (or taps one of their own words
// from this visit, or a Belief Mallow they kept), it becomes a Belief Mallow carrying the prop they pick, and short
// tactile experiences (stage.js) let them see how it shapes things and loosen it: more flexible, less dominant, better
// understood. It never says the belief is wrong and never diagnoses (lines.js). Structured reframing and evidence
// stay Another Angle's own: "Look at it from another angle" hands over to Another Angle's ordinary, consented path.
//
// Safety: the belief's words are a Tell. Typed, they are read by the compact input exactly as any Tell (crisis: urgent
// support at once, nothing kept); tapped (their recent words, a kept belief) they go through Another Angle's afterTell
// all the same. So the risk screener, the lexicon, the grief and backstop readings, the check-in and the gentle paths
// route them before anything plays, exactly as for a Tell, and the one question comes before the Belief Mallow (in
// belief words, with the same three equal answers: "I'm not okay" is support first). Only where a Tell would reach an
// angle does a Belief Mallow play (the hook in startAngle sits after every one of those routes); crisis or care seen at
// any moment ends it (endMechanic(true) destroys the stage; S.seq moves on). Zuzu keeps its attentive face (never a
// grin), the Support pill stays in the dock throughout, nothing playful is said.
//
// Privacy: the words are never sent from here and are not stored: the visit's Belief Mallow lives in this closure and
// goes when Another Angle closes. Only "Keep it on this phone" stores it (store.js: app.store, this phone only, never
// synced; deleted by its own "Delete it from this phone", "Delete everything", and the Another Angle delete row).
//
// The seams in another-angle.js (docs/workstreams/belief-mallows.md has them verbatim):
//   const belief = createBeliefHook({ app, S, root, say, choose, careFace, announce, dockShow, layout, measureBand,
//     endMechanic, openTell, afterTell, startAngle, finish, rectOf, get: () => ({ g, area, zAd }), setMech });
//   invite():      options.push(...belief.inviteOptions());
//   openTellNow(): openInput({ …, ...belief.tell() })        (belief mode: its prompt, and the note "stay on this phone")
//   askFirst():    const q = belief.question(kind) || FIRST_QUESTION[kind];
//   startAngle():  if (belief.active()) return belief.play();   (after the question, before anything is spawned or sent)
//   endChoice():   options: [...END's, ...belief.endOptions()]
//   leave():       belief.leave();

import { BELIEF, excerpt } from './lines.js';
import { beliefMallowsOn } from './gate.js';
import { keptBeliefs, keepBelief, forgetBelief } from './store.js';
import { ANGLE_CHOICE, CHECK_IN } from '../lines.js';
import { checkText } from '../../engine/safety.js';
import { lossRoute, gentleRoute, bagWords } from '../backstop.js';

const DEV = () => typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const later = (fn) => setTimeout(fn, 0);

/** Words from this visit that may be offered as a belief: newest first, distinct, and nothing heavy (they are read again anyway). */
export function offerable(recent = []) {
  const out = [];
  for (const t of [...recent].reverse()) {
    const x = String(t ?? '').replace(/\s+/g, ' ').trim();
    if (!/[\p{L}\p{N}]/u.test(x) || out.includes(x)) continue;
    let ok = false;
    try { ok = checkText(x).level === 'none' && !gentleRoute(x) && !bagWords(x) && lossRoute(x) !== 'gentle'; } catch { ok = false; }
    if (ok) out.push(x);
  }
  return out.slice(0, 2);
}

/** The question before a Belief Mallow (owner decision 'Ask before every world'): the same answers and values as Another Angle's. */
export function beliefQuestion(kind) {
  if (kind === 'choice') {
    return { ask: BELIEF.question.ask, ms: ANGLE_CHOICE.ms, options: [{ label: BELIEF.question.look, value: 'angle' }, { label: BELIEF.question.be, value: 'be' }, { label: BELIEF.question.notOkay, value: 'notreally' }] };
  }
  if (kind === 'check') {
    return { ask: CHECK_IN.ask, ms: CHECK_IN.ms, options: [{ label: BELIEF.check.look, value: 'angle' }, { label: CHECK_IN.notReally, value: 'notreally' }, { label: CHECK_IN.be, value: 'be' }] };
  }
  return null;
}

export function createBeliefHook(host) {
  const { app, S } = host;
  const store = app.store;
  let pending = null;   // the next Tell opens in belief mode ({ kept })
  let armed = null;     // the Tell just opened (or tapped) is a belief ({ kept })
  let current = null;   // this visit's Belief Mallow, in memory only
  let stage = null, left = false, playing = 0;
  const on = () => !left && beliefMallowsOn(app);
  const quiet = () => S.crisis || S.care || S.level === 'care' || S.level === 'crisis';
  const rm = () => !!app.prefs?.reducedMotion?.();
  const say = (t, o = {}) => host.say(t, { mallow: 'zuzu', ...o });
  // (the chip that had the focus goes with its answer: the next choice's first chip takes it, never the page)
  const choose = (p, opts, o = {}) => host.choose(p, opts, { mallow: 'zuzu', focus: true, ...o });

  /** Belief mode for the next Tell, opened inside this tap (the iPhone keyboard needs the gesture). */
  function beginNew() { if (!on() || quiet()) return; pending = { kept: null }; host.openTell(); }
  /** Words already told (a recent Tell, a kept belief), read again as a Tell (afterTell: every safety route) and then, if a Tell would reach an angle, the Belief Mallow. */
  function beginWith(text, kept = null) {
    if (!on() || quiet()) return;
    armed = { kept };
    host.afterTell({ text, emotion: null, intention: null });
  }

  async function chooseSource({ recent = [] } = {}) {
    if (!on() || quiet()) return;
    const kept = keptBeliefs(store);
    // only the words they just looked at, nothing kept: "This one keeps coming back" means these words
    if (recent.length === 1 && !kept.length) return beginWith(recent[0]);
    const opts = [
      ...recent.map((t, i) => ({ label: BELIEF.recentLabel(excerpt(t)), value: `recent:${i}` })),
      ...kept.map((k) => ({ label: BELIEF.keptLabel(excerpt(k.text, 24)), value: `kept:${k.id}` })),
      { label: BELIEF.sourceNew, value: 'new', primary: !recent.length, onPick: () => beginNew() },
      { label: BELIEF.sourceNot, value: 'not' },
    ];
    const v = await choose(BELIEF.sourceAsk, opts.slice(-5));
    if (left || v == null || v === 'new') return;
    if (v === 'not') { say(BELIEF.notNow); return; }
    if (v.startsWith('recent:')) return beginWith(recent[+v.slice(7)]);
    if (v.startsWith('kept:')) { const k = kept.find((x) => `kept:${x.id}` === v); if (k) beginWith(k.text, k); }
  }

  // ------------------------------------------------------------ the play --
  async function play() {
    const kept = armed?.kept || null;
    armed = null;
    if (!on() || quiet() || S.left) return;
    const seq = ++S.seq;
    const mine = ++playing;
    const alive = () => !left && !S.left && seq === S.seq && mine === playing && !quiet();
    current = { id: kept?.id || null, saved: !!kept, text: S.text, prop: kept?.prop || null, explored: kept?.explored || 0, room: kept?.room || 0, understood: kept?.understood || null };
    S.phase = 'playing';
    host.careFace();
    host.dockShow({ asking: true });
    if (!current.prop) {
      await say(BELIEF.arrive);
      if (!alive()) return;
      const p = await choose(BELIEF.propAsk, BELIEF.props.map((o) => ({ ...o })));
      if (!alive()) return;
      if (!p) { S.phase = 'invite'; host.dockShow({ tell: true, finish: true }); return; }
      current.prop = p;
    }
    // the band the experiences' lines need, then the stage (the play area is laid out below it)
    S.band = host.measureBand([BELIEF.shape.hint, BELIEF.loosen.hint, BELIEF.room.hint, BELIEF.shape.done, BELIEF.loosen.done.stone, BELIEF.understand.ask, BELIEF.endAsk]);
    host.layout();
    let mod = null;
    try { mod = await import('./stage.js'); } catch (e) { console.warn('[belief] stage', e?.message); }
    if (!alive()) return;
    const H = host.get();
    if (mod && H.g) {
      try {
        stage = mod.mountBeliefStage({
          g: H.g, root: host.root, area: () => host.get().area, text: current.text, prop: current.prop, explored: current.explored, room: current.room,
          reducedMotion: rm, lowStim: () => !!app.prefs?.get?.('lowStim'), keepOut: () => host.rectOf(host.get().zAd),
          haptic: (k) => app.haptic?.(k), audio: app.prefs?.get?.('sound') ? app.audio : null, announce: host.announce, say: host.announce,
          textScale: () => { try { return parseFloat(document.documentElement.style.getPropertyValue('--type-scale')) || 1; } catch { return 1; } },
        });
        host.setMech(stage);
      } catch (e) { console.warn('[belief] stage mount', e?.message); stage = null; }
    }
    host.layout();
    if (DEV() && typeof window !== 'undefined') window.__belief = devApi();
    await say(kept ? BELIEF.meetAgain : BELIEF.meet[current.prop]);
    if (!alive()) return;
    let remaining = stage ? BELIEF.experiences.slice() : BELIEF.experiences.filter((x) => x.id === 'understand');
    let first = true, tried = 0;
    while (remaining.length && alive()) {
      host.dockShow({ asking: true });
      const opts = remaining.slice(0, 2).map((x) => ({ label: x.label, value: x.id }));
      opts.push({ label: BELIEF.enough, value: 'enough' });
      const v = await choose(first ? BELIEF.nextAsk : BELIEF.moreAsk, opts);
      first = false;
      if (!alive()) return;
      if (v == null || v === 'enough') break;
      remaining = remaining.filter((x) => x.id !== v);
      tried++;
      await experience(v, alive);
      if (!alive()) return;
      if (stage?.failed) remaining = remaining.filter((x) => x.id === 'understand');
    }
    if (!alive()) return;
    if (tried) {
      const f = await choose(BELIEF.feelAsk, BELIEF.feel.map((o) => ({ ...o })));
      if (!alive()) return;
      if (BELIEF.feelHeard[f]) await say(BELIEF.feelHeard[f]);
      if (!alive()) return;
    }
    await endChoice(alive);
  }

  async function experience(kind, alive) {
    if (kind === 'understand') {
      const u = await choose(BELIEF.understand.ask, BELIEF.understand.options.map((o) => ({ ...o })));
      if (!alive() || !u) return;
      current.understood = u;
      // better understood: it settles a little (never a grin: belief faces ease, they never smile)
      try { stage?.belief?.settle?.(0.4); } catch { /* the words carry it */ }
      await say(BELIEF.understand.heard[u]);
      if (!alive()) return;
      await say(BELIEF.understand.after);
      return;
    }
    if (!stage || stage.failed) return;
    const L = BELIEF[kind];
    host.dockShow({ assist: L.assist, asking: true });
    say(L.hint, { interrupt: true });
    let results = [], nudged = false;
    const nudge = setTimeout(() => { if (alive() && stage?.experience === kind && !nudged) { nudged = true; say(L.hint2); } }, rm() ? 12000 : 9000);
    const res = await stage.run(kind, { onMoment: (r) => { results.push(r); say(r === 'leaned' ? BELIEF.shape.leaned : BELIEF.shape.passed); } });
    clearTimeout(nudge);
    if (!alive() || res?.stopped) return;
    host.dockShow({ asking: true });
    await sleep(rm() ? 200 : 600);
    if (!alive()) return;
    const line = kind === 'shape' ? (results.filter((r) => r === 'leaned').length > results.length / 2 ? L.done : L.doneLight)
      : kind === 'loosen' ? L.done[current.prop] : L.done;
    await say(line);
  }

  async function endChoice(alive) {
    while (alive()) {
      S.phase = 'end';
      host.dockShow({ asking: true });
      const opts = [{ label: BELIEF.end.keep, value: 'keep', primary: !current.saved }];
      if (current.saved) opts.push({ label: BELIEF.end.forget, value: 'forget' });
      opts.push({ label: BELIEF.end.angle, value: 'angle' }, { label: BELIEF.end.finish, value: 'finish' });
      const v = await choose(BELIEF.endAsk, current.keptNow ? opts.filter((o) => o.value !== 'keep') : opts);
      if (!alive()) return;
      if (v === 'keep') {
        const r = keepBelief(store, { ...current, ...(stage?.snapshot?.() || {}) });
        if (r.ok) { current.id = r.id; current.saved = true; current.keptNow = true; await say(BELIEF.kept); } else await say(r.full ? BELIEF.keptFull : BELIEF.keptFailed);
        continue;
      }
      if (v === 'forget') { if (current.id) forgetBelief(store, current.id); current.id = null; current.saved = false; current.keptNow = false; await say(BELIEF.forgotten); continue; }
      if (v === 'angle') {
        // Another Angle's own path (its question first; words sent only with its consent): the Belief Mallow steps aside
        await say(BELIEF.toAngle);
        if (!alive()) return;
        await host.endMechanic();
        stage = null; playing++;
        if (left || S.left || quiet()) return;
        return host.startAngle({ another: false });
      }
      if (v === 'finish') {
        if (!current.saved) { await say(BELIEF.letGo); if (!alive()) return; }
        return host.finish();
      }
      // let go (no answer): the way out stays in reach
      S.phase = 'invite';
      host.dockShow({ finish: true, tell: true });
      return;
    }
  }

  function devApi() {
    return { get stage() { return stage; }, get current() { return current ? { ...current, text: undefined } : null }, kept: () => keptBeliefs(store).length };
  }

  return {
    /** Another Angle's invitation: one more answer (only with Beyond and the switch on). */
    inviteOptions() {
      if (!on()) return [];
      return [{ label: BELIEF.invite, value: 'belief', onPick: () => { if (keptBeliefs(store).length) later(() => chooseSource()); else beginNew(); } }];
    },
    /** Another Angle's end choice: "This one keeps coming back" (their own recent words, read again as a Tell). */
    endOptions() {
      if (!on() || quiet() || S.noPlay) return [];
      const recent = offerable(S.recent);
      if (!recent.length) return [];
      return [{ label: BELIEF.endInvite, value: 'belief', onPick: () => later(() => chooseSource({ recent })) }];
    },
    /** openInput options for the Tell opening now: belief mode (its prompt; "Your words stay on this phone."), or nothing. */
    tell() {
      const p = pending;
      pending = null;
      armed = p && on() ? p : null;
      if (!armed) return {};
      // Zuzu listens to a belief with its attentive face (never the playful listening grin)
      host.careFace();
      return { prompt: BELIEF.prompt, privacyNote: null };
    },
    /** The question before a Belief Mallow, in its own words (null: Another Angle's). */
    question(kind) { return armed && on() ? beliefQuestion(kind) : null; },
    /** The words that reached startAngle are a belief: play it instead of an angle (nothing sent). */
    active() { return !!armed && on() && !quiet(); },
    play,
    leave() {
      left = true; pending = null; armed = null; current = null; stage = null; playing++;
      if (DEV() && typeof window !== 'undefined') delete window.__belief;
    },
  };
}
