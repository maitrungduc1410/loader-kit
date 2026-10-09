---
description: "Answers about LoaderKit performance, accessibility, how it compares with GIF, Lottie and CSS spinners, and fixes for indicators that do not show up."
---

# FAQ

## Performance

### Does an indicator keep animating when the main thread is busy?

It depends on the platform engine:

- **iOS and macOS**: the engine turns a spec into Core Animation layers and animations. The system animates them, so they keep moving while your main thread is busy.
- **Windows**: the control updates `Microsoft.UI.Composition` visuals on each frame from the UI thread (`CompositionTarget.Rendering`), so a busy UI thread delays it.
- **Android**: the view draws on a `Canvas` on each frame, on the main thread, so a busy main thread delays it. The clock pauses while the view is detached or hidden.
- **Web**: the engine draws into one `<canvas>` on each animation frame, on the main thread, so long tasks delay it.

### How heavy is an indicator?

A built-in indicator has between 1 and 9 elements, and each element is one simple shape. There is no image decoding and no file to download. The built-in specs are compiled into each engine.

Engines reject a custom spec with more than 10,000 elements, or more than 10,000 ring arcs, so a spec cannot ask for an unbounded amount of drawing. See [Limits](/spec/using#limits).

### Should I stop indicators that are off screen?

Yes. Stop an indicator when the work is done, or remove it from the view tree. A stopped indicator with `hidesWhenStopped` draws nothing. On the web, call `destroy()` on a `LoaderKitView` you no longer need.

## Accessibility

### What do screen readers announce?

- **Web**: `<loader-kit>`, which the React, Vue and Svelte components render, has `role="progressbar"` with no value (an indeterminate progress bar) and `aria-label="Loading"`, unless you set your own label. It is `aria-hidden` while it is hidden.
- **Windows**: the control reports itself to UI Automation as a progress bar.
- **Android and Apple**: the views add no label. Set `contentDescription` on Android or `accessibilityLabel` on iOS and macOS, or describe the loading state in the surrounding UI.

```html
<loader-kit indicator="BallPulse" aria-label="Loading messages"></loader-kit>
```

### Is reduced motion respected?

Yes, by default on every platform. See [Reduced motion](/guide/playback#reduced-motion).

## Comparison

### Built-in indicator or progress indicator?

A built-in indicator only says that something is loading: it has no value. Use one when there is never a percentage, such as waiting for a request or pull to refresh.

A [progress indicator](/guide/progress) shows how much of a task is done, and runs indeterminate while that is unknown. Use one for downloads, uploads and file processing: start with `value` null (`nil` in Swift) and set a value once you know it, without swapping components.

### Why not a GIF or an animated image?

A GIF has a fixed size, a fixed color and a fixed frame rate, and it can look blurry on high density screens. A LoaderKit indicator is drawn as vector shapes at the size of the view, in any color, at the display's frame rate. You can change its speed or freeze a frame at runtime.

### Why not Lottie?

Lottie plays animations exported from design tools and is a good fit for illustrations and rich motion. LoaderKit is narrower: simple shapes in a layout, animated by keyframe tracks. In return, a spec is small, readable, easy to write by hand or with an [AI assistant](/tools/ai), and params let one spec cover several variants (for example 3 dots or 5 dots).

### Why not CSS animations or a platform spinner?

A platform spinner looks different on each platform, and CSS works only on the web. LoaderKit gives you the same indicator on Android, iOS, macOS, Windows and the web, from one name or one spec.

### Is it the same as react-native-loader-kit?

[`react-native-loader-kit`](/platforms/react-native) is built on LoaderKit. It uses the Android and iOS engines, so it has the same indicators.

## Troubleshooting

### Nothing is drawn

Check these in order:

1. **The view has a size.** The default is 40 by 40. On the web, a parent with `display: none` or zero size hides it.
2. **The color is visible.** The default color may match your background: white on Windows, `systemGray` on Apple platforms, the theme foreground on Android, `currentColor` on the web.
3. **The indicator is animating.** With `hidesWhenStopped` (the default), a stopped indicator draws nothing.
4. **The name or spec is valid.** An unknown name or an invalid spec draws nothing and reports an error. Read `specError` (web, Apple), `onError` (Android View), Logcat (Compose), or `SpecError` and `SpecFailed` (Windows). Names are case sensitive: `BallPulse`, not `ballPulse`.
5. **On the web, the element is registered.** The React, Vue and Svelte components register it for you. A `<loader-kit>` you write yourself works only after `import '@loader-kit/web/element'` has run in the browser.

### The indicator does not move

- `speed` is 0 or less.
- `cycleProgress` is set. Set it to null to animate.
- The system asks for reduced motion, so a still frame is shown. This is expected.

### My params have no effect

The indicator does not declare them. Only `BallPulse` and `BallSpinFadeLoader` take params among the built-ins. Unknown param names are ignored on purpose. See [the params table](/guide/indicators#the-params).

### My custom spec is rejected

Run it through `validate()` or paste it in the [playground](/tools/playground): both list every problem with its path, for example `tracks[0].values must have the same length as keyTimes`. See [Using a spec](/spec/using#errors).
