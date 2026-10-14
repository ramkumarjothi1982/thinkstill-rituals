// Another Angle: the interpretive markers (review round 8, the coordinator's flipped default).
//
// The fact-vs-guess framing ("what your mind added", "a guess about what's going on inside someone else", "the
// worst case", "one way to read it", "Want to test it?", "Check one fact", "another explanation") is used ONLY
// when the person's own words carry an explicit interpretive marker, and then ONLY the clause that carries it is
// labelled the guess, never the stated event:
//
//   mind     reading someone's mind: "she must hate me", "everyone thinks I'm useless", "he doesn't care about
//            me", "they're laughing at me", "she wants me to fail"
//   over     overgeneralising: "nobody likes me", "he never listens", "I always mess up", "nothing ever works",
//            "every time I try…"
//   cata     catastrophising: "what if…", "I'm going to fail", "they'll laugh at me", "it'll be a disaster",
//            "I've ruined everything", "the worst is going to happen"
//   label    labelling themselves: "I'm such an idiot", "I'm useless", "I'm a failure", "I feel like a failure"
//   should   should / must about themselves: "I should have known", "I shouldn't have said it", "I must be stupid"
//
// Everything else (a stated event, something someone did to the person, a feeling, a loss) is real, and gets the
// acknowledging mechanics. A feeling clause ("I feel anxious all the time about work") never carries a marker:
// the feeling is the fact. Only "I feel like / that <clause>" is a thought (and then only a marker makes it a guess).
// A stated past act ("my mate never paid me back", "nobody came to my party") is an event, never a generalisation.
//
//   clauses(text)        → [{ text, kinds: Set }]  the person's words in clauses (exact substrings), each with the
//                          markers it carries
//   markerKinds(text)    → Set of the marker kinds in the words
//   hasMarker(text)      → true when any clause carries a marker
//   guessClause(text, prefer?) → the first clause with a marker (of a preferred kind when there is one), exactly as
//                          typed, or ''
//   factClause(text)     → the first clause with no marker (the stated event or feeling), exactly as typed, or ''
//   HARSH                → a harsh label of their own ("I’m a horrible mother")
//
// Pure ES module, no DOM. Deterministic.

import { feelingOpens, feelingSpan, feelingContext } from './feelings.js';

