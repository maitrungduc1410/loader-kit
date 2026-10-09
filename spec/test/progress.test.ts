import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  ProgressAnimator,
  progressCommands,
  progressContentInset,
  progressGridOrder,
  progressIntrinsicSize,
  progressLabel,
  resolveProgress,
  type ProgressOptions,
  type ProgressState,
} from '../src/index.ts';

const dir = new URL('../../test-vectors/progress/', import.meta.url);
const read = <T>(name: string) => JSON.parse(readFileSync(new URL(name, dir), 'utf8')) as T;
const index = read<{ tolerance: number; files: string[] }>('index.json');

function assertClose(actual: unknown, expected: unknown, path: string): void {
  if (typeof expected === 'number') {
    assert.equal(typeof actual, 'number', `${path}: ${String(actual)} is not a number`);
    assert.ok(Math.abs((actual as number) - expected) <= index.tolerance, `${path}: ${String(actual)} != ${expected}`);
  } else if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual), `${path}: not an array`);
    assert.equal(actual.length, expected.length, `${path}: length ${actual.length} != ${expected.length}`);
    expected.forEach((item, i) => assertClose(actual[i], item, `${path}[${i}]`));
  } else if (expected !== null && typeof expected === 'object') {
    assert.ok(actual !== null && typeof actual === 'object', `${path}: not an object`);
    const keys = Object.keys(expected);
    assert.deepEqual(Object.keys(actual).sort(), [...keys].sort(), `${path}: keys`);
    for (const key of keys) assertClose((actual as Record<string, unknown>)[key], (expected as Record<string, unknown>)[key], `${path}.${key}`);
  } else {
    assert.equal(actual, expected, path);
  }
}

test('progress index lists the vector files', () => {
  assert.deepEqual(index.files.slice().sort(), [
    'animator.json',
    'geometry-bars.json',
    'geometry-battery.json',
    'geometry-border.json',
    'geometry-circular.json',
    'geometry-gauge.json',
    'geometry-grid.json',
    'geometry-linear.json',
    'geometry-liquid.json',
    'geometry-pie.json',
    'resolve.json',
  ]);
});

test('progress resolve vectors', () => {
  const { cases } = read<{ cases: { description: string; options: ProgressOptions; resolved: unknown; intrinsicSize: unknown; contentInset: number }[] }>('resolve.json');
  for (const c of cases) {
    const resolved = resolveProgress(c.options);
    assertClose(resolved, c.resolved, c.description);
    assertClose(progressIntrinsicSize(resolved), c.intrinsicSize, `${c.description} size`);
    assertClose(progressContentInset(resolved), c.contentInset, `${c.description} inset`);
  }
});

for (const file of index.files.filter((name) => name.startsWith('geometry-'))) {
  test(`progress ${file}`, () => {
    const { cases } = read<{ cases: { description: string; options: ProgressOptions; width: number; height: number; state: ProgressState; x: number; y: number; commands: unknown[] }[] }>(file);
    assert.ok(cases.length > 0);
    for (const c of cases) {
      const drawing = progressCommands(resolveProgress(c.options), c.state, c.width, c.height);
      assertClose(drawing, { x: c.x, y: c.y, commands: c.commands }, c.description);
    }
  });
}

test('progress animator vectors', () => {
  type Event = { frame: number; set: 'value' | 'buffer' | 'speed' | 'reduceMotion'; value: number | boolean | null | 'NaN'; smooth?: boolean };
  const { scenarios } = read<{
    scenarios: {
      description: string;
      fps: number;
      initial: { value: number | null; buffer: number | null };
      speed: number;
      reduceMotion: boolean;
      frames: number;
      every: number;
      events: Event[];
      initialState: Record<string, unknown>;
      snapshots: Record<string, unknown>[];
    }[];
  }>('animator.json');
  const number = (v: Event['value']) => (v === 'NaN' ? Number.NaN : (v as number | null));
  for (const s of scenarios) {
    const animator = new ProgressAnimator(s.initial.value, s.initial.buffer);
    const snapshot = () => ({ ...animator.state, target: animator.target, moving: animator.moving });
    assertClose(snapshot(), s.initialState, `${s.description} initial`);
    let speed = s.speed;
    let reduceMotion = s.reduceMotion;
    let next = 0;
    for (let frame = 0; frame < s.frames; frame++) {
      for (const event of s.events) {
        if (event.frame !== frame) continue;
        if (event.set === 'value') animator.setValue(number(event.value), frame / s.fps, event.smooth ?? true);
        else if (event.set === 'buffer') animator.setBuffer(number(event.value), frame / s.fps, event.smooth ?? true);
        else if (event.set === 'speed') speed = event.value as number;
        else reduceMotion = event.value as boolean;
      }
      animator.step(1 / s.fps, speed, reduceMotion);
      if (frame % s.every !== 0) continue;
      const { frame: expectedFrame, ...expected } = s.snapshots[next++]!;
      assert.equal(expectedFrame, frame);
      assertClose(snapshot(), expected, `${s.description} frame ${frame}`);
    }
    assert.equal(next, s.snapshots.length);
  }
});

