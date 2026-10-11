// Tests for HUSHMALLOW ULTRA "Another Angle" (Reframe).
// Run: node --test hushmallow/tests/reframe.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as F from '../src/ultra/frameworks.js';
import {
  checkSafety, matchScenarios, splitThought, detectPatterns, buildAngles, buildEvidence,
  buildNextSteps, composeAngle, pickCameo, tidyInput,
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
