---
description: "在 React Native 中使用 LoaderKit：安装 react-native-loader-kit，用 LoaderKitView 绘制 50 个内置加载动画，用 LoaderKitProgress 显示进度，编写自定义 spec，以及从 4 版本迁移。"
---

# React Native

[`react-native-loader-kit`](https://github.com/maitrungduc1410/react-native-loader-kit) 把 LoaderKit 带到 Android 和 iOS 上的 React Native 应用。它运行的正是本站介绍的原生引擎，所以内置加载动画的名称、参数和动效都完全一致，进度指示器的样式也相同。

[内置加载动画](/zh/guide/indicators)和[进度指示器](/zh/guide/progress)的展示页都有 React Native 标签：选一个样式，调整后复制代码即可。

## 要求 {#requirements}

| 版本 | React Native | 架构 | 维护分支 |
| --- | --- | --- | --- |
| 5.x | 0.76 及以上 | 仅新架构 | `master`，npm `latest` |
| 4.x | 见 [v4 README](https://github.com/maitrungduc1410/react-native-loader-kit/tree/v4#readme) | 新旧架构均可 | `v4` 分支，npm `v4-lts` |

5 版本需要新架构，这是 React Native 0.76 起的默认设置。使用 `newArchEnabled=false`（Android）或 `RCT_NEW_ARCH_ENABLED=0`（iOS）构建的应用会在构建时报错，并提示改用 4 版本：`npm install react-native-loader-kit@v4-lts`。

## 安装 {#install}

::: code-group

```sh [npm]
npm install react-native-loader-kit
```

```sh [yarn]
yarn add react-native-loader-kit
```

:::

这个库包含原生代码。iOS 需要运行 `cd ios && pod install`，然后重新构建应用。

**Expo**：运行 `npx expo prebuild`，然后重启项目。不支持 Expo Go。

## 用法 {#usage}

```tsx
import { LoaderKitView } from 'react-native-loader-kit';

<LoaderKitView name="BallPulse" color="#7c3aed" style={{ width: 50, height: 50 }} />
```

参数可以改变一个加载动画，而无需重新编写。每个加载动画的参数列在[内置加载动画](/zh/guide/indicators)中；`BallPulse` 有 `count` 和 `minScale`：

```tsx
<LoaderKitView name="BallPulse" params={{ count: 5, minScale: 0.5 }} color="#4fc1e9" />
```

加载动画绘制在一个正方形中，边长等于视图较短的一边。

### 属性 {#props}

| 属性 | 类型 | 默认值 | 含义 |
| --- | --- | --- | --- |
| `name` | 内置加载动画名称 | `'BallPulse'` | 要绘制的内置加载动画。`name` 和 `spec` 二选一 |
| `spec` | `IndicatorSpec` | | 自定义加载动画，见[自定义 spec](#custom-specs) |
| `params` | `Record<string, number>` | | 覆盖参数。未知的名称会被忽略 |
| `color` | 颜色 | `'white'` | 所有元素的颜色 |
| `colors` | 颜色数组 | | 每个元素一种颜色，元素更多时循环使用。优先于 `color` |
| `speed` | number | `1` | 播放速率。修改它不会让动画跳变 |
| `animating` | boolean | `true` | `false` 时定格在当前帧 |
| `hidesWhenStopped` | boolean | `false` | `animating` 为 `false` 时不绘制任何内容 |
| `cycleProgress` | [0, 1] 内的数 | | 定格在动画周期中的某一点。它不是任务的进度 |
| `reduceMotion` | `'system' \| 'never' \| 'always'` | `'system'` | `system` 在系统要求减弱动态效果时显示静止帧 |

所有 `View` 属性同样适用。`BUILTIN_INDICATOR_NAMES` 在运行时列出所有内置名称，`BuiltinIndicatorName` 是它们的类型。

## 进度指示器 {#progress}

`LoaderKitProgress` 用来显示任务完成了多少：10 种 type、50 种样式。把 `value` 设为 [0, 1] 内的数，或设为 `null` 显示不确定状态的动画。新的 value 会沿一条贴合你更新节奏的曲线平滑过渡，且永远不会超过真实值；`smooth={false}` 则直接跳到新值。

```tsx
import { LoaderKitProgress } from 'react-native-loader-kit';

<LoaderKitProgress value={progress} />
<LoaderKitProgress type="linear" variant="wavy" value={progress} />
<LoaderKitProgress type="gauge" value={progress} showLabel size={64} />
<LoaderKitProgress value={null} /> {/* 不确定状态 */}

<LoaderKitProgress value={progress} accessibilityLabel="Uploading video">
  <StopButton onPress={cancel} />
</LoaderKitProgress>
```

所有 type 及其占用的尺寸见 [Type 与 variant](/zh/guide/progress#types-and-variants)。

| 属性 | 类型 | 默认值 | 含义 |
| --- | --- | --- | --- |
| `value` | [0, 1] 内的数或 `null` | `null` | `null` 显示不确定状态的动画 |
| `smooth` | boolean | `true` | 平滑过渡到新值 |
| `type` | `ProgressType` | `'circular'` | |
| `variant` | `ProgressVariant` | 该 type 的第一个 variant | |
| `buffer` | [0, 1] 内的数 | | linear `flat` 和 `wavy` 的缓冲部分 |
| `size` | number | `48` | 除 linear 和 border 外所有 type 的宽度 |
| `color` | 颜色 | 强调色 | |
| `trackColor` | 颜色 | 24% 不透明度的 `color` | |
| `labelColor` | 颜色 | 文字颜色 | |
| `showLabel` | boolean | `false` | 在指示器内部或旁边显示百分比 |
| `thickness` | number | 取决于 type | |
| `trackGap` | number | `4` | 进度与轨道之间，或各段之间的间距 |
| `segments` | number | 取决于 variant | 段、点、刻度、步骤、柱或网格列的数量 |
| `stopIndicator` | boolean | `true` | linear `flat` 和 `wavy` 轨道末端的圆点 |
| `strokeCap` | `'round' \| 'butt'` | `'round'` | |
| `amplitude`、`wavelength`、`waveSpeed` | number | linear 为 `3`、`40`、`1`；circular 为 `2`、`15`、`1` | `wavy` 的波形 |
| `sweepAngle` | number | `270` | `gauge` 的弧度，单位为度 |
| `cornerRadius` | number | `12` | `border` 的圆角 |
| `speed` | number | `1` | 不确定状态动画的播放速率。0 或更小会暂停 |
| `reduceMotion` | `'system' \| 'never'` | `'system'` | 系统要求减弱动态效果时，`system` 会直接跳到新值，停止波浪、条纹和光泽，并放慢不确定状态的动画 |

`LoaderKitProgress` 是一个 `View`，里面是铺满它的绘制层和绘制在上方的子元素，所以所有 `View` 属性都适用（`pointerEvents`、`borderRadius`、`onLayout` 等）。你传入的样式优先于 type 的默认尺寸，绘制会适配实际得到的尺寸：对于正方形的 type，在 `style` 中把 `width` 和 `height` 设为 120，与 `size={120}` 的尺寸相同。带 `size` 的 type 会把子元素居中，适合在 circular、pie 和 gauge 上放一个停止按钮；`border` 则把子元素框起来。

屏幕阅读器会把它读作进度条并报出百分比。`accessibilityLabel` 为它命名（iOS 上默认为 "Loading"）；子元素仍可单独访问。

## 自定义 spec {#custom-specs}

::: warning 实验性功能
自己编写 spec 目前仍是实验性功能：在 schema 宣布稳定之前，次版本更新可能会改动它。内置加载动画不受影响。
:::

`defineIndicator` 会校验 spec，出错时抛出列出所有问题的 `InvalidIndicatorError`。`param` 用来引用 spec 的某个参数。

```tsx
import { LoaderKitView, defineIndicator, param } from 'react-native-loader-kit';

const Blink = defineIndicator({
  name: 'Blink',
  duration: 0.9, // 每个周期的秒数
  params: { count: 4, low: 0.15 },
  layout: { type: 'row', count: param('count'), gap: 0.08 },
  shape: { type: 'rect', cornerRadius: 0.25 },
  stagger: { each: 0.15 }, // 第 i 个元素晚 0.15 * i 秒开始
  tracks: [
    { property: 'opacity', keyTimes: [0, 0.5, 1], values: [1, param('low'), 1], easing: 'easeInOut' },
    { property: 'scaleY', keyTimes: [0, 0.5, 1], values: [1, 0.5, 1], easing: 'easeInOut' },
  ],
});

<LoaderKitView spec={Blink} params={{ count: 6 }} color="white" style={{ width: 60, height: 60 }} />
```

请在组件外定义 spec，或者对它做 memo：每个新的 spec 对象都会让动画重新开始。`validate(spec)` 返回同样的问题列表，但不会抛出异常。格式见[自定义加载动画](/zh/spec/)；同一个 spec 可以在 Android、iOS、macOS、Windows 原生应用和 Web 上运行。

## 从 4 版本迁移 {#migrating-from-v4}

- 必须使用新架构，见[要求](#requirements)。
- `animationSpeedMultiplier` 改名为 `speed`。
- `IndicatorName` 改名为 `BuiltinIndicatorName`，`ALL_INDICATORS` 改名为 `BUILTIN_INDICATOR_NAMES`。
- `CommonIndicatorName`、`IOSOnlyIndicatorName`、`COMMON_INDICATORS`、`IOS_ONLY_INDICATORS`、`isIndicatorAvailableOnPlatform` 和 `getAvailableIndicators` 已移除：所有加载动画都能在两个平台上运行。原本仅限 iOS 的 `BallRotateChase` 和 `CircleStrokeSpin` 现在也支持 Android。
- 加载动画的名称不变。
- Android 上的加载动画不再来自 AVLoadingIndicatorView，因此时序现在与 iOS 一致：缓动曲线、关键帧时间、起始延迟以及与像素密度无关的尺寸。

## 故障排查 {#troubleshooting}

### uses-sdk:minSdkVersion XX cannot be smaller than version YY {#uses-sdk-minsdkversion}

LoaderKit 需要 `minSdkVersion` 24。这个库会从你的 `android/build.gradle` 的 `ext` 块中读取 `minSdkVersion`、`compileSdkVersion`、`targetSdkVersion` 和 `kotlinVersion`，与 React Native 模板的定义方式一致，所以请在那里提高 `minSdkVersion`：

```groovy
buildscript {
    ext {
        minSdkVersion = 24
        compileSdkVersion = 35
        targetSdkVersion = 35
        kotlinVersion = "2.0.21"
    }
}
```

## 另请参阅 {#see-also}

- [自定义](/zh/guide/customizing)和[播放控制](/zh/guide/playback)：参数、颜色、尺寸、速度、停止和减弱动态效果。
- [使用 spec](/zh/spec/using)：校验与限制。
- 这个库的[示例应用](https://github.com/maitrungduc1410/react-native-loader-kit/tree/master/example)。
