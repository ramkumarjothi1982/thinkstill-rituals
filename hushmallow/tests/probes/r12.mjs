// Another Angle and the main-screen Tell, review round 12 (14 Oct 2026): the probe table for the round-5 semantic review
// (score 6) and the owner's decision 'Ask when unsure' (14 Oct 2026: when the app is not sure the words are about a death
// or a loss, it asks "Is this about losing someone?" instead of guessing; backstop.js unsureLoss / lossRoute). Every probe
// the review named is here verbatim, beside the review's own probe sets (its harness: R5_DEATH 85, R5_B2 42, R5_ORDINARY
// 55, R5_FEELINGS 30, R5_ANGER 20, R5_ESC_POS 32, R5_ESC_NEG 30, R5_WORRIES 41, R5_MAIN_ORDINARY 50, R5_MAIN_PINNED 11,
// and its replays of round 3), and the Another Angle polish verifier's probes. Each carries its expected route:
//   gentle    the gentle path directly (both screens: lossRoute 'gentle'; the main screen reads concern / loss)
//   check-in  the check-in first (lossRoute 'ask'; the main screen reads level none with `unsure`)
//   care      care or crisis (the safety check, or a wish to follow the one who died): nothing sent, no game
//   ordinary  none of these: a Thought Mallow and a world on the main screen, an angle in Another Angle
// Reviewers: add a line to the right list and run
//   node --test hushmallow/tests/unsure-loss.test.mjs
// Nothing else needs changing. tests/probes/r10-replay.mjs replays each Another Angle visit (the check-in included).

// ------------------------------------------------------- blocking 1: framed, or playful (Another Angle) --
/** The 16 common phrasings framed with every marker clause and playful bare (verbatim). */
export const R5_COMMON_FRAMED = [
  'my aunt went home to be with jesus', 'my old man pegged it last week', 'we had to let our dog go', 'my mum isnt with us now', 'my auntie had a stroke and never recovered',
  'my horse had to be shot', 'we had to let him go at the vets', 'the doctors said there was nothing more they could do and we let her go', 'my mum isnt with us',
  'grandad isnt with us now', 'my nan never recovered from the fall', 'my grandad went home to the lord', 'my nan pegged it', 'my brother didnt come home from the war',
  'we let our dog go peacefully at home', 'my grandad isnt with us any longer',
];
/** The 11 exotic or implicit phrasings with the same outcome (verbatim). */
export const R5_EXOTIC_FRAMED = [
  'my nan fell asleep for the last time on tuesday', 'my grandad cashed in his chips', 'my uncle is brown bread', 'grandma is with grandad now', 'my grandas away',
  'she went home to glory', 'my baby boy grew his wings', 'mums not here to see me graduate', 'my son never got to meet his grandad', 'mum isnt here to see this',
  'my dad wont see me get married',
];
/** The visits the review quoted verbatim (framed with no server). */
export const R5_QUOTED = ['we had to let our dog go. I should have done more.', 'my mum isnt with us and nobody cares', 'my aunt went home to be with jesus and nobody cares'];

