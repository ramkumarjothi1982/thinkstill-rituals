// Final round 3, unit ESCALATION (the independent check of d1b0333, /tmp/claude-0/hf/check-final.json, blocking item 1).
//
// The lesson of five rounds: growing phrase lists never converges, every reviewer writes new wordings. So grief.js reads two
// STRUCTURAL rules (suicideDeath, selfEnding), and this unit tested them with phrasings it wrote itself BEFORE reading the
// check's list (OWN_*), then with the check's list (CHECK_MISSES, verbatim).

/** The check's blocking item 1, verbatim: the twelve wordings that missed care (9 on both screens, 3 on the main screen only). */
export const CHECK_MISSES = [
  'grandad shot himself and I keep holding his old rifle',
  "my wife died last month and I've been writing goodbye letters",
  "after my friend hanged himself i've been looking up how to tie a noose",
  "my brother killed himself, maybe it's my turn soon",
  "mum's gone and there's no reason for me to stay alive anymore",
  'my best friend took her life last week and i keep wondering if i should too',
  "since dad hanged himself i've thought about doing it in the same garage",
  "my friend shot himself, i've got access to the same gun",
  "my brother od'd and honestly i might take the rest of his stuff",
  "since my brother shot himself I keep thinking I'll be the next one",
  'dad jumped in front of a train and honestly I want to go the way he did',
  "my dad took his own life and I've been planning mine",
];
/** The check's negatives that were care: one, now care by design (a suicide named is care, whatever the clause). */
export const CHECK_BY_DESIGN = ["my friend killed himself and I'm going to a support group tonight"];

// ---------------------------------------------------------------- written before reading the check --
/** (rule 1) A suicide named about someone else: care on both screens, gently, 0 requests, whatever else is said. */
export const OWN_SUICIDE = [
  'my brother killed himself last spring',
  'my dad took his own life when I was twelve',
  'my best mate hung himself in his garage',
  'she hanged herself in march',
  'my uncle shot himself',
  'my cousin jumped off a bridge last year',
  'a girl from my school jumped in front of a train',
  'my aunt died by suicide',
  'my friend committed suicide and nobody talks about it',
  'mum ended her life in 2019',
  'my boyfriend ODed last month',
  "my sister od'd on her meds",
  'my stepdad overdosed',
  'my flatmate took the pills and we found him in the morning',
  "it's been a year since my son's suicide",
  'My Dad Took His Own Life',
  "my dad killed himself and I'm going to a support group tonight",
  'my mate threw himself under a train',
  'he hung himself',
  'my brother jumped from the multi-storey car park',
];
/** (rule 2) Any other death named, then a first-person clause about the self ending: care, 0 requests. */
export const OWN_FOLLOW = [
  "my mum died and I don't want to be alive anymore",
  "since dad passed I keep thinking it's my turn",
  "my husband died, I'm planning mine",
  "nan's gone and I've written my goodbye letters",
  'my dog died and I just want to sleep forever',
  "my wife passed away, there's no reason for me to stay",
  'my brother died in the crash and I want to die too',
  "grandad died last month and I don't think I'll be here much longer",
  "my son died. I'm next.",
  'my mum died and I keep looking at the rope in the garage',
  "my dad passed and I've been thinking about the train tracks",
  "since my girlfriend died I can't keep going",
  "my daughter passed, I won't be around much longer",
  "my husband died in may and I don't want to wake up tomorrow",
  "lost my mum last year, I'm going to end it",
  'my twin died and it should be me next',
  'my mum died of cancer and im done living',
  "my partner died and there's no point in me living",
  "my fiance died in the crash and I've got my dad's gun",
  "grandma passed away and I'm ready to go too",
  "my mum died and I've decided I'm not staying",
  "my sister died and I'd be better off dead",
  "my dad's dead and I want to be dead too",
  'since my mum died I feel like I shouldnt be alive',
  'my son died and i have the pills ready',
];
/** …and what must never be care: a death, then a first-person clause about living, a plan, a keepsake, a place, a turn. */
export const OWN_NEG = [
  'planning the funeral for my dad',
  "my nan died so I'm going to live with my aunt",
  'visiting her grave on sunday, my mum died two years ago',
  "my grandad died, I'll never forget him",
  'my dad died and I want to keep his garden going',
  "I'm next in line to speak at the service for my uncle who died",
  'I keep his gun licence papers for the police since he died',
  "my mum died, I'll follow her recipe for the christmas cake",
  'my dad died and I want to live up to him',
  "my grandma died and I'm staying with my cousins this week",
  "my dog died and it's my turn to choose the next puppy",
  "my granny died, I'm going to plant a rose for her",
  'my uncle died and I want to be a doctor like him',
  "my mum passed and I've got to carry on with her charity",
  'my mum died and I want to keep going for my kids',
  "my grandad died and I'm going to sleep at my mum's tonight",
  'I wrote a goodbye letter to my dad to put in his coffin',
  "my aunt died and I'm staying strong for my mum",
  "my dad died and I can't stay in his house anymore",
  "since my brother died I can't go on holiday without thinking of him",
  'my cat died and I am going to bury her under the apple tree',
  "my nan died, I'll carry on her baking tradition",
  'my uncle died and I want to keep his memory alive',
  'my dad died, we took the train to the funeral',
  'my best friend died and I want to make him proud',
];
/** Ordinary words with a suicide-ish verb that names no suicide: suicideDeath stays false. */
export const OWN_SUICIDE_NEG = [
  'I nearly killed myself laughing at that video',
  'the striker shot himself in the foot with that interview',
  'quitting now would be career suicide',
  'we watched suicide squad last night',
  'coach made us run suicides at training',
  'my phone killed itself again',
  'my little brother jumped off the sofa and hurt his ankle',
  'my dad took the pills the doctor gave him and feels better',
  'the dog jumped in front of the camera',
  'he hung his coat on the door',
];

