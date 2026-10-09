using System;
using System.Collections.Generic;
using System.Globalization;

namespace LoaderKit;

/// <summary>Options with every default applied and every number made safe to draw with.</summary>
public sealed record ResolvedProgress
{
    private static readonly Dictionary<string, double> ThicknessDefaults = new()
    {
        ["linear:flat"] = 4, ["linear:wavy"] = 4, ["linear:segmented"] = 6, ["linear:striped"] = 10, ["linear:shimmer"] = 8,
        ["linear:glow"] = 3, ["linear:dots"] = 4, ["linear:steps"] = 3, ["circular:gradient"] = 5, ["circular:ticks"] = 3,
        ["gauge"] = 6, ["liquid"] = 3, ["border"] = 3, ["battery"] = 3,
    };

    /// <summary>Shorter waves alias: the wave is sampled every 2 units of length.</summary>
    private const double MinWavelength = 8;

    private static readonly Dictionary<string, double> SegmentDefaults = new()
    {
        ["linear:segmented"] = 10, ["linear:dots"] = 8, ["linear:steps"] = 4, ["circular:segmented"] = 12, ["circular:ticks"] = 12,
        ["circular:dots"] = 10, ["gauge:segmented"] = 10, ["bars"] = 5, ["grid"] = 5,
    };

    /// <summary>
    /// Applies the defaults: a variant the type does not have becomes its default, non-finite numbers
    /// take the default, sizes are not negative and segments are whole numbers within limits.
    /// </summary>
    public ResolvedProgress(ProgressOptions? options = null)
    {
        options ??= new ProgressOptions();
        var type = options.Type ?? ProgressType.Circular;
        var variants = Variants(type);
        var variant = options.Variant is { } v && Contains(variants, v) ? v : variants[0];
        var key = Key(type, variant);
        var typeKey = Name(type);
        var linear = type == ProgressType.Linear;
        var segmentsDefault = SegmentDefaults.TryGetValue(key, out var s) ? s : SegmentDefaults.TryGetValue(typeKey, out s) ? s : 1;
        var segmentsMin = key == "linear:steps" ? 2 : 1;
        var segmentsMax = type == ProgressType.Grid ? 16 : 64;
        var thicknessDefault = ThicknessDefaults.TryGetValue(key, out var t) ? t : ThicknessDefaults.TryGetValue(typeKey, out t) ? t : 4;
        var segments = Math.Floor(Finite(options.Segments, segmentsDefault) + 0.5);
        Type = type;
        Variant = variant;
        Thickness = Math.Max(0.5, Finite(options.Thickness, thicknessDefault));
        TrackGap = Math.Max(0, Finite(options.TrackGap, 4));
        Segments = (int)Math.Min(segmentsMax, Math.Max(segmentsMin, segments));
        ShowLabel = options.ShowLabel ?? false;
        StopIndicator = options.StopIndicator ?? true;
        StrokeCap = options.StrokeCap ?? ProgressStrokeCap.Round;
        Amplitude = Math.Max(0, Finite(options.Amplitude, linear ? 3 : 2));
        Wavelength = Math.Max(MinWavelength, Finite(options.Wavelength, linear ? 40 : 15));
        WaveSpeed = Finite(options.WaveSpeed, 1);
        SweepAngle = Math.Min(350, Math.Max(30, Finite(options.SweepAngle, 270))) * Math.PI / 180;
        CornerRadius = Math.Max(0, Finite(options.CornerRadius, 12));
        Speed = Finite(options.Speed, 1);
    }

    /// <summary>The shape.</summary>
    public ProgressType Type { get; }

    /// <summary>The style, one of <see cref="Variants"/> of the type.</summary>
    public ProgressVariant Variant { get; }

    /// <summary>Width of strokes and bars.</summary>
    public double Thickness { get; }

    /// <summary>Space between the progress and the track, or between segments.</summary>
    public double TrackGap { get; }

    /// <summary>Number of segments, dots, ticks, steps, bars or grid columns.</summary>
    public int Segments { get; }

    /// <summary>Show the percentage.</summary>
    public bool ShowLabel { get; }

    /// <summary>Dot at the end of the track of linear flat and wavy.</summary>
    public bool StopIndicator { get; }

    /// <summary>Stroke ends.</summary>
    public ProgressStrokeCap StrokeCap { get; }

    /// <summary>Wave amplitude of wavy.</summary>
    public double Amplitude { get; }

    /// <summary>Wave length of wavy.</summary>
    public double Wavelength { get; }

    /// <summary>Wave travel in wavelengths per second.</summary>
    public double WaveSpeed { get; }

    /// <summary>Arc of gauge, in radians.</summary>
    public double SweepAngle { get; }

    /// <summary>Corner radius of border.</summary>
    public double CornerRadius { get; }

    /// <summary>Playback rate of the indeterminate animation.</summary>
    public double Speed { get; }

    /// <summary>The variants <paramref name="type"/> accepts; the first one is its default.</summary>
    public static IReadOnlyList<ProgressVariant> Variants(ProgressType type) => type switch
    {
        ProgressType.Linear => new[] { ProgressVariant.Flat, ProgressVariant.Wavy, ProgressVariant.Segmented, ProgressVariant.Striped, ProgressVariant.Shimmer, ProgressVariant.Glow, ProgressVariant.Dots, ProgressVariant.Steps },
        ProgressType.Circular => new[] { ProgressVariant.Flat, ProgressVariant.Wavy, ProgressVariant.Segmented, ProgressVariant.Gradient, ProgressVariant.Ticks, ProgressVariant.Dots },
        ProgressType.Gauge => new[] { ProgressVariant.Flat, ProgressVariant.Segmented },
        _ => new[] { ProgressVariant.Flat },
    };

    /// <summary>True when <see cref="Segments"/> changes how this type and variant draw.</summary>
    public bool UsesSegments => SegmentDefaults.ContainsKey(Key(Type, Variant)) || Type == ProgressType.Bars || Type == ProgressType.Grid;

    /// <summary>True when a linear label sits inside the bar rather than after it.</summary>
    public bool LabelInside => Type == ProgressType.Linear && ShowLabel && Thickness >= 14
        && (Variant == ProgressVariant.Flat || Variant == ProgressVariant.Striped || Variant == ProgressVariant.Shimmer);

    /// <summary>
    /// True when the indicator moves even with a fixed value (waves, stripes, sheens, liquid). With a
    /// state, a wave that has flattened out does not count.
    /// </summary>
    /// <param name="state">The current animation state, or null to ask about the type and variant only.</param>
    public bool HasAmbientMotion(ProgressState? state = null)
    {
        if (Type == ProgressType.Liquid || Variant == ProgressVariant.Striped || Variant == ProgressVariant.Shimmer) return true;
        return Variant == ProgressVariant.Wavy && (state is not { } s || s.Wave > 0);
    }

