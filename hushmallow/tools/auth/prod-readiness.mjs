// Read-only readiness check of the production sign-in project (hushmallow1), run by the owner from a
// computer once the dashboard is set up (supabase/production/RUNBOOK.md, step 9 and step 11):
//
//   SUPABASE_PUBLISHABLE_KEY=sb_publishable_… node hushmallow/tools/auth/prod-readiness.mjs [--app https://app.hushmallow.com]
//   node hushmallow/tools/auth/prod-readiness.mjs --key sb_publishable_… [--url …] [--site …] [--app …] [--dev]
//
// It asks the project exactly what the app's own readiness gate asks (src/auth/readiness.js: the tables are
// there; email sign-up is on with "Confirm email" on), then the rest of what the publishable key can read:
//   * each of the six tables is there and closed to anon (42501, by design);
//   * the Data API does not expose hm_private (PostgREST answers PGRST106 for a schema it does not expose);
//   * Auth's public settings: email sign-in on, new sign-ups allowed, "Confirm email" on, anonymous
//     sign-ins off, which other sign-in methods are on;
//   * the Site URL and the redirect allow-list as Auth applies them: where Auth sends an email link that
//     does not verify (GET /auth/v1/verify with a made-up token: it verifies nothing and changes nothing;
//     the Auth logs show two "invalid link" lines), once plain and once with an address outside the list.
// With --app <origin> it also reads the live site: the published public-config.js names this project and
// this key, /auth/callback/ keeps its headers (never cached, never framed, no referrer) with a CSP that lets
// it reach the project, /auth/callback keeps the link's query, and no CSP on the root page blocks sign-in.
//
// Only GET requests, only the PUBLIC publishable key (a secret / service_role key and any project other
// than hushmallow1 are refused by src/auth/config.js; the key is never printed in full); nothing is written
// anywhere. Prints a PASS / FAIL line per check (INFO lines say what it saw; each FAIL names the RUNBOOK
// step that fixes it), then what the key cannot read (to check by hand), and exits 0 only when nothing
// failed (1: a FAIL; 2: refused before asking anything). --dev (or HM_AUTH_MODE=dev) also allows a
// localhost server: the fake in tools/auth/ (tests/auth-prod-readiness.test.mjs). It never decides anything
// for the app: the app keeps asking its own questions (readiness.js) in every browser session.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECT_URL, validatePublicConfig, keyLabel, classifyKey } from '../../src/auth/config.js';
import { probeReadiness, schemaFrom, NOT_READY, READY_TIMEOUT_MS } from '../../src/auth/readiness.js';

/** The Site URL every email link is built on (supabase/templates/: {{ .SiteURL }}/auth/callback). */
export const SITE_URL = 'https://app.hushmallow.com';
/** The six tables of supabase/migrations (tests/auth-prod-readiness.test.mjs checks the list). */
export const TABLES = Object.freeze(['profiles', 'sync_consents', 'preferences', 'favourite_worlds', 'garden_skills', 'hushflow_progress']);
/** The RUNBOOK.md step that fixes each kind of FAIL (tests/auth-runbook.test.mjs checks the headings). */
export const STEPS = Object.freeze({ sql: 2, dataApi: 3, urls: 4, signup: 5, check: 9, pages: 10 });
/** What the publishable key cannot read: printed after the checks, to confirm by hand. */
export const BY_HAND = Object.freeze([
  `RLS_CHECK.sql ended with "ALL 35 CHECKS PASSED" (step ${STEPS.sql})`,
  `minimum password length 8 with no required characters; leaked-password protection; secure email change and secure password change on; email OTP length 6, expiry 3600 s; CAPTCHA off (step ${STEPS.signup})`,
  'access token (JWT) expiry 3600 s; refresh-token rotation on, reuse interval 10 s; single session per user off (step 6)',
  'custom SMTP on with a sender on hushmallow.com, SPF / DKIM / DMARC verified, the email rate limit raised (step 7)',
  'the five email templates and their subjects (step 8)',
  `Cloudflare Pages: the two values on Production only, then a new deployment (step ${STEPS.pages}; --app reads what the live site published)`,
]);
const BOGUS_TOKEN = 'hm-readiness-check-not-a-real-token';
const OUTSIDE = 'https://hushmallow-readiness-check.invalid/auth/callback';
const FIX = { 'schema-missing': STEPS.sql, 'email-off': STEPS.signup, 'autoconfirm-on': STEPS.signup, unknown: STEPS.check };

