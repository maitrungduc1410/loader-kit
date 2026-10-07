import { defineIndicator } from '../define.ts';

const ease = [0.2, 0.68, 0.18, 1.08] as const;

export default defineIndicator({
  name: 'LineScale',
  duration: 1,
  layout: { type: 'row', count: 5, gap: 1 / 9, itemHeight: 1 },
  shape: { type: 'line' },
  stagger: { start: 0.1, each: 0.1 },
  tracks: [{ property: 'scaleY', keyTimes: [0, 0.5, 1], values: [1, 0.4, 1], easing: [ease, ease] }],
});
