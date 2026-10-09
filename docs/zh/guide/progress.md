---
description: "LoaderKitProgress：50 种进度样式（linear、circular、pie、gauge、liquid、border、bars、grid、battery、hourglass），支持确定与不确定状态，在 Web、Android、iOS、macOS 和 Windows 上平滑过渡 value。"
---

# 进度指示器

`LoaderKitProgress` 用来显示任务完成了多少。它有 10 种 type、50 种样式，每种样式都可以显示具体的 value，也可以在 value 未知时以不确定状态运行。value 变化时，指示器会平滑过渡到新的 value。点击任意一种样式即可打开面板：调整 value、粗细、尺寸和颜色，然后复制对应平台的代码。

::: tip 内置加载动画还是进度指示器？
- **始终没有百分比**（等待请求、下拉刷新）：用[内置加载动画](/zh/guide/indicators)，有 50 种样式可选。
- **任务有进度**，哪怕一开始还不知道（下载、上传、处理文件）：用本页的进度指示器。先以不确定状态开始（`value` 为 null，Swift 中为 `nil`），知道进度后再设置 value。始终是同一个组件，其他代码都不用改。
:::

<ProgressGallery />

进度指示器不使用 JSON spec。每种 type 在所有平台上都由同一套几何逻辑绘制：一份参考实现把选项和动画状态转换成绘制命令，每个平台的移植版本都运行同一套测试向量。因此同一种样式在 Web、Android、iOS、macOS 和 Windows 上的外观和动效都一致。

## 快速开始 {#quick-start}

::: code-group

```html [HTML]
<script type="module">
  import '@loader-kit/web/progress-element';
</script>

<!-- 不确定状态的 circular，48 × 48 -->
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
progress.value = 0.8   // 平滑过渡到 0.8
```

```swift [SwiftUI]
LoaderKitProgress(value: progress, type: .linear)
```

```xml [XAML]
<lk:LoaderKitProgress Type="Linear" Value="{x:Bind ViewModel.Progress, Mode=OneWay}" />
```

:::

## Value {#value}

`value` 的范围是 0 到 1，超出范围的值会被截断。`null`（Swift 中为 `nil`）或 NaN 会显示不确定状态的动画，所以同一个视图既能表示"还不知道进度"，也能表示"已完成 40%"：

::: code-group

