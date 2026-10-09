---
description: "LoaderKitProgress: 30 progress designs (linear, circular, pie, gauge, liquid, border, bars, grid, battery), determinate or indeterminate, with smooth value changes on the web, Android, iOS, macOS and Windows."
---

# Progress indicators

`LoaderKitProgress` shows how much of a task is done. It has 9 types and 30 designs, and each one runs with a value or, when the value is unknown, indeterminate. When the value changes, the indicator glides to it.

<ProgressGallery />

Progress indicators are not JSON specs. Every type is drawn from the same geometry on every platform: a reference implementation turns the options and the animation state into draw commands, and each platform runs the same test vectors against its own port. A design looks and moves the same on the web, Android, iOS, macOS and Windows.

## Quick start

::: code-group

```html [HTML]
<script type="module">
  import '@loader-kit/web/progress-element';
</script>

<!-- Indeterminate circular, 48 × 48 -->
<loader-kit-progress></loader-kit-progress>

<loader-kit-progress type="linear" value="0.4"></loader-kit-progress>
<loader-kit-progress type="gauge" value="0.7" show-label size="64"></loader-kit-progress>
```

```tsx [React]
import { LoaderKitProgress } from '@loader-kit/web/react';

<LoaderKitProgress type="linear" value={progress} />
<LoaderKitProgress value={done ? 1 : null} />
```

```vue [Vue]
<script setup lang="ts">
import { LoaderKitProgress } from '@loader-kit/web/vue';
</script>

<template>
  <LoaderKitProgress type="linear" :value="progress" />
</template>
```

```svelte [Svelte]
<script>
  import { LoaderKitProgress } from '@loader-kit/web/svelte';
</script>

<LoaderKitProgress type="linear" value={progress} />
```

```xml [Android XML]
<io.github.maitrungduc1410.loaderkit.LoaderKitProgressView
    android:id="@+id/progress"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    app:progressType="linear"
    app:progressValue="0.4" />
```

```kotlin [Compose]
LoaderKitProgress(
    value = progress,
    modifier = Modifier.fillMaxWidth(),
    type = ProgressType.Linear,
)
```

```swift [UIKit]
let progress = LoaderKitProgressView(value: 0.4, type: .linear)
progress.value = 0.8   // glides to 0.8
```

```swift [SwiftUI]
LoaderKitProgress(value: progress, type: .linear)
```

```xml [XAML]
<lk:LoaderKitProgress Type="Linear" Value="{x:Bind ViewModel.Progress, Mode=OneWay}" />
```

:::

## Value

`value` goes from 0 to 1. Values outside that range are clamped. `null` (`nil` in Swift), or NaN, shows the indeterminate animation, so the same view covers "we do not know yet" and "40% done":

::: code-group

```ts [TypeScript]
const view = new LoaderKitProgressView(host, { type: 'linear' });  // indeterminate
view.value = 0.25;
view.value = null;   // back to indeterminate
```

```kotlin [Kotlin (View)]
progress.value = 0.25
progress.value = null
```

```swift [Swift (UIKit)]
progress.value = 0.25
progress.value = nil
```

```csharp [C#]
progress.Value = 0.25;
progress.Value = null;
```

:::

`buffer` adds a second, lighter bar ahead of the value on linear `flat` and `wavy`, like the loaded part of a video.

## Smooth value changes {#smooth}

`smooth` is on by default. A new value does not jump: the indicator glides to it, and the percentage label counts along. The glide follows the rhythm of the updates:

- A stream of updates close together, like the bytes of a download, moves at a steady pace instead of stopping at each one.
- An update on its own takes half a second and slows down at the end.
- Going back, for example to 0, takes 0.4 seconds.
- The drawn value never passes the real value, and never moves backward while the value goes up.

Screen readers always read the real value, not the drawn one. Turn `smooth` off to draw every value as it comes:

::: code-group

```html [HTML]
<loader-kit-progress type="linear" value="0.4" smooth="false"></loader-kit-progress>
```

```tsx [React]
<LoaderKitProgress type="linear" value={progress} smooth={false} />
```

```kotlin [Compose]
LoaderKitProgress(value = progress, type = ProgressType.Linear, smooth = false)
```

```swift [SwiftUI]
LoaderKitProgress(value: progress, type: .linear).smooth(false)
```

```xml [XAML]
<lk:LoaderKitProgress Type="Linear" Value="{x:Bind ViewModel.Progress, Mode=OneWay}" Smooth="False" />
```

:::

## Types and variants

`type` picks the shape and `variant` its style. A variant the type does not have falls back to the first one in its list.

| Type | Variants | Size without layout constraints |
| --- | --- | --- |
| `linear` | `flat`, `wavy`, `segmented`, `striped`, `shimmer`, `glow`, `dots`, `steps` | fills the width; the height follows the thickness |
| `circular` (default) | `flat`, `wavy`, `segmented`, `gradient`, `ticks`, `dots` | `size` × `size` |
| `pie` | `flat` | `size` × `size` |
| `gauge` | `flat`, `segmented` | `size` × `size` |
| `liquid` | `flat` | `size` × `size` |
| `border` | `flat` | wraps its content |
| `bars` | `flat` | `size` × 0.75 `size` |
| `grid` | `flat` | `size` × `size` |
| `battery` | `flat` | `size` × 0.5 `size` |