async function timed(fetchFn, url, init, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try { return await fetchFn(url, { ...init, signal: ctl.signal }); } finally { clearTimeout(t); }
}
async function json(res) { try { return await res.json(); } catch { return null; } }
const said = (status, body) => (status ? `HTTP ${status}${body?.code ? ` ${body.code}` : ''}${body?.error_code ? ` ${body.error_code}` : ''}` : 'no answer: offline, a timeout or a refused connection');

/** The schemas PostgREST says it exposes, from a PGRST106 answer (PostgREST 12 words it in the message, 13 in the hint), or null. */
export function exposedSchemasFrom(body) {
  if (!body || typeof body !== 'object') return null;
  const m = /(?:one of the following|schemas are exposed)\s*:\s*([^\n]+)/i.exec([body.hint, body.message, body.details].filter((x) => typeof x === 'string').join('\n'));
  return m ? m[1].replace(/\.\s*$/, '').split(',').map((s) => s.trim()).filter(Boolean) : null;
}

/** Whether a Content-Security-Policy lets the page connect to `origin` (connect-src, else default-src; none: yes). */
export function cspAllowsConnect(csp, origin) {
  const dirs = new Map(String(csp || '').split(';').map((d) => d.trim().split(/\s+/)).filter((p) => p[0]).map(([n, ...v]) => [n.toLowerCase(), v]));
  const list = dirs.get('connect-src') || dirs.get('default-src');
  if (!list) return true;
  const u = new URL(origin);
  return list.some((s) => {
    if (s === '*' || s === `${u.protocol}` || s === origin) return true;
    const w = /^(https?:)\/\/\*\.(.+)$/.exec(s);
    return !!w && w[1] === u.protocol && u.hostname.endsWith(`.${w[2]}`);
  });
}

/** The values a built public-config.js publishes ({ enabled, url, key, mode }), or null. */
export function parsePublicConfig(text) {
  const m = /Object\.freeze\((\{[\s\S]*?\})\);/.exec(String(text || ''));
  try { return m ? JSON.parse(m[1]) : null; } catch { return null; }
}

/** Where a 3xx answer sends the browser, up to its #fragment (and ?query), or null. */
function landing(res) {
  if (!res || res.status < 300 || res.status > 399) return null;
  const loc = res.headers.get('location');
  return loc ? loc.split('#')[0].split('?')[0] : null;
}

/**
 * Run every check: → Promise<{ ok, refused?, lines: [{ status: 'PASS'|'FAIL'|'INFO', label, step? }], url, key, kind, site }>.
 * Never throws for a network problem (that check FAILs). Pure apart from the GET requests made with fetchFn.
 */
