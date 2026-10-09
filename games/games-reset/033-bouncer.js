/* 033 Bouncer — Reset · CONNECT · Communication / Boundaries
 * Mechanism: assertiveness practice (assertiveness training; DBT interpersonal effectiveness, DEAR MAN: describe, express,
 * assert, reinforce, stay mindful with a "broken record", appear confident, negotiate). Rehearsing short, kind-but-firm
 * answers (a clean no, a "not tonight, but…", a yes with limits) and seeing that most people take them well builds the
 * confidence to set boundaries for real. The player works the door of their own evening: the asks queue at a velvet rope,
 * the evening inside stays calm while the rope holds, and the things they actually want get the red carpet.
 * Verb: answer at the rope (hold up a palm for a kind no, drag a "not tonight, but…" or "yes, with limits" card onto the
 * ask, swipe a guest through the door). Twist: the Guilt Trip pushes back; hold steady with a broken-record line while
 * Patch coaches the wording. Finale: closing time: flip the sign, the club glows, the rope sparkles, the evening is yours.
 */
(function (env) {
  'use strict';
  const ID = 'bouncer';
  const TAU = Math.PI * 2;
  const OL = '#24151f';

  /* ---------------- the guests: comic personas drawn in SVG (all invented, none of them real people) ---------------- */
  function face(cx, cy, s, o) {
    o = o || {};
    let eyes = '<ellipse cx="-10" cy="0" rx="4.6" ry="5.6" fill="' + OL + '"/><ellipse cx="10" cy="0" rx="4.6" ry="5.6" fill="' + OL + '"/><circle cx="-8.5" cy="-2.2" r="1.7" fill="#fff"/><circle cx="11.5" cy="-2.2" r="1.7" fill="#fff"/>';
    if (o.eyes === 'sun') eyes = '<path d="M-22 -6h17v6q-8.5 8-17 0zM5 -6h17v6q-8.5 8-17 0z" fill="#0d0e14"/><path d="M-5 -4h10" stroke="#0d0e14" stroke-width="2.4"/><path d="M-18 -3h5" stroke="#fff" stroke-width="1.6" opacity=".7"/>';
    if (o.eyes === 'sleep') eyes = '<path d="M-21 -6h42v11h-42z" fill="#6a7cff" stroke="' + OL + '" stroke-width="2"/><path d="M-15 0q5 4 10 0M5 0q5 4 10 0" fill="none" stroke="#fff" stroke-width="2"/>';
    if (o.eyes === '3d') eyes = '<path d="M-22 -7h18v12h-18z" fill="#ff4d6d" stroke="' + OL + '" stroke-width="2"/><path d="M4 -7h18v12h-18z" fill="#3ad6ff" stroke="' + OL + '" stroke-width="2"/><path d="M-4 -3h8" stroke="' + OL + '" stroke-width="2"/>';
    const glasses = o.glasses ? '<circle cx="-10" cy="0" r="8.6" fill="rgba(255,255,255,.18)" stroke="' + OL + '" stroke-width="2.2"/><circle cx="10" cy="0" r="8.6" fill="rgba(255,255,255,.18)" stroke="' + OL + '" stroke-width="2.2"/><path d="M-1.4 0h2.8" stroke="' + OL + '" stroke-width="2.2"/>' : '';
    const blush = o.noBlush ? '' : '<ellipse cx="-17" cy="8" rx="4.2" ry="2.5" fill="#ff6f96" opacity=".45"/><ellipse cx="17" cy="8" rx="4.2" ry="2.5" fill="#ff6f96" opacity=".45"/>';
    const brows = '<path class="bn-brow" d="M-16 -11l8 3M16 -11l-8 3" stroke="' + OL + '" stroke-width="2.4" stroke-linecap="round" fill="none"/>';
    const mouths = '<path class="bn-m bn-m-ask" d="M-6 11q6 5.5 12 0" fill="none" stroke="' + OL + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path class="bn-m bn-m-happy" d="M-9 9q9 13 18 0z" fill="#7a1f2e" stroke="' + OL + '" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path class="bn-m bn-m-ok" d="M-6 12q6 3 12 0" fill="none" stroke="' + OL + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path class="bn-m bn-m-sad" d="M-6 15q6-6 12 0" fill="none" stroke="' + OL + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<ellipse class="bn-m bn-m-o" cx="0" cy="13" rx="3.6" ry="4.4" fill="#7a1f2e" stroke="' + OL + '" stroke-width="2"/>';
    return '<g transform="translate(' + cx + ' ' + cy + ') scale(' + (s || 1) + ')">' + blush + eyes + glasses + brows + mouths + '</g>';
  }
  const legs = (y) => { y = y || 124; return '<g stroke="' + OL + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"><path class="bn-l1" style="transform-origin:50px ' + y + 'px" d="M50 ' + y + 'L47 143h-8"/><path class="bn-l2" style="transform-origin:70px ' + y + 'px" d="M70 ' + y + 'L73 143h8"/></g>'; };
  const S3 = 'stroke="' + OL + '" stroke-width="3" stroke-linejoin="round"';
  const COSTUME = {
    phone: legs(118) + '<rect x="30" y="16" width="60" height="106" rx="12" fill="#1f2333" ' + S3 + '/><rect x="36" y="26" width="48" height="66" rx="5" fill="#8fd6ff"/>' +
      '<path d="M30 92L50 122H30zM90 92L70 122H90z" fill="#0d0e14"/><path d="M50 98L60 116L70 98z" fill="#fff"/><path d="M50 98l10 5l10-5v9l-10-5l-10 5z" fill="#e2304a" stroke="' + OL + '" stroke-width="1.5"/>' +
      '<circle cx="88" cy="20" r="10" fill="#ff3b5c" ' + S3 + '/><path d="M88 14.5v6.5M88 24.6v.4" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>' + face(60, 56, 0.95),
    stopwatch: legs(124) + '<path d="M30 74Q30 62 44 60H76Q90 62 90 74L96 128H24Z" fill="#cba46d" ' + S3 + '/><rect x="27" y="102" width="66" height="8" fill="#8a6a3e"/>' +
      '<path d="M48 60L60 84L72 60" fill="none" stroke="#8a6a3e" stroke-width="3"/><circle cx="60" cy="40" r="27" fill="#f6f2e6" ' + S3 + '/><circle cx="60" cy="40" r="21.5" fill="none" stroke="#d6cfba" stroke-width="2"/>' +
      '<path d="M60 40V24M60 40l11-6" stroke="#d6cfba" stroke-width="2.4" stroke-linecap="round"/><path d="M28 17Q60 3 92 17Q78 23 60 21Q42 23 28 17z" fill="#5a4630" ' + S3 + '/><path d="M42 17Q44 2 60 2Q76 2 78 17" fill="#6b5438" ' + S3 + '/>' + face(60, 44, 0.85),
    sticky: legs(122) + '<path d="M14 46h38v38h-38z" fill="#ffd23f" opacity=".85" transform="rotate(-14 33 65)"/><path d="M28 28H92V110L80 122H28Z" fill="#ffe46b" ' + S3 + '/><path d="M80 122V110H92" fill="#e6c94a" ' + S3 + '/>' +
      '<g fill="#ff7ab8" stroke="#e0559a" stroke-width="1.2"><circle cx="30" cy="92" r="7"/><circle cx="40" cy="98" r="7"/><circle cx="51" cy="101" r="7"/><circle cx="62" cy="102" r="7"/><circle cx="73" cy="100" r="7"/><circle cx="83" cy="96" r="7"/><circle cx="92" cy="90" r="7"/><circle cx="95" cy="102" r="6"/><circle cx="97" cy="113" r="5.5"/><circle cx="96" cy="123" r="5"/></g>' + face(60, 62, 0.95),
    laptop: legs(124) + '<path d="M38 98H82L86 128H34Z" fill="#2c3e66" ' + S3 + '/><path d="M60 98l-6 8l6 20l6-20z" fill="#3a6df0" stroke="' + OL + '" stroke-width="2"/>' +
      '<path d="M14 82H106L98 100H22Z" fill="#c9cbd6" ' + S3 + '/><path d="M40 90h40" stroke="#9a9cad" stroke-width="3" stroke-linecap="round"/><rect x="22" y="20" width="76" height="60" rx="6" fill="#2a2f45" ' + S3 + '/><rect x="28" y="26" width="64" height="48" rx="3" fill="#a5dcff"/>' + face(60, 50, 0.95, { eyes: 'sun', noBlush: true }),
    chat: legs(120) + '<path d="M10 22h52a10 10 0 0 1 10 10v20a10 10 0 0 1-10 10H30l-9 9v-9h-11a10 10 0 0 1-10-10V32a10 10 0 0 1 10-10z" fill="#9d8bff" ' + S3 + '/>' +
      '<g fill="#fff"><circle cx="22" cy="42" r="3.2"/><circle cx="34" cy="42" r="3.2"/><circle cx="46" cy="42" r="3.2"/></g>' +
      '<path d="M58 36h44a9 9 0 0 1 9 9v16a9 9 0 0 1-9 9h-4v8l-8-8H58a9 9 0 0 1-9-9V45a9 9 0 0 1 9-9z" fill="#58d6a6" ' + S3 + '/>' +
      '<path d="M30 60h66a12 12 0 0 1 12 12v34a12 12 0 0 1-12 12H70l-10 10v-10H30a12 12 0 0 1-12-12V72a12 12 0 0 1 12-12z" fill="#62b8ff" ' + S3 + '/>' + face(63, 86, 0.95),
    wallet: legs(122) + '<rect x="24" y="40" width="72" height="82" rx="10" fill="#8a5a34" ' + S3 + '/><path d="M24 58H96V74Q60 86 24 74Z" fill="#a8703f" ' + S3 + '/>' +
      '<path d="M31 48H89M31 114H89" stroke="#d9a46b" stroke-dasharray="4 4" stroke-width="1.6"/><circle cx="60" cy="76" r="4.5" fill="#e8b450" stroke="' + OL + '" stroke-width="1.5"/>' +
      '<ellipse cx="62" cy="38" rx="32" ry="9.5" fill="#2f3550" ' + S3 + '/><circle cx="66" cy="27" r="3.4" fill="#2f3550" stroke="' + OL + '" stroke-width="2"/>' + face(60, 94, 0.9) +
      '<path d="M50 103q5-6 10-1q5-5 10 1q-5 4-10 0q-5 4-10 0z" fill="#3b2416"/>',
    scroll: legs(124) + '<path d="M26 128V76Q26 50 60 48Q94 50 94 76V128Z" fill="#7a7f95" ' + S3 + '/><path d="M42 106H78V122H42Z" fill="#6a6f85" stroke="' + OL + '" stroke-width="2"/>' +
      '<path d="M30 62Q30 14 60 12Q90 14 90 62Q84 72 60 72Q36 72 30 62Z" fill="#8a8fa6" ' + S3 + '/><ellipse cx="60" cy="45" rx="22" ry="20" fill="#f6ecd2" stroke="' + OL + '" stroke-width="2"/>' +
      '<path d="M70 114q20 4 18 20q-2 10-15 10H60" fill="#f6ecd2" stroke="' + OL + '" stroke-width="2.4"/><path d="M66 124h14M64 132h16" stroke="#c9b48a" stroke-width="2"/>' + face(60, 46, 0.8),
    popper: legs(124) + '<path d="M36 128L60 34L84 128Z" fill="#ff8a3d" ' + S3 + '/><path d="M47 92L73 92M42 112L78 112M53 70L67 70" stroke="#ffd23f" stroke-width="6"/>' +
      '<path d="M60 32q-12-14-26-9M60 32q12-16 27-11M60 32q-2-18 6-26" stroke="#4fd3a0" fill="none" stroke-width="3" stroke-linecap="round"/>' +
      '<g><rect x="30" y="10" width="6" height="6" fill="#ff4d6d" transform="rotate(20 33 13)"/><rect x="84" y="6" width="6" height="6" fill="#62b8ff" transform="rotate(-25 87 9)"/><rect x="48" y="2" width="5" height="5" fill="#ffd23f"/><circle cx="96" cy="26" r="3" fill="#ff7ab8"/><circle cx="22" cy="28" r="3" fill="#9d8bff"/></g>' + face(60, 98, 0.85),
    suitcase: '<circle cx="34" cy="132" r="8" fill="#1d1418" stroke="' + OL + '" stroke-width="2"/><circle cx="86" cy="132" r="8" fill="#1d1418" stroke="' + OL + '" stroke-width="2"/>' +
      '<path d="M48 42V30H72V42" fill="none" stroke="#3b2416" stroke-width="7" stroke-linejoin="round"/><rect x="18" y="40" width="84" height="86" rx="11" fill="#9a6a3a" ' + S3 + '/>' +
      '<rect x="32" y="40" width="9" height="86" fill="#6a4524"/><rect x="79" y="40" width="9" height="86" fill="#6a4524"/><circle cx="92" cy="56" r="8" fill="#4fd3a0" stroke="' + OL + '" stroke-width="1.5"/>' +
      '<rect x="22" y="100" width="20" height="13" rx="3" fill="#ff7ab8" stroke="' + OL + '" stroke-width="1.5" transform="rotate(-12 32 106)"/><path d="M84 106l3 6l7 1l-5 5l1 7l-6-3l-6 3l1-7l-5-5l7-1z" fill="#ffd23f" stroke="' + OL + '" stroke-width="1.2"/>' +
      face(60, 78, 0.95) + '<g class="bn-violin"><path d="M100 70q8-6 9 4q1 8-7 13q-9-3-10-12q0-10 8-5z" fill="#b5652e" stroke="' + OL + '" stroke-width="1.8"/><path d="M103 58V74" stroke="' + OL + '" stroke-width="2.4"/></g><path class="bn-bow" d="M90 60L116 88" stroke="#ead9b4" stroke-width="2.2" stroke-linecap="round"/>',
    balloon: legs(124) + '<path d="M60 112q-6 6 0 12" fill="none" stroke="' + OL + '" stroke-width="2"/><ellipse cx="60" cy="62" rx="36" ry="46" fill="#ff9ec7" ' + S3 + '/><path d="M54 106h12l-6 8z" fill="#ff9ec7" stroke="' + OL + '" stroke-width="2"/>' +
      '<path d="M38 40q8-14 20-14" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6"/><path d="M48 112l-10 8l12 2zM72 112l10 8l-12 2z" fill="#ffd23f" stroke="' + OL + '" stroke-width="1.5"/>' + face(60, 66, 1),
    bath: '<circle cx="30" cy="128" r="6" fill="#d9a441" stroke="' + OL + '" stroke-width="2"/><circle cx="90" cy="128" r="6" fill="#d9a441" stroke="' + OL + '" stroke-width="2"/>' +
      '<g fill="#e6f6ff" stroke="#9fc8e0" stroke-width="1.5"><circle cx="28" cy="70" r="11"/><circle cx="44" cy="62" r="13"/><circle cx="62" cy="66" r="12"/><circle cx="78" cy="60" r="10"/><circle cx="36" cy="48" r="6"/><circle cx="58" cy="44" r="5"/></g>' +
      '<path d="M84 64q-2-12 8-12q8 0 6 8q6 0 6 6q0 6-8 6h-10q-4-2-2-8z" fill="#ffd23f" stroke="' + OL + '" stroke-width="1.8"/><path d="M104 62l6-1l-5 4z" fill="#ff8a3d"/>' +
      '<path d="M12 74H108V96Q108 124 80 124H40Q12 124 12 96Z" fill="#f7fbff" ' + S3 + '/><path d="M18 82H102" stroke="#cfe3f0" stroke-width="3"/>' + face(60, 100, 0.9),
    book: '<path d="M70 120v18l5-5l5 5v-18" fill="#e2304a" stroke="' + OL + '" stroke-width="1.8"/>' + legs(122) +
      '<rect x="24" y="22" width="74" height="100" rx="6" fill="#3f6fd8" ' + S3 + '/><rect x="24" y="22" width="13" height="100" fill="#2f55a8" stroke="' + OL + '" stroke-width="2"/>' +
      '<path d="M93 27V117" stroke="#f4ecd8" stroke-width="5"/><path d="M46 36h40M46 44h28" stroke="#9fb8ff" stroke-width="3" stroke-linecap="round"/>' + face(64, 72, 0.95, { glasses: true }),
    pillow: '<path d="M18 40Q60 26 102 40Q112 78 102 116Q60 130 18 116Q8 78 18 40Z" fill="#eef0ff" ' + S3 + '/><path d="M40 46Q60 40 80 46" stroke="#cdd2f0" stroke-width="3" fill="none"/>' +
      '<path d="M26 44Q46 2 100 12Q86 24 84 42Z" fill="#6a7cff" ' + S3 + '/><circle cx="101" cy="12" r="7" fill="#fff" stroke="' + OL + '" stroke-width="2"/>' + face(60, 80, 1, { eyes: 'sleep' }),
    telephone: legs(124) + '<path d="M22 86Q22 64 42 62H78Q98 64 98 86V122H22Z" fill="#ff8fb1" ' + S3 + '/><circle cx="60" cy="98" r="17" fill="#fff" stroke="' + OL + '" stroke-width="2.4"/>' +
      '<path d="M16 56Q16 34 34 34H86Q104 34 104 56Q96 61 86 52H34Q24 61 16 56Z" fill="#ff6f9c" ' + S3 + '/><path d="M60 26c-4-6-12-2-8 4l8 7l8-7c4-6-4-10-8-4z" fill="#e2304a" stroke="' + OL + '" stroke-width="1.5"/>' + face(60, 96, 0.8),
    popcorn: legs(128) + '<g fill="#fff3c4" stroke="#d9b45a" stroke-width="1.6"><circle cx="36" cy="48" r="10"/><circle cx="50" cy="40" r="11"/><circle cx="66" cy="38" r="11"/><circle cx="82" cy="44" r="10"/><circle cx="58" cy="28" r="8"/><circle cx="74" cy="28" r="7"/></g>' +
      '<path d="M28 52L36 130H84L92 52Z" fill="#fff" ' + S3 + '/><path d="M41 54L46 128M60 54V128M79 54L74 128" stroke="#e2304a" stroke-width="7"/><path d="M28 52H92" stroke="' + OL + '" stroke-width="3"/>' + face(60, 88, 0.85, { eyes: '3d' }),
    sneaker: '<path d="M14 104Q16 70 40 66L58 64Q68 86 92 90Q110 94 108 112H14Z" fill="#4fd3a0" ' + S3 + '/><path d="M12 112H110V120Q60 128 12 120Z" fill="#fff" ' + S3 + '/>' +
      '<path d="M50 72l8 6M54 66l9 6M46 78l8 6" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M30 68Q44 56 58 60" stroke="#ff4d6d" stroke-width="7" fill="none" stroke-linecap="round"/>' + face(42, 92, 0.75),
    letter: legs(118) + '<rect x="16" y="40" width="88" height="70" rx="6" fill="#f6ecd2" ' + S3 + '/><path d="M16 46L60 82L104 46" fill="none" stroke="' + OL + '" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<circle cx="60" cy="84" r="9" fill="#c0392b" stroke="' + OL + '" stroke-width="1.8"/><path d="M56 84h8M60 80v8" stroke="#ff9a8a" stroke-width="1.6"/>' + face(60, 62, 0.75)
  };

  /* Lines a character speaks come in all three vibes. "say" holds the bouncer's own lines (the phrasebook): kind, short,
     firm, never an essay (DEAR MAN: describe, assert, keep it kind, hold the line, offer what you can). */
  const v = (J, C, U) => ({ Jolly: J, Cheeky: C, Unfiltered: U });
  const DEMANDS = [
    { id: 'reply', name: 'Reply Right Now', costume: 'phone', voice: 820, col: '#8fd6ff',
      ask: v('You saw my message! Reply right now? Pretty please?', 'Read receipts don’t lie. Reply. Right. Now.', 'Reply now. It’s been four minutes.'),
      scan: v('Scanning… urgency: invented. This can wait.', 'Scan says: zero emergency, all buzz.', 'Not urgent. Just loud.'),
      say: { no: v('I’m not answering messages tonight.', 'Phone’s off duty tonight. So am I.', 'No messages tonight.'), later: v('Not tonight, but I’ll reply properly at nine tomorrow.', 'Not tonight. You’re booked in for nine tomorrow.', 'Not tonight. Nine tomorrow.'), limit: v('I’ll send a quick “got it” now. The full reply can wait till tomorrow.', 'You get a “got it” tonight. The essay comes tomorrow.', 'Quick “got it” now. The rest tomorrow.'), yes: v('Sure, let’s do it now.', 'Fine, come in, let’s type.', 'Okay. Now.') },
      tag: { later: 'Tomorrow, 9am', limit: 'One reply' },
      re: { no: v('Oh! Fair enough. I’ll glow quietly till morning.', 'Fine. I’ll vibrate sadly in a drawer.', 'Fair. Drawer it is.'), later: v('Nine tomorrow! I’ll set a reminder. Ironically.', 'A scheduled reply? How grown-up. I’m impressed and scared.', 'Nine. Got it.'), limit: v('A “got it”! Honestly, that’s all I needed.', 'Two words. Perfect. I’m satisfied.', 'Got it. Bye.'), yes: v('Yay! Okay, so I have forty more messages…', 'Brilliant. Clear your evening, we’re doing a thread.', 'Great. Forty more.') } },
    { id: 'quick', name: 'The Quick Favour', costume: 'stopwatch', voice: 600, col: '#cba46d',
      ask: v('Can you just quickly look at this thing? It’s tiny! Like… two hours.', 'Quick favour. Very quick. Quick-ish. Bring snacks.', 'Quick favour. Not quick.'),
      scan: v('Scanning “just quickly”… actual time: two hours forty.', '“Quick” detected. Translation: all night.', 'Not quick.'),
      say: { no: v('I can’t take that on tonight. I hope it goes well.', 'Tonight’s fully booked, I’m afraid. Good luck with it!', 'Can’t tonight. Good luck.'), later: v('Not tonight, but I can give it twenty minutes on Saturday morning.', 'Not tonight. Saturday morning, twenty minutes, all yours.', 'Not tonight. Saturday, twenty minutes.'), limit: v('I can give it fifteen minutes, then I need to stop.', 'You get fifteen minutes. I’m setting a timer, and I mean it.', 'Fifteen minutes. Then I stop.'), yes: v('Sure, I’ll help with all of it.', 'Fine, bring the whole thing in.', 'Okay. All of it.') },
      tag: { later: 'Sat · 20 min', limit: '15 min' },
      re: { no: v('Totally fair! I’ll ask someone who loves spreadsheets.', 'A no with a smile? Rude. Kidding. Respect.', 'Okay. I’ll ask someone else.'), later: v('Saturday morning! I’ll bring pastries.', 'Twenty minutes. I’ll try to actually be quick.', 'Saturday. Deal.'), limit: v('Fifteen minutes is loads! Timer’s on!', 'Fifteen minutes. I’m literally a stopwatch. I can do this.', 'Fifteen. Go.'), yes: v('Brilliant! So, page one of forty…', 'Wonderful. Cancel your plans. All of them.', 'Great. Page one of forty.') } },
    { id: 'onemore', name: 'One More Thing', costume: 'sticky', voice: 760, col: '#ffe46b',
      ask: v('Just one more thing! And then one more. And then—', 'One more thing, darling. Then another. It’s a whole outfit.', 'One more. Then more.'),
      scan: v('Scanning… this note has forty-two friends hiding behind it.', 'It says one. It means ninety.', 'It’s never one.'),
      say: { no: v('I’m done for today. It’ll keep till tomorrow.', 'The shop’s shut for today, darling. It’ll keep.', 'Done for today.'), later: v('Not tonight, but it’s first on my list tomorrow.', 'Not tonight. Tomorrow you’re top of the list, promise.', 'Not tonight. First thing tomorrow.'), limit: v('I’ll do this one thing, and that’s it for tonight.', 'One thing. One. Then the boa goes home.', 'One thing. That’s it.'), yes: v('Sure, bring all of them.', 'Fine, invite the whole stack.', 'Okay. All of them.') },
      tag: { later: 'First tomorrow', limit: 'One thing' },
      re: { no: v('Done for today? Goals. I’ll stick around till morning.', 'Rejected. I’ll go stick myself to a fridge.', 'Fine. Fridge.'), later: v('First on the list! I’ve never been first!', 'Top of the list? I’m blushing. I’m already yellow.', 'First. Good.'), limit: v('Just one thing! I can do just one. Probably.', 'One thing. My friends will be furious. Fine.', 'One. Okay.'), yes: v('Yay! One more. And one more. And…', 'Marvellous. My friends are coming too. All ninety.', 'Bringing the others.') } },
    { id: 'overtime', name: 'Overtime', costume: 'laptop', voice: 520, col: '#a5dcff',
      ask: v('Could you finish this tonight? It’s nearly done! Mostly. Partly.', 'Quick tweak tonight? Ninety tweaks. In sunglasses.', 'Work tonight. Yes?'),
      scan: v('Scanning… the deadline is actually Friday. Panic: optional.', 'Fun fact: it’s due Friday. The sunglasses are a disguise.', 'Due Friday. Not tonight.'),
      say: { no: v('I’m logged off for the night.', 'Out of office. The office being my brain.', 'Logged off.'), later: v('Not tonight, but I’ll pick it up first thing tomorrow.', 'Not tonight. Tomorrow at nine, coffee in hand.', 'Not tonight. Tomorrow, first thing.'), limit: v('I’ll fix the one urgent bit, then I’m logging off.', 'One fix. Then I’m closing the lid. Gently.', 'One fix. Then off.'), yes: v('Sure, I’ll work on it tonight.', 'Fine, let’s pull an all-nighter.', 'Okay. Tonight.') },
      tag: { later: 'Tomorrow, 9am', limit: 'One fix' },
      re: { no: v('Logged off! Okay, I’ll go to sleep mode too.', 'Logged off? Bold. I’ll just… screensaver.', 'Fine. Sleep mode.'), later: v('First thing tomorrow! I’ll be fully charged.', 'Tomorrow. I’ll download some patience overnight.', 'Tomorrow. Fine.'), limit: v('Just the urgent bit! That’s fair.', 'One fix and logout? Efficient. Annoyingly good.', 'One fix. Done.'), yes: v('Amazing! So, tab one of thirty-seven…', 'Excellent. All-nighter! I’ll wear the sunglasses.', 'All night. Great.') } },
    { id: 'chat', name: 'The Group Chat', costume: 'chat', voice: 900, col: '#62b8ff',
      ask: v('Are you coming out?? Everyone’s coming!! It’ll be fun!!', '147 new messages, all asking where you are. Come out!!', 'Coming out? Everyone is.'),
      scan: v('Scanning… “everyone” means four people, two of them maybe.', 'Group size: loud. Actual pressure: imaginary.', 'Four people. Maybe.'),
      say: { no: v('Not tonight, I’m staying in. Have the best time!', 'I’m staying in tonight. Send me one blurry photo.', 'Staying in. Have fun.'), later: v('Not tonight, but I’m in for next weekend.', 'Not tonight. Next weekend, I’m all yours.', 'Not tonight. Next weekend.'), limit: v('I’ll come for one hour, then I’m heading home.', 'One hour, then I’m doing a very elegant exit.', 'One hour. Then home.'), yes: v('Yes! I’ll stay out all night.', 'Fine, I’m coming, all night.', 'Yes. All night.') },
      tag: { later: 'Next weekend', limit: '1 hour' },
      re: { no: v('No worries! We’ll send blurry photos!', 'Understood. We will now discuss you. Lovingly.', 'Fine. Photos later.'), later: v('Next weekend! I’m pinning it!', 'Next weekend? We’ll make a poll. A long poll.', 'Next weekend. Pinned.'), limit: v('One hour! Yay! Proper hugs, then!', 'One hour. We’ll pretend not to count. We will count.', 'One hour. Deal.'), yes: v('Yay!! We’re meeting at nine, then ten, then…', 'Brilliant. It’s an all-nighter. Bring snacks and a spare voice.', 'Great. Late one.') } },
    { id: 'borrow', name: 'Can I Borrow…?', costume: 'wallet', voice: 480, col: '#a8703f',
      ask: v('Could I borrow your car? And your charger? And your whole Saturday?', 'Borrow request: your car, your charger, your soul. Returnable. Probably.', 'Borrowing your weekend.'),
      scan: v('Scanning… the last thing borrowed is still missing since March.', 'Return history: poor. Charger last seen two years ago.', 'They don’t give things back.'),
      say: { no: v('I’m not lending it this time.', 'The lending library is closed this week.', 'Not lending it.'), later: v('Not this weekend, but I can help you find another option on Monday.', 'Not this weekend. Monday, I’ll help you hunt for a plan B.', 'Not this weekend. Monday.'), limit: v('You can borrow the charger, but I need it back tomorrow.', 'Charger, yes. Car, no. Soul, absolutely not. Back tomorrow.', 'Charger only. Back tomorrow.'), yes: v('Sure, take it all.', 'Fine, take the car, the charger and Saturday.', 'Okay. Take it.') },
      tag: { later: 'Monday', limit: 'Back tomorrow' },
      re: { no: v('Fair! I’ll ask someone with two cars.', 'A clear no. Honestly refreshing. I’ll bother my cousin.', 'Fine. Cousin.'), later: v('Monday! Very kind. I’ll bring a list.', 'Monday help? Look at you, all boundaried and generous.', 'Monday. Fine.'), limit: v('Back tomorrow! Pinky promise.', 'Back by tomorrow. I’ll set nine alarms. On your phone.', 'Tomorrow. Promise.'), yes: v('Thanks! Back soon! Ish! Maybe!', 'Wonderful. See you in March. Which March? Who knows.', 'Back… sometime.') } },
    { id: 'scroll', name: 'Five More Minutes', costume: 'scroll', voice: 560, col: '#8a8fa6',
      ask: v('Just five more minutes? Of… everything? Forever?', 'Five more minutes. Then five more. I’m an infinite scroll.', 'Five more minutes. Forever.'),
      scan: v('Scanning… “five minutes” detected. Actual: two hours.', 'Scroll length: infinite. Your thumb: tired.', 'Two hours. Not five.'),
      say: { no: v('Not tonight. The phone’s going on the charger.', 'Phone’s going to bed in the other room. Goodnight, scroll.', 'Phone on the charger. Done.'), later: v('Not now, but I’ll catch up at lunch tomorrow.', 'Not now. Lunch tomorrow, ten minutes. That’s the deal.', 'Not now. Lunch tomorrow.'), limit: v('Five minutes, with a timer, then I’m done.', 'Five real minutes. The timer is the boss now.', 'Five minutes. Timer on.'), yes: v('Sure, keep scrolling.', 'Fine, scroll me into the night.', 'Okay. Scroll.') },
      tag: { later: 'Lunch tomorrow', limit: '5 min timer' },
      re: { no: v('Charger time! Sleep well, thumbs!', 'Rejected by a human? Ugh. I’ll roll myself up.', 'Fine. Rolling up.'), later: v('Lunch! I’ll save the good bits.', 'Tomorrow lunch. I’ll keep scrolling without you.', 'Lunch. Okay.'), limit: v('A real five minutes! Timer’s ticking!', 'An actual timer? My nightmare. Fine.', 'Five. Timer on.'), yes: v('Yay! Okay, just one more video…', 'Excellent. See you at 3am.', 'See you at 3am.') } },
    { id: 'surprise', name: 'The Surprise Visit', costume: 'popper', voice: 700, col: '#ff8a3d',
      ask: v('Surprise! We’re all coming to yours tonight! Is that a yes?', 'Pop! Twelve people, your place, tonight. You love surprises, right?', 'Party at yours. Tonight.'),
      scan: v('Scanning… your fridge contains one lemon. Proceed carefully.', 'Hosting capacity: one sofa and a lemon.', 'You own one lemon.'),
      say: { no: v('Not tonight, I’m not hosting. Have a brilliant time!', 'My place is closed for a private event. Me.', 'Not hosting tonight.'), later: v('Not tonight, but I’d love to host next month.', 'Not tonight. Next month I’ll host, with more than a lemon.', 'Not tonight. Next month.'), limit: v('Two of you can pop by for an hour.', 'Two guests, one hour, zero confetti cannons.', 'Two people. One hour.'), yes: v('Sure, everyone come over!', 'Fine, bring all twelve.', 'Okay. Everyone.') },
      tag: { later: 'Next month', limit: '2 people · 1 hr' },
      re: { no: v('Fair! We’ll pop somewhere else! Pop!', 'Unpopped. Deflating gracefully. Love you.', 'Okay. Elsewhere.'), later: v('Next month! I’ll bring better snacks than a lemon.', 'Next month. I’ll save my confetti. It’s all I have.', 'Next month. Good.'), limit: v('An hour! Perfect, a tiny party!', 'Two people, one hour? A boutique surprise. Classy.', 'Two. One hour.'), yes: v('YAY! Twelve people incoming! Do you have chairs?', 'Wonderful. Hide the lemon, they’re hungry.', 'Twelve coming.') } }
  ];
  const GUILT = { id: 'guilt', name: 'The Guilt Trip', costume: 'suitcase', voice: 420, col: '#9a6a3a', twist: true,
    ask: v('After everything I’ve done for you? Really?', 'After everything I’ve done for you? (Tiny violin plays.)', 'After everything I did?'),
    scan: v('Scanning… guilt level: high. Actual emergency: none.', 'Scan says: one suitcase of guilt, zero real reasons.', 'Guilt. Not a reason.'),
    push: [v('I helped you move house, remember?', 'I carried your heavy lamp. The heavy one.', 'I helped you move.'), v('I thought we were close…', 'I’ll just sit alone. In the rain. With my violin.', 'Fine. I’ll be sad, then.'), v('It would only take a minute…', 'One minute. Tiny. Like this violin.', 'One minute. Please.')],
    hold: [v('I know you’ve helped me a lot, and I’m grateful. It’s still a no tonight.', 'I remember the lamp, and I’m grateful. Still no tonight.', 'I’m grateful. Still no.'), v('I hear you. My answer is still no.', 'I hear you. The answer’s still no.', 'Still no.'), v('I care about you, and it’s still a no.', 'Love you. Still no. Both true.', 'Still no. Kindly.')],
    re: v('…Okay. That was a lot of guilt. Sorry. See you next week?', 'Fine. I’ll go guilt someone in accounts. Respect, though.', 'Fair. Sorry. Bye.') };
  const KIND_ASK = { id: 'kind', name: 'A Kind Ask', costume: 'balloon', voice: 640, col: '#ff9ec7', gentle: true,
    ask: v('Would you like to come to my thing on Sunday? Totally fine if not!', 'Sunday thing? No pressure. Genuinely zero. I checked.', 'Sunday? No pressure.'),
    scan: v('Scanning… a kind ask. Every answer is welcome here.', 'Pressure detected: none. This is what nice feels like.', 'Kind ask. Any answer works.'),
    say: { no: v('Thanks for asking. I’ll sit this one out.', 'Thanks for asking. I’ll sit this one out.', 'Thanks. Not this time.'), later: v('Not Sunday, but I’d love to another time.', 'Not Sunday, but another time, yes please.', 'Not Sunday. Another time.'), limit: v('I can come for an hour.', 'I can do an hour, then I’m off.', 'One hour.'), yes: v('I’d love to!', 'Yes please!', 'Yes.') },
    tag: { later: 'Another time', limit: '1 hour' },
    re: { no: v('Of course! Thanks for telling me straight.', 'Totally fine! I love a clear answer.', 'Fine. Thanks.'), later: v('Lovely, another time then!', 'Another time! I’ll hold you to it. Gently.', 'Another time.'), limit: v('An hour would be perfect!', 'An hour of you? Perfect.', 'One hour. Great.'), yes: v('Yay! See you Sunday!', 'Brilliant! I’ll save you a seat.', 'Sunday, then.') } };
  const VIPS = [
    { id: 'bath', name: 'A Long Bath', short: 'Long bath', costume: 'bath', voice: 640, col: '#cfe9ff', ask: v('Room for a long bath tonight? I brought bubbles!', 'Hello. I’m forty minutes of hot water and zero emails.', 'Bath. Tonight.') },
    { id: 'book', name: 'That Book', short: 'That book', costume: 'book', voice: 560, col: '#3f6fd8', ask: v('Hi! I’m the book you keep meaning to read. Chapter three awaits!', 'Six weeks on your bedside table. Let me in.', 'Chapter three. Tonight.') },
    { id: 'early', name: 'An Early Night', short: 'Early night', costume: 'pillow', voice: 480, col: '#6a7cff', ask: v('Early night? Fresh sheets and nowhere to be.', 'I’m bedtime at a reasonable hour. Wild, right?', 'Bed. Early.') },
    { id: 'call', name: 'A Call With a Friend', short: 'Call a friend', costume: 'telephone', voice: 720, col: '#ff8fb1', ask: v('A call with someone who makes you laugh?', 'I’m a phone call you actually want. Rare. Collectable.', 'Call a friend.') },
    { id: 'film', name: 'A Film Night', short: 'Film night', costume: 'popcorn', voice: 660, col: '#ffe8a0', ask: v('Film night! Blanket, snacks, the good kind of quiet.', 'Popcorn, a blanket, zero plot twists about work.', 'Film. Blanket.') },
    { id: 'walk', name: 'An Evening Walk', short: 'Evening walk', costume: 'sneaker', voice: 600, col: '#4fd3a0', ask: v('A slow walk round the block? Fresh air, no rush.', 'I’m a walk. I promise not to turn into a run.', 'Walk. Fresh air.') }
  ];
  const VIP_SAY = { yes: v('You’re on the list. Come on in.', 'You’re on the list. The red carpet’s all yours.', 'On the list. In.'), no: v('Not tonight, but you’re always welcome.', 'Not tonight. Rain check, I promise.', 'Not tonight.'), later: v('Another night, I promise.', 'Another night. You’re still my favourite.', 'Another night.'), limit: v('Just a little of you tonight.', 'A small one tonight. Quality over quantity.', 'A little tonight.') };
  const VIP_RE = { yes: v('Yay! The good stuff gets in!', 'Oh, the red carpet. I feel so fancy.', 'In. Nice.'), no: v('That’s okay! I’ll come another night.', 'Rain check accepted. I’m very patient.', 'Another night.'), later: v('Another night! I’ll wait.', 'I’ll be here. I’m very patient.', 'Later, then.'), limit: v('A little is lovely!', 'Small but perfect. Like me.', 'A little. Good.') };
  const OWN = { id: 'own', name: '', costume: 'letter', voice: 560, col: '#f6ecd2', own: true,
    ask: v('I’m from your list. Do I get your evening tonight?', 'Hi, it’s me, from your list. Am I on tonight’s guest list?', 'From your list. Tonight?'),
    scan: v('Scanning… this one’s real. It can still wait for a fresher you.', 'Real task detected. You’re still allowed a bedtime.', 'Real. Can wait.'),
    say: { no: v('Not tonight. I’ll look at it when I’m fresh.', 'Not tonight. Fresh-brain me will handle you.', 'Not tonight.'), later: v('Not tonight, but I’ll give it proper time tomorrow.', 'Not tonight. Tomorrow you get my best hour.', 'Tomorrow, properly.'), limit: v('Twenty minutes tonight, then it waits.', 'Twenty minutes, then I’m clocking off.', 'Twenty minutes. Then stop.'), yes: v('Okay, come in, let’s do it.', 'Fine, come on in.', 'Okay. Tonight.') },
    tag: { later: 'Tomorrow', limit: '20 min' },
    re: { no: v('Okay! Tomorrow you’ll be fresher.', 'Fine. I’ll wait in the inbox. Patiently. Mostly.', 'Tomorrow, then.'), later: v('Tomorrow, properly. I like that.', 'Your best hour? Flattered.', 'Tomorrow. Good.'), limit: v('Twenty minutes. That’s a real start.', 'Twenty minutes. I’ll be efficient. Ish.', 'Twenty. Okay.'), yes: v('Okay! Let’s get going.', 'Right then. Rolling up my envelope sleeves.', 'Let’s go.') } };

  /* How each answer lands on the kind–firm balance (both count; neither alone is the goal). */
  const KF = { no: [0.85, 1], later: [0.95, 0.85], limit: [1, 0.72], yes: [1, 0.15], vip: [1, 1], hold: [0.9, 1] };
  const PHRASE_TOTAL = DEMANDS.length * 3 + 1;

  /* Tonight's club (a different one each day). */
  const CLUBS = [
    { id: 'jazz', name: 'Jazz Lounge', music: 'noir',
      d: { sky: ['#050816', '#141c3a'], wall: '#4d2a22', mortar: '#2b1610', trim: '#2a1a16', door: '#3b2416', light: '#ffcf87', room: ['#4a2418', '#2a120c'], neon: '#ff8fc8', neon2: '#ffd27a', pave: ['#151826', '#07080d'], carpet: '#8d1c2e', rope: '#b0263d', brass: '#e0ac48', stars: 1 },
      b: { sky: ['#283a7a', '#e88a6a'], wall: '#8a4c3c', mortar: '#5a3226', trim: '#5a3b30', door: '#5a3624', light: '#ffe2ae', room: ['#8a4a30', '#5a2a18'], neon: '#ff5fa8', neon2: '#ffcf6b', pave: ['#4b4560', '#2a2638'], carpet: '#a8253a', rope: '#c83048', brass: '#eab650', stars: 0.35 } },
    { id: 'cinema', name: 'Velvet Cinema', music: 'lofi',
      d: { sky: ['#07040f', '#1d0f2a'], wall: '#5e1424', mortar: '#3c0a14', trim: '#d9a441', door: '#2c0a12', light: '#ffd9a0', room: ['#3a0e18', '#1c060c'], neon: '#ff5577', neon2: '#fff1d6', pave: ['#18101c', '#08050a'], carpet: '#a01628', rope: '#c8203a', brass: '#e6b24c', stars: 1 },
      b: { sky: ['#3a2a6a', '#f09878'], wall: '#9e2c3e', mortar: '#6a1626', trim: '#e8b450', door: '#5a1622', light: '#ffe6b8', room: ['#7a2030', '#4a0e1a'], neon: '#ff3d66', neon2: '#fff4dc', pave: ['#4e3a52', '#2c1f30'], carpet: '#b01c30', rope: '#d42a44', brass: '#efbe5a', stars: 0.35 } },
    { id: 'library', name: 'Late Library', music: 'calm',
      d: { sky: ['#030f18', '#0f2a36'], wall: '#2e3c35', mortar: '#1b2621', trim: '#1a2420', door: '#1f4a3a', light: '#ffe2a8', room: ['#3a2e1c', '#1e170c'], neon: '#7fffd4', neon2: '#ffe08a', pave: ['#101a1c', '#05090a'], carpet: '#7a1f30', rope: '#a82438', brass: '#d9a441', stars: 1 },
      b: { sky: ['#2c4a6a', '#f0b27a'], wall: '#5c7266', mortar: '#3e5046', trim: '#3a4a42', door: '#2e6a54', light: '#fff0c8', room: ['#7a5a34', '#4a361c'], neon: '#1fd8a8', neon2: '#ffcf6b', pave: ['#46505a', '#262c34'], carpet: '#9a2438', rope: '#c02c42', brass: '#e6b450', stars: 0.35 } }
  ];

  /* Words that suggest someone may be controlling or unsafe: then no comedy about pushiness, a gentle twist, support shown. */
  const UNSAFE = /\b(controll?ing|controls? (me|my)|won'?t let me|doesn'?t let me|not allowed to|check(s|ing)? my (phone|messages|texts)|track(s|ing)? (me|my)|monitor(s|ing)? (me|my)|isolat\w*|scared of (him|her|them|my)|afraid of (him|her|them|my)|threat\w*|yell(s|ing)? at me|scream(s|ing)? at me|shout(s|ing)? at me|forc(e|es|ed|ing) me|pressur(e|es|ed|ing) me|guilt[- ]?trip\w*|guilts? me|manipulat\w*|gaslight\w*|stalk\w*|eggshells|coerc\w*|hurts? me|hit(s|ting)? me|push(es|ed)? me|grab(s|bed)? me|unsafe|not safe|abus\w*|punish(es|ed|ing)? me|gets? (angry|mad|furious|violent) (if|when) i)\b/i;
  const ICONS = {
    palm: '<path d="M8.6 20.6c-2.7-1.9-4.2-4.6-4.9-7.4l-.6-2.4c-.3-1 .9-1.6 1.6-.9l2 2.1V5.2c0-.9.7-1.5 1.5-1.5s1.5.6 1.5 1.5v5.3V3.6c0-.9.7-1.5 1.5-1.5s1.5.6 1.5 1.5v6.9V4.3c0-.9.7-1.5 1.5-1.5s1.5.6 1.5 1.5v6.6V6.3c0-.9.7-1.5 1.5-1.5s1.5.6 1.5 1.5v7.8c0 3.2-1.3 5.4-3.2 6.5"/>',
    later: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.8h17M8 3v4M16 3v4"/><path d="M12 12.6v3.2l2.2 1.4"/>',
    limit: '<path d="M3 9.5h18v5H3z"/><path d="M7.5 9.5v5M16.5 9.5v5"/><circle cx="12" cy="12" r="1.3"/>',
    door: '<path d="M6 21V5.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2V21"/><path d="M3.5 21h17"/><circle cx="14.6" cy="12.6" r=".9"/>'
  };

  function softwareGfx() {
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r);
    } catch (e) { return false; }
  }
  const mixHex = (a, b, k) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), m = (s) => Math.round(((pa >> s) & 255) + ((((pb >> s) & 255) - ((pa >> s) & 255)) * k));
    return '#' + ((1 << 24) + (m(16) << 16) + (m(8) << 8) + m(0)).toString(16).slice(1);
  };
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

  (env.games = env.games || []).push({
    id: ID, mode: 'reset', name: 'Bouncer', verb: 'answer', family: 'CONNECT', minutes: 2,
    parents: ['Communication / Boundaries', 'Social / Team / Perspective', 'Values / Meaning / Grief'],
    cast: ['patch', 'rush', 'glitch'], poster: { char: 'patch', mood: 'cool' },
    tagline: 'Work the velvet rope of your own evening: kind no, firm rope.',
    why: 'For a hard time saying no: practise kind, firm answers and keep room for what matters.',
    fonts: ['Yellowtail', 'DM Serif Display', 'Figtree:wght@500;600;700'],
    css: `
.g-bouncer { --bn-script: "Yellowtail", "Lora", "Brush Script MT", cursive; --bn-serif: "DM Serif Display", "Lora", Georgia, serif; --bn-ui: "Figtree", "Inter", system-ui, sans-serif;
  --bn-desk: rgba(22, 10, 18, 0.9); --bn-ink: #fff4ec; --bn-muted: #e2c9cf; --bn-line: rgba(255, 228, 210, 0.2); --bn-card: rgba(255, 255, 255, 0.07); --bn-gold: #e8b450; background: #0b0710; }
.g-bouncer.bn-bright { --bn-desk: rgba(255, 249, 244, 0.94); --bn-ink: #2b1420; --bn-muted: #6a4a58; --bn-line: rgba(43, 20, 32, 0.16); --bn-card: rgba(43, 20, 32, 0.04); --bn-gold: #a8721a; background: #2b2a52; }
.g-bouncer .gk-intro { background: radial-gradient(ellipse at 50% 40%, rgba(120, 24, 48, 0.64), rgba(8, 4, 12, 0.93)); -webkit-backdrop-filter: none; backdrop-filter: none; color: #fff; }
.g-bouncer .gk-intro-title { font-family: var(--bn-script); font-weight: 400; font-size: clamp(54px, 15cqw, 92px); line-height: 1.05; color: #fff1f6; padding: 0 10px 6px; text-shadow: 0 0 6px #ff6fa8, 0 0 18px #ff3d84, 0 0 42px #ff8a3d; }
.g-bouncer .gk-intro-sub { color: #f6e8ee; font-family: var(--bn-ui); }
.g-bouncer .gk-intro-how { color: #ffd27a; font-family: var(--bn-ui); }
.g-bouncer .gk-intro-tap { color: #f1e1e8; }
.g-bouncer .bn-sign { position: absolute; z-index: 18; left: 50%; top: 0; transform: translateX(-50%); pointer-events: none; text-align: center; white-space: nowrap; font: 400 var(--fs, 46px)/1 var(--bn-script); color: #fff6fa;
  text-shadow: 0 0 4px var(--n1), 0 0 12px var(--n1), 0 0 28px var(--n1), 0 0 2px #fff; animation: bouncer-buzz 7s linear infinite; }
.g-bouncer .bn-sign small { display: block; margin-top: 2px; font: 700 12px/1 var(--bn-ui); letter-spacing: 0.32em; text-transform: uppercase; color: var(--n2); text-shadow: 0 0 6px var(--n2), 0 0 14px var(--n2); }
.g-bouncer .bn-sign.bn-steady { animation: none; }
@keyframes bouncer-buzz { 0%, 11%, 13%, 54%, 56%, 100% { opacity: 1; } 12% { opacity: 0.55; } 55% { opacity: 0.7; } }
.g-bouncer .bn-guest { position: absolute; z-index: 26; left: 0; top: 0; width: var(--gw, 96px); height: var(--gh, 120px); margin: calc(var(--gh, 120px) * -1) 0 0 calc(var(--gw, 96px) * -0.5); transform-origin: 50% 100%; pointer-events: none; will-change: transform; }
.g-bouncer .bn-guest svg { display: block; width: 100%; height: 100%; overflow: visible; }
.g-bouncer .bn-guest.bn-front { pointer-events: auto; cursor: grab; touch-action: none; }
.g-bouncer .bn-m, .g-bouncer .bn-brow { display: none; }
.g-bouncer .bn-guest[data-mood="ask"] .bn-m-ask, .g-bouncer .bn-guest[data-mood="happy"] .bn-m-happy, .g-bouncer .bn-guest[data-mood="ok"] .bn-m-ok,
.g-bouncer .bn-guest[data-mood="sad"] .bn-m-sad, .g-bouncer .bn-guest[data-mood="sad"] .bn-brow, .g-bouncer .bn-guest[data-mood="o"] .bn-m-o { display: inline; }
.g-bouncer .bn-walk .bn-l1 { animation: bouncer-leg 0.34s ease-in-out infinite alternate; }
.g-bouncer .bn-walk .bn-l2 { animation: bouncer-leg 0.34s ease-in-out -0.17s infinite alternate-reverse; }
@keyframes bouncer-leg { from { transform: rotate(-16deg); } to { transform: rotate(16deg); } }
.g-bouncer .bn-violin, .g-bouncer .bn-bow { transform-box: view-box; }
.g-bouncer .bn-guest.bn-play .bn-bow { animation: bouncer-bow 0.5s ease-in-out infinite alternate; transform-origin: 103px 74px; }
@keyframes bouncer-bow { from { transform: rotate(-12deg); } to { transform: rotate(10deg); } }
.g-bouncer .bn-band { position: absolute; left: 50%; bottom: 30%; transform: translateX(-50%) rotate(-4deg); padding: 3px 7px; border-radius: 6px; font: 700 12px/1.1 var(--bn-ui); letter-spacing: 0.04em; text-transform: uppercase;
  white-space: nowrap; color: #2b1420; background: var(--bc, #ffd27a); border: 2px solid #24151f; box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35); animation: bouncer-stamp 0.45s cubic-bezier(.2, 1.6, .4, 1) both; }
@keyframes bouncer-stamp { from { transform: translateX(-50%) rotate(-4deg) scale(1.8); opacity: 0; } to { transform: translateX(-50%) rotate(-4deg) scale(1); opacity: 1; } }
.g-bouncer .bn-palm { position: absolute; z-index: 27; left: 0; top: 0; width: 120px; height: 120px; margin: -60px 0 0 -60px; pointer-events: none; opacity: 0; transform-origin: 50% 80%; }
.g-bouncer .bn-palm svg { width: 100%; height: 100%; fill: rgba(255, 244, 228, 0.92); stroke: #24151f; stroke-width: 1.3; stroke-linejoin: round; filter: drop-shadow(0 0 14px rgba(255, 210, 140, 0.85)); }
.g-bouncer .bn-door-sign { position: absolute; z-index: 27; left: 0; top: 0; transform: translate(-50%, 0); min-width: 74px; min-height: 44px; padding: 7px 10px 6px; box-sizing: border-box; border-radius: 8px;
  background: #fff3dc; color: #2b1420; border: 2px solid #24151f; font: 700 13px/1.05 var(--bn-ui); letter-spacing: 0.1em; text-transform: uppercase; text-align: center; cursor: pointer; box-shadow: 0 6px 14px rgba(0, 0, 0, 0.4);
  transform-origin: 50% -10px; transition: transform 0.5s cubic-bezier(.3, 1.6, .5, 1), background 0.3s; }
.g-bouncer .bn-door-sign::before { content: ""; position: absolute; left: 50%; top: -15px; width: 30px; height: 14px; margin-left: -15px; border: 2px solid #c9b48a; border-bottom: 0; border-radius: 16px 16px 0 0; }
.g-bouncer .bn-door-sign small { display: block; margin-top: 2px; font: 600 12px/1 var(--bn-ui); letter-spacing: 0.02em; text-transform: none; color: #8a3a52; }
.g-bouncer .bn-door-sign.bn-closed { background: #ffd9e4; transform: translate(-50%, 0) rotate(-3deg); }
.g-bouncer .bn-door-sign:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.g-bouncer .bn-desk { position: absolute; z-index: 36; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 12px); width: min(560px, calc(100% - 16px)); height: var(--dh, 196px); box-sizing: border-box; padding: 10px 10px 10px;
  border-radius: 22px; background: var(--bn-desk); border: 1px solid var(--bn-line); color: var(--bn-ink); font-family: var(--bn-ui); display: flex; flex-direction: column; gap: 8px; transform: translateX(-50%);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1); transition: transform 0.7s cubic-bezier(.3, 1.2, .5, 1), opacity 0.5s ease; }
.g-bouncer .bn-desk.bn-away { transform: translate(-50%, calc(100% + 40px)); opacity: 0; pointer-events: none; }
.g-bouncer .bn-ticket { position: relative; flex: 1; min-height: 0; padding: 7px 12px 8px; border-radius: 14px; background: var(--bn-card); border: 1px dashed var(--bn-line); overflow: hidden; }
.g-bouncer .bn-who { display: flex; align-items: center; gap: 8px; min-width: 0; height: 18px; }
.g-bouncer .bn-who b { font: 400 15px/1 var(--bn-serif); letter-spacing: 0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--who, var(--bn-gold)); }
.g-bouncer .bn-who b.gk-user { font-family: var(--bn-ui); font-weight: 700; font-size: 15px; }
.g-bouncer .bn-who span { flex: none; font: 700 12px/1 var(--bn-ui); letter-spacing: 0.14em; text-transform: uppercase; color: var(--bn-muted); }
.g-bouncer .bn-line { margin: 5px 0 0; font: 500 15px/1.32 var(--bn-ui); color: var(--bn-ink); text-wrap: pretty; }
.g-bouncer .bn-line.bn-you { font-weight: 600; }
.g-bouncer .bn-line.bn-you::before { content: "You: "; font: 700 12px/1 var(--bn-ui); letter-spacing: 0.12em; text-transform: uppercase; color: var(--bn-gold); }
.g-bouncer .bn-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; height: 82px; flex: none; }
.g-bouncer .bn-card { position: relative; appearance: none; margin: 0; min-height: 44px; border-radius: 16px; border: 1.5px solid color-mix(in srgb, var(--c) 70%, transparent); background: color-mix(in srgb, var(--c) 15%, var(--bn-card));
  color: var(--bn-ink); font-family: var(--bn-ui); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 4px 6px; cursor: grab; touch-action: none; overflow: hidden;
  transition: transform 0.15s ease, opacity 0.25s ease, box-shadow 0.2s ease; box-shadow: 0 6px 14px rgba(0, 0, 0, 0.22); }
.g-bouncer .bn-card::before { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: calc(var(--k, 0) * 100%); background: color-mix(in srgb, var(--c) 42%, transparent); pointer-events: none; }
.g-bouncer .bn-card svg { position: relative; width: 26px; height: 26px; fill: none; stroke: var(--ci, var(--c)); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.g-bouncer .bn-card b { position: relative; font: 700 13px/1.1 var(--bn-ui); text-align: center; }
.g-bouncer .bn-card small { position: relative; font: 600 12px/1 var(--bn-ui); color: var(--bn-muted); }
.g-bouncer .bn-card:disabled, .g-bouncer .bn-card.bn-off { opacity: 0.38; cursor: default; box-shadow: none; }
.g-bouncer .bn-card.bn-lift { opacity: 0.25; }
.g-bouncer .bn-card:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
.g-bouncer .bn-card.bn-hot { transform: translateY(-3px) scale(1.04); box-shadow: 0 0 0 2px var(--c), 0 10px 24px rgba(0, 0, 0, 0.3); }
.g-bouncer .bn-ghost { position: absolute; z-index: 40; left: 0; top: 0; width: 118px; height: 64px; margin: -32px 0 0 -59px; border-radius: 14px; pointer-events: none; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px;
  box-sizing: border-box; background: color-mix(in srgb, var(--c) 30%, #1a0e16); border: 2px solid var(--c); color: #fff; font: 700 13px/1.1 var(--bn-ui); text-align: center; box-shadow: 0 12px 26px rgba(0, 0, 0, 0.45), 0 0 18px var(--c); will-change: transform; }
.g-bouncer .bn-ghost svg { width: 22px; height: 22px; flex: none; fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.g-bouncer .bn-hint { position: absolute; right: 14px; top: 10px; font: 600 12px/1 var(--bn-ui); color: var(--bn-muted); letter-spacing: 0.04em; display: flex; align-items: center; gap: 5px; }
.g-bouncer .bn-hint svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.g-bouncer .bn-chips { position: absolute; z-index: 37; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 12px); width: min(560px, calc(100% - 16px)); box-sizing: border-box; transform: translateX(-50%);
  padding: 14px 12px 14px; border-radius: 22px; background: var(--bn-desk); border: 1px solid var(--bn-line); color: var(--bn-ink); font-family: var(--bn-ui); text-align: center;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5); animation: bouncer-rise 0.55s cubic-bezier(.3, 1.3, .5, 1) both; }
.g-bouncer .bn-chips.bn-out { animation: bouncer-sink 0.4s ease both; pointer-events: none; }
@keyframes bouncer-rise { from { opacity: 0; transform: translate(-50%, 24px); } to { opacity: 1; transform: translate(-50%, 0); } }
@keyframes bouncer-sink { to { opacity: 0; transform: translate(-50%, 24px); } }
.g-bouncer .bn-chips h3 { margin: 0 0 3px; font: 400 22px/1.1 var(--bn-serif); color: var(--bn-ink); }
.g-bouncer .bn-chips p { margin: 0 0 11px; font: 500 14px/1.3 var(--bn-ui); color: var(--bn-muted); }
.g-bouncer .bn-chip-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.g-bouncer .bn-chip { appearance: none; min-height: 44px; padding: 10px 15px; border-radius: 999px; border: 1.5px solid color-mix(in srgb, var(--c) 75%, transparent); background: color-mix(in srgb, var(--c) 16%, var(--bn-card));
  color: var(--bn-ink); font: 600 15px/1.1 var(--bn-ui); cursor: pointer; transition: transform 0.15s ease, background 0.2s ease; }
.g-bouncer .bn-chip:active { transform: scale(0.95); }
.g-bouncer .bn-chip.bn-picked { background: color-mix(in srgb, var(--c) 55%, var(--bn-card)); transform: scale(1.06); }
.g-bouncer .bn-chip:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.g-bouncer .bn-pop { position: absolute; z-index: 38; left: 0; top: 0; transform: translate(-50%, -50%); font: 400 26px/1 var(--bn-serif); color: #fff; white-space: nowrap; pointer-events: none;
  text-shadow: 0 0 10px var(--c), 0 0 22px var(--c), 0 2px 3px rgba(0, 0, 0, 0.55); animation: bouncer-pop 1.1s ease-out both; }
.g-bouncer.bn-bright .bn-pop { color: var(--c2, #2b1420); text-shadow: 0 1px 0 #fff, 0 0 12px rgba(255, 255, 255, 0.95); }
@keyframes bouncer-pop { 0% { opacity: 0; transform: translate(-50%, -30%) scale(0.7); } 18% { opacity: 1; transform: translate(-50%, -60%) scale(1.1); } 75% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -130%) scale(1); } }
.g-bouncer .bn-book { position: absolute; z-index: 39; left: 50%; width: min(460px, calc(100% - 24px)); box-sizing: border-box; transform: translateX(-50%); padding: 16px 16px 14px; border-radius: 20px;
  background: linear-gradient(180deg, #fff8ee, #ffeedd); color: #2b1420; border: 2px solid #24151f; font-family: var(--bn-ui); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55), 0 0 0 6px rgba(232, 180, 80, 0.35);
  animation: bouncer-book 0.7s cubic-bezier(.2, 1.3, .4, 1) both; }
@keyframes bouncer-book { from { opacity: 0; transform: translate(-50%, 30px) rotate(-2deg) scale(0.94); } to { opacity: 1; transform: translate(-50%, 0) rotate(0deg); } }
.g-bouncer .bn-book h3 { margin: 0 0 8px; font: 400 23px/1.1 var(--bn-serif); text-align: center; }
.g-bouncer .bn-book ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 7px; }
.g-bouncer .bn-book li { font: 600 15px/1.3 var(--bn-ui); padding: 8px 10px; border-radius: 10px; background: rgba(255, 255, 255, 0.75); border: 1px solid rgba(43, 20, 32, 0.12); }
.g-bouncer .bn-book li small { display: block; font: 700 12px/1 var(--bn-ui); letter-spacing: 0.1em; text-transform: uppercase; color: #9a4a62; margin-bottom: 3px; }
.g-bouncer .bn-book p { margin: 9px 0 0; font: 600 13px/1.35 var(--bn-ui); color: #6a4a58; text-align: center; }
.g-bouncer .bn-book p.bn-support { color: #2b1420; background: #fff; border-radius: 10px; padding: 8px 10px; border: 1px solid rgba(43, 20, 32, 0.18); }
.g-bouncer .gk-char .gk-bubble { font-family: var(--bn-ui); }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const inten = [0, 1, 2].includes(ctx.intensity) ? ctx.intensity : 1;
      const visits = K.visits(), dayN = K.daily();
      const line = (o) => ctx.line(o);
      const text = String(ctx.text || '');
      let care = an.safety === 'care';
      const gentle = UNSAFE.test(text);
      const dark = () => K.dark();
      let cq = ''; try { cq = (/[?&]bnclub=([a-z]+)/.exec(window.location.search) || [])[1] || ''; } catch (e) { cq = ''; }
      let CI = CLUBS.findIndex(c => c.id === cq); if (CI < 0) CI = (dayN + 1) % CLUBS.length;
      const CLUB = CLUBS[CI], CLUB_NEXT = CLUBS[(CI + 1) % CLUBS.length];
      const pal = () => CLUB[dark() ? 'd' : 'b'];
      const HOLD_MS = [1050, 850, 750][inten];
      const SOFT = softwareGfx();
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => { if (a && a.safety === 'care') care = true; }).catch(() => {});

      /* ---------------- tonight's queue ---------------- */
      const rng = K.rng(dayN * 31 + 7);
      const pool = K.shuffle(DEMANDS, rng);
      function ownLabel() { // a task from the player's own words, used only as its label (never in care mode or when someone may be unsafe)
        if (care || gentle || !text.trim()) return '';
        const c = [an.core].concat(an.strands || []).filter(s => s && s.label && !s.generic && s.loop === 'todo');
        return c.length ? c[0].label : '';
      }
      const own = ownLabel();
      const nDem = [4, 5, 7][inten];
      const queue = [];
      let di = 0;
      const nextDemand = () => pool[di++ % pool.length];
      queue.push(nextDemand(), nextDemand(), 'VIP', nextDemand());
      if (own) queue.push(Object.assign({}, OWN, { name: own }));
      else if (nDem >= 5) queue.push(nextDemand());
      queue.push(gentle ? KIND_ASK : GUILT);
      while (queue.filter(x => x !== 'VIP' && !x.twist && !x.gentle).length < nDem + (own ? 1 : 0)) queue.push(nextDemand());

      /* ---------------- scene ---------------- */
      el.classList.toggle('bn-bright', !dark());
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1.25 : 1.5 });
      const P = K.particles({ max: 240 });
      const sign = h('div', { class: 'bn-sign', 'aria-hidden': 'true' }, document.createTextNode('Your Time'), h('small', { text: CLUB.name }));
      const palm = h('div', { class: 'bn-palm', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24">' + ICONS.palm + '</svg>' });
      const doorSign = h('button', { type: 'button', class: 'bn-door-sign', 'aria-label': 'Door sign: open. At closing time, tap to flip it to closed.' }, h('span', { text: 'Open' }));
      el.append(sign, palm, doorSign);

      /* the desk: the ask (ticket) and the three answer cards */
      const whoName = h('b', { text: '' }), whoTag = h('span', { text: '' });
      const lineEl = h('p', { class: 'bn-line', 'aria-live': 'polite' });
      const hint = h('span', { class: 'bn-hint', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24"><path d="M4 12h14M13 6l6 6-6 6"/></svg>' }, h('span', { text: 'or swipe them in' }));
      const ticket = h('div', { class: 'bn-ticket' }, h('div', { class: 'bn-who' }, whoName, whoTag), lineEl, hint);
      const mkCard = (kind, icon, title, sub, c, aria) => { const b = h('button', { type: 'button', class: 'bn-card', 'data-kind': kind, 'aria-label': aria, style: { '--c': c } }, h('span', { html: '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[icon] + '</svg>' }), h('b', { text: title }), h('small', { text: sub })); return b; };
      const cardNo = mkCard('no', 'palm', 'Kind no', 'hold', '#ff7a9c', 'Kind no. Press and hold.');
      const cardLater = mkCard('later', 'later', 'Not tonight, but…', 'drag to them', '#7fc8ff', 'Not tonight, but later. Drag onto the guest, or press.');
      const cardLimit = mkCard('limit', 'limit', 'Yes, with limits', 'drag to them', '#ffd27a', 'Yes, with limits. Drag onto the guest, or press.');
      const cards = [cardNo, cardLater, cardLimit];
      const desk = h('div', { class: 'bn-desk bn-away' }, ticket, h('div', { class: 'bn-cards' }, cards));
      el.append(desk);

      /* the door crew */
      const patch = K.character('patch', { side: 'left', mood: 'cool', size: 60, x: 0, y: 0, voice: 520 });
      const rush = K.character('rush', { side: 'right', mood: 'happy', size: 54, x: 0, y: 0, voice: 760 });
      const glitch = K.character('glitch', { side: 'left', mood: 'scan', size: 50, x: 0, y: 0, voice: 900 });
      const crew = { patch, rush, glitch };
      let talker = null;
      function say(who, lines, ms, mood) {
        const c = crew[who]; if (!c) return;
        Object.keys(crew).forEach(k => { if (k !== who) crew[k].hush(); });
        talker = who;
        c.say(typeof lines === 'string' ? lines : line(lines), Object.assign({ ms: ms || 3200 }, mood ? { mood, moodMs: ms || 3200 } : {}));
      }

      /* ---------------- layout ---------------- */
      const G = { w: 0, H: 0, phone: true };
      const L = {};
      let GLOW = {};
      function off(w, hh, s) { s = s || cv.dpr; const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(hh * s)); const g = c.getContext('2d'); g.setTransform(s, 0, 0, s, 0, 0); return { c, g, w, h: hh, s }; }
      function sprite(col, size, stops) { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r); stops.forEach(([k, a]) => gr.addColorStop(k, K.hexA(col, a))); g.fillStyle = gr; g.fillRect(0, 0, size, size); return c; }
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const ph = w < 700;
        Object.assign(G, { w, H, phone: ph });
        G.dh = ph ? 192 : 196;
        desk.style.setProperty('--dh', G.dh + 'px');
        G.deskTop = H - 12 - G.dh;
        const fw = ph ? w : Math.min(780, w - 160), fx0 = (w - fw) / 2;
        G.fx0 = fx0; G.fx1 = fx0 + fw;
        G.street = Math.round(Math.min(G.deskTop - (ph ? 172 : 190), ph ? 470 : 470));
        G.signY = ph ? 132 : 112; G.signFs = ph ? 46 : 58;
        const dw = ph ? 106 : 140;
        G.door = { x: Math.round(fx0 + fw * (ph ? 0.74 : 0.73)), w: dw, top: Math.round(G.street - (ph ? 212 : 236)), bot: G.street };
        G.win = { x0: Math.round(fx0 + fw * (ph ? 0.055 : 0.07)), x1: Math.round(fx0 + fw * (ph ? 0.48 : 0.5)), y0: Math.round(G.street - (ph ? 200 : 220)), y1: Math.round(G.street - (ph ? 64 : 70)) };
        G.lamp = { x: G.door.x, y: G.door.top - 16 };
        const gScale = ph ? 1 : 1.2;
        G.gw = Math.round(96 * gScale); G.gh = Math.round(120 * gScale);
        G.front = { x: Math.round(ph ? w * 0.42 : fx0 + fw * 0.4), y: Math.round(G.deskTop - (ph ? 12 : 16)) };
        G.queue = [0, 1, 2].map(i => ({ x: Math.round(G.front.x - (ph ? 112 : 150) * (i + 1)), y: G.front.y - 6, s: 0.72 - i * 0.06 }));
        G.rope = { x0: Math.round(G.door.x - dw * 0.52), x1: Math.round(G.door.x + dw * 0.5 + (ph ? 8 : 18)), y: Math.round(G.front.y - (ph ? 54 : 66)), h: ph ? 64 : 78 };
        if (ph) { G.rope.x1 = Math.min(G.rope.x1, w - 12); }
        G.inside = { x: G.door.x, y: G.street - 6 };
        const crewPos = ph
          ? { glitch: [w - 36, G.signY + 112, 50], rush: [Math.round((G.win.x0 + G.win.x1) / 2), G.win.y1 + 4, 54], patch: [w - 34, G.street + 14, 60] }
          : { glitch: [G.fx1 - 46, G.signY + 132, 66], rush: [Math.round((G.win.x0 + G.win.x1) / 2), G.win.y1 + 6, 72], patch: [Math.min(w - 50, G.door.x + dw / 2 + 58), G.street + 10, 82] };
        Object.keys(crewPos).forEach(k => { const [x, y, s] = crewPos[k]; const c = crew[k]; c.el.style.setProperty('--sz', s + 'px'); c.place(x - s / 2, y - s); G[k] = { x, y, s }; });
        sign.style.top = G.signY - G.signFs * 0.5 + 'px'; sign.style.setProperty('--fs', G.signFs + 'px'); sign.style.left = (fx0 + fw / 2) + 'px';
        doorSign.style.left = G.door.x + 'px'; doorSign.style.top = (G.door.top + (ph ? 70 : 84)) + 'px';
        guests.forEach(gu => { gu.el.style.setProperty('--gw', G.gw + 'px'); gu.el.style.setProperty('--gh', G.gh + 'px'); });
        buildSprites(); paintBg();
      }
      function buildSprites() {
        const p = pal();
        GLOW = { light: sprite(p.light, 64, [[0, 0.85], [0.4, 0.3], [1, 0]]), neon: sprite(p.neon, 64, [[0, 0.7], [0.45, 0.22], [1, 0]]), neon2: sprite(p.neon2, 64, [[0, 0.7], [0.45, 0.22], [1, 0]]), white: sprite('#ffffff', 32, [[0, 1], [0.3, 0.6], [1, 0]]), gold: sprite('#ffd27a', 32, [[0, 1], [0.3, 0.6], [1, 0]]) };
      }

      /* ---------------- painting the street (cached; repainted on resize and theme change) ---------------- */
      function paintBg() {
        if (!G.w) return;
        const w = G.w, H = G.H, D = dark(), p = pal(), R = K.rng(9 + CI);
        L.bg = off(w, H); G.posts = [];
        const g = L.bg.g;
        let gr = g.createLinearGradient(0, 0, 0, G.street); gr.addColorStop(0, p.sky[0]); gr.addColorStop(1, p.sky[1]);
        g.fillStyle = gr; g.fillRect(0, 0, w, G.street + 2);
        for (let i = 0; i < 90 * p.stars; i++) { g.globalAlpha = (0.25 + R() * 0.6) * (D ? 1 : 0.6); g.fillStyle = '#fff'; g.fillRect(R() * w, R() * G.street * 0.5, 1.3, 1.3); }
        g.globalAlpha = 1;
        const mx = G.phone ? w * 0.14 : G.fx0 * 0.45, my = G.phone ? 104 : 120;
        const mg = g.createRadialGradient(mx, my, 4, mx, my, 90); mg.addColorStop(0, K.hexA(D ? '#fff4d6' : '#fff8e8', D ? 0.45 : 0.55)); mg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = mg; g.fillRect(mx - 90, my - 90, 180, 180); g.fillStyle = D ? '#fff3d0' : '#fffaf0'; g.beginPath(); g.arc(mx, my, D ? 14 : 18, 0, TAU); g.fill();
        // neighbours on the wide screen
        if (!G.phone) {
          const bcol = D ? '#0c0f1c' : '#3a3460';
          [[0, G.fx0 - 4], [G.fx1 + 4, w]].forEach(([a, b]) => {
            let x = a;
            while (x < b) { const bw = 60 + R() * 90, bh = 160 + R() * 200; g.fillStyle = bcol; g.fillRect(x, G.street - bh, Math.min(bw, b - x), bh); g.fillStyle = K.hexA(p.light, D ? 0.5 : 0.4); for (let yy = G.street - bh + 14; yy < G.street - 20; yy += 26) for (let xx = x + 10; xx < Math.min(x + bw, b) - 12; xx += 22) if (R() < 0.3) g.fillRect(xx, yy, 9, 13); x += bw + 6; }
          });
        }
        // the club facade
        const fx0 = G.fx0, fx1 = G.fx1, top = G.phone ? 60 : 64;
        g.fillStyle = p.wall; g.fillRect(fx0, top, fx1 - fx0, G.street - top);
        if (CLUB.id === 'cinema') { // velvet stucco panels with gold trim
          for (let x = fx0 + 14; x < fx1 - 20; x += 64) { g.strokeStyle = K.hexA(p.trim, 0.45); g.lineWidth = 2; g.strokeRect(x, top + 90, 50, G.street - top - 110); }
        } else { // bricks
          g.fillStyle = p.mortar;
          for (let y = top + 6, row = 0; y < G.street; y += 11, row++) { g.globalAlpha = 0.55; g.fillRect(fx0, y, fx1 - fx0, 2); g.globalAlpha = 0.45; for (let x = fx0 + (row % 2 ? 0 : 13); x < fx1; x += 26) g.fillRect(x, y - 9, 2, 9); }
          g.globalAlpha = 1;
          for (let i = 0; i < 70; i++) { g.globalAlpha = 0.12; g.fillStyle = R() < 0.5 ? '#000' : '#fff'; g.fillRect(fx0 + R() * (fx1 - fx0), top + R() * (G.street - top), 24, 9); }
          g.globalAlpha = 1;
        }
        g.fillStyle = p.trim; g.fillRect(fx0 - 6, top - 6, fx1 - fx0 + 12, 14);
        // sign backing board
        const sbw = Math.min(fx1 - fx0 - 30, G.phone ? 320 : 420), sby = G.signY - G.signFs * 0.62;
        g.fillStyle = D ? 'rgba(10,6,12,0.75)' : 'rgba(40,20,30,0.55)'; roundRect(g, (fx0 + fx1) / 2 - sbw / 2, sby, sbw, G.signFs * 1.6, 12); g.fill();
        g.strokeStyle = K.hexA(p.brass, 0.7); g.lineWidth = 2; g.stroke();
        // window with the room behind it (the room's life is drawn each frame)
        const W2 = G.win;
        g.fillStyle = p.trim; roundRect(g, W2.x0 - 7, W2.y0 - 7, W2.x1 - W2.x0 + 14, W2.y1 - W2.y0 + 14, 6); g.fill();
        // door frame, arch and steps
        const D2 = G.door;
        g.fillStyle = p.trim; roundRect(g, D2.x - D2.w / 2 - 9, D2.top - 9, D2.w + 18, D2.bot - D2.top + 9, D2.w / 2 + 9); g.fill();
        g.fillStyle = D ? '#2a2026' : '#6a5a5e'; g.fillRect(D2.x - D2.w / 2 - 20, D2.bot - 6, D2.w + 40, 8);
        // pavement, wet
        gr = g.createLinearGradient(0, G.street, 0, H); gr.addColorStop(0, p.pave[0]); gr.addColorStop(1, p.pave[1]);
        g.fillStyle = gr; g.fillRect(0, G.street, w, H - G.street);
        g.fillStyle = D ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'; g.fillRect(0, G.street, w, 3);
        for (let i = 0; i < 18; i++) { const px = R() * w, py = G.street + 20 + R() * (H - G.street - 30), rw = 30 + R() * 80; g.globalAlpha = D ? 0.12 : 0.1; g.fillStyle = '#9fb4ff'; g.beginPath(); g.ellipse(px, py, rw, rw * 0.12, 0, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
        // the red carpet from the queue to the door
        const cy0 = G.front.y - 8, cy1 = G.front.y + 6;
        g.fillStyle = p.carpet; g.beginPath(); g.moveTo(-10, cy0 + 4); g.lineTo(D2.x - D2.w * 0.5, G.street + 2); g.lineTo(D2.x + D2.w * 0.5, G.street + 2); g.lineTo(G.rope.x1 + 30, cy1); g.lineTo(-10, cy1 + 16); g.closePath(); g.fill();
        g.strokeStyle = K.hexA(p.brass, 0.6); g.lineWidth = 2; g.stroke();
        // lamp posts on the wide screen
        if (!G.phone) [G.fx0 * 0.5, G.fx1 + (w - G.fx1) * 0.5].forEach(x => { g.fillStyle = D ? '#16141e' : '#2e2a40'; g.fillRect(x - 3, G.street - 210, 6, 214); g.fillRect(x - 14, G.street - 216, 28, 8); G.posts = (G.posts || []).concat([{ x, y: G.street - 206 }]); });
        el.style.backgroundColor = p.sky[0];
        sign.style.setProperty('--n1', p.neon); sign.style.setProperty('--n2', p.neon2);
      }
      function roundRect(g, x, y, w, hh, r) { r = Math.min(r, w / 2, hh / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

      /* ---------------- guests ---------------- */
      const guests = [];
      function makeGuest(p) {
        const vip = p === 'VIP';
        const d = vip ? ST.vip : p;
        const node = h('div', { class: 'bn-guest', 'data-mood': 'ask', 'aria-hidden': 'true', html: '<svg viewBox="0 0 120 150">' + COSTUME[d.costume] + '</svg>' });
        node.style.setProperty('--gw', G.gw + 'px'); node.style.setProperty('--gh', G.gh + 'px');
        el.append(node);
        const gu = { p: d, vip, el: node, x: -200, y: G.front.y, s: 0.7, tx: -200, ty: G.front.y, ts: 0.7, walk: 0, op: 1, rot: 0, dx: 0, last: '', state: 'queue', wob: Math.random() * 6 };
        guests.push(gu);
        K.drag(node, {
          space: el,
          start: () => { if (!(gu === ST.cur && ST.state === 'decide')) return false; gu.dragging = true; setMood(gu, 'o'); if (A.ctx) { A.pop({ freq: 420, vol: 0.06 }); A.sync('grab', performance.now()); } },
          move: (pt, dd) => { if (!gu.dragging) return; gu.dx = Math.max(-20, dd.dx) * 0.9; if (dd.dx > 30) setHot(null); },
          end: (pt, dd) => { if (!gu.dragging) return; gu.dragging = false; if (dd.dx > 70 || dd.vx > 650) respond('yes'); else { gu.dx = 0; setMood(gu, 'ask'); if (A.ctx) A.boing({ freq: 260, vol: 0.05 }); } }
        });
        return gu;
      }
      function setMood(gu, m) { if (gu && gu.el.getAttribute('data-mood') !== m) gu.el.setAttribute('data-mood', m); }
      function updGuests(dt, now) {
        for (const gu of guests) {
          if (gu.gone) continue;
          const k = Math.min(1, dt * (gu.speed || 4.2));
          const px = gu.x, py = gu.y;
          gu.x += (gu.tx - gu.x) * k; gu.y += (gu.ty - gu.y) * k; gu.s += (gu.ts - gu.s) * k;
          const moving = Math.hypot(gu.x - px, gu.y - py) > 0.3 * (dt * 60);
          gu.walk += ((moving ? 1 : 0) - gu.walk) * Math.min(1, dt * 10);
          const wantWalk = gu.walk > 0.5;
          if (wantWalk !== !!gu.walking) { gu.walking = wantWalk; gu.el.classList.toggle('bn-walk', wantWalk); }
          const bob = gu.walk * Math.abs(Math.sin(now / 1000 * 9 + gu.wob)) * -5 + (1 - gu.walk) * Math.sin(now / 1000 * 2.2 + gu.wob) * 1.6;
          const push = gu.push || 0, lean = gu.dx * 0.06 + push * 6 + (gu.shake || 0) * Math.sin(now / 1000 * 40) * 3;
          const tf = 'translate(' + (gu.x + gu.dx + push * 14).toFixed(1) + 'px,' + (gu.y + bob).toFixed(1) + 'px) rotate(' + lean.toFixed(1) + 'deg) scale(' + gu.s.toFixed(3) + ')';
          if (tf !== gu.last) { gu.el.style.transform = tf; gu.last = tf; }
          const op = gu.op.toFixed(2); if (op !== gu.lastOp) { gu.el.style.opacity = op; gu.lastOp = op; }
          gu.push = Math.max(0, push - dt * 1.6); gu.shake = Math.max(0, (gu.shake || 0) - dt * 2);
        }
      }

      /* ---------------- the state of the door ---------------- */
      const ST = { state: 'intro', idx: -1, cur: null, vip: null, answers: [], crowd: 0, limited: [], cosy: 0, door: 0, doorT: 0, rope: 0, ropeT: 0, firsts: {}, finished: false, phrases: [], held: 0, guiltPush: 0, closing: false,
        rushSaid: 0, glitchSaid: 0, sparkle: 0, calm: 0 };
      const canAct = () => ST.state === 'decide' && ST.cur && !ST.cur.vipChoosing;

      /* answer cards: hold (kind no) and two drag-or-press cards */
      const HOLD = { on: false, k: 0, t0: 0, need: HOLD_MS, hum: null };
      function holdStart() {
        if (!canAct()) return;
        HOLD.on = true; HOLD.t0 = performance.now() - HOLD.k * HOLD.need;
        if (A.ctx) { HOLD.hum = A.loop({ pink: true, filter: 'bandpass', freq: 380, q: 1.4 }); if (HOLD.hum) HOLD.hum.level(0.06, 0.15); A.sync('hold', performance.now()); }
        P.emit('spark', G.front.x, G.front.y - G.gh * 0.6, 6, { colors: ['#ffe2b0', '#ff9ec7'], speed: [30, 90] });
        if (ST.cur && ST.cur.p.twist) guiltBegin();
      }
      function holdEnd() {
        if (!HOLD.on) return;
        HOLD.on = false;
        if (HOLD.hum) { const hm = HOLD.hum; hm.level(0.0001, 0.08); K.later(() => hm.stop(), 300); HOLD.hum = null; }
        if (ST.state === 'decide' && HOLD.k < 1) {
          if (ST.cur && ST.cur.p.twist) guiltWobble();
          else if (HOLD.k > 0.15 && !ST.saidHold) { ST.saidHold = true; say('patch', { Jolly: 'Hold it a moment longer. A calm no takes a breath.', Cheeky: 'Keep the palm up a beat. Confidence is mostly not moving.', Unfiltered: 'Hold longer.' }, 2600); }
        }
      }
      K.press(cardNo, { down: () => holdStart(), up: () => holdEnd() });
      S.listen(cardNo, 'keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); A.unlock(); K.guideDone(); holdStart(); } });
      S.listen(cardNo, 'keyup', (e) => { if (e.code === 'Space' || e.code === 'Enter') holdEnd(); });
      let hotCard = null, ghost = null;
      function setHot(c) { if (hotCard === c) return; if (hotCard) hotCard.classList.remove('bn-hot'); hotCard = c; if (c) c.classList.add('bn-hot'); }
      [cardLater, cardLimit].forEach((card) => {
        const kind = card.getAttribute('data-kind');
        let sx = 0, sy = 0, t0 = 0;
        K.drag(card, {
          space: el,
          start: (p) => {
            if (!canAct()) return false;
            sx = p.x; sy = p.y; t0 = performance.now();
            ghost = h('div', { class: 'bn-ghost', style: { '--c': card.style.getPropertyValue('--c') }, html: '<svg viewBox="0 0 24 24">' + ICONS[kind === 'later' ? 'later' : 'limit'] + '</svg>' }, h('span', { text: kind === 'later' ? 'Not tonight, but…' : 'Yes, with limits' }));
            ghost.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)';
            el.append(ghost); card.classList.add('bn-lift');
            if (A.ctx) { A.paper({ vol: 0.1 }); A.sync('card', performance.now()); }
          },
          move: (p, dd) => {
            if (!ghost) return;
            ghost.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) rotate(' + K.clamp(dd.vx / 70, -14, 14).toFixed(1) + 'deg) scale(' + (nearGuest(p) ? 1.12 : 1) + ')';
          },
          end: (p) => {
            if (!ghost) return;
            const gEl = ghost; ghost = null; card.classList.remove('bn-lift');
            const tap = Math.hypot(p.x - sx, p.y - sy) < 10 && performance.now() - t0 < 400;
            if (tap || nearGuest(p) || p.y < sy - 110) { gEl.remove(); respond(kind); return; }
            const r = K.rectIn(card, el), x0 = p.x, y0 = p.y;
            K.anim(240, (k) => { const e = easeOut(k); gEl.style.transform = 'translate(' + (x0 + (r.cx - x0) * e) + 'px,' + (y0 + (r.cy - y0) * e) + 'px) scale(' + (1 - 0.2 * k) + ')'; gEl.style.opacity = String(1 - k); }).then(() => gEl.remove());
            if (A.ctx) A.boing({ freq: 260, vol: 0.05 });
            if (!ST.saidDrop) { ST.saidDrop = true; say('patch', { Jolly: 'Drop the card right on them. Or just press it.', Cheeky: 'Aim for the guest, not the pavement. Or simply press it.', Unfiltered: 'Drop it on them. Or press.' }, 2600); }
          }
        });
        card.addEventListener('click', (e) => { if (e.detail === 0 && canAct()) respond(kind); }); // keyboard
      });
      function nearGuest(p) { const gu = ST.cur; if (!gu) return false; return Math.abs(p.x - gu.x) < G.gw * 0.75 && p.y > gu.y - G.gh * 1.2 && p.y < gu.y + 30; }
      K.onKey(['ArrowRight'], () => { if (canAct()) respond('yes'); });
      function cardsOn(on, only) { cards.forEach(c => { const ok = on && (!only || only.includes(c.getAttribute('data-kind'))); c.classList.toggle('bn-off', !ok); c.disabled = !ok; }); }

      /* ---------------- the ticket ---------------- */
      function showWho(gu, label) {
        const d = gu.p;
        whoName.textContent = d.own ? d.name : d.name; whoName.className = d.own ? 'gk-user' : '';
        whoName.style.setProperty('--who', gu.vip ? '#ffd27a' : d.twist ? '#ff9ec7' : '');
        whoTag.textContent = label || (gu.vip ? 'VIP · on the list' : d.own ? 'from your list' : d.twist ? 'pushing back' : 'asks');
      }
      let typeTok = 0;
      function showLine(textIn, you, voice) {
        const tok = ++typeTok;
        lineEl.className = 'bn-line' + (you ? ' bn-you' : '');
        const full = '“' + textIn + '”';
        if (K.reduced()) { lineEl.textContent = full; return; }
        let n = 0;
        const step = () => { if (tok !== typeTok) return; n = Math.min(full.length, n + 2); lineEl.textContent = full.slice(0, n); if (A.ctx && voice && n % 6 === 0) A.tone({ type: 'triangle', freq: voice * (0.9 + Math.random() * 0.2), dur: 0.035, vol: 0.022 }); if (n < full.length) K.later(step, 22); };
        step();
      }

      /* ---------------- the flow ---------------- */
      function vipChoice() {
        ST.state = 'list';
        const pick = K.shuffle(VIPS, K.rng(dayN + 3)).slice(0, G.phone ? 4 : 6);
        const row = h('div', { class: 'bn-chip-row', role: 'group', 'aria-label': 'Tonight’s VIP' });
        const panel = h('div', { class: 'bn-chips', role: 'dialog', 'aria-label': 'Guest list' }, h('h3', { text: 'Tonight’s guest list' }), h('p', { text: 'One VIP gets the red carpet. What’s your evening for?' }), row);
        pick.forEach((vv, i) => {
          const b = h('button', { type: 'button', class: 'bn-chip', style: { '--c': ['#ffd27a', '#7fc8ff', '#ff9ec7', '#9ff0c0', '#c9b4ff', '#ffb38a'][i % 6] }, text: vv.short });
          S.listen(b, 'pointerdown', () => { if (A.ctx) A.click({ vol: 0.08 }); });
          b.addEventListener('click', () => {
            if (ST.state !== 'list') return;
            ST.vip = vv; ST.state = 'listed'; b.classList.add('bn-picked'); K.guide(null);
            K.sfx.great(); P.emit('star', K.rectIn(b, el).cx, K.rectIn(b, el).cy, 12, { colors: ['#fff6d0', '#ffd27a', '#ff9ec7'] });
            say('glitch', { Jolly: 'Added to the list: ' + vv.name + '. Priority: you.', Cheeky: 'Logged. ' + vv.name + ' gets the velvet treatment.', Unfiltered: vv.name + '. On the list.' }, 2600, 'happy');
            ctx.track('vip', { id: vv.id });
            K.later(() => { panel.classList.add('bn-out'); K.later(() => panel.remove(), 420); }, 420);
            K.later(openDoor, 900);
          });
          row.append(b);
        });
        el.append(panel);
        K.guide({ id: 'bn-list', g: 'choose', target: () => Array.from(row.children), label: 'PICK TONIGHT’S VIP', place: 'above', delay: 1400 });
      }
      function openDoor() {
        desk.classList.remove('bn-away');
        queue.forEach((p, i) => { const gu = makeGuest(p); gu.order = i; });
        layoutQueue(true);
        K.later(nextGuest, 500);
      }
      function layoutQueue(snap) {
        const waiting = guests.filter(gu => gu.state === 'queue');
        waiting.forEach((gu, i) => {
          const q = G.queue[Math.min(i, G.queue.length - 1)];
          gu.tx = i < 3 ? q.x : q.x - 140; gu.ty = q.y; gu.ts = q.s; gu.op = i < 3 ? 1 - i * 0.18 : 0; gu.speed = 3.2;
          if (snap) { gu.x = gu.tx - 60; gu.y = gu.ty; gu.s = gu.ts; }
        });
      }
      function nextGuest() {
        if (ST.finished) return;
        const gu = guests.find(x => x.state === 'queue');
        if (!gu) { closing(); return; }
        ST.idx++; ST.cur = gu; gu.state = 'front'; ST.state = 'arrive';
        gu.el.classList.add('bn-front');
        gu.tx = G.front.x; gu.ty = G.front.y; gu.ts = 1; gu.op = 1; gu.speed = 3.6;
        layoutQueue(false);
        cardsOn(false); HOLD.k = 0; setHot(null);
        showWho(gu); lineEl.textContent = '';
        if (A.ctx) for (let i = 0; i < 4; i++) A.click({ when: A.now() + i * 0.17, vol: 0.035 });
        K.later(() => arrive(gu), 650);
      }
      function arrive(gu) {
        if (ST.finished) return;
        const d = gu.p;
        setMood(gu, 'ask');
        showLine(line(d.ask), false, d.voice);
        if (d.twist) { gu.el.classList.add('bn-play'); violin(0); }
        const first = ST.idx === 0;
        K.later(() => {
          if (ST.finished || ST.cur !== gu) return;
          if (gu.vip) say('glitch', { Jolly: 'On the list. Priority: you.', Cheeky: 'Scanning… VIP confirmed. Unclip the velvet.', Unfiltered: 'On the list.' }, 2600, 'happy');
          else if (d.twist) say('patch', gentleCoach(), 4600, 'determined');
          else if (d.gentle) say('glitch', d.scan, 3000, 'happy');
          else if (first) say('patch', { Jolly: 'First ask. A kind no is short: no reasons owed. Hold the palm.', Cheeky: 'Lesson one: a no doesn’t need a speech. Hold up the palm.', Unfiltered: 'Short no. Hold the palm.' }, 3600);
          else if (!ST.rushSaid && ST.idx >= 1 && !gu.vip) { ST.rushSaid = 1; say('rush', { Jolly: 'Let them in! Saying yes is so fast!', Cheeky: 'Just say yes! Yes is my favourite word! It’s the only one I know!', Unfiltered: 'Yes. Say yes. Quick.' }, 2800, 'speed'); }
          else if (ST.glitchSaid < 4 && Math.random() < 0.85) { ST.glitchSaid++; scanBeam(); say('glitch', d.scan, 3000, 'scan'); }
          ST.state = 'decide';
          cardsOn(true, d.twist ? ['no'] : null);
          hint.style.visibility = d.twist ? 'hidden' : '';
          guideFor(gu);
        }, first ? 900 : 700);
      }
      function gentleCoach() {
        return { Jolly: 'Guilt trip! Don’t argue. Acknowledge it, repeat your no, and hold.', Cheeky: 'Ah, the guilt suitcase. Acknowledge, repeat, hold. Like a kind wall.', Unfiltered: 'Acknowledge. Repeat. Hold.' };
      }
      function guideFor(gu) {
        const n = ST.idx, d = gu.p;
        const targetGuest = () => ({ x: gu.x, y: gu.y - G.gh * 0.55 });
        if (d.twist) { K.guide({ id: 'bn-guilt', g: 'hold', target: cardNo, label: 'HOLD: KIND AND FIRM', place: 'above', delay: 1800, ms: 2200 }); return; }
        if (gu.vip) { K.guide({ id: 'bn-vip', g: 'drag', target: targetGuest, dir: 'r', d: 90, label: 'SWIPE THEM IN', place: 'above', delay: 900, ms: 1300 }); return; }
        if (n === 0) { K.guide({ id: 'bn-no', g: 'hold', target: cardNo, label: 'HOLD: KIND NO', place: 'above', delay: 1500, ms: 1600 }); return; }
        const rc = (c) => { const r = K.rectIn(c, el); return { dx: gu.x - r.cx, dy: gu.y - G.gh * 0.5 - r.cy }; };
        if (n === 1) { const v2 = rc(cardLater); K.guide({ id: 'bn-later', g: 'drag', target: cardLater, dx: v2.dx, dy: v2.dy, label: 'DRAG: NOT TONIGHT', place: 'above', delay: 1300, ms: 1500 }); return; }
        if (!ST.firsts.limit && n >= 3) { const v2 = rc(cardLimit); K.guide({ id: 'bn-limit', g: 'drag', target: cardLimit, dx: v2.dx, dy: v2.dy, label: 'DRAG: YES, WITH LIMITS', place: 'above', delay: 1300, ms: 1500 }); return; }
        K.guide({ id: 'bn-any-' + n, g: 'choose', target: () => cards.concat([gu.el]), label: 'YOUR CALL', place: 'above', delay: 2600 });
      }
      function scanBeam() { ST.scan = performance.now(); if (A.ctx) { A.tone({ type: 'square', freq: 1400, to: 900, glide: 0.25, dur: 0.28, vol: 0.02, lp: 2400 }); A.sync('scan', performance.now()); } }

      /* answering */
      function respond(kind) {
        if (!canAct()) return;
        const gu = ST.cur, d = gu.p;
        if (d.twist) return;
        ST.state = 'respond'; K.guide(null); cardsOn(false); setHot(null);
        const isVip = gu.vip;
        const sayLines = isVip ? VIP_SAY[kind] : d.say[kind];
        const you = line(sayLines);
        showLine(you, true);
        ctx.track('answer', { kind, vip: isVip ? 1 : 0, own: d.own ? 1 : 0 });
        ST.answers.push({ kind: d.gentle ? 'vip' : isVip ? (kind === 'yes' ? 'vip' : kind) : kind, id: d.id, you });
        if (!isVip && !d.own && !d.gentle && kind !== 'yes') { const pid = d.id + ':' + kind; if (!ST.phrases.some(x => x.id === pid)) ST.phrases.push({ id: pid, text: line(d.say[kind]), who: d.name }); }
        const fx = gu.x, fy = gu.y - G.gh * 0.55;
        if (kind === 'no') {
          palmUp(fx, fy);
          setMood(gu, 'o');
          if (A.ctx) { A.thud({ vol: 0.22 }); ['C4', 'E4', 'G4'].forEach((n, i) => A.pluck(A.note(n), { when: A.now() + 0.05 + i * 0.03, vol: 0.12, damp: 0.994 })); A.sync('no', performance.now()); }
          P.emit('star', fx, fy, 10, { colors: ['#ffe2b0', '#ff9ec7', '#ffffff'], speed: [60, 160] });
        } else if (kind === 'later' || kind === 'limit') {
          const tagText = isVip ? (kind === 'later' ? 'Another night' : 'Just a little') : d.tag[kind];
          const band = h('span', { class: 'bn-band', text: tagText, style: { '--bc': kind === 'later' ? '#9fd6ff' : '#ffd27a' } });
          gu.el.append(band); gu.band = band;
          setMood(gu, kind === 'later' ? 'happy' : 'ok');
          if (A.ctx) { if (kind === 'later') { A.chime(A.note('E6'), { vol: 0.06, dur: 1.2 }); A.chime(A.note('B5'), { when: A.now() + 0.08, vol: 0.05, dur: 1.2 }); } else { A.thud({ vol: 0.3 }); A.click({ vol: 0.14 }); } A.sync(kind, performance.now()); }
          P.emit('spark', fx, fy + 20, 12, { colors: [kind === 'later' ? '#9fd6ff' : '#ffd27a', '#ffffff'], speed: [60, 180] });
        } else if (kind === 'yes') {
          setMood(gu, 'happy');
          if (A.ctx) { A.wood(undefined, 0.16, 2.1); A.chime(A.note(isVip ? 'G5' : 'D5'), { vol: 0.06, dur: 1 }); A.sync('yes', performance.now()); }
          if (isVip) { P.emit('confetti', G.rope.x0, G.rope.y, 24, { angle: -Math.PI / 2, spread: 1.2, colors: ['#ffd27a', '#ff9ec7', '#7fc8ff', '#ffffff'] }); ST.sparkle = 1; }
        }
        const r = d.re ? d.re[kind] : null;
        const reLine = isVip ? VIP_RE[kind] : r;
        K.later(() => {
          if (ST.finished) return;
          showWho(gu, kind === 'yes' && !isVip ? 'delighted' : isVip ? 'VIP' : 'takes it well');
          showLine(line(reLine), false, d.voice);
          setMood(gu, kind === 'yes' ? 'happy' : kind === 'no' ? 'ok' : 'happy');
          if (kind === 'yes' || kind === 'limit') goIn(gu, kind); else goAway(gu);
          if (d.gentle) K.later(() => say('patch', { Jolly: 'That’s how a good ask feels: your answer is welcome either way.', Cheeky: 'Notice that? A no that costs nothing. That’s the good stuff.', Unfiltered: 'Good asks take any answer.' }, 3600, 'hug'), 500);
          else tip(kind, isVip);
          K.later(nextGuest, d.gentle ? 3600 : kind === 'yes' || kind === 'limit' ? 2300 : 2000);
        }, kind === 'no' ? 1300 : 1100);
      }
      function tip(kind, isVip) {
        const key = isVip ? 'vip' : kind;
        if (ST.firsts[key]) {
          if (kind === 'yes' && !isVip && ST.crowd >= 0.45 && !ST.saidCrowd) { ST.saidCrowd = true; K.later(() => say('rush', { Jolly: 'Can someone open a window? It’s very full in here.', Cheeky: 'I can’t find the sofa. There are twelve people on it.', Unfiltered: 'Too full in here.' }, 3000, 'worried'), 700); }
          return;
        }
        ST.firsts[key] = true;
        const T = {
          no: { Jolly: 'Short and kind. No essay needed. And look, they’re fine.', Cheeky: 'See? No twelve-paragraph apology. And they survived. Very chic.', Unfiltered: 'Short. Kind. They’re fine.' },
          later: { Jolly: 'Not now, but later. Generous, and you kept your night.', Cheeky: 'A no with a calendar invite. Elegant.', Unfiltered: 'No now. Yes later.' },
          limit: { Jolly: 'Yes with limits counts too. You decide how much.', Cheeky: 'Yes, but with a fence. Love a fence.', Unfiltered: 'Yes, with a limit. Good.' },
          yes: { Jolly: 'Yes is allowed! Just notice the room filling up.', Cheeky: 'Generous! It’s getting a bit sweaty in there, though.', Unfiltered: 'Allowed. Room’s filling.' },
          vip: { Jolly: 'That’s what the rope is for: room for what matters.', Cheeky: 'VIP through. That’s what boundaries are actually for.', Unfiltered: 'That’s who the door is for.' }
        };
        K.later(() => {
          say('patch', T[key], 3200, key === 'vip' ? 'love' : 'cool');
          if (key === 'no' && !ST.rushSaid2) { ST.rushSaid2 = true; K.later(() => say('rush', { Jolly: 'Wait, you can do that? And they’re fine?', Cheeky: 'They… took it well? I need a sit down.', Unfiltered: 'Huh. They’re fine.' }, 2600, 'surprised'), 3400); }
        }, 500);
      }
      function palmUp(x, y) {
        palm.style.left = x + 'px'; palm.style.top = (y - 6) + 'px';
        K.anim(K.reduced() ? 120 : 520, (k) => { const e = easeOut(Math.min(1, k * 1.6)); palm.style.opacity = String(k < 0.7 ? e : 1 - (k - 0.7) / 0.3); palm.style.transform = 'translateY(' + (30 * (1 - e)).toFixed(1) + 'px) scale(' + (0.7 + 0.3 * e).toFixed(3) + ')'; }).then(() => K.later(() => { palm.style.opacity = '0'; }, 500));
      }
      function goAway(gu) {
        gu.state = 'gone'; gu.el.classList.remove('bn-front');
        K.later(() => { gu.tx = -G.gw * 1.4; gu.ty = G.front.y + 6; gu.speed = 1.8; K.later(() => { gu.op = 0; }, 1200); K.later(() => { gu.gone = true; gu.el.remove(); }, 2200); }, 600);
      }
      function goIn(gu, kind) {
        gu.state = 'in'; gu.el.classList.remove('bn-front');
        ST.ropeT = 1; ST.doorT = 1;
        if (A.ctx) { A.tone({ type: 'sawtooth', freq: 92, to: 140, glide: 0.45, dur: 0.5, vol: 0.025, lp: 520 }); A.noise({ filter: 'bandpass', freq: 600, to: 1600, q: 1.2, dur: 0.5, vol: 0.04 }); }
        music.level(1);
        const x1 = G.rope.x0 + (G.rope.x1 - G.rope.x0) * 0.5;
        gu.tx = x1; gu.ty = G.front.y - 10; gu.speed = 2.6;
        K.later(() => { gu.tx = G.door.x; gu.ty = G.street; gu.ts = 0.62; gu.speed = 2.4; }, 700);
        K.later(() => { gu.op = 0; }, 1500);
        K.later(() => {
          gu.gone = true; gu.el.remove();
          ST.doorT = 0; ST.ropeT = 0; music.level(levelNow());
          if (kind === 'yes' && !gu.vip) ST.crowd = Math.min(1, ST.crowd + 0.24);
          if (kind === 'limit') { const lt = { col: gu.p.col || '#ffd27a', until: performance.now() + 9000 }; ST.limited.push(lt); }
          if (gu.vip) ST.cosy = 1;
          if (A.ctx) A.wood(undefined, 0.12, 1.6);
        }, 1900);
      }
      const levelNow = () => (0.55 - ST.crowd * 0.15);

      /* the twist: the Guilt Trip pushes back three times; a steady palm with a broken-record line holds the door */
      function guiltBegin() {
        if (ST.guilt) return;
        ST.guilt = { step: 0, need: [0.3, 0.62, 0.92] };
        HOLD.need = Math.round(HOLD_MS * 3.4);
        HOLD.t0 = performance.now();
      }
      function guiltStep(k) {
        const gs = ST.guilt; if (!gs) return;
        const gu = ST.cur, d = gu.p;
        while (gs.step < 3 && k >= gs.need[gs.step]) {
          const i = gs.step++;
          gu.push = 1; gu.shake = 0.8; setMood(gu, 'sad');
          showWho(gu, 'push ' + (i + 1) + ' of 3'); ++typeTok;
          lineEl.className = 'bn-line'; lineEl.textContent = '“' + line(d.push[i]) + '”  ';
          lineEl.append(h('br'), h('span', { class: 'bn-you-inline', text: 'You: “' + line(d.hold[i]) + '”' }));
          violin(i + 1);
          if (A.ctx) { A.noise({ filter: 'lowpass', freq: 500, dur: 0.3, vol: 0.06 }); A.sync('push', performance.now()); }
          P.emit('star', G.front.x, G.front.y - G.gh * 0.6, 8, { colors: ['#ffe2b0', '#ff9ec7'], speed: [40, 120] });
          ST.held = i + 1;
        }
      }
      function guiltWobble() {
        const gu = ST.cur; if (!gu) return;
        gu.push = 1.4; gu.shake = 1;
        HOLD.k = Math.max(0, HOLD.k - 0.15);
        if (A.ctx) violin(9);
        if (!ST.saidWobble || Math.random() < 0.5) { ST.saidWobble = true; say('patch', { Jolly: 'Breathe. You’re allowed to keep your answer. Hold again.', Cheeky: 'Wobbly is fine. Plant your feet. Hold again.', Unfiltered: 'Hold again.' }, 2600, 'hug'); }
      }
      function guiltDone() {
        const gu = ST.cur, d = gu.p;
        ST.state = 'respond'; K.guide(null); cardsOn(false); gu.el.classList.remove('bn-play');
        ST.answers.push({ kind: 'hold', id: 'guilt', you: line(d.hold[1]) });
        ST.phrases.push({ id: 'guilt:hold', text: line(d.hold[0]), who: d.name, twist: true });
        palmUp(gu.x, gu.y - G.gh * 0.55);
        if (A.ctx) { ['A4', 'C#5', 'E5', 'A5'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + i * 0.07, vol: 0.06, dur: 1.4 })); A.sync('held', performance.now()); }
        ctx.track('guilt', { held: 1 });
        K.later(() => {
          showWho(gu, 'deflates'); setMood(gu, 'ok'); showLine(line(d.re), false, d.voice);
          if (A.ctx) A.tone({ type: 'sawtooth', freq: A.note('E5'), to: A.note('E4'), glide: 0.9, dur: 1, vol: 0.022, lp: 2200 });
          goAway(gu);
          K.later(() => say('patch', { Jolly: 'That’s it. You can be kind and still mean no.', Cheeky: 'Textbook. Broken record, unbroken you.', Unfiltered: 'Kind. Firm. Done.' }, 3200, 'celebrate'), 700);
          K.later(nextGuest, 3200);
        }, 900);
        HOLD.need = HOLD_MS;
      }
      function violin(i) { // the tiny violin: a sad little phrase per push, a squeak on a wobble
        if (!A.ctx) return;
        const t = A.now(), ph = [['E5', 'D5', 'C5', 'B4'], ['C5', 'B4', 'A4', 'G#4'], ['A4', 'G4', 'F4', 'E4'], ['D5', 'C5', 'B4', 'A4']][i % 4];
        if (i === 9) { A.tone({ type: 'sawtooth', freq: 1200, to: 1500, glide: 0.1, dur: 0.18, vol: 0.02, lp: 2600 }); return; }
        ph.forEach((n, k) => { A.tone({ when: t + k * 0.22, type: 'sawtooth', freq: A.note(n) * 1.005, to: A.note(n) * 0.985, glide: 0.2, dur: 0.24, vol: 0.022, attack: 0.04, lp: 2400 }); A.tone({ when: t + k * 0.22, type: 'triangle', freq: A.note(n), dur: 0.24, vol: 0.016, attack: 0.05 }); });
      }

      /* closing time */
      function closing() {
        if (ST.closing) return;
        ST.closing = true; ST.state = 'closing'; ST.cur = null;
        cardsOn(false); hint.style.visibility = 'hidden';
        whoName.textContent = 'Closing time'; whoName.className = ''; whoName.style.setProperty('--who', '#ffd27a'); whoTag.textContent = 'queue’s empty';
        showLine(line({ Jolly: 'That’s everyone. Flip the sign on the door.', Cheeky: 'Queue cleared. Flip the sign, boss.', Unfiltered: 'Flip the sign.' }), false);
        say('patch', { Jolly: 'Closing time! Flip the sign.', Cheeky: 'That’s the queue done. Flip the sign, boss.', Unfiltered: 'Done. Flip the sign.' }, 3000, 'happy');
        K.guide({ id: 'bn-sign', g: 'tap', target: doorSign, label: 'FLIP THE SIGN', place: 'below', delay: 900 });
        doorSign.classList.add('bn-ready');
      }
      K.tap(doorSign, () => { if (ST.state === 'closing') flipSign(); });
      function flipSign() {
        if (ST.state !== 'closing') return;
        ST.state = 'finale'; K.guide(null);
        doorSign.textContent = ''; doorSign.append(h('span', { text: 'Closed' }), h('small', { text: 'Your time' }));
        doorSign.classList.add('bn-closed');
        if (A.ctx) { A.wood(undefined, 0.2, 1.2); ['E5', 'G5', 'B5'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + 0.12 + i * 0.1, vol: 0.06, dur: 1.2 })); A.sync('flip', performance.now()); }
        finale();
      }
      async function finale() {
        desk.classList.add('bn-away');
        sign.classList.add('bn-steady');
        ST.calm = 1; ST.limited = []; ST.crowd = 0; ST.sparkle = 1; ST.cosy = Math.max(ST.cosy, 0.6);
        rain.level(0.0001, 1.2);
        music.level(0.85);
        K.later(() => say('rush', { Jolly: 'Can I come in? As a guest? With limits?', Cheeky: 'Room for one more? I’ll be quiet. I won’t. But I’ll try.', Unfiltered: 'Can I come in?' }, 3000, 'shy'), 700);
        K.later(() => say('glitch', { Jolly: 'Door log: every ask answered. No essays. Kind and firm.', Cheeky: 'Door log complete. Zero over-explaining detected.', Unfiltered: 'Log: kind, firm, done.' }, 3200, 'happy'), 3900);
        K.finale('stars', { z: 24, colors: [pal().neon2, '#ffffff', pal().neon], chord: ['F4', 'A4', 'C5', 'E5'], ms: 4200 });
        K.later(showBook, 900);
        K.later(end, 5600);
      }
      function showBook() {
        const lines = ST.phrases.slice(-3).reverse();
        const list = h('ul');
        (lines.length ? lines : [{ who: 'Tonight', text: line({ Jolly: 'You kept the door your own.', Cheeky: 'You kept the door your own.', Unfiltered: 'Door kept.' }) }]).forEach(x => list.append(h('li', null, h('small', { text: x.twist ? 'With the Guilt Trip' : 'To ' + x.who }), document.createTextNode('“' + x.text + '”'))));
        const book = h('div', { class: 'bn-book', role: 'status' }, h('h3', { text: 'Tonight’s door lines' }), list);
        const count = K.collection().filter(x => /:/.test(x)).length + ST.phrases.filter(x => !K.collection().includes(x.id)).length;
        book.append(h('p', { text: 'Phrasebook: ' + Math.min(PHRASE_TOTAL, count) + ' of ' + PHRASE_TOTAL + ' lines · Tomorrow: ' + CLUB_NEXT.name }));
        if (gentle) book.append(h('p', { class: 'bn-support', text: 'If someone in your life makes saying no feel unsafe, you deserve support. In Australia: 1800RESPECT, 1800 737 732. Elsewhere, your local support line.' }));
        book.style.top = Math.round(G.street + (G.phone ? 26 : 30)) + 'px';
        el.append(book);
      }
      function end() {
        if (ST.finished) return;
        ST.finished = true;
        const ans = ST.answers;
        const bal = ans.length ? ans.reduce((s, a) => s + Math.min(...(KF[a.kind] || [1, 1])), 0) / ans.length : 0;
        const tier = K.tier(bal, [0.55, 0.72, 0.84]);
        const badges = [];
        if (tier) badges.push(tier + ': ' + { Gold: 'kind and firm', Silver: 'warm and steady', Bronze: 'finding your no' }[tier]);
        const fresh = []; let count = K.collection().filter(x => /:/.test(x)).length;
        ST.phrases.forEach(x => { const c = K.collect(x.id); if (c.isNew) fresh.push(x.id); count = c.items.filter(y => /:/.test(y)).length; });
        badges.push(fresh.length ? 'Phrasebook: +' + fresh.length + ' line' + (fresh.length > 1 ? 's' : '') + ' (' + count + ' of ' + PHRASE_TOTAL + ')' : 'Phrasebook: ' + count + ' of ' + PHRASE_TOTAL);
        if (ST.vip && ans.some(a => a.kind === 'vip')) badges.push('Red carpet: ' + ST.vip.name);
        const n = (k) => ans.filter(a => a.kind === k).length;
        const kindNos = n('no') + n('later') + (ST.held ? 1 : 0);
        ctx.track('done', { asks: ans.length, no: n('no'), later: n('later'), limit: n('limit'), yes: n('yes'), vip: n('vip'), held: ST.held, tier: tier || 'none' });
        const lines = [ans.length + ' asks at the rope: ' + kindNos + ' kind no' + (kindNos === 1 ? '' : 's') + ', ' + n('limit') + ' with limits, ' + (n('yes') + n('vip')) + ' let in'];
        lines.push(ST.held ? 'The Guilt Trip pushed three times; your answer held' : gentle ? 'Every answer was welcome: that’s what a kind ask feels like' : 'Most asks took your answer well');
        lines.push(gentle ? 'Support if no feels unsafe: 1800RESPECT, 1800 737 732' : 'Tomorrow: ' + CLUB_NEXT.name);
        ctx.finish({ title: 'Your evening is yours', mood: 'cool', lines, share: 'Worked the door of my own evening. Kind no, firm rope.', badges });
      }

      /* ---------------- drawing ---------------- */
      let dk = true;
      const drops = [];
      function drawRoom(g, now) {
        const p = pal(), W2 = G.win, w = W2.x1 - W2.x0, hh = W2.y1 - W2.y0;
        const lit = 0.75 + 0.25 * ST.cosy - ST.crowd * 0.25 + (ST.crowd > 0.5 ? Math.sin(now / 90) * 0.06 * ST.crowd : 0);
        let gr = g.createLinearGradient(0, W2.y0, 0, W2.y1); gr.addColorStop(0, mixHex(p.room[1], p.room[0], lit)); gr.addColorStop(1, p.room[1]);
        g.fillStyle = gr; g.fillRect(W2.x0, W2.y0, w, hh);
        // lamp and its glow
        const lx = W2.x0 + w * 0.78, ly = W2.y0 + hh * 0.42;
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.max(0.2, lit) * (dk ? 0.9 : 0.75); g.drawImage(GLOW.light, lx - 70, ly - 70, 140, 140); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.fillStyle = '#2a1a12'; g.fillRect(lx - 2, ly, 4, hh * 0.5); g.fillStyle = mixHex(p.light, '#ffffff', 0.2); g.beginPath(); g.moveTo(lx - 14, ly); g.lineTo(lx + 14, ly); g.lineTo(lx + 9, ly - 16); g.lineTo(lx - 9, ly - 16); g.closePath(); g.fill();
        // armchair and decor by club
        g.fillStyle = mixHex(p.room[1], '#000000', 0.35);
        roundRect(g, W2.x0 + w * 0.12, W2.y1 - hh * 0.36, w * 0.36, hh * 0.3, 8); g.fill(); roundRect(g, W2.x0 + w * 0.09, W2.y1 - hh * 0.5, w * 0.42, hh * 0.18, 8); g.fill();
        if (CLUB.id === 'library') { g.fillStyle = mixHex(p.room[0], '#000', 0.5); for (let i = 0; i < 9; i++) g.fillRect(W2.x0 + 6 + i * 9, W2.y0 + 8, 7, hh * 0.22 + (i % 3) * 3); }
        if (CLUB.id === 'cinema') { g.fillStyle = K.hexA('#fff6e0', 0.18 + 0.05 * Math.sin(now / 300)); g.fillRect(W2.x0 + w * 0.1, W2.y0 + 8, w * 0.5, hh * 0.24); }
        if (CLUB.id === 'jazz') { g.fillStyle = mixHex(p.room[1], '#000', 0.4); g.beginPath(); g.ellipse(W2.x0 + w * 0.58, W2.y0 + hh * 0.3, 12, 18, 0.3, 0, TAU); g.fill(); g.fillRect(W2.x0 + w * 0.6, W2.y0 + hh * 0.3, 3, 26); }
        // the VIP is in: a warm glow in the room
        if (ST.cosy > 0.05) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 * ST.cosy + 0.08 * Math.sin(now / 700); g.drawImage(GLOW.neon2, W2.x0 + w * 0.1, W2.y0 + hh * 0.2, w * 0.5, hh * 0.7); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
        // the crowd (guests let in without limits, and limited guests until their time is up)
        const n = Math.round(ST.crowd * 8) + ST.limited.length;
        for (let i = 0; i < n; i++) {
          const x = W2.x0 + 12 + ((i * 37) % Math.max(20, w - 24)), y = W2.y1 - 6 - (i % 2) * 10, s = 0.75 + (i % 3) * 0.12, bob = Math.sin(now / 260 + i * 1.7) * 1.5;
          const col = i < ST.limited.length ? ST.limited[i].col : ['#62b8ff', '#ff8a3d', '#ffe46b', '#a5dcff', '#9d8bff'][i % 5];
          g.fillStyle = mixHex(col, '#000000', 0.62);
          g.beginPath(); g.ellipse(x, y - 14 * s + bob, 11 * s, 14 * s, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(x, y - 32 * s + bob, 7 * s, 0, TAU); g.fill();
        }
        // window glass: reflections, fog when crowded
        g.fillStyle = K.hexA('#ffffff', 0.05 + ST.crowd * 0.18); g.fillRect(W2.x0, W2.y0, w, hh);
        g.strokeStyle = K.hexA('#ffffff', 0.12); g.lineWidth = 6; g.beginPath(); g.moveTo(W2.x0 + w * 0.15, W2.y1); g.lineTo(W2.x0 + w * 0.45, W2.y0); g.stroke();
        g.strokeStyle = pal().trim; g.lineWidth = 4; g.beginPath(); g.moveTo((W2.x0 + W2.x1) / 2, W2.y0); g.lineTo((W2.x0 + W2.x1) / 2, W2.y1); g.moveTo(W2.x0, (W2.y0 + W2.y1) / 2); g.lineTo(W2.x1, (W2.y0 + W2.y1) / 2); g.stroke();
      }
      function drawDoor(g, now) {
        const p = pal(), d = G.door, open = ST.door, x0 = d.x - d.w / 2, w = d.w, top = d.top, bot = d.bot, r = w / 2;
        // the warm room behind the door
        let gr = g.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, mixHex(p.light, '#ffffff', 0.25)); gr.addColorStop(1, p.light);
        g.save(); roundRect(g, x0, top, w, bot - top, r); g.clip();
        g.fillStyle = gr; g.fillRect(x0, top, w, bot - top);
        g.fillStyle = K.hexA(p.room[1], 0.55); g.fillRect(x0, bot - (bot - top) * 0.25, w, (bot - top) * 0.25);
        // the door panel swings in (narrows) as it opens
        const pw = w * (1 - open * 0.82);
        let dg = g.createLinearGradient(x0, 0, x0 + pw, 0); dg.addColorStop(0, mixHex(p.door, '#000000', 0.25)); dg.addColorStop(0.5, p.door); dg.addColorStop(1, mixHex(p.door, '#000000', 0.35));
        g.fillStyle = dg; g.fillRect(x0, top, pw, bot - top);
        if (pw > 20) {
          g.strokeStyle = K.hexA('#000000', 0.3); g.lineWidth = 2;
          g.strokeRect(x0 + pw * 0.16, top + (bot - top) * 0.3, pw * 0.68, (bot - top) * 0.25); g.strokeRect(x0 + pw * 0.16, top + (bot - top) * 0.62, pw * 0.68, (bot - top) * 0.28);
          g.fillStyle = p.brass; g.beginPath(); g.arc(x0 + pw * 0.86, top + (bot - top) * 0.58, 3.5, 0, TAU); g.fill();
          // a little window in the door, glowing
          g.fillStyle = K.hexA(p.light, 0.85); g.beginPath(); g.arc(x0 + pw / 2, top + r * 0.75, Math.min(pw, w) * 0.16, 0, TAU); g.fill();
        }
        g.restore();
        // light spilling onto the pavement when the door opens; the wall lamp
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = (dk ? 0.35 : 0.25) + open * 0.45; g.drawImage(GLOW.light, d.x - w * 1.3, bot - 24, w * 2.6, 90);
        g.globalAlpha = dk ? 0.85 : 0.6; g.drawImage(GLOW.light, G.lamp.x - 46, G.lamp.y - 46, 92, 92);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.fillStyle = p.brass; g.fillRect(G.lamp.x - 6, G.lamp.y - 2, 12, 8);
      }
      function drawRope(g, now) {
        const p = pal(), R2 = G.rope, x0 = R2.x0, x1 = R2.x1, y = R2.y, hh = R2.h, open = ST.rope;
        const post = (x) => {
          let gr = g.createLinearGradient(x - 5, 0, x + 5, 0); gr.addColorStop(0, mixHex(p.brass, '#000000', 0.35)); gr.addColorStop(0.45, mixHex(p.brass, '#ffffff', 0.4)); gr.addColorStop(1, mixHex(p.brass, '#000000', 0.4));
          g.fillStyle = gr; g.fillRect(x - 4, y, 8, hh);
          g.beginPath(); g.ellipse(x, y + hh, 16, 5, 0, 0, TAU); g.fill();
          g.beginPath(); g.arc(x, y - 4, 7, 0, TAU); g.fill();
        };
        // the rope: hangs between the posts, or swings off the left post when unclipped
        const sag = 22 + Math.sin(now / 900) * 2;
        g.lineCap = 'round';
        const rp = (k) => { if (open < 0.02) return [x0 + (x1 - x0) * k, y + 4 + Math.sin(Math.PI * k) * sag]; const hx = x1 - (x1 - x0) * (1 - k) * (1 - open * 0.92), hy = y + 4 + Math.sin(Math.PI * k) * sag * (1 - open) + (1 - k) * open * hh * 0.85; return [hx, hy]; };
        g.strokeStyle = mixHex(p.rope, '#000000', 0.45); g.lineWidth = 9; g.beginPath(); for (let i = 0; i <= 18; i++) { const [a, b] = rp(i / 18); if (i) g.lineTo(a, b + 1.5); else g.moveTo(a, b + 1.5); } g.stroke();
        g.strokeStyle = p.rope; g.lineWidth = 7; g.beginPath(); for (let i = 0; i <= 18; i++) { const [a, b] = rp(i / 18); if (i) g.lineTo(a, b); else g.moveTo(a, b); } g.stroke();
        g.strokeStyle = K.hexA('#ffffff', 0.28); g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 18; i++) { const [a, b] = rp(i / 18); if (i) g.lineTo(a, b - 2); else g.moveTo(a, b - 2); } g.stroke();
        post(x0); post(x1);
        if (ST.sparkle > 0.02 || ST.calm) {
          g.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 9; i++) { const k = ((now / 2600 + i / 9) % 1), [a, b] = rp(k), tw = 0.5 + 0.5 * Math.sin(now / 160 + i * 2); g.globalAlpha = (ST.calm ? 0.9 : ST.sparkle) * tw; g.drawImage(GLOW.gold, a - 9, b - 9, 18, 18); }
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        }
      }
      function drawStreetLife(g, now, dt) {
        const p = pal();
        // the sign and lamps reflected in the wet pavement
        g.globalCompositeOperation = 'lighter';
        const sx = (G.fx0 + G.fx1) / 2, ry = G.street + 30;
        for (let i = 0; i < 4; i++) { g.globalAlpha = (dk ? 0.22 : 0.16) * (0.7 + 0.3 * Math.sin(now / 400 + i)); g.drawImage(GLOW.neon, sx - 150 + Math.sin(now / 700 + i) * 4, ry + i * 14, 300, 18); }
        g.globalAlpha = dk ? 0.3 : 0.2; g.drawImage(GLOW.light, G.door.x - 40, ry + 6, 80, 50);
        (G.posts || []).forEach(pp => { g.globalAlpha = dk ? 0.75 : 0.5; g.drawImage(GLOW.light, pp.x - 60, pp.y - 60, 120, 120); g.globalAlpha = dk ? 0.25 : 0.18; g.drawImage(GLOW.light, pp.x - 40, G.street + 20, 80, 120); });
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        // rain (it stops at closing time)
        const want = dk && !ST.calm ? (G.phone ? 70 : 130) : !ST.calm ? 22 : 0;
        while (drops.length < want) drops.push({ x: Math.random() * G.w, y: Math.random() * G.H, v: 520 + Math.random() * 260 });
        if (drops.length > want) drops.length = want;
        if (drops.length) {
          g.strokeStyle = dk ? 'rgba(190,205,240,0.32)' : 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.beginPath();
          for (const d of drops) { d.y += d.v * dt; d.x -= d.v * dt * 0.12; if (d.y > G.H || d.x < -10) { if (Math.random() < 0.3 && d.y > G.street) splashes.push({ x: d.x, y: Math.min(d.y, G.H - 4), t: now }); d.y = -10 - Math.random() * 40; d.x = Math.random() * (G.w + 40); } g.moveTo(d.x, d.y); g.lineTo(d.x + 2, d.y - 11); }
          g.stroke();
        }
        if (splashes.length) { g.strokeStyle = dk ? 'rgba(200,215,255,0.35)' : 'rgba(255,255,255,0.4)'; for (let i = splashes.length - 1; i >= 0; i--) { const s = splashes[i], k = (now - s.t) / 450; if (k > 1) { splashes.splice(i, 1); continue; } g.globalAlpha = 1 - k; g.beginPath(); g.ellipse(s.x, s.y, 3 + k * 9, 1 + k * 2.5, 0, 0, TAU); g.stroke(); } g.globalAlpha = 1; }
        // the scanner beam from Glitch to the guest
        if (ST.scan && now - ST.scan < 900 && ST.cur && G.glitch) {
          const k = (now - ST.scan) / 900, gx = G.glitch.x - G.glitch.s * 0.2, gy = G.glitch.y - G.glitch.s * 0.55, tx = ST.cur.x, ty = ST.cur.y - G.gh * (0.2 + 0.7 * k);
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 * Math.sin(Math.PI * k); g.strokeStyle = '#ff4fd8'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(gx, gy); g.lineTo(tx - G.gw * 0.4, ty); g.lineTo(tx + G.gw * 0.4, ty); g.closePath(); g.stroke();
          g.globalAlpha *= 0.4; g.fillStyle = '#ff4fd8'; g.fill();
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        }
        // the palm's hold: a warm ring grows round the guest as you hold
        if (HOLD.k > 0.02 && ST.cur) {
          const gu = ST.cur, cx = gu.x, cy = gu.y - G.gh * 0.55, r = G.gh * (0.55 + 0.1 * HOLD.k);
          g.globalCompositeOperation = dk ? 'lighter' : 'source-over'; g.strokeStyle = '#ffd9a0'; g.globalAlpha = 0.85; g.lineWidth = 4; g.lineCap = 'round';
          g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * HOLD.k); g.stroke();
          g.globalAlpha = 0.25 * HOLD.k; g.drawImage(GLOW.light, cx - r * 1.2, cy - r * 1.2, r * 2.4, r * 2.4);
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        }
        void p;
      }
      const splashes = [];
      function draw(dt, now) {
        const g = cv.g;
        dk = dark();
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.drawImage(L.bg.c, 0, 0, G.w, G.H);
        drawRoom(g, now);
        drawDoor(g, now);
        drawStreetLife(g, now, dt);
        drawRope(g, now);
        P.update(dt); P.draw(g);
      }

      /* ---------------- loop ---------------- */
      let last = performance.now(), fq = 0;
      K.loop(() => {
        if (!cv.g || !L.bg) return;
        const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (HOLD.on && ST.state === 'decide') {
          HOLD.k = Math.min(1, (now - HOLD.t0) / HOLD.need);
          if (HOLD.hum) HOLD.hum.freq(380 + HOLD.k * 520);
          if (ST.cur && ST.cur.p.twist) guiltStep(HOLD.k);
          if (HOLD.k >= 1) { HOLD.on = false; if (HOLD.hum) { const hm = HOLD.hum; hm.level(0.0001, 0.08); K.later(() => hm.stop(), 300); HOLD.hum = null; } if (ST.cur && ST.cur.p.twist) guiltDone(); else respond('no'); HOLD.k = 0; }
        } else if (!HOLD.on && HOLD.k > 0) HOLD.k = Math.max(0, HOLD.k - dt * (ST.cur && ST.cur.p.twist ? 0.35 : 1.6));
        if (++fq % 2 === 0) cardNo.style.setProperty('--k', HOLD.k.toFixed(3));
        ST.door += (ST.doorT - ST.door) * Math.min(1, dt * 5); ST.rope += (ST.ropeT - ST.rope) * Math.min(1, dt * 6); ST.sparkle *= ST.calm ? 1 : Math.exp(-dt * 0.8);
        for (let i = ST.limited.length - 1; i >= 0; i--) if (now > ST.limited[i].until) { ST.limited.splice(i, 1); if (A.ctx) A.chime(A.note('C6'), { vol: 0.03, dur: 0.8 }); }
        const cl = 0.0001 + ST.crowd * 0.07 + ST.limited.length * 0.01; if (chatter && Math.abs(cl - (ST.cl || 0)) > 0.002) { chatter.level(cl, 0.4); ST.cl = cl; }
        updGuests(dt, now);
        draw(dt, now);
      });

      /* taps on the open street still answer: a little shimmer and a soft click */
      S.listen(el, 'pointerdown', (e) => {
        const tg = e.target; if (!G.w || ST.state === 'intro') return;
        if (tg && tg.closest && tg.closest('.bn-desk, .bn-chips, .bn-card, .bn-guest, .bn-door-sign, .bn-book, button')) return;
        const pt = K.local(e, el);
        P.emit('spark', pt.x, pt.y, 6, { colors: [pal().neon2, '#ffffff', pal().neon], speed: [30, 90] });
        if (A.ctx) { A.click({ vol: 0.05 }); A.sync('tap', performance.now()); }
      });

      /* ---------------- sound bed ---------------- */
      const music = K.music(CLUB.music);
      music.level(0.55);
      const rain = K.ambience(dark() ? 'rain' : 'room');
      rain.level(dark() ? 0.35 : 0.25, 1.5);
      let chatter = null;
      S.on('audio-ready', () => { if (!chatter && A.ctx) { chatter = A.loop({ pink: true, filter: 'bandpass', freq: 700, q: 1.1, bus: 'amb' }); } });
      if (A.ctx) chatter = A.loop({ pink: true, filter: 'bandpass', freq: 700, q: 1.1, bus: 'amb' });
      S.onDestroy(() => { if (chatter) chatter.stop(); if (HOLD.hum) HOLD.hum.stop(); });

      /* ---------------- start ---------------- */
      cv.onResize(() => { layout(); });
      S.on('theme', () => { el.classList.toggle('bn-bright', !dark()); buildSprites(); paintBg(); });
      (async () => {
        await K.intro({ title: 'Bouncer', sub: 'Tonight you work the door of ' + CLUB.name + ', the club called Your Time. It’s your evening.', how: 'Hold a palm for a kind no, drag a card, or swipe a guest in.', char: 'patch', mood: 'cool' });
        ST.state = 'list';
        const intro = care ? { Jolly: 'What you wrote matters, and it deserves proper time and proper help. Tonight we just practise on the everyday asks.', Cheeky: 'That’s real, and it deserves proper help, not a bouncer. Tonight we practise on the small stuff.', Unfiltered: 'That matters. Get proper help for it. Tonight: small asks only.' }
          : gentle ? { Jolly: 'If someone makes saying no feel unsafe, that’s not about finding the right words, and you deserve support. Tonight we practise with silly guests only.', Cheeky: 'Serious bit first: if no ever feels unsafe with someone, that’s not on you, and support is there. Tonight, silly practice guests only.', Unfiltered: 'If no feels unsafe with someone, that’s not your fault. Support exists. Tonight: practice guests only.' }
            : { Jolly: 'Welcome to the door of your evening. The club’s called Your Time. I’ll show you the ropes.', Cheeky: 'You’re the bouncer tonight. The club is your evening. The rope is extremely velvet.', Unfiltered: 'You run the door. The club is your evening.' };
        say('patch', intro, care || gentle ? 6200 : 4200, 'cool');
        K.later(() => { say('patch', { Jolly: 'First, tonight’s guest list. Pick one VIP.', Cheeky: 'Every club needs a VIP. Pick yours.', Unfiltered: 'Pick tonight’s VIP.' }, 3200); vipChoice(); }, care || gentle ? 3200 : 1700);
        ctx.track('begin', { club: CLUB.id, own: own ? 1 : 0, gentle: gentle ? 1 : 0 });
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = performance.now(); while (!fn() && performance.now() - t0 < (ms || 30000)) await K.wait(60); };
          await until(() => ST.state === 'list' && el.querySelector('.bn-chip'), 20000);
          await K.wait(500);
          const chip = el.querySelectorAll('.bn-chip')[1];
          if (chip) await K.sim.tap(chip);
          const plan = ['no', 'later', 'yes', 'limit', 'no', 'hold', 'later', 'limit', 'no', 'yes'];
          let i = 0, guard = 0;
          while (!ST.finished && guard++ < 60) {
            await until(() => ST.state === 'decide' || ST.state === 'closing' || ST.finished, 30000);
            if (ST.state === 'closing') { await K.wait(700); await K.sim.tap(doorSign); await until(() => ST.finished, 15000); break; }
            if (ST.finished) break;
            await K.wait(500);
            const gu = ST.cur; if (!gu) continue;
            let act = gu.vip ? 'yes' : gu.p.twist ? 'hold' : plan[i % plan.length];
            if (act === 'yes' && !gu.vip && i > 6) act = 'later';
            i++;
            if (act === 'hold' || act === 'no') { await K.sim.hold(cardNo, (act === 'hold' ? HOLD_MS * 3.4 : HOLD_MS) + 450); }
            else if (act === 'yes') { const r = K.rectIn(gu.el, el); await K.sim.drag(gu.el, { x: r.w * 0.5, y: r.h * 0.5 }, { x: r.w * 0.5 + 150, y: r.h * 0.5 - 10 }, 260, 8); }
            else { const card = act === 'later' ? cardLater : cardLimit, cr = K.rectIn(card, el); await K.sim.drag(card, { x: cr.w / 2, y: cr.h / 2 }, { x: gu.x - cr.x, y: gu.y - G.gh * 0.5 - cr.y }, 420, 10); }
            await until(() => ST.state !== 'decide' || ST.finished, 4000);
          }
          await until(() => ST.finished, 20000);
        }
      };
    }
  });
})(window.TSG_ENV);
