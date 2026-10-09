import { defineIndicator } from '../define.ts';
import type { Part } from '../types.ts';

const size = 0.26;
// Distance to a corner on each axis. The group is turned by about π/4 while the balls are out, so
// they reach √2 times as far along an axis, plus the overshoot of the easing. With this size and
// easing, 0.27 keeps every ball within 0.49 of the center.
const spread = 0.27;
const keyTimes = [0, 0.4, 0.6, 1];
const easing = [[0.5, 0, 0.2, 1.4], 'linear', 'easeIn'] as const;

// A ball that leaves the center for a corner and comes back. The four balls overlap at the start
// and end of the cycle, so the quarter turn of the group is seamless whatever their colors.
const ball = (dx: number, dy: number): Part => ({
  layout: { type: 'single', size },
  shape: { type: 'circle' },
  tracks: [
    { property: 'translateX', keyTimes, values: [0, dx * spread, dx * spread, 0], easing },
    { property: 'translateY', keyTimes, values: [0, dy * spread, dy * spread, 0], easing },
    { property: 'scale', keyTimes: [0, 0.4, 0.6, 1], values: [1.3, 0.8, 0.8, 1.3], easing: 'easeInOut' },
  ],
  groupTracks: [{ property: 'rotate', keyTimes: [0, 1], values: [0, Math.PI / 2], easing: 'easeInOut' }],
});

export default defineIndicator({
  name: 'BallMerge',
  duration: 1.4,
  parts: [ball(-1, -1), ball(1, -1), ball(1, 1), ball(-1, 1)],
});
