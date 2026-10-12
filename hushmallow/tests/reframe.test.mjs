// Tests for HUSHMALLOW ULTRA "Another Angle" (Reframe).
// Run: node --test hushmallow/tests/reframe.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as F from '../src/ultra/frameworks.js';
import * as LX from '../src/ultra/lenses.js';
import {
  checkSafety, matchScenarios, splitThought, detectPatterns, buildAngles, buildEvidence,
  buildNextSteps, composeAngle, pickCameo, tidyInput,
  recommendLenses, buildMixer, mixSentence, heatBand, dialKey, findPredictions, zoomPrompts, zoomFamily,
  certaintyBand, buildFutureDeck, pickLensCameo,
} from '../src/ultra/reframe-engine.js';

const {
  THOUGHT_PATTERNS, SCENARIOS, GENERAL, ALL_FRAMEWORKS, CONTEXTS, ANGLE_KINDS, STEP_KINDS,
  ULTRA_MALLOWS, STAGES, getScenario,
} = F;

const patternIds = (text) => detectPatterns(text).map((p) => p.pattern.id);

// ---------------------------------------------------------------------------
// The two directive examples
// ---------------------------------------------------------------------------

test('example 1: boss criticism → work-criticism, fact/interpretation split, big label', () => {
  const text = "My boss criticised my work. I think I'm terrible at my job.";
  assert.equal(matchScenarios(text)[0].scenario.id, 'work-criticism');

  const parts = splitThought(text);
  assert.deepEqual(parts.map((p) => [p.text, p.guess]), [
    ['My boss criticised my work', 'fact'],
    ["I'm terrible at my job", 'interpretation'],
  ]);
  assert.ok(parts[1].cues.some((c) => c.text === 'I think'), 'stripped "I think" is kept as a cue');

  assert.ok(patternIds(text).includes('big-label'));
  assert.ok(!patternIds("I think I'm terrible at my job").includes('mind-reading'), '"I think I\'m" is not mind-reading');
});

test('example 2: unanswered message + "deliberately ignoring me" → unanswered-message, mind-reading', () => {
  const fact = "My friend hasn't replied to my message.";
  const interpretation = 'She is deliberately ignoring me';
  assert.equal(matchScenarios(fact)[0].scenario.id, 'unanswered-message');
  assert.equal(matchScenarios(`${fact} ${interpretation}`)[0].scenario.id, 'unanswered-message');
  assert.ok(patternIds(interpretation).includes('mind-reading'));

  const parts = splitThought("My friend hasn't replied to my message, she must hate me");
  assert.deepEqual(parts.map((p) => [p.text, p.guess]), [
    ["My friend hasn't replied to my message", 'fact'],
    ['She must hate me', 'interpretation'],
  ]);
});

// ---------------------------------------------------------------------------
// Library shape
// ---------------------------------------------------------------------------

const REQUIRED_SCENARIOS = [
  'unanswered-message', 'work-criticism', 'left-out', 'partner-distant', 'mistake-judged', 'job-rejection',
  'plans-cancelled', 'social-comparison', 'family-argument', 'group-chat-ignored', 'seemed-annoyed',
  'performance-review', 'bad-grade', 'no-text-back', 'family-criticism', 'money-setback', 'appearance-comment',
  'future-worry', 'past-regret', 'awkward-moment', 'credit-promotion', 'not-listened',
];

const REQUIRED_PATTERNS = [
  'mind-reading', 'future-reading', 'big-label', 'all-or-nothing', 'always-never', 'spotlight-on-me',
  'worst-case-jump', 'should-rules', 'only-the-bad-bit', 'feelings-as-proof', 'comparison-trap', 'shrinking-the-good',
];

test('thought patterns: required set, fields, compilable triggers, examples self-detect', () => {
  assert.ok(THOUGHT_PATTERNS.length >= 12);
  for (const id of REQUIRED_PATTERNS) assert.ok(THOUGHT_PATTERNS.some((p) => p.id === id), id);
  for (const p of THOUGHT_PATTERNS) {
    for (const k of ['id', 'name', 'explain', 'question', 'example']) assert.equal(typeof p[k], 'string', `${p.id}.${k}`);
    assert.ok(p.triggers.length > 0, p.id);
    for (const src of p.triggers) assert.doesNotThrow(() => new RegExp(src, 'gi'), `${p.id}: ${src}`);
    assert.ok(patternIds(p.example).includes(p.id), `example for ${p.id} should trigger it`);
  }
});

test('scenarios: at least 20, all required ones present, plus a general fallback', () => {
  assert.ok(SCENARIOS.length >= 20);
  for (const id of REQUIRED_SCENARIOS) assert.ok(getScenario(id), id);
  assert.equal(GENERAL.id, 'general');
  assert.equal(ALL_FRAMEWORKS.at(-1), GENERAL);
});

