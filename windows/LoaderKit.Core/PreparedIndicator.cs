using System;
using System.Collections.Generic;
using System.Globalization;

namespace LoaderKit;

/// <summary>
/// A spec with its params resolved and its layouts computed, ready to be evaluated every frame without allocating.
/// Produces the same element states as <c>evaluate()</c> in <c>spec/src/evaluate.ts</c>.
/// </summary>
public sealed class PreparedIndicator
{
    /// <summary>Distance from the viewer to the box for 3D rotations when the spec does not set one.</summary>
    public const double DefaultPerspective = 2.5;

    /// <summary>
    /// The most elements a spec, and the most ring arcs across all its elements, may produce. Larger counts are
    /// rejected instead of drawn.
    /// </summary>
    public const int MaxElements = 10_000;

    internal static readonly double[] RestValues = { 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1 };
    internal static readonly int PropertyCount = RestValues.Length;

    private readonly PreparedPart[] _parts;
    private readonly ElementGeometry[] _elements;
    private readonly double[] _offsets;
    private readonly double[] _values = new double[PropertyCount];
    private readonly double[] _group = new double[PropertyCount];

    /// <summary>Prepares <paramref name="spec"/> with user <paramref name="overrides"/> of its params.</summary>
    /// <param name="spec">The spec.</param>
    /// <param name="overrides">Param values by name; names the spec does not declare are ignored.</param>
    /// <exception cref="InvalidIndicatorSpecException">The spec is invalid, or the resolved layout is.</exception>
    /// <exception cref="ArgumentException">An override of a declared param is not a finite number.</exception>
    public PreparedIndicator(IndicatorSpec spec, IReadOnlyDictionary<string, double>? overrides = null)
    {
        if (spec is null) throw new ArgumentNullException(nameof(spec));
        var errors = IndicatorSpecValidator.ValidateModel(spec);
        if (errors.Count > 0) throw new InvalidIndicatorSpecException(errors);

        Spec = spec;
        Params = IndicatorEvaluator.ResolveParams(spec, overrides);
        var parts = spec.GetParts();
        var prefixed = spec.Parts is not null;
        _parts = new PreparedPart[parts.Count];
        var total = 0;
        long arcs = 0;
        for (var i = 0; i < parts.Count; i++)
        {
            _parts[i] = new PreparedPart(parts[i], i, total, spec.Duration, Params, prefixed ? $"parts[{i}]." : "");
            total += _parts[i].ElementCount;
            if (total > MaxElements) throw TooMany("the spec", total);
            if (_parts[i].Shape.Type == ShapeType.Ring) arcs += (long)_parts[i].ElementCount * _parts[i].Shape.Segments;
            if (arcs > MaxElements)
            {
                throw new InvalidIndicatorSpecException(
                    $"the spec draws {arcs.ToString(CultureInfo.InvariantCulture)} ring arcs, more than the {MaxElements} supported");
            }
        }

        _elements = new ElementGeometry[total];
        _offsets = new double[total];
        foreach (var part in _parts)
        {
            part.CopyTo(_elements, _offsets);
        }
    }

    /// <summary>The spec.</summary>
    public IndicatorSpec Spec { get; }

    /// <summary>The spec params merged with the overrides.</summary>
    public IReadOnlyDictionary<string, double> Params { get; }

    /// <summary>Length of one cycle of the spec in seconds.</summary>
    public double Duration => Spec.Duration;

    /// <summary>The perspective distance in box units.</summary>
    public double Perspective => Spec.Perspective ?? DefaultPerspective;

    /// <summary>The parts with their shapes, layouts, offsets and durations resolved, in drawing order.</summary>
    public IReadOnlyList<PreparedPart> Parts => _parts;

    /// <summary>Number of elements across every part.</summary>
    public int ElementCount => _elements.Length;

    /// <summary>Element placement from the layouts, by global index.</summary>
    public IReadOnlyList<ElementGeometry> Elements => _elements;

