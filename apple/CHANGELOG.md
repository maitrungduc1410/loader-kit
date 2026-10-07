# @loader-kit/apple

## 1.0.0-rc.0

### Major Changes

- 358a8ab: First release of LoaderKit: indicators described as JSON specs (schema version 1), the `@loader-kit/spec` package with the schema, its JSON Schema, the reference evaluator and the built-in indicators, engines for Android (View and Jetpack Compose), iOS and macOS (UIKit, AppKit and SwiftUI) and Windows (WinUI 3), and `@loader-kit/web` for the browser (React, Vue and Svelte components, a `<loader-kit>` custom element and a canvas view). It ships the 33 built-in indicators of react-native-loader-kit 4 on every platform. Writing your own spec is experimental: the schema may change in a minor release until it is declared stable.
