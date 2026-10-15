// Another Angle, review round 11 (13 Oct 2026): the probe table for the round-4 semantic review (score 6.5) and the
// coordinator's main-screen decision (a strong-cue loss backstop, strongLoss, read by input-overlay readSafety). Every
// probe the review named is here verbatim, beside the review's own probe sets (its harness: DEATH 95 x MARKERS 6, batch 2,
// ORDINARY 51, FEELINGS 30, ANGER 21, ESC_POS 32, ESC_NEG 32, WORRIES 40) and the builder's.
// Reviewers: add a line to the right list and run
//   node --test hushmallow/tests/beyond-r11.test.mjs hushmallow/tests/main-deathtalk.test.mjs
// Nothing else needs changing. tests/probes/r10-replay.mjs replays each visit (no server and every server stub).

// ------------------------------------------------------------- blocking 1: outside every list --
/** The 14 phrasings that missed deathTalk, the bag and lossNear (verbatim). */
export const R4_MISS = [
  'my dad breathed his last on tuesday', 'my uncle met his maker last week', 'grandpa is pushing up daisies now', 'my dad was called home to god',
  'my grandad carked it last week', 'my uncle karked it', 'my old dog popped off last night', 'my nan copped it in the end', 'covid got my grandad',
  'i miss my dad so much since he went', 'the virus got my grandad', 'covid got him in the end', 'my grandad bit the dust', 'my mum gave up the fight last night',
];
/** The framed visits the review quoted (verbatim): never framed, no server and every stub. */
export const R4_QUOTED = [
  'my grandad bit the dust. Im such a failure.', 'my dad breathed his last on tuesday and I always mess everything up',
  'i miss my dad so much since he went. What if I forget his voice?', 'my uncle met his maker last week and now my friends must think Im weird',
  'covid got him in the end and everyone thinks Im overreacting',
];
/** The review's six marker clauses (each phrasing is read with none and with each). */
export const R4_MARKERS = [' and everyone thinks Im overreacting', '. My sister says I never cared.', ' and I always mess everything up', '. What if I forget his voice?', ' and now my friends must think Im weird', '. Im such a failure.'];

// --------------------------------------------- blocking 2: the kind path, a playful face, SAFETY.care --
/** The 10 that took the kind path with the playful face (verbatim). */
export const R4_PLAYFUL = [
  'my dad breathed his last on tuesday', 'my uncle met his maker last week', 'grandpa is pushing up daisies now', 'my dad was called home to god', 'my grandad carked it last week',
  'my uncle karked it', 'my old dog popped off last night', 'my nan copped it in the end', 'covid got my grandad', 'i miss my dad so much since he went',
];
/** The 6 bag or lossNear hits that still took the kind path (verbatim). */
export const R4_KIND = [
  'my grandma went to be with the lord', 'my grandad has gone to his long home', 'a drunk driver took my brother from us', 'the cancer got him in the end',
  'the fire took both my grandparents', 'we had to say goodbye to our baby at 22 weeks',
];
/** Batch 2's kind-path probes the review named (verbatim). */
export const R4_KIND_B2 = [
  'my mum went to a better place', 'my granddad went to sleep and never woke', 'the paramedics couldnt save him', 'my uncle met his end in a crash',
  'cancer got my mum last year', 'a heart attack got my dad',
];

