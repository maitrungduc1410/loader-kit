// JSON Schema (draft-07) for indicator specs, written to spec/schema.json by generate.ts.
// It is stricter than validate() in one way: unknown fields are errors, because in a hand-written
// spec they are almost always typos. Rules that need more than one field (keyTimes order and length,
// `$param` names, stroke properties on non-ring shapes, durations covering every element) are left
// to validate().
import { GROUP_PROPERTIES, NAMED_EASINGS, REST_VALUES, SCHEMA_VERSION } from '../src/index.ts';

export const SCHEMA_URL = 'https://maitrungduc1410.github.io/loader-kit/schema/v1.json';

type Schema = Record<string, unknown>;

// Draft-07 ignores keywords next to `$ref`, so a described number repeats the `num` alternatives.
const ref = (name: string): Schema => ({ $ref: `#/definitions/${name}` });
const num = (description: string, extra: Schema = {}): Schema => ({
  description,
  anyOf: [{ type: 'number' }, ref('paramRef')],
  ...extra,
});
const positive = (description: string): Schema => ({ type: 'number', exclusiveMinimum: 0, description });
const TWO_PI = 2 * Math.PI;

// Listing the fields in `properties` too keeps the schema valid for Ajv's strict mode.
const present = (...fields: string[]): Schema => ({
  properties: Object.fromEntries(fields.map((field) => [field, true])),
  required: fields,
});

function variant(type: string, description: string, properties: Record<string, Schema>, required: string[] = []): Schema {
  return {
    type: 'object',
    description,
    properties: { type: { const: type }, ...properties },
    required: ['type', ...required],
    additionalProperties: false,
  };
}

const placed = {
  size: num('Side of the element, default 1.'),
  width: num('Element width, default `size`.'),
  height: num('Element height, default `size`.'),
  x: num('Element center x, default 0.5.'),
  y: num('Element center y, default 0.5.'),
};

const startAngle = num('Where the arc starts, in radians clockwise from the right. Default -π/2 (the top).');
const sweep = (what: string) =>
  num(`Angle covered by ${what}, in radians within (0, 2π]. Default 2π.`, {
    anyOf: [{ type: 'number', exclusiveMinimum: 0, maximum: TWO_PI + 1e-9 }, ref('paramRef')],
  });

const easingNames = Object.keys(NAMED_EASINGS);
const animatable = Object.keys(REST_VALUES);

const part: Record<string, Schema> = {
  layout: ref('layout'),
  shape: ref('shape'),
  tracks: {
    type: 'array',
    description: 'Tracks applied to every element of the group. A property can have at most one track.',
    items: ref('track'),
  },
  stagger: {
    description: 'Start offset of each element: a list of offsets in seconds by element index, or `{ each, start? }`.',
    anyOf: [
      { type: 'array', items: { type: 'number' } },
      {
        type: 'object',
        properties: {
          each: { type: 'number', description: 'Element i starts at `start + each * i` seconds.' },
          start: { type: 'number', description: 'Offset of element 0, default 0.' },
        },
        required: ['each'],
        additionalProperties: false,
      },
    ],
  },
  durations: {
    type: 'array',
    description: 'Cycle length of each element in seconds, by index. Must cover every element.',
    items: { type: 'number', exclusiveMinimum: 0 },
  },
  rest: {
    type: 'object',
    description: 'Values of properties that no track drives, also shown before an element starts.',
    properties: Object.fromEntries(animatable.map((property) => [property, ref('num')])),
    additionalProperties: false,
  },
  groupTracks: {
    type: 'array',
    description: 'Tracks that move the whole group around the box center, on the group cycle, without stagger.',
    items: ref('groupTrack'),
  },
};

function track(properties: readonly string[], description: string): Schema {
  return {
    type: 'object',
    description,
    properties: {
      property: { enum: properties, description: 'The animated property.' },
      keyTimes: {
        type: 'array',
        description: 'Non-decreasing times within [0, 1] of the cycle, one per value. Usually starts at 0 and ends at 1.',
        items: { type: 'number', minimum: 0, maximum: 1 },
        minItems: 2,
      },
      values: {
        type: 'array',
        description: 'Value at each key time. Angles are radians, lengths are fractions of the box.',
        items: ref('num'),
        minItems: 2,
      },
      easing: {
        description: 'One easing for every segment, or a list with one easing per segment (`keyTimes.length - 1`). Default linear.',
        anyOf: [ref('easing'), { type: 'array', items: ref('easing'), minItems: 1 }],
      },
    },
    required: ['property', 'keyTimes', 'values'],
    additionalProperties: false,
  };
}

