import { BUILTIN_INDICATORS, type IndicatorSpec } from '@loader-kit/spec';

export interface ParamControl {
  name: string;
  default: number;
  min: number;
  max: number;
  step: number;
}

const COUNT_FIELDS = new Set(['count', 'columns', 'rows', 'segments']);

/** Names of params used where the spec expects a count, which are rounded to integers. */
function countParams(spec: IndicatorSpec): Set<string> {
  const names = new Set<string>();
  const visit = (value: unknown, key: string) => {
    if (Array.isArray(value)) value.forEach((item) => visit(item, key));
    else if (value && typeof value === 'object') {
      const ref = (value as { $param?: unknown }).$param;
      if (typeof ref === 'string' && COUNT_FIELDS.has(key)) names.add(ref);
      for (const [k, v] of Object.entries(value)) visit(v, k);
    }
  };
  visit(spec, '');
  return names;
}

/** Slider ranges for the params of a spec, guessed from how each param is used and its default. */
export function paramControls(spec: IndicatorSpec | null | undefined): ParamControl[] {
  if (!spec?.params || typeof spec.params !== 'object') return [];
  const counts = countParams(spec);
  return Object.entries(spec.params)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
    .map(([name, value]) => {
      if (counts.has(name)) {
        return { name, default: value, min: 1, max: Math.max(12, Math.ceil(value * 2)), step: 1 };
      }
      if (value >= 0 && value <= 1) return { name, default: value, min: 0, max: 1, step: 0.01 };
      const span = Math.max(1, Math.abs(value) * 2);
      return { name, default: value, min: Math.min(0, value - span), max: value + span, step: 0.01 };
    });
}

export const builtinSpec = (name: string): IndicatorSpec | undefined =>
  Object.prototype.hasOwnProperty.call(BUILTIN_INDICATORS, name)
    ? BUILTIN_INDICATORS[name as keyof typeof BUILTIN_INDICATORS]
    : undefined;

/** The params that differ from the defaults, for code samples. */
export function changedParams(controls: readonly ParamControl[], values: Readonly<Record<string, number>>) {
  const changed: Record<string, number> = {};
  for (const control of controls) {
    const value = values[control.name];
    if (value !== undefined && value !== control.default) changed[control.name] = value;
  }
  return changed;
}
