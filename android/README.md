# LoaderKit for Android

Loading indicators described as data (JSON specs) and rendered natively with `Canvas`.
The same specs drive the iOS, macOS, Windows and web engines; see [`SPEC.md`](../SPEC.md) for the format.
Full guide with live examples: https://maitrungduc1410.github.io/loader-kit/platforms/android

- `loaderkit-core`: spec model, parser and validator, the evaluator, the built-in indicators and `LoaderKitView`.
- `loaderkit-compose`: the `LoaderKitIndicator` composable.

Requires `minSdk` 24.

## Install

```kotlin
dependencies {
    implementation("io.github.maitrungduc1410:loaderkit-core:<version>")
    // Jetpack Compose (includes loaderkit-core):
    implementation("io.github.maitrungduc1410:loaderkit-compose:<version>")
}
```

Both artifacts are on Maven Central (`mavenCentral()`).

## XML

```xml
<io.github.maitrungduc1410.loaderkit.LoaderKitView
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    app:indicator="BallSpinFadeLoader"
    app:indicatorColor="?attr/colorPrimary"
    app:speed="1.5"
    app:hidesWhenStopped="false" />
```

With `wrap_content` the view is 40dp square (plus padding). The indicator is drawn in the largest
centered square that fits inside the padding.

## Kotlin

```kotlin
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

## Built-in indicators

`BuiltinIndicators.names` lists them at runtime. All 33:

- `AudioEqualizer`
- `BallBeat`
- `BallClipRotate`
- `BallClipRotateMultiple`
- `BallClipRotatePulse`
- `BallDoubleBounce`
- `BallGridBeat`
- `BallGridPulse`
- `BallPulse`
- `BallPulseRise`
- `BallPulseSync`
- `BallRotate`
- `BallRotateChase`
- `BallScale`
- `BallScaleMultiple`
- `BallScaleRipple`
- `BallScaleRippleMultiple`
- `BallSpinFadeLoader`
- `BallTrianglePath`
- `BallZigZag`
- `BallZigZagDeflect`
- `CircleStrokeSpin`
- `CubeTransition`
- `LineScale`
- `LineScaleParty`
- `LineScalePulseOut`
- `LineScalePulseOutRapid`
- `LineSpinFadeLoader`
- `Orbit`
- `Pacman`
- `SemiCircleSpin`
- `SquareSpin`
- `TriangleSkewSpin`

## Compose

```kotlin
LoaderKitIndicator(
    indicator = "BallPulse",
    modifier = Modifier.size(64.dp),
    params = mapOf("count" to 4.0),
    color = MaterialTheme.colorScheme.primary,
    speed = 1.0,
    animating = isLoading,
)
```

The composable is 40.dp square unless `modifier` sizes it.

## Custom specs

> Writing your own spec is **experimental**: until the schema is declared stable, a minor release
> may change it. Built-in indicators are not affected.

Any schema v1 spec works, from JSON or built in code:

```kotlin
val spec = IndicatorSpec.parse(
    """
    {
      "schemaVersion": 1,
      "name": "Blink",
      "duration": 1,
      "params": { "count": 3 },
      "layout": { "type": "row", "count": { "${'$'}param": "count" }, "gap": 0.1 },
      "shape": { "type": "circle" },
      "stagger": { "each": 0.2 },
      "tracks": [{ "property": "opacity", "keyTimes": [0, 0.5, 1], "values": [1, 0.2, 1], "easing": "easeInOut" }]
    }
    """,
)

loaderView.spec = spec            // or loaderView.setSpecJson(json)
LoaderKitIndicator(spec = spec)
```

`IndicatorSpec.parse` throws `InvalidIndicatorSpecException`, whose `errors` lists every problem.
`IndicatorSpec.validate(json)` returns the same list without throwing. The view never throws for bad
input: it reports the problem to `onError` (or logs it) and draws nothing.

The evaluator is plain Kotlin and can be used without a view:

```kotlin
val states: List<ElementState> = evaluate(spec, t = 0.4, params = mapOf("count" to 5.0))
val frozenTime = timeForCycleProgress(spec, cycleProgress = 0.5)
```

## Playback

| `LoaderKitView` | Compose | Default | Behavior |
| --- | --- | --- | --- |
| `indicator` | `indicator` | `"BallPulse"` | Built-in to draw when no `spec` is set |
| `spec`, `setSpecJson()` | `spec` | none | Custom spec; takes precedence over `indicator` |
| `params` | `params` | empty | Param overrides; unknown names are ignored |
| `color` | `color` | View: theme `colorForeground`; Compose: black, white in dark theme | Color of every element |
| `colors` | `colors` | none | Element `i` uses `colors[i % size]` |
| `speed` | `speed` | 1 | Playback rate; `<= 0` pauses; never makes the animation jump |
| `isAnimating`, `start()`, `stop()` | `animating` | true | Stopping freezes the current frame |
| `hidesWhenStopped` | | true | Draw nothing while stopped |
| `cycleProgress` | `cycleProgress` | null | A frozen point of the animation cycle in `[0, 1]`; null follows the clock |
| `respectsReduceMotion` | `respectsReduceMotion` | true | Show a still frame when the system turns animations off |

`cycleProgress` picks a point of the animation cycle, for example to show a still frame in a
screenshot test; it is not the progress of a task. It skips whole cycles until every element has
started, so a frozen frame never shows elements waiting for their stagger offset. In XML it is
`app:cycleProgress`.

Changing the spec, the indicator or the params restarts the animation; changing colors, speed or
size does not. The clock pauses while the view is detached or hidden.

Every `LoaderKitView` property can be set on its own and in any order, and `reset()` restores all
of them, which makes the view easy to recycle in a list or a React Native view manager.

## Building

```sh
cd android
./gradlew :loaderkit-core:testDebugUnitTest   # runs the conformance vectors in ../test-vectors
./gradlew publishToMavenLocal
```

The library version is the `version` field of `android/package.json`.