test('every framework has the required fields and minimum counts', () => {
  const pids = new Set(THOUGHT_PATTERNS.map((p) => p.id));
  for (const s of ALL_FRAMEWORKS) {
    const at = (k) => `${s.id}.${k}`;
    for (const k of ['id', 'title', 'guide', 'factPrompt', 'interpretationPrompt', 'safetyNote']) {
      assert.equal(typeof s[k], 'string', at(k));
      assert.ok(s[k].length > 0, at(k));
    }
    assert.ok(ULTRA_MALLOWS.includes(s.guide), at('guide'));
    assert.ok(ULTRA_MALLOWS.includes(s.cameo.mallow), at('cameo.mallow'));
    assert.ok(s.cameo.lines.length >= 1 && s.cameo.lines.length <= 2, at('cameo.lines'));
    for (const line of s.cameo.lines) assert.ok(line.length <= 110, `${at('cameo')} line too long: ${line}`);

    assert.ok(s.contexts.length > 0, at('contexts'));
    for (const c of s.contexts) assert.ok(CONTEXTS.includes(c), `${at('contexts')}: ${c}`);
    if (s !== GENERAL) {
      assert.ok(s.detect.keywords.length >= 5, at('detect.keywords'));
      assert.ok(s.detect.phrases.length >= 5, at('detect.phrases'));
    }
    assert.ok(s.commonInterpretations.length >= 3, at('commonInterpretations'));
    assert.ok(s.likelyPatterns.length >= 1, at('likelyPatterns'));
    for (const p of s.likelyPatterns) assert.ok(pids.has(p), `${at('likelyPatterns')}: ${p}`);

    for (const bucket of ['supports', 'against', 'missing']) {
      assert.ok(s.evidence[bucket].length >= 4, at(`evidence.${bucket}`));
      for (const c of s.evidence[bucket]) assert.ok(c.id && c.text, at(`evidence.${bucket}`));
    }

    assert.ok(s.angles.length >= 7, at('angles'));
    for (const a of s.angles) assert.ok(ANGLE_KINDS.includes(a.kind), `${at('angles')}: ${a.kind}`);
    assert.ok(s.angles.some((a) => a.kind === 'worry-partly-true'), at('angles worry-partly-true'));
    assert.ok(s.angles.some((a) => a.kind === 'not-enough-info'), at('angles not-enough-info'));

    assert.ok(s.otherEyes.length >= 3, at('otherEyes'));
    assert.ok(s.futureLens.predictionPrompts.length >= 1, at('futureLens.predictionPrompts'));
    assert.ok(s.futureLens.knowns.length >= 1, at('futureLens.knowns'));
    assert.ok(s.futureLens.unknowns.length >= 1, at('futureLens.unknowns'));

    assert.ok(s.nextSteps.length >= 6, at('nextSteps'));
    for (const n of s.nextSteps) assert.ok(STEP_KINDS.includes(n.kind), `${at('nextSteps')}: ${n.kind}`);

    if (s.conversation) {
      assert.equal(s.conversation.openers.length, 3, at('conversation.openers'));
      assert.ok(s.conversation.replies.length >= 3, at('conversation.replies'));
      for (const r of s.conversation.replies) {
        assert.match(r.label, /might/i, `${at('conversation')} reply labelled as a possibility`);
        assert.ok(r.text && r.yourMove, at('conversation.replies'));
      }
      assert.ok(s.conversation.tips.length >= 1, at('conversation.tips'));
      assert.match(s.conversation.note, /possibilities/i);
    }
  }
});

test('general framework has a kit for every thinking habit', () => {
  for (const p of THOUGHT_PATTERNS) {
    const kit = GENERAL.patternKit[p.id];
    assert.ok(kit, p.id);
    assert.ok(kit.angles.length >= 2 && kit.against.length >= 2 && kit.nextStep.text, p.id);
  }
});

test('ids are unique: scenarios, patterns, and every nested card id', () => {
  const frameworkIds = ALL_FRAMEWORKS.map((s) => s.id);
  assert.equal(new Set(frameworkIds).size, frameworkIds.length);
  const pids = THOUGHT_PATTERNS.map((p) => p.id);
  assert.equal(new Set(pids).size, pids.length);

  const seen = new Map();
  const walk = (node, path) => {
    if (Array.isArray(node)) node.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (node && typeof node === 'object') {
      if (typeof node.id === 'string' && path.includes('.')) {
        assert.ok(!seen.has(node.id), `duplicate id ${node.id} at ${path} and ${seen.get(node.id)}`);
        seen.set(node.id, path);
      }
      for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
    }
  };
  for (const s of ALL_FRAMEWORKS) {
    const { id, ...rest } = s;
    walk(rest, id);
  }
  assert.ok(seen.size > 500);
});

test('benign angles are always phrased as possibilities', () => {
  const hedge = /\b(?:might|could|may|maybe|perhaps|possib\w*)\b/i;
  for (const s of ALL_FRAMEWORKS) {
    for (const a of s.angles.filter((x) => x.kind === 'benign')) assert.match(a.text, hedge, `${s.id}: ${a.text}`);
  }
});

// ---------------------------------------------------------------------------
// Voice: no forbidden words anywhere
// ---------------------------------------------------------------------------

const FORBIDDEN = [
  /\bAI\b/, /\bsmart\b/i, /\bintelligent\b/i, /\bunderstands\b/i, /\bchatbots?\b/i,
  /cognitive distortion/i, /\bCBT\b/i, /\btherap(?:y|ies|ist|ists|eutic)\b/i, /\bpatients?\b/i,
  /\btreatments?\b/i, /\bdisorders?\b/i, /\bcatastrophi[sz]ing\b/i, /\bdiagnos\w*/i, /\bclinical\b/i,
  /\bsymptoms?\b/i,
];

function collectStrings(node, out = []) {
  if (typeof node === 'string') out.push(node);
  else if (Array.isArray(node)) node.forEach((x) => collectStrings(x, out));
  else if (node && typeof node === 'object') Object.values(node).forEach((x) => collectStrings(x, out));
  return out;
}

test('no forbidden words in any authored string or engine output', () => {
  const strings = collectStrings(Object.values(F));
  // Engine-authored output across every framework and stage.
  for (const s of ALL_FRAMEWORKS) {
    for (const stage of STAGES) strings.push(pickCameo(s, stage).text);
    strings.push(...collectStrings(buildAngles(s, { interpretation: 'They hate me and I always ruin everything' })));
    strings.push(...collectStrings(composeAngle({
      fact: 'something happened', interpretation: 'it means something',
      evidence: s.evidence, keptAngles: s.angles.slice(0, 2), nextStep: s.nextSteps[0],
    })));
  }
  strings.push(...collectStrings(checkSafety('I want to kill myself')));
  strings.push(...collectStrings(checkSafety('he hit me')));
  assert.ok(strings.length > 2000);
  for (const str of strings) {
    for (const re of FORBIDDEN) assert.doesNotMatch(str, re, `forbidden ${re} in: ${str}`);
  }
});

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

