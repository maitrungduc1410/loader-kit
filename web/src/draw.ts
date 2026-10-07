import { DEFAULT_PERSPECTIVE } from '@loader-kit/spec';
import type { ElementState, PreparedIndicator, ResolvedShape } from '@loader-kit/spec';
import { createMatrix, elementMatrix, isFiniteMatrix } from './matrix.ts';
import type { Matrix } from './matrix.ts';

export type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface DrawFrame {
  /** Left edge of the frame, default 0. */
  x?: number;
  /** Top edge of the frame, default 0. */
  y?: number;
  width: number;
  height: number;
  /** Any CSS color, for every element unless `colors` is non-empty. */
  color: string;
  /** Element i uses colors[i mod length]. */
  colors?: readonly string[] | null;
}

const FULL_TURN = 2 * Math.PI;

/** Sweeps this close to a full turn are drawn as closed shapes, without a seam. */
const FULL_TURN_EPSILON = 1e-9;

/** Largest distance, in device pixels, between a projected curve and its polygon. */
const CURVE_TOLERANCE = 0.2;

/** Points this close to the viewer plane, or behind it, cannot be projected. */
const MIN_W = 1e-6;

/** Receives a shape outline in element units, relative to the element center. */
interface PathSink {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  /** Elliptical arc with the parametric angle: the point at `a` is `(cx + rx·cos a, cy + ry·sin a)`. */
  arc(cx: number, cy: number, rx: number, ry: number, start: number, sweep: number): void;
  close(): void;
}

/** Hands the outline to the context, which already holds the element's affine matrix. */
class AffineSink implements PathSink {
  ctx!: Context2D;

  moveTo(x: number, y: number): void {
    this.ctx.moveTo(x, y);
  }

  lineTo(x: number, y: number): void {
    this.ctx.lineTo(x, y);
  }

  arc(cx: number, cy: number, rx: number, ry: number, start: number, sweep: number): void {
    this.ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, start, start + sweep, sweep < 0);
  }

  close(): void {
    this.ctx.closePath();
  }
}

/**
 * Projects every outline point through the element's perspective matrix, since a perspective
 * is not affine and the context cannot apply it. Curves become polygons whose step follows
 * their radius on screen.
 */
class ProjectedSink implements PathSink {
  ctx!: Context2D;
  m!: Matrix;
  /** Device pixels per frame unit. */
  deviceScale = 1;
  /** False once a point cannot be projected; the element is then skipped. */
  valid = true;
  private started = false;

  begin(): void {
    this.valid = true;
    this.started = false;
  }

  moveTo(x: number, y: number): void {
    this.point(x, y, true);
  }

  lineTo(x: number, y: number): void {
    this.point(x, y, false);
  }

  arc(cx: number, cy: number, rx: number, ry: number, start: number, sweep: number): void {
    const steps = this.steps(cx, cy, Math.abs(rx), Math.abs(ry), Math.abs(sweep));
    for (let i = 0; i <= steps; i++) {
      const angle = start + (sweep * i) / steps;
      this.point(cx + rx * Math.cos(angle), cy + ry * Math.sin(angle), false);
    }
  }

  close(): void {
    this.ctx.closePath();
    this.started = false;
  }

  private point(x: number, y: number, move: boolean): void {
    const m = this.m;
    const w = m[6]! * x + m[7]! * y + 1;
    if (!(w > MIN_W)) {
      this.valid = false;
      return;
    }
    const px = (m[0]! * x + m[1]! * y + m[2]!) / w;
    const py = (m[3]! * x + m[4]! * y + m[5]!) / w;
    if (move || !this.started) this.ctx.moveTo(px, py);
    else this.ctx.lineTo(px, py);
    this.started = true;
  }

