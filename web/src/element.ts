import type { IndicatorSpec, Params } from '@loader-kit/spec';
import { elementSurfaces, viewClocks } from './registry.ts';
import { DEFAULT_INDICATOR } from './prepare.ts';
import { LoaderKitView } from './view.ts';

export const DEFAULT_TAG_NAME = 'loader-kit';

const ATTRIBUTES = [
  'indicator',
  'spec',
  'params',
  'color',
  'colors',
  'speed',
  'animating',
  'hides-when-stopped',
  'cycle-progress',
  'respects-reduce-motion',
] as const;

type Attribute = (typeof ATTRIBUTES)[number];

const PROPERTIES = [
  'indicator',
  'spec',
  'params',
  'color',
  'colors',
  'speed',
  'animating',
  'hidesWhenStopped',
  'cycleProgress',
  'respectsReduceMotion',
] as const;

const STYLE = `
:host { display: inline-block; width: 40px; height: 40px; contain: strict; }
:host([hidden]) { display: none; }
canvas { display: block; width: 100%; height: 100%; }
`;

/** Lets the module load where the DOM does not exist, such as during server-side rendering. */
const ElementBase: typeof HTMLElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

interface ElementState {
  indicator: string;
  spec: IndicatorSpec | string | null;
  params: Params | string | null;
  color: string | null;
  colors: readonly string[] | null;
  speed: number;
  animating: boolean;
  hidesWhenStopped: boolean;
  cycleProgress: number | null;
  respectsReduceMotion: boolean;
}

/**
 * The public members of `<loader-kit>`. The tag name map uses it rather than the class, so the ESM
 * and CommonJS declarations of this package merge when one program sees both.
 */
export interface LoaderKitElementApi extends HTMLElement {
  indicator: string;
  get spec(): IndicatorSpec | string | null;
  set spec(value: IndicatorSpec | string | null);
  get params(): Params | string | null;
  set params(value: Params | string | null);
  color: string | null;
  get colors(): readonly string[] | null;
  set colors(value: readonly string[] | string | null);
  speed: number;
  animating: boolean;
  hidesWhenStopped: boolean;
  cycleProgress: number | null;
  respectsReduceMotion: boolean;
  readonly specError: string | null;
  readonly time: number;
  start(): void;
  stop(): void;
}

/**
 * `<loader-kit>`: a LoaderKit indicator as a custom element, 40px by 40px unless CSS sizes it.
 * Attributes set the property of the same name in camelCase; properties do not write attributes
 * back. Dispatches `loaderkit-error` with `detail: { message }` when the spec cannot be drawn, and
 * with a null message when it recovers. Disconnecting and connecting the element again keeps its
 * time, as changing the spec or the params is what restarts an indicator.
 */
export class LoaderKitElement extends ElementBase implements LoaderKitElementApi {
  static get observedAttributes(): readonly string[] {
    return ATTRIBUTES;
  }

  private readonly state: ElementState = {
    indicator: DEFAULT_INDICATOR,
    spec: null,
    params: null,
    color: null,
    colors: null,
    speed: 1,
    animating: true,
    hidesWhenStopped: true,
    cycleProgress: null,
    respectsReduceMotion: true,
  };

