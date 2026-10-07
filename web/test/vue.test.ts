import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { installFrameworkDom, type LoaderKitTestElement } from './support/framework-dom.ts';

const env = installFrameworkDom();
const { createApp, h, nextTick, reactive, ref } = await import('vue');
const { LoaderKit } = await import('../src/vue.ts');

after(() => env.close());

async function render(initial: Record<string, unknown>) {
  const props = reactive({ ...initial });
  const component = ref<{ element: unknown } | null>(null);
  const container = env.container();
  const app = createApp({ render: () => h(LoaderKit, { ...props, ref: component }) });
  app.mount(container);
  await nextTick();
  const element = container.querySelector('loader-kit') as unknown as LoaderKitTestElement;
  return {
    element,
    component,
    async update(next: Record<string, unknown>) {
      for (const key of Object.keys(props)) delete props[key];
      Object.assign(props, next);
      await nextTick();
    },
    unmount: () => app.unmount(),
  };
}

test('renders an upgraded <loader-kit> that draws the indicator with its params', async () => {
  const { element, unmount } = await render({ indicator: 'BallSpinFadeLoader', params: { count: 5 }, speed: 2 });
  assert.equal(element.shadowRoot !== null, true, 'the element is defined by importing the component');
  assert.equal(element.indicator, 'BallSpinFadeLoader');
  assert.equal(element.speed, 2);
  assert.equal(env.paints(element).length, 5);
  assert.equal(element.getAttribute('role'), 'progressbar');
  assert.equal(element.getAttribute('aria-label'), 'Loading');
  unmount();
});

test('class, style, size and other attributes fall through; the exposed element is the element', async () => {
  const { element, component, unmount } = await render({
    class: 'spinner',
    size: '3rem',
    style: { margin: '4px' },
    id: 'busy',
    'aria-label': 'Saving',
  });
  assert.equal(component.value?.element, element);
  assert.equal(element.getAttribute('class'), 'spinner');
  assert.equal(element.style.width, '3rem');
  assert.equal(element.style.margin, '4px');
  assert.equal(element.id, 'busy');
  assert.equal(element.getAttribute('aria-label'), 'Saving');
  unmount();
});

test('prop changes update the element, and a prop that goes away resets to the default', async () => {
  const { element, update, unmount } = await render({ indicator: 'LineScale', speed: 0.5, colors: ['red', 'rgb(0, 0, 255)'] });
  assert.deepEqual(element.colors, ['red', 'rgb(0, 0, 255)']);
  await update({ indicator: 'BallPulse', speed: 3, cycleProgress: 0.25, color: 'red' });
  assert.equal(element.indicator, 'BallPulse');
  assert.equal(element.speed, 3);
  assert.equal(element.cycleProgress, 0.25);
  assert.equal(element.color, 'red');
  assert.equal(element.colors, null);
  await update({});
  assert.equal(element.speed, 1, 'not 0, which would pause');
  assert.equal(element.cycleProgress, null);
  assert.equal(element.color, null);
  assert.equal(element.animating, true);
  unmount();
});

test('stopping: animating false hides the indicator and sets aria-hidden', async () => {
  const { element, update, unmount } = await render({ animating: false });
  assert.equal(element.animating, false);
  assert.equal(element.getAttribute('aria-hidden'), 'true');
  assert.equal(env.paints(element).length, 0);
  await update({ animating: false, hidesWhenStopped: false });
  assert.equal(element.hasAttribute('aria-hidden'), false);
  assert.equal(env.paints(element).length, 3);
  await update({ animating: false });
  assert.equal(element.getAttribute('aria-hidden'), 'true');
  await update({});
  assert.equal(element.animating, true);
  assert.equal(element.hasAttribute('aria-hidden'), false);
  unmount();
});

test('an equal spec object on every render does not restart the animation', async () => {
  const spec = () => ({
    schemaVersion: 1,
    name: 'Dot',
    duration: 1,
    layout: { type: 'single' },
    shape: { type: 'circle' },
    tracks: [{ property: 'scale', keyTimes: [0, 1], values: [0, 1] }],
  });
  const { element, update, unmount } = await render({ spec: spec() });
  for (let i = 0; i < 10; i++) env.paints(element);
  const time = element.time;
  assert.ok(time > 0);
  await update({ spec: spec() });
  assert.ok(element.time >= time, 'the clock kept running');
  unmount();
});

test('emits error for a bad indicator, including one present on the first render, and the recovery', async () => {
  const messages: (string | null)[] = [];
  const onError = (message: string | null) => messages.push(message);
  const { update, unmount } = await render({ indicator: 'Nope', onError });
  assert.equal(messages.length, 1);
  assert.match(messages[0]!, /Nope/);
  await update({ indicator: 'BallPulse', onError });
  assert.deepEqual(messages.slice(1), [null]);
  unmount();
});

test('unmounting stops the frame loop and removes the observers', async () => {
  const before = env.observed();
  const { element, unmount } = await render({});
  env.paints(element);
  assert.ok(env.observed() > before);
  unmount();
  env.tick();
  assert.equal(env.pendingFrames(), 0);
  assert.equal(env.observed(), before);
});

test('hydrates server markup without mismatches, after the element has upgraded', async () => {
  const { createSSRApp } = await import('vue');
  const { renderToString } = await import('vue/server-renderer');
  const props = { indicator: 'LineScale', params: { count: 4 }, animating: false, size: 32, class: 'spinner' };
  const app = () => createSSRApp({ render: () => h(LoaderKit, props) });
  const container = env.container();
  container.innerHTML = await renderToString(app());
  const element = container.querySelector('loader-kit') as unknown as LoaderKitTestElement;
  assert.equal(element.shadowRoot !== null, true, 'upgraded before hydration');

  const problems: unknown[] = [];
  const original = { warn: console.warn, error: console.error };
  console.warn = console.error = (...args: unknown[]) => problems.push(args);
  try {
    const client = app();
    client.mount(container);
    await nextTick();
    assert.deepEqual(problems, []);
    assert.equal(container.querySelector('loader-kit'), element, 'the server element is kept');
    client.unmount();
  } finally {
    Object.assign(console, original);
  }
});

test('hydration emits error once for a bad indicator the server rendered', async () => {
  const { createSSRApp } = await import('vue');
  const { renderToString } = await import('vue/server-renderer');
  const messages: (string | null)[] = [];
  const app = () => createSSRApp({ render: () => h(LoaderKit, { indicator: 'Nope', onError: (message: string | null) => messages.push(message) }) });
  const container = env.container();
  container.innerHTML = await renderToString(app());
  const client = app();
  client.mount(container);
  await nextTick();
  assert.equal(messages.length, 1);
  assert.match(messages[0]!, /Nope/);
  client.unmount();
});
