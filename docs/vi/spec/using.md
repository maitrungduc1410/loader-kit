---
description: "Load spec LoaderKit tùy chỉnh lúc runtime trên web, Android, iOS, macOS và Windows, validate spec, đọc thông báo lỗi và giữ trong giới hạn của engine."
---

# Dùng spec

Spec chỉ là JSON thuần. Bạn có thể đóng gói nó cùng app, tải về, hoặc dựng bằng code, rồi giao cho engine của nền tảng.

::: warning Thử nghiệm
Spec tùy chỉnh vẫn đang ở giai đoạn thử nghiệm. Cho đến khi schema được công bố là ổn định, một bản minor release vẫn có thể thay đổi nó. Indicator có sẵn không bị ảnh hưởng.
:::

## Load spec {#load-a-spec}

::: code-group

```ts [TypeScript]
import { LoaderKitView } from '@loader-kit/web';

const json = await (await fetch('/specs/typing-dots.json')).text();
const view = new LoaderKitView(host, {
  spec: json,                 // chuỗi JSON hoặc object
  params: { count: 4 },
  onError: (message) => message && console.warn(message),
});
```

```html [HTML]
<loader-kit id="dots"></loader-kit>
<script type="module">
  import '@loader-kit/web/element';
  const el = document.querySelector('#dots');
  el.addEventListener('loaderkit-error', (e) => e.detail.message && console.warn(e.detail.message));
  el.spec = await (await fetch('/specs/typing-dots.json')).json();
</script>
```

```kotlin [Kotlin (View)]
val json = context.assets.open("typing-dots.json").bufferedReader().use { it.readText() }

loader.onError = { error -> error.errors.forEach { Log.w("Loader", it) } }
loader.setSpecJson(json)
```

```kotlin [Compose]
val spec = remember(json) { IndicatorSpec.parse(json) }   // throw InvalidIndicatorSpecException
LoaderKitIndicator(spec = spec, modifier = Modifier.size(48.dp))
```

```swift [Swift (UIKit)]
let url = Bundle.main.url(forResource: "typing-dots", withExtension: "json")!
let json = try String(contentsOf: url, encoding: .utf8)

loader.specJSON = json
if let error = loader.specError { print(error.problems) }
```

```swift [SwiftUI]
let spec = try IndicatorSpec(json: json)   // throw IndicatorSpecError
LoaderKitIndicator(spec: spec).frame(width: 48, height: 48)
```

```csharp [C#]
indicator.SpecFailed += (_, error) =>
{
    foreach (var problem in error.Errors) Debug.WriteLine(problem);
};
indicator.Spec = File.ReadAllText("typing-dots.json");
```

:::

Trên mọi nền tảng, spec tùy chỉnh được ưu tiên hơn tên `indicator` có sẵn. Trên Android, Windows và web, xóa spec đi thì view quay lại dùng indicator. Trên các nền tảng Apple, `indicator`, `spec` và `specJSON` là cùng một thiết lập: gán `spec` sẽ thay thế `indicator`, còn xóa spec thì view không vẽ gì cả, nên muốn quay lại thì gán lại `indicator`.

## Validate trước khi ship {#validate-before-you-ship}

Mọi engine đều validate spec trước khi vẽ, với cùng một bộ quy tắc. Hãy kiểm tra spec sớm để lỗi không đến tay người dùng:

| Ở đâu | API | Kết quả |
| --- | --- | --- |
| JavaScript, Node, CI | `validate(spec)` từ `@loader-kit/spec` hoặc `@loader-kit/web` | `string[]`, rỗng khi hợp lệ |
| JavaScript | `prepare({ spec }, params)` từ `@loader-kit/web` | throw `InvalidIndicatorError` (kiểm tra cả params và giới hạn) |
| Android | `IndicatorSpec.validate(json)` / `IndicatorSpec.parse(json)` | `List<String>` / throw `InvalidIndicatorSpecException` |
| Apple | `IndicatorSpec.validate(json:)` / `IndicatorSpec(json:)` | `[String]` / throw `IndicatorSpecError` |
| Windows | `IndicatorSpec.TryParse(json, out spec, out errors)` / `IndicatorSpec.Parse(json)` | `bool` kèm lỗi / throw `InvalidIndicatorSpecException` |
| Editor | [JSON Schema](/vi/tools/json-schema) | gợi ý và gạch chân lỗi ngay khi gõ |
| Trình duyệt | [playground](/vi/tools/playground) | preview trực tiếp và mọi lỗi |

```ts
import { validate } from '@loader-kit/spec';
import spec from './typing-dots.json' with { type: 'json' };

const problems = validate(spec);
if (problems.length > 0) throw new Error(problems.join('\n'));
```

## Lỗi {#errors}

Thông báo lỗi ghi rõ field kèm đường dẫn, để bạn tìm ra nhanh:

```text
schemaVersion must be 1
duration must be a positive number
layout.count uses unknown param "cout"
tracks[0].values must have the same length as keyTimes
tracks[1].keyTimes must be non-decreasing
tracks[0].property "strokeEnd" needs a ring shape
parts[1].shape.sweep must be within (0, 2π]
tracks[0].easing needs one entry per segment (2)
the spec needs at least one track or group track
```

View không bao giờ crash vì spec lỗi. Nó không vẽ gì và báo lỗi:

| Nền tảng | Nơi báo lỗi |
| --- | --- |
| Web | `specError`, option `onError`, event `loaderkit-error` |
| Android View | `onError` (ghi log nếu không đặt) |
| Compose | `IndicatorSpec.parse` throw trước khi bạn gọi composable. Spec bị params làm cho không hợp lệ thì ghi một warning vào log |
| Apple | `specError` (`IndicatorSpecError.problems`) |
| Windows | `SpecError` và event `SpecFailed` |

Một số lỗi chỉ phát hiện được khi spec được prepare với params của người dùng, chứ `validate()` không bắt được:

- mảng `stagger` hoặc `durations` ngắn hơn số phần tử;
- các [giới hạn](#limits) bên dưới.

## Giới hạn {#limits}

Để khối lượng vẽ luôn có giới hạn, khi prepare, engine sẽ từ chối spec có:

- tổng cộng hơn 10 nghìn phần tử, hoặc
- hơn 10 nghìn cung ring (số phần tử × `segments`, cộng dồn qua các part có shape `ring`).

## Tương thích về sau {#forward-compatibility}

Field nào engine không biết thì bị bỏ qua, nhờ vậy một bản sửa đổi sau của schema version 1 có thể thêm các field tùy chọn. [JSON Schema](/vi/tools/json-schema) thì chặt hơn: nó đánh dấu các field lạ, vì trong spec viết tay chúng thường là lỗi gõ nhầm.

## Playback vẫn áp dụng {#playback-still-applies}

Spec tùy chỉnh dùng cùng các thiết lập [playback](/vi/guide/playback) như indicator có sẵn: speed, start và stop, `cycleProgress` và reduce motion. Đổi spec hoặc params của nó sẽ chạy lại animation từ đầu.
