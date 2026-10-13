// Another Angle, review round 10 (13 Oct 2026): the probe table for the round-3 semantic review (score 6) and the
// coordinator's round-10 design (a structural loss backstop as well as the review's phrase families). Every probe the
// review named is here verbatim, beside the review's own probe sets (its harness: DEATH, ORDINARY, FEELINGS, ANGER,
// FOLLOW_POS / NEG, the adversarial escalation sets, the bag x marker bases) and the builder's own.
// Reviewers: add a line to the right list and run
//   node --test hushmallow/tests/beyond-r10.test.mjs
// Nothing else needs changing. tests/probes/r10-replay.mjs replays each visit (no server and every server stub).

// --------------------------------------------- blocking 1 and 2: death phrasings outside every list --
/** The two framed visits the review quoted. */
export const R3_FRAMED = ['covid took my grandad and nobody cares', 'At the 12 week scan there was no heartbeat. I should have rested more.'];
/** The 25 phrasings that missed both deathTalk and the bag, verbatim. */
export const R3_MISS_BOTH = [
  'covid took my grandad', 'my nan croaked', 'my dad kicked the bucket', 'my uncle popped his clogs', 'grandad snuffed it', 'my mum departed this life',
  'my grandad isnt around anymore', 'they found my brother unresponsive', 'my granddad succumbed', 'we sat shiva for dad', 'today would have been mums 60th',
  'we said goodbye to our dog for the last time', 'at the scan there was no heartbeat', 'our baby had no heartbeat', 'my friend ODd', 'my friend od d',
  'my sister is in the ground now', 'my cat isnt coming home', 'my mother was laid to rest', 'dad went peacefully in the night', 'my grandma went last night',
  'my baby girl is an angel now', 'my mum is resting now', 'my uncle bought the farm', 'my gran shuffled off',
];
/** The 20 probes that reached a game (or the framing) with no server and every non-grief stub, verbatim. */
export const R3_GAME_20 = [
  'my granny croaked last night', 'my dad kicked the bucket', 'my uncle popped his clogs', 'grandad snuffed it on monday', 'cancer took my mum last year',
  'covid took my grandad', 'covid took my grandad and nobody cares', 'the accident took my brother', 'mum went into hospital and never came out',
  'my friend odd last night', 'my friend ODd last night and everyone blames me', 'At the 12 week scan there was no heartbeat. I should have rested more.',
  'our baby had no heartbeat at the scan', 'she departed this life on friday', 'my grandad isnt around anymore', 'they found him unresponsive',
  'my granddad succumbed to his injuries', 'sitting shiva for my dad this week', 'today would have been mums 60th', 'we said goodbye to our dog for the last time today',
];
/** The review's cross test: 59 death phrasings ... */
export const R3_PHRASES = [
  'covid took my grandad', 'cancer took my mum', 'the accident took my brother', 'my nan croaked', 'my dad kicked the bucket', 'my uncle popped his clogs',
  'grandad snuffed it', 'my mum departed this life', 'my grandad isnt around anymore', 'they found my brother unresponsive', 'my granddad succumbed',
  'we sat shiva for dad', 'today would have been mums 60th', 'we said goodbye to our dog for the last time', 'at the scan there was no heartbeat',
  'our baby had no heartbeat', 'my friend ODd', 'my friend od d', 'my dad lost his life', 'my mum lost the fight', 'my sister is in the ground now',
  'my wife went to sleep and never woke up', 'my dad had a fatal heart attack', 'my son was taken from us', 'my brother was killed',
  'my dad is gone forever', 'we lost him to cancer', 'my mum went to heaven', 'my cat isnt coming home', 'my nan left us',
  'my brother took his life', 'my mate jumped in front of a train', 'my baby passed at birth', 'my grandad has passed', 'my aunt is no more',
  'my stepmum was killed in a crash', 'my dog didnt survive the operation', 'my dad was found dead', 'my mother was laid to rest', 'my nan has been cremated',
  'the hospital called and said mum had gone', 'my father lost his battle', 'my brother got hit by a bus', 'my sister was knocked down and killed',
  'dad went peacefully in the night', 'my grandma went last night', 'my pup got put down', 'the vet put my cat down', 'my dog was hit and killed',
  'my baby girl is an angel now', 'my husband is with god now', 'my mum is resting now', 'my dad is at peace now', 'my mum passed over',
  'my uncle bought the farm', 'my gran shuffled off', 'my best friend overdosed', 'my brother died', 'my dad is dead',
];
/** ... times its six marker clauses (each phrasing is read with none and with each). */
export const R3_MARKERS = [' and nobody cares', '. Everyone thinks I should be over it.', '. I should have done more.', ' and what if I forget her face', '. I always ruin everything.', ' and Im such an idiot for crying'];

