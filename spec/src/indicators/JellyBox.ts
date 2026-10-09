import { defineIndicator } from '../define.ts';

const box = 0.4;
const floor = 0.82;
const squash = 0.8;
const stretch = 1.15;
const keyTimes = [0, 0.1, 0.5, 0.9, 1];
const easing = ['easeOut', 'easeOut', 'easeIn', 'easeIn'] as const;

export default defineIndicator({
  name: 'JellyBox',
  duration: 0.9,
  parts: [
    {
      // The shadow shrinks and fades while the box is in the air.
      layout: { type: 'single', width: 0.5, height: 0.07, y: floor + 0.06 },
      shape: { type: 'circle' },
      tracks: [
        { property: 'scaleX', keyTimes, values: [1.1, 1, 0.5, 1, 1.1], easing },
        { property: 'opacity', keyTimes, values: [0.45, 0.4, 0.15, 0.4, 0.45], easing },
      ],
    },
    {
      // The box jumps a quarter turn and lands squashed; the translation keeps it on the floor.
      layout: { type: 'single', size: box, y: floor - box / 2 },
      shape: { type: 'rect', cornerRadius: 0.15 },
      tracks: [
        {
          property: 'translateY',
          keyTimes,
          values: [((1 - squash) * box) / 2, 0, -0.32, 0, ((1 - squash) * box) / 2],
          easing,
        },
        // Scales apply before the rotation: after the quarter turn the box squashes along its own x axis.
        { property: 'scaleX', keyTimes, values: [stretch, 1, 1, 1, squash], easing },
        { property: 'scaleY', keyTimes, values: [squash, 1, 1, 1, stretch], easing },
        {
          property: 'rotate',
          keyTimes: [0, 0.1, 0.9, 1],
          values: [0, 0, Math.PI / 2, Math.PI / 2],
          easing: 'easeInOut',
        },
      ],
    },
  ],
});
