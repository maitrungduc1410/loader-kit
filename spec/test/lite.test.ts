import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as full from '../src/index.ts';
import * as lite from '../src/lite.ts';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const folder = JSON.parse(readFileSync(new URL('../lite/package.json', import.meta.url), 'utf8'));

test('the names list matches the built-in specs, in order', () => {
  assert.deepEqual(full.BUILTIN_INDICATOR_NAMES, Object.keys(full.BUILTIN_INDICATORS));
});

test('the lite entry is the main entry without the built-in specs and the progress drawing code', () => {
  for (const [name, value] of Object.entries(lite)) assert.equal(value, (full as Record<string, unknown>)[name], name);
  const missing = Object.keys(full).filter((name) => !(name in lite)).sort();
  assert.deepEqual(missing, [
    'BUILTIN_INDICATORS',
    'ProgressAnimator',
    'progressCommands',
    'progressGridOrder',
    'progressHasAmbientMotion',
    'progressLabel',
  ]);
});

test('the lite entry does not reach the built-in specs or the progress drawing code', () => {
  const seen = new Set<string>();
  const visit = (url: URL) => {
    if (seen.has(url.href)) return;
    seen.add(url.href);
    for (const match of readFileSync(url, 'utf8').matchAll(/(?:\bfrom\s+|\bimport\s*\(?\s*)'(\.[^']+)'/g)) {
      visit(new URL(match[1]!, url));
    }
  };
  visit(new URL('../src/lite.ts', import.meta.url));
  const reached = [...seen].map((href) => href.slice(href.indexOf('/src/') + 5));
  assert.ok(reached.includes('indicators/names.ts'));
  assert.ok(reached.includes('progress/resolve.ts'));
  for (const file of reached) {
    assert.ok(!/^indicators\/(?!names\.ts$)|^progress\/(animator|geometry|index)\.ts$/.test(file), file);
  }
});

test('the lite folder points at the same files as the ./lite export', () => {
  const entry = pkg.exports['./lite'];
  assert.ok(pkg.files.includes('lite'));
  assert.equal(`./${folder.main.slice(3)}`, entry.require.default);
  assert.equal(`./${folder.module.slice(3)}`, entry.import.default);
  assert.equal(`./${folder.types.slice(3)}`, entry.import.types);
  assert.equal(entry.require.types, entry.require.default.replace(/\.js$/, '.d.ts'));
});
