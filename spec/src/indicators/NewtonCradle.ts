import { defineIndicator } from '../define.ts';
import type { Part } from '../types.ts';
import { sineIn, sineInOut, sineOut } from './sine.ts';

const size = 0.15;
// A swing of 30° on a string of 0.4: sideways by 0.4·sin 30°, up by 0.4·(1 - cos 30°).
const swingX = 0.2;
const swingY = -0.4 * (1 - Math.cos(Math.PI / 6));

// The end ball at `x`, swinging out on the `sign` side and back, in the first or the second half
// of the cycle.
const end = (x: number, sign: number, secondHalf: boolean): Part => {
  const keyTimes = secondHalf ? [0, 0.5, 0.75, 1] : [0, 0.25, 0.5, 1];
  const swing = (peak: number) => (secondHalf ? [0, 0, peak, 0] : [0, peak, 0, 0]);
  return {
    layout: { type: 'single', size, x },
    shape: { type: 'circle' },
    tracks: [
      {
        property: 'translateX',
        keyTimes,
        values: swing(sign * swingX),
        easing: secondHalf ? ['linear', sineOut, sineIn] : [sineOut, sineIn, 'linear'],
      },
      { property: 'translateY', keyTimes, values: swing(swingY), easing: sineInOut },
    ],
  };
};

export default defineIndicator({
  name: 'NewtonCradle',
  duration: 1.2,
  parts: [
    end(0.5 - 1.5 * size, -1, false),
    { layout: { type: 'row', count: 2, gap: 0, itemWidth: size }, shape: { type: 'circle' } },
    end(0.5 + 1.5 * size, 1, true),
  ],
});
