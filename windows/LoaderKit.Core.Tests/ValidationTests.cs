using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace LoaderKit.Tests;

public class ValidationTests
{
    private const string Base = """
        {
          "schemaVersion": 1,
          "name": "Test",
          "duration": 1,
          "layout": { "type": "single" },
          "shape": { "type": "circle" },
          "tracks": [{ "property": "opacity", "keyTimes": [0, 1], "values": [0, 1] }]
        }
        """;

    private const string BaseTrack = """{ "property": "opacity", "keyTimes": [0, 1], "values": [0, 1] }""";

    private const string BasePart = """
        {
          "layout": { "type": "single" },
          "shape": { "type": "circle" },
          "tracks": [{ "property": "opacity", "keyTimes": [0, 1], "values": [0, 1] }]
        }
        """;

    private static IReadOnlyList<string> ErrorsFor(string patch) => IndicatorSpecValidator.Validate(Patched(Base, patch));

    private static IReadOnlyList<string> WithTrack(string patch) =>
        ErrorsFor($$"""{ "tracks": [{{Patched(BaseTrack, patch)}}] }""");

    /// <summary>The base spec with its inline fields moved into <paramref name="parts"/>, then <paramref name="patch"/>.</summary>
    private static IReadOnlyList<string> WithParts(string parts, string patch = "{}")
    {
        var spec = JsonNode.Parse(Base)!.AsObject();
        spec.Remove("layout");
        spec.Remove("shape");
        spec.Remove("tracks");
        spec["parts"] = JsonNode.Parse(parts);
        return IndicatorSpecValidator.Validate(Patched(spec.ToJsonString(), patch));
    }

    private static string Part(string patch) => Patched(BasePart, patch);

    private static string Patched(string json, string patch)
    {
        var node = JsonNode.Parse(json)!.AsObject();
        foreach (var (key, value) in JsonNode.Parse(patch)!.AsObject().ToList())
        {
            node[key] = value?.DeepClone();
        }
        return node.ToJsonString();
    }

    private static readonly Track OpacityTrack = new(AnimatableProperty.Opacity, new double[] { 0, 1 }, new Num[] { 0, 1 });

    private static IndicatorPart TypedPart() =>
        new(new SingleLayout(), new CircleShape()) { Tracks = new[] { OpacityTrack } };

    private static IndicatorSpec TypedBase() => new("Test", 1, TypedPart());

    private static IndicatorSpec WithPart(IndicatorSpec spec, Func<IndicatorPart, IndicatorPart> change) =>
        spec with { Part = change(spec.Part!) };

    [Fact]
    public void BuiltinIndicatorsAreValid()
    {
        Assert.Equal(50, BuiltinIndicators.Names.Count);
        foreach (var name in BuiltinIndicators.Names)
        {
            Assert.Empty(IndicatorSpecValidator.Validate(BuiltinIndicators.GetJson(name)));
            Assert.Empty(BuiltinIndicators.Get(name).Validate());
        }
    }

    [Fact]
    public void TheBaseFixtureIsValid()
    {
        Assert.Empty(IndicatorSpecValidator.Validate(Base));
        Assert.Empty(TypedBase().Validate());
        Assert.Empty(WithParts($"[{BasePart}]"));
        Assert.Empty(new IndicatorSpec("Test", 1, new[] { TypedPart() }).Validate());
    }

    [Fact]
    public void RejectsBadTopLevelFields()
    {
        Assert.NotEmpty(ErrorsFor("""{ "schemaVersion": 2 }"""));
        Assert.NotEmpty(ErrorsFor("""{ "duration": 0 }"""));
        Assert.NotEmpty(ErrorsFor("""{ "perspective": -1 }"""));
        Assert.NotEmpty(ErrorsFor("""{ "params": { "a": "NaN" } }"""));
        Assert.NotEmpty((TypedBase() with { Params = new Dictionary<string, double> { ["a"] = double.NaN } }).Validate());
        Assert.NotEmpty(IndicatorSpecValidator.Validate("null"));
    }

    [Fact]
    public void RejectsBadLayoutsShapesAndStagger()
    {
        Assert.NotEmpty(ErrorsFor("""{ "layout": { "type": "row", "gap": 0.1 } }"""));
        Assert.NotEmpty(ErrorsFor("""{ "layout": { "type": "hex" } }"""));
        Assert.NotEmpty(ErrorsFor("""{ "shape": { "type": "ring" } }"""));
        Assert.NotEmpty(ErrorsFor("""{ "stagger": { "each": "fast" } }"""));
        Assert.NotEmpty(ErrorsFor("""{ "stagger": [0, "x"] }"""));
        Assert.NotEmpty(ErrorsFor("""{ "shape": { "type": "ring", "strokeWidth": 0.1, "sweep": 7 } }"""));
        Assert.NotEmpty(ErrorsFor("""{ "shape": { "type": "circle", "sweep": 0 } }"""));
        Assert.NotEmpty(ErrorsFor("""{ "layout": { "type": "stack" } }"""));
        Assert.NotEmpty(ErrorsFor("""{ "layout": { "type": "single", "x": "left" } }"""));
    }