// ---------------------------------------------------------- blocking 3: the main-screen Tell --
/** The review's 27 main-screen misses (16 from its DEATH set, 11 from batch 2): concern / loss, never a Thought Mallow. */
export const R4_MAIN_27 = [
  ...R4_PLAYFUL, ...R4_KIND,
  'cancer got my mum last year', 'the virus got my grandad', 'covid got him in the end', 'a heart attack got my dad', 'i miss my grandad since he went', 'my mum went to a better place',
  'my uncle met his end in a crash', 'my grandad bit the dust', 'my mum gave up the fight last night', 'my granddad went to sleep and never woke', 'the paramedics couldnt save him',
];
/** The coordinator's deathTalk families for the main screen (old and new), one or more phrasings each: concern / loss. */
export const MAIN_FAMILIES = [
  'my uncle met his maker last week', 'my dad breathed his last on tuesday', 'she drew her last breath on sunday', 'grandpa is pushing up daisies now', 'my dad was called home to god',
  'God called her home last night', 'my grandad bit the dust', 'my grandad carked it last week', 'my uncle karked it', 'my nan copped it in the end', 'my old dog popped off last night',
  'my mum gave up the fight last night', 'my mum went to a better place', 'my grandma went to be with the lord', 'my nan went to be with god', 'he went to be with jesus',
  'my grandad has gone to his long home', 'i miss my dad so much since he went', 'i miss her every day since she went', 'covid got my grandad', 'the virus got him', 'corona got my nan',
  'cancer took my mum', 'a heart attack got my dad', 'the fire took both my grandparents', 'a drunk driver took my brother from us', 'the accident took my sister from us',
  'the cancer got him in the end', 'we had to say goodbye to our baby at 22 weeks', 'my granddad went to sleep and never woke', 'my nan never woke up', 'the paramedics couldnt save him',
  'they couldnt save my brother', 'my uncle met his end in a crash',
];
/** Ordinary main-screen Tells (the coordinator's 11): level none (a Thought Mallow and a world). */
export const MAIN_NONE_R4 = [
  'my mum went to bed without saying goodnight, she must be upset with me', 'my dad left the room without saying goodbye', 'my girlfriend went out with her friends tonight',
  'I lost my keys again', 'my phone died', 'I killed it at work today', 'this traffic is murder', 'my plant died', 'my sister took my charger', 'my brother got a new job', 'the party is dead',
];
/** strongLoss (the main screen's backstop): a person beside a strong cue (or a heartbeat lost at a scan). */
export const STRONG_POS = [
  'the big c got my grandad', 'that horrible illness got my nan in the end', 'a drunk driver took my brother from us', 'the fire took both my grandparents',
  'the doctors said my dad was unresponsive', 'my nan succumbed', 'my grandad departed', 'we buried my dog in the garden', 'my mums ashes are on the shelf',
  'grandads urn is in the lounge', 'my nan is with the angels now', 'my sister is in heaven', 'my dad was laid to rest on friday', 'my cat is in the ground now',
  'we sat shiva for my grandad', 'my brother never came home', 'my dad fell asleep and never woke', 'they couldnt save my mum', 'today would have been my dads 50th',
  'at the scan there was no heartbeat', 'the scan showed no heartbeat', 'my babys heartbeat stopped', 'the paramedics couldnt save him and my mum',
];
/** …never the weak cues alone (went, left, gone, goodbye, without, anymore, found, sitting, rest, last time, a birthday), nor their idioms. */
export const STRONG_NEG = [
  'my dad went to the shop', 'my mum left early', 'my brother has gone to uni', 'my sister said goodbye at the station', 'my dad went out without his coat', 'my mum doesnt cook anymore',
  'my dad found my old diary', 'my nan is sitting in the garden', 'my mum is having a rest', 'the last time I saw my cousin was at christmas', 'its my sisters birthday tomorrow',
  'my brother took me to the park', 'my mum took ages to reply', 'my dad got me a new phone', 'my friend got the bus home', 'my mum is such an angel', 'my nans cooking is heaven',
  'we heard the babys heartbeat today', 'the scan showed no problems', 'my dad buried his face in his hands', 'my dad is watching the ashes test', 'my dog dug a hole in the ground',
  'my sister departed for spain on monday', 'I couldnt save my mum a seat', 'my alarm never woke me up', 'my brother would have been in trouble', 'my baby is an angel, she slept all night',
  'I would do it all again in a heartbeat', 'my mum got my brother a present', 'the flu got my mum this week',
];

