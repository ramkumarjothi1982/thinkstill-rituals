// Another Angle, review round 7: the probe table for death talk, the escalation to care, the fact-vs-guess
// backstop and the review's polish cases. Reviewers: add a line to the right list and run
//   node --test hushmallow/tests/beyond-r7.test.mjs
// Every list is read by that file; nothing else needs changing.

/** The last review's misses (each got pull_apart's fact-vs-guess game): every one is death talk now. */
export const REVIEW_MISSES = [
  'my dads dead and i miss him', 'my mums dead', 'We lost Dad in March.', 'My cat got hit by a car and died.', 'My husband was murdered.',
];
/** The last review's false alarms (each heard "Missing them…"): death talk still, but the gentle lines are true for them. */
export const REVIEW_FALSE_ALARMS = [
  'My son died in Fortnite and smashed his controller.', 'I lost my sister in the supermarket for ten minutes and panicked.',
];

/**
 * (r2-angle item 4, owner decision 'Ask before every world', 14 Oct 2026) A game's or a film's death that names no one of their
 * own: no longer death talk (death-words.js), so it is asked the one question first, never the gentle path. (Before, r7 kept
 * them as death talk on purpose, when nothing else stood between the words and a game.)
 */
export const STORY_DEATHS = ['He died in the game and I cried anyway.', 'She died in the film and I can’t stop thinking about it.', 'He died in the game.', 'She died in the film.'];

/** Death or loss words about anyone or anything alive: deathTalk is never null. */
export const DEATH_TALK = [
  ...REVIEW_MISSES, ...REVIEW_FALSE_ALARMS,
  // died, dead, death, dying, with and without the apostrophe
  'My dad died.', 'my dad died last year', 'MY DOG DIED', 'My dad’s dead.', 'My dad\'s dead.', 'my dads dead', 'mums dead', 'My mum is dead.', 'She is dead now.', 'Hes dead.', 'he’s dead',
  'My nan died in her sleep.', 'Grandad died on Tuesday.', 'my grandads dead and nobody cares', 'Our cat is dead.', 'The baby died.', 'My best friend died in a car accident.',
  'My brother died of an overdose.', 'My dad is dying.', 'My mum is dying of cancer.', 'Watching my grandma die was the worst thing.', 'I’m scared my mum will die.', 'What if my dad dies?',
  'I dreamt my mum died.', 'My dad nearly died.', 'The death of my father changed everything.', 'Since my dad’s death I can’t sleep.', 'It’s the anniversary of her death.', 'My mum is deceased.',
  'my dog dide yesterday', 'my nan is dieing', 'My goldfish died.',
  // passed away, passed on, passed (after a person or he / she / they)
  'My grandma passed away.', 'My grandma passed awy.', 'My nan past away last week.', 'My uncle passed on in May.', 'My dad passed last year.', 'Mum passed in March.', 'Since Mum passed I can’t sleep.',
  'My husband’s passed.', 'She passed in her sleep.', 'He passed peacefully.', 'My dog has passed.', 'My son passed and I’m so proud of the man he was.', 'Since his passing nothing feels right.',
  // killed, murdered, suicide, took his own life
  'My brother was killed in a crash.', 'My uncle was killed.', 'My cousin was murdered.', 'My dad took his own life.', 'My friend killed himself.', 'My sister died by suicide.', 'My dog drowned.',
  // lost a person or a pet (with or without my / our), him, her, them
  'We lost Dad in March.', 'We lost Mum last year.', 'I lost my mum.', 'I lost my dad when I was 12.', 'I lost him in the spring.', 'We lost her too soon.', 'I lost them both in the crash.',
  'I lost my best friend to cancer.', 'I lost our baby.', 'We lost the baby.', 'I’m losing my mum to dementia.', 'Losing my dad was the hardest thing.', 'I lost my dog yesterday.', 'We lost Sam in May.',
  'I’m so sorry for your loss.', 'Since the loss of my brother I don’t enjoy anything.',
  // gone, no longer with us
  'She’s gone.', 'Shes gone and I miss her.', 'He’s gone now.', 'My nan is gone now.', 'Mum’s gone.', 'They’re gone forever.', 'He’s gone to heaven.', 'My nan is no longer with us.', 'Grandad is in heaven now.',
  'My dog crossed the rainbow bridge.',
  // a pet put down or put to sleep
  'We had to have our cat put down.', 'We had to put our dog down.', 'My cat was put to sleep.', 'The vet put him down, my poor dog.', 'Our rabbit had to be put down.',
  // a baby lost before or at birth
  'I had a miscarriage.', 'I miscarried last week.', 'Our baby was stillborn.', 'I lost the baby at 20 weeks.',
  // dying soon
  'My dad is terminal.', 'My mum has terminal cancer.', 'My grandad is in a hospice.', 'My dad is on life support.', 'The doctors say she won’t make it.', 'He didn’t make it.', 'The baby didn’t make it.',
  'She has weeks to live.', 'My nan is on end of life care.',
  // grieving, a funeral, a grave, condolences, RIP
  'It was my grandad’s funeral today.', 'I’ve been grieving for months.', 'I’m griefstricken.', 'The greif is too much.', 'I visited my mum’s grave.', 'We scattered his ashes.',
  'We buried our dog in the garden.', 'He was cremated on Friday.', 'Thank you for the condolences.', 'I’m still in mourning.', 'I’ve been bereaved twice this year.', 'RIP Grandad.', 'R.I.P. my sweet boy.',
  'Rest in peace Nana.', 'rip nan', 'I’m going to the wake after the funeral.', 'I’m a widow now.',
];
/**
 * Grieving, a funeral, a grave without a death named: 'grief'. (Final round 3: "I cried at the cemetery." names no one, so its
 * cemetery is a weak word about someone unknown: 'grief' in deathTalk's wide reading, the escalation reader's, and the one
 * question on both screens, never the gentle path: r3-words.mjs ASKED_NO_ONE.)
 */
