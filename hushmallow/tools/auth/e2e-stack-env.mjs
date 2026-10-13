// Picks the PUBLIC values of a LOCAL Supabase stack out of `supabase status -o json`
// for the sign-in E2E (.github/workflows/hushmallow-auth-e2e.yml):
//
//   supabase status -o json | node hushmallow/tools/auth/e2e-stack-env.mjs >> "$GITHUB_ENV"
//
// Prints exactly four lines, KEY=value, for $GITHUB_ENV:
//   E2E_API_URL     the stack's API (Kong), e.g. http://127.0.0.1:54321
//   E2E_PUBLIC_KEY  its publishable key (sb_publishable_…), or its anon JWT on older stacks
//   E2E_DB_URL      the stack's own throwaway database (postgres:postgres@127.0.0.1:54322)
//   E2E_MAIL_URL    Mailpit (web UI + API), e.g. http://127.0.0.1:54324
// and a one-line summary on stderr (the key shortened). It never prints,
// stores or passes on the stack's secret key, service-role key, JWT secret or
// S3 keys, and it refuses (exit 1) anything that is not on this machine or a
// key that is not public. These local values are the CLI's fixed test values;
// production is never involved.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyKey, keyLabel } from '../../src/auth/config.js';

const LOOPBACK = new Set(['127.0.0.1', 'localhost']);

function loopback(u, protocols) {
  try { const x = new URL(u); return LOOPBACK.has(x.hostname) && protocols.includes(x.protocol) && !!x.port; } catch { return false; }
}

/** { ok, env, summary } | { ok: false, error } from the text `supabase status -o json` printed (pure, for tests). */
export function stackEnv(text) {
  let s = String(text ?? '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b < a) return { ok: false, error: 'supabase status printed no JSON (is the local stack running?)' };
  let j;
  try { j = JSON.parse(s.slice(a, b + 1)); } catch { return { ok: false, error: 'supabase status printed JSON that does not parse' }; }
  const pick = (...names) => { for (const n of names) if (typeof j[n] === 'string' && j[n]) return j[n]; return ''; };
  const api = pick('API_URL').replace(/\/+$/, '');
  const db = pick('DB_URL');
  const mail = (pick('MAILPIT_URL', 'INBUCKET_URL') || 'http://127.0.0.1:54324').replace(/\/+$/, '');
  const publishable = pick('PUBLISHABLE_KEY');
  const anon = pick('ANON_KEY');
  const key = classifyKey(publishable) === 'publishable' ? publishable : anon;
  const kind = classifyKey(key);
  const names = Object.keys(j).join(', ');
  if (!api) return { ok: false, error: `no API_URL in supabase status (fields: ${names})` };
  if (!loopback(api, ['http:', 'https:'])) return { ok: false, error: `API_URL ${api.slice(0, 60)} is not on this machine: the E2E only ever runs against a local stack` };
  if (!db || !loopback(db.replace(/^postgres(ql)?:/, 'http:'), ['http:'])) return { ok: false, error: 'DB_URL is missing or not on this machine' };
  if (!loopback(mail, ['http:', 'https:'])) return { ok: false, error: 'the mail server is not on this machine' };
  if (kind !== 'publishable' && kind !== 'anon-jwt') return { ok: false, error: `no public key in supabase status (got a ${kind} key; fields: ${names}). Only the publishable / anon key may be used.` };
  return {
    ok: true,
    env: { E2E_API_URL: api, E2E_PUBLIC_KEY: key, E2E_DB_URL: db, E2E_MAIL_URL: mail },
    summary: `local stack: ${api} · key ${keyLabel(key)} [${kind}] · mail ${mail} · db ${db.replace(/:[^:@/]*@/, ':***@')}`,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  const r = stackEnv(Buffer.concat(chunks).toString());
  if (!r.ok) { console.error(`e2e-stack-env: REFUSED: ${r.error}`); process.exit(1); }
  for (const [k, v] of Object.entries(r.env)) process.stdout.write(`${k}=${v}\n`);
  console.error(r.summary);
}
