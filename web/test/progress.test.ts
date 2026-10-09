import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { progressCommands, resolveProgress } from '@loader-kit/spec';
import { installFrameworkDom } from './support/framework-dom.ts';
import { compileLoaderKit, svelteModule } from './support/svelte.ts';

interface Call {
  name: string;
  args: unknown[];
  /** fillStyle, strokeStyle, lineWidth, lineCap and font when the call happened. */
  state: Record<string, unknown>;
}

/** A 2D context that records every call; gradients record their color stops. */
function recorder(options: { conic?: boolean } = {}) {
  const calls: Call[] = [];
  const state: Record<string, unknown> = { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt', font: '' };
  const gradient = (kind: string, args: unknown[]) => {
    const stops: [number, string][] = [];
    return { kind, args, stops, addColorStop: (offset: number, color: string) => stops.push([offset, color]) };
  };
  const ctx = new Proxy(state, {
    get(target, key) {
      if (typeof key !== 'string') return undefined;
      if (key in target) return target[key];
      if (key === 'createConicGradient' && options.conic === false) return undefined;
      if (key === 'getImageData') return () => ({ data: [0, 0, 0, 255] });
      if (key.startsWith('create') && key.endsWith('Gradient')) return (...args: unknown[]) => gradient(key, args);
      return (...args: unknown[]) => {
        calls.push({ name: key, args, state: { ...target } });
      };
    },
    set(target, key, value) {
      target[key as string] = value;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, names: () => calls.map((call) => call.name) };
}

const env = installFrameworkDom();
let current = recorder();
const contexts = new WeakMap<object, ReturnType<typeof recorder>>();
Object.defineProperty(env.window.HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value(this: object, type: string) {
    if (type !== '2d') return null;
    let entry = contexts.get(this);
    if (!entry) {
      entry = recorder();
      contexts.set(this, entry);
    }
    current = entry;
    return entry.ctx;
  },
});
const recorderOf = (canvas: object) => {
  (canvas as HTMLCanvasElement).getContext('2d');
  return current;
};

const { drawProgress, DEFAULT_TRACK_ALPHA } = await import('../src/progress-draw.ts');
const { LoaderKitProgressView } = await import('../src/progress-view.ts');
const { LoaderKitProgressElement, defineLoaderKitProgressElement } = await import('../src/progress-element.ts');
const { progressAttributes } = await import('../src/progress-attributes.ts');
type ProgressElement = InstanceType<typeof LoaderKitProgressElement>;

after(() => env.close());

const determinate = (value: number) => ({ indeterminate: false, value, buffer: 0, wave: 1, time: 0, indeterminateTime: 0 });

test('drawProgress maps the display list to canvas calls at the given scale', () => {
  const { ctx, calls, names } = recorder();
  const drawing = progressCommands(resolveProgress({ type: 'circular' }), determinate(0.5), 48, 48);
  drawProgress(ctx, drawing, { color: '#ff0000', track: null, label: '#000000' }, 2);
  assert.deepEqual(calls.find((call) => call.name === 'setTransform')?.args, [2, 0, 0, 2, 0, 0]);
  const strokes = calls.filter((call) => call.name === 'stroke');
  assert.equal(strokes.length, 2, 'the track and the progress');
  assert.equal(strokes[0]!.state.strokeStyle, `rgba(255, 0, 0, ${DEFAULT_TRACK_ALPHA})`);
  assert.equal(strokes[1]!.state.strokeStyle, '#ff0000');
  assert.equal(strokes[1]!.state.lineCap, 'round');
  assert.equal(names().at(-1), 'restore');
});

test('drawProgress: labels, clips, gradients and the conic fallback', () => {
  const label = recorder();
  const p = resolveProgress({ type: 'circular', showLabel: true });
  drawProgress(label.ctx, progressCommands(p, determinate(0.425), 48, 48), { color: 'red', track: 'blue', label: '#123456' }, 1);
  const text = label.calls.find((call) => call.name === 'fillText')!;
  assert.equal(text.args[0], '43%');
  assert.equal(text.state.fillStyle, '#123456');
  assert.match(String(text.state.font), /^600 \d+(\.\d+)?px /);

  const liquid = recorder();
  drawProgress(liquid.ctx, progressCommands(resolveProgress({ type: 'liquid' }), determinate(0.5), 48, 48), { color: '#00ff00', track: null, label: '#000' }, 1);
  const clipAt = liquid.names().indexOf('clip');
  assert.ok(clipAt > 0 && liquid.names().indexOf('save') < clipAt, 'clips inside save and restore');

  const conic = progressCommands(resolveProgress({ type: 'circular', variant: 'gradient' }), determinate(0.8), 48, 48);
  const withConic = recorder();
  drawProgress(withConic.ctx, conic, { color: '#0000ff', track: null, label: '#000' }, 1);
  const gradientStroke = withConic.calls.filter((call) => call.name === 'stroke').find((call) => typeof call.state.strokeStyle === 'object');
  assert.equal((gradientStroke?.state.strokeStyle as { kind: string }).kind, 'createConicGradient');
  const without = recorder({ conic: false });
  drawProgress(without.ctx, conic, { color: '#0000ff', track: null, label: '#000' }, 1);
  assert.ok(without.calls.filter((call) => call.name === 'stroke').every((call) => typeof call.state.strokeStyle === 'string'));
});

function mountView(options: ConstructorParameters<typeof LoaderKitProgressView>[1] = {}) {
  const host = env.document.createElement('div') as unknown as HTMLElement;
  env.document.body.appendChild(host as never);
  const view = new LoaderKitProgressView(host, options);
  env.resize(view.canvas, 48, 48, { width: 96, height: 96 });
  const rec = recorderOf(view.canvas);
  const frame = (ms = 16) => {
    rec.calls.length = 0;
    env.tick(ms);
    return rec.calls;
  };
  return { host, view, frame };
}

test('LoaderKitProgressView sizes the canvas in device pixels and only runs frames while moving', () => {
  const { host, view, frame } = mountView({ value: 0.3 });
  assert.equal(view.canvas.parentElement, host);
  assert.equal(view.canvas.width, 96);
  assert.ok(frame().some((call) => call.name === 'stroke'));
  assert.equal(env.pendingFrames(), 0, 'a still value needs no frame loop');

  view.value = 0.8;
  let frames = 0;
  while (env.pendingFrames() > 0 && frames < 200) {
    frame();
    frames++;
  }
  assert.ok(frames > 10 && frames < 200, `glides over several frames (${frames})`);

  view.value = null;
  for (let i = 0; i < 5; i++) frame();
  assert.equal(env.pendingFrames(), 1, 'indeterminate keeps animating');
  view.configure({ speed: 0 });
  frame();
  frame();
  assert.equal(env.pendingFrames(), 0, 'speed 0 pauses it');
  view.destroy();
  assert.equal(view.canvas.parentElement, null);
});

test('LoaderKitProgressView: smooth off and reduced motion jump to the value', () => {
  const sharp = mountView({ value: 0.2, smooth: false });
  sharp.frame();
  sharp.view.value = 0.9;
  sharp.frame();
  assert.equal(env.pendingFrames(), 0);
  sharp.view.destroy();

  env.setReduceMotion(true);
  const reduced = mountView({ value: 0.2, type: 'linear', variant: 'wavy' });
  reduced.frame();
  reduced.view.value = 0.6;
  reduced.frame();
  reduced.frame();
  assert.equal(env.pendingFrames(), 0, 'no glide and no ambient wave');
  reduced.view.destroy();
  env.setReduceMotion(false);
});

test('LoaderKitProgressView reads defaults for bad input and resets options with null', () => {
  const { view } = mountView({ type: 'gauge', thickness: Number.NaN, segments: Number.POSITIVE_INFINITY });
  assert.equal(view.resolvedOptions.thickness, 6);
  view.configure({ thickness: 9 });
  assert.equal(view.resolvedOptions.thickness, 9);
  view.configure({ thickness: null });
  assert.equal(view.resolvedOptions.thickness, 6);
  view.value = Number.NaN;
  assert.equal(view.value, null);
  view.destroy();
});

function mount(html: string): ProgressElement {
  const container = env.container();
  container.innerHTML = html;
  return container.firstElementChild as unknown as ProgressElement;
}

const sizing = (element: ProgressElement) => element.shadowRoot!.querySelectorAll('style')[1]!.textContent;

test('importing the entry registers <loader-kit-progress>', () => {
  assert.equal(env.window.customElements.get('loader-kit-progress'), LoaderKitProgressElement as unknown);
  assert.equal(defineLoaderKitProgressElement(), LoaderKitProgressElement);
  const Other = defineLoaderKitProgressElement('my-progress')!;
  assert.ok(Other.prototype instanceof LoaderKitProgressElement);
});

test('attributes set the properties, and missing ones fall back to the defaults', () => {
  const element = mount(
    '<loader-kit-progress value="0.25" type="linear" variant="wavy" track-gap="2" show-label stop-indicator="false" smooth="false" track-color="red"></loader-kit-progress>',
  );
  assert.equal(element.value, 0.25);
  assert.equal(element.type, 'linear');
  assert.equal(element.variant, 'wavy');
  assert.equal(element.trackGap, 2);
  assert.equal(element.showLabel, true);
  assert.equal(element.stopIndicator, false);
  assert.equal(element.smooth, false);
  assert.equal(element.trackColor, 'red');
  element.removeAttribute('smooth');
  element.removeAttribute('show-label');
  element.setAttribute('value', 'nope');
  assert.equal(element.smooth, true);
  assert.equal(element.showLabel, null);
  assert.equal(element.value, null);
});

test('accessibility: progressbar with the real value in percent, none while indeterminate', () => {
  const element = mount('<loader-kit-progress value="0.426"></loader-kit-progress>');
  assert.equal(element.getAttribute('role'), 'progressbar');
  assert.equal(element.getAttribute('aria-label'), 'Loading');
  assert.equal(element.getAttribute('aria-valuemin'), '0');
  assert.equal(element.getAttribute('aria-valuemax'), '100');
  assert.equal(element.getAttribute('aria-valuenow'), '43');
  element.value = 2;
  assert.equal(element.getAttribute('aria-valuenow'), '100');
  element.value = null;
  assert.equal(element.hasAttribute('aria-valuenow'), false);
  assert.equal(mount('<loader-kit-progress aria-label="Uploading"></loader-kit-progress>').getAttribute('aria-label'), 'Uploading');
});

test('the default size follows the type, and border wraps its content', () => {
  const element = mount('<loader-kit-progress></loader-kit-progress>');
  assert.equal(sizing(element), ':host { width: 48px; height: 48px; }');
  element.size = 64;
  assert.equal(sizing(element), ':host { width: 64px; height: 64px; }');
  element.type = 'battery';
  assert.equal(sizing(element), ':host { width: 64px; height: 32px; }');
  element.type = 'linear';
  assert.equal(sizing(element), ':host { display: block; height: 8px; }');
  element.type = 'border';
  element.thickness = 5;
  assert.equal(sizing(element), ':host { padding: 9px; } .content { position: relative; display: block; }');
  assert.ok(element.shadowRoot!.querySelector('.content slot'), 'children go through a slot');
});

test('properties reach the view: the canvas draws the configured type', () => {
  const element = mount('<loader-kit-progress value="0.5" type="pie" color="#ff0000"></loader-kit-progress>');
  const canvas = element.shadowRoot!.querySelector('canvas')!;
  env.resize(canvas, 48, 48);
  const rec = recorderOf(canvas);
  rec.calls.length = 0;
  env.tick();
  const fills = rec.calls.filter((call) => call.name === 'fill');
  assert.ok(fills.some((call) => call.state.fillStyle === '#ff0000'));
  element.value = null;
  element.remove();
  rec.calls.length = 0;
  env.tick();
  assert.equal(rec.calls.length, 0, 'a disconnected element stops drawing');
});

test('progressAttributes leaves unset props out and writes the ARIA value', () => {
  const attributes = progressAttributes({ value: 0.5, trackGap: 0, showLabel: false, smooth: false, accessibilityLabel: 'Upload' });
  assert.equal(attributes['track-gap'], '0');
  assert.equal(attributes['show-label'], 'false');
  assert.equal(attributes.smooth, 'false');
  assert.equal(attributes.type, undefined);
  assert.equal(attributes['aria-valuenow'], '50');
  assert.equal(attributes['aria-label'], 'Upload');
  assert.equal(progressAttributes({ value: Number.NaN })['aria-valuenow'], undefined);
});

test('React and Vue render <loader-kit-progress> with their children', async () => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  const { act, createElement } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { renderToString } = await import('react-dom/server');
  const { LoaderKitProgress } = await import('../src/react.ts');
  const html = renderToString(createElement(LoaderKitProgress, { value: 0.3, type: 'circular' }, createElement('b', null, 'x')));
  assert.match(html, /^<loader-kit-progress /);
  assert.match(html, /aria-valuenow="30"/);
  assert.match(html, /<b>x<\/b><\/loader-kit-progress>$/);

  const container = env.container();
  const root = createRoot(container);
  act(() => root.render(createElement(LoaderKitProgress, { value: 0.6, variant: 'segmented', className: 'c' }, createElement('span', null, 'stop'))));
  const element = container.querySelector('loader-kit-progress') as unknown as ProgressElement;
  assert.equal(element.value, 0.6);
  assert.equal(element.variant, 'segmented');
  assert.equal(element.className, 'c');
  assert.equal(element.textContent, 'stop');
  act(() => root.render(createElement(LoaderKitProgress, {})));
  assert.equal(element.value, null, 'a removed prop resets the element');
  act(() => root.unmount());

  const { createApp, h, nextTick, shallowRef } = await import('vue');
  const { LoaderKitProgress: VueProgress } = await import('../src/vue.ts');
  const target = env.container();
  const vueProps = shallowRef<Record<string, unknown>>({ value: 0.4, type: 'gauge', showLabel: true, thickness: 6 });
  const app = createApp({ render: () => h(VueProgress, vueProps.value, () => 'mid') });
  app.mount(target);
  const vue = target.querySelector('loader-kit-progress') as unknown as ProgressElement;
  assert.equal(vue.value, 0.4);
  assert.equal(vue.type, 'gauge');
  assert.equal(vue.showLabel, true);
  assert.equal(vue.stopIndicator, null, 'an unset flag keeps the default');
  assert.equal(vue.smooth, true);
  assert.equal(vue.textContent, 'mid');
  vueProps.value = { value: null };
  await nextTick();
  assert.equal(vue.value, null, 'a null value is indeterminate, not 0');
  assert.equal(vue.type, null);
  assert.equal(vue.showLabel, null);
  assert.equal(vue.thickness, null);
  vueProps.value = { value: 0.2, smooth: false };
  await nextTick();
  assert.equal(vue.value, 0.2);
  assert.equal(vue.smooth, false);
  app.unmount();
});

for (const version of [5, 4] as const) {
  test(`Svelte ${version} renders <loader-kit-progress> with its slot`, async () => {
    const component = await compileLoaderKit(version, 'client', { component: 'LoaderKitProgress' });
    const target = env.container();
    let destroy: () => void;
    let set: (props: Record<string, unknown>) => Promise<void>;
    if (version === 5) {
      const legacy = (await import(svelteModule(5, 'client', 'svelte/legacy'))) as {
        createClassComponent: (options: Record<string, unknown>) => { $set(props: Record<string, unknown>): void; $destroy(): void };
      };
      const svelte = (await import(svelteModule(5, 'client', 'svelte'))) as { flushSync: () => void };
      const instance = legacy.createClassComponent({ component, target, props: { value: 0.7, type: 'pie', thickness: 3 } });
      svelte.flushSync();
      destroy = () => instance.$destroy();
      set = async (props) => {
        instance.$set(props);
        svelte.flushSync();
      };
    } else {
      const svelte = (await import(svelteModule(4, 'client', 'svelte'))) as { tick: () => Promise<void> };
      const Component = component as new (options: Record<string, unknown>) => { $set(props: Record<string, unknown>): void; $destroy(): void };
      const instance = new Component({ target, props: { value: 0.7, type: 'pie', thickness: 3 } });
      await svelte.tick();
      destroy = () => instance.$destroy();
      set = async (props) => {
        instance.$set(props);
        await svelte.tick();
      };
    }
    const element = target.querySelector('loader-kit-progress') as unknown as ProgressElement;
    assert.equal(element.value, 0.7);
    assert.equal(element.type, 'pie');
    assert.equal(element.thickness, 3);
    assert.equal(element.getAttribute('aria-valuenow'), '70');
    await set({ value: null, thickness: null });
    assert.equal(element.value, null);
    assert.equal(element.thickness, null);
    assert.equal(element.hasAttribute('aria-valuenow'), false);
    destroy();
  });
}
