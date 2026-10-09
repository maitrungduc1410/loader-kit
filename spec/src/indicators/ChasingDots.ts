import { defineIndicator } from '../define.ts';

export default defineIndicator({
  name: 'ChasingDots',
  duration: 2,
  layout: { type: 'ring', count: 2, itemSize: 0.6, startAngle: -Math.PI / 2 },
  shape: { type: 'circle' },
  stagger: [0, -1],
  tracks: [{ property: 'scale', keyTimes: [0, 0.5, 1], values: [0, 1, 0], easing: 'easeInOut' }],
  groupTracks: [{ property: 'rotate', keyTimes: [0, 1], values: [0, 2 * Math.PI] }],
});
