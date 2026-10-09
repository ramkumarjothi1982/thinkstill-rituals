#!/usr/bin/env node
/* ThinkStill games build.
 *
 * Turns the source (shared engine, kit, console, analysis and the game modules in games-<mode>/) into:
 *
 *   games/cdn/<mode>/<id>.<hash>.js        one minified file per game, loaded on first play. Content-hashed and
 *                                          committed, so a fixed commit on jsDelivr serves it forever.
 *   games/cdn/<mode>/catalog.json          the game list (metadata only) the console routes with.
 *   games/framer/<Component>.tsx           the Framer code components: engine + console + catalog, games lazy.
 *   games/dist/<mode>-console.html         a single page that runs the same build anywhere (games from the CDN).
 *   games/dist/artifact/<mode>/            the claude.ai artifact: page + g/<game>.js + img/<face>.webp, all
 *                                          relative, because an artifact cannot load scripts or images from GitHub.
 *
 * Usage:
 *   node games/tools/build.js [--ref <git ref for jsDelivr>] [--check]
 *     --ref    commit (or branch) the Framer/standalone builds load games from. Default: the current commit when it
 *              already contains every game file, otherwise the current branch.
 *     --check  verify that every game file exists at --ref in git (run after committing games/cdn).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const cp = require('child_process');

const need = (m) => require(require.resolve(m, { paths: [__dirname, '/opt/npm-tools/node_modules'] }));
const esbuild = need('esbuild');

const GAMES = path.resolve(__dirname, '..');
const REPO = path.resolve(GAMES, '..');
const OWNER_REPO = 'ramkumarjothi1982/thinkstill-rituals';
const ASSET_BASE = `https://raw.githubusercontent.com/${OWNER_REPO}/main/bubble-expressions/`;
const MODES = ['reset', 'reframe'];
const ENGINE = ['shared/ts-core.js', 'shared/ts-audio.js', 'shared/ts-ai.js', 'shared/ts-safety.js', 'shared/ts-ui.js', 'kit/kit.js'];
const CSS_FILES = [['ts-ui', 'shared/ts-ui.css'], ['kit', 'kit/kit.css'], ['arcade', 'arcade/arcade.css']];
const COMPONENT = { reset: 'ThinkStillResetArcade', reframe: 'ThinkStillReframeArcade' };
const TITLE = { reset: 'ThinkStill Reset Arcade', reframe: 'ThinkStill Reframe Arcade' };
const BLURB = {
  reset: 'Change your state in about two minutes: short, physical games picked from what you type.',
  reframe: 'Change the story, keep the facts: investigation games that test a thought against the evidence.'
};
const CAST = ['loopie', 'glitch', 'patch', 'drop', 'rush', 'still', 'sync'];
const CATALOG_KEYS = ['id', 'mode', 'name', 'verb', 'family', 'minutes', 'parents', 'cast', 'poster', 'tagline', 'why', 'flagship', 'needs', 'tags'];
const TARGET = ['es2020', 'safari15', 'chrome90', 'firefox90']; // iOS 15+: esbuild cannot lower a Safari 14 destructuring bug

const args = process.argv.slice(2);
const argVal = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const CHECK = args.includes('--check');

const rel = (p) => path.join(GAMES, p);
const read = (p) => fs.readFileSync(rel(p), 'utf8');
/* The console's routing map (Reset DNA parents -> families) is the source of truth for parents and families. */
const PARENT_FAMILY = (() => {
  const m = read('arcade/arcade.js').match(/const PARENT_FAMILY = (\{[\s\S]*?\});/);
  return vm.runInNewContext('(' + m[1] + ')');
})();
const FAMILIES = [...new Set(Object.values(PARENT_FAMILY))].concat(['EXPLORE']);
const write = (p, text) => { fs.mkdirSync(path.dirname(rel(p)), { recursive: true }); fs.writeFileSync(rel(p), text); };
const git = (...a) => { try { return cp.execFileSync('git', a, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (e) { return ''; } };
const inGit = (ref, file) => cp.spawnSync('git', ['cat-file', '-e', `${ref}:${file}`], { cwd: REPO }).status === 0;
const sha = (s, n) => crypto.createHash('sha256').update(s).digest('hex').slice(0, n || 10);
const kb = (n) => (n / 1024).toFixed(1) + ' KB';
const errors = [];
const fail = (msg) => errors.push(msg);

function minifyJs(code, name) {
  try {
    return esbuild.transformSync(code, { loader: 'js', minify: true, target: TARGET, legalComments: 'none' }).code;
  } catch (e) {
    throw new Error(name + ': ' + (e.errors || []).map(x => x.text + (x.location ? ' @' + x.location.line + ':' + x.location.column : '')).join('; '));
  }
}
function minifyCss(code, name) {
  try { return esbuild.transformSync(code, { loader: 'css', minify: true, target: TARGET }).code; } catch (e) { throw new Error(name + ': ' + e.message); }
}
/* Every source file is "(function (env) { ... })(window.TSG_ENV);" — the build swaps the global for a parameter. */
function rebind(src, name, to) {
  const n = src.split('window.TSG_ENV').length - 1;
  if (n !== 1) throw new Error(name + ': expected exactly one window.TSG_ENV, found ' + n);
  return src.replace('window.TSG_ENV', to);
}

/* ---------------- game metadata, read by running the module against a stub engine ---------------- */
function stub() {
  const p = new Proxy(function () {}, {
    get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === Symbol.iterator ? function* () {} : k === 'then' ? undefined : k === 'length' ? 0 : p),
    apply: () => p, construct: () => p, set: () => true, has: () => true
  });
  return p;
}
function readGame(mode, file) {
  const src = read(`games-${mode}/${file}`);
  const env = { games: [], TS: stub() };
  const s = stub();
  const sandbox = { __tsgEnv: env, window: s, document: s, navigator: s, location: s, localStorage: s, performance: { now: () => 0 },
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    Image: function () {}, Audio: function () {}, console: { log() {}, warn() {}, error() {}, info() {} } };
  vm.runInNewContext(rebind(src, file, '__tsgEnv'), sandbox, { filename: file, timeout: 3000 });
  if (env.games.length !== 1) throw new Error(`${file}: registers ${env.games.length} games (expected 1)`);
  const def = env.games[0];
  const num = (file.match(/^(\d+)-/) || [])[1];
  const slug = file.replace(/^\d+-/, '').replace(/\.js$/, '');
  const where = `${mode}/${file}`;
  if (def.id !== slug) fail(`${where}: id "${def.id}" does not match the file name "${slug}"`);
  if (def.mode !== mode) fail(`${where}: mode "${def.mode}"`);
  if (typeof def.mount !== 'function') fail(`${where}: no mount()`);
  ['name', 'verb', 'family', 'tagline', 'why'].forEach(k => { if (typeof def[k] !== 'string' || !def[k].trim()) fail(`${where}: missing ${k}`); });
  if (!Array.isArray(def.parents) || !def.parents.length || def.parents.some(x => typeof x !== 'string')) fail(`${where}: parents must be a non-empty list`);
  else def.parents.forEach(x => { if (!PARENT_FAMILY[x]) fail(`${where}: unknown parent "${x}"`); });
  if (!Array.isArray(def.cast) || !def.cast.length || def.cast.some(c => !CAST.includes(c))) fail(`${where}: cast must list bubble characters`);
  if (!def.poster || !CAST.includes(def.poster.char)) fail(`${where}: poster.char`);
  if (typeof def.minutes !== 'number') fail(`${where}: minutes`);
  if (!FAMILIES.includes(def.family)) fail(`${where}: unknown family "${def.family}" (known: ${FAMILIES.join(', ')})`);
  const meta = {};
  CATALOG_KEYS.forEach(k => { if (def[k] != null && typeof def[k] !== 'function') meta[k] = JSON.parse(JSON.stringify(def[k])); });
  meta.n = Number(num) || 0;
  return { file, src, meta };
}

/* ---------------- expression art a build needs (the artifact can only show what it ships) ---------------- */
function kitMoods() {
  const kit = read('kit/kit.js');
  const block = kit.match(/const MOODS = \{([\s\S]*?)\n {2}\};/);
  const moods = {};
  block[1].split('\n').forEach(line => {
    const m = line.match(/^\s*(\w+): \{(.*)\}/);
    if (m) moods[m[1]] = Object.fromEntries([...m[2].matchAll(/(\w+): '(E\d+)'/g)].map(x => [x[1], x[2]]));
  });
  return moods;
}
function facesFor(mode, games) {
  const moods = kitMoods();
  const keys = new Set();
  Object.keys(moods).forEach(slug => Object.values(moods[slug]).forEach(e => keys.add(slug + '_' + e)));
  const CH = CAST.join('|');
  const scan = (s, pairBare) => {
    for (const m of s.matchAll(new RegExp(`(${CH})_(E\\d+)`, 'g'))) keys.add(m[1] + '_' + m[2]);
    for (const m of s.matchAll(new RegExp(`['"](${CH})['"]\\s*,\\s*['"](E\\d+)['"]`, 'g'))) keys.add(m[1] + '_' + m[2]);
    for (const m of s.matchAll(new RegExp(`char:\\s*['"](${CH})['"]\\s*,\\s*mood:\\s*['"](E\\d+)['"]`, 'g'))) keys.add(m[1] + '_' + m[2]);
    if (!pairBare) return;
    const codes = new Set([...s.matchAll(/['"](E\d{2,3})['"]/g)].map(m => m[1]));
    const chars = new Set([...s.matchAll(new RegExp(`['"](${CH})['"]`, 'g'))].map(m => m[1]));
    chars.forEach(c => codes.forEach(e => keys.add(c + '_' + e)));
  };
  ['arcade/arcade.js', 'shared/ts-ui.js', `arcade/analysis-${mode}.js`].forEach(f => scan(read(f), false));
  games.forEach(g => scan(g.src, true));
  const have = [...keys].filter(k => fs.existsSync(path.join(REPO, 'bubble-expressions', k + '.webp'))).sort();
  const fallback = Object.fromEntries(Object.keys(moods).map(s => [s, moods[s].neutral || 'E01']));
  return { list: have, fallback, missing: [...keys].filter(k => !have.includes(k)) };
}

/* ---------------- build ---------------- */
function engineFor(mode) {
  const files = ENGINE.concat([`arcade/analysis-${mode}.js`, 'arcade/arcade.js']);
  const body = files.map(f => `/* ${f} */\n` + rebind(read(f), f, '__tsgEnv')).join('\n');
  const code = minifyJs(`var tsgBoot = function (__tsgEnv) {\n${body}\n};`, 'engine-' + mode);
  if (!/^var tsgBoot=function\(/.test(code)) throw new Error('engine wrapper was renamed by the minifier');
  return code.trim().replace(/;$/, '');
}
function cssBundle() {
  const out = {};
  CSS_FILES.forEach(([k, f]) => { out[k] = minifyCss(read(f), f).trim(); });
  return out;
}
function gameBundle(mode, g) {
  const key = `${mode}/${g.meta.id}`;
  const code = minifyJs(`(window.__tsgGame = window.__tsgGame || {})[${JSON.stringify(key)}] = function (__tsgEnv) {\n${rebind(g.src, g.file, '__tsgEnv')}\n};`, key);
  const file = `${g.meta.id}.${sha(code)}.js`;
  return { file, code: `/* ThinkStill ${mode} game: ${g.meta.name}. Generated by games/tools/build.js. */\n` + code };
}
/* Embedding the engine straight into a .tsx: confirm the TypeScript parser reads it exactly as JavaScript does
   (the classic trap is a<b>(c), which TSX would read as a generic call). */
function tsxSafe(code) {
  const js = esbuild.transformSync(code, { loader: 'js', minify: true }).code;
  const ts = esbuild.transformSync(code, { loader: 'tsx', minify: true }).code;
  return js === ts;
}

function jsdelivrBase(ref, mode) { return `https://cdn.jsdelivr.net/gh/${OWNER_REPO}@${ref}/games/cdn/${mode}/`; }

function framerTsx(mode, o) {
  const name = COMPONENT[mode];
  const ids = o.catalog.map(c => c.id);
  const engine = o.tsxSafe ? o.engine : `var tsgBoot = new Function("__tsgEnv", ${JSON.stringify(o.engine.replace(/^var tsgBoot=function\(__tsgEnv\)\{/, '').replace(/\}$/, ''))});`;
  return `// @ts-nocheck
/*
 * ${TITLE[mode]} — Framer code component (${o.catalog.length} games).
 * ${BLURB[mode]}
 *
 * Generated by games/tools/build.js from the ThinkStill games source at ${o.source}. Edit the source, not this file.
 * This file holds the engine, the console and the game list. Each game's code loads the first time someone plays it,
 * from Game Base URL (jsDelivr serving the repository at a fixed commit); the bubble-character art loads from
 * Asset Base URL (the same GitHub folder the Release and Reset consoles use).
 *
 * Shares the existing ThinkStill keys: theme (__ts_chat_theme_v181), momentum XP (__ts_thinkstill_experience_v1),
 * shift ratings (__ts_shift_records_v1), growth events (__ts_growth_events_v1) and shared avatars/music.
 * AI: set AI Endpoint to the ThinkStill AI proxy (POST {game, tier, prompt} -> {text}); without it every game runs on
 * its built-in local engine, so play never blocks.
 */
import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

const MODE = "${mode}"
const GAME_BASE = ${JSON.stringify(o.gameBase)}
const ASSET_BASE = ${JSON.stringify(ASSET_BASE)}
const CSS = ${JSON.stringify(o.css)}
const CATALOG = ${JSON.stringify(o.catalog)}

${engine}

const clean = (v) => (typeof v === "string" ? v.trim() : "")
function renderTarget() {
    try {
        const t = RenderTarget.current()
        return t === RenderTarget.canvas || t === RenderTarget.thumbnail || t === RenderTarget.export ? "static" : "live"
    } catch (e) {
        return "live"
    }
}
const LIVE_KEYS = [["vibe", "vibe"], ["intensity", "intensity"], ["theme", "theme"], ["motion", "motion"], ["soundOn", "sound"]]

/**
 * ${TITLE[mode]}
 *
 * @framerIntrinsicWidth 390
 * @framerIntrinsicHeight 844
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function ${name}(props) {
    const hostRef = React.useRef(null)
    const envRef = React.useRef(null)
    const propsRef = React.useRef(props)
    propsRef.current = props
    const staticRender = renderTarget() === "static"
    const bootKey = [clean(props.gameBase), clean(props.assetBase), clean(props.aiEndpoint), props.title, props.showTopBar, props.musicVolume, typeof props.onExit === "function", staticRender].join("|")

    React.useEffect(() => {
        const host = hostRef.current
        if (!host) return
        const p = propsRef.current
        const el = document.createElement("div")
        el.style.cssText = "position:absolute;inset:0"
        host.appendChild(el)
        const applied = {}
        LIVE_KEYS.forEach(([prop]) => { applied[prop] = p[prop] })
        const env = {
            root: el,
            mode: MODE,
            css: CSS,
            catalog: CATALOG,
            gameBase: clean(p.gameBase) || GAME_BASE,
            assetBase: clean(p.assetBase) || ASSET_BASE,
            opts: {
                mode: MODE,
                framer: true,
                staticRender,
                noParentPost: true,
                title: clean(p.title) || undefined,
                hideBar: p.showTopBar === false,
                aiEndpoint: clean(p.aiEndpoint),
                musicVolume: typeof p.musicVolume === "number" ? p.musicVolume / 100 : undefined,
                defaults: { vibe: p.vibe, intensity: p.intensity, theme: p.theme, motion: p.motion, sound: p.soundOn },
                onEvent: (evt) => {
                    const q = propsRef.current
                    if (evt && evt.name === "complete" && typeof q.onComplete === "function") q.onComplete()
                    if (evt && evt.name === "start" && typeof q.onStart === "function") q.onStart()
                },
                onExit: typeof p.onExit === "function" ? () => { const f = propsRef.current.onExit; if (typeof f === "function") f() } : undefined,
            },
        }
        env.applied = applied
        try {
            tsgBoot(env)
        } catch (e) {
            console.error("ThinkStill: the console could not start", e)
        }
        envRef.current = env
        return () => {
            envRef.current = null
            try { if (env.TS) env.TS.destroy() } catch (e) {}
            el.remove()
        }
    }, [bootKey])

    // Property changes after boot (canvas edits, variants): applied live, never saved as the player's own choice.
    React.useEffect(() => {
        const env = envRef.current
        if (!env || !env.TS || env.TS.destroyed) return
        LIVE_KEYS.forEach(([prop, key]) => {
            const v = props[prop]
            if (v === env.applied[prop] || v == null || v === "") return
            env.applied[prop] = v
            env.TS.set(key, v, { persist: false })
        })
    }, [props.vibe, props.intensity, props.theme, props.motion, props.soundOn])

    return <div ref={hostRef} style={{ position: "relative", width: "100%", height: "100%", minWidth: 280, minHeight: 480, overflow: "hidden", borderRadius: props.radius || 0, background: "#070b1a", ...props.style }} />
}

${name}.displayName = ${JSON.stringify(TITLE[mode])}

addPropertyControls(${name}, {
    title: { type: ControlType.String, title: "Title", defaultValue: "", placeholder: "${mode === 'reset' ? 'RESET CONSOLE' : 'REFRAME CONSOLE'}" },
    vibe: { type: ControlType.Enum, title: "Vibe", options: ["Jolly", "Cheeky", "Unfiltered"], defaultValue: "Jolly", description: "Starting voice. A player's own choice wins." },
    intensity: { type: ControlType.Enum, title: "Intensity", options: ["Gentle", "Standard", "Full"], defaultValue: "Standard" },
    theme: { type: ControlType.Enum, title: "Theme", options: ["system", "dark", "bright"], optionTitles: ["Shared / System", "Dark", "Bright"], defaultValue: "system", description: "Shared follows the ThinkStill dark/bright choice, then the device." },
    motion: { type: ControlType.Enum, title: "Motion", options: ["system", "full", "reduced"], optionTitles: ["System", "Full", "Reduced"], defaultValue: "system" },
    soundOn: { type: ControlType.Boolean, title: "Sound", defaultValue: true, enabledTitle: "On", disabledTitle: "Off" },
    musicVolume: { type: ControlType.Number, title: "Music", min: 0, max: 70, step: 5, unit: "%", defaultValue: 35 },
    showTopBar: { type: ControlType.Boolean, title: "Top Bar", defaultValue: true, enabledTitle: "Show", disabledTitle: "Hide" },
    radius: { type: ControlType.Number, title: "Radius", min: 0, max: 48, step: 1, unit: "px", defaultValue: 0 },
    aiEndpoint: { type: ControlType.String, title: "AI Endpoint", defaultValue: "", placeholder: "https://…/thinkstill-ai", description: "ThinkStill AI proxy. Empty: games use their built-in local engines." },
    gameBase: { type: ControlType.String, title: "Game Base URL", defaultValue: "", placeholder: "jsDelivr (built in)", description: "Where game files load from. Empty uses the built-in CDN address." },
    assetBase: { type: ControlType.String, title: "Asset Base URL", defaultValue: "", placeholder: "GitHub bubble-expressions", description: "Folder with the bubble expression .webp files." },
    onStart: { type: ControlType.EventHandler },
    onComplete: { type: ControlType.EventHandler },
    onExit: { type: ControlType.EventHandler },
})

// Game list (${o.catalog.length}): ${ids.join(", ")}
`;
}

function bootScript(mode, o) {
  return `var CSS=${JSON.stringify(o.css)};var CATALOG=${JSON.stringify(o.catalog)};\n${o.engine};\n` +
    `(function(){var el=document.getElementById("app");try{tsgBoot({root:el,mode:${JSON.stringify(mode)},css:CSS,catalog:CATALOG,gameBase:${JSON.stringify(o.gameBase)},assetBase:${JSON.stringify(o.assetBase)}${o.assetList ? `,assetList:${JSON.stringify(o.assetList)},assetFallback:${JSON.stringify(o.assetFallback)}` : ''},opts:{mode:${JSON.stringify(mode)}}})}catch(e){console.error(e);el.textContent="Something went wrong starting the console."}})();`;
}
const BASE_STYLE = `html,body{height:100%;margin:0}
:root{--page:#eef1f8;color-scheme:light}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--page:#070b1a;color-scheme:dark}}
:root[data-theme="dark"]{--page:#070b1a;color-scheme:dark}
body{background:var(--page);overflow:hidden;overscroll-behavior:none}
#app{position:fixed;inset:0}`;

function standalone(mode, o) {
  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITLE[mode]}</title>
<meta name="description" content="${BLURB[mode]}">
<style>${BASE_STYLE}</style>
</head>
<body>
<div id="app"></div>
<script>
${bootScript(mode, o).replace(/<\/script/gi, '<\\/script')}
</script>
</body>
</html>
`;
}
function artifactPage(mode, o) {
  return `<title>${TITLE[mode]}</title>
<style>${BASE_STYLE}</style>
<div id="app"></div>
<script>
${bootScript(mode, o).replace(/<\/script/gi, '<\\/script')}
</script>
`;
}

function main() {
  const source = git('rev-parse', '--short', 'HEAD') || 'working tree';
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD') || 'main';
  const css = cssBundle();
  const report = [];
  const built = {};

  for (const mode of MODES) {
    const dir = rel(`games-${mode}`);
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^\d+-[a-z0-9-]+\.js$/.test(f)).sort() : [];
    const games = [];
    for (const f of files) { try { games.push(readGame(mode, f)); } catch (e) { fail(String(e.message || e)); } }
    const seen = new Set();
    games.forEach(g => { if (seen.has(g.meta.id)) fail(`${mode}: duplicate id ${g.meta.id}`); seen.add(g.meta.id); });

    // per-game CDN bundles (content-hashed), stale files removed
    const cdnDir = `cdn/${mode}`;
    fs.mkdirSync(rel(cdnDir), { recursive: true });
    const keep = new Set(['catalog.json']);
    const catalog = [];
    let cdnBytes = 0;
    for (const g of games) {
      const b = gameBundle(mode, g);
      write(`${cdnDir}/${b.file}`, b.code);
      keep.add(b.file);
      cdnBytes += b.code.length;
      catalog.push(Object.assign({}, g.meta, { file: b.file }));
      g.bundle = b;
    }
    fs.readdirSync(rel(cdnDir)).forEach(f => { if (!keep.has(f)) fs.unlinkSync(rel(`${cdnDir}/${f}`)); });
    write(`${cdnDir}/catalog.json`, JSON.stringify(catalog, null, 1) + '\n');

    const engine = engineFor(mode);
    const safe = tsxSafe(engine);
    if (!safe) console.warn(`  note: ${mode} engine is not TSX-identical; the Framer file embeds it as a string instead`);
    built[mode] = { games, catalog, engine };

    // jsDelivr ref: a fixed commit that contains every game file (immutable, cached forever), else the branch
    let ref = argVal('--ref');
    if (!ref) {
      const head = git('rev-parse', 'HEAD');
      const inHead = head && catalog.every(c => inGit(head, `games/cdn/${mode}/${c.file}`));
      ref = inHead ? head : branch;
    }
    if (CHECK) {
      catalog.forEach(c => { if (!inGit(ref, `games/cdn/${mode}/${c.file}`)) fail(`${mode}: ${c.file} is not in git at ${ref}`); });
    }
    const gameBase = jsdelivrBase(ref, mode);

    // Framer component
    const tsx = framerTsx(mode, { catalog, engine, css, gameBase, source, tsxSafe: safe });
    write(`framer/${COMPONENT[mode]}.tsx`, tsx);

    // standalone page (CDN games, GitHub art)
    write(`dist/${mode}-console.html`, standalone(mode, { catalog, engine, css, gameBase, assetBase: ASSET_BASE }));

    // claude.ai artifact: everything relative
    const faces = facesFor(mode, games);
    const adir = `dist/artifact/${mode}`;
    fs.rmSync(rel(adir), { recursive: true, force: true });
    games.forEach(g => write(`${adir}/g/${g.bundle.file}`, g.bundle.code));
    fs.mkdirSync(rel(`${adir}/img`), { recursive: true });
    faces.list.forEach(k => fs.copyFileSync(path.join(REPO, 'bubble-expressions', k + '.webp'), rel(`${adir}/img/${k}.webp`)));
    write(`${adir}/index.html`, artifactPage(mode, { catalog, engine, css, gameBase: 'g/', assetBase: 'img/', assetList: faces.list, assetFallback: faces.fallback }));
    const published = games.map(g => `g/${g.bundle.file}`).concat(faces.list.map(k => `img/${k}.webp`));
    write(`${adir}/files.json`, JSON.stringify(published, null, 1) + '\n');
    // what the live artifact already has (tools/artifact-published.json): only the difference needs uploading
    const pubPath = rel('tools/artifact-published.json');
    const pub = fs.existsSync(pubPath) ? JSON.parse(fs.readFileSync(pubPath, 'utf8')) : {};
    const have = new Set(pub[mode] || []);
    write(`${adir}/delta.json`, JSON.stringify(published.filter(p => !have.has(p)).map(p => ({ path: p }))) + '\n');
    if (args.includes('--mark-published')) { pub[mode] = [...new Set([...(pub[mode] || []), ...published])].sort(); fs.writeFileSync(pubPath, JSON.stringify(pub, null, 1) + '\n'); }
    if (faces.missing.length) console.warn(`  note: ${mode} references expressions that do not exist: ${faces.missing.join(', ')}`);

    report.push({ mode, games: games.length, engine: kb(engine.length), css: kb(Object.values(css).join('').length), catalog: kb(JSON.stringify(catalog).length),
      tsx: kb(tsx.length), cdn: kb(cdnBytes), avgGame: kb(cdnBytes / Math.max(1, games.length)), faces: faces.list.length, artifactFiles: published.length, ref, tsxSafe: safe });
  }

  if (errors.length) {
    console.error('\nBuild problems:\n  ' + errors.join('\n  '));
    process.exit(1);
  }
  console.table(report);
}

if (require.main === module) main(); else module.exports = { facesFor, readGame, kitMoods };
