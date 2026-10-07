import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createEnvironment } from './support/dom.ts';

const env = createEnvironment();
const globals = globalThis as Record<string, unknown>;
globals.HTMLElement = env.window.HTMLElement;
globals.customElements = env.window.customElements;
globals.CustomEvent = env.window.CustomEvent;
const { LoaderKitElement, defineLoaderKitElement, splitColors } = await import('../src/element.ts');
type Element = InstanceType<typeof LoaderKitElement>;

after(() => env.close());

function mount(html: string): { element: Element; canvas: HTMLCanvasElement; paints: () => { style: string }[] } {
  const container = env.document.createElement('div');
  container.innerHTML = html;
  const element = container.firstElementChild as unknown as Element;
  env.document.body.appendChild(container);
  const canvas = element.shadowRoot!.querySelector('canvas') as unknown as HTMLCanvasElement;
  env.resize(canvas, 40, 40);
  const ctx = env.contextOf(canvas);
  return {
    element,
    canvas,
    paints: () => {
      ctx.paints.length = 0;
      env.tick();
      return ctx.paints;
    },
  };
}

test('importing the entry registers <loader-kit>', () => {
  assert.equal(env.window.customElements.get('loader-kit'), LoaderKitElement as unknown);
  assert.equal(defineLoaderKitElement(), LoaderKitElement);
  const Other = defineLoaderKitElement('my-loader')!;
  assert.notEqual(Other, LoaderKitElement);
  assert.ok(Other.prototype instanceof LoaderKitElement);
  assert.equal(defineLoaderKitElement('my-loader'), Other);
});

test('shadow DOM with a 40px inline-block :host, strict containment and a full-size canvas', () => {
  const { element } = mount('<loader-kit></loader-kit>');
  const style = element.shadowRoot!.querySelector('style')!.textContent!;
  assert.match(style, /:host \{ display: inline-block; width: 40px; height: 40px; contain: strict; \}/);
  assert.match(style, /:host\(\[hidden\]\) \{ display: none; \}/);
  assert.match(style, /canvas \{ display: block; width: 100%; height: 100%; \}/);
  assert.equal(element.shadowRoot!.querySelector('canvas')!.getAttribute('part'), 'canvas');
});

test('accessibility: progressbar with a Loading label unless the page sets one', () => {
  const { element } = mount('<loader-kit></loader-kit>');
  assert.equal(element.getAttribute('role'), 'progressbar');
  assert.equal(element.getAttribute('aria-label'), 'Loading');
  assert.equal(element.hasAttribute('aria-valuenow'), false);
  assert.equal(mount('<loader-kit role="status" aria-label="Saving"></loader-kit>').element.getAttribute('aria-label'), 'Saving');
  assert.equal(mount('<loader-kit role="status"></loader-kit>').element.getAttribute('role'), 'status');
  assert.equal(mount('<loader-kit aria-labelledby="x"></loader-kit>').element.hasAttribute('aria-label'), false);
});

test('aria-hidden while stopped and hidden', () => {
  const { element, paints } = mount('<loader-kit animating="false"></loader-kit>');
  assert.equal(element.getAttribute('aria-hidden'), 'true');
  assert.equal(paints().length, 0);
  element.start();
  assert.equal(element.hasAttribute('aria-hidden'), false);
  assert.equal(paints().length, 3);
  element.hidesWhenStopped = false;
  element.stop();
  assert.equal(element.hasAttribute('aria-hidden'), false);
  assert.equal(paints().length, 3);
});