test('safety: crisis language switches reframing off with a crisis message', () => {
  for (const t of [
    'I want to kill myself', 'I just want to end it all', "I don't want to be here anymore",
    'I dont want to be here', 'I keep thinking about hurting myself', "there's no reason to live",
    'I’m going to hurt myself', 'Everyone would be better off without me', 'kms', 'I have been self-harming again',
    'I want to die',
  ]) {
    const r = checkSafety(t);
    assert.equal(r.reframeAppropriate, false, t);
    assert.equal(r.level, 'crisis', t);
    assert.ok(r.message.length > 40 && r.resources.length > 0, t);
  }
  assert.equal(checkSafety('My friend said she wants to kill herself').level, 'crisis');
});

test('safety: abuse, violence, threats, harassment, discrimination → care (no reframing)', () => {
  for (const [t, category] of [
    ['My boyfriend hit me last night', 'violence'],
    ['He threatened to hurt me if I left', 'threat'],
    ["I'm being bullied at school", 'harassment'],
    ['My boss keeps making sexual comments about me', 'harassment'],
    ['They called me a racial slur', 'discrimination'],
    ['My partner is abusive', 'abuse'],
    ["He won't let me see my friends", 'abuse'],
    ["I don't feel safe at home", 'unsafe'],
  ]) {
    const r = checkSafety(t);
    assert.equal(r.reframeAppropriate, false, t);
    assert.equal(r.level, 'care', t);
    assert.equal(r.category, category, t);
    assert.ok(r.message.length > 40, t);
  }
});

test('safety: everyday idioms are not flagged', () => {
  for (const t of [
    'this deadline is killing me', 'I could kill for a coffee', "I'm dying to know what she said",
    'I nearly died laughing', 'I want to die of embarrassment', 'My mum is going to kill me when she sees my grades',
    "I'm scared of my mum's reaction", "I'm in danger of failing the course", 'I felt threatened by her success',
    'I want to end it with him', 'It suddenly hit me that I forgot her birthday',
    "My boss criticised my work. I think I'm terrible at my job.",
  ]) {
    const r = checkSafety(t);
    assert.equal(r.reframeAppropriate, true, t);
    assert.equal(r.level, 'none', t);
  }
});

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

test('matching: realistic phrasings pick the right scenario', () => {
  const cases = [
    ['My best friend left me on read two days ago', 'unanswered-message'],
    ['My manager said my report was sloppy and asked me to redo it', 'work-criticism'],
    ["Everyone went to Sam's birthday and I wasn't invited", 'left-out'],
    ['My boyfriend has been really quiet and distant all week', 'partner-distant'],
    ["I sent the email to the wrong person and now everyone thinks I'm an idiot", 'mistake-judged'],
    ['I got a rejection email after the final interview', 'job-rejection'],
    ['Jess cancelled our dinner plans last minute again', 'plans-cancelled'],
    ['Scrolling Instagram and everyone my age is getting engaged', 'social-comparison'],
    ['Had a huge row with my dad last night', 'family-argument'],
    ['I posted in the group chat and nobody replied', 'group-chat-ignored'],
    ['My coworker seemed annoyed with me this morning', 'seemed-annoyed'],
    ['My annual review said I meet expectations', 'performance-review'],
    ['I failed my maths exam', 'bad-grade'],
    ["Went on a first date and he hasn't texted back", 'no-text-back'],
    ['My mum thinks my degree is pointless and compares me to my sister', 'family-criticism'],
    ["I got an unexpected bill and now I can't afford rent", 'money-setback'],
    ["My aunt said I've put on weight", 'appearance-comment'],
    ['What if I fail my driving test next week', 'future-worry'],
    ['I regret turning down that offer years ago', 'past-regret'],
    ['I made a joke at the party and nobody laughed', 'awkward-moment'],
    ['My colleague took credit for my idea in the meeting', 'credit-promotion'],
    ['He keeps interrupting me in meetings', 'not-listened'],
    ["The guy I'm seeing hasn't texted back since our date", 'no-text-back'],
  ];
  for (const [text, id] of cases) assert.equal(matchScenarios(text)[0].scenario.id, id, text);
});

test('matching: UK and US spellings both work', () => {
  assert.equal(matchScenarios('My boss criticized my work')[0].scenario.id, 'work-criticism');
  assert.equal(matchScenarios('She canceled on me again')[0].scenario.id, 'plans-cancelled');
  assert.equal(matchScenarios('She cancelled on me again')[0].scenario.id, 'plans-cancelled');
});

test('matching: general framework is always last, and is the fallback for anything unmatched', () => {
  for (const text of ['', '   ', 'zxqv blorp', "My boss criticised my work"]) {
    const r = matchScenarios(text);
    assert.equal(r.at(-1).scenario.id, 'general', text);
    assert.equal(r.at(-1).confidence, 'fallback');
  }
  assert.equal(matchScenarios('zxqv blorp').length, 1);
  assert.ok(matchScenarios('my friend cancelled and my boss criticised my work', { limit: 1 }).length === 2);
});

// ---------------------------------------------------------------------------
// Splitting
// ---------------------------------------------------------------------------

