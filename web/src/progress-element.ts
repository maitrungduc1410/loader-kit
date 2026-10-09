import { PROGRESS_DEFAULT_SIZE, progressContentInset, progressIntrinsicSize, resolveProgress } from '@loader-kit/spec';
import type { ProgressOptions, ProgressStrokeCap, ProgressType, ProgressVariant } from '@loader-kit/spec';
import { LoaderKitProgressView } from './progress-view.ts';
import type { LoaderKitProgressOptions } from './progress-view.ts';

export const DEFAULT_PROGRESS_TAG_NAME = 'loader-kit-progress';

type Kind = 'number' | 'flag' | 'string';

/** Attribute name, property name and how the attribute string is read. */
const FIELDS = [
  ['value', 'value', 'number'],
  ['buffer', 'buffer', 'number'],
  ['smooth', 'smooth', 'flag'],
  ['type', 'type', 'string'],
  ['variant', 'variant', 'string'],
  ['thickness', 'thickness', 'number'],
  ['track-gap', 'trackGap', 'number'],
  ['segments', 'segments', 'number'],
  ['show-label', 'showLabel', 'flag'],
  ['stop-indicator', 'stopIndicator', 'flag'],
  ['stroke-cap', 'strokeCap', 'string'],
  ['amplitude', 'amplitude', 'number'],
  ['wavelength', 'wavelength', 'number'],
  ['wave-speed', 'waveSpeed', 'number'],
  ['sweep-angle', 'sweepAngle', 'number'],
  ['corner-radius', 'cornerRadius', 'number'],
  ['speed', 'speed', 'number'],
  ['size', 'size', 'number'],
  ['color', 'color', 'string'],
  ['track-color', 'trackColor', 'string'],
  ['label-color', 'labelColor', 'string'],
  ['respects-reduce-motion', 'respectsReduceMotion', 'flag'],
] as const satisfies readonly (readonly [string, keyof ProgressElementState, Kind])[];

const GEOMETRY = new Set<string>([
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
]);

const STYLE = `
:host { display: inline-block; position: relative; vertical-align: middle; box-sizing: border-box; }
:host([hidden]) { display: none; }
canvas { position: absolute; inset: 0; display: block; width: 100%; height: 100%; pointer-events: none; }
.content { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
`;

const ElementBase: typeof HTMLElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

interface ProgressElementState {
  value: number | null;
  buffer: number | null;
  smooth: boolean;
  type: ProgressType | null;
  variant: ProgressVariant | null;
  thickness: number | null;
  trackGap: number | null;
  segments: number | null;
  showLabel: boolean | null;
  stopIndicator: boolean | null;
  strokeCap: ProgressStrokeCap | null;
  amplitude: number | null;
  wavelength: number | null;
  waveSpeed: number | null;
  sweepAngle: number | null;
  cornerRadius: number | null;
  speed: number | null;
  size: number | null;
  color: string | null;
  trackColor: string | null;
  labelColor: string | null;
  respectsReduceMotion: boolean;
}

/**
 * The public members of `<loader-kit-progress>`. The tag name map uses it rather than the class, so
 * the ESM and CommonJS declarations of this package merge when one program sees both.
 */
export interface LoaderKitProgressElementApi extends HTMLElement {
  value: number | null;
  buffer: number | null;
  smooth: boolean;
  type: ProgressType | null;
  variant: ProgressVariant | null;
  thickness: number | null;
  trackGap: number | null;
  segments: number | null;
  showLabel: boolean | null;
  stopIndicator: boolean | null;
  strokeCap: ProgressStrokeCap | null;
  amplitude: number | null;
  wavelength: number | null;
  waveSpeed: number | null;
  sweepAngle: number | null;
  cornerRadius: number | null;
  speed: number | null;
  size: number | null;
  color: string | null;
  trackColor: string | null;
  labelColor: string | null;
  respectsReduceMotion: boolean;
}

/**
 * `<loader-kit-progress>`: a LoaderKitProgress as a custom element. Without CSS it takes the size of
 * its type: `size` (48px) for the round types, 4:3 for bars and 2:1 for battery, the full width
 * for linear, and its content plus the stroke for border. Children are centered over circular, pie
 * and gauge, and framed by border. Attributes set the property of the same name in camelCase;
 * properties do not write attributes back.
 */
export class LoaderKitProgressElement extends ElementBase implements LoaderKitProgressElementApi {
  static get observedAttributes(): readonly string[] {
    return FIELDS.map(([attribute]) => attribute);
  }

