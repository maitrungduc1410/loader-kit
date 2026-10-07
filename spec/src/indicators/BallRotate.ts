import { defineIndicator } from '../define.ts';

const ease = [0.7, -0.13, 0.22, 0.86] as const;
const groupTracks = [
  { property: 'scale', keyTimes: [0, 0.5, 1], values: [1, 0.6, 1], easing: [ease, ease] },
  { property: 'rotate', keyTimes: [0, 0.5, 1], values: [0, Math.PI, 2 * Math.PI], easing: [ease, ease] },
] as const;

export default defineIndicator({
  name: 'BallRotate',
  duration: 1,
  parts: [
    {
      // Left and right balls.
      layout: { type: 'row', count: 2, gap: 0.6 },
      shape: { type: 'circle' },
      rest: { opacity: 0.8 },
      groupTracks,
    },
    {
      layout: { type: 'single', size: 0.2 },
      shape: { type: 'circle' },
      groupTracks,
    },
  ],
});
