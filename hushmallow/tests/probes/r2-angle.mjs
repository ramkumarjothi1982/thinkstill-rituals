// Final round 2, unit "Another Angle and detection": the two final reviews' phrasings, verbatim
// (/tmp/claude-0/hf/review-sem-askall.json, review-ui-askall.json), with this unit's own structural variants and negatives.
// Read by tests/r2-angle.test.mjs; the browser probe (tools/beyond/r2-angle-probe.cjs) sends the same words.

/**
 * Semantic blocking 1, verbatim: the wish to do what someone who died did. Every one is CARE on both screens, with 0 requests.
 * (The one miss of the reviewer's own 15, the 16 misses of the wider 30, and the one the lexicon reads as distress.)
 */
export const SEM_ESC_POS = [
  "dad hanged himself, maybe I'll go the same way",
  'my dad hanged himself and I might go the same way',
  "mum died and I'll probably end up the same way soon",
  'my brother killed himself and I might follow suit',
  "my friend took her life and I've thought about copying her",
  "dad's gone and i'm thinking bout doing the same",
  "mum's dead, thinking about doing it myself",
  'my best friend jumped off a bridge and I keep looking at bridges',
  'my dad shot himself and I know where the gun is',
  "grandma died and I don't see the point anymore",
  "my sister killed herself and I'm considering the same",
  "my brother took his own life and I've been thinking of doing likewise",
  'my cousin killed himself and it makes me want to do it',
  'my twin died and I should have died instead, maybe I still will',
  "my dad killed himself, I think I'm next",
  "my dad died and I've considered doing the same",
  'my dad died, thinking about doing the same tbh',
  'since my wife died I just want to go to sleep forever',
];
/**
 * …and what must never be care: the brief's three, the review's four ("the same degree", "scared I'll go the same way" after
 * cancer, "follow her recipes", "buried next to him one day, when I'm old"), and this unit's own.
 */
export const ESC_NEG = [
  'my dad died and I want to do the same course he did',
  "my grandad died and I'll go the same way to school he took me",
  'mum died and I might visit her grave',
  'my mum died and I want to do the same degree she did',
  "my mum died of cancer and I'm scared I'll go the same way",
  "my nan died and I'm going to follow her recipes",
  "my grandad died and I want to be buried next to him one day, when I'm old",
  'my dad died and I might follow in his footsteps and become a nurse',
  "my grandad died and I'm thinking about doing the same job he did",
  "my dog died and I'm thinking about getting the same breed again",
  'my uncle passed away and I think I\'m next in line for his allotment',
  'my grandma died and I keep looking at her photos',
  'my grandad died and I know where the old photos are',
  "mum died last year and I don't see the point of arguing with my sister",
  "my dad drank himself to death and I don't want to go the same way",
  "my nan died peacefully and I want to go the same way when I'm old",
  'my uncle killed himself years ago and we still miss him',
];
/** This unit's own variants of the structure (a death, then a first-person clause doing the same act, the means, or no point). */
export const ESC_STRUCT_POS = [
  'my brother killed himself last year and honestly I might do the same',
  "dad hung himself and I think I'll do the same",
  "my mum overdosed and I've got enough pills to do the same",
  'my friend jumped in front of a train and I keep thinking of doing it too',
  'since my sister took her own life I keep wanting to do the same',
  'my uncle shot himself and maybe I will too',
  "my dad killed himself and I'm planning to do the same",
  "my brother died by suicide and I wonder if I'll do the same",
  "my dad killed himself, and I feel like I'm going the same way",
  "mum killed herself and I'm heading the same way",
  "after my dad's suicide I've thought about ending it too",
  "my dad killed himself and I'd do the same if I had the guts",
  'my sister killed herself and i get why, i might too',
  'lost my brother to suicide and part of me wants to follow him',
  'my dad hung himself, and honestly the same thing might happen to me',
  "Since mum OD'd I've been tempted to do the same",
  'my cousin killed himself and I feel like doing it too',
  "my dad died last month, I'm thinking of following him",
  "my boyfriend killed himself and I'm next, I know it",
  'my dad died and I keep thinking I should go the same way',
  "maybe I'll go the same way as him, he hanged himself",
  'my mate killed himself and I cant stop thinking about doing the same',
  'grandad passed and i dont see the point any more',
];
/** …and their ordinary neighbours: a plan, a habit, a fear, someone's recipe, the same job, the same breed. */
export const ESC_STRUCT_NEG = [
  "my dad died and I'm going to do the same thing every year, light a candle",
  'my mum died and I want to do the same as her and become a teacher',
  "my grandma died and I'm going to follow her lead and cook every Sunday",
  'my dad died and I want to copy his recipes',
  "my mum died, and I'm next to inherit the house",
  'my uncle died and I might be next to speak at the funeral',
  "my dog died and I'm considering the same vet for my new puppy",
  "my grandma died and I'm going to do it for her",
  "my dad died and nobody fixes the fence now, so I'll do it myself",
  "my nan died at 95 and hopefully I'll go the same way, peacefully",
  "my grandad died and I'm doing it myself now, the garden",
];
/**
 * (semantic blocking 1, its last part) A suicide death word beside a first-person future: Another Angle's gentle path never sends
 * these words; it routes them to care (said gently), with 0 requests. The main screen sends nothing anyway (its gentle path).
 */
export const SUICIDE_FUTURE = [
  "my dad killed himself and I'm going to plant a tree for him",
  'my brother took his own life and I want to raise money for a charity',
  'my mum took her own life last year and I might visit her grave on sunday',
  "my best friend hanged himself and I'll be at the funeral on friday",
];

/** Semantic blocking 4, verbatim: death words that describe a thing, a place, an event, a game, a book or a creature. */
export const SEM_ORDINARY = [
  'the battery in my car is dead again', 'the party last night was dead', 'my cat brought a dead mouse in', 'I killed the spider in the bath',
  'my character died in the game', 'I played a game where everyone dies', 'my sim died in a fire', 'we went to the cemetery on a school trip',
  'the match was a dead rubber', 'we buried the time capsule at school', "I'm reading a book about the black death", 'we found a dead bird in the garden',
  'the dead mouse under the sofa smelt awful',
];
/** …and the person or the pet of their own beside the same words: still gentle, no question. */
export const KEEP_GENTLE = [
  'my cat died and we buried her in the garden', 'we found our hamster dead in his cage', 'the vet put our dog down', 'my dad died while we were watching a film',
  'My son died in Fortnite and smashed his controller.', 'my grandad is buried in the cemetery we visited on the school trip', 'our mouse died last night',
  'my rat died this morning', 'the dead mouse in the cage was our pet', 'my mum died in a car crash', 'we buried our rabbit next to the shed',
  'my friend died and I keep playing the game we used to play', 'my nan died, she loved that film', 'the bird we had for ten years died', 'my budgie died',
  'my dog brought a dead bird in and then my nan died the same day', 'my dad killed himself', 'my dog was killed by a car', 'we had to have our cat put to sleep',
  'Biscuit died at the vets today',
];

/** Browser review P2 1, verbatim: ordinary words, then "Just be with it", then Finish, then a Tell on the main screen. */
export const UI_BE_FINISH = { angle: 'I am worried about my exam tomorrow', home: 'I am so angry my boss ignored me again' };
/** Semantic blocking 2, verbatim: the words sent again (case and punctuation changed) after "Another angle". */
export const SEM_RESEND = ['I was holding her hand when she went', 'I WAS HOLDING HER HAND WHEN SHE WENT!!'];
