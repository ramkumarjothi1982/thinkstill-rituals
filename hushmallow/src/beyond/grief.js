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
// Pure ES module, no DOM. Deterministic.

import { norm, blankOrdinary, PERSON, PET, BARE, ADJ, THING } from './death-words.js';
import { acknowledges } from './backstop.js';

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
const PASS_OBJ = 'the|a|an|my|his|her|their|our|your|its|me|us|him|them|it|this|that|these|those|all|every|both|some|any|round|around|over|through|along|across|into|onto|with|first|second|third|easily|comfortably|well|on\\s+(?:the|a|an|my|his|her|their|our|your)\\s+(?:message|messages|news|word|info|details|note|notes|tip|tips|advice|cold|bug|virus|flu|baton|torch|invite|offer|job|chance|deal|idea|feedback|request|link|number|email|letter|card|cv)';
/** What takes someone ("covid took my grandad", "the accident took my brother", "God took him home": review r10). */
const KILLERS = [
  'diseases?', 'illness', 'sickness', 'accident', 'crash', 'car\\s+crash', 'war', 'covid(?:\\s+19)?', 'corona(?:virus)?', 'virus', 'cancer', 'leuk(?:a)?emia',
  'lymphoma', 'tumou?r', 'stroke', 'heart\\s+attack', 'heart\\s+failure', 'sepsis', 'pneumonia', 'flu', 'dementia', 'alzheimers?', 'mnd',
  'motor\\s+neuron(?:e)?\\s+disease', 'cot\\s+death', 'sids', 'suicide', 'overdose', 'drugs', 'heroin', 'alcohol', 'addiction', 'sea', 'fire',
  'flood', 'bomb', 'aids', 'hiv', 'tb', 'malaria', 'ebola', 'meningitis', '(?:kidney|liver|organ)\\s+failure', 'complications', 'death', 'god',
  'the\\s+lord', 'jesus', 'heaven', 'the\\s+angels',
].join('|');
/** "would have been mums 60th", "his fortieth" (an ordinal; never "would have been my first time"). */
const ORDINALS = '(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)?(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth)|(?:twentieth|thirtieth|fortieth|fiftieth|sixtieth|seventieth|eightieth|ninetieth|hundredth)';
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
  /\b(?:killed|murdered|murder|suicide|drowned|overdosed|euthani[sz]ed|euthanasia)\b/iu,
  /\b(?:took|take|taken|taking|ended|end|ending)\s+(?:his|her|their|my|your)\s+(?:own\s+)?(?:life|lives)\b|\b(?:killed|hanged|hung|shot)\s+(?:himself|herself|themselves|themself)\b/iu,
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
  new RegExp(`${REF}\\s+${AUX}at\\s+peace\\b(?!\\s+with)|${REF}\\s+${AUX}(?:was\\s+|were\\s+)?(?:taken|stolen|ripped)\\s+(?:away\\s+)?from\\s+(?:us|me|this\\s+world)\\b|\\btaken\\s+from\\s+(?:us|this\\s+world)\\b|\\b(?:taken|gone)\\s+(?:far\\s+|way\\s+|much\\s+)?too\\s+(?:soon|young|early)\\b|\\bgone\\s+but\\s+not\\s+forgotten\\b|\\b(?:with\\s+the\\s+angels|with\\s+god\\s+now|gone\\s+to\\s+be\\s+with)\\b`, 'iu'),
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
  // my late husband
  new RegExp(`\\b(?:my|our|his|her|their|your)\\s+late\\s+${ADJ}(?:${WHO})\\b`, 'iu'),
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
  new RegExp(`\\b(?:${KILLERS})\\s+(?:has\\s+|have\\s+|had\\s+|finally\\s+|eventually\\s+|cruelly\\s+|then\\s+)*(?:took|takes|taken|claimed|stole)\\s+(?:(?:(?:my|our|his|her|their)\\s+)?${ADJ}(?:${WHO}|${BARE})s?\\b|(?:him|her|them)\\b)`, 'iu'),
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
  // "my friend ODd", "my friend od d", "she OD'd on heroin" (after the apostrophe is out: never "he's odd")
  new RegExp(`(?:\\b(?:he|she|they)\\b|\\b(?:(?:my|our|his|her|their|your|the|a)\\s+)?${ADJ}(?:${WHO})(?:s|es)?\\b|\\b(?:${BARE})s?\\b)\\s+(?:(?:just|has|had|have|nearly|almost|accidentally|then)\\s+)?(?:od|odd|oded|odded|od\\s+d|odd\\s+d|o\\s+d\\s+d)\\b(?!\\s+(?:one|ones|man|woman|guy|job|jobs|things?|bits?|socks?|sock|way|looks?|feeling|behaviou?r|habits?|number|numbers|moments?|time|times|days?|person|people|kid|ideas?|sense|bit|occasion|couple)\\b)`, 'iu'),
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
];
/** Grieving, a funeral, a grave, condolences ('grief' when no death is named). */
const GRIEF_WORDS = [
  /\b(?:grief|griefs|griefstricken|grief\s+stricken|greif|greiving|grieving|grieve|grieves|grieved|mourn|mourning|mourned|mourns|mourner|mourners|bereaved|bereavement|berevement|bereavment|condolences?|condolances?|sympathy\s+card)\b/iu,
  /\b(?:funerals?|funral|funerel|funreal|grave|graves|graveside|gravestone|graveyard|headstone|cemetery|cemetary|cemetry|crematorium|cremated|cremation|burial|buried|bury|burying|coffin|casket|hearse|obituary|eulogy|memorial\s+service|urn)\b/iu,
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
const NAMES_SOMEONE = new RegExp(`${REF}|\\b(?:${PET})s?\\b`, 'iu');
function notSurvived(t) {
  return (t.match(/[^.!?…]+/gu) || []).some((sent) => NOT_SURVIVE.test(sent) && NAMES_SOMEONE.test(sent.replace(/^\s*(?:i|we)\b/iu, ' ')));
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
export function deathTalk(text) {
  const raw = norm(text);
  if (!/\p{L}/u.test(raw)) return null;
  const t = blankOrdinary(raw);
  if (LOSS_WORDS.some((re) => re.test(t)) || NAMED.some((re) => hit(re, t)) || RIP.slice(0, 2).some((re) => re.test(t)) || notSurvived(t)) return 'loss';
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
  new RegExp(`\\b${WANT}\\s+(?:to\\s+)?(?:go\\s+(?:and\\s+)?|just\\s+)?(?:be|go|get|belong|lie|rest)\\s+(?:back\\s+)?(?:(?:up\\s+)?there\\s+|up\\s+in\\s+heaven\\s+|in\\s+heaven\\s+)?with\\s+(?:(?:him|her|them)${PRON_TAIL}|(?:${OBJ_PERSON}))`, 'giu'),
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
  // (review r8) wish I was with him; be next to, beside, lie beside her; all I want is to be with him; rather be
  // with her than here; part of me wants to go; go to sleep and be with her; see him again soon; can't be here
  new RegExp(`\\bwish(?:ed|ing|es)?\\s+(?:that\\s+)?(?:i|id)\\s+(?:was|were|could\\s+be)\\s+(?:back\\s+|still\\s+|there\\s+)?with\\s+(?:(?:him|her|them)${PRON_TAIL}|(?:${OBJ_PERSON}))(?!\\s+(?:when|at\\s+the\\s+(?:end|time|hospital|hospice)|in\\s+(?:his|her|their)\\s+last|before|that\\s+(?:night|day|morning)|for\\s+(?:his|her|their)\\s+last)\\b)`, 'giu'),
  new RegExp(`\\b${WANT}\\s+(?:to\\s+)?(?:just\\s+)?(?:be|lie|lay|sleep|rest|go)\\s+(?:right\\s+)?(?:next\\s+to|beside|alongside|by\\s+(?:his|her|their)\\s+side|near)\\s+(?:(?:him|her|them)${PRON_TAIL}|(?:${OBJ_PERSON}))`, 'giu'),
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
/**
 * Death talk that also says they want to follow the one who died: the CARE support path (nothing is sent). About
 * someone still alive, only the plainest wishes count ("I want to die with her"); being at their side never does.
 */
export function deathEscalation(text) {
  if (!deathTalk(text) || !wantsToFollow(text)) return false;
  if (stillAlive(text)) return ALIVE_FOLLOW.test(blankOrdinary(norm(text)).toLowerCase());
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
  if (deathTalk(text)) return loss || griefEmotion;
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
