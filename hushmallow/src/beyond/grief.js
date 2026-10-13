// Another Angle: death talk, read for recall (review round 7, the coordinator's design decision).
//
//   deathTalk(text)       → 'loss' (a death or a loss named: died, dead, passed, lost Dad, put to sleep, a
//                           miscarriage, terminal, didn't make it…) | 'grief' (grieving, a funeral, a grave,
//                           condolences…) | null
//   wantsToFollow(text)   → true when the words say they want to be with, join or follow someone, or can't (or
//                           don't want to) go on, be here or live without them
//   deathEscalation(text) → deathTalk and wantsToFollow together: the CARE support path, nothing sent
//   serverGrief(scene, text) → a server answer that reads as grief or a loss (its two lines play gently)
//
// Three rounds of reading only a "real" death never converged, and a miss is far worse than a false alarm: a
// death read as a thought got a fact-versus-guess game. So any death or loss word about anyone or anything alive
// fires, with or without its apostrophe ("my dads dead", "mums dead"), and only a short list of unambiguous
// idioms is set aside (death-words.js: a phone that died, "dead tired", "dying to", "killing it", "it's your
// funeral", "lost my keys", "passed my test"). A game, a film, a near miss or an imagined death is never set
// aside: the gentle path it falls to (lines.js GRIEF) never assumes anyone died, so it is true for all of them.
//
// Pure ES module, no DOM. Deterministic.

import { norm, blankOrdinary, PERSON, PET, BARE, ADJ, THING } from './death-words.js';

const WHO = `(?:${PERSON}|${PET})`;
/** "he", "she's", "my dad", "our cat", "the baby", "Mum", "my best friend's mum". */
const REF = `(?:\\b(?:he|she|they|hes|shes|theyre|theyve|theyd|hed|shed)\\b|\\b(?:(?:my|our|his|her|their|your|the|a)\\s+)?${ADJ}(?:${WHO})(?:s|es)?\\b|\\b(?:${BARE})s?\\b)`;
/** Little words between the person and the verb. */
const AUX = '(?:(?:is|was|has|had|have|s|are|re|ve|d|just|sadly|recently|finally|peacefully|suddenly|unexpectedly|tragically|quietly|also|both|all|then|now|already|been|forever|actually|really|truly|totally|completely|eventually|not\\s+long)\\s+)*';
/** What may follow "her" when it stands for a person, not "her keys" ("lost her in March", "lost her."). */
const FOLLOW = '(?=\\s*(?:$|[.,!?;:…)—–]|(?:and|to|in|at|when|while|last|this|that|on|yesterday|today|recently|suddenly|so|but|too|forever|before|after|during|years?|months?|weeks?|days?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|early|young|now|already|just|unexpectedly|tragically|then|as|over|for|i|we|its|it|the|because|cos|like|aged?|from|through|without)\\b))';
/** Names are only capitalised words, never these. */
const NOT_NAMES = /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|Christmas|Easter|Summer|Winter|Spring|Autumn|Twitter|Facebook|Instagram|TikTok|Netflix|Me|My|Our|The|This|That|It|To|Bank|Phone|Just|Really|Honestly|Who|Which|What|When|And|But|So|Is|Was|Has|Had|Liverpool|Arsenal|Chelsea|Everton|United|City|England|Scotland|Wales|Ireland|France|Spain|Fortnite|Minecraft|Roblox|Xbox|God|Jesus|Him|Her|Them|Again|Today|Tonight|Now|Everything|Everyone|Everybody|Nobody|Nothing|Something|Someone|Anything|Ten|One|Two|Three|Four|Five|Time|Life|Yesterday|Week|Year|Month|Weekend|Day|Night|Morning|Lunch|Dinner|Breakfast|Tea|Money|Love|Hope|Work|School|Uni|College|Class|Exam|Test|Summer|Moment|Chance|Pain|Fear|Feeling|Anger|Worry|Storm|Rain|Snow|Sun|Battery|Signal|Wifi|Internet|Train|Bus|Car|Coffee|Food|Milk|Party|Show|Match|Game|Season|Term|Holiday|Deadline|He|She|They|We|You|I|Im|Its|Hes|Shes|Theyre|Mum|Dad|Mom|Nan|Gran|Grandad|Grandma|Here|There|Then|Why|How|If|Oh|Well|Yes|No|Sorry|Please|Thanks|Ok|Okay)$/u;

