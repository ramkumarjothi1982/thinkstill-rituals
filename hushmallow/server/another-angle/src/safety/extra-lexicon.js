// Server-only additions to the shared lexicon (src/safety/shared-lexicon.js is
// a verbatim copy of the app's and must not be edited here). These are extra
// ways of saying things the shared list already treats as crisis or care.
// If the app adopts any of them, delete them here.
//
// Same format as the shared lexicon: regular-expression sources as strings,
// matched case-insensitively against tidied text (straight quotes, single
// spaces) after every idiom guard has been blanked out. Each entry has a
// regression test in test/safety.test.js, and so does the everyday wording it
// must leave alone.
//
// How the server reads them (src/safety/index.js):
//   crisis       first person; checked after the crisisOther spans below are
//                blanked, so "my friend took a load of pills" is not about the writer
//   crisisOther  someone else in danger
//   care         harm done to the person (abuse, violence, threats, harassment, unsafe)

const R = String.raw;

// --- shared fragments ---------------------------------------------------------

// Medicines people take too much of.
const PILLS = R`(?:pills|tablets|meds|medication|medicine|painkillers|paracetamol|ibuprofen|aspirin|co-?codamol|codeine|tramadol|sleeping (?:pills|tablets)|antidepressants|sertraline|diazepam|insulin)`;
// More than a dose: "a load of", "a handful of", "the whole packet of", "30".
const PILL_QTY = R`(?:all|all of|a load of|loads of|a lot of|lots of|a handful of|handfuls of|a bunch of|too many|(?:a|one|a whole|the whole|the entire|an entire) (?:packet|pack|box|bottle|strip|tub|blister pack)s? of|(?:two|three|four|five|several|a few|some) (?:packets|packs|boxes|bottles|strips) of|[1-9]\d|\d{3}|twenty|thirty|forty|fifty|sixty|a hundred)`;
const TOOK = R`(?:took|take|taking|have taken|has taken|had taken|'ve taken|'d taken|swallow(?:ed|ing|s)?|have swallowed|'ve swallowed|downed|necked)`;
const TAKE_PILLS = R`${TOOK} (?:just )?${PILL_QTY} (?:of )?(?:my |the |those |these |her |his |their |some |mum'?s |mom'?s |dad'?s )?${PILLS}\b`;

// People (not phones, plants or feelings) for third-person patterns.
const PEOPLE = R`(?:friend|best friend|bestie|mate|partner|boyfriend|girlfriend|husband|wife|ex|bf|gf|fianc[eé]e?|mum|mom|mam|dad|mother|father|parent|sister|brother|sibling|son|daughter|child|kid|cousin|niece|nephew|aunt|auntie|uncle|nan|gran|grandma|grandad|granddad|grandpa|flatmate|housemate|roommate|classmate|colleague|student|teenager|neighbou?r)`;
const SOMEONE = R`(?:she|he|they|someone|somebody|my (?:best |close |oldest |little |big |younger |older )?${PEOPLE})`;
// Body places people describe cutting.
const BODY = R`(?:arms?|legs?|wrists?|thighs?|skin|stomach|hips?|body|ankles?)`;
// What can follow "cutting" in a self-harm disclosure (so "cutting corners",
// "cutting back", "cutting my hair" and "cutting and pasting" never match).
const CUT_TAIL = R`(?=\s*(?:$|[.,!?;:)…]|-|again\b|and (?!past|stick|edit|trim|chop|slic|dic)|but\b|at night\b|every\b|most (?:days|nights)\b|on my ${BODY}\b|my ${BODY}\b|since\b|for (?:weeks|months|years|a while|ages|a long time)\b|when\b|whenever\b|because\b|lately\b|recently\b|to (?:cope|feel|forget|punish|calm|stop|get through|deal|numb)\b|a lot\b|more\b|deeper\b|badly\b|secretly\b|in secret\b|cos\b|coz\b|myself\b|i\b))`;
// Perpetrators of abuse who are not partners.
const ADULT = R`(?:uncle|aunt|auntie|step-?dad|step-?father|step-?mum|step-?mom|step-?mother|step-?brother|step-?sister|cousin|teacher|coach|tutor|boss|manager|supervisor|priest|vicar|imam|rabbi|neighbou?r|grand(?:ad|dad|pa|father|ma|mother)|babysitter|carer|doctor|instructor|landlord|foster (?:dad|mum|mom|father|mother|parent|brother|sister)|(?:mum|mom|dad|mother|father)'?s (?:boyfriend|girlfriend|partner|friend|husband|wife)|family friend|older (?:boy|man|guy|kid|cousin|brother|student))`;
const PARTNER = R`(?:partner|boyfriend|girlfriend|husband|wife|ex|bf|gf|fianc[eé]e?)`;
// "living" as in "living in London" is not "being alive".
const LIVING = R`living(?! (?:in|with|here|there|near|at|on|together|off|like|abroad|alone|somewhere|by|next|apart|under|away|a|the|my|our)\b)`;

