import { cubicBezier } from '../easing.ts';
import type { BezierEasing } from '../types.ts';
import { PROGRESS_LABEL_WIDTH, progressLabelInside } from './resolve.ts';
import type {
  ProgressClipShape,
  ProgressColorRole,
  ProgressCommand,
  ProgressPaint,
  ProgressState,
  ProgressStrokeCap,
  ResolvedProgress,
} from './types.ts';

/** What to draw, in a box whose top-left corner is at `x`, `y` in the indicator's bounds. */
export interface ProgressDrawing {
  x: number;
  y: number;
  commands: ProgressCommand[];
}

const TAU = Math.PI * 2;
const TOP = -Math.PI / 2;
const EMPHASIZED: BezierEasing = [0.2, 0, 0, 1];
const STANDARD: BezierEasing = [0.4, 0, 0.2, 1];
const EASE_IN_OUT: BezierEasing = [0.65, 0, 0.35, 1];
/** Rings smaller than this draw `wavy` flat, because the wave would be unreadable. */
const MIN_WAVY_SIZE = 32;
const EPSILON = 1e-9;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** `x` modulo `m`, always in [0, m). */
const mod = (x: number, m: number) => x - Math.floor(x / m) * m;
/** Half-up rounding, the same on every platform. */
const round = (x: number) => Math.floor(x + 0.5);
/** Number of sampling steps for a length, safe against values a hair above a whole number. */
const steps = (x: number) => Math.ceil(x - EPSILON);
/** 1 at the center, easing to 0 at distance `width`. */
const bump = (d: number, width: number) => {
  const x = Math.abs(d) / width;
  return x >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * x);
};
const ease = (curve: BezierEasing, x: number) => cubicBezier(curve, x);
const solid = (color: ProgressColorRole, alpha = 1): ProgressPaint => ({ type: 'solid', color, alpha });

/** The percentage text of the labels. */
export function progressLabel(value: number): string {
  return `${round(clamp01(value) * 100)}%`;
}

/**
 * True when `p` moves even with a fixed value (waves, stripes, sheens, liquid), so the renderer keeps
 * drawing frames unless motion is reduced. With a state, a wave that has flattened out does not count.
 */
export function progressHasAmbientMotion(p: ResolvedProgress, s?: ProgressState): boolean {
  if (p.type === 'liquid' || p.variant === 'striped' || p.variant === 'shimmer') return true;
  return p.variant === 'wavy' && (s === undefined || s.wave > 0);
}

/**
 * The draw commands for `p` in a `width` x `height` box. Linear and border fill the box; bars keep a
 * 4:3 shape, battery 2:1 and the other types a square, centered in the box.
 */
export function progressCommands(p: ResolvedProgress, s: ProgressState, width: number, height: number): ProgressDrawing {
  const out: ProgressCommand[] = [];
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) return { x: 0, y: 0, commands: out };
  switch (p.type) {
    case 'linear':
      drawLinearAny(out, p, s, width, height);
      return { x: 0, y: 0, commands: out };
    case 'border':
      drawBorder(out, p, s, width, height);
      return { x: 0, y: 0, commands: out };
    case 'bars': {
      const w = Math.min(width, (height * 4) / 3);
      const h = (w * 3) / 4;
      drawBars(out, p, s, w, h);
      return { x: (width - w) / 2, y: (height - h) / 2, commands: out };
    }
    case 'battery': {
      const w = Math.min(width, height * 2);
      const h = w / 2;
      drawBattery(out, p, s, w, h);
      return { x: (width - w) / 2, y: (height - h) / 2, commands: out };
    }
    default: {
      const size = Math.min(width, height);
      if (p.type === 'circular') drawCircularAny(out, p, s, size);
      else if (p.type === 'pie') drawPie(out, p, s, size);
      else if (p.type === 'gauge') drawGauge(out, p, s, size);
      else if (p.type === 'liquid') drawLiquid(out, p, s, size);
      else drawGrid(out, p, s, size);
      return { x: (width - size) / 2, y: (height - size) / 2, commands: out };
    }
  }
}

// ---------- primitives ----------

function hLine(out: ProgressCommand[], x0: number, x1: number, y: number, lineWidth: number, cap: ProgressStrokeCap, paint: ProgressPaint) {
  if (x1 < x0) return;
  out.push({ op: 'line', x0, y0: y, x1, y1: y, lineWidth, cap, paint });
}

function arc(out: ProgressCommand[], cx: number, cy: number, r: number, start: number, end: number, lineWidth: number, cap: ProgressStrokeCap, paint: ProgressPaint) {
  if (end <= start || r <= 0) return;
  out.push({ op: 'arc', cx, cy, r, start, end, lineWidth, cap, paint });
}

function circle(out: ProgressCommand[], cx: number, cy: number, r: number, paint: ProgressPaint) {
  if (r <= 0) return;
  out.push({ op: 'circle', cx, cy, r, paint });
}

function rect(out: ProgressCommand[], x: number, y: number, width: number, height: number, radius: number, paint: ProgressPaint) {
  if (width <= 0 || height <= 0) return;
  out.push({ op: 'rect', x, y, width, height, radius: Math.max(0, Math.min(radius, width / 2, height / 2)), paint });
}

