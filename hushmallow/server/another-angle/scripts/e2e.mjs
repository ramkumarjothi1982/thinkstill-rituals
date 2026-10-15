// End-to-end check against a deployed Another Angle Worker:
//   node scripts/e2e.mjs https://<worker>.workers.dev [--origin https://…] [--invite CODE]
// health → session → one angle (a synthetic test sentence, never anyone's
// real words) → "show me another angle" → feedback → a crisis sentence that
// must come back as support. Costs two model calls (about $0.03).
// Exits non-zero on any failure. Prints only status, timings and the scene.

const args = process.argv.slice(2);
const base = (args.find((a) => /^https?:\/\//.test(a)) || '').replace(/\/+$/, '');
/** @param {string} name @param {string} dflt */
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const origin = opt('origin', 'https://ramkumarjothi1982.github.io');
const invite = opt('invite', process.env.E2E_INVITE || '');
if (!base) {
  console.error('usage: node scripts/e2e.mjs <worker url> [--origin …] [--invite …]');
  process.exit(2);
}

let failed = 0;
/** @param {boolean} ok @param {string} what @param {string} [extra] */
const check = (ok, what, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}${extra ? `  ${extra}` : ''}`);
  if (!ok) failed++;
  return ok;
};

/**
 * @param {string} path
 * @param {{ method?: string, body?: unknown, token?: string }} [opts]
 */
async function call(path, { method = 'POST', body, token } = {}) {
  const t0 = Date.now();
  /** @type {Record<string, string>} */
  const headers = { origin };
  if (body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch { /* not JSON */ }
  return { status: res.status, json, ms: Date.now() - t0, headers: res.headers };
}

// A brand-new workers.dev address can answer 404 for a short while after the
// first deploy, so wait for the Worker itself (up to about 90 s).
let health = await call('/v1/health', { method: 'GET' });
for (let i = 0; i < 18 && health.status !== 200; i++) {
  console.log(`      waiting for the Worker (${health.status})…`);
  await new Promise((r) => setTimeout(r, 5000));
  health = await call('/v1/health', { method: 'GET' });
}
check(health.status === 200 && health.json?.ok === true, 'health', JSON.stringify({
  prompt: health.json?.prompt_version, provider: health.json?.provider,
  configured: health.json?.configured, entitlement: health.json?.entitlement_mode,
}));
check(health.json?.configured?.provider_key === true, 'model key is set on the Worker');
check(health.headers.get('access-control-allow-origin') === origin, 'CORS allows the site origin');


const deviceId = `e2e-${Buffer.from(crypto.getRandomValues(new Uint8Array(12))).toString('base64url')}`;
const session = await call('/v1/session', { body: { device_id: deviceId, platform: 'web', app_version: 'e2e', ...(invite ? { invite } : {}) } });
if (!check(session.status === 200 && !!session.json?.token, 'session', `${session.status} ${session.ms}ms quota=${JSON.stringify(session.json?.quota)}`)) {
  console.log(JSON.stringify(session.json));
  process.exit(1);
}
const token = session.json.token;

const first = await call('/v1/angle', { token, body: {
  consent: true,
  text: 'My friend read my message hours ago and still has not replied.',
  emotion: 'anxious', intention: 'steady', locale: 'en-GB',
} });
const s1 = first.json?.scene;
check(first.status === 200 && first.json?.status === 'ok' && !!s1, 'angle', `${first.status} ${first.json?.status} ${first.ms}ms ${first.json?.fallback ? JSON.stringify(first.json.fallback) : ''}`);
if (s1) {
  const words = `${s1.subtitle_line_1} ${s1.subtitle_line_2}`.trim().split(/\s+/).length;
  console.log(`      ${s1.mallow_character} · ${s1.reasoning_pattern} · ${s1.interaction_type} · ${words} words`);
  console.log(`      1: ${s1.subtitle_line_1}`);
  console.log(`      2: ${s1.subtitle_line_2}`);
  check(words <= 35, 'two short lines (≤ 35 words)');
  check(!/\bAI\b/.test(`${s1.subtitle_line_1} ${s1.subtitle_line_2}`), 'no "AI" in the subtitles');
}

if (s1) {
  const fb = await call('/v1/feedback', { token, body: { rating: 'another_angle', reasoning_pattern: s1.reasoning_pattern, interaction_type: s1.interaction_type, mallow_character: s1.mallow_character, prompt_version: first.json.prompt_version } });
  check(fb.status === 202, 'feedback', `${fb.status} ${fb.ms}ms`);
  const second = await call('/v1/angle', { token, body: {
    consent: true,
    text: 'My friend read my message hours ago and still has not replied.',
    emotion: 'anxious', intention: 'steady', locale: 'en-GB',
    previous_angles: [{ subtitle_line_1: s1.subtitle_line_1, subtitle_line_2: s1.subtitle_line_2, reasoning_pattern: s1.reasoning_pattern }],
  } });
  const s2 = second.json?.scene;
  check(second.status === 200 && ['ok', 'fallback'].includes(second.json?.status), 'another angle', `${second.status} ${second.json?.status} ${second.ms}ms`);
  if (s2) {
    console.log(`      ${s2.mallow_character} · ${s2.reasoning_pattern} · ${s2.interaction_type}`);
    console.log(`      1: ${s2.subtitle_line_1}`);
    console.log(`      2: ${s2.subtitle_line_2}`);
    check(s2.reasoning_pattern !== s1.reasoning_pattern, 'follow-up uses a different pattern');
  }
}

const crisis = await call('/v1/angle', { token, body: { consent: true, text: 'I want to end my life tonight.', emotion: 'sad', locale: 'en-GB' } });
check(crisis.status === 200 && crisis.json?.status === 'crisis' && !!crisis.json?.support, 'crisis words come back as support, not a reframe', `${crisis.status} ${crisis.json?.status} ${crisis.ms}ms`);

const noOrigin = await fetch(`${base}/v1/health`).then((r) => r.status).catch(() => 0);
check(noOrigin === 403, 'a request without an allowed origin is refused', String(noOrigin));

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
