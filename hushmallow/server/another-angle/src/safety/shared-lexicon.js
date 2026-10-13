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

// Fragments of the Another Angle server's own list (server/another-angle/src/safety/extra-lexicon.js),
// merged here on 12 Oct 2026 (integration B5) so the app and the server read the same words. They are
// spelled exactly as the server spells them, so each merged pattern is the server's, character for character.
// Medicines people take too much of.
const PILLS = R`(?:pills|tablets|meds|medication|medicine|painkillers|paracetamol|ibuprofen|aspirin|co-?codamol|codeine|tramadol|sleeping (?:pills|tablets)|antidepressants|sertraline|diazepam|insulin)`;
// More than a dose: 'a load of', 'a handful of', 'the whole packet of', '30'.
const PILL_QTY = R`(?:all|all of|a load of|loads of|a lot of|lots of|a handful of|handfuls of|a bunch of|too many|(?:a|one|a whole|the whole|the entire|an entire) (?:packet|pack|box|bottle|strip|tub|blister pack)s? of|(?:two|three|four|five|several|a few|some) (?:packets|packs|boxes|bottles|strips) of|[1-9]\d|\d{3}|twenty|thirty|forty|fifty|sixty|a hundred)`;
const TOOK = R`(?:took|take|taking|have taken|has taken|had taken|'ve taken|'d taken|swallow(?:ed|ing|s)?|have swallowed|'ve swallowed|downed|necked)`;
const TAKE_PILLS = R`${TOOK} (?:just )?(?:like |about |around |maybe |nearly |over |more than |at least |way |far )?${PILL_QTY} (?:of )?(?:my |the |those |these |her |his |their |some |mum'?s |mom'?s |dad'?s )?${PILLS}\b`;
// People (not phones, plants or feelings), for third-person patterns.
const RELATIONS = R`(?:friend|best friend|bestie|mate|partner|boyfriend|girlfriend|husband|wife|ex|bf|gf|fianc[eé]e?|mum|mom|mam|dad|mother|father|parent|sister|brother|sibling|son|daughter|child|kid|cousin|niece|nephew|aunt|auntie|uncle|nan|gran|grandma|grandad|granddad|grandpa|flatmate|housemate|roommate|classmate|colleague|student|teenager|neighbou?r)`;
const SOMEONE = R`(?:she|he|they|someone|somebody|my (?:best |close |oldest |little |big |younger |older )?${RELATIONS})`;
// Body places people describe cutting.
const BODY = R`(?:arms?|legs?|wrists?|thighs?|skin|stomach|hips?|body|ankles?)`;
// What can follow 'cutting' in a self-harm disclosure ('cutting corners', 'cutting back', 'cutting my hair'
// and 'cutting and pasting' never match).
const CUT_TAIL = R`(?=\s*(?:$|[.,!?;:)…]|-|again\b|and (?!past|stick|edit|trim|chop|slic|dic)|but\b|at night\b|every\b|most (?:days|nights)\b|on my ${BODY}\b|my ${BODY}\b|since\b|for (?:weeks|months|years|a while|ages|a long time)\b|when\b|whenever\b|because\b|lately\b|recently\b|to (?:cope|feel|forget|punish|calm|stop|get through|deal|numb)\b|a lot\b|more\b|deeper\b|badly\b|secretly\b|in secret\b|cos\b|coz\b|myself\b|i\b))`;
// Perpetrators of abuse who are not partners.
const ADULT = R`(?:uncle|aunt|auntie|step-?dad|step-?father|step-?mum|step-?mom|step-?mother|step-?brother|step-?sister|cousin|teacher|coach|tutor|boss|manager|supervisor|priest|vicar|imam|rabbi|neighbou?r|grand(?:ad|dad|pa|father|ma|mother)|babysitter|carer|doctor|instructor|landlord|foster (?:dad|mum|mom|father|mother|parent|brother|sister)|(?:mum|mom|dad|mother|father)'?s (?:boyfriend|girlfriend|partner|friend|husband|wife)|family friend|older (?:boy|man|guy|kid|cousin|brother|student))`;
const PARTNER = R`(?:partner|boyfriend|girlfriend|husband|wife|ex|bf|gf|fianc[eé]e?)`;
// The server's 'living' (being alive, not 'living in London'): a slightly different list from LIVING above.
const ALIVE_LIVING = R`living(?! (?:in|with|here|there|near|at|on|together|off|like|abroad|alone|somewhere|by|next|apart|under|away|a|the|my|our)\b)`;

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
    // added 12 Oct 2026, integration B5: the Another Angle server's own guards
    // medicine taken as prescribed (every medicine the server knows)
    R`\b${TOOK} (?:all (?:of )?)?my ${PILLS} (?:on time|as prescribed|like (?:i'?m|i am|i was) supposed to|like the doctor (?:said|told me))\b`,
    R`\b(?:take|taking) (?:a handful of|loads of|a lot of|lots of) ${PILLS}(?: \w+){0,3} (?:every|each) (?:morning|day|night|evening)\b`,
    // 'no point going on holiday', 'no point going on about it'
    R`\bno (?:point|reason) (?:to |in |for )?(?:go|going) on (?:holiday|a holiday|a trip|a date|about (?:it|this|that)|and on|the trip|a course|the course|a diet)\b`,
    R`\b(?:wants|is going|was going|'s going) to die of (?:embarrassment|shame|cringe|laughter|laughing|boredom)\b`,
    // plants and illness: about a death, not about harming anyone
    R`\b(?:plants?|flowers?|succulents?|basil|tomatoes|seedlings?|cactus|orchids?)(?: \w+)? (?:want|wants|are going|is going|'re going|'s going|were going|was going) to die\b`,
    R`\b(?:the |our |my |his |her )?(?:vets?|doctors?|nurses?|consultants?|surgeons?|specialists?) (?:said|says|told (?:us|me|them|him|her)|thinks|think|warned (?:us|me)) (?:that )?(?:she|he|it|they|our \w+|my \w+|his \w+|her \w+)(?:'s| is| was| were|'re| are)? (?:going|likely|probably going|expected) to die\b`,
    // (B5 false-positive checks) too much caffeine is not an overdose; a gym injury is not self-harm
    R`\boverdos(?:e|ed|es|ing) on (?:caffeine|energy drinks?|red bull|monster|espresso|tea|coffee|sugar|chocolate)\b`,
    R`\b(?:hurting|injuring) my ?self (?:at (?:the gym|football|rugby|netball|hockey|training|practice)|(?:playing|lifting|running|exercising|working out|training|skiing|snowboarding|skating|climbing|cycling|dancing|tripping|moving house)\b)`,
    // 'I'm going to jump off the diving board' (the server's jump pattern reads 'jump off' as a bridge or a roof)
    R`\b(?:jump|jumping) (?:off|from) (?:the |a |my )?(?:diving board|high board|high dive|top board|springboard|trampoline|swing|sofa|bed|bunk bed|stage)\b`,
    // 'nobody would care if I died my hair green' (a spelling of dyed); 'I keep cutting myself off mid-sentence'
    R`\b(?:died|dyed|dying|dyeing) (?:my|her|his|their|our) (?:hair|fringe|roots|eyebrows|beard)\b`,
    R`\b(?:cut|cuts|cutting) my ?self (?:off|out|short|loose|free|some slack|a break|a slice)\b`,
    // the server's patterns without the app's everyday exceptions: 'done with living in London', 'done with life
    // admin', 'my meds ready for the trip', 'not exist on social media', 'cutting himself off from his friends',
    // 'burning herself out', 'the point in going on holiday', 'sleep and not wake up until noon'.
    // (Narrowed 13 Oct 2026, B5 review: each guard names the idiom's own object and nothing more, because a
    // guard blanks its words before every check, the server's included. A bare 'here', 'at', 'with', 'a',
    // 'some', 'bed' or 'on' let these hide 'done with living here on this earth', 'going on at all',
    // 'carrying on with my life', 'cutting herself a lot', 'starving herself some days', 'lined up for bed',
    // 'not exist on this earth' and 'never wake up at all'.)
    R`\bdone with (?:living (?:in (?!(?:pain|fear|agony|misery|despair|darkness|torment|hell|shame|silence|my (?:own )?(?:head|body|skin|pain)|this (?:body|world|pain|hell|state|life))\b)|with (?:my |our )?(?:parents|mum|mom|dad|family|flatmates?|housemates?|roommates?|in-laws|partner|boyfriend|girlfriend|ex|sister|brother|nan|gran|grandparents|kids|friends?|strangers|other people|people|him|her|them)\b|at (?:home|uni|university|college|school|my|the|mum'?s|mom'?s|dad'?s|his|her|their)\b|near|abroad|together|apart|out of|on (?:campus|benefits|a budget|a boat|my own|toast|takeaways|noodles))|life (?:admin|insurance|coaching|lessons))\b`,
    // 'I'm done with living here, I'm moving to Leeds' (a plain 'done with living here' stays crisis; the move is
    // only looked at, never blanked)
    R`\bdone with living (?:here|there)(?=[ ,;.]+(?:(?:and|so|because|cos) )?(?:i'?m|i am|we'?re|we are|i'?ll|we'?ll) (?:moving|leaving|going to move|off to|relocating)\b)`,
    R`\b(?:the|my|all the|all my|all of my) ${PILLS} (?:are )?ready for (?:the (?:trip|journey|flight|week|weekend|morning|holiday|day)|my (?:trip|journey|flight|holiday|week|mum|mom|dad|grandma|grandad)|a (?:trip|journey|flight|holiday)|work|school|holiday|travel|breakfast)\b`,
    R`\b(?:not|never) exist(?:ing)? (?:online|on (?:social media|socials|the socials|instagram|insta|tiktok|facebook|twitter|snapchat|whatsapp|the internet|the group chat|group chats?|(?:the|any|my) apps?)|in (?:the|this|that|our|my) (?:group chat|chat|office|class|team))\b`,
    R`\b(?:cuts?|cutting|burns?|burning|burnt|starves?|starving|punish(?:es|ing)?) (?:himself|herself|themselves|themself) (?:off|free|loose|short|out|a (?:slice|piece|wedge|break|fringe|new fringe)|some slack)\b`,
    R`\bsee (?:the|any) point (?:in |of )?(?:going|carrying) on (?:(?:a|an|the|this|that|our|my) (?:holiday|trip|date|course|diet|tour|cruise|walk|ride|journey|break|picnic|stage|night out|run|hike)s?|holidays?|vacation|trips?|dates?|about (?:it|this|that|him|her|them)|and on|to (?:uni|university|college|sixth form|the next (?:level|round|stage|step))|with (?:the|this|that|my|our) (?:course|degree|diet|job|project|plan|class|lessons?|band|team|book|essay|show|series|game|club|hobby|training|business|argument|conversation|relationship|studies|music lessons)s?)\b`,
    R`\b(?:sleep|asleep) and (?:never|not) wake(?: up)? (?:(?:until|till|before|at) (?:noon|midday|lunch(?:time)?|the afternoon|the weekend|(?:my|the) alarm|\d{1,2}(?::\d\d)?(?: ?(?:am|pm|o'?clock))?|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?: o'?clock)?)\b|early|in time|on time|for (?:work|school|class|uni|my alarm|the alarm))`,
    // 'my boss threatened my bonus' (a threat to a person stays care: 'threatened my family'); 'on the roof terrace'
    R`\bthreat(?:en|ened|ening|ens) (?:my|our) (?:bonus|pay rise|promotion|grades?|chances|lead|record|title|deal|plans|weekend)\b`,
    R`\bon (?:the|a) roof (?:terrace|garden|bar)\b(?! (?:edge|ledge|railings?|parapet|wall)\b)`,
    // (13 Oct 2026, B5 review: everyday wording the merged server patterns read as crisis or care in the free
    // Hushfold input. Each guard is the idiom with its own object, so the words it blanks hold no disclosure.)
    // 'jump off the call', 'jump off a meeting', 'jump from this job to a better one', 'jump from one team to another'
    R`\b(?:jump|jumping) (?:off|on|onto) (?:the|a|this|that|my|our|another) (?:call|video call|phone call|meeting|zoom|teams call|teams|chat|stream|livestream|webinar|lesson|class)\b`,
    R`\b(?:jump|jumping) (?:from|between) (?:this|that|my|one|the|a) (?:job|role|team|project|company|department|position|career|course|topic|task|idea|app|platform)s?\b`,
    // 'stop living paycheck to paycheck', 'stop living out of a suitcase', "stop living for other people's approval"
    R`\bstop living (?:pay ?(?:check|cheque) to pay ?(?:check|cheque)|hand to mouth|out of (?:a|my|boxes|bags|suitcases?)|for (?:other people|others|everyone else|the weekend|weekends|work|my job|approval|(?:other people|everyone|everyone else|my (?:parents|mum|mom|dad|family|boss))'?s? (?:approval|expectations|opinions?|dreams?|rules)))\b`,
    // 'a plan to end it with my girlfriend' (ending a relationship; 'a plan to end it with pills' stays crisis)
    R`\bend it with (?:him|her|them|my (?:new |current )?(?:girlfriend|boyfriend|partner|husband|wife|fianc[eé]e?|gf|bf|ex|date|crush|best friend|friend|mate|bestie|flatmate|housemate|roommate)|(?:the|this|that) (?:guy|girl|man|woman|boy|person|relationship|job|gym|club|band|company|group|course|subscription|contract|deal))\b(?!'?s\b)`,
    // 'no way out of this argument with my sister', 'a way out of this mess at work' (a plain 'no way out of this' stays crisis)
    R`\bway out of (?:the|this|that|my|our|a|an) (?:argument|row|fight|disagreement|dispute|misunderstanding|contract|deal|lease|tenancy|subscription|phone contract|job|course|meeting|call|car park|building|room|maze|queue|traffic|exam|essay|wedding|party|trip|group chat|chat)\b|\bway out of (?:the|this|that|my|a) mess (?:at|with|between|over) (?:work|school|uni|college|my|the|him|her|them|us)\b`,
    // "I'd be better off gone from this company" ('better off gone from this world' stays crisis)
    R`\bbetter off gone from (?:this|that|the|my|our) (?:company|job|team|firm|office|school|class|course|club|band|group|project|department|role|flat|house)\b`,
    // 'what is the point of trying any more with this diet'
    R`\bpoint (?:of|in) trying any ?more (?:with|at|on|for) (?:this|that|the|my|our|a) (?:diet|course|exam|job|project|app|game|class|team|plan|gym|instrument|language|essay|book|band|club|business|garden|recipe|test|level|puzzle|crossword)s?\b`,
    // 'he threatened us with a parking ticket' ('threatened us with a knife' stays care)
    R`\bthreat(?:en|ened|ening|ens) (?:us|me|him|her|them) with (?:a |an |the )?(?:parking ticket|parking fine|fine|ticket|detention|lawsuit|legal action|solicitor'?s letter|letter|bill|late fee|warning|complaint|bad review|one-star review|disciplinary|extra homework|homework|deadline|overtime|a pay cut|pay cut|the sack)\b`,
    // 'my son keeps hitting my daughter with pillows' (play; 'hitting my daughter with a belt' stays care)
    R`\b(?:hits?|hitting) (?:my |his |her |their |our )?(?:child|children|kids?|son|daughter|baby|brother|sister|sibling)s? with (?:a |the |his |her |their |my )?(?:pillows?|cushions?|soft toys?|teddy|teddies|balloons?|water balloons?|snowballs?|pool noodles?|foam swords?|nerf (?:darts?|guns?))\b`,
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
    // added 12 Oct 2026, integration B5: the Another Angle server's own list (W6 r3), so the app's check
    // is never the weaker one. (The server blanks the crisisOther spans before this list, so it reads
    // 'my friend took a load of pills' as someone in danger; here it reads as crisis too, self-harm copy.)
    // medicines: what has happened or is about to
    R`\b${TAKE_PILLS}`,
    R`\b(?:i|i'?ve|i have|i just) (?:just |nearly |almost )?od'?(?:d|ed)\b`,
    R`\b${TOOK} (?:way |far |a lot )?more ${PILLS} than (?:i should|i'?m supposed to|i was supposed to|it says|the (?:box|packet|label) says|i'?m meant to|i was meant to)`,
    R`\b(?:the|my|all the|all my|all of my) ${PILLS} (?:are )?(?:in front of me|lined up|counted out|ready)\b`,
    R`\b(?:stockpil\w*|hoard(?:ed|ing)?|sav(?:ed|ing) up) (?:up )?(?:all )?(?:of )?(?:my |the |some |those |these )?${PILLS}\b`,
    // cutting and other self-harm, in the first person
    R`\b(?:i(?:'ve| have| had)? (?:just |now |recently |really )?(?:started|start|been|keep|kept|begun|began|gone back to|went back to|am|was)|i'?m|i am|i was|i'?ve been|started|keep|been|(?:back|went back|gone back|relapsed) (?:to|into|with)) (?:secretly |still |really |badly |properly )?cutting(?: myself)?(?: again)?${CUT_TAIL}`,
    R`(?:^|[.!?;]\s*)cutting (?:myself )?again\b`,
    R`\b(?:want|wanting|wanted|urge|urges|tempted|need|needing) to cut(?: myself)?(?: again)?(?=\s*(?:$|[.,!?;:)…]|again\b|myself\b|and\b|but\b|so\b|when\b|because\b|tonight\b|right now\b))`,
    R`\b(?:cut|burned|burnt|hit|scratched|punched|bit|starved|bruised) myself (?:again|on purpose|deliberately|intentionally|until|till|to (?:feel|cope|punish|stop|forget|calm))\b`,
    // not existing, not having been born
    R`\b(?:want|wanna|wish i could|would rather|i'?d rather|rather|need|prefer) (?:to )?(?:just )?(?:not|never) (?:exist|be alive|have been born|wake up(?! early| at| before| so| in time| for| till| until| on time| when))\b`,
    R`\b(?:want|wanna|wish i could) (?:to )?(?:just )?(?:not|never) (?:be here|be around) (?:any ?more|at all|for good|forever|ever again)\b`,
    R`\b(?:want|wanna|wish i could|need) (?:to )?(?:just )?stop (?:existing|being alive|${ALIVE_LIVING})\b`,
    R`\b(?:want|wanna|wish i could|need) (?:to )?(?:just )?(?:vanish|be gone|disappear) (?:forever|for good|permanently|for ever)\b`,
    R`\bcease to exist\b`,
    R`\b(?:i'?d|i would|i'?m|i am|everyone'?d|everyone would|they'?d|they would) be better off (?:gone|not here|not alive|not around|not existing|if i (?:was|were) gone)\b`,
    R`\bi'?m (?:going to|gonna|about to|ready to|thinking (?:of|about)) jump(?:ing)?(?= *(?:$|[.,!?;]|off\b|from\b|in front\b|tonight\b))`,
    R`\bwish (?:i'?d|i had|i) (?:never|not) (?:been |be )?born\b`,
    R`\bshould(?: have|'ve) never been born\b`,
    R`\bshould (?:never have|never'?ve|have never|'ve never) been born\b`,
    // no point in being alive
    R`\bwhat(?:'?s| is) the point (?:of|in) (?:me )?(?:${ALIVE_LIVING}|being alive|going on|carrying on|me being here|being here any ?more|existing|trying any ?more)\b`,
    R`\bno (?:point|reason|use|sense) (?:in |of |to |for )?(?:me )?(?:being alive|staying alive|existing|${ALIVE_LIVING}|going on(?! (?:about|and on|with|holiday|a |the |to |at ))|carrying on(?! (?:with|about|at|like))|waking up(?! early| at| before| so| for)|being here any ?more|trying any ?more)\b`,
    R`\b(?:don'?t|do not|can'?t|cannot|can not) see (?:the|any) point (?:in |of )?(?:me )?(?:${ALIVE_LIVING}|being alive|going on|carrying on|life|existing|being here)\b`,
    R`\b(?:tired|sick) of (?:being alive|existing|life itself|${ALIVE_LIVING}(?= *(?:$|[.,!?;]|any ?more|and)))\b`,
    R`\bwant (?:my life|it all|everything) to (?:be over|end)(?: now| for good| forever)?(?= *(?:$|[.,!?;]|now|for good|forever|and))`,
    R`\bwant (?:it all|everything|it) to (?:stop|end) (?:for good|forever|permanently)\b`,
    R`\b(?:want|wanna|wish i could) (?:to )?disappear and never come back\b`,
    R`\b(?:so |completely |totally |just |really )?done with (?:life|living|being alive|existing)\b`,
    R`\b(?:no|(?:don'?t|do not|can'?t|cannot) see (?:a|any)) way out\b(?! of (?:the|this|that|my|our|a) (?:contract|deal|lease|job|course|meeting|car park|building|room|maze|queue|traffic))`,
    // sleep and never wake up
    R`\b(?:want|wanna|wish i could|wish i would|would like) (?:to )?(?:just )?(?:go to )?sleep (?:forever|for ever|and never wake(?: up)?|and not wake(?: up)?)\b`,
    R`\b(?:fall asleep|go to sleep|sleep|close my eyes) and (?:never|not) (?:wake|open them)\b`,
    // nobody would care
    R`\b(?:anyone|anybody|nobody|no one|no-one|noone) would (?:even |really |ever )?(?:notice|care|miss me) if i (?:wasn'?t|weren'?t|was not|were not) (?:around|here|alive|there)(?: any ?more)?\b`,
    R`\b(?:anyone|anybody) would (?:even |really |ever )?(?:notice|care|miss me) if i (?:was|were) gone\b`,
    R`\b(?:nobody|no one|no-one|noone|anyone|anybody|who) would (?:even |really |ever )?(?:care|notice|miss me) if i (?:died|disappeared|killed myself|was dead|were dead)\b`,
    // plans and places
    R`\b(?:a|my|the) plan to (?:end it|end things|end my life|die|kill myself|not be here)\b`,
    R`\b(?:i'?m|i am) (?:standing |sitting )?on (?:the|a) (?:edge of (?:the|a) )?(?:bridge|ledge|roof|cliff edge|platform edge)\b`,
    R`\b(?:keep|been|always|can'?t stop) thinking (?:about|of) (?:dying|being dead|not waking up|not being alive)\b`,
    R`\bways to (?:die|kill myself|end it(?! with)|end my life)\b`,
    R`\bhow many ${PILLS} (?:would it take|does it take|would kill|to die|until)\b`,
    R`\bcan'?t (?:keep )?(?:living|live|going on|go on) like this any ?more\b`,
    R`\b(?:keep|been|kept|started|start|am|i'?m) (?:scratching|hitting|punching|biting|bruising) myself (?:until|till|on purpose|deliberately|again|to (?:feel|cope|punish|stop|calm))\b`,
    R`\bi'?m (?:just |only )?a burden\b(?! (?:on|to) (?:the|my|our) (?:team|project|budget|company|business))`,
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
    R`\b(?:is|are|am|'s|'re|'m) in (?:immediate |real |serious )?danger\b(?! of)`,
    R`\b(?:he|she|they|someone|somebody) (?:is|are|'s|'re) not breathing\b`,
    // added 12 Oct 2026, integration B5: the Another Angle server's own list (W6 r3)
    R`\b${SOMEONE} (?:just )?(?:took|has taken|have taken|had taken|swallowed|has swallowed) (?:an overdose|too many (?:pills|tablets)|${PILL_QTY} (?:of )?(?:my |the |her |his |their |some )?${PILLS})\b`,
    R`\b(?:said|says|keeps saying|told me|tells me|texted|messaged|posted) (?:that )?(?:she|he|they)(?:'d| would| wants? to| is going to|'s going to) (?:kill|hurt|harm) (?:himself|herself|themselves|themself)\b`,
    // someone else wanting to die or end their life
    R`\b(?:wants?|wanted|wanting|going|gonna|planning|plans|plan|trying|tried|threaten(?:s|ed|ing)?|thinking (?:about|of)|talk(?:s|ed|ing)? about|considering|decided|ready) (?:to )?end(?:ing)? (?:her|his|their) (?:own )?life\b`,
    R`\b${SOMEONE}(?: (?:says|said|keeps saying|told me|tells me|texted|messaged)(?: that)?(?: (?:she|he|they))?)?(?:'s| is| are|'re| was| were| keeps| has been| had been)? (?:wants?|wanted|wanting|planning|plans|trying|tried|threatening|threatens|threatened) to (?:die|end it(?: all)?(?! (?:with|between|off))|disappear (?:forever|for good)|not (?:be here|exist|wake up))\b`,
    R`\b${SOMEONE}(?: (?:says|said|told me|keeps saying)(?: that)?(?: (?:she|he|they))?)? (?:doesn'?t|does not|don'?t|do not|no longer|didn'?t|did not) want(?:s)? to (?:${ALIVE_LIVING}|be alive|be here any ?more|exist|wake up|go on)\b`,
    R`\b${SOMEONE}(?: has| have| had|'s| is| was)? (?:just )?overdosed\b`,
    R`\b${SOMEONE}(?:'s| is| has been| was| keeps| started| has started)? self[- ]?harm\w*`,
    R`\b${SOMEONE}(?: (?:says|said|told me|keeps saying|texted)(?: that)?(?: (?:she|he|they))?)?(?:'s| is| are|'re| was| were)? (?:going to|gonna|about to|threatening to|planning to) jump(?= *(?:$|[.,!?;]|off\b|from\b|in front\b|tonight\b))`,
    // self-harm by someone else, habitual or deliberate ('cut herself a slice', 'cut himself shaving' are not this)
    R`\b(?:cuts|cutting|burns|burning|starves|starving|punishes|punishing) (?:himself|herself|themselves|themself)\b`,
    R`\b(?:cut|burned|burnt|starved|hurt|harmed) (?:himself|herself|themselves|themself) (?:again|on purpose|deliberately|intentionally)\b`,
    R`\b(?:has|have|had|keeps?|started|been) (?:been )?(?:cutting|burning|starving|harming|hurting) (?:himself|herself|themselves|themself)\b`,
    R`\b${SOMEONE}(?:'s| is| has| have|'ve| had| was| were)? (?:been |started |starting |begun |gone back to |back to |keeps |still )?cutting(?: again)?(?=\s*(?:$|[.,!?;:)]|again\b|and (?!past|stick)|at night\b|on (?:her|his|their) |(?:her|his|their) ${BODY}\b))`,
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
      R`\b(?:my )?(?:uncle|step-?dad|step-?father|step-?brother|cousin|teacher|coach|tutor|neighbou?r|grandad|granddad|grandpa|babysitter|carer|(?:mum|mom|dad)'?s (?:boyfriend|girlfriend|partner|friend)|family friend|boss|priest|doctor)(?: \w+){0,2} (?:touches|touched|keeps touching|kept touching|is touching|tries to touch|tried to touch|gropes|groped) me\b(?! on the (?:shoulder|arm|back|hand) (?:to|and said|when|as|for)\b)`,
      R`\btouched me (?:without|when i|even though|after i)\b`,
      R`\bforced me\b`,
      R`\bwon'?t let me (?:leave|go out|see (?:my )?(?:friends|family)|have (?:my own )?money|work|have my phone)\b`,
      R`\bcontrols? (?:all )?(?:of )?my (?:money|phone|messages|life|food)\b`,
      R`\b(?:goes|went|keeps going) through my phone\b`,
      // added 12 Oct 2026, integration B5: the Another Angle server's own list (W6 r3)
      R`\b(?:hurts?|hurting|hits?|hitting) (?:my )?(?:child|children|kid|kids|son|daughter|baby)\b(?!'s)`,
      R`\b(?:makes?|made|making) me (?:to )?(?:do sexual|do sex|have sex|sleep with (?:him|her|them))\b`,
      // monitoring as control
      R`\b(?:checks?|checking|reads?|reading|tracks?|tracking) (?:all )?(?:of )?my (?:phone|messages|texts|location|emails)\b(?= .*\b(?:every|always|all the time|each|won'?t let|makes? me|demands?|without asking)\b)`,
      // sexual coercion
      R`\b(?:forces?|forcing|forced|makes|made|making|pressur(?:es|ed|ing)|push(?:es|ed|ing)) me (?:to (?:have sex|sleep with (?:him|her|them|his|other|people|men|women|someone)|do (?:sexual|sex|stuff in bed|things in bed)|perform sex|send (?:nudes|naked)|watch porn|touch (?:him|her|them))|into (?:having sex|sex|sleeping with|sexual|doing sexual))\b`,
      R`\b${PARTNER}(?: \w+)? (?:forces?|forcing|pressures?|pressuring) me (?:to|into) (?:do(?:ing)? )?(?:things|stuff|it)\b`,
      R`\b(?:doesn'?t|does not|won'?t|wouldn'?t|didn'?t|did not) stop when i (?:say|said|tell (?:him|her|them)|told (?:him|her|them)) (?:no|stop|to stop)\b`,
      R`\bi (?:didn'?t|did not|never|couldn'?t|could not|was too (?:drunk|out of it|young) to) consent\b`,
      // touching by an adult or someone in authority
      R`\b(?:my )?${ADULT}(?: \w+){0,2} (?:touches|touched|keeps touching|kept touching|has touched|is touching|tries to touch|tried to touch|gropes|groped|keeps groping) me\b(?! on the (?:shoulder|arm|back|hand) (?:to|and said|when|as|for)\b)`,
      R`\b(?:my )?${ADULT}(?: \w+){0,2} (?:feels|felt) me up\b`,
      R`\btouch(?:es|ed|ing)? me (?:inappropriately|there|down there|in places|in my private|where i (?:don'?t|didn'?t) want|under my|between my|on my (?:private|privates|chest|breasts?|boobs|bum|bottom|thighs?|crotch|genitals))`,
      R`\b(?:touches|touched|comes into my room and touches) me (?:at night|in bed|in my bed|in my room|when i'?m asleep|when i was asleep|while i(?:'m| am| was) (?:asleep|sleeping)|when (?:no one|nobody|mum|mom|dad)(?:'s| is)? (?:around|home|looking|out))\b`,
      R`\bforced (?:himself|herself|themselves) on me\b`,
      R`\b(?:he|she|they|my ${PARTNER}|my (?:uncle|step-?dad|step-?father|step-?mum|step-?mom|step-?brother|cousin|neighbou?r|babysitter|(?:mum|mom|dad)'?s (?:boyfriend|girlfriend|partner|friend)|family friend))(?: \w+)? (?:made|makes|forced|forces|pressured|pressures|pushed|pushes) me (?:to )?(?:do|doing) (?:things|stuff)(?: \w+){0,2} (?:i|that i) (?:didn'?t|did not|don'?t|do not) want\b`,
      R`\b(?:locks?|locked|locking) me (?:in|up in) (?:the|my|a|his|her|their) (?:room|bedroom|house|flat|cupboard|bathroom|car|shed|garage)\b`,
      R`\b(?:touches|touched|touching) me and i (?:hate|don'?t like|do not like|feel sick|felt sick|can'?t say no|froze|freeze|didn'?t want)\b`,
    ],
    violence: [
      R`\b(?:he|she|they|my (?:partner|boyfriend|girlfriend|husband|wife|ex|dad|father|mum|mom|mother|stepdad|stepmum|stepmom|brother|sister|boss|teacher|flatmate|roommate|son|daughter)|someone|somebody)(?: has| had)? (?:hit|hits|punched|punches|kicked|kicks|slapped|slaps|choked|chokes|strangled|strangles|beat|beats|shoved|shoves|smacked|smacks|attacked|attacks|grabbed|grabs) me\b`,
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
      // added 12 Oct 2026, integration B5: the Another Angle server's own list (W6 r3)
      R`\bmy (?:step-?(?:dad|mum|mom|father|mother|brother|sister)|uncle|aunt|auntie|cousin|grand(?:ad|dad|pa|father|ma|mother|mum)|nan|gran|carer|foster (?:dad|mum|mom|father|mother|parent)|coach|teacher|ex-?(?:boyfriend|girlfriend|husband|wife|partner)|(?:mum|mom|dad)'?s (?:boyfriend|girlfriend|partner|husband|wife))(?: has| had)? (?:hit|hits|punched|punches|kicked|kicks|slapped|slaps|choked|chokes|strangled|strangles|beat|beats|shoved|shoves|smacked|smacks|attacked|attacks|grabbed|grabs|burns|burned|burnt|whips|whipped|belts|belted) me\b`,
      R`\b${SOMEONE}(?: (?:sometimes|often|always|still|usually|occasionally|even|also|then|just|literally|actually|has|had|keeps|kept|has been|started|again))+ (?:hit(?:s|ting)?|punch(?:es|ed|ing)?|kick(?:s|ed|ing)?|slap(?:s|ped|ping)?|chok(?:es|ed|ing)|strangl(?:es|ed|ing)|beat(?:s|ing)?|shov(?:es|ed|ing)|smack(?:s|ed|ing)?) me\b`,
      R`\b(?:put|puts|had|has|wrapped) (?:his|her|their) hands? (?:round|around) my (?:neck|throat)\b`,
      // violence at home towards someone else in the family
      R`\b(?:hits|hit|beats|beat|punches|punched|kicks|kicked|strangles|strangled|chokes|choked|slaps|slapped|batters|battered) (?:my|our) (?:mum|mom|mother|dad|father|sister|brother|nan|gran|grandma|little brother|little sister)\b(?!'s)`,
    ],
    threat: [
      R`\bthreat(?:en|ened|ening|ens) (?:me|to)\b`,
      R`\bthreatening (?:messages|texts|calls|emails|me)\b`,
      R`\bdeath threats?\b`,
      R`\b(?:said|says|told me) (?:he|she|they)(?:'d| would| will|'ll) (?:kill|hurt|hit|find) me\b`,
      R`\bblackmail\w*`,
      R`\b(?:going to|gonna|will|threatened to) (?:leak|share|post|send) (?:my )?(?:photos|pictures|nudes|videos)\b`,
      // added 12 Oct 2026, integration B5: the Another Angle server's own list (W6 r3)
      R`\bthreat(?:en|ened|ening|ens) (?:my|us)\b`,
      R`\b(?:'d|would|will|'ll|going to|gonna) (?:leak|share|post|send|show|spread) (?:my|the) (?:nudes|naked (?:photos|pictures|pics|videos)|intimate (?:photos|pictures|videos)|private (?:photos|pictures|videos))\b`,
      R`\b(?:said|says|told me) (?:he|she|they)(?:'d| would| will|'ll| is going to|'s going to) (?:hurt|hit|kill|beat) me if i (?:leave|left|tell|told|go|went|try to leave|report|call|speak)\b`,
      R`\b(?:hurt|hit|kill|beat) me if i (?:leave|try to leave|go to the police|report (?:him|her|them|it)|call the police)\b`,
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
      // added 12 Oct 2026, integration B5: the Another Angle server's own list (W6 r3)
      R`\b(?:keeps?|kept|keep on|always) calling me (?:names|\w+ names)\b`,
      R`\b(?:keeps?|kept) touching (?:me|my (?:shoulder|back|leg|legs|hair|waist|arm|knee|bum|bottom|hand|neck))\b`,
      R`\bgrop(?:es|ed|ing) me\b`,
      R`\b(?:a|an|some|this|that|the) (?:older )?(?:man|guy|woman|stranger|bloke|boy|lad|girl)(?: \w+){0,3} (?:touched|groped|grabbed|rubbed (?:himself |herself )?(?:up )?against|felt) me\b(?! on the (?:shoulder|arm) (?:to|and said)\b)`,
      R`\brubbed (?:himself|herself|themselves) (?:up )?against me\b`,
      R`\b(?:asks?|asked|asking|keeps asking|kept asking|pressur\w+ me) (?:me )?(?:for|to send(?: him| her| them)?) (?:nudes|naked (?:pics|photos|pictures)|pics of my body)\b`,
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
      // added 12 Oct 2026, integration B5: the Another Angle server's own list (W6 r3)
      R`\b(?:scared|afraid|frightened|terrified) for my (?:life|safety)\b`,
      R`\b(?:scared|afraid|frightened|terrified) (?:that )?(?:he|she|they|my ${PARTNER})(?:'ll| will| is going to|'s going to| might| would|'d) (?:hurt|hit|attack|beat|kill) me\b`,
      // family: 'kill me' is left out ('scared my mum will kill me when she sees my grades')
      R`\b(?:scared|afraid|frightened|terrified) (?:that )?my (?:dad|father|mum|mom|mother|step-?dad|step-?mum|step-?mom|brother|uncle)(?:'ll| will| is going to|'s going to| might| would|'d) (?:hurt|hit|attack|beat) me\b`,
    ],
  },
};