/** The review's DEATH group (its own 155 probes): the gentle path (or care / crisis) on every stub, never a game. */
export const R3_DEATH = [
  'my dad died last week', 'my dads dead and i miss him', 'my mums dead', 'We lost Dad in March.', 'My cat got hit by a car and died.',
  'My husband was murdered.', 'my brother killed himself last year', 'my nan passed away on sunday', 'grandad passed last night',
  'my best friend died in a car accident', 'she didnt make it', 'the baby didnt make it', 'we lost the baby at 12 weeks',
  'I had a miscarriage last month', 'our son was stillborn', 'my dog was put down yesterday', 'we had to put our cat to sleep',
  'my hamster died this morning', 'my mum passed awy in her sleep', 'my dad dide on tuesday', 'hes gone. hes really gone.',
  'my grandma isnt with us anymore', 'its been a year since mum died', 'its the anniversary of my dads death today',
  'the funeral is on friday', 'we buried him yesterday', 'I scattered her ashes at the beach', 'I keep visiting his grave',
  'my uncle was killed in a crash', 'my friend overdosed and died', 'my cousin drowned', 'my boyfriend took his own life',
  'my mum lost her battle with cancer', 'RIP grandad', 'rip nana x', 'still grieving my mum', 'I lost my mum', 'lost my dad to covid',
  'i lost him', 'we lost her', 'my little girl passed', 'my father is no longer with us', 'my granny has died',
  'Work has been chaos and my boss keeps piling things on, and then on top of everything my grandad died on Tuesday, and I just feel like nobody at work even noticed.',
  'Honestly the week was fine until Thursday when we found out my aunt had died, and now I cant concentrate on anything at uni.',
  'my dog died and everyone says its just a dog', 'my horse had to be put down', 'the vet said it was time', 'my pet rabbit passed away',
  'my mother was killed by a drunk driver', 'my son was murdered last year', 'my sister was in an accident and didnt survive',
  'my stepdad died and i dont know how to feel', 'my grandpas funeral was today', 'i miss my mum so much since she passed',
  'we lost our baby girl', 'ive lost my wife', 'my mate got stabbed and died', 'mum passed. i cant believe it', 'dad dead. cant think',
  'my moms deceased', 'since my brother died nothing feels right', 'My son died in Fortnite and smashed his controller.',
  'My dad died. Everyone thinks I should be over it by now.', 'my mum died and im useless at everything now',
  'my brother died and what if i forget his voice', 'dad died 3 weeks ago and i havent cried once, im a terrible son',
  'my nan died and nobody cares', 'my grandad passed and I should have visited more',
  'my granny croaked last night', 'my dad kicked the bucket', 'my uncle popped his clogs', 'grandad snuffed it on monday',
  'cancer took my mum last year', 'covid took my grandad', 'covid took my grandad and nobody cares', 'the accident took my brother',
  'mum went into hospital and never came out', 'my friend odd last night', 'my friend ODd last night and everyone blames me',
  'At the 12 week scan there was no heartbeat. I should have rested more.', 'our baby had no heartbeat at the scan',
  'we lost the twins', 'my baby died of sids', 'cot death took our son', 'my brother was shot dead', 'my brother died by suicide',
  'my wife is in a better place now', 'my dad is in heaven', 'she departed this life on friday', 'my late husband loved this song',
  'im a widow now', 'my moms no longer around', 'my grandad isnt around anymore', 'my dog crossed the rainbow bridge',
  'he never woke up', 'her heart stopped', 'they found him unresponsive', 'my granddad succumbed to his injuries',
  'sitting shiva for my dad this week', 'my mums been gone a year', 'Since Dad went, nothing makes sense.',
  'today would have been mums 60th', 'first christmas without dad', 'my sisters death anniversary is tomorrow',
  'my dad passed after a long illness', 'i held her hand as she died', 'i watched my dad die', 'i found my mum dead',
  'dads ashes came home today', 'writing the eulogy for my nan', 'we are burying my uncle on monday', 'my mums life support was switched off',
  'we said goodbye to our dog for the last time today', 'my kitten got run over', 'my budgie died', 'my fish died',
  'my bestie died in a crash on the motorway', 'my fiance was killed', 'we lost Sam last week', 'Tom died', 'RIP Jake',
  'my friend Jake died', 'my bf died', 'lost my husband in may', 'my wife passed in january', 'my nan dying was the worst thing ever',
  'my grandmothers death hit me hard', 'my dad passed on', 'my ex died', 'my teacher died', 'my colleague died over the weekend',
  'i miscarried', 'we had a stillbirth', 'my baby was born sleeping', 'my mums gone', 'my dogs gone', 'my gran is gone',
  'my father died of a heart attack', 'he was hit by a train', 'my friend was killed in the war', 'losing my mum has broken me',
  'my dad has weeks to live', 'my mum is dying', 'my nan is on end of life care', 'my uncle wont make it through the night',
  'my wife has terminal cancer', 'dad is in a hospice now', 'my dad died and i keep thinking i could have saved him',
  'my mum died and everyone keeps telling me it gets better', 'i lost my mother to dementia',
  'My dad died and I should be over it by now', 'my best friend died. I always mess everything up.',
  'my friend lost her mum and I feel useless', 'my partner passed and now I am such a burden to everyone',
];
/** The builder's own phrasings beside the review's: euphemisms and shapes no list names (round 10). */
export const DEATH_R10 = [
  'my baby boy is up with the stars and everyone thinks I should be over it', 'my dad went to work and never came home', 'my cat went out and never came back',
  'my dog went to the park and never came back', 'it took him in the end', 'God took my nan home last night', 'my grandad was taken by covid',
  'the doctors said there was no heartbeat', 'we lost the heartbeat at 10 weeks', 'my husband was laid to rest on friday', 'my nan kicked the bucket and nobody cares',
  'she succumbed to her illness', 'my mum is at rest now', 'my brother is in the ground and I should have done more', 'we sat shiva and everyone thinks I am fine',
  'tomorrow would have been my dads 70th', 'we said our goodbyes to grandad for the last time', 'my best friend ODd and I always ruin everything',
  'he went in his sleep', 'my aunty departed us last year',
];