test('attributes set the properties', () => {
  const { element, paints } = mount(
    `<loader-kit indicator="BallPulse" params='{"count":4}' color="#7c3aed" speed="1.5" cycle-progress="0.25"
       hides-when-stopped="false" animating="false" respects-reduce-motion="false"></loader-kit>`,
  );
  assert.equal(element.indicator, 'BallPulse');
  assert.equal(element.params, '{"count":4}');
  assert.equal(element.color, '#7c3aed');
  assert.equal(element.speed, 1.5);
  assert.equal(element.cycleProgress, 0.25);
  assert.equal(element.hidesWhenStopped, false);
  assert.equal(element.animating, false);
  assert.equal(element.respectsReduceMotion, false);
  const drawn = paints();
  assert.equal(drawn.length, 4);
  assert.ok(drawn.every((paint) => paint.style === '#7c3aed'));

  element.setAttribute('colors', 'rgb(244, 63, 94), #f59e0b ,hsl(160 84% 39%)');
  assert.deepEqual(element.colors, ['rgb(244, 63, 94)', '#f59e0b', 'hsl(160 84% 39%)']);
  assert.deepEqual(paints().map((paint) => paint.style), ['rgb(244, 63, 94)', '#f59e0b', 'hsl(160 84% 39%)', 'rgb(244, 63, 94)']);

  for (const name of ['indicator', 'params', 'color', 'colors', 'speed', 'cycle-progress', 'hides-when-stopped', 'animating', 'respects-reduce-motion']) {
    element.removeAttribute(name);
  }
  assert.deepEqual(
    [element.indicator, element.params, element.color, element.colors, element.speed, element.cycleProgress, element.hidesWhenStopped, element.animating, element.respectsReduceMotion],
    ['BallPulse', null, null, null, 1, null, true, true, true],
  );
});

test('attribute values that do not parse fall back to the defaults', () => {
  const { element } = mount('<loader-kit speed="fast" cycle-progress="" animating="" colors=" , "></loader-kit>');
  assert.equal(element.speed, 1);
  assert.equal(element.cycleProgress, null);
  assert.equal(element.animating, true, 'only "false" stops');
  assert.equal(element.colors, null);
  element.setAttribute('speed', '0');
  assert.equal(element.speed, 0);
});

test('boolean properties read the string "false" like the attributes do', () => {
  const { element } = mount('<loader-kit></loader-kit>');
  const flags = element as unknown as Record<'animating' | 'hidesWhenStopped' | 'respectsReduceMotion', unknown>;
  flags.animating = 'false';
  flags.hidesWhenStopped = 'false';
  flags.respectsReduceMotion = 'false';
  assert.deepEqual([element.animating, element.hidesWhenStopped, element.respectsReduceMotion], [false, false, false]);
  flags.animating = 'true';
  flags.hidesWhenStopped = '';
  assert.deepEqual([element.animating, element.hidesWhenStopped], [true, true]);
  flags.animating = 0;
  assert.equal(element.animating, false);
});

test('the spec attribute is JSON and wins over indicator; properties accept objects and do not reflect', () => {
  const spec = {
    schemaVersion: 1,
    name: 'Two',
    duration: 1,
    layout: { type: 'row', count: 2, gap: 0.1 },
    shape: { type: 'rect' },
    tracks: [{ property: 'opacity', keyTimes: [0, 1], values: [1, 0.5] }],
  };
  const { element, paints } = mount(`<loader-kit indicator="BallBeat" spec='${JSON.stringify(spec)}'></loader-kit>`);
  assert.equal(paints().length, 2);
  element.spec = { ...spec, layout: { type: 'row', count: 5, gap: 0 } } as never;
  assert.equal(paints().length, 5);
  assert.equal(element.getAttribute('spec'), JSON.stringify(spec), 'properties do not write attributes');
  element.params = { count: 2 } as never;
  element.spec = null;
  assert.equal(paints().length, 3, 'BallBeat has no count param');
  element.indicator = 'BallPulse';
  assert.equal(paints().length, 2);
  element.colors = ['red'];
  assert.deepEqual(element.colors, ['red']);
  element.colors = 'red, blue' as never;
  assert.deepEqual(element.colors, ['red', 'blue']);
});

test('loaderkit-error carries the message, then null on recovery; specError follows', () => {
  const container = env.document.createElement('div');
  container.innerHTML = '<loader-kit indicator="Nope"></loader-kit>';
  const element = container.firstElementChild as unknown as Element;
  const events: { message: string | null; bubbles: boolean }[] = [];
  container.addEventListener('loaderkit-error', (event) => {
    events.push({ message: (event as unknown as CustomEvent).detail.message, bubbles: event.bubbles });
  });
  env.document.body.appendChild(container);
  assert.equal(events.length, 1);
  assert.match(events[0]!.message!, /unknown indicator "Nope"/);
  assert.equal(events[0]!.bubbles, true);
  assert.equal(element.specError, events[0]!.message);
  element.setAttribute('params', '{bad');
  element.setAttribute('indicator', 'BallBeat');
  assert.match(element.specError!, /params is not valid JSON/);
  element.removeAttribute('params');
  assert.equal(element.specError, null);
  assert.equal(events[events.length - 1]!.message, null);
});

