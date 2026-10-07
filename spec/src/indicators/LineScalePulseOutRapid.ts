import { defineIndicator } from '../define.ts';

const ease = [0.11, 0.49, 0.38, 0.78] as const;

export default defineIndicator({
  name: 'LineScalePulseOutRapid',
  duration: 0.9,
  layout: { type: 'row', count: 5, gap: 1 / 9, itemHeight: 1 },
  shape: { type: 'line' },
  stagger: [0.5, 0.25, 0, 0.25, 0.5],
  tracks: [{ property: 'scaleY', keyTimes: [0, 0.8, 0.9], values: [1, 0.3, 1], easing: [ease, ease] }],
});
