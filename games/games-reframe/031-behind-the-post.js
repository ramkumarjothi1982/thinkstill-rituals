/* 031 Behind the Post — Reframe · REFRAME · Identity / Self
 * Mechanism: correcting upward social comparison (Festinger 1954; social-media comparison research, e.g. Chou & Edge 2012,
 * Vogel et al. 2014): we compare our own behind-the-scenes with other people's highlight reels, and judge ourselves
 * unfairly. Turning each flawless post over shows the hidden effort, the 47 attempts and the mess just out of shot
 * (funny and kind); then the player's own messy day is turned the other way to find its true small highlights, so both
 * sides are finally compared like with like.
 * Verb: flip (drag a post sideways to turn it over in 3D; flick it to spin it). Twist: your post arrives outtake side up.
 * Finale: the real feed: every post shown front and back side by side, glowing, and your post gets kind comments.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const PENTA = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6'];
  function rngOf(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const n1 = (v) => Math.round(v * 10) / 10;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lg = (id, stops, x2, y2) => '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (x2 == null ? 0 : x2) + '" y2="' + (y2 == null ? 1 : y2) + '">' + stops.map((c, i) => '<stop offset="' + (i / Math.max(1, stops.length - 1)).toFixed(2) + '" stop-color="' + c + '"/>').join('') + '</linearGradient>';
  const rg = (id, a, b, cx, cy, r) => '<radialGradient id="' + id + '" cx="' + (cx ?? 0.5) + '" cy="' + (cy ?? 0.5) + '" r="' + (r ?? 0.6) + '"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></radialGradient>';
  const HAND = '"Gochi Hand", "Comic Sans MS", "Chalkboard SE", "Marker Felt", "Segoe Print", cursive';
  const MARK = 'font-family=\'' + HAND.replace(/"/g, '') + '\'';
  const label = (o, x, y, t, rot, col, size) => (o && o.labels ? '<text x="' + x + '" y="' + y + '" ' + MARK + ' font-size="' + (size || 16) + '" fill="' + (col || '#c8102e') + '" text-anchor="middle"' + (rot ? ' transform="rotate(' + rot + ' ' + x + ' ' + y + ')"' : '') + '>' + t + '</text>' : '');
  const SPARK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0 L9.7 6.3 L16 8 L9.7 9.7 L8 16 L6.3 9.7 L0 8 L6.3 6.3 Z" fill="currentColor"/></svg>';

  /* ---------------- invented people (simple, friendly, nobody real) ---------------- */
  function person(x, y, k, c) {
    let h = '<path d="M' + n1(x - 30 * k) + ' ' + n1(y + 62 * k) + ' Q' + x + ' ' + n1(y + 26 * k) + ' ' + n1(x + 30 * k) + ' ' + n1(y + 62 * k) + ' Z" fill="' + c.top + '"/>';
    h += '<rect x="' + n1(x - 6 * k) + '" y="' + n1(y + 12 * k) + '" width="' + n1(12 * k) + '" height="' + n1(16 * k) + '" fill="' + c.skin + '"/>';
    if (c.style === 'long') h += '<path d="M' + n1(x - 19 * k) + ' ' + n1(y - 4 * k) + ' Q' + n1(x - 24 * k) + ' ' + n1(y + 30 * k) + ' ' + n1(x - 12 * k) + ' ' + n1(y + 34 * k) + ' L' + n1(x + 12 * k) + ' ' + n1(y + 34 * k) + ' Q' + n1(x + 24 * k) + ' ' + n1(y + 30 * k) + ' ' + n1(x + 19 * k) + ' ' + n1(y - 4 * k) + ' Z" fill="' + c.hair + '"/>';
    h += '<circle cx="' + x + '" cy="' + y + '" r="' + n1(17 * k) + '" fill="' + c.skin + '"/>';
    if (c.style === 'bun') h += '<circle cx="' + x + '" cy="' + n1(y - 21 * k) + '" r="' + n1(8 * k) + '" fill="' + c.hair + '"/>';
    h += '<path d="M' + n1(x - 17.5 * k) + ' ' + n1(y - 1 * k) + ' Q' + n1(x - 16 * k) + ' ' + n1(y - 21 * k) + ' ' + x + ' ' + n1(y - 19 * k) + ' Q' + n1(x + 17 * k) + ' ' + n1(y - 20 * k) + ' ' + n1(x + 17.5 * k) + ' ' + n1(y - 1 * k) + ' Q' + n1(x + 6 * k) + ' ' + n1(y - 11 * k) + ' ' + n1(x - 17.5 * k) + ' ' + n1(y - 1 * k) + ' Z" fill="' + c.hair + '"/>';
    h += '<circle cx="' + n1(x - 6 * k) + '" cy="' + n1(y + 2 * k) + '" r="' + n1(1.8 * k) + '" fill="#2b1d14"/><circle cx="' + n1(x + 6 * k) + '" cy="' + n1(y + 2 * k) + '" r="' + n1(1.8 * k) + '" fill="#2b1d14"/>';
    return h + '<path d="M' + n1(x - 5 * k) + ' ' + n1(y + 8 * k) + ' Q' + x + ' ' + n1(y + 12 * k) + ' ' + n1(x + 5 * k) + ' ' + n1(y + 8 * k) + '" stroke="#7a3b2e" stroke-width="' + n1(1.6 * k) + '" fill="none" stroke-linecap="round"/>';
  }
  function avatarSVG(col, kind) {
    if (kind === 'dog') return '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="20" fill="' + col + '"/><ellipse cx="9" cy="19" rx="5" ry="9" fill="#a8703f"/><ellipse cx="31" cy="19" rx="5" ry="9" fill="#a8703f"/><circle cx="20" cy="22" r="12" fill="#f1d2a2"/><circle cx="15.5" cy="20" r="1.8" fill="#2b1d14"/><circle cx="24.5" cy="20" r="1.8" fill="#2b1d14"/><ellipse cx="20" cy="25" rx="3" ry="2.2" fill="#2b1d14"/></svg>';
    if (kind === 'you') return '<svg viewBox="0 0 40 40" aria-hidden="true"><defs>' + lg('bpyouav', ['#ffd166', '#ff7eb6'], 1, 1) + '</defs><circle cx="20" cy="20" r="20" fill="url(#bpyouav)"/><path d="M20 7 L23 17 L33 20 L23 23 L20 33 L17 23 L7 20 L17 17 Z" fill="#fff"/></svg>';
    return '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="20" fill="' + col + '"/>' + (kind === 'bun' ? '<circle cx="20" cy="8.5" r="5" fill="#3b2b20"/>' : '') + '<circle cx="20" cy="22" r="12.5" fill="#fff" opacity=".92"/><path d="M8 18 Q20 2 32 18 Q26 12 20 13 Q14 12 8 18 Z" fill="#3b2b20" opacity="' + (kind === 'bald' ? 0 : 0.9) + '"/><circle cx="15.5" cy="21" r="1.9" fill="#2b1d14"/><circle cx="24.5" cy="21" r="1.9" fill="#2b1d14"/><path d="M16 26 q4 3.4 8 0" stroke="#2b1d14" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';
  }

  /* ---------------- the photos: 300x225 SVG; q = how "perfect" the take is (1 = the one posted) ---------------- */
  const ART = {};
  ART.latte = (u, q, r, o) => {
    let s = '<defs>' + lg(u + 'w', ['#efcba3', '#c99460'], 1, 1) + rg(u + 'c', '#e4ac72', '#7a421d', 0.45, 0.42, 0.62) + '</defs><rect width="300" height="225" fill="url(#' + u + 'w)"/>';
    s += '<g stroke="#a5703f" stroke-opacity=".28" stroke-width="2" fill="none"><path d="M0 34 Q80 24 160 38 T300 30"/><path d="M0 118 Q90 108 170 124 T300 114"/><path d="M0 200 Q100 190 200 204 T300 196"/></g><path d="M180 0 L300 0 L300 110 Z" fill="#fff" opacity=".2"/>';
    s += '<ellipse cx="157" cy="122" rx="96" ry="88" fill="#4a2a10" opacity=".2"/><ellipse cx="150" cy="114" rx="94" ry="86" fill="#fbf7f1"/><ellipse cx="150" cy="114" rx="80" ry="72" fill="#f1e9de"/>';
    s += '<path d="M70 176 L116 152" stroke="#d3cbc0" stroke-width="7" stroke-linecap="round"/><ellipse cx="64" cy="179" rx="11" ry="7.5" fill="#ddd5ca" transform="rotate(-28 64 179)"/><rect x="210" y="101" width="44" height="26" rx="13" fill="#fffdf8" stroke="#e6dccf" stroke-width="2"/>';
    s += '<circle cx="150" cy="114" r="67" fill="#fffdf8"/><circle cx="150" cy="114" r="59" fill="#ece0cf"/><circle cx="150" cy="114" r="54" fill="url(#' + u + 'c)"/><circle cx="150" cy="114" r="50" fill="none" stroke="#f2c793" stroke-opacity=".4" stroke-width="3"/>';
    const j = (v) => n1(v + (r() - 0.5) * (1 - q) * 30);
    if (q < 0.2) s += '<ellipse cx="' + j(150) + '" cy="' + j(116) + '" rx="' + n1(18 + r() * 14) + '" ry="' + n1(12 + r() * 10) + '" fill="#fbf1e2" transform="rotate(' + n1(r() * 90) + ' 150 116)"/><circle cx="' + j(128) + '" cy="' + j(100) + '" r="5" fill="#fbf1e2"/><circle cx="' + j(170) + '" cy="' + j(132) + '" r="3.5" fill="#fbf1e2"/>';
    else {
      s += '<g transform="rotate(' + n1((1 - q) * (r() - 0.5) * 80) + ' 150 114)"><path d="M150 ' + j(146) + ' C ' + j(108) + ' ' + j(120) + ', ' + j(110) + ' ' + j(84) + ', ' + j(133) + ' ' + j(84) + ' C ' + j(143) + ' 84, 150 92, 150 ' + j(99) + ' C 150 92, ' + j(157) + ' 84, ' + j(167) + ' ' + j(84) + ' C ' + j(190) + ' ' + j(84) + ', ' + j(192) + ' ' + j(120) + ', 150 ' + j(146) + ' Z" fill="#fbf1e2"/>';
      s += '<path d="M150 ' + j(96) + ' L150 ' + j(158) + '" stroke="#fbf1e2" stroke-width="' + n1(2.5 + (1 - q) * 4) + '" stroke-linecap="round" opacity=".9"/></g>';
    }
    if (q < 0.6) s += '<path d="M' + j(206) + ' ' + j(150) + ' q 12 4 10 16 q -3 10 -14 6 q -8 -6 4 -22 z" fill="#9c5a2a" opacity=".85"/>';
    if (o.tell) s += '<g transform="translate(-10 168)"><ellipse cx="32" cy="46" rx="32" ry="13" fill="#fffdf8" stroke="#dccfbd" stroke-width="2"/><ellipse cx="32" cy="33" rx="32" ry="13" fill="#fffdf8" stroke="#dccfbd" stroke-width="2"/><ellipse cx="32" cy="20" rx="32" ry="13" fill="#fffdf8" stroke="#dccfbd" stroke-width="2"/><ellipse cx="32" cy="20" rx="23" ry="8.5" fill="#b07444" opacity=".55"/></g>';
    return s;
  };
  ART.cake = (u, q, r, o) => {
    let s = '<defs>' + lg(u + 'b', ['#ffe3ec', '#ffd0de']) + '</defs><rect width="300" height="225" fill="url(#' + u + 'b)"/><circle cx="46" cy="40" r="26" fill="#fff" opacity=".45"/><circle cx="258" cy="56" r="34" fill="#fff" opacity=".35"/><circle cx="230" cy="20" r="12" fill="#fff" opacity=".5"/>';
    s += '<rect y="186" width="300" height="39" fill="#f4bccd"/><rect y="186" width="300" height="4" fill="#fff" opacity=".5"/><ellipse cx="150" cy="202" rx="40" ry="8" fill="#fff"/><rect x="142" y="180" width="16" height="22" fill="#fdf6f8"/><ellipse cx="150" cy="180" rx="92" ry="12" fill="#fff"/><ellipse cx="150" cy="178" rx="92" ry="10" fill="#fdf6f8"/>';
    const dir = r() < 0.5 ? -1 : 1, lean = (1 - q) * 20 * dir, slide = (1 - q) * 18 * dir;
    if (q < 0.22) s += '<g transform="translate(0 6)"><ellipse cx="150" cy="168" rx="84" ry="16" fill="#fff"/><path d="M76 168 q20 -28 74 -26 q60 2 76 26 z" fill="#ff9fbd"/><path d="M84 160 q60 -16 132 0" stroke="#fff3e6" stroke-width="6" fill="none"/><circle cx="' + n1(120 + r() * 60) + '" cy="150" r="7" fill="#e63950"/><circle cx="' + n1(214 + r() * 20) + '" cy="172" r="7" fill="#e63950"/></g>';
    else {
      s += '<g transform="rotate(' + n1(lean) + ' 150 178)"><rect x="86" y="128" width="128" height="50" rx="8" fill="#ff9fbd"/><rect x="86" y="122" width="128" height="10" rx="3" fill="#fff3e6"/>';
      s += '<g transform="translate(' + n1(slide) + ' ' + n1(Math.abs(slide) * 0.3) + ')"><rect x="93" y="84" width="114" height="42" rx="8" fill="#ffb8cc"/>';
      const dl = (k) => n1((8 + (1 - q) * 16) * (0.6 + 0.8 * r()) * k);
      s += '<path d="M91 92 Q150 72 209 92 L209 98 Q206 ' + (98 + dl(1)) + ' 202 98 Q197 ' + (98 + dl(1.2)) + ' 191 98 Q184 ' + (98 + dl(0.8)) + ' 176 98 Q168 ' + (98 + dl(1.3)) + ' 160 98 Q151 ' + (98 + dl(0.9)) + ' 143 98 Q134 ' + (98 + dl(1.4)) + ' 126 98 Q117 ' + (98 + dl(1)) + ' 109 98 Q100 ' + (98 + dl(1.2)) + ' 91 98 Z" fill="#fffaf5"/>';
      ['#ffd166', '#7bdff2', '#b8f2b0', '#cdb4ff'].forEach((c, i) => { for (let k = 0; k < 3; k++) { const x = 100 + ((i * 3 + k) * 37) % 100, y = 104 + ((i * 7 + k * 5) % 17); s += '<rect x="' + x + '" y="' + y + '" width="6" height="2.4" rx="1.2" fill="' + c + '" transform="rotate(' + ((i * 40 + k * 70) % 180) + ' ' + (x + 3) + ' ' + (y + 1) + ')"/>'; } });
      [[122, 80], [150, 74], [178, 80]].forEach(([x, y], i) => { const fall = q < 0.6 && i === 2; s += '<path d="M' + x + ' ' + (y - 6) + ' q 3 -9 9 -11" stroke="#5a8f3e" stroke-width="2" fill="none"/><circle cx="' + n1(x + (fall ? 26 * dir : 0)) + '" cy="' + n1(y + (fall ? 30 : 0)) + '" r="8" fill="#e63950"/><circle cx="' + n1(x - 2.5) + '" cy="' + n1(y - 2.5) + '" r="2.4" fill="#fff" opacity=".7"/>'; });
      s += '</g></g>';
    }
    if (o.tell) s += '<g transform="rotate(-32 282 70)"><rect x="268" y="18" width="16" height="74" rx="6" fill="#d8dee2"/><path d="M268 26 h16 v26 q-8 8 -16 0 z" fill="#fffaf5"/><rect x="272" y="90" width="8" height="46" rx="3" fill="#a77a5c"/></g>';
    return s;
  };
  ART.yoga = (u, q, r, o) => {
    let s = '<defs>' + lg(u + 's', ['#6c58d1', '#ff7eb6', '#ffc58e']) + lg(u + 'm', ['#6577d8', '#3d4aa8']) + '</defs><rect width="300" height="150" fill="url(#' + u + 's)"/><circle cx="150" cy="150" r="46" fill="#fff1c4" opacity=".95"/><rect y="148" width="300" height="77" fill="url(#' + u + 'm)"/>';
    [[158, 92], [168, 70], [178, 52], [190, 36]].forEach(([y, w]) => { s += '<rect x="' + (150 - w / 2) + '" y="' + y + '" width="' + w + '" height="3.4" rx="1.7" fill="#ffd9a8" opacity=".7"/>'; });
    s += '<path d="M76 225 Q100 184 150 180 Q204 182 226 225 Z" fill="#33285a"/>';
    const fig = (rot, flail) => '<g transform="rotate(' + n1(rot) + ' 150 182)" stroke="#231b40" stroke-linecap="round" stroke-linejoin="round" fill="none"><line x1="150" y1="118" x2="150" y2="150" stroke-width="10"/><line x1="150" y1="150" x2="150" y2="182" stroke-width="7.5"/><path d="M150 150 L167 160 L152 170" stroke-width="7"/>' +
      (flail ? '<path d="M150 124 L118 ' + n1(110 + r() * 16) + '" stroke-width="5.5"/><path d="M150 124 L183 ' + n1(108 + r() * 16) + '" stroke-width="5.5"/>' : '<path d="M150 125 L139 101 L150 84" stroke-width="5.5"/><path d="M150 125 L161 101 L150 84" stroke-width="5.5"/>') + '<circle cx="150" cy="108" r="9.5" fill="#231b40" stroke="none"/></g>';
    if (q < 0.18) s += '<ellipse cx="' + n1(120 + r() * 60) + '" cy="196" rx="34" ry="7" fill="#fff" opacity=".6"/><path d="M' + n1(132 + r() * 30) + ' 194 l4 -26 M' + n1(150 + r() * 30) + ' 194 l-3 -24" stroke="#231b40" stroke-width="7" stroke-linecap="round"/><circle cx="110" cy="176" r="3" fill="#fff"/><circle cx="196" cy="170" r="4" fill="#fff"/><circle cx="182" cy="160" r="2.5" fill="#fff"/>';
    else s += fig((1 - q) * 40 * (r() < 0.5 ? -1 : 1), q < 0.55);
    if (o.tell) s += '<path d="M0 108 Q14 96 28 108 Q40 98 50 112 Q58 106 62 120 L62 225 L0 225 Z" fill="#2e6b49"/><path d="M0 124 Q22 116 40 130" stroke="#3f8a5f" stroke-width="3" fill="none"/><path d="M26 150 q8 -12 16 0 l-2 30 h-12 z" fill="#123222"/><circle cx="34" cy="144" r="6" fill="#123222"/>';
    return s;
  };
  ART.jump = (u, q, r, o) => {
    let s = '<defs>' + lg(u + 's', ['#7cccff', '#d9f3ff']) + '</defs><rect width="300" height="130" fill="url(#' + u + 's)"/><circle cx="250" cy="34" r="18" fill="#fff6c2"/><circle cx="250" cy="34" r="30" fill="#fff6c2" opacity=".35"/>';
    s += '<rect y="116" width="300" height="26" fill="#3aa6d4"/><path d="M0 140 Q30 134 60 140 T120 140 T180 140 T240 140 T300 140" stroke="#fff" stroke-width="3" fill="none" opacity=".85"/><rect y="140" width="300" height="85" fill="#f3d8a4"/>';
    for (let i = 0; i < 14; i++) s += '<circle cx="' + ((i * 71) % 300) + '" cy="' + (150 + (i * 37) % 70) + '" r="1.6" fill="#d9b77c"/>';
    if (o.tell) for (let i = 0; i < 9; i++) { const x = 30 + ((i * 97) % 240), y = 160 + ((i * 53) % 54), a = (i * 37) % 60 - 30; s += '<ellipse cx="' + x + '" cy="' + y + '" rx="4" ry="7" fill="#d4b071" transform="rotate(' + a + ' ' + x + ' ' + y + ')"/><ellipse cx="' + (x + 9) + '" cy="' + (y + 4) + '" rx="4" ry="7" fill="#d4b071" transform="rotate(' + a + ' ' + (x + 9) + ' ' + (y + 4) + ')"/>'; }
    const mode = q >= 1 ? 'air' : q < 0.25 ? 'blur' : q < 0.5 ? 'crop' : 'ground';
    const cx = mode === 'crop' ? (r() < 0.5 ? 20 : 280) : 150, lift = mode === 'air' ? 54 : mode === 'blur' ? 30 : 0, fy = 196 - lift;
    s += '<ellipse cx="' + cx + '" cy="200" rx="' + n1(28 - lift * 0.2) + '" ry="5" fill="#b8956a" opacity=".55"/>';
    const body = (x, y, a) => '<g opacity="' + a + '"><path d="M' + x + ' ' + (y - 40) + ' L' + (x - 22) + ' ' + y + ' M' + x + ' ' + (y - 40) + ' L' + (x + 22) + ' ' + y + '" stroke="#f0c39e" stroke-width="7" stroke-linecap="round"/><rect x="' + (x - 12) + '" y="' + (y - 48) + '" width="24" height="14" rx="5" fill="#2b3a67"/><path d="M' + (x - 13) + ' ' + (y - 46) + ' L' + (x - 11) + ' ' + (y - 84) + ' L' + (x + 11) + ' ' + (y - 84) + ' L' + (x + 13) + ' ' + (y - 46) + ' Z" fill="#ff6f61"/><path d="M' + (x - 10) + ' ' + (y - 80) + ' L' + (x - 34) + ' ' + (y - (lift ? 116 : 70)) + ' M' + (x + 10) + ' ' + (y - 80) + ' L' + (x + 34) + ' ' + (y - (lift ? 116 : 70)) + '" stroke="#f0c39e" stroke-width="6.5" stroke-linecap="round"/><circle cx="' + x + '" cy="' + (y - 96) + '" r="12" fill="#f0c39e"/><path d="M' + (x - 12) + ' ' + (y - 98) + ' q12 -18 24 0 q-12 -6 -24 0" fill="#3b2b20"/></g>';
    s += mode === 'blur' ? body(cx - 14, fy, 0.35) + body(cx, fy + 6, 0.45) + body(cx + 14, fy + 12, 0.35) : body(cx, fy, 1);
    return s;
  };
  ART.pet = (u, q, r, o) => {
    let s = '<rect width="300" height="225" fill="#e7dfff"/><ellipse cx="150" cy="214" rx="140" ry="26" fill="#cbbcff"/><ellipse cx="150" cy="212" rx="110" ry="17" fill="#d8ccff"/>';
    const dog = (x, y, a) => '<g opacity="' + a + '" transform="translate(' + x + ' ' + y + ')"><path d="M44 50 q30 -6 26 -30" stroke="#d9b07a" stroke-width="9" fill="none" stroke-linecap="round"/><ellipse cx="0" cy="40" rx="48" ry="52" fill="#f1d2a2"/><ellipse cx="0" cy="54" rx="26" ry="34" fill="#fff4dc"/><ellipse cx="-26" cy="92" rx="15" ry="9" fill="#f1d2a2"/><ellipse cx="26" cy="92" rx="15" ry="9" fill="#f1d2a2"/>' +
      '<ellipse cx="-36" cy="-24" rx="15" ry="26" fill="#a8703f" transform="rotate(18 -36 -24)"/><ellipse cx="36" cy="-24" rx="15" ry="26" fill="#a8703f" transform="rotate(-18 36 -24)"/><circle cx="0" cy="-28" r="38" fill="#f1d2a2"/><ellipse cx="0" cy="-14" rx="20" ry="14" fill="#fff4dc"/>' +
      '<circle cx="-14" cy="-34" r="5" fill="#2b1d14"/><circle cx="14" cy="-34" r="5" fill="#2b1d14"/><circle cx="-12.5" cy="-35.5" r="1.6" fill="#fff"/><circle cx="15.5" cy="-35.5" r="1.6" fill="#fff"/><ellipse cx="0" cy="-19" rx="8" ry="6" fill="#2b1d14"/><path d="M-7 -10 q7 7 14 0" stroke="#2b1d14" stroke-width="2" fill="none"/><path d="M-14 6 l14 6 l14 -6 l0 14 l-14 -6 l-14 6 z" fill="#e8455a"/><circle cx="0" cy="12" r="4" fill="#c1293f"/></g>';
    const mode = q >= 1 ? 'pose' : q < 0.2 ? 'nose' : q < 0.4 ? 'tail' : q < 0.7 ? 'blur' : 'crop';
    if (mode === 'pose') s += dog(150, 112, 1);
    else if (mode === 'blur') s += dog(140, 116, 0.45) + dog(158, 110, 0.45);
    else if (mode === 'crop') s += dog(r() < 0.5 ? 40 : 262, 120, 1);
    else if (mode === 'tail') s += '<path d="M300 150 q-40 -10 -36 -40" stroke="#d9b07a" stroke-width="12" fill="none" stroke-linecap="round"/>';
    else s += '<ellipse cx="150" cy="120" rx="96" ry="70" fill="#2b1d14"/><ellipse cx="118" cy="104" rx="14" ry="18" fill="#000"/><ellipse cx="182" cy="104" rx="14" ry="18" fill="#000"/><ellipse cx="130" cy="84" rx="20" ry="9" fill="#fff" opacity=".35"/><path d="M110 180 q40 50 80 0 z" fill="#ff7f9a"/>';
    if (o.tell) s += '<g transform="translate(232 0)"><path d="M70 6 q-40 -6 -48 22 q-4 14 10 14 q10 0 16 -10 q10 4 22 2 z" fill="#f0c39e"/><g transform="rotate(-24 26 46)"><rect x="12" y="40" width="28" height="10" rx="5" fill="#d9a066"/><circle cx="12" cy="40" r="6" fill="#d9a066"/><circle cx="12" cy="50" r="6" fill="#d9a066"/><circle cx="40" cy="40" r="6" fill="#d9a066"/><circle cx="40" cy="50" r="6" fill="#d9a066"/></g></g>';
    return s;
  };
  ART.selfie = (u, q, r, o) => {
    let s = '<defs>' + lg(u + 'b', ['#ffd3a3', '#ff9fb4'], 1, 1) + '</defs><rect width="300" height="225" fill="url(#' + u + 'b)"/><circle cx="150" cy="100" r="90" fill="#fff" opacity=".18"/>';
    const mode = q >= 1 ? 'pose' : q < 0.25 ? 'sneeze' : q < 0.5 ? 'blink' : q < 0.75 ? 'tilt' : 'chin';
    const rot = mode === 'tilt' ? (r() < 0.5 ? -16 : 16) : 0, dy = mode === 'tilt' ? -40 : mode === 'chin' ? 18 : 0;
    s += '<g transform="translate(0 ' + dy + ') rotate(' + rot + ' 150 120)"><path d="M60 225 Q70 168 150 162 Q230 168 240 225 Z" fill="#6f5be0"/><rect x="138" y="140" width="24" height="30" fill="#e2a982"/>';
    s += '<path d="M92 112 Q86 46 150 42 Q214 46 208 112 Q212 158 186 170 L114 170 Q88 158 92 112 Z" fill="#3d2b56"/><ellipse cx="150" cy="114" rx="' + (mode === 'chin' ? 50 : 46) + '" ry="52" fill="#eab48f"/><path d="M103 98 Q112 56 150 58 Q190 56 197 98 Q176 72 150 84 Q126 72 103 98 Z" fill="#3d2b56"/>';
    s += '<ellipse cx="124" cy="132" rx="10" ry="6" fill="#ff8fa3" opacity=".55"/><ellipse cx="176" cy="132" rx="10" ry="6" fill="#ff8fa3" opacity=".55"/>';
    if (mode === 'blink') s += '<path d="M124 116 q8 6 16 0 M160 116 q8 6 16 0" stroke="#2b1d14" stroke-width="3" fill="none" stroke-linecap="round"/>';
    else if (mode === 'sneeze') s += '<path d="M122 110 l14 6 l-14 6 M178 110 l-14 6 l14 6" stroke="#2b1d14" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    else s += '<circle cx="132" cy="116" r="6.5" fill="#2b1d14"/><circle cx="168" cy="116" r="6.5" fill="#2b1d14"/><circle cx="132" cy="116" r="2.6" fill="none" stroke="#fff" stroke-width="1.4"/><circle cx="168" cy="116" r="2.6" fill="none" stroke="#fff" stroke-width="1.4"/>';
    s += '<path d="M126 102 q6 -4 12 -1 M162 101 q6 -3 12 1" stroke="#3d2b56" stroke-width="3" fill="none" stroke-linecap="round"/>';
    s += (mode === 'sneeze' ? '<ellipse cx="150" cy="146" rx="9" ry="11" fill="#7a2b3a"/>' : '<path d="M138 142 Q150 154 162 142" stroke="#b5434e" stroke-width="3.4" fill="#fff" stroke-linecap="round"/>') + '</g>';
    if (mode === 'sneeze') s += '<circle cx="186" cy="150" r="3" fill="#fff" opacity=".8"/><circle cx="198" cy="142" r="2.2" fill="#fff" opacity=".8"/><circle cx="196" cy="158" r="2" fill="#fff" opacity=".8"/>';
    if (o.tell) s += '<circle cx="292" cy="6" r="50" fill="none" stroke="#fff" stroke-width="11" opacity=".92"/><circle cx="292" cy="6" r="50" fill="none" stroke="#fff3c4" stroke-width="3" opacity=".9"/>';
    return s;
  };
  ART.painting = (u, q, r, o) => {
    let s = '<rect width="300" height="225" fill="#c58f5b"/><g stroke="#a8743f" stroke-opacity=".35" stroke-width="2"><path d="M0 60 H300 M0 140 H300 M0 200 H300"/></g>';
    s += '<g transform="rotate(-2 150 110)"><rect x="40" y="20" width="220" height="172" fill="#000" opacity=".15" transform="translate(4 5)"/><rect x="40" y="20" width="220" height="172" fill="#fbf8f1"/>';
    const muddy = q < 0.6, w = (v) => n1(v + (r() - 0.5) * (1 - q) * 22);
    s += '<rect x="52" y="32" width="196" height="92" fill="' + (muddy ? '#b9b39a' : '#bfe0ff') + '" opacity=".75"/><circle cx="' + w(200) + '" cy="' + w(62) + '" r="16" fill="' + (muddy ? '#d9a95a' : '#ffd27a') + '" opacity=".9"/>';
    s += '<path d="M52 124 L' + w(96) + ' ' + w(66) + ' L' + w(126) + ' ' + w(96) + ' L' + w(160) + ' ' + w(54) + ' L' + w(206) + ' ' + w(104) + ' L248 ' + w(82) + ' L248 124 Z" fill="' + (muddy ? '#8a7258' : '#7f8fe0') + '" opacity=".85"/>';
    s += '<path d="M52 124 L' + w(80) + ' ' + w(96) + ' L' + w(116) + ' ' + w(112) + ' L' + w(150) + ' ' + w(88) + ' L' + w(192) + ' ' + w(116) + ' L248 ' + w(100) + ' L248 124 Z" fill="' + (muddy ? '#6b5640' : '#5464c4') + '" opacity=".9"/>';
    s += '<rect x="52" y="124" width="196" height="56" fill="' + (muddy ? '#7d8a74' : '#9fd6f2') + '" opacity=".8"/>';
    if (!muddy) s += '<path d="M70 140 H120 M140 152 H210 M90 164 H170" stroke="#fff" stroke-width="2.4" opacity=".7" stroke-linecap="round"/><path d="M92 48 l5 4 l5 -4 M110 42 l4 3 l4 -3" stroke="#3b3b5a" stroke-width="1.6" fill="none"/>';
    if (q < 0.35) s += '<ellipse cx="' + w(140) + '" cy="' + w(110) + '" rx="' + n1(26 + r() * 16) + '" ry="' + n1(18 + r() * 10) + '" fill="#5a4630" opacity=".7"/>';
    if (q < 0.15) s += '<path d="M60 40 L240 172 M240 40 L60 172" stroke="#d62839" stroke-width="5" stroke-linecap="round" opacity=".85"/>';
    if (o.tell) s += '<circle cx="232" cy="166" r="15" fill="none" stroke="#8a5a2b" stroke-width="4" opacity=".45"/><circle cx="236" cy="170" r="15" fill="none" stroke="#8a5a2b" stroke-width="1.6" opacity=".35"/>';
    s += '<rect x="40" y="16" width="34" height="12" fill="#f6e7b4" opacity=".85" transform="rotate(-20 57 22)"/><rect x="226" y="16" width="34" height="12" fill="#f6e7b4" opacity=".85" transform="rotate(18 243 22)"/></g>';
    return s + '<rect x="262" y="150" width="30" height="46" rx="5" fill="#cfe9ff" opacity=".85"/><path d="M270 150 L264 100 M278 150 L282 96 M286 150 L292 108" stroke="#7a4f2a" stroke-width="4" stroke-linecap="round"/><circle cx="264" cy="100" r="3.5" fill="#ff6f91"/><circle cx="282" cy="96" r="3.5" fill="#5aa9e6"/><circle cx="292" cy="108" r="3.5" fill="#ffd166"/>';
  };
  ART.desk = (u, q, r, o) => {
    let s = '<defs>' + lg(u + 'w', ['#f8f1e8', '#efe3d4']) + lg(u + 'l', ['#d9e4ff', '#b9c9ff']) + rg(u + 'g', 'rgba(255,214,120,.55)', 'rgba(255,214,120,0)', 0.5, 0.5, 0.5) + '</defs><rect width="300" height="225" fill="url(#' + u + 'w)"/><path d="M210 0 L300 0 L300 160 Z" fill="#fff" opacity=".35"/>';
    s += '<rect x="40" y="26" width="64" height="48" rx="3" fill="#fff" stroke="#d8c7b3" stroke-width="4"/><path d="M46 68 L64 46 L76 58 L86 48 L98 68 Z" fill="#9cc5a1"/><circle cx="88" cy="38" r="5" fill="#ffcf7a"/>';
    s += '<circle cx="236" cy="70" r="46" fill="url(#' + u + 'g)"/><path d="M226 140 L236 74 M236 74 L252 60" stroke="#5b5b66" stroke-width="4" stroke-linecap="round"/><path d="M240 50 L270 56 L262 72 Z" fill="#ffd27a"/><ellipse cx="226" cy="142" rx="14" ry="4" fill="#5b5b66"/>';
    s += '<rect y="146" width="300" height="79" fill="#dcc1a2"/><rect y="146" width="300" height="7" fill="#c9a882"/>';
    s += '<rect x="96" y="80" width="104" height="66" rx="6" fill="#3a3f4b"/><rect x="101" y="85" width="94" height="56" rx="3" fill="url(#' + u + 'l)"/><path d="M110 128 L130 116 L146 122 L168 100 L186 106" stroke="#7a6bff" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M86 146 L210 146 L202 152 L94 152 Z" fill="#c9ccd6"/>';
    s += '<path d="M40 146 L44 118 L68 118 L72 146 Z" fill="#f2a28a"/><ellipse cx="50" cy="104" rx="10" ry="20" fill="#5aa36b" transform="rotate(-20 50 104)"/><ellipse cx="64" cy="100" rx="10" ry="22" fill="#4a9160" transform="rotate(18 64 100)"/><ellipse cx="57" cy="94" rx="8" ry="22" fill="#6bbf7d"/>';
    s += '<rect x="236" y="122" width="22" height="24" rx="4" fill="#7ec4cf"/><path d="M258 128 q10 4 0 12" stroke="#7ec4cf" stroke-width="4" fill="none"/><path d="M243 116 q-4 -8 2 -14 M251 116 q-4 -8 2 -14" stroke="#c8bfb3" stroke-width="2" fill="none" stroke-linecap="round"/>';
    s += '<rect x="140" y="160" width="62" height="40" rx="3" fill="#ffb6c1" transform="rotate(-6 171 180)"/><path d="M150 168 L190 164 M150 176 L186 172" stroke="#fff" stroke-width="2" transform="rotate(-6 171 180)"/>';
    if (o.tell) s += '<g transform="translate(40 194) rotate(-8)"><path d="M0 8 h26 v-12 h10 v26 q0 8 -8 8 h-28 q-8 0 -8 -8 q0 -8 8 -14 z" fill="#ff8fa3"/><path d="M26 -4 h10 M26 2 h10 M-6 18 h40" stroke="#fff" stroke-width="3"/></g>';
    return s;
  };
  ART.dinner = (u, q, r, o) => {
    let s = '<rect width="300" height="225" fill="#f2ece2"/><rect y="0" width="300" height="225" fill="#e7ddcf" opacity=".5" transform="skewY(-8)"/><rect x="0" y="150" width="300" height="20" fill="#d9e6dc" opacity=".8"/>';
    s += '<ellipse cx="156" cy="124" rx="92" ry="80" fill="#000" opacity=".1"/><circle cx="150" cy="116" r="88" fill="#fff"/><circle cx="150" cy="116" r="70" fill="#f7f4ef"/><path d="M96 150 Q130 96 210 104" stroke="#e8673f" stroke-width="12" fill="none" stroke-linecap="round" opacity=".85"/>';
    s += '<rect x="118" y="92" width="64" height="40" rx="8" fill="#f39b72"/><path d="M126 96 L132 130 M140 94 L146 130 M154 94 L160 130 M168 96 L174 128" stroke="#c96b45" stroke-width="3"/><rect x="118" y="92" width="64" height="8" rx="4" fill="#ffd1b8" opacity=".6"/>';
    [[110, 84], [190, 90], [184, 136], [104, 124], [150, 80]].forEach(([x, y], i) => { s += '<ellipse cx="' + x + '" cy="' + y + '" rx="11" ry="5.5" fill="' + (i % 2 ? '#5aa36b' : '#7cc37f') + '" transform="rotate(' + (i * 47) + ' ' + x + ' ' + y + ')"/>'; });
    s += '<circle cx="168" cy="146" r="4" fill="#b388eb"/><circle cx="160" cy="150" r="3" fill="#b388eb"/><path d="M196 120 l16 -10 l2 14 z" fill="#ffe066"/>';
    s += '<rect x="30" y="50" width="8" height="120" rx="4" fill="#c7ccd1"/><path d="M26 50 v24 M34 50 v24 M42 50 v24" stroke="#c7ccd1" stroke-width="3"/><rect x="262" y="50" width="9" height="120" rx="4" fill="#c7ccd1"/>';
    s += '<path d="M236 10 h28 q2 24 -9 32 q-5 3 -5 9 v22 h12 v5 h-32 v-5 h12 v-22 q0 -6 -5 -9 q-11 -8 -9 -32" fill="#fff" opacity=".75"/><path d="M237 24 h26 q-2 14 -13 16 q-11 -2 -13 -16" fill="#8e2b3a" opacity=".85"/>';
    if (o.tell) s += '<path d="M8 40 q-12 -14 4 -22 q14 -6 6 -18 M20 46 q-8 -10 4 -18 q10 -6 2 -14" stroke="#9aa0a6" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/>';
    return s;
  };
  ART.plants = (u, q, r, o) => {
    let s = '<rect width="300" height="225" fill="#e7f3ea"/><path d="M0 0 L120 0 L0 120 Z" fill="#fff" opacity=".35"/><rect x="20" y="96" width="260" height="10" rx="3" fill="#c49a6c"/><rect x="20" y="178" width="260" height="10" rx="3" fill="#c49a6c"/><rect y="200" width="300" height="25" fill="#d8c3a8"/>';
    const pot = (x, y, w, h, c) => '<path d="M' + (x - w / 2) + ' ' + y + ' h' + w + ' l-' + n1(w * 0.12) + ' ' + h + ' h-' + n1(w * 0.76) + ' z" fill="' + c + '"/><rect x="' + (x - w / 2 - 3) + '" y="' + (y - 4) + '" width="' + (w + 6) + '" height="6" rx="3" fill="' + c + '"/>';
    const leaf = (x, y, rx, ry, a, c) => '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + c + '" transform="rotate(' + a + ' ' + x + ' ' + y + ')"/>';
    s += leaf(58, 54, 12, 24, -24, '#4f9a62') + leaf(80, 50, 13, 26, 16, '#3f8754') + leaf(70, 40, 10, 24, -2, '#62b276') + pot(70, 74, 40, 22, '#ffb4a2');
    s += leaf(146, 66, 30, 18, -10, '#3f8754') + '<path d="M128 66 l10 -6 M150 58 l-2 10 M162 70 l-10 -4" stroke="#e7f3ea" stroke-width="3"/>' + leaf(162, 46, 22, 14, 30, '#4f9a62') + pot(148, 74, 44, 22, '#cdb4db');
    s += '<path d="M226 74 q-10 40 -24 70 M236 76 q4 40 -6 86 M246 74 q12 30 10 60" stroke="#4f9a62" stroke-width="2.4" fill="none"/>';
    [[216, 100], [206, 126], [228, 120], [234, 150], [252, 108], [254, 130]].forEach(([x, y], i) => { s += leaf(x, y, 6, 4, i * 30, i % 2 ? '#62b276' : '#4f9a62'); });
    s += leaf(232, 60, 14, 8, -20, '#62b276') + pot(236, 74, 38, 20, '#a0c4ff');
    s += '<rect x="62" y="134" width="14" height="40" rx="7" fill="#7cc37f"/><rect x="54" y="146" width="8" height="16" rx="4" fill="#7cc37f"/><rect x="76" y="140" width="8" height="18" rx="4" fill="#7cc37f"/>' + pot(69, 156, 36, 22, '#ffd6a5');
    s += leaf(150, 136, 16, 30, -30, '#3f8754') + leaf(170, 132, 16, 30, 28, '#4f9a62') + leaf(160, 124, 12, 30, 0, '#62b276') + pot(160, 156, 42, 22, '#ffb4a2');
    s += leaf(236, 140, 22, 12, -14, '#4f9a62') + leaf(246, 132, 18, 10, 40, '#62b276') + pot(240, 158, 34, 20, '#bde0fe');
    if (o.tell) s += '<path d="M188 214 q10 -12 24 -6 q-4 12 -24 6 z" fill="#b5803e"/><path d="M188 214 L212 208" stroke="#8a5a2b" stroke-width="1.4"/>';
    return s;
  };
  ART.cozy = (u, q, r, o) => {
    let s = '<defs>' + rg(u + 'g', 'rgba(255,214,150,.75)', 'rgba(255,214,150,0)', 0.5, 0.5, 0.5) + '</defs><rect width="300" height="225" fill="#f4e0cf"/><circle cx="236" cy="66" r="70" fill="url(#' + u + 'g)"/><rect y="176" width="300" height="49" fill="#e2c2a6"/><ellipse cx="150" cy="200" rx="120" ry="18" fill="#e8a998" opacity=".8"/>';
    s += '<path d="M236 30 L224 64 L248 64 Z" fill="#ffd9a0"/><path d="M236 64 V150" stroke="#7a6a5a" stroke-width="3"/><ellipse cx="236" cy="152" rx="14" ry="4" fill="#7a6a5a"/>';
    s += '<rect x="56" y="88" width="120" height="96" rx="26" fill="#93b3a2"/><rect x="40" y="120" width="34" height="70" rx="14" fill="#86a896"/><rect x="158" y="120" width="34" height="70" rx="14" fill="#86a896"/><rect x="70" y="140" width="96" height="40" rx="10" fill="#a9c5b5"/>';
    s += '<path d="M78 96 Q120 86 150 110 L152 178 L86 178 Z" fill="#f2c9a0"/><path d="M86 120 L150 126 M86 140 L151 144 M86 160 L152 162" stroke="#e8ae7a" stroke-width="4"/><circle cx="118" cy="104" r="9" fill="#e8ae7a" opacity=".6"/>';
    s += '<rect x="196" y="140" width="50" height="8" rx="3" fill="#b08968"/><rect x="216" y="148" width="10" height="34" fill="#b08968"/><rect x="200" y="126" width="30" height="7" rx="2" fill="#e76f51"/><rect x="203" y="119" width="26" height="7" rx="2" fill="#2a9d8f"/><rect x="232" y="122" width="10" height="18" rx="3" fill="#fff6e0"/><path d="M237 122 q-4 -6 0 -12 q4 6 0 12" fill="#ffb347"/>';
    if (o.tell) s += '<g transform="translate(270 70)"><rect x="0" y="0" width="40" height="130" rx="8" fill="#b08968"/><path d="M8 20 q-14 30 -6 70 l10 0 q-6 -36 6 -66 z" fill="#5c7cfa"/><rect x="-2" y="40" width="44" height="14" rx="6" fill="#ffd166"/></g>';
    return s;
  };
  ART.keynote = (u, q, r, o) => {
    let s = '<defs>' + lg(u + 's', ['#7f6bff', '#ff7eb6'], 1, 1) + '</defs><rect width="300" height="225" fill="#1c1838"/><rect x="54" y="18" width="192" height="104" rx="6" fill="url(#' + u + 's)"/>';
    s += '<path d="M76 104 L112 86 L140 94 L176 62 L216 46" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M206 42 l12 2 l-4 11" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M120 0 L180 0 L232 190 L70 190 Z" fill="#fff" opacity=".08"/>';
    s += '<path d="M190 128 h56 l-6 62 h-44 z" fill="#3b2f6e"/><rect x="186" y="124" width="64" height="8" rx="3" fill="#4d3f8a"/>' + person(150, 128, 0.9, { skin: '#c68b59', hair: '#2b1d14', top: '#ff7a59', style: 'bun' });
    s += '<path d="M126 170 L108 150 L104 132" stroke="#ff7a59" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="104" cy="130" r="5" fill="#c68b59"/>';
    if (o.tell) s += '<g transform="rotate(-16 104 140)"><rect x="92" y="134" width="22" height="15" rx="2" fill="#fff"/><rect x="95" y="137" width="22" height="15" rx="2" fill="#fbf3dc" stroke="#d8cfb6"/><path d="M98 142 h14 M98 146 h10" stroke="#9a9a9a" stroke-width="1.4"/></g>';
    for (let i = 0; i < 11; i++) s += '<circle cx="' + (12 + i * 28) + '" cy="' + (214 + (i % 2) * 6) + '" r="15" fill="#0d0a1e"/>';
    return s;
  };
  ART.marathon = (u, q, r, o) => {
    let s = '<defs>' + lg(u + 's', ['#bfe3ff', '#eaf6ff']) + '</defs><rect width="300" height="225" fill="url(#' + u + 's)"/>';
    s += '<path d="M0 150 V90 h30 v-20 h26 v40 h20 v-50 h34 v60 h24 v-30 h30 v50 h20 v-70 h40 v40 h24 v-20 h30 v60 h22 v80 z" fill="#a9c1e6"/><rect y="150" width="300" height="75" fill="#9aa3ad"/><path d="M0 188 H300" stroke="#fff" stroke-width="4" stroke-dasharray="18 14"/>';
    s += '<rect x="10" y="40" width="10" height="120" fill="#5b5b66"/><rect x="280" y="40" width="10" height="120" fill="#5b5b66"/><rect x="10" y="34" width="280" height="30" rx="4" fill="#ff5d73"/>';
    s += o.labels ? '<text x="150" y="56" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="18" fill="#fff" text-anchor="middle" letter-spacing="4">FINISH</text>' : '<rect x="110" y="44" width="80" height="10" rx="4" fill="#fff" opacity=".9"/>';
    s += '<path d="M140 176 L128 210 M160 176 L174 208" stroke="#7a4b2e" stroke-width="8" stroke-linecap="round"/><rect x="132" y="166" width="36" height="16" rx="5" fill="#2b3a67"/><path d="M134 168 L132 120 L168 120 L166 168 Z" fill="#ffd166"/><rect x="140" y="132" width="20" height="16" rx="2" fill="#fff"/>';
    s += '<path d="M136 124 L112 92 M164 124 L188 92" stroke="#7a4b2e" stroke-width="7" stroke-linecap="round"/><circle cx="150" cy="106" r="13" fill="#7a4b2e"/><path d="M137 104 q13 -20 26 0 q-13 -8 -26 0" fill="#1d1d1d"/><path d="M144 112 q6 5 12 0" stroke="#fff" stroke-width="2" fill="none"/>';
    s += '<path d="M150 122 L146 140 M150 122 L154 140" stroke="#e63950" stroke-width="3"/><circle cx="150" cy="144" r="6" fill="#f6c343" stroke="#d99a1e" stroke-width="2"/>';
    ['#ff5d73', '#ffd166', '#7bdff2', '#b8f2b0'].forEach((c, i) => { for (let k = 0; k < 4; k++) { const x = 30 + ((i * 4 + k) * 53) % 240, y = 70 + ((i * 4 + k) * 29) % 80; s += '<rect x="' + x + '" y="' + y + '" width="7" height="3" fill="' + c + '" transform="rotate(' + ((i + k) * 40) + ' ' + x + ' ' + y + ')"/>'; } });
    if (o.tell) s += '<rect x="167" y="190" width="10" height="7" rx="2" fill="#f2d5b0" transform="rotate(-20 172 193)"/>';
    return s;
  };
  ART.graduation = (u, q, r, o) => {
    let s = '<rect width="300" height="225" fill="#bfe3ff"/><rect y="40" width="300" height="185" fill="#efe3c8"/>';
    for (let i = 0; i < 4; i++) s += '<path d="M' + (12 + i * 74) + ' 225 V110 Q' + (42 + i * 74) + ' 70 ' + (72 + i * 74) + ' 110 V225 Z" fill="#d8c7a3"/>';
    s += '<rect y="200" width="300" height="25" fill="#cbb892"/>' + person(150, 100, 1, { skin: '#8d5a3b', hair: '#1d1d1d', top: '#2d2a5a', style: 'long' }) + '<path d="M118 160 L112 225 H188 L182 160 Z" fill="#2d2a5a"/>';
    s += '<path d="M124 82 L150 72 L176 82 L150 92 Z" fill="#1f1d3d"/><rect x="138" y="84" width="24" height="9" fill="#1f1d3d"/><path d="M174 82 v18" stroke="#ffd166" stroke-width="3"/><circle cx="174" cy="102" r="3.5" fill="#ffd166"/>';
    s += '<g transform="rotate(-24 196 150)"><rect x="180" y="144" width="40" height="13" rx="6" fill="#fffaf0"/><rect x="196" y="144" width="7" height="13" fill="#e63950"/></g><path d="M172 166 L192 156" stroke="#8d5a3b" stroke-width="8" stroke-linecap="round"/>';
    ['#ffd166', '#ff7eb6', '#7bdff2'].forEach((c, i) => { for (let k = 0; k < 4; k++) { const x = 24 + ((i * 4 + k) * 67) % 252, y = 16 + ((i * 4 + k) * 31) % 90; s += '<rect x="' + x + '" y="' + y + '" width="7" height="3" fill="' + c + '" transform="rotate(' + ((i + k) * 50) + ' ' + x + ' ' + y + ')"/>'; } });
    if (o.tell) s += '<rect x="96" y="194" width="11" height="22" rx="3" fill="#4cc9f0"/><path d="M100 199 l4 4 l-4 3 l4 4" stroke="#fff" stroke-width="1.6" fill="none"/>';
    return s;
  };
  ART.morning = (u, q, r, o) => {
    let s = '<defs>' + lg(u + 's', ['#b7a8ff', '#ff9fb2', '#ffcf8f']) + '</defs><rect width="300" height="225" fill="#f6efe4"/><rect x="60" y="14" width="180" height="112" rx="6" fill="url(#' + u + 's)"/><circle cx="150" cy="118" r="30" fill="#fff4c2"/><rect x="60" y="112" width="180" height="14" fill="#f6efe4"/>';
    s += '<path d="M150 14 V126 M60 66 H240" stroke="#fff" stroke-width="7"/><rect x="60" y="14" width="180" height="112" rx="6" fill="none" stroke="#fff" stroke-width="8"/><rect y="140" width="300" height="85" fill="#e6d3bd"/><rect y="140" width="300" height="6" fill="#d4bc9f"/>';
    s += '<path d="M54 174 L120 166 L124 206 L58 214 Z" fill="#fffaf0"/><path d="M120 166 L186 172 L182 212 L124 206 Z" fill="#fff"/><path d="M68 180 L112 175 M68 190 L110 185 M70 200 L104 196 M132 180 L172 184 M132 190 L170 194" stroke="#c9c1b5" stroke-width="2"/>';
    s += '<rect x="206" y="160" width="36" height="34" rx="8" fill="#fff"/><ellipse cx="224" cy="162" rx="16" ry="5" fill="#9ccf7f"/><path d="M219 162 q5 -4 10 0" stroke="#fff" stroke-width="1.6" fill="none"/>';
    s += '<path d="M24 140 L28 116 L46 116 L50 140 Z" fill="#ffb4a2"/><ellipse cx="32" cy="104" rx="7" ry="16" fill="#5aa36b" transform="rotate(-18 32 104)"/><ellipse cx="42" cy="102" rx="7" ry="16" fill="#62b276" transform="rotate(16 42 102)"/>';
    if (o.tell) s += '<g transform="translate(254 150)"><circle cx="20" cy="20" r="20" fill="#ff7a59"/><circle cx="20" cy="20" r="15" fill="#fff"/><circle cx="7" cy="2" r="6" fill="#ff7a59"/><circle cx="33" cy="2" r="6" fill="#ff7a59"/>' + (o.labels ? '<text x="20" y="25" font-family="Arial, sans-serif" font-weight="700" font-size="12" fill="#2b1d14" text-anchor="middle">5:47</text>' : '<path d="M20 20 V10 M20 20 h7" stroke="#2b1d14" stroke-width="2.4" stroke-linecap="round"/>') + '</g>';
    return s;
  };

  /* ---------------- the backs ---------------- */
  // a contact sheet: eleven near-misses and the one that got posted, circled in marker
  function sheetSVG(u, art, seed, n) {
    const R = rngOf(seed), cells = n || 12, cols = cells > 6 ? 4 : 3, rows = Math.ceil(cells / cols), cw = (300 - 8 - (cols - 1) * 2) / cols, chh = cw * 0.75, top = (225 - rows * chh - (rows - 1) * 10) / 2;
    let s = '<rect width="300" height="225" rx="4" fill="#1c1916"/>';
    for (let k = 0; k < 15; k++) s += '<rect x="' + (6 + k * 20) + '" y="3" width="9" height="5" rx="1.5" fill="#efe6d8" opacity=".85"/><rect x="' + (6 + k * 20) + '" y="217" width="9" height="5" rx="1.5" fill="#efe6d8" opacity=".85"/>';
    for (let i = 0; i < cells; i++) {
      const c = i % cols, row = (i / cols) | 0, x = n1(4 + c * (cw + 2)), y = n1(top + row * (chh + 10)), last = i === cells - 1, q = last ? 1 : Math.min(0.92, R() * 0.9);
      s += '<g class="bp-shot" style="--i:' + i + '"><rect x="' + x + '" y="' + y + '" width="' + n1(cw) + '" height="' + n1(chh) + '" fill="#0a0908"/><svg x="' + n1(x + 1.5) + '" y="' + n1(y + 1.5) + '" width="' + n1(cw - 3) + '" height="' + n1(chh - 3) + '" viewBox="0 0 300 225" preserveAspectRatio="xMidYMid slice">' + ART[art](u + 't' + i, q, R, { tell: false, labels: false }) + '</svg>';
      if (!last && R() < 0.42) s += '<path d="M' + n1(x + 8) + ' ' + n1(y + 8) + ' L' + n1(x + cw - 8) + ' ' + n1(y + chh - 8) + ' M' + n1(x + cw - 8) + ' ' + n1(y + 8) + ' L' + n1(x + 8) + ' ' + n1(y + chh - 8) + '" stroke="#ff4d5e" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>';
      s += '</g>';
      if (last) s += '<ellipse class="bp-circle" cx="' + n1(x + cw / 2) + '" cy="' + n1(y + chh / 2) + '" rx="' + n1(cw * 0.6) + '" ry="' + n1(chh * 0.66) + '" fill="none" stroke="#ff2e4d" stroke-width="3.4" transform="rotate(-8 ' + n1(x + cw / 2) + ' ' + n1(y + chh / 2) + ')" pathLength="100"/>';
    }
    return s;
  }
  const MESS = {
    desk(o) {
      let s = '<rect width="300" height="225" fill="#efe5d8"/><rect y="168" width="300" height="57" fill="#d6bf9f"/>';
      [['#ff8fa3', 26, 186, 30, 18], ['#7ec4cf', 46, 172, 34, 20], ['#ffd166', 18, 160, 26, 16], ['#b8a1ff', 40, 150, 30, 16], ['#9cd08f', 28, 140, 24, 14], ['#ffb38a', 50, 132, 22, 13], ['#f0f0f0', 34, 124, 20, 12]].forEach(([c, x, y, rx, ry]) => { s += '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + c + '"/>'; });
      s += '<rect x="240" y="120" width="56" height="44" fill="#c99b6d"/><rect x="246" y="78" width="46" height="42" fill="#d8ad80"/><rect x="252" y="44" width="36" height="34" fill="#c99b6d"/><path d="M240 142 H296 M246 99 H292 M252 61 H288" stroke="#f6e7b4" stroke-width="5"/>';
      s += '<rect x="120" y="192" width="70" height="14" rx="2" fill="#e0b083" transform="rotate(-4 155 199)"/><circle cx="140" cy="198" r="3" fill="#d62839"/><path d="M196 160 q20 30 -10 40 q-30 10 -8 20" stroke="#4a4a55" stroke-width="2.4" fill="none"/>';
      return s + label(o, 52, 112, 'laundry', -8) + label(o, 268, 32, 'boxes', 6) + label(o, 222, 216, 'pizza night', -2, '#c8102e', 15);
    },
    dinner(o) {
      let s = '<rect width="300" height="225" fill="#e9f1f2"/><g stroke="#d3e0e2" stroke-width="2">' + [30, 60, 90, 120].map(y => '<path d="M0 ' + y + ' H300"/>').join('') + [40, 80, 120, 160, 200, 240, 280].map(x => '<path d="M' + x + ' 0 V150"/>').join('') + '</g>';
      s += '<rect y="150" width="300" height="75" fill="#cfd8dc"/><rect y="150" width="300" height="6" fill="#b0bec5"/><circle cx="250" cy="18" r="11" fill="#fff" stroke="#b0bec5" stroke-width="3"/><circle cx="250" cy="18" r="3" fill="#ff4d5e"/><path d="M226 40 q20 -18 40 -4 q-10 18 -36 14 z" fill="#ff9f9f"/>';
      s += '<ellipse cx="250" cy="96" rx="44" ry="26" fill="#b0b5bb" opacity=".8"/><ellipse cx="226" cy="74" rx="30" ry="20" fill="#c3c7cc" opacity=".8"/><ellipse cx="268" cy="62" rx="26" ry="18" fill="#cfd2d6" opacity=".75"/>';
      s += '<rect x="214" y="138" width="70" height="14" rx="4" fill="#3a3f4b"/><path d="M284 145 h16" stroke="#3a3f4b" stroke-width="6"/><ellipse cx="249" cy="138" rx="30" ry="6" fill="#222"/>';
      s += '<rect x="10" y="118" width="64" height="10" rx="3" fill="#90a4ae"/><rect x="14" y="106" width="56" height="12" rx="3" fill="#78909c"/><rect x="18" y="94" width="48" height="12" rx="3" fill="#90a4ae"/><ellipse cx="40" cy="160" rx="34" ry="8" fill="#b0bec5"/>';
      s += '<circle cx="186" cy="40" r="5" fill="#e8673f" opacity=".7"/><circle cx="200" cy="56" r="3" fill="#e8673f" opacity=".7"/><circle cx="176" cy="66" r="4" fill="#e8673f" opacity=".6"/>';
      return s + label(o, 178, 18, 'smoke alarm: involved', 0, '#c8102e', 15) + label(o, 42, 84, 'washing up', -6);
    },
    plants(o) {
      let s = '<rect width="300" height="225" fill="#e7f3ea"/><rect y="170" width="300" height="55" fill="#d8c3a8"/>';
      [40, 100, 200, 260].forEach((x, i) => { s += '<path d="M' + (x - 14) + ' 196 h28 l-4 22 h-20 z" fill="' + ['#ffb4a2', '#cdb4db', '#ffd6a5', '#a0c4ff'][i] + '"/><path d="M' + x + ' 196 q-2 -20 -16 -26 M' + x + ' 196 q4 -24 18 -22 M' + x + ' 196 q0 -16 -4 -30" stroke="#a07a3e" stroke-width="2.6" fill="none"/><ellipse cx="' + (x - 16) + '" cy="172" rx="6" ry="3" fill="#b5803e"/><ellipse cx="' + (x + 18) + '" cy="176" rx="6" ry="3" fill="#a8703f"/>'; });
      s += '<rect x="146" y="188" width="10" height="30" fill="#c49a6c"/><rect x="128" y="176" width="46" height="18" rx="2" fill="#fffaf0" stroke="#c49a6c" stroke-width="2"/>';
      return s + (o && o.labels ? '<text x="151" y="190" ' + MARK + ' font-size="13" fill="#5a4630" text-anchor="middle">RIP</text>' : '') + label(o, 150, 164, 'plant graveyard', -3);
    },
    cozy(o) {
      let s = '<rect width="300" height="225" fill="#f4e0cf"/><rect y="176" width="300" height="49" fill="#e2c2a6"/><rect x="196" y="120" width="80" height="12" rx="4" fill="#b08968"/><rect x="200" y="132" width="8" height="60" fill="#b08968"/><rect x="264" y="132" width="8" height="60" fill="#b08968"/><rect x="200" y="40" width="8" height="84" fill="#b08968"/>';
      [['#5c7cfa', 236, 112, 40, 14], ['#ffd166', 230, 98, 36, 12], ['#e76f51', 242, 86, 34, 12], ['#2a9d8f', 232, 74, 30, 11], ['#f2c9a0', 240, 62, 28, 10], ['#b8a1ff', 236, 50, 24, 10]].forEach(([c, x, y, rx, ry]) => { s += '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + c + '"/>'; });
      s += '<path d="M262 40 L292 4" stroke="#8d5524" stroke-width="7" stroke-linecap="round"/><rect x="214" y="150" width="44" height="30" fill="#c99b6d"/><path d="M214 162 H258" stroke="#f6e7b4" stroke-width="4"/>';
      return s + label(o, 236, 26, 'the chair', -4) + label(o, 238, 208, '(holds everything)', 0, '#c8102e', 15);
    }
  };
  function wideSVG(u, art, o) {
    const at = { plants: [92, 14], cozy: [18, 56], dinner: [64, 56], desk: [84, 40] }[art] || [84, 40], w = 136, h = 102, cx = at[0], cy = at[1];
    let s = MESS[art](o) + '<rect x="' + (cx - 3) + '" y="' + (cy - 3) + '" width="' + (w + 6) + '" height="' + (h + 6) + '" fill="#fff"/>';
    s += '<svg x="' + cx + '" y="' + cy + '" width="' + w + '" height="' + h + '" viewBox="0 0 300 225">' + ART[art](u + 'c', 1, rngOf(3), { tell: false, labels: false }) + '</svg>';
    s += '<rect class="bp-crop" x="' + (cx - 6) + '" y="' + (cy - 6) + '" width="' + (w + 12) + '" height="' + (h + 12) + '" fill="none" stroke="#ff2e4d" stroke-width="3" stroke-dasharray="9 6" rx="3"/>';
    return s + (o && o.labels ? '<text x="' + (cx + w / 2) + '" y="' + (cy + h + 25) + '" ' + MARK + ' font-size="15" fill="#c8102e" text-anchor="middle">what got posted</text>' : '');
  }

  /* ---------------- the feed: invented posts, kind outtakes ---------------- */
  const L3 = (j, c, u) => ({ Jolly: j, Cheeky: c, Unfiltered: u });
  const POSTS = [
    { id: 'latte', art: 'latte', kind: 'sheet', who: { c: 'loopie' }, handle: '@loopie.pours', cap: 'Just a little Monday art.', likes: 3482, tag: '#effortless', theme: 'food', tell: [26, 196, 'a tower of practice cups'],
      out: { title: 'Attempt 47', stats: ['Cups poured: 47', 'Actual hearts: 1'], note: 'Drank the other 46. Very awake now.' }, react: L3('Forty-seven tries! That’s not luck, that’s love.', 'Forty-six coffees for one heart. Respect.', '47 attempts. That’s the real story.') },
    { id: 'cake', art: 'cake', kind: 'sheet', who: { col: '#ff9ebb', k: 'bun' }, handle: '@crumbs.and.co', cap: 'Baked a little something.', likes: 5120, tag: '#homemade', theme: 'food', tell: [278, 52, 'an icing-covered spatula'],
      out: { title: 'Cake no. 3', stats: ['Cakes baked: 3', 'Cakes 1 and 2: eaten anyway'], note: 'Delicious failures still count.' }, react: L3('Cake number three is the star. One and two were tasty understudies.', 'Two cakes gave their lives for this post.', 'Third cake. The first two got eaten.') },
    { id: 'yoga', art: 'yoga', kind: 'sheet', who: { c: 'still' }, handle: '@still.stretches', cap: 'Morning flow. Effortless.', likes: 8960, tag: '#balance', theme: 'glow', tell: [34, 162, 'a person-shaped hole in the hedge'],
      out: { title: 'Take 31', stats: ['Takes: 31', 'Landings in the hedge: 4'], note: 'Effortless took a while.' }, react: L3('Even Still falls in the hedge sometimes.', 'Effortless, apart from the hedge.', '31 takes. 4 hedge landings.') },
    { id: 'jump', art: 'jump', kind: 'sheet', who: { col: '#ffd166' }, handle: '@sunny.sami', cap: 'Pure joy.', likes: 2214, tag: '#beachday', theme: 'big', tell: [62, 176, 'a LOT of footprints'],
      out: { title: 'Jump 22', stats: ['Jumps: 22', 'Sand in shoes: all of it'], note: 'The joy was real. So was the timing.' }, react: L3('Twenty-two jumps for one moment of pure joy.', 'Pure joy, take twenty-two. Sand everywhere.', '22 jumps. One in frame.') },
    { id: 'pet', art: 'pet', kind: 'sheet', who: { col: '#cdb4ff', k: 'dog' }, handle: '@biscuit.the.pup', cap: 'He just sits like this.', likes: 12403, tag: '#goodboy', theme: 'home', tell: [268, 34, 'a hand holding a treat'],
      out: { title: 'Shot 1 in focus', stats: ['Treats spent: 30', 'Nose close-ups: many'], note: 'He does not just sit like this.' }, react: L3('One photo in focus. Thirty treats. Worth it.', 'He “just sits like this”. For treats.', '30 treats. 1 sharp photo.') },
    { id: 'selfie', art: 'selfie', kind: 'sheet', who: { col: '#b8a1ff', k: 'bun' }, handle: '@nina.new.hair', cap: 'New hair, who dis.', likes: 1876, tag: '#nofilter', theme: 'glow', tell: [272, 26, 'a ring light'],
      out: { title: 'Selfie 63', stats: ['Selfies taken: 63', 'Mid-sneeze: 4'], note: 'The sneeze ones were better.' }, react: L3('Sixty-three selfies! Everyone does this.', 'Selfie sixty-three. The sneeze one was art.', '63 takes. One posted.') },
    { id: 'painting', art: 'painting', kind: 'sheet', who: { col: '#9be3c7' }, handle: '@ink.and.ivy', cap: 'Quick little sketch.', likes: 3301, tag: '#sundaypaint', theme: 'home', tell: [232, 166, 'a coffee ring'],
      out: { title: 'Draft 9', stats: ['Drafts in the bin: 8', 'Coffee spilled: once'], note: 'Quick, after eight slow ones.' }, react: L3('Nine drafts before the “quick sketch”. Practice shows.', 'Quick sketch. Ninth attempt. Coffee involved.', 'Draft 9. Eight in the bin.') },
    { id: 'desk', art: 'desk', kind: 'wide', who: { c: 'glitch' }, handle: '@glitch.works', cap: 'Productive Sunday.', likes: 4410, tag: '#deskgoals', theme: 'home', tell: [56, 206, 'a runaway sock'],
      out: { title: 'Just out of shot', stats: ['Laundry: a mountain', 'Pizza boxes: present'], note: 'The desk was tidy. That part was true.' }, react: L3('The desk was tidy. The rest of the room was having a day.', 'Productive Sunday, laundry mountain edition.', 'Tidy desk. Everything else: out of shot.') },
    { id: 'dinner', art: 'dinner', kind: 'wide', who: { col: '#ffb38a' }, handle: '@plated.by.pia', cap: 'Simple weeknight dinner.', likes: 6020, tag: '#easy', theme: 'food', tell: [18, 26, 'a wisp of smoke'],
      out: { title: 'Just out of shot', stats: ['Smoke alarm: involved', 'Pans used: all of them'], note: 'Dinner was lovely, eventually.' }, react: L3('Dinner was lovely. The smoke alarm agreed, loudly.', 'Simple weeknight dinner, featuring the smoke alarm.', 'Nice plate. Smoky kitchen.') },
    { id: 'plants', art: 'plants', kind: 'wide', who: { col: '#9cd08f' }, handle: '@leafy.lou', cap: 'My little jungle.', likes: 2790, tag: '#plantparent', theme: 'home', tell: [200, 210, 'a fallen brown leaf'],
      out: { title: 'Just out of shot', stats: ['Plants thriving: 5', 'Plants that didn’t: 4'], note: 'RIP Gerald. You were loved.' }, react: L3('A jungle on the shelf, and a few brave plants below it.', 'Gerald gave his life for this aesthetic.', 'Five alive. Four didn’t make it.') },
    { id: 'cozy', art: 'cozy', kind: 'wide', who: { col: '#f6bd60' }, handle: '@slow.sunday.sol', cap: 'Slow Sunday.', likes: 3975, tag: '#cosy', theme: 'glow', tell: [284, 118, 'a very full chair'],
      out: { title: 'Just out of shot', stats: ['Items on the chair: 41', 'Guitar under it all: 1'], note: 'Every cosy corner has a chair like this.' }, react: L3('Every cosy corner has a chair like that.', 'Slow Sunday, powered by The Chair.', 'Cosy corner. Chaos chair.') },
    { id: 'keynote', art: 'keynote', kind: 'notes', who: { col: '#7bdff2' }, handle: '@dr.nova.speaks', cap: 'So natural on stage.', likes: 7310, tag: '#keynote', theme: 'big', tell: [104, 141, 'note cards, just in case'],
      out: { title: 'The morning of', notes: ['5:02 awake. Alarm was set for 7.', 'Practised to the cat: 14 times.', 'Pep talk in the loo: 3.', '8:59 very sweaty palms.'], note: 'Natural took a lot of practice.' }, react: L3('Fourteen practice runs for “natural”. That’s brave.', 'So natural. The cat heard it fourteen times.', 'Practised 14 times. Nervous. Did it anyway.') },
    { id: 'marathon', art: 'marathon', kind: 'notes', who: { c: 'rush' }, handle: '@rush.runs', cap: 'Felt amazing the whole way.', likes: 9150, tag: '#26point2', theme: 'big', tell: [172, 193, 'a plaster on the knee'],
      out: { title: 'The whole way', notes: ['Training: 6 months.', 'Blisters: 11.', 'Walked some bits. Allowed!', 'Cried at mile 20 (happy?).'], note: 'Amazing at the end. Hard in the middle.' }, react: L3('Blisters, walking bits and happy tears. That’s a real finish.', 'Felt amazing the whole way, except most of it.', 'Hard the whole way. Finished anyway.') },
    { id: 'graduation', art: 'graduation', kind: 'notes', who: { col: '#ffd166', k: 'bun' }, handle: '@ari.at.last', cap: 'Made it look easy.', likes: 11230, tag: '#graduated', theme: 'big', tell: [101, 205, 'an energy drink'],
      out: { title: 'Made it', notes: ['Essay drafts: 12.', 'Library cries: 2.', 'Asked for an extension: once.', 'Kept going: yes.'], note: 'Easy is not the word.' }, react: L3('Twelve drafts and two library cries. Look at that smile.', 'Made it look easy. It was not easy.', '12 drafts. Kept going.') },
    { id: 'morning', art: 'morning', kind: 'notes', who: { col: '#a0c4ff' }, handle: '@five.am.ash', cap: '5am club. Every day.', likes: 2650, tag: '#morningroutine', theme: 'glow', tell: [274, 170, 'the alarm clock'],
      out: { title: '5:47, actually', notes: ['Snoozed: 6 times.', '5am mornings this year: 1.', 'Matcha: lukewarm.', 'Back to bed after: yes.'], note: 'One good morning still counts.' }, react: L3('One 5am morning counts. Six snoozes count too.', '5am club. Membership: one morning.', 'Snoozed six times. Posted once.') }
  ];
  const THEMES = [
    { id: 'food', name: 'Food Feed', glow: ['#ff9a8b', '#ffd1a3', '#ffb6c1'] },
    { id: 'glow', name: 'Glow-Up Feed', glow: ['#c9b6ff', '#ff9fd1', '#ffd6a5'] },
    { id: 'big', name: 'Big Moments Feed', glow: ['#7bdff2', '#ffd166', '#ff8fab'] },
    { id: 'home', name: 'Home Feed', glow: ['#9be3c7', '#ffe29a', '#c9b6ff'] }
  ];
  const WINS = [
    { id: 'showed', t: 'Showed up anyway', i: 'sun' }, { id: 'ate', t: 'Ate something decent', i: 'bowl' }, { id: 'done', t: 'Got one thing done', i: 'check' },
    { id: 'smile', t: 'Made someone smile', i: 'smile' }, { id: 'help', t: 'Asked for help', i: 'hand' }, { id: 'rest', t: 'Took a breather', i: 'leaf' },
    { id: 'kind', t: 'Was kind to someone', i: 'heart' }, { id: 'out', t: 'Got some fresh air', i: 'tree' }, { id: 'kept', t: 'Kept going', i: 'arrow' }
  ];
  const ICON = {
    sun: '<circle cx="10" cy="10" r="4.5" fill="currentColor"/><path d="M10 1v3M10 16v3M1 10h3M16 10h3M3.6 3.6l2.1 2.1M14.3 14.3l2.1 2.1M3.6 16.4l2.1-2.1M14.3 5.7l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    bowl: '<path d="M2 9h16a8 7 0 0 1-16 0z" fill="currentColor"/><path d="M7 6q1-3 3-1M11 6q1-3 3-1" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
    check: '<path d="M3 10.5l4.2 4.2L17 5" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    smile: '<circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="7.2" cy="8" r="1.4" fill="currentColor"/><circle cx="12.8" cy="8" r="1.4" fill="currentColor"/><path d="M6.5 12q3.5 3 7 0" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
    hand: '<path d="M6 18V9.5a1.5 1.5 0 0 1 3 0V8a1.5 1.5 0 0 1 3 0v1a1.5 1.5 0 0 1 3 0V14q0 4-4.5 4z" fill="currentColor"/><path d="M6 12L4.3 10.3a1.4 1.4 0 0 0-2 2L6 16" fill="currentColor"/>',
    leaf: '<path d="M4 16Q3 4 17 3q1 13-13 13z" fill="currentColor"/><path d="M4 16L12 8" stroke="#fff" stroke-width="1.4" opacity=".7"/>',
    heart: '<path d="M10 17S2 12 2 7a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5-8 10-8 10z" fill="currentColor"/>',
    tree: '<circle cx="10" cy="7.5" r="5.5" fill="currentColor"/><rect x="9" y="11" width="2" height="7" fill="currentColor"/>',
    arrow: '<path d="M3 10h12M11 5l5 5-5 5" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    eye: '<path d="M1 10q9-9 18 0-9 9-18 0z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="10" r="3" fill="currentColor"/>'
  };
  const icon = (k) => '<svg viewBox="0 0 20 20" aria-hidden="true">' + (ICON[k] || ICON.check) + '</svg>';

  /* No GPU: every pixel is rasterised on the CPU, so the backdrop redraws less often there. */
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
    id: 'behind-the-post', mode: 'reframe', name: 'Behind the Post', verb: 'flip', family: 'REFRAME', minutes: 2,
    parents: ['Identity / Self', 'Social / Team / Perspective', 'Performance / Confidence'],
    cast: ['patch', 'sync', 'drop'], poster: { char: 'patch', mood: 'wink' },
    fonts: ['Shrikhand', 'Gochi+Hand'],
    tagline: 'Flip the perfect posts to find the outtakes. Then flip your day.',
    why: 'For comparing your behind-the-scenes with everyone else’s highlight reel.',
    css: `
.g-behind-the-post { --bp-disp: "Shrikhand", "Cooper Black", "Bookman Old Style", Georgia, serif; --bp-hand: ${HAND}; --bp-cw: 340px; --bp-ch: 400px; }
.g-behind-the-post .bp-hud { position: absolute; z-index: 32; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 60px); transform: translateX(-50%); display: flex; align-items: center; gap: 10px; padding: 7px 8px 7px 14px; border-radius: 999px;
  background: color-mix(in srgb, var(--ui-surface) 90%, transparent); border: 1px solid var(--ui-line); box-shadow: 0 8px 22px rgba(0, 0, 0, .25); color: var(--ui-fg); white-space: nowrap; pointer-events: none; }
.g-behind-the-post .bp-hud small { font: 800 12px/1 var(--font-ui); letter-spacing: .1em; text-transform: uppercase; color: var(--ui-muted); }
.g-behind-the-post .bp-hud b { font: 700 13px/1 var(--font-ui); display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border-radius: 999px; background: color-mix(in srgb, var(--ui-accent) 22%, transparent); color: var(--ui-fg); font-variant-numeric: tabular-nums; }
.g-behind-the-post .bp-hud b svg { width: 13px; height: 13px; color: #ffb703; }
.g-behind-the-post .bp-hud b.bp-bump { animation: behind-the-post-bump .5s cubic-bezier(.2, 1.6, .4, 1); }
.g-behind-the-post .bp-stage { position: absolute; inset: 0; z-index: 12; pointer-events: none; }
.g-behind-the-post .bp-card { position: absolute; left: 0; top: 0; width: var(--bp-cw); height: var(--bp-ch); perspective: 1300px; pointer-events: auto; touch-action: none; cursor: grab; outline: none;
  transition: transform .55s cubic-bezier(.2, .9, .25, 1.05), opacity .45s ease; }
.g-behind-the-post .bp-card.bp-live { transition: none; }
.g-behind-the-post .bp-card:focus-visible .bp-flip { outline: 3px solid #ffd166; outline-offset: 4px; border-radius: 24px; }
.g-behind-the-post .bp-card.bp-peek { pointer-events: none; }
.g-behind-the-post .bp-shadow { position: absolute; left: 6%; right: 6%; bottom: -14px; height: 26px; border-radius: 50%; background: radial-gradient(closest-side, rgba(20, 8, 30, .5), transparent); pointer-events: none; }
.g-behind-the-post .bp-flip { position: absolute; inset: 0; transform-style: preserve-3d; }
.g-behind-the-post .bp-face { position: absolute; inset: 0; border-radius: 24px; overflow: hidden; -webkit-backface-visibility: hidden; backface-visibility: hidden; box-shadow: 0 18px 40px rgba(20, 6, 30, .35); }
.g-behind-the-post .bp-front { padding: 7px; background: linear-gradient(135deg, #ffd6ec 0%, #d7c8ff 24%, #bfefff 48%, #d9ffd9 70%, #fff1b8 88%, #ffd6ec 100%); }
.g-behind-the-post .bp-in { position: relative; height: 100%; border-radius: 18px; background: #fffdfb; display: flex; flex-direction: column; padding: 9px 10px 10px; gap: 7px; color: #2b2034; overflow: hidden; }
.g-behind-the-post .bp-head { display: flex; align-items: center; gap: 9px; min-height: 38px; }
.g-behind-the-post .bp-av { flex: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: #f3eefc; }
.g-behind-the-post .bp-av svg, .g-behind-the-post .bp-av img { width: 36px; height: 36px; display: block; object-fit: contain; }
.g-behind-the-post .bp-who { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.g-behind-the-post .bp-who b { font: 700 15px/1.1 var(--font-ui); color: #2b2034; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.g-behind-the-post .bp-who i { font: 700 12px/1 var(--font-ui); font-style: normal; letter-spacing: .06em; text-transform: uppercase; color: #b5179e; display: inline-flex; align-items: center; gap: 4px; }
.g-behind-the-post .bp-who i svg { width: 11px; height: 11px; }
.g-behind-the-post .bp-photo { position: relative; flex: none; border-radius: 13px; overflow: hidden; aspect-ratio: 4 / 3; background: #eee; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .06); }
.g-behind-the-post .bp-photo > svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.g-behind-the-post .bp-cap { font: 400 19px/1.15 var(--bp-disp); color: #3a1f4a; text-wrap: balance; }
.g-behind-the-post .bp-meta { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 8px; font: 700 13px/1 var(--font-ui); color: #7b6a8a; }
.g-behind-the-post .bp-meta span { display: inline-flex; align-items: center; gap: 5px; }
.g-behind-the-post .bp-meta svg { width: 14px; height: 14px; color: #ffb703; }
.g-behind-the-post .bp-glint { position: absolute; inset: -20% -70%; background: linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, .55) 48%, rgba(255, 255, 255, 0) 56%); transform: translateX(-60%); pointer-events: none; animation: behind-the-post-glint 4.2s ease-in-out infinite; animation-delay: var(--gd, 1s); }
.g-behind-the-post .bp-shade { position: absolute; inset: 0; border-radius: 24px; background: #120818; opacity: 0; pointer-events: none; }
.g-behind-the-post .bp-tell { position: absolute; width: 48px; height: 48px; margin: -24px 0 0 -24px; border-radius: 50%; border: 0; padding: 0; background: transparent; cursor: zoom-in; pointer-events: auto; }
.g-behind-the-post .bp-tell::after { content: ""; position: absolute; left: 50%; top: 50%; width: 9px; height: 9px; margin: -4.5px; border-radius: 50%; background: radial-gradient(circle, #fff 0 30%, rgba(255, 255, 255, 0) 70%); opacity: 0; animation: behind-the-post-twinkle 3.6s ease-in-out infinite; animation-delay: var(--td, 1.2s); }
.g-behind-the-post .bp-tell:focus-visible { outline: 3px solid #ffd166; }
.g-behind-the-post .bp-tell.bp-found { cursor: default; }
.g-behind-the-post .bp-tell.bp-found::before { content: ""; position: absolute; inset: -4px; border-radius: 50%; border: 3px solid #ffd166; box-shadow: 0 0 0 3px rgba(43, 32, 52, .55), 0 0 18px rgba(255, 209, 102, .9); animation: behind-the-post-ring .5s cubic-bezier(.2, 1.6, .4, 1) both; }
.g-behind-the-post .bp-tell.bp-found::after { display: none; }
.g-behind-the-post .bp-tellnote { position: absolute; z-index: 3; left: 8px; right: 8px; bottom: 8px; display: flex; align-items: center; gap: 7px; padding: 7px 10px; border-radius: 11px; background: rgba(43, 32, 52, .88); color: #fff6e0; font: 700 13px/1.2 var(--font-ui); pointer-events: none; animation: behind-the-post-up .4s cubic-bezier(.2, 1.4, .4, 1) both; }
.g-behind-the-post .bp-tellnote svg { width: 16px; height: 16px; color: #ffd166; flex: none; }
.g-behind-the-post .bp-back { transform: rotateY(180deg); background: radial-gradient(130% 90% at 25% 15%, #e8cda6 0%, #d2ab80 60%, #bf9468 100%); color: #3b2414; display: flex; flex-direction: column; padding: 14px 14px 12px; gap: 8px; }
.g-behind-the-post .bp-back::before { content: ""; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(17deg, rgba(110, 70, 30, .07) 0 2px, transparent 2px 8px), repeating-linear-gradient(-38deg, rgba(255, 255, 255, .06) 0 1px, transparent 1px 10px); }
.g-behind-the-post .bp-tape { position: relative; align-self: center; margin-top: -4px; padding: 6px 16px; transform: rotate(-2deg); background: rgba(255, 244, 200, .82); box-shadow: 0 2px 4px rgba(60, 30, 10, .2); font: 800 12px/1 var(--font-ui); letter-spacing: .16em; text-transform: uppercase; color: #6b4a2a; }
.g-behind-the-post .bp-otitle { position: relative; font: 400 28px/1 var(--bp-hand); color: #c8102e; text-align: center; transform: rotate(-1.5deg); }
.g-behind-the-post .bp-out { position: relative; flex: 1 1 0; min-height: 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(60, 30, 10, .25); background: var(--ob, #1c1916); }
.g-behind-the-post .bp-out > svg { width: 100%; height: 100%; display: block; }
.g-behind-the-post .bp-shot { transform-box: fill-box; transform-origin: center; }
.g-behind-the-post .bp-out.bp-notes { background: transparent; box-shadow: none; overflow: visible; display: flex; flex-direction: column; justify-content: center; gap: 7px; padding: 0 4px; }
.g-behind-the-post .bp-note { align-self: flex-start; max-width: 96%; padding: 8px 12px 7px; background: var(--c, #fff59d); color: #3b2414; font: 400 17px/1.15 var(--bp-hand); box-shadow: 0 3px 8px rgba(60, 30, 10, .22); transform: rotate(var(--r, -2deg)); }
.g-behind-the-post .bp-note:nth-child(even) { align-self: flex-end; }
.g-behind-the-post .bp-stats { position: relative; display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 14px; font: 400 17px/1.15 var(--bp-hand); color: #3b2414; }
.g-behind-the-post .bp-onote { position: relative; margin-top: auto; text-align: center; font: 600 13px/1.25 var(--font-ui); color: #6b4a2a; }
.g-behind-the-post .bp-card.bp-shown .bp-shot { animation: behind-the-post-shot .32s cubic-bezier(.2, 1.4, .4, 1) both; animation-delay: calc(var(--i) * 55ms); }
.g-behind-the-post .bp-card.bp-shown .bp-circle { stroke-dasharray: 100; animation: behind-the-post-draw .6s ease-out both; animation-delay: .75s; }
.g-behind-the-post .bp-card.bp-shown .bp-note { animation: behind-the-post-slap .38s cubic-bezier(.2, 1.5, .4, 1) both; }
.g-behind-the-post .bp-card.bp-shown .bp-note:nth-child(2) { animation-delay: .22s; } .g-behind-the-post .bp-card.bp-shown .bp-note:nth-child(3) { animation-delay: .44s; } .g-behind-the-post .bp-card.bp-shown .bp-note:nth-child(4) { animation-delay: .66s; }
.g-behind-the-post .bp-card.bp-shown .bp-out.bp-wide > svg { animation: behind-the-post-wide .7s cubic-bezier(.2, .9, .3, 1) both; transform-origin: 50% 40%; }
.g-behind-the-post .bp-ybody { position: relative; flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; justify-content: center; gap: 12px; overflow: hidden; }
.g-behind-the-post .bp-sec { position: relative; display: flex; flex-direction: column; gap: 3px; }
.g-behind-the-post .bp-sec small { font: 800 12px/1 var(--font-ui); letter-spacing: .12em; text-transform: uppercase; color: #7a5534; }
.g-behind-the-post .bp-sec .gk-user, .g-behind-the-post .bp-sec p { margin: 0; font: 500 16px/1.3 var(--font-ui); color: #3b2414; }
.g-behind-the-post .bp-sec.bp-head2 .gk-user, .g-behind-the-post .bp-sec.bp-head2 p { font: 400 21px/1.15 var(--bp-hand); color: #b3122c; }
.g-behind-the-post .bp-sec p.bp-eg { font-style: italic; opacity: .9; }
.g-behind-the-post .bp-hl { position: relative; flex: 1; min-height: 0; border-radius: 13px; overflow: hidden; background: linear-gradient(150deg, #ffcf8f 0%, #ff9fb2 45%, #b7a8ff 100%); display: flex; flex-direction: column; justify-content: center; gap: 7px; padding: 12px; }
.g-behind-the-post .bp-hl::before { content: ""; position: absolute; inset: 0; background: radial-gradient(60% 50% at 80% 10%, rgba(255, 255, 255, .55), transparent 70%); pointer-events: none; }
.g-behind-the-post .bp-hl > b { position: relative; font: 400 22px/1 var(--bp-disp); color: #fff; text-shadow: 0 2px 8px rgba(120, 30, 80, .35); }
.g-behind-the-post .bp-stick { position: relative; align-self: flex-start; display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px 7px 9px; border-radius: 999px; background: #fffdfb; color: #3a1f4a; font: 700 15px/1.15 var(--font-ui); box-shadow: 0 4px 10px rgba(80, 20, 60, .25); transform: rotate(var(--r, -2deg)); }
.g-behind-the-post .bp-stick:nth-child(odd) { align-self: flex-end; }
.g-behind-the-post .bp-stick svg { width: 18px; height: 18px; color: #e85d75; flex: none; }
.g-behind-the-post .bp-stick.bp-new { animation: behind-the-post-stick .5s cubic-bezier(.2, 1.6, .4, 1) both; }
.g-behind-the-post .bp-actions { position: absolute; z-index: 22; left: 12px; right: 12px; display: flex; flex-direction: column; align-items: center; gap: 9px; pointer-events: none; }
.g-behind-the-post .bp-btn { pointer-events: auto; appearance: none; border: 0; cursor: pointer; min-height: 52px; min-width: 200px; padding: 0 26px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  font: 400 19px/1 var(--bp-disp); color: #fff; background: linear-gradient(180deg, #ff6fa8, #e0367e); box-shadow: 0 5px 0 #a51a59, 0 14px 28px rgba(224, 54, 126, .4); animation: behind-the-post-in .45s cubic-bezier(.2, 1.4, .4, 1) both; }
.g-behind-the-post .bp-btn svg { width: 20px; height: 20px; }
.g-behind-the-post .bp-btn:active { transform: translateY(4px); box-shadow: 0 1px 0 #a51a59; }
.g-behind-the-post .bp-btn:focus-visible { outline: 3px solid #ffd166; outline-offset: 4px; }
.g-behind-the-post .bp-btn[hidden] { display: none; }
.g-behind-the-post .bp-ask { font: 700 15px/1.25 var(--font-ui); color: var(--ui-fg); text-align: center; text-wrap: balance; padding: 0 8px; text-shadow: 0 1px 8px color-mix(in srgb, var(--ui-bg, #000) 60%, transparent); }
.g-behind-the-post .bp-chips { pointer-events: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: min(100%, 460px); }
.g-behind-the-post .bp-chip { appearance: none; cursor: pointer; min-height: 46px; padding: 8px 10px; border-radius: 14px; border: 2px solid rgba(255, 255, 255, .6); background: #fffdfb; color: #3a1f4a; display: flex; align-items: center; gap: 8px; text-align: left;
  font: 700 14px/1.15 var(--font-ui); box-shadow: 0 3px 0 rgba(120, 60, 110, .25), 0 8px 18px rgba(30, 10, 40, .2); animation: behind-the-post-in .4s cubic-bezier(.2, 1.4, .4, 1) both; animation-delay: calc(var(--i) * 45ms); }
.g-behind-the-post .bp-chip svg { width: 20px; height: 20px; flex: none; color: #b5179e; }
.g-behind-the-post .bp-chip[aria-pressed="true"] { background: linear-gradient(180deg, #fff4c2, #ffd166); border-color: #e09f00; color: #4a2a00; }
.g-behind-the-post .bp-chip[aria-pressed="true"] svg { color: #c2410c; }
.g-behind-the-post .bp-chip:focus-visible { outline: 3px solid #ffd166; outline-offset: 2px; }
.g-behind-the-post .bp-chip:disabled { opacity: .5; cursor: default; }
.g-behind-the-post .bp-wall { position: absolute; z-index: 14; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
.g-behind-the-post .bp-wall > header { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.g-behind-the-post .bp-wall > header b { font: 400 22px/1 var(--bp-disp); color: var(--ui-fg); }
.g-behind-the-post .bp-wall > header small { font: 800 12px/1 var(--font-ui); letter-spacing: .12em; text-transform: uppercase; color: var(--ui-muted); }
.g-behind-the-post .bp-slots { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.g-behind-the-post .bp-slot { position: relative; aspect-ratio: 2.6 / 1; border-radius: 12px; border: 2px dashed color-mix(in srgb, var(--ui-fg) 22%, transparent); }
.g-behind-the-post .bp-mini { position: absolute; inset: 0; display: grid; grid-template-columns: 1fr 1fr; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 18px rgba(20, 6, 30, .3); animation: behind-the-post-in .45s cubic-bezier(.2, 1.4, .4, 1) both; }
.g-behind-the-post .bp-mini > div { position: relative; overflow: hidden; }
.g-behind-the-post .bp-mini > div > svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.g-behind-the-post .bp-mback { background: radial-gradient(130% 90% at 25% 15%, #e8cda6, #c9a07a); display: grid; place-items: center; }
.g-behind-the-post .bp-mback b { position: relative; z-index: 1; font: 400 17px/1 var(--bp-hand); color: #c8102e; background: rgba(255, 244, 200, .9); padding: 4px 8px; transform: rotate(-3deg); box-shadow: 0 2px 4px rgba(60, 30, 10, .2); max-width: 92%; text-align: center; }
.g-behind-the-post .bp-mini.bp-wave { animation: behind-the-post-wave .9s cubic-bezier(.3, .7, .3, 1) both; animation-delay: var(--wd, 0s); }
.g-behind-the-post .bp-final { position: absolute; z-index: 24; display: flex; flex-direction: column; align-items: center; gap: 12px; pointer-events: none; }
.g-behind-the-post .bp-banner { text-align: center; display: flex; flex-direction: column; gap: 6px; animation: behind-the-post-up .6s cubic-bezier(.2, 1.4, .4, 1) both; }
.g-behind-the-post .bp-banner b { font: 400 clamp(28px, 7.4cqw, 40px)/1 var(--bp-disp); color: var(--ui-fg); text-shadow: 0 4px 22px rgba(255, 110, 170, .45); }
.g-behind-the-post .bp-banner small { font: 800 12px/1 var(--font-ui); letter-spacing: .14em; text-transform: uppercase; color: var(--ui-muted); }
.g-behind-the-post .bp-yours { position: relative; width: 100%; display: grid; grid-template-columns: 1fr 1fr; border-radius: 18px; overflow: hidden; box-shadow: 0 0 0 3px #ffd166, 0 0 34px rgba(255, 209, 102, .55), 0 18px 40px rgba(20, 6, 30, .4); animation: behind-the-post-open .8s cubic-bezier(.2, 1.2, .3, 1) both; }
.g-behind-the-post .bp-yours > div { position: relative; padding: 12px 12px 14px; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.g-behind-the-post .bp-yf { background: linear-gradient(150deg, #ffcf8f, #ff9fb2 50%, #b7a8ff); color: #3a1f4a; }
.g-behind-the-post .bp-yb { background: radial-gradient(130% 90% at 25% 15%, #e8cda6, #c9a07a); color: #3b2414; }
.g-behind-the-post .bp-yours small { font: 800 12px/1 var(--font-ui); letter-spacing: .12em; text-transform: uppercase; opacity: .85; }
.g-behind-the-post .bp-yf b { font: 400 20px/1.05 var(--bp-disp); color: #fff; text-shadow: 0 2px 8px rgba(120, 30, 80, .35); }
.g-behind-the-post .bp-yb b { font: 400 22px/1 var(--bp-hand); color: #b3122c; }
.g-behind-the-post .bp-yours span { font: 700 14px/1.25 var(--font-ui); }
.g-behind-the-post .bp-yb span { font-weight: 500; }
.g-behind-the-post .bp-comments { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.g-behind-the-post .bp-com { display: flex; align-items: center; gap: 10px; padding: 7px 12px 7px 7px; border-radius: 16px; background: var(--ui-surface); border: 1px solid var(--ui-line); color: var(--ui-fg); box-shadow: 0 8px 18px rgba(0, 0, 0, .2); animation: behind-the-post-up .5s cubic-bezier(.2, 1.5, .4, 1) both; }
.g-behind-the-post .bp-com img { width: 38px; height: 38px; flex: none; object-fit: contain; }
.g-behind-the-post .bp-com p { margin: 0; font: 500 15px/1.3 var(--font-ui); }
.g-behind-the-post .bp-com p b { font-weight: 800; margin-right: 4px; }
.g-behind-the-post .bp-com svg { width: 16px; height: 16px; color: #ffb703; flex: none; margin-left: auto; }
.g-behind-the-post .bp-album { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.g-behind-the-post .bp-album .bp-mini { position: relative; inset: auto; height: 68px; }
.g-behind-the-post .gk-bubble { max-width: min(270px, calc(100cqw - var(--sz, 96px) - 44px)); }
@keyframes behind-the-post-glint { 0%, 62% { transform: translateX(-60%); } 80%, 100% { transform: translateX(60%); } }
@keyframes behind-the-post-twinkle { 0%, 70%, 100% { opacity: 0; transform: scale(.4); } 82% { opacity: 1; transform: scale(1.6); } }
@keyframes behind-the-post-ring { from { transform: scale(1.8); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes behind-the-post-up { from { opacity: 0; transform: translateY(14px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes behind-the-post-in { from { opacity: 0; transform: translateY(10px) scale(.92); } to { opacity: 1; transform: none; } }
@keyframes behind-the-post-shot { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: none; } }
@keyframes behind-the-post-draw { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
@keyframes behind-the-post-slap { from { opacity: 0; transform: rotate(var(--r, -2deg)) scale(1.5) translateY(-10px); } to { opacity: 1; transform: rotate(var(--r, -2deg)); } }
@keyframes behind-the-post-wide { from { transform: scale(2.1); } to { transform: none; } }
@keyframes behind-the-post-stick { from { opacity: 0; transform: rotate(var(--r, -2deg)) scale(1.8); } to { opacity: 1; transform: rotate(var(--r, -2deg)); } }
@keyframes behind-the-post-bump { 0% { transform: scale(1); } 40% { transform: scale(1.25); } 100% { transform: scale(1); } }
@keyframes behind-the-post-wave { 0% { transform: perspective(600px) rotateY(0); } 50% { transform: perspective(600px) rotateY(180deg) scale(1.04); } 100% { transform: perspective(600px) rotateY(360deg); } }
@keyframes behind-the-post-open { from { opacity: 0; transform: scaleX(.5); } to { opacity: 1; transform: none; } }
@container (min-width: 700px) {
  .g-behind-the-post .bp-cap { font-size: 21px; }
  .g-behind-the-post .bp-otitle { font-size: 31px; }
  .g-behind-the-post .bp-chips { grid-template-columns: 1fr 1fr 1fr; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const now = () => performance.now();
      const clamp = K.clamp, lerp = K.lerp, reduced = () => K.reduced(), bright = () => S.scene() === 'bright';
      const inten = ctx.intensity, visits = K.visits(), text = String(ctx.text || ''), noWords = !text.trim();
      const care = () => an.safety === 'care', strong = () => an.fear_support === 'strong';
      const L = (o) => ctx.line(care() ? { Jolly: o.Jolly, Cheeky: o.Jolly, Unfiltered: o.Unfiltered } : o) || '';
      const N = [5, 6, 8][inten] || 6;
      const SOFT = softwareGfx();
      let uid = 0;
      const nextId = () => 'bp' + (++uid) + '_';
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length > n) { const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); s = (sp > n * 0.6 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; } if ((s.match(/"/g) || []).length % 2) s += '"'; if ((s.match(/“/g) || []).length > (s.match(/”/g) || []).length) s += '”'; return s; };
      const fmt = (n) => n.toLocaleString('en-AU');

      /* ---------------- today's feed: a theme, new outtakes first, every kind of outtake ---------------- */
      const THEME = K.dailyPick(THEMES, 5);
      const album = new Set(K.collection());
      const R = K.rng((K.daily() * 131 + visits * 977 + 17) >>> 0);
      const scored = K.shuffle(POSTS, R).map(p => ({ p, s: (p.theme === THEME.id ? 2 : 0) + (album.has('out:' + p.id) ? 0 : 1.6) + R() * 0.8 })).sort((a, b) => b.s - a.s).map(x => x.p);
      let FEED = scored.slice(0, N);
      ['sheet', 'wide', 'notes'].forEach(kind => { if (!FEED.some(p => p.kind === kind)) { const add = scored.find(p => p.kind === kind && !FEED.includes(p)); const drop = FEED.slice().reverse().find(p => FEED.filter(x => x.kind === p.kind).length > 1); if (add && drop) FEED[FEED.indexOf(drop)] = add; } });
      { // alternate the kinds so each flip lands differently
        const by = { sheet: [], wide: [], notes: [] }; FEED.forEach(p => by[p.kind].push(p));
        const order = []; let k = 0; const kinds = ['sheet', 'wide', 'notes'];
        while (order.length < FEED.length) { const kind = kinds[k++ % 3]; if (by[kind].length) order.push(by[kind].shift()); }
        FEED = order;
      }

      /* ---------------- state ---------------- */
      const G = { phase: 'intro', idx: -1, cur: null, cards: [], flipped: 0, tells: 0, tellsSeen: 0, flicks: 0, chips: [], picks: [], finished: false, nextBtn: null, postBtn: null, backstage: 0, canFlipYours: false, yoursFlipped: false, nextRes: null };
      const M = { W: 0, H: 0, phone: true, cw: 340, ch: 400, cx: 0, cy: 0, wallW: 0, wallX: 0, CH: 76 };
      const FL = { ang: 0, vel: 0, base: 0, target: 0, rx: 0, drag: null, lastWrite: '', moving: false };
      const P = K.particles({ max: 420 });

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1 : 1.5 });
      const stage = h('div', { class: 'bp-stage' });
      const hud = h('div', { class: 'bp-hud', role: 'status' });
      const hudFeed = h('small', { text: 'Today’s feed · ' + THEME.name });
      const hudCount = h('b', { html: SPARK + '<span>0 / ' + N + '</span>' });
      hud.append(hudFeed, hudCount);
      const actions = h('div', { class: 'bp-actions' });
      el.append(stage, actions, hud);
      M.CH = K.phone() ? 76 : 96;
      const patch = K.character('patch', { side: 'right', mood: 'wink', size: M.CH });
      const sync = K.character('sync', { side: 'right', mood: 'worried', size: M.CH });
      const drop = K.character('drop', { side: 'right', mood: 'think', size: M.CH });
      const CAST = { patch, sync, drop };
      sync.show(false); drop.show(false);
      let speaker = 'patch', sayT = 0;
      function say(who, line, mood, ms) {
        if (!line) return;
        const c = CAST[who] || patch;
        if (speaker !== who) { Object.keys(CAST).forEach(k => { if (k !== who) { CAST[k].hush(); CAST[k].show(false); } }); c.react('bounce'); speaker = who; }
        c.show(true);
        S.cancel(sayT);
        c.say(line, { mood: mood || undefined, ms: ms == null ? Math.max(2800, line.length * 62) : ms });
      }
      let wall = null, slots = [];

      /* ---------------- sound: a glossy pop groove that goes muffled backstage ---------------- */
      const BED = { bpm: 100, next: 0, step: 0, on: true, vol: 1, lp: 1 };
      const PROG = [['F2', ['A4', 'C5', 'E5', 'F5']], ['E2', ['G4', 'B4', 'D5', 'E5']], ['D2', ['F4', 'A4', 'C5', 'D5']], ['C2', ['E4', 'G4', 'B4', 'C5']]];
      K.loop(() => {
        if (!A.ctx || !BED.on) return;
        const tA = A.now(), half = 30 / BED.bpm;
        if (!BED.next || BED.next < tA - 0.3) BED.next = tA + 0.08;
        while (BED.next < tA + 0.3) {
          const t = BED.next, s = BED.step, e = s % 8, [root, tones] = PROG[Math.floor(s / 8) % 4], v = BED.vol, open = BED.lp;
          if (e === 0 || e === 5) A.pluck(A.note(root), { when: t, vol: 0.24 * v, damp: 0.992, lp: 500 + 300 * open, bus: 'music' });
          if (e % 2 === 1) { const a = tones[(s >> 1) % 4], b = tones[((s >> 1) + 2) % 4]; [a, b].forEach((nn, k) => A.pluck(A.note(nn), { when: t + k * 0.012, vol: (0.06 + 0.03 * open) * v, damp: 0.988, lp: 700 + 3600 * open, verb: 0.18, bus: 'music' })); }
          if (inten > 0) A.shaker(t, (e % 2 ? 0.03 : 0.016) * v * (0.4 + 0.6 * open));
          if (e === 0 && (s / 8) % 4 === 3 && open > 0.6 && !reduced()) for (let k = 0; k < 5; k++) A.tone({ when: t + 0.2 + k * 0.05, type: 'sine', freq: A.note(tones[k % 4]) * 2, dur: 0.18, vol: 0.016 * v, verb: 0.5, bus: 'music' });
          BED.next += half; BED.step++;
        }
      });
      S.onDestroy(() => { BED.on = false; });
      let hiss = null;
      function beds() { if (!A.ctx || hiss) return; hiss = A.loop({ pink: true, filter: 'bandpass', freq: 2400, q: 0.5, bus: 'amb' }); }
      beds(); S.on('audio-ready', beds); S.onDestroy(() => { if (hiss) hiss.stop(); });
      const at = () => now();
      function sFwip(dir) { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: 600, to: 3400, q: 1.3, dur: 0.22, attack: 0.04, vol: 0.13, pan: dir * 0.35 }); A.sync('flip', at()); }
      function sLand(i, back) { if (!A.ctx) return; A.wood(undefined, 0.15, back ? 0.72 : 0.9); A.tone({ type: 'sine', freq: back ? 130 : 170, to: back ? 70 : 95, dur: 0.13, vol: 0.13 }); A.pluck(A.note(PENTA[i % PENTA.length]), { vol: 0.16, damp: 0.995, verb: 0.3 }); A.sync('land', at()); }
      function sBurst(n) { if (!A.ctx) return; const t = A.now(); for (let k = 0; k < n; k++) { const w = t + 0.05 + k * Math.max(0.026, 0.07 - k * 0.004); A.noise({ when: w, filter: 'highpass', freq: 3200 + Math.random() * 1400, dur: 0.018, vol: 0.085 }); A.tone({ when: w, type: 'square', freq: 230, to: 120, dur: 0.03, vol: 0.016, lp: 1600 }); } A.sync('burst', at()); }
      function sSlap(k) { if (!A.ctx) return; const t = A.now() + k * 0.22; A.paper({ when: t, vol: 0.15 }); A.tone({ when: t, type: 'sine', freq: 190, to: 95, dur: 0.08, vol: 0.07 }); }
      function sWide() { if (!A.ctx) return; A.whoosh({ vol: 0.12, dur: 0.45 }); A.boing({ freq: 520, vol: 0.06 }); A.sync('wide', at()); }
      function sTell() { if (!A.ctx) return; const t = A.now(); ['E6', 'G6', 'C7'].forEach((n, k) => A.chime(A.note(n), { when: t + k * 0.05, vol: 0.06, dur: 1.1 })); A.sync('tell', at()); }
      function sPop(i) { if (!A.ctx) return; A.pop({ freq: 480 + i * 90, vol: 0.13 }); A.sync('pop', at()); }

      /* ---------------- the backdrop: a soft studio, warmer and dimmer backstage ---------------- */
      let bgC = null, bgKey = '';
      const BOKEH = Array.from({ length: 13 }, (_, i) => ({ x: (i * 0.618 + 0.11) % 1, y: ((i * 0.377 + 0.2) % 1), r: 50 + ((i * 37) % 90), c: THEME.glow[i % 3], s: 0.4 + (i % 4) * 0.18, ph: i * 1.7 }));
      function renderBg() {
        const W = M.W, H = M.H, br = bright();
        bgC = bgC || document.createElement('canvas');
        const dpr = cv.dpr || 1; bgC.width = Math.max(2, Math.round(W * dpr)); bgC.height = Math.max(2, Math.round(H * dpr));
        const g = bgC.getContext('2d', { alpha: false }); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        let gr = g.createLinearGradient(0, 0, W * 0.3, H); gr.addColorStop(0, br ? '#fff3f7' : '#1c1030'); gr.addColorStop(0.55, br ? '#ffe4ee' : '#2a1240'); gr.addColorStop(1, br ? '#ffe9d9' : '#160b22');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.save(); g.globalAlpha = br ? 0.5 : 0.07; g.fillStyle = '#fff';
        [[0.12, 0.22], [0.6, 0.78]].forEach(([a, b]) => { g.beginPath(); g.moveTo(W * a, 0); g.lineTo(W * (a + 0.16), 0); g.lineTo(W * (b + 0.1), H); g.lineTo(W * b, H); g.closePath(); g.fill(); });
        g.restore();
        gr = g.createRadialGradient(W / 2, H * 0.42, 10, W / 2, H * 0.42, Math.max(W, H) * 0.7); gr.addColorStop(0, br ? 'rgba(255,255,255,0.5)' : 'rgba(255,120,190,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        bgKey = (br ? 'b' : 'd') + W + 'x' + H + ':' + dpr;
      }
      let lastBg = 0, bgDirty = true;
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !M.W) return;
        const tn = now();
        G.backstage += ((G.phase === 'final' ? 0 : backShowing() ? 1 : 0) - G.backstage) * Math.min(1, dt * 4);
        BED.lp += ((1 - G.backstage * 0.8) - BED.lp) * Math.min(1, dt * 3);
        if (hiss) hiss.level(0.012 * G.backstage + 0.0001, 0.2);
        stepFlip(tn);
        const busy = P.count() > 0 || bgDirty || Math.abs(G.backstage - (G.bsDrawn || 0)) > 0.004 || G.phase === 'final';
        if (!busy && tn - lastBg < (SOFT ? 140 : 50)) return;
        lastBg = tn; bgDirty = false; G.bsDrawn = G.backstage;
        if (bgKey !== (bright() ? 'b' : 'd') + M.W + 'x' + M.H + ':' + (cv.dpr || 1)) renderBg();
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
        g.drawImage(bgC, 0, 0, M.W, M.H);
        const br = bright(), bs = G.backstage;
        g.save(); g.globalCompositeOperation = br ? 'source-over' : 'lighter';
        BOKEH.forEach((b, i) => {
          const x = b.x * M.W + Math.sin(t * 0.07 * b.s + b.ph) * 40, y = b.y * M.H + Math.cos(t * 0.05 * b.s + b.ph) * 30, r = b.r * (M.phone ? 0.8 : 1.1);
          g.globalAlpha = (br ? 0.28 : 0.22) * (1 - bs * 0.6) * (0.75 + 0.25 * Math.sin(t * 0.4 + i));
          g.drawImage(K.glowSprite(b.c), x - r, y - r, r * 2, r * 2);
        });
        g.restore();
        if (bs > 0.01) { g.globalAlpha = bs * (br ? 0.32 : 0.5); g.fillStyle = br ? '#e9d2b4' : '#2a170c'; g.fillRect(0, 0, M.W, M.H); g.globalAlpha = 1; }
        if (G.phase === 'final' && G.glows) {
          g.save(); g.globalCompositeOperation = br ? 'source-over' : 'lighter';
          G.glows.forEach((q, i) => { const k = 0.55 + 0.45 * Math.sin(t * 1.6 + i * 0.9); g.globalAlpha = (br ? 0.35 : 0.5) * k; const r = Math.max(q.w, q.h) * 0.75; g.drawImage(K.glowSprite(q.c), q.x + q.w / 2 - r, q.y + q.h / 2 - r, r * 2, r * 2); });
          g.restore();
        }
        P.update(Math.min(dt, 0.05)); P.draw(g);
      });

      /* ---------------- layout ---------------- */
      function cardHeight(cw) { return Math.round(14 + 9 + 38 + 7 + (cw - 34) * 0.75 + 7 + 46 + 7 + 18 + 10 + 4); }
      function layout() {
        M.W = cv.w || el.clientWidth; M.H = cv.h || el.clientHeight; if (!M.W || !M.H) return;
        M.phone = M.W < 700;
        if (M.phone) {
          M.cw = Math.min(M.W - 30, 372); M.ch = cardHeight(M.cw);
          const top0 = 112, bottom = M.H - (M.CH + 26), need = M.ch + 18 + 54;
          M.cx = Math.round((M.W - M.cw) / 2); M.cy = Math.round(top0 + Math.max(0, (bottom - top0 - need) * 0.32));
          if (wall) wall.hidden = true;
        } else {
          M.wallW = Math.min(440, Math.round(M.W * 0.34)); M.wallX = M.W - 28 - M.wallW;
          M.cw = Math.min(400, M.wallX - 90); M.ch = cardHeight(M.cw);
          M.cx = Math.round((M.wallX - M.cw) / 2 + 6); M.cy = Math.round(108 + Math.max(0, (M.H - 108 - (M.CH + 30) - M.ch - 76) * 0.3));
          buildWall();
          Object.assign(wall.style, { left: M.wallX + 'px', top: '104px', width: M.wallW + 'px' }); wall.hidden = false;
        }
        el.style.setProperty('--bp-cw', M.cw + 'px'); el.style.setProperty('--bp-ch', M.ch + 'px');
        hud.style.left = (M.phone ? M.W / 2 : M.cx + M.cw / 2) + 'px';
        actions.style.top = (M.cy + M.ch + 22) + 'px';
        if (!M.phone) { actions.style.left = (M.cx - 40) + 'px'; actions.style.right = 'auto'; actions.style.width = (M.cw + 80) + 'px'; } else { actions.style.left = '12px'; actions.style.right = '12px'; actions.style.width = 'auto'; }
        G.cards.forEach(c => placeCard(c, true));
        bgDirty = true;
        if (G.final) placeFinal();
      }
      function buildWall() {
        if (wall) return;
        wall = h('div', { class: 'bp-wall', 'aria-label': 'Outtakes album' }, h('header', null, h('b', { text: 'Outtakes album' }), h('small', { text: 'Front · Behind' })));
        const grid = h('div', { class: 'bp-slots' });
        slots = FEED.map(() => { const s = h('div', { class: 'bp-slot' }); grid.append(s); return s; });
        wall.append(grid); el.append(wall);
      }
      cv.onResize(() => layout());
      S.on('theme', () => { bgDirty = true; bgKey = ''; });

      /* ---------------- cards ---------------- */
      function avatarFor(p) {
        if (p.who && p.who.c) return '<img alt="" src="' + K.face(p.who.c, p.who.c === 'still' ? 'calm' : p.who.c === 'rush' ? 'celebrate' : 'happy') + '">';
        return avatarSVG(p.who.col, p.who.k);
      }
      function frontHTML(p, u) {
        return '<div class="bp-in"><div class="bp-head"><span class="bp-av">' + avatarFor(p) + '</span><div class="bp-who"><b>' + esc(p.handle) + '</b><i>' + SPARK + 'Highlight</i></div></div>' +
          '<div class="bp-photo"><svg viewBox="0 0 300 225" aria-hidden="true">' + ART[p.art](u, 1, rngOf(5), { tell: true, labels: true }) + '</svg></div>' +
          '<div class="bp-cap">' + esc(p.cap) + '</div><div class="bp-meta"><span>' + SPARK + fmt(p.likes) + '</span><span>' + esc(p.tag) + '</span></div></div>';
      }
      function backHTML(p, u) {
        let out;
        if (p.kind === 'sheet') out = '<div class="bp-out"><svg viewBox="0 0 300 225" aria-hidden="true">' + sheetSVG(u, p.art, (p.id.length * 7919 + 13) >>> 0) + '</svg></div>';
        else if (p.kind === 'wide') out = '<div class="bp-out bp-wide" style="--ob:' + ({ desk: '#efe5d8', dinner: '#e9f1f2', plants: '#e7f3ea', cozy: '#f4e0cf' }[p.art] || '#fffaf0') + '"><svg viewBox="0 0 300 225" aria-hidden="true">' + wideSVG(u, p.art, { labels: true }) + '</svg></div>';
        else out = '<div class="bp-out bp-notes">' + p.out.notes.map((n, i) => '<div class="bp-note" style="--r:' + [-2.5, 2, -1.5, 2.5][i % 4] + 'deg;--c:' + ['#fff59d', '#ffd1dc', '#c7f0ff', '#d9f99d'][i % 4] + '">' + esc(n) + '</div>').join('') + '</div>';
        return '<div class="bp-tape">Behind the post</div><div class="bp-otitle">' + esc(p.out.title) + '</div>' + out +
          (p.out.stats ? '<div class="bp-stats">' + p.out.stats.map(s => '<span>' + esc(s) + '</span>').join('') + '</div>' : '') + '<div class="bp-onote">' + esc(p.out.note) + '</div>';
      }
      function makeCard(p, i) {
        const u = nextId();
        const c = { p, i, u, el: null, flip: null, shade: null, slot: 2, revealed: false, tell: null, found: false, ready: false };
        c.el = h('div', { class: 'bp-card bp-peek', role: 'button', tabindex: '-1', 'aria-label': 'Post by ' + p.handle + ': ' + p.cap + '. Drag sideways, or press Enter, to flip it over.' });
        const shadow = h('div', { class: 'bp-shadow' });
        const flip = h('div', { class: 'bp-flip' });
        const front = h('div', { class: 'bp-face bp-front', html: frontHTML(p, u) });
        front.append(h('div', { class: 'bp-glint', style: { '--gd': (1.2 + (i % 3) * 0.7) + 's' } }));
        const back = h('div', { class: 'bp-face bp-back', html: backHTML(p, u + 'b') });
        flip.append(front, back); c.el.append(shadow, flip);
        c.flip = flip; c.shadow = shadow; c.front = front; c.back = back; addShades(c);
        const ph = front.querySelector('.bp-photo');
        c.tell = h('button', { type: 'button', class: 'bp-tell', 'aria-label': 'Spot the tell in this photo', style: { left: (p.tell[0] / 300 * 100) + '%', top: (p.tell[1] / 225 * 100) + '%', '--td': (1.6 + (i % 4) * 0.5) + 's' } });
        ph.append(c.tell);
        K.tap(c.tell, () => spotTell(c));
        bindCard(c);
        stage.append(c.el);
        return c;
      }
      // each face carries its own shade (a shared layer would sit in the same 3D plane as the faces and flicker)
      function addShades(c) { c.shades = [c.front, c.back].map(f => { const s = h('div', { class: 'bp-shade' }); f.append(s); return s; }); }
      function placeCard(c, instant) {
        const off = [0, 13, 24][c.slot] || 30, sc = [1, 0.955, 0.91][c.slot] || 0.88;
        if (instant) c.el.classList.add('bp-live');
        c.el.style.transform = 'translate3d(' + M.cx + 'px,' + (M.cy + off + (c.ty || 0)) + 'px,0) scale(' + (sc * (c.sc || 1)) + ')';
        c.el.style.zIndex = String(10 - c.slot);
        c.el.style.opacity = c.gone ? '0' : c.slot > 2 ? '0' : '1';
        if (instant) { void c.el.offsetWidth; c.el.classList.remove('bp-live'); }
      }
      function fillStack(from) {
        for (let k = from; k < Math.min(FEED.length, from + 3); k++) {
          if (G.cards.some(c => c.i === k)) continue;
          const c = makeCard(FEED[k], k);
          c.slot = k - from; c.ty = 70; c.el.style.opacity = '0'; G.cards.push(c);
          placeCard(c, true); c.ty = 0;
          S.later(() => placeCard(c), 30 + (k - from) * 70);
        }
      }

      /* ---------------- the flip: drag sideways, the card turns in 3D and springs to the nearer face ---------------- */
      function backShowing() { const a = ((FL.ang % 360) + 360) % 360; return a > 90 && a < 270; }
      function bindCard(c) {
        K.drag(c.el, {
          space: el,
          start: (p, e) => {
            if (G.cur !== c || !c.ready || G.locked || (e && e.target && e.target.closest && e.target.closest('.bp-tell'))) return false;
            FL.drag = { a0: FL.ang, x0: p.x, y0: p.y, hist: [{ t: now(), a: FL.ang }], moved: false };
            FL.vel = 0; c.el.style.cursor = 'grabbing';
            if (A.ctx) A.click({ vol: 0.05 });
          },
          move: (p, d) => {
            const D = FL.drag; if (!D) return;
            if (!D.moved && Math.abs(d.dx) > 6) { D.moved = true; sFwip(d.dx > 0 ? 1 : -1); K.guideDone(); }
            FL.ang = D.a0 + d.dx / M.cw * 190;
            FL.rx = clamp(-d.dy * 0.05, -9, 9);
            const tn = now(); D.hist.push({ t: tn, a: FL.ang }); while (D.hist.length > 2 && tn - D.hist[0].t > 90) D.hist.shift();
            FL.moving = true;
          },
          end: (p, d) => {
            const D = FL.drag; if (!D) return; FL.drag = null; c.el.style.cursor = '';
            const h0 = D.hist[0], h1 = D.hist[D.hist.length - 1], v = h1.t - h0.t > 8 ? (h1.a - h0.a) / ((h1.t - h0.t) / 1000) : 0;
            FL.vel = clamp(v, -2200, 2200);
            if (!D.moved) { FL.vel = (G.flipDir = -(G.flipDir || 1)) * 420; FL.target = FL.base; poke(c); return; } // a tap: the card wiggles to show it turns
            const proj = FL.ang - FL.base + FL.vel * 0.13;
            if (Math.abs(proj) > 80) { FL.target = FL.base + 180 * Math.sign(proj); if (Math.abs(FL.vel) > 900) { G.flicks++; K.pop('Flick!', { x: M.cx + M.cw / 2, y: M.cy - 6, kind: 'great' }); } }
            else FL.target = FL.base;
            FL.base = FL.target;
          }
        });
        S.listen(c.el, 'keydown', (e) => {
          if (G.cur !== c || !c.ready || G.locked) return;
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const dir = e.key === 'ArrowLeft' ? -1 : 1; FL.target = FL.base + 180 * dir; FL.base = FL.target; FL.vel = dir * 500; sFwip(dir); K.guideDone(); }
        });
      }
      function poke(c) { if (A.ctx) A.click({ vol: 0.08 }); P.emit('star', M.cx + M.cw / 2, M.cy + M.ch * 0.4, 5, { colors: ['#fff6d8', '#ffd166'] }); void c; }
      let lastFlipT = 0, wasBack = false;
      function stepFlip(tn) {
        const c = G.cur; if (!c) { lastFlipT = tn; return; }
        const dt = Math.min(0.05, Math.max(0.001, (tn - (lastFlipT || tn)) / 1000)); lastFlipT = tn;
        if (!FL.drag) {
          const k = reduced() ? 320 : 210, damp = 2 * Math.sqrt(k) * (reduced() ? 1 : 0.62);
          const acc = k * (FL.target - FL.ang) - damp * FL.vel;
          FL.vel += acc * dt; FL.ang += FL.vel * dt;
          FL.rx += (0 - FL.rx) * Math.min(1, dt * 10);
          if (Math.abs(FL.target - FL.ang) < 0.25 && Math.abs(FL.vel) < 4) { FL.ang = FL.target; FL.vel = 0; if (FL.moving) { FL.moving = false; settled(c); } }
          else FL.moving = true;
        }
        const tf = 'rotateX(' + FL.rx.toFixed(2) + 'deg) rotateY(' + FL.ang.toFixed(2) + 'deg)';
        if (tf !== FL.lastWrite) {
          FL.lastWrite = tf; c.flip.style.transform = tf;
          const a = FL.ang * Math.PI / 180, edge = (Math.abs(Math.sin(a)) * 0.42).toFixed(3);
          if (c.shades) c.shades.forEach(s => { s.style.opacity = edge; });
          c.shadow.style.transform = 'scaleX(' + Math.max(0.12, Math.abs(Math.cos(a))).toFixed(3) + ')';
        }
        const back = backShowing();
        if (back !== wasBack) { wasBack = back; c.el.classList.toggle('bp-onback', back); if (back && !c.revealed && G.phase !== 'yours') revealBack(c); }
      }
      function settled(c) {
        const back = backShowing();
        sLand(G.flipped + (back ? 0 : 2), back);
        const r = K.rectIn(c.el);
        P.emit('spark', r.x + 6, r.cy, 8, { colors: back ? ['#e8cda6', '#fff4c8'] : THEME.glow, angle: Math.PI, spread: 1.2 });
        P.emit('spark', r.x + r.w - 6, r.cy, 8, { colors: back ? ['#e8cda6', '#fff4c8'] : THEME.glow, angle: 0, spread: 1.2 });
        if (Math.abs(FL.base) >= 720) { const k = Math.round(FL.base / 360) * 360; FL.base -= k; FL.target -= k; FL.ang -= k; }
        if (G.phase === 'yours' && !back && G.canFlipYours && !G.yoursFlipped) yoursRevealed(c);
      }

      /* ---------------- tells ---------------- */
      function spotTell(c) {
        if (c.found || G.cur !== c || backShowing() || G.phase !== 'post') return;
        c.found = true; G.tells++;
        c.tell.classList.add('bp-found'); c.tell.setAttribute('aria-label', 'Tell spotted: ' + c.p.tell[2]);
        const ph = c.front.querySelector('.bp-photo');
        ph.append(h('div', { class: 'bp-tellnote', html: icon('eye') + '<span>Tell spotted: ' + esc(c.p.tell[2]) + '</span>' }));
        sTell(); S.buzz(10);
        const r = K.rectIn(c.tell); P.emit('star', r.cx, r.cy, 10, { colors: ['#fffbe6', '#ffd166'] });
        ctx.track('tell', { n: G.tells });
        say('patch', L(G.tells === 1 ? { Jolly: 'Sharp eye! Little clues that there’s more behind it.', Cheeky: 'Caught it. The highlight reel always leaks a bit.', Unfiltered: 'Tell spotted. There’s more behind it.' } : { Jolly: 'Another tell. You’re getting good at this.', Cheeky: 'Nothing gets past you.', Unfiltered: 'Spotted.' }), 'laugh', 2400);
        K.guide({ id: 'flip-after-tell', g: 'drag', target: c.el, dir: 'l', d: Math.min(120, M.cw * 0.34), oy: 0.3, label: 'NOW FLIP IT', delay: 900 });
      }

      /* ---------------- a post: look, (spot the tell), flip, read the outtakes, next ---------------- */
      const GLOSS = [
        { Jolly: 'Wow. Everyone’s just… effortless.', Cheeky: 'Cool cool cool. Everyone’s perfect.', Unfiltered: 'Looks flawless. Flip it.' },
        { Jolly: 'How does everyone else have it so together?', Cheeky: 'Another flawless one. Rude.', Unfiltered: 'Perfect again. Suspicious.' },
        { Jolly: 'I bet there’s a story behind this one too.', Cheeky: 'Smells like outtakes.', Unfiltered: 'There’s a back to this.' },
        { Jolly: 'Okay, this one looks really perfect.', Cheeky: 'Too perfect. Flip it before I feel bad.', Unfiltered: 'Glossy. Flip it.' }
      ];
      async function postStep(i) {
        G.phase = 'post'; G.idx = i;
        fillStack(i);
        const c = G.cards.find(x => x.i === i);
        G.cards.forEach(x => { if (x.i >= i) { x.slot = x.i - i; placeCard(x); } });
        G.cur = c; c.el.classList.remove('bp-peek'); c.el.setAttribute('tabindex', '0');
        FL.ang = 0; FL.base = 0; FL.target = 0; FL.vel = 0; FL.rx = 0; FL.lastWrite = ''; wasBack = false;
        await K.wait(i === 0 ? 300 : 420);
        c.ready = true; G.tellsSeen++;
        if (i === 0) say('sync', L(GLOSS[0]), 'worried', 3200);
        else if (i === 1) say('patch', L({ Jolly: 'Pro tip: posts have tells. Tap one before you flip, if you spot it.', Cheeky: 'Look closer. There’s always a tell.', Unfiltered: 'Spot the tell, then flip.' }), 'wink', 3800);
        else if (i % 2 === 0) say('sync', L(GLOSS[Math.min(GLOSS.length - 1, 1 + ((i / 2) | 0))]), i < 3 ? 'worried' : 'think', 2800);
        if (i === 1) { // show where a tell hides, once
          K.guide({ id: 'tell', g: 'tap', target: c.tell, label: 'SPOT THE TELL', delay: 600, place: 'below' });
          await waitFor(() => c.found || FL.moving || backShowing(), 3400);
        }
        K.guide({ id: 'flip' + i, g: 'drag', target: c.el, dir: i % 2 ? 'r' : 'l', d: Math.min(130, M.cw * 0.36), oy: 0.3, ms: 1400, label: i === 0 ? 'DRAG SIDEWAYS TO FLIP' : 'FLIP IT OVER', delay: i === 0 ? 1100 : 900 });
        await waitFor(() => c.revealed);
        K.guide(null);
        await K.wait(reduced() ? 600 : 1000);
        const nb = nextButton(i === FEED.length - 1 ? 'One more post' : 'Next post');
        K.guide({ id: 'next' + i, g: 'tap', target: nb, label: 'NEXT POST', delay: 1700 });
        await new Promise(res => { G.nextRes = res; });
        K.guide(null);
        c.ready = false; G.cur = null;
        exitCard(c);
      }
      function revealBack(c) {
        c.revealed = true; G.flipped++;
        c.el.classList.add('bp-shown');
        hudCount.querySelector('span').textContent = G.flipped + ' / ' + N; hudCount.classList.remove('bp-bump'); void hudCount.offsetWidth; hudCount.classList.add('bp-bump');
        if (c.p.kind === 'sheet') sBurst(12); else if (c.p.kind === 'notes') { for (let k = 0; k < c.p.out.notes.length; k++) sSlap(k); } else sWide();
        S.buzz([8, 30, 8]);
        ctx.track('flip', { n: G.flipped, kind: c.p.kind });
        const who = G.flipped === 1 ? 'sync' : ['patch', 'sync', 'patch', 'sync'][G.flipped % 4];
        S.later(() => { if (G.phase === 'post') say(who, L(c.p.react), G.flipped < 3 && who === 'sync' ? 'surprised' : 'laugh', 3200); }, 450);
        if (G.flipped >= 3) sync.base('happy');
      }
      function nextButton(label) {
        const b = h('button', { type: 'button', class: 'bp-btn', html: '<span>' + esc(label) + '</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 15V5M5 9.5l5-5 5 5" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
        actions.replaceChildren(b); G.nextBtn = b;
        K.tap(b, () => { if (!G.nextRes) return; const res = G.nextRes; G.nextRes = null; b.disabled = true; K.sfx.tap(); sPop(G.flipped); res(); });
        return b;
      }
      function exitCard(c) {
        actions.replaceChildren(); G.nextBtn = null;
        c.el.classList.add('bp-peek');
        const slot = slots[c.i];
        if (!M.phone && slot) {
          const sr = K.rectIn(slot), k = Math.min(sr.w / M.cw, sr.h / M.ch) * 1.15;
          c.el.style.transition = 'transform .6s cubic-bezier(.5,0,.2,1), opacity .35s ease .35s';
          c.el.style.transform = 'translate3d(' + (sr.cx - M.cw / 2) + 'px,' + (sr.cy - M.ch / 2) + 'px,0) scale(' + k.toFixed(3) + ') rotate(-4deg)';
          S.later(() => { slot.append(miniCard(c.p, false)); c.el.style.opacity = '0'; if (A.ctx) A.click({ vol: 0.08 }); }, 560);
        } else {
          const hr = K.rectIn(hudCount);
          c.el.style.transition = 'transform .55s cubic-bezier(.5,0,.3,1), opacity .4s ease .15s';
          c.el.style.transform = 'translate3d(' + (hr.cx - M.cw / 2) + 'px,' + (hr.cy - M.ch / 2) + 'px,0) scale(.08) rotate(-12deg)';
          c.el.style.opacity = '0';
        }
        if (A.ctx) A.whoosh({ vol: 0.08, dur: 0.35 });
        S.later(() => { c.el.remove(); G.cards = G.cards.filter(x => x !== c); }, 900);
        K.collect('out:' + c.p.id);
      }
      function miniCard(p, wave) {
        const u = nextId();
        const back = p.kind === 'sheet' ? sheetSVG(u + 'm', p.art, (p.id.length * 7919 + 13) >>> 0, 6) : p.kind === 'wide' ? wideSVG(u + 'm', p.art, { labels: false }) : '';
        const m = h('div', { class: 'bp-mini' + (wave ? ' bp-wave' : '') });
        m.append(h('div', { html: '<svg viewBox="0 0 300 225" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + ART[p.art](u, 1, rngOf(5), { tell: false, labels: false }) + '</svg>' }),
          h('div', { class: 'bp-mback', html: (back ? '<svg viewBox="0 0 300 225" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style="opacity:.55">' + back + '</svg>' : '') + '<b>' + esc(p.out.title) + '</b>' }));
        return m;
      }

      /* ---------------- the twist: your post arrives outtake side up ---------------- */
      function readWords() {
        const sp = Array.isArray(an.spans) ? an.spans.filter(x => x && typeof x.quote === 'string' && x.quote.trim()) : [];
        const cams = sp.filter(x => x.kind === 'camera').map(x => x.quote.trim()), brains = sp.filter(x => x.kind !== 'camera').map(x => x.quote.trim());
        const score = (q, i) => (/\b(never|always|everyone|nobody|everybody|better than|worse than|compared?|failure|loser|behind|stuck|not good enough|perfect|useless|stupid|hate|fired|ruin\w*|definitely|going to|gonna)\b|\w+['’]ll\b/i.test(q) ? 3 : 0) + (/\b(i|i'?m|i’m|my|me)\b/i.test(q) ? 1 : 0) + Math.min(2, q.split(/\s+/).length / 4) + i * 0.05;
        let hot = '', best = -1; brains.forEach((q, i) => { const s = score(q, i); if (s > best) { best = s; hot = q; } });
        return { cam: noWords ? '' : clip(cams[0] || '', 120), camAlt: noWords || cams[0] ? '' : clip(an.situation || '', 120), hot: noWords ? '' : clip(hot || '', 96), hotAlt: noWords || hot ? '' : clip(an.thought || an.conclusion || '', 96) };
      }
      function yoursBackHTML(w) {
        const sec = (lab, txt, user, cls) => '<div class="bp-sec' + (cls ? ' ' + cls : '') + '"><small>' + lab + '</small>' + (user ? '<span class="gk-user">' + esc(txt) + '</span>' : '<p' + (user === false ? ' class="bp-eg"' : '') + '>' + esc(txt) + '</p>') + '</div>';
        let s = '<div class="bp-tape">Behind the scenes</div><div class="bp-otitle">' + (noWords ? 'A day like this' : 'You, today') + '</div><div class="bp-ybody">';
        if (noWords) s += sec('What happened', 'Things didn’t go to plan.', false) + sec('In your head', 'A thought like “everyone else has it together.”', false, 'bp-head2');
        else {
          s += w.cam ? sec('What happened', w.cam, true) : w.camAlt ? sec('What happened', w.camAlt, null) : '';
          s += w.hot ? sec('In your head', w.hot, true, 'bp-head2') : w.hotAlt ? sec('In your head', w.hotAlt, null, 'bp-head2') : '';
          if (!w.cam && !w.camAlt && !w.hot && !w.hotAlt) s += sec('In your head', 'A thought like “everyone else has it together.”', false, 'bp-head2');
        }
        // the caption a kind friend would write under it (their own friend line when the AI read their words; never a joke in care mode)
        const friend = care() ? 'A hard day, and a real one. Worth proper help with the hard bit.' : strong() ? 'A real worry, and still not the whole day.' : an.source === 'ai' && an.friend ? clip(an.friend, 110) : 'One hard moment. Not the whole day, and not the whole you.';
        s += sec('What a friend would caption it', friend, null) + '</div>';
        return s + '<svg viewBox="0 0 300 60" aria-hidden="true" style="flex:none;opacity:.5;width:100%;height:40px"><circle cx="40" cy="30" r="20" fill="none" stroke="#8a5a2b" stroke-width="3"/><path d="M90 30 q20 -24 40 0 t40 0 t40 0 t40 0" stroke="#5a3a2a" stroke-width="2.4" fill="none"/></svg>';
      }
      function yoursFrontHTML() {
        const cap = care() ? 'Next: ask someone qualified about the hard bit.' : strong() && G.plan ? 'Next step: ' + G.plan : an.source === 'ai' && an.balanced ? clip(an.balanced, 110) : 'Both sides of a real day.';
        return '<div class="bp-in"><div class="bp-head"><span class="bp-av">' + avatarSVG('', 'you') + '</span><div class="bp-who"><b>you</b><i>' + SPARK + 'Highlights</i></div></div>' +
          '<div class="bp-hl"><b>Today’s highlights</b><span class="bp-stick" style="--r:-2deg">' + icon('eye') + 'Took a second look</span></div>' +
          '<div class="bp-cap" style="font-size:17px">' + esc(cap) + '</div><div class="bp-meta"><span class="bp-ylikes">' + SPARK + '0</span><span>#bothsides</span></div></div>';
      }
      async function yoursStep() {
        G.phase = 'yours'; G.idx = FEED.length; G.cur = null;
        const leads = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text);
        const lead = leads.find(l => l.kind === 'prepare') || leads.find(l => l.kind === 'ask');
        G.plan = lead ? clip(lead.text, 90) : '';
        hudFeed.textContent = 'Today’s feed · your post';
        say('patch', L({ Jolly: 'One more post in the feed… it’s yours.', Cheeky: 'Last post. Oh look, it’s you.', Unfiltered: 'Last one. Yours.' }), 'wink', 2600);
        const w = readWords();
        const u = nextId(), c = { p: { id: 'you', handle: 'you', cap: '' }, i: FEED.length, u, slot: 0, revealed: true, ready: false, el: null };
        c.el = h('div', { class: 'bp-card', role: 'button', tabindex: '0', 'aria-label': 'Your post, behind-the-scenes side up. Drag sideways, or press Enter, to flip it to the highlights.' });
        c.shadow = h('div', { class: 'bp-shadow' }); c.flip = h('div', { class: 'bp-flip' });
        c.front = h('div', { class: 'bp-face bp-front', html: yoursFrontHTML() });
        c.back = h('div', { class: 'bp-face bp-back', html: yoursBackHTML(w) });
        c.flip.append(c.front, c.back); c.el.append(c.shadow, c.flip); addShades(c);
        stage.append(c.el); bindCard(c); G.cards.push(c);
        FL.ang = 180; FL.base = 180; FL.target = 180; FL.vel = 0; FL.rx = 0; FL.lastWrite = ''; wasBack = true;
        c.ty = 90; c.el.style.opacity = '0'; placeCard(c, true); c.ty = 0; c.el.classList.add('bp-onback');
        G.cur = c;
        S.later(() => placeCard(c), 40);
        if (A.ctx) { A.whoosh({ vol: 0.1, dur: 0.5 }); A.pad(['A3', 'C4', 'E4'].map(n => A.note(n)), { dur: 3.2, vol: 0.1, attack: 0.5 }); }
        BED.vol = 0.55;
        await K.wait(reduced() ? 900 : 1600);
        say('drop', L(care() ? { Jolly: 'That’s a hard one to carry. Your behind-the-scenes counts too.', Cheeky: 'That’s a hard one to carry. Your behind-the-scenes counts too.', Unfiltered: 'Hard one. It still counts as your behind-the-scenes.' }
          : strong() ? { Jolly: 'This one is real, and it matters. Your day still held more than this.', Cheeky: 'Real stuff, not a blooper. Your day still held more.', Unfiltered: 'Real problem. The day still held more.' }
            : { Jolly: 'That’s your behind-the-scenes. Everyone has one. You just only see yours.', Cheeky: 'Your outtakes. Very normal. Everyone’s got a laundry mountain.', Unfiltered: 'Your behind-the-scenes. Everyone has one.' }), 'think', 4200);
        await K.wait(reduced() ? 1400 : 2600);
        // what made today's highlight reel? (only the player knows: they pick what's true)
        const pool = K.shuffle(WINS.filter(x => x.id !== 'kept'), K.rng((K.daily() * 7 + 3) >>> 0)).slice(0, 5).concat(WINS.filter(x => x.id === 'kept'));
        const ask = h('div', { class: 'bp-ask', text: 'What made today’s highlight reel? Tap anything that’s true.' });
        const grid = h('div', { class: 'bp-chips', role: 'group', 'aria-label': 'Small wins from today' });
        G.chips = pool.map((wn, k) => {
          const b = h('button', { type: 'button', class: 'bp-chip', 'aria-pressed': 'false', style: { '--i': String(k) }, html: icon(wn.i) + '<span>' + esc(wn.t) + '</span>' });
          K.tap(b, () => pickWin(wn, b, c));
          grid.append(b); return b;
        });
        actions.replaceChildren(ask, grid);
        placeTwist(c, true);
        say('patch', L({ Jolly: 'Now the other side. What made today’s highlight reel? Only you know.', Cheeky: 'Now find the highlights. Small ones count. Tiny ones count double.', Unfiltered: 'Find today’s highlights. Small counts.' }), 'happy', 4000);
        K.guide({ id: 'wins', g: 'choose', target: () => G.chips.slice(0, 2), label: 'TAP WHAT’S TRUE', delay: 1400 });
        await waitFor(() => G.picks.length > 0);
        G.canFlipYours = true; c.ready = true;
        K.guide({ id: 'flipyours', g: 'drag', target: c.el, dir: 'r', d: Math.min(120, M.cw * 0.32), oy: 0.3, label: 'FLIP TO YOUR HIGHLIGHTS', delay: 1300 });
        await waitFor(() => G.yoursFlipped);
        K.guide(null);
        await K.wait(reduced() ? 900 : 1700);
        const b = h('button', { type: 'button', class: 'bp-btn', html: SPARK.replace('<svg', '<svg style="width:20px;height:20px"') + '<span>Post both sides</span>' });
        actions.replaceChildren(b); G.postBtn = b;
        let go; const posted = new Promise(res => { go = res; });
        K.tap(b, () => { if (b.disabled) return; b.disabled = true; K.sfx.great(); go(); });
        say('patch', L({ Jolly: 'Post the real version? Both sides?', Cheeky: 'Post it. Both sides. Very brave, very rare.', Unfiltered: 'Post both sides.' }), 'love', 3000);
        K.guide({ id: 'post', g: 'tap', target: b, label: 'POST BOTH SIDES', delay: 1300 });
        await posted;
        K.guide(null);
        return c;
      }
      function placeTwist(c, shrink) {
        // the card makes room for the wins: smaller on a phone, beside them on a wide screen
        if (M.phone && shrink) { c.sc = 0.74; c.ty = -M.ch * 0.13; actions.style.top = (M.cy + M.ch * 0.74 + 10) + 'px'; }
        else { c.sc = 1; c.ty = 0; actions.style.top = (M.cy + M.ch + 22) + 'px'; }
        placeCard(c);
      }
      function pickWin(wn, b, c) {
        if (G.phase !== 'yours' || G.yoursFlipped) return;
        const on = b.getAttribute('aria-pressed') === 'true';
        if (!on && G.picks.length >= 3) { K.sfx.soft(); b.animate && !reduced() && b.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 220 }); return; }
        b.setAttribute('aria-pressed', String(!on));
        if (on) { G.picks = G.picks.filter(x => x !== wn); c.front.querySelectorAll('.bp-stick[data-w="' + wn.id + '"]').forEach(x => x.remove()); K.sfx.soft(); return; }
        G.picks.push(wn); K.guideDone();
        const hl = c.front.querySelector('.bp-hl');
        hl.append(h('span', { class: 'bp-stick bp-new', 'data-w': wn.id, style: { '--r': [2, -3, 3][G.picks.length % 3] + 'deg' }, html: icon(wn.i) + esc(wn.t) }));
        sPop(G.picks.length + 2); if (A.ctx) A.chime(A.note(PENTA[2 + G.picks.length]), { vol: 0.06, dur: 1 });
        const r = K.rectIn(b), cr = K.rectIn(c.el);
        P.emit('star', r.cx, r.cy, 8, { colors: ['#fffbe6', '#ffd166', '#ff9fd1'] });
        P.emit('mote', cr.x + cr.w * (0.2 + Math.random() * 0.6), cr.y + 10, 6, { colors: ['#fff4c2', '#ffd166'] });
        ctx.track('win', { n: G.picks.length });
      }
      function yoursRevealed(c) {
        G.yoursFlipped = true; c.ready = false;
        placeTwist(c, false);
        actions.replaceChildren();
        BED.vol = 1.1;
        if (A.ctx) { const t = A.now(); A.pad(['F3', 'A3', 'C4', 'E4', 'G4'].map(n => A.note(n)), { dur: 4, vol: 0.16, attack: 0.3 }); ['C6', 'E6', 'G6', 'C7'].forEach((n, k) => A.chime(A.note(n), { when: t + 0.1 + k * 0.08, vol: 0.07, dur: 1.6 })); A.sync('highlights', at()); }
        const r = K.rectIn(c.el);
        P.emit('confetti', r.cx, r.y + 20, [24, 36, 52][inten] || 36, { colors: THEME.glow.concat(['#ffffff', '#ffd166']), angle: -Math.PI / 2, spread: 2.2, speed: [140, 340] });
        S.buzz([10, 40, 20]);
        ctx.track('yours', { picks: G.picks.length });
        say('sync', L({ Jolly: 'Look at that. Highlights! They were there all along.', Cheeky: 'Wait, you have a highlight reel too? Shocking.', Unfiltered: 'Highlights. Real ones.' }), 'celebrate', 3200);
        const likes = c.front.querySelector('.bp-ylikes');
        [0, 1, 2].forEach(k => S.later(() => { if (likes) likes.innerHTML = SPARK + String(k + 1); sPop(k); }, 700 + k * 380));
      }

      /* ---------------- finale: the real feed ---------------- */
      async function finale(c) {
        G.phase = 'final'; G.cur = null;
        actions.replaceChildren(); G.postBtn = null;
        hudFeed.textContent = 'The real feed'; hud.style.opacity = '0.0';
        c.el.style.transition = 'transform .5s cubic-bezier(.5,0,.3,1), opacity .4s ease';
        c.el.style.opacity = '0'; c.el.style.transform += ' scale(.9)';
        S.later(() => { c.el.remove(); G.cards = G.cards.filter(x => x !== c); }, 600);
        BED.vol = 1.15;
        const fin = h('div', { class: 'bp-final' });
        G.final = fin;
        const banner = h('div', { class: 'bp-banner' }, h('b', { text: 'Everyone’s got outtakes' }), h('small', { text: 'The real feed · every post, both sides' }));
        const picks = G.picks.slice(0, 3).map(x => x.t);
        const yours = h('div', { class: 'bp-yours' },
          h('div', { class: 'bp-yf' }, h('small', { text: 'Highlights' }), h('b', { text: 'You, today' }), ...['Took a second look'].concat(picks).slice(0, 3).map(t => h('span', { text: '✓ ' + t }))),
          h('div', { class: 'bp-yb' }, h('small', { text: 'Behind the scenes' }), h('b', { text: noWords ? 'A day like this' : 'The messy bit' }), h('span', { text: noWords ? 'Things didn’t go to plan.' : 'The part nobody posts. You did.' })));
        const comments = h('div', { class: 'bp-comments' });
        fin.append(banner, yours, comments);
        if (M.phone) { // the feed, both sides, turning over in a wave under your post
          const album = h('div', { class: 'bp-album', 'aria-hidden': 'true' });
          FEED.slice(0, 4).forEach((p, k) => { const m = miniCard(p, !reduced()); m.style.setProperty('--wd', (0.6 + k * 0.14) + 's'); album.append(m); });
          fin.append(album);
          if (!reduced()) FEED.slice(0, 4).forEach((p, k) => S.later(() => { if (A.ctx) A.pluck(A.note(PENTA[k % PENTA.length]), { vol: 0.1, damp: 0.995, verb: 0.3 }); }, 600 + k * 140));
        }
        el.append(fin);
        placeFinal();
        sync.base('celebrate'); patch.base('love');
        if (A.ctx) { const t = A.now(); A.pad(['C4', 'E4', 'G4', 'B4', 'D5'].map(n => A.note(n)), { dur: 6, vol: 0.18, attack: 0.6 }); ['G5', 'C6', 'E6', 'G6', 'C7'].forEach((n, k) => A.chime(A.note(n), { when: t + 0.3 + k * 0.12, vol: 0.06, dur: 2 })); A.sync('finale', at()); }
        S.later(() => { const yr = K.rectIn(yours); P.emit('star', yr.cx, yr.cy, 24, { colors: ['#fffbe6', '#ffd166', '#ff9fd1'], speed: [80, 260] }); P.emit('confetti', yr.cx, yr.y, [26, 40, 56][inten] || 40, { colors: THEME.glow.concat(['#ffffff', '#ffd166']), angle: -Math.PI / 2, spread: 2.6, speed: [160, 360] }); }, 500);
        // the wall turns over in a wave: every post, both sides
        if (!M.phone && !reduced()) slots.forEach((s, k) => S.later(() => { const m = s.querySelector('.bp-mini'); if (m) { m.style.setProperty('--wd', '0s'); m.classList.remove('bp-wave'); void m.offsetWidth; m.classList.add('bp-wave'); if (A.ctx) A.pluck(A.note(PENTA[k % PENTA.length]), { vol: 0.1, damp: 0.995, verb: 0.3 }); } }, 400 + k * 140));
        const COM = [
          { who: 'patch', mood: 'love', line: { Jolly: 'Both sides of the story. Best post in the feed.', Cheeky: 'Unfiltered and still the best post here.', Unfiltered: 'Both sides. That’s the real post.' } },
          { who: 'sync', mood: 'celebrate', line: { Jolly: 'The messy side makes the highlights mean more.', Cheeky: 'Sparkling this twice. Is that allowed?', Unfiltered: 'Messy side, good side. Both real.' } },
          { who: 'drop', mood: 'love', line: care() ? { Jolly: 'Someone qualified can help with the hard bit. You don’t have to sort it alone.', Cheeky: 'Someone qualified can help with the hard bit. You don’t have to sort it alone.', Unfiltered: 'Get proper help with the hard bit.' }
            : strong() ? { Jolly: 'Real worry, real plan, and a day with good bits in it.', Cheeky: 'Real worry, real plan. Strong post.', Unfiltered: 'Real worry. Plan it. Good bits too.' }
              : an.source === 'ai' && an.friend ? { Jolly: clip(an.friend, 120), Cheeky: clip(an.friend, 120), Unfiltered: clip(an.friend, 120) }
                : { Jolly: 'You’d never judge a friend by their outtakes. Same rule for you.', Cheeky: 'Your behind-the-scenes looks like everyone’s. Welcome to the club.', Unfiltered: 'Everyone’s got outtakes. Including you.' } }
        ];
        const NAMES = { patch: 'Patch', sync: 'Sync', drop: 'Drop' };
        COM.forEach((cm, k) => S.later(() => {
          comments.append(h('div', { class: 'bp-com' }, h('img', { alt: '', src: K.face(cm.who, cm.mood) }), h('p', null, h('b', { text: NAMES[cm.who] }), document.createTextNode(L(cm.line))), h('span', { html: SPARK })));
          sPop(k + 3); placeFinal(); S.later(collectGlows, 60);
        }, 1100 + k * 900));
        S.later(() => { patch.show(false); sync.show(false); drop.show(false); }, 200);
        S.later(() => { say('patch', L({ Jolly: 'Same feed. Now you can see all of it.', Cheeky: 'Same feed. Way more honest.', Unfiltered: 'Whole feed. Both sides.' }), 'celebrate', 0); }, 1100 + COM.length * 900 + 300);
        S.later(collectGlows, 700);
        await K.wait(1100 + COM.length * 900 + (reduced() ? 2400 : 4200));
        finish();
      }
      function placeFinal() {
        const fin = G.final; if (!fin) return;
        if (M.phone) Object.assign(fin.style, { left: '16px', right: '16px', width: 'auto', top: '72px', bottom: (M.CH + 30) + 'px' });
        else { const w = Math.min(560, M.wallX - 60); Object.assign(fin.style, { left: Math.round((M.wallX - w) / 2) + 'px', right: 'auto', width: w + 'px', top: '84px', bottom: (M.CH + 30) + 'px' }); }
      }
      function collectGlows() {
        const list = [];
        const add = (node, c) => { if (!node || !node.isConnected) return; const r = K.rectIn(node); if (r.w > 4) list.push({ x: r.x, y: r.y, w: r.w, h: r.h, c }); };
        if (G.final) add(G.final.querySelector('.bp-yours'), '#ffd166');
        slots.forEach((s, k) => add(s.querySelector('.bp-mini'), THEME.glow[k % 3]));
        if (G.final) Array.from(G.final.querySelectorAll('.bp-album .bp-mini')).forEach((m, k) => add(m, THEME.glow[k % 3]));
        G.glows = list;
      }
      function finish() {
        if (G.finished) return; G.finished = true; G.phase = 'done';
        const n = G.flipped, ratio = n ? G.tells / n : 0;
        const best = K.best('tells', G.tells, 'higher'), tier = K.tier(ratio, [0.2, 0.5, 0.8]);
        const outs = K.collection().filter(x => String(x).indexOf('out:') === 0).length;
        const badges = [];
        if (G.tells) badges.push((best.isNew ? 'New best: ' : '') + G.tells + ' tell' + (G.tells === 1 ? '' : 's') + ' spotted');
        if (tier) badges.push(tier + ' eye');
        badges.push('Outtakes album: ' + Math.min(outs, POSTS.length) + '/' + POSTS.length);
        if (G.flicks) badges.push(G.flicks + ' clean flick' + (G.flicks === 1 ? '' : 's'));
        ctx.finish({
          title: 'Everyone’s got outtakes', mood: 'celebrate',
          lines: ['Flipped ' + n + ' perfect posts: every one had outtakes', 'Your day: ' + (G.picks.length + 1) + ' highlight' + (G.picks.length ? 's' : '') + ' found', 'Today’s feed: ' + THEME.name + '. Tomorrow’s is different.'],
          share: 'Flipped ' + n + ' perfect posts. Everyone’s got outtakes.',
          badges: badges.slice(0, 4)
        });
      }

      /* ---------------- flow ---------------- */
      function waitFor(fn, ms) { return new Promise(res => { const t0 = now(); const tick = () => { if (fn() || (ms && now() - t0 > ms)) res(); else S.later(tick, 70); }; tick(); }); }
      if (ctx.analysisReady && typeof ctx.analysisReady.then === 'function') ctx.analysisReady.then((a) => { if (a && typeof a === 'object' && G.phase !== 'yours' && G.phase !== 'final' && G.phase !== 'done') an = a; }, () => {});
      layout();
      fillStack(0);
      (async () => {
        await K.intro({ title: 'Behind the Post', sub: 'Every feed is a highlight reel. Let’s turn the posts over.', how: 'Drag a post sideways to flip it. Then flip your own day.', char: 'patch', mood: 'wink' });
        for (let i = 0; i < FEED.length; i++) await postStep(i);
        const c = await yoursStep();
        await finale(c);
      })();

      return {
        async autoplay() {
          const wait = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(100); return fn(); };
          const flipCard = async (c, rightward) => {
            for (let tries = 0; tries < 4; tries++) {
              const r = c.el.getBoundingClientRect(), sc = K.scaleOf(c.el), w = r.width / sc, hh = r.height / sc;
              const a = { x: w * (rightward ? 0.2 : 0.8), y: hh * 0.55 }, b = { x: w * (rightward ? 0.95 : 0.05), y: hh * 0.6 };
              await K.sim.drag(c.el, a, b, 300, 5);
              if (await wait(() => (G.phase === 'yours' ? G.yoursFlipped : c.revealed), 2400)) return;
            }
          };
          for (let i = 0; i < FEED.length; i++) {
            await wait(() => G.phase === 'post' && G.idx === i && G.cur && G.cur.ready, 30000);
            const c = G.cur; await K.wait(450);
            if (i % 2 === 1 && c.tell) { await K.sim.tap(c.tell); await K.wait(350); }
            await flipCard(c, i % 2 === 1);
            await wait(() => G.nextBtn && !G.nextBtn.disabled, 8000);
            await K.wait(600);
            if (G.nextBtn) await K.sim.tap(G.nextBtn);
            await wait(() => G.idx > i || G.phase !== 'post', 6000);
          }
          await wait(() => G.phase === 'yours' && G.chips.length, 30000);
          await K.wait(800);
          await K.sim.tap(G.chips[0]); await K.wait(350); await K.sim.tap(G.chips[2]);
          await wait(() => G.canFlipYours, 4000);
          await K.wait(400);
          await flipCard(G.cur, true);
          await wait(() => G.postBtn, 9000);
          await K.wait(600);
          if (G.postBtn) await K.sim.tap(G.postBtn);
          await wait(() => G.finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
