import { defineIndicator } from '../define.ts';
import type { Part } from '../types.ts';

const sweep = [{ property: 'rotate', keyTimes: [0, 1], values: [0, 2 * Math.PI] }] as const;

const circle = (size: number, opacity: number): Part => ({
  layout: { type: 'single', size },
  shape: { type: 'ring', strokeWidth: 0.03 / size },
  rest: { opacity },
});

// A sector that trails the beam. A stroke of half the element fills the ring up to its center.
const trail = (angle: number): Part => ({
  layout: { type: 'single' },
  shape: { type: 'ring', strokeWidth: 0.5, startAngle: -Math.PI / 2 - angle, sweep: angle },
  rest: { opacity: 0.14 },
  groupTracks: sweep,
});

// A blip at `angle` clockwise from the top, that lights up when the beam reaches it and fades.
const blip = (angle: number, radius: number): Part => {
  const at = angle / (2 * Math.PI);
  const keyTimes = [0, at, at, at + 0.4, 1];
  return {
    layout: { type: 'single', size: 0.09, x: 0.5 + radius * Math.sin(angle), y: 0.5 - radius * Math.cos(angle) },
    shape: { type: 'circle' },
    tracks: [
      { property: 'opacity', keyTimes, values: [0, 0, 1, 0, 0] },
      { property: 'scale', keyTimes, values: [0.6, 0.6, 1.3, 0.6, 0.6], easing: 'easeOut' },
    ],
  };
};

export default defineIndicator({
  name: 'Radar',
  duration: 2,
  parts: [
    circle(1, 0.5),
    circle(0.5, 0.3),
    trail(Math.PI / 2),
    trail(Math.PI / 3),
    trail(Math.PI / 6),
    blip(Math.PI / 3, 0.25),
    blip((7 * Math.PI) / 6, 0.33),
    {
      // The beam, from the center to the edge.
      layout: { type: 'single', width: 0.04, height: 0.48, y: 0.26 },
      shape: { type: 'line' },
      groupTracks: sweep,
    },
  ],
});
