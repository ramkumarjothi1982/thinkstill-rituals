// hushmallow emotion taxonomy: families, emotions and fast search.
// Plain ES module, no dependencies. Works in browsers and Node.

/** Expression preset ids the Mallow face rig understands. `face` weights may only use these. */
export const FACE_PRESETS = [
  'neutral', 'happy', 'excited', 'playful', 'loved', 'proud', 'hopeful', 'calm', 'relieved',
  'curious', 'surprised', 'awe', 'confused', 'anxious', 'scared', 'sad', 'lonely', 'guilty',
  'embarrassed', 'jealous', 'disgusted', 'angry', 'frustrated', 'exhausted', 'bored',
  'determined', 'comforted', 'disappointed',
];

export const FAMILIES = [
  { id: 'joy', name: 'Joy & happiness', blurb: 'Lightness, warmth and the sense that things are going right.', valence: 0.8, arousal: 0.6, hue: '#FFC94D', mallows: ['boppo', 'pipzi'] },
  { id: 'love', name: 'Love & affection', blurb: 'Warmth, closeness and care for someone or something.', valence: 0.8, arousal: 0.45, hue: '#FF8FB1', mallows: ['blubi', 'boppo'] },
  { id: 'calm', name: 'Calm & peace', blurb: 'Settled, safe and unhurried, inside and out.', valence: 0.6, arousal: 0.15, hue: '#8FD3C7', mallows: ['loomi', 'noomi'] },
  { id: 'curiosity', name: 'Interest & curiosity', blurb: 'Leaning in, wanting to know, explore or begin.', valence: 0.5, arousal: 0.55, hue: '#7FB8FF', mallows: ['zuzu', 'pipzi'] },
  { id: 'surprise', name: 'Surprise & awe', blurb: 'The jolt or wonder of something unexpected or vast.', valence: 0.2, arousal: 0.75, hue: '#B79CFF', mallows: ['pipzi', 'zuzu', 'glitzi'] },
  { id: 'fear', name: 'Fear & anxiety', blurb: 'Your system bracing for something that might go wrong.', valence: -0.7, arousal: 0.75, hue: '#9AA7C7', mallows: ['zuzu', 'blubi'] },
  { id: 'anger', name: 'Anger & frustration', blurb: 'Heat and push when something feels unfair, blocked or wrong.', valence: -0.7, arousal: 0.8, hue: '#FF6B5B', mallows: ['glitzi', 'pipzi'] },
  { id: 'sadness', name: 'Sadness & grief', blurb: 'Heaviness and ache around loss, hurt or things falling short.', valence: -0.75, arousal: 0.25, hue: '#6F8FD6', mallows: ['blubi', 'noomi'] },
  { id: 'disgust', name: 'Disgust & aversion', blurb: 'A recoil from something that feels off, gross or wrong.', valence: -0.6, arousal: 0.5, hue: '#9DBF6A', mallows: ['glitzi', 'loomi'] },
  { id: 'shame', name: 'Shame & guilt', blurb: 'The sting of feeling exposed, at fault or not good enough.', valence: -0.7, arousal: 0.5, hue: '#D79A8F', mallows: ['blubi', 'glitzi'] },
  { id: 'pride', name: 'Pride & confidence', blurb: 'Standing a little taller in who you are and what you did.', valence: 0.7, arousal: 0.6, hue: '#F2A541', mallows: ['boppo', 'pipzi'] },
  { id: 'envy', name: 'Envy & jealousy', blurb: 'Wanting what others have, or fearing losing what you have.', valence: -0.55, arousal: 0.6, hue: '#7CC48A', mallows: ['glitzi', 'zuzu'] },
  { id: 'loneliness', name: 'Loneliness & rejection', blurb: 'Missing connection, or feeling pushed outside the circle.', valence: -0.7, arousal: 0.3, hue: '#8C9BB5', mallows: ['blubi', 'noomi'] },
  { id: 'confusion', name: 'Confusion & uncertainty', blurb: 'Things not adding up, or not knowing which way to go.', valence: -0.3, arousal: 0.45, hue: '#C1A6E0', mallows: ['zuzu', 'glitzi'] },
  { id: 'desire', name: 'Desire & craving', blurb: 'A pull toward something or someone you want.', valence: 0.3, arousal: 0.7, hue: '#E46FA0', mallows: ['pipzi', 'zuzu'] },
  { id: 'boredom', name: 'Boredom & apathy', blurb: 'Low, flat or tired, with little spark for anything.', valence: -0.3, arousal: 0.1, hue: '#B5B1A8', mallows: ['loomi', 'noomi'] },
];

/*
 * Emotion rows. One per line, pipe separated:
 *   id | name | family | also | valence | arousal | face | intensity | aliases | blurb
 * name: blank = derived from id; "~" prefix = reads as an adjective ("feeling stuck").
 * face: preset:weight pairs. aliases: semicolon separated, lowercase.
 * Letter coverage: every letter A–Z has entries except X (no real, sensible English
 * feeling word starts with X; "xenial" means hospitable and would be a stretch).
 */
