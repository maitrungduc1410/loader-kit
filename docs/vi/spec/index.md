---
description: "Tự làm indicator LoaderKit đầu tiên từng bước: một spec JSON gồm layout, shape và các track keyframe, có preview trực tiếp ở mỗi bước."
---

# Indicator tùy chỉnh

Indicator tùy chỉnh là một spec JSON do bạn tự viết. Mọi engine của LoaderKit đều đọc và vẽ nó bằng native, không cần viết thêm code native nào. Trang này dựng một indicator từng bước. Mỗi bước có spec đầy đủ và một preview trực tiếp. Kéo thanh trượt dưới preview để tua qua một chu kỳ.

::: warning Thử nghiệm
Tự viết spec vẫn đang ở giai đoạn thử nghiệm. Cho đến khi schema được công bố là ổn định, một bản minor release vẫn có thể thay đổi schema version 1. Indicator có sẵn và params của chúng không bị ảnh hưởng.
:::

## Khái niệm {#concepts}

| Thuật ngữ | Ý nghĩa |
| --- | --- |
| **Box** | Hình vuông mà indicator được vẽ bên trong. Cạnh của nó bằng cạnh ngắn hơn của view. Mọi độ dài đều là tỉ lệ so với cạnh này, từ 0 đến 1. Gốc tọa độ ở góc trên bên trái và trục y hướng xuống. |
| **Layout** | Đặt các phần tử vào box: `single`, `stack`, `row`, `grid` hoặc `ring`. Xem [Layout](/vi/spec/layouts). |
| **Shape** | Hình mà mỗi phần tử vẽ: `circle`, `rect`, `ring`, `triangle` hoặc `line`. Xem [Shape](/vi/spec/shapes). |
| **Track** | Cách một thuộc tính (scale, opacity, rotate, ...) thay đổi trong một chu kỳ, bằng các keyframe. Xem [Track](/vi/spec/tracks). |
| **Chu kỳ** | Một vòng lặp của animation. `duration` là độ dài của nó, tính bằng giây. |
| **Stagger** | Độ trễ khi bắt đầu của từng phần tử, để các phần tử chuyển động lần lượt. Xem [Timing](/vi/spec/timing). |
| **Params** | Các con số có tên mà người dùng có thể override, ví dụ `count`. Xem [Params](/vi/spec/params). |

Góc tính bằng **radian** (một vòng tròn là 6.283185307) và góc dương thì quay theo chiều kim đồng hồ. Thời gian tính bằng giây.

## Bước 1: một chấm nhấp nháy {#step-1-one-dot-that-pulses}

Spec nhỏ nhất mà dùng được gồm một tên, một duration, một layout, một shape và một track.

<<< @/examples/first-dot.json

<SpecExample id="first-dot" />

Ý nghĩa từng field:

- `schemaVersion` hiện luôn là `1`.
- `duration: 1` nghĩa là một chu kỳ kéo dài 1 giây.
- `layout` là `single`: một phần tử ở giữa box. `size: 0.5` cho nó bằng nửa box.
- `shape` là `circle`: phần tử vẽ một hình tròn đặc.
- Track animate `scale`. Đầu chu kỳ (`keyTimes` 0) scale là 1, giữa chu kỳ (0.5) là 0.4, cuối chu kỳ (1) lại là 1. Giữa hai keyframe, giá trị thay đổi tuyến tính.

Dòng `$schema` là tùy chọn. Nó giúp editor kiểm tra file và gợi ý field. Xem [JSON Schema](/vi/tools/json-schema).

## Bước 2: ba chấm thành một hàng {#step-2-three-dots-in-a-row}

Đổi layout thành `row` gồm 3 phần tử, khoảng cách giữa chúng là 0.1. Hàng này lấp đầy chiều ngang của box, nên mỗi chấm rộng `(1 - 2 × 0.1) / 3`.

<<< @/examples/first-row.json

<SpecExample id="first-row" />

Track áp dụng cho mọi phần tử, nên ba chấm nhấp nháy cùng lúc.

## Bước 3: lần lượt từng chấm {#step-3-one-after-another}

