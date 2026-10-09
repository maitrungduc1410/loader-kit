import { ProgressAnimator, progressCommands, progressHasAmbientMotion, resolveProgress } from '@loader-kit/spec';
import type { ProgressOptions, ResolvedProgress } from '@loader-kit/spec';
import { drawProgress } from './progress-draw.ts';

export interface LoaderKitProgressOptions extends ProgressOptions {
  /** Progress in [0, 1]; null, undefined or NaN shows the indeterminate animation. */
  value?: number | null;
  /** Buffer of linear `flat` and `wavy`, in [0, 1]. */
  buffer?: number | null;
  /** Move to a new value along a curve that follows the rhythm of the updates. Default true. */
  smooth?: boolean;
  /** Any CSS color. Default: the `color` CSS property of the canvas (currentColor). */
  color?: string | null;
  /** Any CSS color. Default: `color` at 24% opacity. */
  trackColor?: string | null;
  /** Any CSS color for the percentage. Default: the `color` CSS property of the canvas. */
  labelColor?: string | null;
  /** Jump to new values, stop ambient motion and slow the indeterminate animation while `(prefers-reduced-motion: reduce)` matches. Default true. */
  respectsReduceMotion?: boolean;
}

type HostWindow = Window & typeof globalThis;

const REDUCE_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

const GEOMETRY_KEYS = [
  'type',
  'variant',
  'thickness',
  'trackGap',
  'segments',
  'showLabel',
  'stopIndicator',
  'strokeCap',
  'amplitude',
  'wavelength',
  'waveSpeed',
  'sweepAngle',
  'cornerRadius',
  'speed',
] as const satisfies readonly (keyof ProgressOptions)[];

/**
 * Draws a LoaderKitProgress into a `<canvas>` it creates inside `host` (or into `host` itself when
 * it is a canvas). The canvas fills the host, so give the host a size; `progressIntrinsicSize`
 * gives the default one. Bad numbers never throw: they fall back to the defaults.
 *
 * Without `color` and `labelColor`, every drawn frame uses the CSS `color` of the canvas. The view
 * only runs a frame loop while something moves, and redraws when the system color scheme or an
 * attribute of `<html>` or `<body>` changes, which is how themes usually switch.
 */
export class LoaderKitProgressView {
  readonly canvas: HTMLCanvasElement;

  private readonly window: HostWindow;
  private readonly ownsCanvas: boolean;
  private readonly cleanups: (() => void)[] = [];
  private context: CanvasRenderingContext2D | null | undefined;
  private unwatchPixelRatio: (() => void) | null = null;

  private readonly options: ProgressOptions = {};
  private resolved: ResolvedProgress;
  private readonly animator: ProgressAnimator;
  private valueValue: number | null;
  private bufferValue: number | null;
  private smoothValue = true;
  private colorValue: string | null = null;
  private trackColorValue: string | null = null;
  private labelColorValue: string | null = null;
  private respectsReduceMotionValue = true;
  private resolvedColor = '#000';

  private cssSize: [number, number] = [0, 0];
  private systemReducesMotion = false;
  private intersecting = true;
  private documentHidden = false;
  private frameId: number | null = null;
  private lastTimestamp: number | null = null;
  private destroyed = false;

  constructor(host: HTMLElement, options: LoaderKitProgressOptions = {}) {
    this.window = (host.ownerDocument.defaultView ?? globalThis) as HostWindow;
    this.ownsCanvas = host.localName !== 'canvas';
    if (this.ownsCanvas) {
      this.canvas = host.ownerDocument.createElement('canvas');
      this.canvas.style.display = 'block';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      host.appendChild(this.canvas);
    } else {
      this.canvas = host as HTMLCanvasElement;
    }
    for (const key of GEOMETRY_KEYS) {
      const value = options[key];
      if (value !== undefined) (this.options as Record<string, unknown>)[key] = value;
    }
    this.resolved = resolveProgress(this.options);
    this.valueValue = sanitize(options.value);
    this.bufferValue = sanitize(options.buffer);
    this.animator = new ProgressAnimator(this.valueValue, this.bufferValue);
    if (options.smooth !== undefined) this.smoothValue = options.smooth;
    if (options.color !== undefined) this.colorValue = options.color || null;
    if (options.trackColor !== undefined) this.trackColorValue = options.trackColor || null;
    if (options.labelColor !== undefined) this.labelColorValue = options.labelColor || null;
    if (options.respectsReduceMotion !== undefined) this.respectsReduceMotionValue = options.respectsReduceMotion;

    this.observe();
    this.measure();
    this.requestFrame();
  }

