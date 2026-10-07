import { defineIndicator } from '../define.ts';

const ease = [0.85, 0.25, 0.37, 0.85] as const;

export default defineIndicator({
  name: 'LineScalePulseOut',
  duration: 1,
  layout: { type: 'row', count: 5, gap: 1 / 9, itemHeight: 1 },
  shape: { type: 'line' },
  stagger: [0.4, 0.2, 0, 0.2, 0.4],
  tracks: [{ property: 'scaleY', keyTimes: [0, 0.5, 1], values: [1, 0.4, 1], easing: [ease, ease] }],
});
