import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';
import { installFrameworkDom, type LoaderKitTestElement } from './support/framework-dom.ts';
import { compileLoaderKit, svelteModule, type SvelteVersion } from './support/svelte.ts';

const env = installFrameworkDom();
after(() => env.close());

interface Instance {
  $set(props: Record<string, unknown>): void;
  $destroy(): void;
}
type Mount = (props: Record<string, unknown>, target: HTMLElement) => Promise<{ instance: Instance; flush: () => Promise<void> }>;

async function mounter(version: SvelteVersion): Promise<Mount> {
  const component = await compileLoaderKit(version, 'client');
  if (version === 5) {
    const legacy = (await import(svelteModule(5, 'client', 'svelte/legacy'))) as {
      createClassComponent: (options: { component: unknown; target: HTMLElement; props: Record<string, unknown> }) => Instance;
    };
    const svelte = (await import(svelteModule(5, 'client', 'svelte'))) as { flushSync: () => void; tick: () => Promise<void> };
    const flush = async () => {
      svelte.flushSync();
      await svelte.tick();
    };
    return async (props, target) => {
      const instance = legacy.createClassComponent({ component, target, props });
      await flush();
      return { instance, flush };
    };
  }
  const svelte = (await import(svelteModule(4, 'client', 'svelte'))) as { tick: () => Promise<void> };
  const Component = component as new (options: { target: HTMLElement; props: Record<string, unknown> }) => Instance;
  return async (props, target) => {
    const instance = new Component({ target, props });
    await svelte.tick();
    return { instance, flush: () => svelte.tick() };
  };
}

interface Hydration {
  html: (props: Record<string, unknown>) => string;
  hydrate: (props: Record<string, unknown>, target: HTMLElement) => Promise<() => void>;
}

/** Server rendering, and hydrating that markup on the client. */
async function hydrater(version: SvelteVersion): Promise<Hydration> {
  const server = await compileLoaderKit(version, 'server');
  const client = await compileLoaderKit(version, 'client', { hydratable: true });
  if (version === 5) {
    const { render } = (await import(svelteModule(5, 'server', 'svelte/server'))) as {
      render: (component: unknown, options: { props: Record<string, unknown> }) => { body: string };
    };
    const svelte = (await import(svelteModule(5, 'client', 'svelte'))) as {
      hydrate: (component: unknown, options: { target: HTMLElement; props: Record<string, unknown> }) => object;
      unmount: (instance: object) => void;
      flushSync: () => void;
    };
    return {
      html: (props) => render(server, { props }).body,
      async hydrate(props, target) {
        const instance = svelte.hydrate(client, { target, props });
        svelte.flushSync();
        return () => svelte.unmount(instance);
      },
    };
  }
  const svelte = (await import(svelteModule(4, 'client', 'svelte'))) as { tick: () => Promise<void> };
  const Server = server as { render: (props: Record<string, unknown>) => { html: string } };
  const Client = client as new (options: { target: HTMLElement; props: Record<string, unknown>; hydrate: boolean }) => Instance;
  return {
    html: (props) => Server.render(props).html,
    async hydrate(props, target) {
      const instance = new Client({ target, props, hydrate: true });
      await svelte.tick();
      return () => instance.$destroy();
    },
  };
}