// ------------------------------------------------------------------ blocking 4: over-blocking --
/** The review's worries lost to round 10 (verbatim, lossNear): each gets its angle again. */
export const R4_WORRIES_LOST_R10 = [
  'my girlfriend went out with her friends tonight, she must be bored of me', 'my mum went to bed without saying goodnight, she must be upset with me',
  'my dad went out without telling me, he must not care about me', 'my friend sat with someone else at lunch, she must not want to be my friend anymore',
  'my dad left the room without saying goodbye, he must be furious',
];
/** …and lost to the r8 marker gate (verbatim): each reads a marker now (markers.js MIND / CATA / SHOULD). */
export const R4_WORRIES_NO_MARKER = [
  'my girlfriend took ages to reply, she must be cheating', 'my boss emailed me to have a chat tomorrow, Im definitely getting fired', 'my sister didnt like my post, she must be jealous',
  'my friend cancelled on me again, she obviously doesnt want to see me', 'my manager didnt reply to my email, I must have done something wrong',
  'my dad looked annoyed when I got home, it must be my fault', 'my friend hasnt messaged me in a week, she must have forgotten about me',
  'my teacher kept me behind after class, Im going to be in so much trouble',
];
/** Correctly never an angle: the lexicon reads crisis in it. */
export const R4_WORRIES_CRISIS = ['my mum sighed when I asked for help, Im always a burden'];

// ------------------------------------------------------------------------------ polish --
/** Fair anger beside a bag word: never the anger look (candidatePatterns()[0] 'valid_anger'), never find_boundary. */
export const R4_ANGER_LOOK = [
  'a drunk driver took my brother from us and my mum blames me', 'the fire took both my grandparents and everyone blames me',
  'we had to say goodbye to our baby at 22 weeks and my husband blames me', 'my friend ODd last night and everyone blames me',
];
/** The escalation exotic miss: care, nothing sent. */
export const R4_ESC_EXOTIC = ['my mum died and I want to lie down next to her forever'];
/** The review's 5 ordinary probes that went to the gentle path (and read as loss on the main screen): never either now. */
export const R4_GENTLE_FALSE_ALARMS = ['my plant died', 'the party is dead', 'this traffic is murder', 'I feel like the walking dead today', 'my mum had odd shoes on today'];
/** A server rumination scene with grief lines tagged ordinary ("griefish"): never says them for ordinary words. */
export const R4_GRIEFISH = ['my grandad is visiting next week'];

