/* Build the claude.ai artifact version of Reflect: index.html (+ reflect.js + the Bubble art it uses).
 * Live multiplayer runs over the artifact's `room` capability (topics rf.c / rf.s opened to Contributors);
 * the share card saves through `downloads`. */
const fs = require('fs');
const path = require('path');

function moodsFrom(src) {
  const block = src.match(/export const MOODS[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
  const out = new Set();
  block[1].split('\n').forEach(line => {
    const m = line.match(/^\s*(\w+):\s*\{(.*)\}/);
    if (m) [...m[2].matchAll(/'(E\d+)'/g)].forEach(x => out.add(m[1] + '_' + x[1]));
  });
  return [...out].sort();
}

function page(opts) {
  return `<title>ThinkStill Reflect</title>
<style>
  :root { color-scheme: dark; --bg: #0f0d1f; --fg: #f5f1ff; }
  html, body { height: 100%; background: var(--bg); color: var(--fg); margin: 0; overscroll-behavior: none; }
  #app { position: fixed; inset: 0; }
  .boot { position: fixed; inset: 0; display: grid; place-items: center; font: 600 16px system-ui, sans-serif; color: rgba(245,241,255,.7); }
</style>
<div id="app"><div class="boot">Loading Reflect…</div></div>
<script src="reflect.js"></script>
<script>
(function () {
  var ARTIFACT_URL = ${JSON.stringify(opts.artifactUrl || '')};
  var app = document.getElementById('app');
  app.innerHTML = '';
  var hasClaude = !!(window.claude && typeof window.claude.use === 'function');
  var live = hasClaude ? window.claude.use('room').catch(function () { return null; }) : null;
  var dl = hasClaude ? window.claude.use('downloads').catch(function () { return null; }) : Promise.resolve(null);
  var m = /^#r-([A-Z2-9]{5})$/.exec(location.hash || '');
  window.__mount = ThinkStillReflect.mount(app, {
    assetBase: 'img/',
    liveRoom: live || undefined,
    room: m ? m[1] : undefined,
    inviteUrl: function (code) { return ARTIFACT_URL ? ARTIFACT_URL + '#r-' + code : 'Room code: ' + code; },
    download: function (name, blob) {
      return dl.then(function (d) {
        if (!d) return false;
        return d.save({ filename: name, data: blob }).then(function () { return true; }, function () { return false; });
      });
    }
  });
})();
</script>`;
}

function build(js, DIST, REPO, args) {
  const out = path.join(DIST, 'artifact');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, 'img'), { recursive: true });
  const ui = args.indexOf('--artifact-url');
  const artifactUrl = ui >= 0 ? args[ui + 1] : '';
  fs.writeFileSync(path.join(out, 'index.html'), page({ artifactUrl }));
  fs.writeFileSync(path.join(out, 'reflect.js'), js);
  const keys = moodsFrom(fs.readFileSync(path.join(DIST, '..', 'src/actor/faces.ts'), 'utf8'));
  const files = { 'reflect.js': 'reflect.js' };
  let bytes = Buffer.byteLength(js);
  for (const k of keys) {
    const src = path.join(REPO, 'bubble-expressions', k + '.webp');
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(out, 'img', k + '.webp'));
    files['img/' + k + '.webp'] = 'img/' + k + '.webp';
    bytes += fs.statSync(src).size;
  }
  fs.writeFileSync(path.join(out, 'files.json'), JSON.stringify(files, null, 1));
  console.log('artifact:', Object.keys(files).length, 'files,', (bytes / 1048576).toFixed(2), 'MB');
}
module.exports = { build, moodsFrom };
