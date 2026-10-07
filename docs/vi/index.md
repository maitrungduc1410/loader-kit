---
description: "Loading indicator mô tả bằng JSON, render native trên Android, iOS, macOS, Windows và web. Có sẵn 33 indicator, hoặc bạn tự viết spec của riêng mình."
layout: home

hero:
  name: LoaderKit
  text: Loading indicator dạng dữ liệu, render native
  tagline: Một spec JSON, cùng một chuyển động trên Android, iOS, macOS, Windows và web. Chọn một trong 33 indicator có sẵn hoặc tự mô tả indicator của bạn.
  actions:
    - theme: brand
      text: Bắt đầu
      link: /vi/guide/getting-started
    - theme: alt
      text: LoaderKit là gì?
      link: /vi/guide/
    - theme: alt
      text: Xem các indicator
      link: /vi/guide/indicators

features:
  - icon: 🎛️
    title: 33 indicator có sẵn
    details: Pulse, spinner, bar, grid và orbit, cùng một tên trên mọi nền tảng. Một số indicator nhận params, ví dụ count và minScale.
    link: /vi/guide/indicators
    linkText: Xem tất cả
  - icon: 📱
    title: Native trên mọi nền tảng
    details: Canvas trên Android (View và Compose), Core Animation trên iOS và macOS (UIKit, AppKit, SwiftUI), Composition trên Windows, canvas trên web.
    link: /vi/guide/getting-started
    linkText: Cài đặt
  - icon: 🎯
    title: Chuyển động giống hệt nhau
    details: Mọi engine đều theo cùng một bản đặc tả và chạy chung bộ test vector conformance, nên indicator trông và chuyển động như nhau trên từng nền tảng.
    link: /vi/spec/reference
    linkText: Đọc bản đặc tả
  - icon: ⏯️
    title: Bạn toàn quyền điều khiển
    details: Chỉnh tốc độ, start và stop, ẩn khi dừng, freeze một frame bất kỳ để chụp screenshot, và hiện frame tĩnh khi người dùng bật reduce motion.
    link: /vi/guide/playback
    linkText: Điều khiển animation
  - icon: ✏️
    title: Indicator của riêng bạn
    details: Mô tả phần tử, layout, shape và các track keyframe bằng JSON. Engine nào cũng vẽ được, không cần viết thêm code native. (Thử nghiệm)
    link: /vi/spec/
    linkText: Indicator tùy chỉnh
  - icon: 🧰
    title: Công cụ cho người viết spec
    details: Playground preview trực tiếp, JSON Schema để editor gợi ý và để check trong CI, cùng hướng dẫn viết spec với trợ lý AI.
    link: /vi/tools/playground
    linkText: Mở playground
---

<div class="vp-doc home-content">

## Cài đặt {#install}

::: code-group

```sh [Web]
npm install @loader-kit/web
```

```kotlin [Android]
dependencies {
    implementation("io.github.maitrungduc1410:loaderkit-core:<version>")
    // Jetpack Compose (đã bao gồm loaderkit-core):
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

Xem [Bắt đầu](/vi/guide/getting-started) để hiển thị indicator đầu tiên trên từng nền tảng.

## Mỗi nền tảng một dòng code {#one-line-per-platform}

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

## Vài indicator có sẵn {#a-few-of-the-built-ins}

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

[Xem đủ 33 indicator](/vi/guide/indicators), kèm params, màu và code để copy.

</div>