  get value(): number | null {
    return this.valueValue;
  }

  set value(value: number | null) {
    this.valueValue = sanitize(value);
    this.animator.setValue(this.valueValue, this.now(), this.smoothValue && !this.reducesMotion);
    this.update();
  }

  get buffer(): number | null {
    return this.bufferValue;
  }

  set buffer(value: number | null) {
    this.bufferValue = sanitize(value);
    this.animator.setBuffer(this.bufferValue, this.now(), this.smoothValue && !this.reducesMotion);
    this.update();
  }

  get smooth(): boolean {
    return this.smoothValue;
  }

  set smooth(value: boolean) {
    this.smoothValue = value;
  }

  get color(): string | null {
    return this.colorValue;
  }

  set color(value: string | null) {
    this.colorValue = value || null;
    this.requestFrame();
  }

  get trackColor(): string | null {
    return this.trackColorValue;
  }

  set trackColor(value: string | null) {
    this.trackColorValue = value || null;
    this.requestFrame();
  }

  get labelColor(): string | null {
    return this.labelColorValue;
  }

  set labelColor(value: string | null) {
    this.labelColorValue = value || null;
    this.requestFrame();
  }

  get respectsReduceMotion(): boolean {
    return this.respectsReduceMotionValue;
  }

  set respectsReduceMotion(value: boolean) {
    this.respectsReduceMotionValue = value;
    this.update();
  }

  /** The options with every default applied. */
  get resolvedOptions(): ResolvedProgress {
    return this.resolved;
  }

  /** Sets drawing options; undefined or null resets one to its default. */
  configure(options: ProgressOptions): void {
    let changed = false;
    for (const key of GEOMETRY_KEYS) {
      if (!(key in options)) continue;
      const value = options[key];
      const store = this.options as Record<string, unknown>;
      if (value === undefined || value === null) {
        if (key in store) {
          delete store[key];
          changed = true;
        }
      } else if (!Object.is(store[key], value)) {
        store[key] = value;
        changed = true;
      }
    }
    if (!changed) return;
    this.resolved = resolveProgress(this.options);
    this.update();
  }

  /** Stops the frame loop, removes the observers and listeners, and the canvas it created. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.frameId !== null) this.cancelFrame(this.frameId);
    this.frameId = null;
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    if (this.ownsCanvas) this.canvas.remove();
    else this.getContext()?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private get reducesMotion(): boolean {
    return this.respectsReduceMotionValue && this.systemReducesMotion;
  }

  private get moving(): boolean {
    const p = this.resolved;
    return (
      this.animator.moving ||
      (this.animator.indeterminate && p.speed > 0 && Number.isFinite(p.speed)) ||
      (progressHasAmbientMotion(p, this.animator.state) && !this.reducesMotion)
    );
  }

  private get shouldRun(): boolean {
    return !this.destroyed && this.moving && this.intersecting && !this.documentHidden;
  }

  private now(): number {
    return this.window.performance.now() / 1000;
  }

  private update(): void {
    if (!this.shouldRun) this.lastTimestamp = null;
    this.requestFrame();
  }

  private requestFrame(): void {
    if (this.destroyed || this.frameId !== null) return;
    const win = this.window;
    this.frameId =
      typeof win.requestAnimationFrame === 'function'
        ? win.requestAnimationFrame(this.onFrame)
        : (win.setTimeout(() => this.onFrame(win.performance.now()), 16) as unknown as number);
  }

  private cancelFrame(id: number): void {
    const win = this.window;
    if (typeof win.cancelAnimationFrame === 'function') win.cancelAnimationFrame(id);
    else win.clearTimeout(id);
  }

  private readonly onFrame = (timestamp: number): void => {
    this.frameId = null;
    if (this.destroyed) return;
    if (this.shouldRun) {
      if (this.lastTimestamp !== null) {
        // A long pause (a background tab) should not fast-forward the animation.
        const dt = Math.min(0.1, (timestamp - this.lastTimestamp) / 1000);
        this.animator.step(dt, this.resolved.speed, this.reducesMotion);
      }
      this.lastTimestamp = timestamp;
      this.render();
      if (this.shouldRun) this.requestFrame();
      else this.lastTimestamp = null;
    } else {
      this.lastTimestamp = null;
      this.render();
    }
  };

  private render(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const { width, height } = this.canvas;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const [cssWidth, cssHeight] = this.cssSize;
    if (!(cssWidth > 0) || !(cssHeight > 0)) return;
    this.resolveColor();
    const drawing = progressCommands(this.resolved, this.animator.state, cssWidth, cssHeight);
    const color = this.colorValue ?? this.resolvedColor;
    drawProgress(ctx, drawing, { color, track: this.trackColorValue, label: this.labelColorValue ?? this.resolvedColor }, width / cssWidth);
  }

  private getContext(): CanvasRenderingContext2D | null {
    if (this.context === undefined) this.context = this.canvas.getContext('2d');
    return this.context;
  }

  private resolveColor(): void {
    this.resolvedColor = this.window.getComputedStyle?.(this.canvas).color || '#000';
  }

  /** An idle view has no frame to pick up a new CSS color, so it redraws when it changed. */
  private refreshColor(): void {
    if ((this.colorValue !== null && this.labelColorValue !== null) || this.shouldRun) return;
    const previous = this.resolvedColor;
    this.resolveColor();
    if (this.resolvedColor !== previous) this.requestFrame();
  }

