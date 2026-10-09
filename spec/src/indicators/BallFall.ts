import { defineIndicator } from '../define.ts';

const drop = 0.3;

export default defineIndicator({
  name: 'BallFall',
  duration: 1,
  layout: { type: 'row', count: 3, gap: 0.1, itemWidth: 0.2 },
  shape: { type: 'circle' },
  stagger: { each: 0.1, start: -0.2 },
  tracks: [
    { property: 'opacity', keyTimes: [0, 0.1, 0.2, 0.8, 0.9, 1], values: [0, 0.5, 1, 1, 0.5, 0] },
    {
      property: 'translateY',
      keyTimes: [0, 0.2, 0.8, 1],
      values: [-drop, 0, 0, drop],
      easing: ['easeOut', 'linear', 'easeIn'],
    },
  ],
});
