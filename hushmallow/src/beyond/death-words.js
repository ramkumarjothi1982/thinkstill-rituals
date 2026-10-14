// Another Angle: the words people use for a death, a loss and harm, and the few idioms that use them for
// something else. Shared by grief.js (deathTalk, the escalation reader) and backstop.js (the fact-vs-guess
// backstop), so both read the same words the same way.
//
//   norm(text)          → the words with every apostrophe taken out ("dad’s" → "dads", "she's" → "shes",
//                         "didn't" → "didnt"), hyphens as spaces, "R.I.P." as "RIP", case kept
//   blankOrdinary(t)    → `t` (normed) with the ordinary idioms blanked out: a gadget that died, "dead tired",
//                         "dying to", "killing it", "it's your funeral", "lost my keys", "passed my test"…
//   PERSON, PET, BARE, ADJ, THING   regex sources (apostrophe-free, case-insensitive)
//
//   whoDied(cased, which) → (final round 3) who died, by the shape of the clause, for the WEAK death words: 'who' | 'unknown' |
//                         'self' | 'thing' | null (the rule at the end of this file; grief.js deathTalk reads it)
//
// Recall first: these lists are wide on purpose, and the idioms are only the unambiguous, cheap ones. A near miss or an
// imagined death is never set aside here: the gentle path is safe for them. (r2-angle item 4, owner decision 'Ask before
// every world', 14 Oct 2026: every Tell that is not a detected loss is now asked one gentle question first, so death words
// that describe a thing, a place, an event, a creature, a game, a film or a book are set aside too: "the battery in my car is
// dead again", "I killed the spider in the bath", "my character died in the game", "we went to the cemetery on a school trip".
// A person or a pet of their own in the words keeps them a death: "My son died in Fortnite", "our dead hamster".)
//
// Pure ES module, no DOM. Deterministic.

