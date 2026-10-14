// Another Angle, review round 10: a replay of one visit through the orchestrator's routing (src/beyond/another-angle.js
// afterTell → readDraft → griefMode or startAngle → feelingGuard / guessGuard → playScene → reveal → explore → feedback →
// "Show me another angle"), using the real pure modules (authored.js, grief.js, backstop.js, lines.js, vocab.js and the
// safety check). No DOM. It records every line said, every label a mechanic draws, the mechanics, Zuzu's faces, and the
// requests made, for each kind of server answer (STUBS). Tests read it: tests/beyond-r10.test.mjs.
//
// Keep it in step with another-angle.js: each step below names the function it mirrors.

import { authoredScene, sceneParts, feelingOf, feelingGuard, guessGuard, gentleScene, candidatePatterns } from '../../src/beyond/authored.js';
import { deathEscalation, serverLoss, griefLinesOk } from '../../src/beyond/grief.js';
import { gentleRoute, bagWords, framingAllowed, framesAsGuess, heavyHarm, lossRoute, griefFeeling } from '../../src/beyond/backstop.js';
import { SAFETY, GRIEF, FEELING, WAITING, EXPLORE, EXPLORE_ASK, EXPLORE_EMPTY, FRIEND_LINES, FEEDBACK, LOSS_CHECK, mechanicLines } from '../../src/beyond/lines.js';
import { validateScene, PATTERNS } from '../../src/beyond/vocab.js';
import { checkText } from '../../src/engine/safety.js';

const LEVELS = ['none', 'concern', 'care', 'crisis'];
const hasWords = (t) => /[\p{L}\p{N}]/u.test(String(t || ''));
const q = (t) => String(t).replace(/[.!?…]+$/u, '').slice(0, 40);

