---
description: "Cài LoaderKit trên web, Android, iOS, macOS hoặc Windows và hiển thị loading indicator đầu tiên chỉ với vài dòng, có sẵn code cho từng UI framework."
---

# Bắt đầu

## Yêu cầu {#requirements}

| Nền tảng | Tối thiểu |
| --- | --- |
| Android | `minSdk` 24 |
| iOS, macOS | iOS 15, macOS 12, Swift 5.9 |
| Windows | Windows 10 version 1809 (build 17763), Windows App SDK 1.8, .NET 8 |
| Web | Trình duyệt bất kỳ có `<canvas>` và custom element |

## Cài đặt {#installation}

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
    // Jetpack Compose (đã bao gồm loaderkit-core):
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

- Thay `<version>` bằng bản mới nhất trên [GitHub releases](https://github.com/maitrungduc1410/loader-kit/releases). Tag không có tiền tố `v`.
- **Android**: cả hai artifact đều nằm trên Maven Central, nên trong repositories phải có `mavenCentral()`.
- **Apple**: trong Xcode bạn cũng có thể vào File > Add Package Dependencies rồi nhập URL của repo. Pod này không có trên CocoaPods trunk: hãy trỏ `Podfile` tới repo kèm một tag release.
- **Windows**: cài `LoaderKit.WinUI` là có luôn `LoaderKit.Core`.
- **React Native**: xem [React Native](/vi/platforms/react-native).

## Indicator đầu tiên {#your-first-indicator}

::: tip Indicator có sẵn hay progress?
- **Không bao giờ có %** (chờ request, pull to refresh): dùng [indicator có sẵn](/vi/guide/indicators), như ví dụ bên dưới. Có 50 kiểu để chọn.
- **Tác vụ có tiến độ**, kể cả khi lúc đầu chưa biết (download, upload, xử lý file): dùng [progress indicator](/vi/guide/progress). Bắt đầu ở chế độ vô định với `value` là null (`nil` trong Swift), rồi đặt value khi đã biết. Vẫn là một component, nên không phải đổi gì khác.
:::

Mỗi đoạn code dưới đây hiển thị `BallSpinFadeLoader` màu tím, nhanh gấp 1.5 lần bình thường.

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

Kết quả:

<LoaderKitPreview indicator="BallSpinFadeLoader" color="#7c3aed" :speed="1.5" />

## Kích thước mặc định {#default-size}

Nếu bạn không đặt kích thước, mọi view đều có kích thước 40 x 40 (dp, point, effective pixel hoặc CSS pixel). Indicator được vẽ trong hình vuông lớn nhất vừa với view, căn giữa. Vì vậy với một view bề ngang rộng, indicator vẫn nằm giữa chứ không bị kéo giãn.

## Dừng indicator {#stopping-the-indicator}

Indicator bắt đầu chạy animation ngay khi được hiển thị. Xong việc thì bạn dừng nó lại. Mặc định, indicator đã dừng sẽ không vẽ gì cả.

::: code-group

```ts [TypeScript]
view.stop();      // hoặc view.animating = false
view.destroy();   // khi bạn gỡ hẳn nó đi
```

```kotlin [Kotlin (View)]
loader.stop()     // hoặc loader.isAnimating = false
```

```kotlin [Compose]
LoaderKitIndicator("BallSpinFadeLoader", animating = isLoading)
```

```swift [Swift (UIKit)]
loader.stopAnimating()   // hoặc loader.isAnimating = false
```

```swift [SwiftUI]
LoaderKitIndicator("BallSpinFadeLoader").animating(isLoading)
```

```csharp [C#]
indicator.IsAnimating = false;
```

:::

Xem [Điều khiển animation](/vi/guide/playback) để chỉnh tốc độ, freeze một frame và xử lý reduce motion.

## Tiếp theo {#next-steps}

- [Indicator có sẵn](/vi/guide/indicators): chọn một indicator.
- [Progress indicator](/vi/guide/progress): cho biết tác vụ đã chạy được bao nhiêu.
- [Tùy chỉnh](/vi/guide/customizing): params, màu và kích thước.
- Các trang theo nền tảng: [Web](/vi/platforms/web), [Android](/vi/platforms/android), [iOS và macOS](/vi/platforms/apple), [Windows](/vi/platforms/windows).
