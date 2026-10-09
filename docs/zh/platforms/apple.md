---
description: "iOS 和 macOS 上的 LoaderKit：通过 SPM 或 CocoaPods 安装，UIKit、AppKit、SwiftUI 用法与自定义 spec。"
---

# iOS 与 macOS

Apple 平台版 LoaderKit 用 Core Animation 渲染加载动画，所以主线程繁忙时动画也不会停。这个 Swift package 包含两个库：

- `LoaderKit`：`LoaderKitView`（UIKit 和 AppKit）、SwiftUI 的 `LoaderKitIndicator`，以及 Core Animation 引擎。它会重新导出 `LoaderKitCore`。
- `LoaderKitCore`：spec 模型、校验、参考求值器和内置加载动画。只依赖 Foundation，可以在 Linux 上构建。

要求 iOS 15 或 macOS 12，以及 Swift 5.9。

## 安装 {#install}

### Swift Package Manager

```swift
dependencies: [
    .package(url: "https://github.com/maitrungduc1410/loader-kit.git", from: "<version>"),
],
targets: [
    .target(name: "App", dependencies: [.product(name: "LoaderKit", package: "loader-kit")]),
]
```

把 `<version>` 替换为 [GitHub releases](https://github.com/maitrungduc1410/loader-kit/releases) 中的最新版本。也可以在 Xcode 中选择 File > Add Package Dependencies，然后输入仓库 URL。

### CocoaPods

这个 pod 没有发布到 CocoaPods trunk。请在 `Podfile` 中指向仓库和某个发布 tag。tag 不带 `v` 前缀。

```ruby
pod 'LoaderKit', :git => 'https://github.com/maitrungduc1410/loader-kit.git', :tag => '<version>'
```

使用 CocoaPods 时，所有内容都在 `LoaderKit` 模块中，所以 `import LoaderKit` 也能拿到 core 里的类型。

## UIKit

```swift
import LoaderKit

let loader = LoaderKitView(indicator: "BallPulse")
loader.color = .systemBlue
loader.params = ["count": 5]
view.addSubview(loader)
```

`LoaderKitView` 的固有尺寸（intrinsic size）是 40 × 40 point。加载动画画在视图内能放下的最大正方形中，并且居中。

## AppKit

在 macOS 上，同一个类是 `NSView`，API 完全相同：

```swift
import LoaderKit

let loader = LoaderKitView(indicator: "SquareSpin")
loader.color = .controlAccentColor
window.contentView?.addSubview(loader)
```

### 属性 {#properties}

| 属性 | 类型 | 默认值 | 含义 |
| --- | --- | --- | --- |
| `indicator` | `String?` | `"BallPulse"` | 要绘制的内置动画。如果 spec 是通过其他方式设置的，则为 `nil` |
| `spec` | `IndicatorSpec?` | `nil` | 正在绘制的 spec。设置它会替换 `indicator` 和 `specJSON` |
| `specJSON` | `String?` | `nil` | JSON spec。无效时不绘制，`specError` 会列出问题 |
| `setSpec(json:)` | 方法 | | 解析并设置 JSON spec，出错时抛出 `IndicatorSpecError` |
| `specError` | `IndicatorSpecError?` | | 没有绘制的原因 |
| `params` | `[String: Double]` | `[:]` | 覆盖参数，未知名称会被忽略 |
| `color` | `UIColor` / `NSColor` | `.systemGray` | 所有元素的颜色，在 `colors` 为空时使用 |
| `colors` | `[UIColor]` / `[NSColor]` | `[]` | 元素 `i` 使用 `colors[i % colors.count]` |
| `speed` | `Double` | `1` | 播放速率，小于等于 0 时暂停 |
| `isAnimating` | `Bool` | `true` | 也可以用 `startAnimating()` 和 `stopAnimating()` |
| `hidesWhenStopped` | `Bool` | `true` | 停止时不绘制 |
| `cycleProgress` | `Double?` | `nil` | 定格在周期中的某个位置，取值 [0, 1]；`nil` 表示播放动画 |
| `respectsReduceMotion` | `Bool` | `true` | 开启“减弱动态效果”时显示静止画面 |

`reset()` 会把所有属性恢复为默认值并重新开始动画，比如在列表 cell 被复用之前调用。动态系统颜色会跟随浅色和深色外观。

## SwiftUI

```swift
import LoaderKit
import SwiftUI

struct LoadingView: View {
    @State private var isLoading = true

    var body: some View {
        LoaderKitIndicator("BallSpinFadeLoader", params: ["count": 10])
            .color(.accentColor)
            .speed(1.5)
            .animating(isLoading)
            .frame(width: 60, height: 60)
    }
}
```

初始化方法：`LoaderKitIndicator(_ indicator: String = "BallPulse", params:)` 和 `LoaderKitIndicator(spec:params:)`。

修饰符：`params(_:)`、`color(_:)`、`colors(_:)`、`speed(_:)`、`animating(_:)`、`hidesWhenStopped(_:)`、`cycleProgress(_:)`、`respectsReduceMotion(_:)`。

::: tip 修饰符顺序
LoaderKit 的修饰符返回的是 `LoaderKitIndicator`。要在 `frame`、`padding` 这类 SwiftUI 修饰符之前调用它们，因为后者返回的是另一种视图类型。
:::

## 进度指示器 {#progress}

`LoaderKitProgress` 用来显示任务完成了多少：9 种 type、30 种样式，支持确定与不确定状态，value 平滑过渡。

```swift
// UIKit 与 AppKit
let progress = LoaderKitProgressView(value: 0.4, type: .linear, variant: .wavy)
progress.value = 0.8        // 平滑过渡到 0.8；nil 表示不确定状态

// SwiftUI
LoaderKitProgress(value: progress, type: .gauge)
    .showLabel()
    .size(64)
```

所有 type、variant 和选项见[进度指示器](/zh/guide/progress)。

## 自定义 spec {#custom-specs}

::: warning 实验性功能
自己编写 spec 目前仍是实验性功能：在 schema 宣布稳定之前，次版本更新可能会改动它。内置加载动画及其参数不受影响。
:::

spec 可以来自 JSON，也可以用 Swift 构建。两种方式都会校验：无效的 spec 永远不会被绘制，`IndicatorSpecError.problems` 会列出它违反的每一条规则。

```swift
let url = Bundle.main.url(forResource: "typing-dots", withExtension: "json")!
let json = try String(contentsOf: url, encoding: .utf8)

do {
    let spec = try IndicatorSpec(json: json)
    loader.spec = spec
} catch let error as IndicatorSpecError {
    print(error.problems)
}

// 也可以直接设置而不抛异常，之后再读取问题列表。
loader.specJSON = json
print(loader.specError?.problems ?? [])

// SwiftUI
LoaderKitIndicator(spec: spec, params: ["count": 4])
```

其他入口：

- `IndicatorSpec(jsonData:)` 解析 `Data`。
- `IndicatorSpec.validate(json:)` 返回问题列表，不抛异常。
- `IndicatorSpec` 遵循 `Codable`，解码时同样会校验。
- `spec.jsonString()` 把 spec 编码回 JSON。

### 用 Swift 构建 spec {#building-a-spec-in-swift}

```swift
let spec = IndicatorSpec(
    name: "Pulse",
    duration: 0.8,
    params: ["minScale": 0.4],
    layout: .single(size: 0.8),
    shape: .ring(strokeWidth: 0.12),
    tracks: [
        .init(
            property: .scale,
            keyTimes: [0, 0.5, 1],
            values: [1, .param("minScale"), 1],
            easing: .uniform(.easeInOut)
        ),
    ]
)
try spec.validate()
loader.spec = spec
```

### 不借助视图求值 {#evaluating-without-a-view}

```swift
let evaluator = try IndicatorEvaluator(spec: spec, params: ["minScale": 0.2])
let states = evaluator.states(at: 0.25)     // [ElementState]
let frozen = evaluator.timeForCycleProgress(0.5)
```

## 另请参阅 {#see-also}

- 各平台的代码示例见[自定义](/zh/guide/customizing)和[播放控制](/zh/guide/playback)。
- 校验和限制见[使用 spec](/zh/spec/using)。
