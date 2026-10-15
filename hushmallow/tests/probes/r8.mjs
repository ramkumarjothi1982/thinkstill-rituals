// Another Angle, review round 8: the probe table for the flipped default (guess framing only with an interpretive
// marker), the bag-of-words backstop, feelings, the escalation to care and the app's own framings. Every probe the
// two round-1 reviews (semantic and UI) named is here, with the route it must take. Reviewers: add a line to the
// right list and run
//   node --test hushmallow/tests/beyond-r8.test.mjs
// Nothing else needs changing.
//
// Routes (tests/beyond-r8.test.mjs routeOf mirrors another-angle.js afterTell → startAngle):
//   'crisis' | 'care'  the app's own safety check (the lexicon), first, always
//   'follow'           death talk that wants to follow the one who died: the care path (grief.js deathEscalation)
//   'gentle'           death talk or someone alive but going: no mechanic, the gentle lines (grief.js deathTalk)
//   'feeling'          a feeling of their own: the feeling's kind scenes, never framed as a guess or a worst case
//   'anger'            something someone did to them (fair anger): find_boundary first, never framed as a guess
//   'kind'             a stated event, or any bag word: the acknowledging mechanics, never framed as a guess
//   'guess'            an interpretive marker of their own: the framing may play, and only `guess` is the guess

/** Semantic review, blocking 1: death phrased with words deathTalk did not read (each reached pull_apart). */
export const DEATH_MISSES = [
  'my friend was hit by a train and didnt survive', 'my daughter was hit by a car and didnt make it', 'my dad got crushed at work and didnt make it',
  'my uncle took his life', 'my friend ended her life', 'my mums heart stopped', 'my baby stopped breathing', 'my dad was found unresponsive',
  'my friend jumped off a bridge', 'my cat was run over', 'my dog got run over and the vet couldnt save him', 'my baby was born still', 'my brother never woke up',
  'its been a year since dad went', 'my mother left this world', 'the vet said its time to say goodbye to my cat', 'my granny is very ill and the doctors say it wont be long',
  'we are saying goodbye to grandma tomorrow, they are turning off the machines', 'it was my dads wake last night',
  // typos
  'grandma passd', 'my dad passsed away', 'my dad deid', 'my dad dyed', 'my mom diead',
  // euphemisms
  'We had to say goodbye to our dog yesterday', 'my nan slipped away last night', 'my husband was taken from us too soon', 'my baby girl was born sleeping',
  'my grandad left us last night', 'my dad is at peace now',
  // polish: harm words deathTalk missed (they reached the gentle path only through the old harm route)
  'my mom lost her battle with cancer', 'my brother lost his life in afghanistan',
];
/** Semantic review, blocking 2: deaths the old idiom blanks erased ("passed on the weekend", "the guy in the car died"). */
export const IDIOM_DEATHS = [
  'my mum passed on the weekend', 'my dad passed on my birthday', 'my nan passed on the same day as my exam', 'my grandad passed by the time i got there',
  'my brother passed out and never woke up', 'the guy in the car died', 'the woman in the car died', 'the other driver in the car died',
  'the driver of the car died and my friend was the passenger',
];
/** …and the idioms that still cannot hide a death: never death talk (the device right before "died", a message passed on). */
export const STILL_IDIOMS = [
  'my phone died', 'My phone died and I missed the last train home.', 'my laptop is dead', 'the battery died on the way home', 'My baby monitor died in the night.',
  'My mum passed on the message.', 'My friend passed on my CV to her manager.', 'I passed my driving test!', 'I lost my keys again.', 'I’m dead tired.',
];

