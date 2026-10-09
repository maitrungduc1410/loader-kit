import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { installFrameworkDom } from './support/framework-dom.ts';

const env = installFrameworkDom();
after(() => env.close());

const source = (file: string) => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');

test('the React and Vue entry points only re-export, so bundlers can drop an unused component', () => {
  for (const file of ['react.ts', 'vue.ts']) {
    const statements = source(file).split('\n').filter((line) => line && !line.startsWith('//') && line !== "'use client';");
    for (const line of statements) assert.match(line, /^export (type )?\{[^}]*\} from '[^']+';$/, `${file}: ${line}`);
  }
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.deepEqual(
    [...pkg.sideEffects].sort(),
    ['./dist/cjs/element.js', './dist/cjs/progress-element.js', './dist/esm/element.js', './dist/esm/progress-element.js', './src/element.ts', './src/progress-element.ts'],
  );
});

test('each component module imports the element of its own component only', () => {
  const elements = (file: string) => [...source(file).matchAll(/^import\s+'\.\/((?:progress-)?element)\.ts';/gm)].map((m) => m[1]);
  assert.deepEqual(elements('react-loader-kit.ts'), ['element']);
  assert.deepEqual(elements('vue-loader-kit.ts'), ['element']);
  assert.deepEqual(elements('react-progress.ts'), ['progress-element']);
  assert.deepEqual(elements('vue-progress.ts'), ['progress-element']);
});

test('the progress components define only <loader-kit-progress>', async () => {
  await import('../src/react-progress.ts');
  await import('../src/vue-progress.ts');
  assert.notEqual(customElements.get('loader-kit-progress'), undefined);
  assert.equal(customElements.get('loader-kit'), undefined);
});

test('the indicator components define <loader-kit>', async () => {
  await import('../src/react-loader-kit.ts');
  await import('../src/vue-loader-kit.ts');
  assert.notEqual(customElements.get('loader-kit'), undefined);
});
