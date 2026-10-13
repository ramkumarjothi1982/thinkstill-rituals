// Another Angle: is this a bereavement? (someone, or a pet, has died)
//
//   bereavement(text) → 'loss' (a death the person names) | 'grief' (grieving, a funeral, a grave) | null
//
// Grief is not a thought to fix: a bereavement never plays a mechanic or a fact/assumption split. It is
// also never inferred. Only the words a person uses for a death count, and only about a person or a pet:
//   died, passed away, passed on (never "passed on the message"), is dead, was killed, each also with the
//   contraction stuck to the person ("my dad's dead", "Mum's died", "Dad's been dead a year", "our cat's been
//   put down", "my husband's passed"), "lost my mum" (never "lost my mum's ring", "lost my dad in the
//   supermarket", "lost my sister when she moved to Spain", or a pet that ran off or slipped its lead),
//   "the death of my father", "losing my dad was…", "watching my grandma die", "since my dad dying", "my late
//   husband", "since he died", "she's gone now" (a person, never "gone to work"), RIP, the anniversary of a
//   death, a pet put down; and, for 'grief', a funeral, a grave, grieving, mourning, bereaved.
// Never 'passed' alone in the past ("My son passed and I'm so proud", "my daughter passed! she got into uni";
// "my dad passed last year" is answered gently instead, passedAlone), never "my phone died", "it's your
// funeral", "turning in his grave", "my boss put me down", never someone dying now ("my dad is dying",
// "dying to see you"), never "lost my mum to dementia" without a death named (she is still alive), and never
// a death imagined ("what if my mum died", "I dreamt my dad died") or one that nearly happened ("my dad
// nearly died").
//
// Pure ES module, no DOM. Deterministic.

/** Family: "lost my <one of these>" is a death in its own right ("I lost my mum last year"). */
const FAMILY = 'mum|mom|mam|mummy|mommy|mama|mother|dad|daddy|papa|father|parents?|step-?(?:dad|mum|mom|father|mother|son|daughter|brother|sister)|'
  + 'grandma|grandmother|grandad|granddad|grandpa|grandfather|grandparents?|great-?(?:grandma|grandmother|grandad|granddad|grandpa|grandfather|aunt|uncle)|'
  + 'nan|nana|nanna|nanny|gran|granny|sister|brother|sibling|twin|son|daughter|child|baby|kid|husband|wife|uncle|aunt|auntie|aunty|cousin|niece|nephew|'
  + 'little (?:boy|girl|one)|baby (?:boy|girl)|'
  + 'godmother|godfather|godson|goddaughter|grandson|granddaughter|grandchild|(?:mother|father|sister|brother|son|daughter)-in-law|in-laws?';
/**
 * Close people whose "loss" can also mean a friendship or a relationship ended: a death needs its own word
 * ("my boy died", "my ex died"; never "lost my girl", "lost my ex").
 */
const CLOSE = 'partner|boyfriend|girlfriend|fianc[eé]e?|friend|best friend|bestie|mate|flatmate|housemate|colleague|teacher|neighbou?r|classmate|coach|mentor|carer|'
  + 'boy|girl|ex-?(?:husband|wife|partner|boyfriend|girlfriend)|ex';
const PET = 'dog|doggy|doggo|cat|kitty|puppy|pup|kitten|pet|horse|pony|rabbit|bunny|hamster|guinea pig|gerbil|budgie|parrot|bird|tortoise|turtle|ferret|goldfish|fish|rat|snake|lizard|hen|chicken';
const WHO = `(?:${FAMILY}|${CLOSE}|${PET})`;
/** What can stand before the person ("my little brother", "my best friend"). */
const ADJ = '(?:(?:best|dear|dearest|beloved|little|big|old|older|younger|elder|eldest|youngest|baby|twin|lovely|sweet|only|first|other|step|half|darling|wonderful|amazing|gorgeous|precious|poor)\\s+)*';
/** The parents and grandparents people call by name ("Mum died", "since Grandad passed away"). */
const BARE = '(?:mum|mom|mam|mummy|mommy|mama|dad|daddy|papa|grandad|granddad|grandpa|grandma|granny|gran|nan|nana|nanna|nanny)';
/**
 * A name after the person ("my best friend Sam"): only a capitalised word counts (checked in code, the
 * regexes are case-insensitive), and it is tried last, so "my baby monitor died" is never "my baby (Monitor)".
 */