/** Every apostrophe out (so "dads", "dad's" and "dad’s" read the same), hyphens as spaces, "R.I.P." as "RIP". */
export function norm(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .replace(/[‘’ʼ`´']/gu, '')
    .replace(/\bR\s*\.\s*I\s*\.\s*P\b\.?/gu, 'RIP')
    .replace(/\br\s*\.\s*i\s*\.\s*p\b\.?/gu, 'rip')
    .replace(/[‐‑-]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

/** Family, partners, friends and people in general (each also read with a plural "s"). */
export const PERSON = [
  'mum', 'mom', 'mam', 'mummy', 'mommy', 'mama', 'mamma', 'mother', 'dad', 'daddy', 'papa', 'pa', 'father', 'parent', 'folks',
  'step ?(?:dad|mum|mom|father|mother|son|daughter|brother|sister)', '(?:mother|father|sister|brother|son|daughter) in law', 'in laws?',
  'grandma', 'grandmother', 'grandad', 'granddad', 'grandpa', 'grandfather', 'grandparent', 'great (?:grandma|grandmother|grandad|granddad|grandpa|grandfather|aunt|uncle|nan|gran)',
  'nan', 'nana', 'nanna', 'nanny', 'gran', 'granny', 'grandmama', 'nonna', 'nonno', 'oma', 'opa', 'abuela', 'abuelo', 'bubbe', 'zayde',
  'sister', 'brother', 'sis', 'bro', 'sibling', 'twin', 'son', 'daughter', 'child', 'children', 'kid', 'baby', 'babies', 'newborn', 'toddler',
  'husband', 'wife', 'hubby', 'wifey', 'partner', 'spouse', 'boyfriend', 'girlfriend', 'bf', 'gf', 'fianc[eé]e?', 'ex', 'ex (?:husband|wife|partner|boyfriend|girlfriend)',
  'uncle', 'aunt', 'auntie', 'aunty', 'cousin', 'niece', 'nephew', 'godmother', 'godfather', 'godson', 'goddaughter', 'grandson', 'granddaughter', 'grandchild', 'grandchildren', 'grandkid',
  'friend', 'best friend', 'bestie', 'bff', 'mate', 'best mate', 'pal', 'buddy', 'flatmate', 'housemate', 'roommate', 'classmate', 'colleague', 'coworker', 'co worker', 'boss', 'teacher',
  'neighbou?r', 'coach', 'mentor', 'carer', 'patient', 'boy', 'girl', 'little one', 'man', 'woman', 'guy', 'lady', 'person', 'someone', 'somebody', 'family', 'loved one', 'soulmate', 'soul mate',
  // (review r9) what people call their own ("my missus passed", "my da passed", "my pops passed", "my granda died")
  'missus', 'mrs', 'fella', 'lad', 'lass', 'da', 'ma', 'mammy', 'pappy', 'pops', 'gramps', 'granda', 'grampa', 'gramma', 'grandpop', 'bairn', 'other half', 'love of my life',
].join('|');
/** Pets (a pet's death is a death). */
export const PET = [
  'dog', 'doggy', 'doggie', 'doggo', 'pup', 'puppy', 'cat', 'kitty', 'kitten', 'pet', 'horse', 'pony', 'rabbit', 'bunny', 'hamster', 'guinea pig', 'gerbil', 'chinchilla', 'degu',
  'budgie', 'parrot', 'cockatiel', 'canary', 'bird', 'tortoise', 'turtle', 'ferret', 'goldfish', 'fish', 'rat', 'mouse', 'mice', 'snake', 'lizard', 'gecko', 'bearded dragon', 'axolotl',
  'frog', 'hen', 'chicken', 'duck', 'goat', 'sheep', 'pig', 'cow', 'donkey',
].join('|');
/** What people call parents and grandparents by ("Mum died", "We lost Dad"). */
export const BARE = 'mum|mom|mam|mummy|mommy|mama|dad|daddy|papa|grandad|granddad|grandpa|grandma|granny|gran|nan|nana|nanna|nanny|grandmama|nonna|nonno|oma|opa';
/** Words that may stand before the person ("my little brother", "my late husband"). */
export const ADJ = '(?:(?:best|dear|dearest|beloved|little|big|old|older|younger|elder|eldest|youngest|baby|twin|lovely|sweet|only|first|other|half|darling|wonderful|amazing|gorgeous|precious|poor|late|beautiful|lovely|special|closest|oldest|childhood|furry|fur|four legged|rescue)\\s+)*';
/** Things of a person's that can be lost or broken ("lost my dad's ring", "lost my dog's lead"). */
export const THING = 'rings?|watch|watches|keys?|car|number|phone|wallet|purse|necklace|bracelet|earrings?|letters?|photos?|pictures?|cards?|money|bag|coat|jacket|hat|scarf|glasses|books?|present|gift|trust|respect|address|recipe|stuff|things|house|home|shoes?|charger|bike|tickets?|passport|jumper|toys?|teddy|blanket|lead|collar|leash|harness|ball|bowl|teeth|tooth|weight|fat|bump|blues|number|details|password|clothes|socks|dummy|bottle|mittens|gloves|homework|work|notes|email|message|texts?|voice|attention|interest|patience|approval|love|support|money|savings|job|business|shop|seat|place|spot';

/** What takes someone (shared by grief.js deathTalk and backstop.js strongLoss; "covid took my grandad", "the accident took my brother", "God took him home": review r10). */
export const KILLERS = [
  'diseases?', 'illness', 'sickness', 'accident', 'crash', 'car\\s+crash', 'war', 'covid(?:\\s+19)?', 'corona(?:virus)?', 'virus', 'cancer', 'leuk(?:a)?emia',
  'lymphoma', 'tumou?r', 'stroke', 'heart\\s+attack', 'heart\\s+failure', 'sepsis', 'pneumonia', 'flu', 'dementia', 'alzheimers?', 'mnd',
  'motor\\s+neuron(?:e)?\\s+disease', 'cot\\s+death', 'sids', 'suicide', 'overdose', 'drugs', 'heroin', 'alcohol', 'addiction', 'sea', 'fire',
  'flood', 'bomb', 'aids', 'hiv', 'tb', 'malaria', 'ebola', 'meningitis', '(?:kidney|liver|organ)\\s+failure', 'complications', 'death', 'god',
  'the\\s+lord', 'jesus', 'heaven', 'the\\s+angels',
  // (review r11) a drunk driver, a knife, a storm, "the big c"
  'drunk\\s+driver', 'drink\\s+driver', 'drunk\\s+driving', 'knife', 'knife\\s+crime', 'gun', 'shooting', 'storm', 'earthquake', 'tsunami', 'avalanche',
  '(?:the\\s+)?big\\s+c', 'infection', 'covid\\s+virus', 'brain\\s+tumou?r', 'motor\\s+neurone',
].join('|');
/** "would have been mums 60th", "his fortieth" (an ordinal; never "would have been my first time"). */
export const ORDINALS = '(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)?(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth)|(?:twentieth|thirtieth|fortieth|fiftieth|sixtieth|seventieth|eightieth|ninetieth|hundredth)';
/** Gadgets and things that "die" or are "dead" without anyone dying (a pet mouse is never one of them). */
const DEVICE = 'baby\\s+monitors?|phones?|mobiles?|iphones?|androids?|laptops?|batter(?:y|ies|ys)|cars?|chargers?|consoles?|controllers?|headphones|earbuds|airpods|ipads?|tablets?|computers?|pcs?|tvs?|telly|tellies|torch(?:es)?|remotes?|kindle|xbox|playstation|ps\\d|switch|router|wifi|internet|engines?|keyboards?|screens?|watch|fitbit|cameras?|speakers?|alarms?|clocks?|printers?|fridges?|freezers?|kettles?|toasters?|microwaves?|bulbs?|lights?|lamps?|signal|connection|servers?|apps?|games?|vapes?|ereaders?|smartwatch|monitor|hoover|vacuum|boiler|heating|fan|radio';
/** Little words between a gadget and "died" ("my phone has just died", "my laptop is dead"): never a person's words. */
// (review r10: "my headphones are dead", "the batterys dead")
const DEV_AUX = '(?:(?:is|was|are|were|re|has|had|have|s|just|completely|totally|finally|already|literally|now|both|all)\\s+){0,2}';
/**
 * The gadget as the subject, at the start of a clause ("my phone died", "and then the battery died", "Phone died."):
 * one owner's word at most before it ("my mums car"), never a preposition or a person ("the guy in the car died",
 * "the driver of the car died" are deaths).
 */
const CLAUSE_START = '(?:^|[.!?;,:]\\s*|\\b(?:and|but|so|then|because|cos|coz|now|when|after|before|until|as|since|while|if|think|guess|reckon|that|plus|also|again|just|ugh|lol|omg)\\s+)';
// (a gadget's part right after it, "phone battery died", is still the gadget: review r9)
const DEV_SUBJ = `${CLAUSE_START}(?:(?:my|our|his|her|their|your|the|this|that|its)\\s+(?:(?!(?:${'guy|man|woman|lady|driver|person|boy|girl|kid|child|baby|someone|somebody|passenger|people|family|friend|mum|dad|mom|brother|sister|son|daughter|husband|wife|nan|grandad|grandma|dog|cat|in|on|of|at|with|by|from|inside|behind|under'})\\b)[a-z]+\\s+){0,2})?(?:${DEVICE})(?:\\s+(?:${DEVICE}))?`;
/** (review r11) Plants, which die without anyone dying ("my plant died", "the basil is dead"). */
const PLANT = 'plants?|houseplants?|house\\s+plants?|flowers?|cactus|cacti|succulents?|basil|herbs?|tomato(?:es)?(?:\\s+plants?)?|orchids?|bonsai|seedlings?|trees?|lawn|grass|roses?|tulips?|sunflowers?|daffodils?|monstera|ferns?|ivy|crops?|veg|vegetables|chilli\\s+plants?|strawberr(?:y|ies)|hedge|bush|bushes|shrubs?|moss|bouquet|christmas\\s+tree|peace\\s+lily|spider\\s+plant|aloe(?:\\s+vera)?|mint|parsley|coriander|rosemary|lavender|bamboo|palm';
const PLANT_SUBJ = `${CLAUSE_START}(?:(?:my|our|his|her|their|your|the|this|that|its|all\\s+my|all\\s+the|all\\s+our)\\s+(?:(?!(?:${'guy|man|woman|lady|person|boy|girl|kid|child|baby|someone|somebody|family|friend|mum|dad|mom|brother|sister|son|daughter|husband|wife|nan|grandad|grandma|dog|cat|in|on|of|at|with|by|from|inside|behind|under'})\\b)[a-z]+\\s+){0,2})?(?:${PLANT})`;
/** (review r11) A place, a chat or a night that is "dead" (quiet): "the party is dead", "the group chat is dead". */
const QUIET_PLACE = 'party|pub|bar|club|town|city|village|place|shop|shops|street|streets|high\\s+street|chat|group\\s+chat|groupchat|server|market|crowd|atmosphere|vibe|vibes|dance\\s+floor|office|school|stadium|restaurant|cafe|gym|beach|park|mall|centre|center|discord|night|nightlife|scene|thread|forum|channel|timeline|feed|inbox|convo|conversation|lesson|class|meeting|weekend|area|estate|road|roads|bus|train|carriage|cinema|venue|gig|event|disco|prom|square|campus|library|canteen|staffroom|break\\s+room|work|game|match|lobby';

/**
 * The ordinary idioms: unambiguous, cheap, and never a person. Blanked before any death or harm word is read.
 * (The 'lost' + thing idioms matter to the backstop: deathTalk only reads 'lost' beside a person or a pet.)
 */
/** (r2-angle item 4) Small creatures and wild animals, never someone's pet unless the words say so ("our mouse", "my rat"). */
const BUGS = 'spiders?|wasps?|flies|fly|bees?|ants?|mosquito(?:e?s)?|moths?|slugs?|snails?|bugs?|cockroach(?:es)?|roach(?:es)?|insects?|beetles?|worms?|maggots?|earwigs?|woodlice|woodlouse|centipedes?|ladybirds?|flea|fleas|ticks?|nits|lice';
const CREATURE = `${BUGS}|mouse|mice|rats?|birds?|pigeons?|seagulls?|gulls?|crows?|magpies?|sparrows?|robins?|blackbirds?|starlings?|blue\\s+tits?|fox|foxes|badgers?|hedgehogs?|squirrels?|moles?|voles?|shrews?|deer|frogs?|toads?|jellyfish|crabs?|fish|seals?|whales?|dolphins?|pheasants?|rabbits?|bats?|newts?|lizards?|snakes?|owls?|ducks?|geese|goose|swans?`;
/**
 * (r2-angle item 4) Between a thing and "is dead": where it is or when ("the battery in my car is dead again", "the party last
 * night was dead"). Never a person or a pet in it ("the battery in my dad's car" is still the battery; "the man in the car" is a
 * person, never a thing: DEV_SUBJ and the place below never start at a person).
 */
const NOT_WHO = `(?!(?:${PERSON}|${PET})s?\\b)`;
const WHERE_WHEN = `(?:\\s+(?:(?:in|on|of|for|from|at|inside|under)\\s+(?:(?:my|the|our|his|her|their|your|a|an|this|that)\\s+)?(?:[a-z]+s\\s+)?${NOT_WHO}[a-z]+|last\\s+(?:night|week|weekend|time|year)|yesterday|today|tonight|this\\s+(?:morning|afternoon|evening|week|weekend|year|time)|on\\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|again|already|now)){0,2}`;
export const ORDINARY = [
  // a gadget that died, a dead battery (r2-angle item 4: "the battery in my car is dead again")
  new RegExp(`${DEV_SUBJ}${WHERE_WHEN}\\s+${DEV_AUX}(?:die|dies|died|dying|dead|deaded|dyin)\\b`, 'giu'),
  // (review r11) a plant that died ("my plant died", "all my tomato plants are dead"), a place or a night that was dead
  // ("the party is dead", "the pub was dead"), "this traffic is murder", "the walking dead": never a person or a pet
  new RegExp(`${PLANT_SUBJ}\\s+${DEV_AUX}(?:die|dies|died|dying|dead|deaded|dyin)\\b`, 'giu'),
  new RegExp(`\\b(?:the|this|that|our|my|tonights|todays)\\s+(?:${QUIET_PLACE})${WHERE_WHEN}\\s+(?:is|was|s|are|were|went|has\\s+gone|had\\s+gone|has\\s+been|have\\s+been|seems|seemed|felt|feels|looks|looked)\\s+(?:(?:so|really|totally|completely|absolutely|pretty|well|proper|stone|kind\\s+of|kinda|a\\s+bit|bit)\\s+)*dead\\b|\\bdead\\s+in\\s+(?:here|there)\\b`, 'giu'),
  /\b(?:the|this|that|my)\s+(?:traffic|commute|journey|drive|queue|queues|weather|heat|motorway|m25|rush\s+hour|parking|hill|stairs|climb|workout|training|session|shift|week|exam|exams|revision|deadline|school\s+run|feet|back|legs|knees)\s+(?:is|was|s|are|were|has\s+been|will\s+be|gonna\s+be|is\s+going\s+to\s+be)\s+(?:(?:absolute|pure|sheer|total|literally|actual|bloody|just)\s+)*murder\b|\b(?:its|it\s+is|it\s+was)\s+(?:(?:absolute|pure|sheer|total|literally|bloody)\s+)*murder\s+(?:out\s+there|on\s+the\s+(?:roads|motorway|m25)|in\s+(?:here|this\s+heat|town|traffic))\b/giu,
  /\b(?:the\s+)?(?:walking|living)\s+dead\b|\bdead\s+on\s+my\s+feet\b|\bdead\s+man\s+walking\b/giu,
  new RegExp(`\\bdead\\s+(?:${DEVICE})\\b`, 'giu'),
  // "dead" as a word for "very" or a place
  /\bdead\s+(?:tired|easy|set|end|ends|on(?!\s+(?:arrival|the\s+scene|impact))|serious|seriously|keen|against|right|wrong|good|nice|funny|cute|clever|lucky|excited|bored|boring|busy|proud|chuffed|centre|center|heat|weight|giveaway|ringer|zone|cert|certain|sure|slow|fast|straight|ahead|quiet|posh|happy|chuffed|jealous|annoying|hard|simple|cheap|expensive|brilliant|popular)\b/giu,
  /\bdead\s+to\s+(?:me|him|her|them|us|the\s+world)\b/giu, /\bdead\s+of\s+(?:night|winter)\b/giu, /\bdead\s+in\s+the\s+water\b/giu,
  /\bdrop\s+dead\s+(?:gorgeous|beautiful|handsome|stunning)\b/giu, /\bover\s+my\s+dead\s+body\b/giu,
  // "dying to" (can't wait), "dying for a coffee", "died laughing", "died of embarrassment", dyed hair
  /\b(?:dying|dyin|die|dies)\s+to\s+(?!be\s+with\b|join\b|see\s+(?:him|her|them)\s+again\b)[a-z]+\b/giu,
  /\b(?:dying|dyin|die|dies|died)\s+for\s+(?:a|an|some|the|my|it|one|another)\b/giu,
  /\b(?:dying|dyin|died|die|dies)\s+(?:of|from|with)\s+(?:laughter|laughing|embarrassment|shame|boredom|cringe|thirst|hunger|heat|curiosity|envy|jealousy)\b/giu,
  /\b(?:died|dying|dyin|die|dies)\s+laughing\b/giu, /\b(?:died|dying|die|dies)\s+(?:down|out)\b/giu,
  /\b(?:dye|dyed|dyes|dyeing|died|dying|die)\s+(?:my|her|his|their|your|our)\s+hair\b/giu, /\bdie\s+hard\b|\bdiehard\b/giu,
  // "the death of me", "bored to death", "death metal"
  /\b(?:be|been|being|was|is|will\s+be|itll\s+be|youll\s+be|shell\s+be|hell\s+be)\s+the\s+death\s+of\s+(?:me|us|him|her)\b/giu,
  /\b(?:bored|scared|worried|sick|tired|frightened|terrified|freaked|stressed)\s+to\s+death\b/giu, /\bdeath\s+(?:metal|star|stare)\b/giu,
  // "killing it", "kill time", "my mum will kill me", "my feet are killing me", "I'd kill for a coffee"
  /\b(?:killing|killed|kill|kills|smashed|smashing)\s+it\b/giu, /\bkill(?:ing|ed|s)?\s+(?:some\s+)?time\b/giu,
  /\b(?:will|would|gonna|going\s+to|to|wanna|could|might|wants\s+to|is\s+going\s+to)\s+kill\s+(?:me|us|him|her|you|them)\b/giu,
  /\bkilling\s+(?:me|us|him|her|you|them)\b/giu, /\bkill\s+for\s+(?:a|an|some)\b/giu, /\bcould\s+murder\s+(?:a|an|some)\b/giu, /\bmurder\s+myster(?:y|ies)\b/giu,
  // "it's your funeral"
  /\b(?:its|it\s+is|thats|that\s+is|it\s+was|itll\s+be)\s+(?:your|his|her|their|my)\s+(?:own\s+)?funeral\b/giu,
  // lost a thing, a game or one's way (never a person or a pet)
  /\b(?:lost|lose|losing|loses)\s+(?:(?:my|the|his|her|our|their|a|an|your|all|some|any|so\s+much|track\s+of)\s+)?(?:keys?|phone|wallet|purse|job|temper|mind|way|voice|game|games|match|matches|bet|argument|race|appetite|count|track|sleep|focus|patience|nerve|bearings|footing|balance|signal|connection|money|cash|card|bag|ticket|passport|glasses|ring|watch|earrings?|necklace|homework|notes|place|marbles|plot|head|cool|shit|faith|hope|confidence|motivation|interest|touch|contact|followers|subscribers|points|data|files?|work|progress|internet|wifi|weight|pounds|kilos|stone|hair|sight|hearing|grip|streak|lead|deposit|luggage|suitcase|charger|umbrella|coat|jacket|shoes?|sock|socks|password|login|account|license|licence|tv|remote|chance|opportunity|job|contract|deal|case|vote|election|final|semi\s+final|title|cup|trophy|toss|rag|nerves|bottle|edge|spark|appetite|virginity|baby\s+teeth|tooth|teeth|essays?|coursework|assignments?|documents?|photos|pictures|videos|receipts?|parcels?)\b/giu,
  /\blost\s+it\b(?!\s+(?:at|in|after|before|when|last|this|yesterday|early|on|during|again\s+at)\b)/giu,
  // a person's thing ("lost my mum's ring", "lost my dad's car keys": the apostrophe is out, "mums ring")
  /\b(?:lost|lose|losing)\s+(?:my|our|his|her|their|your|the|a)\s+(?:[a-z]+\s+){0,2}(?:rings?|watch|keys?|car|number|phone|wallet|purse|necklace|bracelet|earrings?|letters?|photos?|pictures?|cards?|bag|coat|jacket|hat|scarf|glasses|books?|present|gift|trust|respect|address|recipe|stuff|things|shoes?|charger|bike|tickets?|passport|jumper|toys?|teddy|blanket|lead|collar|leash|harness|ball|bowl|teeth|tooth|password|clothes|socks|dummy|bottle|mittens|gloves|homework|notes|email|texts?|savings)\b/giu,
  /\blost\s+to\s+(?:the\s+(?:other\s+(?:team|side)|reds|blues|away\s+team|home\s+team|favourites)|them|us|a\s+(?:better|stronger)\s+(?:team|side|player)|\d)/giu, /\blost\s+(?:\d+|one|two|three|nil|by)\b/giu, /\b(?:got|get|getting|gets)\s+lost\b/giu, /\bget\s+lost\b/giu,
  /\blost\s+(?:in\s+thought|for\s+words|cause)\b/giu, /\b(?:feel|feels|felt|feeling|am|im|seem|seems|so|bit|totally|completely|really)\s+(?:so\s+|really\s+|a\s+bit\s+|completely\s+|totally\s+|kind\s+of\s+|kinda\s+)*lost\b/giu,
  // "passed my test", "passed out", "passed me the salt", "she passed!" (an exam's joy)
  /\bpass(?:ed|es|ing)?\s+(?:my|his|her|their|our|your|the|a|an|all|every|both)?\s*(?:[a-z]+\s+)?(?:test|tests|exam|exams|driving|theory|grade|grades|gcses?|a\s+levels?|degree|course|module|interview|audition|assessment|inspection|mot|probation|trials?|maths|english|science|history|quiz)\b/giu,
  // (never "passed out", "passed by" or "passed on the weekend": each can hide a death, "my brother passed out and never woke up")
  /\bpass(?:ed|es|ing)?\s+(?:over\s+(?:it|this|that)|round|around|along|me|us|it|(?:him|her|them)\s+(?:the|a|an|my|his|her|some)|the\s+(?:ball|salt|parcel|buck|controller|phone)|with\s+(?:flying|a\s+distinction|distinction|merit|honours)|first\s+time)\b/giu,
  /\bpassed\s*!/giu,
  /\bpass(?:ed|es|ing)?\s+on\s+(?:(?:the|a|an|his|her|my|their|our|your|that|this|some|any)\s+)?(?:messages?|news|word|info\w*|details?|notes?|tips?|advice|cold|bug|virus|flu|germs|recipe|genes?|baton|torch|invite|invitation|offer|job|chance|opportunity|deal|idea|feedback|request|link|number|email|letter|card|cv|resume|love\s+of)\b/giu,
  // a grave idiom, a burial idiom
  /\bgrave(?:ly)?\s+(?:mistake|error|concern|concerns|danger|doubts?|situation|consequences|risk|warning|injustice|news|matter|tone|voice|face|look)\b/giu,
  /\b(?:turn|turns|turning|turned|spin|spins|spinning|spun|roll|rolls|rolling|rolled)\s+(?:over\s+)?in\s+(?:his|her|their|my|your)\s+graves?\b/giu,
  /\b(?:take|takes|taking|took)\s+(?:it|this|that|them|the\s+secret|my\s+secret|the\s+truth|that\s+secret)\s+to\s+(?:the|my|his|her|their)\s+grave\b/giu,
  /\bone\s+foot\s+in\s+the\s+grave\b/giu, /\bdig\w*\s+(?:my|your|his|her|their|our)\s+own\s+graves?\b/giu,
  /\bbury\s+the\s+hatchet\b/giu, /\b(?:bury|buries|buried|burying)\s+(?:my|his|her|their|your|our)\s+(?:face|head|nose|hands|feelings)\b/giu,
  /\bburied\s+(?:in|under)\s+(?:(?:her|his|their|my|our|the)\s+)?(?:work|paperwork|emails?|homework|snow|sand|blankets?|duvets?|laundry|washing|deadlines|admin|assignments|notifications|messages|marking|revision|revising|exams?|exam\s+prep|coursework|essays?|books|studying|study|studies|reading|notes|textbooks?|uni\s+work|schoolwork|school\s+work|projects?|dissertation|thesis|applications?|bills|cushions|pillows|leaves)\b/giu,
  // "grief" for hassle, "good grief"
  /\b(?:give|gives|giving|gave|get|gets|getting|got|take|takes|taking|took|cause|causes|caused|causing)\s+(?:me|us|him|her|them|you|myself)?\s*(?:(?:so\s+much|a\s+lot\s+of|some|such|no\s+end\s+of|loads\s+of|any|the|a\s+load\s+of|real|serious)\s+)*grief\b/giu,
  /\bgood\s+grief\b/giu, /\bc[oa]me\s+to\s+grief\b/giu, /\bgrief\s+(?:from|off)\s+(?:my|the|his|her|their)\s+(?:boss|manager|teacher|work|school|colleagues?|neighbou?rs?|landlord)\b/giu,
  // rip it up; RIP my phone; rest in peace, old laptop
  /\brip(?:ped|ping|s)?\s+(?:off|it|them|that|this|up|out|open|apart|through|into)\b/giu,
  new RegExp(`\\b(?:RIP|rip|rest\\s+in\\s+peace)\\s+(?:to\\s+)?(?:(?:my|our|the|your)\\s+)?(?:old\\s+)?(?:${DEVICE}|social\\s+life|weekend|plans|bank(?:\\s+account)?|wallet|diet|sleep|money|savings|sanity|dignity|ego|inbox|streak|knees|back|feet|ears|eyes|hopes|dreams|life\\s+savings|bed\\s+time|bedtime|me|us)\\b`, 'giu'),
  // the other harm words the backstop reads, in their ordinary sense
  /\bgone\s+(?:viral|wrong|mad|crazy|quiet|silent|off|out|home|back|shopping|abroad|travelling|traveling|grey|gray|bald|downhill|pear\s+shaped|to\s+(?:work|school|bed|uni|college|the\s+(?:shops?|gym|pub|office|park|toilet|loo|bathroom|doctors?|dentist))|for\s+a\s+(?:walk|run|swim|drink|coffee|bit|while))\b/giu,
  /\b(?:app|computer|laptop|phone|game|website|site|system|server|pc|browser|tablet|ipad|xbox|playstation)\s+(?:has\s+|just\s+|keeps\s+|kept\s+)*crash\w*\b/giu, /\bcrash\s+(?:course|diet)\b|\bcrashed\s+out\b|\bcrashed\s+(?:on|at)\s+(?:the|my|a|his|her|their)\s+(?:sofa|couch|settee|floor|bed|mates|friends|place)\b/giu, /\b(?:sugar|market|stock\s+market)\s+crash\b/giu,
  /\b(?:by|on|happy)\s+accident\b/giu, /\b(?:feel|felt|feeling|feels)\s+(?:so\s+|really\s+|a\s+bit\s+)?attacked\b/giu,
  /\b(?:airport|bus|train|ferry|cruise|coach)\s+terminal\b|\bterminal\s+(?:\d+|one|two|three|four|five|building)\b/giu,
  // ---- (r2-angle item 4, owner decision 'Ask before every world') the death words that describe a thing, a creature, a
  // game or a topic: every such Tell is asked the one question now, so a false gentle path is the costlier mistake --
  // a small creature or a wild animal found dead ("my cat brought a dead mouse in", "we found a dead bird in the garden"):
  // never "the dead mouse" here (someone's pet mouse may be one: THE_CREATURE below), never "my/our <pet>"
  new RegExp(`\\b(?:a|an|some|two|three|four|five|several|another|loads\\s+of|lots\\s+of|a\\s+few|a\\s+couple\\s+of|a\\s+load\\s+of)\\s+(?:(?:massive|huge|big|giant|tiny|little|small|baby|horrible|gross|disgusting|poor|squashed|rotting|stinky|smelly)\\s+)*dead\\s+(?:${CREATURE})\\b|\\b(?:a|an|some|two|three|another)\\s+(?:${CREATURE})\\s+(?:lying\\s+|lay\\s+)?dead\\b`, 'giu'),
  // killing a creature or a game's monster ("I killed the spider in the bath", "squashed a wasp", "killed the zombies")
  new RegExp(`\\b(?:killed|kill|kills|killing|squashed|squash|squashing|swatted|swat|swatting|stepped\\s+on|trod\\s+on|zapped|hoovered\\s+up)\\s+(?:a|an|the|that|this|some|all\\s+the|loads\\s+of|lots\\s+of|two|three|four|five|\\d+|another|every|a\\s+few|a\\s+couple\\s+of)\\s+(?:(?:massive|huge|big|giant|tiny|little|horrible|scary|hairy|stupid|annoying|nasty|last|final)\\s+)*(?:${BUGS}|zombies?|monsters?|dragons?|enem(?:y|ies)|aliens?|orcs?|goblins?|creepers?|mobs?|bots?|npcs?|weeds?|germs|bacteria)\\b`, 'giu'),
  // a topic, a sport's or a history lesson's words ("the black death", "a dead rubber", "the dead sea", "day of the dead")
  /\bblack\s+death\b|\bthe\s+dead\s+sea\b|\bday\s+of\s+the\s+dead\b|\bgrateful\s+dead\b|\bdead\s+poets?\b|\bred\s+dead(?:\s+redemption)?\b|\bdead\s+by\s+daylight\b|\bdead\s+(?:space|island|rising|pool|rubber|rubbers|ball|leg|arm|duck|wood|air|loss|cert|pixels?|links?|lock|bolt|letter|language|languages|stock|reckoning|silence|calm|stop)\b/giu,
  // a thing buried ("we buried the time capsule at school", "the dog buried a bone"): never with someone ("…with him")
  /\b(?:bury|buries|buried|burying)\s+(?:(?:a|an|the|our|my|his|her|their|some|its|all\s+the)\s+)?(?:(?:old|new|little|big|school|class|whole|secret)\s+)?(?:time\s+capsules?|treasure|treasure\s+chest|bones?|seeds?|bulbs?|balls?|toys?|keys|coins?|money|cables?|pipes?|wires?|acorns?|nuts|feet|toes|legs|lede|lead)\b(?!\s+with\s+(?:him|her|them))/giu,
];
/** "the dead mouse under the sofa" is a creature unless someone's own is in the words ("our mouse", "my rat", the vet, a cage). */
const THE_CREATURE = new RegExp(`\\b(?:the|that|this|these|those)\\s+(?:(?:massive|huge|big|giant|tiny|little|small|baby|horrible|gross|disgusting|poor|squashed|rotting|stinky|smelly)\\s+)*dead\\s+(?:${CREATURE})\\b`, 'giu');
const OWN_CREATURE = new RegExp(`\\b(?:my|our|his|her|their|your)\\s+(?:(?:little|old|baby|pet|poor|lovely|sweet|beloved|darling|other)\\s+)*(?:${CREATURE}|pets?)\\b|\\b(?:vets?|cage|hutch|tank|aquarium|enclosure|vivarium)\\b`, 'iu');
/**
 * (r2-angle item 4) A game, a film, a book or a show: in words that name no one of their own (no "my son", "Mum", "our dog"),
 * its death words are the story's ("my character died in the game", "I played a game where everyone dies", "my sim died in a
 * fire", "I'm reading a book about the black death"). "My son died in Fortnite" names someone, so it stays a death.
 */
const FICTION = /\b(?:games?|gaming|gamer|video\s+games?|levels?|respawn\w*|characters?|sims?|avatars?|npcs?|fortnite|minecraft|roblox|warzone|call\s+of\s+duty|apex|valorant|elden\s+ring|dark\s+souls|zelda|pokemon|among\s+us|gta|films?|movies?|book|books|novels?|fiction|story|stories|tv\s+shows?|series|episodes?|soaps?|eastenders|corrie|coronation\s+street|emmerdale|hollyoaks|anime|manga|comics?|cartoons?|musical|dnd|dungeons\s+and\s+dragons|rpg|mmo|netflix|disney)\b/iu;
/** Someone of their own: "my son", "our dog", "Mum", "Grandad" (a word for a parent or a grandparent on its own). */
const OWN_SOMEONE = new RegExp(`\\b(?:my|our|his|her|their|your)\\s+${ADJ}(?:${PERSON}|${PET})(?:s|es)?\\b|\\b(?:${BARE})s?\\b`, 'iu');
/** The death and loss words a story's words lose (and a cemetery visit's, below). */
const STORY_DEATH = /\b(?:die|dies|died|dying|dead|death|deaths|killed|kills|kill|killing|murdered|murder|murders|perished|slain|drowned|funeral|grave|graves|buried|burial)\b/giu;
/** (r2-angle item 4) A cemetery or a graveyard visited on a trip or for a project, naming no one of their own. */
const CEMETERY = /\b(?:cemetery|cemetary|cemetry|graveyard|churchyard|catacombs?|crypt|tombs?|mausoleum|war\s+graves?)\b/giu;
const ON_A_TRIP = /\b(?:school\s+trip|field\s+trip|class\s+trip|trip|history|project|homework|ghost\s+(?:tour|walk|hunt\w*)|tour|halloween|for\s+a\s+walk|walk(?:ed|ing)?\s+(?:through|past)|shortcut|short\s+cut|photography|photos\s+for|art\s+class|geocach\w*|sketch\w*)\b/iu;

/**
 * `t` (normed) with every ordinary idiom blanked out (a space each, so nothing joins across it). `stories: false` keeps a
 * story's deaths and a cemetery trip (r2-angle item 4: a server's own loss reading beside them still plays gently).
 */
export function blankOrdinary(t, { stories = true } = {}) {
  let out = String(t ?? '');
  for (const re of ORDINARY) out = out.replace(re, ' ');
  // (r2-angle item 4) "the dead mouse under the sofa", unless someone's own creature is in the words
  if (!OWN_CREATURE.test(out)) out = out.replace(THE_CREATURE, ' ');
  // a story's deaths, and a cemetery on a school trip, when the words name no one of their own (each sentence on its own)
  if (stories && !OWN_SOMEONE.test(out)) {
    out = out.replace(/[^.!?…]+[.!?…]*/gu, (sent) => {
      let s = sent;
      if (FICTION.test(s)) s = s.replace(STORY_DEATH, ' ');
      if (ON_A_TRIP.test(s)) s = s.replace(CEMETERY, ' ');
      return s;
    });
  }
  return out;
}

// ------------------------------------------------ the weak death words: who died (final round 3) --
// Five rounds of growing idiom lists never converged: every new reviewer wrote a new everyday saying ("my sourdough starter
// died", "my motivation is dead", "the traffic killed me", "I buried myself in work", "the cemetery near my flat has the best
// trees"). So the default is reversed for the WEAK death words (died / dies / dying / dead, killed, murdered, drowned, buried /
// bury, a cemetery or a graveyard): they are a death only when what died is a PERSON or a PET. The rule reads the shape of
// the clause, not a phrase list:
//   - who died: the SUBJECT of died / dies / dying / is dead / was killed / was buried (passive), found by walking back from the
//     word over the little words ("has just", "is so", "was"), past what hangs after the subject (a place or a part: "the plant
//     ON MY DESK died", "my enthusiasm FOR THE PROJECT died", "my friendship WITH SARAH died"), and past a relative clause ("the
//     coach WHO TAUGHT ME TO SWIM died", "the man I MARRIED died", "my neighbour, WHO USED TO BRING US CAKES, died"); the OBJECT
//     of killed / murdered / buried / drowned when one follows ("cancer killed MY DAD", "we buried BISCUIT", "the traffic killed
//     ME", "I buried MYSELF in work"); the noun after "dead" / "dying" used before one ("my dead DOG"); and, for a cemetery or a
//     graveyard, someone visited or lying there ("we visited MY GRANDAD at the cemetery").
//   - what it is: a person or a pet noun ("mum", "the guy", "my coach", "our dog", "the cat next door"), he / she / him / her /
//     himself / herself, "someone", "the one who…", they (unless what they stand for is plural things), a capitalised given
//     name ("Pepper died", "We buried Biscuit") → 'who'; me / myself / us as the object ("killed me", "buried myself") → 'thing';
//     I / we / you as the subject → 'self'; a thing, an idea, a place or a part of the body (the lists above and THING_WORDS
//     below) → 'thing'; anything else (an unknown noun, "my sensei died", "pepper died" typed in lower case) → 'unknown'.
// grief.js deathTalk reads a weak word as a death for 'who' only on the gentle path (lossRoute, gentleRoute); 'unknown' is the
// question (lossRoute 'ask': the question already offers "Just be with it"), never the gentle path; a thing is no death at all
// (lossRoute null). The escalation reader keeps 'unknown' and 'self' (a miss there costs most): deathTalk's wide reading.

/** The weak loss words: the one who died is the subject (WEAK_DIE) or, when one follows, the object (WEAK_KILL). */
const WEAK_DIE = /^(?:die|dies|di+e+d+|dide|dided|dyde|ded|deaded|dying|dieing|dyin|dead)$/u;
const WEAK_KILL = /^(?:killed|kiled|killd|kild|murdered|murder|drowned)$/u;
/** The weak grief words: buried / bury (as WEAK_KILL), a cemetery or a graveyard (CEMETERY_RULE). */
const WEAK_BURY = /^(?:buried|bury|buries|burying)$/u;
const WEAK_PLACE = /^(?:cemetery|cemetary|cemetry|cemeteries|graveyard|graveyards)$/u;

/** More words for people (read only here, to say who died; the shared PERSON list stays as it is for the other readers). */
const PERSON_MORE = [
  'tutor', 'vicar', 'priest', 'pastor', 'reverend', 'imam', 'rabbi', 'minister', 'monk', 'nun', 'doctor', 'gp', 'nurse', 'midwife', 'surgeon',
  'dentist', 'caregiver', 'babysitter', 'childminder', 'cleaner', 'singer', 'actor', 'actress', 'rapper', 'musician', 'artist', 'author', 'writer',
  'poet', 'youtuber', 'streamer', 'influencer', 'celebrity', 'footballer', 'player', 'captain', 'athlete', 'student', 'pupil', 'schoolmate',
  'schoolfriend', 'teammate', 'bandmate', 'workmate', 'lodger', 'landlord', 'landlady', 'tenant', 'client', 'customer', 'employee', 'manager',
  'headteacher', 'headmaster', 'headmistress', 'principal', 'lecturer', 'professor', 'instructor', 'trainer', 'therapist', 'counsellor', 'counselor',
  'guardian', 'stepmum', 'stepmom', 'stepdad', 'stepmother', 'stepfather', 'stepson', 'stepdaughter', 'stepbrother', 'stepsister', 'godparent',
  'inlaws', 'penpal', 'crush', 'groom', 'bride', 'soldier', 'officer', 'policeman', 'policewoman', 'firefighter', 'fireman', 'driver', 'passenger',
  'pilot', 'cyclist', 'pedestrian', 'biker', 'rider', 'victim', 'teenager', 'teen', 'adult', 'infant', 'elder', 'ancestor', 'relative', 'relation',
  'member', 'folk', 'homie', 'bruv', 'bredrin', 'fam', 'gentleman', 'gent', 'sir', 'madam', 'mr', 'mrs', 'ms', 'dr', 'prince', 'princess', 'queen',
  'king', 'president', 'pope', 'sweetheart', 'lover', 'fiance', 'fiancee', 'granddaughter', 'grandson', 'grandpop', 'grandmum', 'grandmom',
  'everyone', 'everybody', 'someone', 'somebody', 'anyone', 'anybody', 'people', 'men', 'women', 'children', 'kids', 'twins', 'stranger', 'guys',
  // the usual misspellings of family and friends ("my granmas dead", "my freind was kiled")
  'granma', 'granmar', 'grandmar', 'gramma', 'grama', 'granmother', 'grandmom', 'granmom', 'granmum', 'granpa', 'granpar', 'grandpar', 'granpops',
  'grandda', 'granda', 'gradma', 'gradpa', 'grandaddy', 'granddaddy', 'grandparants', 'grandparnets', 'freind', 'frend', 'firend', 'frined', 'freinds',
  'bestfriend', 'bestfreind', 'bestie', 'bezzie', 'brotha', 'bruvva', 'bruva', 'sista', 'sistah', 'mumma', 'muma', 'mommy', 'mamma', 'farther', 'fahter',
  'fater', 'mutha', 'muther', 'mothr', 'daugther', 'duaghter', 'daugter', 'neice', 'nefew', 'nephiew', 'cuzin', 'cuz', 'cousen', 'cozzie', 'anty', 'aunti',
  'uncel', 'unkle', 'husbund', 'husban', 'hubbie', 'boyfreind', 'girlfreind', 'granson', 'grandaughter', 'granddaugther', 'parants', 'perents',
  'grandfarther', 'grandmather', 'neighbor', 'nieghbour', 'naybor', 'collegue', 'coleague', 'teecher', 'techer',
].join('|');
/** More pets (and a pet's own words). */
const PET_MORE = 'pooch|mutt|moggy|moggie|furbaby|pupper|bun|piggie|cavy|cavies|cockatoo|lovebird|iguana|tarantula|terrapin|alpaca|llama|stick\\s+insect|hermit\\s+crab|dogs|cats|kitties'
  // (the breeds people call their own by: "Max, our old lab, died")
  + '|lab|labrador|retriever|spaniel|terrier|collie|poodle|pug|beagle|husky|dachshund|westie|staffie|staffy|greyhound|whippet|lurcher|boxer|shihtzu|cockapoo|labradoodle|cavapoo|cavalier|corgi|chihuahua|rottweiler|alsatian|shepherd|tabby|siamese|persian|ragdoll|budgerigar|cockerel|rooster|bantam|gelding|mare|stallion|foal';
/** Things, ideas, places and parts that "die" or are "dead" without anyone dying (the gadgets, plants and places above too). */
const THING_WORDS = [
  'motivation', 'enthusiasm', 'interest', 'passion', 'hope', 'hopes', 'dream', 'dreams', 'ambition', 'ambitions', 'confidence', 'spark', 'joy', 'romance',
  'relationship', 'relationships', 'friendship', 'friendships', 'marriage', 'career', 'mood', 'joke', 'jokes', 'banter', 'idea', 'ideas', 'plan', 'plans',
  'project', 'projects', 'trend', 'trends', 'fad', 'fashion', 'show', 'band', 'music', 'genre', 'streak', 'starter', 'sourdough', 'yeast', 'culture',
  'kombucha', 'bread', 'garden', 'leaves', 'life', 'mojo', 'buzz', 'energy', 'appetite', 'libido', 'inspiration', 'creativity', 'faith', 'belief',
  'beliefs', 'brain', 'braincells', 'cells', 'leg', 'legs', 'arm', 'arms', 'hand', 'hands', 'foot', 'feet', 'toe', 'toes', 'finger', 'fingers', 'knee',
  'knees', 'back', 'face', 'eyes', 'ears', 'nerve', 'nerves', 'tooth', 'teeth', 'traffic', 'commute', 'heat', 'weather', 'week', 'day', 'evening',
  'meeting', 'lecture', 'exam', 'exams', 'test', 'shift', 'workout', 'run', 'team', 'league', 'season', 'campaign', 'petition', 'bill', 'law', 'deal',
  'contract', 'company', 'business', 'store', 'industry', 'economy', 'website', 'site', 'page', 'group', 'twitter', 'instagram', 'tiktok', 'facebook',
  'snapchat', 'youtube', 'netflix', 'spotify', 'film', 'movie', 'book', 'novel', 'character', 'characters', 'sim', 'sims', 'avatar', 'account',
  'conversation', 'conversations', 'chat', 'chats', 'convo', 'vibe', 'vibes', 'atmosphere', 'party', 'night', 'battery', 'batteries', 'everything',
  'something', 'nothing', 'anything', 'stuff', 'things', 'thing', 'part', 'side', 'nobody', 'none', 'skin', 'hair', 'nails', 'cold', 'flu', 'virus',
  'bug', 'cough', 'rumour', 'rumor', 'story', 'gossip', 'drama', 'tradition', 'language', 'art', 'craft', 'skill', 'skills', 'habit', 'habits',
  'thread', 'post', 'posts', 'tweet', 'meme', 'memes', 'joke', 'tune', 'song', 'songs', 'album', 'franchise', 'series', 'scene', 'fandom', 'hobby',
  'love life', 'social life', 'sex life', 'sense', 'humour', 'humor', 'soul', 'heart', 'feelings', 'feeling', 'emotions', 'excitement', 'patience',
  'will', 'willpower', 'drive', 'focus', 'concentration', 'memory', 'imagination', 'sleep', 'diet', 'resolution', 'resolutions', 'cactus', 'aloe',
].map((w) => w.replace(/ /g, '\\s+')).join('|');
/** Small creatures and wild animals: a thing, never someone's pet unless the words say so ("our mouse", "my rat"). */
const WILD = `${BUGS}|pigeons?|seagulls?|gulls?|crows?|magpies?|sparrows?|robins?|blackbirds?|starlings?|fox|foxes|badgers?|hedgehogs?|squirrels?|moles?|voles?|shrews?|deer|toads?|jellyfish|crabs?|seals?|whales?|dolphins?|pheasants?|bats?|newts?|owls?|geese|goose|swans?|zombies?|monsters?|dragons?|enem(?:y|ies)|aliens?|orcs?|goblins?|creepers?|mobs?|bots?|npcs?|weeds?|germs|bacteria`;
const ONE_WHO = new RegExp(`^(?:${PERSON}|${PERSON_MORE}|${BARE})(?:s|es)?$`, 'u');
const ONE_PET = new RegExp(`^(?:${PET}|${PET_MORE})(?:s|es)?$`, 'u');
const ONE_THING = new RegExp(`^(?:${DEVICE}|${PLANT}|${QUIET_PLACE}|${THING_WORDS})$`, 'u');
const ONE_WILD = new RegExp(`^(?:${WILD})$`, 'u');
/** Plants that are also given names: capitalised, a name ("Ivy died", "our cat Poppy"). */
const NAME_PLANT = /^(?:Ivy|Rose|Lily|Daisy|Poppy|Holly|Violet|Iris|Jasmine|Heather|Willow|Hazel|Fern|Olive|Sage|Basil|Rosemary|Lavender|Bramble|Clover|Blossom|Bluebell|Primrose|Marigold|Tulip|Peach|Cherry|Maple|Rowan|Ash|Aspen|Juniper|Myrtle|Petal|Pepper|Ginger|Mint|Cinnamon|Saffron)$/u;
/** Animals that are pets and prey alike ("the cat killed the mouse"): someone's own only with "my", "our"… */
const PREY = /^(?:mouse|mice|rats?|birds?|fish|fishes|rabbits?|frogs?|snakes?|lizards?|chickens?|hens?|ducks?|bunn(?:y|ies))$/u;
/** The endings of words for ideas, never a given name ("Chivalry is dead", "Capitalism killed it", "Kindness died"). */
const NOT_A_NAME_END = /(?:ism|isms|ness|tion|tions|sion|ment|ments|ship|hood|dom|acy|ology|ics|alry|ture|ware|craft|ing)$/u;
/** Capitalised words that are not a given name. */
const NOT_A_NAME = /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|Christmas|Xmas|Easter|Halloween|Diwali|Eid|Hanukkah|Ramadan|Summer|Winter|Spring|Autumn|Fall|Twitter|Facebook|Instagram|TikTok|Tiktok|Netflix|Spotify|Snapchat|Discord|Reddit|Youtube|YouTube|Google|Apple|Samsung|Android|Iphone|Ipad|Xbox|Playstation|Nintendo|Switch|Steam|Fortnite|Minecraft|Roblox|Warzone|Pokemon|Zelda|Sims|God|Jesus|Lord|Allah|Christ|Satan|Covid|Corona|English|Maths|Math|Science|History|Geography|French|Spanish|German|Art|Music|Drama|Liverpool|Arsenal|Chelsea|Everton|United|City|Rovers|Spurs|England|Scotland|Wales|Ireland|Britain|France|Spain|Italy|Germany|America|London|Manchester|Birmingham|Leeds|Glasgow|Edinburgh|Cardiff|Belfast|Dublin|Brexit|Tesco|Asda|Aldi|Lidl|Primark|Amazon|Uber|Lol|Omg|Ok|Okay|Yeah|Yes|No|Oh|Ugh|Um|Hey|Hi|Hello|Well|So|And|But|Then|Now|Just|Really|Honestly|Basically|Literally|Apparently|Sadly|Today|Tonight|Yesterday|Tomorrow|Last|This|That|These|Those|The|A|An|My|Our|Your|His|Her|Their|Its|It|Some|All|Every|Each|Both|Half|Most|Many|Few|Everything|Nothing|Something|Anything|Everyone|Everybody|Nobody|Someone|Somebody|Anyone|Anybody|When|After|Before|Since|While|Because|If|As|Once|Until|Where|Why|How|What|Which|Who|Whose|Whom|Is|Was|Were|Are|Has|Had|Have|Do|Does|Did|Can|Could|Will|Would|Should|Might|May|Must|Not|Never|Still|Even|Only|Maybe|Perhaps|Also|Too|Very|So|Such|Here|There|Please|Sorry|Thanks|Thank|Dear|Happy|Sad|Poor|Little|Big|Old|New|First|Second|Third|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Part|Life|Time|Week|Year|Day|Night|Morning|Evening|Weekend|Month|Work|School|Uni|College|Home|Mum|Dad|Mom|Nan)$/u;

/** The little words between who died and the weak word ("has just", "is so", "was found", "went", "kind of"), skipped. */
const SKIP_BACK = new Set(('is was were are am be been being s re m isnt wasnt werent arent aint has had have ve d hasnt hadnt havent just sadly '
  + 'recently finally also both all then now already forever actually really truly basically literally completely totally kind sort of kinda sorta '
  + 'pretty so very practically nearly almost apparently probably definitely officially eventually went gone go goes going got get gets getting '
  + 'look looks looked seems seemed seem feel feels felt become became becomes to want wants wanted wanna gonna need needs needed hope hoping might '
  + 'may could would should will ll cant cannot wont didnt doesnt dont did does do never not still too ever even obviously clearly honestly properly '
  + 'fully partly mostly half well proper stone clinically quite bit a little rather ultimately tragically suddenly unexpectedly peacefully keep keeps '
  + 'kept keeping start starts started starting begin begins began beginning '
  + 'quietly slowly gradually instantly immediately sadly unfortunately allegedly reportedly supposedly technically pretty way like lowkey highkey '
  + 'officially legit legitimately properly fr deffo defo def surely certainly maybe perhaps possibly almost nearly long').split(' '));
/** Where a clause starts (a clause boundary as a word). */
const BOUNDARY = new Set(('and but so because cos coz cause then when whenever after before since until till til while although though if as once '
  + 'where unless or plus whereas wherever nor yet whether why how what whatever').split(' '));
/** Thinking, telling and feeling words: what follows them is a clause of its own ("I heard my uncle died", "Mum told me Gran died"). */
const SAYING = new Set(('think thought thinks thinking believe believed believes know knew knows knowing heard hear hears hearing said say says '
  + 'saying told tell tells telling realised realized realise realize realising realizing learned learnt learn learning guess guessed reckon reckoned '
  + 'apparently seems seemed turns turned means meant news wish wished wishing hope hoped worried worry scared afraid sure glad sad shocked sorry upset '
  + 'gutted devastated heartbroken angry annoyed mad crazy weird funny strange true possible unfair awful terrible horrible imagine imagined '
  + 'remember remembered forget forgot pretend pretended dreamt dreamed feel felt feels feeling like found discovered noticed saw see seen watch '
  + 'watched watching let letting made make makes').split(' '));
/** Words that hang a place, a part or a time on what comes before them ("the plant ON my desk"). */
const PREP = new Set(('of on in at from for with near behind under inside by about into around across outside beside over without than through '
  + 'off opposite next onto upon among amongst towards toward past beyond within along against between below above underneath during').split(' '));
const DET = new Set('the a an this that these those my our his her their your its some any every each no another whose'.split(' '));
const QUANT = new Set('one two three four five six seven eight nine ten eleven twelve twenty both all half most many several few none lots loads lot rest majority couple dozen hundreds thousands millions'.split(' '));
// ("hell", "shell": he'll and she'll with the apostrophe out, "scared he'll die")
const PRONOUN_WHO = new Set('he she him hes shes hed shed hell shell himself herself themselves themself'.split(' '));
const PRONOUN_THEY = new Set('they them theyre theyve theyd theyll'.split(' '));
const PRONOUN_IT = new Set('it its itll itd'.split(' '));
const PRONOUN_SELF = new Set('i im ive id ill me myself we us ourselves you youre youve youd youll yourself yourselves weve wed'.split(' '));
const SUBJECT_PRONOUN = new Set('i we you he she they'.split(' '));
const RELATIVE = new Set('who whom which that whos'.split(' '));
/** Times and fillers: never a noun a relative clause hangs on ("last NIGHT my dog died", "omg my dog died"). */
const TIME_FILLER = new Set(('yesterday today tonight tomorrow morning afternoon evening night nights week weeks weekend weekends year years month months '
  + 'day days ago monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october '
  + 'november december summer winter spring autumn christmas xmas easter birthday holiday holidays term half lol omg ugh um uh hey yeah yes no ok okay '
  + 'well oh wow honestly basically literally sadly anyway anyways also just like time times moment minute hour hours tbh ngl fr idk imo lmao '
  + 'lmfao rofl smh af rn atm btw x xx xxx ffs omfg jk tho though innit init').split(' '));
const FUNCTION = new Set([...SKIP_BACK, ...BOUNDARY, ...PREP, ...DET, ...RELATIVE, ...PRONOUN_WHO, ...PRONOUN_THEY, ...PRONOUN_IT, ...PRONOUN_SELF]);

/** The words of a sentence, case kept (`c`), lower case (`w`), where each starts, and whether a comma or a dash comes before it. */
function tokens(sentence) {
  const out = [];
  let last = 0;
  for (const m of sentence.matchAll(/[\p{L}\p{N}]+/gu)) {
    const gap = sentence.slice(last, m.index);
    out.push({ c: m[0], w: m[0].toLowerCase(), cut: /[,;:()"“”«»—–]/u.test(gap) });
    last = m.index + m[0].length;
  }
  return out;
}
/** A clause boundary between word k-1 and word k ("and", a comma, "when", "I heard"). */
// ("so" before a weak word or a little word is "very": "my motivation is SO dead")
const cutBefore = (ws, k) => k <= 0 || ws[k].cut || (BOUNDARY.has(ws[k - 1].w) && !(ws[k - 1].w === 'so' && (SKIP_BACK.has(ws[k].w) || WEAK_DIE.test(ws[k].w))))
  || (SAYING.has(ws[k - 1].w) && !/^(?:my|our|his|her|their|your|the|this|that|a|an|no)$/u.test(ws[k - 2]?.w || '')) // (never "my HOPE is dead")
  || (ws[k - 1].w === 'out' && /^(?:found|find|finds|finding)$/u.test(ws[k - 2]?.w || ''));
/** Lower-case words are names only as typed with a capital, never in a message written all in capitals. */
const shouting = (s) => { const L = s.match(/\p{L}/gu) || []; return L.length > 6 && L.filter((ch) => /\p{Lu}/u.test(ch)).length / L.length > 0.6; };

/**
 * What one word is, as the one who died: 'who' (a person or a pet), 'thing', 'self', 'unknown', or null (not a noun at all).
 * `k` its index in `ws`, `ctx` { ws, caps, all } (all: the whole message's words, for what "they" or "it" stands for).
 */
function kindOf(ws, k, ctx, { object = false } = {}) {
  const t = ws[k];
  if (!t) return null;
  const w = t.w, prev = ws[k - 1]?.w || '';
  if (PRONOUN_WHO.has(w)) return 'who';
  if (PRONOUN_SELF.has(w)) return object ? 'thing' : 'self';
  if (PRONOUN_THEY.has(w)) return theyAre(ctx, t);
  if (PRONOUN_IT.has(w)) return itIs(ctx, t);
  // "my little one", "a loved one", "the one I loved", "the one who…"
  if (w === 'one') {
    if (/^(?:little|loved|precious|special)$/u.test(prev)) return 'who';
    return /^(?:the|that)$/u.test(prev) && (RELATIVE.has(ws[k + 1]?.w) || SUBJECT_PRONOUN.has(ws[k + 1]?.w)) ? 'who' : 'unknown';
  }
  if (w === 'half' && prev === 'other') return 'who';
  if (w === 'love' && ws[k + 1]?.w === 'of' && ws[k + 3]?.w === 'life') return 'who';
  if (w === 'law' && prev === 'in') return 'who';
  // "my 3 year old", "our 6 month old" (a child)
  if (w === 'old' && /^(?:year|years|yr|yrs|month|months|week|weeks|day)$/u.test(prev)) return 'who';
  const named = !ctx.caps && /^\p{Lu}\p{Ll}+$/u.test(t.c) && !NOT_A_NAME.test(t.c) && !NOT_A_NAME_END.test(w);
  if (named && NAME_PLANT.test(t.c)) return 'who';
  if (ONE_WHO.test(w)) return 'who';
  // a pet: "my rabbit", "the dog", "Pepper the cat"; "a rabbit", "some fish" are any creature (asked, never gentle)
  if (ONE_PET.test(w)) {
    if (/^(?:a|an|some|another|any|two|three|several|loads|lots)$/u.test(prev)) return 'unknown';
    // (as the object of killed: "the cat killed the mouse" is prey; only "my mouse", "our rat" is someone's own)
    if (object && PREY.test(w) && !/^(?:my|our|his|her|their|your)$/u.test(prev)) return 'unknown';
    return 'who';
  }
  if (ONE_WILD.test(w)) return 'thing';
  if (ONE_THING.test(w)) return 'thing';
  if (FUNCTION.has(w) || TIME_FILLER.has(w)) return null;
  // a given name: capitalised as typed (at the start of a sentence too: "Pepper died", "Tom passed"), never a thing word
  if (named) return 'who';
  return 'unknown';
}
/** What "they" stands for: the nearest person or pet before it, else the nearest plural thing, else people. */
function theyAre(ctx, t) {
  const all = ctx.all, at = all.indexOf(t);
  for (let j = (at < 0 ? all.length : at) - 1; j >= 0; j--) {
    const w = all[j].w;
    if (FUNCTION.has(w) || TIME_FILLER.has(w)) continue;
    if (ONE_WHO.test(w) || (ONE_PET.test(w) && !/^(?:a|an|some)$/u.test(all[j - 1]?.w || ''))) return 'who';
    // a plural noun is what they are ("my tomatoes… they died"); a singular one is passed ("a car crash and they both died")
    if (/s$/u.test(w) && !/ss$/u.test(w)) return ONE_THING.test(w) || ONE_WILD.test(w) ? 'thing' : 'unknown';
  }
  return 'who';
}
/** What "it" stands for: the nearest pet or thing before it ("we had a hamster and it died"); else nothing anyone named. */
function itIs(ctx, t) {
  const all = ctx.all, at = all.indexOf(t);
  for (let j = (at < 0 ? all.length : at) - 1; j >= 0; j--) {
    const w = all[j].w;
    if (FUNCTION.has(w) || TIME_FILLER.has(w)) continue;
    if (ONE_PET.test(w)) return 'who';
    if (ONE_THING.test(w) || ONE_WILD.test(w)) return 'thing';
  }
  return 'unknown';
}
/** The best of several readings: someone beats unknown beats self beats a thing. */
const RANK = { who: 4, unknown: 3, self: 2, thing: 1 };
const best = (a, b) => ((RANK[b] || 0) > (RANK[a] || 0) ? b : a);

/**
 * The noun phrase that ends at word `j` (walking back): its head is word `j`, and it starts at its determiner ("my best
 * friends dad", "the plant", "half my family"). → { head: j, start }
 */
function phraseBack(ws, j, stop) {
  let s = j;
  for (let k = j - 1; k >= Math.max(stop, j - 5); k--) {
    const w = ws[k].w;
    // (never across a comma, a dash or a clause boundary)
    if (ws[k + 1].cut || BOUNDARY.has(w)) break;
    if (DET.has(w) || QUANT.has(w)) { s = k; if (DET.has(w)) { if (QUANT.has(ws[k - 1]?.w || '') && k - 1 >= stop) s = k - 1; break; } continue; }
    if (FUNCTION.has(w) || TIME_FILLER.has(w) || /ly$/u.test(w)) break;
    s = k;
  }
  return { head: j, start: s };
}
/** Where someone is, not what they are ("in the icu", "on the ward", "at home"). */
const LOCATIVE = /^(?:in|on|at|inside|near|under|behind|beside|outside|into|onto|across|around|through|next|opposite|upstairs|downstairs|by)$/u;
/** What leaves someone dead, just before the word ("my brother was SHOT dead", "FOUND dead", "DROPPED dead"). */
const RESULT = /^(?:brain|clinically|shot|found|struck|left|beaten|fell|fall|falls|drop|drops|dropped|pronounced|declared|presumed|feared|confirmed|stabbed|gunned|knocked|kicked|battered|bludgeoned|strangled|crushed|starved|frozen|burned|burnt|electrocuted|poisoned|mauled)$/u;
/** The determiners that make the weak word a noun ("the dead", "a murder", "his dying"; never "its dead", "it's dead"). */
const NOUN_DET = /^(?:the|a|an|his|her|their|my|our|your|some|any|every|each|another)$/u;
/**
 * Who died, as the subject of the weak word at `i`: walk back over the little words; past what hangs after the subject (a
 * place, a part, a gerund: "the plant on my desk", "my hopes of getting into the team"); to the one a relative clause hangs on
 * ("the coach who taught me", "the man I married", "the tree my grandad planted"). An empty clause ("…and died", ", died")
 * takes the subject of the clause before it ("Grandad got ill and died"), past a ", who …," aside.
 */
function subjectOf(ws, i, ctx) {
  let from = i;
  while (from > 0 && !cutBefore(ws, from)) from--;
  // a relative clause in the subject: the one it hangs on ("the coach who taught me to swim died", "my cat that I had died")
  for (let k = from + 1; k < i; k++) {
    if (!RELATIVE.has(ws[k].w) || cutBefore(ws, k)) continue;
    const prev = ws[k - 1].w;
    if (FUNCTION.has(prev) || TIME_FILLER.has(prev)) continue;
    const head = headBack(ws, k - 1, from, ctx);
    if (head == null) continue;
    const kind = kindOf(ws, head, ctx);
    return ws[k].w === 'who' || ws[k].w === 'whom' || ws[k].w === 'whos' ? best(kind, 'who') : kind;
  }
  // a relative clause without "who" or "that": "the bird WE HAD for ten years died", "the man I married died"
  for (let k = from + 1; k < i; k++) {
    if (!SUBJECT_PRONOUN.has(ws[k].w) || cutBefore(ws, k)) continue;
    const prev = ws[k - 1].w;
    if (FUNCTION.has(prev) || TIME_FILLER.has(prev) || /ly$/u.test(prev) || SAYING.has(prev)) continue;
    const head = headBack(ws, k - 1, from, ctx);
    if (head != null) return kindOf(ws, head, ctx) || 'unknown';
  }
  let j = i - 1;
  // (and what makes someone dead: "shot dead", "found dead", "dropped dead", "brain dead"; never a noun after "my": "my HOPE is dead")
  while (j >= from && (SKIP_BACK.has(ws[j].w) && !(j - 1 >= from && /^(?:my|our|his|her|their|your|the|this|that|a|an)$/u.test(ws[j - 1].w))
    || ws[i].w === 'dead' && j === i - 1 && RESULT.test(ws[j].w))) j--;
  // "the dead", "a murder", "his dying": the word is a noun (what follows "of" says who: "the murder of my brother")
  if (j >= from && NOUN_DET.test(ws[j].w) && j === i - 1) {
    if (/^(?:his|her|their)$/u.test(ws[j].w)) return 'who';
    if (ws[i + 1]?.w === 'of') return objectOf(ws, i + 1, ctx) || 'unknown';
    return ws[i].w === 'dead' || ws[i].w === 'dying' ? 'who' : 'unknown';
  }
  if (j < from) return (from === 0 ? laterSubject(ws, i, ctx) : null) ?? earlierSubject(ws, from, ctx);
  if (ws[j].w === 'whose') return 'unknown';
  // "dying", "dead", "die" right after a noun phrase, with no "is" or "has" between: that one ("I'm not over MY MUM dying",
  // "watched MY DAD die", "found HIM dead"), never the noun a place hangs on before it
  // (unless that noun is a place it hangs on: "my sister is IN THE ICU dying" is my sister)
  if (/^(?:dying|dyin|dieing|dead|die)$/u.test(ws[i].w) && ws.slice(j + 1, i).every((t) => t.w === 'to' || RESULT.test(t.w))
    && !LOCATIVE.test(ws[phraseBack(ws, j, from).start - 1]?.w || '')) {
    const near = kindOf(ws, j, ctx);
    if (near) return near;
  }
  const head = headBack(ws, j, from, ctx);
  return head == null ? earlierSubject(ws, from, ctx) : kindOf(ws, head, ctx);
}
/** The head noun of the subject that ends at word `j` (see subjectOf), or null when there is none. */
function headBack(ws, j, from, ctx, depth = 0) {
  if (j < from || depth > 4) return null;
  const w = ws[j].w;
  const noun = SKIP_BACK.has(w) && /^(?:my|our|his|her|their|your|the|this|that|a|an)$/u.test(ws[j - 1]?.w || ''); // ("my HOPE")
  if (FUNCTION.has(w) && !noun && !PRONOUN_WHO.has(w) && !PRONOUN_SELF.has(w) && !PRONOUN_THEY.has(w) && !PRONOUN_IT.has(w)) return null;
  const { start } = phraseBack(ws, j, from);
  // (a time is never who died, but a place may hang on it: "a boy IN MY YEAR died")
  if (TIME_FILLER.has(w)) return PREP.has(ws[start - 1]?.w || '') && start - 1 > from ? headBack(ws, start - 2, from, ctx, depth + 1) : null;
  const before = ws[start - 1]?.w;
  if (start - 1 < from || before == null) return j;
  // a place or a part hangs on the noun before it ("the plant ON my desk", "my friendship WITH Sarah"), and so may a gerund
  // ("my hopes OF GETTING into the team"); "two of my friends", "one of our dogs" are the friends and the dogs
  let p = start - 1;
  // (a gerund between: "my dreams of BEING a dancer", "my hopes of GETTING into the team")
  // (never a noun that ends in -ing: "on top of EVERYTHING my grandad died", "at the MEETING")
  if (/ing$/u.test(ws[p].w) && (SKIP_BACK.has(ws[p].w) || kindOf(ws, p, ctx) === 'unknown') && p - 1 >= from && PREP.has(ws[p - 1].w)) p--;
  if (PREP.has(ws[p].w)) {
    if (ws[p].w === 'of' && QUANT.has(ws[p - 1]?.w || '')) return j;
    // (a place said of the subject: "my sister IS in the icu dying", "my dad is STILL in hospital dying")
    let q = p - 1;
    while (q >= from && SKIP_BACK.has(ws[q].w) && !PREP.has(ws[q].w)) q--;
    const h = headBack(ws, q, from, ctx, depth + 1);
    return h == null ? j : h;
  }
  // a reduced relative clause: "the man I married died" (a subject pronoun after a noun), "the tree my grandad planted"
  // (a noun phrase after a noun phrase), never a time or a filler before it ("last night my dog died", "omg my dog died")
  if (SUBJECT_PRONOUN.has(w) || SUBJECT_PRONOUN.has(before)) {
    const at = SUBJECT_PRONOUN.has(w) ? j : start - 1;
    if (at - 1 >= from && !FUNCTION.has(ws[at - 1].w) && !TIME_FILLER.has(ws[at - 1].w) && !/ly$/u.test(ws[at - 1].w)) {
      const h = headBack(ws, at - 1, from, ctx, depth + 1);
      if (h != null) return h;
    }
    return j;
  }
  if (!FUNCTION.has(before) && !TIME_FILLER.has(before) && !/ly$/u.test(before) && DET.has(ws[start].w)) {
    const { start: s2 } = phraseBack(ws, start - 1, from);
    if (DET.has(ws[s2].w) && !PREP.has(ws[s2 - 1]?.w || '')) return headBack(ws, start - 1, from, ctx, depth + 1) ?? j;
  }
  return j;
}
/** "Grandad got ill and died": the subject of the clause before (its first noun phrase), past a ", who …," aside. */
function earlierSubject(ws, from, ctx) {
  let end = from, guard = 0;
  while (end > 0 && guard++ < 4) {
    let s = end - 1;
    while (s > 0 && !cutBefore(ws, s)) s--;
    // an aside that is a relative clause (", who used to bring us cakes,"), a time ("last year,") or an age ("my son, 19, died")
    if (/^(?:who|whom|which|whose)$/u.test(ws[s].w) || TIME_FILLER.has(ws[s].w) && end - s <= 3
      || ws.slice(s, end).every((t) => /^(?:\d+|aged?|years?|old|yrs?|months?)$/u.test(t.w))) { end = s; continue; }
    const kind = firstNoun(ws, s, end, ctx);
    // (an aside that says what they were: "Max, our old lab, died": the name before it)
    if ((kind == null || kind === 'unknown') && s > 0 && ws[s].cut) { const before = earlierSubject(ws, s, ctx); return best(kind, before); }
    return kind;
  }
  return null;
}
/** "killed in a crash, my cousin": the subject said after the clause (the first noun phrase after the next comma). */
function laterSubject(ws, i, ctx) {
  let s = i + 1;
  while (s < ws.length && !ws[s].cut) s++;
  if (s >= ws.length) return null;
  let end = s + 1;
  while (end < ws.length && !cutBefore(ws, end)) end++;
  return firstNoun(ws, s, end, ctx);
}
/** The first noun phrase in words s..end-1: what it is (a person, a pet, a thing…), or null. */
function firstNoun(ws, s, end, ctx) {
  for (let k = s; k < end; k++) {
    const w = ws[k].w;
    if (SKIP_BACK.has(w) || TIME_FILLER.has(w) || BOUNDARY.has(w) || /ly$/u.test(w)) continue;
    // (a place or a time first: "in March my grandad…", "at the vets our dog…")
    if (PREP.has(w)) { k++; while (k < end && (DET.has(ws[k].w) || !FUNCTION.has(ws[k].w)) && !SKIP_BACK.has(ws[k].w)) k++; k--; continue; }
    if (DET.has(w) || QUANT.has(w)) {
      // the first noun of the phrase that is a person, a pet or a thing, else its last word ("my sourdough starter")
      let last = null;
      for (let m = k + 1; m < Math.min(end, k + 5) && !FUNCTION.has(ws[m].w) && !TIME_FILLER.has(ws[m].w); m++) {
        const kind = kindOf(ws, m, ctx);
        // ("my dads phone": the owner's word is not the head)
        if (kind && kind !== 'unknown' && !(/s$/u.test(ws[m].w) && m + 1 < end && !FUNCTION.has(ws[m + 1].w))) return kind;
        last = m;
      }
      return last == null ? null : kindOf(ws, last, ctx);
    }
    return kindOf(ws, k, ctx);
  }
  return null;
}
/** Who died, as the object of killed / murdered / buried / drowned (from word `i`, the verb): null when no object follows. */
function objectOf(ws, i, ctx) {
  let k = i + 1;
  while (k < ws.length && !cutBefore(ws, k) && /^(?:just|finally|accidentally|nearly|almost|basically|literally|actually|really|totally|off|both|all)$/u.test(ws[k].w)) k++;
  if (k >= ws.length || cutBefore(ws, k) && !(ws[i].w === 'of')) return null;
  const w = ws[k].w;
  if (PREP.has(w) && ws[i].w !== 'of') return null;
  if (TIME_FILLER.has(w) || SKIP_BACK.has(w) && !DET.has(w)) return null;
  if (PRONOUN_WHO.has(w) || PRONOUN_SELF.has(w) || PRONOUN_THEY.has(w) || PRONOUN_IT.has(w)) return kindOf(ws, k, ctx, { object: true });
  // the noun phrase that follows: its head is its last noun ("my best friends dog"), "two of my friends" the friends
  let end = k;
  if (DET.has(w) || QUANT.has(w)) {
    let m = k + 1;
    while (m < ws.length && !cutBefore(ws, m) && (DET.has(ws[m].w) || QUANT.has(ws[m].w) || ws[m].w === 'of' && QUANT.has(ws[m - 1].w))) m++;
    end = m;
  }
  let head = end;
  for (let m = end; m < Math.min(ws.length, end + 4) && !cutBefore(ws, m) || m === end; m++) {
    if (FUNCTION.has(ws[m]?.w) || TIME_FILLER.has(ws[m]?.w) || !ws[m]) break;
    head = m;
  }
  // (a time or a little word is never what was killed or buried: "buried a week ago", "knocked down and killed and nobody cares")
  if (!ws[head] || FUNCTION.has(ws[head].w) || TIME_FILLER.has(ws[head].w) || /^(?:week|day|month|year)s?$/u.test(ws[head].w)) return null;
  return kindOf(ws, head, ctx, { object: true }) || 'unknown';
}
/** The noun after "dead" or "dying" used before one ("my dead dog", "the dying plant"), or null. */
function nounAfter(ws, i, ctx) {
  const n = ws[i + 1];
  if (!n || cutBefore(ws, i + 1) || FUNCTION.has(n.w) || TIME_FILLER.has(n.w) || /ly$/u.test(n.w)) return null;
  const prev = ws[i - 1]?.w || '';
  if (prev && !DET.has(prev) && !QUANT.has(prev) && !PREP.has(prev) && !cutBefore(ws, i) && !/^(?:little|poor|old|sweet|beautiful|lovely)$/u.test(prev)) return null;
  let head = i + 1;
  while (head + 1 < ws.length && !cutBefore(ws, head + 1) && !FUNCTION.has(ws[head + 1].w) && !TIME_FILLER.has(ws[head + 1].w) && head < i + 3) head++;
  return kindOf(ws, head, ctx) || 'unknown';
}
/**
 * "dead" as a word for "very" ("he's dead weird", "she's dead lush", "it was dead quiet"): after "is" / "was" / "so", one word that
 * is no noun anyone named and no time, then the end of the clause (never "he's dead now", "my dad is dead, sadly").
 */
function intensifier(ws, i, ctx) {
  if (!/^(?:is|was|s|are|were|re|im|hes|shes|its|theyre|youre|thats|so|well|proper|be|been|looks|looked|seems|seemed|sounds|sounded)$/u.test(ws[i - 1]?.w || '')) return false;
  const n = ws[i + 1];
  if (!n || cutBefore(ws, i + 1) || FUNCTION.has(n.w) || TIME_FILLER.has(n.w) || /ly$/u.test(n.w) || /^\p{Lu}/u.test(n.c)) return false;
  if (kindOf(ws, i + 1, ctx) !== 'unknown') return false;
  const after = ws[i + 2];
  return !after || cutBefore(ws, i + 2) || PREP.has(after.w) || /^(?:and|but|so|tbh|lol|honestly|though|tho|man|mate|innit|right|today|tonight|rn)$/u.test(after.w);
}
/** A cemetery or a graveyard: someone visited or lying there is a death ('who'); someone else beside it is unsure; else a place. */
const VISIT = /^(?:visit|visits|visited|visiting|see|sees|seeing|saw|seen|flowers|talk|talked|talking|speak|spoke|speaking|chat|chatted|told|tell|where)$/u;
const LIES = /^(?:is|s|lies|lie|lying|rests|resting|laid|buried|was)$/u;
function cemetery(ws, i, ctx) {
  // (no one named: a place, unless they were there themselves, "I cried at the cemetery": unsure, asked)
  let out = ws.some((t) => /^(?:i|im|ive|id|me|we|us)$/u.test(t.w)) ? 'unknown' : 'thing';
  for (let k = 0; k < ws.length; k++) {
    if (k === i) continue;
    const kind = kindOf(ws, k, ctx);
    if (kind !== 'who' || PRONOUN_SELF.has(ws[k].w)) continue;
    const back = ws.slice(Math.max(0, k - 3), k).map((t) => t.w);
    if (back.some((w) => VISIT.test(w)) || LIES.test(ws[k + 1]?.w || '')) return 'who';
    out = 'unknown';
  }
  return out;
}
/**
 * (final round 3) The weak death words in `cased` (normed with norm(), idioms blanked, case kept), read by who died: 'who' (a
 * person or a pet), 'unknown', 'self', 'thing', or null when there is no weak word. `which`: 'loss' (died, dead, killed…) or
 * 'grief' (buried, a cemetery). The best reading wins: a person in any clause makes it a death.
 */
export function whoDied(cased, which = 'loss') {
  const text = String(cased ?? '');
  const caps = shouting(text);
  const all = [];
  const sentences = text.split(/[.!?…\n]+/u).map((s) => { const ws = tokens(s); all.push(...ws); return ws; });
  let out = null;
  for (const ws of sentences) {
    const ctx = { ws, caps, all };
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i].w;
      let kind = null;
      if (which === 'loss' && w === 'dead' && intensifier(ws, i, ctx)) continue;
      if (which === 'loss' && WEAK_DIE.test(w)) {
        kind = (w === 'dead' || w === 'dying') ? (nounAfter(ws, i, ctx) ?? subjectOf(ws, i, ctx)) : subjectOf(ws, i, ctx);
      } else if ((which === 'loss' && WEAK_KILL.test(w)) || (which === 'grief' && WEAK_BURY.test(w))) {
        const prev = ws.slice(Math.max(0, i - 3), i).map((t) => t.w).filter((x) => !/^(?:just|sadly|tragically|brutally|nearly|almost|also|then|finally|already)$/u.test(x));
        // (passive only with a past participle: "my uncle WAS KILLED", "grandad IS BURIED"; never "we ARE BURYING my uncle")
        const passive = /(?:ed|d)$/u.test(w) && /^(?:was|were|be|been|being|is|s|are|re|got|get|gets|getting|isnt|wasnt|werent)$/u.test(prev[prev.length - 1] || '');
        kind = passive ? subjectOf(ws, i, ctx) : (objectOf(ws, i, ctx) ?? subjectOf(ws, i, ctx));
      } else if (which === 'grief' && WEAK_PLACE.test(w)) {
        kind = cemetery(ws, i, ctx);
      } else continue;
      out = best(out, kind || 'unknown');
    }
  }
  return out;
}
