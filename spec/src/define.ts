import { evaluate } from './evaluate.ts';
import { SCHEMA_VERSION } from './types.ts';
import type { IndicatorSpec, ParamRef } from './types.ts';
import { validate } from './validate.ts';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type IndicatorDefinition = DistributiveOmit<IndicatorSpec, 'schemaVersion' | 'name'> & {
  name?: string;
};

export class InvalidIndicatorError extends Error {
  readonly errors: readonly string[];

  constructor(errors: readonly string[]) {
    super(`Invalid indicator spec:\n- ${errors.join('\n- ')}`);
    this.name = 'InvalidIndicatorError';
    this.errors = errors;
  }
}

/** References a spec parameter inside a layout, shape or track value. */
export function param(name: string): ParamRef {
  return { $param: name };
}

/**
 * Builds a schema v1 spec and checks it. Throws `InvalidIndicatorError` listing every problem.
 */
export function defineIndicator(definition: IndicatorDefinition): IndicatorSpec {
  const spec = {
    schemaVersion: SCHEMA_VERSION,
    name: definition.name ?? 'Custom',
    ...definition,
  } as IndicatorSpec;
  const errors = validate(spec);
  if (errors.length === 0) {
    try {
      evaluate(spec, 0);
    } catch (error) {
      errors.push((error as Error).message);
    }
  }
  if (errors.length > 0) throw new InvalidIndicatorError(errors);
  return spec;
}