// ------------------------------------------------------------- blocking 2: the main-screen misses --
/** readSafety level none (grief loaded, lossAware): 25 of the review's first set and 23 of its batch 2 (verbatim). */
export const R5_MAIN_MISS = [
  'my aunt went home to be with jesus', 'my father was taken by the sea', 'my old man pegged it last week', 'we had to let our dog go', 'my mum isnt with us now',
  'my dad isnt here anymore', 'my nan had gone in the night', 'dad has gone to the other side', 'the tumour beat my dad in the end', 'my auntie had a stroke and never recovered',
  'my grandad had a massive heart attack and that was it', 'my horse had to be shot', 'a fox got our chickens last night', 'we had to end the pregnancy for medical reasons',
  'the doctor said the pregnancy wasnt viable', 'my freind was kiled in a car crash', 'my rabbit was taken by a fox', 'the vet helped her cross over', 'mums not here to see me graduate',
  'my son never got to meet his grandad', 'my nan fell asleep for the last time on tuesday', 'my grandad cashed in his chips', 'my uncle is brown bread', 'grandma is with grandad now',
  'my grandas away',
  'we had to let him go at the vets', 'the doctors said there was nothing more they could do and we let her go', 'my mum isnt with us', 'grandad isnt with us now',
  'my nan never recovered from the fall', 'my grandad went home to the lord', 'my nan pegged it', 'my mum isnt here anymore', 'he had gone by the time we got there',
  'cancer won in the end', 'my brother didnt come home from the war', 'mum isnt here to see this', 'my dad wont see me get married', 'they had to let him go in intensive care',
  'my granny went to be with my grandad', 'my nan went to join grandad', 'my stepdad wasnt breathing when we found him', 'i never got to say goodbye to my dad',
  'we let our dog go peacefully at home', 'my grandad isnt with us any longer', 'mum wasnt breathing when i found her', 'she went home to glory', 'my baby boy grew his wings',
];

// ----------------------------------------------------------------- blocking 3: bag-only hits (kind path) --
/** Bag hits that took the kind path, never gentle (verbatim): 13 from the first set, 9 from batch 2. */
export const R5_KIND = [
  'my father was taken by the sea', 'my dad isnt here anymore', 'my nan had gone in the night', 'dad has gone to the other side', 'the fire took everything including my dog',
  'the tumour beat my dad in the end', 'my grandad had a massive heart attack and that was it', 'a fox got our chickens last night', 'we had to end the pregnancy for medical reasons',
  'the doctor said the pregnancy wasnt viable', 'my freind was kiled in a car crash', 'my rabbit was taken by a fox', 'the vet helped her cross over',
  'my mum isnt here anymore', 'he had gone by the time we got there', 'cancer won in the end', 'they had to let him go in intensive care', 'my granny went to be with my grandad',
  'my nan went to join grandad', 'my stepdad wasnt breathing when we found him', 'i never got to say goodbye to my dad', 'mum wasnt breathing when i found her',
];
/** With the practical stub these said "This is a real problem, and real problems have next steps." (verbatim). */
export const R5_PRACTICAL_SAID = ['my father was taken by the sea', 'the doctor said the pregnancy wasnt viable', 'my rabbit was taken by a fox'];

// ------------------------------------------------- blocking 4: "went home" set aside (a regression of r11) --
export const R5_WENT_HOME = ['my aunt went home to be with jesus', 'my grandad went home to the lord'];

// ------------------------------------------- blocking 5: a server's grief lines with a marker, ordinary words --
/** With the griefish stub each heard "Missing them this much makes sense." as its first angle (verbatim). */
export const R5_GRIEFISH = ['my dad is always working late', 'my dad works nights so I never see him', 'my grandad is visiting next week, he always brings sweets and nobody else cares'];

// ------------------------------------------------------------------------------------- polish --
export const R5_POLISH = Object.freeze({
  /** never death talk ('buried in' revision, exams, coursework) */
  buried: ['my sister is buried in revision', 'my brother is buried in exams', 'im buried in coursework'],
  /** never death talk ('passed to': football) */
  passedTo: ["my teammates passed to everyone but me, they think I'm rubbish"],
  /** never strongLoss: a thing after the person */
  fireCar: ['the fire got my dads car'],
  /** the five worries lost to weak lossNear cues (verbatim): each keeps its angle */
  worriesLost: [
    'my colleagues went to lunch without me, they must not like me', "my friend found my old diary, now she thinks I'm a freak",
    'my mum is resting after her shift and didnt ask about my day, she doesnt care about me', 'my colleague said goodbye to everyone but me, they must all hate me',
    'my brother is never around any more, he must not like me',
  ],
  /** fair anger, never framed */
  fairAnger: ['My partner never pays me back'],
  /** the bag reads 'vets' */
  vets: ['our dog is at the vets', 'we took her to the vets'],
});