    /// <summary>Start offset of each element in seconds, by global index.</summary>
    public IReadOnlyList<double> StartOffsets => _offsets;

    /// <summary>Resolves a spec number with <see cref="Params"/>.</summary>
    public double Resolve(Num value) => value.Resolve(Params);

    /// <summary>State of every element at spec time <paramref name="t"/> (seconds, already multiplied by the speed).</summary>
    public ElementState[] Evaluate(double t)
    {
        var states = new ElementState[_elements.Length];
        Evaluate(t, states);
        return states;
    }

    /// <summary>Writes the state of every element at spec time <paramref name="t"/> into <paramref name="destination"/>.</summary>
    /// <exception cref="ArgumentException"><paramref name="destination"/> is shorter than <see cref="ElementCount"/>.</exception>
    public void Evaluate(double t, ElementState[] destination)
    {
        if (destination is null) throw new ArgumentNullException(nameof(destination));
        if (destination.Length < _elements.Length)
        {
            throw new ArgumentException($"destination needs {_elements.Length} entries", nameof(destination));
        }
        foreach (var part in _parts) part.Evaluate(t, destination, _values, _group);
    }

    /// <summary>
    /// Spec time for a frozen <paramref name="cycleProgress"/>, a point in [0, 1] (clamped) of one cycle of
    /// <see cref="Duration"/>. It skips whole cycles until every element has started, so a frozen frame never shows
    /// elements at rest because of their start offset.
    /// </summary>
    public double TimeForCycleProgress(double cycleProgress)
    {
        double latest = 0;
        foreach (var offset in _offsets) latest = Math.Max(latest, offset);
        var duration = Spec.Duration;
        var warmup = Math.Ceiling(latest / duration) * duration;
        var clamped = Math.Min(1, Math.Max(0, cycleProgress));
        return warmup + clamped * duration;
    }

    /// <summary>Cycle progress in [0, 1) at <paramref name="local"/> seconds after the start, or -1 before the start.</summary>
    internal static double Cycle(double local, double duration) => local < 0 ? -1 : local % duration / duration;

    /// <summary>JavaScript <c>Math.round</c> (half up), at least 1. Below 1 both roundings clamp to 1.</summary>
    internal static int Count(double value, string path, string noun = "elements")
    {
        var rounded = Math.Max(1, Math.Round(value, MidpointRounding.AwayFromZero));
        if (!(rounded <= MaxElements)) throw TooMany(path, rounded, noun);
        return (int)rounded;
    }

    internal static InvalidIndicatorSpecException TooMany(string path, double count, string noun = "elements") => new(
        $"{path} resolves to {count.ToString(CultureInfo.InvariantCulture)} {noun}, more than the {MaxElements} supported");
}

/// <summary>A part of a <see cref="PreparedIndicator"/> with its params resolved.</summary>
public sealed class PreparedPart
{
    private readonly ElementGeometry[] _elements;
    private readonly double[] _offsets;
    private readonly double[] _durations;
    private readonly double[] _rest;
    private readonly PreparedTrack[] _tracks;
    private readonly PreparedTrack[] _groupTracks;

    internal PreparedPart(
        IndicatorPart part,
        int index,
        int firstIndex,
        double specDuration,
        IReadOnlyDictionary<string, double> parameters,
        string prefix)
    {
        Part = part;
        Index = index;
        FirstIndex = firstIndex;
        _elements = Layout(part.Layout, parameters, prefix);
        Shape = ResolveShape(part.Shape, parameters, prefix);
        _offsets = Offsets(part.Stagger, _elements.Length);
        Duration = part.Duration ?? specDuration;
        _durations = ElementDurations(part.Durations, Duration, _elements.Length);

        _rest = (double[])PreparedIndicator.RestValues.Clone();
        if (part.Rest is { } rest)
        {
            foreach (var entry in rest) _rest[(int)entry.Key] = entry.Value.Resolve(parameters);
        }
        _tracks = Prepare(part.Tracks, parameters);
        _groupTracks = Prepare(part.GroupTracks, parameters);
    }

