---
description: "在 Web、Android、iOS、macOS 和 Windows 上运行时加载自定义 LoaderKit spec，完成校验、读取错误，并遵守引擎限制。"
---

# 使用 spec

spec 就是普通的 JSON。你可以随 App 一起打包、从网络下载，或者在代码里构建，然后交给所在平台的引擎。

::: warning 实验性功能
自定义 spec 目前仍是实验性功能。在 schema 宣布稳定之前，次版本更新可能会改动它。内置加载动画不受影响。
:::

## 加载 spec {#load-a-spec}

::: code-group

```ts [TypeScript]
import { LoaderKitView } from '@loader-kit/web';

const json = await (await fetch('/specs/typing-dots.json')).text();
const view = new LoaderKitView(host, {
  spec: json,                 // JSON 字符串或对象
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
val spec = remember(json) { IndicatorSpec.parse(json) }   // 会抛出 InvalidIndicatorSpecException
LoaderKitIndicator(spec = spec, modifier = Modifier.size(48.dp))
```

```swift [Swift (UIKit)]
let url = Bundle.main.url(forResource: "typing-dots", withExtension: "json")!
let json = try String(contentsOf: url, encoding: .utf8)

loader.specJSON = json
if let error = loader.specError { print(error.problems) }
```

```swift [SwiftUI]
let spec = try IndicatorSpec(json: json)   // 会抛出 IndicatorSpecError
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

在所有平台上，自定义 spec 都优先于内置的 `indicator` 名称。在 Android、Windows 和 Web 上，清除 spec 就会回到 `indicator` 指定的动画。在 Apple 平台上，`indicator`、`spec` 和 `specJSON` 是同一个设置：设置 `spec` 会替换掉 `indicator`，清除 spec 后什么也不会绘制，要回到原来的动画需要重新设置 `indicator`。

## 发布前先校验 {#validate-before-you-ship}

每个引擎在绘制前都会按同一套规则校验 spec。尽早检查你的 spec，别让错误到达用户手里：

| 位置 | API | 结果 |
| --- | --- | --- |
| JavaScript、Node、CI | `@loader-kit/spec` 或 `@loader-kit/web` 中的 `validate(spec)` | `string[]`，有效时为空 |
| JavaScript | `@loader-kit/web` 中的 `prepare({ spec }, params)` | 抛出 `InvalidIndicatorError`（同时检查参数和限制） |
| Android | `IndicatorSpec.validate(json)` / `IndicatorSpec.parse(json)` | `List<String>` / 抛出 `InvalidIndicatorSpecException` |
| Apple | `IndicatorSpec.validate(json:)` / `IndicatorSpec(json:)` | `[String]` / 抛出 `IndicatorSpecError` |
| Windows | `IndicatorSpec.TryParse(json, out spec, out errors)` / `IndicatorSpec.Parse(json)` | `bool` 及错误列表 / 抛出 `InvalidIndicatorSpecException` |
| 编辑器 | [JSON Schema](/zh/tools/json-schema) | 输入时给出提示和波浪线 |
| 浏览器 | [Playground](/zh/tools/playground) | 实时预览，列出所有问题 |

```ts
import { validate } from '@loader-kit/spec';
import spec from './typing-dots.json' with { type: 'json' };

const problems = validate(spec);
if (problems.length > 0) throw new Error(problems.join('\n'));
```

## 错误 {#errors}

错误信息会带上字段路径，方便你快速定位：

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

视图遇到有问题的 spec 永远不会崩溃，而是什么都不画，并报告错误：

| 平台 | 错误报告 |
| --- | --- |
| Web | `specError`、`onError` 选项、`loaderkit-error` 事件 |
| Android View | `onError`（未设置时写入日志） |
| Compose | 在调用可组合项之前，`IndicatorSpec.parse` 就会抛出异常。如果 spec 因参数而变得无效，会输出一条警告日志 |
| Apple | `specError`（`IndicatorSpecError.problems`） |
| Windows | `SpecError` 和 `SpecFailed` 事件 |

有些问题只有在用用户的参数准备 spec 时才能发现，`validate()` 发现不了：

- `stagger` 数组或 `durations` 比元素个数短；
- 下面的[限制](#limits)。

## 限制 {#limits}

为了让绘制量有上限，引擎在准备 spec 时，会拒绝满足以下任一条件的 spec：

- 元素总数超过 10,000 个；
- 圆环弧段总数超过 10,000 段（对所有使用 `ring` 形状的部件，累加元素个数 × `segments`）。

## 向前兼容 {#forward-compatibility}

引擎会忽略不认识的字段，因此 schema 版本 1 的后续修订可以增加可选字段。[JSON Schema](/zh/tools/json-schema) 更严格：它会标出未知字段，因为在手写的 spec 里，这类字段通常是拼写错误。

## 播放控制依然适用 {#playback-still-applies}

自定义 spec 和内置动画使用同样的[播放](/zh/guide/playback)设置：速度、启动和停止、`cycleProgress` 以及减弱动态效果。修改 spec 或其参数会让动画重新开始。