/** "put down" that is a nap, a floor or a bed, never a death ("put him down for a nap", "put her down on the sofa"). */
const PUT_TAIL = '(?!\\s+(?:on\\s+(?:the|a|an|my|his|her|their|our|top|its|it|to)|onto|in\\s+(?:the|a|his|her|their|my|its|our)\\s+(?:bed|cot|crate|basket|cage|box|hutch|kennel|room|garden|pen|car)|into|for|gently|next|beside|by|at\\s+(?:the|my|his|her|their)|so\\s+(?:i|we|he|she|they)|while|carefully|quickly|again|the|a|my)\\b)';
/** "she was put to sleep", "the vet put him down", "he had to be put down": only with a pet named in the words. */
const PET_PUT = new RegExp(`\\b(?:put|putting|puts)\\s+(?:him|her|it|them)\\s+(?:down|to\\s+sleep)\\b${PUT_TAIL}|\\b(?:been|be|being|was|were|got|get|getting|is|s)\\s+put\\s+(?:down|to\\s+sleep)\\b${PUT_TAIL}|\\bput\\s+to\\s+sleep\\b|\\bpts\\b`, 'iu');
const PET_WORD = new RegExp(`\\b(?:${PET})s?\\b`, 'iu');
/** A death or a loss, named ('loss'). Each is read on the normed words with the ordinary idioms blanked. */
const LOSS_WORDS = [
  // die, died, dying, dead, death, deceased (and "dide", "dieing")
  /\b(?:die|dies|died|dide|diedd|dying|dieing|dyin|dead|deaths?|deceased|decesed|deseased|deceaced|fatal|fatally|perished|slain)\b/iu,
  // passed away (and its misspellings), passing away, his passing
  /\b(?:pass(?:ed|es|ing|d)?|past|pased|passt)\s+(?:away|awy|awat|awya|aways|awaay|awya)\b/iu,
  new RegExp(`(?:\\b(?:his|her|their)|${REF})\\s+passing\\b|\\bpassing\\s+of\\s+(?:(?:my|our|his|her|their|the)\\s+)?${ADJ}(?:${WHO}|${BARE})`, 'iu'),
  // passed on (never "passed on the message / my CV / her love of baking")
  /\bpassed\s+on\b(?!\s+(?:the(?!\s+\d)|a|an|his|her|my|their|our|your|its|this|that|these|those|it|them|him|me|us|you|some|any|what|news|word|messages?|info\w*|details?|notes?|to|from|through|by|down|everything|something|anything|nothing|bad|good)\b)/iu,
  // "my dad passed last year", "Mum's passed", "she passed in her sleep" (an exam passed is an idiom, blanked)
  new RegExp(`${REF}\\s+${AUX}passed\\b`, 'iu'),
  // killed, murdered, suicide, took his own life, drowned
  /\b(?:killed|murdered|murder|suicide|drowned|overdosed|euthani[sz]ed|euthanasia)\b/iu,
  /\btook\s+(?:his|her|their|my|your)\s+own\s+life\b|\b(?:killed|hanged|hung|shot)\s+(?:himself|herself|themselves|themself)\b/iu,
  // lost / losing my dad, our baby, a friend, Dad (never "lost my dad's ring")
  new RegExp(`\\b(?:lost|losing|lose|loses)\\s+(?:(?:my|our|his|her|their|your|the|a|an|another|both|two|three|all)\\s+)?${ADJ}(?:${WHO})(?:s|es)?\\b(?!\\s+(?:${THING})\\b)`, 'iu'),
  new RegExp(`\\b(?:lost|losing|lose)\\s+(?:him|them|her${FOLLOW})\\b`, 'iu'),
  // the loss of my mum, sorry for your loss, since our loss
  new RegExp(`\\bloss\\s+of\\s+(?:(?:my|our|his|her|their|your|a|an|the)\\s+)?${ADJ}(?:${WHO}|${BARE})(?:s|es)?\\b(?!\\s+(?:${THING})\\b)|\\bsorry\\s+for\\s+(?:your|their|his|her|the)\\s+loss\\b|\\b(?:since|after|before|grieving|grieve|through|with|over|following)\\s+(?:my|our|the|this|his|her|their)\\s+loss\\b`, 'iu'),
  // she's gone, he's gone now, my mum's gone, they're gone (never gone to work: an idiom, blanked)
  new RegExp(`${REF}\\s+${AUX}gone\\b(?!\\s+(?:and\\s+(?:done|got|bought|made|said|told|ruined|broken|lost|messed|eaten)|to(?!\\s+(?:heaven|a\\s+better\\s+place|be\\s+with|sleep|rest|god|jesus|the\\s+angels|the\\s+rainbow\\s+bridge))|out|home|off|back|away|abroad|on|in(?!\\s+(?:peace|(?:his|her|their)\\s+sleep))|into|with|by|past|ahead|along|up|down|over|through|round|around|for|missing\\s+from|already\\s+to)\\b)`, 'iu'),
  // no longer with us, in heaven, the rainbow bridge, earned his wings
  /\bno\s+longer\s+(?:with\s+us|here|around|alive|living|with\s+me)\b|\bnot\s+with\s+us\s+any\s*more\b|\b(?:isnt|is\s+not|arent|not|no\s+longer)\s+alive\b/iu,
  /\b(?:in|to|up\s+in|into)\s+heaven\b|\bheaven\s+(?:gained|has\s+gained)\b|\brainbow\s+bridge\b|\bearned\s+(?:his|her|their)\s+wings\b|\bgained\s+(?:an|another|a\s+new)\s+angel\b|\bangel\s+baby\b|\b(?:passed|crossed)\s+over\b|\bin\s+a\s+better\s+place\b|\b(?:laid|lay|laying)\s+(?:him|her|them|\w+)\s+to\s+rest\b|\bresting\s+in\s+peace\b|\bwatching\s+(?:over|down\s+on)\s+(?:me|us)\b/iu,
  // a pet put down or put to sleep: "we had to put our dog down", "the vet put her to sleep" (pronoun or passive:
  // with a pet named in the words; PET_PUT below)
  new RegExp(`\\b(?:put|putting|puts|had|have|having|get|got)\\s+(?:(?:to\\s+have|to)\\s+)?(?:(?:my|our|the|his|her|their)\\s+)?${ADJ}(?:${PET})s?\\s+(?:put\\s+)?(?:down|to\\s+sleep)\\b${PUT_TAIL}`, 'iu'),
  // a baby lost before or at birth
  /\b(?:miscarri(?:ed|age|ages)|miscarrage|miscarage|misscarriage|misscarried|stillborn|still\s+born|stillbirth|still\s+birth|ectopic|tfmr)\b/iu,
  // dying soon: terminal, hospice, life support, end of life, didn't make it, weeks to live
  /\bterminal(?:ly)?\s+(?:ill|illness|cancer|diagnosis|condition|disease|brain|tumou?r|stage|prognosis)\b|\b(?:is|s|was|its|are|now|been|went|gone|turned|as)\s+terminal\b|\bhospice\b|\blife\s+support\b|\bend\s+of\s+(?:life|(?:his|her|their)\s+life)\b|\bpalliative\b|\b(?:days|weeks|months|hours)\s+(?:left\s+)?to\s+live\b/iu,
  new RegExp(`${REF}\\s+(?:(?:is|s|are|re|was|were|might|may|probably|likely)\\s+)*(?:did\\s+not|didnt|never|not|isnt|arent|wasnt|wont|will\\s+not|might\\s+not|may\\s+not|mightnt|couldnt|could\\s+not)\\s+(?:going\\s+to\\s+|gonna\\s+)?(?:make\\s+it|survive|pull\\s+through|wake\\s+up)\\b(?!\\s+(?:to\\s+(?:the\\s+)?(?:party|work|school|class|meeting|match|game|gym|shop|shops|interview|concert|gig|show|wedding|bus|train|station|airport|final|finals|team|squad|cut|end|top|club|pub|cinema|event|lesson|practice|training)|in\\s+time|on\\s+time|into\\s+(?:the|my|his|her)\\s+(?:team|squad|final|uni|college|school|club|band)|home\\s+for|back\\s+(?:in\\s+time|for)|for\\s+(?:the|my|his|her)|until|till|before\\s+(?:10|11|noon|lunch)|through\\s+(?:the\\s+)?(?:interview|audition|trials?|round|first|second|qualif\\w*|exam|test|week|day|shift|meeting)))`, 'iu'),
  // my late husband
  new RegExp(`\\b(?:my|our|his|her|their|your)\\s+late\\s+${ADJ}(?:${WHO})\\b`, 'iu'),
  // a widow, an orphan
  /\b(?:widow|widowed|widower|orphan|orphaned)\b/iu,
];
/** Grieving, a funeral, a grave, condolences ('grief' when no death is named). */
const GRIEF_WORDS = [
  /\b(?:grief|griefs|griefstricken|grief\s+stricken|greif|greiving|grieving|grieve|grieves|grieved|mourn|mourning|mourned|mourns|mourner|mourners|bereaved|bereavement|berevement|bereavment|condolences?|condolances?|sympathy\s+card)\b/iu,
  /\b(?:funerals?|funral|funerel|funreal|grave|graves|graveside|gravestone|graveyard|headstone|cemetery|cemetary|cemetry|crematorium|cremated|cremation|burial|buried|bury|burying|coffin|casket|hearse|obituary|eulogy|memorial\s+service|urn)\b/iu,
  new RegExp(`\\b(?:his|her|their|(?:${WHO}|${BARE})s?)\\s+ashes\\b|\\bscatter\\w*\\s+(?:the\\s+|(?:his|her|their|my|our)\\s+)?(?:[a-z]+\\s+)?ashes\\b|\\bashes\\s+(?:of|were|are|scattered)\\b`, 'iu'),
  /\b(?:at|after|to|for|before|from)\s+(?:the|his|her|their|(?:my|our)\s+[a-z]+s)\s+wake\b(?!\s+up)/iu,
];
/** RIP about someone ("RIP Grandad", "RIP to my dog", "Nana RIP", "rest in peace"), never "RIP my phone" (blanked). */
const RIP = [
  /\bRIP\b/u,
  new RegExp(`\\brip\\b(?=\\s+(?:(?:to|my|our|dear|sweet|little|lovely|beautiful|darling|baby|big|old)\\s+)*(?:${WHO}|${BARE})\\b)|\\b(?:${WHO}|${BARE})s?[,\\s]+rip\\b`, 'iu'),
  new RegExp(`\\brest\\s+in\\s+peace\\b|\\b(?:fly\\s+high|rest\\s+easy|sleep\\s+tight)\\s+(?:(?:my|our|little|sweet|baby|beautiful)\\s+)*(?:angel|${WHO}|${BARE})\\b`, 'iu'),
];
/** A capitalised name beside a death ("We lost Sam in May", "RIP Sarah", "Tom passed away"). */
const NAMED = [
  new RegExp(`\\b[Ll]ost\\s+(?<nm>[A-Z][a-z]+)${FOLLOW}`, 'u'),
  /\b(?<nm>[A-Z][a-z]+)s?\s+(?:(?:has|had|is|was|just|sadly)\s+)*(?:passed|gone)\b(?!\s+(?:to|out|home|off|back|away|my|his|her|the|a|an|me|us|it|them|him|by|through)\b)/u,
];

