import { defineIndicator } from '../define.ts';
import type { Part } from '../types.ts';

const core = 1 / (1 + 0.25 + 1.5);
const satellite = core * 0.25;
const expand = [0.19, 1, 0.22, 1] as const;

// A filled circle of the core size that appears at `at`, grows and fades.
const pulse = (at: number, scale: number, opacity: number[], opacityKeyTimes: number[]): Part => ({
  layout: { type: 'single', size: core },
  shape: { type: 'circle' },
  tracks: [
    { property: 'scale', keyTimes: [0, at, at, 1], values: [0, 0, 1.3, scale], easing: ['linear', 'linear', expand] },
    { property: 'opacity', keyTimes: opacityKeyTimes, values: opacity },
  ],
});

export default defineIndicator({
  name: 'Orbit',
  duration: 1.9,
  parts: [
    pulse(0.45, 2, [0.8, 0.8, 0], [0, 0.45, 1]),
    pulse(0.55, 2.1, [0.7, 0.7, 0, 0], [0, 0.55, 0.65, 1]),
    {
      layout: { type: 'single', size: core },
      shape: { type: 'circle' },
      tracks: [
        {
          property: 'scale',
          keyTimes: [0, 0.45, 0.55, 1],
          values: [1, 1.3, 1.3, 1],
          easing: [[0.7, 0, 1, 0.5], 'linear', [0, 0.7, 0.5, 1]],
        },
      ],
    },
    {
      layout: { type: 'single', size: satellite },
      shape: { type: 'circle' },
      rest: { translateY: -(1 - satellite) / 2 },
      groupTracks: [{ property: 'rotate', keyTimes: [0, 1], values: [0, 2 * Math.PI] }],
    },
  ],
});
