import { defineIndicator } from '../define.ts';
import type { Part } from '../types.ts';

const duration = 4;
const stroke = 0.08;

// A hand from the center toward the dial, turning once per `turn` seconds around the center.
const hand = (length: number, width: number, turn: number): Part => ({
  layout: { type: 'single', width, height: length, y: 0.5 - length / 2 + width / 2 },
  shape: { type: 'line' },
  duration: turn,
  groupTracks: [{ property: 'rotate', keyTimes: [0, 1], values: [0, 2 * Math.PI] }],
});

export default defineIndicator({
  name: 'Timer',
  duration,
  parts: [
    { layout: { type: 'single' }, shape: { type: 'ring', strokeWidth: stroke } },
    hand(0.26, stroke, duration),
    hand(0.36, stroke * 0.75, duration / 4),
  ],
});