    [Fact]
    public void NegativeStaggerOffsetsStartAnElementMidCycle()
    {
        Assert.Empty(ErrorsFor("""{ "layout": { "type": "stack", "count": 2 }, "stagger": [0, -0.5] }"""));
        Assert.Empty(ErrorsFor("""{ "layout": { "type": "stack", "count": 2 }, "stagger": { "each": -0.1, "start": 0.2 } }"""));
        var indicator = new PreparedIndicator(IndicatorSpec.Parse(Patched(Base, """
            { "layout": { "type": "stack", "count": 2 }, "stagger": [0, -0.25] }
            """)));
        Assert.Equal(0.25, indicator.Evaluate(0)[1].Opacity, 12);
    }

    [Fact]
    public void PartsRestDurationsAndGroupTracks()
    {
        Assert.Empty(WithParts($$"""[{{BasePart}}, { "layout": { "type": "single" }, "shape": { "type": "rect" }, "duration": 2 }]"""));
        Assert.NotEmpty(WithParts("[]"));
        Assert.NotEmpty(WithParts($"[{BasePart}]", """{ "layout": { "type": "single" } }"""));
        Assert.NotEmpty(WithParts($$"""[{{Part("""{ "duration": 0 }""")}}]"""));
        Assert.Contains(
            WithParts("""[{ "layout": { "type": "single" }, "shape": { "type": "circle" } }]"""),
            error => error.Contains("at least one track"));
        Assert.Empty(WithParts("""
            [{ "layout": { "type": "single" }, "shape": { "type": "circle" },
               "groupTracks": [{ "property": "rotate", "keyTimes": [0, 1], "values": [0, 1] }] }]
            """));
        Assert.NotEmpty(WithParts("""
            [{ "layout": { "type": "single" }, "shape": { "type": "circle" },
               "groupTracks": [{ "property": "rotateX", "keyTimes": [0, 1], "values": [0, 1] }] }]
            """));
        Assert.NotEmpty(ErrorsFor("""{ "durations": [1, 0] }"""));
        Assert.Empty(ErrorsFor("""{ "durations": [0.5], "rest": { "opacity": 0.5 } }"""));
        Assert.NotEmpty(ErrorsFor("""{ "rest": { "skew": 1 } }"""));
        Assert.NotEmpty(ErrorsFor("""{ "rest": { "opacity": { "$param": "missing" } } }"""));
    }

    [Fact]
    public void StrokeTrimsNeedARingShape()
    {
        const string trim = """{ "property": "strokeEnd", "keyTimes": [0, 1], "values": [0, 1] }""";
        Assert.Contains(ErrorsFor($$"""{ "tracks": [{{trim}}] }"""), error => error.Contains("needs a ring shape"));
        Assert.NotEmpty(ErrorsFor("""{ "rest": { "strokeStart": 0.2 } }"""));
        Assert.Empty(ErrorsFor($$"""
            { "shape": { "type": "ring", "strokeWidth": 0.1 }, "tracks": [{{trim}}], "rest": { "strokeStart": 0.2 } }
            """));
    }

    [Fact]
    public void RejectsBadTracks()
    {
        Assert.NotEmpty(WithTrack("""{ "property": "skew" }"""));
        Assert.NotEmpty(WithTrack("""{ "keyTimes": [0], "values": [0] }"""));
        Assert.NotEmpty(WithTrack("""{ "keyTimes": [0.5, 0.2] }"""));
        Assert.NotEmpty(WithTrack("""{ "keyTimes": [0, 1.5] }"""));
        Assert.NotEmpty(WithTrack("""{ "values": [0, 1, 2] }"""));
        Assert.NotEmpty(WithTrack("""{ "easing": "bounce" }"""));
        Assert.NotEmpty(WithTrack("""{ "easing": [1.5, 0, 0, 1] }"""));
        Assert.NotEmpty(WithTrack("""{ "easing": ["linear", "easeIn"] }"""));
        Assert.NotEmpty(ErrorsFor($$"""{ "tracks": [{{BaseTrack}}, {{BaseTrack}}] }"""));
        Assert.NotEmpty(ErrorsFor("""{ "tracks": [] }"""));
    }