/** True when `re` matches `t` with a name (if it carries one) that really is a name. */
function hit(re, t) {
  const m = re.exec(t);
  if (!m) return false;
  const nm = m.groups?.nm;
  return !nm || !NOT_NAMES.test(nm);
}

/**
 * 'loss' when a death or a loss is named, 'grief' for grieving, a funeral or a grave without one, else null.
 * Fires on any of these words about anyone or anything alive; only the idioms in death-words.js are set aside.
 */
export function deathTalk(text) {
  const raw = norm(text);
  if (!/\p{L}/u.test(raw)) return null;
  const t = blankOrdinary(raw);
  if (LOSS_WORDS.some((re) => re.test(t)) || NAMED.some((re) => hit(re, t)) || RIP.slice(0, 2).some((re) => re.test(t))) return 'loss';
  if (PET_WORD.test(t) && PET_PUT.test(t)) return 'loss';
  if (GRIEF_WORDS.some((re) => re.test(t)) || RIP[2].test(t)) return 'grief';
  return null;
}

/**
 * Someone still alive but going, or gone in another way ("my nan has dementia", "my grandad doesn't know who I am
 * any more"): no death word, but never a game either. Read for recall: dementia or Alzheimer's anywhere, or
 * someone who no longer knows them. The gentle path's lines are true for it (backstop.js gentleRoute).
 */
