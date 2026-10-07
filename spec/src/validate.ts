import { NAMED_EASINGS } from './easing.ts';
import { GROUP_PROPERTIES, REST_VALUES, isPerSegment } from './evaluate.ts';
import { SCHEMA_VERSION } from './types.ts';
import type { Easing, Num } from './types.ts';
import { hasOwn } from './own.ts';

const PROPERTIES = new Set(Object.keys(REST_VALUES));
const GROUP = new Set<string>(GROUP_PROPERTIES);
const STROKE_PROPERTIES = new Set(['strokeStart', 'strokeEnd']);
const SHAPES = new Set(['circle', 'rect', 'ring', 'triangle', 'line']);
const LAYOUTS = new Set(['single', 'stack', 'row', 'grid', 'ring']);
const PART_FIELDS = ['layout', 'shape', 'tracks', 'stagger', 'durations', 'rest', 'groupTracks'] as const;

const LAYOUT_FIELDS: Record<string, { required: string[]; optional: string[] }> = {
  single: { required: [], optional: ['size', 'width', 'height', 'x', 'y'] },
  stack: { required: ['count'], optional: ['size', 'width', 'height', 'x', 'y'] },
  row: { required: ['count', 'gap'], optional: ['itemWidth', 'itemHeight'] },
  grid: { required: ['columns', 'rows', 'gap'], optional: [] },
  ring: { required: ['count', 'itemSize'], optional: ['itemWidth', 'itemHeight', 'startAngle'] },
};

const SHAPE_FIELDS: Record<string, { required: string[]; optional: string[] }> = {
  circle: { required: [], optional: ['startAngle', 'sweep'] },
  rect: { required: [], optional: ['cornerRadius'] },
  ring: { required: ['strokeWidth'], optional: ['startAngle', 'sweep', 'segments'] },
  triangle: { required: [], optional: [] },
  line: { required: [], optional: [] },
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPositive = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0;
const isFiniteNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);