test('the glide never passes the real value and never moves backward while it rises', () => {
  const animator = new ProgressAnimator(0);
  let previous = 0;
  let target = 0;
  for (let frame = 0; frame < 900; frame++) {
    // Uneven updates: bursts, pauses and big steps.
    if (frame % 7 === 0 && frame % 210 < 150) target = Math.min(1, target + ((frame * 7919) % 13) / 400);
    if (frame === 600) target = 1;
    animator.setValue(target, frame / 60, true);
    animator.step(1 / 60, 1, false);
    const { value } = animator.state;
    assert.ok(value <= target + 1e-9, `frame ${frame}: ${value} > ${target}`);
    assert.ok(value >= previous - 1e-9, `frame ${frame}: ${value} < ${previous}`);
    previous = value;
  }
  assert.equal(animator.state.value, 1);
  assert.equal(animator.moving, false);
});

test('a backward update takes 0.4 s and an isolated forward update 0.5 s', () => {
  const animator = new ProgressAnimator(0.8);
  animator.setValue(0.2, 10, true);
  for (let i = 0; i < 23; i++) animator.step(1 / 60, 1, false);
  assert.ok(animator.state.value > 0.2);
  animator.step(1 / 60, 1, false);
  assert.equal(animator.state.value, 0.2);
  animator.setValue(0.6, 20, true);
  for (let i = 0; i < 29; i++) animator.step(1 / 60, 1, false);
  assert.ok(animator.state.value < 0.6);
  animator.step(1 / 60, 1, false);
  assert.equal(animator.state.value, 0.6);
});

test('NaN and null values are indeterminate; infinities clamp', () => {
  assert.equal(new ProgressAnimator(Number.NaN).indeterminate, true);
  assert.equal(new ProgressAnimator(null).target, null);
  assert.equal(new ProgressAnimator(Number.POSITIVE_INFINITY).target, 1);
  assert.equal(new ProgressAnimator(-5).target, 0);
  const animator = new ProgressAnimator(0.5);
  animator.step(Number.NaN, 1, false);
  animator.step(-1, 1, false);
  assert.equal(animator.state.time, 0);
});

test('non-finite options take the defaults', () => {
  const resolved = resolveProgress({ type: 'linear', thickness: Number.NaN, segments: Number.POSITIVE_INFINITY, speed: Number.NaN, waveSpeed: Number.NEGATIVE_INFINITY });
  assert.equal(resolved.thickness, 4);
  assert.equal(resolved.segments, 1);
  assert.equal(resolved.speed, 1);
  assert.equal(resolved.waveSpeed, 1);
});

test('progressCommands draws nothing in an empty or invalid box', () => {
  const p = resolveProgress();
  const s = new ProgressAnimator(0.5).state;
  for (const [w, h] of [
    [0, 48],
    [48, -1],
    [Number.NaN, 48],
    [48, Number.POSITIVE_INFINITY],
  ] as const) {
    assert.deepEqual(progressCommands(p, s, w, h).commands, []);
  }
});

test('the label rounds half up', () => {
  assert.equal(progressLabel(0.125), '13%');
  assert.equal(progressLabel(0.005), '1%');
  assert.equal(progressLabel(0.994), '99%');
  assert.equal(progressLabel(2), '100%');
  assert.equal(progressLabel(-1), '0%');
});

test('the grid fills diagonal by diagonal', () => {
  assert.deepEqual(progressGridOrder(3), [0, 1, 3, 2, 4, 6, 5, 7, 8]);
  assert.deepEqual(progressGridOrder(1), [0]);
});