function rectClip(x: number, y: number, width: number, height: number, radius: number): ProgressClipShape {
  return { type: 'rect', x, y, width, height, radius: Math.max(0, Math.min(radius, width / 2, height / 2)) };
}

function text(out: ProgressCommand[], x: number, y: number, size: number, value: string, align: 'center' | 'right', paint: ProgressPaint) {
  out.push({ op: 'text', x, y, size, text: value, align, paint });
}

/** The label in the text color, and again in white where `fill` covers it. */
function invertedLabel(out: ProgressCommand[], value: string, x: number, y: number, size: number, fill: ProgressClipShape) {
  text(out, x, y, size, value, 'center', solid('label'));
  const inner: ProgressCommand[] = [];
  text(inner, x, y, size, value, 'center', solid('white'));
  out.push({ op: 'clip', shape: fill, commands: inner });
}

function wave(out: ProgressCommand[], x0: number, x1: number, y: number, amp: number, wavelength: number, phase: number, lineWidth: number, cap: ProgressStrokeCap, paint: ProgressPaint) {
  if (x1 < x0) return;
  const n = Math.max(1, steps((x1 - x0) / 2));
  const points: number[] = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    points.push(x, y + amp * Math.sin(((x - phase) / wavelength) * TAU));
  }
  out.push({ op: 'polyline', points, closed: false, lineWidth, cap, paint });
}

function wavyArc(out: ProgressCommand[], cx: number, cy: number, r: number, amp: number, waves: number, phase: number, start: number, end: number, lineWidth: number, cap: ProgressStrokeCap, paint: ProgressPaint) {
  if (end <= start) return;
  const n = Math.max(8, steps(((end - start) * r) / 1.5));
  const points: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = start + ((end - start) * i) / n;
    const rr = r + amp * Math.sin(waves * a - phase);
    points.push(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
  }
  out.push({ op: 'polyline', points, closed: false, lineWidth, cap, paint });
}

/** Active segments of the indeterminate linear indicator, as [start, end] fractions of the track. */
function linearSegments(u: number): [number, number][] {
  const head1 = ease(EMPHASIZED, clamp01(u / 0.55));
  const tail1 = ease(STANDARD, clamp01((u - 0.15) / 0.55));
  const head2 = ease(EMPHASIZED, clamp01((u - 0.5) / 0.42));
  const tail2 = ease(STANDARD, clamp01((u - 0.62) / 0.38));
  const segments: [number, number][] = [];
  if (head1 - tail1 > 0.002) segments.push([tail1, head1]);
  if (head2 - tail2 > 0.002) segments.push([tail2, head2]);
  // The second segment enters on the left while the first is still leaving on the right.
  if (segments.length === 2 && segments[1]![0] < segments[0]![0]) segments.reverse();
  return segments;
}

/** Arc of the indeterminate circular indicator, as [start, end] angles clockwise from the top. */
function circularArc(time: number): [number, number] {
  const cycle = 1.4;
  const k = Math.floor(time / cycle);
  const u = mod(time / cycle, 1);
  const head = ease(EASE_IN_OUT, clamp01(u / 0.5)) * 0.72;
  const tail = ease(EASE_IN_OUT, clamp01((u - 0.5) / 0.5)) * 0.72;
  const base = mod(k * 0.72 + time / 2.2, 1);
  return [(base + tail) * TAU, (base + head) * TAU + 0.12];
}

// ---------- linear ----------

function drawLinearAny(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, w: number, h: number) {
  const inside = progressLabelInside(p);
  const outside = p.showLabel && !inside;
  // A bar narrower than 20 next to the label is unreadable, so the label is left out instead.
  const labelFits = !outside || w - PROGRESS_LABEL_WIDTH >= 20;
  const barWidth = outside && labelFits ? w - PROGRESS_LABEL_WIDTH : w;
  switch (p.variant) {
    case 'segmented':
      drawLinearSegmented(out, p, s, barWidth, h);
      break;
    case 'striped':
      drawLinearStriped(out, p, s, barWidth, h);
      break;
    case 'shimmer':
      drawLinearShimmer(out, p, s, barWidth, h);
      break;
    case 'glow':
      drawLinearGlow(out, p, s, barWidth, h);
      break;
    case 'dots':
      drawLinearDots(out, p, s, barWidth, h);
      break;
    case 'steps':
      drawLinearSteps(out, p, s, barWidth, h);
      break;
    default:
      drawLinear(out, p, s, barWidth, h);
  }
  if (s.indeterminate || !p.showLabel || !labelFits) return;
  const label = progressLabel(s.value);
  if (outside) {
    text(out, w, h / 2, 12.5, label, 'right', solid('label'));
    return;
  }
  const t = p.thickness;
  const v = clamp01(s.value);
  const r = p.strokeCap === 'round' ? t / 2 : 0;
  const filled = p.variant === 'flat' ? (v > 0.0005 ? v * (w - 2 * r) + 2 * r : 0) : v * w;
  invertedLabel(out, label, w / 2, h / 2, round(Math.min(t * 0.6, 15)), rectClip(0, 0, filled, h, 0));
}

