# LoaderKit for Windows

Loading indicators described as data and rendered natively with `Microsoft.UI.Composition`, for WinUI 3 and the
Windows App SDK. Every indicator is a JSON spec shared with the Android and Apple engines, so the same name or spec
looks and moves the same on every platform. Full guide with live examples:
https://maitrungduc1410.github.io/loader-kit/platforms/windows

| Package | Contents |
| --- | --- |
| [`LoaderKit.WinUI`](https://www.nuget.org/packages/LoaderKit.WinUI) | The `LoaderKitIndicator` control (`net8.0-windows10.0.19041.0`, Windows App SDK 1.8+) |
| [`LoaderKit.Core`](https://www.nuget.org/packages/LoaderKit.Core) | Spec model, parser, validation and the reference evaluator (`net8.0`, `netstandard2.0`), no UI dependency |

## Install

```sh
dotnet add package LoaderKit.WinUI
```

`LoaderKit.WinUI` brings `LoaderKit.Core` with it. It supports Windows 10 version 1809 (build 17763) and later.

## XAML

```xml
<Page
    xmlns:lk="using:LoaderKit.WinUI">

    <StackPanel Spacing="16">
        <!-- 40 × 40 white BallPulse by default -->
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

foreach (var name in BuiltinIndicators.Names) Console.WriteLine(name);
```

| Property | Default | Notes |
| --- | --- | --- |
| `Indicator` | `"BallPulse"` | Name of a built-in indicator, see `BuiltinIndicators.Names` |
| `Spec` | `null` | A custom spec as JSON; wins over `Indicator` |
| `IndicatorSpec` | `null` | A custom `LoaderKit.IndicatorSpec`; wins over `Spec` and `Indicator` |
| `Params` | `null` | Overrides of the spec params by name; names the spec does not declare are ignored |
| `Color` | white | Color of every element |
| `Colors` | `null` | Element `i` uses `Colors[i % Colors.Count]`; overrides `Color` |
| `Speed` | `1` | Playback rate; `0` or less pauses. Changing it never makes the animation jump |
| `IsAnimating` | `true` | Stopping freezes the animation; starting again continues from there |
| `HidesWhenStopped` | `true` | Draw nothing while stopped |
| `CycleProgress` | `null` | A point of the animation cycle in [0, 1] to draw instead of animating. It is not the progress of a task: an indicator does not fill up as it goes from 0 to 1 |
| `RespectsReduceMotion` | `true` | When Windows animations are turned off, draw a still frame |

Changing `Indicator`, `Spec`, `IndicatorSpec` or `Params` restarts the animation. Changing colors, speed or size does
not. When a spec cannot be used the control draws nothing, sets `SpecError` and raises `SpecFailed`; it never throws
from a property setter.

## Built-in indicators

The 33 indicators of `BuiltinIndicators.Names`:

| | | |
| --- | --- | --- |
| `AudioEqualizer` | `BallBeat` | `BallClipRotate` |
| `BallClipRotateMultiple` | `BallClipRotatePulse` | `BallDoubleBounce` |
| `BallGridBeat` | `BallGridPulse` | `BallPulse` |
| `BallPulseRise` | `BallPulseSync` | `BallRotate` |
| `BallRotateChase` | `BallScale` | `BallScaleMultiple` |
| `BallScaleRipple` | `BallScaleRippleMultiple` | `BallSpinFadeLoader` |
| `BallTrianglePath` | `BallZigZag` | `BallZigZagDeflect` |
| `CircleStrokeSpin` | `CubeTransition` | `LineScale` |
| `LineScaleParty` | `LineScalePulseOut` | `LineScalePulseOutRapid` |
| `LineSpinFadeLoader` | `Orbit` | `Pacman` |
| `SemiCircleSpin` | `SquareSpin` | `TriangleSkewSpin` |

## Custom specs

> **Experimental.** Writing your own spec is experimental: until the schema is declared stable, it may change in a
> minor release. The built-in indicators are not affected, since they ship with the matching engine.

A spec lists elements placed in a unit box, a shape, and tracks that animate element properties over one cycle;
several groups of elements can be combined with `parts`. The schema is documented in
[`SPEC.md`](https://github.com/maitrungduc1410/loader-kit/blob/master/SPEC.md).

```csharp
const string json = """
    {
      "schemaVersion": 1,
      "name": "ThreeBars",
      "duration": 0.9,
      "params": { "low": 0.4 },
      "layout": { "type": "row", "count": 3, "gap": 0.15 },
      "shape": { "type": "line" },
      "stagger": { "each": 0.15 },
      "tracks": [
        { "property": "scaleY", "keyTimes": [0, 0.5, 1], "values": [1, { "$param": "low" }, 1], "easing": "easeInOut" }
      ]
    }
    """;

indicator.Spec = json;

// Or parse it yourself to see every problem at once.
if (!IndicatorSpec.TryParse(json, out var spec, out var errors))
{
    foreach (var error in errors) Debug.WriteLine(error);   // e.g. "tracks[0].keyTimes must be non-decreasing"
}
else
{
    indicator.IndicatorSpec = spec;
}
```

Specs can also be built in code:

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

// Several groups: element indices, and so colors, continue from one part to the next.
var orbit = new IndicatorSpec("Orbit", duration: 1, new[]
{
    new IndicatorPart(new SingleLayout(Size: 0.3), new CircleShape())
    {
        Tracks = new[] { new Track(AnimatableProperty.Scale, new double[] { 0, 0.5, 1 }, new Num[] { 1, 0.8, 1 }) },
    },
    new IndicatorPart(new SingleLayout(Size: 0.15, Y: 0.1), new CircleShape())
    {
        GroupTracks = new[] { new Track(AnimatableProperty.Rotate, new double[] { 0, 1 }, new Num[] { 0, 2 * Math.PI }) },
    },
});
```

In XAML, put JSON in a resource or escape the leading brace (`Spec="{}{ ... }"`), because `{` starts a markup
extension.

## Without the control

`LoaderKit.Core` has no UI dependency. Use it to draw indicators with another renderer:

```csharp
var prepared = new PreparedIndicator(BuiltinIndicators.Get("BallPulse"));
var states = new ElementState[prepared.ElementCount];

prepared.Evaluate(t: 0.3, states);   // positions, sizes, scales, opacity, rotations, trims and group transform
var matrix = ElementTransform.Create(states[0], prepared.Perspective, boxSize: 40);   // group transform included
var shape = prepared.Parts[states[0].Part].Shape;   // the shape with its defaults filled in
```

`IndicatorPlayback` implements the shared playback rules (clock, speed, stop, cycle progress, reduce motion).

## Building

```sh
dotnet test windows/LoaderKit.Core.Tests -c Release   # any OS; runs the shared test vectors
dotnet pack windows/LoaderKit.Core -c Release
dotnet pack windows/LoaderKit.WinUI -c Release        # Windows only
```

## License

MIT