test('reconnecting keeps the time and the stopped state; observers are removed while disconnected', () => {
  const before = env.observed();
  const { element, canvas, paints } = mount('<loader-kit></loader-kit>');
  assert.ok(env.observed() > before);
  paints();
  paints();
  paints();
  const time = element.time;
  assert.ok(time > 0);
  const parent = element.parentNode!;
  element.remove();
  assert.equal(env.observed(), before, 'observers and listeners are removed');
  assert.equal(element.time, time);
  env.wait(5000);
  parent.appendChild(element as never);
  env.resize(canvas, 40, 40);
  assert.equal(element.time, time);
  assert.equal(paints().length, 3);
  assert.equal(element.time, time, 'the first frame after reconnecting does not advance');
  paints();
  assert.ok(element.time > time);

  element.stop();
  const stopped = element.time;
  element.remove();
  parent.appendChild(element as never);
  assert.equal(element.animating, false);
  assert.equal(element.getAttribute('aria-hidden'), 'true');
  paints();
  assert.equal(element.time, stopped);
});

test('changing the spec or the params while disconnected restarts at 0, like a connected element', () => {
  const { element, paints } = mount('<loader-kit></loader-kit>');
  paints();
  paints();
  const parent = element.parentNode!;
  element.remove();
  element.speed = 2;
  element.color = 'red';
  assert.ok(element.time > 0, 'speed and color keep the time');
  element.params = { count: 4 } as never;
  assert.equal(element.time, 0);
  parent.appendChild(element as never);
  assert.equal(element.time, 0);
});

test('the shadow canvas is never pinned, on reconnect or when the pixel ratio changes', () => {
  const { element, canvas } = mount('<loader-kit></loader-kit>');
  canvas.getBoundingClientRect = () => ({ width: 40, height: 40, x: 0, y: 0, top: 0, left: 0, right: 40, bottom: 40 }) as DOMRect;
  const parent = element.parentNode!;
  element.remove();
  parent.appendChild(element as never);
  assert.deepEqual([canvas.width, canvas.height], [40, 40]);
  assert.deepEqual([canvas.style.width, canvas.style.height], ['', '']);
  env.setPixelRatio(2);
  assert.deepEqual([canvas.width, canvas.height], [80, 80]);
  env.resize(canvas, 80, 80);
  assert.deepEqual([canvas.width, canvas.height], [160, 160], 'the element size wins, even when it equals the backing size');
  assert.deepEqual([canvas.style.width, canvas.style.height], ['', '']);
  env.setPixelRatio(1);
});

test('specError and loaderkit-error catch up with changes made while disconnected', () => {
  const { element } = mount('<loader-kit indicator="Nope"></loader-kit>');
  const messages: (string | null)[] = [];
  element.addEventListener('loaderkit-error', (event) => messages.push((event as unknown as CustomEvent).detail.message));
  assert.match(element.specError!, /unknown indicator "Nope"/);
  const parent = element.parentNode!;
  element.remove();
  element.indicator = 'BallBeat';
  parent.appendChild(element as never);
  assert.equal(element.specError, null);
  assert.deepEqual(messages, [null]);

  element.remove();
  element.indicator = 'Nope';
  parent.appendChild(element as never);
  element.remove();
  parent.appendChild(element as never);
  assert.equal(messages.length, 2, 'an unchanged error is reported once');
  assert.match(messages[1]!, /unknown indicator "Nope"/);
});

test('properties set before the element is defined are applied on upgrade', () => {
  const element = env.document.createElement('late-loader') as unknown as Record<string, unknown>;
  element.indicator = 'BallBeat';
  element.speed = 3;
  env.document.body.appendChild(element as never);
  defineLoaderKitElement('late-loader');
  const upgraded = element as unknown as Element;
  assert.ok(upgraded instanceof LoaderKitElement);
  assert.equal(upgraded.indicator, 'BallBeat');
  assert.equal(upgraded.speed, 3);
  assert.equal(Object.prototype.hasOwnProperty.call(element, 'indicator'), false);
});

test('splitColors keeps commas inside parentheses', () => {
  assert.deepEqual(splitColors('rgb(0, 0, 0), red,  color-mix(in srgb, red 50%, blue) ,'), [
    'rgb(0, 0, 0)',
    'red',
    'color-mix(in srgb, red 50%, blue)',
  ]);
  assert.deepEqual(splitColors(''), []);
});
