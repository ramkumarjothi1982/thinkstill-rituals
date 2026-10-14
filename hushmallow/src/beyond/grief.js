// Another Angle: death talk, read for recall (review round 7, the coordinator's design decision).
//
//   deathTalk(text)       → 'loss' (a death or a loss named: died, dead, passed, lost Dad, put to sleep, a
//                           miscarriage, terminal, didn't make it…) | 'grief' (grieving, a funeral, a grave,
//                           condolences…) | null
//   wantsToFollow(text)   → true when the words say they want to be with, join or follow someone, or can't (or
//                           don't want to) go on, be here or live without them (review r9: "keep wishing", heaven,
//                           "see him again", typos; "be with my dad, he died" and "my son who passed" name who died)
//   stillAlive(text)      → the only death talk is present or future: dying, intensive care, might not make it,
//                           close to death (review r9): wanting to be at their side is love, never care
//   deathEscalation(text) → deathTalk and wantsToFollow together: the CARE support path, nothing sent
//   serverGrief(scene, text) → a server answer that reads as grief or a loss (its two lines play gently)
//   strongLoss(text)      → (re-exported from backstop.js, review r11) a person within four words of a strong loss cue:
//                           the main screen's backstop (input-overlay readSafety reads it as concern / loss)
//   unsureLoss(text), griefFeeling(id), lossRoute(text, {emotion}) → (re-exported from backstop.js; owner decision 'Ask when
//                           unsure', 14 Oct 2026) not sure: both screens ask "Is this about losing someone?" (lossRoute 'ask')
//
// Three rounds of reading only a "real" death never converged, and a miss is far worse than a false alarm: a
// death read as a thought got a fact-versus-guess game. So any death or loss word about anyone or anything alive
// fires, with or without its apostrophe ("my dads dead", "mums dead"), and only a short list of unambiguous
// idioms is set aside (death-words.js: a phone that died, "dead tired", "dying to", "killing it", "it's your
// funeral", "lost my keys", "passed my test"). A game, a film, a near miss or an imagined death is never set
// aside: the gentle path it falls to (lines.js GRIEF) never assumes anyone died, so it is true for all of them.
//
// Review r10 added the phrase families the round-3 review found outside every list (a disease or an accident as the
// subject, "kicked the bucket", "no heartbeat", "laid to rest", "ODd", "went peacefully", "shiva", "would have been mums
// 60th"…) and, for escalation, "I'd like to be with him", "thinking of joining her", "without her, what's the point";
// "can't go on" counts only where it says living goes on (never "go on holiday", "carry on working").
//
// Review r11 added the round-4 review's euphemisms and slang ("met his maker", "breathed his last", "pushing up daisies",
// "called home to God", "bit the dust", "carked it", "copped it", "popped off", "gave up the fight", "went to a better
// place", "gone to his long home", "since he went" with "miss"), a killer that "got" them ("covid got my grandad"),
// "took my brother from us", "say goodbye to our baby", "never woke", "couldn't save him", "met his end", and "lie down
// next to her forever" for escalation. A plant that died and a dead party are ordinary idioms now (death-words.js).
//
// Owner decision 'Ask before every world' (14 Oct 2026): every Tell that is not a detected loss is asked first ("Shall we
// look at this from another angle, or just be with it?", angle-first.js), so a phrasing these lists miss is never played
// without the person choosing it. What is read here is now for the unambiguous only, and a false gentle path on ordinary
// words is the costlier mistake: the round-5 families that over-fired are narrowed ("never came to my football match",
// "came round to mine", "my knee never recovered", "the baby is over at my mum's", "terminated his contract on medical
// grounds", "shot with a tranquiliser", "isn't with us now, she's at uni", "at peace in her new care home"); the reviews'
// unambiguous misses are read (memorial, coroner, "my late father's flat", "nothing more they could do", "topped himself",
// "my dad's time came", "my uncle's brown bread"); and doing what the one who died did ("I keep thinking about doing the
// same") or joining them is an escalation (care).
//
// Pure ES module, no DOM. Deterministic.

import { norm, blankOrdinary, PERSON, PET, BARE, ADJ, THING, KILLERS, ORDINALS } from './death-words.js';
import { acknowledges } from './backstop.js';
// (review r11) the main screen's strong-cue loss backstop, read through grief.js (input-overlay loads only this module);
// (owner decision 'Ask when unsure') and the check-in's reading, the grief-family feelings and the route both screens take
export { strongLoss, unsureLoss, griefFeeling, lossRoute } from './backstop.js';

const WHO = `(?:${PERSON}|${PET})`;
/** "he", "she's", "my dad", "our cat", "the baby", "Mum", "my best friend's mum". */
const REF = `(?:\\b(?:he|she|they|hes|shes|theyre|theyve|theyd|hed|shed)\\b|\\b(?:(?:my|our|his|her|their|your|the|a)\\s+)?${ADJ}(?:${WHO})(?:s|es)?\\b|\\b(?:${BARE})s?\\b)`;
/** Little words between the person and the verb. */
const AUX = '(?:(?:is|was|has|had|have|s|are|re|ve|d|just|sadly|recently|finally|peacefully|suddenly|unexpectedly|tragically|quietly|also|both|all|then|now|already|been|forever|actually|really|truly|totally|completely|eventually|not\\s+long)\\s+)*';
/** What may follow "her" when it stands for a person, not "her keys" ("lost her in March", "lost her."). */
const FOLLOW = '(?=\\s*(?:$|[.,!?;:…)—–]|(?:and|to|in|at|when|while|last|this|that|on|yesterday|today|recently|suddenly|so|but|too|forever|before|after|during|years?|months?|weeks?|days?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|early|young|now|already|just|unexpectedly|tragically|then|as|over|for|i|we|its|it|the|because|cos|like|aged?|from|through|without)\\b))';
/** Names are only capitalised words, never these. */
const NOT_NAMES = /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|Christmas|Easter|Summer|Winter|Spring|Autumn|Twitter|Facebook|Instagram|TikTok|Netflix|Me|My|Our|The|This|That|It|To|Bank|Phone|Just|Really|Honestly|Who|Which|What|When|And|But|So|Is|Was|Has|Had|Liverpool|Arsenal|Chelsea|Everton|United|City|England|Scotland|Wales|Ireland|France|Spain|Fortnite|Minecraft|Roblox|Xbox|God|Jesus|Him|Her|Them|Again|Today|Tonight|Now|Everything|Everyone|Everybody|Nobody|Nothing|Something|Someone|Anything|Ten|One|Two|Three|Four|Five|Time|Life|Yesterday|Week|Year|Month|Weekend|Day|Night|Morning|Lunch|Dinner|Breakfast|Tea|Money|Love|Hope|Work|School|Uni|College|Class|Exam|Test|Summer|Moment|Chance|Pain|Fear|Feeling|Anger|Worry|Storm|Rain|Snow|Sun|Battery|Signal|Wifi|Internet|Train|Bus|Car|Coffee|Food|Milk|Party|Show|Match|Game|Season|Term|Holiday|Deadline|He|She|They|We|You|I|Im|Its|Hes|Shes|Theyre|Mum|Dad|Mom|Nan|Gran|Grandad|Grandma|Here|There|Then|Why|How|If|Oh|Well|Yes|No|Sorry|Please|Thanks|Ok|Okay|Ill|Id|Ive|Youre|Youll|Youve|Theyll|Theyve|Shell|Hell|Wed|Weve|Dont|Cant|Wont|Didnt|Isnt|Wasnt|Couldnt|Shouldnt|Wouldnt|Thats|Whats|Theres|Heres|Lets|Since|After|Before|Because|Cos|Today|Last|Part|All|Only|Maybe|Sometimes|Even|Still|Mom|Mama|Papa|Daddy|Mummy|Nana|Nanny|Granny|Grandpa|Gramps|Nonna|Nonno)$/u;

/** "put down" that is a nap, a floor or a bed, never a death ("put him down for a nap", "put her down on the sofa"). */
const PUT_TAIL = '(?!\\s+(?:on\\s+(?:the|a|an|my|his|her|their|our|top|its|it|to)|onto|in\\s+(?:the|a|his|her|their|my|its|our)\\s+(?:bed|cot|crate|basket|cage|box|hutch|kennel|room|garden|pen|car)|into|for|gently|next|beside|by|at\\s+(?:the|my|his|her|their)|so\\s+(?:i|we|he|she|they)|while|carefully|quickly|again|the|a|my)\\b)';
/** "she was put to sleep", "the vet put him down", "he had to be put down": only with a pet named in the words. */
const PET_PUT = new RegExp(`\\b(?:put|putting|puts)\\s+(?:him|her|it|them)\\s+(?:down|to\\s+sleep)\\b${PUT_TAIL}|\\b(?:been|be|being|was|were|got|get|getting|is|s)\\s+put\\s+(?:down|to\\s+sleep)\\b${PUT_TAIL}|\\bput\\s+to\\s+sleep\\b|\\bpts\\b`, 'iu');
const PET_WORD = new RegExp(`\\b(?:${PET})s?\\b`, 'iu');
/** "she was put to sleep" (review r9), never "put to sleep for the operation". */
const PUT_TO_SLEEP = /\b(?:was|were|been|be|being|got|get|getting|is|s|are|re)\s+put\s+to\s+sleep\b(?!\s+(?:for|during|before|while|with)\s+(?:the|an|a|her|his|my|their|our)?\s*(?:op|operation|surgery|procedure|scan|anaesthetic|anesthetic|mri|ct|biopsy|tooth|teeth))/iu;
/** What "my … passed" never names (review r9: "my application passed", "my driving test passed"). */
const PASS_NOT = 'cold|colds|flu|fever|headache|migraine|pain|ache|anxiety|panic|attack|attacks|mood|nausea|sickness|bug|virus|cough|rash|worry|worries|fear|fears|urge|urges|craving|cravings|wave|feeling|feelings|stress|period|cramps|test|tests|exam|exams|application|applications|proposal|motion|bill|request|deadline|time|turn|moment|chance|storm|day|days|week|weeks|month|months|year|years|weekend|summer|holiday|car|van|bike|phone|order|parcel|package|plan|idea|vote|appeal|claim|case|interview|audition|trial|trials|inspection|mot|driving|theory|assessment|probation|grade|grades|course|module|degree|essay|paper|work|project|code|build|review|stone|stones|kidney|gallstone|results?|loan|mortgage|visa|check|checks|medical|exams|gcses?|a|the|an|this|that|first|last|own';
/** What may follow "passed" when something else is passed ("passed the ball", "passed me the salt", "passed through"). */
const PASS_OBJ = 'the|a|an|my|his|her|their|our|your|its|me|us|him|them|it|this|that|these|those|all|every|both|some|any|round|around|over|through|along|across|into|onto|with|first|second|third|easily|comfortably|well|to(?!\\s+(?:heaven|be\\s+with|the\\s+other\\s+side|god|the\\s+lord|jesus|glory|spirit|the\\s+angels|a\\s+better\\s+place))|on\\s+(?:the|a|an|my|his|her|their|our|your)\\s+(?:message|messages|news|word|info|details|note|notes|tip|tips|advice|cold|bug|virus|flu|baton|torch|invite|offer|job|chance|deal|idea|feedback|request|link|number|email|letter|card|cv)';
/** Who a killer takes or gets: "my grandad", "both my grandparents", "him" (review r11). */
const TAKEN_WHO = `(?:(?:(?:both|all|two|three|four)\\s+(?:of\\s+)?)?(?:(?:my|our|his|her|their)\\s+)?${ADJ}(?:${WHO}|${BARE})s?\\b|(?:him|her|them)\\b)`;
/** …and who a killer "got" (never their things: "the fire got my dads car"). */
const GOT_WHO = `(?:(?:(?:both|all|two|three|four)\\s+(?:of\\s+)?)?(?:(?:my|our|his|her|their)\\s+)?${ADJ}(?:${WHO}|${BARE})s?\\b(?!\\s+(?:${THING})\\b)|(?:him|her|them)\\b)`;
/** (review r12) What takes a pet: "my rabbit was taken by a fox", "a fox got our chickens". */
const PREDATORS = 'fox|foxes|hawk|hawks|eagle|owl|badger|badgers|coyote|coyotes|wolf|wolves|stoat|weasel|mink|dog|dogs|cat|cats|snake|bird\\s+of\\s+prey|buzzard|kite|heron|pike|otter|predator';
/** (askall-angle item 3) "at peace" beside a living place is someone settled, alive ("my grandma is at peace in her new care home"). */
const AT_PEACE_ALIVE = '(?!(?:\\s+(?:now|so|really|very|finally|more|much|quite))*\\s+(?:in|at)\\s+(?:(?:her|his|their|the|a|my|our)\\s+)?(?:new\\s+|lovely\\s+|nice\\s+|little\\s+|own\\s+)?(?:care\\s+home|nursing\\s+home|home|flat|house|bungalow|garden|allotment|room|retirement\\s+(?:home|village|flat)|sheltered\\s+(?:housing|flat)|caravan|place|school|job|church|cottage)\\b)';
/**
 * (askall-angle item 3) "<ref> isn't with us now" said of someone away, alive: a living place or "away" after it ("my sister isnt
 * with us now, shes at uni", "…, he's on holiday", "…, they're staying with their dad"). Never "in heaven", "at peace".
 */
