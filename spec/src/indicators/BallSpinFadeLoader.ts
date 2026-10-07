import { defineIndicator, param } from '../define.ts';

export default defineIndicator({
  name: 'BallSpinFadeLoader',
  duration: 1,
  params: { count: 8, minScale: 0.4, minOpacity: 0.3 },
  layout: { type: 'ring', count: param('count'), itemSize: 0.24 },
  shape: { type: 'circle' },
  stagger: { each: 0.12 },
  tracks: [
    { property: 'scale', keyTimes: [0, 0.5, 1], values: [1, param('minScale'), 1] },
    { property: 'opacity', keyTimes: [0, 0.5, 1], values: [1, param('minOpacity'), 1] },
  ],
});