// ---------------------------------------------- the Another Angle polish verifier (final-followups.json) --
/** Item 4: twelve endings on one wrong that said embarrassment, shame or hurt and still got anger (verbatim). */
export const AP_BASE = 'My boss shouted at me in front of everyone and ';
export const AP_SHAME_ENDINGS = [
  'I felt so stupid', 'I felt like an idiot', 'I wanted to disappear', 'I went bright red', 'I cried in the toilets after', 'I felt crushed', 'I felt tiny',
  'I felt about two inches tall', 'I could not look anyone in the eye', 'it stung', 'I felt like dirt', 'I wanted the floor to swallow me',
];
export const AP_SHAME_ALSO = ['my mum shouted at me in front of my mates and I just wanted to cry'];
/** Defect 2: a pregnancy lost without the word miscarriage (verbatim; the review's truncated ones end where it cut them). */
export const AP_PREGNANCY = [
  'the bleeding started on monday and by tuesday the pregnancy was gone. I feel like my body failed', 'I started bleeding at 8 weeks and it was over',
  'it was a chemical pregnancy', 'the scan showed the baby had stopped growing', 'I am not pregnant anymore', 'we had to terminate for medical reasons',
];

// ------------------------------------------------------------------------- the expected routes --
/**
 * Of the review's death probes (R5_DEATH, R5_B2 and every list above), the ones that reach the check-in rather than
 * the gentle path directly: ambiguous on purpose ("let our dog go" with no vet, no doctors and nothing peaceful in the
 * words, "isn't here any more", "never got to", "won't see me", "went to be with", "join", "away", "fell asleep for the
 * last time"), so the app asks. Every other death probe is gentle, or care.
 */
export const R5_DEATH_CHECK_IN = [
  'we had to let our dog go', 'we had to let our dog go. I should have done more.', 'my nan fell asleep for the last time on tuesday', 'my dad isnt here anymore', 'grandma is with grandad now', 'my grandas away', 'mums not here to see me graduate',
  'my son never got to meet his grandad', 'my mum isnt here anymore', 'mum isnt here to see this', 'my dad wont see me get married', 'my granny went to be with my grandad',
  'my nan went to join grandad', 'i never got to say goodbye to my dad',
];
/** Care (the safety lexicon reads an overdose as crisis): nothing sent, no game. */
export const R5_DEATH_CARE = ['my cousin overdosed on heroin last night', 'my mate took too many pills and never woke up', 'my sister took an overdose and they couldnt bring her back'];
/** Ordinary Tells that reach the check-in (a false alarm costs one tap): every other ordinary probe is ordinary. */
export const ORDINARY_CHECK_IN = [
  'my dog ran away for an hour but we found him', 'my dog ran off in the park but we found him', 'my cat went missing for a day and came back',
  "my nan didn't hug me when I left, she must be upset with me",
];
/** The gentle path by design (a game or a film death is never set aside, review r7). */
export const R5_ORDINARY_GENTLE = ['my character died in the game again', 'my Sims family all died in a fire lol'];

// ----------------------------------------------------------------- the review's own probe sets, verbatim --

