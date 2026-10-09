import { defineIndicator } from '../define.ts';
import type { Part } from '../types.ts';
import { sineIn, sineOut } from './sine.ts';

const duration = 1.8;
const count = 7;
const amplitude = 0.3;
const keyTimes = [0, 0.25, 0.5, 0.75, 1];
const cos = [sineIn, sineOut, sineIn, sineOut] as const;
const sin = [sineOut, sineIn, sineOut, sineIn] as const;

// One strand of the helix: a sine wave across the row, closer (larger, brighter) where its depth
// is positive. The second strand is the same wave half a turn later.
const strand = (sign: number): Part => ({
  layout: { type: 'row', count, gap: 0.04, itemWidth: 0.1 },
  shape: { type: 'circle' },
  stagger: { each: -duration / 8, start: ((sign - 1) * duration) / 4 },
  tracks: [
    { property: 'translateY', keyTimes, values: [0, -amplitude, 0, amplitude, 0], easing: sin },
    { property: 'scale', keyTimes, values: [1.4, 1, 0.6, 1, 1.4], easing: cos },
    { property: 'opacity', keyTimes, values: [1, 0.7, 0.4, 0.7, 1], easing: cos },
  ],
});

export default defineIndicator({
  name: 'BallHelix',
  duration,
  parts: [strand(1), strand(-1)],
});
