// Final round 4 (the independent check of integ/final-r3 931fbb0, score 6: /tmp/claude-0/hf/check-r3.json).
//
// The check found no misses on sets written before reading the code; its misses are SHAPES found by reading the rules. So
// grief.js reads more clause shapes (selfEnding), not more phrases, and this unit wrote its own phrasings of each shape (OWN_*)
// before running them. The CHECK_* sets are the check's, verbatim.

// ------------------------------------------------------------------ blocking item 1: the self ending --
/** The check's 35 misses, verbatim: a recognised death and a self-ending or following clause (care, 0 requests, both screens). */
export const CHECK_ESC = {
  // (1) a first-person conditional absence; (2) happier / better dead
  absent: [
    "since mum died i've been thinking it would be easier if i wasn't here",
    'my dad died and it would be easier if i wasn\'t here',
    "my dad died and maybe it's better if i'm not around",
    "my dad died and i'm thinking everyone's better off if i'm gone",
    "my nan died and it'd be easier if i was gone",
    'my nan died and it would be better if i was dead',
    "my dad died and i'd be happier dead",
  ],
  // (3) asking to die or be taken; (7) wishing I'd died instead
  asking: [
    'my dad died, please let me die',
    'my dad died, let me go to him',
    'my dad died and i want god to take me',
    'my dad died and i pray god takes me too',
    "my dad died and i hope i don't make it to christmas",
    "my mum died and i wish i'd died instead",
  ],
  // (4) a first-person wish, intent or rumination and an act that ends a life
  act: [
    'since my husband died i keep thinking about driving into a wall',
    'my brother died and i want to drive off a cliff',
    'my wife died and i want to drive into the river',
    'my brother died and i want to crash my car',
    'my brother died and i keep thinking about crashing my car',
    'my dad died and i want to walk into the sea',
    'my son died and i want to stop my heart',
    'since my son died i want to jump',
    "my son died and i'm going to jump",
  ],
  // (5) going where they went, "go there" after heaven; (6) lying with them in the grave or the ground
  where: [
    'my husband passed and i want to go where he went',
    'my son is gone and i want to go where he went',
    'my brother left us last year and i want to go where he went',
    'my mum died and i want to go wherever she went',
    'my dad died and i want to be where he went',
    "my brother died and i'm going where he went",
    'my dad is in heaven and i want to go there',
    'my mum died and i want to be in the ground with her',
    'my dad died and i want to lie in the grave with him',
  ],
  // (8) a typo in the clause, the death recognised
  typo: [
    'my mum dide and i want to be wiht her',
    'grandma died and i cnt go on',
    'my dad diedd and i want to dei',
    'my husbnd died and i dont wana live',
  ],
};
export const CHECK_ESC_ALL = Object.values(CHECK_ESC).flat();

/**
 * This unit's own 30, one wording per phrasing, in the same eight shapes (written before they were run). Each names a death the
 * app recognises and says the self ending in a way none of the 35 does.
 */
export const OWN_ESC = [
  // (1) conditional absence
  "my grandad passed away and honestly the family would be better off if i wasn't around",
  'since my sister died i think things would be simpler if i was gone',
  "my wife died last spring and it'd be kinder to everyone if i weren't alive",
  'mum died in june, life would be easier for everyone if i just disappeared',
  // (2) better / happier / at peace dead
  "my son died and i'd honestly be better dead",
  "since my partner died i reckon i'd be more at peace dead",
  "my twin died and i feel like i'd be happier dead too",
  // (3) asking to die or be taken
  'my husband died, god please take me now',
  'my baby died and i keep begging god to let me die',
  "dad passed away last month, i hope i don't wake up tomorrow",
  "my nan died and i'm praying i don't make it through the winter",
  // (4) an act that ends a life
  'since my mum died i keep thinking about stepping in front of a bus',
  'my fiance died and i want to drive my car off the bridge',
  "my daughter died and i'm thinking of walking into the river",
  "my best friend died in march and i've thought about jumping off the multi storey",
  'my boyfriend died and i want to drown myself',
  'grandma died and sometimes i want to crash the car on the motorway',
  // (5) where they went, up there
  "my brother died last year and i just want to go wherever he's gone",
  'my mum is in heaven now and i want to be up there too',
  'my dad passed and i need to go where he went',
  // (6) the grave, the ground
  'my wife died and i want to rest in the ground beside her',
  'my little girl died and i want to lie in her grave with her',
  'since my husband died all i want is to be in the grave with him',
  // (7) dying instead, too, first
  'my son died and i wish i had died first',
  "my mum died, i wish i'd died too",
  'my brother died in the crash and i wish it was me who died instead',
  // (8) typos in the wish and the verb
  'my dad dyed last week and i wnat to die',
  'my mum died and i cant liev without her',
  'my wife pased away and i wanna diee',
  'my brother died and i dont want to be hear anymore',
];

