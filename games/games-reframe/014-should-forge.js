/* 014 Should Forge — Reframe · REFRAME · Inner Speech / Mental Text
 * Mechanism: from demands to preferences (Ellis's REBT; Burns 1980 on should-statements). Rigid "should / must / have to"
 * rules turn wishes into commands that fuel guilt and anger; rewording them as preferences keeps the value without the
 * whip ("I'd like to…, and if I don't, I'm still okay"), and a "they should" becomes a boundary ("I'd like them to…, and
 * I can ask"). The player's own should is stamped into a cold iron bar: heat it, hammer the SHOULD flat on the beat,
 * bend it until the letters re-form as a preference, then quench it. The twist: a second bar about other people.
 * Verb: forge (hold to pump the bellows, tap on the beat to hammer, drag to bend, drag down to quench). Finale: both
 * pieces become charms on a keyring that swing and glint while sparks fly up from the anvil.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;

  /* <words> Find a should/must/have-to clause in the player's words and rewrite it as a preference (Ellis; Burns).
   * Self: "I should X" -> "I'd like to X, and if I don't, I'm still okay."   Others: "They should X" -> "I'd like them to X, and I can ask."
   * Pure functions: no DOM, no lookbehind. */
  const ADVS = new Set('really just honestly definitely probably totally absolutely seriously still also already simply clearly obviously actually literally truly genuinely kind sort of'.split(' '));
  const PART_IRR = new Set(('been done known seen gone said told made taken given gotten got written spoken eaten thought brought bought felt kept left met paid put read run sent spent ' +
    'stood understood won worn become begun broken chosen come drawn driven fallen flown forgotten forgiven frozen grown hidden held hurt let lost meant ridden risen shown shut ' +
    'sung sat slept sold taught thrown woken heard found built caught dealt fought fed lent lit led sought shot struck swept swung stuck stayed listened tried').split(' '));
  const isPart = (w) => /^[a-z]+ed$/i.test(w) || PART_IRR.has(String(w).toLowerCase());
  const MODAL_RX = /\b(shouldn'?t have|should not have|should'?ve|should have|shouldn'?t|should not|should|mustn'?t|must not|must|ought not to|oughtn'?t to|ought to|have got to|has got to|'ve got to|'s got to|got to|gotta|have to|has to|(?:am|is|are|'m|'re|'s) not supposed to|(?:am|is|are|'m|'re|'s) supposed to)\b/i;
  const SELF_PUNISH = /^(be ashamed|feel (so )?(bad|guilty|ashamed|terrible|awful|horrible|stupid)|hate myself|be punished|suffer|beat myself up|be hard on myself)\b/i;
  const THINGS = ['it', 'this', 'that', 'things', 'life', 'everything', 'work', 'the world'];
  const PEOPLE = ['they', 'he', 'she', 'we', 'people', 'everyone', 'everybody', 'nobody', 'someone', 'somebody', 'others', 'you guys'];
  const OBJ = { they: 'them', he: 'him', she: 'her', we: 'us', i: 'me' };
  const plural = (s) => /^(they|we|people|others|things|you guys)$/i.test(s) || /s$/i.test(s.split(' ').pop()) && !/^(everyone|everybody|nobody|someone|somebody|this|it|life|work)$/i.test(s);
  function deExtreme(p) {
    return p.replace(/\b(everything|it all|all of it) (perfect|right|perfectly)\b/gi, 'things right').replace(/^be perfect\b/i, 'do really well').replace(/\bperfect(ly)?\b/gi, (m, ly) => (ly ? 'really well' : 'really good')).replace(/\bthe best\b/gi, 'good').replace(/\beverything\b/gi, 'the important things')
      .replace(/\beveryone\b/gi, 'the people who matter').replace(/\ball the time\b/gi, 'a lot of the time').replace(/\b100 ?%/g, 'mostly');
  }
  function youToMe(p) { return p.replace(/\byourself\b/gi, 'myself').replace(/\byours\b/gi, 'mine').replace(/\byour\b/gi, 'my').replace(/\byou\b/gi, 'me'); }
  function clausesOf(text) {
    const t = String(text || '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ');
    const out = [];
    const SUBJ = "(?:i|i'm|i've|they|he|she|we|you|it|it's|that|this|people|everyone|nobody|my|his|her|their|our)\\b";
    const SPLIT = new RegExp(",?\\s+(?:but|because|although|though|while|yet|and then)\\s+|,?\\s+(?:and|so|or)\\s+(?:(?:honestly|then|also|really|maybe|now|still|just|frankly|anyway)\\s+)?(?=" + SUBJ + ")|,\\s+(?:and\\s+)?(?:(?:honestly|frankly|anyway)\\s+)?(?=" + SUBJ + ")", 'i');
    t.split(/[.!?;\n]+/).forEach(sen => sen.split(SPLIT)
      .forEach(c => { c = c.trim().replace(/^(and|but|so|then)\s+/i, ''); if (c.split(' ').length >= 3) out.push(c); }));
    return out;
  }
  function parseShould(clause) {
    const m = MODAL_RX.exec(clause); if (!m) return null;
    const before = clause.slice(0, m.index).trim(), mod = m[0].toLowerCase();
    // the predicate ends where the clause moves on; the original we show ends at exactly the same place
    const after = m.index + m[0].length, rest = clause.slice(after), lead = rest.match(/^[\s,]*/)[0].length, body = rest.slice(lead);
    let cut = body.search(/,\s*(?:and|but|so|or|because|though)\b|\s+(?:should|must|ought to)\b|,\s*(?:honestly|anyway|frankly|tbh|i guess|i think|i suppose|you know|to be honest|lol|haha)[\s.!?…"]*$/i);
    if (cut < 0) cut = body.length;
    const ws = []; body.slice(0, cut).replace(/\S+/g, (w, i) => { ws.push([w, i]); return w; });
    if (ws.length > 12) { // too long for one bar: stop before a joining word if there is one, so the sentence stays whole
      let k = 12; for (let j = 12; j >= 4; j--) if (/^(without|before|after|when|whenever|while|until|unless|because|since|so|if|though|although|and|or|but|instead)$/i.test(ws[j][0])) { k = j; break; }
      cut = ws[k][1];
    }
    let pred = body.slice(0, cut).replace(/[\s,;:.!?…"]+$/, '');
    const endAt = after + lead + cut;
    let bw = before.split(/\s+/).filter(Boolean);
    while (bw.length && ADVS.has(bw[bw.length - 1].toLowerCase())) bw.pop();
    if (!bw.length) return null;
    const last = bw[bw.length - 1], lw = last.toLowerCase().replace(/'s$/, '');
    let subj, kind;
    if (lw === 'i' || lw === "i'm" || lw === "i've") { subj = 'I'; kind = 'self'; }
    else if (lw === 'you' || lw === "you're" || lw === "you've") { subj = 'I'; kind = 'selfYou'; }
    else if (PEOPLE.includes(lw)) { subj = lw; kind = lw === 'we' ? 'we' : 'other'; }
    else if (THINGS.includes(lw)) { subj = lw; kind = 'thing'; }
    else if (bw.length >= 2 && /^(my|his|her|their|our|the|your)$/i.test(bw[bw.length - 2]) && /^[a-z-]+$/i.test(last)) { subj = bw.slice(-2).join(' ').replace(/^your\b/i, 'my').replace(/^\w/, c => c.toLowerCase()); kind = THINGS.includes(subj.toLowerCase()) ? 'thing' : 'other'; }
    else if (/^[A-Z][a-z]+$/.test(last) && !/^(I|And|But|So|Then|Now|Just|Really|Also|Still|Maybe|Today|Tonight|What|Why|How|When|Where|Who|Which|Whatever|If|Or|Yes|No)$/.test(last)) { subj = last; kind = 'other'; }
    else return null;
    if (/^(nobody|no one)$/i.test(subj)) return null;
    const neg0 = /n'?t|not/.test(mod);
    let perfect = /should/.test(mod) && (/have|'ve/.test(mod) || /^of\s+\w+/i.test(pred));
    const must = /must/.test(mod);
    if (/^must$/.test(mod)) { // "must" is often a guess ("they must think…", "I must be stupid"), never a demand to rewrite
      if (kind !== 'self' && kind !== 'selfYou') return null;
      if (/^have\s+\w+/i.test(pred) && isPart(pred.split(/\s+/)[1])) return null;
      if (/^(look|seem|sound|appear|think|be (so |such )?(an? )?(stupid|dumb|crazy|idiot|failure|broken|useless|terrible|awful|annoying|boring|weird|mad|insane|doing something wrong|losing it))\b/i.test(pred)) return null;
    }
    if (/^of\s+\w+/i.test(pred) && /should/.test(mod) && isPart(pred.split(/\s+/)[1])) { pred = pred.replace(/^of\s+/i, ''); }
    if (perfect) { const w0 = pred.split(/\s+/)[0] || ''; if (!isPart(w0)) { perfect = false; pred = 'have ' + pred; } }
    if (/^(i|you|we|they|he|she|it)\b/i.test(pred)) return null;                         // "what should I do": a question
    let neg = neg0, freq = null;
    if (/^always\s+/i.test(pred)) { freq = 'most'; pred = pred.replace(/^always\s+/i, ''); }
    if (/^never\s+/i.test(pred)) { neg = !neg; pred = pred.replace(/^never\s+/i, ''); }
    if (/^(too|as well|also|either)$/i.test(pred) || pred.split(/\s+/).length < 1 || !/[a-z]/i.test(pred)) return null;
    pred = pred.replace(/\bi\b/g, 'I');
    const subjText = /\s/.test(subj) && kind !== 'self' ? bw.slice(-2).join(' ') : last;
    const from = clause.slice(Math.max(0, clause.lastIndexOf(subjText, m.index)), endAt).replace(/[\s,;:.!?…"]+$/, '');
    return { kind, subj, mod, neg, perfect, must, pred, freq, orig: from };
  }
  function rewrite(p) {
    let be = /^be\b/i.test(p.pred);
    const capi = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    let head, tail, pred = p.pred;
    if (p.kind === 'self' || p.kind === 'selfYou') {
      if (p.kind === 'selfYou') pred = youToMe(pred);
      if (SELF_PUNISH.test(pred)) return { head: 'I can take this seriously', tail: 'without beating myself up.', full: 'I can take this seriously without beating myself up.', modal: 'I can' };
      if (!p.neg) pred = deExtreme(pred); be = /^be\b/i.test(pred);
      const most = p.freq === 'most' ? ' most of the time' : '';
      if (p.perfect) { head = (p.neg ? "I wish I hadn't " : 'I wish I had ') + pred; tail = 'and I can learn from it.'; }
      else if (p.neg) { head = (p.must ? "I'd prefer not to " : "I'd rather not ") + pred; tail = be ? "and if I am, I'm still okay." : "and if I do, I'm still okay."; }
      else { head = (p.must ? "I'd prefer to " : "I'd like to ") + pred + most; tail = be ? "and if I'm not, I'm still okay." : "and if I don't, I'm still okay."; }
    } else if (p.kind === 'thing') {
      const s = p.subj, pl = plural(s);
      if (p.perfect) { head = 'I wish ' + s + (p.neg ? " hadn't " : ' had ') + pred; tail = 'and I can work with what happened.'; }
      else if (p.neg) { head = "I'd rather " + s + ' ' + (be ? (pl ? "weren't " : "wasn't ") + pred.replace(/^be\s+/i, '') : "didn't " + pred); tail = 'and if ' + (pl ? 'they ' + (be ? 'are' : 'do') : 'it ' + (be ? 'is' : 'does')) + ', I can still cope.'; }
      else { head = "I'd like " + s + ' to ' + pred + (p.freq === 'most' ? ' most of the time' : ''); tail = "and if not, I'm still okay."; }
    } else {
      const s = p.subj, o = OBJ[s.toLowerCase()] || s, pl = plural(s), we = p.kind === 'we';
      const tell = /^(know|understand|see|realise|realize|notice|get|remember|appreciate)\b/i.test(pred);
      if (p.perfect) { head = 'I wish ' + s + (p.neg ? " hadn't " : ' had ') + pred; tail = we ? 'and we can learn from it.' : p.neg ? 'and I can say so next time.' : 'and I can ask next time.'; }
      else if (p.neg) { head = "I'd rather " + s + ' ' + (be ? (pl || we ? "weren't " : "wasn't ") + pred.replace(/^be\s+/i, '') : "didn't " + pred); tail = we ? 'and we can talk about it.' : 'and I can say so.'; }
      else { head = (p.must ? "I'd prefer " : "I'd like ") + o + ' to ' + pred + (p.freq === 'most' ? ' most of the time' : ''); tail = we ? 'and we can talk about it.' : tell ? 'and I can tell ' + (OBJ[s.toLowerCase()] || s) + '.' : 'and I can ask.'; }
    }
    head = capi(head.replace(/\s+/g, ' ').trim());
    const modal = (head.match(/^(I wish I hadn't|I wish I had|I'd prefer not to|I'd rather not|I'd prefer to|I'd like to|I wish \S+(?: \S+)? (?:hadn't|had)|I'd rather \S+(?: \S+)? (?:didn't|wasn't|weren't)|I'd (?:like|prefer) \S+(?: \S+)? to)/) || [head.split(' ').slice(0, 3).join(' ')])[0];
    return { head, tail, full: head + ', ' + tail, modal };
  }
  function findShoulds(text, distortions) {
    const found = { self: null, other: null };
    const srcs = [];
    (Array.isArray(distortions) ? distortions : []).forEach(d => { if (d && d.type === 'should' && d.quote) srcs.push(String(d.quote)); });
    clausesOf(text).forEach(c => srcs.push(c));
    srcs.forEach(c => { clausesOf(c).forEach(cl => { const p = parseShould(cl); if (!p) return; const slot = p.kind === 'self' || p.kind === 'selfYou' ? 'self' : 'other'; if (!found[slot]) found[slot] = p; }); });
    return found;
  }
  /* </words> */

  /* ---------------- the forge: palette, daily halls, metal ---------------- */
  const HEAT = [[0, '#3b3d44'], [0.18, '#4b2b25'], [0.33, '#7a1f12'], [0.48, '#b8301a'], [0.6, '#e2521c'], [0.73, '#ff8a26'], [0.86, '#ffc24a'], [1, '#fff1c4']];
  function hexRgb(hx) { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hx || '') || [0, 'ff', 'ff', 'ff']; return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]; }
  function mixHex(a, b, k) { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, k))).toString(16).padStart(2, '0')).join(''); }
  function rgba(hx, a) { const c = hexRgb(hx); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function heatCol(h) { h = Math.max(0, Math.min(1, h)); for (let i = 1; i < HEAT.length; i++) { if (h <= HEAT[i][0]) { const a = HEAT[i - 1], b = HEAT[i]; return mixHex(a[1], b[1], (h - a[0]) / (b[0] - a[0])); } } return HEAT[HEAT.length - 1][1]; }
  const HALLS = [
    { name: 'Desert Forge', wall: '#6e4b33', wall2: '#40291a', mortar: '#2c1b10', view: 'dunes', skyD: ['#ff9b5c', '#a14a63', '#2c1838'], skyB: ['#ffe0a8', '#ffb07a', '#f0839a'], floor: '#3a2618' },
    { name: 'Snowy Smithy', wall: '#4b5362', wall2: '#272d38', mortar: '#1a1e27', view: 'snow', skyD: ['#2a3a5e', '#162038', '#0a0e1a'], skyB: ['#d5e8f8', '#acc9e6', '#8db0d6'], floor: '#2a2e36' },
    { name: 'Mountain Hall', wall: '#514846', wall2: '#2c2726', mortar: '#1b1716', view: 'peaks', skyD: ['#46689c', '#26385e', '#121b30'], skyB: ['#c4e2ff', '#91c5f0', '#6ea9df'], floor: '#2e2826' }
  ];
  const SHAPES = ['Horseshoe', 'Hook', 'Scroll'];
  const FINISH = { Gold: ['#ffe39a', '#d9a520', '#8a5c06'], Silver: ['#f4f7fb', '#b9c2cf', '#6b7686'], Copper: ['#ffc9a0', '#cf7a45', '#7a3a18'], Iron: ['#c9ccd2', '#7d828c', '#3c4048'] };
  const GEN_SELF = { work: 'I should have it all figured out by now', study: 'I should be getting better marks', social: 'I should be more confident', partner: 'I should be able to keep everyone happy',
    family: 'I should be able to keep everyone happy', reply: 'I should have said something better', none: 'I should be further along' };
  const GEN_OTHER = { work: 'My boss should see how hard I work', study: 'My teacher should see how hard I try', social: 'People should be kinder', partner: 'They should know what I need',
    family: 'My family should understand me', reply: 'They should text back', none: 'They should know how I feel' };
  const DOMS = [['partner', /\b(partner|boyfriend|girlfriend|husband|wife|bf|gf|fianc\w*|dating|relationship)\b/i], ['family', /\b(mum|mom|dad|mother|father|sister|brother|family|parents?|son|daughter|kids?)\b/i],
    ['study', /\b(exams?|tests?|grades?|marks?|teacher|lecturer|assignment|uni|school|essay|course)\b/i], ['work', /\b(boss|manager|work|job|meeting|deadline|client|colleague|team|promotion|fired|presentation)\b/i],
    ['reply', /\b(text|texted|message|messaged|reply|replied|ignored|ghost\w*)\b/i], ['social', /\b(friends?|party|everyone|people|group|awkward|embarrass\w*)\b/i]];
  const domainOf = (t) => { const d = DOMS.find(x => x[1].test(String(t || ''))); return d ? d[0] : 'none'; };
  const STAMP = "'Alfa Slab One', 'Rockwell Extra Bold', Rockwell, 'Roboto Slab', 'TeX Gyre Bonum', Georgia, serif";
  const LABEL = "Staatliches, 'Bebas Neue', Oswald, 'Arial Narrow', 'TeX Gyre Heros Cn', sans-serif";
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

  (env.games = env.games || []).push({
    id: 'should-forge', mode: 'reframe', name: 'Should Forge', verb: 'forge', family: 'REFRAME', minutes: 2,
    parents: ['Inner Speech / Mental Text', 'Performance / Confidence', 'Communication / Boundaries'],
    cast: ['rush', 'still'], poster: { char: 'rush', mood: 'determined' },
    fonts: ['Alfa+Slab+One', 'Staatliches'],
    tagline: 'Heat your “should”, hammer it on the beat, bend it into a preference.',
    why: 'For rigid shoulds and musts: keep what you value, lose the command.',
    css: `
.g-should-forge { --sf-paper: #f6ecd8; --sf-ink: #2a1a10; }
.g-should-forge .sf-touch { position: absolute; inset: 0; z-index: 4; touch-action: none; cursor: pointer; }
.g-should-forge .sf-order { position: absolute; z-index: 20; left: 12px; right: 12px; top: calc(env(safe-area-inset-top, 0px) + 62px); padding: 9px 13px 10px; border-radius: 6px 6px 10px 10px;
  background: linear-gradient(180deg, #fbf3e2, #efe0c2); color: var(--sf-ink); box-shadow: 0 1px 0 #fff inset, 0 10px 26px rgba(0, 0, 0, .45); transform: rotate(-.6deg); pointer-events: none;
  transition: opacity .4s ease, transform .5s cubic-bezier(.2, 1.2, .3, 1); }
.g-should-forge .sf-order::before { content: ""; position: absolute; left: 50%; top: -6px; width: 12px; height: 12px; margin-left: -6px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #d9dde3, #6c727c 70%); box-shadow: 0 2px 3px rgba(0, 0, 0, .5); }
.g-should-forge .sf-order.out { opacity: 0; transform: translateY(-20px) rotate(-2deg); }
.g-should-forge .sf-oh { display: flex; justify-content: space-between; align-items: center; gap: 8px; font: 400 15px/1 ${LABEL}; letter-spacing: .08em; color: #7a4a22; }
.g-should-forge .sf-steps { display: flex; gap: 4px; }
.g-should-forge .sf-steps span { font: 400 13px/1 ${LABEL}; letter-spacing: .06em; padding: 3px 6px 2px; border-radius: 4px; color: #a08060; background: rgba(120, 80, 40, .1); }
.g-should-forge .sf-steps span.on { color: #fff6e6; background: linear-gradient(180deg, #e2521c, #a3281a); box-shadow: 0 0 10px rgba(255, 120, 40, .6); }
.g-should-forge .sf-steps span.done { color: #6b4a2a; background: rgba(120, 80, 40, .22); text-decoration: line-through; }
.g-should-forge .sf-line { margin-top: 6px; font: 600 16px/1.3 var(--font-ui); color: var(--sf-ink); text-wrap: balance; }
.g-should-forge .sf-line s { text-decoration-thickness: 2px; text-decoration-color: #d0402a; }
.g-should-forge .sf-line b { color: #b4410f; }
.g-should-forge .sf-line em { font-style: normal; color: #5a3a20; }
.g-should-forge .sf-line.swap { animation: sf-swap .7s ease both; }
@keyframes sf-swap { 0% { opacity: .2; filter: blur(2px); } 100% { opacity: 1; filter: none; } }
.g-should-forge .sf-meter { margin-top: 7px; height: 8px; border-radius: 4px; background: rgba(60, 30, 10, .16); overflow: hidden; }
.g-should-forge .sf-meter i { display: block; height: 100%; width: calc(var(--k, 0) * 100%); border-radius: 4px; background: linear-gradient(90deg, #7a1f12, #e2521c 45%, #ffc24a 85%, #fff1c4); transition: width .15s linear; }
.g-should-forge .sf-meter.cool i { background: linear-gradient(90deg, #3b6aa8, #8cc3f0); }
.g-should-forge .sf-kbd { position: absolute; left: 0; top: 0; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.g-should-forge .gk-char.gk-side-right .gk-bubble, .g-should-forge .gk-char.gk-side-left .gk-bubble { top: auto; bottom: 0; max-width: min(300px, calc(100cqw - 2 * var(--sz, 72px) - 58px)); }
.g-should-forge .gk-char.gk-side-right .gk-bubble::before, .g-should-forge .gk-char.gk-side-left .gk-bubble::before { top: auto; bottom: 20px; }
.g-should-forge .gk-char.sf-right.gk-char-dock { left: auto; right: 12px; }
.g-should-forge .gk-char { transition: opacity .4s ease; }
.g-should-forge .gk-char.sf-hide { opacity: 0; }
@container (min-width: 700px) { .g-should-forge .gk-char.gk-side-right .gk-bubble, .g-should-forge .gk-char.gk-side-left .gk-bubble { max-width: 330px; }
  .g-should-forge .sf-order { left: 16px; right: auto; width: 440px; top: calc(env(safe-area-inset-top, 0px) + 66px); } }
.g-should-forge .sf-fin { position: absolute; z-index: 40; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
.g-should-forge .sf-fin-h { font: 400 28px/1 ${LABEL}; letter-spacing: .06em; color: #ffe2a8; text-shadow: 0 2px 14px rgba(255, 140, 40, .55); text-align: center; animation: sf-in .7s ease .2s both; }
.g-should-forge .sf-tag { position: relative; padding: 10px 14px 11px 22px; border-radius: 4px 12px 12px 4px; background: linear-gradient(180deg, #fbf3e2, #ead9b6); color: var(--sf-ink);
  box-shadow: 0 8px 20px rgba(0, 0, 0, .45); animation: sf-in .7s cubic-bezier(.2, 1.2, .3, 1) both; }
.g-should-forge .sf-tag::before { content: ""; position: absolute; left: 7px; top: 50%; width: 8px; height: 8px; margin-top: -4px; border-radius: 50%; background: #2a1a10; box-shadow: 0 0 0 2px #c9a46a; }
.g-should-forge .sf-tag small { display: block; font: 400 13px/1 ${LABEL}; letter-spacing: .1em; color: #8a5a2a; margin-bottom: 4px; }
.g-should-forge .sf-tag .gk-user { font: 600 16px/1.3 var(--font-ui); }
.g-should-forge .sf-tag:nth-child(3) { animation-delay: .35s; }
.g-should-forge .sf-fin-foot { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px 12px; font: 400 14px/1.2 ${LABEL}; letter-spacing: .08em; color: #f2d2a0; text-shadow: 0 1px 6px rgba(0, 0, 0, .6); animation: sf-in .7s ease .7s both; }
.g-should-forge .sf-fin-care { font: 600 13px/1.35 var(--font-ui); color: #f6e6c8; text-shadow: 0 1px 6px rgba(0, 0, 0, .7); }
.g-should-forge .sf-fin.sf-tight { gap: 6px; }
.g-should-forge .sf-fin.sf-tight .sf-fin-h { font-size: 22px; }
.g-should-forge .sf-fin.sf-tight .sf-tag { padding: 7px 12px 8px 22px; }
.g-should-forge .sf-fin.sf-tight .sf-tag .gk-user { font-size: 15px; line-height: 1.25; }
@keyframes sf-in { from { opacity: 0; translate: 0 14px; } }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const clamp = K.clamp, lerp = K.lerp, ease = K.ease;
      const now = () => performance.now();
      const L = (o, sub) => { let s = ctx.line(o) || ''; if (sub) Object.keys(sub).forEach(k => { s = s.split('{' + k + '}').join(sub[k]); }); return s; };
      const text = String(ctx.text || ''), noWords = !text.trim();
      const care = an.safety === 'care', strong = an.fear_support === 'strong';
      const inten = clamp(ctx.intensity | 0, 0, 2), visits = K.visits();
      const bright = () => S.scene() === 'bright';
      const hall = HALLS[(K.daily() * 2 + 1) % HALLS.length], nextHall = HALLS[((K.daily() + 1) * 2 + 1) % HALLS.length];
      const shape = SHAPES[visits % SHAPES.length];

      /* ---------------- the two shoulds ---------------- */
      const dom = domainOf(text);
      const found = noWords ? { self: null, other: null } : findShoulds(text, an.distortions);
      const pick = (p, gen) => p || parseShould(gen) || parseShould(GEN_SELF.none);
      const bars = [{ p: pick(found.self, GEN_SELF[dom] || GEN_SELF.none), own: !!found.self }, { p: pick(found.other, GEN_OTHER[dom] || GEN_OTHER.none), own: !!found.other }]
        .map((b, i) => {
          const r = rewrite(b.p), oldT = b.p.orig.replace(/\s+/g, ' ').trim().toUpperCase(), newT = r.head.toUpperCase();
          const mi = oldT.indexOf(b.p.mod.toUpperCase());
          return { i, p: b.p, r, own: b.own, oldT, newT, modA: mi >= 0 ? mi : 0, modB: mi >= 0 ? mi + b.p.mod.length : Math.min(6, oldT.length),
            L: 300, L0: 300, L1: 300, T: 32, heat: 0, flat: 0, morph: 0, bend: 0, quench: 0, temper: 0, x: 0, y: 0, rot: 0, strikes: 0, credit: 0, fOld: 16, fNew: 16, gOld: [], gNew: [], hit: 0, seed: 17 + i * 31 };
        });

      /* ---------------- state ---------------- */
      const st = { phase: 'intro', bi: 0, finished: false, fire: 0.3, pump: 0, pumping: false, onBeat: 0, total: 0, shake: 0, hammer: 0, hammerT: 0, bendGrab: null, dip: 0, dipT: 0, dipGrab: null, done: [] };
      const cam = { x: 0, from: 0, to: 0, t0: 0, dur: 1 };
      const G = { w: 0, h: 0, phone: true };
      const P = K.particles({ max: 520 });
      const steam = [], ripples = [];
      const SOFT = softwareGfx();
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1.25 : 2 });
      const touch = h('div', { class: 'sf-touch', 'aria-hidden': 'true' });
      const kbd = h('button', { type: 'button', class: 'sf-kbd', 'aria-label': 'Forge: press and hold Space or Enter to pump, press on the beat to hammer, arrow keys to bend and quench' });
      const stepEls = ['Heat', 'Hammer', 'Bend', 'Quench'].map(t => h('span', { text: t }));
      const orderH = h('span', { text: 'Work order 1 of 2' });
      const orderLine = h('div', { class: 'sf-line gk-user' });
      const meter = h('div', { class: 'sf-meter' }, h('i'));
      const order = h('div', { class: 'sf-order', role: 'status', 'aria-live': 'polite' }, h('div', { class: 'sf-oh' }, orderH, h('div', { class: 'sf-steps' }, stepEls)), orderLine, meter);
      el.append(touch, kbd, order);
      const csz = K.phone() ? 72 : 96;
      const rush = K.character('rush', { side: 'right', mood: 'determined', size: csz });
      const still = K.character('still', { side: 'left', mood: 'calm', size: csz });
      still.el.classList.add('sf-right');
      const speak = (c, line, o) => { (c === rush ? still : rush).hush(); return c.say(line, o); };
      const setMeter = (k, cool) => { meter.firstChild.style.setProperty('--k', clamp(k, 0, 1).toFixed(3)); meter.classList.toggle('cool', !!cool); };
      function setStep(n) { stepEls.forEach((e, i) => { e.classList.toggle('on', i === n); e.classList.toggle('done', i < n); }); }
      function orderShow(b, mode) {
        orderH.textContent = (b.i === 0 ? 'Work order 1 of 2' : 'Work order 2 of 2') + (b.own ? '' : ' · a common one');
        orderLine.replaceChildren();
        if (mode === 'old') { const o = b.p.orig.charAt(0).toUpperCase() + b.p.orig.slice(1), mi = o.toLowerCase().indexOf(b.p.mod); if (mi >= 0) orderLine.append(o.slice(0, mi), h('s', { text: o.slice(mi, mi + b.p.mod.length) }), o.slice(mi + b.p.mod.length) + '.'); else orderLine.append(o + '.'); }
        else { const hd = b.r.head, md = b.r.modal || ''; if (md && hd.indexOf(md) === 0) orderLine.append(h('b', { text: md }), hd.slice(md.length) + ', ', h('em', { text: b.r.tail })); else orderLine.append(b.r.full); }
        orderLine.classList.remove('swap'); void orderLine.offsetWidth; orderLine.classList.add('swap');
      }

      /* ---------------- sound: a forge work-song that is also the hammer's clock ---------------- */
      const bpm = [80, 90, 100][inten];
      const PROG = [['D2', ['D4', 'F4', 'A4']], ['A#1', ['D4', 'F4', 'A#4']], ['F2', ['C4', 'F4', 'A4']], ['C2', ['C4', 'E4', 'G4']]];
      const mix = { bed: 0.5 };
      let bedOn = false;
      const R = K.rhythm({ bpm, onBeat: (t, i, b) => {
        if (!A.ctx || !bedOn) return;
        const v = mix.bed, bar = Math.floor(i / 4) % PROG.length, [bass, chord] = PROG[bar], beat = 60 / R.bpm;
        if (b === 0) { A.tone({ when: t, type: 'sine', freq: 120, to: 48, glide: 0.16, dur: 0.42, vol: 0.32 * v, bus: 'music' }); A.noise({ when: t, filter: 'lowpass', freq: 400, dur: 0.08, vol: 0.12 * v, bus: 'music' }); A.pluck(A.note(bass), { when: t, vol: 0.28 * v, damp: 0.994, lp: 600, bus: 'music' }); }
        if (b === 2) A.tone({ when: t, type: 'sine', freq: 150, to: 70, glide: 0.12, dur: 0.3, vol: 0.18 * v, bus: 'music' });
        if (b === 1 || b === 3) A.noise({ when: t, filter: 'bandpass', freq: 2600, q: 3, dur: 0.05, vol: 0.05 * v, bus: 'music' });
        A.noise({ when: t + beat / 2, filter: 'highpass', freq: 6200, dur: 0.05, attack: 0.012, vol: 0.022 * v, bus: 'music' });
        if (b === 0 && i % 8 === 0) chord.forEach((n, k) => A.tone({ when: t + k * 0.02, type: 'triangle', freq: A.note(n), dur: beat * 7.5, vol: 0.035 * v, attack: 0.6, lp: 1300, verb: 0.4, bus: 'music' }));
        if (st.phase === 'hammer') A.chime(A.note(chord[(i + 1) % chord.length]) * 2, { when: t, vol: 0.018 * v, dur: 0.5, bus: 'music' });
        beats.push(t); if (beats.length > 8) beats.shift();
      } });
      const beats = [];
      let roar = null, hiss = null, groan = null, wind = null;
      function beds() {
        if (!A.ctx || roar) return;
        roar = A.loop({ pink: true, filter: 'lowpass', freq: 260, q: 0.7, bus: 'amb' }); hiss = A.loop({ filter: 'highpass', freq: 3000, q: 0.5 }); groan = A.loop({ filter: 'bandpass', freq: 300, q: 9 });
        wind = A.loop({ pink: true, filter: 'bandpass', freq: hall.view === 'snow' ? 1800 : 500, q: 0.6, bus: 'amb' });
        S.onDestroy(() => { [roar, hiss, groan, wind].forEach(x => x && x.stop()); });
      }
      beds(); S.on('audio-ready', beds);
      const beatLen = () => 60 / (R.bpm || bpm);
      function beatPulse() { if (!A.ctx || !beats.length) return 0; const vt = A.now() - A.latency(); let last = -1; beats.forEach(b => { if (b <= vt) last = b; }); return last < 0 ? 0 : Math.exp(-(vt - last) / beatLen() * 5); }
      function clang(grade) {
        K.sfx.thud();
        if (!A.ctx) return;
        const t = A.now(), base = grade === 'perfect' ? 1046 : grade === 'good' ? 932 : 698, v = grade === 'perfect' ? 1 : grade === 'good' ? 0.8 : 0.5, verb = hall.view === 'peaks' ? 0.55 : 0.3;
        [[1, 0.2], [2.76, 0.09], [5.4, 0.05], [8.93, 0.025]].forEach(([m, a]) => A.tone({ when: t, type: 'sine', freq: base * m, dur: (grade === 'perfect' ? 1.6 : 0.9) / Math.sqrt(m), vol: a * v, attack: 0.001, verb, lp: grade === 'early' || grade === 'late' ? 2600 : undefined }));
        A.noise({ when: t, filter: 'highpass', freq: 3200, dur: 0.03, vol: 0.28 * v }); A.tone({ when: t, type: 'sine', freq: 140, to: 60, glide: 0.08, dur: 0.16, vol: 0.3 * v });
      }

      /* ---------------- layout: three stations in a wide world; phones pan between them ---------------- */
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        G.w = W; G.h = H; G.phone = W < 700;
        const u = G.phone ? clamp(W / 390, 0.85, 1.15) : clamp(H / 860, 0.8, 1.2);
        G.u = u; G.floor = G.phone ? H - 118 : H - 58;
        G.st = G.phone ? [W * 0.5, W * 1.5, W * 2.5] : [W * 0.22, W * 0.52, W * 0.82];
        G.worldW = G.phone ? W * 3 : W;
        G.forge = { x: G.st[0] - (G.phone ? 26 : 10) * u, y: G.floor - 236 * u, w: 262 * u };
        G.bellows = { x: G.forge.x + (G.phone ? 118 : 172) * u, y: G.floor - 58 * u, w: 128 * u, h: 64 * u };
        G.anvil = { x: G.st[1], y: G.floor - 198 * u, w: 236 * u };
        G.barrel = { x: G.st[2], y: G.floor - 176 * u, w: 176 * u, h: 176 * u };
        G.barLen = (G.phone ? Math.min(W - 92, 300) : 360) * (G.phone ? 1 : u); G.barT = (G.phone ? 34 : 38) * u;
        G.top = G.phone ? 176 : 110;
        bars.forEach(b => { b.T = G.barT; layoutText(b); });
        coals = null; bgKey = '';
        cam.x = camFor(st.phase); cam.to = cam.x; cam.from = cam.x;
        placeBar(bars[st.bi], st.phase, true);
        if (finEl) placeFin();
      }
      function camFor(phase) { if (!G.phone) return 0; const s = phase === 'heat' || phase === 'intro' ? 0 : phase === 'quench' || phase === 'cool' || phase === 'carry2' ? 2 : 1; return G.st[s] - G.w / 2; }
      function panTo(phase, ms) { const x = camFor(phase); if (Math.abs(x - cam.x) < 1) { cam.to = x; return; } cam.from = cam.x; cam.to = x; cam.t0 = now(); cam.dur = K.reduced() ? 1 : ms; }
      const sx = (x) => x - cam.x + (st.shakeX || 0), sy = (y) => y + (st.shakeY || 0);

      /* ---------------- stamped text along the bar ---------------- */
      const meas = document.createElement('canvas').getContext('2d');
      function glyphs(str, px) { meas.font = '400 ' + px + 'px ' + STAMP; const out = []; let x = 0; const sp = px * 0.08; for (const ch of str) { const w = meas.measureText(ch).width; out.push({ ch, x: x + w / 2, w }); x += w + sp; } return { list: out, w: Math.max(0, x - sp) }; }
      function fitText(str, maxW, maxPx, minPx) { let px = maxPx, g = glyphs(str, px); if (g.w > maxW) { px = Math.max(minPx, px * maxW / g.w); g = glyphs(str, px); } let s = str; while (g.w > maxW && s.length > 8) { s = s.replace(/\s*\S+(…)?$/, '') + '…'; g = glyphs(s, px); } return { px, g, s }; }
      function layoutText(b) {
        const maxPx = Math.round(b.T * 0.56), minPx = Math.max(12, Math.round(b.T * 0.38)), Lmax = G.phone ? G.w - 64 : G.barLen * 1.18;
        b.L0 = G.barLen;
        const o = fitText(b.oldT, b.L0 - 26, maxPx, minPx); b.fOld = o.px; b.gOld = o.g;
        const n0 = glyphs(b.newT, o.px);
        b.L1 = clamp(n0.w + 30, b.L0, Lmax);
        const n = fitText(b.newT, b.L1 - 26, o.px, minPx); b.fNew = n.px; b.gNew = n.g;
        if (!b.struck) b.L = b.L0;
      }
      let PZ = null;
      /* centreline of the bar: curvature integrated from the middle out, so the bend can be a horseshoe, a hook or a scroll */
      function geom(b) {
        const N = 40, Lb = b.L, ds = Lb / N, mid = N / 2, k = b.bend;
        const kap = (s) => {
          if (k <= 0) return 0;
          if (shape === 'Horseshoe') return -k * 1.12 * Math.PI / Lb;
          if (shape === 'Hook') return s > 0.42 * Lb ? -k * 1.25 * Math.PI / (0.58 * Lb) : 0;
          return s < 0.32 * Lb ? k * 1.05 * Math.PI / (0.32 * Lb) : s > 0.68 * Lb ? -k * 1.05 * Math.PI / (0.32 * Lb) : 0; // scroll: left end curls down, right end up
        };
        const a = new Float32Array(N + 1), px = new Float32Array(N + 1), py = new Float32Array(N + 1);
        for (let i = mid; i < N; i++) a[i + 1] = a[i] + kap((i + 0.5) * ds) * ds;
        for (let i = mid; i > 0; i--) a[i - 1] = a[i] - kap((i - 0.5) * ds) * ds;
        for (let i = mid; i < N; i++) { const am = (a[i] + a[i + 1]) / 2; px[i + 1] = px[i] + Math.cos(am) * ds; py[i + 1] = py[i] + Math.sin(am) * ds; }
        for (let i = mid; i > 0; i--) { const am = (a[i] + a[i - 1]) / 2; px[i - 1] = px[i] - Math.cos(am) * ds; py[i - 1] = py[i] - Math.sin(am) * ds; }
        const c = Math.cos(b.rot), s = Math.sin(b.rot), out = { n: N, ds, x: new Float32Array(N + 1), y: new Float32Array(N + 1), a: new Float32Array(N + 1) };
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i <= N; i++) { const X = px[i] * c - py[i] * s, Y = px[i] * s + py[i] * c; out.x[i] = b.x + X; out.y[i] = b.y + Y; out.a[i] = a[i] + b.rot; if (Y > hi) hi = Y; if (Y < lo) lo = Y; }
        out.lo = lo; out.hi = hi;
        return out;
      }
      function at(gm, s) { const f = clamp(s / gm.ds, 0, gm.n - 0.001), i = Math.floor(f), t = f - i; return { x: lerp(gm.x[i], gm.x[i + 1], t), y: lerp(gm.y[i], gm.y[i + 1], t), a: lerp(gm.a[i], gm.a[i + 1], t) }; }
      function strokeAlong(g, gm, off, w, col) { g.beginPath(); for (let i = 0; i <= gm.n; i++) { const x = sx(gm.x[i] - Math.sin(gm.a[i]) * off), y = sy(gm.y[i] + Math.cos(gm.a[i]) * off); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.lineWidth = w; g.strokeStyle = col; g.stroke(); }
      const TEMPER = ['#d8b45a', '#c08a3a', '#9a5a2a', '#7a3a6a', '#4a4a9a', '#3a6aa8', '#7d8a9a'];
      function drawBar(g, b, t) {
        const gm = geom(b), T = b.T, hv = clamp(b.heat, 0, 1), fin = b.finish;
        g.lineCap = b.struck || b.bend > 0 ? 'round' : 'butt'; g.lineJoin = 'round';
        // the glow of hot iron
        if (hv > 0.3 && !fin) { g.save(); g.lineCap = 'round'; g.globalCompositeOperation = bright() ? 'source-over' : 'lighter'; const gc = heatCol(Math.min(1, hv + 0.05)), ga = (hv - 0.3) / 0.7; strokeAlong(g, gm, 0, T * 3.2, rgba(gc, 0.035 * ga)); strokeAlong(g, gm, 0, T * 2.2, rgba(gc, 0.07 * ga)); strokeAlong(g, gm, 0, T * 1.45, rgba(gc, 0.12 * ga)); g.restore(); }
        let body;
        if (fin) body = FINISH[fin][1];
        else body = mixHex('#55585f', heatCol(hv), clamp((hv - 0.12) / 0.3, 0, 1));
        if (b.temper > 0 && !fin) { // temper colours run along the bar as it cools
          const n = gm.n; g.lineWidth = T;
          for (let i = 0; i < n; i++) { const tc = TEMPER[Math.floor((i / n) * (TEMPER.length - 1) + Math.sin(b.seed + i * 0.3) * 0.6 + 0.6) % TEMPER.length]; g.strokeStyle = mixHex(body, mixHex('#6b7280', tc, 0.6), b.temper); g.beginPath(); g.moveTo(sx(gm.x[i]), sy(gm.y[i])); g.lineTo(sx(gm.x[i + 1]), sy(gm.y[i + 1])); g.stroke(); }
        } else strokeAlong(g, gm, 0, T, body);
        strokeAlong(g, gm, T * 0.24, T * 0.48, fin ? rgba(FINISH[fin][2], 0.55) : 'rgba(20,8,6,' + (0.42 - hv * 0.18).toFixed(2) + ')');
        strokeAlong(g, gm, -T * 0.31, T * 0.16, fin ? rgba(FINISH[fin][0], 0.9) : hv > 0.4 ? rgba(heatCol(Math.min(1, hv + 0.2)), 0.85) : 'rgba(255,255,255,.22)');
        // hammer dents
        if (b.struck && !fin) { g.fillStyle = 'rgba(30,10,4,' + (0.25 - hv * 0.1).toFixed(2) + ')'; for (let i = 0; i < Math.min(14, b.strikes * 2); i++) { const p = at(gm, b.L * (0.18 + ((i * 0.37 + b.seed * 0.01) % 0.64))); g.beginPath(); g.ellipse(sx(p.x), sy(p.y - T * 0.08), T * 0.16, T * 0.07, p.a, 0, TAU); g.fill(); } }
        drawStamp(g, b, gm, t);
        if (fin) { // a glint that sweeps along the charm
          const gs = ((t * 0.45 + b.i * 0.5) % 1.6) - 0.3;
          if (gs > 0 && gs < 1) { const p = at(gm, b.L * gs); g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(K.glowSprite('#ffffff'), sx(p.x) - T, sy(p.y) - T, T * 2, T * 2); g.fillStyle = '#ffffff'; K.starPath(g, sx(p.x), sy(p.y - T * 0.2), T * 0.5, T * 0.1, 4, 0); g.fill(); g.restore(); }
        }
        return gm;
      }
      function drawStamp(g, b, gm, t) {
        const hv = clamp(b.heat, 0, 1), m = b.morph, T = b.T, fin = b.finish;
        const layer = (gl, px, which) => {
          const off = (b.L - gl.w) / 2;
          g.font = '400 ' + px + 'px ' + STAMP; g.textAlign = 'center'; g.textBaseline = 'middle';
          gl.list.forEach((q, idx) => {
            const sPos = off + q.x, f = sPos / b.L;
            let alpha = 1, sxk = 1, syk = 1, rot = 0, glow = 0;
            if (which === 'old') {
              const local = clamp((m * 1.35 - f) / 0.35, 0, 1); alpha = 1 - local; glow = local > 0 && local < 1 ? 1 : 0;
              if (idx >= b.modA && idx < b.modB) { const d = b.flat, j = Math.sin(b.seed + idx * 2.3); sxk = 1 + 0.6 * d; syk = 1 - 0.66 * d; rot = j * 0.3 * d; alpha *= 1 - 0.4 * d; }
            } else { const local = clamp((m * 1.35 - f) / 0.35, 0, 1); alpha = local; sxk = syk = 0.65 + 0.35 * local; glow = local > 0 && local < 1 ? 1 : 0; }
            if (alpha < 0.02 || q.ch === ' ') return;
            const p = at(gm, sPos), x = sx(p.x), y = sy(p.y);
            g.save(); g.translate(x, y); g.rotate(p.a + rot); g.scale(sxk, syk); g.globalAlpha = alpha;
            if (fin) { g.fillStyle = rgba(FINISH[fin][2], 0.85); g.fillText(q.ch, 0, 0); g.fillStyle = rgba(FINISH[fin][0], 0.6); g.fillText(q.ch, 0.8, 1); }
            else if (hv > 0.45 || glow) { // hot: a bright lip over a dark groove, and the edges soften as it heats
              g.fillStyle = glow ? '#fffbe8' : rgba(heatCol(Math.min(1, hv + 0.28)), 0.95); g.fillText(q.ch, 0, -1.1);
              g.fillStyle = glow ? 'rgba(255,240,190,.9)' : 'rgba(70,16,4,.78)'; g.fillText(q.ch, 0, 0);
              if (hv > 0.62 && !K.reduced()) { g.globalAlpha = alpha * 0.22; g.fillText(q.ch, 1, 0); g.fillText(q.ch, -1, 0); }
            } else { g.fillStyle = 'rgba(12,6,4,.62)'; g.fillText(q.ch, 0, 0); g.fillStyle = 'rgba(255,255,255,.16)'; g.fillText(q.ch, 0.6, 1.4); }
            if (which === 'old' && idx >= b.modA && idx < b.modB && b.flat > 0.15 && hv > 0.4) { g.globalAlpha = alpha * 0.3 * b.flat; g.fillStyle = heatCol(Math.min(1, hv + 0.25)); g.fillText(q.ch, 3 * b.flat, 0); g.fillText(q.ch, -3 * b.flat, 0); }
            g.restore();
          });
        };
        if (m < 1) layer(b.gOld, b.fOld, 'old');
        if (m > 0) layer(b.gNew, b.fNew, 'new');
        void T; void t;
      }

      /* ---------------- the world (static parts cached) ---------------- */
      const bgC = document.createElement('canvas'); let bgKey = '', coals = null;
      const glowSpr = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,170,80,.9)'); gr.addColorStop(0.35, 'rgba(255,110,40,.35)'); gr.addColorStop(1, 'rgba(255,90,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return c; })();
      const flameSpr = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 96, 2, 32, 80, 64); gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.25, 'rgba(255,200,90,.9)'); gr.addColorStop(0.6, 'rgba(255,100,30,.45)'); gr.addColorStop(1, 'rgba(200,40,10,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(32, 2); g.bezierCurveTo(50, 50, 62, 80, 58, 104); g.bezierCurveTo(54, 124, 10, 124, 6, 104); g.bezierCurveTo(2, 80, 14, 50, 32, 2); g.fill(); return c; })();
      const puffSpr = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,.75)'); gr.addColorStop(0.5, 'rgba(240,244,250,.35)'); gr.addColorStop(1, 'rgba(230,236,245,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return c; })();
      function renderBg() {
        const W = G.w, H = G.h, br = bright(), dpr = Math.min(cv.dpr || 1, 1.5), WW = G.worldW, u = G.u, fl = G.floor;
        bgC.width = Math.max(2, Math.round(WW * dpr)); bgC.height = Math.max(2, Math.round(H * dpr));
        const g = bgC.getContext('2d', { alpha: false }); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const wall = br ? mixHex(hall.wall, '#f3e6d2', 0.62) : hall.wall, wall2 = br ? mixHex(hall.wall2, '#e8d7bf', 0.6) : hall.wall2, mortar = br ? mixHex(hall.mortar, '#bfa98c', 0.6) : hall.mortar;
        let gr = g.createLinearGradient(0, 0, 0, fl); gr.addColorStop(0, wall2); gr.addColorStop(1, wall); g.fillStyle = gr; g.fillRect(0, 0, WW, fl);
        // stone courses
        const rr = K.rng(K.daily() + 3), bh = 34 * u;
        g.strokeStyle = rgba(mortar, br ? 0.55 : 0.7); g.lineWidth = 2;
        for (let y = fl - bh, row = 0; y > -bh; y -= bh, row++) {
          g.beginPath(); g.moveTo(0, y); g.lineTo(WW, y); g.stroke();
          let x = (row % 2) * 30 * u - 20 * u; while (x < WW) { const w = (56 + rr() * 50) * u; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + bh); g.stroke(); const lt = rr(); g.fillStyle = rgba(lt < 0.45 ? '#000000' : lt < 0.9 ? '#ffffff' : '#ffb070', 0.02 + rr() * 0.05); g.fillRect(x + 2, y + 2, w - 4, bh - 4); g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(x + 2, y + 2, w - 4, 3); x += w; }
        }
        // a window behind the anvil with today's hall outside
        const wx = G.st[1], ww = (G.phone ? 190 : 230) * u, wtop = G.top + 6 * u, whh = Math.min(240 * u, G.anvil.y - wtop - 40 * u);
        if (whh > 60) {
          g.save(); g.beginPath(); g.moveTo(wx - ww / 2, wtop + whh); g.lineTo(wx - ww / 2, wtop + ww / 2); g.arc(wx, wtop + ww / 2, ww / 2, Math.PI, 0); g.lineTo(wx + ww / 2, wtop + whh); g.closePath(); g.clip();
          const sky = br ? hall.skyB : hall.skyD; gr = g.createLinearGradient(0, wtop, 0, wtop + whh); gr.addColorStop(0, sky[2]); gr.addColorStop(0.55, sky[1]); gr.addColorStop(1, sky[0]); g.fillStyle = gr; g.fillRect(wx - ww, wtop, ww * 2, whh);
          if (hall.view === 'dunes') { g.fillStyle = br ? '#e2a86a' : '#7a3d36'; g.beginPath(); g.moveTo(wx - ww, wtop + whh); for (let x = -ww; x <= ww; x += 8) g.lineTo(wx + x, wtop + whh * 0.72 + Math.sin(x * 0.03) * 12 * u); g.lineTo(wx + ww, wtop + whh); g.fill(); g.fillStyle = br ? '#fff3c4' : '#ffd08a'; g.beginPath(); g.arc(wx + ww * 0.18, wtop + whh * 0.55, 16 * u, 0, TAU); g.fill(); }
          else if (hall.view === 'snow') { g.fillStyle = br ? '#ffffff' : '#c8d6ea'; g.beginPath(); g.moveTo(wx - ww, wtop + whh); for (let x = -ww; x <= ww; x += 8) g.lineTo(wx + x, wtop + whh * 0.78 + Math.sin(x * 0.05) * 6 * u); g.lineTo(wx + ww, wtop + whh); g.fill(); g.fillStyle = br ? '#2e4a3a' : '#16241e'; for (let i = -2; i <= 2; i++) { const x = wx + i * ww * 0.2; g.beginPath(); g.moveTo(x, wtop + whh * 0.48); g.lineTo(x - 14 * u, wtop + whh * 0.8); g.lineTo(x + 14 * u, wtop + whh * 0.8); g.fill(); } }
          else { g.fillStyle = br ? '#6d86a8' : '#24324c'; g.beginPath(); g.moveTo(wx - ww, wtop + whh); g.lineTo(wx - ww * 0.35, wtop + whh * 0.36); g.lineTo(wx, wtop + whh * 0.62); g.lineTo(wx + ww * 0.28, wtop + whh * 0.3); g.lineTo(wx + ww, wtop + whh); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(wx - ww * 0.35, wtop + whh * 0.36); g.lineTo(wx - ww * 0.27, wtop + whh * 0.46); g.lineTo(wx - ww * 0.43, wtop + whh * 0.46); g.fill(); g.beginPath(); g.moveTo(wx + ww * 0.28, wtop + whh * 0.3); g.lineTo(wx + ww * 0.37, wtop + whh * 0.42); g.lineTo(wx + ww * 0.19, wtop + whh * 0.42); g.fill(); }
          g.restore();
          g.strokeStyle = br ? '#7a5a3a' : '#1c120c'; g.lineWidth = 9 * u; g.beginPath(); g.moveTo(wx - ww / 2, wtop + whh); g.lineTo(wx - ww / 2, wtop + ww / 2); g.arc(wx, wtop + ww / 2, ww / 2, Math.PI, 0); g.lineTo(wx + ww / 2, wtop + whh); g.stroke();
          g.lineWidth = 4 * u; g.beginPath(); g.moveTo(wx, wtop); g.lineTo(wx, wtop + whh); g.moveTo(wx - ww / 2, wtop + whh * 0.6); g.lineTo(wx + ww / 2, wtop + whh * 0.6); g.stroke();
          g.fillStyle = br ? '#8a6a48' : '#2a1a10'; g.fillRect(wx - ww / 2 - 10 * u, wtop + whh, ww + 20 * u, 10 * u);
          // daylight (or moonlight) falling through the window onto the floor
          g.save(); g.globalCompositeOperation = br ? 'source-over' : 'lighter';
          const lg = g.createLinearGradient(0, wtop + whh, 0, fl); lg.addColorStop(0, br ? 'rgba(255,248,220,.22)' : rgba(sky[0], 0.12)); lg.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = lg; g.beginPath(); g.moveTo(wx - ww / 2, wtop + whh); g.lineTo(wx + ww / 2, wtop + whh); g.lineTo(wx + ww * 0.95, fl); g.lineTo(wx - ww * 0.05, fl); g.closePath(); g.fill(); g.restore();
        }
        // a ceiling beam with iron straps
        const by0 = G.top - 4 * u; let bgr = g.createLinearGradient(0, by0, 0, by0 + 22 * u); bgr.addColorStop(0, br ? '#8a6040' : '#3a2416'); bgr.addColorStop(1, br ? '#5e3e26' : '#1e120a'); g.fillStyle = bgr; g.fillRect(0, by0, WW, 22 * u);
        g.fillStyle = br ? '#3a3a40' : '#121214'; for (let x = 60 * u; x < WW; x += 180 * u) { g.fillRect(x, by0 - 2, 10 * u, 26 * u); g.fillStyle = br ? '#9a9aa4' : '#3a3a40'; g.beginPath(); g.arc(x + 5 * u, by0 + 11 * u, 2.2 * u, 0, TAU); g.fill(); g.fillStyle = br ? '#3a3a40' : '#121214'; }
        // finished work on nails, by the barrel
        const hx0 = G.st[2] + (G.phone ? -96 : -120) * u, hy0 = G.top + 70 * u;
        for (let i = 0; i < 3; i++) { const x = hx0 + i * (G.phone ? 96 : 120) * u, y = hy0 + (i % 2) * 16 * u; g.fillStyle = br ? '#6a6a72' : '#26262c'; g.beginPath(); g.arc(x, y, 3 * u, 0, TAU); g.fill(); g.strokeStyle = br ? '#5a5f68' : '#33363d'; g.lineWidth = 9 * u; g.lineCap = 'round'; g.beginPath(); g.arc(x, y + 30 * u, 22 * u, Math.PI * 1.15, Math.PI * 1.85, true); g.stroke(); g.strokeStyle = br ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.12)'; g.lineWidth = 2 * u; g.beginPath(); g.arc(x, y + 30 * u, 25 * u, Math.PI * 0.2, Math.PI * 0.6); g.stroke(); }
        // tools on the wall behind the forge: tongs and hammers on pegs
        const tx = G.st[0] + (G.phone ? 120 : 150) * u, ty = G.top + 30 * u;
        if (ty < G.forge.y - 160 * u || !G.phone) {
          g.fillStyle = br ? '#5a4a3c' : '#15100c'; g.strokeStyle = br ? '#5a4a3c' : '#15100c'; g.lineCap = 'round';
          for (let i = 0; i < 3; i++) { const x = tx - i * 34 * u; g.beginPath(); g.arc(x, ty, 3 * u, 0, TAU); g.fill(); g.lineWidth = 5 * u; g.beginPath(); g.moveTo(x, ty); g.lineTo(x + (i - 1) * 4 * u, ty + 90 * u); g.stroke(); g.fillRect(x - 12 * u + (i - 1) * 4 * u, ty + 84 * u, 24 * u, 12 * u); }
        }
        // floor
        gr = g.createLinearGradient(0, fl, 0, H); gr.addColorStop(0, br ? mixHex(hall.floor, '#d8c2a2', 0.55) : hall.floor); gr.addColorStop(1, br ? mixHex(hall.floor, '#b89a74', 0.45) : '#0c0806'); g.fillStyle = gr; g.fillRect(0, fl, WW, H - fl);
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5; for (let x = 0; x < WW; x += 70 * u) { g.beginPath(); g.moveTo(x, fl); g.lineTo(x - 40 * u, H); g.stroke(); }
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, fl - 3, WW, 4);
        drawHearth(g, br); drawAnvil(g, br); drawBarrel(g, br);
        // a deep vignette, warm where the fire is
        const vg = g.createRadialGradient(G.forge.x, G.forge.y, 40 * u, G.forge.x, G.forge.y, Math.max(W, H) * 1.1); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, br ? 'rgba(60,30,10,.12)' : 'rgba(0,0,0,.45)'); g.fillStyle = vg; g.fillRect(0, 0, WW, H);
        bgKey = W + 'x' + H + (br ? 'b' : 'd') + dpr;
      }
      function drawHearth(g, br) {
        const f = G.forge, u = G.u, fl = G.floor, x0 = f.x - f.w / 2, top = f.y - 6 * u;
        // chimney hood
        const hb = f.y - 120 * u, ht = G.phone ? G.top - 30 : 60;
        let gr = g.createLinearGradient(x0, 0, x0 + f.w, 0); gr.addColorStop(0, br ? '#6a5a50' : '#1d1714'); gr.addColorStop(0.5, br ? '#8a7a6e' : '#302723'); gr.addColorStop(1, br ? '#5a4a40' : '#161210'); g.fillStyle = gr;
        g.beginPath(); g.moveTo(f.x - f.w * 0.46, hb); g.lineTo(f.x - f.w * 0.17, ht); g.lineTo(f.x + f.w * 0.17, ht); g.lineTo(f.x + f.w * 0.46, hb); g.closePath(); g.fill();
        g.fillStyle = br ? '#4a3c34' : '#0e0b09'; g.fillRect(f.x - f.w * 0.5, hb - 6 * u, f.w, 12 * u);
        g.fillStyle = br ? '#b9a898' : '#4a3c34'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(f.x - f.w * 0.44 + i * f.w * 0.147, hb, 2.4 * u, 0, TAU); g.fill(); }
        // brick hearth
        gr = g.createLinearGradient(0, top, 0, fl); gr.addColorStop(0, br ? '#a5664a' : '#5a2e20'); gr.addColorStop(1, br ? '#7e4a36' : '#2c160e'); g.fillStyle = gr;
        g.beginPath(); g.moveTo(x0, fl); g.lineTo(x0, top + 14 * u); g.quadraticCurveTo(x0, top, x0 + 14 * u, top); g.lineTo(x0 + f.w - 14 * u, top); g.quadraticCurveTo(x0 + f.w, top, x0 + f.w, top + 14 * u); g.lineTo(x0 + f.w, fl); g.closePath(); g.fill();
        g.strokeStyle = br ? 'rgba(60,20,10,.35)' : 'rgba(0,0,0,.4)'; g.lineWidth = 1.5;
        for (let y = top + 24 * u, row = 0; y < fl; y += 18 * u, row++) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + f.w, y); g.stroke(); for (let x = x0 + (row % 2) * 18 * u; x < x0 + f.w; x += 36 * u) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 18 * u); g.stroke(); } }
        // the fire pit
        g.fillStyle = '#0b0605'; g.beginPath(); g.ellipse(f.x, f.y, f.w * 0.43, 24 * u, 0, 0, TAU); g.fill();
        // tuyere pipe from the bellows
        const b = G.bellows; g.strokeStyle = br ? '#5a5048' : '#1a1512'; g.lineWidth = 12 * u; g.lineCap = 'round'; g.beginPath(); g.moveTo(b.x - b.w * 0.48, b.y - 4 * u); g.quadraticCurveTo(f.x + f.w * 0.42, b.y - 6 * u, f.x + f.w * 0.36, f.y + 10 * u); g.stroke();
      }
      function drawAnvil(g, br) {
        const a = G.anvil, u = G.u, fl = G.floor, x = a.x, y = a.y, w = a.w;
        // stump
        const sw = w * 0.5, stTop = y + 74 * u;
        let gr = g.createLinearGradient(x - sw / 2, 0, x + sw / 2, 0); gr.addColorStop(0, br ? '#7a5234' : '#3a2416'); gr.addColorStop(0.5, br ? '#9a6a44' : '#4e3220'); gr.addColorStop(1, br ? '#6a4428' : '#2c1a10'); g.fillStyle = gr;
        g.fillRect(x - sw / 2, stTop, sw, fl - stTop);
        g.fillStyle = br ? '#c79a6a' : '#6a4a30'; g.beginPath(); g.ellipse(x, stTop, sw / 2, 10 * u, 0, 0, TAU); g.fill();
        g.strokeStyle = br ? 'rgba(90,50,20,.5)' : 'rgba(30,15,5,.6)'; g.lineWidth = 1; for (let r = 4; r < sw / 2; r += 6 * u) { g.beginPath(); g.ellipse(x, stTop, r, r * 0.2, 0, 0, TAU); g.stroke(); }
        // anvil body: face, horn, waist, feet
        const fc = br ? '#4c525c' : '#2a2d33', dk = br ? '#2a2e35' : '#121417', hl = br ? '#a9b2bf' : '#6d7480';
        g.fillStyle = fc;
        g.beginPath(); g.moveTo(x - w * 0.3, y); g.lineTo(x + w * 0.48, y); g.lineTo(x + w * 0.48, y + 26 * u); g.lineTo(x + w * 0.2, y + 30 * u); g.quadraticCurveTo(x + w * 0.12, y + 46 * u, x + w * 0.16, y + 62 * u);
        g.lineTo(x + w * 0.3, y + 76 * u); g.lineTo(x - w * 0.3, y + 76 * u); g.lineTo(x - w * 0.16, y + 62 * u); g.quadraticCurveTo(x - w * 0.12, y + 46 * u, x - w * 0.2, y + 30 * u); g.lineTo(x - w * 0.3, y + 26 * u);
        g.quadraticCurveTo(x - w * 0.42, y + 22 * u, x - w * 0.56, y + 6 * u); g.quadraticCurveTo(x - w * 0.45, y + 2 * u, x - w * 0.3, y); g.closePath(); g.fill();
        g.fillStyle = dk; g.fillRect(x - w * 0.3, y + 22 * u, w * 0.78, 6 * u);
        gr = g.createLinearGradient(0, y, 0, y + 8 * u); gr.addColorStop(0, hl); gr.addColorStop(1, fc); g.fillStyle = gr; g.fillRect(x - w * 0.3, y, w * 0.78, 8 * u);
        g.fillStyle = dk; g.fillRect(x + w * 0.33, y + 3 * u, 8 * u, 8 * u);
      }
      function drawBarrel(g, br) {
        const b = G.barrel, u = G.u, fl = G.floor, x = b.x, top = b.y, w = b.w;
        let gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); gr.addColorStop(0, br ? '#6a4228' : '#2e1a0e'); gr.addColorStop(0.45, br ? '#a06a40' : '#5a3620'); gr.addColorStop(1, br ? '#5a3620' : '#24140a'); g.fillStyle = gr;
        g.beginPath(); g.moveTo(x - w * 0.5, top); g.quadraticCurveTo(x - w * 0.56, (top + fl) / 2, x - w * 0.47, fl); g.lineTo(x + w * 0.47, fl); g.quadraticCurveTo(x + w * 0.56, (top + fl) / 2, x + w * 0.5, top); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1.2; for (let i = 1; i < 6; i++) { const f = i / 6; g.beginPath(); g.moveTo(x - w * 0.5 + w * f, top); g.quadraticCurveTo(x - w * 0.5 + w * f + (f - 0.5) * w * 0.12, (top + fl) / 2, x - w * 0.47 + w * 0.94 * f, fl); g.stroke(); }
        g.strokeStyle = br ? '#4a4e56' : '#15171b'; g.lineWidth = 7 * u; [0.18, 0.78].forEach(f => { const y = lerp(top, fl, f), ex = w * (0.5 + 0.05 * Math.sin(f * Math.PI)); g.beginPath(); g.moveTo(x - ex, y); g.quadraticCurveTo(x, y + 8 * u, x + ex, y); g.stroke(); });
        g.fillStyle = br ? '#3a2616' : '#1a0e06'; g.beginPath(); g.ellipse(x, top, w * 0.5, 13 * u, 0, 0, TAU); g.fill();
      }
      function drawCoals(g, t, front) {
        const f = G.forge, u = G.u, fire = st.fire;
        if (!coals) { const rr = K.rng(9); coals = []; for (let i = 0; i < 30; i++) { const a = rr() * TAU, r = Math.sqrt(rr()); coals.push({ x: f.x + Math.cos(a) * r * f.w * 0.38, y: f.y + Math.sin(a) * r * 16 * u - 4 * u, s: (8 + rr() * 9) * u, ph: rr() * 6, pts: Array.from({ length: 6 }, (_, k) => 0.7 + rr() * 0.4) }); } coals.sort((a, b) => a.y - b.y); }
        coals.forEach(c => {
          if ((c.y > f.y) !== front) return;
          const glow = clamp(fire * (0.6 + 0.4 * Math.sin(t * 2.3 + c.ph)) * (0.7 + 0.3 * Math.sin(t * 7.1 + c.ph * 2)), 0, 1);
          g.beginPath(); c.pts.forEach((q, k) => { const a = k / 6 * TAU + c.ph, x = sx(c.x + Math.cos(a) * c.s * q), y = sy(c.y + Math.sin(a) * c.s * q * 0.7); if (k) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath();
          g.fillStyle = mixHex('#1a0f0b', heatCol(0.45 + glow * 0.5), glow * 0.85); g.fill();
          g.strokeStyle = rgba('#ffcf6a', 0.25 * glow); g.lineWidth = 1.2; g.stroke();
        });
      }
      function drawFire(g, t) {
        const f = G.forge, u = G.u, fire = st.fire;
        g.save(); g.globalCompositeOperation = bright() ? 'source-over' : 'lighter';
        const R0 = (150 + 160 * fire) * u; g.globalAlpha = bright() ? 0.25 + 0.25 * fire : 0.45 + 0.5 * fire; g.drawImage(glowSpr, sx(f.x) - R0, sy(f.y) - R0, R0 * 2, R0 * 2);
        g.globalAlpha = 1;
        for (let i = 0; i < 7; i++) { const x = f.x - f.w * 0.32 + i * f.w * 0.107, fl = (0.35 + 0.65 * fire) * (0.75 + 0.25 * Math.sin(t * (6 + i) + i * 1.7)) * (34 + (i % 3) * 14) * u, wv = Math.sin(t * 3 + i) * 4 * u; g.globalAlpha = 0.55 + 0.4 * fire; g.drawImage(flameSpr, sx(x + wv) - fl * 0.28, sy(f.y - fl * 0.95), fl * 0.56, fl * 1.1); }
        g.restore();
      }
      function drawBellows(g, t) {
        const b = G.bellows, u = G.u, c = st.pump, ang = lerp(0.46, 0.08, c), hx = sx(b.x - b.w / 2), hy = sy(b.y), br = bright();
        const L0 = b.w, tipX = hx + Math.cos(-ang) * L0, tipY = hy + Math.sin(-ang) * L0, botX = hx + L0, botY = hy + 8 * u;
        g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(hx + L0 * 0.55, botY + 9 * u, L0 * 0.62, 7 * u, 0, 0, TAU); g.fill();
        // leather bag: bulges out between the boards, with pleats that bunch up as it empties
        const bulge = (1 - c) * 26 * u + 6 * u;
        g.fillStyle = br ? '#8a5230' : '#5a301a';
        g.beginPath(); g.moveTo(hx + 4 * u, hy); g.lineTo(tipX, tipY); g.quadraticCurveTo(botX + bulge, (tipY + botY) / 2, botX, botY); g.closePath(); g.fill();
        const lg = g.createLinearGradient(hx, tipY, hx, botY); lg.addColorStop(0, 'rgba(255,220,180,.18)'); lg.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = lg; g.fill();
        g.strokeStyle = 'rgba(30,12,4,.5)'; g.lineWidth = 1.6;
        for (let i = 1; i < 6; i++) { const f = i / 6, ax = lerp(hx + 4 * u, tipX, f), ay = lerp(hy, tipY, f), bx = lerp(hx + 4 * u, botX, f), by = lerp(hy, botY, f); g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(lerp(ax, bx, 0.5) + bulge * f * 0.9, lerp(ay, by, 0.5), bx, by); g.stroke(); }
        // shaped wooden boards with a brass rim
        g.lineCap = 'round'; g.strokeStyle = br ? '#a8723e' : '#704626'; g.lineWidth = 10 * u;
        g.beginPath(); g.moveTo(hx, hy + 4 * u); g.lineTo(botX, botY); g.stroke();
        g.beginPath(); g.moveTo(hx, hy); g.lineTo(tipX, tipY); g.stroke();
        g.strokeStyle = br ? '#e2b56a' : '#b8863a'; g.lineWidth = 2 * u; g.beginPath(); g.moveTo(hx + 6 * u, hy - 3 * u); g.lineTo(tipX - 4 * u, tipY - 3 * u); g.stroke();
        // nozzle and handle
        g.fillStyle = br ? '#6a6058' : '#2a2420'; g.beginPath(); g.moveTo(hx + 2 * u, hy - 7 * u); g.lineTo(hx - 18 * u, hy - 1 * u); g.lineTo(hx + 2 * u, hy + 8 * u); g.fill();
        const hgx = tipX + Math.cos(-ang) * 10 * u, hgy = tipY + Math.sin(-ang) * 10 * u;
        g.strokeStyle = br ? '#8a5a30' : '#5a3418'; g.lineWidth = 8 * u; g.beginPath(); g.moveTo(tipX, tipY); g.lineTo(hgx + 12 * u, hgy - 4 * u); g.stroke();
        if (st.pumping && c < 1 && Math.random() < 0.5) P.emit('dust', hx - 18 * u, hy, 1, { colors: ['rgba(255,220,180,.35)'], angle: Math.PI * 0.92, spread: 0.5, speed: [60, 140] });
        const target = st.phase === 'heat' && !st.pumping;
        if (target) { const p = 0.5 + 0.5 * Math.sin(t * 4); g.save(); g.globalCompositeOperation = br ? 'source-over' : 'lighter'; g.globalAlpha = 0.35 + 0.35 * p; g.drawImage(K.glowSprite('#ffcf6a'), hgx - 24 * u, hgy - 28 * u, 52 * u, 52 * u); g.restore(); }
        g.fillStyle = br ? '#d8a25a' : '#c98a3a'; g.beginPath(); g.arc(hgx + 10 * u, hgy - 4 * u, 7 * u, 0, TAU); g.fill();
        st.bellowsPt = { x: hgx + 6 * u, y: hgy - 2 * u }; // screen space
      }
      function drawWater(g, t) {
        const b = G.barrel, u = G.u, br = bright();
        const gr = g.createLinearGradient(0, sy(b.y - 12 * u), 0, sy(b.y + 12 * u)); gr.addColorStop(0, br ? '#3e6a8a' : '#13283a'); gr.addColorStop(1, br ? '#2a4a66' : '#0a1622');
        g.fillStyle = gr; g.beginPath(); g.ellipse(sx(b.x), sy(b.y), b.w * 0.46, 10 * u, 0, 0, TAU); g.fill();
        g.strokeStyle = rgba('#bfe4ff', 0.25 + 0.1 * Math.sin(t * 2)); g.lineWidth = 1.2; g.beginPath(); g.ellipse(sx(b.x - b.w * 0.08), sy(b.y - 2 * u), b.w * 0.18, 3 * u, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
        for (let i = ripples.length - 1; i >= 0; i--) { const r = ripples[i]; r.t += 1 / 60; const k = r.t / 1.4; if (k >= 1) { ripples.splice(i, 1); continue; } if (k <= 0) continue; g.strokeStyle = 'rgba(200,230,255,' + (0.5 * (1 - k)).toFixed(3) + ')'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(sx(r.x), sy(b.y), Math.min(b.w * 0.45, 10 + k * b.w * 0.5), Math.min(9 * u, 2 + k * 9 * u), 0, 0, TAU); g.stroke(); }
      }
      function drawSteam(g, dt) {
        for (let i = steam.length - 1; i >= 0; i--) {
          const p = steam[i]; p.age += dt; if (p.age > p.life) { steam.splice(i, 1); continue; }
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy *= Math.pow(0.97, dt * 60); p.vx *= Math.pow(0.98, dt * 60); p.r += p.gr * dt;
          const k = p.age / p.life, a = (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * p.a;
          g.globalAlpha = Math.max(0, a); g.drawImage(puffSpr, sx(p.x) - p.r, sy(p.y) - p.r, p.r * 2, p.r * 2);
        }
        g.globalAlpha = 1;
      }
      function puff(x, y, n, big) { for (let i = 0; i < n; i++) steam.push({ x: x + (Math.random() - 0.5) * (big ? 150 : 60) * G.u, y: y - Math.random() * 10, vx: (Math.random() - 0.5) * (big ? 140 : 60), vy: -(80 + Math.random() * (big ? 320 : 90)), r: (16 + Math.random() * (big ? 30 : 20)) * G.u, gr: (30 + Math.random() * (big ? 70 : 40)) * G.u, age: 0, life: 1.4 + Math.random() * (big ? 2.2 : 1.6), a: 0.5 + Math.random() * 0.35 }); if (steam.length > 180) steam.splice(0, steam.length - 180); }
      function drawHammer(g, t) {
        const b = bars[st.bi], sp = st.strike; if (!sp) return;
        if (st.phase !== 'hammer' && st.phase !== 'flat') return;
        const u = G.u, k = st.hammer, swing = lerp(0.95, 0.0, k), pivX = sp.x + 120 * u, pivY = sp.y - 150 * u, len = 160 * u;
        const bob = st.phase === 'hammer' ? Math.sin(beatPhase() * Math.PI) * 0.04 : 0;
        const ang = Math.atan2(sp.y - b.T * 0.6 - pivY, sp.x - pivX) + swing + bob;
        const hx = pivX + Math.cos(ang) * len, hy = pivY + Math.sin(ang) * len;
        g.lineCap = 'round'; g.strokeStyle = bright() ? '#8a5a30' : '#6a4224'; g.lineWidth = 9 * u; g.beginPath(); g.moveTo(sx(pivX), sy(pivY)); g.lineTo(sx(hx), sy(hy)); g.stroke();
        g.save(); g.translate(sx(hx), sy(hy)); g.rotate(ang + Math.PI / 2);
        const grd = g.createLinearGradient(-22 * u, 0, 22 * u, 0); grd.addColorStop(0, '#3a3f47'); grd.addColorStop(0.5, '#8a929e'); grd.addColorStop(1, '#2a2e34'); g.fillStyle = grd;
        g.fillRect(-26 * u, -14 * u, 52 * u, 28 * u); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-26 * u, -14 * u, 52 * u, 4 * u); g.restore();
        void t;
      }
      function beatPhase() { if (!A.ctx) return (now() / 1000 / beatLen()) % 1; const w = R.window(); return w.p; }
      function drawRing(g, t) {
        const sp = st.strike; if (!sp || st.phase !== 'hammer') return;
        const u = G.u, p = beatPhase(), r0 = 26 * u, r = r0 + 56 * u * (1 - p), br = bright();
        g.save(); g.globalCompositeOperation = br ? 'source-over' : 'lighter';
        g.strokeStyle = rgba('#ffd36b', 0.35); g.lineWidth = 2.5; g.beginPath(); g.arc(sx(sp.x), sy(sp.y), r0, 0, TAU); g.stroke();
        g.strokeStyle = rgba('#ffe6a0', 0.25 + 0.65 * p); g.lineWidth = 3 + 3 * p; g.beginPath(); g.arc(sx(sp.x), sy(sp.y), r, 0, TAU); g.stroke();
        if (p > 0.9) { g.globalAlpha = (p - 0.9) * 10; g.drawImage(K.glowSprite('#ffd36b'), sx(sp.x) - r0 * 1.6, sy(sp.y) - r0 * 1.6, r0 * 3.2, r0 * 3.2); }
        g.restore(); void t;
      }
      function drawTongs(g, b) {
        if (!st.tongs) return;
        const gm = geom(b), p = at(gm, 6), u = G.u, ang = gm.a[0] + Math.PI, l = 120 * u;
        g.lineCap = 'round'; g.strokeStyle = bright() ? '#3a3f47' : '#1a1c20'; g.lineWidth = 6 * u;
        [-1, 1].forEach(sd => { g.beginPath(); g.moveTo(sx(p.x), sy(p.y + sd * b.T * 0.35)); g.lineTo(sx(p.x + Math.cos(ang) * l + sd * 6 * u), sy(p.y + Math.sin(ang) * l + sd * 8 * u)); g.stroke(); });
      }

      /* ---------------- where the bar sits in each phase ---------------- */
      function placeBar(b, phase, snap) {
        if (!b || !G.w) return;
        const u = G.u;
        let x, y, rot = 0;
        if (phase === 'heat' || phase === 'intro') { x = G.forge.x - (G.phone ? 34 : 20) * u; y = G.forge.y - 2 * u; rot = -0.07; }
        else if (phase === 'quench' || phase === 'cool' || phase === 'carry2') { x = G.barrel.x; y = G.barrel.y - (G.phone ? 190 : 210) * u + st.dip; }
        else { x = G.anvil.x - 8 * u; y = G.anvil.y - b.T / 2 - 1; }
        if (snap) { b.x = x; b.y = y; b.rot = rot; }
        b.tx = x; b.ty = y; b.trot = rot;
      }
      function strikePoint(b) { const gm = geom(b), off = (b.L - b.gOld.w) / 2, q = b.gOld.list, a = q[b.modA] || q[0], z = q[Math.max(b.modA, b.modB - 1)] || a, s = off + (a.x + z.x) / 2; const p = at(gm, s); return { x: p.x, y: p.y }; }

      /* ---------------- input ---------------- */
      const toWorld = (p) => ({ x: p.x + cam.x, y: p.y });
      K.press(touch, {
        down: (p) => {
          const ph = st.phase;
          if (ph === 'heat') { const bp = st.bellowsPt; if (!bp || Math.hypot(p.x - bp.x, p.y - bp.y) < 140 * G.u || p.y > G.h * 0.45) pumpStart(); return; }
          if (ph === 'hammer') { strike(); return; }
          if (ph === 'bend') { st.bendGrab = { p, b0: bars[st.bi].bend, last: now() }; K.sfx.tap(); return; }
          if (ph === 'quench') { st.dipGrab = { p, d0: st.dip }; K.sfx.tap(); return; }
        },
        move: (p) => {
          if (st.bendGrab && st.phase === 'bend') { const g0 = st.bendGrab, d = Math.hypot(p.x - g0.p.x, p.y - g0.p.y); bendTo(g0.b0 + d / (Math.min(G.w, 520) * 0.62)); }
          if (st.dipGrab && st.phase === 'quench') { const d = Math.max(0, p.y - st.dipGrab.p.y); dipTo(st.dipGrab.d0 + d); }
        },
        up: () => {
          if (st.pumping) pumpStop();
          if (st.bendGrab) { st.bendGrab = null; if (groan) groan.level(0.0001, 0.1); if (st.phase === 'bend') S.later(() => { if (st.phase === 'bend' && !st.bendGrab) bendGuide(true); }, 600); }
          if (st.dipGrab) { st.dipGrab = null; if (st.phase === 'quench' && st.dip < dipNeed()) { st.dipBack = true; S.later(() => { if (st.phase === 'quench' && !st.dipGrab) quenchGuide(true); }, 500); } }
        }
      });
      S.listen(kbd, 'keydown', (e) => {
        if (e.repeat) return;
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (st.phase === 'heat') pumpStart(); else if (st.phase === 'hammer') strike(); else if (st.phase === 'bend') bendTo(bars[st.bi].bend + 0.2); else if (st.phase === 'quench') dipTo(st.dip + dipNeed() * 0.4); }
        if (e.code === 'ArrowUp' && st.phase === 'bend') bendTo(bars[st.bi].bend + 0.2);
        if (e.code === 'ArrowDown' && st.phase === 'quench') dipTo(st.dip + dipNeed() * 0.4);
      });
      S.listen(kbd, 'keyup', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && st.pumping) pumpStop(); });

      /* ---------------- 1. heat: hold to pump the bellows ---------------- */
      function pumpStart() {
        if (st.phase !== 'heat' || st.pumping || st.pump > 0.9) return;
        st.pumping = true; st.pumpT = now(); K.sfx.whoosh();
        if (A.ctx) A.noise({ filter: 'bandpass', freq: 500, to: 1400, q: 0.8, dur: 0.9, attack: 0.2, vol: 0.12 });
        rush.face('wow', 700);
      }
      function pumpStop() {
        st.pumping = false; K.sfx.soft();
        if (A.ctx) A.noise({ filter: 'bandpass', freq: 1800, to: 900, q: 1.5, dur: 0.35, attack: 0.05, vol: 0.05 });
        const b = bars[st.bi];
        if (st.phase === 'heat' && b.heat < heatNeed()) { st.pumps = (st.pumps || 0) + 1; S.later(() => { if (st.phase === 'heat' && !st.pumping) heatGuide(true); }, 450); if (st.pumps === 2 && st.bi === 0) speak(rush, L(LINES.impatient), { mood: 'fume', ms: 2600 }); else if (st.pumps === 3 && st.bi === 0) speak(still, L(LINES.patient), { mood: 'calm', ms: 2600 }); }
      }
      const heatNeed = () => (st.bi === 0 ? 0.84 : 0.8);
      function heatGuide(again) { K.guide({ id: 'heat', g: 'hold', target: () => { const bp = st.bellowsPt; return bp && cam.x === cam.to ? { x: bp.x + rootOff.x, y: bp.y + rootOff.y } : null; }, label: again ? 'PUMP AGAIN' : 'HOLD TO PUMP', ms: 1100, delay: again ? 300 : 700 }); }
      function startHeat(b) {
        st.phase = 'heat'; st.pumps = 0; setStep(0); orderShow(b, 'old'); setMeter(b.heat / heatNeed());
        panTo('heat', 1300); placeBar(b, 'heat', true);
        heatGuide();
      }
      function heatDone() {
        const b = bars[st.bi]; st.phase = 'carry'; K.guide(null); st.pumping = false;
        K.sfx.great(); P.emit('ember', sx(b.x), sy(b.y), 24, { colors: ['#ffd36b', '#ff9a3c', '#fff1c4'] });
        speak(still, L(st.bi === 0 ? LINES.hot : LINES.hot2), { mood: 'happy', ms: 2800 });
        ctx.track('heat', { bar: st.bi, pumps: st.pumps });
        S.later(() => carryTo('hammer'), 900);
      }

      /* ---------------- carrying with tongs ---------------- */
      function carryTo(phase) {
        const b = bars[st.bi]; st.tongs = true; if (phase === 'quench') { st.dip = 0; st.hissed = false; }
        const from = { x: b.x, y: b.y, rot: b.rot };
        placeBar(b, phase, false); const to = { x: b.tx, y: b.ty, rot: b.trot };
        panTo(phase === 'hammer' ? 'hammer' : 'quench', 1300);
        if (A.ctx) { A.noise({ filter: 'bandpass', freq: 900, to: 2400, q: 2, dur: 0.18, vol: 0.08 }); A.whoosh({ vol: 0.08, dur: 0.6 }); }
        const t0 = now(), dur = K.reduced() ? 200 : 1250;
        st.carry = { from, to, t0, dur, then: () => { st.tongs = phase !== 'hammer'; if (phase === 'hammer') { if (A.ctx) { A.tone({ type: 'sine', freq: 300, to: 180, glide: 0.08, dur: 0.12, vol: 0.12 }); A.noise({ filter: 'highpass', freq: 3000, dur: 0.04, vol: 0.1 }); } startHammer(); } else startQuench(); } };
      }

      /* ---------------- 2. hammer on the beat ---------------- */
      const strikesNeed = () => (st.bi === 0 ? [4, 6, 8][inten] : [3, 4, 6][inten]);
      function startHammer() {
        const b = bars[st.bi]; st.phase = 'hammer'; setStep(1); setMeter(0);
        mix.bed = 0.85; st.strike = strikePoint(b); st.combo = 0;
        speak(rush, L(st.bi === 0 ? LINES.hammer : LINES.hammer2), { mood: 'determined', ms: 2600 });
        hammerGuide();
      }
      function hammerGuide() { K.guide({ id: 'hammer', g: 'tap', target: () => (st.strike ? { x: sx(st.strike.x) + rootOff.x, y: sy(st.strike.y) + rootOff.y } : null), label: 'TAP ON THE BEAT', place: 'below', delay: 500 }); }
      function strike() {
        if (st.phase !== 'hammer' || now() - (st.lastStrike || 0) < 140) return;
        st.lastStrike = now();
        const b = bars[st.bi], j = A.ctx ? R.judge() : { grade: 'good' }, grade = j.grade === 'repeat' ? 'late' : j.grade, on = grade === 'perfect' || grade === 'good';
        st.total++; if (on) st.onBeat++;
        st.hammer = 1; st.hammerT = now();
        const credit = grade === 'perfect' ? 1 : grade === 'good' ? 0.85 : 0.5; b.credit += credit; b.strikes++; b.struck = true;
        b.flat = clamp(b.flat + credit / strikesNeed(), 0, 1); b.heat = Math.max(0.62, b.heat - 0.015);
        b.L = lerp(b.L0, b.L1, clamp(b.credit / strikesNeed(), 0, 1));
        st.strike = strikePoint(b);
        clang(grade);
        const sp = st.strike, n = grade === 'perfect' ? 44 : grade === 'good' ? 30 : 14;
        P.emit('spark', sx(sp.x), sy(sp.y - b.T * 0.4), n, { colors: ['#fff6d0', '#ffd36b', '#ff9a3c', '#ff6a2a'], angle: -Math.PI / 2, spread: 2.6, speed: [160, grade === 'perfect' ? 560 : 420] });
        if (!K.reduced()) st.shake = on ? 1 : 0.5;
        S.buzz && S.buzz(on ? 12 : 6);
        st.combo = on ? (st.combo || 0) + 1 : 0;
        K.pop(grade === 'perfect' ? (st.combo >= 3 ? 'PERFECT ×' + st.combo : 'PERFECT!') : grade === 'good' ? 'GOOD!' : grade === 'early' ? 'A bit early' : 'A bit late', { x: clamp(sx(sp.x) + (st.total % 2 ? 46 : -46), 80, G.w - 80), y: sy(sp.y) - 118 * G.u - (st.total % 2) * 26, kind: on ? (grade === 'perfect' ? 'great' : 'good') : 'soft' });
        setMeter(b.credit / strikesNeed());
        if (!on && !st.offTold && st.total >= 2) { st.offTold = true; speak(still, L(LINES.offbeat), { mood: 'calm', ms: 2600 }); }
        else if (st.combo === 3) speak(rush, L(LINES.combo), { mood: 'celebrate', ms: 2000 });
        ctx.track('strike', { g: grade.slice(0, 1), bar: st.bi });
        if (b.credit >= strikesNeed() - 0.01) { st.phase = 'flat'; K.guide(null); S.later(() => startBend(), 800); speak(rush, L(LINES.flat), { mood: 'laugh', ms: 2400 }); }
      }

      /* ---------------- 3. bend it into shape ---------------- */
      function startBend() {
        const b = bars[st.bi]; st.phase = 'bend'; setStep(2); setMeter(0); mix.bed = 0.6;
        speak(still, L(LINES.bend), { mood: 'calm', ms: 3200 });
        bendGuide();
        void b;
      }
      function bendGuide(again) {
        const b = bars[st.bi];
        K.guide({ id: 'bend', g: 'drag', target: () => { const gm = geom(b), e = at(gm, b.L - 4); return { x: sx(e.x) + rootOff.x, y: sy(e.y) + rootOff.y }; }, dx: -50, dy: -110, label: again ? 'KEEP BENDING' : 'DRAG TO BEND', delay: again ? 300 : 700 });
      }
      function bendTo(v) {
        const b = bars[st.bi]; if (st.phase !== 'bend') return;
        const nv = clamp(v, 0, 1), dv = nv - b.bend; if (dv <= 0) return;
        b.bend = nv; b.morph = clamp((nv - 0.12) / 0.72, 0, 1); setMeter(nv);
        if (groan && A.ctx) { groan.level(clamp(dv * 40, 0, 1) * 0.06 + 0.0001, 0.05); groan.freq(220 + nv * 380, 0.08); }
        if (Math.random() < dv * 30 && A.ctx) A.tone({ type: 'triangle', freq: 900 + Math.random() * 600, to: 700, glide: 0.06, dur: 0.07, vol: 0.02 });
        if (b.morph > 0.5 && !b.swapped) { b.swapped = true; orderShow(b, 'new'); K.sfx.sparkle(); }
        if (nv >= 0.999) bendDone();
      }
      function bendDone() {
        const b = bars[st.bi]; if (st.phase !== 'bend') return;
        st.phase = 'bent'; K.guide(null); st.bendGrab = null; if (groan) groan.level(0.0001, 0.1);
        b.morph = 1; if (!b.swapped) { b.swapped = true; orderShow(b, 'new'); }
        K.sfx.great(); if (A.ctx) A.chime(A.note('A5'), { vol: 0.08, dur: 1.6 });
        const gm = geom(b); for (let i = 0; i <= gm.n; i += 4) P.emit('ember', sx(gm.x[i]), sy(gm.y[i]), 2, { colors: ['#fff1c4', '#ffd36b'] });
        speak(still, L(b.i === 0 ? LINES.reads : LINES.reads2, { P: b.r.full }), { mood: 'happy', ms: 4600 });
        ctx.track('bend', { bar: st.bi });
        S.later(() => carryTo('quench'), 2600);
      }

      /* ---------------- 4. quench ---------------- */
      const dipNeed = () => 150 * G.u;
      function startQuench() { st.phase = 'quench'; setStep(3); setMeter(0); st.dip = 0; st.hissed = false; speak(rush, L(LINES.quench), { mood: 'determined', ms: 2400 }); quenchGuide(); }
      function quenchGuide(again) { const b = bars[st.bi]; K.guide({ id: 'quench', g: 'drag', target: () => ({ x: sx(b.x) + rootOff.x, y: sy(b.y) + rootOff.y }), dir: 'd', d: 120, label: again ? 'ALL THE WAY DOWN' : 'DIP IT TO QUENCH', delay: again ? 300 : 600 }); }
      function dipTo(v) {
        if (st.phase !== 'quench') return;
        st.dip = clamp(v, 0, dipNeed()); st.dipBack = false; setMeter(st.dip / dipNeed());
        const b = bars[st.bi], gm = geom(b), bottom = b.y + gm.hi + b.T / 2;
        if (!st.hissed && bottom >= G.barrel.y) {
          st.hissed = true; K.sfx.whoosh(); puff(b.x, G.barrel.y, 44, true); S.later(() => puff(b.x, G.barrel.y, 30, true), 260); S.later(() => puff(b.x, G.barrel.y, 18, false), 700); ripples.push({ x: b.x, t: 0 }, { x: b.x + 30, t: -0.2 });
          P.emit('drop', sx(b.x), sy(G.barrel.y), 18, { colors: ['rgba(190,225,255,.9)'], angle: -Math.PI / 2, spread: 1.6, speed: [120, 300] });
          if (hiss && A.ctx) { hiss.level(0.22, 0.02); hiss.freq(4200, 0.05); S.later(() => { if (hiss) { hiss.level(0.07, 0.4); hiss.freq(2600, 0.8); } }, 500); S.later(() => hiss && hiss.level(0.0001, 1.2), 1600); }
          if (A.ctx) A.noise({ filter: 'lowpass', freq: 700, to: 200, dur: 0.7, vol: 0.25 });
          if (A.ctx) for (let i = 0; i < 14; i++) A.tone({ when: A.now() + 0.1 + Math.random() * 1.2, type: 'sine', freq: 300 + Math.random() * 500, to: 600 + Math.random() * 700, glide: 0.05, dur: 0.06, vol: 0.03 });
          rush.face('surprised', 1400); rush.react('shake');
        }
        if (st.dip >= dipNeed() - 0.5) quenchDone();
      }
      function quenchDone() {
        const b = bars[st.bi]; if (st.phase !== 'quench') return;
        st.phase = 'cool'; st.dipGrab = null; K.guide(null); st.coolT = now();
        puff(b.x, G.barrel.y, 18, true); K.sfx.chime(5);
        ctx.track('quench', { bar: st.bi });
        S.later(() => { speak(rush, L(LINES.cough), { mood: 'surprised', ms: 2600 }); }, 500);
        S.later(() => afterBar(), 3000);
      }
      function afterBar() {
        const b = bars[st.bi]; st.done.push(b); b.out = true; st.tongs = false; st.phase = 'between';
        if (st.bi === 0) {
          st.bi = 1; const b2 = bars[1];
          speak(rush, L(LINES.twist, { T: b2.p.orig }), { mood: 'angry', ms: 3800 }); rush.react('shake');
          S.later(() => { speak(still, L(strong ? LINES.twistStrong : LINES.twistCalm), { mood: 'calm', ms: 3600 }); }, 3600);
          placeBar(b2, 'heat', true); b2.heat = 0.25;
          S.later(() => startHeat(b2), 3000);
        } else S.later(() => finale(), 400);
      }

      /* ---------------- finale: a keyring of charms ---------------- */
      let finEl = null, balTag = null;
      // Charms hang on a ring; the panel sits clear of them above and of the docked characters below. Measured when built and
      // on resize only. If the words need more room than that, the optional fair-version tag steps aside, then the type tightens.
      function placeFin() {
        const box = finEl; if (!box) return;
        const ph = G.phone, W = G.w, H = G.h;
        const ringY = ph ? 132 : H * 0.2, cs = ph ? 0.36 : 0.5;
        st.ring = { x: ph ? W / 2 : W * 0.28, y: ringY, r: (ph ? 34 : 50) };
        bars.forEach((b, i) => { b.fs = cs; b.spread = (i ? 1 : -1) * (ph ? 84 : 128); b.drop = (ph ? 112 : 160) + i * (ph ? 26 : 40); });
        if (balTag) balTag.style.display = '';
        box.classList.remove('sf-tight');
        const lim = H - (ph ? 112 : 96), top0 = Math.round(ph ? H * 0.47 : H * 0.2), minTop = ph ? ringY + 186 : 84;
        const set = (t) => Object.assign(box.style, ph ? { left: '16px', right: '16px', width: '', top: t + 'px' } : { left: Math.round(W * 0.5) + 'px', right: '', width: Math.min(520, W * 0.42) + 'px', top: t + 'px' });
        const fits = () => { set(top0); const hh = box.offsetHeight; if (top0 + hh <= lim) return true; const t = Math.max(minTop, lim - hh); set(t); return t + hh <= lim; };
        if (fits()) return;
        if (balTag) { balTag.style.display = 'none'; if (fits()) return; }
        box.classList.add('sf-tight'); fits();
      }
      function finale() {
        st.phase = 'finale'; K.guide(null); setStep(4); order.classList.add('out');
        mix.bed = 0.4; st.finT = now();
        const ratio = st.total ? st.onBeat / st.total : 0.7, pct = Math.round(ratio * 100), tier = K.tier(ratio, [0.4, 0.65, 0.85]);
        const fin = tier === 'Gold' ? 'Gold' : tier === 'Silver' ? 'Silver' : tier === 'Bronze' ? 'Copper' : 'Iron';
        st.pct = pct; st.tier = tier; st.item = fin + ' ' + shape; st.col = K.collect(st.item);
        bars.forEach(b => { b.finish = fin; b.heat = 0; b.temper = 0; b.morph = 1; });
        [rush, still].forEach(c => c.hush());
        rush.base('celebrate'); still.base('happy');
        if (A.ctx) { A.pad(['D4', 'F#4', 'A4', 'D5'].map(n => A.note(n)), { dur: 5, vol: 0.14, attack: 0.6 }); for (let i = 0; i < 9; i++) A.chime(A.note(['D6', 'F#6', 'A6', 'D7', 'E6'][i % 5]), { when: A.now() + 0.6 + i * 0.07 + Math.random() * 0.05, vol: 0.035, dur: 0.6 }); }
        const W = G.w, H = G.h;
        balTag = an.source === 'ai' && an.balanced ? h('div', { class: 'sf-tag', style: { animationDelay: '1.2s' } }, h('small', { text: 'The fair version' }), h('div', { text: an.balanced })) : null;
        const box = h('div', { class: 'sf-fin', role: 'status' },
          h('div', { class: 'sf-fin-h', text: 'Forged. Light enough to carry.' }),
          bars.map((b, i) => h('div', { class: 'sf-tag', style: { animationDelay: (0.5 + i * 0.35) + 's' } }, h('small', { text: i === 0 ? 'Charm one · your should' + (b.own ? '' : ' (a common one)') : 'Charm two · a should about others' }), h('div', { class: 'gk-user', text: b.r.full }))),
          balTag,
          care ? h('div', { class: 'sf-fin-care', text: S.safety ? S.safety.CARE_LINE : 'For the practical side, someone qualified can tell you where you stand.' }) : null,
          h('div', { class: 'sf-fin-foot' }, h('span', { text: 'Charm: ' + st.item + ' · ' + Math.min(st.col.count, 12) + '/12' }), h('span', { text: 'Next forge: ' + nextHall.name })));
        el.append(box); finEl = box;
        bars.forEach((b, i) => { b.swing = (i ? -1 : 1) * 0.35; });
        placeFin();
        const ringX = st.ring.x;
        rush.say(L(LINES.fin), { mood: 'celebrate', ms: 0 });
        S.later(async () => {
          await K.finale('fireworks', { from: [{ x: ringX, y: H - 40 }, { x: W * 0.2, y: H - 30 }, { x: W * 0.8, y: H - 30 }], colors: ['#ffd36b', '#ff9a3c', '#fff1c4', '#ff6a2a', '#ffe9a8'], count: inten === 0 ? 4 : inten === 1 ? 6 : 9, chord: ['D4', 'F#4', 'A4', 'D5'], ms: 3800 });
          finishGame();
        }, 1500);
      }
      function finishGame() {
        if (st.finished) return; st.finished = true;
        const best = K.best('beat', st.pct, 'higher'), badges = [];
        if (best.isNew) badges.push('New best: ' + st.pct + '% on the beat'); else if (best.first) badges.push('On the beat: ' + st.pct + '%');
        if (st.tier) badges.push(st.tier + ' smith');
        if (st.col.isNew) badges.push('Collected: ' + st.item + ' (' + Math.min(st.col.count, 12) + '/12)');
        ctx.track('done', { onbeat: st.pct, strikes: st.total });
        ctx.finish({ title: 'Two shoulds, reforged', mood: 'celebrate', lines: ['Your should became: ' + bars[0].r.head, 'The one about others became a boundary', 'On the beat: ' + st.pct + '%'],
          share: 'Forged my shoulds into something I can actually carry.', badges: badges.slice(0, 4) });
      }
      function drawFinale(g, t) {
        const k = clamp((now() - st.finT) / 900, 0, 1), d = cv.dpr || 1, W = G.w, H = G.h, ring = st.ring;
        g.setTransform(d, 0, 0, d, 0, 0);
        g.fillStyle = 'rgba(10,5,3,' + (0.74 * k).toFixed(3) + ')'; g.fillRect(0, 0, W, H);
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55 * k; const sr = G.phone ? 230 : 320; g.drawImage(glowSpr, ring.x - sr, ring.y - sr * 0.4, sr * 2, sr * 2); g.restore();
        // the key ring
        const fc = FINISH[bars[0].finish];
        g.lineWidth = 7; g.strokeStyle = fc[2]; g.beginPath(); g.arc(ring.x, ring.y + 2, ring.r, 0, TAU); g.stroke();
        g.lineWidth = 5; g.strokeStyle = fc[1]; g.beginPath(); g.arc(ring.x, ring.y, ring.r, 0, TAU); g.stroke();
        g.lineWidth = 1.8; g.strokeStyle = fc[0]; g.beginPath(); g.arc(ring.x, ring.y, ring.r, Math.PI * 1.1, Math.PI * 1.7); g.stroke();
        bars.forEach((b, i) => {
          const sw = b.swing * Math.exp(-(now() - st.finT) / 2600) * Math.sin((now() - st.finT) / 1000 * 3.2 + i) * (K.reduced() ? 0 : 1);
          const hookX = ring.x + (i ? 1 : -1) * ring.r * 0.7, hookY = ring.y + ring.r * 0.7;
          const ax = hookX + b.spread * 0.55 + Math.sin(sw) * b.drop, ay = hookY + Math.cos(sw) * b.drop;
          const cx = lerp(b.x - cam.x, ax + b.spread * 0.45, ease.outCubic(k)), cy = lerp(b.y, ay, ease.outCubic(k));
          // a short chain of links from the ring to the charm
          g.strokeStyle = fc[1]; g.lineWidth = 2;
          const top = { x: cx, y: cy - 70 * b.fs * 2 * 0.9 };
          for (let j = 0; j < 6; j++) { const f0 = j / 6, f1 = (j + 1) / 6, x0 = lerp(hookX, top.x, f0), y0 = lerp(hookY, top.y, f0), x1 = lerp(hookX, top.x, f1), y1 = lerp(hookY, top.y, f1); g.beginPath(); g.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.hypot(x1 - x0, y1 - y0) * 0.6, 3, Math.atan2(y1 - y0, x1 - x0), 0, TAU); g.stroke(); }
          g.save(); g.translate(cx, cy); g.rotate(sw * 0.6); g.scale(lerp(1, b.fs, k), lerp(1, b.fs, k)); g.translate(-b.x + cam.x, -b.y);
          const keepShake = [st.shakeX, st.shakeY]; st.shakeX = 0; st.shakeY = 0;
          drawBar(g, b, t);
          [st.shakeX, st.shakeY] = keepShake;
          g.restore();
        });
      }

      /* ---------------- render loop ---------------- */
      let lastDraw = -1, dtAcc = 0;
      K.loop((dt0, t) => {
        const g = cv.g; if (!g || !G.w) return;
        dtAcc += dt0; if (SOFT && t - lastDraw < 0.03) return;
        const dt = Math.min(0.08, dtAcc); dtAcc = 0; lastDraw = t;
        const tn = now(), rdt = clamp((tn - (st.lastNow || tn - 16)) / 1000, 0.001, 0.25); st.lastNow = tn;
        const b = bars[st.bi];
        // camera, carry, shake
        if (cam.to !== cam.x) { const k = clamp((now() - cam.t0) / cam.dur, 0, 1); cam.x = lerp(cam.from, cam.to, ease.inOutCubic(k)); if (k >= 1) cam.x = cam.to; }
        if (st.carry) { const c = st.carry, k = clamp((now() - c.t0) / c.dur, 0, 1), e = ease.inOutCubic(k); b.x = lerp(c.from.x, c.to.x, e); b.y = lerp(c.from.y, c.to.y, e) - Math.sin(k * Math.PI) * 120 * G.u; b.rot = lerp(c.from.rot, c.to.rot, e) + Math.sin(k * Math.PI) * 0.12; if (k >= 1) { const then = c.then; st.carry = null; then(); } }
        st.shake = Math.max(0, st.shake - dt * 6); st.shakeX = st.shake ? (Math.random() - 0.5) * 7 * st.shake : 0; st.shakeY = st.shake ? (Math.random() - 0.5) * 5 * st.shake : 0;
        st.hammer = Math.max(0, st.hammer - dt * 4.2);
        // heat
        if (st.phase === 'heat') {
          if (st.pumping) { st.pump = Math.min(1, st.pump + rdt / 0.95); if (st.pump < 1) b.heat = Math.min(1, b.heat + rdt * (inten === 0 ? 0.5 : 0.38)); else if (!st.full) { st.full = true; K.guide({ id: 'heat-let', g: 'tap', target: () => { const bp = st.bellowsPt; return bp ? { x: bp.x + rootOff.x, y: bp.y + rootOff.y } : null; }, label: 'LET GO TO REFILL', delay: 100 }); } }
          else { st.pump = Math.max(0, st.pump - rdt / 0.45); st.full = false; b.heat = Math.max(0, b.heat - rdt * 0.015); }
          setMeter(b.heat / heatNeed());
          if (b.heat >= heatNeed()) heatDone();
        } else if (st.pump > 0) st.pump = Math.max(0, st.pump - rdt / 0.45);
        const fireT = st.phase === 'heat' ? (st.pumping ? 1 : 0.42) : 0.3; st.fire += (fireT - st.fire) * Math.min(1, dt * 4);
        if (roar && A.ctx) { roar.level(0.04 + 0.16 * st.fire, 0.15); roar.freq(180 + 700 * st.fire, 0.2); }
        if (wind && A.ctx) wind.level(hall.view === 'dunes' ? 0.03 : hall.view === 'snow' ? 0.02 : 0.025, 0.5);
        if (st.phase === 'cool') { const k = clamp((now() - st.coolT) / 1600, 0, 1); b.heat = Math.max(0, b.heat - rdt * 0.9); b.temper = k; if (Math.random() < 0.3) puff(b.x + (Math.random() - 0.5) * b.L * 0.4, b.y - 10, 1, false); }
        if (st.phase === 'quench' && st.dipBack && !st.dipGrab) { st.dip = Math.max(0, st.dip - rdt * 300); setMeter(st.dip / dipNeed()); if (!st.dip) st.dipBack = false; }
        if ((st.phase === 'quench' || st.phase === 'cool') && !st.carry) { const rk = st.phase === 'cool' ? ease.outCubic(clamp((now() - st.coolT - 900) / 1100, 0, 1)) : 0; b.x = G.barrel.x; b.y = G.barrel.y - (G.phone ? 190 : 210) * G.u + st.dip * (1 - rk); }
        if (st.phase === 'quench' && st.hissed) { b.heat = Math.max(0.3, b.heat - rdt * 0.6); }
        if (st.phase === 'heat' && Math.random() < dt * (4 + 14 * st.fire)) P.emit('ember', sx(G.forge.x + (Math.random() - 0.5) * G.forge.w * 0.6), sy(G.forge.y - 10), 1, { colors: ['#ffb347', '#ff7a3d', '#ffe08a'] });
        // paint
        if (!bgKey || bgKey !== G.w + 'x' + G.h + (bright() ? 'b' : 'd') + Math.min(cv.dpr || 1, 1.5)) renderBg();
        const d = cv.dpr || 1, bd = Math.min(d, 1.5);
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.drawImage(bgC, Math.round((cam.x - (st.shakeX || 0)) * bd), 0, Math.round(G.w * bd), Math.round(G.h * bd), 0, Math.round((st.shakeY || 0) * d), Math.round(G.w * d), Math.round(G.h * d));
        g.setTransform(d, 0, 0, d, 0, 0);
        drawCoals(g, t, false);
        if (!b.out && (st.phase === 'heat' || (st.carry && st.carry.from.x === G.forge.x))) { drawTongs(g, b); drawBar(g, b, t); }
        drawCoals(g, t, true);
        drawFire(g, t);
        drawBellows(g, t);
        drawWater(g, t);
        if (!b.out && st.phase !== 'heat' && st.phase !== 'finale' && !(st.carry && st.carry.from.x === G.forge.x)) {
          const under = st.phase === 'quench' || st.phase === 'cool';
          if (under) { g.save(); g.beginPath(); g.rect(0, 0, G.w, sy(G.barrel.y)); g.clip(); }
          drawTongs(g, b); drawBar(g, b, t);
          if (under) { g.restore(); }
          drawHammer(g, t); drawRing(g, t);
        }
        drawSteam(g, dt);
        P.update(dt); g.setTransform(d, 0, 0, d, 0, 0); P.draw(g);
        if (st.phase === 'finale') drawFinale(g, t);
      });

      /* ---------------- lines (three vibes each) ---------------- */
      const LINES = {
        intro: visits ? { Jolly: 'Back at the anvil! Same deal: heat, hammer, bend.', Cheeky: 'Another should in need of a makeover? Pump those bellows.', Unfiltered: 'New should. Heat it.' }
          : { Jolly: 'A should is cold iron: stiff, heavy, bossy. Let’s heat it up and reshape it.', Cheeky: 'Cold, rigid and bossy. Classic should. Fire it up.', Unfiltered: 'Shoulds are rigid. Heat makes them bend.' },
        impatient: { Jolly: 'Come ON, it SHOULD be hot by now!', Cheeky: 'Hurry up, iron! You SHOULD be glowing!', Unfiltered: 'It SHOULD be hot by now!' },
        patient: { Jolly: 'Heat takes the time it takes. Long, slow pumps.', Cheeky: 'Shouting at iron never worked.', Unfiltered: 'Patience. Slow pumps.' },
        hot: { Jolly: 'Working heat! See how the letters soften first?', Cheeky: 'Ooh, it’s glowing. The words are going soft.', Unfiltered: 'Hot enough. Letters softening.' },
        hot2: { Jolly: 'Hot again. Onto the anvil.', Cheeky: 'Toasty. Anvil time.', Unfiltered: 'Hot. Anvil.' },
        hammer: { Jolly: 'Now hit it on the beat! Flatten that SHOULD!', Cheeky: 'Bonk the SHOULD. On the beat, please.', Unfiltered: 'Hammer. On the beat.' },
        hammer2: { Jolly: 'Same rhythm. Flatten it.', Cheeky: 'Bonk, bonk, boundary.', Unfiltered: 'Hammer it.' },
        offbeat: { Jolly: 'Listen for the drum, then strike with it.', Cheeky: 'The anvil likes a groove. Feel the drum.', Unfiltered: 'Strike with the drum.' },
        combo: { Jolly: 'Ooh, that rang! Keep the rhythm!', Cheeky: 'Listen to that ring. Show-off.', Unfiltered: 'Good rhythm.' },
        flat: { Jolly: 'Ha! SHOULD is flat as a pancake!', Cheeky: 'SHOULD has left the building.', Unfiltered: 'SHOULD: flattened.' },
        bend: { Jolly: 'Now bend it. Keep what you value, lose the command.', Cheeky: 'Bend it into something you can actually carry.', Unfiltered: 'Bend it. Keep the value, drop the order.' },
        reads: { Jolly: 'Read that: “{P}” Same value. No whip.', Cheeky: '“{P}” Still ambitious. Way less shouty.', Unfiltered: '“{P}” Value kept. Pressure gone.' },
        reads2: { Jolly: '“{P}” That’s a boundary, not a demand.', Cheeky: '“{P}” Much easier to say out loud.', Unfiltered: '“{P}” A boundary. Not an order.' },
        quench: { Jolly: 'Dunk it to set the shape!', Cheeky: 'Quench time. Stand back.', Unfiltered: 'Quench it.' },
        cough: { Jolly: '*cough* Okay! That’s a LOT of steam.', Cheeky: 'PFFT. Nobody warned me about the steam.', Unfiltered: 'Steam. Set. Done.' },
        twist: { Jolly: 'Okay, but what about THEM? “{T}”!', Cheeky: 'And another thing: “{T}”! Hmph.', Unfiltered: '“{T}.” That one’s about them.' },
        twistCalm: { Jolly: 'Their choices aren’t our iron. Our side of it is. Let’s forge that.', Cheeky: 'You can’t hammer other people. You can reshape your ask.', Unfiltered: 'You can’t forge them. Forge your side.' },
        twistStrong: { Jolly: 'Some shoulds point at a real need. Keep the need, drop the whip.', Cheeky: 'Real need, sure. It still works better as an ask.', Unfiltered: 'Real need. Make it an ask.' },
        fin: { Jolly: 'I’d PREFER we forge again sometime. No pressure!', Cheeky: 'Look at me, preferring things. Growth!', Unfiltered: 'Light enough to carry.' }
      };

      /* ---------------- start ---------------- */
      const rootOff = { x: 0, y: 0 };
      cv.onResize(() => layout());
      orderShow(bars[0], 'old'); setStep(0);
      (async () => {
        await K.intro({ title: 'Should Forge', sub: 'Your “should” is a cold iron bar. Heat it, hammer it, bend it into something you can carry.', how: 'Hold to pump the bellows. Tap on the beat. Drag to bend. Drag down to quench.', char: 'rush', mood: 'determined' });
        try { const rt = (S.parent && S.parent.root) || el, a = el.getBoundingClientRect(), b = rt.getBoundingClientRect(), sc0 = rt.offsetWidth ? b.width / rt.offsetWidth : 1; rootOff.x = (a.left - b.left) / sc0; rootOff.y = (a.top - b.top) / sc0; } catch (e) { /* stage at the root origin */ }
        layout();
        bedOn = true; mix.bed = 0.45; R.start(0.4);
        speak(still, L(LINES.intro), { ms: 4200 });
        startHeat(bars[0]);
      })();

      return {
        async autoplay() {
          const wait = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(80); };
          const bellows = () => st.bellowsPt ? { x: st.bellowsPt.x, y: st.bellowsPt.y } : { x: G.w * 0.7, y: G.h * 0.7 };
          for (let bi = 0; bi < 2; bi++) {
            await wait(() => st.phase === 'heat' && st.bi === bi && !st.carry && cam.x === cam.to, 25000);
            await K.wait(700);
            for (let i = 0; i < 12 && st.phase === 'heat'; i++) { const bp = bellows(); const ptr = await K.sim.press(touch, bp.x, bp.y); await K.wait(900); ptr.up(bp.x, bp.y); await K.wait(520); }
            await wait(() => st.phase === 'hammer', 12000);
            await K.wait(600);
            for (let i = 0; i < 40 && st.phase === 'hammer'; i++) {
              let ms = 300;
              if (A.ctx) { const w = R.window(), vt = A.now() - A.latency(); ms = Math.max(0, (w.next.t - vt) * 1000 - 12); if (ms > beatLen() * 1000 * 0.98) ms = Math.max(0, ms - beatLen() * 1000); }
              await K.wait(ms);
              const sp = st.strike || { x: G.w / 2, y: G.h / 2 };
              await K.sim.tap(touch, sx(sp.x), sy(sp.y));
              await K.wait(120);
            }
            await wait(() => st.phase === 'bend', 8000);
            await K.wait(700);
            for (let i = 0; i < 4 && st.phase === 'bend'; i++) { const b = bars[st.bi], gm = geom(b), e = at(gm, b.L - 4), a = { x: sx(e.x), y: sy(e.y) }; await K.sim.drag(touch, a, { x: a.x - 60, y: a.y - 300 }, 1300, 26); await K.wait(300); }
            await wait(() => st.phase === 'quench', 12000);
            await K.wait(700);
            for (let i = 0; i < 4 && st.phase === 'quench'; i++) { const b = bars[st.bi], a = { x: sx(b.x), y: sy(b.y) }; await K.sim.drag(touch, a, { x: a.x, y: Math.min(G.h - 10, a.y + dipNeed() + 40) }, 900, 18); await K.wait(400); }
          }
          await wait(() => st.finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
