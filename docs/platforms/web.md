---
description: "Use LoaderKit on the web with @loader-kit/web: React, Vue and Svelte components, the <loader-kit> custom element, the LoaderKitView canvas class and server-side rendering."
---

# Web

`@loader-kit/web` draws LoaderKit indicators into a `<canvas>`. Pick the entry point that fits your app:

| Entry point | What it gives you |
| --- | --- |
| `@loader-kit/web/react` | the `<LoaderKit>` component for React 17 and later |
| `@loader-kit/web/vue` | the `<LoaderKit>` component for Vue 3.3 and later |
| `@loader-kit/web/svelte` | the `<LoaderKit>` component for Svelte 4 and 5 |
| `@loader-kit/web/element` | the `<loader-kit>` custom element, for plain HTML and other frameworks |
| `@loader-kit/web` | the `LoaderKitView` class, plus functions to prepare and draw a spec yourself |

The components render the `<loader-kit>` element and register it for you, so there is nothing else to set up. All entry points are safe to import during server-side rendering.

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

React, Vue and Svelte are optional peer dependencies: install only the framework you use.

## React

```tsx
import { LoaderKit } from '@loader-kit/web/react';

export function Saving({ busy }: { busy: boolean }) {
  return <LoaderKit indicator="BallSpinFadeLoader" color="#7c3aed" size={48} animating={busy} />;
}
```

- The module is marked `'use client'`, so in the Next.js App Router you can render `<LoaderKit>` from a Server Component with serializable props. Pass `onError` or `ref` from a Client Component.
- `ref` is the `<loader-kit>` element (`LoaderKitElementApi`), for example to read `ref.current.time`.
- `onError` receives the error message when the indicator cannot be drawn, and `null` when it recovers.

## Vue

```vue
<script setup lang="ts">
import { LoaderKit } from '@loader-kit/web/vue';

defineProps<{ busy: boolean }>();

function onError(message: string | null) {
  if (message) console.warn(message);
}
</script>

<template>
  <LoaderKit indicator="BallSpinFadeLoader" color="#7c3aed" :size="48" :animating="busy" @error="onError" />
</template>
```

- It is a regular Vue component: no compiler option is needed, and it works with Nuxt and server-side rendering.
- To use it everywhere without importing it, register it once: `app.component('LoaderKit', LoaderKit)`.
- A template ref on the component exposes `element`, the `<loader-kit>` element.

## Svelte

```svelte
<script lang="ts">
  import { LoaderKit } from '@loader-kit/web/svelte';

  let { busy }: { busy: boolean } = $props();
</script>

<LoaderKit indicator="BallSpinFadeLoader" color="#7c3aed" size={48} animating={busy} />
```

- It works with Svelte 4 and 5, and with SvelteKit server-side rendering. The package ships the component source, which the Svelte plugin for Vite compiles with the rest of your app.
- `bind:element` gives the `<loader-kit>` element. `onError` receives the error message, and `null` when it recovers.
- The component is written without runes so that the same source compiles with both versions. If your Svelte 5 config turns on `runes` for every file, limit it to your own code, for example `runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true`.

## Component props

The three components take the same props:

| Prop | Type | Default |
| --- | --- | --- |
| `indicator` | a built-in name | `'BallPulse'` |
| `spec` | `IndicatorSpec` or a JSON string. Wins over `indicator` | none |
| `params` | `Record<string, number>` or a JSON string | none |
| `color` | any CSS color | the CSS `color` of the element |
| `colors` | `string[]`. Wins over `color` when not empty | none |
| `speed` | `number`. 0 or less pauses | `1` |
| `animating` | `boolean` | `true` |
| `hidesWhenStopped` | `boolean` | `true` |
| `cycleProgress` | a number from 0 to 1 freezes that frame. `null` follows the clock | `null` |
| `respectsReduceMotion` | `boolean` | `true` |
| `size` | a number in px, or any CSS length such as `'3rem'` | 40px, unless CSS sizes it |
| `onError` (React, Svelte), `@error` (Vue) | `(message: string \| null) => void` | none |

- Other attributes, such as `class`, `style`, `id` or `aria-label`, go to the `<loader-kit>` element.
- Without `size`, the element is 40px by 40px from its own style, so a class or any CSS rule can size it instead (for example `class="h-12 w-12"`).
- `spec` and `params` are compared as JSON, so passing a new object with the same content on every render does not restart the animation.
- A prop that goes back to undefined resets to its default.

## Other frameworks

For Angular, Solid, Lit, plain HTML or anything else, use the [custom element](#the-custom-element). In Angular, allow custom elements in the component and import the element entry once:

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@loader-kit/web/element';

@Component({
  selector: 'app-saving',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<loader-kit indicator="BallSpinFadeLoader" [animating]="busy"></loader-kit>`,
})
export class SavingComponent {
  busy = true;
}
```

## The custom element

Use the element directly in plain HTML, or in a framework without a component above. Import the element entry once. It defines `<loader-kit>` if it is not defined yet.

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
  <LoaderKitPreview indicator="BallPulse" :params="{ count: 5 }" :colors="['#f43f5e', '#f59e0b', '#10b981']" />
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

## Server-side rendering

- Every entry point is safe to import on the server: none of them touches DOM globals at import time, and the element is registered only where `customElements` exists.
- The React, Vue and Svelte components render `<loader-kit>` with all its attributes on the server. In the browser the element draws the same indicator as soon as it upgrades, and hydration keeps the server element.
- Until the JavaScript loads, the element has no size of its own. Set `size` or a CSS size so the page does not shift when it starts drawing.
- Create a `LoaderKitView` only in the browser, for example in `useEffect`, `onMounted` or `onMount`.

## Progress indicators {#progress}

`LoaderKitProgress` shows how much of a task is done: 30 designs across 9 types, determinate or indeterminate, with smooth value changes.

```html
<script type="module">
  import '@loader-kit/web/progress-element';
</script>

<loader-kit-progress type="linear" value="0.4"></loader-kit-progress>
<loader-kit-progress type="circular" show-label size="64"></loader-kit-progress>
```

```ts
import { LoaderKitProgressView } from '@loader-kit/web';

const view = new LoaderKitProgressView(host, { type: 'linear', variant: 'wavy' });
view.value = 0.4;    // glides to 0.4; null is indeterminate
view.destroy();
```

`LoaderKitProgress` is also exported from `@loader-kit/web/react`, `@loader-kit/web/vue` and `@loader-kit/web/svelte`, with the same props as the attributes in camelCase and children for content in the middle or inside a border. Like `<loader-kit>`, the element renders on the server and draws once it upgrades.

See [Progress indicators](/guide/progress) for every type, variant and option.

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

```tsx [React]
import { LoaderKit } from '@loader-kit/web/react';
import typingDots from './typing-dots.json';

<LoaderKit spec={typingDots} params={{ count: 4 }} />
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
