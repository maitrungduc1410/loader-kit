# LoaderKit for iOS and macOS

The Apple engine of [LoaderKit](https://github.com/maitrungduc1410/loader-kit): loading indicators
described as JSON specs and rendered with Core Animation, so they keep animating while the main
thread is busy. Full guide with live examples: https://maitrungduc1410.github.io/loader-kit/platforms/apple

- `LoaderKitCore`: spec model, validation, the reference evaluator and the built-in indicators.
  Foundation only, builds on Linux.
- `LoaderKit`: `LoaderKitView` (UIKit and AppKit), the SwiftUI `LoaderKitIndicator`, and the Core
  Animation engine. Re-exports `LoaderKitCore`.

Requires iOS 15 or macOS 12, Swift 5.9.

## Installation

### Swift Package Manager

```swift
dependencies: [
    .package(url: "https://github.com/maitrungduc1410/loader-kit.git", from: "1.0.0"),
],
targets: [
    .target(name: "App", dependencies: [.product(name: "LoaderKit", package: "loader-kit")]),
]
```

Or in Xcode: File > Add Package Dependencies, and enter the repository URL.

### CocoaPods

The pod is not published to the CocoaPods trunk. Point your `Podfile` at the repository and a
release tag (tags have no `v` prefix):

```ruby
pod 'LoaderKit', :git => 'https://github.com/maitrungduc1410/loader-kit.git', :tag => '1.0.0'
```

With CocoaPods everything lives in the `LoaderKit` module, so `import LoaderKit` gives access to
the core types as well.

## Usage

### UIKit

```swift
import LoaderKit

let loader = LoaderKitView(indicator: "BallPulse")
loader.color = .systemBlue
loader.params = ["count": 5]
view.addSubview(loader)
```

`LoaderKitView` has an intrinsic size of 40 × 40 points. The indicator is drawn in the largest
centered square that fits the view.

### AppKit

The same class is an `NSView` on macOS, with the same API:

```swift
import LoaderKit

let loader = LoaderKitView(indicator: "SquareSpin")
loader.color = .controlAccentColor
window.contentView?.addSubview(loader)
```

### SwiftUI

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

Modifiers: `params(_:)`, `color(_:)`, `colors(_:)`, `speed(_:)`, `animating(_:)`,
`hidesWhenStopped(_:)`, `cycleProgress(_:)`, `respectsReduceMotion(_:)`. Apply them before
SwiftUI modifiers such as `frame`.

### Built-in indicators

50 indicators, the same on every platform:

Atom, AudioEqualizer, BallBeat, BallClipRotate, BallClipRotateMultiple, BallClipRotatePulse,
BallDoubleBounce, BallFall, BallGridBeat, BallGridPulse, BallHelix, BallHoneycomb, BallMerge,
BallPulse, BallPulseRise, BallPulseSync, BallRotate, BallRotateChase, BallScale,
BallScaleMultiple, BallScaleRipple, BallScaleRippleMultiple, BallSpinFadeLoader,
BallSquareSpin, BallTrianglePath, BallZigZag, BallZigZagDeflect, ChasingDots, CircleStrokeSpin,
CubeTransition, JellyBox, LineScale, LineScaleParty, LineScalePulseOut, LineScalePulseOutRapid,
LineSlide, LineSpinFadeLoader, NewtonCradle, Orbit, Pacman, Radar, RunningDots, SemiCircleSpin,
SquareGridFlip, SquareGridWave, SquareSpin, Timer, TriangleOrbit, TriangleSkewSpin,
TripleArcSpin.

`BallPulse` takes the params `count` (3) and `minScale` (0.3); `BallSpinFadeLoader` takes
`count` (8), `minScale` (0.4) and `minOpacity` (0.3).

```swift
IndicatorSpec.builtinNames            // the 50 names above
IndicatorSpec.builtin(named: "BallPulse")
```

Setting an unknown name draws nothing and sets `specError`.

### Custom specs

> **Experimental.** Until the schema is declared stable, a minor release may change it. The
> built-in indicators and their params are not affected.

A spec can come from JSON (the format of `SPEC.md` at the repository root) or be built in Swift.
Both are validated: an invalid spec is never drawn, and `IndicatorSpecError.problems` lists every
rule it breaks.

```swift
let json = """
{
  "schemaVersion": 1,
  "name": "Blink",
  "duration": 1,
  "layout": { "type": "row", "count": 3, "gap": 0.1 },
  "shape": { "type": "circle" },
  "stagger": { "each": 0.2 },
  "tracks": [{ "property": "opacity", "keyTimes": [0, 0.5, 1], "values": [1, 0.2, 1] }]
}
"""

do {
    try loader.setSpec(json: json)
} catch let error as IndicatorSpecError {
    print(error.problems)
}

// Or set it without throwing and read the problems afterwards.
loader.specJSON = json
print(loader.specError?.problems ?? [])
```

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

A spec with several groups of elements lists them as `parts`, drawn in order. Element indices,
and so `colors`, run across the parts. A part can set its own `duration`, per-element
`durations`, `rest` values for properties without a track, and `groupTracks` that move the whole
group around the box center:

```swift
let orbit = IndicatorSpec(
    name: "Orbit",
    duration: 1.2,
    parts: [
        .init(
            layout: .single(size: 0.5),
            shape: .circle(),
            tracks: [.init(property: .opacity, keyTimes: [0, 0.5, 1], values: [1, 0.4, 1])]
        ),
        .init(
            layout: .single(size: 0.16),
            shape: .circle(),
            rest: [.translateY: -0.4],
            groupTracks: [.init(property: .rotate, keyTimes: [0, 1], values: [0, .number(2 * .pi)])]
        ),
    ]
)
```

`IndicatorSpec` is `Codable`; decoding validates too. To sample a spec yourself, use
`IndicatorEvaluator`:

```swift
let evaluator = try IndicatorEvaluator(spec: spec, params: ["minScale": 0.2])
let states = evaluator.states(at: 0.25)     // [ElementState]
let frozen = evaluator.timeForCycleProgress(0.5)
```

### Colors

`color` paints every element. `colors` cycles through a list by element index; when it is empty,
`color` is used. Dynamic system colors follow light and dark appearance.

### Playback

| Property | Default | Behavior |
| --- | --- | --- |
| `isAnimating`, `startAnimating()`, `stopAnimating()` | `true` | Stopping freezes the current frame; starting continues from it. |
| `hidesWhenStopped` | `true` | Draws nothing while stopped. |
| `speed` | `1` | Changes never make the animation jump. `0` or less pauses. |
| `cycleProgress` | `nil` | When set (0 to 1), draws that point of the animation cycle, with every staggered element started, for screenshots and previews. It is not the progress of a task: 0.5 is the middle of one loop. Clearing it resumes from where the animation was. |
| `respectsReduceMotion` | `true` | When the system asks for reduced motion, draws a still frame instead of animating. |

Changing `indicator`, `spec`, `specJSON` or `params` restarts the animation. Changing colors, speed
or size does not. Animations resume by themselves when the app returns to the foreground or the
view moves to a new window.

To reuse a view, for example in a list cell, call `reset()`: it restores every property to its
default and restarts the animation.

### Progress

`LoaderKitProgressView` (UIKit, AppKit) and `LoaderKitProgress` (SwiftUI) show how much of a task
is done: 50 designs across 10 types, with a value from 0 to 1 or, with `nil`, indeterminate. With
`smooth` (on by default) they glide to every new value. Full guide:
[maitrungduc1410.github.io/loader-kit/guide/progress](https://maitrungduc1410.github.io/loader-kit/guide/progress)

```swift
let progress = LoaderKitProgressView(value: nil, type: .linear, variant: .wavy)
progress.value = 0.4

// SwiftUI
LoaderKitProgress(value: progress, type: .gauge)
    .showLabel()
    .size(64)

LoaderKitProgress(value: progress, type: .border) {
    Button("Upload", action: upload)
}
```

Content goes in the middle, or inside the stroke of `.border`: the SwiftUI view takes a view
builder, and on UIKit and AppKit you set `contentView` to the view to show. VoiceOver reads a
progress value in percent.

## Development

From the repository root:

```sh
swift build
swift test
```

The tests run the conformance vectors in `test-vectors/` against the Swift evaluator. After
changing a built-in indicator, run `npm run generate` to regenerate
`Sources/LoaderKitCore/BuiltinIndicatorSpecs.swift`.
