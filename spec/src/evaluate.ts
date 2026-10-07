import { controlPoints, cubicBezier } from './easing.ts';
import type {
  AnimatableProperty,
  Easing,
  ElementState,
  GroupProperty,
  IndicatorSpec,
  Layout,
  Num,
  Part,
  Shape,
  Stagger,
  Track,
} from './types.ts';
import { hasOwn } from './own.ts';

export type Params = Readonly<Record<string, number>>;

/** Value of every property when no track drives it, and before an element starts. */
export const REST_VALUES: Readonly<Record<AnimatableProperty, number>> = {
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  opacity: 1,
  rotate: 0,
  rotateX: 0,
  rotateY: 0,
  translateX: 0,
  translateY: 0,
  strokeStart: 0,
  strokeEnd: 1,
};

export const GROUP_PROPERTIES: readonly GroupProperty[] = [
  'scale',
  'scaleX',
  'scaleY',
  'opacity',
  'rotate',
  'translateX',
  'translateY',
];

export const DEFAULT_PERSPECTIVE = 2.5;

/** Spec defaults merged with the overrides. Overrides for unknown names are ignored. */
export function resolveParams(spec: IndicatorSpec, overrides: Params = {}): Params {
  const resolved: Record<string, number> = { ...spec.params };
  for (const [name, value] of Object.entries(overrides)) {
    if (hasOwn(resolved, name)) resolved[name] = value;
  }
  return resolved;
}

export function resolveNum(value: Num, params: Params): number {
  if (typeof value === 'number') return value;
  const resolved = hasOwn(params, value.$param) ? params[value.$param] : undefined;
  if (resolved === undefined) throw new Error(`Unknown param "${value.$param}"`);
  return resolved;
}

/** Counts are rounded to the nearest integer and are at least 1. */
export function resolveCount(value: Num, params: Params): number {
  return Math.max(1, Math.round(resolveNum(value, params)));
}

/** The groups of a spec: its `parts`, or the spec itself when it has none. */
export function specParts(spec: IndicatorSpec): readonly Part[] {
  return spec.parts ?? [spec as Part];
}

export interface ElementGeometry {
  cx: number;
  cy: number;
  width: number;
  height: number;
  /** Rotation that comes from the layout (ring `orient`). */
  rotate: number;
}

export function layoutElements(layout: Layout, params: Params): ElementGeometry[] {
  const n = (value: Num) => resolveNum(value, params);
  const or = (value: Num | undefined, fallback: number) => (value === undefined ? fallback : n(value));
  switch (layout.type) {
    case 'single':
    case 'stack': {
      const count = layout.type === 'stack' ? resolveCount(layout.count, params) : 1;
      const size = or(layout.size, 1);
      const element = {
        cx: or(layout.x, 0.5),
        cy: or(layout.y, 0.5),
        width: or(layout.width, size),
        height: or(layout.height, size),
        rotate: 0,
      };
      return Array.from({ length: count }, () => ({ ...element }));
    }
    case 'row': {
      const count = resolveCount(layout.count, params);
      const gap = n(layout.gap);
      const width = or(layout.itemWidth, (1 - gap * (count - 1)) / count);
      const height = or(layout.itemHeight, width);
      const start = (1 - (count * width + (count - 1) * gap)) / 2;
      return Array.from({ length: count }, (_, i) => ({
        cx: start + width / 2 + i * (width + gap),
        cy: 0.5,
        width,
        height,
        rotate: 0,
      }));
    }
    case 'grid': {
      const columns = resolveCount(layout.columns, params);
      const rows = resolveCount(layout.rows, params);
      const gap = n(layout.gap);
      const width = (1 - gap * (columns - 1)) / columns;
      const height = (1 - gap * (rows - 1)) / rows;
      return Array.from({ length: columns * rows }, (_, i) => {
        const column = i % columns;
        const row = Math.floor(i / columns);
        return {
          cx: width / 2 + column * (width + gap),
          cy: height / 2 + row * (height + gap),
          width,
          height,
          rotate: 0,
        };
      });
    }
    case 'ring': {
      const count = resolveCount(layout.count, params);
      const size = n(layout.itemSize);
      const start = or(layout.startAngle, 0);
      const radius = 0.5 - size / 2;
      const width = or(layout.itemWidth, size);
      const height = or(layout.itemHeight, size);
      return Array.from({ length: count }, (_, i) => {
        const angle = start + (i * 2 * Math.PI) / count;
        return {
          cx: 0.5 + radius * Math.cos(angle),
          cy: 0.5 + radius * Math.sin(angle),
          width,
          height,
          rotate: layout.orient ? angle + Math.PI / 2 : 0,
        };
      });
    }
  }
}

