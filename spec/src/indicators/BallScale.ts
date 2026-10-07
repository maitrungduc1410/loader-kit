import { defineIndicator } from '../define.ts';

export default defineIndicator({
  name: 'BallScale',
  duration: 1,
  layout: { type: 'single' },
  shape: { type: 'circle' },
  tracks: [
    { property: 'scale', keyTimes: [0, 1], values: [0, 1], easing: 'easeInOut' },
    { property: 'opacity', keyTimes: [0, 1], values: [1, 0], easing: 'easeInOut' },
  ],
});
