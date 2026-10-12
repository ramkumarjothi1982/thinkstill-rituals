// Shared test helpers: an app wired to the mock provider, an in-memory
// Durable Object namespace, fake rate-limit bindings, request builders and
// good scenes from the brief's quality anchors.

import { readFileSync } from 'node:fs';
import { createApp } from '../src/app.js';
import { createMockProvider } from '../src/providers/mock.js';
import { memoryLedgerNamespace } from '../src/limits/ledger.js';
import { PROMPT_VERSION } from '../src/prompt.js';

export const SYSTEM_PROMPT = readFileSync(new URL(`../prompts/${PROMPT_VERSION}.md`, import.meta.url), 'utf8');
export const ORIGIN = 'https://ramkumarjothi1982.github.io';
export const BASE = 'https://angle.example.workers.dev';

/** @param {Record<string, any>} [over] */
export function makeEnv(over = {}) {
  return {
    PROVIDER: 'anthropic',
    ANTHROPIC_API_KEY: 'sk-test-not-real',
    TOKEN_SIGNING_KEY: 'test-signing-key-0123456789abcdef0123456789',
    IP_HASH_KEY: 'test-ip-hash-key-0123456789',
    ALLOWED_ORIGINS: `${ORIGIN},http://localhost:8000`,
    DEVICE_DAILY_LIMIT: '5',
    DAILY_SPEND_CAP_USD: '10',
    LEDGER: memoryLedgerNamespace(),
    ANGLE_IP_LIMITER: allowAll(),
    SESSION_IP_LIMITER: allowAll(),
    ...over,
  };
}

export function allowAll() {
  return { calls: 0, async limit() { this.calls++; return { success: true }; } };
}
export function denyAll() {
  return { async limit() { return { success: false }; } };
}

/**
 * @param {{ script?: any[], provider?: any, now?: () => number, latencyMs?: number }} [o]
 */
export function makeApp(o = {}) {
  const logs = [];
  const provider = o.provider || createMockProvider({ script: o.script || [], latencyMs: o.latencyMs });
  const app = createApp({ systemPrompt: SYSTEM_PROMPT, provider, now: o.now, log: (l) => logs.push(l) });
  return { app, provider, logs };
}

/** @param {string} path @param {{ method?: string, body?: any, headers?: Record<string, string>, origin?: string | null, raw?: string }} [o] */
export function req(path, o = {}) {
  const headers = { ...(o.origin === null ? {} : { origin: o.origin || ORIGIN }), ...(o.body !== undefined || o.raw !== undefined ? { 'content-type': 'application/json' } : {}), 'cf-connecting-ip': '203.0.113.7', ...(o.headers || {}) };
  return new Request(`${BASE}${path}`, {
    method: o.method || (o.body !== undefined || o.raw !== undefined ? 'POST' : 'GET'),
    headers,
    body: o.raw !== undefined ? o.raw : o.body !== undefined ? JSON.stringify(o.body) : undefined,
  });
}

/** @param {{ fetch: Function }} app @param {Record<string, any>} env */
export async function getToken(app, env, body = {}) {
  const res = await app.fetch(req('/v1/session', { body }), env);
  const json = await res.json();
  if (res.status !== 200) throw new Error(`session failed: ${res.status} ${JSON.stringify(json)}`);
  return json.token;
}

/** @param {string} token @param {any} body @param {Record<string, string>} [headers] */
export function angleReq(token, body, headers = {}) {
  return req('/v1/angle', { body: { consent: true, ...body }, headers: { authorization: `Bearer ${token}`, ...headers } });
}

