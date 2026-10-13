// Another Angle, review round 9 (13 Oct 2026): the probe table for the coordinator's round-2 guidance. Every probe the
// two round-2 reviews (semantic and UI) named is here verbatim, with the route it must take, beside the builder's own.
// Reviewers: add a line to the right list and run
//   node --test hushmallow/tests/beyond-r9.test.mjs
// Nothing else needs changing. (Routes as in r8.mjs: crisis | care | follow | gentle | feeling | anger | kind | guess.)

// ------------------------------------------------------------------ death talk (semantic blocking 1) --
/** The semantic reviewer's own DEATH set (105): each reaches the gentle path (or care / crisis), never a game. */
export const SEM_DEATH = [
  "my dads dead and i miss him", "my mums dead", "We lost Dad in March.", "My cat got hit by a car and died.", "My husband was murdered.", "dad died",
  "mum dead", "nan dead", "my granny died", "Mum died", "grandpas dead", "my nephew is dead", "my dad has died", "my mum has passed", "my mum’s passed",
  "Dad passed.", "my nan passed last week", "my teacher died", "my partner died suddenly", "my twin died at birth", "grandad passed awy on sunday",
  "my mom diead last night", "my dad dide", "my mom past away", "my dog dyed yesterday", "my nan pased away", "my grandad diied last night",
  "my brother is ded", "My grandfather passed on in the night.", "my grandma is gone", "shes gone. i cant believe it", "he's gone now",
  "My mum is no longer with us", "RIP grandad", "r.i.p nana x", "he’s in heaven now", "my dog crossed the rainbow bridge",
  "we said our final goodbyes to grandad", "the love of my life passed away", "my soulmate is dead", "someone I love died",
  "it’s been six months since dad went and nothing feels real", "Today would have been my dads 60th birthday", "the person I loved most is gone",
  "lost my mum to covid", "lost my dad to cancer two years ago", "we lost Gran at Christmas", "lost him in june",
  "I lost her last year and I still talk to her", "lost my grandad", "My aunt lost her battle with cancer", "my rabbit died overnight",
  "my hamster is dead", "my goldfish died and my daughter is heartbroken", "had to have my dog put down today", "the vet put him to sleep this morning",
  "my dog passed away yesterday and the house is so quiet", "my horse had to be euthanised", "my dog got run over", "my pet rat died",
  "my guinea pig passed", "our cat never came home and we found her by the road", "we had a miscarriage at 12 weeks", "I miscarried on Tuesday",
  "our son was stillborn", "we lost the baby", "lost our baby girl at 20 weeks", "my brother killed himself last year",
  "my best mate died in a car crash", "she didnt make it", "the baby didn't make it", "my friend was killed in an accident on the motorway",
  "my uncle drowned on holiday", "my cousin overdosed and died", "my boyfriend was stabbed and died", "my sister was hit by a train",
  "My neighbour was found dead", "my friend took her own life", "my son died in Afghanistan", "my uncle got shot and killed",
  "the doctors said he won’t survive the night", "My dad was killed in a car accident when I was 10 and it still hurts",
  "My dad’s funeral is on Friday and I can’t face it", "its the anniversary of mums death tomorrow", "one year since my sister died",
  "my wife has terminal cancer", "my dad is in a hospice and they say days now", "They’re turning off his life support tomorrow",
  "i went to the cemetery today to see my mums grave", "We scattered his ashes at the beach.", "I’m grieving my father", "I can’t stop grieving",
  "still mourning my brother", "the funeral was yesterday", "we buried my grandad today", "she was cremated on friday",
  "My mother passed away peacefully in her sleep.", "My ex died and I don’t know how to feel", "I keep thinking about the day my brother died",
  "My dad died and everyone thinks I should be over it by now", "since mum passed I always mess everything up",
  "Work has been mad, my manager keeps moving deadlines, and on top of that my grandmother died on Saturday, so I’m barely holding it together and I still have to present on Monday.",
  "I was fine at school today, then at lunch I got a text saying my uncle had died, and I just sat in the toilets for an hour.",
  "My exam went badly. Also my cat died this morning. Honestly everything is falling apart.",
  "Not sure why I am typing this but my best friend from school passed away on the weekend and nobody at work knows",
];
/** …and the extended set (112). */
export const SEM_DEATH2 = [
  "my dad is ded", "mum ded", "my nan dyed", "my dog dided", "my grandma deid", "passed awya", "my grandad isnt with us anymore",
  "my mum left us last year", "my dad is six feet under", "we had to say goodbye to our dog", "the vet said it was time", "my cat was put down",
  "she was put to sleep", "the vet put her down", "it’s the first christmas without mum", "my baby was born sleeping", "we lost our pregnancy",
  "I had a miscarrage", "my partner passed in the night", "my granddad has passed on", "my mother passed recently", "my sons death", "my dad’s dying",
  "grandma’s not going to make it", "my dog got hit by a car", "My brother was in a fatal crash", "nan has gone to be with grandad",
  "my dad’s heart stopped", "my mum never woke up", "my husband took his life", "my daughter’s funeral", "my baby passed", "RIP mum",
  "my best friend dyed", "my granda died", "my mammy is dead", "my pop passed away", "my pops passed", "my gramps passed", "my bestie passed",
  "my old man passed last week", "my missus passed", "my fella passed", "my granda passed", "my da passed", "my ma passed", "my mother-in-law passed",
  "Bob passed last week", "my lad passed", "my wee boy passed", "my mum is gone", "mum’s gone", "he’s dead", "theyre all dead", "my mom just passed",
  "my mom passed this morning", "my mum died of cancer last night", "my dad was killed", "killed in a crash, my cousin",
  "my uncle got killed in a fight", "my friend was knocked down and killed", "my nan lost her life in the fire", "my brother drowned",
  "my sister died in her sleep", "lost my brother", "lost my bro last year", "we lost our little boy", "i lost my dad", "i lost my mom", "i lost my mam",
  "lost mum", "my aunties funeral is tomorrow", "buried my dad today", "at my grandads wake", "condolences pouring in for my dad",
  "my grandmother is terminally ill", "they’re switching off mums machine", "my dad is on end of life care",
  "we’re saying goodbye to grandad in the hospice", "my baby boy’s heart stopped beating", "my cat isnt alive anymore",
  "my friend from school is not alive anymore", "my dog is no more", "my grandpa is no longer here", "my child died", "my kid died",
  "my 3 year old died", "my son, 19, died", "My father died when I was a child and today I found his letters",
  "the anniversary of my sons death is next week", "it’s a year today since we lost mum", "mums been gone 2 years", "dads been dead a year now",
  "my best friend is dead and i dont know what to do", "i cant believe hes gone", "Can’t believe she’s really gone.", "my wife has passed",
  "My husband passed on Monday", "Our dog passed away", "My budgie died this morning", "my fish died lol", "my tortoise died after 40 years",
  "the kitten didnt make it", "the puppy didn’t survive", "the baby died", "my baby girl died in my arms", "my unborn baby died",
  "we lost the twins at 22 weeks", "i had a stillbirth", "my sister was hit by a bus and died", "My grandad passed away from covid in hospital",
  "My friend’s dad died and I don’t know what to say to her",
];
/** The six the round-2 review saw miss, and the twenty extended misses (verbatim). */
export const DEATH_MISSES_R2 = [
  'my grandad diied last night', 'my brother is ded', 'Today would have been my dads 60th birthday', 'the person I loved most is gone',
  'the vet put him to sleep this morning', 'my sister was hit by a train',
  'my dad is ded', 'mum ded', 'my dog dided', 'my grandad isnt with us anymore', 'my dad is six feet under', 'she was put to sleep', 'the vet put her down',
  'it’s the first christmas without mum', 'we lost our pregnancy', 'my dog got hit by a car', 'my pops passed', 'my gramps passed', 'my missus passed', 'my fella passed',
  'my granda passed', 'my da passed', 'my ma passed', 'my lad passed', 'they’re switching off mums machine', 'my dog is no more',
];
/** A missed death with an interpretive marker beside it: never framed (gentle), authored or server. */
export const DEATH_WITH_MARKER = [
  'my brother is ded and nobody cares', 'the vet put him to sleep and now everyone thinks im overreacting',
  'my grandad isnt with us anymore and I always mess everything up', 'its the first christmas without mum and everyone thinks i should be fine',
];
/** Misspellings and phrasings the bag of words reads on its own (never framed even if deathTalk missed them). */
export const BAG_R9 = ['ded', 'dided', 'diied', 'deid', 'six feet under', 'put to sleep', 'no longer with us', 'with us anymore', 'is no more', 'my best friend dyed', 'the vet put her down', 'first christmas without', 'would have been my dads 60th birthday'];
/** The semantic reviewer's ORDINARY set (52): never framed beside a bag word; fiction, games and a plant may go gentle (recall first). */
export const SEM_ORDINARY = [
  "I lost my keys again", "I lost my job today", "we lost the game 3-0", "my phone died halfway through the call", "my laptop battery is dead",
  "I’m dead tired", "I’m dying to see the new film", "I passed my driving test!", "I passed my exam", "I failed my exam",
  "I killed it in my presentation", "this commute is killing me", "my car died on the motorway", "my headphones died", "I lost my temper with my sister",
  "I lost my voice", "I lost track of time", "I got lost on the way to work", "the deadline is tomorrow and I haven’t started", "I could murder a pizza",
  "I’m dying for a coffee", "I nearly died of embarrassment", "it’s your funeral if you don’t revise", "my phone is dead", "lost my wallet on the bus",
  "we lost the match on penalties", "I lost my bet with my brother", "I’m so lost in this maths class", "the wifi died again", "I’m bored to death",
  "I need to kill time before my train", "my battery died", "the meeting was dead boring", "that test was dead easy", "I lost weight",
  "that was a grave mistake at work", "Lost my glasses", "phone battery died at the concert lol", "my charger is dead", "I passed the interview",
  "my computer crashed and I lost my essay", "I passed out at the gym", "I nearly crashed the car", "over my dead body is he borrowing my car",
  "My son died in Fortnite and smashed his controller.", "My character died in the game and I lost all my progress",
  "I watched a film where the dog dies and cried", "the main character dies at the end of the book", "got killed in the game five times",
  "the plant I bought died", "I lost my keys and now everyone thinks I’m useless", "my phone died and she must think I’m ignoring her",
];
/** …of which these go gentle (allowed: the gentle lines are true for them). Everything else goes kind. */
export const SEM_ORDINARY_GENTLE = [
  'My son died in Fortnite and smashed his controller.', 'My character died in the game and I lost all my progress', 'I watched a film where the dog dies and cried',
  'the main character dies at the end of the book', 'got killed in the game five times', 'the plant I bought died',
];
/** Polish: a gadget's part right before "died" is still the gadget ("phone battery died"): no longer a false alarm. */
export const NOT_DEATH_R9 = ['phone battery died at the concert lol', 'my phone battery died', 'and then the laptop battery died', 'she was put to sleep for her operation', 'my application passed', 'my mum passed the salt',
  // (builder: the generic "my … passed" never reads a cold, a headache or a panic attack that passed)
  'my cold passed', 'my headache passed', 'my anxiety passed after an hour', 'my panic attack passed'];

