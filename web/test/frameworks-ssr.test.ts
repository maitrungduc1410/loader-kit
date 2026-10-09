import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileLoaderKit, svelteModule } from './support/svelte.ts';

const props = {
  indicator: 'BallSpinFadeLoader',
  params: { count: 5 },
  colors: ['red', 'rgb(0, 0, 255)'],
  speed: 1.5,
  animating: false,
  size: 48,
};

/** The attributes of the first `<loader-kit>` tag in `html`. */
function attributesOf(html: string): Record<string, string> {
  const tag = /<loader-kit\b([^>]*)>/.exec(html);
  assert.ok(tag, `no <loader-kit> in ${html}`);
  const attributes: Record<string, string> = {};
  for (const [, name, value = ''] of tag[1]!.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) {
    attributes[name!] = value.replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/&amp;/g, '&');
  }
  return attributes;
}

function assertMarkup(html: string, classAttribute = 'spinner') {
  const attributes = attributesOf(html);
  assert.equal(attributes.indicator, 'BallSpinFadeLoader');
  assert.deepEqual(JSON.parse(attributes.params!), { count: 5 });
  assert.equal(attributes.colors, 'red, rgb(0, 0, 255)');
  assert.equal(attributes.speed, '1.5');
  assert.equal(attributes.animating, 'false');
  assert.equal(attributes['hides-when-stopped'], 'true');
  assert.equal(attributes['cycle-progress'], '');
  assert.equal(attributes.role, 'progressbar');
  assert.equal(attributes['aria-label'], 'Loading');
  assert.equal(attributes['aria-hidden'], 'true');
  assert.equal(attributes.class, classAttribute);
  assert.match(attributes.style!, /width:\s*48px;\s*height:\s*48px/);
}

test('no DOM globals in this process', () => {
  for (const name of ['window', 'document', 'HTMLElement', 'customElements']) assert.equal(name in globalThis, false, name);
});

test('React renders the attributes on the server', async () => {
  const { createElement } = await import('react');
  const { renderToString } = await import('react-dom/server');
  const { LoaderKit } = await import('../src/react.ts');
  assertMarkup(renderToString(createElement(LoaderKit, { ...props, className: 'spinner' })));
});

test('Vue renders the attributes on the server', async () => {
  const { createSSRApp, h } = await import('vue');
  const { renderToString } = await import('vue/server-renderer');
  const { LoaderKit } = await import('../src/vue.ts');
  assertMarkup(await renderToString(createSSRApp({ render: () => h(LoaderKit, { ...props, class: 'spinner' }) })));
});

test('Svelte 5 renders the attributes on the server', async () => {
  const component = await compileLoaderKit(5, 'server');
  const { render } = (await import(svelteModule(5, 'server', 'svelte/server'))) as {
    render: (component: unknown, options: { props: Record<string, unknown> }) => { body: string };
  };
  assertMarkup(render(component, { props: { ...props, class: 'spinner' } }).body);
});

test('Svelte 4 renders the attributes on the server', async () => {
  const component = (await compileLoaderKit(4, 'server')) as { render: (props: Record<string, unknown>) => { html: string } };
  assertMarkup(component.render({ ...props, class: 'spinner' }).html);
});

const progressProps = { value: 0.25, type: 'gauge', showLabel: true, trackGap: 0, smooth: false } as const;

/** The attributes of the first `<loader-kit-progress>` tag in `html`, and its content. */
function assertProgressMarkup(html: string) {
  const match = /<loader-kit-progress\b([^>]*)>([\s\S]*?)<\/loader-kit-progress>/.exec(html);
  assert.ok(match, `no <loader-kit-progress> in ${html}`);
  const attributes: Record<string, string> = {};
  for (const [, name, value = ''] of match[1]!.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attributes[name!] = value;
  assert.equal(attributes.value, '0.25');
  assert.equal(attributes.type, 'gauge');
  assert.equal(attributes['show-label'], 'true');
  assert.equal(attributes['track-gap'], '0');
  assert.equal(attributes.smooth, 'false');
  assert.equal('variant' in attributes, false);
  assert.equal(attributes.role, 'progressbar');
  assert.equal(attributes['aria-valuenow'], '25');
  assert.match(match[2]!, /<b>25<\/b>/);
}

test('LoaderKitProgress renders its attributes and children on the server', async () => {
  const { createElement } = await import('react');
  const { renderToString } = await import('react-dom/server');
  const { LoaderKitProgress } = await import('../src/react.ts');
  assertProgressMarkup(renderToString(createElement(LoaderKitProgress, progressProps, createElement('b', null, '25'))));

  const { createSSRApp, h } = await import('vue');
  const vueServer = await import('vue/server-renderer');
  const vue = await import('../src/vue.ts');
  assertProgressMarkup(await vueServer.renderToString(createSSRApp({ render: () => h(vue.LoaderKitProgress, progressProps, () => h('b', '25')) })));

  const svelte5 = await compileLoaderKit(5, 'server', { component: 'LoaderKitProgress' });
  const { render } = (await import(svelteModule(5, 'server', 'svelte/server'))) as {
    render: (component: unknown, options: { props: Record<string, unknown> }) => { body: string };
  };
  assertProgressMarkup(render(svelte5, { props: progressProps }).body.replace('</loader-kit-progress>', '<b>25</b></loader-kit-progress>'));
  const svelte4 = (await compileLoaderKit(4, 'server', { component: 'LoaderKitProgress' })) as { render: (props: Record<string, unknown>) => { html: string } };
  assertProgressMarkup(svelte4.render(progressProps).html.replace('</loader-kit-progress>', '<b>25</b></loader-kit-progress>'));
});
