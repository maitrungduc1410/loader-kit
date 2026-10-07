import { defineIndicator } from '../define.ts';
import type { Part } from '../types.ts';

const size = 0.2;
const delta = 0.5 - size / 2;
const keyTimes = [0, 0.33, 0.66, 1];

const ball = (sign: number): Part => ({
  layout: { type: 'single', size },
  shape: { type: 'circle' },
  tracks: [
    { property: 'translateX', keyTimes, values: [0, -delta * sign, delta * sign, 0] },
    { property: 'translateY', keyTimes, values: [0, -delta * sign, -delta * sign, 0] },
  ],
});

export default defineIndicator({
  name: 'BallZigZag',
  duration: 0.7,
  parts: [ball(1), ball(-1)],
});