function drawLinear(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, w: number, h: number) {
  const t = p.thickness;
  const cap = p.strokeCap;
  const r = cap === 'round' ? t / 2 : 0;
  const cy = h / 2;
  const x0 = r;
  const x1 = w - r;
  const len = x1 - x0;
  const wavy = p.variant === 'wavy';
  const amp = wavy ? p.amplitude * s.wave : 0;
  const wavelength = p.wavelength;
  const phase = mod(s.time * p.waveSpeed, 1) * wavelength;
  const gap = p.trackGap + 2 * r;
  const color = solid('color');
  const track = solid('track');
  const active = (a: number, b: number) => {
    if (wavy && amp > 0.05) wave(out, x0 + a * len, x0 + b * len, cy, amp, wavelength, phase, t, cap, color);
    else hLine(out, x0 + a * len, x0 + b * len, cy, t, cap, color);
  };
  if (s.indeterminate) {
    let from = 0;
    for (const [a, b] of linearSegments(mod(s.indeterminateTime / 1.75, 1))) {
      const end = a * len - (from === 0 && a === 0 ? 0 : gap);
      if (end > from) hLine(out, x0 + from, x0 + end, cy, t, cap, track);
      from = b * len + gap;
      active(a, b);
    }
    if (from < len) hLine(out, x0 + from, x1, cy, t, cap, track);
    return;
  }
  const v = clamp01(s.value);
  let trackFrom = v > 0.0005 ? v * len + gap : 0;
  if (s.buffer > 0) {
    const b = Math.max(v, clamp01(s.buffer));
    if (b * len - trackFrom > 0.5) {
      hLine(out, x0 + trackFrom, x0 + b * len, cy, t, cap, solid('color', 0.5));
      trackFrom = b * len + gap;
    }
  }
  if (trackFrom < len) hLine(out, x0 + trackFrom, x1, cy, t, cap, track);
  if (p.stopIndicator && trackFrom < len - t) circle(out, x1, cy, Math.min(t, 4) / 2, color);
  if (v > 0.0005) active(0, v);
}

function drawLinearSegmented(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, w: number, h: number) {
  const n = p.segments;
  const t = p.thickness;
  const y = h / 2 - t / 2;
  const gap = Math.max(2, p.trackGap);
  const width = (w - gap * (n - 1)) / n;
  const radius = p.strokeCap === 'round' ? Math.min(t / 2, width / 2) : 0;
  const center = mod(s.indeterminateTime / 1.6, 1) * (n + 4) - 2;
  for (let i = 0; i < n; i++) {
    const x = i * (width + gap);
    rect(out, x, y, width, t, radius, solid('track'));
    let fill = 1;
    let alpha = 1;
    if (s.indeterminate) alpha = bump(i + 0.5 - center, 2.2);
    else fill = clamp01(clamp01(s.value) * n - i);
    if (fill <= 0.001 || alpha <= 0.01 || width <= 0) continue;
    const inner: ProgressCommand[] = [];
    rect(inner, x, y, width * fill, t, 0, solid('color', alpha));
    out.push({ op: 'clip', shape: rectClip(x, y, width, t, radius), commands: inner });
  }
}

function stripes(out: ProgressCommand[], to: number, y: number, t: number, spacing: number, offset: number, paint: ProgressPaint) {
  for (let x = -t - spacing * 2 + offset; x < to + t; x += spacing * 2) {
    out.push({ op: 'polygon', points: [x, y + t, x + spacing, y + t, x + spacing + t, y, x + t, y], paint });
  }
}

function drawLinearStriped(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, w: number, h: number) {
  const t = p.thickness;
  const y = h / 2 - t / 2;
  const radius = t / 2;
  const spacing = Math.max(6, t * 0.8);
  const offset = mod((s.indeterminate ? s.indeterminateTime : s.time) * 26, spacing * 2);
  rect(out, 0, y, w, t, radius, solid('track'));
  const inner: ProgressCommand[] = [];
  if (s.indeterminate) {
    stripes(inner, w, y, t, spacing, offset, solid('color', 0.85));
  } else {
    const filled = w * clamp01(s.value);
    if (filled > 0.5) {
      const fill: ProgressCommand[] = [];
      rect(fill, 0, y, filled, t, 0, solid('color'));
      stripes(fill, filled, y, t, spacing, offset, solid('white', 0.22));
      inner.push({ op: 'clip', shape: rectClip(0, y, filled, t, radius), commands: fill });
    }
  }
  if (inner.length > 0) out.push({ op: 'clip', shape: rectClip(0, y, w, t, radius), commands: inner });
}

function sheen(x: number, width: number, color: ProgressColorRole, peak: number): ProgressPaint {
  return {
    type: 'linear',
    x0: x,
    y0: 0,
    x1: x + width,
    y1: 0,
    stops: [
      { offset: 0, color, alpha: 0 },
      { offset: 0.5, color, alpha: peak },
      { offset: 1, color, alpha: 0 },
    ],
  };
}

