// Synthetic monitor for production: no dependencies, no secrets, read-only.
//
//   node hushmallow/tools/ops/monitor.mjs [--site https://app.hushmallow.com]
//        [--worker <Another Angle URL>] [--expect-version <sha>]
//        [--allowed-versions <sha,sha,…>] [--max-ms 4000] [--retry-ms 20000]
//        [--json <file>] [--allow-gate --gate-marker <regex>]
//
// Run every 10 minutes by GitHub Actions (docs/workstreams/prod-security/monitor.yml).
// Checks, each with its response time (a response slower than --max-ms fails):
//   site      GET /  → 200 HTML naming v/<version>/src/app/main.js, whose
//             security headers are EXACTLY what this repository's build
//             generates (tools/site/security-headers.mjs: CSP directive by
//             directive, HSTS, nosniff, Referrer-Policy, Permissions-Policy,
//             COOP, no X-Frame-Options, Cache-Control); only script-src's
//             sha256 hashes may differ (the live page may be an older build)
//   version   GET /version.json → the same <version> as the page; a 40-hex
//             commit (Pages' CF_PAGES_COMMIT_SHA); = --expect-version or one of
//             --allowed-versions when given
//   config    GET /v/<version>/src/auth/public-config.js → sign-in on, the
//             Sydney project of this repository (src/auth/config.js
//             PROJECT_URL / PROJECT_REF), a publishable key, never a secret
//   code      GET /v/<version>/src/app/main.js → 200 JavaScript, cached immutable
//             (public-config.js must never be: a changed value would not arrive)
//   callback  GET /auth/callback/ → 200 with exactly the built headers (no-store,
//             DENY, no-referrer, both policies); never behind the pilot gate
//   worker    GET <worker>/v1/health with Origin: <site> (the Worker answers
//             only the app's own origins) → 200 { ok: true, service:
//             'another-angle', provider not 'mock', configured.signing_key and
//             configured.provider_key true, prompt / schema versions } and
//             CORS for the site
// Requests never carry credentials or cookies, and bypass caches (a query
// string and Cache-Control: no-cache). A failed run is retried once after
// --retry-ms (a single network blip is not an incident); a failure on both
// runs exits 1 with one short line per failing check. A check that failed
// and then passed is printed as "recovered" (never hidden).
//
// --allow-gate --gate-marker <regex>: while the pilot gate is on, / may answer
// with the gate page, recognised by text only it contains. It must still carry
// the built security headers; checks that the gate hides (an HTML answer for
// version.json, public-config.js or main.js) are reported "NOT checked" on the
// final line instead of failing; anything the gate lets through is checked.
// Without the marker, --allow-gate fails the site check.
import { writeFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECT_URL, PROJECT_REF } from '../../src/auth/config.js';
import { ANGLE_ENDPOINT } from '../../src/app/config.js';
import { headersFile } from '../site/auth-config.mjs';
import { parseHeadersFile, headersFor } from '../site/pages-headers.mjs';

export const DEFAULTS = Object.freeze({
  site: 'https://app.hushmallow.com',
  worker: ANGLE_ENDPOINT,
  projectUrl: PROJECT_URL,
  projectRef: PROJECT_REF,
  maxMs: 4000,
  timeoutMs: 15000,
  retryMs: 20000,
});

const UA = 'hushmallow-synthetic-monitor/1 (+github actions; read-only)';

/** One GET: never credentials, never a cache; { status, headers, text, ms, error }. */
async function get(url, { timeoutMs, headers = {}, fetchImpl = fetch } = {}) {
  const u = new URL(url);
  u.searchParams.set('monitor', String(Date.now()));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    const r = await fetchImpl(u, { method: 'GET', credentials: 'omit', redirect: 'manual', cache: 'no-store', signal: ctrl.signal, headers: { 'user-agent': UA, 'cache-control': 'no-cache', ...headers } });
    const text = await r.text();
    return { status: r.status, headers: r.headers, text, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return { status: 0, headers: new Headers(), text: '', ms: Math.round(performance.now() - t0), error: e?.name === 'AbortError' ? `no answer in ${timeoutMs} ms` : String(e?.cause?.code || e?.message || e).slice(0, 80) };
  } finally { clearTimeout(timer); }
}

/** What the site must answer for `path`: the headers this repository's build generates (tools/site/security-headers.mjs). */
const expectCache = new Map();
export function expectedFor(projectOrigin, version) {
  const key = `${projectOrigin}|${version || ''}`;
  if (!expectCache.has(key)) expectCache.set(key, parseHeadersFile(headersFile(projectOrigin, { version: /^[0-9A-Za-z_-]+$/.test(version || '') ? version : 'unknown' })));
  return expectCache.get(key);
}