test('splitThought: connectors, hedges and reported speech', () => {
  const a = splitThought("He didn't reply so he probably hates me");
  assert.deepEqual(a.map((p) => [p.text, p.guess]), [["He didn't reply", 'fact'], ['He probably hates me', 'interpretation']]);

  const b = splitThought("She cancelled on Friday which means she doesn't care");
  assert.deepEqual(b.map((p) => [p.text, p.guess]), [['She cancelled on Friday', 'fact'], ["She doesn't care", 'interpretation']]);

  const c = splitThought("My mum said I should get a proper job; I'll never be good enough for her");
  assert.deepEqual(c.map((p) => p.guess), ['fact', 'interpretation']);

  const d = splitThought("I'm so stupid");
  assert.deepEqual(d.map((p) => [p.text, p.guess]), [["I'm so stupid", 'interpretation']]);

  const e = splitThought('Yesterday, she said my essay was weak and I feel like I am useless');
  assert.equal(e[0].text, 'Yesterday, she said my essay was weak');
  assert.equal(e[0].guess, 'fact');
  assert.equal(e[1].text, 'I am useless');
  assert.equal(e[1].guess, 'interpretation');

  assert.deepEqual(splitThought(''), []);
  assert.deepEqual(splitThought('hmm').map((p) => p.guess), ['unsure']);
  assert.ok(splitThought('a. b. c').every((p, i) => p.id === `c${i + 1}`));
});

// ---------------------------------------------------------------------------
// Patterns, angles, evidence, steps
// ---------------------------------------------------------------------------

test('detectPatterns returns matches with indexes into the tidied text', () => {
  const text = 'I always mess up and everyone saw it’s my fault';
  const found = detectPatterns(text);
  const t = tidyInput(text);
  for (const { matches } of found) for (const m of matches) assert.equal(t.slice(m.index, m.index + m.text.length), m.text);
  const ids = found.map((f) => f.pattern.id);
  assert.ok(ids.includes('always-never') && ids.includes('spotlight-on-me'));
  assert.deepEqual(detectPatterns(''), []);
});

test('buildAngles: honest kinds always present, pattern angles fill the user’s words, kept first', () => {
  for (const s of ALL_FRAMEWORKS) {
    const angles = buildAngles(s, { interpretation: 'She is deliberately ignoring me' });
    const kinds = angles.map((a) => a.kind);
    assert.ok(kinds.includes('worry-partly-true') && kinds.includes('not-enough-info'), s.id);
    assert.ok(kinds.slice(0, 5).includes('worry-partly-true'), `${s.id}: worry-partly-true comes early`);
    for (let i = 1; i < 4; i++) assert.notEqual(angles[i].kind, angles[i - 1].kind, `${s.id}: variety`);
    assert.equal(new Set(angles.map((a) => a.id)).size, angles.length, `${s.id}: no duplicates`);
  }
  const angles = buildAngles('unanswered-message', { interpretation: 'She is deliberately ignoring me' });
  const fromPattern = angles.filter((a) => a.source === 'pattern');
  assert.ok(fromPattern.length >= 1);
  assert.ok(fromPattern.some((a) => a.text.includes('“She is deliberately ignoring me”')));
  assert.ok(angles.every((a) => !a.text.includes('{thought}')));

  const kept = buildAngles('unanswered-message', { kept: ['um-ang5'] });
  assert.equal(kept[0].id, 'um-ang5');
  assert.equal(kept[0].kept, true);

  const noThought = buildAngles('general', { patterns: ['big-label'] });
  assert.ok(noThought.some((a) => a.text.startsWith('That first thought')));
  assert.equal(buildAngles('no-such-id')[0].source, 'general');
});

test('buildEvidence and buildNextSteps add habit cards without duplicates', () => {
  const ev = buildEvidence('work-criticism', { interpretation: "I'm terrible at my job" });
  assert.ok(ev.against.some((c) => c.patternId === 'big-label'));
  assert.equal(ev.supports.length, getScenario('work-criticism').evidence.supports.length);
  const steps = buildNextSteps('work-criticism', { patterns: ['big-label', 'big-label'] });
  assert.equal(steps.filter((s) => s.patternId === 'big-label').length, 1);
});

// ---------------------------------------------------------------------------
// Composing
// ---------------------------------------------------------------------------

test('composeAngle uses the user’s own words, with authored labels', () => {
  const s = getScenario('work-criticism');
  const out = composeAngle({
    fact: 'my boss criticised my report in front of the team',
    interpretation: "i'm terrible at my job",
    evidence: { supports: [s.evidence.supports[0]], against: ['she praised my last project'], missing: [s.evidence.missing[0]] },
    keptAngles: [s.angles[3]],
    nextStep: 'ask her for one example of what she wants',
  });
  const labels = out.lines.map((l) => l.label);
  for (const l of ['What happened', 'What my brain added', 'What I don’t know yet', 'Another angle', 'My next move']) {
    assert.ok(labels.includes(l), l);
  }
  const text = out.lines.map((l) => l.text).join(' ');
  assert.ok(text.includes('My boss criticised my report in front of the team.'));
  assert.ok(text.includes("“I'm terrible at my job”"));
  assert.ok(text.includes('She praised my last project'), 'only the first letter is tidied');
  assert.ok(text.includes('Ask her for one example of what she wants.'));
  assert.ok(out.summary.includes('boss criticised my report in front of the team'));
  assert.ok(out.summary.includes("I'm terrible at my job"));
  assert.ok(out.summary.includes('might still be right'));
  assert.equal(composeAngle({}).lines.length, 0);
  assert.equal(typeof composeAngle({}).summary, 'string');
});

