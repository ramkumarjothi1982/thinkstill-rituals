// Another Angle, review round 10: a replay of one visit through the orchestrator's routing (src/beyond/another-angle.js
// afterTell → readDraft → griefMode or startAngle → feelingGuard / guessGuard → playScene → reveal → explore → feedback →
// "Show me another angle"), using the real pure modules (authored.js, grief.js, backstop.js, lines.js, vocab.js and the
// safety check). No DOM. It records every line said, every label a mechanic draws, the mechanics, Zuzu's faces, and the
// requests made, for each kind of server answer (STUBS). Tests read it: tests/beyond-r10.test.mjs.
//
// Keep it in step with another-angle.js: each step below names the function it mirrors.

import { authoredScene, sceneParts, feelingOf, feelingGuard, guessGuard, gentleScene, candidatePatterns } from '../../src/beyond/authored.js';
import { deathEscalation, suicideDeath, serverLoss, griefLinesOk, keepLocal, noteShape } from '../../src/beyond/grief.js';
import { gentleRoute, bagWords, framingAllowed, framesAsGuess, heavyHarm, lossRoute, griefFeeling } from '../../src/beyond/backstop.js';
import { SAFETY, GRIEF, FEELING, WAITING, EXPLORE, EXPLORE_ASK, EXPLORE_EMPTY, FRIEND_LINES, FEEDBACK, LOSS_CHECK, ANGLE_CHOICE, BE_WITH, CHECK_IN, END, mechanicLines } from '../../src/beyond/lines.js';
import { riskScreen, normalise } from '../../src/beyond/risk-screen.js';
import { firstStep, ASK_BEFORE_ANGLE } from '../../src/beyond/angle-first.js';
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
  if (raw.status === 'crisis' || raw.status === 'care') return { status: raw.status, keepSupportClose: true, category: typeof raw.support?.category === 'string' && /^[a-z-]{1,40}$/.test(raw.support.category) ? raw.support.category : null };
  if (raw.status === 'fallback') {
    if (raw.fallback?.reason === 'unclear') return { status: 'unclear' };
    const hp = raw.fallback?.hint?.reasoning_pattern;
    return { status: 'fallback', reason: raw.fallback?.reason || 'x', hint: PATTERNS.includes(hp) ? { reasoning_pattern: hp } : null };
  }
  if (raw.status === 'ok') {
    // (fix round) the model's own crisis or care first, before validateScene (angle-client.js read)
    const flagged = raw.scene && typeof raw.scene === 'object' ? raw.scene.safety_status : null;
    if (flagged === 'crisis' || flagged === 'care') return { status: flagged, keepSupportClose: true, category: 'general' };
    const scene = validateScene(raw.scene);
    if (!scene) return { status: 'error', reason: 'invalid_scene' };
    if (scene.safety_status === 'crisis' || scene.safety_status === 'care') return { status: scene.safety_status, category: 'general' };
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
 * (owner decision 'Ask before every world', 14 Oct 2026; angle-first.js) with `asks` (ASK_BEFORE_ANGLE, the default) every Tell
 * that is not a detected loss, crisis or care is asked "Shall we look at this from another angle, or just be with it?"
 * instead: `answer` 'angle' (or 'else') plays, 'be' (or 'yes') is the gentle path with nothing sent, null is quiet; R.question
 * says which question was asked ('choice' | 'check-in'). `said`: the answer remembered from an earlier send of the same words.
 * (r2-angle) "Just be with it" is a quiet path of its own (another-angle.js beWithIt): route 'be', nothing sent, R.beOptions the
 * chips it offers; only the gentle answers are remembered ('be' is asked again: BE_ASKS_AGAIN); no answer sets noPlay; R.grief and
 * R.finishLevel / R.finishLines are what Finish would do (another-angle.js finish); a suicide death beside a first-person future
 * is care on the gentle path with nothing sent (grief.js suicideFuture); a grief-family feeling with no words is gentle.
 * (Final round 5, structural) the gentle path never sends, whatever the words and whatever the server (R.held: the safety net's
 * words, information only), and unsure words with the safety net's words play Zuzu's own angle after "Another angle", nothing
 * sent (R.local).
 * (15 Oct 2026, the risk screener: another-angle.js afterTell, readDraft, startAngle, careLite) `history`: the visit's earlier
 * Tells (its context). The screener's care is care with the follow lines (route 'follow'), nothing sent; its 'check' asks the
 * check-in instead of the question (R.question 'check'): `answer` 'angle' (or 'else') sends and plays, 'be' (or 'yes') is
 * "Just be with it", 'notreally' is the care-lite path (route 'carelite': support first, nothing sent), null is quiet. The lexicon
 * also reads the words in one spelling (risk-screen.js normalise).
 * (fix round) the lexicon's concern that is not a loss asks the check-in too (R.question 'check'); the question's third answer,
 * "I'm not okay" (`answer` 'notreally'), is the care-lite path; after the check-in's "I'm okay" the visit stays quiet (noPlay:
 * attentive faces, no quips); a server scene marked crisis or care is support even when it would fail validateScene.
 */
