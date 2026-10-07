import { defineIndicator } from '../define.ts';

export default defineIndicator({
  name: 'SemiCircleSpin',
  duration: 0.6,
  layout: { type: 'single' },
  // The top third of the circle, cut off by a chord.
  shape: { type: 'circle', startAngle: (-5 * Math.PI) / 6, sweep: (2 * Math.PI) / 3 },
  tracks: [{ property: 'rotate', keyTimes: [0, 0.5, 1], values: [0, Math.PI, 2 * Math.PI] }],
});
