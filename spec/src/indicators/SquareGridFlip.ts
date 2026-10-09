import { defineIndicator } from '../define.ts';

const keyTimes = [0, 0.35, 1];
const flip = [0, Math.PI, Math.PI];
const easing = [[0.65, 0, 0.35, 1], 'linear'] as const;

// Each tile tumbles over its diagonal in turn, clockwise from the top-left. A half turn around both
// axes leaves a square looking the same, so the cycle restarts without a jump.
export default defineIndicator({
  name: 'SquareGridFlip',
  duration: 1.6,
  layout: { type: 'grid', columns: 2, rows: 2, gap: 0.1 },
  shape: { type: 'rect', cornerRadius: 0.12 },
  stagger: [0, 0.2, 0.6, 0.4],
  tracks: [
    { property: 'rotateX', keyTimes, values: flip, easing },
    { property: 'rotateY', keyTimes, values: flip, easing },
    { property: 'scale', keyTimes: [0, 0.175, 0.35, 1], values: [1, 0.8, 1, 1], easing: 'easeInOut' },
  ],
});
