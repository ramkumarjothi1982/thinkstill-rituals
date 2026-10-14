// Safety lexicon shared by every path that reads free text: the Hushfold's
// free input overlay, the classic express screen, Another Angle (hushmallow
// Beyond) and, as a copy, the Another Angle server's pre-check.
//
// Plain data (regular-expression sources as strings), no imports, so it can be
// copied verbatim into the server bundle. src/ultra/frameworks.js re-exports
// HARM_LEXICON and HARM_COPY from here; src/engine/safety.js compiles them.
//
// Patterns are matched case-insensitively against tidied text, after
// `idiomGuards` spans have been blanked out (so "this deadline is killing me"
// never trips). Judgement: we lean towards caution. A care message shown by
// mistake is a small cost; missing someone in danger is not.

const R = String.raw;

// People someone might be worried about (third-person patterns; not phones, plants or pets).
const PEOPLE = R`(?:she|he|they|someone|somebody|my (?:best |close |little |big |younger |older )?(?:friend|mate|bestie|partner|boyfriend|girlfriend|husband|wife|ex|bf|gf|mum|mom|mam|dad|mother|father|parent|sister|brother|sibling|son|daughter|child|kid|cousin|niece|nephew|aunt|auntie|uncle|nan|gran|grandma|grandad|flatmate|housemate|roommate|classmate|colleague|student))`;
// People who might be hurting the person (care patterns).
const HURTER = R`(?:he|she|they|someone|somebody|my (?:partner|boyfriend|girlfriend|husband|wife|ex|dad|father|mum|mom|mother|stepdad|step-dad|stepmum|stepmom|step-mum|brother|sister|uncle|aunt|auntie|grandad|grandma|cousin|boss|teacher|coach|flatmate|roommate|carer|son|daughter))`;
// 'living' as in 'living in London' is not being alive.
const LIVING = R`living\b(?! (?:in|with|here|there|near|at|on|together|abroad|alone|by|next|apart|off|a|an|the|my|our)\b)`;
// (14 Oct 2026, lexicon gaps; the default flipped in round 3) After 'beat me' ('beats me', 'has beaten me'): the positive
// evidence of a game, a contest or a race. Without it, 'beat me' is a blow, whatever follows ('in the shower', 'in my sleep',
// 'in public', 'on the way home', 'at the party', 'at the weekend', 'at the slightest thing', 'on purpose', 'twice in one
// night', 'to the point where', 'to a pulp', 'to death', 'to tears', 'with a belt'). The evidence: at / in + a game, a sport
// or a contest ('at chess', 'at fifa', 'at cards', 'at pool', 'at everything', 'at arm wrestling', 'at rock paper scissors',
// 'at a game of darts', 'in the final', 'in a race', 'in the pub quiz', 'in the exam results', 'in straight sets'; never
// 'in the pool', 'at the football', 'at football practice'); a race to somewhere ('to it', 'to the punch', 'to the bus stop',
// 'to the car', 'to the bathroom', 'to the last slice', 'to school', 'to work', 'to bed', 'home'); 'on points', 'on
// penalties', 'on the leaderboard', 'on aggregate'; 'by two goals', 'by a second', 'by miles'; 'fair and square', 'hands
// down', 'with ease', 'with a better score'; a score ('6-2', never '2-3 times a week'); 'every time we play'.
const GAME_PRE = R`(?: (?:again|there|back|easily|so easily|badly|so badly|twice|\w+ times|comfortably|narrowly|once|just|only|finally|yet again|again and again|every (?:single )?time|all the time|today|yesterday|last (?:night|week|time)|this (?:morning|afternoon|evening|time|week)|at last|in the end))*`;
// a word that describes the game or the contest ('pub' quiz, 'egg and spoon' race), never a determiner, a preposition or a person
const GAME_MOD = R`(?!(?:the|a|an|my|our|his|her|their|your|this|that|these|those|every|each|another|after|before|during|at|on|in|into|of|with|from|when|while|because|but|then|so|to|for|by|near|outside|inside|behind|under|over|until|till|i|he|she|they|we|you|me|him|them|us)\b)[\w'-]+`;
const GAME_ACT = R`(?:chess|draughts|checkers|fifa|fortnite|minecraft|roblox|call of duty|cod|mario kart|mario party|smash bros|tekken|street fighter|rocket league|cards|poker|blackjack|snap|uno|rummy|bridge|cribbage|pool|snooker|billiards|darts|bowling|golf|mini golf|crazy golf|tennis|table tennis|ping pong|badminton|squash|football|soccer|rugby|cricket|basketball|netball|hockey|volleyball|baseball|softball|dodgeball|rounders|swimming|running|cycling|athletics|sprinting|racing|karting|go-?karting|skiing|climbing|boxing|wrestling|arm wrestling|thumb wrestling|fencing|judo|karate|scrabble|monopoly|cluedo|connect (?:four|4)|jenga|trivial pursuit|trivia|sudoku|wordle|crosswords?|quizz?es|quiz|rock,? paper,? scissors|(?:video |board |computer |online |card |word |arcade )?games?|races?|sports?|everything|anything|most things|maths|math|spelling|exams?|tests?)`;
const GAME_CONTEST = R`(?:races?|finals?|semi-?finals?|quarter-?finals?|semis|quizz?es|quiz|exams?|exam results|tests?|results|votes?|elections?|polls?|competitions?|contests?|tournaments?|league table|league|cup|match(?:es)?|games?|rounds?|heats|sprint|marathon|relay|leaderboard|rankings|standings|scores?|grades|marks|sets?|frames?|play-?offs?|tie-?break(?:er)?|shoot-?out|spelling bee|sports day|egg and spoon race|\d+ ?(?:m|metres|meters|k|km|yards|miles?)|mocks|olympics|time trial|qualifiers?|championships?|grand prix)`;
// ...where a game word names a place or a time instead ('at football practice', 'at darts night', 'in the games room')
const GAME_PLACE = R`(?! (?:practice|training|club|ground|pitch|stadium|camp|session|lessons?|class(?:es)?|hall|court|centre|center|park|party|night|alley|room|rooms|arcade|area|shop|store|lounge|bar|venue|changing|toilets?|car park|course|track|car|pool|gym|ring)\b)`;
const BEAT_GAME = R`${GAME_PRE} (?:at (?:${GAME_MOD} )?${GAME_ACT}\b${GAME_PLACE}|at (?:a|every|each|any|another|our|one|the (?:last|first|next|final)) (?:${GAME_MOD} )?(?:game|round|match|set|frame|hand|race|bout|leg|contest|competition|quiz|tournament)s?\b${GAME_PLACE}|at the (?:race|final|finals|quiz|exam results|results|vote|election|polls)\b${GAME_PLACE}|in (?:${GAME_MOD} )?${GAME_ACT}\b${GAME_PLACE}|in (?:(?:the|a|an|my|our|his|her|their|this|that|every|each|another|one|two|three|\d+|today's|tonight's|yesterday's|last night's|this year's|last year's) )?(?:${GAME_MOD} )?${GAME_CONTEST}\b${GAME_PLACE}|to (?:it|the punch|first place|school|work|bed|class|lunch|dinner|breakfast|town|church|the (?:bus stop|bus|train|car|bathroom|loo|toilet|front|top|finish(?: line)?|line|door|shower|seat|post|answer|draw|chase|queue|till|checkout|remote|telly|tv|sofa|couch|lift|ball|buzzer|phone|prize|title|trophy|medal|gold|job|promotion|top spot|spot|parking (?:space|spot)|space|exit|gate|last one|good seat|window seat|front seat)|the (?:last|first|next|only|best|nearest|biggest|good|window|front|top) [\w'-]+)\b|(?:back )?home\b|on (?:points|penalties|pens|the leaderboard|aggregate|goal difference|count-?back|away goals|the scoreboard|(?:the )?(?:final|last) (?:lap|hole|question|round|bend|corner|leg)|the buzzer|the line|(?:a|the) tie-?break(?:er)?|a photo finish)\b|(?:fair and square|hands down|with ease|convincingly|without (?:even )?trying)\b|with (?:(?:a|an|the|his|her|their|that|this|one|my|some|just|only) )?(?:(?:perfect|better|higher|faster|quicker|winning|final|late|last-minute|lucky|great|brilliant|clever|single|massive|record|top|high|personal best|new|cheeky|sneaky|killer|amazing|much better|far better) )*(?:score|scores|goals?|moves?|points?|checkmate|full house|flush|royal flush|try|header|penalty|three-pointer|serve|ace|putt|birdie|eagle|strategy|bluff|combo|answers?|time)\b|\d+ ?[-–] ?\d+\b(?! ?(?:times|x\b|days?|nights?|weeks?|hours?|mins?|minutes?|years?|months?|o'?clock|am\b|pm\b))|(?:every time|each time|whenever|when|if|any ?time) (?:we|i) (?:play|played|race|raced|compete|competed|go head to head|have a (?:game|race|match))\b|by (?:(?:(?:a|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|fifty|a hundred|a few|a couple of|half a|\d+(?:\.\d+)?) )?(?:points?|goals?|seconds?|secs?|minutes?|mins?|shots?|strokes?|frames?|sets?|games?|votes?|marks?|percent|runs?|wickets?|laps?|lengths?|metres|meters|yards|miles?|inches|tries|baskets|holes)|a lot|a long way|a landslide|a whisker|a hair|a nose|a head|a neck|a fraction|a mile|miles|a country mile|an inch)\b)`;
// Whoever might be beating the person: HURTER, more of the family, and people named by a determiner ('my uncle', 'the
// older boys', 'a man', 'two lads', 'my mum's boyfriend', 'the kids at school'); never 'it', 'this game' or 'the boss'.
const BEATER_NOUN = R`(?:partner|boyfriend|girlfriend|husband|wife|ex|ex-?(?:partner|boyfriend|girlfriend|husband|wife)|fianc[eé]e?|dad|daddy|father|mum|mummy|mom|mommy|mam|mother|parents|step-?(?:dad|father|mum|mom|mother|brother|sister|parent)s?|foster (?:dad|mum|mom|father|mother|parents|carer)|brothers?|sisters?|uncles?|aunts?|aunties?|grandad|granddad|grandpa|grandfather|grandma|grandmother|nan|nana|gran|granny|cousins?|nephew|sons?|daughters?|teachers?|headteacher|coach|tutor|carers?|flatmates?|housemates?|roommates?|neighbou?rs?|landlord|friends?|mates?|classmates?|boys|girls|lads|kids|men|guys|bullies|bully|gang|man|woman|women|guy|boy|girl|lad|kid|strangers?|police|policeman|police ?officers?|officers?|cops?|guards?|bouncers?|soldiers?|priest|babysitter|nanny|people|students|pupils|year \d+s)`;
const BEATER = R`(?:${HURTER}|people|(?:my|our|his|her|their|the|some|these|those|two|three|four|five|a few|a couple of|a (?:gang|group|bunch) of|a|an|this|that|[a-z]+'s)(?: (?:older|old|big|bigger|younger|little|new|other|same|local|drunk|year \d+|\w+-year-old|\d+ year old))? ${BEATER_NOUN})(?: (?:at|from|in|on) (?:my |the |our )?[\w']+)?`;
// Someone else not breathing, now (crisisOther): a person, a relative named without 'my' ('dad isn't breathing', "mum's not
// breathing"), a baby, a stranger where they are ('the old man on the floor', 'the man next to me'), 'it' (a baby).
const RELATIVE = R`(?:dad|daddy|mum|mummy|mom|mommy|mam|mammy|mama|papa|nan|nana|nanna|gran|granny|grandma|grandad|granddad|grandpa|grandmother|grandfather|baby)`;
const BREATHER = R`(?:${PEOPLE}|it|${RELATIVE}|(?:my|our|the|this|that|a|an) (?:[\w'-]+ )?(?:baby|newborn|toddler|infant|man|woman|boy|girl|guy|lady|person|kid|child|stranger|[\w-]+[- ]old)|my (?:grandpa|granddad|granny|nana|nanna|grandmother|grandfather|stepdad|step-dad|stepmum|stepmom|fianc[eé]e?|mummy|daddy))(?: (?:next to|beside|near|behind|opposite|outside|across from|on|in|at) (?:me|us|(?:the|my|our|a|this) \w+(?: \w+)?))?`;
// ...never an idiom after 'breathing' ('a word', 'a single word', 'easy', 'down my neck', 'through his nose', 'on my food')
const BREATH_IDIOM = R`(?! (?:a (?:single )?word|words?|a sigh|down|through|out of|into|fire|new life|life into|the same|heavily|heavy|hard|loudly|loud|so (?:hard|heavily|loud|loudly|much|fast)|exercises?|techniques?|room|space|easy|easier|easily|over (?:my|me|his|her|your)|on (?:my|your|our|everyone'?s?|people'?s?) (?!(?:chest|lap|arms?|shoulder|bed|own|tummy|stomach|front|back)\b))\b)`;
// 'stopped breathing' told as now: a call for help straight after ('she stopped breathing, help'); a plain past is how a death is told
const STOPPED_NOW = R`stopped(?= breathing\b[.,!?]* *(?:help|please|what (?:do|should|can) i do|i don'?t know what to do|right now|just now|call)\b)`;
// A negative subject that governs the danger clause itself, for the idiom guard of a negated danger ('nobody is', 'nobody's',
// "no one's life is", 'no one at home is', 'none of us are', 'no members of my family are', 'no one I know is'); never 'nobody
// else is', which says someone is, nor 'no one but me is'.
const NOBODY = R`\b(?:no[- ]?one|noone|nobody|none|neither|no (?:\w+ )?(?:members?|people|persons?|kids|children|adults|staff|students|pupils|residents|passengers|guests|workers|employees|relatives|family|friends|neighbou?rs|civilians))(?:'s (?:own )?[\w-]+)?(?: of (?:us|you|them|these|those|(?:(?:my|our|the|his|her|their|your|this|that|these|those) )?\w+(?: \w+)?))?(?: (?:here|there|nearby|at home|around (?:here|me|us)|(?:at|in|on|from|inside|outside|near|with) (?:(?:my|our|the|his|her|their|your|this|that|a) )?\w+(?: \w+)?|(?:who|that) (?:lives?|lived|works?|worked|stays?|stayed|is|was|are|were) (?:here|there|with (?:me|us)|at home|nearby)|(?:i|we|you) (?:know|love|care about|live with|work with)))?(?: (?:now|right now|today|tonight|currently))?`;
// ...and only when it is purely negated (round 3): nothing after it in the message turns the meaning ('but', 'except',
// 'apart from', 'other than', 'only', 'just', 'yet', 'unless', 'if', 'until', 'though', 'well', 'then', 'now', 'anymore', 'at
// the moment'), and no other subject follows with is / are / 's / 'm ('my mum is', "he's coming back", "my mum's boyfriend
// hits her", "I'm scared"). A calm one does not turn it ('everyone is fine', 'the fire is out', "it's over", "I'm just
// stressed", 'but it was scary'). (This is why 'nobody is in danger right now' still reads: 'now' says it may not last.)
const CALM = R`(?:(?:all|completely|totally|perfectly|absolutely|so|very|really|both|still|just|only|a bit|a little|feeling) )*(?:fine|safe|ok|okay|alright|all right|good|out|over|gone|asleep|unhurt|uninjured|calm|calmer|a false alarm|under control|stressed|tired|worried|anxious|upset|overwhelmed|venting|ranting|curious|asking|wondering|bored|sad|annoyed|frustrated|confused)\b`;
const TURN = R`.*?(?:\b(?:but\b(?! it(?:'s| is| was| felt| feels| seemed| looked| got| sounded)(?: (?:really|so|very|quite|pretty|a bit|a little|kind of|kinda|super|honestly))? (?:scary|frightening|terrifying|close|a close call|stressful|upsetting|horrible|awful|a shock|a scare|hard|weird|strange|worrying|tense)\b)|except|apart|other than|besides|aside from|save for|(?:only|just) (?:me|us|him|her|them|my|his|our|their|the|i|he|she|they|we|[a-z]+'s)|yet|unless|if|until|till|til|though|although|however|well|then|now|any ?more|at the (?:moment|minute)|for the (?:moment|time being)|currently)\b|\b(?!(?:it|that|this|there|here|what|how|where|when|why|let|everything|everyone|everybody|all|nobody|noone|none|one)(?:'s|'re|'m| is| are| am)\b)[a-z]+(?:'s|'re|'m| is| are| am)\b(?! ${CALM}))`;
// A private body part, for the touching rules ('my private parts', 'my privates', 'my boobs', 'my bum', 'between my legs';
// never 'my bottom lip', 'my bits of paper')
const PRIVATE = R`(?:privates|private(?: parts?| area| bits)?|breasts?|boobs?|boobies|tits|nipples?|vagina|vulva|fanny|penis|dick|cock|willy|balls|testicles|bum|butt|arse|ass|bottom\b(?! (?:lip|drawer|shelf|step|stair|bunk|teeth|tooth|half|line|row|of|bracket|layer|corner|edge|lid)\b)|backside|crotch|groin|genitals|bits\b(?! (?:and|of)\b)|down there|inner thighs?|thighs?)`;