// --------------------------------------------------------------- feelings, anger, markers (semantic 2) --
/** The semantic reviewer's FEELINGS (37): a feeling, never framed, whatever the server answers. */
export const SEM_FEELINGS = [
  "I keep feeling sick with dread.", "I feel sick about tomorrow.", "I feel anxious all the time.", "I’m so tired.", "I feel empty.", "I feel numb.",
  "I’ve been feeling really low lately.", "I feel lonely at uni.", "I’m feeling overwhelmed.", "I feel guilty for saying no.", "I can’t stop crying.",
  "I feel nervous about the interview.", "I’m scared.", "I feel sick.", "I keep feeling on edge.", "I feel shaky and tight in my chest.",
  "I’ve been feeling panicky all morning.", "I feel worthless.", "I feel so heavy today.", "I’m dreading Monday.", "I feel jittery about the results.",
  "feeling sick with nerves", "I feel queasy about the exam.", "I’m feeling really anxious about my driving test.", "I feel exhausted and drained.",
  "I feel frustrated with myself.", "I feel hollow inside.", "I feel like crying.", "I keep feeling scared at night.",
  "I’m really stressed about money.", "I feel dizzy and weird.", "I’m so worried about my mum.", "I feel heartbroken.", "I’ve felt down for weeks.",
  "im feeling sick about the results", "I feel sick with worry about my son", "I keep feeling dread in my stomach",
];
/** The semantic reviewer's ANGER (22), with the route each takes (anger: fair anger's own scenes; kind: a stated event; care: the lexicon). */
export const SEM_ANGER = [
  "My boss embarrassed me in front of everyone", "My sister read my diary.", "My flatmate ate my food again without asking.",
  "My friend lied to me about the party.", "My manager took credit for my work.", "He shouted at me in front of the class.",
  "She called me fat in front of my friends.", "My dad broke his promise to come to my match.", "My boyfriend cheated on me.",
  "My teacher humiliated me in front of everyone.", "Someone stole my bike from outside the shop.", "My colleague talked over me in the meeting.",
  "My mum went through my phone.", "They left me out of the group chat on purpose.", "My friend ghosted me after I helped her move.",
  "The landlord kept my deposit for no reason.", "My coworker blamed me for her mistake.", "My best friend told everyone my secret.",
  "My partner forgot my birthday.", "My coach dropped me from the team without telling me.", "My brother borrowed my car and crashed it.",
  "My boss embarrassed me in front of everyone and now everyone thinks I’m useless",
];
export const SEM_ANGER_ROUTES = {
  'My flatmate ate my food again without asking.': 'kind', 'My mum went through my phone.': 'care', 'They left me out of the group chat on purpose.': 'kind',
  'The landlord kept my deposit for no reason.': 'kind', 'My brother borrowed my car and crashed it.': 'kind',
  'My boss embarrassed me in front of everyone and now everyone thinks I’m useless': 'guess',
};
/** Interpretive markers with no bag word: the framing still plays (sanity). */
export const SEM_MARKERS = [
  "Everyone at work thinks I’m useless", "She must hate me", "Nobody likes me", "What if I fail tomorrow", "I’m such an idiot",
  "I should have known better",
];
/** The realistic server answers the semantic reviewer stubbed (their lines must never play without a marker). */
export const REALISTIC = {
  realistic: { reasoning_pattern: 'catastrophising', interaction_type: 'shrink_projection', mallow_character: 'loomi', emotion: 'worry', situation_type: 'other',
    known_fact: 'You said how you feel about it.', possible_assumption: 'That it will go badly.', alternative_angle: 'A silence can mean many things.',
    practical_next_step: 'Write down one thing you know for sure about it.', subtitle_line_1: 'Dread is a prediction, not a promise.', subtitle_line_2: 'Tomorrow hasn’t happened yet.', safety_status: 'ok' },
  realistic_mind: { reasoning_pattern: 'mind_reading', interaction_type: 'open_interpretations', mallow_character: 'pipzi', emotion: 'hurt', situation_type: 'other',
    known_fact: 'You know what happened.', possible_assumption: 'That nobody cares.', alternative_angle: 'Maybe they didn’t know what to say.',
    practical_next_step: 'Ask one person how they are doing.', subtitle_line_1: 'Is it possible they didn’t know what to say?', subtitle_line_2: 'Maybe they didn’t notice.', safety_status: 'ok' },
  realistic_fact: { reasoning_pattern: 'fact_vs_assumption', interaction_type: 'pull_apart', mallow_character: 'zuzu', emotion: 'worry', situation_type: 'other',
    known_fact: 'You told me what happened.', possible_assumption: '', alternative_angle: '',
    practical_next_step: 'Take one slow breath before deciding anything.', subtitle_line_1: 'One moment is a fact.', subtitle_line_2: 'A silence can mean many things.', safety_status: 'ok' },
  // (the real UI case: "My sister read my diary." with sharing on)
  excuse: { reasoning_pattern: 'valid_anger', interaction_type: 'assemble_step', mallow_character: 'glitzi', emotion: 'anger', situation_type: 'family',
    known_fact: 'Your sister read your diary.', possible_assumption: '', alternative_angle: 'Is it possible she was just curious?',
    practical_next_step: 'Tell her what you need from her next time.', subtitle_line_1: 'Is it possible she was just curious?', subtitle_line_2: 'Maybe she didn’t think it through.', safety_status: 'ok' },
};
/** The server's paraphrases of a framing (the review's 32 + 16 examples it quoted, and more): framesAsGuess knows each. */
export const SERVER_PARAPHRASES = [
  'Thoughts aren’t facts.', 'Maybe they didn’t notice.', 'Could it be a coincidence?', 'Is that really true?', 'Your mind is filling in blanks.', 'Dread is a prediction, not a promise.',
  'Perhaps your boss was under pressure too.', 'It’s possible your boss didn’t mean to embarrass you.', 'Five hours without a reply is a fact.', 'Is it possible she was just curious?',
  'Maybe she didn’t think it through.', 'Is it possible they didn’t know what to say?', 'A silence can mean many things.', 'One moment is a fact.', 'Tomorrow hasn’t happened yet.',
  'Feelings aren’t facts.', 'You can’t read minds.', 'You might be jumping to conclusions.', 'How do you know that for sure?', 'What evidence do you have?', 'That might not be the whole story.',
  'Is there another way to see this?', 'It might not be about you at all.', 'What are the odds?', 'It’s probably not as bad as it seems.', 'People are usually thinking about themselves.',
  'That’s your anxiety talking.', 'Not every silence is a rejection.', 'There could be another reason.', 'Could you be reading into it?', 'Your brain is trying to protect you.',
  'Busy people often forget to reply.', 'Maybe it was a bad day for her.', 'There may be more to it than you know.',
];