/** A shape with its params resolved and its defaults filled in. */
export type ResolvedShape =
  | { type: 'circle'; startAngle: number; sweep: number }
  | { type: 'rect'; cornerRadius: number }
  | { type: 'ring'; strokeWidth: number; startAngle: number; sweep: number; segments: number }
  | { type: 'triangle' }
  | { type: 'line' };

export function resolveShape(shape: Shape, params: Params): ResolvedShape {
  const or = (value: Num | undefined, fallback: number) =>
    value === undefined ? fallback : resolveNum(value, params);
  switch (shape.type) {
    case 'circle':
      return { type: 'circle', startAngle: or(shape.startAngle, -Math.PI / 2), sweep: or(shape.sweep, 2 * Math.PI) };
    case 'rect':
      return { type: 'rect', cornerRadius: or(shape.cornerRadius, 0) };
    case 'ring':
      return {
        type: 'ring',
        strokeWidth: resolveNum(shape.strokeWidth, params),
        startAngle: or(shape.startAngle, -Math.PI / 2),
        sweep: or(shape.sweep, 2 * Math.PI),
        segments: shape.segments === undefined ? 1 : resolveCount(shape.segments, params),
      };
    case 'triangle':
    case 'line':
      return { type: shape.type };
  }
}

/** Start offset of each element in seconds. */
export function staggerOffsets(stagger: Stagger | undefined, count: number): number[] {
  if (stagger === undefined) return new Array<number>(count).fill(0);
  if (!Array.isArray(stagger)) {
    const { each, start = 0 } = stagger as { each: number; start?: number };
    return Array.from({ length: count }, (_, i) => start + each * i);
  }
  if (stagger.length < count) {
    throw new Error(`stagger has ${stagger.length} entries but the layout has ${count} elements`);
  }
  return stagger.slice(0, count);
}

/** Cycle length of each element: `durations[i]`, else the part `duration`, else the spec `duration`. */
export function elementDurations(part: Part, specDuration: number, count: number): number[] {
  const fallback = part.duration ?? specDuration;
  if (part.durations === undefined) return new Array<number>(count).fill(fallback);
  if (part.durations.length < count) {
    throw new Error(`durations has ${part.durations.length} entries but the layout has ${count} elements`);
  }
  return part.durations.slice(0, count);
}

/** A part with its layout, offsets and durations resolved. */
export interface PreparedPart {
  part: Part;
  shape: ResolvedShape;
  /** Global index of the first element of the part. */
  firstIndex: number;
  elements: ElementGeometry[];
  offsets: number[];
  durations: number[];
  /** Cycle length of the group tracks. */
  duration: number;
  /** Values of properties without a track, with `rest` applied. */
  rest: Record<AnimatableProperty, number>;
}

export function prepareParts(spec: IndicatorSpec, params: Params): PreparedPart[] {
  let firstIndex = 0;
  return specParts(spec).map((part) => {
    const elements = layoutElements(part.layout, params);
    const rest = { ...REST_VALUES };
    for (const [property, value] of Object.entries(part.rest ?? {})) {
      if (hasOwn(REST_VALUES, property) && value !== undefined) {
        rest[property as AnimatableProperty] = resolveNum(value, params);
      }
    }
    const prepared: PreparedPart = {
      part,
      shape: resolveShape(part.shape, params),
      firstIndex,
      elements,
      offsets: staggerOffsets(part.stagger, elements.length),
      durations: elementDurations(part, spec.duration, elements.length),
      duration: part.duration ?? spec.duration,
      rest,
    };
    firstIndex += elements.length;
    return prepared;
  });
}

/** Value of a track at cycle progress `p` in [0, 1). */
export function sampleTrack(track: Track<string>, p: number, params: Params): number {
  const { keyTimes } = track;
  const values = track.values.map((value) => resolveNum(value, params));
  const last = keyTimes.length - 1;
  if (p <= keyTimes[0]!) return values[0]!;
  if (p >= keyTimes[last]!) return values[last]!;

  let k = 0;
  while (k < last - 1 && p >= keyTimes[k + 1]!) k++;
  const start = keyTimes[k]!;
  const end = keyTimes[k + 1]!;
  const u = end > start ? (p - start) / (end - start) : 1;
  const eased = cubicBezier(controlPoints(segmentEasing(track, k)), u);
  return values[k]! + (values[k + 1]! - values[k]!) * eased;
}

/**
 * Easing of segment `k`. `easing` is a per-segment list when it is an array whose items are
 * strings or arrays; an array of four numbers is a single bezier for every segment.
 */
