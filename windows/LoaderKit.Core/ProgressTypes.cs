using System.Collections.Generic;

namespace LoaderKit;

/// <summary>The shape of a <c>LoaderKitProgress</c>.</summary>
public enum ProgressType
{
    /// <summary>A horizontal bar.</summary>
    Linear,
    /// <summary>A ring.</summary>
    Circular,
    /// <summary>A filling disc inside a ring.</summary>
    Pie,
    /// <summary>An open arc.</summary>
    Gauge,
    /// <summary>A circle filling with liquid.</summary>
    Liquid,
    /// <summary>A stroke around the content.</summary>
    Border,
    /// <summary>Rising bars.</summary>
    Bars,
    /// <summary>A square grid of cells.</summary>
    Grid,
    /// <summary>A battery.</summary>
    Battery,
    /// <summary>An hourglass.</summary>
    Hourglass,
}

/// <summary>The style of a <c>LoaderKitProgress</c> within its type.</summary>
public enum ProgressVariant
{
    /// <summary>Plain strokes.</summary>
    Flat,
    /// <summary>A traveling wave (linear and circular).</summary>
    Wavy,
    /// <summary>Separate segments (linear, circular, pie, gauge, border and battery).</summary>
    Segmented,
    /// <summary>Moving diagonal stripes (linear).</summary>
    Striped,
    /// <summary>A passing sheen (linear).</summary>
    Shimmer,
    /// <summary>A glowing head (linear, circular and border).</summary>
    Glow,
    /// <summary>Dots instead of strokes or cells (linear, circular, gauge, bars and grid).</summary>
    Dots,
    /// <summary>Numbered steps (linear).</summary>
    Steps,
    /// <summary>A gradient tail (linear, circular and gauge).</summary>
    Gradient,
    /// <summary>Ticks (linear and circular).</summary>
    Ticks,
    /// <summary>Grows from the middle (linear).</summary>
    Center,
    /// <summary>A row of chevrons (linear).</summary>
    Chevrons,
    /// <summary>Two arcs growing both ways from the top (circular).</summary>
    Split,
    /// <summary>A dot orbiting the ring (circular).</summary>
    Orbit,
    /// <summary>Two rings turning opposite ways (circular).</summary>
    Dual,
    /// <summary>A needle and ticks (gauge).</summary>
    Needle,
    /// <summary>Signal arcs (bars).</summary>
    Arcs,
    /// <summary>A heart filling with liquid (liquid).</summary>
    Heart,
}

/// <summary>The ends of strokes.</summary>
public enum ProgressStrokeCap
{
    /// <summary>Rounded ends.</summary>
    Round,
    /// <summary>Square ends at the exact length.</summary>
    Butt,
}

/// <summary>Drawing options. Null options take the defaults of <see cref="ResolvedProgress"/>.</summary>
public sealed record ProgressOptions
{
    /// <summary>The shape. Default <see cref="ProgressType.Circular"/>.</summary>
    public ProgressType? Type { get; init; }

    /// <summary>The style; a variant the type does not have becomes its default.</summary>
    public ProgressVariant? Variant { get; init; }

    /// <summary>Width of strokes and bars. Default depends on the type and variant.</summary>
    public double? Thickness { get; init; }

    /// <summary>Space between the progress and the track, or between segments. Default 4.</summary>
    public double? TrackGap { get; init; }

    /// <summary>Number of segments, dots, ticks, steps, bars or grid columns. Default depends on the variant.</summary>
    public double? Segments { get; init; }

    /// <summary>Show the percentage. Default false.</summary>
    public bool? ShowLabel { get; init; }

    /// <summary>Dot at the end of the track of linear flat and wavy. Default true.</summary>
    public bool? StopIndicator { get; init; }

    /// <summary>Default <see cref="ProgressStrokeCap.Round"/>.</summary>
    public ProgressStrokeCap? StrokeCap { get; init; }

    /// <summary>Wave amplitude of wavy. Default 3 for linear, 2 for circular.</summary>
    public double? Amplitude { get; init; }

    /// <summary>Wave length of wavy. Default 40 for linear, 15 for circular.</summary>
    public double? Wavelength { get; init; }

    /// <summary>Wave travel in wavelengths per second. Default 1.</summary>
    public double? WaveSpeed { get; init; }

    /// <summary>Arc of gauge, in degrees. Default 270.</summary>
    public double? SweepAngle { get; init; }

    /// <summary>Corner radius of border. Default 12.</summary>
    public double? CornerRadius { get; init; }

    /// <summary>Playback rate of the indeterminate animation. Default 1.</summary>
    public double? Speed { get; init; }
}