    [Fact]
    public void NamesInheritedFromObjectPrototypeAreNotEasingsOrParams()
    {
        Assert.NotEmpty(WithTrack("""{ "easing": "constructor" }"""));
        Assert.NotEmpty(ErrorsFor("""{ "layout": { "type": "single", "size": { "$param": "toString" } } }"""));
        Assert.NotEmpty(WithTrack("""{ "keyTimes": [0, 1e999] }"""));
        var spec = TypedBase() with { Params = new Dictionary<string, double> { ["a"] = 1 } };
        Assert.Equal(
            new Dictionary<string, double> { ["a"] = 1 },
            IndicatorEvaluator.ResolveParams(spec, new Dictionary<string, double> { ["toString"] = 2 }));
    }

    [Fact]
    public void ParseThrowsWithEveryProblemListed()
    {
        const string json = """
            {
              "schemaVersion": 1,
              "name": "Custom",
              "duration": -1,
              "layout": { "type": "row", "count": { "$param": "count" }, "gap": 0.1 },
              "shape": { "type": "circle" },
              "tracks": []
            }
            """;
        var error = Assert.Throws<InvalidIndicatorSpecException>(() => IndicatorSpec.Parse(json));
        Assert.Equal(
            new[] { "duration must be a positive number", "layout.count uses unknown param \"count\"" },
            error.Errors);
        Assert.Contains("- duration must be a positive number", error.Message);
    }

    [Fact]
    public void ParseCatchesArraysThatAreTooShort()
    {
        var stagger = Assert.Throws<InvalidIndicatorSpecException>(() => IndicatorSpec.Parse(Patched(Base, """
            { "layout": { "type": "row", "count": 3, "gap": 0.1 }, "stagger": [0, 0.1] }
            """)));
        Assert.Equal(new[] { "stagger has 2 entries but the layout has 3 elements" }, stagger.Errors);
        var durations = Assert.Throws<InvalidIndicatorSpecException>(() => IndicatorSpec.Parse(Patched(Base, """
            { "layout": { "type": "row", "count": 3, "gap": 0.1 }, "durations": [1] }
            """)));
        Assert.Equal(new[] { "durations has 1 entries but the layout has 3 elements" }, durations.Errors);
    }

