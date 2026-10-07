/**
 * LoaderKit indicator spec, schema version 1.
 *
 * A spec describes an indicator as data: which elements exist, where they sit inside a unit box,
 * and how each animated property changes over one cycle. Every platform engine reads the same
 * spec and must produce the same element states as `evaluate()` in this package.
 *
 * Coordinates are normalized: the indicator is drawn in a square of side 1 (the smaller edge of
 * the view), origin at the top-left, y pointing down. Angles are radians, positive is clockwise
 * on screen. Times are seconds at speed 1.
 */

export const SCHEMA_VERSION = 1;

/** A reference to a spec parameter, resolved with the spec defaults merged with user overrides. */
export interface ParamRef {
  $param: string;
}

/** A number, or a reference to a parameter. */
export type Num = number | ParamRef;

/** Named easings use the Core Animation control points; `ease` is the CSS and Core Animation default. */
export type NamedEasing = 'linear' | 'ease' | 'easeIn' | 'easeOut' | 'easeInOut';

/** A cubic-bezier easing `[x1, y1, x2, y2]`, like CSS `cubic-bezier()`. */
export type BezierEasing = readonly [number, number, number, number];
export type Easing = NamedEasing | BezierEasing;

/** Element size and center shared by `single` and `stack`. */
interface PlacedLayout {
  /** Side of the element, default 1. */
  size?: Num;
  /** Element width, default `size`. */
  width?: Num;
  /** Element height, default `size`. */
  height?: Num;
  /** Element center, default 0.5. */
  x?: Num;
  y?: Num;
}

/** One element. */
export type SingleLayout = PlacedLayout & { type: 'single' };

/** `count` elements on top of each other, all at the same place. */
export type StackLayout = PlacedLayout & { type: 'stack'; count: Num };

export type RowLayout = {
  type: 'row';
  count: Num;
  /** Space between two elements. */
  gap: Num;
  /** Element width. Default: the elements and gaps fill the box; with a width the row is centered. */
  itemWidth?: Num;
  /** Element height. Default: the element width (square elements). */
  itemHeight?: Num;
};

export type GridLayout = {
  type: 'grid';
  columns: Num;
  rows: Num;
  gap: Num;
};

export type RingLayout = {
  type: 'ring';
  count: Num;
  /** Side of each element. Element centers sit on a circle of radius `0.5 - itemSize / 2`. */
  itemSize: Num;
  /** Element width and height, default `itemSize`. The radius still comes from `itemSize`. */
  itemWidth?: Num;
  itemHeight?: Num;
  /** Angle of the first element, default 0 (to the right of the center). */
  startAngle?: Num;
  /** When true, each element is rotated by its angle plus π/2, so its top points away from the center. */
  orient?: boolean;
};

export type Layout = SingleLayout | StackLayout | RowLayout | GridLayout | RingLayout;

export type Shape =
  | {
      /** A filled ellipse inscribed in the element, or with `sweep` below 2π the part of it cut off by a chord. */
      type: 'circle';
      /** Where the arc starts, default -π/2 (the top). The arc goes clockwise. */
      startAngle?: Num;
      /** Angle covered by the arc, in (0, 2π], default 2π. */
      sweep?: Num;
    }
  | {
      type: 'rect';
      /** Corner radius as a fraction of the shorter side of the element, 0 to 0.5. */
      cornerRadius?: Num;
    }
  | {
      /** A stroked circle, or one or more arcs of it. `strokeStart` and `strokeEnd` trim every arc. */
      type: 'ring';
      /** Stroke width as a fraction of the shorter side of the element. */
      strokeWidth: Num;
      /** Where the first arc starts, default -π/2 (the top). Arcs go clockwise. */
      startAngle?: Num;
      /** Angle covered by each arc, in (0, 2π], default 2π. */
      sweep?: Num;
      /** Number of arcs, evenly spaced around the circle, default 1. */
      segments?: Num;
    }
  /** Isosceles triangle pointing up, filling the element. */
  | { type: 'triangle' }
  /** A bar with fully rounded ends. */
  | { type: 'line' };