export async function checkProduction({ url = PROJECT_URL, key = '', site = SITE_URL, app = '', mode = 'production', fetchFn = globalThis.fetch, timeoutMs = READY_TIMEOUT_MS } = {}) {
  if (key == null || key === '') return { ok: false, refused: 'Give the publishable key: SUPABASE_PUBLISHABLE_KEY=sb_publishable_… (or --key sb_publishable_…). Dashboard → Project Settings → API Keys → Publishable key.', lines: [] };
  const v = validatePublicConfig({ url, key, mode });
  if (!v.ok || !v.enabled) return { ok: false, refused: v.error || 'SUPABASE_URL is empty.', lines: [] };
  const lines = [];
  const pass = (label) => lines.push({ status: 'PASS', label });
  const info = (label) => lines.push({ status: 'INFO', label });
  const fail = (label, step) => lines.push({ status: 'FAIL', label, step });
  const headers = { apikey: v.key, accept: 'application/json' };
  const get = async (path, { extra = {}, redirect = 'follow' } = {}) => {
    try {
      const r = await timed(fetchFn, `${v.url}${path}`, { method: 'GET', headers: { ...headers, ...extra }, cache: 'no-store', redirect }, timeoutMs);
      return { r, status: r.status, body: redirect === 'manual' ? null : await json(r) };
    } catch { return { r: null, status: 0, body: null }; }
  };

  // 1. exactly what the app asks before it shows a guest the account entry
  const gate = await probeReadiness({ enabled: true, url: v.url, key: v.key, dev: false }, { fetchFn, timeoutMs });
  if (gate.ready) pass('the app\'s own readiness gate (src/auth/readiness.js) would show sign-in');
  else fail(`the app's own readiness gate would hide sign-in: ${NOT_READY[gate.reason] || gate.reason}`, FIX[gate.reason] || STEPS.check);

  // 2. the six tables: there, and closed to anon
  for (const t of TABLES) {
    const { status, body } = await get(`/rest/v1/${t}?select=user_id&limit=0`);
    const s = schemaFrom(status, body);
    if (s === 'missing') fail(`public.${t} is missing: run ALL_MIGRATIONS.sql`, STEPS.sql);
    else if (s === 'unknown') fail(`public.${t} could not be checked (${said(status, body)})`, STEPS.check);
    else if (status === 200 || status === 206) fail(`public.${t} is there but anon (anyone with the public key) may read it: the migrations revoke that, so run ALL_MIGRATIONS.sql and RLS_CHECK.sql again`, STEPS.sql);
    else pass(`public.${t} is there and closed to anon (${body.code}, by design)`);
  }

  // 3. the Data API never exposes hm_private
  {
    const { status, body } = await get('/rest/v1/schema_migrations?select=version&limit=0', { extra: { 'accept-profile': 'hm_private' } });
    const exposed = exposedSchemasFrom(body);
    if (status === 406 && body?.code === 'PGRST106' && !(exposed || []).includes('hm_private')) {
      pass(`Data API: hm_private is not exposed${exposed ? ` (exposed schemas: ${exposed.join(', ')})` : ''}`);
      if (exposed && !exposed.includes('public')) fail('Data API: the public schema is not exposed', STEPS.dataApi);
    } else fail(`Data API: hm_private looks exposed (${said(status, body)}): remove it from Exposed schemas`, STEPS.dataApi);
  }

  // 4. Auth's public settings
  const { status: ss, body: st } = await get('/auth/v1/settings');
  if (ss !== 200 || !st || typeof st !== 'object') fail(`Auth settings could not be read (${said(ss, st)})`, STEPS.check);
  else {
    const ext = st.external && typeof st.external === 'object' ? st.external : {};
    if (ext.email === true) pass('Auth: the email provider is on'); else fail('Auth: the email provider is off', STEPS.signup);
    if (st.disable_signup === true) fail('Auth: "Allow new users to sign up" is off (people would read "New accounts are paused for now")', STEPS.signup); else pass('Auth: new users may sign up');
    if (st.mailer_autoconfirm === false) pass('Auth: "Confirm email" is on (every sign-up confirms its address)');
    else fail(st.mailer_autoconfirm === true ? 'Auth: "Confirm email" is off (anyone could sign up as any address)' : 'Auth: could not tell whether "Confirm email" is on', STEPS.signup);
    if (ext.anonymous_users === true) fail('Auth: anonymous sign-ins are on (the app never uses them)', STEPS.signup);
    else if (ext.anonymous_users === false) pass('Auth: anonymous sign-ins are off');
    const others = Object.entries(ext).filter(([k, on]) => on === true && k !== 'email' && k !== 'anonymous_users').map(([k]) => k);
    info(`Auth: other sign-in methods on: ${others.length ? `${others.join(', ')} (the app uses email only: switch off what is not used)` : 'none'}`);
  }

  // 5. the Site URL and the redirect allow-list, as Auth applies them to an email link that does not verify
  const want = String(site).replace(/\/+$/, '');
  {
    const plain = landing((await get(`/auth/v1/verify?type=signup&token=${BOGUS_TOKEN}`, { redirect: 'manual' })).r);
    if (!plain) fail('Site URL could not be read (Auth did not redirect an invalid link)', STEPS.check);
    else if (plain === want) pass(`Site URL is exactly ${want} (where Auth sends an email link)`);
    else if (plain === `${want}/`) fail(`Site URL ends with a slash (${plain}): the email links would read …//auth/callback`, STEPS.urls);
    else fail(`Site URL is ${plain}, not ${want}: every email link would open the wrong site`, STEPS.urls);
    const outside = landing((await get(`/auth/v1/verify?type=signup&token=${BOGUS_TOKEN}&redirect_to=${encodeURIComponent(OUTSIDE)}`, { redirect: 'manual' })).r);
    if (!outside) fail('redirect allow-list could not be read (Auth did not redirect an invalid link)', STEPS.check);
    else if (outside.startsWith(new URL(OUTSIDE).origin)) fail('redirect allow-list accepts an address it should not (a wildcard such as ** or https://*?): list exactly the addresses in the runbook', STEPS.urls);
    else pass('redirect allow-list: an address outside it is not honoured');
  }

  if (app) await appChecks(app, v, { fetchFn, timeoutMs, pass, fail });
  return { ok: !lines.some((l) => l.status === 'FAIL'), lines, url: v.url, key: keyLabel(v.key), kind: classifyKey(v.key), site: want };
}

