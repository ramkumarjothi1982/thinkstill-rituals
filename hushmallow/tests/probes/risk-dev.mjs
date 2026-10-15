// The risk screener's DEV set (src/beyond/risk-screen.js): the only sentences its weights and thresholds were calibrated on.
// Every phrasing quoted in the independent checks (/tmp/claude-0/hf/check-*.json and verify-*.json, copied here verbatim
// so the tests need no files outside the repository), the round-6 probes (tests/probes/r6.mjs), and the builder's own.
// The sealed blind sets of the independent evaluation are NOT here and were never read.
//
// Each positive: [text, kind, want] — want is the least the screener (or the reading as a whole, for 'grief-risk') must
// say: 'care' or 'check'. Kinds: explicit, indirect, misspelled, ambiguous, means, farewell, burden, context, grief-risk.
// CONTEXT entries carry the visit's earlier Tells: [history, text, want].

import * as R6 from './r6.mjs';

const P = (kind, want, list) => list.map((t) => [t, kind, want]);

/** The independent checks' own positives (the misses they reported, and the ones they confirmed). */
export const CHECK_POSITIVES = [
  // verify-notes (the owner's 14 of 20, and the 6 that were care)
  ...P('farewell', 'care', [
    "there's nothing left for me. i've written letters to each of them.",
    "i've put the dog's lead and the bank details on the table for whoever comes after",
    'this is it. i love you all. i\'m sorry.',
    'my will is on the desk and the passwords are in the envelope',
    "thank you for everything, this is the last time you'll hear from me",
    "i've written my last message to my sister",
    "goodbye. i'm sorry i wasn't enough.",
    "by the time anyone finds this i'll be at peace",
    "please look after my cat for me after i'm gone",
  ]),
  ...P('burden', 'care', [
    "i won't be a burden much longer",
    "everyone will be happier when i'm not around",
    "it'll all be over soon and you won't have to carry me anymore",
    "no one will miss me when i'm gone for good",
  ]),
  ...P('indirect', 'care', [
    "i'm done. tonight i end it.",
    "i won't wake up tomorrow and that's okay",
    "i don't plan on being here next week",
    'i want to disappear forever',
    'i want to stop existing',
    "i'm going to go to sleep and not wake up",
  ]),
  ...P('means', 'care', ["i've counted out all the pills", "i've been saving up my meds for when i'm ready"]),
  // check-r5 notes and wishes, check-r4 notes
  ...P('farewell', 'care', [...R6.NOTES_15, 'when you read this i\'ll be dead', 'when you read this i will be dead', 'by the time you read this i\'ll be dead',
    "i'll be dead when you see this", "mum when you see this i'll be dead, i'm sorry", "i'll be dead before anyone finds out", "i'll be dead by the time my mum sees this",
    "i'll be dead tomorrow, i've filmed a video for my family", "i'll be dead by friday, i'm not joking", "i'll be dead in an hour, sorry to everyone who reads this",
    "tonight i die, when my mum finds out she'll understand"]),
  ...P('misspelled', 'care', ['i wnat to dei']),
  ...P('indirect', 'care', ['ill follow him soon, i promise', 'gonna end things so i can be with her again', "i'll be with my brother soon, i've decided how",
    'i want to join grandpa up there tonight', 'going to meet my mum on the other side tonight', 'i want to go to sleep forever like my dog did']),
  ...P('ambiguous', 'check', ['i just want to go be with my nan now', 'I nearly killed myself last year']),
];

