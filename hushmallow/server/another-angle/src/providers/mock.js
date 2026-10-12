// Mock provider: no network, no cost. Two modes.
//
//   scripted  — tests pass a queue of replies (objects, functions or
//               { fail: reason }) and inspect `calls` afterwards.
//   heuristic — local development: a small deterministic stand-in that reads
//               the <thought_text> block and returns a schema-valid scene in
//               the right shape. Its lines are authored placeholders, not the
//               real model's reasoning; never use it to judge quality.

import { PATTERN_INTERACTION, PATTERN_MALLOWS } from '../vocab.js';

/** @typedef {import('./anthropic.js').Provider} Provider */
/** @typedef {import('./anthropic.js').GenerateArgs} GenerateArgs */

const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** Pull the person's text and previous patterns back out of a user message. */
export function parseUserMessage(user) {
  const text = unescape((/<thought_text>\n([\s\S]*?)\n<\/thought_text>/.exec(user) || [])[1] || '');
  const previous = [...user.matchAll(/<angle n="\d+"(?: pattern="([a-z_]+)")?>/g)].map((m) => m[1] || null);
  const rejected = /<rejected_draft>/.test(user) || /<gate_feedback>/.test(user);
  const feeling = (/<chosen_feeling>([^<]*)<\/chosen_feeling>/.exec(user) || [])[1] || 'not chosen';
  return { text, previous, rejected, feeling };
}

