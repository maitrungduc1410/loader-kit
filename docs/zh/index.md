---
description: "用 JSON 描述加载动画，在 Android、iOS、macOS、Windows 和 Web 上原生渲染。提供 33 个内置动画，也可以自己编写 spec。"
layout: home

hero:
  name: LoaderKit
  text: 用数据描述加载动画，原生渲染
  tagline: 一份 JSON spec，在 Android、iOS、macOS、Windows 和 Web 上呈现完全相同的动效。从 33 个内置加载动画里挑一个，或者描述你自己的。
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/getting-started
    - theme: alt
      text: LoaderKit 是什么？
      link: /zh/guide/
    - theme: alt
      text: 浏览加载动画
      link: /zh/guide/indicators

features:
  - icon: 🎛️
    title: 33 个内置加载动画
    details: 脉冲、旋转、条形、网格、环绕等样式，在每个平台上名称都一样。部分动画还支持 count、minScale 等参数。
    link: /zh/guide/indicators
    linkText: 查看全部
  - icon: 📱
    title: 各平台原生实现
    details: Android 上用 Canvas（View 和 Compose），iOS 和 macOS 上用 Core Animation（UIKit、AppKit、SwiftUI），Windows 上用 Composition，Web 上用 canvas。
    link: /zh/guide/getting-started
    linkText: 安装
  - icon: 🎯
    title: 处处一致的动效
    details: 所有引擎遵循同一份规范，并运行同一套一致性测试向量，所以同一个加载动画在每个平台上的外观和运动都一样。
    link: /zh/spec/reference
    linkText: 阅读规范
  - icon: ⏯️
    title: 播放随你控制
    details: 调整速度、启动和停止、停止时隐藏、定格任意一帧方便截图；用户开启减弱动态效果时，显示一帧静止画面。
    link: /zh/guide/playback
    linkText: 播放控制
  - icon: ✏️
    title: 自定义加载动画
    details: 用 JSON 描述元素、布局、形状和关键帧 track，所有引擎都能直接绘制，无需新增原生代码。（实验性）
    link: /zh/spec/
    linkText: 自定义加载动画
  - icon: 🧰
    title: spec 编写工具
    details: 实时 Playground、用于编辑器提示和 CI 检查的 JSON Schema，以及一份借助 AI 助手编写 spec 的指南。
    link: /zh/tools/playground
    linkText: 打开 Playground
---

<div class="vp-doc home-content">

## 安装 {#install}

::: code-group

```sh [Web]
npm install @loader-kit/web
```

```kotlin [Android]
dependencies {
    implementation("io.github.maitrungduc1410:loaderkit-core:<version>")
    // Jetpack Compose（已包含 loaderkit-core）：
    implementation("io.github.maitrungduc1410:loaderkit-compose:<version>")
}
```

```swift [Swift Package Manager]
.package(url: "https://github.com/maitrungduc1410/loader-kit.git", from: "<version>")
```

```ruby [CocoaPods]
pod 'LoaderKit', :git => 'https://github.com/maitrungduc1410/loader-kit.git', :tag => '<version>'
```

```sh [Windows]
dotnet add package LoaderKit.WinUI
```

```sh [React Native]
npm install react-native-loader-kit
```

:::

各平台的第一个加载动画，见[快速开始](/zh/guide/getting-started)。

## 每个平台一行代码 {#one-line-per-platform}

::: code-group

```html [Web]
<loader-kit indicator="BallSpinFadeLoader" color="#7c3aed"></loader-kit>
```

```kotlin [Compose]
LoaderKitIndicator("BallSpinFadeLoader", Modifier.size(48.dp), color = Color(0xFF7C3AED))
```

```swift [SwiftUI]
LoaderKitIndicator("BallSpinFadeLoader").color(.purple)
```

```xml [XAML]
<lk:LoaderKitIndicator Indicator="BallSpinFadeLoader" Color="#7C3AED" />
```

:::

## 部分内置动画 {#a-few-of-the-built-ins}

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: center; margin: 16px 0;">
  <LoaderKitPreview indicator="BallPulse" />
  <LoaderKitPreview indicator="BallSpinFadeLoader" />
  <LoaderKitPreview indicator="LineScale" />
  <LoaderKitPreview indicator="BallClipRotateMultiple" />
  <LoaderKitPreview indicator="SquareSpin" />
  <LoaderKitPreview indicator="Pacman" />
  <LoaderKitPreview indicator="BallGridPulse" />
  <LoaderKitPreview indicator="Orbit" />
</div>

[查看全部 33 个加载动画](/zh/guide/indicators)，包括参数、颜色设置和可复制的代码。

</div>
