import { defineIndicator } from '../define.ts';

const ease = [0.09, 0.57, 0.49, 0.9] as const;

export default defineIndicator({
  name: 'BallClipRotatePulse',
  duration: 1,
  parts: [
    {
      layout: { type: 'single', size: 0.5 },
      shape: { type: 'circle' },
      tracks: [{ property: 'scale', keyTimes: [0, 0.3, 1], values: [1, 0.3, 1], easing: [ease, ease] }],
    },
    {
      // Top and bottom quarters.
      layout: { type: 'single' },
      shape: { type: 'ring', strokeWidth: 0.05, startAngle: -0.75 * Math.PI, sweep: Math.PI / 2, segments: 2 },
      tracks: [
        { property: 'scale', keyTimes: [0, 0.5, 1], values: [1, 0.6, 1], easing: [ease, ease] },
        { property: 'rotate', keyTimes: [0, 0.5, 1], values: [0, Math.PI, 2 * Math.PI], easing: [ease, ease] },
      ],
    },
  ],
});