export function indicatorSpecSchema(): Schema {
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: SCHEMA_URL,
    title: 'LoaderKit indicator spec',
    description:
      'A loading indicator described as data, schema version 1. Coordinates are fractions of a unit box (origin top-left, y down), angles are radians (positive is clockwise), times are seconds at speed 1.',
    type: 'object',
    properties: {
      $schema: { type: 'string', description: 'URL of this JSON Schema, for editors. Engines ignore it.' },
      schemaVersion: { const: SCHEMA_VERSION, description: 'Schema version of the spec.' },
      name: { type: 'string', minLength: 1, description: 'Name of the indicator.' },
      duration: positive('Length of one cycle in seconds, at speed 1.'),
      params: {
        type: 'object',
        description: 'Parameter defaults, referenced as `{ "$param": "name" }`. Users can override them by name.',
        additionalProperties: { type: 'number' },
      },
      perspective: positive('Distance from the viewer to the box for rotateX and rotateY, in box units. Default 2.5.'),
      parts: {
        type: 'array',
        description: 'Groups of elements drawn in order. Element indices (and so colors) run across the parts.',
        items: ref('part'),
        minItems: 1,
      },
      ...part,
    },
    required: ['schemaVersion', 'name', 'duration'],
    additionalProperties: false,
    if: present('parts'),
    then: { not: { anyOf: Object.keys(part).map((field) => present(field)) } },
    else: present('layout', 'shape'),
    definitions: {
      paramRef: {
        type: 'object',
        description: 'A reference to a value of `params`.',
        properties: { $param: { type: 'string', description: 'Name of a key in the spec `params`.' } },
        required: ['$param'],
        additionalProperties: false,
      },
      num: { anyOf: [{ type: 'number' }, ref('paramRef')] },
      part: {
        type: 'object',
        description: 'A group of elements that share a layout, a shape and tracks.',
        properties: { ...part, duration: positive('Cycle length of this group in seconds. Default: the spec duration.') },
        required: ['layout', 'shape'],
        additionalProperties: false,
      },
      layout: {
        description: 'Where the elements sit inside the unit box.',
        oneOf: [
          variant('single', 'One element.', placed),
          variant('stack', '`count` elements on top of each other, all at the same place.', { count: num('Number of elements.'), ...placed }, ['count']),
          variant(
            'row',
            'Elements side by side, left to right, centered vertically.',
            {
              count: num('Number of elements.'),
              gap: num('Space between two elements.'),
              itemWidth: num('Element width. Default: the elements and gaps fill the box. With a width the row is centered.'),
              itemHeight: num('Element height. Default: the element width.'),
            },
            ['count', 'gap']
          ),
          variant(
            'grid',
            'Elements in rows and columns filling the box, numbered row by row.',
            { columns: num('Number of columns.'), rows: num('Number of rows.'), gap: num('Space between two cells.') },
            ['columns', 'rows', 'gap']
          ),
          variant(
            'ring',
            'Elements evenly spaced on a circle, clockwise.',
            {
              count: num('Number of elements.'),
              itemSize: num('Side of each element. Centers sit on a circle of radius `0.5 - itemSize / 2`.'),
              itemWidth: num('Element width, default `itemSize`.'),
              itemHeight: num('Element height, default `itemSize`.'),
              startAngle: num('Angle of the first element, default 0 (to the right of the center).'),
              orient: { type: 'boolean', description: 'Rotate each element by its angle plus π/2, so its top points away from the center.' },
            },
            ['count', 'itemSize']
          ),
        ],
      },
      shape: {
        description: 'What each element draws, filling its box.',
        oneOf: [
          variant('circle', 'A filled ellipse, or with `sweep` below 2π the part of it cut off by a chord.', {
            startAngle,
            sweep: sweep('the arc'),
          }),
          variant('rect', 'A filled rectangle.', {
            cornerRadius: num('Corner radius as a fraction of the shorter side of the element, 0 to 0.5.'),
          }),
          variant(
            'ring',
            'A stroked circle, or arcs of it. strokeStart and strokeEnd trim every arc.',
            {
              strokeWidth: num('Stroke width as a fraction of the shorter side of the element.'),
              startAngle: num('Where the first arc starts, default -π/2 (the top). Arcs go clockwise.'),
              sweep: sweep('each arc'),
              segments: num('Number of arcs, evenly spaced around the circle. Default 1.'),
            },
            ['strokeWidth']
          ),
          variant('triangle', 'An isosceles triangle pointing up, filling the element.', {}),
          variant('line', 'A bar with fully rounded ends.', {}),
        ],
      },
      easing: {
        anyOf: [
          { enum: easingNames, description: 'A named easing. `ease` is the CSS default.' },
          {
            type: 'array',
            description: 'A cubic bezier `[x1, y1, x2, y2]`, like CSS cubic-bezier().',
            items: [
              { type: 'number', minimum: 0, maximum: 1 },
              { type: 'number' },
              { type: 'number', minimum: 0, maximum: 1 },
              { type: 'number' },
            ],
            minItems: 4,
            maxItems: 4,
          },
        ],
      },
      track: track(animatable, 'Keyframes of one element property over one cycle.'),
      groupTrack: track(GROUP_PROPERTIES, 'Keyframes of one group property over the group cycle.'),
    },
  };
}
