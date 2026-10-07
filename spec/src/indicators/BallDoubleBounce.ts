import { defineIndicator } from '../define.ts';
import { warpTrack } from './timing.ts';

const scale = warpTrack([0, 0.5, 1], [0.42, 0, 0.58, 1]);

export default defineIndicator({
  name: 'BallDoubleBounce',
  duration: 2,
  layout: { type: 'stack', count: 2 },
  shape: { type: 'circle' },
  stagger: [0, 1],
  rest: { opacity: 0.6 },
  tracks: [{ property: 'scale', keyTimes: scale.keyTimes, values: [1, 0, 1], easing: scale.easing }],
});