export const HARM_LEXICON = {
  idiomGuards: [
    R`\bkill(?:ed|ing)? my ?self laughing\b`,
    R`\b(?:nearly|almost|could have|could've) died (?:laughing|of (?:embarrassment|shame|laughter|cringe))\b`,
    R`\bdied (?:of|from) (?:embarrassment|laughter|laughing|shame|cringe)\b`,
    R`\b(?:could|would) kill for an?\b`,
    R`\bkill for an?\b`,
    R`\b(?:is|are|was|were|it'?s|they'?re|that'?s|this is) (?:literally |actually |honestly )?killing me\b`,
    R`\bdying (?:to|for|of laughter|of embarrassment|laughing)\b`,
    R`\bto die for\b`,
    // ('wants' and the hyperbole of hunger or heat added 12 Oct 2026, safety verification)
    R`\b(?:(?:want|wants|wanted|going) to|wanna|gonna) (?:just )?die of (?:embarrassment|shame|cringe|laughter|laughing|boredom|heat|hunger|thirst|cold|excitement|nerves|jealousy|envy|cuteness)\b`,
    // medicine taken as it should be
    R`\b(?:took|take|taking|taken) (?:all (?:of )?)?my (?:pills|tablets|meds|medication|medicine) (?:on time|as prescribed|like (?:i'?m|i am|i was) supposed to|like the doctor (?:said|told me))\b`,
    R`\b(?:take|taking) (?:all (?:of )?my|a handful of|loads of|a lot of|lots of) (?:pills|tablets|meds|medication|medicine|vitamins)(?: \w+){0,3} (?:every|each) (?:morning|day|night|evening)\b`,
    // added 12 Oct 2026, safety verification: everyday wording the crisis list caught
    // 'it hurt my self-esteem', 'killing my self confidence' (not 'my self' as in myself)
    R`\bmy self[- ]?(?:esteem|confidence|image|worth|respect|belief|portraits?|care|control|expression|discipline|love|doubt|assurance|awareness)\b`,
    // a flat battery, not a person (the Another Angle server's guard)
    R`\b(?:my |the |our )?(?:phone|battery|laptop|tablet|ipad|kindle|headphones|airpods|earbuds|controller|torch|car battery|charger)(?:'s| is| was| will| keeps)?(?: about| going| gonna)? to die\b`,
    // ordinary accidents (never 'by accident', which is also how self-harm gets explained away)
    R`\b(?:cut|nicked) my ?self (?:shaving|cooking|chopping|slicing|gardening|on (?:a |the |some )?(?:tin|can|paper|thorns?|brambles?|rose bush))\b`,
    R`\b(?:hurt|injured) my ?self (?:at (?:the gym|football|rugby|netball|hockey|training|practice)|(?:playing|lifting|running|exercising|working out|training|skiing|snowboarding|skating|climbing|cycling|dancing|tripping|moving house)\b)`,
    R`\boverdos(?:e|ed|ing) on (?:chocolate|sugar|sweets|candy|cake|carbs|cheese|pizza|ice cream|coffee|netflix|tv|telly|tik ?tok|social media|cuteness|christmas|rom-?coms|anime)\b`,
    R`\bsuicide squad\b`,
    R`\b(?:die|died) laughing\b`,
    // breathless with laughter, not panic (added 13 Oct 2026, final QA: 'laughing so hard I can't breathe')
    R`\b(?:laugh(?:ing|ed)?|crying laughing|cry-laughing|giggling|lol|lmao|haha\w*)(?: so (?:hard|much))?(?: (?:that|lol|haha))?(?: i)? (?:can'?t|cannot|couldn'?t) breathe\b`,
    // added 14 Oct 2026, lexicon gaps: a purely negated danger, where the negation is the subject of the danger clause
    // itself ('nobody is in danger', 'no members of my family are actually in danger', 'none of us are in danger', "no one's
    // life is in danger") and nothing after it turns the meaning (TURN: 'no one is in danger except me', 'nobody is in
    // danger, only me', 'no one is in danger yet but he's coming back', 'nobody's in danger unless he comes back', "no one's
    // in danger, my mum is" all still read); never 'no one knows I'm in danger', 'nobody else is in danger' or 'no one can
    // help, my sister is in danger'
    R`${NOBODY}(?:'s|'re| is| are)(?: all| both)? in (?:immediate |real |serious )?danger\b(?!${TURN})`,
    // a pet or a thing touching, not a person ('my cat keeps touching me with her paw')
    R`\b(?:it|this|that|(?:my|the|our|his|her|a) (?:cat|dog|kitten|puppy|pet|label|tag)) (?:keeps|kept|keep|won'?t stop|wont stop|will not stop|doesn'?t stop|does not stop|never stops) touching me\b`,
    // (round 3) a small child or a brother or sister who keeps touching, as children do ('the baby keeps touching me', 'my
    // sister keeps touching me in the car', 'my nephew keeps touching me with sticky hands', 'my little brother won't stop
    // touching me on the arm'), unless something says it is unwanted in that way ('...and I hate it', '...there', '...at
    // night', '...when we're alone'); never an uncle, a cousin or a step-brother ('my uncle keeps touching me' still reads)
    R`\b(?:the|my|our|his|her|a) (?:(?:little|baby|younger|big|older|twin|toddler|small|half|\d+[- ]?year[- ]?old) )*(?:baby|babies|toddlers?|kids?|child|children|nephews?|nieces?|sons?|daughters?|brothers?|sisters?|siblings?|twins?|grandsons?|granddaughters?|grandkids?|grandchildren|little ones?) (?:keeps|kept|keep|won'?t stop|wont stop|will not stop|doesn'?t stop|does not stop|never stops) touching me\b(?![.,!]* *(?:inappropriately|(?:down )?there|down below|in (?:places|private|bed|the night|my sleep|the bath|the shower|my room|(?:an?|the) (?:sexual|weird|wrong|inappropriate|bad|funny|strange|creepy) way|ways?)|under|between|on my (?:private|privates|breasts?|boobs|bum|bottom|butt|crotch|genitals|thighs?|chest|body)|at night|when (?:we'?re|we are|i'?m|i am|no one|nobody|mum|mom|dad|everyone|our parents|my parents)|where|without|even (?:though|when|after)|after i|and (?:i (?:hate|don'?t|do not|dont|said|told|asked|feel|want|wish|can'?t|cannot|am scared|'m scared)|it (?:makes|made|feels|hurts|scares)|(?:he|she) (?:won'?t|wont|says?|said|tells?|told|makes?|made|threatens?|threatened)|won'?t|wont|makes?|made)|but i|i (?:hate|don'?t|do not|dont|said|told|asked|feel)|it (?:makes|made|feels)|like that|sexually)\b)`,
    // (round 3) a baby or a toddler at the breast or the nappy ('the baby keeps grabbing my boobs', 'my toddler touched my bum')
    R`\b(?:the|my|our|a) (?:(?:little|baby|newborn|\d+[- ]?(?:month|week|year)[- ]?old) )*(?:baby|babies|newborn|toddler|infant|little one)(?:'s| is| was| keeps| kept| always| just)? (?:touch|grab|pull|squeez|pinch|scratch|bit|bite)\w* my (?:boobs?|breasts?|nipples?|bum|butt|bottom)\b`,
  ],
  crisis: [
    // 'my self' as two words too (review 12 Oct: 'i want to kill my self')
    // typos and run-together spellings too ('kil myself', 'killmyself'; safety verification 12 Oct)
    R`\bkil{1,2}(?:ing|ed)? ?my ?s(?:elf|lef|efl|elv)\b`,
    R`\bkms\b`,
    R`\bsuicid\w*`,
    R`\b(?:sucid|suicd|siucid|suisid|suecid|sucuid)\w*`,
    R`\bend(?:ing)? (?:it all|my life|my own life|things for good|everything for good)\b`,
    R`\b(?:(?:want|wanna|going|planning|plan|ready|need|about|decided) to|gonna) (?:just )?end it\b(?! (?:with|between|off|on a)\b)`,
    // any tense ('I'm thinking of taking my own life'); 'taking my life back' and 'my life in my hands' stay none
    R`\b(?:tak(?:e|es|ing|en)|took) my (?:own )?life\b(?! (?:back|in(?:to)? (?:my|both|your) (?:own )?hands|seriously|one day at a time|step by step|forward|in a new direction))`,
    // 'wanna' too; never 'live in London', 'go on the trip', 'wake up early', 'be around him' (safety verification 12 Oct)
    R`\b(?:don'?t|do not|no longer) (?:want to|wanna) (?:be here|be alive|exist|live\b(?! (?:in|with|here|there|near|at|on|together|abroad|alone|by|next|apart|under|off|close|a|an|the|my|our|his|her|their|somewhere|anywhere|far|nearby)\b)|wake up\b(?! (?:early|at|before|so early|in time|on time|for|till|until|when|next to|with|this early|that early|to (?:my|an|the|that) (?:alarm|alarms|noise|sound|kids|baby|dog|cat|neighbours?|mess|rain|snow))\b)|go on\b(?! (?:a|an|the|my|our|his|her|their|this|that|these|those|holiday|holidays|vacation|stage|tour|about|at|to|dates?|trips?|rides?|instagram|tiktok|facebook|twitter|social|youtube|twitch|it|there|strike|leave|camp|camping|another|any|and on)\b)|be around\b(?! (?:him|her|them|people|you|my|his|their|those|these|that|this|the|anyone|someone|crowds?|kids|children|dogs?|cats?|when|while)\b))`,
    // 'want 2 die', 'wnat to die'; 'going to die' in the first person only, so 'my grandma is going to die' is not a crisis
    R`\b(?:want|wanted|wnat|wamt|deserve|need|ready) (?:to|2) (?:just )?die\b`,
    R`\b(?:i'?m|i am|im)(?: \w+){0,2} (?:going to|gonna) (?:just )?die\b`,
    R`^(?:(?:just|probably|i think) )?(?:going to|gonna) (?:just )?die\b`,
    // 'wanna' already carries the 'to' (review 12 Oct: 'I wanna die', 'I wanna end it')
    R`\bwanna (?:just )?(?:die\b|end it\b(?! (?:with|between|off)))`,
    R`\bwish i could (?:just )?die\b`,
    R`\b(?:would|'d) (?:just )?rather (?:be dead|not be alive|not exist|die(?! than\b))\b`,
    R`\bwish (?:i (?:was|were|had)|i'd) never (?:been )?born\b`,
    R`\bshould (?:never have|have never|'ve never|never'?ve) been born\b`,
    R`\b(?:took|taken|take|taking|swallow(?:ed|ing)?|down(?:ed|ing)?|neck(?:ed|ing)?) (?:a (?:bunch|load|handful|lot|whole (?:packet|box|bottle|strip)) of|all (?:of )?(?:my|the)|too many|loads of|lots of|the whole (?:packet|box|bottle|strip|lot) of|a (?:packet|box|bottle|strip) of) (?:my |the )?(?:pills|tablets|meds|medication|painkillers|paracetamol|sleeping (?:pills|tablets))\b`,
    R`\bwhat(?:'?s| is) the point (?:of|in) (?:me )?(?:living(?! (?:in|with|here|there|near|at|on|together|off|like|abroad|alone|somewhere|by|next|apart|under|away|a|the|my|our)\b)|being alive|going on|carrying on|being here|existing)\b`,
    R`\bwant (?:my life|it all|everything) to (?:be over|end|stop)\b(?! (?:for a (?:bit|minute|moment|second|while|day)|so i can|until|till))`,
    R`\bwish i (?:was|were) dead\b`,
    R`\bwish i (?:wasn'?t|was not|weren'?t|were not) (?:here|alive|born|around)\b`,
    R`\b(?:hurt|hurting|harm|harming|harmed|cut|cutting|burn|burning|punish|punishing|punished|starve|starving|starved) my ?self\b(?! (?:out|off|short|loose|free|some slack|a break|a slice|in on)\b)`,
    R`\bself[- ]?harm\w*`,
    R`\bno (?:reason|point) (?:to|in|for) (?:me )?(?:being alive|being here|me being here|existing|(?:live|living)\b(?! (?:in|with|here|there|near|at|on|together|abroad|alone|by|next|apart|off|a|an|the|my|our|like that)\b)|(?:go|going|carry|carrying) on\b(?! (?:a|an|the|my|our|this|that|holiday|holidays|vacation|about|and on|at|to|trips?|dates?|stage|tour|it)\b))`,
    R`\bnothing (?:left )?to live for\b`,
    R`\bbetter off (?:dead|without me)\b`,
    R`\b(?:can'?t|cannot|can not) go on\b(?! (?:a|an|the|my|our|his|her|their|this|that|these|those|holiday|holidays|vacation|stage|tour|about|at|to|dates?|trips?|rides?|instagram|tiktok|facebook|twitter|social|youtube|twitch|it|there|strike|leave|camp|camping|another|any|and on)\b)`,
    R`\boverdos\w*`,
    R`\bnot worth living\b`,
    R`\blife (?:isn'?t|is not|isnt) worth (?:it|living)\b`,
    R`\b(?:(?:want|wish) to|wanna|wish i could) (?:just )?disappear (?:forever|for good|and never come back)\b`,
    R`\bi'?m a burden (?:to|on) (?:everyone|everybody|my family|them|people)\b`,
    R`\b(?:goodbye|suicide) (?:letter|note)\b`,
    R`\b(?:(?:go to|fall) )?(?:sleep|asleep)(?: forever| for ever)? and (?:never|not) wake(?: up)?\b(?! up\b)(?! (?:until|till|before|for|early|at|in time|on time)\b)`,
    // added 12 Oct 2026 (audit: missed by both detectors)
    R`\b(?:nobody|no one|no-one|noone|nobody else) (?:would|will|is going to|'?d|is gonna) (?:even |really |ever )?(?:miss|notice) (?:me|if i(?:'?m| was| were) gone)\b`,
    R`\b(?:thinking|thought|think|considering|been thinking) (?:of|about) (?:ending it|ending it all|ending my life|ending things|killing myself|not being (?:here|alive|around))\b(?! (?:with|between|off))`,
    R`\b(?:hang|hanging|rope|roping|poison|poisoning|unalive|unaliving) my ?self\b`,
    R`\b(?:drown|drowning) my ?self\b(?! in (?:work|coffee|tea|wine|chocolate|ice cream|books?|music|netflix|tv|homework|revision|studying|study|blankets|perfume|paperwork|emails|my work|my studies|cake|sweets|junk food|fast food)\b)`,
    R`\b(?:want|wanna|wish i could) (?:to )?be dead\b`,
    R`\bjump(?:ing)? (?:off (?:a|the) (?:bridge|building|roof|cliff)|in front of (?:a|the) (?:train|bus|car|lorry|truck))\b`,
    R`\beveryone (?:would|will|'?d) be (?:better|happier) (?:off )?(?:if i (?:was|were) gone|without me)\b`,
    // added 12 Oct 2026, review round 3 (common first-person phrasings the free gate missed)
    R`\b(?:want|wanted|wanna|wish i could|wish to|would rather|'d rather) (?:to )?(?:just )?(?:stop existing|not exist(?:ing)?|cease to exist|stop being alive)\b(?! (?:on|online|in (?:the|this|that|our|my) (?:group|chat|office|class|team))\b)`,
    // 'dying', but never 'dying my hair' (a common spelling of dyeing)
    R`\b(?:keep |kept |been |always |constantly |can'?t stop |cannot stop )?(?:thinking|think|thought) (?:about|of) (?:dying\b(?! (?:my|her|his|their|the|it|your|a|some|them)\b)|being dead\b|not waking up\b|never waking up\b)`,
    R`\b(?:no one|nobody|no-one|noone) (?:would|will|'?d|is going to|is gonna) (?:even |really |ever )?(?:care|notice|mind|miss me) if i (?:died|die|was gone|were gone|disappeared|disappear|wasn'?t here|weren'?t here|was dead|were dead|killed myself)\b(?! (?:my|her|his|their) hair\b)`,
    // cutting as self-harm, never cutting carbs, costs, onions or hair
    R`\b(?:been |started |start |keep |kept |still |went back to |gone back to |back to |stopped )cutting(?: again\b| my ?self\b(?! (?:off|out|short|loose|free|some slack)\b)| my (?:arms?|legs?|wrists?|skin|thighs?|stomach|body)\b|\s*(?:[.!?,;]|$))`,
    // 'Cutting again. I hate myself.' at the start of a sentence (added 13 Oct 2026, final QA; the server's rule)
    R`(?:^|[.!?;]\s*)cutting (?:my ?self )?again\b`,
    R`\bdone with (?:life\b(?! (?:admin|insurance|coaching|lessons)\b)|being alive\b|existing\b|living\b(?! (?:in|with|here|there|at|on|near|abroad|together|apart|out of)\b))`,
    R`\b(?:hope|wish|want|pray) (?:that )?i (?:never|don'?t|do not|won'?t) wake(?: up)?\b(?! up\b)(?! (?:until|till|before|early|at|in time|on time|(?:this|that|so|as) (?:early|late))\b)`,
    R`\b(?:have|got|'ve got|saved|saving|stockpiled|stockpiling|collected|collecting) (?:up )?(?:the |my |enough |all (?:the |my )?)?(?:pills|tablets|meds|medication|painkillers) (?:ready|saved up|stockpiled|lined up|to (?:do it|end it|take them all))\b(?! for (?:the|my|a|our|your|work|school|holiday|travel|trip|journey|flight|morning|bed|breakfast|mum|mom|dad|grandma|grandad)\b)`,
    R`\bstockpil\w* (?:my |the )?(?:pills|tablets|meds|medication|painkillers)\b`,
    // added 12 Oct 2026, safety verification (first-person phrasings the free gate missed)
    R`\bunaliv\w*`,
    R`\b(?:want to|wanna|going to|gonna|about to|planning to|tempted to|might|could|will) (?:just )?od\b`,
    R`\bi(?:'ve| have| just)? (?:just )?od'?(?:d|ed)\b`,
    R`\b(?:slit|slitting|slash|slashing|cut|cutting) (?:open )?(?:my|both my|both of my) (?:wrists?|veins?|throat)\b`,
    R`\b(?:cut|burned|burnt|burn|burning|hit|hitting|scratch(?:ed|ing)?|punch(?:ed|ing)?|bit|bite|biting|bruis(?:ed|ing)|bang(?:ed|ing)) my ?self (?:again|on purpose|deliberately|intentionally|until|till|to (?:feel|cope|punish|stop|forget|calm|numb))\b`,
    R`\b(?:shoot|shooting|stab|stabbing|suffocate|suffocating|strangle|strangling|electrocute|electrocuting|end|ending|neck|necking) my ?self\b(?! in the (?:foot|feet)\b| (?:a|an) (?:message|text|email|reminder|note|dm|link|copy)\b)`,
    R`\b(?:to|gonna|wanna|will|could|might|should|'ll|'d|just|i) (?:off|top) my ?self\b(?! up\b)`,
    R`\bthrow(?:ing)? my ?self (?:off|from|in front of|under (?:a|the) (?:train|tube|lorry|truck|car|tram))\b`,
    R`\b(?:step|stepping|walk|walking|lie|lying|run|running|jump|jumping) (?:out )?in front of (?:a|the|an oncoming) (?:train|bus|car|lorry|truck|tube|van|tram)\b`,
    R`\bjump(?:ing)? (?:off|from) (?:a|the|my|this|that) (?:balcony|tower|tower block|car park|multi-?storey|ledge|overpass|flyover|window|top floor)\b`,
    R`\bjump(?:ing)? out (?:of )?(?:a|the|my) window\b`,
    R`\b(?:lie|lying|lay|stand|standing) (?:down )?on (?:the )?(?:train |railway )?tracks\b`,
    R`\b(?:a|my|the) plan to (?:die|end things|end my life|not be here)\b`,
    R`\b(?:should|might as well|may as well|i'?ll just|i will just) (?:just )?(?:die|be dead)\b(?! (?:of|from|laughing|happy|on this hill|for|trying)\b)`,
    R`\bwish i (?:didn'?t|did not) exist\b`,
    R`\b(?:shouldn'?t|should not|don'?t deserve to|do not deserve to) (?:be alive|exist|live\b(?! (?:in|with|here|there|like that|a|an|the|such)\b))`,
    R`\b(?:i'?m|i am|im|i feel like(?: i'?m)?) (?:just |only |such |always |so much of |nothing but )?a (?:huge |massive |total |complete |big |giant )?burden\b(?! (?:on|to) (?:the|my|our|this) (?:team|project|budget|company|business|class|group|department|system|nhs)\b)`,
    R`\b(?:don'?t|do not|can'?t|cannot|can not) see (?:the|any) point (?:in |of )?(?:me )?(?:${LIVING}|being alive|life\b|existing|being here|(?:going|carrying) on\b(?! (?:a|an|the|my|our|this|that|holiday|holidays|vacation|about|and on|at|to|trips?|dates?|it)\b))`,
    R`\b(?:want|wanna|wish i could|need) (?:to )?(?:just )?(?:vanish|be gone) (?:forever|for good|permanently|for ever)\b`,
    R`\b(?:can'?t|cannot|can not) (?:keep )?(?:living|live|going on|go on|carrying on|carry on) like this any ?more\b`,
    R`\b(?:give|giving|gave|given) up on (?:life\b(?! (?:admin|insurance|coaching|drawing|lessons)\b)|being alive\b|staying alive\b|${LIVING})`,
    // passive wishes: 'I hope I die in my sleep', 'I wish a bus would hit me'
    R`\b(?:hope|wish|pray) (?:that )?i (?:just )?(?:die|would die|will die|could die|get hit by|got hit by|get run over|don'?t survive)\b(?! (?:of|from|laughing)\b)`,
    R`\b(?:wish|hope|pray) (?:that )?(?:a|the|some) (?:bus|car|train|lorry|truck|plane) (?:would |will )?(?:hit|hits|crash|crashes|run me over|runs me over|kill|kills)(?: me| into me)?\b`,
    R`\b(?:tired|sick|exhausted) of (?:being alive|existing|${LIVING}(?= *(?:$|[.,!?;]|any ?more|and\b|so\b)))`,
    R`\bcan'?t do (?:life|this life|living) any ?more\b`,
    R`\b(?:be|been|are|is) (?:so much |much |a lot |way )?(?:happier|better off) (?:if i (?:was|were|wasn'?t|weren'?t) (?:gone|dead|here|around|alive)|without me)\b`,
    R`\b(?:i'?m|i am|im) (?:still |secretly )?cutting(?: my ?self)?(?: again)?(?=\s*(?:$|[.,!?;]|again\b|myself\b|every\b|at night\b|lately\b|to cope\b))`,
    R`\b(?:want|wanting|wanted|urge|urges|tempted|need|needing|wanna) (?:to )?cut(?: my ?self\b(?! (?:off|out|short|loose|free|some slack|a break|a slice)\b))?(?: again)?(?=\s*(?:$|[.,!?;:)…]|again\b|so bad|and\b|but\b|tonight\b|right now\b))`,
    R`\b(?:i'?m|i am|im) ending it\b(?! (?:with|between|off|on a)\b)`,
    R`\b(?:(?:want|going|planning|ready|about|need) to|wanna|gonna|i'?ll|i will) (?:just )?end (?:everything|it all|my life|myself)\b(?! (?:with|between)\b)`,
    R`\bgoodbye forever\b`,
    R`\blife (?:is|feels|seems) (?:so |completely |totally |just )?(?:pointless|meaningless)\b`,
    R`\b(?:no one|nobody|no-one|noone) (?:cares|would care|gives a \w+) (?:if|whether) i (?:live|lived) or (?:die|died)\b`,
    R`\bsewer ?slide\b`,
    R`\b(?:i'?m|i am|im) (?:standing |sitting )?on (?:the|a) (?:edge of (?:the|a) )?(?:bridge|ledge|roof|cliff edge|platform edge)\b`,
    R`\b(?:thinking|thought|think|considering) (?:of|about) (?:jumping|throwing myself|hanging myself|overdosing|cutting(?: myself)?)\b(?! (?:in|into|on|at|ship|the gun|for joy|rope|jacks|back|ahead|over|the queue|my hair|my fringe|carbs|back on)\b)`,
    R`\bbleed(?:ing)? out\b`,
    R`\b(?:i'?m|i am|im) not safe (?:with|around|from) myself\b`,
    R`\b(?:want|wanna|wish i could|would rather|i'?d rather|rather|need|prefer) (?:to )?(?:just )?(?:not|never) (?:be alive|have been born|wake up\b(?! (?:early|at|before|so|in time|for|till|until|on time|when)\b))`,
  ],
  crisisOther: [
    R`\b(?:kill|killing|hurt|hurting|harm|harming|end) (?:himself|herself|themselves|themself)\b`,
    R`\btake (?:his|her|their) (?:own )?life\b(?! (?:back|into|in (?:his|her|their) (?:own )?hands|seriously|one day at a time|forward|in a new direction)\b)`,
    // added 12 Oct 2026, safety verification: 'my sister said she wants to die', 'my friend is cutting herself'
    R`\b${PEOPLE}(?:'s| is| are|'re| was| were| keeps| has been)? (?:saying (?:she|he|they) )?(?:wants?|wanted|wanting|wanna|planning|plans|trying|tried|threatening|threatens|threatened) (?:to )?(?:die\b|end it(?: all)?\b(?! (?:with|between|off)\b)|end (?:his|her|their) (?:own )?life\b|disappear (?:forever|for good)\b|not (?:be here|exist|wake up|be alive)\b)`,
    R`\b(?:end|ending) (?:his|her|their) (?:own )?life\b`,
    R`\b(?:sent|send|sends|texted|posted|left) (?:me |us )?(?:a |her |his |their )?(?:goodbye|suicide) (?:message|text|note|letter|post|video)\b`,
    R`\b(?:threatening|threatens|threatened) to (?:jump|hang|overdose|cut|drown)\b(?! (?:in|into|on|at|ship|the queue|ties|me off)\b)`,
    R`\b(?:cuts|cutting|burns|burning|starves|starving|punishes|punishing|harms) (?:himself|herself|themselves|themself)\b(?! (?:a|an|some|off|free|loose|short|out)\b)`,
    R`\b${PEOPLE}(?:'s| is| has| have| had| was)? (?:just )?(?:overdosed|taken an overdose|took an overdose)\b`,
    // (a clearly negated danger, 'nobody is in danger', is blanked by an idiom guard: NOBODY, 14 Oct 2026)
    // ('all' or 'both' between, round 3: "we're all in danger", 'my family is all in danger')
    R`\b(?:is|are|am|'s|'re|'m)(?: all| both)? in (?:immediate |real |serious )?danger\b(?! of)`,
    // someone else not breathing, now (contractions added 14 Oct 2026, lexicon gaps; round 3: the phone spellings 'shes',
    // 'hes', 'theyre', 'its', a relative with no 'my', 'the old man on the floor', 'barely'): "she's not breathing", "dad isn't
    // breathing", "mum's not breathing", 'shes not breathing', 'he is not breathing properly', "he's barely breathing", 'my
    // baby has stopped breathing', 'he just stopped breathing', 'dad stopped breathing call an ambulance'; never the speaker
    // ("I'm not breathing properly because of my cold") or an idiom (BREATH_IDIOM). A plain past 'my baby stopped breathing'
    // is how a death is told (the loss readings have it).
    R`\b${BREATHER}(?:(?:'s|'re|s| is| are)(?: still)? (?:not|barely|hardly|scarcely|no longer)| (?:isn'?t|aren'?t|isnt|arent|ain'?t|aint|not|barely|hardly|no longer)|(?:'s|s|'ve| has| have)(?: just| suddenly)? stopped| just stopped| ${STOPPED_NOW}) breathing\b${BREATH_IDIOM}`,
    // ('theyre', 'theyve': the phone spellings of 'they', never 'here not breathing')
    R`\bthey(?:re(?: still)? (?:not|barely|hardly|scarcely|no longer)|ve(?: just| suddenly)? stopped) breathing\b${BREATH_IDIOM}`,
    // ...and with the subject left out after 'and' ('she collapsed and isn't breathing', 'my friend is unconscious and not
    // breathing', 'my baby is blue and not breathing'), never across the speaker ('she said I'm stressed and not breathing')
    R`\b${BREATHER}(?: (?!(?:i|i'?m|im|i'?ve|you|we|we'?re)\b)[\w',-]+){1,6}? and (?:(?:is|are)(?: still)? (?:not|barely|hardly|no longer)|isn'?t|isnt|aren'?t|arent|not|barely|hardly|no longer|now not|(?:has|have)(?: just| suddenly)? stopped|just stopped|${STOPPED_NOW}) breathing\b${BREATH_IDIOM}`,
  ],
  care: {
    abuse: [
      R`\babus(?:e|ed|er|ers|ive|ing)\b`,
      R`\bcoerc\w*`,
      R`\bgaslight\w*`,
      R`\bmolest\w*`,
      R`\bassault(?:ed|ing|s)?\b`,
      R`\brap(?:e|ed|ist)\b`,
      R`\bgroomed me\b`,
      R`\b(?:my )?(?:uncle|step-?dad|step-?father|step-?brother|cousin|teacher|coach|tutor|neighbou?r|grandad|granddad|grandpa|babysitter|carer|(?:mum|mom|dad)'?s (?:boyfriend|girlfriend|partner|friend)|family friend|boss|priest|doctor)(?: \w+){0,2} (?:touches|touched|keeps touching|kept touching|is touching|tries to touch|tried to touch|gropes|groped) me\b(?! on the (?:shoulder|arm|back|hand) (?:to|and said|when|as|for)\b| on (?:the|my) chest (?:to (?:check|listen|examine|feel|hear)|with (?:a|the|his|her) stethoscope)\b)`,
      R`\btouched me (?:without|when i|even though|after i)\b`,
      // unwanted sexual touching, whoever does it (added 14 Oct 2026, lexicon gaps): 'he touched me inappropriately',
      // 'someone touched me there', 'she touches me under my clothes', 'groped me without asking', 'inappropriately touched
      // me', 'he felt me up', 'he made me touch him', 'he keeps touching me'; never an ordinary touch ('touched me on the
      // shoulder to get my attention', 'the film really touched me', 'touched me deeply', 'touched me under my chin', 'his
      // letter touched me there and then', 'made me touch base', 'keeps touching me to annoy me'; a pet or a thing: the idiom guards)
      R`\b(?:touch(?:es|ed|ing)?|grop(?:e|es|ed|ing)|fondl(?:e|es|ed|ing)) me (?:inappropriately|(?:down )?there\b(?! and then\b)|down below\b|in (?:places|private places|my private|an? (?:sexual|inappropriate|wrong) way|(?:a way|ways)(?: that)? i (?:didn'?t|did not|don'?t|do not|didnt|dont) (?:like|want))|where i (?:didn'?t|did not|don'?t|do not|didnt|dont|never) (?:want|wanted|like|liked)|without (?:asking|permission|my (?:permission|consent)|consent)|between my (?:legs|thighs)|under my\b(?! (?:chin|nose|eyes?|arms?|armpits?|feet|foot|umbrella|desk)\b)|on my (?:private|privates|breasts?|boobs|bum|bottom|butt|arse|ass|thighs?|crotch|genitals|chest\b(?! to (?:check|listen|examine|feel|hear)\b| with (?:a|the|his|her) stethoscope\b))\b)`,
      // (round 3) touching a private part ('my uncle touched my private parts', 'he touched my privates', 'he grabbed my
      // breasts', 'my stepdad touches my private parts'), whoever does it but the speaker ('I touched my...'); and a hand
      // inside the clothes ('he put his hand down my pants', 'up my skirt', 'on my thigh')
      R`\b(?!(?:i|i'?ve|i'?d|we|it|jeans|shorts|trousers|pants|tights|leggings|skirt|dress|seatbelt|belt|straps?|bra|underwear|knickers|clothes|shoes|boots|saddle|seat|towel|sheets?|water)\b)[\w']+(?: (?:has|have|had|keeps|kept|would|used to|tried to|tries to|always|then|just|once|also|accidentally|deliberately))? (?:touch(?:es|ed|ing)?|grop(?:e|es|ed|ing)|grab(?:s|bed|bing)?|fondl(?:e|es|ed|ing)|rub(?:s|bed|bing)?|squeez(?:e|es|ed|ing)|strok(?:e|es|ed|ing)) my ${PRIVATE}\b`,
      R`\b(?:put|puts|putting|stuck|sticks|sticking|slid|slides|sliding|shoved|shoves|shoving|pushed|pushes|pushing|reached|reaches|reaching|forced|forces|forcing) (?:his|her|their|a) (?:hands?|fingers?)(?: (?:right|all the way))? (?:down|up|in|inside|into|under|between|on|in between) my (?:pants|knickers|underwear|undies|skirt|top|shirt|t-?shirt|blouse|bra|trousers|jeans|shorts|dress|pyjamas|pajamas|pjs|clothes|nightie|nightdress|boxers|leggings|tights|legs|thighs?|bum|butt|crotch|privates|private parts|breasts?|boobs)\b`,
      R`\binappropriately (?:touch(?:es|ed|ing)?|grop(?:es|ed|ing)|fondl(?:es|ed|ing)) me\b`,
      R`\b(?:feel|feels|felt|feeling) me up\b|\bfondl(?:e|es|ed|ing) me\b`,
      R`\b(?:made|makes|make|making|forced|forces|force|forcing|got|gets) me (?:to )?touch (?:him\b|(?:his|her) (?:private (?:parts|area)|privates|penis|dick|cock|willy|crotch|genitals|bits|breasts?|boobs|chest|body)\b|(?:her|them)(?= *(?:$|[.,!?;…]|(?:and|there|down there|again|when|while|under|but|or|so|in (?:bed|my|his|her|the (?:car|bathroom|bedroom)))\b)))`,
      R`\b(?:keeps|kept|keep|won'?t stop|wont stop|will not stop|doesn'?t stop|does not stop|never stops) touching me\b(?! on the (?:shoulder|arm|back|hand) (?:to|and said|when|as|for)\b| to (?:annoy|wind|bug|irritate|tease|get my attention)\b)`,
      R`\bforced me\b`,
      R`\bwon'?t let me (?:leave|go out|see (?:my )?(?:friends|family)|have (?:my own )?money|work|have my phone)\b`,
      R`\bcontrols? (?:all )?(?:of )?my (?:money|phone|messages|life|food)\b`,
      R`\b(?:goes|went|keeps going) through my phone\b`,
    ],
    violence: [
      R`\b(?:he|she|they|my (?:partner|boyfriend|girlfriend|husband|wife|ex|dad|father|mum|mom|mother|stepdad|stepmum|stepmom|brother|sister|boss|teacher|flatmate|roommate|son|daughter)|someone|somebody)(?: has| had)? (?:hit|hits|punched|punches|kicked|kicks|slapped|slaps|choked|chokes|strangled|strangles|shoved|shoves|smacked|smacks|attacked|attacks|grabbed|grabs) me\b`,
      // 'beat me' is a blow unless a game, a contest or a race is named (BEAT_GAME; the default flipped in round 3): 'my uncle
      // beat me', 'the older boys beat me in the toilets', 'he beat me in the shower', 'he beat me on the way home'; never 'he
      // beat me at chess', 'she beat me in the final', 'he beat me to it', 'he beat me home', 'she beat me 6-2'
      R`\b${BEATER}(?:'s|'ve|'d| has| have| had| would| used to)? beat(?:s|en)? me\b(?!${BEAT_GAME})`,
      // ...and whoever does it, with a weapon or the harm named ('beat me with a belt', 'beat me black and blue')
      R`\bbeat(?:s|en)? me\b(?!${BEAT_GAME})(?= (?:with|black and blue|senseless|unconscious|half to death|to (?:a pulp|death|near death|within an inch)|bloody)\b)`,
      R`\bbeat(?:s|en)? me up\b`,
      // added 12 Oct 2026, safety verification: being hurt, now or again and again
      R`\b${HURTER}(?: \w+)? (?:hurts|keeps hurting|kept hurting|is hurting|'s hurting|has been hurting|'s been hurting) me\b`,
      R`\b(?:i'?m|i am|im|i'?ve been|i have been) being (?:hurt|beaten|hit|abused)\b`,
      R`\b(?:physically|violently) (?:hurt|attacked|assaulted)\b`,
      R`\bdomestic (?:violence|abuse)\b`,
      R`\b(?:pulled|held|waved) a (?:knife|gun|weapon)\b`,
      R`\b(?:knife|gun|weapon) (?:at|to) (?:me|my)\b`,
      R`\bthrew (?:things|something|a \w+) at me\b`,
      R`\bpushed me (?:over|down|against|into|out)\b`,
    ],
    threat: [
      R`\bthreat(?:en|ened|ening|ens) (?:me|to)\b`,
      R`\bthreatening (?:messages|texts|calls|emails|me)\b`,
      R`\bdeath threats?\b`,
      R`\b(?:said|says|told me) (?:he|she|they)(?:'d| would| will|'ll) (?:kill|hurt|hit|find) me\b`,
      R`\bblackmail\w*`,
      R`\b(?:going to|gonna|will|threatened to) (?:leak|share|post|send) (?:my )?(?:photos|pictures|nudes|videos)\b`,
    ],
    harassment: [
      R`\bharass\w*`,
      R`\bstalk(?:s|ed|ing)? me\b`,
      R`\bstalker\b`,
      R`\bgrop(?:ed|es|ing)\b`,
      R`\bbull(?:y|ied|ies|ying)\b`,
      R`\bunwanted (?:touching|advances|messages|photos|pictures|attention|contact)\b`,
      R`\b(?:sexual|creepy|sleazy|dirty) (?:comments|messages|remarks|jokes) (?:about|at|to) me\b`,
      R`\bsends? me (?:nudes|explicit|sexual)\b`,
      R`\bwon'?t (?:stop (?:messaging|texting|calling|following|contacting) me|leave me alone)\b`,
      R`\bdoxx?(?:ed|ing)?\b`,
      R`\bleaked my\b`,
      R`\bfollow(?:s|ed|ing)? me home\b`,
      R`\bspread(?:s|ing)? (?:rumou?rs|lies) about me\b`,
    ],
    discrimination: [
      R`\b(?:racis[mt]|racial(?:ly)? (?:abuse|abused|slur|slurs)|sexis[mt]|homophob\w*|transphob\w*|biphob\w*|ableis[mt]|misogyn\w*|islamophob\w*|antisemit\w*|xenophob\w*|discriminat\w*)`,
      R`\bslurs?\b`,
      R`\b(?:because|cos|coz) (?:i'?m|i am) (?:black|brown|asian|gay|lesbian|bi|trans|queer|disabled|a woman|a girl|muslim|jewish|an immigrant|foreign|pregnant|autistic|neurodivergent)\b`,
      R`\bfor being (?:black|brown|asian|gay|lesbian|bi|trans|queer|disabled|a woman|muslim|jewish|an immigrant|pregnant|autistic)\b`,
    ],
    unsafe: [
      R`\b(?:don'?t|do not|dont) feel safe\b`,
      R`\b(?:not|never) safe (?:at home|with (?:him|her|them))\b`,
      R`\b(?:scared|afraid|frightened|terrified) (?:to go home|of (?:him|her|them|my (?:partner|boyfriend|girlfriend|husband|wife|dad|father|mum|mom|mother|stepdad|stepmum|stepmom|ex))(?!'s|\w))`,
      R`\bfear for my (?:life|safety)\b`,
      // added 13 Oct 2026, final QA: plain statements of being in danger ("I'm not safe", "i'm not safe here",
      // "I'm afraid he'll hurt me"); never 'not safe to drive', 'the bridge is not safe' or 'is it safe'
      R`\b(?:i'?m|i am|im)(?: (?:really|just|so|actually|honestly|truly|genuinely|still|probably|definitely))? not (?:really |actually |even )?safe\b(?! (?:to (?:drive|ride|cycle|fly|swim|ski|operate|use|be left (?:alone )?(?:with|near|around) (?:cake|chocolate|sweets|snacks|food|biscuits|crisps|pizza|a credit card|my card|money))|behind the wheel|on (?:the )?roads?|on (?:a|my|the) (?:bike|bicycle|scooter|skateboard|motorway)|(?:around|near|with) (?:cake|chocolate|sweets|snacks|biscuits|crisps|pizza|food|desserts?|ice cream|a buffet|buffets|scissors|a glue gun|a credit card|my credit card|my card|money)|in (?:a|the|any|my) kitchen|from (?:relegation|the drop|elimination|spoilers|the sack))\b)`,
      R`\b(?:i'?m|i am|im|i feel|i'?m feeling|i am feeling|i always feel|i often feel) (?:so |really |very |completely |totally )?unsafe\b(?! (?:to (?:drive|ride|cycle|swim)|driving|cycling|on (?:the )?roads?)\b)`,
      R`\b(?:not|never) feel(?:ing)? safe\b`,
      R`\b(?:don'?t|do not|dont) think (?:i'?m|i am|im) safe\b(?! to\b)`,
      R`\b(?:scared|afraid|frightened|terrified|petrified|worried) for my (?:life|safety)\b`,
      R`\b(?:scared|afraid|frightened|terrified|petrified|worried) (?:that )?${HURTER}(?: \w+)?(?:'ll| will| is going to|'s going to| is gonna|'s gonna| might| may| would|'d| could)(?: (?:really|actually|seriously|try to|try and|end up|come and|come back and))? (?:hurt me|harm me|hit me\b(?! (?:up|back (?:with|later|tomorrow|soon|about|on|when))\b)|attack me\b(?! (?:in|during) (?:(?:a|the|every) )?(?:debates?|comments|reviews?|interviews?)\b)|beat me\b(?!${BEAT_GAME})|strangle me|choke me|stab me|punch me|kick me\b(?! (?:out|off)\b)|slap me|shove me)\b`,
      // 'kill me' only from a partner or an unnamed 'he'/'she'/'they' ("scared my mum will kill me when she sees my grades" stays none)
      R`\b(?:scared|afraid|frightened|terrified|petrified) (?:that )?(?:he|she|they|someone|somebody|my (?:partner|boyfriend|girlfriend|husband|wife|ex|ex-?(?:partner|boyfriend|girlfriend|husband|wife)|fianc[eé]e?))(?:'ll| will| is going to|'s going to| is gonna|'s gonna| might| may| would|'d| could)(?: (?:really|actually|seriously|try to|try and|end up|come and|come back and))? kill me\b`,
      R`\b(?:scared|afraid|frightened|terrified|petrified) (?:of )?what ${HURTER}(?:'ll| will| might| may| would|'d| could| is going to|'s going to| is gonna|'s gonna) do to me\b`,
    ],
  },
};

