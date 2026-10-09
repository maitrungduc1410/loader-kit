# LoaderKit for the web

Loading indicators described as data (JSON specs) and drawn on a `<canvas>`: React, Vue and Svelte
components, the `<loader-kit>` custom element, or a class. The same specs drive the Android, iOS, macOS and Windows engines;
see [`SPEC.md`](https://github.com/maitrungduc1410/loader-kit/blob/master/SPEC.md) for the format.

Full documentation: [maitrungduc1410.github.io/loader-kit/platforms/web](https://maitrungduc1410.github.io/loader-kit/platforms/web)

## Install

```sh
npm install @loader-kit/web
```

ES modules and CommonJS, with TypeScript types. Every entry is safe to import during server-side
rendering. React, Vue and Svelte are optional peer dependencies.

## React, Vue and Svelte

```tsx
// React 17 or later
import { LoaderKit } from '@loader-kit/web/react';

<LoaderKit indicator="BallSpinFadeLoader" color="#7c3aed" size={48} animating={busy} />
```

```vue
<!-- Vue 3.3 or later -->
<script setup lang="ts">
import { LoaderKit } from '@loader-kit/web/vue';
</script>

<template>
  <LoaderKit indicator="BallSpinFadeLoader" color="#7c3aed" :size="48" :animating="busy" @error="onError" />
</template>
```

```svelte
<!-- Svelte 4 or 5 -->
<script>
  import { LoaderKit } from '@loader-kit/web/svelte';
</script>

<LoaderKit indicator="BallSpinFadeLoader" color="#7c3aed" size={48} animating={busy} />
```

The components take `indicator`, `spec`, `params`, `color`, `colors`, `speed`, `animating`,
`hidesWhenStopped`, `cycleProgress`, `respectsReduceMotion`, `size` and `onError` (`@error` in Vue).
Other attributes such as `class` go to the element. They render the `<loader-kit>` element below and
register it, so server-side rendering and hydration work with nothing else to set up.

## Custom element

```js
import '@loader-kit/web/element';
```

```html
<loader-kit indicator="BallSpinFadeLoader" color="#7c3aed" speed="1.5"></loader-kit>
<loader-kit indicator="BallPulse" params='{"count":5}' colors="#f43f5e, #f59e0b, #10b981"></loader-kit>
<loader-kit cycle-progress="0.25" hides-when-stopped="false" animating="false"></loader-kit>
```

The element is 40px by 40px unless CSS sizes it.
Attributes: `indicator`, `spec` (JSON), `params` (JSON object), `color`, `colors` (comma separated),
`speed`, `animating`, `hides-when-stopped`, `cycle-progress`, `respects-reduce-motion`. Each one sets
the property of the same name in camelCase; `spec`, `params` and `colors` also accept objects and
arrays as properties. Problems are reported with a `loaderkit-error` event
(`event.detail.message`, null once the indicator draws again).

```js
const loader = document.querySelector('loader-kit');
loader.addEventListener('loaderkit-error', (event) => console.warn(event.detail.message));
loader.stop();
loader.start();
```

## Class

```js
import { LoaderKitView } from '@loader-kit/web';

const view = new LoaderKitView(document.querySelector('#loader'), {
  indicator: 'BallPulse',
  params: { count: 5 },
  color: '#7c3aed',
  // or one color per element, cycling: colors: ['#f43f5e', '#f59e0b', '#10b981'],
  onError: (message) => message && console.warn(message),
});

view.speed = 2;
view.stop();
view.destroy();
```

The view creates a canvas that fills its host (give the host a size), or draws into the host
itself when it is a `<canvas>`. It is sharp on every display, pauses while offscreen or in a
hidden tab, and draws a still frame when the user asks for reduced motion.

`drawIndicator(ctx, prepare({ indicator }), t, { width, height, color })` draws one frame into any
2D context, including an `OffscreenCanvas` in a worker.

## Color

Without `color` (or `colors`), the indicator uses the CSS `color` of its element, so `currentColor`
and themes work: an animating indicator reads it on every frame, and a stopped or frozen one
redraws when the system color scheme changes or an attribute of `<html>` or `<body>` changes (such
as a theme class).

## Progress

`LoaderKitProgress` shows how much of a task is done: 30 designs across 9 types (`linear`,
`circular`, `pie`, `gauge`, `liquid`, `border`, `bars`, `grid`, `battery`) and their variants.
`value` goes from 0 to 1; null is indeterminate. With `smooth` (on by default) the indicator glides
to every new value. Full guide: [maitrungduc1410.github.io/loader-kit/guide/progress](https://maitrungduc1410.github.io/loader-kit/guide/progress)

```tsx
import { LoaderKitProgress } from '@loader-kit/web/react';   // or /vue, /svelte

<LoaderKitProgress type="linear" variant="wavy" value={progress} />
<LoaderKitProgress type="border"><button>Upload</button></LoaderKitProgress>
```

```js
import '@loader-kit/web/progress-element';
```

```html
<loader-kit-progress type="gauge" value="0.7" show-label size="64"></loader-kit-progress>
```

Attributes: `value`, `buffer`, `smooth`, `type`, `variant`, `thickness`, `track-gap`, `segments`,
`show-label`, `stop-indicator`, `stroke-cap`, `amplitude`, `wavelength`, `wave-speed`,
`sweep-angle`, `corner-radius`, `speed`, `size`, `color`, `track-color`, `label-color`,
`respects-reduce-motion`, each mirrored by a camelCase property. Children are shown in the middle,
or inside the stroke of `border`. The element has the `progressbar` role and an `aria-valuenow` in
percent. `new LoaderKitProgressView(host, options)` is the same without the element.

## Custom specs

> Writing your own spec is **experimental**: until the schema is declared stable, a minor release
> may change it. Built-in indicators are not affected.

```js
view.spec = {
  schemaVersion: 1,
  name: 'Blink',
  duration: 1,
  params: { count: 3 },
  layout: { type: 'row', count: { $param: 'count' }, gap: 0.1 },
  shape: { type: 'circle' },
  stagger: { each: 0.2 },
  tracks: [{ property: 'opacity', keyTimes: [0, 0.5, 1], values: [1, 0.2, 1], easing: 'easeInOut' }],
};
```

`prepare({ spec })` throws `InvalidIndicatorError`, whose `errors` lists every problem; `validate(spec)`
returns the same list without throwing. A view never throws for bad input: it reports the problem
and draws nothing.

## License

MIT
