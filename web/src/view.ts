import { InvalidIndicatorError } from '@loader-kit/spec';
import type { BuiltinIndicatorName, IndicatorSpec, Params, PreparedIndicator } from '@loader-kit/spec';
import { drawIndicator } from './draw.ts';
import { elementSurfaces, viewClocks } from './registry.ts';
import { Playback } from './playback.ts';
import { DEFAULT_INDICATOR, prepare } from './prepare.ts';

export interface LoaderKitOptions {
  /** Built-in indicator name. Ignored while `spec` is set. Default 'BallPulse'. */
  indicator?: BuiltinIndicatorName | (string & {});
  /** A custom spec, as an object or a JSON string. Wins over `indicator`. */
  spec?: IndicatorSpec | string | null;
  /** Param overrides by name, as an object or a JSON string. Names the spec does not declare are ignored. */
  params?: Params | string | null;
  /** Any CSS color. Default: the `color` CSS property of the host element (currentColor). */
  color?: string | null;
  /** Element i uses colors[i mod length]. Wins over `color` when non-empty. */
  colors?: readonly string[] | null;
  /** Playback rate, default 1. Zero, negative or non-finite values pause (SPEC section 8). */
  speed?: number;
  /** Default true. */
  animating?: boolean;
  /** Draw nothing while stopped. Default true. */
  hidesWhenStopped?: boolean;
  /** A frozen point of the animation cycle in [0, 1]; null follows the clock. */
  cycleProgress?: number | null;
  /** Show a still frame while `(prefers-reduced-motion: reduce)` matches. Default true. */
  respectsReduceMotion?: boolean;
  /** Called with the error message when the spec cannot be drawn, and with null when it recovers. */
  onError?: ((message: string | null) => void) | null;
}

type HostWindow = Window & typeof globalThis;

const REDUCE_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

/**
 * Draws a LoaderKit indicator into a `<canvas>` it creates inside `host` (or into `host` itself
 * when it is a canvas). The canvas fills the host, so give the host a size. Every property can be
 * set on its own and in any order; bad input never throws: it is reported to `onError` (or logged)
 * and the view draws nothing.
 *
 * Without `color`, every drawn frame uses the CSS `color` of the canvas. A view that is not
 * animating also redraws when the system color scheme changes or an attribute of `<html>` or
 * `<body>` changes, which is how themes usually switch.
 */
export class LoaderKitView {
  readonly canvas: HTMLCanvasElement;

  private readonly window: HostWindow;
  private readonly ownsCanvas: boolean;
  /** Only a canvas the page passed in may be pinned to its CSS size. */
  private readonly pinnable: boolean;
  private lastCssSize: [number, number] | null = null;
  private writtenSize: [number, number] | null = null;
  private readonly playback = new Playback();
  private readonly cleanups: (() => void)[] = [];
  private context: CanvasRenderingContext2D | null | undefined;
  private unwatchPixelRatio: (() => void) | null = null;

  private indicatorValue: string = DEFAULT_INDICATOR;
  private specValue: IndicatorSpec | string | null = null;
  private paramsValue: Params | string = {};
  private colorValue: string | null = null;
  private colorsValue: readonly string[] | null = null;
  private respectsReduceMotionValue = true;
  private onErrorValue: ((message: string | null) => void) | null = null;

  private prepared: PreparedIndicator | null = null;
  private error: string | null = null;
  private resolvedColor = '#000';
  private systemReducesMotion = false;
  private intersecting = true;
  private documentHidden = false;
  private frameId: number | null = null;
  private lastTimestamp: number | null = null;
  private destroyed = false;