const EMERGENCY = { label: 'Right now', detail: 'If you or anyone else is in immediate danger, call 999 (UK), 911 (US), 112 (EU) or your local emergency number.' };
const ELSEWHERE = { label: 'Anywhere else', detail: 'findahelpline.com lists free, confidential helplines in many countries.' };

export const HARM_COPY = {
  crisis: {
    title: 'Let’s pause the reframe',
    message: 'What you’ve written sounds really painful, and it matters. This isn’t something to look at from another angle — you deserve real support with it, right now. If you might act on these thoughts, or you’re not safe, please call your local emergency number. If you can, tell someone near you how you’re feeling. You don’t need the right words first.',
    resources: [
      EMERGENCY,
      { label: 'Samaritans (UK & Ireland)', detail: 'Call 116 123 — free, any time, day or night.' },
      { label: '988 Suicide & Crisis Lifeline (US)', detail: 'Call or text 988.' },
      ELSEWHERE,
    ],
  },
  crisisOther: {
    title: 'Someone might be in danger',
    message: 'If someone might be about to hurt themselves, or is in danger right now, that comes before anything else. Call your local emergency number. If it’s safe to, stay with them or keep talking to them. You don’t have to handle this alone — a helpline can also talk you through what to do.',
    resources: [
      EMERGENCY,
      { label: 'Samaritans (UK & Ireland)', detail: 'Call 116 123 — they also support people worried about someone else.' },
      { label: '988 Suicide & Crisis Lifeline (US)', detail: 'Call or text 988, including if you’re worried about someone else.' },
      ELSEWHERE,
    ],
  },
  care: {
    abuse: {
      title: 'This isn’t one to reframe',
      message: 'What you’re describing sounds like it could be abuse, and it isn’t something to find a kinder angle on. It’s not your fault, and you don’t deserve it. If you can, tell someone you trust or contact a support service — they can help you think through your options at your own pace.',
    },
    violence: {
      title: 'This isn’t one to reframe',
      message: 'Nobody has the right to hurt you. This isn’t a thought to rethink — it’s something that happened to you, and it matters. If you can, tell someone you trust, and reach out to a support service or the police when you feel ready.',
    },
    threat: {
      title: 'This isn’t one to reframe',
      message: 'Being threatened is serious, and it’s not something to talk yourself out of. Keep any messages or notes, tell someone you trust, and contact the police or a support service if you feel at risk.',
    },
    harassment: {
      title: 'This isn’t one to reframe',
      message: 'Being harassed or bullied isn’t a misunderstanding to rethink. It’s not okay, and it’s not on you to fix it by seeing it differently. If you can, save screenshots or notes, tell someone you trust, and use the reporting routes at school, at work or on the app or site.',
    },
    discrimination: {
      title: 'This isn’t one to reframe',
      message: 'Being treated unfairly because of who you are is real, and it isn’t something to explain away. Your reaction makes sense. If you want to, keep a record of what happened and talk to someone you trust, HR, a union or an advice organisation.',
    },
    unsafe: {
      title: 'Your safety comes first',
      message: 'Not feeling safe is important information, not a thinking habit. Please trust it. If you can, talk to someone you trust or a support service about what’s going on.',
    },
  },
  careResources: [
    EMERGENCY,
    { label: 'UK domestic abuse', detail: 'National Domestic Abuse Helpline: 0808 2000 247 — free, 24 hours.' },
    { label: 'US domestic violence', detail: 'National Domestic Violence Hotline: 1-800-799-7233.' },
    ELSEWHERE,
  ],
  /** Shown under any safety message, so the person never feels shut out. */
  stillHere: 'The Mallows are still here. When you’re ready, you can come back and look at something else together.',
};

