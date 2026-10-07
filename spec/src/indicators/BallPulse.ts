import { defineIndicator, param } from '../define.ts';

const ease = [0.2, 0.68, 0.18, 1.08] as const;

export default defineIndicator({
  name: 'BallPulse',
  duration: 0.75,
  params: { count: 3, minScale: 0.3 },
  layout: { type: 'row', count: param('count'), gap: 0.05 },
  shape: { type: 'circle' },
  stagger: { start: 0.12, each: 0.12 },
  tracks: [
    {
      property: 'scale',
      keyTimes: [0, 0.3, 1],
      values: [1, param('minScale'), 1],
      easing: [ease, ease],
    },
  ],
});