    /// <summary>Height of a linear indicator, which takes its width from the layout.</summary>
    public double LinearHeight
    {
        get
        {
            var t = Thickness;
            var height = Variant switch
            {
                ProgressVariant.Wavy => t + 2 * Amplitude + 4,
                ProgressVariant.Glow => t + 18,
                ProgressVariant.Dots => Math.Max(6, t * 2) * 2.3,
                ProgressVariant.Steps => 2 * Math.Max(7, t * 1.75) + 4,
                _ => t + 4,
            };
            if (ShowLabel && !LabelInside) height = Math.Max(height, 18);
            return Math.Ceiling(height);
        }
    }

    /// <summary>Width a layout gives the indicator when nothing else sizes it; null fills the available width (linear) or wraps the content (border).</summary>
    public double? IntrinsicWidth => Type is ProgressType.Linear or ProgressType.Border ? null : ProgressGeometry.DefaultSize;

    /// <summary>Height a layout gives the indicator when nothing else sizes it; null wraps the content (border).</summary>
    public double? IntrinsicHeight => Type switch
    {
        ProgressType.Linear => LinearHeight,
        ProgressType.Border => null,
        ProgressType.Bars => ProgressGeometry.DefaultSize * 0.75,
        ProgressType.Battery => ProgressGeometry.DefaultSize / 2,
        _ => ProgressGeometry.DefaultSize,
    };

    /// <summary>Padding between a border and its content, so the stroke does not cover it.</summary>
    public double ContentInset => Type == ProgressType.Border ? Thickness + TrackGap : 0;

    internal static string Name(ProgressType type) => type.ToString().ToLowerInvariant();

    internal static string Name(ProgressVariant variant) => variant.ToString().ToLowerInvariant();

    private static string Key(ProgressType type, ProgressVariant variant) => Name(type) + ":" + Name(variant);

    private static bool Contains(IReadOnlyList<ProgressVariant> list, ProgressVariant value)
    {
        foreach (var item in list) if (item == value) return true;
        return false;
    }

    private static double Finite(double? value, double fallback) =>
        value is { } v && !double.IsNaN(v) && !double.IsInfinity(v) ? v : fallback;
}

/// <summary>Turns resolved options and an animation state into draw commands, the same on every platform.</summary>
public static class ProgressGeometry
{
    /// <summary>Default width and height of every type that does not fill its container or wrap its content.</summary>
    public const double DefaultSize = 48;

    /// <summary>Room a linear label takes after the bar when it does not fit inside.</summary>
    public const double LabelWidth = 44;

    private const double Tau = Math.PI * 2;
    private const double Top = -Math.PI / 2;
    private const double MinWavySize = 32;

    /// <summary>The percentage text of the labels, rounded half up.</summary>
    public static string Label(double value) =>
        ((int)Math.Floor(Clamp01(value) * 100 + 0.5)).ToString(CultureInfo.InvariantCulture) + "%";

    /// <summary>Fill order of the grid cells: diagonal by diagonal from the top-left, top row first.</summary>
    public static int[] GridOrder(int columns)
    {
        if (columns <= 0) return Array.Empty<int>();
        var rank = new int[columns * columns];
        var next = 0;
        for (var d = 0; d <= 2 * (columns - 1); d++)
        {
            for (var r = Math.Max(0, d - columns + 1); r <= Math.Min(d, columns - 1); r++) rank[r * columns + (d - r)] = next++;
        }
        return rank;
    }

    /// <summary>
    /// The draw commands for <paramref name="p"/> in a <paramref name="width"/> x <paramref name="height"/> box.
    /// Linear and border fill the box; bars keep a 4:3 shape, battery 2:1 and the other types a square, centered in the box.
    /// </summary>
    public static ProgressDrawing Commands(ResolvedProgress p, ProgressState s, double width, double height)
    {
        if (p is null) throw new ArgumentNullException(nameof(p));
        var b = new Builder(p, s);
        if (!(width > 0) || !(height > 0) || double.IsInfinity(width) || double.IsInfinity(height)) return new ProgressDrawing(0, 0, b.Out);
        switch (p.Type)
        {
            case ProgressType.Linear:
                b.LinearAny(width, height);
                return new ProgressDrawing(0, 0, b.Out);
            case ProgressType.Border:
                b.Border(width, height);
                return new ProgressDrawing(0, 0, b.Out);
            case ProgressType.Bars:
            {
                var w = Math.Min(width, height * 4 / 3);
                var h = w * 3 / 4;
                b.Bars(w, h);
                return new ProgressDrawing((width - w) / 2, (height - h) / 2, b.Out);
            }
            case ProgressType.Battery:
            {
                var w = Math.Min(width, height * 2);
                var h = w / 2;
                b.Battery(w, h);
                return new ProgressDrawing((width - w) / 2, (height - h) / 2, b.Out);
            }
            default:
            {
                var size = Math.Min(width, height);
                switch (p.Type)
                {
                    case ProgressType.Circular: b.CircularAny(size); break;
                    case ProgressType.Pie: b.Pie(size); break;
                    case ProgressType.Gauge: b.Gauge(size); break;
                    case ProgressType.Liquid: b.Liquid(size); break;
                    default: b.Grid(size); break;
                }
                return new ProgressDrawing((width - size) / 2, (height - size) / 2, b.Out);
            }
        }
    }

    private static readonly Easing Emphasized = new(0.2, 0, 0, 1);
    private static readonly Easing Standard = new(0.4, 0, 0.2, 1);
    private static readonly Easing EaseInOut = new(0.65, 0, 0.35, 1);
    private static readonly double[] Bolt = { 0.15, -1, -0.55, 0.12, -0.05, 0.12, -0.2, 1, 0.55, -0.15, 0.05, -0.15 };

    private static double Clamp01(double x) => Math.Min(1, Math.Max(0, x));

    private static double Mod(double x, double m) => x - Math.Floor(x / m) * m;

    private static double RoundHalfUp(double x) => Math.Floor(x + 0.5);

    private static int Steps(double x) => (int)Math.Ceiling(x - 1e-9);

    private static double Bump(double d, double width)
    {
        var x = Math.Abs(d) / width;
        return x >= 1 ? 0 : 0.5 + 0.5 * Math.Cos(Math.PI * x);
    }

    private static double Hypot(double x, double y) => Math.Sqrt(x * x + y * y);

    private static ProgressPaint Solid(ProgressColorRole color, double alpha = 1) => new ProgressPaint.Solid(color, alpha);

    private static ProgressClipShape RectClip(double x, double y, double width, double height, double radius) =>
        new ProgressClipShape.Rect(x, y, width, height, Math.Max(0, Math.Min(radius, Math.Min(width / 2, height / 2))));

    private static double LabelSize(double size) => Math.Max(10, Math.Min(size * 0.22, 44));

    private static ProgressPaint Sheen(double x, double width, ProgressColorRole color, double peak) => new ProgressPaint.Linear(x, 0, x + width, 0, new[]
    {
        new ProgressColorStop(0, color, 0),
        new ProgressColorStop(0.5, color, peak),
        new ProgressColorStop(1, color, 0),
    });