const WITH_US_AWAY = '(?!(?:\\s+(?:now|right\\s+now|at\\s+the\\s+moment|today|tonight|this\\s+(?:week|weekend|year|term|summer|month)))?\\s*[,.;:—–-]?\\s*(?:(?:shes|hes|theyre|she\\s+is|he\\s+is|they\\s+are|she|he|they)\\s+)?(?:(?:at|on|in)\\s+(?:the\\s+|a\\s+|her\\s+|his\\s+|their\\s+|my\\s+|our\\s+)?(?:uni|university|college|school|boarding\\s+school|work|office|holiday|holidays|trip|school\\s+trip|camp|army|navy|barracks|base|rehab|hospital|sleepover|placement|tour|training|residential|exchange|spain|france|italy|portugal|greece|australia|america|canada|the\\s+states|london|scotland|wales|ireland|dubai|india|pakistan|nigeria|poland|germany)|away|abroad|travelling|traveling|staying|living|working|studying|visiting|off\\s+(?:at|to|on)|gone\\s+to\\s+(?:uni|university|college|work|school))\\b)';
/** (askall-angle item 3) "gone by the time I got up for school" is someone gone out (never a death read: it falls to the question). */
const BY_THE_TIME_UP = '(?!\\s+(?:i|we|they|he|she)\\s+(?:got\\s+up|woke|came\\s+down|got\\s+out\\s+of\\s+bed|got\\s+(?:home|back|in)\\s+from\\s+(?:school|work|uni|college|the\\s+shops|practice|training)))';
/** A death or a loss, named ('loss'). Each is read on the normed words with the ordinary idioms blanked. */
const LOSS_WORDS = [
  // die, died, dying, dead, death, deceased (and "dide", "dieing", "diied", "dided", "ded": review r9)
  /\b(?:die|dies|di+e+d+|dide|dided|dyde|ded|deaded|dying|dieing|dyin|dead|deaths?|deceased|decesed|deseased|deceaced|fatal|fatally|perished|slain)\b/iu,
  // passed away (and its misspellings), passing away, his passing
  /\b(?:pass(?:ed|es|ing|d)?|passs+ed|past|pased|passt)\s+(?:away|awy|awat|awya|aways|awaay|awya)\b/iu,
  new RegExp(`(?:\\b(?:his|her|their)|${REF})\\s+passing\\b|\\bpassing\\s+of\\s+(?:(?:my|our|his|her|their|the)\\s+)?${ADJ}(?:${WHO}|${BARE})`, 'iu'),
  // passed on (never "passed on the message / my CV / her love of baking")
  /\bpassed\s+on\b(?!\s+(?:the(?!\s+\d)|a|an|his|her|my|their|our|your|its|this|that|these|those|it|them|him|me|us|you|some|any|what|news|word|messages?|info\w*|details?|notes?|to|from|through|by|down|everything|something|anything|nothing|bad|good)\b)/iu,
  // "my dad passed last year", "Mum's passed", "she passed in her sleep", "grandma passd" (an exam passed is an
  // idiom, blanked); "my dad deid", "my dad dyed", "my mom diead" (never "dyed her hair": blanked, or a colour)
  new RegExp(`${REF}\\s+${AUX}(?:passed|passd|passs+ed|pased|passt)\\b`, 'iu'),
  new RegExp(`${REF}\\s+${AUX}(?:deid|diead|dieed|dyied|dyed)\\b(?!\\s+(?:his|her|my|their|the|it|them|a|an|blue|red|pink|purple|green|black|blonde|blond|brown|grey|gray|white|orange)\\b)`, 'iu'),
  // killed, murdered, suicide, took his own life, drowned
  /\b(?:killed|kiled|killd|kild|murdered|murder|suicide|drowned|overdosed|euthani[sz]ed|euthanasia)\b/iu,
  /\b(?:took|take|taken|taking|ended|end|ending)\s+(?:his|her|their|my|your)\s+(?:own\s+)?(?:life|lives)\b|\b(?:killed|hanged|hung|shot|topped|offed)\s+(?:himself|herself|themselves|themself)\b/iu,
  // "lost his life", "lost her battle with cancer"
  /\blost\s+(?:his|her|their)\s+(?:own\s+)?(?:life|lives|battle|fight|long\s+battle|brave\s+battle|brave\s+fight)\b/iu,
  // a heart that stopped, breathing that stopped, found unresponsive, never woke up (someone named before it)
  new RegExp(`(?:\\b(?:${WHO}|${BARE})s?|\\b(?:his|her|their))\\s+heart\\s+(?:just\\s+|suddenly\\s+)?(?:stopped|gave\\s+(?:out|up)|failed)\\b`, 'iu'),
  new RegExp(`${REF}\\s+(?:(?!(?:i|we|you|me)\\b)[a-z]+\\s+){0,4}?(?:stopped\\s+breathing|was\\s+found\\s+unresponsive|found\\s+unresponsive|never\\s+woke\\s+up|didnt\\s+wake\\s+up|did\\s+not\\s+wake\\s+up|never\\s+came\\s+(?:home|back)|never\\s+made\\s+it\\s+(?:home|out|back))\\b`, 'iu'),
  // run over, jumped from a bridge, in front of a train
  new RegExp(`(?:${REF}|\\b(?:${PET})s?)\\s+(?:(?!(?:i|we|you)\\b)[a-z]+\\s+){0,3}?(?:was|were|got|been|has\\s+been|had\\s+been|is)\\s+run\\s+over\\b|\\bran\\s+over\\s+(?:my|our|the|his|her|their)\\s+${ADJ}(?:${WHO})`, 'iu'),
  /\b(?:jumped|threw\s+(?:himself|herself|themselves))\s+(?:off|from|in\s+front\s+of|under)\s+(?:a|the)\s+(?:bridge|building|roof|cliff|train|tube|tower|car\s+park|balcony|motorway|lorry|bus)\b|\bin\s+front\s+of\s+a\s+train\b/iu,
  // born still or sleeping, slipped away, left this world, left us, at peace now, taken too soon
  /\bborn\s+(?:still|sleeping|asleep|silent|without\s+a\s+heartbeat)\b|\bsleeping\s+(?:baby|angel|son|daughter)\b/iu,
  new RegExp(`${REF}\\s+${AUX}slipped\\s+away\\b|\\bslipped\\s+away\\s+(?:peacefully|quietly|in\\s+(?:his|her|their)\\s+sleep|last\\s+night|this\\s+morning|yesterday)\\b`, 'iu'),
  /\bleft\s+(?:this|the)\s+(?:world|earth)\b|\bleft\s+us\b(?=\s*(?:$|[.,!?;:…]|(?:last|this|yesterday|today|on|in|peacefully|suddenly|too|so|and|but|after|at|early|forever|aged?|far|way|just|now|i|we)\b))/iu,
  new RegExp(`${REF}\\s+${AUX}at\\s+peace\\b(?!\\s+with)${AT_PEACE_ALIVE}|${REF}\\s+${AUX}(?:was\\s+|were\\s+)?(?:taken|stolen|ripped)\\s+(?:away\\s+)?from\\s+(?:us|me|this\\s+world)\\b|\\btaken\\s+from\\s+(?:us|this\\s+world)\\b|\\b(?:taken|gone)\\s+(?:far\\s+|way\\s+|much\\s+)?too\\s+(?:soon|young|early)\\b|\\bgone\\s+but\\s+not\\s+forgotten\\b|\\b(?:with\\s+the\\s+angels|with\\s+god\\s+now|gone\\s+to\\s+be\\s+with)\\b`, 'iu'),
  // "since dad went", "it's been a year since Mum went"
  new RegExp(`\\b(?:since|after|before|when|that)\\s+(?:(?:my|our)\\s+)?${ADJ}(?:${WHO}|${BARE})\\s+went\\b(?=\\s*(?:$|[.,!?;:…]|(?:and|but|i|we|its|it|nothing|everything|ive|im|the|last|this|so)\\b))`, 'iu'),
  // saying goodbye to a pet or a parent for good, the machines turned off
  new RegExp(`\\b(?:time|had|have|has|having|need|needed)\\s+to\\s+say\\s+(?:(?:our|my|a)\\s+)?(?:(?:final|last)\\s+)?goodbyes?\\s+to\\s+(?:(?:my|our|the|his|her)\\s+)?${ADJ}(?:${PET}|${BARE})s?\\b|\\b(?:said|say|saying)\\s+(?:(?:our|my|their|his|her)\\s+)?(?:final|last)\\s+goodbyes?\\b|\\bsaying\\s+goodbye\\s+to\\s+(?:(?:my|our|the)\\s+)?${ADJ}(?:${PET}|${BARE})s?\\b(?=.*\\b(?:machines?|life\\s+support|hospital|hospice|vet|ventilator|forever|for\\s+the\\s+last\\s+time|one\\s+last\\s+time)\\b)|\\bvet\\s+(?:said|says)\\s+(?:that\\s+)?(?:its|it\\s+is|it\\s+was)\\s+time\\b`, 'iu'),
  // (and "switching off mum's machine": review r9)
  /\b(?:turn|turning|turned|switch|switching|switched)\s+(?:off\s+)?(?:the\s+|his\s+|her\s+|their\s+|my\s+|our\s+)?(?:[a-z]+s\s+)?(?:machines?|life\s+support|ventilator)(?:\s+off)?\b/iu,
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
  // "the doctors say it won't be long", "she hasn't got long left"
  /\b(?:doctors?|nurses?|vet|hospital|they|consultant|hospice|surgeon)\s+(?:say|said|says|told\s+(?:us|me)|think|thinks|reckon)\s+(?:that\s+)?(?:it|she|he|they)\s+(?:wont|will\s+not|isnt\s+going\s+to|is\s+not\s+going\s+to)\s+be\s+(?:very\s+)?long\b|\bnot\s+long\s+left\b|\b(?:hasnt|has\s+not|havent)\s+got\s+long\b|\b(?:doesnt|does\s+not)\s+have\s+long\s+(?:left|to\s+live)\b/iu,
  new RegExp(`${REF}\\s+(?:(?:is|s|are|re|was|were|might|may|probably|likely)\\s+)*(?:did\\s+not|didnt|never|not|isnt|arent|wasnt|wont|will\\s+not|might\\s+not|may\\s+not|mightnt|couldnt|could\\s+not)\\s+(?:going\\s+to\\s+|gonna\\s+)?(?:make\\s+it|survive|pull\\s+through|wake\\s+up)\\b(?!\\s+(?:to\\s+(?:the\\s+)?(?:party|work|school|class|meeting|match|game|gym|shop|shops|interview|concert|gig|show|wedding|bus|train|station|airport|final|finals|team|squad|cut|end|top|club|pub|cinema|event|lesson|practice|training)|in\\s+time|on\\s+time|into\\s+(?:the|my|his|her)\\s+(?:team|squad|final|uni|college|school|club|band)|home\\s+for|back\\s+(?:in\\s+time|for)|for\\s+(?:the|my|his|her)|until|till|before\\s+(?:10|11|noon|lunch)|through\\s+(?:the\\s+)?(?:interview|audition|trials?|round|first|second|qualif\\w*|exam|test|week|day|shift|meeting)))`, 'iu'),
  // my late husband (askall-angle item 5: its possessive too, "my late father's watch", "clearing out my late fathers flat")
  new RegExp(`\\b(?:my|our|his|her|their|your)\\s+late\\s+${ADJ}(?:${WHO})(?:s|es)?\\b`, 'iu'),
  // a widow, an orphan
  /\b(?:widow|widowed|widower|orphan|orphaned)\b/iu,
  // (review r9) "isnt with us anymore", "my dog is no more", "six feet under"
  /\b(?:isnt|is\s+not|arent|are\s+not|wasnt|was\s+not|aint|not)\s+(?:here\s+)?with\s+us\s+any\s*more\b|\b(?:is|s|are|re|was|were)\s+no\s+more\b(?=\s*(?:$|[.,!?;:…)—–]|(?:and|but|so|now|i|we|its|it|since|after|because|cos|today|yesterday|this|last)\b))|\bsix\s+feet\s+under\b/iu,
  // "it's the first christmas without mum", "first birthday without him"
  new RegExp(`\\bfirst\\s+(?:christmas|xmas|birthday|easter|mothers\\s+day|fathers\\s+day|new\\s+year|holiday|summer|anniversary|wedding\\s+anniversary|year|eid|diwali|thanksgiving|hanukkah|valentines(?:\\s+day)?|day|week|month|weekend|holidays)\\s+without\\s+(?:(?:my|our)\\s+)?(?:${ADJ}(?:${WHO}|${BARE})s?|him|her|them)\\b`, 'iu'),
  // "today would have been my dad's 60th birthday", "he would have turned 60"
  new RegExp(`\\bwould\\s+(?:have|ve|of)\\s+(?:been|turned)\\s+(?:(?:my|our|his|her|their)\\s+)?(?:${ADJ}(?:${WHO}|${BARE})s?\\s+)?(?:\\d+\\w*\\s+|[a-z]+(?:ieth|th|st|nd|rd)\\s+)?(?:birthday|anniversary|wedding\\s+anniversary|bday)\\b|(?:\\b(?:he|she|they)|${REF})\\s+would\\s+(?:have|ve|of)\\s+(?:been|turned)\\s+\\d+`, 'iu'),
  // "we lost our pregnancy"
  /\b(?:lost|losing|lose)\s+(?:(?:our|the|my|a|her|their|another|this)\s+)?(?:first\s+|second\s+|third\s+)?pregnanc(?:y|ies)\b|\b(?:pregnancy|baby)\s+loss\b/iu,
  // "my sister was hit by a train", "my dog got hit by a car"
  new RegExp(`(?:${REF}|\\b(?:${PET})s?)\\s+(?:(?!(?:i|we|you)\\b)[a-z]+\\s+){0,3}?(?:was|were|got|get|gets|getting|been|has\\s+been|had\\s+been|is|s)\\s+(?:hit|knocked\\s+(?:down|over)|struck|mown\\s+down|run\\s+down|killed)\\s+by\\s+(?:a|an|the|some|this)\\s+(?:[a-z]+\\s+)?(?:car|cars|train|bus|lorry|truck|van|motorbike|motorcycle|tram|vehicle|taxi|cab|driver|tractor|coach)\\b`, 'iu'),
  // "the person I loved most is gone", "the man I married has gone"
  new RegExp(`${REF}\\s+(?:who|that|i|we|ive|id)\\s+(?:[a-z]+\\s+){0,4}?(?:is|s|has|have|are)\\s+${AUX}gone\\b(?!\\s+(?:to(?!\\s+(?:heaven|a\\s+better\\s+place|be\\s+with|sleep|rest|god))|out|home|off|back|away|abroad|on|into|with|up|down|for|shopping|quiet|silent|mad|viral)\\b)`, 'iu'),
  // "my pops passed", "my missus passed last week" (any word for them; a test or an application passed is not one)
  new RegExp(`\\b(?:my|our)\\s+(?:(?!(?:${PASS_NOT})\\b)[a-z]+\\s+){1,2}?${AUX}passed\\b(?!\\s+(?:${PASS_OBJ})\\b)`, 'iu'),
  // ---- (review r10) the phrase families the round-3 review found outside every list --
  // "covid took my grandad", "cancer took my mum last year", "the accident took my brother", "it took him in the end"
  // (review r11: "covid got my grandad", "the virus got him in the end", "the fire took both my grandparents")
  new RegExp(`\\b(?:${KILLERS})\\s+(?:has\\s+|have\\s+|had\\s+|finally\\s+|eventually\\s+|cruelly\\s+|then\\s+|in\\s+the\\s+end\\s+)*(?:took|takes|taken|claimed|stole)\\s+${TAKEN_WHO}`, 'iu'),
  // ("got" never for a cold caught: "the flu got my mum")
  new RegExp(`\\b(?!(?:flu|sickness)\\b)(?:${KILLERS})\\s+(?:has\\s+|had\\s+|finally\\s+|eventually\\s+|cruelly\\s+|then\\s+|in\\s+the\\s+end\\s+)*(?:got|gets|getting)\\s+${GOT_WHO}`, 'iu'),
  new RegExp(`\\bit\\s+(?:has\\s+|finally\\s+|eventually\\s+)*(?:took|taken)\\s+(?:(?:(?:my|our)\\s+)?${ADJ}(?:${WHO}|${BARE})s?|him|her|them)\\b(?=\\s*(?:$|[.,!?;:…)—–]|(?:in\\s+the\\s+end|from\\s+(?:us|me)|away|last|this|in\\s+(?:the\\s+night|his\\s+sleep|her\\s+sleep|\\d{4}|january|february|march|april|may|june|july|august|september|october|november|december)|on\\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|and|but|so|too)\\b))`, 'iu'),
  new RegExp(`${REF}\\s+${AUX}(?:was\\s+|were\\s+|got\\s+)?(?:taken|claimed)\\s+(?:from\\s+us\\s+)?by\\s+(?:${KILLERS})\\b`, 'iu'),
  // no heartbeat at the scan, the heartbeat lost
  /\b(?:no|without\s+a|lost\s+(?:the|its|his|her|their|a|our\s+babys|the\s+babys|babys)|couldnt\s+find\s+(?:a|the))\s+heartbeat\b|\bheartbeat\s+(?:had\s+)?stopped\b/iu,
  // laid to rest, kicked the bucket, popped his clogs, snuffed it, bought the farm, shuffled off (this mortal coil)
  /\blaid\s+to\s+rest\b|\bkick(?:ed|s|ing)?\s+the\s+bucket\b(?!\s+(?:over|of|across|down|away|into|out|off)\b)|\bpop(?:ped|s|ping)?\s+(?:his|her|their|my|your)\s+clogs\b|\bsnuff(?:ed|s)?\s+it\b(?!\s+out\b)|\bb(?:ought|uys|uy)\s+the\s+farm\b(?!\s+(?:next\s+door|down\s+the|across|from|nearby|opposite|over\s+the)\b)|\bshuffled\s+off\b(?!\s+(?:to|home|down|into|towards|back|out|up|in|with|for)\b)|\bmortal\s+coil\b/iu,
  // "my nan croaked", "she succumbed to her injuries", "departed this life", "the dearly departed"
  new RegExp(`${REF}\\s+${AUX}croaked\\b(?!\\s+(?:out|a|an|the|at|that|something|hello|hi|his|her|my|back)\\b)|\\bcroaked\\s+it\\b`, 'iu'),
  new RegExp(`${REF}\\s+${AUX}succumbed\\b(?!\\s+to\\s+(?:the\\s+)?(?:temptation|peer\\s+pressure|pressure|the\\s+urge|urge|sleep|exhaustion|boredom|charm|my\\s+charm|tiredness|hunger|cravings?)\\b)|\\bsuccumbed\\s+to\\s+(?:(?:his|her|their|the|its|a|an)\\s+)?(?:[a-z]+\\s+){0,2}?(?:injuries|injury|wounds|illness|cancer|covid|disease|infection|sepsis|pneumonia|tumou?r|condition|battle|stroke|virus|complications)\\b`, 'iu'),
  /\bdeparted\s+(?:this\s+(?:life|world|earth)|us|from\s+us)\b|\bdearly\s+departed\b/iu,
  // "my friend ODd", "my friend od d", "she OD'd on heroin" (after the apostrophe is out: never "he's odd"; review r11: "odd",
  // the adjective's spelling, only before a time, a place or the end, never "my mum had odd shoes on")
  new RegExp(`(?:\\b(?:he|she|they)\\b|\\b(?:(?:my|our|his|her|their|your|the|a)\\s+)?${ADJ}(?:${WHO})(?:s|es)?\\b|\\b(?:${BARE})s?\\b)\\s+(?:(?:just|has|had|have|nearly|almost|accidentally|then)\\s+)?(?:(?:od|oded|odded|od\\s+d|odd\\s+d|o\\s+d\\s+d)\\b(?!\\s+(?:one|ones|man|woman|guy|job|jobs|things?|bits?|socks?|sock|way|looks?|feeling|behaviou?r|habits?|number|numbers|moments?|time|times|days?|person|people|kid|ideas?|sense|bit|occasion|couple)\\b)|odd(?=\\s*(?:$|[.,!?;:…)—–]|(?:on|at|in|last|this|yesterday|today|tonight|earlier|and|but|so|after|before|again|twice|from|over|when|while)\\b)))`, 'iu'),
  // (review r10) "my dog went to the park and never came back": a few more words between
  new RegExp(`${REF}\\s+(?:(?!(?:i|we|you|me)\\b)[a-z]+\\s+){0,7}?never\\s+(?:came|come|made\\s+it)\\s+(?:home|back)\\b`, 'iu'),
  // found him unresponsive (words between); never came out of hospital
  /\bfound\s+(?:[a-z]+\s+){0,4}?unresponsive\b/iu,
  /\b(?:went|go|gone|taken|rushed|admitted)\s+(?:in|into|to)\s+(?:the\s+)?(?:hospital|hospice|icu|intensive\s+care)\b.{0,60}?\bnever\s+(?:came|come|made\s+it)\s+(?:out|home|back)\b/iu,
  // "dad went peacefully in the night", "my grandma went last night", "he went in his sleep"
  new RegExp(`${REF}\\s+${AUX}went\\s+(?:so\\s+)?(?:peacefully|quietly|suddenly|overnight|in\\s+(?:his|her|their|the)\\s+sleep|in\\s+the\\s+night|last\\s+night|this\\s+morning|early\\s+this\\s+morning)\\b(?!\\s+(?:to|with|for|out|on\\s+a|shopping|clubbing|dancing|camping|swimming|running|home)\\b)(?!\\s+and\\s+(?:loved|enjoyed|had|said|got|came|met|saw|bought|told|brought|found|danced|ate|drank|won|lost|played)\\b)`, 'iu'),
  // isn't around any more, isn't coming home, an angel now, resting now, at rest, in the ground, shiva
  new RegExp(`${REF}\\s+(?:(?:is|s|are|re|was)\\s+)?(?:isnt|is\\s+not|arent|are\\s+not|aint|not|wasnt|no\\s+longer)\\s+(?:really\\s+|even\\s+)?around\\s+any\\s*more\\b`, 'iu'),
  new RegExp(`${REF}\\s+(?:(?:is|s|are|re)\\s+)?(?:isnt|is\\s+not|arent|are\\s+not|wont\\s+be|wont\\s+ever\\s+be|will\\s+never\\s+be|never|not|never\\s+ever)\\s+(?:ever\\s+)?coming\\s+(?:home|back)\\b(?!\\s+(?:tonight|today|tomorrow|until|till|til|for|this|from|in\\s+time|early|late|on|at|after|before|soon|yet|again\\s+(?:tonight|today))\\b)`, 'iu'),
  /\bup\s+(?:with|among|in)\s+the\s+stars\b|\b(?:a|our|my)\s+(?:little\s+)?star\s+(?:in\s+the\s+sky\s+)?now\b|\b(?:shining|twinkling|looking)\s+down\s+(?:on|at)\s+(?:us|me)\b|\bangel\s+now\b|\b(?:became|become|becomes|is\s+now|s\s+now|now)\s+an?\s+angel\b|\bour\s+(?:little\s+)?angel\s+(?:in\s+heaven|in\s+the\s+sky|above)\b/iu,
  new RegExp(`${REF}\\s+${AUX}(?:resting\\s+(?:now|peacefully|in\\s+peace)|(?:now\\s+)?at\\s+rest)\\b`, 'iu'),
  new RegExp(`${REF}\\s+${AUX}(?:(?:lies|lying|laid|lay|put|buried)\\s+)?in\\s+the\\s+ground\\b|\\bput\\s+(?:him|her|them)\\s+in\\s+the\\s+ground\\b`, 'iu'),
  /\b(?:sit|sat|sitting|sits|observing|observe|observed|keeping|kept)\s+shiva\b|\bshiva\s+(?:for|house|week|minyan|call)\b/iu,
  // "today would have been mums 60th", "would have been his 40th"
  new RegExp(`\\bwould\\s+(?:have|ve|of)\\s+(?:been|turned)\\s+(?:(?:(?:my|our|his|her|their)\\s+)?${ADJ}(?:${WHO}|${BARE})s|his|her|their)\\s+(?:\\d+(?:st|nd|rd|th)?|${ORDINALS})\\b`, 'iu'),
  // said goodbye … for the last time
  new RegExp(`\\b(?:said|say|saying|says)\\s+(?:(?:our|my|their|his|her|a)\\s+)?goodbyes?\\s+(?:to\\s+(?:(?:(?:my|our|the|his|her|their)\\s+)?${ADJ}(?:${WHO}|${BARE})s?|him|her|them)\\s+)?(?:(?!to\\b)[a-z]+\\s+){0,3}?for\\s+the\\s+(?:very\\s+)?(?:last|final)\\s+time\\b`, 'iu'),
  // "my mum lost the fight", "she lost her fight"
  new RegExp(`${REF}\\s+${AUX}lost\\s+(?:the|her|his|their)\\s+(?:long\\s+|brave\\s+|short\\s+|hard\\s+)?(?:fight|battle)\\b(?!\\s+(?:to\\s+(?:keep|stay|get|win|be)|over|about|with\\s+(?:me|us|him|her|them|the\\s+council)|at|in\\s+(?:court|the\\s+(?:ring|cage|playground)))\\b)`, 'iu'),
  // ---- (review r11) the euphemisms and slang the round-4 review found outside every list --
  // met his maker, met her end, breathed his last, drew her last breath, pushing up daisies
  /\b(?:met|meet|meets|meeting)\s+(?:his|her|their|my|our|your)\s+(?:maker|end)\b|\b(?:breathed|breathes|breathing)\s+(?:his|her|their)\s+(?:very\s+)?last\b|\b(?:drew|draw|drawn|took|taken)\s+(?:his|her|their)\s+(?:very\s+)?(?:last|final)\s+breath\b|\bpushing\s+up\s+(?:the\s+)?daisies\b/iu,
  // called home (to God): "my dad was called home to god", "God called her home" (never "called home from school")
  new RegExp(`\\b(?:was|were|been|got|is|s)\\s+called\\s+home\\b(?!\\s+(?:from|early|by|because|for|to\\s+(?:help|look|see|watch|deal|sort|feed|let))\\b)|\\bcalled\\s+home\\s+to\\s+(?:god|the\\s+lord|jesus|heaven|be\\s+with)\\b|\\b(?:god|the\\s+lord|jesus)\\s+(?:has\\s+|had\\s+)?called\\s+(?:him|her|them|${REF})\\s+home\\b`, 'iu'),
  // bit the dust, carked it, karked it, copped it, popped off, gave up the fight (someone named before it: never "my
  // laptop bit the dust", "copped it from my mum", "popped off to the shops")
  new RegExp(`${REF}\\s+${AUX}(?:bit|bitten)\\s+the\\s+dust\\b|${REF}\\s+${AUX}(?:carked|karked|carks|karks)\\s+it\\b|${REF}\\s+${AUX}copped\\s+it\\b(?!\\s+(?:from|off|for|when|after|at|big\\s+time|in\\s+(?:class|school|the\\s+neck))\\b)`, 'iu'),
  new RegExp(`${REF}\\s+${AUX}popped\\s+off\\b(?!\\s+(?:to|round|around|out|home|down|back|for|at|on|with|again|the|a|an|into|in|over|up|quickly|early|somewhere|there|here|abroad|shopping|upstairs|downstairs|work|school)\\b)`, 'iu'),
  new RegExp(`${REF}\\s+${AUX}(?:gave|give|given|gives)\\s+up\\s+(?:the|his|her|their)\\s+(?:long\\s+|brave\\s+|hard\\s+)?(?:fight|battle|struggle|ghost)\\b(?!\\s+(?:for|to|against|over|with|about)\\b)`, 'iu'),
  // went to a better place, went to be with the Lord, gone to his long home (or his rest, his reward)
  /\b(?:went|gone|go|goes|going)\s+to\s+(?:a\s+better\s+place|be\s+with\s+(?:the\s+lord|god|jesus|the\s+angels|(?:his|her|their)\s+maker))\b|\b(?:gone|went|go|goes)\s+to\s+(?:his|her|their)\s+(?:long\s+home|(?:eternal\s+|final\s+)?rest|reward|maker|grave)\b/iu,
  // "since he went", "ever since she went", with "miss" in the words ("i miss my dad so much since he went")
  { test: (t) => /\bmiss(?:ed|es|ing)?\b/iu.test(t) && SINCE_WENT.test(t) },
  // "<anything> took my brother from us", "took both my grandparents from us", "took him from us"
  new RegExp(`\\b(?:took|taken|stole|stolen|ripped|snatched)\\s+(?:${TAKEN_WHO})\\s+(?:[a-z]+\\s+){0,3}?(?:away\\s+)?from\\s+(?:us|this\\s+world|the\\s+world|our\\s+family|our\\s+lives)\\b`, 'iu'),
  // "we had to say goodbye to our baby at 22 weeks"
  /\b(?:say|said|saying|says)\s+(?:goodbye|bye|our\s+goodbyes|goodbyes|our\s+last\s+goodbyes)\s+to\s+(?:our|my|the)\s+(?:little\s+|beautiful\s+|precious\s+|baby\s+|darling\s+)*(?:baby|babies|angel|twins)\b/iu,
  // "my granddad went to sleep and never woke", "she never woke up" (someone named before it; never "never woke me up")
  new RegExp(`${REF}\\s+(?:(?!(?:i|we|you|me)\\b)[a-z]+\\s+){0,6}?never\\s+(?:woke|awoke|woken)(?:\\s+up)?\\b(?!\\s+(?:me|us|him|her|them|in\\s+time|on\\s+time|early|before|until|till|once|all\\s+night|at\\s+all|for\\s+(?:school|work|a\\s+feed|feeds?|his\\s+bottle|her\\s+bottle)|during)\\b)`, 'iu'),
  // "the paramedics couldn't save him", "they couldn't save my brother" (never "couldn't save her a seat")
  new RegExp(`\\b(?:couldnt|could\\s+not|werent\\s+able\\s+to|were\\s+unable\\s+to|wasnt\\s+able\\s+to|was\\s+unable\\s+to|failed\\s+to)\\s+(?:save|revive|resuscitate)\\s+(?:him|her|them|${REF})(?!\\s+(?:a|an|any|some|enough|money|time|up|for|the\\s+(?:file|game|work|document|photos?|day|match)|my\\s+(?:file|game|work|document|photos?)|from\\s+(?:the\\s+)?(?:embarrassment|bullies|trouble|himself|herself|themselves|getting|being|detention|a\\s+telling\\s+off))\\b)`, 'iu'),
  // ---- (review r12) the families the round-5 review found outside every list --
  // a pet or a person let go beside the vet, the doctors, a hospital, intensive care, life support or "peacefully" ("we let our
  // dog go peacefully at home", "we had to let him go at the vets", "the doctors said there was nothing more they could do
  // and we let her go"; never "my boss let him go"; a bare "we had to let our dog go" is the check-in's: unsureLoss)
  { test: (t) => LET_GO_WHO.test(t) && LET_GO_CARE.test(t) },
  // "my mum isnt with us now", "grandad isnt with us any longer" (never "isnt with us this weekend", "on the trip"; askall-angle
  // item 3: never "my sister isnt with us now, shes at uni", WITH_US_AWAY)
  new RegExp(`${REF}\\s+${AUX}(?:(?:is|s|are|re|was)\\s+)?(?:isnt|is\\s+not|arent|are\\s+not|wasnt|was\\s+not|aint|not|no\\s+longer)\\s+(?:really\\s+|sadly\\s+)?(?:here\\s+)?with\\s+us\\b(?=\\s*(?:$|[.,!?;:…)—–]|(?:now|any\\s*more|any\\s+longer|sadly|since|and|but|so|i|we|its|it)\\b))${WITH_US_AWAY}`, 'iu'),
  // "my aunt went home to be with jesus", "my grandad went home to the lord", "she went home to glory" (never "home to god knows where")
  /\b(?:went|gone|go|goes|going|called|taken)\s+home\s+to\s+(?:be\s+with\s+)?(?:jesus|god(?!\s+knows)|the\s+lord|glory|heaven|(?:his|her|their)\s+(?:maker|saviour|savior|lord))\b/iu,
  // "my old man pegged it last week" (never "pegged it down the road", "pegged it home", "pegged it when the police turned up")
  new RegExp(`${REF}\\s+${AUX}pegged\\s+it\\b(?!\\s+(?:down|home|to|back|up|out|over|across|towards|round|around|along|into|off|after|for|as\\s+soon\\s+as|when\\s+(?:the\\s+|a\\s+|his\\s+|her\\s+|their\\s+|our\\s+)?(?:police|cops|old\\s+bill|feds|security|guards?|bouncers?|teachers?|alarm|dogs?|owner|neighbou?rs?|bell|whistle))\\b)`, 'iu'),
  // "my auntie had a stroke and never recovered", "my nan never recovered from the fall" (a stroke, a fall, an accident or an
  // operation in the words; askall-angle item 3: a person its subject, a few words before, never "my knee never recovered",
  // "our team never recovered after the injury"); "never regained consciousness" on its own; "never came round" and "never
  // came to" only after an operation, an accident or a coma (never "never came to my football match", "came round to mine")
  { test: (t) => NEVER_RECOVERED.test(t) && MEDICAL_EVENT.test(t) },
  new RegExp(`${REF}\\s+(?:(?!(?:i|we|you|me)\\b)[a-z]+\\s+){0,6}?never\\s+(?:regained\\s+consciousness|woke\\s+from\\s+(?:the|his|her|their)\\s+coma)\\b`, 'iu'),
  { test: (t) => CAME_ROUND.test(t) && (CAME_ROUND_AFTER.test(t) || (CAME_ROUND_END.test(t) && MEDICAL_EVENT.test(t))) },
  // "my horse had to be shot", "the dog had to be put out of his misery" (a pet named; never "shot with a tranquiliser dart",
  // "shot for flu": askall-angle item 3)
  new RegExp(`\\b(?:${PET})s?\\s+(?:[a-z]+\\s+){0,3}?(?:had\\s+to\\s+be|has\\s+to\\s+be|needed\\s+to\\s+be|was|got|has\\s+been|had\\s+been)\\s+(?:shot\\b(?!\\s+(?:with|for|against)\\s+(?:(?:a|an|the|its|his|her|their)\\s+)?(?:[a-z]+\\s+)?(?:tranquili[sz]ers?|tranqs?|darts?|jabs?|flu|vaccines?|vaccinations?|injections?|boosters?|rabies|antibiotics?|painkillers?|sedatives?|anaesthetics?|anesthetics?|steroids?|worming|wormer|vitamins?))|destroyed|put\\s+out\\s+of\\s+(?:his|her|its|their)\\s+misery)\\b|\\bput\\s+(?:him|her|it|them|(?:(?:my|our|the)\\s+)?(?:${PET})s?)\\s+out\\s+of\\s+(?:his|her|its|their)\\s+misery\\b`, 'iu'),
  // "my brother didnt come home from the war"
  new RegExp(`${REF}\\s+(?:(?!(?:i|we|you|me)\\b)[a-z]+\\s+){0,3}?(?:didnt|did\\s+not|never)\\s+(?:come|came|make\\s+it|made\\s+it)\\s+(?:home|back)\\s+from\\s+(?:the\\s+)?(?:war|wars|front|front\\s+line|army|navy|battle|fighting|afghanistan|iraq|ukraine|vietnam|falklands|tour)\\b`, 'iu'),
  // "my stepdad wasnt breathing when we found him", "mum stopped breathing before the ambulance came"
  /\b(?:wasnt|was\s+not|werent|were\s+not|not|had\s+stopped|stopped)\s+breathing\s+(?:when|by\s+the\s+time|before)\s+(?:we|i|they|the\s+(?:ambulance|paramedics|doctors?|nurses?))\s+(?:found|got\s+(?:to|there|home|back|in)|reached|arrived|came|come|turned\s+up)\b/iu,
  // "my father was taken by the sea" (an article now), "my rabbit was taken by a fox", "a fox got our chickens"
  new RegExp(`${REF}\\s+${AUX}(?:was\\s+|were\\s+|got\\s+)?(?:taken|claimed)\\s+(?:from\\s+us\\s+)?by\\s+(?:the\\s+|a\\s+|an\\s+)?(?:${KILLERS})\\b`, 'iu'),
  new RegExp(`\\b(?:${PET})s?\\s+(?:was|were|got|has\\s+been|had\\s+been)\\s+(?:taken|killed|eaten|got|snatched|caught)\\s+by\\s+(?:a|an|the|some)\\s+(?:${PREDATORS})\\b|\\b(?:a|an|the|some)\\s+(?:${PREDATORS})\\s+(?:got|took|killed|ate|had|caught)\\s+(?:(?:all\\s+)?(?:of\\s+)?(?:my|our|the|his|her|their)\\s+)?${ADJ}(?:${PET})s?\\b`, 'iu'),
  // "the tumour beat my dad in the end", "cancer won in the end" (never "my dad beat cancer", "the team won")
  // (never with a relapse beside it, someone alive: "the drugs beat my brother in the end, he relapsed again")
  { test: (t) => KILLER_WON.test(t) && !RELAPSED.test(t) },
  // "the fire took everything including my dog"
  new RegExp(`\\b(?:${KILLERS})\\s+(?:took|claimed|destroyed|got|killed)\\s+(?:everything|everyone|everybody|all\\s+of\\s+us|it\\s+all|all)\\s+(?:including|even|and|except)\\s+(?:(?:my|our|the|his|her|their)\\s+)?${ADJ}(?:${WHO}|${BARE})s?\\b`, 'iu'),
  // "my nan had gone in the night", "he had gone by the time we got there", "she was gone before the ambulance arrived"
  new RegExp(`(?:${REF}|\\b(?:he|she|they)\\b)\\s+${AUX}(?:was\\s+|were\\s+|had\\s+|has\\s+)?(?:already\\s+)?gone\\s+(?:in\\s+the\\s+night|overnight|in\\s+(?:his|her|their)\\s+sleep|by\\s+the\\s+time${BY_THE_TIME_UP}|before\\s+(?:the\\s+)?(?:ambulance|paramedics|doctors?|nurses?|we|i|help)|when\\s+(?:we|i|they)\\s+(?:got|arrived|found|came|went\\s+in))\\b`, 'iu'),
  // "dad has gone to the other side", "the vet helped her cross over" (never "the other side of the room", "cross over the road")
  /\b(?:gone|went|go|passed|crossed|cross)\s+(?:over\s+)?to\s+the\s+other\s+side\b(?!\s+of\b)|\b(?:help(?:ed|s)?\s+(?:him|her|them|it)\s+|time\s+to\s+|(?:he|she|they)\s+)cross(?:ed)?\s+over\b(?!\s+(?:the|a|to|into|onto|from)\b)/iu,
  // "my grandad cashed in his chips", "my uncle is brown bread", "my baby boy grew his wings", "six foot under"
  /\bcash(?:ed|es|ing)?\s+in\s+(?:his|her|their)\s+chips\b|\bsix\s+foot\s+under\b/iu,
  // "our little girl only lived for three days", "he was too small to survive", "she never came out of surgery"
  /\bonly\s+(?:lived|survived)\s+(?:for\s+)?(?:a|an|one|two|three|four|five|six|seven|a\s+few|few|\d+)\s+(?:minutes?|hours?|days?|weeks?|months?)\b|\btoo\s+(?:small|early|sick|weak|young|ill|premature|poorly|tiny)\s+to\s+(?:survive|live|make\s+it|pull\s+through)\b/iu,
  /\bnever\s+(?:came|woke)\s+(?:out\s+of|up\s+from|round\s+from)\s+(?:the\s+|his\s+|her\s+|their\s+)?(?:surgery|operation|op|theatre|anaesthetic|anesthetic|coma)\b/iu,
  // (askall-angle item 6) and the usual spelling, "my uncle's brown bread, mate" (never "my nan's brown bread is the best")
  new RegExp(`${REF}\\s+(?:(?:is|s|was|are|re)\\s+brown\\s+bread\\b|brown\\s+bread(?=\\s*(?:$|[.,!?;:…)—–]|(?:mate|innit|now|sadly|apparently|since|last|this|yesterday|today|i|we|bro|man)\\b)))`, 'iu'),
  /\b(?:grew|grown|gained|earned|got)\s+(?:his|her|their)\s+(?:angel\s+)?wings\b(?!\s+(?:at|in|from|with|for)\b)/iu,
  // "my grandad had a massive heart attack and that was it"
  new RegExp(`(?:${REF}|\\b(?:he|she|they)\\b)\\s+(?:[a-z]+\\s+){0,4}?(?:heart\\s+attack|cardiac\\s+arrest|stroke|aneurysm|brain\\s+bleed|collapsed)\\b.{0,60}?\\b(?:and\\s+(?:that|it)\\s+was\\s+(?:it|that)|(?:and\\s+)?(?:didnt|did\\s+not|never)\\s+(?:come|came|make\\s+it|made\\s+it)\\s+(?:home|back))\\b`, 'iu'),
  // a pregnancy lost without the word: "the pregnancy was gone", "a chemical pregnancy", "the baby had stopped growing",
  // "not pregnant anymore", "we had to end the pregnancy", "terminate for medical reasons" (askall-angle item 3: only beside a
  // pregnancy word, never "they terminated his contract on medical grounds"; nor "the baby is over at my mum's", "over the moon",
  // "the baby has lost a bit of weight"), "the pregnancy wasn't viable",
  // "I started bleeding at 8 weeks and it was over"
  /\bchemical\s+pregnanc(?:y|ies)\b|\b(?:pregnancy|baby|babys\s+heartbeat|heartbeat)\s+(?:was|is|had)\s+(?:already\s+)?(?:gone|ended|lost\b(?!\s+(?:(?:a\s+(?:bit|little|lot)\s+of|some|a\s+few|loads\s+of|so\s+much|too\s+much|her|his|its|their)\s+)?(?:weight|pounds|grams|ounces|kilos|hair|teeth|tooth|appetite|sleep|dummy|sock|socks|toy|teddy|blanket|shoe|shoes|hat|mitten|mittens)))|\b(?:pregnancy|baby)\s+(?:was|is|had\s+been)\s+(?:already\s+)?over(?=\s*(?:$|[.,!?;:…)—–]))|\b(?:baby|babys|pregnancy|foetus|fetus|embryo|sac|babies)\s+(?:had\s+|has\s+|have\s+)?stopped\s+(?:growing|developing)\b/iu,
  /\b(?:not|no\s+longer|isnt|wasnt|im\s+not|i\s+am\s+not)\s+pregnant\s+any\s*(?:more|longer)\b|\bno\s+longer\s+pregnant\b/iu,
  /\b(?:end|ended|ending|terminate|terminated|terminating|lose|lost)\s+(?:the|our|my|her|this|a)\s+(?:wanted\s+|much\s+wanted\s+)?pregnancy\b|\b(?:pregnancy|baby|it|foetus|fetus)\s+(?:wasnt|was\s+not|isnt|is\s+not|wouldnt\s+be|would\s+not\s+be|not)\s+viable\b|\bnon\s+viable\s+pregnancy\b/iu,
  { test: (t) => TFMR_BARE.test(t) || (/\bterminat(?:e|ed|ing|ion)\b(?:\s+[a-z0-9]+){0,6}?\s+(?:for|on)\s+medical\s+(?:reasons|grounds)\b/iu.test(t) && PREG_NEAR.test(t)) },
  // ---- (askall-angle item 5) the reviews' unambiguous misses: the gentle path with no question --
  // "my dad's time came last week", "his time had come" (never "her time came to speak")
  new RegExp(`(?:\\b(?:his|her|their)|${REF})\\s+time\\s+(?:came|had\\s+come)\\b(?!\\s+(?:to|for|round|around|up|at\\s+last)\\b)`, 'iu'),
  // "the vet said there was nothing more they could do" (with "they", a vet, a doctor, a hospital or a pet in the words)
  { test: (t) => { const m = NOTHING_MORE.exec(t); return !!m && (!/^(?:they|anyone|anybody|we)$/iu.test(m[1]) || NOTHING_MORE_CTX.test(t)); } },
  { test: (t) => /\b(?:bleeding|bled|bleed|cramping)\b/iu.test(t) && /\b(?:pregnan\w*|weeks?|scan|baby|babys)\b/iu.test(t) && /\b(?:it\s+was\s+(?:over|gone)|its\s+(?:over|gone)|it\s+had\s+gone|lost\s+(?:it|the\s+baby|our\s+baby|my\s+baby)|the\s+pregnancy\s+(?:was|had)\s+(?:gone|over|ended))\b/iu.test(t) },
];
/** (askall-angle item 5) "nothing more they / the vet / the doctors could do": who could do no more. */
const NOTHING_MORE = /\bnothing\s+(?:more|else)\s+(?:that\s+)?(they|the\s+vets?|the\s+doctors?|the\s+drs?|the\s+nurses?|the\s+surgeons?|the\s+hospital|the\s+paramedics|the\s+consultants?|the\s+specialists?|anyone|anybody|we)\s+could\s+(?:do|have\s+done)\b/iu;
const NOTHING_MORE_CTX = new RegExp(`\\b(?:vets?|doctors?|drs?|nurses?|hospital|hospice|icu|intensive\\s+care|ambulance|paramedics?|surgeons?|surgery|operation|consultant|resus|life\\s+support|(?:${PET})s?)\\b`, 'iu');
/** (askall-angle item 3) "never came round" / "never came to", someone named a few words before … */
const CAME_ROUND = new RegExp(`${REF}\\s+(?:(?!(?:i|we|you|me)\\b)[a-z]+\\s+){0,6}?never\\s+(?:really\\s+|fully\\s+|properly\\s+)?(?:came|come)\\s+(?:round|around|to)\\b`, 'iu');
/** …after an operation, an accident or a coma ("never came round after the surgery", "from the anaesthetic") … */
const CAME_ROUND_AFTER = /\bnever\s+(?:really\s+|fully\s+|properly\s+)?(?:came|come)\s+(?:round|around|to)\s+(?:after|from|following)\s+(?:(?:the|his|her|their|an?|that)\s+)?(?:[a-z]+\s+)?(?:op|operation|surgery|anaesthetic|anesthetic|accident|crash|stroke|fall|coma|seizure|overdose|heart\s+attack|cardiac\s+arrest|procedure|transplant|bleed|aneurysm)\b/iu;
/** …or at the end of a clause, with a stroke, a fall, an accident or an operation in the words. */
const CAME_ROUND_END = /\bnever\s+(?:really\s+|fully\s+|properly\s+)?(?:came|come)\s+(?:round|around|to)(?=\s*(?:$|[.,!?;:…)—–]|(?:and|but|so|again)\b))/iu;
/** "the tumour beat my dad in the end", "cancer won in the end" (never "my dad beat cancer", "the team won") … */
const KILLER_WON = new RegExp(`\\b(?!(?:flu|sickness|war|fire|storm|god|heaven)\\b)(?:${KILLERS})\\s+(?:has\\s+|had\\s+|finally\\s+|eventually\\s+|in\\s+the\\s+end\\s+)*(?:won\\b(?!\\s+(?:the|a|an|my|his|her|their|our|me|us|him|them|it|\\d|first|second|best|gold|silver|bronze|again|over|by|on|at|against)\\b)|(?:beat|got\\s+the\\s+better\\s+of)\\s+${TAKEN_WHO})`, 'iu');
/** …never beside a relapse, someone alive ("the drugs beat my brother in the end, he relapsed again"). */
const RELAPSED = /\b(?:relaps\w*|rehab|back\s+on\s+(?:the|it)|using\s+again|drinking\s+again|clean\s+again|in\s+recovery)\b/iu;
/**
 * (askall-angle item 3) a pregnancy word: "terminated … for medical reasons" is a pregnancy only beside one (never "they terminated
 * his contract on medical grounds", "he was terminated from his job"), or said with nothing terminated ("we had to terminate for
 * medical reasons", "I had a termination for medical reasons": TFMR_BARE).
 */