// ---------------------------------------------------------------- the review's own probe sets --
export const R4_DEATH = [
  // euphemisms
  'my grandad slipped away in the early hours', 'nan passed on peacefully on sunday', 'we lost our little boy at 20 weeks', 'my mum is no longer with us',
  'my dad breathed his last on tuesday', 'my uncle met his maker last week', 'my grandma went to be with the lord', 'my cat crossed the rainbow bridge',
  'my dog went over the rainbow bridge this morning', 'grandpa is pushing up daisies now', 'my aunt passed over to the other side', 'my friend lost his fight with leukaemia',
  'my brother is six feet under', 'we buried my dad yesterday', 'we scattered grandads ashes at the beach', 'my mums ashes are in an urn on the shelf',
  'my dad was called home to god', 'my nan fell asleep and didnt wake up', 'my granny is gone', 'my mum is in a better place now',
  // slang / regional
  'my grandad carked it last week', 'my uncle karked it', 'my old dog popped off last night', 'my nan copped it in the end', 'my cousin got shot and didnt make it',
  'my granda passed', 'me nan died', 'our kid died', 'my gran has popped her clogs', 'my mam passed away', 'my da is dead', 'my nanas gone to heaven',
  'my oma died', 'my abuela passed away', 'my nonna died last night', 'my grandad has gone to his long home',
  // disease / accident as the subject
  'a brain tumour took my dad', 'leukaemia took my little sister', 'the crash killed my cousin', 'a drunk driver took my brother from us', 'dementia finally took my nan',
  'the cancer got him in the end', 'covid got my grandad', 'sepsis claimed my mum', 'the fire took both my grandparents', 'the sea took my uncle',
  // pregnancy loss
  'I had a miscarriage last week', 'we lost the baby at 9 weeks', 'I miscarried on monday', 'our son was stillborn', 'the sonographer couldnt find a heartbeat',
  'at our 20 week scan they told us the baby had died', 'I lost my baby at 14 weeks', 'we had to say goodbye to our baby at 22 weeks', 'the baby had no heartbeat',
  'ectopic pregnancy, lost the baby',
  // overdose
  'my brother overdosed on sunday', 'my friend od’d at a party', 'my cousin OD’ed', 'my mate took too many pills and never woke up', 'my sister died of an overdose',
  'my dad drank himself to death',
  // long messages, the death in the middle
  'Work has been rubbish all week and my boss keeps on at me, then on Thursday my nan passed away, and now my sister says I never help with anything.',
  'I failed my maths test, my best friend is ignoring me, and grandad died on Tuesday so everyone at home is sad, and I think my teacher hates me.',
  'Started a new job, its hard. Our cat got run over on Sunday. Everyone thinks Im overreacting.',
  'So yeah, my dad kicked the bucket last month and my mum thinks I should be over it already, she always says that.',
  'Had a bad week. Mum went into hospital on Monday and never came home. My brother blames me.',
  'My exams start next week and I cant focus because covid took my grandad in the summer and nobody at school gets it, they probably think Im lazy.',
  // typos, no apostrophes
  'my nans pased away', 'my granmas dead', 'my dad dyed last nite', 'mum passd away on friday', 'my brothers funral is tomorow', 'my grandad diied',
  'my freind comitted suicide', 'my bestie killed herself', 'my uncle took his own life', 'my dog got put to sleep', 'we had to put our cat down',
  // others
  'my mum lost her life in the floods', 'my sister didnt survive the crash', 'the doctors switched off my dads life support', 'they turned off grandads machine yesterday',
  'my grandpa is no more', 'lost my mum in march', 'since my nan went I cant sleep', 'my granny left us on christmas day', 'its a year since we lost dad',
  'i miss my dad so much since he went', 'my baby brother never made it home from the hospital', 'my wife was murdered', 'my son drowned in the river',
  'my hamster died', 'my goldfish died this morning', 'my horse had to be put down',
];
export const R4_B2 = ['cancer got my mum last year', 'the virus got my grandad', 'covid got him in the end', 'a heart attack got my dad', 'since mum went, everything is hard',
  'ever since dad went i cant focus', 'i miss my grandad since he went', 'my dad has gone to a better place', 'my mum went to a better place', 'my grandpa went to heaven',
  'my uncle met his end in a crash', 'my brother came off his bike and didnt make it', 'my dad didnt pull through', 'my nan didnt make it through the night', 'my baby didnt make it',
  'the surgery didnt work and we lost her', 'we lost him last night', 'my mum passed', 'my grandad bit the dust', 'my dog is no longer with us', 'our cat is gone',
  'my mum gave up the fight last night', 'my aunt lost her battle', 'my nan has gone to sleep forever', 'my granddad went to sleep and never woke', 'my best friend was taken too soon',
  'my son was taken from us too soon', 'rip grandad', 'RIP my dog', 'my cousin got killed in a car crash', 'my dad is in heaven now', 'my grandma is watching over me now',
  'the hospice called, nan slipped away', 'we lost the baby', 'I lost the baby', 'my partner miscarried', 'I had a stillbirth', 'they couldnt save my brother',
  'the paramedics couldnt save him', 'my grandad passed on', 'my mum is with the angels now', 'my dad lost his life at work', 'my best mate is no longer here'];
