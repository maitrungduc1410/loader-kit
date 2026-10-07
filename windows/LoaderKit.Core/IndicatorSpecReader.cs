using System;
using System.Collections.Generic;
using System.Text.Json;

namespace LoaderKit;

/// <summary>Builds the model from JSON that already passed <see cref="IndicatorSpecValidator.Validate(JsonElement)"/>.</summary>
internal static class IndicatorSpecReader
{
    public static IndicatorSpec Read(JsonElement json)
    {
        Dictionary<string, double>? parameters = null;
        if (Get(json, "params") is { } paramsValue)
        {
            parameters = new Dictionary<string, double>(StringComparer.Ordinal);
            foreach (var param in IndicatorSpecValidator.Entries(paramsValue)) parameters[param.Key] = Number(param.Value);
        }

        var name = json.GetProperty("name").GetString()!;
        var duration = Number(json.GetProperty("duration"));
        IndicatorSpec spec;
        if (Get(json, "parts") is { } partsValue)
        {
            var parts = new List<IndicatorPart>();
            foreach (var part in partsValue.EnumerateArray()) parts.Add(ReadPart(part, withDuration: true));
            spec = new IndicatorSpec(name, duration, parts);
        }
        else
        {
            spec = new IndicatorSpec(name, duration, ReadPart(json, withDuration: false));
        }

        return spec with
        {
            SchemaVersion = (int)Number(json.GetProperty("schemaVersion")),
            Params = parameters,
            Perspective = Get(json, "perspective") is { } perspective ? Number(perspective) : null,
        };
    }

    private static IndicatorPart ReadPart(JsonElement part, bool withDuration)
    {
        Dictionary<AnimatableProperty, Num>? rest = null;
        if (Get(part, "rest") is { } restValue)
        {
            rest = new Dictionary<AnimatableProperty, Num>();
            foreach (var entry in IndicatorSpecValidator.Entries(restValue)) rest[Property(entry.Key)] = ReadNum(entry.Value);
        }

        List<double>? durations = null;
        if (Get(part, "durations") is { } durationsValue)
        {
            durations = new List<double>();
            foreach (var value in durationsValue.EnumerateArray()) durations.Add(Number(value));
        }

        return new IndicatorPart(ReadLayout(part.GetProperty("layout")), ReadShape(part.GetProperty("shape")))
        {
            Tracks = ReadTracks(Get(part, "tracks")),
            Stagger = Get(part, "stagger") is { } stagger ? ReadStagger(stagger) : null,
            Duration = withDuration && Get(part, "duration") is { } duration ? Number(duration) : null,
            Durations = durations,
            Rest = rest,
            GroupTracks = ReadTracks(Get(part, "groupTracks")),
        };
    }

    private static IndicatorLayout ReadLayout(JsonElement layout)
    {
        Num Required(string key) => ReadNum(layout.GetProperty(key));
        Num? Optional(string key) => Get(layout, key) is { } value ? ReadNum(value) : null;

        return layout.GetProperty("type").GetString() switch
        {
            "single" => new SingleLayout(Optional("size"), Optional("width"), Optional("height"), Optional("x"), Optional("y")),
            "stack" => new StackLayout(
                Required("count"),
                Optional("size"),
                Optional("width"),
                Optional("height"),
                Optional("x"),
                Optional("y")),
            "row" => new RowLayout(Required("count"), Required("gap"), Optional("itemWidth"), Optional("itemHeight")),
            "grid" => new GridLayout(Required("columns"), Required("rows"), Required("gap")),
            _ => new RingLayout(
                Required("count"),
                Required("itemSize"),
                Optional("startAngle"),
                Get(layout, "orient") is { ValueKind: JsonValueKind.True },
                Optional("itemWidth"),
                Optional("itemHeight")),
        };
    }

    private static IndicatorShape ReadShape(JsonElement shape)
    {
        Num? Optional(string key) => Get(shape, key) is { } value ? ReadNum(value) : null;

        return shape.GetProperty("type").GetString() switch
        {
            "circle" => new CircleShape(Optional("startAngle"), Optional("sweep")),
            "rect" => new RectShape(Optional("cornerRadius")),
            "ring" => new RingShape(
                ReadNum(shape.GetProperty("strokeWidth")),
                Optional("startAngle"),
                Optional("sweep"),
                Optional("segments")),
            "triangle" => new TriangleShape(),
            _ => new LineShape(),
        };
    }

    private static IndicatorStagger ReadStagger(JsonElement stagger)
    {
        if (stagger.ValueKind == JsonValueKind.Array)
        {
            var offsets = new List<double>();
            foreach (var offset in stagger.EnumerateArray()) offsets.Add(Number(offset));
            return new ExplicitStagger(offsets);
        }
        return new UniformStagger(
            Number(stagger.GetProperty("each")),
            Get(stagger, "start") is { } start ? Number(start) : 0);
    }

    private static List<Track>? ReadTracks(JsonElement? tracks)
    {
        if (tracks is not { } list) return null;
        var result = new List<Track>();
        foreach (var track in list.EnumerateArray()) result.Add(ReadTrack(track));
        return result;
    }

    private static Track ReadTrack(JsonElement track)
    {
        var keyTimes = new List<double>();
        foreach (var keyTime in track.GetProperty("keyTimes").EnumerateArray()) keyTimes.Add(Number(keyTime));
        var values = new List<Num>();
        foreach (var value in track.GetProperty("values").EnumerateArray()) values.Add(ReadNum(value));

        var result = new Track(Property(track.GetProperty("property").GetString()!), keyTimes, values);
        if (Get(track, "easing") is not { } easing) return result;
        if (!IndicatorSpecValidator.IsPerSegment(easing)) return result with { Easing = ReadEasing(easing) };
        var segments = new List<Easing>();
        foreach (var item in easing.EnumerateArray()) segments.Add(ReadEasing(item));
        return result with { SegmentEasings = segments };
    }

    private static Easing ReadEasing(JsonElement easing)
    {
        if (easing.ValueKind == JsonValueKind.String)
        {
            Easing.TryGetNamed(easing.GetString(), out var named);
            return named;
        }
        return new Easing(Number(easing[0]), Number(easing[1]), Number(easing[2]), Number(easing[3]));
    }

    private static AnimatableProperty Property(string name) =>
        (AnimatableProperty)Array.IndexOf(IndicatorSpecValidator.PropertyNames, name);

    private static Num ReadNum(JsonElement value) => value.ValueKind == JsonValueKind.Number
        ? Num.Of(Number(value))
        : Num.FromParam(value.GetProperty("$param").GetString()!);

    private static double Number(JsonElement value) => IndicatorSpecValidator.ReadNumber(value);

    private static JsonElement? Get(JsonElement element, string name) => IndicatorSpecValidator.Get(element, name);
}