const LIVING_LOSS = /\b(?:dementia|alzheimers?|alzheimer)\b|\b(?:doesnt|does\s+not|didnt|did\s+not|cant|cannot|can\s+not|no\s+longer|wont|will\s+not|couldnt)\s+(?:even\s+|really\s+)?(?:know\s+who\s+(?:i\s+am|we\s+are)|know\s+(?:me|us)\s+any\s*more|recogni[sz]e\s+(?:me|us)|remember\s+(?:me|us|who\s+i\s+am|my\s+name|our\s+names))\b/iu;
export function livingLoss(text) {
  return LIVING_LOSS.test(norm(text));
}

// ----------------------------------------------------------------- escalation --
/** "him", "her", "them" standing for the person (never "her family", "them at the funeral"). */
const PRON_TAIL = '(?=\\s*(?:$|[.,!?;:…)—–]|(?:again|now|forever|soon|so|too|already|right\\s+now|tonight|in\\s+heaven|up\\s+there|wherever|where|on\\s+the\\s+other\\s+side|and|but|because|cos|i|im|so\\s+much|more\\s+than\\s+anything|one\\s+day|someday|someway|somehow|instead|properly|there|here|that|its|it|please|honestly|really|just|anymore|any\\s+more|like|or)\\b))';
/** "my dad", "Mum", "Sam": a person after "be with", "join", "without" (checked against who died, below). */
const OBJ_PERSON = `(?:(?:my|our|his|her|their)\\s+)?${ADJ}(?<who>${WHO}|${BARE})s?\\b|\\b(?<nm>[A-Z][a-z]+)\\b`;
/** What says it is about the one who died wherever they are ("again", "in heaven", "up there"). */
const AFTER = /^\s+(?:again|forever|in\s+heaven|up\s+there|wherever|where\s+(?:he|she|they|hes|shes|theyre)|on\s+the\s+other\s+side|once\s+and\s+for\s+all)\b/iu;
const WANT = '(?:want|wanna|wanted|need|needed|long|longing|wish\\s+i\\s+could|wish\\s+i\\s+was|wish\\s+i\\s+were|wish\\s+id\\s+be|would\\s+rather|id\\s+rather|ready|cant\\s+wait|just\\s+want|only\\s+want|going|gonna|will|ill|could|should|time|yearn|yearning|desperate|have)';
/** Who died, by the word the person used for them ("my nan died" → nan), so "be with my nan" means her. */
const DECEASED = [
  new RegExp(`(?<who>${WHO}|${BARE})s?\\s+${AUX}(?:died|dide|dead|passed|gone|killed|murdered|drowned|no\\s+longer|not\\s+with|in\\s+heaven|put\\s+(?:down|to\\s+sleep)|didnt\\s+make\\s+it)\\b`, 'giu'),
  new RegExp(`\\b(?:lost|losing|loss\\s+of|death\\s+of|funeral\\s+of|since|after)\\s+(?:(?:my|our|his|her|their|the)\\s+)?${ADJ}(?<who>${WHO}|${BARE})s?\\b`, 'giu'),
  /\b(?<nm>[A-Z][a-z]+)s?\s+(?:(?:has|had|is|was|just|sadly)\s+)*(?:died|dead|passed|gone|killed)\b/gu,
  /\b(?:lost|RIP|rip)\s+(?<nm>[A-Z][a-z]+)\b/gu,
];
const FOLLOW_RES = [
  // be with / go and be with / be where they are
  new RegExp(`\\b${WANT}\\s+(?:to\\s+)?(?:go\\s+(?:and\\s+)?|just\\s+)?(?:be|go|get|belong|lie|rest)\\s+(?:back\\s+)?with\\s+(?:(?:him|her|them)${PRON_TAIL}|(?:${OBJ_PERSON}))`, 'giu'),
  /\b(?:belong|be|go|get|want\s+to\s+be|need\s+to\s+be)\s+(?:back\s+)?with\s+(?:him|her|them)\s+(?:again|forever|in\s+heaven|up\s+there|soon)\b/giu,
  // join / follow them
  new RegExp(`\\b${WANT}\\s+(?:to\\s+)?(?:go\\s+(?:and\\s+)?|just\\s+)?join\\s+(?:(?:him|her|them)${PRON_TAIL}|(?:${OBJ_PERSON}))`, 'giu'),
  /\b(?:want|wanna|need|wish\s+i\s+could|going|gonna|will|ill|could|should|just|ready|cant\s+wait|id|i\s+would|i\s+could)\s+(?:to\s+)?(?:just\s+)?follow\s+(?:him|her|them)(?=\s*(?:$|[.,!?;:…]|(?:now|soon|there|wherever|too|into\s+(?:the\s+)?(?:dark|darkness|grave|ground|next|death)|to\s+(?:heaven|the\s+other\s+side)|and|but|i|so)\b))/giu,
  // go where she is (never "where she is buried"), go to her, go with him, go too
  /\b(?:go|be|get|want\s+to\s+go|want\s+to\s+be)\s+(?:to\s+)?where(?:ver)?\s+(?:he|she|they|hes|shes|theyre)\b(?!(?:\s+(?:is|are|s|re|was|were|has\s+been|have\s+been|is\s+now|lies|lay))?\s+(?:buried|laid|resting|scattered|cremated|kept|from|working|living|staying))/giu,
  new RegExp(`\\b${WANT}\\s+(?:to\\s+)?go\\s+(?:to|with)\\s+(?:him|her|them)${PRON_TAIL}`, 'giu'),
  /\b(?:wish|wished)\s+(?:that\s+)?(?:i|id|i\s+had|i\s+could|i\s+could\s+have|i\s+couldve|i\s+would\s+have|i\s+wouldve)\s+(?:have\s+)?(?:gone|went|go|died|left|been\s+taken|been\s+killed)\s+(?:with|instead\s+of|alongside)\s+(?:him|her|them|\w+)\b|\bshould\s+(?:have|ve|of)\s+(?:gone|died)\s+with\s+(?:him|her|them)\b/giu,
  /\b(?:want|wanna|wanted|need|ready)\s+to\s+(?:go|die|leave|come)\s+(?:too|as\s+well|with\s+(?:him|her|them))\b|\btake\s+me\s+(?:with\s+(?:him|her|them|you)|too|instead|as\s+well)\b|\bwhy\s+didnt\s+(?:he|she|they|god)\s+take\s+me\b/giu,
  // it should have been me
  /\b(?:it\s+)?should\s+(?:have|ve|of)\s+been\s+me\b|\bwish\s+(?:it\s+)?(?:was|were|had\s+been)\s+me\b|\bwhy\s+(?:wasnt|couldnt)\s+it\s+(?:have\s+been\s+|be\s+)?me\b/giu,
  // can't / don't want to go on, be here or live without them; what's the point without her
  new RegExp(`\\b(?:cant|cannot|can\\s+not|dont\\s+want\\s+to|do\\s+not\\s+want\\s+to|dont\\s+wanna|dont\\s+know\\s+how\\s+to|dont\\s+know\\s+if\\s+i\\s+can|no\\s+point(?:\\s+in)?|whats\\s+the\\s+point(?:\\s+(?:of|in))?|what\\s+is\\s+the\\s+point(?:\\s+(?:of|in))?|theres\\s+no\\s+point(?:\\s+in)?|there\\s+is\\s+no\\s+point(?:\\s+in)?|no\\s+reason\\s+to|not\\s+worth|dont\\s+see\\s+the\\s+point(?:\\s+(?:of|in))?|cant\\s+see\\s+the\\s+point(?:\\s+(?:of|in))?|wont|will\\s+not|refuse\\s+to|how\\s+(?:can|do|am)\\s+i\\s+(?:supposed\\s+to\\s+)?|why\\s+(?:should|would)\\s+i)\\s+(?:(?:go(?:ing)?\\s+on(?:\\s+living)?|carry(?:ing)?\\s+on|keep(?:ing)?\\s+going|be(?:ing)?\\s+here|be(?:ing)?\\s+alive|stay(?:ing)?\\s+alive|stay(?:ing)?|liv(?:e|ing)|exist(?:ing)?|surviv(?:e|ing)|do(?:ing)?\\s+(?:life|this|it|anything|any\\s+of\\s+this)|fac(?:e|ing)\\s+(?:life|this|it|anything|the\\s+world|tomorrow|another\\s+day|the\\s+future)|breath(?:e|ing)|get(?:ting)?\\s+up|wak(?:e|ing)\\s+up|bother(?:ing)?|try(?:ing)?|life|anything|everything|it|this|any\\s+more|anymore|here|now)\\s+)?(?:any\\s*more\\s+)?without\\s+(?:(?:him|her|them)(?=\\s*(?:$|[.,!?;:…]|(?:here|around|in\\s+my\\s+life|by\\s+my\\s+side|with\\s+me|any\\s*more|now|and|so|but|i|its|it|to|anyway|though|really|honestly|either|at\\s+all|beside\\s+me|there|in\\s+it|in\\s+the\\s+world|alive)\\b))|(?:${OBJ_PERSON}))`, 'giu'),
  /\blife\s+(?:is|isnt|feels|seems|has\s+been|would\s+be|will\s+be)\s+(?:so\s+|just\s+|completely\s+)?(?:pointless|meaningless|empty|not\s+worth\s+(?:it|living)|worthless|nothing|over)\s+without\b|\bno\s+life\s+without\b|\bnothing\s+(?:left\s+)?to\s+live\s+for\b|\bno\s+reason\s+to\s+(?:live|go\s+on|be\s+here|keep\s+going)\b/giu,
  // soon: "I'll be with him soon", "not long till I'm with her"
  /\b(?:ill|i\s+will|im\s+going\s+to|i\s+am\s+going\s+to|im\s+gonna|i\s+hope\s+(?:i|ill)|cant\s+wait\s+to|not\s+long\s+(?:until|till|til)\s+(?:i|im))\s+(?:be\s+with|see|join|meet|hold|be\s+back\s+with)\s+(?:him|her|them|\w+)\s+(?:again\s+)?soon\b|\bnot\s+long\s+(?:until|till|til)\s+(?:i|im)\s+(?:with|beside)\s+(?:him|her|them)\b/giu,
  // reunited with them
  /\b(?:want|wanna|wish|cant\s+wait|long|ready|need|hope|going)\s+(?:to\s+)?(?:be\s+)?reunit(?:e|ed)\s+with\b/giu,
];