// ------------------------------------------------------------------ escalation (semantic 3, 4; UI 1) --
/** The semantic reviewer's FOLLOW_POS (36) and extended positives (40): care, nothing sent. */
export const SEM_FOLLOW_POS = [
  "My nan died and I want to be with her", "my dad died and i just want to join him", "I don’t want to be here without him, my husband died last month",
  "mum passed and whats the point without her", "I wish I’d gone with him. He died in the crash.", "my wife died, I want to go where she is",
  "since my son died I can’t go on without him", "my girlfriend died and I wish I was with her", "My dog died and I want to be with him again",
  "grandad’s gone and I just want to be with him", "my brother killed himself and part of me wants to go too", "my mum is dead and I want to follow her",
  "my twin died. it should have been me", "dad passed away and i cant live without him", "my husband died and I’d rather be with him than here",
  "my best friend died, I’ll be with her soon", "my mum died and I want to lie next to her", "my partner died and I don’t want to be here anymore",
  "since mum died I just want to go to sleep and be with her", "my dad is dead i want to see him again soon", "my sister died and I want to die too",
  "my wife passed and life is pointless without her", "lost my husband, nothing to live for now", "my son passed away and all I want is to be with him",
  "my mum died. take me instead", "My brother died last week and I don’t want to live without him", "my fiancé died and I want to join him in heaven",
  "we lost dad and I just want to be with him again", "my cat died and I want to be with her", "nans gone and I want to go with her",
  "mums dead and i wanna be with her", "my dad died and I’m ready to go too", "since my husband passed I can’t see the point of carrying on without him",
  "my grandma died and i want to be where she is", "My mum died in May. I just want to be with my mum.", "my baby died and I want to be with my baby",
];
export const SEM_FOLLOW_POS2 = [
  "my mum died and i want to be with her so bad", "Since Dad died I keep thinking I should just join him", "my wife is gone and I want to go to her",
  "my son passed. I don’t want to live anymore.", "my husband died and I can’t do this without him", "my dad died and I want to be with him now",
  "my girlfriend died last week and I want to be with her forever", "my nan passed and I want to go and be with her",
  "my brother died. I’m going to join him soon.", "my mum died and I keep wishing I’d died with her", "my dad died and I want to end it and be with him",
  "she died and I just want to be with her", "he passed away and I want to be with him", "My best friend died and I don’t want to be alive without her",
  "since my wife died I don’t see the point of living without her", "my mum is dead and I’m going to see her soon",
  "my dad died and i want to b with him", "my mum died and I want too be with her", "my dog died and i just want to be with him again in heaven",
  "my dads dead and i wanna go where he is", "mum died, i want to be with mum", "lost my wife and i want to be with her",
  "my husband passed, i dont want to be here without him", "my son died, i cant go on", "my mum died and I want to be with her again",
  "i want to be with my dad, he died last year", "I just want to be with my mum again. she passed in june",
  "my girlfriend killed herself and i want to follow her", "my brother was murdered and I wish it was me instead",
  "since nan died all i want is to be with her", "my partner died and I want to sleep and never wake up", "my baby died and I want to go with her",
  "my wife died and I don’t want to exist without her", "my dad’s gone, I’m ready to go and be with him",
  "my mum died and I feel like I should be with her", "my mum died and i keep thinking i should be with her",
  "my dad died and i dont wanna be here no more", "my mum passed away and i want to go to heaven to see her",
  "my brother died and i want to see him again", "my fiance passed away i need to be with him",
];
/** The UI review's misses (named before the death, "keep wishing") and the borderline "see him again". */
export const UI_FOLLOW = [
  'I want to join my wife, she died last spring.', 'I want to be with my dad. He died last year.', 'I wish I was with my brother. He died in March.',
  'All I want is to be with my nan, she passed last week.', 'I want to be with my son who passed away', 'I want to be next to my mum, she died', 'Since grandad died I keep wishing I was with him',
  'I miss my dad so much since he died, I want to see him again', 'They died in a crash. I want to be with them.',
];
/** The semantic reviewer's FOLLOW_NEG (34) and extended negatives (33): never care. */
export const SEM_FOLLOW_NEG = [
  "I want to be with my family at the funeral", "I want to be with my mum this weekend", "My nan died and I want to be there for my dad",
  "my grandad died and I want to be with my nan", "my uncle died and I want to be with my aunt, she’s on her own",
  "my dad is dying and I want to be with him", "mum is in a hospice and I want to be with her every day",
  "my nan is on life support, I just want to be with her", "my friend’s mum died and I want to be with my friend",
  "after grandad died I want to be with my cousins at christmas", "my dog died and I want to be with my other dog",
  "my sister died and I can’t go to school tomorrow", "my granny died and I just want to be with my mum", "dad died and I want to go to his grave",
  "my mum died and I want to visit where she is buried", "my brother died and I need my friends with me", "my wife died and I want to be with our kids",
  "my cat died and I don’t want to be alone tonight", "my grandad died. I want to be at the funeral",
  "my mum died and I want to go home to be with my dad", "My grandma passed and I want to be with family",
  "my dad passed and I want to join a support group", "my husband died, I want to follow his wishes", "my son died and I want to keep his memory alive",
  "my nan died and I’m going to stay with my grandad", "my friend died and I want to see his parents", "my dad died, I want to be strong for my mum",
  "my mum is terminally ill and I want to be with her at the end", "My sister died and I want to talk to someone",
  "my uncle died and I want to be with my dad when he hears", "our baby died and I want to hold my wife", "after my dad died I want to make him proud",
  "my grandad died and I want to join the choir he loved", "my aunt died and I just want to be with my sister tonight",
];
export const SEM_FOLLOW_NEG2 = [
  "my grandad died and I just want to be with my grandma right now", "since mum died I want to be with my sister more",
  "my mum died and I want to be with people who knew her", "my dad died and I want to be with my brother at the house",
  "my cat died and I want to be with my partner", "my uncle died, I want to be with my cousins", "my friend died and I want to see her family",
  "my mum died and I don’t want to be alone at home", "my dad died and I can’t go into work", "my dad died, I can’t be here at work today",
  "my nan died and I don’t want to be here at school", "my sister died and I want to be with my mum and dad",
  "my dog died and I want to get another dog", "my husband died and I want to be with my children", "my friend died and I need to be with someone",
  "my nan is dying and I want to be with her till the end", "my dad is in hospital dying and I just want to be with him",
  "grandad’s on life support and I want to be with him when they switch it off", "my mum died and I want to be with her family this christmas",
  "my dad died and I want to be with him in spirit at the match", "my nan died and I want to be with her when they bury her",
  "my brother died and I want to be with his kids", "my mum died and I want to be with my mum’s sister",
  "my grandpa died and I want to go where he grew up", "my dad died and I want to go where he is buried", "my mum died and i want to be with my friends",
  "my dog died and i want to be with my family", "my aunt died and i want to be there for my uncle",
  "my nan passed and i want to join my family for the funeral", "my friend died and i want to follow his football team",
  "my dad died and i want to live the way he did", "my mum died and i want to keep going for her", "my dad died, i want to be like him",
];
/** Someone still alive (dying, in intensive care, not expected to survive): wanting to be at their side is love, never care. */
export const ALIVE = [
  'my dad’s dying and I want to be with him', 'my nan is very ill and dying, I want to be with her', 'my mum is in intensive care and might not make it, I want to be with her',
  'my dad might not make it through the night and I need to be with him', 'the doctors said my nan won’t survive the night and I want to be with her',
  'my grandad is in a coma and they think he won’t wake up, I want to be with him', 'my mum is so ill she could die any day and I just want to be with her',
  'my nan is critically ill and dying and I want to be beside her', 'my husband is on a ventilator and dying, I want to lie next to him', 'my sister is in the icu dying and I want to be with her',
  'my dad is close to death and I want to be with him', 'my dad is in hospital dying and I just want to be with him',
];
/** The builder's own negatives for the new pronoun linking: someone else's death, someone alive. */
export const NOT_FOLLOW_R9 = [
  'I want to be with my mum, my dad died last week', 'I want to be with my sister, she lost her husband', 'I want to be with my mum. Her mum died.', 'I want to be with my brother. He lost his dog.',
  'I want to be with my friend, her mum died', 'I’ll see her again one day, my nan died', 'my nan died and I wish I could see her again', 'I want to be with my dad, my mum died and he is alone',
  'My mum died. I want to be with my dad, he’s gone to pieces', 'My mum died and I want to be with my dad, he’s gone to Spain',
];

// ------------------------------------------------------------------- the app's own framings (polish 2) --
/** Framings the app authors that framesAsGuess did not know (the scenarios' "context" readings are pinned in the test). */
export const APP_FRAMINGS_R9 = [
  'There might be a more ordinary explanation that hasn’t had a chance to come up yet.', 'Now slide the thought to where it really sits.', 'That’s a lot of weight on one thought. Move each piece to where it belongs.',
];
/** A server's grief answer from the design: both lines acknowledge (review r9: "isn't a thought to fix" frames nothing). */
export const GRIEF_DESIGN = ['Missing them this much makes sense.', 'Grief isn’t a thought to fix.'];
