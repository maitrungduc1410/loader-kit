---
'@loader-kit/spec': major
'@loader-kit/web': major
'@loader-kit/android': major
'@loader-kit/apple': major
'@loader-kit/windows': major
---

First release of LoaderKit: indicators described as JSON specs (schema version 1), the `@loader-kit/spec` package with the schema, its JSON Schema, the reference evaluator and the built-in indicators, engines for Android (View and Jetpack Compose), iOS and macOS (UIKit, AppKit and SwiftUI) and Windows (WinUI 3), and `@loader-kit/web` for the browser (a canvas view and a `<loader-kit>` custom element). It ships the 33 built-in indicators of react-native-loader-kit 4 on every platform. Writing your own spec is experimental: the schema may change in a minor release until it is declared stable.
