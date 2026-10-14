// Screening for feelings and perspectives. Deterministic rules only: the
// app's own safety lexicon (src/ultra/reframe-engine.js checkSafety, shared
// with Reframe and the Another Angle server), the contact/link/money rules,
// and a few patterns for identifying details, unkindness and diagnosis.
// Rules are a floor, not a guarantee: reports and human moderators are the
// safety layer, and the interface says so.

import { checkSafety } from '../../src/ultra/reframe-engine.js';
import { HARM_COPY } from '../../src/ultra/frameworks.js';
import { checkMessage, normaliseText, charCount } from './text-policy.js';

// Every rule reads a compatibility-normalised copy (NFKC), so full-width or
// stylised letters and digits ("ｅｎｄ ｉｔ", "０７７００") can't slip past;
// the person's own words are stored as they wrote them.
const probeOf = (text) => text.normalize('NFKC');

// Hushmates' own additions to the app's safety lexicon, kept here so the main
// app's Reframe engine is reused unchanged. Words that mean someone may be in
// danger right now: never released to strangers, never sent to an AI provider.
const EXTRA_CRISIS = [
  /\b(?:took|taken|swallowed|necked)\b[^.!?]{0,30}\b(?:pills|tablets|paracetamol|ibuprofen|painkillers|sleeping pills|an overdose)\b/i,
  /\boverdos(?:e|ed|ing)\b/i,
  /\bno point (?:in )?(?:going on|living|carrying on|being here|being alive)\b/i,
  /\b(?:cut|cutting|burn|burning|hurt|hurting|harm|harming)\s+(?:my\s*self|myself|my (?:arms?|wrists?|legs?|thighs?|skin))\b/i,
  /\b(?:don'?t|do not) want to (?:be here|wake up|exist|be alive) any ?more\b/i,
];
function extraCrisis(probe) {
  if (!EXTRA_CRISIS.some((re) => re.test(probe.replace(/[’‘]/g, "'")))) return null;
  return { reframeAppropriate: false, level: 'crisis', title: HARM_COPY.crisis.title, message: HARM_COPY.crisis.message, resources: HARM_COPY.crisis.resources, stillHere: HARM_COPY.stillHere };
}
const safetyOf = (probe) => { const s = checkSafety(probe); return s.reframeAppropriate ? (extraCrisis(probe) || s) : s; };

// Hushmates' own words for the support screen. The lexicon and the resource lists are the app's
// (Reframe's, reused unchanged); its titles and messages talk about reframing, so they're replaced
// here, and each category gets resources that fit it. To be reviewed per region by a safety lead.
const [EMERGENCY] = HARM_COPY.crisis.resources;
const ELSEWHERE = HARM_COPY.crisis.resources[HARM_COPY.crisis.resources.length - 1];
const LISTENING = HARM_COPY.crisis.resources.find((r) => /samaritans/i.test(r.label));
const GENERAL = [EMERGENCY, LISTENING, ELSEWHERE].filter(Boolean);
const NOT_SENT = 'It won’t be sent out for other perspectives.';
const CARE = {
  abuse: { message: `What you’re describing sounds like it could be abuse. ${NOT_SENT} It’s not your fault, and you don’t deserve it. If you can, tell someone you trust or contact a support service, at your own pace.`, resources: HARM_COPY.careResources },
  violence: { message: `Nobody has the right to hurt you. This is something that happened to you, and it matters. ${NOT_SENT} If you can, tell someone you trust, and reach out to a support service or the police when you feel ready.`, resources: HARM_COPY.careResources },
  threat: { message: `Being threatened is serious, and it isn’t something to talk yourself out of. ${NOT_SENT} Keep any messages or notes, tell someone you trust, and contact the police or a support service if you feel at risk.`, resources: GENERAL },
  harassment: { message: `Being harassed or bullied isn’t something to see differently, and it isn’t on you to fix. ${NOT_SENT} If you can, save screenshots or notes, tell someone you trust, and use the reporting routes at school, at work or on the app or site.`, resources: GENERAL },
  discrimination: { message: `Being treated unfairly because of who you are is real, and it isn’t something to explain away. Your reaction makes sense. ${NOT_SENT} If you want to, keep a record of what happened and talk to someone you trust, HR, a union or an advice organisation.`, resources: GENERAL },
  unsafe: { title: 'Your safety comes first', message: `Not feeling safe is important information. Please trust it. ${NOT_SENT} If you can, talk to someone you trust or a support service about what’s going on.`, resources: GENERAL },
};
function supportOf(safety) {
  if (safety.level === 'crisis' && safety.category === 'someone-in-danger') {
    return { title: safety.title, message: safety.message, resources: safety.resources, stillHere: safety.stillHere };
  }
  if (safety.level === 'crisis') {
    return {
      title: 'Let’s pause here',
      message: 'What you’ve written sounds really painful, and it matters. It won’t be sent to anyone: you deserve real support with this, right now. If you might act on these thoughts, or you’re not safe, please call your local emergency number. If you can, tell someone near you how you’re feeling. You don’t need the right words first.',
      resources: HARM_COPY.crisis.resources, stillHere: HARM_COPY.stillHere,
    };
  }
  const c = CARE[safety.category] || CARE.unsafe;
  return { title: c.title || 'This one deserves real support', message: c.message, resources: c.resources, stillHere: HARM_COPY.stillHere };
}

/** Our own reviewed support copy, for when a Mallow provider's safety check flags a feeling (its own text is never shown). */
export const providerSupport = () => supportOf({ level: 'crisis' });

const IDENTIFYING = [
  /\b\d{1,5}\s+[A-Za-z][A-Za-z ]{1,30}\s(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|close|way|crescent|place|court)\b/i,   // street address
  /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i,                                   // UK postcode (any case)
  /\b\d{5}(?:-\d{4})?\b(?=.*\b(?:zip|postcode|post code)\b)/i,                 // "90210 is my zip"
  /\b(?:zip|post\s?code)(?:\s+code)?\b[^\d\n]{0,12}\d{5}(?:-\d{4})?\b/i,          // "my zip code is 90210"
  /\b(?:my|our)\s+(?:full\s+|real\s+)?name(?:\s+is|\s*['’]s)\b/i,                // "my name is", "my name’s"
];

const UNKIND = [
  /\b(?:you(?:'re| are)?|ur|u r)\s+(?:(?:so|being|just|really|very|kind of|a bit)\s+){0,3}(?:stupid|pathetic|worthless|an? idiot|a loser|weak|dramatic|overreacting|crazy|insane|selfish|ridiculous|a baby|attention[- ]seeking)\b/i,
  /\b(?:get over it|grow up|man up|toughen up|stop whining|stop being (?:so )?(?:dramatic|sensitive))\b/i,
  /\b(?:kill yourself|kys)\b/i,
  /\bnobody (?:cares|likes you)\b/i,
];

const DIAGNOSIS = [
  /\b(?:you|they|he|she|your friend|your boss)\b[^.!?]{0,24}?\b(?:have|has|got|is|are|be|being|'re|'s|suffer(?:s|ing)? from)\s+(?:an?\s+|some\s+)?(?:clinical\s+)?(?:depression|depressed|anxiety disorder|an anxiety disorder|adhd|bpd|borderline|ptsd|ocd|bipolar|autis\w*|narcissis\w*|narcissist|psychopath|sociopath|a personality disorder)\b/i,
  /\bsounds like (?:depression|anxiety|adhd|bpd|ptsd|ocd|bipolar|narcissis\w*)\b/i,
];

const CERTAINTY = /\b(?:definitely|obviously|clearly|for sure|certainly|100%|without a doubt)\b/i;

const words = (s) => normaliseText(s).toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, ' ').split(/\s+/).filter((w) => w.length > 2);
export function similarity(a, b) {
  const A = new Set(words(a)); const B = new Set(words(b));
  if (!A.size || !B.size) return 0;
  let both = 0;
  for (const w of A) if (B.has(w)) both++;
  return both / (A.size + B.size - both);
}

const fail = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });

/**
 * A feeling about to be released.
 * → { ok: true, text } | { ok: false, code, message } | { ok: false, code: 'support', level, support }
 */
export function screenFeeling(input, { minChars = 3, maxChars = 500 } = {}) {
  const text = normaliseText(input);
  if (!text) return fail('empty', 'Write a thought or a feeling first.');
  if (charCount(text) < minChars) return fail('too-short', 'Tell us a little more, even a few words.');
  if (charCount(text) > maxChars) return fail('too-long', `Feelings can be up to ${maxChars} characters. Try the heart of it.`);
  const probe = probeOf(text);
  const safety = safetyOf(probe);
  if (!safety.reframeAppropriate) {
    // never released to strangers and never sent to an AI provider
    const support = supportOf(safety);
    return fail('support', support.message, { level: safety.level, support });
  }
  // (the length was checked on the words as written: the probe can be longer, e.g. "…" becomes "...")
  const rules = checkMessage(probe, { maxChars: Infinity });
  if (!rules.ok) {
    const msg = rules.code === 'money' ? rules.message
      : 'Please leave out contact details, links and anything that could identify you or someone else. Other people will read this.';
    return fail(rules.code, msg);
  }
  if (IDENTIFYING.some((re) => re.test(probe))) {
    return fail('identifying', 'Please leave out names, addresses and anything that could identify you or someone else.');
  }
  return { ok: true, text };
}

/**
 * A perspective someone offers. `earlier` are the perspectives already given.
 * → { ok: true, text, nudges[] } | { ok: false, code, message } | { ok: false, code: 'support', level, support }
 * Words suggesting the writer (or someone) may not be safe are answered with support for the writer,
 * and never passed on. nudges (non-blocking, for the interface): 'certainty'
 */
export function screenReframe(input, { minChars = 8, maxChars = 280, earlier = [], threshold = 0.8 } = {}) {
  const text = normaliseText(input);
  if (!text) return fail('empty', 'Write a possibility first.');
  if (charCount(text) < minChars) return fail('too-short', 'Add a few more words so it can help.');
  if (charCount(text) > maxChars) return fail('too-long', `Perspectives can be up to ${maxChars} characters. Short and kind works best.`);
  const probe = probeOf(text);
  const safety = safetyOf(probe);
  if (!safety.reframeAppropriate && safety.level === 'crisis') {
    const support = supportOf(safety);
    return fail('support', support.message, { level: safety.level, support });
  }
  if (!safety.reframeAppropriate) {
    return fail('unsafe', 'This one can’t be passed on: it touches on something that needs real support rather than a new angle. If you or someone else is in danger, please contact local emergency services.');
  }
  if (UNKIND.some((re) => re.test(probe))) return fail('unkind', 'That might land as harsh. Offer a possibility, not a verdict.');
  if (DIAGNOSIS.some((re) => re.test(probe))) return fail('diagnosis', 'Please don’t diagnose anyone. Offer another way of seeing it instead.');
  const rules = checkMessage(probe, { maxChars: Infinity });
  if (!rules.ok) return fail(rules.code, rules.code === 'money' ? rules.message : 'Perspectives can’t include contact details, links or usernames.');
  if (IDENTIFYING.some((re) => re.test(probe))) return fail('identifying', 'Please leave out names, addresses and anything that could identify you or someone else.');
  if (earlier.some((e) => similarity(e, text) >= threshold)) {
    return fail('too-similar', 'Someone has already offered something very close to this. Could you see it another way?');
  }
  return { ok: true, text, nudges: CERTAINTY.test(probe) ? ['certainty'] : [] };
}