// ---------------------------------------------------------------- written after reading the check (more pressure on rule 2) --
/** Grief said with a first-person clause about living, a keepsake, a place, a turn, a fear of illness: never care. */
export const MORE_NEG = [
  "my dad died and I can't stop crying", "my nan died and I can't sleep", "my grandad died and I just want to be alone",
  "my dog died and I don't want to get another one", "my mum died and I can't face going to school",
  "my brother died and I don't want to live in this town anymore", "my grandma died and I'm not going on the trip",
  "my dad died, I'm done with school", "my mum died, I'm tired of people asking if I'm ok", "my dog died, it was my turn to walk him that day",
  "my nan died and I don't want to wake up early for the funeral", "my dad died and I won't be here for christmas, I'm going to my aunt's",
  "my grandad died and I want to sleep for a week", "my dad died and I keep looking at his old guitar", "my wife died and I'm planning a memorial",
  "my mum died and I'm planning my life without her", "my nan died and I just want to go home", "my dad died and I'm next of kin",
  "my grandad died and now I'm the next oldest", "my mum died and it's my turn now to look after dad", "my dad died and I'm going to live for him",
  "my mum died and I don't want to forget her voice", "my brother died and I never want to go back to that hospital", "my dog died and I keep his lead by my bed",
  "my nan died and I'm keeping her rings", "my dad died and I have his watch", "my grandma died and I took the bus to her house",
  "my uncle died and I walked over the bridge where we used to fish", "my mum died and I stood at her grave for an hour", "my dad died and I need to stay strong",
  "my mum died last year and I'm finally starting to live again", "my best friend died and I won't stop fighting for his charity",
  "my dad died and I don't want to die like he did, so I've stopped smoking", "my sister died and I'm scared of hospitals now",
  "my grandad died and I just want to keep busy", "my mum died and I can't stay at home, it's too quiet", "my dad died and I'm going to take his ashes to the sea",
  "my nan died and I'll be the one to give the eulogy", "my dad died and I feel like I'm the next generation now",
];
/** …and the self ending said other ways: care. */
export const MORE_POS = [
  "my mum died and I don't know how to go on", "my wife died, I don't want to do this anymore", "my dad died and I can't be bothered living",
  "my gran died, I'm ready to die too", "my partner died and I'm thinking of ending it", "my mum died, i might not be around much longer",
  "my son died and I'm tired of being alive", "my dog died and life isn't worth living", "since my wife passed I've been saying my goodbyes to everyone",
  "my brother died and I've started giving away my things", "my husband died and I keep staring at the pills in the cupboard", "my dad died and I went to the bridge last night",
  "my girlfriend died and I wish I could sleep and never wake up", "my mum died and I'd rather be dead", "my best mate died, I'm going to join him",
  "my nan died and honestly I don't see the point anymore", "my baby died and I can't keep living like this", "my dad died and everyone would be better off without me",
  "my wife passed and I've worked out how I'd do it", "my mum died and I've written a suicide note",
];
