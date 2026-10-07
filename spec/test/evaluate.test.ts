import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BUILTIN_INDICATORS,
  cubicBezier,
  defineIndicator,
  evaluate,
  layoutElements,
  resolveParams,
  sampleTrack,
  staggerOffsets,
  timeForCycleProgress,
} from '../src/index.ts';

const close = (actual: number, expected: number, message?: string) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, message ?? `${actual} != ${expected}`);

const single = (tracks: Parameters<typeof defineIndicator>[0]['tracks'], duration = 1) =>
  defineIndicator({ duration, layout: { type: 'single' }, shape: { type: 'circle' }, tracks });

test('row layout fills the box', () => {
  const [a, b, c] = layoutElements({ type: 'row', count: 3, gap: 0.05 }, {});
  const width = (1 - 0.1) / 3;
  close(a!.width, width);
  close(a!.cx, width / 2);
  close(c!.cx + c!.width / 2, 1);
  close(b!.cx, 0.5);
  close(b!.cy, 0.5);
});

test('grid layout is row-major', () => {
  const elements = layoutElements({ type: 'grid', columns: 3, rows: 2, gap: 0.1 }, {});
  assert.equal(elements.length, 6);
  close(elements[1]!.cy, elements[0]!.cy);
  close(elements[3]!.cx, elements[0]!.cx);
  assert.ok(elements[3]!.cy > elements[0]!.cy);
});

test('ring layout starts at angle 0 (3 o\'clock) and goes clockwise', () => {
  const elements = layoutElements({ type: 'ring', count: 4, itemSize: 0.2 }, {});
  close(elements[0]!.cx, 0.9);
  close(elements[0]!.cy, 0.5);
  close(elements[1]!.cx, 0.5);
  close(elements[1]!.cy, 0.9);
  close(elements[1]!.rotate, 0);
  const oriented = layoutElements({ type: 'ring', count: 4, itemSize: 0.2, orient: true }, {});
  close(oriented[0]!.rotate, Math.PI / 2);
});

test('params resolve with overrides and ignore unknown names', () => {
  assert.deepEqual(resolveParams(BUILTIN_INDICATORS.BallPulse, { count: 5, nope: 1 }), { count: 5, minScale: 0.3 });
  const elements = layoutElements(BUILTIN_INDICATORS.BallPulse.layout!, { count: 4.6 });
  assert.equal(elements.length, 5);
});

test('stagger offsets', () => {
  assert.deepEqual(staggerOffsets(undefined, 3), [0, 0, 0]);
  assert.deepEqual(staggerOffsets({ each: 0.5 }, 3), [0, 0.5, 1]);
  assert.deepEqual(staggerOffsets({ each: 0.5, start: 0.25 }, 2), [0.25, 0.75]);
  assert.throws(() => staggerOffsets([0, 1], 3));
});

test('values hold outside the keyTimes range', () => {
  const track = { property: 'translateX' as const, keyTimes: [0.2, 0.8], values: [1, 2] };
  assert.equal(sampleTrack(track, 0, {}), 1);
  assert.equal(sampleTrack(track, 0.2, {}), 1);
  close(sampleTrack(track, 0.5, {}), 1.5);
  assert.equal(sampleTrack(track, 0.8, {}), 2);
  assert.equal(sampleTrack(track, 0.95, {}), 2);
});

test('a zero-length segment jumps to the later value', () => {
  const track = { property: 'translateX' as const, keyTimes: [0, 0.5, 0.5, 1], values: [0, 1, 5, 6] };
  close(sampleTrack(track, 0.4999, {}), 0.9998);
  assert.equal(sampleTrack(track, 0.5, {}), 5);
});