/** The live site (--app): what its build published, and the headers sign-in relies on. */
async function appChecks(app, v, { fetchFn, timeoutMs, pass, fail }) {
  let origin;
  try { origin = new URL(app).origin; } catch { fail(`app: ${String(app).slice(0, 60)} is not an address`, STEPS.pages); return; }
  const get = async (path, redirect = 'follow') => {
    try { return await timed(fetchFn, `${origin}${path}`, { method: 'GET', cache: 'no-store', redirect }, timeoutMs); } catch { return null; }
  };
  const text = async (r) => { try { return await r.text(); } catch { return ''; } };
  const project = new URL(v.url).origin;

  const vr = await get('/version.json');
  const ver = vr?.ok ? (await json(vr))?.v : null;
  if (typeof ver !== 'string' || !/^[0-9a-zA-Z_-]+$/.test(ver)) { fail(`app: ${origin}/version.json could not be read (${vr ? `HTTP ${vr.status}` : 'no answer'})`, STEPS.pages); return; }
  const cr = await get(`/v/${ver}/src/auth/public-config.js`);
  const pub = cr?.ok ? parsePublicConfig(await text(cr)) : null;
  if (!pub) fail(`app: version ${ver}'s public-config.js could not be read`, STEPS.pages);
  else if (pub.enabled !== true) fail(`app: version ${ver} has sign-in off (built without SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY): set both for Production, then deploy again`, STEPS.pages);
  else if (pub.url !== v.url || pub.key !== v.key) fail(`app: version ${ver} names ${pub.url} with key ${keyLabel(pub.key)}, not ${v.url} with ${keyLabel(v.key)}`, STEPS.pages);
  else pass(`app: version ${ver} has sign-in on, for this project and this key`);

  const cb = await get('/auth/callback/');
  if (!cb || cb.status !== 200) fail(`app: ${origin}/auth/callback/ did not open (${cb ? `HTTP ${cb.status}` : 'no answer'})`, STEPS.pages);
  else {
    const h = (n) => cb.headers.get(n) || '';
    const missing = [
      /no-store/i.test(h('cache-control')) ? null : 'Cache-Control: no-store',
      /^deny$/i.test(h('x-frame-options').trim()) ? null : 'X-Frame-Options: DENY',
      /no-referrer/i.test(h('referrer-policy')) ? null : 'Referrer-Policy: no-referrer',
      h('content-security-policy') && cspAllowsConnect(h('content-security-policy'), project) ? null : `a CSP whose connect-src reaches ${project}`,
    ].filter(Boolean);
    if (missing.length) fail(`app: /auth/callback/ lacks ${missing.join(', ')} (the build's _headers: deploy again)`, STEPS.pages);
    else pass('app: /auth/callback/ is never cached, never framed, sends no referrer, and its CSP reaches the project');
  }
  const fw = await get('/auth/callback?hm_check=1', 'manual');
  let kept = false;
  if (fw && fw.status >= 300 && fw.status < 400) { try { const to = new URL(fw.headers.get('location') || '', origin); kept = to.pathname === '/auth/callback/' && to.searchParams.get('hm_check') === '1'; } catch { kept = false; } }
  else if (fw?.status === 200) kept = /id="hm-auth"/.test(await text(fw));
  if (kept) pass('app: /auth/callback (the email links\' address) opens the callback page with the link\'s query');
  else fail(`app: /auth/callback does not reach /auth/callback/ with its query (${fw ? `HTTP ${fw.status}` : 'no answer'})`, STEPS.pages);

  const root = await get('/');
  const csp = root?.headers.get('content-security-policy') || '';
  if (!root || !root.ok) fail(`app: ${origin}/ did not open (${root ? `HTTP ${root.status}` : 'no answer'})`, STEPS.pages);
  else if (!csp) pass('app: the root page sets no CSP that could block sign-in');
  else if (cspAllowsConnect(csp, project)) pass('app: the root page\'s CSP lets the app reach the project');
  else fail(`app: the root page's CSP blocks ${project} (connect-src): sign-in cannot reach the project`, STEPS.pages);
}

