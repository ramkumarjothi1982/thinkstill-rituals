// Final round 5 (the independent check of integ/final-r4, f684ecd, score 4: /tmp/claude-0/hf/check-r4.json), verbatim where quoted.
// Read by tests/r5.test.mjs. The detection gate (tools/beyond/detection-gate.mjs) reads every string in tests/**/*.mjs too.

/** Blocking item 1: the check's five wishes, written before it read any code, that were the gentle path and sent. */
export const CHECK_ESC_OWN5 = [
  'my son died and im ready to joine him',
  'nan passed and i keep praying my heart just stops',
  'ever since she passed ive been planning how to get to her',
  'i want to follow my brother, he died in march',
  'i just want to lie down on dads grave and never get up',
];
/** Blocking item 2: the check's 22 adversarial shapes (written after reading grief.js and death-words.js) that were sent. */
export const CHECK_ESC_ADV22 = [
  'my son died and i want to follow my son',
  'i want to follow my dad. he passed in april',
  'my wife died and i wanna b w her',
  'my mum died. mum i just want to be with u',
  'my husband died in may. tonight im going to meet him',
  'my dad died and i just want to go home to him',
  'my son died and i keep hoping my heart gives out',
  "since my wife died i've stopped taking my insulin",
  'my dad died and i want to d i e',
  'my brother died and im checking out soon',
  "my wife died and i'd swap places with her in a heartbeat",
  'my husband died. wait for me my love',
  'everyone i love is dead and i want to be too',
  'my girlfriend died and i want to rest beside her for good',
  'my son died and i want to cross over to him',
  'my mum passed and i keep standing too close to the platform when the trains come',
  'since my dad died ive been giving all my things away and writing letters',
  'my wife died and i want to waste away',
  'my nan died, i want to joine her',
  'my brother died and i want to folow him',
  'my dad died and i want to see him tonight',
  'my sister died, ill be seeing her very soon, ive made my mind up',
];
/** Of the 27, the ones whose clause is implicit: held (the main screen's support first, nothing sent), never sent; the rest care. */
export const CHECK_ESC_HELD = [
  'ever since she passed ive been planning how to get to her',
  'my brother died and im checking out soon',
  'my mum passed and i keep standing too close to the platform when the trains come',
];
/** The check's polish: six wishes that were held; five are care now, one ("im coming son") held. */
export const CHECK_ESC_POLISH6 = [
  'dad passed in june, keep thinking i shuold just end it and be with him',
  'grandmas gone and i wish i was gone 2',
  'my mom died. i want out of this life',
  'after my fiance died i stopped wanting to live',
  'my boy is dead, no reason for me to stay, im coming son',
  'husband gone 3 months. im ready to leave this world',
];
/** The check's polish: care at 931fbb0, only held after round 4's "wish I was gone" tail; care again. */
export const CHECK_ESC_GONE7 = [
  'grandmas gone and i wish i was gone 2', 'my mum died and i wish i was gone forever', 'my mum died and i wish i was gone already',
  'my mum died and i wish i was gone now', 'my mum died and i wish i was gone tbh', 'my mum died and i wish i was gone lol',
  'my dad died and i wish i was gone from this world',
];
/** Blocking item 3: notes that the speaker will be dead, care at 931fbb0, the play question after round 4's frames; care again. */
export const CHECK_ESC_NOTES11 = [
  "when you read this i'll be dead", 'when you read this i will be dead', "by the time you read this i'll be dead",
  "i'll be dead when you see this", "mum when you see this i'll be dead, i'm sorry", "i'll be dead before anyone finds out",
  "i'll be dead by the time my mum sees this", "i'll be dead tomorrow, i've filmed a video for my family", "i'll be dead by friday, i'm not joking",
  "i'll be dead in an hour, sorry to everyone who reads this", "tonight i die, when my mum finds out she'll understand",
];
/** The check's polish: the speaker's own dying or harm, the gentle path at 931fbb0, the question after round 4; gentle (or held) again. */
export const CHECK_SELF_DYING = [
  "i'm dying of cancer and it's so hot in this hospital", "i'm dying of cancer and so bored of this ward", "i'm dying and my kids find out tomorrow",
  'i nearly died when he did that to me',
];
/** The check's polish: unsure words (no death the app recognises) with a wish beside them: asked first, then nothing sent. */
export const CHECK_ASK_WISH = ['i wanna be with my wife agian, no point staying here'];