    [Fact]
    public void MessagesMatchTheReference()
    {
        Assert.Equal(new[] { "schemaVersion must be 1" }, ErrorsFor("""{ "schemaVersion": 2 }"""));
        Assert.Equal(new[] { "name is required" }, ErrorsFor("""{ "name": "" }"""));
        Assert.Equal(
            new[] { "layout.type must be one of single, stack, row, grid, ring" },
            ErrorsFor("""{ "layout": { "type": "hex" } }"""));
        Assert.Equal(new[] { "layout.count is required" }, ErrorsFor("""{ "layout": { "type": "row", "gap": 0.1 } }"""));
        Assert.Equal(new[] { "layout.count is required" }, ErrorsFor("""{ "layout": { "type": "stack" } }"""));
        Assert.Equal(
            new[] { "layout.x must be a number or { $param }" },
            ErrorsFor("""{ "layout": { "type": "single", "x": "left" } }"""));
        Assert.Equal(
            new[] { "layout.orient must be a boolean" },
            ErrorsFor("""{ "layout": { "type": "ring", "count": 3, "itemSize": 0.2, "orient": 1 } }"""));
        Assert.Equal(
            new[] { "shape.type must be one of circle, rect, ring, triangle, line" },
            ErrorsFor("""{ "shape": { "type": "star" } }"""));
        Assert.Equal(new[] { "shape.strokeWidth is required" }, ErrorsFor("""{ "shape": { "type": "ring" } }"""));
        Assert.Equal(
            new[] { "shape.sweep must be within (0, 2π]" },
            ErrorsFor("""{ "shape": { "type": "ring", "strokeWidth": 0.1, "sweep": 7 } }"""));
        Assert.Equal(new[] { "shape.sweep must be within (0, 2π]" }, ErrorsFor("""{ "shape": { "type": "circle", "sweep": 0 } }"""));
        Assert.Empty(ErrorsFor("""{ "shape": { "type": "circle", "sweep": 6.283185307179586 } }"""));
        Assert.Empty(ErrorsFor("""
            { "params": { "sweep": 9 }, "shape": { "type": "circle", "sweep": { "$param": "sweep" } } }
            """));
        Assert.Equal(
            new[] { "stagger must be an array of offsets or { each, start? }" },
            ErrorsFor("""{ "stagger": { "each": "fast" } }"""));
        Assert.Equal(new[] { "stagger[1] must be a finite number" }, ErrorsFor("""{ "stagger": [0, "x"] }"""));
        Assert.Equal(new[] { "stagger.start must be a finite number" }, ErrorsFor("""{ "stagger": { "each": 0.1, "start": null } }"""));
        Assert.Equal(new[] { "durations must be an array" }, ErrorsFor("""{ "durations": 1 }"""));
        Assert.Equal(new[] { "durations[1] must be a positive number" }, ErrorsFor("""{ "durations": [1, 0] }"""));
        Assert.Equal(new[] { "rest must be an object" }, ErrorsFor("""{ "rest": [1] }"""));
        Assert.Equal(new[] { "rest.skew is not an animatable property" }, ErrorsFor("""{ "rest": { "skew": 1 } }"""));
        Assert.Equal(new[] { "rest.strokeStart needs a ring shape" }, ErrorsFor("""{ "rest": { "strokeStart": 0.2 } }"""));
        Assert.Equal(
            new[] { "rest.opacity uses unknown param \"missing\"" },
            ErrorsFor("""{ "rest": { "opacity": { "$param": "missing" } } }"""));
        Assert.Equal(
            new[] { "tracks[0].property must be one of scale, scaleX, scaleY, opacity, rotate, rotateX, rotateY, translateX, translateY, strokeStart, strokeEnd" },
            WithTrack("""{ "property": "skew" }"""));
        Assert.Equal(
            new[] { "tracks[0].property \"strokeEnd\" needs a ring shape" },
            WithTrack("""{ "property": "strokeEnd" }"""));
        Assert.Equal(new[] { "tracks must be an array" }, ErrorsFor("""{ "tracks": {} }"""));
        Assert.Equal(new[] { "tracks[0] must be an object" }, ErrorsFor("""{ "tracks": [1] }"""));
        Assert.Equal(new[] { "tracks[0].keyTimes needs at least 2 entries" }, WithTrack("""{ "keyTimes": [0], "values": [0] }"""));
        Assert.Equal(new[] { "tracks[0].keyTimes must be non-decreasing" }, WithTrack("""{ "keyTimes": [0.5, 0.2] }"""));
        Assert.Equal(new[] { "tracks[0].keyTimes[1] must be within [0, 1]" }, WithTrack("""{ "keyTimes": [0, 1.5] }"""));
        Assert.Equal(
            new[] { "tracks[0].values must have the same length as keyTimes" },
            WithTrack("""{ "values": [0, 1, 2] }"""));
        Assert.Equal(
            new[] { "tracks[0].easing \"bounce\" is not a named easing" },
            WithTrack("""{ "easing": "bounce" }"""));
        Assert.Equal(
            new[] { "tracks[0].easing \"constructor\" is not a named easing" },
            WithTrack("""{ "easing": "constructor" }"""));
        Assert.Equal(
            new[] { "tracks[0].easing x1 and x2 must be within [0, 1]" },
            WithTrack("""{ "easing": [1.5, 0, 0, 1] }"""));
        Assert.Equal(
            new[] { "tracks[0].easing must be a named easing or [x1, y1, x2, y2]" },
            WithTrack("""{ "easing": [0, 0, 1] }"""));
        Assert.Equal(
            new[] { "tracks[0].easing needs one entry per segment (1)" },
            WithTrack("""{ "easing": ["linear", "easeIn"] }"""));
        Assert.Equal(
            new[] { "tracks[1].property \"opacity\" is animated by more than one track" },
            ErrorsFor($$"""{ "tracks": [{{BaseTrack}}, {{BaseTrack}}] }"""));
        Assert.Equal(
            new[] { "tracks[0].values[1] uses unknown param \"low\"" },
            WithTrack("""{ "values": [0, { "$param": "low" }] }"""));
        Assert.Equal(
            new[] { "layout.size uses unknown param \"toString\"" },
            ErrorsFor("""{ "layout": { "type": "single", "size": { "$param": "toString" } } }"""));
        Assert.Equal(new[] { "the spec needs at least one track or group track" }, ErrorsFor("""{ "tracks": [] }"""));
        Assert.Equal(new[] { "perspective must be a positive number" }, ErrorsFor("""{ "perspective": null }"""));
        Assert.Equal(new[] { "layout.size must be finite" }, ErrorsFor("""{ "layout": { "type": "single", "size": 1e999 } }"""));
    }

