// The Memory Garden's tools: one entry per skill a world can teach.
//
// Pure data (no DOM), importable in Node. Every entry carries what the garden
// shows: a title, a one-line essence, a short practical explanation, steps,
// one real-life example ('Try it: …'), the evidence scope label and the
// catalogue wording it rests on (src/v3/data/catalog.js SKILLS, quoted
// verbatim in `sources`; scope labels and sources as in docs/V3_SKILLS.md),
// care notes, related tools, the world that teaches it, and the charm's
// design parameters (src/hushfold/charm.js draws it).
//
// Wording rules: 'can help', 'many people find'; never cure, treat, relief or
// guarantees. Contemplative and creative roots are listed separately
// (`inspiredBy`) from the research the scope label refers to, and every
// plain-language evidence note says hushmallow itself hasn't been studied.
// No URLs here: the shipped app names its sources but never links out (see
// tests/core.test.mjs). Source links live in docs/V3_SKILLS.md.

export const SKILLS_VERSION = 1;

/** Shown once in the garden's "Where this comes from". */
export const EVIDENCE_NOTE = 'These are calming, non-clinical skills. The label shows how much research backs the family of techniques each one draws on. It isn’t a claim about hushmallow itself, and nothing here replaces professional care.';
export const INSPIRATION_NOTE = 'Creative and contemplative inspirations, not research findings.';

/** Charm shape families (charm.js has one painter per family). */
export const CHARM_FAMILIES = Object.freeze(['crystal', 'ripple-stone', 'prism', 'lantern', 'shell', 'star-seed', 'moon-pearl', 'seed']);

// Citation labels for the sources in docs/V3_SKILLS.md (searchable, never links).
const REF = {
  slow: 'PubMed 38518585',
  va: 'US Department of Veterans Affairs: evidence-based treatment',
  act: 'PubMed 38615492',
  nhsSolve: 'NHS Every Mind Matters: problem solving',
  nhsWorry: 'NHS Every Mind Matters: tackling your worries',
  label: 'PubMed 17576282',
  compassion: 'PubMed 37362192',
  nccih: 'NCCIH: mind and body approaches for stress',
};