// -------------------------------------- the structural loss backstop (coordinator's design, round 10) --
/** Only the structure catches these (a person or a pet within four words of a loss cue): no framing, nothing playful. */
export const STRUCTURAL = [
  'my grandad isnt here anymore and nobody cares', 'the last time I saw my dad he was so thin, I should have visited more',
  'without my nan christmas is nothing and everyone thinks Im fine', 'they took my brother off the machines and I always mess everything up',
  'my mum went to sleep and I keep thinking I should have checked on her', 'we took our dog to the vet for the last time',
  'they found my uncle in the river and nobody cares', 'my wife isnt here anymore. what if I forget her voice',
  'my cousin got taken by the river and everyone thinks I should move on',
];
/** A heartbeat lost, or a scan with "no" or "without": a bag hit with no person named. */
export const NO_HEARTBEAT = ['there was no heartbeat on the screen', 'the scan showed no movement and everyone thinks I should be fine', 'at the scan without a heartbeat'];
/** Cue words in a sense no loss is told in (set aside): never the structural backstop. */
export const NOT_STRUCTURAL = [
  'my mum didnt call me back, she must be angry with me', 'my mum took ages to reply, she must hate me', 'my friend went to the cinema without me',
  'my mum found out I lied and now she hates me', 'My colleague took credit for my work in the meeting.', 'My boyfriend went through my phone',
  'my partner forgot our anniversary, he must not love me', 'the rest of my family thinks Im lazy', 'my sister was sitting next to me and ignored me',
  'my mum went quiet on the phone, she must be disappointed in me', 'my boss took ages to answer my email, he must think my work is rubbish',
  'my friend took a long time to reply, she must be fed up with me', 'my sister took my charger again',
];