`stagger` làm trễ từng phần tử. Với `{ "each": 0.15 }`, phần tử 0 bắt đầu ở giây 0, phần tử 1 ở giây 0.15 và phần tử 2 ở giây 0.3.

<<< @/examples/first-stagger.json

<SpecExample id="first-stagger" />

Trước khi bắt đầu, phần tử hiển thị **rest value** của nó (scale 1, opacity 1). Xem [Rest value](/vi/spec/timing#rest-values).

## Bước 4: chuyển động mượt hơn {#step-4-smoother-motion}

Thêm `easing` để chuyển động chậm lại gần mỗi keyframe, và thêm một track thứ hai để các chấm mờ đi khi thu nhỏ. Trong một danh sách track, mỗi thuộc tính chỉ được animate tối đa một lần.

<<< @/examples/first-easing.json

<SpecExample id="first-easing" />

<TrackTimeline example="first-easing" />

Timeline vẽ giá trị của một track trong một chu kỳ cho từng phần tử. Khoảng lệch giữa các đường cong chính là stagger.

## Bước 5: cho người dùng tùy chỉnh {#step-5-let-users-change-it}

Khai báo `params` kèm giá trị mặc định, rồi dùng `{ "$param": "name" }` thay cho một con số. Giờ người dùng có thể yêu cầu 5 chấm, hay nhịp pulse sâu hơn, mà không cần spec mới.

<<< @/examples/first-params.json

<SpecExample id="first-params" />

## Dùng trong app {#use-it-in-an-app}

Load file JSON bằng engine của nền tảng bạn dùng. Xem [Dùng spec](/vi/spec/using) cho từng nền tảng.

::: code-group

```html [HTML]
<loader-kit id="dots" params='{"count": 5}'></loader-kit>
<script type="module">
  import '@loader-kit/web/element';
  document.querySelector('#dots').spec = await (await fetch('/first-params.json')).json();
</script>
```

```kotlin [Kotlin (View)]
loader.spec = IndicatorSpec.parse(json)
loader.params = mapOf("count" to 5.0)
```

```swift [Swift (UIKit)]
loader.spec = try IndicatorSpec(json: json)
loader.params = ["count": 5]
```

```csharp [C#]
indicator.Spec = json;
indicator.Params = new Dictionary<string, double> { ["count"] = 5 };
```

:::

## Viết bằng TypeScript {#write-it-in-typescript}

Bạn cũng có thể viết spec bằng TypeScript với `@loader-kit/spec`. `defineIndicator()` kiểm tra spec lúc chạy và tự điền `schemaVersion`, còn `param()` tạo ra một tham chiếu `$param`. Serialize kết quả là có JSON mà mọi engine đọc được.

```sh
npm install @loader-kit/spec
```

```ts
import { defineIndicator, param } from '@loader-kit/spec';

export const Blink = defineIndicator({
  name: 'Blink',
  duration: 0.9,
  params: { count: 4, low: 0.15 },
  layout: { type: 'row', count: param('count'), gap: 0.08 },
  shape: { type: 'rect', cornerRadius: 0.25 },
  stagger: { each: 0.15 },
  tracks: [
    { property: 'opacity', keyTimes: [0, 0.5, 1], values: [1, param('low'), 1], easing: 'easeInOut' },
  ],
});

console.log(JSON.stringify(Blink));
```

`defineIndicator()` throw `InvalidIndicatorError` liệt kê mọi lỗi. 50 indicator có sẵn đều được viết theo cách này.

## Đọc tiếp {#where-to-next}

- [Layout](/vi/spec/layouts): hàng, lưới, vòng tròn và chồng.
- [Shape](/vi/spec/shapes): hình tròn, cung, ring, hình chữ nhật, tam giác và line.
- [Track](/vi/spec/tracks): keyframe và easing chi tiết.
- [Timing](/vi/spec/timing): stagger, duration, part, group track và 3D.
- [Params](/vi/spec/params): giúp spec tùy chỉnh được.
- [Playground](/vi/tools/playground): sửa spec với preview trực tiếp và validate.
- [Bản đặc tả](/vi/spec/reference): các quy tắc chuẩn cho từng field.