/** A harsh label the person puts on themselves (read on the words as typed, apostrophes either way). */
export const HARSH = /\b(?:i['’]?m|i am|i feel like)(?: (?:so|such|a|an|just|completely|totally|really|basically|the|absolute|total|complete|utter|utterly|literally|actually|massive|huge|biggest))* (?:stupid|an? idiot|idiot|a failure|failure|a loser|loser|useless|terrible|pathetic|worthless|hopeless|incompetent|a disaster|disaster|a mess|mess|a joke|joke|a fraud|fraud|a burden|burden|awful|horrible|rubbish|selfish|lazy|disgusting|unlovable|not good enough|not enough|too much|dumb|thick|clueless|(?:an? )?bad (?:person|friend|mum|mom|mother|dad|father|parent|daughter|son|sister|brother|partner|wife|husband|girlfriend|boyfriend|human|employee|student|teacher|colleague))\b/iu;

/** What makes a label someone else's view, not theirs ("Everyone at work thinks I am useless", "he called me stupid"). */
const VIEW_BEFORE = /\b(?:thinks?|thought|says?|said|believes?|believed|reckons?|reckoned|decided|knows?|assumes?|assumed|tells?\s+(?:me|everyone|people|them)|told\s+(?:me|everyone|people|them)|calls?\s+me|called\s+me|sees\s+me\s+as|saw\s+me\s+as|treats?\s+me\s+(?:like|as)|makes?\s+me\s+feel\s+like|acts?\s+like)\s+(?:that\s+)?(?:(?:i|im|i[’']m|i\s+am|i\s+was|i[’']?ve\s+been)\s+)?$/iu;
/** …unless the one who thinks it is them ("I think I'm useless", "I just know I'm a failure"). */
const SELF_VIEW = /(?:^|[^\p{L}])i\s+(?:(?:just|really|honestly|do|kind\s+of|sort\s+of|actually|genuinely)\s+)*(?:think|thought|believe|believed|reckon|know|knew|decided|feel|felt)\s+(?:that\s+)?(?:(?:i|im|i[’']m|i\s+am|i\s+was|i[’']?ve\s+been)\s+)?$/iu;
/**
 * A harsh label the person puts on themselves (HARSH), never one they say someone else holds ("everyone thinks I'm
 * useless" reads a mind, it is not their own verdict: review r9). → the match, or null.
 */
export function ownLabel(text) {
  const s = String(text ?? '');
  const re = new RegExp(HARSH.source, 'giu');
  for (const m of s.matchAll(re)) {
    const before = s.slice(Math.max(0, m.index - 60), m.index);
    // ("thinks I'm useless": the "I'm" is inside the match, so what stands before it decides)
    if (VIEW_BEFORE.test(before) && !SELF_VIEW.test(before)) continue;
    return Object.assign([m[0]], { index: m.index, input: s });
  }
  return null;
}

/** Lower case, every apostrophe out ("doesn’t" → "doesnt", "I’m" → "im", "she'll" → "shell"), single spaces. */
const flat = (s) => String(s ?? '').normalize('NFKC').toLowerCase().replace(/[‘’ʼ`´']/gu, '').replace(/[‐‑-]/gu, ' ').replace(/\s+/gu, ' ').trim();

/** "I" (and "I just", "I really"…) right before a match: the person's own view, never a read of someone else's mind. */
const SELF_BEFORE = /(?:^|\s)(?:i|we)(?:\s+(?:just|really|honestly|still|do|kind\s+of|sort\s+of|also|actually|genuinely|always|never|probably))*\s*$/u;
const notSelf = (n, m) => !SELF_BEFORE.test(n.slice(0, m.index));

/** Past tense and past participles: "never paid me back", "nobody came", "always said" are events, not habits. */
const PAST = /^(?:\w+ed|been|had|did|was|were|said|told|got|gotten|went|gone|came|made|gave|given|took|taken|thought|knew|known|saw|seen|heard|felt|left|met|paid|sent|won|lost|found|bought|brought|caught|taught|wrote|written|spoke|spoken|woke|woken|ate|eaten|ran|sat|stood|understood|forgot|forgotten|forgave|kept|meant|let|put|read|hit|hurt|cut|shut|set|quit|grew|drove|rode|flew|threw|wore|chose|broke|stole|fell|held|sold|spent|lent|slept|swam|sang|began|drank|became|showed|shown|done|once|mind|again|ever)$/u;
/** What makes an "always" about them or a bad outcome ("she always ignores me"), never "it always rains in May". */
const ALWAYS_BAD = /\b(?:me|i|im|wrong|bad|badly|worse|worst|late|last|fail\w*|mess\w*|ruin\w*|forget\w*|ignor\w*|leav\w*|cancel\w*|criticis\w*|criticiz\w*|blam\w*|complain\w*|shout\w*|yell\w*|picks?\s+on|the\s+one|alone|left\s+out)\b/u;

/** The outcomes a forecast fears ("I'll fail", "she's going to leave me", "they'll laugh at me"). */
const BAD = '(?:fail|flunk|mess\\s+(?:it\\s+|this\\s+|everything\\s+)?up|screw\\s+(?:it\\s+|this\\s+)?up|blow\\s+it|bomb|ruin|lose|be\\s+(?:\\w+\\s+)?(?:fired|sacked|dumped|rejected|alone|late|awful|terrible|horrible|a\\s+disaster|a\\s+mess|embarrassed|humiliated|laughed\\s+at|in\\s+trouble|stuck|single|homeless|broke|ruined|over|a\\s+failure|useless|judged|kicked\\s+out|found\\s+out|the\\s+worst|so\\s+bad|bad|worse|pointless|hopeless|furious|angry\\s+with\\s+me|disappointed|ashamed|the\\s+end|left\\s+(?:out|behind|alone))|get\\s+(?:fired|sacked|dumped|rejected|caught|laughed\\s+at|in\\s+trouble|kicked\\s+out|worse|found\\s+out|told\\s+off|shouted\\s+at)|hate|laugh|leave\\s+me|dump|reject|fire\\s+me|sack\\s+me|break\\s+up|end\\s+up\\s+(?:alone|homeless|broke|failing|like)|never|go\\s+(?:wrong|badly|horribly)|think\\s+(?:im|i\\s+am|i\\s+was|less\\s+of\\s+me)|notice|judge|find\\s+out|blame\\s+me|ignore\\s+me|panic|freeze|embarrass\\s+myself|humiliate|let\\s+(?:everyone|them|him|her|you|people|my\\s+\\w+)\\s+down|disappoint|regret|happen\\s+again|not\\s+(?:get|pass|make|be\\s+able|cope|manage|find|like|want|understand|forgive|speak|talk))\\b';

/** Mind reading: what someone else thinks, feels or wants, read into it. */
const MIND = [
  /\b(?:thinks?|thought|believes?|reckons?|knows?|assumes?|decided|sees\s+me\s+as)\s+(?:that\s+)?(?:im|i\s+am|i\s+was|me|my|i\s+(?:\w+\s+)?(?:did|do|cant|dont|am|was|should|cheated|lied|ignored|hate|wasnt|didnt))\b/u,
  /\bmust\s+(?:think|hate|be\s+(?:\w+\s+)?(?:sick|tired|bored|fed\s+up|annoyed|angry|mad|disappointed|embarrassed|ashamed|laughing|judging|talking)|feel|not\s+(?:like|care|want|love))\b/u,
  /\b(?:hates?|hated|despises?|cant\s+stand|resents?)\s+me\b/u,
  /\b(?:doesnt|dont|does\s+not|do\s+not)\s+(?:even\s+|really\s+|actually\s+|seem\s+to\s+)?(?:care|like|love|want|respect|trust|rate|value|need|understand)\s+(?:about\s+)?(?:me|us|what\s+i|how\s+i|that\s+i|my)\b/u,
  /\b(?:nobody|no\s+one|noone|no\s+body)\s+(?:\w+\s+)?(?:cares|likes|loves|wants|respects|understands|listens|notices|believes|gets|sees|values|rates|needs|misses)\b/u,
  /\b(?:is|are|s|re|shes|hes|theyre|youre|everyones|keeps?|must\s+be|probably|always|all|been|seems?|looks?|sounds?)\s+(?:\w+\s+){0,2}(?:judging|laughing\s+at|talking\s+about|staring\s+at|looking\s+down\s+on|making\s+fun\s+of|sick\s+of|tired\s+of|bored\s+of|fed\s+up\s+(?:with|of)|(?:annoyed|angry|furious|fuming|livid|raging|irritated|pissed\s+off|upset|cross|mad|disappointed|ashamed|embarrassed)\s+(?:with|at|in|of|by))\s+me\b/u,
  /\bwants?\s+me\s+to\s+(?:fail|leave|go\s+away|quit|disappear|suffer|feel\s+(?:bad|stupid|small|guilty)|look\s+(?:bad|stupid)|be\s+(?:miserable|unhappy|alone|gone)|give\s+up|mess\s+up|get\s+fired)\b/u,
  /\b(?:i\s+bet|im\s+sure|i\s+just\s+know|obviously|clearly)\s+(?:he|she|they|everyone|everybody|people|my\s+\w+)\b/u,
  // (review r11) "she must be jealous", "he must be furious", "she must be cheating": "must be" + any word that reads
  // into them (never a place or a plain fact: "she must be at work", "he must be fine")
  /\b(?:he|she|they|hes|shes|theyre|everyone|everybody)\s+(?:(?:really|probably|surely|just|obviously|clearly)\s+)?must\s+be\s+(?:(?:so|really|very|totally|completely|well|proper|pretty|quite|a\s+bit|kind\s+of|kinda|getting|feeling)\s+)*(?!(?:at|in|on|home|here|there|out|away|back|off|up|down|over|done|finished|the|a|an|my|his|her|their|our|your|it|that|this|ok|okay|fine|alright|right|joking|kidding|wrong|true|nice|lovely|great|happy|proud|pleased|relieved|excited)\b)[a-z]{3,}\b/u,
  // "she must have forgotten about me", "they must have been talking about me"
  /\b(?:he|she|they|everyone|everybody)\s+(?:(?:really|probably|surely|just|obviously|clearly)\s+)?must\s+(?:have|ve|of)\s+(?:forgotten|forgot|been|done|decided|thought|got|gotten|stopped|lost\s+interest|moved\s+on|found|given\s+up|had\s+enough|seen|heard|noticed|meant|wanted|realised|realized|told|said|replaced|dumped|ditched|blocked|muted|unfollowed|chosen|picked|preferred|swapped|outgrown)\b/u,
  // (review r12) "she must have a new best friend", "he must want something" (what someone has or wants, read into it)
  /\b(?:he|she|they|everyone|everybody)\s+(?:(?:really|probably|surely|just|obviously|clearly)\s+)?must\s+(?:have|ve)\s+(?:a|an|another|someone|somebody)\s+(?:new|better|other|else)\b|\b(?:he|she|they)\s+(?:(?:really|probably|surely|just|obviously|clearly)\s+)?must\s+want\s+(?:something|me\s+(?:gone|out|to\s+\w+))\b/u,
  // "she obviously doesnt want to see me", "he probably finds me boring", "they clearly hate me"
  /\b(?:he|she|they|everyone|everybody)\s+(?:(?:so|just)\s+)?(?:obviously|clearly|probably|definitely|deffo|defo)\s+(?:doesnt|dont|does\s+not|do\s+not|isnt|arent|hates?|wants?|thinks?|cant|wont|likes?|prefers?|finds?|sees|regrets?)\b/u,
];
/** Overgeneralising: everyone / nobody / everything / nothing / always / never as a rule, never a stated past act. */
const OVER = [
  /\b(?:everyone|everybody|nobody|no\s+one|noone|people)\s+(?:(?:at|in|from|around|on)\s+(?:my\s+|the\s+|this\s+|our\s+)?\w+\s+|else\s+|here\s+|there\s+)?(?:(?:ever|always|really|actually|just|even|still|now|literally|secretly)\s+)*(?:hates?|thinks?|knows?|sees|laughs|judges|ignores|leaves|forgets|likes|cares|wants|loves|understands|listens|notices|asks|texts|calls|invites|believes|gets|helps|remembers|is\s+(?:better|against|sick|tired|fed\s+up|annoyed|angry|laughing|talking|staring|judging|happier|smarter|prettier|doing\s+better)|has\s+(?:a|their|someone|more|better|it)|does\s+better|would|will|wont|cant|doesnt)\b/u,
  /\b(?:everyones|everybodys)\s+(?:laughing|talking|staring|judging|better|against|sick|tired|annoyed|angry|happier|doing\s+better)\b/u,
  /\b(?:everything|it\s+all|nothing)\s+(?:i\s+do\s+)?(?:(?:ever|always)\s+)?(?:is\s+(?:ruined|wrong|awful|terrible|falling\s+apart|my\s+fault|a\s+mess|going\s+wrong|pointless|hopeless|broken|against\s+me|always|good\s+enough)|goes\s+wrong|falls\s+apart|works|goes\s+right|changes|helps|matters|i\s+do\s+(?:is\s+)?(?:wrong|right|good\s+enough|matters)|will\s+(?:ever\s+)?(?:change|work|get\s+better|help|be\s+(?:ok|okay|the\s+same|fine|good)))\b/u,
  /\bevery\s+(?:single\s+)?time\s+(?:i|we|he|she|they|it|my|someone|anyone)\b|\beach\s+time\s+i\b|\ball\s+the\s+time\b/u,
  // (review r11) "she always does this", "mum always loves her more" (a habit read into one event, a favourite)
  /\b(?:he|she|they|you)\s+always\s+(?:does|do|says|pulls|plays)\s+(?:this|that|it)\b|\balways\s+(?:loves?|likes?|prefers?|favou?rs?|picks?|chooses?)\s+(?:him|her|them|my\s+\w+)\s+(?:more|better|over\s+me|first)\b/u,
];
/** "always" / "never" + a verb that is not past: "he never listens", "I always mess up" (never "never paid me back"). */
function alwaysNever(n) {
  for (const m of n.matchAll(/\b(?<pre>(?:have|has|had|ve|s|d)\s+)?(?<w0>always|never)\s+(?:(?:ever|even|really|just|actually|once|again)\s+)*(?<w>[a-z]+)/gu)) {
    const { pre, w0, w } = m.groups;
    if (pre || PAST.test(w) || /^(?:mind|forget|forgive|ending)$/u.test(w)) continue;
    // (review r12) a wrong they tell, not a rule: "my partner never pays me back" (fair anger: authored.js valid_anger)
    if (w0 === 'never' && /^pays?$/u.test(w) && /^\s+(?:me|us|it)\s+back\b/u.test(n.slice(m.index + m[0].length))) continue;
    if (w0 === 'always' && !ALWAYS_BAD.test(n)) continue;
    return true;
  }
  return false;
}
/** Catastrophising: a forecast of a bad outcome, "what if", everything ruined, the worst to come. */
const CATA = [
  /\bwhat\s+if\b/u,
  /\b(?:something|it|this|that|things|everything)\s+(?:\w+\s+)?(?:terrible|awful|bad|horrible|dreadful|serious|wrong)\s+(?:is\s+going\s+to|will|is\s+gonna|might|could)\s+happen\b|\b(?:is\s+going\s+to|will|gonna)\s+go\s+(?:wrong|badly)\b/u,
  new RegExp(`\\b(?:ill|i\\s+will|im\\s+going\\s+to|i\\s+am\\s+going\\s+to|im\\s+gonna|will|gonna|going\\s+to|theyll|shell|hell|youll|itll|thatll|everyonell|is\\s+going\\s+to|are\\s+going\\s+to|probably\\s+going\\s+to)\\s+(?:(?:\\w+\\s+){0,3}?)${BAD}`, 'u'),
  /\bwont\s+(?:ever\s+)?(?:get|pass|make|be\s+able|cope|manage|find|work\s+out|like|want|understand|love|forgive|ever)\b/u,
  /\b(?:(?:i|ive)\s+(?:have\s+|ve\s+)?(?:ruined|wrecked|messed\s+up|blown)\s+(?:everything|it\s+all|my\s+(?:life|chances|future|career)|the\s+whole\s+thing))\b|\b(?:everything|it\s+all|my\s+life|my\s+future|my\s+career|the\s+(?:whole\s+)?(?:day|night|weekend|holiday|trip|party|thing))\s+(?:is|s|was|has\s+been|feels|will\s+be)\s+(?:completely\s+|totally\s+)?(?:ruined|over|wrecked|pointless)\b|\b(?:it|this|that)\s+(?:has\s+)?ruined\s+everything\b/u,
  /\b(?:the\s+worst\s+(?:thing\s+)?(?:will|is\s+going\s+to|could|that\s+could)|worst\s+case|expect\s+the\s+worst|the\s+end\s+of\s+the\s+world|never\s+(?:recover|get\s+over\s+(?:it|this))|(?:its|it\s+is|its\s+all)\s+over\s+for\s+me)\b/u,
  /\b(?:(?:will|is\s+going\s+to|gonna|its\s+going\s+to|it\s+will)\s+be\s+an?\s+(?:total\s+|complete\s+|absolute\s+)?(?:disaster|catastrophe|nightmare)|(?:was|is|its)\s+an?\s+(?:total|complete|absolute|utter)\s+(?:disaster|catastrophe|nightmare))\b/u,
  // (review r11) "Im definitely getting fired", "Im going to be in so much trouble"
  /\b(?:definitely|probably|totally|deffo|defo|surely|basically|so|100%)\s+(?:getting|gonna\s+get|going\s+to\s+get|about\s+to\s+get)\s+(?:fired|sacked|dumped|kicked\s+out|told\s+off|expelled|excluded|suspended|rejected|left|laughed\s+at|shouted\s+at|in\s+trouble|the\s+sack)\b/u,
  /\b(?:im|i\s+am|ill|i\s+will|im\s+gonna|im\s+going\s+to|gonna|going\s+to|will)\s+(?:\w+\s+){0,2}?be\s+in\s+(?:so\s+much|big|real|serious|deep|such|massive|huge|loads\s+of|a\s+lot\s+of)\s+(?:of\s+)?trouble\b/u,
  // (review r12) "I'm in so much trouble" (a forecast told as now)
  /\b(?:im|i\s+am)\s+(?:so\s+|definitely\s+|probably\s+|totally\s+)?in\s+(?:so\s+much|big|real|serious|deep|such|massive|huge|loads\s+of|a\s+lot\s+of)\s+(?:of\s+)?trouble\b/u,
];
/** Labels the person puts on themselves beyond HARSH ("I'm such a mess", "I hate myself"). */
const LABEL = /\bi(?:m|\s+am)\s+such\s+an?\s+\w+|\bi\s+hate\s+myself\b|\bi(?:m|\s+am)\s+(?:(?:so|really|just|such|completely|totally|literally|actually)\s+)*(?:the\s+worst|a\s+disappointment|a\s+let\s+down|unlovable|not\s+good\s+enough|not\s+enough|too\s+much|boring|ugly|fat|weird|annoying|unlikeable|unlikable|unattractive|broken|damaged|clingy|needy|cringe|embarrassing|a\s+waste\s+of\s+space|the\s+problem|a\s+bad\s+\w+|a\s+terrible\s+\w+|an\s+awful\s+\w+|a\s+horrible\s+\w+)\b/u;
/** Should / must about themselves (never "I should call my mum": a plan, not a rule). */
// (review r11: "I must have done something wrong", "it must be my fault")
const SHOULD = /\bi\s+(?:really\s+|just\s+|honestly\s+)?must\s+(?:have|ve|of)\s+(?:done|said|made|messed|upset|annoyed|offended|hurt|ruined|got|been)\b|\b(?:it|this|that|everything|all\s+this|it\s+all)\s+(?:must|has\s+to|is\s+probably|is\s+definitely|is\s+obviously)\s+(?:be\s+)?(?:all\s+)?my\s+fault\b|\bi\s+(?:really\s+|just\s+|honestly\s+)?(?:shouldve|should\s+(?:have|ve|of|be|know|feel|not|never|always|be\s+able)|shouldnt(?:\s+(?:have|ve|be|feel|need))?|must\s+(?:be|always|never|not)|ought\s+to(?:\s+(?:have|be))?|need\s+to\s+be\s+(?:better|more|perfect|stronger|thinner|smarter)|have\s+to\s+be\s+(?:perfect|better|the\s+best))\b/u;

/** "I feel / I'm feeling / feeling" + a feeling: the feeling is the fact (never "I feel like / that …": a thought). */
const FEELS_LIKE = /^(?:(?:and|but|so|just|honestly|really|still)\s+)*i\s+(?:\w+\s+)?(?:feel|felt|keep\s+feeling)\s+(?:like|that|as\s+if|as\s+though)\b/iu;
/**
 * What of a clause may carry a thought: all of it, or (after a feeling of their own) only what follows the feeling
 * when that is more than its context ("I'm scared I'll fail" → "I'll fail"; "I feel sick about the exam" → nothing).
 */
function thoughtPart(raw) {
  const p = String(raw ?? '').trim();
  if (FEELS_LIKE.test(p) || !feelingOpens(p)) return { thought: p, feeling: '' };
  const at = feelingSpan(p);
  const rest = at ? p.slice(at) : '';
  if (feelingContext(rest)) return { thought: '', feeling: p };
  const thought = rest.replace(/^[\s,]*(?:that\s+)?/iu, '').replace(/[\s,;:.!?…"”)]+$/gu, '');
  return { thought, feeling: p.slice(0, at).replace(/[\s,;:]+$/u, '') };
}

/** The markers one clause carries (none for a feeling of their own and its context), and the part that carries them. */
function readClause(clause) {
  const kinds = new Set();
  const { thought, feeling } = thoughtPart(clause);
  const out = { text: clause, kinds, guess: thought || clause, feeling };
  const raw = thought;
  const n = flat(raw);
  if (!/\p{L}/u.test(n)) return out;
  for (const re of MIND) { const m = re.exec(n); if (m && notSelf(n, m)) { kinds.add('mind'); break; } }
  if (OVER.some((re) => re.test(n)) || alwaysNever(n)) kinds.add('over');
  if (CATA.some((re) => re.test(n))) kinds.add('cata');
  if (ownLabel(raw) || (LABEL.test(n) && (!VIEW_BEFORE.test(n.slice(0, LABEL.exec(n).index)) || SELF_VIEW.test(n.slice(0, LABEL.exec(n).index))))) kinds.add('label');
  if (SHOULD.test(n)) kinds.add('should');
  return out;
}

/** Joins and frames that start a new clause ("…, she must hate me", "because I missed one deadline", "and now everyone…"). */
const LEAD_JOIN = /^(?:(?:and\s+now|so\s+now|and\s+then|which\s+means|that\s+means|meaning|and|but|so|because|cos|coz|since|plus|now|then|i\s+think|i\s+bet|i\s+reckon|i\s+guess|i[’']?m\s+sure(?:\s+that)?|i\s+am\s+sure(?:\s+that)?|i\s+just\s+know|i\s+know)\b[,\s]*)+/iu;
const SUBJECT = '(?:i|i[’\']?m|i[’\']?ve|i[’\']?d|i[’\']?ll|im|ive|id|ill|he|she|they|we|you|it|it[’\']?s|its|everyone|everybody|nobody|no\\s+one|people|my|our|his|her|their|the|this|that|now|then|everything|nothing|someone|somebody|what\\s+if)';
// (a comma splits only before a new clause: "…at the party, she must hate me", never "a useless, useless person")
const SPLIT = new RegExp(`[.!?…]+["”’)]*\\s*|[;:]\\s+|,\\s+(?=(?:and\\s+|but\\s+|so\\s+|because\\s+|cos\\s+|now\\s+|then\\s+|i\\s+(?:think|bet|reckon|guess|know)\\s+)?${SUBJECT}\\b)|\\s+(?=(?:and\\s+now|so\\s+now|and\\s+then|which\\s+means|that\\s+means|because|cos|coz)\\b)|\\s+(?=(?:and|but|so|plus)\\s+${SUBJECT}\\b)`, 'giu');

/**
 * The person's words in clauses: exact substrings, the joining word left off, each with its markers, the part that
 * carries them (`guess`: after a feeling of their own, only what follows it: "I'm worried I'll fail" → "I'll fail")
 * and that feeling (`feeling`, '' when there is none).
 */
export function clauses(text) {
  const src = String(text ?? '');
  const out = [];
  let at = 0;
  const push = (end) => {
    let piece = src.slice(at, end);
    const lead = LEAD_JOIN.exec(piece.trimStart());
    piece = piece.trim();
    if (lead) piece = piece.slice(lead[0].length);
    piece = piece.replace(/^[\s,;:"“(]+|[\s,;:.!?…"”)]+$/gu, '');
    if (/\p{L}/u.test(piece)) out.push(piece);
  };
  for (const m of src.matchAll(SPLIT)) { push(m.index); at = m.index + m[0].length; }
  push(src.length);
  // a clause of one or two words ("My boss", "Honestly") joins the next one: it is not a clause on its own
  const merged = [];
  for (let i = 0; i < out.length; i++) {
    const words = (out[i].match(/[\p{L}\p{N}'’]+/gu) || []).length;
    if (words <= 2 && i + 1 < out.length) {
      const a = src.indexOf(out[i]), b = src.indexOf(out[i + 1], a + out[i].length);
      if (a >= 0 && b >= 0) { out[i + 1] = src.slice(a, b + out[i + 1].length); continue; }
    }
    merged.push(out[i]);
  }
  return merged.map((c) => readClause(c));
}

export function markerKinds(text) {
  const all = new Set();
  for (const c of clauses(text)) for (const k of c.kinds) all.add(k);
  return all;
}
export const hasMarker = (text) => markerKinds(text).size > 0;

/** The clause that carries a marker (of a preferred kind first), exactly as typed, or ''. */
export function guessClause(text, prefer = []) {
  const cl = clauses(text).filter((c) => c.kinds.size);
  for (const k of prefer) { const c = cl.find((x) => x.kinds.has(k)); if (c) return c.guess; }
  return cl[0]?.guess || '';
}
/** The first clause with no marker (the stated event, or a feeling: "I'm worried" before "I'll fail"), as typed, or ''. */
export function factClause(text) {
  const cl = clauses(text);
  const plain = cl.find((c) => !c.kinds.size);
  if (plain) return plain.text;
  return cl.find((c) => c.feeling)?.feeling || '';
}