for (const version of [5, 4] as const) {
  describe(`Svelte ${version}`, async () => {
    const mount = await mounter(version);
    const hydration = await hydrater(version);

    async function render(props: Record<string, unknown>) {
      const container = env.container();
      const { instance, flush } = await mount(props, container);
      const element = container.querySelector('loader-kit') as unknown as LoaderKitTestElement;
      return {
        element,
        async update(next: Record<string, unknown>) {
          instance.$set(next);
          await flush();
        },
        unmount: () => instance.$destroy(),
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

    test('class, style, size and other attributes reach the element', async () => {
      const { element, unmount } = await render({ class: 'spinner', size: 48, style: 'margin: 4px', id: 'busy', 'aria-label': 'Saving' });
      assert.equal(element.getAttribute('class'), 'spinner');
      assert.equal(element.style.width, '48px');
      assert.equal(element.style.margin, '4px');
      assert.equal(element.id, 'busy');
      assert.equal(element.getAttribute('aria-label'), 'Saving');
      unmount();
    });

    test('prop changes update the element, and a prop that goes away resets to the default', async () => {
      const { element, update, unmount } = await render({ indicator: 'LineScale', speed: 0.5, colors: ['red', 'rgb(0, 0, 255)'] });
      assert.deepEqual(element.colors, ['red', 'rgb(0, 0, 255)']);
      await update({ indicator: 'BallPulse', speed: 3, cycleProgress: 0.25, colors: null, color: 'red' });
      assert.equal(element.indicator, 'BallPulse');
      assert.equal(element.speed, 3);
      assert.equal(element.cycleProgress, 0.25);
      assert.equal(element.color, 'red');
      assert.equal(element.colors, null);
      await update({ speed: undefined, cycleProgress: undefined, color: undefined });
      assert.equal(element.speed, 1);
      assert.equal(element.cycleProgress, null);
      assert.equal(element.color, null);
      unmount();
    });

    test('stopping: animating false hides the indicator and sets aria-hidden', async () => {
      const { element, update, unmount } = await render({ animating: false });
      assert.equal(element.animating, false);
      assert.equal(element.getAttribute('aria-hidden'), 'true');
      assert.equal(env.paints(element).length, 0);
      await update({ hidesWhenStopped: false });
      assert.equal(element.hasAttribute('aria-hidden'), false);
      assert.equal(env.paints(element).length, 3);
      await update({ hidesWhenStopped: true });
      assert.equal(element.getAttribute('aria-hidden'), 'true');
      await update({ animating: true });
      assert.equal(element.animating, true);
      assert.equal(element.hasAttribute('aria-hidden'), false);
      unmount();
    });

    test('an equal spec object does not restart the animation', async () => {
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

    test('onError reports a bad indicator once, including one present on the first render, and the recovery', async () => {
      const messages: (string | null)[] = [];
      const { update, unmount } = await render({ indicator: 'Nope', onError: (message: string | null) => messages.push(message) });
      assert.equal(messages.length, 1);
      assert.match(messages[0]!, /Nope/);
      await update({ indicator: 'BallPulse' });
      assert.deepEqual(messages.slice(1), [null]);
      unmount();
    });

    test('destroying stops the frame loop and removes the observers', async () => {
      const before = env.observed();
      const { element, unmount } = await render({});
      env.paints(element);
      assert.ok(env.observed() > before);
      unmount();
      env.tick();
      assert.equal(env.pendingFrames(), 0);
      assert.equal(env.observed(), before);
    });

    test('hydrates server markup, keeping the server element', async () => {
      const props = { indicator: 'LineScale', params: { count: 4 }, animating: false, size: 32, class: 'spinner' };
      const container = env.container();
      container.innerHTML = hydration.html(props);
      const element = container.querySelector('loader-kit') as unknown as LoaderKitTestElement;
      assert.equal(element.shadowRoot !== null, true, 'upgraded before hydration');
      const problems: unknown[] = [];
      const original = { warn: console.warn, error: console.error };
      console.warn = console.error = (...args: unknown[]) => problems.push(args);
      try {
        const destroy = await hydration.hydrate(props, container);
        assert.deepEqual(problems, []);
        assert.equal(container.querySelector('loader-kit'), element, 'the server element is kept');
        assert.equal(container.querySelectorAll('loader-kit').length, 1);
        assert.equal(element.indicator, 'LineScale');
        assert.equal(element.animating, false);
        assert.equal(element.getAttribute('class'), 'spinner');
        assert.equal(element.style.width, '32px');
        assert.equal(element.getAttribute('aria-hidden'), 'true');
        destroy();
      } finally {
        Object.assign(console, original);
      }
    });

    test('hydration reports onError once for a bad indicator the server rendered', async () => {
      const messages: (string | null)[] = [];
      const props = { indicator: 'Nope', onError: (message: string | null) => messages.push(message) };
      const container = env.container();
      container.innerHTML = hydration.html(props);
      const destroy = await hydration.hydrate(props, container);
      assert.equal(messages.length, 1);
      assert.match(messages[0]!, /Nope/);
      destroy();
    });
  });
}