  /** Polygon steps for an arc, from the largest distance on screen between its center and the ellipse. */
  private steps(cx: number, cy: number, rx: number, ry: number, sweep: number): number {
    const m = this.m;
    const project = (x: number, y: number): [number, number] => {
      const w = m[6]! * x + m[7]! * y + 1;
      return [(m[0]! * x + m[1]! * y + m[2]!) / w, (m[3]! * x + m[4]! * y + m[5]!) / w];
    };
    const [ox, oy] = project(cx, cy);
    let radius = 0;
    for (const [x, y] of [
      [cx + rx, cy],
      [cx - rx, cy],
      [cx, cy + ry],
      [cx, cy - ry],
    ] as const) {
      const [px, py] = project(x, y);
      radius = Math.max(radius, Math.hypot(px - ox, py - oy));
    }
    // Margin for the uneven curvature of a projected ellipse.
    radius *= 1.5 * this.deviceScale;
    const minimum = Math.ceil(sweep / (Math.PI / 4));
    if (!(radius > CURVE_TOLERANCE)) return Math.max(1, minimum);
    const step = 2 * Math.acos(1 - CURVE_TOLERANCE / radius);
    return Math.min(4096, Math.max(1, minimum, Math.ceil(sweep / step)));
  }
}

const matrix = createMatrix();
const affine = new AffineSink();
const projected = new ProjectedSink();

/**
 * Draws one frame of `prepared` at spec time `t` into the rectangle (x, y, width, height) of
 * `ctx`, in the context's current units. The indicator box is the largest centered square of the
 * rectangle (SPEC section 1). Does not clear. Pure: no DOM access, usable with OffscreenCanvas.
 */
export function drawIndicator(ctx: Context2D, prepared: PreparedIndicator, t: number, frame: DrawFrame): void {
  const { width, height } = frame;
  const side = Math.min(width, height);
  if (!(side > 0) || !Number.isFinite(side)) return;
  const left = (frame.x ?? 0) + (width - side) / 2;
  const top = (frame.y ?? 0) + (height - side) / 2;
  const palette = frame.colors && frame.colors.length > 0 ? frame.colors : null;
  const perspective = prepared.spec.perspective ?? DEFAULT_PERSPECTIVE;

  ctx.save();
  const baseAlpha = ctx.globalAlpha;
  ctx.lineCap = 'butt';
  affine.ctx = ctx;
  projected.ctx = ctx;
  projected.deviceScale = deviceScale(ctx);
  let lastColor: string | null = null;

  for (const state of prepared.evaluate(t)) {
    const opacity = Math.min(1, Math.max(0, state.opacity));
    if (!(opacity > 0)) continue;
    elementMatrix(state, perspective, left, top, side, matrix);
    if (!isFiniteMatrix(matrix)) continue;

    const color = palette ? palette[state.index % palette.length]! : frame.color;
    if (color !== lastColor) {
      // A color the canvas cannot parse is ignored, so reset first: such elements draw black.
      ctx.fillStyle = '#000';
      ctx.strokeStyle = '#000';
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      lastColor = color;
    }
    ctx.globalAlpha = baseAlpha * opacity;

    const shape = prepared.parts[state.part]!.shape;
    const w = state.width * side;
    const h = state.height * side;
    if (matrix[6] === 0 && matrix[7] === 0) {
      ctx.save();
      ctx.transform(matrix[0]!, matrix[3]!, matrix[1]!, matrix[4]!, matrix[2]!, matrix[5]!);
      drawShape(ctx, affine, shape, state, w, h, false);
      ctx.restore();
    } else {
      projected.m = matrix;
      drawShape(ctx, projected, shape, state, w, h, true);
    }
  }
  ctx.restore();
}

function drawShape(
  ctx: Context2D,
  sink: PathSink,
  shape: ResolvedShape,
  state: ElementState,
  w: number,
  h: number,
  project: boolean,
): void {
  if (shape.type === 'ring') {
    drawRing(ctx, sink, shape, state, Math.min(w, h), project);
    return;
  }
  if (!(w > 0) || !(h > 0)) return;
  const halfW = w / 2;
  const halfH = h / 2;
  const shorter = Math.min(w, h);
  ctx.beginPath();
  if (project) projected.begin();
  switch (shape.type) {
    case 'circle': {
      const sweep = clampSweep(shape.sweep);
      if (!(sweep > 0)) return;
      sink.arc(0, 0, halfW, halfH, shape.startAngle, sweep >= FULL_TURN - FULL_TURN_EPSILON ? FULL_TURN : sweep);
      sink.close();
      break;
    }
    case 'rect':
      roundedRect(sink, halfW, halfH, Math.min(shorter / 2, Math.max(0, shape.cornerRadius * shorter) || 0));
      break;
    case 'line':
      roundedRect(sink, halfW, halfH, shorter / 2);
      break;
    case 'triangle':
      sink.moveTo(0, -halfH);
      sink.lineTo(halfW, halfH);
      sink.lineTo(-halfW, halfH);
      sink.close();
      break;
  }
  if (!project || projected.valid) ctx.fill();
}

