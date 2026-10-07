---
description: "Dùng JSON Schema của LoaderKit để có gợi ý trong VS Code và IDE JetBrains, validate spec trong CI bằng ajv, và biết những gì chỉ validate() mới kiểm tra được."
---

# JSON Schema

LoaderKit publish một JSON Schema (draft-07) cho spec của indicator. Editor dùng nó để tự hoàn thành tên field, hiện tài liệu khi hover và đánh dấu lỗi ngay khi bạn gõ.

| | |
| --- | --- |
| URL công khai | `https://maitrungduc1410.github.io/loader-kit/schema/v1.json` |
| npm | `@loader-kit/spec/schema.json` |

## Thêm `$schema` vào spec {#add-schema-to-a-spec}

Cách đơn giản nhất chạy được trên hầu hết editor mà không cần cấu hình. Thêm field `$schema` ở đầu file:

```json
{
  "$schema": "https://maitrungduc1410.github.io/loader-kit/schema/v1.json",
  "schemaVersion": 1,
  "name": "Blink",
  "duration": 1,
  "layout": { "type": "row", "count": 3, "gap": 0.1 },
  "shape": { "type": "circle" },
  "tracks": [{ "property": "opacity", "keyTimes": [0, 0.5, 1], "values": [1, 0.2, 1] }]
}
```

Engine bỏ qua `$schema`, nên bạn cứ ship file nguyên như vậy.

## VS Code {#vs-code}

Chỉ cần `$schema` là đủ. Muốn áp schema cho các file không có dòng này, hãy map pattern tên file trong settings (`.vscode/settings.json` cho một project):

```json
{
  "json.schemas": [
    {
      "fileMatch": ["**/loaders/*.json", "*.loaderkit.json"],
      "url": "https://maitrungduc1410.github.io/loader-kit/schema/v1.json"
    }
  ]
}
```

Muốn làm việc offline thì trỏ `url` tới bản copy trong `node_modules`:

```json
{
  "json.schemas": [
    {
      "fileMatch": ["**/loaders/*.json"],
      "url": "./node_modules/@loader-kit/spec/schema.json"
    }
  ]
}
```

## IDE JetBrains {#jetbrains-ides}

IntelliJ IDEA, WebStorm, Android Studio và Rider cũng đọc `$schema`. Để map các file không có dòng này:

1. Mở **Settings** > **Languages & Frameworks** > **Schemas and DTDs** > **JSON Schema Mappings**.
2. Bấm **+** và đặt tên mapping là "LoaderKit".
3. Đặt **Schema file or URL** là `https://maitrungduc1410.github.io/loader-kit/schema/v1.json`.
4. Đặt **Schema version** là **JSON Schema version 7**.
5. Thêm một pattern đường dẫn file, ví dụ `loaders/*.json`.

## Validate trong CI {#validate-in-ci}

Chạy hai bước kiểm tra cho mọi spec trong repo của bạn: JSON Schema với [ajv](https://ajv.js.org/), và `validate()` từ `@loader-kit/spec` cho các quy tắc mà schema không diễn đạt được.

```sh
npm install --save-dev @loader-kit/spec ajv
```

```js
// scripts/check-loaders.mjs
import { readFileSync, readdirSync } from 'node:fs';
import Ajv from 'ajv';
import { validate } from '@loader-kit/spec';
import schema from '@loader-kit/spec/schema.json' with { type: 'json' };

const check = new Ajv({ allErrors: true }).compile(schema);
let failed = false;

for (const file of readdirSync('loaders').filter((name) => name.endsWith('.json'))) {
  const spec = JSON.parse(readFileSync(`loaders/${file}`, 'utf8'));
  const problems = validate(spec);
  if (!check(spec)) problems.push(...check.errors.map((e) => `${e.instancePath || '/'} ${e.message}`));
  if (problems.length > 0) {
    failed = true;
    console.error(`${file}:\n  ${problems.join('\n  ')}`);
  }
}

process.exit(failed ? 1 : 0);
```

```yaml
# .github/workflows/loaders.yml (một step)
- run: node scripts/check-loaders.mjs
```

## Schema kiểm tra những gì {#what-the-schema-checks}

- Các field bắt buộc, như `schemaVersion`, `name`, `duration`, `layout`, `shape`.
- Kiểu của field, enum (`layout.type`, `shape.type`, `property`, tên easing) và các phạm vi đơn giản (duration dương, `keyTimes` nằm trong [0, 1], `sweep` nằm trong (0, 2π]).
- Hai dạng của spec: các field của group viết inline, hoặc `parts` và không có field group nào ở cấp cao nhất.
- Field lạ. Ở điểm này schema chặt hơn engine: engine bỏ qua field lạ, nhưng trong spec viết tay chúng thường là lỗi gõ nhầm, ví dụ `keytimes` thay vì `keyTimes`.

## Những gì chỉ `validate()` kiểm tra {#what-only-validate-checks}

Một số quy tắc cần xét nhiều field cùng lúc. Schema để chúng lại cho `validate()`, hàm mà mọi engine cũng áp dụng:

| Quy tắc | Ví dụ lỗi |
| --- | --- |
| `keyTimes` không bao giờ giảm | `tracks[0].keyTimes must be non-decreasing` |
| `values` dài bằng `keyTimes` | `tracks[0].values must have the same length as keyTimes` |
| Danh sách easing có đúng một mục cho mỗi segment | `tracks[0].easing needs one entry per segment (2)` |
| `$param` trỏ tới một param đã khai báo | `layout.count uses unknown param "cout"` |
| Mỗi thuộc tính chỉ có một track trong danh sách | `tracks[1].property "scale" is animated by more than one track` |
| `strokeStart` và `strokeEnd` cần shape `ring` | `tracks[0].property "strokeEnd" needs a ring shape` |
| Spec phải animate một thứ gì đó | `the spec needs at least one track or group track` |

Một vài bước kiểm tra cần biết số phần tử sau khi đã áp params của người dùng, nên chúng chỉ chạy lúc spec được prepare: mảng `stagger` hoặc `durations` ngắn hơn số phần tử, và [giới hạn số phần tử](/vi/spec/using#limits). `prepare()` trong `@loader-kit/web` chạy các bước này bằng JavaScript.

## Xem thêm {#see-also}

- [Dùng spec](/vi/spec/using): các API validate trên từng nền tảng.
- [Viết spec với AI](/vi/tools/ai): schema giúp kiểm tra output của AI dễ hơn.
- [Playground](/vi/tools/playground): gợi ý từ schema và lỗi từ `validate()` ngay trong trình duyệt.