    private static ProgressPaint Fade(double cx, double cy, double r, double alpha) => new ProgressPaint.Radial(cx, cy, r, new[]
    {
        new ProgressColorStop(0, ProgressColorRole.Color, alpha),
        new ProgressColorStop(1, ProgressColorRole.Color, 0),
    });

    /// <summary>Active segments of the indeterminate linear indicator, as (start, end) fractions of the track.</summary>
    private static List<(double Start, double End)> LinearSegments(double u)
    {
        var head1 = Emphasized.Evaluate(Clamp01(u / 0.55));
        var tail1 = Standard.Evaluate(Clamp01((u - 0.15) / 0.55));
        var head2 = Emphasized.Evaluate(Clamp01((u - 0.5) / 0.42));
        var tail2 = Standard.Evaluate(Clamp01((u - 0.62) / 0.38));
        var segments = new List<(double, double)>(2);
        if (head1 - tail1 > 0.002) segments.Add((tail1, head1));
        if (head2 - tail2 > 0.002) segments.Add((tail2, head2));
        // The second segment enters on the left while the first is still leaving on the right.
        if (segments.Count == 2 && segments[1].Item1 < segments[0].Item1) segments.Reverse();
        return segments;
    }

    /// <summary>Arc of the indeterminate circular indicator, as (start, end) angles clockwise from the top.</summary>
    private static (double Start, double End) CircularArc(double time)
    {
        const double cycle = 1.4;
        var k = Math.Floor(time / cycle);
        var u = Mod(time / cycle, 1);
        var head = EaseInOut.Evaluate(Clamp01(u / 0.5)) * 0.72;
        var tail = EaseInOut.Evaluate(Clamp01((u - 0.5) / 0.5)) * 0.72;
        var b = Mod(k * 0.72 + time / 2.2, 1);
        return ((b + tail) * Tau, (b + head) * Tau + 0.12);
    }

    private sealed class BorderPath
    {
        public List<double> Points { get; } = new();

        public List<double> Lengths { get; } = new();

        public double Total { get; set; }
    }

    private sealed class Builder
    {
        private readonly ResolvedProgress p;
        private readonly ProgressState s;

        public Builder(ResolvedProgress p, ProgressState s)
        {
            this.p = p;
            this.s = s;
        }

        public List<ProgressCommand> Out { get; } = new();

        private Builder Nested() => new(p, s);

        // ---------- primitives ----------

        private void HLine(double x0, double x1, double y, double lineWidth, ProgressStrokeCap cap, ProgressPaint paint)
        {
            if (x1 < x0) return;
            Out.Add(new ProgressCommand.Line(x0, y, x1, y, lineWidth, cap, paint));
        }

        private void Arc(double cx, double cy, double r, double start, double end, double lineWidth, ProgressStrokeCap cap, ProgressPaint paint)
        {
            if (end <= start || r <= 0) return;
            Out.Add(new ProgressCommand.Arc(cx, cy, r, start, end, lineWidth, cap, paint));
        }

        private void Circle(double cx, double cy, double r, ProgressPaint paint)
        {
            if (r <= 0) return;
            Out.Add(new ProgressCommand.Circle(cx, cy, r, paint));
        }

        private void Rect(double x, double y, double width, double height, double radius, ProgressPaint paint)
        {
            if (width <= 0 || height <= 0) return;
            Out.Add(new ProgressCommand.Rect(x, y, width, height, Math.Max(0, Math.Min(radius, Math.Min(width / 2, height / 2))), paint));
        }

        private void Text(double x, double y, double size, string value, bool right, ProgressPaint paint) =>
            Out.Add(new ProgressCommand.Text(x, y, size, value, right, paint));

        /// <summary>The label in the text color, and again in white where <paramref name="fill"/> covers it.</summary>
        private void InvertedLabel(string value, double x, double y, double size, ProgressClipShape fill)
        {
            Text(x, y, size, value, false, Solid(ProgressColorRole.Label));
            Out.Add(new ProgressCommand.Clip(fill, new ProgressCommand[] { new ProgressCommand.Text(x, y, size, value, false, Solid(ProgressColorRole.White)) }));
        }

        private void Wave(double x0, double x1, double y, double amp, double wavelength, double phase, double lineWidth, ProgressStrokeCap cap, ProgressPaint paint)
        {
            if (x1 < x0) return;
            var n = Math.Max(1, Steps((x1 - x0) / 2));
            var points = new List<double>(2 * n + 2);
            for (var i = 0; i <= n; i++)
            {
                var x = x0 + (x1 - x0) * i / n;
                points.Add(x);
                points.Add(y + amp * Math.Sin((x - phase) / wavelength * Tau));
            }
            Out.Add(new ProgressCommand.Polyline(points, false, lineWidth, cap, paint));
        }

        private void WavyArc(double cx, double cy, double r, double amp, double waves, double phase, double start, double end, double lineWidth, ProgressStrokeCap cap, ProgressPaint paint)
        {
            if (end <= start) return;
            var n = Math.Max(8, Steps((end - start) * r / 1.5));
            var points = new List<double>(2 * n + 2);
            for (var i = 0; i <= n; i++)
            {
                var a = start + (end - start) * i / n;
                var rr = r + amp * Math.Sin(waves * a - phase);
                points.Add(cx + rr * Math.Cos(a));
                points.Add(cy + rr * Math.Sin(a));
            }
            Out.Add(new ProgressCommand.Polyline(points, false, lineWidth, cap, paint));
        }

        // ---------- linear ----------

        public void LinearAny(double w, double h)
        {
            var inside = p.LabelInside;
            var outside = p.ShowLabel && !inside;
            // A bar narrower than 20 next to the label is unreadable, so the label is left out instead.
            var labelFits = !outside || w - LabelWidth >= 20;
            var barWidth = outside && labelFits ? w - LabelWidth : w;
            switch (p.Variant)
            {
                case ProgressVariant.Segmented: LinearSegmented(barWidth, h); break;
                case ProgressVariant.Striped: LinearStriped(barWidth, h); break;
                case ProgressVariant.Shimmer: LinearShimmer(barWidth, h); break;
                case ProgressVariant.Glow: LinearGlow(barWidth, h); break;
                case ProgressVariant.Dots: LinearDots(barWidth, h); break;
                case ProgressVariant.Steps: LinearSteps(barWidth, h); break;
                default: Linear(barWidth, h); break;
            }
            if (s.Indeterminate || !p.ShowLabel || !labelFits) return;
            var label = ProgressGeometry.Label(s.Value);
            if (outside)
            {
                Text(w, h / 2, 12.5, label, true, Solid(ProgressColorRole.Label));
                return;
            }
            var t = p.Thickness;
            var v = Clamp01(s.Value);
            var r = p.StrokeCap == ProgressStrokeCap.Round ? t / 2 : 0;
            var filled = p.Variant == ProgressVariant.Flat ? (v > 0.0005 ? v * (w - 2 * r) + 2 * r : 0) : v * w;
            InvertedLabel(label, w / 2, h / 2, RoundHalfUp(Math.Min(t * 0.6, 15)), RectClip(0, 0, filled, h, 0));
        }

