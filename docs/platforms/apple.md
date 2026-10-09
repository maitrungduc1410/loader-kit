---
description: "Use LoaderKit on iOS and macOS: install with Swift Package Manager or CocoaPods, LoaderKitView for UIKit and AppKit, the SwiftUI view, and custom specs."
---

# iOS and macOS

LoaderKit for Apple platforms renders indicators with Core Animation, so they keep animating while the main thread is busy. The Swift package has two libraries:

- `LoaderKit`: `LoaderKitView` (UIKit and AppKit), the SwiftUI `LoaderKitIndicator` and the Core Animation engine. It re-exports `LoaderKitCore`.
- `LoaderKitCore`: the spec model, validation, the reference evaluator and the built-in indicators. It uses Foundation only and builds on Linux.

Requires iOS 15 or macOS 12, and Swift 5.9.

## Install

### Swift Package Manager

```swift
dependencies: [
    .package(url: "https://github.com/maitrungduc1410/loader-kit.git", from: "<version>"),
],
targets: [
    .target(name: "App", dependencies: [.product(name: "LoaderKit", package: "loader-kit")]),
]
```

Replace `<version>` with the latest release from the [GitHub releases](https://github.com/maitrungduc1410/loader-kit/releases). Or in Xcode: File > Add Package Dependencies, then enter the repository URL.

### CocoaPods

The pod is not published to the CocoaPods trunk. Point your `Podfile` at the repository and a release tag. Tags have no `v` prefix.

```ruby
pod 'LoaderKit', :git => 'https://github.com/maitrungduc1410/loader-kit.git', :tag => '<version>'
```

With CocoaPods everything is in the `LoaderKit` module, so `import LoaderKit` also gives you the core types.

## UIKit

```swift
import LoaderKit

let loader = LoaderKitView(indicator: "BallPulse")
loader.color = .systemBlue
loader.params = ["count": 5]
view.addSubview(loader)
```

`LoaderKitView` has an intrinsic size of 40 by 40 points. The indicator is drawn in the largest centered square that fits the view.

## AppKit

On macOS the same class is an `NSView`, with the same API:

```swift
import LoaderKit

let loader = LoaderKitView(indicator: "SquareSpin")
loader.color = .controlAccentColor
window.contentView?.addSubview(loader)
```

### Properties

| Property | Type | Default | Meaning |
| --- | --- | --- | --- |
| `indicator` | `String?` | `"BallPulse"` | Built-in to draw. `nil` when the spec was set another way |
| `spec` | `IndicatorSpec?` | `nil` | The spec being drawn. Setting it replaces `indicator` and `specJSON` |
| `specJSON` | `String?` | `nil` | A JSON spec. When invalid, nothing is drawn and `specError` lists the problems |
| `setSpec(json:)` | method | | Parses and sets a JSON spec. Throws `IndicatorSpecError` |
| `specError` | `IndicatorSpecError?` | | Why nothing is drawn |
| `params` | `[String: Double]` | `[:]` | Param overrides. Unknown names are ignored |
| `color` | `UIColor` / `NSColor` | `.systemGray` | Color of every element, used when `colors` is empty |
| `colors` | `[UIColor]` / `[NSColor]` | `[]` | Element `i` uses `colors[i % colors.count]` |
| `speed` | `Double` | `1` | Playback rate. 0 or less pauses |
| `isAnimating` | `Bool` | `true` | Also `startAnimating()` and `stopAnimating()` |
| `hidesWhenStopped` | `Bool` | `true` | Draw nothing while stopped |
| `cycleProgress` | `Double?` | `nil` | A frozen point of the cycle in [0, 1]. `nil` animates |
| `respectsReduceMotion` | `Bool` | `true` | Show a still frame when Reduce Motion is on |

`reset()` restores every property to its default and restarts the animation, for example before a list cell is reused. Dynamic system colors follow the light and dark appearance.

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

Initializers: `LoaderKitIndicator(_ indicator: String = "BallPulse", params:)` and `LoaderKitIndicator(spec:params:)`.

Modifiers: `params(_:)`, `color(_:)`, `colors(_:)`, `speed(_:)`, `animating(_:)`, `hidesWhenStopped(_:)`, `cycleProgress(_:)`, `respectsReduceMotion(_:)`.

::: tip Modifier order
The LoaderKit modifiers return a `LoaderKitIndicator`. Apply them before SwiftUI modifiers such as `frame` or `padding`, which return a different view type.
:::

## Progress indicators {#progress}

`LoaderKitProgress` shows how much of a task is done: 30 designs across 9 types, determinate or indeterminate, with smooth value changes.

```swift
// UIKit and AppKit
let progress = LoaderKitProgressView(value: 0.4, type: .linear, variant: .wavy)
progress.value = 0.8        // glides to 0.8; nil is indeterminate

// SwiftUI
LoaderKitProgress(value: progress, type: .gauge)
    .showLabel()
    .size(64)
```

See [Progress indicators](/guide/progress) for every type, variant and option.

## Custom specs

::: warning Experimental
Writing your own spec is experimental: until the schema is declared stable, a minor release may change it. Built-in indicators and their params are not affected.
:::

A spec can come from JSON or be built in Swift. Both are validated: an invalid spec is never drawn, and `IndicatorSpecError.problems` lists every rule it breaks.

```swift
let url = Bundle.main.url(forResource: "typing-dots", withExtension: "json")!
let json = try String(contentsOf: url, encoding: .utf8)

do {
    let spec = try IndicatorSpec(json: json)
    loader.spec = spec
} catch let error as IndicatorSpecError {
    print(error.problems)
}

// Or set it without throwing and read the problems afterwards.
loader.specJSON = json
print(loader.specError?.problems ?? [])

// SwiftUI
LoaderKitIndicator(spec: spec, params: ["count": 4])
```

Other entry points:

- `IndicatorSpec(jsonData:)` parses `Data`.
- `IndicatorSpec.validate(json:)` returns the problems without throwing.
- `IndicatorSpec` is `Codable`. Decoding validates too.
- `spec.jsonString()` encodes a spec back to JSON.

### Building a spec in Swift

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

### Evaluating without a view

```swift
let evaluator = try IndicatorEvaluator(spec: spec, params: ["minScale": 0.2])
let states = evaluator.states(at: 0.25)     // [ElementState]
let frozen = evaluator.timeForCycleProgress(0.5)
```

## See also

- [Customizing](/guide/customizing) and [Playback](/guide/playback) for code on every platform.
- [Using a spec](/spec/using) for validation and limits.