test('easing applies per segment', () => {
  const track = {
    property: 'opacity' as const,
    keyTimes: [0, 0.5, 1],
    values: [0, 1, 0],
    easing: ['easeIn', [0.1, 0.9, 0.2, 1]] as const,
  };
  close(sampleTrack(track, 0.25, {}), cubicBezier([0.42, 0, 1, 1], 0.5));
  close(sampleTrack(track, 0.75, {}), 1 - cubicBezier([0.1, 0.9, 0.2, 1], 0.5));
  const shared = { ...track, easing: [0.1, 0.9, 0.2, 1] as const };
  close(sampleTrack(shared, 0.25, {}), cubicBezier([0.1, 0.9, 0.2, 1], 0.5));
});

test('elements rest until their stagger offset, then loop', () => {
  const spec = defineIndicator({
    duration: 1,
    layout: { type: 'row', count: 2, gap: 0 },
    shape: { type: 'circle' },
    stagger: [0, 0.5],
    tracks: [{ property: 'opacity', keyTimes: [0, 1], values: [0, 1] }],
  });
  const [first, second] = evaluate(spec, 0.25);
  close(first!.opacity, 0.25);
  assert.equal(second!.opacity, 1);
  close(evaluate(spec, 1.75)[1]!.opacity, 0.25);
  close(evaluate(spec, 3.25)[0]!.opacity, 0.25);
});

test('scale multiplies scaleX/scaleY and track rotate adds to layout rotate', () => {
  const spec = defineIndicator({
    duration: 1,
    layout: { type: 'ring', count: 1, itemSize: 0.2, orient: true },
    shape: { type: 'line' },
    tracks: [
      { property: 'scale', keyTimes: [0, 1], values: [2, 2] },
      { property: 'scaleY', keyTimes: [0, 1], values: [0.5, 0.5] },
      { property: 'rotate', keyTimes: [0, 1], values: [1, 1] },
    ],
  });
  const [state] = evaluate(spec, 0.3);
  close(state!.scaleX, 2);
  close(state!.scaleY, 1);
  close(state!.rotate, Math.PI / 2 + 1);
});

test('timeForCycleProgress skips the stagger warm-up', () => {
  const spec = BUILTIN_INDICATORS.BallSpinFadeLoader;
  close(timeForCycleProgress(spec, 0), 1);
  close(timeForCycleProgress(spec, 0.5), 1.5);
  close(timeForCycleProgress(spec, 2), 2);
  close(timeForCycleProgress(single([{ property: 'opacity', keyTimes: [0, 1], values: [0, 1] }], 2), 0.25), 0.5);
});

test('BallPulse matches the reference CAKeyframeAnimation timing', () => {
  // Reference: scale keyframes [1, 0.3, 1] at keyTimes [0, 0.3, 1], one bezier per segment,
  // beginTime 0.12 * (i + 1), duration 0.75, repeating forever.
  const bezier = [0.2, 0.68, 0.18, 1.08] as const;
  const reference = (i: number, t: number) => {
    const local = t - 0.12 * (i + 1);
    if (local < 0) return 1;
    const p = (local % 0.75) / 0.75;
    if (p < 0.3) return 1 + (0.3 - 1) * cubicBezier(bezier, p / 0.3);
    return 0.3 + (1 - 0.3) * cubicBezier(bezier, (p - 0.3) / 0.7);
  };
  for (let t = 0; t < 3; t += 0.01) {
    evaluate(BUILTIN_INDICATORS.BallPulse, t).forEach((state, i) => close(state.scaleX, reference(i, t), `t=${t} i=${i}`));
  }
});

test('single and stack layouts place elements by size and center', () => {
  const [one] = layoutElements({ type: 'single', size: 0.4, height: 0.2, x: 0.25 }, {});
  assert.deepEqual(one, { cx: 0.25, cy: 0.5, width: 0.4, height: 0.2, rotate: 0 });
  const stack = layoutElements({ type: 'stack', count: 3, y: 0.1 }, {});
  assert.equal(stack.length, 3);
  for (const element of stack) assert.deepEqual(element, { cx: 0.5, cy: 0.1, width: 1, height: 1, rotate: 0 });
});

