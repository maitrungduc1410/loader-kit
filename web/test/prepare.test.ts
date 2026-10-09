import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { IndicatorSpec } from '@loader-kit/spec';
import { BUILTIN_INDICATOR_NAMES, InvalidIndicatorError, MAX_ELEMENTS, MAX_RING_ARCS, prepare } from '../src/index.ts';

const problems = (run: () => unknown): readonly string[] => {
  try {
    run();
  } catch (error) {
    assert.ok(error instanceof InvalidIndicatorError, String(error));
    return error.errors;
  }
  assert.fail('expected an InvalidIndicatorError');
};

const grid = (columns: unknown, rows: unknown = 1): IndicatorSpec =>
  ({
    schemaVersion: 1,
    name: 'Grid',
    duration: 1,
    params: { columns: 1, rows: 1 },
    layout: { type: 'grid', columns, rows, gap: 0 },
    shape: { type: 'circle' },
    tracks: [{ property: 'opacity', keyTimes: [0, 1], values: [1, 0] }],
  }) as IndicatorSpec;

const ring = (count: number, segments: number): IndicatorSpec =>
  ({
    schemaVersion: 1,
    name: 'Rings',
    duration: 1,
    layout: { type: 'stack', count },
    shape: { type: 'ring', strokeWidth: 0.1, segments },
    tracks: [{ property: 'strokeEnd', keyTimes: [0, 1], values: [0, 1] }],
  }) as IndicatorSpec;

test('every built-in prepares, BallPulse by default', () => {
  for (const name of BUILTIN_INDICATOR_NAMES) assert.equal(prepare({ indicator: name }).spec.name, name);
  assert.equal(prepare({}).spec.name, 'BallPulse');
  assert.equal(prepare({ indicator: 'BallPulse' }, { count: 5 }).elementCount, 5);
});

test('a spec wins over the indicator, as an object or as JSON', () => {
  const spec = grid(2, 2);
  assert.equal(prepare({ indicator: 'BallPulse', spec }).elementCount, 4);
  assert.equal(prepare({ indicator: 'Nope', spec: JSON.stringify(spec) }).elementCount, 4);
  assert.equal(prepare({ indicator: 'BallBeat', spec: null }).spec.name, 'BallBeat');
});

test('unknown indicators, bad JSON and invalid specs throw InvalidIndicatorError listing the problems', () => {
  assert.match(problems(() => prepare({ indicator: 'Nope' }))[0]!, /^unknown indicator "Nope", expected one of Atom, AudioEqualizer, /);
  assert.match(problems(() => prepare({ indicator: 'constructor' }))[0]!, /unknown indicator "constructor"/);
  assert.match(problems(() => prepare({ spec: '{"schemaVersion": 1,' }))[0]!, /^spec is not valid JSON: /);
  const invalid = problems(() => prepare({ spec: { schemaVersion: 2, name: 'X', duration: -1 } as unknown as IndicatorSpec }));
  assert.ok(invalid.length >= 2, invalid.join('; '));
  assert.ok(invalid.some((error) => error.includes('schemaVersion')));
  assert.deepEqual(problems(() => prepare({ spec: 'null' })), ['spec must be an object']);
});

test('the error message names every problem', () => {
  try {
    prepare({ spec: { schemaVersion: 1, name: 'X', duration: 0 } as unknown as IndicatorSpec });
  } catch (error) {
    assert.ok(error instanceof InvalidIndicatorError);
    for (const problem of error.errors) assert.ok(error.message.includes(problem));
    return;
  }
  assert.fail('expected an error');
});

test('stagger and durations shorter than the element count are reported when prepared', () => {
  const spec = { ...grid(2), stagger: [0] } as IndicatorSpec;
  assert.match(problems(() => prepare({ spec }))[0]!, /stagger has 1 entries but the layout has 2 elements/);
});

test('params: declared overrides must be finite numbers, unknown names are ignored', () => {
  const spec = grid({ $param: 'columns' });
  assert.equal(prepare({ spec }, { columns: 3, unknown: Number.NaN }).elementCount, 3);
  assert.deepEqual(problems(() => prepare({ spec }, { columns: Number.NaN })), ['params.columns must be a finite number']);
  assert.deepEqual(problems(() => prepare({ spec }, { columns: '3' } as never)), ['params.columns must be a finite number']);
  assert.deepEqual(problems(() => prepare({ spec }, null as never)), ['params must be an object of numbers']);
});

test(`at most ${MAX_ELEMENTS} elements in total`, () => {
  assert.equal(prepare({ spec: grid(100, 100) }).elementCount, MAX_ELEMENTS);
  assert.deepEqual(problems(() => prepare({ spec: grid(10_001) })), [
    'the spec has 10001 elements, the maximum is 10000',
  ]);
  const parts = {
    schemaVersion: 1,
    name: 'Parts',
    duration: 1,
    parts: [grid(5_000), grid(5_001)].map(({ layout, shape, tracks }) => ({ layout, shape, tracks })),
  } as IndicatorSpec;
  assert.deepEqual(problems(() => prepare({ spec: parts })), ['the spec has 10001 elements, the maximum is 10000']);
});

test('huge counts are rejected before anything is allocated for them', () => {
  const started = performance.now();
  assert.deepEqual(problems(() => prepare({ spec: grid({ $param: 'columns' }, { $param: 'rows' }) }, { columns: 1e9, rows: 1e9 })), [
    'the spec has 1000000000000000000 elements, the maximum is 10000',
  ]);
  assert.ok(performance.now() - started < 100);
});

test('non-finite overrides never reach the counts, param-driven segments resolve', () => {
  const spec = { ...grid(1), params: { columns: 1 }, layout: { type: 'grid', columns: { $param: 'columns' }, rows: 1, gap: 0 } } as IndicatorSpec;
  assert.deepEqual(problems(() => prepare({ spec }, { columns: Number.POSITIVE_INFINITY })), [
    'params.columns must be a finite number',
  ]);
  const inParts = {
    schemaVersion: 1,
    name: 'Parts',
    duration: 1,
    params: { n: 1 },
    parts: [{ ...ring(1, 1), layout: { type: 'ring', count: 1, itemSize: 0.2 } }].map(({ layout, shape, tracks }) => ({
      layout,
      shape: { ...shape, segments: { $param: 'n' } },
      tracks,
    })),
  } as unknown as IndicatorSpec;
  assert.equal(prepare({ spec: inParts }, { n: 3 }).parts[0]!.shape.type, 'ring');
});

test(`at most ${MAX_RING_ARCS} ring arcs: element count times segments`, () => {
  assert.equal(prepare({ spec: ring(1_000, 10) }).elementCount, 1_000);
  assert.deepEqual(problems(() => prepare({ spec: ring(1_000, 11) })), [
    'the spec draws 11000 ring arcs, the maximum is 10000',
  ]);
  assert.deepEqual(problems(() => prepare({ spec: ring(1, 10_001) })), [
    'the spec draws 10001 ring arcs, the maximum is 10000',
  ]);
});
