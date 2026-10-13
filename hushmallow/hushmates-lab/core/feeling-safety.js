// Screening for feelings and perspectives. Deterministic rules only: the
// app's own safety lexicon (src/ultra/reframe-engine.js checkSafety, shared
// with Reframe and the Another Angle server), the contact/link/money rules,
// and a few patterns for identifying details, unkindness and diagnosis.
// Rules are a floor, not a guarantee: reports and human moderators are the
// safety layer, and the interface says so.

import { checkSafety } from '../../src/ultra/reframe-engine.js';
import { checkMessage, normaliseText, charCount } from './text-policy.js';

const IDENTIFYING = [
  /\b\d{1,5}\s+[A-Za-z][A-Za-z ]{1,30}\s(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|close|way|crescent|place|court)\b/i,   // street address
  /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/,                                    // UK postcode
  /\b\d{5}(?:-\d{4})?\b(?=.*\b(?:zip|postcode|post code)\b)/i,                 // US ZIP when called one
  /\b(?:my|our)\s+(?:full\s+)?name\s+is\b/i,
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
  const safety = checkSafety(text);
  if (!safety.reframeAppropriate) {
    // never released to strangers and never sent to an AI provider
    return fail('support', safety.message || 'This sounds really heavy.', {
      level: safety.level,
      support: { title: safety.title, message: safety.message, resources: safety.resources, stillHere: safety.stillHere },
    });
  }
  const rules = checkMessage(text, { maxChars });
  if (!rules.ok) {
    const msg = rules.code === 'money' ? rules.message
      : 'Please leave out contact details, links and anything that could identify you or someone else. Other people will read this.';
    return fail(rules.code, msg);
  }
  if (IDENTIFYING.some((re) => re.test(text))) {
    return fail('identifying', 'Please leave out names, addresses and anything that could identify you or someone else.');
  }
  return { ok: true, text };
}

/**
 * A perspective someone offers. `earlier` are the perspectives already given.
 * → { ok: true, text, nudges[] } | { ok: false, code, message }
 * nudges (non-blocking, for the interface): 'certainty'
 */
export function screenReframe(input, { minChars = 8, maxChars = 280, earlier = [], threshold = 0.8 } = {}) {
  const text = normaliseText(input);
  if (!text) return fail('empty', 'Write a possibility first.');
  if (charCount(text) < minChars) return fail('too-short', 'Add a few more words so it can help.');
  if (charCount(text) > maxChars) return fail('too-long', `Perspectives can be up to ${maxChars} characters. Short and kind works best.`);
  if (!checkSafety(text).reframeAppropriate) {
    return fail('unsafe', 'This perspective can’t be passed on. If someone is in danger, please contact local emergency services.');
  }
  if (UNKIND.some((re) => re.test(text))) return fail('unkind', 'That might land as harsh. Offer a possibility, not a verdict.');
  if (DIAGNOSIS.some((re) => re.test(text))) return fail('diagnosis', 'Please don’t diagnose anyone. Offer another way of seeing it instead.');
  const rules = checkMessage(text, { maxChars });
  if (!rules.ok) return fail(rules.code, rules.code === 'money' ? rules.message : 'Perspectives can’t include contact details, links or usernames.');
  if (earlier.some((e) => similarity(e, text) >= threshold)) {
    return fail('too-similar', 'Someone has already offered something very close to this. Could you see it another way?');
  }
  return { ok: true, text, nudges: CERTAINTY.test(text) ? ['certainty'] : [] };
}
