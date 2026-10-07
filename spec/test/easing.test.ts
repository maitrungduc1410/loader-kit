import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NAMED_EASINGS, controlPoints, cubicBezier } from '../src/index.ts';

test('endpoints are exact', () => {
  for (const points of Object.values(NAMED_EASINGS)) {
    assert.equal(cubicBezier(points, 0), 0);
    assert.equal(cubicBezier(points, 1), 1);
    assert.equal(cubicBezier(points, -0.5), 0);
    assert.equal(cubicBezier(points, 1.5), 1);
  }
});

test('linear is the identity', () => {
  for (const x of [0.1, 0.25, 0.5, 0.9]) assert.equal(cubicBezier(NAMED_EASINGS.linear, x), x);
});

test('easeInOut is symmetric', () => {
  for (const x of [0.1, 0.3, 0.45]) {
    const a = cubicBezier(NAMED_EASINGS.easeInOut, x);
    const b = cubicBezier(NAMED_EASINGS.easeInOut, 1 - x);
    assert.ok(Math.abs(a + b - 1) < 1e-9);
  }
});

test('solves x(t) = x before sampling y', () => {
  const points = [0.2, 0.68, 0.18, 1.08] as const;
  for (const x of [0.05, 0.2, 0.5, 0.8, 0.95]) {
    const y = cubicBezier(points, x);
    // Find t independently by bisection and compare y(t).
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 200; i++) {
      const t = (lo + hi) / 2;
      const xt = 3 * (1 - t) ** 2 * t * points[0] + 3 * (1 - t) * t ** 2 * points[2] + t ** 3;
      if (xt < x) lo = t;
      else hi = t;
    }
    const t = (lo + hi) / 2;
    const expected = 3 * (1 - t) ** 2 * t * points[1] + 3 * (1 - t) * t ** 2 * points[3] + t ** 3;
    assert.ok(Math.abs(y - expected) < 1e-7, `x=${x}: ${y} vs ${expected}`);
  }
});

test('overshooting curves leave [0, 1]', () => {
  assert.ok(cubicBezier([0.2, 0.68, 0.18, 1.08], 0.8) > 1);
  assert.ok(cubicBezier([0.68, -0.55, 0.27, 1.55], 0.1) < 0);
});

test('controlPoints resolves names and passes beziers through', () => {
  assert.deepEqual(controlPoints(undefined), NAMED_EASINGS.linear);
  assert.deepEqual(controlPoints('easeOut'), NAMED_EASINGS.easeOut);
  assert.deepEqual(controlPoints([0.1, 0.2, 0.3, 0.4]), [0.1, 0.2, 0.3, 0.4]);
});