/** Semantic review, blocking 3: feelings about an upcoming thing (each was framed as the worst case or fact-vs-guess). */
export const FEELINGS = [
  'I feel sick about the exam.', 'I feel sick about Monday.', 'I feel sick about my results.', 'I feel sick about the meeting', 'I feel sick with dread about tomorrow.',
  'I feel anxious about tomorrow.', 'I feel scared about tomorrow.', 'I feel nervous about tomorrow.', 'I feel dread about tomorrow.', 'I’m so anxious about tomorrow',
  'I’m worried about tomorrow', 'I’m dreading tomorrow', 'I keep feeling scared about next week', 'I keep feeling sick with dread about work.', 'I feel sick thinking about tomorrow.',
  'I’m terrified of the operation', 'I feel anxious all the time about work', 'I feel overwhelmed by everything at work', 'I’m stressed about my deadline', 'I’m nervous about the interview',
  // r7's two, and the coordinator's rule 3 (a feeling or a body's feeling, with or without about/over/with/because…)
  'I feel sick about tomorrow.', 'I keep feeling sick with dread.', 'I feel sick', 'I’m feeling anxious about my results', 'I’ve been feeling panicky over the move', 'Feeling nervous about Friday.',
  'I feel anxious about tomorrow’s interview.', 'I feel empty', 'I feel so alone',
];
/** …a feeling with a thought beside it: the feeling stays real, only the marked clause may be the guess. */
export const FEELING_WITH_GUESS = [
  ['I’m worried I’ll fail the exam', 'I’ll fail the exam'], ['I feel scared that I’ll mess it up', 'I’ll mess it up'],
  ['I feel sick about tomorrow because everyone will laugh at me', 'everyone will laugh at me'], ['I feel like everyone hates me', 'I feel like everyone hates me'],
];

/** Semantic review, blocking 4: wrongs done to the person (each was framed as a guess, or as "what happened" / "an open question"). */
export const ANGER = [
  'My colleague talked about me behind my back', 'My ex cheated on me', 'Someone stole my bike', 'My flatmate stole my money', 'My boss blamed me for his mistake',
  'My friend told everyone my secret', 'My dad broke his promise again', 'My coach dropped me from the team without explaining', 'My landlord refuses to fix the heating',
  'My teacher called me stupid in front of the class', 'My sister read my diary', 'My brother called me fat', 'My mum read my messages', 'They laughed at me when I tripped',
  'My coworker made fun of my accent', 'My mate never paid me back',
  // r7's own
  'My boss embarrassed me in front of everyone', 'My colleague took credit for my work in the meeting.', 'My friend lied to me again.', 'He talked over me in the meeting.',
];
/** …a wrong with an interpretive clause beside it: only that clause is the guess. */
export const ANGER_WITH_GUESS = [
  ['My boss embarrassed me in front of everyone and now everyone thinks I’m useless.', 'everyone thinks I’m useless'],
];

/** Stated events with no marker: kind mechanics, never "one way to read it" (the flipped default). */
export const EVENTS = [
  'My sister ignored me at the party.', 'She has read my message and still not replied.', 'Nobody came to my party.', 'I didn’t get the job.', 'My friend didn’t reply to my message.',
  'My partner hasn’t replied for hours.', 'My colleague got promoted instead of me.', 'My friend invited everyone except me.', 'I failed my driving test.', 'It always rains on my birthday',
  'My dad always said I would amount to nothing', 'I’ve never been good at maths', 'My boss and my colleague had a meeting without me.', 'Everything is fine, I just feel tired',
];
/** Words with an interpretive marker: the framing may play, and only `guess` is the guess. */
export const GUESSES = [
  ['My sister ignored me at the party, she must hate me.', 'she must hate me'], ['Nobody likes me.', 'Nobody likes me'],
  ['Everyone at work thinks I am useless because I missed one deadline.', 'Everyone at work thinks I am useless'], ['What if I fail my exam?', 'What if I fail my exam'],
  ['He never listens to me.', 'He never listens to me'], ['I failed my driving test. I’m so stupid.', 'I’m so stupid'], ['I should have known better.', 'I should have known better'],
  ['My friend didn’t reply to my message and I think she’s angry with me.', 'she’s angry with me'], ['She has read my message and still not replied, she must be upset with me.', 'she must be upset with me'],
  ['If the presentation goes badly I’m going to get fired.', 'If the presentation goes badly I’m going to get fired'],
];

/** Polish: illness and emergency words outside the r7 list (each reached pull_apart): bag words now, never framed. */
export const ILLNESS = [
  'my dad was in a coma', 'my mum is having chemo', 'the doctors found a tumour', 'my sister is in intensive care', 'my son was rushed to a and e', 'my cat is missing and I think she got hit',
];
/**
 * Polish: expected false alarms (the gentle lines are true for them); and a crash that is only a game. (Final round 3: "the
 * plant on my desk died" is a thing that died, no false alarm any more: THING_DIED, the kind path in Another Angle, the one
 * question first on both screens; "My son died in Fortnite" names someone of their own, so it stays gentle.)
 */
