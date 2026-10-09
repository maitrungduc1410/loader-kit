import type { ProgressClipShape, ProgressColorRole, ProgressCommand, ProgressDrawing, ProgressPaint } from '@loader-kit/spec';
import type { Context2D } from './draw.ts';

/** CSS colors of the color roles. */
export interface ProgressColors {
  color: string;
  /** Null draws the track in `color` at 24% opacity. */
  track: string | null;
  label: string;
}

/** Opacity of the track when no track color is set. */
export const DEFAULT_TRACK_ALPHA = 0.24;

const FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

type Rgba = [number, number, number, number];

const parsed = new Map<string, Rgba>();
let probe: Context2D | null | undefined;

/** Turns any CSS color the canvas understands into sRGB components, so stops can take an alpha. */
function rgba(ctx: Context2D, css: string): Rgba {
  const cached = parsed.get(css);
  if (cached) return cached;
  let result: Rgba = [0, 0, 0, 1];
  const previous = ctx.fillStyle;
  ctx.fillStyle = '#000';
  ctx.fillStyle = css;
  const normalized = String(ctx.fillStyle);
  ctx.fillStyle = previous;
  const hex = /^#([0-9a-f]{6})$/i.exec(normalized);
  const fn = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(normalized);
  if (hex) {
    const n = Number.parseInt(hex[1]!, 16);
    result = [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  } else if (fn) {
    result = [Number(fn[1]), Number(fn[2]), Number(fn[3]), fn[4] === undefined ? 1 : Number(fn[4])];
  } else {
    result = readPixel(css) ?? result;
  }
  if (parsed.size > 64) parsed.clear();
  parsed.set(css, result);
  return result;
}

/** Wide-gamut and other colors the canvas serializes as they are: draw one pixel and read it back. */
function readPixel(css: string): Rgba | null {
  if (probe === undefined) {
    const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(1, 1) : globalThis.document?.createElement('canvas');
    if (canvas) {
      canvas.width = 1;
      canvas.height = 1;
    }
    probe = (canvas?.getContext('2d', { willReadFrequently: true }) as Context2D | null | undefined) ?? null;
  }
  if (!probe) return null;
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = css;
  probe.fillRect(0, 0, 1, 1);
  const data = probe.getImageData(0, 0, 1, 1).data;
  return [data[0]!, data[1]!, data[2]!, data[3]! / 255];
}

class Painter {
  private readonly ctx: Context2D;
  private readonly colors: ProgressColors;

  constructor(ctx: Context2D, colors: ProgressColors) {
    this.ctx = ctx;
    this.colors = colors;
  }

  private role(role: ProgressColorRole, alpha: number): string {
    let css: string;
    let factor = alpha;
    switch (role) {
      case 'color':
        css = this.colors.color;
        break;
      case 'track':
        css = this.colors.track ?? this.colors.color;
        if (this.colors.track === null) factor *= DEFAULT_TRACK_ALPHA;
        break;
      case 'label':
        css = this.colors.label;
        break;
      default:
        return `rgba(255, 255, 255, ${alpha})`;
    }
    if (factor >= 1) return css;
    const [r, g, b, a] = rgba(this.ctx, css);
    return `rgba(${r}, ${g}, ${b}, ${a * factor})`;
  }

  style(paint: ProgressPaint): string | CanvasGradient {
    const ctx = this.ctx;
    if (paint.type === 'solid') return this.role(paint.color, paint.alpha);
    if (paint.type === 'conic' && typeof ctx.createConicGradient !== 'function') {
      const last = paint.stops[paint.stops.length - 1];
      return last ? this.role(last.color, last.alpha) : 'transparent';
    }
    const gradient =
      paint.type === 'linear'
        ? ctx.createLinearGradient(paint.x0, paint.y0, paint.x1, paint.y1)
        : paint.type === 'radial'
          ? ctx.createRadialGradient(paint.cx, paint.cy, 0, paint.cx, paint.cy, paint.r)
          : ctx.createConicGradient(paint.start, paint.cx, paint.cy);
    for (const stop of paint.stops) gradient.addColorStop(Math.min(1, Math.max(0, stop.offset)), this.role(stop.color, stop.alpha));
    return gradient;
  }

  draw(commands: readonly ProgressCommand[]): void {
    const ctx = this.ctx;
    for (const command of commands) {
      switch (command.op) {
        case 'line':
          ctx.beginPath();
          ctx.moveTo(command.x0, command.y0);
          ctx.lineTo(command.x1, command.y1);
          this.stroke(command.lineWidth, command.cap, command.paint);
          break;
        case 'arc':
          ctx.beginPath();
          ctx.arc(command.cx, command.cy, command.r, command.start, command.end);
          this.stroke(command.lineWidth, command.cap, command.paint);
          break;
        case 'polyline':
          ctx.beginPath();
          polygonPath(ctx, command.points);
          if (command.closed) ctx.closePath();
          this.stroke(command.lineWidth, command.cap, command.paint);
          break;
        case 'circle':
          ctx.beginPath();
          ctx.arc(command.cx, command.cy, command.r, 0, Math.PI * 2);
          this.fill(command.paint);
          break;
        case 'rect':
          ctx.beginPath();
          roundRectPath(ctx, command.x, command.y, command.width, command.height, command.radius);
          this.fill(command.paint);
          break;
        case 'strokeRect':
          ctx.beginPath();
          roundRectPath(ctx, command.x, command.y, command.width, command.height, command.radius);
          this.stroke(command.lineWidth, 'butt', command.paint);
          break;
        case 'polygon':
          ctx.beginPath();
          polygonPath(ctx, command.points);
          ctx.closePath();
          this.fill(command.paint);
          break;
        case 'sector':
          ctx.beginPath();
          ctx.moveTo(command.cx, command.cy);
          ctx.arc(command.cx, command.cy, command.r, command.start, command.end);
          ctx.closePath();
          this.fill(command.paint);
          break;
        case 'text':
          ctx.font = `600 ${command.size}px ${FONT_FAMILY}`;
          ctx.textAlign = command.align;
          ctx.textBaseline = 'middle';
          ctx.fillStyle = this.style(command.paint);
          ctx.fillText(command.text, command.x, command.y);
          break;
        case 'clip':
          ctx.save();
          ctx.beginPath();
          clipPath(ctx, command.shape);
          ctx.clip();
          this.draw(command.commands);
          ctx.restore();
          break;
      }
    }
  }

  private stroke(lineWidth: number, cap: CanvasLineCap, paint: ProgressPaint): void {
    const ctx = this.ctx;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = cap;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.style(paint);
    ctx.stroke();
  }

  private fill(paint: ProgressPaint): void {
    this.ctx.fillStyle = this.style(paint);
    this.ctx.fill();
  }
}

function polygonPath(ctx: Context2D, points: readonly number[]): void {
  for (let i = 0; i + 1 < points.length; i += 2) {
    if (i === 0) ctx.moveTo(points[0]!, points[1]!);
    else ctx.lineTo(points[i]!, points[i + 1]!);
  }
}

function roundRectPath(ctx: Context2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function clipPath(ctx: Context2D, shape: ProgressClipShape): void {
  switch (shape.type) {
    case 'rect':
      roundRectPath(ctx, shape.x, shape.y, shape.width, shape.height, shape.radius);
      break;
    case 'circle':
      ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
      break;
    case 'polygon':
      polygonPath(ctx, shape.points);
      ctx.closePath();
      break;
  }
}

/** Draws `drawing` with `scale` canvas pixels per unit. */
export function drawProgress(ctx: Context2D, drawing: ProgressDrawing, colors: ProgressColors, scale: number): void {
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, drawing.x * scale, drawing.y * scale);
  new Painter(ctx, colors).draw(drawing.commands);
  ctx.restore();
}
