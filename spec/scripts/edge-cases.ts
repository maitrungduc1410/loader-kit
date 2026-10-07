// Synthetic specs that cover rules the built-in indicators do not exercise yet.
import { defineIndicator, param, type IndicatorSpec, type Params } from '../src/index.ts';
import { SCHEMA_URL } from './schema.ts';

export interface VectorSource {
  id: string;
  description: string;
  spec: IndicatorSpec;
  params?: Params;
}

export const EDGE_CASES: VectorSource[] = [
  {
    id: 'edge-keytimes',
    description:
      'keyTimes that start after 0 and end before 1 (values hold), a zero-length segment (jump), one named easing per segment and a $schema field that engines ignore',
    spec: {
      $schema: SCHEMA_URL,
      ...defineIndicator({
        name: 'EdgeKeyTimes',
        duration: 2,
        layout: { type: 'single', size: 0.5 },
        shape: { type: 'circle' },
        tracks: [
          {
            property: 'translateX',
            keyTimes: [0.2, 0.5, 0.5, 0.8],
            values: [0, 0.25, -0.1, 0.2],
            easing: ['easeIn', 'linear', 'easeOut'],
          },
        ],
      }),
    },
  },
  {
    id: 'edge-grid',
    description: 'grid layout with an explicit stagger array and a full turn with a single named easing',
    spec: defineIndicator({
      name: 'EdgeGrid',
      duration: 1.5,
      layout: { type: 'grid', columns: 3, rows: 2, gap: 0.1 },
      shape: { type: 'rect', cornerRadius: 0.2 },
      stagger: [0, 0.1, 0.2, 0.3, 0.4, 0.5],
      tracks: [{ property: 'rotate', keyTimes: [0, 1], values: [0, 2 * Math.PI], easing: 'easeInOut' }],
    }),
  },
  {
    id: 'edge-ring-orient',
    description: 'ring layout with orient, a param start angle and a count overridden to 5',
    spec: defineIndicator({
      name: 'EdgeRingOrient',
      duration: 1.2,
      params: { count: 12, start: -Math.PI / 2, low: 0.25 },
      layout: { type: 'ring', count: param('count'), itemSize: 0.2, startAngle: param('start'), orient: true },
      shape: { type: 'line' },
      stagger: { each: 0.1 },
      tracks: [{ property: 'opacity', keyTimes: [0, 0.5, 1], values: [1, param('low'), 1], easing: 'easeOut' }],
    }),
    params: { count: 5 },
  },
  {
    id: 'edge-combined-scale',
    description: 'row with itemHeight, scale combined with scaleY, translateY and a bezier that overshoots',
    spec: defineIndicator({
      name: 'EdgeCombinedScale',
      duration: 0.9,
      params: { height: 1 },
      layout: { type: 'row', count: 4, gap: 0.08, itemHeight: param('height') },
      shape: { type: 'line' },
      stagger: { each: 0.15, start: 0.05 },
      tracks: [
        { property: 'scale', keyTimes: [0, 0.5, 1], values: [1, 0.8, 1] },
        { property: 'scaleY', keyTimes: [0, 0.5, 1], values: [1, 0.4, 1], easing: [0.68, -0.55, 0.27, 1.55] },
        { property: 'translateY', keyTimes: [0, 0.25, 0.75, 1], values: [0, -0.1, 0.1, 0] },
      ],
    }),
    params: { height: 0.6 },
  },
  {
    id: 'edge-parts',
    description:
      'two parts: group tracks with a part duration, rest values from a param, a centered row with itemWidth; a stack with its own place and size, per-element durations, a negative stagger and trimmed ring arcs from params',
    spec: defineIndicator({
      name: 'EdgeParts',
      duration: 1,
      params: { dim: 0.4, arcs: 3, arc: Math.PI / 3 },
      parts: [
        {
          layout: { type: 'row', count: 3, gap: 0.1, itemWidth: 0.15 },
          shape: { type: 'circle' },
          duration: 2,
          rest: { opacity: param('dim'), translateY: 0.1 },
          tracks: [{ property: 'scaleY', keyTimes: [0, 0.5, 1], values: [1, 0.5, 1], easing: 'ease' }],
          groupTracks: [
            { property: 'rotate', keyTimes: [0, 1], values: [0, Math.PI], easing: 'easeIn' },
            { property: 'scaleX', keyTimes: [0, 0.5, 1], values: [1, 0.5, 1] },
            { property: 'translateX', keyTimes: [0, 0.5, 1], values: [0, 0.1, 0] },
            { property: 'opacity', keyTimes: [0, 1], values: [1, 0.5] },
          ],
        },
        {
          layout: { type: 'stack', count: 2, width: 0.4, height: 0.3, x: 0.3, y: 0.7 },
          shape: { type: 'ring', strokeWidth: 0.2, startAngle: 0, sweep: param('arc'), segments: param('arcs') },
          durations: [0.5, 0.8],
          stagger: [0, -0.3],
          rest: { strokeEnd: 0.9 },
          tracks: [
            { property: 'strokeStart', keyTimes: [0, 1], values: [0, 0.5], easing: 'easeOut' },
            { property: 'rotate', keyTimes: [0, 1], values: [0, -Math.PI] },
          ],
        },
      ],
    }),
    params: { arcs: 2.4 },
  },
  {
    id: 'edge-ring-items',
    description: 'ring layout with itemWidth and itemHeight, a circle cut by a chord, and the named ease easing',
    spec: defineIndicator({
      name: 'EdgeRingItems',
      duration: 0.8,
      layout: { type: 'ring', count: 6, itemSize: 0.3, itemWidth: 0.1, itemHeight: 0.25, startAngle: Math.PI / 6 },
      shape: { type: 'circle', startAngle: Math.PI, sweep: Math.PI },
      stagger: { each: -0.05, start: 0.3 },
      tracks: [{ property: 'translateX', keyTimes: [0, 0.4, 1], values: [0, 0.05, 0], easing: ['ease', 'easeInOut'] }],
    }),
  },
];
