import { defineIndicator } from '../define.ts';

const ease = [0.4, 0, 0.2, 1] as const;
const duration = 1.7;

export default defineIndicator({
  name: 'CircleStrokeSpin',
  duration,
  layout: { type: 'single' },
  shape: { type: 'ring', strokeWidth: 0.05 },
  tracks: [
    { property: 'rotate', keyTimes: [0, 1], values: [0, 2 * Math.PI] },
    { property: 'strokeEnd', keyTimes: [0, 0.7 / duration, 1], values: [0, 1, 1], easing: [ease, 'linear'] },
    { property: 'strokeStart', keyTimes: [0, 0.5 / duration, 1], values: [0, 0, 1], easing: ['linear', ease] },
  ],
});
