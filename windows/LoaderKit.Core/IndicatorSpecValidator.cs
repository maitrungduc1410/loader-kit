using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.Json;

namespace LoaderKit;

/// <summary>
/// The schema v1 rules (SPEC §9). Every method returns the list of problems found; an empty list means the
/// spec is valid. Nothing here throws on bad input.
/// </summary>
public static class IndicatorSpecValidator
{
    internal static readonly string[] PropertyNames =
    {
        "scale", "scaleX", "scaleY", "opacity", "rotate", "rotateX", "rotateY", "translateX", "translateY",
        "strokeStart", "strokeEnd",
    };

    internal static readonly string[] GroupPropertyNames =
    {
        "scale", "scaleX", "scaleY", "opacity", "rotate", "translateX", "translateY",
    };

    internal static readonly string[] ShapeTypes = { "circle", "rect", "ring", "triangle", "line" };

    internal static readonly string[] LayoutTypes = { "single", "stack", "row", "grid", "ring" };

    private static readonly string[] PartFields = { "layout", "shape", "tracks", "stagger", "durations", "rest", "groupTracks" };

    private static readonly string[] Placed = { "size", "width", "height", "x", "y" };

    private static readonly Dictionary<string, (string[] Required, string[] Optional)> LayoutFields = new()
    {
        ["single"] = (Array.Empty<string>(), Placed),
        ["stack"] = (new[] { "count" }, Placed),
        ["row"] = (new[] { "count", "gap" }, new[] { "itemWidth", "itemHeight" }),
        ["grid"] = (new[] { "columns", "rows", "gap" }, Array.Empty<string>()),
        ["ring"] = (new[] { "count", "itemSize" }, new[] { "itemWidth", "itemHeight", "startAngle" }),
    };

    private static readonly Dictionary<string, (string[] Required, string[] Optional)> ShapeFields = new()
    {
        ["circle"] = (Array.Empty<string>(), new[] { "startAngle", "sweep" }),
        ["rect"] = (Array.Empty<string>(), new[] { "cornerRadius" }),
        ["ring"] = (new[] { "strokeWidth" }, new[] { "startAngle", "sweep", "segments" }),
        ["triangle"] = (Array.Empty<string>(), Array.Empty<string>()),
        ["line"] = (Array.Empty<string>(), Array.Empty<string>()),
    };

    private static readonly HashSet<AnimatableProperty> GroupProperties = new()
    {
        AnimatableProperty.Scale, AnimatableProperty.ScaleX, AnimatableProperty.ScaleY, AnimatableProperty.Opacity,
        AnimatableProperty.Rotate, AnimatableProperty.TranslateX, AnimatableProperty.TranslateY,
    };

    private static readonly string LayoutTypeError = $"must be one of {string.Join(", ", LayoutTypes)}";
    private static readonly string ShapeTypeError = $"must be one of {string.Join(", ", ShapeTypes)}";
    private static readonly string PropertyError = $"must be one of {string.Join(", ", PropertyNames)}";
    private static readonly string GroupPropertyError = $"must be one of {string.Join(", ", GroupPropertyNames)}";
    private const string StaggerError = "must be an array of offsets or { each, start? }";
    private const string AnimatedError = "the spec needs at least one track or group track";
    private const double MaxSweep = 2 * Math.PI + 1e-9;

    /// <summary>Validates a JSON spec, including the element counts against <c>stagger</c> and <c>durations</c> arrays.</summary>
    public static IReadOnlyList<string> Validate(string json)
    {
        if (json is null) return new[] { "spec must be an object" };
        try
        {
            using var document = JsonDocument.Parse(json);
            var errors = Validate(document.RootElement);
            if (errors.Count > 0) return errors;
            return Validate(IndicatorSpecReader.Read(document.RootElement));
        }
        catch (JsonException error)
        {
            return new[] { $"spec is not valid JSON: {error.Message}" };
        }
    }

