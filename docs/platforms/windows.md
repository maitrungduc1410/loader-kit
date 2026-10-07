---
description: "Use LoaderKit on Windows: install the LoaderKit.WinUI NuGet package, add the LoaderKitIndicator control in XAML or C#, and load custom specs."
---

# Windows

LoaderKit for Windows draws indicators with `Microsoft.UI.Composition`, for WinUI 3 and the Windows App SDK.

| Package | Contents |
| --- | --- |
| [`LoaderKit.WinUI`](https://www.nuget.org/packages/LoaderKit.WinUI) | The `LoaderKitIndicator` control (`net8.0-windows10.0.19041.0`, Windows App SDK 1.8 or later) |
| [`LoaderKit.Core`](https://www.nuget.org/packages/LoaderKit.Core) | Spec model, parser, validation and the reference evaluator (`net8.0`, `netstandard2.0`), with no UI dependency |

## Install

```sh
dotnet add package LoaderKit.WinUI
```

Add `--prerelease` to install a release candidate. `LoaderKit.WinUI` brings `LoaderKit.Core` with it. It supports Windows 10 version 1809 (build 17763) and later.

## XAML

```xml
<Page
    xmlns:lk="using:LoaderKit.WinUI">

    <StackPanel Spacing="16">
        <!-- 40 by 40, white BallPulse by default -->
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

indicator.IsAnimating = false;   // freezes; with HidesWhenStopped (default true) it also hides
indicator.CycleProgress = 0.25;  // draws a still frame a quarter into the animation cycle
indicator.CycleProgress = null;  // the clock resumes from where it was
```

## Properties

Every property except the read-only `SpecError` is a dependency property, so you can bind them in XAML.

| Property | Type | Default | Notes |
| --- | --- | --- | --- |
| `Indicator` | `string?` | `"BallPulse"` | Name of a built-in indicator, see `BuiltinIndicators.Names` |
| `Spec` | `string?` | `null` | A custom spec as JSON. Wins over `Indicator` |
| `IndicatorSpec` | `LoaderKit.IndicatorSpec?` | `null` | A parsed spec. Wins over `Spec` and `Indicator` |
| `Params` | `IReadOnlyDictionary<string, double>?` | `null` | Param overrides by name. Unknown names are ignored |
| `Color` | `Windows.UI.Color` | white | Color of every element |
| `Colors` | `IReadOnlyList<Color>?` | `null` | Element `i` uses `Colors[i % Colors.Count]`. Overrides `Color` |
| `Speed` | `double` | `1` | Playback rate. 0 or less pauses |
| `IsAnimating` | `bool` | `true` | Stopping freezes the animation. Starting again continues from there |
| `HidesWhenStopped` | `bool` | `true` | Draw nothing while stopped |
| `CycleProgress` | `double?` | `null` | A point of the animation cycle in [0, 1] to draw instead of animating |
| `RespectsReduceMotion` | `bool` | `true` | Draw a still frame when Windows animation effects are off |
| `SpecError` | `InvalidIndicatorSpecException?` | read-only | Why nothing is drawn |

Event: `SpecFailed` (`EventHandler<InvalidIndicatorSpecException>`) is raised when a name or spec cannot be used. The control never throws from a property setter.

For UI Automation, the control reports itself as a progress bar.

## Custom specs

::: warning Experimental
Writing your own spec is experimental: until the schema is declared stable, it may change in a minor release. Built-in indicators are not affected, since they ship with the matching engine.
:::

Set JSON on `Spec`, or parse it yourself with `IndicatorSpec.Parse` or `IndicatorSpec.TryParse` to see every problem at once:

```csharp
using LoaderKit;

string json = File.ReadAllText("typing-dots.json");

indicator.Spec = json;

// Or parse it yourself.
if (!IndicatorSpec.TryParse(json, out var spec, out var errors))
{
    foreach (var error in errors) Debug.WriteLine(error);   // e.g. "tracks[0].keyTimes must be non-decreasing"
}
else
{
    indicator.IndicatorSpec = spec;
}
```

`IndicatorSpec.Parse(json)` throws `InvalidIndicatorSpecException`, whose `Errors` lists every problem. `spec.Validate()` returns the problems of a spec built in code.

::: tip JSON in XAML
In XAML, `{` starts a markup extension. Put the JSON in a resource, or escape the leading brace: `Spec="{}{ ... }"`.
:::

### Building a spec in C\#

```csharp
var pulse = new IndicatorSpec("Pulse", duration: 1, new IndicatorPart(new SingleLayout(), new CircleShape())
{
    Tracks = new[]
    {
        new Track(AnimatableProperty.Scale, new double[] { 0, 1 }, new Num[] { 0, 1 }) { Easing = Easing.EaseOut },
        new Track(AnimatableProperty.Opacity, new double[] { 0, 1 }, new Num[] { 1, 0 }),
    },
});

var problems = pulse.Validate();   // empty when valid
indicator.IndicatorSpec = pulse;
```

## Without the control

`LoaderKit.Core` has no UI dependency. Use it to draw indicators with another renderer:

```csharp
var prepared = new PreparedIndicator(BuiltinIndicators.Get("BallPulse"));
var states = new ElementState[prepared.ElementCount];

prepared.Evaluate(t: 0.3, states);   // positions, sizes, scales, opacity, rotations, trims and group transform
var matrix = ElementTransform.Create(states[0], prepared.Perspective, boxSize: 40);
var shape = prepared.Parts[states[0].Part].Shape;   // the shape with its defaults filled in
```

`IndicatorPlayback` implements the shared playback rules (clock, speed, stop, cycle progress, reduced motion).

## See also

- [Customizing](/guide/customizing) and [Playback](/guide/playback) for code on every platform.
- [Using a spec](/spec/using) for validation and limits.