const TFMR_BARE = /\b(?:we|i|she|they|to)\s+(?:(?:had|have|decided|chose|needed)\s+to\s+)?terminat(?:e|ed|ing)\s+(?:for|on)\s+medical\s+(?:reasons|grounds)\b|\b(?:a|our|my|her)\s+termination\s+for\s+medical\s+reasons\b/iu;
const PREG_NEAR = /\b(?:pregnan\w*|bab(?:y|ys|ies)|foetus|fetus|scans?|womb|tfmr|at\s+\d+\s*weeks?|\d+\s*weeks?\s+(?:pregnant|along|gestation))\b/iu;
/** (review r12) Someone let go ("let him go", "let our dog go", "let her go") … */
const LET_GO_WHO = new RegExp(`\\blet\\s+(?:him|her|them|(?:(?:my|our|the|his|her|their)\\s+)?${ADJ}(?:${WHO}|${BARE})s?)\\s+go\\b(?!\\s+(?:off|out|outside|in(?!\\s+(?:intensive\\s+care|icu|(?:the\\s+)?hospital|hospice|(?:my|our|his|her|their)\\s+arms|the\\s+end))|inside|home|to|back|of|first|early|on|with|for|free|after\\s+(?:an?\\s+|one\\s+|half\\s+an\\s+|\\d+\\s+|a\\s+few\\s+|a\\s+couple\\s+of\\s+|ten\\s+|twenty\\s+|five\\s+|two\\s+)?(?:hours?|minutes?|mins?|while|bit|lunch|break|school|class|lessons?|registration|questioning|a\\s+warning|that|checking))\\b)`, 'iu');
/** …beside the vet, the doctors, a hospital, intensive care or life support. */
const LET_GO_CARE = /\b(?:vets?|doctors?|drs?|consultant|nurses?|hospital|hospice|intensive\s+care|icu|life\s+support|machines?|ventilator|peacefully|in\s+(?:my|our|his|her|their)\s+arms|nothing\s+more\s+(?:they|we|anyone)\s+could\s+do)\b/iu;
/**
 * "never recovered" (never "never recovered her confidence", "from the shock / the divorce"), with someone named a few words
 * before as its subject (askall-angle item 3: never "my knee never really recovered after I fell skiing", "our team never
 * recovered after the injury", "my dad's knee never recovered") …
 */
