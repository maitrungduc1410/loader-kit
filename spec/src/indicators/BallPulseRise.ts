import { defineIndicator } from '../define.ts';

const ease = [0.15, 0.46, 0.9, 0.6] as const;
const width = (1 - 4 * 0.05) / 5;
// Positions 0, 2, 4 and 1, 3 of a row of five with a gap of 0.05.
const gap = width + 2 * 0.05;

export default defineIndicator({
  name: 'BallPulseRise',
  duration: 1,
  parts: [
    {
      layout: { type: 'row', count: 3, itemWidth: width, gap },
      shape: { type: 'circle' },
      tracks: [
        { property: 'scale', keyTimes: [0, 0.5, 1], values: [1.1, 0.4, 1], easing: [ease, ease] },
        { property: 'translateY', keyTimes: [0, 0.25, 0.75, 1], values: [0, -0.5, 0.5, 0], easing: [ease, ease, ease] },
      ],
    },
    {
      layout: { type: 'row', count: 2, itemWidth: width, gap },
      shape: { type: 'circle' },
      tracks: [
        { property: 'scale', keyTimes: [0, 0.5, 1], values: [0.4, 1.1, 0.75], easing: [ease, ease] },
        { property: 'translateY', keyTimes: [0, 0.25, 0.75, 1], values: [0, 0.5, -0.5, 0], easing: [ease, ease, ease] },
      ],
    },
  ],
});
