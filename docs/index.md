---
description: "Loading indicators described as JSON and rendered natively on Android, iOS, macOS, Windows and the web. 50 built-in indicators, or write your own spec."
layout: home

hero:
  name: LoaderKit
  text: Loading indicators as data, rendered natively
  tagline: One JSON spec, the same motion on Android, iOS, macOS, Windows and the web. Pick one of 50 built-in indicators or 30 progress designs, or describe your own.
  actions:
    - theme: brand
      text: Built-in indicators
      link: /guide/indicators
    - theme: brand
      text: Progress indicators
      link: /guide/progress
    - theme: alt
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: What is LoaderKit?
      link: /guide/

features:
  - icon: 🎛️
    title: 50 built-in indicators
    details: Pulses, spinners, bars, grids and orbits, with the same names on every platform. Some take params such as count and minScale.
    link: /guide/indicators
    linkText: See them all
  - icon: 📊
    title: 30 progress designs
    details: Linear, circular, pie, gauge, liquid, border, bars, grid and battery, with a value or indeterminate, gliding smoothly to every new value.
    link: /guide/progress
    linkText: Progress indicators
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

## Find an indicator, copy the code {#find-an-indicator}

<HomeShortcuts />

::: tip Built-in or progress?
- **No percentage, ever** (waiting for a request, pull to refresh): use a [built-in indicator](/guide/indicators). There are 50 styles to pick from.
- **The task has progress**, even if it is unknown at first (a download, an upload, processing a file): use a [progress indicator](/guide/progress). Start it indeterminate with `value` null (`nil` in Swift), then set a value once you know it. It is the same component, so nothing else changes.
:::

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

</div>
