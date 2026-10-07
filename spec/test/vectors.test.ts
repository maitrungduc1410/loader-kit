import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { evaluate, timeForCycleProgress, validate, type IndicatorSpec, type Params } from '../src/index.ts';

const dir = new URL('../../test-vectors/', import.meta.url);
const index = JSON.parse(readFileSync(new URL('index.json', dir), 'utf8')) as { tolerance: number; files: string[] };

interface Vector {
  spec: IndicatorSpec;
  params: Params;
  samples: { t: number; elements: Record<string, number>[] }[];
  cycleProgress: { cycleProgress: number; t: number }[];
}

for (const file of index.files) {
  test(`test vector ${file}`, () => {
    const vector = JSON.parse(readFileSync(new URL(file, dir), 'utf8')) as Vector;
    assert.deepEqual(validate(vector.spec), []);
    for (const { t, elements } of vector.samples) {
      const actual = evaluate(vector.spec, t, vector.params);
      assert.equal(actual.length, elements.length);
      actual.forEach((state, i) => {
        for (const [key, expected] of Object.entries(elements[i]!)) {
          const value = state[key as keyof typeof state];
          assert.ok(Math.abs(value - expected) <= index.tolerance, `${file} t=${t} #${i} ${key}: ${value} != ${expected}`);
        }
      });
    }
    for (const { cycleProgress, t } of vector.cycleProgress) {
      assert.ok(Math.abs(timeForCycleProgress(vector.spec, cycleProgress, vector.params) - t) <= index.tolerance);
    }
  });
}