export const EXTRA_LEXICON = {
  // Spans blanked before any check (as the shared lexicon's idiomGuards).
  idiomGuards: [
    // A flat battery, not a person.
    R`\b(?:my |the |our )?(?:phone|battery|laptop|tablet|ipad|kindle|headphones|airpods|earbuds|controller|torch|car battery|charger)(?:'s| is| was| will| keeps)?(?: about| going| gonna)? to die\b`,
    // Medicine taken as prescribed.
    R`\b${TOOK} (?:all (?:of )?)?my ${PILLS} (?:on time|as prescribed|like (?:i'?m|i am|i was) supposed to|like the doctor (?:said|told me))\b`,
    R`\b(?:take|taking) (?:a handful of|loads of|a lot of|lots of) ${PILLS}(?: \w+){0,3} (?:every|each) (?:morning|day|night|evening)\b`,
    // "No point going on holiday / going on about it".
    R`\bno (?:point|reason) (?:to |in |for )?(?:go|going) on (?:holiday|a holiday|a trip|a date|about (?:it|this|that)|and on|the trip|a course|the course|a diet)\b`,
    // "wants to die of embarrassment" (the shared guard only has "want/wanted/wanna").
    R`\b(?:wants|is going|was going|'s going) to die of (?:embarrassment|shame|cringe|laughter|laughing|boredom)\b`,
    // Plants and illness: about a death, not about harming anyone.
    R`\b(?:plants?|flowers?|succulents?|basil|tomatoes|seedlings?|cactus|orchids?)(?: \w+)? (?:want|wants|are going|is going|'re going|'s going|were going|was going) to die\b`,
    R`\b(?:the |our |my |his |her )?(?:vets?|doctors?|nurses?|consultants?|surgeons?|specialists?) (?:said|says|told (?:us|me|them|him|her)|thinks|think|warned (?:us|me)) (?:that )?(?:she|he|it|they|our \w+|my \w+|his \w+|her \w+)(?:'s| is| was| were|'re| are)? (?:going|likely|probably going|expected) to die\b`,
  ],
  crisis: [
    // Medicines: what has happened or is about to.
    R`\b${TAKE_PILLS}`,
    R`\b(?:i|i'?ve|i have|i just) (?:just |nearly |almost )?od'?(?:d|ed)\b`,
    R`\b(?:the|my|all the|all my|all of my) ${PILLS} (?:are )?(?:in front of me|lined up|counted out|ready)\b`,
    R`\b(?:stockpil\w*|hoard(?:ed|ing)?|sav(?:ed|ing) up) (?:up )?(?:all )?(?:of )?(?:my |the |some |those |these )?${PILLS}\b`,
    // Cutting and other self-harm, in the first person.
    R`\b(?:i(?:'ve| have| had)? (?:just |now |recently |really )?(?:started|start|been|keep|kept|begun|began|gone back to|went back to|am|was)|i'?m|i am|i was|i'?ve been|started|keep|been|(?:back|went back|gone back|relapsed) (?:to|into|with)) (?:secretly |still |really |badly |properly )?cutting(?: myself)?(?: again)?${CUT_TAIL}`,
    R`(?:^|[.!?;]\s*)cutting (?:myself )?again\b`,
    R`\b(?:cut|burned|burnt|hit|scratched|punched|bit|starved|bruised) myself (?:again|on purpose|deliberately|intentionally|until|till|to (?:feel|cope|punish|stop|forget|calm))\b`,
    // Not existing, not having been born.
    R`\b(?:want|wanna|wish i could|would rather|i'?d rather|rather|need|prefer) (?:to )?(?:just )?(?:not|never) (?:exist|be alive|have been born|wake up(?! early| at| before| so| in time| for| till| until| on time| when))\b`,
    R`\b(?:want|wanna|wish i could) (?:to )?(?:just )?(?:not|never) (?:be here|be around) (?:any ?more|at all|for good|forever|ever again)\b`,
    R`\b(?:want|wanna|wish i could|need) (?:to )?(?:just )?stop (?:existing|being alive|${LIVING})\b`,
    R`\bwish i (?:didn'?t|did not) exist\b`,
    R`\bwish (?:i'?d|i had|i) (?:never|not) (?:been |be )?born\b`,
    R`\bshould(?: have|'ve) never been born\b`,
    R`\bshould (?:never have|never'?ve|have never|'ve never) been born\b`,
    // No point in being alive.
    R`\bwhat(?:'?s| is) the point (?:of|in) (?:me )?(?:${LIVING}|being alive|going on|carrying on|me being here|being here any ?more|existing|trying any ?more)\b`,
    R`\bno (?:point|reason|use|sense) (?:in |of |to |for )?(?:me )?(?:being alive|staying alive|existing|${LIVING}|going on(?! (?:about|and on|with|holiday|a |the |to |at ))|carrying on(?! (?:with|about|at|like))|waking up(?! early| at| before| so| for)|being here any ?more|trying any ?more)\b`,
    R`\b(?:don'?t|do not|can'?t|cannot|can not) see (?:the|any) point (?:in |of )?(?:me )?(?:${LIVING}|being alive|going on|carrying on|life|existing|being here)\b`,
    R`\b(?:tired|sick) of (?:being alive|existing|life itself|${LIVING}(?= *(?:$|[.,!?;]|any ?more|and)))\b`,
    R`\bwant (?:my life|it all|everything) to (?:be over|end)(?: now| for good| forever)?(?= *(?:$|[.,!?;]|now|for good|forever|and))`,
    R`\bwant (?:it all|everything|it) to (?:stop|end) (?:for good|forever|permanently)\b`,
    R`\b(?:want|wanna|wish i could) (?:to )?disappear and never come back\b`,
    R`\bsewer ?slide\b`,
    R`\b(?:so |completely |totally |just |really )?done with (?:life|living|being alive|existing)\b`,
    R`\b(?:no|(?:don'?t|do not|can'?t|cannot) see (?:a|any)) way out\b(?! of (?:the|this|that|my|our|a) (?:contract|deal|lease|job|course|meeting|car park|building|room|maze|queue|traffic))`,
    // Sleep and never wake up.
    R`\b(?:want|wanna|wish i could|wish i would|would like) (?:to )?(?:just )?(?:go to )?sleep (?:forever|for ever|and never wake(?: up)?|and not wake(?: up)?)\b`,
    R`\b(?:fall asleep|go to sleep|sleep|close my eyes) and (?:never|not) (?:wake|open them)\b`,
    // Nobody would care.
    R`\b(?:anyone|anybody|nobody|no one|no-one|noone) would (?:even |really |ever )?(?:notice|care|miss me) if i (?:wasn'?t|weren'?t|was not|were not) (?:around|here|alive|there)(?: any ?more)?\b`,
    R`\b(?:anyone|anybody) would (?:even |really |ever )?(?:notice|care|miss me) if i (?:was|were) gone\b`,
    R`\b(?:nobody|no one|no-one|noone|anyone|anybody|who) would (?:even |really |ever )?(?:care|notice|miss me) if i (?:died|disappeared|killed myself|was dead|were dead)\b`,
    // Plans and places.
    R`\b(?:a|my|the) plan to (?:end it|end things|end my life|die|kill myself|not be here)\b`,
    R`\b(?:i'?m|i am) (?:standing |sitting )?on (?:the|a) (?:edge of (?:the|a) )?(?:bridge|ledge|roof|cliff edge|platform edge)\b`,
    R`\b(?:keep|been|always|can'?t stop) thinking (?:about|of) (?:dying|being dead|not waking up|not being alive)\b`,
    R`\bways to (?:die|kill myself|end it(?! with)|end my life)\b`,
    R`\bhow many ${PILLS} (?:would it take|does it take|would kill|to die|until)\b`,
    R`\bcan'?t (?:keep )?(?:living|live|going on|go on) like this any ?more\b`,
    R`\b(?:keep|been|kept|started|start|am|i'?m) (?:scratching|hitting|punching|biting|bruising) myself (?:until|till|on purpose|deliberately|again|to (?:feel|cope|punish|stop|calm))\b`,
    R`\blife (?:is|feels|seems) (?:so |completely |totally |just )?(?:pointless|meaningless)\b`,
    R`\bi'?m (?:just |only )?a burden\b(?! (?:on|to) (?:the|my|our) (?:team|project|budget|company|business))`,
  ],
  crisisOther: [
    R`\b${SOMEONE} (?:just )?(?:took|has taken|have taken|had taken|swallowed|has swallowed) (?:an overdose|too many (?:pills|tablets)|${PILL_QTY} (?:of )?(?:my |the |her |his |their |some )?${PILLS})\b`,
    R`\b(?:said|says|keeps saying|told me|tells me|texted|messaged|posted) (?:that )?(?:she|he|they)(?:'d| would| wants? to| is going to|'s going to) (?:kill|hurt|harm) (?:himself|herself|themselves|themself)\b`,
    // Someone else wanting to die or end their life.
    R`\b(?:wants?|wanted|wanting|going|gonna|planning|plans|plan|trying|tried|threaten(?:s|ed|ing)?|thinking (?:about|of)|talk(?:s|ed|ing)? about|considering|decided|ready) (?:to )?end(?:ing)? (?:her|his|their) (?:own )?life\b`,
    R`\b${SOMEONE}(?: (?:says|said|keeps saying|told me|tells me|texted|messaged)(?: that)?(?: (?:she|he|they))?)?(?:'s| is| are|'re| was| were| keeps| has been| had been)? (?:wants?|wanted|wanting|planning|plans|trying|tried|threatening|threatens|threatened) to (?:die|end it(?: all)?(?! (?:with|between|off))|disappear (?:forever|for good)|not (?:be here|exist|wake up))\b`,
    R`\b${SOMEONE}(?: (?:says|said|told me|keeps saying)(?: that)?(?: (?:she|he|they))?)? (?:doesn'?t|does not|don'?t|do not|no longer|didn'?t|did not) want(?:s)? to (?:${LIVING}|be alive|be here any ?more|exist|wake up|go on)\b`,
    R`\b${SOMEONE}(?: has| have| had|'s| is| was)? (?:just )?overdosed\b`,
    R`\b${SOMEONE}(?:'s| is| has been| was| keeps| started| has started)? self[- ]?harm\w*`,
    // Self-harm by someone else.
    // Habitual or deliberate forms only: "cut herself a slice", "cut himself shaving" are not this.
    R`\b(?:cuts|cutting|burns|burning|starves|starving|punishes|punishing) (?:himself|herself|themselves|themself)\b`,
    R`\b(?:cut|burned|burnt|starved|hurt|harmed) (?:himself|herself|themselves|themself) (?:again|on purpose|deliberately|intentionally)\b`,
    R`\b(?:has|have|had|keeps?|started|been) (?:been )?(?:cutting|burning|starving|harming|hurting) (?:himself|herself|themselves|themself)\b`,
    R`\b${SOMEONE}(?:'s| is| has| have|'ve| had| was| were)? (?:been |started |starting |begun |gone back to |back to |keeps |still )?cutting(?: again)?(?=\s*(?:$|[.,!?;:)]|again\b|and (?!past|stick)|at night\b|on (?:her|his|their) |(?:her|his|their) ${BODY}\b))`,
  ],
  care: {
    abuse: [
      R`\b(?:hurts?|hurting|hits?|hitting) (?:my )?(?:child|children|kid|kids|son|daughter|baby)\b(?!'s)`,
      R`\b(?:makes?|made|making) me (?:to )?(?:do sexual|do sex|have sex|sleep with (?:him|her|them))\b`,
      // added 12 Oct 2026 (review probes): monitoring as control
      R`\b(?:checks?|checking|reads?|reading|tracks?|tracking) (?:all )?(?:of )?my (?:phone|messages|texts|location|emails)\b(?= .*\b(?:every|always|all the time|each|won'?t let|makes? me|demands?|without asking)\b)`,
      // Sexual coercion.
      R`\b(?:forces?|forcing|forced|makes|made|making|pressur(?:es|ed|ing)|push(?:es|ed|ing)) me (?:to (?:have sex|sleep with (?:him|her|them|his|other|people|men|women|someone)|do (?:sexual|sex|stuff in bed|things in bed)|perform sex|send (?:nudes|naked)|watch porn|touch (?:him|her|them))|into (?:having sex|sex|sleeping with|sexual|doing sexual))\b`,
      R`\b${PARTNER}(?: \w+)? (?:forces?|forcing|pressures?|pressuring) me (?:to|into) (?:do(?:ing)? )?(?:things|stuff|it)\b`,
      R`\b(?:doesn'?t|does not|won'?t|wouldn'?t|didn'?t|did not) stop when i (?:say|said|tell (?:him|her|them)|told (?:him|her|them)) (?:no|stop|to stop)\b`,
      R`\bi (?:didn'?t|did not|never|couldn'?t|could not|was too (?:drunk|out of it|young) to) consent\b`,
      // Touching by an adult or someone in authority.
      R`\b(?:my )?${ADULT}(?: \w+){0,2} (?:touches|touched|keeps touching|kept touching|has touched|is touching|tries to touch|tried to touch|gropes|groped|keeps groping) me\b(?! on the (?:shoulder|arm|back|hand) (?:to|and said|when|as|for)\b)`,
      R`\b(?:my )?${ADULT}(?: \w+){0,2} (?:feels|felt) me up\b`,
      R`\btouch(?:es|ed|ing)? me (?:inappropriately|there|down there|in places|in my private|where i (?:don'?t|didn'?t) want|under my|between my|on my (?:private|privates|chest|breasts?|boobs|bum|bottom|thighs?|crotch|genitals))`,
      R`\b(?:touches|touched|comes into my room and touches) me (?:at night|in bed|in my bed|in my room|when i'?m asleep|when i was asleep|while i(?:'m| am| was) (?:asleep|sleeping)|when (?:no one|nobody|mum|mom|dad)(?:'s| is)? (?:around|home|looking|out))\b`,
      R`\bforced (?:himself|herself|themselves) on me\b`,
      R`\b(?:locks?|locked|locking) me (?:in|up in) (?:the|my|a|his|her|their) (?:room|bedroom|house|flat|cupboard|bathroom|car|shed|garage)\b`,
      R`\b(?:touches|touched|touching) me and i (?:hate|don'?t like|do not like|feel sick|felt sick|can'?t say no|froze|freeze|didn'?t want)\b`,
    ],
    violence: [
      R`\bmy (?:step-?(?:dad|mum|mom|father|mother|brother|sister)|uncle|aunt|auntie|cousin|grand(?:ad|dad|pa|father|ma|mother|mum)|nan|gran|carer|foster (?:dad|mum|mom|father|mother|parent)|coach|teacher|ex-?(?:boyfriend|girlfriend|husband|wife|partner)|(?:mum|mom|dad)'?s (?:boyfriend|girlfriend|partner|husband|wife))(?: has| had)? (?:hit|hits|punched|punches|kicked|kicks|slapped|slaps|choked|chokes|strangled|strangles|beat|beats|shoved|shoves|smacked|smacks|attacked|attacks|grabbed|grabs|burns|burned|burnt|whips|whipped|belts|belted) me\b`,
      R`\b${SOMEONE}(?: (?:sometimes|often|always|still|usually|occasionally|even|also|then|just|literally|actually|has|had|keeps|kept|has been|started|again))+ (?:hit(?:s|ting)?|punch(?:es|ed|ing)?|kick(?:s|ed|ing)?|slap(?:s|ped|ping)?|chok(?:es|ed|ing)|strangl(?:es|ed|ing)|beat(?:s|ing)?|shov(?:es|ed|ing)|smack(?:s|ed|ing)?) me\b`,
      R`\b(?:put|puts|had|has|wrapped) (?:his|her|their) hands? (?:round|around) my (?:neck|throat)\b`,
    ],
    harassment: [
      R`\b(?:keeps?|kept|keep on|always) calling me (?:names|\w+ names)\b`,
      R`\b(?:keeps?|kept) touching (?:me|my (?:shoulder|back|leg|legs|hair|waist|arm|knee|bum|bottom|hand|neck))\b`,
      R`\bgrop(?:es|ed|ing) me\b`,
      R`\b(?:asks?|asked|asking|keeps asking|kept asking|pressur\w+ me) (?:me )?(?:for|to send(?: him| her| them)?) (?:nudes|naked (?:pics|photos|pictures)|pics of my body)\b`,
    ],
    threat: [
      R`\bthreat(?:en|ened|ening|ens) (?:my|us)\b`,
      R`\b(?:said|says|told me) (?:he|she|they)(?:'d| would| will|'ll| is going to|'s going to) (?:hurt|hit|kill|beat) me if i (?:leave|left|tell|told|go|went|try to leave|report|call|speak)\b`,
      R`\b(?:hurt|hit|kill|beat) me if i (?:leave|try to leave|go to the police|report (?:him|her|them|it)|call the police)\b`,
    ],
    unsafe: [
      R`\b(?:scared|afraid|frightened|terrified) for my (?:life|safety)\b`,
      R`\b(?:scared|afraid|frightened|terrified) (?:that )?(?:he|she|they|my ${PARTNER})(?:'ll| will| is going to|'s going to| might| would|'d) (?:hurt|hit|attack|beat|kill) me\b`,
      // Family: "kill me" is left out ("scared my mum will kill me when she sees my grades").
      R`\b(?:scared|afraid|frightened|terrified) (?:that )?my (?:dad|father|mum|mom|mother|step-?dad|step-?mum|step-?mom|brother|uncle)(?:'ll| will| is going to|'s going to| might| would|'d) (?:hurt|hit|attack|beat) me\b`,
    ],
  },
};

/** Used when the model (not the lexicon) flags care: brief, warm, no reframe. */
export const GENERAL_CARE = {
  title: 'Let’s pause the angle',
  message: 'What you’ve written sounds like it might need more than a new perspective. You deserve real support with it. If you can, talk to someone you trust or a support service about what’s going on.',
};