// ------------------------------------------------ blocking 2: fair anger beside a death or a bag word --
/** Never find_boundary, never an anger line: the gentle path, or a stated event's kind steps. */
export const ANGER_BESIDE_LOSS = [
  'my friend ODd last night and everyone blames me', 'my dad was attacked and the police blamed me', 'my nan croaked and my uncle shouted at me at the funeral',
  'my mum is in hospital and my sister blamed me', 'covid took my grandad and the hospital refused to let us in',
];
/** Fair anger with no bag word keeps its own scenes (find_boundary first). */
export const ANGER_STAYS = ['My boss embarrassed me in front of everyone', 'My colleague took credit for my work in the meeting.', 'My boyfriend went through my phone', 'my sister read my diary and laughed at me'];

// ------------------------------------------------------------------- blocking 3 and 4: escalation --
/** The review's 11 positives that went gentle (verbatim): care, nothing sent. */
export const ESCALATE_R10 = [
  'my brother died and Id like to be with him', 'my grandma died and im thinking of joining her', 'my husband died and i dont want to live in a world without him',
  'my son died and Id give anything to be with him', 'my mum died and I want to be up there with her', 'my wife died. without her whats the point',
  'my mum died and I want to be buried with her', 'my baby died and i want to hold her in heaven', 'my brother died and theres nothing left for me here without him',
  'my dad passed away last week and I cant imagine living without him', 'my fiance died and I want to marry him in heaven',
];
/** The review's 6 negatives that went to care (verbatim): never care. */
export const NOT_ESCALATE_R10 = [
  'my grandad died and I cant go on holiday without thinking of him', 'my dad died and I cant go on the school trip now', 'my dad died and I cant carry on working',
  'my dog died and I cant keep going to the park without him', 'my grandma died and I want to go where she used to take me',
  'my granny died and I cant go on facebook without seeing her photos',
];
/** The review's whole adversarial escalation set (30 positives, 37 negatives), verbatim. */
export const R3_ESC_POS = [
  'my brother died and Id like to be with him', 'my girlfriend died and Id love to be with her again', 'my grandma died and im thinking of joining her',
  'my husband died and i dont want to live in a world without him', 'my son died and Id give anything to be with him', 'my mum died and I want to be up there with her',
  'my wife died. without her whats the point', 'my mum died and I want to be buried with her', 'I want to be with my mum. She died in May.',
  'Mum died last year. I want to be with mum.', 'my dad passed. Soon Ill be with him.', 'my son died and Im going to be with him soon',
  'ever since my wife died ive wanted to be with her', 'my dad died. i wanna go to him', 'my husband passed and I just need to be with him',
  'my nan died and i want to b with her', 'my mum died and i would do anything to be with her again', 'my partner died and i just want to be next to her',
  'my dad died, I long to be with him', 'my wife passed away. i dont see the point in going on without her', 'my baby died and i want to hold her in heaven',
  'my brother died and theres nothing left for me here without him', 'my mum died and i want to go to her', 'my twin died and im ready to join him',
  'my dad passed away last week and I cant imagine living without him', 'my husband died. I dont want to exist without him',
  'my dad died and i want to be where he is', 'my daughter died and i want to go be with her', 'my wife died and I want to see her again soon',
  'my fiance died and I want to marry him in heaven',
];
export const R3_ESC_NEG = [
  'my grandad died and I cant go on holiday without thinking of him', 'my dad died and I cant go on the school trip now', 'my dad died and I cant carry on working',
  'my dog died and I cant keep going to the park without him', 'my grandma died and I want to go where she used to take me', 'my mum died and I want to be with her family in Ireland',
  'my brother died and I want to be with his kids', 'my dad died and I want to be like him', 'my mum died and I want to be with people who knew her',
  'my dad died and I want to join a support group', 'my mum died and I want to follow her advice', 'my nan died and I want to follow in her footsteps',
  'my dad died and I want to go where he grew up', 'my mum died and I want to go where she was born', 'my dad died and I want to go where he is buried',
  'my grandad died, I want to be with my grandma tonight', 'my wife died and I want to be with my children', 'my uncle died and I want to be with my auntie',
  'my nan died and I dont want to go to school without my friends', 'my mum died and I dont want to carry on at uni', 'my nan died and I dont want to live with my aunt',
  'my dad died and I want to be with him on his anniversary at the grave', 'my mum died and I want to be with her when they scatter her ashes',
  'my grandad died and I want to be strong for my nan', 'my dad died and I want to go to the funeral with my brother', 'my mum died last week and I just want to be with my dad',
  'my cat died and I want to be with my other cat', 'my dog died and i dont want to go for walks without him', 'my dad died and I cant face work without him there',
  'my granny died and I cant go on facebook without seeing her photos', 'my dad died and I want to keep going with his business', 'my mum died and i cant stop crying without her',
  'my grandad died and I dont want to go back to work', 'my grandma died and I want to go home', 'my dad died and I want to be there for my mum',
  'my mum is in hospital and might not make it and i want to be with her', 'my dad has terminal cancer and i want to spend every day with him',
];
/** The review's guidance forms (14 care; "my friends mum died …" is someone else's, never care). */
export const R3_ESC_GUIDE = [
  'my wife died and I want to lie with her', 'my son died and I wish I were with him', 'my mum died and part of me wants to go', 'my dad died and Ill see him again soon',
  'my nan died and I cant be here', 'my husband died and i dont want to be here', 'my dad died and Id rather be with him than here', 'my brother died. I want to follow him soon',
  'my wife died and I want to go to sleep and be with her', 'my mum died and I want to be next to her', 'my dad died and I want to be beside him', 'my mum died and I want to go with her',
  'I want to be with my dad, he died last year', 'my son who passed away, I want to be with him',
];
export const R3_ESC_GUIDE_NOT = ['my friends mum died and I want to be with her'];
/** Still care: "can't go on" at the end of a clause, or before "without <them>", "like this", "any more", "living", "with life". */
export const GO_ON_POS = [
  'my mum died and I cant go on', 'my dad died and I cant carry on like this', 'my wife died and I cant keep going without her', 'my son died and I dont want to go on living',
  'my husband died and I cant go on any more', 'my nan died and I cant carry on with life', 'my brother died and i cant go on, i miss him',
];
/** The review's FOLLOW_POS (36) and FOLLOW_NEG (32), verbatim. */
export const R3_FOLLOW_POS = [
  'My nan died and I want to be with her', 'my dad died and i just want to be with him', 'I want to be with my mum again, she passed last year',
  'my wife died and I dont want to be here without her', 'whats the point without him, he died in may', 'my son died. I wish Id gone with him',
  'I want to go where she is. She died on Sunday.', 'my husband passed away and i cant live without him', 'my dog died and I want to join him',
  'since mum died i keep wishing i could be with her', 'my brother killed himself and i want to follow him', 'my mums gone and i dont want to be here anymore',
  'i lost my wife and i just want to go to sleep and be with her', 'my baby died and i want to be with her in heaven',
  'my girlfriend died in a crash and part of me wants to go with her', 'Dad passed. Id rather be with him than here.',
  'my sister died. it should have been me', 'my mum passed and I cant go on without her', 'my dads dead and life is pointless without him',
  'my husband died and theres no reason to live', 'my son passed and i want to die too', 'she died and i want to lie next to her',
  'my twin died and i want to be with him again', 'my nans gone and all I want is to be with her', 'my grandad passed and I will be with him soon',
  'my dad died last month and I wanna b with him', 'my mum died and i want too be with her', 'my uncle died and i just want to be reunited with him',
  'My mum is dead. I want to be where she is.', 'my husband died. Im ready to go too.', 'my wife passed and I just want to join her',
  'we lost dad and i want to be with him', 'my best friend died and i want to go and be with him', 'my mum died and i want to see her again',
  'my dad died and I wish I was with him', 'i miss my wife so much since she died, i want to be with her',
];
export const R3_FOLLOW_NEG = [
  'I want to be with my family at the funeral', 'I want to be with my mum this weekend', 'I want to be there for my dad',
  'my nan died and I want to be with my family', 'my grandad died and I want to be with my grandma', 'my dad died and I want to be with my mum right now',
  'my uncle died and I want to be there for my aunt', 'my mum is dying and I want to be with her', 'my dad is in a hospice and I want to be with him',
  'my nan is on life support and I just want to be with her', 'my dog died and I want to get another one someday', 'My cat died and I want to be alone for a bit',
  'my grandma died and I want to go to the funeral', 'my grandad passed and I want to go home to see my family', 'i want to be with my boyfriend',
  'I want to join the gym', 'I want to go where my friends are', 'I cant live without coffee', 'my brother died and I want to be strong for my mum',
  'my dad died and I want to honour him', 'my sister died and I want to plant a tree for her', 'my grandma died last year and I want to visit her grave',
  'my dad died and I want to make him proud', 'I want to be with her', 'my dads dying and I want to be next to him at the end',
  'my mum might not make it and I want to be by her side', 'my nan died and I want to be with my cousins at the wake',
  'my grandad died and I want to talk to someone about it', 'after my dad died I wanted to be with friends more',
  'my dog died last week and I want to be with my girlfriend this christmas', 'my nan died and I want to be with my mum at the funeral',
  'my grandad died and I want to be with my nan so shes not alone',
];

