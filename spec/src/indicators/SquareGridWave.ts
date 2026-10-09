import { defineIndicator } from '../define.ts';

export default defineIndicator({
  name: 'SquareGridWave',
  duration: 1.3,
  layout: { type: 'grid', columns: 3, rows: 3, gap: 0.03 },
  shape: { type: 'rect' },
  // Rows from the top: a wave that runs from the bottom-left corner to the top-right one.
  stagger: [-0.2, -0.1, 0, -0.3, -0.2, -0.1, -0.4, -0.3, -0.2],
  tracks: [{ property: 'scale', keyTimes: [0, 0.35, 0.7, 1], values: [1, 0, 1, 1], easing: 'easeInOut' }],
});
