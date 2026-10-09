using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;

namespace LoaderKit.Tests;

public class ProgressVectorTests
{
    private static readonly string Directory = Path.Combine(TestVectors.Directory, "progress");

    private static JsonElement Load(string file)
    {
        using var document = JsonDocument.Parse(File.ReadAllText(Path.Combine(Directory, file)));
        return document.RootElement.Clone();
    }

    private static readonly double Tolerance = Load("index.json").GetProperty("tolerance").GetDouble();

    private static IEnumerable<string> Files => Load("index.json").GetProperty("files").EnumerateArray().Select(file => file.GetString()!);

    private static string Lower(Enum value) => value.ToString().ToLowerInvariant();

    private static Dictionary<string, object?> Json(ProgressPaint paint)
    {
        static List<object?> Stops(IReadOnlyList<ProgressColorStop> stops) =>
            stops.Select(stop => (object?)new Dictionary<string, object?> { ["offset"] = stop.Offset, ["color"] = Lower(stop.Color), ["alpha"] = stop.Alpha }).ToList();
        return paint switch
        {
            ProgressPaint.Solid p => new() { ["type"] = "solid", ["color"] = Lower(p.Color), ["alpha"] = p.Alpha },
            ProgressPaint.Linear p => new() { ["type"] = "linear", ["x0"] = p.X0, ["y0"] = p.Y0, ["x1"] = p.X1, ["y1"] = p.Y1, ["stops"] = Stops(p.Stops) },
            ProgressPaint.Radial p => new() { ["type"] = "radial", ["cx"] = p.Cx, ["cy"] = p.Cy, ["r"] = p.R, ["stops"] = Stops(p.Stops) },
            ProgressPaint.Conic p => new() { ["type"] = "conic", ["cx"] = p.Cx, ["cy"] = p.Cy, ["start"] = p.Start, ["stops"] = Stops(p.Stops) },
            _ => throw new InvalidOperationException(),
        };
    }

    private static Dictionary<string, object?> Json(ProgressClipShape shape) => shape switch
    {
        ProgressClipShape.Rect s => new() { ["type"] = "rect", ["x"] = s.X, ["y"] = s.Y, ["width"] = s.Width, ["height"] = s.Height, ["radius"] = s.Radius },
        ProgressClipShape.Circle s => new() { ["type"] = "circle", ["cx"] = s.Cx, ["cy"] = s.Cy, ["r"] = s.R },
        ProgressClipShape.Polygon s => new() { ["type"] = "polygon", ["points"] = s.Points },
        _ => throw new InvalidOperationException(),
    };

    private static Dictionary<string, object?> Json(ProgressCommand command) => command switch
    {
        ProgressCommand.Line c => new() { ["op"] = "line", ["x0"] = c.X0, ["y0"] = c.Y0, ["x1"] = c.X1, ["y1"] = c.Y1, ["lineWidth"] = c.LineWidth, ["cap"] = Lower(c.Cap), ["paint"] = Json(c.Paint) },
        ProgressCommand.Arc c => new() { ["op"] = "arc", ["cx"] = c.Cx, ["cy"] = c.Cy, ["r"] = c.R, ["start"] = c.Start, ["end"] = c.End, ["lineWidth"] = c.LineWidth, ["cap"] = Lower(c.Cap), ["paint"] = Json(c.Paint) },
        ProgressCommand.Polyline c => new() { ["op"] = "polyline", ["points"] = c.Points, ["closed"] = c.Closed, ["lineWidth"] = c.LineWidth, ["cap"] = Lower(c.Cap), ["paint"] = Json(c.Paint) },
        ProgressCommand.Circle c => new() { ["op"] = "circle", ["cx"] = c.Cx, ["cy"] = c.Cy, ["r"] = c.R, ["paint"] = Json(c.Paint) },
        ProgressCommand.Rect c => new() { ["op"] = "rect", ["x"] = c.X, ["y"] = c.Y, ["width"] = c.Width, ["height"] = c.Height, ["radius"] = c.Radius, ["paint"] = Json(c.Paint) },
        ProgressCommand.StrokeRect c => new() { ["op"] = "strokeRect", ["x"] = c.X, ["y"] = c.Y, ["width"] = c.Width, ["height"] = c.Height, ["radius"] = c.Radius, ["lineWidth"] = c.LineWidth, ["paint"] = Json(c.Paint) },
        ProgressCommand.Polygon c => new() { ["op"] = "polygon", ["points"] = c.Points, ["paint"] = Json(c.Paint) },
        ProgressCommand.Sector c => new() { ["op"] = "sector", ["cx"] = c.Cx, ["cy"] = c.Cy, ["r"] = c.R, ["start"] = c.Start, ["end"] = c.End, ["paint"] = Json(c.Paint) },
        ProgressCommand.Text c => new() { ["op"] = "text", ["x"] = c.X, ["y"] = c.Y, ["size"] = c.Size, ["text"] = c.Value, ["align"] = c.AlignRight ? "right" : "center", ["paint"] = Json(c.Paint) },
        ProgressCommand.Clip c => new() { ["op"] = "clip", ["shape"] = Json(c.Shape), ["commands"] = c.Commands.Select(item => (object?)Json(item)).ToList() },
        _ => throw new InvalidOperationException(),
    };