const NAME = '(?:,?\\s+(?<nm>[A-Za-z][A-Za-z’\'-]*),?)??';
/** "my dad", "our cat", "my friend's mum", "my best friend Sam", "my brother and sister". */
const SUBJ = `\\b(?:my|our|his|her|their)\\s+${ADJ}${WHO}s?(?:['’]s\\s+${ADJ}${WHO}s?)?(?:\\s+and\\s+(?:my\\s+|our\\s+)?${ADJ}${WHO}s?)?${NAME}`;
const BARE_SUBJ = `(?<!\\b(?:the|a|an|this|that|your|no|any|some|every)\\s)\\b${BARE}(?:\\s+and\\s+(?:${BARE}|my\\s+${WHO}))?`;
/** Between the person and what follows: a space, or the contraction stuck to them ("my dad's dead", "Mum's died"). */
const J = '(?:\\s+|(?=[\'’]s\\b))';
/** Little words between the person and the verb ("has", "just", "suddenly", "both"). */
const AUX = '(?:(?:has|had|have|just|suddenly|finally|recently|sadly|tragically|unexpectedly|both|all|also|then|eventually|peacefully|quietly|actually|already|not\\s+long)\\s+)*';
/** "passed on" as a death, never "passed on the message / my CV / her love of baking". */
const PASSED_ON = 'passed\\s+on\\b(?!\\s+(?:the(?!\\s+\\d)|a|an|his|her|my|their|our|your|its|this|that|these|those|it|them|him|me|us|you|some|any|what|news|word|messages?|info\\w*|details?|notes?|to|from|through|by|down|everything|something|anything|nothing|bad|good)\\b)';
/** What can follow "dead" when it means a death ("dead.", "dead and…", "dead a year now", "dead two years"). */
const DEAD_END = '(?=\\s*(?:$|[.,!?;:…)—–-]|(?:and|now|since|for|but|so|because|after|though|already|too|nearly|almost|over|a\\s+(?:year|month|week|while|long\\s+time|few|couple|decade)|(?:two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|several|many|\\d+)\\s+(?:years?|months?|weeks?|days?|decades?)|years|months|weeks|ages)\\b))';
const KILLED = 'killed\\b(?!\\s+(?:off|it|in\\s+(?:a|the|my|his|her)\\s+(?:game|match|level|round|film|movie|show|episode|book)))';
/** What a person or a pet's death is called after them (and "'s died", "'s been killed": the contraction is "has"). */
const DEATH = `(?:${AUX}(?:died\\b|passed\\s+away\\b|${PASSED_ON}|(?:is|was|are|were|['’]s|has\\s+been|have\\s+been|had\\s+been|['’]s\\s+been)\\s+(?:(?:now|sadly|long|really)\\s+)?(?:dead${DEAD_END}|no\\s+longer\\s+with\\s+us\\b)|(?:was|were|got|had\\s+been|has\\s+been)\\s+${KILLED})`
  + `|['’]s\\s+${AUX}(?:died\\b|passed\\s+away\\b|${PASSED_ON}|been\\s+${KILLED}))`;
const GONE_NOW = `(?:is|['’]s|has|was)\\s+(?:(?:really|truly|finally|just)\\s+)?gone\\s+(?:now|forever|for\\s+good)\\b`;
/**
 * A death's cause after "lost my friend to…" (a close person: the death itself has to be named). Dementia
 * and Alzheimer's are not here: "I lost my mum to dementia" is often said while she is alive (FADING).
 */