  private readonly surface: HTMLCanvasElement;
  private view: LoaderKitView | null = null;
  private error: string | null = null;
  private ownsHidden = false;
  /** Clock time kept while disconnected. */
  private savedTime = 0;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    const style = this.ownerDocument.createElement('style');
    style.textContent = STYLE;
    this.surface = this.ownerDocument.createElement('canvas');
    this.surface.setAttribute('part', 'canvas');
    elementSurfaces.add(this.surface);
    root.append(style, this.surface);
    // Properties set before the element was defined shadow the accessors; move them through.
    for (const property of PROPERTIES) {
      if (Object.prototype.hasOwnProperty.call(this, property)) {
        const value = (this as Record<string, unknown>)[property];
        delete (this as Record<string, unknown>)[property];
        (this as Record<string, unknown>)[property] = value;
      }
    }
  }

  connectedCallback(): void {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'progressbar');
    if (!this.hasAttribute('aria-label') && !this.hasAttribute('aria-labelledby')) {
      this.setAttribute('aria-label', 'Loading');
    }
    this.updateHidden();
    if (this.view) return;
    const view = new LoaderKitView(this.surface, { ...this.state, onError: (message) => this.report(message) });
    viewClocks.get(view)!.time = this.savedTime;
    this.view = view;
    this.report(view.specError);
  }

  disconnectedCallback(): void {
    if (!this.view) return;
    this.savedTime = viewClocks.get(this.view)!.time;
    this.view.destroy();
    this.view = null;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    switch (name as Attribute) {
      case 'indicator':
        this.indicator = value ?? DEFAULT_INDICATOR;
        break;
      case 'spec':
        this.spec = value;
        break;
      case 'params':
        this.params = value;
        break;
      case 'color':
        this.color = value;
        break;
      case 'colors':
        this.colors = value;
        break;
      case 'speed':
        this.speed = parseNumber(value) ?? 1;
        break;
      case 'animating':
        this.animating = value !== 'false';
        break;
      case 'hides-when-stopped':
        this.hidesWhenStopped = value !== 'false';
        break;
      case 'cycle-progress':
        this.cycleProgress = parseNumber(value);
        break;
      case 'respects-reduce-motion':
        this.respectsReduceMotion = value !== 'false';
        break;
    }
  }

  get indicator(): string {
    return this.state.indicator;
  }

  set indicator(value: string) {
    this.set('indicator', value ?? DEFAULT_INDICATOR);
  }

  get spec(): IndicatorSpec | string | null {
    return this.state.spec;
  }

  /** A spec object or JSON string; null or an empty string clears it. */
  set spec(value: IndicatorSpec | string | null) {
    this.set('spec', value === '' ? null : (value ?? null));
  }

  get params(): Params | string | null {
    return this.state.params;
  }

  /** Param overrides as an object or a JSON object string. */
  set params(value: Params | string | null) {
    this.set('params', value === '' ? null : (value ?? null));
  }

  get color(): string | null {
    return this.state.color;
  }

  /** Any CSS color; null or an empty string follows the CSS `color` of the element. */
  set color(value: string | null) {
    this.set('color', value || null);
  }

  get colors(): readonly string[] | null {
    return this.state.colors;
  }

  /** An array of CSS colors, or one string with the colors separated by commas. */
  set colors(value: readonly string[] | string | null) {
    const colors = typeof value === 'string' ? splitColors(value) : value ? [...value] : null;
    this.set('colors', colors && colors.length > 0 ? colors : null);
  }

  get speed(): number {
    return this.state.speed;
  }

  set speed(value: number) {
    this.set('speed', Number(value));
  }

  get animating(): boolean {
    return this.state.animating;
  }

  set animating(value: boolean) {
    this.set('animating', parseFlag(value));
    this.updateHidden();
  }

  get hidesWhenStopped(): boolean {
    return this.state.hidesWhenStopped;
  }

  set hidesWhenStopped(value: boolean) {
    this.set('hidesWhenStopped', parseFlag(value));
    this.updateHidden();
  }

  get cycleProgress(): number | null {
    return this.state.cycleProgress;
  }

  set cycleProgress(value: number | null) {
    const cycleProgress = value === null || value === undefined ? null : Number(value);
    this.set('cycleProgress', cycleProgress === null || Number.isNaN(cycleProgress) ? null : cycleProgress);
  }

  get respectsReduceMotion(): boolean {
    return this.state.respectsReduceMotion;
  }

  set respectsReduceMotion(value: boolean) {
    this.set('respectsReduceMotion', parseFlag(value));
  }

  /** The message of the last problem with the spec, indicator or params; null when it draws. */
  get specError(): string | null {
    return this.error;
  }

  /** Spec time currently drawn, in seconds; the kept clock time while disconnected. */
  get time(): number {
    return this.view?.time ?? this.savedTime;
  }

  start(): void {
    this.animating = true;
  }

  stop(): void {
    this.animating = false;
  }

  private set<K extends keyof ElementState>(key: K, value: ElementState[K]): void {
    const previous = this.state[key];
    this.state[key] = value;
    if (this.view) {
      (this.view as unknown as ElementState)[key] = value;
    } else if (value !== previous && restarts(key, this.state)) {
      this.savedTime = 0;
    }
  }

  private report(message: string | null): void {
    if (message === this.error) return;
    this.error = message;
    this.dispatchEvent(new CustomEvent('loaderkit-error', { detail: { message }, bubbles: true, composed: true }));
  }

  private updateHidden(): void {
    const hidden = !this.state.animating && this.state.hidesWhenStopped;
    if (hidden && (this.ownsHidden || !this.hasAttribute('aria-hidden'))) {
      this.setAttribute('aria-hidden', 'true');
      this.ownsHidden = true;
    } else if (!hidden && this.ownsHidden) {
      this.removeAttribute('aria-hidden');
      this.ownsHidden = false;
    }
  }
}

/**
 * Registers `<loader-kit>` (or `tagName`) unless it is already defined or the environment has no
 * `customElements`. Returns the registered class, if any.
 */
export function defineLoaderKitElement(tagName: string = DEFAULT_TAG_NAME): typeof LoaderKitElement | undefined {
  if (typeof customElements === 'undefined') return undefined;
  const existing = customElements.get(tagName);
  if (existing) return existing as typeof LoaderKitElement;
  // A class can be registered under one name only.
  const element = tagName === DEFAULT_TAG_NAME ? LoaderKitElement : class extends LoaderKitElement {};
  customElements.define(tagName, element);
  return element;
}

/** Splits on commas outside parentheses, so `rgb(0, 0, 0), red` is two colors. */
export function splitColors(value: string): string[] {
  const colors: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i <= value.length; i++) {
    const char = value[i];
    if (char === '(') depth++;
    else if (char === ')') depth = Math.max(0, depth - 1);
    else if (i === value.length || (char === ',' && depth === 0)) {
      const color = value.slice(start, i).trim();
      if (color !== '') colors.push(color);
      start = i + 1;
    }
  }
  return colors;
}

/** SPEC section 8: changing the spec or the params restarts the clock; `indicator` counts while no spec is set. */
function restarts(key: keyof ElementState, state: ElementState): boolean {
  return key === 'spec' || key === 'params' || (key === 'indicator' && state.spec === null);
}

/** Frameworks may pass the attribute string to the property, so `'false'` means false here too. */
function parseFlag(value: unknown): boolean {
  return typeof value === 'string' ? value !== 'false' : Boolean(value);
}

function parseNumber(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

defineLoaderKitElement();

declare global {
  interface HTMLElementTagNameMap {
    'loader-kit': LoaderKitElementApi;
  }
}