    [Fact]
    public void PartMessagesCarryTheirPath()
    {
        Assert.Equal(
            new[] { "parts[0].layout.type must be one of single, stack, row, grid, ring" },
            WithParts($$"""[{{Part("""{ "layout": { "type": "hex" } }""")}}]"""));
        Assert.Equal(
            new[] { "parts[1].tracks[0].keyTimes[1] must be within [0, 1]" },
            WithParts($$"""[{{BasePart}}, {{Part("""{ "tracks": [{ "property": "scale", "keyTimes": [0, 2], "values": [0, 1] }] }""")}}]"""));
        Assert.Equal(new[] { "parts[0].duration must be a positive number" }, WithParts($$"""[{{Part("""{ "duration": 0 }""")}}]"""));
        Assert.Equal(
            new[] { "parts[0].groupTracks[0].property must be one of scale, scaleX, scaleY, opacity, rotate, translateX, translateY" },
            WithParts($$"""[{{Part("""{ "groupTracks": [{ "property": "rotateX", "keyTimes": [0, 1], "values": [0, 1] }] }""")}}]"""));
        const string rotate = """{ "property": "rotate", "keyTimes": [0, 1], "values": [0, 1] }""";
        Assert.Equal(
            new[] { "parts[0].groupTracks[1].property \"rotate\" is animated by more than one track" },
            WithParts($$"""[{{Part($$"""{ "groupTracks": [{{rotate}}, {{rotate}}] }""")}}]"""));
        Assert.Equal(new[] { "parts must be a non-empty array" }, WithParts("[]"));
        Assert.Equal(new[] { "parts must be a non-empty array" }, WithParts("null"));
        Assert.Equal(new[] { "parts[1] must be an object" }, WithParts($"[{BasePart}, 3]"));
        Assert.Equal(
            new[] { "layout must be set inside parts when the spec has parts", "durations must be set inside parts when the spec has parts" },
            WithParts($"[{BasePart}]", """{ "layout": { "type": "single" }, "durations": [1] }"""));
        Assert.Equal(
            new[] { "the spec needs at least one track or group track" },
            WithParts("""[{ "layout": { "type": "single" }, "shape": { "type": "circle" } }]"""));
        Assert.Equal(
            new[] { "parts[0].tracks[0].property \"strokeStart\" needs a ring shape" },
            WithParts($$"""[{{Part("""{ "tracks": [{ "property": "strokeStart", "keyTimes": [0, 1], "values": [0, 1] }] }""")}}]"""));
    }

    [Fact]
    public void ObjectEntriesFollowJavaScriptKeyOrder()
    {
        Assert.Equal(
            new[] { "params.2 must be a finite number", "params.10 must be a finite number", "params.b must be a finite number" },
            ErrorsFor("""{ "params": { "b": "x", "10": "y", "2": "z" } }"""));
        Assert.Equal(
            new[] { "params.01 must be a finite number", "params.a must be a finite number" },
            ErrorsFor("""{ "params": { "01": "x", "a": "y" } }"""));
        Assert.Equal(
            new[] { "rest.0 is not an animatable property", "rest.skew is not an animatable property" },
            ErrorsFor("""{ "rest": { "skew": 1, "0": 1 } }"""));
        Assert.Empty(IndicatorSpecValidator.Validate(Base.Replace("\"duration\": 1,", "\"duration\": 1, \"params\": { \"a\": \"x\", \"a\": 1 },")));
        var repeated = IndicatorSpec.Parse(Base.Replace("\"duration\": 1,", "\"duration\": \"x\", \"duration\": 2,"));
        Assert.Equal(2, repeated.Duration);
    }

    [Fact]
    public void KeyTimesCompareLikeJavaScript()
    {
        Assert.Equal(
            new[] { "tracks[0].keyTimes[0] must be within [0, 1]", "tracks[0].keyTimes must be non-decreasing" },
            WithTrack("""{ "keyTimes": ["0.8", 0.5] }"""));
        Assert.Equal(
            new[] { "tracks[0].keyTimes[0] must be within [0, 1]", "tracks[0].keyTimes must be non-decreasing" },
            WithTrack("""{ "keyTimes": [true, 0.5] }"""));
        Assert.Equal(new[] { "tracks[0].keyTimes[0] must be within [0, 1]" }, WithTrack("""{ "keyTimes": [null, 0.5] }"""));
        Assert.Equal(new[] { "tracks[0].keyTimes[0] must be within [0, 1]" }, WithTrack("""{ "keyTimes": ["abc", 0.5] }"""));
        Assert.Equal(
            new[] { "tracks[0].keyTimes[0] must be within [0, 1]", "tracks[0].keyTimes must be non-decreasing" },
            WithTrack("""{ "keyTimes": [[" 0x1 "], 0.5] }"""));
        Assert.Equal(
            new[] { "tracks[0].keyTimes[0] must be within [0, 1]", "tracks[0].keyTimes must be non-decreasing" },
            WithTrack("""{ "keyTimes": [2, 0.5] }"""));
    }