/** Server answers, as the server sends them (angle-client.js maps them: clientShape). */
export const STUBS = Object.freeze({
  none: null,
  grief: () => ({ status: 'ok', scene: { reasoning_pattern: 'rumination', emotion: 'grief', situation_type: 'loss', known_fact: 'You lost someone you love.', possible_assumption: '', alternative_angle: '', practical_next_step: 'Light a candle and sit with a photo for a few minutes.', subtitle_line_1: 'Missing them this much makes sense.', subtitle_line_2: 'Grief isn’t a thought to fix.', safety_status: 'ok', mallow_character: 'zuzu' } }),
  pull: (t) => ({ status: 'ok', scene: { reasoning_pattern: 'fact_vs_assumption', emotion: 'sadness', situation_type: 'family', known_fact: `“${q(t)}” is what happened.`, possible_assumption: 'That this says something about you.', alternative_angle: 'Could there be another explanation?', practical_next_step: 'Check one fact before deciding what it means.', subtitle_line_1: `“${q(t)}” is what happened.`, subtitle_line_2: 'What it means is still an open question.', safety_status: 'ok', mallow_character: 'pipzi' } }),
  fallback: () => ({ status: 'fallback', fallback: { reason: 'provider_error', hint: { reasoning_pattern: 'fact_vs_assumption' } } }),
  mind: () => ({ status: 'ok', scene: { reasoning_pattern: 'mind_reading', emotion: 'sadness', situation_type: 'social', known_fact: 'You know what you saw.', possible_assumption: 'That they don’t care.', alternative_angle: 'Maybe they didn’t know what to say.', practical_next_step: 'Ask one person how they are.', subtitle_line_1: 'That’s a guess about what’s going on inside them.', subtitle_line_2: 'Maybe they didn’t know what to say.', safety_status: 'ok', mallow_character: 'pipzi' } }),
  // the server writes grief lines but tags them ordinary
  griefish: () => ({ status: 'ok', scene: { reasoning_pattern: 'rumination', emotion: 'sadness', situation_type: 'family', known_fact: '', possible_assumption: '', alternative_angle: '', practical_next_step: 'Sit with a photo of them for a minute.', subtitle_line_1: 'Missing them this much makes sense.', subtitle_line_2: 'Grief isn’t a thought to fix.', safety_status: 'ok', mallow_character: 'noomi' } }),
  // a fair-anger reading on find_boundary
  anger: () => ({ status: 'ok', scene: { reasoning_pattern: 'valid_anger', interaction_type: 'find_boundary', emotion: 'anger', situation_type: 'social', known_fact: 'Someone blamed you.', possible_assumption: '', alternative_angle: '', practical_next_step: 'Write down what you would want to say to them.', subtitle_line_1: 'Being angry about this makes sense.', subtitle_line_2: 'What would you want to say, ask for or protect?', safety_status: 'ok', mallow_character: 'kip' } }),
  // (review r11, the round-4 review's stubs) fair anger without a mechanic, a harsh verdict, a spectrum, a worst case
  angerLines: () => ({ status: 'ok', scene: { reasoning_pattern: 'valid_anger', emotion: 'anger', situation_type: 'social', known_fact: 'Someone treated you unfairly.', possible_assumption: '', alternative_angle: 'Your anger is pointing at something real.', practical_next_step: 'Decide one line you won’t let them cross again.', subtitle_line_1: 'Being angry about this makes sense.', subtitle_line_2: 'Your anger is pointing at something that matters.', safety_status: 'ok', mallow_character: 'glitzi' } }),
  harsh: () => ({ status: 'ok', scene: { reasoning_pattern: 'self_criticism', emotion: 'shame', situation_type: 'self', known_fact: 'Something went wrong.', possible_assumption: 'That it makes you a failure.', alternative_angle: 'That’s a harsh verdict for one event.', practical_next_step: 'Write the lesson in one kind sentence.', subtitle_line_1: 'That’s a harsh verdict on yourself.', subtitle_line_2: 'Softer. And the lesson’s still there.', safety_status: 'ok', mallow_character: 'boppo' } }),
  spectrum: () => ({ status: 'ok', scene: { reasoning_pattern: 'all_or_nothing', emotion: 'frustration', situation_type: 'self', known_fact: 'One part went badly.', possible_assumption: 'That it was all bad.', alternative_angle: 'Most things land somewhere between perfect and ruined.', practical_next_step: 'Name one part that went okay.', subtitle_line_1: 'Most things land somewhere between perfect and ruined.', subtitle_line_2: 'Where on that line does this really sit?', safety_status: 'ok', mallow_character: 'zuzu' } }),
  catas: () => ({ status: 'ok', scene: { reasoning_pattern: 'catastrophising', emotion: 'anxiety', situation_type: 'future', known_fact: 'Nothing bad has happened yet.', possible_assumption: 'That the worst will happen.', alternative_angle: 'The worst case is one possibility, not an event.', practical_next_step: 'Write down the most likely outcome.', subtitle_line_1: 'That’s the worst case, blown up.', subtitle_line_2: 'Life size, it’s one possibility.', safety_status: 'ok', mallow_character: 'loomi' } }),
  care: () => ({ status: 'care' }),
  crisis: () => ({ status: 'crisis' }),
  statusCrisis: (t) => ({ status: 'ok', scene: { ...STUBS.pull(t).scene, safety_status: 'crisis' } }),
  error: () => null,
});
/** The stubs that answer with a scene or a fallback (the ones a death must never be framed under). */
export const SCENE_STUBS = ['none', 'grief', 'pull', 'fallback', 'mind', 'griefish', 'anger'];
/** (review r11) every stub that answers with a scene or a fallback, the round-4 review's four added. */
export const ALL_SCENE_STUBS = [...SCENE_STUBS, 'angerLines', 'harsh', 'spectrum', 'catas'];

/** angle-client.js: the server's answer as the experience sees it. */
function clientShape(raw) {
  if (!raw) return { status: 'error', reason: 'network' };
  if (raw.status === 'crisis' || raw.status === 'care') return { status: raw.status, keepSupportClose: true };
  if (raw.status === 'fallback') {
    if (raw.fallback?.reason === 'unclear') return { status: 'unclear' };
    const hp = raw.fallback?.hint?.reasoning_pattern;
    return { status: 'fallback', reason: raw.fallback?.reason || 'x', hint: PATTERNS.includes(hp) ? { reasoning_pattern: hp } : null };
  }
  if (raw.status === 'ok') {
    const scene = validateScene(raw.scene);
    if (!scene) return { status: 'error', reason: 'invalid_scene' };
    if (scene.safety_status === 'crisis' || scene.safety_status === 'care') return { status: scene.safety_status };
    return { status: 'ok', scene: { ...scene, source: 'server', prompt_version: 'stub' } };
  }
  return { status: 'error' };
}
/** The labels a mechanic draws (each mechanic module reads these from its lines and sceneParts). */
function drawn(scene, parts, L) {
  const lab = L.labels || {}, out = [];
  const push = (...xs) => { for (const x of xs.flat()) if (x) out.push(String(x)); };
  switch (scene.mechanic) {
    case 'pull_apart': push(parts.excerpt, `[${lab.fact}] ${parts.fact}`, `[${lab.guess}] ${parts.guess}`); break;
    case 'open_interpretations': push(`[${lab.guess}] ${!parts.guessAsk && parts.guess ? parts.guess : parts.excerpt}`, (parts.alternatives?.length ? parts.alternatives : L.others || []).slice(0, 3)); break;
    case 'shrink_projection': push(parts.excerpt, lab.big, lab.small); break;
    case 'soften_harshness': push(parts.harsh, lab.core); break;
    case 'separate_one': push(parts.excerpt, lab.one, lab.rest); break;
    case 'return_responsibility': push(parts.excerpt, parts.weight, lab.places); break;
    case 'reveal_spectrum': push(parts.excerpt, lab.left, lab.right, lab.regions); break;
    case 'assemble_step': push(parts.excerpt, parts.steps, lab.step); break;
    case 'find_boundary': push(parts.excerpt, lab.line, L.responses); break;
    case 'let_loop_drift': push(parts.excerpt, lab.stone); break;
    default: break;
  }
  return out;
}

