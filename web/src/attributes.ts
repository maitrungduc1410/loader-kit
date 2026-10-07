import type { BuiltinIndicatorName, IndicatorSpec, Params } from '@loader-kit/spec';
import { DEFAULT_INDICATOR } from './prepare.ts';

/** The props of the React, Vue and Svelte components. */
export interface LoaderKitProps {
  /** Built-in indicator name. Ignored while `spec` is set. Default 'BallPulse'. */
  indicator?: BuiltinIndicatorName | (string & {});
  /** A custom spec, as an object or a JSON string. Wins over `indicator`. */
  spec?: IndicatorSpec | string | null;
  /** Param overrides by name, as an object or a JSON string. */
  params?: Params | string | null;
  /** Any CSS color. Default: the CSS `color` of the element (currentColor). */
  color?: string | null;
  /** Element i uses colors[i mod length]. Wins over `color` when non-empty. */
  colors?: readonly string[] | null;
  /** Playback rate, default 1. Zero or negative pauses. */
  speed?: number;
  /** Default true. */
  animating?: boolean;
  /** Draw nothing while stopped. Default true. */
  hidesWhenStopped?: boolean;
  /** A frozen point of the animation cycle in [0, 1]; null follows the clock. */
  cycleProgress?: number | null;
  /** Show a still frame while the system asks for reduced motion. Default true. */
  respectsReduceMotion?: boolean;
  /** Width and height, in px when a number. Without it the element is 40px by 40px unless CSS sizes it. */
  size?: number | string | null;
  /** Called with the error message when the spec cannot be drawn, and with null when it recovers. */
  onError?: ((message: string | null) => void) | null;
}

/** Specs and params as the JSON text the element compares, so equal values never restart it. */
export function toJson(value: object | string | null | undefined): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/**
 * The attributes of `<loader-kit>` for `props`. Every attribute is always present, so a prop that
 * goes back to undefined resets the element to the default rather than leaving the old value.
 * Frameworks that set properties on custom elements get the same strings, which the element's
 * setters read like attributes.
 */
export function loaderKitAttributes(props: LoaderKitProps): Record<string, string> {
  const animating = props.animating ?? true;
  const hidesWhenStopped = props.hidesWhenStopped ?? true;
  const attributes: Record<string, string> = {
    indicator: props.indicator ?? DEFAULT_INDICATOR,
    spec: toJson(props.spec),
    params: toJson(props.params),
    color: props.color ?? '',
    colors: props.colors ? props.colors.join(', ') : '',
    speed: String(props.speed ?? 1),
    animating: String(animating),
    'hides-when-stopped': String(hidesWhenStopped),
    'cycle-progress': props.cycleProgress === null || props.cycleProgress === undefined ? '' : String(props.cycleProgress),
    'respects-reduce-motion': String(props.respectsReduceMotion ?? true),
    role: 'progressbar',
    'aria-label': 'Loading',
  };
  if (!animating && hidesWhenStopped) attributes['aria-hidden'] = 'true';
  return attributes;
}

/** `size` as CSS lengths, or null when it is not set. */
export function sizeLength(size: number | string | null | undefined): string | null {
  if (size === null || size === undefined || size === '') return null;
  return typeof size === 'number' ? `${size}px` : size;
}