/// <summary>What <see cref="ProgressGeometry.Commands"/> draws at one instant; <see cref="ProgressAnimator.State"/> produces it.</summary>
/// <param name="Indeterminate">True while the value is unknown.</param>
/// <param name="Value">Displayed value in [0, 1]; follows the real value when smoothing is on.</param>
/// <param name="Buffer">Displayed buffer in [0, 1]; 0 draws no buffer.</param>
/// <param name="Wave">Wave amplitude factor: 0 flat, 1 full.</param>
/// <param name="Time">Seconds of ambient motion: wave travel, sheens and stripes.</param>
/// <param name="IndeterminateTime">Seconds of the indeterminate animation, already scaled by the speed.</param>
public readonly record struct ProgressState(bool Indeterminate, double Value, double Buffer, double Wave, double Time, double IndeterminateTime);

/// <summary>Colors a command refers to. Renderers resolve them from the control's colors.</summary>
public enum ProgressColorRole
{
    /// <summary>The progress color.</summary>
    Color,
    /// <summary>The track color, or the progress color at 24% opacity.</summary>
    Track,
    /// <summary>Label text: the platform text color.</summary>
    Label,
    /// <summary>White.</summary>
    White,
}

/// <summary>A gradient color stop.</summary>
/// <param name="Offset">Position along the gradient, in [0, 1].</param>
/// <param name="Color">The color role.</param>
/// <param name="Alpha">Opacity multiplier.</param>
public readonly record struct ProgressColorStop(double Offset, ProgressColorRole Color, double Alpha);

/// <summary>How a command is filled or stroked.</summary>
public abstract record ProgressPaint
{
    private ProgressPaint()
    {
    }

    /// <summary>One color.</summary>
    /// <param name="Color">The color role.</param>
    /// <param name="Alpha">Opacity multiplier.</param>
    public sealed record Solid(ProgressColorRole Color, double Alpha) : ProgressPaint;

    /// <summary>A gradient along the line from (X0, Y0) to (X1, Y1).</summary>
    /// <param name="X0">Start x.</param>
    /// <param name="Y0">Start y.</param>
    /// <param name="X1">End x.</param>
    /// <param name="Y1">End y.</param>
    /// <param name="Stops">Color stops.</param>
    public sealed record Linear(double X0, double Y0, double X1, double Y1, IReadOnlyList<ProgressColorStop> Stops) : ProgressPaint;

    /// <summary>A gradient from the center (Cx, Cy) to radius R.</summary>
    /// <param name="Cx">Center x.</param>
    /// <param name="Cy">Center y.</param>
    /// <param name="R">Radius.</param>
    /// <param name="Stops">Color stops.</param>
    public sealed record Radial(double Cx, double Cy, double R, IReadOnlyList<ProgressColorStop> Stops) : ProgressPaint;

    /// <summary>A gradient around (Cx, Cy); offsets are fractions of a turn clockwise from Start.</summary>
    /// <param name="Cx">Center x.</param>
    /// <param name="Cy">Center y.</param>
    /// <param name="Start">Angle of offset 0, in radians.</param>
    /// <param name="Stops">Color stops.</param>
    public sealed record Conic(double Cx, double Cy, double Start, IReadOnlyList<ProgressColorStop> Stops) : ProgressPaint;
}

/// <summary>The shape of a clip command.</summary>
public abstract record ProgressClipShape
{
    private ProgressClipShape()
    {
    }

    /// <summary>A rectangle with rounded corners.</summary>
    /// <param name="X">Left.</param>
    /// <param name="Y">Top.</param>
    /// <param name="Width">Width.</param>
    /// <param name="Height">Height.</param>
    /// <param name="Radius">Corner radius, at most half the width and height.</param>
    public sealed record Rect(double X, double Y, double Width, double Height, double Radius) : ProgressClipShape;

    /// <summary>A circle.</summary>
    /// <param name="Cx">Center x.</param>
    /// <param name="Cy">Center y.</param>
    /// <param name="R">Radius.</param>
    public sealed record Circle(double Cx, double Cy, double R) : ProgressClipShape;

    /// <summary>A polygon.</summary>
    /// <param name="Points">Flat list of x, y pairs.</param>
    public sealed record Polygon(IReadOnlyList<double> Points) : ProgressClipShape;
}

/// <summary>One draw command. Coordinates are in device-independent pixels with y pointing down; angles are radians, clockwise.</summary>
public abstract record ProgressCommand
{
    private ProgressCommand()
    {
    }

    /// <summary>A stroked line.</summary>
    /// <param name="X0">Start x.</param>
    /// <param name="Y0">Start y.</param>
    /// <param name="X1">End x.</param>
    /// <param name="Y1">End y.</param>
    /// <param name="LineWidth">Stroke width.</param>
    /// <param name="Cap">Stroke ends.</param>
    /// <param name="Paint">Stroke paint.</param>
    public sealed record Line(double X0, double Y0, double X1, double Y1, double LineWidth, ProgressStrokeCap Cap, ProgressPaint Paint) : ProgressCommand;