function drawLinearShimmer(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, w: number, h: number) {
  const t = p.thickness;
  const y = h / 2 - t / 2;
  const radius = t / 2;
  rect(out, 0, y, w, t, radius, solid('track'));
  const inner: ProgressCommand[] = [];
  if (s.indeterminate) {
    const u = mod(s.indeterminateTime / 1.5, 1);
    const width = w * 0.45;
    const x = -width + ease(EASE_IN_OUT, u) * (w + width);
    rect(inner, x, y, width, t, 0, sheen(x, width, 'color', 1));
  } else {
    const filled = w * clamp01(s.value);
    if (filled > 0.5) {
      const fill: ProgressCommand[] = [];
      rect(fill, 0, y, filled, t, 0, solid('color'));
      const u = mod(s.time, 2.2) / 1.5;
      if (u < 1) {
        const width = Math.max(36, w * 0.22);
        const x = -width + u * (filled + width);
        rect(fill, x, y, width, t, 0, sheen(x, width, 'white', 0.5));
      }
      inner.push({ op: 'clip', shape: rectClip(0, y, filled, t, radius), commands: fill });
    }
  }
  if (inner.length > 0) out.push({ op: 'clip', shape: rectClip(0, y, w, t, radius), commands: inner });
}

function drawLinearGlow(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, w: number, h: number) {
  const t = p.thickness;
  const cy = h / 2;
  const cap = p.strokeCap;
  const r = cap === 'round' ? t / 2 : 0;
  const x0 = r + 2;
  const x1 = w - r - 2;
  const len = x1 - x0;
  hLine(out, x0, x1, cy, t, cap, solid('color', 0.14));
  const glow = (a: number, b: number) => {
    const head = x0 + b * len;
    hLine(out, x0 + a * len, head, cy, t + 8, cap, solid('color', 0.12));
    hLine(out, x0 + a * len, head, cy, t + 4, cap, solid('color', 0.22));
    hLine(out, x0 + a * len, head, cy, t, cap, solid('color'));
    const reach = t + 8;
    rect(out, head - reach, cy - reach, 2 * reach, 2 * reach, 0, {
      type: 'radial',
      cx: head,
      cy,
      r: reach,
      stops: [
        { offset: 0, color: 'color', alpha: 0.55 },
        { offset: 1, color: 'color', alpha: 0 },
      ],
    });
  };
  if (s.indeterminate) {
    for (const [a, b] of linearSegments(mod(s.indeterminateTime / 1.75, 1))) glow(a, b);
    return;
  }
  const v = clamp01(s.value);
  if (v > 0.0005) glow(0, v);
}

function drawLinearDots(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, w: number, h: number) {
  const n = p.segments;
  const d = Math.max(6, p.thickness * 2);
  const r = d / 2;
  const cy = h / 2 + r * 0.45;
  const spacing = (w - d) / Math.max(1, n - 1);
  const center = mod(s.indeterminateTime / 1.5, 1) * (n + 3) - 1.5;
  for (let i = 0; i < n; i++) {
    const x = r + i * spacing;
    circle(out, x, cy, r, solid('track'));
    if (s.indeterminate) {
      const k = bump(i - center, 1.6);
      if (k > 0) circle(out, x, cy - k * r * 0.9, r * (0.75 + 0.25 * k), solid('color', k));
    } else {
      const fill = clamp01(clamp01(s.value) * n - i);
      if (fill > 0) circle(out, x, cy, r * Math.sqrt(fill), solid('color'));
    }
  }
}

function drawLinearSteps(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, w: number, h: number) {
  const n = p.segments;
  const t = p.thickness;
  const R = Math.max(7, t * 1.75);
  const cy = h / 2;
  const gap = 3;
  const xs: number[] = [];
  for (let i = 0; i < n; i++) xs.push(R + (i * (w - 2 * R)) / (n - 1));
  const position = s.indeterminate ? -1 : clamp01(s.value) * (n - 1);
  const center = mod(s.indeterminateTime / 2.2, 1) * n - 0.5;
  for (let i = 0; i < n - 1; i++) {
    const a = xs[i]! + R + gap;
    const b = xs[i + 1]! - R - gap;
    hLine(out, a, b, cy, t, 'round', solid('track'));
    if (s.indeterminate) {
      const lo = clamp01(center - 0.3 - i);
      const hi = clamp01(center + 0.3 - i);
      if (hi > lo) hLine(out, a + (b - a) * lo, a + (b - a) * hi, cy, t, 'round', solid('color'));
    } else {
      const fill = clamp01(position - i);
      if (fill > 0) hLine(out, a, a + (b - a) * fill, cy, t, 'round', solid('color'));
    }
  }
  for (let i = 0; i < n; i++) {
    const x = xs[i]!;
    circle(out, x, cy, R, solid('track'));
    if (s.indeterminate) {
      const k = bump(i - center, 0.55);
      if (k > 0.01) circle(out, x, cy, R, solid('color', k));
      continue;
    }
    const done = clamp01((position - i + 0.12) / 0.12);
    if (done > 0) {
      circle(out, x, cy, R * (0.4 + 0.6 * done), solid('color'));
      if (done > 0.6) {
        out.push({
          op: 'polyline',
          points: [x - R * 0.38, cy + R * 0.02, x - R * 0.1, cy + R * 0.3, x + R * 0.4, cy - R * 0.28],
          closed: false,
          lineWidth: Math.max(1.5, R * 0.22),
          cap: 'round',
          paint: solid('white', (done - 0.6) / 0.4),
        });
      }
    } else if (position > i - 1) {
      arc(out, x, cy, R - 1, 0, TAU, 2, 'butt', solid('color'));
    }
  }
}

// ---------- circular family ----------

function labelSize(size: number): number {
  return Math.max(10, Math.min(size * 0.22, 44));
}

