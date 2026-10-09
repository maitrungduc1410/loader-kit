import { defineIndicator } from '../define.ts';

const size = 0.26;
const tracks = [
  {
    property: 'scale',
    keyTimes: [0, 0.35, 0.7, 1],
    values: [1, 0.3, 1, 1],
    easing: 'easeInOut',
  },
  {
    property: 'opacity',
    keyTimes: [0, 0.35, 0.7, 1],
    values: [1, 0.5, 1, 1],
    easing: 'easeInOut',
  },
] as const;

export default defineIndicator({
  name: 'BallHoneycomb',
  duration: 1.4,
  parts: [
    { layout: { type: 'single', size }, shape: { type: 'circle' }, tracks },
    {
      // The six cells around the center follow it one after the other, clockwise from the top.
      layout: { type: 'ring', count: 6, itemSize: size, startAngle: -Math.PI / 2 },
      shape: { type: 'circle' },
      stagger: { each: 0.07, start: 0.2 },
      tracks,
    },
  ],
});