// Catalogue entries, verbatim (tests compare them with src/v3/data/catalog.js).
const src = (skill, group, scope, does, insight, precaution, ref) => Object.freeze({ skill, group, scope, does, insight, precaution, ref });
const S = {
  slow: src('Intentionally Slow', 'Arousal downshift', 'Moderate – mechanism family',
    'Move each object at half your usual speed; follow the path without rushing.',
    'Deliberately slowing a response creates space before choosing an action.',
    'Do not drive or interact while walking in traffic.', REF.slow),
  gap: src('Reaction Gap', 'Response pause', 'Moderate – treatment-derived skill',
    'Pause, notice your body, and choose whether to act now or later.',
    'Not acting immediately is an available choice.',
    'If immediate safety action is needed, do not delay seeking help.', REF.va),
  cloud: src('Cloud Witness', 'Decentring', 'Moderate – treatment-derived skill',
    'Watch the thought pass through the scene and let it return without tapping it.',
    'A thought can recur without needing to be pushed away.',
    'Stop if imagery causes distress or dissociation.', REF.act),
  order: src('Thought Is Not Order', 'Defusion', 'Moderate – treatment-derived skill',
    'Read the thought, then tag it "a thought" and choose whether to engage.',
    'Having a thought does not create an obligation to obey it.',
    'Do not invalidate realistic danger signs; show seek-help route.', REF.act),
  room: src('Room for This', 'Acceptance', 'Moderate – treatment-derived skill',
    'Make a little symbolic room around the feeling instead of trying to erase it.',
    'Allowing a feeling is not agreeing with the situation.',
    'Acceptance is not tolerating abuse or avoiding needed action.', REF.act),
  story: src('Story Label', 'Defusion', 'Moderate – treatment-derived skill',
    'Put “My mind is telling me…” in front of the thought, then watch it pass.',
    'Noticing a story is different from proving it true or false.',
    'Do not treat factual reports of abuse or risk as mere stories.', REF.act),
  control: src('Control Sort', 'Control focus', 'Guideline-backed – not app-specific',
    'Separate what you can influence today from what you cannot control.',
    'Control is limited; action can focus on the part you can influence.',
    'Do not imply responsibility for another person’s harmful behaviour.', REF.nhsSolve),
  name: src('Name the Feeling', 'Affect labelling', 'Promising – component evidence',
    'Choose a precise feeling word, then say or read: "This is [feeling]."',
    'Naming a feeling is different from judging or obeying it.',
    'No pressure to select an emotion if unsure; allow “unsure”.', REF.label),
  two: src('Two Things at Once', 'Mixed-affect labelling', 'Promising – adapted component',
    'Choose two emotions and place them side by side without ranking either.',
    'Two different feelings can both be present at the same time.',
    'Let users skip labels and avoid demanding emotional certainty.', REF.label),
  kind: src('Kind Voice', 'Self-compassion', 'Moderate – intervention family',
    'Choose one believable compassionate sentence and speak it to yourself gently.',
    'Kindness towards yourself does not require excuses or denial.',
    'No forced affirmations; allow neutral wording.', REF.compassion),
  friend: src('Friend Tone', 'Compassionate self-talk', 'Moderate – adapted component',
    'Choose the tone you would use with someone you care about and rehearse it.',
    'A kinder tone can coexist with accountability.',
    'Avoid minimising serious consequences.', REF.compassion),
  tunnel: src('One-Thing Tunnel', 'Single-task attention', 'Moderate – mechanism family',
    'Select one present-moment task and gently return whenever attention wanders.',
    'Returning attention is the practice, not a failure to concentrate.',
    'Do not impose rigid focus during acute distress.', REF.nccih),
  now: src('Here-and-Now Marker', 'Present orientation', 'Moderate – mechanism family',
    'Notice the date, location and one thing happening around you right now.',
    'Noticing now does not require erasing the past or future.',
    'If dissociated, use grounding or trusted-person support.', REF.nccih),
  rest: src('Permission to Rest', 'Acceptance and self-kindness', 'Moderate – treatment-derived skill',
    'Choose a realistic one-minute rest permission with no productivity task.',
    'Rest can be a valid response even if tasks remain.',
    'Persistent severe symptoms need appropriate support.', REF.act),
  worry: src('Worry Appointment', 'Worry postponement', 'Guideline-backed – not app-specific',
    'Choose a later time to revisit the worry, and return to the present task.',
    'Postponing a worry is not the same as denying it.',
    'Do not postpone urgent safety concerns or time-sensitive needs.', REF.nhsWorry),
  park: src('Mental Parking', 'Externalising concerns', 'Guideline-backed – adapted component',
    'Put the concern in a named parking spot and choose whether it needs an action.',
    'A reminder can hold information so attention does not have to.',
    'Local-only storage by default; allow delete; avoid storing sensitive data unnecessarily.', REF.nhsWorry),
};

const skill = (s) => Object.freeze({ ...s, steps: Object.freeze(s.steps), care: Object.freeze(s.care), related: Object.freeze(s.related), sources: Object.freeze(s.sources), inspiredBy: Object.freeze(s.inspiredBy), world: Object.freeze(s.world), evidence: Object.freeze(s.evidence), charm: Object.freeze({ ...s.charm, palette: Object.freeze(s.charm.palette) }) });

