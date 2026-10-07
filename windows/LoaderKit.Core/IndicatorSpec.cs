using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;

namespace LoaderKit;

/// <summary>
/// An indicator described as data (schema version 1): one group of elements written inline (<see cref="Part"/>),
/// or a list of groups drawn in order (<see cref="Parts"/>), animated over cycles of <see cref="Duration"/> seconds.
/// </summary>
public sealed record IndicatorSpec
{
    /// <summary>The schema version this library reads.</summary>
    public const int CurrentSchemaVersion = 1;

    /// <summary>A spec with one group of elements, written inline.</summary>
    /// <param name="name">Display name of the indicator.</param>
    /// <param name="duration">Length of one cycle in seconds, at speed 1.</param>
    /// <param name="part">The group of elements. Its <see cref="IndicatorPart.Duration"/> must be null.</param>
    public IndicatorSpec(string name, double duration, IndicatorPart part)
    {
        Name = name;
        Duration = duration;
        Part = part;
    }

    /// <summary>A spec with several groups of elements, drawn in order.</summary>
    /// <param name="name">Display name of the indicator.</param>
    /// <param name="duration">Length of one cycle in seconds, at speed 1, and the default cycle of every part.</param>
    /// <param name="parts">The groups. Element indices, and so colors, run across them.</param>
    public IndicatorSpec(string name, double duration, IReadOnlyList<IndicatorPart> parts)
    {
        Name = name;
        Duration = duration;
        Parts = parts;
    }

    /// <summary>Display name of the indicator.</summary>
    public string Name { get; init; }

    /// <summary>
    /// Length of one cycle in seconds, at speed 1. <see cref="PreparedIndicator.TimeForCycleProgress"/> freezes a
    /// point of this cycle.
    /// </summary>
    public double Duration { get; init; }

    /// <summary>The group of elements of a spec written inline; null when the spec has <see cref="Parts"/>.</summary>
    public IndicatorPart? Part { get; init; }

    /// <summary>The groups of elements, drawn in order; null for a spec written inline.</summary>
    public IReadOnlyList<IndicatorPart>? Parts { get; init; }

    /// <summary>Schema version; must be <see cref="CurrentSchemaVersion"/>.</summary>
    public int SchemaVersion { get; init; } = CurrentSchemaVersion;

    /// <summary>Parameter defaults. Users override them by name.</summary>
    public IReadOnlyDictionary<string, double>? Params { get; init; }

    /// <summary>Distance from the viewer to the box for 3D rotations, in box units. Null means 2.5.</summary>
    public double? Perspective { get; init; }

    /// <summary>The groups of the spec: <see cref="Parts"/>, or the inline <see cref="Part"/>.</summary>
    public IReadOnlyList<IndicatorPart> GetParts() =>
        Parts ?? (Part is { } part ? new[] { part } : Array.Empty<IndicatorPart>());

    /// <summary>Parses and validates a JSON spec.</summary>
    /// <exception cref="InvalidIndicatorSpecException">The JSON is malformed or breaks a schema rule.</exception>
    public static IndicatorSpec Parse(string json)
    {
        if (json is null) throw new ArgumentNullException(nameof(json));
        JsonDocument document;
        try
        {
            document = JsonDocument.Parse(json);
        }
        catch (JsonException error)
        {
            throw new InvalidIndicatorSpecException($"spec is not valid JSON: {error.Message}");
        }
        using (document)
        {
            return Parse(document.RootElement);
        }
    }

    /// <summary>Parses and validates a JSON spec.</summary>
    /// <exception cref="InvalidIndicatorSpecException">The JSON breaks a schema rule.</exception>
    public static IndicatorSpec Parse(JsonElement json)
    {
        var errors = IndicatorSpecValidator.Validate(json);
        if (errors.Count > 0) throw new InvalidIndicatorSpecException(errors);
        var spec = IndicatorSpecReader.Read(json);
        errors = IndicatorSpecValidator.Validate(spec);
        if (errors.Count > 0) throw new InvalidIndicatorSpecException(errors);
        return spec;
    }

    /// <summary>Parses and validates a JSON spec without throwing.</summary>
    /// <returns>True when <paramref name="spec"/> is a valid spec; otherwise <paramref name="errors"/> lists the problems.</returns>
    public static bool TryParse(string json, [NotNullWhen(true)] out IndicatorSpec? spec, out IReadOnlyList<string> errors)
    {
        try
        {
            spec = Parse(json);
            errors = Array.Empty<string>();
            return true;
        }
        catch (InvalidIndicatorSpecException error)
        {
            spec = null;
            errors = error.Errors;
            return false;
        }
    }

    /// <summary>Every problem with this spec; empty when it is valid.</summary>
    public IReadOnlyList<string> Validate() => IndicatorSpecValidator.Validate(this);
}

