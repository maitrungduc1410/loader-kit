---
description: "实时浏览 LoaderKit 的 33 个内置加载动画，调节参数、颜色和速度，并复制 Web、Android、Apple、Windows 的现成代码。"
---

# 内置加载动画

LoaderKit 内置了 33 个加载动画，在每个平台上名称、参数和动效都完全一致。点击任意一个即可打开面板：调整参数、颜色、速度和尺寸，然后复制对应平台的代码。

<IndicatorGallery />

## 名称与参数 {#names-and-params}

目前只有两个内置动画支持参数。其余动画的设计是固定的，只能通过 color、colors、尺寸和速度来调整。

| 加载动画 | 参数（默认值） | 周期（秒） |
| --- | --- | --- |
| `AudioEqualizer` | 无 | 4.3 |
| `BallBeat` | 无 | 0.7 |
| `BallClipRotate` | 无 | 0.75 |
| `BallClipRotateMultiple` | 无 | 1 |
| `BallClipRotatePulse` | 无 | 1 |
| `BallDoubleBounce` | 无 | 2 |
| `BallGridBeat` | 无 | 1 |
| `BallGridPulse` | 无 | 1 |
| `BallPulse` | `count`（3）、`minScale`（0.3） | 0.75 |
| `BallPulseRise` | 无 | 1 |
| `BallPulseSync` | 无 | 0.6 |
| `BallRotate` | 无 | 1 |
| `BallRotateChase` | 无 | 1.5 |
| `BallScale` | 无 | 1 |
| `BallScaleMultiple` | 无 | 1 |
| `BallScaleRipple` | 无 | 1 |
| `BallScaleRippleMultiple` | 无 | 1.25 |
| `BallSpinFadeLoader` | `count`（8）、`minScale`（0.4）、`minOpacity`（0.3） | 1 |
| `BallTrianglePath` | 无 | 2 |
| `BallZigZag` | 无 | 0.7 |
| `BallZigZagDeflect` | 无 | 1.5 |
| `CircleStrokeSpin` | 无 | 1.7 |
| `CubeTransition` | 无 | 1.6 |
| `LineScale` | 无 | 1 |
| `LineScaleParty` | 无 | 1 |
| `LineScalePulseOut` | 无 | 1 |
| `LineScalePulseOutRapid` | 无 | 0.9 |
| `LineSpinFadeLoader` | 无 | 1.2 |
| `Orbit` | 无 | 1.9 |
| `Pacman` | 无 | 1 |
| `SemiCircleSpin` | 无 | 0.6 |
| `SquareSpin` | 无 | 3 |
| `TriangleSkewSpin` | 无 | 3 |

周期指速度为 1 时播放一轮的时长。用 [`speed`](/zh/guide/playback#speed) 可以调快或调慢。

### 参数说明 {#the-params}

| 参数 | 加载动画 | 含义 |
| --- | --- | --- |
| `count` | `BallPulse` | 一行中球的个数。四舍五入取整，最小为 1。 |
| `minScale` | `BallPulse` | 脉冲过程中球的最小缩放比例，取值 0 到 1。 |
| `count` | `BallSpinFadeLoader` | 圆环上球的个数。四舍五入取整，最小为 1。 |
| `minScale` | `BallSpinFadeLoader` | 球淡出时的最小缩放比例。 |
| `minOpacity` | `BallSpinFadeLoader` | 球淡出时的最低不透明度。 |

如果传入的参数某个加载动画并没有声明，它会被直接忽略，所以切换加载动画时可以放心沿用同一组参数。代码示例见[自定义](/zh/guide/customizing#params)。

## 在运行时列出所有名称 {#list-the-names-at-runtime}

::: code-group

```ts [TypeScript]
import { BUILTIN_INDICATOR_NAMES } from '@loader-kit/web';

console.log(BUILTIN_INDICATOR_NAMES); // ['AudioEqualizer', 'BallBeat', ...]
```

```kotlin [Kotlin]
import io.github.maitrungduc1410.loaderkit.BuiltinIndicators

BuiltinIndicators.names                 // List<String>
BuiltinIndicators["BallPulse"]          // IndicatorSpec?，名称未知时为 null
```

```swift [Swift]
import LoaderKit

IndicatorSpec.builtinNames              // [String]
IndicatorSpec.builtin(named: "BallPulse")
```

```csharp [C#]
using LoaderKit;

foreach (var name in BuiltinIndicators.Names) Console.WriteLine(name);
var spec = BuiltinIndicators.Get("BallPulse");
```

:::

## 未知名称 {#unknown-names}

传入未知的名称绝不会导致崩溃。视图什么都不画，并报告问题：

| 平台 | 错误报告位置 |
| --- | --- |
| Web | `LoaderKitView` 的 `specError`、`onError` 选项、`<loader-kit>` 的 `loaderkit-error` 事件 |
| Android View | `onError` 回调（未设置时写入日志） |
| Compose | Logcat 中的一条警告 |
| Apple | `LoaderKitView` 的 `specError` |
| Windows | `SpecError` 和 `SpecFailed` 事件 |

## 致谢 {#credits}

内置加载动画的动效来自 [NVActivityIndicatorView](https://github.com/ninjaprox/NVActivityIndicatorView)、[loaders.css](https://github.com/ConnorAtherton/loaders.css) 和 [DGActivityIndicatorView](https://github.com/gontovnik/DGActivityIndicatorView)。详见仓库中的 `THIRD_PARTY_NOTICES.md`。
