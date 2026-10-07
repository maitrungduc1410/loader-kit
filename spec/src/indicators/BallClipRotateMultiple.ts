import { defineIndicator } from '../define.ts';

const keyTimes = [0, 0.5, 1];
const easing = ['easeInOut', 'easeInOut'] as const;
const scale = { property: 'scale', keyTimes, values: [1, 0.6, 1], easing } as const;

export default defineIndicator({
  name: 'BallClipRotateMultiple',
  duration: 1,
  parts: [
    {
      // Left and right quarters, turning clockwise.
      layout: { type: 'single' },
      shape: { type: 'ring', strokeWidth: 0.05, startAngle: 0.75 * Math.PI, sweep: Math.PI / 2, segments: 2 },
      tracks: [scale, { property: 'rotate', keyTimes, values: [0, Math.PI, 2 * Math.PI], easing }],
    },
    {
      // Top and bottom quarters at half the size, turning the other way.
      layout: { type: 'single', size: 0.5 },
      shape: { type: 'ring', strokeWidth: 0.1, startAngle: -0.75 * Math.PI, sweep: Math.PI / 2, segments: 2 },
      tracks: [scale, { property: 'rotate', keyTimes, values: [0, -Math.PI, -2 * Math.PI], easing }],
    },
  ],
});