    /// <summary>The part.</summary>
    public IndicatorPart Part { get; }

    /// <summary>Index of the part in the spec.</summary>
    public int Index { get; }

    /// <summary>The shape with its params resolved and its defaults filled in.</summary>
    public ResolvedShape Shape { get; }

    /// <summary>Global index of the first element of the part.</summary>
    public int FirstIndex { get; }

    /// <summary>Number of elements of the part.</summary>
    public int ElementCount => _elements.Length;

    /// <summary>Element placement from the layout, by index within the part.</summary>
    public IReadOnlyList<ElementGeometry> Elements => _elements;

    /// <summary>Start offset of each element in seconds, by index within the part.</summary>
    public IReadOnlyList<double> StartOffsets => _offsets;

    /// <summary>Cycle length of each element in seconds, by index within the part.</summary>
    public IReadOnlyList<double> Durations => _durations;

    /// <summary>Cycle length of the group tracks in seconds.</summary>
    public double Duration { get; }

    internal void CopyTo(ElementGeometry[] elements, double[] offsets)
    {
        Array.Copy(_elements, 0, elements, FirstIndex, _elements.Length);
        Array.Copy(_offsets, 0, offsets, FirstIndex, _offsets.Length);
    }

    internal void Evaluate(double t, ElementState[] destination, double[] values, double[] group)
    {
        Array.Copy(PreparedIndicator.RestValues, group, group.Length);
        var groupProgress = PreparedIndicator.Cycle(t, Duration);
        if (groupProgress >= 0)
        {
            foreach (var track in _groupTracks) group[track.Property] = track.Sample(groupProgress);
        }
        var groupScale = group[(int)AnimatableProperty.Scale];

        for (var i = 0; i < _elements.Length; i++)
        {
            Array.Copy(_rest, values, values.Length);
            var p = PreparedIndicator.Cycle(t - _offsets[i], _durations[i]);
            if (p >= 0)
            {
                foreach (var track in _tracks) values[track.Property] = track.Sample(p);
            }
            var element = _elements[i];
            var scale = values[(int)AnimatableProperty.Scale];
            destination[FirstIndex + i] = new ElementState(
                FirstIndex + i,
                Index,
                element.Cx,
                element.Cy,
                element.Width,
                element.Height,
                ScaleX: scale * values[(int)AnimatableProperty.ScaleX],
                ScaleY: scale * values[(int)AnimatableProperty.ScaleY],
                Opacity: values[(int)AnimatableProperty.Opacity] * group[(int)AnimatableProperty.Opacity],
                Rotate: element.Rotate + values[(int)AnimatableProperty.Rotate],
                RotateX: values[(int)AnimatableProperty.RotateX],
                RotateY: values[(int)AnimatableProperty.RotateY],
                TranslateX: values[(int)AnimatableProperty.TranslateX],
                TranslateY: values[(int)AnimatableProperty.TranslateY],
                StrokeStart: values[(int)AnimatableProperty.StrokeStart],
                StrokeEnd: values[(int)AnimatableProperty.StrokeEnd],
                GroupScaleX: groupScale * group[(int)AnimatableProperty.ScaleX],
                GroupScaleY: groupScale * group[(int)AnimatableProperty.ScaleY],
                GroupRotate: group[(int)AnimatableProperty.Rotate],
                GroupTranslateX: group[(int)AnimatableProperty.TranslateX],
                GroupTranslateY: group[(int)AnimatableProperty.TranslateY]);
        }
    }

    private static PreparedTrack[] Prepare(IReadOnlyList<Track>? tracks, IReadOnlyDictionary<string, double> parameters)
    {
        if (tracks is null) return Array.Empty<PreparedTrack>();
        var prepared = new PreparedTrack[tracks.Count];
        for (var i = 0; i < prepared.Length; i++) prepared[i] = new PreparedTrack(tracks[i], parameters);
        return prepared;
    }