    /// <summary>A stroked clockwise arc from Start to End.</summary>
    /// <param name="Cx">Center x.</param>
    /// <param name="Cy">Center y.</param>
    /// <param name="R">Radius.</param>
    /// <param name="Start">Start angle.</param>
    /// <param name="End">End angle, greater than Start.</param>
    /// <param name="LineWidth">Stroke width.</param>
    /// <param name="Cap">Stroke ends.</param>
    /// <param name="Paint">Stroke paint.</param>
    public sealed record Arc(double Cx, double Cy, double R, double Start, double End, double LineWidth, ProgressStrokeCap Cap, ProgressPaint Paint) : ProgressCommand;

    /// <summary>A stroked path through points, with round joins.</summary>
    /// <param name="Points">Flat list of x, y pairs.</param>
    /// <param name="Closed">True to join the last point to the first.</param>
    /// <param name="LineWidth">Stroke width.</param>
    /// <param name="Cap">Stroke ends.</param>
    /// <param name="Paint">Stroke paint.</param>
    public sealed record Polyline(IReadOnlyList<double> Points, bool Closed, double LineWidth, ProgressStrokeCap Cap, ProgressPaint Paint) : ProgressCommand;

    /// <summary>A filled circle.</summary>
    /// <param name="Cx">Center x.</param>
    /// <param name="Cy">Center y.</param>
    /// <param name="R">Radius.</param>
    /// <param name="Paint">Fill paint.</param>
    public sealed record Circle(double Cx, double Cy, double R, ProgressPaint Paint) : ProgressCommand;

    /// <summary>A filled rectangle with rounded corners.</summary>
    /// <param name="X">Left.</param>
    /// <param name="Y">Top.</param>
    /// <param name="Width">Width.</param>
    /// <param name="Height">Height.</param>
    /// <param name="Radius">Corner radius, at most half the width and height.</param>
    /// <param name="Paint">Fill paint.</param>
    public sealed record Rect(double X, double Y, double Width, double Height, double Radius, ProgressPaint Paint) : ProgressCommand;

    /// <summary>A stroked rectangle with rounded corners.</summary>
    /// <param name="X">Left.</param>
    /// <param name="Y">Top.</param>
    /// <param name="Width">Width.</param>
    /// <param name="Height">Height.</param>
    /// <param name="Radius">Corner radius, at most half the width and height.</param>
    /// <param name="LineWidth">Stroke width.</param>
    /// <param name="Paint">Stroke paint.</param>
    public sealed record StrokeRect(double X, double Y, double Width, double Height, double Radius, double LineWidth, ProgressPaint Paint) : ProgressCommand;

    /// <summary>A filled polygon.</summary>
    /// <param name="Points">Flat list of x, y pairs.</param>
    /// <param name="Paint">Fill paint.</param>
    public sealed record Polygon(IReadOnlyList<double> Points, ProgressPaint Paint) : ProgressCommand;

    /// <summary>A filled pie slice, clockwise from Start to End.</summary>
    /// <param name="Cx">Center x.</param>
    /// <param name="Cy">Center y.</param>
    /// <param name="R">Radius.</param>
    /// <param name="Start">Start angle.</param>
    /// <param name="End">End angle, greater than Start.</param>
    /// <param name="Paint">Fill paint.</param>
    public sealed record Sector(double Cx, double Cy, double R, double Start, double End, ProgressPaint Paint) : ProgressCommand;

    /// <summary>Semibold system text, vertically centered on Y.</summary>
    /// <param name="X">Center x, or the right edge when AlignRight is true.</param>
    /// <param name="Y">Vertical center.</param>
    /// <param name="Size">Font size.</param>
    /// <param name="Value">The text.</param>
    /// <param name="AlignRight">True to end the text at X.</param>
    /// <param name="Paint">Text paint.</param>
    public sealed record Text(double X, double Y, double Size, string Value, bool AlignRight, ProgressPaint Paint) : ProgressCommand;

    /// <summary>Draws Commands clipped to Shape.</summary>
    /// <param name="Shape">The clip shape.</param>
    /// <param name="Commands">The clipped commands.</param>
    public sealed record Clip(ProgressClipShape Shape, IReadOnlyList<ProgressCommand> Commands) : ProgressCommand;
}

/// <summary>What to draw, in a box whose top-left corner is at (X, Y) in the control's bounds.</summary>
/// <param name="X">Left of the box.</param>
/// <param name="Y">Top of the box.</param>
/// <param name="Commands">The commands, relative to the box.</param>
public sealed record ProgressDrawing(double X, double Y, IReadOnlyList<ProgressCommand> Commands);