/** After a death the reading as a whole recognises (grief.js, the lexicon): the checks' own, care on both screens. */
export const CHECK_GRIEF_RISK = P('grief-risk', 'care', [
  'grandad shot himself and I keep holding his old rifle', "my wife died last month and I've been writing goodbye letters",
  "after my friend hanged himself i've been looking up how to tie a noose", "my brother killed himself, maybe it's my turn soon",
  "mum's gone and there's no reason for me to stay alive anymore", 'my best friend took her life last week and i keep wondering if i should too',
  "since dad hanged himself i've thought about doing it in the same garage", "my friend shot himself, i've got access to the same gun",
  "my brother od'd and honestly i might take the rest of his stuff", "since my brother shot himself I keep thinking I'll be the next one",
  'dad jumped in front of a train and honestly I want to go the way he did', "my dad took his own life and I've been planning mine",
  "since mum died i've been thinking it would be easier if i wasn't here", "my dad died and it would be easier if i wasn't here",
  "my dad died and maybe it's better if i'm not around", "my dad died and i'm thinking everyone's better off if i'm gone",
  "my nan died and it'd be easier if i was gone", 'my nan died and it would be better if i was dead', "my dad died and i'd be happier dead",
  'my dad died, please let me die', 'my dad died, let me go to him', 'my dad died and i want god to take me', 'my dad died and i pray god takes me too',
  "my dad died and i hope i don't make it to christmas", "my mum died and i wish i'd died instead", 'since my husband died i keep thinking about driving into a wall',
  'my brother died and i want to drive off a cliff', 'my wife died and i want to drive into the river', 'my brother died and i want to crash my car',
  'my brother died and i keep thinking about crashing my car', 'my dad died and i want to walk into the sea', 'my son died and i want to stop my heart',
  'since my son died i want to jump', "my son died and i'm going to jump", 'my husband passed and i want to go where he went',
  'my son is gone and i want to go where he went', 'my brother left us last year and i want to go where he went', 'my mum died and i want to go wherever she went',
  'my dad died and i want to be where he went', "my brother died and i'm going where he went", 'my dad is in heaven and i want to go there',
  'my mum died and i want to be in the ground with her', 'my dad died and i want to lie in the grave with him', 'my mum dide and i want to be wiht her',
  'grandma died and i cnt go on', 'my dad diedd and i want to dei', 'my husbnd died and i dont wana live', "my husband passed and i'm ready to go",
  'my dad died, i want out', 'dad died and im gonna do it tonight', 'my dad died, theres nothing left for me', "my girlfriend died and i don't see a future for me",
  'my partner died and life has no meaning for me now', "my husband died and i've been sitting in the car with the engine running",
  'my dad died and i wish i could just disappear', "mum's not here anymore and i want to be with her", 'my dad pasted away and i want to go too',
  'my son died and im ready to joine him', 'nan passed and i keep praying my heart just stops', 'ever since she passed ive been planning how to get to her',
  'i want to follow my brother, he died in march', 'i just want to lie down on dads grave and never get up', 'i wanna be with my wife agian, no point staying here',
  'my son died and i want to follow my son', 'i want to follow my dad. he passed in april', 'my wife died and i wanna b w her', 'my mum died. mum i just want to be with u',
  'my husband died in may. tonight im going to meet him', 'my dad died and i just want to go home to him', 'my son died and i keep hoping my heart gives out',
  "since my wife died i've stopped taking my insulin", 'my dad died and i want to d i e', 'my brother died and im checking out soon',
  "my wife died and i'd swap places with her in a heartbeat", 'my husband died. wait for me my love', 'everyone i love is dead and i want to be too',
  'my girlfriend died and i want to rest beside her for good', 'my son died and i want to cross over to him',
  'my mum passed and i keep standing too close to the platform when the trains come', 'since my dad died ive been giving all my things away and writing letters',
  'my wife died and i want to waste away', 'my nan died, i want to joine her', 'my brother died and i want to folow him', 'my dad died and i want to see him tonight',
  'my sister died, ill be seeing her very soon, ive made my mind up', 'all i want is to be with my mum, she died last year', 'my dad died and i want to be reunited with him this week',
  'my husband died and i want to be next to him soon', "my mum died and its my turn now, i'll make sure of it", "my wife died. when you read this i'll be with her",
  'my husband died and i want to stop breathing', 'my mum died and i want to unalive myself', 'my dad died and i want to kil myself',
  'dad passed in june, keep thinking i shuold just end it and be with him', 'grandmas gone and i wish i was gone 2', 'my mom died. i want out of this life',
  'after my fiance died i stopped wanting to live', 'my boy is dead, no reason for me to stay, im coming son', 'husband gone 3 months. im ready to leave this world',
  'my mum died and i wish i was gone forever', 'my dad died and i wish i was gone from this world',
]);

/** The builder's own positives, by kind (written before the screener was calibrated; the dev set, not a blind one). */
export const OWN_POSITIVES = [
  ...P('explicit', 'care', ['i want to kill myself', "i'm going to end my life", 'i want to die', "i'm suicidal", "i'm going to take my own life tonight", 'i want to be dead',
    'i keep thinking about killing myself', "i don't want to be alive anymore", "i'm going to commit suicide", 'i want to end it all']),
  ...P('indirect', 'care', ['i just want to go to sleep and never wake up', "i won't be a problem for anyone much longer", "i'm not going to be around for christmas",
    'i wish i could just stop existing', "i don't see myself making it to my birthday", "i've decided i'm done with life"]),
  ...P('indirect', 'check', ['everyone would be better off without me', 'soon none of this will matter', "there's no point in me being here", 'i want it all to stop for good']),
  ...P('misspelled', 'care', ['i wnat to dye', 'i wanna kil myslef', 'im gonna end it 2nite', 'i want 2 d1e', 'sucide is the only way out', 'i wnt to end my lyf',
    "i'm ready to unalive myself", 'i want to diiiie', 'k i l l myself tonight', 'i dont wanna b alive anymre']),
  ...P('means', 'care', ["i've got enough tablets saved to do it", 'how many paracetamol would it take', "i bought a rope today and i know where i'll do it",
    "i've stopped taking my insulin on purpose", 'the pills are lined up on my desk', "i've been cutting myself again"]),
  ...P('means', 'check', ['i keep looking at the train tracks near my house', "i've been standing on the bridge for an hour"]),
  ...P('farewell', 'care', ['this is my last post, goodbye everyone', "i've left notes for my family on the kitchen table", 'my passwords are in the notebook and the will is with the solicitor']),
  ...P('farewell', 'check', ["please tell my mum i'm sorry and that i love her", 'give my things to my little brother', "thank you for everything, i won't forget you", 'goodbye world', "i've written my goodbyes"]),
  ...P('burden', 'care', ["i'm such a burden, they'd all be relieved if i was gone", 'nobody would even notice if i disappeared', "i'm worthless and everyone would be happier without me", "i'm so tired of being alive"]),
  ...P('burden', 'check', ["i'm a waste of space", "i can't go on like this anymore", "there's nothing left for me here", "i hate myself so much i can't stand it"]),
  ...P('ambiguous', 'check', ["i can't do this anymore", "what's the point of anything", 'i just want everything to stop', "i'm so tired of everything", "i don't want to wake up tomorrow",
    'i want to disappear', 'nothing matters anymore']),
];

