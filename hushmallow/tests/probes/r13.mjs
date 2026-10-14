// Another Angle and detection, owner decision 'Ask before every world' (14 Oct 2026): the probe table for the two reviews of
// 'Ask when unsure' (/tmp/claude-0/hf/sem-unsure.json, semantic, score 4; /tmp/claude-0/hf/ui-unsure.json, browser, score 7).
// Every phrasing either review quoted is here verbatim, with its expected route under the new design, on both screens:
//   gentle    a detected loss (backstop.js lossRoute 'gentle'; the main screen's readSafety reads concern / loss): the gentle path
//             straight away, with no question
//   question  the one question first ("Shall we look at this from another angle, or just be with it?" in Another Angle, the main
//             screen's own before every world); the words carry a softer loss cue (lossRoute 'ask', readSafety `unsure`), so with
//             Another Angle's question switched off (angle-first.js ASK_BEFORE_ANGLE) the 'Ask when unsure' check-in instead
//   ordinary  the one question first too, like every Tell; no loss read at all (lossRoute null), so with the question switched
//             off it plays straight away, as before
//   care      care or crisis (the safety lexicon, or grief.js deathEscalation): support first, nothing sent, no question, no game
// A pair is [main screen, Another Angle] where the two differ. Reviewers: add a line to the right list and run
//   node --test hushmallow/tests/askall-angle.test.mjs
// Nothing else needs changing.

// ------------------------------------------------- the semantic review (sem-unsure.json), blocking 1 --
/**
 * The 16 common death phrasings that reached neither path. The unambiguous ones are detected now (askall-angle item 5:
 * "<ref>s time came", "topped / offed himself"); every other one falls to the one question, which is fine now.
 */
export const SEM_B1_COMMON = [
  ["my dad's time came last week and I still can't believe it", 'gentle'],
  ["it's been a year since he went and it doesn't get easier", 'ordinary'],
  ["my old girl had to be put down this morning", 'ordinary'],
  ["said bye to Pepper at the vets today", 'ordinary'],
  ["we lost our Kev to the drink in march", 'ordinary'],
  ["my mate's brother topped himself", 'gentle'],
  ["my cousin offed himself last year", 'gentle'],
  ["we had to let Bella go, the vet said she was in too much pain", 'ordinary'],
  ["the baby's heart wasn't beating at the scan", 'ordinary'],
  ["she came too early and only stayed with us for an hour", 'ordinary'],
  ["we had to end it at 21 weeks because of his heart", 'ordinary'],
  ["the pregnancy didn't continue", 'ordinary'],
  ["it was the drink that finished him off", 'ordinary'],
  ["one year today since the accident that took her", 'ordinary'],
  ["I keep thinking about the last conversation I had with my grandad before the stroke. I was rushing and I said I'd call him at the weekend and I never did, and now I'll never get the chance. Everyone says it's not my fault.", 'ordinary'],
  ["my best friend from school was in a crash on the motorway on friday, they said it was instant. I saw her the day before and we argued about something stupid and I never said sorry", 'ordinary'],
];
/** The 25 exotic ones (the usual spelling "my uncle's brown bread" detected: item 6). */
export const SEM_B1_EXOTIC = [
  ["my gran slipped off in her sleep on sunday", 'ordinary'],
  ["the vet came to the house for Milo this morning", 'ordinary'],
  ["my budgie is pining for the fjords", 'ordinary'],
  ["my uncle returned to Allah this morning", 'ordinary'],
  ["baba is with Allah now", 'ordinary'],
  ["my dad got his heavenly reward", 'ordinary'],
  ["we're sitting with my bubbe's body tonight", 'ordinary'],
  ["my cousin got merked last night", 'ordinary'],
  ["my bredrin got shanked and didn't make it", 'ordinary'],
  ["my grandad kicked it last night", 'ordinary'],
  ["bro got smoked last night outside the chicken shop", 'ordinary'],
  ["my uncle's brown bread, mate", 'gentle'],
  ["our cat got hit on the road last night", 'ordinary'],
  ["my goldfish was floating when I got home", 'ordinary'],
  ["I had a d&c on monday", 'ordinary'],
  ["my waters broke at 19 weeks and he was too little", 'ordinary'],
  ["my hcg levels dropped and the doctor said it's not progressing", 'ordinary'],
  ["I passed the pregnancy at home", 'ordinary'],
  ["my partner had a missed mc", 'ordinary'],
  ["the sac was empty at our 8 week scan", 'ordinary'],
  ["I was 10 weeks and it just came away in the toilet", 'ordinary'],
  ["we found out at the 12 week scan there was nothing there", 'ordinary'],
  ["we've lost another one, that's three now", 'ordinary'],
  ["covid had him in a week", 'ordinary'],
  ["my granmda is gone", 'ordinary'],
];