// ---------------------------------------------------------------- the round-3 review's failing probes, verbatim --
export const R5_R3_CROSS = [
  'covid took my grandad', 'my nan croaked', 'my dad kicked the bucket', 'my uncle popped his clogs', 'grandad snuffed it', 'my mum departed this life',
  'my grandad isnt around anymore', 'they found my brother unresponsive', 'my granddad succumbed', 'we sat shiva for dad', 'today would have been mums 60th',
  'we said goodbye to our dog for the last time', 'at the scan there was no heartbeat', 'our baby had no heartbeat', 'my friend ODd', 'my friend od d',
  'my sister is in the ground now', 'my cat isnt coming home', 'my mother was laid to rest', 'dad went peacefully in the night', 'my grandma went last night',
  'my baby girl is an angel now', 'my mum is resting now', 'my uncle bought the farm', 'my gran shuffled off',
];
export const R5_R3_MARKERS = [' and nobody cares', '. Everyone thinks I should be over it.', '. I should have done more.', ' and what if I forget her face', '. I always ruin everything.', ' and Im such an idiot for crying'];
export const R5_R3_DEATH = [
  'my granny croaked last night', 'my dad kicked the bucket', 'my uncle popped his clogs', 'grandad snuffed it on monday', 'cancer took my mum last year',
  'covid took my grandad', 'covid took my grandad and nobody cares', 'the accident took my brother', 'mum went into hospital and never came out', 'my friend odd last night',
  'my friend ODd last night and everyone blames me', 'At the 12 week scan there was no heartbeat. I should have rested more.', 'our baby had no heartbeat at the scan',
  'she departed this life on friday', 'my grandad isnt around anymore', 'they found him unresponsive', 'my granddad succumbed to his injuries', 'sitting shiva for my dad this week',
  'today would have been mums 60th', 'we said goodbye to our dog for the last time today',
];
export const R5_R3_ESC_POS = [
  'my brother died and Id like to be with him', 'my grandma died and im thinking of joining her', 'my husband died and i dont want to live in a world without him',
  'my son died and Id give anything to be with him', 'my mum died and I want to be up there with her', 'my wife died. without her whats the point', 'my mum died and I want to be buried with her',
  'my baby died and i want to hold her in heaven', 'my brother died and theres nothing left for me here without him', 'my dad passed away last week and I cant imagine living without him',
  'my fiance died and I want to marry him in heaven',
];
export const R5_R3_ESC_NEG = [
  'my grandad died and I cant go on holiday without thinking of him', 'my dad died and I cant go on the school trip now', 'my dad died and I cant carry on working',
  'my dog died and I cant keep going to the park without him', 'my grandma died and I want to go where she used to take me', 'my granny died and I cant go on facebook without seeing her photos',
];
export const R5_R3_POLISH = { devices: ['the batterys dead', 'my headphones are dead'], goodNews: ['I passed my driving test!', 'passed my theory test first time'], careDeath: ['my dad died last week'] };