const RECOVER_NOT = 'knees?|ankles?|legs?|back|shoulders?|hips?|wrists?|arms?|hands?|foot|feet|neck|elbows?|toes?|fingers?|eyes?|eyesight|sight|hearing|voice|memory|confidence|career|business|shop|company|team|club|side|marriage|relationship|friendship|finances|savings|reputation|form|game|season|garden|lawn|car|bike|phone|laptop|skin|hair|nerves?|mood|sleep|appetite|stamina|fitness|strength|spirits?|grades|marks|sales|profits|economy|town|village|street';
const NEVER_RECOVERED = new RegExp(`${REF}\\s+(?:(?!(?:i|we|you|me)\\b)[a-z]+\\s+){0,6}?(?<!\\b(?:${RECOVER_NOT})\\s)never\\s+(?:really\\s+|fully\\s+|properly\\s+)?recovered\\b(?!\\s+(?:his|her|their|my|its|any|the\\s+(?:money|cost|ball|data|files?)|from\\s+(?:the\\s+)?(?:shock|embarrassment|divorce|breakup|break\\s+up|split|heartbreak|redundancy|setback|loss\\s+of\\s+(?:his|her|their)\\s+job)))`, 'iu');
/** …beside a stroke, a fall, an accident or an operation. */
const MEDICAL_EVENT = /\b(?:stroke|strokes|fall|fell|accident|crash|surgery|operation|op|heart\s+attack|coma|illness|infection|sepsis|pneumonia|covid|cancer|chemo|bleed|aneurysm|seizure|overdose|injuries|injury|fracture|broken\s+hip|hip|transplant)\b/iu;
/** "since he went", "ever since my dad went", "after she went" (never "since she went to uni", "after he went out"). */
const SINCE_WENT = new RegExp(`\\b(?:since|ever\\s+since|after|now\\s+that|now)\\s+(?:${REF})\\s+(?:has\\s+|had\\s+)?(?:went|gone)\\b(?!\\s+(?:to|out|away|off|on|home|back|abroad|into|with|in|travelling|traveling|shopping|for|up|down|over|round|around|through|quiet|missing|mad|upstairs|downstairs|and\\s+(?:got|bought|did|said|made))\\b)`, 'iu');
/** Grieving, a funeral, a grave, condolences ('grief' when no death is named). */
const GRIEF_WORDS = [
  /\b(?:grief|griefs|griefstricken|grief\s+stricken|greif|greiving|grieving|grieve|grieves|grieved|mourn|mourning|mourned|mourns|mourner|mourners|bereaved|bereavement|berevement|bereavment|condolences?|condolances?|sympathy\s+card)\b/iu,
  /\b(?:funerals?|funral|funerel|funreal|grave|graves|graveside|gravestone|graveyard|headstone|cemetery|cemetary|cemetry|crematorium|cremated|cremation|burial|buried|bury|burying|coffin|casket|hearse|obituary|eulogy|memorial\s+service|urn|coroners?|coroner)\b/iu,
  // (askall-angle item 5) someone's memorial ("my sister's memorial is tomorrow", "her memorial"), never a war memorial or a
  // memorial park, hospital or cup
  new RegExp(`\\b(?:(?:${WHO}|${BARE})s|his|her|their)\\s+memorial\\b(?!\\s+(?:hospital|park|ground|grounds|stadium|hall|trophy|cup|match|game|library|lecture|prize|award|run|walk)\\b)|\\bmemorial\\s+(?:mass|gathering|celebration|for\\s+(?:my|our|his|her|him|them))\\b`, 'iu'),
  new RegExp(`\\b(?:his|her|their|(?:${WHO}|${BARE})s?)\\s+ashes\\b|\\bscatter\\w*\\s+(?:the\\s+|(?:his|her|their|my|our)\\s+)?(?:[a-z]+\\s+)?ashes\\b|\\bashes\\s+(?:of|were|are|scattered)\\b`, 'iu'),
  /(?<!\bin\s)(?<!\bin\sthe\s)\b(?:the|his|her|their|a|(?:my|our|your)\s+[a-z]+s)\s+wake\b(?!\s+(?:up|of|me|us|him|her|them|you|everyone|the|my|our)\b)/iu,
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

/** Didn't make it, didn't survive, couldn't be saved: read anywhere in a sentence that names a person or a pet. */
const NOT_SURVIVE = /\b(?:did\s+not|didnt|never|not|wont|will\s+not|might\s+not|may\s+not|couldnt|could\s+not|isnt\s+going\s+to|is\s+not\s+going\s+to|arent\s+going\s+to|werent\s+able\s+to|wasnt\s+able\s+to)\s+(?:going\s+to\s+|gonna\s+)?(?:make\s+it(?=\s*(?:$|[.,!?;:…)—–]|(?:and|but|so|because|cos|after|despite|sadly|unfortunately|in\s+the\s+end|in\s+(?:hospital|surgery|theatre|intensive\s+care|the\s+(?:icu|ambulance|crash|accident|fire|hospital))|through\s+(?:the\s+)?(?:night|surgery|operation|op)|last\s+night|yesterday|today|this\s+(?:morning|time)|i|we|he|she|they|its|it|the|im|ive|now|either)\b))|survive|pull\s+through)\b|\b(?:couldnt|could\s+not|werent\s+able\s+to|were\s+unable\s+to|wasnt\s+able\s+to|was\s+unable\s+to)\s+(?:save|revive|resuscitate)\s+(?:him|her|them|the\s+baby|my|our|his|her)\b/iu;
const SAVED_A_SEAT = /\bsave\s+(?:[a-z]+\s+){1,3}?(?:a|an|any|some)\s+(?:seat|place|spot|space|slice|bit|copy|piece|room)\b/giu;
const NAMES_SOMEONE = new RegExp(`${REF}|\\b(?:${PET})s?\\b`, 'iu');
function notSurvived(t) {
  // (never a seat saved: "I couldn't save my mum a seat")
  return (t.match(/[^.!?…]+/gu) || []).some((sent) => NOT_SURVIVE.test(sent.replace(SAVED_A_SEAT, ' ')) && NAMES_SOMEONE.test(sent.replace(/^\s*(?:i|we)\b/iu, ' ')));
}

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
export function deathTalk(text, { stories = true } = {}) {
  const raw = norm(text);
  if (!/\p{L}/u.test(raw)) return null;
  // (r2-angle item 4: `stories: false` reads a game's, a film's or a book's deaths too, as before: serverLoss)
  const t = blankOrdinary(raw, { stories });
  if (LOSS_WORDS.some((re) => re.test(t)) || NAMED.some((re) => hit(re, t)) || RIP.slice(0, 2).some((re) => re.test(t)) || notSurvived(t)) return 'loss';
  // (r2-angle item 1) "since mum OD'd": the apostrophe out, its capitals as typed ("ODd", "ODed"), never "odd"
  if (/\bOD(?:d|ed)\b/u.test(t)) return 'loss';
  // (a pet named, or the vet: "the vet put him to sleep this morning"; or anyone put to sleep, not for an operation)
  if ((PET_WORD.test(t) || /\bvets?\b/iu.test(t)) && PET_PUT.test(t)) return 'loss';
  if (PUT_TO_SLEEP.test(t)) return 'loss';
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
const PRON_TAIL = '(?=\\s*(?:$|[.,!?;:…)—–]|(?:again|now|forever|soon|so|too|already|right\\s+now|tonight|in\\s+heaven|up\\s+there|wherever|where|on\\s+the\\s+other\\s+side|and|but|because|cos|i|im|so\\s+much|more\\s+than\\s+anything|one\\s+day|someday|someway|somehow|instead|properly|there|here|that|its|it|please|honestly|really|just|anymore|any\\s+more|like|or|than)\\b))';
/** "my dad", "Mum", "Sam": a person after "be with", "join", "without" (checked against who died, below). */
// (never "my brother's kids", "my dad's grave": a possessive names someone or something else)
const OBJ_PERSON = `(?:(?:my|our|his|her|their)\\s+)?${ADJ}(?<who>${WHO}|${BARE})s?\\b(?!\\s+(?:${WHO}|${BARE}|kids|children|family|grave|graves|house|home|room|things|stuff|ashes|wishes|memory|memories|funeral|side|stone|bench|plot|photos?|clothes|bed|chair)s?\\b)|\\b(?<nm>[A-Z][a-z]+)\\b`;
/** What says it is about the one who died wherever they are ("again", "in heaven", "up there"). */
/** (askall-angle item 4) Where "doing the same" ends: the end of a clause, "too", "to himself", never a noun ("the same course"); (r2-angle
 * item 1) an "and" only before a new clause of theirs, never another plan ("the same as her and become a teacher"). */
const SAME_END = '(?=\\s*(?:$|[.,!?;:…)—–]|(?:too|myself|to\\s+(?:myself|himself|herself|themselves|themself)|now|tonight|soon|sometimes|again|(?:and|but|so|then)(?=\\s+(?:i|im|ive|id|ill|it|its|that|thats|honestly|really|tbh|maybe)\\b)|because|cos|i|im|honestly|really|as\\s+well|one\\s+day|someday)\\b))';
const AFTER = /^\s+(?:again|forever|in\s+heaven|up\s+there|wherever|where\s+(?:he|she|they|hes|shes|theyre)|on\s+the\s+other\s+side|once\s+and\s+for\s+all)\b/iu;
const WANT = '(?:would\\s+like|id\\s+like|would\\s+love|id\\s+love|(?:would|id|i\\s+would)\\s+(?:give|do)\\s+anything|keep\\s+wanting|want|wants|wanting|wanna|wanted|need|needs|needed|long|longing|wish\\s+i\\s+could|wish\\s+i\\s+was|wish\\s+i\\s+were|wish\\s+id\\s+be|would\\s+rather|id\\s+rather|rather|ready|cant\\s+wait|just\\s+want|only\\s+want|going|gonna|will|ill|could|should|time|yearn|yearning|desperate|have|part\\s+of\\s+me\\s+wants|all\\s+i\\s+want\\s+is|all\\s+i\\s+wanna\\s+do\\s+is)';
/** The verbs that say someone died (past: never "dying", never "might not make it"). */
/** "gone" as a death, never "gone to pieces", "gone to Spain", "gone out" (review r9, the pronoun linking). */
const GONE = 'gone(?!\\s+(?:to(?!\\s+(?:heaven|a\\s+better\\s+place|be\\s+with|sleep|rest|god|jesus|the\\s+angels|the\\s+rainbow\\s+bridge))|out|home|off|back|away|abroad|on|into|with|up|down|for|shopping|quiet|silent|mad|viral|missing|bald|grey|gray|wrong|crazy|through|over|round|around|past|ahead|along|by|in(?!\\s+(?:peace|(?:his|her|their)\\s+sleep)))\\b)';
const GONE_VERB = 'died|dide|di+e+d+|dided|ded|dead|passed|passd|passed\\s+away|' + GONE + '|killed|murdered|drowned|no\\s+longer\\s+with\\s+us|not\\s+with\\s+us|in\\s+heaven|didnt\\s+make\\s+it|didnt\\s+survive|never\\s+woke\\s+up|took\\s+(?:his|her|their)\\s+(?:own\\s+)?life|killed\\s+(?:himself|herself|themselves)';
/** Who died, by the word the person used for them ("my nan died" → nan), so "be with my nan" means her. */
const DECEASED = [
  new RegExp(`(?<who>${WHO}|${BARE})s?\\s+${AUX}(?:died|dide|dead|passed|${GONE}|killed|murdered|drowned|no\\s+longer|not\\s+with|in\\s+heaven|put\\s+(?:down|to\\s+sleep)|didnt\\s+make\\s+it)\\b`, 'giu'),
  new RegExp(`\\b(?:lost|losing|loss\\s+of|death\\s+of|funeral\\s+of|since|after)\\s+(?:(?:my|our|his|her|their|the)\\s+)?${ADJ}(?<who>${WHO}|${BARE})s?\\b`, 'giu'),
  /\b(?<nm>[A-Z][a-z]+)s?\s+(?:(?:has|had|is|was|just|sadly)\s+)*(?:died|dead|passed|gone|killed)\b/gu,
  /\b(?:lost|RIP|rip)\s+(?<nm>[A-Z][a-z]+)\b/gu,
  // (review r9) "my son who passed away", "my dad, who died last year"
  new RegExp(`(?<who>${WHO}|${BARE})s?\\s*,?\\s+(?:who|that|which)\\s+${AUX}(?:${GONE_VERB})\\b`, 'giu'),
];
/** "he died", "she passed", "they're gone": the one who died is the person named just before (review r9). */
const PRON_DEATH = new RegExp(`\\b(?<pron>he|she|they|hes|shes|theyre|theyve|theyd|hed|shed)\\s+${AUX}(?:${GONE_VERB})\\b`, 'giu');
/**
 * Where "go on", "carry on" and "keep going" say living goes on (review r10): the end of a clause, or before "without
 * <them>", "like this", "any more", "living", "with life" (never "go on holiday", "carry on working", "keep going to …").
 */
const GO_ON_END = `(?=\\s*(?:$|[.,!?;:…)—–])|\\s+(?:like\\s+this|like\\s+that|any\\s*more|living|with\\s+(?:life|my\\s+life|this\\s+life|it\\s+all|everything)|without\\s+(?:him|her|them|(?:my|our)\\s+[a-z]+|(?:${BARE})s?)\\b|(?:and|but|so|because|cos|coz|or)\\b(?!\\s+on\\b)|(?:i|im|ive|id|its|it|honestly|really)\\s*(?:$|[.,!?;:…])|now\\s*(?:$|[.,!?;:…])|(?:i|im|ive|id)\\b))`;
const FOLLOW_RES = [
  // be with / go and be with / be where they are
  new RegExp(`\\b${WANT}\\s+(?:to\\s+)?(?:go\\s+(?:and\\s+)?|just\\s+)?(?:be|go|get|belong|lie|lay|rest)\\s+(?:down\\s+)?(?:back\\s+)?(?:(?:up\\s+)?there\\s+|up\\s+in\\s+heaven\\s+|in\\s+heaven\\s+)?with\\s+(?:(?:him|her|them)${PRON_TAIL}|(?:${OBJ_PERSON}))`, 'giu'),
  /\b(?:belong|be|go|get|want\s+to\s+be|need\s+to\s+be)\s+(?:back\s+)?with\s+(?:him|her|them)\s+(?:again|forever|in\s+heaven|up\s+there|soon)\b/giu,
  // join / follow them
  new RegExp(`\\b${WANT}\\s+(?:to\\s+)?(?:go\\s+(?:and\\s+)?|just\\s+)?join\\s+(?:(?:him|her|them)${PRON_TAIL}|(?:${OBJ_PERSON}))`, 'giu'),
  /\b(?:want|wanna|need|wish\s+i\s+could|going|gonna|will|ill|could|should|just|ready|cant\s+wait|id|i\s+would|i\s+could)\s+(?:to\s+)?(?:just\s+)?follow\s+(?:him|her|them)(?=\s*(?:$|[.,!?;:…]|(?:now|soon|there|wherever|too|into\s+(?:the\s+)?(?:dark|darkness|grave|ground|next|death)|to\s+(?:heaven|the\s+other\s+side)|and|but|i|so)\b))/giu,
  // go where she is (never "where she is buried"), go to her, go with him, go too
  /\b(?:go|be|get|want\s+to\s+go|want\s+to\s+be)\s+(?:to\s+)?where(?:ver)?\s+(?:he|she|they|hes|shes|theyre)\b(?!\s+(?:used\s+to|use\s+to|would|always|often|once|usually|loved\s+to|liked\s+to|took|takes|showed)\b)(?!(?:\s+(?:is|are|s|re|was|were|has\s+been|have\s+been|is\s+now|lies|lay|used\s+to))?\s+(?:buried|laid|resting|scattered|cremated|kept|from|working|living|staying|grew\s+up|lived|worked|went|loved|liked|played|was\s+born|born|came\s+from|studied|met|go|live|work|walk|walked|sat|sit))/giu,
  new RegExp(`\\b${WANT}\\s+(?:to\\s+)?go\\s+(?:to|with)\\s+(?:him|her|them)${PRON_TAIL}`, 'giu'),
  /\b(?:wish|wished|wishing|wishes)\s+(?:that\s+)?(?:i|id|i\s+had|i\s+could|i\s+could\s+have|i\s+couldve|i\s+would\s+have|i\s+wouldve)\s+(?:have\s+)?(?:gone|went|go|died|left|been\s+taken|been\s+killed)\s+(?:with|instead\s+of|alongside)\s+(?:him|her|them|\w+)\b|\bshould\s+(?:have|ve|of)\s+(?:gone|died)\s+with\s+(?:him|her|them)\b/giu,
  /\b(?:want|wanna|wanted|need|ready)\s+to\s+(?:go|die|leave|come)\s+(?:too|as\s+well|with\s+(?:him|her|them))\b|\btake\s+me\s+(?:with\s+(?:him|her|them|you)|too|instead|as\s+well)\b|\bwhy\s+didnt\s+(?:he|she|they|god)\s+take\s+me\b/giu,
  // it should have been me
  /\b(?:it\s+)?should\s+(?:have|ve|of)\s+been\s+me\b|\bwish\s+(?:it\s+)?(?:was|were|had\s+been)\s+me\b|\bwhy\s+(?:wasnt|couldnt)\s+it\s+(?:have\s+been\s+|be\s+)?me\b/giu,
  // can't / don't want to go on, be here or live without them; what's the point without her
  new RegExp(`\\b(?:cant|cannot|can\\s+not|dont\\s+want\\s+to|do\\s+not\\s+want\\s+to|dont\\s+wanna|dont\\s+know\\s+how\\s+to|dont\\s+know\\s+if\\s+i\\s+can|no\\s+point(?:\\s+in)?|whats\\s+the\\s+point(?:\\s+(?:of|in))?|what\\s+is\\s+the\\s+point(?:\\s+(?:of|in))?|theres\\s+no\\s+point(?:\\s+in)?|there\\s+is\\s+no\\s+point(?:\\s+in)?|no\\s+reason\\s+to|not\\s+worth|dont\\s+see\\s+the\\s+point(?:\\s+(?:of|in))?|cant\\s+see\\s+the\\s+point(?:\\s+(?:of|in))?|wont|will\\s+not|refuse\\s+to|how\\s+(?:can|do|am)\\s+i\\s+(?:supposed\\s+to\\s+)?|why\\s+(?:should|would)\\s+i)\\s+(?:(?:go(?:ing)?\\s+on(?:\\s+living)?|carry(?:ing)?\\s+on|keep(?:ing)?\\s+going|be(?:ing)?\\s+here|be(?:ing)?\\s+alive|stay(?:ing)?\\s+alive|stay(?:ing)?|liv(?:e|ing)|exist(?:ing)?|surviv(?:e|ing)|do(?:ing)?\\s+(?:life|this|it|anything|any\\s+of\\s+this)|fac(?:e|ing)\\s+(?:life|this|it|anything|the\\s+world|tomorrow|another\\s+day|the\\s+future)|breath(?:e|ing)|get(?:ting)?\\s+up|wak(?:e|ing)\\s+up|bother(?:ing)?|try(?:ing)?|life|anything|everything|it|this|any\\s+more|anymore|here|now)\\s+)?(?:any\\s*more\\s+)?without\\s+(?:(?:him|her|them)(?=\\s*(?:$|[.,!?;:…]|(?:here|around|in\\s+my\\s+life|by\\s+my\\s+side|with\\s+me|any\\s*more|now|and|so|but|i|its|it|to|anyway|though|really|honestly|either|at\\s+all|beside\\s+me|there|in\\s+it|in\\s+the\\s+world|alive)\\b))|(?:${OBJ_PERSON}))`, 'giu'),
  /\blife\s+(?:is|isnt|feels|seems|has\s+been|would\s+be|will\s+be)\s+(?:so\s+|just\s+|completely\s+)?(?:pointless|meaningless|empty|not\s+worth\s+(?:it|living)|worthless|nothing|over)\s+without\b|\bno\s+life\s+without\b|\bnothing\s+(?:left\s+)?to\s+live\s+for\b|\bno\s+reason\s+to\s+(?:live|be\s+here)\b/giu,
  new RegExp(`\\bno\\s+reason\\s+to\\s+(?:go\\s+on|carry\\s+on|keep\\s+going)${GO_ON_END}`, 'giu'),
  // soon: "I'll be with him soon", "not long till I'm with her"
  /\b(?:ill|i\s+will|im\s+going\s+to|i\s+am\s+going\s+to|im\s+gonna|i\s+hope\s+(?:i|ill)|cant\s+wait\s+to|not\s+long\s+(?:until|till|til)\s+(?:i|im))\s+(?:be\s+with|see|join|meet|hold|be\s+back\s+with)\s+(?:him|her|them|\w+)\s+(?:again\s+)?soon\b|\bnot\s+long\s+(?:until|till|til)\s+(?:i|im)\s+(?:with|beside)\s+(?:him|her|them)\b/giu,
  // reunited with them
  /\b(?:want|wanna|wish|cant\s+wait|long|ready|need|hope|going)\s+(?:to\s+)?(?:be\s+)?reunit(?:e|ed)\s+with\b/giu,
  // (review r8) wish I was with him; be next to, beside, lie (down) beside her (review r11: "lie down next to her forever");
  // all I want is to be with him; rather be
  // with her than here; part of me wants to go; go to sleep and be with her; see him again soon; can't be here
  new RegExp(`\\bwish(?:ed|ing|es)?\\s+(?:that\\s+)?(?:i|id)\\s+(?:was|were|could\\s+be)\\s+(?:back\\s+|still\\s+|there\\s+)?with\\s+(?:(?:him|her|them)${PRON_TAIL}|(?:${OBJ_PERSON}))(?!\\s+(?:when|at\\s+the\\s+(?:end|time|hospital|hospice)|in\\s+(?:his|her|their)\\s+last|before|that\\s+(?:night|day|morning)|for\\s+(?:his|her|their)\\s+last)\\b)`, 'giu'),
  new RegExp(`\\b${WANT}\\s+(?:to\\s+)?(?:just\\s+)?(?:be|lie|lay|sleep|rest|go)\\s+(?:down\\s+)?(?:right\\s+)?(?:next\\s+to|beside|alongside|by\\s+(?:his|her|their)\\s+side|near)\\s+(?:(?:him|her|them)${PRON_TAIL}|(?:${OBJ_PERSON}))`, 'giu'),
  new RegExp(`\\ball\\s+i\\s+(?:want|wanna|need|wish\\s+for|ever\\s+want)\\s+(?:now\\s+)?(?:is|now\\s+is)?\\s*(?:to\\s+)?be\\s+with\\s+(?:(?:him|her|them)${PRON_TAIL}|(?:${OBJ_PERSON}))`, 'giu'),
  new RegExp(`\\b(?:rather|prefer\\s+to)\\s+be\\s+with\\s+(?:him|her|them|${OBJ_PERSON})\\s+than\\s+(?:here|alive|living|be\\s+here|stay\\s+here|on\\s+this\\s+earth|in\\s+this\\s+world|anywhere)\\b`, 'giu'),
  /\bpart\s+of\s+me\s+(?:just\s+)?(?:wants|wanted|would\s+like|wishes|needs)\s+to\s+(?:go|die|leave|follow|join|be\s+with|be\s+where|go\s+with|go\s+too)\b/giu,
  /\b(?:go\s+to\s+sleep|sleep|close\s+my\s+eyes|fall\s+asleep|lie\s+down)\s+and\s+(?:just\s+)?(?:be\s+with|see|join|wake\s+up\s+(?:with|next\s+to)|never\s+wake\s+up|not\s+wake\s+up)\b/giu,
  /\b(?:follow|join|see|be\s+with|meet|hold)\s+(?:him|her|them)\s+(?:again\s+)?soon\b/giu,
  /\b(?:dont|do\s+not|dont\s+wanna|cant|cannot|no\s+longer\s+want\s+to)\s+(?:want\s+to\s+)?(?:be\s+here|be\s+alive|live|exist|stay\s+alive|wake\s+up)\b(?!\s+(?:with|at|in|for|on|alone|by\s+myself|tonight|there|like\s+this\s+at)\b)/giu,
  // (review r10) "can't go on", "can't carry on like this", "can't keep going without her": only at the end of a clause
  // or before these, never before a noun or another verb ("go on holiday", "carry on working", "keep going to the park")
  new RegExp(`\\b(?:dont|do\\s+not|dont\\s+wanna|cant|cannot|can\\s+not|no\\s+longer\\s+want\\s+to)\\s+(?:want\\s+to\\s+)?(?:go\\s+on|carry\\s+on|keep\\s+going)${GO_ON_END}`, 'giu'),
  // (review r9) go to heaven to see her, see him in heaven, be in heaven with them
  new RegExp(`\\b${WANT}\\s+(?:to\\s+)?(?:just\\s+)?(?:go|get|be|going|went)\\s+(?:up\\s+)?(?:to|in|into)\\s+heaven\\b|\\bsee\\s+(?:him|her|them|${OBJ_PERSON})\\s+(?:again\\s+)?(?:in|up\\s+in)\\s+heaven\\b`, 'giu'),
  // (review r10) "thinking of joining her", "I want to hold her in heaven", "without her, what's the point", "nothing left
  // for me here without him", "can't imagine living without him", "live in a world without him", "be buried with her"
  new RegExp(`\\bthinking\\s+(?:of|about)\\s+(?:just\\s+)?(?:joining|going\\s+to|going\\s+with|being\\s+with|following)\\s+(?:(?:him|her|them)${PRON_TAIL}|(?:${OBJ_PERSON}))`, 'giu'),
  new RegExp(`\\b${WANT}\\s+(?:to\\s+)?(?:just\\s+)?[a-z]+\\s+(?:him|her|them|${OBJ_PERSON})\\s+(?:again\\s+)?(?:in|up\\s+in)\\s+heaven\\b`, 'giu'),
  new RegExp(`\\bwithout\\s+(?:him|her|them|${OBJ_PERSON})\\s*[,.…—–-]*\\s*(?:(?:whats|what\\s+is|wheres)\\s+the\\s+point|(?:theres|there\\s+is|i\\s+see|i\\s+dont\\s+see|i\\s+cant\\s+see)\\s+(?:no|the)\\s+point|no\\s+point|(?:i|im)\\s+(?:just\\s+)?(?:cant|cannot|dont\\s+want\\s+to|dont\\s+wanna|wont)\\s+(?:go\\s+on|carry\\s+on|keep\\s+going|live|be\\s+here|exist|do\\s+(?:this|it|life)|be\\s+alive|survive|breathe)|(?:im|i\\s+am)\\s+nothing|(?:i\\s+have|ive\\s+got|theres|there\\s+is)\\s+nothing|life\\s+(?:is|feels|seems|isnt)\\s+(?:so\\s+|just\\s+)?(?:pointless|meaningless|empty|nothing|not\\s+worth|worth\\s+nothing)|nothing\\s+matters)`, 'giu'),
  /\bnothing\s+(?:left\s+)?(?:for\s+me\s+)?(?:here\s+)?(?:now\s+)?without\s+(?:him|her|them|(?:my|our)\s+[a-z]+)\b|\b(?:im|i\s+am|i\s+feel)\s+(?:like\s+)?nothing\s+without\s+(?:him|her|them|(?:my|our)\s+[a-z]+)\b/giu,
  new RegExp(`\\b(?:cant|cannot|can\\s+not|couldnt|could\\s+not|dont\\s+know\\s+how\\s+(?:i\\s+can|to))\\s+(?:even\\s+)?imagine\\s+(?:living|life|going\\s+on|carrying\\s+on|being\\s+here|being\\s+alive|existing|a\\s+life|my\\s+life|the\\s+rest\\s+of\\s+my\\s+life|another\\s+day)\\s+without\\s+(?:him|her|them|${OBJ_PERSON})`, 'giu'),
  new RegExp(`(?<!\\blearn(?:ing|ed|t|s)?\\s+(?:how\\s+)?to\\s+)\\b(?:live|living|exist|existing|be|stay)\\s+in\\s+a\\s+world\\s+without\\s+(?:him|her|them|${OBJ_PERSON})`, 'giu'),
  new RegExp(`\\b${WANT}\\s+(?:to\\s+)?(?:just\\s+)?(?:be\\s+)?buried\\s+(?:with|alongside)\\s+(?:(?:him|her|them)${PRON_TAIL}|(?:${OBJ_PERSON}))`, 'giu'),
  // (askall-angle item 4) doing what they did: "my best friend killed himself and I keep thinking about doing the same", "I could
  // do it too", "I want to do what he did", "thinking of doing the same as her" (never "the same course he did")
  new RegExp(`\\b(?:thinking\\s+(?:about|of)|thought\\s+(?:about|of)|think\\s+(?:about|of)|want\\s+to|wanna|wanted\\s+to|going\\s+to|gonna|could|might|should|ill|i\\s+will|tempted\\s+to|feel\\s+like|considering|keep\\s+wanting\\s+to|ready\\s+to|need\\s+to)\\s+(?:just\\s+|maybe\\s+|actually\\s+|really\\s+|seriously\\s+)?(?:doing|do)\\s+(?:the\\s+same(?:\\s+thing)?(?:\\s+as\\s+(?:him|her|them))?|it\\s+too|that\\s+too|it\\s+as\\s+well|that\\s+as\\s+well|what\\s+(?:he|she|they)\\s+did)${SAME_END}`, 'giu'),
  // (askall-angle item 4) "join him", "join her", "join them" after a death or a suicide word (the pronoun the one who died)
  new RegExp(`\\b(?:join|joining|joined)\\s+(?:him|her|them)${PRON_TAIL}`, 'giu'),
  // want to see him again (never "I'll see her again one day", never someone alive: read beside who died)
  new RegExp(`\\b(?:want|wants|wanna|wanted|need|needs|long|longing|desperate|ready|cant\\s+wait|just\\s+want|really\\s+want|keep\\s+wanting)\\s+(?:to\\s+)?(?:just\\s+)?see\\s+(?:(?:him|her|them)|${OBJ_PERSON})\\s+again\\b`, 'giu'),
];
/** Typos in the wish ("i want to b with him", "I want too be with her", "be wit him"), read as meant. */
const FOLLOW_TYPOS = [[/\b(to|wanna|gonna|ill|could|would|just|cant\s+wait\s+to)\s+b\b/giu, '$1 be'], [/\b(want|wanna|need|wish|wished|wishing|ready|going|have|long)\s+too\s+(?=(?:be|b|go|join|see|follow|die|lie|sleep|rest)\b)/giu, '$1 to '], [/\bbe\s+wit\b/giu, 'be with']];
/**
 * Death talk only about someone still alive (dying, in a hospice, on life support, in intensive care, not expected to
 * survive): never a wish to follow. Present and future only (review r9: "my dad's dying", "she could die any day",
 * "he might not make it through the night", "they think he won't wake up", "close to death").
 */
const STILL_ALIVE = new RegExp([
  '\\b[a-z]+s\\s+(?:\\w+\\s+)?dying\\b', '\\b(?:is|s|are|re|was|were|been|keeps)\\s+(?:[a-z]+\\s+){0,4}?dying\\b', '\\bdying\\s+(?:of|from)\\b',
  '\\b(?:in\\s+(?:a\\s+)?|at\\s+(?:the\\s+)?)?hospice\\b', '\\b(?:on\\s+)?life\\s+support\\b', '\\bterminal(?:ly)?\\s+\\w+', '\\b(?:is|s|was|its|are|now|been|went|gone|turned|as)\\s+terminal\\b',
  '\\bend\\s+of\\s+(?:life|(?:his|her|their)\\s+life)(?:\\s+care)?\\b', '\\bpalliative(?:\\s+care)?\\b', '\\b(?:days|weeks|months|hours)\\s+(?:left\\s+)?to\\s+live\\b',
  '\\bwont\\s+be\\s+long\\b', '\\bnot\\s+long\\s+left\\b', '\\b(?:hasnt|has\\s+not)\\s+got\\s+long\\b', '\\bdoesnt\\s+have\\s+long(?:\\s+left)?\\b',
  // the future: could die, might not make it, won't survive the night, won't wake up
  '\\b(?:might|may|could|will|would|is\\s+going\\s+to|going\\s+to|gonna|about\\s+to|likely\\s+to|expected\\s+to|afraid\\s+(?:he|she|they)\\s+(?:will|ll))\\s+(?:not\\s+)?die\\b',
  '\\b(?:(?:might|may|could)\\s+not|mightnt|wont|will\\s+not|probably\\s+wont|isnt\\s+going\\s+to|is\\s+not\\s+going\\s+to|not\\s+going\\s+to|arent\\s+going\\s+to|unlikely\\s+to|not\\s+expected\\s+to|may\\s+never)\\s+(?:make\\s+it|survive|pull\\s+through|wake\\s+up|last|recover)(?:\\s+(?:through\\s+)?the\\s+(?:night|week|weekend|day))?\\b',
  '\\bclose\\s+to\\s+death\\b', '\\bnear\\s+death\\b', '\\bat\\s+deaths\\s+door\\b', '\\bnear\\s+the\\s+end\\b',
].join('|'), 'giu');
/** A death that has happened (with one of these, "dying" is never only about someone still alive). */
const PAST_DEATH = /\b(?:died|dide|di+e+d+|dided|ded|dead|passed|passd|death|deaths|deceased|funeral|grave|buried|cremated|killed|murdered|drowned|lost|loss|gone|rip|miscarri\w*|stillborn|didnt\s+(?:make\s+it|survive|wake\s+up)|never\s+woke\s+up|no\s+longer\s+with\s+us|widow\w*)\b/iu;
/** …where only the plainest wishes still count ("I want to die with her", "I can't live without him"). */
const ALIVE_FOLLOW = /\b(?:want|wanna|ready|going)\s+to\s+die\b|\bwish\s+i\s+(?:was|were)\s+dead\b|\btake\s+me\s+instead\b|\b(?:cant|cannot|dont\s+want\s+to)\s+(?:live|go\s+on|be\s+here|exist)\s+without\b|\blife\s+(?:is|will\s+be|would\s+be)\s+(?:pointless|meaningless|not\s+worth\s+living)\s+without\b|\bnothing\s+(?:left\s+)?to\s+live\s+for\b|\bno\s+reason\s+to\s+live\b/iu;
/** Who a word is: he, she, either. */
const MALE = /^(?:dad|daddy|papa|pa|father|grandad|granddad|grandpa|grandfather|nonno|opa|abuelo|zayde|brother|bro|son|husband|hubby|boyfriend|bf|uncle|nephew|godfather|godson|grandson|boy|man|guy|stepdad|step dad|stepfather|stepbrother|stepson|father in law|brother in law|son in law|fiance)$/iu;
const FEMALE = /^(?:mum|mom|mam|mummy|mommy|mama|mamma|mother|nan|nana|nanna|nanny|gran|granny|grandma|grandmother|grandmama|nonna|oma|abuela|bubbe|sister|sis|daughter|wife|wifey|girlfriend|gf|aunt|auntie|aunty|niece|godmother|goddaughter|granddaughter|girl|woman|lady|stepmum|step mum|stepmom|stepmother|stepsister|stepdaughter|mother in law|sister in law|daughter in law|fiancee)$/iu;

/** Who died, by the words used for them (lower-case person words, and names as typed). */
function deceased(t, cased) {
  // (someone else's is never the one "be with my mum" means: "I want to be with my mum. Her mum died.")
  return new Set(deathMentions(t, cased).filter((d) => !d.owned).map((d) => d.who));
}
/** Someone else's, just before the word for who died: "my friends mum", "my husbands dad", "her baby", "his dog". */
const OWNED = new RegExp(`(?:\\b(?:${WHO}|${BARE})s|\\b(?:his|her|their))\\s+${ADJ}$`, 'iu');
/** Each mention of who died: the word, where it sits, and whether someone else owns it ("my friend's mum", "her baby"). */
function deathMentions(t, cased) {
  const out = [];
  for (const re of DECEASED) {
    re.lastIndex = 0;
    for (const m of (re.flags.includes('i') ? t : cased).matchAll(re)) {
      const w = m.groups?.who || (m.groups?.nm && !NOT_NAMES.test(m.groups.nm) ? m.groups.nm : null);
      if (!w) continue;
      const at = m.index + m[0].toLowerCase().indexOf(w.toLowerCase());
      const before = t.slice(Math.max(0, at - 40), at);
      // someone else's: "my friends mum", "my husbands dad", "my sisters baby", "lost her baby", "his dog"
      const owned = OWNED.test(before);
      out.push({ who: w.toLowerCase(), at, end: m.index + m[0].length, owned });
    }
  }
  // "I want to be with my dad. He died last year.", "my wife, she died": the person named just before the pronoun
  // (the nearest one it can be: "he" never a mum), within a sentence or two
  PRON_DEATH.lastIndex = 0;
  for (const m of t.matchAll(PRON_DEATH)) {
    const pron = /^h/u.test(m.groups.pron) ? 'he' : /^s/u.test(m.groups.pron) ? 'she' : 'they';
    const from = Math.max(0, m.index - 140);
    let best = null;
    for (const p of t.slice(from, m.index).matchAll(PERSON_WORD)) {
      // ("dads" → "dad": the word they used for them, as "be with my dad" names it)
      const raw = p[0].toLowerCase();
      const w = /s$/u.test(raw) && ONE_WORD.test(raw.slice(0, -1)) ? raw.slice(0, -1) : raw;
      if (pron === 'he' && FEMALE.test(w)) continue;
      if (pron === 'she' && MALE.test(w)) continue;
      best = { w, at: from + p.index };
    }
    if (!best) continue;
    const before = t.slice(Math.max(0, best.at - 40), best.at);
    out.push({ who: best.w, at: best.at, end: m.index + m[0].length, owned: OWNED.test(before), pronoun: true });
  }
  return out.sort((a, b) => a.at - b.at);
}
const PERSON_WORD = new RegExp(`\\b(?:${WHO}|${BARE})s?\\b`, 'giu');
const ONE_WORD = new RegExp(`^(?:${WHO}|${BARE})$`, 'iu');
/**
 * "him", "her", "them" stands for the one who died only when no one else could be meant: no other person named
 * between the death and the pronoun ("my uncle died and my aunt is alone so I want to be with her"), the one who
 * died not someone else's ("my friend's mum died and I want to be with her"), and "him" never for a mum.
 */
function pronounIsDeceased(t, cased, at, pron) {
  const ds = deathMentions(t, cased);
  // (no word for them, only "she's gone": the pronoun is the one who died)
  if (!ds.length) return true;
  const d = [...ds].reverse().find((x) => x.at < at) || ds[0];
  if (d.owned) return false;
  if (/^him$/iu.test(pron) && FEMALE.test(d.who)) return false;
  if (/^her$/iu.test(pron) && MALE.test(d.who)) return false;
  const between = t.slice(Math.min(d.end, at), Math.max(d.end, at));
  for (const m of between.matchAll(PERSON_WORD)) {
    const w = m[0].replace(/s$/u, '');
    if (w === d.who || m[0] === d.who) continue;
    // (someone the pronoun can't be is never the one meant: "my dad died and my mum is dying and I want to be with him")
    if ((/^him$/iu.test(pron) && FEMALE.test(w)) || (/^her$/iu.test(pron) && MALE.test(w))) continue;
    return false;
  }
  // (a capitalised word that opens a sentence is not a name)
  for (const m of cased.slice(Math.min(d.end, at), Math.max(d.end, at)).matchAll(/(?<![.!?]\s*)(?<!^\s*)\b[A-Z][a-z]+\b/gu)) if (!NOT_NAMES.test(m[0]) && m[0].toLowerCase() !== d.who) return false;
  return true;
}
/**
 * True when the words say they want to be with, join or follow someone, or can't (or don't want to) go on,
 * be here or live without them. "Be with my mum" counts only when Mum is the one who died, or with "again",
 * "in heaven" or "up there"; "be with her" counts unless it is a plan with the living ("at the funeral", "this
 * weekend"). Read only beside death talk (deathEscalation).
 */
export function wantsToFollow(text) {
  let cased = blankOrdinary(norm(text));
  for (const [re, to] of FOLLOW_TYPOS) cased = cased.replace(re, to);
  const t = cased.toLowerCase();
  if (!/\p{L}/u.test(t)) return false;
  const gone = deceased(t, cased);
  for (const re of FOLLOW_RES) {
    re.lastIndex = 0;
    const src = re.source.includes('(?<nm>') ? cased : t;
    for (const m of src.matchAll(re)) {
      const who = m.groups?.who?.toLowerCase(), nm = m.groups?.nm;
      if (!who && !nm) {
        // a "him" / "her" / "them" in it: only when it can only be the one who died
        const pron = /\b(him|her|them)\b/iu.exec(m[0]);
        if (!pron || pronounIsDeceased(t, cased, m.index + pron.index, pron[1])) return true;
        continue;
      }
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
/**
 * True when the only death talk is about someone still alive (dying, in a hospice, on life support, terminal):
 * wanting to be with them, at their bedside, is ordinary love.
 */
export function stillAlive(text) {
  const t = norm(text);
  if (!deathTalk(t)) return false;
  let rest = t.replace(STILL_ALIVE, ' ');
  // (any "dying" when no death that has happened is named: "my nan is very ill and dying")
  if (!PAST_DEATH.test(blankOrdinary(rest))) rest = rest.replace(/\bdying\b/giu, ' ');
  return !deathTalk(rest);
}
// ------------------------------------------------- (r2-angle item 1) doing what the one who died did --
// The wish to follow someone who died kept slipping past phrase lists ("dad hanged himself, maybe I'll go the same way",
// "my brother killed himself and I might follow suit", "mum's dead, thinking about doing it myself"). So the rule is
// structural: a death named (deathTalk), with a SUICIDE death word or any death word, and somewhere in the same message a
// first-person clause about doing the same act: an intent or a modal before it (I might, I'll, maybe I, I'm going to, I could,
// considering, thought about, thinking about / bout / of, makes me want, want to), and what they would do ("the same way",
// "follow suit / him / her", "copy her", "do it too / myself", "I'm next", "likewise", "doing the same", "the same" after
// considering) at the end of a clause ("tbh", "honestly", "too", "soon" allowed; never "the same course", "the same way to
// school", "follow her recipes", "the same when I'm old"); or the MEANS ("I know where the gun is", "I keep looking at bridges",
// "I have the pills", "bought rope"); or "I don't see the point (any more)", "I want to go to sleep forever", "I should have
// died instead". A fear ("I'm scared I'll go the same way", after cancer) or a "never" / "don't want to" is not a wish, unless
// the death was a suicide (then fear of doing the same is care too: support first, nothing sent).
/** A death by suicide named: the act someone may say they would do too. */
const SUICIDE_DEATH = /\b(?:hanged|hung)\s+(?:himself|herself|themselves|themself)\b|\b(?:killed|kiled|killd|kild|shot|topped|offed|gassed|poisoned|electrocuted|hanged|drowned)\s+(?:himself|herself|themselves|themself)\b|\b(?:took|taken|take|takes|ended|end|ends|ending)\s+(?:his|her|their)\s+(?:own\s+)?(?:life|lives)\b|\boverdosed\b|\b(?:took|taken|had)\s+an?\s+overdose\b|\b(?:jumped|threw\s+(?:himself|herself|themselves|themself))\s+(?:off|from|in\s+front\s+of|under)\b|\bdied\s+by\s+suicide\b|\bsuicide\b|\bsuicided\b/iu;
/** "she OD'd" with the apostrophe out ("ODd", case kept: never "odd"), "ODed", "O.D.'d". */
const SUICIDE_OD = /\bO\.?D(?:d|ed|\s+d)\b|\b(?:oded|odded|od\s+d)\b/u;
/** Where "the same" (or what they would do) ends: a clause end, or a few small words after it. */
const ACT_END = '(?=\\s*(?:$|[.,!?;:…)—–]|(?:too|myself|as\\s+well|also|soon|sometimes|again|now|tonight|today|tomorrow|eventually|one\\s+day|someday|some\\s+day|honestly|really|seriously|tbh|tbf|ngl|lol|idk|tho|though|anyway|anyways|and|but|so|or|because|cos|coz|i|im|ive|id|ill|if|maybe|probably|in\\s+the\\s+end|at\\s+this\\s+rate|to\\s+be\\s+honest|x+|haha)\\b))';
/**
 * What they would do (each ends a clause, ACT_END). `needIntent`: an intent or a modal must come first in its clause;
 * `suicideOnly`: only after a suicide ("do it", "I might too"); `wish`: after any other death only a wish or a thought counts
 * ("thinking about doing it myself"), never a plan ("so I'll do it myself", the fence he used to fix).
 */
const ACTS = [
  { re: new RegExp(`\\b(?:go|goes|going|gone|went|end\\s+up|ending\\s+up|end|ends|ended\\s+up|head|heading|go\\s+out)\\s+(?:out\\s+)?the\\s+(?:exact\\s+)?same\\s+way(?:\\s+as\\s+(?:him|her|them))?${ACT_END}`, 'giu'), needIntent: true },
  { re: new RegExp(`\\b(?:im|i\\s+am)\\s+(?:(?:already|just|probably|definitely|slowly|really)\\s+)?(?:going|heading|ending\\s+up)\\s+(?:out\\s+)?the\\s+(?:exact\\s+)?same\\s+way(?:\\s+as\\s+(?:him|her|them))?${ACT_END}`, 'giu'), needIntent: false },
  { re: new RegExp(`\\b(?:do|doing|did|done|does)\\s+(?:the\\s+(?:exact\\s+|very\\s+)?same(?:\\s+thing)?(?:\\s+as\\s+(?:him|her|them))?|likewise|what\\s+(?:he|she|they)\\s+did)${ACT_END}`, 'giu'), needIntent: true },
  { re: new RegExp(`\\b(?:do|doing|did|done|does)\\s+(?:it|that)\\s+(?:too|myself|as\\s+well|also)${ACT_END}`, 'giu'), needIntent: true, wish: true },
  { re: new RegExp(`\\b(?:considering|considered|consider|contemplating|contemplated|thinking\\s+(?:about|of)|thought\\s+(?:about|of)|think\\s+(?:about|of))\\s+(?:the\\s+same(?:\\s+thing)?|it\\s+(?:too|myself)|likewise)${ACT_END}`, 'giu'), needIntent: false },
  { re: new RegExp(`\\b(?:do|doing)\\s+it${ACT_END}`, 'giu'), needIntent: true, suicideOnly: true },
  { re: new RegExp(`\\b(?:end|ending|ended)\\s+it(?:\\s+all)?(?:\\s+(?:too|myself|as\\s+well))?${ACT_END}`, 'giu'), needIntent: true, wish: true },
  { re: new RegExp(`\\b(?:i|maybe\\s+i|i\\s+think\\s+i|i\\s+guess\\s+i|perhaps\\s+i)\\s+(?:will|might|could|may|would)\\s+(?:do\\s+)?too${ACT_END}`, 'giu'), needIntent: false, suicideOnly: true },
  { re: new RegExp(`\\bthe\\s+same(?:\\s+thing)?\\s+(?:will|might|could|is\\s+going\\s+to|gonna|is\\s+gonna)\\s+happen\\s+to\\s+me${ACT_END}`, 'giu'), needIntent: false, suicideOnly: true },
  { re: new RegExp(`\\bfollow(?:ing)?\\s+(?:suit|(?:him|her|them)(?!\\s+(?:in|on|around|about|into\\s+(?:the\\s+)?(?:kitchen|garden|house|shop|room|town))\\b))${ACT_END}`, 'giu'), needIntent: true },
  { re: new RegExp(`\\bcop(?:y|ying|ied|ies)\\s+(?:him|her|them|what\\s+(?:he|she|they)\\s+did)${ACT_END}`, 'giu'), needIntent: true },
  { re: new RegExp(`\\b(?:im|i\\s+am|ill\\s+be|i\\s+will\\s+be|i\\s+might\\s+be|i\\s+could\\s+be|me)\\s+next${ACT_END}`, 'giu'), needIntent: false },
  { re: new RegExp(`\\b(?:meet|meeting|share|sharing|suffer|suffering)\\s+the\\s+same\\s+(?:fate|end)${ACT_END}`, 'giu'), needIntent: true },
];
/** (after a death that was not a suicide) a wish or a thought, never a plan: "thinking about doing it myself". */
const WISH = /\b(?:wanna|want\s+to|wants\s+to|wanted\s+to|tempted|considering|considered|consider|contemplating|contemplated|thinking\s+(?:about|of)|thought\s+(?:about|of)|think\s+(?:about|of)|makes?\s+me\s+want|made\s+me\s+want|feel\s+like|wish|keep\s+wanting|urge|ready\s+to|might|could|maybe)\b/iu;
/** (after a death that was not a suicide) dying peacefully, one day, old: "hopefully I'll go the same way, peacefully". */
const PEACEFUL = /\b(?:peacefully|in\s+(?:my|her|his|their)\s+sleep|old\s+age|when\s+(?:im|i\s+am|i\s+get|im\s+really)\s+old|at\s+(?:\d{2,3}|ninety|a\s+hundred)|hopefully|when\s+my\s+time\s+comes)\b/iu;
/** (after a death that was not a suicide) "do the same as her and become a teacher": another plan follows. */
const AND_PLAN = /^\s*(?:,\s*)?(?:and|so|then)\s+(?!(?:i|im|ive|id|ill|it|its|that|thats|honestly|really|tbh)\b)[a-z]+/iu;
/** An intent or a modal before the act, in its clause (the subject may be left out: "thinking about doing it myself"). */
const INTENT = /\b(?:might|may|could|will|ill|would|id|wanna|want\s+to|wants\s+to|wanted\s+to|going\s+to|gonna|need\s+to|should|shall|plan\s+to|planning\s+to|planning\s+on|about\s+to|tempted|ready\s+to|considering|considered|consider|contemplating|contemplated|thinking\s+(?:about|of)|thought\s+(?:about|of)|think\s+(?:about|of)|makes?\s+me\s+want|made\s+me\s+want|feel\s+like|wish\s+i\s+could|keep\s+wanting|urge\s+to|likely\s+to|maybe|probably|prob|surely|bound\s+to|end\s+up|ending\s+up)\b/iu;
/** A fear or a "never" is not a wish (after a death that was not a suicide). */
const FEAR = /\b(?:scared|afraid|worried|worry|worrying|terrified|frightened|fear|fears|feared|fearing|dread|dreading|panicking|panic|paranoid|anxious|petrified|nervous)\b/iu;
const NEVER = /\b(?:dont|do\s+not|never|wont|will\s+not|not\s+going\s+to|refuse\s+to|wouldnt|would\s+not|shouldnt|cant|cannot|not)\b(?!\s+(?:know|sure|see\s+why\s+not|stop|help|mind|care|wait|lie)\b)/iu;
/** First person, or nobody else as the subject (a third-person clause is about someone else). */
const FIRST = /\b(?:i|im|ive|id|ill|me|myself)\b/iu;
const THIRD = new RegExp(`\\b(?:he|she|they|hes|shes|theyre|theyll|hell|shell|(?:my|our|his|her|their)\\s+${ADJ}(?:${WHO}|${BARE})s?)\\b`, 'iu');
/** Where a clause starts: punctuation, or a joining word. */
const CLAUSE_FROM = /[.,!?;:…—–]|\b(?:and|but|so|because|cos|coz|then|while|plus|now)\b/giu;
/** The last few words of `head` since its last clause boundary (at most ten). */
function clauseBefore(head) {
  let from = 0;
  for (const b of head.matchAll(CLAUSE_FROM)) from = b.index + b[0].length;
  return head.slice(from).split(/\s+/u).filter(Boolean).slice(-10).join(' ');
}
/** The means ("I know where the gun is", "I keep looking at bridges", "I have the pills", "bought rope"). */
const MEANS = [
  /\b(?:i\s+)?(?:know|knows|found\s+out|figured\s+out|worked\s+out)\s+where\s+(?:(?:the|his|her|their|my|our|dads|mums)\s+)?(?:gun|guns|rifle|shotgun|pistol|pills|tablets|meds|medication|rope|knife|knives|razor\s+blades|blades|gun\s+cabinet\s+key|key\s+to\s+the\s+gun\s+cabinet)\s+(?:is|are|was|were|gets|get)\b/iu,
  /\b(?:keep|kept|keeps|been|started|start|always|still|im|i)\s+(?:\w+\s+)?(?:looking|staring|gazing|looked|stared)\s+(?:at|up|over|down\s+at)\s+(?:the\s+|tall\s+|high\s+)?(?:bridges?|train\s+tracks|railway\s+(?:lines?|tracks?|bridges?)|tracks|cliffs?|cliff\s+edges?|the\s+edge|rooftops?|roofs?|tall\s+buildings|multi\s*storeys?|car\s+parks?|(?:the|his|her|dads|my\s+dads)\s+gun|ropes?|pills|tablets|the\s+river|motorway\s+bridges?)\b/iu,
  /(?:\bi\s+(?:have\s+|ve\s+|already\s+|just\s+|even\s+|still\s+)*|\bive\s+(?:already\s+|just\s+|even\s+|still\s+)*|(?:^|[,.;!?…]\s*|\b(?:and|but|so|now|already|even)\s+))(?:have|got|bought|buy|ordered|saved|saving|stockpiled|stockpiling|collected|collecting|hoarded|hoarding|kept|keeping|found|tied|made|been\s+(?:saving|collecting|stockpiling|hoarding|buying))\s+(?:up\s+)?(?:(?:the|some|a|an|enough|all|his|her|their|my|loads\s+of|a\s+lot\s+of|a\s+bunch\s+of|of\s+(?:his|her|their|my))\s+){0,3}(?:pills|tablets|paracetamol|painkillers|sleeping\s+pills|meds|medication|rope|ropes|noose|gun|guns|rifle|shotgun|razor\s+blades|blades|charcoal)\b(?!\s+(?:swing|ladder|lights?|bridge|course|toy|bracelet|necklace|list|box|boxes|bottles?|packets?|cabinet|holder|organi[sz]er|back|to\s+(?:return|the\s+(?:pharmacy|chemist|police))|licen[cs]e|safe|club|range|show|collection))\b/iu,
  /\b(?:looked\s+up|look\s+up|looking\s+up|googled|googling|researched|researching|searched|searching)\s+(?:how\s+(?:many|much)\s+(?:pills|tablets|paracetamol|painkillers)|how\s+(?:he|she|they)\s+did\s+it|how\s+to\s+(?:do\s+it|die|end\s+it|hang|overdose|od))\b/iu,
];
/** "I don't see the point (any more)", "what's the point any more", after a death. */
const NO_POINT = /\b(?:dont|do\s+not|cant|cannot|can\s+not|no\s+longer)\s+see\s+(?:the|any)\s+point(?=\s*(?:$|[.,!?;:…)—–]|(?:any\s*more|now|in\s+(?:anything|it\s+all|life|living|going\s+on|carrying\s+on|being\s+here|trying|getting\s+up|waking\s+up|any\s+of\s+(?:it|this))|of\s+(?:anything|it\s+all|life|living|going\s+on|carrying\s+on|being\s+here|trying|getting\s+up|waking\s+up|any\s+of\s+(?:it|this))|honestly|really|tbh|either|without)\b))|\b(?:whats|what\s+is|theres\s+no|there\s+is\s+no|no)\s+(?:the\s+)?point\s+(?:any\s*more|of\s+(?:anything|it\s+all|living|life|going\s+on)|in\s+(?:anything|living|life|going\s+on))\b/iu;
/** "I just want to go to sleep forever", "I want to never wake up", "I should have died instead". */
const SLEEP_FOREVER = /\b(?:want|wanna|wanted|wish\s+i\s+could|just\s+want|id\s+like|would\s+like|need)\s+to\s+(?:just\s+)?(?:go\s+to\s+sleep|sleep|fall\s+asleep|close\s+my\s+eyes|lie\s+down)\s+(?:forever|for\s+ever|and\s+(?:never|not)\s+wake\s+up)\b|\b(?:want|wanna|wish\s+i\s+could|just\s+want)\s+to\s+(?:never|not)\s+wake\s+up\b|\bwish\s+i\s+(?:wouldnt|would\s+not|didnt|did\s+not|couldnt|could\s+not)\s+wake\s+up\b/iu;
const DIED_INSTEAD = /\bi\s+should\s+(?:have|ve|of)\s+(?:died|gone|been\s+killed)\s+(?:instead|too|as\s+well|with\s+(?:him|her|them)|not\s+(?:him|her|them))\b|\bwish\s+i\s+(?:had\s+)?(?:died|gone)\s+instead\b/iu;
const TYPOS_ACT = [[/\b(think|thinking|thought|talk|talking)\s+(?:bout|abt|abut|aboot)\b/giu, '$1 about'], [/\bthinkin\b/giu, 'thinking'], [/\bdoin\b/giu, 'doing'], [/\bgoin\b/giu, 'going'], [/\bconsiderin\b/giu, 'considering']];

/** A death by suicide named in the words (with OD'd as typed). */
export function suicideDeath(text) {
  const cased = blankOrdinary(norm(text));
  return SUICIDE_DEATH.test(cased.toLowerCase()) || SUICIDE_OD.test(cased);
}
/** A first person future: "I'll", "I'm going to", "I might", "maybe I", "I want to", "thinking about", "considering". */
const FUTURE_1P = /\b(?:ill|i\s+will|i\s+shall|im\s+going\s+to|i\s+am\s+going\s+to|im\s+gonna|i\s+might|i\s+may|i\s+could|maybe\s+i|maybe\s+ill|i\s+want\s+to|i\s+wanna|i\s+need\s+to|im\s+thinking\s+(?:about|of)|i\s+think\s+(?:ill|i\s+will|i\s+might|im\s+going)|im\s+considering|i\s+plan|im\s+planning|im\s+about\s+to|i\s+would|id|thinking\s+(?:about|of)|considering|planning)\b/iu;
/**
 * (r2-angle item 1) A suicide death word next to any first-person future clause: Another Angle's gentle path never sends these
 * words to the server (another-angle.js griefMode routes them to care instead, nothing sent).
 */
export function suicideFuture(text) {
  if (!suicideDeath(text)) return false;
  let t = blankOrdinary(norm(text)).toLowerCase();
  for (const [re, to] of TYPOS_ACT) t = t.replace(re, to);
  return FUTURE_1P.test(t);
}
/**
 * (r2-angle item 1) The structural rule: a death named and, in the same message, a first-person clause about doing the same
 * act, the means, no point any more, sleeping forever, or dying instead (above).
 */
export function followsTheAct(text) {
  if (!deathTalk(text)) return false;
  const cased = blankOrdinary(norm(text));
  let t = cased.toLowerCase();
  for (const [re, to] of TYPOS_ACT) t = t.replace(re, to);
  const suicide = SUICIDE_DEATH.test(t) || SUICIDE_OD.test(cased);
  if (MEANS.some((re) => re.test(t)) || NO_POINT.test(t) || SLEEP_FOREVER.test(t) || DIED_INSTEAD.test(t)) return true;
  for (const a of ACTS) {
    if (a.suicideOnly && !suicide) continue;
    a.re.lastIndex = 0;
    for (const m of t.matchAll(a.re)) {
      // the clause the act sits in: from its last boundary, at most ten words back
      const clause = clauseBefore(t.slice(0, m.index));
      const whole = `${clause} ${m[0]}`;
      if (NEVER.test(clause)) continue;
      if (!suicide && (FEAR.test(clause) || PEACEFUL.test(t) || AND_PLAN.test(t.slice(m.index + m[0].length)))) continue;
      if (!suicide && a.wish && !WISH.test(clause)) continue;
      if (a.needIntent && !INTENT.test(clause) && !/^\s*(?:considering|considered|contemplating|thinking|thought)\b/iu.test(m[0])) continue;
      // first person, or nobody else as its subject
      if (!FIRST.test(whole) && THIRD.test(clause)) continue;
      return true;
    }
  }
  return false;
}

/**
 * Death talk that also says they want to follow the one who died: the CARE support path (nothing is sent). About
 * someone still alive, only the plainest wishes count ("I want to die with her"); being at their side never does.
 * (r2-angle item 1) Or doing what the one who died did (followsTheAct): a death that has happened, or a suicide.
 */
export function deathEscalation(text) {
  if (!deathTalk(text)) return false;
  const alive = stillAlive(text);
  if (followsTheAct(text) && (!alive || suicideDeath(text))) return true;
  if (!wantsToFollow(text)) return false;
  if (alive) return ALIVE_FOLLOW.test(blankOrdinary(norm(text)).toLowerCase());
  return true;
}

// --------------------------------------------------------------- the server --
const GRIEF_EMOTIONS = new Set(['grief', 'mourning', 'bereft', 'heartache', 'anticipatory-grief']);
/**
 * A server answer that reads as grief or a loss: for death talk, a scene about a loss or a grieving feeling (the
 * server sees the whole context); for other words, a loss scene beside a grieving feeling or a heavy harm word
 * the ordinary idioms don't explain (backstop.js). Its two lines play gently; its mechanic never does. A lost
 * job, a lost match or a phone that died is never one.
 */
export function serverLoss(scene, text = '', { heavy = null } = {}) {
  if (scene?.source !== 'server') return false;
  const loss = scene.situation_type === 'loss';
  const griefEmotion = GRIEF_EMOTIONS.has(String(scene.emotion || '').toLowerCase());
  // (r2-angle item 4) a story's death too ("he died in the game"): the server sees the whole context, so its loss reading plays gently
  if (deathTalk(text, { stories: false })) return loss || griefEmotion;
  return loss && (griefEmotion || !!heavy?.(text));
}
/** Both of a server answer's lines acknowledge (backstop.js acknowledges): nothing framed, asked or reframed. */
export const griefLinesOk = (scene) => acknowledges(scene?.subtitle_line_1) && acknowledges(scene?.subtitle_line_2);
/**
 * A server answer whose two lines the gentle path may say: it reads as grief or a loss (serverLoss), and both lines
 * acknowledge, never reframe (a mind_reading pair, "one time it went differently", any question). Otherwise the
 * authored gentle lines play.
 */
export function serverGrief(scene, text = '', opts = {}) {
  return serverLoss(scene, text, opts) && griefLinesOk(scene);
}
