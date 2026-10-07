// happy-dom with a manual frame clock, controllable media queries and observers, and recording canvases.
import { Window } from 'happy-dom';
import { RecordingContext } from './recording-context.ts';

type Listener = () => void;

class FakeMediaQuery {
  readonly listeners = new Set<Listener>();
  readonly media: string;
  matches: boolean;

  constructor(media: string, matches: boolean) {
    this.media = media;
    this.matches = matches;
  }

  addEventListener(_type: string, listener: Listener): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: string, listener: Listener): void {
    this.listeners.delete(listener);
  }

  set(matches: boolean): void {
    this.matches = matches;
    for (const listener of [...this.listeners]) listener();
  }
}

export interface Environment {
  window: Window;
  document: Window['document'];
  /** Runs the pending frame callbacks after `ms` milliseconds. */
  tick(ms?: number): void;
  /** Lets time pass without frames, like a throttled tab. */
  wait(ms: number): void;
  pendingFrames(): number;
  setReduceMotion(matches: boolean): void;
  setMedia(media: string, matches: boolean): void;
  setPixelRatio(ratio: number): void;
  resize(element: unknown, width: number, height: number, device?: { width: number; height: number }): void;
  setIntersecting(element: unknown, intersecting: boolean): void;
  setDocumentHidden(hidden: boolean): void;
  contextOf(canvas: unknown): RecordingContext;
  /** Live observers and media query listeners. */
  observed(): number;
  close(): Promise<void>;
}

export function createEnvironment(): Environment {
  const window = new Window({ width: 800, height: 600 });
  const document = window.document;
  const win = window as unknown as Record<string, unknown>;
  const define = (name: string, value: unknown) =>
    Object.defineProperty(win, name, { value, configurable: true, writable: true });

  let now = 1000;
  let nextId = 1;
  const frames = new Map<number, (time: number) => void>();
  define('requestAnimationFrame', (callback: (time: number) => void) => {
    const id = nextId++;
    frames.set(id, callback);
    return id;
  });
  define('cancelAnimationFrame', (id: number) => frames.delete(id));

  const queries = new Map<string, FakeMediaQuery>();
  let reduceMotion = false;
  let ratio = 1;
  define('devicePixelRatio', 1);
  Object.defineProperty(win, 'devicePixelRatio', { get: () => ratio, configurable: true });
  const query = (media: string) => {
    let entry = queries.get(media);
    if (!entry) {
      entry = new FakeMediaQuery(media, matches(media));
      queries.set(media, entry);
    }
    return entry;
  };
  const matches = (media: string) =>
    media === '(prefers-reduced-motion: reduce)' ? reduceMotion : media === `(resolution: ${ratio}dppx)`;
  define('matchMedia', query);

  const resizeObservers = new Set<{ callback: (entries: unknown[]) => void; targets: Set<unknown> }>();
  define(
    'ResizeObserver',
    class {
      private readonly record: { callback: (entries: unknown[]) => void; targets: Set<unknown> };
      constructor(callback: (entries: unknown[]) => void) {
        this.record = { callback, targets: new Set() };
        resizeObservers.add(this.record);
      }
      observe(target: unknown) {
        this.record.targets.add(target);
      }
      disconnect() {
        resizeObservers.delete(this.record);
      }
    },
  );

  const intersectionObservers = new Set<{ callback: (entries: unknown[]) => void; targets: Set<unknown> }>();
  define(
    'IntersectionObserver',
    class {
      private readonly record: { callback: (entries: unknown[]) => void; targets: Set<unknown> };
      constructor(callback: (entries: unknown[]) => void) {
        this.record = { callback, targets: new Set() };
        intersectionObservers.add(this.record);
      }
      observe(target: unknown) {
        this.record.targets.add(target);
      }
      disconnect() {
        intersectionObservers.delete(this.record);
      }
    },
  );

  const contexts = new WeakMap<object, RecordingContext>();
  const contextOf = (canvas: object) => {
    let ctx = contexts.get(canvas);
    if (!ctx) {
      ctx = new RecordingContext();
      ctx.arcResolution = 32;
      contexts.set(canvas, ctx);
    }
    return ctx;
  };
  Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value(this: object, type: string) {
      return type === '2d' ? contextOf(this) : null;
    },
  });

  let hidden = false;
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });

  return {
    window,
    document,
    tick(ms = 16) {
      now += ms;
      const callbacks = [...frames.values()];
      frames.clear();
      for (const callback of callbacks) callback(now);
    },
    wait(ms) {
      now += ms;
    },
    pendingFrames: () => frames.size,
    setReduceMotion(value) {
      reduceMotion = value;
      query('(prefers-reduced-motion: reduce)').set(value);
    },
    setMedia(media, value) {
      query(media).set(value);
    },
    setPixelRatio(value) {
      const previous = query(`(resolution: ${ratio}dppx)`);
      ratio = value;
      previous.set(false);
    },
    resize(element, width, height, device) {
      for (const observer of resizeObservers) {
        if (!observer.targets.has(element)) continue;
        observer.callback([
          {
            target: element,
            contentRect: { width, height },
            devicePixelContentBoxSize: device ? [{ inlineSize: device.width, blockSize: device.height }] : undefined,
          },
        ]);
      }
    },
    setIntersecting(element, isIntersecting) {
      for (const observer of intersectionObservers) {
        if (observer.targets.has(element)) observer.callback([{ target: element, isIntersecting }]);
      }
    },
    setDocumentHidden(value) {
      hidden = value;
      document.dispatchEvent(new window.Event('visibilitychange'));
    },
    contextOf: (canvas) => contextOf(canvas as object),
    observed: () =>
      resizeObservers.size +
      intersectionObservers.size +
      [...queries.values()].reduce((sum, entry) => sum + entry.listeners.size, 0),
    close: () => window.happyDOM.close(),
  };
}
