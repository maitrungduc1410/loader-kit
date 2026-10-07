---
description: "一步步编写你的第一个自定义 LoaderKit 加载动画：一份包含布局、形状和关键帧 track 的 JSON spec，每一步都能实时预览。"
---

# 自定义加载动画

自定义加载动画就是一份由你编写的 JSON spec。每个 LoaderKit 引擎都会读取它并原生绘制，无需新增原生代码。本页会一步步构建一个加载动画，每一步都给出完整的 spec 和实时预览。拖动预览下方的滑块，可以在一个周期内来回查看。

::: warning 实验性功能
自己编写 spec 目前仍是实验性功能。在 schema 宣布稳定之前，次版本更新可能会改动 schema 版本 1。内置加载动画及其参数不受影响。
:::

## 核心概念 {#concepts}

| 术语 | 含义 |
| --- | --- |
| **方框（Box）** | 绘制加载动画的正方形，边长取视图较短的那条边。所有长度都是这个边长的比例，取值 0 到 1。原点在左上角，y 轴向下。 |
| **布局（Layout）** | 在方框中摆放元素：`single`、`stack`、`row`、`grid` 或 `ring`。见[布局](/zh/spec/layouts)。 |
| **形状（Shape）** | 每个元素画什么：`circle`、`rect`、`ring`、`triangle` 或 `line`。见[形状](/zh/spec/shapes)。 |
| **Track（动画轨道）** | 某个属性（缩放、不透明度、旋转等）在一个周期内如何通过关键帧变化。见 [Track](/zh/spec/tracks)。 |
| **周期（Cycle）** | 动画的一轮循环。`duration` 是它的时长，单位为秒。 |
| **Stagger** | 为每个元素设置启动延迟，让元素错开启动、依次运动。见[时序](/zh/spec/timing)。 |
| **参数（Params）** | 用户可以覆盖的具名数字，比如 `count`。见[参数](/zh/spec/params)。 |

角度的单位是**弧度**（一整圈是 6.283185307），正角度表示顺时针。时间的单位是秒。

## 第 1 步：一个会脉动的点 {#step-1-one-dot-that-pulses}

最小可用的 spec 包含名称、时长、布局、形状和一条 track。

<<< @/examples/first-dot.json

<SpecExample id="first-dot" />

各字段的作用：

- `schemaVersion` 目前固定为 `1`。
- `duration: 1` 让一个周期持续 1 秒。
- `layout` 是 `single`：方框中央只有一个元素。`size: 0.5` 让它占方框的一半。
- `shape` 是 `circle`：元素画一个实心圆。
- 这条 track 驱动 `scale`。周期开始时（`keyTimes` 为 0）缩放为 1，中间（0.5）为 0.4，结束时（1）回到 1。关键帧之间的值做线性变化。

`$schema` 这一行是可选的，有了它，编辑器就能检查文件并提示字段。见 [JSON Schema](/zh/tools/json-schema)。

## 第 2 步：一行三个点 {#step-2-three-dots-in-a-row}

把布局改成 3 个元素的 `row`，元素间距为 0.1。这一行会占满方框的宽度，所以每个点宽 `(1 - 2 × 0.1) / 3`。

<<< @/examples/first-row.json

<SpecExample id="first-row" />

这条 track 作用于所有元素，所以三个点一起脉动。

## 第 3 步：依次运动 {#step-3-one-after-another}

`stagger` 会延迟每个元素的启动。设为 `{ "each": 0.15 }` 时，元素 0 在第 0 秒启动，元素 1 在第 0.15 秒，元素 2 在第 0.3 秒。

<<< @/examples/first-stagger.json

<SpecExample id="first-stagger" />

元素启动之前，显示的是它的**静止值**（缩放 1，不透明度 1）。见[静止值](/zh/spec/timing#rest-values)。

## 第 4 步：让动效更平滑 {#step-4-smoother-motion}

加上 `easing`，让动作在每个关键帧附近放慢；再加第二条 track，让点在缩小的同时淡出。同一个 track 列表里，每个属性最多只能有一条 track。

<<< @/examples/first-easing.json

<SpecExample id="first-easing" />

<TrackTimeline example="first-easing" />

时间线画出了每个元素的 track 值在一个周期内的变化。曲线之间的错位就是 stagger。

## 第 5 步：让用户可以调整 {#step-5-let-users-change-it}

在 `params` 中声明参数及其默认值，然后在需要数字的地方写 `{ "$param": "name" }`。这样用户无需新的 spec，就能要 5 个点，或者幅度更大的脉动。

<<< @/examples/first-params.json

<SpecExample id="first-params" />

## 在 App 中使用 {#use-it-in-an-app}

用所在平台的引擎加载这份 JSON。各平台的做法见[使用 spec](/zh/spec/using)。

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

## 用 TypeScript 编写 {#write-it-in-typescript}

也可以借助 `@loader-kit/spec` 用 TypeScript 编写 spec。`defineIndicator()` 会在运行时检查 spec 并自动补上 `schemaVersion`，`param()` 用来生成 `$param` 引用。把结果序列化，就得到每个引擎都能读取的 JSON。

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

`defineIndicator()` 出错时会抛出 `InvalidIndicatorError`，列出所有问题。33 个内置加载动画就是这样写出来的。

## 接下来 {#where-to-next}

- [布局](/zh/spec/layouts)：行、网格、圆环和叠放。
- [形状](/zh/spec/shapes)：圆、扇形、圆环、矩形、三角形和线条。
- [Track](/zh/spec/tracks)：关键帧和缓动详解。
- [时序](/zh/spec/timing)：stagger、时长、部件、组 track 和 3D。
- [参数](/zh/spec/params)：让 spec 可配置。
- [Playground](/zh/tools/playground)：带实时预览和校验的 spec 编辑器。
- [规范](/zh/spec/reference)：每个字段的规范性规则。
