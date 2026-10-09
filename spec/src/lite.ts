// Everything in the main entry except the built-in specs and the progress drawing code, for hosts
// whose native views do the drawing. It must not import ./indicators/index.ts or the progress
// animator and geometry, even indirectly: Metro bundles every module it reaches.
export * from './types.ts';
export { NAMED_EASINGS, controlPoints, cubicBezier } from './easing.ts';
export {
  DEFAULT_PERSPECTIVE,
  GROUP_PROPERTIES,
  REST_VALUES,
  elementCount,
  elementDurations,
  evaluate,
  layoutElements,
  prepareIndicator,
  prepareParts,
  resolveCount,
  resolveNum,
  resolveParams,
  resolveShape,
  sampleTrack,
  segmentEasing,
  specParts,
  staggerOffsets,
  timeForCycleProgress,
} from './evaluate.ts';
export type { ElementGeometry, Params, PreparedIndicator, PreparedPart, ResolvedShape } from './evaluate.ts';
export { validate } from './validate.ts';
export { InvalidIndicatorError, defineIndicator, param } from './define.ts';
export type { IndicatorDefinition } from './define.ts';
export { BUILTIN_INDICATOR_NAMES } from './indicators/names.ts';
export type { BuiltinIndicatorName } from './indicators/names.ts';
export * from './progress/types.ts';
export {
  PROGRESS_DEFAULT_SIZE,
  PROGRESS_LABEL_WIDTH,
  progressContentInset,
  progressIntrinsicSize,
  progressLabelInside,
  progressLinearHeight,
  progressUsesSegments,
  progressVariants,
  resolveProgress,
} from './progress/resolve.ts';
