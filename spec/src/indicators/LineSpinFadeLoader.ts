import { defineIndicator } from '../define.ts';

export default defineIndicator({
  name: 'LineSpinFadeLoader',
  duration: 1.2,
  layout: { type: 'ring', count: 8, itemSize: 0.3, itemWidth: 0.16, itemHeight: 0.3, orient: true },
  shape: { type: 'line' },
  stagger: { start: 0.12, each: 0.12 },
  tracks: [
    { property: 'opacity', keyTimes: [0, 0.5, 1], values: [1, 0.3, 1], easing: ['easeInOut', 'easeInOut'] },
  ],
});
