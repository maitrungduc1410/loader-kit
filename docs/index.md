---
description: "Loading indicators described as JSON and rendered natively on Android, iOS, macOS, Windows and the web. 33 built-in indicators, or write your own spec."
layout: home

hero:
  name: LoaderKit
  text: Loading indicators as data, rendered natively
  tagline: One JSON spec, the same motion on Android, iOS, macOS, Windows and the web. Pick one of 33 built-in indicators or describe your own.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: What is LoaderKit?
      link: /guide/
    - theme: alt
      text: Browse indicators
      link: /guide/indicators

features:
  - icon: 🎛️
    title: 33 built-in indicators
    details: Pulses, spinners, bars, grids and orbits, with the same names on every platform. Some take params such as count and minScale.
    link: /guide/indicators
    linkText: See them all
  - icon: 📱
    title: Native on every platform
    details: Canvas on Android (View and Compose), Core Animation on iOS and macOS (UIKit, AppKit, SwiftUI), Composition on Windows, canvas on the web.
    link: /guide/getting-started
    linkText: Install
  - icon: 🎯
    title: Same motion everywhere
    details: Every engine follows one specification and runs the same conformance test vectors, so an indicator looks and moves the same on each platform.
    link: /spec/reference
    linkText: Read the spec
  - icon: ⏯️
    title: Playback you control
    details: Speed, start and stop, hide when stopped, freeze any frame for screenshots, and a still frame when the user asks for reduced motion.
    link: /guide/playback
    linkText: Playback
  - icon: ✏️
    title: Your own indicators
    details: Describe elements, a layout, a shape and keyframe tracks in JSON. Every engine draws it with no new native code. (Experimental)
    link: /spec/
    linkText: Custom indicators
  - icon: 🧰
    title: Tools for spec authors
    details: A live playground, a JSON Schema for editor hints and CI checks, and a guide to writing specs with an AI assistant.
    link: /tools/playground
    linkText: Open the playground
---

<div class="vp-doc home-content">

## Install

::: code-group

```sh [Web]
npm install @loader-kit/web
```

```kotlin [Android]
dependencies {
    implementation("io.github.maitrungduc1410:loaderkit-core:<version>")
    // Jetpack Compose (includes loaderkit-core):
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

See [Getting started](/guide/getting-started) for the first indicator on each platform.

## One line per platform

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

## A few of the built-ins

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

[See all 33 indicators](/guide/indicators), with params, colors and copyable code.

</div>
