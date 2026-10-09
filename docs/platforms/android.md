---
description: "Use LoaderKit on Android: install from Maven Central, LoaderKitView in XML or Kotlin, the Jetpack Compose LoaderKitIndicator, and loading custom specs."
---

# Android

LoaderKit for Android draws indicators with `Canvas`. It has two artifacts:

- `loaderkit-core`: the spec model, parser and validator, the evaluator, the built-in indicators and `LoaderKitView`.
- `loaderkit-compose`: the `LoaderKitIndicator` composable. It includes `loaderkit-core`.

Requires `minSdk` 24.

## Install

Both artifacts are on Maven Central.

```kotlin
// build.gradle.kts
dependencies {
    implementation("io.github.maitrungduc1410:loaderkit-core:<version>")
    // Jetpack Compose (includes loaderkit-core):
    implementation("io.github.maitrungduc1410:loaderkit-compose:<version>")
}
```

Make sure `mavenCentral()` is in the repositories of your `settings.gradle.kts`. Replace `<version>` with the latest release from the [GitHub releases](https://github.com/maitrungduc1410/loader-kit/releases).

## XML

```xml
<io.github.maitrungduc1410.loaderkit.LoaderKitView
    android:id="@+id/loader"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    app:indicator="BallSpinFadeLoader"
    app:indicatorColor="?attr/colorPrimary"
    app:speed="1.5"
    app:hidesWhenStopped="false" />
```

| Attribute | Format | Meaning |
| --- | --- | --- |
| `app:indicator` | string | Name of a built-in indicator |
| `app:indicatorColor` | color or reference | Color of every element |
| `app:speed` | float | Playback rate, 1 is the speed of the spec |
| `app:hidesWhenStopped` | boolean | Draw nothing while stopped |
| `app:cycleProgress` | float | A frozen point of the animation cycle, 0 to 1 |

`app:indicatorColor` uses the same format as the Material Components attribute of the same name, so both libraries can be used together.

With `wrap_content` the view is 40dp square, plus padding. The indicator is drawn in the largest centered square that fits inside the padding.

## Kotlin

```kotlin
import io.github.maitrungduc1410.loaderkit.LoaderKitView

val loader = LoaderKitView(context).apply {
    indicator = "BallPulse"
    params = mapOf("count" to 5.0)
    color = Color.MAGENTA
    // or one color per element, cycling: colors = intArrayOf(Color.RED, Color.GREEN, Color.BLUE)
    onError = { error -> Log.w("Loader", error.message.orEmpty()) }
}

loader.stop()
loader.start()
```

### Properties

| Property | Type | Default | Meaning |
| --- | --- | --- | --- |
| `indicator` | `String?` | `"BallPulse"` | Built-in to draw when no `spec` is set |
| `spec` | `IndicatorSpec?` | `null` | A custom spec. Wins over `indicator` |
| `setSpecJson(json)` | function | | Parses and sets a JSON spec. Errors go to `onError` |
| `params` | `Map<String, Double>` | empty | Param overrides. Unknown names are ignored |
| `color` | `Int` | theme `android:colorForeground` | Color of every element |
| `colors` | `IntArray?` | `null` | Element `i` uses `colors[i % size]` |
| `speed` | `Double` | `1.0` | Playback rate. 0 or less pauses |
| `isAnimating` | `Boolean` | `true` | Also `start()` and `stop()`. Stopping freezes the frame |
| `hidesWhenStopped` | `Boolean` | `true` | Draw nothing while stopped |
| `cycleProgress` | `Double?` | `null` | A frozen point of the cycle in [0, 1]. `null` follows the clock |
| `respectsReduceMotion` | `Boolean` | `true` | Show a still frame when the system turns animations off |
| `onError` | `((InvalidIndicatorSpecException) -> Unit)?` | `null` | Called when a name or spec cannot be drawn. Logged when not set |

Every property can be set on its own and in any order. `reset()` restores all of them except `onError`, which makes the view easy to recycle in a `RecyclerView` or a React Native view manager. The clock pauses while the view is detached or hidden.

## Jetpack Compose

```kotlin
import io.github.maitrungduc1410.loaderkit.compose.LoaderKitIndicator

LoaderKitIndicator(
    indicator = "BallPulse",
    modifier = Modifier.size(64.dp),
    params = mapOf("count" to 4.0),
    color = MaterialTheme.colorScheme.primary,
    speed = 1.0,
    animating = isLoading,
)
```

| Parameter | Type | Default |
| --- | --- | --- |
| `indicator` or `spec` | `String` or `IndicatorSpec` | required (two overloads) |
| `modifier` | `Modifier` | `Modifier`, 40.dp square unless it sets a size |
| `params` | `Map<String, Double>` | empty |
| `color` | `Color` | black, or white when the system is in dark mode |
| `colors` | `List<Color>?` | `null` |
| `speed` | `Double` | `1.0` |
| `animating` | `Boolean` | `true` |
| `cycleProgress` | `Double?` | `null` |
| `respectsReduceMotion` | `Boolean` | `true` |

The composable has no `hidesWhenStopped`. To hide it, leave it out of the composition. An unknown name or an invalid spec draws nothing and logs a warning.

## Progress indicators {#progress}

`LoaderKitProgress` shows how much of a task is done: 30 designs across 9 types, determinate or indeterminate, with smooth value changes.

```xml
<io.github.maitrungduc1410.loaderkit.LoaderKitProgressView
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    app:progressType="linear"
    app:progressVariant="wavy"
    app:progressValue="0.4" />
```

```kotlin
progress.value = 0.8        // glides to 0.8; null is indeterminate
progress.smooth = false     // draw every value as it comes

// Compose
LoaderKitProgress(value = progress, type = ProgressType.Gauge, showLabel = true, size = 64.dp)
```

See [Progress indicators](/guide/progress) for every type, variant and option.

## Custom specs

::: warning Experimental
Writing your own spec is experimental: until the schema is declared stable, a minor release may change it. Built-in indicators are not affected.
:::

Parse a JSON spec with `IndicatorSpec.parse`. It validates the spec and throws `InvalidIndicatorSpecException`, whose `errors` lists every problem.

```kotlin
import io.github.maitrungduc1410.loaderkit.IndicatorSpec
import io.github.maitrungduc1410.loaderkit.InvalidIndicatorSpecException

val json = context.assets.open("typing-dots.json").bufferedReader().use { it.readText() }

try {
    val spec = IndicatorSpec.parse(json)
    loader.spec = spec
} catch (e: InvalidIndicatorSpecException) {
    e.errors.forEach { Log.w("Loader", it) }
}

// Or let the view parse it: errors go to onError and nothing is drawn.
loader.setSpecJson(json)

// Compose
LoaderKitIndicator(spec = spec, params = mapOf("count" to 4.0))
```

`IndicatorSpec.validate(json)` returns the same list of problems without throwing. The view never throws for bad input.

In a Kotlin string literal, write `"${'$'}param"` for the `$param` key, or keep specs in asset files.

## Evaluating without a view

The evaluator is plain Kotlin, so you can sample a spec without drawing it, for example in a test:

```kotlin
import io.github.maitrungduc1410.loaderkit.ElementState
import io.github.maitrungduc1410.loaderkit.evaluate
import io.github.maitrungduc1410.loaderkit.timeForCycleProgress

val states: List<ElementState> = evaluate(spec, t = 0.4, params = mapOf("count" to 5.0))
val frozenTime = timeForCycleProgress(spec, cycleProgress = 0.5)
```

## See also

- [Customizing](/guide/customizing) and [Playback](/guide/playback) for code on every platform.
- [Using a spec](/spec/using) for validation and limits.
