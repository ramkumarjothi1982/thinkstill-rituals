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
    R`\b(?:is|are|am|'s|'re|'m) in (?:immediate |real |serious )?danger\b(?! of)`,
    R`\b(?:he|she|they|someone|somebody) (?:is|are|'s|'re) not breathing\b`,
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
      R`\b(?:scared|afraid|frightened|terrified|petrified|worried) (?:that )?${HURTER}(?: \w+)?(?:'ll| will| is going to|'s going to| is gonna|'s gonna| might| may| would|'d| could)(?: (?:really|actually|seriously|try to|try and|end up|come and|come back and))? (?:hurt me|harm me|hit me\b(?! (?:up|back (?:with|later|tomorrow|soon|about|on|when))\b)|attack me\b(?! (?:in|during) (?:(?:a|the|every) )?(?:debates?|comments|reviews?|interviews?)\b)|beat me\b(?! (?:at|in|to)\b)|strangle me|choke me|stab me|punch me|kick me\b(?! (?:out|off)\b)|slap me|shove me)\b`,
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
