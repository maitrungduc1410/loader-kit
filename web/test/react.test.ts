import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { installFrameworkDom, type LoaderKitTestElement } from './support/framework-dom.ts';

const env = installFrameworkDom();
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
const { act, createElement, createRef, StrictMode } = await import('react');
const { createRoot } = await import('react-dom/client');
const { LoaderKit } = await import('../src/react.ts');
type Props = Parameters<typeof LoaderKit>[0];

after(() => env.close());

function render(props: Props) {
  const container = env.container();
  const root = createRoot(container);
  act(() => root.render(createElement(LoaderKit, props)));
  const element = container.querySelector('loader-kit') as unknown as LoaderKitTestElement;
  return {
    element,
    update: (next: Props) => act(() => root.render(createElement(LoaderKit, next))),
    unmount: () => act(() => root.unmount()),
  };
}

test('renders an upgraded <loader-kit> that draws the indicator with its params', () => {
  const { element, unmount } = render({ indicator: 'BallSpinFadeLoader', params: { count: 5 }, speed: 2 });
  assert.equal(element.localName, 'loader-kit');
  assert.equal(element.shadowRoot !== null, true, 'the element is defined by importing the component');
  assert.equal(element.indicator, 'BallSpinFadeLoader');
  assert.equal(element.speed, 2);
  assert.equal(env.paints(element).length, 5);
  assert.equal(element.getAttribute('role'), 'progressbar');
  assert.equal(element.getAttribute('aria-label'), 'Loading');
  unmount();
});

test('className, style, size and other attributes reach the element; the ref is the element', () => {
  const ref = createRef<unknown>();
  const { element, unmount } = render({
    ref: ref as Props['ref'],
    className: 'spinner',
    size: 48,
    style: { margin: 4 },
    id: 'busy',
    'aria-label': 'Saving',
  });
  assert.equal(ref.current, element);
  assert.equal(element.getAttribute('class'), 'spinner');
  assert.equal(element.style.width, '48px');
  assert.equal(element.style.height, '48px');
  assert.equal(element.style.margin, '4px');
  assert.equal(element.id, 'busy');
  assert.equal(element.getAttribute('aria-label'), 'Saving');
  unmount();
});

test('prop changes update the element, and a prop that goes away resets to the default', () => {
  const { element, update, unmount } = render({ indicator: 'LineScale', speed: 0.5, color: 'red', colors: ['red', 'rgb(0, 0, 255)'] });
  assert.deepEqual(element.colors, ['red', 'rgb(0, 0, 255)']);
  update({ indicator: 'BallPulse', speed: 3, cycleProgress: 0.25 });
  assert.equal(element.indicator, 'BallPulse');
  assert.equal(element.speed, 3);
  assert.equal(element.cycleProgress, 0.25);
  assert.equal(element.color, null);
  assert.equal(element.colors, null);
  update({});
  assert.equal(element.speed, 1);
  assert.equal(element.cycleProgress, null);
  assert.equal(element.animating, true);
  unmount();
});

test('stopping: animating false hides the indicator and sets aria-hidden', () => {
  const { element, update, unmount } = render({ animating: false });
  assert.equal(element.animating, false);
  assert.equal(element.getAttribute('aria-hidden'), 'true');
  assert.equal(env.paints(element).length, 0);
  update({ animating: false, hidesWhenStopped: false });
  assert.equal(element.hasAttribute('aria-hidden'), false);
  assert.equal(env.paints(element).length, 3);
  update({ animating: true });
  assert.equal(element.animating, true);
  update({ animating: false });
  assert.equal(element.getAttribute('aria-hidden'), 'true');
  update({});
  assert.equal(element.hasAttribute('aria-hidden'), false);
  assert.equal(env.paints(element).length, 3);
  unmount();
});

test('an equal spec object on every render does not restart the animation', () => {
  const spec = () => ({
    schemaVersion: 1,
    name: 'Dot',
    duration: 1,
    layout: { type: 'single' },
    shape: { type: 'circle' },
    tracks: [{ property: 'scale', keyTimes: [0, 1], values: [0, 1] }],
  });
  const { element, update, unmount } = render({ spec: spec() as Props['spec'] });
  for (let i = 0; i < 10; i++) env.paints(element);
  const time = element.time;
  assert.ok(time > 0);
  update({ spec: spec() as Props['spec'] });
  assert.ok(element.time >= time, 'the clock kept running');
  unmount();
});

test('onError reports a bad indicator, including one present on the first render, and the recovery', () => {
  const messages: (string | null)[] = [];
  const onError = (message: string | null) => messages.push(message);
  const { update, unmount } = render({ indicator: 'Nope', onError });
  assert.equal(messages.length, 1);
  assert.match(messages[0]!, /Nope/);
  update({ indicator: 'BallPulse', onError });
  assert.deepEqual(messages.slice(1), [null]);
  unmount();
});

test('onError reports a problem on the first render once under Strict Mode', () => {
  const messages: (string | null)[] = [];
  const container = env.container();
  const root = createRoot(container);
  const tree = (indicator: string) =>
    createElement(StrictMode, null, createElement(LoaderKit, { indicator, onError: (message) => messages.push(message) }));
  act(() => root.render(tree('Nope')));
  assert.equal(messages.length, 1);
  assert.match(messages[0]!, /Nope/);
  act(() => root.render(tree('BallPulse')));
  assert.deepEqual(messages.slice(1), [null]);
  act(() => root.unmount());
});

test('unmounting stops the frame loop and removes the observers', () => {
  const before = env.observed();
  const { element, unmount } = render({});
  env.paints(element);
  assert.ok(env.observed() > before);
  unmount();
  env.tick();
  assert.equal(env.pendingFrames(), 0);
  assert.equal(env.observed(), before);
});

test('hydrates server markup without mismatches, after the element has upgraded', async () => {
  const { renderToString } = await import('react-dom/server');
  const { hydrateRoot } = await import('react-dom/client');
  const props: Props = { indicator: 'LineScale', params: { count: 4 }, animating: false, size: 32, className: 'spinner' };
  const container = env.container();
  container.innerHTML = renderToString(createElement(LoaderKit, props));
  const element = container.querySelector('loader-kit') as unknown as LoaderKitTestElement;
  assert.equal(element.shadowRoot !== null, true, 'upgraded before hydration');

  const problems: unknown[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => problems.push(args);
  try {
    let root: ReturnType<typeof hydrateRoot> | undefined;
    act(() => {
      root = hydrateRoot(container, createElement(LoaderKit, props), { onRecoverableError: (error) => problems.push(error) });
    });
    assert.deepEqual(problems, []);
    assert.equal(container.querySelector('loader-kit'), element, 'the server element is kept');
    act(() => root!.unmount());
  } finally {
    console.error = original;
  }
});

test('hydration reports onError once for a bad indicator the server rendered', async () => {
  const { renderToString } = await import('react-dom/server');
  const { hydrateRoot } = await import('react-dom/client');
  const messages: (string | null)[] = [];
  const tree = createElement(LoaderKit, { indicator: 'Nope', onError: (message) => messages.push(message) });
  const container = env.container();
  container.innerHTML = renderToString(tree);
  let root: ReturnType<typeof hydrateRoot> | undefined;
  act(() => {
    root = hydrateRoot(container, tree);
  });
  assert.equal(messages.length, 1);
  assert.match(messages[0]!, /Nope/);
  act(() => root!.unmount());
});
