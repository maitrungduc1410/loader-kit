using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace LoaderKit.Tests;

public class VectorTests
{
    public static TheoryData<string> Files()
    {
        var data = new TheoryData<string>();
        foreach (var file in TestVectors.Files) data.Add(file);
        return data;
    }

    [Fact]
    public void IndexListsVectors()
    {
        Assert.NotEmpty(TestVectors.Files);
        Assert.Equal(1e-6, TestVectors.Tolerance);
    }

    [Theory]
    [MemberData(nameof(Files))]
    public void MatchesReferenceEvaluator(string file)
    {
        var vector = TestVectors.Load(file);
        var tolerance = TestVectors.Tolerance;
        var specJson = vector.GetProperty("spec");
        Assert.Empty(IndicatorSpecValidator.Validate(specJson));
        var spec = IndicatorSpec.Parse(specJson);
        var parameters = vector.GetProperty("params").EnumerateObject()
            .ToDictionary(param => param.Name, param => param.Value.GetDouble());
        var indicator = new PreparedIndicator(spec, parameters);

        var samples = 0;
        foreach (var sample in vector.GetProperty("samples").EnumerateArray())
        {
            var t = sample.GetProperty("t").GetDouble();
            var expected = sample.GetProperty("elements").EnumerateArray().ToArray();
            var actual = indicator.Evaluate(t);
            Assert.Equal(expected.Length, actual.Length);
            Assert.Equal(expected.Length, IndicatorEvaluator.Evaluate(spec, t, parameters).Count);
            for (var i = 0; i < actual.Length; i++)
            {
                var fields = 0;
                foreach (var field in expected[i].EnumerateObject())
                {
                    var value = Field(actual[i], field.Name);
                    var want = field.Value.GetDouble();
                    Assert.True(
                        Math.Abs(value - want) <= tolerance,
                        $"{file} t={t} #{i} {field.Name}: {value:R} != {want:R}");
                    fields++;
                }
                Assert.Equal(21, fields);
            }
            samples++;
        }
        Assert.True(samples > 0);

        var shapes = vector.GetProperty("shapes").EnumerateArray().ToArray();
        Assert.Equal(shapes.Length, indicator.Parts.Count);
        for (var i = 0; i < shapes.Length; i++)
        {
            var shape = indicator.Parts[i].Shape;
            var fields = 0;
            foreach (var field in shapes[i].EnumerateObject())
            {
                if (field.Name == "type")
                {
                    Assert.Equal(field.Value.GetString(), ShapeTypeName(shape.Type));
                    continue;
                }
                var value = ShapeField(shape, field.Name);
                var want = field.Value.GetDouble();
                Assert.True(Math.Abs(value - want) <= tolerance, $"{file} shapes[{i}].{field.Name}: {value:R} != {want:R}");
                fields++;
            }
            Assert.Equal(ShapeFieldCount(shape.Type), fields);
        }

        var cycleProgresses = 0;
        foreach (var entry in vector.GetProperty("cycleProgress").EnumerateArray())
        {
            var cycleProgress = entry.GetProperty("cycleProgress").GetDouble();
            var want = entry.GetProperty("t").GetDouble();
            Assert.True(
                Math.Abs(indicator.TimeForCycleProgress(cycleProgress) - want) <= tolerance,
                $"{file} cycleProgress={cycleProgress}");
            Assert.True(Math.Abs(IndicatorEvaluator.TimeForCycleProgress(spec, cycleProgress, parameters) - want) <= tolerance);
            cycleProgresses++;
        }
        Assert.True(cycleProgresses > 0);
    }

    [Fact]
    public void EveryVectorFileIsListed()
    {
        var onDisk = System.IO.Directory.GetFiles(TestVectors.Directory, "*.json")
            .Select(System.IO.Path.GetFileName)
            .Where(name => name != "index.json")
            .OrderBy(name => name, StringComparer.Ordinal);
        Assert.Equal(onDisk, TestVectors.Files.OrderBy(name => name, StringComparer.Ordinal));
        Assert.Equal(40, TestVectors.Files.Count());
    }

    [Fact]
    public void BuiltinsMatchTheirVectors()
    {
        foreach (var name in BuiltinIndicators.Names)
        {
            Assert.Contains($"{name}.json", TestVectors.Files);
            var builtin = new PreparedIndicator(BuiltinIndicators.Get(name));
            var vector = TestVectors.Load($"{name}.json");
            var fromVector = new PreparedIndicator(IndicatorSpec.Parse(vector.GetProperty("spec")));
            foreach (var sample in vector.GetProperty("samples").EnumerateArray())
            {
                var t = sample.GetProperty("t").GetDouble();
                Assert.Equal(fromVector.Evaluate(t), builtin.Evaluate(t));
            }
        }
    }

    private static double Field(ElementState state, string name) => name switch
    {
        "index" => state.Index,
        "part" => state.Part,
        "cx" => state.Cx,
        "cy" => state.Cy,
        "width" => state.Width,
        "height" => state.Height,
        "scaleX" => state.ScaleX,
        "scaleY" => state.ScaleY,
        "opacity" => state.Opacity,
        "rotate" => state.Rotate,
        "rotateX" => state.RotateX,
        "rotateY" => state.RotateY,
        "translateX" => state.TranslateX,
        "translateY" => state.TranslateY,
        "strokeStart" => state.StrokeStart,
        "strokeEnd" => state.StrokeEnd,
        "groupScaleX" => state.GroupScaleX,
        "groupScaleY" => state.GroupScaleY,
        "groupRotate" => state.GroupRotate,
        "groupTranslateX" => state.GroupTranslateX,
        "groupTranslateY" => state.GroupTranslateY,
        _ => throw new KeyNotFoundException($"Unknown element field \"{name}\""),
    };

    private static double ShapeField(ResolvedShape shape, string name) => name switch
    {
        "startAngle" => shape.StartAngle,
        "sweep" => shape.Sweep,
        "cornerRadius" => shape.CornerRadius,
        "strokeWidth" => shape.StrokeWidth,
        "segments" => shape.Segments,
        _ => throw new KeyNotFoundException($"Unknown shape field \"{name}\""),
    };

    private static int ShapeFieldCount(ShapeType type) => type switch
    {
        ShapeType.Circle => 2,
        ShapeType.Rect => 1,
        ShapeType.Ring => 4,
        _ => 0,
    };

    private static string ShapeTypeName(ShapeType type) => type switch
    {
        ShapeType.Circle => "circle",
        ShapeType.Rect => "rect",
        ShapeType.Ring => "ring",
        ShapeType.Triangle => "triangle",
        _ => "line",
    };
}