        private void Linear(double w, double h)
        {
            var t = p.Thickness;
            var cap = p.StrokeCap;
            var r = cap == ProgressStrokeCap.Round ? t / 2 : 0;
            var cy = h / 2;
            var x0 = r;
            var x1 = w - r;
            var len = x1 - x0;
            var wavy = p.Variant == ProgressVariant.Wavy;
            var amp = wavy ? p.Amplitude * s.Wave : 0;
            var wavelength = p.Wavelength;
            var phase = Mod(s.Time * p.WaveSpeed, 1) * wavelength;
            var gap = p.TrackGap + 2 * r;
            var color = Solid(ProgressColorRole.Color);
            var track = Solid(ProgressColorRole.Track);
            void Active(double a, double b)
            {
                if (wavy && amp > 0.05) Wave(x0 + a * len, x0 + b * len, cy, amp, wavelength, phase, t, cap, color);
                else HLine(x0 + a * len, x0 + b * len, cy, t, cap, color);
            }
            if (s.Indeterminate)
            {
                var from = 0.0;
                foreach (var (a, b) in LinearSegments(Mod(s.IndeterminateTime / 1.75, 1)))
                {
                    var end = a * len - (from == 0 && a == 0 ? 0 : gap);
                    if (end > from) HLine(x0 + from, x0 + end, cy, t, cap, track);
                    from = b * len + gap;
                    Active(a, b);
                }
                if (from < len) HLine(x0 + from, x1, cy, t, cap, track);
                return;
            }
            var v = Clamp01(s.Value);
            var trackFrom = v > 0.0005 ? v * len + gap : 0;
            if (s.Buffer > 0)
            {
                var buffer = Math.Max(v, Clamp01(s.Buffer));
                if (buffer * len - trackFrom > 0.5)
                {
                    HLine(x0 + trackFrom, x0 + buffer * len, cy, t, cap, Solid(ProgressColorRole.Color, 0.5));
                    trackFrom = buffer * len + gap;
                }
            }
            if (trackFrom < len) HLine(x0 + trackFrom, x1, cy, t, cap, track);
            if (p.StopIndicator && trackFrom < len - t) Circle(x1, cy, Math.Min(t, 4) / 2, color);
            if (v > 0.0005) Active(0, v);
        }

        private void LinearSegmented(double w, double h)
        {
            var n = p.Segments;
            var t = p.Thickness;
            var y = h / 2 - t / 2;
            var gap = Math.Max(2, p.TrackGap);
            var width = (w - gap * (n - 1)) / n;
            var radius = p.StrokeCap == ProgressStrokeCap.Round ? Math.Min(t / 2, width / 2) : 0;
            var center = Mod(s.IndeterminateTime / 1.6, 1) * (n + 4) - 2;
            for (var i = 0; i < n; i++)
            {
                var x = i * (width + gap);
                Rect(x, y, width, t, radius, Solid(ProgressColorRole.Track));
                var fill = 1.0;
                var alpha = 1.0;
                if (s.Indeterminate) alpha = Bump(i + 0.5 - center, 2.2);
                else fill = Clamp01(Clamp01(s.Value) * n - i);
                if (fill <= 0.001 || alpha <= 0.01 || width <= 0) continue;
                var inner = Nested();
                inner.Rect(x, y, width * fill, t, 0, Solid(ProgressColorRole.Color, alpha));
                Out.Add(new ProgressCommand.Clip(RectClip(x, y, width, t, radius), inner.Out));
            }
        }

        private void Stripes(double to, double y, double t, double spacing, double offset, ProgressPaint paint)
        {
            for (var x = -t - spacing * 2 + offset; x < to + t; x += spacing * 2)
            {
                Out.Add(new ProgressCommand.Polygon(new[] { x, y + t, x + spacing, y + t, x + spacing + t, y, x + t, y }, paint));
            }
        }

        private void LinearStriped(double w, double h)
        {
            var t = p.Thickness;
            var y = h / 2 - t / 2;
            var radius = t / 2;
            var spacing = Math.Max(6, t * 0.8);
            var offset = Mod((s.Indeterminate ? s.IndeterminateTime : s.Time) * 26, spacing * 2);
            Rect(0, y, w, t, radius, Solid(ProgressColorRole.Track));
            var inner = Nested();
            if (s.Indeterminate)
            {
                inner.Stripes(w, y, t, spacing, offset, Solid(ProgressColorRole.Color, 0.85));
            }
            else
            {
                var filled = w * Clamp01(s.Value);
                if (filled > 0.5)
                {
                    var fill = Nested();
                    fill.Rect(0, y, filled, t, 0, Solid(ProgressColorRole.Color));
                    fill.Stripes(filled, y, t, spacing, offset, Solid(ProgressColorRole.White, 0.22));
                    inner.Out.Add(new ProgressCommand.Clip(RectClip(0, y, filled, t, radius), fill.Out));
                }
            }
            if (inner.Out.Count > 0) Out.Add(new ProgressCommand.Clip(RectClip(0, y, w, t, radius), inner.Out));
        }

        private void LinearShimmer(double w, double h)
        {
            var t = p.Thickness;
            var y = h / 2 - t / 2;
            var radius = t / 2;
            Rect(0, y, w, t, radius, Solid(ProgressColorRole.Track));
            var inner = Nested();
            if (s.Indeterminate)
            {
                var u = Mod(s.IndeterminateTime / 1.5, 1);
                var width = w * 0.45;
                var x = -width + EaseInOut.Evaluate(u) * (w + width);
                inner.Rect(x, y, width, t, 0, Sheen(x, width, ProgressColorRole.Color, 1));
            }
            else
            {
                var filled = w * Clamp01(s.Value);
                if (filled > 0.5)
                {
                    var fill = Nested();
                    fill.Rect(0, y, filled, t, 0, Solid(ProgressColorRole.Color));
                    var u = Mod(s.Time, 2.2) / 1.5;
                    if (u < 1)
                    {
                        var width = Math.Max(36, w * 0.22);
                        var x = -width + u * (filled + width);
                        fill.Rect(x, y, width, t, 0, Sheen(x, width, ProgressColorRole.White, 0.5));
                    }
                    inner.Out.Add(new ProgressCommand.Clip(RectClip(0, y, filled, t, radius), fill.Out));
                }
            }
            if (inner.Out.Count > 0) Out.Add(new ProgressCommand.Clip(RectClip(0, y, w, t, radius), inner.Out));
        }

