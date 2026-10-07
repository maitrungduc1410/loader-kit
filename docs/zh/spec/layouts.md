---
description: "LoaderKit spec 的布局：用 single、stack、row、grid 和 ring 在单位方框中摆放元素，直观查看每个字段如何影响元素位置。"
---

# 布局

布局负责把元素摆进方框。它为每个元素确定中心点、宽度和高度；对于开启了 orient 的圆环，还会确定旋转角度。所有长度都是方框边长的比例，方框在两个轴上的范围都是 0 到 1，y 轴向下。

选择一种布局类型并修改字段。带编号的小方块就是各个元素，按索引顺序排列。

<LayoutVisualizer />

| 布局 | 字段（默认值） | 元素 |
| --- | --- | --- |
| `single` | `size`（1）、`width`（`size`）、`height`（`size`）、`x`（0.5）、`y`（0.5） | 一个元素，中心位于 `(x, y)` |
| `stack` | `count`，以及与 `single` 相同的字段 | `count` 个元素叠在同一位置 |
| `row` | `count`、`gap`、`itemWidth`、`itemHeight` | 水平一行，垂直居中 |
| `grid` | `columns`、`rows`、`gap` | 占满方框的网格，逐行排列 |
| `ring` | `count`、`itemSize`、`itemWidth`、`itemHeight`、`startAngle`（0）、`orient`（false） | 沿圆周顺时针排列的元素 |

数量类字段（`count`、`columns`、`rows`）会四舍五入取整，且最小为 1。任何数字都可以是 [`$param`](/zh/spec/params)。

## single

只有一个元素。不设置字段时，它占满整个方框。用 `width` 和 `height` 做非正方形的元素，用 `x` 和 `y` 移动它的中心。

<<< @/examples/layout-single.json

<SpecExample id="layout-single" />

## stack

`count` 个元素叠放在一起，位置完全相同。stack 适合配合 stagger 使用，让每个副本处于周期的不同位置。这个涟漪效果用了负的 stagger 偏移，所以从第一帧起，三个圆就已经错开分布在周期中，而不是同时开始（见 [Stagger](/zh/spec/timing#stagger)）。

<<< @/examples/layout-stack.json

<SpecExample id="layout-stack" />

## row

`count` 个元素并排，相邻两个元素之间间隔 `gap`。垂直中心固定为 0.5。

- 不设置 `itemWidth` 时，元素和间距会占满方框宽度：每个元素宽 `(1 - gap × (count - 1)) / count`。
- 设置了 `itemWidth` 时，元素使用这个宽度，整行居中。
- `itemHeight` 默认等于元素宽度，所以元素是正方形。要做竖条时再设置它。

<<< @/examples/layout-row.json

<SpecExample id="layout-row" />

## grid

`columns × rows` 个元素占满方框，从左上角开始逐行编号。`gap` 是相邻两个格子之间的间距，横向和纵向相同。

这个示例用了一个 stagger 数组（每个元素一个偏移量），让波浪从左下角开始。

<<< @/examples/layout-grid.json

<SpecExample id="layout-grid" />

## ring

`count` 个元素沿圆周均匀分布。元素 0 位于 `startAngle`（0 表示圆心正右方），其余元素按顺时针排列。半径为 `0.5 - itemSize / 2`，所以元素的外缘刚好碰到方框。

<<< @/examples/layout-ring.json

<SpecExample id="layout-ring" />

### 元素朝向 {#oriented-elements}

`itemWidth` 和 `itemHeight` 改变元素尺寸，但不影响半径，半径仍由 `itemSize` 决定。设置 `orient: true` 后，每个元素都会旋转，让顶部朝外、背离圆心。配合 `line` 形状，就是经典的 spinner。

<<< @/examples/layout-ring-orient.json

<SpecExample id="layout-ring-orient" />

::: tip 元素顺序与颜色
元素索引遵循布局顺序：row 从左到右，grid 逐行，ring 从 `startAngle` 开始顺时针。stagger 数组、`durations` 和 `colors` 设置用的都是这些索引。
:::

## 精确公式 {#exact-formulas}

每种布局的精确公式见[规范](/zh/spec/reference#_3-parts-and-layouts)。