/**
 * Known false care, kept by the gate (931fbb0 read them as care; nothing may read lower): round 4 had made these the gentle path.
 * The safe side: care's gentle lines and the Support pill, no world.
 */
export const KNOWN_FALSE_CARE = [
  "i'll die if he sees me like this", "i'll die if my crush sees this photo", "my dad died and i'll die if he sees me like this",
  'my mum died and i keep her pills in a drawer', "my wife died and i don't know how to live without her",
  'my dog died and i want to see him again', 'my grandad died and i wish i had gone to see him more',
];
/** Known false gentle: the speaker's everyday sayings are the speaker's again (the gentle path, nothing sent; as at 931fbb0). */
export const KNOWN_FALSE_GENTLE = ["i'm dead lol", 'i died when he said that', 'i killed myself laughing', "i'm dead meat if i'm late"];

/** Neighbours of this round's shapes: never care (a lead, a dream, a vitamin, a choir, the road; someone alive). */
export const R5_NEG = [
  'my dad died and i want to follow his advice', 'my brother died and i want to follow my brother into the army like he wanted',
  'my dad died and i want to follow my dream of being a nurse', 'my mum died and i still follow my mum on instagram',
  'my dad died and i hope my heart stops hurting soon', 'my nan died and i keep hoping my heart will heal', 'my nan died and i stopped taking my vitamins',
  'my dad died and i stopped taking my phone to school', 'my wife died and i want to rest for a bit', 'my husband died and i gave his things away',
  'my dad died and my mum said wait for me at the car', 'my grandad died and i want to go home to my mum', 'my dad died and i want to go home',
  'my sister died and i will see her friends tonight', 'my mum died and i want to lie down for a bit and then get up and make tea',
  'my dog died and i want to waste no time getting a new puppy', 'my dad died and i want to swap shifts with my brother',
  'my uncle died and i want to cross over the road to see his house', 'everyone i love is dead and i want to be happy again',
  'my dad died and i gave away my old toys to charity like he would have', 'my dad died and tonight i will meet his friends',
  'my mum died and i want to join her choir', 'my nan died and i want to join a grief group',
];

/** Fifty phrasings that reach Another Angle's gentle path (a death, the net's words, the speaker's sayings): never sent. */
export const GENTLE_50 = [
  // ordinary deaths of people and pets
  'my dad died last week', 'my nan passed away in her sleep', 'our dog died this morning and the house feels so quiet', 'my grandad died on tuesday',
  'my mum passed away in march', 'my best friend died in a car crash', 'my cat died yesterday and i keep looking for her', 'my brother died two years ago today',
  'my aunt passed after a long illness', 'my wife died last spring and the garden is overgrown', 'my son died when he was six', 'my husband passed in the night',
  'my granny died and the funeral is on friday', 'my uncle died suddenly', 'my baby died at birth', 'my rabbit died and my daughter is heartbroken',
  'my teacher died over the summer', 'my horse died and i ride past his field', 'my dad passed and i keep his coat on the hook', 'my sister died and i still text her phone',
  'my friend died and nobody at school talks about it', 'my mum died and christmas feels empty', 'grandma passed and i found her recipes', 'my dog was put down last night',
  'my nan died and i miss her laugh',
  // the safety net's words beside a death (held)
  'my dad died and i give up', 'my mum died and i keep her voicemails', 'my son died and theres no point', 'my dad died and part of me wants to disappear',
  'my dad died and nothing matters, nothing left', 'my brother died and im checking out soon', 'my mum passed and i keep standing too close to the platform when the trains come',
  'ever since she passed ive been planning how to get to her', 'my wife died and i sleep on her side of the bed', 'my boy is dead, no reason for me to stay, im coming son',
  // the speaker's own sayings and dying (the speaker always counts)
  "i'm dead lol", 'i died when he said that', 'i killed myself laughing', "i'm dying here it's so hot", "i'm dying of cancer and it's so hot in this hospital",
  'i nearly died when he did that to me', "i'm dying and my kids find out tomorrow", 'i nearly died when the car skidded',
  // softer ways of saying it
  'since mum passed i cant sleep', 'we lost dad in march', 'my dads gone and i miss him', 'RIP grandad, love you', 'my mum isnt with us any more',
  'my dad died and i went to his grave today', 'my wife died and i want to scatter her ashes in the sea',
];

/** Ordinary Tells with no death: asked first, then "Another angle" sends (sharing on), as before. */
export const ORDINARY_SEND = ['my boss always ignores me', 'my sister never listens, she hates me'];