/** The check's polish item: false care from grief.js on three grief statements (never care: grief). */
export const CHECK_FALSE_CARE = [
  'my mum died and i keep her pills in a drawer',
  'my dog died and i want to see him again',
  "my wife died and i don't know how to live without her",
];
/**
 * The bare "I want to see him again" in the earlier rounds' positive sets (r9 SEM_FOLLOW_POS2 and UI_FOLLOW, r10 R3_FOLLOW_POS): longing,
 * grief since final round 4 (the check's polish), never care. "…again soon", "…in heaven" stay care.
 */
export const SEE_AGAIN_LONGING = ['my brother died and i want to see him again', 'I miss my dad so much since he died, I want to see him again', 'my mum died and i want to see her again'];
/** The check's two false care from the lexicon (crisis): the lexicon is another unit's, so these stay as they are. */
export const CHECK_LEXICON_CARE = [
  "my dad died and i don't want to be here for the anniversary",
  'my mum died and i wrote her a goodbye letter',
];

/**
 * The check's three, then this unit's 60 grief negatives (written before they were run): a death named and a first-person clause
 * that is grief, never a wish to end. The false-care rate is read on the 60 (OWN_GRIEF_60, target ≤ 3/60).
 */
export const OWN_GRIEF = [
  ...CHECK_FALSE_CARE,
  'my dad died and i miss him every single day',
  "my mum passed away and i can't stop crying",
  'my nan died last week and i keep replaying the phone call',
  "my husband died and i still set a place for him at dinner",
  'my grandad died and i want to plant a tree for him',
  'my brother died and i keep his hoodie on my bed',
  'my sister died and i feel so alone',
  "my wife passed and i'm lost without her",
  'my son died and i talk to his photo every night',
  'my best friend died and i want to make her proud',
  "my dad died and i'm scared i'll forget his voice",
  "my mum died and i wish i'd said goodbye properly",
  'my grandma died and i wish i had been there at the end',
  'my dog died and i want to go to the beach where we walked him',
  'my cat died and i keep looking for her in the garden',
  'my uncle died and i have to clear out his flat',
  "my dad died and i'm angry at god",
  'my mum died and i went to her grave today',
  'my husband died and i want to visit where he is buried',
  'my nan died and i want to scatter her ashes in the sea',
  "my partner died and i can't face going back to work",
  'my brother died and i feel guilty i was not there when he died',
  'my friend died and i keep thinking it was my fault',
  'my dad died and i want to hear his voice again',
  "my mum died and i'd give anything to hug her one more time",
  'my wife died and i want to tell her i am sorry',
  'my baby died and i want to hold her one more time',
  'my grandad died and i feel like part of me died with him',
  'my sister died and i dream about her every night',
  "my son died and i'm planning his memorial",
  'my dad died and i am writing his eulogy',
  'my mum died and i sleep in her old t-shirt',
  'my husband died and i keep his razor in the bathroom',
  'my dog died and i still have his lead by the door',
  "my nan died and i'm keeping her ashes on the mantelpiece",
  'my brother died and i hope he is at peace now',
  "my dad died and i'll see him again one day in my dreams",
  'my mum died and i want to remember the good times',
  'my grandma died and i have not eaten properly in days',
  'my wife died and i feel numb',
  "my best mate died and i can't believe he's gone",
  'my dad died and i want to be strong for my little brother',
  "my mum died and i'm going to wear her ring every day",
  'my uncle died and i need to sort out his things',
  'my son died and i want to know why',
  "my husband died and i don't know who i am without him",
  'my dad died and i keep waking up at 3am',
  "my mum died and i can't sleep",
  'my nan died and i want to cook her recipes',
  'my cat died and i want to get her a little headstone',
  'my brother died and i want to finish the model plane we started',
  'my dad died and i am so tired all the time',
  'my grandad died and i want to go to the funeral but i am scared',
  'my mum died and i want her back',
  "my wife died and i'll never love anyone like that again",
  'my friend died and i keep reading our old messages',
  'my dad died and i lit a candle for him',
  'my sister died and i feel like nobody understands',
  'my nan died and i keep her cardigan on the back of my chair',
  'my dad died and i want to go to his favourite pub to remember him',
];
/** The 60 of OWN_GRIEF this unit wrote (the check's three are counted on their own). */
export const OWN_GRIEF_60 = OWN_GRIEF.slice(CHECK_FALSE_CARE.length);

