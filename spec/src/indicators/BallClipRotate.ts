import { defineIndicator } from '../define.ts';

export default defineIndicator({
  name: 'BallClipRotate',
  duration: 0.75,
  layout: { type: 'single' },
  shape: { type: 'ring', strokeWidth: 0.05, startAngle: -Math.PI / 4, sweep: 1.5 * Math.PI },
  tracks: [
    { property: 'scale', keyTimes: [0, 0.5, 1], values: [1, 0.6, 1] },
    { property: 'rotate', keyTimes: [0, 0.5, 1], values: [0, Math.PI, 2 * Math.PI] },
  ],
});
