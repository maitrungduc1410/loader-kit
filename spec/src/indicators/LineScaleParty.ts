import { defineIndicator } from '../define.ts';

export default defineIndicator({
  name: 'LineScaleParty',
  duration: 1,
  layout: { type: 'row', count: 4, gap: 1 / 7, itemHeight: 1 },
  shape: { type: 'line' },
  durations: [1.26, 0.43, 1.01, 0.73],
  stagger: [0.77, 0.29, 0.28, 0.74],
  tracks: [{ property: 'scale', keyTimes: [0, 0.5, 1], values: [1, 0.5, 1], easing: ['ease', 'ease'] }],
});
