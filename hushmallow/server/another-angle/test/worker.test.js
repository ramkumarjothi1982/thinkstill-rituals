// The Worker entry itself (src/index.js), with the system prompt bundled as
// text the way Wrangler does it, and the provider abstraction's Anthropic
// adapter against a fake fetch (request shape, refusal and error mapping).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { Ledger } from '../src/index.js';
import { createAnthropicProvider, usageParts, FALLBACK_BETA } from '../src/providers/anthropic.js';
import { SCENE_SCHEMA } from '../src/schema.js';
import { makeEnv, req, anchor } from './helpers.js';

test('the Worker entry serves health and exports the Durable Object class', async () => {
  const res = await worker.fetch(req('/v1/health'), makeEnv({ PROVIDER: 'mock' }), { waitUntil() {} });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).prompt_version, 'angle-v1');
  assert.equal(typeof Ledger, 'function');
});

test('the Worker entry runs a full session + angle round trip on the mock provider', async () => {
  const env = makeEnv({ PROVIDER: 'mock' });
  const waits = [];
  const ctx = { waitUntil: (p) => waits.push(p) };
  const s = await (await worker.fetch(req('/v1/session', { body: {} }), env, ctx)).json();
  const res = await worker.fetch(req('/v1/angle', { body: { consent: true, text: 'My colleague got promoted instead of me.' }, headers: { authorization: `Bearer ${s.token}` } }), env, ctx);
  const j = await res.json();
  assert.equal(j.status, 'ok');
  assert.equal(j.scene.reasoning_pattern, 'practical_problem');
  await Promise.all(waits);
});

/** A fake fetch that records the request and answers like the Messages API. */
function fakeApi(responder) {
  const calls = [];
  const f = async (url, init) => {
    const body = JSON.parse(init.body);
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    calls.push({ url: String(url), body, headers });
    const { status = 200, json } = responder(body, calls.length);
    return new Response(JSON.stringify(json), { status, headers: { 'content-type': 'application/json', 'request-id': 'req_test' } });
  };
  return { fetch: f, calls };
}

const message = (over = {}) => ({
  id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'end_turn', stop_sequence: null,
  content: [{ type: 'thinking', thinking: '', signature: 'x' }, { type: 'text', text: JSON.stringify(anchor(1)) }],
  usage: { input_tokens: 210, output_tokens: 380, cache_creation_input_tokens: 0, cache_read_input_tokens: 3400 },
  ...over,
});

const args = { system: 'SYSTEM', user: '<request>…</request>', schema: SCENE_SCHEMA, maxTokens: 3000, timeoutMs: 5000 };
const cfg = (fetch) => ({ apiKey: 'sk-test', model: 'claude-opus-5-5', effort: /** @type {const} */ ('low'), maxRetries: 0, fallbacks: true, fetch });

test('Anthropic adapter: request shape (model, effort, structured output, cached system, refusal fallback)', async () => {
  const api = fakeApi(() => ({ json: message() }));
  const p = createAnthropicProvider(cfg(api.fetch));
  const r = await p.generate({ ...args, userTag: 'abc123' });
  assert.ok(r.ok);
  assert.deepEqual(r.json, anchor(1));
  const { body, headers, url } = api.calls[0];
  assert.match(url, /\/v1\/messages/);
  assert.equal(body.model, 'claude-opus-5-5');
  assert.equal(body.max_tokens, 3000);
  assert.deepEqual(body.output_config.effort, 'low');
  assert.equal(body.output_config.format.type, 'json_schema');
  assert.equal(body.output_config.format.schema.additionalProperties, false);
  assert.deepEqual(body.system, [{ type: 'text', text: 'SYSTEM', cache_control: { type: 'ephemeral' } }]);
  assert.deepEqual(body.messages, [{ role: 'user', content: '<request>…</request>' }]);
  assert.equal(body.fallbacks, 'default');
  assert.equal('thinking' in body, false, 'thinking is always on for this model; not sent');
  assert.equal('temperature' in body, false);
  assert.equal(body.metadata.user_id, 'abc123');
  assert.match(headers['anthropic-beta'], new RegExp(FALLBACK_BETA));
  assert.equal(headers['x-api-key'], 'sk-test');
  assert.deepEqual(r.usage, [{ model: 'claude-opus-5-5', input: 210, output: 380, cacheWrite: 0, cacheRead: 3400 }]);
});

test('Anthropic adapter: refusal, truncation, bad JSON and HTTP errors map to fail reasons', async () => {
  const cases = [
    [{ json: message({ stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'bio', explanation: null }, content: [] }) }, 'refusal'],
    [{ json: message({ stop_reason: 'max_tokens' }) }, 'max_tokens'],
    [{ json: message({ content: [{ type: 'text', text: '{"half": ' }] }) }, 'invalid_json'],
    [{ json: message({ content: [] }) }, 'empty'],
    [{ status: 429, json: { type: 'error', error: { type: 'rate_limit_error', message: 'slow down' } } }, 'rate_limited'],
    [{ status: 401, json: { type: 'error', error: { type: 'authentication_error', message: 'bad key' } } }, 'auth'],
    [{ status: 400, json: { type: 'error', error: { type: 'invalid_request_error', message: 'bad' } } }, 'bad_request'],
    [{ status: 529, json: { type: 'error', error: { type: 'overloaded_error', message: 'busy' } } }, 'overloaded'],
  ];
  for (const [resp, reason] of cases) {
    const p = createAnthropicProvider(cfg(fakeApi(() => resp).fetch));
    const r = await p.generate(args);
    assert.equal(r.ok, false, reason);
    assert.equal(r.reason, reason);
  }
  const refusal = await createAnthropicProvider(cfg(fakeApi(() => cases[0][0]).fetch)).generate(args);
  assert.equal(refusal.category, 'bio');
});

test('Anthropic adapter: network failures and aborts map to network/timeout', async () => {
  const down = createAnthropicProvider(cfg(async () => { throw new TypeError('fetch failed'); }));
  assert.equal((await down.generate(args)).reason, 'network');
  const ac = new AbortController();
  const slow = createAnthropicProvider(cfg((url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))));
  const pending = slow.generate({ ...args, signal: ac.signal });
  ac.abort();
  assert.equal((await pending).reason, 'timeout');
});

test('usage with a server-side fallback sums every attempt by model', () => {
  const parts = usageParts({
    input_tokens: 10, output_tokens: 20, cache_creation_input_tokens: 0, cache_read_input_tokens: 0,
    iterations: [
      { type: 'message', model: 'claude-opus-5-5', input_tokens: 3000, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      { type: 'fallback_message', model: 'claude-opus-5', input_tokens: 3000, output_tokens: 400, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    ],
  }, 'claude-opus-5');
  assert.deepEqual(parts.map((p) => [p.model, p.input, p.output]), [['claude-opus-5-5', 3000, 0], ['claude-opus-5', 3000, 400]]);
});