function drawCircularAny(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, size: number) {
  switch (p.variant) {
    case 'segmented':
      drawSegmentedArc(out, p, s, size / 2, size / 2, (size - p.thickness) / 2, TOP, TAU, true);
      break;
    case 'gradient':
      drawCircularGradient(out, p, s, size);
      break;
    case 'ticks':
      drawCircularTicks(out, p, s, size);
      break;
    case 'dots':
      drawCircularDots(out, p, s, size);
      break;
    default:
      drawCircular(out, p, s, size);
  }
  if (p.showLabel && !s.indeterminate) text(out, size / 2, size / 2, labelSize(size), progressLabel(s.value), 'center', solid('label'));
}

function drawCircular(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, size: number) {
  const t = p.thickness;
  const cap = p.strokeCap;
  const wavy = p.variant === 'wavy' && size >= MIN_WAVY_SIZE;
  const ampMax = wavy ? p.amplitude : 0;
  const amp = ampMax * s.wave;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - t) / 2 - ampMax;
  if (r <= 0) return;
  const gapAngle = (p.trackGap + (cap === 'round' ? t : 0)) / r;
  const waves = Math.max(3, round((TAU * r) / p.wavelength));
  const phase = mod(s.time * p.waveSpeed, 1) * TAU;
  const color = solid('color');
  const track = solid('track');
  const active = (start: number, end: number) => {
    if (wavy && amp > 0.05) wavyArc(out, cx, cy, r, amp, waves, phase, start, end, t, cap, color);
    else arc(out, cx, cy, r, start, end, t, cap, color);
  };
  if (s.indeterminate) {
    const [a0, a1] = circularArc(s.indeterminateTime);
    arc(out, cx, cy, r, TOP + a1 + gapAngle, TOP + a0 + TAU - gapAngle, t, cap, track);
    active(TOP + a0, TOP + a1);
    return;
  }
  const v = clamp01(s.value);
  if (v <= 0.0005) {
    arc(out, cx, cy, r, 0, TAU, t, 'butt', track);
    return;
  }
  const sweep = v * TAU;
  if (p.trackGap > 0 || v < 1) arc(out, cx, cy, r, TOP + sweep + gapAngle, TOP + TAU - gapAngle, t, cap, track);
  active(TOP, TOP + Math.max(sweep, 0.0001));
}

/** Segments spread over `sweep` from `start`; a full circle also gets a gap at the seam. */
function drawSegmentedArc(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, cx: number, cy: number, r: number, start: number, sweep: number, full: boolean) {
  if (r <= 0) return;
  const n = p.segments;
  const t = p.thickness;
  const cap = p.strokeCap;
  const gapAngle = (Math.max(2, p.trackGap) + (cap === 'round' ? t : 0)) / r;
  const segment = (sweep - gapAngle * (full ? n : n - 1)) / n;
  if (segment <= 0.01) return;
  const it = s.indeterminateTime;
  const center = full ? mod(it / 1.2, 1) * n : (0.5 - 0.5 * Math.cos(it * Math.PI)) * n;
  for (let i = 0; i < n; i++) {
    const a0 = start + i * (segment + gapAngle) + (full ? gapAngle / 2 : 0);
    arc(out, cx, cy, r, a0, a0 + segment, t, cap, solid('track'));
    if (s.indeterminate) {
      let d = i + 0.5 - center;
      if (full) {
        const m = mod(d, n);
        d = Math.min(m, n - m);
      }
      const k = bump(d, full ? n * 0.32 : 2);
      if (k > 0.01) arc(out, cx, cy, r, a0, a0 + segment, t, cap, solid('color', k));
    } else {
      const fill = clamp01(clamp01(s.value) * n - i);
      if (fill > 0.001) arc(out, cx, cy, r, a0, a0 + segment * fill, t, cap, solid('color'));
    }
  }
}

function drawCircularGradient(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, size: number) {
  const t = p.thickness;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - t) / 2 - 1;
  arc(out, cx, cy, r, 0, TAU, t, 'butt', solid('track'));
  let head: number;
  let tail: number;
  if (s.indeterminate) {
    const it = s.indeterminateTime;
    head = TOP + mod(it / 1.1, 1) * TAU;
    tail = head - (0.62 + 0.12 * Math.sin(it * 2.4)) * TAU;
  } else {
    const v = clamp01(s.value);
    if (v <= 0.0005) return;
    tail = TOP;
    head = TOP + v * TAU;
  }
  arc(out, cx, cy, r, tail, head, t, 'butt', {
    type: 'conic',
    cx,
    cy,
    start: tail,
    stops: [
      { offset: 0, color: 'color', alpha: s.indeterminate ? 0 : 0.12 },
      { offset: Math.min(1, (head - tail) / TAU), color: 'color', alpha: 1 },
    ],
  });
  const hx = cx + r * Math.cos(head);
  const hy = cy + r * Math.sin(head);
  circle(out, hx, hy, t * 1.25, {
    type: 'radial',
    cx: hx,
    cy: hy,
    r: t * 1.25,
    stops: [
      { offset: 0, color: 'color', alpha: 0.5 },
      { offset: 1, color: 'color', alpha: 0 },
    ],
  });
  circle(out, hx, hy, t / 2, solid('color'));
}