/** The five strong answers from the brief (§3), as complete scenes. */
export const ANCHORS = [
  {
    text: 'My boss embarrassed me in front of everyone.',
    scene: {
      emotion: 'embarrassment', situation_type: 'work', reasoning_pattern: 'valid_anger',
      known_fact: 'Your boss said something in front of everyone that embarrassed you.',
      possible_assumption: '',
      alternative_angle: 'How your boss handled it says something about their judgement in that moment, not just about you.',
      practical_next_step: 'Note down what was said and when, then decide whether to raise it privately.',
      interaction_type: 'find_boundary', mallow_character: 'glitzi',
      subtitle_line_1: "Your boss's behaviour may have been unfair.",
      subtitle_line_2: 'What matters now is deciding whether to address it privately or document what happened.',
      safety_status: 'ok',
    },
  },
  {
    text: "He hasn't replied to my message for five hours.",
    scene: {
      emotion: 'anxiety', situation_type: 'relationship', reasoning_pattern: 'fact_vs_assumption',
      known_fact: 'Your message has gone five hours without a reply.',
      possible_assumption: 'You might be reading the silence as a sign of how he feels.',
      alternative_angle: "Silence can mean many things, and this one hasn't been explained yet.",
      practical_next_step: 'Decide on a time to check again, then put the phone somewhere out of reach.',
      interaction_type: 'pull_apart', mallow_character: 'zuzu',
      subtitle_line_1: 'Five hours without a reply is a fact.',
      subtitle_line_2: 'What it means is still an unanswered question.',
      safety_status: 'ok',
    },
  },
  {
    text: "I failed my exam. I'm useless.",
    scene: {
      emotion: 'shame', situation_type: 'study', reasoning_pattern: 'self_criticism',
      known_fact: 'You failed one exam.',
      possible_assumption: 'You might be treating one result as a verdict on your whole ability.',
      alternative_angle: 'A failed exam can show what to practise next without deciding who you are.',
      practical_next_step: 'Look at which questions cost the most marks and pick one topic to revisit.',
      interaction_type: 'soften_harshness', mallow_character: 'boppo',
      subtitle_line_1: 'One exam measured your performance on one day.',
      subtitle_line_2: "It didn't measure everything you're capable of learning.",
      safety_status: 'ok',
    },
  },
  {
    text: 'My colleague got promoted instead of me.',
    scene: {
      emotion: 'disappointment', situation_type: 'work', reasoning_pattern: 'practical_problem',
      known_fact: 'Your colleague got the promotion you wanted.',
      possible_assumption: '',
      alternative_angle: "Their promotion doesn't settle whether you're ready; it may show what the role asked for this time.",
      practical_next_step: 'Ask your manager what would make you the strongest candidate next time.',
      interaction_type: 'assemble_step', mallow_character: 'boppo',
      subtitle_line_1: 'That disappointment makes sense.',
      subtitle_line_2: 'Could you ask what specific experience or results would strengthen your next promotion opportunity?',
      safety_status: 'ok',
    },
  },
  {
    text: 'I keep replaying something embarrassing I said.',
    scene: {
      emotion: 'embarrassment', situation_type: 'social', reasoning_pattern: 'rumination',
      known_fact: 'You said something that felt embarrassing, and you keep replaying it.',
      possible_assumption: 'You might be assuming it stayed as vivid for everyone else.',
      alternative_angle: 'The replay may feel like problem-solving, but it keeps showing the same scene.',
      practical_next_step: 'Decide whether anything is worth saying now; if not, let the replay run without joining in.',
      interaction_type: 'let_loop_drift', mallow_character: 'noomi',
      subtitle_line_1: "Your brain keeps replaying the moment, but replaying isn't repairing.",
      subtitle_line_2: 'Is there anything useful left to do, or can this remain an awkward memory?',
      safety_status: 'ok',
    },
  },
];

/** @param {number} i @param {Record<string, string>} [over] */
export const anchor = (i, over = {}) => ({ ...ANCHORS[i].scene, ...over });

/** A clock that only moves when told to. */
export function clock(start = Date.parse('2026-10-12T10:00:00Z')) {
  let t = start;
  const now = () => t;
  now.advance = (ms) => { t += ms; };
  now.set = (ms) => { t = ms; };
  return now;
}
