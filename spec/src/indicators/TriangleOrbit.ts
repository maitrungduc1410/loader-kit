import { defineIndicator } from '../define.ts';

const third = (2 * Math.PI) / 3;
const steps = [0, 1 / 3, 2 / 3, 1];
const halfSteps = [0, 1 / 6, 1 / 3, 1 / 2, 2 / 3, 5 / 6, 1];
const pulse = (low: number) => [1, low, 1, low, 1, low, 1];

// Three triangles pointing outward turn a third of a circle at a time, three steps per cycle so
// that every triangle is back in its place, and draw in while they move.
export default defineIndicator({
  name: 'TriangleOrbit',
  duration: 2.1,
  layout: { type: 'ring', count: 3, itemSize: 0.34, startAngle: -Math.PI / 2, orient: true },
  shape: { type: 'triangle' },
  tracks: [{ property: 'scale', keyTimes: halfSteps, values: pulse(0.7), easing: 'easeInOut' }],
  groupTracks: [
    { property: 'rotate', keyTimes: steps, values: [0, third, 2 * third, 3 * third], easing: [0.7, 0, 0.3, 1] },
    { property: 'scale', keyTimes: halfSteps, values: pulse(0.75), easing: 'easeInOut' },
  ],
});