    private static Dictionary<string, object?> Json(ResolvedProgress p) => new()
    {
        ["type"] = Lower(p.Type), ["variant"] = Lower(p.Variant), ["thickness"] = p.Thickness, ["trackGap"] = p.TrackGap,
        ["segments"] = (double)p.Segments, ["showLabel"] = p.ShowLabel, ["stopIndicator"] = p.StopIndicator,
        ["strokeCap"] = Lower(p.StrokeCap), ["amplitude"] = p.Amplitude, ["wavelength"] = p.Wavelength,
        ["waveSpeed"] = p.WaveSpeed, ["sweepAngle"] = p.SweepAngle, ["cornerRadius"] = p.CornerRadius, ["speed"] = p.Speed,
    };

    private static Dictionary<string, object?> Json(ProgressAnimator animator)
    {
        var s = animator.State;
        return new()
        {
            ["indeterminate"] = s.Indeterminate, ["value"] = s.Value, ["buffer"] = s.Buffer, ["wave"] = s.Wave, ["time"] = s.Time,
            ["indeterminateTime"] = s.IndeterminateTime, ["target"] = animator.Target, ["moving"] = animator.Moving,
        };
    }

    private static double? Number(JsonElement json, string name) =>
        json.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.Number ? value.GetDouble() : null;

    private static bool? Bool(JsonElement json, string name) =>
        json.TryGetProperty(name, out var value) && value.ValueKind is JsonValueKind.True or JsonValueKind.False ? value.GetBoolean() : null;

    private static T? EnumValue<T>(JsonElement json, string name) where T : struct, Enum =>
        json.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String && Enum.TryParse<T>(value.GetString(), true, out var result) ? result : null;

    private static ProgressOptions Options(JsonElement json) => new()
    {
        Type = EnumValue<ProgressType>(json, "type"),
        Variant = EnumValue<ProgressVariant>(json, "variant"),
        Thickness = Number(json, "thickness"),
        TrackGap = Number(json, "trackGap"),
        Segments = Number(json, "segments"),
        ShowLabel = Bool(json, "showLabel"),
        StopIndicator = Bool(json, "stopIndicator"),
        StrokeCap = EnumValue<ProgressStrokeCap>(json, "strokeCap"),
        Amplitude = Number(json, "amplitude"),
        Wavelength = Number(json, "wavelength"),
        WaveSpeed = Number(json, "waveSpeed"),
        SweepAngle = Number(json, "sweepAngle"),
        CornerRadius = Number(json, "cornerRadius"),
        Speed = Number(json, "speed"),
    };

    private static ProgressState State(JsonElement json) => new(
        json.GetProperty("indeterminate").GetBoolean(),
        json.GetProperty("value").GetDouble(),
        json.GetProperty("buffer").GetDouble(),
        json.GetProperty("wave").GetDouble(),
        json.GetProperty("time").GetDouble(),
        json.GetProperty("indeterminateTime").GetDouble());