  constructor(host: HTMLElement, options: LoaderKitOptions = {}) {
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
    this.pinnable = !this.ownsCanvas && !elementSurfaces.has(this.canvas);
    viewClocks.set(this, this.playback);

    if (options.indicator !== undefined) this.indicatorValue = options.indicator;
    if (options.spec !== undefined) this.specValue = options.spec;
    if (options.params !== undefined && options.params !== null) this.paramsValue = options.params;
    if (options.color !== undefined) this.colorValue = options.color;
    if (options.colors !== undefined) this.colorsValue = options.colors && [...options.colors];
    if (options.speed !== undefined) this.playback.speed = options.speed;
    if (options.animating !== undefined) this.playback.animating = options.animating;
    if (options.hidesWhenStopped !== undefined) this.playback.hidesWhenStopped = options.hidesWhenStopped;
    if (options.cycleProgress !== undefined) this.playback.cycleProgress = sanitizeCycleProgress(options.cycleProgress);
    if (options.respectsReduceMotion !== undefined) this.respectsReduceMotionValue = options.respectsReduceMotion;
    if (options.onError !== undefined) this.onErrorValue = options.onError;

    this.observe();
    this.measure();
    this.reload();
  }

  get indicator(): string {
    return this.indicatorValue;
  }

  set indicator(value: BuiltinIndicatorName | (string & {})) {
    const name = value ?? DEFAULT_INDICATOR;
    if (name === this.indicatorValue) return;
    this.indicatorValue = name;
    if (this.specValue === null) this.reload();
  }

  get spec(): IndicatorSpec | string | null {
    return this.specValue;
  }

  set spec(value: IndicatorSpec | string | null) {
    const spec = value ?? null;
    if (spec === this.specValue) return;
    this.specValue = spec;
    this.reload();
  }

  get params(): Params | string {
    return this.paramsValue;
  }

  set params(value: Params | string | null) {
    const params = value ?? {};
    if (sameParams(params, this.paramsValue)) return;
    this.paramsValue = typeof params === 'string' ? params : { ...params };
    this.reload();
  }

  get color(): string | null {
    return this.colorValue;
  }

  /** Null follows the CSS `color` of the host (see the class docs for when it is read). */
  set color(value: string | null) {
    this.colorValue = value ?? null;
    this.requestFrame();
  }

  get colors(): readonly string[] | null {
    return this.colorsValue;
  }

  set colors(value: readonly string[] | null) {
    this.colorsValue = value ? [...value] : null;
    this.requestFrame();
  }

  get speed(): number {
    return this.playback.speed;
  }

  set speed(value: number) {
    this.playback.speed = value;
    this.update();
  }

  get animating(): boolean {
    return this.playback.animating;
  }

  set animating(value: boolean) {
    this.playback.animating = value;
    this.update();
  }

  get hidesWhenStopped(): boolean {
    return this.playback.hidesWhenStopped;
  }

  set hidesWhenStopped(value: boolean) {
    this.playback.hidesWhenStopped = value;
    this.requestFrame();
  }

  get cycleProgress(): number | null {
    return this.playback.cycleProgress;
  }

  set cycleProgress(value: number | null) {
    this.playback.cycleProgress = sanitizeCycleProgress(value);
    this.update();
  }

  get respectsReduceMotion(): boolean {
    return this.respectsReduceMotionValue;
  }

  set respectsReduceMotion(value: boolean) {
    this.respectsReduceMotionValue = value;
    this.updateReduceMotion();
  }

  get onError(): ((message: string | null) => void) | null {
    return this.onErrorValue;
  }

  set onError(value: ((message: string | null) => void) | null) {
    this.onErrorValue = value ?? null;
  }

  /** The message of the last problem with the spec, indicator or params; null when it draws. */
  get specError(): string | null {
    return this.error;
  }

  /** Spec time currently drawn, in seconds. */
  get time(): number {
    return this.playback.displayTime(this.prepared);
  }

  start(): void {
    this.animating = true;
  }