    /// <summary>
    /// Validates the structure of a JSON spec, with the rules and messages of <c>validate()</c> in
    /// <c>spec/src/validate.ts</c>. Unknown fields are ignored. It does not check the element counts against
    /// <c>stagger</c> and <c>durations</c> arrays, which depend on params; <see cref="Validate(string)"/> and
    /// <see cref="IndicatorSpec.Parse(JsonElement)"/> do.
    /// </summary>
    public static IReadOnlyList<string> Validate(JsonElement input)
    {
        if (input.ValueKind != JsonValueKind.Object) return new[] { "spec must be an object" };
        var checker = new JsonChecker(Get(input, "params") is { ValueKind: JsonValueKind.Object } declared ? declared : null);
        var errors = checker.Errors;

        if (!(Get(input, "schemaVersion") is { ValueKind: JsonValueKind.Number } version
            && ReadNumber(version) == IndicatorSpec.CurrentSchemaVersion))
        {
            errors.Add($"schemaVersion must be {IndicatorSpec.CurrentSchemaVersion}");
        }
        if (!(Get(input, "name") is { ValueKind: JsonValueKind.String } name && name.GetString()!.Length > 0))
        {
            errors.Add("name is required");
        }
        if (!IsPositive(Get(input, "duration"))) errors.Add("duration must be a positive number");
        if (Get(input, "params") is { } parameters)
        {
            if (parameters.ValueKind != JsonValueKind.Object)
            {
                errors.Add("params must be an object");
            }
            else
            {
                foreach (var param in Entries(parameters))
                {
                    if (!IsFiniteNumber(param.Value)) errors.Add($"params.{param.Key} must be a finite number");
                }
            }
        }
        if (Get(input, "perspective") is { } perspective && !IsPositive(perspective))
        {
            errors.Add("perspective must be a positive number");
        }

        var animated = 0;
        if (Get(input, "parts") is { } parts)
        {
            foreach (var field in PartFields)
            {
                if (Get(input, field) is not null) errors.Add($"{field} must be set inside parts when the spec has parts");
            }
            if (parts.ValueKind != JsonValueKind.Array || parts.GetArrayLength() == 0)
            {
                errors.Add("parts must be a non-empty array");
            }
            else
            {
                var i = 0;
                foreach (var part in parts.EnumerateArray())
                {
                    if (part.ValueKind != JsonValueKind.Object) errors.Add($"parts[{i}] must be an object");
                    else animated += checker.CheckPart(part, $"parts[{i}].");
                    i++;
                }
            }
        }
        else
        {
            animated = checker.CheckPart(input, "");
        }
        if (animated == 0 && errors.Count == 0) errors.Add(AnimatedError);

        return errors;
    }

    private sealed class JsonChecker
    {
        private readonly JsonElement? _declared;

        public JsonChecker(JsonElement? declared) => _declared = declared;

        public List<string> Errors { get; } = new();

        public void CheckNum(JsonElement? value, string path)
        {
            if (value is { ValueKind: JsonValueKind.Number } number)
            {
                if (!IsFinite(ReadNumber(number))) Errors.Add($"{path} must be finite");
                return;
            }
            if (value is { ValueKind: JsonValueKind.Object } reference
                && Get(reference, "$param") is { ValueKind: JsonValueKind.String } name)
            {
                var paramName = name.GetString()!;
                if (_declared is null || Get(_declared.Value, paramName) is null)
                {
                    Errors.Add($"{path} uses unknown param \"{paramName}\"");
                }
                return;
            }
            Errors.Add($"{path} must be a number or {{ $param }}");
        }