function drawCircularTicks(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, size: number) {
  const n = p.segments;
  const t = p.thickness;
  const outer = size / 2 - t / 2;
  const inner = outer * 0.52;
  const cx = size / 2;
  const cy = size / 2;
  const lead = mod(Math.floor(s.indeterminateTime * n), n);
  for (let i = 0; i < n; i++) {
    const a = TOP + (i * TAU) / n;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const tick = (paint: ProgressPaint) =>
      out.push({ op: 'line', x0: cx + inner * ca, y0: cy + inner * sa, x1: cx + outer * ca, y1: cy + outer * sa, lineWidth: t, cap: p.strokeCap, paint });
    if (s.indeterminate) {
      tick(solid('color', 1 - (mod(lead - i, n) / n) * 0.85));
      continue;
    }
    tick(solid('track'));
    const fill = clamp01(clamp01(s.value) * n - i);
    if (fill > 0) tick(solid('color', fill));
  }
}

function drawCircularDots(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, size: number) {
  const n = p.segments;
  const dr = Math.max(1.5, p.thickness * 0.75);
  const r = size / 2 - dr * 1.35;
  const cx = size / 2;
  const cy = size / 2;
  const center = mod(s.indeterminateTime / 1.1, 1) * n;
  for (let i = 0; i < n; i++) {
    const a = TOP + (i * TAU) / n;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    circle(out, x, y, dr, solid('track'));
    if (s.indeterminate) {
      const alpha = Math.max(0, 1 - mod(center - i, n) / (n * 0.6));
      if (alpha > 0) circle(out, x, y, dr * (0.7 + 0.35 * alpha), solid('color', alpha));
      continue;
    }
    const fill = clamp01(clamp01(s.value) * n - i);
    if (fill > 0) circle(out, x, y, dr * Math.sqrt(fill), solid('color'));
  }
}

function drawPie(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, size: number) {
  const t = Math.max(1, p.thickness * 0.6);
  const cx = size / 2;
  const cy = size / 2;
  const ring = (size - t) / 2;
  const inner = ring - t / 2 - Math.max(1, p.trackGap * 0.6);
  arc(out, cx, cy, ring, 0, TAU, t, 'butt', solid('color'));
  circle(out, cx, cy, inner, solid('track'));
  let start = TOP;
  let end: number;
  if (s.indeterminate) {
    const u = s.indeterminateTime / 1.2;
    start += mod(u, 1) * TAU;
    end = start + (0.12 + 0.2 * (0.5 - 0.5 * Math.cos(u * TAU))) * TAU;
  } else {
    end = start + clamp01(s.value) * TAU;
  }
  if (end - start < 0.0005 || inner <= 0) return;
  out.push({ op: 'sector', cx, cy, r: inner, start, end, paint: solid('color') });
}

function drawGauge(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, size: number) {
  const t = p.thickness;
  const cap = p.strokeCap;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - t) / 2;
  const sweep = p.sweepAngle;
  const start = Math.PI / 2 + (TAU - sweep) / 2;
  const end = start + sweep;
  if (r > 0) {
    const gapAngle = (p.trackGap + (cap === 'round' ? t : 0)) / r;
    if (p.variant === 'segmented') {
      drawSegmentedArc(out, p, s, cx, cy, r, start, sweep, false);
    } else if (s.indeterminate) {
      const length = 0.24 * sweep;
      const a = start + (0.5 - 0.5 * Math.cos(s.indeterminateTime * Math.PI)) * (sweep - length);
      arc(out, cx, cy, r, start, a - gapAngle, t, cap, solid('track'));
      arc(out, cx, cy, r, a + length + gapAngle, end, t, cap, solid('track'));
      arc(out, cx, cy, r, a, a + length, t, cap, solid('color'));
    } else {
      const v = clamp01(s.value);
      if (v <= 0.0005) {
        arc(out, cx, cy, r, start, end, t, cap, solid('track'));
      } else {
        arc(out, cx, cy, r, start + v * sweep + gapAngle, end, t, cap, solid('track'));
        arc(out, cx, cy, r, start, start + v * sweep, t, cap, solid('color'));
      }
    }
  }
  if (p.showLabel && !s.indeterminate) text(out, cx, cy, labelSize(size), progressLabel(s.value), 'center', solid('label'));
}

function liquidSurface(cx: number, cy: number, inner: number, level: number, amp: number, wavelength: number, phase: number): number[] {
  const y = cy + inner - level * 2 * inner;
  const left = cx - inner;
  const right = cx + inner + 2;
  const n = Math.max(1, steps((right - left) / 2));
  const points = [left, cy + inner + 1];
  for (let i = 0; i <= n; i++) {
    const x = left + ((right - left) * i) / n;
    points.push(x, y + amp * Math.sin((x / wavelength) * TAU + phase));
  }
  points.push(right, cy + inner + 1);
  return points;
}

