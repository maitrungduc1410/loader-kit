---
description: "Install LoaderKit on the web, Android, iOS, macOS or Windows and show your first loading indicator in a few lines, with code for every UI framework."
---

# Getting started

## Requirements

| Platform | Minimum |
| --- | --- |
| Android | `minSdk` 24 |
| iOS, macOS | iOS 15, macOS 12, Swift 5.9 |
| Windows | Windows 10 version 1809 (build 17763), Windows App SDK 1.8, .NET 8 |
| Web | Any browser with `<canvas>` and custom elements |

## Install {#installation}

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
    // Jetpack Compose (includes loaderkit-core):
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

- Replace `<version>` with the latest release from the [GitHub releases](https://github.com/maitrungduc1410/loader-kit/releases). Tags have no `v` prefix.
- **Android**: both artifacts are on Maven Central, so `mavenCentral()` must be in your repositories.
- **Apple**: in Xcode you can also use File > Add Package Dependencies and enter the repository URL. The pod is not on the CocoaPods trunk: point the `Podfile` at the repository and a release tag.
- **Windows**: `LoaderKit.WinUI` brings `LoaderKit.Core` with it.
- **React Native**: see [React Native](/platforms/react-native).

## Your first indicator

Each snippet shows `BallSpinFadeLoader` in purple, 1.5 times faster than normal.

::: code-group

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

Result:

<LoaderKitPreview indicator="BallSpinFadeLoader" color="#7c3aed" :speed="1.5" />

## Default size

Every view is 40 by 40 (dp, points, effective pixels or CSS pixels) unless you size it. The indicator is drawn in the largest square that fits, centered in the view. So a wide view draws a centered indicator, not a stretched one.

## Stopping the indicator

Indicators start animating as soon as they are shown. When the work is done, stop them. By default a stopped indicator draws nothing.

::: code-group

```ts [TypeScript]
view.stop();      // or view.animating = false
view.destroy();   // when you remove it for good
```

```kotlin [Kotlin (View)]
loader.stop()     // or loader.isAnimating = false
```

```kotlin [Compose]
LoaderKitIndicator("BallSpinFadeLoader", animating = isLoading)
```

```swift [Swift (UIKit)]
loader.stopAnimating()   // or loader.isAnimating = false
```

```swift [SwiftUI]
LoaderKitIndicator("BallSpinFadeLoader").animating(isLoading)
```

```csharp [C#]
indicator.IsAnimating = false;
```

:::

See [Playback](/guide/playback) for speed, freezing a frame and reduced motion.

## Next steps

- [Built-in indicators](/guide/indicators): pick an indicator.
- [Customizing](/guide/customizing): params, colors and size.
- Platform pages: [Web](/platforms/web), [Android](/platforms/android), [iOS and macOS](/platforms/apple), [Windows](/platforms/windows).