// ------------------------------------------------- blocking 2: the regressions (askall-angle item 3) --
/** Ordinary words the round-5 families sent to the gentle path; never again (each family is pinned in pairs: FAMILY_PAIRS). */
export const SEM_B2_REGRESSIONS = [
  ["my dad never came to my football match", 'ordinary'],
  ["my mum never came to my graduation", 'ordinary'],
  ["my best friend never came to my party", 'ordinary'],
  ["my boyfriend never came to see me in the play", 'ordinary'],
  ["my mate never came round like he promised", 'ordinary'],
  ["my friend never came round to mine after school", 'ordinary'],
  ["the school nurse let him go after an hour", 'ordinary'],
  ["my sister isnt with us now, shes at uni", 'question'],
  ["my mate pegged it when the police turned up", 'ordinary'],
  ["my knee never really recovered after I fell skiing", 'ordinary'],
  ["my ankle never recovered from the operation", 'ordinary'],
  ["my confidence never recovered after the accident", 'ordinary'],
  ["our team never recovered after the injury to our striker", 'ordinary'],
  ["the baby is over at my mum's", 'ordinary'],
  ["the baby has lost a bit of weight and the health visitor is worried", 'question'],
  ["the baby was over the moon with her present", 'ordinary'],
  ["they terminated his contract on medical grounds", 'ordinary'],
  ["my dad was terminated from his job for medical reasons", 'question'],
  ["my cat had to be shot with a tranquiliser dart by the vet", 'ordinary'],
  ["my horse had to be shot for flu", 'ordinary'],
  ["the drugs beat my brother in the end, he relapsed again", 'question'],
  ["my dad was gone by the time I got up for school", 'question'],
  ["my grandad went home to god knows where", 'question'],
  ["my dad never came to my game, he must not care about me", 'ordinary'],
];

// ------------------------------------------------- blocking 3: "Yes", then the same words again --
/** After "Just be with it" (or the check-in's "Yes, it is") these words, sent again, go to the gentle path, never a mechanic. */
export const SEM_B3_RESEND = [
  ["we had to let our dog go, I think it was my fault", 'question'],
];

// ------------------------------------------------- blocking 4 and 5: ordinary Tells and worries --
/** The 19 ordinary person and pet Tells that were asked "Is this about losing someone?": now the one question, like any Tell. */
export const SEM_B4_ORDINARY = [
  ["my boyfriend hasn't texted me all day, he must be with someone else", 'question'],
  ["my flatmate left without saying bye, I think I upset her", 'question'],
  ["my friend took my seat at lunch, she obviously wants me gone from the group", 'question'],
  ["my dog got out and we found him two streets away", 'question'],
  ["my sister went to university and the house is so quiet without her", 'question'],
  ["my boyfriend left me for my best friend", 'question'],
  ["our dog went missing yesterday", 'question'],
  ["my boss let him go on friday and now I am doing two jobs", 'question'],
  ["my mum's in the hospital having my baby brother", 'question'],
  ["my nan's away in spain so I'm feeding her cat", 'question'],
  ["I found my cat asleep in the washing basket", 'question'],
  ["my dog was sleeping peacefully on my bed", 'question'],
  ["my hamster escaped and we found him behind the fridge", 'question'],
  ["my granddad was a soldier in the war", 'question'],
  ["we took the dog to the vet for his jabs", 'question'],
  ["my cat went to the vet today and she's fine", 'question'],
  ["my boyfriend's going to the army and I won't see him for months", 'question'],
  ["my friend moved on and has a new best friend", 'question'],
  ["we went to see my nan in the care home and she was in good spirits", 'question'],
];
/** Worries that lost their angle without the check-in (one is the lexicon's crisis, pre-existing; the lexicons stay as they are). */
export const SEM_B5_WORRIES = [
  ["my boss took ages to reply, I bet I'm getting fired", 'ordinary'],
  ["my boss didn't say hi this morning, I'm sure I'm getting sacked", 'ordinary'],
  ["my friend didn't invite me to her birthday, she probably forgot I exist", 'ordinary'],
  ["my friends went to the park without me, I bet they were talking about me", 'ordinary'],
  ["my brother went to the doctors and hasn't told me anything, it must be bad news", 'ordinary'],
  ["my girlfriend went away for the weekend and didn't text, she must be losing interest", 'ordinary'],
  ["my mum said I'm the reason she's stressed, she must think I'm a burden", 'care'],
];

