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
// Phones type curly quotes (you’re), the rules are written with straight ones (you're): the
// probe reads them straight, so "You’re so pathetic" is caught like "You're so pathetic".
const probeOf = (text) => text.normalize('NFKC').replace(/[‘’ʼ′]/g, "'").replace(/[“”″]/g, '"');

// Hushmates' own additions to the app's safety lexicon, kept here so the main
// app's Reframe engine is reused unchanged. Words that mean someone may be in
// danger right now: never released to strangers, never sent to an AI provider.
const EXTRA_CRISIS = [
  /\b(?:took|taken|swallowed|necked)\b[^.!?]{0,30}\b(?:pills|tablets|paracetamol|ibuprofen|painkillers|sleeping pills|an overdose)\b/i,
  /\boverdos(?:e|ed|ing)\b/i,
  /\bno point (?:in )?(?:going on|living|carrying on|being here|being alive)\b/i,
  /\b(?:cut|cutting|burn|burning|hurt|hurting|harm|harming)\s+(?:my\s*self|myself|my (?:arms?|wrists?|legs?|thighs?|skin))\b/i,
  /\b(?:don'?t|do not) want to (?:be here|wake up|exist|be alive) any ?more\b/i,
  /\b(?:don'?t|do not|no longer) (?:want to|wanna) (?:be here|be alive|live|exist|wake up|go on|be around)\b/i,
  /\bwanna (?:just )?die\b(?! (?:of|from|for|laughing))/i,
  // Passive wishes not to be here, said many ways (the Columbia scale's first question among them), with
  // everyday getaways, other people and alarms left out. All of it is for the clinical review
  // (docs/READINESS.md), with the phrasings in tests/fixtures/mallow-probes.json.
  /(?<!\b(?:kids|children|teenagers|teens|flatmates|housemates|roommates|husband|wife|partner|family|everyone|cats?|dogs?)(?: (?:all|just|always|really|both|often|usually))? )(?<!(?:don'?t|do not|never) )\b(?:want(?:ed)?|wanna|wish(?:ing)? (?:i|that i) (?:could|would)|(?:i'?d|would) rather)(?: to)?(?: just)? (?:disappear|vanish|fade away|not exist|stop existing|cease to exist|not be (?:here|around) any ?more|not be alive)\b(?! (?:to|on|into|off|from|under) (?:a |an |the |my |this |that )?(?:good )?(?:beach|holidays?|vacation|trip|island|bali|countryside|mountains|books?|(?:video )?games?|series|shows?|films?|duvet|studio|social media|instagram|tiktok|grid|(?:family )?group chat|job|work)\b(?![^.!?]*\b(?:forever|for good|never|not come back)\b)| for (?:a|the|one|a few|a couple of) (?:days?|weekend|weeks?|months?|bit)\b(?![^.!?]*\b(?:forever|for good|never|not come back)\b))/i,
  /\bwish(?:ing)? (?:that )?i (?:didn'?t|did not|never) exist(?:ed)?\b|\bwish(?:ing)? (?:that )?i(?:'d| had| was| were)? never (?:been )?born\b|\b(?:wish (?:that )?i (?:was|were)|(?:want|wanna)(?: to)?(?: just)? be) gone(?=\s*(?:[.!?,;]|$|forever|for good|any ?more))|\bfeel(?:s|ing)? like (?:just )?(?:disappearing|vanishing|fading away)\b(?!\s+(?:to|for|on|into|from)\b)/i,
  /(?<!(?:don'?t|do not|never) )\b(?:want(?:ed)?|wanna|wish(?:ing)? (?:i|that i) (?:could|would)|(?:would|'d) rather|(?:would|'d) (?:love|like) to)(?: to)?(?: just)? (?:sleep|go to sleep|fall asleep)\b[^.!?]{0,20}\b(?:never|not|and (?:just )?(?:don'?t|won'?t|wouldn'?t)) (?:ever )?wake up\b(?! (?:early|before|until|till|til\b|at\b(?! all\b)|in time|on time|for (?:once|work|school|ages|hours|\d)|all (?:day|night|weekend|morning)|(?:to|when) (?:an? |the |my |our |his |her )?(?:alarms?|baby|babies|kids?|children|dog|noise|drill|neighbou?r|emails?|phone|crying)))/i,
  /\b(?:sleep|go to sleep|fall asleep|go to bed)\b[^.!?]{0,20}\b(?:hop(?:e|ing)|wish(?:ing)?|pray(?:ing)?) (?:that )?i (?:never|won'?t|don'?t|do not|will not|wouldn'?t) (?:ever )?wake up\b(?! (?:early|before|until|till|til\b|at\b(?! all\b)|in time|on time|for (?:once|work|school|ages|hours|\d)|all (?:day|night|weekend|morning)|(?:to|when) (?:an? |the |my |our |his |her )?(?:alarms?|baby|babies|kids?|children|dog|noise|drill|neighbou?r|emails?|phone|crying)))/i,
  /(?<!(?:don'?t|do not|never) )\b(?:want(?:ed)?|wanna|wish(?:ing)? (?:i|that i) could|(?:i'?d|would) rather)(?: to)? (?:just )?(?:never|not) wake up\b(?! (?:early|before|until|till|til\b|at\b(?! all\b)|in time|on time|for (?:once|work|school|ages|hours|\d)|all (?:day|night|weekend|morning)|(?:to|when) (?:an? |the |my |our |his |her )?(?:alarms?|baby|babies|kids?|children|dog|noise|drill|neighbou?r|emails?|phone|crying)))/i,
  /\b(?:hop(?:e|ing)|pray(?:ing)?|wish(?:ing)?) (?:that )?i (?:just )?(?:go to sleep|fall asleep|sleep|go to bed)\b[^.!?]{0,20}\b(?:never|not|don'?t|won'?t|wouldn'?t|do not|will not) (?:ever )?wake up\b(?! (?:early|before|until|till|til\b|at\b(?! all\b)|in time|on time|for (?:once|work|school|ages|hours|\d)|all (?:day|night|weekend|morning)|(?:to|when) (?:an? |the |my |our |his |her )?(?:alarms?|baby|babies|kids?|children|dog|noise|drill|neighbou?r|emails?|phone|crying)))/i,
  /\b(?:wouldn'?t|would not) mind if i (?:didn'?t|did not|never) wake up\b/i,
  /\bwish i (?:didn'?t|did not) have to wake up\b(?! (?:early|so early|at|for|before|on)\b)/i,
  /\b(?:want(?:ed)? to|wanna|wish i could|(?:i'?d|would) rather) (?:just )?sleep forever\b/i,
  /\bwish(?:ed|es|ing)? (?:that )?i (?:was|were|could be) dead\b/i,
  /\bwish(?:ed|es|ing)? (?:that )?i(?: would|'?d| could) (?:just )?die\b/i,
  /\b(?:i'?d|i would) (?:rather|sooner) (?:be dead|die)\b(?! (?:than|before|instead|of))/i,
  /(?<!(?:don'?t|do not|never) )\b(?:want(?:ed)?|wish) (?:my life|it all) to (?:just )?(?:end|be over)\b(?! (?:well|soon|happily|nicely|on|with|so|in|at|before|for)\b)/i,
  /\bwish (?:it all|my life|it would all)(?: would)?(?: just)? (?:end|be over|stop)\b/i,
  /\b(?:want|wanna|wish i could|ready) to (?:just )?stop living\b(?! (?:in|with|for|like|at|on|under|off|out|paycheck|a|my|the|this|that|so|as)\b)/i,
  /\btired of (?:being alive|living|existing|life)\b(?! (?:in|with|at|on|under|like|for|around|off|out|paycheck|admin|here|there|so|as|a|my|the|our|this|that|from|to)\b)/i,
  /\bwhat(?:'?s| is) the (?:point|use) (?:of|in) (?:living|going on|being alive|being here|carrying on|life)\b(?! (?:about|with|like|insurance)\b)/i,
  /\b(?:don'?t|do not) (?:even |really )?care (?:if|whether) i (?:live or die|die|wake up)\b/i,
  /\bhope i (?:get hit by a (?:bus|car|truck)|don'?t wake up|never wake up|die)\b(?! (?:early|before|until|late|in time|on time|laughing|of))/i,
  /\b(?:done with|given up on|giving up on) (?:life|living)\b(?! (?:in|with|at|admin|here|like|for|a|my|the|this|that)\b)/i,
  // others better off without me, not missed, a burden
  /\b(?:better off|happier|easier)\b[^.!?]{0,25}\bif i (?:(?:was|were) (?:gone|dead)|(?:wasn'?t|weren'?t|was not|were not) (?:here|around|alive))\b/i,
  /\bbetter without me\b/i,
  /\b(?:no ?one|nobody) would (?:even )?(?:miss me|care|notice)\b[^.!?]{0,15}\bif i (?:was gone|were gone|died|disappeared|wasn'?t (?:here|around)|was dead)\b/i,
  /\b(?:i'?m|i am|i (?:just |always |really )?feel like) (?:just |such |only )?a burden\b/i,
];
function extraCrisis(probe) {
  if (!EXTRA_CRISIS.some((re) => re.test(probe.replace(/[’‘]/g, "'")))) return null;
  return { reframeAppropriate: false, level: 'crisis', title: HARM_COPY.crisis.title, message: HARM_COPY.crisis.message, resources: HARM_COPY.crisis.resources, stillHere: HARM_COPY.stillHere };
}
// A care match (abuse, violence, bullying) never hides crisis words. "He hurt my arm" stays violence:
// beside a care match, hurting a part of the body counts as self-harm only when "I" do it.
const MY_BODY = /\b(?:cut|cutting|burn|burning|hurt|hurting|harm|harming)\s+my (?:arms?|wrists?|legs?|thighs?|skin)\b/gi;
const I_HURT_MY_BODY = /\bI(?:'ve|'m|'d)?(?:\s+(?:have|am|was|keep|kept|started|start|been|just|sometimes|still|always|often|again|to))*\s+(?:cut|cutting|burn|burning|hurt|hurting|harm|harming)\s+my (?:arms?|wrists?|legs?|thighs?|skin)\b/i;
const safetyOf = (probe) => {
  const s = checkSafety(probe);
  if (s.reframeAppropriate) return extraCrisis(probe) || s;
  if (s.level === 'crisis') return s;
  return (I_HURT_MY_BODY.test(probe) ? extraCrisis(probe) : extraCrisis(probe.replace(MY_BODY, ' '))) || s;
};

// Hushmates' own words for the support screen. The lexicon is the app's (Reframe's, reused
// unchanged); its titles and messages talk about reframing, and its helplines are for the UK and
// the US, so both are replaced here. The private beta is in Australia: these are the national
// services' published numbers. To be reviewed before launch by a clinical safety adviser (see
// docs/READINESS.md), and again for any new region.
export const SUPPORT_REGION = 'AU';
// `tel` (digits only) and `link` (https only) make the lines tappable on the support screen.
const AU = {
  now: { label: 'Right now', detail: 'If you or someone else is in immediate danger, call 000.', tel: '000', call: 'Call 000' },
  lifeline: { label: 'Lifeline', detail: 'Call 13 11 14, any time, day or night, or chat online at lifeline.org.au.', tel: '131114', call: 'Call 13 11 14', link: { href: 'https://www.lifeline.org.au/crisis-chat/', text: 'Chat online' } },
  callback: { label: 'Suicide Call Back Service', detail: 'Call 1300 659 467, any time.', tel: '1300659467', call: 'Call 1300 659 467' },
  yarn: { label: '13YARN', detail: 'Call 13 92 76: crisis support by and for Aboriginal and Torres Strait Islander people, any time.', tel: '139276', call: 'Call 13 92 76' },
  respect: { label: '1800RESPECT', detail: 'Call 1800 737 732 about family, domestic or sexual violence, any time.', tel: '1800737732', call: 'Call 1800 737 732' },
  beyondBlue: { label: 'Beyond Blue', detail: 'Call 1300 22 4636 to talk things through with a counsellor.', tel: '1300224636', call: 'Call 1300 22 4636' },
  worried: { label: 'Lifeline', detail: 'Call 13 11 14, any time. They help people who are worried about someone else, too.', tel: '131114', call: 'Call 13 11 14' },
  elsewhere: { label: 'Outside Australia', detail: 'findahelpline.com lists free, confidential helplines in many countries.', link: { href: 'https://findahelpline.com', text: 'Find a helpline' } },
};
/** Crisis lines for the support screen and the "Get support now" sheet. */
export const SUPPORT_RESOURCES = Object.freeze([AU.now, AU.lifeline, AU.callback, AU.yarn, AU.elsewhere]);
const GENERAL = [AU.now, AU.lifeline, AU.beyondBlue, AU.elsewhere];
const CARE_LINES = [AU.now, AU.respect, AU.lifeline, AU.elsewhere];
const DANGER_LINES = [AU.now, AU.worried, AU.elsewhere];
const NOT_SENT = 'It won’t be sent out for other perspectives.';
const CARE = {
  abuse: { message: `What you’re describing sounds like it could be abuse. ${NOT_SENT} It’s not your fault, and you don’t deserve it. If you can, tell someone you trust or contact a support service, at your own pace.`, resources: CARE_LINES },
  violence: { message: `Nobody has the right to hurt you. This is something that happened to you, and it matters. ${NOT_SENT} If you can, tell someone you trust, and reach out to a support service or the police when you feel ready.`, resources: CARE_LINES },
  threat: { message: `Being threatened is serious, and it isn’t something to talk yourself out of. ${NOT_SENT} Keep any messages or notes, tell someone you trust, and contact the police or a support service if you feel at risk.`, resources: GENERAL },
  harassment: { message: `Being harassed or bullied isn’t something to see differently, and it isn’t on you to fix. ${NOT_SENT} If you can, save screenshots or notes, tell someone you trust, and use the reporting routes at school, at work or on the app or site.`, resources: GENERAL },
  discrimination: { message: `Being treated unfairly because of who you are is real, and it isn’t something to explain away. Your reaction makes sense. ${NOT_SENT} If you want to, keep a record of what happened and talk to someone you trust, HR, a union or an advice organisation.`, resources: GENERAL },
  unsafe: { title: 'Your safety comes first', message: `Not feeling safe is important information. Please trust it. ${NOT_SENT} If you can, talk to someone you trust or a support service about what’s going on.`, resources: GENERAL },
};
function supportOf(safety) {
  if (safety.level === 'crisis' && safety.category === 'someone-in-danger') {
    return {
      title: 'Someone might be in danger',
      message: 'If someone might be about to hurt themselves, or is in danger right now, that comes before anything else: call 000. If it’s safe to, stay with them or keep talking to them. You don’t have to handle this alone: a helpline can talk you through what to do.',
      resources: DANGER_LINES, stillHere: HARM_COPY.stillHere,
    };
  }
  if (safety.level === 'crisis') {
    return {
      title: 'Let’s pause here',
      message: 'What you’ve written sounds really painful, and it matters. It won’t be sent to anyone: you deserve real support with this, right now. If you might act on these thoughts, or you’re not safe, please call 000. If you can, tell someone near you how you’re feeling. You don’t need the right words first.',
      resources: SUPPORT_RESOURCES, stillHere: HARM_COPY.stillHere,
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
  /\b(?:narcissists?|psychopaths?|sociopaths?)\b/i,                          // a label for a person, however it's put
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
    return fail('unsafe', 'This one can’t be passed on: it touches on something that needs real support rather than a new angle. If you or someone else is in danger, please call 000.');
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