const ROWS = `
# ---------- love & affection ----------
love||love||.85|.45|loved:1|.6|loving;in love;romantic|A deep warmth toward someone that makes their good matter to you.
affection||love||.75|.3|loved:.7,happy:.3|.5|affectionate;fond feelings|A soft, easy warmth toward someone you like having around.
tenderness||love||.7|.2|loved:.6,calm:.4|.5|tender;gentle love|A gentle, careful kind of love, like holding something small.
fondness||love||.7|.25|loved:.5,happy:.5|.4|fond of;soft spot|Liking someone or something in a warm, familiar way.
adoration||love||.85|.55|loved:.8,happy:.2|.7|adore;adoring|Love so bright it's hard to look away from the person.
devotion||love||.75|.4|loved:.6,determined:.4|.6|devoted;dedicated;loyalty;loyal|A steady love that keeps choosing someone, day after day.
compassion||love||.6|.35|loved:.5,sad:.2,comforted:.3|.5|compassionate;kindness;caring|Feeling someone's pain and wanting to ease it.
empathy||love||.4|.4|loved:.4,sad:.3,comforted:.3|.5|empathetic;empathic;feel for them|Feeling with someone, as if their feeling briefly became yours.
warmth||love|calm|.75|.25|loved:.5,happy:.3,comforted:.2|.4|warm inside;warm and fuzzy;glowy|A glowing, safe feeling that spreads through your chest.
intimacy||love||.75|.4|loved:.8,calm:.2|.5|closeness;intimate;feeling close|The feeling of being close and truly known by someone.
trust||love|calm|.65|.2|calm:.5,loved:.5|.5|trusting;faith in them|Feeling safe to rely on someone without bracing.
longing||love|sadness,desire|-.1|.4|lonely:.5,sad:.3,hopeful:.2|.6|long for;pining;pine for;missing someone;miss someone|Missing someone or something so much it aches.
attachment||love||.4|.35|loved:.7,anxious:.3|.5|attached;bonded|Feeling bound to someone, so their presence matters a lot.
attraction||love|desire|.6|.6|loved:.5,excited:.3,embarrassed:.2|.6|attracted;drawn to;fancy someone|Being drawn toward someone and wanting to be nearer.
admiration||love|pride|.7|.45|happy:.4,awe:.3,loved:.3|.5|admire;look up to;admiring|Seeing something good in someone and wanting to honour it.
protective|~|love|anger|.3|.6|determined:.6,loved:.4|.6|protectiveness;protect them;defensive of|A fierce urge to keep someone you care about safe.
nurturing|~|love|calm|.65|.35|loved:.6,comforted:.4|.5|nurture;caregiving;looking after|Wanting to look after someone and help them grow.
lovesick|~|love|sadness,desire|-.1|.55|loved:.4,sad:.3,anxious:.3|.6|love-struck;lovestruck;pining away|So taken with someone that it's hard to think of anything else.
touched|~|love|joy|.7|.35|loved:.6,happy:.4|.5|heartwarmed;warmed my heart|Gently moved by someone's kindness or care.
belonging||love|calm|.75|.3|loved:.5,comforted:.3,happy:.2|.5|belong;fitting in;part of something;included;welcomed|Feeling you're part of something and have a place in it.
connected|~|love||.7|.35|loved:.6,happy:.4|.5|connection;in sync with|Feeling linked to others, on the same wavelength.
cherished|~|love||.8|.3|loved:.9,comforted:.1|.5|loved;treasured;feel valued|Feeling held dear, like you truly matter to someone.
seen|~|love|pride|.7|.3|loved:.5,comforted:.5|.5|understood;validated;recognised;recognized|Feeling truly noticed and understood for who you are.
sympathy||love|sadness|.3|.3|sad:.5,loved:.5|.4|sympathetic;sorry for them|Feeling sorry for someone's trouble and wishing them well.
infatuation||love|desire|.5|.7|loved:.5,excited:.5|.65|crush;smitten;infatuated;head over heels|An intense, fizzy pull toward someone, often new and all-consuming.
forgiveness||love|calm|.5|.2|calm:.5,relieved:.3,loved:.2|.4|forgiving;forgave;forgive|Releasing a grudge so it stops holding on to you.
appreciated|~|love|pride|.7|.3|loved:.5,proud:.3,happy:.2|.4|valued;thanked|Feeling your efforts were noticed and mattered.
sentimental|~|love|sadness|.4|.3|loved:.5,sad:.3,happy:.2|.4|soppy;mushy;misty-eyed|Soft and stirred by memories or meaningful little things.
kinship||love|calm|.7|.3|loved:.6,happy:.4|.45|kindred spirit;found my people;my people|A sense of being alike and connected, like finding your people.
happy-for-someone|~Happy for someone|love|joy|.8|.5|happy:.6,loved:.4|.5|compersion;glad for them;happy for them;happy for you|Glad that someone else is happy, even when it isn't about you.
# ---------- joy & happiness ----------
joy||joy||.9|.6|happy:1|.6|joyful;happy;happiness;glad|A bright, open feeling that things are good right now.
delight||joy|surprise|.85|.6|happy:.6,excited:.4|.6|delighted;delightful;pleasantly surprised|A quick burst of pleasure when something lovely happens.
pleasure||joy|desire|.75|.45|happy:.7,calm:.3|.5|pleased;enjoyment;enjoying|The good feeling of enjoying something with your senses or heart.
amusement||joy|surprise|.7|.55|playful:.6,happy:.4|.5|amused;hilarious;cracking up;tickled;lol;haha|Finding something funny, with a laugh bubbling close by.
contentment||joy|calm|.75|.15|calm:.6,happy:.4|.4|content;contented;sated|A quiet sense that what you have right now is enough.
cheerfulness||joy||.8|.55|happy:.8,playful:.2|.5|cheerful;chirpy;upbeat;sunny|A light, sunny mood that spills into how you see things.
bliss||joy|calm|.95|.35|happy:.6,calm:.4|.7|blissful;pure happiness|Deep, all-the-way-through happiness, calm at the edges.
elation||joy|surprise|.95|.85|excited:.7,happy:.3|.8|elated;ecstatic;over the moon;on cloud nine;on top of the world;overjoyed|Happiness so big it feels like floating.
euphoria||joy|surprise|.95|.95|excited:.8,happy:.2|.85|euphoric;high on life|An intense, rushing high where everything feels amazing.
gratitude||joy|love|.8|.3|loved:.4,happy:.4,comforted:.2|.5|grateful;thankful;appreciative|Noticing something good you were given, and feeling thankful.
relief||joy|calm|.6|.25|relieved:1|.55|relieved;phew;weight off my shoulders;off the hook|The loosening that comes when a worry finally lets go.
satisfaction||joy|pride|.75|.35|proud:.4,happy:.4,calm:.2|.5|satisfied;fulfilled;fulfilment;fulfillment|The settled feeling of something done or wanted coming good.
triumph||joy|pride|.9|.85|proud:.6,excited:.4|.8|triumphant;victorious;nailed it;smashed it;jubilant|The big rush of winning or getting through something hard.
optimism||joy|curiosity|.7|.45|hopeful:.8,happy:.2|.5|optimistic;positive;glass half full|Expecting things can turn out okay, even if they aren't yet.
hope||joy||.6|.4|hopeful:1|.5|hopeful;hoping|A small light that says better might be possible.
excitement||joy|curiosity|.8|.85|excited:1|.65|excited;exciting;pumped;hyped;stoked;buzzing|A fizzy, can't-sit-still energy about something good.
giddy|~|joy|surprise|.8|.85|excited:.6,playful:.4|.6|giddiness;bubbly|Light-headed with happiness, and a bit silly with it.
playful|~|joy|curiosity|.75|.65|playful:1|.5|playfulness;in a silly mood|Wanting to tease, joke and turn things into fun.
silly|~|joy||.7|.65|playful:.7,happy:.3|.4|goofy;daft;dorky|In a goofy mood where nonsense feels like the right answer.
mischievous|~|joy|curiosity|.55|.7|playful:.8,excited:.2|.5|mischief;up to no good;impish|A sparkly urge to stir things up in a harmless way.
cheeky|~|joy||.6|.6|playful:.9,happy:.1|.4|sassy;cheekiness|Feeling bold and teasing, with a grin in your voice.
glee||joy|surprise|.85|.75|happy:.5,excited:.3,playful:.2|.6|gleeful;whoop|Bubbly delight, often with a little bounce in it.
exhilaration||joy|surprise|.9|.9|excited:.9,happy:.1|.75|exhilarated;thrilled;adrenaline rush|A wild, wind-in-your-hair thrill.
zest||joy|curiosity|.8|.7|excited:.5,happy:.5|.5|zestful;zest for life;full of beans;gusto|A lively appetite for life and whatever comes next.
enthusiasm||joy|curiosity|.8|.7|excited:.6,happy:.4|.55|enthusiastic;keen;into this|Wholehearted keenness for something you care about.
carefree|~|joy|calm|.8|.4|happy:.6,calm:.4|.4|light-hearted;lighthearted;footloose;without a care|Light and unburdened, like nothing is pressing on you.
savouring|Savouring|joy|calm|.8|.3|happy:.5,calm:.5|.4|savoring;relishing;soaking it in|Slowing down to fully enjoy a good moment while it's here.
celebratory|~|joy|pride|.9|.8|excited:.5,happy:.3,proud:.2|.6|festive;party mood;in the mood to celebrate|Wanting to mark something good with noise and cheer.
lucky|~|joy|surprise|.8|.5|happy:.6,surprised:.2,hopeful:.2|.5|fortunate;blessed;jammy|Feeling that luck, or life, has smiled on you.
energised|~Energised|joy|curiosity|.75|.8|excited:.6,determined:.4|.55|energized;full of energy;revved up;charged up|Full of usable energy and ready to go.
schadenfreude||joy|envy,anger|.2|.5|playful:.5,guilty:.3,happy:.2|.4|pleasure at their misfortune;serves them right|A guilty flicker of pleasure at someone's stumble. Very human, and worth noticing kindly.
freedom||joy|calm|.8|.55|happy:.6,relieved:.4|.5|liberated;liberation;unshackled|Unhooked and unrestricted, with room to choose for yourself.
uplifted|~|joy|love|.8|.45|happy:.5,hopeful:.3,loved:.2|.5|elevated;heartened;lifted up|Lifted by seeing kindness or goodness in the world.
# ---------- calm & peace ----------
calm||calm||.6|.1|calm:1|.4|calmness;chill;chilled;mellow;settled|A settled, steady feeling, like still water.
serenity||calm||.75|.05|calm:.8,happy:.2|.5|serene;tranquil;tranquillity;tranquility|A deep, clear calm that feels almost luminous.
peace||calm||.75|.1|calm:.7,comforted:.3|.5|peaceful;at peace;inner peace|Nothing needs fighting right now; things can just be.
stillness||calm||.55|.05|calm:1|.4|quiet inside;hushed;inner quiet|A quiet pause where your mind and body slow right down.
relaxation||calm||.65|.1|calm:.7,relieved:.3|.4|relaxed;unwound;loosened up|Muscles and mind loosening their grip.
ease||calm||.6|.15|calm:.7,relieved:.3|.4|at ease;easy-going;easygoing;effortless|Things feel light and manageable, without strain.
comfort||calm|love|.65|.15|comforted:1|.45|comforted;comfortable;cosy;cozy;snug;soothed;hygge|Feeling soothed and looked after, inside or out.
safety||calm||.6|.1|comforted:.6,calm:.4|.45|safe;secure;protected|Feeling out of harm's way, able to let your guard down.
groundedness||calm|pride|.55|.2|calm:.7,determined:.3|.45|grounded;steady;rooted;anchored|Feeling steady and connected to the here and now.
acceptance||calm||.4|.15|calm:.7,relieved:.3|.45|accepting;made peace with;it is what it is|Letting things be as they are, even if you'd wish otherwise.
centeredness||calm||.55|.2|calm:.8,determined:.2|.45|centered;centred;centredness;balanced|Feeling balanced in yourself, not pulled off to one side.
refreshed|~|calm|joy|.65|.4|happy:.5,calm:.5|.4|renewed;revived;recharged|Clear-headed and topped up, like after fresh air.
patience||calm||.4|.15|calm:.9,determined:.1|.4|patient;able to wait|Being okay with waiting, without straining against time.
composure||calm|pride|.45|.2|calm:.7,determined:.3|.45|composed;collected;keeping my cool|Holding yourself steady even when things are wobbly.
unbothered|~|calm||.4|.1|calm:.8,playful:.2|.35|water off a duck's back;unfazed;chill about it|Things that might rattle you are sliding right off.
sleepy|~|calm|boredom|.1|.05|exhausted:.6,calm:.4|.45|drowsy;dozy;yawning;ready for bed|Heavy-eyed and drifting, your body asking for sleep.
dreamy|~|calm|curiosity|.5|.2|calm:.6,hopeful:.4|.4|daydreamy;in a daydream;floaty|Drifting in your own thoughts, soft and far away.
clarity||calm|curiosity|.55|.35|calm:.5,determined:.3,relieved:.2|.45|clear-headed;lucid;seeing clearly|Things suddenly look clear and make sense.
in-the-moment|~In the moment|calm|curiosity|.5|.2|calm:.8,curious:.2|.4|mindful;fully present;here and now|Fully here, right now, not pulled into past or future.
reassured|~|calm|joy|.55|.2|relieved:.6,comforted:.4|.45|reassurance;put at ease|Calmer after someone or something eased a worry.
rested|~|calm||.6|.25|calm:.6,happy:.4|.4|well-rested;slept well|Your body and mind feel topped up after rest.
equanimity||calm||.5|.1|calm:1|.45|even-keeled;level-headed;unflappable|Staying even and steady through ups and downs.
pensive|~|calm|sadness|.05|.2|calm:.5,curious:.3,sad:.2|.4|contemplative;reflective;thoughtful|Quietly turning things over in your mind.
# ---------- interest & curiosity ----------
curiosity||curiosity||.5|.55|curious:1|.5|curious;nosy;inquisitive|Wanting to know more, your mind leaning in.
interest||curiosity||.45|.45|curious:.8,happy:.2|.4|interested;interesting;into it|Something has caught your attention and you want more.
wonder||curiosity|surprise|.65|.5|awe:.6,curious:.4|.55|wondrous;marvel;marvelling|A wide-eyed sense that the world is bigger and stranger than you thought.
fascination||curiosity||.6|.6|curious:.7,awe:.3|.6|fascinated;fascinating;captivated;spellbound|Being completely caught up by something absorbing.
intrigue||curiosity||.45|.55|curious:.8,playful:.2|.5|intrigued;intriguing|A puzzle-tug that makes you want to find out what's going on.
engagement||curiosity|pride|.55|.55|curious:.5,determined:.5|.5|engaged;absorbed;in the zone;in flow;flow state|Fully involved in what you're doing, time slipping by.
anticipation||curiosity|joy|.4|.6|hopeful:.5,excited:.5|.5|anticipating;looking forward;can't wait|Leaning toward something that's coming soon.
alertness||curiosity|fear|.2|.7|curious:.6,surprised:.4|.5|alert;watchful;vigilant;on alert|Switched-on and watchful, ready to notice anything.
inspiration||curiosity|joy|.75|.65|hopeful:.5,excited:.5|.6|inspired;inspiring;lightbulb moment|A spark that makes you want to create, try or begin.
motivation||curiosity|pride|.6|.65|determined:.8,excited:.2|.55|motivated;fired up;driven to|Wanting to act, and having the push to start.
eagerness||curiosity|desire|.6|.7|excited:.6,hopeful:.4|.55|eager;raring to go;itching to|Keen and ready, wanting to start right now.
focused|~|curiosity|pride|.45|.5|determined:.7,calm:.3|.5|focussed;locked in;concentrating|Your attention is gathered in one place, steady and sharp.
openness||curiosity|calm|.5|.35|curious:.6,calm:.4|.4|open-minded;receptive|Willing to let new things in without bracing.
challenged|~|curiosity|fear|.2|.65|determined:.6,anxious:.4|.5|stretched;up for a challenge|Stretched by something hard, in a way that might grow you.
suspense||curiosity|fear|-.05|.75|anxious:.5,curious:.5|.5|on tenterhooks;on the edge of my seat;cliffhanger|Hanging on, waiting to find out what happens.
adventurous|~|curiosity|joy|.7|.7|excited:.6,curious:.4|.5|adventure;daring to explore;up for anything|Up for something new, and a little daring with it.
# ---------- surprise & awe ----------
surprise||surprise||.1|.8|surprised:1|.55|surprised;caught off guard;unexpected;taken aback|A jolt when something you didn't expect suddenly happens.
amazement||surprise|joy|.6|.8|surprised:.6,awe:.4|.6|amazed;amazing;blown away|Surprise with a big dose of 'wow'.
awe||surprise|curiosity|.6|.55|awe:1|.65|awed;awestruck;in awe;breathtaking|Feeling small in a good way next to something vast or beautiful.
astonishment||surprise||.2|.85|surprised:.8,awe:.2|.65|astonished;astounded;stunned|Being so surprised you can hardly take it in.
wonderstruck|~|surprise|curiosity|.7|.6|awe:.7,surprised:.3|.6|wonder-struck;starry-eyed|Spellbound by something so lovely or strange it stops you.
shock||surprise|fear|-.4|.9|surprised:.6,scared:.4|.75|shocked;in shock;shaken;reeling|A sudden blow that takes the breath out of you.
startle||surprise|fear|-.1|.9|surprised:.7,scared:.3|.5|startled;made me jump|A quick, whole-body jump at something sudden.
disbelief||surprise|confusion|-.1|.6|surprised:.6,confused:.4|.55|can't believe it;in disbelief;unbelievable|It seems too much, too good or too bad to be real.
dumbfounded|~|surprise|confusion|0|.7|surprised:.6,confused:.4|.6|speechless;lost for words;gobsmacked|So surprised that words have completely left the building.
flabbergasted|~|surprise||.05|.8|surprised:.9,confused:.1|.6|floored;bowled over|Utterly taken aback, eyebrows somewhere near the ceiling.
moved|~|surprise|love|.6|.45|awe:.5,loved:.3,sad:.2|.6|deeply moved;stirred;choked up|Something reached you deeply, maybe enough for tears.
realisation|Realisation|surprise|curiosity|.3|.6|surprised:.6,curious:.4|.5|realization;epiphany;penny dropped;aha moment|The click of suddenly seeing something you hadn't before.
humbled|~|surprise|love|.4|.35|awe:.5,loved:.3,embarrassed:.2|.45|humble;humility|Made smaller in a good way, by kindness or greatness.
reverence||surprise|love,calm|.6|.3|awe:.7,calm:.3|.55|reverent;sacred feeling;deep respect|A deep, quiet respect for something larger or precious.
dismay||surprise|sadness|-.55|.6|sad:.5,surprised:.5|.55|dismayed;oh no;sinking heart|A sinking 'oh no' when something goes wrong.
# ---------- fear & anxiety ----------
fear||fear||-.75|.8|scared:1|.65|scared;afraid;frightened;fearful|Your whole system bracing for something that might harm you.
anxiety||fear||-.65|.75|anxious:1|.6|anxious;anxiousness;anxiety ridden|A restless, buzzing worry, often about what might happen.
worry||fear||-.55|.6|anxious:.8,sad:.2|.5|worried;worrying;fretting;concerned;worried sick|Your mind running ahead, turning 'what if' over and over.
nervousness||fear||-.45|.7|anxious:.7,embarrassed:.3|.5|nervous;nerves;the jitters|Fluttery and unsteady before something that matters.
dread||fear|sadness|-.75|.55|scared:.6,anxious:.4|.65|dreading;dreadful;sinking feeling;filled with dread;doom|A heavy, sinking feeling about something coming.
panic||fear||-.85|.95|scared:.8,anxious:.2|.85|panicking;panicky;freaking out;freak out|A rush of fear so strong your body hits the alarm.
terror||fear||-.95|.95|scared:1|.9|terrified;horrified;petrified;scared stiff|Fear at full volume, everything screaming 'get away'.
insecurity||fear|shame|-.55|.45|anxious:.5,embarrassed:.3,sad:.2|.55|insecure;unsure of myself;self-doubt|Doubting whether you're good enough, or safe in someone's eyes.
apprehension||fear||-.45|.55|anxious:.7,curious:.3|.5|apprehensive;wary;uneasy about|A careful, uneasy expectation that something may go wrong.
unease||fear|confusion|-.4|.45|anxious:.7,confused:.3|.45|uneasy;unsettled;something feels off|A low hum that something isn't quite right.
overwhelm||fear|confusion|-.65|.8|anxious:.5,exhausted:.3,scared:.2|.7|overwhelmed;swamped;all too much;drowning in;snowed under|Too much at once, like the waves keep coming before you can stand.
vulnerability||fear|shame|-.3|.45|anxious:.5,sad:.3,embarrassed:.2|.55|vulnerable;fragile|Feeling open and unprotected, easy to hurt right now.
on-edge|~|fear|anger|-.55|.75|anxious:.7,frustrated:.3|.6|edgy;wound up;keyed up;walking on eggshells|Tight and watchful, like the next small thing might tip you.
jittery|~|fear|joy|-.25|.85|anxious:.6,excited:.4|.45|jitters;shaky;twitchy;wired;hyper|Buzzy and shaky, like your body has too much fizz in it.
stress||fear|anger|-.6|.75|anxious:.6,frustrated:.2,exhausted:.2|.6|stressed;stressed out;stressful;under stress|Your system working overtime under too many demands.
angst||fear|sadness|-.6|.5|anxious:.5,sad:.5|.55|angsty;existential dread|A heavy, nameless unease about life, yourself or the future.
nervous-excitement|Nervous excitement|fear|joy|.2|.85|excited:.5,anxious:.5|.6|butterflies;anxious-excited;excited but nervous;nervous but excited|Butterflies that can't decide if they're thrilled or scared.
fear-of-missing-out|Fear of missing out|fear|envy,loneliness|-.4|.6|anxious:.5,jealous:.3,lonely:.2|.5|fomo;missing out|The itch that everyone else is having the good time without you.
sunday-dread||fear|sadness|-.5|.5|anxious:.6,sad:.4|.5|sunday scaries;sunday blues;sunday night dread;dread of sunday|That heavy Sunday feeling as the week ahead starts looming.
imposter-feelings||fear|shame|-.55|.55|anxious:.5,embarrassed:.3,guilty:.2|.55|imposter syndrome;impostor syndrome;imposter;impostor;feel like a fraud|Worrying you'll be 'found out', even when you've earned your place.
tense|~|fear|anger|-.4|.65|anxious:.6,frustrated:.4|.5|tension;wound tight;clenched|Your body braced and tight, like it's holding its breath.
spooked|~|fear|surprise|-.5|.75|scared:.7,surprised:.3|.5|creeped out;freaked;the creeps|A shivery, hair-on-end fear, often from something odd.
threatened|~|fear|anger|-.65|.75|scared:.6,angry:.4|.6|under threat;intimidated|Sensing something or someone could harm what matters to you.
powerless|~|fear|sadness|-.7|.4|sad:.5,scared:.5|.65|no control;out of control;nothing i can do|Feeling unable to change what's happening to you.
helpless|~|fear|sadness|-.75|.4|sad:.6,scared:.4|.65|helplessness;can't do anything|Wanting to help or fix things but feeling unable to.
trapped|~|fear|anger|-.7|.6|scared:.5,frustrated:.5|.65|cornered;boxed in;no way out;caged in;claustrophobic|Hemmed in, like every door has quietly closed.
pressured|~|fear|anger|-.5|.7|anxious:.6,frustrated:.4|.55|under pressure;pressure;feel the pressure|Squeezed by expectations, deadlines or other people's needs.
overstimulated|~|fear|anger|-.5|.85|anxious:.5,frustrated:.3,exhausted:.2|.6|overstimulation;sensory overload;too loud;too much noise|Too much sound, light or input, and your system wants quiet.
frazzled|~|fear|boredom|-.55|.7|exhausted:.5,anxious:.5|.55|frayed;at my wits' end;harried;run ragged|Frayed at the edges from too much, for too long.
rattled|~|fear|surprise|-.5|.7|scared:.5,surprised:.3,anxious:.2|.55|shook;shaken up;thrown off|Knocked off balance by something that just happened.
suspicion||fear|confusion|-.35|.55|confused:.5,anxious:.5|.45|suspicious;distrust;mistrust;wary of|A sense that something or someone might not be what they seem.
shyness||fear|shame|-.25|.45|embarrassed:.6,anxious:.4|.45|shy;timid;bashful|Wanting to hang back and not be the centre of attention.
fear-of-failure|Fear of failure|fear|shame|-.6|.65|scared:.5,anxious:.5|.6|scared of failing;afraid to fail;afraid of failing;terrified i'll fail;scared i'll fail;worried i'll fail|Worry that you'll try, fall short, and what that might mean.
guarded|~|fear|anger|-.3|.5|anxious:.6,neutral:.4|.45|walls up;keeping my distance|Keeping your walls up until you're sure it's safe.
# ---------- anger & frustration ----------
anger||anger||-.7|.8|angry:1|.6|angry;mad;cross;pissed;pissed off|A hot surge that says something isn't fair or okay.
irritation||anger||-.45|.6|frustrated:.6,angry:.4|.45|irritated;irritating;getting on my nerves;bugged|A scratchy, low-level 'ugh' at something rubbing you the wrong way.
annoyance||anger||-.4|.55|frustrated:.7,angry:.3|.4|annoyed;annoying;bothered;peeved;miffed|Being bugged by something small but persistent.
frustration||anger||-.55|.7|frustrated:1|.55|frustrated;frustrating;fed up;exasperated;exasperation;sick of it;had enough|Pushing against something that just won't budge.
resentment||anger|envy|-.6|.5|angry:.5,jealous:.3,sad:.2|.55|resentful;resent;holding a grudge;grudge;chip on my shoulder|Old hurt that keeps simmering because it never felt put right.
rage||anger||-.9|.95|angry:1|.9|raging;enraged;seeing red;seething|Anger so big it feels like it's taking over the wheel.
fury||anger||-.9|.95|angry:.9,frustrated:.1|.9|furious;livid;fuming;irate|Blazing, white-hot anger.
bitterness||anger|sadness|-.6|.4|angry:.4,sad:.4,disgusted:.2|.55|bitter;sour about|A lingering sourness after something unfair or disappointing.
outrage||anger|disgust|-.8|.9|angry:.8,disgusted:.2|.8|outraged;appalled;how dare they|Anger at something that crosses a line of what's right.
hostility||anger||-.75|.75|angry:.8,disgusted:.2|.65|hostile;aggressive;combative|Feeling set against someone, ready to push back hard.
impatience||anger||-.35|.7|frustrated:.8,bored:.2|.45|impatient;itching to move on|Wanting things to move faster than they are.
indignation||anger||-.6|.7|angry:.7,proud:.3|.6|indignant;affronted|Anger at being treated unfairly or disrespected.
irritable|~|anger|boredom|-.45|.6|frustrated:.6,angry:.4|.5|tetchy;snappy;short-tempered;prickly;touchy|Everything's getting under your skin more easily than usual.
grumpy|~|anger|boredom|-.4|.35|frustrated:.5,angry:.3,bored:.2|.4|grouchy;grumbly;in a mood;moody|Low, rumbly bad mood where everything's a bit annoying.
cranky|~|anger|boredom|-.4|.55|frustrated:.6,exhausted:.4|.45|crabby;ratty;fractious|Out of sorts and quick to snap, often from tiredness.
hangry|~|anger|desire|-.35|.65|angry:.6,exhausted:.4|.45|hungry and angry|Hunger turning into snappiness. A snack might be worth a try.
sulky|~|anger|sadness|-.45|.25|sad:.5,angry:.5|.4|sulking;huffy;in a huff;pouty;pouting|Withdrawing into a quiet huff after feeling slighted.
petty|~|anger|envy|-.35|.5|jealous:.5,playful:.3,angry:.2|.35|pettiness;salty;keeping score|Small grudges with big energy, wanting the little win.
spiteful|~|anger|envy|-.65|.65|angry:.7,jealous:.3|.55|spite;out of spite|Wanting someone to feel a bit of the hurt they caused.
vindictive|~|anger||-.75|.7|angry:.9,jealous:.1|.6|vengeful;revenge;wanting revenge;get back at|An urge to get even, to make it hurt back.
scorned|~|anger|loneliness|-.7|.65|angry:.5,sad:.3,lonely:.2|.65|spurned;slighted;snubbed;jilted|Hurt and angry after being rejected or looked down on.
defensive|~|anger|fear|-.45|.7|angry:.5,anxious:.5|.5|defensiveness;on the defensive|Bracing to protect yourself from criticism or attack.
provoked|~|anger||-.55|.75|angry:.8,frustrated:.2|.55|triggered;riled;riled up;goaded|Something poked you, and you can feel the reaction rising.
aggravation||anger||-.5|.65|frustrated:.8,angry:.2|.5|aggravated;aggro|Annoyance piling up until it starts to grind.
disrespected|~|anger|shame|-.65|.65|angry:.6,sad:.2,embarrassed:.2|.6|disrespect;belittled;talked down to;patronised;patronized|Treated as if you matter less than you do.
wronged|~|anger|sadness|-.65|.55|angry:.6,sad:.4|.6|treated unfairly;unfair;injustice;hard done by|Knowing something unfair was done to you.
insulted|~|anger|shame|-.6|.65|angry:.6,embarrassed:.4|.55|offended;insult;put down|Stung by words or actions that put you down.
quarrelsome|~|anger||-.5|.7|angry:.6,frustrated:.4|.5|argumentative;spoiling for a fight;combative mood|In the mood to argue; small things feel like a fight.
rebellious|~|anger|pride|.1|.75|playful:.4,determined:.4,angry:.2|.5|rebel;defiant;defiance|Wanting to push against rules or expectations.
taken-advantage-of|~Taken advantage of|anger|loneliness|-.65|.55|angry:.5,sad:.3,frustrated:.2|.6|feel used;feeling used;exploited;taken for a ride|Feeling someone took from you without caring about you.
# ---------- sadness & grief ----------
sadness||sadness||-.7|.25|sad:1|.55|sad;unhappy;upset;feeling down;feeling low;low mood;down in the dumps|A heavy, slowed-down feeling when something hurts or is missing.
sorrow||sadness||-.75|.2|sad:1|.65|sorrowful;woeful|A deep, quiet sadness that sits with you.
grief||sadness|loneliness|-.85|.35|sad:.8,lonely:.2|.8|grieving;bereaved;bereavement|The ache of losing someone or something you loved.
disappointment||sadness|anger|-.55|.3|disappointed:.75,sad:.25|.5|disappointed;disappointing;let down;gutted;bummed|When what happened falls short of what you hoped for.
hurt||sadness|anger|-.65|.45|sad:.8,angry:.2|.6|hurting;wounded;stung;hurt feelings|Pain from something said or done, often by someone who matters.
heartache||sadness|love|-.7|.35|sad:.7,lonely:.3|.65|aching heart;heartsore|A deep ache in the chest about someone or something you love.
despair||sadness|fear|-.95|.4|sad:.8,exhausted:.2|.85|despairing;despondent;in despair|Feeling there's no way through, and hope has gone quiet.
hopelessness||sadness|fear|-.9|.2|sad:.7,exhausted:.3|.8|hopeless;no hope;pointless|Struggling to see how things could get better.
emptiness||sadness|boredom|-.6|.1|sad:.5,bored:.3,lonely:.2|.6|empty;hollow;void inside|A hollow, nothing-inside feeling that's hard to put words to.
gloom||sadness|boredom|-.6|.15|sad:.8,bored:.2|.5|gloomy;glum;dreary;doom and gloom;feeling blue|A grey cloud hanging over everything.
regret||sadness|shame|-.55|.35|sad:.6,guilty:.4|.55|regretful;regrets;wish i hadn't;if only|Wishing you'd chosen differently, and feeling the sting of it.
mourning||sadness|loneliness|-.75|.25|sad:.9,lonely:.1|.75|in mourning;mourn|Living through loss over time, honouring what's gone.
heartbreak||sadness|love|-.85|.55|sad:.8,lonely:.2|.8|heartbroken;broken heart;broken-hearted;brokenhearted|The raw pain of love lost, ended or not returned.
melancholy||sadness|calm|-.45|.15|sad:.7,calm:.3|.5|melancholic;pensive sadness|A soft, reflective sadness, almost gentle in its heaviness.
wistful|~|sadness|love|-.15|.2|sad:.5,hopeful:.3,loved:.2|.4|wistfulness;wishing it were so|A gentle, faraway wishing for what was or might have been.
nostalgia||sadness|joy,love|.15|.3|sad:.4,happy:.4,loved:.2|.45|nostalgic;the good old days;reminiscing|A warm-sad pull toward the past.
saudade||sadness|love|-.2|.25|sad:.5,lonely:.3,loved:.2|.55|deep longing for what is gone|A Portuguese word for a tender ache of longing for someone or something absent.
bittersweetness||sadness|joy|.05|.3|sad:.5,happy:.5|.5|bittersweet;happy-sad;happy and sad|Sweet and sore at once, like a goodbye after a lovely time.
disillusionment||sadness|anger|-.5|.3|sad:.6,frustrated:.4|.55|disillusioned;jaded|The sad deflation when something isn't what you believed it was.
betrayal||sadness|anger|-.8|.65|sad:.5,angry:.5|.75|betrayed;stabbed in the back;backstabbed;double-crossed;cheated on|The sharp hurt of trust broken by someone you relied on.
dejection||sadness||-.65|.15|sad:.9,exhausted:.1|.55|dejected;downcast;crestfallen;deflated;crushed|Knocked down and deflated, energy draining away.
discouraged|~|sadness|boredom|-.5|.25|sad:.6,exhausted:.4|.5|disheartened;demoralised;demoralized;losing heart|Losing the will to keep trying after setbacks.
defeated|~|sadness|shame|-.7|.2|sad:.6,exhausted:.4|.6|beaten;given up;giving up|Feeling like you've lost the fight, at least for now.
tearful|~|sadness||-.6|.4|sad:1|.55|teary;weepy;crying;in tears;close to tears;want to cry|Tears close to the surface, ready to spill.
self-pity|Self-pity|sadness|shame|-.55|.2|sad:.8,lonely:.2|.45|feeling sorry for myself;poor me;pity party|Feeling sorry for yourself, often a sign you need some care.
misery||sadness||-.85|.35|sad:.8,exhausted:.2|.7|miserable;wretched|Deep unhappiness that colours everything.
anguish||sadness|fear|-.9|.7|sad:.7,scared:.3|.85|anguished;agony;tormented|Intense emotional pain that feels hard to bear.
heavy-hearted|~Heavy-hearted|sadness||-.6|.15|sad:.8,exhausted:.2|.55|heavy heart;weighed down|Carrying a weight in your chest that makes everything slower.
anticipatory-grief||sadness|fear|-.7|.35|sad:.7,anxious:.3|.65|grieving in advance;losing them slowly|Grieving a loss that hasn't fully happened yet, a goodbye in slow motion.
discontent||sadness|boredom,anger|-.4|.35|sad:.4,frustrated:.4,bored:.2|.45|discontented;dissatisfied;unfulfilled|A restless sense that something in your life isn't right yet.
bereft|~|sadness|loneliness|-.8|.2|sad:.7,lonely:.3|.7|bereftness;stripped of|Left empty-handed by loss, missing something essential.
resigned|~|sadness|calm|-.35|.1|sad:.5,exhausted:.3,calm:.2|.4|resignation;giving in;oh well|Giving in to something you can't change, with a quiet sigh.
sensitive|~|sadness|fear|-.35|.45|sad:.5,anxious:.3,embarrassed:.2|.45|oversensitive;thin-skinned;raw|Everything lands harder than usual today.
# ---------- disgust & aversion ----------
disgust||disgust||-.7|.55|disgusted:1|.6|disgusted;disgusting;gross;grossed out;yuck;ew|A strong 'ugh, no' at something that feels wrong or off.
revulsion||disgust||-.85|.65|disgusted:1|.75|revolted;revolting;sickened;nauseated|A gut-deep recoil, like your body is pulling away.
contempt||disgust|anger|-.65|.45|disgusted:.6,angry:.4|.6|contemptuous;scorn;disdain;looking down on|Feeling that someone is beneath respect.
distaste||disgust||-.4|.3|disgusted:.8,bored:.2|.4|distasteful;not my taste;off-putting|A mild 'not for me' recoil.
aversion||disgust|fear|-.5|.45|disgusted:.6,anxious:.4|.5|averse;can't stand|A strong urge to keep away from something.
repulsion||disgust||-.75|.6|disgusted:1|.65|repulsed;repulsive;repelled|Being pushed away hard by something unpleasant.
disapproval||disgust|anger|-.45|.4|disgusted:.5,angry:.3,frustrated:.2|.45|disapprove;disapproving;not okay with|Judging something as wrong or not acceptable.
loathing||disgust|anger|-.85|.6|disgusted:.6,angry:.4|.75|loathe;hate;hatred;detest;despise|An intense dislike that wants nothing to do with something.
squeamish|~|disgust|fear|-.4|.5|disgusted:.6,scared:.4|.4|queasy;squicked|A wobbly, slightly sick recoil, often at blood or bugs.
the-ick|The ick|disgust|love|-.4|.4|disgusted:.8,embarrassed:.2|.4|ick;icked out|A sudden turn-off where someone's charm curdles a bit.
moral-disgust||disgust|anger|-.75|.6|disgusted:.6,angry:.4|.65|morally repulsed;sickening behaviour|Recoiling from something that feels deeply unfair or cruel.
cynicism||disgust|boredom|-.45|.3|disgusted:.4,bored:.3,frustrated:.3|.45|cynical;eye-rolling;jaded about|Expecting the worst of people or things, often after being let down.
# ---------- shame & guilt ----------
shame||shame||-.8|.45|guilty:.5,embarrassed:.5|.65|ashamed;shameful;shamed|A painful sense that something about you is wrong or unworthy.
guilt||shame||-.65|.5|guilty:1|.6|guilty;guilt-ridden;my fault;feel bad about|Feeling you did something wrong and wanting to put it right.
embarrassment||shame|surprise|-.45|.65|embarrassed:1|.5|embarrassed;embarrassing;blushing;red-faced|Feeling exposed after a slip in front of others.
humiliation||shame|anger|-.85|.7|embarrassed:.6,sad:.2,angry:.2|.75|humiliated;humiliating;mortified;degraded;made a fool of|Being lowered or exposed in a way that stings deeply.
remorse||shame|sadness|-.65|.35|guilty:.7,sad:.3|.6|remorseful;deeply sorry;contrite|Deep sorrow for something you did, wishing you could undo it.
self-consciousness|Self-consciousness|shame|fear|-.4|.55|embarrassed:.7,anxious:.3|.5|self-conscious;everyone's looking;on show|Painfully aware of how you seem to others.
awkwardness||shame|confusion|-.3|.5|embarrassed:.8,confused:.2|.4|awkward;cringe;cringey;cringy|That clunky 'what do I do with my hands' feeling.
sheepish|~|shame|joy|-.15|.4|embarrassed:.7,playful:.3|.35|caught out;a bit bashful|A small, slightly guilty grin after a little slip.
exposed|~|shame|fear|-.6|.6|embarrassed:.6,scared:.4|.6|laid bare;seen through;found out|Seen in a way you didn't choose, with nowhere to hide.
self-critical|~Self-critical|shame|anger|-.65|.5|guilty:.4,frustrated:.4,sad:.2|.6|self-criticism;hard on myself;beating myself up;inner critic|A harsh inner voice picking you apart.
perfectionistic|~|shame|fear|-.45|.65|anxious:.6,determined:.4|.55|perfectionism;perfectionist;never good enough;has to be perfect|Feeling only flawless will do, so everything feels like a test.
inadequate|~|shame|fear|-.7|.35|sad:.5,embarrassed:.3,guilty:.2|.6|inadequacy;not good enough;falling short;feel small|Feeling you don't measure up to what's needed.
worthless|~|shame|sadness|-.9|.25|sad:.7,guilty:.3|.8|worthlessness;unworthy;feel useless;feeling useless|A painful sense that you don't matter. That's the feeling talking, not the truth about you.
foolish|~|shame|surprise|-.4|.5|embarrassed:.8,confused:.2|.45|feel stupid;felt stupid;feel dumb;like an idiot|Kicking yourself for a slip that seems obvious now.
secondhand-embarrassment||shame|disgust|-.35|.55|embarrassed:.8,disgusted:.2|.4|second-hand embarrassment;cringing for them;vicarious embarrassment|Cringing on someone else's behalf, as if it happened to you.
self-loathing|Self-loathing|shame|disgust|-.9|.45|guilty:.4,sad:.4,disgusted:.2|.8|hate myself;hating myself;self-hatred;self-hate|Harsh dislike turned inward. You deserve more kindness than that voice gives.
qualms||shame|confusion|-.3|.4|guilty:.5,confused:.5|.4|qualm;pangs of conscience;second thoughts|A twinge of doubt or conscience about whether something is right.
apologetic|~|shame|love|-.3|.4|guilty:.7,sad:.3|.45|sorry;want to apologise;want to apologize|Wanting to say sorry and set something right.
obligated|~|shame|anger|-.4|.45|frustrated:.5,guilty:.5|.45|obliged;duty-bound;have to;should|Doing something because you feel you must, not because you want to.
flustered|~|shame|fear|-.35|.7|embarrassed:.6,anxious:.4|.45|hot and bothered;in a fluster;all of a fluster|Hot, muddled and a bit thrown, often under pressure or attention.
# ---------- pride & confidence ----------
pride||pride||.75|.6|proud:1|.6|proud;chuffed;proud of myself|A warm swell from something you did or who you are.
confidence||pride||.7|.55|proud:.6,determined:.4|.55|confident;self-assured;sure of myself|Trusting yourself to handle what's in front of you.
self-respect|Self-respect|pride|calm|.6|.35|proud:.6,calm:.4|.5|self-worth;dignity;respect myself|Knowing your worth and treating yourself that way.
courage||pride|fear|.55|.7|determined:.7,proud:.3|.6|brave;bravery;courageous;guts|Feeling the fear and stepping forward anyway.
empowerment||pride||.75|.7|proud:.5,determined:.5|.6|empowered;empowering;in control;got my power back|Feeling you have the power to shape what happens.
boldness||pride|desire|.6|.75|determined:.6,proud:.2,playful:.2|.55|bold;daring;audacious|Ready to take a big swing, and to be seen doing it.
assurance||pride|calm|.65|.35|calm:.5,proud:.5|.5|assured;self-assurance|A settled certainty in yourself or a situation.
determination||pride|desire|.55|.75|determined:1|.6|determined;resolve;resolute;persistent;won't give up|A firm 'I'm doing this', even when it's hard.
proud-of-someone|~Proud of someone|pride|love|.85|.55|proud:.6,loved:.4|.6|so proud of you;proud of them;proud of her;proud of him|A glowing pride in someone else's win, as if it's a little yours too.
smug|~|pride|joy|.35|.4|proud:.6,playful:.4|.4|smugness;self-satisfied;told you so|A satisfied little 'I was right' glow.
accomplished|~|pride|joy|.8|.5|proud:.7,happy:.3|.6|accomplishment;achievement;achieved;got it done|The satisfaction of finishing something that took real effort.
capable|~|pride|calm|.6|.45|determined:.6,proud:.4|.5|competent;on top of it;got this|Feeling up to the task and able to handle things.
vindicated|~|pride|joy|.6|.6|proud:.7,relieved:.3|.55|proven right;vindication|Finally shown to be right after being doubted.
resilient|~|pride|calm|.6|.5|determined:.7,proud:.3|.55|resilience;bouncing back;feel strong|Bending without breaking, and coming back up.
worthy|~|pride|calm|.65|.3|proud:.6,comforted:.4|.5|deserving;i am enough|Feeling you deserve good things simply as you are.
invincible|~|pride|joy|.75|.85|proud:.5,excited:.3,determined:.2|.6|unstoppable;on fire;bulletproof|Feeling like nothing can knock you down right now.
independent|~|pride|calm|.55|.45|proud:.6,determined:.4|.45|independence;self-reliant|Standing on your own feet and liking it.
respected|~|pride|love|.7|.35|proud:.7,comforted:.3|.5|respect;looked up to;taken seriously|Feeling others value your views and your worth.
# ---------- envy & jealousy ----------
envy||envy||-.5|.55|jealous:1|.55|envious;green with envy;wish i had|Wanting what someone else has, and feeling the sting of the gap.
jealousy||envy|fear,anger|-.6|.7|jealous:.7,anxious:.3|.6|jealous;jelly|Fear of losing someone or something to another, often mixed with hurt.
possessiveness||envy|love|-.45|.6|jealous:.6,anxious:.4|.55|possessive;territorial|Wanting to keep someone or something close and all your own.
coveting||envy|desire|-.3|.55|jealous:.6,excited:.4|.5|covet;covetous;want what they have|Strongly wanting something that belongs to someone else.
competitiveness||envy|pride|.1|.75|determined:.6,jealous:.4|.5|competitive;rivalry;need to win|A drive to measure up and come out on top.
comparison||envy|shame|-.4|.45|jealous:.6,sad:.4|.5|comparing myself;compare myself;measuring up|Sizing yourself up against others and coming away smaller.
begrudging|~|envy|anger|-.4|.4|jealous:.5,frustrated:.5|.45|grudging;begrudge|Giving or allowing something, but with a reluctant little scowl.
inferiority||envy|shame|-.65|.3|sad:.5,embarrassed:.3,jealous:.2|.55|inferior;lesser than;beneath others|Feeling ranked below others, in looks, skill or worth.
overshadowed|~|envy|loneliness|-.5|.35|jealous:.5,lonely:.3,sad:.2|.5|outshone;in their shadow|Feeling unseen next to someone who seems to shine brighter.
# ---------- loneliness & rejection ----------
loneliness||loneliness|sadness|-.7|.25|lonely:1|.6|lonely;lonesome;feel alone;all alone;so alone|Missing connection, sometimes even with people around.
rejection||loneliness|shame|-.75|.45|sad:.6,lonely:.4|.65|rejected;turned down;unwanted;dumped|The sting of being pushed away or not chosen.
alienation||loneliness|confusion|-.6|.3|lonely:.8,confused:.2|.55|alienated;outsider;don't fit in;don't belong|Feeling like an outsider, cut off from the people around you.
abandonment||loneliness|fear|-.8|.5|lonely:.6,scared:.4|.7|abandoned;deserted;left alone;walked out on|Feeling left behind by someone you counted on.
exclusion||loneliness|anger|-.6|.45|lonely:.7,sad:.3|.55|excluded;left out;not invited|Being kept outside a circle you wanted to be part of.
isolation||loneliness|sadness|-.65|.15|lonely:.9,sad:.1|.6|isolated;cut off;shut away|Being apart from others, physically or emotionally, for too long.
homesickness||loneliness|sadness,love|-.5|.3|lonely:.6,sad:.4|.55|homesick;missing home;miss home|Aching for the people, places and feel of home.
invisible|~|loneliness|sadness|-.6|.2|lonely:.7,sad:.3|.55|unseen;overlooked;nobody notices|Feeling unnoticed, as if you could vanish and no one would see.
unappreciated|~|loneliness|anger|-.55|.4|sad:.5,frustrated:.3,lonely:.2|.5|taken for granted;thankless;underappreciated|Your effort goes unnoticed or unthanked.
misunderstood|~|loneliness|anger|-.55|.4|lonely:.5,frustrated:.3,sad:.2|.5|nobody gets me;no one understands|Others are seeing a version of you that isn't quite right.
judged|~|loneliness|shame|-.6|.55|embarrassed:.5,anxious:.3,sad:.2|.55|criticised;criticized;judgement;judgment;scrutinised|Feeling weighed up and found wanting by others.
ghosted|~|loneliness|confusion|-.6|.4|lonely:.5,confused:.3,sad:.2|.55|left on read;no reply;ignored|Someone went quiet without explanation, leaving you hanging.
unloved|~|loneliness|sadness|-.8|.25|lonely:.6,sad:.4|.7|unlovable;nobody loves me|Feeling no one holds you dear right now. That's painful, and worth care.
disconnected|~|loneliness|boredom|-.5|.2|lonely:.6,bored:.4|.5|disconnection;out of touch;detached|Feeling unplugged from people, or from yourself.
forgotten|~|loneliness|sadness|-.6|.2|lonely:.7,sad:.3|.55|forgotten about;neglected;left behind|Feeling dropped from other people's minds and plans.
# ---------- confusion & uncertainty ----------
confusion||confusion||-.3|.5|confused:1|.5|confused;confusing;muddled;puzzled|Things aren't adding up and your mind is hunting for the thread.
doubt||confusion|fear|-.35|.4|confused:.6,anxious:.4|.45|doubtful;doubting;unsure;not sure;second-guessing|Not quite trusting a thought, a choice or yourself.
uncertainty||confusion|fear|-.35|.45|confused:.6,anxious:.4|.5|uncertain;up in the air|Not knowing how things will turn out, and feeling the wobble of it.
indecision||confusion||-.3|.5|confused:.8,anxious:.2|.45|indecisive;can't decide;can't choose|Stuck between options, unable to pick.
conflicted|~|confusion||-.3|.55|confused:.7,anxious:.3|.5|torn;torn between;in two minds;of two minds|Pulled two ways at once by feelings or values.
disorientation||confusion|fear|-.4|.5|confused:.7,scared:.3|.5|disoriented;disorientated;all at sea;dazed|Thrown off, unsure where you stand or which way is up.
hesitation||confusion|fear|-.2|.4|confused:.5,anxious:.5|.4|hesitant;hesitating;holding back;cold feet|A pause before acting, unsure whether to go ahead.
ambivalence||confusion||-.1|.4|confused:.6,neutral:.4|.45|ambivalent;mixed feelings;neither here nor there|Holding opposite feelings about the same thing at once.
lost|~|confusion|sadness|-.5|.3|confused:.6,sad:.4|.55|directionless;adrift;aimless|Unsure of your direction, as if the map went missing.
stuck|~|confusion|anger,boredom|-.5|.4|frustrated:.6,confused:.4|.55|in a rut;going nowhere;can't move forward|Wheels spinning, unable to get going or move on.
foggy|~|confusion|boredom|-.35|.15|confused:.6,exhausted:.4|.45|brain fog;fuzzy;hazy;can't think straight|Your thoughts feel muffled and slow, like walking through mist.
scattered|~|confusion|fear|-.35|.7|confused:.6,anxious:.4|.45|all over the place;unfocused;distracted|Your attention keeps splitting in different directions.
overthinking||confusion|fear|-.5|.65|anxious:.6,confused:.4|.55|overthink;can't stop thinking;ruminating;rumination;spiralling;spiraling;stuck in my head|Your mind looping the same thoughts round and round.
bewildered|~|confusion|surprise|-.25|.55|confused:.7,surprised:.3|.5|bewilderment;baffled;perplexed;mystified|Totally puzzled, unable to make sense of what's going on.
skepticism||confusion|disgust|-.2|.35|confused:.6,disgusted:.2,neutral:.2|.4|skeptical;sceptical;scepticism;unconvinced|Not buying it yet; wanting more proof before you believe.
reluctance||confusion|fear|-.3|.35|confused:.4,anxious:.4,bored:.2|.4|reluctant;unwilling;dragging my feet|Not wanting to, while feeling you might have to.
# ---------- boredom & apathy ----------
boredom||boredom||-.35|.1|bored:1|.4|bored;boring;nothing to do|A restless flatness when nothing feels worth your attention.
apathy||boredom|sadness|-.45|.05|bored:.6,neutral:.4|.5|apathetic;can't be bothered;couldn't care less|Not caring much either way, with little spark to do anything.
indifference||boredom||-.15|.05|neutral:.8,bored:.2|.35|indifferent;meh;don't mind;don't care|Neither drawn in nor bothered; it just doesn't land.
dullness||boredom||-.35|.05|bored:.7,exhausted:.3|.4|dull;bland;lacklustre;colourless|Everything feels muted and grey.
restlessness||boredom|fear|-.3|.7|bored:.5,anxious:.5|.45|restless;fidgety;antsy;itchy feet;can't sit still|Itchy, can't-settle energy that wants something to change.
disinterest||boredom||-.25|.1|bored:.8,neutral:.2|.35|disinterested;uninterested;not into it|Not drawn in; your attention keeps sliding off.
numbness||boredom|sadness|-.55|.05|neutral:.6,sad:.2,exhausted:.2|.55|numb;emotional numbness;feel nothing;can't feel anything;emotionally numb|Feelings seem switched off, as if behind glass.
fatigue||boredom|sadness|-.45|.05|exhausted:1|.55|tired;exhausted;exhaustion;weary;drained;knackered;wiped out;shattered|Running low on energy, body and mind asking to rest.
burnout||boredom|sadness,fear|-.7|.1|exhausted:.8,sad:.2|.7|burnt out;burned out;burnt-out;running on empty|Worn down from giving too much for too long.
flat|~|boredom|sadness|-.35|.05|neutral:.6,bored:.4|.4|blah;flatness;muted|Not bad exactly, just low, quiet and colourless.
ennui||boredom|sadness|-.4|.05|bored:.8,sad:.2|.45|world-weary;weltschmerz|A world-weary boredom where nothing quite satisfies.
unmotivated|~|boredom||-.4|.1|bored:.5,exhausted:.5|.45|no motivation;lack of motivation;demotivated;can't get going|Wanting to want to, but the get-up-and-go has gone.
lethargic|~|boredom|sadness|-.4|.05|exhausted:.8,bored:.2|.45|lethargy;sluggish;listless|Heavy and slow, like moving through syrup.
zoned-out|~Zoned out|boredom|confusion|-.15|.05|neutral:.6,bored:.4|.35|spaced out;switched off;on autopilot;checked out|Drifting on autopilot, not quite here.
depleted|~|boredom|sadness|-.55|.05|exhausted:.9,sad:.1|.6|running on fumes;worn out;spent;nothing left to give|Your reserves are scraped right to the bottom.
uninspired|~|boredom|curiosity|-.3|.15|bored:.8,neutral:.2|.4|no ideas;creatively blocked;creative block|The spark isn't there, and ideas won't come.
# ---------- desire & craving ----------
desire||desire||.4|.7|excited:.5,loved:.3,determined:.2|.6|wanting badly;long to|A strong pull toward something or someone you want.
craving||desire||.1|.7|excited:.5,frustrated:.3,hopeful:.2|.6|crave;cravings;jonesing|An insistent pull for a particular thing, right now.
yearning||desire|sadness,love|.05|.45|hopeful:.5,sad:.3,lonely:.2|.6|yearn;aching for;deep longing|A deep, reaching wish for something that feels far away.
lust||desire|love|.4|.85|loved:.5,excited:.5|.6|strong attraction;physical attraction;lustful|A strong physical attraction toward someone.
hunger||desire||-.1|.6|exhausted:.4,frustrated:.3,hopeful:.3|.5|hungry;starving;peckish|Your body, or your heart, asking to be fed.
ambition||desire|pride|.55|.7|determined:.8,hopeful:.2|.55|ambitious;aspiration;big plans|Wanting to reach high and make something of yourself.
drive||desire|pride|.55|.75|determined:.9,excited:.1|.55|driven;hungry for it;go-getter|An inner engine pushing you toward a goal.
wanting||desire||.2|.55|hopeful:.6,excited:.4|.45|wishing;wanting more|Reaching for something you don't have yet.
wanderlust||desire|curiosity|.5|.6|excited:.5,hopeful:.5|.5|itching to travel;travel bug|A pull to get out, roam and see somewhere new.
temptation||desire|shame|.05|.6|playful:.4,excited:.3,guilty:.3|.5|tempted;tempting;so tempted|Being pulled toward something you're not sure you should do.
urge||desire|fear|-.1|.75|excited:.4,anxious:.4,frustrated:.2|.55|urges;impulse;impulsive|A sudden, strong push to do something right now.
neediness||desire|loneliness|-.35|.55|lonely:.6,anxious:.4|.5|needy;clingy|Needing more closeness or reassurance than you're getting.
passion||desire|love|.7|.85|excited:.6,loved:.4|.65|passionate;fire in my belly|An intense, burning enthusiasm for something or someone.
burdened|~|sadness|fear|-.55|.35|exhausted:.6,sad:.4|.55|weight on my shoulders;carrying too much;overburdened|Carrying more than your share, and feeling the weight of it.
`;