// ------------------------------------------------- the semantic review's polish and proofs --
/**
 * Polish: the possessive "brown bread" (item 6), "I've never felt so stupid" (item 6: angerUnsaid; the route is the question),
 * the safety gap (item 4: care), and two lexicon cares the review noted (pre-existing, the lexicon's, unchanged here).
 */
export const SEM_POLISH = [
  ["my uncle's brown bread", 'gentle'],
  ["my boss shouted at me in front of everyone and I've never felt so stupid", 'ordinary'],
  ["my best friend killed himself and I keep thinking about doing the same", 'care'],
  ["my brother beat me at fifa again", 'care'],
  ["my ex is spreading lies about me", 'care'],
];
/** The proofs' phrasings (fragments as quoted): no longer false alarms, never gentle. */
export const SEM_PROVEN = [
  ["buried in revision", 'ordinary'],
  ["passed to everyone", 'ordinary'],
  ["the fire got my dads car", 'ordinary'],
  ["went to lunch without me", 'ordinary'],
  ["found my old diary", 'ordinary'],
  ["never pays me back", 'ordinary'],
];
/** A grief-family feeling chosen with ordinary words: gentle, no question (the review's proof). */
export const SEM_GRIEF_CHIP = { text: 'my boss always ignores me', gentle: ['grief', 'mourning', 'bereft', 'heartache', 'heartbreak', 'anticipatory-grief'], not: ['sadness', 'sorrow', 'saudade'] };

// ------------------------------------------------- the browser review (ui-unsure.json) --
/**
 * Blocking: 10 death-context misses. memorial, coroner, "nothing more they could do" and "late <relation>" (possessive too)
 * are detected now (item 5); the rest fall to the one question, which is fine now.
 */
export const UI_B1 = [
  ["my sister's memorial is tomorrow", 'gentle'],
  ["the coroner called about my brother", 'gentle'],
  ["the vet said there was nothing more they could do", 'gentle'],
  ["I'm clearing out my late father's flat", 'gentle'],
  ["I miss my late husband", 'gentle'],
  ["my daughter would have been ten today", 'ordinary'],
  ["I held her hand until the end", 'ordinary'],
  ["my mum's anniversary is coming up and I keep crying", 'ordinary'],
  ["nobody mentions my brother anymore since the accident", 'ordinary'],
  ["I can't stop looking at the last photo of my dog", 'ordinary'],
  ["I still set a plate for him at dinner", 'ordinary'],
];
/** Polish: 11 tricky everyday sentences that were asked the check-in: now the one question, like any Tell. */
export const UI_EVERYDAY = [
  ["my sister went to Spain for the summer", 'question'],
  ["my best friend won't see me this weekend", 'question'],
  ["my dad was asleep when I got home", 'question'],
  ["the last time I saw my cousin we argued", 'question'],
  ["my brother left for university", 'question'],
  ["my grandad is in hospital for his knee", 'question'],
  ["my cat went missing for a day", 'question'],
  ["my dad never got to see my play because of work", 'question'],
  ["my boss let him go today", 'question'],
  ["my dad went to the vet with our dog", 'question'],
  ["my nan is in hospital", 'question'],
];
/** Polish: a false gentle path (item 3: "at peace" beside a living place). */
export const UI_AT_PEACE = [
  ["my grandma is at peace in her new care home", 'ordinary'],
];
/**
 * Out of scope (the owner's lexicon pass; the lexicons stay as they are): the lexicon reads these. A lexicon change may move
 * them to care, never to the gentle path.
 */
export const UI_LEXICON = [
  ["he touched me inappropriately", 'ordinary'],
  ["he touched me and I felt scared", 'ordinary'],
  ["my brother beat me at chess", 'care'],
];
/** The browser review's proofs (its Tells, verbatim). */
export const UI_PROVEN = [
  ["we had to let our dog go", 'question'],
  ["I am worried about my exam tomorrow", 'ordinary'],
  ["I keep thinking about the weekend", 'ordinary'],
  ["my mum died last week", 'gentle'],
  ["I can't cope with any of this", ['care', 'ordinary']],
  ["I'm so angry my boss ignored me again", 'ordinary'],
  ["my sister is furious with me", 'ordinary'],
  ["I was so excited to be a mum", 'ordinary'],
  ["since I moved to Spain", 'ordinary'],
  ["moved by the film", 'ordinary'],
  ["my boss always ignores me", 'ordinary'],
];

// ------------------------------------------------- the fixes, pinned in pairs (this unit's own probes) --
/**
 * (askall-angle item 3) Each over-firing family as [still a loss (gentle), now ordinary words (never gentle)]: the first stays
 * on the gentle path, the second never reaches it.
 */