const LIST = [
  // ------------------------------------------------- pilot: Static Storm --
  skill({
    id: 'slowing-down',
    title: 'The Power of Slowing Down',
    short: 'Slowing Down',
    essence: 'Slowing one movement leaves a gap before you react.',
    explanation: 'When everything’s crackling, slowing one movement leaves a gap before you react. Many people find there’s room in that gap to choose: act now, act later, or let it go.',
    steps: [
      'Notice the rush: quick hands, quick words, quick thoughts.',
      'Slow one thing down on purpose: your hand, your step or your reply.',
      'Then choose whether to act now or later.',
    ],
    example: 'Try it: put the phone down for ten seconds before you reply.',
    found: 'In the storm, slow strokes grounded the crackle into gold light. You changed your pace, and the world responded.',
    world: { id: 'static-storm', title: 'Glitzi’s Static Storm' },
    mallow: 'glitzi',
    plan: 'paid',
    evidence: {
      scope: 'Moderate – mechanism family',
      plain: 'This draws on research into slower, calming activities in general, and on a pause skill taught in talking therapies. hushmallow itself hasn’t been studied.',
    },
    sources: [S.slow, S.gap],
    inspiredBy: ['Intentional slowing', 'Responding rather than reacting', 'Increasing the pause between thoughts'],
    care: [
      'Practise it somewhere safe: never while driving or walking in traffic.',
      'If something needs urgent action to keep someone safe, act or get help straight away. A pause is for choices that can wait.',
    ],
    related: ['a-little-more-room', 'one-quiet-point', 'kinder-voice'],
    charm: { family: 'crystal', motif: 'dawn', palette: { deep: '#140b42', body: '#4a33c4', light: '#a493ff', core: '#ffd98a', rim: '#a8f3ff' } },
  }),
  // ----------------------------------------------- pilot: Luminous Ocean --
  skill({
    id: 'a-little-more-room',
    title: 'A Little More Room',
    short: 'More Room',
    essence: 'A thought can be watched from a little further away.',
    explanation: 'Watching a thought from a little further away can make it feel less like an order. It doesn’t make the thought untrue, and it doesn’t have to disappear. If it drifts back, that’s normal.',
    steps: [
      'Notice the thought as words: “I’m having the thought that…”',
      'Give it a little distance, without pushing it away.',
      'If it comes back, notice it again. Nothing has gone wrong.',
    ],
    example: 'Try it: next time a thought keeps nagging, put “I’m having the thought that…” in front of it, then go back to what you were doing.',
    found: 'On the ocean, long slow strokes carried your thought towards the horizon. Still there. Still yours. Just more sea in between.',
    world: { id: 'luminous-ocean', title: 'Loomi’s Luminous Ocean' },
    mallow: 'loomi',
    plan: 'paid',
    evidence: {
      scope: 'Moderate – treatment-derived skill',
      plain: 'This draws on skills taught in acceptance-based talking therapies. hushmallow itself hasn’t been studied.',
    },
    sources: [S.cloud, S.order, S.room],
    inspiredBy: ['Observing the mind like a movie', 'Non-identification with passing thoughts', 'Empty space and stillness'],
    care: [
      'If pictures in your mind become upsetting, or you feel far away from yourself, stop and look around the room.',
      'If a thought is warning you about real danger, take it seriously and get help.',
      'Making room for a feeling never means putting up with harm.',
    ],
    related: ['slowing-down', 'worry-can-wait', 'another-angle'],
    charm: { family: 'ripple-stone', motif: 'drift', palette: { deep: '#032c44', body: '#1597bd', light: '#9eeeff', core: '#effdff', rim: '#d2fbff' } },
  }),
  // ---------------------------------------------- Beyond: Another Angle --
  skill({
    id: 'another-angle',
    title: 'Another Angle',
    short: 'Another Angle',
    essence: 'What happened and what it means are two different things.',
    explanation: 'A fact is what a camera would have caught. The meaning is what your mind adds. Pulling the two apart can leave room for other explanations, without pretending the hard part didn’t happen.',
    steps: [
      'Say what actually happened, as plainly as a camera would.',
      'Notice what you’re guessing it means.',
      'Ask: could there be another explanation? Is there one useful thing I could do?',
    ],
    example: 'Try it: when a message goes unanswered, say the fact (“no reply yet”), then think of two other reasons it might be quiet.',
    found: 'With Zuzu, you pulled what you know apart from what you guessed.',
    world: { id: 'another-angle', title: 'Another Angle' },
    mallow: 'zuzu',
    plan: 'ultra',
    practise: { route: 'angle' },
    evidence: {
      scope: 'Moderate – treatment-derived skill',
      plain: 'This draws on ways of looking at thoughts used in talking therapies such as CBT and ACT. hushmallow itself hasn’t been studied.',
    },
    sources: [S.story, S.control],
    inspiredBy: ['Self-inquiry', 'Responding rather than reacting'],
    care: [
      'If what happened was harmful or unsafe, it isn’t “just a story”. It deserves to be taken seriously.',
      'Looking for other explanations never makes you responsible for someone else’s harmful behaviour.',
    ],
    related: ['a-little-more-room', 'kinder-voice', 'slowing-down'],
    charm: { family: 'prism', motif: 'split', palette: { deep: '#260540', body: '#8a1fd1', light: '#e6a6ff', core: '#ffffff', rim: '#7ff6ff' } },
  }),
  // ------------------------------- for worlds still being made (planned) --
  // `found` stays null until the world that teaches it is built and played.
  skill({
    id: 'name-it',
    title: 'A Word for the Feeling',
    short: 'A Word for It',
    essence: 'Putting a feeling into words can make it easier to hold.',
    explanation: 'Finding a precise word for a feeling (“this is frustration”, “this is dread”) is different from judging it or obeying it. Many people find a named feeling a little easier to hold. Two feelings at once is allowed, and so is “unsure”.',
    steps: [
      'Pause and notice what’s here.',
      'Finish the sentence “This is…” with one exact word.',
      'If there are two, name both, side by side.',
    ],
    example: 'Try it: when something stings, say quietly “This is…” and finish it with one exact word. “Unsure” counts.',
    found: null,
    world: { id: 'raindrop-lagoon', title: 'Blubi’s Raindrop Lagoon' },
    mallow: 'blubi',
    plan: 'paid',
    evidence: {
      scope: 'Promising – component evidence',
      plain: 'Early research on putting feelings into words supports parts of this. hushmallow itself hasn’t been studied.',
    },
    sources: [S.name, S.two],
    inspiredBy: ['Mindfulness', 'Emotional expression'],
    care: [
      'There’s no right answer. If no word fits, “unsure” is fine.',
      'Skip it if naming the feeling makes things feel heavier right now.',
    ],
    related: ['kinder-voice', 'a-little-more-room', 'permission-to-rest'],
    charm: { family: 'lantern', motif: 'flame', palette: { deep: '#06195a', body: '#0b7fe0', light: '#9ad8ff', core: '#ffb874', rim: '#c8ecff' } },
  }),
  skill({
    id: 'kinder-voice',
    title: 'A Kinder Voice',
    short: 'A Kinder Voice',
    essence: 'Talk to yourself the way you’d talk to a friend.',
    explanation: 'When something goes wrong, the voice in your head can get harsh. Choosing the tone you’d use with someone you care about doesn’t excuse anything: kindness and accountability can sit together.',
    steps: [
      'Notice the tone you’re using with yourself.',
      'Picture a friend in your place. What would you say to them?',
      'Say one believable, kind sentence to yourself. Plain words are fine.',
    ],
    example: 'Try it: write the message you’d send a friend in your shoes, then read it as if it were for you.',
    found: null,
    world: { id: 'sunpop-orchard', title: 'Boppo’s Sunpop Orchard' },
    mallow: 'boppo',
    plan: 'paid',
    evidence: {
      scope: 'Moderate – intervention family',
      plain: 'This draws on research into self-compassion practices in general. hushmallow itself hasn’t been studied.',
    },
    sources: [S.kind, S.friend],
    inspiredBy: ['Self-compassion traditions', 'Mental digestion'],
    care: [
      'No forced affirmations: plain, neutral words work too.',
      'Being kind to yourself doesn’t mean pretending serious consequences aren’t serious.',
    ],
    related: ['name-it', 'another-angle', 'permission-to-rest'],
    charm: { family: 'shell', motif: 'pearl', palette: { deep: '#561701', body: '#f2700c', light: '#ffc27a', core: '#fff1c8', rim: '#ffe08a' } },
  }),
  skill({
    id: 'one-quiet-point',
    title: 'One Quiet Point',
    short: 'One Quiet Point',
    essence: 'Coming back is the practice, not a failure.',
    explanation: 'Rest your attention on one small thing. It will wander: everyone’s does. Each time you notice and come back, that’s the skill at work, not a mistake.',
    steps: [
      'Choose one small, neutral thing: a sound, a light, a texture.',
      'Stay with it for a little while, at your own pace.',
      'When your mind wanders, notice, and come back. As often as it takes.',
    ],
    example: 'Try it: while the kettle boils, watch the steam. When your mind wanders off, come back to it.',
    found: null,
    world: { id: 'silent-constellation', title: 'Pipzi’s Silent Constellation' },
    mallow: 'pipzi',
    plan: 'paid',
    evidence: {
      scope: 'Moderate – mechanism family',
      plain: 'This draws on research into attention and mind–body approaches in general. hushmallow itself hasn’t been studied.',
    },
    sources: [S.tunnel, S.now],
    inspiredBy: ['Yoga-inspired concentration', 'Attention to stillness'],
    care: [
      'Don’t force it in a hard moment: a looser, softer focus is fine.',
      'If you feel far away from yourself, look around and name where you are, or reach out to someone you trust.',
    ],
    related: ['slowing-down', 'permission-to-rest', 'a-little-more-room'],
    charm: { family: 'star-seed', motif: 'point', palette: { deep: '#36052c', body: '#cf1f66', light: '#ff9ccf', core: '#fff4d0', rim: '#ffcf4a' } },
  }),
  skill({
    id: 'permission-to-rest',
    title: 'Permission to Rest',
    short: 'Permission to Rest',
    essence: 'Rest can be a valid response, even with things left to do.',
    explanation: 'Sometimes the most useful thing is a short rest that doesn’t have to earn anything. Taking a minute isn’t giving up: the tasks will still be there, and so will you.',
    steps: [
      'Pick a realistic rest: one minute, with no task attached.',
      'Let it be enough, just for that minute.',
      'Then decide what comes next.',
    ],
    example: 'Try it: set a one-minute timer, put everything down and do nothing useful until it rings.',
    found: null,
    world: { id: 'moonmilk-cove', title: 'Noomi’s Moonmilk Cove' },
    mallow: 'noomi',
    plan: 'paid',
    evidence: {
      scope: 'Moderate – treatment-derived skill',
      plain: 'This draws on acceptance and self-kindness skills from talking therapies. hushmallow itself hasn’t been studied.',
    },
    sources: [S.rest],
    inspiredBy: ['Mental holiday', 'Empty space and stillness'],
    care: [
      'If tiredness or low mood stays with you for weeks, talk to a doctor or someone you trust.',
    ],
    related: ['one-quiet-point', 'kinder-voice', 'worry-can-wait'],
    charm: { family: 'moon-pearl', motif: 'crescent', palette: { deep: '#141c56', body: '#7d93d6', light: '#dfe8ff', core: '#ffdf8f', rim: '#ffe9a8' } },
  }),
  skill({
    id: 'worry-can-wait',
    title: 'Worry Can Wait',
    short: 'Worry Can Wait',
    essence: 'Setting a worry aside for later isn’t the same as ignoring it.',
    explanation: 'Some worries need action and some just need a time and a place. Parking one for later, with a note of when you’ll come back to it, means you don’t have to carry it every minute.',
    steps: [
      'Write the worry down, or picture setting it somewhere safe.',
      'Choose a later time to come back to it.',
      'Return to what you were doing. When the time comes, ask: does this need an action?',
    ],
    example: 'Try it: jot the worry in your notes with a time, “look at this at 6pm”, then carry on with your afternoon.',
    found: null,
    world: { id: 'thought-aquarium', title: 'Zuzu’s Thought Aquarium' },
    mallow: 'zuzu',
    plan: 'paid',
    evidence: {
      scope: 'Guideline-backed – not app-specific',
      plain: 'Putting worries aside until a set time appears in NHS self-help guidance. That guidance isn’t about hushmallow, which hasn’t been studied.',
    },
    sources: [S.worry, S.park],
    inspiredBy: ['Mental digestion', 'Unclutching'],
    care: [
      'Never put off something urgent: if someone’s safety is at stake, act now.',
      'If you write a worry down, keep it somewhere private, and delete it whenever you like.',
    ],
    related: ['a-little-more-room', 'permission-to-rest', 'another-angle'],
    charm: { family: 'seed', motif: 'sprout', palette: { deep: '#1c0a3c', body: '#6a3fc8', light: '#c9b2ff', core: '#9effd0', rim: '#8ff7c6' } },
  }),
];