export function visit(text, { server = null, emotion = null, walk = 4, answer = 'else', asks = ASK_BEFORE_ANGLE, said = null, history = [] } = {}) {
  const R = { text, route: null, requests: 0, said: [], drawn: [], mechanics: [], faces: [], scenes: [], noPlay: false, quips: true, careLines: null, look: null, asked: false, question: null, requestsBeforeAnswer: 0, grief: false, beOptions: null, finishLevel: 'none', finishLines: null, held: false, local: false };
  const S = { level: 'none', follow: false, suicide: false, noPlay: false, grief: false, care: false, crisis: false, heavyDraft: false, shown: [], used: [] };
  const say = (l) => { for (const x of [l].flat()) if (x) R.said.push(String(x)); };
  const note = (r) => { if (r?.level && LEVELS.indexOf(r.level) > LEVELS.indexOf(S.level)) S.level = r.level; };
  const ask = (prev) => { R.requests++; return clientShape(server(text, { previous: prev })); };
  const done = (route) => {
    R.route ||= route; R.noPlay = S.noPlay; R.quips = !(S.grief || S.noPlay || S.level !== 'none'); R.grief = S.grief;
    // finish(): the goodbye and the safety level sent home
    R.finishLines = S.crisis || S.care || S.grief ? SAFETY.finish : END.finish;
    R.finishLevel = S.level !== 'none' ? S.level : S.grief ? 'concern' : 'none';
    return R;
  };
  // careMode, crisisMode
  const care = (lines = S.follow ? SAFETY.follow : S.suicide ? SAFETY.careGentle : SAFETY.care) => { S.care = true; note({ level: 'care' }); R.careLines = lines; R.faces.push('attentive'); say(lines); say(SAFETY.careAsk); return done(S.follow ? 'follow' : 'care'); };
  const crisis = () => { S.crisis = true; note({ level: 'crisis' }); R.faces.push('attentive'); say(SAFETY.crisis); return done('crisis'); };
  // readDraft
  const scr = (() => { try { return riskScreen(String(text ?? ''), { history }); } catch { return { level: null }; } })();
  const readDraft = (t) => { if (deathEscalation(t)) { S.follow = true; note({ level: 'care' }); } else if (suicideDeath(t)) { S.suicide = true; note({ level: 'care' }); } if (!S.follow && noteShape(t)) { S.follow = true; note({ level: 'care' }); } if (!S.follow && scr.level === 'care') { S.follow = true; note({ level: 'care' }); } if (gentleRoute(t) || bagWords(t)) { S.noPlay = true; S.heavyDraft = true; } };
  // careLite ("Not really", the check-in's answer): support first, nothing sent, no angle for the visit
  const careLite = () => { S.noPlay = true; note({ level: 'concern' }); R.faces.push('attentive'); say([CHECK_IN.heard]); R.careLines = [CHECK_IN.heard]; return done('carelite'); };

  // afterTell: firstLook (no feeling chosen): a feeling's look, else the first candidate pattern's (review r11: never
  // 'valid_anger' beside a bag word, so the Thought Mallow and the mechanic are never tinted anger beside a loss)
  { let f = null, p = null; try { f = feelingOf(text); } catch { f = null; } try { p = candidatePatterns(text)[0] || null; } catch { p = null; } R.look = f ? `feeling:${f.kind}` : `pattern:${p}`; }
  readDraft(text);
  if (scr.level === 'care') S.follow = true;
  const lex = checkText(text);
  note(lex);
  let lexN = null;
  { let n = ''; try { n = normalise(text); } catch { n = ''; } if (n && n !== String(text).toLowerCase()) { lexN = checkText(n); note(lexN); } }
  // (fix round, another-angle.js afterTell distressOf) the lexicon's concern for these words that is not a loss: the check-in
  const distress = [lex, lexN].some((r) => r?.level === 'concern' && r.category !== 'loss');
  if (S.level === 'crisis') return crisis();
  if (S.level === 'care') return care();
  if (deathEscalation(text)) { S.follow = true; return care(SAFETY.follow); }
  // (final round 6) a note's shape or a wish to die with no death named (grief.js noteShape): care, nothing sent
  if (noteShape(text)) { S.follow = true; return care(SAFETY.follow); }
  // (r3-esc) a suicide named, whatever the clause: care, said gently, nothing sent
  if (suicideDeath(text)) { S.suicide = true; return care(SAFETY.careGentle); }

  // griefMode
  const griefMode = ({ scene = null, asked = false, told = null } = {}) => {
    if (deathEscalation(text)) { S.follow = true; return care(SAFETY.follow); }
    if (noteShape(text)) { S.follow = true; return care(SAFETY.follow); }
    // (r3-esc) a suicide named, whatever the clause: care, said gently, nothing sent
    if (suicideDeath(text)) { S.suicide = true; return care(SAFETY.careGentle); }
    S.grief = true; S.noPlay = true;
    R.faces.push('attentive');
    say(GRIEF.heard);
    // (final round 5, structural) nothing is ever sent from the gentle path, whatever the words (no ask() here); R.held: the safety
    // net's words (grief.js keepLocal), for the main screen's supportFirst (information only here: the path is the same)
    R.held = keepLocal(text);
    scene = scene ? { ...scene, grief: true, mechanic: null } : gentleScene(text, { emotion, kind: told || (griefFeeling(emotion) ? 'grief' : null) });
    R.scenes.push(scene);
    say([scene.subtitle_line_1, scene.subtitle_line_2, GRIEF.ask, GRIEF.squeeze]);
    return done('gentle');
  };
  // (r2-angle item 5) beWithIt: its own quiet path, nothing sent; "See support" only when something heavy was seen
  const beWithIt = (route) => {
    S.noPlay = true;
    R.faces.push('attentive');
    const heavy = S.level !== 'none' || S.heavyDraft || route === 'ask' || bagWords(text);
    R.beOptions = (heavy ? BE_WITH.optionsHeavy : BE_WITH.options).map((o) => o.value);
    say([BE_WITH.line, BE_WITH.second, BE_WITH.ask, BE_WITH.squeeze]);
    return done('be');
  };
  // (r2-angle item 7) only a grief-family feeling chosen, no words: the gentle path, nothing to send
  if (!hasWords(text)) return griefFeeling(emotion) ? griefMode({ asked: true }) : done('unclear');

  for (let k = 0; k < walk; k++) {
    // startAngle (lossRoute: death talk, someone alive but going, a strong loss cue, a grief-family feeling: gentle; else the
    // one question before anything is sent, angle-first.js firstStep → askFirst; the answer kept for these words)
    const route = lossRoute(text, { emotion });
    if (route === 'gentle') return griefMode();
    let step = firstStep(text, { emotion, another: k > 0, said, ask: asks });
    if (step === 'be') return beWithIt(route);
    if (step === 'told') { S.noPlay = true; return griefMode({ told: 'loss' }); }
    // (15 Oct 2026) the risk screener's 'check': the check-in instead of the question (never inside an angle already chosen)
    // (fix round) and the lexicon's concern that is not a loss (distress, wanting to hurt someone): the check-in too
    if ((scr.level === 'check' || distress) && k === 0) step = 'check';
    if (step === 'choice' || step === 'check-in' || step === 'check') {
      R.asked = true; R.question = step; R.requestsBeforeAnswer = R.requests;
      R.faces.push('attentive');
      say(step === 'choice' ? ANGLE_CHOICE.ask : step === 'check' ? CHECK_IN.ask : LOSS_CHECK.ask);
      // (fix round, the safety floor) the question's third answer, "I'm not okay" ('notreally'), is the check-in's "Not really"
      const v = step === 'choice' ? ({ be: 'be', yes: 'be', angle: 'angle', else: 'angle', notreally: 'notreally' })[answer]
        : step === 'check' ? ({ be: 'be', yes: 'be', angle: 'angle', else: 'angle', notreally: 'notreally' })[answer]
          : ({ yes: 'yes', else: 'else', be: 'yes', angle: 'else', notreally: 'yes' })[answer];
      if (v === 'notreally') return careLite();
      if (v === 'be') return beWithIt(route);
      if (v === 'yes') { S.noPlay = true; return griefMode({ told: 'loss' }); }
      // (r2-angle item 3) let go: quiet for the rest of the visit
      if (!v) { S.noPlay = true; return done('quiet'); }
      // (fix round) the check-in's "I'm okay": the angle, the rest of the visit quiet (the attentive face, no quips)
      if (step === 'check') S.noPlay = true;
      // (r2-angle item 2) "Another angle" is never remembered: the next Tell of these words is asked again
    }
    const unsure = route === 'ask';
    let feel = null;
    try { feel = feelingOf(text) || (framingAllowed(text) ? null : { kind: 'low' }); } catch { feel = null; }
    if (unsure) feel ||= { kind: 'low' };
    R.faces.push(feel || S.noPlay || S.level !== 'none' ? 'attentive' : 'playful');
    // waitingLines (two at least)
    say((feel || server ? FEELING.waiting : WAITING).slice(0, 2));
    const exclude = S.shown.map((s) => s.reasoning_pattern);
    // (final round 5) unsure words with the safety net's words (grief.js keepLocal): Zuzu's own authored angle, nothing sent (R.local)
    const local = unsure && keepLocal(text);
    if (local) R.local = true;
    const res = server && !local ? ask(S.shown) : null;
    let scene = null, hint = null;
    if (res) {
      if (res.status === 'crisis') return crisis();
      // (serverCareLines, review r11)
      // (fix round) the server's care with no category of the lexicon's (the model's 'general', the screener's 'self-risk'): the follow lines
      if (res.status === 'care') return care(S.follow || res.category === 'general' || res.category === 'self-risk' ? SAFETY.follow : (R.asked && answer === 'yes') || gentleRoute(text) || bagWords(text) || lossRoute(text, { emotion }) ? SAFETY.careGentle : SAFETY.care);
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
