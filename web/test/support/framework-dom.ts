// The test DOM of dom.ts installed as globals, for framework runtimes that read `window` and `document`.
import { createEnvironment, type Environment } from './dom.ts';

const GLOBALS = [
  'window',
  'document',
  'navigator',
  'Node',
  'Element',
  'HTMLElement',
  'HTMLCanvasElement',
  'HTMLMediaElement',
  'HTMLTemplateElement',
  'SVGElement',
  'Text',
  'Comment',
  'DocumentFragment',
  'Event',
  'CustomEvent',
  'MutationObserver',
  'customElements',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'matchMedia',
  'ResizeObserver',
  'IntersectionObserver',
] as const;

export interface FrameworkEnvironment extends Environment {
  container(): HTMLElement;
  /** The `<loader-kit>` elements in the document. */
  elements(): LoaderKitTestElement[];
  /** Paints of the next frame on `element`'s canvas. */
  paints(element: LoaderKitTestElement): unknown[];
}

export interface LoaderKitTestElement extends HTMLElement {
  indicator: string;
  spec: unknown;
  params: unknown;
  color: string | null;
  colors: readonly string[] | null;
  speed: number;
  animating: boolean;
  hidesWhenStopped: boolean;
  cycleProgress: number | null;
  respectsReduceMotion: boolean;
  readonly specError: string | null;
  readonly time: number;
}

export function installFrameworkDom(): FrameworkEnvironment {
  const env = createEnvironment();
  const globals = globalThis as Record<string, unknown>;
  const source = env.window as unknown as Record<string, unknown>;
  for (const name of GLOBALS) {
    const value = name === 'window' ? env.window : source[name];
    Object.defineProperty(globals, name, { value, configurable: true, writable: true });
  }
  const canvasOf = (element: LoaderKitTestElement) => element.shadowRoot!.querySelector('canvas')!;
  return {
    ...env,
    container() {
      const node = env.document.createElement('div');
      env.document.body.appendChild(node);
      return node as unknown as HTMLElement;
    },
    elements: () => [...env.document.querySelectorAll('loader-kit')] as unknown as LoaderKitTestElement[],
    paints(element) {
      const canvas = canvasOf(element);
      env.resize(canvas, 40, 40);
      const ctx = env.contextOf(canvas);
      ctx.paints.length = 0;
      env.tick();
      return [...ctx.paints];
    },
  };
}