`size` is a number of pixels (dp on Android, points on Apple), 48 by default; unlike `LoaderKit`, it takes no CSS lengths. Below 32, circular `wavy` draws flat, because the wave would not read at that size.

Some designs move even with a fixed value: the waves of `wavy` and `liquid`, the stripes of `striped` and the sheen of `shimmer`.

## Options

| Option | Default | Applies to |
| --- | --- | --- |
| `thickness` | depends on the type and variant | width of strokes and bars |
| `trackGap` | 4 | space between the progress and the track, or between segments |
| `segments` | depends on the type and variant | segments, dots, ticks, steps, bars or grid columns |
| `showLabel` | false | the percentage, inside or next to the indicator |
| `stopIndicator` | true | the dot at the end of the track of linear `flat` and `wavy` |
| `strokeCap` | `round` | stroke ends: `round` or `butt` |
| `amplitude`, `wavelength`, `waveSpeed` | 3, 40, 1 for linear; 2, 15, 1 for circular | the wave of `wavy` |
| `sweepAngle` | 270 | the arc of `gauge`, in degrees from 30 to 350 |
| `cornerRadius` | 12 | the corners of `border` |
| `speed` | 1 | playback rate of the indeterminate animation; 0 or less pauses it |
| `color` | the accent color; on the web, the CSS `color` | the progress |
| `trackColor` | `color` at 24% opacity | the track |
| `labelColor` | the text color; on the web, the CSS `color` | the percentage |
| `respectsReduceMotion` | true | see [Reduced motion](#reduced-motion) |

Lengths are CSS px on the web, dp on Android, points on Apple platforms and effective pixels on Windows.

### Names on each platform

| Concept | `<loader-kit-progress>` | React, Vue, Svelte, Android, Compose, Swift | Windows |
| --- | --- | --- | --- |
| Value | `value` | `value` | `Value` |
| Smooth changes | `smooth` | `smooth` | `Smooth` |
| Options | `track-gap`, `show-label`, `stop-indicator`, `stroke-cap`, `wave-speed`, `sweep-angle`, `corner-radius` | `trackGap`, `showLabel`, `stopIndicator`, `strokeCap`, `waveSpeed`, `sweepAngle`, `cornerRadius` | `TrackGap`, `ShowLabel`, `StopIndicator`, `StrokeCap`, `WaveSpeed`, `SweepAngle`, `ProgressCornerRadius` |
| Colors | `color`, `track-color`, `label-color` | `color`, `trackColor`, `labelColor` | `Color`, `TrackColor`, `LabelColor` |

On SwiftUI every option is a modifier (`.thickness(6)`, `.showLabel()`). In Android XML every option is `app:progress` followed by its name (`app:progressType`, `app:progressValue`, `app:progressShowLabel`, `app:progressSweepAngle`, `app:progressRespectsReduceMotion`, ...), except the speed, which is `app:speed` as on `LoaderKitView`. On Windows, `CornerRadius` is already a property of every control, so the option is `ProgressCornerRadius`.

## Content

A progress indicator can hold content: in the middle of `circular`, `pie`, `gauge` and the other square types, or inside the stroke of `border`, which grows to wrap it.

::: code-group

```html [HTML]
<loader-kit-progress value="0.3">
  <button aria-label="Stop">■</button>
</loader-kit-progress>

<loader-kit-progress type="border">
  <button>Upload</button>
</loader-kit-progress>
```

```kotlin [Compose]
LoaderKitProgress(value = progress) {
    IconButton(onClick = cancel) { Icon(Icons.Filled.Stop, contentDescription = "Stop") }
}
```

```swift [SwiftUI]
LoaderKitProgress(value: progress, type: .border) {
    Button("Upload", action: upload)
}
```

```xml [XAML]
<lk:LoaderKitProgress Type="Border">
    <Button Content="Upload" Click="OnUpload" />
</lk:LoaderKitProgress>
```

:::

The Android view is a `ViewGroup`: add children in XML or with `addView`. On UIKit and AppKit, add subviews to `contentView`.

## Accessibility

Every platform exposes the indicator as a progress bar with the value as a percentage from 0 to 100, and without a value while indeterminate. On the web, Apple platforms and Windows the default accessible name is "Loading"; Android announces a progress bar and its percentage. Say what is loading with `aria-label` (`accessibilityLabel` in the React, Vue and Svelte components), `contentDescription` on Android and Compose, `accessibilityLabel` on Apple platforms or `AutomationProperties.Name` on Windows.

## Reduced motion

When the system asks for reduced motion, values jump instead of gliding, the waves, stripes and sheens stop, and the indeterminate animation runs at half speed so the indicator still shows that work is going on. See [Playback](/guide/playback#reduced-motion) for the system setting of each platform. Set `respectsReduceMotion` to false to keep the full motion.