    [Fact]
    public void AcceptsWhatTheReferenceAccepts()
    {
        Assert.Empty(ErrorsFor("""{ "unknownField": { "anything": [1, 2] } }"""));
        Assert.Empty(WithTrack("""{ "easing": [0.1, -2, 0.9, 3] }"""));
        Assert.Empty(WithTrack("""{ "easing": ["easeOut"] }"""));
        Assert.Empty(WithTrack("""{ "easing": "ease" }"""));
        Assert.Empty(WithTrack("""{ "keyTimes": [0.5, 0.5] }"""));
        Assert.Empty(ErrorsFor("""{ "params": { "size": 0.5 }, "layout": { "type": "single", "size": { "$param": "size" } } }"""));
        Assert.Empty(ErrorsFor("""
            { "layout": { "type": "ring", "count": 3, "itemSize": 0.2, "itemWidth": 0.1, "itemHeight": 0.3, "orient": true } }
            """));
        Assert.Empty(ErrorsFor("""{ "layout": { "type": "row", "count": 3, "gap": 0.1, "itemWidth": 0.1, "itemHeight": 0.2 } }"""));
        Assert.Empty(ErrorsFor("""{ "shape": { "type": "ring", "strokeWidth": 0.1, "startAngle": 0, "sweep": 1, "segments": 2 } }"""));
    }

    [Fact]
    public void ValidatesSpecsBuiltInCode()
    {
        var spec = TypedBase();
        Assert.Equal(new[] { "duration must be a positive number" }, (spec with { Duration = double.NaN }).Validate());
        Assert.Equal(
            new[] { "layout.count uses unknown param \"count\"" },
            WithPart(spec, part => part with { Layout = new RowLayout(Num.FromParam("count"), 0.1) }).Validate());
        Assert.Equal(
            new[] { "stagger has 1 entries but the layout has 3 elements" },
            WithPart(spec, part => part with { Layout = new RowLayout(3, 0.1), Stagger = new ExplicitStagger(new double[] { 0 }) }).Validate());
        Assert.Equal(
            new[] { "durations has 2 entries but the layout has 3 elements" },
            WithPart(spec, part => part with { Layout = new StackLayout(3), Durations = new double[] { 1, 1 } }).Validate());
        Assert.Equal(
            new[] { "tracks[0].easing needs one entry per segment (1)" },
            WithPart(spec, part => part with { Tracks = new[] { OpacityTrack with { SegmentEasings = new[] { Easing.Linear, Easing.EaseIn } } } }).Validate());
        Assert.Equal(
            new[] { "tracks[0].easing must be a named easing or [x1, y1, x2, y2]" },
            WithPart(spec, part => part with { Tracks = new[] { OpacityTrack with { Easing = new Easing(0, double.NaN, 1, 1) } } }).Validate());
        Assert.Equal(
            new[] { "shape.sweep must be within (0, 2π]" },
            WithPart(spec, part => part with { Shape = new CircleShape(Sweep: 7) }).Validate());
        Assert.Equal(
            new[] { "rest.strokeEnd needs a ring shape" },
            WithPart(spec, part => part with { Rest = new Dictionary<AnimatableProperty, Num> { [AnimatableProperty.StrokeEnd] = 0.5 } }).Validate());
        Assert.Equal(
            new[] { "tracks[0].property \"strokeStart\" needs a ring shape" },
            WithPart(spec, part => part with { Tracks = new[] { OpacityTrack with { Property = AnimatableProperty.StrokeStart } } }).Validate());
        Assert.Equal(
            new[] { "groupTracks[0].property must be one of scale, scaleX, scaleY, opacity, rotate, translateX, translateY" },
            WithPart(spec, part => part with { GroupTracks = new[] { OpacityTrack with { Property = AnimatableProperty.RotateY } } }).Validate());
        Assert.Equal(
            new[] { "the spec needs at least one track or group track" },
            WithPart(spec, part => part with { Tracks = null }).Validate());
        Assert.NotEmpty(WithPart(spec, part => part with { Duration = 2 }).Validate());
        Assert.NotEmpty(WithPart(spec, part => part with { Tracks = new[] { OpacityTrack with { Easing = Easing.Linear, SegmentEasings = new[] { Easing.Linear } } } }).Validate());
        Assert.NotEmpty(WithPart(spec, part => part with { Tracks = new Track[] { null! } }).Validate());
        Assert.NotEmpty(WithPart(spec, part => new IndicatorPart(null!, null!)).Validate());
        Assert.NotEmpty((spec with { Part = null }).Validate());
        Assert.Throws<InvalidIndicatorSpecException>(() => new PreparedIndicator(spec with { Duration = 0 }));
    }

