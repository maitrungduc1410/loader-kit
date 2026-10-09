import { defineIndicator } from '../define.ts';
import type { Part, Stagger } from '../types.ts';

const duration = 1;
const size = 0.2;
const edge = 0.5 - size / 2 - 0.05;
// Clockwise from the top-left corner, element k starts k eighths of a cycle late; the offsets are
// shifted back by a cycle so that every ball is already moving at the start.
const at = (k: number) => (k / 8 - 1) * duration;

const side = (count: number, gap: number, y: number, order: number[]): Part => ({
  layout: { type: 'row', count, gap, itemWidth: size },
  shape: { type: 'circle' },
  rest: { translateY: y },
  stagger: order.map(at) as Stagger,
  tracks: [
    { property: 'scale', keyTimes: [0, 0.12, 0.7, 1], values: [0.4, 1, 0.4, 0.4], easing: 'easeOut' },
    { property: 'opacity', keyTimes: [0, 0.12, 0.7, 1], values: [0.3, 1, 0.3, 0.3], easing: 'easeOut' },
  ],
});

const gap = edge - size;

export default defineIndicator({
  name: 'BallSquareSpin',
  duration,
  parts: [side(3, gap, -edge, [0, 1, 2]), side(2, 2 * edge - size, 0, [7, 3]), side(3, gap, edge, [6, 5, 4])],
});
