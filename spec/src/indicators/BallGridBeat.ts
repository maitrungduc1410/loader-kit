import { defineIndicator } from '../define.ts';

export default defineIndicator({
  name: 'BallGridBeat',
  duration: 1,
  layout: { type: 'grid', columns: 3, rows: 3, gap: 0.05 },
  shape: { type: 'circle' },
  durations: [0.96, 0.93, 1.19, 1.13, 1.34, 0.94, 1.2, 0.82, 1.19],
  stagger: [0.36, 0.4, 0.68, 0.41, 0.71, -0.15, -0.12, 0.01, 0.32],
  tracks: [{ property: 'opacity', keyTimes: [0, 0.5, 1], values: [1, 0.7, 1], easing: ['ease', 'ease'] }],
});
