import type { ProgressOptions } from '@loader-kit/spec';

/** The props of the React, Vue and Svelte `LoaderKitProgress` components. */
export interface LoaderKitProgressProps extends ProgressOptions {
  /** Progress in [0, 1]; null or undefined shows the indeterminate animation. */
  value?: number | null;
  /** Buffer of linear `flat` and `wavy`, in [0, 1]. */
  buffer?: number | null;
  /** Move to a new value along a curve that follows the rhythm of the updates. Default true. */
  smooth?: boolean;
  /** Default size in px of every type but linear and border. Default 48. */
  size?: number | null;
  /** Any CSS color. Default: the CSS `color` of the element (currentColor). */
  color?: string | null;
  /** Any CSS color. Default: `color` at 24% opacity. */
  trackColor?: string | null;
  /** Any CSS color for the percentage. Default: the CSS `color` of the element. */
  labelColor?: string | null;
  /** Jump to new values and stop ambient motion while the system asks for reduced motion. Default true. */
  respectsReduceMotion?: boolean;
  /** The name screen readers announce. Default 'Loading'. */
  accessibilityLabel?: string | null;
}

const ATTRIBUTE_NAMES = {
  value: 'value',
  buffer: 'buffer',
  smooth: 'smooth',
  type: 'type',
  variant: 'variant',
  thickness: 'thickness',
  trackGap: 'track-gap',
  segments: 'segments',
  showLabel: 'show-label',
  stopIndicator: 'stop-indicator',
  strokeCap: 'stroke-cap',
  amplitude: 'amplitude',
  wavelength: 'wavelength',
  waveSpeed: 'wave-speed',
  sweepAngle: 'sweep-angle',
  cornerRadius: 'corner-radius',
  speed: 'speed',
  size: 'size',
  color: 'color',
  trackColor: 'track-color',
  labelColor: 'label-color',
  respectsReduceMotion: 'respects-reduce-motion',
} as const satisfies Partial<Record<keyof LoaderKitProgressProps, string>>;

/**
 * Sets the properties of a `<loader-kit-progress>` element from `props`; undefined sets null, which
 * resets the property to its default. For frameworks that only remove the attribute of a prop that
 * goes away, which the element cannot tell from an attribute it never had.
 */
export function setProgressProperties(element: object, props: LoaderKitProgressProps): void {
  const target = element as Record<string, unknown>;
  for (const prop of Object.keys(ATTRIBUTE_NAMES)) {
    const value = props[prop as keyof typeof ATTRIBUTE_NAMES] ?? null;
    if (!Object.is(target[prop], value)) target[prop] = value;
  }
}

/**
 * The attributes of `<loader-kit-progress>` for `props`. A prop left undefined or null leaves its
 * attribute out, which the element reads as the default. The role and the ARIA value are written
 * here too, so server-rendered markup is already accessible.
 */
export function progressAttributes(props: LoaderKitProgressProps): Record<string, string | undefined> {
  const attributes: Record<string, string | undefined> = {};
  for (const [prop, attribute] of Object.entries(ATTRIBUTE_NAMES)) {
    const value = props[prop as keyof typeof ATTRIBUTE_NAMES];
    attributes[attribute] = value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value)) ? undefined : String(value);
  }
  const value = props.value;
  const determinate = typeof value === 'number' && !Number.isNaN(value);
  attributes.role = 'progressbar';
  attributes['aria-label'] = props.accessibilityLabel || 'Loading';
  attributes['aria-valuemin'] = '0';
  attributes['aria-valuemax'] = '100';
  attributes['aria-valuenow'] = determinate ? String(Math.round(Math.min(1, Math.max(0, value)) * 100)) : undefined;
  return attributes;
}