/// <summary>A group of elements that share a layout, a shape and tracks.</summary>
/// <param name="Layout">Where the elements sit inside the unit box.</param>
/// <param name="Shape">What every element of the group draws.</param>
public sealed record IndicatorPart(IndicatorLayout Layout, IndicatorShape Shape)
{
    /// <summary>Tracks applied to every element of the group.</summary>
    public IReadOnlyList<Track>? Tracks { get; init; }

    /// <summary>Start offset of each element; null means every element starts at 0.</summary>
    public IndicatorStagger? Stagger { get; init; }

    /// <summary>Cycle length of this group in seconds; null means the spec duration. Only for <see cref="IndicatorSpec.Parts"/>.</summary>
    public double? Duration { get; init; }

    /// <summary>Cycle length of each element by index, overriding <see cref="Duration"/>. Must cover every element.</summary>
    public IReadOnlyList<double>? Durations { get; init; }

    /// <summary>Values of properties that no track drives, also shown before an element starts.</summary>
    public IReadOnlyDictionary<AnimatableProperty, Num>? Rest { get; init; }

    /// <summary>
    /// Tracks that move the whole group around the box center, on the group's cycle, without stagger. Their property
    /// is one of <see cref="AnimatableProperty.Scale"/>, <see cref="AnimatableProperty.ScaleX"/>,
    /// <see cref="AnimatableProperty.ScaleY"/>, <see cref="AnimatableProperty.Opacity"/>,
    /// <see cref="AnimatableProperty.Rotate"/>, <see cref="AnimatableProperty.TranslateX"/> or
    /// <see cref="AnimatableProperty.TranslateY"/>.
    /// </summary>
    public IReadOnlyList<Track>? GroupTracks { get; init; }
}

/// <summary>A property that a <see cref="Track"/> animates.</summary>
public enum AnimatableProperty
{
    /// <summary>Uniform scale, multiplied into both axes. Rest value 1.</summary>
    Scale,

    /// <summary>Horizontal scale. Rest value 1.</summary>
    ScaleX,

    /// <summary>Vertical scale. Rest value 1.</summary>
    ScaleY,

    /// <summary>Multiplies the alpha of the element color. Rest value 1.</summary>
    Opacity,

    /// <summary>Rotation around the screen axis in radians, clockwise. Rest value 0.</summary>
    Rotate,

    /// <summary>3D rotation around the horizontal axis in radians. Rest value 0.</summary>
    RotateX,

    /// <summary>3D rotation around the vertical axis in radians. Rest value 0.</summary>
    RotateY,

    /// <summary>Horizontal translation in box units. Rest value 0.</summary>
    TranslateX,

    /// <summary>Vertical translation in box units, down. Rest value 0.</summary>
    TranslateY,

    /// <summary>Start of the drawn part of each arc of a <see cref="RingShape"/>, as a fraction of the arc. Rest value 0.</summary>
    StrokeStart,

    /// <summary>End of the drawn part of each arc of a <see cref="RingShape"/>, as a fraction of the arc. Rest value 1.</summary>
    StrokeEnd,
}

/// <summary>How the value of one property changes over a cycle.</summary>
/// <param name="Property">The animated property.</param>
/// <param name="KeyTimes">Non-decreasing cycle progress values in [0, 1], at least 2, as many as <paramref name="Values"/>.</param>
/// <param name="Values">The value at each key time.</param>
public sealed record Track(AnimatableProperty Property, IReadOnlyList<double> KeyTimes, IReadOnlyList<Num> Values)
{
    /// <summary>One easing for every segment. Null with no <see cref="SegmentEasings"/> means linear.</summary>
    public Easing? Easing { get; init; }

    /// <summary>One easing per segment (<c>KeyTimes.Count - 1</c> entries). Exclusive with <see cref="Easing"/>.</summary>
    public IReadOnlyList<Easing>? SegmentEasings { get; init; }
}

/// <summary>Where the elements sit in the unit box. One of <see cref="SingleLayout"/>, <see cref="StackLayout"/>,
/// <see cref="RowLayout"/>, <see cref="GridLayout"/> or <see cref="RingLayout"/>.</summary>
public abstract record IndicatorLayout
{
    private protected IndicatorLayout()
    {
    }
}

/// <summary>One element of <c>Width × Height</c> centered at <c>(X, Y)</c>.</summary>
/// <param name="Size">Side of the element; null means 1.</param>
/// <param name="Width">Element width; null means <paramref name="Size"/>.</param>
/// <param name="Height">Element height; null means <paramref name="Size"/>.</param>
/// <param name="X">Center x; null means 0.5.</param>
/// <param name="Y">Center y; null means 0.5.</param>
public sealed record SingleLayout(Num? Size = null, Num? Width = null, Num? Height = null, Num? X = null, Num? Y = null)
    : IndicatorLayout;

/// <summary><paramref name="Count"/> elements like <see cref="SingleLayout"/>, all at the same place.</summary>
/// <param name="Count">Number of elements, rounded to the nearest integer, at least 1.</param>
/// <param name="Size">Side of the elements; null means 1.</param>
/// <param name="Width">Element width; null means <paramref name="Size"/>.</param>
/// <param name="Height">Element height; null means <paramref name="Size"/>.</param>
/// <param name="X">Center x; null means 0.5.</param>
/// <param name="Y">Center y; null means 0.5.</param>
public sealed record StackLayout(
    Num Count,
    Num? Size = null,
    Num? Width = null,
    Num? Height = null,
    Num? X = null,
    Num? Y = null) : IndicatorLayout;