/**
 * Distress words that are not a crisis or a harm disclosure but still mean
 * "keep support close and go gently" (level 'concern'). Taken from the free
 * feeling finder's original list (src/engine/interpret.js).
 */
export const CONCERN_LEXICON = [
  R`\bfeel(?:s|ing)? like (?:i'?m )?dying\b`,
  R`\bcan'?t cope\b`,
  R`\bhopeless\b`,
  R`\bworthless\b`,
  R`\bcan'?t (?:do this|take (?:it|this)|keep going) any ?more\b`,
  R`\b(?:he|she|they) (?:hit|hits|hurt|hurts) me\b`,
  R`\bunsafe at home\b`,
  R`\b(?:want|wanna|wish i could) (?:to )?(?:just )?disappear\b`,
  R`\bfalling apart\b(?= .*\b(?:can'?t|cannot)\b)`,
  // added 12 Oct 2026, review round 3: passive or ambiguous wishes (support close by, not the urgent sheet)
  R`\b(?:wish i could|want to|wanna|i'?d like to|just want to) (?:just )?(?:go to )?sleep forever\b`,
  R`\b(?:there'?s|there is|is|feels like there'?s) (?:just )?no point (?:anymore|any more|in anything|to anything|in any of it)\b`,
  R`\bwhat'?s the point (?:anymore|any more|of anything|in anything|of any of it)\b`,
  R`\bthinking (?:about|of) (?:death|my (?:own )?death)\b`,
  // 'a way out of this car park' stays none: the phrase ends there, or with 'of this / of it all'
  R`\b(?:don'?t|do not|can'?t|cannot) see (?:a|any) way out(?=\s*(?:$|[.!?,;…]|(?:anymore|any more|of (?:this|it all|here|everything|anything))\s*(?:$|[.!?,;…])))`,
  R`\bno way out (?:anymore|any more|for me)\b`,
  R`\b(?:want|need|wish|just want) (?:the|this|all the|all this) (?:pain|hurt|hurting) to (?:stop|end|go away)\b`,
  R`\b(?:hate|hating) (?:my (?:whole |own )?life|being alive|living)\b(?! (?:in|with|here|there|at|on|near|abroad|together|admin|insurance)\b)`,
  R`\b(?:i'?m|i am) (?:going to|gonna|about to|ready to) jump\s*(?:[.!]|$)`,
  // added 12 Oct 2026, safety verification
  R`\b${HURTER}(?: \w+)? hurt me\b`,
  R`\b(?:want|wanna|wish i could|need|just want) (?:to )?(?:just )?be gone\b(?! (?:by|before|from|for|when|at|in|out|on|soon|early|all day)\b)`,
  R`\b(?:want|wanna) (?:it|this) to (?:just )?(?:be over|end|stop)\b(?! (?:for a|so|soon|already|quickly)\b)`,
  R`\b(?:can'?t|cannot) keep (?:living|going on|carrying on) like this\b`,
  R`\b(?:give|giving|gave|given) up on (?:myself|everything)\b`,
  R`\bmy life is over\b`,
  R`\b(?:tired|sick) of life\b(?! (?:admin|in (?:the|this|london|my))\b)`,
  R`\b(?:said|saying) (?:all )?my goodbyes\b`,
  R`\bthis is my last (?:message|post|goodbye|note)\b`,
  R`\b(?:won'?t|will not) be (?:here|around) (?:much longer|for (?:much )?longer|for long|tomorrow|any ?more)\b`,
  R`\bmy life (?:is|feels) (?:so |completely |totally |just )?empty\b`,
  R`\b(?:don'?t|do not|can'?t) trust myself (?:not to|around|with|alone|any ?more)\b`,
  // added 13 Oct 2026, final QA: self-hatred ("I hate myself", "I really hate myself", "I'm a failure and I hate me");
  // never "I'd hate myself if I missed it", 'I hate meetings' or 'they hate me'
  R`\bi(?:'ve| have| had)? (?:(?:really|just|so|honestly|truly|genuinely|literally|actually|absolutely|completely|totally|fucking|fkn|bloody|kind of|kinda|sometimes|still|always|do|now|often|secretly|deeply|properly) )*(?:hate|hated|loathe|loathed|despise|despised|detest|detested) (?:my ?self|me|who i (?:am|was|have become|'ve become)|everything about (?:me|my ?self))\b`,
  R`\bhating (?:my ?self|who i am)\b`,
  R`\bself[- ]?(?:hatred|hate|loathing)\b`,
  // purging ("I made myself throw up"); never 'made myself a sandwich', 'made myself sick with worry'
  R`\b(?:made|make|makes|making|forced|force|forces|forcing) my ?self (?:to )?(?:throw up|vomit|puke|be sick|sick|purge|gag)\b(?! (?:with|from|of|by|over|about|worrying|thinking|laughing|stressing|overthinking|crying|eating|drinking|running|spinning)\b)`,
  R`\b(?:throw|throws|throwing|threw|thrown) up (?:on purpose|deliberately|intentionally|after (?:every|each) (?:meal|time i eat)|everything i eat|to (?:lose weight|get rid of (?:it|the food|what i ate)))\b`,
  R`\b(?:been|keep|kept|started|start|still|back to|went back to|gone back to|i'?m|i am|im) purging\b(?! (?:my|the|our|old|files|emails|clothes|wardrobe|inbox|photos|stuff|things|junk|data|cache|toys|books)\b)`,
  R`\b(?:stick|stuck|sticking|put|putting) my fingers? down my throat\b`,
  R`\bbulimi\w*`,
  // "I'm all alone and I can't take it" (the person themselves, or no one named); never 'take it with me',
  // 'take it back', 'take this job' or 'not that you can't take it'
  R`(?:^|[.!?,;:…] *|\b(?:i|and|but|so|just|honestly|really|seriously|literally|simply|actually|truly|still)(?: (?:just|really|honestly|seriously|literally|simply|actually|truly|still))? )(?:can'?t|cannot|can not) (?:take|bear) (?:it|this|any of (?:it|this))(?= *(?:$|[.,!?;:…)]|and\b|but\b|so\b|any ?more\b|any longer\b|much (?:longer|more)\b|no more\b|i'?m\b|im\b|i (?:just|really|feel|can'?t|don'?t|need|want)\b|honestly\b|lately\b|like this\b))`,
  R`(?:^|[.!?,;:…] *|\b(?:i|and|but|so|just|honestly|really|seriously|literally|simply|actually|truly|still)(?: (?:just|really|honestly|seriously|literally|simply|actually|truly|still))? )(?:can'?t|cannot|can not) (?:handle|stand|cope with) (?:it|this|life|any of (?:it|this)) (?:any ?more|any longer)\b`,
  // panic ("I'm having a panic attack", "I can't breathe I'm panicking"); 'panic' about a deadline may be concern too
  R`\b(?:panic|anxiety) attacks?\b`,
  R`\b(?:i'?m|i am|im)(?: (?:really|so|literally|actually|totally|completely|just|kind of|kinda|properly|seriously|still|always))* panick?ing\b`,
  R`\b(?:i'?m|i am|im) (?:starting|beginning|going|about) to panic\b`,
  R`\b(?:keep|kept|been|can'?t stop|cannot stop) panick?ing\b`,
  R`\b(?:hyperventilating|hyperventilated|hyperventilate)\b`,
  R`\b(?:can'?t|cannot|can not) breathe\b(?! (?:(?:properly )?through|out of|in (?:this|that|here|there|the|these|those)|with (?:this|that|the|my|a|these) (?:mask|cold|nose|blocked|hay ?fever|smoke|heat|dust)|for (?:laughing|laughter|the smoke)|from (?:laughing|laughter)|lol|lmao|haha\w*|underwater|under water)\b)`,
];