/** Returns every problem found in `input`; an empty list means it is a valid schema v1 spec. */
export function validate(input: unknown): string[] {
  const errors: string[] = [];
  if (!isObject(input)) return ['spec must be an object'];
  const spec = input;
  const params = isObject(spec.params) ? spec.params : {};

  const checkNum = (value: unknown, path: string) => {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) errors.push(`${path} must be finite`);
      return;
    }
    if (isObject(value) && typeof value.$param === 'string') {
      if (!hasOwn(params, value.$param)) errors.push(`${path} uses unknown param "${value.$param}"`);
      return;
    }
    errors.push(`${path} must be a number or { $param }`);
  };

  const checkFields = (
    object: Record<string, unknown>,
    fields: { required: string[]; optional: string[] },
    path: string
  ) => {
    for (const key of fields.required) {
      if (object[key] === undefined) errors.push(`${path}.${key} is required`);
      else checkNum(object[key], `${path}.${key}`);
    }
    for (const key of fields.optional) {
      if (object[key] !== undefined) checkNum(object[key], `${path}.${key}`);
    }
  };

  const checkTracks = (tracks: unknown, path: string, allowed: Set<string>, stroke: boolean): number => {
    if (tracks === undefined) return 0;
    if (!Array.isArray(tracks)) {
      errors.push(`${path} must be an array`);
      return 0;
    }
    const seen = new Set<string>();
    tracks.forEach((track, i) => {
      const trackPath = `${path}[${i}]`;
      if (!isObject(track)) {
        errors.push(`${trackPath} must be an object`);
        return;
      }
      const property = track.property as string;
      if (typeof property !== 'string' || !allowed.has(property)) {
        errors.push(`${trackPath}.property must be one of ${[...allowed].join(', ')}`);
      } else if (seen.has(property)) {
        errors.push(`${trackPath}.property "${property}" is animated by more than one track`);
      } else if (STROKE_PROPERTIES.has(property) && !stroke) {
        errors.push(`${trackPath}.property "${property}" needs a ring shape`);
      }
      seen.add(property);

      const keyTimes = track.keyTimes as unknown;
      const values = track.values as unknown;
      if (!Array.isArray(keyTimes) || keyTimes.length < 2) {
        errors.push(`${trackPath}.keyTimes needs at least 2 entries`);
        return;
      }
      keyTimes.forEach((value, k) => {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
          errors.push(`${trackPath}.keyTimes[${k}] must be within [0, 1]`);
        } else if (k > 0 && value < (keyTimes[k - 1] as number)) {
          errors.push(`${trackPath}.keyTimes must be non-decreasing`);
        }
      });
      if (!Array.isArray(values) || values.length !== keyTimes.length) {
        errors.push(`${trackPath}.values must have the same length as keyTimes`);
      } else {
        values.forEach((value, k) => checkNum(value as Num, `${trackPath}.values[${k}]`));
      }

      if (track.easing !== undefined) {
        const easing = track.easing as Easing | Easing[];
        if (isPerSegment(easing)) {
          if (easing.length !== keyTimes.length - 1) {
            errors.push(`${trackPath}.easing needs one entry per segment (${keyTimes.length - 1})`);
          }
          easing.forEach((item, k) => checkEasing(item, `${trackPath}.easing[${k}]`, errors));
        } else {
          checkEasing(easing as Easing, `${trackPath}.easing`, errors);
        }
      }
    });
    return tracks.length;
  };

  /** Checks one group of elements; returns its number of tracks and group tracks. */
  const checkPart = (part: Record<string, unknown>, prefix: string): number => {
    const at = (field: string) => `${prefix}${field}`;

    const layout = part.layout;
    if (!isObject(layout) || !LAYOUTS.has(layout.type as string)) {
      errors.push(`${at('layout.type')} must be one of ${[...LAYOUTS].join(', ')}`);
    } else {
      checkFields(layout, LAYOUT_FIELDS[layout.type as string]!, at('layout'));
      if (layout.orient !== undefined && typeof layout.orient !== 'boolean') {
        errors.push(`${at('layout.orient')} must be a boolean`);
      }
    }

    const shape = part.shape;
    let stroke = false;
    if (!isObject(shape) || !SHAPES.has(shape.type as string)) {
      errors.push(`${at('shape.type')} must be one of ${[...SHAPES].join(', ')}`);
    } else {
      stroke = shape.type === 'ring';
      checkFields(shape, SHAPE_FIELDS[shape.type as string]!, at('shape'));
      const { sweep } = shape;
      if (typeof sweep === 'number' && Number.isFinite(sweep) && !(sweep > 0 && sweep <= 2 * Math.PI + 1e-9)) {
        errors.push(`${at('shape.sweep')} must be within (0, 2π]`);
      }
    }

    if (part.stagger !== undefined) {
      const stagger = part.stagger;
      if (Array.isArray(stagger)) {
        stagger.forEach((value, i) => {
          if (!isFiniteNumber(value)) errors.push(`${at(`stagger[${i}]`)} must be a finite number`);
        });
      } else if (!(isObject(stagger) && isFiniteNumber(stagger.each))) {
        errors.push(`${at('stagger')} must be an array of offsets or { each, start? }`);
      } else if (stagger.start !== undefined && !isFiniteNumber(stagger.start)) {
        errors.push(`${at('stagger.start')} must be a finite number`);
      }
    }

    if (part.duration !== undefined && prefix !== '' && !isPositive(part.duration)) {
      errors.push(`${at('duration')} must be a positive number`);
    }
    if (part.durations !== undefined) {
      if (!Array.isArray(part.durations)) errors.push(`${at('durations')} must be an array`);
      else {
        part.durations.forEach((value, i) => {
          if (!isPositive(value)) errors.push(`${at(`durations[${i}]`)} must be a positive number`);
        });
      }
    }

    if (part.rest !== undefined) {
      if (!isObject(part.rest)) errors.push(`${at('rest')} must be an object`);
      else {
        for (const [property, value] of Object.entries(part.rest)) {
          if (!PROPERTIES.has(property)) {
            errors.push(`${at(`rest.${property}`)} is not an animatable property`);
          } else if (STROKE_PROPERTIES.has(property) && !stroke) {
            errors.push(`${at(`rest.${property}`)} needs a ring shape`);
          } else {
            checkNum(value, at(`rest.${property}`));
          }
        }
      }
    }

    return (
      checkTracks(part.tracks, at('tracks'), PROPERTIES, stroke) +
      checkTracks(part.groupTracks, at('groupTracks'), GROUP, stroke)
    );
  };

  if (spec.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${SCHEMA_VERSION}`);
  }
  if (typeof spec.name !== 'string' || spec.name.length === 0) errors.push('name is required');
  if (!isPositive(spec.duration)) errors.push('duration must be a positive number');
  if (spec.params !== undefined) {
    if (!isObject(spec.params)) errors.push('params must be an object');
    else {
      for (const [name, value] of Object.entries(spec.params)) {
        if (!isFiniteNumber(value)) errors.push(`params.${name} must be a finite number`);
      }
    }
  }
  if (spec.perspective !== undefined && !isPositive(spec.perspective)) {
    errors.push('perspective must be a positive number');
  }

  let animated = 0;
  if (spec.parts !== undefined) {
    for (const field of PART_FIELDS) {
      if (spec[field] !== undefined) errors.push(`${field} must be set inside parts when the spec has parts`);
    }
    if (!Array.isArray(spec.parts) || spec.parts.length === 0) {
      errors.push('parts must be a non-empty array');
    } else {
      spec.parts.forEach((part, i) => {
        if (!isObject(part)) errors.push(`parts[${i}] must be an object`);
        else animated += checkPart(part, `parts[${i}].`);
      });
    }
  } else {
    animated = checkPart(spec, '');
  }
  if (animated === 0 && errors.length === 0) errors.push('the spec needs at least one track or group track');

  return errors;
}

function checkEasing(easing: unknown, path: string, errors: string[]) {
  if (typeof easing === 'string') {
    if (!hasOwn(NAMED_EASINGS, easing)) errors.push(`${path} "${easing}" is not a named easing`);
    return;
  }
  if (
    !Array.isArray(easing) ||
    easing.length !== 4 ||
    easing.some((value) => typeof value !== 'number' || !Number.isFinite(value))
  ) {
    errors.push(`${path} must be a named easing or [x1, y1, x2, y2]`);
    return;
  }
  if (easing[0] < 0 || easing[0] > 1 || easing[2] < 0 || easing[2] > 1) {
    errors.push(`${path} x1 and x2 must be within [0, 1]`);
  }
}
