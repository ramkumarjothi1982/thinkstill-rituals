/* 025 Not Just Me — Reframe · REFRAME · Identity / Self
 * Mechanism: common humanity, one of the three parts of self-compassion (Neff 2003; Neff & Germer 2013). When a painful
 * feeling reads as "something is wrong with me", seeing that many others have felt the same reframes it as part of being
 * human, which eases shame and isolation. Naming the feeling first (affect labelling; Lieberman et al. 2007) takes a little
 * heat out of it. The stadium and its fans are clearly made up and no statistics are shown, only "lots of people". When the
 * worry is well founded the game says so and offers a next step, not a pep talk.
 * Verb: pull (throw the main-lights lever, on the drum if you can), tap (the fan cam), spin (the world).
 * Twist: the sky cam rises out of the stadium until the whole night side of the Earth is lit.
 * Finale: the whole stadium does the wave, and the stands flip their lights to spell NOT JUST YOU.
 */
(function (env) {
  'use strict';

  /* ---------------- daily venues ---------------- */
  const VENUES = [
    { key: 'harbour', name: 'Harbour Bowl', led: 'HARBOUR BOWL', field: 'pitch', weather: 'clear', haze: '#ff9a5a', team: '#3fb6ff', home: [-33.9, 151.2], coast: 1 },
    { key: 'snow', name: 'Snowline Arena', led: 'SNOWLINE ARENA', field: 'ice', weather: 'snow', haze: '#9fd0ff', team: '#8fe3ff', home: [59.9, 10.7], coast: 0 },
    { key: 'oval', name: 'The Old Oval', led: 'THE OLD OVAL', field: 'oval', weather: 'clear', haze: '#ffcf7a', team: '#ffd36b', home: [-37.8, 145], coast: 0 },
    { key: 'neon', name: 'Neon Dome', led: 'NEON DOME', field: 'stage', weather: 'clear', haze: '#d76bff', team: '#ff6bd6', home: [35.7, 139.7], coast: 1 },
    { key: 'river', name: 'Riverside Park', led: 'RIVERSIDE PARK', field: 'track', weather: 'rain', haze: '#7fd6c9', team: '#5fe0b0', home: [51.5, -0.1], coast: 0 },
    { key: 'canyon', name: 'Red Rock Field', led: 'RED ROCK FIELD', field: 'pitch', weather: 'clear', haze: '#ff7a4a', team: '#ff8a4d', home: [33.4, -112], coast: 0 }
  ];

  /* ---------------- feelings (named on the big screen) ---------------- */
  const FAM = {
    worried: { label: 'Worried', led: 'WORRIED', re: /\b(anxious|anxiety|worr\w*|scared|nervous|afraid|panic\w*|dread\w*|fear\w*|stress\w*|on edge|terrified|tense)\b/i },
    embarrassed: { label: 'Embarrassed', led: 'EMBARRASSED', re: /\b(embarrass\w*|ashamed|shame\w*|awkward|humiliat\w*|mortif\w*|cringe\w*|self.conscious)\b/i },
    notenough: { label: 'Not enough', led: 'NOT ENOUGH', re: /\b(failure|failing|useless|incompetent|not good enough|inadequate|fraud|impost[eo]r|worthless|stupid|idiot|loser|pathetic|insecure|inferior)\b/i },
    leftout: { label: 'Left out', led: 'LEFT OUT', re: /\b(lonely|alone|left out|ignored|rejected|unwanted|excluded|ghosted|invisible|isolated|jealous)\b/i },
    guilty: { label: 'Guilty', led: 'GUILTY', re: /\b(guilt\w*|my fault|regret\w*|blame myself|selfish)\b/i },
    hurt: { label: 'Hurt', led: 'HURT', re: /\b(hurt|sad|upset|let down|disappoint\w*|crying|cried|heartbr\w*|betray\w*)\b/i },
    frustrated: { label: 'Frustrated', led: 'FRUSTRATED', re: /\b(angry|anger|frustrat\w*|annoyed|irritat\w*|furious|fuming|resent\w*|livid)\b/i },
    overwhelmed: { label: 'Overwhelmed', led: 'OVERWHELMED', re: /\b(overwhelm\w*|too much|swamped|drowning|exhausted|burnt out|burned out|burnout|so much to do)\b/i },
    uneasy: { label: 'Uneasy', led: 'UNEASY', re: /\b(uneasy|unsettled|uncomfortable|off)\b/i }
  };
  const FAM_ORDER = ['embarrassed', 'notenough', 'leftout', 'guilty', 'overwhelmed', 'frustrated', 'hurt', 'worried', 'uneasy'];
  const DOMS = [
    ['money', /\b(rent|landlord|lease|evict\w*|bills?|debt|money|bank|loan|mortgage|overdraft)\b/i],
    ['study', /\b(exam|test|grade|marks|teacher|lecturer|assignment|uni|university|school|essay|course)\b/i],
    ['work', /\b(boss|manager|supervisor|work|job|meeting|shift|colleague|client|promotion|fired|sacked|interview|office)\b/i],
    ['partner', /\b(partner|boyfriend|girlfriend|husband|wife|bf|gf|fianc\w*|dating|relationship)\b/i],
    ['family', /\b(mum|mom|dad|mother|father|sister|brother|family|parents?|aunt|uncle|cousin|grandma|grandpa)\b/i],
    ['reply', /\b(text|texted|message|messaged|email|emailed|reply|replied|answer\w*|respond\w*|read|seen|ghost\w*|dm)\b/i],
    ['social', /\b(presentation|speech|party|awkward|stumbled|froze|laughed|everyone saw|tripped|friends?|class)\b/i]
  ];
  const CHIPS = {
    work: ['worried', 'notenough', 'overwhelmed', 'embarrassed', 'guilty', 'frustrated'],
    study: ['worried', 'notenough', 'overwhelmed', 'embarrassed', 'frustrated', 'uneasy'],
    reply: ['leftout', 'worried', 'hurt', 'embarrassed', 'frustrated', 'uneasy'],
    partner: ['worried', 'hurt', 'leftout', 'guilty', 'frustrated', 'uneasy'],
    social: ['embarrassed', 'notenough', 'worried', 'leftout', 'guilty', 'uneasy'],
    family: ['hurt', 'guilty', 'frustrated', 'notenough', 'leftout', 'worried'],
    money: ['worried', 'overwhelmed', 'embarrassed', 'guilty', 'uneasy', 'frustrated'],
    none: ['worried', 'embarrassed', 'notenough', 'leftout', 'overwhelmed', 'guilty']
  };

  /* ---------------- the fans: made-up voices, an album that fills over visits (q = a quip, skipped for heavy days) ---------------- */
  const VOICES = {
    worried: [['w01', 'I felt that before my first shift. Shaky hands, the lot.'], ['w02', 'I once reread a two-line email forty times before bed.'], ['w03', 'My stomach does a drumroll before every big conversation.'],
      ['w04', 'I rehearsed the worst case all night. My brain loves a rehearsal.', 'q'], ['w05', 'Sunday evenings, every week. That knot. I know it well.'], ['w06', 'Waiting for news is my least favourite sport.', 'q'],
      ['w07', 'Mine turns up at 3am, right on schedule.'], ['w08', 'I’ve planned whole speeches for talks that never happened.'], ['w09', 'My mind writes disaster movies. Low budget, very convincing.', 'q'],
      ['w10', 'I’ve checked my phone a hundred times waiting for one message.'], ['w11', 'I sat in the car park for ten minutes before going in. Same feeling.']],
    embarrassed: [['e01', 'I waved back at someone who was waving at the person behind me.', 'q'], ['e02', 'I called my teacher ‘Mum’ in Year 9. I still think about it.', 'q'],
      ['e03', 'I froze mid-sentence in a meeting. Wanted the floor to swallow me.'], ['e04', 'I replayed one awkward joke for a week. Felt it every time.'], ['e05', 'I sent a message to the wrong group chat. My face went nuclear.'],
      ['e06', 'I tripped walking up for an award. Everyone saw. I survived.'], ['e07', 'I said ‘you too’ when the waiter said ‘enjoy your meal’.', 'q'], ['e08', 'I mispronounced a word in front of the whole class.'],
      ['e09', 'My face goes red just remembering that party.'], ['e10', 'I laughed way too loud at something that wasn’t a joke.']],
    notenough: [['n01', 'First month at a new job, I was sure they’d hired me by mistake.'], ['n02', 'I’ve felt like the only one who didn’t know what they were doing.'],
      ['n03', 'My inner critic has a season ticket. Never misses a game.', 'q'], ['n04', 'One bit of feedback and all I heard was ‘you’re terrible’.'], ['n05', 'Ten years in and some days I still feel like a fraud.'],
      ['n06', 'I thought everyone else got a manual that I missed.'], ['n07', 'One mistake and my brain hands me a full report on my flaws.'], ['n08', 'I compared my messy middle to everyone else’s highlights.'],
      ['n09', 'I didn’t apply for something because I didn’t feel ready.'], ['n10', 'I’ve called myself useless more times than I’d ever say to a friend.']],
    leftout: [['l01', 'I’ve watched a group chat go quiet and assumed it was about me.'], ['l02', 'I saw photos of a dinner I wasn’t invited to. It stung.'], ['l03', 'I ate lunch alone for a month at a new school.'],
      ['l04', 'I’ve felt lonely in a room full of people.'], ['l05', 'I moved cities and didn’t hear my name out loud for days.'], ['l06', 'I waited three days for a reply. It felt like three years.'],
      ['l07', 'I hovered at the edge of a conversation, looking for a gap.'], ['l08', 'My friends were all busy and my brain said ‘they’re done with you’.'], ['l09', 'I’ve felt like an extra in everyone else’s story.'],
      ['l10', 'I’ve refreshed my messages like it was a scoreboard.', 'q']],
    guilty: [['g01', 'I snapped at someone I love and felt sick about it all night.'], ['g02', 'I forgot a close friend’s birthday. I still wince.'], ['g03', 'I let a teammate down once and replayed it for months.'],
      ['g04', 'I said no to helping, then felt guilty all weekend.'], ['g05', 'I’ve apologised three times for the same small thing.'], ['g06', 'I cancelled plans to rest, then spent the rest feeling bad.'],
      ['g07', 'I made a mistake that cost someone time. I owned it. Still stung.'], ['g08', 'I’ve lain awake listing everything I should have done.'], ['g09', 'I felt guilty for having a good day when a friend wasn’t.'],
      ['g10', 'My guilt arrives early and stays for the whole match.', 'q']],
    hurt: [['h01', 'Someone I trusted said something careless. It stayed with me.'], ['h02', 'I got a ‘k’ in reply to a long message. Ouch.'], ['h03', 'I’ve cried in the car before walking into work.'],
      ['h04', 'I put my heart into something and nobody seemed to notice.'], ['h05', 'A friend cancelled again and I felt silly for being excited.'], ['h06', 'I overheard a comment about me that wasn’t meant for me.'],
      ['h07', 'I felt let down by someone I’d have done anything for.'], ['h08', 'I smiled through a whole day that hurt.'], ['h09', 'One sentence from the right person can flatten me for a day.'],
      ['h10', 'I waited for an apology that never came. It sat with me for ages.']],
    frustrated: [['f01', 'I wrote a furious email, deleted it, and wrote a calm one.'], ['f02', 'I’ve been so annoyed I cleaned the entire kitchen.', 'q'], ['f03', 'I lost it over a missing sock. It wasn’t about the sock.', 'q'],
      ['f04', 'I felt unheard in a meeting and fumed the whole way home.'], ['f05', 'I’ve argued with someone in the shower. They weren’t there.', 'q'], ['f06', 'A bad day plus traffic turned me into a boiling kettle.'],
      ['f07', 'I’ve explained the same thing four times and wanted to scream.'], ['f08', 'I was angry, then angry that I was angry.'], ['f09', 'I’ve felt the heat in my face before I could even speak.'],
      ['f10', 'I walked around the block twice before I could talk.']],
    overwhelmed: [['o01', 'My to-do list once had ‘make a to-do list’ on it.', 'q'], ['o02', 'I’ve sat in the car for ten minutes just to breathe.'], ['o03', 'Too many tabs open. In my browser and in my head.'],
      ['o04', 'I cried over a full inbox, then answered one email.'], ['o05', 'I’ve said ‘I’m fine’ while juggling about nine things.'], ['o06', 'Some weeks even choosing dinner feels like too much.'],
      ['o07', 'I froze in the supermarket because there were too many choices.'], ['o08', 'Everything felt urgent, so I did nothing for an hour.'], ['o09', 'My brain had forty things open and none of them would close.'],
      ['o10', 'I’ve stared at my list until the words went blurry.']],
    uneasy: [['u01', 'I’ve had that ‘something’s off’ feeling and couldn’t name it.'], ['u02', 'Same here. It sits on your chest some days.'], ['u03', 'I’ve carried that one around. Heavy. Very human.'],
      ['u04', 'I felt it last week. Saying it out loud made it lighter.'], ['u05', 'That knot in your stomach? I’ve got one in my collection too.', 'q'], ['u06', 'I’ve had days where everything felt slightly wrong.'],
      ['u07', 'I couldn’t explain it to anyone, but I felt it.'], ['u08', 'I’ve paced my kitchen with that exact feeling.'], ['u09', 'Felt it on a Tuesday for no reason at all.'],
      ['u10', 'I thought I was the only one. Then I asked around.']]
  };
  const DOM_VOICES = {
    work: [['dw1', 'My boss once sent ‘got a minute?’ and I drafted a goodbye speech.'], ['dw2', 'I’ve reread a work email until the words stopped being words.'], ['dw3', 'Every new job, I’ve felt like the new kid at school.'],
      ['dw4', 'I had a rough review and still had to sit at my desk after.'], ['dw5', 'I’ve walked into a meeting with my heart going like a drum.']],
    reply: [['dr1', 'I’ve stared at ‘Seen’ for an hour while my tea went cold.'], ['dr2', 'I typed, deleted and retyped one text for twenty minutes.'], ['dr3', 'I’ve checked my phone was working because nobody replied.'],
      ['dr4', 'I’ve read a short reply and heard a whole tone in it.'], ['dr5', 'Three dots appeared, then vanished. I felt that one.']],
    partner: [['dp1', 'My partner went quiet once and my brain wrote a whole novel.'], ['dp2', 'I’ve lain awake next to someone, wondering what they were thinking.'], ['dp3', 'One cold evening and I was sure something was over.'],
      ['dp4', 'I’ve asked ‘are we okay?’ with my heart in my throat.'], ['dp5', 'Love makes small silences sound very loud.']],
    social: [['ds1', 'I gave a talk and my voice shook the whole way through.'], ['ds2', 'I replayed one moment from a party for a month.'], ['ds3', 'I’ve walked into a room of strangers and wanted to walk straight out.'],
      ['ds4', 'I lost my words in front of everyone. My cheeks burned for hours.'], ['ds5', 'I’ve been sure everyone was staring. Felt it for days.']],
    family: [['df1', 'One comment from family can undo me faster than anything.'], ['df2', 'I’ve left a family dinner and cried in the car.'], ['df3', 'My mum can say three words that land like thirty.'],
      ['df4', 'I’ve felt about twelve years old again at a family lunch.'], ['df5', 'Family knows exactly where the old bruises are.']],
    money: [['dm1', 'I’ve opened a bill and felt my heart drop to my shoes.'], ['dm2', 'I’ve lain awake doing money maths in the dark.'], ['dm3', 'I’ve hidden a letter in a drawer because I couldn’t face it.'],
      ['dm4', 'I asked for help with money once. Hardest call I ever made.'], ['dm5', 'Checking my balance used to make my hands sweat.']],
    study: [['dt1', 'I’ve stared at an exam paper while my mind went blank.'], ['dt2', 'I checked my results with one eye closed.'], ['dt3', 'I was sure everyone in the class understood except me.'],
      ['dt4', 'I’ve handed in work and spent the night regretting every line.'], ['dt5', 'Results day once made me feel sick with nerves.']]
  };
  const VOICE_COUNT = Object.values(VOICES).concat(Object.values(DOM_VOICES)).reduce((n, a) => n + a.length, 0);

  /* ---------------- a 5×7 dot font for the big screen and the card stunt ---------------- */
  const GLYPH = {
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31],
    F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12],
    K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31], M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14],
    P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
    U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17], Y: [17, 17, 10, 4, 4, 4, 4],
    Z: [31, 1, 2, 4, 8, 16, 31], 0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14],
    4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
    '.': [0, 0, 0, 0, 0, 12, 12], '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4], '-': [0, 0, 0, 14, 0, 0, 0], '’': [4, 4, 8, 0, 0, 0, 0], '\'': [4, 4, 8, 0, 0, 0, 0],
    ':': [0, 12, 12, 0, 12, 12, 0], '/': [1, 1, 2, 4, 8, 16, 16], '·': [0, 0, 0, 4, 0, 0, 0], '♥': [10, 31, 31, 31, 14, 4, 0], '&': [12, 18, 20, 8, 21, 18, 13]
  };
  const TRIM = '.!’\':·';
  function glyphCols(ch) {
    if (ch === ' ') return [0, 0, 0];
    const gl = GLYPH[ch] || GLYPH[String(ch).toUpperCase()] || GLYPH['?'];
    let cols = [0, 1, 2, 3, 4].map(c => { let m = 0; for (let r = 0; r < 7; r++) if ((gl[r] >> (4 - c)) & 1) m |= 1 << r; return m; });
    if (TRIM.includes(ch)) { while (cols.length > 1 && !cols[0]) cols.shift(); while (cols.length > 1 && !cols[cols.length - 1]) cols.pop(); }
    return cols;
  }
  function textCols(s) { const out = []; Array.from(String(s || '')).forEach((ch, i) => { if (i) out.push(0); out.push(...glyphCols(ch)); }); return out; }

  /* ---------------- the world from space: coarse continents and city clusters ([lon, lat]) ---------------- */
  const LAND = [
    [[-166, 68], [-156, 71], [-140, 70], [-128, 70], [-115, 68], [-95, 72], [-82, 73], [-80, 63], [-90, 58], [-82, 52], [-78, 58], [-70, 60], [-62, 58], [-56, 52], [-60, 47], [-66, 44], [-70, 42], [-74, 40], [-76, 35], [-81, 31], [-80, 26], [-82, 25], [-83, 29], [-89, 30], [-94, 29], [-97, 26], [-97, 22], [-92, 18], [-87, 21], [-88, 16], [-84, 15], [-83, 10], [-79, 9], [-77, 8], [-80, 7], [-85, 10], [-87, 13], [-92, 15], [-96, 16], [-105, 20], [-106, 23], [-110, 24], [-112, 29], [-115, 30], [-117, 33], [-121, 35], [-124, 40], [-124, 46], [-125, 49], [-130, 54], [-136, 58], [-145, 60], [-152, 59], [-158, 56], [-165, 55], [-160, 59], [-165, 62], [-168, 65]],
    [[-55, 60], [-45, 60], [-40, 65], [-22, 70], [-20, 77], [-30, 83], [-60, 82], [-72, 78], [-58, 75], [-52, 68]],
    [[-77, 8], [-72, 12], [-63, 11], [-55, 6], [-50, 1], [-44, -2], [-35, -6], [-37, -12], [-39, -18], [-41, -22], [-48, -26], [-49, -29], [-53, -34], [-57, -36], [-58, -39], [-62, -40], [-65, -42], [-66, -47], [-69, -51], [-71, -54], [-74, -50], [-75, -44], [-73, -38], [-71, -30], [-70, -23], [-70, -18], [-76, -14], [-79, -8], [-81, -5], [-80, -1], [-79, 3]],
    [[-9, 36], [-9, 44], [-1, 44], [-4, 48], [-1, 49], [2, 51], [8, 54], [10, 57], [12, 56], [20, 55], [24, 58], [28, 60], [30, 62], [34, 66], [40, 68], [44, 68], [54, 69], [60, 70], [70, 73], [80, 73], [90, 76], [105, 78], [115, 74], [130, 72], [140, 72], [150, 71], [160, 70], [170, 70], [179, 68], [179, 65], [175, 62], [165, 60], [162, 57], [156, 51], [156, 57], [150, 59], [142, 59], [137, 54], [140, 48], [135, 43], [130, 42], [129, 36], [127, 35], [126, 38], [122, 40], [121, 37], [119, 35], [121, 31], [122, 28], [119, 25], [116, 23], [111, 21], [108, 22], [106, 18], [109, 15], [109, 11], [105, 9], [103, 10], [100, 13], [100, 8], [103, 3], [101, 2], [98, 8], [98, 15], [95, 17], [94, 21], [91, 22], [88, 22], [86, 20], [80, 15], [80, 10], [77, 8], [73, 16], [72, 21], [69, 23], [67, 25], [62, 25], [57, 26], [56, 24], [59, 22], [55, 17], [52, 16], [45, 13], [43, 15], [39, 22], [35, 28], [34, 31], [35, 36], [30, 36], [27, 37], [26, 40], [23, 40], [22, 37], [21, 40], [19, 42], [16, 41], [18, 40], [16, 38], [15, 40], [12, 44], [13, 45], [9, 44], [6, 43], [3, 43], [3, 42], [0, 40], [-1, 37], [-5, 36]],
    [[5, 58], [6, 62], [10, 64], [14, 68], [18, 70], [26, 71], [30, 70], [28, 66], [24, 65], [22, 62], [18, 60], [18, 57], [13, 56], [10, 58]],
    [[-6, 50], [1, 51], [2, 53], [-1, 55], [-2, 57], [-4, 59], [-6, 58], [-5, 55], [-3, 54], [-5, 52]], [[-10, 52], [-6, 52], [-6, 55], [-8, 55], [-10, 54]], [[-24, 64], [-14, 64], [-14, 66], [-22, 66.5]],
    [[-17, 21], [-16, 27], [-13, 28], [-9, 32], [-6, 36], [10, 37], [11, 34], [20, 31], [25, 32], [32, 31], [34, 28], [37, 22], [39, 16], [43, 12], [51, 12], [48, 5], [42, -1], [40, -5], [40, -11], [37, -18], [35, -24], [33, -27], [29, -33], [25, -34], [20, -35], [18, -32], [15, -26], [12, -18], [13, -12], [12, -5], [9, -1], [9, 4], [5, 5], [-2, 5], [-8, 4], [-12, 7], [-15, 11], [-17, 15]],
    [[44, -25], [47, -25], [50, -16], [49, -12], [47, -15], [44, -18]],
    [[114, -22], [114, -27], [115, -34], [118, -35], [123, -34], [126, -32], [131, -31], [134, -33], [138, -35], [140, -38], [146, -39], [150, -37], [153, -32], [153, -25], [150, -22], [147, -19], [145, -15], [143, -11], [141, -13], [140, -17], [137, -16], [136, -12], [131, -11], [129, -15], [126, -14], [122, -17], [120, -20]],
    [[145, -41], [148, -41], [148, -43], [146, -43.5]], [[166, -46], [170, -46], [174, -41], [175, -37], [178, -38], [176, -41], [172, -43], [168, -47]],
    [[130, 31], [132, 34], [135, 34], [138, 35], [141, 38], [142, 43], [145, 44], [141, 45], [140, 41], [137, 37], [133, 35]],
    [[95, 5], [98, 4], [104, -2], [106, -6], [102, -4], [96, 2]], [[105, -6], [114, -7], [114, -8.5], [106, -7.5]], [[109, 1], [110, -3], [116, -4], [119, 1], [117, 7], [113, 4]],
    [[131, -1], [138, -2], [145, -5], [150, -10], [143, -9], [138, -8], [132, -4]], [[120, 18], [122, 18], [124, 12], [126, 7], [124, 6], [122, 10], [120, 14]],
    [[80, 10], [82, 7], [81, 6], [80, 7]], [[120, 22], [121.5, 25], [122, 24], [121, 22]], [[-85, 22], [-80, 23], [-75, 20], [-78, 20], [-82, 22]]
  ];
  const CITIES = [[-74, 40.7, 3], [-118.2, 34, 3], [-87.6, 41.9, 2], [-95.4, 29.8, 2], [-80.2, 25.8, 1.5], [-122.4, 37.8, 2], [-77, 38.9, 2], [-71, 42.4, 1.5], [-79.4, 43.7, 2], [-73.6, 45.5, 1.5],
    [-123.1, 49.3, 1.5], [-99.1, 19.4, 3], [-103.3, 20.7, 1.5], [-46.6, -23.5, 3], [-43.2, -22.9, 2.5], [-58.4, -34.6, 2.5], [-70.7, -33.4, 2], [-77, -12, 2], [-74.1, 4.7, 2], [-66.9, 10.5, 1.5],
    [-0.1, 51.5, 3], [2.35, 48.9, 3], [-3.7, 40.4, 2], [2.2, 41.4, 1.5], [13.4, 52.5, 2], [12.5, 41.9, 2], [9.2, 45.5, 2], [4.9, 52.4, 2], [16.4, 48.2, 1.5], [21, 52.2, 1.5], [37.6, 55.8, 3],
    [30.3, 59.9, 2], [30.5, 50.5, 2], [29, 41, 3], [31.2, 30, 3], [3.4, 6.5, 3], [-0.2, 5.6, 1.5], [15.3, -4.3, 2], [36.8, -1.3, 2], [38.7, 9, 2], [28, -26.2, 2.5], [18.4, -33.9, 1.5], [-7.6, 33.6, 1.5],
    [46.7, 24.7, 2], [55.3, 25.3, 2], [51.4, 35.7, 3], [44.4, 33.3, 2], [67, 24.9, 3], [74.3, 31.5, 2.5], [77.2, 28.6, 3], [72.9, 19, 3], [88.4, 22.6, 3], [90.4, 23.8, 3], [80.3, 13, 2.5], [77.6, 13, 2.5],
    [78.5, 17.4, 2], [100.5, 13.8, 3], [106.7, 10.8, 2.5], [105.8, 21, 2], [106.8, -6.2, 3], [110.4, -7, 2], [112.7, -7.3, 2], [103.8, 1.35, 2], [101.7, 3.1, 2], [121, 14.6, 3], [121.5, 31.2, 3],
    [116.4, 39.9, 3], [113.3, 23.1, 3], [114.1, 22.4, 2], [104.1, 30.7, 2.5], [108.9, 34.3, 2], [114.3, 30.6, 2.5], [117.2, 39.1, 2], [127, 37.6, 3], [139.7, 35.7, 3], [135.5, 34.7, 2.5],
    [151.2, -33.9, 2], [145, -37.8, 2], [153, -27.5, 1.5], [115.9, -32, 1.2], [138.6, -34.9, 1.2], [174.8, -36.8, 1.2], [-157.8, 21.3, 0.8], [-149.9, 61.2, 0.6], [-21.9, 64.1, 0.6], [18.1, 59.3, 1.2],
    [10.75, 59.9, 1], [24.9, 60.2, 1], [-9.1, 38.7, 1.5], [23.7, 38, 1.5], [35.2, 31.8, 1.5], [32.9, 39.9, 1.5], [69.2, 41.3, 1.5], [76.9, 43.2, 1.2], [-34.9, -8, 1.5], [-38.5, -3.7, 1.5],
    [-47.9, -15.8, 1.5], [-56.2, -34.9, 1], [-104.9, 39.7, 1.2], [-112, 33.4, 1.5], [-84.4, 33.7, 1.8], [-90.2, 38.6, 1.2], [-97, 32.8, 2], [-75.2, 40, 1.8]];

  const LED_FONT = "'Saira Extra Condensed', 'Arial Narrow', 'TeX Gyre Heros Cn', 'DejaVu Sans Condensed', sans-serif";

  (env.games = env.games || []).push({
    id: 'not-just-me', mode: 'reframe', name: 'Not Just Me', verb: 'pull', family: 'REFRAME', minutes: 2,
    parents: ['Identity / Self', 'Social / Team / Perspective', 'Emotion'],
    cast: ['patch', 'drop', 'sync'], poster: { char: 'patch', mood: 'hug' },
    fonts: ['Graduate', 'Saira+Extra+Condensed:wght@600;800'],
    tagline: 'Pull the big lever. Watch a whole stadium light up for your feeling.',
    why: 'For “something’s wrong with me”: light up everyone who has felt it too.',
    css: `
.g-not-just-me { --njm-gold: #ffc94d; --njm-coral: #ff6f91; --njm-led: #ffcf5a;
  --njm-display: 'Graduate', 'Rockwell', 'Roboto Slab', 'DejaVu Serif Condensed', Georgia, serif;
  --njm-cond: 'Saira Extra Condensed', 'Arial Narrow', 'TeX Gyre Heros Cn', 'DejaVu Sans Condensed', sans-serif; }
.g-not-just-me .njm-fx { z-index: 2; }
.g-not-just-me .njm-hit { position: absolute; inset: 0; z-index: 4; touch-action: none; }
.g-not-just-me .njm-jumbo { position: absolute; z-index: 20; display: flex; flex-direction: column; padding: 7px 7px 8px; border-radius: 16px;
  background: linear-gradient(180deg, #2f3749 0%, #1a2030 55%, #121620 100%); box-shadow: 0 0 0 1.5px rgba(255, 255, 255, .07), 0 20px 44px rgba(0, 0, 0, .55), inset 0 1px 0 rgba(255, 255, 255, .14);
  transition: opacity .6s ease, transform .7s cubic-bezier(.2, .9, .3, 1); }
.g-not-just-me .njm-jumbo.away { opacity: 0; transform: translateY(-30px) scale(.96); pointer-events: none; }
.g-not-just-me .njm-screen { position: relative; border-radius: 10px; background: radial-gradient(120% 140% at 50% 0%, #10141f 0%, #05070c 70%); overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .06), inset 0 0 30px rgba(0, 0, 0, .85); }
.g-not-just-me .njm-screen::after { content: ""; position: absolute; inset: 0; pointer-events: none; border-radius: 10px;
  background: repeating-linear-gradient(0deg, rgba(255, 255, 255, .025) 0 1px, transparent 1px 3px), linear-gradient(180deg, rgba(255, 255, 255, .05), transparent 30%); }
.g-not-just-me .njm-led { display: block; width: 100%; }
.g-not-just-me .njm-body { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 2px 14px 12px; text-align: center; color: #fff3d6; }
.g-not-just-me .njm-body.swap { animation: not-just-me-swap .5s cubic-bezier(.2, 1.2, .4, 1) backwards; }
@keyframes not-just-me-swap { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.g-not-just-me .njm-label { font: 800 13px/1.15 var(--njm-cond); letter-spacing: .16em; text-transform: uppercase; color: var(--njm-led); }
.g-not-just-me .njm-quote { margin: 0; font: 600 16px/1.32 var(--font-ui); color: #fff; text-wrap: balance; max-width: 34ch; }
.g-not-just-me .njm-quote.gk-user { font-size: 17px; }
.g-not-just-me .njm-cap { font: 500 13px/1.32 var(--font-ui); color: #c6cfe4; text-wrap: balance; max-width: 38ch; }
.g-not-just-me .njm-cap b { color: #ffe39a; font-weight: 700; }
.g-not-just-me .njm-attrib { font: 600 12px/1.2 var(--font-ui); color: #9fb0d0; letter-spacing: .03em; }
.g-not-just-me .njm-fan { display: grid; grid-template-columns: 46px 1fr; gap: 10px; align-items: center; text-align: left; width: 100%; max-width: 440px; }
.g-not-just-me .njm-fan svg { width: 46px; height: 46px; border-radius: 50%; box-shadow: 0 0 0 2px rgba(255, 207, 90, .55), 0 0 16px rgba(255, 207, 90, .35); }
.g-not-just-me .njm-fan .njm-quote { text-wrap: pretty; }
.g-not-just-me .njm-meter { display: flex; gap: 3px; justify-content: center; }
.g-not-just-me .njm-meter i { width: 12px; height: 7px; border-radius: 2px; background: rgba(255, 207, 90, .14); }
.g-not-just-me .njm-meter i.on { background: var(--njm-led); box-shadow: 0 0 6px rgba(255, 207, 90, .8); }
.g-not-just-me .njm-pads { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; width: 100%; margin-top: 2px; }
.g-not-just-me .njm-pad { appearance: none; position: relative; min-height: 48px; padding: 6px 3px; border-radius: 11px; cursor: pointer; color: #ffe6a8; 
  font: 800 15px/1.05 var(--njm-cond); letter-spacing: .01em; text-transform: uppercase; background: linear-gradient(180deg, #1a2030, #10141e);
  border: 1.5px solid rgba(255, 207, 90, .42); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .08), 0 4px 0 #070a10; transition: transform .12s ease, box-shadow .2s ease, background .2s ease;
  animation: not-just-me-swap .4s cubic-bezier(.2, 1.3, .4, 1) backwards; }
.g-not-just-me .njm-pad:nth-child(2) { animation-delay: .05s; } .g-not-just-me .njm-pad:nth-child(3) { animation-delay: .1s; }
.g-not-just-me .njm-pad:nth-child(4) { animation-delay: .15s; } .g-not-just-me .njm-pad:nth-child(5) { animation-delay: .2s; } .g-not-just-me .njm-pad:nth-child(6) { animation-delay: .25s; }
.g-not-just-me .njm-pad.njm-long { font-size: 13px; }
.g-not-just-me .njm-pad small { display: block; margin-top: 3px; font: 700 12px/1 var(--font-ui); letter-spacing: .02em; text-transform: none; color: #ff9fb6; }
.g-not-just-me .njm-pad:active { transform: translateY(3px); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .08), 0 1px 0 #070a10; }
.g-not-just-me .njm-pad.on { color: #1a1206; background: linear-gradient(180deg, #ffe08a, #ffb83a); border-color: #fff0c2; box-shadow: 0 0 0 3px rgba(255, 207, 90, .35), 0 0 24px rgba(255, 190, 70, .7), 0 4px 0 #8a5a10; }
.g-not-just-me .njm-pad.on small { color: #7a2a3a; }
.g-not-just-me .njm-pad:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
.g-not-just-me .njm-lever { position: absolute; z-index: 22; touch-action: none; cursor: grab; transition: transform .7s cubic-bezier(.2, .9, .3, 1), opacity .5s ease; }
.g-not-just-me .njm-lever.away { transform: translateY(115%); opacity: 0; pointer-events: none; }
.g-not-just-me .njm-lever:focus-visible { outline: 3px dashed #ffd36b; outline-offset: 5px; }
.g-not-just-me .njm-plate { position: absolute; inset: 0; border-radius: 18px;
  background: radial-gradient(circle at 12px 12px, #8d97ab 0 2.5px, transparent 3.5px), radial-gradient(circle at calc(100% - 12px) 12px, #8d97ab 0 2.5px, transparent 3.5px),
    radial-gradient(circle at 12px calc(100% - 12px), #8d97ab 0 2.5px, transparent 3.5px), radial-gradient(circle at calc(100% - 12px) calc(100% - 12px), #8d97ab 0 2.5px, transparent 3.5px),
    linear-gradient(160deg, #57627a 0%, #343c4f 38%, #222837 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .25), inset 0 -2px 0 rgba(0, 0, 0, .35), 0 14px 30px rgba(0, 0, 0, .5); }
.g-not-just-me .njm-title { position: absolute; left: 4px; right: 4px; top: 12px; text-align: center; font: 800 12px/1 var(--njm-cond); letter-spacing: .06em; color: #dfe5f2; text-shadow: 0 1px 0 rgba(0, 0, 0, .5); white-space: nowrap; overflow: hidden; }
.g-not-just-me .njm-lamp { position: absolute; left: 50%; top: 29px; width: 12px; height: 12px; margin-left: -6px; border-radius: 50%; background: #4a2028; box-shadow: inset 0 1px 2px rgba(0, 0, 0, .6); }
.g-not-just-me .njm-lever.ready .njm-lamp { background: radial-gradient(circle at 40% 35%, #eaffef, #48e08a 60%, #1c8a4a); box-shadow: 0 0 calc(6px + var(--beat, 0) * 14px) rgba(80, 255, 150, calc(.5 + var(--beat, 0) * .5)); }
.g-not-just-me .njm-slot { position: absolute; left: 50%; width: 16px; margin-left: -8px; border-radius: 8px; background: #06080d; box-shadow: inset 0 2px 5px rgba(0, 0, 0, .9), 0 1px 0 rgba(255, 255, 255, .12); overflow: hidden; }
.g-not-just-me .njm-slot::after { content: ""; position: absolute; left: 3px; right: 3px; top: 0; height: calc(var(--k, 0) * 100%); border-radius: 6px; background: linear-gradient(180deg, rgba(255, 207, 90, .2), #ffcf5a); box-shadow: 0 0 10px #ffcf5a; }
.g-not-just-me .njm-ticks { position: absolute; left: 50%; width: 46px; margin-left: -23px; pointer-events: none;
  background: repeating-linear-gradient(180deg, rgba(255, 255, 255, .28) 0 2px, transparent 2px 100%) left / 10px 20% repeat-y, repeating-linear-gradient(180deg, rgba(255, 255, 255, .28) 0 2px, transparent 2px 100%) right / 10px 20% repeat-y; }
.g-not-just-me .njm-mode { position: absolute; left: 8px; right: 8px; bottom: 11px; padding: 6px 2px 5px; border-radius: 7px; text-align: center; background: #07090e; color: var(--njm-led);
  font: 800 14px/1 var(--njm-cond); letter-spacing: .04em; box-shadow: inset 0 0 0 1px rgba(255, 207, 90, .25), inset 0 0 12px rgba(0, 0, 0, .9); text-shadow: 0 0 8px rgba(255, 207, 90, .7); white-space: nowrap; overflow: hidden; }
.g-not-just-me .njm-handle { position: absolute; left: -7px; right: -7px; height: 44px; transform: translateY(var(--y, 0px)); pointer-events: none; }
.g-not-just-me .njm-rod { position: absolute; left: 50%; top: 14px; width: 12px; height: 16px; margin-left: -6px; background: linear-gradient(90deg, #6d7686, #f1f4fa 45%, #8b94a5); border-radius: 3px; }
.g-not-just-me .njm-grip { position: absolute; left: 0; right: 0; top: 0; height: 40px; border-radius: 20px; display: grid; place-items: center;
  background: linear-gradient(180deg, #ff8a8a 0%, #e8324e 38%, #b3122f 70%, #7e0b20 100%); box-shadow: inset 0 2px 0 rgba(255, 255, 255, .45), inset 0 -3px 0 rgba(0, 0, 0, .3), 0 8px 14px rgba(0, 0, 0, .45);
  font: 800 13px/1 var(--njm-cond); letter-spacing: .2em; color: #ffe9ec; text-shadow: 0 1px 0 rgba(90, 0, 20, .7); }
.g-not-just-me .njm-lever.ready .njm-grip { animation: not-just-me-ready 1.3s ease-in-out infinite; }
@keyframes not-just-me-ready { 0%, 100% { box-shadow: inset 0 2px 0 rgba(255, 255, 255, .45), inset 0 -3px 0 rgba(0, 0, 0, .3), 0 8px 14px rgba(0, 0, 0, .45); } 50% { box-shadow: inset 0 2px 0 rgba(255, 255, 255, .45), inset 0 -3px 0 rgba(0, 0, 0, .3), 0 8px 14px rgba(0, 0, 0, .45), 0 0 22px rgba(255, 90, 110, .85); } }
.g-not-just-me .njm-camw { position: absolute; z-index: 18; left: 0; top: 0; width: 0; height: 0; }
.g-not-just-me .njm-cam { position: absolute; left: -26px; top: -26px; width: 52px; height: 52px; border-radius: 50%; border: 0; padding: 0; cursor: pointer;
  background: radial-gradient(circle, rgba(255, 255, 255, .95) 0 5px, rgba(255, 111, 145, .9) 6px 9px, rgba(255, 111, 145, .25) 10px 100%); box-shadow: 0 0 0 2px #fff, 0 0 18px rgba(255, 111, 145, .9);
  animation: not-just-me-cam 1.1s ease-in-out infinite; }
.g-not-just-me .njm-cam::after { content: ""; position: absolute; inset: -8px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, .8); animation: not-just-me-ring 1.1s ease-out infinite; }
.g-not-just-me .njm-cam.done { animation: none; opacity: 0; transform: scale(.4); transition: opacity .35s ease, transform .35s ease; pointer-events: none; }
@keyframes not-just-me-cam { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
@keyframes not-just-me-ring { from { transform: scale(.6); opacity: 1; } to { transform: scale(1.5); opacity: 0; } }
.g-not-just-me .njm-cam:focus-visible { outline: 3px solid #fff; outline-offset: 4px; }
.g-not-just-me .njm-you { position: absolute; z-index: 16; left: 0; top: 0; pointer-events: none; transform: translate(-50%, -100%); padding: 4px 9px 3px; border-radius: 999px;
  background: var(--njm-coral); color: #fff; font: 800 13px/1 var(--njm-cond); letter-spacing: .14em; box-shadow: 0 4px 12px rgba(0, 0, 0, .45), 0 0 14px rgba(255, 111, 145, .6); transition: opacity .4s ease; white-space: nowrap; }
.g-not-just-me .njm-you::after { content: ""; position: absolute; left: 50%; bottom: -5px; width: 10px; height: 10px; margin-left: -5px; background: inherit; transform: rotate(45deg); border-radius: 2px; z-index: -1; }
.g-not-just-me .njm-you.off { opacity: 0; }
.g-not-just-me .njm-space { position: absolute; z-index: 21; left: 50%; transform: translateX(-50%); width: min(420px, calc(100% - 32px)); text-align: center; pointer-events: none;
  display: flex; flex-direction: column; align-items: center; gap: 4px; transition: opacity .7s ease; }
.g-not-just-me .njm-space.off { opacity: 0; }
.g-not-just-me .njm-space small { font: 800 13px/1 var(--njm-cond); letter-spacing: .22em; color: #9fd0ff; }
.g-not-just-me .njm-space b { font: 400 clamp(26px, 8cqw, 40px)/1.05 var(--njm-display); color: #fff; text-shadow: 0 2px 18px rgba(80, 140, 255, .5); }
.g-not-just-me .njm-space span { font: 500 14px/1.35 var(--font-ui); color: #c9d6f2; text-wrap: balance; max-width: 34ch; }
.g-not-just-me .njm-c.gk-side-above .gk-bubble { left: var(--bl, 0px); max-width: var(--bw, 260px); }
.g-not-just-me .njm-pop { position: absolute; z-index: 24; left: 0; top: 0; pointer-events: none; transform: translate(-50%, -50%); white-space: nowrap;
  font: 400 22px/1 var(--njm-display); color: #ffe27a; text-shadow: 0 2px 0 #5a2a00, 0 0 18px rgba(255, 190, 60, .8); animation: not-just-me-pop 1.1s ease-out forwards; }
@keyframes not-just-me-pop { 0% { opacity: 0; transform: translate(-50%, -30%) scale(.7); } 18% { opacity: 1; transform: translate(-50%, -50%) scale(1.12); } 70% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -110%) scale(1); } }
.g-not-just-me.njm-wide .njm-quote { font-size: 18px; } .g-not-just-me.njm-wide .njm-quote.gk-user { font-size: 19px; }
.g-not-just-me.njm-wide .njm-cap { font-size: 14px; } .g-not-just-me.njm-wide .njm-label { font-size: 14px; }
.g-not-just-me.njm-wide .njm-pads { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
.g-not-just-me.njm-wide .njm-pad, .g-not-just-me.njm-wide .njm-pad.njm-long { min-height: 52px; font-size: 19px; letter-spacing: .04em; }
.g-not-just-me.njm-wide .njm-title { font-size: 15px; top: 16px; letter-spacing: .1em; } .g-not-just-me.njm-wide .njm-lamp { top: 37px; } .g-not-just-me.njm-wide .njm-mode { font-size: 16px; letter-spacing: .08em; }
.g-not-just-me.njm-wide .njm-grip { height: 48px; border-radius: 24px; font-size: 15px; } .g-not-just-me.njm-wide .njm-handle { height: 52px; }
.g-not-just-me.njm-wide .njm-rod { top: 18px; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const TAU = Math.PI * 2, clamp = K.clamp, lerp = K.lerp, hexA = K.hexA, now = () => performance.now();
      const inten = ctx.intensity, RM = () => K.reduced(), visits = K.visits(), bright = () => S.scene() === 'bright';
      const L = (o, rep) => { let s = ctx.line(o) || ''; if (rep) Object.keys(rep).forEach(k => { s = s.split('{' + k + '}').join(rep[k]); }); return s; };
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return (sp > n * 0.55 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; };
      const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
      const text = String(ctx.text || ''), hasText = !!text.trim();
      const care = an.safety === 'care';
      const support = an.fear_support === 'strong' ? 'strong' : an.fear_support === 'some' ? 'some' : 'weak';
      const heavy = care || support === 'strong';

      /* ---------------- today's venue (tomorrow's is teased at the end) ---------------- */
      const dayIdx = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
      let devVenue = null; try { if (S.isDev && S.isDev()) devVenue = new URLSearchParams(window.location.search).get('venue'); } catch (e) { /* no query */ }
      const VENUE = VENUES.find(v => v.key === devVenue) || VENUES[((dayIdx % VENUES.length) + VENUES.length) % VENUES.length];
      const NEXT_VENUE = VENUES[(((dayIdx + 1) % VENUES.length) + VENUES.length) % VENUES.length];

      /* ---------------- what the player said: the feeling, the place, the thought ---------------- */
      const famOf = (s) => { s = String(s || ''); for (const k of FAM_ORDER) if (FAM[k].re.test(s)) return k; return null; };
      const firstPerson = (s) => { // a feeling word counts when it is the player's own ("I feel / I'm so / makes me ..."), not someone else's mood
        for (const k of FAM_ORDER) {
          const re = new RegExp(FAM[k].re.source, 'gi'); let m;
          while ((m = re.exec(s))) { const pre = s.slice(Math.max(0, m.index - 26), m.index).toLowerCase(); if (/\b(i|i'm|i’m|im|i am|i feel|i felt|feel|feeling|so|really|i was|makes me|made me|me)\s*\S*\s*$/.test(pre) || /\b(i|me|my)\b/.test(pre)) return k; }
        }
        return null;
      };
      const dom = hasText ? ((DOMS.find(([, re]) => re.test(text)) || [null])[0]) : null;
      let famDetected = hasText ? famOf(an.feeling) : null, famFromWords = !!famDetected && famDetected !== 'uneasy';
      if (hasText && (!famDetected || famDetected === 'uneasy')) {
        const fromText = firstPerson(text);
        const dist = (Array.isArray(an.distortions) ? an.distortions : []).map(d => d && d.type);
        const fromDist = dist.includes('labelling') ? 'notenough' : (dist.includes('personalising') || dist.includes('should')) ? 'guilty'
          : dist.includes('mind_reading') ? (dom === 'reply' ? 'leftout' : dom === 'social' ? 'embarrassed' : 'worried') : (dist.includes('fortune_telling') || dist.includes('catastrophising')) ? 'worried' : null;
        famFromWords = !!fromText;
        famDetected = fromText || fromDist || famDetected || 'worried';
      }
      const chipKeys = (() => { const base = CHIPS[dom || 'none'].slice(); const out = famDetected ? [famDetected] : []; base.forEach(k => { if (!out.includes(k)) out.push(k); }); return out.slice(0, 6); })();
      const lower = text.toLowerCase();
      const spans = hasText ? (Array.isArray(an.spans) ? an.spans : []).map(s => {
        const q = s && typeof s.quote === 'string' ? s.quote.trim() : ''; if (q.split(/\s+/).length < 2) return null;
        let at = text.indexOf(q); if (at < 0) at = lower.indexOf(q.toLowerCase()); if (at < 0) return null;
        let end = at + q.length; while (end < text.length && /[.!?…]/.test(text[end])) end++;
        return { at, q: text.slice(at, end), kind: s.kind === 'camera' ? 'camera' : 'brain' };
      }).filter(Boolean) : [];
      const THOUGHT = (() => {
        const concl = String(an.conclusion || an.thought || '').toLowerCase();
        const score = (q) => q.toLowerCase().split(/[^a-z’']+/).filter(w => w.length > 3 && concl.includes(w)).length;
        const brains = spans.filter(s => s.kind === 'brain').sort((a, b) => score(b.q) - score(a.q) || b.at - a.at);
        if (brains[0]) return { text: clip(brains[0].q, 96), user: true };
        if (hasText && (an.thought || an.conclusion)) return { text: K.sentence(clip(an.thought || an.conclusion, 90)), user: false };
        return null;
      })();
      const LEAD = (() => { const ls = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text); const l = ls.find(x => x.kind === 'prepare') || ls.find(x => x.kind === 'ask') || ls[0]; return l ? clip(l.text, 110) : ''; })();

      /* ---------------- stages: what each pull of the lever lights ---------------- */
      const STAGE_DEF = {
        section: { mode: 'SECTION', led: 'A FEW OF US', cap: 'Your whole section lit up. <b>Made-up fans, real feeling.</b>' },
        lower: { mode: 'BOWL', led: 'LOTS OF US', cap: 'Every light is someone who has felt this. The fans are made up. <b>The feeling is common.</b>' },
        upper: { mode: 'TOP TIER', led: 'FULL HOUSE', cap: 'A whole stadium of it. Not a statistic, just a picture: <b>lots of people feel this.</b>' },
        stadium: { mode: 'EVERYONE', led: 'FULL HOUSE', cap: 'A whole stadium of it. Not a statistic, just a picture: <b>lots of people feel this.</b>' },
        floor: { mode: 'PITCH', led: 'PACKED OUT', cap: 'Even the pitch. <b>Lots and lots of people know this one.</b>' }
      };
      const STAGES = [['section', 'stadium'], ['section', 'lower', 'upper'], ['section', 'lower', 'upper', 'floor']][inten];

      /* ---------------- the stadium in 3D (metres; y runs away from the camera, z is up) ---------------- */
      const NCOL = 144, LN = 8, UN = 9, NR = LN + UN, YCOL = 36, YRING = 3;
      const A0 = 50, B0 = 76, DR = 1.55;
      const RINGS = [];
      for (let r = 0; r < LN; r++) RINGS.push({ a: A0 + r * DR, b: B0 + r * DR, z: 1.4 + r * 0.85 });
      for (let k = 0; k < UN; k++) { const p = RINGS[LN - 1]; RINGS.push({ a: p.a + 3.4 + k * DR, b: p.b + 3.4 + k * DR, z: p.z + 4.6 + k * 1.12 }); }
      const TOP = RINGS[NR - 1];
      const COS = new Float32Array(NCOL), SIN = new Float32Array(NCOL);
      for (let j = 0; j < NCOL; j++) { COS[j] = Math.cos(j / NCOL * TAU); SIN[j] = Math.sin(j / NCOL * TAU); }
      const secOf = (j) => Math.floor((((j - 6) % NCOL) + NCOL) % NCOL / 12);
      const YSEC = secOf(YCOL);
      const cdist = (j, j0) => { const d = Math.abs(j - j0) % NCOL; return Math.min(d, NCOL - d); };
      const FLOOR_R = NR;
      const floorPts = [];
      if (STAGES.includes('floor')) { for (let x = -27; x <= 27.1; x += 3.6) for (let y = -44; y <= 44.1; y += 3.6) floorPts.push([x + (Math.round(y) % 2 ? 0.9 : -0.9), y]); }
      const NST = NCOL * NR, NS = NST + floorPts.length;
      const WX = new Float32Array(NS), WY = new Float32Array(NS), WZ = new Float32Array(NS), RG = new Uint8Array(NS), CL = new Int16Array(NS), PH = new Float32Array(NS);
      const LIT = new Float64Array(NS).fill(Infinity), TIFO = new Uint8Array(NS), FLIP = new Float64Array(NS).fill(Infinity);
      const PX = new Float32Array(NS), PY = new Float32Array(NS), PS = new Float32Array(NS), PV = new Uint8Array(NS), WV = new Float32Array(NS);
      { let i = 0; const rnd = K.rng(25);
        for (let r = 0; r < NR; r++) for (let j = 0; j < NCOL; j++, i++) { const R0 = RINGS[r]; WX[i] = R0.a * COS[j]; WY[i] = R0.b * SIN[j]; WZ[i] = R0.z; RG[i] = r; CL[i] = j; PH[i] = rnd() * TAU; }
        floorPts.forEach(([x, y]) => { WX[i] = x; WY[i] = y; WZ[i] = 0.6; RG[i] = FLOOR_R; CL[i] = -1; PH[i] = rnd() * TAU; i++; }); }
      const YOU = YRING * NCOL + YCOL;
      LIT[YOU] = 0;
      /* the card stunt: NOT JUST over the top tier, YOU over the lower tier, centred on your seat (which sits inside the O) */
      (() => {
        const paint = (str, ringTop) => { const cols = textCols(str), half = Math.floor(cols.length / 2); cols.forEach((m, c) => { for (let row = 0; row < 7; row++) { const r = ringTop - row, j = YCOL + half - c, idx = r * NCOL + ((j % NCOL) + NCOL) % NCOL; if (r < 0 || r >= NR) continue; TIFO[idx] = (m >> row) & 1 ? 2 : 1; } }); };
        for (let i = 0; i < NST; i++) { const j = CL[i], far = SIN[j] > 0.25; TIFO[i] = far ? 1 : (Math.floor(j / 6) % 2 ? 3 : 4); }
        paint('NOT JUST', NR - 2); paint('YOU', LN - 1);
      })();

      /* the city around the stadium: avenues, ring roads and neighbourhoods of light */
      const CITY = (() => {
        const rnd = K.rng(VENUE.key.length * 977 + 3), xs = [], ys = [], cs = [], bs = [];
        const coast = (x, y) => VENUE.coast && x > 1400 + Math.sin(y / 900) * 500;
        const add = (x, y, c, b) => { if (Math.hypot(x / 1.2, y) < TOP.b + 34 || coast(x, y)) return; xs.push(x); ys.push(y); cs.push(c); bs.push(b); };
        const AV = 14;
        for (let a = 0; a < AV; a++) { const ang = a / AV * TAU + 0.11; for (let r = 150; r < 9000; r *= 1.045) add(Math.cos(ang) * r, Math.sin(ang) * r, 0, 0.9); }
        [260, 520, 980, 1700, 2900, 4600, 7000].forEach(R0 => { const n = Math.round(R0 / 14); for (let k = 0; k < n; k++) { const ang = k / n * TAU; add(Math.cos(ang) * R0 * 1.15, Math.sin(ang) * R0, 0, 0.8); } });
        for (let k = 0; k < 1300; k++) { const r = 180 * Math.pow(50, rnd()), ang = rnd() * TAU; add(Math.cos(ang) * r + (rnd() - 0.5) * 60, Math.sin(ang) * r + (rnd() - 0.5) * 60, rnd() < 0.82 ? 1 : 2, 0.35 + rnd() * 0.55); }
        return { x: Float32Array.from(xs), y: Float32Array.from(ys), c: Uint8Array.from(cs), b: Float32Array.from(bs), n: xs.length };
      })();

      /* ---------------- state ---------------- */
      const st = { phase: 'intro', stage: -1, fam: null, heard: [], pulls: 0, onBeat: 0, finished: false, shake: 0, flood: 0, floodTo: 0, beatT: 0, beatN: 0,
        sky: 0, skyMode: '', skyT0: 0, skyFrom: 0, skyTo: 0, waveT0: 0, waveOn: false, tifo: false, lockedSaid: -1, extraVoices: 0, lastTap: 0, camSeat: -1, waits: {} };
      const M = { W: 0, H: 0, wide: false, f: 400, cy0: 400 };
      const P = K.particles({ max: 500 });

      /* ---------------- DOM ---------------- */
      const SOFT = (() => { try { const c = document.createElement('canvas'), gl = c.getContext('webgl'); if (!gl) return true; const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''; const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r); } catch (e) { return false; } })();
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1 : 1.5 });
      const fx = K.canvas(el, { maxDpr: SOFT ? 1 : 1.5, cls: 'njm-fx' });
      const bloomCv = document.createElement('canvas'), bloomG = bloomCv.getContext('2d');
      const deskCv = document.createElement('canvas');
      const hit = h('div', { class: 'njm-hit', 'aria-hidden': 'true' });
      const ledCv = h('canvas', { class: 'njm-led', 'aria-hidden': 'true' });
      const ledSr = h('span', { class: 'tsg-sr', 'aria-live': 'polite' });
      const body = h('div', { class: 'njm-body', role: 'status', 'aria-live': 'polite' });
      const screen = h('div', { class: 'njm-screen' }, ledCv, ledSr, body);
      const jumbo = h('div', { class: 'njm-jumbo' }, screen);
      const lever = h('div', { class: 'njm-lever', role: 'slider', tabindex: '0', 'aria-label': 'Main lights lever. Pull it down, or press the down arrow.', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' },
        h('div', { class: 'njm-plate' }, h('span', { class: 'njm-title', text: 'MAIN LIGHTS' }), h('i', { class: 'njm-lamp' }), h('div', { class: 'njm-ticks' }), h('div', { class: 'njm-slot' }), h('span', { class: 'njm-mode', text: 'SECTION' })),
        h('div', { class: 'njm-handle' }, h('i', { class: 'njm-rod' }), h('b', { class: 'njm-grip', text: 'PULL' })));
      const slotEl = lever.querySelector('.njm-slot'), ticksEl = lever.querySelector('.njm-ticks'), modeEl = lever.querySelector('.njm-mode'), handleEl = lever.querySelector('.njm-handle');
      const youTag = h('div', { class: 'njm-you off', 'aria-hidden': 'true', text: 'YOU' });
      const space = h('div', { class: 'njm-space off', role: 'status', 'aria-live': 'polite' }, h('small', { text: 'SKY CAM' }), h('b', { text: 'Earth, tonight' }), h('span', { text: 'Lights everywhere. Different cities, same feeling.' }));
      el.append(hit, jumbo, lever, youTag, space);
      const patch = K.character('patch', { side: 'above', mood: 'happy', x: 0, y: 0, voice: 600 });
      const drop = K.character('drop', { side: 'above', mood: 'calm', x: 0, y: 0, voice: 480 });
      const sync = K.character('sync', { side: 'above', mood: 'happy', x: 0, y: 0, voice: 700 });
      const CAST = [patch, drop, sync];
      CAST.forEach(c => c.el.classList.add('njm-c'));
      function say(c, line, o) { CAST.forEach(x => { if (x !== c) x.hush(); }); return c.say(line, o || {}); }

      /* ---------------- layout ---------------- */
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        M.W = W; M.H = H; M.wide = W >= 760 && H >= 560;
        el.classList.toggle('njm-wide', M.wide);
        if (!M.wide) {
          const sh = H < 760;
          M.f = Math.min(W * 1.16, H * 0.6); M.cy0 = H * (sh ? 0.53 : 0.52);
          M.jb = { w: Math.min(W - 28, 380), y: 66 };
          M.cs = sh ? 54 : 62; M.deskY = H - (sh ? 92 : 106);
          M.lv = { w: 88, h: sh ? 240 : 270 }; M.lv.x = W - M.lv.w - 12; M.lv.y = H - 14 - M.lv.h;
          M.chars = [0, 1, 2].map(i => ({ x: 12 + i * (M.cs + 7), y: H - 12 - M.cs }));
          M.globe = { x: W / 2, y: H * 0.47, r: Math.min(W * 0.41, H * 0.24) };
          M.ledH = 42;
        } else {
          M.f = Math.min(H * 0.98, W * 0.72); M.cy0 = H * 0.6;
          M.jb = { w: Math.min(600, W - 420), y: 70 };
          M.cs = 92; M.deskY = H - 128;
          M.lv = { w: 120, h: 330 }; M.lv.x = W - M.lv.w - 40; M.lv.y = H - 26 - M.lv.h;
          M.chars = [0, 1, 2].map(i => ({ x: 30 + i * (M.cs + 14), y: H - 22 - M.cs }));
          M.globe = { x: W / 2, y: H * 0.5, r: Math.min(H * 0.33, W * 0.24) };
          M.ledH = 56;
        }
        M.jb.x = (W - M.jb.w) / 2;
        Object.assign(jumbo.style, { left: M.jb.x + 'px', top: M.jb.y + 'px', width: M.jb.w + 'px' });
        Object.assign(lever.style, { left: M.lv.x + 'px', top: M.lv.y + 'px', width: M.lv.w + 'px', height: M.lv.h + 'px' });
        const slotTop = M.wide ? 82 : 68, slotBot = M.wide ? 62 : 52;
        M.lv.slotTop = slotTop; M.lv.travel = M.lv.h - slotTop - slotBot - (M.wide ? 4 : 6);
        Object.assign(slotEl.style, { top: slotTop + 'px', bottom: slotBot + 'px' });
        Object.assign(ticksEl.style, { top: slotTop + 'px', bottom: slotBot + 'px' });
        handleEl.style.top = (slotTop - (M.wide ? 24 : 20)) + 'px';
        space.style.top = (M.wide ? 72 : 66) + 'px';
        CAST.forEach((c, i) => { const p = M.chars[i]; c.el.style.setProperty('--sz', M.cs + 'px'); c.place(p.x, p.y); c.el.style.setProperty('--bl', (M.chars[0].x - p.x) + 'px'); c.el.style.setProperty('--bw', Math.max(200, Math.min(M.wide ? 420 : 300, M.lv.x - M.chars[0].x - 14)) + 'px'); });
        // LED canvas: crisp at the device ratio
        const lw = M.jb.w - 14, dpr = Math.min(2, window.devicePixelRatio || 1);
        ledCv.width = Math.round(lw * dpr); ledCv.height = Math.round(M.ledH * dpr); ledCv.style.height = M.ledH + 'px';
        LED.w = lw; LED.h = M.ledH; LED.dpr = dpr; LED.dirty = true;
        bloomCv.width = Math.max(2, Math.round(W / 4)); bloomCv.height = Math.max(2, Math.round(H / 4));
        deskDirty = true; stageKey = '';
        setPresets();
        markDirty(200);
      }
      let deskDirty = true;

      /* ---------------- the big screen's dot-matrix headline ---------------- */
      const LED = { text: '', col: '#ffcf5a', t0: 0, w: 0, h: 0, dpr: 1, dirty: true, anim: false };
      const ledG = ledCv.getContext('2d');
      function ledSet(t, col) { if (t === LED.text && (col || '#ffcf5a') === LED.col) return; LED.text = t; LED.col = col || '#ffcf5a'; LED.t0 = now(); LED.anim = !RM(); LED.dirty = true; ledSr.textContent = t; }
      function ledDraw(tn) {
        const g = ledG, w = LED.w, hh = LED.h; if (!w) return;
        g.setTransform(LED.dpr, 0, 0, LED.dpr, 0, 0); g.clearRect(0, 0, w, hh);
        const cols = textCols(LED.text), n = Math.max(1, cols.length);
        const p = Math.max(2.6, Math.min(hh / 8.4, (w - 18) / (n + 2)));
        const gw = Math.floor(w / p), gh = Math.floor(hh / p), ox = (w - gw * p) / 2 + p / 2, oy = (hh - gh * p) / 2 + p / 2;
        const c0 = Math.floor((gw - n) / 2), r0 = Math.floor((gh - 7) / 2);
        const age = tn - LED.t0, k = LED.anim ? clamp(age / 520, 0, 1) : 1, shown = Math.ceil(n * k);
        g.fillStyle = 'rgba(255,207,90,0.07)';
        g.beginPath(); for (let cx = 0; cx < gw; cx++) for (let cy = 0; cy < gh; cy++) { g.moveTo(ox + cx * p + p * 0.32, oy + cy * p); g.arc(ox + cx * p, oy + cy * p, p * 0.32, 0, TAU); } g.fill();
        const glow = K.glowSprite(LED.col);
        for (let c = 0; c < shown; c++) { const m = cols[c]; if (!m) continue; for (let r = 0; r < 7; r++) { if (!((m >> r) & 1)) continue; const x = ox + (c0 + c) * p, y = oy + (r0 + r) * p; g.globalAlpha = 0.5; g.drawImage(glow, x - p * 1.3, y - p * 1.3, p * 2.6, p * 2.6); } }
        g.globalAlpha = 1; g.fillStyle = LED.col; g.beginPath();
        for (let c = 0; c < shown; c++) { const m = cols[c]; if (!m) continue; for (let r = 0; r < 7; r++) { if (!((m >> r) & 1)) continue; const x = ox + (c0 + c) * p, y = oy + (r0 + r) * p; g.moveTo(x + p * 0.36, y); g.arc(x, y, p * 0.36, 0, TAU); } }
        g.fill();
        if (k < 1 && shown > 0) { g.fillStyle = '#ffffff'; const c = shown - 1; for (let r = 0; r < 7; r++) { if ((cols[c] >> r) & 1) { const x = ox + (c0 + c) * p, y = oy + (r0 + r) * p; g.beginPath(); g.arc(x, y, p * 0.42, 0, TAU); g.fill(); } } }
        LED.dirty = k < 1;
      }

      /* ---------------- the big screen's body ---------------- */
      function setBody(parts) { body.replaceChildren(...parts.filter(Boolean)); body.classList.remove('swap'); void body.offsetWidth; body.classList.add('swap'); }
      const capEl = (html) => { const s = h('span', { class: 'njm-cap' }); s.innerHTML = html; return s; };
      function meterEl(k) { const m = h('div', { class: 'njm-meter', 'aria-hidden': 'true' }); const n = M.wide ? 22 : 16; for (let i = 0; i < n; i++) m.append(h('i', { class: i < Math.round(k * n) ? 'on' : '' })); return m; }
      function fanSvg(id) {
        let x = 0; for (const ch of id) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
        const SK = ['#f2c7a5', '#d9a07a', '#a8714e', '#7a4a2e', '#f6d3b8', '#c58c62'], HR = ['#2a1a12', '#5a3420', '#c99a4a', '#1c1c24', '#8a3a2a', '#d8d2c8'], SH = ['#3fb6ff', '#ff6f91', '#ffc94d', '#7be08a', '#b18cff', '#ff8a4d'];
        const sk = SK[x % 6], hr = HR[(x >> 3) % 6], sh = SH[(x >> 6) % 6], side = (x >> 9) % 2 ? 1 : -1, px = side > 0 ? 31 : 13;
        return '<svg viewBox="0 0 46 46" aria-hidden="true"><rect width="46" height="46" fill="#121828"/><circle cx="' + px + '" cy="10" r="7" fill="#fff3c4" opacity=".35"/>' +
          '<path d="M' + (side > 0 ? 27 : 19) + ' 30L' + px + ' 14" stroke="' + sh + '" stroke-width="4.5" stroke-linecap="round"/><rect x="' + (px - 2.5) + '" y="7" width="5" height="8.5" rx="1.4" fill="#e9eef8"/>' +
          '<path d="M7 47c1-10 7-15 16-15s15 5 16 15z" fill="' + sh + '"/><circle cx="23" cy="22" r="7.5" fill="' + sk + '"/><path d="M15.5 21c0-6 4-9.5 7.5-9.5s7.5 3 7.5 9c-2-3.5-5-4.6-7.5-4.6s-5.7 1.4-7.5 5.1z" fill="' + hr + '"/></svg>';
      }

      /* ---------------- camera ---------------- */
      const CAM = { tx: 0, ty: 60, tz: 6, Dc: 100, el: 0.46 };
      let CAM_PRESET = null, camTw = null;
      function setPresets() {
        const ys = RINGS[YRING];
        CAM_PRESET = {
          close: M.wide ? { tx: 0, ty: ys.b * 0.84, tz: ys.z + 2, Dc: 104, el: 0.46 } : { tx: 0, ty: ys.b * 0.84, tz: ys.z + 2, Dc: 84, el: 0.42 },
          p1: M.wide ? { tx: 0, ty: ys.b * 0.78, tz: 4, Dc: 112, el: 0.48 } : { tx: 0, ty: ys.b * 0.78, tz: 4, Dc: 92, el: 0.45 },
          tifo: M.wide ? { tx: 0, ty: 40, tz: 8, Dc: 176, el: 0.56 } : { tx: 0, ty: 40, tz: 8, Dc: 160, el: 0.55 },
          p2: M.wide ? { tx: 0, ty: 24, tz: 0, Dc: 180, el: 0.62 } : { tx: 0, ty: 22, tz: 0, Dc: 152, el: 0.64 },
          over: M.wide ? { tx: 0, ty: 6, tz: 0, Dc: 205, el: 0.66 } : { tx: 0, ty: 8, tz: 0, Dc: 172, el: 0.7 }
        };
        if (!camTw && !st.skyMode) Object.assign(CAM, CAM_PRESET[st.camKey || 'close']);
      }
      function camTo(key, ms) { st.camKey = key; camTw = { from: Object.assign({}, CAM), to: CAM_PRESET[key], t0: now(), ms: RM() ? 380 : ms }; }
      function camUpdate(tn) {
        if (!camTw) return false;
        const k = clamp((tn - camTw.t0) / camTw.ms, 0, 1), e = K.ease.inOutCubic(k), a = camTw.from, b = camTw.to;
        CAM.tx = lerp(a.tx, b.tx, e); CAM.ty = lerp(a.ty, b.ty, e); CAM.tz = lerp(a.tz, b.tz, e); CAM.el = lerp(a.el, b.el, e);
        CAM.Dc = Math.exp(lerp(Math.log(a.Dc), Math.log(b.Dc), e));
        if (k >= 1) camTw = null;
        return true;
      }
      /* the sky cam: one parameter (0 = in the booth, 1 = the whole Earth) drives the climb */
      const SKY_TOP = 70000;
      function skyApply(k) {
        const o = CAM_PRESET.over, e = k;
        CAM.tx = 0; CAM.ty = lerp(o.ty, 0, smooth(0, 0.4, e)); CAM.tz = 0;
        CAM.Dc = Math.exp(lerp(Math.log(o.Dc), Math.log(SKY_TOP), smooth(0, 0.8, e)));
        CAM.el = lerp(o.el, 1.5702, smooth(0.02, 0.5, e));
      }
      let EX = 0, EY = 0, EZ = 0, CE = 1, SE = 0, FF = 400, CX0 = 0, CY0 = 0;
      function camSetup(ox, oy) { CE = Math.cos(CAM.el); SE = Math.sin(CAM.el); EX = CAM.tx; EY = CAM.ty - CAM.Dc * CE; EZ = CAM.tz + CAM.Dc * SE; FF = M.f; CX0 = M.W / 2 + (ox || 0); CY0 = M.cy0 + (oy || 0); }
      const Q = { x: 0, y: 0, s: 0 };
      function proj(x, y, z) { const vx = x - EX, vy = y - EY, vz = z - EZ, zc = vy * CE - vz * SE; if (zc < 0.5) return false; const inv = FF / zc; Q.x = CX0 + vx * inv; Q.y = CY0 - (vy * SE + vz * CE) * inv; Q.s = inv; return true; }

      /* ---------------- palette ---------------- */
      function pal() {
        const b = bright(), fl = st.flood;
        return {
          sky0: b ? '#6f7fc8' : '#03050d', sky1: b ? '#c49ac0' : '#0b1430', sky2: b ? '#ffcf9a' : mix('#1a2140', VENUE.haze, 0.28),
          ground0: b ? '#2f3552' : '#05070f', ground1: b ? '#4a4870' : '#0a0e1c',
          deck: [b ? mix('#4b5577', '#69759b', fl) : mix('#121828', '#2a3450', fl), b ? mix('#424b6a', '#5f6a8f', fl) : mix('#0f1422', '#232c45', fl), b ? mix('#3a4260', '#545e82', fl) : mix('#0c101b', '#1d243a', fl)],
          wall: b ? mix('#2c3350', '#3c4566', fl) : mix('#080b14', '#141a2c', fl), aisle: b ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,' + (0.05 + fl * 0.07).toFixed(3) + ')',
          seatOff: b ? 'rgba(205,214,236,' + (0.34 + fl * 0.1).toFixed(3) + ')' : 'rgba(146,156,188,' + (0.15 + fl * 0.2).toFixed(3) + ')',
          lit: '#ffc94d', litHot: '#fff1c4', you: '#ff6f91', tifoBg: '#d8265c', tifoTxt: '#fffaf0', stripe: '#ff8f5c',
          roof: b ? '#2a2f45' : '#06080f', city: [b ? '#ffe0a0' : '#ffcf7a', b ? '#ffffff' : '#dfe8ff', VENUE.team]
        };
      }
      function mix(a, b, k) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); k = clamp(k, 0, 1); const r = Math.round(((pa >> 16) & 255) + ((((pb >> 16) & 255) - ((pa >> 16) & 255)) * k)), gg = Math.round(((pa >> 8) & 255) + ((((pb >> 8) & 255) - ((pa >> 8) & 255)) * k)), bb = Math.round((pa & 255) + (((pb & 255) - (pa & 255)) * k)); return 'rgb(' + r + ',' + gg + ',' + bb + ')'; }

      /* ---------------- sound: a stadium drum that grows with every light ---------------- */
      const MUS = { layer: 0, vol: 0.9 };
      const BPM = [88, 96, 104][inten];
      const PROG = [['D2', ['F#4', 'A4', 'D5']], ['A1', ['E4', 'A4', 'C#5']], ['B1', ['F#4', 'B4', 'D5']], ['G1', ['G4', 'B4', 'D5']]];
      const RIFF = ['A5', 'F#5', 'D5', 'F#5', 'E5', 'C#5', 'A4', 'C#5', 'D5', 'F#5', 'B5', 'A5', 'G5', 'F#5', 'E5', 'D5'];
      const beatQ = [];
      const heardAt = (t) => now() + (t - A.now() + (A.latency ? A.latency() : 0)) * 1000;
      const R = K.rhythm({ bpm: BPM, perBar: 4, onBeat: (t, i, b) => { beatQ.push({ at: heardAt(t), i, b }); if (beatQ.length > 32) beatQ.shift(); playBeat(t, i, b); } });
      function clap(t, v, pan) { A.noise({ when: t, filter: 'bandpass', freq: 1500, q: 0.9, dur: 0.07, vol: v, pan }); A.noise({ when: t + 0.012, filter: 'bandpass', freq: 1150, q: 1.1, dur: 0.09, vol: v * 0.7, pan: -(pan || 0) }); }
      function playBeat(t, i, b) {
        if (!A.ctx || !MUS.on) return;
        const L0 = MUS.layer, v = MUS.vol, bar = Math.floor(i / 4) % 4, [bass, ch] = PROG[bar];
        if (L0 === 'space') {
          if (b === 0) { ch.forEach((n, k) => A.tone({ when: t + k * 0.02, type: 'triangle', freq: A.note(n), dur: 60 / BPM * 4.2, vol: 0.03 * v, attack: 0.8, lp: 1200, verb: 0.7, bus: 'music' })); A.tone({ when: t, type: 'sine', freq: A.note(bass) * 2, dur: 60 / BPM * 4, vol: 0.05 * v, attack: 0.6, bus: 'music' }); }
          if (Math.random() < 0.45) A.tone({ when: t + Math.random() * 0.3, type: 'sine', freq: A.note(ch[Math.floor(Math.random() * 3)]) * 2, dur: 0.9, vol: 0.016 * v, verb: 0.7, bus: 'music' });
          return;
        }
        if (L0 === 0) { if (b === 0) { A.drum(t, 0.2 * v, 0.46, 0.2); A.drum(t + 0.2, 0.12 * v, 0.44, 0.2); } return; }
        if (b === 0 || b === 2) A.drum(t, (b === 0 ? 0.34 : 0.26) * v, 0.52, 0.18);
        if (b === 1 || b === 3) clap(t, 0.07 * v * (L0 >= 2 ? 1.2 : 1), b === 1 ? 0.2 : -0.2);
        if (L0 >= 2) {
          if (b === 0) { A.pluck(A.note(bass), { when: t, vol: 0.3 * v, damp: 0.993, lp: 600, bus: 'music' }); ch.forEach((n, k) => A.tone({ when: t + k * 0.008, type: 'triangle', freq: A.note(n), dur: 60 / BPM * 3.6, vol: 0.022 * v, attack: 0.25, lp: 1600, verb: 0.35, bus: 'music' })); }
          if (b === 2) A.pluck(A.note(bass) * 1.5, { when: t, vol: 0.2 * v, damp: 0.992, lp: 600, bus: 'music' });
        }
        if (L0 >= 3) {
          const n = RIFF[i % 16]; A.tone({ when: t, type: 'square', freq: A.note(n), dur: 60 / BPM * 0.8, vol: 0.016 * v, attack: 0.01, lp: 2400, bus: 'music', detune: -6 }); A.tone({ when: t, type: 'triangle', freq: A.note(n), dur: 60 / BPM * 0.9, vol: 0.03 * v, lp: 2600, bus: 'music', detune: 6 });
          if (inten > 0) A.shaker(t + 30 / BPM, 0.03 * v);
        }
        if (L0 === 'fin' && b === 3) { A.noise({ when: t, filter: 'bandpass', freq: 520, to: 760, q: 3, dur: 0.22, attack: 0.03, vol: 0.12 * v }); A.noise({ when: t, filter: 'bandpass', freq: 1300, to: 1700, q: 4, dur: 0.2, vol: 0.05 * v }); }
      }
      let crowd = null;
      function crowdLevel(tgt) { if (!A.ctx) return; if (!crowd) { crowd = A.loop({ pink: true, filter: 'bandpass', freq: 640, q: 0.55, bus: 'amb' }); S.onDestroy(() => crowd && crowd.stop()); } if (crowd) crowd.level(tgt, 0.6); }
      const PENT = ['D4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'F#5', 'A5', 'B5', 'D6'];
      const SND = {
        ratchet(k) { if (!A.ctx) return; A.click({ vol: 0.05 }); A.tone({ type: 'square', freq: 700 + k * 900, dur: 0.018, vol: 0.02, lp: 2600 }); },
        clunk() { K.sfx.thud(); if (!A.ctx) return; const t = A.now(); A.wood(t, 0.28, 0.42); A.noise({ when: t, filter: 'lowpass', freq: 260, dur: 0.28, vol: 0.22 }); A.tone({ when: t, type: 'sawtooth', freq: 62, to: 55, dur: 0.38, vol: 0.05, lp: 520 });
          for (let i = 0; i < 6; i++) A.noise({ when: t + 0.01 + Math.random() * 0.16, filter: 'highpass', freq: 3500 + Math.random() * 3000, dur: 0.012, vol: 0.06 }); },
        whump(big) { if (!A.ctx) return; const t = A.now(); A.tone({ when: t, type: 'sine', freq: 90, to: 38, glide: 0.45, dur: 0.7, vol: big ? 0.34 : 0.22 }); A.noise({ when: t, filter: 'lowpass', freq: 200, dur: 1.0, attack: 0.02, vol: big ? 0.22 : 0.14 });
          if (big) A.tone({ when: t, type: 'sawtooth', freq: 55, to: 110, glide: 0.9, dur: 1.2, vol: 0.035, lp: 700 }); },
        arp(n, span, panL, panR) { if (!A.ctx) return; const t = A.now(); for (let k = 0; k < n; k++) { const f = A.note(PENT[Math.min(PENT.length - 1, k % PENT.length + Math.floor(k / PENT.length) * 2)]); A.pluck(f, { when: t + k * span / n, vol: 0.12, damp: 0.995, verb: 0.3, pan: lerp(panL, panR, k / Math.max(1, n - 1)) }); } },
        ooh(v) { if (!A.ctx) return; const t = A.now(); A.noise({ when: t, filter: 'bandpass', freq: 420, to: 760, q: 2.6, dur: 1.5, attack: 0.5, vol: 0.13 * v, pink: true }); A.noise({ when: t, filter: 'bandpass', freq: 1050, to: 1450, q: 3.5, dur: 1.4, attack: 0.5, vol: 0.05 * v }); },
        cheer(v) { if (!A.ctx) return; const t = A.now(); A.noise({ when: t, filter: 'highpass', freq: 900, dur: 1.8, attack: 0.18, vol: 0.09 * v, pink: true }); for (let i = 0; i < 16; i++) clap(t + Math.random() * 1.6, 0.03 * v, Math.random() * 1.6 - 0.8); },
        cam() { if (!A.ctx) return; const t = A.now(); A.tone({ when: t, type: 'sine', freq: 520, to: 1300, glide: 0.22, dur: 0.28, vol: 0.04 }); A.click({ when: t + 0.26, vol: 0.1 }); A.noise({ when: t + 0.27, filter: 'highpass', freq: 2500, dur: 0.05, vol: 0.05 }); },
        voice(i) { K.sfx.chime(i + 3); if (!A.ctx) return; const t = A.now(); const ch = PROG[i % 4][1]; A.pad(ch.map(n => A.note(n)), { when: t + 0.05, dur: 2.2, vol: 0.08, attack: 0.3 }); SND.ooh(0.5); },
        sky() { K.sfx.whoosh(); if (!A.ctx) return; const t = A.now(); A.noise({ when: t, filter: 'lowpass', freq: 160, to: 4200, dur: 3.6, attack: 1.6, vol: 0.16, pink: true }); A.tone({ when: t, type: 'sine', freq: 110, to: 40, glide: 3.4, dur: 3.6, vol: 0.09 }); },
        dive() { K.sfx.whoosh(); if (!A.ctx) return; const t = A.now(); A.noise({ when: t, filter: 'lowpass', freq: 4000, to: 180, dur: 2.6, attack: 0.3, vol: 0.15, pink: true }); A.tone({ when: t + 2.2, type: 'sine', freq: 70, to: 40, glide: 0.4, dur: 0.6, vol: 0.2 }); },
        glass(i, pan) { if (!A.ctx) return; A.chime(A.note(PENT[(i * 3) % PENT.length]) * 2, { vol: 0.035, dur: 1.6, pan }); },
        locked() { K.sfx.no(); },
        beat() { if (!A.ctx) return; const t = A.now(); ['D5', 'F#5', 'A5'].forEach((n, k) => A.chime(A.note(n), { when: t + k * 0.04, vol: 0.06, dur: 1 })); }
      };

      /* ---------------- the lever ---------------- */
      const LV = { k: 0, v: 0, grab: false, k0: 0, y0: 0, fired: false, clicks: 0, ready: false };
      function leverReady(on, mode) { LV.ready = on; lever.classList.toggle('ready', on); if (mode) modeEl.textContent = mode; }
      K.drag(lever, {
        start: (p) => { LV.grab = true; LV.k0 = LV.k; LV.y0 = p.y; LV.fired = false; LV.clicks = Math.floor(LV.k * 10); K.sfx.tap(); },
        move: (p) => {
          if (!LV.grab) return;
          let k = LV.k0 + (p.y - LV.y0) / Math.max(40, M.lv.travel);
          if (!LV.ready) { k = clamp(k, 0, 1); k = Math.min(k, 0.18 + k * 0.12); }
          LV.k = clamp(k, 0, 1); LV.v = 0;
          const c = Math.floor(LV.k * 10); if (c !== LV.clicks) { LV.clicks = c; SND.ratchet(LV.k); }
          if (LV.ready && !LV.fired && LV.k >= 0.97) fire();
          if (!LV.ready && LV.k > 0.15 && st.lockedSaid !== st.stage && (st.phase === 'fancam' || st.phase === 'voice')) { st.lockedSaid = st.stage; SND.locked(); say(sync, L(LINES.locked), { mood: 'surprised', ms: 2400 }); }
        },
        end: () => { LV.grab = false; }
      });
      K.onKey(['ArrowDown', 'Enter', 'Space'], (e) => { if (document.activeElement !== lever) return; e.preventDefault(); if (LV.ready) { LV.k = 1; fire(); } });
      function fire() {
        if (!LV.ready || LV.fired) return;
        LV.fired = true; LV.ready = false; lever.classList.remove('ready'); K.guide(null);
        const j = R.judge(), good = j.grade === 'perfect' || j.grade === 'good';
        st.pulls++; if (good) st.onBeat++;
        SND.clunk(); S.buzz && S.buzz(good ? [14, 30, 14] : 16);
        st.shake = RM() ? 0 : 0.5;
        const r = K.rectIn(lever), x = r.x + r.w / 2, y = r.y + M.lv.slotTop + M.lv.travel + 18;
        P.emit('spark', x, y, good ? 26 : 16, { colors: ['#fff3c4', '#ffd36b', '#ff9a5a'], angle: -Math.PI / 2, spread: 2.4 });
        if (good) { popText(r.x + r.w / 2 - (M.wide ? 120 : 70), y - M.lv.travel * 0.6, 'ON THE BEAT!'); SND.beat(); }
        ctx.track('pull', { n: st.pulls, beat: good ? 1 : 0 });
        const w = st.waits.pull; st.waits.pull = null; if (w) S.later(w, 120);
      }
      function popText(x, y, t) { const p = h('div', { class: 'njm-pop', 'aria-hidden': 'true', text: t }); p.style.left = clamp(x, 80, M.W - 80) + 'px'; p.style.top = y + 'px'; el.append(p); S.later(() => p.remove(), 1200); }
      const waitPull = () => new Promise(res => { st.waits.pull = res; });

      /* ---------------- lighting the stands ---------------- */
      function lightStage(key, t0) {
        let far = 0;
        for (let i = 0; i < NS; i++) {
          if (LIT[i] !== Infinity) continue;
          const r = RG[i], j = CL[i]; let d = -1;
          if (key === 'section') { if (r < LN && secOf(j) === YSEC) d = Math.hypot((r - YRING) * 1.2, cdist(j, YCOL)) * 46; }
          else if (key === 'lower') { if (r < LN) d = cdist(j, YCOL) * 15 + r * 16; }
          else if (key === 'upper') { if (r >= LN && r < NR) d = cdist(j, YCOL) * 14 + (r - LN) * 20; }
          else if (key === 'stadium') { if (r < NR) d = cdist(j, YCOL) * 15 + r * 12; }
          else if (key === 'floor') { if (r === FLOOR_R) d = Math.hypot(WX[i], WY[i]) * 17; }
          if (d >= 0) { LIT[i] = t0 + d + Math.random() * 70; far = Math.max(far, d); }
        }
        return far;
      }
      const litFrac = () => { let n = 0; for (let i = 0; i < NS; i++) if (LIT[i] !== Infinity) n++; return n / NS; };

      /* ---------------- fan cam ---------------- */
      const CAM_SEATS = { section: [1, YCOL - 4], lower: [2, YCOL - 17], upper: [LN + 4, YCOL + 19], stadium: [LN + 3, YCOL - 18], floor: [FLOOR_R, 0] };
      let camBtn = null, camWrap = null;
      function seatIdx(key) { const [r, j] = CAM_SEATS[key]; if (r === FLOOR_R) { let best = NST, bd = 1e9; for (let i = NST; i < NS; i++) { const d = Math.hypot(WX[i] - 6, WY[i] - 10); if (d < bd) { bd = d; best = i; } } return best; } return r * NCOL + ((j % NCOL) + NCOL) % NCOL; }
      const album = new Set(K.collection().filter(x => typeof x === 'string' && x.indexOf('v:') === 0).map(x => x.slice(2)));
      function pickVoice(slot) {
        const fam = st.fam || 'uneasy';
        let pool = (slot % 2 === 1 && dom && DOM_VOICES[dom]) ? DOM_VOICES[dom] : slot === 3 ? VOICES.uneasy : VOICES[fam];
        if (heavy) { const calm = pool.filter(v => !v[2]); if (calm.length) pool = calm; }
        let list = pool.filter(v => !album.has(v[0]) && !st.heard.includes(v[0]));
        if (!list.length) list = pool.filter(v => !st.heard.includes(v[0]));
        if (!list.length) list = VOICES.uneasy.filter(v => !st.heard.includes(v[0]));
        return list[Math.floor(Math.random() * list.length)] || pool[0];
      }
      function seatLabel(i) { if (RG[i] === FLOOR_R) return { led: 'ON THE PITCH', row: 'On the pitch', sec: 'the pitch' }; const r = RG[i], j = CL[i], up = r >= LN, sec = (up ? 201 : 101) + secOf(j), row = String.fromCharCode(65 + (up ? r - LN : r)); return { led: 'SEC ' + sec + ' ROW ' + row, row: 'Row ' + row + ', seat ' + (((j - 6) % 12 + 12) % 12 + 1), sec: 'section ' + sec }; }
      function showVoice(i, slot) {
        const v = pickVoice(slot); st.heard.push(v[0]);
        const lab = seatLabel(i);
        ledSet(lab.led, '#ffcf5a');
        const fan = h('div', { class: 'njm-fan' }); fan.innerHTML = fanSvg(v[0]);
        fan.append(h('div', null, h('p', { class: 'njm-quote', text: '“' + v[1] + '”' }), h('span', { class: 'njm-attrib', text: 'A made-up fan · ' + lab.row })));
        setBody([fan]);
        SND.voice(st.heard.length);
        flashSeat(i);
        ctx.track('voice', { n: st.heard.length });
      }
      function flashSeat(i) { st.flashSeat = i; st.flashT = now(); if (PV[i]) P.emit('star', PX[i], PY[i], 10, { colors: ['#fff6d0', '#ffcf5a', '#ff9fb6'], speed: [40, 120] }); }

      /* ---------------- input on the stands and the globe ---------------- */
      const HT = { down: null, spin: false, lastX: 0, lastT: 0 };
      K.press(hit, {
        down: (p) => { HT.down = { x: p.x, y: p.y, t: now() }; HT.lastX = p.x; HT.lastT = now(); if (st.phase === 'spin') { GL.drag = true; GL.v = 0; } },
        move: (p) => {
          if (st.phase === 'spin' && GL.drag) { const tn = now(), dx = p.x - HT.lastX, dt = Math.max(1, tn - HT.lastT); HT.lastX = p.x; HT.lastT = tn; const deg = -dx / (M.globe.r * 2.2) * 180; GL.lon += deg; GL.total += Math.abs(deg); GL.v = GL.v * 0.5 + (deg / dt * 1000) * 0.5; }
        },
        up: (p) => {
          const d = HT.down; HT.down = null; GL.drag = false;
          if (!d) return;
          if (st.phase !== 'spin' && Math.hypot(p.x - d.x, p.y - d.y) < 14 && now() - d.t < 600) tapStands(p);
        }
      });
      function tapStands(p) {
        if (!['pull', 'fancam', 'voice', 'skypull'].includes(st.phase)) return;
        let best = -1, bd = M.wide ? 26 : 22;
        for (let i = 0; i < NS; i++) { if (!PV[i] || LIT[i] === Infinity || LIT[i] > now() || i === YOU) continue; const d = Math.hypot(PX[i] - p.x, PY[i] - p.y); if (d < bd) { bd = d; best = i; } }
        if (best < 0) { if (A.ctx) A.click({ vol: 0.05 }); return; }
        if (st.phase === 'fancam') { camTapped(best); return; }
        if (now() - st.lastTap < 1400) return;
        st.lastTap = now(); st.extraVoices++;
        SND.cam(); showVoice(best, st.heard.length);
      }

      /* ---------------- the globe: a dotted night-side Earth whose lights switch on around you ---------------- */
      const DEG = Math.PI / 180;
      const GL = { built: false, lon: 0, lat: 0, v: 0, drag: false, total: 0, n: 0, landN: 0, lastChime: 0 };
      function buildGlobe() {
        if (GL.built) return; GL.built = true;
        const inPoly = (lon, lat, poly) => { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1]; if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) ins = !ins; } return ins; };
        const boxes = LAND.map(p => { let a = 999, b = -999, c = 999, d = -999; p.forEach(([x, y]) => { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); }); return [a, b, c, d]; });
        const landLat = [], landLon = [];
        const n = 9000, ga = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < n; i++) {
          const yy = 1 - 2 * (i + 0.5) / n, lat = Math.asin(yy) / DEG, lon = ((i * ga / DEG) % 360 + 540) % 360 - 180;
          if (lat < -58) continue;
          for (let p = 0; p < LAND.length; p++) { const bx = boxes[p]; if (lon >= bx[0] && lon <= bx[1] && lat >= bx[2] && lat <= bx[3] && inPoly(lon, lat, LAND[p])) { landLat.push(lat); landLon.push(lon); break; } }
        }
        GL.landN = landLat.length;
        GL.ls = Float32Array.from(landLat, v => Math.sin(v * DEG)); GL.lc = Float32Array.from(landLat, v => Math.cos(v * DEG)); GL.ll = Float32Array.from(landLon, v => v * DEG);
        const rnd = K.rng(77), gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
        const lat = [], lon = [], kind = [];
        CITIES.forEach(([lo, la, w]) => { const k = Math.round(5 + w * 5), sg = 0.45 + w * 0.4; for (let m = 0; m < k; m++) { lat.push(la + (m ? gauss() * sg * 0.8 : 0)); lon.push(lo + (m ? gauss() * sg : 0)); kind.push(m ? 1 : 2); } });
        for (let i = 0; i < GL.landN; i++) if (Math.abs(landLat[i]) < 60 && rnd() < 0.3) { lat.push(landLat[i] + (rnd() - 0.5) * 1.6); lon.push(landLon[i] + (rnd() - 0.5) * 1.6); kind.push(3); }
        const home = VENUE.home; lat.push(home[0]); lon.push(home[1]); kind.push(4);
        GL.n = lat.length; GL.s = Float32Array.from(lat, v => Math.sin(v * DEG)); GL.c = Float32Array.from(lat, v => Math.cos(v * DEG)); GL.l = Float32Array.from(lon, v => v * DEG);
        GL.k = Uint8Array.from(kind); GL.on = new Float64Array(GL.n).fill(Infinity); GL.hd = new Float32Array(GL.n);
        const hs = Math.sin(home[0] * DEG), hc = Math.cos(home[0] * DEG), hl = home[1] * DEG;
        for (let i = 0; i < GL.n; i++) GL.hd[i] = Math.acos(clamp(hs * GL.s[i] + hc * GL.c[i] * Math.cos(GL.l[i] - hl), -1, 1));
        GL.lon = home[1]; GL.lat = clamp(home[0], -35, 45);
      }
      /* 'home': the lights around the stadium; 'ripple': everything facing us, rippling out from home; 'spin': lights switch on as they turn to face us */
      function globeLights(tn, mode) {
        if (!GL.built) return;
        const lat0 = GL.lat * DEG, lon0 = GL.lon * DEG, s0 = Math.sin(lat0), c0 = Math.cos(lat0), cores = [];
        for (let i = 0; i < GL.n; i++) {
          if (GL.on[i] !== Infinity) continue;
          if (mode === 'home') { if (GL.hd[i] < 0.09) GL.on[i] = tn + GL.hd[i] * 4000; continue; }
          const cc = s0 * GL.s[i] + c0 * GL.c[i] * Math.cos(GL.l[i] - lon0);
          if (mode === 'ripple') { if (cc > 0.04) { GL.on[i] = tn + GL.hd[i] * 1150 + Math.random() * 180; if (GL.k[i] === 2) cores.push([GL.on[i], i]); } }
          else if (mode === 'all') GL.on[i] = tn + Math.random() * 1200;
          else if (cc > 0.45) { GL.on[i] = tn + 30 + Math.random() * 240; if (GL.k[i] === 2) cores.push([GL.on[i], i]); }
        }
        // a cascade of glassy chimes as the bigger cities light (spaced, never a wall of sound)
        cores.sort((a, b) => a[0] - b[0]);
        let last = Math.max(GL.lastChime, tn - 1000), n = 0;
        cores.forEach(([at, i]) => { if (at - last < 150 || n > 16) return; last = at; n++; const pan = clamp(GL.c[i] * Math.sin(GL.l[i] - lon0), -0.8, 0.8); S.later(() => SND.glass(i, pan), Math.max(0, at - tn)); });
        GL.lastChime = last;
      }
      const spaceCv = document.createElement('canvas'), stageCv = document.createElement('canvas');
      let stageKey = '';
      let spaceKey = '';
      function renderSpace() {
        const W = M.W, H = M.H, dpr = cv.dpr || 1; spaceKey = W + 'x' + H + (bright() ? 'b' : 'd');
        spaceCv.width = Math.max(2, Math.round(W * dpr)); spaceCv.height = Math.max(2, Math.round(H * dpr));
        const g = spaceCv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#01020a'); gr.addColorStop(1, bright() ? '#0b1838' : '#050918'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        const neb = K.glowSprite('#3a2a7a'); g.globalAlpha = 0.35; g.drawImage(neb, -W * 0.3, H * 0.05, W * 1.1, H * 0.5); g.globalAlpha = 0.25; g.drawImage(K.glowSprite('#1f4a8a'), W * 0.3, H * 0.55, W * 0.9, H * 0.5);
        const rnd = K.rng(41); g.fillStyle = '#ffffff';
        for (let i = 0; i < 260; i++) { const x = rnd() * W, y = rnd() * H, a = 0.15 + rnd() * 0.65, s = rnd() < 0.08 ? 1.8 : 1; g.globalAlpha = a; g.fillRect(x, y, s, s); }
        g.globalAlpha = 1;
      }

      /* ---------------- drawing ---------------- */
      let shX = 0, shY = 0;
      const glowSpr = {};
      const glow = (c) => glowSpr[c] || (glowSpr[c] = K.glowSprite(c));
      function drawBackground(g, PA) {
        const W = M.W, H = M.H;
        const hy = CAM.el < 1.5 ? CY0 - FF * Math.tan(CAM.el) : -1e5;
        if (hy > -10) {
          let gr = g.createLinearGradient(0, Math.min(0, hy - 400), 0, hy);
          gr.addColorStop(0, PA.sky0); gr.addColorStop(0.7, PA.sky1); gr.addColorStop(1, PA.sky2);
          g.fillStyle = gr; g.fillRect(0, 0, W, Math.max(0, hy));
          if (!bright()) { g.fillStyle = '#ffffff'; const rnd = K.rng(9); for (let i = 0; i < 70; i++) { const x = rnd() * W, y = rnd() * hy; g.globalAlpha = 0.25 + rnd() * 0.5; g.fillRect(x, y, 1.3, 1.3); } g.globalAlpha = 1; }
        }
        const gy = Math.max(0, hy);
        let gr = g.createLinearGradient(0, gy, 0, H);
        gr.addColorStop(0, bright() ? '#585a7a' : mix('#0b0f1f', '#140e1c', 0.3)); gr.addColorStop(0.08, PA.ground1); gr.addColorStop(1, PA.ground0);
        g.fillStyle = gr; g.fillRect(0, gy, W, H - gy);
        if (hy > -10 && hy < H) { g.globalAlpha = bright() ? 0.28 : 0.22; g.drawImage(glow(VENUE.haze), -W * 0.3, hy - 50, W * 1.6, 100); g.globalAlpha = 1; }
      }
      function drawCity(g, PA, alphaMul) {
        const n = CITY.n, cx = CITY.x, cy = CITY.y, cc = CITY.c, cb = CITY.b, W = M.W, H = M.H;
        for (let col = 0; col < 3; col++) {
          g.fillStyle = PA.city[col]; g.beginPath();
          for (let i = 0; i < n; i++) {
            if (cc[i] !== col) continue;
            if (!proj(cx[i], cy[i], 0)) continue;
            const x = Q.x, y = Q.y; if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
            const s = clamp(Q.s * 4, 0.7, 2.2);
            g.rect(x - s / 2, y - s / 2, s, s);
          }
          g.globalAlpha = (col === 0 ? 0.55 : col === 1 ? 0.4 : 0.5) * alphaMul; g.fill();
        }
        g.globalAlpha = 1;
      }
      function ringPts(a, b, z, j0, j1, step) { const pts = []; for (let j = j0; j <= j1; j += step) { const th = j / 72 * TAU; if (proj(a * Math.cos(th), b * Math.sin(th), z)) pts.push([Q.x, Q.y]); else pts.push(null); } return pts; }
      function band(g, inn, out, color, j0, j1) {
        g.fillStyle = color; g.beginPath();
        for (let k = j0; k < j1; k++) { const a = inn[k], b = inn[k + 1], c = out[k + 1], d = out[k]; if (!a || !b || !c || !d) continue; g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); }
        g.fill();
      }
      function drawField(g, PA, tn) {
        const b = bright(), fl = st.flood, F2 = VENUE.field;
        const quad = (pts, col) => { const q = []; for (const [x, y] of pts) { if (!proj(x, y, 0)) return; q.push([Q.x, Q.y]); } g.fillStyle = col; g.beginPath(); q.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
        const line = (pts, closed) => { g.beginPath(); let ok = false; pts.forEach(([x, y], k) => { if (proj(x, y, 0)) { if (!ok) { g.moveTo(Q.x, Q.y); ok = true; } else g.lineTo(Q.x, Q.y); } }); if (closed) g.closePath(); g.stroke(); };
        const circ = (cx, cy, r, n) => { const pts = []; for (let k = 0; k <= (n || 28); k++) { const a = k / (n || 28) * TAU; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return pts; };
        // the apron inside the bowl
        const ap = []; for (let k = 0; k <= 48; k++) { const a = k / 48 * TAU; ap.push([(A0 - 0.6) * Math.cos(a), (B0 - 0.6) * Math.sin(a)]); }
        quad(ap, b ? mix('#3d5a4a', '#4f8a62', fl) : mix('#0b1a14', '#1d4a30', fl));
        const g1 = b ? mix('#4f8f5a', '#5fbf6a', fl) : mix('#11301f', '#2f8f4f', fl), g2 = b ? mix('#478452', '#55b161', fl) : mix('#0e2a1b', '#2a8147', fl);
        g.lineWidth = Math.max(1, Q.s * 0.25); g.strokeStyle = 'rgba(255,255,255,' + (0.25 + fl * 0.5).toFixed(2) + ')';
        if (F2 === 'pitch' || F2 === 'stage') {
          for (let s = 0; s < 10; s++) quad([[-34, -52.5 + s * 10.5], [34, -52.5 + s * 10.5], [34, -52.5 + (s + 1) * 10.5], [-34, -52.5 + (s + 1) * 10.5]], s % 2 ? g1 : g2);
          proj(0, 0, 0); g.lineWidth = Math.max(1, Q.s * 0.3);
          line([[-34, -52.5], [34, -52.5], [34, 52.5], [-34, 52.5]], true); line([[-34, 0], [34, 0]]); line(circ(0, 0, 9.15)); line([[-20, -52.5], [-20, -36], [20, -36], [20, -52.5]]); line([[-20, 52.5], [-20, 36], [20, 36], [20, 52.5]]);
          if (F2 === 'stage') {
            quad([[-22, 40], [22, 40], [22, 52], [-22, 52]], b ? '#2a2236' : '#120c1c');
            const tr = []; [[-22, 52], [22, 52]].forEach(([x, y]) => { if (proj(x, y, 0)) { const a = [Q.x, Q.y]; if (proj(x, y, 16)) tr.push([a, [Q.x, Q.y]]); } });
            g.strokeStyle = b ? '#b8b0c8' : '#8a7aa8'; g.lineWidth = Math.max(1.5, Q.s * 0.6); tr.forEach(([a, c]) => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.stroke(); });
            if (tr.length === 2) { g.beginPath(); g.moveTo(tr[0][1][0], tr[0][1][1]); g.lineTo(tr[1][1][0], tr[1][1][1]); g.stroke(); }
          }
        } else if (F2 === 'oval') {
          for (let s = 5; s >= 0; s--) { const k = (s + 1) / 6; quad(circ(0, 0, 1, 40).map(([x, y]) => [x * (A0 - 3) * k, y * (B0 - 3) * k]), s % 2 ? g1 : g2); }
          quad([[-1.6, -11], [1.6, -11], [1.6, 11], [-1.6, 11]], b ? '#d8c08a' : mix('#3a3020', '#c8a86a', fl));
          line(circ(0, 0, 1, 48).map(([x, y]) => [x * (A0 - 4), y * (B0 - 4)]));
        } else if (F2 === 'ice') {
          const ice = b ? mix('#cfe2ee', '#f2f8ff', fl) : mix('#1a2a38', '#d8ecf8', fl);
          const rr = []; [[22, 40], [-22, 40], [-22, -40], [22, -40]].forEach(([cx, cy], q) => { for (let k = 0; k <= 6; k++) { const a = (q * 0.25 + k / 24) * TAU; rr.push([cx + Math.cos(a) * 12, cy + Math.sin(a) * 12]); } });
          quad(rr, ice);
          g.strokeStyle = 'rgba(200,40,60,' + (0.3 + fl * 0.5).toFixed(2) + ')'; line([[-34, 0], [34, 0]]); line(circ(0, 0, 6));
          g.strokeStyle = 'rgba(40,90,200,' + (0.3 + fl * 0.5).toFixed(2) + ')'; line([[-34, -17], [34, -17]]); line([[-34, 17], [34, 17]]);
        } else {
          const tk = b ? mix('#a8503c', '#d0603e', fl) : mix('#2a1210', '#a8442e', fl);
          quad(circ(0, 0, 1, 48).map(([x, y]) => [x * (A0 - 1.5), y * (B0 - 1.5)]), tk);
          quad(circ(0, 0, 1, 48).map(([x, y]) => [x * (A0 - 9), y * (B0 - 9)]), g1);
          for (let k = 1; k < 5; k++) line(circ(0, 0, 1, 48).map(([x, y]) => [x * (A0 - 1.5 - k * 1.5), y * (B0 - 1.5 - k * 1.5)]));
        }
        void tn;
      }
      function drawStands(g, PA, tn) {
        const S1 = 1, L0r = RINGS[0], L1r = RINGS[LN - 1], U0 = RINGS[LN], U1 = TOP;
        // rings at 72 segments: lower deck, its front wall, upper deck, the fascia between them
        const lIn = ringPts(L0r.a - 1.2, L0r.b - 1.2, L0r.z - 0.6, 0, 72, S1), lOut = ringPts(L1r.a + 1, L1r.b + 1, L1r.z + 0.5, 0, 72, S1);
        const wBot = ringPts(A0 - 0.6, B0 - 0.6, 0, 0, 72, S1);
        const uIn = ringPts(U0.a - 1.2, U0.b - 1.2, U0.z - 0.6, 0, 72, S1), uOut = ringPts(U1.a + 1.2, U1.b + 1.2, U1.z + 0.8, 0, 72, S1);
        const fBot = ringPts(U0.a - 1.4, U0.b - 1.4, L1r.z + 1.2, 0, 72, S1);
        const outerTop = ringPts(U1.a + 1.4, U1.b + 1.4, U1.z + 1.6, 0, 72, S1), outerBot = ringPts(U1.a + 1.4, U1.b + 1.4, 0, 0, 72, S1);
        // outer wall (seen on the far side above the city), far half first
        band(g, outerBot, outerTop, PA.wall, 0, 36);
        // far half then near half: upper deck, fascia, lower deck, front wall
        [[0, 36], [36, 72]].forEach(([a, b], half) => {
          band(g, uIn, uOut, PA.deck[half ? 2 : 0], a, b);
          band(g, fBot, uIn, PA.wall, a, b);
          band(g, lOut, fBot, PA.deck[1], a, b);
          band(g, lIn, lOut, PA.deck[half ? 2 : 0], a, b);
          band(g, wBot, lIn, PA.wall, a, b);
        });
        // aisles (stairs) between sections
        g.strokeStyle = PA.aisle; g.lineWidth = 1; g.beginPath();
        for (let s = 0; s < 12; s++) { const th = (6 + s * 12 - 0.5) / NCOL * TAU, c = Math.cos(th), sn = Math.sin(th);
          [[L0r, L1r], [U0, U1]].forEach(([r0, r1]) => { if (proj(r0.a * c, r0.b * sn, r0.z)) { const x = Q.x, y = Q.y; if (proj(r1.a * c, r1.b * sn, r1.z)) { g.moveTo(x, y); g.lineTo(Q.x, Q.y); } } }); }
        g.stroke();
      }
      function drawRibbons(g, tn) {
        const L0r = RINGS[0], L1r = RINGS[LN - 1], U0 = RINGS[LN];
        // ribbon boards: an LED strip along the fascia and the pitch wall, chasing in the team colour
        const chase = (tn / 1000) * 40;
        proj(0, B0, 0); g.lineWidth = clamp(Q.s * 0.5, 1, 3); g.setLineDash([3, 5]); g.lineDashOffset = -chase;
        [[ringPts(U0.a - 1.3, U0.b - 1.3, (L1r.z + U0.z) / 2, 0, 36, 1), 0.5 + st.flood * 0.4], [ringPts(A0 - 0.62, B0 - 0.62, L0r.z * 0.55, 0, 36, 1), 0.4 + st.flood * 0.4]].forEach(([pts, a]) => {
          g.strokeStyle = hexA(st.tifo ? '#ff6f91' : VENUE.team, a); g.beginPath(); let on = false; pts.forEach(p => { if (!p) { on = false; return; } if (!on) { g.moveTo(p[0], p[1]); on = true; } else g.lineTo(p[0], p[1]); }); g.stroke();
        });
        g.setLineDash([]);
      }
      function drawRoof(g, PA) {
        const zr = TOP.z + 7.5, out = ringPts(TOP.a + 2.5, TOP.b + 2.5, zr - 1, 0, 72, 1), inn = ringPts(TOP.a - 9, TOP.b - 9, zr + 1.2, 0, 72, 1);
        band(g, inn, out, PA.roof, 5, 31);
        g.strokeStyle = hexA('#c8d4ff', bright() ? 0.35 : 0.18 + st.flood * 0.25); g.lineWidth = 1.2; g.beginPath(); let on = false;
        for (let k = 5; k <= 31; k++) { const p = inn[k]; if (!p) { on = false; continue; } if (!on) { g.moveTo(p[0], p[1]); on = true; } else g.lineTo(p[0], p[1]); }
        g.stroke();
        if (st.flood > 0.05) { g.fillStyle = '#fff6e0'; for (let k = 6; k <= 30; k += 2) { const p = inn[k]; if (!p) continue; g.globalAlpha = st.flood; g.drawImage(glow('#fff1c4'), p[0] - 6, p[1] - 6, 12, 12); g.fillRect(p[0] - 0.8, p[1] - 0.8, 1.6, 1.6); } g.globalAlpha = 1; }
      }
      const TOWERS = [[0.72, 0.76], [-0.72, 0.76], [0.74, -0.7], [-0.74, -0.7]];
      function drawTowers(g, far) {
        const b = bright(), on = st.flood;
        TOWERS.forEach(([fx, fy], i) => {
          if ((fy > 0) !== far) return;
          if (!far && CAM.el < 0.95) { st.towerPts[i] = null; return; }   // the near masts stand behind the booth until the sky cam rises
          const x = fx * (TOP.a + 14) * 1.06, y = fy * (TOP.b + 14) * 1.06, ht = 50;
          const pts = [[x - 2.4, 0], [x + 2.4, 0], [x - 0.9, ht], [x + 0.9, ht]].map(([a, z]) => proj(a, y, z) ? [Q.x, Q.y, Q.s] : null);
          if (pts.some(p => !p)) { st.towerPts[i] = null; return; }
          const [bl, br, tl, tr] = pts, sc = tr[2];
          // a lattice mast
          g.strokeStyle = b ? '#5a6282' : '#232a40'; g.lineWidth = clamp(sc * 0.5, 0.8, 2.6);
          g.beginPath(); g.moveTo(bl[0], bl[1]); g.lineTo(tl[0], tl[1]); g.moveTo(br[0], br[1]); g.lineTo(tr[0], tr[1]);
          for (let k = 0; k < 8; k++) { const u0 = k / 8, u1 = (k + 1) / 8; g.moveTo(lerp(bl[0], tl[0], u0), lerp(bl[1], tl[1], u0)); g.lineTo(lerp(br[0], tr[0], u1), lerp(br[1], tr[1], u1)); }
          g.stroke();
          // the lamp bank
          const hx = (tl[0] + tr[0]) / 2, hy = (tl[1] + tr[1]) / 2, bw = clamp(sc * 10, 9, 54), bh = clamp(sc * 6.4, 6, 34);
          g.fillStyle = b ? '#363c58' : '#0e121d'; g.fillRect(hx - bw / 2 - 2, hy - bh - 2, bw + 4, bh + 4);
          const lw = bw / 4, lh = bh / 3;
          for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { g.fillStyle = on > 0.05 ? mix(b ? '#5a6080' : '#2a3048', '#fffaf0', on) : (b ? '#59607e' : '#1f2538'); g.fillRect(hx - bw / 2 + c * lw + lw * 0.14, hy - bh + r * lh + lh * 0.16, lw * 0.72, lh * 0.68); }
          st.towerPts[i] = { x: hx, y: hy - bh / 2, w: bw, s: sc };
        });
      }
      function drawBeams(g) {
        const on = st.flood; if (on < 0.02) return;
        const b = bright();
        g.save(); g.globalCompositeOperation = 'lighter';
        st.towerPts.forEach((tp) => {
          if (!tp) return;
          if (proj(0, 0, 0)) {
            const tx = Q.x, ty = Q.y, dx = tx - tp.x, dy = ty - tp.y, len = Math.hypot(dx, dy) || 1, px = -dy / len, py = dx / len, spread = Math.min(M.W * 0.42, len * 0.55);
            const gr = g.createLinearGradient(tp.x, tp.y, tx, ty); gr.addColorStop(0, 'rgba(255,246,222,' + (on * (b ? 0.06 : 0.2)).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,246,222,0)');
            g.fillStyle = gr; g.beginPath(); g.moveTo(tp.x - px * tp.w * 0.5, tp.y - py * tp.w * 0.5); g.lineTo(tp.x + px * tp.w * 0.5, tp.y + py * tp.w * 0.5); g.lineTo(tx + px * spread, ty + py * spread); g.lineTo(tx - px * spread, ty - py * spread); g.closePath(); g.fill();
          }
          const gs = clamp(tp.s * 70, 50, 280); g.globalAlpha = on * (b ? 0.32 : 0.9); g.drawImage(glow('#fff4d6'), tp.x - gs / 2, tp.y - gs / 2, gs, gs); g.globalAlpha = 1;
        });
        g.restore();
      }
      function drawSeats(g, PA, tn, t) {
        const W = M.W, H = M.H, wave = st.waveOn, wk = tn - st.waveT0, lap = st.lap || 2100;
        const phi = (Math.PI / 2 + 0.6) - (wk / lap) * TAU, smax = M.wide ? 4.2 : 3.6;
        // project every seat (a seat in the wave stands up a little)
        for (let i = 0; i < NS; i++) {
          let z = WZ[i], w = 0;
          if (wave && wk > 0 && i < NST && LIT[i] <= tn) { let d = (CL[i] / NCOL * TAU - phi) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; w = Math.exp(-(d * d) / 0.07); z += w * 1.4; }
          WV[i] = w;
          if (!proj(WX[i], WY[i], z)) { PV[i] = 0; continue; }
          const x = Q.x, y = Q.y; if (x < -6 || x > W + 6 || y < -6 || y > H + 6) { PV[i] = 0; continue; }
          PV[i] = 1; PX[i] = x; PY[i] = y; PS[i] = clamp(Q.s * 1.1, 0.8, smax) * (1 + w * 0.35);
        }
        const off = [], buckets = [[], [], [], [], [], []]; // lit, standing in the wave, tifo ground, tifo letter, stripe, just lit
        const TB = [0, 2, 3, 4, 0];
        for (let i = 0; i < NS; i++) {
          if (!PV[i] || i === YOU) continue;
          const lt = LIT[i];
          if (lt === Infinity || lt > tn) { off.push(i); continue; }
          let b = 0;
          if (tn - lt < 260) b = 5;
          else if (st.tifo && FLIP[i] <= tn && TIFO[i]) b = TB[TIFO[i]];
          if (WV[i] > 0.45 && b !== 3) b = 1;
          buckets[b].push(i);
        }
        // unlit seats: short segments along each ring, so the stands read as rows of seats
        g.strokeStyle = PA.seatOff; g.fillStyle = PA.seatOff; g.lineCap = 'round';
        [[0, 1.5, 0.9], [1.5, 2.6, 1.3], [2.6, 99, 1.8]].forEach(([lo, hi, lw]) => {
          g.lineWidth = lw; g.beginPath();
          for (const i of off) {
            const s = PS[i]; if (s < lo || s >= hi) continue;
            if (i >= NST) { g.moveTo(PX[i] + s * 0.4, PY[i]); g.arc(PX[i], PY[i], s * 0.4, 0, TAU); continue; }
            const base = RG[i] * NCOL, nx = base + (CL[i] + 1) % NCOL, pv = base + (CL[i] + NCOL - 1) % NCOL;
            let dx = 0, dy = 0;
            if (PV[nx]) { dx = PX[nx] - PX[i]; dy = PY[nx] - PY[i]; } else if (PV[pv]) { dx = PX[i] - PX[pv]; dy = PY[i] - PY[pv]; }
            const d = Math.hypot(dx, dy); if (d > 40) { dx *= 40 / d; dy *= 40 / d; }
            g.moveTo(PX[i] - dx * 0.28, PY[i] - dy * 0.28); g.lineTo(PX[i] + dx * 0.28 + 0.01, PY[i] + dy * 0.28);
          }
          g.stroke();
        });
        g.lineCap = 'butt';
        const cols = [PA.lit, PA.litHot, PA.tifoBg, PA.tifoTxt, PA.stripe, '#ffffff'];
        // the card stunt: far-stand seats become cards that tile the stand, each one flipping as the wave passes
        const cardHalf = (i) => {
          const r = RG[i], base = r * NCOL, j = CL[i], jr = base + (j + 1) % NCOL, jl = base + (j + NCOL - 1) % NCOL;
          let ax, ay, bx, by;
          if (PV[jr] && PV[jl]) { ax = (PX[jl] - PX[jr]) / 4; ay = (PY[jl] - PY[jr]) / 4; } else if (PV[jr]) { ax = (PX[i] - PX[jr]) / 2; ay = (PY[i] - PY[jr]) / 2; } else if (PV[jl]) { ax = (PX[jl] - PX[i]) / 2; ay = (PY[jl] - PY[i]) / 2; } else return null;
          const up = r + 1 < NR && r !== LN - 1 ? i + NCOL : -1, dn = r > 0 && r !== LN ? i - NCOL : -1;
          if (up >= 0 && dn >= 0 && PV[up] && PV[dn]) { bx = (PX[up] - PX[dn]) / 4; by = (PY[up] - PY[dn]) / 4; } else if (up >= 0 && PV[up]) { bx = (PX[up] - PX[i]) / 2; by = (PY[up] - PY[i]) / 2; } else if (dn >= 0 && PV[dn]) { bx = (PX[i] - PX[dn]) / 2; by = (PY[i] - PY[dn]) / 2; } else return null;
          return [ax, ay, bx, by];
        };
        const cardsLit = [];
        [2, 3].forEach(bi => {
          const list = buckets[bi]; if (!list.length) return;
          g.fillStyle = cols[bi]; g.beginPath();
          const keep = [];
          for (const i of list) {
            if (SIN[CL[i]] <= 0.25) { keep.push(i); continue; }
            const v = cardHalf(i); if (!v) { keep.push(i); continue; }
            const f = clamp((tn - FLIP[i]) / 240, 0, 1), fx = (0.15 + 0.85 * f) * 0.94, fy = 0.9;
            const x = PX[i], y = PY[i], ax = v[0] * fx, ay = v[1] * fx, bx = v[2] * fy, by = v[3] * fy;
            g.moveTo(x - ax - bx, y - ay - by); g.lineTo(x + ax - bx, y + ay - by); g.lineTo(x + ax + bx, y + ay + by); g.lineTo(x - ax + bx, y - ay + by); g.closePath();
            if (bi === 3) cardsLit.push(i);
          }
          g.fill();
          buckets[bi] = keep;
        });
        buckets.forEach((list, bi) => {
          if (!list.length) return;
          g.fillStyle = cols[bi]; g.beginPath();
          const mul = bi === 5 ? 1.5 : bi === 1 ? 1.25 : bi === 3 ? 1.45 : 1;
          for (const i of list) { const s = PS[i] * mul, x = PX[i], y = PY[i];
            if (s > 2.4) { g.moveTo(x + s / 2, y); g.arc(x, y, s / 2, 0, TAU); } else g.rect(x - s / 2, y - s / 2, s, s); }
          g.fill();
        });
        // bloom: the lit seats again at quarter size, upscaled softly
        const bw = bloomCv.width, bh = bloomCv.height, sx = bw / W, sy = bh / H;
        bloomG.setTransform(1, 0, 0, 1, 0, 0); bloomG.globalCompositeOperation = 'source-over'; bloomG.fillStyle = '#000'; bloomG.fillRect(0, 0, bw, bh);
        const bcols = [cols[0], cols[1], '#3a0a1c', '#ffffff', cols[4], cols[5]];
        if (cardsLit.length) { bloomG.fillStyle = '#ffffff'; bloomG.beginPath(); for (const i of cardsLit) { const s = Math.max(1.2, PS[i] * sx * 2.4); bloomG.rect(PX[i] * sx - s / 2, PY[i] * sy - s / 2, s, s); } bloomG.fill(); }
        buckets.forEach((list, bi) => { if (!list.length) return; bloomG.fillStyle = bcols[bi]; bloomG.beginPath(); for (const i of list) { const s = Math.max(1, PS[i] * sx * 1.8); bloomG.rect(PX[i] * sx - s / 2, PY[i] * sy - s / 2, s, s); } bloomG.fill(); });
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = bright() ? 0.5 : 0.85; g.imageSmoothingEnabled = true; g.drawImage(bloomCv, 0, 0, W, H); g.restore();
        void t;
      }
      /* the light layer: what twinkles between redraws of the stadium (your seat, phone lights, camera flashes, the fan cam ring) */
      function drawLife(g, tn, t) {
        const PA = pal();
        if (st.stage >= 0 && !st.waveOn) {
          const ts = Math.floor(t * 3), tf = Math.floor(t * 8), hot = [], flash = [];
          for (let i = 0; i < NS; i++) { if (!PV[i] || i === YOU || LIT[i] > tn - 300 || (st.tifo && FLIP[i] <= tn && SIN[CL[i]] > 0.25)) continue; if (((i * 7919 + ts * 13) % 31) === 0) hot.push(i); else if (st.stage >= 1 && ((Math.imul(i, 2654435761) + tf * 977) >>> 0) % 2300 === 0) flash.push(i); }
          g.fillStyle = PA.litHot; g.beginPath(); for (const i of hot) { const s = PS[i] * 1.3; g.rect(PX[i] - s / 2, PY[i] - s / 2, s, s); } g.fill();
          g.globalCompositeOperation = 'lighter';
          for (const i of flash) { const s = PS[i] * 7 + 6; g.drawImage(glow('#ffffff'), PX[i] - s / 2, PY[i] - s / 2, s, s); }
          g.globalAlpha = 0.5; for (let k = 0; k < hot.length; k += 3) { const i = hot[k], s = PS[i] * 5 + 4; g.drawImage(glow('#ffe7a0'), PX[i] - s / 2, PY[i] - s / 2, s, s); }
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        }
        // your seat
        if (PV[YOU]) {
          const x = PX[YOU], y = PY[YOU], s = PS[YOU], pul = 0.5 + 0.5 * Math.sin(t * 3.2);
          g.save(); g.globalCompositeOperation = 'lighter'; const gs = st.tifo ? s * 3 + 8 : s * (10 + pul * 6) + 18; g.globalAlpha = st.tifo ? 0.6 : 0.9; g.drawImage(glow(PA.you), x - gs / 2, y - gs / 2, gs, gs); g.restore();
          g.fillStyle = PA.you; g.beginPath(); g.arc(x, y, Math.max(2.2, s * 0.85), 0, TAU); g.fill();
          g.strokeStyle = hexA('#ffffff', 0.5 + pul * 0.4); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, Math.max(5, s * 2) + pul * 3, 0, TAU); g.stroke();
        }
        if (st.flashSeat != null && PV[st.flashSeat]) { const k = (tn - st.flashT) / 900; if (k < 1) { const x = PX[st.flashSeat], y = PY[st.flashSeat]; g.strokeStyle = hexA('#ffffff', 1 - k); g.lineWidth = 2; g.beginPath(); g.arc(x, y, 6 + k * 26, 0, TAU); g.stroke(); } }
      }
      function drawFloodHaze(g) {
        if (st.flood < 0.02) return;
        if (!proj(0, 0, 18)) return;
        const r = clamp(Q.s * 120, 120, M.W * 1.1);
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = st.flood * (bright() ? 0.06 : 0.22); g.drawImage(glow('#fff2d0'), Q.x - r, Q.y - r * 0.7, r * 2, r * 1.4); g.restore();
      }
      const WEATHER = Array.from({ length: VENUE.weather === 'clear' ? 0 : 70 }, (_, i) => ({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random(), p: i }));
      function drawWeather(g, dt) {
        if (!WEATHER.length || st.sky > 0.3) return;
        const W = M.W, H = M.H, snow = VENUE.weather === 'snow';
        g.strokeStyle = 'rgba(200,215,240,0.35)'; g.fillStyle = 'rgba(240,246,255,0.8)'; g.lineWidth = 1; g.beginPath();
        WEATHER.forEach(w => {
          w.y += dt * (snow ? 0.05 : 0.9) * w.s; w.x += dt * (snow ? Math.sin(w.y * 9 + w.p) * 0.01 : -0.08);
          if (w.y > 1) { w.y -= 1; w.x = Math.random(); } if (w.x < 0) w.x += 1;
          const x = w.x * W, y = w.y * H;
          if (snow) { g.moveTo(x + 1.4 * w.s, y); g.arc(x, y, 1.4 * w.s, 0, TAU); } else { g.moveTo(x, y); g.lineTo(x - 3, y + 12 * w.s); }
        });
        if (snow) g.fill(); else g.stroke();
      }
      function renderDesk() {
        deskDirty = false;
        const W = M.W, H = M.H, dpr = cv.dpr || 1, top = M.deskY, hh = H - top + 4;
        deskCv.width = Math.max(2, Math.round(W * dpr)); deskCv.height = Math.max(2, Math.round(hh * dpr));
        const g = deskCv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        let gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#2a3144'); gr.addColorStop(0.08, '#1a2030'); gr.addColorStop(1, '#0a0d14');
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, 14); g.lineTo(W, 14); g.lineTo(W, hh); g.lineTo(0, hh); g.closePath(); g.fill();
        gr = g.createLinearGradient(0, 0, 0, 16); gr.addColorStop(0, '#4a5570'); gr.addColorStop(1, '#232a3b');
        g.fillStyle = gr; g.beginPath(); g.moveTo(-10, 16); g.lineTo(W + 10, 16); g.lineTo(W + 10, 4); g.lineTo(-10, 4); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(0, 4, W, 1);
        // little console details: a row of buttons and a fader bank (left of the lever)
        const right = M.lv.x - 10, by = 34 + (M.wide ? 10 : 0);
        for (let i = 0; i < 9; i++) { const x = right - 16 - i * 16; if (x < M.chars[2].x + M.cs + 8) break; g.fillStyle = ['#ff6f91', '#ffc94d', '#5fe0b0', '#3fb6ff'][i % 4]; g.globalAlpha = 0.55; g.fillRect(x, by, 9, 5); }
        g.globalAlpha = 1;
      }
      function drawDesk(g, off) {
        if (deskDirty) renderDesk();
        const H = M.H, top = M.deskY + off;
        if (top > H) return;
        g.drawImage(deskCv, 0, top, M.W, H - M.deskY + 4);
      }
      function drawVU(g, off) {
        const H = M.H, top = M.deskY + off; if (top > H) return;
        // a VU meter that dances with the drum
        const beat = Math.exp(-(now() - st.beatT) / 240), x0 = M.chars[2].x + M.cs + 14, x1 = Math.min(M.lv.x - 14, x0 + (M.wide ? 230 : 140)), y = top + (M.wide ? 66 : 54);
        const n = Math.floor((x1 - x0) / 9); if (n < 4) return;
        for (let i = 0; i < n; i++) { const lvl = clamp(0.25 + beat * (0.9 - Math.abs(i - n / 2) / n) + Math.sin(i * 1.7 + now() / 300) * 0.08, 0, 1), hh = 4 + lvl * (M.wide ? 34 : 24); g.fillStyle = i > n * 0.75 ? '#ff6f91' : i > n * 0.5 ? '#ffc94d' : '#5fe0b0'; g.globalAlpha = 0.75; g.fillRect(x0 + i * 9, y + (M.wide ? 40 : 28) - hh, 6, hh); }
        g.globalAlpha = 1;
      }
      function drawGlobe(g, tn, t, alpha, scale) {
        if (!GL.built) buildGlobe();
        const W = M.W, H = M.H, R0 = M.globe.r * scale, gx = M.globe.x, gy = M.globe.y, b = bright();
        if (spaceKey !== W + 'x' + H + (b ? 'b' : 'd')) renderSpace();
        g.save(); g.globalAlpha = alpha;
        g.drawImage(spaceCv, 0, 0, W, H);
        // atmosphere halo, then the ocean
        const ag = R0 * 1.42; g.globalAlpha = alpha * 0.75; g.drawImage(glow('#2a6dff'), gx - ag, gy - ag, ag * 2, ag * 2); g.globalAlpha = alpha;
        let gr = g.createRadialGradient(gx - R0 * 0.38, gy - R0 * 0.42, R0 * 0.05, gx, gy, R0);
        gr.addColorStop(0, b ? '#1c4a92' : '#10295a'); gr.addColorStop(0.65, b ? '#0e2c62' : '#0a1b40'); gr.addColorStop(1, '#040b20');
        g.fillStyle = gr; g.beginPath(); g.arc(gx, gy, R0, 0, TAU); g.fill();
        const lat0 = GL.lat * DEG, lon0 = GL.lon * DEG, s0 = Math.sin(lat0), c0 = Math.cos(lat0);
        // land: a dotted map
        const ds = clamp(R0 / 64, 1.1, 3.2);
        g.fillStyle = b ? '#6688c4' : '#4a6cae'; g.beginPath();
        for (let i = 0; i < GL.landN; i++) {
          const dl = GL.ll[i] - lon0, cd = Math.cos(dl), cc = s0 * GL.ls[i] + c0 * GL.lc[i] * cd;
          if (cc <= 0.03) continue;
          const x = gx + R0 * GL.lc[i] * Math.sin(dl), y = gy - R0 * (c0 * GL.ls[i] - s0 * GL.lc[i] * cd);
          if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
          const s = ds * (0.45 + cc * 0.55); g.rect(x - s / 2, y - s / 2, s, s);
        }
        g.globalAlpha = alpha * 0.85; g.fill(); g.globalAlpha = alpha;
        // lights: sharp dots plus a soft bloom pass
        const bw = bloomCv.width, bh = bloomCv.height, sx = bw / W, sy = bh / H;
        bloomG.setTransform(1, 0, 0, 1, 0, 0); bloomG.fillStyle = '#000'; bloomG.fillRect(0, 0, bw, bh);
        const town = [], core = [], fresh = [];
        let hx = null, hy = null;
        for (let i = 0; i < GL.n; i++) {
          const on = GL.on[i]; if (on > tn) continue;
          const dl = GL.l[i] - lon0, cd = Math.cos(dl), cc = s0 * GL.s[i] + c0 * GL.c[i] * cd;
          if (cc <= 0.02) continue;
          const x = gx + R0 * GL.c[i] * Math.sin(dl), y = gy - R0 * (c0 * GL.s[i] - s0 * GL.c[i] * cd);
          if (x < -6 || x > W + 6 || y < -6 || y > H + 6) continue;
          const k = GL.k[i];
          if (k === 4) { hx = x; hy = y; continue; }
          (tn - on < 320 ? fresh : k === 2 ? core : town).push(x, y, cc, k);
        }
        const pass = (arr, col, size, toBloom) => {
          if (!arr.length) return;
          g.fillStyle = col; g.beginPath();
          for (let k = 0; k < arr.length; k += 4) { const s = size * (arr[k + 3] === 3 ? 0.75 : 1) * (0.55 + arr[k + 2] * 0.45); g.rect(arr[k] - s / 2, arr[k + 1] - s / 2, s, s); }
          g.fill();
          if (toBloom) { bloomG.fillStyle = col; bloomG.beginPath(); for (let k = 0; k < arr.length; k += 4) { const s = Math.max(1, size * sx * 2.2); bloomG.rect(arr[k] * sx - s / 2, arr[k + 1] * sy - s / 2, s, s); } bloomG.fill(); }
        };
        const ls = clamp(R0 / 80, 1.2, 3);
        pass(town, '#ffbf5a', ls, true); pass(core, '#ffe7b0', ls * 1.35, true); pass(fresh, '#ffffff', ls * 1.8, true);
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha * 0.9; g.imageSmoothingEnabled = true; g.drawImage(bloomCv, 0, 0, W, H);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = alpha;
        // the limb: darker towards the edge, a thin bright atmosphere line, and a sunlit crescent by day
        gr = g.createRadialGradient(gx, gy, R0 * 0.72, gx, gy, R0); gr.addColorStop(0, 'rgba(2,6,18,0)'); gr.addColorStop(1, 'rgba(2,6,18,.62)'); g.fillStyle = gr; g.beginPath(); g.arc(gx, gy, R0, 0, TAU); g.fill();
        if (b) { gr = g.createLinearGradient(gx + R0 * 0.15, gy - R0 * 0.2, gx + R0, gy + R0 * 0.1); gr.addColorStop(0, 'rgba(130,200,255,0)'); gr.addColorStop(1, 'rgba(150,215,255,.32)'); g.fillStyle = gr; g.beginPath(); g.arc(gx, gy, R0, 0, TAU); g.fill(); }
        g.strokeStyle = 'rgba(130,190,255,.75)'; g.lineWidth = 1.6; g.beginPath(); g.arc(gx, gy, R0 + 0.8, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(90,150,255,.22)'; g.lineWidth = 5; g.beginPath(); g.arc(gx, gy, R0 + 3.5, 0, TAU); g.stroke();
        // home: a pulsing ring around your stadium
        if (hx != null) { const p = (t * 0.7) % 1; g.strokeStyle = hexA('#ff6f91', 1 - p); g.lineWidth = 2; g.beginPath(); g.arc(hx, hy, 5 + p * 18, 0, TAU); g.stroke(); g.fillStyle = '#ff6f91'; g.beginPath(); g.arc(hx, hy, 3, 0, TAU); g.fill(); }
        g.restore();
        return hx != null ? { x: hx, y: hy } : null;
      }

      /* ---------------- the frame loop: the stadium redraws only when something moves; the light layer every frame ---------------- */
      st.towerPts = [];
      let frameN = 0, dirtyUntil = 0, lastDeskOff = -1;
      const markDirty = (ms) => { dirtyUntil = Math.max(dirtyUntil, now() + (ms || 60)); };
      K.loop((dt, t) => {
        if (!M.W || !cv.g) return;
        const tn = now();
        while (beatQ.length && beatQ[0].at <= tn) { const b = beatQ.shift(); st.beatT = b.at; st.beatN = b.i; lever.style.setProperty('--beat', '1'); }
        if (tn - st.beatT > 140) lever.style.setProperty('--beat', '0');
        // lever spring
        if (!LV.grab && LV.k > 0) { const a = -70 * LV.k - 10 * LV.v; LV.v += a * dt; LV.k += LV.v * dt; if (LV.k <= 0) { LV.k = 0; LV.v = Math.abs(LV.v) > 0.6 ? -LV.v * 0.2 : 0; } }
        const ly = (LV.k * (M.lv.travel || 100)).toFixed(1);
        if (ly !== st.lvY) { st.lvY = ly; handleEl.style.setProperty('--y', ly + 'px'); lever.style.setProperty('--k', LV.k.toFixed(3)); lever.setAttribute('aria-valuenow', String(Math.round(LV.k * 100))); }
        st.flood += (st.floodTo - st.flood) * Math.min(1, dt * 1.6); if (Math.abs(st.floodTo - st.flood) < 0.004) st.flood = st.floodTo;
        const camMoving = camUpdate(tn);
        if (st.skyMode) {
          const k = clamp((tn - st.skyT0) / st.skyDur, 0, 1), e = K.ease.inOutSine(k);
          st.sky = lerp(st.skyFrom, st.skyTo, e); skyApply(st.sky);
          if (k >= 1) { const m = st.skyMode; st.skyMode = ''; const w = st.waits[m]; st.waits[m] = null; if (w) w(); }
        }
        const globePhase = st.phase === 'spin' || st.phase === 'globeIdle';
        if (globePhase) {
          if (!GL.drag) { GL.v *= Math.pow(0.12, dt); if (Math.abs(GL.v) < 4) GL.v = 4 * Math.sign(GL.v || -1); const deg = GL.v * dt; GL.lon += deg; if (st.phase === 'spin' && GL.total < 2000) GL.total += Math.abs(deg) * 0.4; }
          globeLights(tn, 'spin');
        }
        if (LED.dirty) ledDraw(tn);
        frameN++;
        if (st.shake > 0) { st.shake = Math.max(0, st.shake - dt * 2.8); shX = (Math.random() - 0.5) * st.shake * 10; shY = (Math.random() - 0.5) * st.shake * 7; if (!st.shake) markDirty(); } else { shX = shY = 0; }
        const sk = st.sky, ga = smooth(0.6, 0.72, sk), sa = 1 - smooth(0.63, 0.74, sk);
        const deskOff = st.deskOff || 0; if (deskOff !== lastDeskOff) { lastDeskOff = deskOff; markDirty(); }
        const dirty = frameN < 4 || camMoving || st.skyMode !== '' || st.shake > 0 || tn < dirtyUntil || tn < (st.lightT || 0) + 400 || st.waveOn || tn < (st.tifoEnd || 0) || st.flood !== st.floodTo || ga > 0.001;
        // the globe turns slowly, so it redraws at half rate unless you're spinning it
        if (dirty && !(ga > 0.999 && !GL.drag && frameN % 2)) {
          if (deskDirty) renderDesk();
          const g = cv.g, W = M.W, H = M.H, dpr = cv.dpr || 1;
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          const PA = pal();
          if (sa > 0.001) {
            camSetup(shX, shY);
            // everything that only moves with the camera is cached while the camera is still
            const still = !camMoving && !st.skyMode && !st.shake, key = still ? [CAM.tx, CAM.ty, CAM.tz, CAM.Dc, CAM.el, st.flood].map(v => v.toFixed(3)).join(',') + (bright() ? 'b' : 'd') + W + 'x' + H + dpr : '';
            const staticPass = (gg) => { drawBackground(gg, PA); drawCity(gg, PA, 0.55 + smooth(0, 0.3, sk) * 0.6); drawTowers(gg, true); drawField(gg, PA, tn); drawStands(gg, PA, tn); drawRoof(gg, PA); drawTowers(gg, false); };
            if (still) {
              if (key !== stageKey) { stageKey = key; stageCv.width = Math.max(2, Math.round(W * dpr)); stageCv.height = Math.max(2, Math.round(H * dpr)); const sg = stageCv.getContext('2d', { alpha: false }); sg.setTransform(dpr, 0, 0, dpr, 0, 0); staticPass(sg); }
              g.drawImage(stageCv, 0, 0, W, H);
            } else { stageKey = ''; staticPass(g); }
            drawSeats(g, PA, tn, t);
            drawBeams(g);
            drawFloodHaze(g);
            if (!RM() && tn < (st.lightT || 0) + 200) for (let k = 0; k < 8; k++) { const i = (Math.random() * NS) | 0, lt = LIT[i]; if (PV[i] && lt <= tn && tn - lt < 180) P.emit('star', PX[i], PY[i], 1, { colors: ['#fff6d0', '#ffe08a'], speed: [10, 40], life: [0.3, 0.6] }); }
          }
          st.homePt = ga > 0.001 ? drawGlobe(g, tn, t, ga, Math.exp(lerp(Math.log(14), 0, smooth(0.58, 0.9, sk)))) : null;
          drawDesk(g, deskOff);
          // the YOU tag and the fan cam follow the camera
          let yx = null, yy = null;
          if (sa > 0.98 && PV[YOU] && st.phase !== 'intro' && !st.tifo) { yx = PX[YOU]; yy = PY[YOU] - Math.max(9, PS[YOU] * 2.2); }
          else if (ga > 0.9 && st.homePt) { yx = st.homePt.x; yy = st.homePt.y - 14; }
          if (yx != null) youTag.style.transform = 'translate(' + yx.toFixed(1) + 'px,' + yy.toFixed(1) + 'px) translate(-50%,-100%)';
          youTag.classList.toggle('off', yx == null);
          if (camWrap && st.camSeat >= 0 && PV[st.camSeat]) camWrap.style.transform = 'translate(' + PX[st.camSeat].toFixed(1) + 'px,' + PY[st.camSeat].toFixed(1) + 'px)';
        }
        // the light layer
        const fg = fx.g; if (!fg) return;
        fg.setTransform(fx.dpr, 0, 0, fx.dpr, 0, 0); fg.clearRect(0, 0, M.W, M.H);
        if (sa > 0.98) { camSetup(shX, shY); drawRibbons(fg, tn); drawLife(fg, tn, t); }
        if (sa > 0.5) drawWeather(fg, dt);
        drawVU(fg, deskOff);
        P.update(dt); P.draw(fg);
      });
      cv.onResize(() => layout());
      S.on('theme', () => { deskDirty = true; stageKey = ''; markDirty(200); });

      /* ---------------- lines (every one in three vibes) ---------------- */
      const LINES = {
        hello: visits ? { Jolly: 'Back in your seat! Tonight we’re at {venue}. Lights off, just yours on.', Cheeky: 'Oh hi, regular. {venue} tonight. One seat lit. Guess whose.', Unfiltered: 'Back. {venue}. One seat lit: yours.' }
          : { Jolly: 'Welcome to {venue}! Lights off. Just one seat on: yours.', Cheeky: 'Huge stadium. Zero lights. One very lonely seat. Yours.', Unfiltered: 'Dark stadium. One seat lit. Yours.' },
        feelAsk: { Jolly: 'Before the lights: what’s the feeling? Pick its name.', Cheeky: 'The big screen needs a word. What’s the feeling?', Unfiltered: 'Name the feeling.' },
        named: { Jolly: '{f}. Naming it takes a little of the heat out.', Cheeky: '{f}. Named feelings are slightly less bossy.', Unfiltered: '{f}. Named. A bit less heat.' },
        namedStrong: { Jolly: '{f}, about something real. That makes sense.', Cheeky: '{f}. Fair enough: some of this is real.', Unfiltered: '{f}. Makes sense. Some of it’s real.' },
        pullHi: { Jolly: 'See that big lever? Pull it. Light up everyone who’s felt this.', Cheeky: 'Big lever. Big feelings. Pull it.', Unfiltered: 'Pull the lever.' },
        pullAgain: { Jolly: 'Pull again. There are more of us.', Cheeky: 'Lever. Again. Trust me.', Unfiltered: 'Again.' },
        lit: {
          section: { Jolly: 'Whoa! Your whole section!', Cheeky: 'Look at that. Neighbours!', Unfiltered: 'Your section. Lit.' },
          lower: { Jolly: 'The whole lower bowl! Look at it go!', Cheeky: 'That’s a lot of people who get it.', Unfiltered: 'Lower bowl. Lit.' },
          upper: { Jolly: 'Top tier too! Floodlights on!', Cheeky: 'Whole stadium. Now we’re showing off.', Unfiltered: 'Full house.' },
          stadium: { Jolly: 'Everyone! Floodlights on!', Cheeky: 'The whole place. Showing off now.', Unfiltered: 'Full house.' },
          floor: { Jolly: 'Even the pitch is full!', Cheeky: 'They’re on the pitch now. Wild.', Unfiltered: 'Pitch full too.' }
        },
        fancam: { Jolly: 'Fan cam! Tap the flashing seat. Let’s hear them.', Cheeky: 'Fan cam time. Tap the blinky one.', Unfiltered: 'Fan cam. Tap the seat.' },
        heard: [
          { Jolly: 'See? Same feeling, different seat.', Cheeky: 'Not so unique after all. In a good way.', Unfiltered: 'Same feeling. Different seat.' },
          { Jolly: 'Every light is a person who’s been there.', Cheeky: 'All those lights. All that ‘me too’.', Unfiltered: 'Every light: ‘me too’.' },
          { Jolly: 'A whole stadium of people who know this feeling.', Cheeky: 'Turns out it’s a very popular feeling.', Unfiltered: 'A full stadium.' },
          { Jolly: 'More and more of us.', Cheeky: 'The ‘me too’ section keeps growing.', Unfiltered: 'More of us.' }
        ],
        waveAsk: [{ Jolly: 'Can we do the wave now?', Cheeky: 'Wave? Is it wave time?', Unfiltered: 'Wave?' }, { Jolly: 'Wave now? Please?', Cheeky: 'How about now? Now?', Unfiltered: 'Now?' }],
        waveNo: [{ Jolly: 'Not yet. More lights first!', Cheeky: 'Patience, superstar.', Unfiltered: 'Not yet.' }, { Jolly: 'Nearly. Hold that thought.', Cheeky: 'Soon. Breathe.', Unfiltered: 'Soon.' }],
        locked: { Jolly: 'Fan cam first! Somebody wants to talk.', Cheeky: 'Hold that lever, someone’s on the big screen.', Unfiltered: 'Fan cam first.' },
        skyHi: { Jolly: 'Ooh, the sky cam! One more pull!', Cheeky: 'There’s a sky cam. Obviously we’re using it.', Unfiltered: 'Sky cam. Pull.' },
        rising: { Jolly: 'Going up! Hold on to your seat!', Cheeky: 'Whee. Nobody look down. Actually, do.', Unfiltered: 'Up we go.' },
        globe: { Jolly: 'Look. Lights everywhere. Different cities, same feeling.', Cheeky: 'Every city’s got a few of us. More than a few.', Unfiltered: 'Lights everywhere.' },
        spinHi: { Jolly: 'Give the world a spin.', Cheeky: 'Go on, spin the planet. You’re allowed.', Unfiltered: 'Spin it.' },
        spun: { Jolly: 'Feeling this doesn’t mean you’re broken. It means you’re human.', Cheeky: '‘What’s wrong with me?’ Same as everyone: you’re human.', Unfiltered: 'Not broken. Human.' },
        spunStrong: { Jolly: 'Hard things happen to lots of people. You’re not facing this alone.', Cheeky: 'Real problem, real company. Lots of people have been here.', Unfiltered: 'Real. And not alone.' },
        dive: { Jolly: 'Back down! I’ve got plans for that stadium.', Cheeky: 'Okay, back to the stadium. I have a wave to run.', Unfiltered: 'Back down.' },
        waveTime: { Jolly: 'NOW can we do the wave?', Cheeky: 'Is it finally wave o’clock?', Unfiltered: 'Wave. Now?' },
        waveYes: { Jolly: 'Now. Pull it!', Cheeky: 'Fine. Pull it.', Unfiltered: 'Now. Pull.' },
        waveGo: { Jolly: 'Here it comes! Stand up!', Cheeky: 'Up, up, up!', Unfiltered: 'Up!' },
        tifo: { Jolly: 'Look what they spelled for you.', Cheeky: 'The whole stadium chipped in on a message.', Unfiltered: 'Read the stands.' },
        hug: { Jolly: 'Hug cam’s on you. House rule: hug the person in your seat.', Cheeky: 'Hug cam! You know the rule. Arms around yourself.', Unfiltered: 'Hug cam. Hug yourself.' },
        end: { Jolly: 'A whole stadium of ‘me too’. Take that home.', Cheeky: 'Very popular feeling. You’re in good company.', Unfiltered: 'Not just you.' },
        endStrong: { Jolly: 'This one’s real. Lots of people have faced it, one step at a time.', Cheeky: 'Real thing, real company. One step at a time.', Unfiltered: 'Real. Not alone. One step.' },
        endCare: { Jolly: 'Not just you. And for the real question, ask someone qualified.', Cheeky: 'Lots of company. For the facts, a qualified human.', Unfiltered: 'Not alone. Get proper advice too.' }
      };

      /* ---------------- flow ---------------- */
      const wait = (key) => new Promise(res => { st.waits[key] = res; });
      function skyTo(to, dur, key) { st.skyFrom = st.sky; st.skyTo = to; st.skyT0 = now(); st.skyDur = RM() ? Math.min(dur, 900) : dur; st.skyMode = key; return wait(key); }
      function namePads() {
        const wrap = h('div', { class: 'njm-pads', role: 'group', 'aria-label': 'Name the feeling' });
        chipKeys.forEach((k) => {
          const mine = k === famDetected && famFromWords;
          const b = h('button', { type: 'button', class: 'njm-pad' + (FAM[k].label.length > 9 ? ' njm-long' : ''), 'data-k': k }, FAM[k].label, mine ? h('small', { text: 'from your words' }) : null);
          K.tap(b, () => pickFeeling(k, b));
          wrap.append(b);
        });
        return wrap;
      }
      function pickFeeling(k, b) {
        if (st.phase !== 'feel') return;
        st.phase = 'named'; st.fam = k; K.guide(null);
        Array.from(b.parentNode.children).forEach(x => x.classList.toggle('on', x === b));
        K.sfx.tap(); K.sfx.good(undefined, 6); SND.ooh(0.4);
        ledSet(FAM[k].led, '#ffcf5a');
        ctx.track('feeling', { k });
        S.later(() => { const w = st.waits.feel; st.waits.feel = null; if (w) w(); }, 650);
      }
      function setStageBody(key) {
        setBody([h('span', { class: 'njm-label', text: 'Tonight’s feeling: ' + FAM[st.fam].label }), meterEl(litFrac()), capEl(STAGE_DEF[key].cap)]);
      }
      function camTapped(i) {
        if (st.phase !== 'fancam') return;
        st.phase = 'voice'; K.guide(null);
        if (camBtn) { camBtn.classList.add('done'); const b = camWrap; S.later(() => b.remove(), 500); camBtn = null; camWrap = null; }
        SND.cam(); K.sfx.pop();
        showVoice(i, st.stage);
        const w = st.waits.cam; st.waits.cam = null; if (w) S.later(w, 200);
      }
      async function fanCam(key) {
        const i = seatIdx(key); st.camSeat = i;
        st.phase = 'fancam';
        ledSet('FAN CAM', '#ff8fae');
        setBody([h('span', { class: 'njm-label', text: 'Live from ' + seatLabel(i).sec }), h('span', { class: 'njm-cap', text: 'Tap the flashing seat to hear from a fan. Every fan here is made up; what they felt is real.' })]);
        camBtn = h('button', { type: 'button', class: 'njm-cam', 'aria-label': 'Fan cam: hear this fan' });
        camWrap = h('div', { class: 'njm-camw' }, camBtn);
        K.tap(camBtn, () => camTapped(i));
        el.append(camWrap);
        if (PV[i]) camWrap.style.transform = 'translate(' + PX[i].toFixed(1) + 'px,' + PY[i].toFixed(1) + 'px)';
        if (st.stage === 0) say(sync, L(LINES.fancam), { mood: 'wow', ms: 3200 });
        K.guide({ id: 'cam' + st.stage, g: 'tap', target: camBtn, label: 'TAP THE FAN CAM', delay: 900 });
        await wait('cam');
        await K.wait(RM() ? 900 : 1400);
        say(drop, L(LINES.heard[Math.min(st.stage, 3)]), { mood: st.stage >= 2 ? 'love' : 'happy', ms: 3400 });
      }
      async function runStage(s) {
        const key = STAGES[s];
        st.stage = s; st.phase = 'pull';
        leverReady(true, STAGE_DEF[key].mode);
        // the running joke plays while you reach for the lever (and steps aside if you are quick)
        if (s >= 1 && s <= 2) {
          S.later(() => { if (st.phase === 'pull' && st.stage === s) say(sync, L(LINES.waveAsk[s - 1]), { mood: 'wink', ms: 2000 }); }, RM() ? 1800 : 2800);
          S.later(() => { if (st.phase === 'pull' && st.stage === s) say(patch, L(LINES.waveNo[s - 1]), { mood: 'laugh', ms: 2200 }); }, RM() ? 3000 : 4200);
        }
        K.guide({ id: 'pull' + s, g: 'drag', dir: 'd', d: Math.min(120, M.lv.travel * 0.7), target: handleEl, label: s ? 'PULL AGAIN' : 'PULL THE LEVER', delay: s ? 1600 : 900 });
        if (s === 0) setBody([h('span', { class: 'njm-label', text: 'Who else has felt this?' }), h('span', { class: 'njm-cap', text: 'Pull the lever. Every seat that lights is someone who has felt it too.' })]);
        await waitPull();
        st.phase = 'lighting';
        // the light wave starts on the next drum beat
        const w0 = R.window(), nb = heardAt(w0.next.t), t0 = nb - now() < 420 ? nb : now() + 60;
        const span = lightStage(key, t0);
        st.lightT = t0 + span;
        MUS.layer = Math.max(MUS.layer, Math.min(3, s + 1 + (key === 'stadium' ? 1 : 0)));
        if (key === 'upper' || key === 'stadium') { st.floodTo = 1; S.later(() => SND.whump(true), Math.max(0, t0 - now())); }
        else S.later(() => SND.whump(false), Math.max(0, t0 - now()));
        S.later(() => { SND.arp(key === 'section' ? 8 : 12, span / 1000, 0.3, -0.3); SND.ooh(key === 'section' ? 0.6 : 1); }, Math.max(0, t0 - now()));
        camTo(['p1', 'p2', 'over', 'over'][Math.min(3, s + (key === 'stadium' ? 1 : 0))], key === 'section' ? 2200 : 2600);
        crowdLevel(0.01 + 0.06 * (s + 1) / STAGES.length);
        say(sync, L(LINES.lit[key]), { mood: 'celebrate', ms: 2600 }); sync.react('bounce');
        await K.wait(Math.max(900, span + 500));
        SND.cheer(key === 'section' ? 0.5 : 1);
        ledSet(STAGE_DEF[key].led, '#ffcf5a');
        setStageBody(key);
        ctx.track('lit', { stage: s });
        await K.wait(RM() ? 700 : 1100);
        await fanCam(key);
        await K.wait(RM() ? 600 : 900);
      }
      async function skyCam() {
        st.phase = 'skypull';
        leverReady(true, 'SKY CAM');
        say(sync, L(LINES.skyHi), { mood: 'idea', ms: 3000 });
        K.guide({ id: 'sky', g: 'drag', dir: 'd', d: Math.min(120, M.lv.travel * 0.7), target: handleEl, label: 'PULL FOR SKY CAM', delay: 1200 });
        await waitPull();
        st.phase = 'rising';
        buildGlobe();
        SND.sky(); MUS.layer = 'space'; crowdLevel(0.004);
        jumbo.classList.add('away'); lever.classList.add('away'); st.deskSlide = now();
        say(sync, L(LINES.rising), { mood: 'wow', ms: 2600 });
        const slide = () => { const k = clamp((now() - st.deskSlide) / 900, 0, 1); st.deskOff = K.ease.inOutCubic(k) * (M.H - M.deskY + 10); if (k < 1 && st.phase === 'rising') S.later(slide, 30); };
        slide();
        globeLights(now(), 'home');
        S.later(() => { globeLights(now(), 'ripple'); }, (RM() ? 600 : 2400));
        await skyTo(1, RM() ? 1400 : 4000, 'rise');
        space.classList.remove('off');
        st.phase = 'globeIdle';
        say(drop, L(LINES.globe), { mood: 'wow', ms: 3600 });
        await K.wait(RM() ? 1200 : 1900);
        st.phase = 'spin'; GL.total = 0;
        say(patch, L(LINES.spinHi), { mood: 'happy', ms: 2600 });
        K.guide({ id: 'spin', g: 'drag', dir: 'l', d: Math.min(150, M.globe.r * 0.9), target: () => ({ x: M.globe.x + M.globe.r * 0.45, y: M.globe.y }), label: 'SPIN THE WORLD', delay: 900 });
        const t0 = now();
        while (GL.total < 300 && now() - t0 < 60000) await K.wait(120);
        K.guide(null); st.phase = 'globeIdle';
        globeLights(now(), 'all');
        ctx.track('spin', { deg: Math.round(GL.total) });
        say(patch, L(heavy ? LINES.spunStrong : LINES.spun), { mood: 'love', ms: 4200 });
        await K.wait(RM() ? 1800 : 3000);
        // home again: turn the world back, then dive
        st.phase = 'diving';
        const fromLon = GL.lon, fromLat = GL.lat, d0 = ((VENUE.home[1] - fromLon) % 360 + 540) % 360 - 180, t1 = now(), dur = RM() ? 400 : 1100;
        while (now() - t1 < dur) { const k = K.ease.inOutCubic((now() - t1) / dur); GL.lon = fromLon + d0 * k; GL.lat = lerp(fromLat, clamp(VENUE.home[0], -40, 50), k); GL.v = 0; await K.wait(16); }
        GL.lon = VENUE.home[1];
        space.classList.add('off');
        say(sync, L(LINES.dive), { mood: 'determined', ms: 2400 });
        SND.dive(); MUS.layer = 3;
        await skyTo(0, RM() ? 1200 : 2800, 'fall');
        st.sky = 0; st.camKey = 'over'; Object.assign(CAM, CAM_PRESET.over);
        jumbo.classList.remove('away'); lever.classList.remove('away');
        const back = now(), slideIn = () => { const k = clamp((now() - back) / 700, 0, 1); st.deskOff = (1 - K.ease.inOutCubic(k)) * (M.H - M.deskY + 10); if (k < 1) S.later(slideIn, 30); };
        slideIn();
        crowdLevel(0.07);
      }
      async function finale() {
        st.phase = 'wavepull';
        ledSet('THE WAVE?', '#ff8fae');
        setBody([h('span', { class: 'njm-label', text: 'One more thing' }), h('span', { class: 'njm-cap', text: 'A whole stadium that knows this feeling. Shall we?' })]);
        say(sync, L(LINES.waveTime), { mood: 'wink', ms: 2400 });
        await K.wait(RM() ? 800 : 1700);
        say(patch, L(LINES.waveYes), { mood: 'celebrate', ms: 2400 });
        leverReady(true, 'THE WAVE');
        K.guide({ id: 'wave', g: 'drag', dir: 'd', d: Math.min(120, M.lv.travel * 0.7), target: handleEl, label: 'PULL FOR THE WAVE', delay: 900 });
        await waitPull();
        st.phase = 'wave';
        MUS.layer = 'fin'; crowdLevel(0.1);
        const laps = inten === 0 ? 2 : 3, lap = RM() ? 1500 : [2400, 2100, 1900][inten];
        st.lap = lap; st.waveT0 = now() + 200; st.waveOn = true;
        say(sync, L(LINES.waveGo), { mood: 'celebrate', ms: 2200 });
        // a rolling roar that follows the wave around the bowl (panned)
        if (A.ctx) { const t = A.now() + 0.2; for (let k = 0; k < laps * 16; k++) { const ph = (Math.PI / 2 + 0.6) - (k / 16) * TAU; A.noise({ when: t + k * lap / 16000, filter: 'bandpass', freq: 700 + (k % 4) * 90, q: 0.7, dur: 0.32, attack: 0.08, vol: 0.06, pink: true, pan: clamp(Math.cos(ph) * 0.9, -0.9, 0.9) }); } }
        // the card stunt: seats flip as the wave passes on the second lap
        const phi0 = Math.PI / 2 + 0.6;
        for (let i = 0; i < NST; i++) { let d = (phi0 - CL[i] / NCOL * TAU) % TAU; if (d < 0) d += TAU; FLIP[i] = st.waveT0 + lap * (1 + d / TAU); }
        st.tifo = true; st.tifoEnd = st.waveT0 + lap * 2 + 700;
        S.later(() => { ledSet('NOT JUST YOU', '#fff2d0'); SND.cheer(1.2); K.sfx.great(); }, lap * 1.6);
        S.later(() => camTo('tifo', RM() ? 400 : 2400), lap * 1.75);
        S.later(() => { say(patch, L(LINES.tifo), { mood: 'love', ms: 3000 }); }, lap * 2.05);
        await K.wait(lap * laps + 300);
        st.waveOn = false;
        const tw = st.towerPts.filter(p => p && p.x > 10 && p.x < M.W - 10 && p.y > 60 && p.y < M.H * 0.7);
        K.finale('fireworks', { from: tw.length ? tw : [{ x: M.W * 0.2, y: M.H * 0.4 }, { x: M.W * 0.8, y: M.H * 0.4 }], colors: ['#ffc94d', '#ff6f91', '#fff4d8', VENUE.team], count: RM() ? 3 : [5, 7, 9][inten], chord: ['D4', 'F#4', 'A4', 'D5'], ms: 4200, z: 12 });
        K.sfx.win();
        setBody([h('span', { class: 'njm-label', text: 'Tonight at ' + VENUE.name }), capEl(care ? 'A whole stadium knows this feeling. For the real question, <b>talk to someone qualified.</b>' : support === 'strong' && LEAD ? 'Real, and not just you. <b>One next step:</b> ' + escapeHtml(LEAD) : 'Made-up stadium. Real feeling. <b>Lots of people have felt this too.</b>')]);
        await K.wait(RM() ? 900 : 1400);
        patch.face('hug'); say(patch, L(LINES.hug), { mood: 'hug', ms: 4200 }); patch.react('bounce');
        await K.wait(RM() ? 1800 : 3200);
        say(drop, L(care ? LINES.endCare : support === 'strong' ? LINES.endStrong : LINES.end), { mood: 'love', ms: 0 });
        await K.wait(RM() ? 1200 : 2000);
        finishGame();
      }
      function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
      function finishGame() {
        if (st.finished) return; st.finished = true;
        const beatK = st.pulls ? st.onBeat / st.pulls : 0, pct = Math.round(beatK * 100);
        const tier = K.tier(beatK, [0.2, 0.5, 0.8]), best = K.best('beat', pct, 'higher');
        let fresh = 0; st.heard.forEach(id => { if (K.collect('v:' + id).isNew) fresh++; });
        const vNew = K.collect('venue:' + VENUE.key).isNew;
        const total = K.collection().filter(x => typeof x === 'string' && x.indexOf('v:') === 0).length;
        const badges = [];
        if (tier) badges.push(tier + ': in time with the crowd');
        if (best.isNew) badges.push('New best: ' + pct + '% pulls on the drum');
        if (fresh) badges.push('Stories album: ' + total + ' of ' + VOICE_COUNT);
        if (vNew) badges.push('New venue: ' + VENUE.name);
        const lines = ['Named the feeling: ' + FAM[st.fam || 'uneasy'].label.toLowerCase(), 'A whole stadium lit up for it (made-up fans, real feeling)'];
        if (care) lines.push('For the real question: talk to someone qualified');
        else if (support === 'strong' && LEAD) lines.push('Next step: ' + clip(LEAD, 80));
        else lines.push('Heard ' + st.heard.length + ' fans say “me too”. Tomorrow: ' + NEXT_VENUE.name);
        ctx.finish({ title: 'Not just you', mood: 'hug', lines, share: 'Turns out it’s not just me. A whole stadium lit up.', badges: badges.slice(0, 4) });
      }

      (async () => {
        await K.intro({ title: 'Not Just Me', sub: 'A dark stadium. One seat lit: yours. Let’s see who else has felt this.', how: 'Name the feeling. Pull the big lever. Tap the fan cam.', char: 'patch', mood: 'hug' });
        layout(); setPresets(); Object.assign(CAM, CAM_PRESET.close); st.camKey = 'close';
        MUS.on = true; R.start(0.25);
        st.phase = 'dark';
        ledSet(VENUE.led, '#ffcf5a');
        setBody([h('span', { class: 'njm-label', text: 'Tonight' }), h('span', { class: 'njm-cap', text: 'One stadium. One seat lit. Yours.' })]);
        say(patch, L(LINES.hello, { venue: VENUE.name }), { mood: 'happy', ms: 3600 });
        await K.wait(RM() ? 1200 : 2400);
        // name the feeling
        st.phase = 'feel';
        ledSet('THE FEELING?', '#ffcf5a');
        const pads = namePads();
        setBody([THOUGHT ? h('span', { class: 'njm-label', text: THOUGHT.user ? 'The thought in your seat' : 'What you told us' }) : h('span', { class: 'njm-label', text: 'In your seat tonight' }),
          THOUGHT ? h('p', { class: 'njm-quote' + (THOUGHT.user ? ' gk-user' : ''), text: THOUGHT.user ? '“' + THOUGHT.text + '”' : THOUGHT.text }) : h('span', { class: 'njm-cap', text: 'A feeling you’ve been carrying. Which one is closest?' }), pads]);
        say(drop, L(LINES.feelAsk), { mood: 'think', ms: 3400 });
        K.guide({ id: 'feel', g: 'choose', target: () => Array.from(pads.children), label: 'NAME THE FEELING', place: 'below', delay: 1100 });
        await wait('feel');
        say(drop, L(support === 'strong' ? LINES.namedStrong : LINES.named, { f: FAM[st.fam].label }), { mood: 'calm', ms: 3200 });
        drop.react('bounce');
        await K.wait(RM() ? 900 : 1400);
        say(patch, L(LINES.pullHi), { mood: 'determined', ms: 3200 });
        for (let s = 0; s < STAGES.length; s++) await runStage(s);
        await skyCam();
        await finale();
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = now(); while (!fn()) { if (now() - t0 > (ms || 30000)) return false; await K.wait(80); } return true; };
          const intro = el.querySelector('.gk-intro'); if (intro) { await K.wait(700); await K.sim.tap(intro); }
          const pull = async () => { await K.wait(500); const w = M.lv.w, top = M.lv.slotTop; await K.sim.drag(lever, { x: w / 2, y: top + 6 }, { x: w / 2, y: top + M.lv.travel * 1.15 + 10 }, 650, 16); };
          await until(() => st.phase === 'feel' && body.querySelector('.njm-pad'), 40000); await K.wait(1000);
          await K.sim.tap(body.querySelector('.njm-pad'));
          for (let s = 0; s < STAGES.length; s++) {
            await until(() => st.phase === 'pull' && st.stage === s && LV.ready, 30000);
            for (let k = 0; k < 3 && st.phase === 'pull'; k++) { await pull(); await K.wait(500); }
            await until(() => st.phase === 'fancam' && camBtn, 20000); await K.wait(900);
            for (let k = 0; k < 3 && st.phase === 'fancam' && camBtn; k++) { await K.sim.tap(camBtn); await K.wait(500); }
          }
          await until(() => st.phase === 'skypull' && LV.ready, 30000);
          for (let k = 0; k < 3 && st.phase === 'skypull'; k++) { await pull(); await K.wait(500); }
          await until(() => st.phase === 'spin', 30000); await K.wait(800);
          for (let k = 0; k < 8 && st.phase === 'spin'; k++) { const gx = M.globe.x, gy = M.globe.y; await K.sim.drag(hit, { x: gx + M.globe.r * 0.6, y: gy }, { x: gx - M.globe.r * 0.6, y: gy + 6 }, 600, 14); await K.wait(400); }
          await until(() => st.phase === 'wavepull' && LV.ready, 40000);
          for (let k = 0; k < 3 && st.phase === 'wavepull'; k++) { await pull(); await K.wait(500); }
          await until(() => st.finished, 40000);
        }
      };
    }
  });
})(window.TSG_ENV);
