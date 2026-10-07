import { SvelteComponent } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';
import type { LoaderKitProps } from '../dist/esm/attributes.js';
import type { LoaderKitElementApi } from '../dist/esm/element.js';

export type { LoaderKitProps } from '../dist/esm/attributes.js';
export type { LoaderKitElementApi } from '../dist/esm/element.js';
export type { BuiltinIndicatorName, IndicatorSpec, Params } from '@loader-kit/spec';

export interface LoaderKitSvelteProps extends LoaderKitProps, Omit<HTMLAttributes<HTMLElement>, 'color'> {
  /** The `<loader-kit>` element, for `bind:element`. */
  element?: LoaderKitElementApi;
}

/** A LoaderKit indicator. Renders a `<loader-kit>` element, 40px by 40px unless `size` or CSS sizes it. */
export declare class LoaderKit extends SvelteComponent<LoaderKitSvelteProps> {}
