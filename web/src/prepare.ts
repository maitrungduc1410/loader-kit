import {
  BUILTIN_INDICATORS,
  BUILTIN_INDICATOR_NAMES,
  InvalidIndicatorError,
  prepareIndicator,
  resolveNum,
  resolveParams,
  specParts,
  validate,
} from '@loader-kit/spec';
import type { IndicatorSpec, Layout, Num, Params, PreparedIndicator } from '@loader-kit/spec';

/** The most elements a spec may have across its parts (SPEC section 9). */
export const MAX_ELEMENTS = 10_000;

/** The most ring arcs a spec may draw: element count times `segments`, summed over ring parts. */
export const MAX_RING_ARCS = 10_000;

export const DEFAULT_INDICATOR = 'BallPulse';

export interface IndicatorSource {
  /** Built-in indicator name, used when `spec` is not set. Default 'BallPulse'. */
  indicator?: string;
  /** A custom spec, as an object or a JSON string. */
  spec?: IndicatorSpec | string | null;
}

/**
 * Resolves a built-in name or a spec (object or JSON) with params, validates it and enforces the
 * SPEC section 9 limits. Throws `InvalidIndicatorError` with every problem.
 */
export function prepare(source: IndicatorSource, params: Params = {}): PreparedIndicator {
  const spec = resolveSource(source);
  const errors = validate(spec);
  if (errors.length > 0) throw new InvalidIndicatorError(errors);

  const overrides = checkParams(spec, params);
  checkLimits(spec, resolveParams(spec, overrides));
  try {
    return prepareIndicator(spec, overrides);
  } catch (error) {
    throw new InvalidIndicatorError([error instanceof Error ? error.message : String(error)]);
  }
}

function resolveSource({ indicator, spec }: IndicatorSource): IndicatorSpec {
  if (typeof spec === 'string') {
    try {
      return JSON.parse(spec) as IndicatorSpec;
    } catch (error) {
      throw new InvalidIndicatorError([`spec is not valid JSON: ${(error as Error).message}`]);
    }
  }
  if (spec !== undefined && spec !== null) return spec;
  const name = indicator ?? DEFAULT_INDICATOR;
  if (!Object.prototype.hasOwnProperty.call(BUILTIN_INDICATORS, name)) {
    throw new InvalidIndicatorError([
      `unknown indicator "${name}", expected one of ${BUILTIN_INDICATOR_NAMES.join(', ')}`,
    ]);
  }
  return BUILTIN_INDICATORS[name as keyof typeof BUILTIN_INDICATORS];
}

/** Overrides of declared params must be finite numbers; overrides of other names are ignored. */
function checkParams(spec: IndicatorSpec, params: unknown): Params {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) {
    throw new InvalidIndicatorError(['params must be an object of numbers']);
  }
  const declared = spec.params ?? {};
  const errors: string[] = [];
  for (const [name, value] of Object.entries(params)) {
    if (!Object.prototype.hasOwnProperty.call(declared, name)) continue;
    if (typeof value !== 'number' || !Number.isFinite(value)) errors.push(`params.${name} must be a finite number`);
  }
  if (errors.length > 0) throw new InvalidIndicatorError(errors);
  return params as Params;
}

/** Counts every element and ring arc before anything is allocated for them. */
function checkLimits(spec: IndicatorSpec, params: Params): void {
  const errors: string[] = [];
  const count = (value: Num, path: string): number => {
    const raw = resolveNum(value, params);
    if (!Number.isFinite(raw)) {
      errors.push(`${path} resolves to ${raw}, which is not a count`);
      return 1;
    }
    return Math.max(1, Math.round(raw));
  };
  const layoutCount = (layout: Layout, prefix: string): number => {
    switch (layout.type) {
      case 'single':
        return 1;
      case 'stack':
      case 'row':
      case 'ring':
        return count(layout.count, `${prefix}layout.count`);
      case 'grid':
        return count(layout.columns, `${prefix}layout.columns`) * count(layout.rows, `${prefix}layout.rows`);
    }
  };

  let elements = 0;
  let arcs = 0;
  specParts(spec).forEach((part, i) => {
    const prefix = spec.parts === undefined ? '' : `parts[${i}].`;
    const n = layoutCount(part.layout, prefix);
    elements += n;
    if (part.shape.type === 'ring') {
      arcs += n * (part.shape.segments === undefined ? 1 : count(part.shape.segments, `${prefix}shape.segments`));
    }
  });
  if (elements > MAX_ELEMENTS) errors.push(`the spec has ${elements} elements, the maximum is ${MAX_ELEMENTS}`);
  if (arcs > MAX_RING_ARCS) errors.push(`the spec draws ${arcs} ring arcs, the maximum is ${MAX_RING_ARCS}`);
  if (errors.length > 0) throw new InvalidIndicatorError(errors);
}
