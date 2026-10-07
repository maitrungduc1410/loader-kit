---
description: "LoaderKit spec 的时序：用 stagger 错开元素，为每个元素设置时长和静止值，组合多个部件，移动整组元素并加入 3D 透视。"
---

# 时序与组合

本页介绍如何安排元素之间的先后时序，以及如何用多个组拼出一个加载动画。

## 元素时间 {#element-time}

每个元素都有一个启动偏移（来自 `stagger`）和一个周期长度（来自 `durations`、部件的 `duration` 或 spec 的 `duration`）。在时间 `t`：

1. `local = t - offset`。
2. 如果 `local` 为负，说明元素还没启动，显示它的[静止值](#rest-values)。
3. 否则周期进度为 `(local mod cycle) / cycle`，取值 0 到 1，所有 track 都在这个位置采样。

## Stagger {#stagger}

`stagger` 让元素错开启动、依次运动。它有两种写法。

`{ "each": 0.1, "start": 0 }` 让元素 `i` 的偏移为 `start + each × i` 秒，`start` 可以省略。

<<< @/examples/timing-wave.json

<SpecExample id="timing-wave" />

<TrackTimeline example="timing-wave" />

数组写法则按索引为每个元素单独指定偏移，数组长度不能少于元素个数。[grid 示例](/zh/spec/layouts#grid)就是用数组让波浪从一角开始的。

### 负偏移 {#negative-offsets}

偏移可以为负。偏移为负的元素在 `t = 0` 时已经走完了周期的一部分。如果希望每个元素从第一帧起就可见，就用负偏移，比如 [stack 涟漪](/zh/spec/layouts#stack)：周期为 1.5 秒，`[0, -0.5, -1]` 让三个圆均匀错开。

::: tip 如何选择偏移
要均匀分布，偏移取 `cycle / count`。比如 8 个元素的圆环、周期 1 秒时，`each: 0.125` 恰好在每个周期形成一整轮波浪。
:::

## 静止值 {#rest-values}

元素启动之前，以及没有 track 的属性，都显示静止值：`scale`、`scaleX`、`scaleY`、`opacity` 和 `strokeEnd` 为 1，其他属性为 0。

`rest` 可以为一组元素修改静止值。这里的 `rest: { "scale": 0 }` 会把每个点隐藏到它的 stagger 延迟结束，所以开头时点会一个个出现：

<<< @/examples/timing-rest.json

<SpecExample id="timing-rest" />

`rest` 还能用来摆放元素：没有 track 的属性会一直保持静止值。[部件示例](#parts)就用 `rest.translateY` 把一个点放在中心上方。

::: info 定格的画面会跳过等待
当视图用 [`cycleProgress`](/zh/guide/playback#cycle-progress) 定格一帧时，引擎会先跳过若干个完整周期，直到所有元素都已启动。所以定格的画面里，不会出现元素还停在启动前静止值的情况。
:::

## 时长 {#durations}

`durations` 按索引为每个元素单独指定周期长度。它会覆盖部件和 spec 的 `duration`，长度不能少于元素个数。周期不同的元素会时而同步、时而错开：

<<< @/examples/timing-durations.json

<SpecExample id="timing-durations" />

## 部件 {#parts}

一份 spec 默认就是一组元素，直接写在顶层。如果要组合布局、形状或 track 各不相同的多个组，就把它们列在 `parts` 中。每个部件都可以设置 `layout`、`shape`、`tracks`、`stagger`、`duration`、`durations`、`rest` 和 `groupTracks`。

- 部件按顺序绘制，后面的部件在上层。
- 元素索引跨部件连续：部件 1 的第一个元素紧接在部件 0 的最后一个元素之后。`colors` 设置用的就是这些索引。
- 部件的 `duration` 设置它自己的周期长度，默认是 spec 的 `duration`。
- 使用了 `parts` 的 spec，不能在顶层再设置组字段。

这里部件 0 是一个会脉动的大圆。部件 1 是用 `rest` 放在它上方的小点，以快一倍的周期闪烁：

<<< @/examples/timing-parts.json

<SpecExample id="timing-parts" />

## 组 track {#group-tracks}

`groupTracks` 让整组元素绕方框中心运动，支持 `scale`、`scaleX`、`scaleY`、`opacity`、`rotate`、`translateX` 和 `translateY`。它们按组的周期运行，从 `t = 0` 开始，不受 stagger 影响，组的 `rest` 对它们也不生效。

把小点的闪烁换成组旋转，它就会绕着中心转圈：

<<< @/examples/timing-group-tracks.json

<SpecExample id="timing-group-tracks" />

组 track 在元素变换之后应用。所以元素 track 在组内移动元素，组 track 移动整个组。

## 透视 {#perspective}

`rotateX` 和 `rotateY` 让元素做 3D 翻转。`perspective` 是观察者到方框的距离，以方框为单位（默认 2.5）。值越小，3D 效果越强。它对整份 spec 只设置一次。

<<< @/examples/timing-perspective.json

<SpecExample id="timing-perspective" />

内置的 `SquareSpin` 用的是同样的思路，透视距离为 2.5。

## 变换顺序 {#transform-order}

对形状上的每个点，引擎依次应用：缩放、`rotateX`、`rotateY`、`rotate`、透视、平移到元素位置，最后是组变换。具体矩阵见[规范](/zh/spec/reference#_6-rendering-an-element)。