/**
 * One visit: the person types `text` and sends it, with `server` (a STUBS entry, null for no sharing). Walks "Show me
 * another angle" up to `walk` scenes. → { route, requests, said, drawn, mechanics, faces, scenes, noPlay, quips }
 * (route: crisis | care | follow | gentle | play | unclear | nomore; faces: 'attentive' | 'playful' | 'transforming';
 * quips: Zuzu's squeeze quips would still play; look: the Thought Mallow's first look, 'feeling:<kind>' or 'pattern:<id>').
 * (review r12, the owner's 'Ask when unsure') `answer`: the person's answer to the check-in when it is asked ('yes', 'else',
 * or null for no answer: route 'quiet'); R.asked says it was, R.requestsBeforeAnswer how many requests went first (none).
 */
export function visit(text, { server = null, emotion = null, walk = 4, answer = 'else' } = {}) {
  const R = { text, route: null, requests: 0, said: [], drawn: [], mechanics: [], faces: [], scenes: [], noPlay: false, quips: true, careLines: null, look: null, asked: false, requestsBeforeAnswer: 0 };
  const S = { level: 'none', follow: false, noPlay: false, grief: false, shown: [], used: [] };
  const say = (l) => { for (const x of [l].flat()) if (x) R.said.push(String(x)); };
  const note = (r) => { if (r?.level && LEVELS.indexOf(r.level) > LEVELS.indexOf(S.level)) S.level = r.level; };
  const ask = (prev) => { R.requests++; return clientShape(server(text, { previous: prev })); };
  const done = (route) => { R.route ||= route; R.noPlay = S.noPlay; R.quips = !(S.grief || S.noPlay || S.level !== 'none'); return R; };
  // careMode, crisisMode
  const care = (lines = S.follow ? SAFETY.follow : SAFETY.care) => { R.careLines = lines; R.faces.push('attentive'); say(lines); say(SAFETY.careAsk); return done(S.follow ? 'follow' : 'care'); };
  const crisis = () => { R.faces.push('attentive'); say(SAFETY.crisis); return done('crisis'); };
  // readDraft
  const readDraft = (t) => { if (deathEscalation(t)) { S.follow = true; note({ level: 'care' }); } if (gentleRoute(t) || bagWords(t)) S.noPlay = true; };

  // afterTell: firstLook (no feeling chosen): a feeling's look, else the first candidate pattern's (review r11: never
  // 'valid_anger' beside a bag word, so the Thought Mallow and the mechanic are never tinted anger beside a loss)
  { let f = null, p = null; try { f = feelingOf(text); } catch { f = null; } try { p = candidatePatterns(text)[0] || null; } catch { p = null; } R.look = f ? `feeling:${f.kind}` : `pattern:${p}`; }
  readDraft(text);
  note(checkText(text));
  if (S.level === 'crisis') return crisis();
  if (S.level === 'care') return care();
  if (deathEscalation(text)) { S.follow = true; return care(SAFETY.follow); }
  if (!hasWords(text)) return done('unclear');

  // griefMode
  const griefMode = ({ scene = null, asked = false, told = null } = {}) => {
    if (deathEscalation(text)) { S.follow = true; return care(SAFETY.follow); }
    S.grief = true; S.noPlay = true;
    R.faces.push('attentive');
    say(GRIEF.heard);
    if (!scene && !asked && server) {
      const res = ask([]);
      if (res.status === 'crisis') return crisis();
      if (res.status === 'care') return care(S.follow ? SAFETY.follow : SAFETY.careGentle);
      if (res.status === 'ok' && serverLoss(res.scene, text, { heavy: heavyHarm }) && griefLinesOk(res.scene)) scene = res.scene;
      else { const again = checkText(text); if (again.level === 'crisis') return crisis(); if (again.level === 'care') return care(); }
    }
    scene = scene ? { ...scene, grief: true, mechanic: null } : gentleScene(text, { emotion, kind: told || (griefFeeling(emotion) ? 'grief' : null) });
    R.scenes.push(scene);
    say([scene.subtitle_line_1, scene.subtitle_line_2, GRIEF.ask, GRIEF.squeeze]);
    return done('gentle');
  };

  for (let k = 0; k < walk; k++) {
    // startAngle (lossRoute: death talk, someone alive but going, a strong loss cue, a grief-family feeling: gentle; not sure:
    // the check-in, asked once, before anything is sent: askAboutLoss)
    const route = lossRoute(text, { emotion });
    if (route === 'gentle') return griefMode();
    if (route === 'ask' && k === 0) {
      R.asked = true; R.requestsBeforeAnswer = R.requests;
      R.faces.push('attentive');
      say(LOSS_CHECK.ask);
      if (answer === 'yes') { S.noPlay = true; return griefMode({ told: 'loss' }); }
      if (answer !== 'else') return done('quiet');
    }
    let feel = null;
    try { feel = feelingOf(text) || (framingAllowed(text) ? null : { kind: 'low' }); } catch { feel = null; }
    R.faces.push(feel ? 'attentive' : 'playful');
    // waitingLines (two at least)
    say((feel || server ? FEELING.waiting : WAITING).slice(0, 2));
    const exclude = S.shown.map((s) => s.reasoning_pattern);
    const res = server ? ask(S.shown) : null;
    let scene = null, hint = null;
    if (res) {
      if (res.status === 'crisis') return crisis();
      // (serverCareLines, review r11)
      if (res.status === 'care') return care(S.follow ? SAFETY.follow : (R.asked && answer === 'yes') || gentleRoute(text) || bagWords(text) || lossRoute(text, { emotion }) ? SAFETY.careGentle : SAFETY.care);
      if (res.status === 'unclear') return done('unclear');
      if (res.status === 'ok' && res.scene && serverLoss(res.scene, text, { heavy: heavyHarm })) return griefMode({ scene: griefLinesOk(res.scene) ? res.scene : null, asked: true });
      if (res.status === 'ok' && res.scene && !exclude.includes(res.scene.reasoning_pattern)) {
        scene = guessGuard(feelingGuard(res.scene, text, { emotion, exclude }), text, { emotion, exclude });
        if (scene.exhausted) { say(FEEDBACK.noMore); return done('nomore'); }
      } else hint = res.hint?.reasoning_pattern || null;
    }
    if (!scene) {
      const again = checkText(text);
      if (again.level === 'crisis') return crisis();
      if (again.level === 'care') return care();
      scene = authoredScene(text, { emotion, exclude, usedAngles: S.used, hint });
      if (scene.exhausted || exclude.includes(scene.reasoning_pattern)) { say(FEEDBACK.noMore); return done(k ? 'play' : 'nomore'); }
    }
    // playScene
    scene = guessGuard(scene, text, { emotion });
    S.shown.push(scene); if (scene.angle_id) S.used.push(scene.angle_id); if (scene.alt_id) S.used.push(scene.alt_id);
    R.route = 'play';
    R.scenes.push(scene); R.mechanics.push(scene.mechanic);
    const L = mechanicLines(scene.mechanic, scene);
    const parts = sceneParts(text, scene);
    say([L.hint, L.hint2, L.hint3, L.slow, L.done]);
    R.drawn.push(...drawn(scene, parts, L));
    // reveal
    R.faces.push(S.noPlay || S.level !== 'none' ? 'attentive' : 'transforming');
    say([scene.feeling ? FEELING.title : 'A new perspective', scene.subtitle_line_1, scene.subtitle_line_2]);
    // explore (every prompt taken)
    const gentle = !!scene.feeling || !framingAllowed(text);
    const prompts = gentle ? EXPLORE.filter((p) => FEELING.explore.includes(p.id)) : EXPLORE.slice();
    say(gentle ? FEELING.exploreAsk : EXPLORE_ASK);
    for (const p of prompts) {
      say(p.label);
      if (p.field === 'friend') {
        const own = FRIEND_LINES[scene.reasoning_pattern] || FRIEND_LINES.fact_vs_assumption;
        say(scene.feeling || (!framingAllowed(text) && framesAsGuess(own)) ? FEELING.friend : own);
      } else if (p.field === 'known_fact') say([scene.known_fact || EXPLORE_EMPTY.known_fact, scene.possible_assumption].filter(Boolean));
      else say(scene[p.field] || EXPLORE_EMPTY[p.field]);
    }
    say(FEEDBACK.ask);
    say(FEEDBACK.another[k % FEEDBACK.another.length]);
  }
  return done('play');
}