```ts [TypeScript]
const view = new LoaderKitProgressView(host, { type: 'linear' });  // 不确定状态
view.value = 0.25;
view.value = null;   // 回到不确定状态
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

`buffer` 会在 linear `flat` 和 `wavy` 的 value 前方再画一条颜色更浅的进度条，类似视频已缓冲的部分。

## 平滑过渡 {#smooth}

`smooth` 默认开启。新的 value 不会直接跳过去，而是平滑过渡，百分比标签也会跟着计数。过渡的节奏会跟随更新的频率：

- 连续密集的更新（比如下载文件时不断到达的数据）会匀速前进，而不是每次更新都停一下。
- 单独的一次更新用时半秒，结尾逐渐减速。
- 向回走（比如回到 0）用时 0.4 秒。
- 绘制出的 value 永远不会超过真实 value，在 value 增长时也不会向回走。

屏幕阅读器读取的始终是真实 value，而不是正在绘制的 value。关闭 `smooth` 后，每个 value 都会立即绘制：

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

## Type 与 variant {#types-and-variants}

`type` 决定形状，`variant` 决定风格。如果某个 type 没有指定的 variant，会回退到它列表中的第一个 variant。

| Type | Variant | 布局不限制尺寸时的大小 |
| --- | --- | --- |
| `linear` | `flat`、`wavy`、`segmented`、`striped`、`shimmer`、`glow`、`dots`、`steps`、`gradient`、`center`、`chevrons`、`ticks` | 宽度占满；高度取决于 thickness |
| `circular`（默认） | `flat`、`wavy`、`segmented`、`gradient`、`ticks`、`dots`、`glow`、`split`、`orbit`、`dual` | `size` × `size` |
| `pie` | `flat`、`segmented` | `size` × `size` |
| `gauge` | `flat`、`segmented`、`needle`、`gradient`、`dots` | `size` × `size` |
| `liquid` | `flat`、`heart` | `size` × `size` |
| `border` | `flat`、`glow`、`segmented` | 包裹内容 |
| `bars` | `flat`、`dots`、`arcs` | `size` × 0.75 `size` |
| `grid` | `flat`、`dots` | `size` × `size` |
| `battery` | `flat`、`segmented` | `size` × 0.5 `size` |
| `hourglass` | `flat` | `size` × `size` |

`size` 是像素数（Android 上是 dp，Apple 上是 point），默认是 48；与 `LoaderKit` 不同，它不接受 CSS 长度。小于 32 时，circular `wavy` 会画成平的，因为这么小的尺寸下波浪已经看不清。`hourglass` 没有显示百分比的空间，所以会忽略 `showLabel`。

有些样式即使 value 不变也会动：`wavy` 和 `liquid` 的波浪、`striped` 的条纹和 `shimmer` 的光泽。

## 选项 {#options}

| 选项 | 默认值 | 作用 |
| --- | --- | --- |
| `thickness` | 取决于 type 和 variant | 线条和进度条的粗细 |
| `trackGap` | 4 | 进度与 track 之间、或各段之间的间距 |
| `segments` | 取决于 type 和 variant | 段、点、刻度、步骤、柱子的数量，或 grid 的列数 |
| `showLabel` | false | 在指示器内部或旁边显示百分比 |
| `stopIndicator` | true | linear `flat` 和 `wavy` 的 track 末端的圆点 |
| `strokeCap` | `round` | 线条端点：`round` 或 `butt` |
| `amplitude`、`wavelength`、`waveSpeed` | linear 为 3、40、1；circular 为 2、15、1 | `wavy` 的波浪 |
| `sweepAngle` | 270 | `gauge` 的弧度，单位为度，范围 30 到 350 |
| `cornerRadius` | 12 | `border` 的圆角 |
| `speed` | 1 | 不确定状态动画的播放速度；0 或更小会暂停 |
| `color` | 强调色；Web 上为 CSS `color` | 进度部分 |
| `trackColor` | `color` 的 24% 不透明度 | track |
| `labelColor` | 文字颜色；Web 上为 CSS `color` | 百分比标签 |
| `respectsReduceMotion` | true | 见[减弱动态效果](#reduced-motion) |

长度单位在 Web 上是 CSS px，在 Android 上是 dp，在 Apple 平台上是 point，在 Windows 上是有效像素。

### 各平台的名称 {#names-on-each-platform}

| 概念 | `<loader-kit-progress>` | React、Vue、Svelte、Android、Compose、Swift | Windows |
| --- | --- | --- | --- |
| Value | `value` | `value` | `Value` |
| 平滑过渡 | `smooth` | `smooth` | `Smooth` |
| 选项 | `track-gap`、`show-label`、`stop-indicator`、`stroke-cap`、`wave-speed`、`sweep-angle`、`corner-radius` | `trackGap`、`showLabel`、`stopIndicator`、`strokeCap`、`waveSpeed`、`sweepAngle`、`cornerRadius` | `TrackGap`、`ShowLabel`、`StopIndicator`、`StrokeCap`、`WaveSpeed`、`SweepAngle`、`ProgressCornerRadius` |
| 颜色 | `color`、`track-color`、`label-color` | `color`、`trackColor`、`labelColor` | `Color`、`TrackColor`、`LabelColor` |

在 SwiftUI 中，每个选项都是一个 modifier（`.thickness(6)`、`.showLabel()`）。在 Android XML 中，每个选项都是 `app:progress` 加上它的名称（`app:progressType`、`app:progressValue`、`app:progressShowLabel`、`app:progressSweepAngle`、`app:progressRespectsReduceMotion` 等），只有速度是 `app:speed`，与 `LoaderKitView` 相同。在 Windows 上，每个控件都已经有 `CornerRadius` 属性，所以这个选项叫 `ProgressCornerRadius`。

## 内容 {#content}

进度指示器可以包含内容：放在 `circular`、`pie`、`gauge` 等方形 type 的中间，或者放在 `border` 的描边内部，此时边框会扩展以包裹内容。

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

Android 视图是一个 `ViewGroup`：在 XML 中或用 `addView` 添加子视图。在 UIKit 和 AppKit 中，把要显示的视图赋给 `contentView`，例如 `progress.contentView = stopButton`。

## 无障碍 {#accessibility}

所有平台都把指示器作为进度条暴露给辅助技术，value 以 0 到 100 的百分比表示，不确定状态下没有 value。在 Web、Apple 平台和 Windows 上，默认的无障碍名称是 "Loading"；Android 会读出进度条和百分比。请说明正在加载的内容：使用 `aria-label`（React、Vue 和 Svelte 组件中为 `accessibilityLabel`）、Android 和 Compose 上的 `contentDescription`、Apple 平台上的 `accessibilityLabel`，或 Windows 上的 `AutomationProperties.Name`。

## 减弱动态效果 {#reduced-motion}

当系统要求减弱动态效果时，value 会直接跳到新值而不是平滑过渡，波浪、条纹和光泽会停止，不确定状态的动画以一半速度运行，让用户仍能看出任务正在进行。各平台的系统设置见[播放控制](/zh/guide/playback#reduced-motion)。把 `respectsReduceMotion` 设为 false 可以保留完整的动效。