/// <summary><paramref name="Count"/> elements in a horizontal row, <paramref name="Gap"/> apart, centered in the box.</summary>
/// <param name="Count">Number of elements, rounded to the nearest integer, at least 1.</param>
/// <param name="Gap">Space between two elements.</param>
/// <param name="ItemWidth">Element width; null means the elements and gaps fill the box.</param>
/// <param name="ItemHeight">Element height; null means square elements.</param>
public sealed record RowLayout(Num Count, Num Gap, Num? ItemWidth = null, Num? ItemHeight = null) : IndicatorLayout;

/// <summary>A row-major grid of <paramref name="Columns"/> × <paramref name="Rows"/> elements.</summary>
public sealed record GridLayout(Num Columns, Num Rows, Num Gap) : IndicatorLayout;

/// <summary><paramref name="Count"/> elements on a circle of radius <c>0.5 - ItemSize / 2</c>.</summary>
/// <param name="Count">Number of elements, rounded to the nearest integer, at least 1.</param>
/// <param name="ItemSize">Side of each element; it sets the radius of the circle.</param>
/// <param name="StartAngle">Angle of the first element in radians; null means 0 (right of the center).</param>
/// <param name="Orient">Rotate each element by its angle plus π/2, so its top points away from the center.</param>
/// <param name="ItemWidth">Element width; null means <paramref name="ItemSize"/>.</param>
/// <param name="ItemHeight">Element height; null means <paramref name="ItemSize"/>.</param>
public sealed record RingLayout(
    Num Count,
    Num ItemSize,
    Num? StartAngle = null,
    bool Orient = false,
    Num? ItemWidth = null,
    Num? ItemHeight = null) : IndicatorLayout;

/// <summary>What every element draws, centered on it and filling its rectangle. One of <see cref="CircleShape"/>,
/// <see cref="RectShape"/>, <see cref="RingShape"/>, <see cref="TriangleShape"/> or <see cref="LineShape"/>.</summary>
public abstract record IndicatorShape
{
    private protected IndicatorShape()
    {
    }
}

/// <summary>
/// A filled ellipse inscribed in the element rectangle. With a <paramref name="Sweep"/> below 2π, only the part
/// between the arc from <paramref name="StartAngle"/> (clockwise) and the chord that joins its ends.
/// </summary>
/// <param name="StartAngle">Where the arc starts in radians; null means -π/2 (the top).</param>
/// <param name="Sweep">Angle covered by the arc, in (0, 2π]; null means 2π.</param>
public sealed record CircleShape(Num? StartAngle = null, Num? Sweep = null) : IndicatorShape;

/// <summary>A filled rectangle with corner radius <c>CornerRadius · min(width, height)</c>.</summary>
public sealed record RectShape(Num? CornerRadius = null) : IndicatorShape;

/// <summary>
/// <paramref name="Segments"/> stroked arcs of a circle whose outer edge touches the element rectangle, each covering
/// <paramref name="Sweep"/> clockwise; stroke <c>StrokeWidth · min(width, height)</c>. The element properties
/// <see cref="AnimatableProperty.StrokeStart"/> and <see cref="AnimatableProperty.StrokeEnd"/> trim every arc.
/// </summary>
/// <param name="StrokeWidth">Stroke width as a fraction of the shorter side of the element.</param>
/// <param name="StartAngle">Where the first arc starts in radians; null means -π/2 (the top).</param>
/// <param name="Sweep">Angle covered by each arc, in (0, 2π]; null means 2π.</param>
/// <param name="Segments">Number of arcs, evenly spaced; null means 1.</param>
public sealed record RingShape(Num StrokeWidth, Num? StartAngle = null, Num? Sweep = null, Num? Segments = null)
    : IndicatorShape;

/// <summary>A filled triangle: top-center, bottom-right, bottom-left.</summary>
public sealed record TriangleShape : IndicatorShape;

/// <summary>A filled bar with fully rounded ends.</summary>
public sealed record LineShape : IndicatorShape;

/// <summary>Start offsets of the elements. One of <see cref="ExplicitStagger"/> or <see cref="UniformStagger"/>.</summary>
public abstract record IndicatorStagger
{
    private protected IndicatorStagger()
    {
    }
}

/// <summary>
/// The start offset in seconds of each element, by index. Must cover every element. A negative offset starts the
/// element part way through its cycle.
/// </summary>
public sealed record ExplicitStagger(IReadOnlyList<double> Offsets) : IndicatorStagger;

/// <summary>Element <c>i</c> starts at <c>Start + Each · i</c> seconds.</summary>
public sealed record UniformStagger(double Each, double Start = 0) : IndicatorStagger;