function drawLiquid(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, size: number) {
  const ring = Math.max(1.5, p.thickness * 0.6);
  const cx = size / 2;
  const cy = size / 2;
  const R = (size - ring) / 2;
  const inner = R - ring / 2 - Math.max(1.5, p.trackGap * 0.6);
  arc(out, cx, cy, R, 0, TAU, ring, 'butt', solid('color'));
  if (inner <= 0) return;
  const level = s.indeterminate ? 0.5 + 0.14 * Math.sin(s.indeterminateTime * 1.8) : clamp01(s.value);
  const amp = inner * (s.indeterminate ? 0.09 : 0.07 * s.wave);
  const wavelength = inner * 1.35;
  const cycles = s.time * p.waveSpeed * 0.8;
  const front = liquidSurface(cx, cy, inner, level, amp, wavelength, mod(cycles, 1) * TAU);
  const back = liquidSurface(cx, cy, inner, level, amp * 0.8, wavelength, 2 - mod(cycles * 0.7, 1) * TAU);
  const content: ProgressCommand[] = [];
  rect(content, cx - inner, cy - inner, inner * 2, inner * 2, 0, solid('track'));
  content.push({ op: 'polygon', points: back, paint: solid('color', 0.45) });
  content.push({ op: 'polygon', points: front, paint: solid('color') });
  if (p.showLabel && !s.indeterminate) invertedLabel(content, progressLabel(s.value), cx, cy, labelSize(size), { type: 'polygon', points: front });
  out.push({ op: 'clip', shape: { type: 'circle', cx, cy, r: inner }, commands: content });
}

// ---------- border ----------

interface BorderPath {
  points: number[];
  /** Distance along the path to each point. */
  lengths: number[];
  total: number;
}

/** Rounded rectangle path starting at the top center, clockwise, sampled about every 2 units. */
function borderPath(w: number, h: number, inset: number, radius: number): BorderPath {
  const L = inset;
  const T = inset;
  const R = w - inset;
  const B = h - inset;
  const r = Math.max(0, Math.min(radius, (R - L) / 2, (B - T) / 2));
  const mx = (L + R) / 2;
  const points = [mx, T];
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    const n = Math.max(1, steps(Math.hypot(x1 - x0, y1 - y0) / 2));
    for (let i = 1; i <= n; i++) points.push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  };
  const corner = (cx: number, cy: number, a0: number) => {
    if (r <= 0) return;
    const n = Math.max(2, steps((r * Math.PI) / 4));
    for (let i = 1; i <= n; i++) {
      const a = a0 + (Math.PI / 2) * (i / n);
      points.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
  };
  line(mx, T, R - r, T);
  corner(R - r, T + r, -Math.PI / 2);
  line(R, T + r, R, B - r);
  corner(R - r, B - r, 0);
  line(R - r, B, L + r, B);
  corner(L + r, B - r, Math.PI / 2);
  line(L, B - r, L, T + r);
  corner(L + r, T + r, Math.PI);
  line(L + r, T, mx, T);
  const lengths = [0];
  for (let i = 2; i < points.length; i += 2) {
    lengths.push(lengths[lengths.length - 1]! + Math.hypot(points[i]! - points[i - 2]!, points[i + 1]! - points[i - 1]!));
  }
  return { points, lengths, total: lengths[lengths.length - 1]! };
}

/** Strokes the part of `path` from fraction `a` to fraction `b`; `b` above 1 wraps past the start. */
function strokeAlong(out: ProgressCommand[], path: BorderPath, a: number, b: number, lineWidth: number, cap: ProgressStrokeCap, paint: ProgressPaint) {
  if (b > 1) {
    strokeAlong(out, path, a, 1, lineWidth, cap, paint);
    strokeAlong(out, path, 0, b - 1, lineWidth, cap, paint);
    return;
  }
  const { points, lengths, total } = path;
  const from = a * total;
  const to = b * total;
  if (to - from < 0.3) return;
  const at = (d: number): [number, number, number] => {
    let i = 1;
    while (i < lengths.length - 1 && lengths[i]! < d) i++;
    const f = (d - lengths[i - 1]!) / Math.max(1e-6, lengths[i]! - lengths[i - 1]!);
    const x0 = points[2 * i - 2]!;
    const y0 = points[2 * i - 1]!;
    return [x0 + (points[2 * i]! - x0) * f, y0 + (points[2 * i + 1]! - y0) * f, i];
  };
  const [sx, sy, si] = at(from);
  const [ex, ey, ei] = at(to);
  const result = [sx, sy];
  for (let i = si; i < ei; i++) result.push(points[2 * i]!, points[2 * i + 1]!);
  result.push(ex, ey);
  out.push({ op: 'polyline', points: result, closed: false, lineWidth, cap, paint });
}

function drawBorder(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, w: number, h: number) {
  const t = p.thickness;
  if (w <= t || h <= t) return;
  const path = borderPath(w, h, t / 2, p.cornerRadius - t / 2);
  out.push({ op: 'polyline', points: path.points.slice(0, -2), closed: true, lineWidth: t, cap: 'butt', paint: solid('track') });
  if (s.indeterminate) {
    const [a0, a1] = circularArc(s.indeterminateTime);
    const from = mod(a0 / TAU, 1);
    strokeAlong(out, path, from, from + (a1 - a0) / TAU, t, p.strokeCap, solid('color'));
  } else {
    const v = clamp01(s.value);
    if (v > 0.0005) strokeAlong(out, path, 0, v, t, p.strokeCap, solid('color'));
  }
}

// ---------- bars, grid, battery ----------

