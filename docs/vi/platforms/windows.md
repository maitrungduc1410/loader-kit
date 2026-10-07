---
description: "Dùng LoaderKit trên Windows: cài package NuGet LoaderKit.WinUI, thêm control LoaderKitIndicator bằng XAML hoặc C#, và load spec tùy chỉnh."
---

# Windows

LoaderKit cho Windows vẽ indicator bằng `Microsoft.UI.Composition`, dành cho WinUI 3 và Windows App SDK.

| Package | Nội dung |
| --- | --- |
| [`LoaderKit.WinUI`](https://www.nuget.org/packages/LoaderKit.WinUI) | Control `LoaderKitIndicator` (`net8.0-windows10.0.19041.0`, Windows App SDK 1.8 trở lên) |
| [`LoaderKit.Core`](https://www.nuget.org/packages/LoaderKit.Core) | Model của spec, parser, phần validate và reference evaluator (`net8.0`, `netstandard2.0`), không phụ thuộc UI |

## Cài đặt {#install}

```sh
dotnet add package LoaderKit.WinUI
```

Thêm `--prerelease` nếu muốn cài bản release candidate. Cài `LoaderKit.WinUI` là có luôn `LoaderKit.Core`. Package hỗ trợ Windows 10 version 1809 (build 17763) trở lên.

## XAML {#xaml}

```xml
<Page
    xmlns:lk="using:LoaderKit.WinUI">

    <StackPanel Spacing="16">
        <!-- Mặc định: 40 x 40, BallPulse màu trắng -->
        <lk:LoaderKitIndicator />

        <lk:LoaderKitIndicator Indicator="BallSpinFadeLoader" Color="DodgerBlue" Width="64" Height="64" />

        <lk:LoaderKitIndicator Indicator="SquareSpin" Speed="0.5" IsAnimating="{x:Bind ViewModel.IsBusy, Mode=OneWay}" />
    </StackPanel>
</Page>
```

## C# {#c}

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

indicator.IsAnimating = false;   // freeze; với HidesWhenStopped (mặc định true) thì ẩn luôn
indicator.CycleProgress = 0.25;  // vẽ frame tĩnh tại 1/4 chu kỳ animation
indicator.CycleProgress = null;  // đồng hồ chạy tiếp từ chỗ cũ
```

## Property {#properties}

Mọi property, trừ `SpecError` chỉ đọc, đều là dependency property, nên bạn bind được trong XAML.

| Property | Kiểu | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| `Indicator` | `string?` | `"BallPulse"` | Tên một indicator có sẵn, xem `BuiltinIndicators.Names` |
| `Spec` | `string?` | `null` | Một spec tùy chỉnh dạng JSON. Được ưu tiên hơn `Indicator` |
| `IndicatorSpec` | `LoaderKit.IndicatorSpec?` | `null` | Một spec đã parse. Được ưu tiên hơn `Spec` và `Indicator` |
| `Params` | `IReadOnlyDictionary<string, double>?` | `null` | Override params theo tên. Tên không tồn tại bị bỏ qua |
| `Color` | `Windows.UI.Color` | trắng | Màu của mọi phần tử |
| `Colors` | `IReadOnlyList<Color>?` | `null` | Phần tử `i` dùng `Colors[i % Colors.Count]`. Ghi đè `Color` |
| `Speed` | `double` | `1` | Tốc độ phát. Bằng 0 hoặc nhỏ hơn thì tạm dừng |
| `IsAnimating` | `bool` | `true` | Stop sẽ freeze animation. Start lại thì chạy tiếp từ đó |
| `HidesWhenStopped` | `bool` | `true` | Không vẽ gì khi đã dừng |
| `CycleProgress` | `double?` | `null` | Một điểm trong chu kỳ animation, trong khoảng [0, 1], để vẽ thay vì chạy animation |
| `RespectsReduceMotion` | `bool` | `true` | Vẽ frame tĩnh khi animation effects của Windows đang tắt |
| `SpecError` | `InvalidIndicatorSpecException?` | chỉ đọc | Lý do không vẽ được |

Event: `SpecFailed` (`EventHandler<InvalidIndicatorSpecException>`) được raise khi không dùng được tên hoặc spec. Control không bao giờ throw từ property setter.

Với UI Automation, control tự khai báo là một progress bar.

## Spec tùy chỉnh {#custom-specs}

::: warning Thử nghiệm
Tự viết spec vẫn đang ở giai đoạn thử nghiệm: cho đến khi schema được công bố là ổn định, nó vẫn có thể thay đổi trong một bản minor release. Indicator có sẵn không bị ảnh hưởng, vì chúng được đóng gói cùng đúng engine tương ứng.
:::

Gán JSON vào `Spec`, hoặc tự parse bằng `IndicatorSpec.Parse` hay `IndicatorSpec.TryParse` để thấy mọi lỗi cùng lúc:

```csharp
using LoaderKit;

string json = File.ReadAllText("typing-dots.json");

indicator.Spec = json;

// Hoặc tự parse.
if (!IndicatorSpec.TryParse(json, out var spec, out var errors))
{
    foreach (var error in errors) Debug.WriteLine(error);   // ví dụ "tracks[0].keyTimes must be non-decreasing"
}
else
{
    indicator.IndicatorSpec = spec;
}
```

`IndicatorSpec.Parse(json)` throw `InvalidIndicatorSpecException`, trong đó `Errors` liệt kê mọi lỗi. `spec.Validate()` trả về danh sách lỗi của một spec dựng bằng code.

::: tip JSON trong XAML
Trong XAML, `{` là ký tự mở đầu một markup extension. Hãy đặt JSON vào resource, hoặc escape dấu ngoặc nhọn đầu tiên: `Spec="{}{ ... }"`.
:::

### Dựng spec bằng C\# {#building-a-spec-in-c}

```csharp
var pulse = new IndicatorSpec("Pulse", duration: 1, new IndicatorPart(new SingleLayout(), new CircleShape())
{
    Tracks = new[]
    {
        new Track(AnimatableProperty.Scale, new double[] { 0, 1 }, new Num[] { 0, 1 }) { Easing = Easing.EaseOut },
        new Track(AnimatableProperty.Opacity, new double[] { 0, 1 }, new Num[] { 1, 0 }),
    },
});

var problems = pulse.Validate();   // rỗng khi hợp lệ
indicator.IndicatorSpec = pulse;
```

## Dùng không cần control {#without-the-control}

`LoaderKit.Core` không phụ thuộc UI. Bạn có thể dùng nó để vẽ indicator bằng một renderer khác:

```csharp
var prepared = new PreparedIndicator(BuiltinIndicators.Get("BallPulse"));
var states = new ElementState[prepared.ElementCount];

prepared.Evaluate(t: 0.3, states);   // vị trí, kích thước, scale, opacity, rotation, trim và group transform
var matrix = ElementTransform.Create(states[0], prepared.Perspective, boxSize: 40);
var shape = prepared.Parts[states[0].Part].Shape;   // shape đã được điền các giá trị mặc định
```

`IndicatorPlayback` hiện thực các quy tắc playback dùng chung (đồng hồ, speed, stop, cycle progress, reduce motion).

## Xem thêm {#see-also}

- [Tùy chỉnh](/vi/guide/customizing) và [Điều khiển animation](/vi/guide/playback): code cho mọi nền tảng.
- [Dùng spec](/vi/spec/using): validate và các giới hạn.