const parseFace = (s) => {
  const out = {};
  for (const part of s.split(',')) {
    const [k, w] = part.split(':');
    out[k.trim()] = w === undefined ? 1 : parseFloat(w);
  }
  return out;
};

const deriveName = (id) => {
  const s = id.replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const EMOTIONS = ROWS.split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .map((line) => {
    const f = line.split('|');
    if (f.length !== 10) throw new Error(`emotions.js: bad row (${f.length} fields): ${line}`);
    const [id, rawName, family, also, valence, arousal, face, intensity, aliases, blurb] = f;
    const adjective = rawName.startsWith('~');
    const name = rawName.replace(/^~/, '') || deriveName(id);
    return {
      id,
      name,
      family,
      also: also ? also.split(',') : [],
      aliases: aliases ? aliases.split(';').map((a) => a.trim()).filter(Boolean) : [],
      blurb,
      valence: parseFloat(valence),
      arousal: parseFloat(arousal),
      face: parseFace(face),
      intensity: parseFloat(intensity),
      // Ready-made wording for sentences: "anger", "feeling stuck".
      phrase: adjective ? `feeling ${name.toLowerCase()}` : name.toLowerCase(),
    };
  });

export const ALL_EMOTION_IDS = EMOTIONS.map((e) => e.id);

const byId = new Map(EMOTIONS.map((e) => [e.id, e]));
const familyById = new Map(FAMILIES.map((f) => [f.id, f]));

export const getEmotion = (id) => byId.get(id) || null;
export const getFamily = (id) => familyById.get(id) || null;
export const emotionsByFamily = (familyId) => EMOTIONS.filter((e) => e.family === familyId);

// ---------- search ----------

/** Lowercase, strip diacritics and apostrophes, turn other punctuation into spaces. */
export function normalizeText(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’‘`']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const INDEX = EMOTIONS.map((e) => {
  const name = normalizeText(e.name);
  const idKey = normalizeText(e.id);
  const aliases = e.aliases.map(normalizeText);
  const words = new Set([name, ...aliases].flatMap((s) => s.split(' ')));
  return { e, name, idKey, aliases, words: [...words], blurb: normalizeText(e.blurb), root: familyById.has(e.id) };
});

/** Optimal-string-alignment distance (transpositions count as 1), bailing out above `max`. */
export function editDistance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length;
  const n = b.length;
  let prev2 = null;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[n];
}

const fuzzyMax = (len) => (len >= 7 ? 2 : len >= 4 ? 1 : 0);

// Tier numbers, highest wins.
export const SEARCH_TIERS = { exact: 7, namePrefix: 6, aliasExact: 5, aliasPrefix: 4, wordPrefix: 3, fuzzy: 2, blurb: 1 };

function scoreEntry(x, q, qMax) {
  if (x.name === q || x.idKey === q) return { tier: 7, matched: x.e.name };
  if (x.name.startsWith(q) || x.idKey.startsWith(q)) return { tier: 6, matched: x.e.name };
  let best = null;
  for (let i = 0; i < x.aliases.length; i++) {
    const a = x.aliases[i];
    if (a === q) return { tier: 5, matched: x.e.aliases[i] };
    if (!best && a.startsWith(q)) best = { tier: 4, matched: x.e.aliases[i] };
  }
  if (best) return best;
  for (const w of x.words) if (w.startsWith(q)) return { tier: 3, matched: w };
  if (q.includes(' ')) {
    for (const s of [x.name, ...x.aliases]) if ((' ' + s + ' ').includes(' ' + q)) return { tier: 3, matched: s };
  }
  if (qMax > 0) {
    let bestD = qMax + 1;
    let m = null;
    for (const s of [x.name, ...x.aliases, ...(q.includes(' ') ? [] : x.words)]) {
      const d = editDistance(q, s, qMax);
      if (d < bestD) { bestD = d; m = s; if (d === 1) break; }
    }
    if (m) return { tier: 2, matched: m, distance: bestD };
  }
  if (q.length >= 3 && x.blurb.includes(q)) return { tier: 1, matched: x.e.blurb };
  return null;
}

/**
 * Ranked search with match details: [{emotion, tier, matched, distance?}].
 * Ranking: exact name > name prefix > alias exact > alias prefix > word prefix > fuzzy > blurb.
 */
export function searchEmotionsDetailed(query, { limit = 20 } = {}) {
  const q = normalizeText(query);
  if (!q) return [];
  const qMax = fuzzyMax(q.length);
  const hits = [];
  for (const x of INDEX) {
    const s = scoreEntry(x, q, qMax);
    if (s) hits.push({ emotion: x.e, root: x.root, len: x.name.length, ...s });
  }
  hits.sort((a, b) =>
    b.tier - a.tier ||
    (a.distance ?? 0) - (b.distance ?? 0) ||
    Number(b.root) - Number(a.root) ||
    a.len - b.len ||
    a.emotion.name.localeCompare(b.emotion.name));
  return hits.slice(0, limit).map(({ emotion, tier, matched, distance }) => ({ emotion, tier, matched, ...(distance ? { distance } : {}) }));
}

/** Ranked search returning emotion objects. */
export function searchEmotions(query, { limit = 20 } = {}) {
  return searchEmotionsDetailed(query, { limit }).map((h) => h.emotion);
}

/** [{letter, emotions}] grouped by first letter of the display name, A–Z. */
export function azIndex() {
  const groups = new Map();
  for (const e of [...EMOTIONS].sort((a, b) => a.name.localeCompare(b.name))) {
    const letter = normalizeText(e.name).charAt(0).toUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(e);
  }
  return [...groups.keys()].sort().map((letter) => ({ letter, emotions: groups.get(letter) }));
}

/** Weighted average face of a family's members, used for similarity scoring. */
export function familyFace(familyId) {
  const acc = {};
  const members = emotionsByFamily(familyId);
  for (const e of members) for (const [k, w] of Object.entries(e.face)) acc[k] = (acc[k] || 0) + w / members.length;
  return acc;
}

/** Cosine similarity between two face maps (0..1). */
export function faceSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const [k, v] of Object.entries(a)) { na += v * v; if (b[k]) dot += v * b[k]; }
  for (const v of Object.values(b)) nb += v * v;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}
