import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cubicBezier, sampleTrack } from '../src/index.ts';
import { warpTrack } from '../src/indicators/timing.ts';

test('warpTrack matches an animation-wide timing function', () => {
  const cases = [
    { keyTimes: [0, 0.7], values: [0.1, 1], easing: [0.21, 0.53, 0.56, 0.8] as const },
    { keyTimes: [0, 0.5, 1], values: [1, 0, 1], easing: [0.42, 0, 0.58, 1] as const },
  ];
  for (const { keyTimes, values, easing } of cases) {
    const warped = warpTrack(keyTimes, easing);
    for (let i = 0; i <= 200; i++) {
      const t = i / 200;
      const expected = sampleTrack({ property: 'scale', keyTimes, values }, cubicBezier(easing, t), {});
      const actual = sampleTrack({ property: 'scale', keyTimes: warped.keyTimes, values, easing: warped.easing }, t, {});
      assert.ok(Math.abs(actual - expected) < 1e-6, `t=${t}: ${actual} != ${expected}`);
    }
  }
});