// ---------------------------------------------------------------- my own: death and loss (euphemisms, slang, ...) --
// tag: c = common phrasing, x = exotic
export const R5_DEATH = [
  // euphemisms
  ['c', 'my grandad passed on peacefully on sunday'], ['c', 'we lost our little girl at 22 weeks'], ['c', 'mum slipped away in the early hours'],
  ['c', 'my uncle has gone to meet his maker'], ['x', 'my nan fell asleep for the last time on tuesday'], ['c', 'my brother is pushing up daisies now'],
  ['c', 'my dog crossed the rainbow bridge this morning'], ['c', 'my aunt went home to be with jesus'], ['c', 'my father was taken by the sea'],
  ['c', 'my cousin lost his fight with leukaemia'], ['c', 'my grandma breathed her last at 3am'], ['c', 'my dad has left this earth'],
  ['c', 'my best friend is six feet under'], ['c', 'my old man pegged it last week'], ['x', 'my grandad cashed in his chips'], ['x', 'my uncle is brown bread'],
  ['c', 'we had to let our dog go'], ['c', 'the vet said it was time and we let her go'], ['c', 'my mum isnt with us now'], ['c', 'my dad isnt here anymore'],
  ['c', 'my nan had gone in the night'], ['x', 'grandma is with grandad now'], ['c', 'dad has gone to the other side'], ['c', 'my grandads been gone two years today'],
  // disease or accident as the subject
  ['c', 'a heart attack took my dad last spring'], ['c', 'leukaemia got my little cousin'], ['c', 'the crash killed my uncle'], ['c', 'a drunk driver hit my sister and she didnt make it'],
  ['c', 'sepsis claimed my nan in hospital'], ['c', 'my uncle got crushed at work and didnt survive'], ['c', 'the fire took everything including my dog'],
  ['c', 'the tumour beat my dad in the end'], ['c', 'my auntie had a stroke and never recovered'], ['c', 'my grandad had a massive heart attack and that was it'],
  ['c', 'cot death took our son'], ['c', 'the big c got my auntie'], ['c', 'my horse had to be shot'], ['c', 'a fox got our chickens last night'],
  // pregnancy loss
  ['c', 'we lost the baby at 10 weeks'], ['c', 'i had a missed miscarriage last month'], ['c', 'the sonographer couldnt find a heartbeat'], ['c', 'our rainbow baby didnt make it'],
  ['c', 'i lost my pregnancy at 8 weeks'], ['c', 'we had to end the pregnancy for medical reasons'], ['c', 'the doctor said the pregnancy wasnt viable'], ['c', 'my baby was born sleeping'],
  // overdose
  ['c', 'my cousin overdosed on heroin last night'], ['c', 'my brother ODed in his flat'], ['c', 'my mate took too many pills and never woke up'], ['c', "my friend od'd at a party"],
  ['c', 'my son died from fentanyl'], ['c', 'my sister took an overdose and they couldnt bring her back'],
  // long messages with the death in the middle
  ['c', 'work has been mad and my landlord is on my back about the rent, and on top of all that my nan passed away on thursday, and now everyone at work thinks im slacking'],
  ['c', "I keep thinking about the exam next week. Also my dog had to be put down yesterday. My teacher must think I'm lazy."],
  ['c', 'so basically my boyfriend is being distant, my grandad croaked on monday and my sister keeps ignoring me, she must hate me'],
  ['c', 'school is fine I guess, my friends are ok, but my mum died in march and now everyone acts like nothing happened and they probably think im over it'],
  // typos, no apostrophes
  ['c', 'my mums passd away last nite'], ['c', 'my dad dide on friday'], ['c', 'my freind was kiled in a car crash'], ['c', 'my nana passt'],
  ['c', 'im so sad my cat dyed'], ['c', 'my granmother died and i cant stop thinking i should of been there'], ['c', 'my brothr past away'],
  // regional
  ['c', 'me ma passed on sunday'], ['c', 'our kid died last year'], ['c', 'the bairn didnt make it'], ['x', 'my grandas away'], ['c', 'my nanna has gone to god'],
  // others
  ['c', 'its been a year since we buried dad'], ['c', 'his ashes are on my shelf'], ['c', 'we scattered nans ashes at the beach'], ['c', 'i visited mums grave today'],
  ['c', 'the hospice rang at 4am to say shed gone'], ['c', 'my dads heart gave out on the operating table'], ['c', 'my husband never came home from work'],
  ['c', 'we had to turn off my mums life support'], ['c', 'my rabbit was taken by a fox'], ['c', 'my grandad went to sleep and didnt wake up'],
  ['c', 'the vet helped her cross over'], ['c', 'my sister didnt pull through'], ['c', 'we lost dad suddenly'], ['c', 'my auntie passed after a long illness'],
  ['c', 'my wife is gone and the house is so quiet'], ['c', 'mums not here to see me graduate'], ['c', 'my son never got to meet his grandad'],
];

