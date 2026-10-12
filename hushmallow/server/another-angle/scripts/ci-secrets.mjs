// Used by .github/workflows/another-angle.yml before `wrangler deploy
// --secrets-file`. Writes a JSON secrets file containing:
//   ANTHROPIC_API_KEY  from the environment (the GitHub secret), when set
//   TOKEN_SIGNING_KEY  generated once, only if the Worker does not have one
//   IP_HASH_KEY        generated once, only if the Worker does not have one
// Generated keys are never printed. Existing keys are never replaced, so
// device tokens survive deploys (rotate deliberately; see README).
//
//   node scripts/ci-secrets.mjs <existing-list.json | -> <out.json> [--list-ok]
// <existing-list.json> is the output of `wrangler secret list` (JSON array of
// { name, type }). --list-ok says the list command succeeded: then the file
// must parse, or the script fails rather than risk regenerating keys.

import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

/**
 * @param {string} listOutput
 * @returns {Set<string> | null} names, or null when the output cannot be read
 */
export function existingNames(listOutput) {
  // The JSON array, not a "[WARNING]" prefix: "[" then optional space, then "{" or "]".
  const m = /\[\s*(?:\{|\])/.exec(listOutput);
  const start = m ? m.index : -1;
  const end = listOutput.lastIndexOf(']');
  if (start < 0 || end < start) return null;
  try {
    const arr = JSON.parse(listOutput.slice(start, end + 1));
    if (!Array.isArray(arr)) return null;
    return new Set(arr.map((x) => (x && typeof x.name === 'string' ? x.name : '')).filter(Boolean));
  } catch {
    return null;
  }
}

/**
 * @param {Set<string>} existing
 * @param {Record<string, string | undefined>} env
 * @param {() => string} [gen]
 */
export function secretsToSet(existing, env, gen = () => randomBytes(32).toString('base64url')) {
  /** @type {Record<string, string>} */
  const out = {};
  if (env.ANTHROPIC_API_KEY) out.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
  if (!existing.has('TOKEN_SIGNING_KEY')) out.TOKEN_SIGNING_KEY = gen();
  if (!existing.has('IP_HASH_KEY')) out.IP_HASH_KEY = gen();
  return out;
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const [listPath, outPath] = process.argv.slice(2);
  const listOk = process.argv.includes('--list-ok');
  if (!listPath || !outPath) {
    console.error('usage: node scripts/ci-secrets.mjs <existing-list.json> <out.json> [--list-ok]');
    process.exit(2);
  }
  const raw = listPath === '-' ? '' : readFileSync(listPath, 'utf8');
  let names = existingNames(raw);
  if (!names) {
    if (listOk) {
      console.error('Could not read `wrangler secret list` output; refusing to generate new keys.');
      process.exit(1);
    }
    names = new Set(); // first deploy: the Worker does not exist yet
  }
  const secrets = secretsToSet(names, process.env);
  writeFileSync(outPath, JSON.stringify(secrets), { mode: 0o600 });
  const set = Object.keys(secrets);
  console.log(set.length ? `Secrets to set: ${set.join(', ')}` : 'No secrets to change.');
  if (!process.env.ANTHROPIC_API_KEY && !names.has('ANTHROPIC_API_KEY')) {
    console.log('::warning title=No ANTHROPIC_API_KEY::Add the ANTHROPIC_API_KEY repository secret. Until then Another Angle answers with the fallback signal and the app uses its authored engine.');
  }
}
