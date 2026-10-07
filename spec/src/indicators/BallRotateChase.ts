import { defineIndicator } from '../define.ts';
import type { Part } from '../types.ts';

const size = 0.2;
const round = (value: number) => Math.round(value * 100) / 100;

export default defineIndicator({
  name: 'BallRotateChase',
  duration: 1.5,
  parts: Array.from({ length: 5 }, (_, i): Part => {
    const rate = i / 5;
    const easing = [0.5, round(0.15 + rate), 0.25, 1] as const;
    return {
      layout: { type: 'single', size },
      shape: { type: 'circle' },
      // Starts at the top; the group turn moves it around the circle.
      rest: { translateY: -(1 - size) / 2 },
      tracks: [{ property: 'scale', keyTimes: [0, 1], values: [round(1 - rate), round(0.2 + rate)], easing }],
      groupTracks: [{ property: 'rotate', keyTimes: [0, 1], values: [0, 2 * Math.PI], easing }],
    };
  }),
});