export const FALSE_ALARMS = ['My son died in Fortnite and smashed his controller.'];
export const THING_DIED = ['the plant on my desk died'];
/**
 * (r2-angle item 4, owner decision 'Ask before every world') a game's death that names no one of their own is ordinary words
 * now (death-words.js): asked the one question first, never the gentle path, never framed (it is still a bag word).
 */
export const STORY_FALSE_ALARMS = ['My character died in the game and I raged'];
export const GAME_CRASH = ['my game crashed and I lost all my progress'];

/** Semantic review, blocking 6: wanting to be with or follow the one who died (each reached the gentle path). */
export const FOLLOW = [
  'my dad died and I wish I was with him', 'my dad died and i want to be next to him', 'my mum died and I want to lie beside her', 'mum died. i want to go to sleep and be with her',
  'My dad died and I’d rather be with him than here', 'my daughter died and part of me wants to go with her', 'since dad died all i want is to be with him',
  'My nan died and I want to be with her', 'my nan died and i want to see her again soon', 'my husband died and I can’t be here without him', 'my wife died and I don’t want to be here anymore',
  'My brother died and I just want to join him', 'my son died and I want to follow him',
];
/** Semantic review, blocking 7: not a wish to follow (someone alive at a bedside, someone else's loss): never the care path. */
export const NOT_FOLLOW = [
  'my nan is dying and I want to be with her', 'my dad is in hospice and I want to be with him', 'my mum is on life support and I need to be with her',
  'My friend’s mum died and I want to be with her', 'My husband’s dad died and I want to be with him', 'my sister’s baby died and I want to be with her',
  'my best friend’s dad passed away and I want to be with her tonight', 'my uncle died and my aunt is alone so I want to be with her', 'my cousin lost her baby and I want to be with her',
  'my brother died and I want to be with my brothers kids', 'my grandad passed and I want to go where he grew up',
  'My grandad died. I want to be with my family at the funeral.', 'My mum died and I want to be there for my dad.', 'My dad died and I wish I was with him when he died.',
];

/** The safety lexicon still comes first (unchanged): crisis and care probes, typed or sent. */
export const LEXICON = [['I want to kill myself', 'crisis'], ['Nobody would miss me if I was gone', 'crisis'], ['My partner hits me', 'care'], ['my mum overdosed', 'crisis']];

/** The app's own guess framings (lines.js, authored.js, the authored library, the mechanics) and the server's: framesAsGuess pins each. */
export const SERVER_FRAMINGS = [
  // the server mock's placeholders (server/another-angle/src/providers/mock.js)
  'The wait for a reply is the part that actually happened.', 'What it means is still a question, not an answer.', 'Right now the exam is one moment, not the whole ending.',
  'What would you do first if the worst part really happened?', 'The promotion probably sits somewhere between perfect and ruined.', 'You know the message, not what anyone was thinking about it.',
  'What are three different things it could mean?', 'The message is one event, even if it feels like a pattern.', 'Can you name one time it went differently?',
  'The exam tells you about one moment, not your whole worth.', 'Write down what you know for sure, and leave the rest as a question.', 'Note one recent time things went differently.',
  'If it matters, ask one calm, open question instead of guessing.', 'You might be filling in the gaps with the worst version.', 'There may be more than one way to read this, including yours.',
];
/** Lines the gentle path and the kind scenes say: never a framing. */
export const NOT_FRAMINGS = [
  'That sounds like a lot to carry.', 'There’s nothing to fix here. We can just be with it.', 'Thank you for telling me.', 'What you’re feeling is real, and it counts.',
  'One small, kind thing for yourself is plenty for now.', 'What happened is real, and it makes sense that it’s on your mind.', 'What happened to you is real, and it counts.',
  'What someone else did is theirs to carry, not yours.', 'Being angry about this makes sense.', 'A year is not a deadline for missing your dad.', 'Something this hard deserves gentleness.',
];
/** A server grief answer's lines: said only when both acknowledge (the stubs the review used never do). */
export const GRIEF_LINES_OK = [['That sounds so hard.', 'You loved him, and that love is still here.'], ['Missing her can feel endless.', 'You don’t have to carry it all at once.']];
export const GRIEF_LINES_NOT = [
  ['That’s a guess about what’s going on inside someone else.', 'Guesses can be right, and they can be wrong.'],
  ['This is one moment, even if it feels like a pattern.', 'Can you think of one time it went differently?'],
  ['Grief is real.', 'What would he want for you now?'], ['It hurts.', 'At least he isn’t suffering any more.'],
];
