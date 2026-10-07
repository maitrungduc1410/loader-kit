---
description: "Customize a LoaderKit indicator: override params such as count, set one color or a color per element, and size the view on every platform."
---

# Customizing

Every indicator takes the same four kinds of settings: **params**, **color**, **colors** and **size**. Try them below, then copy the code for your platform.

<IndicatorDemo indicator="BallPulse" />

## Params {#params}

Some indicators declare params: named numbers with a default value. `BallPulse` has `count` (3) and `minScale` (0.3). Pass the values you want to change. The others keep their default.

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

Rules that apply on every platform:

- A param name the indicator does not declare is ignored. You can switch indicators and keep the same params.
- Counts are rounded to the nearest integer and are at least 1.
- Param values are not range-checked. Keep sizes, counts and stroke widths positive: what an engine draws for out-of-range values is not specified.
- Changing params restarts the animation from the beginning of its cycle.

See [Built-in indicators](/guide/indicators#the-params) for the list of params, and [Params](/spec/params) to declare params in your own spec.

## Color

One color paints every element. Opacity tracks multiply the alpha of this color.

::: code-group

```html [HTML]
<loader-kit indicator="BallPulse" color="#10b981"></loader-kit>

<!-- Without a color attribute, the indicator uses the CSS color of the element -->
<loader-kit indicator="BallPulse" style="color: var(--brand)"></loader-kit>
```

```ts [TypeScript]
view.color = '#10b981';   // any CSS color; null means currentColor
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

Default colors:

| Platform | Default |
| --- | --- |
| Web | the CSS `color` of the host element (`currentColor`) |
| Android View | the theme attribute `android:colorForeground` |
| Compose | black, or white when the system is in dark mode |
| iOS, macOS | `systemGray` |
| Windows | white |

On Apple platforms, dynamic system colors such as `.label` follow the light and dark appearance.

## Colors

`colors` gives each element its own color. Element `i` uses `colors[i mod colors.length]`, so a short list repeats. When `colors` is set and not empty, it wins over `color`.

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

::: tip Element order
Elements are numbered in drawing order. For a row it is left to right, for a grid it is row by row, and for a ring it starts on the right and goes clockwise. In an indicator with several parts, the numbering continues from one part to the next.
:::

## Size

Size the view the usual way on each platform. The indicator is drawn in the largest square that fits, centered in the view, so it never stretches. Without a size, the view is 40 by 40.

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

On Android, the indicator is drawn inside the padding. In SwiftUI, apply the LoaderKit modifiers (`color`, `speed`, ...) before SwiftUI modifiers such as `frame`.

Changing colors or size never restarts the animation.