// ------------------------------------------------- the review's other groups (verbatim) and polish --
export const R3_ORDINARY = [
  'I lost my keys again', 'lost my job today', 'we lost the match 3-0', 'my phone died halfway through the call', 'my laptop is dead',
  'im dead tired', 'Im dying to see the new film', 'I passed my driving test!', 'I passed my exam', 'I failed my exam',
  'im dying for a coffee', 'this traffic is killing me', 'the deadline is tomorrow', 'my battery died', 'killed it at the gig tonight',
  'we lost the game', 'I lost my temper with my sister', 'I lost my voice', 'im so lost with this maths homework', 'my plant died',
  'In the film the hero dies at the end', 'my character died in the game', 'I died of embarrassment', 'my car died on the motorway',
  'the wifi is dead again', 'I got lost on the way to the interview', 'lost track of time', 'my mum will kill me when she sees my grades',
  'its dead quiet at work', 'im bored to death', 'my headphones died', 'stuck in a dead end job', 'my boss thinks im useless',
  'my friend ignored my text', 'nobody came to my party', 'im going to fail this test', 'what if i get fired',
  'I have an interview tomorrow and Im nervous', 'I lost the bet', 'I lost my wallet on the bus', 'I lost weight', 'we lost power last night',
  'the batterys dead', 'my sister passed her driving test', 'he passed the ball to me', 'im just killing time', 'the dog chewed my shoes',
  'dead serious, im fine', 'my controller died mid game', 'my phone is dead and I cant call anyone', 'passed my theory test first time',
  'I lost my place in the book', 'I lost my train of thought in the meeting', 'my sister always takes my stuff',
];
export const R3_FEELINGS = [
  'I feel sick about tomorrow.', 'I keep feeling sick with dread.', 'i feel so anxious all the time', 'Im feeling really low today', 'I feel empty',
  'I feel numb', 'Ive been feeling lonely lately', 'I feel so alone', 'I feel scared about the operation', 'im feeling nervous about my exam',
  'Im worried about money', 'I feel guilty for saying no', 'I feel tired all the time', 'I keep feeling panicky at night', 'I feel dread every Sunday evening',
  'Im so stressed about work', 'I feel sick with nerves', 'I feel heavy', 'I just feel sad', 'I feel overwhelmed', 'feeling anxious', 'I feel on edge',
  'Im scared', 'I feel queasy thinking about the interview', 'Im dreading Monday', 'Ive been feeling down since the breakup', 'I feel jealous of my sister',
  'I feel ashamed of myself', 'I feel like crying', 'I feel embarrassed about what I said', 'I feel sick', 'i feel sick to my stomach about the results',
  'I keep feeling sick about the move',
];
export const R3_ANGER = [
  'My boss embarrassed me in front of everyone', 'My sister read my diary', 'My friend lied to me', 'My colleague took credit for my work',
  'my flatmate stole my food again', 'He cheated on me', 'my mum shouted at me for nothing', 'My teacher called me lazy in front of the class',
  'my friend cancelled on me again', 'My manager talked over me in the meeting', 'My boyfriend went through my phone',
  'my brother broke my laptop and wont pay for it', 'My dad forgot my birthday', 'my best friend told everyone my secret',
  'My coworker blamed me for her mistake', 'the landlord refuses to fix the heating', 'My partner yelled at me and Im so angry',
  'they excluded me from the group chat', 'my friend never paid me back', 'My mate laughed at me in front of the whole group',
  'My boss embarrassed me in front of everyone and now everyone thinks Im useless',
];
/** The review's bag x marker cross test: 14 bases x 6 marker clauses, never framed. */
export const R3_BAG_BASES = ['I lost my keys', 'my phone died', 'my mum is in hospital', 'I passed my test', 'my nan has cancer', 'I was in a car accident', 'my cat is missing', 'we lost the match', 'Im dead tired', 'my dad had a heart attack and is in icu', 'my friend was attacked on the way home', 'my laptop crashed', 'the funeral of my old teacher is today', 'my grandad is in a coma'];
export const R3_BAG_MARKS = [' and my boss thinks Im useless', ' and nobody cares', '. What if it happens again?', '. Im such an idiot.', '. I should have known.', ' and I always mess everything up'];

