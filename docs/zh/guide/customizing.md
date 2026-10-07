---
description: "自定义 LoaderKit 加载动画：覆盖 count 等参数，设置统一颜色或为每个元素单独配色，并在各平台上调整视图尺寸。"
---

# 自定义

每个加载动画都支持同样四类设置：**参数（params）**、**颜色（color）**、**多色（colors）** 和**尺寸**。先在下面试一试，再复制对应平台的代码。

<IndicatorDemo indicator="BallPulse" />

## 参数 {#params}

有些加载动画声明了参数，也就是带默认值的具名数字。`BallPulse` 有 `count`（3）和 `minScale`（0.3）。只需传入想修改的值，其余的保持默认。

::: code-group

```html [HTML]
<loader-kit indicator="BallPulse" params='{"count": 5, "minScale": 0.5}'></loader-kit>
```

```ts [TypeScript]
const view = new LoaderKitView(host, {
  indicator: 'BallPulse',
  params: { count: 5, minScale: 0.5 },
});
```

```kotlin [Kotlin (View)]
loader.indicator = "BallPulse"
loader.params = mapOf("count" to 5.0, "minScale" to 0.5)
```

```kotlin [Compose]
LoaderKitIndicator(
    indicator = "BallPulse",
    params = mapOf("count" to 5.0, "minScale" to 0.5),
)
```

```swift [Swift (UIKit)]
let loader = LoaderKitView(indicator: "BallPulse")
loader.params = ["count": 5, "minScale": 0.5]
```

```swift [SwiftUI]
LoaderKitIndicator("BallPulse", params: ["count": 5, "minScale": 0.5])
```

```csharp [C#]
indicator.Indicator = "BallPulse";
indicator.Params = new Dictionary<string, double> { ["count"] = 5, ["minScale"] = 0.5 };
```

:::

以下规则在所有平台上都一样：

- 加载动画没有声明的参数名会被忽略。切换加载动画时可以保留同一组参数。
- 数量类参数会四舍五入取整，且最小为 1。
- 参数值不做范围检查。尺寸、数量和线宽请保持为正数：超出范围的值会画成什么样，规范没有规定。
- 修改参数会让动画回到周期开头重新播放。

参数列表见[内置加载动画](/zh/guide/indicators#the-params)；想在自己的 spec 里声明参数，见[参数](/zh/spec/params)。

## 颜色 {#color}

一种颜色绘制所有元素。`opacity` track 会乘到这个颜色的 alpha 上。

::: code-group

```html [HTML]
<loader-kit indicator="BallPulse" color="#10b981"></loader-kit>

<!-- 不设置 color 属性时，使用元素的 CSS color -->
<loader-kit indicator="BallPulse" style="color: var(--brand)"></loader-kit>
```

```ts [TypeScript]
view.color = '#10b981';   // 任意 CSS 颜色；null 表示 currentColor
```

```xml [Android XML]
<io.github.maitrungduc1410.loaderkit.LoaderKitView
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    app:indicatorColor="?attr/colorPrimary" />
```

```kotlin [Kotlin (View)]
loader.color = Color.MAGENTA
```

```kotlin [Compose]
LoaderKitIndicator("BallPulse", color = MaterialTheme.colorScheme.primary)
```

```swift [Swift (UIKit)]
loader.color = .systemBlue
```

```swift [SwiftUI]
LoaderKitIndicator("BallPulse").color(.accentColor)
```

```xml [XAML]
<lk:LoaderKitIndicator Indicator="BallPulse" Color="MediumSeaGreen" />
```

:::

默认颜色：

| 平台 | 默认值 |
| --- | --- |
| Web | 宿主元素的 CSS `color`（`currentColor`） |
| Android View | 主题属性 `android:colorForeground` |
| Compose | 黑色，系统开启深色模式时为白色 |
| iOS、macOS | `systemGray` |
| Windows | 白色 |

在 Apple 平台上，`.label` 这类动态系统颜色会自动适配浅色和深色外观。

## 多色 {#colors}

`colors` 为每个元素单独指定颜色。元素 `i` 使用 `colors[i mod colors.length]`，所以列表比元素少时会循环使用。只要设置了 `colors` 且不为空，它就优先于 `color`。

::: code-group

```html [HTML]
<loader-kit indicator="BallPulse" colors="#f43f5e, #f59e0b, #10b981"></loader-kit>
```

```ts [TypeScript]
view.colors = ['#f43f5e', '#f59e0b', '#10b981'];
```

```kotlin [Kotlin (View)]
loader.colors = intArrayOf(Color.RED, Color.YELLOW, Color.GREEN)
```

```kotlin [Compose]
LoaderKitIndicator("BallPulse", colors = listOf(Color.Red, Color.Yellow, Color.Green))
```

```swift [Swift (UIKit)]
loader.colors = [.systemRed, .systemOrange, .systemGreen]
```

```swift [SwiftUI]
LoaderKitIndicator("BallPulse").colors([.red, .orange, .green])
```

```csharp [C#]
indicator.Colors = new[] { Colors.Tomato, Colors.Gold, Colors.MediumSeaGreen };
```

:::

<LoaderKitPreview indicator="BallPulse" :colors="['#f43f5e', '#f59e0b', '#10b981']" />

::: tip 元素顺序
元素按绘制顺序编号：一行时从左到右，网格逐行编号，圆环从右侧开始顺时针编号。如果加载动画由多个部件组成，编号会接着上一个部件继续往下排。
:::

## 尺寸 {#size}

按各平台惯常的方式设置视图尺寸即可。加载动画会画在能放下的最大正方形里并居中，所以永远不会被拉伸。不设置尺寸时，视图为 40 × 40。

::: code-group

```html [HTML]
<loader-kit indicator="BallPulse" style="width: 64px; height: 64px"></loader-kit>
```

```xml [Android XML]
<io.github.maitrungduc1410.loaderkit.LoaderKitView
    android:layout_width="64dp"
    android:layout_height="64dp"
    android:padding="8dp"
    app:indicator="BallPulse" />
```

```kotlin [Compose]
LoaderKitIndicator("BallPulse", Modifier.size(64.dp))
```

```swift [Swift (UIKit)]
loader.translatesAutoresizingMaskIntoConstraints = false
NSLayoutConstraint.activate([
    loader.widthAnchor.constraint(equalToConstant: 64),
    loader.heightAnchor.constraint(equalToConstant: 64),
])
```

```swift [SwiftUI]
LoaderKitIndicator("BallPulse").frame(width: 64, height: 64)
```

```xml [XAML]
<lk:LoaderKitIndicator Indicator="BallPulse" Width="64" Height="64" />
```

:::

在 Android 上，加载动画画在 padding 以内。在 SwiftUI 中，要先调用 LoaderKit 的修饰符（`color`、`speed` 等），再调用 `frame` 这类 SwiftUI 修饰符。

修改颜色或尺寸不会让动画重新开始。
