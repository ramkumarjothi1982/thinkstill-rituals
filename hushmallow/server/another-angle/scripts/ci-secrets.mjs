// Used by .github/workflows/another-angle.yml before `wrangler deploy
// --secrets-file`. Writes a JSON secrets file containing:
//   ANTHROPIC_API_KEY    from the environment (the GitHub secret), when set
//   TESTER_INVITE_CODES  from the environment (optional GitHub secret), when set
//   TOKEN_SIGNING_KEY    generated once, only if the Worker does not have one
//   IP_HASH_KEY          generated once, only if the Worker does not have one
// Generated keys are never printed. Existing keys are never replaced, so
// device tokens survive deploys (rotate deliberately; see README).
//
//   node scripts/ci-secrets.mjs <existing-list.json> <out.json> --list-ok
//       `wrangler secret list` succeeded; its output must parse, or the
//       script fails rather than risk regenerating keys.
//   node scripts/ci-secrets.mjs --list-error <stderr.txt> <out.json>
//       `wrangler secret list` failed. Only "this Worker does not exist"
//       (Cloudflare error 10007/10090, or wrangler's "Worker … not found")
//       means a first deploy and new keys. Any other failure (network, token
//       scope, rate limit) fails the job: generating keys then would
//       overwrite the real ones and sign every tester out.

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
 * Does `wrangler secret list` stderr say the Worker does not exist yet?
 * @param {string} stderr
 */
export function workerMissing(stderr) {
  const t = String(stderr || '');
  return /\[code: 100(?:07|90)\]/.test(t)
    || /\bdoes not exist on (?:your|this) account\b/i.test(t)
    || /\bWorker "[^"]+"(?: \(env: [^)]*\))? not found\b/i.test(t);
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
  if (env.TESTER_INVITE_CODES) out.TESTER_INVITE_CODES = env.TESTER_INVITE_CODES;
  if (!existing.has('TOKEN_SIGNING_KEY')) out.TOKEN_SIGNING_KEY = gen();
  if (!existing.has('IP_HASH_KEY')) out.IP_HASH_KEY = gen();
  return out;
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const args = process.argv.slice(2).filter((a) => a !== '--list-ok');
  const listOk = process.argv.includes('--list-ok');
  const errMode = args[0] === '--list-error';
  const [listPath, outPath] = errMode ? args.slice(1) : args;
  if (!listPath || !outPath || (!errMode && !listOk)) {
    console.error('usage: node scripts/ci-secrets.mjs <existing-list.json> <out.json> --list-ok\n       node scripts/ci-secrets.mjs --list-error <stderr.txt> <out.json>');
    process.exit(2);
  }
  /** @type {Set<string> | null} */
  let names;
  if (errMode) {
    if (!workerMissing(readFileSync(listPath, 'utf8'))) {
      console.error('::error title=Could not list Worker secrets::`wrangler secret list` failed for a reason other than "Worker not found" (network, token permissions or rate limit). Refusing to generate new signing keys, which would sign every tester out. Re-run the job; if it keeps failing, check the CLOUDFLARE_API_TOKEN permissions.');
      process.exit(1);
    }
    console.log('No Worker yet (first deploy): generating TOKEN_SIGNING_KEY and IP_HASH_KEY.');
    names = new Set();
  } else {
    names = existingNames(readFileSync(listPath, 'utf8'));
    if (!names) {
      console.error('Could not read `wrangler secret list` output; refusing to generate new keys.');
      process.exit(1);
    }
  }
  const secrets = secretsToSet(names, process.env);
  writeFileSync(outPath, JSON.stringify(secrets), { mode: 0o600 });
  const set = Object.keys(secrets);
  console.log(set.length ? `Secrets to set: ${set.join(', ')}` : 'No secrets to change.');
  if (!process.env.ANTHROPIC_API_KEY && !names.has('ANTHROPIC_API_KEY')) {
    console.log('::warning title=No ANTHROPIC_API_KEY::Add the ANTHROPIC_API_KEY repository secret. Until then Another Angle answers with the fallback signal and the app uses its authored engine.');
  }
  if (!process.env.TESTER_INVITE_CODES && !names.has('TESTER_INVITE_CODES')) {
    console.log('::notice title=Testing sessions are open to anyone::Recommended for the testing phase: add a TESTER_INVITE_CODES repository secret (comma-separated codes) so only invited testers can start a session. See hushmallow/server/another-angle/README.md.');
  }
}
