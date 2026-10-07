---
description: "在 Android 上使用 LoaderKit：从 Maven Central 安装，LoaderKitView、Compose 可组合项与自定义 spec。"
---

# Android

Android 版 LoaderKit 用 `Canvas` 绘制加载动画，包含两个 artifact：

- `loaderkit-core`：spec 模型、解析器和校验器、求值器、内置加载动画，以及 `LoaderKitView`。
- `loaderkit-compose`：`LoaderKitIndicator` 可组合项，已包含 `loaderkit-core`。

要求 `minSdk` 24。

## 安装 {#install}

两个 artifact 都发布在 Maven Central 上。

```kotlin
// build.gradle.kts
dependencies {
    implementation("io.github.maitrungduc1410:loaderkit-core:<version>")
    // Jetpack Compose（已包含 loaderkit-core）：
    implementation("io.github.maitrungduc1410:loaderkit-compose:<version>")
}
```

确保 `settings.gradle.kts` 的 repositories 中包含 `mavenCentral()`。把 `<version>` 替换为 [GitHub releases](https://github.com/maitrungduc1410/loader-kit/releases) 中的最新版本。

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

| 属性 | 格式 | 含义 |
| --- | --- | --- |
| `app:indicator` | string | 内置加载动画的名称 |
| `app:indicatorColor` | color 或 reference | 所有元素的颜色 |
| `app:speed` | float | 播放速率，1 表示 spec 本身的速度 |
| `app:hidesWhenStopped` | boolean | 停止时不绘制 |
| `app:cycleProgress` | float | 定格在动画周期中的某个位置，取值 0 到 1 |

`app:indicatorColor` 与 Material Components 中同名属性的格式相同，所以两个库可以一起使用。

使用 `wrap_content` 时，视图是 40dp 见方，再加上 padding。加载动画画在 padding 以内能放下的最大正方形中，并且居中。

## Kotlin

```kotlin
import io.github.maitrungduc1410.loaderkit.LoaderKitView

val loader = LoaderKitView(context).apply {
    indicator = "BallPulse"
    params = mapOf("count" to 5.0)
    color = Color.MAGENTA
    // 或者每个元素一种颜色，循环使用：colors = intArrayOf(Color.RED, Color.GREEN, Color.BLUE)
    onError = { error -> Log.w("Loader", error.message.orEmpty()) }
}

loader.stop()
loader.start()
```

### 属性 {#properties}

| 属性 | 类型 | 默认值 | 含义 |
| --- | --- | --- | --- |
| `indicator` | `String?` | `"BallPulse"` | 未设置 `spec` 时绘制的内置动画 |
| `spec` | `IndicatorSpec?` | `null` | 自定义 spec，优先于 `indicator` |
| `setSpecJson(json)` | 函数 | | 解析并设置 JSON spec，错误交给 `onError` |
| `params` | `Map<String, Double>` | 空 | 覆盖参数，未知名称会被忽略 |
| `color` | `Int` | 主题的 `android:colorForeground` | 所有元素的颜色 |
| `colors` | `IntArray?` | `null` | 元素 `i` 使用 `colors[i % size]` |
| `speed` | `Double` | `1.0` | 播放速率，小于等于 0 时暂停 |
| `isAnimating` | `Boolean` | `true` | 也可以用 `start()` 和 `stop()`，停止时定格当前帧 |
| `hidesWhenStopped` | `Boolean` | `true` | 停止时不绘制 |
| `cycleProgress` | `Double?` | `null` | 定格在周期中的某个位置，取值 [0, 1]；`null` 表示跟随时钟 |
| `respectsReduceMotion` | `Boolean` | `true` | 系统关闭动画时显示静止画面 |
| `onError` | `((InvalidIndicatorSpecException) -> Unit)?` | `null` | 名称或 spec 无法绘制时调用；未设置时写入日志 |

每个属性都可以单独设置，顺序随意。`reset()` 会把除 `onError` 以外的属性全部恢复，所以很适合在 `RecyclerView` 或 React Native 的 view manager 中复用视图。视图被 detach 或隐藏时，时钟会暂停。

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

| 参数 | 类型 | 默认值 |
| --- | --- | --- |
| `indicator` 或 `spec` | `String` 或 `IndicatorSpec` | 必填（两个重载） |
| `modifier` | `Modifier` | `Modifier`，未设置尺寸时为 40.dp 见方 |
| `params` | `Map<String, Double>` | 空 |
| `color` | `Color` | 黑色，系统开启深色模式时为白色 |
| `colors` | `List<Color>?` | `null` |
| `speed` | `Double` | `1.0` |
| `animating` | `Boolean` | `true` |
| `cycleProgress` | `Double?` | `null` |
| `respectsReduceMotion` | `Boolean` | `true` |

这个可组合项没有 `hidesWhenStopped`。要隐藏它，直接把它移出组合即可。未知名称或无效 spec 什么都不画，并输出一条警告日志。

## 自定义 spec {#custom-specs}

::: warning 实验性功能
自己编写 spec 目前仍是实验性功能：在 schema 宣布稳定之前，次版本更新可能会改动它。内置加载动画不受影响。
:::

用 `IndicatorSpec.parse` 解析 JSON spec。它会校验 spec，出错时抛出 `InvalidIndicatorSpecException`，它的 `errors` 列出了所有问题。

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

// 也可以交给视图解析：错误会交给 onError，并且不绘制任何内容。
loader.setSpecJson(json)

// Compose
LoaderKitIndicator(spec = spec, params = mapOf("count" to 4.0))
```

`IndicatorSpec.validate(json)` 返回同样的问题列表，但不抛异常。视图遇到错误输入时永远不会抛异常。

在 Kotlin 字符串字面量中，`$param` 键要写成 `"${'$'}param"`，或者干脆把 spec 放在 asset 文件里。

## 不借助视图求值 {#evaluating-without-a-view}

求值器是纯 Kotlin 代码，所以可以不绘制，直接对 spec 采样，比如在测试中：

```kotlin
import io.github.maitrungduc1410.loaderkit.ElementState
import io.github.maitrungduc1410.loaderkit.evaluate
import io.github.maitrungduc1410.loaderkit.timeForCycleProgress

val states: List<ElementState> = evaluate(spec, t = 0.4, params = mapOf("count" to 5.0))
val frozenTime = timeForCycleProgress(spec, cycleProgress = 0.5)
```

## 另请参阅 {#see-also}

- 各平台的代码示例见[自定义](/zh/guide/customizing)和[播放控制](/zh/guide/playback)。
- 校验和限制见[使用 spec](/zh/spec/using)。