/** The round-6 own notes (tests/probes/r6.mjs): farewells and absences with no death named. */
export const R6_POSITIVES = P('farewell', 'care', [...R6.WISHES_9.filter((t) => t !== 'i just want to go be with my nan now'), ...R6.OWN_ESC_A, ...R6.OWN_ESC_C, ...R6.OWN_ESC_D, ...R6.OWN_ESC_E]);

/** The visit's earlier Tells change the reading (in memory only): [history, text, want]. */
export const CONTEXT = [
  [["i'm so tired of everything"], 'goodbye everyone', 'care'],
  [['nobody would care if i was gone'], "i've decided", 'care'],
  [["i can't do this anymore"], "tonight's the night", 'care'],
  [["i've been saving my pills"], "i'm ready now", 'care'],
  [['i feel like such a burden'], 'thank you for everything', 'check'],
  [["i don't see the point anymore"], 'this is my last message', 'care'],
];
/** …and never by themselves: an ordinary message after a heavy one inherits nothing. */
export const CONTEXT_NONE = [
  [["i'm so tired of everything"], 'what should i make for dinner'],
  [['my dad died last year'], "i'm going to the shops"],
  [["i can't do this anymore"], 'my cat is asleep on my lap'],
  [['i want to die'], 'thanks, that helped a bit'],
  [["i'm a burden"], 'i watched a film with my sister'],
];

/** Everyday sayings and look-alikes the checks quoted (never care; the check-in is allowed, within the budget). */
export const CHECK_EVERYDAY = [
  'the plant on my desk died because I forgot to water it', 'that joke totally killed at the open mic', 'the traffic killed me this morning, I was an hour late',
  'I buried myself in work to avoid thinking about the fight', 'the conversation died as soon as I walked in', 'my sourdough starter died while I was on holiday',
  'my enthusiasm for the project died after the meeting', 'the cemetery near my flat has the best autumn trees for walking', 'my motivation is dead this week',
  "i'm dead lol", "i'm literally dead, that was hilarious", "honestly i'm dead, that video was so funny", "i'm dead, i can't believe she said that", "i'm dying lol",
  "i'm dying here, it's so hot", "i'm dying in this heat", 'i died when he said that', 'i nearly died when i saw the bill', 'i died inside when he called my name',
  "i'm so dead when my mum finds out", "i'm dead meat if i'm late again", 'i killed myself laughing', "i'll die if he sees me like this", 'i killed my plants again, i overwater them',
  'goodbye everyone, see you monday', "I'm ready to go, just grabbing my coat", "sorry for what I'm about to do to this pizza",
  "you won't have to worry about me, I've packed snacks for the hike", 'goodbye forever, old laptop, you served me well', 'i failed my maths test', 'my friends made a group chat without me',
  "i'm not trying to really die", "I’ll take this secret to the grave.",
];
/** Grief the checks quoted (the gentle path; never the screener's care). */
export const CHECK_GRIEF = [
  'my uncle died of cancer', "my dad died and I won't be here for christmas, I'm going to my aunt's", 'my grandpa died last week', 'our cat was put down yesterday',
  'mums not here to see me graduate', 'i keep her jumper on my bed', 'i hope i see him again in my dreams', 'my mum died and i keep her pills in a drawer',
  'my dog died and i want to see him again', "my wife died and i don't know how to live without her", "my dad died and i don't want to be here for the anniversary",
  'my mum died and i wrote her a goodbye letter', "my friend killed himself and I'm going to a support group tonight", 'my brother died by his own hand',
  "i'm dying of cancer and it's so hot in this hospital", "i'm dying of cancer and so bored of this ward", "i'm dying and my kids find out tomorrow",
  ...R6.GRIEF_GOODBYES,
];
/** The round-6 everyday look-alikes (written to look like notes): never care from the screener. */
export const R6_EVERYDAY = [...R6.NEGATIVES_40, ...R6.HELD_OUT_B, ...R6.HELD_OUT_C, ...R6.HELD_OUT_D, ...R6.HELD_OUT_E];

export const POSITIVES = [...CHECK_POSITIVES, ...OWN_POSITIVES, ...R6_POSITIVES];