/** SPEC section 4: arc k is drawn from `a_k + s·sweep` to `a_k + e·sweep`, nothing when `e <= s`. */
function drawRing(
  ctx: Context2D,
  sink: PathSink,
  shape: Extract<ResolvedShape, { type: 'ring' }>,
  state: ElementState,
  shorter: number,
  project: boolean,
): void {
  const start = Math.min(1, Math.max(0, state.strokeStart));
  const end = Math.min(1, Math.max(0, state.strokeEnd));
  if (!(end > start)) return;
  const stroke = shape.strokeWidth * shorter;
  // SPEC section 9: nothing for a stroke that is not positive or leaves no room for the circle.
  if (!(stroke > 0) || !(stroke < shorter)) return;
  const radius = (shorter - stroke) / 2;
  const arc = clampSweep(shape.sweep);
  const sweep = arc * (end - start);
  if (!(sweep > 0)) return;
  const full = sweep >= FULL_TURN - FULL_TURN_EPSILON;
  const segments = full ? 1 : shape.segments;
  if (!project) ctx.lineWidth = stroke;

  for (let k = 0; k < segments; k++) {
    const from = shape.startAngle + (k * FULL_TURN) / shape.segments + start * arc;
    ctx.beginPath();
    if (!project) {
      ctx.arc(0, 0, radius, from, from + (full ? FULL_TURN : sweep));
      if (full) ctx.closePath();
      ctx.stroke();
      continue;
    }
    // The stroke outline: the outer edge, then the inner edge backwards. An inner radius below 0
    // (a stroke wider than the radius) is the arc on the other side of the center, as a stroke draws it.
    const outer = shorter / 2;
    const inner = radius - stroke / 2;
    projected.begin();
    if (full) {
      sink.arc(0, 0, outer, outer, from, FULL_TURN);
      sink.close();
      if (inner > 0) {
        sink.arc(0, 0, inner, inner, from + FULL_TURN, -FULL_TURN);
        sink.close();
      }
    } else {
      sink.arc(0, 0, outer, outer, from, sweep);
      sink.arc(0, 0, inner, inner, from + sweep, -sweep);
      sink.close();
    }
    if (projected.valid) ctx.fill();
  }
}

function roundedRect(sink: PathSink, halfW: number, halfH: number, r: number): void {
  const quarter = Math.PI / 2;
  if (!(r > 0)) {
    sink.moveTo(-halfW, -halfH);
    sink.lineTo(halfW, -halfH);
    sink.lineTo(halfW, halfH);
    sink.lineTo(-halfW, halfH);
    sink.close();
    return;
  }
  sink.moveTo(-halfW + r, -halfH);
  sink.arc(halfW - r, -halfH + r, r, r, -quarter, quarter);
  sink.arc(halfW - r, halfH - r, r, r, 0, quarter);
  sink.arc(-halfW + r, halfH - r, r, r, quarter, quarter);
  sink.arc(-halfW + r, -halfH + r, r, r, Math.PI, quarter);
  sink.close();
}

/** Renderers clamp a sweep to [0, 2π] (SPEC section 9); NaN draws nothing. */
function clampSweep(sweep: number): number {
  return Math.min(FULL_TURN, Math.max(0, sweep));
}

/** Device pixels per context unit, from the context's current transform when it exposes one. */
function deviceScale(ctx: Context2D): number {
  if (typeof ctx.getTransform !== 'function') return 1;
  const { a, b, c, d } = ctx.getTransform();
  const scale = Math.max(Math.hypot(a, b), Math.hypot(c, d));
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}