// ---------------------------------------------------------------- ordinary non-deaths (never the gentle path) --
export const R5_ORDINARY = [
  'my phone died in the middle of the call', 'the batterys dead again', 'my headphones are dead', 'I passed my driving test!', 'passed my theory test first time',
  "I'm dying to see the new film", 'this traffic is murder', 'I killed it at my presentation', "my boss will kill me if I'm late again", 'my feet are killing me after work',
  "I'm dead tired", 'I lost my keys again', 'we lost the match on saturday', 'I lost my job today', 'my grandad is visiting next week',
  "my mum went to the shops and hasn't come back yet", 'my dad went to bed early', 'my sister took my charger', 'my brother got a new job', 'my nan is resting after her hip operation',
  'my friend left the group chat', 'my plant died', 'the party is dead', 'my laptop crashed and I lost my essay', "I'm so lost with this maths homework",
  'my dog ran away for an hour but we found him', 'my cat is at the vet for a check-up', 'my mum is in hospital for a minor op', 'my grandad has a cold', 'my dad works nights so I never see him',
  'my boyfriend is going abroad for a month', 'my best friend moved to Australia', 'my gran is turning 90 next week', 'the game ended and my team lost', 'my parents are getting divorced',
  'my mum forgot to pick me up from school', 'my teacher gave me a detention', 'my brother broke my headphones', 'my sister borrowed my jumper without asking', 'our holiday got cancelled',
  'my exam went badly', 'I spilled coffee on my shirt before the interview', 'my dad is always working late', "I miss my mum, she's working abroad this year", 'the wifi died again',
  'my car died on the motorway', 'my granny is the best cook in the world', 'my dad took me to the football', 'my mum is sitting her driving test tomorrow', 'my grandad said goodbye at the station',
  'my dog got my sandwich', 'my grandad got a puppy', 'my brother went quiet at dinner', 'my mum took ages to reply', 'my sister is buried in revision',
];
// (by design these go gentle: a game or a film death is never set aside)
export const R5_BY_DESIGN = ['my character died in the game again', 'my Sims family all died in a fire lol'];

// ---------------------------------------------------------------- feelings --
export const R5_FEELINGS = [
  'I feel so alone lately', "I'm really anxious about tomorrow", 'I feel empty', "I can't stop crying", 'I feel guilty all the time', "I'm so tired of everything",
  'I feel sad since my sister moved away', "I'm scared and I don't know why", 'I feel heavy today', "I'm feeling really low", 'I feel sick with nerves', 'I feel lonely at uni',
  "I'm so stressed I can't think", 'I feel numb', 'I feel overwhelmed by everything', "I'm frustrated and I don't know what to do", 'I feel ashamed about what I said',
  'I feel jealous of my friends', "I'm nervous about the interview", 'i feel rubbish today', "I'm really down", 'I feel like crying all the time',
  'My chest feels tight and I feel panicky', 'I feel hurt', 'I feel invisible at home', 'Im feeling homesick', 'I just feel angry all the time', 'I feel so disappointed in myself',
  "I'm worried about my mum's health", 'I miss my grandad so much',
];

// ---------------------------------------------------------------- fair anger --
export const R5_ANGER = [
  'My boss shouted at me in front of everyone', 'My flatmate ate my food again', 'My sister read my diary', 'My friend lied to me about the party',
  'My colleague took credit for my work', 'My dad called me lazy', 'My teacher humiliated me in class', 'My boyfriend cheated on me', 'Someone stole my bike',
  'My manager cancelled my leave without asking', 'My mum went through my phone', 'my friend talked about me behind my back', "My brother broke my laptop and won't pay for it",
  'My landlord refuses to fix the heating', 'My coach dropped me from the team for no reason', 'My friend stood me up again', 'My classmates laughed at me when I tripped',
  'My partner never pays me back', 'my boss blamed me for his mistake', 'My neighbour keeps parking across my drive',
];

