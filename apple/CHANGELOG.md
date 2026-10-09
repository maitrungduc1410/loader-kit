# @loader-kit/apple

## 1.0.0-rc.2

### Minor Changes

- 64e727d: 20 new progress designs, for 50 in total. New variants: linear `gradient`, `center`, `chevrons` and `ticks`; circular `glow`, `split`, `orbit` and `dual`; pie `segmented`; gauge `needle`, `gradient` and `dots`; liquid `heart`; border `glow` and `segmented`; bars `dots` and `arcs`; grid `dots`; battery `segmented`. New type: `hourglass`. Border `glow` adds 4 to the content inset to make room for its glow.

## 1.0.0-rc.1

### Minor Changes

- 5494b64: 17 new built-in indicators, for 50 in total: `Atom`, `BallFall`, `BallHelix`, `BallHoneycomb`, `BallMerge`, `BallSquareSpin`, `ChasingDots`, `JellyBox`, `LineSlide`, `NewtonCradle`, `Radar`, `RunningDots`, `SquareGridFlip`, `SquareGridWave`, `Timer`, `TriangleOrbit` and `TripleArcSpin`.
- 5494b64: `LoaderKitProgress`, a progress indicator with 30 designs across 9 types (`linear`, `circular`, `pie`, `gauge`, `liquid`, `border`, `bars`, `grid`, `battery`), determinate or indeterminate, gliding smoothly to every new value (`smooth`, on by default). It ships as `<loader-kit-progress>`, `LoaderKitProgressView` and the React, Vue and Svelte components on the web, `LoaderKitProgressView` and a composable on Android, `LoaderKitProgressView` and a SwiftUI view on Apple platforms, and a WinUI control drawn with Win2D. The geometry lives in `@loader-kit/spec` and every platform runs the same test vectors in `test-vectors/progress`.

## 1.0.0-rc.0

### Major Changes

- 358a8ab: First release of LoaderKit: indicators described as JSON specs (schema version 1), the `@loader-kit/spec` package with the schema, its JSON Schema, the reference evaluator and the built-in indicators, engines for Android (View and Jetpack Compose), iOS and macOS (UIKit, AppKit and SwiftUI) and Windows (WinUI 3), and `@loader-kit/web` for the browser (React, Vue and Svelte components, a `<loader-kit>` custom element and a canvas view). It ships the 33 built-in indicators of react-native-loader-kit 4 on every platform. Writing your own spec is experimental: the schema may change in a minor release until it is declared stable.
