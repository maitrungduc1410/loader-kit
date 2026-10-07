import { defineIndicator } from '../define.ts';

const ease = [0.09, 0.57, 0.49, 0.9] as const;
const keyTimes = [0, 0.25, 0.5, 0.75, 1];

export default defineIndicator({
  name: 'TriangleSkewSpin',
  duration: 3,
  layout: { type: 'single', height: 0.5 },
  shape: { type: 'triangle' },
  perspective: 2.5,
  tracks: [
    { property: 'rotateX', keyTimes, values: [0, Math.PI, Math.PI, 0, 0], easing: ease },
    { property: 'rotateY', keyTimes, values: [0, 0, Math.PI, Math.PI, 0], easing: ease },
  ],
});
