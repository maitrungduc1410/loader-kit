import type { BezierEasing } from '../types.ts';

type Point = readonly [number, number];
type Curve = readonly [Point, Point, Point, Point];

const lerp = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** De Casteljau split at `t`: the curve before and after `t`. */
function split([p0, p1, p2, p3]: Curve, t: number): [Curve, Curve] {
  const a = lerp(p0, p1, t);
  const b = lerp(p1, p2, t);
  const c = lerp(p2, p3, t);
  const d = lerp(a, b, t);
  const e = lerp(b, c, t);
  const f = lerp(d, e, t);
  return [
    [p0, a, d, f],
    [f, e, c, p3],
  ];
}

function point(curve: Curve, t: number): Point {
  return split(curve, t)[0][3];
}

/** Bezier parameter where the curve's y reaches `y`; y must increase along the curve. */
function parameterForY(curve: Curve, y: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (point(curve, mid)[1] < y) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * A Core Animation keyframe animation can have one `timingFunction` that warps the whole
 * animation before the keyframes are looked up. This rewrites such a track exactly in the spec
 * model: each keyTime moves to the time where the warped time reaches it, and each segment
 * gets the matching piece of the curve as its own easing.
 */
export function warpTrack(
  keyTimes: readonly number[],
  [x1, y1, x2, y2]: BezierEasing
): { keyTimes: number[]; easing: BezierEasing[] } {
  const curve: Curve = [
    [0, 0],
    [x1, y1],
    [x2, y2],
    [1, 1],
  ];
  const parameters = keyTimes.map((keyTime) => (keyTime <= 0 ? 0 : keyTime >= 1 ? 1 : parameterForY(curve, keyTime)));
  const easing = parameters.slice(1).map((end, k): BezierEasing => {
    const start = parameters[k]!;
    const [head] = split(curve, end);
    const [, piece] = split(head, end === 0 ? 0 : start / end);
    const [q0, q1, q2, q3] = piece;
    const width = q3[0] - q0[0];
    const height = q3[1] - q0[1];
    const x = (p: Point) => (p[0] - q0[0]) / width;
    const y = (p: Point) => (p[1] - q0[1]) / height;
    return [x(q1), y(q1), x(q2), y(q2)].map((value) => Math.round(value * 1e12) / 1e12) as unknown as BezierEasing;
  });
  return {
    keyTimes: parameters.map((t) => Math.round(point(curve, t)[0] * 1e12) / 1e12),
    easing,
  };
}
