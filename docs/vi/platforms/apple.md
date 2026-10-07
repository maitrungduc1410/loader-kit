---
description: "Dùng LoaderKit trên iOS và macOS: cài bằng Swift Package Manager hoặc CocoaPods, LoaderKitView cho UIKit và AppKit, view SwiftUI và spec tùy chỉnh."
---

# iOS và macOS

LoaderKit cho các nền tảng Apple render indicator bằng Core Animation, nên chúng vẫn chạy khi main thread đang bận. Swift package có hai library:

- `LoaderKit`: `LoaderKitView` (UIKit và AppKit), `LoaderKitIndicator` cho SwiftUI và engine Core Animation. Library này re-export `LoaderKitCore`.
- `LoaderKitCore`: model của spec, phần validate, reference evaluator và các indicator có sẵn. Nó chỉ dùng Foundation và build được trên Linux.

Yêu cầu iOS 15 hoặc macOS 12, và Swift 5.9.

## Cài đặt {#install}

### Swift Package Manager {#swift-package-manager}

```swift
dependencies: [
    .package(url: "https://github.com/maitrungduc1410/loader-kit.git", from: "<version>"),
],
targets: [
    .target(name: "App", dependencies: [.product(name: "LoaderKit", package: "loader-kit")]),
]
```

Thay `<version>` bằng bản mới nhất trên [GitHub releases](https://github.com/maitrungduc1410/loader-kit/releases). Hoặc trong Xcode: File > Add Package Dependencies, rồi nhập URL của repo.

### CocoaPods {#cocoapods}

Pod này không được publish lên CocoaPods trunk. Hãy trỏ `Podfile` tới repo kèm một tag release. Tag không có tiền tố `v`.

```ruby
pod 'LoaderKit', :git => 'https://github.com/maitrungduc1410/loader-kit.git', :tag => '<version>'
```

Với CocoaPods, mọi thứ nằm chung trong module `LoaderKit`, nên `import LoaderKit` là có luôn các type của core.

## UIKit {#uikit}

```swift
import LoaderKit

let loader = LoaderKitView(indicator: "BallPulse")
loader.color = .systemBlue
loader.params = ["count": 5]
view.addSubview(loader)
```

`LoaderKitView` có intrinsic size 40 x 40 point. Indicator được vẽ trong hình vuông lớn nhất vừa với view, căn giữa.

## AppKit {#appkit}

Trên macOS, cũng class đó là một `NSView`, với API y hệt:

```swift
import LoaderKit

let loader = LoaderKitView(indicator: "SquareSpin")
loader.color = .controlAccentColor
window.contentView?.addSubview(loader)
```

### Property {#properties}

| Property | Kiểu | Mặc định | Ý nghĩa |
| --- | --- | --- | --- |
| `indicator` | `String?` | `"BallPulse"` | Indicator có sẵn để vẽ. Là `nil` khi spec được gán theo cách khác |
| `spec` | `IndicatorSpec?` | `nil` | Spec đang được vẽ. Gán nó sẽ thay thế `indicator` và `specJSON` |
| `specJSON` | `String?` | `nil` | Một spec JSON. Nếu không hợp lệ thì không vẽ gì và `specError` liệt kê các lỗi |
| `setSpec(json:)` | method | | Parse và gán một spec JSON. Throw `IndicatorSpecError` |
| `specError` | `IndicatorSpecError?` | | Lý do không vẽ được |
| `params` | `[String: Double]` | `[:]` | Override params. Tên không tồn tại bị bỏ qua |
| `color` | `UIColor` / `NSColor` | `.systemGray` | Màu của mọi phần tử, dùng khi `colors` rỗng |
| `colors` | `[UIColor]` / `[NSColor]` | `[]` | Phần tử `i` dùng `colors[i % colors.count]` |
| `speed` | `Double` | `1` | Tốc độ phát. Bằng 0 hoặc nhỏ hơn thì tạm dừng |
| `isAnimating` | `Bool` | `true` | Ngoài ra còn có `startAnimating()` và `stopAnimating()` |
| `hidesWhenStopped` | `Bool` | `true` | Không vẽ gì khi đã dừng |
| `cycleProgress` | `Double?` | `nil` | Một điểm cố định trong chu kỳ, trong khoảng [0, 1]. `nil` thì chạy animation |
| `respectsReduceMotion` | `Bool` | `true` | Hiện frame tĩnh khi Reduce Motion đang bật |

`reset()` đưa mọi property về mặc định và chạy lại animation từ đầu, ví dụ trước khi một cell trong list được tái sử dụng. Các dynamic system color tự đổi theo giao diện sáng và tối.

## SwiftUI {#swiftui}

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

Initializer: `LoaderKitIndicator(_ indicator: String = "BallPulse", params:)` và `LoaderKitIndicator(spec:params:)`.

Modifier: `params(_:)`, `color(_:)`, `colors(_:)`, `speed(_:)`, `animating(_:)`, `hidesWhenStopped(_:)`, `cycleProgress(_:)`, `respectsReduceMotion(_:)`.

::: tip Thứ tự modifier
Các modifier của LoaderKit trả về một `LoaderKitIndicator`. Hãy gọi chúng trước các modifier của SwiftUI như `frame` hay `padding`, vì những modifier này trả về một kiểu view khác.
:::

## Spec tùy chỉnh {#custom-specs}

::: warning Thử nghiệm
Tự viết spec vẫn đang ở giai đoạn thử nghiệm: cho đến khi schema được công bố là ổn định, một bản minor release vẫn có thể thay đổi nó. Indicator có sẵn và params của chúng không bị ảnh hưởng.
:::

Spec có thể đến từ JSON hoặc được dựng bằng Swift. Cả hai đều được validate: spec không hợp lệ sẽ không bao giờ được vẽ, và `IndicatorSpecError.problems` liệt kê mọi quy tắc mà nó vi phạm.

```swift
let url = Bundle.main.url(forResource: "typing-dots", withExtension: "json")!
let json = try String(contentsOf: url, encoding: .utf8)

do {
    let spec = try IndicatorSpec(json: json)
    loader.spec = spec
} catch let error as IndicatorSpecError {
    print(error.problems)
}

// Hoặc gán mà không throw, rồi đọc lỗi sau.
loader.specJSON = json
print(loader.specError?.problems ?? [])

// SwiftUI
LoaderKitIndicator(spec: spec, params: ["count": 4])
```

Các entry point khác:

- `IndicatorSpec(jsonData:)` parse từ `Data`.
- `IndicatorSpec.validate(json:)` trả về danh sách lỗi mà không throw.
- `IndicatorSpec` là `Codable`. Decode cũng có validate.
- `spec.jsonString()` encode spec ngược lại thành JSON.

### Dựng spec bằng Swift {#building-a-spec-in-swift}

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

### Evaluate không cần view {#evaluating-without-a-view}

```swift
let evaluator = try IndicatorEvaluator(spec: spec, params: ["minScale": 0.2])
let states = evaluator.states(at: 0.25)     // [ElementState]
let frozen = evaluator.timeForCycleProgress(0.5)
```

## Xem thêm {#see-also}

- [Tùy chỉnh](/vi/guide/customizing) và [Điều khiển animation](/vi/guide/playback): code cho mọi nền tảng.
- [Dùng spec](/vi/spec/using): validate và các giới hạn.
