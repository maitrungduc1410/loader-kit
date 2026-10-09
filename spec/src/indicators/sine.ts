// Cubic bezier fits of a quarter of a sine wave, for motion that follows sin and cos, like an
// orbit or a pendulum. A value that moves as `sin` from 0 to its peak eases out; as `cos` from
// its peak to 0 it eases in; as `sin²` (the height of a pendulum) it eases in and out.
export const sineIn = [0.12, 0, 0.39, 0] as const;
export const sineOut = [0.61, 1, 0.88, 1] as const;
export const sineInOut = [0.37, 0, 0.63, 1] as const;