    private static ElementGeometry[] Layout(IndicatorLayout layout, IReadOnlyDictionary<string, double> parameters, string prefix)
    {
        double N(Num value) => value.Resolve(parameters);
        double Or(Num? value, double fallback) => value is { } number ? N(number) : fallback;

        switch (layout)
        {
            case SingleLayout single:
            {
                var size = Or(single.Size, 1);
                return new[] { new ElementGeometry(Or(single.X, 0.5), Or(single.Y, 0.5), Or(single.Width, size), Or(single.Height, size), 0) };
            }
            case StackLayout stack:
            {
                var count = PreparedIndicator.Count(N(stack.Count), $"{prefix}layout.count");
                var size = Or(stack.Size, 1);
                var element = new ElementGeometry(Or(stack.X, 0.5), Or(stack.Y, 0.5), Or(stack.Width, size), Or(stack.Height, size), 0);
                var elements = new ElementGeometry[count];
                for (var i = 0; i < count; i++) elements[i] = element;
                return elements;
            }
            case RowLayout row:
            {
                var count = PreparedIndicator.Count(N(row.Count), $"{prefix}layout.count");
                var gap = N(row.Gap);
                var width = Or(row.ItemWidth, (1 - gap * (count - 1)) / count);
                var height = Or(row.ItemHeight, width);
                var start = (1 - (count * width + (count - 1) * gap)) / 2;
                var elements = new ElementGeometry[count];
                for (var i = 0; i < count; i++)
                {
                    elements[i] = new ElementGeometry(start + width / 2 + i * (width + gap), 0.5, width, height, 0);
                }
                return elements;
            }
            case GridLayout grid:
            {
                var columns = PreparedIndicator.Count(N(grid.Columns), $"{prefix}layout.columns");
                var rows = PreparedIndicator.Count(N(grid.Rows), $"{prefix}layout.rows");
                if ((long)columns * rows > PreparedIndicator.MaxElements)
                {
                    throw PreparedIndicator.TooMany($"{prefix}layout.columns × {prefix}layout.rows", (double)columns * rows);
                }
                var gap = N(grid.Gap);
                var width = (1 - gap * (columns - 1)) / columns;
                var height = (1 - gap * (rows - 1)) / rows;
                var elements = new ElementGeometry[columns * rows];
                for (var i = 0; i < elements.Length; i++)
                {
                    var column = i % columns;
                    var rowIndex = i / columns;
                    elements[i] = new ElementGeometry(
                        width / 2 + column * (width + gap),
                        height / 2 + rowIndex * (height + gap),
                        width,
                        height,
                        0);
                }
                return elements;
            }
            case RingLayout ring:
            {
                var count = PreparedIndicator.Count(N(ring.Count), $"{prefix}layout.count");
                var size = N(ring.ItemSize);
                var start = Or(ring.StartAngle, 0);
                var radius = 0.5 - size / 2;
                var width = Or(ring.ItemWidth, size);
                var height = Or(ring.ItemHeight, size);
                var elements = new ElementGeometry[count];
                for (var i = 0; i < count; i++)
                {
                    var angle = start + i * 2 * Math.PI / count;
                    elements[i] = new ElementGeometry(
                        0.5 + radius * Math.Cos(angle),
                        0.5 + radius * Math.Sin(angle),
                        width,
                        height,
                        ring.Orient ? angle + Math.PI / 2 : 0);
                }
                return elements;
            }
            default:
                throw new InvalidIndicatorSpecException($"{prefix}layout.type must be one of single, stack, row, grid, ring");
        }
    }

