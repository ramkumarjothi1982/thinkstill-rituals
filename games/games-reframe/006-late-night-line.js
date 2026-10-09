/* 006 Late Night Line — Reframe · REFRAME · Identity / Self
 * Mechanism: the double-standard technique (Burns; CBT) and self-compassion (Neff 2003). We answer a friend far more kindly
 * and fairly than we answer ourselves, so the player hosts a 2am call-in show and mixes a reply to a caller with three
 * faders: warmth, honesty and perspective (too little sounds hollow; too much turns syrupy, harsh or dismissive). They
 * broadcast it word by word, then learn the caller was them, and the same reply is pinned up "for you".
 * Verb: mix (slide three faders into balance, hold TALK to broadcast). Finale: the city lights up window by window as
 * listeners tune in, the ON AIR sign glows and dawn breaks over the skyline.
 */
(function (env) {
  'use strict';
  (env.games = env.games || []).push({
    id: 'late-night-line', mode: 'reframe', name: 'Late Night Line', verb: 'mix', family: 'REFRAME', minutes: 2,
    parents: ['Identity / Self', 'Inner Speech / Mental Text', 'Social / Team / Perspective'],
    cast: ['patch'], poster: { char: 'patch', mood: 'cosy' },
    tagline: 'Host a 2am call-in. Mix a kind, fair reply. Then hear who called.',
    why: 'For a harsh inner voice: answer yourself the way you would answer a friend.',
    css: `
.g-late-night-line .ln-onair { position: absolute; z-index: 21; left: 50%; transform: translateX(-50%); display: flex; align-items: baseline; gap: 8px; padding: 7px 14px 8px; border-radius: 9px; white-space: nowrap;
  font: 800 16px/1 var(--font-ui); letter-spacing: .24em; color: #6e2a26; background: #2a0b0b; border: 2px solid #4a1414; box-shadow: inset 0 0 10px rgba(0,0,0,.7), 0 4px 12px rgba(0,0,0,.45);
  transition: color .3s ease, box-shadow .3s ease, background .3s ease, border-color .3s ease; }
.g-late-night-line .ln-onair small { font: 700 12px/1 var(--font-ui); letter-spacing: .12em; opacity: .85; }
.g-late-night-line .ln-onair.is-warm { color: #ffc3b8; background: #5a1212; border-color: #8a2a24; box-shadow: 0 0 12px rgba(255,60,60,.35), inset 0 0 10px rgba(0,0,0,.5); }
.g-late-night-line .ln-onair.is-on { color: #fff4ef; background: #e0242b; border-color: #ff9a90; text-shadow: 0 0 8px rgba(255,255,255,.9);
  box-shadow: 0 0 18px rgba(255,60,60,.9), 0 0 48px rgba(255,40,40,.5), inset 0 0 12px rgba(255,210,200,.55); }
.g-late-night-line .ln-cap { position: absolute; z-index: 21; left: 50%; transform: translateX(-50%); box-sizing: border-box; width: max-content; max-width: calc(100% - 44px); padding: 9px 14px 10px; border-radius: 12px;
  background: rgba(8,9,22,.86); color: #f6f1ff; font: 600 15px/1.32 var(--font-ui); text-align: center; box-shadow: 0 8px 20px rgba(0,0,0,.45); border: 1px solid rgba(255,255,255,.12); transition: opacity .3s ease; }
.g-late-night-line .ln-cap[hidden] { display: none; }
.g-late-night-line .ln-cap b { display: block; font: 800 12px/1.2 var(--font-ui); letter-spacing: .16em; text-transform: uppercase; color: #ffb0a2; margin-bottom: 4px; }
.g-late-night-line .ln-cap.is-big .ln-capt { font-size: 26px; line-height: 1.1; color: #fff; text-shadow: 0 0 18px rgba(255,190,150,.8); }
.g-late-night-line .ln-cap.is-in { animation: late-night-line-in .35s cubic-bezier(.2,1.3,.4,1) both; }
@keyframes late-night-line-in { from { opacity: 0; transform: translate(-50%, 8px) scale(.96); } to { opacity: 1; transform: translate(-50%, 0); } }
.g-late-night-line .ln-card { position: absolute; z-index: 22; box-sizing: border-box; border-radius: 14px; padding: 12px 16px 14px; background: linear-gradient(180deg, #fffdf6, #f2e8d2); color: #2a2118;
  box-shadow: 0 16px 34px rgba(0,0,0,.5), inset 0 1px 0 #fff; transform-origin: 50% 0; transition: transform .5s cubic-bezier(.2,1.2,.4,1), box-shadow .4s ease; }
.g-late-night-line .ln-card.is-flip { animation: late-night-line-flip .5s ease both; }
@keyframes late-night-line-flip { 0% { transform: rotateX(0); } 45% { transform: perspective(700px) rotateX(78deg); } 55% { transform: perspective(700px) rotateX(-78deg); } 100% { transform: rotateX(0); } }
.g-late-night-line .ln-card h3 { margin: 0 0 8px; display: flex; justify-content: space-between; align-items: center; gap: 8px; font: 800 12px/1.2 var(--font-ui); letter-spacing: .16em; text-transform: uppercase; color: #8a5320; }
.g-late-night-line .ln-card h3 i { font-style: normal; display: inline-flex; align-items: center; gap: 6px; color: #b2361f; }
.g-late-night-line .ln-card h3 i::before { content: ""; width: 9px; height: 9px; border-radius: 50%; background: #e0302a; box-shadow: 0 0 8px #ff4d40; animation: late-night-line-blink 1.2s steps(2, end) infinite; }
@keyframes late-night-line-blink { 50% { opacity: .2; } }
.g-late-night-line .ln-text { margin: 0; font: 600 17px/1.36 var(--font-ui); text-wrap: pretty; overflow: hidden; }
.g-late-night-line .ln-text.is-clamp { display: -webkit-box; -webkit-box-orient: vertical; }
.g-late-night-line .ln-seg { border-radius: 4px; padding: 0 1px; transition: background .25s ease, color .25s ease; }
.g-late-night-line .ln-seg.k-w { box-shadow: inset 0 -3px 0 rgba(255,140,60,.55); }
.g-late-night-line .ln-seg.k-h { box-shadow: inset 0 -3px 0 rgba(30,170,160,.55); }
.g-late-night-line .ln-seg.k-p { box-shadow: inset 0 -3px 0 rgba(140,100,255,.5); }
.g-late-night-line .ln-seg.is-off { text-decoration: underline wavy rgba(200,40,40,.75); text-decoration-thickness: 1.5px; text-underline-offset: 4px; box-shadow: none; color: #7a3a2e; }
.g-late-night-line .ln-seg.is-new { animation: late-night-line-new .6s ease; }
@keyframes late-night-line-new { 0% { background: rgba(255,214,120,.75); } 100% { background: rgba(255,214,120,0); } }
.g-late-night-line .ln-card.is-air .ln-w { opacity: .38; transition: opacity .18s ease, color .18s ease, text-shadow .18s ease; }
.g-late-night-line .ln-card.is-air .ln-w.on { opacity: 1; color: #6a1410; text-shadow: 0 0 10px rgba(255,140,90,.55); }
.g-late-night-line .ln-card.is-pinned { transform: rotate(-1.2deg); box-shadow: 0 22px 40px rgba(0,0,0,.55), 0 0 0 10px #b9864e, 0 0 0 12px #6e4a22, inset 0 1px 0 #fff; }
.g-late-night-line .ln-card.is-pinned .ln-w { opacity: 1; color: inherit; text-shadow: none; }
.g-late-night-line .ln-wave { position: absolute; left: 16px; right: 16px; bottom: 9px; height: 24px; display: block; pointer-events: none; }
.g-late-night-line .ln-ring { display: flex; align-items: center; gap: 14px; }
.g-late-night-line .ln-ring svg { width: 54px; height: 54px; flex: none; color: #2fbf6a; animation: late-night-line-ring 1s ease-in-out infinite; }
.g-late-night-line .ln-ring span { font: 600 17px/1.35 var(--font-ui); }
.g-late-night-line .ln-pin { position: absolute; z-index: 24; width: 64px; height: 64px; margin: -32px 0 0 -32px; border: 0; padding: 0; border-radius: 50%; cursor: pointer; background: transparent; }
.g-late-night-line .ln-pin[hidden] { display: none; }
.g-late-night-line .ln-pin i { position: absolute; left: 50%; top: 50%; width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50%; background: radial-gradient(circle at 35% 32%, #ffb3a8, #e0302a 45%, #7a0d0a 100%);
  box-shadow: 0 6px 10px rgba(0,0,0,.45), inset 0 -2px 3px rgba(0,0,0,.35); transition: transform .25s cubic-bezier(.2,1.6,.4,1); }
.g-late-night-line .ln-pin.is-set i { transform: scale(.82); }
.g-late-night-line .ln-pin:focus-visible { outline: 3px solid var(--ui-accent); outline-offset: 2px; }
.g-late-night-line .ln-lcd { position: absolute; z-index: 21; display: flex; justify-content: space-between; align-items: center; gap: 10px; box-sizing: border-box; padding: 0 12px 0 40px; height: 28px; border-radius: 7px;
  background: linear-gradient(180deg, #0c1a14, #102419); color: #8dffb8; font: 700 12px/1 ui-monospace, "SF Mono", Menlo, Consolas, monospace; letter-spacing: .05em; text-transform: uppercase;
  text-shadow: 0 0 6px rgba(120,255,170,.6); box-shadow: inset 0 2px 6px rgba(0,0,0,.7), 0 1px 0 rgba(255,255,255,.12); white-space: nowrap; overflow: hidden; }
.g-late-night-line .ln-lcd span:first-child { overflow: hidden; text-overflow: ellipsis; }
.g-late-night-line .ln-fader { position: absolute; z-index: 23; touch-action: none; cursor: ew-resize; border-radius: 12px; outline: none; }
.g-late-night-line .ln-fader:focus-visible { box-shadow: 0 0 0 3px var(--ui-accent); }
.g-late-night-line .ln-flab { position: absolute; z-index: 22; display: flex; justify-content: space-between; align-items: baseline; pointer-events: none; font: 800 13px/1 var(--font-ui); letter-spacing: .14em; color: #f1ecff; text-shadow: 0 1px 2px rgba(0,0,0,.6); }
.g-late-night-line .ln-flab em { font: 700 13px/1 var(--font-ui); font-style: normal; letter-spacing: .04em; color: #c8c0e8; transition: color .2s ease; }
.g-late-night-line .ln-flab.is-sweet em { color: #8dffb8; }
.g-late-night-line .ln-flab.is-over em { color: #ffb0a2; }
.g-late-night-line .ln-talk { position: absolute; z-index: 23; border-radius: 50%; border: 0; padding: 0; cursor: pointer; touch-action: none; display: grid; place-items: center; text-align: center; color: #fff;
  font: 800 14px/1.1 var(--font-ui); letter-spacing: .08em; text-transform: uppercase; background: radial-gradient(circle at 40% 32%, #9aa0b0, #5b6070 55%, #2c303a); box-shadow: 0 10px 22px rgba(0,0,0,.55), inset 0 2px 0 rgba(255,255,255,.35), inset 0 -4px 0 rgba(0,0,0,.35), 0 0 0 5px #23262f, 0 0 0 7px #4a4f5c;
  transition: transform .1s ease, background .25s ease, box-shadow .25s ease; }
.g-late-night-line .ln-talk small { display: block; font: 700 12px/1.1 var(--font-ui); letter-spacing: .1em; opacity: .9; margin-top: 3px; }
.g-late-night-line .ln-talk.is-answer { background: radial-gradient(circle at 40% 32%, #b6ffcf, #2fbf6a 55%, #136b38); animation: late-night-line-ring 1s ease-in-out infinite; }
@keyframes late-night-line-ring { 0%, 100% { transform: rotate(0); } 10% { transform: rotate(-8deg); } 20% { transform: rotate(8deg); } 30% { transform: rotate(-5deg); } 40% { transform: rotate(0); } }
.g-late-night-line .ln-talk.is-ready { background: radial-gradient(circle at 40% 32%, #ffb3a8, #e0302a 55%, #7a0d0a); box-shadow: 0 10px 22px rgba(0,0,0,.55), 0 0 26px rgba(255,70,60,.55), inset 0 2px 0 rgba(255,255,255,.35), inset 0 -4px 0 rgba(0,0,0,.35), 0 0 0 5px #23262f, 0 0 0 7px #8a2a24; }
.g-late-night-line .ln-talk.is-live { transform: scale(.94); background: radial-gradient(circle at 40% 32%, #fff0ea, #ff4a3c 50%, #9a120d); box-shadow: 0 6px 14px rgba(0,0,0,.5), 0 0 40px rgba(255,80,60,.9), inset 0 -2px 0 rgba(0,0,0,.3), 0 0 0 5px #23262f, 0 0 0 7px #ff8a80; }
.g-late-night-line .ln-talk:focus-visible { outline: 3px solid var(--ui-accent); outline-offset: 6px; }
.g-late-night-line.is-calm .ln-talk.is-answer, .g-late-night-line.is-calm .ln-ring svg, .g-late-night-line.is-calm .ln-card.is-flip, .g-late-night-line.is-calm .ln-card h3 i::before, .g-late-night-line.is-calm .ln-seg.is-new { animation: none; }
.g-late-night-line .gk-char.gk-side-left .gk-bubble { top: auto; bottom: 6px; }
.g-late-night-line .gk-char.gk-side-left .gk-bubble::before { top: auto; bottom: 22px; }
@container (min-width: 700px) {
  .g-late-night-line .ln-text { font-size: 19px; }
  .g-late-night-line .ln-cap { font-size: 17px; max-width: 640px; }
  .g-late-night-line .ln-lcd { font-size: 13px; }
  .g-late-night-line .ln-talk { font-size: 16px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const inten = ctx.intensity, TAU = Math.PI * 2, visits = K.visits();
      const serious = () => an.fear_support === 'strong' || an.fear_support === 'some';
      const care = () => an.safety === 'care';

      /* ---------------- tonight's show (the same all day, different tomorrow) ---------------- */
      const WEATHER = K.dailyPick(['clear', 'rain', 'fog', 'snow', 'moon'], 1);
      const RECORDS = [
        { name: 'Rainy Window', c: '#5aa9ff' }, { name: 'Night Bus', c: '#ff7a59' }, { name: 'Slow Kettle', c: '#9ad17f' }, { name: 'Neon Moth', c: '#ff5fa2' },
        { name: 'Last Train Home', c: '#b49cff' }, { name: 'Porch Light', c: '#ffd36b' }, { name: 'Sleepy Static', c: '#46c9e5' }
      ];
      const REC = K.dailyPick(RECORDS, 2);
      const FREQ = K.dailyPick(['88.7', '91.3', '94.1', '98.9', '102.5', '104.9', '107.7'], 3);
      const REC_KEY = REC.name + ' record';
      const owned = K.collection();

      /* ---------------- words (the player's own, re-voiced, never invented) ---------------- */
      function tidy(s) {
        s = String(s || '').replace(/\s+/g, ' ').trim().replace(/^[\s"“”'’.,;:–—-]+/, '').trim();
        if (!s) return '';
        const close = (open, shut) => {
          const o = s.split(open).length - 1, c = open === shut ? 0 : s.split(shut).length - 1;
          if (open === shut ? o % 2 === 0 : o <= c) return;
          const at = s.lastIndexOf(open), m = /[.!?…]+/.exec(s.slice(at + 1));
          if (m) { const end = at + 1 + m.index + m[0].length; s = s.slice(0, end) + shut + s.slice(end); } else s += shut;
        };
        close('"', '"'); close('“', '”');
        s = s[0].toUpperCase() + s.slice(1);
        if (!/[.!?…"”’)]$/.test(s)) s += '.';
        return s;
      }
      const lowerFirst = (s) => !s || /^I(\b|['’])/.test(s) ? s : s[0].toLowerCase() + s.slice(1);
      const sentences = (s) => (String(s || '').match(/[^.!?…]+(?:[.!?…]+["”’)]*|$)/g) || []).map(x => x.trim()).filter(x => x.length > 1);
      const toSecond = (t) => (S.analysis && S.analysis.toSecond ? S.analysis.toSecond(String(t || '')) : String(t || ''));
      const OBJ = /^(to|with|at|for|about|of|on|from|by|like|than|without|towards?|against|around|told|asked|texted|called|emailed|messaged|sent|gave|give|gives|ignored|ignores|ignore|hates?|loves?|likes?|sees?|saw|left|wants?|needs?|helped|help|thanked|blamed|judged|pinged|invited|tell|ask|call|text|email|meet|met|fire|fired|leave|chose|picked|warned|owes?|let|made|make|makes|thinks?|showed|show|asking|telling|calling|texting|ghosted|dumped|joined|replied|answered|reached|contacted|noticed|watched|heard|after|before|behind|beside|near|into|onto|upon|under|over|past)$/i;
      function toFirst(s) {
        const parts = String(s || '').split(/("[^"]*"|“[^”]*”)/);
        return parts.map((seg, i) => {
          if (i % 2) return seg;
          let t = seg.replace(/\byou(?:'|’)re\b/gi, 'I’m').replace(/\byou are\b/gi, 'I am').replace(/\byou were\b/gi, 'I was').replace(/\byou(?:'|’)ve\b/gi, 'I’ve')
            .replace(/\byou(?:'|’)ll\b/gi, 'I’ll').replace(/\byou(?:'|’)d\b/gi, 'I’d').replace(/\byourself\b/gi, 'myself').replace(/\byours\b/gi, 'mine').replace(/\byour\b/gi, 'my');
          t = t.replace(/([A-Za-z’']+)(\s+)you\b|\byou\b/gi, (m, prev, sp) => prev ? prev + sp + (OBJ.test(prev) || /ed$/i.test(prev) ? 'me' : 'I') : 'I');
          return t;
        }).join('').replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\bi\b/g, 'I');
      }
      let SEG = null, CALLER = '', CAPTHOUGHT = '', TAKE = '', SHORT = '';
      function buildTexts() {
        const feelRaw = String(an.feeling || 'uneasy').toLowerCase().replace(/[^a-z -]/g, '').trim() || 'uneasy';
        const feel = { stupid: 'small', useless: 'small', worthless: 'low', incompetent: 'shaken', fine: 'rattled' }[feelRaw] || feelRaw;
        /* the warmth fader owns the validation, so drop a leading "That sounds hard." from the friend line */
        const fr0 = tidy(an.friend), frS = sentences(fr0);
        const fr = (frS.length > 1 && /^(that|this|it)\s*(sounds|is|must be|’s|'s)\b[^.!?]{0,34}\b(hard|tough|rough|stressful|scary|awful|painful|a lot|horrible|difficult)\b/i.test(frS[0]) ? frS.slice(1).join(' ') : fr0)
          || 'That might not mean what it feels like it means. Check the facts before deciding.';
        const fix = (x) => tidy(String(x || '').replace(/\s*…\s*$/, ''));
        const balAll = fix(an.balanced), bss = sentences(balAll);
        const bal = bss.length > 1 ? fix(bss[bss.length - 1]) : balAll;
        const fu = tidy(an.future) || 'A year from now this will likely look smaller than it does tonight.';
        const leads = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text);
        const lead = leads.find(l => l.kind === 'prepare') || leads.find(l => l.kind === 'ask') || leads[0];
        const nw = (x) => String(x || '').split(/\s+/).filter(Boolean).length;
        let honest = serious() && bal ? tidy(toSecond(bal)) : fr;
        if (nw(honest) > 24) honest = fix(K.words(honest, 22));
        const step = lead ? 'First step: ' + lowerFirst(tidy(lead.text)) : '';
        let persp = fu;
        if (serious() && step) persp = (nw(honest) + nw(fu) + nw(step) + 11 > 42 ? '' : fu + ' ') + step;
        if (care()) persp += ' Someone qualified can help with the rest.';
        SEG = {
          w: ['', 'That sounds hard.', 'That sounds really hard, and feeling ' + feel + ' makes sense.', 'Oh no, you poor, poor thing! That’s the worst thing I’ve ever heard!'],
          h: ['I’m sure it’ll all be totally fine!', 'It might not mean what it feels like.', honest, serious() ? 'Honestly? It is what it is. Deal with it.' : 'Honestly? Just stop overthinking it.'],
          p: ['', 'It’s one moment, not the whole story.', persp, 'In the grand scheme of things, none of it really matters.']
        };
        const sit = tidy(toFirst(an.situation || '')), th = tidy(toFirst(an.thought || an.conclusion || ''));
        CALLER = (sit && sit !== 'Something happened.' ? sit + ' ' : '') + (th ? 'And I keep thinking: ' + lowerFirst(th) : 'And I can’t stop thinking about it.');
        CAPTHOUGHT = th || 'I can’t stop thinking about it.';
        TAKE = bal ? tidy(toFirst(bal)) : '';
        if (TAKE.split(/\s+/).length > 20) TAKE = K.words(TAKE, 18);
        const hs1 = (sentences(honest)[0] || honest).replace(/[.!?…]+["”’]?$/, '');
        SHORT = K.words(lowerFirst(hs1), 14);
      }
      buildTexts();

      /* ---------------- lines (every vibe) ---------------- */
      const LN = {
        ring: { Jolly: 'Ooh, line one is ringing! Answer it, host.', Cheeky: 'Two in the morning and the phone’s ringing. Classic. Pick up.', Unfiltered: 'Line one. Answer it.' },
        back: { Jolly: 'Welcome back to the late shift! Line one’s already ringing.', Cheeky: 'Back for another night shift? Love that. Phone’s ringing.', Unfiltered: 'Late shift again. Line one. Answer.' },
        onAir: { Jolly: 'Caller, you’re on the air!', Cheeky: 'You’re live, caller. No swearing, please.', Unfiltered: 'You’re on.' },
        mix: { Jolly: 'Your turn, host. Mix them a reply with the three faders.', Cheeky: 'Right, Mr or Ms Radio. Three faders. Make it good.', Unfiltered: 'Your reply. Three faders. Mix it.' },
        hollow: { Jolly: '“It’ll be fine”? We can’t promise that. Try more honesty.', Cheeky: '“Totally fine”? Bold promise for 2am. More honesty.', Unfiltered: 'Empty promise. Turn honesty up.' },
        syrup: { Jolly: 'Steady on, that’s a lot of syrup. A touch less warmth.', Cheeky: 'Sweet, but I’m getting a toothache. Ease off.', Unfiltered: 'Too sugary. Pull warmth back.' },
        harsh: { Jolly: 'Bit harsh! Kind and true can share a sentence.', Cheeky: 'Oof. Would you say that to a friend? Ease off.', Unfiltered: 'Too blunt. Pull honesty back.' },
        dismiss: { Jolly: 'Careful, that sounds like “who cares”. It matters to them.', Cheeky: '“None of it matters”? Tell that to the caller. Ease off.', Unfiltered: 'Dismissive. Pull perspective back.' },
        vague: { Jolly: 'Closer. A bit more honesty and it really lands.', Cheeky: 'Vague-ish. Turn honesty up a notch.', Unfiltered: 'More honesty.' },
        cold: { Jolly: 'A little warmth helps it land. Nudge it up.', Cheeky: 'Bit chilly in here. Warm it up.', Unfiltered: 'Needs warmth.' },
        narrow: { Jolly: 'Zoom out a little. Turn up perspective.', Cheeky: 'Give it a wider lens. Perspective up.', Unfiltered: 'Needs perspective.' },
        ready: { Jolly: 'That’s the one. Warm, honest, and it zooms out. Hold TALK to go on air.', Cheeky: 'Ooh, radio gold. Hold TALK before you overthink it.', Unfiltered: 'Good mix. Hold TALK.' },
        pause: { Jolly: 'Take your time. Hold TALK when you’re ready.', Cheeky: 'Dead air! Very avant-garde. Hold TALK to carry on.', Unfiltered: 'Hold TALK to keep going.' },
        thanks: { Jolly: 'Aww. They sound lighter already.', Cheeky: 'Look at you, helping strangers at 2am.', Unfiltered: 'That landed.' },
        twist: { Jolly: 'Wait… the caller was you all along. Same advice, then. Now it’s yours.', Cheeky: 'Plot twist! You were the caller. So, take your own advice?', Unfiltered: 'It was you. Same advice. Keep it.' },
        twistCare: { Jolly: 'The caller was you all along. Same advice, now for you. And real help is allowed too.', Cheeky: 'The caller was you. Same advice for you, plus proper help for the real stuff.', Unfiltered: 'It was you. Same advice. Get proper help for the rest.' },
        pin: { Jolly: 'Pin it on the board, for you.', Cheeky: 'Pin it up. Fridge-door worthy.', Unfiltered: 'Pin it.' },
        final: { Jolly: 'Look, the whole city was listening. Morning’s coming.', Cheeky: 'Ratings through the roof. And look, sunrise. Show-off.', Unfiltered: 'City’s up. Dawn’s here. Good show.' }
      };

      /* ---------------- state ---------------- */
      const G = { amp: 0, stage: 'intro', f: [0.12, 0.12, 0.12], lvl: [-1, -1, -1], holding: false, words: [], wi: 0, sub: -1, dawn: 0, finT: 0, glow: 0, vu: [0, 0, 0], listeners: 0, saidAt: 0, mixT: 0 };
      const ZONE = [0.5, 0.88], CENTER = 0.69;
      const lvlOf = (v) => v < 0.22 ? 0 : v < ZONE[0] ? 1 : v < ZONE[1] ? 2 : 3;
      const inZone = (v) => v >= ZONE[0] && v < ZONE[1];
      const ready = () => G.f.every(inZone);
      const FADERS = [{ k: 'w', name: 'WARMTH', col: '#ff9a4a' }, { k: 'h', name: 'HONESTY', col: '#2ec4b6' }, { k: 'p', name: 'PERSPECTIVE', col: '#9b7bff' }];

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { maxDpr: 1.5 });
      el.classList.toggle('is-calm', K.reduced()); S.on('motion', (v) => el.classList.toggle('is-calm', !!v));
      const P = K.particles();
      const onair = h('div', { class: 'ln-onair', 'aria-hidden': 'true' }, h('span', { text: 'ON AIR' }), h('small', { text: FREQ + ' FM' }));
      const capT = h('span', { class: 'ln-capt gk-user' }), capB = h('b', { text: 'Line 1 · caller from the suburbs' });
      const cap = h('div', { class: 'ln-cap', role: 'status', 'aria-live': 'polite', hidden: true }, capB, capT);
      const cardH = h('span', { text: 'Live transcript · line 1' }), cardTag = h('i', { text: 'live' });
      const cardText = h('p', { class: 'ln-text gk-user' });
      const wave = h('canvas', { class: 'ln-wave', 'aria-hidden': 'true' });
      const card = h('div', { class: 'ln-card', hidden: true }, h('h3', null, cardH, cardTag), cardText, wave);
      const pin = h('button', { type: 'button', class: 'ln-pin', 'aria-label': 'Pin the reply on the studio board, for you', hidden: true }, h('i'));
      const lcdL = h('span', { text: FREQ + ' FM · ' + REC.name }), lcdR = h('span', { text: 'Listeners 0' });
      const lcd = h('div', { class: 'ln-lcd', 'aria-hidden': 'true' }, lcdL, lcdR);
      const fEls = FADERS.map((f, i) => h('div', { class: 'ln-fader', role: 'slider', tabindex: '0', 'aria-label': f.name.toLowerCase() + ' fader', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '12' }));
      const fLabs = FADERS.map(f => { const em = h('em', { text: '12%' }); const l = h('div', { class: 'ln-flab', 'aria-hidden': 'true' }, h('span', { text: f.name }), em); l.em = em; return l; });
      const talkB = h('button', { type: 'button', class: 'ln-talk', 'aria-label': 'Answer line one' });
      el.append(onair, cap, card, pin, lcd, ...fEls, ...fLabs, talkB);
      const patch = K.character('patch', { side: 'left', mood: 'cosy', x: 0, y: 0 });
      const say = (lines, o) => { G.saidAt = performance.now(); return patch.say(ctx.line(care() ? Object.assign({}, lines, { Cheeky: lines.Jolly }) : lines), o); }; /* no jokes near a care-level concern */
      function setTalk(kind) {
        talkB.className = 'ln-talk' + (kind === 'answer' ? ' is-answer' : kind === 'ready' ? ' is-ready' : kind === 'live' ? ' is-ready is-live' : '');
        const lab = { answer: ['Answer', 'Line 1'], wait: ['Listening', 'Caller'], mix: ['Mix', 'first'], ready: ['Hold', 'to talk'], live: ['On air', 'Holding'], done: ['Off air', ''] }[kind] || ['', ''];
        talkB.innerHTML = ''; talkB.append(h('span', null, lab[0], lab[1] ? h('small', { text: lab[1] }) : null));
        talkB.setAttribute('aria-label', kind === 'answer' ? 'Answer line one' : kind === 'ready' || kind === 'live' ? 'Hold to talk on air' : lab.join(' '));
      }
      setTalk('wait');

      /* ---------------- layout ---------------- */
      const L = { W: 0, H: 0 };
      const BG = document.createElement('canvas'), SKY = document.createElement('canvas'), FG = document.createElement('canvas');
      let WINS = [], order = [], STARS = [];
      const WCOLS = ['#bfe0ff', '#ffd88a', '#ffbf6e'];
      function layout() {
        const W = cv.w || el.clientWidth || 390, H = cv.h || el.clientHeight || 844, phone = W < 700;
        Object.assign(L, { W, H, phone });
        if (phone) {
          L.win = { x: 14, y: 66, w: W - 28, h: Math.round(K.clamp(H * 0.23, 160, 230)) };
          L.card = { x: 14, y: L.win.y + L.win.h + 14, w: W - 28 };
          L.deskY = Math.max(L.card.y + 232, H - 340);
          L.card.h = L.deskY - 10 - L.card.y;
          L.lcd = { x: 14, y: L.deskY + 10, w: W - 28 };
          L.fx0 = 30; L.fx1 = W - 130; L.fy = [L.deskY + 82, L.deskY + 142, L.deskY + 202];
          L.talk = { x: W - 66, y: L.deskY + 138, r: 48 };
          L.ch = { size: 84, x: W - 96, y: H - 98 };
        } else {
          L.win = { x: Math.round((W - 800) / 2), y: 70, w: 800, h: Math.round(K.clamp(H * 0.34, 220, 320)) };
          L.card = { x: Math.round((W - 720) / 2), y: L.win.y + L.win.h + 16, w: 720 };
          L.deskY = Math.max(L.card.y + 186, H - 300);
          L.card.h = L.deskY - 12 - L.card.y;
          L.lcd = { x: Math.round(W / 2 - 330), y: L.deskY + 12, w: 660 };
          L.fx0 = Math.round(W / 2 - 300); L.fx1 = Math.round(W / 2 + 140); L.fy = [L.deskY + 84, L.deskY + 140, L.deskY + 196];
          L.talk = { x: Math.round(W / 2 + 250), y: L.deskY + 140, r: 58 };
          L.ch = { size: 104, x: W - 120, y: H - 118 };
        }
        onair.style.top = (L.win.y + 10) + 'px';
        cap.style.bottom = (H - (L.win.y + L.win.h) + 10) + 'px';
        Object.assign(card.style, { left: L.card.x + 'px', top: L.card.y + 'px', width: L.card.w + 'px', height: L.card.h + 'px' });
        pin.style.left = (L.card.x + L.card.w / 2) + 'px'; pin.style.top = (L.card.y + 2) + 'px';
        Object.assign(lcd.style, { left: L.lcd.x + 'px', top: L.lcd.y + 'px', width: L.lcd.w + 'px' });
        fEls.forEach((e, i) => Object.assign(e.style, { left: (L.fx0 - 18) + 'px', top: (L.fy[i] - 26) + 'px', width: (L.fx1 - L.fx0 + 36) + 'px', height: '52px' }));
        fLabs.forEach((e, i) => Object.assign(e.style, { left: (L.fx0 - 6) + 'px', top: (L.fy[i] - 34) + 'px', width: (L.fx1 - L.fx0 + 12) + 'px' }));
        const d = L.talk.r * 2; Object.assign(talkB.style, { left: (L.talk.x - L.talk.r) + 'px', top: (L.talk.y - L.talk.r) + 'px', width: d + 'px', height: d + 'px' });
        patch.el.style.setProperty('--sz', L.ch.size + 'px'); patch.place(L.ch.x, L.ch.y);
        sizeWave();
        buildSkyline(); buildBg(); buildFg(); fitCard();
        L.oa = K.rectIn(onair); G.drawnOnce = false;
      }

      /* ---------------- the city (baked) ---------------- */
      function buildSkyline() {
        const dpr = cv.dpr || 1, w = L.win.w, H = L.win.h, r = K.rng('late-night-city');
        SKY.width = Math.max(2, Math.round(w * dpr)); SKY.height = Math.max(2, Math.round(H * dpr));
        const g = SKY.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, H);
        WINS = [];
        const s = L.phone ? 1 : 1.3;
        const layer = (base, col, minH, maxH, winC, near) => {
          for (let x = -10; x < w + 10;) {
            const bw = (near ? 26 + r() * 40 : 18 + r() * 30) * s, bh = H * (minH + r() * (maxH - minH)), top = base - bh;
            g.fillStyle = col; g.fillRect(x, top, bw, bh + 2);
            if (r() < 0.3) { g.fillRect(x + bw * 0.4, top - 10 * s, 3, 10 * s); }
            if (near && r() < 0.35) { g.beginPath(); g.moveTo(x - 1, top); g.lineTo(x + bw / 2, top - bw * 0.3); g.lineTo(x + bw + 1, top); g.closePath(); g.fill(); }
            const cw = (near ? 7 : 5) * s, chh = (near ? 9 : 7) * s, ww = (near ? 3.4 : 2.4) * s, wh = (near ? 4.6 : 3.2) * s;
            for (let yy = top + 6 * s; yy < base - 8; yy += chh) for (let xx = x + 4 * s; xx < x + bw - 4 * s; xx += cw) {
              g.fillStyle = winC; g.fillRect(xx, yy, ww, wh);
              if (r() < (near ? 0.8 : 0.45)) WINS.push({ x: xx, y: yy, w: ww, h: wh, lit: 0, on: false, ci: r() < 0.14 ? 0 : r() < 0.5 ? 1 : 2 });
            }
            x += bw + (near ? 2 + r() * 8 : 1 + r() * 4) * s;
          }
        };
        layer(H * 0.92, '#1d2547', 0.28, 0.6, '#262f57', false);
        layer(H + 2, '#0c1024', 0.22, 0.52, '#151a33', true);
        order = K.shuffle(WINS.map((x, i) => i), K.rng('order'));
        const pre = Math.min(order.length, 6 + Math.min(visits, 10) * 7);
        for (let i = 0; i < pre; i++) { const wn = WINS[order[i]]; wn.on = true; wn.lit = 1; }
        G.lit = pre; G.listeners = pre * 7 + 3; lcdR.textContent = 'Listeners ' + G.listeners;
        STARS = Array.from({ length: L.phone ? 46 : 90 }, () => ({ x: r() * w, y: r() * H * 0.6, s: 0.6 + r() * 1.4, ph: r() * 6 }));
      }
      function lightOne(burst) {
        if (G.lit >= order.length) return null;
        const wn = WINS[order[G.lit++]]; wn.on = true; wn.lit = 0.01;
        if (burst) P.emit('spark', L.win.x + wn.x, L.win.y + wn.y, 2, { colors: [WCOLS[wn.ci], '#ffffff'], speed: [10, 40] });
        G.listeners = G.lit * 7 + 3; lcdR.textContent = 'Listeners ' + G.listeners;
        return wn;
      }

      /* ---------------- studio (baked) ---------------- */
      function rr(g, x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function buildBg() {
        const dpr = cv.dpr || 1, W = L.W, H = L.H, dark = K.dark(), wn = L.win;
        BG.width = Math.max(2, Math.round(W * dpr)); BG.height = Math.max(2, Math.round(H * dpr));
        const g = BG.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const wall = g.createLinearGradient(0, 0, 0, L.deskY); wall.addColorStop(0, dark ? '#1a1530' : '#3a3150'); wall.addColorStop(1, dark ? '#120e22' : '#2a2340');
        g.fillStyle = wall; g.fillRect(0, 0, W, H);
        /* acoustic foam tiles */
        const ts = L.phone ? 34 : 42;
        for (let y = 0, row = 0; y < L.deskY; y += ts, row++) for (let x = (row % 2) * ts / 2 - ts; x < W; x += ts) {
          const gr = g.createLinearGradient(x, y, x + ts, y + ts); gr.addColorStop(0, dark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.07)'); gr.addColorStop(1, 'rgba(0,0,0,0.18)');
          g.fillStyle = gr; g.beginPath(); g.moveTo(x + ts / 2, y + 2); g.lineTo(x + ts - 2, y + ts / 2); g.lineTo(x + ts / 2, y + ts - 2); g.lineTo(x + 2, y + ts / 2); g.closePath(); g.fill();
        }
        const lamp = g.createRadialGradient(W * 0.5, L.card.y, 20, W * 0.5, L.card.y, Math.max(W, H) * 0.7); lamp.addColorStop(0, 'rgba(255,170,90,0.18)'); lamp.addColorStop(1, 'rgba(255,170,90,0)');
        g.fillStyle = lamp; g.fillRect(0, 0, W, H);
        /* window frame */
        g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 24; g.shadowOffsetY = 10;
        g.fillStyle = '#2a1d14'; rr(g, wn.x - 9, wn.y - 9, wn.w + 18, wn.h + 18, 14); g.fill(); g.restore();
        const fr = g.createLinearGradient(0, wn.y - 9, 0, wn.y + wn.h + 9); fr.addColorStop(0, '#6a4a30'); fr.addColorStop(0.5, '#4a3220'); fr.addColorStop(1, '#2e1f14');
        g.fillStyle = fr; rr(g, wn.x - 8, wn.y - 8, wn.w + 16, wn.h + 16, 13); g.fill();
        g.fillStyle = '#05060f'; rr(g, wn.x, wn.y, wn.w, wn.h, 7); g.fill();
        if (!L.phone) decor(g, dark);
        /* desk */
        const dy = L.deskY;
        g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 20; g.shadowOffsetY = -6;
        const top = g.createLinearGradient(0, dy, 0, dy + 14); top.addColorStop(0, '#5a5f6e'); top.addColorStop(1, '#2a2d36');
        g.fillStyle = top; g.fillRect(0, dy, W, 14); g.restore();
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, dy, W, 1.5);
        const body = g.createLinearGradient(0, dy + 14, 0, H); body.addColorStop(0, '#22252e'); body.addColorStop(1, '#121318');
        g.fillStyle = body; g.fillRect(0, dy + 14, W, H - dy - 14);
        for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.012 + (i % 3) * 0.006) + ')'; g.fillRect(0, dy + 16 + i * ((H - dy) / 40), W, 1); }
        /* channel strips */
        FADERS.forEach((f, i) => {
          const y = L.fy[i], x0 = L.fx0, x1 = L.fx1;
          g.fillStyle = 'rgba(0,0,0,0.35)'; rr(g, x0 - 16, y - 40, x1 - x0 + 32, 58, 10); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 1; g.stroke();
          g.fillStyle = '#05060a'; rr(g, x0 - 4, y - 4, x1 - x0 + 8, 8, 4); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(x0, y + 4, x1 - x0, 1);
          for (let k = 0; k <= 20; k++) { const x = x0 + (x1 - x0) * k / 20, big = k % 5 === 0; g.fillStyle = 'rgba(220,225,240,' + (big ? 0.45 : 0.22) + ')'; g.fillRect(x - 0.5, y + 9, 1, big ? 7 : 4); }
          const z0 = x0 + (x1 - x0) * ZONE[0], z1 = x0 + (x1 - x0) * ZONE[1];
          g.fillStyle = 'rgba(80,255,150,0.28)'; g.fillRect(z0, y + 9, z1 - z0, 3);
          g.fillStyle = 'rgba(140,255,190,0.9)'; g.fillRect(x0 + (x1 - x0) * CENTER - 1, y + 7, 2, 10);
        });
        /* talk well */
        const t = L.talk; g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(t.x, t.y + 4, t.r + 16, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 2; g.beginPath(); g.arc(t.x, t.y, t.r + 14, 0, TAU); g.stroke();
        [[10, 10], [W - 10, 10], [10, H - L.deskY - 10], [W - 10, H - L.deskY - 10]].forEach(([x, yy]) => { g.fillStyle = '#6b707e'; g.beginPath(); g.arc(x, dy + 14 + yy, 3, 0, TAU); g.fill(); });
        drawCat(g);
      }
      function decor(g, dark) {
        const wn = L.win, lx = wn.x - 200, w0 = 170;
        if (lx > 10) {
          for (let s = 0; s < 3; s++) {
            const y = wn.y + 40 + s * 90;
            g.fillStyle = '#4a3220'; g.fillRect(lx, y + 64, w0, 8); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(lx, y + 72, w0, 4);
            for (let k = 0; k < 7; k++) { const c = RECORDS[(s * 7 + k) % RECORDS.length].c, x = lx + 6 + k * 23, hh = 52 + (k % 3) * 5; g.fillStyle = K.hexA(c, 0.85); g.fillRect(x, y + 64 - hh, 18, hh); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 14, y + 64 - hh, 4, hh); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 4, y + 70 - hh, 10, 2); }
          }
        }
        const rx = wn.x + wn.w + 30, rw = Math.min(190, L.W - rx - 24);
        if (rw > 100) {
          const by = wn.y + 10, bh = 230;
          g.fillStyle = '#5a3a1e'; rr(g, rx - 6, by - 6, rw + 12, bh + 12, 8); g.fill();
          const cork = g.createLinearGradient(rx, by, rx + rw, by + bh); cork.addColorStop(0, '#c99a62'); cork.addColorStop(1, '#a8794a'); g.fillStyle = cork; g.fillRect(rx, by, rw, bh);
          const rn = K.rng('cork'); for (let i = 0; i < 160; i++) { g.fillStyle = rn() < 0.5 ? 'rgba(90,55,20,0.25)' : 'rgba(255,230,190,0.2)'; g.fillRect(rx + rn() * rw, by + rn() * bh, 1.6, 1.6); }
          [['#fff6c8', -0.08, 0.1, 0.12], ['#c8f0ff', 0.06, 0.52, 0.2], ['#ffd0e0', -0.04, 0.2, 0.56]].forEach(([c, a, fx, fy]) => { g.save(); g.translate(rx + rw * fx + 30, by + bh * fy + 30); g.rotate(a); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-28, -24, 62, 56); g.fillStyle = c; g.fillRect(-30, -28, 60, 54); g.fillStyle = 'rgba(60,40,30,0.35)'; for (let l = 0; l < 4; l++) g.fillRect(-22, -16 + l * 10, 40 - (l % 2) * 12, 2); g.fillStyle = '#e0302a'; g.beginPath(); g.arc(0, -24, 4, 0, TAU); g.fill(); g.restore(); });
        }
        void dark;
      }
      function buildFg() {
        /* only the mic region is cached (a small canvas), so the per-frame cost stays tiny */
        const dpr = cv.dpr || 1, s = L.phone ? 0.78 : 1.15;
        const bx = L.win.x + L.win.w - 34 * s - 30 * s, by = L.win.y - 12, bw = L.W - bx, bh = L.win.h + 12;
        L.fg = { x: bx, y: by, w: bw, h: bh };
        FG.width = Math.max(2, Math.round(bw * dpr)); FG.height = Math.max(2, Math.round(bh * dpr));
        const g = FG.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, bw, bh); g.translate(-bx, -by);
        const mx = L.win.x + L.win.w - 34 * s, my = L.win.y + L.win.h - 46 * s;
        g.strokeStyle = '#1b1c22'; g.lineWidth = 6 * s; g.lineCap = 'round';
        g.beginPath(); g.moveTo(L.win.x + L.win.w + 12, L.win.y - 4); g.lineTo(mx + 12 * s, my - 70 * s); g.lineTo(mx, my - 34 * s); g.stroke();
        g.strokeStyle = '#4a4d58'; g.lineWidth = 2 * s; g.stroke();
        const body = g.createLinearGradient(mx - 14 * s, 0, mx + 14 * s, 0); body.addColorStop(0, '#2a2c33'); body.addColorStop(0.45, '#9da2b0'); body.addColorStop(1, '#1e2026');
        g.fillStyle = body; rr(g, mx - 14 * s, my - 36 * s, 28 * s, 52 * s, 13 * s); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i < 6; i++) g.fillRect(mx - 10 * s, my - 30 * s + i * 7 * s, 20 * s, 2 * s);
        g.fillStyle = '#c8a24a'; g.fillRect(mx - 15 * s, my - 4 * s, 30 * s, 4 * s);
      }
      /* the studio cat naps on the desk after a first visit (baked into the studio) */
      function drawCat(g) {
        if (visits < 1) return;
        const cx = L.phone ? L.W * 0.5 - 40 : L.lcd.x + L.lcd.w + 70, cy = L.deskY + (L.phone ? 2 : 4);
        g.fillStyle = '#17161c'; g.beginPath(); g.ellipse(cx, cy - 9, 26, 12, 0, Math.PI, TAU); g.fill();
        g.beginPath(); g.arc(cx + 22, cy - 12, 8.5, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(cx + 16, cy - 18); g.lineTo(cx + 18, cy - 26); g.lineTo(cx + 22, cy - 19); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(cx + 23, cy - 19); g.lineTo(cx + 28, cy - 26); g.lineTo(cx + 29, cy - 17); g.closePath(); g.fill();
        g.strokeStyle = '#17161c'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - 24, cy - 4); g.quadraticCurveTo(cx - 40, cy - 6, cx - 34, cy - 16); g.stroke();
        g.strokeStyle = 'rgba(255,220,150,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + 19, cy - 12); g.lineTo(cx + 23, cy - 12); g.moveTo(cx + 25, cy - 12); g.lineTo(cx + 28, cy - 12); g.stroke();
      }

      /* ---------------- live drawing ---------------- */
      const lerp = (a, b, k) => a + (b - a) * k;
      function mixC(a, b, k) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const c = (s) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, k)); return 'rgb(' + c(16) + ',' + c(8) + ',' + c(0) + ')'; }
      function drawWindow(g, t, bt) {
        const wn = L.win, d = G.dawn;
        g.save(); rr(g, wn.x, wn.y, wn.w, wn.h, 7); g.clip();
        const sky = g.createLinearGradient(0, wn.y, 0, wn.y + wn.h);
        sky.addColorStop(0, mixC('#070a1c', '#2c3c7e', d)); sky.addColorStop(0.55, mixC('#121a3e', '#c46a8a', d)); sky.addColorStop(1, mixC('#1e2850', '#ffb36b', d));
        g.fillStyle = sky; g.fillRect(wn.x, wn.y, wn.w, wn.h);
        if (d < 1) STARS.forEach(s => { g.globalAlpha = (1 - d) * (0.35 + 0.45 * Math.sin(t * 1.3 + s.ph)) * (WEATHER === 'fog' || WEATHER === 'rain' ? 0.3 : 1); g.fillStyle = '#fff'; g.fillRect(wn.x + s.x, wn.y + s.y, s.s, s.s); });
        g.globalAlpha = 1;
        const mr = WEATHER === 'moon' ? 22 : 12, mxx = wn.x + wn.w * 0.18, myy = wn.y + wn.h * 0.22 + d * 30;
        if (d < 0.6) {
          g.save(); g.globalAlpha = 1 - d / 0.6;
          const mg = g.createRadialGradient(mxx, myy, mr * 0.5, mxx, myy, mr * 4); mg.addColorStop(0, 'rgba(230,236,255,0.35)'); mg.addColorStop(1, 'rgba(230,236,255,0)');
          g.fillStyle = mg; g.fillRect(mxx - mr * 4, myy - mr * 4, mr * 8, mr * 8);
          g.beginPath(); g.arc(mxx, myy, mr, 0, TAU);
          if (WEATHER !== 'moon') { g.save(); g.clip(); g.beginPath(); g.rect(mxx - mr * 2, myy - mr * 2, mr * 4, mr * 4); g.arc(mxx + mr * 0.45, myy - mr * 0.2, mr * 0.9, 0, TAU); g.clip('evenodd'); g.fillStyle = '#f5f7ff'; g.fillRect(mxx - mr, myy - mr, mr * 2, mr * 2); g.restore(); }
          else { g.fillStyle = '#f5f7ff'; g.fill(); g.fillStyle = 'rgba(180,190,220,0.35)'; [[0.3, -0.2, 0.22], [-0.3, 0.25, 0.16], [0.1, 0.4, 0.12]].forEach(([a, b, c]) => { g.beginPath(); g.arc(mxx + a * mr, myy + b * mr, c * mr, 0, TAU); g.fill(); }); }
          g.restore();
        }
        if (d > 0) {
          const sx = wn.x + wn.w * 0.64, sy = wn.y + wn.h * (1.05 - K.ease.outCubic(d) * 0.62), sr = L.phone ? 20 : 32;
          const sg = g.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 6); sg.addColorStop(0, 'rgba(255,214,140,' + (0.85 * d) + ')'); sg.addColorStop(1, 'rgba(255,170,100,0)');
          g.fillStyle = sg; g.fillRect(sx - sr * 6, sy - sr * 6, sr * 12, sr * 12);
          g.save(); g.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.28 + Math.sin(t * 0.2) * 0.03; g.strokeStyle = 'rgba(255,220,160,' + (0.12 * d) + ')'; g.lineWidth = sr * 0.5; g.beginPath(); g.moveTo(sx + Math.cos(a) * sr * 1.3, sy + Math.sin(a) * sr * 1.3); g.lineTo(sx + Math.cos(a) * sr * 7, sy + Math.sin(a) * sr * 7); g.stroke(); }
          g.restore();
          g.fillStyle = 'rgba(255,246,214,' + d + ')'; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
        }
        g.drawImage(SKY, wn.x, wn.y, wn.w, wn.h);
        if (d > 0) { g.fillStyle = 'rgba(255,160,110,' + (0.18 * d) + ')'; g.fillRect(wn.x, wn.y, wn.w, wn.h); }
        for (let gi = 0; gi < 3; gi++) for (let ci = 0; ci < WCOLS.length; ci++) {
          g.globalAlpha = 0.8 + 0.2 * Math.sin(t * 1.7 + gi * 2.1 + bt * 0.8); g.fillStyle = WCOLS[ci]; g.beginPath();
          let any = false;
          for (let i = gi; i < WINS.length; i += 3) { const w = WINS[i]; if (!w.on || w.ci !== ci) continue; if (w.lit < 1) { w.lit = Math.min(1, w.lit + 0.06); continue; } g.rect(wn.x + w.x, wn.y + w.y, w.w, w.h); any = true; }
          if (any) g.fill();
        }
        for (const w of WINS) { if (w.on && w.lit < 1) { g.globalAlpha = w.lit; g.fillStyle = WCOLS[w.ci]; g.fillRect(wn.x + w.x, wn.y + w.y, w.w, w.h); } }
        g.globalAlpha = 1;
        if (WEATHER === 'fog') { for (let i = 0; i < 3; i++) { const fy = wn.y + wn.h * (0.55 + i * 0.15), fx = ((t * (8 + i * 4)) % (wn.w + 300)) - 150; const fg = g.createLinearGradient(0, fy - 20, 0, fy + 20); fg.addColorStop(0, 'rgba(170,180,210,0)'); fg.addColorStop(0.5, 'rgba(170,180,210,' + (0.16 * (1 - d * 0.6)) + ')'); fg.addColorStop(1, 'rgba(170,180,210,0)'); g.fillStyle = fg; g.fillRect(wn.x, fy - 20, wn.w, 40); void fx; } }
        if (WEATHER === 'snow') { g.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 50; i++) { const x = wn.x + ((i * 53.3 + Math.sin(t * 0.7 + i) * 10 + t * 8) % wn.w), y = wn.y + ((i * 37.7 + t * (18 + (i % 5) * 4)) % wn.h); g.fillRect(x, y, 2, 2); } }
        if (WEATHER === 'rain') {
          g.strokeStyle = 'rgba(200,215,255,0.28)'; g.lineWidth = 1; g.beginPath();
          for (let i = 0; i < 46; i++) { const x = wn.x + ((i * 71.3 + t * 30) % wn.w), y = wn.y + ((i * 41.1 + t * 260) % (wn.h + 20)) - 10; g.moveTo(x, y); g.lineTo(x - 3, y + 11); }
          g.stroke();
          g.fillStyle = 'rgba(220,230,255,0.35)'; for (let i = 0; i < 18; i++) { const x = wn.x + (i * 97.1) % wn.w, y = wn.y + ((i * 59.3 + t * (6 + i % 4)) % wn.h); g.beginPath(); g.ellipse(x, y, 1.6, 2.4, 0, 0, TAU); g.fill(); }
        }
        const gl = g.createLinearGradient(wn.x, wn.y, wn.x + wn.w * 0.6, wn.y + wn.h); gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.42, 'rgba(255,255,255,0.06)'); gl.addColorStop(0.5, 'rgba(255,255,255,0.015)'); gl.addColorStop(0.58, 'rgba(255,255,255,0.05)'); gl.addColorStop(0.7, 'rgba(255,255,255,0)');
        g.fillStyle = gl; g.fillRect(wn.x, wn.y, wn.w, wn.h);
        g.restore();
      }
      function drawDesk(g, t, bt) {
        const x0 = L.fx0, x1 = L.fx1, len = x1 - x0, air = G.stage === 'air' || G.stage === 'twist' || G.stage === 'pin' || G.stage === 'end';
        FADERS.forEach((f, i) => {
          const v = G.f[i], y = L.fy[i], cx = x0 + len * v, sweet = inZone(v), near = 1 - Math.min(1, Math.abs(v - CENTER) / 0.19);
          const segs = 22, lvl = air ? Math.min(1, v * (0.7 + G.vu[i] * 0.5)) : v * (0.86 + 0.14 * Math.abs(Math.sin(bt * Math.PI)));
          for (let k = 0; k < segs; k++) {
            const fx = x0 + len * (k + 0.5) / segs, on = (k + 0.5) / segs <= lvl, col = (k + 0.5) / segs >= ZONE[1] ? '#ff5a4a' : (k + 0.5) / segs >= ZONE[0] ? '#5dff9a' : f.col;
            g.fillStyle = on ? col : 'rgba(255,255,255,0.06)'; g.globalAlpha = on ? 0.95 : 1; g.fillRect(fx - len / segs * 0.32, y - 20, len / segs * 0.64, 5);
          }
          g.globalAlpha = 1;
          const cw = L.phone ? 34 : 40, chh = L.phone ? 30 : 34;
          if (sweet) { const gg = g.createRadialGradient(cx, y, 4, cx, y, 22 + near * 8); gg.addColorStop(0, 'rgba(93,255,154,' + (0.18 + near * 0.3) + ')'); gg.addColorStop(1, 'rgba(93,255,154,0)'); g.fillStyle = gg; g.fillRect(cx - 32, y - 32, 64, 64); }
          g.fillStyle = 'rgba(0,0,0,0.45)'; rr(g, cx - cw / 2 + 2, y - chh / 2 + 4, cw, chh, 6); g.fill();
          const cap = g.createLinearGradient(0, y - chh / 2, 0, y + chh / 2); cap.addColorStop(0, '#f4f5f8'); cap.addColorStop(0.45, '#b9bcc6'); cap.addColorStop(0.55, '#8c909c'); cap.addColorStop(1, '#5d616c');
          g.fillStyle = cap; rr(g, cx - cw / 2, y - chh / 2, cw, chh, 6); g.fill();
          g.fillStyle = f.col; g.fillRect(cx - 1.5, y - chh / 2 + 3, 3, chh - 6);
          g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(cx - cw / 2 + 3, y - chh / 2 + 2, cw - 6, 1.5);
        });
        /* spinning record of the night */
        const rx = L.lcd.x + 18, ry = L.lcd.y + 14, rad = 11;
        g.save(); g.translate(rx, ry); g.rotate(t * (G.stage === 'air' && G.holding ? 3.4 : 1.6));
        g.fillStyle = '#0a0a0c'; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 0.8; for (let k = 4; k < rad; k += 2.5) { g.beginPath(); g.arc(0, 0, k, 0, TAU); g.stroke(); }
        g.fillStyle = REC.c; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(-1, -3.5, 2, 2);
        g.restore();
      }

      /* ---------------- the signal strip on the card ---------------- */
      const wg = wave.getContext('2d');
      function sizeWave() { const dpr = cv.dpr || 1, w = Math.max(10, L.card.w - 32); wave.width = Math.round(w * dpr); wave.height = Math.round(24 * dpr); wg.setTransform(dpr, 0, 0, dpr, 0, 0); L.waveW = w; }
      function drawWave(t, bt) {
        if (card.hidden || !L.waveW) return;
        const w = L.waveW, hh = 24, n = L.phone ? 34 : 64, bw = w / n, air = G.stage === 'air' && G.holding;
        const col = G.stage === 'ring' ? '#2fbf6a' : G.stage === 'listen' ? '#1fa89c' : air || G.stage === 'end' ? '#e0302a' : '#b49a78';
        const base = air ? 0.22 + 0.22 * Math.abs(Math.sin(bt * Math.PI)) : G.stage === 'end' ? 0.3 + 0.2 * Math.abs(Math.sin(bt * Math.PI)) : 0.06;
        wg.clearRect(0, 0, w, hh);
        wg.fillStyle = col;
        for (let i = 0; i < n; i++) {
          const env = Math.sin((i + 0.5) / n * Math.PI), nz = 0.55 + 0.45 * Math.sin(t * 9 + i * 1.7) * Math.sin(t * 5.3 + i * 0.9);
          const a = Math.min(1, base + G.amp * nz) * env, bh = Math.max(2, a * hh);
          wg.globalAlpha = 0.3 + 0.7 * a; wg.fillRect(i * bw + bw * 0.2, (hh - bh) / 2, bw * 0.6, bh);
        }
        wg.globalAlpha = 1;
      }
      const PHONE = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="currentColor" d="M14.6 6.5c1.4-.6 3 .1 3.7 1.4l3 6c.6 1.2.3 2.7-.7 3.6l-3 2.6c1.9 4 5.2 7.4 9.3 9.3l2.6-3c.9-1 2.4-1.3 3.6-.7l6 3c1.3.7 2 2.3 1.4 3.7l-1.6 3.8c-.8 1.8-2.6 2.9-4.6 2.7C19.6 39.6 8.4 28.4 7.1 13.7c-.2-2 .9-3.8 2.7-4.6z"/><path d="M30 6a12 12 0 0 1 12 12M30 12a6 6 0 0 1 6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
      function showRingCard() {
        card.hidden = false; card.classList.remove('is-flip'); void card.offsetWidth; card.classList.add('is-flip');
        cardH.textContent = 'Incoming call · line 1'; cardTag.textContent = 'ringing';
        cardText.textContent = '';
        cardText.append(h('span', { class: 'ln-ring', html: PHONE }, h('span', { text: 'A caller from the suburbs is holding on line 1. Pick up when you’re ready.' })));
        fitCard();
      }

      /* ---------------- reply composition ---------------- */
      function compose() { return FADERS.map((f, i) => ({ k: f.k, l: lvlOf(G.f[i]), text: SEG[f.k][lvlOf(G.f[i])] })); }
      let lastSegs = '';
      function renderReply(force, changed) {
        const segs = compose(), key = segs.map(s => s.k + s.l).join('|');
        if (!force && key === lastSegs) return;
        lastSegs = key;
        cardText.textContent = '';
        G.words = [];
        segs.forEach((s, si) => {
          if (!s.text) return;
          const sp = h('span', { class: 'ln-seg k-' + s.k + ((s.k === 'h' && (s.l === 0 || s.l === 3)) || (s.k !== 'h' && s.l === 3) ? ' is-off' : '') + (changed === si ? ' is-new' : '') });
          s.text.split(/\s+/).forEach((wd, wi) => { const w = h('span', { class: 'ln-w', text: wd }); G.words.push(w); sp.append(w, document.createTextNode(' ')); void wi; });
          cardText.append(sp);
        });
        if (!G.words.length) cardText.append(h('span', { class: 'ln-seg', text: '…' }));
        fitCard();
      }
      function fitCard() {
        if (card.hidden || !L.card) return;
        const p = cardText;
        p.classList.remove('is-clamp'); p.style.webkitLineClamp = '';
        let fs = L.phone ? 17 : 19; p.style.fontSize = fs + 'px';
        const avail = L.card.h - 26 - (card.querySelector('h3').offsetHeight + 8) - 30;
        while (p.scrollHeight > avail && fs > 15) { fs--; p.style.fontSize = fs + 'px'; }
        if (p.scrollHeight > avail) { p.classList.add('is-clamp'); p.style.webkitLineClamp = String(Math.max(2, Math.floor(avail / (fs * 1.36)))); }
      }

      /* ---------------- sound ---------------- */
      const music = K.music('lofi');
      music.level(0.5);
      let hiss = null, warmHum = null, ringT = 0;
      const ensureHiss = () => { if (!hiss && A.ctx) { hiss = A.loop({ filter: 'bandpass', freq: 2600, q: 0.7, bus: 'amb' }); } return hiss; };
      S.onDestroy(() => { if (hiss) hiss.stop(); if (warmHum) warmHum.stop(); });
      function beat() { if (!A.ctx || !music.bpm) return (performance.now() / 1000 * 78 / 60) % 1; const iv = 60 / music.bpm, x = (A.now() - (music.next - iv)) / iv; return ((x % 1) + 1) % 1; }
      function eighth() { if (!A.ctx || !music.bpm) return Math.floor(performance.now() / 1000 * 78 / 60 * 2); const iv = 60 / music.bpm / 2; return Math.floor((A.now() - music.next) / iv); }
      function ringOnce() {
        if (!A.ctx) return;
        const t = A.now();
        [0, 0.5].forEach(o => { A.tone({ when: t + o, type: 'square', freq: 440, dur: 0.38, vol: 0.022, lp: 1800, attack: 0.01 }); A.tone({ when: t + o, type: 'square', freq: 480, dur: 0.38, vol: 0.022, lp: 1800, attack: 0.01 }); });
      }
      function crackle(v, dur) { if (A.ctx) A.noise({ filter: 'bandpass', freq: 2400 + Math.random() * 1500, q: 0.6, dur: dur || 0.25, vol: v || 0.05, bus: 'amb' }); }
      function onAirBeep() { if (!A.ctx) return; const t = A.now(); A.tone({ when: t, type: 'sine', freq: 1000, dur: 0.12, vol: 0.06 }); A.tone({ when: t + 0.16, type: 'sine', freq: 1500, dur: 0.16, vol: 0.06 }); }
      const PENTA = ['D4', 'F4', 'A4', 'C5', 'D5', 'E5', 'F5', 'A5'];
      function voiceBlip(i, caller) { G.amp = Math.max(G.amp, caller ? 0.75 : 1); if (!A.ctx) return; if (caller) { A.tone({ type: 'triangle', freq: 170 + Math.random() * 90, to: 140 + Math.random() * 60, glide: 0.08, dur: 0.1, vol: 0.05, lp: 700 }); crackle(0.012, 0.05); } else A.pluck(A.note(PENTA[i % PENTA.length]), { vol: 0.07, damp: 0.995, verb: 0.3 }); }

      /* ---------------- flow ---------------- */
      async function typeCaller(text, into, perWord) {
        into.textContent = '';
        const words = text.split(/\s+/);
        for (let i = 0; i < words.length; i++) {
          into.append((i ? ' ' : '') + words[i]);
          voiceBlip(i, true);
          if (into === cardText) fitCard();
          await S.sleep(K.reduced() ? 40 : perWord * (/[.,:;!?]$/.test(words[i]) ? 2.2 : 1));
        }
      }
      function guideFader() {
        const i = G.f.findIndex(v => !inZone(v));
        if (i < 0) return;
        const up = G.f[i] < ZONE[0], f = FADERS[i];
        K.guide({ id: 'ln-f' + i, g: 'drag', dir: up ? 'r' : 'l', d: Math.round((L.fx1 - L.fx0) * 0.42), target: fEls[i], ox: K.clamp((18 + (L.fx1 - L.fx0) * G.f[i]) / (L.fx1 - L.fx0 + 36), 0.06, 0.94), label: (up ? 'TURN UP ' : 'EASE OFF ') + f.name, delay: 900 });
      }
      function answer() {
        if (G.stage !== 'ring') return;
        G.stage = 'listen'; K.guide(null);
        K.sfx.ok(); crackle(0.09, 0.4); const hs = ensureHiss(); if (hs) hs.level(0.018, 0.4);
        setTalk('wait');
        say(LN.onAir, { mood: 'happy', ms: 2200 });
        card.hidden = false; card.classList.remove('is-flip'); void card.offsetWidth; card.classList.add('is-flip');
        cardH.textContent = 'Live transcript · line 1'; cardTag.textContent = 'live';
        cap.hidden = false; capB.textContent = 'Line 1 · caller from the suburbs'; capT.textContent = 'Connected…'; cap.classList.add('is-in');
        (async () => {
          await S.sleep(700);
          await typeCaller(CALLER, cardText, [300, 230, 190][inten]);
          await S.sleep(900);
          capT.textContent = '“' + CAPTHOUGHT.replace(/[.]$/, '') + '”'; capB.textContent = 'Caller · line 1';
          card.classList.remove('is-flip'); void card.offsetWidth; card.classList.add('is-flip');
          await S.sleep(250);
          cardH.textContent = 'Your reply · live mix'; cardTag.textContent = 'mixing';
          renderReply(true);
          G.stage = 'mix'; setTalk('mix');
          patch.base('think'); say(LN.mix, { ms: 3800 });
          S.later(() => { if (G.stage === 'mix') say(LN.hollow, { mood: 'confused', ms: 3600 }); }, 4200);
          guideFader();
        })();
      }
      let lastStep = [-1, -1, -1], lastTickT = 0;
      function setFader(i, v, fromUser) {
        if (G.stage !== 'mix') return;
        v = K.clamp(v, 0, 1);
        const prev = G.f[i]; G.f[i] = v;
        fEls[i].setAttribute('aria-valuenow', String(Math.round(v * 100)));
        fLabs[i].em.textContent = Math.round(v * 100) + '%';
        fLabs[i].classList.toggle('is-sweet', inZone(v)); fLabs[i].classList.toggle('is-over', v >= ZONE[1]);
        const step = Math.floor(v * 10), now = performance.now();
        if (step !== lastStep[i] && now - lastTickT > 60) { lastStep[i] = step; lastTickT = now; K.sfx.good(undefined, Math.min(10, step)); }
        if ((prev - CENTER) * (v - CENTER) <= 0 && prev !== v && A.ctx) A.wood(undefined, 0.12, 1.6);
        const before = lvlOf(prev), after = lvlOf(v);
        if (before !== after) { renderReply(false, i); P.emit('spark', L.fx0 + (L.fx1 - L.fx0) * v, L.fy[i], 6, { colors: [FADERS[i].col, '#ffffff'], speed: [40, 120] }); }
        const was = talkB.classList.contains('is-ready');
        if (ready() && !was) { setTalk('ready'); K.sfx.great(); patch.base('happy'); patch.react('bounce'); say(LN.ready, { ms: 4200 }); K.guide({ id: 'ln-talk', g: 'hold', target: talkB, label: 'HOLD TO TALK', ms: 2400, delay: 1200 }); }
        else if (!ready() && was) { setTalk('mix'); }
        void fromUser;
      }
      function reactMix() {
        if (G.stage !== 'mix' || ready()) { if (G.stage === 'mix' && !ready()) guideFader(); return; }
        const l = G.f.map(lvlOf);
        let line = null;
        if (l[0] === 3) line = LN.syrup; else if (l[1] === 3) line = LN.harsh; else if (l[2] === 3) line = LN.dismiss; else if (l[1] === 0) line = LN.hollow; else if (l[1] === 1) line = LN.vague; else if (!inZone(G.f[0])) line = LN.cold; else if (!inZone(G.f[2])) line = LN.narrow;
        if (line && performance.now() - G.saidAt > 1800) { say(line, { mood: l.includes(3) ? 'surprised' : 'think', ms: 3200 }); if (l.includes(3)) patch.react('shake'); }
        guideFader();
      }
      FADERS.forEach((f, i) => {
        const valAt = (p) => (p.x - 18) / (L.fx1 - L.fx0);
        K.drag(fEls[i], {
          start: (p) => { if (G.stage !== 'mix') { K.sfx.soft(); return false; } G.dragF = true; K.sfx.tap(); setFader(i, valAt(p), true); },
          move: (p) => setFader(i, valAt(p), true),
          end: () => { G.dragF = false; reactMix(); }
        });
        S.listen(fEls[i], 'keydown', (e) => {
          const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
          if (!d) return; e.preventDefault(); setFader(i, G.f[i] + d * 0.04, true); reactMix();
        });
      });
      function startAir() {
        if (G.stage !== 'mix' || !ready()) return false;
        G.stage = 'air'; G.wi = 0; G.sub = eighth();
        const q = 1 - G.f.reduce((a, v) => a + Math.abs(v - CENTER), 0) / 3 / 0.5;
        G.mixQ = K.clamp(q, 0, 1);
        card.classList.add('is-air'); cardH.textContent = 'Your reply · on air'; cardTag.textContent = 'on air';
        onAirBeep(); onair.classList.add('is-on');
        music.level(0.62);
        const hs = ensureHiss(); if (hs) hs.level(0.006, 0.3);
        patch.base('love');
        ctx.track('air', { mix: Math.round(G.mixQ * 100) });
        return true;
      }
      K.press(talkB, {
        down: () => {
          if (G.stage === 'ring') { answer(); return; }
          if (G.stage === 'listen' || G.stage === 'twist' || G.stage === 'pin' || G.stage === 'end') { K.sfx.soft(); return; }
          if (G.stage === 'mix') {
            if (!ready()) { K.sfx.no(); talkB.animate && talkB.animate([{ transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], { duration: 260 }); reactMix(); return; }
            startAir();
          }
          if (G.stage === 'air') { G.holding = true; setTalk('live'); onair.classList.add('is-on'); onair.classList.remove('is-warm'); K.sfx.tap(); if (A.ctx) A.tone({ type: 'sine', freq: 1200, dur: 0.06, vol: 0.04 }); }
        },
        up: () => {
          if (G.stage !== 'air' || !G.holding) return;
          G.holding = false; setTalk('ready'); onair.classList.remove('is-on'); onair.classList.add('is-warm'); crackle(0.04, 0.2);
          if (G.wi < G.words.length) { say(LN.pause, { ms: 2600 }); K.guide({ id: 'ln-talk2', g: 'hold', target: talkB, label: 'KEEP HOLDING TALK', ms: 2400, delay: 1600 }); }
        }
      });
      S.listen(talkB, 'keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); talkB.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 77, button: 0 })); } });
      S.listen(talkB, 'keyup', (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); talkB.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 77, button: 0 })); } });
      function broadcastStep() {
        const e8 = eighth();
        if (e8 === G.sub) return;
        G.sub = e8;
        if (!G.holding || G.stage !== 'air') return;
        let n = 1; const nxt = G.words[G.wi]; if (nxt && nxt.textContent.length <= 3 && G.words[G.wi + 1]) n = 2;
        for (let k = 0; k < n && G.wi < G.words.length; k++) {
          const w = G.words[G.wi++]; w.classList.add('on');
          voiceBlip(G.wi, false);
          G.vu = G.vu.map(() => 0.6 + Math.random() * 0.4);
          const wn = lightOne(true);
          if (k === 0 && wn && Math.random() < 0.5) lightOne(false);
          if (Math.random() < 0.4) { const r = K.rectIn(w); P.emit('mote', r.cx, r.cy, 1, { colors: ['#ffd27a', '#fff3c4'] }); }
        }
        if (G.wi >= G.words.length) twist();
      }
      async function twist() {
        if (G.stage !== 'air') return;
        G.stage = 'twist'; G.holding = false; K.guide(null);
        setTalk('done'); onair.classList.remove('is-on'); onair.classList.add('is-warm');
        card.classList.remove('is-air');
        K.sfx.chime(5);
        say(LN.thanks, { mood: 'happy', ms: 2600 });
        await S.sleep(900);
        crackle(0.08, 0.5);
        cap.classList.remove('is-big'); capB.textContent = 'Caller · line 1';
        cap.classList.remove('is-in'); void cap.offsetWidth; cap.classList.add('is-in');
        await typeCaller('Thanks. That actually helps.', capT, 200);
        await S.sleep(1300);
        if (TAKE) { cap.classList.remove('is-in'); void cap.offsetWidth; cap.classList.add('is-in'); await typeCaller('So the fair version is… ' + lowerFirst(TAKE), capT, 170); await S.sleep(1800); }
        crackle(0.1, 0.8);
        const hs = ensureHiss(); if (hs) hs.level(0.03, 0.4);
        music.level(0.3);
        cap.classList.remove('is-in'); void cap.offsetWidth; cap.classList.add('is-in');
        await typeCaller('Do you know who this is?', capT, 230);
        await S.sleep(1500);
        if (hs) hs.level(0.0001, 0.6);
        if (A.ctx) A.pad([A.note('D4'), A.note('A4'), A.note('F5')], { dur: 3.2, vol: 0.14, attack: 0.4 });
        cap.classList.add('is-big'); capB.textContent = 'The caller';
        cap.classList.remove('is-in'); void cap.offsetWidth; cap.classList.add('is-in');
        capT.textContent = 'It’s you.';
        patch.face('surprised', 1600); patch.react('bounce');
        await S.sleep(1300);
        patch.base('hug');
        say(care() ? LN.twistCare : LN.twist, { ms: 5200 });
        card.classList.add('is-pinned'); cardH.textContent = 'Pinned on the studio board'; cardTag.textContent = 'for you';
        pin.hidden = false; K.sfx.thud();
        P.emit('dust', L.card.x + L.card.w / 2, L.card.y + 6, 10);
        G.stage = 'pin';
        S.later(() => { if (G.stage === 'pin') say(LN.pin, { ms: 3000 }); }, 5600);
        K.guide({ id: 'ln-pin', g: 'tap', target: pin, label: 'PIN IT, FOR YOU', place: 'below', delay: 1800 });
      }
      K.tap(pin, () => {
        if (G.stage !== 'pin') return;
        pin.classList.add('is-set'); K.sfx.lock(); K.sfx.pop(undefined, 400);
        P.emit('star', L.card.x + L.card.w / 2, L.card.y + 4, 14, { colors: ['#ffffff', '#ffd27a', '#ff8a80'] });
        finale();
      });

      /* ---------------- render loop ---------------- */
      let acc = 0, odd = false;
      K.loop((dt0, t) => {
        const g = cv.g; if (!g || !L.W) return;
        /* adaptive frame rate: 60 fps while touched or on air, 30 fps for idle ambience (saves battery) */
        if (G.stage === 'intro' && G.drawnOnce) return;
        G.drawnOnce = true;
        const busy = G.dragF || G.holding || G.stage === 'end' || G.stage === 'listen' || P.count() > 0 || G.amp > 0.05;
        odd = !odd;
        if (!busy && odd) { acc += dt0; return; }
        const dt = Math.min(0.1, dt0 + acc); acc = 0;
        const bt = beat();
        if (G.stage === 'ring') { ringT -= dt; if (ringT <= 0) { ringOnce(); ringT = 2.6; G.amp = 0.8; S.later(() => { G.amp = Math.max(G.amp, 0.8); }, 500); } }
        G.amp = Math.max(0, G.amp - dt * 2.4);
        if (G.stage === 'air') broadcastStep();
        G.vu = G.vu.map(v => Math.max(0, v - dt * 2.2));
        if (G.stage === 'end') { G.finT += dt; G.dawn = K.clamp(G.finT / 4.2, 0, 1); if (G.lit < order.length && Math.random() < dt * 40) { lightOne(Math.random() < 0.4); if (A.ctx && Math.random() < 0.18) A.pluck(A.note(PENTA[(G.lit * 3) % PENTA.length]), { vol: 0.05, damp: 0.995 }); } }
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.drawImage(BG, 0, 0, L.W, L.H);
        drawWindow(g, t, bt);
        if (G.stage === 'end' && G.dawn > 0) { const gr = g.createLinearGradient(0, L.win.y + L.win.h, 0, L.deskY); gr.addColorStop(0, 'rgba(255,170,110,' + (0.22 * G.dawn) + ')'); gr.addColorStop(1, 'rgba(255,170,110,0)'); g.fillStyle = gr; g.fillRect(0, L.win.y + L.win.h, L.W, L.deskY - L.win.y - L.win.h); }
        g.drawImage(FG, L.fg.x, L.fg.y, L.fg.w, L.fg.h);
        drawDesk(g, t, bt);
        if (onair.classList.contains('is-on') && L.oa) { const r = L.oa; const gl = g.createRadialGradient(r.cx, r.cy, 10, r.cx, r.cy, 130); gl.addColorStop(0, 'rgba(255,60,50,' + (0.2 + 0.1 * Math.sin(bt * TAU)) + ')'); gl.addColorStop(1, 'rgba(255,60,50,0)'); g.fillStyle = gl; g.fillRect(r.cx - 130, r.cy - 130, 260, 260); }
        P.update(dt); P.draw(g);
        drawWave(t, bt);
      });

      /* ---------------- finale ---------------- */
      let finished = false;
      async function finale() {
        if (G.stage !== 'pin') return;
        G.stage = 'end'; G.finT = 0; K.guide(null);
        onair.classList.remove('is-warm'); onair.classList.add('is-on');
        cap.hidden = true;
        music.level(0.7);
        K.sfx.win();
        patch.base('celebrate'); patch.react('bounce');
        say(LN.final, { ms: 0 });
        const pct = Math.round((G.mixQ || 0) * 100), best = K.best('balance', pct, 'higher'), tier = K.tier(G.mixQ || 0, [0.55, 0.75, 0.9]);
        const col = K.collect(REC_KEY);
        await S.sleep(2600);
        await K.finale('stars', { colors: ['#ffd27a', '#ffb36b', '#fff3c4', '#ff8a80'], chord: ['D4', 'F#4', 'A4', 'E5'], ms: 4200 });
        const listeners = G.listeners;
        const badges = [];
        if (best.isNew) badges.push('New best: ' + pct + '% balanced'); else badges.push('Mix: ' + pct + '% balanced' + (best.prev != null && !best.first ? ' (best ' + best.prev + '%)' : ''));
        if (tier) badges.push(tier + ' mix');
        if (col.isNew) badges.push('Collected: ' + REC_KEY);
        badges.push('Records: ' + Math.min(col.count, RECORDS.length) + '/' + RECORDS.length);
        finished = true;
        ctx.finish({
          title: 'Same advice, now for you', mood: 'celebrate',
          lines: ['You told the caller: ' + SHORT, 'Same advice, now for you', listeners + ' listeners tuned in by dawn'],
          share: 'Hosted the Late Night Line. ' + listeners + ' listeners tuned in.',
          badges
        });
      }

      /* ---------------- start ---------------- */
      cv.onResize(() => layout());
      S.on('theme', () => { if (L.W) buildBg(); });
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => { if (a && a !== an && (G.stage === 'intro' || G.stage === 'ring')) { an = a; buildTexts(); } }).catch(() => {});
      FADERS.forEach((f, i) => { fLabs[i].em.textContent = Math.round(G.f[i] * 100) + '%'; });
      (async () => {
        await K.intro({ title: 'Late Night Line', sub: '2am. The city’s asleep. One caller needs a kind, fair answer.', how: 'Answer the call. Mix your reply with three faders. Hold TALK.', char: 'patch', mood: 'cosy' });
        G.stage = 'ring'; ringT = 0.4; setTalk('answer'); showRingCard();
        patch.base('wink');
        say(visits > 0 ? LN.back : LN.ring, { ms: 3600 });
        K.guide({ id: 'ln-answer', g: 'tap', target: talkB, label: 'ANSWER THE CALL', delay: 900 });
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > (ms || 30000)) return false; await K.wait(100); } return true; };
          await until(() => G.stage === 'ring');
          await K.wait(900);
          await K.sim.tap(talkB);
          await until(() => G.stage === 'mix', 40000);
          await K.wait(1200);
          for (let i = 0; i < 3; i++) {
            const span = L.fx1 - L.fx0, y = 26, x0 = 18 + span * G.f[i], x1 = 18 + span * (i === 0 ? 0.93 : CENTER + (i - 1) * 0.01);
            await K.sim.drag(fEls[i], { x: x0, y }, { x: x1, y }, 900, 18);
            await K.wait(500);
          }
          if (lvlOf(G.f[0]) === 3) { const span = L.fx1 - L.fx0; await K.sim.drag(fEls[0], { x: 18 + span * G.f[0], y: 26 }, { x: 18 + span * CENTER, y: 26 }, 700, 12); }
          await until(() => ready(), 5000);
          await K.wait(900);
          const pr = await K.sim.press(talkB);
          await until(() => G.wi >= Math.floor(G.words.length * 0.5), 30000);
          pr.up();
          await K.wait(900);
          const pr2 = await K.sim.press(talkB);
          await until(() => G.stage !== 'air', 40000);
          pr2.up();
          await until(() => G.stage === 'pin', 40000);
          await K.wait(1500);
          await K.sim.tap(pin);
          await until(() => finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
