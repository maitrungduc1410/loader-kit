import { defineIndicator } from '../define.ts';
import type { Part } from '../types.ts';

const stroke = 0.07;

// Concentric arcs of the same stroke, the inner ones turning faster and the middle one backward.
// Each turns a whole number of times per cycle.
const arcs = (size: number, segments: number, sweep: number, turns: number): Part => ({
  layout: { type: 'single', size },
  shape: { type: 'ring', strokeWidth: stroke / size, segments, sweep },
  tracks: [{ property: 'rotate', keyTimes: [0, 1], values: [0, turns * 2 * Math.PI] }],
});

export default defineIndicator({
  name: 'TripleArcSpin',
  duration: 2.4,
  parts: [arcs(1, 1, 1.3 * Math.PI, 1), arcs(0.68, 2, 0.55 * Math.PI, -2), arcs(0.36, 3, 0.4 * Math.PI, 3)],
});