test('a row with itemWidth is centered', () => {
  const [a, b] = layoutElements({ type: 'row', count: 2, gap: 0.2, itemWidth: 0.1 }, {});
  close(a!.cx, 0.35);
  close(b!.cx, 0.65);
  close(a!.height, 0.1);
});

test('ring itemWidth and itemHeight keep the radius of itemSize', () => {
  const [first] = layoutElements({ type: 'ring', count: 4, itemSize: 0.3, itemWidth: 0.1, itemHeight: 0.2 }, {});
  close(first!.cx, 0.85);
  close(first!.width, 0.1);
  close(first!.height, 0.2);
});

test('rest values apply before the start and to properties without a track', () => {
  const spec = defineIndicator({
    duration: 1,
    layout: { type: 'stack', count: 2 },
    shape: { type: 'circle' },
    stagger: [0, 0.5],
    rest: { opacity: 0.25, translateX: 0.1 },
    tracks: [{ property: 'opacity', keyTimes: [0, 1], values: [1, 0] }],
  });
  const [running, waiting] = evaluate(spec, 0.25);
  close(running!.opacity, 0.75);
  close(running!.translateX, 0.1);
  close(waiting!.opacity, 0.25);
});

test('negative offsets and per-element durations', () => {
  const spec = defineIndicator({
    duration: 1,
    layout: { type: 'stack', count: 2 },
    shape: { type: 'circle' },
    stagger: [0, -0.25],
    durations: [1, 2],
    tracks: [{ property: 'translateX', keyTimes: [0, 1], values: [0, 1] }],
  });
  const [a, b] = evaluate(spec, 0.5);
  close(a!.translateX, 0.5);
  close(b!.translateX, 0.375);
});

test('group tracks run on the part duration and parts number elements globally', () => {
  const spec = defineIndicator({
    duration: 1,
    parts: [
      {
        layout: { type: 'single' },
        shape: { type: 'circle' },
        tracks: [{ property: 'scale', keyTimes: [0, 1], values: [0, 1] }],
      },
      {
        layout: { type: 'row', count: 2, gap: 0.5 },
        shape: { type: 'ring', strokeWidth: 0.1 },
        duration: 2,
        groupTracks: [
          { property: 'rotate', keyTimes: [0, 1], values: [0, Math.PI] },
          { property: 'opacity', keyTimes: [0, 1], values: [1, 0] },
        ],
        rest: { opacity: 0.5 },
      },
    ],
  });
  const states = evaluate(spec, 0.5);
  assert.deepEqual(states.map((state) => [state.index, state.part]), [[0, 0], [1, 1], [2, 1]]);
  close(states[0]!.groupRotate, 0);
  close(states[1]!.groupRotate, Math.PI / 4);
  close(states[2]!.opacity, 0.5 * 0.75);
  assert.equal(states[1]!.strokeEnd, 1);
});

test('cycleProgress waits for the latest start across parts', () => {
  const spec = defineIndicator({
    duration: 1,
    parts: [
      { layout: { type: 'single' }, shape: { type: 'circle' }, tracks: [{ property: 'scale', keyTimes: [0, 1], values: [0, 1] }] },
      { layout: { type: 'stack', count: 2 }, shape: { type: 'circle' }, stagger: [0, 1.5], tracks: [{ property: 'scale', keyTimes: [0, 1], values: [0, 1] }] },
    ],
  });
  close(timeForCycleProgress(spec, 0.5), 2.5);
});

test('the reference evaluator has no element limit', () => {
  const spec = defineIndicator({
    name: 'Crowd',
    duration: 1,
    layout: { type: 'stack', count: 300_000 },
    shape: { type: 'circle' },
    stagger: { each: 1e-6 },
    tracks: [{ property: 'scale', keyTimes: [0, 1], values: [0, 1] }],
  });
  assert.equal(evaluate(spec, 0.5).length, 300_000);
  close(timeForCycleProgress(spec, 0), 1);
});
