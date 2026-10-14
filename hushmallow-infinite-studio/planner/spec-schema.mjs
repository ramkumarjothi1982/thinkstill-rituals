// Structural validation of a variant spec against
// planner/schema/hm-variant-1.schema.json (the shared contract with the
// composer). The validator implements exactly the JSON Schema keywords that
// file uses, so the schema stays the single source of truth without a
// dependency: type, const, enum, pattern, minLength/maxLength,
// minimum/maximum, minItems/maxItems, items, required, properties,
// additionalProperties (false or a schema) and local $ref.

import fs from 'node:fs';
import { studioPath } from '../render/lib/paths.mjs';

export const SCHEMA_FILE = studioPath('planner', 'schema', 'hm-variant-1.schema.json');
let schemaCache = null;
export const specSchema = () => (schemaCache ||= JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8')));

const KNOWN = new Set(['$schema', '$id', '$defs', '$ref', 'title', 'description', 'type', 'const', 'enum', 'pattern', 'minLength', 'maxLength',
  'minimum', 'maximum', 'minItems', 'maxItems', 'items', 'required', 'properties', 'additionalProperties']);

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v;
}
const typeMatches = (want, v) => {
  const t = typeOf(v);
  return want === t || (want === 'number' && t === 'integer');
};

/** Validate value against schema (root for $ref). → list of "path: problem" strings. */
export function validateSchema(value, schema = specSchema(), root = schema, at = '$') {
  const errs = [];
  for (const k of Object.keys(schema)) if (!KNOWN.has(k)) throw new Error(`schema keyword "${k}" at ${at} is not supported by planner/spec-schema.mjs`);
  if (schema.$ref) {
    const m = /^#\/\$defs\/(.+)$/.exec(schema.$ref);
    if (!m || !root.$defs?.[m[1]]) throw new Error(`unresolvable $ref ${schema.$ref}`);
    return validateSchema(value, root.$defs[m[1]], root, at);
  }
  if ('const' in schema && value !== schema.const) errs.push(`${at}: must be ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errs.push(`${at}: must be one of ${schema.enum.map((e) => JSON.stringify(e)).join(', ')}`);
  if (schema.type) {
    const types = [].concat(schema.type);
    if (!types.some((t) => typeMatches(t, value))) { errs.push(`${at}: must be ${types.join(' or ')}`); return errs; }
  }
  if (typeof value === 'string') {
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errs.push(`${at}: "${value}" does not match ${schema.pattern}`);
    if (schema.minLength != null && value.length < schema.minLength) errs.push(`${at}: shorter than ${schema.minLength}`);
    if (schema.maxLength != null && value.length > schema.maxLength) errs.push(`${at}: longer than ${schema.maxLength}`);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) errs.push(`${at}: not finite`);
    if (schema.minimum != null && value < schema.minimum) errs.push(`${at}: below ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) errs.push(`${at}: above ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) errs.push(`${at}: fewer than ${schema.minItems} items`);
    if (schema.maxItems != null && value.length > schema.maxItems) errs.push(`${at}: more than ${schema.maxItems} items`);
    if (schema.items) value.forEach((v, i) => errs.push(...validateSchema(v, schema.items, root, `${at}[${i}]`)));
  }
  if (typeOf(value) === 'object') {
    for (const k of schema.required || []) if (!(k in value)) errs.push(`${at}: missing "${k}"`);
    for (const [k, v] of Object.entries(value)) {
      if (schema.properties?.[k]) errs.push(...validateSchema(v, schema.properties[k], root, `${at}.${k}`));
      else if (schema.additionalProperties === false) errs.push(`${at}: unexpected field "${k}"`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') errs.push(...validateSchema(v, schema.additionalProperties, root, `${at}.${k}`));
    }
  }
  return errs;
}

/** Shape problems of a spec (empty = structurally valid). */
export const validateSpecShape = (spec) => validateSchema(spec);
