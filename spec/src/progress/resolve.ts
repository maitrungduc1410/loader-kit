import { PROGRESS_TYPES, PROGRESS_TYPE_VARIANTS } from './types.ts';
import type { ProgressOptions, ProgressType, ProgressVariant, ResolvedProgress } from './types.ts';

/** Default width and height of every type that does not fill its container or wrap its content. */
export const PROGRESS_DEFAULT_SIZE = 48;

const THICKNESS: Readonly<Record<string, number>> = {
  'linear:flat': 4,
  'linear:wavy': 4,
  'linear:segmented': 6,
  'linear:striped': 10,
  'linear:shimmer': 8,
  'linear:glow': 3,
  'linear:dots': 4,
  'linear:steps': 3,
  'circular:gradient': 5,
  'circular:ticks': 3,
  gauge: 6,
  liquid: 3,
  border: 3,
  battery: 3,
};

const SEGMENTS: Readonly<Record<string, number>> = {
  'linear:segmented': 10,
  'linear:dots': 8,
  'linear:steps': 4,
  'circular:segmented': 12,
  'circular:ticks': 12,
  'circular:dots': 10,
  'gauge:segmented': 10,
  bars: 5,
  grid: 5,
};

const MAX_SEGMENTS = 64;
const MAX_GRID_COLUMNS = 16;
/** Shorter waves alias: the wave is sampled every 2 units of length. */
const MIN_WAVELENGTH = 8;

/** The variants `type` accepts; the first one is the default. */
export function progressVariants(type: ProgressType): readonly ProgressVariant[] {
  return PROGRESS_TYPE_VARIANTS[type] ?? ['flat'];
}

/** True when `segments` changes how `type` and `variant` draw. */
export function progressUsesSegments(type: ProgressType, variant: ProgressVariant): boolean {
  return SEGMENTS[`${type}:${variant}`] !== undefined || type === 'bars' || type === 'grid';
}

const finite = (value: number | null | undefined, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const atLeast = (value: number | null | undefined, min: number, fallback: number): number =>
  Math.max(min, finite(value, fallback));

/**
 * Applies the defaults and makes every number safe: an unknown type becomes `circular`, a variant the
 * type does not have becomes its default, NaN or infinite numbers take the default, sizes are not
 * negative and segments are whole numbers within limits.
 */
export function resolveProgress(options: ProgressOptions = {}): ResolvedProgress {
  const type: ProgressType = PROGRESS_TYPES.includes(options.type as ProgressType) ? (options.type as ProgressType) : 'circular';
  const variants = progressVariants(type);
  const variant: ProgressVariant = variants.includes(options.variant as ProgressVariant) ? (options.variant as ProgressVariant) : variants[0]!;
  const key = `${type}:${variant}`;
  const linear = type === 'linear';
  const segmentsDefault = SEGMENTS[key] ?? SEGMENTS[type] ?? 1;
  const segmentsMin = key === 'linear:steps' ? 2 : 1;
  const segmentsMax = type === 'grid' ? MAX_GRID_COLUMNS : MAX_SEGMENTS;
  const sweepDegrees = Math.min(350, Math.max(30, finite(options.sweepAngle, 270)));
  return {
    type,
    variant,
    thickness: atLeast(options.thickness, 0.5, THICKNESS[key] ?? THICKNESS[type] ?? 4),
    trackGap: atLeast(options.trackGap, 0, 4),
    segments: Math.min(segmentsMax, Math.max(segmentsMin, Math.round(finite(options.segments, segmentsDefault)))),
    showLabel: options.showLabel ?? false,
    stopIndicator: options.stopIndicator ?? true,
    strokeCap: options.strokeCap === 'butt' ? 'butt' : 'round',
    amplitude: atLeast(options.amplitude, 0, linear ? 3 : 2),
    wavelength: atLeast(options.wavelength, MIN_WAVELENGTH, linear ? 40 : 15),
    waveSpeed: finite(options.waveSpeed, 1),
    sweepAngle: (sweepDegrees * Math.PI) / 180,
    cornerRadius: atLeast(options.cornerRadius, 0, 12),
    speed: finite(options.speed, 1),
  };
}

/** True when a linear label sits inside the bar rather than after it. */
export function progressLabelInside(p: ResolvedProgress): boolean {
  return p.type === 'linear' && p.showLabel && p.thickness >= 14 && (p.variant === 'flat' || p.variant === 'striped' || p.variant === 'shimmer');
}

/** Room a linear label takes after the bar when it does not fit inside. */
export const PROGRESS_LABEL_WIDTH = 44;

/** Height of a linear indicator, which takes its width from the layout. */
export function progressLinearHeight(p: ResolvedProgress): number {
  const t = p.thickness;
  let height: number;
  switch (p.variant) {
    case 'wavy':
      height = t + 2 * p.amplitude + 4;
      break;
    case 'glow':
      height = t + 18;
      break;
    case 'dots':
      height = Math.max(6, t * 2) * 2.3;
      break;
    case 'steps':
      height = 2 * Math.max(7, t * 1.75) + 4;
      break;
    default:
      height = t + 4;
  }
  if (p.showLabel && !progressLabelInside(p)) height = Math.max(height, 18);
  return Math.ceil(height);
}

/**
 * The size a layout gives the indicator when nothing else sizes it. Null means no preference: linear
 * fills the available width, and `border` takes the size of its content plus `progressContentInset`.
 */
export function progressIntrinsicSize(p: ResolvedProgress): { width: number | null; height: number | null } {
  switch (p.type) {
    case 'linear':
      return { width: null, height: progressLinearHeight(p) };
    case 'border':
      return { width: null, height: null };
    case 'bars':
      return { width: PROGRESS_DEFAULT_SIZE, height: PROGRESS_DEFAULT_SIZE * 0.75 };
    case 'battery':
      return { width: PROGRESS_DEFAULT_SIZE, height: PROGRESS_DEFAULT_SIZE / 2 };
    default:
      return { width: PROGRESS_DEFAULT_SIZE, height: PROGRESS_DEFAULT_SIZE };
  }
}

/** Padding between a `border` and its content, so the stroke does not cover it. */
export function progressContentInset(p: ResolvedProgress): number {
  return p.type === 'border' ? p.thickness + p.trackGap : 0;
}
