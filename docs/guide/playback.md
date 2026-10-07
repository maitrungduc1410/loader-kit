---
description: "Control LoaderKit playback: speed, start and stop, hide when stopped, freeze a frame with cycleProgress, and respect the reduced motion setting."
---

# Playback

The playback rules are the same on every platform. They are state of the view, not part of the indicator spec. Try them here:

<PlaybackDemo />

## Property names

| Concept | Web | Android View | Compose | iOS, macOS | Windows |
| --- | --- | --- | --- | --- | --- |
| Speed | `speed` | `speed` | `speed` | `speed`, `.speed()` | `Speed` |
| Start and stop | `animating`, `start()`, `stop()` | `isAnimating`, `start()`, `stop()` | `animating` | `isAnimating`, `startAnimating()`, `stopAnimating()`, `.animating()` | `IsAnimating` |
| Hide when stopped | `hidesWhenStopped` | `hidesWhenStopped` | not available | `hidesWhenStopped`, `.hidesWhenStopped()` | `HidesWhenStopped` |
| Freeze a frame | `cycleProgress` | `cycleProgress` | `cycleProgress` | `cycleProgress`, `.cycleProgress()` | `CycleProgress` |
| Reduced motion | `respectsReduceMotion` | `respectsReduceMotion` | `respectsReduceMotion` | `respectsReduceMotion`, `.respectsReduceMotion()` | `RespectsReduceMotion` |

On the `<loader-kit>` element, the attributes are `speed`, `animating`, `hides-when-stopped`, `cycle-progress` and `respects-reduce-motion`.

## Speed {#speed}

`speed` is a playback rate. The default is 1, the speed of the spec. 2 is twice as fast, 0.5 is half as fast. A speed of 0 or less pauses the indicator.

Changing the speed never makes the animation jump. The engine keeps a clock and only changes how fast it advances.

::: code-group

```html [HTML]
<loader-kit indicator="SquareSpin" speed="0.5"></loader-kit>
```

```kotlin [Kotlin (View)]
loader.speed = 0.5
```

```kotlin [Compose]
LoaderKitIndicator("SquareSpin", speed = 0.5)
```

```swift [SwiftUI]
LoaderKitIndicator("SquareSpin").speed(0.5)
```

```xml [XAML]
<lk:LoaderKitIndicator Indicator="SquareSpin" Speed="0.5" />
```

:::

## Start and stop

Stopping freezes the current frame. Starting again continues from that frame, not from the beginning.

With `hidesWhenStopped` (true by default, like `UIActivityIndicatorView`), a stopped indicator draws nothing. Set it to false to keep the frozen frame visible.

::: code-group

```html [HTML]
<loader-kit indicator="BallPulse" animating="false" hides-when-stopped="false"></loader-kit>
```

```ts [TypeScript]
view.hidesWhenStopped = false;
view.stop();
view.start();
```

```kotlin [Kotlin (View)]
loader.hidesWhenStopped = false
loader.stop()
loader.start()
```

```kotlin [Compose]
// Compose has no hidesWhenStopped: show or remove the composable instead.
if (isLoading) LoaderKitIndicator("BallPulse")
```

```swift [SwiftUI]
LoaderKitIndicator("BallPulse")
    .animating(isLoading)
    .hidesWhenStopped(false)
```

```xml [XAML]
<lk:LoaderKitIndicator IsAnimating="{x:Bind ViewModel.IsBusy, Mode=OneWay}" HidesWhenStopped="False" />
```

:::

## Freeze a frame with cycleProgress {#cycle-progress}

`cycleProgress` draws one still frame at a point of the animation cycle, from 0 to 1. Use it for screenshot tests, previews and design reviews. Set it back to null (`nil` in Swift) to resume the clock from where it was.

::: warning It is not a progress bar
`cycleProgress` does not show how much of a task is done. 0.5 is the middle of one loop of the animation. An indicator does not fill up as the value goes from 0 to 1.
:::

The engine skips whole cycles until every element has started. So in a frozen frame, no element is still waiting for its [stagger](/spec/timing#stagger) delay.

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: center; margin: 16px 0;">
  <LoaderKitPreview indicator="BallPulse" :cycle-progress="0" />
  <LoaderKitPreview indicator="BallPulse" :cycle-progress="0.25" />
  <LoaderKitPreview indicator="BallPulse" :cycle-progress="0.5" />
  <LoaderKitPreview indicator="BallPulse" :cycle-progress="0.75" />
</div>

::: code-group

```html [HTML]
<loader-kit indicator="BallPulse" cycle-progress="0.25"></loader-kit>
```

```kotlin [Kotlin (View)]
loader.cycleProgress = 0.25   // null resumes. In XML: app:cycleProgress="0.25"
```

```kotlin [Compose]
LoaderKitIndicator("BallPulse", cycleProgress = 0.25)
```

```swift [SwiftUI]
LoaderKitIndicator("BallPulse").cycleProgress(0.25)
```

```csharp [C#]
indicator.CycleProgress = 0.25;
indicator.CycleProgress = null;   // the clock resumes from where it was
```

:::

## Reduced motion

When the user asks the system for reduced motion, LoaderKit draws a still frame (the frame at `cycleProgress` 0) instead of animating. This is on by default. Set `respectsReduceMotion` to false only when the animation carries meaning the user needs.

| Platform | System setting |
| --- | --- |
| Web | the `prefers-reduced-motion: reduce` media query |
| Android | animations turned off (Accessibility > Remove animations, or an animator duration scale of 0) |
| iOS | Settings > Accessibility > Motion > Reduce Motion |
| macOS | System Settings > Accessibility > Display > Reduce motion |
| Windows | Settings > Accessibility > Visual effects > Animation effects turned off |

## What restarts the animation

| Change | Effect |
| --- | --- |
| Indicator name, spec or params | restarts the clock at 0 |
| Color, colors, speed, size | no restart |
| Stop, then start | continues from the frozen frame |
| Set, then clear `cycleProgress` | continues from where the clock was |

On Android, the clock also pauses while the view is detached or hidden. On iOS and the other UIKit platforms, animations resume when the app returns to the foreground or the view moves to a new window. On macOS, they resume when the view moves to a new window.

## Reusing a view

Native views can be recycled in a list. `reset()` restores every property to its default and restarts the animation:

::: code-group

```kotlin [Kotlin (View)]
loader.reset()
```

```swift [Swift (UIKit)]
loader.reset()
```

:::