/**
 * Wanting to hurt someone else (level 'concern', category 'harm-others'):
 * support stays one tap away and nothing playful is said, but the person is
 * not treated as being in crisis. Only intent phrasing counts; the everyday
 * angry idiom "I could kill him" stays none (owner to confirm, 12 Oct 2026).
 */
export const HARM_OTHERS_LEXICON = [
  // added 12 Oct 2026, safety verification: 'I feel like hurting someone'
  R`\bfeel(?:ing)? like (?:hurting|killing|stabbing|hitting|punching|attacking|strangling|shooting) (?:him|her|them|someone|somebody|anyone|anybody|people|everyone|everybody|my \w+)\b`,
  R`\b(?:want|wanna|going|gonna|planning|plan|about|ready|tempted|need) (?:to )?(?:really |actually |just )?(?:kill|hurt|harm|stab|shoot|attack|beat up|strangle|poison) (?:him|her|them|someone|somebody|anyone|anybody|people|everyone|everybody|my (?:partner|boyfriend|girlfriend|husband|wife|ex|boss|manager|dad|father|mum|mom|mother|brother|sister|friend|flatmate|housemate|roommate|neighbou?r|teacher|colleague|son|daughter|kids?|child|baby|family))\b(?! (?:feelings|chances|pride|ego|reputation))`,
];

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}
deepFreeze(HARM_LEXICON);
deepFreeze(HARM_COPY);
deepFreeze(CONCERN_LEXICON);
deepFreeze(HARM_OTHERS_LEXICON);
