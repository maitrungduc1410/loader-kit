import { defineIndicator } from '../define.ts';

const duration = 2;
const count = 5;
const travel = 0.42;

// Every dot crosses the box from left to right, growing in and shrinking out; spreading their
// starts over one cycle keeps the row evenly spaced.
export default defineIndicator({
  name: 'RunningDots',
  duration,
  layout: { type: 'stack', count, size: 0.14 },
  shape: { type: 'circle' },
  stagger: { each: -duration / count },
  tracks: [
    { property: 'translateX', keyTimes: [0, 1], values: [-travel, travel] },
    { property: 'scale', keyTimes: [0, 0.2, 0.8, 1], values: [0, 1, 1, 0], easing: 'easeInOut' },
    {
      property: 'translateY',
      keyTimes: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
      values: [0, -0.06, 0, -0.06, 0, -0.06, 0, -0.06, 0, -0.06, 0],
      easing: ['easeOut', 'easeIn', 'easeOut', 'easeIn', 'easeOut', 'easeIn', 'easeOut', 'easeIn', 'easeOut', 'easeIn'],
    },
  ],
});
