// One module per component, so a bundler leaves out the custom element of the component an app does not use.
export { LoaderKit, LoaderKit as default } from './vue-loader-kit.ts';
export { LoaderKitProgress } from './vue-progress.ts';
export type { LoaderKitProps } from './attributes.ts';
export type { LoaderKitElementApi } from './element.ts';
export type { LoaderKitProgressProps } from './progress-attributes.ts';
export type { LoaderKitProgressElementApi } from './progress-element.ts';
export type { BuiltinIndicatorName, IndicatorSpec, Params, ProgressStrokeCap, ProgressType, ProgressVariant } from '@loader-kit/spec';
