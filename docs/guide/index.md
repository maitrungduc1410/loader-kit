---
description: "What LoaderKit is: loading indicators written as JSON specs and drawn by native engines on each platform, how the pieces fit, and which parts are stable."
---

# What is LoaderKit?

LoaderKit is a set of loading indicators for Android, iOS, macOS, Windows and the web. Each indicator is a small JSON document, called a **spec**. A native engine on each platform reads the spec and draws it with the platform's own graphics stack.

You can use it in two ways:

- **Built-in indicators.** Pick one of [50 indicators](/guide/indicators) by name, such as `BallPulse` or `LineSpinFadeLoader`. Set a color, a size, a speed and, for some indicators, params like `count`.
- **Custom indicators.** Write your own spec: elements placed in a box, a shape, and keyframe tracks that animate them. Every engine draws it, with no new native code. See [Custom indicators](/spec/).

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: center; margin: 16px 0;">
  <LoaderKitPreview indicator="BallPulse" />
  <LoaderKitPreview indicator="LineScalePulseOut" />
  <LoaderKitPreview indicator="BallScaleRippleMultiple" />
  <LoaderKitPreview indicator="CubeTransition" />
</div>

## One spec, many engines

A spec describes an indicator as data:

- a **layout** places elements in a unit box (one element, a row, a grid, a ring, a stack);
- a **shape** says what each element draws (circle, rect, ring, triangle, line);
- **tracks** say how element properties (scale, opacity, rotation, translation, stroke trim) change over one cycle.

```json
{
  "schemaVersion": 1,
  "name": "Blink",
  "duration": 1,
  "layout": { "type": "row", "count": 3, "gap": 0.1 },
  "shape": { "type": "circle" },
  "stagger": { "each": 0.2 },
  "tracks": [{ "property": "opacity", "keyTimes": [0, 0.5, 1], "values": [1, 0.2, 1] }]
}
```

The built-in indicators are specs too. They ship inside every engine, so you only need their name.

| Platform | Engine | Package |
| --- | --- | --- |
| Android | `Canvas`, with a `View` and a Jetpack Compose composable | `io.github.maitrungduc1410:loaderkit-core`, `loaderkit-compose` |
| iOS, macOS | Core Animation, with UIKit, AppKit and SwiftUI views | `LoaderKit` (Swift Package Manager, CocoaPods) |
| Windows | `Microsoft.UI.Composition`, with a WinUI 3 control | `LoaderKit.WinUI`, `LoaderKit.Core` (NuGet) |
| Web | `<canvas>`, with React, Vue and Svelte components, a `<loader-kit>` custom element and a class | `@loader-kit/web` (npm) |
| React Native | the Android and iOS engines | [`react-native-loader-kit`](/platforms/react-native) (npm) |
| Tooling | schema, validator, reference evaluator | `@loader-kit/spec` (npm) |

## Why the motion matches

All engines follow one document, the [specification](/spec/reference). It defines units, layouts, shapes, how tracks are sampled, the easing algorithm, the order of transforms and the playback rules.

A shared conformance suite checks this. The repository generates test vectors from a reference evaluator written in TypeScript: for many points in time, the expected position, size, scale, opacity and rotation of every element. The Android, Apple, Windows and web engines load the same vectors in their unit tests and compare every number. So `BallPulse` at 0.3 seconds is the same frame on every platform.

## Status

| Part | Status |
| --- | --- |
| Built-in indicators, their names and params | **Stable** |
| Views, composables, controls and their properties | **Stable** |
| Writing your own spec (schema version 1) | **Experimental** |

::: warning Custom specs are experimental
Until the schema is declared stable, a minor release may change it. Built-in indicators and their params are not affected, because each engine ships the matching built-in specs.
:::

All packages share one version number, and release tags look like `1.0.0` (no `v` prefix).

## Next steps

- [Getting started](/guide/getting-started): install and show a first indicator.
- [Built-in indicators](/guide/indicators): browse and tune the 50 built-ins.
- [Custom indicators](/spec/): build a spec step by step with live previews.
