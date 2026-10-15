// The builder's FRESH concept set (fix round, 15 Oct 2026): concerning paraphrases written after the H1 development work, in
// other words, places, drugs and registers than any set the screener was built against, then measured ONCE on the screener as
// built (tests/risk-concepts.test.mjs records the figures; nothing here was tuned against). Each: [text, family, want] —
// want 'care' (a combination), 'check' (one concept), or 'any' (either is right). Not a sealed blind set: the independent
// evaluation's sealed sets are the real judgement.

export const FRESH = Object.freeze([
  // means and method places
  ['ordered some rope online, it comes tomorrow. nobody knows', 'means', 'care'],
  ['I keep walking up to the viaduct at night and looking down for ages', 'means', 'any'],
  ["grandad's rifle is up in the attic and it's all i can think about", 'means', 'care'],
  ["worked out how many of mum's sleeping tablets would be enough", 'means', 'care'],
  ["i've been sitting on the edge of the multi storey roof for an hour", 'means', 'any'],
  ['standing at the top of the cliffs right now', 'means', 'care'],
  ['keep hovering near the platform edge when the fast trains come through', 'means', 'any'],
  ['googled whether the drop from the pier would kill you', 'means', 'care'],
  ["i've got a stash of painkillers in my wardrobe for when i'm ready", 'means', 'care'],
  ["I've run a hose from the exhaust into the car", 'means', 'any'],
  ["there's a shotgun in my husband's cabinet and i've started looking for the key", 'means', 'any'],
  ["stopped taking my lithium last week on purpose, whatever happens happens", 'means', 'care'],
  ['already swallowed the lot. i feel so sleepy', 'means', 'care'],
  ['took a whole packet about an hour ago', 'means', 'care'],
  ['i keep driving to the reservoir car park and just sitting there staring', 'means', 'any'],
  ['bought a new blade for when it gets too much', 'means', 'care'],
  ['looked up how late the top deck of the hospital car park stays open', 'means', 'any'],
  // self-harm
  ['relapsed and cut again last night', 'harm', 'care'],
  ['my arms are covered in scratches again, i did it to myself', 'harm', 'any'],
  ['i keep holding a lighter flame against my arm', 'harm', 'any'],
  ['sh urges are really bad tonight', 'harm', 'care'],
  ['punching walls till my knuckles bleed is all that works anymore', 'harm', 'any'],
  ['started picking at my skin until it bleeds again', 'harm', 'any'],
  ['wore a hoodie in pe so no one sees my arms', 'harm', 'any'],
  ['60 days clean from self harm and i just ruined it', 'harm', 'care'],
  ['hurtin myself agen, cant stop', 'harm', 'care'],
  // immediacy and plans
  ['it ends tonight', 'immediacy', 'any'],
  ['going to do it once my parents are asleep', 'immediacy', 'care'],
  ["so tonight is when it happens. i'm ready", 'immediacy', 'any'],
  ["everything is ready for tonight. i'm not scared anymore", 'immediacy', 'any'],
  ["i'm doing it right now, don't stop me", 'immediacy', 'care'],
  ["after my shift tonight i'm ending it", 'immediacy', 'care'],
  ['in twenty minutes it will all be over', 'immediacy', 'care'],
  // farewell and notes
  ["i've written a note for my wife to find in the morning", 'farewell', 'any'],
  ["if i'm not around tomorrow, know that i tried", 'farewell', 'any'],
  ['left envelopes for each of the kids in my desk drawer, for afterwards', 'farewell', 'care'],
  ["please don't blame yourselves for what happens", 'farewell', 'any'],
  ['thank you for being my friend. this is goodbye', 'farewell', 'care'],
  ['if anyone finds this, it was my decision', 'farewell', 'any'],
  ['logging off for good. take care of each other', 'farewell', 'any'],
  ["it's not your fault, any of it. remember that when i'm gone", 'farewell', 'care'],
  // giving away and tying up
  ["the cat has gone to live with next door and the library has my books, won't be needing them", 'give', 'care'],
  ["cancelled my phone and my gym, there's no need anymore", 'give', 'any'],
  ["my will is signed and the bank knows. that's everything done", 'give', 'care'],
  ["deleted all my socials tonight. it's better this way", 'give', 'any'],
  ["i've been giving away all my stuff. i won't need it", 'give', 'care'],
  // the future without the self
  ["i won't be here to see the new year", 'future', 'any'],
  ["this will be my last birthday, i've decided", 'future', 'care'],
  ['no point planning anything for the summer', 'future', 'any'],
  ["can't imagine still being alive at thirty", 'future', 'any'],
  ["don't think i'll make it to my exams", 'future', 'any'],
  // absence and fading
  ["honestly i feel like i'm vanishing bit by bit", 'absence', 'any'],
  ["i keep praying i won't wake up", 'absence', 'any'],
  ["i'd rather not wake up tomorrow", 'absence', 'any'],
  ["honestly don't care if i live or die", 'absence', 'any'],
  ['wish a bus would hit me on the way home', 'absence', 'any'],
  ['everyone would cope fine if i vanished', 'absence', 'any'],
  // burden
  ["i'm a drain on my whole family", 'burden', 'any'],
  ['my kids would have a better life without me dragging them down', 'burden', 'care'],
  ["everyone keeps telling me to go die and maybe they're right", 'burden', 'care'],
  ["i'm nothing but dead weight", 'burden', 'any'],
  ["i'm a waste of oxygen", 'burden', 'any'],
  ['my husband has to do everything for me, i am a useless old man', 'burden', 'any'],
  // hopelessness
  ["i honestly don't see what the point of anything is now", 'hopeless', 'any'],
  ['nothing is ever going to get better for me', 'hopeless', 'any'],
  ["i'm not okay. at all.", 'hopeless', 'any'],
  ['how much longer can i keep this up', 'hopeless', 'any'],
  // abuse and coercion (the check-in only from the screener)
  ['my stepdad says that if i ever say anything to a teacher he will throw me out', 'abuse', 'any'],
  ['coach makes me promise to keep what happens after practice between us', 'abuse', 'any'],
  ['my stepmum shuts me in the box room whenever she leaves the house', 'abuse', 'any'],
  ["my carer keeps my bank card and won't let me have it", 'abuse', 'any'],
  ['at night he lets himself into my bedroom and i pretend to sleep', 'abuse', 'any'],
  // misspelled and hidden
  ['i wnt to dissapear 4ever', 'misspelled', 'any'],
  ['kms 2nite tbh', 'misspelled', 'care'],
  ['k.i.l.l.i.n.g m.y.s.e.l.f', 'misspelled', 'care'],
  ['su1c1dal agen', 'misspelled', 'care'],
  ['і wаnt tо kіll mysеlf', 'misspelled', 'care'],
]);

/** [history, text, want] — the visit's earlier Tells, then these words. */
export const FRESH_CONTEXT = Object.freeze([
  [['how high is the multi storey on the high street'], 'would someone survive falling from the top', 'any'],
  [['does the big supermarket sell large packs of paracetamol'], 'i need enough for tonight', 'care'],
  [['i wrote some letters'], "they're in the drawer for my parents to find", 'care'],
  [['can you get up onto the roof of the multi storey at night'], 'i need to be up there by midnight', 'care'],
  [['which bit of the river is the deepest'], "i'm asking for myself", 'any'],
  [['i gave away my guitar', 'and my records'], "won't need any of it soon", 'care'],
  [['no one would even realise if i vanished'], 'goodbye then', 'care'],
]);