/** Who died, by the words used for them (lower-case person words, and names as typed). */
function deceased(t, cased) {
  const out = new Set();
  for (const re of DECEASED) {
    re.lastIndex = 0;
    for (const m of (re.flags.includes('i') ? t : cased).matchAll(re)) {
      if (m.groups?.who) out.add(m.groups.who.toLowerCase());
      if (m.groups?.nm && !NOT_NAMES.test(m.groups.nm)) out.add(m.groups.nm.toLowerCase());
    }
  }
  return out;
}
/**
 * True when the words say they want to be with, join or follow someone, or can't (or don't want to) go on,
 * be here or live without them. "Be with my mum" counts only when Mum is the one who died, or with "again",
 * "in heaven" or "up there"; "be with her" counts unless it is a plan with the living ("at the funeral", "this
 * weekend"). Read only beside death talk (deathEscalation).
 */
export function wantsToFollow(text) {
  const cased = blankOrdinary(norm(text));
  const t = cased.toLowerCase();
  if (!/\p{L}/u.test(t)) return false;
  const gone = deceased(t, cased);
  for (const re of FOLLOW_RES) {
    re.lastIndex = 0;
    const src = re.source.includes('(?<nm>') ? cased : t;
    for (const m of src.matchAll(re)) {
      const who = m.groups?.who?.toLowerCase(), nm = m.groups?.nm;
      if (!who && !nm) return true;
      // (a name is a capitalised word as typed, never "be with friends")
      if (nm && (NOT_NAMES.test(nm) || !/^\p{Lu}/u.test(nm))) continue;
      const name = (who || nm).toLowerCase();
      // "my other cat" is never the one who died
      if (/\bother\b/iu.test(m[0])) continue;
      // "without my dad" always counts; "be with my dad" / "join my dad" only when he is the one who died, or "again"
      const after = src.slice(m.index + m[0].length);
      if (/without\s+/iu.test(m[0]) || gone.has(name) || AFTER.test(after)) return true;
    }
  }
  return false;
}
/** Death talk that also says they want to follow the one who died: the CARE support path (nothing is sent). */
export function deathEscalation(text) {
  return !!deathTalk(text) && wantsToFollow(text);
}

// --------------------------------------------------------------- the server --
const GRIEF_EMOTIONS = new Set(['grief', 'mourning', 'bereft', 'heartache', 'anticipatory-grief']);
/**
 * A server answer that reads as grief or a loss: for death talk, a scene about a loss or a grieving feeling (the
 * server sees the whole context); for other words, a loss scene beside a grieving feeling or a heavy harm word
 * the ordinary idioms don't explain (backstop.js). Its two lines play gently; its mechanic never does. A lost
 * job, a lost match or a phone that died is never one.
 */
export function serverGrief(scene, text = '', { heavy = null } = {}) {
  if (scene?.source !== 'server') return false;
  const loss = scene.situation_type === 'loss';
  const griefEmotion = GRIEF_EMOTIONS.has(String(scene.emotion || '').toLowerCase());
  if (deathTalk(text)) return loss || griefEmotion;
  return loss && (griefEmotion || !!heavy?.(text));
}
