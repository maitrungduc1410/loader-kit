import { defineIndicator } from '../define.ts';
import type { Part } from '../types.ts';

const size = 0.2;
const delta = 0.5 - size / 2;
// The zig-zag path forward, then the same path backward.
const keyTimes = [0, 0.165, 0.33, 0.5, 0.67, 0.835, 1];
const backAndForth = (values: number[]) => [...values, ...values.slice(0, -1).reverse()];

const ball = (sign: number): Part => ({
  layout: { type: 'single', size },
  shape: { type: 'circle' },
  tracks: [
    { property: 'translateX', keyTimes, values: backAndForth([0, -delta * sign, delta * sign, 0]) },
    { property: 'translateY', keyTimes, values: backAndForth([0, -delta * sign, -delta * sign, 0]) },
  ],
});

export default defineIndicator({
  name: 'BallZigZagDeflect',
  duration: 1.5,
  parts: [ball(1), ball(-1)],
});
