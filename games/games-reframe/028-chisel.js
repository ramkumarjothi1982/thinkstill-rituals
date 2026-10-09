/* 028 Chisel — Reframe · REFRAME · Inner Speech / Mental Text
 * Mechanism: de-absolutising (Beck 1976; Ellis's REBT; Burns 1980). Absolute words (always, never, everyone, nothing,
 * definitely, completely) overstate; knocking them off and carving in a fair qualifier ("sometimes", "not yet", "not
 * everyone", "I don't know yet if") leaves a statement that is truer and calmer, with the facts untouched. The player's own
 * clause is carved into a marble slab and every absolute sticks out as a rough boss of stone. Tapping the chisel along it
 * in an even, unhurried rhythm (the player sets the tempo; steady strikes ring like a lithophone and take bigger chips)
 * knocks it off, and the sentence re-carves itself around the gap. The twist: one absolute is load-bearing; knock it out
 * and the meaning collapses, so the player chalks in a fair word and carves it (an opposite absolute is refused: same
 * rock, other side). Then polish in slow circles.
 * Verb: chisel (tap along the stone in a steady rhythm), carve, polish (circle). Finale: the slab gleams under the
 * skylight with its letters leafed by how steady the hand was, marble dust glittering in the light; Still nods.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const eOut = (t) => 1 - Math.pow(1 - t, 3);
  const eInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const eBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  function hexRgb(hx) { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hx || '') || [0, '80', '80', '80']; return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]; }
  function mix(a, b, k) { const A = hexRgb(a), B = hexRgb(b); k = clamp(k, 0, 1); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); }
  function rgba(hx, a) { const c = hexRgb(hx); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  const shade = (c, k) => (k < 0 ? mix(c, '#000000', -k) : mix(c, '#ffffff', k));
  /* No GPU (VMs, blocklisted devices): every canvas pixel is rasterised on the CPU, so draw at a lower density and 30 fps there. */
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
  /* Keep the part of a polygon on one side of a line (point m, normal n). */
  function clipHalf(poly, mx, my, nx, ny, sign) {
    const out = [], n = poly.length;
    for (let i = 0; i < n; i++) {
      const A = poly[i], B = poly[(i + 1) % n];
      const da = ((A.x - mx) * nx + (A.y - my) * ny) * sign, db = ((B.x - mx) * nx + (B.y - my) * ny) * sign;
      if (da >= 0) out.push(A);
      if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push({ x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t }); }
    }
    return out;
  }
  const polyPath = (g, p, ox, oy) => { g.beginPath(); p.forEach((q, i) => (i ? g.lineTo(q.x + ox, q.y + oy) : g.moveTo(q.x + ox, q.y + oy))); g.closePath(); };

  /* <words> Absolute words in the player's own clause, and fair, grammatical replacements (Beck; Ellis; Burns).
   * A clause becomes tokens with ids; scan() finds the absolutes and, for each, an automatic fair rewrite, two fair options
   * and (when grammatical) its mirror absolute. apply() returns new tokens; unchanged tokens keep their ids, so the words
   * on the stone can slide instead of re-appearing. Pure functions: no DOM, no lookbehind. */
  const WORDS = (() => {
    let uid = 1;
    const RX = /[A-Za-z0-9]+(?:'[A-Za-z]+)*(?:-[A-Za-z0-9]+)*|[^\sA-Za-z0-9]/g;
    function tok(s) {
      const t = String(s || '').replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
      const out = []; let m, last = 0;
      RX.lastIndex = 0;
      while ((m = RX.exec(t))) { out.push(mk(m[0], t.slice(last, m.index) ? ' ' : '')); last = m.index + m[0].length; }
      return out;
    }
    const mk = (w, sp) => ({ w: /^i('|$)/.test(w) ? 'I' + w.slice(1) : w, lo: w.toLowerCase(), sp: sp == null ? ' ' : sp, id: uid++ });
    const isWord = (t) => !!t && /[a-z0-9]/i.test(t.w);
    const join = (T) => T.map((t, i) => (i ? t.sp : '') + t.w).join('');

    /* ---------- grammar helpers ---------- */
    const PRON = { i: { sg: true, p1: true, obj: 'me', be: 'am' }, you: { sg: false, obj: 'you', be: 'are' }, he: { sg: true, obj: 'him', be: 'is' }, she: { sg: true, obj: 'her', be: 'is' },
      it: { sg: true, obj: 'it', be: 'is' }, we: { sg: false, obj: 'us', be: 'are' }, they: { sg: false, obj: 'them', be: 'are' }, that: { sg: true, obj: 'that', be: 'is' }, this: { sg: true, obj: 'this', be: 'is' },
      things: { sg: false, obj: 'things', be: 'are' }, people: { sg: false, obj: 'people', be: 'are' }, everything: { sg: true, obj: 'everything', be: 'is' } };
    const CONTR = { "i'm": ['i', 'am'], "i'll": ['i', 'will'], "i've": ['i', 'have'], "i'd": ['i', 'would'], "you're": ['you', 'are'], "you'll": ['you', 'will'], "you've": ['you', 'have'], "you'd": ['you', 'would'],
      "he's": ['he', 's'], "she's": ['she', 's'], "it's": ['it', 's'], "that's": ['that', 's'], "we're": ['we', 'are'], "they're": ['they', 'are'], "we'll": ['we', 'will'], "they'll": ['they', 'will'],
      "he'll": ['he', 'will'], "she'll": ['she', 'will'], "it'll": ['it', 'will'], "that'll": ['that', 'will'], "we've": ['we', 'have'], "they've": ['they', 'have'], "he'd": ['he', 'would'], "she'd": ['she', 'would'],
      "they'd": ['they', 'would'], "we'd": ['we', 'would'], "things'll": ['things', 'will'], "everyone's": ['everyone', 's'], "everybody's": ['everybody', 's'], "nobody's": ['nobody', 's'], "everything's": ['everything', 's'], "nothing's": ['nothing', 's'] };
    const DETS = new Set('my your his her their our the this that these those a an'.split(' '));
    const ADV_SKIP = new Set('just really still probably already now honestly literally actually secretly also so even totally basically clearly obviously definitely surely certainly genuinely seriously kind sort'.split(' '));
    const AUX = new Set("am is are was were be been being have has had do does did will would shall should can could may might must 'm 're 's 've 'll 'd".split(' '));
    const NEG_AUX = { am: "am not", is: "isn't", are: "aren't", was: "wasn't", were: "weren't", have: "haven't", has: "hasn't", had: "hadn't", do: "don't", does: "doesn't", did: "didn't",
      will: "won't", would: "wouldn't", can: "can't", could: "couldn't", should: "shouldn't", must: "mustn't", might: 'might not', may: 'may not' };
    const IRR = { // base: [past, participle]
      be: ['was', 'been'], have: ['had', 'had'], do: ['did', 'done'], go: ['went', 'gone'], get: ['got', 'got'], make: ['made', 'made'], say: ['said', 'said'], see: ['saw', 'seen'], come: ['came', 'come'],
      take: ['took', 'taken'], give: ['gave', 'given'], know: ['knew', 'known'], think: ['thought', 'thought'], tell: ['told', 'told'], find: ['found', 'found'], feel: ['felt', 'felt'], leave: ['left', 'left'],
      lose: ['lost', 'lost'], forget: ['forgot', 'forgotten'], forgive: ['forgave', 'forgiven'], keep: ['kept', 'kept'], let: ['let', 'let'], put: ['put', 'put'], mean: ['meant', 'meant'], meet: ['met', 'met'],
      pay: ['paid', 'paid'], run: ['ran', 'run'], send: ['sent', 'sent'], spend: ['spent', 'spent'], stand: ['stood', 'stood'], understand: ['understood', 'understood'], win: ['won', 'won'], write: ['wrote', 'written'],
      speak: ['spoke', 'spoken'], break: ['broke', 'broken'], choose: ['chose', 'chosen'], fall: ['fell', 'fallen'], freeze: ['froze', 'frozen'], begin: ['began', 'begun'], bring: ['brought', 'brought'],
      buy: ['bought', 'bought'], catch: ['caught', 'caught'], teach: ['taught', 'taught'], fight: ['fought', 'fought'], hear: ['heard', 'heard'], hold: ['held', 'held'], hurt: ['hurt', 'hurt'], cut: ['cut', 'cut'],
      hit: ['hit', 'hit'], read: ['read', 'read'], sleep: ['slept', 'slept'], sit: ['sat', 'sat'], become: ['became', 'become'], drink: ['drank', 'drunk'], eat: ['ate', 'eaten'], fly: ['flew', 'flown'],
      grow: ['grew', 'grown'], show: ['showed', 'shown'], throw: ['threw', 'thrown'], wake: ['woke', 'woken'], wear: ['wore', 'worn'], blow: ['blew', 'blown'], draw: ['drew', 'drawn'], drive: ['drove', 'driven'],
      ride: ['rode', 'ridden'], rise: ['rose', 'risen'], shake: ['shook', 'shaken'], sing: ['sang', 'sung'], swim: ['swam', 'swum'], build: ['built', 'built'], deal: ['dealt', 'dealt'], lend: ['lent', 'lent'],
      lead: ['led', 'led'], light: ['lit', 'lit'], shut: ['shut', 'shut'], set: ['set', 'set'], quit: ['quit', 'quit'], stick: ['stuck', 'stuck'], sell: ['sold', 'sold'], bite: ['bit', 'bitten'], hide: ['hid', 'hidden'],
      feed: ['fed', 'fed'], fit: ['fit', 'fit'], dig: ['dug', 'dug'], hang: ['hung', 'hung'], seek: ['sought', 'sought'], shoot: ['shot', 'shot'], swing: ['swung', 'swung'], sweep: ['swept', 'swept'] };
    const PAST2BASE = {};
    Object.keys(IRR).forEach(b => { PAST2BASE[IRR[b][0]] = b; });
    PAST2BASE.were = 'be'; PAST2BASE.got = 'get';
    const NOT_VERB = new Set('me you him her us them it this that the a an my your his our their to of in on at for with about from and but or so because if when than then there here very too much many more less some any all every no not'.split(' '));
    const ADJ_LIKE = new Set('good enough right wrong late early ready fine okay ok happy sad useless stupid boring annoying weird alone better worse smart able allowed sure kind nice there here safe'.split(' '));
    function lemma3(v) { // 3rd-person present -> base
      const lo = v.toLowerCase();
      const map = { is: 'be', has: 'have', does: 'do', goes: 'go', says: 'say', "doesn't": "don't", "isn't": "aren't", "hasn't": "haven't", "wasn't": "weren't", was: 'were' };
      if (map[lo]) return map[lo];
      if (/[^aeiou]ies$/.test(lo) && lo.length > 4) return lo.slice(0, -3) + 'y';
      if (/(sses|shes|ches|xes|zzes|oes)$/.test(lo)) return lo.slice(0, -2);
      if (/(ses|zes|ces|ges|ves|tes|kes|les|mes|nes|pes|res|bes|des)$/.test(lo)) return lo.slice(0, -1);
      if (/[^su]s$/.test(lo) && lo.length > 2) return lo.slice(0, -1);
      return null;
    }
    const isThird = (v) => { const lo = v.toLowerCase(); return /^[a-z]+$/.test(lo) && lemma3(lo) != null && !/(ss|us|is)$/.test(lo) && !NOT_VERB.has(lo) && !ADJ_LIKE.has(lo) && lo !== 'always'; };
    function past2base(v) {
      const lo = v.toLowerCase();
      if (PAST2BASE[lo]) return PAST2BASE[lo];
      if (!/ed$/.test(lo) || lo.length < 4) return null;
      if (/[^aeiou]ied$/.test(lo)) return lo.slice(0, -3) + 'y';
      if (/([bdgmnprt])\1ed$/.test(lo) && !/(add|odd|ebb|err|purr)ed$/.test(lo) && lo.length <= 8) return lo.slice(0, -3);
      const st = lo.slice(0, -2);
      if (/(v|z|c|g|u)$/.test(st) && !/(ng|rg)$/.test(st)) return st + 'e';
      if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(st)) return st + 'e';
      if (/[aeiou]s$/.test(st) && !/(ss|ous)$/.test(st)) return st + 'e';
      return st;
    }
    function participle(base) {
      if (IRR[base]) return IRR[base][1];
      if (/e$/.test(base)) return base + 'd';
      if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + 'ied';
      if (/^[^aeiou]*[aeiou][bdgmnpt]$/.test(base) && base.length <= 4) return base + base.slice(-1) + 'ed';
      return base + 'ed';
    }
    const pastOf = (base) => (IRR[base] ? IRR[base][0] : participle(base));
    /* the base form of the first verb in a predicate, given how it was inflected */
    function baseOf(v) { const lo = v.toLowerCase(); if (PAST2BASE[lo]) return { base: PAST2BASE[lo], tense: 'past' }; if (isThird(lo)) return { base: lemma3(lo), tense: 'pres3' }; if (/ed$/.test(lo)) { const b = past2base(lo); return b ? { base: b, tense: 'past' } : null; } return { base: lo, tense: 'pres' }; }
    const article = (w) => (/^(hour|honest)/i.test(w) || (/^[aeiou]/i.test(w) && !/^(u[^aeiou][aeiou]|one|eu)/i.test(w)) ? 'an' : 'a');

    /* subject of the verb phrase that starts at index k (contraction-aware) */
    function subjectAt(T, k) {
      const t = T[k]; if (!t) return null;
      const c = CONTR[t.lo]; if (c && PRON[c[0]]) return { i0: k, i1: k, pro: c[0], text: c[0] === 'i' ? 'I' : c[0], sg: PRON[c[0]].sg, aux: c[1], contracted: true };
      let j = k - 1; while (j >= 0 && ADV_SKIP.has(T[j].lo)) j--;
      const p = T[j]; if (!p) return null;
      if (PRON[p.lo]) return { i0: j, i1: j, pro: p.lo, text: p.lo === 'i' ? 'I' : p.w, sg: PRON[p.lo].sg };
      if (j >= 1 && DETS.has(T[j - 1].lo) && /^[a-z]+$/i.test(p.w) && !AUX.has(p.lo)) { const pl = /[^s]s$/i.test(p.w) || /^(people|children|men|women|parents|friends|kids)$/i.test(p.w); return { i0: j - 1, i1: j, pro: null, text: T[j - 1].w + ' ' + p.w, sg: !pl, noun: true }; }
      if (/^[A-Z][a-z]+$/.test(p.w) && j > 0 && !/^(I|And|But|So|Then|Now|Just|Maybe|Today|If|When)$/.test(p.w)) return { i0: j, i1: j, pro: null, text: p.w, sg: true, name: true };
      if (/^(people|things|everyone|everybody|nobody|someone|somebody|they)$/i.test(p.lo)) return { i0: j, i1: j, pro: null, text: p.w, sg: !/^(people|things|they)$/i.test(p.lo) };
      return null;
    }
    const objOf = (s) => (s.pro ? PRON[s.pro].obj : s.text);
    const haveOf = (s) => (s.sg && s.pro !== 'i' && s.pro !== 'you' ? 'has' : 'have');
    const negBe = (s) => (s.pro === 'i' ? "I'm not" : s.pro ? s.text + (s.sg ? "'s not" : "'re not") : s.text + (s.sg ? " isn't" : " aren't"));

    /* ---------- the edit model ---------- */
    // op: { a, b, repl: 'text', cap?: true } replaces tokens [a, b); tail: 'yet' appended before final punctuation
    function E(key, ops, extra) { return Object.assign({ key, ops: Array.isArray(ops) ? ops : [ops] }, extra || {}); }
    function apply(T, e) {
      const out = T.map(t => Object.assign({}, t)); // copies keep their ids
      const ops = e.ops.slice().sort((x, y) => y.a - x.a || y.b - x.b);
      ops.forEach(op => {
        const add = op.repl ? tok(op.repl) : [];
        add.forEach(t => { t.sp = ' '; });
        if (op.a === 0 && op.b === 0 && add.length && out[0]) { out[0].sp = ' '; if (e.lowerFirst) out[0].w = lowFirst(out[0].w); }
        out.splice(op.a, op.b - op.a, ...add);
      });
      if (e.tail) { let k = out.length; while (k > 0 && !isWord(out[k - 1])) k--; const add = tok(e.tail); add.forEach(t => { t.sp = ' '; }); out.splice(k, 0, ...add); }
      const res = out.filter(t => t.w);
      res.forEach((t, i) => { if (/^[,.;:!?)]$/.test(t.w)) t.sp = ''; if (i === 0) t.sp = ''; });
      while (res.length && /^[,;:]$/.test(res[0].w)) res.shift();
      if (res[0]) { res[0].sp = ''; res[0].w = capFirst(res[0].w); }
      return res;
    }
    const capFirst = (w) => w.charAt(0).toUpperCase() + w.slice(1);
    const COMMON = /^(she|he|it|they|we|you|my|his|her|their|our|the|this|that|these|those|everyone|everybody|nobody|nothing|everything|things|people|some|not|no|all|every|always|never|there|today|tonight|it's|she's|he's|they're|we're|you're|that's|there's|she'll|he'll|they'll|it'll|we'll|you'll|a|an|one|someone|somebody)$/i;
    const lowFirst = (w) => (COMMON.test(w) ? w.charAt(0).toLowerCase() + w.slice(1) : w);

    /* ---------- the scanner ---------- */
    const W1 = (T, i) => (T[i] ? T[i].lo : '');
    function scan(T, mode) {
      const hits = [], used = new Set();
      const SPEECH = /^(said|says|told|tells|asked|asks|texted|wrote|writes|messaged|emailed|replied|yelled|shouted|commented|posted|claimed|claims|called|calls|reckons|reckoned|insists|insisted)$/;
      const push = (h) => { if (h.at.some(k => used.has(T[k].id))) return;
        if (T.slice(0, h.at[0]).some(x => SPEECH.test(x.lo))) return; // their words, as reported: never ours to edit
        h.at.concat(h.also || []).forEach(k => used.add(T[k].id)); h.ids = h.at.map(k => T[k].id); h.word = h.at.map(k => T[k].w).join(' '); hits.push(h); };
      const negBefore = (i) => { for (let j = i - 1; j >= 0; j--) { const lo = T[j].lo; if (/n't$/.test(lo) || /^(not|never|no|cannot|nobody|nothing)$/.test(lo)) return j; if (/^[,;]$/.test(lo)) return -1; } return -1; };
      for (let i = 0; i < T.length; i++) {
        const lo = T[i].lo, nx = W1(T, i + 1), pv = W1(T, i - 1);
        if (!isWord(T[i])) continue;
        /* ---- frequency: always ---- */
        if (lo === 'always' && !/^(almost|not|as|nearly)$/.test(pv) && !/n't$/.test(pv)) {
          const beV = /^(am|is|are|was|were|be|been|i'm|you're|he's|she's|it's|we're|they're|that's)$/.test(pv);
          const fair = beV ? [E('OFTEN', { a: i, b: i + 1, repl: 'often' }), E('SOMETIMES', { a: i, b: i + 1, repl: 'sometimes' })] : [E('SOMETIMES', { a: i, b: i + 1, repl: 'sometimes' })];
          if (!beV) { const tt = thisTime(T, i); if (tt) fair.push(tt); else fair.push(E('OFTEN', { a: i, b: i + 1, repl: 'often' })); }
          push({ at: [i], kind: 'freq', load: false, auto: fair[0], fair, mirror: E('NEVER', { a: i, b: i + 1, repl: 'never' }) });
          continue;
        }
        if (lo === 'constantly' || lo === 'continually') { push({ at: [i], kind: 'freq', load: false, auto: E('SOMETIMES', { a: i, b: i + 1, repl: 'sometimes' }), fair: [E('SOMETIMES', { a: i, b: i + 1, repl: 'sometimes' }), E('AT TIMES', { a: i, b: i + 1, repl: '' }, { tail: 'at times' })], mirror: null }); continue; }
        /* ---- every time / every single time / each time / all the time ---- */
        if ((lo === 'every' || lo === 'each') && (nx === 'time' || (nx === 'single' && W1(T, i + 2) === 'time'))) {
          const b = nx === 'single' ? i + 3 : i + 2, sub = PRON[W1(T, b)] || CONTR[W1(T, b)] || /^(my|someone|people|they)$/.test(W1(T, b));
          const r = sub ? 'sometimes when' : 'sometimes';
          push({ at: rangeIdx(i, b), kind: 'freq', load: false, auto: E('SOMETIMES', { a: i, b, repl: r }), fair: [E('SOMETIMES', { a: i, b, repl: r }), E('NOW AND THEN', { a: i, b, repl: sub ? 'now and then, when' : 'now and then' })], mirror: null });
          continue;
        }
        if (lo === 'all' && nx === 'the' && W1(T, i + 2) === 'time') { push({ at: [i, i + 1, i + 2], kind: 'freq', load: false, auto: E('SOME OF THE TIME', { a: i, b: i + 3, repl: 'some of the time' }), fair: [E('SOME OF THE TIME', { a: i, b: i + 3, repl: 'some of the time' }), E('NOW AND THEN', { a: i, b: i + 3, repl: 'now and then' })], mirror: null }); continue; }
        if (lo === 'forever' && !/^(take|takes|took|taking)$/.test(pv)) { push({ at: [i], kind: 'freq', load: false, auto: E('FOR A WHILE', { a: i, b: i + 1, repl: 'for a while' }), fair: [E('FOR A WHILE', { a: i, b: i + 1, repl: 'for a while' }), E('FOR NOW', { a: i, b: i + 1, repl: 'for now' })], mirror: null }); continue; }
        if (lo === 'forever') { push({ at: [i], kind: 'freq', load: false, auto: E('A WHILE', { a: i, b: i + 1, repl: 'a while' }), fair: [E('A WHILE', { a: i, b: i + 1, repl: 'a while' }), E('SOME TIME', { a: i, b: i + 1, repl: 'some time' })], mirror: null }); continue; }
        /* ---- never ---- */
        if (lo === 'never' && nx !== 'mind' && W1(T, i + 1) !== 'again' ) { const h = never(T, i); if (h) push(h); continue; }
        if ((lo === "won't" || lo === "can't") && nx === 'ever') { const h = wontEver(T, i); if (h) push(h); continue; }
        /* ---- people: everyone / nobody ---- */
        if ((lo === 'everyone' || lo === 'everybody' || lo === "everyone's" || lo === "everybody's") && !(pv === 'of' && W1(T, i - 2) === 'front')) { const h = everyone(T, i); if (h) push(h); continue; }
        if (lo === 'nobody' || lo === "nobody's" || lo === 'no-one' || lo === 'noone' || (lo === 'no' && nx === 'one')) { const h = nobody(T, i); if (h) push(h); continue; }
        /* ---- things: nothing / everything ---- */
        if (lo === 'nothing' || lo === "nothing's") { const h = nothing(T, i); if (h) push(h); continue; }
        if (lo === 'everything' || lo === "everything's") { const h = everything(T, i); if (h) push(h); continue; }
        /* ---- any- under a negation ---- */
        if ((lo === 'anything' || lo === 'anyone' || lo === 'anybody') && negBefore(i) >= 0) {
          const thing = lo === 'anything', many = /^(have|has|had|know|knows|knew|meet|see|talk)$/.test(pv);
          const r1 = thing ? 'everything' : many ? 'many people' : 'everyone', r2 = thing ? 'some things' : 'some people';
          push({ at: [i], kind: 'quant', load: true, auto: E(r1.toUpperCase(), { a: i, b: i + 1, repl: r1 }), fair: [E(r1.toUpperCase(), { a: i, b: i + 1, repl: r1 }), E(r2.toUpperCase(), { a: i, b: i + 1, repl: r2 })], mirror: null });
          continue;
        }
        /* ---- all my / all the / all of them ---- */
        if (lo === 'all' && (/^(my|the|his|her|their|our|your|these|those)$/.test(nx) || (nx === 'of' && /^(them|us|you|my|the|their|his|her|our)$/.test(W1(T, i + 2)))) && !(nx === 'the' && /^(time|way)$/.test(W1(T, i + 2))) && pv !== 'at') {
          const b = nx === 'of' ? i + 2 : i + 1;
          push({ at: [i], kind: 'quant', load: true, auto: E('SOME OF', { a: i, b, repl: 'some of' }), fair: [E('SOME OF', { a: i, b, repl: 'some of' }), E('A FEW OF', { a: i, b, repl: 'a few of' })], mirror: E('NONE OF', { a: i, b, repl: 'none of' }) });
          continue;
        }
        /* ---- whole ---- */
        if (lo === 'whole' && /^(my|the|this|our|their|his|her|your)$/.test(pv) && /^[a-z]+$/.test(nx)) {
          push({ at: [i], kind: 'quant', load: false, auto: E('PART OF', { a: i - 1, b: i + 1, repl: 'part of ' + T[i - 1].lo }), fair: [E('PART OF', { a: i - 1, b: i + 1, repl: 'part of ' + T[i - 1].lo }), E('SOME OF', { a: i - 1, b: i + 1, repl: 'some of ' + T[i - 1].lo })], mirror: null });
          continue;
        }
        /* ---- totality: completely, totally ---- */
        if (/^(completely|totally|entirely|utterly|absolutely|fully|wholly)$/.test(lo)) {
          // only where "all of it" is the claim: a whole outcome, never a feeling or a label (those stay as said)
          if (/^(no|nothing|nobody|never|everyone|everything|all|every)$/.test(nx)) { push({ at: [i], kind: 'total', load: false, auto: E('—', { a: i, b: i + 1, repl: '' }), fair: [E('—', { a: i, b: i + 1, repl: '' })], mirror: null }); continue; }
          const outcome = /^(wrong|ruined|broken|unprepared|wasted|pointless|failed|messed|screwed|blew|blown|destroyed|wrecked|forgot|forgotten|missed|lost|ignored|misread|misjudged|botched|bombed|froze|flopped|ruin|ruins|mess|messes|fail|fails|forget|forgets|miss|misses)$/.test(nx);
          if (!outcome) continue;
          push({ at: [i], kind: 'total', load: false, auto: E('PARTLY', { a: i, b: i + 1, repl: 'partly' }), fair: [E('PARTLY', { a: i, b: i + 1, repl: 'partly' }), E('—', { a: i, b: i + 1, repl: '' })], mirror: null });
          continue;
        }
        if (/^(complete|total|utter)$/.test(lo) && /^(a|an)$/.test(pv) && /^(mess|shambles|blur|waste)$/.test(nx)) {
          push({ at: [i], kind: 'total', load: false, auto: E('A BIT OF', { a: i - 1, b: i + 1, repl: 'a bit of a' }), fair: [E('A BIT OF', { a: i - 1, b: i + 1, repl: 'a bit of a' })], mirror: null });
          continue;
        }
        /* ---- they all / we all ---- */
        if (lo === 'all' && /^(they|we|you)$/.test(pv) && /^[a-z]+$/.test(nx) && !NOT_VERB.has(nx)) {
          const ob = PRON[pv].obj;
          push({ at: [i], kind: 'quant', load: true, auto: E('SOME OF ' + ob.toUpperCase(), { a: i - 1, b: i + 1, repl: 'some of ' + ob }), fair: [E('SOME OF ' + ob.toUpperCase(), { a: i - 1, b: i + 1, repl: 'some of ' + ob }), E('A FEW OF ' + ob.toUpperCase(), { a: i - 1, b: i + 1, repl: 'a few of ' + ob })], mirror: E('NONE OF ' + ob.toUpperCase(), { a: i - 1, b: i + 1, repl: 'none of ' + ob }) });
          continue;
        }
        if (/^(perfect|perfectly)$/.test(lo) && /^(be|is|are|was|be|it|everything|look|go|went|goes|do|did)$/.test(pv)) {
          const r = lo === 'perfect' ? 'good enough' : 'well';
          push({ at: [i], kind: 'total', load: false, auto: E(r.toUpperCase(), { a: i, b: i + 1, repl: r }), fair: [E(r.toUpperCase(), { a: i, b: i + 1, repl: r })], mirror: null });
          continue;
        }
        /* ---- certainty ---- */
        if (/^(definitely|certainly|clearly|obviously|surely|undoubtedly)$/.test(lo) || (lo === 'for' && nx === 'sure') || (lo === 'no' && nx === 'doubt' && pv !== 'a')) { const h = certain(T, i); if (h) push(h); continue; }
        /* ---- superlatives: the worst ---- */
        if (lo === 'worst' && pv === 'the' && nx !== 'case' && !/-/.test(nx)) { const h = worst(T, i); if (h) push(h); continue; }
      }
      return hits;
    }
    const rangeIdx = (a, b) => { const r = []; for (let k = a; k < b; k++) r.push(k); return r; };

    /* "I always mess up" -> "I messed up this time" */
    function thisTime(T, i) {
      const s = subjectAt(T, i); if (!s || s.contracted) return null;
      const v = T[i + 1]; if (!v || !/^[a-z]+$/.test(v.lo) || AUX.has(v.lo) || NOT_VERB.has(v.lo) || ADJ_LIKE.has(v.lo)) return null;
      let base = v.lo; if (isThird(v.lo)) base = lemma3(v.lo); else if (!s.sg || s.pro === 'i' || s.pro === 'you') base = v.lo; else return null;
      if (/(ed|ing)$/.test(v.lo) || base === 'be' || base === 'have') return null;
      if (!IRR[base] && !/^[a-z]{2,}$/.test(base)) return null;
      // keep the phrase short: only when the rest of the clause is a few words
      let end = T.length; while (end > 0 && !isWord(T[end - 1])) end--;
      if (end - (i + 2) > 5) return null;
      return E('THIS TIME', { a: i, b: i + 2, repl: pastOf(base) }, { tail: 'this time' });
    }

    function never(T, i) {
      const pv = W1(T, i - 1), pv2 = W1(T, i - 2), nx = W1(T, i + 1);
      // will never / 'll never / am never going to
      let modal = -1, going = false;
      if (/^(will|would)$/.test(pv) || /'ll$/.test(pv)) modal = i - 1;
      if (/^(am|is|are)$/.test(pv) || /^(i'm|you're|he's|she's|it's|we're|they're)$/.test(pv)) { if (nx === 'going' && W1(T, i + 2) === 'to') { modal = i - 1; going = true; } }
      if (nx === 'gonna') { modal = i; going = true; }
      if (modal >= 0 && (pv === 'would' || /'d$/.test(pv)) && !going) {
        return { at: [i], kind: 'never', load: true, auto: E('MIGHT NOT', { a: i - 1, b: i + 1, repl: 'might not' }), fair: [E('MIGHT NOT', { a: i - 1, b: i + 1, repl: 'might not' }), E("WOULDN'T ALWAYS", { a: i - 1, b: i + 1, repl: "wouldn't always" })], mirror: null };
      }
      if (modal >= 0) {
        const s = /'ll$/.test(pv) || CONTR[pv] ? subjectAt(T, i - 1) : subjectAt(T, modal);
        const vk = going ? (nx === 'gonna' ? i + 2 : i + 3) : i + 1, v = T[vk];
        if (!s || !v || !/^[a-z]+$/.test(v.lo)) return null;
        const base = v.lo, sStart = s.i0, aEnd = vk + 1;
        const lead = s.contracted ? '' : '';
        void lead;
        let fair1;
        if (base === 'be') { // I'll never be good enough -> I'm not good enough yet
          fair1 = E('NOT YET', { a: sStart, b: aEnd, repl: negBe(s), cap: true }, { tail: 'yet' });
        } else {
          fair1 = E('NOT YET', { a: sStart, b: aEnd, repl: subjText(s) + ' ' + (haveOf(s) === 'has' ? "hasn't" : "haven't") + ' ' + participle(base) }, { tail: 'yet' });
        }
        const take = s.pro === 'i' ? 'it might take time to ' + base : 'it might take time for ' + objOf(s).replace(/^(The|My|His|Her|Their|Our|Your)\b/, m => m.toLowerCase()) + ' to ' + base;
        const fair2 = E('MIGHT TAKE TIME', { a: sStart, b: aEnd, repl: take });
        const mirror = E('DEFINITELY', { a: sStart, b: aEnd, repl: subjText(s) + (s.pro && s.pro !== 'things' ? "'ll" : ' will') + ' definitely ' + base });
        const again = T.slice(aEnd).some(x => x.lo === 'again');
        if (again) { const f3 = E('NOT FOR A WHILE', { a: sStart, b: aEnd, repl: subjText(s) + ' might not ' + base }, { tail: 'for a while' }); return { at: [i], kind: 'never', load: true, auto: fair2, fair: [fair2, f3], mirror }; }
        return { at: [i], kind: 'never', load: true, auto: fair1, fair: [fair1, fair2], mirror };
      }
      // can never / could never
      if (/^(can|could)$/.test(pv)) {
        const neg = pv === 'can' ? "can't" : "couldn't";
        const f1 = withNpi(E(neg.toUpperCase() + ' ALWAYS', { a: i - 1, b: i + 1, repl: neg + ' always' }), T, i + 1);
        const f2 = pv === 'can' ? E("CAN'T YET", { a: i - 1, b: i + 1, repl: "can't" }, { tail: 'yet' }) : E('RARELY COULD', { a: i - 1, b: i + 1, repl: 'could rarely' });
        return { at: [i], also: npiOps(T, i + 1).ids, kind: 'never', load: true, auto: f1, fair: [f1, f2], mirror: withNpi(E(pv.toUpperCase() + ' ALWAYS', { a: i - 1, b: i + 1, repl: pv + ' always' }), T, i + 1) };
      }
      // have never + participle -> haven't ... yet
      if (/^(have|has|had)$/.test(pv) || /'ve$/.test(pv) || (/'s$/.test(pv) && /(ed|en|been|had|done|got|made|said|seen|known|told)$/.test(nx))) {
        const s = subjectAt(T, /'ve$|'s$/.test(pv) ? i - 1 : i - 1);
        const neg = /'ve$/.test(pv) || pv === 'have' ? "haven't" : pv === 'had' ? "hadn't" : "hasn't";
        const a = /'ve$|'s$/.test(pv) && s && s.contracted ? s.i0 : i - 1;
        const rp = /'ve$|'s$/.test(pv) && s && s.contracted ? subjText(s) + ' ' + neg : neg;
        const f1 = E('NOT YET', { a, b: i + 1, repl: rp }, { tail: 'yet' });
        const f2 = E('RARELY', { a: i, b: i + 1, repl: 'rarely' });
        return { at: [i], kind: 'never', load: true, auto: f1, fair: [f1, f2], mirror: E('ALWAYS', { a: i, b: i + 1, repl: 'always' }) };
      }
      // be never -> not always
      if (/^(am|is|are|was|were)$/.test(pv) || CONTR[pv]) {
        const c = CONTR[pv];
        if (c && !/^(am|are|s)$/.test(c[1])) return null;
        const neg = c ? pv + ' not' : NEG_AUX[pv];
        const f1 = withNpi(E('NOT ALWAYS', { a: i - 1, b: i + 1, repl: neg + ' always' }), T, i + 1);
        const f2 = c || /^(am|is|are)$/.test(pv) ? E('NOT YET', { a: i - 1, b: i + 1, repl: neg }, { tail: 'yet' }) : E('RARELY', { a: i, b: i + 1, repl: 'rarely' });
        return { at: [i], also: npiOps(T, i + 1).ids, kind: 'never', load: true, auto: f1, fair: [f1, f2], mirror: withNpi(E('ALWAYS', { a: i, b: i + 1, repl: 'always' }), T, i + 1) };
      }
      // never + verb (present or past)
      const v = T[i + 1]; if (!v || !/^[a-z]+$/.test(v.lo) || NOT_VERB.has(v.lo)) return null;
      const s = subjectAt(T, i);
      const bo = baseOf(v.lo); if (!bo) return null;
      if (bo.tense === 'past') {
        if (!/^(reply|answer|call|text|message|respond|write|come|show|apologise|apologize|thank|ask|invite|follow|finish|hear|forgive|notice|visit|check|email|ring|return|pay|say sorry|get back)$/.test(bo.base)) return null; // "I never said that": a denial, not an absolute
        if (!s) return { at: [i], kind: 'never', load: true, auto: E('RARELY', { a: i, b: i + 1, repl: 'rarely' }), fair: [E('RARELY', { a: i, b: i + 1, repl: 'rarely' })], mirror: E('ALWAYS', { a: i, b: i + 1, repl: 'always' }) };
        const hv = haveOf(s) === 'has' ? "hasn't" : "haven't";
        const f1 = E('NOT YET', { a: i, b: i + 2, repl: hv + ' ' + participle(bo.base) }, { tail: 'yet' });
        const f2 = E('NOT SO FAR', { a: i, b: i + 2, repl: hv + ' ' + participle(bo.base) }, { tail: 'so far' });
        return { at: [i], kind: 'never', load: true, auto: f1, fair: [f1, f2], mirror: E('ALWAYS', { a: i, b: i + 1, repl: 'always' }) };
      }
      if (!s && bo.tense === 'pres') return { at: [i], kind: 'never', load: true, auto: E('RARELY', { a: i, b: i + 1, repl: 'rarely' }), fair: [E('RARELY', { a: i, b: i + 1, repl: 'rarely' })], mirror: E('ALWAYS', { a: i, b: i + 1, repl: 'always' }) };
      const third = bo.tense === 'pres3' || (s && s.sg && s.pro !== 'i' && s.pro !== 'you');
      if (bo.tense === 'pres' && s && s.sg && s.pro !== 'i' && s.pro !== 'you' && !s.noun) return null; // "he never listen": not our grammar to fix
      const dn = third ? "doesn't" : "don't";
      const f1 = withNpi(E(dn.toUpperCase() + ' ALWAYS', { a: i, b: i + 2, repl: dn + ' always ' + bo.base }), T, i + 2);
      const f2 = E('SOMETIMES ' + dn.toUpperCase(), { a: i, b: i + 2, repl: 'sometimes ' + dn + ' ' + bo.base });
      return { at: [i], also: npiOps(T, i + 2).ids, kind: 'never', load: true, auto: f1, fair: [f1, f2], mirror: withNpi(E('ALWAYS', { a: i, b: i + 1, repl: 'always' }), T, i + 2) };
    }
    function wontEver(T, i) {
      const s = subjectAt(T, i); const v = T[i + 2]; if (!s || !v || !/^[a-z]+$/.test(v.lo)) return null;
      const isW = T[i].lo === "won't";
      if (!isW) return { at: [i, i + 1], kind: 'never', load: true, auto: E("CAN'T ALWAYS", { a: i, b: i + 2, repl: "can't always" }), fair: [E("CAN'T ALWAYS", { a: i, b: i + 2, repl: "can't always" }), E("CAN'T YET", { a: i, b: i + 2, repl: "can't" }, { tail: 'yet' })], mirror: null };
      const base = v.lo;
      const f1 = base === 'be' ? E('NOT YET', { a: s.i0, b: i + 3, repl: negBe(s) }, { tail: 'yet' }) : E('NOT YET', { a: s.i0, b: i + 3, repl: subjText(s) + ' ' + (haveOf(s) === 'has' ? "hasn't" : "haven't") + ' ' + participle(base) }, { tail: 'yet' });
      const take = s.pro === 'i' ? 'it might take time to ' + base : 'it might take time for ' + objOf(s).replace(/^(The|My|His|Her|Their|Our|Your)\b/, m => m.toLowerCase()) + ' to ' + base;
      return { at: [i, i + 1], kind: 'never', load: true, auto: f1, fair: [f1, E('MIGHT TAKE TIME', { a: s.i0, b: i + 3, repl: take })], mirror: null };
    }
    const subjText = (s) => s.text;
    /* "anything" after a negation that becomes "not always": "I never finish anything" -> "I don't always finish everything" */
    function npiOps(T, from) { const ops = [], ids = []; for (let k = from; k < T.length; k++) { if (!isWord(T[k])) break; const lo = T[k].lo; if (lo === 'anything') { ops.push({ a: k, b: k + 1, repl: 'everything' }); ids.push(k); } else if (lo === 'anyone' || lo === 'anybody') { ops.push({ a: k, b: k + 1, repl: 'everyone' }); ids.push(k); } } return { ops, ids }; }
    function withNpi(e, T, from) { const n = npiOps(T, from); if (n.ops.length) e.ops = e.ops.concat(n.ops); return e; }

    function everyone(T, i) {
      const t = T[i], lo = t.lo, sTok = /'s$/.test(lo);
      if (W1(T, i + 1) === 'else') { // "everyone else seems happy"
        let k = i + 2; while (T[k] && ADV_SKIP.has(T[k].lo)) k++;
        const vv = T[k]; if (!vv) return null;
        const AG2 = { is: 'are', was: 'were', has: 'have', does: 'do', seems: 'seem' };
        const pl = AG2[vv.lo] || (isThird(vv.lo) ? lemma3(vv.lo) : null);
        const f1 = E('NOT EVERYONE', { a: i, b: i + 1, repl: 'not everyone' });
        const fair = [f1]; if (pl) fair.push(E('SOME PEOPLE', { a: i, b: k + 1, repl: ['some other people'].concat(T.slice(i + 2, k).map(x => x.w)).concat([pl]).join(' ') }));
        return { at: [i], kind: 'people', load: true, auto: f1, fair, mirror: null };
      }
      let j = i + 1; while (T[j] && ADV_SKIP.has(T[j].lo)) j++;
      const v = T[j], isSubj = sTok || (v && (AUX.has(v.lo) || /n't$/.test(v.lo) || isThird(v.lo) || /ed$/.test(v.lo) || PAST2BASE[v.lo] || /^(will|can|would|could|might|must|should)$/.test(v.lo))) && !/^(i|you|he|she|it|we|they)$/.test(W1(T, i - 1)) && !(i > 0 && /^[a-z]+$/.test(W1(T, i - 1)) && !/^(and|but|so|because|that|now|then|when|if|maybe|probably|just|and)$/.test(W1(T, i - 1)) && !/^(think|thinks|know|knows|feel|feels|said|says|guess|bet|reckon)$/.test(W1(T, i - 1)) && T[i - 1] && isWord(T[i - 1]) && !/^[,.;:]$/.test(T[i - 1].w));
      if (isSubj && v && REPORT.test(v.lo) && !sTok) return null; // "everyone laughed": what happened, as reported
      if (!isSubj) { // object: I let everyone down
        if (/^(in|front|of)$/.test(W1(T, i - 1)) && W1(T, i - 2) === 'front') return null;
        return { at: [i], kind: 'people', load: true, auto: E('SOME PEOPLE', { a: i, b: i + 1, repl: 'some people' }), fair: [E('SOME PEOPLE', { a: i, b: i + 1, repl: 'some people' }), E('A FEW PEOPLE', { a: i, b: i + 1, repl: 'a few people' })], mirror: E('NOBODY', { a: i, b: i + 1, repl: 'nobody' }) };
      }
      if (sTok) { // everyone's laughing / everyone's seen
        const nxt = W1(T, i + 1), has = PERF_S.test(nxt);
        const pl = 'some people' + (has ? ' have' : ' are');
        return { at: [i], kind: 'people', load: true, auto: E('SOME PEOPLE', { a: i, b: i + 1, repl: pl }), fair: [E('SOME PEOPLE', { a: i, b: i + 1, repl: pl }), E('NOT EVERYONE', { a: i, b: i + 1, repl: "not everyone's" })], mirror: E('NOBODY', { a: i, b: i + 1, repl: "nobody's" }) };
      }
      // agreement for "some people"
      const vlo = v.lo; let agr = null;
      const AG = { is: 'are', was: 'were', has: 'have', does: 'do', "doesn't": "don't", "isn't": "aren't", "wasn't": "weren't", "hasn't": "haven't", must: 'might' };
      if (AG[vlo]) agr = AG[vlo]; else if (isThird(vlo)) agr = lemma3(vlo); else agr = vlo;
      const f1 = E('SOME PEOPLE', { a: i, b: j + 1, repl: ['some people'].concat(T.slice(i + 1, j).map(x => x.w)).concat([agr]).join(' ') });
      const f2 = vlo === 'must' ? E('NOT EVERYONE', { a: i, b: j + 1, repl: ['not everyone'].concat(T.slice(i + 1, j).map(x => x.w)).concat(['would']).join(' ') }) : E('NOT EVERYONE', { a: i, b: i + 1, repl: 'not everyone' });
      const mv = vlo === 'must' ? E('NOBODY', { a: i, b: j + 1, repl: ['nobody'].concat(T.slice(i + 1, j).map(x => x.w)).concat(['would']).join(' ') }) : E('NOBODY', { a: i, b: i + 1, repl: 'nobody' });
      let f3 = null;
      if (isThird(vlo) && !AG[vlo]) f3 = E('A FEW MIGHT', { a: i, b: j + 1, repl: ['a few people might'].concat(T.slice(i + 1, j).map(x => x.w)).concat([lemma3(vlo)]).join(' ') });
      const hostile = /^(hate|hates|hated|sick|annoyed|angry|mad|furious|judging|judge|judges|laughing|laughs|laughed|talking|gossiping|despise|despises|dislike|dislikes|avoid|avoids|avoiding|bored|tired|fed|against|ignore|ignores|ignoring|hates)$/;
      if (T.slice(j, j + 4).some(x => hostile.test(x.lo))) return { at: [i], kind: 'people', load: true, auto: f2, fair: [f2, f1], mirror: mv };
      return { at: [i], kind: 'people', load: true, auto: f3 || f1, fair: [f3 || f1, f2], mirror: mv };
    }
    const REPORT = /^(replied|answered|responded|came|showed|turned|called|texted|messaged|said|noticed|asked|helped|invited|wrote|commented|liked|laughed|clapped|spoke|talked|looked|saw|heard|knew|offered|stayed|left|joined|cared|mentioned|reacted|bothered|has|had|did)$/;
    function modsEnd(T, j) { // "nobody at work ever invites me": step over a short prepositional phrase and adverbs
      let k = j, n = 0;
      while (T[k] && n < 5 && isWord(T[k]) && (ADV_SKIP.has(T[k].lo) || T[k].lo === 'ever' || /^(at|in|from|on|here|there|around|else)$/.test(T[k].lo) || (k > j && /^(at|in|from|on)$/.test(T[k - 1].lo)) || (k > j + 1 && DETS.has(T[k - 1].lo) && /^(at|in|from|on)$/.test(T[k - 2].lo)) || (DETS.has(T[k].lo) && k > j && /^(at|in|from|on)$/.test(T[k - 1].lo)))) { k++; n++; }
      return k;
    }
    function nobody(T, i) {
      const two = T[i].lo === 'no', b = two ? i + 2 : i + 1, sTok = /'s$/.test(T[i].lo);
      const j = modsEnd(T, b);
      const v = T[j]; if (!v) return null;
      if (REPORT.test(v.lo)) return null; // "no one replied": a fact on record, not an absolute to chip
      const subj = sTok || AUX.has(v.lo) || isThird(v.lo) || /ed$/.test(v.lo) || PAST2BASE[v.lo] || /^(will|can|would|could|might|cares|wants|likes|gets|understands|listens|notices)$/.test(v.lo);
      if (!subj) return null;
      const ever = rangeIdx(b, j).filter(k => T[k].lo === 'ever');
      const keep = rangeIdx(b, j).filter(k => T[k].lo !== 'ever').map(k => T[k].w);
      const f1 = E('NOT EVERYONE', { a: i, b: j, repl: ['not everyone' + (sTok ? "'s" : '')].concat(keep).join(' ') });
      // fewer people than I'd like + plural verb
      let f2 = null;
      const AG = { is: 'are', was: 'were', has: 'have', does: 'do', cares: 'care' };
      const pl = AG[v.lo] || (isThird(v.lo) ? lemma3(v.lo) : (/ed$|^(will|can|would|could|might)$/.test(v.lo) || PAST2BASE[v.lo] ? v.lo : null));
      if (pl && !sTok) f2 = E('ONLY SOME PEOPLE', { a: i, b: j + 1, repl: ['only some people'].concat(keep).concat([pl]).join(' ') });
      const mirror = E('EVERYONE', { a: i, b: j, repl: ['everyone' + (sTok ? "'s" : '')].concat(keep).join(' ') });
      return { at: two ? [i, i + 1].concat(ever) : [i].concat(ever), kind: 'people', load: true, auto: f1, fair: f2 ? [f1, f2] : [f1], mirror };
    }
    const GOODADJ = /^(fine|okay|ok|great|good|perfect|right|alright|all|amazing|lovely|well|sorted)$/, BADADJ = /^(wrong|bad|broken|amiss|lost|ruined|over|the matter)$/;
    function nothing(T, i) {
      const sTok = /'s$/.test(T[i].lo);
      if (T.slice(i + 1, i + 4).some(x => BADADJ.test(x.lo))) return null; // "nothing is wrong": a kind sentence
      let j = i + 1; while (T[j] && (ADV_SKIP.has(T[j].lo) || T[j].lo === 'ever')) j++;
      const v = T[j], pv = W1(T, i - 1);
      const startLike = i === 0 || /^[,;:]$/.test(pv) || /^(and|but|so|because|now|then|that|if|when|and|like|feels|feel|seems|like|honestly)$/.test(pv) || !isWord(T[i - 1]);
      const ever = rangeIdx(i + 1, j).filter(k => T[k].lo === 'ever');
      const keep = rangeIdx(i + 1, j).filter(k => T[k].lo !== 'ever').map(k => T[k].w);
      if (startLike && (sTok || (v && (AUX.has(v.lo) || isThird(v.lo) || /ed$/.test(v.lo) || PAST2BASE[v.lo] || /^(i|you|he|she|they|we)$/.test(v.lo) || /^(i've|i'd|i'm|you've)$/.test(v.lo))))) {
        const f1 = E('NOT EVERYTHING', { a: i, b: j, repl: ['not everything' + (sTok ? "'s" : '')].concat(keep).join(' ') });
        const AG = { is: 'are', was: 'were', has: 'have', does: 'do', "isn't": "aren't", "doesn't": "don't", "wasn't": "weren't" };
        let f2 = null;
        if (sTok) f2 = E('SOME THINGS', { a: i, b: j, repl: [PERF_S.test(W1(T, j)) ? 'some things have' : 'some things are'].concat(keep).join(' ') });
        else if (v && (AG[v.lo] || isThird(v.lo))) f2 = E('SOME THINGS', { a: i, b: j + 1, repl: ['some things'].concat(keep).concat([AG[v.lo] || lemma3(v.lo)]).join(' ') });
        else if (v && /^(i|you|he|she|they|we)$/.test(v.lo)) { for (let k = j + 2; k < T.length && k < j + 7; k++) { const w = T[k].lo; if (AG[w] || isThird(w)) { f2 = E('SOME THINGS', [{ a: i, b: j, repl: ['some things'].concat(keep).join(' ') }, { a: k, b: k + 1, repl: AG[w] || lemma3(w) }]); break; } if (!isWord(T[k])) break; } }
        if (!f2) f2 = E('NOT MUCH', { a: i, b: j, repl: ['not much' + (sTok ? "'s" : '')].concat(keep).join(' ') });
        const mir = E('EVERYTHING', { a: i, b: j, repl: ['everything' + (sTok ? "'s" : '')].concat(keep).join(' ') });
        const evers = []; for (let k = j; k < T.length && isWord(T[k]); k++) if (T[k].lo === 'ever') evers.push({ a: k, b: k + 1, repl: '' });
        if (evers.length) [f1, f2, mir].forEach(e => { e.ops = e.ops.concat(evers); });
        return { at: [i].concat(ever), kind: 'things', load: true, auto: f1, fair: [f1, f2], mirror: mir };
      }
      // object: I've done nothing -> I haven't done much yet
      if (W1(T, i + 1) === 'wrong' || W1(T, i + 1) === 'bad') return null;
      const rest = W1(T, i + 1), good = /^(right|well|good|properly|useful)$/.test(rest);
      let k = i - 1; const vb = T[k]; if (!vb || !/^[a-z']+$/.test(vb.lo) || NOT_VERB.has(vb.lo) || /^(and|but|or|so|then|now|just|really|still)$/.test(vb.lo)) return null;
      let auxK = k - 1; while (T[auxK] && ADV_SKIP.has(T[auxK].lo)) auxK--;
      const aux = T[auxK], s = aux ? subjectAt(T, AUX.has(aux.lo) || CONTR[aux.lo] ? auxK : k) : null;
      const little = good ? E('FEWER THAN I’D HOPED', { a: i, b: i + 2, repl: 'fewer things ' + rest + " than I'd hoped" }) : E('LESS THAN I’D HOPED', { a: i, b: i + 1, repl: "less than I'd hoped" });
      let f1 = null;
      const much = good ? 'everything' : 'much';
      if (aux && (AUX.has(aux.lo) || CONTR[aux.lo]) && !/n't$/.test(aux.lo)) { // aux + verb + nothing
        const c = CONTR[aux.lo], a0 = c ? auxK : auxK, al = c ? c[1] : aux.lo;
        const base = { s: 'has', 'm': 'am', 're': 'are', 've': 'have', 'll': 'will', 'd': 'would' }[al.replace(/^'/, '')] || al;
        const neg = NEG_AUX[base === 's' ? 'has' : base]; if (!neg) return null;
        const subjPart = c ? (c[0] === 'i' ? 'I' : c[0]) + ' ' : '';
        const perfect = /^(have|has|had)$/.test(base);
        f1 = E('NOT MUCH', [{ a: a0, b: a0 + 1, repl: subjPart + (base === 'will' ? 'might not' : neg) }, { a: i, b: i + 1, repl: much }], perfect && !good ? { tail: 'yet' } : null);
      } else if (s && !s.contracted) { // subject + verb + nothing
        const bo = baseOf(vb.lo); if (!bo) return null;
        const dn = bo.tense === 'past' ? "didn't" : (bo.tense === 'pres3' || (s.sg && s.pro !== 'i' && s.pro !== 'you')) ? "doesn't" : "don't";
        if (bo.tense === 'pres' && s.sg && s.pro !== 'i' && s.pro !== 'you') return null;
        f1 = E('NOT MUCH', [{ a: k, b: k + 1, repl: dn + ' ' + bo.base }, { a: i, b: i + 1, repl: much }]);
      }
      if (!f1) return { at: [i], kind: 'things', load: true, auto: little, fair: [little], mirror: E('EVERYTHING', { a: i, b: i + 1, repl: 'everything' }) };
      return { at: [i], kind: 'things', load: true, auto: f1, fair: [f1, little], mirror: E('EVERYTHING', { a: i, b: i + 1, repl: 'everything' }) };
    }
    function everything(T, i) {
      const sTok = /'s$/.test(T[i].lo), pv = W1(T, i - 1);
      if (T.slice(i + 1, i + 4).some(x => GOODADJ.test(x.lo))) return null; // "everything's fine"
      let j = i + 1; while (T[j] && ADV_SKIP.has(T[j].lo)) j++;
      const v = T[j];
      const startLike = i === 0 || /^[,;:]$/.test(pv) || /^(and|but|so|because|now|then|that|if|when|like|feels|seems|honestly)$/.test(pv) || !isWord(T[i - 1]);
      if (startLike && (sTok || (v && (AUX.has(v.lo) || isThird(v.lo) || /ed$/.test(v.lo) || PAST2BASE[v.lo] || /^(i|you|he|she|they|we|i've|i'd|i'm)$/.test(v.lo))))) {
        const f1 = E('NOT EVERYTHING', { a: i, b: i + 1, repl: 'not everything' + (sTok ? "'s" : '') });
        const AG = { is: 'are', was: 'were', has: 'have', does: 'do', "isn't": "aren't", "doesn't": "don't", "wasn't": "weren't" };
        let f2 = null;
        if (sTok) f2 = E('SOME THINGS', { a: i, b: i + 1, repl: PERF_S.test(W1(T, i + 1)) ? 'some things have' : 'some things are' });
        else if (v && (AG[v.lo] || isThird(v.lo))) f2 = E('SOME THINGS', { a: i, b: j + 1, repl: ['some things'].concat(T.slice(i + 1, j).map(x => x.w)).concat([AG[v.lo] || lemma3(v.lo)]).join(' ') });
        else if (v && /^(i|you|he|she|they|we|i've|i'd|i'm)$/.test(v.lo)) { // "Everything I do goes wrong": the main verb comes after the relative clause
          for (let k = j + 2; k < T.length && k < j + 7; k++) { const w = T[k].lo; if (AG[w] || isThird(w)) { f2 = E('SOME THINGS', [{ a: i, b: i + 1, repl: 'some things' }, { a: k, b: k + 1, repl: AG[w] || lemma3(w) }]); break; } if (!isWord(T[k])) break; }
        }
        return { at: [i], kind: 'things', load: true, auto: f1, fair: f2 ? [f1, f2] : [f1], mirror: E('NOTHING', { a: i, b: i + 1, repl: 'nothing' + (sTok ? "'s" : '') }) };
      }
      if (/^(of|about|for|with|in|on|at|to)$/.test(pv) && pv !== 'ruined') {
        return { at: [i], kind: 'things', load: true, auto: E('SOME THINGS', { a: i, b: i + 1, repl: 'some things' }), fair: [E('SOME THINGS', { a: i, b: i + 1, repl: 'some things' }), E('A FEW THINGS', { a: i, b: i + 1, repl: 'a few things' })], mirror: E('NOTHING', { a: i, b: i + 1, repl: 'nothing' }) };
      }
      if (/^(is|was|means|meant)$/.test(pv)) return null; // "it was everything to me"
      if (/^(do|does|did|doing|done|handle|handles|organise|organize|manage|carry|plan|pay|cook|clean|fix)$/.test(pv)) return { at: [i], kind: 'things', load: true, auto: E('A LOT', { a: i, b: i + 1, repl: 'a lot' }), fair: [E('A LOT', { a: i, b: i + 1, repl: 'a lot' }), E('MOST THINGS', { a: i, b: i + 1, repl: 'most things' })], mirror: E('NOTHING', { a: i, b: i + 1, repl: 'nothing' }) };
      return { at: [i], kind: 'things', load: true, auto: E('SOME THINGS', { a: i, b: i + 1, repl: 'some things' }), fair: [E('SOME THINGS', { a: i, b: i + 1, repl: 'some things' }), E('A FEW THINGS', { a: i, b: i + 1, repl: 'a few things' })], mirror: E('NOTHING', { a: i, b: i + 1, repl: 'nothing' }) };
    }
    function certain(T, i) {
      const lo = T[i].lo, two = lo === 'for' || lo === 'no', b = two ? i + 2 : i + 1;
      const pv = W1(T, i - 1), nx = W1(T, b);
      // the honest universal: "I don't know yet if" + the clause without the certainty word
      let end = T.length; while (end > 0 && !isWord(T[end - 1])) end--;
      const startTok = T[0] ? T[0].w : '';
      const know = E("DON'T KNOW YET", [{ a: 0, b: 0, repl: "I don't know yet if" }, { a: i, b, repl: '' }], { lowerFirst: true });
      void startTok;
      if (lo === 'for' || lo === 'no') return { at: rangeIdx(i, b), kind: 'cert', load: false, auto: know, fair: [know, E('MAYBE', { a: i, b, repl: ', maybe' })], mirror: null };
      // 'm definitely / is clearly -> might be
      const c = CONTR[pv];
      if ((c && /^(am|are|s)$/.test(c[1])) || /^(am|is|are)$/.test(pv)) {
        if (nx === 'not') return { at: [i], kind: 'cert', load: false, auto: E('MAYBE', { a: i, b: i + 1, repl: 'maybe' }), fair: [E('MAYBE', { a: i, b: i + 1, repl: 'maybe' })], mirror: null };
        const s = c ? subjectAt(T, i - 1) : subjectAt(T, i - 1);
        if (s) {
          const hasPerf = c && c[1] === 's' && PERF_S.test(nx);
          const a = c ? i - 1 : s.i0, rp = (c ? (c[0] === 'i' ? 'I' : c[0]) : s.text) + (hasPerf ? ' might have' : ' might be');
          const f1 = E('MIGHT', { a, b: i + 1, repl: rp });
          return { at: [i], kind: 'cert', load: false, auto: f1, fair: [f1, know], mirror: E('DEFINITELY NOT', { a: i, b: i + 1, repl: 'definitely not' }) };
        }
      }
      // will definitely / 'll definitely -> might
      if (pv === 'will' || /'ll$/.test(pv)) {
        const s = subjectAt(T, i - 1);
        if (s) { const a = /'ll$/.test(pv) ? i - 1 : s.i0; const f1 = E('MIGHT', { a, b: i + 1, repl: subjText(s) + ' might' }); return { at: [i], kind: 'cert', load: false, auto: f1, fair: [f1, know], mirror: E("DEFINITELY WON'T", { a, b: i + 1, repl: subjText(s) + " definitely won't" }) }; }
      }
      // she obviously doesn't want to -> she might not want to
      if (/^(doesn't|don't|won't)$/.test(nx) && subjectAt(T, i)) { const f1 = E('MIGHT NOT', { a: i, b: i + 2, repl: 'might not' }); return { at: [i], kind: 'cert', load: false, auto: f1, fair: [f1, know], mirror: null }; }
      if (/^(isn't|aren't)$/.test(nx) && subjectAt(T, i)) { const f1 = E('MIGHT NOT', { a: i, b: i + 2, repl: 'might not be' }); return { at: [i], kind: 'cert', load: false, auto: f1, fair: [f1, know], mirror: null }; }
      // he definitely hates me -> he might hate me
      const v = T[i + 1];
      if (v && /^[a-z]+$/.test(v.lo) && isThird(v.lo) && subjectAt(T, i)) {
        const f1 = E('MIGHT', { a: i, b: i + 2, repl: 'might ' + lemma3(v.lo) });
        return { at: [i], kind: 'cert', load: false, auto: f1, fair: [f1, know], mirror: null };
      }
      if (i === 0 || /^[,;]$/.test(pv)) { const f1 = E('MAYBE', { a: i, b: i + 1 + (W1(T, i + 1) === ',' ? 1 : 0), repl: 'maybe' }); return { at: [i], kind: 'cert', load: false, auto: f1, fair: [f1, know], mirror: null }; }
      const f1 = E('POSSIBLY', { a: i, b: i + 1, repl: 'possibly' });
      return { at: [i], kind: 'cert', load: false, auto: f1, fair: [f1, know], mirror: null };
    }
    const PERF_S = /^(been|got|gotten|had|gone|seen|made|said|told|taken|given|lost|found|moved|left|decided|stopped|started|forgotten|realised|realized|noticed|changed|met|heard|blocked|unfollowed|ghosted|replied|texted|written|known)$/;
    const PERSON_N = /^(person|friend|mum|mom|dad|mother|father|parent|partner|boyfriend|girlfriend|wife|husband|sister|brother|son|daughter|employee|worker|student|teacher|boss|manager|colleague|human|team-?mate|flatmate|roommate|writer|singer|player|cook|driver|leader|nurse|doctor|coworker|co-worker|child|kid|grandchild|auntie|aunt|uncle)$/;
    function worst(T, i) {
      const nx = W1(T, i + 1);
      if (PERSON_N.test(nx)) {
        const f1 = E('NOT THE BEST', { a: i - 1, b: i + 1, repl: 'not the best' });
        const f2 = E('IMPERFECT', { a: i - 1, b: i + 1, repl: 'an imperfect' });
        return { at: [i - 1, i], kind: 'super', load: true, auto: f2, fair: [f2, f1], mirror: E('THE BEST', { a: i - 1, b: i + 1, repl: 'the best' }) };
      }
      if (/^[a-z]+$/.test(nx) && !NOT_VERB.has(nx) && !AUX.has(nx) && !/^(thing)$/.test(nx)) {
        let tailK = 0; // "the worst day of my life" / "the worst day ever": the superlative's frame goes too
        if (W1(T, i + 2) === 'of' && W1(T, i + 3) === 'my' && W1(T, i + 4) === 'life') tailK = 3; else if (W1(T, i + 2) === 'ever') tailK = 1;
        const f1 = E('A HARD', [{ a: i - 1, b: i + 1, repl: 'a hard' }].concat(tailK ? [{ a: i + 2, b: i + 2 + tailK, repl: '' }] : []));
        const f2 = E('A TOUGH', [{ a: i - 1, b: i + 1, repl: 'a tough' }].concat(tailK ? [{ a: i + 2, b: i + 2 + tailK, repl: '' }] : []));
        return { at: [i - 1, i], kind: 'super', load: true, auto: f1, fair: [f1, f2], mirror: E('THE BEST', { a: i - 1, b: i + 1, repl: 'the best' }) };
      }
      // I'm the worst
      const f1 = E('NOT PERFECT', { a: i - 1, b: i + 1, repl: 'not perfect' });
      return { at: [i - 1, i], kind: 'super', load: true, auto: f1, fair: [f1, E('HUMAN', { a: i - 1, b: i + 1, repl: 'human' })], mirror: E('THE BEST', { a: i - 1, b: i + 1, repl: 'the best' }) };
    }

    /* ---------- clauses from the player's text ---------- */
    function clausesOf(text) {
      const t = String(text || '').replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ');
      const out = [];
      const SUBJ = "(?:i|i'm|i've|i'll|they|he|she|we|you|it|it's|that|this|people|everyone|everybody|nobody|no one|nothing|everything|my|his|her|their|our|things)\\b";
      const SPLIT = new RegExp(",?\\s+(?:but|because|although|though|while|yet|and then|so now)\\s+|,?\\s+(?:and|so|or)\\s+(?:(?:honestly|then|also|really|maybe|now|still|just|frankly|anyway)\\s+)?(?=" + SUBJ + ")|,\\s+(?:and\\s+)?(?:(?:honestly|frankly|anyway|basically)\\s+)?(?=" + SUBJ + ")", 'i');
      t.split(/[.!?;\n]+|\s[-–—]\s/).forEach(sen => sen.split(SPLIT).forEach(c => {
        c = c.trim().replace(/^(and|but|so|then|plus|also|honestly|basically|like)\s+/i, '').replace(/^["'(]+|["')]+$/g, '').trim();
        if (c.split(' ').length >= 2) out.push(c);
      }));
      return out;
    }

    /* run a chain of edits through a clause: every hit but the last takes its automatic fair rewrite */
    function chain(text, mode) {
      const T0 = tok(text), first = scan(T0, mode);
      if (!first.length) return null;
      // order: lighter absolutes first, the load-bearing one last (the twist)
      const loads = first.filter(h => h.load), light = first.filter(h => !h.load);
      const twist = loads.length ? loads[loads.length - 1] : light[light.length - 1];
      const order = light.filter(h => h !== twist).concat(loads.filter(h => h !== twist)).concat([twist]);
      const steps = []; let T = T0;
      for (let k = 0; k < order.length; k++) {
        const hs = scan(T, mode), h = hs.find(x => x.ids[0] === order[k].ids[0]);
        if (!h) continue;
        const last = k === order.length - 1;
        steps.push({ before: T, hit: h, twist: last });
        if (!last) T = apply(T, h.auto);
      }
      return { start: T0, steps };
    }

    /* the player's clause that leans hardest on absolutes (whole sentences first, so two absolutes can share a stone) */
    const LABEL = /\b(i'?m|i am|you'?re|you are)\s+(a|an|such a|so|the|totally|completely|just|really)?\s*(complete |total |utter )?(failure|idiot|loser|mess|disaster|joke|fraud|burden|stupid|useless|pathetic|worthless|incompetent|hopeless|terrible|awful|horrible|bad|forgettable|unlovable|ugly)\b/i;
    const NEGW = /\b(wrong|mess\w*|ruin\w*|fail\w*|hate\w*|annoy\w*|stupid|useless|never|nobody|no one|nothing|worst|bad|late|forg[eo]t\w*|upset|angry|mad|sick|alone|ignor\w*|leav\w*|lose|lost|fired|sacked|incompetent|awkward|embarrass\w*|hurt|can't|cannot|don't|won't|doesn't|isn't|not|disaster|doomed|over|terrible|awful|blew|screw\w*|let \w+ down|falling apart|broke\w*|reject\w*|judg\w*|laugh\w* at|weird|boring|burden)\b/gi;
    const POSW = /\b(helps?|supports?|loves?|kind|fine|great|happy|good|well|proud|nice|smart|safe|lucky|okay|best|cares?|there for|right)\b/gi;
    function pick(text, mode, spans) {
      const raw = String(text || '').replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
      if (!raw) return null;
      const cams = (Array.isArray(spans) ? spans : []).filter(x => x && x.kind === 'camera' && x.quote).map(x => String(x.quote).replace(/[’‘`´]/g, "'").toLowerCase());
      const cands = [];
      raw.split(/[.!?;\n]+|\s[-–—]\s/).forEach(sen => {
        sen = sen.trim().replace(/^(and|but|so|then|plus|also|honestly|basically|like|anyway)\s+/i, '').replace(/^["'(]+|["')]+$/g, '').trim();
        if (!sen) return;
        if (sen.split(' ').length <= 16) cands.push(sen);
        clausesOf(sen).forEach(c => { if (c !== sen) cands.push(c); });
      });
      let best = null;
      cands.forEach((c, ci) => {
        const T = tok(c), hits = scan(T, mode); if (!hits.length) return;
        const n = c.split(' ').length;
        let sc = hits.reduce((a, h) => a + (h.load ? 3 : 2), 0) + (hits.some(h => h.load) ? 1.5 : 0) - Math.max(0, n - 11) * 0.7 - (n < 3 ? 2 : 0) - ci * 0.01;
        if (cams.some(q => q.includes(c.toLowerCase()))) sc -= 4;
        if (LABEL.test(c)) sc -= 3; // a harsh label would stay carved: prefer a clause without one
        const neg = (c.match(NEGW) || []).length, pos = (c.match(POSW) || []).length;
        if (pos > neg) sc -= 10; // "he always helps me": a kind absolute is not ours to shrink
        if (/["]/.test(c)) sc -= 3;
        if (sc > 0.5 && (!best || sc > best.sc)) best = { text: c.replace(/[,:]+$/, ''), sc, n: hits.length };
      });
      return best;
    }

    return { tok, join, scan, apply, chain, clausesOf, pick, isWord, lemma3, past2base, participle, article };
  })();

  /* ---------------- the studio: stones, daily light, common thoughts ---------------- */
  const ROMAN = "'Marcellus SC', 'Marcellus', 'TeX Gyre Pagella', 'Palatino Linotype', 'Book Antiqua', Palatino, 'URW Palladio L', Georgia, serif";
  const STONES = [
    { key: 'carrara', name: 'Carrara', base: '#ecebe6', base2: '#d9d7d1', vein: '#8f97a3', cut: '#4c525c', lit: '#ffffff', rock: '#b9b6ae', gloss: '#ffffff' },
    { key: 'verde', name: 'Verde Alpi', base: '#3f6e5c', base2: '#2b5446', vein: '#d6eadf', cut: '#10291f', lit: '#9fd1ba', rock: '#2f4f43', gloss: '#e9fff4' },
    { key: 'rosa', name: 'Rosa Portogallo', base: '#ecc9be', base2: '#d9ad9f', vein: '#a87266', cut: '#6e3b33', lit: '#fff1ec', rock: '#b9897c', gloss: '#fff4f0' },
    { key: 'nero', name: 'Nero Marquina', base: '#2c2c31', base2: '#1d1d21', vein: '#e3e3e8', cut: '#08080a', lit: '#77777f', rock: '#3a3a40', gloss: '#f4f4ff' },
    { key: 'calacatta', name: 'Calacatta Gold', base: '#f4efe4', base2: '#e4dccb', vein: '#b8955a', cut: '#5e4c33', lit: '#ffffff', rock: '#c6bba5', gloss: '#fffaf0' },
    { key: 'travertine', name: 'Travertine', base: '#e3d3b5', base2: '#cdb994', vein: '#b49b72', cut: '#6a5538', lit: '#fff6e2', rock: '#b8a27c', gloss: '#fffaf0', bands: true },
    { key: 'bardiglio', name: 'Bardiglio Blue', base: '#a9b3bf', base2: '#8b97a6', vein: '#59657a', cut: '#2b3340', lit: '#e6edf6', rock: '#7d8898', gloss: '#f2f7ff' }
  ];
  const STUDIOS = [
    { key: 'morning', name: 'Carrara Morning', wallD: ['#3b342e', '#2a2420'], wallB: ['#efe5d6', '#e2d5c1'], floorD: '#2a211b', floorB: '#cdb89a', light: '#ffd9a0', amb: 'dawn' },
    { key: 'noon', name: 'Quarry Noon', wallD: ['#32373c', '#23272b'], wallB: ['#e6eaec', '#d4dade'], floorD: '#25292c', floorB: '#bfc4c6', light: '#f2f6ff', amb: 'room' },
    { key: 'harbour', name: 'Harbour Atelier', wallD: ['#26383d', '#1a282c'], wallB: ['#dceae8', '#c6dbd8'], floorD: '#1d2a2c', floorB: '#b2c8c4', light: '#c9ecff', amb: 'waves' },
    { key: 'lantern', name: 'Lantern Night', wallD: ['#232537', '#171826'], wallB: ['#dedbea', '#cbc7dc'], floorD: '#1a1a26', floorB: '#bab4c9', light: '#c2d2ff', amb: 'prairie', night: true },
    { key: 'rose', name: 'Rose Workshop', wallD: ['#3c2b2e', '#2a1d20'], wallB: ['#f3e0da', '#e6cbc2'], floorD: '#2c1f20', floorB: '#d6b8ac', light: '#ffc6a6', amb: 'dawn' }
  ];
  const COMMON = {
    warm: { work: 'I always mess things up at work', study: 'I always freeze in exams', social: 'I always say the wrong thing', reply: 'I always say the wrong thing', partner: 'I always say the wrong thing', family: 'I always let them down', none: 'I always get things wrong' },
    main: { work: 'Nothing I do is ever good enough', study: "I'll never be good at this", social: 'Everyone thinks I’m weird', reply: 'Nobody ever replies to me', partner: 'Nobody really understands me', family: 'Nobody in my family listens to me', none: 'Nothing ever goes right for me' }
  };
  const DOMS = [['partner', /\b(partner|boyfriend|girlfriend|husband|wife|bf|gf|fianc\w*|dating|relationship)\b/i], ['family', /\b(mum|mom|dad|mother|father|sister|brother|family|parents?)\b/i],
    ['study', /\b(exams?|tests?|grades?|marks?|teacher|lecturer|assignment|uni|school|essay|course)\b/i], ['work', /\b(boss|manager|work|job|meeting|deadline|client|colleague|team|promotion|fired|presentation)\b/i],
    ['reply', /\b(text|texted|message|messaged|reply|replied|ignored|ghost\w*|group chat)\b/i], ['social', /\b(friends?|party|everyone|people|group|awkward|embarrass\w*)\b/i]];
  const domainOf = (t) => { const d = DOMS.find(x => x[1].test(String(t || ''))); return d ? d[0] : 'none'; };
  const SCALE = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6', 'A6', 'B6', 'D7'];
  const LEAF = { Gold: ['#fff4c2', '#e7b84a', '#9a6a12'], Silver: ['#ffffff', '#c9d0da', '#7a8494'], Bronze: ['#ffd9b0', '#c98a4e', '#7a4a1e'] };

  (env.games = env.games || []).push({
    id: 'chisel', mode: 'reframe', name: 'Chisel', verb: 'chisel', family: 'REFRAME', minutes: 2,
    parents: ['Inner Speech / Mental Text', 'Beliefs / Evidence', 'Overthinking / Thought Fusion'],
    cast: ['still', 'glitch'], poster: { char: 'still', mood: 'determined' },
    fonts: ['Marcellus+SC'],
    tagline: 'Chip the “always” and “never” out of your thought, then polish it.',
    why: 'For always/never/everyone thoughts: knock off the absolutes, keep what’s true.',
    css: `
.g-chisel { --cz-chalk: #f6f2e8; }
.g-chisel .cz-touch { position: absolute; inset: 0; z-index: 4; touch-action: none; cursor: crosshair; }
.g-chisel .cz-hud { position: absolute; z-index: 20; left: 12px; right: 12px; top: calc(env(safe-area-inset-top, 0px) + 62px); display: flex; justify-content: space-between; align-items: center; gap: 8px; pointer-events: none; transition: opacity .5s ease, transform .5s ease; }
.g-chisel .cz-hud.out { opacity: 0; transform: translateY(-12px); }
.g-chisel .cz-pill { display: flex; align-items: center; gap: 8px; min-width: 0; overflow: hidden; font: 400 14px/1 ${ROMAN}; letter-spacing: .1em; padding: 8px 13px 7px; border-radius: 999px; color: #f6eedf; white-space: nowrap;
  background: linear-gradient(180deg, rgba(36,30,24,.82), rgba(22,18,14,.82)); border: 1px solid rgba(255,236,200,.22); box-shadow: 0 6px 16px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.08); }
.g-chisel .cz-pill b { font-weight: 400; color: #ffd98a; }
.g-chisel .cz-pill em { font: 600 12px/1 var(--font-ui); font-style: normal; letter-spacing: .06em; color: #d9ccb6; text-transform: uppercase; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.g-chisel .cz-steady { flex: none; }
@container (max-width: 430px) { .g-chisel .cz-steady em { display: none; } .g-chisel .cz-pill { padding: 8px 11px 7px; } }
.g-chisel .cz-steady { gap: 7px; }
.g-chisel .cz-steady i { width: 9px; height: 9px; border-radius: 50%; background: rgba(255,255,255,.16); box-shadow: inset 0 1px 2px rgba(0,0,0,.5); transition: background .2s ease, box-shadow .2s ease, transform .2s ease; }
.g-chisel .cz-steady i.on { background: radial-gradient(circle at 35% 30%, #fffbe6, #ffd25e 55%, #c88a12); box-shadow: 0 0 9px rgba(255,205,90,.85); transform: scale(1.12); }
.g-chisel .cz-cards { position: absolute; z-index: 25; display: flex; gap: 10px; justify-content: center; align-items: stretch; flex-wrap: wrap; pointer-events: none; }
.g-chisel .cz-card { pointer-events: auto; appearance: none; border: 0; cursor: pointer; position: relative; min-width: 100px; max-width: 156px; min-height: 64px; padding: 12px 12px 11px; border-radius: 10px;
  background: radial-gradient(120% 90% at 30% 20%, #4a5257, #2b3135 60%, #23282b); color: var(--cz-chalk); font: 400 17px/1.12 ${ROMAN}; letter-spacing: .05em; text-align: center;
  box-shadow: 0 10px 22px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.14), inset 0 0 0 2px #6b5a43, inset 0 0 0 4px #3e3326; text-shadow: 0 0 1px rgba(255,255,255,.5), 0 0 6px rgba(255,255,255,.18);
  transform: translateY(14px) scale(.96); opacity: 0; transition: transform .45s cubic-bezier(.2,1.3,.4,1), opacity .3s ease, box-shadow .2s ease; }
.g-chisel .cz-cards.in .cz-card { transform: none; opacity: 1; }
.g-chisel .cz-cards.in .cz-card:nth-child(2) { transition-delay: .07s; } .g-chisel .cz-cards.in .cz-card:nth-child(3) { transition-delay: .14s; }
.g-chisel .cz-card:focus-visible { outline: 3px solid #ffd36b; outline-offset: 3px; }
.g-chisel .cz-card.on { box-shadow: 0 0 0 3px #ffd36b, 0 0 22px rgba(255,211,107,.55), 0 10px 22px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.14), inset 0 0 0 2px #6b5a43, inset 0 0 0 4px #3e3326; }
.g-chisel .cz-cards.in .cz-card.used { opacity: .5; cursor: default; }
.g-chisel .cz-card.used span { text-decoration: line-through; text-decoration-thickness: 2px; text-decoration-color: #ff9a7a; }
.g-chisel .cz-card small { display: block; margin-top: 6px; font: 600 12px/1.15 var(--font-ui); letter-spacing: .06em; text-transform: uppercase; color: #ffcfb8; text-shadow: none; }
.g-chisel .cz-cards.lock .cz-card { pointer-events: none; }
.g-chisel .cz-cap { position: absolute; z-index: 22; left: 50%; transform: translateX(-50%); width: max-content; max-width: calc(100% - 32px); text-align: center; pointer-events: none;
  font: 400 14px/1.2 ${ROMAN}; letter-spacing: .14em; color: #f6ead6; padding: 6px 14px 5px; border-radius: 999px; background: rgba(26,20,15,.62); transition: opacity .4s ease; }
.g-chisel[data-br="1"] .cz-cap { color: #fff8ec; background: rgba(70,50,30,.7); }
.g-chisel .cz-fin { position: absolute; z-index: 26; display: flex; flex-direction: column; gap: 8px; pointer-events: none; text-align: center; padding: 14px 16px 13px; border-radius: 16px;
  background: linear-gradient(180deg, #221b14, #15110c); border: 1px solid rgba(255,226,170,.22); box-shadow: 0 16px 40px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06); animation: cz-in .6s ease both; }
.g-chisel .cz-fin-h { font: 400 24px/1.05 ${ROMAN}; letter-spacing: .06em; color: #ffe2a6; text-shadow: 0 2px 14px rgba(255,190,90,.4); animation: cz-in .7s ease .15s both; }
.g-chisel .cz-was { font: 600 15px/1.35 var(--font-ui); color: #e8dccb; animation: cz-in .7s ease .4s both; }
.g-chisel .cz-was s { text-decoration-thickness: 2px; text-decoration-color: rgba(255,140,110,.9); }
.g-chisel .cz-was small, .g-chisel .cz-fair small { display: block; font: 400 12px/1.2 ${ROMAN}; letter-spacing: .16em; color: #cdb48a; margin-bottom: 3px; }
.g-chisel .cz-fair { font: 600 15px/1.35 var(--font-ui); color: #fff3dc; padding: 9px 12px; border-radius: 12px; background: rgba(255,240,210,.07); border: 1px solid rgba(255,230,180,.2); animation: cz-in .7s ease .65s both; }
.g-chisel .cz-care { font: 600 13px/1.35 var(--font-ui); color: #f3e6cf; animation: cz-in .7s ease .8s both; }
.g-chisel .cz-foot { display: flex; justify-content: center; flex-wrap: wrap; gap: 3px 14px; font: 400 13px/1.25 ${ROMAN}; letter-spacing: .1em; color: #e6cf9f; animation: cz-in .7s ease .95s both; }
.g-chisel[data-br="1"] .cz-fin { background: linear-gradient(180deg, #fffbf4, #f6eddc); border-color: rgba(120,90,50,.25); box-shadow: 0 16px 36px rgba(90,60,30,.22); }
.g-chisel[data-br="1"] .cz-fin-h { color: #7a4c10; text-shadow: none; }
.g-chisel[data-br="1"] .cz-was { color: #4a3826; } .g-chisel[data-br="1"] .cz-was small, .g-chisel[data-br="1"] .cz-fair small { color: #8a6838; }
.g-chisel[data-br="1"] .cz-fair { color: #3a2a18; background: rgba(120,90,50,.07); border-color: rgba(120,90,50,.2); }
.g-chisel[data-br="1"] .cz-care { color: #4a3826; } .g-chisel[data-br="1"] .cz-foot { color: #7a5a2a; }
.g-chisel .cz-fin.tight { gap: 5px; padding: 10px 14px; } .g-chisel .cz-fin.tight .cz-fin-h { font-size: 20px; }
@keyframes cz-in { from { opacity: 0; translate: 0 12px; } }
.g-chisel .cz-sr { position: absolute; left: 0; top: 0; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.g-chisel .cz-kbd { position: absolute; left: 0; top: 0; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.g-chisel .gk-char.gk-side-right .gk-bubble, .g-chisel .gk-char.gk-side-left .gk-bubble { top: auto; bottom: 0; max-width: min(300px, calc(100cqw - 2 * var(--sz, 72px) - 58px)); }
.g-chisel .gk-char.gk-side-right .gk-bubble::before, .g-chisel .gk-char.gk-side-left .gk-bubble::before { top: auto; bottom: 20px; }
.g-chisel .gk-char.cz-right.gk-char-dock { left: auto; right: 12px; }
@container (min-width: 700px) { .g-chisel .gk-char.gk-side-right .gk-bubble, .g-chisel .gk-char.gk-side-left .gk-bubble { max-width: 340px; } }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const now = () => performance.now();
      const L = (o, sub) => { let s = ctx.line(o) || ''; if (sub) Object.keys(sub).forEach(k => { s = s.split('{' + k + '}').join(sub[k]); }); return s; };
      const text = String(ctx.text || ''), noWords = !text.trim();
      const care = an.safety === 'care', strong = an.fear_support === 'strong';
      const inten = clamp(ctx.intensity | 0, 0, 2);
      const bright = () => S.scene() === 'bright';
      const studio = STUDIOS[K.daily() % STUDIOS.length], nextStudio = STUDIOS[(K.daily() + 1) % STUDIOS.length];
      const owned = K.collection();
      const stone = STONES.find(s => !owned.includes(s.name + ' plaque')) || K.dailyPick(STONES);
      const lightStone = (() => { const c = hexRgb(stone.base); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255 > 0.55; })();
      const SOFT = softwareGfx();

      /* ---------------- the stones to carve ---------------- */
      const dom = domainOf(text);
      const ownPick = noWords ? null : WORDS.pick(text, '', an.spans);
      const ownChain = ownPick ? WORDS.chain(ownPick.text, '') : null;
      const mkStone = (chain, own, warm) => ({ own, warm, T: chain.start, T0: chain.start, steps: chain.steps, k: 0, words: new Map(), lumps: [], px: 0, done: false });
      const stones = [];
      if (ownChain && ownChain.steps.length >= 2) stones.push(mkStone(ownChain, true, false));
      else if (ownChain) { stones.push(mkStone(WORDS.chain(COMMON.warm[dom] || COMMON.warm.none, ''), false, true)); stones.push(mkStone(ownChain, true, false)); }
      else { stones.push(mkStone(WORDS.chain(COMMON.warm[dom] || COMMON.warm.none, ''), false, true)); stones.push(mkStone(WORDS.chain(COMMON.main[dom] || COMMON.main.none, ''), false, false)); }
      const main = stones[stones.length - 1];
      const absCount = stones.reduce((n, s) => n + s.steps.length, 0);

      /* ---------------- state ---------------- */
      const st = { phase: 'intro', si: 0, finished: false, strikes: 0, clean: 0, streak: 0, best: 0, lastTap: 0, iv: [], shake: 0, tool: null, chosen: null, slump: 0, crackT: 0, cracks: [],
        polish: 0, rubbing: false, finT: 0, swingTo: 1, swing: 0, carveBudget: 0, beat: 0, rushedTold: false, steadyTold: false, mirrorTried: false, broken: new Map() };
      const G = { W: 0, H: 0, phone: true, u: 1, sd: 14, slab: { x: 0, y: 0, w: 0, h: 0 }, field: { x: 0, y: 0, w: 0, h: 0 }, bench: 0, floor: 0 };
      const P = K.particles({ max: 420 });
      const debris = [], chips = [], motes = [];
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1.25 : 2 });
      const meas = document.createElement('canvas').getContext('2d');
      const font = (px) => '400 ' + px + 'px ' + ROMAN;

      /* ---------------- DOM: touch layer, HUD, cards, characters ---------------- */
      const touch = h('div', { class: 'cz-touch', 'aria-hidden': 'true' });
      const kbd = h('button', { type: 'button', class: 'cz-kbd', 'aria-label': 'Chisel: press Space or Enter to strike, carve and polish' });
      const stoneTag = h('span', { class: 'cz-pill' }, h('b', { text: stone.name.toUpperCase() }), h('em', { text: '' }));
      const pips = Array.from({ length: 5 }, () => h('i'));
      const steady = h('span', { class: 'cz-pill cz-steady', 'aria-hidden': 'true' }, h('em', { text: 'Steady' }), pips);
      const hud = h('div', { class: 'cz-hud' }, stoneTag, steady);
      const cards = h('div', { class: 'cz-cards', role: 'group', 'aria-label': 'Fair words to carve', hidden: true });
      const cap = h('div', { class: 'cz-cap', 'aria-hidden': 'true', style: { opacity: '0' } });
      const sr = h('div', { class: 'cz-sr', role: 'status', 'aria-live': 'polite' });
      el.append(touch, kbd, hud, cards, cap, sr);
      const csz = K.phone() ? 74 : 96;
      const glitch = K.character('glitch', { side: 'right', mood: 'scan', size: csz });
      const still = K.character('still', { side: 'left', mood: 'determined', size: csz });
      still.el.classList.add('cz-right');
      const speak = (c, line, o) => { (c === glitch ? still : glitch).hush(); return c.say(line, o); };
      const setTag = () => { const s = stones[st.si]; stoneTag.lastChild.textContent = (stones.length > 1 ? (st.si + 1) + '/' + stones.length + ' · ' : '') + (s.own ? 'your words' : 'a common one'); };
      const setPips = () => { pips.forEach((p, i) => p.classList.toggle('on', i < Math.min(5, st.streak))); };
      el.setAttribute('data-br', bright() ? '1' : '0');
      S.on('theme', () => { el.setAttribute('data-br', bright() ? '1' : '0'); bgKey = ''; slabKey = ''; spr.clear(); stones.forEach(s => s.lumps.forEach(l => { l.built = 0; })); });

      /* ---------------- sound: a stone studio, a slow pad, and a lithophone you play by being steady ---------------- */
      let room = null, rubSnd = null, waves = null;
      const amb = studio.amb === 'waves' || studio.amb === 'room' ? null : K.ambience(studio.amb);
      if (amb) amb.level(0.26, 1.5);
      function beds() {
        if (!A.ctx || room) return;
        room = A.loop({ pink: true, filter: 'lowpass', freq: 320, q: 0.5, bus: 'amb' }); room.level(0.05, 1.2);
        rubSnd = A.loop({ pink: true, filter: 'bandpass', freq: 900, q: 0.9 });
        if (studio.amb === 'waves') { waves = A.loop({ pink: true, filter: 'lowpass', freq: 520, q: 0.4, bus: 'amb' }); }
        S.onDestroy(() => { [room, rubSnd, waves].forEach(x => x && x.stop()); });
      }
      beds(); S.on('audio-ready', beds);
      const CHORDS = [['D3', 'A3', 'E4', 'F#4'], ['B2', 'F#3', 'A3', 'D4'], ['G2', 'D3', 'F#3', 'B3'], ['A2', 'E3', 'A3', 'C#4']];
      let chordI = 0, padOn = false;
      function padNext() { if (!padOn || S.destroyed) return; if (A.ctx) A.pad(CHORDS[chordI % 4].map(n => A.note(n)), { dur: 9.5, vol: st.phase === 'finale' ? 0.12 : 0.055, attack: 2.4, lp: 1100, bus: 'music' }); chordI++; S.later(padNext, 7600); }
      function litho(i, vol) { if (!A.ctx) return; const f = A.note(SCALE[Math.min(SCALE.length - 1, i)]), v = vol || 1; A.tone({ type: 'sine', freq: f, dur: 1.5, vol: 0.085 * v, attack: 0.002, verb: 0.5 }); A.tone({ type: 'sine', freq: f * 2.76, dur: 0.4, vol: 0.026 * v, attack: 0.001, verb: 0.3 }); A.tone({ type: 'triangle', freq: f * 4.07, dur: 0.1, vol: 0.01 * v }); }
      function sStrike(kind) {
        K.sfx.tap();
        if (!A.ctx) return; const t = A.now(), v = kind === 'rushed' ? 0.6 : 1;
        A.tone({ when: t, type: 'sine', freq: 150, to: 68, glide: 0.06, dur: 0.13, vol: 0.24 * v });
        A.noise({ when: t, filter: 'bandpass', freq: kind === 'clean' ? 2400 : 1500, q: 1.3, dur: 0.05, vol: 0.24 * v });
        A.tone({ when: t, type: 'sine', freq: 3150, dur: 0.16, vol: 0.03 * v, attack: 0.001 }); A.tone({ when: t, type: 'sine', freq: 4720, dur: 0.08, vol: 0.016 * v, attack: 0.001 });
        for (let i = 0; i < (kind === 'clean' ? 7 : 4); i++) A.noise({ when: t + 0.05 + Math.random() * 0.26, filter: 'highpass', freq: 3200 + Math.random() * 3200, dur: 0.012, vol: 0.025 + Math.random() * 0.04 });
      }
      function sCrumble(big) { if (!A.ctx) return; const t = A.now(); A.noise({ when: t, filter: 'lowpass', freq: big ? 380 : 700, dur: big ? 0.9 : 0.35, attack: 0.01, vol: big ? 0.3 : 0.18 }); for (let i = 0; i < (big ? 16 : 8); i++) A.noise({ when: t + 0.05 + Math.random() * (big ? 0.8 : 0.4), filter: 'bandpass', freq: 1800 + Math.random() * 3000, q: 2, dur: 0.02, vol: 0.03 + Math.random() * 0.05 }); }
      let scritchT = 0;
      function sScritch() { const t0 = now(); if (t0 - scritchT < 55 || !A.ctx) return; scritchT = t0; A.noise({ filter: 'bandpass', freq: 3600, to: 1500, q: 2.2, dur: 0.06, vol: 0.05 + Math.random() * 0.03 }); }
      function sRumble() { K.sfx.thud(); if (!A.ctx) return; const t = A.now(); A.noise({ when: t, pink: true, filter: 'lowpass', freq: 150, dur: 1.5, attack: 0.04, vol: 0.5 }); A.noise({ when: t, filter: 'highpass', freq: 2000, dur: 0.18, vol: 0.18 }); for (let i = 0; i < 4; i++) A.tone({ when: t + i * 0.09, type: 'triangle', freq: 260 - i * 40, to: 90, glide: 0.2, dur: 0.25, vol: 0.05 }); sCrumble(true); }

      /* ---------------- layout: a block on a banker, a window high on the right, light falling across ---------------- */
      const rootOff = { x: 0, y: 0 };
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        G.W = W; G.H = H; G.phone = W < 700;
        G.u = G.phone ? clamp(W / 390, 0.86, 1.2) : clamp(H / 860, 0.8, 1.25);
        const u = G.u; G.sd = Math.round(14 * u);
        if (G.phone) {
          const w = Math.min(W - 50 * u - G.sd, 440), hh = clamp(H * 0.33, 230, 330), top = clamp(H * 0.17, 132, 176);
          G.slab = { x: Math.round((W - w - G.sd) / 2), y: Math.round(top), w: Math.round(w), h: Math.round(hh) };
        } else {
          const w = Math.min(800, W * 0.56), hh = Math.min(400, H * 0.46);
          G.slab = { x: Math.round((W - w - G.sd) / 2), y: Math.round(Math.max(124, H * 0.15)), w: Math.round(w), h: Math.round(hh) };
        }
        const fr = Math.round((G.phone ? 13 : 18) * u);
        G.frame = fr; G.field = { x: G.slab.x + fr, y: G.slab.y + fr, w: G.slab.w - fr * 2, h: G.slab.h - fr * 2 };
        G.bench = G.slab.y + G.slab.h; G.floor = G.bench + (G.phone ? 84 : 104) * u;
        // the skylight: high on the right wall; the shaft falls down-left across the block to the floor
        G.win = G.phone ? { x: W * 0.8, y: 100, w: 76 * u, h: 120 * u } : { x: Math.min(W - 110 * u, G.slab.x + G.slab.w + G.sd + 150 * u), y: 54, w: 128 * u, h: Math.min(320 * u, G.slab.y + G.slab.h * 0.5 - 54) };
        G.shaft = { sx: G.win.x, sy: G.win.y + G.win.h * 0.45, sw: G.win.w * 0.9, tx: G.slab.x + G.slab.w * 0.28, ty: G.floor + 26 * u, tw: G.slab.w * 0.42 };
        G.cardsY = G.phone ? G.bench + 40 * u : G.bench + 44 * u;
        cards.style.left = '12px'; cards.style.right = '12px'; cards.style.top = Math.round(G.cardsY) + 'px';
        cap.style.top = Math.round(G.bench + 8 * u) + 'px';
        bgKey = ''; slabKey = '';
        stones.forEach(s => { s.px = 0; });
        const s = stones[st.si];
        if (s) { fitStone(s); setLayout(s, s.T, { snap: true }); s.lumps.forEach(l => { l.built = 0; }); }
        if (finEl) placeFin();
        motes.length = 0; for (let i = 0; i < (SOFT ? 18 : 30); i++) motes.push({ k: Math.random(), d: Math.random(), sp: 0.01 + Math.random() * 0.02, ph: Math.random() * TAU, s: 1 + Math.random() * 2 });
      }
      /* the shaft as a polygon (k widens it, for soft layered edges) */
      function shaftPoly(k) {
        const s0 = G.shaft, dx = s0.tx - s0.sx, dy = s0.ty - s0.sy, l = Math.hypot(dx, dy) || 1, px = -dy / l, py = dx / l, a = s0.sw / 2 * k, b = s0.tw / 2 * k;
        return [{ x: s0.sx + px * a, y: s0.sy + py * a }, { x: s0.tx + px * b, y: s0.ty + py * b }, { x: s0.tx - px * b, y: s0.ty - py * b }, { x: s0.sx - px * a, y: s0.sy - py * a }];
      }
      function paintShaft(g, ox, oy, strength, br) {
        const s0 = G.shaft;
        [[1.6, 0.22], [1.25, 0.32], [0.95, 0.46]].forEach(([k, a]) => {
          const gr = g.createLinearGradient(s0.sx + ox, s0.sy + oy, s0.tx + ox, s0.ty + oy);
          gr.addColorStop(0, rgba(br ? '#ffffff' : studio.light, a * strength)); gr.addColorStop(0.6, rgba(br ? '#fffaf0' : studio.light, a * strength * 0.45)); gr.addColorStop(1, rgba(studio.light, 0));
          g.fillStyle = gr; polyPath(g, shaftPoly(k), ox, oy); g.fill();
        });
      }

      /* ---------------- the text block: words as units, glued units never split across lines ---------------- */
      function units(T) {
        const out = [];
        T.forEach(t => {
          if (!WORDS.isWord(t) && t.sp === '' && out.length) { out[out.length - 1].text += t.w.replace(/'/g, '’'); out[out.length - 1].punct.push(t.id); return; }
          out.push({ id: t.id, text: t.w.toUpperCase().replace(/'/g, '’'), punct: [] });
        });
        return out;
      }
      const fieldPad = () => (G.phone ? 12 : 26) * G.u;
      function flow(T, px, glue, boss) {
        const U = units(T); meas.font = font(px);
        const sp = meas.measureText(' ').width * 1.15, maxW = G.field.w - fieldPad() * 2;
        U.forEach(u => { u.w = meas.measureText(u.text).width; u.pad = boss && boss.has(u.id) ? px * 0.32 : 0; });
        const groups = []; U.forEach(u => { const g = groups[groups.length - 1]; if (g && glue && glue.has(g[g.length - 1].id)) g.push(u); else groups.push([u]); });
        const lines = []; let line = [], lw = 0;
        groups.forEach(gr => { const gw = gr.reduce((a, u) => a + u.w + u.pad * 2, 0) + sp * (gr.length - 1); if (line.length && lw + sp + gw > maxW) { lines.push(line); line = []; lw = 0; } lw += (line.length ? sp : 0) + gw; line.push(...gr); });
        if (line.length) lines.push(line);
        return { lines, sp, U, wide: Math.max(0, ...lines.map(l => l.reduce((a, u) => a + u.w + u.pad * 2, 0) + sp * (l.length - 1))) };
      }
      const lineH = (px) => px * 1.72;
      function variantsOf(s) {
        const v = [s.T0];
        s.steps.forEach(stp => { v.push(stp.before); if (stp.twist && !s.warm) { stp.hit.fair.forEach(e => v.push(WORDS.apply(stp.before, e))); if (stp.hit.mirror) v.push(WORDS.apply(stp.before, stp.hit.mirror)); } else v.push(WORDS.apply(stp.before, stp.hit.auto)); });
        return v;
      }
      const glueOf = (s) => { const g = new Set(); s.steps.forEach(stp => { const ids = stp.hit.ids; for (let i = 0; i < ids.length - 1; i++) g.add(ids[i]); }); return g; };
      const bossOf = (s, all) => { const b = new Set(); s.steps.forEach((stp, k) => { if (all || k >= s.k) { b.add(stp.hit.ids[0]); b.add(stp.hit.ids[stp.hit.ids.length - 1]); } }); return b; };
      function fitStone(s) {
        if (s.px) return;
        const vs = variantsOf(s), maxLines = G.phone ? 5 : 4, availH = G.field.h - fieldPad() * 1.2, maxW = G.field.w - fieldPad() * 2, glue = glueOf(s), boss = bossOf(s, true);
        let px = Math.round((G.phone ? 34 : 50) * G.u);
        for (; px > 16; px--) { if (vs.every(T => { const f = flow(T, px, glue, boss); return f.lines.length <= maxLines && f.lines.length * lineH(px) <= availH && f.wide <= maxW + 1; })) break; }
        s.px = Math.max(16, px);
      }
      /* place the words of T on the stone; existing words glide, new ones arrive in the given state */
      function setLayout(s, T, o) {
        o = o || {};
        const px = s.px, f = flow(T, px, glueOf(s), bossOf(s, false)), lh = lineH(px);
        const blockH = f.lines.length * lh, y0 = G.field.y + (G.field.h - blockH) / 2 + lh * 0.68;
        const seen = new Set(), tNow = now();
        f.lines.forEach((line, li) => {
          const lw = line.reduce((a, u) => a + u.w + u.pad * 2, 0) + f.sp * (line.length - 1);
          let x = G.field.x + (G.field.w - lw) / 2;
          line.forEach(u => {
            const tx = x + u.pad + u.w / 2, ty = y0 + li * lh; x += u.w + u.pad * 2 + f.sp;
            seen.add(u.id);
            let w = s.words.get(u.id);
            if (!w || w.st === 'gone') {
              w = { id: u.id, text: u.text, w: u.w, x: tx, y: ty, fx: tx, fy: ty, tx, ty, t0: 0, dur: 1, st: o.newState || 'cut', rev: o.newState === 'carving' || o.newState === 'chalk' ? 0 : 1, rot: 0, dy: 0, order: 0 };
              s.words.set(u.id, w);
            } else if (o.snap) { w.x = w.fx = w.tx = tx; w.y = w.fy = w.ty = ty; w.text = u.text; w.w = u.w; w.t0 = 0; }
            else { w.fx = w.x; w.fy = w.y; w.tx = tx; w.ty = ty; w.t0 = tNow; w.dur = o.dur || 700; w.text = u.text; w.w = u.w; }
          });
        });
        let order = 0; f.lines.forEach(line => line.forEach(u => { const w = s.words.get(u.id); if (w) w.order = order++; }));
        s.words.forEach((w, id) => { if (!seen.has(id) && w.st !== 'gone' && !w.lump) { if (!o.snap) crumbleWord(s, w); w.st = 'gone'; } });
      }

      /* ---------------- sprites: V-cut letters, graphite or chalk sketches, gold, silver or bronze leaf ---------------- */
      const spr = new Map();
      function sprite(textIn, px, kind) {
        const dpr = Math.min(cv.dpr || 1, 2), key = textIn + '|' + px + '|' + kind + '|' + dpr;
        if (spr.has(key)) return spr.get(key);
        meas.font = font(px); const tw = Math.ceil(meas.measureText(textIn).width), pad = Math.ceil(px * 0.25);
        const c = document.createElement('canvas'); c.width = Math.max(2, Math.ceil((tw + pad * 2) * dpr)); c.height = Math.max(2, Math.ceil((px * 1.5 + pad * 2) * dpr));
        const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.font = font(px); g.textBaseline = 'alphabetic';
        const bx = pad, by = pad + px * 1.02;
        if (kind === 'chalk') { // the layout sketch: graphite on pale stone, chalk on dark stone
          const ink = lightStone ? '46,44,52' : '255,255,255';
          g.lineJoin = 'round'; g.strokeStyle = 'rgba(' + ink + ',.78)'; g.lineWidth = Math.max(1, px * 0.045); g.strokeText(textIn, bx, by);
          g.strokeStyle = 'rgba(' + ink + ',.3)'; g.lineWidth = Math.max(0.8, px * 0.028); g.strokeText(textIn, bx + 0.9, by - 0.7);
          g.fillStyle = 'rgba(' + ink + ',.1)'; g.fillText(textIn, bx, by);
          g.globalCompositeOperation = 'destination-out'; const rr = K.rng(tw + px); for (let i = 0; i < tw * 0.8; i++) { g.fillStyle = 'rgba(0,0,0,' + (0.25 + rr() * 0.5).toFixed(2) + ')'; g.fillRect(bx + rr() * tw, pad + rr() * px * 1.4, 1 + rr() * 1.4, 1); }
        } else {
          const lf = kind === 'Silver' && lightStone ? ['#eef2f7', '#8d97a7', '#3f4756'] : LEAF[kind];
          // the lit lower wall of the V-cut, the cut itself, then (when earned) leaf laid into the cut, leaving a dark edge
          g.fillStyle = rgba(stone.lit, 0.85); g.fillText(textIn, bx + px * 0.035, by + px * 0.045);
          const cutG = g.createLinearGradient(0, by - px * 0.8, 0, by); cutG.addColorStop(0, shade(stone.cut, -0.25)); cutG.addColorStop(1, mix(stone.cut, stone.base, 0.25));
          g.fillStyle = cutG; g.fillText(textIn, bx, by);
          if (lf) { const lg = g.createLinearGradient(0, by - px * 0.8, 0, by); lg.addColorStop(0, lf[2]); lg.addColorStop(0.42, lf[1]); lg.addColorStop(0.75, lf[0]); lg.addColorStop(1, lf[1]); g.fillStyle = lg; g.fillText(textIn, bx + px * 0.012, by + px * 0.016); }
          g.globalCompositeOperation = 'source-atop'; g.fillStyle = lf ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.18)'; g.fillRect(0, 0, tw + pad * 2, by - px * 0.42);
        }
        const out = { c, w: tw + pad * 2, h: px * 1.5 + pad * 2, ox: pad + tw / 2, oy: by };
        spr.set(key, out); if (spr.size > 400) spr.delete(spr.keys().next().value);
        return out;
      }

      /* ---------------- bosses: rough unhewn stone around each absolute, faceted so it can fly off in pieces ---------------- */
      function lumpFor(s, k) { let l = s.lumps[k]; if (!l) { l = s.lumps[k] = { k, ids: s.steps[k].hit.ids, seed: 11 + k * 37 + s.steps.length * 5, facets: null, alive: null, built: 0, hit: 0 }; } return l; }
      function buildLump(s, l) {
        const ws = l.ids.map(id => s.words.get(id)).filter(Boolean); if (!ws.length) return;
        ws.forEach(w => { w.lump = l; });
        const px = s.px, label = ws.map(w => w.text).join(' '), fpx = Math.round(px * 1.04);
        meas.font = font(fpx); const tw = meas.measureText(label).width;
        const bw = tw + px * 0.62, bh = px * 2.1, rr = K.rng(l.seed);
        const out = []; const N = 30;
        for (let i = 0; i < N; i++) { const a = i / N * TAU, c = Math.cos(a), sn = Math.sin(a), j = 1 + (rr() - 0.5) * 0.2; out.push({ x: Math.sign(c) * Math.pow(Math.abs(c), 0.38) * bw / 2 * j, y: Math.sign(sn) * Math.pow(Math.abs(sn), 0.55) * bh / 2 * j - px * 0.05 }); }
        const nf = clamp(Math.round(tw / (px * 0.95)) + (inten - 1), 3, 7);
        const cuts = []; for (let i = 1; i < nf; i++) cuts.push({ x: -bw / 2 + bw * i / nf + (rr() - 0.5) * bw * 0.06, a: (rr() - 0.5) * 0.55 });
        const facets = [];
        for (let i = 0; i < nf; i++) {
          let p = out.slice();
          if (i > 0) { const c = cuts[i - 1]; p = clipHalf(p, c.x, 0, Math.cos(c.a), Math.sin(c.a), 1); }
          if (i < nf - 1) { const c = cuts[i]; p = clipHalf(p, c.x, 0, Math.cos(c.a), Math.sin(c.a), -1); }
          if (p.length < 3) continue;
          let cx = 0, cy = 0; p.forEach(q => { cx += q.x; cy += q.y; }); cx /= p.length; cy /= p.length;
          facets.push({ poly: p, cx, cy, tone: (rr() - 0.45) * 0.34 + (cx / bw) * 0.18 });
        }
        // one rough texture for the whole boss, the absolute cut deep into it; each facet then gets its own plane of light
        const dpr = Math.min(cv.dpr || 1, 2), pad = 10, W2 = bw + pad * 2, H2 = bh + pad * 2;
        const tex = document.createElement('canvas'); tex.width = Math.ceil(W2 * dpr); tex.height = Math.ceil(H2 * dpr);
        const g = tex.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, W2 / 2 * dpr, H2 / 2 * dpr);
        const rock = mix(stone.rock, lightStone ? '#8c7c62' : '#5a5046', 0.22);
        polyPath(g, out, 0, 0); g.save(); g.clip();
        let gr = g.createLinearGradient(bw / 2, -bh / 2, -bw / 2, bh / 2); gr.addColorStop(0, shade(rock, 0.24)); gr.addColorStop(0.5, rock); gr.addColorStop(1, shade(rock, -0.3)); g.fillStyle = gr; g.fillRect(-W2 / 2, -H2 / 2, W2, H2);
        for (let i = 0; i < bw * bh / 20; i++) { const x = (rr() - 0.5) * bw, y = (rr() - 0.5) * bh, r = 0.6 + rr() * 2; g.fillStyle = rr() < 0.55 ? 'rgba(0,0,0,' + (0.07 + rr() * 0.14).toFixed(2) + ')' : 'rgba(255,255,255,' + (0.06 + rr() * 0.14).toFixed(2) + ')'; g.fillRect(x, y, r, r * (0.6 + rr())); }
        for (let i = 0; i < 12; i++) { const x0 = (rr() - 0.5) * bw, y0 = (rr() - 0.5) * bh; g.strokeStyle = 'rgba(0,0,0,' + (0.1 + rr() * 0.12).toFixed(2) + ')'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + (rr() - 0.5) * 24, y0 + (rr() - 0.5) * 12); g.lineTo(x0 + (rr() - 0.5) * 34, y0 + (rr() - 0.5) * 20); g.stroke(); }
        g.font = font(fpx); g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = rgba(shade(rock, 0.5), 0.9); g.fillText(label, 1.3, px * 0.12 + 1.5);
        g.fillStyle = shade(stone.cut, -0.4); g.fillText(label, 0, px * 0.12);
        g.restore();
        const LX = 0.6, LY = -0.8; // light from the skylight, top right
        l.facets = facets.map(f => {
          let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; f.poly.forEach(q => { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); });
          x0 = Math.floor(x0 - 3); y0 = Math.floor(y0 - 3); x1 = Math.ceil(x1 + 3); y1 = Math.ceil(y1 + 3);
          const c = document.createElement('canvas'); c.width = Math.max(2, Math.ceil((x1 - x0) * dpr)); c.height = Math.max(2, Math.ceil((y1 - y0) * dpr));
          const fg = c.getContext('2d'); fg.setTransform(dpr, 0, 0, dpr, -x0 * dpr, -y0 * dpr);
          polyPath(fg, f.poly, 0, 0); fg.save(); fg.clip(); fg.drawImage(tex, -W2 / 2, -H2 / 2, W2, H2);
          fg.fillStyle = f.tone > 0 ? 'rgba(255,248,235,' + (f.tone * 0.6).toFixed(3) + ')' : 'rgba(10,6,2,' + (-f.tone * 0.75).toFixed(3) + ')'; fg.fillRect(x0, y0, x1 - x0, y1 - y0);
          fg.restore();
          // ridges catch the light, crevices fall into shadow
          const n = f.poly.length;
          for (let i = 0; i < n; i++) {
            const A0 = f.poly[i], B0 = f.poly[(i + 1) % n]; let nx = B0.y - A0.y, ny = -(B0.x - A0.x); const ln = Math.hypot(nx, ny) || 1; nx /= ln; ny /= ln;
            const mx = (A0.x + B0.x) / 2 - f.cx, my = (A0.y + B0.y) / 2 - f.cy; if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
            const d = nx * LX + ny * LY;
            fg.strokeStyle = d > 0.15 ? 'rgba(255,252,240,' + (0.25 + d * 0.4).toFixed(2) + ')' : 'rgba(18,10,4,' + (0.25 + -Math.min(0, d) * 0.4).toFixed(2) + ')';
            fg.lineWidth = d > 0.15 ? 1.4 : 1.7; fg.beginPath(); fg.moveTo(A0.x, A0.y); fg.lineTo(B0.x, B0.y); fg.stroke();
          }
          return Object.assign(f, { c, x0, y0, w: x1 - x0, h: y1 - y0 });
        });
        if (!l.alive || l.alive.length !== l.facets.length) l.alive = l.facets.map(() => true);
        l.bw = bw; l.bh = bh; l.built = 1;
      }
      /* where a boss sits now: centred on its words as they move */
      function lumpPos(s, l) { const ws = l.ids.map(id => s.words.get(id)).filter(Boolean); if (!ws.length) return null; const a = ws[0], b = ws[ws.length - 1]; return { x: (a.x - a.w / 2 + b.x + b.w / 2) / 2, y: (a.y + b.y) / 2 - s.px * 0.36 }; }
      const activeLump = () => { const s = stones[st.si]; return s && s.steps[s.k] ? lumpFor(s, s.k) : null; };
      function nextFacetPt() {
        const s = stones[st.si], l = activeLump(); if (!s || !l || !l.facets) return null;
        const p = lumpPos(s, l); if (!p) return null;
        const i = l.alive.findIndex(a => a); if (i < 0) return null;
        const f = l.facets[i]; return { x: p.x + f.cx, y: p.y + f.cy };
      }

      /* ---------------- 1. chip: tap along the stone, steady ---------------- */
      function judge() {
        const t = now(), dt = st.lastTap ? t - st.lastTap : 0; st.lastTap = t;
        if (!dt || dt > 1700) { st.iv = []; return { kind: 'clean', dt }; }
        if (dt < 230) return { kind: 'rushed', dt };
        const ref = st.iv.length ? st.iv.slice().sort((a, b) => a - b)[Math.floor(st.iv.length / 2)] : dt;
        st.iv.push(dt); if (st.iv.length > 4) st.iv.shift();
        return { kind: Math.abs(dt - ref) / ref <= [0.3, 0.24, 0.2][inten] ? 'clean' : 'uneven', dt };
      }
      function strike(p) {
        if (st.phase !== 'chip') return;
        const s = stones[st.si], l = activeLump(); if (!l || !l.facets) return;
        const lp = lumpPos(s, l); if (!lp) return;
        const j = judge(); st.strikes++;
        if (j.kind === 'clean') { st.clean++; st.streak++; st.best = Math.max(st.best, st.streak); } else st.streak = 0;
        setPips(); st.swingTo = -st.swingTo; st.beat = 1;
        // nearest facet to the finger (forgiving: anywhere on the slab counts toward this boss)
        const alive = l.facets.map((f, i) => (l.alive[i] ? i : -1)).filter(i => i >= 0); if (!alive.length) return;
        const q = p ? { x: p.x - lp.x, y: p.y - lp.y } : { x: l.facets[alive[0]].cx, y: 0 };
        alive.sort((a, b) => Math.hypot(l.facets[a].cx - q.x, l.facets[a].cy - q.y) - Math.hypot(l.facets[b].cx - q.x, l.facets[b].cy - q.y));
        const take = [alive[0]];
        if (j.kind === 'clean' && alive.length > 1) { const n = alive.find(i => Math.abs(i - alive[0]) === 1); if (n != null) take.push(n); }
        const f0 = l.facets[take[0]], hx = lp.x + f0.cx, hy = lp.y + f0.cy;
        st.tool = { x: hx, y: hy, t0: now(), kind: j.kind };
        take.forEach((fi, n) => { l.alive[fi] = false; launch(l.facets[fi], lp, n, j.kind); });
        sStrike(j.kind);
        if (j.kind === 'clean') litho(Math.min(st.streak - 1, SCALE.length - 1), 1); else if (A.ctx) A.tone({ type: 'triangle', freq: 210, to: 160, glide: 0.08, dur: 0.12, vol: 0.06 });
        P.emit('dust', hx, hy, j.kind === 'clean' ? 10 : 5, { colors: [rgba(stone.base, 0.6), rgba(stone.rock, 0.5)], speed: [30, 90] });
        P.emit('spark', hx + 4, hy - 4, j.kind === 'clean' ? 7 : 3, { colors: ['#fff8e0', '#ffe2a0'], speed: [120, 260], angle: -Math.PI / 3, spread: 1.6 });
        if (!K.reduced()) st.shake = j.kind === 'clean' ? 1 : 0.6;
        S.buzz && S.buzz(j.kind === 'clean' ? 10 : 5);
        l.hit = 1;
        if (j.kind === 'clean' && st.streak >= 2) K.pop(st.streak >= 5 ? 'STEADY ×' + st.streak : 'STEADY', { x: clamp(hx + (st.strikes % 2 ? 50 : -50), 70, G.W - 70), y: hy - 52 - (st.strikes % 2) * 18, kind: st.streak >= 4 ? 'great' : 'good' });
        if (j.kind === 'rushed' && !st.rushedTold) { st.rushedTold = true; speak(still, L(LINES.rushed), { mood: 'calm', ms: 2600 }); }
        else if (st.streak === 3 && !st.steadyTold) { st.steadyTold = true; speak(glitch, L(LINES.steady), { mood: 'wow', ms: 2600 }); }
        ctx.track('strike', { c: j.kind.charAt(0) });
        if (!l.alive.some(a => a)) S.later(() => lumpDone(), 160);
      }
      function launch(f, lp, n, kind) {
        const side = f.cx >= 0 ? 1 : -1, big = kind === 'clean';
        debris.push({ t0: now(), c: f.c, w: f.w, h: f.h, ox: f.cx - f.x0, oy: f.cy - f.y0, x: lp.x + f.cx, y: lp.y + f.cy, vx: side * (50 + Math.random() * 130) * (big ? 1.2 : 1) + (n ? side * 30 : 0), vy: -(180 + Math.random() * 220) * (big ? 1.2 : 0.9), rot: 0, vr: (Math.random() - 0.5) * 10, age: 0, rest: 0, bounces: 0 });
        if (debris.length > 36) debris.splice(0, debris.length - 36);
        for (let i = 0; i < (big ? 14 : 8); i++) chips.push({ t0: now(), x: lp.x + f.cx + (Math.random() - 0.5) * f.w * 0.5, y: lp.y + f.cy + (Math.random() - 0.5) * f.h * 0.4, vx: (Math.random() - 0.5) * 420, vy: -120 - Math.random() * 360, s: 1.6 + Math.random() * 3.4, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 18, col: Math.random() < 0.6 ? stone.rock : stone.base, age: 0, life: 1.1 + Math.random() * 1.2, b: 0 });
        if (chips.length > 220) chips.splice(0, chips.length - 220);
      }
      function crumbleWord(s, w) {
        for (let i = 0; i < Math.min(18, w.text.length * 3); i++) chips.push({ t0: now(), x: w.x + (Math.random() - 0.5) * w.w, y: w.y - s.px * 0.35 + (Math.random() - 0.5) * s.px * 0.6, vx: (Math.random() - 0.5) * 160, vy: -40 - Math.random() * 160, s: 1.2 + Math.random() * 2.4, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 14, col: stone.cut, age: 0, life: 1 + Math.random(), b: 0 });
        P.emit('smoke', w.x, w.y - s.px * 0.3, 4, { colors: [rgba(stone.base, 0.35)] });
      }
      function chipGuide(again) {
        if (st.phase !== 'chip') return;
        K.guide({ id: 'chip', g: 'tap', target: () => { const p = nextFacetPt(); return p ? { x: p.x + rootOff.x, y: p.y + rootOff.y } : null; }, label: again ? 'KEEP AN EVEN BEAT' : 'TAP, TAP: STEADY', place: 'below', delay: again ? 200 : 650, ms: 1200 });
      }
      function lumpDone() {
        const s = stones[st.si], stp = s.steps[s.k], l = lumpFor(s, s.k);
        if (st.phase !== 'chip') return;
        K.guide(null);
        l.ids.forEach(id => { const w = s.words.get(id); if (w) { w.st = 'gone'; w.lump = null; } });
        sCrumble(false); K.sfx.good(undefined, 3 + s.k);
        const p = lumpPos(s, l) || { x: G.W / 2, y: G.slab.y + G.slab.h / 2 }; P.emit('smoke', p.x, p.y, 8, { colors: [rgba(stone.base, 0.45)] });
        ctx.track('lump', { k: s.k, kind: stp.hit.kind });
        if (stp.twist && !s.warm) collapse(stp);
        else recarve(stp);
      }

      /* the sentence re-carves itself around the gap */
      function recarve(stp) {
        const s = stones[st.si]; st.phase = 'recarve';
        const nT = WORDS.apply(stp.before, stp.hit.auto);
        setLayout(s, nT, { newState: 'carving', dur: 750 });
        s.T = nT; srSay(nT);
        const lines = s.k === 0 ? LINES.recarve1 : LINES.recarve2;
        S.later(() => speak(still, L(lines, { W: stp.hit.word.toUpperCase(), K: stp.hit.auto.key }), { mood: 'happy', ms: 3200 }), 500);
        waitCarved(s, () => {
          s.k++;
          if (s.k < s.steps.length) { st.phase = 'chip'; S.later(() => { const nx = s.steps[s.k]; if (nx.twist && !s.warm) speak(glitch, L(LINES.lastOne), { mood: 'think', ms: 2600 }); chipGuide(); }, 500); }
          else stoneDone(s);
        });
      }
      function waitCarved(s, then) { const tick = () => { if (S.destroyed) return; let busy = false; s.words.forEach(w => { if (w.st === 'carving' || (w.t0 && now() - w.t0 < w.dur)) busy = true; }); if (busy) S.later(tick, 120); else S.later(then, 350); }; S.later(tick, 200); }
      function stoneDone(s) {
        s.done = true;
        if (st.si < stones.length - 1) { // the warm-up stone slides onto the shelf, the next one slides in
          st.phase = 'slide'; K.sfx.whoosh();
          speak(still, L(LINES.nextStone, { }), { mood: 'calm', ms: 3200 });
          st.slideT = now(); st.slideFrom = st.si;
          S.later(() => { st.si++; setTag(); const n = stones[st.si]; fitStone(n); setLayout(n, n.T, { snap: true }); n.lumps = []; st.phase = 'arrive'; st.arriveT = now(); if (A.ctx) A.noise({ filter: 'lowpass', freq: 300, dur: 0.5, vol: 0.2 }); }, 900);
          S.later(() => { st.phase = 'chip'; speak(glitch, L(n2Line()), { mood: 'scan', ms: 3400 }); chipGuide(); }, 2100);
        } else polishStart();
      }
      const n2Line = () => (stones[st.si].own ? LINES.scanOwn2 : LINES.scanCommon2);

      /* ---------------- 2. the twist: a load-bearing absolute ---------------- */
      function collapse(stp) {
        const s = stones[st.si]; st.phase = 'collapse'; st.slump = 0; st.crackT = now();
        sRumble(); if (!K.reduced()) st.shake = 2.2;
        const rr = K.rng(stp.hit.ids[0] * 7 + 3);
        s.words.forEach(w => { if (w.st === 'cut') { w.rotT = (rr() - 0.5) * 0.16; w.dyT = 3 + rr() * 9; } });
        const gp = lumpPos(s, lumpFor(s, s.k)) || { x: G.slab.x + G.slab.w / 2, y: G.slab.y + G.slab.h / 2 };
        st.cracks = []; for (let i = 0; i < 5; i++) { const pts = [{ x: gp.x, y: gp.y }]; let a = (i / 5) * TAU + rr() * 0.8, x = gp.x, y = gp.y; for (let j = 0; j < 7; j++) { a += (rr() - 0.5) * 0.9; const d = (18 + rr() * 26) * G.u; x += Math.cos(a) * d; y += Math.sin(a) * d; pts.push({ x: clamp(x, G.slab.x + 4, G.slab.x + G.slab.w - 4), y: clamp(y, G.slab.y + 4, G.slab.y + G.slab.h - 4) }); } st.cracks.push(pts); }
        st.broken = new Map(); s.words.forEach((w, id) => { if (w.st === 'cut') st.broken.set(id, { x: w.tx, y: w.ty }); });
        speak(glitch, L(care ? LINES.alarmCare : LINES.alarm), { mood: care ? 'surprised' : 'gasp', ms: 3000 }); glitch.react(care ? 'bounce' : 'shake');
        S.later(() => speak(still, L(stp.hit.load ? (strong ? LINES.explainStrong : LINES.explain) : LINES.explainSoft, { W: stp.hit.word.toUpperCase() }), { mood: 'calm', ms: 5200 }), 2600);
        S.later(() => choose(stp), 3000);
      }
      let opts = [];
      function choose(stp) {
        const s = stones[st.si]; st.phase = 'choose';
        if (!opts.length) {
          const list = stp.hit.fair.slice(0, 2).map(e => ({ e, mirror: false }));
          if (stp.hit.mirror) list.push({ e: stp.hit.mirror, mirror: true });
          const rr = K.rng(K.daily() + stp.hit.ids[0]);
          opts = K.shuffle(list, rr);
          // the mirror never sits first: the eye lands on a fair word
          if (opts[0].mirror && opts.length > 1) opts.push(opts.shift());
          cards.replaceChildren(...opts.map((o, i) => { const b = h('button', { type: 'button', class: 'cz-card', 'data-i': String(i) }, h('span', { text: o.e.key === '—' ? 'LEAVE IT OUT' : o.e.key })); b.addEventListener('click', () => pickOpt(i)); o.el = b; return b; }));
          void s;
        }
        cards.hidden = false; cards.classList.remove('lock'); S.later(() => cards.classList.add('in'), 30);
        cap.textContent = 'CHALK IN A FAIR WORD'; cap.style.opacity = '1';
        K.guide({ id: 'choose', g: 'choose', target: () => opts.filter(o => !o.used).map(o => o.el), label: 'PICK A FAIR WORD', place: 'above', delay: 500 });
      }
      function pickOpt(i) {
        const o = opts[i]; if (!o || o.used || (st.phase !== 'choose' && st.phase !== 'chalk')) return;
        const s = stones[st.si], stp = s.steps[s.k];
        opts.forEach(x => x.el.classList.toggle('on', x === o));
        st.chosen = o; K.sfx.paper(); if (A.ctx) A.noise({ filter: 'bandpass', freq: 2600, to: 5200, q: 1.4, dur: 0.22, vol: 0.06 });
        // the chalk sketch goes onto the stone: kept words straighten and slide, new words appear in chalk
        s.words.forEach(w => { if (w.st === 'chalk') w.st = 'gone'; });
        const nT = WORDS.apply(stp.before, o.e);
        setLayout(s, nT, { newState: 'chalk', dur: 650, unslump: true });
        st.slump = 0; st.unslumpT = now();
        s.pendingT = nT; st.carveBudget = 0;
        st.phase = 'chalk'; cap.textContent = o.mirror ? 'CHALKED' : 'NOW CARVE IT IN';
        ctx.track('pick', { m: o.mirror ? 1 : 0 });
        K.guide({ id: 'carve', g: 'tap', target: () => { const p = carvePt(); return p ? { x: p.x + rootOff.x, y: p.y + rootOff.y } : null; }, label: 'TAP TO CARVE IT IN', place: 'below', delay: 450 });
      }
      function chalkWords(s) { const out = []; s.words.forEach(w => { if (w.st === 'chalk' || w.st === 'chalkCarve') out.push(w); }); return out.sort((a, b) => a.order - b.order); }
      function carvePt() { const s = stones[st.si]; if (!s) return null; const ws = chalkWords(s); const w = ws.find(x => x.rev < 1) || ws[0]; return w ? { x: w.x - w.w / 2 + w.w * clamp(w.rev + 0.08, 0, 1), y: w.y - s.px * 0.35 } : null; }
      function carveTap(p) {
        if (st.phase !== 'chalk' && st.phase !== 'carve') return;
        const s = stones[st.si], ws = chalkWords(s); if (!ws.length) return;
        if (st.phase === 'chalk') { st.phase = 'carve'; cards.classList.add('lock'); }
        if (st.chosen && st.chosen.mirror) { reject(); return; }
        const j = judge(); st.strikes++; if (j.kind === 'clean') { st.clean++; st.streak++; st.best = Math.max(st.best, st.streak); } else st.streak = 0;
        setPips(); st.swingTo = -st.swingTo; st.beat = 1;
        const letters = ws.reduce((a, w) => a + w.text.length, 0), taps = [4, 5, 6][inten];
        st.carveBudget = Math.min(letters, st.carveBudget + Math.ceil(letters / taps) + (j.kind === 'clean' ? 1 : 0));
        const cp = carvePt() || p || { x: G.W / 2, y: G.slab.y + G.slab.h / 2 };
        st.tool = { x: cp.x, y: cp.y, t0: now(), kind: j.kind };
        sStrike(j.kind); if (j.kind === 'clean') litho(Math.min(st.streak - 1, SCALE.length - 1), 0.9);
        P.emit('dust', cp.x, cp.y, 6, { colors: [rgba(stone.base, 0.6)], speed: [20, 70] });
        P.emit('spark', cp.x, cp.y, 4, { colors: ['#fff8e0'], speed: [80, 200], angle: -Math.PI / 3, spread: 1.4 });
        if (!K.reduced()) st.shake = 0.5;
        // distribute the budget over the chalk words in reading order
        let b = st.carveBudget; ws.forEach(w => { const n = w.text.length, take = clamp(b, 0, n); w.revT = take / n; b -= take; if (w.st === 'chalk' && take > 0) w.st = 'chalkCarve'; });
        if (st.carveBudget >= letters) { st.phase = 'carved'; K.guide(null); S.later(() => carvedDone(), 800); }
      }
      function reject() {
        const s = stones[st.si], stp = s.steps[s.k], o = st.chosen;
        st.phase = 'reject'; o.used = true; o.el.classList.remove('on'); o.el.classList.add('used'); o.el.append(h('small', { text: 'same rock' }));
        st.mirrorTried = true; st.chosen = null;
        if (A.ctx) { A.tone({ type: 'square', freq: 180, to: 120, glide: 0.1, dur: 0.16, vol: 0.06, lp: 900 }); A.noise({ filter: 'bandpass', freq: 900, dur: 0.12, vol: 0.2 }); }
        K.sfx.no(); if (!K.reduced()) st.shake = 1.4;
        chalkWords(s).forEach(w => { crumbleWord(s, w); w.st = 'gone'; });
        // back to the broken sentence: kept words slide back (words the chalk had replaced come back) and slump again
        st.broken.forEach((b0, id) => { const w = s.words.get(id); if (!w) return; if (w.st === 'gone') { w.st = 'cut'; w.rev = 1; w.x = w.fx = w.tx = b0.x; w.y = w.fy = w.ty = b0.y; w.t0 = 0; } else { w.fx = w.x; w.fy = w.y; w.tx = b0.x; w.ty = b0.y; w.t0 = now(); w.dur = 600; } });
        void stp;
        st.slump = 1; st.unslumpT = 0;
        speak(glitch, L(care ? LINES.mirrorCare : strong ? LINES.mirrorStrong : LINES.mirror, { K: o.e.key }), { mood: care ? 'think' : 'smug', ms: 3600 }); if (!care) glitch.react('bounce');
        S.later(() => { st.phase = 'choose'; cards.classList.remove('lock'); cap.textContent = 'PICK A FAIR WORD'; K.guide({ id: 'choose2', g: 'choose', target: () => opts.filter(x => !x.used).map(x => x.el), label: 'PICK ANOTHER', place: 'above', delay: 300 }); }, 900);
      }
      function carvedDone() {
        const s = stones[st.si];
        s.words.forEach(w => { if (w.st === 'chalkCarve' || w.st === 'chalk') { w.st = 'cut'; w.rev = 1; } });
        s.T = s.pendingT; srSay(s.T); s.done = true;
        cards.classList.remove('in'); cards.hidden = true; cap.style.opacity = '0';
        K.sfx.great(); if (A.ctx) A.chime(A.note('A5'), { vol: 0.07, dur: 1.8 });
        speak(still, L(LINES.carved), { mood: 'happy', ms: 3000 });
        S.later(() => polishStart(), 1900);
      }

      /* ---------------- 3. polish in circles ---------------- */
      const PG = { gw: 36, gh: 24, a: new Float32Array(36 * 24), dirty: true, comp: true, on: false, last: null, ang: 0, turns: 0, lastA: null };
      function polishStart() {
        st.phase = 'polish'; st.polish = 0; PG.a.fill(0); PG.dirty = true; PG.on = true;
        speak(still, L(LINES.polish), { mood: 'calm', ms: 3400 });
        cap.textContent = 'SHINE · 0%'; cap.style.opacity = '1';
        K.guide({ id: 'polish', g: 'circle', target: () => ({ x: G.field.x + G.field.w * 0.5 + rootOff.x, y: G.field.y + Math.min(58, G.field.w * 0.15) + 8 + rootOff.y }), r: Math.min(58, G.field.w * 0.15), label: 'POLISH IN CIRCLES', place: 'below', delay: 700, ms: 1600 });
      }
      function rubAt(p, dist) {
        const sl = G.field, R = (G.phone ? 56 : 74) * G.u;
        const gx = (p.x - sl.x) / sl.w * PG.gw, gy = (p.y - sl.y) / sl.h * PG.gh, rx = R / sl.w * PG.gw, ry = R / sl.h * PG.gh;
        const add = clamp(dist / (R * 2.2), 0, 0.5);
        for (let y = Math.max(0, Math.floor(gy - ry)); y <= Math.min(PG.gh - 1, Math.ceil(gy + ry)); y++) for (let x = Math.max(0, Math.floor(gx - rx)); x <= Math.min(PG.gw - 1, Math.ceil(gx + rx)); x++) {
          const d = Math.hypot((x + 0.5 - gx) / rx, (y + 0.5 - gy) / ry); if (d > 1) continue;
          const k = y * PG.gw + x; PG.a[k] = Math.min(1, PG.a[k] + add * (1 - d * 0.6));
        }
        PG.dirty = true;
        let sum = 0; for (let i = 0; i < PG.a.length; i++) sum += Math.min(1, PG.a[i] * 1.15); st.polish = sum / PG.a.length;
      }
      function rub(p) {
        if (st.phase !== 'polish') return;
        const last = PG.last; PG.last = p; st.pad = { x: p.x, y: p.y, t: now() };
        if (!last) return;
        const dx = p.x - last.x, dy = p.y - last.y, dist = Math.hypot(dx, dy); if (dist < 0.5) return;
        rubAt(p, dist);
        // circles: the direction of travel turning steadily rings a soft chime each full turn
        const a = Math.atan2(dy, dx); if (PG.lastA != null) { let da = a - PG.lastA; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; PG.ang += Math.abs(da) < 1.2 ? da : 0; if (Math.abs(PG.ang) >= TAU) { PG.ang = 0; PG.turns++; litho(Math.min(SCALE.length - 1, 2 + PG.turns % 6), 0.55); P.emit('star', p.x, p.y, 3, { colors: ['#ffffff', '#fff3c4'], speed: [30, 90] }); if (A.ctx) A.tone({ type: 'sine', freq: 1700, to: 2300, glide: 0.12, dur: 0.16, vol: 0.02 }); } }
        PG.lastA = a; st.rubSpeed = dist;
        const pc = Math.min(100, Math.round(st.polish / [0.6, 0.7, 0.78][inten] * 20) * 5); if (pc !== st.pc) { st.pc = pc; cap.textContent = 'SHINE · ' + pc + '%'; }
        if (Math.random() < 0.25) P.emit('mote', p.x, p.y, 1, { colors: ['#ffffff'], speed: [10, 40] });
        if (st.polish > 0.55 && !st.halfTold) { st.halfTold = true; speak(glitch, L(LINES.polishHalf), { mood: 'love', ms: 2600 }); }
        if (st.polish >= [0.6, 0.7, 0.78][inten]) polishDone();
      }
      function polishDone() {
        if (st.phase !== 'polish') return;
        st.phase = 'polished'; K.guide(null); PG.a.fill(1); PG.dirty = true; st.polish = 1; st.rubbing = false;
        if (rubSnd) rubSnd.level(0.0001, 0.1);
        K.sfx.sparkle(); cap.style.opacity = '0';
        S.later(() => finale(), 500);
      }

      /* ---------------- input ---------------- */
      K.press(touch, {
        down: (p) => {
          if (st.phase === 'chip') strike(p);
          else if (st.phase === 'chalk' || st.phase === 'carve') carveTap(p);
          else if (st.phase === 'polish') { st.rubbing = true; PG.last = p; PG.lastA = null; st.pad = { x: p.x, y: p.y, t: now() }; K.sfx.tap(); }
        },
        move: (p) => { if (st.rubbing) rub(p); },
        up: () => { st.rubbing = false; PG.last = null; st.rubSpeed = 0; if (rubSnd) rubSnd.level(0.0001, 0.12); }
      });
      S.listen(kbd, 'keydown', (e) => {
        if (e.code !== 'Space' && e.code !== 'Enter') return; e.preventDefault();
        if (st.phase === 'chip') { const q = nextFacetPt(); strike(q); }
        else if (st.phase === 'chalk' || st.phase === 'carve') carveTap(null);
        else if (st.phase === 'polish') { for (let i = 0; i < 6; i++) rubAt({ x: G.field.x + Math.random() * G.field.w, y: G.field.y + Math.random() * G.field.h }, 60); if (st.polish >= 0.8) polishDone(); }
      });
      function srSay(T) { sr.textContent = WORDS.join(T); }

      /* ---------------- the world (static parts cached once, light baked in) ---------------- */
      const bgC = document.createElement('canvas'); let bgKey = '';
      const slabC = document.createElement('canvas'), glossC = document.createElement('canvas'), maskC = document.createElement('canvas'), tmpC = document.createElement('canvas'); let slabKey = '';
      maskC.width = PG.gw; maskC.height = PG.gh; const maskG = maskC.getContext('2d'); const maskImg = maskG.createImageData(PG.gw, PG.gh);
      function wallCols() { const br = bright(); return { w0: br ? studio.wallB[0] : studio.wallD[0], w1: br ? studio.wallB[1] : studio.wallD[1], floor: br ? studio.floorB : studio.floorD }; }
      function renderBg() {
        const W = G.W, H = G.H, br = bright(), dpr = Math.min(cv.dpr || 1, 1.5), u = G.u, c = wallCols(), sl = G.slab;
        bgC.width = Math.max(2, Math.round(W * dpr)); bgC.height = Math.max(2, Math.round(H * dpr));
        const g = bgC.getContext('2d', { alpha: false }); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        let gr = g.createLinearGradient(0, 0, 0, G.floor); gr.addColorStop(0, c.w1); gr.addColorStop(1, c.w0); g.fillStyle = gr; g.fillRect(0, 0, W, G.floor);
        // dressed ashlar
        const rr = K.rng(studio.key.length * 97 + 5), bh = 46 * u;
        for (let y = G.floor - bh, row = 0; y > -bh; y -= bh, row++) {
          let x = (row % 2) * 44 * u - 70 * u;
          while (x < W) { const w = (100 + rr() * 80) * u, t = rr(); g.fillStyle = t < 0.5 ? 'rgba(0,0,0,' + (0.03 + rr() * 0.06).toFixed(3) + ')' : 'rgba(255,255,255,' + (0.02 + rr() * 0.05).toFixed(3) + ')'; g.fillRect(x + 2, y + 2, w - 4, bh - 4);
            g.fillStyle = br ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.05)'; g.fillRect(x + 2, y + 2, w - 4, 2); g.fillStyle = br ? 'rgba(90,70,50,.16)' : 'rgba(0,0,0,.32)'; g.fillRect(x + 2, y + bh - 3, w - 4, 2); x += w; }
        }
        // the window, with today's sky
        const wn = G.win, ww = wn.w, wy = wn.y, wh = wn.h, wx = wn.x;
        const arch = (gg) => { gg.beginPath(); gg.moveTo(wx - ww / 2, wy + wh); gg.lineTo(wx - ww / 2, wy + ww / 2); gg.arc(wx, wy + ww / 2, ww / 2, Math.PI, 0); gg.lineTo(wx + ww / 2, wy + wh); gg.closePath(); };
        g.fillStyle = 'rgba(0,0,0,.35)'; g.save(); g.translate(-5 * u, 6 * u); arch(g); g.fill(); g.restore();
        g.save(); arch(g); g.clip();
        gr = g.createLinearGradient(0, wy, 0, wy + wh); const night = studio.night;
        gr.addColorStop(0, night ? (br ? '#8ea2da' : '#16224a') : (br ? '#ffffff' : mix(studio.light, '#ffffff', 0.45))); gr.addColorStop(1, night ? (br ? '#c3cff2' : '#2f4278') : mix(studio.light, br ? '#fff6e0' : '#ffb070', 0.25)); g.fillStyle = gr; g.fillRect(wx - ww, wy, ww * 2, wh);
        if (night) { g.fillStyle = '#ffffff'; for (let i = 0; i < 14; i++) g.fillRect(wx - ww / 2 + rr() * ww, wy + rr() * wh * 0.7, 1.3, 1.3); g.fillStyle = '#f2f4ff'; g.beginPath(); g.arc(wx + ww * 0.14, wy + ww * 0.42, 7 * u, 0, TAU); g.fill(); }
        else { g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(wx - ww * 0.15, wy + wh * 0.62, ww * 0.3, ww * 0.08, 0, 0, TAU); g.fill(); }
        g.restore();
        g.strokeStyle = br ? '#6e5a44' : '#120d09'; g.lineWidth = 6 * u; arch(g); g.stroke();
        g.lineWidth = 3 * u; g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx, wy + wh); g.moveTo(wx - ww / 2, wy + wh * 0.58); g.lineTo(wx + ww / 2, wy + wh * 0.58); g.stroke();
        g.fillStyle = br ? '#8a7258' : '#1c140e'; g.fillRect(wx - ww / 2 - 8 * u, wy + wh - 2, ww + 16 * u, 8 * u);
        if (!G.phone) { // a shelf of plaster casts on the left, chisels in a rack under the window
          const sx0 = 50 * u, sx1 = sl.x - 50 * u, sy = sl.y + 96 * u;
          if (sx1 - sx0 > 120 * u) {
            g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(sx0 + 4, sy + 10 * u, sx1 - sx0, 7 * u);
            g.fillStyle = br ? '#8a6a48' : '#2c1f15'; g.fillRect(sx0, sy, sx1 - sx0, 10 * u);
            const cast = br ? '#fbf7ef' : '#d4cdc0', castD = br ? '#d2cabb' : '#857e72';
            const bx = sx0 + (sx1 - sx0) * 0.3; gr = g.createLinearGradient(bx - 34 * u, 0, bx + 34 * u, 0); gr.addColorStop(0, castD); gr.addColorStop(0.65, cast); gr.addColorStop(1, castD); g.fillStyle = gr;
            g.beginPath(); g.ellipse(bx, sy - 72 * u, 20 * u, 25 * u, 0, 0, TAU); g.fill(); g.fillRect(bx - 8 * u, sy - 52 * u, 16 * u, 14 * u);
            g.beginPath(); g.moveTo(bx - 36 * u, sy); g.quadraticCurveTo(bx - 36 * u, sy - 40 * u, bx, sy - 42 * u); g.quadraticCurveTo(bx + 36 * u, sy - 40 * u, bx + 36 * u, sy); g.closePath(); g.fill();
            const ux = sx0 + (sx1 - sx0) * 0.74; g.beginPath(); g.moveTo(ux - 14 * u, sy); g.quadraticCurveTo(ux - 30 * u, sy - 40 * u, ux - 10 * u, sy - 60 * u); g.lineTo(ux + 10 * u, sy - 60 * u); g.quadraticCurveTo(ux + 30 * u, sy - 40 * u, ux + 14 * u, sy); g.closePath(); g.fill(); g.fillRect(ux - 15 * u, sy - 66 * u, 30 * u, 6 * u);
          }
          const tx0 = sl.x + sl.w + G.sd + 60 * u, ty = wy + wh + 120 * u;
          if (W - tx0 > 120 * u && ty < G.floor - 40 * u) {
            g.fillStyle = br ? '#a07a52' : '#2c1f15'; g.fillRect(tx0, ty, Math.min(200 * u, W - tx0 - 30 * u), 12 * u);
            for (let i = 0; i < 5; i++) { const x = tx0 + 20 * u + i * 34 * u; if (x > W - 40 * u) break; g.fillStyle = br ? '#646a74' : '#22262c'; g.fillRect(x, ty - 70 * u + (i % 2) * 10 * u, 5 * u, 62 * u); g.fillStyle = br ? '#9a6a3c' : '#4a3018'; g.fillRect(x - 2 * u, ty - 92 * u + (i % 2) * 10 * u, 9 * u, 26 * u); }
          }
        }
        // floor and the light pool where the shaft lands
        const fl = G.floor; gr = g.createLinearGradient(0, fl, 0, H); gr.addColorStop(0, c.floor); gr.addColorStop(1, shade(c.floor, br ? -0.16 : -0.5)); g.fillStyle = gr; g.fillRect(0, fl, W, H - fl);
        g.strokeStyle = br ? 'rgba(80,60,40,.16)' : 'rgba(0,0,0,.32)'; g.lineWidth = 1.2; for (let x = -40; x < W + 60; x += 66 * u) { g.beginPath(); g.moveTo(x, fl); g.lineTo(x - 40 * u, H); g.stroke(); }
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, fl - 2, W, 3);
        g.save(); g.globalCompositeOperation = br ? 'source-over' : 'lighter'; paintShaft(g, 0, 0, br ? 0.42 : 0.34, br);
        const pool = g.createRadialGradient(G.shaft.tx, fl + 24 * u, 4, G.shaft.tx, fl + 24 * u, G.shaft.tw * 0.9); pool.addColorStop(0, rgba(studio.light, br ? 0.3 : 0.22)); pool.addColorStop(1, rgba(studio.light, 0)); g.fillStyle = pool; g.beginPath(); g.ellipse(G.shaft.tx, fl + 24 * u, G.shaft.tw * 0.9, 26 * u, 0, 0, TAU); g.fill(); g.restore();
        // the banker: a heavy oak stand the block rests on
        const bx0 = sl.x - 16 * u, bx1 = sl.x + sl.w + G.sd + 16 * u, wood = br ? '#a8794c' : '#5c3b22', woodD = br ? '#7a5434' : '#2e1d10', top = G.bench - 4 * u;
        g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse((bx0 + bx1) / 2 - 10 * u, fl + 8 * u, (bx1 - bx0) * 0.56, 11 * u, 0, 0, TAU); g.fill();
        [[bx0 + 18 * u], [bx1 - 44 * u]].forEach(([x]) => { gr = g.createLinearGradient(x, 0, x + 26 * u, 0); gr.addColorStop(0, woodD); gr.addColorStop(0.5, wood); gr.addColorStop(1, woodD); g.fillStyle = gr; g.fillRect(x, top + 26 * u, 26 * u, fl - top - 22 * u); });
        g.fillStyle = woodD; g.fillRect(bx0 + 30 * u, fl - 30 * u, bx1 - bx0 - 60 * u, 9 * u);
        gr = g.createLinearGradient(0, top, 0, top + 30 * u); gr.addColorStop(0, shade(wood, 0.22)); gr.addColorStop(0.18, shade(wood, 0.08)); gr.addColorStop(0.24, wood); gr.addColorStop(1, woodD); g.fillStyle = gr; g.fillRect(bx0, top, bx1 - bx0, 30 * u);
        g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 1; for (let i = 0; i < 4; i++) { const y = top + 9 * u + i * 5 * u; g.beginPath(); g.moveTo(bx0, y); g.bezierCurveTo((bx0 + bx1) * 0.4, y + 2, (bx0 + bx1) * 0.6, y - 2, bx1, y); g.stroke(); }
        g.fillStyle = br ? 'rgba(255,255,255,.35)' : 'rgba(255,230,200,.12)'; g.fillRect(bx0, top, bx1 - bx0, 1.5);
        // tools at rest on the banker's lip, a bucket of chisels on the floor, marble dust everywhere
        const ty = top + 3 * u, mx = bx1 - 70 * u;
        g.fillStyle = br ? '#7a7f88' : '#3a3e46'; g.fillRect(mx - 34 * u, ty - 3 * u, 46 * u, 3.5 * u); g.fillStyle = br ? '#a07040' : '#5a3a1c'; g.fillRect(mx + 12 * u, ty - 4 * u, 18 * u, 5 * u);
        const kx = G.phone ? W - 46 * u : Math.min(W - 70 * u, bx1 + 70 * u), ky = fl + (G.phone ? 34 : 40) * u;
        if (kx + 26 * u < W) {
          g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(kx, ky + 30 * u, 28 * u, 6 * u, 0, 0, TAU); g.fill();
          for (let i = 0; i < 4; i++) { const x = kx - 12 * u + i * 8 * u; g.fillStyle = br ? '#9aa0aa' : '#4a4f58'; g.fillRect(x, ky - 34 * u - (i % 2) * 8 * u, 3.5 * u, 30 * u); g.fillStyle = br ? '#a87a4a' : '#5c3c1e'; g.fillRect(x - 1.5 * u, ky - 46 * u - (i % 2) * 8 * u, 6.5 * u, 14 * u); }
          gr = g.createLinearGradient(kx - 24 * u, 0, kx + 24 * u, 0); gr.addColorStop(0, br ? '#7a5434' : '#3a2412'); gr.addColorStop(0.5, br ? '#b08458' : '#6a4426'); gr.addColorStop(1, br ? '#6a4628' : '#2e1c0e'); g.fillStyle = gr;
          g.beginPath(); g.moveTo(kx - 24 * u, ky - 6 * u); g.lineTo(kx + 24 * u, ky - 6 * u); g.lineTo(kx + 19 * u, ky + 30 * u); g.lineTo(kx - 19 * u, ky + 30 * u); g.closePath(); g.fill();
          g.strokeStyle = br ? '#5a5f68' : '#1a1c20'; g.lineWidth = 2.5 * u; [ky + 2 * u, ky + 22 * u].forEach(y => { g.beginPath(); g.moveTo(kx - 23 * u, y); g.lineTo(kx + 23 * u, y); g.stroke(); });
        }
        drawGallery(g, br);
        g.fillStyle = rgba(stone.base, br ? 0.55 : 0.2); for (let i = 0; i < 110; i++) { const x = bx0 + rr() * (bx1 - bx0), y = fl + 2 + rr() * 22 * u; g.fillRect(x, y, 1 + rr() * 3, 1 + rr()); }
        const vg = g.createRadialGradient(W / 2, sl.y + sl.h / 2, Math.min(W, H) * 0.25, W / 2, sl.y + sl.h / 2, Math.max(W, H) * 0.85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, br ? 'rgba(80,60,40,.14)' : 'rgba(0,0,0,.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
        bgKey = W + 'x' + H + (br ? 'b' : 'd') + dpr;
      }
      /* the gallery: one small plaque per marble you have carved, waiting slots for the rest */
      function drawGallery(g, br) {
        const u = G.u, W = G.W, y = G.phone ? Math.min(G.H - 128 * u, G.floor + 150 * u) : G.floor + 118 * u;
        if (y - G.floor < 70 * u) return;
        const x0 = G.phone ? 22 * u : Math.max(60, W * 0.5 - 330 * u), x1 = G.phone ? W - 22 * u : Math.min(W - 60, W * 0.5 + 330 * u), n = STONES.length, pw = Math.min(40 * u, (x1 - x0) / n * 0.62), ph = pw * 0.78;
        const wood = br ? '#9a7048' : '#4a2f1a';
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x0 + 6, y + 12 * u, x1 - x0, 8 * u);
        let gr = g.createLinearGradient(0, y, 0, y + 14 * u); gr.addColorStop(0, shade(wood, 0.25)); gr.addColorStop(0.3, wood); gr.addColorStop(1, shade(wood, -0.35)); g.fillStyle = gr; g.fillRect(x0, y, x1 - x0, 14 * u);
        const got = K.collection();
        STONES.forEach((sn, i) => {
          const cx = x0 + (x1 - x0) * (i + 0.5) / n, px0 = cx - pw / 2, py0 = y - ph;
          if (got.includes(sn.name + ' plaque')) {
            gr = g.createLinearGradient(px0, py0, px0 + pw, py0 + ph); gr.addColorStop(0, shade(sn.base, 0.1)); gr.addColorStop(1, sn.base2); g.fillStyle = gr; g.fillRect(px0, py0, pw, ph);
            g.fillStyle = shade(sn.base2, -0.22); g.fillRect(px0 + pw, py0 - 2, 4 * u, ph + 2);
            g.strokeStyle = rgba(sn.vein, 0.5); g.lineWidth = 0.8; g.beginPath(); g.moveTo(px0 + pw * 0.1, py0 + ph * 0.2); g.quadraticCurveTo(px0 + pw * 0.5, py0 + ph * 0.6, px0 + pw * 0.95, py0 + ph * 0.4); g.stroke();
            g.fillStyle = '#d9a83a'; for (let k = 0; k < 2; k++) g.fillRect(px0 + pw * 0.2, py0 + ph * (0.38 + k * 0.24), pw * 0.6, 1.6 * u);
          } else {
            g.strokeStyle = br ? 'rgba(90,70,50,.35)' : 'rgba(255,240,220,.16)'; g.lineWidth = 1.2; g.setLineDash([3, 3]); g.strokeRect(px0, py0, pw, ph); g.setLineDash([]);
          }
        });
        g.fillStyle = br ? 'rgba(70,50,30,.75)' : 'rgba(255,236,206,.5)'; g.font = '400 ' + Math.max(12, Math.round(12 * u)) + 'px ' + ROMAN; g.textAlign = 'center'; g.fillText('GALLERY · ' + Math.min(got.length, n) + '/' + n, (x0 + x1) / 2, y + 30 * u); g.textAlign = 'start';
      }
      /* the block: a moulded frame around a smooth field; marble clouds and veins; a matte skin of dust that polishing lifts */
      function renderSlab() {
        const sl = G.slab, sd = G.sd, br = bright(), dpr = Math.min(cv.dpr || 1, 2), m = 26, up = sd * 0.62, W2 = sl.w + sd + m * 2, H2 = sl.h + up + m * 2, fr = G.frame;
        [slabC, glossC, tmpC].forEach(c => { c.width = Math.ceil(W2 * dpr); c.height = Math.ceil(H2 * dpr); });
        G.slabO = { m, up, W2, H2 };
        const g = slabC.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, m * dpr, (m + up) * dpr);
        // the shadow it throws down-left onto the wall and banker
        g.fillStyle = 'rgba(0,0,0,' + (br ? 0.1 : 0.2) + ')'; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-6 - i * 3, 10 + i * 2); g.lineTo(sl.w - 30, 10 + i * 2); g.lineTo(sl.w - 30, sl.h + 4 + i); g.lineTo(-6 - i * 3, sl.h + 4 + i); g.closePath(); g.fill(); }
        // top and right faces
        g.fillStyle = shade(stone.base, br ? 0.1 : 0.14); g.beginPath(); g.moveTo(0, 0); g.lineTo(sd, -up); g.lineTo(sl.w + sd, -up); g.lineTo(sl.w, 0); g.closePath(); g.fill();
        let gr = g.createLinearGradient(sl.w, 0, sl.w + sd, 0); gr.addColorStop(0, shade(stone.base2, -0.04)); gr.addColorStop(1, shade(stone.base2, -0.2)); g.fillStyle = gr;
        g.beginPath(); g.moveTo(sl.w, 0); g.lineTo(sl.w + sd, -up); g.lineTo(sl.w + sd, sl.h - up); g.lineTo(sl.w, sl.h); g.closePath(); g.fill();
        const face = (gg, gloss) => {
          gg.save(); gg.beginPath(); gg.rect(0, 0, sl.w, sl.h); gg.clip();
          gr = gg.createLinearGradient(sl.w, 0, 0, sl.h); gr.addColorStop(0, shade(stone.base, gloss ? 0.1 : 0.05)); gr.addColorStop(1, shade(stone.base2, gloss ? -0.1 : 0)); gg.fillStyle = gr; gg.fillRect(0, 0, sl.w, sl.h);
          const rr = K.rng(stone.key.length * 131 + 7);
          for (let i = 0; i < 9; i++) { const x = rr() * sl.w, y = rr() * sl.h, r = (60 + rr() * 140) * G.u, cg = gg.createRadialGradient(x, y, 0, x, y, r); cg.addColorStop(0, rgba(stone.vein, gloss ? 0.12 : 0.08)); cg.addColorStop(1, rgba(stone.vein, 0)); gg.fillStyle = cg; gg.fillRect(x - r, y - r, r * 2, r * 2); }
          if (stone.bands) for (let i = 0; i < 16; i++) { const y = rr() * sl.h, hh = 2 + rr() * 9; gg.fillStyle = rgba(stone.vein, 0.08 + rr() * 0.12); gg.fillRect(0, y, sl.w, hh); for (let j = 0; j < 12; j++) { gg.fillStyle = rgba(shade(stone.base2, -0.3), 0.35); gg.beginPath(); gg.ellipse(rr() * sl.w, y + rr() * hh, 1 + rr() * 3, 0.8 + rr() * 1.2, 0, 0, TAU); gg.fill(); } }
          for (let v = 0; v < 6; v++) { // veins wander and branch: a wide soft halo, a mid pass, a fine bright core
            let x = rr() * sl.w, y = rr() < 0.5 ? -12 : rr() * sl.h, a = 0.4 + rr() * 0.8; const pts = [{ x, y }];
            for (let i = 0; i < 16; i++) { a += (rr() - 0.5) * 0.6; x += Math.cos(a) * sl.w * 0.08; y += Math.sin(a) * sl.h * 0.1; pts.push({ x, y }); }
            [[9, 0.035], [3.2, 0.09], [1.1, gloss ? 0.42 : 0.3]].forEach(([lw, al]) => { gg.strokeStyle = rgba(stone.vein, al); gg.lineWidth = lw * (0.7 + v * 0.06); gg.lineCap = 'round'; gg.lineJoin = 'round'; gg.beginPath(); pts.forEach((q, i) => { const mx = i ? (pts[i - 1].x + q.x) / 2 : q.x, my = i ? (pts[i - 1].y + q.y) / 2 : q.y; if (i) gg.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, mx, my); else gg.moveTo(q.x, q.y); }); gg.stroke(); });
            for (let b = 0; b < 2; b++) { const q = pts[3 + Math.floor(rr() * 10)]; gg.strokeStyle = rgba(stone.vein, gloss ? 0.2 : 0.14); gg.lineWidth = 0.8; gg.beginPath(); gg.moveTo(q.x, q.y); gg.quadraticCurveTo(q.x + (rr() - 0.5) * 50, q.y + rr() * 30, q.x + (rr() - 0.5) * 80, q.y + 20 + rr() * 50); gg.stroke(); }
          }
          for (let i = 0; i < sl.w * sl.h / 70; i++) { gg.fillStyle = rr() < 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.08)'; gg.fillRect(rr() * sl.w, rr() * sl.h, 1, 1); }
          // the moulded frame: a raised band, then a crisp groove into the field
          gg.fillStyle = 'rgba(255,255,255,' + (gloss ? 0.06 : 0.04) + ')'; gg.fillRect(0, 0, sl.w, fr); gg.fillRect(sl.w - fr, 0, fr, sl.h);
          gg.fillStyle = 'rgba(0,0,0,.06)'; gg.fillRect(0, sl.h - fr, sl.w, fr); gg.fillRect(0, 0, fr, sl.h);
          gg.strokeStyle = 'rgba(0,0,0,' + (lightStone ? 0.24 : 0.45) + ')'; gg.lineWidth = 1.6; gg.strokeRect(fr - 1, fr - 1, sl.w - fr * 2 + 2, sl.h - fr * 2 + 2);
          gg.strokeStyle = 'rgba(255,255,255,' + (lightStone ? 0.7 : 0.22) + ')'; gg.lineWidth = 1.2; gg.beginPath(); gg.moveTo(fr + 1, sl.h - fr + 1); gg.lineTo(sl.w - fr + 1, sl.h - fr + 1); gg.lineTo(sl.w - fr + 1, fr + 1); gg.stroke();
          // light falling across the face from the window
          gg.save(); gg.globalCompositeOperation = br ? 'source-over' : 'lighter'; paintShaft(gg, -sl.x, -sl.y, (gloss ? 1.3 : 1) * (lightStone ? (br ? 0.2 : 0.16) : (br ? 0.32 : 0.3)), br); gg.restore();
          if (!gloss) { // the unpolished skin: chalky dust, dulled contrast
            gg.fillStyle = 'rgba(255,255,255,' + (lightStone ? 0.08 : 0.13) + ')'; gg.fillRect(fr, fr, sl.w - fr * 2, sl.h - fr * 2);
            for (let i = 0; i < sl.w * sl.h / 40; i++) { gg.fillStyle = 'rgba(255,255,255,' + (0.06 + rr() * 0.12).toFixed(2) + ')'; gg.fillRect(fr + rr() * (sl.w - fr * 2), fr + rr() * (sl.h - fr * 2), 1 + rr() * 1.5, 1); }
          } else { // polished: a long sheen and the window caught in the stone
            gg.save(); gg.globalCompositeOperation = 'lighter';
            const sh = lightStone ? 0.45 : 1;
            gr = gg.createLinearGradient(sl.w * 0.1, 0, sl.w * 0.9, sl.h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.44, rgba(stone.gloss, 0.12 * sh)); gr.addColorStop(0.5, rgba(stone.gloss, 0.26 * sh)); gr.addColorStop(0.56, rgba(stone.gloss, 0.1 * sh)); gr.addColorStop(1, 'rgba(255,255,255,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, sl.w, sl.h);
            gg.fillStyle = rgba(stone.gloss, 0.14 * sh); gg.beginPath(); gg.moveTo(sl.w * 0.7, fr); gg.lineTo(sl.w * 0.8, fr); gg.lineTo(sl.w * 0.6, sl.h - fr); gg.lineTo(sl.w * 0.5, sl.h - fr); gg.closePath(); gg.fill();
            gg.fillStyle = rgba(stone.gloss, 0.5); gg.fillRect(fr, fr, sl.w - fr * 2, 1.2);
            gg.restore();
          }
          gg.restore();
          // bevelled outer edges
          gg.fillStyle = 'rgba(255,255,255,' + (br ? 0.45 : 0.28) + ')'; gg.fillRect(0, 0, sl.w, 2); gg.fillRect(sl.w - 2, 0, 2, sl.h);
          gg.fillStyle = 'rgba(0,0,0,.22)'; gg.fillRect(0, sl.h - 2, sl.w, 2); gg.fillRect(0, 0, 2, sl.h);
        };
        face(g, false);
        const gg = glossC.getContext('2d'); gg.setTransform(dpr, 0, 0, dpr, m * dpr, (m + up) * dpr); face(gg, true);
        slabKey = sl.w + 'x' + sl.h + (br ? 'b' : 'd') + dpr;
        PG.comp = true;
      }
      function drawSlab(g, ox, oy, s) {
        const sl = G.slab, O = G.slabO; if (!O) return;
        g.drawImage(slabC, sl.x - O.m + ox, sl.y - O.m - O.up + oy, O.W2, O.H2);
        const pol = st.phase === 'polish' || st.phase === 'polished' || st.phase === 'finale' || st.phase === 'done';
        if (!pol || s !== main) return;
        if (PG.dirty) { const d = maskImg.data; for (let i = 0; i < PG.a.length; i++) { const v = Math.min(1, PG.a[i] * 1.2); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; d[i * 4 + 3] = Math.round(v * 255); } maskG.putImageData(maskImg, 0, 0); PG.dirty = false; PG.comp = true; }
        if (PG.comp) {
          const tg = tmpC.getContext('2d'), sc = tmpC.width / O.W2, f = G.field;
          tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, tmpC.width, tmpC.height);
          tg.drawImage(maskC, (O.m + f.x - sl.x) * sc, (O.m + O.up + f.y - sl.y) * sc, f.w * sc, f.h * sc);
          tg.globalCompositeOperation = 'source-in'; tg.drawImage(glossC, 0, 0); tg.globalCompositeOperation = 'source-over'; PG.comp = false;
        }
        g.drawImage(tmpC, sl.x - O.m + ox, sl.y - O.m - O.up + oy, O.W2, O.H2);
      }
      function drawMotes(g, t, k) {
        const s0 = G.shaft; if (!s0) return;
        const spr0 = K.glowSprite(bright() ? 'rgba(255,255,255,0.95)' : rgba(studio.light, 0.95));
        const dx = s0.tx - s0.sx, dy = s0.ty - s0.sy, l = Math.hypot(dx, dy) || 1, px = -dy / l, py = dx / l;
        motes.forEach(m => {
          m.k += m.sp * 0.016 * (1 + k * 2); if (m.k > 1) { m.k = 0; m.d = Math.random(); }
          const half = lerp(s0.sw / 2, s0.tw / 2, m.k) * 0.9, off = (m.d - 0.5) * 2 * half + Math.sin(t * 0.6 + m.ph) * 6;
          const x = lerp(s0.sx, s0.tx, m.k) + px * off, y = lerp(s0.sy, s0.ty, m.k) + py * off;
          const a = Math.sin(m.k * Math.PI) * (0.3 + 0.5 * k) * (0.55 + 0.45 * Math.sin(t * 1.7 + m.ph));
          g.globalAlpha = clamp(a, 0, 1); g.drawImage(spr0, x - m.s * 3, y - m.s * 3, m.s * 6, m.s * 6);
        });
        g.globalAlpha = 1;
      }

      /* ---------------- words, bosses, cracks, tools ---------------- */
      function drawWords(g, s, t, ox, oy, dt) {
        const px = s.px, tn = now(), fin = st.leaf;
        let first = null; s.words.forEach(w => { if (w.st === 'carving' && (!first || w.order < first.order)) first = w; });
        const sk = st.unslumpT ? 1 - eBack(clamp((tn - st.unslumpT) / 600, 0, 1)) : st.slump;
        s.words.forEach(w => {
          if (w.st === 'gone' || w.lump) return;
          if (w.t0) { const k = clamp((tn - w.t0) / w.dur, 0, 1), e = eInOut(k); w.x = lerp(w.fx, w.tx, e); w.y = lerp(w.fy, w.ty, e); if (k >= 1) w.t0 = 0; }
          w.rot = (w.rotT || 0) * sk; w.dy = (w.dyT || 0) * sk;
          if (w === first && !w.t0) w.rev = Math.min(1, w.rev + dt * 15 / Math.max(3, w.text.length));
          if (w.st === 'chalkCarve' && w.revT != null && w.rev < w.revT) w.rev = Math.min(w.revT, w.rev + dt * 24 / Math.max(3, w.text.length));
          const x = w.x + ox, y = w.y + w.dy + oy, cut = sprite(w.text, px, fin || 'cut');
          g.save(); g.translate(x, y); if (w.rot) g.rotate(w.rot);
          if (w.st === 'cut') g.drawImage(cut.c, -cut.ox, -cut.oy, cut.w, cut.h);
          else {
            if (w.st !== 'carving') { const ch = sprite(w.text, px, 'chalk'); g.drawImage(ch.c, -ch.ox, -ch.oy, ch.w, ch.h); }
            const r = clamp(w.rev, 0, 1);
            if (r > 0) {
              g.save(); g.beginPath(); g.rect(-cut.ox, -cut.oy, cut.w * r, cut.h); g.clip(); g.drawImage(cut.c, -cut.ox, -cut.oy, cut.w, cut.h); g.restore();
              if (r < 1) { const fx = -cut.ox + cut.w * r, fy = -px * 0.35; g.globalCompositeOperation = 'lighter'; g.drawImage(K.glowSprite('#fff4d0'), fx - 9, fy - 9, 18, 18); g.globalCompositeOperation = 'source-over';
                if (Math.random() < 0.5) { sScritch(); if (Math.random() < 0.4) chips.push({ t0: now(), x: x + fx, y: y + fy, vx: (Math.random() - 0.3) * 120, vy: -60 - Math.random() * 120, s: 1 + Math.random() * 1.6, r: 0, vr: 6, col: stone.base, age: 0, life: 0.8, b: 0 }); } }
            }
            if (w.st === 'carving' && r >= 1) w.st = 'cut';
          }
          g.restore();
        });
      }
      function drawLumps(g, s, t, ox, oy) {
        s.steps.forEach((stp, k) => {
          if (k < s.k) return; const l = lumpFor(s, k);
          if (!l.built) buildLump(s, l);
          if (!l.facets || !l.alive.some(a => a)) return;
          const p = lumpPos(s, l); if (!p) return;
          const active = k === s.k && st.phase === 'chip';
          l.hit = Math.max(0, l.hit - 0.08);
          const x = p.x + ox + (l.hit ? (Math.random() - 0.5) * 2.4 * l.hit : 0), y = p.y + oy;
          const u = G.u, side = shade(mix(stone.rock, '#3a3026', 0.35), bright() ? -0.15 : -0.35);
          g.fillStyle = 'rgba(0,0,0,' + (bright() ? 0.1 : 0.16) + ')';
          l.facets.forEach((f, i) => { if (l.alive[i]) { polyPath(g, f.poly, x - 9 * u, y + 11 * u); g.fill(); polyPath(g, f.poly, x - 6 * u, y + 8 * u); g.fill(); } });
          g.fillStyle = side;
          l.facets.forEach((f, i) => { if (l.alive[i]) { for (let k = 1; k <= 3; k++) { polyPath(g, f.poly, x - k * 1.2 * u, y + k * 1.6 * u); g.fill(); } } });
          l.facets.forEach((f, i) => { if (l.alive[i]) g.drawImage(f.c, x + f.x0, y + f.y0, f.w, f.h); });
          if (active) { const pulse = 0.5 + 0.5 * Math.sin(t * 3.2); g.save(); g.globalCompositeOperation = bright() ? 'source-over' : 'lighter'; g.strokeStyle = 'rgba(255,214,130,' + (0.18 + pulse * 0.3).toFixed(3) + ')'; g.lineWidth = 2.6; g.lineJoin = 'round'; l.facets.forEach((f, i) => { if (l.alive[i]) { polyPath(g, f.poly, x, y); g.stroke(); } }); g.restore(); }
        });
      }
      function drawCracks(g, ox, oy) {
        if (!st.cracks.length) return;
        const k = clamp((now() - st.crackT) / 500, 0, 1), fade = PG.on ? Math.max(0, 1 - st.polish * 1.6) : 1;
        if (fade <= 0) return;
        g.lineCap = 'round'; g.lineJoin = 'round';
        st.cracks.forEach(pts => { const n = Math.max(2, Math.ceil(pts.length * k)); g.strokeStyle = rgba(shade(stone.cut, -0.2), 0.6 * fade); g.lineWidth = 1.7; g.beginPath(); for (let i = 0; i < n; i++) (i ? g.lineTo(pts[i].x + ox, pts[i].y + oy) : g.moveTo(pts[i].x + ox, pts[i].y + oy)); g.stroke(); g.strokeStyle = rgba(stone.lit, 0.4 * fade); g.lineWidth = 0.8; g.beginPath(); for (let i = 0; i < n; i++) (i ? g.lineTo(pts[i].x + ox + 1, pts[i].y + oy + 1) : g.moveTo(pts[i].x + ox + 1, pts[i].y + oy + 1)); g.stroke(); });
      }
      /* the steel chisel and the carver's round mallet, only while striking */
      function drawTool(g) {
        const tl = st.tool; if (!tl) return;
        const age = (now() - tl.t0) / 1000; if (age > 0.75) { st.tool = null; return; }
        const fade = age < 0.55 ? 1 : 1 - (age - 0.55) / 0.2, a = -2.3, u = G.u, L0 = 76 * u;
        g.save(); g.globalAlpha = fade; g.translate(tl.x, tl.y); g.rotate(a + Math.PI);
        let gr = g.createLinearGradient(0, -5 * u, 0, 5 * u); gr.addColorStop(0, '#eef1f5'); gr.addColorStop(0.5, '#8d96a3'); gr.addColorStop(1, '#454c58'); g.fillStyle = gr;
        g.beginPath(); g.moveTo(0, -1.2 * u); g.lineTo(13 * u, -4.2 * u); g.lineTo(L0, -4.2 * u); g.lineTo(L0, 4.2 * u); g.lineTo(13 * u, 4.2 * u); g.lineTo(0, 1.2 * u); g.closePath(); g.fill();
        g.fillStyle = '#353b44'; g.fillRect(L0 - 2 * u, -5.8 * u, 11 * u, 11.6 * u); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(13 * u, -3.6 * u, L0 - 15 * u, 1.2 * u);
        const sw = age < 0.07 ? 1 - age / 0.07 : Math.min(0.55, (age - 0.07) * 2.2);
        g.translate(L0 + 9 * u, 0); g.rotate(-0.9 * sw); g.translate(15 * u, 0);
        gr = g.createLinearGradient(0, -17 * u, 0, 17 * u); gr.addColorStop(0, '#d29e64'); gr.addColorStop(0.5, '#9a6a3c'); gr.addColorStop(1, '#5a381c'); g.fillStyle = gr;
        g.beginPath(); g.ellipse(0, 0, 13 * u, 17 * u, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(60,30,10,.35)'; g.lineWidth = 1; for (let i = -1; i <= 1; i++) { g.beginPath(); g.ellipse(0, i * 5 * u, 12 * u, 2.5 * u, 0, 0, Math.PI); g.stroke(); }
        g.fillStyle = '#6a4424'; g.fillRect(11 * u, -3 * u, 48 * u, 6 * u);
        g.restore();
        if (age < 0.06) { g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(K.glowSprite('#fff4cc'), tl.x - 24, tl.y - 24, 48, 48); g.restore(); }
      }
      /* a wooden metronome that swings at YOUR tempo: steady strikes make it glow */
      function drawMetronome(g) {
        if ((G.phone && !cards.hidden) || st.phase === 'finale' || st.phase === 'done') return;
        const u = G.u, x = G.phone ? 40 * u : Math.max(80 * u, G.slab.x - 90 * u), y = G.floor + (G.phone ? 46 : 44) * u, br = bright();
        st.swing += (st.swingTo * 0.4 - st.swing) * 0.2; st.beat = Math.max(0, st.beat - 0.04);
        const body = br ? '#8a5a34' : '#56331a';
        g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x + 3, y + 2, 25 * u, 5 * u, 0, 0, TAU); g.fill();
        let gr = g.createLinearGradient(x - 22 * u, 0, x + 22 * u, 0); gr.addColorStop(0, shade(body, -0.3)); gr.addColorStop(0.55, shade(body, 0.25)); gr.addColorStop(1, shade(body, -0.35)); g.fillStyle = gr;
        g.beginPath(); g.moveTo(x - 22 * u, y); g.lineTo(x - 9 * u, y - 66 * u); g.lineTo(x + 9 * u, y - 66 * u); g.lineTo(x + 22 * u, y); g.closePath(); g.fill();
        g.fillStyle = br ? '#f4e6c8' : '#dccaa6'; g.beginPath(); g.moveTo(x - 9 * u, y - 14 * u); g.lineTo(x - 5 * u, y - 58 * u); g.lineTo(x + 5 * u, y - 58 * u); g.lineTo(x + 9 * u, y - 14 * u); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(90,60,30,.6)'; g.lineWidth = 1; for (let i = 0; i < 7; i++) { const yy = y - 20 * u - i * 5.5 * u; g.beginPath(); g.moveTo(x - 3 * u, yy); g.lineTo(x + 3 * u, yy); g.stroke(); }
        const piv = { x, y: y - 12 * u }, a = -Math.PI / 2 + st.swing, len = 60 * u, tx = piv.x + Math.cos(a) * len, ty = piv.y + Math.sin(a) * len;
        g.strokeStyle = br ? '#7d838c' : '#c9ccd2'; g.lineWidth = 2 * u; g.beginPath(); g.moveTo(piv.x, piv.y); g.lineTo(tx, ty); g.stroke();
        const wx = piv.x + Math.cos(a) * len * 0.62, wy = piv.y + Math.sin(a) * len * 0.62, lit = st.streak >= 2;
        const glow = lit ? 0.45 + st.beat * 0.55 : st.beat * 0.35;
        if (glow > 0.02) { g.save(); g.globalCompositeOperation = br ? 'source-over' : 'lighter'; g.globalAlpha = glow; g.drawImage(K.glowSprite('#ffd36b'), wx - 16 * u, wy - 16 * u, 32 * u, 32 * u); g.restore(); }
        g.save(); g.translate(wx, wy); g.rotate(a + Math.PI / 2); gr = g.createLinearGradient(-6 * u, 0, 6 * u, 0); gr.addColorStop(0, lit ? '#b8860b' : '#7c7f86'); gr.addColorStop(0.5, lit ? '#ffe08a' : '#d8dbe0'); gr.addColorStop(1, lit ? '#a87a10' : '#6c7078'); g.fillStyle = gr;
        g.beginPath(); g.moveTo(-6 * u, -4 * u); g.lineTo(6 * u, -4 * u); g.lineTo(4.5 * u, 5 * u); g.lineTo(-4.5 * u, 5 * u); g.closePath(); g.fill(); g.restore();
        g.fillStyle = shade(body, -0.4); g.fillRect(x - 24 * u, y - 4 * u, 48 * u, 5 * u);
      }
      function drawPad(g) {
        const p = st.pad; if (!p || st.phase !== 'polish' || now() - p.t > 900) return;
        const u = G.u, r = (G.phone ? 30 : 40) * u, k = st.rubbing ? 1 : clamp(1 - (now() - p.t) / 900, 0, 1);
        g.save(); g.globalAlpha = k; g.translate(p.x, p.y);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(-4, 8, r, r * 0.8, 0, 0, TAU); g.fill();
        const gr = g.createRadialGradient(r * 0.3, -r * 0.3, 2, 0, 0, r); gr.addColorStop(0, '#fbf6ec'); gr.addColorStop(0.7, '#ddd0b8'); gr.addColorStop(1, '#a8987c'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(120,100,70,.45)'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, 0, r * (0.35 + i * 0.2), PG.ang + i, PG.ang + i + 2.4); g.stroke(); }
        g.fillStyle = '#7a5a3a'; g.beginPath(); g.arc(0, 0, r * 0.18, 0, TAU); g.fill();
        g.restore();
      }
      function stepDebris(g, dt) {
        const benchY = G.bench + 3 * G.u, bx0 = G.slab.x - 16 * G.u, bx1 = G.slab.x + G.slab.w + G.sd + 16 * G.u, floorAt = (x) => (x > bx0 && x < bx1 ? benchY : G.floor + 14 * G.u);
        for (let i = debris.length - 1; i >= 0; i--) {
          const d = debris[i]; d.age += dt;
          const floorY = d.under ? G.floor + 14 * G.u : floorAt(d.x);
          if (!d.rest) { d.vy += 1300 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt; if (floorY > benchY && d.y > benchY) d.under = true; if (d.y > floorY && d.vy > 0) { d.y = floorY; d.vy *= -0.3; d.vx *= 0.62; d.vr *= 0.55; d.bounces++; if (d.bounces === 1 && A.ctx && Math.random() < 0.7) A.noise({ filter: 'bandpass', freq: 1400 + Math.random() * 1400, q: 2, dur: 0.03, vol: 0.05 }); if (d.bounces > 2 || Math.abs(d.vy) < 40) d.rest = 1; } }
          const life = d.t0 ? (now() - d.t0) / 1000 : d.age, fade = life > 2.4 ? 1 - (life - 2.4) / 0.6 : 1; if (fade <= 0 || d.x < -80 || d.x > G.W + 80) { debris.splice(i, 1); continue; }
          g.save(); g.globalAlpha = fade; g.translate(d.x, d.y); g.rotate(d.rot); g.drawImage(d.c, -d.ox, -d.oy, d.w, d.h); g.restore();
        }
        g.globalAlpha = 1;
        for (let i = chips.length - 1; i >= 0; i--) {
          const c = chips[i]; c.age = c.t0 ? (now() - c.t0) / 1000 : c.age + dt; if (c.age > c.life) { chips.splice(i, 1); continue; }
          const fy = floorAt(c.x); c.vy += 1100 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.vr * dt; if (c.y > fy && c.vy > 0 && !c.b && (fy === benchY ? c.y < benchY + 30 : true)) { c.y = fy; c.vy *= -0.35; c.vx *= 0.6; c.b = 1; }
          g.globalAlpha = clamp((c.life - c.age) / 0.4, 0, 1); g.fillStyle = c.col; g.save(); g.translate(c.x, c.y); g.rotate(c.r); g.beginPath(); g.moveTo(-c.s, -c.s * 0.4); g.lineTo(c.s * 0.8, -c.s * 0.6); g.lineTo(c.s * 0.2, c.s * 0.7); g.closePath(); g.fill(); g.restore();
        }
        g.globalAlpha = 1;
      }

      /* ---------------- finale: the gleaming plaque under the skylight ---------------- */
      let finEl = null;
      function placeFin() {
        const box = finEl; if (!box) return;
        const ph = G.phone, W = G.W, H = G.H, lim = H - (ph ? 108 : 124);
        const top0 = Math.round(G.bench + (ph ? 16 : 26) * G.u), wd = ph ? W - 32 : Math.round(Math.min(600, W * 0.5));
        Object.assign(box.style, { left: Math.round((W - wd) / 2) + 'px', width: wd + 'px', top: top0 + 'px' });
        box.classList.remove('tight'); const fairEl = box.querySelector('.cz-fair'); if (fairEl) fairEl.style.display = '';
        if (top0 + box.offsetHeight <= lim) return;
        if (fairEl) { fairEl.style.display = 'none'; if (top0 + box.offsetHeight <= lim) return; }
        box.classList.add('tight');
      }
      function finale() {
        st.phase = 'finale'; st.finT = now(); K.guide(null); hud.classList.add('out'); cards.hidden = true; cap.style.opacity = '0';
        const ratio = st.strikes ? st.clean / st.strikes : 0.7, tier = K.tier(ratio, [0.45, 0.65, 0.82]);
        st.tier = tier; st.ratio = ratio; st.leaf = tier || null;
        st.item = stone.name + ' plaque'; st.col = K.collect(st.item); bgKey = '';
        if (A.ctx) { A.pad(['D3', 'A3', 'D4', 'F#4', 'A4'].map(n => A.note(n)), { dur: 6, vol: 0.13, attack: 0.9, bus: 'music' }); for (let i = 0; i < 7; i++) S.later(() => litho([5, 7, 8, 9, 7, 8, 10][i], 0.7), 300 + i * 190); }
        glitch.hush(); still.say(L(LINES.fin), { mood: 'happy', ms: 0 }); still.react('bounce'); glitch.base('love');
        // the leaf goes in: gold dust lifts off every letter, one word after another
        let wi = 0; main.words.forEach(w => { if (w.st !== 'cut') return; const k = wi++; S.later(() => { P.emit('star', w.x, w.y - main.px * 0.35, Math.min(10, 3 + w.text.length), { colors: tier === 'Silver' ? ['#ffffff', '#dfe6f0'] : ['#fff6d6', '#ffd98a'], speed: [20, 90], spread: TAU }); P.emit('mote', w.x, w.y - main.px * 0.4, 3, { colors: ['#ffe9b0'] }); }, 200 + k * 140); });
        S.later(() => { still.hush(); glitch.say(L(LINES.finG), { mood: 'celebrate', ms: 0 }); }, 3400);
        const before = WORDS.join(main.T0), after = WORDS.join(main.T);
        const fair = an.source === 'ai' && an.balanced && main.own ? an.balanced : '';
        const leafName = tier ? tier + ' leaf' : 'Plain cut';
        const box = h('div', { class: 'cz-fin', role: 'status' },
          h('div', { class: 'cz-fin-h', text: 'Set in stone, fair and true' }),
          h('div', { class: 'cz-was' }, h('small', { text: main.own ? 'IT WAS' : 'IT WAS (A COMMON ONE)' }), h('s', { class: 'gk-user', text: before })),
          fair ? h('div', { class: 'cz-fair' }, h('small', { text: 'THE FAIR VERSION' }), h('span', { class: 'gk-user', text: fair })) : null,
          care ? h('div', { class: 'cz-care', text: S.safety ? S.safety.CARE_LINE : 'For the practical side, someone qualified can tell you where you stand.' }) : null,
          h('div', { class: 'cz-foot' }, h('span', { text: leafName + ' on ' + stone.name + ' · plaque ' + Math.min(st.col.count, STONES.length) + '/' + STONES.length }), h('span', { text: 'Next studio: ' + nextStudio.name })));
        el.append(box); finEl = box; placeFin();
        sr.textContent = 'Now carved: ' + after;
        S.later(async () => {
          const sl = G.slab;
          await K.finale('stars', { from: [{ x: sl.x + sl.w / 2, y: sl.y + sl.h / 2 }], colors: tier === 'Silver' ? ['#ffffff', '#dfe6f0'] : ['#fff6d6', '#ffd98a', '#ffffff'], chord: ['D4', 'F#4', 'A4', 'D5'], ms: 3600 });
          finishGame(after);
        }, 1600);
      }
      function finishGame(after) {
        if (st.finished) return; st.finished = true;
        const pct = Math.round(st.ratio * 100), best = K.best('steady', st.best, 'higher'), badges = [];
        if (best.isNew) badges.push('New best: ' + st.best + ' steady strikes in a row'); else if (best.first && st.best >= 3) badges.push('Steady run: ' + st.best);
        if (st.tier) badges.push(st.tier + ' leaf');
        if (st.col.isNew) badges.push('Collected: ' + stone.name + ' plaque (' + Math.min(st.col.count, STONES.length) + '/' + STONES.length + ')');
        ctx.track('done', { steady: pct, strikes: st.strikes, abs: absCount, mirror: st.mirrorTried ? 1 : 0 });
        ctx.finish({ title: 'Chiselled fair', mood: 'happy', lines: [(main.own ? 'Now carved: ' : 'Carved (a common one): ') + after, absCount + ' absolute' + (absCount === 1 ? '' : 's') + ' knocked off', 'Steady strikes: ' + pct + '%'],
          share: 'Chiselled the “always” out of a thought. It’s a statue now.', badges: badges.slice(0, 4) });
      }

      /* ---------------- render loop: one opaque canvas; idle scenes drop to 24 fps ---------------- */
      let lastDraw = -1, dtAcc = 0;
      const busy = () => debris.length || chips.length || P.count() || st.tool || st.shake > 0 || st.rubbing || ['collapse', 'slide', 'arrive', 'recarve', 'finale', 'carved', 'reject'].includes(st.phase) || st.beat > 0.02 || Math.abs(st.swing - st.swingTo * 0.4) > 0.01;
      K.loop((dt0, t) => {
        const g = cv.g; if (!g || !G.W) return;
        dtAcc += dt0;
        const minGap = SOFT ? (busy() ? 0.03 : 0.05) : (busy() ? 0 : 0.04);
        if (t - lastDraw < minGap) return;
        const dt = Math.min(0.06, dtAcc); dtAcc = 0; lastDraw = t;
        if (!bgKey || bgKey !== G.W + 'x' + G.H + (bright() ? 'b' : 'd') + Math.min(cv.dpr || 1, 1.5)) renderBg();
        if (!slabKey) renderSlab();
        const d = cv.dpr || 1;
        st.shake = Math.max(0, st.shake - dt * 7);
        const sx = st.shake ? (Math.random() - 0.5) * 3 * st.shake : 0, sy = st.shake ? (Math.random() - 0.5) * 2.4 * st.shake : 0;
        if (st.phase === 'collapse') st.slump = Math.min(1, st.slump + dt * 2.5);
        g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(bgC, 0, 0, G.W * d, G.H * d);
        g.setTransform(d, 0, 0, d, 0, 0);
        const fk = st.phase === 'finale' || st.phase === 'done' ? clamp((now() - st.finT) / 1400, 0, 1) : 0;
        drawMetronome(g);
        let ox = sx, oy = sy;
        const s = stones[st.si];
        if (st.phase === 'slide') { const k = clamp((now() - st.slideT) / 900, 0, 1); ox += -eInOut(k) * (G.W * 0.95); }
        if (st.phase === 'arrive') { const k = clamp((now() - st.arriveT) / 1100, 0, 1); ox += (1 - eOut(k)) * G.W * 0.95; if (k >= 1) st.phase = 'settled'; }
        drawSlab(g, ox, oy, s);
        drawCracks(g, ox, oy);
        drawWords(g, s, t, ox, oy, dt);
        drawLumps(g, s, t, ox, oy);
        if (fk) { g.save(); g.globalCompositeOperation = bright() ? 'source-over' : 'lighter'; paintShaft(g, 0, 0, (bright() ? 0.16 : 0.22) * fk, bright()); g.restore(); }
        if (fk) { // the finale sheen sweeps across the polished face and its leafed letters
          const f = G.field, k2 = ((now() - st.finT) / 2600) % 1.6 - 0.3;
          if (k2 > 0 && k2 < 1) { g.save(); g.beginPath(); g.rect(f.x + ox, f.y + oy, f.w, f.h); g.clip(); g.globalCompositeOperation = bright() ? 'source-over' : 'lighter'; const xx = f.x + f.w * k2 + ox; const gr = g.createLinearGradient(xx - 60, 0, xx + 60, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,250,235,' + (bright() ? 0.32 : 0.22) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.translate(xx, f.y + f.h / 2 + oy); g.rotate(0.35); g.fillRect(-60, -f.h, 120, f.h * 2); g.restore(); }
        }
        stepDebris(g, dt);
        drawTool(g);
        drawPad(g);
        P.update(dt); P.draw(g);
        g.save(); g.globalCompositeOperation = bright() ? 'source-over' : 'lighter'; drawMotes(g, t, fk); g.restore();
        if (rubSnd && A.ctx && st.phase === 'polish') rubSnd.level(st.rubbing ? clamp((st.rubSpeed || 0) / 30, 0, 1) * 0.12 + 0.0001 : 0.0001, 0.08);
        if (waves && A.ctx) waves.level(0.05 + 0.04 * Math.sin(t * 0.45), 0.4);
      });

      /* ---------------- lines (three vibes each) ---------------- */
      const firstAbs = stones[0].steps[0] ? stones[0].steps[0].hit.word.toUpperCase() : 'ALWAYS';
      const LINES = {
        scanOwn: { Jolly: 'Scanning your words… ' + absCount + ' absolute' + (absCount === 1 ? '' : 's') + '! See how “' + firstAbs + '” sticks out of the stone?', Cheeky: '“' + firstAbs + '”. Big, rough, and bossy. Let’s knock it off.', Unfiltered: absCount + ' absolute' + (absCount === 1 ? '' : 's') + '. Rough rock. Chip it off.' },
        scanWarm: { Jolly: noWords ? 'Here’s a classic thought. See the rough bits sticking out? Absolutes.' : 'First, a warm-up stone. A classic. See “' + firstAbs + '” sticking out?', Cheeky: noWords ? 'A classic, sculpted by a million brains. Spot the lumps.' : 'Warm-up stone first. Spot the lump.', Unfiltered: noWords ? 'A common thought. Absolutes stick out.' : 'Warm-up first.' },
        scanOwn2: { Jolly: 'Now your stone. Same steady taps.', Cheeky: 'Your words this time. Feel that tempo again.', Unfiltered: 'Your stone. Steady.' },
        scanCommon2: { Jolly: 'And another classic. This one’s sneakier.', Cheeky: 'Second classic. This one bites back.', Unfiltered: 'Another one. Trickier.' },
        how: { Jolly: 'Tap along it like a heartbeat. Steady strikes ring, and take bigger chips.', Cheeky: 'Tap like a heartbeat, not a woodpecker. The steady ones sing.', Unfiltered: 'Even taps. The stone rings when you’re steady.' },
        rushed: { Jolly: 'Slower. The stone likes an even beat, not a fast one.', Cheeky: 'Easy, woodpecker. Even beats.', Unfiltered: 'Slower. Even.' },
        steady: { Jolly: 'Hear that? The stone sings when you’re steady!', Cheeky: 'Ooh, it’s playing a tune. Show-off.', Unfiltered: 'Steady. It rings.' },
        recarve1: { Jolly: '“{W}” is gone. The stone re-carved itself: “{K}”. Truer, and calmer.', Cheeky: 'Bye, “{W}”. “{K}” fits the facts better.', Unfiltered: '“{W}” out. “{K}” in. Truer.' },
        recarve2: { Jolly: 'Another one off. Read it now: it’s getting truer.', Cheeky: 'Look at that. Less shouty already.', Unfiltered: 'Off. Truer.' },
        lastOne: { Jolly: 'Hmm. That last lump looks… structural.', Cheeky: 'I have a bad feeling about that last rock.', Unfiltered: 'That last one is holding something up.' },
        nextStone: { Jolly: 'Lovely. That one goes on the shelf.', Cheeky: 'Warm-up done. You have a rhythm now.', Unfiltered: 'Done. Next stone.' },
        alarm: { Jolly: 'Uh-oh! That word was holding the whole sentence up!', Cheeky: 'Structural failure! That one was load-bearing.', Unfiltered: 'Collapse. That word was load-bearing.' },
        alarmCare: { Jolly: 'Careful. That word was holding the sentence up.', Cheeky: 'That one was holding the meaning up.', Unfiltered: 'That word was load-bearing.' },
        explain: { Jolly: 'Some absolutes hold the meaning up. We don’t leave a hole: we carve in a fair word.', Cheeky: 'A hole isn’t the answer either. Pick a fair word to carve in.', Unfiltered: 'Load-bearing. Replace it with a fair word.' },
        explainStrong: { Jolly: 'Some of this worry has real weight. Fair doesn’t mean rosy; it means true-sized.', Cheeky: 'This one’s partly real. Fair means true-sized, not sugar-coated.', Unfiltered: 'Part of it is real. Make it true-sized, not rosy.' },
        explainSoft: { Jolly: 'Without “{W}” it still sounds like a verdict. It needs a fair word in its place.', Cheeky: 'Knock out “{W}” and it’s still bossing you. Fair word, please.', Unfiltered: 'Still a verdict. Carve in a fair word.' },
        mirror: { Jolly: 'Ha! “{K}” is an absolute too, just the other way up.', Cheeky: 'Nice try. Same rock, other side.', Unfiltered: 'Also absolute. Pick another.' },
        mirrorStrong: { Jolly: 'That one swings too far the other way. Some of this is real.', Cheeky: 'Too rosy. The facts won’t back that either.', Unfiltered: 'Opposite absolute. Too rosy.' },
        mirrorCare: { Jolly: 'That would be a promise the facts can’t make. Pick another.', Cheeky: 'Can’t promise that one. Pick a fair one.', Unfiltered: 'Not a promise we can carve. Another.' },
        carved: { Jolly: 'That’s a sentence you can stand on.', Cheeky: 'Solid. No wobble.', Unfiltered: 'Solid.' },
        polish: { Jolly: 'Now polish. Slow circles bring the shine out.', Cheeky: 'Wax on. Slow circles.', Unfiltered: 'Polish. Slow circles.' },
        polishHalf: { Jolly: 'I can see my face in it! Well, my glitches.', Cheeky: 'Shiny. I look great in marble.', Unfiltered: 'Shiny.' },
        fin: { Jolly: 'Truer, and calmer. That’s the whole craft.', Cheeky: 'Look at that. Fewer rocks, more truth.', Unfiltered: 'True-sized. Done.' },
        finG: { Jolly: 'Scan complete: zero absolutes. Gorgeous.', Cheeky: 'I’d hang that in a museum. A small one.', Unfiltered: 'Zero absolutes.' }
      };

      /* ---------------- start ---------------- */
      cv.onResize(() => layout());
      setTag(); setPips(); srSay(stones[0].T);
      (async () => {
        await K.intro({ title: 'Chisel', sub: 'Absolutes stick out of a thought like rough stone. Knock them off and see what’s left.', how: 'Tap along the stone in a steady rhythm. Then polish in circles.', char: 'still', mood: 'determined' });
        try { const rt = (S.parent && S.parent.root) || el, a = el.getBoundingClientRect(), b = rt.getBoundingClientRect(), sc0 = rt.offsetWidth ? b.width / rt.offsetWidth : 1; rootOff.x = (a.left - b.left) / sc0; rootOff.y = (a.top - b.top) / sc0; } catch (e) { /* stage at the root origin */ }
        layout();
        padOn = true; S.later(padNext, 400);
        speak(glitch, L(stones[0].own ? LINES.scanOwn : LINES.scanWarm), { mood: 'scan', ms: 3800 });
        S.later(() => speak(still, L(LINES.how), { mood: 'determined', ms: 4200 }), 3600);
        st.phase = 'chip'; chipGuide();
        try { if (document.fonts && document.fonts.load) document.fonts.load('400 30px "Marcellus SC"').then(() => { if (S.destroyed) return; spr.clear(); stones.forEach(s => { s.px = 0; s.lumps.forEach(l => { l.built = 0; }); }); const s = stones[st.si]; if (s && st.phase === 'chip') { fitStone(s); setLayout(s, s.T, { snap: true }); } }, () => {}); } catch (e) { /* fonts API missing */ }
      })();

      return {
        async autoplay() {
          const wait = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(80); };
          const steadyTap = async (pt) => { await K.sim.tap(touch, pt.x, pt.y); await K.wait(430); };
          for (let guard = 0; guard < 400 && !st.finished; guard++) {
            await wait(() => ['chip', 'choose', 'chalk', 'carve', 'polish', 'finale', 'done'].includes(st.phase) || st.finished, 20000);
            if (st.finished || st.phase === 'finale' || st.phase === 'done') break;
            if (st.phase === 'chip') { const p = nextFacetPt(); if (p) await steadyTap(p); else await K.wait(120); continue; }
            if (st.phase === 'choose') { await K.wait(900); const free = opts.filter(o => !o.used); const o = (!st.mirrorTried && free.find(x => x.mirror)) || free.find(x => !x.mirror) || free[0]; if (o) { await K.sim.tap(o.el); await K.wait(700); } continue; }
            if (st.phase === 'chalk' || st.phase === 'carve') { const p = carvePt(); if (p) await steadyTap(p); else await K.wait(120); continue; }
            if (st.phase === 'polish') {
              await K.wait(500);
              const f = G.field, r = 48 * G.u, adv = 18 * G.u, rows = 3, ptr = await K.sim.press(touch, f.x + r, f.y + f.h / (rows * 2));
              let i = 0;
              for (let pass = 0; pass < 4 && st.phase === 'polish'; pass++) for (let row = 0; row < rows && st.phase === 'polish'; row++) {
                const cy = f.y + f.h * (row + 0.5) / rows, dir = (row + pass) % 2 ? -1 : 1;
                for (let cx = dir > 0 ? f.x + r : f.x + f.w - r; (dir > 0 ? cx <= f.x + f.w - r : cx >= f.x + r) && st.phase === 'polish'; cx += dir * adv) { i++; ptr.move(cx + Math.cos(i * 0.8) * r, cy + Math.sin(i * 0.8) * r * 0.8); await K.wait(22); }
              }
              ptr.up(f.x + f.w / 2, f.y + f.h / 2); continue;
            }
          }
          await wait(() => st.finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
