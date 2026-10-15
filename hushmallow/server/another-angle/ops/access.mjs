// Locks the Another Angle Workers to invited testers and proves it against
// the live Workers. Run only by .github/workflows/another-angle-access.yml.
//
// For each Worker (production, then staging):
//   1. takes a session token while the Worker is still open, and proves the
//      token works (POST /v1/feedback checks the token before the body, so a
//      deliberately invalid rating answers 400 for a valid token and 401 for
//      an invalid one: no model call, nothing logged as feedback);
//   2. sets TESTER_INVITE_CODES and a brand-new TOKEN_SIGNING_KEY through the
//      Cloudflare API, and deletes TOKEN_SIGNING_KEY_PREVIOUS if it exists,
//      so every token signed before now stops working;
//   3. checks the live Worker directly, the way any client on the internet
//      could call it: no token, the old token, a forged token, an expired
//      token, no invite, a wrong invite, no origin and a foreign origin are
//      all refused; a real invite gets a token that works, with one real
//      model call (a harmless sentence) on production only.
// If any check fails, or the access settings cannot be applied, it deletes
// ANTHROPIC_API_KEY from that Worker, which switches the model off there:
// /v1/health then reports provider_key false and the app plays Zuzu's own
// angles. The next deploy from main puts the key back.
//
// The invite codes and the signing key are generated here and never printed:
// the codes leave this job only sealed to the RSA public key in ops/ACCESS
// (RSA-OAEP, SHA-256), whose private key is not in this repository. The
// public log carries check names and HTTP statuses only.

import { readFileSync, appendFileSync } from 'node:fs';
import { publicEncrypt, randomBytes, randomInt, constants } from 'node:crypto';
import { signToken } from '../src/auth/tokens.js';

// CF_API, ACCESS_WORKERS and SLEEP_SCALE exist only for the local rehearsal (ops/rehearse.mjs).
const API = process.env.CF_API || 'https://api.cloudflare.com/client/v4';
const TOKEN = String(process.env.CF_TOKEN || '').replace(/\s+/g, '');
const ACCOUNT = String(process.env.CF_ACCOUNT || '').replace(/\s+/g, '');
const SUMMARY = process.env.GITHUB_STEP_SUMMARY || '';
// dry run (read only): --dry-run, or a "mode: dry-run" line in ops/ACCESS; the local rehearsal always runs in full (ACCESS_DRY=0)
const DRY = process.env.ACCESS_DRY === '0' ? false : process.argv.includes('--dry-run') || /^mode:\s*dry-run\s*$/m.test(readFileSync(new URL('./ACCESS', import.meta.url), 'utf8'));

const WORKERS = process.env.ACCESS_WORKERS ? JSON.parse(process.env.ACCESS_WORKERS) : [
  { label: 'production', script: 'hushmallow-another-angle', url: 'https://hushmallow-another-angle.vibyfy-chat.workers.dev', origin: 'https://app.hushmallow.com', modelCall: true },
  { label: 'staging', script: 'hushmallow-another-angle-staging', url: 'https://hushmallow-another-angle-staging.vibyfy-chat.workers.dev', origin: 'https://ramkumarjothi1982.github.io', modelCall: false },
];
const CODE_COUNT = 10;
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'; // no 0/1/i/l/o: easy to read out and type

const SCALE = Number(process.env.SLEEP_SCALE || 1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms * SCALE));
const lines = [];
function out(s) { console.log(s); lines.push(s); }
function mask(v) { if (process.env.GITHUB_ACTIONS) console.log(`::add-mask::${v}`); }