        /// <summary>Checks one group of elements; returns its number of tracks and group tracks.</summary>
        public int CheckPart(JsonElement part, string prefix)
        {
            var layout = Get(part, "layout");
            var layoutType = TypeOf(layout);
            if (layoutType is null || !LayoutFields.TryGetValue(layoutType, out var layoutFields))
            {
                Errors.Add($"{prefix}layout.type {LayoutTypeError}");
            }
            else
            {
                CheckFields(layout!.Value, layoutFields, $"{prefix}layout");
                if (Get(layout.Value, "orient") is { } orient
                    && orient.ValueKind != JsonValueKind.True
                    && orient.ValueKind != JsonValueKind.False)
                {
                    Errors.Add($"{prefix}layout.orient must be a boolean");
                }
            }

            var shape = Get(part, "shape");
            var shapeType = TypeOf(shape);
            var stroke = false;
            if (shapeType is null || !ShapeFields.TryGetValue(shapeType, out var shapeFields))
            {
                Errors.Add($"{prefix}shape.type {ShapeTypeError}");
            }
            else
            {
                stroke = shapeType == "ring";
                CheckFields(shape!.Value, shapeFields, $"{prefix}shape");
                if (Get(shape.Value, "sweep") is { ValueKind: JsonValueKind.Number } sweepValue
                    && ReadNumber(sweepValue) is var sweep
                    && IsFinite(sweep)
                    && !(sweep > 0 && sweep <= MaxSweep))
                {
                    Errors.Add($"{prefix}shape.sweep must be within (0, 2π]");
                }
            }

            if (Get(part, "stagger") is { } stagger)
            {
                if (stagger.ValueKind == JsonValueKind.Array)
                {
                    var i = 0;
                    foreach (var offset in stagger.EnumerateArray())
                    {
                        if (!IsFiniteNumber(offset)) Errors.Add($"{prefix}stagger[{i}] must be a finite number");
                        i++;
                    }
                }
                else if (!(stagger.ValueKind == JsonValueKind.Object && IsFiniteNumber(Get(stagger, "each"))))
                {
                    Errors.Add($"{prefix}stagger {StaggerError}");
                }
                else if (Get(stagger, "start") is { } start && !IsFiniteNumber(start))
                {
                    Errors.Add($"{prefix}stagger.start must be a finite number");
                }
            }

            if (Get(part, "duration") is { } duration && prefix.Length > 0 && !IsPositive(duration))
            {
                Errors.Add($"{prefix}duration must be a positive number");
            }
            if (Get(part, "durations") is { } durations)
            {
                if (durations.ValueKind != JsonValueKind.Array)
                {
                    Errors.Add($"{prefix}durations must be an array");
                }
                else
                {
                    var i = 0;
                    foreach (var value in durations.EnumerateArray())
                    {
                        if (!IsPositive(value)) Errors.Add($"{prefix}durations[{i}] must be a positive number");
                        i++;
                    }
                }
            }

            if (Get(part, "rest") is { } rest)
            {
                if (rest.ValueKind != JsonValueKind.Object)
                {
                    Errors.Add($"{prefix}rest must be an object");
                }
                else
                {
                    foreach (var entry in Entries(rest))
                    {
                        var path = $"{prefix}rest.{entry.Key}";
                        var property = Array.IndexOf(PropertyNames, entry.Key);
                        if (property < 0) Errors.Add($"{path} is not an animatable property");
                        else if (IsStroke((AnimatableProperty)property) && !stroke) Errors.Add($"{path} needs a ring shape");
                        else CheckNum(entry.Value, path);
                    }
                }
            }

            return CheckTracks(Get(part, "tracks"), $"{prefix}tracks", PropertyNames, PropertyError, stroke)
                + CheckTracks(Get(part, "groupTracks"), $"{prefix}groupTracks", GroupPropertyNames, GroupPropertyError, stroke);
        }

        private void CheckFields(JsonElement value, (string[] Required, string[] Optional) fields, string path)
        {
            foreach (var key in fields.Required)
            {
                if (Get(value, key) is { } field) CheckNum(field, $"{path}.{key}");
                else Errors.Add($"{path}.{key} is required");
            }
            foreach (var key in fields.Optional)
            {
                if (Get(value, key) is { } field) CheckNum(field, $"{path}.{key}");
            }
        }

        private int CheckTracks(JsonElement? tracks, string path, string[] allowed, string allowedError, bool stroke)
        {
            if (tracks is not { } list) return 0;
            if (list.ValueKind != JsonValueKind.Array)
            {
                Errors.Add($"{path} must be an array");
                return 0;
            }
            var seen = new HashSet<string>(StringComparer.Ordinal);
            var i = 0;
            foreach (var track in list.EnumerateArray())
            {
                CheckTrack(track, $"{path}[{i}]", allowed, allowedError, stroke, seen);
                i++;
            }
            return i;
        }

