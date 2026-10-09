---
description: "Xem trực tiếp 50 indicator có sẵn của LoaderKit, chỉnh params, màu và tốc độ, rồi copy code dùng ngay cho web, Android, Apple và Windows."
---

# Indicator có sẵn

LoaderKit có sẵn 50 indicator. Trên mọi nền tảng chúng có cùng tên, cùng params và cùng chuyển động. Bấm vào một indicator để mở panel của nó: đổi params, màu, tốc độ và kích thước, rồi copy code cho nền tảng của bạn.

<IndicatorGallery />

## Tên và params {#names-and-params}

Hiện tại chỉ có hai indicator có sẵn nhận params. Các indicator còn lại có thiết kế cố định, bạn thay đổi chúng qua color, colors, kích thước và tốc độ.

| Indicator | Params (mặc định) | Chu kỳ (s) |
| --- | --- | --- |
| `Atom` | không có | 1.5 |
| `AudioEqualizer` | không có | 4.3 |
| `BallBeat` | không có | 0.7 |
| `BallClipRotate` | không có | 0.75 |
| `BallClipRotateMultiple` | không có | 1 |
| `BallClipRotatePulse` | không có | 1 |
| `BallDoubleBounce` | không có | 2 |
| `BallFall` | không có | 1 |
| `BallGridBeat` | không có | 1 |
| `BallGridPulse` | không có | 1 |
| `BallHelix` | không có | 1.8 |
| `BallHoneycomb` | không có | 1.4 |
| `BallMerge` | không có | 1.4 |
| `BallPulse` | `count` (3), `minScale` (0.3) | 0.75 |
| `BallPulseRise` | không có | 1 |
| `BallPulseSync` | không có | 0.6 |
| `BallRotate` | không có | 1 |
| `BallRotateChase` | không có | 1.5 |
| `BallScale` | không có | 1 |
| `BallScaleMultiple` | không có | 1 |
| `BallScaleRipple` | không có | 1 |
| `BallScaleRippleMultiple` | không có | 1.25 |
| `BallSpinFadeLoader` | `count` (8), `minScale` (0.4), `minOpacity` (0.3) | 1 |
| `BallSquareSpin` | không có | 1 |
| `BallTrianglePath` | không có | 2 |
| `BallZigZag` | không có | 0.7 |
| `BallZigZagDeflect` | không có | 1.5 |
| `ChasingDots` | không có | 2 |
| `CircleStrokeSpin` | không có | 1.7 |
| `CubeTransition` | không có | 1.6 |
| `JellyBox` | không có | 0.9 |
| `LineScale` | không có | 1 |
| `LineScaleParty` | không có | 1 |
| `LineScalePulseOut` | không có | 1 |
| `LineScalePulseOutRapid` | không có | 0.9 |
| `LineSlide` | không có | 1.5 |
| `LineSpinFadeLoader` | không có | 1.2 |
| `NewtonCradle` | không có | 1.2 |
| `Orbit` | không có | 1.9 |
| `Pacman` | không có | 1 |
| `Radar` | không có | 2 |
| `RunningDots` | không có | 2 |
| `SemiCircleSpin` | không có | 0.6 |
| `SquareGridFlip` | không có | 1.6 |
| `SquareGridWave` | không có | 1.3 |
| `SquareSpin` | không có | 3 |
| `Timer` | không có | 4 |
| `TriangleOrbit` | không có | 2.1 |
| `TriangleSkewSpin` | không có | 3 |
| `TripleArcSpin` | không có | 2.4 |

Chu kỳ là thời gian của một vòng lặp ở speed 1. Dùng [`speed`](/vi/guide/playback#speed) để làm nó nhanh hơn hoặc chậm hơn.

### Các params {#the-params}

| Param | Indicator | Ý nghĩa |
| --- | --- | --- |
| `count` | `BallPulse` | Số quả bóng trong hàng. Được làm tròn tới số nguyên gần nhất, tối thiểu là 1. |
| `minScale` | `BallPulse` | Scale nhỏ nhất của một quả bóng khi pulse, từ 0 đến 1. |
| `count` | `BallSpinFadeLoader` | Số quả bóng trên vòng tròn. Được làm tròn tới số nguyên gần nhất, tối thiểu là 1. |
| `minScale` | `BallSpinFadeLoader` | Scale nhỏ nhất của một quả bóng khi mờ dần. |
| `minOpacity` | `BallSpinFadeLoader` | Opacity thấp nhất của một quả bóng khi mờ dần. |

Params nào bạn truyền vào mà indicator không khai báo thì sẽ bị bỏ qua, nên khi đổi sang indicator khác bạn cứ giữ nguyên params cũng không sao. Code mẫu xem ở [Tùy chỉnh](/vi/guide/customizing#params).

## Lấy danh sách tên lúc runtime {#list-the-names-at-runtime}

::: code-group

```ts [TypeScript]
import { BUILTIN_INDICATOR_NAMES } from '@loader-kit/web';

console.log(BUILTIN_INDICATOR_NAMES); // ['Atom', 'AudioEqualizer', ...]
```

```kotlin [Kotlin]
import io.github.maitrungduc1410.loaderkit.BuiltinIndicators

BuiltinIndicators.names                 // List<String>
BuiltinIndicators["BallPulse"]          // IndicatorSpec?, null nếu tên không tồn tại
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

## Tên không tồn tại {#unknown-names}

Truyền một tên không tồn tại không bao giờ làm app crash. View sẽ không vẽ gì và báo lỗi:

| Nền tảng | Lỗi được báo ở đâu |
| --- | --- |
| Web | `specError` trên `LoaderKitView`, option `onError`, event `loaderkit-error` của `<loader-kit>` |
| Android View | callback `onError` (được ghi log nếu bạn không đặt callback) |
| Compose | một warning trong Logcat |
| Apple | `specError` trên `LoaderKitView` |
| Windows | `SpecError` và event `SpecFailed` |

## Ghi nhận {#credits}

Chuyển động của phần lớn indicator có sẵn lấy từ [NVActivityIndicatorView](https://github.com/ninjaprox/NVActivityIndicatorView), [loaders.css](https://github.com/ConnorAtherton/loaders.css), [DGActivityIndicatorView](https://github.com/gontovnik/DGActivityIndicatorView) và [SpinKit](https://github.com/tobiasahlin/SpinKit); số còn lại được thiết kế riêng cho LoaderKit. Xem `THIRD_PARTY_NOTICES.md` trong repo.