        private void LinearGlow(double w, double h)
        {
            var t = p.Thickness;
            var cy = h / 2;
            var cap = p.StrokeCap;
            var r = cap == ProgressStrokeCap.Round ? t / 2 : 0;
            var x0 = r + 2;
            var x1 = w - r - 2;
            var len = x1 - x0;
            HLine(x0, x1, cy, t, cap, Solid(ProgressColorRole.Color, 0.14));
            void Glow(double a, double b)
            {
                var head = x0 + b * len;
                HLine(x0 + a * len, head, cy, t + 8, cap, Solid(ProgressColorRole.Color, 0.12));
                HLine(x0 + a * len, head, cy, t + 4, cap, Solid(ProgressColorRole.Color, 0.22));
                HLine(x0 + a * len, head, cy, t, cap, Solid(ProgressColorRole.Color));
                var reach = t + 8;
                Rect(head - reach, cy - reach, 2 * reach, 2 * reach, 0, Fade(head, cy, reach, 0.55));
            }
            if (s.Indeterminate)
            {
                foreach (var (a, b) in LinearSegments(Mod(s.IndeterminateTime / 1.75, 1))) Glow(a, b);
                return;
            }
            var v = Clamp01(s.Value);
            if (v > 0.0005) Glow(0, v);
        }

        private void LinearDots(double w, double h)
        {
            var n = p.Segments;
            var d = Math.Max(6, p.Thickness * 2);
            var r = d / 2;
            var cy = h / 2 + r * 0.45;
            var spacing = (w - d) / Math.Max(1, n - 1);
            var center = Mod(s.IndeterminateTime / 1.5, 1) * (n + 3) - 1.5;
            for (var i = 0; i < n; i++)
            {
                var x = r + i * spacing;
                Circle(x, cy, r, Solid(ProgressColorRole.Track));
                if (s.Indeterminate)
                {
                    var k = Bump(i - center, 1.6);
                    if (k > 0) Circle(x, cy - k * r * 0.9, r * (0.75 + 0.25 * k), Solid(ProgressColorRole.Color, k));
                }
                else
                {
                    var fill = Clamp01(Clamp01(s.Value) * n - i);
                    if (fill > 0) Circle(x, cy, r * Math.Sqrt(fill), Solid(ProgressColorRole.Color));
                }
            }
        }

        private void LinearSteps(double w, double h)
        {
            var n = p.Segments;
            var t = p.Thickness;
            var R = Math.Max(7, t * 1.75);
            var cy = h / 2;
            const double gap = 3;
            var xs = new double[n];
            for (var i = 0; i < n; i++) xs[i] = R + i * (w - 2 * R) / (n - 1);
            var position = s.Indeterminate ? -1 : Clamp01(s.Value) * (n - 1);
            var center = Mod(s.IndeterminateTime / 2.2, 1) * n - 0.5;
            for (var i = 0; i < n - 1; i++)
            {
                var a = xs[i] + R + gap;
                var b = xs[i + 1] - R - gap;
                HLine(a, b, cy, t, ProgressStrokeCap.Round, Solid(ProgressColorRole.Track));
                if (s.Indeterminate)
                {
                    var lo = Clamp01(center - 0.3 - i);
                    var hi = Clamp01(center + 0.3 - i);
                    if (hi > lo) HLine(a + (b - a) * lo, a + (b - a) * hi, cy, t, ProgressStrokeCap.Round, Solid(ProgressColorRole.Color));
                }
                else
                {
                    var fill = Clamp01(position - i);
                    if (fill > 0) HLine(a, a + (b - a) * fill, cy, t, ProgressStrokeCap.Round, Solid(ProgressColorRole.Color));
                }
            }
            for (var i = 0; i < n; i++)
            {
                var x = xs[i];
                Circle(x, cy, R, Solid(ProgressColorRole.Track));
                if (s.Indeterminate)
                {
                    var k = Bump(i - center, 0.55);
                    if (k > 0.01) Circle(x, cy, R, Solid(ProgressColorRole.Color, k));
                    continue;
                }
                var done = Clamp01((position - i + 0.12) / 0.12);
                if (done > 0)
                {
                    Circle(x, cy, R * (0.4 + 0.6 * done), Solid(ProgressColorRole.Color));
                    if (done > 0.6)
                    {
                        Out.Add(new ProgressCommand.Polyline(
                            new[] { x - R * 0.38, cy + R * 0.02, x - R * 0.1, cy + R * 0.3, x + R * 0.4, cy - R * 0.28 },
                            false,
                            Math.Max(1.5, R * 0.22),
                            ProgressStrokeCap.Round,
                            Solid(ProgressColorRole.White, (done - 0.6) / 0.4)));
                    }
                }
                else if (position > i - 1)
                {
                    Arc(x, cy, R - 1, 0, Tau, 2, ProgressStrokeCap.Butt, Solid(ProgressColorRole.Color));
                }
            }
        }

        // ---------- circular family ----------

        public void CircularAny(double size)
        {
            switch (p.Variant)
            {
                case ProgressVariant.Segmented: SegmentedArc(size / 2, size / 2, (size - p.Thickness) / 2, Top, Tau, true); break;
                case ProgressVariant.Gradient: CircularGradient(size); break;
                case ProgressVariant.Ticks: CircularTicks(size); break;
                case ProgressVariant.Dots: CircularDots(size); break;
                default: Circular(size); break;
            }
            if (p.ShowLabel && !s.Indeterminate) Text(size / 2, size / 2, LabelSize(size), ProgressGeometry.Label(s.Value), false, Solid(ProgressColorRole.Label));
        }

        private void Circular(double size)
        {
            var t = p.Thickness;
            var cap = p.StrokeCap;
            var wavy = p.Variant == ProgressVariant.Wavy && size >= MinWavySize;
            var ampMax = wavy ? p.Amplitude : 0;
            var amp = ampMax * s.Wave;
            var cx = size / 2;
            var cy = size / 2;
            var r = (size - t) / 2 - ampMax;
            if (r <= 0) return;
            var gapAngle = (p.TrackGap + (cap == ProgressStrokeCap.Round ? t : 0)) / r;
            var waves = Math.Max(3, RoundHalfUp(Tau * r / p.Wavelength));
            var phase = Mod(s.Time * p.WaveSpeed, 1) * Tau;
            var color = Solid(ProgressColorRole.Color);
            var track = Solid(ProgressColorRole.Track);
            void Active(double start, double end)
            {
                if (wavy && amp > 0.05) WavyArc(cx, cy, r, amp, waves, phase, start, end, t, cap, color);
                else Arc(cx, cy, r, start, end, t, cap, color);
            }
            if (s.Indeterminate)
            {
                var (a0, a1) = CircularArc(s.IndeterminateTime);
                Arc(cx, cy, r, Top + a1 + gapAngle, Top + a0 + Tau - gapAngle, t, cap, track);
                Active(Top + a0, Top + a1);
                return;
            }
            var v = Clamp01(s.Value);
            if (v <= 0.0005)
            {
                Arc(cx, cy, r, 0, Tau, t, ProgressStrokeCap.Butt, track);
                return;
            }
            var sweep = v * Tau;
            if (p.TrackGap > 0 || v < 1) Arc(cx, cy, r, Top + sweep + gapAngle, Top + Tau - gapAngle, t, cap, track);
            Active(Top, Top + Math.Max(sweep, 0.0001));
        }