function drawBars(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, w: number, h: number) {
  const n = p.segments;
  const gap = Math.max(3, p.trackGap);
  const width = (w - gap * (n - 1)) / n;
  if (width <= 0) return;
  const radius = p.strokeCap === 'round' ? Math.min(width * 0.3, 4) : 0;
  const center = mod(s.indeterminateTime / 1.4, 1) * (n + 3) - 1.5;
  for (let i = 0; i < n; i++) {
    const height = h * (0.25 + (0.75 * (i + 1)) / n);
    const x = i * (width + gap);
    const y = h - height;
    rect(out, x, y, width, height, radius, solid('track'));
    const fill = s.indeterminate ? bump(i + 0.5 - center, 1.6) : clamp01(clamp01(s.value) * n - i);
    if (fill <= 0.001) continue;
    const inner: ProgressCommand[] = [];
    rect(inner, x, h - height * fill, width, height * fill, 0, solid('color'));
    out.push({ op: 'clip', shape: rectClip(x, y, width, height, radius), commands: inner });
  }
}

/** Fill order of the grid cells: diagonal by diagonal from the top-left, top row first. */
export function progressGridOrder(columns: number): number[] {
  columns = Number.isFinite(columns) ? Math.max(0, Math.floor(columns)) : 0;
  const rank: number[] = new Array<number>(columns * columns).fill(0);
  let next = 0;
  for (let d = 0; d <= 2 * (columns - 1); d++) {
    for (let r = Math.max(0, d - columns + 1); r <= Math.min(d, columns - 1); r++) rank[r * columns + (d - r)] = next++;
  }
  return rank;
}

function drawGrid(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, size: number) {
  const k = p.segments;
  const gap = Math.max(2, p.trackGap * 0.75);
  const cell = (size - gap * (k - 1)) / k;
  if (cell <= 0) return;
  const radius = p.strokeCap === 'round' ? cell * 0.28 : cell * 0.08;
  const rank = progressGridOrder(k);
  const center = mod(s.indeterminateTime / 1.6, 1) * (2 * k + 1) - 1.5;
  for (let r = 0; r < k; r++) {
    for (let c = 0; c < k; c++) {
      const x = c * (cell + gap);
      const y = r * (cell + gap);
      rect(out, x, y, cell, cell, radius, solid('track'));
      const fill = s.indeterminate ? bump(r + c - center, 1.8) : clamp01(clamp01(s.value) * k * k - rank[r * k + c]!);
      if (fill <= 0.01) continue;
      const side = cell * (0.3 + 0.7 * fill);
      rect(out, x + (cell - side) / 2, y + (cell - side) / 2, side, side, (radius * side) / cell, solid('color', Math.min(1, fill * 1.6)));
    }
  }
}

const BOLT = [0.15, -1, -0.55, 0.12, -0.05, 0.12, -0.2, 1, 0.55, -0.15, 0.05, -0.15];

function drawBattery(out: ProgressCommand[], p: ResolvedProgress, s: ProgressState, w: number, h: number) {
  const border = Math.max(1.5, p.thickness * 0.5);
  const capWidth = Math.max(3, w * 0.07);
  const bodyWidth = w - capWidth - border * 0.5;
  const radius = h * 0.24;
  if (bodyWidth - border > 0 && h - border > 0) {
    out.push({
      op: 'strokeRect',
      x: border / 2,
      y: border / 2,
      width: bodyWidth - border,
      height: h - border,
      radius: Math.max(0, Math.min(radius, (bodyWidth - border) / 2, (h - border) / 2)),
      lineWidth: border,
      paint: solid('color', 0.7),
    });
  }
  rect(out, bodyWidth + border * 0.2, h * 0.34, w - bodyWidth - border * 0.2, h * 0.32, capWidth * 0.5, solid('color', 0.7));
  const pad = border + Math.max(1.5, p.trackGap * 0.5);
  const iw = bodyWidth - 2 * pad;
  const ih = h - 2 * pad;
  if (iw <= 0 || ih <= 0) return;
  const content: ProgressCommand[] = [];
  rect(content, pad, pad, iw, ih, 0, solid('track'));
  let filled: number;
  let alpha = 1;
  if (s.indeterminate) {
    const u = mod(s.indeterminateTime / 1.8, 1);
    filled = iw * ease(EASE_IN_OUT, clamp01(u / 0.8));
    if (u > 0.8) alpha = 1 - (u - 0.8) / 0.2;
  } else {
    filled = iw * clamp01(s.value);
  }
  rect(content, pad, pad, filled, ih, 0, solid('color', alpha));
  if (p.showLabel && !s.indeterminate) {
    invertedLabel(content, progressLabel(s.value), pad + iw / 2, pad + ih / 2, Math.max(10, Math.min(ih * 0.55, 30)), rectClip(pad, pad, filled, ih, 0));
  }
  out.push({ op: 'clip', shape: rectClip(pad, pad, iw, ih, Math.max(1, radius - pad * 0.7)), commands: content });
  if (s.indeterminate) {
    const bx = pad + iw / 2;
    const by = pad + ih / 2;
    const k = ih * 0.42;
    const points: number[] = [];
    for (let i = 0; i < BOLT.length; i += 2) points.push(bx + BOLT[i]! * k * 0.9, by + BOLT[i + 1]! * k);
    out.push({ op: 'polygon', points, paint: solid('white') });
    out.push({ op: 'polyline', points, closed: true, lineWidth: 1.2, cap: 'butt', paint: solid('color') });
  }
}
