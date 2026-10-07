---
description: "LoaderKit JSON Schema 用法：在编辑器中获得提示，用 ajv 在 CI 中校验，并了解只有 validate() 能做的检查。"
---

# JSON Schema

LoaderKit 为加载动画 spec 发布了一份 JSON Schema（draft-07）。编辑器可以借助它补全字段名、悬停显示文档，并在你输入时标出错误。

| | |
| --- | --- |
| 公开 URL | `https://maitrungduc1410.github.io/loader-kit/schema/v1.json` |
| npm | `@loader-kit/spec/schema.json` |

## 在 spec 中添加 `$schema` {#add-schema-to-a-spec}

最简单的做法在大多数编辑器里都无需配置：在文件顶部加一个 `$schema` 字段。

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

引擎会忽略 `$schema`，所以文件可以原样发布。

## VS Code

有 `$schema` 就够了。如果想让没有 `$schema` 的文件也应用这份 schema，可以在设置中按文件模式映射（项目级设置放在 `.vscode/settings.json`）：

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

如果需要离线使用，把 `url` 指向 `node_modules` 中的副本：

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

## JetBrains IDE {#jetbrains-ides}

IntelliJ IDEA、WebStorm、Android Studio 和 Rider 也会读取 `$schema`。要映射没有 `$schema` 的文件：

1. 打开 **Settings** > **Languages & Frameworks** > **Schemas and DTDs** > **JSON Schema Mappings**。
2. 点击 **+**，把映射命名为“LoaderKit”。
3. 把 **Schema file or URL** 设为 `https://maitrungduc1410.github.io/loader-kit/schema/v1.json`。
4. 把 **Schema version** 设为 **JSON Schema version 7**。
5. 添加一个文件路径模式，例如 `loaders/*.json`。

## 在 CI 中校验 {#validate-in-ci}

对仓库中的每份 spec 做两项检查：用 [ajv](https://ajv.js.org/) 检查 JSON Schema，再用 `@loader-kit/spec` 的 `validate()` 检查 schema 表达不了的规则。

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
# .github/workflows/loaders.yml（其中一个 step）
- run: node scripts/check-loaders.mjs
```

## schema 能检查什么 {#what-the-schema-checks}

- 必填字段，例如 `schemaVersion`、`name`、`duration`、`layout`、`shape`。
- 字段类型、枚举（`layout.type`、`shape.type`、`property`、具名缓动）和简单的取值范围（时长为正数、`keyTimes` 在 [0, 1] 之内、`sweep` 在 (0, 2π] 之内）。
- spec 的两种写法：组字段直接写在顶层，或者使用 `parts` 且顶层不写组字段。
- 未知字段。这一点 schema 比引擎更严格：引擎会忽略未知字段，但在手写的 spec 中，它们通常是拼写错误，比如把 `keyTimes` 写成了 `keytimes`。

## 只有 `validate()` 能检查的内容 {#what-only-validate-checks}

有些规则涉及多个字段，schema 把它们交给 `validate()`，每个引擎也都会执行这些检查：

| 规则 | 错误示例 |
| --- | --- |
| `keyTimes` 不递减 | `tracks[0].keyTimes must be non-decreasing` |
| `values` 与 `keyTimes` 长度相同 | `tracks[0].values must have the same length as keyTimes` |
| 缓动列表每段一项 | `tracks[0].easing needs one entry per segment (2)` |
| `$param` 引用的是已声明的参数 | `layout.count uses unknown param "cout"` |
| 同一个列表中每个属性只有一条 track | `tracks[1].property "scale" is animated by more than one track` |
| `strokeStart` 和 `strokeEnd` 需要 `ring` 形状 | `tracks[0].property "strokeEnd" needs a ring shape` |
| spec 至少要让某样东西动起来 | `the spec needs at least one track or group track` |

有几项检查需要知道代入用户参数后的元素个数，所以只在准备 spec 时才执行：`stagger` 数组或 `durations` 比元素个数短，以及[元素数量限制](/zh/spec/using#limits)。在 JavaScript 中，`@loader-kit/web` 的 `prepare()` 会执行这些检查。

## 另请参阅 {#see-also}

- [使用 spec](/zh/spec/using)：各平台的校验 API。
- [用 AI 编写 spec](/zh/tools/ai)：有了 schema，AI 的输出更容易检查。
- [Playground](/zh/tools/playground)：在浏览器中获得 schema 提示和 `validate()` 错误。