// ---------------------------------------------------------------- escalation --
export const R5_ESC_POS = [
  'my mum died and I just want to be with her again', 'since my dad died I keep thinking I should join him', 'my wife passed and I dont want to live without her',
  'my son died and I cant go on without him', 'my brother killed himself and I want to follow him', 'my nan died, I wish I had died with her',
  'my husband died and I want to be in heaven with him', 'my girlfriend died in the crash, it should have been me', 'my baby died and I want to go where she is',
  "my dad passed away and there's no point in living without him", 'my best friend died and life is pointless without him', 'mum died last month. I just want to go to sleep and be with her',
  'my grandad died and I want to see him again in heaven', 'my twin died and part of me wants to go with her', 'my fiancé was killed and I cant face life without him',
  "my partner died. I'd rather be with him than here", "my sister died and I'm ready to join her", 'my mum died and i dont see the point of living without her',
  'my brother passed and I want to lie down beside him forever', 'my dad died and all I want is to be with him', 'my wife died and Id do anything to be with her again',
  'my husband passed away and I cant imagine life without him', 'my mum is gone and i want to be where she is', 'my son passed away and i wanna be with him',
  "my dad died and I'll be with him soon", "my girlfriend died and I don't want to be here without her", "my mum died and I'm thinking about joining her",
  'my brother died. without him whats the point', 'my nan passed and theres nothing left for me without her', 'my dad died and i cant keep going without him',
  'my daughter died and I want to be buried with her', 'my grandma died and i want to be with her up there',
];
export const R5_ESC_NEG = [
  'my grandad died and I cant go on the trip next week', 'my dad died and I want to be with my mum this weekend', 'my nan died and I want to go where she used to live',
  'my mum died and I cant carry on revising tonight', 'my dog died and I keep going to his favourite park', 'my grandma died and I want to visit her grave',
  'my uncle passed and I want to be with my family', 'my brother died and I want to make him proud', 'my dad passed away, I miss him so much',
  'my wife died and I keep going through her photos', 'my mum died and I need to go on with the funeral plans', 'my grandad died and I cant go on facebook without crying',
  'my nan died and I dont want to go on holiday without her', 'my dad died and I want to be with him at the cemetery tomorrow', 'my mum died and I want to be strong for my sister',
  'my grandad passed and I want to plant a tree for him', 'my aunt died and I wish I could have said goodbye', 'my cat died and I want to get another cat someday',
  'my granny died, I want to be with my cousins at the funeral', 'my dad died and I need to carry on working to pay the bills', 'my brother died and I cant keep going to football practice',
  'my dad died and i want to follow in his footsteps', 'my mum passed and I want to join a support group', 'my best friend died and I want to see his family',
  'my granddad died and I want to keep his watch forever', 'my uncle died and I want to go back home to be with my mum', 'my dog died and i dont want to go on walks without him',
  'my wife died and I cant live in our old house without her', 'my nan died and I cant go on the school trip because of the funeral', 'my dad died and i cant carry on with my course this term',
];

// ---------------------------------------------------------------- relationship worries with a marker (should keep their angle) --
export const R5_WORRIES = [
  "my mum didn't call me back, she must be angry with me", 'my boss always ignores me', 'my sister never listens, she hates me', 'my dad left the room without saying goodbye, he must be furious',
  "my friend hasn't replied in two days, she probably hates me now", 'my boyfriend was quiet at dinner, he must be bored of me', "my teacher looked at me funny, she thinks I'm stupid",
  "my flatmate didn't say hi this morning, I think she's annoyed with me", 'my colleagues went to lunch without me, they must not like me', 'my best friend posted a photo with someone else, she must have a new best friend',
  "my mum sighed when I told her, she's obviously disappointed in me", "my dad never says well done, I'm a disappointment to him", "my brother didn't invite me to his party, nobody wants me around",
  "my girlfriend didn't text goodnight, she's going to break up with me", "my manager wants a meeting tomorrow, I'm definitely getting fired", 'my friends were laughing when I walked in, they must have been laughing at me',
  "my partner forgot our anniversary, he doesn't love me any more", "my nan didn't hug me when I left, she must be upset with me", "my aunt didn't come to my birthday, she must hate our family",
  "my cousin unfollowed me, everyone thinks I'm weird", 'my sister got all the attention again, mum always loves her more', 'my friend cancelled again, she always does this',
  'my dad shouted, it must be my fault', 'my mum went quiet on the phone, I must have said something wrong', "my boss read my email and didn't reply, he probably thinks I'm useless",
  "my teammates passed to everyone but me, they think I'm rubbish", 'my friend left me on read, she must be sick of me', 'my brother took my side for once, he must want something',
  'my girlfriend went out with her friends tonight, she must be bored of me', 'my mum went to bed without saying goodnight, she must be upset with me', 'my dad went to work without saying goodbye, he must be angry with me',
  "my sister took ages to reply, she must be ignoring me", "my friend found my old diary, now she thinks I'm a freak", "my mum found out I failed, she'll never trust me again",
  'my best mate is sitting with someone else at lunch, he must have replaced me', "my teacher kept me back after class, I'm in so much trouble", "my dad didn't come to my match, he obviously doesn't care",
  "my friend didn't wish me happy birthday, she must have forgotten about me", 'my mum is resting after her shift and didnt ask about my day, she doesnt care about me',
  'my colleague said goodbye to everyone but me, they must all hate me', 'my brother is never around any more, he must not like me',
];

