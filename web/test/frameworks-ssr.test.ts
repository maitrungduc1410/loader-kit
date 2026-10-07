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