  private resize(cssWidth: number, cssHeight: number, pixelWidth: number, pixelHeight: number): void {
    if (!(cssWidth > 0) || !(cssHeight > 0)) return;
    this.cssSize = [cssWidth, cssHeight];
    const width = Math.round(pixelWidth);
    const height = Math.round(pixelHeight);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.requestFrame();
  }

  private measure(): void {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = this.window.devicePixelRatio || 1;
    this.resize(rect.width, rect.height, rect.width * ratio, rect.height * ratio);
  }

  private observe(): void {
    const win = this.window;
    const listen = (target: EventTarget, type: string, listener: () => void) => {
      target.addEventListener(type, listener);
      this.cleanups.push(() => target.removeEventListener(type, listener));
    };

    if (typeof win.ResizeObserver === 'function') {
      const observer = new win.ResizeObserver((entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        const device = entry.devicePixelContentBoxSize?.[0];
        const ratio = win.devicePixelRatio || 1;
        if (device) this.resize(width, height, device.inlineSize, device.blockSize);
        else this.resize(width, height, width * ratio, height * ratio);
      });
      try {
        observer.observe(this.canvas, { box: 'device-pixel-content-box' });
      } catch {
        observer.observe(this.canvas);
      }
      this.cleanups.push(() => observer.disconnect());
    }

    if (typeof win.IntersectionObserver === 'function') {
      const observer = new win.IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        this.intersecting = entry.isIntersecting;
        this.update();
      });
      observer.observe(this.canvas);
      this.cleanups.push(() => observer.disconnect());
    }

    if (typeof win.matchMedia === 'function') {
      const reduceMotion = win.matchMedia(REDUCE_MOTION_QUERY);
      this.systemReducesMotion = reduceMotion.matches;
      listen(reduceMotion, 'change', () => {
        this.systemReducesMotion = reduceMotion.matches;
        this.update();
      });
      this.watchPixelRatio();
      this.cleanups.push(() => this.unwatchPixelRatio?.());
      listen(win.matchMedia(DARK_SCHEME_QUERY), 'change', () => this.refreshColor());
    }

    const doc = this.canvas.ownerDocument;
    if (typeof win.MutationObserver === 'function') {
      // Themes usually switch with a class or an attribute on <html> or <body>.
      const observer = new win.MutationObserver(() => this.refreshColor());
      for (const root of [doc.documentElement, doc.body]) if (root) observer.observe(root, { attributes: true });
      this.cleanups.push(() => observer.disconnect());
    }
    this.documentHidden = doc.visibilityState === 'hidden';
    listen(doc, 'visibilitychange', () => {
      this.documentHidden = doc.visibilityState === 'hidden';
      this.update();
    });
  }

  /** A `resolution` query matches one ratio only, so it is replaced on every change. */
  private watchPixelRatio(): void {
    const win = this.window;
    const query = win.matchMedia(`(resolution: ${win.devicePixelRatio || 1}dppx)`);
    const onChange = () => {
      query.removeEventListener('change', onChange);
      if (this.destroyed) return;
      this.measure();
      this.watchPixelRatio();
    };
    query.addEventListener('change', onChange);
    this.unwatchPixelRatio = () => query.removeEventListener('change', onChange);
  }
}

function sanitize(value: number | null | undefined): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}
