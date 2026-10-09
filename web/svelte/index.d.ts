import { SvelteComponent } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';
import type { LoaderKitProps } from '../dist/esm/attributes.js';
import type { LoaderKitElementApi } from '../dist/esm/element.js';
import type { LoaderKitProgressProps } from '../dist/esm/progress-attributes.js';
import type { LoaderKitProgressElementApi } from '../dist/esm/progress-element.js';

export type { LoaderKitProps } from '../dist/esm/attributes.js';
export type { LoaderKitElementApi } from '../dist/esm/element.js';
export type { LoaderKitProgressProps } from '../dist/esm/progress-attributes.js';
export type { LoaderKitProgressElementApi } from '../dist/esm/progress-element.js';
export type { BuiltinIndicatorName, IndicatorSpec, Params, ProgressStrokeCap, ProgressType, ProgressVariant } from '@loader-kit/spec';

export interface LoaderKitSvelteProps extends LoaderKitProps, Omit<HTMLAttributes<HTMLElement>, 'color'> {
  /** The `<loader-kit>` element, for `bind:element`. */
  element?: LoaderKitElementApi;
}

/** A LoaderKit indicator. Renders a `<loader-kit>` element, 40px by 40px unless `size` or CSS sizes it. */
export declare class LoaderKit extends SvelteComponent<LoaderKitSvelteProps> {}

export interface LoaderKitProgressSvelteProps
  extends LoaderKitProgressProps,
    Omit<HTMLAttributes<HTMLElement>, 'color' | keyof LoaderKitProgressProps> {
  /** The `<loader-kit-progress>` element, for `bind:element`. */
  element?: LoaderKitProgressElementApi;
}

/**
 * A progress indicator. Renders a `<loader-kit-progress>` element; the default slot is centered over
 * circular, pie and gauge, and framed by border.
 */
export declare class LoaderKitProgress extends SvelteComponent<LoaderKitProgressSvelteProps, Record<string, never>, { default: Record<string, never> }> {}
