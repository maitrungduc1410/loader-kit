/**
 * LoaderKitProgress: a progress indicator drawn from parameters rather than from an indicator spec,
 * because its shape depends on the value and not only on time.
 *
 * Every platform turns the same resolved props and animation state into the same list of draw
 * commands (`progressCommands`), and the shared test vectors check that they agree. Renderers only
 * map commands to their 2D API. Coordinates are in density-independent units (dp, pt or CSS px),
 * origin at the top-left, y pointing down. Angles are radians, positive is clockwise on screen.
 */

export const PROGRESS_TYPES = ['linear', 'circular', 'pie', 'gauge', 'liquid', 'border', 'bars', 'grid', 'battery'] as const;
export type ProgressType = (typeof PROGRESS_TYPES)[number];

export const PROGRESS_VARIANTS = ['flat', 'wavy', 'segmented', 'striped', 'shimmer', 'glow', 'dots', 'steps', 'gradient', 'ticks'] as const;
export type ProgressVariant = (typeof PROGRESS_VARIANTS)[number];

/** The variants each type accepts; the first one is its default. Types not listed only have `flat`. */
export const PROGRESS_TYPE_VARIANTS: Readonly<Partial<Record<ProgressType, readonly ProgressVariant[]>>> = {
  linear: ['flat', 'wavy', 'segmented', 'striped', 'shimmer', 'glow', 'dots', 'steps'],
  circular: ['flat', 'wavy', 'segmented', 'gradient', 'ticks', 'dots'],
  gauge: ['flat', 'segmented'],
};

export type ProgressStrokeCap = 'round' | 'butt';

/** Drawing options. Unset (or null) options take the defaults of `resolveProgress`. */
export interface ProgressOptions {
  type?: ProgressType | null;
  variant?: ProgressVariant | null;
  /** Width of strokes and bars. Default depends on the type and variant. */
  thickness?: number | null;
  /** Space between the progress and the track, or between segments. Default 4. */
  trackGap?: number | null;
  /** Number of segments, dots, ticks, steps, bars or grid columns. Default depends on the variant. */
  segments?: number | null;
  /** Show the percentage. Default false. */
  showLabel?: boolean | null;
  /** Dot at the end of the track of linear `flat` and `wavy`. Default true. */
  stopIndicator?: boolean | null;
  strokeCap?: ProgressStrokeCap | null;
  /** Wave amplitude of `wavy`. Default 3 for linear, 2 for circular. */
  amplitude?: number | null;
  /** Wave length of `wavy`. Default 40 for linear, 15 for circular. */
  wavelength?: number | null;
  /** Wave travel in wavelengths per second. Default 1. */
  waveSpeed?: number | null;
  /** Arc of `gauge`, in degrees. Default 270. */
  sweepAngle?: number | null;
  /** Corner radius of `border`. Default 12. */
  cornerRadius?: number | null;
  /** Playback rate of the indeterminate animation. Default 1. */
  speed?: number | null;
}

/** Options with every default applied and every number made safe to draw with. */
export interface ResolvedProgress {
  type: ProgressType;
  variant: ProgressVariant;
  thickness: number;
  trackGap: number;
  segments: number;
  showLabel: boolean;
  stopIndicator: boolean;
  strokeCap: ProgressStrokeCap;
  amplitude: number;
  wavelength: number;
  waveSpeed: number;
  /** Radians. */
  sweepAngle: number;
  cornerRadius: number;
  speed: number;
}

/** What `progressCommands` draws at one instant; `ProgressAnimator.state` produces it. */
export interface ProgressState {
  indeterminate: boolean;
  /** Displayed value in [0, 1]; follows the real value when `smooth` is on. */
  value: number;
  /** Displayed buffer in [0, 1]; 0 draws no buffer. */
  buffer: number;
  /** Wave amplitude factor: 0 flat, 1 full. The wave flattens near 0% and 100%. */
  wave: number;
  /** Seconds of ambient motion: wave travel, sheens and stripes in the determinate state. */
  time: number;
  /** Seconds of the indeterminate animation, already scaled by `speed`. */
  indeterminateTime: number;
}

/** Colors a command refers to. Renderers resolve them from the platform props. */
export type ProgressColorRole =
  /** The progress color. */
  | 'color'
  /** The track color: `trackColor`, or the progress color at 24% opacity. */
  | 'track'
  /** Label text: the platform text color. */
  | 'label'
  | 'white';

export interface ProgressColorStop {
  offset: number;
  color: ProgressColorRole;
  alpha: number;
}

export type ProgressPaint =
  | { type: 'solid'; color: ProgressColorRole; alpha: number }
  | { type: 'linear'; x0: number; y0: number; x1: number; y1: number; stops: ProgressColorStop[] }
  | { type: 'radial'; cx: number; cy: number; r: number; stops: ProgressColorStop[] }
  /** Offsets are fractions of a turn, clockwise from `start`. */
  | { type: 'conic'; cx: number; cy: number; start: number; stops: ProgressColorStop[] };

export type ProgressClipShape =
  | { type: 'rect'; x: number; y: number; width: number; height: number; radius: number }
  | { type: 'circle'; cx: number; cy: number; r: number }
  /** Flat list of x, y pairs. */
  | { type: 'polygon'; points: number[] };

export type ProgressCommand =
  | { op: 'line'; x0: number; y0: number; x1: number; y1: number; lineWidth: number; cap: ProgressStrokeCap; paint: ProgressPaint }
  /** Clockwise arc from `start` to `end`. */
  | { op: 'arc'; cx: number; cy: number; r: number; start: number; end: number; lineWidth: number; cap: ProgressStrokeCap; paint: ProgressPaint }
  /** Stroked path through x, y pairs, with round joins. */
  | { op: 'polyline'; points: number[]; closed: boolean; lineWidth: number; cap: ProgressStrokeCap; paint: ProgressPaint }
  | { op: 'circle'; cx: number; cy: number; r: number; paint: ProgressPaint }
  /** Filled rectangle with rounded corners. */
  | { op: 'rect'; x: number; y: number; width: number; height: number; radius: number; paint: ProgressPaint }
  /** Stroked rectangle with rounded corners. */
  | { op: 'strokeRect'; x: number; y: number; width: number; height: number; radius: number; lineWidth: number; paint: ProgressPaint }
  /** Filled path through x, y pairs. */
  | { op: 'polygon'; points: number[]; paint: ProgressPaint }
  /** Filled pie slice, clockwise from `start` to `end`. */
  | { op: 'sector'; cx: number; cy: number; r: number; start: number; end: number; paint: ProgressPaint }
  /** Semibold system text, vertically centered on `y`. `x` is the center, or the right edge. */
  | { op: 'text'; x: number; y: number; size: number; text: string; align: 'center' | 'right'; paint: ProgressPaint }
  /** Draws `commands` clipped to `shape`. */
  | { op: 'clip'; shape: ProgressClipShape; commands: ProgressCommand[] };
