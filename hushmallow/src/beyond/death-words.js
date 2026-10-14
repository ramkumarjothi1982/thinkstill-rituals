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
