---
description: "Browse the 33 built-in LoaderKit indicators live, tune their params, colors and speed, and copy ready-made code for the web, Android, Apple and Windows."
---

# Built-in indicators

LoaderKit ships 33 indicators. They have the same names, params and motion on every platform. Click an indicator to open its panel: change params, color, speed and size, then copy the code for your platform.

<IndicatorGallery />

## Names and params

Only two built-ins take params today. Every other indicator has a fixed design, and you change it with color, colors, size and speed.

| Indicator | Params (default) | Cycle (s) |
| --- | --- | --- |
| `AudioEqualizer` | none | 4.3 |
| `BallBeat` | none | 0.7 |
| `BallClipRotate` | none | 0.75 |
| `BallClipRotateMultiple` | none | 1 |
| `BallClipRotatePulse` | none | 1 |
| `BallDoubleBounce` | none | 2 |
| `BallGridBeat` | none | 1 |
| `BallGridPulse` | none | 1 |
| `BallPulse` | `count` (3), `minScale` (0.3) | 0.75 |
| `BallPulseRise` | none | 1 |
| `BallPulseSync` | none | 0.6 |
| `BallRotate` | none | 1 |
| `BallRotateChase` | none | 1.5 |
| `BallScale` | none | 1 |
| `BallScaleMultiple` | none | 1 |
| `BallScaleRipple` | none | 1 |
| `BallScaleRippleMultiple` | none | 1.25 |
| `BallSpinFadeLoader` | `count` (8), `minScale` (0.4), `minOpacity` (0.3) | 1 |
| `BallTrianglePath` | none | 2 |
| `BallZigZag` | none | 0.7 |
| `BallZigZagDeflect` | none | 1.5 |
| `CircleStrokeSpin` | none | 1.7 |
| `CubeTransition` | none | 1.6 |
| `LineScale` | none | 1 |
| `LineScaleParty` | none | 1 |
| `LineScalePulseOut` | none | 1 |
| `LineScalePulseOutRapid` | none | 0.9 |
| `LineSpinFadeLoader` | none | 1.2 |
| `Orbit` | none | 1.9 |
| `Pacman` | none | 1 |
| `SemiCircleSpin` | none | 0.6 |
| `SquareSpin` | none | 3 |
| `TriangleSkewSpin` | none | 3 |

The cycle is the length of one loop at speed 1. Use [`speed`](/guide/playback#speed) to make it faster or slower.

### The params

| Param | Indicator | Meaning |
| --- | --- | --- |
| `count` | `BallPulse` | Number of balls in the row. Rounded to the nearest integer, at least 1. |
| `minScale` | `BallPulse` | Smallest scale of a ball during the pulse, from 0 to 1. |
| `count` | `BallSpinFadeLoader` | Number of balls on the ring. Rounded to the nearest integer, at least 1. |
| `minScale` | `BallSpinFadeLoader` | Smallest scale of a ball as it fades. |
| `minOpacity` | `BallSpinFadeLoader` | Lowest opacity of a ball as it fades. |

Params you pass that an indicator does not declare are ignored, so it is safe to keep the same params when you switch indicators. See [Customizing](/guide/customizing#params) for the code.

## List the names at runtime

::: code-group

```ts [TypeScript]
import { BUILTIN_INDICATOR_NAMES } from '@loader-kit/web';

console.log(BUILTIN_INDICATOR_NAMES); // ['AudioEqualizer', 'BallBeat', ...]
```

```kotlin [Kotlin]
import io.github.maitrungduc1410.loaderkit.BuiltinIndicators

BuiltinIndicators.names                 // List<String>
BuiltinIndicators["BallPulse"]          // IndicatorSpec?, null for an unknown name
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

## Unknown names

An unknown name never crashes. The view draws nothing and reports the problem:

| Platform | Where the error goes |
| --- | --- |
| Web | `specError` on `LoaderKitView`, the `onError` option, the `loaderkit-error` event of `<loader-kit>` |
| Android View | the `onError` callback (logged when it is not set) |
| Compose | a warning in Logcat |
| Apple | `specError` on `LoaderKitView` |
| Windows | `SpecError` and the `SpecFailed` event |

## Credits

The motion of the built-in indicators comes from [NVActivityIndicatorView](https://github.com/ninjaprox/NVActivityIndicatorView), [loaders.css](https://github.com/ConnorAtherton/loaders.css) and [DGActivityIndicatorView](https://github.com/gontovnik/DGActivityIndicatorView). See `THIRD_PARTY_NOTICES.md` in the repository.
