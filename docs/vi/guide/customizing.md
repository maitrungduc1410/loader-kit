---
description: "Tùy chỉnh indicator LoaderKit: override params như count, đặt một màu chung hoặc mỗi phần tử một màu, và chỉnh kích thước view trên mọi nền tảng."
---

# Tùy chỉnh

Indicator nào cũng nhận cùng bốn loại thiết lập: **params**, **color**, **colors** và **kích thước**. Bạn thử ngay bên dưới rồi copy code cho nền tảng của mình.

<IndicatorDemo indicator="BallPulse" />

## Params {#params}

Một số indicator khai báo params: các con số có tên và có giá trị mặc định. `BallPulse` có `count` (3) và `minScale` (0.3). Bạn chỉ cần truyền những giá trị muốn đổi, phần còn lại giữ mặc định.

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

Các quy tắc áp dụng trên mọi nền tảng:

- Tên param mà indicator không khai báo sẽ bị bỏ qua. Bạn có thể đổi indicator mà vẫn giữ nguyên params.
- Các giá trị đếm (count) được làm tròn tới số nguyên gần nhất và tối thiểu là 1.
- Giá trị params không bị kiểm tra phạm vi. Hãy giữ kích thước, count và độ dày nét luôn dương: spec không quy định engine sẽ vẽ gì với giá trị nằm ngoài phạm vi.
- Đổi params sẽ chạy lại animation từ đầu chu kỳ.

Danh sách params xem ở [Indicator có sẵn](/vi/guide/indicators#the-params), còn cách khai báo params trong spec của riêng bạn xem ở [Params](/vi/spec/params).

## Color {#color}

Một màu duy nhất tô cho mọi phần tử. Các track opacity sẽ nhân vào kênh alpha của màu này.

::: code-group

```html [HTML]
<loader-kit indicator="BallPulse" color="#10b981"></loader-kit>

<!-- Không có thuộc tính color thì indicator dùng CSS color của phần tử -->
<loader-kit indicator="BallPulse" style="color: var(--brand)"></loader-kit>
```

```ts [TypeScript]
view.color = '#10b981';   // màu CSS bất kỳ; null nghĩa là currentColor
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

Màu mặc định:

| Nền tảng | Mặc định |
| --- | --- |
| Web | CSS `color` của phần tử host (`currentColor`) |
| Android View | theme attribute `android:colorForeground` |
| Compose | đen, hoặc trắng khi hệ thống đang bật dark mode |
| iOS, macOS | `systemGray` |
| Windows | trắng |

Trên các nền tảng Apple, các dynamic system color như `.label` sẽ tự đổi theo giao diện sáng và tối.

## Colors {#colors}

`colors` cho mỗi phần tử một màu riêng. Phần tử `i` dùng `colors[i mod colors.length]`, nên danh sách ngắn sẽ được lặp lại. Khi `colors` được đặt và không rỗng, nó được ưu tiên hơn `color`.

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

::: tip Thứ tự phần tử
Phần tử được đánh số theo thứ tự vẽ. Với một hàng là từ trái sang phải, với lưới là lần lượt từng hàng, còn với vòng tròn thì bắt đầu từ bên phải và đi theo chiều kim đồng hồ. Nếu indicator có nhiều part, số thứ tự sẽ nối tiếp từ part này sang part sau.
:::

## Kích thước {#size}

Đặt kích thước view theo cách quen thuộc trên từng nền tảng. Indicator được vẽ trong hình vuông lớn nhất vừa với view, căn giữa, nên không bao giờ bị kéo giãn. Nếu không đặt kích thước, view có kích thước 40 x 40.

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

Trên Android, indicator được vẽ bên trong padding. Trong SwiftUI, hãy gọi các modifier của LoaderKit (`color`, `speed`, ...) trước các modifier của SwiftUI như `frame`.

Đổi màu hay kích thước không bao giờ làm animation chạy lại từ đầu.