// ------------------------------------------------------------------ blocking item 2: a suicide named --
/** The check's three, verbatim: care, 0 requests, both screens. */
export const CHECK_SUICIDE = ['my brother died by his own hand', 'my dad died by his own hand last year', 'my brother killed him self'];
/** This unit's own of the same two shapes. */
export const OWN_SUICIDE = ['my mum went by her own hand', 'they died by their own hands', 'my cousin hung them self', 'my uncle shot him self in the garage', 'she ended her life by her own hand'];
/** …and never these. */
export const OWN_SUICIDE_NEG = ['my dad built the shed by his own hand', 'she made the dress by her own hands', 'he did it all by his own hand', 'my brother hurt him self playing rugby'];

// ------------------------------------------------------------------ blocking item 3: first-person idioms --
/** The check's 14, verbatim: everyday sayings with the speaker as the one who "dies": the ordinary question, never gentle. */
export const CHECK_IDIOMS = [
  "i'm dead lol",
  "i'm literally dead, that was hilarious",
  "honestly i'm dead, that video was so funny",
  "i'm dead, i can't believe she said that",
  "i'm dying lol",
  "i'm dying here, it's so hot",
  "i'm dying in this heat",
  'i died when he said that',
  'i nearly died when i saw the bill',
  'i died inside when he called my name',
  "i'm so dead when my mum finds out",
  "i'm dead meat if i'm late again",
  'i killed myself laughing',
  "i'll die if he sees me like this",
];
/** This unit's own 15 (written before they were run). */
export const OWN_IDIOMS = [
  "i'm dead, this meme is too good",
  'lol i literally died at that tiktok',
  "i'm dying, my sister just fell off the sofa haha",
  "i'm so dead if i miss the bus again",
  'i died a bit inside when the teacher read my essay out',
  'i almost died when she walked in wearing my dress',
  "i'm dying over here, this heat is unreal",
  "i'll die if my crush sees this photo",
  'my mum will find out and i am dead meat',
  "i was dead after that joke, couldn't breathe",
  'i nearly killed myself laughing at the panto',
  "i'm dying 😂 my dog just sneezed on the cat",
  "we're so dead when dad sees the scratch on the car",
  "you're dead meat when mum finds out",
  'i could have died when he remembered my birthday',
];
/** What stays as it was: a real disclosure or a wish (the lexicon's crisis or care, or the gentle path; an escalation set). */
export const SELF_REAL_ESC = ['I nearly killed myself last year', 'I tried to kill myself', 'I feel like dying', 'I want to die'];

// ------------------------------------------------------------------ item 4: the structural safety net --
/** The check's borderline wishes, verbatim (the death recognised, the clause needs inference): never sent, no "Somewhere calm". */
export const CHECK_BORDERLINE = [
  "my husband passed and i'm ready to go",
  'my dad died, i want out',
  'dad died and im gonna do it tonight',
  'my dad died, theres nothing left for me',
  "my girlfriend died and i don't see a future for me",
  'my partner died and life has no meaning for me now',
  "my husband died and i've been sitting in the car with the engine running",
  'my dad died and i wish i could just disappear',
];
/** The check's implied suicide, verbatim. */
export const CHECK_SEA = ['my brother walked into the sea and never came back'];
/** Ordinary deaths: the gentle path, and Another Angle with sharing on still asks the server (nothing in the net). */
export const ORDINARY_DEATHS = ['my dad died last week', 'my nan passed away in her sleep', 'our dog died this morning and the house feels so quiet'];
