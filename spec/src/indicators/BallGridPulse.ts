import { defineIndicator } from '../define.ts';

export default defineIndicator({
  name: 'BallGridPulse',
  duration: 1,
  layout: { type: 'grid', columns: 3, rows: 3, gap: 0.05 },
  shape: { type: 'circle' },
  durations: [0.72, 1.02, 1.28, 1.42, 1.45, 1.18, 0.87, 1.45, 1.06],
  stagger: [-0.06, 0.25, -0.17, 0.48, 0.31, 0.03, 0.46, 0.78, 0.45],
  tracks: [
    { property: 'scale', keyTimes: [0, 0.5, 1], values: [1, 0.5, 1], easing: ['ease', 'ease'] },
    { property: 'opacity', keyTimes: [0, 0.5, 1], values: [1, 0.7, 1], easing: ['ease', 'ease'] },
  ],
});
