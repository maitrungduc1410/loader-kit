---
description: "控制 LoaderKit 的播放：速度、启动与停止、停止时隐藏、用 cycleProgress 定格某一帧，并遵循系统的减弱动态效果设置。"
---

# 播放控制

播放规则在所有平台上都一样。它们属于视图的状态，而不是加载动画 spec 的一部分。在这里试一试：

<PlaybackDemo />

## 属性名称 {#property-names}

| 功能 | Web | Android View | Compose | iOS、macOS | Windows |
| --- | --- | --- | --- | --- | --- |
| 速度 | `speed` | `speed` | `speed` | `speed`、`.speed()` | `Speed` |
| 启动与停止 | `animating`、`start()`、`stop()` | `isAnimating`、`start()`、`stop()` | `animating` | `isAnimating`、`startAnimating()`、`stopAnimating()`、`.animating()` | `IsAnimating` |
| 停止时隐藏 | `hidesWhenStopped` | `hidesWhenStopped` | 不支持 | `hidesWhenStopped`、`.hidesWhenStopped()` | `HidesWhenStopped` |
| 定格一帧 | `cycleProgress` | `cycleProgress` | `cycleProgress` | `cycleProgress`、`.cycleProgress()` | `CycleProgress` |
| 减弱动态效果 | `respectsReduceMotion` | `respectsReduceMotion` | `respectsReduceMotion` | `respectsReduceMotion`、`.respectsReduceMotion()` | `RespectsReduceMotion` |

在 `<loader-kit>` 元素上，对应的 HTML 属性是 `speed`、`animating`、`hides-when-stopped`、`cycle-progress` 和 `respects-reduce-motion`。

## 速度 {#speed}

`speed` 是播放速率。默认值为 1，即 spec 本身的速度；2 是两倍速，0.5 是半速。小于等于 0 时动画暂停。

修改速度不会让动画跳帧。引擎内部维护着一个时钟，改变的只是时钟走得多快。

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

## 启动与停止 {#start-and-stop}

停止会定格在当前帧。再次启动时从这一帧继续，而不是从头开始。

`hidesWhenStopped` 默认为 true（和 `UIActivityIndicatorView` 一样），此时停止后的加载动画什么都不画。设为 false，定格的画面就会保持可见。

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
// Compose 没有 hidesWhenStopped：直接显示或移除这个可组合项即可。
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

## 用 cycleProgress 定格一帧 {#cycle-progress}

`cycleProgress` 在动画周期的某个位置（0 到 1）画出一帧静止画面，适合截图测试、预览和设计评审。把它设回 null（Swift 中为 `nil`），时钟会从原来的位置继续走。

::: warning 它不是进度条
`cycleProgress` 并不表示任务完成了多少。0.5 只是动画一轮的中间点。值从 0 变到 1 时，加载动画并不会被“填满”。要显示进度，请使用[进度指示器](/zh/guide/progress)。
:::

引擎会先跳过若干个完整周期，直到所有元素都已启动。所以在定格的画面里，不会有元素还在等待它的 [stagger](/zh/spec/timing#stagger) 延迟。

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
loader.cycleProgress = 0.25   // 设为 null 恢复播放。XML 中写 app:cycleProgress="0.25"
```

```kotlin [Compose]
LoaderKitIndicator("BallPulse", cycleProgress = 0.25)
```

```swift [SwiftUI]
LoaderKitIndicator("BallPulse").cycleProgress(0.25)
```

```csharp [C#]
indicator.CycleProgress = 0.25;
indicator.CycleProgress = null;   // 时钟从原来的位置继续
```

:::

## 减弱动态效果 {#reduced-motion}

当用户在系统中开启减弱动态效果时，LoaderKit 会显示一帧静止画面（`cycleProgress` 为 0 时的那一帧），而不播放动画。这个行为默认开启。只有当动画本身承载了用户需要的信息时，才把 `respectsReduceMotion` 设为 false。

| 平台 | 系统设置 |
| --- | --- |
| Web | `prefers-reduced-motion: reduce` 媒体查询 |
| Android | 动画已关闭（无障碍 > 移除动画，或者把动画时长缩放设为 0） |
| iOS | 设置 > 辅助功能 > 动态效果 > 减弱动态效果 |
| macOS | 系统设置 > 辅助功能 > 显示 > 减弱动态效果 |
| Windows | 设置 > 辅助功能 > 视觉效果 > 关闭动画效果 |

## 哪些操作会重启动画 {#what-restarts-the-animation}

| 变更 | 效果 |
| --- | --- |
| 加载动画名称、spec 或参数 | 时钟归零，重新开始 |
| 颜色、多色、速度、尺寸 | 不重启 |
| 先停止再启动 | 从定格的帧继续 |
| 设置 `cycleProgress` 后再清除 | 从时钟原来的位置继续 |

在 Android 上，视图被 detach 或隐藏时，时钟也会暂停。在 iOS 等 UIKit 平台上，App 回到前台或视图移到新窗口时，动画会自动恢复。在 macOS 上，视图移到新窗口时动画会自动恢复。

## 复用视图 {#reusing-a-view}

原生视图可以在列表中复用。`reset()` 会把所有属性恢复为默认值，并重新开始动画：

::: code-group

```kotlin [Kotlin (View)]
loader.reset()
```

```swift [Swift (UIKit)]
loader.reset()
```

:::
