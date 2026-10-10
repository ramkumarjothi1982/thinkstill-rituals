/* 032 Headline Desk — Reframe · REFRAME · Uncertainty / Future Worry / Reassurance
 * Mechanism: decatastrophising language (Beck 1976; Burns 1980). The same facts told as a tabloid catastrophe ("DOOMED!!!")
 * raise alarm; told as a sober, accurate headline they settle. The player fact-checks the claims on tonight's front page
 * (what a camera could have recorded is stamped TRUE, what the mind added UNVERIFIED, exactly as the reading found them),
 * drags sober type over each loud word (every slot keeps its grammar, so the page always reads as a headline and the
 * finished one says only what is known), spikes the sub-editor's click-bait, then holds the press lever to print it.
 * Honest: when the facts back the worry the sober headline says a plan comes next; in care mode it points to proper advice.
 * Verb: typeset (tap to stamp, drag word tiles onto the loud words, drag loud tiles onto the spike, hold the press lever).
 * Finale: the rotary press thunders up to speed, the paper web races through the cylinders, the folder spits out copies,
 * and at dawn the calm broadsheet lands on doorstep after doorstep, the last one at your feet.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const eOut = (t) => 1 - Math.pow(1 - t, 3);
  const eInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function hexRgb(hx) { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hx || '') || [0, '80', '80', '80']; return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]; }
  function rgba(hx, a) { const c = hexRgb(hx); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function mix(a, b, k) { const A = hexRgb(a), B = hexRgb(b); k = clamp(k, 0, 1); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); }
  /* No GPU (VMs, blocklisted devices): every canvas pixel is rasterised on the CPU, so draw at a lower density there. */
  let softMemo = null;
  function softwareGfx() {
    if (softMemo != null) return softMemo;
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl');
      if (!gl) return (softMemo = true);
      const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return (softMemo = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r));
    } catch (e) { return (softMemo = false); }
  }

  /* <story> The front page, built honestly from the reading (pure: no DOM).
   * The tabloid headline always has the same shape: [KICKER] EVENT VERB-PHRASE; TAIL!!!  Every slot is swapped whole for a
   * tile of the same grammatical kind (a kicker, a transitive verb phrase on a singular subject, an independent clause after
   * the semicolon), so any mix of loud and sober tiles still reads as a headline, and the all-sober one is accurate:
   * the event is a plain noun taken from the player's own words (or "one thought"), the verb phrase says what is surely true
   * (it sparked worry, it raised questions) and the tail says what is honestly known (no verdict yet; or, when the facts
   * back the fear, that a plan comes next). Claims on the page are exact pieces of their text (analysis spans): what a
   * camera could record is stamped TRUE, what the mind added is stamped UNVERIFIED. */
  const STORY = (() => {
    const low = (s) => String(s || '').toLowerCase();
    const norm = (s) => String(s || '').replace(/[‘’`´]/g, '’').replace(/\s+/g, ' ').trim();
    // event nouns, most specific first; [pattern, noun]
    const EVENTS = [
      [/\bgroup ?chat\b/i, 'group chat'], [/\b(quick chat|a chat|chat|catch[- ]?up|one[- ]on[- ]one|1:1)\b/i, 'chat'], [/\bmeeting\b/i, 'meeting'], [/\b(presentation)\b/i, 'presentation'],
      [/\b(speech)\b/i, 'speech'], [/\b(pitch)\b/i, 'pitch'], [/\binterview\b/i, 'interview'], [/\b(exam)\b/i, 'exam'], [/\b(exam results?|results? day|grades? (came|are) back)\b/i, 'result'],
      [/\b(doctor|gp|hospital|tests|scans?|biopsy|test results?|blood test)\b/i, 'medical news'], [/\bresults?\b/i, 'result'],
      [/\b(driving test|test)\b/i, 'test'], [/\b(essay)\b/i, 'essay'], [/\b(assignment)\b/i, 'assignment'], [/\b(e-?mail(ed)?)\b/i, 'email'],
      [/\b(text(ed)?|messag(e|ed|es)|dm(ed)?|whatsapp|group chat)\b/i, 'message'], [/\b(phone call|call(ed)?)\b/i, 'call'], [/\b(letter|notice)\b/i, 'letter'],
      [/\b(dinner)\b/i, 'dinner'], [/\b(party)\b/i, 'party'], [/\b(first date|a date|our date|date night)\b/i, 'date'], [/\b(argument|fight)\b/i, 'argument'],
      [/\b(mistake|error)\b/i, 'mistake'], [/\b(comment|remark)\b/i, 'comment'], [/\b(review|feedback)\b/i, 'feedback']
    ];
    // who sent it, when their own words say so ("my landlord emailed", "my boss messaged me")
    const SENDER = /\b(boss|manager|supervisor|landlord|teacher|lecturer|tutor|client|colleague|coworker|team ?lead|coach|mum|mom|dad|mother|father|sister|brother|partner|husband|wife|boyfriend|girlfriend|best friend|friend|flatmate|roommate)\b[^.!?]{0,24}?\b(messaged|emailed|texted|called|asked|wrote|sent|said|told)\b/i;
    const SENT_NOUN = { messaged: 'message', texted: 'message', emailed: 'email', called: 'call', wrote: 'message', sent: 'message', asked: 'question', said: 'comment', told: 'news' };
    function eventOf(text) {
      const t = norm(text); if (!t) return null;
      const m = SENDER.exec(t);
      if (m) { const who = low(m[1]).replace(/\s+/g, ' '), what = SENT_NOUN[low(m[2])] || 'message'; return who + ' ' + what; }
      for (const [re, noun] of EVENTS) if (re.test(t)) return noun;
      return null;
    }
    // what the fear says, screamed: a transitive verb phrase for a singular subject
    const LOUD_VP = [
      [/\b(fired|sacked|let (me|you) go|letting (me|you) go|lose (my|your) job|job|career|redundan\w*|laid off)\b/i, 'spells career doom'],
      [/\b(evict\w*|lose (my|your) (flat|home|house|place)|homeless|kicked out)\b/i, 'costs home'],
      [/\b(debt|broke|bankrupt\w*|money|bill|rent)\b/i, 'spells money ruin'],
      [/\b(losing interest|leave me|leaving me|dump\w*|break(ing)? up|cheat\w*|doesn'?t love|fall(ing)? out of love)\b/i, 'ends romance'],
      [/\b(annoyed|angry|mad at|furious|upset with|hates? me|sick of me|fed up)\b/i, 'sparks secret fury'],
      [/\b(incompetent|stupid|idiot|failure|useless|weird|annoying|embarrass\w*|humiliat\w*|live it down|laugh\w* at me|judg\w*)\b/i, 'ruins reputation'],
      [/\b(fail\w*|exam|grade|course|uni|future|marks?)\b/i, 'wrecks future'],
      [/\b(serious|sick|ill|illness|cancer|disease|wrong with me|dying)\b/i, 'means the worst'],
      [/\b(friend\w*|ignor\w*|ghost\w*|repl\w*|left out)\b/i, 'ends friendship']
    ];
    const LOUD_TAIL = { all_or_nothing: 'everyone knows', overgeneralising: 'it always happens', mind_reading: 'they all think it', fortune_telling: 'no way back', catastrophising: 'no way back',
      labelling: 'it’s official', emotional_reasoning: 'feels 100% true', personalising: 'all your fault', magnifying: 'worst ever', should: 'no excuses', filtering: 'nothing else matters', discounting_positive: 'good bits don’t count' };
    const KICK = ['Shock!', 'Horror!', 'Exclusive!'];
    // hard facts on record: when these are in the camera footage, the sober page never says "outcome unknown" about them
    const HARD = /\b(fired|sacked|let (me|you) go|letting (me|you) go|laid off|made redundant|redundan\w*|broke up|breaking up|dumped|evict\w*|failed|rejected|diagnos\w*|terminat\w*)\b/i;
    // a "camera" span that still carries a verdict is never stamped TRUE (the local reader can mislabel a self-judgement)
    const VERDICT = /\b(i guess|i think|i feel|i just know|i bet|i'?m sure|probably|definitely|obviously|clearly|must|forgettable|useless|stupid|idiot|failure|loser|incompetent|worthless|pathetic|hopeless|terrible|awful|annoying|weird|hate[sd]?|annoyed|angry|furious|mad at|sick of|ruined|disaster|worst|will never|’ll never|'ll never|never live|going to|gonna)\b|\b(i'?m|i am|i’m)\s+(so |such |a |an |just |completely |totally |really )*(mess|joke|burden|fraud|failure|loser|idiot)\b/i;
    const SPEECH = /\b(said|says|told|asked|texted|wrote|messaged|emailed|replied|called)\b/i;
    const words = (s) => norm(s).split(' ').filter(Boolean);
    const clip = (s, n) => { const w = words(s); return w.length <= n ? norm(s).replace(/[,;:\s]+$/, '') : w.slice(0, n).join(' ').replace(/[,;:–-]+$/, '') + '…'; };
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    function build(o) {
      const text = String(o.text || ''), an = o.an || {}, inten = o.inten | 0, noWords = !text.trim();
      const care = an.safety === 'care';
      const spans = (Array.isArray(an.spans) ? an.spans : []).filter(s => s && s.quote && text.toLowerCase().includes(String(s.quote).toLowerCase()));
      // claims: exact pieces of their text
      const cams = spans.filter(s => s.kind === 'camera' && !VERDICT.test(s.quote) && words(s.quote).length >= 3);
      // a brain span that reports what someone said is on record, not a guess: never stamp it UNVERIFIED
      let brains = spans.filter(s => s.kind === 'brain' && words(s.quote).length >= 2 && !SPEECH.test(s.quote));
      const CONCL = /\b(definitely|going to|gonna|must|means|will|'ll|’ll|never|everyone|nobody|fired|sacked|hate|over|losing|leaving|ruined|incompetent|annoyed|clearly|obviously)\b/i;
      brains = brains.slice().sort((a, b) => (CONCL.test(b.quote) ? 1 : 0) - (CONCL.test(a.quote) ? 1 : 0));
      const nCam = inten === 0 ? 1 : 2, nBrain = inten === 2 ? 2 : 1;
      let claims = [];
      const hardFact = cams.some(s => HARD.test(s.quote)) || (Array.isArray(an.exhibits) && an.exhibits.some(e => e && e.kind === 'camera' && HARD.test(e.text || '')));
      const strong = an.fear_support === 'strong', serious = strong || hardFact;
      const some = !serious && an.fear_support === 'some';
      if (!noWords) {
        cams.slice(0, nCam).forEach(s => claims.push({ text: clip(s.quote, 15), kind: 'camera', own: true }));
        brains.slice(0, nBrain).forEach(s => claims.push({ text: clip(s.quote, 15), kind: 'brain', own: true }));
        // the reading had no usable span of one kind: its own plain-language version stands in (not their words, so not quoted)
        if (!claims.some(c => c.kind === 'camera')) {
          const ex = (an.exhibits || []).find(e => e && e.kind === 'camera' && e.text && !VERDICT.test(e.text));
          claims.unshift(ex ? { text: clip(ex.text, 15), kind: 'camera', own: false } : { text: 'Something happened that’s on your mind.', kind: 'camera', own: false });
        }
        if (!claims.some(c => c.kind === 'brain')) {
          const c0 = an.conclusion || an.thought; if (c0) claims.push({ text: clip(c0, 14), kind: 'brain', own: false });
        }
      }
      const practice = noWords || !claims.length;
      if (practice) claims = [{ text: 'A message arrived at 4:55pm asking for a quick chat tomorrow.', kind: 'camera', own: false }, { text: 'This means it’s all over.', kind: 'brain', own: false }];
      // the event: a plain noun from their words, or "one moment"
      const event = practice ? 'work message' : (eventOf(text) || 'one thought');
      // the loud verb phrase follows what the fear says
      const fearText = practice ? 'fired' : [an.conclusion, an.thought].concat(brains.map(b => b.quote)).join(' ');
      let loudVP = 'spells disaster';
      for (const [re, vp] of LOUD_VP) if (re.test(fearText)) { loudVP = vp; break; }
      const dist = (Array.isArray(an.distortions) ? an.distortions : []).map(d => d && d.type).filter(Boolean);
      let loudTail = 'it’s over'; for (const d of dist) if (LOUD_TAIL[d]) { loudTail = LOUD_TAIL[d]; break; }
      const kick = KICK[(dist.includes('mind_reading') ? 2 : dist.includes('catastrophising') ? 1 : 0)];
      const soberVP = care ? ['raises concern', 'prompts questions'] : strong ? ['raises real concern', 'sparks worry'] : ['sparks worry', 'raises questions'];
      const soberTail = care ? ['expert advice next', 'facts to check'] : serious ? ['next step: a plan', 'plan comes next'] : some ? ['outcome still open', 'no verdict yet'] : ['outcome unknown', 'no verdict yet'];
      const slots = [
        { key: 'kick', role: 'kicker', loud: kick, sober: ['Update', 'In brief'] },
        { key: 'vp', role: 'verb', loud: loudVP, sober: soberVP },
        { key: 'tail', role: 'tail', loud: loudTail, sober: soberTail }
      ];
      return { event, slots, punct: '!!!', claims, practice, care, serious, strong, some, hardFact };
    }
    const headline = (st, pick) => { // pick: { kick, vp, tail } chosen strings (or loud ones); returns the sober sentence-case headline
      const s = cap(st.event) + ' ' + pick.vp + '; ' + pick.tail;
      return s;
    };
    return { build, headline, eventOf, clip, cap, VERDICT, HARD };
  })();

  /* ---------------- the newsroom: invented papers, daily props ---------------- */
  const TAB = "'Oswald', 'TeX Gyre Heros Cn', 'Arial Narrow', 'Roboto Condensed', Impact, sans-serif";
  const NEWS = "'Newsreader', 'TeX Gyre Schola', 'Century Schoolbook', 'Georgia', serif";
  const MAST = "'UnifrakturMaguntia', 'Old English Text MT', 'TeX Gyre Schola', 'Georgia', serif";
  const TYPE = "'Courier Prime', 'TeX Gyre Cursor', 'Courier New', monospace";
  const MASTHEADS = ['The Steady Hand', 'The Even Keel', 'The Level Head', 'The Morning Measure', 'The Quiet Compass', 'The Calm Almanac', 'The Second Look'];
  const PRICES = ['your peace of mind', 'one good night’s sleep', 'three hours of replaying', 'all your attention', 'a racing heart'];
  const RUSH = { normal: ['Exclusive!', 'You won’t believe it', 'Total meltdown', 'Breaking!!', 'Shock horror', '100% confirmed', 'Click here'], care: ['Exclusive!', 'Breaking!!', 'Must read', 'Live updates'] };
  const MUGS = [{ body: '#efe7d8', band: '#c0262d' }, { body: '#2f5f8a', band: '#f2e6c8' }, { body: '#e8c35a', band: '#3a2a12' }, { body: '#3f6e5c', band: '#efe7d8' }, { body: '#d8d2c8', band: '#1d3758' }];
  const SHADES = ['#2f6b4f', '#8a6a2a', '#7a2a2a'];

  (env.games = env.games || []).push({
    id: 'headline-desk', mode: 'reframe', name: 'Headline Desk', verb: 'typeset', family: 'REFRAME', minutes: 2,
    parents: ['Uncertainty / Future Worry / Reassurance', 'Beliefs / Evidence', 'Communication / Boundaries'],
    cast: ['glitch', 'rush'], poster: { char: 'glitch', mood: 'coffee' },
    fonts: ['Oswald:wght@500;700', 'Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,700;1,6..72,500', 'UnifrakturMaguntia', 'Courier+Prime:wght@400;700'],
    tagline: 'Tonight’s front page is screaming. Fact-check it and print it calm.',
    why: 'For catastrophe-shaped worries: check the claims, swap the loud words, print it calm.',
    css: `
.g-headline-desk { --hd-ink: #1b1813; --hd-red: #d1262d; --hd-red2: #8f1219; --hd-navy: #1d3758; --hd-green: #1c7346; }
.g-headline-desk .hd-hud { position: absolute; z-index: 20; left: 12px; right: 12px; top: calc(env(safe-area-inset-top, 0px) + 62px); display: flex; justify-content: space-between; align-items: center; gap: 8px; pointer-events: none; transition: opacity .5s ease, transform .5s ease; }
.g-headline-desk .hd-hud.out { opacity: 0; transform: translateY(-10px); }
.g-headline-desk .hd-pill, .g-headline-desk .hd-vol { display: flex; align-items: center; gap: 8px; padding: 7px 12px 6px; border-radius: 999px; background: rgba(18,14,10,.84); border: 1px solid rgba(255,232,196,.22); color: #f5ead2; box-shadow: 0 6px 16px rgba(0,0,0,.3); white-space: nowrap; }
.g-headline-desk .hd-pill { min-width: 0; overflow: hidden; }
.g-headline-desk .hd-pill b { font: 700 14px/1 ${TAB}; letter-spacing: .06em; text-transform: uppercase; color: #ff8f86; }
.g-headline-desk .hd-pill.calm b { font: 400 17px/1 ${MAST}; letter-spacing: .01em; text-transform: none; color: #f8eed8; }
.g-headline-desk .hd-pill em { font: 700 12px/1 ${TYPE}; font-style: normal; letter-spacing: .03em; color: #d8cbb2; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.g-headline-desk .hd-vol { flex: none; font: 700 12px/1 ${TYPE}; letter-spacing: .06em; text-transform: uppercase; }
.g-headline-desk .hd-vol i { position: relative; width: 58px; height: 8px; border-radius: 4px; background: linear-gradient(90deg, #4fbf86, #e8c34a 55%, #e2403f); box-shadow: inset 0 1px 2px rgba(0,0,0,.5); }
.g-headline-desk .hd-vol i::after { content: ""; position: absolute; top: -4px; left: calc(var(--vol, 1) * 100% - 2px); width: 4px; height: 16px; border-radius: 2px; background: #fff; box-shadow: 0 0 0 1px rgba(0,0,0,.45), 0 0 8px rgba(255,255,255,.55); transition: left .7s cubic-bezier(.2,1.4,.4,1); }
@container (max-width: 400px) { .g-headline-desk .hd-vol span { display: none; } }

.g-headline-desk .hd-page { position: absolute; z-index: 10; box-sizing: border-box; padding: 10px 14px 12px; color: var(--hd-ink); transform-origin: 50% 0;
  background: radial-gradient(rgba(70,48,14,.06) 1px, transparent 1.4px) 0 0 / 4px 4px, linear-gradient(176deg, #f8f3e6, #ede5d1 70%, #e6dcc4);
  box-shadow: 0 1px 0 rgba(0,0,0,.08), 0 22px 44px rgba(0,0,0,.5), inset 0 0 36px rgba(130,96,40,.14); transform: rotate(-.5deg); transition: opacity .5s ease; }
.g-headline-desk .hd-page.slap { animation: headline-desk-slap .55s cubic-bezier(.2,1.3,.4,1) both; }
@keyframes headline-desk-slap { from { opacity: 0; transform: translateY(-46px) rotate(-7deg) scale(1.08); } 60% { opacity: 1; transform: translateY(4px) rotate(.2deg) scale(.996); } to { opacity: 1; transform: rotate(-.5deg); } }
.g-headline-desk .hd-page.gone { opacity: 0; visibility: hidden; pointer-events: none; transition: opacity .45s ease, visibility 0s linear .45s; }
.g-headline-desk .hd-mast { position: relative; height: 40px; perspective: 600px; margin-bottom: 5px; }
.g-headline-desk .hd-mast > div { position: absolute; inset: 0; display: grid; place-items: center; backface-visibility: hidden; -webkit-backface-visibility: hidden; transition: transform .75s cubic-bezier(.3,1.3,.4,1), opacity .45s ease; white-space: nowrap; overflow: hidden; }
.g-headline-desk .hd-mast-tab { background: var(--hd-red); color: #fff; font: 700 27px/1 ${TAB}; letter-spacing: .05em; text-transform: uppercase; box-shadow: inset 0 0 0 2px #fff, inset 0 0 0 4px var(--hd-red); }
.g-headline-desk .hd-mast-sob { font: 400 32px/1 ${MAST}; color: var(--hd-ink); transform: rotateX(-90deg); opacity: 0; }
.g-headline-desk .hd-page.calm .hd-mast-tab { transform: rotateX(90deg); opacity: 0; }
.g-headline-desk .hd-page.calm .hd-mast-sob { transform: none; opacity: 1; }
.g-headline-desk .hd-folio { display: flex; justify-content: space-between; gap: 10px; font: 700 12px/1.25 ${TYPE}; padding: 4px 0 3px; border-top: 2px solid var(--hd-ink); border-bottom: 1px solid var(--hd-ink); margin-bottom: 8px; }
.g-headline-desk .hd-folio span:last-child { text-align: right; }
.g-headline-desk .hd-kick { display: flex; align-items: center; gap: 8px; min-height: 30px; margin-bottom: 4px; }
.g-headline-desk .hd-kick .hd-slot { font: 700 18px/1.25 ${TAB}; letter-spacing: .06em; text-transform: uppercase; }
.g-headline-desk .hd-page.calm .hd-kick .hd-slot { font: 600 15px/1.2 ${NEWS}; font-variant: small-caps; letter-spacing: .08em; text-transform: lowercase; color: var(--hd-navy); }
.g-headline-desk .hd-head { margin: 0; font: 700 calc(42px * var(--hs, 1))/1.02 ${TAB}; text-transform: uppercase; letter-spacing: .004em; color: var(--hd-ink); text-wrap: balance; transition: opacity .18s ease; }
.g-headline-desk .hd-page.calm .hd-head { font: 700 calc(31px * var(--hs, 1))/1.14 ${NEWS}; text-transform: none; letter-spacing: -.004em; }
.g-headline-desk .hd-head.retype { opacity: .12; }
.g-headline-desk .hd-slot { display: inline; position: relative; border-radius: 3px; -webkit-box-decoration-break: clone; box-decoration-break: clone; transition: color .35s ease, background-color .35s ease, box-shadow .35s ease; }
.g-headline-desk .hd-slot.loud { background: var(--hd-red); color: #fff; padding: 0 .12em; box-shadow: 0 2px 0 var(--hd-red2); }
.g-headline-desk .hd-slot.loud.drag { touch-action: none; cursor: grab; }
.g-headline-desk .hd-slot.target { animation: headline-desk-hot 1.15s ease-in-out infinite; }
.g-headline-desk .hd-slot.hover { outline: 3px dashed #ffe9a6; outline-offset: 2px; }
.g-headline-desk .hd-slot.sober { color: var(--hd-navy); }
.g-headline-desk .hd-slot.set { animation: headline-desk-set .5s cubic-bezier(.2,1.5,.4,1); }
.g-headline-desk .hd-slot.lift { opacity: .25; }
.g-headline-desk .hd-slot.spiked { display: none; }
@keyframes headline-desk-hot { 0%, 100% { box-shadow: 0 2px 0 var(--hd-red2), 0 0 0 0 rgba(209,38,45,.6); } 50% { box-shadow: 0 2px 0 var(--hd-red2), 0 0 0 8px rgba(209,38,45,0); } }
@keyframes headline-desk-set { from { background-color: rgba(255,214,110,.95); box-shadow: 0 0 0 4px rgba(255,214,110,.55); } to { background-color: rgba(255,214,110,0); box-shadow: 0 0 0 4px rgba(255,214,110,0); } }
.g-headline-desk .hd-deck { margin: 7px 0 8px; font: 700 15px/1.22 ${TAB}; letter-spacing: .03em; text-transform: uppercase; color: var(--hd-red2); }
.g-headline-desk .hd-page.calm .hd-deck { font: 500 15px/1.3 ${NEWS}; font-style: italic; letter-spacing: 0; text-transform: none; color: #3a3326; }
.g-headline-desk .hd-claims { display: flex; flex-direction: column; gap: 5px; border-top: 1px solid rgba(27,24,19,.55); padding-top: 7px; }
.g-headline-desk .hd-claim { appearance: none; border: 0; margin: 0; padding: 3px 2px; background: transparent; color: inherit; font: inherit; text-align: left; display: grid; grid-template-columns: minmax(0, 1fr) 104px; gap: 10px; align-items: center; cursor: pointer; border-radius: 6px; }
.g-headline-desk .hd-claim:focus-visible { outline: 3px solid var(--hd-navy); outline-offset: 2px; }
.g-headline-desk .hd-claim[disabled] { cursor: default; }
.g-headline-desk .hd-q { font: 500 15px/1.3 ${NEWS}; font-style: italic; overflow-wrap: anywhere; }
.g-headline-desk .hd-q.gk-user { font-weight: 600; }
.g-headline-desk .hd-sbox { position: relative; height: 46px; border: 2px dashed rgba(27,24,19,.33); border-radius: 6px; display: grid; place-items: center; font: 700 12px/1.1 ${TYPE}; letter-spacing: .05em; color: rgba(27,24,19,.6); text-align: center; }
.g-headline-desk .hd-claim.next .hd-sbox { border-color: var(--hd-red); color: var(--hd-red2); background: rgba(209,38,45,.06); }
.g-headline-desk .hd-claim.done .hd-sbox { border-color: transparent; color: transparent; }
.g-headline-desk .hd-mark { position: absolute; inset: -3px -5px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 3px double currentColor; border-radius: 5px; font: 700 15px/1 ${TYPE}; letter-spacing: .03em; transform: rotate(-7deg); mix-blend-mode: multiply;
  -webkit-mask-image: radial-gradient(rgba(0,0,0,.5) 1px, #000 1.7px); -webkit-mask-size: 5px 6px; mask-image: radial-gradient(rgba(0,0,0,.5) 1px, #000 1.7px); mask-size: 5px 6px; animation: headline-desk-stamp .3s cubic-bezier(.2,1.6,.4,1) both; }
.g-headline-desk .hd-mark small { font: 700 12px/1.1 ${TYPE}; letter-spacing: .02em; margin-top: 3px; }
.g-headline-desk .hd-mark.true { color: var(--hd-green); }
.g-headline-desk .hd-mark.unv { color: var(--hd-red); }
@keyframes headline-desk-stamp { from { opacity: 0; transform: rotate(-7deg) scale(2.1); } to { opacity: 1; transform: rotate(-7deg); } }
.g-headline-desk .hd-stamper { position: absolute; z-index: 40; width: 56px; height: 64px; pointer-events: none; transition: transform .12s cubic-bezier(.5,0,1,1), opacity .25s ease; }
.g-headline-desk .hd-stamper::before { content: ""; position: absolute; left: 18px; top: 0; width: 20px; height: 30px; border-radius: 10px 10px 4px 4px; background: linear-gradient(90deg, #6a3d1e, #b0733f 45%, #5a3218); box-shadow: 0 4px 8px rgba(0,0,0,.4); }
.g-headline-desk .hd-stamper::after { content: ""; position: absolute; left: 0; right: 0; top: 30px; height: 26px; border-radius: 4px; background: linear-gradient(180deg, #3a3a3e, #1d1d20); box-shadow: inset 0 -6px 0 var(--ink, #c62a2f), 0 8px 14px rgba(0,0,0,.45); }
.g-headline-desk .hd-rt { position: absolute; z-index: 32; touch-action: none; cursor: grab; padding: 7px 12px 6px; font: 700 20px/1 ${TAB}; letter-spacing: .04em; text-transform: uppercase; color: #fff; white-space: nowrap; border-radius: 3px;
  background: linear-gradient(180deg, #ff4b3e, #c3141c); box-shadow: 0 0 0 2px #fff3c4, 0 0 0 4px #c3141c, 0 10px 18px rgba(0,0,0,.45); transform: rotate(var(--r, -6deg)); animation: headline-desk-throw .42s cubic-bezier(.2,1.5,.4,1) both; }
.g-headline-desk .hd-rt.lift { opacity: .2; }
.g-headline-desk .hd-rt:focus-visible { outline: 3px solid #fff; outline-offset: 4px; }
@keyframes headline-desk-throw { from { opacity: 0; transform: translate(60px, -40px) rotate(24deg) scale(1.6); } to { opacity: 1; transform: rotate(var(--r, -6deg)); } }
.g-headline-desk .hd-ghost { position: absolute; z-index: 60; pointer-events: none; margin: 0; box-sizing: border-box; transform: rotate(-3deg) scale(1.06); box-shadow: 0 18px 30px rgba(0,0,0,.5); animation: none; }
.g-headline-desk .hd-fly { position: absolute; z-index: 58; pointer-events: none; margin: 0; box-sizing: border-box; transition: left .42s cubic-bezier(.5,0,.75,0), top .42s cubic-bezier(.5,0,.75,0), transform .42s ease, opacity .42s ease; }

.g-headline-desk .hd-tray { position: absolute; z-index: 12; box-sizing: border-box; display: flex; align-items: stretch; justify-content: center; gap: 10px; padding: 14px 12px 12px; border-radius: 10px;
  background: repeating-linear-gradient(90deg, rgba(0,0,0,.0) 0 22px, rgba(0,0,0,.08) 22px 23px), linear-gradient(180deg, #7d5532, #5b3b20); box-shadow: inset 0 2px 0 rgba(255,222,170,.28), inset 0 -3px 0 rgba(0,0,0,.35), 0 14px 26px rgba(0,0,0,.45); transition: opacity .35s ease, transform .35s ease; }
.g-headline-desk .hd-tray::before { content: attr(data-label); position: absolute; left: 12px; top: -10px; font: 700 12px/1 ${TYPE}; letter-spacing: .08em; color: #f7e8c8; background: #3a2412; padding: 4px 8px; border-radius: 4px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,.35); }
.g-headline-desk .hd-tray.off { opacity: 0; transform: translateY(16px); pointer-events: none; }
.g-headline-desk .hd-tile { appearance: none; border: 0; margin: 0; flex: 1 1 0; min-width: 0; min-height: 50px; padding: 8px 10px; border-radius: 6px; cursor: grab; touch-action: none; color: var(--hd-navy); font: 700 17px/1.12 ${NEWS};
  background: linear-gradient(180deg, #faecd0, #e5c690); box-shadow: 0 3px 0 #b08445, 0 8px 14px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.75); text-align: center; animation: headline-desk-tile .4s cubic-bezier(.2,1.4,.4,1) both; }
.g-headline-desk .hd-tile:nth-child(2) { animation-delay: .08s; }
.g-headline-desk .hd-tile:focus-visible { outline: 3px solid #fff3c0; outline-offset: 2px; }
.g-headline-desk .hd-tile.lift { opacity: .25; }
@keyframes headline-desk-tile { from { opacity: 0; transform: translateY(12px) scale(.94); } to { opacity: 1; transform: none; } }

.g-headline-desk .hd-spike { position: absolute; z-index: 11; width: 78px; height: 150px; pointer-events: none; transition: opacity .4s ease; }
.g-headline-desk .hd-spike.out { opacity: 0; }
.g-headline-desk .hd-needle { position: absolute; z-index: 3; left: 50%; bottom: 16px; width: 4px; height: 118px; margin-left: -2px; background: linear-gradient(90deg, #6d737c, #f3f5f8 45%, #5d636b); clip-path: polygon(0 7%, 50% 0, 100% 7%, 100% 100%, 0 100%); }
.g-headline-desk .hd-spike.hover .hd-needle { filter: drop-shadow(0 0 6px #fff1b8) drop-shadow(0 0 2px #fff); }
.g-headline-desk .hd-base { position: absolute; z-index: 1; left: 6px; right: 6px; bottom: 4px; height: 24px; border-radius: 50%; background: radial-gradient(ellipse at 50% 32%, #f0d28a, #a8823c 58%, #6a4e1f); box-shadow: 0 7px 12px rgba(0,0,0,.5); }
.g-headline-desk .hd-spike > b { position: absolute; z-index: 4; left: 50%; bottom: -16px; transform: translateX(-50%); font: 700 12px/1 ${TYPE}; letter-spacing: .12em; color: #f6e9cc; text-shadow: 0 1px 3px rgba(0,0,0,.85); white-space: nowrap; }
.g-headline-desk .hd-imp { position: absolute; z-index: 2; left: 50%; padding: 4px 7px 3px; font: 700 12px/1 ${TAB}; letter-spacing: .04em; text-transform: uppercase; color: #fff; white-space: nowrap; border-radius: 2px; background: #c3141c; box-shadow: 0 2px 5px rgba(0,0,0,.35); transform: translateX(-50%) rotate(var(--r, 0deg)); animation: headline-desk-imp .25s cubic-bezier(.2,1.6,.4,1) both; }
@keyframes headline-desk-imp { from { transform: translateX(-50%) translateY(-16px) rotate(var(--r, 0deg)); } to { transform: translateX(-50%) rotate(var(--r, 0deg)); } }

.g-headline-desk .hd-press { position: absolute; z-index: 14; display: flex; flex-direction: column; align-items: center; gap: 10px; pointer-events: none; transition: opacity .4s ease, transform .4s ease; }
.g-headline-desk .hd-press.off { opacity: 0; transform: translateY(16px); }
.g-headline-desk .hd-press.off .hd-lever { pointer-events: none; }
.g-headline-desk .hd-lever { pointer-events: auto; position: relative; width: 120px; height: 120px; border-radius: 50%; border: 0; padding: 0; cursor: pointer; touch-action: none;
  background: radial-gradient(circle at 50% 38%, #474c55, #262a30 66%, #16181b); box-shadow: 0 0 0 5px #c9a35a, 0 0 0 8px #6b4f1f, 0 0 calc(10px + var(--p, 0) * 40px) rgba(255,190,90,calc(var(--p, 0) * .7)), 0 16px 30px rgba(0,0,0,.5); }
.g-headline-desk .hd-lever:focus-visible { outline: 3px solid #fff3c0; outline-offset: 8px; }
.g-headline-desk .hd-lever svg { position: absolute; inset: -14px; width: calc(100% + 28px); height: calc(100% + 28px); transform: rotate(-90deg); overflow: visible; pointer-events: none; }
.g-headline-desk .hd-lever circle { fill: none; stroke: #ffcf6b; stroke-width: 6; stroke-linecap: round; stroke-dasharray: 100; stroke-dashoffset: calc(100 - var(--p, 0) * 100); }
.g-headline-desk .hd-arm { position: absolute; left: 50%; top: 50%; width: 12px; height: 54px; margin: -54px 0 0 -6px; transform-origin: 50% 100%; transform: rotate(calc(-55deg + var(--p, 0) * 110deg)); border-radius: 6px; background: linear-gradient(90deg, #888e97, #eceff3 45%, #767c85); }
.g-headline-desk .hd-arm::before { content: ""; position: absolute; left: 50%; top: -15px; width: 30px; height: 30px; margin-left: -15px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ff9c8c, #d1262d 55%, #730e13); box-shadow: 0 4px 9px rgba(0,0,0,.55); }
.g-headline-desk .hd-hub { position: absolute; left: 50%; top: 50%; width: 26px; height: 26px; margin: -13px 0 0 -13px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #f3dc9c, #a8823c 60%, #5e4314); }
.g-headline-desk .hd-press > b { font: 700 15px/1 ${TYPE}; letter-spacing: .1em; color: #fff4dc; text-shadow: 0 1px 3px rgba(0,0,0,.85); white-space: nowrap; }

.g-headline-desk .hd-count { position: absolute; z-index: 24; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 64px); transform: translateX(-50%); padding: 8px 14px 7px; border-radius: 8px; background: rgba(10,8,6,.8); color: #ffe6a6; font: 700 15px/1 ${TYPE}; letter-spacing: .08em; white-space: nowrap; border: 1px solid rgba(255,220,150,.32); box-shadow: 0 8px 18px rgba(0,0,0,.4); transition: opacity .4s ease; }
.g-headline-desk .hd-count[hidden] { display: none; }
.g-headline-desk .hd-final { position: absolute; z-index: 26; box-sizing: border-box; padding: 12px 16px 12px; text-align: center; color: var(--hd-ink); pointer-events: none;
  background: radial-gradient(rgba(70,48,14,.06) 1px, transparent 1.4px) 0 0 / 4px 4px, linear-gradient(176deg, #fbf6ea, #efe7d4 70%, #e7dec8); box-shadow: 0 1px 0 rgba(0,0,0,.1), 0 26px 46px rgba(0,0,0,.5), inset 0 0 30px rgba(130,96,40,.12);
  transform: rotate(-2deg); animation: headline-desk-land .8s cubic-bezier(.2,1.25,.4,1) both; }
@keyframes headline-desk-land { from { opacity: 0; transform: translateY(-140px) rotate(-16deg) scale(1.3); } 70% { opacity: 1; transform: translateY(5px) rotate(-1.2deg) scale(.99); } to { opacity: 1; transform: rotate(-2deg); } }
.g-headline-desk .hd-fm { font: 400 30px/1.05 ${MAST}; }
.g-headline-desk .hd-ff { display: flex; justify-content: space-between; gap: 8px; margin: 5px 0 6px; padding: 3px 0 2px; border-top: 2px solid var(--hd-ink); border-bottom: 1px solid var(--hd-ink); font: 700 12px/1.25 ${TYPE}; }
.g-headline-desk .hd-fh { font: 700 25px/1.14 ${NEWS}; text-wrap: balance; }
.g-headline-desk .hd-fk { display: block; margin-bottom: 3px; font: 600 15px/1.1 ${NEWS}; font-variant: small-caps; letter-spacing: .08em; color: var(--hd-navy); }
.g-headline-desk .hd-fd { margin-top: 6px; font: 500 15px/1.3 ${NEWS}; font-style: italic; color: #3a3326; }
.g-headline-desk .hd-fb { display: flex; flex-wrap: wrap; justify-content: center; gap: 2px 12px; margin-top: 7px; padding-top: 6px; border-top: 1px solid rgba(27,24,19,.35); font: 700 12px/1.3 ${TYPE}; color: #4a3d28; }
.g-headline-desk .hd-fc { margin-top: 6px; font: 600 13px/1.3 ${NEWS}; color: #3a2a18; }
.g-headline-desk .hd-sr { position: absolute; left: 0; top: 0; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.g-headline-desk.gk-game .gk-pop-text, .g-headline-desk.gk-game .gk-pop-text.gk-good, .g-headline-desk.gk-game .gk-pop-text.gk-great { font: 700 22px/1 ${TAB}; letter-spacing: .08em; color: #fff; text-shadow: 0 0 2px #7a0f14, 0 2px 0 #7a0f14, 0 0 6px rgba(122,15,20,.9), 0 4px 14px rgba(0,0,0,.5); }
.g-headline-desk .gk-char.gk-side-right .gk-bubble, .g-headline-desk .gk-char.gk-side-left .gk-bubble { top: auto; bottom: 0; max-width: min(300px, calc(100cqw - 2 * var(--sz, 72px) - 58px)); }
.g-headline-desk .gk-char.gk-side-right .gk-bubble::before, .g-headline-desk .gk-char.gk-side-left .gk-bubble::before { top: auto; bottom: 20px; }
.g-headline-desk .gk-char.hd-right.gk-char-dock { left: auto; right: 12px; }
.g-headline-desk .gk-char { transition: opacity .4s ease; }
@container (min-width: 700px) { .g-headline-desk .gk-char.gk-side-right .gk-bubble, .g-headline-desk .gk-char.gk-side-left .gk-bubble { max-width: 340px; } }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const now = () => performance.now();
      const L = (o, sub) => { let s = ctx.line(o) || ''; if (sub) Object.keys(sub).forEach(k => { s = s.split('{' + k + '}').join(sub[k]); }); return s; };
      const text = String(ctx.text || '');
      const inten = clamp(ctx.intensity | 0, 0, 2);
      const visits = K.visits();
      const bright = () => S.scene() === 'bright';
      const story = STORY.build({ text, an, inten });
      const care = story.care, serious = story.serious;
      const mast = K.dailyPick(MASTHEADS, 3), nextMast = MASTHEADS[(MASTHEADS.indexOf(mast) + 1) % MASTHEADS.length];
      const issue = visits + 1, price = K.dailyPick(PRICES, 5), mug = K.dailyPick(MUGS, 9), shadeCol = K.dailyPick(SHADES, 11);
      const nRush = clamp([2, 3, 4][inten] - (care ? 1 : 0) + (visits >= 2 && !care ? 1 : 0), 1, 5);
      const rushWords = K.shuffle(care ? RUSH.care : RUSH.normal, K.rng(K.daily() * 7 + 3)).slice(0, nRush);
      const SOFT = softwareGfx();
      const nTrue = story.claims.filter(c => c.kind === 'camera').length, nUnv = story.claims.length - nTrue;

      /* ---------------- state ---------------- */
      const st = { phase: 'intro', vol: 1, stamped: 0, slotI: -1, spiked: 0, regs: [], drag: null, finished: false, scene: 'desk', press: 0, shake: 0, flash: 0,
        runT: 0, dawnT: 0, rush: [], thrown: [], copies: 0, doneT: 0 };
      const G = { W: 0, H: 0, phone: true, u: 1, page: null, final: null };
      const P = K.particles({ max: 360 });
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1.25 : 2 });

      /* ---------------- DOM: the front page, the type tray, the spike, the press lever ---------------- */
      const hudName = h('b', { text: 'The Daily Spiral' }), hudIssue = h('em', { text: 'No. ' + issue + ' · late edition' });
      const pill = h('span', { class: 'hd-pill' }, hudName, hudIssue);
      const volEl = h('span', { class: 'hd-vol', role: 'meter', 'aria-label': 'How loud the front page is', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '100' }, h('span', { text: 'Volume' }), h('i'));
      const hud = h('div', { class: 'hd-hud' }, pill, volEl);
      const page = h('article', { class: 'hd-page', 'aria-label': 'Tonight’s front page' });
      const mastEl = h('div', { class: 'hd-mast', 'aria-hidden': 'true' }, h('div', { class: 'hd-mast-tab', text: 'The Daily Spiral' }), h('div', { class: 'hd-mast-sob', text: mast }));
      const folio = h('div', { class: 'hd-folio' }, h('span', { text: 'No. ' + issue + ' · Late ed.' }), h('span', { text: 'Price: ' + price }));
      const kickRow = h('div', { class: 'hd-kick' });
      const head = h('h2', { class: 'hd-head' });
      const deck = h('div', { class: 'hd-deck', text: care ? 'Full story below' : K.dailyPick(['Insiders certain · Full story below', 'Experts (your brain) agree · Full story below', 'Sources: it’s the end · Full story below'], 13) });
      const claimsEl = h('div', { class: 'hd-claims', role: 'list', 'aria-label': 'Claims to fact-check' });
      page.append(mastEl, folio, kickRow, head, deck, claimsEl);
      const slots = story.slots.map(s => Object.assign({ done: false, chosen: null, el: null }, s));
      const mkSlot = (sl) => (sl.el = h('span', { class: 'hd-slot loud', 'data-k': sl.key, text: sl.loud }));
      kickRow.append(mkSlot(slots[0]));
      const punct = { done: false, el: h('span', { class: 'hd-slot loud', role: 'button', tabindex: '-1', 'aria-label': 'Three exclamation marks: drag them onto the spike', text: story.punct }) };
      head.append(h('span', { class: 'hd-fix', text: STORY.cap(story.event) }), ' ', mkSlot(slots[1]), h('span', { class: 'hd-fix', text: ';' }), ' ', mkSlot(slots[2]), punct.el);
      if (story.practice) claimsEl.append(h('div', { class: 'hd-q', style: { fontStyle: 'normal', font: '700 12px/1.2 ' + TYPE, letterSpacing: '.06em' }, text: 'PRACTICE PAGE · AN EXAMPLE STORY' }));
      const claims = story.claims.map((c, i) => {
        const q = h('div', { class: 'hd-q' + (c.own ? ' gk-user' : ''), text: c.own ? '“' + c.text + '”' : c.text });
        const sbox = h('div', { class: 'hd-sbox', text: 'FACT-CHECK' });
        const btn = h('button', { type: 'button', class: 'hd-claim', role: 'listitem', 'aria-label': 'Fact-check this claim: ' + c.text }, q, sbox);
        const o = Object.assign({ btn, sbox, stamped: false, i }, c);
        K.tap(btn, () => stamp(o));
        claimsEl.append(btn);
        return o;
      });
      const tray = h('div', { class: 'hd-tray off', role: 'group', 'aria-label': 'Sober type', 'data-label': 'SOBER TYPE' });
      const spike = h('div', { class: 'hd-spike', 'aria-hidden': 'true' }, h('div', { class: 'hd-needle' }), h('div', { class: 'hd-base' }), h('b', { text: 'SPIKE' }));
      const lever = h('button', { type: 'button', class: 'hd-lever', 'aria-label': 'Press lever: press and hold to print', html: '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" pathLength="100"/></svg>' }, h('div', { class: 'hd-arm' }), h('div', { class: 'hd-hub' }));
      const press = h('div', { class: 'hd-press off' }, lever, h('b', { text: 'HOLD TO PRINT' }));
      const counter = h('div', { class: 'hd-count', hidden: true });
      const sr = h('div', { class: 'hd-sr', role: 'status', 'aria-live': 'polite' });
      el.append(page, tray, spike, press, hud, counter, sr);
      const csz = K.phone() ? 74 : 96;
      const glitch = K.character('glitch', { side: 'right', mood: 'coffee', size: csz });
      const rush = K.character('rush', { side: 'left', mood: 'speed', size: csz });
      rush.el.classList.add('hd-right');
      const speak = (c, line, o) => { (c === glitch ? rush : glitch).hush(); return c.say(line, o); };
      const setVol = (v) => { st.vol = clamp(v, 0, 1); volEl.style.setProperty('--vol', st.vol.toFixed(3)); volEl.setAttribute('aria-valuenow', String(Math.round(st.vol * 100))); };
      setVol(1);

      /* ---------------- sound: a wire room at deadline that calms as the page does ---------------- */
      const amb = K.ambience('room'); amb.level(0.4, 1.5);
      let motor = null, dawnAmb = null;
      function beds() { if (!A.ctx || motor) return; motor = A.loop({ pink: true, filter: 'bandpass', freq: 150, q: 1.1 }); S.onDestroy(() => motor && motor.stop()); }
      beds(); S.on('audio-ready', beds);
      const TENSE = [['D2', ['F4', 'A4', 'D5']], ['A#1', ['F4', 'A#4', 'D5']], ['G1', ['G4', 'A#4', 'D5']], ['A1', ['E4', 'A4', 'C#5']]];
      const CALM = [['D2', ['F#4', 'A4', 'C#5', 'E5']], ['B1', ['F#4', 'A4', 'D5']], ['G1', ['G4', 'B4', 'D5', 'F#5']], ['A1', ['E4', 'A4', 'C#5']]];
      const R = K.rhythm({ bpm: 92, onBeat: (t, i, b) => beat(t, i, b) });
      function beat(t, i, b) {
        if (!A.ctx || S.destroyed || st.finished) return;
        const spb = 60 / R.bpm;
        if (st.scene === 'press') { // the press: a heavy chug and a bright clank, every beat
          A.drum(t, 0.3, 0.5, 0); A.noise({ when: t + 0.02, filter: 'lowpass', freq: 420, dur: 0.12, vol: 0.12 }); A.tone({ when: t + spb / 2, type: 'square', freq: 1350, dur: 0.03, vol: 0.022, lp: 3200 });
          if (b === 0) A.noise({ when: t, pink: true, filter: 'bandpass', freq: 900, q: 0.6, dur: spb * 0.9, attack: 0.05, vol: 0.05 });
          return;
        }
        const calm = 1 - st.vol, bar = Math.floor(i / 4) % 4, prog = st.scene === 'dawn' || calm > 0.55 ? CALM : TENSE, chord = prog[bar][1], bass = prog[bar][0];
        if (st.scene === 'dawn') { if (b === 0) A.pad(chord.map(n => A.note(n)), { when: t, dur: spb * 4.2, vol: 0.07, attack: 0.6 }); return; }
        if (b === 0 || b === 2) A.pluck(A.note(bass) * (b === 2 ? 1.5 : 1), { when: t, vol: 0.2, damp: 0.993, lp: 650, bus: 'music' });
        if (b === 0) chord.forEach((n, k) => A.tone({ when: t + k * 0.012, type: 'triangle', freq: A.note(n), dur: spb * 4, vol: 0.011 + calm * 0.02, attack: 0.4, lp: 1600, verb: 0.4, bus: 'music' }));
        for (let s = 0; s < 4; s++) if (Math.random() < st.vol * 0.55) A.noise({ when: t + s * spb / 4, filter: 'highpass', freq: 4200 + Math.random() * 2000, dur: 0.012, vol: 0.016 + st.vol * 0.02, bus: 'music' }); // the wire chatters while it's loud
        if (calm > 0.5 && b % 2 === 1) A.brush(t, 0.03 * calm, 0.18);
        if (st.press > 0.02) { A.drum(t, 0.1 + st.press * 0.28, 0.5, 0); A.tone({ when: t + spb / 2, type: 'square', freq: 1300, dur: 0.03, vol: 0.012 + st.press * 0.02, lp: 3000 }); }
        if (st.vol > 0.7 && i % 16 === 0 && st.phase !== 'intro') [0, 0.11, 0.22].forEach((o, k) => A.tone({ when: t + o, type: 'square', freq: A.note(['A5', 'A5', 'D6'][k]), dur: 0.08, vol: 0.02, lp: 2400, bus: 'music' })); // a tabloid bulletin sting
      }
      function sTypeburst(n) { K.sfx.tap(); if (!A.ctx) return; const t = A.now(); for (let i = 0; i < n; i++) A.typeKey({ when: t + i * (0.045 + Math.random() * 0.03), vol: 0.05 + Math.random() * 0.04 }); A.tone({ when: t + n * 0.062 + 0.05, type: 'sine', freq: 1900, dur: 0.22, vol: 0.03 }); }
      function sClack() { K.sfx.lock(); if (A.ctx) { const t = A.now(); A.wood(t, 0.22, 1.7); A.noise({ when: t + 0.02, filter: 'highpass', freq: 5000, dur: 0.02, vol: 0.08 }); } }
      function sPick() { K.sfx.pop(undefined, 700); if (A.ctx) A.wood(undefined, 0.1, 2.3); }
      function sStamp(kind) { K.sfx.thud(); if (!A.ctx) return; const t = A.now(); A.noise({ when: t, filter: 'bandpass', freq: 820, q: 0.9, dur: 0.07, vol: 0.26 }); if (kind === 'true') A.chime(A.note('E6'), { when: t + 0.06, vol: 0.06, dur: 1 }); else A.tone({ when: t + 0.05, type: 'sawtooth', freq: 112, to: 92, dur: 0.22, vol: 0.045, lp: 700 }); }
      function sSpike() { K.sfx.paper(); if (!A.ctx) return; const t = A.now(); A.noise({ when: t, filter: 'highpass', freq: 2600, dur: 0.06, vol: 0.2 }); A.tone({ when: t + 0.03, type: 'triangle', freq: 1250, to: 900, glide: 0.1, dur: 0.25, vol: 0.05 }); A.thud({ when: t + 0.02, vol: 0.16 }); }
      function sSlap() { K.sfx.whoosh(); if (A.ctx) { const t = A.now(); A.noise({ when: t + 0.08, filter: 'lowpass', freq: 700, dur: 0.14, vol: 0.32 }); A.noise({ when: t + 0.08, filter: 'highpass', freq: 3000, dur: 0.05, vol: 0.12 }); } }
      function sSlam() { K.sfx.thud(); if (!A.ctx) return; const t = A.now(); A.thud({ when: t, vol: 0.7 }); A.noise({ when: t, pink: true, filter: 'lowpass', freq: 260, dur: 0.9, attack: 0.01, vol: 0.45 }); A.noise({ when: t, filter: 'highpass', freq: 2400, dur: 0.12, vol: 0.2 }); [0, 0.32].forEach(o => A.chime(A.note('C6'), { when: t + 0.12 + o, vol: 0.08, dur: 1.4 })); }

      /* ---------------- layout ---------------- */
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        G.W = W; G.H = H; G.phone = W < 700; G.u = G.phone ? clamp(W / 390, 0.86, 1.2) : clamp(H / 860, 0.8, 1.25);
        const top = 104, chars = G.phone ? 96 : 122;
        if (G.phone) {
          const pw = W - 24;
          Object.assign(page.style, { left: '12px', top: top + 'px', width: pw + 'px' });
          fitHead(H - top - chars - 112);
          const ph = page.offsetHeight, sw = 78, ty = top + ph + 22;
          G.page = { x: 12, y: top, w: pw, h: ph };
          Object.assign(tray.style, { left: '12px', top: ty + 'px', width: (W - 24 - sw - 10) + 'px' });
          Object.assign(spike.style, { left: (W - 12 - sw) + 'px', top: (ty - 56) + 'px' });
          Object.assign(press.style, { left: Math.round(W / 2 - 80) + 'px', width: '160px', top: Math.round(Math.min(ty + 4, H - chars - 176)) + 'px' });
        } else {
          const pw = Math.min(640, Math.round(W * 0.5)), px = Math.round((W - pw) / 2);
          Object.assign(page.style, { left: px + 'px', top: top + 'px', width: pw + 'px' });
          fitHead(H - top - chars - 110);
          const ph = page.offsetHeight, tw = Math.min(500, pw - 60), ty = top + ph + 26;
          G.page = { x: px, y: top, w: pw, h: ph };
          Object.assign(tray.style, { left: Math.round((W - tw) / 2) + 'px', top: ty + 'px', width: tw + 'px' });
          Object.assign(spike.style, { left: (px + pw + 46) + 'px', top: (top + ph - 140) + 'px' });
          Object.assign(press.style, { left: Math.round(W / 2 - 80) + 'px', width: '160px', top: Math.round(Math.min(ty, H - chars - 170)) + 'px' });
        }
        deskKey = ''; hallKey = ''; skyKey = '';
        if (finalEl) placeFinal();
      }
      function fitHead(maxH) {
        let hs = 1; page.style.setProperty('--hs', '1');
        for (let i = 0; i < 6 && page.offsetHeight > maxH; i++) { hs -= 0.07; page.style.setProperty('--hs', hs.toFixed(2)); }
      }

      /* ---------------- drag: a ghost of the type follows the finger ---------------- */
      function dragBind(src, o) {
        K.drag(src, {
          space: el,
          start: (p) => {
            if (st.drag || !o.can()) return false;
            const r = K.rectIn(src), cs = getComputedStyle(src);
            const ghost = src.cloneNode(true); ghost.classList.add('hd-ghost'); ghost.classList.remove('target', 'lift', 'set'); ['tabindex', 'role', 'aria-label'].forEach(a => ghost.removeAttribute(a));
            Object.assign(ghost.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', font: cs.font, textTransform: cs.textTransform, letterSpacing: cs.letterSpacing, lineHeight: (r.h) + 'px', padding: cs.padding, display: 'block', whiteSpace: 'nowrap', textAlign: 'center' });
            el.append(ghost); src.classList.add('lift');
            st.drag = { src, ghost, o, ox: p.x - r.x, oy: p.y - r.y, r, hot: null, tg: o.targets().map(t => Object.assign({ rr: K.rectIn(t.el) }, t)) };
            sPick(); K.guide(null);
          },
          move: (p) => {
            const d = st.drag; if (!d || d.src !== src) return;
            d.ghost.style.left = (p.x - d.ox) + 'px'; d.ghost.style.top = (p.y - d.oy) + 'px';
            const hit = hitOf(d, p);
            if ((hit && hit.el) !== d.hot) { if (d.hot) d.hot.classList.remove('hover'); d.hot = hit && hit.el; if (d.hot) { d.hot.classList.add('hover'); if (A.ctx) A.tone({ type: 'sine', freq: 1500, dur: 0.06, vol: 0.025 }); } }
          },
          end: (p) => {
            const d = st.drag; if (!d || d.src !== src) return; st.drag = null;
            if (d.hot) d.hot.classList.remove('hover');
            const hit = hitOf(d, p);
            if (hit) { d.ghost.remove(); src.classList.remove('lift'); o.drop(hit, clamp(1 - hit.d / hit.reach, 0, 1)); return; }
            K.sfx.soft();
            Object.assign(d.ghost.style, { transition: 'left .3s cubic-bezier(.2,1.3,.4,1), top .3s cubic-bezier(.2,1.3,.4,1)', left: d.r.x + 'px', top: d.r.y + 'px' });
            S.later(() => { d.ghost.remove(); src.classList.remove('lift'); }, 320);
            if (o.miss) o.miss();
          }
        });
      }
      function hitOf(d, p) {
        const cx = p.x - d.ox + d.r.w / 2, cy = p.y - d.oy + d.r.h / 2;
        let best = null;
        d.tg.forEach(t => { const rr = t.rr, reach = t.kind === 'spike' ? 96 : Math.max(64, Math.min(rr.w, 240) * 0.6 + 26), dd = Math.hypot(cx - rr.cx, cy - (t.kind === 'spike' ? rr.y + rr.h * 0.42 : rr.cy)); if (dd < reach && (!best || dd < best.d)) best = { el: t.el, d: dd, reach, t }; });
        return best;
      }
      /* a loud word leaves the page and lands on the spike */
      function flyToSpike(src, label, cls) {
        const r = K.rectIn(src), sp = K.rectIn(spike), cs = getComputedStyle(src);
        const f = h('span', { class: (cls || 'hd-slot loud') + ' hd-fly', text: src.textContent });
        Object.assign(f.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', font: cs.font, textTransform: cs.textTransform, letterSpacing: cs.letterSpacing, lineHeight: r.h + 'px', textAlign: 'center', whiteSpace: 'nowrap', animation: 'none', display: 'block', padding: '0' });
        el.append(f);
        S.later(() => Object.assign(f.style, { left: (sp.cx - r.w / 2) + 'px', top: (sp.y + 34 - r.h / 2) + 'px', transform: 'scale(.42) rotate(' + (Math.random() * 50 - 25).toFixed(1) + 'deg)', opacity: '.85' }), 24);
        S.later(() => { f.remove(); impale(label); }, 470);
      }
      function impale(label) {
        st.spiked++;
        const n = spike.querySelectorAll('.hd-imp').length;
        const t = h('span', { class: 'hd-imp', text: label.length > 16 ? label.slice(0, 15) + '…' : label, style: { '--r': (Math.random() * 44 - 22).toFixed(1) + 'deg', bottom: (24 + Math.min(n, 9) * 9) + 'px' } });
        spike.append(t);
        sSpike(); if (!K.reduced()) st.shake = Math.max(st.shake, 0.35);
        const sp = K.rectIn(spike); P.emit('spark', sp.cx, sp.y + 46, 7, { colors: ['#fff6d0', '#ffd27a'], speed: [60, 170] });
      }

      /* ---------------- 1. fact-check: tap each claim, the stamp follows the reading ---------------- */
      function nextClaim() { return claims.find(c => !c.stamped); }
      function checkGuide(quick) {
        const c = nextClaim(); claims.forEach(x => x.btn.classList.toggle('next', x === c)); if (!c) return;
        K.guide({ id: 'stamp', g: 'tap', target: c.sbox, label: st.stamped ? 'STAMP THE NEXT ONE' : 'TAP TO FACT-CHECK', place: 'above', delay: quick ? 600 : 900 });
      }
      function stamp(c) {
        if (st.phase !== 'check' || c.stamped) return;
        c.stamped = true; st.stamped++; K.guide(null); K.sfx.whoosh();
        c.btn.classList.remove('next'); c.btn.classList.add('done'); c.btn.setAttribute('disabled', '');
        const kind = c.kind === 'camera' ? 'true' : 'unv', r = K.rectIn(c.sbox);
        const tool = h('div', { class: 'hd-stamper', style: { '--ink': kind === 'true' ? '#1c7346' : '#c62a2f' } });
        Object.assign(tool.style, { left: (r.cx - 28) + 'px', top: (r.cy - 58) + 'px', transform: 'translateY(-50px)', opacity: '0' });
        el.append(tool);
        S.later(() => { tool.style.opacity = '1'; tool.style.transform = 'translateY(0)'; }, 20);
        S.later(() => {
          c.sbox.textContent = '';
          c.sbox.append(h('div', { class: 'hd-mark ' + kind }, h('span', { text: kind === 'true' ? 'TRUE' : 'UNVERIFIED' }), h('small', { text: kind === 'true' ? 'on record' : story.strong ? 'real concern' : 'not on camera' })));
          sStamp(kind); P.emit('drop', r.cx, r.cy, 9, { colors: [kind === 'true' ? '#1c7346' : '#c62a2f'], speed: [40, 130] });
          if (!K.reduced()) st.shake = 0.55;
          Object.assign(tool.style, { transition: 'transform .32s cubic-bezier(.2,1,.4,1), opacity .3s ease', transform: 'translateY(-64px) rotate(9deg)', opacity: '0' });
          S.later(() => tool.remove(), 380);
          sr.textContent = (kind === 'true' ? 'Stamped true: ' : 'Stamped unverified: ') + c.text;
          ctx.track('stamp', { k: kind === 'true' ? 1 : 0 });
          const first = st.stamped === 1;
          if (kind === 'true' && (first || !claims.some(x => x.stamped && x !== c && x.kind === 'camera'))) speak(glitch, L(LINES.stampTrue), { mood: 'nerd', ms: 2600 });
          else if (kind === 'unv') speak(glitch, L(care ? LINES.stampUnvCare : story.strong ? LINES.stampUnvStrong : LINES.stampUnv), { mood: care || story.strong ? 'think' : 'smug', ms: 3200 });
          if (nextClaim()) checkGuide(true);
          else { claims.forEach(x => x.btn.classList.remove('next')); S.later(startSwaps, 1600); }
        }, 150);
      }

      /* ---------------- 2. typeset: drag sober type over each loud word ---------------- */
      const ROLE = { kick: 'KICKER', vp: 'HEADLINE', tail: 'ENDING' };
      function startSwaps() {
        st.phase = 'swap';
        speak(glitch, L(LINES.swapHow), { mood: 'coffee', ms: 3600 });
        nextSlot();
      }
      function nextSlot() {
        st.slotI++;
        const sl = slots[st.slotI];
        slots.forEach(x => x.el.classList.toggle('target', x === sl));
        if (!sl) { bangStart(); return; }
        tray.replaceChildren(); tray.setAttribute('data-label', 'SOBER TYPE · ' + ROLE[sl.key]);
        sl.tiles = sl.sober.map(w => {
          const b = h('button', { type: 'button', class: 'hd-tile', 'aria-label': 'Set “' + w + '” in place of “' + sl.loud + '”', text: w });
          tray.append(b);
          const tile = { el: b, word: w };
          dragBind(b, { can: () => st.phase === 'swap' && slots[st.slotI] === sl && !sl.done, targets: () => [{ el: sl.el, kind: 'slot' }], drop: (hit, pr) => place(sl, tile, pr), miss: () => swapGuide(sl, true) });
          S.listen(b, 'keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && st.phase === 'swap' && slots[st.slotI] === sl && !sl.done) { e.preventDefault(); place(sl, tile, 0.8); } });
          return tile;
        });
        tray.classList.remove('off');
        swapGuide(sl);
      }
      function swapGuide(sl, quick) {
        const t = sl.tiles && sl.tiles[0]; if (!t || sl.done) return;
        const a = K.rectIn(t.el), b = K.rectIn(sl.el);
        K.guide({ id: 'swap', g: 'drag', target: t.el, dx: b.cx - a.cx, dy: b.cy - a.cy, label: st.slotI ? 'DRAG IN THE SOBER WORD' : 'DRAG ONTO THE LOUD WORD', place: 'below', delay: quick ? 700 : 1100, ms: 1700 });
      }
      function place(sl, tile, pr) {
        if (sl.done) return; sl.done = true; sl.chosen = tile.word; st.regs.push(pr);
        K.guide(null);
        flyToSpike(sl.el, sl.loud);
        sl.el.className = 'hd-slot sober set'; sl.el.textContent = tile.word; sl.el.removeAttribute('data-k');
        tile.el.classList.add('lift'); tray.classList.add('off');
        sClack(); sTypeburst(Math.min(9, 3 + tile.word.length / 2));
        S.later(() => { const r = K.rectIn(sl.el); P.emit('dust', r.cx, r.cy, 7, { colors: ['rgba(40,30,20,.35)'], speed: [20, 60] }); }, 30);
        setVol(st.vol - (inten === 0 ? 0.25 : 0.22));
        if (pr > 0.85) K.pop('CLEAN SET', { x: clamp(K.rectIn(sl.el).cx, 80, G.W - 80), y: G.page.y + G.page.h + 8, kind: 'great' });
        ctx.track('swap', { s: st.slotI, p: Math.round(pr * 100) });
        const n = st.slotI;
        if (n === 0) speak(rush, L(care ? LINES.swap1Care : LINES.swap1, { W: sl.loud.replace(/!+$/, '').toUpperCase() }), { mood: care ? 'think' : 'sad', ms: 2800 });
        else if (n === 1) speak(glitch, L(LINES.swap2), { mood: 'happy', ms: 2600 });
        else speak(rush, L(care ? LINES.swap3Care : LINES.swap3, { K: tile.word }), { mood: care ? 'calm' : 'fume', ms: 2800 });
        sr.textContent = 'Headline now: ' + headlineNow();
        S.later(nextSlot, 1000);
      }
      const headlineNow = () => STORY.cap(story.event) + ' ' + (slots[1].chosen || slots[1].loud) + '; ' + (slots[2].chosen || slots[2].loud) + (punct.done ? '' : '!!!');

      /* ---------------- 3. the exclamation marks go on the spike ---------------- */
      function bangStart() {
        st.phase = 'bang'; tray.replaceChildren();
        punct.el.classList.add('target', 'drag'); punct.el.setAttribute('tabindex', '0');
        speak(glitch, L(LINES.bang), { mood: 'smug', ms: 3200 });
        bangGuide();
      }
      function bangGuide(quick) {
        if (st.phase !== 'bang') return;
        const a = K.rectIn(punct.el), b = K.rectIn(spike);
        K.guide({ id: 'bang', g: 'drag', target: punct.el, dx: b.cx - a.cx, dy: b.y + b.h * 0.4 - a.cy, label: 'SPIKE THE !!!', place: 'above', delay: quick ? 700 : 1000, ms: 1700 });
      }
      dragBind(punct.el, { can: () => st.phase === 'bang', targets: () => [{ el: spike, kind: 'spike' }], drop: (hit, pr) => spikePunct(pr), miss: () => bangGuide(true) });
      S.listen(punct.el, 'keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && st.phase === 'bang') { e.preventDefault(); spikePunct(0.8); } });
      function spikePunct(pr) {
        if (punct.done) return; punct.done = true; st.regs.push(pr); K.guide(null);
        flyToSpike(punct.el, story.punct);
        punct.el.classList.add('spiked'); punct.el.classList.remove('target');
        setVol(st.vol - 0.12);
        speak(rush, L(care ? LINES.bangDoneCare : LINES.bangDone), { mood: care ? 'calm' : 'panic', ms: 2600 });
        sr.textContent = 'Headline now: ' + headlineNow();
        st.phase = 'rushIn';
        S.later(rushStart, 1900);
      }

      /* ---------------- 4. the twist: the sub-editor wants it louder; you hold the line ---------------- */
      function rushStart() {
        speak(rush, L(care ? LINES.rushInCare : LINES.rushIn), { mood: care ? 'think' : 'determined', ms: 3800 });
        rush.react('bounce');
        const hr = K.rectIn(head);
        rushWords.forEach((w, i) => S.later(() => {
          const e = h('button', { type: 'button', class: 'hd-rt', 'aria-label': 'Click-bait: “' + w + '”. Drag it onto the spike', text: w, style: { '--r': ((i % 2 ? 1 : -1) * (4 + (i * 3) % 7)) + 'deg' } });
          el.append(e);
          const ew = e.offsetWidth || 160, eh = e.offsetHeight || 34;
          const cx = hr.x + hr.w * [0.3, 0.68, 0.45, 0.22, 0.75][i % 5], cy = hr.y + hr.h * [0.22, 0.62, 0.95, 0.75, 0.3][i % 5];
          Object.assign(e.style, { left: Math.round(clamp(cx - ew / 2, 8, G.W - ew - 8)) + 'px', top: Math.round(clamp(cy - eh / 2, 70, G.H - eh - 110)) + 'px' });
          const rt = { el: e, word: w, done: false }; st.rush.push(rt);
          dragBind(e, { can: () => st.phase === 'rush' && !rt.done, targets: () => [{ el: spike, kind: 'spike' }], drop: (hit, pr) => spikeRush(rt, pr), miss: () => rushGuide(true) });
          S.listen(e, 'keydown', (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && st.phase === 'rush' && !rt.done) { ev.preventDefault(); spikeRush(rt, 0.8); } });
          sSlap(); setVol(st.vol + 0.14); if (!K.reduced()) st.shake = 0.8;
          if (i === rushWords.length - 1) S.later(() => { st.phase = 'rush'; speak(glitch, L(LINES.holdLine), { mood: 'determined', ms: 3000 }); rushGuide(); }, 450);
        }, 1100 + i * 480));
      }
      function rushGuide(quick) {
        if (st.phase !== 'rush') return;
        const rt = st.rush.find(x => !x.done); if (!rt) return;
        const a = K.rectIn(rt.el), b = K.rectIn(spike);
        K.guide({ id: 'rush', g: 'drag', target: rt.el, dx: b.cx - a.cx, dy: b.y + b.h * 0.4 - a.cy, label: 'SPIKE IT', place: 'above', delay: quick ? 650 : 900, ms: 1500 });
      }
      function spikeRush(rt, pr) {
        if (rt.done) return; rt.done = true; st.regs.push(pr); K.guide(null);
        flyToSpike(rt.el, rt.word, 'hd-rt'); rt.el.remove();
        setVol(st.vol - 0.15);
        const left = st.rush.filter(x => !x.done).length, k = st.rush.length - left;
        ctx.track('spike', { n: k });
        if (left) {
          speak(rush, L(care ? LINES.rushNCare : k === 1 ? LINES.rush1 : LINES.rush2, { W: rt.word.replace(/!+$/, '').toUpperCase() }), { mood: care ? 'calm' : k === 1 ? 'panic' : 'sad', ms: 2400 });
          rushGuide(true);
        } else {
          st.phase = 'flipIn'; setVol(0.06);
          speak(rush, L(care ? LINES.rushDoneCare : LINES.rushDone), { mood: 'happy', ms: 3000 });
          S.later(() => speak(glitch, L(LINES.glitchDone), { mood: 'cool', ms: 2600 }), 2600);
          S.later(flip, 3000);
        }
      }

      /* ---------------- 5. the masthead turns over; then the press ---------------- */
      function flip() {
        st.phase = 'flip';
        head.classList.add('retype'); sTypeburst(12);
        S.later(() => {
          page.classList.add('calm'); head.classList.remove('retype'); pill.classList.add('calm'); hudName.textContent = mast; hudIssue.textContent = 'No. ' + issue + ' · first edition';
          deck.textContent = 'Fact-checked: ' + nTrue + ' on record · ' + nUnv + ' unverified';
          setVol(0); K.sfx.great();
          layout();
          const r = K.rectIn(mastEl); P.emit('star', r.cx, r.cy, 14, { colors: ['#fff6d6', '#ffd98a'], speed: [40, 140] });
          speak(glitch, L(LINES.flip, { M: mast }), { mood: 'happy', ms: 3200 });
          sr.textContent = mast + '. ' + (slots[0].chosen || '') + '. ' + headlineNow();
        }, 240);
        S.later(pressStart, 2800);
      }
      const HOLD = [2200, 1800, 1500][inten];
      function pressStart() {
        st.phase = 'press';
        press.classList.remove('off');
        speak(rush, L(LINES.press), { mood: 'speed', ms: 3200 });
        pressGuide(false);
      }
      function pressGuide(quick) { if (st.phase === 'press') K.guide({ id: 'press', g: 'hold', target: lever, label: 'HOLD TO PRINT', ms: HOLD + 300, place: 'above', delay: quick ? 500 : 900 }); }
      K.hold(lever, {
        ms: HOLD, still: 34, decay: 1.6,
        start: () => { if (st.phase !== 'press') return; K.sfx.tap(); if (A.ctx) A.tone({ type: 'sine', freq: 90, to: 160, glide: HOLD / 1000, dur: HOLD / 1000, vol: 0.05, lp: 500 }); },
        progress: (k) => {
          if (st.phase !== 'press') return;
          st.press = k; lever.style.setProperty('--p', k.toFixed(3));
          if (motor && A.ctx) { motor.level(k > 0.01 ? 0.05 + k * 0.3 : 0.0001, 0.08); motor.freq(120 + k * 280, 0.1); }
          R.set(92 + k * 80);
        },
        done: () => { if (st.phase === 'press') slam(); },
        cancel: () => { if (st.phase === 'press') { R.set(92); pressGuide(true); } }
      });

      /* ---------------- finale: the run, then dawn on the doorsteps ---------------- */
      function slam() {
        st.phase = 'run'; K.guide(null); st.press = 1;
        sSlam(); st.flash = 1; if (!K.reduced()) st.shake = 2.2;
        [hud, press, tray].forEach(x => x.classList.add(x === hud ? 'out' : 'off')); spike.classList.add('out'); page.classList.add('gone');
        st.scene = 'press'; st.runT = now(); R.set(156);
        if (motor && A.ctx) { motor.level(0.32, 0.2); motor.freq(420, 0.4); }
        counter.hidden = false; counter.textContent = 'PRINTING · 0 COPIES';
        K.finale('confetti', { from: [{ x: G.W / 2, y: G.H * 0.36 }], colors: ['#f6f1e3', '#e9e2cf', '#d8d0bb', '#1b1813', '#d1262d', '#1d3758'], chord: ['D4', 'F#4', 'A4', 'D5'], ms: 2200 });
        speak(rush, L(LINES.slam), { mood: 'celebrate', ms: 2800 });
        ctx.track('print', { reg: Math.round(regScore() * 100) });
        S.later(dawn, [3600, 3800, 4200][inten]);
      }
      function dawn() {
        st.scene = 'dawn'; st.dawnT = now(); counter.hidden = true; R.set(76);
        if (motor && A.ctx) motor.level(0.0001, 0.8);
        amb.level(0.04, 1.2); dawnAmb = K.ambience('dawn'); dawnAmb.level(0.7, 2.5);
        hud.classList.remove('out'); pill.classList.add('calm');
        speak(glitch, L(care ? LINES.dawnCare : serious ? LINES.dawnSerious : LINES.dawn), { mood: 'happy', ms: 0 });
        S.later(showFinal, 2300);
        S.later(() => { glitch.hush(); speak(rush, L(LINES.rushEnd), { mood: 'laugh', ms: 0 }); }, 4600);
        S.later(finishGame, 7600);
      }
      const regScore = () => (st.regs.length ? st.regs.reduce((a, b) => a + b, 0) / st.regs.length : 0.75);
      let res = null;
      function results() {
        if (res) return res;
        const reg = regScore(), pct = Math.round(reg * 100), tier = K.tier(reg, [0.5, 0.7, 0.86]);
        res = { reg, pct, tier, best: K.best('registration', pct, 'higher'), col: K.collect(mast) };
        return res;
      }
      let finalEl = null;
      function showFinal() {
        const r0 = results();
        const sober = STORY.cap(story.event) + ' ' + (slots[1].chosen || slots[1].sober[0]) + '; ' + (slots[2].chosen || slots[2].sober[0]);
        finalEl = h('div', { class: 'hd-final', role: 'img', 'aria-label': mast + ': ' + sober },
          h('div', { class: 'hd-fm', text: mast }),
          h('div', { class: 'hd-ff' }, h('span', { text: 'No. ' + issue + ' · Dawn ed.' }), h('span', { text: 'Price: one deep breath' })),
          h('div', { class: 'hd-fh' }, h('span', { class: 'hd-fk', text: slots[0].chosen || slots[0].sober[0] }), sober),
          h('div', { class: 'hd-fd', text: 'Fact-checked: ' + nTrue + ' on record, ' + nUnv + ' unverified. ' + (serious ? 'Next step: a plan.' : 'Story still developing.') }),
          care ? h('div', { class: 'hd-fc', text: S.safety ? S.safety.CARE_LINE : 'Someone qualified can tell you exactly where you stand.' }) : null,
          h('div', { class: 'hd-fb' }, h('span', { text: (r0.tier ? r0.tier + ' press run' : 'Press run') + ' · ' + r0.pct + '% clean type' }), h('span', { text: 'Masthead ' + Math.min(r0.col.count, MASTHEADS.length) + '/' + MASTHEADS.length }), h('span', { text: 'Tomorrow: ' + nextMast })));
        el.append(finalEl); placeFinal();
        if (A.ctx) { const t = A.now(); A.noise({ when: t + 0.42, filter: 'lowpass', freq: 600, dur: 0.16, vol: 0.34 }); A.paper({ when: t + 0.44, vol: 0.16 }); }
        K.sfx.whoosh();
        S.later(() => { if (!G.final) return; P.emit('dust', G.final.x + G.final.w / 2, G.final.y + G.final.h, 16, { colors: ['rgba(255,240,215,.6)'], speed: [30, 110] }); }, 520);
        sr.textContent = 'On the doorstep: ' + mast + '. ' + sober + '.';
      }
      function placeFinal() {
        const W = G.W, H = G.H, fw = G.phone ? W - 32 : Math.min(560, W * 0.46), chars = G.phone ? 104 : 128;
        Object.assign(finalEl.style, { left: Math.round((W - fw) / 2) + 'px', width: Math.round(fw) + 'px', top: '0px' });
        const fh = finalEl.offsetHeight, y = Math.round(Math.max(G.phone ? H * 0.34 : H * 0.3, H - chars - fh - 8));
        finalEl.style.top = y + 'px';
        G.final = { x: (W - fw) / 2, y, w: fw, h: fh };
      }
      function finishGame() {
        if (st.finished) return; st.finished = true; st.phase = 'done'; st.doneT = now();
        const r0 = results(), badges = [];
        if (r0.best.isNew) badges.push('New best: ' + r0.pct + '% clean type'); else if (r0.best.first) badges.push('Clean type: ' + r0.pct + '%');
        if (r0.tier) badges.push(r0.tier + ' press run');
        if (r0.col.isNew) badges.push('Collected: ' + mast + ' (' + Math.min(r0.col.count, MASTHEADS.length) + '/' + MASTHEADS.length + ')');
        const sober = STORY.cap(story.event) + ' ' + (slots[1].chosen || slots[1].sober[0]) + '; ' + (slots[2].chosen || slots[2].sober[0]);
        ctx.track('done', { reg: r0.pct, spiked: st.spiked, t: nTrue, u: nUnv });
        ctx.finish({ title: serious ? 'Real news, told straight' : 'Printed calm and true', mood: 'happy',
          lines: ['Front page: “' + sober + '”', 'Fact-checked: ' + nTrue + ' true, ' + nUnv + ' unverified', 'Spiked ' + st.spiked + ' loud words'],
          share: 'Turned a “DOOMED!!!” front page into a calm, true headline. Spiked ' + st.spiked + ' loud words.', badges: badges.slice(0, 4) });
      }

      /* ---------------- the world: one opaque canvas (desk, press hall, dawn street) ---------------- */
      const deskC = document.createElement('canvas'), hallC = document.createElement('canvas'), skyC = document.createElement('canvas');
      let deskKey = '', hallKey = '', skyKey = '';
      const ctx2 = (c, W, H, dpr) => { c.width = Math.max(2, Math.round(W * dpr)); c.height = Math.max(2, Math.round(H * dpr)); const g = c.getContext('2d', { alpha: false }); g.setTransform(dpr, 0, 0, dpr, 0, 0); return g; };
      function renderDesk() {
        const W = G.W, H = G.H, br = bright(), dpr = Math.min(cv.dpr || 1, 1.5), u = G.u, g = ctx2(deskC, W, H, dpr), rr = K.rng(731);
        let gr = g.createLinearGradient(0, 0, W * 0.4, H); gr.addColorStop(0, br ? '#c5976a' : '#3d2819'); gr.addColorStop(1, br ? '#a3774c' : '#20140b'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        const plank = 70 * u;
        for (let y = -plank * 0.3, row = 0; y < H; y += plank, row++) {
          g.fillStyle = row % 2 ? (br ? 'rgba(255,238,205,.07)' : 'rgba(255,214,160,.03)') : (br ? 'rgba(90,50,20,.04)' : 'rgba(0,0,0,.06)'); g.fillRect(0, y, W, plank);
          for (let i = 0; i < 14; i++) {
            const yy = y + rr() * plank, a = 0.05 + rr() * 0.09, amp = 1 + rr() * 3.2, f = 0.004 + rr() * 0.012, ph = rr() * 10;
            g.strokeStyle = (br ? 'rgba(96,58,24,' : 'rgba(0,0,0,') + a.toFixed(3) + ')'; g.lineWidth = 0.6 + rr() * 1.3; g.beginPath();
            for (let x = -12; x <= W + 16; x += 16) { const yv = yy + Math.sin(x * f + ph) * amp; if (x === -12) g.moveTo(x, yv); else g.lineTo(x, yv); }
            g.stroke();
          }
          g.fillStyle = br ? 'rgba(70,40,14,.35)' : 'rgba(0,0,0,.6)'; g.fillRect(0, y + plank - 1.5, W, 1.5);
          g.fillStyle = br ? 'rgba(255,240,210,.25)' : 'rgba(255,220,170,.05)'; g.fillRect(0, y + plank, W, 1);
        }
        // light: the desk lamp's warm pool at night, the window's daylight in the morning
        const lx = br ? W * 0.9 : W * 0.1, ly = br ? -H * 0.06 : H * 0.08, LR = Math.max(W, H) * (G.phone ? 1.05 : 0.8);
        gr = g.createRadialGradient(lx, ly, 10, lx, ly, LR); gr.addColorStop(0, br ? 'rgba(255,252,236,.36)' : 'rgba(255,206,128,.30)'); gr.addColorStop(0.5, br ? 'rgba(255,246,222,.12)' : 'rgba(255,190,110,.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.save(); if (!br) g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
        if (!br) { // the green banker's-lamp shade, top left
          const sx = G.phone ? -14 * u : 30 * u, sy = G.phone ? 66 * u : 40 * u;
          g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(sx + 70 * u, sy + 26 * u, 92 * u, 30 * u, 0.1, 0, TAU); g.fill();
          gr = g.createLinearGradient(sx, sy - 20 * u, sx, sy + 30 * u); gr.addColorStop(0, mix(shadeCol, '#ffffff', 0.35)); gr.addColorStop(0.5, shadeCol); gr.addColorStop(1, mix(shadeCol, '#000000', 0.45));
          g.fillStyle = gr; g.beginPath(); g.ellipse(sx + 64 * u, sy, 84 * u, 26 * u, 0.06, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(sx + 50 * u, sy - 8 * u, 46 * u, 7 * u, 0.06, 0, TAU); g.fill();
          g.fillStyle = '#c9a35a'; g.fillRect(sx + 60 * u, sy + 18 * u, 8 * u, 26 * u);
        }
        const pg = G.page || { x: 12, y: 104, w: W - 24, h: 400 };
        // props around the page, never under the type tray or the characters
        const props = [];
        if (!G.phone) {
          props.push(() => drawMug(g, pg.x + pg.w + 104 * u, pg.y + 70 * u, 34 * u, br));
          props.push(() => drawArchive(g, Math.max(20 * u, pg.x - 230 * u), pg.y + 60 * u, Math.min(180 * u, pg.x - 40 * u), br));
          props.push(() => drawPencil(g, pg.x - 200 * u, pg.y + pg.h + 40 * u, 150 * u, -0.35, br));
          props.push(() => drawInkPad(g, pg.x - 170 * u, Math.max(pg.y + 340 * u, pg.y + pg.h - 90 * u), u, br));
          props.push(() => drawClip(g, pg.x + pg.w + 70 * u, pg.y + pg.h * 0.32, u));
        } else {
          props.push(() => drawPencil(g, W * 0.32, H - 128 * u, 120 * u, -0.18, br));
          props.push(() => drawClip(g, W * 0.72, H - 132 * u, u));
          props.push(() => drawRing(g, W * 0.56, H - 116 * u, 30 * u, br));
        }
        props.forEach(f => f());
        // the page's shadow on the desk
        g.fillStyle = 'rgba(0,0,0,' + (br ? 0.16 : 0.35) + ')'; g.fillRect(pg.x + 8, pg.y + 14, pg.w, pg.h);
        gr = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.45, Math.max(W, H) * 0.85); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, br ? 'rgba(60,35,15,.25)' : 'rgba(0,0,0,.6)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        deskKey = W + 'x' + H + (br ? 'b' : 'd') + dpr + ':' + (G.page ? G.page.h : 0);
      }
      function drawMug(g, x, y, r, br) {
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x + 6, y + 8, r * 1.05, r, 0, 0, TAU); g.fill();
        g.fillStyle = mug.body; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.strokeStyle = mug.band; g.lineWidth = r * 0.16; g.beginPath(); g.arc(x, y, r * 0.86, 0, TAU); g.stroke();
        g.fillStyle = mug.body; g.beginPath(); g.ellipse(x + r * 1.15, y, r * 0.32, r * 0.42, 0, 0, TAU); g.fill(); g.fillStyle = br ? '#a3774c' : '#2a1b10'; g.beginPath(); g.ellipse(x + r * 1.15, y, r * 0.14, r * 0.22, 0, 0, TAU); g.fill();
        const cg = g.createRadialGradient(x - r * 0.2, y - r * 0.2, 2, x, y, r * 0.72); cg.addColorStop(0, '#6b3f1d'); cg.addColorStop(1, '#2a160a'); g.fillStyle = cg; g.beginPath(); g.arc(x, y, r * 0.72, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,240,220,.25)'; g.beginPath(); g.ellipse(x - r * 0.25, y - r * 0.3, r * 0.22, r * 0.08, -0.6, 0, TAU); g.fill();
        G.mug = { x, y, r };
      }
      function drawRing(g, x, y, r, br) { g.strokeStyle = br ? 'rgba(90,50,20,.22)' : 'rgba(0,0,0,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, 0.3, TAU - 0.4); g.stroke(); g.lineWidth = 1.2; g.beginPath(); g.arc(x + 2, y + 1, r - 4, 1, TAU - 1.2); g.stroke(); }
      function drawPencil(g, x, y, len, ang, br) {
        g.save(); g.translate(x, y); g.rotate(ang);
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(4, 6, len, 9);
        g.fillStyle = '#e8b33a'; g.fillRect(0, 0, len * 0.84, 10); g.fillStyle = '#c99526'; g.fillRect(0, 6.5, len * 0.84, 3.5);
        g.fillStyle = '#d9b48a'; g.beginPath(); g.moveTo(len * 0.84, 0); g.lineTo(len, 5); g.lineTo(len * 0.84, 10); g.closePath(); g.fill();
        g.fillStyle = '#2b2b2b'; g.beginPath(); g.moveTo(len * 0.95, 3.4); g.lineTo(len, 5); g.lineTo(len * 0.95, 6.6); g.closePath(); g.fill();
        g.fillStyle = '#b8b8bd'; g.fillRect(-12, 0, 12, 10); g.fillStyle = '#e88a9a'; g.fillRect(-22, 0.5, 10, 9);
        g.restore(); void br;
      }
      function drawClip(g, x, y, u) { g.strokeStyle = '#c9ccd2'; g.lineWidth = 2 * u; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30 * u, y); g.arc(x + 30 * u, y + 5 * u, 5 * u, -Math.PI / 2, Math.PI / 2); g.lineTo(x + 4 * u, y + 10 * u); g.arc(x + 4 * u, y + 6 * u, 4 * u, Math.PI / 2, Math.PI * 1.5); g.lineTo(x + 26 * u, y + 2 * u); g.stroke(); }
      function drawInkPad(g, x, y, u, br) {
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 5, y + 7, 92 * u, 56 * u);
        g.fillStyle = '#2b2f36'; g.fillRect(x, y, 92 * u, 56 * u); g.fillStyle = '#1b3a5c'; g.fillRect(x + 6 * u, y + 6 * u, 80 * u, 44 * u);
        g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 6 * u, y + 6 * u, 80 * u, 6 * u);
        g.save(); g.translate(x + 120 * u, y + 20 * u); g.rotate(0.4); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-14 * u + 4, -22 * u + 6, 28 * u, 44 * u); g.fillStyle = '#7a4a24'; g.beginPath(); g.ellipse(0, -10 * u, 11 * u, 14 * u, 0, 0, TAU); g.fill(); g.fillStyle = '#2b2b2f'; g.fillRect(-15 * u, 6 * u, 30 * u, 14 * u); g.restore(); void br;
      }
      function drawArchive(g, x, y, w, br) {
        if (w < 90) return;
        const n = clamp(visits, 0, 9), hh = w * 1.25;
        for (let i = n; i >= 0; i--) {
          const ox = i * 3.5, oy = i * -4, rot = (i % 3 - 1) * 0.03;
          g.save(); g.translate(x + w / 2 + ox, y + hh / 2 + oy); g.rotate(rot - 0.04);
          g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(-w / 2 + 5, -hh / 2 + 7, w, hh);
          g.fillStyle = i ? mix('#ece4d0', '#c8bea6', 0.15 + (i % 2) * 0.1) : '#f1ebdc'; g.fillRect(-w / 2, -hh / 2, w, hh);
          if (!i) { // the top sheet: a past front page in miniature
            g.fillStyle = '#1b1813'; g.font = '400 ' + Math.round(w * 0.12) + 'px ' + MAST; g.textAlign = 'center'; g.fillText(n ? 'Archive' : 'First issue', 0, -hh / 2 + w * 0.16);
            g.fillRect(-w * 0.42, -hh / 2 + w * 0.2, w * 0.84, 1.5);
            for (let k = 0; k < 3; k++) g.fillRect(-w * 0.42, -hh / 2 + w * (0.28 + k * 0.08), w * (0.84 - k * 0.12), w * 0.045);
            g.fillStyle = 'rgba(27,24,19,.35)'; for (let k = 0; k < 9; k++) g.fillRect(-w * 0.42 + (k % 2) * w * 0.44, -hh / 2 + w * (0.6 + Math.floor(k / 2) * 0.07), w * 0.4, 2);
          }
          g.restore();
        }
        g.textAlign = 'center'; g.fillStyle = br ? 'rgba(50,30,12,.85)' : 'rgba(255,236,206,.78)'; g.font = '700 ' + Math.max(12, Math.round(12 * G.u)) + 'px ' + TYPE;
        g.fillText('ARCHIVE · ' + visits + ' FRONT PAGE' + (visits === 1 ? '' : 'S'), x + w / 2, y + hh + 26); g.textAlign = 'start';
      }

      /* the press hall: a four-high printing tower, the reel feeding the web, the folder spitting out copies */
      const cylSpr = new Map();
      function cylinder(r) {
        const key = Math.round(r); if (cylSpr.has(key)) return cylSpr.get(key);
        const c = document.createElement('canvas'), s = Math.ceil(r * 2 + 6); c.width = c.height = s * 2; const g = c.getContext('2d'); g.scale(2, 2);
        const gr = g.createRadialGradient(s / 2 - r * 0.35, s / 2 - r * 0.4, r * 0.1, s / 2, s / 2, r); gr.addColorStop(0, '#f2f4f7'); gr.addColorStop(0.45, '#9aa1ab'); gr.addColorStop(1, '#3c424a');
        g.fillStyle = gr; g.beginPath(); g.arc(s / 2, s / 2, r, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 2; g.stroke();
        g.fillStyle = '#2a2e34'; g.beginPath(); g.arc(s / 2, s / 2, r * 0.28, 0, TAU); g.fill(); g.fillStyle = '#c9a35a'; g.beginPath(); g.arc(s / 2, s / 2, r * 0.12, 0, TAU); g.fill();
        const o = { c, s }; cylSpr.set(key, o); return o;
      }
      function pressGeo() {
        const W = G.W, H = G.H, ph = G.phone;
        const cx = ph ? W * 0.42 : W * 0.4, R = ph ? Math.min(W * 0.075, 36) : Math.min(H * 0.052, 48);
        const yTop = ph ? H * 0.32 : H * 0.27, yBot = ph ? H * 0.68 : H * 0.7;
        const reel = { x: ph ? W * 0.17 : W * 0.21, y: ph ? H * 0.8 : H * 0.79, r: ph ? W * 0.11 : H * 0.095 };
        const fold = { x: ph ? W * 0.8 : W * 0.68, y: ph ? H * 0.34 : H * 0.32, w: ph ? W * 0.26 : W * 0.13, h: ph ? H * 0.14 : H * 0.2 };
        const topY = yTop - R * 2.2;
        const web = [{ x: reel.x + reel.r * 0.2, y: reel.y - reel.r }, { x: cx, y: yBot + R * 1.5 }, { x: cx, y: topY + R * 0.6 }, { x: cx + R * 0.8, y: topY }, { x: fold.x, y: topY }, { x: fold.x, y: fold.y }];
        const stack = { x: ph ? W * 0.72 : W * 0.86, y: H * 0.8 };
        const conv = { a: { x: fold.x, y: fold.y + fold.h + 8 }, b: { x: ph ? stack.x + 14 : stack.x - 34, y: stack.y - 46 } };
        const gear = { x: ph ? W * 1.02 : W * 0.97, y: ph ? H * 0.6 : H * 0.62, r: ph ? W * 0.2 : H * 0.17 };
        return { cx, R, yTop, yBot, reel, fold, web, topY, stack, conv, gear };
      }
      function renderHall() {
        const W = G.W, H = G.H, dpr = Math.min(cv.dpr || 1, 1.5), g = ctx2(hallC, W, H, dpr), P0 = pressGeo(), rr = K.rng(99);
        let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#120e0b'); gr.addColorStop(0.65, '#1f1813'); gr.addColorStop(1, '#0b0806'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        // tall factory windows, faint with the city's night glow
        for (let i = 0; i < 6; i++) { const x = W * (0.06 + i * 0.17), w = W * 0.1; g.fillStyle = 'rgba(70,95,140,.12)'; g.fillRect(x, H * 0.06, w, H * 0.34); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 3; g.strokeRect(x, H * 0.06, w, H * 0.34); g.beginPath(); g.moveTo(x + w / 2, H * 0.06); g.lineTo(x + w / 2, H * 0.4); g.moveTo(x, H * 0.23); g.lineTo(x + w, H * 0.23); g.stroke(); }
        // hanging lamps and their cones
        [0.2, 0.5, 0.8].forEach((fx) => { const x = W * fx; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H * 0.09); g.stroke(); g.fillStyle = '#2b2f36'; g.beginPath(); g.moveTo(x - 16, H * 0.11); g.lineTo(x + 16, H * 0.11); g.lineTo(x + 8, H * 0.09); g.lineTo(x - 8, H * 0.09); g.closePath(); g.fill();
          g.save(); g.globalCompositeOperation = 'lighter'; const cg = g.createLinearGradient(x, H * 0.11, x, H * 0.9); cg.addColorStop(0, 'rgba(255,196,110,.22)'); cg.addColorStop(1, 'rgba(255,196,110,0)'); g.fillStyle = cg; g.beginPath(); g.moveTo(x - 14, H * 0.11); g.lineTo(x + 14, H * 0.11); g.lineTo(x + W * 0.16, H * 0.9); g.lineTo(x - W * 0.16, H * 0.9); g.closePath(); g.fill(); g.restore(); });
        // floor, with safety stripes
        const fy = H * 0.86; g.fillStyle = '#17120e'; g.fillRect(0, fy, W, H - fy);
        for (let x = -20; x < W + 20; x += 26) { g.fillStyle = '#d7a326'; g.beginPath(); g.moveTo(x, fy); g.lineTo(x + 13, fy); g.lineTo(x + 3, fy + 10); g.lineTo(x - 10, fy + 10); g.closePath(); g.fill(); }
        g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, fy + 10, W, 2);
        // the tower's side frames
        const { cx, R, yTop, yBot } = P0, fw = R * 0.7;
        [cx - R * 2.6, cx + R * 2.6 - fw].forEach(x => { gr = g.createLinearGradient(x, 0, x + fw, 0); gr.addColorStop(0, '#2a3a33'); gr.addColorStop(0.5, '#3f5a4e'); gr.addColorStop(1, '#22302a'); g.fillStyle = gr; g.fillRect(x, yTop - R * 3, fw, yBot - yTop + R * 5.2); g.fillStyle = 'rgba(255,255,255,.12)'; for (let y = yTop - R * 2.6; y < yBot + R * 2; y += R * 0.9) { g.beginPath(); g.arc(x + fw / 2, y, 2, 0, TAU); g.fill(); } });
        g.fillStyle = '#26332d'; g.fillRect(cx - R * 2.6, yBot + R * 2.2, R * 5.2, R * 0.6);
        // the folder housing
        const f = P0.fold; g.fillStyle = '#2b3038'; g.fillRect(f.x - f.w / 2, f.y, f.w, f.h); g.fillStyle = '#3a414b'; g.fillRect(f.x - f.w / 2, f.y, f.w, 8);
        g.fillStyle = 'rgba(0,0,0,.4)'; for (let i = 0; i < 6; i++) g.fillRect(f.x - f.w * 0.4 + i * f.w * 0.15, f.y + f.h * 0.3, f.w * 0.08, f.h * 0.45);
        g.fillStyle = '#c9a35a'; g.font = '700 12px ' + TYPE; g.textAlign = 'center'; g.fillText('FOLDER', f.x, f.y + f.h - 8); g.textAlign = 'start';
        // the reel stand
        const re = P0.reel; g.fillStyle = '#1c2420'; g.beginPath(); g.moveTo(re.x - re.r * 1.2, H * 0.86); g.lineTo(re.x, re.y); g.lineTo(re.x + re.r * 1.2, H * 0.86); g.closePath(); g.fill();
        // pipes along the ceiling
        [H * 0.035, H * 0.055].forEach((py, i) => { gr = g.createLinearGradient(0, py - 6, 0, py + 6); gr.addColorStop(0, '#4a4f57'); gr.addColorStop(0.5, '#7b828c'); gr.addColorStop(1, '#2a2e34'); g.fillStyle = gr; g.fillRect(0, py - 5 + i, W, 10 - i * 2); for (let x = 40 + i * 30; x < W; x += 120) { g.fillStyle = '#23272c'; g.fillRect(x, py - 7, 8, 14); } });
        // a second tower, asleep in the dark
        if (!G.phone) { const bx = W * 0.12, br2 = R * 0.75; g.fillStyle = 'rgba(30,40,36,.9)'; g.fillRect(bx - br2 * 2.4, yTop - br2 * 2, br2 * 4.8, yBot - yTop + br2 * 4); g.fillStyle = 'rgba(70,78,88,.55)'; for (let i = 0; i < 4; i++) { const y = lerp(yBot, yTop, (i + 0.5) / 4); [-1, 1].forEach(sd => { g.beginPath(); g.arc(bx + sd * (br2 + 3), y, br2, 0, TAU); g.fill(); }); } }
        // the big drive gear behind the stack
        const ge = P0.gear; g.fillStyle = '#1e2226'; g.beginPath(); for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, rr0 = ge.r * (i % 2 ? 1 : 1.08); g.lineTo(ge.x + Math.cos(a) * rr0, ge.y + Math.sin(a) * rr0); } g.closePath(); g.fill(); g.fillStyle = '#15181b'; g.beginPath(); g.arc(ge.x, ge.y, ge.r * 0.78, 0, TAU); g.fill();
        // the conveyor from the folder to the stack
        const cvA = P0.conv.a, cvB = P0.conv.b, clen = Math.hypot(cvB.x - cvA.x, cvB.y - cvA.y);
        g.strokeStyle = '#121416'; g.lineWidth = 4; [0.25, 0.75].forEach(f2 => { const lx = lerp(cvA.x, cvB.x, f2), ly = lerp(cvA.y, cvB.y, f2); g.beginPath(); g.moveTo(lx, ly + 8); g.lineTo(lx, H * 0.86); g.stroke(); });
        g.lineCap = 'round'; g.strokeStyle = '#1d2024'; g.lineWidth = 14; g.beginPath(); g.moveTo(cvA.x, cvA.y); g.lineTo(cvB.x, cvB.y); g.stroke();
        g.strokeStyle = '#3c4148'; g.lineWidth = 3; g.beginPath(); g.moveTo(cvA.x, cvA.y - 6); g.lineTo(cvB.x, cvB.y - 6); g.stroke(); g.lineCap = 'butt';
        g.fillStyle = '#5a616b'; for (let s2 = 0; s2 <= clen; s2 += 18) { const lx = lerp(cvA.x, cvB.x, s2 / clen), ly = lerp(cvA.y, cvB.y, s2 / clen); g.beginPath(); g.arc(lx, ly, 3, 0, TAU); g.fill(); }
        hallKey = W + 'x' + H + dpr; void rr;
      }
      const papers = []; let paperT = 0, stackN = 0;
      function drawPress(g, t, dt) {
        if (!hallKey) renderHall();
        const d = cv.dpr || 1; g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(hallC, 0, 0, G.W * d, G.H * d); g.setTransform(d, 0, 0, d, 0, 0);
        const P0 = pressGeo(), k = clamp((now() - st.runT) / 700, 0, 1), speed = 0.25 + 0.75 * eOut(k), { cx, R, yTop, yBot } = P0, rot = t * 14 * speed;
        // the paper reel, unwinding
        const re = P0.reel, rr2 = re.r * (1 - 0.15 * clamp((now() - st.runT) / 4000, 0, 1));
        g.fillStyle = '#efe8d6'; g.beginPath(); g.arc(re.x, re.y, rr2, 0, TAU); g.fill(); g.strokeStyle = 'rgba(120,100,70,.4)'; g.lineWidth = 1; for (let i = 1; i < 5; i++) { g.beginPath(); g.arc(re.x, re.y, rr2 * i / 5, 0, TAU); g.stroke(); }
        g.fillStyle = '#5b4a32'; g.beginPath(); g.arc(re.x, re.y, rr2 * 0.16, 0, TAU); g.fill(); g.strokeStyle = 'rgba(80,60,30,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(re.x, re.y); g.lineTo(re.x + Math.cos(-rot * 0.4) * rr2 * 0.9, re.y + Math.sin(-rot * 0.4) * rr2 * 0.9); g.stroke();
        // the web: a racing ribbon of newsprint, the page printed on it again and again
        const web = P0.web, scroll = (now() - st.runT) / 1000 * 620 * speed;
        g.lineJoin = 'round'; g.lineCap = 'butt';
        g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 16; polyline(g, web, 2, 3); g.stroke();
        g.strokeStyle = '#f1ead8'; g.lineWidth = 13; polyline(g, web, 0, 0); g.stroke();
        let acc = 0;
        for (let i = 0; i < web.length - 1; i++) {
          const a = web[i], b = web[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
          for (let s = ((acc - scroll) % 22 + 22) % 22; s < len; s += 22) {
            const x = a.x + ux * s, y = a.y + uy * s, idx = Math.floor((acc + s - scroll) / 22);
            g.fillStyle = idx % 6 === 0 ? 'rgba(29,55,88,.9)' : 'rgba(27,24,19,.55)';
            const half = idx % 6 === 0 ? 5 : 4, thick = idx % 6 === 0 ? 4 : 1.6;
            g.save(); g.translate(x, y); g.rotate(Math.atan2(uy, ux) + Math.PI / 2); g.fillRect(-half, -thick / 2, half * 2, thick); g.restore();
          }
          acc += len;
        }
        // the four printing couples: plate and blanket cylinders either side of the web, ink rollers beside them
        const INK = ['#1b1813', '#1aa0d8', '#d4237a', '#f4c21b'];
        for (let i = 0; i < 4; i++) {
          const y = lerp(yBot, yTop, (i + 0.5) / 4), sp = cylinder(R);
          [-1, 1].forEach(sd => {
            const x = cx + sd * (R + 4);
            g.drawImage(sp.c, x - sp.s / 2, y - sp.s / 2, sp.s, sp.s);
            g.strokeStyle = 'rgba(30,34,40,.75)'; g.lineWidth = 2; const a0 = rot * sd; for (let m = 0; m < 3; m++) { const a = a0 + m * TAU / 3; g.beginPath(); g.moveTo(x + Math.cos(a) * R * 0.35, y + Math.sin(a) * R * 0.35); g.lineTo(x + Math.cos(a) * R * 0.9, y + Math.sin(a) * R * 0.9); g.stroke(); }
            const ix = cx + sd * (R * 2.2 + 6), iy = y - R * 0.55, ir = R * 0.42;
            g.fillStyle = INK[i]; g.beginPath(); g.arc(ix, iy, ir, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.arc(ix - ir * 0.3, iy - ir * 0.3, ir * 0.35, 0, TAU); g.fill();
          });
        }
        // the drive gear turns
        const ge = P0.gear; g.strokeStyle = 'rgba(120,128,138,.55)'; g.lineWidth = 6; for (let m = 0; m < 6; m++) { const a = -rot * 0.18 + m * TAU / 6; g.beginPath(); g.moveTo(ge.x + Math.cos(a) * ge.r * 0.18, ge.y + Math.sin(a) * ge.r * 0.18); g.lineTo(ge.x + Math.cos(a) * ge.r * 0.74, ge.y + Math.sin(a) * ge.r * 0.74); g.stroke(); }
        g.fillStyle = '#c9a35a'; g.beginPath(); g.arc(ge.x, ge.y, ge.r * 0.12, 0, TAU); g.fill();
        // speed streaks race along the web
        g.strokeStyle = 'rgba(255,255,255,' + (0.5 * speed).toFixed(3) + ')'; g.lineWidth = 2; acc = 0;
        for (let i = 0; i < web.length - 1; i++) { const a = web[i], b = web[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / len, uy = (b.y - a.y) / len; for (let s3 = ((acc - scroll * 2.2) % 90 + 90) % 90; s3 < len - 14; s3 += 90) { const x = a.x + ux * s3, y = a.y + uy * s3; g.beginPath(); g.moveTo(x - uy * 9, y + ux * 9); g.lineTo(x - uy * 9 + ux * 14, y + ux * 9 + uy * 14); g.stroke(); } acc += len; }
        // the folder: copies drop onto the conveyor, ride it down and stack up
        const f = P0.fold, cA = P0.conv.a, cB = P0.conv.b, sk = P0.stack;
        paperT += dt * speed;
        if (paperT > 0.12 && st.scene === 'press') { paperT = 0; papers.push({ s: 0, r: (Math.random() - 0.5) * 0.3, b: Math.random() * 6 }); st.copies += 37 + Math.floor(Math.random() * 9); if (A.ctx && Math.random() < 0.5) A.paper({ vol: 0.025 }); }
        for (let i = papers.length - 1; i >= 0; i--) {
          const q = papers[i]; q.s += dt * 1.25 * speed;
          if (q.s >= 1) { stackN++; papers.splice(i, 1); continue; }
          const x = lerp(cA.x, cB.x, q.s), y = lerp(cA.y, cB.y, q.s) - 12 - Math.abs(Math.sin(q.s * 9 + q.b)) * 2;
          g.save(); g.translate(x, y); g.rotate(Math.atan2(cB.y - cA.y, cB.x - cA.x) * 0.35 + q.r); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-15, -6, 32, 16); g.fillStyle = '#f3ecda'; g.fillRect(-17, -9, 32, 16); g.fillStyle = '#1b1813'; g.fillRect(-14, -6, 26, 3); g.fillStyle = 'rgba(27,24,19,.45)'; g.fillRect(-14, -1, 20, 1.5); g.fillRect(-14, 2.5, 24, 1.5); g.restore();
        }
        if (papers.length > 40) papers.splice(0, papers.length - 40);
        // the growing stack of copies, tied in a bundle
        const sh = Math.min(46, stackN * 1.1);
        for (let i = 0; i < Math.ceil(sh / 3); i++) { g.fillStyle = i % 2 ? '#e9e1cc' : '#f3ecda'; g.fillRect(sk.x - 28 + (i % 3) * 0.8, sk.y - i * 3 - 3, 56, 3); }
        g.fillStyle = 'rgba(27,24,19,.8)'; g.fillRect(sk.x - 28, sk.y - sh - 5, 56, 2); g.strokeStyle = '#b08445'; g.lineWidth = 2; g.beginPath(); g.moveTo(sk.x - 8, sk.y - sh - 5); g.lineTo(sk.x - 8, sk.y); g.moveTo(sk.x + 10, sk.y - sh - 5); g.lineTo(sk.x + 10, sk.y); g.stroke();
        void f;
        if (Math.random() < 0.18 * speed) P.emit('smoke', cx + (Math.random() - 0.5) * R * 2, P0.topY - R * 0.5, 1, { colors: ['rgba(220,215,205,.22)'] });
        if (Math.random() < 0.5) counter.textContent = 'PRINTING · ' + st.copies.toLocaleString('en-AU') + ' COPIES';
      }
      function polyline(g, pts, ox, oy) { g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q.x + ox, q.y + oy) : g.moveTo(q.x + ox, q.y + oy))); }

      /* dawn: a street of front doors, the paper bike, the broadsheet landing at your feet */
      function dawnGeo() {
        const W = G.W, H = G.H, ph = G.phone, hz = ph ? H * 0.44 : H * 0.52, n = ph ? 4 : 6, hw = W / n, bodyH = Math.min(hw * 1.02, hz * 0.6);
        const doors = [], lamps = [];
        for (let i = 0; i < n; i++) { const x = hw * (i + 0.5) + (i % 2 ? 7 : -7); doors.push({ x, step: hz + 4, porch: { x, y: hz - bodyH * 0.47 } }); }
        for (let i = 0; i < (ph ? 1 : 2); i++) lamps.push({ x: W * (ph ? 0.5 : 0.33 + i * 0.34), y: hz + (ph ? 18 : 22) });
        return { hz, n, hw, bodyH, doors, lamps, street: hz + (ph ? 30 : 38), sun: { x: W * 0.74, y0: hz + 24, y1: hz * 0.4 } };
      }
      function renderSky() {
        const W = G.W, H = G.H, dpr = Math.min(cv.dpr || 1, 1.5), g = ctx2(skyC, W, H, dpr), D = dawnGeo(), rr = K.rng(55), hz = D.hz, hw = D.hw, bodyH = D.bodyH;
        let gr = g.createLinearGradient(0, 0, 0, hz); gr.addColorStop(0, '#1b2952'); gr.addColorStop(0.42, '#55578c'); gr.addColorStop(0.78, '#e3967f'); gr.addColorStop(1, '#ffd8a8'); g.fillStyle = gr; g.fillRect(0, 0, W, hz + 2);
        // thin clouds, lit from below
        for (let i = 0; i < 5; i++) { const cx = rr() * W, cy = hz * (0.16 + rr() * 0.42), cw = W * (0.18 + rr() * 0.25); g.fillStyle = 'rgba(255,196,170,' + (0.12 + rr() * 0.12).toFixed(3) + ')'; g.beginPath(); g.ellipse(cx, cy, cw, 5 + rr() * 6, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(80,70,120,.18)'; g.beginPath(); g.ellipse(cx - 10, cy - 4, cw * 0.8, 4, 0, 0, TAU); g.fill(); }
        // the far town, hazy, a few early windows
        let x = -10; while (x < W) { const w = 18 + rr() * 46, hh = 26 + rr() * 64; g.fillStyle = 'rgba(92,80,124,.5)'; g.fillRect(x, hz - bodyH * 0.55 - hh, w, hh + bodyH * 0.55); if (rr() < 0.7) { g.fillStyle = 'rgba(255,214,150,.55)'; g.fillRect(x + 5 + rr() * (w - 12), hz - bodyH * 0.55 - hh + 8 + rr() * hh * 0.5, 3, 4); } x += w + 3; }
        // trees between the houses
        for (let i = 0; i <= D.n; i++) { if (i % 2) continue; const tx = i * hw + (rr() - 0.5) * 10, tr = hw * 0.26; g.fillStyle = '#3a3a52'; g.fillRect(tx - 2, hz - bodyH * 0.6, 4, bodyH * 0.6); g.fillStyle = 'rgba(52,58,78,.95)'; [[0, -0.95, 1], [-0.5, -0.7, 0.75], [0.5, -0.72, 0.8]].forEach(([ox, oy, sc]) => { g.beginPath(); g.arc(tx + ox * tr, hz - bodyH * 0.55 + oy * tr, tr * sc, 0, TAU); g.fill(); }); }
        // the terrace: each house lit from the right by the rising sun
        const BODY = ['#8a5a4e', '#62647e', '#8a6c4c', '#4e6a68', '#7a5a70', '#6e6250'], ROOF = ['#4a2e2a', '#33354a', '#4e3a26', '#26383a', '#40303c', '#3a3226'];
        D.doors.forEach((d, i) => {
          const w = hw - 10, x0 = i * hw + 5, y0 = hz - bodyH, col = BODY[i % 6];
          gr = g.createLinearGradient(x0, 0, x0 + w, 0); gr.addColorStop(0, mix(col, '#000000', 0.25)); gr.addColorStop(1, mix(col, '#ffd0a0', 0.18)); g.fillStyle = gr; g.fillRect(x0, y0, w, bodyH);
          g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x0, y0 + bodyH * 0.55, w, 2);
          if (i % 2) { g.fillStyle = ROOF[i % 6]; g.fillRect(x0 - 4, y0 - 10, w + 8, 12); g.fillStyle = 'rgba(255,210,160,.25)'; g.fillRect(x0 - 4, y0 - 10, w + 8, 2); }
          else { g.fillStyle = ROOF[i % 6]; g.beginPath(); g.moveTo(x0 - 6, y0 + 2); g.lineTo(x0 + w / 2, y0 - hw * 0.3); g.lineTo(x0 + w + 6, y0 + 2); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,200,150,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 + w / 2, y0 - hw * 0.3); g.lineTo(x0 + w + 6, y0 + 2); g.stroke(); }
          if (i % 3 !== 1) { const cx2 = x0 + w * 0.72, ch = hw * 0.2; g.fillStyle = ROOF[i % 6]; g.fillRect(cx2, y0 - hw * 0.22 - ch * 0.4, w * 0.11, ch); g.fillStyle = '#2a2224'; g.fillRect(cx2 - 2, y0 - hw * 0.22 - ch * 0.4 - 3, w * 0.11 + 4, 4); }
          const ww = w * 0.22, wh = ww * 1.15;
          [[0.12, 0.14, (i + 1) % 3 === 0], [0.64, 0.14, i % 2 === 0], [0.12, 0.6, i % 4 === 1]].forEach(([fx, fy, lit]) => {
            const wx = x0 + w * fx, wy = y0 + bodyH * fy;
            g.fillStyle = 'rgba(255,240,220,.28)'; g.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
            if (lit) { const lg = g.createLinearGradient(0, wy, 0, wy + wh); lg.addColorStop(0, '#ffe2a0'); lg.addColorStop(1, '#f2a85a'); g.fillStyle = lg; } else { const lg = g.createLinearGradient(0, wy, 0, wy + wh); lg.addColorStop(0, '#8e86b4'); lg.addColorStop(1, '#3e3a5a'); g.fillStyle = lg; }
            g.fillRect(wx, wy, ww, wh); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(wx + ww / 2 - 1, wy, 2, wh); g.fillRect(wx, wy + wh / 2 - 1, ww, 2); g.fillStyle = 'rgba(255,240,220,.45)'; g.fillRect(wx - 3, wy + wh + 1, ww + 6, 3);
          });
          const dw = w * 0.22, dh = bodyH * 0.42, dx = d.x - dw / 2, dy = hz - dh;
          g.fillStyle = '#21160f'; g.fillRect(dx, dy, dw, dh); g.fillStyle = ['#7a2a2a', '#1d3758', '#2f5a3f', '#5a3a6a'][i % 4]; g.fillRect(dx + 2, dy + 2, dw - 4, dh - 2);
          g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.strokeRect(dx + 5, dy + 6, dw - 10, dh * 0.36); g.strokeRect(dx + 5, dy + dh * 0.52, dw - 10, dh * 0.36);
          g.fillStyle = '#e8c35a'; g.beginPath(); g.arc(dx + dw - 6, dy + dh * 0.55, 1.8, 0, TAU); g.fill();
          g.fillStyle = ROOF[i % 6]; g.fillRect(dx - 6, dy - 6, dw + 12, 5); g.fillStyle = '#20180f'; g.fillRect(d.porch.x + dw * 0.62, d.porch.y - 4, 4, 8);
          g.fillStyle = '#9a9284'; g.fillRect(dx - 8, hz - 2, dw + 16, 5); g.fillStyle = '#7a7366'; g.fillRect(dx - 12, hz + 3, dw + 24, 4);
          // the front hedge, either side of the path
          g.fillStyle = '#2f4a3a'; for (let hx = x0 + 4; hx < x0 + w - 4; hx += 9) { if (Math.abs(hx - d.x) < dw * 0.9) continue; g.beginPath(); g.arc(hx, hz + 2, 6, Math.PI, 0); g.fill(); }
        });
        // pavement, kerb, road; the long shadows of early morning
        g.fillStyle = '#7d776d'; g.fillRect(0, hz + 6, W, D.street - hz - 6); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1; for (let xx = 0; xx < W; xx += 28) { g.beginPath(); g.moveTo(xx, hz + 6); g.lineTo(xx - 6, D.street); g.stroke(); }
        g.fillStyle = 'rgba(40,30,50,.22)'; D.doors.forEach((d, i) => { const x0 = i * hw + 5; g.beginPath(); g.moveTo(x0, hz + 6); g.lineTo(x0 + hw * 0.5, hz + 6); g.lineTo(x0 + hw * 0.2, D.street); g.lineTo(x0 - hw * 0.35, D.street); g.closePath(); g.fill(); });
        g.fillStyle = '#5a554c'; g.fillRect(0, D.street, W, 5); g.fillStyle = 'rgba(255,230,190,.25)'; g.fillRect(0, D.street, W, 1.5);
        gr = g.createLinearGradient(0, D.street + 5, 0, H); gr.addColorStop(0, '#45434a'); gr.addColorStop(1, '#1d1c22'); g.fillStyle = gr; g.fillRect(0, D.street + 5, W, H);
        g.fillStyle = 'rgba(255,226,170,.42)'; for (let xx = 12; xx < W; xx += 72) g.fillRect(xx, D.street + (G.phone ? 46 : 54), 36, 3);
        D.lamps.forEach(l => { g.fillStyle = '#1d1a1c'; g.fillRect(l.x - 2, l.y - D.bodyH * 0.95, 4, D.bodyH * 0.95); g.fillRect(l.x - 9, l.y - D.bodyH * 0.95 - 6, 18, 7); g.fillStyle = '#ffe2a0'; g.fillRect(l.x - 6, l.y - D.bodyH * 0.95 + 1, 12, 5); });
        skyKey = W + 'x' + H + dpr;
      }
      function drawDawn(g, t, dt) {
        if (!skyKey) renderSky();
        const d = cv.dpr || 1, W = G.W, H = G.H, D = dawnGeo(), k = clamp((now() - st.dawnT) / 6000, 0, 1);
        g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(skyC, 0, 0, W * d, H * d); g.setTransform(d, 0, 0, d, 0, 0);
        // the sun clears the rooftops; light spills down the road; the porch lights click off one by one
        const sx = D.sun.x, sy = lerp(D.sun.y0, D.sun.y1, eOut(k)), spr = K.glowSprite('rgba(255,214,150,0.9)');
        g.save(); g.globalCompositeOperation = 'lighter';
        g.globalAlpha = 0.5 + 0.4 * k; g.drawImage(spr, sx - 170, sy - 170, 340, 340); g.globalAlpha = 1;
        g.fillStyle = 'rgba(255,242,210,.92)'; g.beginPath(); g.arc(sx, sy, G.phone ? 20 : 26, 0, TAU); g.fill();
        for (let i = 0; i < 9; i++) { const a = Math.PI * (0.62 + i * 0.09) + Math.sin(t * 0.25 + i) * 0.015; g.strokeStyle = 'rgba(255,214,160,' + (0.045 * (0.3 + k)).toFixed(3) + ')'; g.lineWidth = 18 + (i % 3) * 8; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a) * W * 1.2, sy + Math.sin(a) * W * 1.2); g.stroke(); }
        const rg = g.createLinearGradient(sx - 40, 0, sx + 40, 0); rg.addColorStop(0, 'rgba(255,200,140,0)'); rg.addColorStop(0.5, 'rgba(255,200,140,' + (0.16 * k).toFixed(3) + ')'); rg.addColorStop(1, 'rgba(255,200,140,0)'); g.fillStyle = rg; g.fillRect(sx - 40, D.street + 5, 80, H - D.street);
        D.doors.forEach((dr, i) => { if (k > 0.25 + i * 0.12) return; g.globalAlpha = 0.7 * (1 - k * 0.6); g.drawImage(spr, dr.porch.x + (D.hw - 10) * 0.1364 + 2 - 26, dr.porch.y - 26, 52, 52); });
        D.lamps.forEach(l => { if (k > 0.55) return; g.globalAlpha = 0.6 * (1 - k); g.drawImage(spr, l.x - 40, l.y - D.bodyH * 0.95 - 36, 80, 80); });
        g.globalAlpha = 1; g.restore();
        g.fillStyle = 'rgba(255,170,110,' + (0.1 * k).toFixed(3) + ')'; g.fillRect(0, 0, W, H);
        // birds
        for (let i = 0; i < 4; i++) { const bx = ((t * (20 + i * 7) + i * 130) % (W + 80)) - 40, by = D.hz * (0.18 + i * 0.1) + Math.sin(t * 2 + i) * 6, f = Math.sin(t * 9 + i) * 4; g.strokeStyle = 'rgba(40,30,50,.72)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(bx - 7, by - f); g.quadraticCurveTo(bx - 3, by - 2, bx, by); g.quadraticCurveTo(bx + 3, by - 2, bx + 7, by - f); g.stroke(); }
        // the paper bike rolls down the street, throwing a copy onto each doorstep
        const bt = (now() - st.dawnT) / 1000, bx = lerp(-60, W + 60, clamp(bt / 3.4, 0, 1)), by = D.street + (G.phone ? 22 : 26);
        D.doors.forEach((dr, i) => {
          let q = st.thrown[i];
          if (!q && bt < 3.6 && bx > dr.x - 30) q = st.thrown[i] = { t0: now(), x0: bx, y0: by - 26, x1: dr.x + (i % 2 ? 8 : -8), y1: dr.step - 2, landed: false, rot: (i % 2 ? 1 : -1) * 0.15 };
          if (!q) return;
          const kk = clamp((now() - q.t0) / 520, 0, 1), x = lerp(q.x0, q.x1, kk), y = lerp(q.y0, q.y1, kk) - Math.sin(kk * Math.PI) * 50;
          if (kk >= 1 && !q.landed) { q.landed = true; if (A.ctx) { A.noise({ filter: 'lowpass', freq: 650, dur: 0.08, vol: 0.13 }); A.paper({ vol: 0.06 }); } P.emit('dust', x, y + 3, 5, { colors: ['rgba(235,220,195,.7)'], speed: [10, 46] }); }
          g.save(); g.translate(x, y); g.rotate(kk < 1 ? kk * 10 : q.rot); if (kk >= 1) { g.fillStyle = 'rgba(0,0,0,.32)'; g.fillRect(-9, 2, 21, 4); } g.fillStyle = '#f4ecd8'; g.fillRect(-11, -4, 22, 8); g.fillStyle = '#c9b48a'; g.fillRect(-11, 1, 22, 1.2); g.fillStyle = '#1b1813'; g.fillRect(-8, -2.6, 13, 1.8); g.restore();
        });
        if (bt < 3.7) drawBike(g, bx, by, t);
        // the foreground doorstep, where the last copy lands
        const fr = G.final;
        if (fr) {
          const y = fr.y + fr.h - 20, x0 = Math.max(0, fr.x - 50), x1 = Math.min(W, fr.x + fr.w + 50);
          g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x0 + 12, y + 14, x1 - x0, 34);
          const sg = g.createLinearGradient(0, y, 0, y + 46); sg.addColorStop(0, '#a89d8b'); sg.addColorStop(1, '#5d564b'); g.fillStyle = sg; g.fillRect(x0, y, x1 - x0, 46);
          g.fillStyle = 'rgba(255,230,190,' + (0.18 + 0.2 * k).toFixed(3) + ')'; g.fillRect(x0, y, x1 - x0, 3);
          g.fillStyle = '#6e4226'; g.fillRect(fr.x + fr.w * 0.1, y + 7, fr.w * 0.8, 24); g.strokeStyle = 'rgba(255,220,170,.25)'; g.lineWidth = 1; for (let mx = fr.x + fr.w * 0.1 + 4; mx < fr.x + fr.w * 0.9; mx += 5) { g.beginPath(); g.moveTo(mx, y + 9); g.lineTo(mx, y + 29); g.stroke(); }
        }
        if (Math.random() < 0.3) P.emit('mote', Math.random() * W, D.hz * 0.5 + Math.random() * (H - D.hz * 0.5), 1, { colors: ['#fff1d0'] });
        if (!st.bell && bt > 0.45) { st.bell = 1; if (A.ctx) [0, 0.16].forEach(o => A.chime(1900, { when: A.now() + o, vol: 0.05, dur: 0.6 })); }
        void dt;
      }
      function drawBike(g, x, y, t) {
        g.save(); g.translate(x, y); g.strokeStyle = '#1b1612'; g.lineWidth = 2.4; const wr = 11, sp = t * 12;
        [-16, 16].forEach(wx => { g.beginPath(); g.arc(wx, 0, wr, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(wx + Math.cos(sp) * wr, Math.sin(sp) * wr); g.lineTo(wx - Math.cos(sp) * wr, -Math.sin(sp) * wr); g.stroke(); });
        g.beginPath(); g.moveTo(-16, 0); g.lineTo(-2, -14); g.lineTo(12, -14); g.lineTo(16, 0); g.moveTo(-2, -14); g.lineTo(0, 0); g.lineTo(-16, 0); g.moveTo(12, -14); g.lineTo(10, -22); g.stroke();
        g.fillStyle = '#2a2420'; g.beginPath(); g.ellipse(-2, -30, 6, 11, -0.3, 0, TAU); g.fill(); g.beginPath(); g.arc(1, -45, 6, 0, TAU); g.fill();
        g.fillStyle = '#c0262d'; g.fillRect(-12, -30, 9, 10); g.fillStyle = '#f2ead6'; g.fillRect(-11, -33, 7, 4);
        g.restore();
      }

      /* ---------------- render loop: one opaque canvas, idle frames throttled ---------------- */
      let lastDraw = -1, dtAcc = 0;
      const busy = () => st.scene !== 'desk' || P.count() > 0 || st.shake > 0 || st.press > 0.01 || st.flash > 0;
      K.loop((dt0, t) => {
        const g = cv.g; if (!g || !G.W) return;
        if (st.phase === 'done' && now() - st.doneT > 3000 && !P.count()) return; // the after card is up: hold the last frame
        dtAcc += dt0;
        if (t - lastDraw < (busy() ? (SOFT ? 0.03 : 0) : (SOFT ? 0.07 : 0.034))) return;
        const dt = Math.min(0.06, dtAcc); dtAcc = 0; lastDraw = t;
        st.shake = Math.max(0, st.shake - dt * 5);
        const sx = st.shake ? (Math.random() - 0.5) * 4 * st.shake : 0, sy = st.shake ? (Math.random() - 0.5) * 3 * st.shake : 0;
        if (st.scene === 'desk') {
          if (!deskKey || deskKey !== G.W + 'x' + G.H + (bright() ? 'b' : 'd') + Math.min(cv.dpr || 1, 1.5) + ':' + (G.page ? G.page.h : 0)) renderDesk();
          const d = cv.dpr || 1; g.setTransform(1, 0, 0, 1, sx * d, sy * d); g.drawImage(deskC, 0, 0, G.W * d, G.H * d); g.setTransform(d, 0, 0, d, sx * d, sy * d);
          if (G.mug && !G.phone) steam(g, t);
          const vib = st.press > 0.01 && st.phase === 'press' ? st.press : 0;
          const tr = vib || st.shake > 0.05 ? ((Math.random() - 0.5) * 3 * (vib + st.shake * 0.4)).toFixed(1) + 'px ' + ((Math.random() - 0.5) * 2 * (vib + st.shake * 0.4)).toFixed(1) + 'px' : '';
          if (tr !== st.tr) { st.tr = tr; page.style.translate = tr; } // only write when it changes
        } else if (st.scene === 'press') { g.setTransform(cv.dpr || 1, 0, 0, cv.dpr || 1, sx * (cv.dpr || 1), sy * (cv.dpr || 1)); drawPress(g, t, dt); }
        else { g.setTransform(cv.dpr || 1, 0, 0, cv.dpr || 1, 0, 0); drawDawn(g, t, dt); }
        P.update(dt); P.draw(g);
        if (st.flash > 0) { st.flash = Math.max(0, st.flash - dt * 2.4); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(255,248,230,' + (st.flash * (K.reduced() ? 0.3 : 0.85)).toFixed(3) + ')'; g.fillRect(0, 0, cv.el.width, cv.el.height); g.setTransform(cv.dpr || 1, 0, 0, cv.dpr || 1, 0, 0); }
      });
      function steam(g, t) {
        const m = G.mug; g.save(); g.globalCompositeOperation = bright() ? 'source-over' : 'lighter'; g.lineCap = 'round';
        for (let i = 0; i < 3; i++) { const ph = t * 0.8 + i * 2.1, x = m.x + (i - 1) * m.r * 0.35; g.strokeStyle = 'rgba(255,250,240,' + (bright() ? 0.35 : 0.14) + ')'; g.lineWidth = 3 + i; g.beginPath(); g.moveTo(x, m.y - m.r * 0.2); g.bezierCurveTo(x + Math.sin(ph) * 10, m.y - m.r * 0.9, x - Math.sin(ph * 1.3) * 12, m.y - m.r * 1.5, x + Math.sin(ph * 0.7) * 8, m.y - m.r * 2.2); g.stroke(); }
        g.restore();
      }

      /* ---------------- lines (three vibes each) ---------------- */
      const LINES = {
        rushIntro: care ? { Jolly: 'Front page is set. Big type and everything.', Cheeky: 'Front page, ready to roll.', Unfiltered: 'Page is set.' }
          : { Jolly: 'Front page! I wrote it myself. Gorgeous, isn’t it?', Cheeky: 'Hot off the panic press! You’re welcome.', Unfiltered: 'Front page. Loud. Done.' },
        glitchIntro: story.practice ? { Jolly: 'No story of yours tonight, so here’s a practice page. Nothing prints until we check it.', Cheeky: 'Practice page tonight. Same rule: nothing prints unchecked.', Unfiltered: 'Practice page. Check it first.' }
          : visits >= 2 ? { Jolly: 'Back on the night desk! You know the drill: check, swap, print.', Cheeky: 'The Spiral’s at it again. Coffee, then facts.', Unfiltered: 'Check. Swap. Print.' }
            : { Jolly: 'Hold the front page! Nothing prints until we check it.', Cheeky: 'Ooh, the Daily Spiral strikes again. Coffee first, then facts.', Unfiltered: 'Stop. We check it first.' },
        checkHow: { Jolly: 'Tap each claim. Could a camera have caught it? TRUE. Did the mind add it? UNVERIFIED.', Cheeky: 'Tap a claim, stamp it. Camera could see it: true. Brain added it: unverified.', Unfiltered: 'Tap each claim. Camera or mind?' },
        stampTrue: { Jolly: 'TRUE. That happened, so it stays on the page.', Cheeky: 'On record. Even I can’t argue with footage.', Unfiltered: 'True. On record.' },
        stampUnv: { Jolly: 'UNVERIFIED. No camera saw this. It’s a guess in a big font.', Cheeky: 'Unverified! A feeling wearing a headline.', Unfiltered: 'Unverified. A guess.' },
        stampUnvStrong: { Jolly: 'Unverified, though the facts do lean that way. We report it straight.', Cheeky: 'Not confirmed, but it’s got real weight. Straight reporting, no hype.', Unfiltered: 'Unverified. Leans real. Report it straight.' },
        stampUnvCare: { Jolly: 'Unverified. Someone qualified can check this one properly.', Cheeky: 'Unverified. That’s a job for an expert, not a headline.', Unfiltered: 'Unverified. Ask an expert.' },
        swapHow: { Jolly: 'The loud words lean on the unverified bits. Swap each one for type we can stand behind.', Cheeky: 'Right. Every shouty word goes. Drag in the sober type.', Unfiltered: 'Swap the loud words.' },
        swap1: { Jolly: 'Noooo, my beautiful “{W}”!', Cheeky: '“{W}” was my best work!', Unfiltered: 'Fine. Bye, “{W}”.' },
        swap1Care: { Jolly: 'Fair. That word was doing a lot of shouting.', Cheeky: 'Okay, that one was a bit much.', Unfiltered: 'Fair.' },
        swap2: { Jolly: 'Hear that? The whole newsroom just got quieter.', Cheeky: 'Volume’s dropping. My ears thank you.', Unfiltered: 'Quieter.' },
        swap3: { Jolly: '“{K}”? Who clicks on “{K}”?', Cheeky: '“{K}”. Riveting. Truly.', Unfiltered: 'Accurate. Boring, but accurate.' },
        swap3Care: { Jolly: 'Plain and clear. I can live with that.', Cheeky: 'Calm. Readable. Fine by me.', Unfiltered: 'Clear.' },
        bang: { Jolly: 'Last thing: three exclamation marks. Spike them.', Cheeky: 'Three exclamation marks? Onto the spike.', Unfiltered: 'Spike the “!!!”.' },
        bangDone: { Jolly: 'Not my exclamation marks!', Cheeky: 'Those were load-bearing exclamation marks!', Unfiltered: '…Fine.' },
        bangDoneCare: { Jolly: 'Okay. Fewer exclamation marks.', Cheeky: 'Fine, no shouting.', Unfiltered: 'Okay.' },
        rushIn: { Jolly: 'Wait, wait. It’s too calm! Nobody clicks calm. Let me just add a few things…', Cheeky: 'Calm doesn’t sell! Hold my coffee. Actually, hold all of these.', Unfiltered: 'Too calm. Adding hype.' },
        rushInCare: { Jolly: 'It’s a bit plain. Can I add a couple of words?', Cheeky: 'Just a little sparkle on top?', Unfiltered: 'Adding a few words.' },
        holdLine: { Jolly: 'Hold the line: anything we can’t verify goes on the spike.', Cheeky: 'Nice try, Rush. Spike the lot.', Unfiltered: 'Spike them.' },
        rush1: { Jolly: 'Hey! “{W}” was my best one!', Cheeky: 'Not “{W}”! I worked on that for seconds!', Unfiltered: 'Fine.' },
        rush2: { Jolly: 'Okay, okay. Maybe that one was a stretch.', Cheeky: 'You’re very good with that spike.', Unfiltered: 'Okay.' },
        rushNCare: { Jolly: 'Fair enough. Plain it is.', Cheeky: 'Okay, okay. No sparkle.', Unfiltered: 'Okay.' },
        rushDone: { Jolly: 'Huh. It looks… trustworthy. People might actually read it.', Cheeky: 'Fine. FINE. Calm is the new loud.', Unfiltered: 'Calm sells too. Who knew.' },
        rushDoneCare: { Jolly: 'It reads clearly. I like that.', Cheeky: 'Clear and calm. Fine by me.', Unfiltered: 'Clear.' },
        glitchDone: { Jolly: 'Accurate is the new loud.', Cheeky: 'Told you. Facts age better than shouting.', Unfiltered: 'Accurate wins.' },
        flip: { Jolly: 'Now that’s a front page. Welcome to {M}.', Cheeky: 'Same facts, new masthead. {M}, darling.', Unfiltered: '{M}. Better.' },
        press: { Jolly: 'STOP THE PRESSES! I mean START them! Hold the lever!', Cheeky: 'My favourite part. Hold that lever!', Unfiltered: 'Hold the lever.' },
        slam: { Jolly: 'Listen to her roll!', Cheeky: 'Thousands of calm copies! Sorry, more!', Unfiltered: 'Rolling.' },
        dawn: { Jolly: 'Delivered at dawn: true, calm, and worth reading.', Cheeky: 'On every doorstep. Not one exclamation mark.', Unfiltered: 'Delivered. Calm.' },
        dawnSerious: { Jolly: 'Real news, told straight, with a plan next. That’s good journalism.', Cheeky: 'No hype, no hiding. Just the news and a next step.', Unfiltered: 'Straight news. Plan next.' },
        dawnCare: { Jolly: 'Calm and true. For the facts that matter, someone qualified can help.', Cheeky: 'Clear page. Next stop: someone who knows the details.', Unfiltered: 'Calm. Get expert advice.' },
        rushEnd: { Jolly: 'Okay. Sober looks great on a doorstep.', Cheeky: 'I’m framing this one. Don’t tell anyone.', Unfiltered: 'Good page.' }
      };

      /* ---------------- start ---------------- */
      cv.onResize(() => layout());
      S.on('theme', () => { deskKey = ''; });
      (async () => {
        await K.intro({ title: 'Headline Desk', sub: 'Tonight’s front page screams your worry. You’re the editor.', how: 'Fact-check the claims. Swap the loud words. Hold the press.', char: 'glitch', mood: 'coffee' });
        layout();
        page.classList.add('slap'); sSlap(); if (!K.reduced()) st.shake = 1;
        S.later(() => page.classList.remove('slap'), 700); // its fill would otherwise pin the page's opacity
        R.start(0.3);
        speak(rush, L(LINES.rushIntro), { mood: care ? 'think' : 'celebrate', ms: 2600 });
        await K.wait(2500);
        speak(glitch, L(LINES.glitchIntro), { mood: 'coffee', ms: 3400 });
        await K.wait(2200);
        st.phase = 'check';
        S.later(() => { if (st.stamped === 0 && st.phase === 'check') speak(glitch, L(LINES.checkHow), { mood: 'nerd', ms: 4200 }); }, 1500);
        checkGuide();
        try { if (document.fonts && document.fonts.load) Promise.all(['700 40px Oswald', '700 30px Newsreader', '400 30px UnifrakturMaguntia'].map(f => document.fonts.load(f))).then(() => { if (!S.destroyed) layout(); }, () => {}); } catch (e) { /* fonts API missing */ }
      })();

      return {
        async autoplay() {
          const wait = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(90); };
          const dragTo = async (src, dst, kind) => { const a = K.rectIn(src), b = K.rectIn(dst), ty = kind === 'spike' ? b.y + b.h * 0.42 : b.cy; await K.sim.drag(src, { x: a.w / 2, y: a.h / 2 }, { x: b.cx - a.x, y: ty - a.y }, 650, 16); };
          await wait(() => st.phase === 'check');
          for (const c of claims) { await K.wait(700); await K.sim.tap(c.btn); await wait(() => c.stamped, 3000); }
          for (let i = 0; i < slots.length; i++) {
            await wait(() => st.phase === 'swap' && st.slotI === i && slots[i].tiles && !tray.classList.contains('off'), 20000);
            await K.wait(800);
            const t0 = slots[i].tiles[(i + K.daily()) % slots[i].tiles.length];
            await dragTo(t0.el, slots[i].el, 'slot');
            await wait(() => slots[i].done, 2500);
          }
          await wait(() => st.phase === 'bang', 20000); await K.wait(900);
          await dragTo(punct.el, spike, 'spike');
          await wait(() => st.phase === 'rush', 20000);
          for (let n = 0; n < 8 && st.phase === 'rush'; n++) { const rt = st.rush.find(x => !x.done); if (!rt) break; await K.wait(600); await dragTo(rt.el, spike, 'spike'); await wait(() => rt.done, 2000); }
          await wait(() => st.phase === 'press', 20000); await K.wait(900);
          await K.sim.hold(lever, HOLD + 500);
          await wait(() => st.finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
