import { defineIndicator } from '../define.ts';

const heights = [0, 0.7, 0.4, 0.05, 0.95, 0.3, 0.9, 0.4, 0.15, 0.18, 0.75, 0.01];
const keyTimes = heights.map((_, i) => i / (heights.length - 1));

export default defineIndicator({
  name: 'AudioEqualizer',
  duration: 4.3,
  layout: { type: 'row', count: 4, itemWidth: 1 / 9, gap: 1 / 9, itemHeight: 1 },
  shape: { type: 'rect' },
  durations: [4.3, 2.5, 1.7, 3.1],
  tracks: [
    { property: 'scaleY', keyTimes, values: heights },
    // Keeps the bottom edge in place while the bar grows.
    { property: 'translateY', keyTimes, values: heights.map((height) => (1 - height) / 2) },
  ],
});