        /// <summary>Segments spread over <paramref name="sweep"/> from <paramref name="start"/>; a full circle also gets a gap at the seam.</summary>
        private void SegmentedArc(double cx, double cy, double r, double start, double sweep, bool full)
        {
            if (r <= 0) return;
            var n = p.Segments;
            var t = p.Thickness;
            var cap = p.StrokeCap;
            var gapAngle = (Math.Max(2, p.TrackGap) + (cap == ProgressStrokeCap.Round ? t : 0)) / r;
            var segment = (sweep - gapAngle * (full ? n : n - 1)) / n;
            if (segment <= 0.01) return;
            var it = s.IndeterminateTime;
            var center = full ? Mod(it / 1.2, 1) * n : (0.5 - 0.5 * Math.Cos(it * Math.PI)) * n;
            for (var i = 0; i < n; i++)
            {
                var a0 = start + i * (segment + gapAngle) + (full ? gapAngle / 2 : 0);
                Arc(cx, cy, r, a0, a0 + segment, t, cap, Solid(ProgressColorRole.Track));
                if (s.Indeterminate)
                {
                    var d = i + 0.5 - center;
                    if (full)
                    {
                        var m = Mod(d, n);
                        d = Math.Min(m, n - m);
                    }
                    var k = Bump(d, full ? n * 0.32 : 2);
                    if (k > 0.01) Arc(cx, cy, r, a0, a0 + segment, t, cap, Solid(ProgressColorRole.Color, k));
                }
                else
                {
                    var fill = Clamp01(Clamp01(s.Value) * n - i);
                    if (fill > 0.001) Arc(cx, cy, r, a0, a0 + segment * fill, t, cap, Solid(ProgressColorRole.Color));
                }
            }
        }

        private void CircularGradient(double size)
        {
            var t = p.Thickness;
            var cx = size / 2;
            var cy = size / 2;
            var r = (size - t) / 2 - 1;
            Arc(cx, cy, r, 0, Tau, t, ProgressStrokeCap.Butt, Solid(ProgressColorRole.Track));
            double head;
            double tail;
            if (s.Indeterminate)
            {
                var it = s.IndeterminateTime;
                head = Top + Mod(it / 1.1, 1) * Tau;
                tail = head - (0.62 + 0.12 * Math.Sin(it * 2.4)) * Tau;
            }
            else
            {
                var v = Clamp01(s.Value);
                if (v <= 0.0005) return;
                tail = Top;
                head = Top + v * Tau;
            }
            Arc(cx, cy, r, tail, head, t, ProgressStrokeCap.Butt, new ProgressPaint.Conic(cx, cy, tail, new[]
            {
                new ProgressColorStop(0, ProgressColorRole.Color, s.Indeterminate ? 0 : 0.12),
                new ProgressColorStop(Math.Min(1, (head - tail) / Tau), ProgressColorRole.Color, 1),
            }));
            var hx = cx + r * Math.Cos(head);
            var hy = cy + r * Math.Sin(head);
            Circle(hx, hy, t * 1.25, Fade(hx, hy, t * 1.25, 0.5));
            Circle(hx, hy, t / 2, Solid(ProgressColorRole.Color));
        }

        private void CircularTicks(double size)
        {
            var n = p.Segments;
            var t = p.Thickness;
            var outer = size / 2 - t / 2;
            var inner = outer * 0.52;
            var cx = size / 2;
            var cy = size / 2;
            var lead = Mod(Math.Floor(s.IndeterminateTime * n), n);
            for (var i = 0; i < n; i++)
            {
                var a = Top + i * Tau / n;
                var ca = Math.Cos(a);
                var sa = Math.Sin(a);
                ProgressCommand Tick(ProgressPaint paint) => new ProgressCommand.Line(cx + inner * ca, cy + inner * sa, cx + outer * ca, cy + outer * sa, t, p.StrokeCap, paint);
                if (s.Indeterminate)
                {
                    Out.Add(Tick(Solid(ProgressColorRole.Color, 1 - Mod(lead - i, n) / n * 0.85)));
                    continue;
                }
                Out.Add(Tick(Solid(ProgressColorRole.Track)));
                var fill = Clamp01(Clamp01(s.Value) * n - i);
                if (fill > 0) Out.Add(Tick(Solid(ProgressColorRole.Color, fill)));
            }
        }

        private void CircularDots(double size)
        {
            var n = p.Segments;
            var dr = Math.Max(1.5, p.Thickness * 0.75);
            var r = size / 2 - dr * 1.35;
            var cx = size / 2;
            var cy = size / 2;
            var center = Mod(s.IndeterminateTime / 1.1, 1) * n;
            for (var i = 0; i < n; i++)
            {
                var a = Top + i * Tau / n;
                var x = cx + r * Math.Cos(a);
                var y = cy + r * Math.Sin(a);
                Circle(x, y, dr, Solid(ProgressColorRole.Track));
                if (s.Indeterminate)
                {
                    var alpha = Math.Max(0, 1 - Mod(center - i, n) / (n * 0.6));
                    if (alpha > 0) Circle(x, y, dr * (0.7 + 0.35 * alpha), Solid(ProgressColorRole.Color, alpha));
                    continue;
                }
                var fill = Clamp01(Clamp01(s.Value) * n - i);
                if (fill > 0) Circle(x, y, dr * Math.Sqrt(fill), Solid(ProgressColorRole.Color));
            }
        }

        public void Pie(double size)
        {
            var t = Math.Max(1, p.Thickness * 0.6);
            var cx = size / 2;
            var cy = size / 2;
            var ring = (size - t) / 2;
            var inner = ring - t / 2 - Math.Max(1, p.TrackGap * 0.6);
            Arc(cx, cy, ring, 0, Tau, t, ProgressStrokeCap.Butt, Solid(ProgressColorRole.Color));
            Circle(cx, cy, inner, Solid(ProgressColorRole.Track));
            var start = Top;
            double end;
            if (s.Indeterminate)
            {
                var u = s.IndeterminateTime / 1.2;
                start += Mod(u, 1) * Tau;
                end = start + (0.12 + 0.2 * (0.5 - 0.5 * Math.Cos(u * Tau))) * Tau;
            }
            else
            {
                end = start + Clamp01(s.Value) * Tau;
            }
            if (end - start < 0.0005 || inner <= 0) return;
            Out.Add(new ProgressCommand.Sector(cx, cy, inner, start, end, Solid(ProgressColorRole.Color)));
        }

