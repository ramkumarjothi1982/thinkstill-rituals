import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { SCENE_SCHEMA, SCENE_FIELDS, validateScene, normaliseScene } from '../src/schema.js';
import {
  PATTERNS, PATTERN_INTERACTION, INTERACTIONS, MALLOWS, SCENE_EMOTIONS, TAXONOMY_EMOTIONS, PATTERN_MALLOWS,
  PATTERN_TO_AUTHORED, INTERACTION_PATTERN, normaliseEmotion, normaliseIntention,
} from '../src/vocab.js';
import { anchor } from './helpers.js';

const APP_EMOTIONS = new URL('../../../src/data/emotions.js', import.meta.url);
const APP_FRAMEWORKS = new URL('../../../src/ultra/frameworks.js', import.meta.url);

test('scene fields are exactly the twelve the client contract names', () => {
  assert.deepEqual([...SCENE_FIELDS], [
    'emotion', 'situation_type', 'reasoning_pattern', 'known_fact', 'possible_assumption', 'alternative_angle',
    'practical_next_step', 'interaction_type', 'mallow_character', 'subtitle_line_1', 'subtitle_line_2', 'safety_status',
  ]);
});

test('the schema uses only structured-output features the API supports', () => {
  assert.equal(SCENE_SCHEMA.type, 'object');
  assert.equal(SCENE_SCHEMA.additionalProperties, false);
  assert.deepEqual(SCENE_SCHEMA.required, [...SCENE_FIELDS]);
  const allowedKeys = new Set(['type', 'enum', 'description']);
  for (const [name, prop] of Object.entries(SCENE_SCHEMA.properties)) {
    for (const k of Object.keys(prop)) assert.ok(allowedKeys.has(k), `${name}.${k} is not supported by structured outputs`);
    assert.equal(prop.type, 'string');
  }
});

test('ten reasoning patterns, each with its own mechanic; seven Mallows', () => {
  assert.equal(PATTERNS.length, 10);
  assert.equal(new Set(INTERACTIONS).size, 10);
  for (const p of PATTERNS) assert.ok(PATTERN_INTERACTION[p]);
  assert.deepEqual([...MALLOWS].sort(), ['blubi', 'boppo', 'glitzi', 'loomi', 'noomi', 'pipzi', 'zuzu']);
  for (const p of PATTERNS) for (const m of PATTERN_MALLOWS[p]) assert.ok(MALLOWS.includes(m));
  assert.equal(PATTERN_MALLOWS.valid_anger[0], 'glitzi');
  assert.equal(PATTERN_MALLOWS.rumination[0], 'noomi');
});

test('scene emotions are ids in the app taxonomy, and the taxonomy snapshot matches the app', { skip: !existsSync(APP_EMOTIONS) && 'app not in this checkout' }, async () => {
  for (const e of SCENE_EMOTIONS) assert.ok(TAXONOMY_EMOTIONS.includes(e), e);
  const app = await import(APP_EMOTIONS.href);
  assert.deepEqual([...TAXONOMY_EMOTIONS], [...app.ALL_EMOTION_IDS]);
});

test('every reasoning pattern maps to an authored-engine thought pattern id (or none), and mechanics map back', { skip: !existsSync(APP_FRAMEWORKS) && 'app not in this checkout' }, async () => {
  const { THOUGHT_PATTERNS } = await import(APP_FRAMEWORKS.href);
  const ids = new Set(THOUGHT_PATTERNS.map((p) => p.id));
  assert.deepEqual(Object.keys(PATTERN_TO_AUTHORED).sort(), [...PATTERNS].sort());
  for (const [p, id] of Object.entries(PATTERN_TO_AUTHORED)) if (id !== null) assert.ok(ids.has(id), `${p} → ${id}`);
  assert.equal(PATTERN_TO_AUTHORED.practical_problem, null);
  for (const p of PATTERNS) assert.equal(INTERACTION_PATTERN[PATTERN_INTERACTION[p]], p);
});

test('input emotion and intention spellings normalise', () => {
  assert.deepEqual(normaliseEmotion('Anxious'), { ok: true, id: 'anxiety' });
  assert.deepEqual(normaliseEmotion('overwhelm'), { ok: true, id: 'overwhelm' });
  assert.deepEqual(normaliseEmotion('something else'), { ok: true, id: null });
  assert.deepEqual(normaliseEmotion('fear-of-missing-out'), { ok: true, id: 'fear-of-missing-out' });
  assert.deepEqual(normaliseEmotion('hangry!'), { ok: false });
  assert.equal(normaliseIntention('Calm me down'), 'calm');
  assert.equal(normaliseIntention('help_me_let_go'), 'let_go');
  assert.equal(normaliseIntention('let-me-just-play'), 'play');
  assert.equal(normaliseIntention('make me rich'), null);
});

test('validateScene accepts a good scene and canonicalises enum case', () => {
  const r = validateScene({ ...anchor(1), mallow_character: 'Zuzu', emotion: 'ANXIETY' });
  assert.ok(r.ok);
  assert.equal(r.scene.mallow_character, 'zuzu');
  assert.equal(r.scene.emotion, 'anxiety');
});

test('validateScene rejects anything outside the contract', () => {
  const bad = (over, extra) => validateScene({ ...anchor(1), ...over, ...(extra || {}) });
  assert.equal(validateScene(null).ok, false);
  assert.equal(validateScene([]).ok, false);
  assert.equal(bad({ mallow_character: 'clippy' }).ok, false);
  assert.equal(bad({ interaction_type: 'run_javascript' }).ok, false);
  assert.equal(bad({ safety_status: 'fine' }).ok, false);
  assert.equal(bad({}, { url: 'https://x' }).ok, false);
  assert.equal(bad({ subtitle_line_1: 42 }).ok, false);
  assert.equal(bad({ subtitle_line_1: '' }).ok, false);
  assert.equal(bad({ subtitle_line_2: 'x'.repeat(400) }).ok, false);
  assert.equal(bad({ subtitle_line_1: 'Five hours‮ is a fact.' }).ok, false);
  const missing = { ...anchor(1) };
  delete missing.known_fact;
  assert.equal(validateScene(missing).ok, false);
  assert.equal(bad({ possible_assumption: '' }).ok, true);
});

test('normaliseScene pins the mechanic to the pattern and keeps the Mallow in role', () => {
  const r = normaliseScene({ ...anchor(1), interaction_type: 'find_boundary' });
  assert.equal(r.scene.interaction_type, 'pull_apart');
  assert.deepEqual(r.changed, ['interaction_type']);
  const m = normaliseScene({ ...anchor(1), mallow_character: 'glitzi' });
  assert.equal(m.scene.mallow_character, 'zuzu');
  const ok = normaliseScene({ ...anchor(1), emotion: 'sadness', mallow_character: 'blubi' });
  assert.equal(ok.scene.mallow_character, 'blubi');
});
