---
description: "LoaderKit 常见问题：性能、无障碍、与 GIF、Lottie 和 CSS 加载动画的对比，以及加载动画不显示时如何排查。"
---

# 常见问题

## 性能 {#performance}

### 主线程繁忙时，加载动画还会继续播放吗？ {#does-an-indicator-keep-animating-when-the-main-thread-is-busy}

这取决于各平台的引擎：

- **iOS 和 macOS**：引擎把 spec 转换成 Core Animation 的图层和动画，由系统负责播放，所以主线程繁忙时它们照样在动。
- **Windows**：控件在 UI 线程上逐帧更新 `Microsoft.UI.Composition` 的 visual（`CompositionTarget.Rendering`），所以 UI 线程繁忙时动画也会跟着卡。
- **Android**：视图每一帧都在主线程上绘制到 `Canvas`，所以主线程繁忙时动画会卡。视图被 detach 或隐藏时，时钟会暂停。
- **Web**：引擎在每个动画帧都绘制到同一个 `<canvas>` 上，也是在主线程，长任务会让动画卡顿。

### 一个加载动画有多重？ {#how-heavy-is-an-indicator}

内置加载动画包含 1 到 9 个元素，每个元素都是一个简单形状。不需要解码图片，也不需要下载文件。内置 spec 直接编译进了每个引擎。

如果自定义 spec 的元素超过 10,000 个，或者圆环弧段超过 10,000 段，引擎会拒绝它，因此 spec 无法要求无限量的绘制。详见[限制](/zh/spec/using#limits)。

### 屏幕外的加载动画需要停止吗？ {#should-i-stop-indicators-that-are-off-screen}

需要。任务完成后停止加载动画，或者把它从视图树中移除。开启 `hidesWhenStopped` 时，停止后的加载动画什么都不画。在 Web 上，不再需要的 `LoaderKitView` 记得调用 `destroy()`。

## 无障碍 {#accessibility}

### 屏幕阅读器会读出什么？ {#what-do-screen-readers-announce}

- **Web**：`<loader-kit>`（React、Vue、Svelte 组件渲染的也是它）带有 `role="progressbar"`，不带进度值（即不确定进度条），并且带有 `aria-label="Loading"`，除非你设置了自己的标签。隐藏时它是 `aria-hidden` 的。
- **Windows**：控件向 UI Automation 报告自己是一个进度条。
- **Android 和 Apple**：视图不添加任何标签。请在 Android 上设置 `contentDescription`，在 iOS 和 macOS 上设置 `accessibilityLabel`，或者在周围的界面中说明加载状态。

```html
<loader-kit indicator="BallPulse" aria-label="Loading messages"></loader-kit>
```

### 会遵循减弱动态效果设置吗？ {#is-reduced-motion-respected}

会，所有平台默认都遵循。见[减弱动态效果](/zh/guide/playback#reduced-motion)。

## 对比 {#comparison}

### 为什么不用 GIF 或动图？ {#why-not-a-gif-or-an-animated-image}

GIF 的尺寸、颜色和帧率都是固定的，在高分屏上还可能发虚。LoaderKit 的加载动画以矢量图形绘制，按视图尺寸渲染，颜色任选，帧率跟随屏幕。运行时还能调整速度或定格某一帧。

### 为什么不用 Lottie？ {#why-not-lottie}

Lottie 播放的是从设计工具导出的动画，适合插画和复杂动效。LoaderKit 的定位更窄：在布局中摆放简单形状，用关键帧 track 驱动。换来的是 spec 体积小、可读性好，手写或借助 [AI 助手](/zh/tools/ai)都很容易；参数还能让一份 spec 覆盖多个变体（比如 3 个点或 5 个点）。

### 为什么不用 CSS 动画或平台自带的 spinner？ {#why-not-css-animations-or-a-platform-spinner}

平台自带的 spinner 在每个平台上长得都不一样，而 CSS 只能用在 Web 上。LoaderKit 只要一个名字或一份 spec，就能在 Android、iOS、macOS、Windows 和 Web 上给你同一个加载动画。

### 它和 react-native-loader-kit 是一回事吗？ {#is-it-the-same-as-react-native-loader-kit}

[`react-native-loader-kit`](/zh/platforms/react-native) 基于 LoaderKit 构建。它使用 Android 和 iOS 引擎，所以加载动画完全相同。

## 问题排查 {#troubleshooting}

### 什么都没画出来 {#nothing-is-drawn}

按顺序检查：

1. **视图有尺寸。** 默认是 40 × 40。在 Web 上，如果父元素是 `display: none` 或者尺寸为 0，它就会被隐藏。
2. **颜色可见。** 默认颜色可能和背景相同：Windows 上是白色，Apple 平台上是 `systemGray`，Android 上是主题前景色，Web 上是 `currentColor`。
3. **加载动画正在播放。** 开启 `hidesWhenStopped` 时（默认开启），停止后的加载动画什么都不画。
4. **名称或 spec 有效。** 未知名称或无效 spec 什么都不画，并报告错误。查看 `specError`（Web、Apple）、`onError`（Android View）、Logcat（Compose），或者 `SpecError` 和 `SpecFailed`（Windows）。名称区分大小写：是 `BallPulse`，不是 `ballPulse`。
5. **在 Web 上，元素已经注册。** React、Vue、Svelte 组件会自动注册它。如果你直接手写 `<loader-kit>`，只有在浏览器中执行过 `import '@loader-kit/web/element'` 之后它才能工作。

### 加载动画不动 {#the-indicator-does-not-move}

- `speed` 小于等于 0。
- 设置了 `cycleProgress`。把它设为 null 才会播放。
- 系统开启了减弱动态效果，所以显示的是静止画面。这是预期行为。

### 参数没有效果 {#my-params-have-no-effect}

说明这个加载动画没有声明这些参数。内置动画中只有 `BallPulse` 和 `BallSpinFadeLoader` 支持参数。未知的参数名是有意被忽略的。见[参数表](/zh/guide/indicators#the-params)。

### 自定义 spec 被拒绝 {#my-custom-spec-is-rejected}

用 `validate()` 跑一遍，或者粘贴到 [Playground](/zh/tools/playground) 里：两者都会列出每个问题及其路径，例如 `tracks[0].values must have the same length as keyTimes`。见[使用 spec](/zh/spec/using#errors)。