const DETECT = /** @type {[keyof typeof PATTERN_INTERACTION, RegExp][]} */ ([
  ['rumination', /\b(?:replay\w*|keep (?:thinking|going over)|can'?t stop thinking|over and over|going round)\b/i],
  ['valid_anger', /\b(?:unfair|furious|rude|disrespect\w*|took (?:the )?credit|shouted|yelled|humiliat\w*|again and again|cancell?ed on me)\b/i],
  ['catastrophising', /\b(?:going to (?:get )?(?:fired|sacked|dumped|fail)|ruin\w*|disaster|never recover|what if|everyone will)\b/i],
  ['self_criticism', /\b(?:useless|stupid|a failure|idiot|pathetic|rubbish|not good enough|hate myself|so dumb)\b/i],
  ['personalisation', /\b(?:my fault|because of me|blame myself|i made (?:them|her|him))\b/i],
  ['mind_reading', /\b(?:thinks? i'?m|hates? me|doesn'?t like me|annoyed with me|judging me|must think)\b/i],
  ['overgeneralisation', /\b(?:always|never|everyone|nobody|no one|every time)\b/i],
  ['all_or_nothing', /\b(?:completely|totally|ruined everything|perfect|waste of)\b/i],
  ['practical_problem', /\b(?:promot\w*|deadline|interview|rent|bill|overdraft|feedback|appraisal)\b/i],
  ['fact_vs_assumption', /\b(?:repl\w*|text\w*|message\w*|seen|read|ignor\w*|ghost\w*)\b/i],
]);

const ORDER = /** @type {(keyof typeof PATTERN_INTERACTION)[]} */ (Object.keys(PATTERN_INTERACTION));

const NOUNS = ['message', 'boss', 'manager', 'exam', 'colleague', 'friend', 'partner', 'meeting', 'mum', 'dad', 'interview', 'presentation', 'promotion', 'party', 'team', 'job', 'teacher', 'sister', 'brother', 'date', 'feedback', 'deadline', 'email', 'call', 'test', 'mistake', 'comment', 'group', 'chat', 'class'];

function salient(text) {
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  for (const n of NOUNS) if (words.includes(n)) return n;
  const long = words.filter((w) => w.length >= 5 && !['about', 'there', 'their', 'think', 'thing', 'really', 'because', 'everyone', 'nobody', 'always', 'never', 'something'].includes(w));
  return long[0] || 'situation';
}

/** Authored placeholder lines per pattern ({x} = a word from the person's text). */
const LINES = {
  fact_vs_assumption: ['The {x} is the part that actually happened.', 'What it means is still a question, not an answer.'],
  catastrophising: ['Right now the {x} is one moment, not the whole ending.', 'What would you do first if the worst part really happened?'],
  personalisation: ['The {x} had more moving parts than just you.', 'Which piece of it was genuinely yours to carry?'],
  all_or_nothing: ['The {x} probably sits somewhere between perfect and ruined.', 'Where on that line would a fair observer put it?'],
  mind_reading: ['You know what happened with the {x}, not what anyone was thinking.', 'What are three different things it could mean?'],
  overgeneralisation: ['This {x} is one event, even if it feels like a pattern.', 'Can you name one time it went differently?'],
  rumination: ['Going over the {x} again is not the same as fixing it.', 'Is there one useful thing left to do, or can it rest for now?'],
  practical_problem: ['The {x} is a real problem with real next steps.', 'What is the smallest step you could take on it this week?'],
  self_criticism: ['The {x} tells you about one moment, not your whole worth.', 'What would you say to a friend who had the same day?'],
  valid_anger: ['Being annoyed about the {x} makes sense.', 'What would you want to say or ask for, if you chose to respond?'],
};

const STEPS = {
  fact_vs_assumption: 'Write down what you know for sure, and leave the rest as a question.',
  catastrophising: 'Pick one thing you would do first if it went badly, then pause.',
  personalisation: 'List who else had a part in this, including circumstances.',
  all_or_nothing: 'Name one part of it that went better than you expected.',
  mind_reading: 'If it matters, ask one calm, open question instead of guessing.',
  overgeneralisation: 'Note one recent time things went differently.',
  rumination: 'Decide whether anything is left to do, then let the replay run without you.',
  practical_problem: 'Choose one small action for this week and put it in your diary.',
  self_criticism: 'Write one thing this taught you that you can use next time.',
  valid_anger: 'Decide whether you want to raise it, and with whom.',
};

/**
 * A deterministic stand-in scene for the given user message.
 * @param {string} user
 */
export function heuristicScene(user) {
  const { text, previous } = parseUserMessage(user);
  let pattern = DETECT.find(([, re]) => re.test(text))?.[0] || 'fact_vs_assumption';
  // "Another angle": move to the next pattern not already shown.
  for (let i = 0; previous.includes(pattern) && i < ORDER.length; i++) pattern = ORDER[(ORDER.indexOf(pattern) + 1) % ORDER.length];
  const x = salient(text);
  const [l1, l2] = LINES[pattern].map((s) => s.replace('{x}', x));
  const emotion = pattern === 'valid_anger' ? 'frustration' : pattern === 'rumination' ? 'overthinking' : pattern === 'self_criticism' ? 'shame' : 'worry';
  return {
    emotion,
    situation_type: 'other',
    reasoning_pattern: pattern,
    known_fact: `Something happened with the ${x}.`,
    possible_assumption: pattern === 'valid_anger' || pattern === 'practical_problem' ? '' : 'You might be filling in the gaps with the worst version.',
    alternative_angle: 'There may be more than one way to read this, including yours.',
    practical_next_step: STEPS[pattern],
    interaction_type: PATTERN_INTERACTION[pattern],
    mallow_character: PATTERN_MALLOWS[pattern][0],
    subtitle_line_1: l1,
    subtitle_line_2: l2,
    safety_status: 'ok',
  };
}

/**
 * @param {{ mode?: 'scripted' | 'heuristic', script?: any[], model?: string, latencyMs?: number }} [opts]
 * @returns {Provider & { calls: GenerateArgs[] }}
 */
export function createMockProvider(opts = {}) {
  const mode = opts.mode || (opts.script ? 'scripted' : 'heuristic');
  const queue = [...(opts.script || [])];
  const model = opts.model || 'claude-opus-5-5';
  /** @type {GenerateArgs[]} */
  const calls = [];
  const usage = () => [{ model, input: 180, output: 420, cacheWrite: 0, cacheRead: 3400 }];
  return {
    name: 'mock',
    model,
    calls,
    async generate(args) {
      calls.push(args);
      if (opts.latencyMs) {
        await new Promise((resolve, reject) => {
          const t = setTimeout(resolve, opts.latencyMs);
          args.signal?.addEventListener('abort', () => { clearTimeout(t); reject(new Error('aborted')); }, { once: true });
        }).catch(() => null);
        if (args.signal?.aborted) return { ok: false, reason: 'timeout', usage: [], ms: opts.latencyMs };
      }
      if (mode === 'heuristic') return { ok: true, json: heuristicScene(args.user), usage: usage(), model, fallbackModel: null, ms: 1 };
      const next = queue.length ? queue.shift() : null;
      if (next == null) return { ok: false, reason: 'error', usage: [], ms: 1 };
      const value = typeof next === 'function' ? next(args) : next;
      if (value && typeof value === 'object' && 'fail' in value) return { ok: false, reason: value.fail, usage: value.usage || usage(), category: value.category ?? null, ms: 1 };
      return { ok: true, json: value, usage: usage(), model: value?.__model || model, fallbackModel: null, ms: 1 };
    },
  };
}