const EXACT = ['strict-transport-security', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'cross-origin-opener-policy', 'x-frame-options', 'cache-control', 'content-security-policy'];
const norm = (v) => String(v ?? '').split(',').map((x) => x.trim().replace(/\s+/g, ' ')).join(', ');
const policyList = (v) => String(v || '').split(',').map((p) => new Map(p.split(';').map((d) => d.trim()).filter(Boolean).map((d) => { const [k, ...src] = d.split(/\s+/); return [k.toLowerCase(), src]; })));
const HASH = /^'sha256-[A-Za-z0-9+/=]+'$/;

/**
 * Differences between the live headers and the built ones, exactly, except the script-src hashes of inline code
 * (the live page may be a slightly older build than this checkout; a hash is still the only inline code allowed).
 */
export function headerProblems(headers, path, rules, skip = []) {
  const want = headersFor(rules, path);
  const out = [];
  for (const name of EXACT) {
    if (skip.includes(name)) continue;
    const exp = want.get(name)?.value ?? null;
    const got = headers.get(name);
    if (name === 'content-security-policy') {
      if (!got) { out.push(headers.get('content-security-policy-report-only') ? 'the CSP is report-only (not enforced)' : 'no Content-Security-Policy'); continue; }
      const [e, g] = [policyList(exp), policyList(got)];
      if (e.length !== g.length) { out.push(`CSP: ${g.length} policies, built ${e.length}`); continue; }
      e.forEach((ep, i) => {
        const gp = g[i];
        for (const k of new Set([...ep.keys(), ...gp.keys()])) {
          const es = ep.get(k) || [], gs = gp.get(k) || [];
          const a = k === 'script-src' ? es.filter((x) => !HASH.test(x)) : es;
          const b = k === 'script-src' ? gs.filter((x) => !HASH.test(x)) : gs;
          if (!ep.has(k) || !gp.has(k) || a.length !== b.length || a.some((x) => !b.includes(x))) out.push(`CSP ${k}: "${gs.join(' ').slice(0, 120)}", built "${es.join(' ').slice(0, 120)}"`);
        }
      });
      continue;
    }
    if (exp == null) { if (got != null) out.push(`${name}: "${String(got).slice(0, 80)}", built: none`); continue; }
    if (got == null) out.push(`no ${name}`);
    else if (norm(got).toLowerCase() !== norm(exp).toLowerCase()) out.push(`${name}: "${String(got).slice(0, 80)}", built "${exp.slice(0, 80)}"`);
  }
  return out;
}

