import { defineIndicator } from '../define.ts';

export default defineIndicator({
  name: 'BallBeat',
  duration: 0.7,
  layout: { type: 'row', count: 3, gap: 0.05 },
  shape: { type: 'circle' },
  stagger: [0.35, 0, 0.35],
  tracks: [
    { property: 'scale', keyTimes: [0, 0.5, 1], values: [1, 0.75, 1] },
    { property: 'opacity', keyTimes: [0, 0.5, 1], values: [1, 0.2, 1] },
  ],
});
