---
description: "用 JSON 描述加载动画，在 Android、iOS、macOS、Windows 和 Web 上原生渲染。提供 50 个内置动画，也可以自己编写 spec。"
layout: home

hero:
  name: LoaderKit
  text: 用数据描述加载动画，原生渲染
  tagline: 一份 JSON spec，在 Android、iOS、macOS、Windows 和 Web 上呈现完全相同的动效。从 50 个内置加载动画和 50 种进度样式里挑一个，或者描述你自己的。
  actions:
    - theme: brand
      text: 内置加载动画
      link: /zh/guide/indicators
    - theme: brand
      text: 进度指示器
      link: /zh/guide/progress
    - theme: alt
      text: 快速开始
      link: /zh/guide/getting-started
    - theme: alt
      text: LoaderKit 是什么？
      link: /zh/guide/

features:
  - icon: 🎛️
    title: 50 个内置加载动画
    details: 脉冲、旋转、条形、网格、环绕等样式，在每个平台上名称都一样。部分动画还支持 count、minScale 等参数。
    link: /zh/guide/indicators
    linkText: 查看全部
  - icon: 📊
    title: 50 种进度样式
    details: Linear、circular、pie、gauge、liquid、border、bars、grid、battery 和 hourglass，支持确定与不确定状态，value 变化时平滑过渡。
    link: /zh/guide/progress
    linkText: 进度指示器
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

## 找到动画，复制代码 {#find-an-indicator}

<HomeShortcuts />

::: tip 内置加载动画还是进度指示器？
- **始终没有百分比**（等待请求、下拉刷新）：用[内置加载动画](/zh/guide/indicators)，有 50 种样式可选。
- **任务有进度**，哪怕一开始还不知道（下载、上传、处理文件）：用[进度指示器](/zh/guide/progress)。先以不确定状态开始（`value` 为 null，Swift 中为 `nil`），知道进度后再设置 value。始终是同一个组件，其他代码都不用改。
:::

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

```tsx [React, Vue, Svelte]
<LoaderKit indicator="BallSpinFadeLoader" color="#7c3aed" />
```

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

</div>
