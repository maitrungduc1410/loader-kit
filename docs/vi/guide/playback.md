---
description: "Điều khiển animation của LoaderKit: tốc độ, start và stop, ẩn khi dừng, freeze một frame bằng cycleProgress và tôn trọng thiết lập reduce motion."
---

# Điều khiển animation

Các quy tắc playback giống nhau trên mọi nền tảng. Đây là trạng thái của view, không nằm trong spec của indicator. Bạn thử luôn ở đây:

<PlaybackDemo />

## Tên thuộc tính {#property-names}

| Khái niệm | Web | Android View | Compose | iOS, macOS | Windows |
| --- | --- | --- | --- | --- | --- |
| Tốc độ | `speed` | `speed` | `speed` | `speed`, `.speed()` | `Speed` |
| Start và stop | `animating`, `start()`, `stop()` | `isAnimating`, `start()`, `stop()` | `animating` | `isAnimating`, `startAnimating()`, `stopAnimating()`, `.animating()` | `IsAnimating` |
| Ẩn khi dừng | `hidesWhenStopped` | `hidesWhenStopped` | không có | `hidesWhenStopped`, `.hidesWhenStopped()` | `HidesWhenStopped` |
| Freeze một frame | `cycleProgress` | `cycleProgress` | `cycleProgress` | `cycleProgress`, `.cycleProgress()` | `CycleProgress` |
| Reduce motion | `respectsReduceMotion` | `respectsReduceMotion` | `respectsReduceMotion` | `respectsReduceMotion`, `.respectsReduceMotion()` | `RespectsReduceMotion` |

Với phần tử `<loader-kit>`, các attribute tương ứng là `speed`, `animating`, `hides-when-stopped`, `cycle-progress` và `respects-reduce-motion`.

## Tốc độ {#speed}

`speed` là tốc độ phát. Mặc định là 1, tức đúng tốc độ của spec. 2 là nhanh gấp đôi, 0.5 là chậm một nửa. Speed bằng 0 hoặc nhỏ hơn sẽ tạm dừng indicator.

Đổi speed không bao giờ làm animation bị giật. Engine giữ một đồng hồ riêng và chỉ thay đổi tốc độ chạy của đồng hồ đó.

::: code-group

```html [HTML]
<loader-kit indicator="SquareSpin" speed="0.5"></loader-kit>
```

```kotlin [Kotlin (View)]
loader.speed = 0.5
```

```kotlin [Compose]
LoaderKitIndicator("SquareSpin", speed = 0.5)
```

```swift [SwiftUI]
LoaderKitIndicator("SquareSpin").speed(0.5)
```

```xml [XAML]
<lk:LoaderKitIndicator Indicator="SquareSpin" Speed="0.5" />
```

:::

## Start và stop {#start-and-stop}

Stop sẽ giữ nguyên frame hiện tại. Start lại thì chạy tiếp từ frame đó, không quay về đầu.

Với `hidesWhenStopped` (mặc định là true, giống `UIActivityIndicatorView`), indicator đã dừng sẽ không vẽ gì. Đặt nó thành false nếu muốn frame đang đứng yên vẫn hiển thị.

::: code-group

```html [HTML]
<loader-kit indicator="BallPulse" animating="false" hides-when-stopped="false"></loader-kit>
```

```ts [TypeScript]
view.hidesWhenStopped = false;
view.stop();
view.start();
```

```kotlin [Kotlin (View)]
loader.hidesWhenStopped = false
loader.stop()
loader.start()
```

```kotlin [Compose]
// Compose không có hidesWhenStopped: hãy hiện hoặc bỏ composable đi.
if (isLoading) LoaderKitIndicator("BallPulse")
```

```swift [SwiftUI]
LoaderKitIndicator("BallPulse")
    .animating(isLoading)
    .hidesWhenStopped(false)
```

```xml [XAML]
<lk:LoaderKitIndicator IsAnimating="{x:Bind ViewModel.IsBusy, Mode=OneWay}" HidesWhenStopped="False" />
```

:::