        private void CheckTrack(
            JsonElement track,
            string path,
            string[] allowed,
            string allowedError,
            bool stroke,
            HashSet<string> seen)
        {
            if (track.ValueKind != JsonValueKind.Object)
            {
                Errors.Add($"{path} must be an object");
                return;
            }

            var property = Get(track, "property") is { ValueKind: JsonValueKind.String } propertyValue
                ? propertyValue.GetString()
                : null;
            if (property is null || Array.IndexOf(allowed, property) < 0)
            {
                Errors.Add($"{path}.property {allowedError}");
            }
            else if (!seen.Add(property))
            {
                Errors.Add($"{path}.property \"{property}\" is animated by more than one track");
            }
            else if (property is "strokeStart" or "strokeEnd" && !stroke)
            {
                Errors.Add($"{path}.property \"{property}\" needs a ring shape");
            }

            var keyTimes = Get(track, "keyTimes");
            if (!(keyTimes is { ValueKind: JsonValueKind.Array } && keyTimes.Value.GetArrayLength() >= 2))
            {
                Errors.Add($"{path}.keyTimes needs at least 2 entries");
                return;
            }
            var count = keyTimes.Value.GetArrayLength();
            JsonElement previous = default;
            var k = 0;
            foreach (var keyTime in keyTimes.Value.EnumerateArray())
            {
                double? value = keyTime.ValueKind == JsonValueKind.Number ? ReadNumber(keyTime) : null;
                if (value is not { } time || !IsFinite(time) || time < 0 || time > 1)
                {
                    Errors.Add($"{path}.keyTimes[{k}] must be within [0, 1]");
                }
                else if (k > 0 && time < JsNumber(previous))
                {
                    Errors.Add($"{path}.keyTimes must be non-decreasing");
                }
                previous = keyTime;
                k++;
            }

            var values = Get(track, "values");
            if (!(values is { ValueKind: JsonValueKind.Array } && values.Value.GetArrayLength() == count))
            {
                Errors.Add($"{path}.values must have the same length as keyTimes");
            }
            else
            {
                k = 0;
                foreach (var value in values.Value.EnumerateArray())
                {
                    CheckNum(value, $"{path}.values[{k}]");
                    k++;
                }
            }

            if (Get(track, "easing") is { } easing)
            {
                if (IsPerSegment(easing))
                {
                    if (easing.GetArrayLength() != count - 1)
                    {
                        Errors.Add($"{path}.easing needs one entry per segment ({count - 1})");
                    }
                    k = 0;
                    foreach (var item in easing.EnumerateArray())
                    {
                        CheckEasing(item, $"{path}.easing[{k}]");
                        k++;
                    }
                }
                else
                {
                    CheckEasing(easing, $"{path}.easing");
                }
            }
        }