const CAUSE = 'cancer|covid|coronavirus|suicide|illness|sepsis|leuka?emia|pneumonia|heart failure|organ failure|a (?:long )?illness|an? (?:accident|overdose|heart attack|stroke|crash|tumou?r|infection|disease|aneurysm|brain tumou?r)';
const FADING = 'dementia|alzheimer[\'’]?s';
/** A death named in so many words ("lost my mum to dementia… she died in May"), never a phone's or a plant's. */
const DEATH_WORD = /(?<!\b(?:phone|battery|laptop|computer|car|plants?|tv|telly|ipad|tablet|console|printer|fridge|router|wifi|charger|game|app|engine)(?:['’]s)?\s(?:(?:has|had|just|finally)\s)?)\b(?:died|dead|passed\s+(?:away|on)|death|funeral|buried|killed)\b/iu;
const PET_NAMED = `(?:${PET})s?${NAME}`;
/** Fiction and games, where "he died" is a story. */
const FICTION = /\b(?:game|games|gaming|film|movie|show|episode|series|book|novel|character|level|fortnite|minecraft|zombies?|anime|manga|tv|telly|netflix)\b/iu;

const LOSS = [
  // "my grandad died", "our cat was killed", "my friend's mum passed away", "my dad's dead", "my dog's died",
  // "my uncle, who died"
  new RegExp(`${SUBJ}(?:,?\\s+(?:who|that))?${J}${DEATH}`, 'giu'),
  // "My grandmother, who I was close to, died last week", "my nan who I loved so much passed away"
  new RegExp(`${SUBJ},\\s[^,.!?]{1,60},\\s+${AUX}(?:died|passed\\s+away)\\b`, 'giu'),
  new RegExp(`${SUBJ}\\s+(?:who|whom)\\s+[^,.!?]{1,50}?\\s+${AUX}(?:died|passed\\s+away)\\b`, 'giu'),
  // "Mum died in May", "since Grandad passed away", "Mum and Dad both died", "Mum's died", "Dad's been dead a year"
  new RegExp(`${BARE_SUBJ}${J}${DEATH}`, 'giu'),
  // "since he died", "when she passed away", "ever since my dog died"
  new RegExp(`\\b(?:since|after|when|before|until|till|the\\s+day|the\\s+night|the\\s+year|now\\s+that)\\s+(?:he|she)\\s+${AUX}(?:died|passed\\s+away|${PASSED_ON})`, 'giu'),
  // "my late husband"
  new RegExp(`\\bmy\\s+late\\s+${ADJ}(?:${FAMILY}|${CLOSE}|${PET})\\b`, 'giu'),
  // "my dad's death", "Mum's passing", "the anniversary of his death", "her death anniversary"
  new RegExp(`(?:${SUBJ}|\\b${BARE})['’]s\\s+(?:death|passing)\\b`, 'giu'),
  new RegExp(`\\banniversary\\s+of\\s+(?:(?:my|our|his|her|their)\\s+)?(?:${ADJ}(?:${WHO}|${BARE})['’]s\\s+)?(?:death|passing|funeral)\\b|\\b(?:death|passing)\\s+anniversary\\b|\\banniversary\\s+of\\s+(?:losing|the\\s+day\\s+(?:i|we)\\s+lost)\\s+(?:my|our|him|her|them)\\b`, 'giu'),
  // "since losing my mum", "after losing our dog"
  new RegExp(`\\b(?:since|after|anniversary\\s+of|grief\\s+(?:of|from|over|after)|grieving)\\s+losing\\s+(?:my|our)\\s+${ADJ}(?:${FAMILY}|${PET})s?\\b(?!['’])`, 'giu'),
  // "my dog was put to sleep", "our cat's been put down", "we had to have our cat put down", "we had to put our
  // dog down", "the vet put him down"
  new RegExp(`\\b(?:my|our|his|her|their|the)\\s+${ADJ}${PET_NAMED}(?:\\s+(?:was|were|got|had\\s+to\\s+be|has\\s+been|had\\s+been|have\\s+been)|['’]s\\s+(?:just\\s+)?been)\\s+put\\s+(?:down|to\\s+sleep)\\b`, 'giu'),
  new RegExp(`\\b(?:had|have|having|got|getting)\\s+(?:to\\s+have\\s+)?(?:my|our|his|her|their|the)\\s+${ADJ}${PET_NAMED}\\s+put\\s+(?:down|to\\s+sleep)\\b`, 'giu'),
  new RegExp(`\\b(?:had\\s+to|have\\s+to|decided\\s+to|chose\\s+to|agreed\\s+to|vets?|we|they)\\s+(?:had\\s+to\\s+)?(?:put|putting)\\s+(?:my|our|his|her|their|the)\\s+${ADJ}${PET_NAMED}\\s+(?:down|to\\s+sleep)\\b(?!\\s+(?:on|onto|in|into|for|gently|so|while|next|beside|by|at)\\b)`, 'giu'),
  new RegExp('\\bvets?\\s+(?:had\\s+to\\s+|has\\s+|have\\s+)?put\\s+(?:him|her|them|it)\\s+(?:down|to\\s+sleep)\\b', 'giu'),
  // "we buried our dog", "my brother took his own life", "she killed herself"
  new RegExp(`\\bburied\\s+(?:my|our|his|her|their)\\s+${ADJ}${WHO}s?\\b(?!['’])`, 'giu'),
  new RegExp(`(?:${SUBJ}|\\b${BARE}|\\b(?:he|she))\\s+(?:${AUX})(?:took\\s+(?:his|her|their)\\s+own\\s+life|killed\\s+(?:himself|herself|themselves|themself))\\b`, 'giu'),
  // a baby lost before or at birth
  /\b(?:stillborn|still\s+birth|stillbirth|miscarri(?:ed|age|ages)|lost\s+(?:the|our|my)\s+(?:baby|pregnancy))\b/giu,
  // "after the death of my father", "since the death of Mum"
  new RegExp(`\\bdeath\\s+of\\s+(?:(?:my|our)\\s+${ADJ}${WHO}s?|${BARE})\\b(?!\\s+(?:[\\w’'-]+\\s+){0,3}?(?:would|will|could|might)\\b)`, 'giu'),
  // "since my dad dying", "after our dog dying", "I'm not over my mum dying", "my dad dying was the worst thing"
  // (never "my dad is dying", "my mum's dying", "dying to see you", or a death feared: "scared of my dad dying")
  new RegExp(`\\b(?:since|after|over|from)\\s+(?:my|our)\\s+${ADJ}${WHO}s?\\s+dying\\b(?!\\s+(?:to|for)\\b)`, 'giu'),
  new RegExp(`(?:^|[.!?…]\\s*|\\b(?:and|but|so|because|cos)\\s+)(?:my|our)\\s+${ADJ}${WHO}s?\\s+dying(?:\\s+(?:of\\s+\\w+|so\\s+young|suddenly|like\\s+that|in\\s+(?:hospital|my\\s+arms|(?:19|20)\\d\\d)|last\\s+(?:year|month|week|night)))?\\s+(?:was|has\\s+been|had|changed|broke|hit|left|made|ruined|destroyed|still\\s+(?:hurts|haunts))\\b`, 'giu'),
  // "I wish my dad hadn't died", "if only she hadn't passed away" (a death regretted is a death)
  new RegExp(`\\b(?:wish(?:ed)?|if\\s+only)\\s+(?:that\\s+)?(?:${SUBJ}|he|she|${BARE})\\s+(?:hadn['’]?t|had\\s+not|had\\s+never|never)\\s+(?:\\w+\\s+)?(?:died|passed\\s+away|been\\s+killed)\\b`, 'giu'),
];
/** Someone dying now, not a death ("I'm watching my mum die", "I keep losing my dad to it"). */
const NOW = '(?<!(?:\\b(?:am|is|are|be|been|being|keep|keeps|kept)|[\'’](?:m|re|s))\\s+(?:(?:slowly|really|just|gradually|already|still|basically)\\s+)?)';
/** …or one still ahead ("losing my mum would break me", "watching him die would kill me"). */
const AHEAD = '(?!\\s+(?:[\\w’\'-]+\\s+){0,3}?(?:would|will|could|might|scares|terrifies|frightens|worries)\\b)';
/** "watching my grandma die was the worst thing", "I watched him die", "I saw my dog die" (never in a story or a game). */
const WATCHED_DIE = new RegExp(`\\b(?:watched|saw|seen|had\\s+to\\s+watch|${NOW}(?:watching|seeing))\\s+(?:(?:my|our)\\s+${ADJ}${WHO}s?|him|her|them)\\s+(?:(?:slowly|suddenly|finally|peacefully)\\s+)?(?:die|pass\\s+away|take\\s+(?:his|her|their)\\s+last\\s+breath)\\b(?!\\s+(?:inside|laughing|a\\s+little|of\\s+(?:embarrassment|laughter|shame|boredom|cringe)))${AHEAD}`, 'giu');
/**
 * "Losing my dad was the hardest thing" (a family member or a pet; never "losing my temper", "losing my mum's
 * ring", someone dying now: "I'm losing my mum", one feared ahead: "losing my mum would break me", or a close
 * person's "losing" alone, which can be a friendship).
 */
const LOSING = new RegExp(`${NOW}\\blosing\\s+(?:my|our)\\s+${ADJ}(?:${FAMILY}|${PET})s?\\b(?!['’])(?!\\s+to\\s+(?:${FADING}|drink|drugs|addiction|the\\s+bottle)\\b)${AHEAD}`, 'giu');
/**
 * "My husband's passed", "Grandad has passed" (the perfect, with nothing passed and no exam, result or pride in
 * the words: "My son's passed his test", "my daughter has passed!" never are).
 */
const PASSED_GUARD = '(?!\\s+(?:away|on|out|over|by|through|up|down|round|around|along|it|the|a|an|his|her|their|my|your|our|its|me|him|them|us|everything|all|every|both|with|without|first|second|third|ok|okay|fine|easily|comfortably|well)\\b)';
const HAS_PASSED = new RegExp(`(?:${SUBJ}|${BARE_SUBJ})(?:['’]s|\\s+(?:has|have))\\s+(?:now\\s+)?${AUX}passed\\b${PASSED_GUARD}`, 'giu');
/** "she died last week", "he died in his sleep", "she's died", "she died and I wasn't there" (never in a story or a game). */
const PRONOUN_DIED = new RegExp(`\\b(?:he|she)(?:\\s+|['’]s\\s+)${AUX}(?:died|passed\\s+away)\\b(?=\\s*(?:$|[.,!?;:…]|(?:last|this|on|in|at|a|an|two|three|four|five|six|seven|eight|nine|ten|several|few|over|yesterday|today|recently|suddenly|before|peacefully|alone|and|when|while|after|of|from|years?|months?|weeks?|days?|so|without|holding|surrounded)\\b))`, 'giu');
/** "I can't believe she's dead" (never in a story, a game, or about a gadget). */
const PRONOUN_DEAD = new RegExp(`\\b(?:he|she)(?:['’]s|\\s+is|\\s+was)\\s+(?:(?:now|really|actually|sadly)\\s+)?(?:dead${DEAD_END}|no\\s+longer\\s+with\\s+us\\b)`, 'giu');
const GADGET = /\b(?:phone|battery|laptop|computer|tablet|ipad|console|charger|car|engine|plants?|flowers?|tree|torch|remote|controller)\b/iu;
/** "she was put to sleep" about a pet named in the words. */
const PRONOUN_PUT = /\b(?:he|she|they|it)\s+(?:was|were|got|had\s+to\s+be|has\s+been|had\s+been)\s+put\s+(?:down|to\s+sleep)\b/giu;
const PET_WORD = new RegExp(`\\b(?:${PET})s?\\b`, 'iu');
/** "passed away" about someone, wherever it stands ("my nan, who I was so close to, passed away"), never a gadget's. */
const PASSED_AWAY = /(?<!\b(?:phone|battery|laptop|computer|car|plants?|tv|telly|ipad|tablet|console|printer|fridge|router|wifi|charger|game|app)\s(?:(?:has|had|just|finally)\s)?)\bpassed\s+away\b/giu;
/**
 * "when / while" after "lost my sister" is a death only when what follows can be one ("when I was 12", "when
 * she was 50", "when he had a stroke"), never "when she moved to Spain" or "when he remarried".
 */
const WHEN_OK = 'was|were|had|got\\s+(?:ill|sick|cancer|covid|hit|knocked)|died|passed|fell|caught|collapsed|suffered|developed|went\\s+into\\s+(?:hospital|labour|labor|surgery|intensive\\s+care)|took\\s+(?:his|her|their)\\s+own|lost\\s+(?:his|her|their)\\s+(?:battle|fight)|only|just|gave\\s+birth|ran\\s+(?:into\\s+(?:the\\s+)?(?:road|street|traffic)|out\\s+(?:into|in\\s+front))';
const WHEN = `(?:when|while)\\b(?!\\s+(?:he|she|they)\\s+(?!(?:${WHEN_OK})\\b))`;
/**
 * "lost my mum" (a family member or a pet), followed only by what can follow a death: never "lost my mum's ring",
 * and never "lost my sister when she moved away" (what the rest says is read too: NOT_DEATH_CONTEXT).
 */
const LOST = new RegExp(`\\blost\\s+(?:my|our)\\s+${ADJ}(?:${FAMILY}|${PET})s?\\b(?!['’])(?=\\s*(?:$|[.,!?;:…)—–-]|(?:to\\s+(?:${CAUSE})|in\\s+(?:(?:19|20)\\d\\d|january|february|march|april|may|june|july|august|september|october|november|december|the\\s+(?:spring|summer|autumn|winter|night|end)|(?:the|a|an)\\s+(?:(?:car|road|train|plane|bike|motorbike|motorcycle|house|terrible|awful|tragic|freak)\\s+)?(?:war|accident|crash|fire|attack|pandemic|tsunami|earthquake|flood|collision|shooting|explosion))|${WHEN}|last|this|one|two|three|four|five|six|seven|eight|nine|ten|several|a\\s+(?:few|couple|year|month|week)|years?|months?|weeks?|days?|recently|suddenly|unexpectedly|yesterday|today|and|but|so|during|before|at\\s+(?:\\d+|the\\s+age|age|birth)|as\\s+a|too|young|early|forever|for\\s+(?:ever|good))\\b))`, 'giu');
const LOST_CLOSE = new RegExp(`${NOW}\\b(?:lost|losing)\\s+(?:my|our)\\s+${ADJ}(?:${CLOSE})${NAME}\\s+(?:to\\s+(?:${CAUSE})|in\\s+(?:a|the)\\s+(?:(?:car|road|train|plane|bike|motorbike|motorcycle)\\s+)?(?:crash|accident|fire|attack|shooting|explosion))\\b`, 'giu');
/** "lost my mum to dementia": a loss only when a death is also named (she may well be alive: "she doesn't know me"). */
const LOST_FADING = new RegExp(`\\b(?:lost|losing)\\s+(?:my|our)\\s+${ADJ}(?:${FAMILY}|${CLOSE}|${PET})s?${NAME}\\s+to\\s+(?:${FADING})\\b`, 'giu');
/**
 * Missing, estranged, left or still alive, not dead: "lost my dog" and then "he ran off", "he slipped his lead",
 * "I've put posters up"; "lost my sister when she moved to Spain"; "lost my dad, he remarried and stopped
 * calling"; "lost my mum to dementia, she doesn't know who I am". (Subject-anchored where an ordinary griever
 * could say the same words about someone else: "my friends stopped calling", "I just want her to come back".)
 */
const NOT_DEATH_CONTEXT = new RegExp([
  '\\b(?:ran\\s+(?:off|away)|run\\s+(?:off|away)|running\\s+away|went\\s+missing|gone\\s+missing|is\\s+missing|was\\s+missing|still\\s+missing|can[\'’]?t\\s+find|cannot\\s+find|couldn[\'’]?t\\s+find|looking\\s+for|search\\w*\\s+for|found\\s+(?:him|her|them)|argument|fight|row|fell\\s+out|falling\\s+out|stopped\\s+talking|not\\s+talking|cut\\s+me\\s+off|blocked\\s+me|estranged|disowned|no\\s+contact|divorc\\w*|broke\\s+up|split\\s+up|dumped|cheated|left\\s+(?:me|us|home)|walked\\s+out|moved\\s+(?:out|away|abroad)|(?:won[\'’]?t|doesn[\'’]?t|didn[\'’]?t|isn[\'’]?t|hasn[\'’]?t|haven[\'’]?t|wouldn[\'’]?t)\\s+(?:speak\\w*|talk\\w*|spoken|reply\\w*|answer\\w*)|ignor\\w*\\s+me|hates?\\s+me|kicked\\s+(?:me|us)\\s+out|in\\s+the\\s+(?:crowd|shop|supermarket|store|mall|park|station|airport|queue|playground|market))\\b',
  // a pet that is missing, not dead
  '\\b(?:posters?|flyers?|leaflets?|microchip\\w*|slipped\\s+(?:his|her|its|their|the)\\s+(?:lead|collar|harness|leash)|got\\s+out\\s+of\\s+the\\s+(?:garden|house|yard|car|flat)|jumped\\s+(?:over\\s+)?the\\s+fence)\\b',
  '\\b(?:he|she|they|it)\\s+(?:(?:just|must\\s+have|has|had|somehow)\\s+)?escaped\\b',
  '\\b(?:he|she|they|it)\\s+(?:came|has\\s+come|have\\s+come|[\'’]s\\s+come)\\s+(?:back|home)\\b',
  // someone who left, moved or started again elsewhere
  '\\b(?:he|she|they)\\s+(?:(?:just|then|finally|eventually|suddenly|has|had|have|went\\s+and)\\s+)?(?:moved\\s+(?:to|in\\s+with|out|away|abroad|back|countries|country|house)|emigrated|relocated|remarried|got\\s+(?:remarried|a\\s+new\\s+(?:wife|husband|partner|family|girlfriend|boyfriend))|stopped\\s+(?:calling|visiting|replying|texting|ringing|speaking|seeing|coming|talking))\\b',
  '\\b(?:his|her|their)\\s+new\\s+(?:wife|husband|family|partner|girlfriend|boyfriend)\\b',
  // still alive
  '\\b(?:he|she|they)(?:[\'’]s|[\'’]re|\\s+is|\\s+are)\\s+(?:still\\s+)?(?:alive|around|out\\s+there|living)\\b',
  '\\b(?:he|she|they)\\s+(?:still\\s+)?lives?\\s+(?:in|with|abroad|nearby|near|down|up|round|across|far|on|over|alone)\\b',
  '\\b(?:doesn[\'’]?t|does\\s+not|didn[\'’]?t|can[\'’]?t|cannot|couldn[\'’]?t|no\\s+longer|won[\'’]?t)\\s+(?:even\\s+)?(?:know|recogni[sz]e|remember)\\s+(?:me|who|us|my\\s+name)\\b',
].join('|'), 'iu');
/** "she's gone now" / "my nan is gone now" about a person, unless they went somewhere. */
const GONE = [
  new RegExp(`${SUBJ}${J}${GONE_NOW}`, 'giu'),
  new RegExp(`${BARE_SUBJ}\\s*${GONE_NOW}`, 'giu'),
  new RegExp(`\\b(?:he|she)(?:['’]s|\\s+is|\\s+has)\\s+(?:(?:really|truly|finally|just)\\s+)?gone\\s+(?:now|forever|for\\s+good)\\b`, 'giu'),
];
const WENT_SOMEWHERE = /\b(?:left|leaving|leave|moved|walked\s+out|split|broke\s+up)\b|\bgone\s+(?:to|out|home|away|off|back|abroad|travelling|traveling|on)\b|\bwent\s+(?:to|out|home|away|off|back)\b|\b(?:on\s+holiday|on\s+a\s+trip|at\s+work|to\s+work|to\s+school|to\s+uni|abroad)\b/iu;
const SOMEONE = new RegExp(`\\b(?:${WHO}|${BARE})\\b`, 'iu');
/** RIP about someone: "RIP Grandad", "RIP to my dog", "Nana, rest in peace" (never "RIP my phone", "rip it up"). */
const RIP = [
  new RegExp(`\\bR\\.?I\\.?P\\.?(?=\\s+(?:(?:to|my|our|dear|sweet|little|lovely|beautiful|darling|baby|big)\\s+)*(?:${WHO}|${BARE})\\b)`, 'giu'),
  new RegExp(`\\brest\\s+in\\s+peace\\b(?=[^.!?]*\\b(?:${WHO}|${BARE})\\b)|\\b(?:${WHO}|${BARE})\\b[^.!?]{0,30}\\brest\\s+in\\s+peace\\b|\\b(?:${WHO}|${BARE})[,\\s]+R\\.?I\\.?P\\b`, 'giu'),
  // "RIP Sarah" (a capitalised name, never "RIP Monday" or "RIP Twitter")
  /\bR\.?I\.?P\.?,?\s+(?<nm>[A-Z][a-z]+)\b/gu,
];
const NOT_NAMES = /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|Christmas|Easter|Summer|Winter|Spring|Autumn|Twitter|Facebook|Instagram|TikTok|Netflix|Me|My|Our|The|This|That|It|To|Bank|Phone|Just|Really|Honestly|Who|Which|What|When|And|But|So|Is|Was|Has|Had)$/u;
/** Words for grieving itself, without a death named. */
const GRIEVING = /\b(?:funerals?|bereave\w*|grieving|griev(?:e|es|ed)\s+(?:for|over)|grief|in\s+mourning|mourning|cemetery|crematorium|eulogy|memorial\s+service|condolences|graveside|gravestone|headstone)\b/giu;
const GRAVE = new RegExp(`\\b(?:visit\\w*|went\\s+to|go\\s+to|going\\s+to|been\\s+to|at|by|beside|tend\\w*|clean\\w*|laid|lay|put|left|leave|flowers\\s+(?:on|for|at))\\s+(?:(?:the|his|her|their|my|our)\\s+)?(?:${ADJ}(?:${WHO}|${BARE})['’]s\\s+)?graves?\\b|\\bscatter\\w*\\s+(?:(?:the|his|her|their|my|our)\\s+)?(?:${ADJ}(?:${WHO}|${BARE})['’]s\\s+)?ashes\\b`, 'giu');
/** Idioms and near misses, set aside before anything is read. */
const NOT_A_LOSS = new RegExp([
  '\\b(?:give|gives|giving|gave|get|gets|getting|got|take|takes|taking|took|cause|causes|causing|caused)\\s+(?:me\\s+|us\\s+|him\\s+|her\\s+|them\\s+|you\\s+|myself\\s+)?(?:(?:so\\s+much|a\\s+lot\\s+of|some|such|no\\s+end\\s+of|loads\\s+of|any|the|a\\s+load\\s+of|real|serious)\\s+)?grief\\b(?:\\s+(?:from|about|over|for)\\b)?',
  '\\bgood\\s+grief\\b', '\\bc(?:o|a)me\\s+to\\s+grief\\b', '\\bgrief\\s+from\\b',
  // nearly happened, or didn't (but "not long died" is British for "died recently")
  '\\b(?:nearly|almost|could\\s+have|could[\'’]ve|would\\s+have|would[\'’]ve|might\\s+have|might[\'’]ve|should\\s+have|should[\'’]ve|didn[\'’]?t|did\\s+not|never|haven[\'’]?t|have\\s+not|has\\s+not|hasn[\'’]?t|not|isn[\'’]?t|wasn[\'’]?t)(?!\\s+long\\b)\\s+(?:\\w+\\s+)?(?:died|passed\\s+away|passed\\s+on|(?:been\\s+|got\\s+|get\\s+)?killed|been\\s+put\\s+down|dead)\\b',
  // "she died her hair" (dyed), "died in my dream"
  '\\bdied\\s+(?:my|her|his|their|our|your)\\s+hair\\b',
  '\\bdied\\s+(?:laughing|of\\s+(?:embarrassment|shame|laughter|boredom|cringe|fright)|inside|a\\s+little)\\b',
  '\\bdead\\s+(?:to\\s+me|set|tired|serious|against|on|keen|right|wrong|good|nice|funny|proud|excited|strict|easy|hard|bored|chuffed|lucky)\\b',
  '\\b(?:turning|spinning|rolling|turn|spin|roll|turns|spins|rolls|turned|spun|rolled)\\s+(?:over\\s+)?in\\s+(?:his|her|their|my|your)\\s+graves?\\b',
  '\\b(?:take|taking|took|takes)\\s+(?:it|this|that|them|the\\s+secret|my\\s+secret|the\\s+truth)\\s+to\\s+(?:the|my|his|her|their)\\s+grave\\b',
  '\\bone\\s+foot\\s+in\\s+the\\s+grave\\b', '\\bdig\\w*\\s+(?:my|your|his|her|their|our)\\s+own\\s+graves?\\b',
  '\\bgrave(?:ly)?\\s+(?:mistake|error|concern|concerns|danger|doubts?|situation|consequences|risk|news|voice|face|look|tone|matter|warning|injustice)\\b',
  '\\b(?:it[\'’]?s|its|it\\s+is|it\\s+was|that[\'’]?s|that\\s+is)\\s+(?:your|his|her|their|my)\\s+(?:own\\s+)?funeral\\b',
  '\\bR\\.?I\\.?P\\.?\\s+(?:off|it|them|that|this|up|my\\s+(?:phone|bank|wallet|weekend|plans|social|sleep|diet|money|savings|car|laptop|screen))\\b',
  '\\brip(?:ped|ping|s)?\\s+(?:off|it|up|out|open|apart|through)\\b',
].join('|'), 'giu');
/** A death imagined, feared or dreamt in the same clause ("what if my mum died", "I dreamt my dad died"). */
const IMAGINED = /\b(?:if|imagine|imagining|in\s+case|as\s+if|as\s+though|suppose|supposing|pretend\w*|dream\w*|nightmare\w*|scared|afraid|frightened|terrified|worried|worry|worrying|fear\w*|thought\s+of|idea\s+of|prospect\s+of|possibility\s+of|can['’]?t\s+imagine|wish(?:ed)?|hope)\b/iu;
const CLAUSE_JOIN = /\b(?:since|because|cos|after|and|but|so|though|although|while|when|now)\b|[,;:—–]/u;

/** True when the match at `index` is imagined or feared within its own clause. */
function imagined(t, index) {
  const start = Math.max(t.lastIndexOf('.', index - 1), t.lastIndexOf('!', index - 1), t.lastIndexOf('?', index - 1)) + 1;
  const parts = t.slice(start, index).split(CLAUSE_JOIN);
  if (IMAGINED.test(parts[parts.length - 1] || '')) return true;
  // …or told as a dream after it ("my cat died in my dream")
  const end = t.slice(index).search(/[.!?]/u);
  return /\bin\s+(?:my|a|the|last\s+night['’]?s|his|her)\s+(?:dream|nightmare)s?\b/iu.test(end < 0 ? t.slice(index) : t.slice(index, index + end));
}
/** A match of `re` (global) in `t` that is stated, not imagined; a name it carries is a capitalised name. */
function stated(re, t, { ownImagined = false } = {}) {
  re.lastIndex = 0;
  for (const m of t.matchAll(re)) {
    const nm = m.groups?.nm;
    if (nm && (!/^\p{Lu}/u.test(nm) || NOT_NAMES.test(nm))) continue;
    if (!ownImagined && imagined(t, m.index)) continue;
    return true;
  }
  return false;
}

/** 'loss' (someone or a pet died: "Missing them…"), 'grief' (grieving, a funeral, a grave), or null. */
export function bereavement(text) {
  const raw = String(text ?? '').replace(/\s+/g, ' ');
  if (!/\p{L}/u.test(raw)) return null;
  // a regret ("I wish my dad hadn't died") says the death happened: its "wish" is not an imagined death
  if (stated(LOSS[LOSS.length - 1], raw, { ownImagined: true })) return 'loss';
  const t = raw.replace(NOT_A_LOSS, ' ');
  if (LOSS.slice(0, -1).some((re) => stated(re, t))) return 'loss';
  if (!ACHIEVED.test(t) && stated(HAS_PASSED, t)) return 'loss';
  if (!FICTION.test(t) && stated(WATCHED_DIE, t)) return 'loss';
  if (!FICTION.test(t) && stated(PRONOUN_DIED, t)) return 'loss';
  if (!FICTION.test(t) && !GADGET.test(t) && stated(PRONOUN_DEAD, t)) return 'loss';
  if (PET_WORD.test(t) && stated(PRONOUN_PUT, t)) return 'loss';
  if (SOMEONE.test(t) || /\b(?:he|she|who)\b/iu.test(t)) { if (stated(PASSED_AWAY, t)) return 'loss'; }
  if (!NOT_DEATH_CONTEXT.test(t) && (stated(LOST, t) || stated(LOSING, t))) return 'loss';
  if (stated(LOST_CLOSE, t)) return 'loss';
  if (DEATH_WORD.test(t) && stated(LOST_FADING, t)) return 'loss';
  if (!WENT_SOMEWHERE.test(t) && !NOT_DEATH_CONTEXT.test(t) && (GONE.slice(0, 2).some((re) => stated(re, t)) || (SOMEONE.test(t) && stated(GONE[2], t)))) return 'loss';
  if (RIP.some((re) => stated(re, t))) return 'loss';
  if (stated(GRAVE, t) || stated(GRIEVING, t)) return 'grief';
  return null;
}

/**
 * A server scene about a death: a loss, read as grief, or a loss beside a death named in the words about
 * someone (the server may call it 'sadness' for "my nan passed in May, and the house is so quiet", which the
 * app's own reading leaves to the server). Its two lines play gently; its mechanic never does. A lost job, a
 * lost match, a phone that died or a death only feared is never one.
 */
const GRIEF_EMOTIONS = new Set(['grief', 'mourning', 'bereft']);
const SERVER_DEATH = new RegExp(`${DEATH_WORD.source}|\\bpassed\\b${PASSED_GUARD}|\\bput\\s+to\\s+sleep\\b`, 'iu');
export function serverGrief(scene, text = '') {
  if (scene?.source !== 'server' || scene.situation_type !== 'loss') return false;
  if (GRIEF_EMOTIONS.has(String(scene.emotion || '').toLowerCase())) return true;
  const t = String(text ?? '').replace(/\s+/g, ' ').replace(NOT_A_LOSS, ' ');
  return !FICTION.test(t) && !IMAGINED.test(t) && SOMEONE.test(t) && SERVER_DEATH.test(t);
}

/**
 * 'passed' alone after a person ("My dad passed last year", "since Mum passed"): never read as a death (it may
 * be an exam), but never a game either. With nothing in the words about an exam, a result or being proud, the
 * authored path answers it gently without naming a death (authored.js feelingOf → kind 'heavy'); with
 * sharing on, the server reads it.
 */
const PASSED_ALONE = new RegExp(`(?:${SUBJ}|${BARE_SUBJ})(?:\\s+|['’]s\\s+)${AUX}passed\\b${PASSED_GUARD}`, 'giu');
const ACHIEVED = /\b(?:proud|happy|pleased|thrilled|delighted|chuffed|relieved|congrat\w*|well\s+done|exams?|tests?|driving|grades?|results?|uni|university|college|school|got\s+into|got\s+in|distinction|merit|scholarship|qualif\w*|certificate|course|module|level|gcses?|a-levels?|degree|class|audition|trial|probation|assessment|inspection|mot)\b|!/iu;
export function passedAlone(text) {
  const t = String(text ?? '').replace(/\s+/g, ' ');
  return !ACHIEVED.test(t) && stated(PASSED_ALONE, t);
}

/**
 * Someone still alive but going, or gone in another way ("I lost my mum to dementia, she doesn't know who I am",
 * "I'm losing my dad to drink", "my nan has Alzheimer's and doesn't recognise me"): never read as a death
 * (bereavement is null), and never a game either: the authored path answers it gently (authored.js feelingOf →
 * kind 'heavy'); with sharing on, the server reads it.
 */
const LIVING_LOSS = [
  new RegExp(`\\b(?:lost|losing)\\s+(?:my|our)\\s+${ADJ}(?:${FAMILY}|${CLOSE})s?${NAME}\\s+to\\s+(?:${FADING}|drink|drugs|alcohol|addiction|the\\s+bottle|gambling)\\b`, 'giu'),
  new RegExp(`(?:${SUBJ}|${BARE_SUBJ})(?:\\s+|['’]s\\s+)(?:(?:has|had|got|was\\s+diagnosed\\s+with|is\\s+living\\s+with)\\s+)(?:early[\\s-]+onset\\s+)?(?:${FADING})\\b`, 'giu'),
  new RegExp(`(?:${SUBJ}|${BARE_SUBJ}|\\b(?:he|she))\\s+(?:(?:just|really|even|now|sometimes|often)\\s+)?(?:doesn['’]?t|does\\s+not|can['’]?t|cannot|no\\s+longer)\\s+(?:even\\s+)?(?:know\\s+who\\s+i\\s+am|recogni[sz]e\\s+me|remember\\s+(?:me|my\\s+name|who\\s+i\\s+am))\\b`, 'giu'),
];
export function livingLoss(text) {
  const t = String(text ?? '').replace(/\s+/g, ' ');
  return LIVING_LOSS.some((re) => stated(re, t));
}
