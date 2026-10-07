---
description: "Use LoaderKit on the web with @loader-kit/web: the LoaderKitView canvas class, the <loader-kit> custom element, React, Vue, Svelte and SSR notes."
---

# Web

`@loader-kit/web` draws LoaderKit indicators into a `<canvas>`. It has two entry points:

- `@loader-kit/web`: the `LoaderKitView` class, plus lower level functions to prepare and draw a spec yourself. It is safe to import during server-side rendering.
- `@loader-kit/web/element`: registers the `<loader-kit>` custom element.

## Install

::: code-group

```sh [npm]
npm install @loader-kit/web
```

```sh [yarn]
yarn add @loader-kit/web
```

```sh [pnpm]
pnpm add @loader-kit/web
```

:::

## The custom element

Import the element entry once, in the browser. It defines `<loader-kit>` if it is not defined yet.

```ts
import '@loader-kit/web/element';
```

```html
<loader-kit indicator="BallSpinFadeLoader" color="#7c3aed" speed="1.5"></loader-kit>
<loader-kit indicator="BallPulse" params='{"count":5}' colors="#f43f5e, #f59e0b, #10b981"></loader-kit>
<loader-kit cycle-progress="0.25" hides-when-stopped="false" animating="false"></loader-kit>
```

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: center; margin: 16px 0;">
  <LoaderKitPreview indicator="BallSpinFadeLoader" color="#7c3aed" :speed="1.5" />
  <LoaderKitPreview indicator="BallPulse" :params.prop="{ count: 5 }" :colors="['#f43f5e', '#f59e0b', '#10b981']" />
  <LoaderKitPreview indicator="BallPulse" :cycle-progress="0.25" />
</div>

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `indicator` | a built-in name | `BallPulse` |
| `spec` | a custom spec as JSON. Wins over `indicator` | none |
| `params` | a JSON object, for example `{"count":5}` | none |
| `color` | any CSS color | the CSS `color` of the element |
| `colors` | CSS colors separated by commas. Wins over `color` | none |
| `speed` | a number. 0 or less pauses | `1` |
| `animating` | `"false"` stops | animating |
| `hides-when-stopped` | `"false"` keeps the frozen frame visible | hidden when stopped |
| `cycle-progress` | a number from 0 to 1 freezes that frame | none |
| `respects-reduce-motion` | `"false"` ignores `prefers-reduced-motion` | respected |

Every attribute is also a property in camelCase: `indicator`, `spec`, `params`, `color`, `colors`, `speed`, `animating`, `hidesWhenStopped`, `cycleProgress`, `respectsReduceMotion`. The `spec`, `params` and `colors` properties also accept objects and arrays:

```ts
const el = document.querySelector('loader-kit')!;
el.params = { count: 5 };
el.colors = ['#f43f5e', '#10b981'];
el.spec = mySpec; // an object, no need to stringify
```

### Size and color

The element is 40px by 40px by default. Size it with CSS. Without a `color` attribute, it uses the CSS `color` of the element, so it follows your text color and themes.

```css
loader-kit {
  width: 64px;
  height: 64px;
  color: var(--vp-c-brand-1);
}
```

### Errors

When the spec cannot be drawn, the element draws nothing and dispatches a `loaderkit-error` event. `detail.message` is the error message, or null when a later change fixes the problem.

```ts
el.addEventListener('loaderkit-error', (event) => {
  const { message } = (event as CustomEvent<{ message: string | null }>).detail;
  if (message) console.warn(message);
});
```

### Accessibility

The element has `role="progressbar"` with no value (indeterminate) and `aria-label="Loading"`, unless you set your own `aria-label`. It is `aria-hidden` while it is hidden.

### A different tag name

```ts
import { defineLoaderKitElement } from '@loader-kit/web/element';

defineLoaderKitElement('my-loader');
```

The module also exports the `LoaderKitElement` class.

## The LoaderKitView class

`LoaderKitView` draws into a `<canvas>` that it creates inside a host element. If the host is a `<canvas>`, it draws into the host itself.

```ts
import { LoaderKitView } from '@loader-kit/web';

const view = new LoaderKitView(document.querySelector('#loader')!, {
  indicator: 'BallPulse',
  params: { count: 5 },
  color: '#7c3aed',
  onError: (message) => {
    if (message) console.warn(message);
  },
});

view.speed = 2;
view.stop();
view.start();
view.destroy(); // stops the frame loop, removes observers and the canvas it created
```

### Options and properties

Every option is also a property you can read and set later.

| Option | Type | Default |
| --- | --- | --- |
| `indicator` | built-in name | `'BallPulse'` |
| `spec` | `IndicatorSpec`, a JSON string, or `null`. Wins over `indicator` | `null` |
| `params` | `Record<string, number>` | `{}` |
| `color` | any CSS color, or `null` | the CSS `color` of the host (`currentColor`) |
| `colors` | `string[]` or `null`. Wins over `color` when not empty | `null` |
| `speed` | `number`. 0 or less pauses | `1` |
| `animating` | `boolean` | `true` |
| `hidesWhenStopped` | `boolean` | `true` |
| `cycleProgress` | a number from 0 to 1, or `null` to follow the clock | `null` |
| `respectsReduceMotion` | `boolean` | `true` |
| `onError` | `(message: string \| null) => void` | none |

