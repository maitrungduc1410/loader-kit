# LoaderKit for the web

Loading indicators described as data (JSON specs) and drawn on a `<canvas>`, as a class or as the
`<loader-kit>` custom element. The same specs drive the Android, iOS, macOS and Windows engines;
see [`SPEC.md`](https://github.com/maitrungduc1410/loader-kit/blob/master/SPEC.md) for the format.

Full documentation: [maitrungduc1410.github.io/loader-kit/platforms/web](https://maitrungduc1410.github.io/loader-kit/platforms/web)

## Install

```sh
npm install @loader-kit/web
```

ES modules and CommonJS, with TypeScript types. The main entry is safe to import during server-side
rendering: it touches no DOM globals until you create a view.

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