  private readonly state: ProgressElementState = {
    value: null,
    buffer: null,
    smooth: true,
    type: null,
    variant: null,
    thickness: null,
    trackGap: null,
    segments: null,
    showLabel: null,
    stopIndicator: null,
    strokeCap: null,
    amplitude: null,
    wavelength: null,
    waveSpeed: null,
    sweepAngle: null,
    cornerRadius: null,
    speed: null,
    size: null,
    color: null,
    trackColor: null,
    labelColor: null,
    respectsReduceMotion: true,
  };

  private readonly surface: HTMLCanvasElement;
  private readonly sizing: HTMLStyleElement;
  private view: LoaderKitProgressView | null = null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    const style = this.ownerDocument.createElement('style');
    style.textContent = STYLE;
    this.sizing = this.ownerDocument.createElement('style');
    this.surface = this.ownerDocument.createElement('canvas');
    this.surface.setAttribute('part', 'canvas');
    const content = this.ownerDocument.createElement('div');
    content.className = 'content';
    content.setAttribute('part', 'content');
    content.append(this.ownerDocument.createElement('slot'));
    root.append(style, this.sizing, this.surface, content);
    this.updateSizing();
    // Properties set before the element was defined shadow the accessors; move them through.
    for (const [, property] of FIELDS) {
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
    this.updateAria();
    if (this.view) return;
    const options: LoaderKitProgressOptions = {};
    for (const [key, value] of Object.entries(this.state)) {
      if (key !== 'size') (options as Record<string, unknown>)[key] = value;
    }
    this.view = new LoaderKitProgressView(this.surface, options);
  }

  disconnectedCallback(): void {
    this.view?.destroy();
    this.view = null;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    const field = FIELDS.find(([attribute]) => attribute === name);
    if (!field) return;
    const [, property, kind] = field;
    const self = this as unknown as Record<string, unknown>;
    if (kind === 'number') self[property] = parseNumber(value);
    else if (kind === 'flag') self[property] = value === null ? flagDefault(property) : value !== 'false';
    else self[property] = value === null || value === '' ? null : value;
  }

  get value(): number | null {
    return this.state.value;
  }

  /** Progress in [0, 1]; null or NaN shows the indeterminate animation. */
  set value(value: number | null) {
    this.set('value', toNumber(value));
  }

  get buffer(): number | null {
    return this.state.buffer;
  }

  set buffer(value: number | null) {
    this.set('buffer', toNumber(value));
  }

  get smooth(): boolean {
    return this.state.smooth;
  }

  set smooth(value: boolean) {
    this.set('smooth', parseFlag(value, true));
  }

  get type(): ProgressType | null {
    return this.state.type;
  }

  set type(value: ProgressType | null) {
    this.set('type', value || null);
  }

  get variant(): ProgressVariant | null {
    return this.state.variant;
  }

  set variant(value: ProgressVariant | null) {
    this.set('variant', value || null);
  }

  get thickness(): number | null {
    return this.state.thickness;
  }

  set thickness(value: number | null) {
    this.set('thickness', toNumber(value));
  }

  get trackGap(): number | null {
    return this.state.trackGap;
  }

  set trackGap(value: number | null) {
    this.set('trackGap', toNumber(value));
  }

  get segments(): number | null {
    return this.state.segments;
  }

  set segments(value: number | null) {
    this.set('segments', toNumber(value));
  }

  get showLabel(): boolean | null {
    return this.state.showLabel;
  }

  set showLabel(value: boolean | null) {
    this.set('showLabel', value === null || value === undefined ? null : parseFlag(value, false));
  }

  get stopIndicator(): boolean | null {
    return this.state.stopIndicator;
  }

  set stopIndicator(value: boolean | null) {
    this.set('stopIndicator', value === null || value === undefined ? null : parseFlag(value, true));
  }

  get strokeCap(): ProgressStrokeCap | null {
    return this.state.strokeCap;
  }

  set strokeCap(value: ProgressStrokeCap | null) {
    this.set('strokeCap', value || null);
  }

  get amplitude(): number | null {
    return this.state.amplitude;
  }

  set amplitude(value: number | null) {
    this.set('amplitude', toNumber(value));
  }

  get wavelength(): number | null {
    return this.state.wavelength;
  }

  set wavelength(value: number | null) {
    this.set('wavelength', toNumber(value));
  }

  get waveSpeed(): number | null {
    return this.state.waveSpeed;
  }

  set waveSpeed(value: number | null) {
    this.set('waveSpeed', toNumber(value));
  }

  get sweepAngle(): number | null {
    return this.state.sweepAngle;
  }

  /** Degrees. */
  set sweepAngle(value: number | null) {
    this.set('sweepAngle', toNumber(value));
  }

  get cornerRadius(): number | null {
    return this.state.cornerRadius;
  }

  set cornerRadius(value: number | null) {
    this.set('cornerRadius', toNumber(value));
  }