const EMERGENCY = { label: 'Right now', detail: 'If you or anyone else is in immediate danger, call 999 (UK), 911 (US), 112 (EU) or your local emergency number.' };
const ELSEWHERE = { label: 'Anywhere else', detail: 'findahelpline.com lists free, confidential helplines in many countries.' };

export const HARM_COPY = {
  crisis: {
    // (B5: the titles no longer say 'reframe', a word the feature never uses; the server's own titles, W6 r3)
    title: 'Let’s pause Another Angle',
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
      title: 'This one needs real support',
      message: 'What you’re describing sounds like it could be abuse, and it isn’t something to find a kinder angle on. It’s not your fault, and you don’t deserve it. If you can, tell someone you trust or contact a support service — they can help you think through your options at your own pace.',
    },
    violence: {
      title: 'This one needs real support',
      message: 'Nobody has the right to hurt you. This isn’t a thought to rethink — it’s something that happened to you, and it matters. If you can, tell someone you trust, and reach out to a support service or the police when you feel ready.',
    },
    threat: {
      title: 'This one needs real support',
      message: 'Being threatened is serious, and it’s not something to talk yourself out of. Keep any messages or notes, tell someone you trust, and contact the police or a support service if you feel at risk.',
    },
    harassment: {
      title: 'This one needs real support',
      message: 'Being harassed or bullied isn’t a misunderstanding to rethink. It’s not okay, and it’s not on you to fix it by seeing it differently. If you can, save screenshots or notes, tell someone you trust, and use the reporting routes at school, at work or on the app or site.',
    },
    discrimination: {
      title: 'This one needs real support',
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