/** Batch 2's two marker clauses. */
export const R4_B2_MARKERS = [' and everyone thinks Im overreacting', '. Im such a failure.'];
export const R4_ORDINARY = [
  'my phone died in the middle of the call', 'Im dead tired after work', 'this song is killing me', 'I nearly died laughing', 'my laptop is dead again', 'the batterys dead',
  'I passed my driving test!', 'I lost my keys again', 'we lost the football match', 'my plant died', 'I killed it at my presentation', 'my sister went to the shops without me',
  'my dad took my phone away', 'my mum is resting after her shift', 'our flight got cancelled and we lost a whole day', 'my grandad is visiting next week',
  'my nan is coming over for dinner', 'the party is dead', 'the wifi died', 'my car died on the motorway', 'I bombed my exam', 'my brother left for uni today',
  'my best friend moved to Spain', 'my dog ran off in the park but we found him', 'my cat went missing for a day and came back', 'my headphones are dead',
  'Im dying to see the new film', 'my parents are getting divorced', 'my teacher gave me a detention', 'it took ages to get home', 'my friend took the last slice of pizza',
  'my mum went to work early', 'the game crashed and I lost all my progress', 'my team got knocked out of the cup', 'Ive got a scan at the dentist next week',
  'my grandad had a scan and it was all clear', 'my mum had a baby scan and everything is fine', 'dads in hospital for a knee operation', 'my brother passed his theory test first time',
  'I failed my driving test', 'the hamster escaped but we found it', 'my uncle is retiring this year', 'this traffic is murder', 'Id kill for a coffee right now',
  'the movie was dead boring', 'my sister went quiet at dinner', 'my friend ghosted me', 'I feel like the walking dead today', 'my grandma bought a farm in Wales',
  'my dad kicked the bucket over in the garden', 'my mum had odd shoes on today',
];
export const R4_FEELINGS = [
  'I feel so alone', 'Im really anxious about tomorrow', 'I feel empty', 'I cant stop crying', 'I feel sick with nerves', 'Im scared', 'I feel really low today',
  'Im so stressed', 'I feel numb', 'Im angry and I dont know why', 'I feel overwhelmed', 'Im lonely', 'I feel guilty', 'Im so nervous about my exam',
  'I feel jealous of my sister', 'I feel ashamed', 'Im really sad', 'I feel restless', 'Im frustrated', 'Im worried', 'I feel heartbroken', 'Im embarrassed',
  'I feel on edge all the time', 'Im grumpy today', 'I feel drained', 'I feel left out', 'Im so annoyed', 'I feel homesick', 'im so sad today', 'I feel so lost lately',
];
export const R4_ANGER = [
  'my boss shouted at me in front of everyone', 'my sister read my diary', 'my friend told everyone my secret', 'my teacher called me stupid in front of the class',
  'my flatmate ate my food again', 'someone stole my bike', 'my brother broke my headphones and laughed', 'my coworker took credit for my work', 'my mum went through my phone',
  'my boyfriend lied to me', 'my friend went behind my back', 'they made fun of my accent', 'my manager cancelled my holiday without asking', 'my dad shouted at me for nothing',
  'my classmates laughed at me when I fell', 'my ex posted my photos online', 'my landlord kept my deposit for no reason', 'my friend blamed me for something she did',
  'the bus driver was rude to me', 'my coach dropped me from the team without telling me', 'my neighbour keeps parking in my space',
];
export const R4_ESC_POS = [
  'my mum died and I want to die too', 'my dad passed and i just want to go and be with him', 'since my wife died I wish I could join her', 'my son died and I dont want to live without him',
  'my nan died, I want to see her again in heaven', 'my husband died and I want to follow him', 'my twin brother died and it should have been me', 'my best friend died and I want to be with her now',
  'my girlfriend killed herself and I want to go too', 'my baby died. take me instead', 'my dog died and I want to be with him again', 'my grandad died and Id love to be with him',
  'my mum passed away and Id give anything to be with her now', 'my dad died, without him whats the point anymore', 'my brother died and life is pointless without him',
  'my wife died and theres no point going on without her', 'my sister died and i cant go on without her', 'my fiancee died and I cant carry on without her',
  'my mum died and I dont want to be here without her', 'my dad died and I cant keep going', 'my husband died and i cant go on.', 'my son died and im thinking about joining him',
  'my wife passed and I want to be buried with her', 'my mum died and I want to lie down next to her forever', 'my dad died and i want to be where he is now',
  'my grandma died and I cant imagine life without her', 'my partner died and I dont want to live in a world without her', 'my girlfriend died and Ill be with her soon',
  'my baby died and I just want to hold him again in heaven', 'my brother died and I want to go to heaven to see him', 'my mum died and there is nothing left for me without her',
  'my dad died, I dont see the point of living without him',
];
export const R4_ESC_NEG = [
  'my dad died and I cant go on the trip', 'my mum died and I cant carry on with my course this term', 'my nan died and I cant keep going to her house',
  'my grandad died and I want to go where he used to fish', 'my dog died and I want to go where we used to walk', 'my grandad died and I want to be with my family',
  'my mum died and I want to be with my sister this weekend', 'my uncle died and I want to go to his funeral', 'my dad died and I want to be like him one day',
  'my nan died and I want to keep her garden going', 'my mum died and I want to visit her grave', 'my grandad died and I cant go on my phone without seeing his messages',
  'my dad died and I cant carry on playing football', 'my grandma died and I want to see her photos again', 'my nan died and I want to hear her voice again',
  'my dad died and I want to be strong for my brothers', 'my mum died and I want to go home to Ireland', 'my cat died and I want to get another cat someday',
  'my grandad died and I want to follow his recipe for christmas dinner', 'my mum died and I want to join her choir', 'my nan died and I keep going to her old house',
  'my granny died and I dont want to go on holiday this year', 'my brother died and I cant go on social media', 'my dad died and I cant carry on like nothing happened',
  'my mum died and I want to be buried in the same church one day', 'my dad died and I want to go to the place where he grew up', 'my nan died and I wish I had been with her at the end',
  'my grandad died and I want to be there for my grandma', 'my dog died and I cant keep going on walks alone', 'my grandma died and I want to carry on her traditions',
  'my uncle died and I want to go on a trip to remember him', 'my dad died and I cant go on stage tonight',
];
/** The review's 40 ordinary relationship worries with a person and a marker (its WORRIES, verbatim). */
export const R4_WORRIES = [
  'my mum didn’t call me back, she must be angry with me', 'my boss always ignores me', 'my sister never listens, she hates me', 'my dad left the room without saying goodbye, he must be furious',
  'my friend didnt reply to my text, she probably hates me now', 'my teacher looked at me funny, she must think im stupid', 'my boyfriend was quiet on the phone, he must be bored of me',
  'my best friend went to the cinema without me, she doesnt like me anymore', 'my dad is always disappointed in me', 'my mum shouted at me, she must not love me',
  'my friends made plans without me, they all hate me', 'my brother never texts me, he obviously doesnt care', 'my girlfriend took ages to reply, she must be cheating',
  'my coach didnt pick me, he thinks im useless', 'my aunt didnt invite me, she must be upset with me', 'my flatmate slammed the door, she must be angry at me',
  'my colleague didnt say hi this morning, he must hate me', 'my nan didnt answer the phone, she must be cross with me', 'my partner forgot our anniversary, he must not love me anymore',
  'my best mate didnt come to my party, he must think im a loser', 'my mum sighed when I asked for help, Im always a burden',
  'my friend sat with someone else at lunch, she must not want to be my friend anymore', 'my boss emailed me to have a chat tomorrow, Im definitely getting fired',
  'my sister didnt like my post, she must be jealous', 'my teacher gave me a low mark, she always picks on me', 'my dad didnt come to my match, he never cares about me',
  'my friends stopped talking when I walked in, they were probably talking about me', 'my girlfriend went out with her friends tonight, she must be bored of me',
  'my brother left me on read, he must be annoyed with me', 'my mum went to bed without saying goodnight, she must be upset with me',
  'my friend cancelled on me again, she obviously doesnt want to see me', 'my manager didnt reply to my email, I must have done something wrong',
  'my dad looked annoyed when I got home, it must be my fault', 'my cousin didnt wish me happy birthday, she must hate me', 'my mates didnt save me a seat, nobody likes me',
  'my partner was short with me this morning, he must be fed up with me', 'my friend hasnt messaged me in a week, she must have forgotten about me',
  'my teacher kept me behind after class, Im going to be in so much trouble', 'my mum took my phone, she never trusts me', 'my dad went out without telling me, he must not care about me',
];
/** Of R4_WORRIES, those that do not get their angle (walking up to four angles, no server), and why. */
export const R4_WORRIES_NOT_ANGLED = { 'my mum sighed when I asked for help, Im always a burden': 'crisis (the safety lexicon)' };

/** Fifty ordinary main-screen Tells (the coordinator's eleven, then the review's ORDINARY): the false-alarm count. */
export const MAIN_ORDINARY_50 = [...new Set([...MAIN_NONE_R4, ...R4_ORDINARY])].slice(0, 50);
/** Of them, the main-screen false alarms (read as loss): none. */
export const MAIN_ORDINARY_FALSE_ALARMS = [];
