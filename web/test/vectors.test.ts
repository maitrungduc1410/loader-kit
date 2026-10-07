import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { ElementState, IndicatorSpec, Params, ResolvedShape } from '@loader-kit/spec';
import { drawIndicator, prepare } from '../src/index.ts';
import { RecordingContext } from './support/recording-context.ts';

const dir = new URL('../../test-vectors/', import.meta.url);
const index = JSON.parse(readFileSync(new URL('index.json', dir), 'utf8')) as { tolerance: number; files: string[] };

interface Vector {
  spec: IndicatorSpec;
  params: Params;
  samples: { t: number; elements: ElementState[] }[];
  cycleProgress: { cycleProgress: number; t: number }[];
}

/** Paints SPEC sections 4 and 9 expect for one element: one per shape, one per visible ring arc. */
function expectedPaints(state: ElementState, shape: ResolvedShape, side: number): number {
  if (!(Math.min(1, Math.max(0, state.opacity)) > 0)) return 0;
  const w = state.width * side;
  const h = state.height * side;
  const shorter = Math.min(w, h);
  if (shape.type === 'ring') {
    const s = Math.min(1, Math.max(0, state.strokeStart));
    const e = Math.min(1, Math.max(0, state.strokeEnd));
    const stroke = shape.strokeWidth * shorter;
    const sweep = Math.min(2 * Math.PI, Math.max(0, shape.sweep)) * (e - s);
    if (!(e > s) || !(stroke > 0) || !(stroke < shorter) || !(sweep > 0)) return 0;
    return sweep >= 2 * Math.PI - 1e-9 ? 1 : shape.segments;
  }
  if (!(w > 0) || !(h > 0)) return 0;
  if (shape.type === 'circle' && !(shape.sweep > 0)) return 0;
  return 1;
}

for (const file of index.files) {
  test(`test vector ${file} draws every visible element`, () => {
    const vector = JSON.parse(readFileSync(new URL(file, dir), 'utf8')) as Vector;
    const prepared = prepare({ spec: vector.spec }, vector.params);
    const times = [...vector.samples.map((sample) => sample.t), ...vector.cycleProgress.map((entry) => entry.t)];
    for (const [width, height] of [[64, 64], [120, 48]] as const) {
      for (const t of times) {
        const ctx = new RecordingContext();
        ctx.arcResolution = 64;
        drawIndicator(ctx.context, prepared, t, { width, height, color: '#000', colors: ['#f00', '#0f0'] });
        const states = prepared.evaluate(t);
        const side = Math.min(width, height);
        const expected = states.reduce((sum, state) => sum + expectedPaints(state, prepared.parts[state.part]!.shape, side), 0);
        assert.equal(ctx.paints.length, expected, `${file} t=${t} ${width}x${height}`);
        for (const [x, y] of ctx.allPoints()) assert.ok(Number.isFinite(x) && Number.isFinite(y), `${file} t=${t} finite`);
      }
    }
    for (const { cycleProgress, t } of vector.cycleProgress) {
      assert.ok(Math.abs(prepared.timeForCycleProgress(cycleProgress) - t) <= index.tolerance);
    }
  });
}

test('the vectors cover every shape, both draw paths and ring trims', () => {
  const seen = new Set<string>();
  for (const file of index.files) {
    const vector = JSON.parse(readFileSync(new URL(file, dir), 'utf8')) as Vector;
    const prepared = prepare({ spec: vector.spec }, vector.params);
    for (const sample of vector.samples) {
      for (const state of sample.elements) {
        const shape = prepared.parts[state.part]!.shape;
        seen.add(shape.type);
        if (state.rotateX !== 0 || state.rotateY !== 0) seen.add(`${shape.type} projected`);
        if (shape.type === 'ring' && (state.strokeStart > 0 || state.strokeEnd < 1)) seen.add('ring trimmed');
        if (shape.type === 'circle' && shape.sweep < 2 * Math.PI) seen.add('circle chord');
      }
    }
  }
  for (const kind of ['circle', 'rect', 'ring', 'triangle', 'line', 'rect projected', 'triangle projected', 'ring trimmed', 'circle chord']) {
    assert.ok(seen.has(kind), `${kind} in ${[...seen].join(', ')}`);
  }
});