/** Run every check once. Returns { ok, checks: [{ name, ok, ms, detail, gated? }] }. */
export async function runOnce(opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const site = o.site.replace(/\/+$/, '');
  const worker = String(o.worker || '').replace(/\/+$/, '');
  const projectOrigin = new URL(o.projectUrl).origin;
  const req = (url, h) => get(url, { timeoutMs: o.timeoutMs, headers: h, fetchImpl: o.fetchImpl });
  const checks = [];
  const add = (name, ok, r, detail, extra = {}) => { checks.push({ name, ok: !!ok && (!r || r.ms <= o.maxMs), ms: r?.ms ?? null, detail: ok && r && r.ms > o.maxMs ? `slow: ${r.ms} ms (limit ${o.maxMs} ms)` : detail, ...extra }); };
  const why = (r, want = 200) => (r.status === 0 ? r.error : `HTTP ${r.status}${want ? ` (want ${want})` : ''}`);

  // site
  const page = await req(`${site}/`);
  const verM = /["']\/?v\/([0-9A-Za-z_-]+)\/src\/app\/main\.js["']/.exec(page.text);
  // the pilot gate is recognised positively (its own marker), never as "anything that is not the app"
  const gateRe = o.allowGate && o.gateMarker ? new RegExp(o.gateMarker) : null;
  const gated = !!gateRe && page.status !== 0 && !verM && gateRe.test(page.text);
  const expect = expectedFor(projectOrigin, verM?.[1]);
  const hp = headerProblems(page.headers, '/', expect, gated ? ['cache-control'] : []);
  let siteDetail;
  if (o.allowGate && !o.gateMarker) siteDetail = '--allow-gate needs --gate-marker (text only the gate page contains)';
  else if (page.status !== 200 && !(gated && [401, 403].includes(page.status))) siteDetail = why(page);
  else if (!verM && !gated) siteDetail = 'the page does not name v/<version>/src/app/main.js (not the app, and not the pilot gate)';
  add('site', !siteDetail && !hp.length, page, siteDetail || hp.join('; ') || (gated ? 'the pilot gate answered, with the expected security headers' : `version ${verM[1].slice(0, 12)}, headers as built`), gated ? { gated: true } : {});
  const ver = verM?.[1] || null;

  // version
  const vj = await req(`${site}/version.json`);
  let v = null;
  try { v = JSON.parse(vj.text).v; } catch { /* below */ }
  const isHtml = (r) => /text\/html/.test(r.headers.get('content-type') || '');
  if (gated && (vj.status !== 200 || isHtml(vj))) add('version', true, null, `gated (HTTP ${vj.status})`, { gated: true });
  else {
    const vp = [];
    if (vj.status !== 200) vp.push(why(vj));
    else if (typeof v !== 'string') vp.push('version.json has no "v"');
    else {
      if (ver && v !== ver) vp.push(`version.json says ${v.slice(0, 12)} but the page loads ${ver.slice(0, 12)}`);
      if (!/^[0-9a-f]{40}$/.test(v)) vp.push(`version ${v.slice(0, 20)} is not a commit (not a production build?)`);
      if (o.expectVersion && v !== o.expectVersion) vp.push(`version ${v.slice(0, 12)}, expected ${o.expectVersion.slice(0, 12)}`);
      else if (o.allowedVersions?.length && !o.allowedVersions.includes(v)) vp.push(`version ${v.slice(0, 12)} is older than the last change on main that should be live (${o.allowedVersions[o.allowedVersions.length - 1].slice(0, 12)})`);
    }
    add('version', !vp.length, vj, vp.join('; ') || v.slice(0, 12));
  }
  const live = ver || (typeof v === 'string' ? v : null);

  // config (public values only; never with credentials)
  if (!live) for (const n of ['config', 'code']) add(n, !!gated, null, gated ? 'gated' : 'no version to read it from', gated ? { gated: true } : {});
  else {
    const pc = await req(`${site}/v/${live}/src/auth/public-config.js`);
    const cp = [];
    let cfg = null;
    if (pc.status !== 200) cp.push(why(pc));
    else {
      const cc = pc.headers.get('cache-control') || '';
      if (/immutable|max-age=[1-9]/.test(cc)) cp.push(`public-config.js is cached (${cc}): a changed sign-in value would not reach browsers`);
      if (/sb_secret_|service_role/i.test(pc.text)) cp.push('public-config.js holds a SECRET');
      try { cfg = JSON.parse(/Object\.freeze\((\{[\s\S]*\})\)/.exec(pc.text)[1]); } catch { cp.push('public-config.js is not the generated module'); }
      if (cfg) {
        if (cfg.enabled !== true) cp.push('sign-in is off in production');
        else {
          if (cfg.url !== o.projectUrl) cp.push(`sign-in points at ${String(cfg.url).slice(0, 60)}, not ${o.projectUrl}`);
          let ref = null;
          try { ref = new URL(cfg.url).hostname.split('.')[0]; } catch { /* below */ }
          if (ref !== o.projectRef) cp.push(`project ref ${ref} is not ${o.projectRef} (Sydney)`);
          if (!/^sb_publishable_/.test(cfg.key || '')) cp.push('the key is not a publishable key');
          if ((cfg.mode || 'production') !== 'production') cp.push(`mode ${cfg.mode}`);
        }
      }
    }
    if (gated && (pc.status !== 200 || isHtml(pc))) add('config', true, null, `gated (HTTP ${pc.status})`, { gated: true });
    else add('config', !cp.length, pc, cp.join('; ') || `${o.projectRef} (${cfg?.mode || 'production'})`);

    const code = await req(`${site}/v/${live}/src/app/main.js`);
    if (gated && (code.status !== 200 || isHtml(code))) add('code', true, null, `gated (HTTP ${code.status})`, { gated: true });
    else {
      const kp = code.status !== 200 ? [why(code)] : [];
      if (code.status === 200 && !/javascript/.test(code.headers.get('content-type') || '')) kp.push(`served as ${code.headers.get('content-type') || 'nothing'} (the fallback page?)`);
      if (code.status === 200) kp.push(...headerProblems(code.headers, `/v/${live}/src/app/main.js`, expectedFor(projectOrigin, live), ['content-security-policy', 'permissions-policy']));
      add('code', !kp.length, code, kp.join('; ') || 'JavaScript, immutable');
    }
  }

  // callback page headers
  const cb = await req(`${site}/auth/callback/`);
  const cbp = cb.status !== 200 ? [why(cb)] : [];
  cbp.push(...headerProblems(cb.headers, '/auth/callback/', expectedFor(projectOrigin, live)));
  // never behind the pilot gate: sign-in email links land here
  add('callback', !cbp.length, cb, cbp.join('; ') || 'no-store, DENY, both policies as built');

  // the Another Angle Worker
  if (!worker) add('worker', true, null, 'no Worker configured (Another Angle off in src/app/config.js)');
  else {
    const siteOrigin = new URL(site).origin;
    const h = await req(`${worker}/v1/health`, { origin: siteOrigin });
    let j = null;
    try { j = JSON.parse(h.text); } catch { /* below */ }
    const wp = [];
    if (h.status !== 200) wp.push(`${why(h)}${j?.error?.code ? ` ${j.error.code}` : ''}`);
    else if (!j) wp.push('not JSON');
    else {
      if (j.ok !== true) wp.push('ok is not true');
      if (j.service !== 'another-angle') wp.push(`service ${j.service}`);
      if (j.provider === 'mock') wp.push('the MOCK provider is live');
      if (!j.configured || j.configured.signing_key !== true) wp.push('TOKEN_SIGNING_KEY missing');
      if (!j.configured || j.configured.provider_key !== true) wp.push('ANTHROPIC_API_KEY missing (every angle falls back)');
      if (typeof j.prompt_version !== 'string' || typeof j.schema_version !== 'string') wp.push('no prompt / schema version');
      if (typeof j.entitlement_mode !== 'string' || typeof j.invite_required !== 'boolean') wp.push('entitlement fields missing');
      if (h.headers.get('access-control-allow-origin') !== siteOrigin) wp.push(`CORS does not allow ${siteOrigin}`);
    }
    add('worker', !wp.length, h, wp.join('; ') || `${j.provider}, prompt ${j.prompt_version}, ${j.entitlement_mode}${j.invite_required ? ', invite' : ''}`);
  }
  return { ok: checks.every((c) => c.ok), checks };
}

/** runOnce, and once more after retryMs if anything failed. A check fails only if it failed both times. */
export async function runMonitor(opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const first = await runOnce(o);
  if (first.ok) return { ...first, retried: false };
  await new Promise((r) => setTimeout(r, o.retryMs));
  const second = await runOnce(o);
  const checks = second.checks.map((c) => {
    const before = first.checks.find((x) => x.name === c.name);
    return before && !before.ok && c.ok ? { ...c, recovered: before.detail } : c;
  });
  return { ok: second.ok, checks, retried: true };
}

export function format(r) {
  const lines = r.checks.map((c) => `${c.ok ? (c.recovered ? 'RECOVERED' : 'ok       ') : 'FAIL     '} ${c.name.padEnd(8)} ${c.ms == null ? '' : `${String(c.ms).padStart(5)} ms  `}${c.detail}${c.recovered ? ` (first try: ${c.recovered})` : ''}`);
  const bad = r.checks.filter((c) => !c.ok);
  const gated = r.checks.filter((c) => c.gated && c.name !== 'site').map((c) => c.name);
  lines.push(bad.length ? `FAIL: ${bad.map((c) => `${c.name}: ${c.detail}`).join(' | ')}` : `OK${r.retried ? ' (after one retry)' : ''}${gated.length ? ` (pilot gate on: ${gated.join(', ')} NOT checked)` : ''}`);
  return lines.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
  const list = (s) => String(s || '').split(/[\s,]+/).filter(Boolean);
  const opts = {
    site: arg('site', process.env.MONITOR_SITE || DEFAULTS.site),
    worker: arg('worker', process.env.MONITOR_WORKER ?? DEFAULTS.worker),
    expectVersion: arg('expect-version', process.env.MONITOR_EXPECT_VERSION || '') || null,
    allowedVersions: list(arg('allowed-versions', process.env.MONITOR_ALLOWED_VERSIONS || '')),
    maxMs: Number(arg('max-ms', process.env.MONITOR_MAX_MS || DEFAULTS.maxMs)),
    retryMs: Number(arg('retry-ms', process.env.MONITOR_RETRY_MS || DEFAULTS.retryMs)),
    allowGate: argv.includes('--allow-gate') || process.env.MONITOR_ALLOW_GATE === '1',
    gateMarker: arg('gate-marker', process.env.MONITOR_GATE_MARKER || '') || null,
  };
  const r = await runMonitor(opts);
  const text = format(r);
  console.log(text);
  const jsonOut = arg('json', '');
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ ...r, at: new Date().toISOString(), site: opts.site }, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### hushmallow production monitor\n\n\`\`\`\n${text}\n\`\`\`\n`);
  process.exit(r.ok ? 0 : 1);
}
