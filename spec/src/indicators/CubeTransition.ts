import { defineIndicator } from '../define.ts';

const size = 0.2;
const delta = 1 - size;
const keyTimes = [0, 0.25, 0.5, 0.75, 1];
const easing = ['easeInOut', 'easeInOut', 'easeInOut', 'easeInOut'] as const;

export default defineIndicator({
  name: 'CubeTransition',
  duration: 1.6,
  layout: { type: 'stack', count: 2, size, x: size / 2, y: size / 2 },
  shape: { type: 'rect' },
  stagger: [0, -0.8],
  tracks: [
    { property: 'scale', keyTimes, values: [1, 0.5, 1, 0.5, 1], easing },
    { property: 'translateX', keyTimes, values: [0, delta, delta, 0, 0], easing },
    { property: 'translateY', keyTimes, values: [0, 0, delta, delta, 0], easing },
    { property: 'rotate', keyTimes, values: [0, -Math.PI / 2, -Math.PI, -1.5 * Math.PI, -2 * Math.PI], easing },
  ],
});
