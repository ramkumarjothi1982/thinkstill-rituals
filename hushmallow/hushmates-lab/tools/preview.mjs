// Packages the lab for a hosted preview page: writes <out>/hushmates-lab.html
// (index.html without the parts a host page supplies) and <out>/files.json
// mapping every published path to its source file. Dev only.
//   node hushmallow/hushmates-lab/tools/preview.mjs <out-dir>
//
// The relay's safety screening reuses the main app's Reframe engine
// (src/ultra, read-only). A hosted page can't reach outside its own folder,
// so those files are published under ultra/ and the few imports that point
// at them are rewritten in copies; the sources are never modified.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ultra = join(root, '..', 'src', 'ultra');
const out = process.argv[2];
if (!out) { console.error('usage: preview.mjs <out-dir>'); process.exit(1); }
mkdirSync(out, { recursive: true });

const html = readFileSync(join(root, 'index.html'), 'utf8');
const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'))
  .split('\n').map((l) => l.trim())
  .filter((l) => l && !/^<meta (charset|name="viewport"|http-equiv)/.test(l) && !/rel="preload"/.test(l));
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
writeFileSync(join(out, 'hushmates-lab.html'), `${head.join('\n')}\n${body}`);

const files = {};
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files[relative(root, p)] = p;
  }
};
for (const d of ['core', 'net', 'client', 'ui', 'lab', 'styles', 'assets']) walk(join(root, d));
for (const k of Object.keys(files)) if (/\.(txt|md)$/.test(k)) delete files[k];

// the shared Reframe engine, published under ultra/
for (const name of ['reframe-engine.js', 'frameworks.js', 'lenses.js']) files[`ultra/${name}`] = join(ultra, name);
let rewritten = 0;
for (const [path, src] of Object.entries(files)) {
  if (!path.endsWith('.js') || path.startsWith('ultra/')) continue;
  const text = readFileSync(src, 'utf8');
  if (!/(?:\.\.\/)+src\/ultra\//.test(text)) continue;
  const depth = path.split('/').length - 1;
  const fixed = text.replace(/(['"])(?:\.\.\/)+src\/ultra\//g, `$1${'../'.repeat(depth)}ultra/`);
  const copy = join(out, 'rewritten', path);
  mkdirSync(dirname(copy), { recursive: true });
  writeFileSync(copy, fixed);
  files[path] = copy;
  rewritten++;
}
writeFileSync(join(out, 'files.json'), JSON.stringify(files));
console.log(`${Object.keys(files).length} files (${rewritten} with rewritten imports) → ${out}`);