        private void CheckEasing(JsonElement easing, string path)
        {
            if (easing.ValueKind == JsonValueKind.String)
            {
                var name = easing.GetString();
                if (!Easing.TryGetNamed(name, out _)) Errors.Add($"{path} \"{name}\" is not a named easing");
                return;
            }
            if (easing.ValueKind != JsonValueKind.Array || easing.GetArrayLength() != 4)
            {
                Errors.Add($"{path} must be a named easing or [x1, y1, x2, y2]");
                return;
            }
            var points = new double[4];
            var i = 0;
            foreach (var item in easing.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Number || !IsFinite(points[i] = ReadNumber(item)))
                {
                    Errors.Add($"{path} must be a named easing or [x1, y1, x2, y2]");
                    return;
                }
                i++;
            }
            CheckControlPoints(points[0], points[2], path, Errors);
        }
    }

    /// <summary>
    /// Validates a spec built in code, with the rules of <see cref="Validate(JsonElement)"/>, then prepares it to check
    /// the element counts against <c>stagger</c> and <c>durations</c> arrays.
    /// </summary>
    public static IReadOnlyList<string> Validate(IndicatorSpec spec)
    {
        if (spec is null) return new[] { "spec must be an object" };
        var errors = ValidateModel(spec);
        if (errors.Count > 0) return errors;
        try
        {
            _ = new PreparedIndicator(spec);
        }
        catch (InvalidIndicatorSpecException error)
        {
            errors.AddRange(error.Errors);
        }
        return errors;
    }

    internal static List<string> ValidateModel(IndicatorSpec spec)
    {
        var checker = new ModelChecker(spec.Params);
        var errors = checker.Errors;

        if (spec.SchemaVersion != IndicatorSpec.CurrentSchemaVersion)
        {
            errors.Add($"schemaVersion must be {IndicatorSpec.CurrentSchemaVersion}");
        }
        if (string.IsNullOrEmpty(spec.Name)) errors.Add("name is required");
        if (!IsPositive(spec.Duration)) errors.Add("duration must be a positive number");
        if (spec.Params is { } parameters)
        {
            foreach (var param in parameters)
            {
                if (!IsFinite(param.Value)) errors.Add($"params.{param.Key} must be a finite number");
            }
        }
        if (spec.Perspective is { } perspective && !IsPositive(perspective))
        {
            errors.Add("perspective must be a positive number");
        }

        var animated = 0;
        if (spec.Parts is { } parts)
        {
            if (spec.Part is { } inline)
            {
                foreach (var field in SetFields(inline))
                {
                    errors.Add($"{field} must be set inside parts when the spec has parts");
                }
            }
            if (parts.Count == 0) errors.Add("parts must be a non-empty array");
            for (var i = 0; i < parts.Count; i++)
            {
                if (parts[i] is null) errors.Add($"parts[{i}] must be an object");
                else animated += checker.CheckPart(parts[i], $"parts[{i}].");
            }
        }
        else if (spec.Part is { } part)
        {
            if (part.Duration is not null) errors.Add("part.duration must not be set on an inline part; set the spec duration");
            animated = checker.CheckPart(part, "");
        }
        else
        {
            errors.Add("parts must be a non-empty array");
        }
        if (animated == 0 && errors.Count == 0) errors.Add(AnimatedError);

        return errors;
    }

    private static IEnumerable<string> SetFields(IndicatorPart part)
    {
        if (part.Layout is not null) yield return "layout";
        if (part.Shape is not null) yield return "shape";
        if (part.Tracks is not null) yield return "tracks";
        if (part.Stagger is not null) yield return "stagger";
        if (part.Durations is not null) yield return "durations";
        if (part.Rest is not null) yield return "rest";
        if (part.GroupTracks is not null) yield return "groupTracks";
    }

    private sealed class ModelChecker
    {
        private readonly IReadOnlyDictionary<string, double>? _parameters;

        public ModelChecker(IReadOnlyDictionary<string, double>? parameters) => _parameters = parameters;

        public List<string> Errors { get; } = new();

        private void CheckNum(Num value, string path)
        {
            if (value.Param is { } name)
            {
                if (_parameters is null || !_parameters.ContainsKey(name))
                {
                    Errors.Add($"{path} uses unknown param \"{name}\"");
                }
            }
            else if (!IsFinite(value.Value))
            {
                Errors.Add($"{path} must be finite");
            }
        }

        private void CheckNum(Num? value, string path)
        {
            if (value is { } number) CheckNum(number, path);
        }

        public int CheckPart(IndicatorPart part, string prefix)
        {
            var layout = $"{prefix}layout";
            switch (part.Layout)
            {
                case SingleLayout single:
                    CheckPlaced(single.Size, single.Width, single.Height, single.X, single.Y, layout);
                    break;
                case StackLayout stack:
                    CheckNum(stack.Count, $"{layout}.count");
                    CheckPlaced(stack.Size, stack.Width, stack.Height, stack.X, stack.Y, layout);
                    break;
                case RowLayout row:
                    CheckNum(row.Count, $"{layout}.count");
                    CheckNum(row.Gap, $"{layout}.gap");
                    CheckNum(row.ItemWidth, $"{layout}.itemWidth");
                    CheckNum(row.ItemHeight, $"{layout}.itemHeight");
                    break;
                case GridLayout grid:
                    CheckNum(grid.Columns, $"{layout}.columns");
                    CheckNum(grid.Rows, $"{layout}.rows");
                    CheckNum(grid.Gap, $"{layout}.gap");
                    break;
                case RingLayout ring:
                    CheckNum(ring.Count, $"{layout}.count");
                    CheckNum(ring.ItemSize, $"{layout}.itemSize");
                    CheckNum(ring.ItemWidth, $"{layout}.itemWidth");
                    CheckNum(ring.ItemHeight, $"{layout}.itemHeight");
                    CheckNum(ring.StartAngle, $"{layout}.startAngle");
                    break;
                default:
                    Errors.Add($"{layout}.type {LayoutTypeError}");
                    break;
            }

            var shape = $"{prefix}shape";
            var stroke = false;
            switch (part.Shape)
            {
                case CircleShape circle:
                    CheckNum(circle.StartAngle, $"{shape}.startAngle");
                    CheckNum(circle.Sweep, $"{shape}.sweep");
                    CheckSweep(circle.Sweep, shape);
                    break;
                case RectShape rect:
                    CheckNum(rect.CornerRadius, $"{shape}.cornerRadius");
                    break;
                case RingShape ring:
                    stroke = true;
                    CheckNum(ring.StrokeWidth, $"{shape}.strokeWidth");
                    CheckNum(ring.StartAngle, $"{shape}.startAngle");
                    CheckNum(ring.Sweep, $"{shape}.sweep");
                    CheckNum(ring.Segments, $"{shape}.segments");
                    CheckSweep(ring.Sweep, shape);
                    break;
                case TriangleShape or LineShape:
                    break;
                default:
                    Errors.Add($"{shape}.type {ShapeTypeError}");
                    break;
            }

            switch (part.Stagger)
            {
                case null:
                    break;
                case ExplicitStagger { Offsets: { } offsets }:
                    for (var i = 0; i < offsets.Count; i++)
                    {
                        if (!IsFinite(offsets[i])) Errors.Add($"{prefix}stagger[{i}] must be a finite number");
                    }
                    break;
                case UniformStagger uniform when IsFinite(uniform.Each):
                    if (!IsFinite(uniform.Start)) Errors.Add($"{prefix}stagger.start must be a finite number");
                    break;
                default:
                    Errors.Add($"{prefix}stagger {StaggerError}");
                    break;
            }

            if (part.Duration is { } duration && prefix.Length > 0 && !IsPositive(duration))
            {
                Errors.Add($"{prefix}duration must be a positive number");
            }
            if (part.Durations is { } durations)
            {
                for (var i = 0; i < durations.Count; i++)
                {
                    if (!IsPositive(durations[i])) Errors.Add($"{prefix}durations[{i}] must be a positive number");
                }
            }

            if (part.Rest is { } rest)
            {
                foreach (var entry in rest)
                {
                    if (!Enum.IsDefined(typeof(AnimatableProperty), entry.Key))
                    {
                        Errors.Add($"{prefix}rest.{entry.Key} is not an animatable property");
                        continue;
                    }
                    var path = $"{prefix}rest.{PropertyNames[(int)entry.Key]}";
                    if (IsStroke(entry.Key) && !stroke) Errors.Add($"{path} needs a ring shape");
                    else CheckNum(entry.Value, path);
                }
            }

            return CheckTracks(part.Tracks, $"{prefix}tracks", group: false, stroke)
                + CheckTracks(part.GroupTracks, $"{prefix}groupTracks", group: true, stroke);
        }

        private void CheckPlaced(Num? size, Num? width, Num? height, Num? x, Num? y, string path)
        {
            CheckNum(size, $"{path}.size");
            CheckNum(width, $"{path}.width");
            CheckNum(height, $"{path}.height");
            CheckNum(x, $"{path}.x");
            CheckNum(y, $"{path}.y");
        }

        private void CheckSweep(Num? sweep, string path)
        {
            if (sweep is { IsParam: false, Value: var value } && IsFinite(value) && !(value > 0 && value <= MaxSweep))
            {
                Errors.Add($"{path}.sweep must be within (0, 2π]");
            }
        }

        private int CheckTracks(IReadOnlyList<Track>? tracks, string path, bool group, bool stroke)
        {
            if (tracks is null) return 0;
            var seen = new HashSet<AnimatableProperty>();
            for (var i = 0; i < tracks.Count; i++)
            {
                var trackPath = $"{path}[{i}]";
                var track = tracks[i];
                if (track is null)
                {
                    Errors.Add($"{trackPath} must be an object");
                    continue;
                }
                var property = track.Property;
                if (!Enum.IsDefined(typeof(AnimatableProperty), property) || (group && !GroupProperties.Contains(property)))
                {
                    Errors.Add($"{trackPath}.property {(group ? GroupPropertyError : PropertyError)}");
                }
                else if (!seen.Add(property))
                {
                    Errors.Add($"{trackPath}.property \"{PropertyNames[(int)property]}\" is animated by more than one track");
                }
                else if (IsStroke(property) && !stroke)
                {
                    Errors.Add($"{trackPath}.property \"{PropertyNames[(int)property]}\" needs a ring shape");
                }

                if (track.KeyTimes is not { Count: >= 2 } keyTimes)
                {
                    Errors.Add($"{trackPath}.keyTimes needs at least 2 entries");
                    continue;
                }
                for (var k = 0; k < keyTimes.Count; k++)
                {
                    var time = keyTimes[k];
                    if (!(time >= 0 && time <= 1)) Errors.Add($"{trackPath}.keyTimes[{k}] must be within [0, 1]");
                    else if (k > 0 && time < keyTimes[k - 1]) Errors.Add($"{trackPath}.keyTimes must be non-decreasing");
                }
                if (track.Values is not { } values || values.Count != keyTimes.Count)
                {
                    Errors.Add($"{trackPath}.values must have the same length as keyTimes");
                }
                else
                {
                    for (var k = 0; k < values.Count; k++) CheckNum(values[k], $"{trackPath}.values[{k}]");
                }

                if (track.Easing is not null && track.SegmentEasings is not null)
                {
                    Errors.Add($"{trackPath} sets both easing and segmentEasings");
                }
                else if (track.Easing is { } easing)
                {
                    CheckEasing(easing, $"{trackPath}.easing", Errors);
                }
                else if (track.SegmentEasings is { } segments)
                {
                    if (segments.Count != keyTimes.Count - 1)
                    {
                        Errors.Add($"{trackPath}.easing needs one entry per segment ({keyTimes.Count - 1})");
                    }
                    for (var k = 0; k < segments.Count; k++) CheckEasing(segments[k], $"{trackPath}.easing[{k}]", Errors);
                }
            }
            return tracks.Count;
        }
    }

    private static void CheckEasing(Easing easing, string path, List<string> errors)
    {
        if (!(IsFinite(easing.X1) && IsFinite(easing.Y1) && IsFinite(easing.X2) && IsFinite(easing.Y2)))
        {
            errors.Add($"{path} must be a named easing or [x1, y1, x2, y2]");
            return;
        }
        CheckControlPoints(easing.X1, easing.X2, path, errors);
    }

    private static void CheckControlPoints(double x1, double x2, string path, List<string> errors)
    {
        if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) errors.Add($"{path} x1 and x2 must be within [0, 1]");
    }

    internal static bool IsStroke(AnimatableProperty property) =>
        property is AnimatableProperty.StrokeStart or AnimatableProperty.StrokeEnd;

    internal static bool IsPerSegment(JsonElement easing) =>
        easing.ValueKind == JsonValueKind.Array
        && easing.GetArrayLength() > 0
        && easing[0].ValueKind != JsonValueKind.Number;

    internal static JsonElement? Get(JsonElement element, string name) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value) ? value : null;

    internal static double ReadNumber(JsonElement number)
    {
        if (number.TryGetDouble(out var value)) return value;
        return number.GetRawText().StartsWith("-", StringComparison.Ordinal)
            ? double.NegativeInfinity
            : double.PositiveInfinity;
    }

    /// <summary>
    /// The members of a JSON object in JavaScript <c>Object.entries</c> order: array-index keys ascending, then the
    /// other keys in source order. A repeated key keeps its first position and its last value, like <c>JSON.parse</c>.
    /// </summary>
    internal static List<KeyValuePair<string, JsonElement>> Entries(JsonElement element)
    {
        var entries = new List<KeyValuePair<string, JsonElement>>();
        var positions = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var member in element.EnumerateObject())
        {
            if (positions.TryGetValue(member.Name, out var position))
            {
                entries[position] = new(member.Name, member.Value);
            }
            else
            {
                positions[member.Name] = entries.Count;
                entries.Add(new(member.Name, member.Value));
            }
        }
        var indexKeys = new List<(uint Index, KeyValuePair<string, JsonElement> Entry)>();
        var otherKeys = new List<KeyValuePair<string, JsonElement>>();
        foreach (var entry in entries)
        {
            if (TryArrayIndex(entry.Key, out var index)) indexKeys.Add((index, entry));
            else otherKeys.Add(entry);
        }
        if (indexKeys.Count == 0) return otherKeys;
        indexKeys.Sort((a, b) => a.Index.CompareTo(b.Index));
        var ordered = new List<KeyValuePair<string, JsonElement>>(entries.Count);
        foreach (var (_, entry) in indexKeys) ordered.Add(entry);
        ordered.AddRange(otherKeys);
        return ordered;
    }

    private static bool TryArrayIndex(string key, out uint index)
    {
        index = 0;
        if (key.Length == 0 || key.Length > 10 || (key.Length > 1 && key[0] == '0')) return false;
        ulong value = 0;
        foreach (var c in key)
        {
            if (c < '0' || c > '9') return false;
            value = value * 10 + (uint)(c - '0');
        }
        if (value >= uint.MaxValue) return false;
        index = (uint)value;
        return true;
    }

    /// <summary>JavaScript <c>Number(value)</c> of a JSON value, as the relational operators coerce it.</summary>
    internal static double JsNumber(JsonElement value)
    {
        switch (value.ValueKind)
        {
            case JsonValueKind.Number: return ReadNumber(value);
            case JsonValueKind.True: return 1;
            case JsonValueKind.False or JsonValueKind.Null: return 0;
            case JsonValueKind.String: return JsNumber(value.GetString()!);
            case JsonValueKind.Array:
                return value.GetArrayLength() switch
                {
                    0 => 0,
                    1 => value[0].ValueKind switch
                    {
                        JsonValueKind.Null => 0,
                        JsonValueKind.Number or JsonValueKind.String or JsonValueKind.Array => JsNumber(value[0]),
                        _ => double.NaN,
                    },
                    _ => double.NaN,
                };
            default: return double.NaN;
        }
    }

    private static double JsNumber(string text)
    {
        text = text.Trim().Trim('\uFEFF').Trim();
        if (text.Length == 0) return 0;
        switch (text)
        {
            case "Infinity" or "+Infinity": return double.PositiveInfinity;
            case "-Infinity": return double.NegativeInfinity;
        }
        if (text.Length > 2 && text[0] == '0' && (text[1] | 0x20) is 'x' or 'o' or 'b')
        {
            var radix = (text[1] | 0x20) switch { 'x' => 16, 'o' => 8, _ => 2 };
            double result = 0;
            for (var i = 2; i < text.Length; i++)
            {
                var digit = text[i] switch
                {
                    >= '0' and <= '9' => text[i] - '0',
                    >= 'a' and <= 'f' => text[i] - 'a' + 10,
                    >= 'A' and <= 'F' => text[i] - 'A' + 10,
                    _ => int.MaxValue,
                };
                if (digit >= radix) return double.NaN;
                result = result * radix + digit;
            }
            return result;
        }
        foreach (var c in text)
        {
            if (!(c is >= '0' and <= '9' or '+' or '-' or '.' or 'e' or 'E')) return double.NaN;
        }
        return double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var number)
            ? number
            : double.NaN;
    }

    internal static bool IsFinite(double value) => !double.IsNaN(value) && !double.IsInfinity(value);

    private static bool IsPositive(double value) => IsFinite(value) && value > 0;

    private static bool IsPositive(JsonElement? value) =>
        value is { ValueKind: JsonValueKind.Number } number && IsPositive(ReadNumber(number));

    private static bool IsFiniteNumber(JsonElement? value) =>
        value is { ValueKind: JsonValueKind.Number } number && IsFinite(ReadNumber(number));

    private static string? TypeOf(JsonElement? element) =>
        element is { ValueKind: JsonValueKind.Object } value
        && Get(value, "type") is { ValueKind: JsonValueKind.String } type
            ? type.GetString()
            : null;
}