    private static ResolvedShape ResolveShape(IndicatorShape shape, IReadOnlyDictionary<string, double> parameters, string prefix)
    {
        double Or(Num? value, double fallback) => value is { } number ? number.Resolve(parameters) : fallback;

        return shape switch
        {
            CircleShape circle => new ResolvedShape(
                ShapeType.Circle,
                StartAngle: Or(circle.StartAngle, -Math.PI / 2),
                Sweep: Or(circle.Sweep, 2 * Math.PI)),
            RectShape rect => new ResolvedShape(ShapeType.Rect, CornerRadius: Or(rect.CornerRadius, 0)),
            RingShape ring => new ResolvedShape(
                ShapeType.Ring,
                StartAngle: Or(ring.StartAngle, -Math.PI / 2),
                Sweep: Or(ring.Sweep, 2 * Math.PI),
                StrokeWidth: ring.StrokeWidth.Resolve(parameters),
                Segments: ring.Segments is { } segments
                    ? PreparedIndicator.Count(segments.Resolve(parameters), $"{prefix}shape.segments", "segments")
                    : 1),
            TriangleShape => new ResolvedShape(ShapeType.Triangle),
            LineShape => new ResolvedShape(ShapeType.Line),
            _ => throw new InvalidIndicatorSpecException($"{prefix}shape.type must be one of circle, rect, ring, triangle, line"),
        };
    }

    private static double[] Offsets(IndicatorStagger? stagger, int count)
    {
        var offsets = new double[count];
        switch (stagger)
        {
            case UniformStagger uniform:
                for (var i = 0; i < count; i++) offsets[i] = uniform.Start + uniform.Each * i;
                break;
            case ExplicitStagger { Offsets: var list }:
                if (list.Count < count)
                {
                    throw new InvalidIndicatorSpecException(
                        $"stagger has {list.Count} entries but the layout has {count} elements");
                }
                for (var i = 0; i < count; i++) offsets[i] = list[i];
                break;
        }
        return offsets;
    }

    private static double[] ElementDurations(IReadOnlyList<double>? durations, double fallback, int count)
    {
        var result = new double[count];
        if (durations is null)
        {
            for (var i = 0; i < count; i++) result[i] = fallback;
            return result;
        }
        if (durations.Count < count)
        {
            throw new InvalidIndicatorSpecException(
                $"durations has {durations.Count} entries but the layout has {count} elements");
        }
        for (var i = 0; i < count; i++) result[i] = durations[i];
        return result;
    }

    private sealed class PreparedTrack
    {
        private readonly double[] _keyTimes;
        private readonly double[] _values;
        private readonly Easing[] _easings;

        public PreparedTrack(Track track, IReadOnlyDictionary<string, double> parameters)
        {
            Property = (int)track.Property;
            _keyTimes = new double[track.KeyTimes.Count];
            for (var k = 0; k < _keyTimes.Length; k++) _keyTimes[k] = track.KeyTimes[k];
            _values = new double[track.Values.Count];
            for (var k = 0; k < _values.Length; k++) _values[k] = track.Values[k].Resolve(parameters);
            _easings = new Easing[_keyTimes.Length - 1];
            for (var k = 0; k < _easings.Length; k++)
            {
                _easings[k] = track.SegmentEasings is { } segments ? segments[k] : track.Easing ?? Easing.Linear;
            }
        }

        public int Property { get; }

        /// <summary>SPEC §5.2.</summary>
        public double Sample(double p)
        {
            var keyTimes = _keyTimes;
            var values = _values;
            var last = keyTimes.Length - 1;
            if (p <= keyTimes[0]) return values[0];
            if (p >= keyTimes[last]) return values[last];

            var k = 0;
            while (k < last - 1 && p >= keyTimes[k + 1]) k++;
            var start = keyTimes[k];
            var end = keyTimes[k + 1];
            var u = end > start ? (p - start) / (end - start) : 1;
            return values[k] + (values[k + 1] - values[k]) * _easings[k].Evaluate(u);
        }
    }
}