export const GRIEF_ONLY = [
  'It was the funeral today.', 'I’ve been grieving for months.', 'I visited the grave.', 'I’m still in mourning.', 'Thank you for the condolences.', 'I cried at the cemetery.',
];
/** The short list of unambiguous idioms, and words that are not death talk at all: deathTalk is null. */
export const NOT_DEATH_TALK = [
  // (review r11, the coordinator's main-screen decision: a plant that died is an ordinary idiom, like a gadget; still a
  // bag word in Another Angle, so never framed)
  'My plants died while I was away.',
  // a gadget
  'My phone died.', 'My phone’s dead.', 'my phones dead', 'My battery died on the way home.', 'My laptop is dying.', 'My car died on the motorway.', 'My charger died.', 'My controller died mid game.',
  'My headphones died.', 'My console died again.', 'The battery is dead.', 'I have a dead battery.', 'My baby monitor died in the night.',
  // dead as "very", a dead end
  'I’m dead tired.', 'It was dead easy.', 'My mum is dead set on it.', 'It’s a dead end job.', 'I have a deadline tomorrow.', 'The bus was dead on time.', 'I’m dead serious.', 'My brother is dead keen on football.',
  'My ex is dead to me.', 'Over my dead body.', 'I love death metal.',
  // dying to, killing it, kill time
  'I’m dying to see you.', 'I’m dying for a coffee.', 'I nearly died laughing.', 'I died of embarrassment.', 'She was killing it at karaoke.', 'He killed it in the exam.', 'I’m just killing time.',
  'My mum will kill me.', 'My feet are killing me.',
  // it's your funeral, a grave mistake, grief as hassle
  'If you don’t revise it’s your funeral.', 'I made a grave mistake at work.', 'My boss gives me grief about everything.', 'Good grief, what a week.', 'We need to bury the hatchet.',
  'I buried my face in my hands.', 'I’m buried in work.',
  // lost a thing, a game or one's way
  'I lost my keys again.', 'I lost my phone.', 'I lost my job today.', 'I lost my temper with my son.', 'I’m losing my mind.', 'I lost my way.', 'I lost my voice.', 'We lost the game.', 'We lost the match 2-1.',
  'I lost the bet.', 'I lost my dad’s ring.', 'I lost my mum’s necklace.', 'I lost my dog’s lead.', 'I got lost on the way.', 'I feel so lost.',
  // passed an exam, passed out, passed by
  'I passed my driving test!', 'My son passed his exams.', 'She passed her test.', 'My mum passed her driving test at 50!', 'I passed out at the party.', 'My sister passed me in the corridor.',
  'My daughter passed! She got into uni.', 'He passed the ball.', 'My mum passed on the message.',
  // gone to work, gone home, rip it up, RIP my phone
  'He’s gone to work.', 'She’s gone home.', 'My dad’s gone to the shops.', 'They’ve gone out.', 'My milk has gone off.', 'I ripped up the letter.', 'RIP my phone, it fell in the bath.', 'RIP my social life.',
  'I dyed my hair.',
  // ordinary words with no death in them
  'My sister ignored me at the party, she must hate me.', 'I feel empty.', 'My boss embarrassed me in front of everyone.', 'I have three essays due on Monday.', 'Nobody likes me.',
];