export function segmentEasing(track: Track<string>, k: number): Easing {
  const { easing } = track;
  if (easing === undefined) return 'linear';
  if (isPerSegment(easing)) return easing[k]!;
  return easing;
}

export function isPerSegment(easing: NonNullable<Track['easing']>): easing is readonly Easing[] {
  return Array.isArray(easing) && easing.length > 0 && typeof easing[0] !== 'number';
}

/** Cycle progress in [0, 1) at `local` seconds after the start, or -1 before the start. */
function cycle(local: number, duration: number): number {
  return local < 0 ? -1 : (local % duration) / duration;
}

/** A spec with its params, layouts and timing resolved once, for drawing many frames. */
export interface PreparedIndicator {
  readonly spec: IndicatorSpec;
  readonly params: Params;
  readonly parts: readonly PreparedPart[];
  /** Number of elements across every part. */
  readonly elementCount: number;
  /** Same as {@link evaluate} for this spec and params. */
  evaluate(t: number): ElementState[];
  /** Same as {@link timeForCycleProgress} for this spec and params. */
  timeForCycleProgress(cycleProgress: number): number;
}

/** Resolves `spec` with `overrides` once. Throws like {@link evaluate} on a malformed spec. */
export function prepareIndicator(spec: IndicatorSpec, overrides: Params = {}): PreparedIndicator {
  const params = resolveParams(spec, overrides);
  const parts = prepareParts(spec, params);
  let latest = 0;
  for (const prepared of parts) for (const offset of prepared.offsets) latest = Math.max(latest, offset);
  const warmup = Math.ceil(latest / spec.duration) * spec.duration;
  return {
    spec,
    params,
    parts,
    elementCount: parts.reduce((sum, prepared) => sum + prepared.elements.length, 0),
    evaluate: (t) => evaluateParts(parts, params, t),
    timeForCycleProgress: (cycleProgress) => warmup + Math.min(1, Math.max(0, cycleProgress)) * spec.duration,
  };
}

/**
 * State of every element at spec time `t` (seconds since the start, already multiplied by the
 * speed). An element whose start offset is still ahead shows its rest values, like a Core
 * Animation layer before its `beginTime`.
 */
export function evaluate(spec: IndicatorSpec, t: number, overrides: Params = {}): ElementState[] {
  return prepareIndicator(spec, overrides).evaluate(t);
}

function evaluateParts(parts: readonly PreparedPart[], params: Params, t: number): ElementState[] {
  return parts.flatMap((prepared, part) => {
    const group: Record<GroupProperty, number> = {
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      rotate: 0,
      translateX: 0,
      translateY: 0,
    };
    const groupProgress = cycle(t, prepared.duration);
    if (groupProgress >= 0) {
      for (const track of prepared.part.groupTracks ?? []) {
        group[track.property] = sampleTrack(track, groupProgress, params);
      }
    }

    return prepared.elements.map((element, i): ElementState => {
      const values = { ...prepared.rest };
      const p = cycle(t - prepared.offsets[i]!, prepared.durations[i]!);
      if (p >= 0) {
        for (const track of prepared.part.tracks ?? []) values[track.property] = sampleTrack(track, p, params);
      }
      return {
        index: prepared.firstIndex + i,
        part,
        cx: element.cx,
        cy: element.cy,
        width: element.width,
        height: element.height,
        scaleX: values.scale * values.scaleX,
        scaleY: values.scale * values.scaleY,
        opacity: values.opacity * group.opacity,
        rotate: element.rotate + values.rotate,
        rotateX: values.rotateX,
        rotateY: values.rotateY,
        translateX: values.translateX,
        translateY: values.translateY,
        strokeStart: values.strokeStart,
        strokeEnd: values.strokeEnd,
        groupScaleX: group.scale * group.scaleX,
        groupScaleY: group.scale * group.scaleY,
        groupRotate: group.rotate,
        groupTranslateX: group.translateX,
        groupTranslateY: group.translateY,
      };
    });
  });
}

/** Number of elements across every part. */
export function elementCount(spec: IndicatorSpec, overrides: Params = {}): number {
  const params = resolveParams(spec, overrides);
  return specParts(spec).reduce((sum, part) => sum + layoutElements(part.layout, params).length, 0);
}

/**
 * Spec time for a frozen `cycleProgress` in [0, 1] of the spec `duration`. It skips whole
 * cycles until every element has started, so a frozen frame never shows elements at rest
 * because of their start offset.
 */
export function timeForCycleProgress(spec: IndicatorSpec, cycleProgress: number, overrides: Params = {}): number {
  return prepareIndicator(spec, overrides).timeForCycleProgress(cycleProgress);
}