## Freeze một frame bằng cycleProgress {#cycle-progress}

`cycleProgress` vẽ một frame tĩnh tại một điểm trong chu kỳ animation, từ 0 đến 1. Dùng nó cho screenshot test, preview và review thiết kế. Đặt lại về null (`nil` trong Swift) thì đồng hồ chạy tiếp từ chỗ cũ.

::: warning Đây không phải progress bar
`cycleProgress` không thể hiện công việc đã xong bao nhiêu. 0.5 là điểm giữa của một vòng animation. Indicator không "đầy dần" khi giá trị đi từ 0 lên 1. Muốn thể hiện tiến độ, hãy dùng [progress indicator](/vi/guide/progress).
:::

Engine sẽ bỏ qua các chu kỳ trọn vẹn cho đến khi mọi phần tử đều đã bắt đầu. Vì vậy trong một frame bị freeze, không có phần tử nào còn đang chờ hết thời gian trễ [stagger](/vi/spec/timing#stagger).

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: center; margin: 16px 0;">
  <LoaderKitPreview indicator="BallPulse" :cycle-progress="0" />
  <LoaderKitPreview indicator="BallPulse" :cycle-progress="0.25" />
  <LoaderKitPreview indicator="BallPulse" :cycle-progress="0.5" />
  <LoaderKitPreview indicator="BallPulse" :cycle-progress="0.75" />
</div>

::: code-group

```html [HTML]
<loader-kit indicator="BallPulse" cycle-progress="0.25"></loader-kit>
```

```kotlin [Kotlin (View)]
loader.cycleProgress = 0.25   // null để chạy tiếp. Trong XML: app:cycleProgress="0.25"
```

```kotlin [Compose]
LoaderKitIndicator("BallPulse", cycleProgress = 0.25)
```

```swift [SwiftUI]
LoaderKitIndicator("BallPulse").cycleProgress(0.25)
```

```csharp [C#]
indicator.CycleProgress = 0.25;
indicator.CycleProgress = null;   // đồng hồ chạy tiếp từ chỗ cũ
```

:::

## Reduce motion {#reduced-motion}

Khi người dùng bật giảm chuyển động trong hệ thống, LoaderKit sẽ vẽ một frame tĩnh (frame tại `cycleProgress` 0) thay vì chạy animation. Tính năng này bật sẵn. Chỉ đặt `respectsReduceMotion` thành false khi animation mang ý nghĩa mà người dùng thực sự cần thấy.

| Nền tảng | Thiết lập hệ thống |
| --- | --- |
| Web | media query `prefers-reduced-motion: reduce` |
| Android | tắt animation (Accessibility > Remove animations, hoặc animator duration scale bằng 0) |
| iOS | Settings > Accessibility > Motion > Reduce Motion |
| macOS | System Settings > Accessibility > Display > Reduce motion |
| Windows | Settings > Accessibility > Visual effects > tắt Animation effects |

## Khi nào animation chạy lại từ đầu {#what-restarts-the-animation}

| Thay đổi | Kết quả |
| --- | --- |
| Tên indicator, spec hoặc params | đồng hồ quay về 0 |
| Color, colors, speed, kích thước | không chạy lại |
| Stop rồi start | chạy tiếp từ frame đang đứng yên |
| Đặt rồi xóa `cycleProgress` | chạy tiếp từ chỗ đồng hồ đang dừng |

Trên Android, đồng hồ cũng tạm dừng khi view bị detach hoặc bị ẩn. Trên iOS và các nền tảng UIKit khác, animation chạy tiếp khi app quay lại foreground hoặc khi view được chuyển sang window mới. Trên macOS, animation chạy tiếp khi view được chuyển sang window mới.

## Tái sử dụng view {#reusing-a-view}

View native có thể được tái sử dụng trong list. `reset()` đưa mọi thuộc tính về mặc định và chạy lại animation từ đầu:

::: code-group

```kotlin [Kotlin (View)]
loader.reset()
```

```swift [Swift (UIKit)]
loader.reset()
```

:::
