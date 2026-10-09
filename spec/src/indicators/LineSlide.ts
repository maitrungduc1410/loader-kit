import { defineIndicator } from '../define.ts';
import { cubicBezier } from '../easing.ts';

const width = 0.9;
const height = 0.1;
const samples = 24;
// The head of the bar runs ahead and the tail catches up with it at the end of the track.
const head = [0.2, 0.6, 0.4, 1] as const;
const tail = [0.6, 0, 0.8, 0.4] as const;

const keyTimes = Array.from({ length: samples + 1 }, (_, i) => i / samples);
const round = (value: number) => Math.round(value * 1e6) / 1e6;
const edges = keyTimes.map((t) => [cubicBezier(tail, t) * width, cubicBezier(head, t) * width] as const);

export default defineIndicator({
  name: 'LineSlide',
  duration: 1.5,
  parts: [
    {
      layout: { type: 'single', width, height },
      shape: { type: 'line' },
      rest: { opacity: 0.25 },
    },
    {
      layout: { type: 'single', width, height },
      shape: { type: 'line' },
      tracks: [
        { property: 'scaleX', keyTimes, values: edges.map(([start, end]) => round((end - start) / width)) },
        { property: 'translateX', keyTimes, values: edges.map(([start, end]) => round((start + end - width) / 2)) },
      ],
    },
  ],
});
