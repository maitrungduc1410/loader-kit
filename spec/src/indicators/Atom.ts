import { defineIndicator } from '../define.ts';
import type { Part } from '../types.ts';
import { sineIn, sineOut } from './sine.ts';

const duration = 1.5;
const electron = 0.12;
const nearScale = 1.3;
// Semi-axes of each orbit, before it is tilted. Even at its nearest scale an electron stays in the box.
const a = 0.5 - (electron * nearScale) / 2;
const b = 0.15;
const keyTimes = [0, 0.25, 0.5, 0.75, 1];
const cos = [sineIn, sineOut, sineIn, sineOut] as const;
const sin = [sineOut, sineIn, sineOut, sineIn] as const;
const tilts = [0, Math.PI / 3, (2 * Math.PI) / 3];
const tilt = (angle: number) => [{ property: 'rotate', keyTimes: [0, 1], values: [angle, angle] }] as const;

// The path of an orbit: a thin ring, centered on the circle of radius `a`, squashed into the ellipse.
const stroke = 0.025;
const path = (angle: number): Part => ({
  layout: { type: 'single', size: (2 * a) / (1 - stroke) },
  shape: { type: 'ring', strokeWidth: stroke },
  rest: { scaleY: b / a, opacity: 0.25 },
  groupTracks: tilt(angle),
});

// An electron going around the ellipse, larger on the near side.
const orbit = (angle: number, offset: number): Part => ({
  layout: { type: 'single', size: electron },
  shape: { type: 'circle' },
  stagger: [offset],
  tracks: [
    { property: 'translateX', keyTimes, values: [a, 0, -a, 0, a], easing: cos },
    { property: 'translateY', keyTimes, values: [0, b, 0, -b, 0], easing: sin },
    { property: 'scale', keyTimes, values: [1, nearScale, 1, 2 - nearScale, 1], easing: sin },
  ],
  groupTracks: tilt(angle),
});

export default defineIndicator({
  name: 'Atom',
  duration,
  parts: [
    ...tilts.map(path),
    {
      layout: { type: 'single', size: 0.24 },
      shape: { type: 'circle' },
      tracks: [{ property: 'scale', keyTimes: [0, 0.5, 1], values: [1, 0.8, 1], easing: 'easeInOut' }],
    },
    ...tilts.map((angle, i) => orbit(angle, (-i * duration) / 3)),
  ],
});
