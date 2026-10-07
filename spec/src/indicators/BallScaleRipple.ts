import { defineIndicator } from '../define.ts';
import { warpTrack } from './timing.ts';

const ease = [0.21, 0.53, 0.56, 0.8] as const;
const scale = warpTrack([0, 0.7], ease);

export default defineIndicator({
  name: 'BallScaleRipple',
  duration: 1,
  layout: { type: 'single' },
  shape: { type: 'ring', strokeWidth: 0.05 },
  tracks: [
    { property: 'scale', keyTimes: scale.keyTimes, values: [0.1, 1], easing: scale.easing },
    { property: 'opacity', keyTimes: [0, 0.7, 1], values: [1, 0.7, 0], easing: [ease, ease] },
  ],
});