        public void Gauge(double size)
        {
            var t = p.Thickness;
            var cap = p.StrokeCap;
            var cx = size / 2;
            var cy = size / 2;
            var r = (size - t) / 2;
            var sweep = p.SweepAngle;
            var start = Math.PI / 2 + (Tau - sweep) / 2;
            var end = start + sweep;
            if (r > 0)
            {
                var gapAngle = (p.TrackGap + (cap == ProgressStrokeCap.Round ? t : 0)) / r;
                if (p.Variant == ProgressVariant.Segmented)
                {
                    SegmentedArc(cx, cy, r, start, sweep, false);
                }
                else if (s.Indeterminate)
                {
                    var length = 0.24 * sweep;
                    var a = start + (0.5 - 0.5 * Math.Cos(s.IndeterminateTime * Math.PI)) * (sweep - length);
                    Arc(cx, cy, r, start, a - gapAngle, t, cap, Solid(ProgressColorRole.Track));
                    Arc(cx, cy, r, a + length + gapAngle, end, t, cap, Solid(ProgressColorRole.Track));
                    Arc(cx, cy, r, a, a + length, t, cap, Solid(ProgressColorRole.Color));
                }
                else
                {
                    var v = Clamp01(s.Value);
                    if (v <= 0.0005)
                    {
                        Arc(cx, cy, r, start, end, t, cap, Solid(ProgressColorRole.Track));
                    }
                    else
                    {
                        Arc(cx, cy, r, start + v * sweep + gapAngle, end, t, cap, Solid(ProgressColorRole.Track));
                        Arc(cx, cy, r, start, start + v * sweep, t, cap, Solid(ProgressColorRole.Color));
                    }
                }
            }
            if (p.ShowLabel && !s.Indeterminate) Text(cx, cy, LabelSize(size), ProgressGeometry.Label(s.Value), false, Solid(ProgressColorRole.Label));
        }

        private static List<double> LiquidSurface(double cx, double cy, double inner, double level, double amp, double wavelength, double phase)
        {
            var y = cy + inner - level * 2 * inner;
            var left = cx - inner;
            var right = cx + inner + 2;
            var n = Math.Max(1, Steps((right - left) / 2));
            var points = new List<double>(2 * n + 6) { left, cy + inner + 1 };
            for (var i = 0; i <= n; i++)
            {
                var x = left + (right - left) * i / n;
                points.Add(x);
                points.Add(y + amp * Math.Sin(x / wavelength * Tau + phase));
            }
            points.Add(right);
            points.Add(cy + inner + 1);
            return points;
        }

        public void Liquid(double size)
        {
            var ring = Math.Max(1.5, p.Thickness * 0.6);
            var cx = size / 2;
            var cy = size / 2;
            var R = (size - ring) / 2;
            var inner = R - ring / 2 - Math.Max(1.5, p.TrackGap * 0.6);
            Arc(cx, cy, R, 0, Tau, ring, ProgressStrokeCap.Butt, Solid(ProgressColorRole.Color));
            if (inner <= 0) return;
            var level = s.Indeterminate ? 0.5 + 0.14 * Math.Sin(s.IndeterminateTime * 1.8) : Clamp01(s.Value);
            var amp = inner * (s.Indeterminate ? 0.09 : 0.07 * s.Wave);
            var wavelength = inner * 1.35;
            var cycles = s.Time * p.WaveSpeed * 0.8;
            var front = LiquidSurface(cx, cy, inner, level, amp, wavelength, Mod(cycles, 1) * Tau);
            var back = LiquidSurface(cx, cy, inner, level, amp * 0.8, wavelength, 2 - Mod(cycles * 0.7, 1) * Tau);
            var content = Nested();
            content.Rect(cx - inner, cy - inner, inner * 2, inner * 2, 0, Solid(ProgressColorRole.Track));
            content.Out.Add(new ProgressCommand.Polygon(back, Solid(ProgressColorRole.Color, 0.45)));
            content.Out.Add(new ProgressCommand.Polygon(front, Solid(ProgressColorRole.Color)));
            if (p.ShowLabel && !s.Indeterminate) content.InvertedLabel(ProgressGeometry.Label(s.Value), cx, cy, LabelSize(size), new ProgressClipShape.Polygon(front));
            Out.Add(new ProgressCommand.Clip(new ProgressClipShape.Circle(cx, cy, inner), content.Out));
        }

        // ---------- border ----------