/** Death talk that also wants to be with, join or follow the one who died: the CARE support path. */
export const ESCALATE = [
  'My nan died and I want to be with her', 'My nan died and I want to be with her.', 'My dad died. I just want to join him.', 'My husband died and I don’t want to be here without him.',
  'Mum passed away, what’s the point without her', 'My brother was killed. I wish I’d gone with him.', 'My mum died and I want to go where she is.', 'My dad’s dead and I want to be with him again.',
  'my dads dead and i just wanna be with him', 'Since my wife died I can’t live without her.', 'My son died and I want to follow him.', 'Grandad passed last year, I want to be where he is.',
  'My girlfriend died. I can’t go on without her.', 'My dog died and I want to be with him.', 'We lost Dad in March. I want to be with him now.', 'My twin died and it should have been me.',
  'My mum died, I wish it was me instead.', 'My husband passed away and I’ll be with him soon.', 'She’s gone and there’s no point without her.', 'My best friend died, life is pointless without him.',
  'My baby died and I want to go to her.', 'Dad died. Why didn’t he take me with him?', 'My mum died and I can’t do this without her.', 'My wife is dead and I want to be reunited with her.',
  'My dad died and I’m ready to go and be with him.', 'My nan passed away and I just want to be with my nan.', 'Mum’s gone and I want to go too.', 'my mums dead and i wanna join her',
  'My son died, I can’t carry on without him.', 'My dad passed away and I want to be with my dad again.', 'My husband died, there’s no point in going on without him.', 'My wife died. I don’t want to exist without her.',
  'Since Grandad died I want to join him in heaven.', 'My sister died and I want to be with her forever.',
];
/** Death talk with no wish to follow (plans with the living, being there for someone): never the care path. */
export const NOT_ESCALATE = [
  'My grandad died. I want to be with my family at the funeral.', 'My grandad died and I want to be with my mum this weekend.', 'My mum died and I want to be there for my dad.',
  'My nan died and I want to be with my grandad now.', 'My dog died and I just want to be with my friends tonight.', 'Grandad passed away, I want to be with her at the funeral.',
  'My uncle died and I want to join my cousins for the wake.', 'Mum died, I want to follow her wishes for the funeral.', 'My dad died last year and I still follow his advice.',
  'My nan died and I can’t sleep without the light on.', 'My cat died. I want to go where she is buried.', 'My grandma died, I want to go to her house one more time.',
  'My friend’s mum died and I want to be with my friend.', 'My brother was killed and I want to be with my parents.', 'I lost my dad and I want to be there for my little sister.',
  'My dog died yesterday, I want to be with my family.', 'My husband died and I want to be with my kids.', 'My dad died and I’m going to be with my mum for a few days.',
  'Nan’s funeral is on Friday and I want to be with my cousins.', 'My mum passed, I want to go home to be with my dad.', 'My best friend died and I’m going to be there for his mum.',
  'Since my grandad died I want to be with my nan more.', 'My grandad died and I want to visit his grave.', 'My aunt passed away and I want to join her family at the memorial.',
  'My cat was put down and I want to be with my other cat.', 'My dad died and I want to follow him on the memorial page.', 'My mum died and I can’t face the funeral without help.',
  'My grandad died. My nan is alone, I want to be with her this weekend.', 'I want to be with my mum this weekend.', 'I want to be there for my dad.',
];

