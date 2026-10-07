import { defineIndicator } from '../define.ts';

const size = (1 - 2 * 0.05) / 3;
const delta = (0.5 - size / 2) / 2;

export default defineIndicator({
  name: 'BallPulseSync',
  duration: 0.6,
  layout: { type: 'row', count: 3, gap: 0.05 },
  shape: { type: 'circle' },
  stagger: { start: 0.07, each: 0.07 },
  tracks: [
    {
      property: 'translateY',
      keyTimes: [0, 0.33, 0.66, 1],
      values: [0, delta, -delta, 0],
      easing: ['easeInOut', 'easeInOut', 'easeInOut'],
    },
  ],
});