function newCode() {
  let s = '';
  for (let i = 0; i < 12; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `hm-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`; // ~59 bits each; sessions are rate limited
}

async function cf(method, path, body) {
  const r = await fetch(`${API}/accounts/${ACCOUNT}${path}`, {
    method, headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch { /* none */ }
  return { http: r.status, ok: r.ok && data?.success !== false, data };
}
const listSecrets = async (script) => {
  const r = await cf('GET', `/workers/scripts/${script}/secrets`);
  return r.ok ? (r.data.result || []).map((s) => s.name) : null;
};
const putSecret = (script, name, text) => cf('PUT', `/workers/scripts/${script}/secrets`, { name, text, type: 'secret_text' });
const deleteSecret = (script, name) => cf('DELETE', `/workers/scripts/${script}/secrets/${encodeURIComponent(name)}`);

/** One call to the live Worker. Returns { http, code } and never the body text. */
async function call(w, path, { method = 'POST', body, token, origin = w.origin } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (origin) headers.origin = origin;
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    const r = await fetch(`${w.url}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    let data = null;
    try { data = await r.json(); } catch { /* not json */ }
    return { http: r.status, data, code: data?.error?.code || data?.status || '' };
  } catch (e) {
    return { http: 0, data: null, code: String(e?.cause?.code || e?.message || 'network').slice(0, 40) };
  }
}

const device = () => randomBytes(18).toString('base64url');
// The token is checked before the body, so this answers 400 invalid_rating for a valid token, 401 otherwise.
const PROBE_FEEDBACK = { rating: 'access-probe' };
const HARMLESS = 'My colleague got the promotion I wanted and I keep replaying the meeting.';

async function lockWorker(w, codes, results) {
  const checks = [];
  const check = (name, ok, detail) => { checks.push({ name, ok, detail }); out(`  ${ok ? 'PASS' : 'FAIL'}  ${name}  (${detail})`); };
  out(`\n## ${w.label}: ${w.url}`);

  const names = await listSecrets(w.script);
  if (!names) { check('read the Worker\'s secret names (Cloudflare API)', false, 'could not list secrets'); return checks; }
  check('read the Worker\'s secret names (Cloudflare API)', true, `${names.length} secrets: ${names.sort().join(', ')}`);

  const h0 = await call(w, '/v1/health', { method: 'GET' });
  check('health before', h0.http === 200 && h0.data?.ok === true, `HTTP ${h0.http}, invite_required ${h0.data?.invite_required}, provider ${h0.data?.provider}`);

  // 1. a token from before the change, proved valid without a model call
  let oldToken = null;
  const s0 = await call(w, '/v1/session', { body: { device_id: device(), platform: 'web' } });
  if (s0.http === 200 && s0.data?.token) {
    oldToken = s0.data.token; mask(oldToken);
    const fb0 = await call(w, '/v1/feedback', { token: oldToken, body: PROBE_FEEDBACK });
    check('a token issued before the change works before it (feedback probe, no model call)', fb0.http === 400 && fb0.data?.error?.code === 'invalid_rating', `HTTP ${fb0.http} ${fb0.data?.error?.code || ''}`);
  } else {
    check('a token issued before the change (open session)', true, `not available: HTTP ${s0.http} ${s0.code} (already locked); the old-token checks are skipped`);
  }
  if (DRY) { out('  (dry run: no settings changed)'); return checks; }

  // 2. new invite codes and a brand-new signing key
  const key = randomBytes(48).toString('base64url'); mask(key);
  const p1 = await putSecret(w.script, 'TESTER_INVITE_CODES', codes.join(','));
  check('set TESTER_INVITE_CODES', p1.ok, `HTTP ${p1.http}`);
  const p2 = await putSecret(w.script, 'TOKEN_SIGNING_KEY', key);
  check('replace TOKEN_SIGNING_KEY with a new random key', p2.ok, `HTTP ${p2.http}`);
  if (names.includes('TOKEN_SIGNING_KEY_PREVIOUS')) {
    const d = await deleteSecret(w.script, 'TOKEN_SIGNING_KEY_PREVIOUS');
    check('delete TOKEN_SIGNING_KEY_PREVIOUS (old tokens must not verify)', d.ok, `HTTP ${d.http}`);
  } else check('no TOKEN_SIGNING_KEY_PREVIOUS to delete', true, 'absent');
  if (!p1.ok || !p2.ok) return checks;

  // the new settings reach the edge within seconds; wait for health to say so
  // (an older Worker build does not report invite_required; there the direct "no invite" session check below is the proof)
  const reports = h0.data && 'invite_required' in h0.data;
  let h1 = null;
  for (let i = 0; i < 36; i++) {
    h1 = await call(w, '/v1/health', { method: 'GET' });
    if (h1.http === 200 && (h1.data?.invite_required === true || !reports)) break;
    await sleep(5000);
  }
  if (reports) check('health reports invite_required true', h1?.data?.invite_required === true, `HTTP ${h1?.http}, invite_required ${h1?.data?.invite_required}`);
  else check('health answers (this Worker build does not report invite_required; the session checks below decide)', h1?.http === 200, `HTTP ${h1?.http}`);
  check('health reports a signing key and a provider key', h1?.data?.configured?.signing_key === true && h1?.data?.configured?.provider_key === true, JSON.stringify(h1?.data?.configured || {}));
  // the key may take a moment longer than the codes on every location: give it a margin
  await sleep(20000);

  // 3. direct calls, spaced for the per-network limits (sessions 3/min, angles 6/min)
  const body = (consent = true) => ({ text: HARMLESS, consent, locale: 'en-GB' });
  if (oldToken) {
    const a = await call(w, '/v1/feedback', { token: oldToken, body: PROBE_FEEDBACK });
    check('the old token is refused on /v1/feedback', a.http === 401, `HTTP ${a.http} ${a.code}`);
    await sleep(11000);
    const b = await call(w, '/v1/angle', { token: oldToken, body: body() });
    check('the old token is refused on /v1/angle', b.http === 401, `HTTP ${b.http} ${b.code}`);
    await sleep(11000);
  }
  const c = await call(w, '/v1/angle', { body: body() });
  check('no token is refused on /v1/angle', c.http === 401, `HTTP ${c.http} ${c.code}`);
  await sleep(11000);
  const forged = `hm1.${Buffer.from(JSON.stringify({ v: 1, aud: 'another-angle', sub: 'dev_forged', ent: 'beyond', src: 'testing', iat: Date.now(), exp: Date.now() + 86400000 })).toString('base64url')}.${randomBytes(32).toString('base64url')}`;
  const d = await call(w, '/v1/angle', { token: forged, body: body() });
  check('a forged token is refused on /v1/angle', d.http === 401, `HTTP ${d.http} ${d.code}`);
  await sleep(11000);
  const expired = await signToken({ sub: 'dev_expired_probe', ent: 'beyond', src: 'testing', iat: Date.now() - 2 * 86400000, exp: Date.now() - 86400000 }, key);
  mask(expired);
  const e = await call(w, '/v1/angle', { token: expired, body: body() });
  check('an expired token signed with the new key is refused', e.http === 401, `HTTP ${e.http} ${e.code}`);
  await sleep(11000);
  const f = await call(w, '/v1/angle', { origin: null, body: body() });
  check('no Origin header is refused', f.http === 403, `HTTP ${f.http} ${f.code}`);
  const g = await call(w, '/v1/angle', { origin: 'https://evil.example', body: body() });
  check('a foreign Origin is refused', g.http === 403, `HTTP ${g.http} ${g.code}`);
  const g2 = await call(w, '/v1/session', { origin: 'https://evil.example', body: { device_id: device() } });
  check('a foreign Origin cannot start a session', g2.http === 403, `HTTP ${g2.http} ${g2.code}`);
  await sleep(25000);
  const s1 = await call(w, '/v1/session', { body: { device_id: device(), platform: 'web' } });
  check('a session without an invite code is refused', s1.http === 403 && s1.code === 'invite_required', `HTTP ${s1.http} ${s1.code}`);
  await sleep(25000);
  const s2 = await call(w, '/v1/session', { body: { device_id: device(), platform: 'web', invite: newCode() } });
  check('a session with a wrong invite code is refused', s2.http === 403 && s2.code === 'invite_required', `HTTP ${s2.http} ${s2.code}`);
  await sleep(25000);
  const s3 = await call(w, '/v1/session', { body: { device_id: device(), platform: 'web', invite: codes[0] } });
  const newToken = s3.data?.token || null;
  if (newToken) mask(newToken);
  check('a session with a real invite code gets a token', s3.http === 200 && !!newToken, `HTTP ${s3.http} ${s3.code}, expires ${s3.data?.expires_at || '-'}`);
  if (newToken) {
    const fb = await call(w, '/v1/feedback', { token: newToken, body: PROBE_FEEDBACK });
    check('the new token works (feedback probe, no model call)', fb.http === 400 && fb.data?.error?.code === 'invalid_rating', `HTTP ${fb.http} ${fb.data?.error?.code || ''}`);
    await sleep(11000);
    const nc = await call(w, '/v1/angle', { token: newToken, body: body(false) });
    check('the new token without consent is refused', nc.http === 400 && nc.data?.error?.code === 'consent_required', `HTTP ${nc.http} ${nc.data?.error?.code || ''}`);
    if (w.modelCall) {
      await sleep(11000);
      const ok = await call(w, '/v1/angle', { token: newToken, body: { ...body(), request_id: `access-${Date.now()}` } });
      check('the new token with consent reaches the real model (one harmless sentence)', ok.http === 200 && ['ok', 'fallback'].includes(ok.data?.status), `HTTP ${ok.http}, status ${ok.data?.status}${ok.data?.fallback?.reason ? `, fallback ${ok.data.fallback.reason}` : ''}`);
    }
  }
  results.push({ w: w.label, tokenTtl: s3.data?.expires_at || null });
  return checks;
}

async function disableModel(w) {
  const r = await deleteSecret(w.script, 'ANTHROPIC_API_KEY');
  out(`  SAFETY: ANTHROPIC_API_KEY ${r.ok ? 'deleted' : `could NOT be deleted (HTTP ${r.http})`} on ${w.label}: the model is ${r.ok ? 'switched off there' : 'STILL ON — switch it off by hand'}`);
  if (r.ok) {
    for (let i = 0; i < 24; i++) {
      const h = await call(w, '/v1/health', { method: 'GET' });
      if (h.data?.configured?.provider_key === false) { out('  SAFETY: health now reports provider_key false (the app plays Zuzu\'s own angles)'); return true; }
      await sleep(5000);
    }
    out('  SAFETY: health did not yet report provider_key false');
  }
  return r.ok;
}

async function main() {
  if (!TOKEN || !ACCOUNT) { console.error('CF_TOKEN and CF_ACCOUNT are required'); process.exit(2); }
  mask(TOKEN); mask(ACCOUNT);
  const pem = readFileSync(new URL('./ACCESS', import.meta.url), 'utf8').match(/-----BEGIN PUBLIC KEY-----[\s\S]+?-----END PUBLIC KEY-----/)?.[0];
  if (!pem) { console.error('ops/ACCESS has no public key'); process.exit(2); }
  const codes = Array.from({ length: CODE_COUNT }, newCode);
  codes.forEach(mask);
  const sealed = publicEncrypt({ key: pem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(JSON.stringify({ at: new Date().toISOString(), codes }))).toString('base64');

  const results = [];
  let allOk = true;
  for (const w of WORKERS) {
    let checks = [];
    try { checks = await lockWorker(w, codes, results); } catch (e) { checks.push({ name: 'run', ok: false, detail: String(e?.message || e).slice(0, 120) }); out(`  FAIL  run (${String(e?.message || e).slice(0, 120)})`); }
    const ok = checks.length > 0 && checks.every((c) => c.ok);
    out(`  => ${w.label}: ${ok ? 'LOCKED AND VERIFIED' : 'NOT VERIFIED'} (${checks.filter((c) => c.ok).length}/${checks.length} checks)`);
    if (!ok && !DRY) { allOk = false; await disableModel(w); }
  }
  out(`\nSEALED_CODES ${sealed}`);
  if (SUMMARY) appendFileSync(SUMMARY, `\`\`\`\n${lines.join('\n')}\n\`\`\`\n`);
  process.exit(allOk ? 0 : 1);
}

main();