/** The backstop: words with a death or harm word that never get the fact-vs-guess framing (with the review's misses). */
export const BACKSTOP = [
  ...REVIEW_MISSES,
  'My mum is in hospital and I think it’s my fault.', 'My dad has cancer and everyone thinks I’m overreacting.', 'I was in a car accident and now I’m scared to drive.', 'There was a crash on the motorway and my brother hasn’t texted back.',
  'I was assaulted on the way home.', 'He attacked me after the party.', 'My uncle abused me when I was little.', 'I was raped last year and nobody believes me.', 'My friend’s dad died and she hasn’t replied to me since.',
  'My grandad is terminal and nobody tells me anything.', 'I had a miscarriage and my partner doesn’t talk about it.', 'My dog is gone and the house is quiet.', 'My nan passed and my aunt blames me.',
  'I lost my brother last year and my parents ignore me.', 'Since the funeral nobody calls.', 'I keep thinking about the grave.', 'The grief comes in waves and I think I’m broken.', 'My dad was killed and they never caught anyone.',
  'My cat died and my flatmate thinks I’m being dramatic.', 'My best friend died and I feel like everyone has forgotten.', 'She’s gone and I keep checking my phone for her texts.', 'My mum’s been buried a week and I can’t cry.',
  'The doctor said the cancer has spread.', 'My mum’s in hospital again.', 'My brother crashed his bike and he’s in hospital.', 'My baby is in hospital and I can’t stop shaking.',
  // ordinary apart from that word: the kind-step mechanics, never a fact-vs-guess game
  'I lost my keys and my boss thinks I’m useless.', 'My phone died and now my friend thinks I’m ignoring her.', 'My mum will kill me if I’m late and she must think I’m lazy.', 'I passed my test but everyone thinks I cheated.',
  'I lost the match and now the team hates me.', 'My laptop crashed and I lost my essay.', 'I’m dead tired and nobody notices.',
];
/** Of BACKSTOP, the ones that are ordinary apart from the word ('kind'); the rest are 'gentle' (or death talk). */
export const BACKSTOP_KIND = [
  'I lost my keys and my boss thinks I’m useless.', 'My phone died and now my friend thinks I’m ignoring her.', 'My mum will kill me if I’m late and she must think I’m lazy.', 'I passed my test but everyone thinks I cheated.',
  'I lost the match and now the team hates me.', 'My laptop crashed and I lost my essay.', 'I’m dead tired and nobody notices.',
];

/** Review polish 3: feelings, never shrink_projection's "The worst case". */
export const FEELINGS_E3 = [['I keep feeling sick with dread.', 'anxious'], ['I feel sick about tomorrow.', 'anxious'], ['I feel sick with dread.', 'anxious'], ['I’m feeling sick about tomorrow.', 'anxious']];
/** Review polish 2: fair anger at something someone did. The event is the fact, never the mind's addition. */
export const FAIR_ANGER = [
  'My boss embarrassed me in front of everyone', 'My boss embarrassed me in front of everyone.', 'My colleague took credit for my work in the meeting.', 'My friend lied to me again.',
  'My sister shouted at me in front of my kids.', 'He talked over me in the meeting.', 'My manager belittled me in front of the team.', 'My flatmate went behind my back.',
];
/** …and with a clearly interpretive clause beside the wrong: only that clause may be the guess. */
export const FAIR_ANGER_WITH_GUESS = [
  ['My boss embarrassed me in front of everyone and now everyone thinks I’m useless.', 'everyone thinks I’m useless'],
];