export type AnimatableProperty =
  | 'scale'
  | 'scaleX'
  | 'scaleY'
  | 'opacity'
  | 'rotate'
  | 'rotateX'
  | 'rotateY'
  | 'translateX'
  | 'translateY'
  /** Start and end of the drawn part of each arc of a `ring`, as fractions of the arc, like Core Animation. */
  | 'strokeStart'
  | 'strokeEnd';

/** Properties a group track can animate. They transform the whole group around the box center. */
export type GroupProperty = 'scale' | 'scaleX' | 'scaleY' | 'opacity' | 'rotate' | 'translateX' | 'translateY';

export interface Track<P extends string = AnimatableProperty> {
  property: P;
  /** Non-decreasing, within [0, 1], same length as `values`, at least 2 entries. */
  keyTimes: readonly number[];
  values: readonly Num[];
  /** One easing for every segment, or one per segment (`keyTimes.length - 1`). Default linear. */
  easing?: Easing | readonly Easing[];
}

export type GroupTrack = Track<GroupProperty>;

export type Stagger =
  /** Start offset in seconds of each element, by index. Must cover every element. Negative offsets start mid-cycle. */
  | readonly number[]
  /** Element `i` starts at `start + each * i` seconds (`start` defaults to 0). */
  | { each: number; start?: number };

/** A group of elements that share a layout, a shape and tracks. */
export interface Part {
  layout: Layout;
  shape: Shape;
  /** Tracks applied to every element of the group. */
  tracks?: readonly Track[];
  stagger?: Stagger;
  /** Cycle length of this group in seconds. Default: the spec `duration`. */
  duration?: number;
  /** Cycle length of each element, by index, overriding `duration`. Must cover every element. */
  durations?: readonly number[];
  /** Values of properties that no track drives, also shown before an element starts. Default: the rest values. */
  rest?: Readonly<Partial<Record<AnimatableProperty, Num>>>;
  /** Tracks that move the whole group around the box center, on the group's cycle, without stagger. */
  groupTracks?: readonly GroupTrack[];
}

interface SpecBase {
  /** URL of the JSON Schema, for editors. Engines ignore it. */
  $schema?: string;
  schemaVersion: typeof SCHEMA_VERSION;
  name: string;
  /** Length of one cycle in seconds, at speed 1. `cycleProgress` freezes a point of this cycle. */
  duration: number;
  /** Parameter defaults. Users can override them by name. */
  params?: Readonly<Record<string, number>>;
  /** Distance from the viewer to the box for 3D rotations, in box units. Default 2.5. */
  perspective?: number;
}

type NoPartFields = { [K in Exclude<keyof Part, 'duration'>]?: never };

/**
 * A spec is either one group of elements, written inline, or a list of `parts` drawn in order.
 * Element indices (and so `colors`) run across the parts.
 */
export type IndicatorSpec =
  | (SpecBase & Part & { parts?: never })
  | (SpecBase & NoPartFields & { parts: readonly Part[] });

/** The state of one element at one point in time. */
export interface ElementState {
  index: number;
  /** Index of the part the element belongs to; 0 for a spec without `parts`. */
  part: number;
  /** Element center, before translation. */
  cx: number;
  cy: number;
  width: number;
  height: number;
  /** Combined scale: `scale * scaleX` and `scale * scaleY`. */
  scaleX: number;
  scaleY: number;
  /** Element opacity times group opacity. */
  opacity: number;
  /** Rotation around the screen axis: the layout rotation (ring `orient`) plus the `rotate` track. */
  rotate: number;
  rotateX: number;
  rotateY: number;
  translateX: number;
  translateY: number;
  strokeStart: number;
  strokeEnd: number;
  /** Group transform around the box center, applied after the element transform. */
  groupScaleX: number;
  groupScaleY: number;
  groupRotate: number;
  groupTranslateX: number;
  groupTranslateY: number;
}