  get speed(): number | null {
    return this.state.speed;
  }

  set speed(value: number | null) {
    this.set('speed', toNumber(value));
  }

  get size(): number | null {
    return this.state.size;
  }

  /** Default size in px of every type but linear and border. Default 48. */
  set size(value: number | null) {
    this.set('size', toNumber(value));
  }

  get color(): string | null {
    return this.state.color;
  }

  /** Any CSS color; null or an empty string follows the CSS `color` of the element. */
  set color(value: string | null) {
    this.set('color', value || null);
  }

  get trackColor(): string | null {
    return this.state.trackColor;
  }

  /** Any CSS color; null or an empty string draws the track in `color` at 24% opacity. */
  set trackColor(value: string | null) {
    this.set('trackColor', value || null);
  }

  get labelColor(): string | null {
    return this.state.labelColor;
  }

  /** Any CSS color; null or an empty string follows the CSS `color` of the element. */
  set labelColor(value: string | null) {
    this.set('labelColor', value || null);
  }

  get respectsReduceMotion(): boolean {
    return this.state.respectsReduceMotion;
  }

  set respectsReduceMotion(value: boolean) {
    this.set('respectsReduceMotion', parseFlag(value, true));
  }

  private set<K extends keyof ProgressElementState>(key: K, value: ProgressElementState[K]): void {
    if (Object.is(this.state[key], value)) return;
    this.state[key] = value;
    if (key === 'value' && this.isConnected) this.updateAria();
    if (GEOMETRY.has(key) || key === 'size') this.updateSizing();
    const view = this.view;
    if (!view || key === 'size') return;
    if (GEOMETRY.has(key)) view.configure({ [key]: value } as ProgressOptions);
    else (view as unknown as Record<string, unknown>)[key] = value;
  }

  private updateAria(): void {
    const value = this.state.value;
    this.setAttribute('aria-valuemin', '0');
    this.setAttribute('aria-valuemax', '100');
    if (value === null) this.removeAttribute('aria-valuenow');
    else this.setAttribute('aria-valuenow', String(Math.round(Math.min(1, Math.max(0, value)) * 100)));
  }

  /** Default size rules, which any CSS on the element itself overrides. */
  private updateSizing(): void {
    const options: ProgressOptions = {};
    for (const key of GEOMETRY) (options as Record<string, unknown>)[key] = this.state[key as keyof ProgressElementState];
    const p = resolveProgress(options);
    const size = this.state.size !== null && this.state.size >= 0 && Number.isFinite(this.state.size) ? this.state.size : PROGRESS_DEFAULT_SIZE;
    let rules: string;
    if (p.type === 'linear') {
      rules = `:host { display: block; height: ${progressIntrinsicSize(p).height}px; }`;
    } else if (p.type === 'border') {
      rules = `:host { padding: ${progressContentInset(p)}px; } .content { position: relative; display: block; }`;
    } else {
      const intrinsic = progressIntrinsicSize(p);
      const ratio = (intrinsic.height ?? PROGRESS_DEFAULT_SIZE) / (intrinsic.width ?? PROGRESS_DEFAULT_SIZE);
      rules = `:host { width: ${size}px; height: ${size * ratio}px; }`;
    }
    if (this.sizing.textContent !== rules) this.sizing.textContent = rules;
  }
}

/**
 * Registers `<loader-kit-progress>` (or `tagName`) unless it is already defined or the environment
 * has no `customElements`. Returns the registered class, if any.
 */
export function defineLoaderKitProgressElement(
  tagName: string = DEFAULT_PROGRESS_TAG_NAME,
): typeof LoaderKitProgressElement | undefined {
  if (typeof customElements === 'undefined') return undefined;
  const existing = customElements.get(tagName);
  if (existing) return existing as typeof LoaderKitProgressElement;
  const element = tagName === DEFAULT_PROGRESS_TAG_NAME ? LoaderKitProgressElement : class extends LoaderKitProgressElement {};
  customElements.define(tagName, element);
  return element;
}

function flagDefault(property: string): boolean | null {
  return property === 'smooth' || property === 'respectsReduceMotion' ? true : null;
}

/** Frameworks may pass the attribute string to the property, so `'false'` means false here too. */
function parseFlag(value: unknown, fallback: boolean): boolean {
  if (value === null || value === undefined) return fallback;
  return typeof value === 'string' ? value !== 'false' : Boolean(value);
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

function parseNumber(value: string | null): number | null {
  return value === null || value.trim() === '' ? null : toNumber(value);
}

defineLoaderKitProgressElement();

declare global {
  interface HTMLElementTagNameMap {
    'loader-kit-progress': LoaderKitProgressElementApi;
  }
}