    private static void AssertClose(object? actual, JsonElement expected, string path)
    {
        switch (actual)
        {
            case null:
                Assert.True(expected.ValueKind == JsonValueKind.Null, $"{path}: expected {expected}, got null");
                break;
            case bool value:
                Assert.True(expected.ValueKind is JsonValueKind.True or JsonValueKind.False, $"{path}: not a boolean");
                Assert.True(expected.GetBoolean() == value, $"{path}: {value} != {expected}");
                break;
            case double value:
                Assert.True(expected.ValueKind == JsonValueKind.Number, $"{path}: expected {expected}, got {value}");
                Assert.True(Math.Abs(value - expected.GetDouble()) <= Tolerance, $"{path}: {value} != {expected.GetDouble()}");
                break;
            case string value:
                Assert.True(expected.ValueKind == JsonValueKind.String && expected.GetString() == value, $"{path}: {value} != {expected}");
                break;
            case IDictionary<string, object?> map:
                Assert.True(expected.ValueKind == JsonValueKind.Object, $"{path}: not an object");
                Assert.Equal(expected.EnumerateObject().Select(p => p.Name).OrderBy(n => n, StringComparer.Ordinal), map.Keys.OrderBy(n => n, StringComparer.Ordinal));
                foreach (var pair in map) AssertClose(pair.Value, expected.GetProperty(pair.Key), $"{path}.{pair.Key}");
                break;
            case IEnumerable<double> numbers:
                AssertList(numbers.Select(n => (object?)n).ToList(), expected, path);
                break;
            case IEnumerable<object?> list:
                AssertList(list.ToList(), expected, path);
                break;
            default:
                throw new InvalidOperationException($"{path}: unexpected {actual.GetType()}");
        }
    }

    private static void AssertList(List<object?> list, JsonElement expected, string path)
    {
        Assert.True(expected.ValueKind == JsonValueKind.Array, $"{path}: not an array");
        Assert.True(expected.GetArrayLength() == list.Count, $"{path}: length {list.Count} != {expected.GetArrayLength()}");
        var i = 0;
        foreach (var item in expected.EnumerateArray())
        {
            AssertClose(list[i], item, $"{path}[{i}]");
            i++;
        }
    }

    [Fact]
    public void IndexListsEveryFile()
    {
        var onDisk = System.IO.Directory.GetFiles(Directory, "*.json").Select(Path.GetFileName).Where(name => name != "index.json").OrderBy(name => name, StringComparer.Ordinal);
        Assert.Equal(onDisk, Files.OrderBy(name => name, StringComparer.Ordinal));
        Assert.Equal(12, Files.Count());
    }

    [Fact]
    public void ResolveVectors()
    {
        foreach (var c in Load("resolve.json").GetProperty("cases").EnumerateArray())
        {
            var name = c.GetProperty("description").GetString()!;
            var resolved = new ResolvedProgress(Options(c.GetProperty("options")));
            AssertClose(Json(resolved), c.GetProperty("resolved"), name);
            AssertClose(new Dictionary<string, object?> { ["width"] = resolved.IntrinsicWidth, ["height"] = resolved.IntrinsicHeight }, c.GetProperty("intrinsicSize"), $"{name} size");
            AssertClose(resolved.ContentInset, c.GetProperty("contentInset"), $"{name} inset");
        }
    }

    public static IEnumerable<object[]> GeometryFiles => Files.Where(file => file.StartsWith("geometry-", StringComparison.Ordinal)).Select(file => new object[] { file });

