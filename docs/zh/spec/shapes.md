---
description: "LoaderKit spec 的形状：circle、rect、支持分段和描边裁剪的 ring、triangle 与 line，每种都附实时示例。"
---

# 形状

同一组里的每个元素都画同一种形状，形状以元素为中心，填满元素的宽高。一个部件只有一种形状。想混用多种形状，请使用[部件](/zh/spec/timing#parts)。

| 形状 | 字段（默认值） | 绘制内容 |
| --- | --- | --- |
| `circle` | `startAngle`（-π/2）、`sweep`（2π） | 实心椭圆，或其中的一部分 |
| `rect` | `cornerRadius`（0） | 实心矩形 |
| `ring` | `strokeWidth`、`startAngle`（-π/2）、`sweep`（2π）、`segments`（1） | 描边圆，或其中的若干段圆弧 |
| `triangle` | 无 | 尖端朝上的实心三角形 |
| `line` | 无 | 两端完全圆角的条形 |

角度单位为弧度。-π/2（约 -1.5708）是正上方，0 是正右方，圆弧按顺时针方向绘制。

## circle

内切于元素的实心椭圆。元素是正方形时，它就是圆。

`sweep` 小于 2π 时，只画圆盘的一部分：由圆弧（从 `startAngle` 到 `startAngle + sweep`）和连接两端的弦围成的区域。`sweep` = π 时是半圆；3π/2 时，圆盘会沿弦切掉剩下那段弧对应的一小块。

<<< @/examples/shape-circle-arc.json

<SpecExample id="shape-circle-arc" />

## rect

实心矩形。`cornerRadius` 是元素较短边的比例，从 0（直角）到 0.5（两端完全变圆）。

<<< @/examples/shape-rect.json

<SpecExample id="shape-rect" />

## ring

描边圆。`strokeWidth` 是元素较短边的比例。描边的外缘刚好贴住元素，所以圆环永远不会超出元素范围。描边两端是平头的。

`sweep` 只画圆的一段弧：

<<< @/examples/shape-ring.json

<SpecExample id="shape-ring" />

### 分段 {#segments}

`segments` 把圆环分成若干段均匀分布的圆弧。第 k 段从 `startAngle + k × 2π / segments` 开始，跨度为 `sweep`。

<<< @/examples/shape-ring-segments.json

<SpecExample id="shape-ring-segments" />

### 用 strokeStart 和 strokeEnd 裁剪 {#trimming-with-strokestart-and-strokeend}

圆环有两个额外属性可以用 track 驱动：`strokeStart`（静止值 0）和 `strokeEnd`（静止值 1）。它们按圆弧长度的比例裁剪每一段弧，和 Core Animation 中的 `strokeStart`、`strokeEnd` 一样。当 `strokeEnd` 小于等于 `strokeStart` 时，什么都不画。

下面的例子中，周期前半段终点从 0 增长到 1，后半段起点再追上来：

<<< @/examples/shape-ring-trim.json

<SpecExample id="shape-ring-trim" />

::: warning 仅限 ring
`strokeStart` 和 `strokeEnd` 的 track 和静止值都要求使用 `ring` 形状。用在其他形状上时，`validate()` 会报错。
:::

::: tip 像嘴巴一样张合的圆盘
`strokeWidth` 为 0.5 的圆环就是一个实心圆盘。对它做裁剪，就会张开一个扇形缺口。内置的 `Pacman` 就是这样实现的。
:::

## triangle

实心等腰三角形：一个顶点在上方正中，另外两个在右下角和左下角。

<<< @/examples/shape-triangle.json

<SpecExample id="shape-triangle" />

## line

圆角半径为较短边一半的实心矩形，也就是两端为圆头的条形。放在 row 里可以做均衡器条，放在开启了 orient 的 ring 里可以做 spinner。

<<< @/examples/shape-line.json

<SpecExample id="shape-line" />

## 精确规则 {#exact-rules}

[规范](/zh/spec/reference#_4-shapes)对每种形状都有精确定义，包括椭圆上的圆弧如何度量。
