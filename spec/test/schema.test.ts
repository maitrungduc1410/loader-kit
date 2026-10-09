import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { BUILTIN_INDICATORS, validate } from '../src/index.ts';
import { EDGE_CASES } from '../scripts/edge-cases.ts';
import { SCHEMA_URL } from '../scripts/schema.ts';

const require = createRequire(import.meta.url);
const Ajv = require('ajv') as typeof import('ajv').default;
const schema = JSON.parse(readFileSync(new URL('../schema.json', import.meta.url), 'utf8'));
const check = new Ajv({ allErrors: true, strict: true }).compile(schema);

const errors = (spec: unknown) => (check(spec) ? [] : check.errors!.map((e) => `${e.instancePath} ${e.message}`));

const pulse = {
  schemaVersion: 1,
  name: 'Pulse',
  duration: 1,
  params: { count: 3 },
  layout: { type: 'row', count: { $param: 'count' }, gap: 0.1 },
  shape: { type: 'circle' },
  tracks: [{ property: 'scale', keyTimes: [0, 0.5, 1], values: [1, 0.3, 1], easing: 'easeInOut' }],
  stagger: { each: 0.12 },
};

test('the schema has the public id', () => {
  assert.equal(schema.$id, SCHEMA_URL);
});

test('every built-in matches the schema', () => {
  for (const [name, spec] of Object.entries(BUILTIN_INDICATORS)) {
    assert.deepEqual(errors(spec), [], name);
  }
});

test('every edge case and vector spec matches the schema', () => {
  for (const { id, spec } of EDGE_CASES) assert.deepEqual(errors(spec), [], id);
  const dir = new URL('../../test-vectors/', import.meta.url);
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.json') && name !== 'index.json')) {
    const { spec } = JSON.parse(readFileSync(join(dir.pathname, file), 'utf8'));
    assert.deepEqual(errors(spec), [], file);
  }
});

test('a spec may name the schema', () => {
  const spec = { $schema: SCHEMA_URL, ...pulse };
  assert.deepEqual(errors(spec), []);
  assert.deepEqual(validate(spec), []);
});

test('specs with parts must not repeat part fields at the top level', () => {
  const { layout, shape, tracks, stagger, ...base } = pulse;
  const parts = { ...base, parts: [{ layout, shape, tracks, stagger, duration: 2 }] };
  assert.deepEqual(errors(parts), []);
  assert.notDeepEqual(errors({ ...parts, layout }), []);
  assert.notDeepEqual(errors(base), []);
});

test('the schema rejects what validate() rejects field by field', () => {
  const broken: [string, unknown][] = [
    ['unknown version', { ...pulse, schemaVersion: 2 }],
    ['empty name', { ...pulse, name: '' }],
    ['zero duration', { ...pulse, duration: 0 }],
    ['unknown layout', { ...pulse, layout: { type: 'spiral', count: 3 } }],
    ['row without gap', { ...pulse, layout: { type: 'row', count: 3 } }],
    ['ring shape without stroke', { ...pulse, shape: { type: 'ring' } }],
    ['sweep above 2π', { ...pulse, shape: { type: 'circle', sweep: 7 } }],
    ['unknown property', { ...pulse, tracks: [{ ...pulse.tracks[0], property: 'blur' }] }],
    ['key time above 1', { ...pulse, tracks: [{ ...pulse.tracks[0], keyTimes: [0, 0.5, 1.5] }] }],
    ['unknown easing', { ...pulse, tracks: [{ ...pulse.tracks[0], easing: 'bounce' }] }],
    ['bezier x out of range', { ...pulse, tracks: [{ ...pulse.tracks[0], easing: [1.2, 0, 0.5, 1] }] }],
    ['group track on a stroke property', { ...pulse, groupTracks: [{ property: 'strokeEnd', keyTimes: [0, 1], values: [0, 1] }] }],
    ['param that is not a number', { ...pulse, params: { count: '3' } }],
  ];
  for (const [label, spec] of broken) {
    assert.notDeepEqual(errors(spec), [], label);
    assert.notDeepEqual(validate(spec), [], label);
  }
});

test('the schema flags typos that engines ignore', () => {
  assert.notDeepEqual(errors({ ...pulse, tracks: [{ ...pulse.tracks[0], keytimes: [0, 1] }] }), []);
  assert.notDeepEqual(errors({ ...pulse, layout: { ...pulse.layout, itemSize: 0.2 } }), []);
});
