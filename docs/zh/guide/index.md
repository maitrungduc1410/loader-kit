---
description: "LoaderKit 用 JSON spec 描述加载动画，由各平台的原生引擎绘制。了解整体架构、各部分如何配合，以及哪些已经稳定。"
---

# LoaderKit 是什么？

LoaderKit 是一套面向 Android、iOS、macOS、Windows 和 Web 的加载动画。每个动画都是一份很小的 JSON 文档，叫作 **spec**。各平台的原生引擎读取 spec，再用平台自己的图形栈把它画出来。

有两种用法：

- **内置加载动画。** 按名字从 [33 个内置动画](/zh/guide/indicators)中选一个，比如 `BallPulse` 或 `LineSpinFadeLoader`。可以设置颜色、尺寸和速度；部分动画还支持 `count` 这样的参数。
- **自定义加载动画。** 自己编写 spec：在方框里摆放元素，指定形状，再用关键帧 track（动画轨道）让它们动起来。所有引擎都能绘制，无需新增原生代码。详见[自定义加载动画](/zh/spec/)。

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: center; margin: 16px 0;">
  <LoaderKitPreview indicator="BallPulse" />
  <LoaderKitPreview indicator="LineScalePulseOut" />
  <LoaderKitPreview indicator="BallScaleRippleMultiple" />
  <LoaderKitPreview indicator="CubeTransition" />
</div>

## 一份 spec，多个引擎 {#one-spec-many-engines}

spec 用数据来描述一个加载动画：

- **layout（布局）** 把元素摆进单位方框（单个元素、一行、网格、圆环或叠放）；
- **shape（形状）** 决定每个元素画什么（circle、rect、ring、triangle、line）；
- **tracks** 描述元素的属性（缩放、不透明度、旋转、位移、描边裁剪）在一个周期内如何变化。

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

内置加载动画本身也是 spec。它们打包在每个引擎里，所以你只需要写名字。

| 平台 | 引擎 | 包 |
| --- | --- | --- |
| Android | `Canvas`，提供 `View` 和 Jetpack Compose 可组合项 | `io.github.maitrungduc1410:loaderkit-core`、`loaderkit-compose` |
| iOS、macOS | Core Animation，提供 UIKit、AppKit 和 SwiftUI 视图 | `LoaderKit`（Swift Package Manager、CocoaPods） |
| Windows | `Microsoft.UI.Composition`，提供 WinUI 3 控件 | `LoaderKit.WinUI`、`LoaderKit.Core`（NuGet） |
| Web | `<canvas>`，提供一个类和 `<loader-kit>` 自定义元素 | `@loader-kit/web`（npm） |
| React Native | 复用 Android 和 iOS 引擎 | [`react-native-loader-kit`](/zh/platforms/react-native)（npm） |
| 工具链 | schema、校验器、参考求值器 | `@loader-kit/spec`（npm） |

## 为什么动效能保持一致 {#why-the-motion-matches}

所有引擎都遵循同一份文档：[规范](/zh/spec/reference)。它定义了单位、布局、形状、track 的采样方式、缓动算法、变换顺序以及播放规则。

这一点由一套共享的一致性测试来保证。仓库里有一个用 TypeScript 写的参考求值器，测试向量就由它生成：在大量时间点上，记录每个元素应有的位置、尺寸、缩放、不透明度和旋转。Android、Apple、Windows 和 Web 引擎在单元测试里加载同一批向量，逐个数值比对。所以 `BallPulse` 在第 0.3 秒时，在每个平台上都是同一帧。

## 当前状态 {#status}

| 部分 | 状态 |
| --- | --- |
| 内置加载动画，及其名称和参数 | **稳定** |
| 视图、可组合项、控件及其属性 | **稳定** |
| 自己编写 spec（schema 版本 1） | **实验性** |

::: warning 自定义 spec 仍是实验性功能
在 schema 宣布稳定之前，次版本更新可能会改动它。内置加载动画和它们的参数不受影响，因为每个引擎都自带配套的内置 spec。
:::

所有包共用同一个版本号，发布 tag 形如 `1.0.0`（不带 `v` 前缀）。

## 下一步 {#next-steps}

- [快速开始](/zh/guide/getting-started)：安装并显示第一个加载动画。
- [内置加载动画](/zh/guide/indicators)：浏览并调整 33 个内置动画。
- [自定义加载动画](/zh/spec/)：借助实时预览，一步步写出一份 spec。
