---
description: "LoaderKitProgress: 30 mẫu progress (linear, circular, pie, gauge, liquid, border, bars, grid, battery), có value hoặc vô định, đổi value mượt trên web, Android, iOS, macOS và Windows."
---

# Progress indicator

`LoaderKitProgress` cho biết một tác vụ đã chạy được bao nhiêu. Có 9 type và 30 mẫu, mẫu nào cũng chạy được khi có value, hoặc ở chế độ vô định khi chưa biết value. Khi value thay đổi, indicator chạy mượt tới value mới.

<ProgressGallery />

Progress indicator không dùng spec JSON. Mỗi type được vẽ từ cùng một bộ hình học trên mọi nền tảng: một bản cài đặt tham chiếu biến option và trạng thái animation thành các lệnh vẽ, và mỗi nền tảng chạy cùng bộ test vector trên bản port của mình. Nhờ vậy một mẫu trông và chuyển động giống nhau trên web, Android, iOS, macOS và Windows.

## Bắt đầu nhanh {#quick-start}

::: code-group

```html [HTML]
<script type="module">
  import '@loader-kit/web/progress-element';
</script>

<!-- Circular vô định, 48 × 48 -->
<loader-kit-progress></loader-kit-progress>

<loader-kit-progress type="linear" value="0.4"></loader-kit-progress>
<loader-kit-progress type="gauge" value="0.7" show-label size="64"></loader-kit-progress>
```

```tsx [React]
import { LoaderKitProgress } from '@loader-kit/web/react';

<LoaderKitProgress type="linear" value={progress} />
<LoaderKitProgress value={done ? 1 : null} />
```

```vue [Vue]
<script setup lang="ts">
import { LoaderKitProgress } from '@loader-kit/web/vue';
</script>

<template>
  <LoaderKitProgress type="linear" :value="progress" />
</template>
```

```svelte [Svelte]
<script>
  import { LoaderKitProgress } from '@loader-kit/web/svelte';
</script>

<LoaderKitProgress type="linear" value={progress} />
```

```xml [Android XML]
<io.github.maitrungduc1410.loaderkit.LoaderKitProgressView
    android:id="@+id/progress"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    app:progressType="linear"
    app:progressValue="0.4" />
```

```kotlin [Compose]
LoaderKitProgress(
    value = progress,
    modifier = Modifier.fillMaxWidth(),
    type = ProgressType.Linear,
)
```

```swift [UIKit]
let progress = LoaderKitProgressView(value: 0.4, type: .linear)
progress.value = 0.8   // chạy mượt tới 0.8
```

```swift [SwiftUI]
LoaderKitProgress(value: progress, type: .linear)
```

```xml [XAML]
<lk:LoaderKitProgress Type="Linear" Value="{x:Bind ViewModel.Progress, Mode=OneWay}" />
```

:::

## Value {#value}

`value` đi từ 0 đến 1, value nằm ngoài khoảng này sẽ bị kẹp lại. `null` (`nil` trong Swift) hoặc NaN hiển thị animation vô định, nên cùng một view dùng được cho cả "chưa biết" lẫn "đã xong 40%":

::: code-group

```ts [TypeScript]
const view = new LoaderKitProgressView(host, { type: 'linear' });  // vô định
view.value = 0.25;
view.value = null;   // quay lại vô định
```

```kotlin [Kotlin (View)]
progress.value = 0.25
progress.value = null
```

```swift [Swift (UIKit)]
progress.value = 0.25
progress.value = nil
```

```csharp [C#]
progress.Value = 0.25;
progress.Value = null;
```

:::

`buffer` thêm một thanh thứ hai nhạt hơn, chạy trước value, cho linear `flat` và `wavy`, giống phần video đã tải.

## Đổi value mượt {#smooth}

`smooth` bật mặc định. Value mới không nhảy cóc: indicator chạy mượt tới đó, và nhãn phần trăm đếm theo. Cách chạy tự khớp với nhịp cập nhật:

- Một chuỗi cập nhật dày, như các gói dữ liệu của một lượt tải file, chạy đều thay vì dừng lại ở từng lần.
- Một lần cập nhật riêng lẻ chạy trong nửa giây và chậm dần ở cuối.
- Đi lùi, ví dụ về 0, mất 0.4 giây.
- Value được vẽ không bao giờ vượt value thật, và không bao giờ đi lùi khi value đang tăng.

Trình đọc màn hình luôn đọc value thật, không phải value đang vẽ. Tắt `smooth` để vẽ đúng từng value ngay khi nhận:

::: code-group

```html [HTML]
<loader-kit-progress type="linear" value="0.4" smooth="false"></loader-kit-progress>
```

```tsx [React]
<LoaderKitProgress type="linear" value={progress} smooth={false} />
```

```kotlin [Compose]
LoaderKitProgress(value = progress, type = ProgressType.Linear, smooth = false)
```

```swift [SwiftUI]
LoaderKitProgress(value: progress, type: .linear).smooth(false)
```

```xml [XAML]
<lk:LoaderKitProgress Type="Linear" Value="{x:Bind ViewModel.Progress, Mode=OneWay}" Smooth="False" />
```

:::

## Type và variant {#types-and-variants}

`type` chọn hình dạng, `variant` chọn kiểu. Variant mà type không có sẽ quay về variant đầu tiên trong danh sách của type đó.

| Type | Variant | Kích thước khi layout không ràng buộc |
| --- | --- | --- |
| `linear` | `flat`, `wavy`, `segmented`, `striped`, `shimmer`, `glow`, `dots`, `steps` | rộng hết chiều ngang; chiều cao theo thickness |
| `circular` (mặc định) | `flat`, `wavy`, `segmented`, `gradient`, `ticks`, `dots` | `size` × `size` |
| `pie` | `flat` | `size` × `size` |
| `gauge` | `flat`, `segmented` | `size` × `size` |
| `liquid` | `flat` | `size` × `size` |
| `border` | `flat` | bọc quanh nội dung |
| `bars` | `flat` | `size` × 0.75 `size` |
| `grid` | `flat` | `size` × `size` |
| `battery` | `flat` | `size` × 0.5 `size` |

`size` là một số pixel (dp trên Android, point trên Apple), mặc định là 48; khác với `LoaderKit`, nó không nhận độ dài CSS. Dưới 32, circular `wavy` vẽ phẳng, vì ở kích thước đó sóng không còn nhìn rõ.

Một số mẫu vẫn chuyển động khi value đứng yên: sóng của `wavy` và `liquid`, sọc của `striped` và vệt sáng của `shimmer`.

## Option {#options}