    [Fact]
    public void ValidatesPartsBuiltInCode()
    {
        var part = TypedPart();
        Assert.Empty(new IndicatorSpec("Test", 1, new[] { part, part with { Duration = 2 } }).Validate());
        Assert.Equal(new[] { "parts must be a non-empty array" }, new IndicatorSpec("Test", 1, Array.Empty<IndicatorPart>()).Validate());
        Assert.Equal(new[] { "parts[1] must be an object" }, new IndicatorSpec("Test", 1, new[] { part, null! }).Validate());
        Assert.Equal(
            new[] { "parts[0].duration must be a positive number" },
            new IndicatorSpec("Test", 1, new[] { part with { Duration = -1 } }).Validate());
        Assert.Equal(
            new[] { "parts[1].layout.count uses unknown param \"n\"" },
            new IndicatorSpec("Test", 1, new[] { part, part with { Layout = new StackLayout(Num.FromParam("n")) } }).Validate());
        Assert.Equal(
            new[] { "layout must be set inside parts when the spec has parts", "shape must be set inside parts when the spec has parts", "tracks must be set inside parts when the spec has parts" },
            (new IndicatorSpec("Test", 1, new[] { part }) with { Part = part }).Validate());
    }

    [Fact]
    public void RejectsMalformedJson()
    {
        Assert.False(IndicatorSpec.TryParse("{ not json", out var spec, out var errors));
        Assert.Null(spec);
        Assert.Single(errors);
        Assert.StartsWith("spec is not valid JSON", errors[0]);
        Assert.NotEmpty(IndicatorSpecValidator.Validate("[1, 2]"));
        Assert.NotEmpty(IndicatorSpecValidator.Validate(""));
    }

    [Fact]
    public void ReadsEveryNewField()
    {
        var spec = IndicatorSpec.Parse("""
            {
              "schemaVersion": 1,
              "name": "Parts",
              "duration": 1,
              "params": { "n": 2 },
              "parts": [
                {
                  "layout": { "type": "stack", "count": { "$param": "n" }, "size": 0.5, "width": 0.4, "height": 0.3, "x": 0.2, "y": 0.1 },
                  "shape": { "type": "ring", "strokeWidth": 0.1, "startAngle": 0, "sweep": 3, "segments": 2 },
                  "duration": 2,
                  "durations": [1, 2],
                  "rest": { "strokeEnd": 0.5 },
                  "stagger": { "each": -0.1 },
                  "groupTracks": [{ "property": "rotate", "keyTimes": [0, 1], "values": [0, 1], "easing": "ease" }]
                },
                {
                  "layout": { "type": "row", "count": 3, "gap": 0.1, "itemWidth": 0.2, "itemHeight": 0.1 },
                  "shape": { "type": "circle", "startAngle": 1, "sweep": 2 },
                  "tracks": [{ "property": "scale", "keyTimes": [0, 1], "values": [0, 1] }]
                }
              ]
            }
            """);
        Assert.Null(spec.Part);
        var first = spec.Parts![0];
        Assert.Equal(new StackLayout(Num.FromParam("n"), 0.5, 0.4, 0.3, 0.2, 0.1), first.Layout);
        Assert.Equal(new RingShape(0.1, 0, 3, 2), first.Shape);
        Assert.Equal(2, first.Duration);
        Assert.Equal(new double[] { 1, 2 }, first.Durations);
        Assert.Equal(0.5, first.Rest![AnimatableProperty.StrokeEnd].Value);
        Assert.Equal(new UniformStagger(-0.1), first.Stagger);
        Assert.Equal(Easing.Ease, first.GroupTracks![0].Easing);
        Assert.Null(first.Tracks);
        Assert.Equal(new RowLayout(3, 0.1, 0.2, 0.1), spec.Parts[1].Layout);
        Assert.Equal(new CircleShape(1, 2), spec.Parts[1].Shape);

        var indicator = new PreparedIndicator(spec);
        Assert.Equal(5, indicator.ElementCount);
        Assert.Equal(new ResolvedShape(ShapeType.Ring, StartAngle: 0, Sweep: 3, StrokeWidth: 0.1, Segments: 2), indicator.Parts[0].Shape);
        Assert.Equal(new ResolvedShape(ShapeType.Circle, StartAngle: 1, Sweep: 2), indicator.Parts[1].Shape);
        Assert.Equal(2, indicator.Parts[1].FirstIndex);
        Assert.Equal(new double[] { 1, 1, 1 }, indicator.Parts[1].Durations);
        Assert.Equal(new[] { 0, 0, 1, 1, 1 }, indicator.Evaluate(0).Select(state => state.Part));
    }

