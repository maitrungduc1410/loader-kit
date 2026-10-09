import assert from 'node:assert/strict';
import { test } from 'node:test';

test('both entries import without DOM globals', async () => {
  for (const name of ['window', 'document', 'HTMLElement', 'customElements', 'requestAnimationFrame']) {
    assert.equal(name in globalThis, false, `${name} is not defined in plain Node`);
  }
  const web = await import('../src/index.ts');
  assert.equal(typeof web.LoaderKitView, 'function');
  assert.equal(web.BUILTIN_INDICATOR_NAMES.length, 50);
  assert.deepEqual(web.validate({}).length > 0, true);
  assert.equal(web.prepare({ indicator: 'BallPulse' }).elementCount, 3);

  const element = await import('../src/element.ts');
  assert.equal(typeof element.LoaderKitElement, 'function');
  assert.equal(element.defineLoaderKitElement(), undefined);

  assert.equal(typeof web.LoaderKitProgressView, 'function');
  const progress = await import('../src/progress-element.ts');
  assert.equal(typeof progress.LoaderKitProgressElement, 'function');
  assert.equal(progress.defineLoaderKitProgressElement(), undefined);
});