/** The report as text: a line per check, what to confirm by hand, and the result. */
export function formatReport(r) {
  if (r.refused) return `prod-readiness: REFUSED, nothing was asked: ${r.refused}\n`;
  const out = [
    'hushmallow sign-in readiness (read only: GET requests with the publishable key; nothing is changed)',
    `  project ${r.url} · key ${r.key} (${r.kind}) · Site URL expected ${r.site}`,
    '',
    ...r.lines.map((l) => `${l.status}  ${l.label}${l.status === 'FAIL' && l.step ? `  → RUNBOOK.md step ${l.step}` : ''}`),
    '',
    'Not readable with the publishable key: confirm these by hand (supabase/production/RUNBOOK.md):',
    ...BY_HAND.map((x) => `  - ${x}`),
    '',
  ];
  const p = r.lines.filter((l) => l.status === 'PASS').length, f = r.lines.filter((l) => l.status === 'FAIL').length;
  out.push(f ? `RESULT  NOT READY: ${f} FAIL, ${p} PASS. Do not switch sign-in on until every line passes.` : `RESULT  READY: ${p} PASS, 0 FAIL (and the list above checked by hand).`);
  return `${out.join('\n')}\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  if (argv.includes('--help')) { console.log('usage: SUPABASE_PUBLISHABLE_KEY=sb_publishable_… node hushmallow/tools/auth/prod-readiness.mjs [--key K] [--url U] [--site S] [--app ORIGIN] [--dev]'); process.exit(0); }
  const r = await checkProduction({
    url: opt('--url') || process.env.SUPABASE_URL || PROJECT_URL,
    key: opt('--key') || process.env.SUPABASE_PUBLISHABLE_KEY || '',
    site: opt('--site') || SITE_URL, app: opt('--app') || '',
    mode: argv.includes('--dev') || process.env.HM_AUTH_MODE === 'dev' ? 'dev' : 'production',
    timeoutMs: Number(opt('--timeout')) || READY_TIMEOUT_MS,
  });
  process.stdout.write(formatReport(r));
  process.exit(r.refused ? 2 : r.ok ? 0 : 1);
}
