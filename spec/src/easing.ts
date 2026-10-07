import type { BezierEasing, Easing, NamedEasing } from './types.ts';
import { hasOwn } from './own.ts';

/** Control points of the named easings, the same as Core Animation's named timing functions. */
export const NAMED_EASINGS: Readonly<Record<NamedEasing, BezierEasing>> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
};

/** Control points of `easing`; no easing means linear. */
export function controlPoints(easing: Easing | undefined): BezierEasing {
  if (easing === undefined) return NAMED_EASINGS.linear;
  if (typeof easing === 'string') {
    const points = hasOwn(NAMED_EASINGS, easing) ? NAMED_EASINGS[easing] : undefined;
    if (!points) throw new Error(`Unknown easing "${easing}"`);
    return points;
  }
  return easing;
}

const EPSILON = 1e-7;

/**
 * Returns the eased progress for `x` in [0, 1] on the cubic bezier `(0,0) (x1,y1) (x2,y2) (1,1)`.
 * Engines on every platform use this exact algorithm: Newton-Raphson (at most 8 steps), then
 * bisection (at most 50 steps), both stopping at an error below 1e-7.
 */
export function cubicBezier([x1, y1, x2, y2]: BezierEasing, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  if (x1 === y1 && x2 === y2) return x;

  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  let t = x;
  for (let i = 0; i < 8; i++) {
    const error = sampleX(t) - x;
    if (Math.abs(error) < EPSILON) return sampleY(t);
    const slope = slopeX(t);
    if (Math.abs(slope) < EPSILON) break;
    t -= error / slope;
  }

  let lo = 0;
  let hi = 1;
  t = x;
  for (let i = 0; i < 50; i++) {
    const value = sampleX(t);
    if (Math.abs(value - x) < EPSILON) break;
    if (value < x) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return sampleY(t);
}
