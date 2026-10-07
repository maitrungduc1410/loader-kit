import { defineIndicator } from '../define.ts';
import type { Part } from '../types.ts';

const size = 0.2;
const half = 0.5 - size / 2;
const full = 2 * half;
const keyTimes = [0, 0.33, 0.66, 1];
const easing = ['easeInOut', 'easeInOut', 'easeInOut'] as const;

// Each ball starts at a corner and visits the other two.
const ball = (x: number, y: number, dx: number[], dy: number[]): Part => ({
  layout: { type: 'single', size, x, y },
  shape: { type: 'ring', strokeWidth: 0.25 },
  tracks: [
    { property: 'translateX', keyTimes, values: dx, easing },
    { property: 'translateY', keyTimes, values: dy, easing },
  ],
});

export default defineIndicator({
  name: 'BallTrianglePath',
  duration: 2,
  parts: [
    ball(0.5, size / 2, [0, half, -half, 0], [0, full, full, 0]),
    ball(size / 2, 1 - size / 2, [0, half, full, 0], [0, -full, 0, 0]),
    ball(1 - size / 2, 1 - size / 2, [0, -full, -half, 0], [0, 0, -full, 0]),
  ],
});