test('pickCameo: guide lines by stage, cameo at angles/done, never a joke at safety', () => {
  const s = getScenario('unanswered-message');
  assert.deepEqual(pickCameo(s, 'angles'), { mallow: 'glitzi', role: 'cameo', stage: 'angles', text: s.cameo.lines[0] });
  assert.equal(pickCameo(s, 'done').text, s.cameo.lines[1]);
  assert.equal(pickCameo(s, 'welcome').mallow, 'zuzu');
  assert.equal(pickCameo(s, 'safety').role, 'guide');
  const blubi = pickCameo('appearance-comment', 'welcome');
  assert.equal(blubi.mallow, 'blubi');
  assert.equal(pickCameo('appearance-comment', 'evidence').mallow, 'zuzu', 'falls back to Zuzu for missing stages');
  for (const fw of ALL_FRAMEWORKS) for (const st of STAGES) assert.ok(pickCameo(fw, st).text.length > 0);
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

test('determinism: same input → same output, every time', () => {
  const text = "My friend hasn't replied to my message. She is deliberately ignoring me and I always ruin everything";
  const run = () => ({
    safety: checkSafety(text),
    match: matchScenarios(text).map((m) => [m.scenario.id, m.score, m.matched]),
    split: splitThought(text),
    patterns: detectPatterns(text).map((p) => [p.pattern.id, p.matches]),
    angles: buildAngles('unanswered-message', { interpretation: text, kept: ['um-ang2'] }),
    evidence: buildEvidence('unanswered-message', { interpretation: text }),
    steps: buildNextSteps('unanswered-message', { interpretation: text }),
    compose: composeAngle({ fact: 'a', interpretation: text, keptAngles: ['b'], nextStep: 'c' }),
    cameo: STAGES.map((st) => pickCameo('unanswered-message', st)),
  });
  const first = run();
  for (let i = 0; i < 5; i++) assert.deepEqual(run(), first);
});

test('library data is frozen', () => {
  assert.ok(Object.isFrozen(SCENARIOS) && Object.isFrozen(SCENARIOS[0].angles) && Object.isFrozen(SCENARIOS[0].angles[0]));
  assert.ok(Object.isFrozen(THOUGHT_PATTERNS[0]));
});

// ---------------------------------------------------------------------------
// Optional lenses: selection rules
// ---------------------------------------------------------------------------

/** What the flow passes in: the whole text, plus the "brain added" part. */
function lensesFor(text, opts = {}) {
  const parts = splitThought(text);
  const added = parts.filter((p) => p.guess !== 'fact').map((p) => p.text).join('. ');
  const scenario = opts.scenario || matchScenarios(text)[0].scenario;
  return recommendLenses({ text, interpretation: added, scenario, ...opts }).map((l) => l.id);
}

test('lens rules: the three directive examples get the right lenses', () => {
  // big label → Meaning Mixer, then Zoom Out fills the second slot
  assert.deepEqual(lensesFor("My boss criticised my work. I think I'm terrible at my job."), ['mixer', 'zoom']);
  // mind-reading with a certainty word ("must hate me") → Mixer, then Zoom Out
  assert.deepEqual(lensesFor("My friend hasn't replied. She must hate me."), ['mixer', 'zoom']);
  // a prediction ("I'll never") → Future Lens first; "never" also gives the Mixer something to dial
  assert.deepEqual(lensesFor("I failed one interview. I'll never get a good job."), ['future', 'mixer']);
});

test('lens rules: Future Lens needs a prediction; Mixer needs a loud word; Zoom Out is the fallback', () => {
  // nothing loud and nothing predicted → Zoom Out only
  assert.deepEqual(lensesFor('My sister got engaged.'), ['zoom']);
  assert.deepEqual(lensesFor('zxqv blorp', { scenario: 'general' }), ['zoom']);
  // "what if" + "tomorrow" style worry, no loud words → Future Lens, then Zoom Out
  assert.deepEqual(lensesFor('What if I freeze in the presentation next week'), ['future', 'zoom']);
  // "they'll think…" is a prediction too (and "I'm weird" is a label the Mixer can dial)
  assert.deepEqual(lensesFor("I said something awkward at lunch. They'll think I'm weird.").sort(), ['future', 'mixer']);
  // "it's going to go wrong"
  assert.equal(lensesFor("My driving test is on Friday. It's going to go wrong.")[0], 'future');
  // a habit id alone can switch the Future Lens on…
  assert.deepEqual(recommendLenses({ text: 'hmm', patterns: ['future-reading'], scenario: 'general' }).map((l) => l.id), ['future', 'zoom']);
  // …but a label habit with no dial-able words never offers an empty Mixer
  assert.ok(!recommendLenses({ text: 'ok then', patterns: ['big-label'], scenario: 'general' }).some((l) => l.id === 'mixer'));
  // Zoom Out climbs when the habit is "only the bad bit"
  const zoom = recommendLenses({ text: "I can't stop thinking about the one bad comment", scenario: 'general' }).find((l) => l.id === 'zoom');
  assert.ok(zoom.score > LX.LENS_RULES.zoomBase);
});

test('lens rules: limit, shape, reasons in the person’s words, determinism', () => {
  const text = "Everyone thinks I'm an idiot. I'll never get anything right.";
  const all = recommendLenses({ text, interpretation: text, limit: 3 });
  assert.deepEqual(all.map((l) => l.id), ['mixer', 'future', 'zoom'], 'ranked by score, all three when allowed');
  assert.equal(recommendLenses({ text, interpretation: text, limit: 1 }).length, 1);
  assert.equal(recommendLenses({ text, interpretation: text }).length, 2, 'default is up to two');
  for (const l of all) {
    assert.ok(LX.LENS_IDS.includes(l.id) && l.name && l.glyph && typeof l.score === 'number');
    assert.ok(l.reason && !/[{}]/.test(l.reason), l.reason);
  }
  assert.match(all.find((l) => l.id === 'mixer').reason, /“everyone”/, 'quotes the person’s own loud word');
  const run = () => recommendLenses({ text, interpretation: text, scenario: 'mistake-judged', limit: 3 });
  for (let i = 0; i < 3; i++) assert.deepEqual(run(), run());
});

test('findPredictions picks out the future-tense pieces only', () => {
  assert.deepEqual(findPredictions(['I failed one interview', "I'll never get a good job"]), ["I'll never get a good job"]);
  assert.deepEqual(findPredictions(["They'll think I'm weird", "it's going to go wrong", 'what if I freeze', 'She said no']),
    ["They'll think I'm weird", "It's going to go wrong", 'What if I freeze']);
  assert.deepEqual(findPredictions([]), []);
  // every authored prediction in the library reads as a prediction
  for (const s of ALL_FRAMEWORKS) {
    assert.ok(s.futureLens.predictions.length >= 2, s.id);
    for (const p of s.futureLens.predictions) assert.deepEqual(findPredictions([p]), [p], `${s.id}: ${p}`);
  }
});

// ---------------------------------------------------------------------------
// Meaning Mixer: detection and alternatives
// ---------------------------------------------------------------------------

const dialIds = (text) => buildMixer(text).dials.map((d) => d.entryId);
const optionTexts = (text, i = 0) => buildMixer(text).dials[i].options.map((o) => o.text);

test('mixer detection: labels, certainty, predictions, absolutes, should-rules', () => {
  assert.deepEqual(dialIds("I'm terrible at my job"), ['label-job']);
  assert.deepEqual(dialIds("I think I'm terrible at my job"), ['label-job']);
  assert.deepEqual(dialIds('She must hate me'), ['must-hate']);
  assert.deepEqual(dialIds("I'll never get a good job"), ['ill-never']);
  assert.deepEqual(dialIds('I always mess things up'), ['always']);
  assert.deepEqual(dialIds("Everyone thinks I'm an idiot"), ['everyone', 'thinks-im', 'label-competence']);
  assert.deepEqual(dialIds("They'll think I'm weird"), ['theyll-think', 'label-social']);
  assert.deepEqual(dialIds("She's deliberately ignoring me"), ['ignoring-me']);
  assert.deepEqual(dialIds('I should be over this by now'), ['should', 'by-now']);
  assert.deepEqual(dialIds("It's going to go wrong"), ['go-wrong']);
  assert.deepEqual(dialIds('Nobody likes me'), ['nobody']);
  assert.deepEqual(dialIds('I mess up every time'), ['every-time']);
  assert.deepEqual(dialIds('I went for a walk and had a sandwich'), [], 'plain sentences have nothing to dial');
  assert.deepEqual(buildMixer('').dials, []);
  // "I think I'm…" is a hedge, not mind-reading; "he thinks I'm…" is
  assert.ok(!dialIds("I think I'm boring").includes('thinks-im'));
  assert.ok(dialIds("He thinks I'm boring").includes('thinks-im'));
});

test('mixer alternatives: the directive examples, original always first', () => {
  assert.deepEqual(optionTexts("I'm terrible at my job"),
    ["I'm terrible at my job", 'I’m not doing this part well yet', 'this piece of work needs fixing', 'I’m still learning this part']);
  assert.deepEqual(optionTexts('I always mess things up'), ['always', 'often', 'sometimes', 'now and then']);
  assert.deepEqual(optionTexts('I mess up every time'), ['every time', 'a lot', 'sometimes', 'this time']);
  const hate = optionTexts('She must hate me');
  assert.equal(hate[0], 'must hate me');
  assert.ok(hate.includes('might be upset with me'), 'keeps "your worry might be partly right" on the dial');
  assert.ok(hate.some((t) => /don’t know yet/.test(t)), 'keeps "not enough information yet" on the dial');
  for (const d of buildMixer("Everyone thinks I'm useless and I'll never get it right").dials) {
    assert.equal(d.options[0].original, true);
    assert.equal(d.options[0].text, d.text);
    assert.ok(d.options.length >= 3, d.entryId);
    assert.ok(d.options.slice(1).every((o) => !o.original && o.heat < d.heat), `${d.entryId}: alternatives are lighter`);
  }
});

test('mixer detection: spans index the tidied text, never overlap, cap at the heaviest three', () => {
  const text = 'Everyone always says I’m useless, nobody cares and everything is ruined';
  const t = tidyInput(text);
  const all = buildMixer(text, { limit: 10 }).dials;
  for (const d of all) assert.equal(t.slice(d.start, d.end), d.text);
  for (let i = 1; i < all.length; i++) assert.ok(all[i].start >= all[i - 1].end, 'no overlaps');
  const three = buildMixer(text).dials;
  assert.equal(three.length, 3);
  assert.deepEqual(three.map((d) => d.start), [...three.map((d) => d.start)].sort((a, b) => a - b), 'sentence order');
  const heaviest = [...all].sort((a, b) => b.heat - a.heat || a.start - b.start).slice(0, 3).map((d) => d.id).sort();
  assert.deepEqual(three.map((d) => d.id).sort(), heaviest);
});

test('mixSentence: swaps settings, capitalises, agrees verbs, spaces contractions', () => {
  const job = buildMixer("I'm terrible at my job");
  assert.deepEqual(mixSentence(job, []), { text: "I'm terrible at my job", heat: 0.95, band: 'Very heavy', picks: [0], changed: false,
    segments: [{ text: "I'm terrible at my job", dial: 0 }] });
  const segs = mixSentence(buildMixer("I think she's ignoring me, always."), [1, 2]).segments;
  assert.deepEqual(segs, [{ text: 'I think she', dial: null }, { text: ' ', dial: null }, { text: 'might be ignoring me', dial: 0 },
    { text: ', ', dial: null }, { text: 'sometimes', dial: 1 }, { text: '.', dial: null }]);
  assert.equal(mixSentence(job, [2]).text, 'This piece of work needs fixing');
  assert.equal(mixSentence(job, [3]).text, 'I’m still learning this part');
  assert.equal(mixSentence(buildMixer("I think I'm terrible at my job"), [2]).text, 'I think this piece of work needs fixing');
  assert.equal(mixSentence(buildMixer('She must hate me'), [1]).text, 'She might be upset with me');
  assert.equal(mixSentence(buildMixer("I'll never get a good job"), [2]).text, 'It might take a while to get a good job');
  assert.equal(mixSentence(buildMixer("I'll never get a good job"), [3]).text, 'I don’t know yet whether I’ll get a good job');
  assert.equal(mixSentence(buildMixer("Everyone thinks I'm useless"), [2, 0]).text, "Some people think I'm useless");
  assert.equal(mixSentence(buildMixer('Everything is going wrong'), [2]).text, 'Some things are going wrong');
  assert.equal(mixSentence(buildMixer('Everyone else is ahead of me'), [3]).text, 'The people I’m comparing myself with are ahead of me');
  assert.equal(mixSentence(buildMixer("She's deliberately ignoring me"), [1]).text, 'She might be ignoring me');
  assert.equal(mixSentence(buildMixer('Things will never get better'), [3]).text, 'I don’t know yet whether things will get better');
  assert.equal(mixSentence(buildMixer("I'm fine. Nobody likes me though"), [2]).text, "I'm fine. Not everyone likes me though");
  // out-of-range settings clamp; heat falls as the dial turns; bands are labels only
  const m = buildMixer('I always mess things up');
  assert.equal(mixSentence(m, [99]).text, 'I now and then mess things up');
  assert.equal(mixSentence(m, [-3]).text, 'I always mess things up');
  const heats = m.dials[0].options.map((_, k) => mixSentence(m, [k]).heat);
  assert.deepEqual(heats, [...heats].sort((a, b) => b - a));
  assert.equal(heatBand(0.3), 'Plain');
  assert.equal(heatBand(0.95), 'Very heavy');
  assert.equal(mixSentence({ text: '', dials: [] }).heat, 0);
  assert.equal(dialKey(buildMixer("She's deliberately ignoring me").dials[0]), 'deliberately ignoring me');
  assert.equal(dialKey(buildMixer('Everyone else is ahead').dials[0]), 'everyone else');
});

test('mixer lexicon: compiles, unique ids, valid settings, every template fills', () => {
  const ids = LX.MIXER_LEXICON.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  const kinds = Object.keys(LX.MIXER_KIND_NAMES);
  for (const e of LX.MIXER_LEXICON) {
    assert.doesNotThrow(() => new RegExp(e.re, 'gi'), e.id);
    assert.ok(kinds.includes(e.kind), `${e.id}: ${e.kind}`);
    assert.ok(e.heat > 0 && e.heat <= 1, e.id);
    assert.ok(e.options.length >= 2, e.id);
    for (const [txt, heat, n] of e.options) {
      assert.ok(typeof txt === 'string' && txt.length > 1, e.id);
      assert.ok(heat > 0 && heat < e.heat, `${e.id}: ${txt}`);
      assert.ok(n == null || ['sg', 'pl'].includes(n), `${e.id}: ${n}`);
      const groups = new RegExp(e.re).source.match(/\((?!\?)/g)?.length || 0;
      for (const [, k] of txt.matchAll(/\{(\d)\}/g)) assert.ok(Number(k) <= groups, `${e.id}: {${k}} has no capture group`);
    }
  }
  // agreement map round-trips
  for (const [sg, pl] of Object.entries(LX.AGREE_PLURAL)) assert.ok(sg && pl && sg !== pl, sg);
});

// ---------------------------------------------------------------------------
// Zoom Out and Future Lens content
// ---------------------------------------------------------------------------

test('zoom out: five stops, situation lines first, an honest line at every stop', () => {
  assert.deepEqual(LX.ZOOM_STOPS.map((s) => s.id), ['moment', 'today', 'week', 'year', 'whole']);
  assert.equal(zoomFamily('work-criticism'), 'work');
  assert.equal(zoomFamily('unanswered-message'), 'social');
  assert.equal(zoomFamily('general'), null);
  assert.equal(zoomPrompts('work-criticism', 'moment').lines.length, 0);
  const today = zoomPrompts('work-criticism', 'today');
  assert.equal(today.question, 'What’s one thing that went fine today?');
  assert.equal(today.lines[0].text, LX.ZOOM_LINES.today.work[0]);
  assert.match(zoomPrompts('general', 'week').question, /What else is going on in your life right now/);
  assert.match(zoomPrompts('general', 'year').question, /matter in a month/);
  for (const s of ALL_FRAMEWORKS) {
    for (const stop of LX.ZOOM_STOPS.slice(1)) {
      const z = zoomPrompts(s, stop.id);
      assert.ok(z.lines.length >= 3 && z.lines.length <= 4, `${s.id}/${stop.id}`);
      assert.equal(z.lines.filter((l) => l.honest).length, 1, `${s.id}/${stop.id} honest line`);
      assert.equal(new Set(z.lines.map((l) => l.id)).size, z.lines.length);
    }
  }
  // "it might still matter" is always on the table when asking about the long run
  assert.ok(zoomPrompts('job-rejection', 'year').lines.some((l) => /might still matter/.test(l.text)));
});

test('future lens: deck sorts the person’s own words, falls back to authored predictions', () => {
  const deck = buildFutureDeck('job-rejection', { facts: ['I failed one interview'], added: ["I'll never get a good job"] });
  assert.deepEqual(deck.ownPredictions, ["I'll never get a good job"]);
  assert.deepEqual(deck.pieces.slice(0, 2).map((p) => [p.text, p.guess, p.source]),
    [['I failed one interview', 'known', 'you'], ["I'll never get a good job", 'predicted', 'you']]);
  assert.ok(deck.pieces.length <= 5 && deck.unknowns.length >= 1);
  assert.equal(new Set(deck.pieces.map((p) => p.id)).size, deck.pieces.length);
  const noPred = buildFutureDeck('unanswered-message', { facts: ["My friend hasn't replied"], added: ['She must hate me'] });
  assert.deepEqual(noPred.ownPredictions, []);
  assert.ok(noPred.pieces.filter((p) => p.guess === 'predicted').every((p) => p.source === 'library'));
  assert.ok(noPred.pieces.some((p) => p.guess === 'predicted'));
  for (const s of ALL_FRAMEWORKS) {
    const d = buildFutureDeck(s);
    assert.ok(d.pieces.some((p) => p.guess === 'known') && d.pieces.some((p) => p.guess === 'predicted'), s.id);
    assert.equal(d.copy.sureQuestion.includes('0 to 100'), true);
  }
});

test('future lens: certainty bands cover 0–100 and never steer the number', () => {
  assert.equal(certaintyBand(0).id, 'low');
  assert.equal(certaintyBand(30).id, 'low');
  assert.equal(certaintyBand(31).id, 'middle');
  assert.equal(certaintyBand(70).id, 'high');
  assert.equal(certaintyBand(90).id, 'certain');
  assert.equal(certaintyBand(100).id, 'certain');
  assert.equal(certaintyBand(500).id, 'certain');
  assert.equal(certaintyBand('nope').id, 'low');
  for (const b of LX.CERTAINTY_BANDS) assert.doesNotMatch(b.text, /\b(?:should|lower|too high|wrong)\b/i, b.text);
});

test('lens cameos: every framework gets a short line from a known Mallow, for every lens', () => {
  for (const s of ALL_FRAMEWORKS) {
    for (const lens of LX.LENS_IDS) {
      const c = pickLensCameo(s, lens);
      assert.ok(ULTRA_MALLOWS.includes(c.mallow), `${s.id}/${lens}`);
      assert.ok(c.text.length > 10 && c.text.length <= 110, c.text);
    }
  }
  assert.equal(pickLensCameo('unanswered-message', 'mixer').mallow, 'glitzi');
  assert.equal(pickLensCameo('general', 'nope'), null);
});

test('composeAngle adds lens results to the star map', () => {
  const out = composeAngle({
    fact: 'I failed one interview', interpretation: "I'll never get a good job",
    lenses: {
      zoom: { lines: ['I’ve got through hard things before', 'I honestly can’t tell yet'] },
      future: { known: ['I failed one interview'], predicted: ["I'll never get a good job"], certainty: 85, sealed: { when: 'month' } },
      mixer: { original: "I'll never get a good job", chosen: 'It might take a while to get a good job', choice: 'mix' },
    },
    nextStep: 'Ask for feedback',
  });
  const byKey = Object.fromEntries(out.lines.map((l) => [l.key, l]));
  assert.equal(byKey.zoom.label, 'Zooming out');
  assert.equal(byKey.zoom.text, 'I’ve got through hard things before; I honestly can’t tell yet.');
  assert.equal(byKey.known.text, 'I failed one interview.');
  assert.equal(byKey.predicted.text, "“I'll never get a good job” — it felt 85/100 sure.");
  assert.match(byKey.sealed.text, /^In a month/);
  assert.equal(byKey.words.text, '“It might take a while to get a good job”');
  assert.equal(out.lines.at(-1).key, 'next', 'next move stays last');
  assert.ok(out.summary.includes('85/100'));
  const kept = composeAngle({ lenses: { mixer: { original: 'she must hate me', chosen: 'She might be upset with me', choice: 'original' } } });
  assert.equal(kept.lines[0].text, '“She must hate me” — I kept my own words.');
  assert.deepEqual(composeAngle({ lenses: {} }).lines, []);
  assert.deepEqual(composeAngle({ lenses: { future: { predicted: [] } } }).lines, []);
});

test('lens copy: no forbidden words, British spelling, no unfilled templates', () => {
  const US = /\b(?:color|favorite|realiz\w*|apologiz\w*|organiz\w*|recogniz\w*|behavior|center|mom)\b/i;
  const authored = collectStrings(Object.values(LX)).filter((s) => !/\\b|\(\?/.test(s)); // skip regex sources
  for (const str of authored) {
    for (const re of FORBIDDEN) assert.doesNotMatch(str, re, `forbidden ${re} in: ${str}`);
    assert.doesNotMatch(str, US, `US spelling in: ${str}`);
  }
  const strings = [];
  const text = "Everyone thinks I'm useless. I always ruin everything and I'll never get it right. She must hate me.";
  const mx = buildMixer(text, { limit: 10 });
  for (const d of mx.dials) for (let k = 0; k < d.options.length; k++) strings.push(mixSentence(mx, mx.dials.map((x) => (x === d ? k : 0))).text);
  for (const s of ALL_FRAMEWORKS) {
    for (const stop of LX.ZOOM_STOPS) strings.push(...collectStrings(zoomPrompts(s, stop.id)));
    strings.push(...collectStrings(buildFutureDeck(s)));
    strings.push(...recommendLenses({ text, interpretation: text, scenario: s, limit: 3 }).map((l) => l.reason));
  }
  assert.ok(authored.length > 150 && strings.length > 300);
  for (const str of strings) {
    for (const re of FORBIDDEN) assert.doesNotMatch(str, re, `forbidden ${re} in: ${str}`);
    assert.doesNotMatch(str, US, `US spelling in: ${str}`);
    assert.doesNotMatch(str, /[{}]/, `unfilled template: ${str}`);
  }
});
