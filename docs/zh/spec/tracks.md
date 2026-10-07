---
description: "LoaderKit spec 的 track：用 keyTimes、values 和 easing 驱动缩放、不透明度、旋转、位移等属性，附实时曲线。"
---

# Track

track 描述的是：一组中每个元素的某个属性，在一个周期内如何变化。它是一串关键帧：`keyTimes` 指定时间点，`values` 指定取值，`easing` 指定两个关键帧之间的值如何过渡。

```json
{ "property": "scale", "keyTimes": [0, 0.5, 1], "values": [1, 0.4, 1], "easing": "easeInOut" }
```

## 属性 {#properties}

| 属性 | 静止值 | 单位 | 含义 |
| --- | --- | --- | --- |
| `scale` | 1 | 倍数 | 同时缩放宽度和高度 |
| `scaleX`、`scaleY` | 1 | 倍数 | 缩放单个轴，与 `scale` 相乘 |
| `opacity` | 1 | 0 到 1 | 与元素颜色的 alpha 相乘 |
| `rotate` | 0 | 弧度 | 绕元素中心顺时针旋转 |
| `rotateX`、`rotateY` | 0 | 弧度 | 绕水平轴或垂直轴做 3D 翻转（见[透视](/zh/spec/timing#perspective)） |
| `translateX`、`translateY` | 0 | 方框单位 | 移动元素，1 表示整个方框边长，y 为负表示向上 |
| `strokeStart`、`strokeEnd` | 0、1 | 0 到 1 | 裁剪 [`ring`](/zh/spec/shapes#trimming-with-strokestart-and-strokeend) 形状的圆弧 |

没有 track 的属性保持静止值。同一个属性在 `tracks` 中最多出现一次，在 `groupTracks` 中也最多出现一次。

## keyTimes 和 values {#keytimes-and-values}

`keyTimes` 是周期中的时间点，从 0（开始）到 1（结束）。`values` 中每个 key time 对应一个值。规则如下：

- `keyTimes` 和 `values` 长度相同，至少为 2。
- `keyTimes` 位于 [0, 1] 之内，且不递减。
- 第一个 key time 之前取第一个值，最后一个 key time 之后取最后一个值。

要平滑循环，就从 0 开始、到 1 结束，并让最后一个值等于第一个值。

### 保持与跳变 {#holding-and-jumping}

连续两个相同的值会让数值保持不变；连续两个相同的 key time 会产生瞬间跳变。下面的方块先缩小、保持、放大、再保持，同时它的不透明度在周期中间从 1 跳到 0.4：

<<< @/examples/track-steps.json

<SpecExample id="track-steps" />

## 缓动 {#easing}

缓动决定两个关键帧之间的运动节奏。默认是 `linear`。

| 名称 | 三次贝塞尔曲线 | 效果 |
| --- | --- | --- |
| `linear` | `[0, 0, 1, 1]` | 匀速 |
| `ease` | `[0.25, 0.1, 0.25, 1]` | CSS 和 Core Animation 的默认值 |
| `easeIn` | `[0.42, 0, 1, 1]` | 开始慢 |
| `easeOut` | `[0, 0, 0.58, 1]` | 结束慢 |
| `easeInOut` | `[0.42, 0, 0.58, 1]` | 开始和结束都慢 |

也可以传入三次贝塞尔曲线 `[x1, y1, x2, y2]`，和 CSS 的 `cubic-bezier()` 一样。`x1` 和 `x2` 必须在 [0, 1] 之内；`y1` 和 `y2` 可以超出这个范围，让数值冲过目标再回来（overshoot）。

<EasingCurve />

下面三个点分别使用 `linear`、`easeInOut` 和会冲过头的贝塞尔曲线 `[0.34, 1.56, 0.64, 1]`：

<<< @/examples/track-easing.json

<SpecExample id="track-easing" />

### 每段单独设置缓动 {#one-easing-per-segment}

有 `n` 个 key time 的 track 有 `n - 1` 段。`easing` 可以是一个值，作用于所有段；也可以是一个列表，每段恰好对应一个缓动。下面每个点用 `easeOut` 上升，用 `easeIn` 下落，然后静止：

<<< @/examples/track-per-segment.json

<SpecExample id="track-per-segment" />

::: tip 列表如何解读
如果 `easing` 的第一项是数字，整个列表就是一条贝塞尔曲线；否则就是每段一个缓动。所以 `[0.42, 0, 0.58, 1]` 是一条贝塞尔曲线，而 `[[0.42, 0, 0.58, 1], "linear"]` 表示两段。
:::

## 位移 {#translation}

`translateX` 和 `translateY` 以方框为单位，把元素从布局位置上移开。两条 key time 相同的 track 可以组合出一条路径。这个点沿着菱形绕圈：

<<< @/examples/track-translate.json

<SpecExample id="track-translate" />

## 解读时间线 {#reading-a-timeline}

`<TrackTimeline>` 画出每个元素在一个周期内的取值。这里是内置的 `BallPulse`：一条从 1 到 `minScale` 再回到 1 的 scale track，stagger 为 0.12 秒。

<TrackTimeline indicator="BallPulse" />

## 精确规则 {#exact-rules}

[规范](/zh/spec/reference#_5-tracks-and-time)定义了 track 的采样方式，以及所有引擎共用的精确缓动算法。