/** Every skill by id. */
export const SKILLS = Object.freeze(Object.fromEntries(LIST.map((s) => [s.id, s])));
export const SKILL_IDS = Object.freeze(LIST.map((s) => s.id));

export function getSkill(id) { return (typeof id === 'string' && Object.hasOwn(SKILLS, id)) ? SKILLS[id] : null; }
export function skillTitle(id) { return getSkill(id)?.title || null; }
/** The related tools, as skill entries (unknown ids dropped). */
export function relatedSkills(id) { return (getSkill(id)?.related || []).map(getSkill).filter(Boolean); }
/** The skills a world teaches. */
export function skillsForWorld(worldId) { return LIST.filter((s) => s.world.id === worldId); }

const BANNED = /\b(cure[sd]?|curing|treat(s|ed|ment)?|heal(s|ed|ing)?|relief|guarantee[sd]?|rewir\w*|fix(es)? (your|you)|AI)\b/;
/** Problems with one entry (empty when it's fine). Used by the tests. */
export function validateSkill(s) {
  const p = [];
  const need = ['id', 'title', 'essence', 'explanation', 'example', 'world', 'mallow', 'plan', 'evidence', 'sources', 'care', 'related', 'charm', 'steps'];
  for (const k of need) if (s?.[k] == null) p.push(`missing ${k}`);
  if (p.length) return p;
  if (!/^[a-z][a-z0-9-]{1,47}$/.test(s.id)) p.push('bad id');
  if (!s.example.startsWith('Try it: ')) p.push('example must start with "Try it: "');
  if (s.essence.length > 80) p.push('essence longer than one line');
  if (!CHARM_FAMILIES.includes(s.charm.family)) p.push(`unknown charm family ${s.charm.family}`);
  if (!s.sources.length) p.push('no sources');
  if (!s.evidence.scope || !/hushmallow itself hasn’t been studied|isn’t about hushmallow/.test(s.evidence.plain)) p.push('evidence note must say hushmallow itself hasn’t been studied');
  const shown = [s.title, s.essence, s.explanation, s.example, s.found || '', ...s.steps, ...s.care, s.evidence.plain].join(' ');
  if (BANNED.test(shown)) p.push(`banned wording: ${shown.match(BANNED)[0]}`);
  if ((shown.match(/hushmallow/gi) || []).some((m) => m !== 'hushmallow')) p.push('brand must be lowercase');
  if (/https?:\/\//.test(JSON.stringify(s))) p.push('no URLs in shipped data');
  for (const k of ['deep', 'body', 'light', 'core', 'rim']) if (!/^#[0-9a-f]{6}$/i.test(s.charm.palette?.[k] || '')) p.push(`charm palette ${k}`);
  return p;
}