    [Theory]
    [MemberData(nameof(GeometryFiles))]
    public void GeometryVectors(string file)
    {
        var cases = Load(file).GetProperty("cases");
        Assert.True(cases.GetArrayLength() > 0);
        foreach (var c in cases.EnumerateArray())
        {
            var drawing = ProgressGeometry.Commands(
                new ResolvedProgress(Options(c.GetProperty("options"))),
                State(c.GetProperty("state")),
                c.GetProperty("width").GetDouble(),
                c.GetProperty("height").GetDouble());
            var name = $"{file} {c.GetProperty("description").GetString()}";
            AssertClose(drawing.X, c.GetProperty("x"), $"{name} x");
            AssertClose(drawing.Y, c.GetProperty("y"), $"{name} y");
            AssertClose(drawing.Commands.Select(command => (object?)Json(command)).ToList(), c.GetProperty("commands"), name);
        }
    }

    [Fact]
    public void AnimatorVectors()
    {
        static double? Value(JsonElement json) => json.ValueKind switch
        {
            JsonValueKind.Number => json.GetDouble(),
            JsonValueKind.String when json.GetString() == "NaN" => double.NaN,
            _ => null,
        };
        foreach (var scenario in Load("animator.json").GetProperty("scenarios").EnumerateArray())
        {
            var name = scenario.GetProperty("description").GetString()!;
            var initial = scenario.GetProperty("initial");
            var animator = new ProgressAnimator(Value(initial.GetProperty("value")), Value(initial.GetProperty("buffer")));
            AssertClose(Json(animator), scenario.GetProperty("initialState"), $"{name} initial");
            var speed = scenario.GetProperty("speed").GetDouble();
            var reduceMotion = scenario.GetProperty("reduceMotion").GetBoolean();
            var events = scenario.GetProperty("events").EnumerateArray().ToList();
            var snapshots = scenario.GetProperty("snapshots").EnumerateArray().ToList();
            var frames = scenario.GetProperty("frames").GetInt32();
            var every = scenario.GetProperty("every").GetInt32();
            var fps = scenario.GetProperty("fps").GetDouble();
            var next = 0;
            for (var frame = 0; frame < frames; frame++)
            {
                foreach (var e in events.Where(e => e.GetProperty("frame").GetInt32() == frame))
                {
                    var now = frame / fps;
                    switch (e.GetProperty("set").GetString())
                    {
                        case "value": animator.SetValue(Value(e.GetProperty("value")), now, e.GetProperty("smooth").GetBoolean()); break;
                        case "buffer": animator.SetBuffer(Value(e.GetProperty("value")), now, e.GetProperty("smooth").GetBoolean()); break;
                        case "speed": speed = e.GetProperty("value").GetDouble(); break;
                        default: reduceMotion = e.GetProperty("value").GetBoolean(); break;
                    }
                }
                animator.Step(1.0 / fps, speed, reduceMotion);
                if (frame % every != 0) continue;
                var expected = snapshots[next++];
                Assert.Equal(frame, expected.GetProperty("frame").GetInt32());
                var actual = Json(animator);
                foreach (var pair in actual) AssertClose(pair.Value, expected.GetProperty(pair.Key), $"{name} frame {frame} {pair.Key}");
                Assert.Equal(actual.Count + 1, expected.EnumerateObject().Count());
            }
            Assert.Equal(snapshots.Count, next);
        }
    }

    [Fact]
    public void LabelRoundsHalfUp()
    {
        Assert.Equal("13%", ProgressGeometry.Label(0.125));
        Assert.Equal("1%", ProgressGeometry.Label(0.005));
        Assert.Equal("100%", ProgressGeometry.Label(2));
        Assert.Equal("0%", ProgressGeometry.Label(-1));
    }

    [Fact]
    public void NonFiniteInput()
    {
        Assert.True(new ProgressAnimator(double.NaN).Indeterminate);
        Assert.Equal(1, new ProgressAnimator(double.PositiveInfinity).Target);
        var resolved = new ResolvedProgress(new ProgressOptions { Type = ProgressType.Linear, Thickness = double.NaN, Segments = double.PositiveInfinity, Speed = double.NaN });
        Assert.Equal(4, resolved.Thickness);
        Assert.Equal(1, resolved.Segments);
        Assert.Equal(1, resolved.Speed);
        Assert.Empty(ProgressGeometry.Commands(resolved, new ProgressAnimator(0.5).State, double.NaN, 10).Commands);
    }
}
