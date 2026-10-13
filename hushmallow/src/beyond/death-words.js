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
// Recall first: these lists are wide on purpose, and the idioms are only the unambiguous, cheap ones. A game,
// a film, a near miss or an imagined death is never set aside here: the gentle path is safe for all of them.
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

/** Gadgets and things that "die" or are "dead" without anyone dying (a pet mouse is never one of them). */
const DEVICE = 'baby\\s+monitors?|phones?|mobiles?|iphones?|androids?|laptops?|batter(?:y|ies)|cars?|chargers?|consoles?|controllers?|headphones|earbuds|airpods|ipads?|tablets?|computers?|pcs?|tvs?|telly|tellies|torch(?:es)?|remotes?|kindle|xbox|playstation|ps\\d|switch|router|wifi|internet|engines?|keyboards?|screens?|watch|fitbit|cameras?|speakers?|alarms?|clocks?|printers?|fridges?|freezers?|kettles?|toasters?|microwaves?|bulbs?|lights?|lamps?|signal|connection|servers?|apps?|games?|vapes?|ereaders?|smartwatch|monitor|hoover|vacuum|boiler|heating|fan|radio';
/** Little words between a gadget and "died" ("my phone has just died", "my laptop is dead"): never a person's words. */
const DEV_AUX = '(?:(?:is|was|has|had|s|just|completely|totally|finally|already|literally|now)\\s+){0,2}';
/**
 * The gadget as the subject, at the start of a clause ("my phone died", "and then the battery died", "Phone died."):
 * one owner's word at most before it ("my mums car"), never a preposition or a person ("the guy in the car died",
 * "the driver of the car died" are deaths).
 */
const CLAUSE_START = '(?:^|[.!?;,:]\\s*|\\b(?:and|but|so|then|because|cos|coz|now|when|after|before|until|as|since|while|if|think|guess|reckon|that|plus|also|again|just|ugh|lol|omg)\\s+)';
// (a gadget's part right after it, "phone battery died", is still the gadget: review r9)
const DEV_SUBJ = `${CLAUSE_START}(?:(?:my|our|his|her|their|your|the|this|that|its)\\s+(?:(?!(?:${'guy|man|woman|lady|driver|person|boy|girl|kid|child|baby|someone|somebody|passenger|people|family|friend|mum|dad|mom|brother|sister|son|daughter|husband|wife|nan|grandad|grandma|dog|cat|in|on|of|at|with|by|from|inside|behind|under'})\\b)[a-z]+\\s+){0,2})?(?:${DEVICE})(?:\\s+(?:${DEVICE}))?`;

/**
 * The ordinary idioms: unambiguous, cheap, and never a person. Blanked before any death or harm word is read.
 * (The 'lost' + thing idioms matter to the backstop: deathTalk only reads 'lost' beside a person or a pet.)
 */
export const ORDINARY = [
  // a gadget that died, a dead battery
  new RegExp(`${DEV_SUBJ}\\s+${DEV_AUX}(?:die|dies|died|dying|dead|deaded|dyin)\\b`, 'giu'),
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
  /\bburied\s+(?:in|under)\s+(?:work|paperwork|emails?|homework|snow|sand|blankets?|duvets?|laundry|washing|deadlines|admin|assignments|notifications|messages|marking)\b/giu,
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
];

/** `t` (normed) with every ordinary idiom blanked out (a space each, so nothing joins across it). */
export function blankOrdinary(t) {
  let out = String(t ?? '');
  for (const re of ORDINARY) out = out.replace(re, ' ');
  return out;
}
