---
description: "Dùng LoaderKit trên Android: cài từ Maven Central, LoaderKitView trong XML hoặc Kotlin, composable LoaderKitIndicator cho Compose và load spec tùy chỉnh."
---

# Android

LoaderKit cho Android vẽ indicator bằng `Canvas`. Thư viện có hai artifact:

- `loaderkit-core`: model của spec, parser và validator, evaluator, các indicator có sẵn và `LoaderKitView`.
- `loaderkit-compose`: composable `LoaderKitIndicator`. Artifact này đã bao gồm `loaderkit-core`.

Yêu cầu `minSdk` 24.

## Cài đặt {#install}

Cả hai artifact đều có trên Maven Central.

```kotlin
// build.gradle.kts
dependencies {
    implementation("io.github.maitrungduc1410:loaderkit-core:<version>")
    // Jetpack Compose (đã bao gồm loaderkit-core):
    implementation("io.github.maitrungduc1410:loaderkit-compose:<version>")
}
```

Nhớ thêm `mavenCentral()` vào repositories trong `settings.gradle.kts`. Thay `<version>` bằng bản mới nhất trên [GitHub releases](https://github.com/maitrungduc1410/loader-kit/releases).

## XML {#xml}

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

| Attribute | Định dạng | Ý nghĩa |
| --- | --- | --- |
| `app:indicator` | string | Tên một indicator có sẵn |
| `app:indicatorColor` | color hoặc reference | Màu của mọi phần tử |
| `app:speed` | float | Tốc độ phát, 1 là đúng tốc độ của spec |
| `app:hidesWhenStopped` | boolean | Không vẽ gì khi đã dừng |
| `app:cycleProgress` | float | Một điểm cố định trong chu kỳ animation, từ 0 đến 1 |

`app:indicatorColor` dùng cùng định dạng với attribute cùng tên của Material Components, nên bạn dùng hai thư viện cùng lúc vẫn ổn.

Với `wrap_content`, view là hình vuông 40dp, cộng thêm padding. Indicator được vẽ trong hình vuông lớn nhất vừa bên trong padding, căn giữa.

## Kotlin {#kotlin}

```kotlin
import io.github.maitrungduc1410.loaderkit.LoaderKitView

val loader = LoaderKitView(context).apply {
    indicator = "BallPulse"
    params = mapOf("count" to 5.0)
    color = Color.MAGENTA
    // hoặc mỗi phần tử một màu, lặp vòng: colors = intArrayOf(Color.RED, Color.GREEN, Color.BLUE)
    onError = { error -> Log.w("Loader", error.message.orEmpty()) }
}

loader.stop()
loader.start()
```

### Property {#properties}

| Property | Kiểu | Mặc định | Ý nghĩa |
| --- | --- | --- | --- |
| `indicator` | `String?` | `"BallPulse"` | Indicator có sẵn được vẽ khi chưa đặt `spec` |
| `spec` | `IndicatorSpec?` | `null` | Một spec tùy chỉnh. Được ưu tiên hơn `indicator` |
| `setSpecJson(json)` | function | | Parse và gán một spec JSON. Lỗi được đưa vào `onError` |
| `params` | `Map<String, Double>` | rỗng | Override params. Tên không tồn tại bị bỏ qua |
| `color` | `Int` | theme `android:colorForeground` | Màu của mọi phần tử |
| `colors` | `IntArray?` | `null` | Phần tử `i` dùng `colors[i % size]` |
| `speed` | `Double` | `1.0` | Tốc độ phát. Bằng 0 hoặc nhỏ hơn thì tạm dừng |
| `isAnimating` | `Boolean` | `true` | Ngoài ra còn có `start()` và `stop()`. Stop sẽ giữ nguyên frame |
| `hidesWhenStopped` | `Boolean` | `true` | Không vẽ gì khi đã dừng |
| `cycleProgress` | `Double?` | `null` | Một điểm cố định trong chu kỳ, trong khoảng [0, 1]. `null` thì chạy theo đồng hồ |
| `respectsReduceMotion` | `Boolean` | `true` | Hiện frame tĩnh khi hệ thống tắt animation |
| `onError` | `((InvalidIndicatorSpecException) -> Unit)?` | `null` | Được gọi khi tên hoặc spec không vẽ được. Nếu không đặt thì lỗi được ghi log |

Mỗi property có thể gán riêng lẻ và theo thứ tự bất kỳ. `reset()` đưa tất cả về mặc định, trừ `onError`, nhờ vậy view dễ tái sử dụng trong `RecyclerView` hay trong view manager của React Native. Đồng hồ tạm dừng khi view bị detach hoặc bị ẩn.

## Jetpack Compose {#jetpack-compose}

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

| Tham số | Kiểu | Mặc định |
| --- | --- | --- |
| `indicator` hoặc `spec` | `String` hoặc `IndicatorSpec` | bắt buộc (hai overload) |
| `modifier` | `Modifier` | `Modifier`, hình vuông 40.dp trừ khi modifier đặt kích thước |
| `params` | `Map<String, Double>` | rỗng |
| `color` | `Color` | đen, hoặc trắng khi hệ thống đang bật dark mode |
| `colors` | `List<Color>?` | `null` |
| `speed` | `Double` | `1.0` |
| `animating` | `Boolean` | `true` |
| `cycleProgress` | `Double?` | `null` |
| `respectsReduceMotion` | `Boolean` | `true` |

Composable này không có `hidesWhenStopped`. Muốn ẩn thì bạn bỏ nó ra khỏi composition. Tên không tồn tại hoặc spec không hợp lệ sẽ không vẽ gì và ghi một warning vào log.

## Progress indicator {#progress}

`LoaderKitProgress` cho biết một tác vụ đã chạy được bao nhiêu: 50 mẫu thuộc 10 type, có value hoặc vô định, đổi value mượt.

```xml
<io.github.maitrungduc1410.loaderkit.LoaderKitProgressView
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    app:progressType="linear"
    app:progressVariant="wavy"
    app:progressValue="0.4" />
```

```kotlin
progress.value = 0.8        // chạy mượt tới 0.8; null là vô định
progress.smooth = false     // vẽ đúng từng value ngay khi nhận

// Compose
LoaderKitProgress(value = progress, type = ProgressType.Gauge, showLabel = true, size = 64.dp)
```

Xem [Progress indicator](/vi/guide/progress) để biết mọi type, variant và option.

## Spec tùy chỉnh {#custom-specs}

::: warning Thử nghiệm
Tự viết spec vẫn đang ở giai đoạn thử nghiệm: cho đến khi schema được công bố là ổn định, một bản minor release vẫn có thể thay đổi nó. Indicator có sẵn không bị ảnh hưởng.
:::

Parse spec JSON bằng `IndicatorSpec.parse`. Hàm này validate spec và throw `InvalidIndicatorSpecException`, trong đó `errors` liệt kê mọi lỗi.

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

// Hoặc để view tự parse: lỗi đi vào onError và không có gì được vẽ.
loader.setSpecJson(json)

// Compose
LoaderKitIndicator(spec = spec, params = mapOf("count" to 4.0))
```

`IndicatorSpec.validate(json)` trả về đúng danh sách lỗi đó mà không throw. View thì không bao giờ throw khi gặp input sai.

Trong string literal của Kotlin, hãy viết `"${'$'}param"` cho key `$param`, hoặc để spec trong file asset.

## Evaluate không cần view {#evaluating-without-a-view}

Evaluator là Kotlin thuần, nên bạn có thể lấy mẫu một spec mà không cần vẽ, ví dụ trong test:

```kotlin
import io.github.maitrungduc1410.loaderkit.ElementState
import io.github.maitrungduc1410.loaderkit.evaluate
import io.github.maitrungduc1410.loaderkit.timeForCycleProgress

val states: List<ElementState> = evaluate(spec, t = 0.4, params = mapOf("count" to 5.0))
val frozenTime = timeForCycleProgress(spec, cycleProgress = 0.5)
```

## Xem thêm {#see-also}

- [Tùy chỉnh](/vi/guide/customizing) và [Điều khiển animation](/vi/guide/playback): code cho mọi nền tảng.
- [Dùng spec](/vi/spec/using): validate và các giới hạn.
