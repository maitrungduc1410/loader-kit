import { defineIndicator } from '../define.ts';

export default defineIndicator({
  name: 'BallScaleMultiple',
  duration: 1,
  layout: { type: 'stack', count: 3 },
  shape: { type: 'circle' },
  stagger: [0, 0.2, 0.4],
  rest: { opacity: 0 },
  tracks: [
    { property: 'scale', keyTimes: [0, 1], values: [0, 1] },
    { property: 'opacity', keyTimes: [0, 0.05, 1], values: [0, 1, 0] },
  ],
});