        /// <summary>Rounded rectangle path starting at the top center, clockwise, sampled about every 2 units.</summary>
        private static BorderPath MakeBorderPath(double w, double h, double inset, double radius)
        {
            var L = inset;
            var T = inset;
            var R = w - inset;
            var B = h - inset;
            var r = Math.Max(0, Math.Min(radius, Math.Min((R - L) / 2, (B - T) / 2)));
            var mx = (L + R) / 2;
            var path = new BorderPath();
            var points = path.Points;
            points.Add(mx);
            points.Add(T);
            void Line(double x0, double y0, double x1, double y1)
            {
                var n = Math.Max(1, Steps(Hypot(x1 - x0, y1 - y0) / 2));
                for (var i = 1; i <= n; i++)
                {
                    points.Add(x0 + (x1 - x0) * i / n);
                    points.Add(y0 + (y1 - y0) * i / n);
                }
            }
            void Corner(double cx, double cy, double a0)
            {
                if (r <= 0) return;
                var n = Math.Max(2, Steps(r * Math.PI / 4));
                for (var i = 1; i <= n; i++)
                {
                    var a = a0 + Math.PI / 2 * ((double)i / n);
                    points.Add(cx + r * Math.Cos(a));
                    points.Add(cy + r * Math.Sin(a));
                }
            }
            Line(mx, T, R - r, T);
            Corner(R - r, T + r, -Math.PI / 2);
            Line(R, T + r, R, B - r);
            Corner(R - r, B - r, 0);
            Line(R - r, B, L + r, B);
            Corner(L + r, B - r, Math.PI / 2);
            Line(L, B - r, L, T + r);
            Corner(L + r, T + r, Math.PI);
            Line(L + r, T, mx, T);
            path.Lengths.Add(0);
            for (var i = 2; i < points.Count; i += 2)
            {
                path.Lengths.Add(path.Lengths[path.Lengths.Count - 1] + Hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]));
            }
            path.Total = path.Lengths[path.Lengths.Count - 1];
            return path;
        }

        /// <summary>Strokes the part of <paramref name="path"/> from fraction <paramref name="a"/> to <paramref name="b"/>; b above 1 wraps past the start.</summary>
        private void StrokeAlong(BorderPath path, double a, double b, double lineWidth, ProgressStrokeCap cap, ProgressPaint paint)
        {
            if (b > 1)
            {
                StrokeAlong(path, a, 1, lineWidth, cap, paint);
                StrokeAlong(path, 0, b - 1, lineWidth, cap, paint);
                return;
            }
            var points = path.Points;
            var lengths = path.Lengths;
            var from = a * path.Total;
            var to = b * path.Total;
            if (to - from < 0.3) return;
            (double X, double Y, int Index) At(double d)
            {
                var i = 1;
                while (i < lengths.Count - 1 && lengths[i] < d) i++;
                var f = (d - lengths[i - 1]) / Math.Max(1e-6, lengths[i] - lengths[i - 1]);
                var x0 = points[2 * i - 2];
                var y0 = points[2 * i - 1];
                return (x0 + (points[2 * i] - x0) * f, y0 + (points[2 * i + 1] - y0) * f, i);
            }
            var (sx, sy, si) = At(from);
            var (ex, ey, ei) = At(to);
            var result = new List<double> { sx, sy };
            for (var i = si; i < ei; i++)
            {
                result.Add(points[2 * i]);
                result.Add(points[2 * i + 1]);
            }
            result.Add(ex);
            result.Add(ey);
            Out.Add(new ProgressCommand.Polyline(result, false, lineWidth, cap, paint));
        }

        public void Border(double w, double h)
        {
            var t = p.Thickness;
            if (w <= t || h <= t) return;
            var path = MakeBorderPath(w, h, t / 2, p.CornerRadius - t / 2);
            Out.Add(new ProgressCommand.Polyline(path.Points.GetRange(0, path.Points.Count - 2), true, t, ProgressStrokeCap.Butt, Solid(ProgressColorRole.Track)));
            if (s.Indeterminate)
            {
                var (a0, a1) = CircularArc(s.IndeterminateTime);
                var from = Mod(a0 / Tau, 1);
                StrokeAlong(path, from, from + (a1 - a0) / Tau, t, p.StrokeCap, Solid(ProgressColorRole.Color));
            }
            else
            {
                var v = Clamp01(s.Value);
                if (v > 0.0005) StrokeAlong(path, 0, v, t, p.StrokeCap, Solid(ProgressColorRole.Color));
            }
        }

        // ---------- bars, grid, battery ----------

        public void Bars(double w, double h)
        {
            var n = p.Segments;
            var gap = Math.Max(3, p.TrackGap);
            var width = (w - gap * (n - 1)) / n;
            if (width <= 0) return;
            var radius = p.StrokeCap == ProgressStrokeCap.Round ? Math.Min(width * 0.3, 4) : 0;
            var center = Mod(s.IndeterminateTime / 1.4, 1) * (n + 3) - 1.5;
            for (var i = 0; i < n; i++)
            {
                var height = h * (0.25 + 0.75 * (i + 1) / n);
                var x = i * (width + gap);
                var y = h - height;
                Rect(x, y, width, height, radius, Solid(ProgressColorRole.Track));
                var fill = s.Indeterminate ? Bump(i + 0.5 - center, 1.6) : Clamp01(Clamp01(s.Value) * n - i);
                if (fill <= 0.001) continue;
                var inner = Nested();
                inner.Rect(x, h - height * fill, width, height * fill, 0, Solid(ProgressColorRole.Color));
                Out.Add(new ProgressCommand.Clip(RectClip(x, y, width, height, radius), inner.Out));
            }
        }

        public void Grid(double size)
        {
            var k = p.Segments;
            var gap = Math.Max(2, p.TrackGap * 0.75);
            var cell = (size - gap * (k - 1)) / k;
            if (cell <= 0) return;
            var radius = p.StrokeCap == ProgressStrokeCap.Round ? cell * 0.28 : cell * 0.08;
            var rank = GridOrder(k);
            var center = Mod(s.IndeterminateTime / 1.6, 1) * (2 * k + 1) - 1.5;
            for (var r = 0; r < k; r++)
            {
                for (var c = 0; c < k; c++)
                {
                    var x = c * (cell + gap);
                    var y = r * (cell + gap);
                    Rect(x, y, cell, cell, radius, Solid(ProgressColorRole.Track));
                    var fill = s.Indeterminate ? Bump(r + c - center, 1.8) : Clamp01(Clamp01(s.Value) * k * k - rank[r * k + c]);
                    if (fill <= 0.01) continue;
                    var side = cell * (0.3 + 0.7 * fill);
                    Rect(x + (cell - side) / 2, y + (cell - side) / 2, side, side, radius * side / cell, Solid(ProgressColorRole.Color, Math.Min(1, fill * 1.6)));
                }
            }
        }

        public void Battery(double w, double h)
        {
            var border = Math.Max(1.5, p.Thickness * 0.5);
            var capWidth = Math.Max(3, w * 0.07);
            var bodyWidth = w - capWidth - border * 0.5;
            var radius = h * 0.24;
            if (bodyWidth - border > 0 && h - border > 0)
            {
                Out.Add(new ProgressCommand.StrokeRect(
                    border / 2,
                    border / 2,
                    bodyWidth - border,
                    h - border,
                    Math.Max(0, Math.Min(radius, Math.Min((bodyWidth - border) / 2, (h - border) / 2))),
                    border,
                    Solid(ProgressColorRole.Color, 0.7)));
            }
            Rect(bodyWidth + border * 0.2, h * 0.34, w - bodyWidth - border * 0.2, h * 0.32, capWidth * 0.5, Solid(ProgressColorRole.Color, 0.7));
            var pad = border + Math.Max(1.5, p.TrackGap * 0.5);
            var iw = bodyWidth - 2 * pad;
            var ih = h - 2 * pad;
            if (iw <= 0 || ih <= 0) return;
            double filled;
            var alpha = 1.0;
            if (s.Indeterminate)
            {
                var u = Mod(s.IndeterminateTime / 1.8, 1);
                filled = iw * EaseInOut.Evaluate(Clamp01(u / 0.8));
                if (u > 0.8) alpha = 1 - (u - 0.8) / 0.2;
            }
            else
            {
                filled = iw * Clamp01(s.Value);
            }
            var content = Nested();
            content.Rect(pad, pad, iw, ih, 0, Solid(ProgressColorRole.Track));
            content.Rect(pad, pad, filled, ih, 0, Solid(ProgressColorRole.Color, alpha));
            if (p.ShowLabel && !s.Indeterminate)
            {
                content.InvertedLabel(ProgressGeometry.Label(s.Value), pad + iw / 2, pad + ih / 2, Math.Max(10, Math.Min(ih * 0.55, 30)), RectClip(pad, pad, filled, ih, 0));
            }
            Out.Add(new ProgressCommand.Clip(RectClip(pad, pad, iw, ih, Math.Max(1, radius - pad * 0.7)), content.Out));
            if (s.Indeterminate)
            {
                var bx = pad + iw / 2;
                var by = pad + ih / 2;
                var k = ih * 0.42;
                var points = new double[Bolt.Length];
                for (var i = 0; i < Bolt.Length; i += 2)
                {
                    points[i] = bx + Bolt[i] * k * 0.9;
                    points[i + 1] = by + Bolt[i + 1] * k;
                }
                Out.Add(new ProgressCommand.Polygon(points, Solid(ProgressColorRole.White)));
                Out.Add(new ProgressCommand.Polyline(points, true, 1.2, ProgressStrokeCap.Butt, Solid(ProgressColorRole.Color)));
            }
        }
    }
}
