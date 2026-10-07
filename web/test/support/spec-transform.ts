// SPEC section 6, step by step, as the oracle for the renderer's matrix.
import { DEFAULT_PERSPECTIVE, type ElementState } from '@loader-kit/spec';

export interface Box {
  left: number;
  top: number;
  side: number;
}

/** Maps a shape point (x, y), in box units relative to the element center, to frame coordinates. */
export function specPoint(state: ElementState, x: number, y: number, box: Box, perspective = DEFAULT_PERSPECTIVE): [number, number] {
  let px = x * state.scaleX;
  let py = y * state.scaleY;
  let pz = 0;
  let c = Math.cos(state.rotateX);
  let s = Math.sin(state.rotateX);
  [py, pz] = [py * c - pz * s, py * s + pz * c];
  c = Math.cos(state.rotateY);
  s = Math.sin(state.rotateY);
  [px, pz] = [px * c + pz * s, -px * s + pz * c];
  c = Math.cos(state.rotate);
  s = Math.sin(state.rotate);
  [px, py] = [px * c - py * s, px * s + py * c];
  if (state.rotateX !== 0 || state.rotateY !== 0) {
    const factor = perspective / (perspective - pz);
    px *= factor;
    py *= factor;
  }
  px += state.cx + state.translateX;
  py += state.cy + state.translateY;

  let gx = (px - 0.5) * state.groupScaleX;
  let gy = (py - 0.5) * state.groupScaleY;
  c = Math.cos(state.groupRotate);
  s = Math.sin(state.groupRotate);
  [gx, gy] = [gx * c - gy * s, gx * s + gy * c];
  px = gx + 0.5 + state.groupTranslateX;
  py = gy + 0.5 + state.groupTranslateY;
  return [box.left + px * box.side, box.top + py * box.side];
}

/** Smallest distance from `point` to the curve `at(a)` for `a` in [from, to]. */
export function distanceToCurve(point: [number, number], at: (a: number) => [number, number], from: number, to: number): number {
  const distance = (a: number) => {
    const [x, y] = at(a);
    return Math.hypot(x - point[0], y - point[1]);
  };
  const steps = 720;
  let best = from;
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    if (distance(a) < distance(best)) best = a;
  }
  let lo = Math.max(Math.min(from, to), best - Math.abs(to - from) / steps);
  let hi = Math.min(Math.max(from, to), best + Math.abs(to - from) / steps);
  for (let i = 0; i < 60; i++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (distance(m1) < distance(m2)) hi = m2;
    else lo = m1;
  }
  return distance((lo + hi) / 2);
}