| Option | Mặc định | Tác dụng |
| --- | --- | --- |
| `thickness` | tùy type và variant | độ dày của nét và thanh |
| `trackGap` | 4 | khoảng cách giữa progress và track, hoặc giữa các đoạn |
| `segments` | tùy type và variant | số đoạn, chấm, vạch, bước, cột hoặc số cột của grid |
| `showLabel` | false | phần trăm, bên trong hoặc cạnh indicator |
| `stopIndicator` | true | chấm ở cuối track của linear `flat` và `wavy` |
| `strokeCap` | `round` | đầu nét: `round` hoặc `butt` |
| `amplitude`, `wavelength`, `waveSpeed` | 3, 40, 1 cho linear; 2, 15, 1 cho circular | sóng của `wavy` |
| `sweepAngle` | 270 | cung của `gauge`, tính bằng độ, từ 30 đến 350 |
| `cornerRadius` | 12 | bo góc của `border` |
| `speed` | 1 | tốc độ của animation vô định; 0 hoặc nhỏ hơn thì tạm dừng |
| `color` | màu accent; trên web là CSS `color` | phần progress |
| `trackColor` | `color` với độ mờ 24% | track |
| `labelColor` | màu chữ; trên web là CSS `color` | nhãn phần trăm |
| `respectsReduceMotion` | true | xem [Reduce motion](#reduced-motion) |

Độ dài tính bằng CSS px trên web, dp trên Android, point trên các nền tảng Apple và effective pixel trên Windows.

### Tên trên từng nền tảng {#names-on-each-platform}

| Khái niệm | `<loader-kit-progress>` | React, Vue, Svelte, Android, Compose, Swift | Windows |
| --- | --- | --- | --- |
| Value | `value` | `value` | `Value` |
| Đổi value mượt | `smooth` | `smooth` | `Smooth` |
| Option | `track-gap`, `show-label`, `stop-indicator`, `stroke-cap`, `wave-speed`, `sweep-angle`, `corner-radius` | `trackGap`, `showLabel`, `stopIndicator`, `strokeCap`, `waveSpeed`, `sweepAngle`, `cornerRadius` | `TrackGap`, `ShowLabel`, `StopIndicator`, `StrokeCap`, `WaveSpeed`, `SweepAngle`, `ProgressCornerRadius` |
| Màu | `color`, `track-color`, `label-color` | `color`, `trackColor`, `labelColor` | `Color`, `TrackColor`, `LabelColor` |

Với SwiftUI, mỗi option là một modifier (`.thickness(6)`, `.showLabel()`). Trong Android XML, mỗi option là `app:progress` cộng với tên của nó (`app:progressType`, `app:progressValue`, `app:progressShowLabel`, `app:progressSweepAngle`, `app:progressRespectsReduceMotion`, ...), trừ tốc độ là `app:speed`, giống `LoaderKitView`. Trên Windows, mọi control đã có sẵn thuộc tính `CornerRadius`, nên option này tên là `ProgressCornerRadius`.

## Nội dung bên trong {#content}

Progress indicator có thể chứa nội dung: ở giữa `circular`, `pie`, `gauge` và các type vuông khác, hoặc bên trong nét viền của `border`, khi đó viền giãn ra để bọc nội dung.

::: code-group

```html [HTML]
<loader-kit-progress value="0.3">
  <button aria-label="Stop">■</button>
</loader-kit-progress>

<loader-kit-progress type="border">
  <button>Upload</button>
</loader-kit-progress>
```

```kotlin [Compose]
LoaderKitProgress(value = progress) {
    IconButton(onClick = cancel) { Icon(Icons.Filled.Stop, contentDescription = "Stop") }
}
```

```swift [SwiftUI]
LoaderKitProgress(value: progress, type: .border) {
    Button("Upload", action: upload)
}
```

```xml [XAML]
<lk:LoaderKitProgress Type="Border">
    <Button Content="Upload" Click="OnUpload" />
</lk:LoaderKitProgress>
```

:::

View Android là một `ViewGroup`: thêm view con trong XML hoặc bằng `addView`. Với UIKit và AppKit, thêm subview vào `contentView`.

## Accessibility {#accessibility}

Mọi nền tảng đều coi indicator là một progress bar, với value là phần trăm từ 0 đến 100, và không có value khi vô định. Trên web, các nền tảng Apple và Windows, tên mặc định cho trình đọc màn hình là "Loading"; Android đọc là progress bar kèm phần trăm. Hãy nói rõ cái gì đang tải bằng `aria-label` (`accessibilityLabel` trong component React, Vue và Svelte), `contentDescription` trên Android và Compose, `accessibilityLabel` trên các nền tảng Apple hoặc `AutomationProperties.Name` trên Windows.

## Reduce motion {#reduced-motion}

Khi hệ thống yêu cầu giảm chuyển động, value nhảy thẳng thay vì chạy mượt, sóng, sọc và vệt sáng dừng lại, còn animation vô định chạy với nửa tốc độ để người dùng vẫn thấy tác vụ đang chạy. Xem [Điều khiển animation](/vi/guide/playback#reduced-motion) để biết thiết lập hệ thống trên từng nền tảng. Đặt `respectsReduceMotion` thành false để giữ đầy đủ chuyển động.