Read-only members:

| Member | Meaning |
| --- | --- |
| `canvas` | the `HTMLCanvasElement` being drawn |
| `specError` | the current error message, or `null` |
| `time` | the spec time currently drawn, in seconds |

The view sizes its canvas from the host, so size the host with CSS.

## React

Use the class in an effect. Create the view once and update its properties when props change:

```tsx
import { useEffect, useRef } from 'react';
import { LoaderKitView, type LoaderKitOptions } from '@loader-kit/web';

export function Loader({ indicator = 'BallPulse', color, speed = 1, animating = true }: LoaderKitOptions) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<LoaderKitView | null>(null);

  useEffect(() => {
    view.current = new LoaderKitView(host.current!);
    return () => view.current?.destroy();
  }, []);

  useEffect(() => {
    const v = view.current!;
    v.indicator = indicator;
    v.color = color ?? null;
    v.speed = speed;
    v.animating = animating;
  }, [indicator, color, speed, animating]);

  return <div ref={host} style={{ width: 48, height: 48 }} />;
}
```

You can also render `<loader-kit>` directly once the element entry is imported on the client. Pass `params` and `colors` as strings (`params='{"count":5}'`).

## Vue

Tell the Vue compiler that `loader-kit` is a custom element, then use it in templates. Vue only sets a property when the element is already defined. Here the element entry loads in `onMounted`, after the first render, so bind objects and arrays with the `.prop` modifier. Without it, Vue writes `params="[object Object]"` as an attribute.

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue';

export default {
  plugins: [vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === 'loader-kit' } } })],
};
```

```vue
<script setup lang="ts">
import { onMounted } from 'vue';

onMounted(() => import('@loader-kit/web/element'));
</script>

<template>
  <loader-kit indicator="BallPulse" :params.prop="{ count: 5 }" :speed="1.5" style="width: 48px; height: 48px" />
</template>
```

## Svelte

Svelte supports custom elements without configuration:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  export let loading = true;

  onMount(() => import('@loader-kit/web/element'));
</script>

<loader-kit indicator="LineScale" animating={loading} style="width: 48px; height: 48px"></loader-kit>
```

## Server-side rendering

- Importing `@loader-kit/web` during SSR is safe: it touches no DOM globals at import time. Create a `LoaderKitView` only in the browser (in `useEffect`, `onMounted` or `onMount`).
- `@loader-kit/web/element` registers the element only when `customElements` exists. Still, import it on the client, for example with a dynamic `import()` in a mount hook, so the element upgrades after hydration.
- The server renders `<loader-kit>` as an empty element. Give it a CSS size so the page does not shift when it starts drawing.

## Custom specs

Pass a spec as an object or as JSON. See [Custom indicators](/spec/) to write one.

::: code-group

```ts [TypeScript]
import { LoaderKitView, validate } from '@loader-kit/web';

const json = await (await fetch('/specs/typing-dots.json')).text();

const problems = validate(JSON.parse(json));
if (problems.length > 0) console.warn(problems);

const view = new LoaderKitView(host, { spec: json, params: { count: 4 } });
```

```html [HTML]
<loader-kit spec='{"schemaVersion":1,"name":"Blink","duration":1,"layout":{"type":"row","count":3,"gap":0.1},"shape":{"type":"circle"},"stagger":{"each":0.2},"tracks":[{"property":"opacity","keyTimes":[0,0.5,1],"values":[1,0.2,1]}]}'></loader-kit>
```

:::

## Drawing without a view

`prepare()` and `drawIndicator()` let you draw on your own canvas, for example in a game loop or in a worker with `OffscreenCanvas`.

```ts
import { prepare, drawIndicator } from '@loader-kit/web';

const prepared = prepare({ indicator: 'BallPulse' }, { count: 4 });
const ctx = canvas.getContext('2d')!;

function frame(now: number) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawIndicator(ctx, prepared, now / 1000, { width: canvas.width, height: canvas.height, color: '#7c3aed' });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

- `prepare(source, params?)` resolves a built-in name or a spec with params, validates it and checks the [limits](/spec/using#limits). It throws an `InvalidIndicatorError` (from `@loader-kit/spec`) whose `errors` lists every problem.
- `drawIndicator(ctx, prepared, t, frame)` draws one frame at spec time `t` (seconds) into the rectangle `x`, `y`, `width`, `height` of the context. It does not clear the canvas and does not touch the DOM. `frame.colors` works like the `colors` option.

The package also re-exports `validate`, `BUILTIN_INDICATOR_NAMES` and the `IndicatorSpec`, `Params` and `BuiltinIndicatorName` types from `@loader-kit/spec`.