  stop(): void {
    this.animating = false;
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

  private reload(): void {
    try {
      this.prepared = prepare({ indicator: this.indicatorValue, spec: this.specValue }, parseParams(this.paramsValue));
      this.report(null);
    } catch (error) {
      this.prepared = null;
      this.report(error instanceof Error ? error.message : String(error));
    }
    this.playback.restart();
    this.update();
  }

  private report(message: string | null): void {
    if (message === this.error) return;
    this.error = message;
    if (this.onErrorValue) this.onErrorValue(message);
    else if (message !== null) console.warn(`LoaderKit: ${message}`);
  }

  private get shouldRun(): boolean {
    return !this.destroyed && this.prepared !== null && this.playback.running && this.intersecting && !this.documentHidden;
  }

  /** Called after any playback change: the next frame starts or stops the loop. */
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
      if (this.lastTimestamp !== null) this.playback.advance((timestamp - this.lastTimestamp) / 1000);
      this.lastTimestamp = timestamp;
      this.render();
      this.requestFrame();
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
    if (this.prepared === null || !this.playback.visible) return;
    this.resolveColor();
    drawIndicator(ctx, this.prepared, this.time, { width, height, color: this.resolvedColor, colors: this.colorsValue });
  }

  private getContext(): CanvasRenderingContext2D | null {
    if (this.context === undefined) this.context = this.canvas.getContext('2d');
    return this.context;
  }

  /** Reading `color` is cheap while the styles are clean, so it is read on every drawn frame. */
  private resolveColor(): void {
    const css = this.colorValue ?? this.window.getComputedStyle?.(this.canvas).color;
    this.resolvedColor = css || '#000';
  }

  /** An idle view has no frame to pick up a new CSS color, so it redraws when it changed. */
  private refreshColor(): void {
    if (this.colorValue !== null || this.shouldRun) return;
    const previous = this.resolvedColor;
    this.resolveColor();
    if (this.resolvedColor !== previous) this.requestFrame();
  }

  private updateReduceMotion(): void {
    this.playback.reduceMotion = this.respectsReduceMotionValue && this.systemReducesMotion;
    this.update();
  }

  /**
   * Sizes the backing store in device pixels from the CSS size; the indicator is drawn in device
   * pixels too. A zero size (a hidden canvas) leaves the backing store as it is.
   */
  private resize(cssWidth: number, cssHeight: number, pixelWidth: number, pixelHeight: number): void {
    if (!(cssWidth > 0) || !(cssHeight > 0)) return;
    if (this.pinnable && this.followsBackingSize(cssWidth, cssHeight)) {
      const [width, height] = this.lastCssSize!;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      pixelWidth *= width / cssWidth;
      pixelHeight *= height / cssHeight;
      cssWidth = width;
      cssHeight = height;
    }
    this.lastCssSize = [cssWidth, cssHeight];
    const width = Math.round(pixelWidth);
    const height = Math.round(pixelHeight);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.writtenSize = [width, height];
    }
    this.requestFrame();
  }

  /**
   * A canvas without a CSS size takes its CSS size from its width and height attributes. When its
   * CSS size jumps to the backing size the view just wrote, it would grow on every resize, so the
   * caller pins it to the CSS size it had before.
   */
  private followsBackingSize(cssWidth: number, cssHeight: number): boolean {
    const { lastCssSize: last, writtenSize: written } = this;
    if (last === null || written === null) return false;
    if (this.canvas.style.width !== '' || this.canvas.style.height !== '') return false;
    const near = (a: number, b: number) => Math.abs(a - b) < 0.01;
    const unchanged = near(cssWidth, last[0]) && near(cssHeight, last[1]);
    return !unchanged && near(cssWidth, written[0]) && near(cssHeight, written[1]);
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
      this.playback.reduceMotion = this.respectsReduceMotionValue && this.systemReducesMotion;
      listen(reduceMotion, 'change', () => {
        this.systemReducesMotion = reduceMotion.matches;
        this.updateReduceMotion();
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

function sanitizeCycleProgress(value: number | null | undefined): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

function parseParams(params: Params | string): Params {
  if (typeof params !== 'string') return params;
  try {
    return JSON.parse(params) as Params;
  } catch (error) {
    throw new InvalidIndicatorError([`params is not valid JSON: ${(error as Error).message}`]);
  }
}

function sameParams(a: Params | string, b: Params | string): boolean {
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => Object.is(a[key], b[key]));
}
