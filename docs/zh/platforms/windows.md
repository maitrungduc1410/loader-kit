---
description: "Windows 上的 LoaderKit：安装 NuGet 包，在 XAML 或 C# 中使用 LoaderKitIndicator 控件和自定义 spec。"
---

# Windows

Windows 版 LoaderKit 用 `Microsoft.UI.Composition` 绘制加载动画，用 Win2D 绘制进度指示器，面向 WinUI 3 和 Windows App SDK。

| 包 | 内容 |
| --- | --- |
| [`LoaderKit.WinUI`](https://www.nuget.org/packages/LoaderKit.WinUI) | `LoaderKitIndicator` 控件（`net8.0-windows10.0.19041.0`，Windows App SDK 1.8 或更高版本） |
| [`LoaderKit.Core`](https://www.nuget.org/packages/LoaderKit.Core) | spec 模型、解析器、校验和参考求值器（`net8.0`、`netstandard2.0`），不依赖任何 UI |

## 安装 {#install}

```sh
dotnet add package LoaderKit.WinUI
```

如果要安装 release candidate 版本，请加上 `--prerelease`。`LoaderKit.WinUI` 会一并带上 `LoaderKit.Core`。支持 Windows 10 版本 1809（build 17763）及更高版本。

## XAML

```xml
<Page
    xmlns:lk="using:LoaderKit.WinUI">

    <StackPanel Spacing="16">
        <!-- 默认是 40 × 40 的白色 BallPulse -->
        <lk:LoaderKitIndicator />

        <lk:LoaderKitIndicator Indicator="BallSpinFadeLoader" Color="DodgerBlue" Width="64" Height="64" />

        <lk:LoaderKitIndicator Indicator="SquareSpin" Speed="0.5" IsAnimating="{x:Bind ViewModel.IsBusy, Mode=OneWay}" />
    </StackPanel>
</Page>
```

## C#

```csharp
using LoaderKit;
using LoaderKit.WinUI;
using Microsoft.UI;

var indicator = new LoaderKitIndicator
{
    Indicator = "BallPulse",
    Params = new Dictionary<string, double> { ["count"] = 5, ["minScale"] = 0.5 },
    Colors = new[] { Colors.Tomato, Colors.Gold, Colors.MediumSeaGreen },
    Speed = 1.5,
};

indicator.IsAnimating = false;   // 定格；HidesWhenStopped 为 true（默认）时同时隐藏
indicator.CycleProgress = 0.25;  // 画出动画周期四分之一处的静止画面
indicator.CycleProgress = null;  // 时钟从原来的位置继续
```

## 属性 {#properties}

除了只读的 `SpecError`，所有属性都是依赖属性，因此可以在 XAML 中绑定。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `Indicator` | `string?` | `"BallPulse"` | 内置加载动画的名称，见 `BuiltinIndicators.Names` |
| `Spec` | `string?` | `null` | JSON 格式的自定义 spec，优先于 `Indicator` |
| `IndicatorSpec` | `LoaderKit.IndicatorSpec?` | `null` | 已解析的 spec，优先于 `Spec` 和 `Indicator` |
| `Params` | `IReadOnlyDictionary<string, double>?` | `null` | 按名称覆盖参数，未知名称会被忽略 |
| `Color` | `Windows.UI.Color` | 白色 | 所有元素的颜色 |
| `Colors` | `IReadOnlyList<Color>?` | `null` | 元素 `i` 使用 `Colors[i % Colors.Count]`，会覆盖 `Color` |
| `Speed` | `double` | `1` | 播放速率，小于等于 0 时暂停 |
| `IsAnimating` | `bool` | `true` | 停止时定格动画，再次启动从定格处继续 |
| `HidesWhenStopped` | `bool` | `true` | 停止时不绘制 |
| `CycleProgress` | `double?` | `null` | 动画周期中的某个位置，取值 [0, 1]，设置后绘制这一帧而不播放动画 |
| `RespectsReduceMotion` | `bool` | `true` | Windows 关闭动画效果时绘制静止画面 |
| `SpecError` | `InvalidIndicatorSpecException?` | 只读 | 没有绘制的原因 |

事件：名称或 spec 无法使用时，会触发 `SpecFailed`（`EventHandler<InvalidIndicatorSpecException>`）。控件的属性 setter 永远不会抛异常。

在 UI Automation 中，控件会把自己报告为进度条。

## 进度指示器 {#progress}

`LoaderKitProgress` 用来显示任务完成了多少：9 种 type、30 种样式，支持确定与不确定状态，value 平滑过渡。

```xml
<lk:LoaderKitProgress Type="Linear" Variant="Wavy" Value="{x:Bind ViewModel.Progress, Mode=OneWay}" />

<lk:LoaderKitProgress Type="Border">
    <Button Content="Upload" />
</lk:LoaderKitProgress>
```

控件使用 Win2D 绘制，`LoaderKit.WinUI` 会把它作为依赖一起引入。`Value` 的类型是 `double?`：null 表示不确定状态。

所有 type、variant 和选项见[进度指示器](/zh/guide/progress)。

## 自定义 spec {#custom-specs}

::: warning 实验性功能
自己编写 spec 目前仍是实验性功能：在 schema 宣布稳定之前，次版本更新可能会改动它。内置加载动画不受影响，因为它们和配套的引擎一起发布。
:::

把 JSON 赋给 `Spec`，或者自己用 `IndicatorSpec.Parse` 或 `IndicatorSpec.TryParse` 解析，一次就能看到所有问题：

```csharp
using LoaderKit;

string json = File.ReadAllText("typing-dots.json");

indicator.Spec = json;

// 或者自己解析。
if (!IndicatorSpec.TryParse(json, out var spec, out var errors))
{
    foreach (var error in errors) Debug.WriteLine(error);   // 例如 "tracks[0].keyTimes must be non-decreasing"
}
else
{
    indicator.IndicatorSpec = spec;
}
```

`IndicatorSpec.Parse(json)` 会抛出 `InvalidIndicatorSpecException`，它的 `Errors` 列出了所有问题。对于用代码构建的 spec，`spec.Validate()` 会返回其中的问题。

::: tip 在 XAML 中写 JSON
在 XAML 中，`{` 表示标记扩展的开始。可以把 JSON 放到资源里，或者转义开头的大括号：`Spec="{}{ ... }"`。
:::

### 用 C\# 构建 spec {#building-a-spec-in-c}

```csharp
var pulse = new IndicatorSpec("Pulse", duration: 1, new IndicatorPart(new SingleLayout(), new CircleShape())
{
    Tracks = new[]
    {
        new Track(AnimatableProperty.Scale, new double[] { 0, 1 }, new Num[] { 0, 1 }) { Easing = Easing.EaseOut },
        new Track(AnimatableProperty.Opacity, new double[] { 0, 1 }, new Num[] { 1, 0 }),
    },
});

var problems = pulse.Validate();   // 有效时为空
indicator.IndicatorSpec = pulse;
```

## 不使用控件 {#without-the-control}

`LoaderKit.Core` 不依赖任何 UI，可以配合其他渲染器来绘制加载动画：

```csharp
var prepared = new PreparedIndicator(BuiltinIndicators.Get("BallPulse"));
var states = new ElementState[prepared.ElementCount];

prepared.Evaluate(t: 0.3, states);   // 位置、尺寸、缩放、不透明度、旋转、裁剪和组变换
var matrix = ElementTransform.Create(states[0], prepared.Perspective, boxSize: 40);
var shape = prepared.Parts[states[0].Part].Shape;   // 已填好默认值的形状
```

`IndicatorPlayback` 实现了各平台共用的播放规则（时钟、速度、停止、周期进度、减弱动态效果）。

## 另请参阅 {#see-also}

- 各平台的代码示例见[自定义](/zh/guide/customizing)和[播放控制](/zh/guide/playback)。
- 校验和限制见[使用 spec](/zh/spec/using)。