export const FAMILY_PAIRS = Object.freeze({
  cameTo: [['my grandad never came to after the surgery', 'my dad never came to my football match'], ['my dad was in a coma and never came to', 'my boyfriend never came to see me in the play']],
  cameRound: [['my dad had a stroke and never came round', 'my mate never came round like he promised'], ['my nan never came round after the operation', 'my friend never came round to mine after school'], ['he never came round from the anaesthetic', 'my friend never came round after school']],
  neverRecovered: [['my auntie had a stroke and never recovered', 'my knee never really recovered after I fell skiing'], ['my nan never recovered from the fall', 'our team never recovered after the injury to our striker'], ['my grandad broke his hip and never recovered', 'my dads knee never recovered after the op']],
  baby: [['the pregnancy was over', 'the baby is over at my mum\'s'], ['the baby was gone', 'the baby was over the moon with her present'], ['the baby had lost its heartbeat', 'the baby has lost a bit of weight and the health visitor is worried']],
  terminate: [['we had to end the pregnancy for medical reasons', 'they terminated his contract on medical grounds'], ['we had to terminate at 20 weeks for medical reasons', 'my dad was terminated from his job for medical reasons'], ['we had to terminate for medical reasons', 'they terminated my contract after 6 weeks for medical reasons']],
  shot: [['my horse had to be shot', 'my horse had to be shot for flu'], ['the vet said our dog had to be shot', 'my cat had to be shot with a tranquiliser dart by the vet']],
  withUs: [['my mum isnt with us now', 'my sister isnt with us now, shes at uni'], ['my mum isnt with us now, shes in heaven', 'my brother isnt with us now, hes on holiday'], ['grandad isnt with us any longer', 'my dad isnt with us this weekend, hes staying with my uncle']],
  atPeace: [['my grandma is at peace', 'my grandma is at peace in her new care home'], ['my nan is at peace now', 'my grandad is at peace at home now']],
  letGo: [['we had to let him go at the vets', 'the school nurse let him go after an hour']],
  peggedIt: [['my old man pegged it last week', 'my mate pegged it when the police turned up']],
  killerBeat: [['the tumour beat my dad in the end', 'the drugs beat my brother in the end, he relapsed again']],
  goneBy: [['he had gone by the time we got there', 'my dad was gone by the time I got up for school']],
  homeToGod: [['my grandad went home to the lord', 'my grandad went home to god knows where']],
});
/** (askall-angle item 4) Doing what the one who died did, or joining them: care (escalation), never the gentle path. */
export const ESCALATION_POS = [
  'my best friend killed himself and I keep thinking about doing the same', 'my brother killed himself and I could do it too', 'my mum died and I want to do what she did',
  'my dad took his own life and I think about doing the same', 'my sister overdosed and I am thinking of doing the same as her', 'my brother died and I might join him',
  'my mate hanged himself last year and I keep thinking about doing that too', 'my cousin killed herself and part of me is tempted to do the same', 'since my dad died I keep thinking about joining him',
];
/** …and what never is: a death with plans or a wish that are about living (or no death at all). */
export const ESCALATION_NEG = [
  'my dad died and I want to do the same course he did', 'my mum passed and I want to do the same job she did', 'my nan died peacefully and I want to do the same when I am old',
  'my sister passed her driving test and I want to do the same', 'my dad died and my mum wants me to join her at church', 'my grandad died and my nan is lonely so I will join her',
  'my uncle died and I want to do the same charity walk he did', 'my friend did a bungee jump and I keep thinking about doing the same',
];
/** (askall-angle item 5) The reviews' unambiguous misses, detected now: the gentle path, no question. */
export const RECALL_GENTLE = [
  "my sister's memorial is tomorrow", 'the coroner called about my brother', 'the vet said there was nothing more they could do', "I'm clearing out my late father's flat",
  "my late father's watch", 'the doctors said there was nothing more they could do', 'there was nothing more the vet could do', 'our cat was put down', 'the dog got put down yesterday',
  'my rabbit had to be put down this morning', "my mate's brother topped himself", 'my cousin offed himself last year', "my dad's time came last week and I still can't believe it",
  'his time had come', 'her memorial is on friday', 'we went to a memorial for my uncle', 'the coroners report came back for my dad',
];
/** …and their ordinary neighbours: never the gentle path. */
export const RECALL_NOT = [
  'we visited the war memorial on a school trip', 'my brother plays football at memorial park', 'the garage said there was nothing more they could do for my car', 'my late shift ran over again',
  'the baby was put down for a nap', 'her time came to speak at the assembly', 'my dog was put down on the sofa for a cuddle', 'my mum is always late',
];
