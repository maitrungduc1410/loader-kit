---
description: "在 Web、Android、iOS、macOS 或 Windows 上安装 LoaderKit，几行代码就能显示第一个加载动画，附各 UI 框架的示例。"
---

# 快速开始

## 环境要求 {#requirements}

| 平台 | 最低要求 |
| --- | --- |
| Android | `minSdk` 24 |
| iOS、macOS | iOS 15、macOS 12、Swift 5.9 |
| Windows | Windows 10 版本 1809（build 17763）、Windows App SDK 1.8、.NET 8 |
| Web | 支持 `<canvas>` 和自定义元素的任意浏览器 |

## 安装 {#installation}

::: code-group

```sh [npm]
npm install @loader-kit/web
```

```sh [yarn]
yarn add @loader-kit/web
```

```sh [pnpm]
pnpm add @loader-kit/web
```

:::

::: code-group

```kotlin [Android (Gradle)]
dependencies {
    implementation("io.github.maitrungduc1410:loaderkit-core:<version>")
    // Jetpack Compose（已包含 loaderkit-core）：
    implementation("io.github.maitrungduc1410:loaderkit-compose:<version>")
}
```

```swift [Swift Package Manager]
dependencies: [
    .package(url: "https://github.com/maitrungduc1410/loader-kit.git", from: "<version>"),
],
targets: [
    .target(name: "App", dependencies: [.product(name: "LoaderKit", package: "loader-kit")]),
]
```

```ruby [CocoaPods]
pod 'LoaderKit', :git => 'https://github.com/maitrungduc1410/loader-kit.git', :tag => '<version>'
```

```sh [NuGet]
dotnet add package LoaderKit.WinUI
```

:::

- 把 `<version>` 替换为 [GitHub releases](https://github.com/maitrungduc1410/loader-kit/releases) 中的最新版本。tag 不带 `v` 前缀。
- **Android**：两个 artifact 都发布在 Maven Central 上，所以 repositories 里必须有 `mavenCentral()`。
- **Apple**：在 Xcode 里也可以通过 File > Add Package Dependencies 输入仓库 URL 来添加。这个 pod 没有发布到 CocoaPods trunk，需要在 `Podfile` 里直接指向仓库和某个发布 tag。
- **Windows**：安装 `LoaderKit.WinUI` 时会一并带上 `LoaderKit.Core`。
- **React Native**：见 [React Native](/zh/platforms/react-native)。

## 第一个加载动画 {#your-first-indicator}

下面每段代码都会显示一个紫色的 `BallSpinFadeLoader`，速度是默认的 1.5 倍。

::: code-group

```tsx [React]
import { LoaderKit } from '@loader-kit/web/react';

<LoaderKit indicator="BallSpinFadeLoader" color="#7c3aed" speed={1.5} />
```

```vue [Vue]
<script setup lang="ts">
import { LoaderKit } from '@loader-kit/web/vue';
</script>

<template>
  <LoaderKit indicator="BallSpinFadeLoader" color="#7c3aed" :speed="1.5" />
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { LoaderKit } from '@loader-kit/web/svelte';
</script>

<LoaderKit indicator="BallSpinFadeLoader" color="#7c3aed" speed={1.5} />
```

```html [HTML]
<script type="module">
  import '@loader-kit/web/element';
</script>

<loader-kit indicator="BallSpinFadeLoader" color="#7c3aed" speed="1.5"></loader-kit>
```

```ts [TypeScript]
import { LoaderKitView } from '@loader-kit/web';

const view = new LoaderKitView(document.querySelector('#loader')!, {
  indicator: 'BallSpinFadeLoader',
  color: '#7c3aed',
  speed: 1.5,
});
```

```xml [Android XML]
<io.github.maitrungduc1410.loaderkit.LoaderKitView
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    app:indicator="BallSpinFadeLoader"
    app:indicatorColor="#7C3AED"
    app:speed="1.5" />
```

```kotlin [Kotlin (View)]
import io.github.maitrungduc1410.loaderkit.LoaderKitView

val loader = LoaderKitView(context).apply {
    indicator = "BallSpinFadeLoader"
    color = Color.parseColor("#7C3AED")
    speed = 1.5
}
container.addView(loader)
```

```kotlin [Compose]
import io.github.maitrungduc1410.loaderkit.compose.LoaderKitIndicator

LoaderKitIndicator(
    indicator = "BallSpinFadeLoader",
    modifier = Modifier.size(48.dp),
    color = Color(0xFF7C3AED),
    speed = 1.5,
)
```

```swift [Swift (UIKit)]
import LoaderKit

let loader = LoaderKitView(indicator: "BallSpinFadeLoader")
loader.color = .systemPurple
loader.speed = 1.5
view.addSubview(loader)
```

```swift [SwiftUI]
import LoaderKit
import SwiftUI

struct LoadingView: View {
    var body: some View {
        LoaderKitIndicator("BallSpinFadeLoader")
            .color(.purple)
            .speed(1.5)
            .frame(width: 48, height: 48)
    }
}
```

```xml [XAML]
<Page xmlns:lk="using:LoaderKit.WinUI">
    <lk:LoaderKitIndicator Indicator="BallSpinFadeLoader" Color="#7C3AED" Speed="1.5" />
</Page>
```

```csharp [C#]
using LoaderKit.WinUI;
using Microsoft.UI;

var indicator = new LoaderKitIndicator
{
    Indicator = "BallSpinFadeLoader",
    Color = ColorHelper.FromArgb(255, 0x7C, 0x3A, 0xED),
    Speed = 1.5,
};
```

:::

效果：

<LoaderKitPreview indicator="BallSpinFadeLoader" color="#7c3aed" :speed="1.5" />

## 默认尺寸 {#default-size}

如果不指定尺寸，每个视图都是 40 × 40（单位分别是 dp、point、有效像素或 CSS 像素）。加载动画会画在视图内能放下的最大正方形里，并且居中。所以视图再宽，动画也只是居中显示，不会被拉伸。

## 停止加载动画 {#stopping-the-indicator}

加载动画一显示就开始播放。任务完成后，记得把它停掉。默认情况下，停止后的加载动画什么都不画。

::: code-group

```ts [TypeScript]
view.stop();      // 或者 view.animating = false
view.destroy();   // 彻底移除时调用
```

```kotlin [Kotlin (View)]
loader.stop()     // 或者 loader.isAnimating = false
```

```kotlin [Compose]
LoaderKitIndicator("BallSpinFadeLoader", animating = isLoading)
```

```swift [Swift (UIKit)]
loader.stopAnimating()   // 或者 loader.isAnimating = false
```

```swift [SwiftUI]
LoaderKitIndicator("BallSpinFadeLoader").animating(isLoading)
```

```csharp [C#]
indicator.IsAnimating = false;
```

:::

调整速度、定格某一帧以及减弱动态效果，见[播放控制](/zh/guide/playback)。

## 下一步 {#next-steps}

- [内置加载动画](/zh/guide/indicators)：挑一个加载动画。
- [自定义](/zh/guide/customizing)：参数、颜色和尺寸。
- 各平台页面：[Web](/zh/platforms/web)、[Android](/zh/platforms/android)、[iOS 与 macOS](/zh/platforms/apple)、[Windows](/zh/platforms/windows)。
