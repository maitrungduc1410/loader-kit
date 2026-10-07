import { defineIndicator } from '../define.ts';

const pacman = 2 / 3;
const dot = 0.2;

export default defineIndicator({
  name: 'Pacman',
  duration: 1,
  parts: [
    {
      layout: { type: 'single', size: dot, x: 1 - dot / 2 },
      shape: { type: 'circle' },
      tracks: [
        { property: 'translateX', keyTimes: [0, 1], values: [0, -0.5] },
        { property: 'opacity', keyTimes: [0, 1], values: [1, 0.7] },
      ],
    },
    {
      // A ring as thick as its radius is a disc; trimming it opens the mouth.
      layout: { type: 'single', size: pacman, x: pacman / 2 },
      shape: { type: 'ring', strokeWidth: 0.5, startAngle: 0 },
      duration: 0.5,
      tracks: [
        { property: 'strokeStart', keyTimes: [0, 0.5, 1], values: [0.125, 0, 0.125], easing: ['ease', 'ease'] },
        { property: 'strokeEnd', keyTimes: [0, 0.5, 1], values: [0.875, 1, 0.875], easing: ['ease', 'ease'] },
      ],
    },
  ],
});
