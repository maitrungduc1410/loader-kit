---
description: "Use LoaderKit in React Native: install react-native-loader-kit, draw the 50 built-in indicators with LoaderKitView, show progress with LoaderKitProgress, write custom specs and migrate from version 4."
---

# React Native

[`react-native-loader-kit`](https://github.com/maitrungduc1410/react-native-loader-kit) brings LoaderKit to React Native apps on Android and iOS. It runs the native engines described on this site, so you get the same built-in indicators, with the same names, params and motion, and the same progress designs.

The galleries on [Built-in indicators](/guide/indicators) and [Progress indicators](/guide/progress) have a React Native tab: pick a design, tune it and copy the code.

## Requirements

| Version | React Native | Architecture | Maintained on |
| --- | --- | --- | --- |
| 5.x | 0.76 or newer | New Architecture only | `master`, npm `latest` |
| 4.x | see the [v4 README](https://github.com/maitrungduc1410/react-native-loader-kit/tree/v4#readme) | New and old architecture | `v4` branch, npm `v4-lts` |

Version 5 needs the New Architecture, the default since React Native 0.76. An app built with `newArchEnabled=false` (Android) or `RCT_NEW_ARCH_ENABLED=0` (iOS) fails at build time with a message pointing to version 4, which you install with `npm install react-native-loader-kit@v4-lts`.

## Install

::: code-group

```sh [npm]
npm install react-native-loader-kit
```

```sh [yarn]
yarn add react-native-loader-kit
```

:::

The library contains native code. On iOS run `cd ios && pod install`, then rebuild the app.

**Expo**: run `npx expo prebuild`, then restart the project. Expo Go is not supported.

## Usage

```tsx
import { LoaderKitView } from 'react-native-loader-kit';

<LoaderKitView name="BallPulse" color="#7c3aed" style={{ width: 50, height: 50 }} />
```

Params change an indicator without writing a new one. Each indicator lists its params on [Built-in indicators](/guide/indicators); `BallPulse` has `count` and `minScale`:

```tsx
<LoaderKitView name="BallPulse" params={{ count: 5, minScale: 0.5 }} color="#4fc1e9" />
```

The indicator is drawn in a square that fills the smaller edge of the view.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `name` | built-in indicator name | `'BallPulse'` | Built-in to draw. Use either `name` or `spec` |
| `spec` | `IndicatorSpec` | | A custom indicator, see [Custom specs](#custom-specs) |
| `params` | `Record<string, number>` | | Param overrides. Unknown names are ignored |
| `color` | color | `'white'` | Color of every element |
| `colors` | color[] | | One color per element, repeated when there are more elements. Wins over `color` |
| `speed` | number | `1` | Playback rate. Changing it never makes the animation jump |
| `animating` | boolean | `true` | `false` freezes the current frame |
| `hidesWhenStopped` | boolean | `false` | Draw nothing while `animating` is `false` |
| `cycleProgress` | number in [0, 1] | | A frozen point of the animation cycle. It is not the progress of a task |
| `reduceMotion` | `'system' \| 'never' \| 'always'` | `'system'` | `system` shows a still frame when the system asks for reduced motion |

Every `View` prop applies as well. `BUILTIN_INDICATOR_NAMES` lists the built-in names at runtime, and `BuiltinIndicatorName` is their type.

## Progress indicators {#progress}

`LoaderKitProgress` shows how much of a task is done: 50 designs across 10 types. Set `value` to a number in [0, 1], or leave it `null` for the indeterminate animation. New values glide along a curve that follows the rhythm of your updates and never passes the real value; `smooth={false}` jumps instead.

```tsx
import { LoaderKitProgress } from 'react-native-loader-kit';

<LoaderKitProgress value={progress} />
<LoaderKitProgress type="linear" variant="wavy" value={progress} />
<LoaderKitProgress type="gauge" value={progress} showLabel size={64} />
<LoaderKitProgress value={null} /> {/* indeterminate */}

<LoaderKitProgress value={progress} accessibilityLabel="Uploading video">
  <StopButton onPress={cancel} />
</LoaderKitProgress>
```

See [Types and variants](/guide/progress#types-and-variants) for every type and the box it takes.

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `value` | number in [0, 1] or `null` | `null` | `null` shows the indeterminate animation |
| `smooth` | boolean | `true` | Glide to new values |
| `type` | `ProgressType` | `'circular'` | |
| `variant` | `ProgressVariant` | the first of the type | |
| `buffer` | number in [0, 1] | | Buffered part of linear `flat` and `wavy` |
| `size` | number | `48` | Width of every type but linear and border |
| `color` | color | accent color | |
| `trackColor` | color | `color` at 24% opacity | |
| `labelColor` | color | text color | |
| `showLabel` | boolean | `false` | The percentage, inside or next to the indicator |
| `thickness` | number | depends on the type | |
| `trackGap` | number | `4` | Space between the progress and the track, or between segments |
| `segments` | number | depends on the variant | Segments, dots, ticks, steps, bars or grid columns |
| `stopIndicator` | boolean | `true` | Dot at the end of the track of linear `flat` and `wavy` |
| `strokeCap` | `'round' \| 'butt'` | `'round'` | |
| `amplitude`, `wavelength`, `waveSpeed` | number | `3`, `40`, `1` for linear; `2`, `15`, `1` for circular | The wave of `wavy` |
| `sweepAngle` | number | `270` | Arc of `gauge`, in degrees |
| `cornerRadius` | number | `12` | Corners of `border` |
| `speed` | number | `1` | Playback rate of the indeterminate animation. 0 or less pauses it |
| `reduceMotion` | `'system' \| 'never'` | `'system'` | `system` jumps to new values, stops the waves, stripes and sheens, and slows the indeterminate animation while the system asks for reduced motion |

`LoaderKitProgress` is a `View` holding the drawing, which fills it, and the children, drawn above it, so every `View` prop applies (`pointerEvents`, `borderRadius`, `onLayout` and so on). The style you pass wins over the box of the type, and the drawing fits whatever box it gets: for the square types, a `width` and `height` of 120 in `style` give the same box as `size={120}`. The types with a `size` center their children, which suits a stop button over circular, pie and gauge; `border` frames them.

Screen readers announce a progress bar and its percentage. `accessibilityLabel` names it (default "Loading" on iOS); the children stay reachable on their own.

## Custom specs

::: warning Experimental
Writing your own spec is experimental: until the schema is declared stable, a minor release may change it. Built-in indicators are not affected.
:::

`defineIndicator` checks a spec and throws an `InvalidIndicatorError` that lists every problem. `param` refers to a param of the spec.

```tsx
import { LoaderKitView, defineIndicator, param } from 'react-native-loader-kit';

const Blink = defineIndicator({
  name: 'Blink',
  duration: 0.9, // seconds per cycle
  params: { count: 4, low: 0.15 },
  layout: { type: 'row', count: param('count'), gap: 0.08 },
  shape: { type: 'rect', cornerRadius: 0.25 },
  stagger: { each: 0.15 }, // element i starts 0.15 * i seconds later
  tracks: [
    { property: 'opacity', keyTimes: [0, 0.5, 1], values: [1, param('low'), 1], easing: 'easeInOut' },
    { property: 'scaleY', keyTimes: [0, 0.5, 1], values: [1, 0.5, 1], easing: 'easeInOut' },
  ],
});

<LoaderKitView spec={Blink} params={{ count: 6 }} color="white" style={{ width: 60, height: 60 }} />
```

Define specs outside of components, or memoize them: a new spec object restarts the animation. `validate(spec)` returns the same list of problems without throwing. See [Custom indicators](/spec/) for the format; the same spec runs in native Android, iOS, macOS and Windows apps and on the web.

## Migrating from version 4 {#migrating-from-v4}

- The New Architecture is required, see [Requirements](#requirements).
- `animationSpeedMultiplier` is now `speed`.
- `IndicatorName` is now `BuiltinIndicatorName`, and `ALL_INDICATORS` is `BUILTIN_INDICATOR_NAMES`.
- `CommonIndicatorName`, `IOSOnlyIndicatorName`, `COMMON_INDICATORS`, `IOS_ONLY_INDICATORS`, `isIndicatorAvailableOnPlatform` and `getAvailableIndicators` are gone: every indicator works on both platforms. `BallRotateChase` and `CircleStrokeSpin`, which were iOS only, now work on Android too.
- The indicator names are unchanged.
- On Android the indicators no longer come from AVLoadingIndicatorView, so their timing now matches iOS: easing curves, keyframe times, start delays and density-independent sizes.

## Troubleshooting

### uses-sdk:minSdkVersion XX cannot be smaller than version YY {#uses-sdk-minsdkversion}

LoaderKit needs `minSdkVersion` 24. The library reads `minSdkVersion`, `compileSdkVersion`, `targetSdkVersion` and `kotlinVersion` from the `ext` block of your `android/build.gradle`, as the React Native template defines them, so raise `minSdkVersion` there:

```groovy
buildscript {
    ext {
        minSdkVersion = 24
        compileSdkVersion = 35
        targetSdkVersion = 35
        kotlinVersion = "2.0.21"
    }
}
```

## See also

- [Customizing](/guide/customizing) and [Playback](/guide/playback): params, colors, size, speed, stopping and reduced motion.
- [Using a spec](/spec/using): validation and limits.
- The [example app](https://github.com/maitrungduc1410/react-native-loader-kit/tree/master/example) of the library.
