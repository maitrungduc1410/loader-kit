import type { ElementState } from '@loader-kit/spec';

/**
 * A row-major 3x3 projective matrix `[a, b, c, d, e, f, g, h, 1]` that maps a shape point (x, y),
 * in frame units relative to the element center, to `((a·x + b·y + c) / w, (d·x + e·y + f) / w)`
 * with `w = g·x + h·y + 1`.
 */
export type Matrix = Float64Array;

export function createMatrix(): Matrix {
  return new Float64Array(9);
}

/**
 * Fills `out` with `G · T(cx + tx, cy + ty) · P(d) · Rz · Ry · Rx · S(sx, sy)` with
 * `G = T(0.5 + gtx, 0.5 + gty) · Rz(groupRotate) · S(gsx, gsy) · T(-0.5, -0.5)` (SPEC section 6),
 * for a box of side `size` whose top-left corner is (`left`, `top`).
 *
 * Shape points have z = 0, so the 4x4 transform reduces exactly to a 2D homogeneous matrix. It is
 * affine (`g = h = 0`) unless `rotateX` or `rotateY` is non-zero.
 */
export function elementMatrix(
  state: ElementState,
  perspective: number,
  left: number,
  top: number,
  size: number,
  out: Matrix,
): Matrix {
  const sinX = Math.sin(state.rotateX);
  const cosX = Math.cos(state.rotateX);
  const sinY = Math.sin(state.rotateY);
  const cosY = Math.cos(state.rotateY);
  const sinZ = Math.sin(state.rotate);
  const cosZ = Math.cos(state.rotate);
  const sx = state.scaleX;
  const sy = state.scaleY;

  // (x, y) -> (X, Y, Z) after scale, rotateX, rotateY and rotate.
  const xx = sx * cosY * cosZ;
  const xy = sy * (sinX * sinY * cosZ - cosX * sinZ);
  const yx = sx * cosY * sinZ;
  const yy = sy * (sinX * sinY * sinZ + cosX * cosZ);
  const zx = -sx * sinY;
  const zy = sy * sinX * cosY;

  // Perspective divides by w = (d - Z) / d, with d in frame units.
  const projected = state.rotateX !== 0 || state.rotateY !== 0;
  const depth = perspective * size;
  const wx = projected ? -zx / depth : 0;
  const wy = projected ? -zy / depth : 0;

  const tx = left + (state.cx + state.translateX) * size;
  const ty = top + (state.cy + state.translateY) * size;

  const m0 = xx + tx * wx;
  const m1 = xy + tx * wy;
  const m3 = yx + ty * wx;
  const m4 = yy + ty * wy;

  // The group transform is affine, around the box center, in frame units.
  const sinG = Math.sin(state.groupRotate);
  const cosG = Math.cos(state.groupRotate);
  const a = cosG * state.groupScaleX;
  const b = -sinG * state.groupScaleY;
  const d = sinG * state.groupScaleX;
  const e = cosG * state.groupScaleY;
  const centerX = left + size / 2;
  const centerY = top + size / 2;
  const c = centerX + state.groupTranslateX * size - (a * centerX + b * centerY);
  const f = centerY + state.groupTranslateY * size - (d * centerX + e * centerY);

  out[0] = a * m0 + b * m3 + c * wx;
  out[1] = a * m1 + b * m4 + c * wy;
  out[2] = a * tx + b * ty + c;
  out[3] = d * m0 + e * m3 + f * wx;
  out[4] = d * m1 + e * m4 + f * wy;
  out[5] = d * tx + e * ty + f;
  out[6] = wx;
  out[7] = wy;
  out[8] = 1;
  return out;
}

export function isFiniteMatrix(m: Matrix): boolean {
  for (let i = 0; i < 9; i++) if (!Number.isFinite(m[i]!)) return false;
  return true;
}
