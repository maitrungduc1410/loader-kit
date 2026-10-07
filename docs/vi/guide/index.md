---
description: "LoaderKit là gì: loading indicator viết dưới dạng spec JSON, được engine native trên từng nền tảng vẽ ra; các phần ghép với nhau thế nào và phần nào đã ổn định."
---

# LoaderKit là gì?

LoaderKit là bộ loading indicator cho Android, iOS, macOS, Windows và web. Mỗi indicator là một file JSON nhỏ, gọi là **spec**. Trên mỗi nền tảng có một engine native đọc spec đó và vẽ bằng chính hệ thống đồ họa của nền tảng.

Bạn có hai cách dùng:

- **Indicator có sẵn.** Chọn một trong [33 indicator](/vi/guide/indicators) theo tên, ví dụ `BallPulse` hay `LineSpinFadeLoader`. Đặt màu, kích thước, tốc độ, và với một số indicator thì thêm params như `count`.
- **Indicator tùy chỉnh.** Tự viết spec: các phần tử đặt trong một box, một shape, và các track keyframe để animate chúng. Engine nào cũng vẽ được, không cần viết thêm code native. Xem [Indicator tùy chỉnh](/vi/spec/).

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: center; margin: 16px 0;">
  <LoaderKitPreview indicator="BallPulse" />
  <LoaderKitPreview indicator="LineScalePulseOut" />
  <LoaderKitPreview indicator="BallScaleRippleMultiple" />
  <LoaderKitPreview indicator="CubeTransition" />
</div>

## Một spec, nhiều engine {#one-spec-many-engines}

Spec mô tả indicator dưới dạng dữ liệu:

- **layout** đặt các phần tử vào một unit box (một phần tử, một hàng, một lưới, một vòng tròn, một chồng);
- **shape** cho biết mỗi phần tử vẽ hình gì (circle, rect, ring, triangle, line);
- **track** cho biết các thuộc tính của phần tử (scale, opacity, rotation, translation, stroke trim) thay đổi thế nào trong một chu kỳ.

```json
{
  "schemaVersion": 1,
  "name": "Blink",
  "duration": 1,
  "layout": { "type": "row", "count": 3, "gap": 0.1 },
  "shape": { "type": "circle" },
  "stagger": { "each": 0.2 },
  "tracks": [{ "property": "opacity", "keyTimes": [0, 0.5, 1], "values": [1, 0.2, 1] }]
}
```

Các indicator có sẵn cũng là spec. Chúng được đóng gói sẵn trong mọi engine, nên bạn chỉ cần gọi tên.

| Nền tảng | Engine | Package |
| --- | --- | --- |
| Android | `Canvas`, kèm một `View` và một composable Jetpack Compose | `io.github.maitrungduc1410:loaderkit-core`, `loaderkit-compose` |
| iOS, macOS | Core Animation, kèm view cho UIKit, AppKit và SwiftUI | `LoaderKit` (Swift Package Manager, CocoaPods) |
| Windows | `Microsoft.UI.Composition`, kèm một control WinUI 3 | `LoaderKit.WinUI`, `LoaderKit.Core` (NuGet) |
| Web | `<canvas>`, kèm component cho React, Vue và Svelte, custom element `<loader-kit>` và một class | `@loader-kit/web` (npm) |
| React Native | engine Android và iOS | [`react-native-loader-kit`](/vi/platforms/react-native) (npm) |
| Công cụ | schema, validator, reference evaluator | `@loader-kit/spec` (npm) |

## Vì sao chuyển động khớp nhau {#why-the-motion-matches}

Mọi engine đều tuân theo một tài liệu duy nhất là [bản đặc tả](/vi/spec/reference). Tài liệu này định nghĩa đơn vị, layout, shape, cách lấy mẫu track, thuật toán easing, thứ tự các phép transform và các quy tắc playback.

Có một bộ test conformance dùng chung để kiểm chứng điều đó. Repo sinh ra các test vector từ một reference evaluator viết bằng TypeScript: tại nhiều thời điểm, nó ghi lại vị trí, kích thước, scale, opacity và rotation mong đợi của từng phần tử. Engine Android, Apple, Windows và web load cùng bộ vector này trong unit test và so sánh từng con số. Nhờ vậy `BallPulse` ở giây thứ 0.3 là cùng một frame trên mọi nền tảng.

## Trạng thái {#status}

| Thành phần | Trạng thái |
| --- | --- |
| Indicator có sẵn, tên và params của chúng | **Ổn định** |
| View, composable, control và các thuộc tính | **Ổn định** |
| Tự viết spec (schema version 1) | **Thử nghiệm** |

::: warning Spec tùy chỉnh vẫn đang thử nghiệm
Cho đến khi schema được công bố là ổn định, một bản minor release vẫn có thể thay đổi nó. Indicator có sẵn và params của chúng không bị ảnh hưởng, vì engine nào cũng đóng gói sẵn đúng bộ spec có sẵn tương ứng.
:::

Mọi package dùng chung một số phiên bản, và tag release có dạng `1.0.0` (không có tiền tố `v`).

## Tiếp theo {#next-steps}

- [Bắt đầu](/vi/guide/getting-started): cài đặt và hiển thị indicator đầu tiên.
- [Indicator có sẵn](/vi/guide/indicators): xem và tinh chỉnh 33 indicator có sẵn.
- [Indicator tùy chỉnh](/vi/spec/): dựng một spec từng bước, có preview trực tiếp.
