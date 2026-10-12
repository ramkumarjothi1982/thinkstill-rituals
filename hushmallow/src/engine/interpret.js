// Rule-based feeling finder.
//
// Hushmallow does not use AI. This module matches what someone typed against
// the authored emotion taxonomy (names + aliases), an authored phrase lexicon
// and a small situation lexicon, then returns SUGGESTIONS that the person
// confirms or corrects. It never claims to understand arbitrary language:
// low-confidence results are flagged so the UI asks instead of assuming.

import { EMOTIONS, getEmotion, normalizeText, editDistance } from '../data/emotions.js';

// ----------------------------------------------------------- lexicons --
// everyday phrases → [emotion id, confidence]
const PHRASES = [
  [/\b(keep|kept|still) (replaying|going over|thinking about)\b|\breplay(ing)? (it|the|that|what)\b|\bon (a )?loop\b/, 'overthinking', 0.75],
  [/\bfed up\b/, 'frustration', 0.8], [/\bon edge\b/, 'nervousness', 0.75], [/\bcan'?t stop (thinking|worrying|overthinking)\b/, 'worry', 0.75],
  [/\b(heart|chest) (is )?(racing|pounding)\b/, 'anxiety', 0.75], [/\bwant(ed)? to scream\b/, 'frustration', 0.75],
  [/\bmiss(ing)? (him|her|them|you|my|someone|home)\b/, 'longing', 0.75], [/\bcan'?t be bothered\b/, 'apathy', 0.7],
  [/\bover the moon\b/, 'elation', 0.85], [/\bbutterflies\b/, 'nervous-excitement', 0.6], [/\bgutted\b/, 'disappointment', 0.85],
  [/\bpissed( off)?\b/, 'anger', 0.8], [/\bchuffed\b/, 'pride', 0.7], [/\bburn(t|ed) out\b/, 'burnout', 0.85],
  [/\bstuck\b/, 'stuck', 0.6], [/\b(so )?done with\b/, 'frustration', 0.6], [/\bheart ?broken\b/, 'heartbreak', 0.85],
  [/\bfreaking out\b/, 'panic', 0.7], [/\bfreaked out\b/, 'anxiety', 0.65], [/\bwound up\b/, 'irritation', 0.6],
  [/\bat my wits'? end\b/, 'frustration', 0.75], [/\blet down\b/, 'disappointment', 0.75], [/\bleft out\b/, 'exclusion', 0.8],
  [/\bnot good enough\b/, 'inadequate', 0.75], [/\bwhat'?s the point\b/, 'hopelessness', 0.55], [/\bon top of the world\b/, 'elation', 0.85],
  [/\bcan'?t (switch|turn) off\b/, 'restlessness', 0.6], [/\b(too much|so much) (going on|on my plate)\b/, 'overwhelm', 0.75],
  [/\bfalling apart\b/, 'overwhelm', 0.6], [/\b(blew|blow) up at\b/, 'anger', 0.6], [/\bsnapped at\b/, 'irritation', 0.6],
  [/\bcan'?t believe\b/, 'disbelief', 0.5], [/\bmade a fool of myself\b/, 'embarrassment', 0.8], [/\bcringe\b/, 'embarrassment', 0.7],
  [/\bfomo\b/, 'fear-of-missing-out', 0.85], [/\bimpost(e|o)r\b/, 'imposter-feelings', 0.8], [/\bnobody (cares|likes me)\b/, 'loneliness', 0.6],
  [/\bno one (cares|likes me|gets me)\b/, 'loneliness', 0.6], [/\b(feel|feeling) (so )?small\b/, 'inadequate', 0.55],
  [/\b(fuming|seething|livid)\b/, 'fury', 0.85], [/\b(ugh|argh|grr+)\b/, 'frustration', 0.5], [/\bmeh\b/, 'indifference', 0.5],
  [/\b(knot|pit) in my stomach\b/, 'dread', 0.6],
  [/\b(terrible|useless|hopeless|rubbish|bad|awful|crap) at (my |this |the )?\w+/, 'inadequate', 0.6],
  [/\bi'?m (so |such )?(stupid|an idiot|a failure|useless|pathetic|a mess|a joke)\b/, 'inadequate', 0.6], [/\b(tired|exhausted) of\b/, 'frustration', 0.5],
]

// situations → contexts, and gentle implied emotions (low confidence)
const SITUATIONS = [
  [/\b(boss|manager|work|job|office|colleague|co-?worker|meeting|deadline|shift|client)s?\b/, 'work'],
  [/\b(school|exam|test|grade|teacher|class|homework|uni|university|college|essay)s?\b/, 'school'],
  [/\b(boyfriend|girlfriend|partner|husband|wife|spouse|bf|gf)\b/, 'partner'],
  [/\b(relationship|date|dating|crush|ex)\b/, 'relationship'],
  [/\b(mum|mom|dad|parent|parents|brother|sister|sibling|family|son|daughter|grandma|grandpa)\b/, 'family'],
  [/\b(friend|friends|mate|bestie|group chat)\b/, 'friends'],
  [/\b(money|rent|bills?|debt|broke|pay|salary|bank)\b/, 'money'],
  [/\b(sick|unwell|doctor|hospital|health|pain|diagnos\w*)\b/, 'health'],
  [/\b(sleep|insomnia|awake|tired|bed)\b/, 'sleep'],
  [/\b(tomorrow|future|next week|going to|will happen|what if)\b/, 'future'],
  [/\b(died|passed away|funeral|lost my|grief|death)\b/, 'loss'],
  [/\b(argument|argued|fight|fought|yelled|shouted|conflict)\b/, 'conflict'],
  [/\b(body|weight|looks|appearance|ugly|fat)\b/, 'body'],
  [/\b(party|social|people|everyone|instagram|tiktok|social media)\b/, 'social'],
  [/\b(moving|move house|new job|change|starting)\b/, 'change'],
];
const IMPLIED = [
  [/\b(yelled|shouted|screamed) at me\b/, 'anger', 0.45], [/\b(yelled|shouted|screamed) at me\b/, 'humiliation', 0.3],
  [/\b(died|passed away)\b/, 'grief', 0.7], [/\b(broke up|dumped|break-?up)\b/, 'heartbreak', 0.65],
  [/\b(didn'?t|hasn'?t|haven'?t|won'?t) (reply|replied|text(ed)? back|respond(ed)?)\b|\bleft on read\b|\bghost(ed|ing)\b/, 'rejection', 0.4],
  [/\b(not|wasn'?t|weren'?t) invited\b/, 'exclusion', 0.65], [/\b(fired|laid off|let go|made redundant)\b/, 'shock', 0.45],
  [/\bcriticis(ed|ized)|critici[sz]ed\b/, 'hurt', 0.35], [/\b(failed|rejected)\b/, 'disappointment', 0.45],
  [/\b(cheated|lied to me|betrayed)\b/, 'betrayal', 0.7], [/\bnew (job|baby|home)\b/, 'anticipation', 0.3],
];
const DESIRES = [
  [/\b(calm( me)? down|chill|relax|settle)\b/, 'calm-down'], [/\b(vent|get it out|let it out|scream|rant)\b/, 'let-it-out'],
  [/\b(understand|figure( it)? out|make sense|why)\b/, 'understand'], [/\b(alone|lonely|someone to talk)\b/, 'feel-less-alone'],
  [/\b(sleep|fall asleep|rest)\b/, 'sleep'], [/\b(focus|concentrate)\b/, 'focus'], [/\b(celebrate|party)\b/, 'celebrate'],
  [/\b(decide|choose|decision|should i)\b/, 'decide'], [/\b(be kind to myself|stop beating myself)\b/, 'be-kind-to-self'],
  [/\b(say no|boundary|boundaries)\b/, 'set-boundary'], [/\b(talk to|tell (him|her|them)|conversation)\b/, 'prepare-conversation'],
  [/\b(move|walk|run|shake it off)\b/, 'move-body'], [/\b(laugh|cheer me up|something fun)\b/, 'laugh'],
];

const CRISIS = [
  /\b(kill|killing|hurt|hurting|harm|harming|cut|cutting) myself\b/, /\bsuicid\w*/, /\bend (it all|my life)\b/,
  /\b(don'?t|do not) want to (be here|live|exist|wake up)\b/, /\bno reason to (live|go on)\b/, /\bbetter off (dead|without me)\b/,
  /\bwant to die\b/, /\bself[- ]harm\w*/, /\boverdose\b/,
];
const CONCERN = [/\bcan'?t cope\b/, /\bhopeless\b/, /\bworthless\b/, /\bcan'?t go on\b/, /\b(he|she|they) (hit|hits|hurt|hurts) me\b/, /\b(abus\w+|unsafe at home)\b/];

const NEGATORS = /\b(not|no|never|isn'?t|wasn'?t|aren'?t|weren'?t|don'?t|doesn'?t|didn'?t|no longer|hardly|barely)\b/;
const INTENSIFY = /\b(really|so|very|extremely|super|completely|totally|absolutely|incredibly|beyond|utterly|fucking|f\*+ing|insanely|deeply|massively)\b/g;
const SOFTEN = /\b(a bit|slightly|kind of|kinda|a little|somewhat|sort of|a tad|mildly)\b/g;
const UNSURE = /\b(don'?t know why|not sure|i guess|maybe|kind of|weird|idk|dunno|can'?t tell)\b/;

// ------------------------------------------------------------ index --
let INDEX = null;
function buildIndex() {
  const map = new Map();
  const add = (phrase, id, w) => {
    const k = normalizeText(phrase).trim();
    if (!k || k.length < 3) return;
    if (!map.has(k) || map.get(k)[1] < w) map.set(k, [id, w]);
  };
  for (const e of EMOTIONS) {
    add(e.name, e.id, 0.88);
    add(e.id.replace(/-/g, ' '), e.id, 0.85);
    for (const a of e.aliases || []) add(a, e.id, 0.8);
  }
  INDEX = map;
  return map;
}

function tokens(s) { return s.split(/[^a-z0-9'*-]+/).filter(Boolean); }

/**
 * @returns {{emotions: Array, suggestions: Array, contexts: string[], desires: string[], intensity: number,
 *   mixed: boolean, uncertain: boolean, needsClarification: boolean, safety: {level, reason}, acknowledgement: string}}
 */
export function interpret(text) {
  const raw = String(text || '').slice(0, 1000);
  const pre = raw.replace(/[’‘]/g, "'").replace(/'ll\b/gi, ' will');
  const t = normalizeText(pre);
  const out = {
    emotions: [], suggestions: [], contexts: [], desires: [], intensity: 0.55, mixed: false,
    uncertain: false, needsClarification: false, safety: { level: 'none', reason: null }, acknowledgement: '',
  };
  if (!t.trim()) { out.needsClarification = true; out.acknowledgement = 'Tell me a little, or pick a feeling below.'; return out; }

  // safety first
  for (const re of CRISIS) if (re.test(t)) { out.safety = { level: 'crisis', reason: 'self-harm' }; break; }
  if (out.safety.level === 'none') for (const re of CONCERN) if (re.test(t)) { out.safety = { level: 'concern', reason: re.source }; break; }

  const index = INDEX || buildIndex();
  const found = new Map();
  const note = (id, conf, evidence, extra = {}) => {
    if (!getEmotion(id)) return;
    const prev = found.get(id);
    if (!prev || prev.confidence < conf) found.set(id, { id, confidence: conf, evidence, ...extra });
  };

  // clause-level intensity
  const clauses = pre.split(/[.;,!?\n]+|\b(?:but|although|though|while|also|yet)\b/i).map((c) => normalizeText(c || '').trim()).filter(Boolean);
  const shout = (raw.match(/\b[A-Z]{3,}\b/g) || []).length;
  const bangs = (raw.match(/!/g) || []).length;
  let globalIntensity = 0.55 + Math.min(0.2, bangs * 0.06) + Math.min(0.15, shout * 0.08);

  for (const clause of clauses) {
    const intens = Math.min(1, 0.55 + (clause.match(INTENSIFY) || []).length * 0.15 - (clause.match(SOFTEN) || []).length * 0.18 +
      (/\b(fuming|furious|devastated|terrified|livid|panicking|heartbroken)\b/.test(clause) ? 0.15 : 0));
    const toks = tokens(clause);
    // n-gram lookup (longest first)
    const used = new Set();
    for (let n = 4; n >= 1; n--) {
      for (let i = 0; i + n <= toks.length; i++) {
        if ([...Array(n).keys()].some((k) => used.has(i + k))) continue;
        const gram = toks.slice(i, i + n).join(' ');
        let hit = index.get(gram);
        // tolerate small typos on single longer words
        if (!hit && n === 1 && gram.length >= 5) {
          for (const [k, v] of index) {
            if (Math.abs(k.length - gram.length) <= 1 && !k.includes(' ') && editDistance(k, gram) <= (gram.length >= 7 ? 2 : 1)) { hit = [v[0], v[1] * 0.7]; break; }
          }
        }
        if (!hit) continue;
        // negation within the 3 preceding words
        const before = toks.slice(Math.max(0, i - 3), i).join(' ');
        if (NEGATORS.test(before)) {
          if (/\bno longer\b/.test(before)) note('relief', 0.45, `no longer ${gram}`);
          for (let k = 0; k < n; k++) used.add(i + k);
          continue;
        }
        for (let k = 0; k < n; k++) used.add(i + k);
        // meta-emotion: "ashamed of being jealous" → shame about self
        const after = toks.slice(i + n, i + n + 3).join(' ');
        const target = /^(of|about|for) (being|feeling|myself)/.test(after) || /^(at|with) myself/.test(after) ? 'self' : null;
        note(hit[0], hit[1], gram, { intensity: intens, target });
      }
    }
    for (const [re, id, conf] of PHRASES) if (re.test(clause)) note(id, conf, clause.match(re)[0], { intensity: intens });
    for (const [re, id, conf] of IMPLIED) if (re.test(clause)) note(id, conf, clause.match(re)[0], { intensity: intens * 0.9 });
  }

  for (const [re, ctx] of SITUATIONS) if (re.test(t) && !out.contexts.includes(ctx)) out.contexts.push(ctx);
  for (const [re, d] of DESIRES) if (re.test(t) && !out.desires.includes(d)) out.desires.push(d);
  // "feel" words that aren't emotions shouldn't count as one (e.g. "I feel like")
  found.delete('feeling');

  const list = [...found.values()].sort((a, b) => b.confidence - a.confidence);
  out.emotions = list.slice(0, 5).map((e) => ({ ...e, intensity: Math.min(1, e.intensity ?? globalIntensity) }));
  out.mixed = new Set(out.emotions.filter((e) => e.confidence >= 0.5).map((e) => getEmotion(e.id).family)).size > 1;
  out.uncertain = UNSURE.test(t) || !out.emotions.some((e) => e.confidence >= 0.6);
  out.needsClarification = out.emotions.length === 0;
  if (out.emotions.length) {
    globalIntensity = Math.max(...out.emotions.map((e) => e.intensity));
  }
  out.intensity = Math.max(0.15, Math.min(1, globalIntensity));

  // suggestions: confident matches first, then close relatives in the same family
  const sug = [];
  const push = (id) => { const e = getEmotion(id); if (e && !sug.some((s) => s.id === id)) sug.push({ id, name: e.name }); };
  out.emotions.forEach((e) => push(e.id));
  for (const e of out.emotions.slice(0, 2)) {
    const fam = getEmotion(e.id).family;
    EMOTIONS.filter((x) => x.family === fam && x.id !== e.id).sort((a, b) => Math.abs(a.arousal - getEmotion(e.id).arousal) - Math.abs(b.arousal - getEmotion(e.id).arousal))
      .slice(0, 2).forEach((x) => push(x.id));
  }
  out.suggestions = sug.slice(0, 6);
  out.acknowledgement = acknowledge(out);
  return out;
}

function acknowledge(r) {
  const names = r.emotions.filter((e) => e.confidence >= 0.5).slice(0, 2).map((e) => (getEmotion(e.id).phrase || getEmotion(e.id).name).toLowerCase());
  if (r.safety.level === 'crisis') return 'That sounds really heavy. You deserve support from a real person right now.';
  if (!names.length) return r.emotions.length ? 'I might be off — tap the feelings that fit.' : 'I couldn’t spot a feeling word. Pick what fits?';
  const joined = names.length === 2 ? `${names[0]} and ${names[1]}` : names[0];
  return r.uncertain ? `Maybe ${joined}? Tap to change it.` : `Sounds like ${joined}. Tap to adjust if that’s off.`.replace('like feeling', 'like you’re feeling');
}

/** Blend confirmed emotions into a Mallow face mix: {presetId: weight}. */
export function faceMix(emotions) {
  const mix = {};
  for (const e of emotions) {
    const em = getEmotion(e.id);
    if (!em) continue;
    const w = (e.weight ?? e.confidence ?? 1);
    for (const [k, v] of Object.entries(em.face)) mix[k] = (mix[k] || 0) + v * w;
  }
  return Object.keys(mix).length ? mix : { neutral: 1 };
}