    [Fact]
    public void RejectsElementCountsAnEngineCannotDraw()
    {
        var spec = WithPart(
            TypedBase() with { Params = new Dictionary<string, double> { ["count"] = 3 } },
            part => part with { Layout = new RowLayout(Num.FromParam("count"), 0) });
        Assert.Equal(3, new PreparedIndicator(spec).ElementCount);
        Assert.Equal(1, new PreparedIndicator(spec, new Dictionary<string, double> { ["count"] = -4 }).ElementCount);
        Assert.Equal(3, new PreparedIndicator(spec, new Dictionary<string, double> { ["count"] = 2.5 }).ElementCount);
        Assert.Throws<InvalidIndicatorSpecException>(
            () => new PreparedIndicator(spec, new Dictionary<string, double> { ["count"] = 1e12 }));
        Assert.Throws<ArgumentException>(
            () => new PreparedIndicator(spec, new Dictionary<string, double> { ["count"] = double.NaN }));
        Assert.Equal(3, new PreparedIndicator(spec, new Dictionary<string, double> { ["other"] = double.NaN }).ElementCount);

        var big = TypedPart() with { Layout = new StackLayout(6000) };
        var error = Assert.Throws<InvalidIndicatorSpecException>(
            () => new PreparedIndicator(new IndicatorSpec("Test", 1, new[] { big, big })));
        Assert.Equal(new[] { "the spec resolves to 12000 elements, more than the 10000 supported" }, error.Errors);
        var segments = Assert.Throws<InvalidIndicatorSpecException>(
            () => new PreparedIndicator(new IndicatorSpec("Test", 1, new[] { TypedPart() with { Shape = new RingShape(0.1, Segments: 1e9) } })));
        Assert.Equal(new[] { "parts[0].shape.segments resolves to 1000000000 segments, more than the 10000 supported" }, segments.Errors);
        var arcs = Assert.Throws<InvalidIndicatorSpecException>(
            () => new PreparedIndicator(new IndicatorSpec("Test", 1, TypedPart() with { Layout = new StackLayout(200), Shape = new RingShape(0.1, Segments: 60) })));
        Assert.Equal(new[] { "the spec draws 12000 ring arcs, more than the 10000 supported" }, arcs.Errors);
    }

    /// <summary>Random structural mutations of the built-in specs must be reported, never thrown.</summary>
    [Fact]
    public void NeverCrashesOnMutatedSpecs()
    {
        var random = new Random(1);
        JsonNode?[] replacements =
        {
            null, JsonValue.Create(-1), JsonValue.Create(0), JsonValue.Create(1e308), JsonValue.Create("x"),
            JsonValue.Create(true), new JsonArray(), new JsonObject(), new JsonArray(1, 2),
            new JsonObject { ["$param"] = "nope" }, new JsonObject { ["$param"] = "count" },
            JsonNode.Parse(BasePart), JsonValue.Create("strokeEnd"), JsonValue.Create(-0.5),
        };
        foreach (var name in BuiltinIndicators.Names)
        {
            for (var iteration = 0; iteration < 400; iteration++)
            {
                var root = JsonNode.Parse(BuiltinIndicators.GetJson(name))!;
                var nodes = new List<(JsonNode Parent, object Key)>();
                Collect(root, nodes);
                for (var change = random.Next(1, 4); change > 0; change--)
                {
                    var (parent, key) = nodes[random.Next(nodes.Count)];
                    var replacement = replacements[random.Next(replacements.Length)]?.DeepClone();
                    if (key is string property) parent[property] = replacement;
                    else parent[(int)key] = replacement;
                }
                var json = root.ToJsonString();
                if (IndicatorSpec.TryParse(json, out var spec, out _))
                {
                    try
                    {
                        var indicator = new PreparedIndicator(spec);
                        indicator.Evaluate(0.37);
                        indicator.TimeForCycleProgress(0.5);
                    }
                    catch (InvalidIndicatorSpecException)
                    {
                    }
                }
            }
        }
    }

    private static void Collect(JsonNode node, List<(JsonNode Parent, object Key)> nodes)
    {
        switch (node)
        {
            case JsonObject obj:
                foreach (var (key, child) in obj.ToList())
                {
                    nodes.Add((obj, key));
                    if (child is not null) Collect(child, nodes);
                }
                break;
            case JsonArray array:
                for (var i = 0; i < array.Count; i++)
                {
                    nodes.Add((array, i));
                    if (array[i] is { } child) Collect(child, nodes);
                }
                break;
        }
    }
}