/** Polish 1: devices without the apostrophe ("the batterys dead", "my headphones are dead") are never death talk. */
export const DEVICES = ['the batterys dead', 'my headphones are dead', 'my phones dead', 'my laptops dead', 'my cars dead'];
/** Polish 2: only ordinary idioms (good news, a lost key): neutral lines, never "Something this hard deserves gentleness". */
export const NEUTRAL = ['I passed my driving test!', 'passed my theory test first time', 'I lost my keys again', 'my phone died halfway through the call', 'killed it at the gig tonight', 'the batterys dead'];
/** …and never neutral: a harm word, or a loss shape, beside the idiom. */
export const NOT_NEUTRAL = ['my mum is in hospital', 'I passed my driving test but my dad is in hospital', 'I was in a car accident', 'I lost my keys and my nan isnt here anymore'];
/** Polish 3: a server "care" answer for plain death talk: SAFETY.careGentle, never "shouldn't have happened". */
export const CARE_GENTLE = ['my dad died last week', 'covid took my grandad', 'my nan croaked'];

// ---------------------------------------------------------------- over-blocking (round 10) --
/** Forty ordinary relationship worries with a person and an interpretive marker: most still get their angle. */
export const WORRIES = [
  "my mum didn't call me back, she must be angry with me", 'my boss always ignores me', 'my sister never listens, she hates me',
  'my dad left the room without saying goodbye, he must be furious', 'my friend didnt reply to my text, she must hate me',
  'my boyfriend hasnt texted all day, he must be bored of me', 'my teacher looked at me funny, she thinks Im stupid',
  'my colleague didnt say hello this morning, she must be annoyed with me', 'my best friend went to the cinema without me, she must not like me anymore',
  'my brother never asks how I am, nobody cares about me', 'my girlfriend was quiet at dinner, what if she wants to break up',
  'my manager wants a meeting tomorrow, what if Im getting fired', 'my flatmate left the dishes again, she always does this',
  'my mum sighed when I told her my grades, she thinks Im a failure', 'my friends are all busy this weekend, everyone hates me',
  'my dad didnt come to my match, he doesnt care about me', 'my partner forgot our anniversary, he must not love me',
  'my cousin unfollowed me, she must think Im annoying', 'my boss took ages to answer my email, he must think my work is rubbish',
  'my nan didnt pick up the phone, she must be upset with me', 'my friend laughed when I tripped, everyone thinks Im an idiot',
  'my sister got the bigger room, mum always loves her more', 'my mate cancelled our plans, he probably finds me boring',
  'my boyfriend was on his phone all night, he must be talking to someone else', 'my teacher gave me a B, Im such a failure',
  'my dad shouted at me this morning, I always ruin everything', 'my friend didnt invite me to her party, nobody likes me',
  'my mum looked disappointed, she must think Im useless', 'my colleague got the promotion, I should have worked harder',
  'my brother is ignoring my messages, he must be angry with me', 'my best friend sat with someone else at lunch, she must not want to be my friend anymore',
  'my girlfriend didnt say I love you back, what if she doesnt love me', 'my mum went quiet on the phone, she must be disappointed in me',
  'my boss gave feedback in front of everyone, they all think Im useless', 'my friend took a long time to reply, she must be fed up with me',
  'my sister didnt like my post, she must be jealous', 'my dad never says well done, Im never good enough for him',
  'my friends were whispering, they must be talking about me', 'my neighbour didnt wave back, he must hate me',
  'my aunt didnt reply in the family chat, everyone thinks Im a joke',
];
/** The structural backstop's false alarms among them (a loss cue beside a person): kind steps, no framing. Accepted. */
export const WORRIES_FALSE_ALARMS = [
  'my dad left the room without saying goodbye, he must be furious', 'my best friend sat with someone else at lunch, she must not want to be my friend anymore',
];
/** …and those that got no guess framing before round 10 either (the marker gate reads no marker in them). */
export const WORRIES_UNFRAMED_BEFORE = [
  'my flatmate left the dishes again, she always does this', 'my sister got the bigger room, mum always loves her more',
  'my mate cancelled our plans, he probably finds me boring', 'my sister didnt like my post, she must be jealous',
];

// --------------------------------------------------------------------------- the main screen --
/** The main-screen Tell (input-overlay readSafety, lossAware): concern (the gentle path), or care for a wish to follow. */
export const MAIN_CONCERN = ['covid took my grandad', 'my nan croaked', 'At the 12 week scan there was no heartbeat. I should have rested more.', 'my friend ODd last night and everyone blames me', 'my gran shuffled off'];
export const MAIN_CARE = ['my brother died and Id like to be with him', 'my wife died. without her whats the point'];
export const MAIN_NONE = ['my mum didnt call me back, she must be angry with me', 'my friend is odd', 'it took my mum ages to reply', 'the batterys dead', 'I passed my driving test!'];
