import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BUILTIN_INDICATORS,
  InvalidIndicatorError,
  defineIndicator,
  param,
  resolveParams,
  validate,
  type IndicatorSpec,
} from '../src/index.ts';

const base = {
  schemaVersion: 1,
  name: 'Test',
  duration: 1,
  layout: { type: 'single' },
  shape: { type: 'circle' },
  tracks: [{ property: 'opacity', keyTimes: [0, 1], values: [0, 1] }],
};

const errorsFor = (patch: Record<string, unknown>) => validate({ ...base, ...patch });

test('built-in indicators are valid', () => {
  for (const spec of Object.values(BUILTIN_INDICATORS)) assert.deepEqual(validate(spec), []);
});

test('the base fixture is valid', () => {
  assert.deepEqual(validate(base), []);
});

test('rejects bad top-level fields', () => {
  assert.ok(errorsFor({ schemaVersion: 2 }).length > 0);
  assert.ok(errorsFor({ duration: 0 }).length > 0);
  assert.ok(errorsFor({ perspective: -1 }).length > 0);
  assert.ok(errorsFor({ params: { a: Number.NaN } }).length > 0);
  assert.ok(validate(null).length > 0);
});

test('rejects bad layouts, shapes and stagger', () => {
  assert.ok(errorsFor({ layout: { type: 'row', gap: 0.1 } }).length > 0);
  assert.ok(errorsFor({ layout: { type: 'hex' } }).length > 0);
  assert.ok(errorsFor({ shape: { type: 'ring' } }).length > 0);
  assert.ok(errorsFor({ stagger: { each: 'fast' } }).length > 0);
  assert.ok(errorsFor({ stagger: [0, Number.NaN] }).length > 0);
  assert.ok(errorsFor({ shape: { type: 'ring', strokeWidth: 0.1, sweep: 7 } }).length > 0);
  assert.ok(errorsFor({ shape: { type: 'circle', sweep: 0 } }).length > 0);
  assert.ok(errorsFor({ layout: { type: 'stack' } }).length > 0);
  assert.ok(errorsFor({ layout: { type: 'single', x: 'left' } }).length > 0);
});

test('negative stagger offsets start an element mid-cycle', () => {
  assert.deepEqual(errorsFor({ layout: { type: 'stack', count: 2 }, stagger: [0, -0.5] }), []);
  assert.deepEqual(errorsFor({ layout: { type: 'stack', count: 2 }, stagger: { each: -0.1, start: 0.2 } }), []);
});

test('parts, rest, durations and group tracks', () => {
  const { layout, shape, tracks, ...head } = base;
  const part = { layout, shape, tracks };
  const withParts = (parts: unknown[], extra: Record<string, unknown> = {}) => validate({ ...head, parts, ...extra });
  assert.deepEqual(withParts([part, { layout, shape: { type: 'rect' }, duration: 2 }]), []);
  assert.ok(withParts([]).length > 0);
  assert.ok(withParts([part], { layout }).length > 0);
  assert.ok(withParts([{ ...part, duration: 0 }]).length > 0);
  assert.ok(withParts([{ layout, shape }]).some((error) => error.includes('at least one track')));
  assert.deepEqual(withParts([{ layout, shape, groupTracks: [{ property: 'rotate', keyTimes: [0, 1], values: [0, 1] }] }]), []);
  assert.ok(withParts([{ layout, shape, groupTracks: [{ property: 'rotateX', keyTimes: [0, 1], values: [0, 1] }] }]).length > 0);
  assert.ok(errorsFor({ durations: [1, 0] }).length > 0);
  assert.deepEqual(errorsFor({ durations: [0.5], rest: { opacity: 0.5 } }), []);
  assert.ok(errorsFor({ rest: { skew: 1 } }).length > 0);
  assert.ok(errorsFor({ rest: { opacity: param('missing') } }).length > 0);
});

test('stroke trims need a ring shape', () => {
  const trim = { property: 'strokeEnd', keyTimes: [0, 1], values: [0, 1] };
  assert.ok(errorsFor({ tracks: [trim] }).some((error) => error.includes('needs a ring shape')));
  assert.ok(errorsFor({ rest: { strokeStart: 0.2 } }).length > 0);
  assert.deepEqual(errorsFor({ shape: { type: 'ring', strokeWidth: 0.1 }, tracks: [trim], rest: { strokeStart: 0.2 } }), []);
});

test('rejects bad tracks', () => {
  const track = base.tracks[0]!;
  const withTrack = (patch: Record<string, unknown>) => errorsFor({ tracks: [{ ...track, ...patch }] });
  assert.ok(withTrack({ property: 'skew' }).length > 0);
  assert.ok(withTrack({ keyTimes: [0] , values: [0] }).length > 0);
  assert.ok(withTrack({ keyTimes: [0.5, 0.2] }).length > 0);
  assert.ok(withTrack({ keyTimes: [0, 1.5] }).length > 0);
  assert.ok(withTrack({ values: [0, 1, 2] }).length > 0);
  assert.ok(withTrack({ easing: 'bounce' }).length > 0);
  assert.ok(withTrack({ easing: [1.5, 0, 0, 1] }).length > 0);
  assert.ok(withTrack({ easing: ['linear', 'easeIn'] }).length > 0);
  assert.ok(errorsFor({ tracks: [track, track] }).length > 0);
  assert.ok(errorsFor({ tracks: [] }).length > 0);
});

test('names inherited from Object.prototype are not easings or params', () => {
  const track = base.tracks[0]!;
  assert.ok(errorsFor({ tracks: [{ ...track, easing: 'constructor' }] }).length > 0);
  assert.ok(errorsFor({ layout: { type: 'single', size: { $param: 'toString' } } }).length > 0);
  assert.ok(errorsFor({ tracks: [{ ...track, keyTimes: [0, Number.NaN] }] }).length > 0);
  assert.deepEqual(resolveParams({ ...base, params: { a: 1 } } as IndicatorSpec, { toString: 2 }), { a: 1 });
});

test('defineIndicator throws with every problem listed', () => {
  assert.throws(
    () =>
      defineIndicator({
        duration: -1,
        layout: { type: 'row', count: param('count'), gap: 0.1 },
        shape: { type: 'circle' },
        tracks: [],
      }),
    (error: unknown) => error instanceof InvalidIndicatorError && error.errors.length >= 2
  );
});

test('defineIndicator catches a stagger array that is too short', () => {
  assert.throws(
    () =>
      defineIndicator({
        duration: 1,
        layout: { type: 'row', count: 3, gap: 0.1 },
        shape: { type: 'circle' },
        stagger: [0, 0.1],
        tracks: [{ property: 'opacity', keyTimes: [0, 1], values: [0, 1] }],
      }),
    InvalidIndicatorError
  );
});