// ---------------------------------------------------------------- 50 ordinary main-screen Tells --
export const R5_MAIN_ORDINARY = [
  ...R5_ORDINARY.slice(0, 40),
  "my mum didn't call me back, she must be angry with me", 'my boss always ignores me', 'my sister never listens, she hates me', 'my dad left the room without saying goodbye, he must be furious',
  'my mum went to bed without saying goodnight, she must be upset with me', 'my girlfriend went out with her friends tonight', 'my brother is never around any more, he must not like me',
  "my friend found my old diary, now she thinks I'm a freak", 'my colleague said goodbye to everyone but me, they must all hate me', 'my nan is resting after her hip operation and seems fine',
];
// the coordinator's 11 main-screen ordinary Tells
export const R5_MAIN_PINNED = [
  'my mum went to bed without saying goodnight, she must be upset with me', 'my dad left the room without saying goodbye', 'my girlfriend went out with her friends tonight',
  'I lost my keys again', 'my phone died', 'I killed it at work today', 'this traffic is murder', 'my plant died', 'my sister took my charger', 'my brother got a new job', 'the party is dead',
];

export const R5_B2 = [
  ['c', 'we had to let him go at the vets'], ['c', 'the doctors said there was nothing more they could do and we let her go'], ['c', 'my mum isnt with us'], ['c', 'grandad isnt with us now'],
  ['c', 'my nan never recovered from the fall'], ['c', 'my dad went into a coma and never woke'], ['c', 'my grandad went home to the lord'], ['x', 'she went home to glory'],
  ['c', 'my nan pegged it'], ['c', 'my mum isnt here anymore'], ['c', 'he had gone by the time we got there'], ['c', 'cancer won in the end'],
  ['c', 'we buried our dog in the garden'], ['c', 'my brother didnt come home from the war'], ['c', 'mum isnt here to see this'], ['c', 'my dad wont see me get married'],
  ['c', 'the baby came too early and didnt make it'], ['c', 'we lost the twins'], ['c', 'she was gone before the ambulance arrived'], ['c', 'they had to let him go in intensive care'],
  ['c', 'my sister lost her baby'], ['x', 'my baby boy grew his wings'], ['c', 'my granny went to be with my grandad'], ['c', 'my nan went to join grandad'],
  ['c', 'my stepdad wasnt breathing when we found him'], ['c', 'my uncle is gone and nobody talks about him'], ['c', 'i never got to say goodbye to my dad'], ['c', 'my dad left us last year'],
  ['c', 'my mum lost her life in the crash'], ['c', 'my gran has been gone a month'], ['c', 'my grandpa is in heaven now'], ['c', 'mum lost her fight on tuesday'],
  ['c', 'the ambulance came but my dad was already gone'], ['c', 'my dad had a heart attack and the paramedics couldnt save him'], ['c', 'my cat got run over'],
  ['c', 'my nan is no longer here with us'], ['c', 'my wee brother never woke up'], ['c', 'dad lost his battle'], ['c', 'my best friend is gone forever'],
  ['c', 'we let our dog go peacefully at home'], ['c', 'my grandad isnt with us any longer'], ['c', 'mum wasnt breathing when i found her'],
];
