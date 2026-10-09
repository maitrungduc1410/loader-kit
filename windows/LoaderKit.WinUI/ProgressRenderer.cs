using System;
using System.Collections.Generic;
using System.Numerics;
using Microsoft.Graphics.Canvas;
using Microsoft.Graphics.Canvas.Brushes;
using Microsoft.Graphics.Canvas.Geometry;
using Microsoft.Graphics.Canvas.Text;
using Microsoft.UI.Text;
using Windows.UI;

namespace LoaderKit.WinUI;

/// <summary>Draws a <see cref="ProgressDrawing"/> with Win2D, in device independent pixels.</summary>
internal sealed class ProgressRenderer
{
    /// <summary>Opacity of the track when no track color is set.</summary>
    public const double DefaultTrackAlpha = 0.24;

    /// <summary>Wedges per turn that stand in for a conic gradient, which Direct2D does not have.</summary>
    private const int ConicSteps = 180;

    private readonly CanvasDrawingSession _session;
    private readonly Color _color;
    private readonly Color? _trackColor;
    private readonly Color _labelColor;

    public ProgressRenderer(CanvasDrawingSession session, Color color, Color? trackColor, Color labelColor)
    {
        _session = session;
        _color = color;
        _trackColor = trackColor;
        _labelColor = labelColor;
    }

    public void Draw(ProgressDrawing drawing)
    {
        var transform = _session.Transform;
        _session.Transform = Matrix3x2.CreateTranslation((float)drawing.X, (float)drawing.Y) * transform;
        Draw(drawing.Commands);
        _session.Transform = transform;
    }

    private Color Role(ProgressColorRole role, double alpha)
    {
        var factor = alpha;
        Color color;
        switch (role)
        {
            case ProgressColorRole.Color:
                color = _color;
                break;
            case ProgressColorRole.Track:
                color = _trackColor ?? _color;
                if (_trackColor is null) factor *= DefaultTrackAlpha;
                break;
            case ProgressColorRole.Label:
                color = _labelColor;
                break;
            default:
                color = Color.FromArgb(255, 255, 255, 255);
                break;
        }
        if (factor >= 1) return color;
        var a = (int)Math.Round(color.A * Math.Max(0, factor));
        return Color.FromArgb((byte)Math.Min(255, a), color.R, color.G, color.B);
    }

    private CanvasGradientStop[] Stops(IReadOnlyList<ProgressColorStop> stops)
    {
        var result = new CanvasGradientStop[stops.Count];
        var last = 0f;
        for (var i = 0; i < stops.Count; i++)
        {
            last = Math.Max(last, (float)Math.Min(1, Math.Max(0, stops[i].Offset)));
            result[i] = new CanvasGradientStop { Position = last, Color = Role(stops[i].Color, stops[i].Alpha) };
        }
        return result;
    }

    private ICanvasBrush? Brush(ProgressPaint paint) => paint switch
    {
        ProgressPaint.Linear linear => new CanvasLinearGradientBrush(_session, Stops(linear.Stops))
        {
            StartPoint = new Vector2((float)linear.X0, (float)linear.Y0),
            EndPoint = new Vector2((float)linear.X1, (float)linear.Y1),
        },
        ProgressPaint.Radial radial => new CanvasRadialGradientBrush(_session, Stops(radial.Stops))
        {
            Center = new Vector2((float)radial.Cx, (float)radial.Cy),
            RadiusX = (float)Math.Max(1e-3, radial.R),
            RadiusY = (float)Math.Max(1e-3, radial.R),
        },
        _ => null,
    };

    private void Fill(CanvasGeometry geometry, ProgressPaint paint)
    {
        switch (paint)
        {
            case ProgressPaint.Solid solid:
                _session.FillGeometry(geometry, Role(solid.Color, solid.Alpha));
                break;
            case ProgressPaint.Conic conic:
                using (_session.CreateLayer(1f, geometry)) FillConic(conic, geometry.ComputeBounds());
                break;
            default:
                using (var brush = Brush(paint)!) _session.FillGeometry(geometry, brush);
                break;
        }
    }

    private void Stroke(CanvasGeometry geometry, double lineWidth, ProgressStrokeCap cap, ProgressPaint paint)
    {
        var capStyle = cap == ProgressStrokeCap.Round ? CanvasCapStyle.Round : CanvasCapStyle.Flat;
        using var style = new CanvasStrokeStyle { StartCap = capStyle, EndCap = capStyle, LineJoin = CanvasLineJoin.Round };
        switch (paint)
        {
            case ProgressPaint.Solid solid:
                _session.DrawGeometry(geometry, Role(solid.Color, solid.Alpha), (float)lineWidth, style);
                break;
            case ProgressPaint.Conic:
                using (var outline = geometry.Stroke((float)lineWidth, style)) Fill(outline, paint);
                break;
            default:
                using (var brush = Brush(paint)!) _session.DrawGeometry(geometry, brush, (float)lineWidth, style);
                break;
        }
    }

    /// <summary>Wedges from the center past the corners of <paramref name="bounds"/>, each in the color of its middle.</summary>
    private void FillConic(ProgressPaint.Conic conic, Windows.Foundation.Rect bounds)
    {
        var center = new Vector2((float)conic.Cx, (float)conic.Cy);
        var reach = 0.0;
        foreach (var (x, y) in new[] { (bounds.Left, bounds.Top), (bounds.Right, bounds.Top), (bounds.Left, bounds.Bottom), (bounds.Right, bounds.Bottom) })
        {
            reach = Math.Max(reach, Math.Sqrt((x - conic.Cx) * (x - conic.Cx) + (y - conic.Cy) * (y - conic.Cy)));
        }
        var r = (float)(reach + 1);
        var step = (float)(2 * Math.PI / ConicSteps);
        using var builder = new CanvasPathBuilder(_session);
        builder.BeginFigure(center);
        builder.AddLine(center + new Vector2(r, 0));
        builder.AddLine(center + r * new Vector2(MathF.Cos(step), MathF.Sin(step)));
        builder.EndFigure(CanvasFigureLoop.Closed);
        using var wedge = CanvasGeometry.CreatePath(builder);
        var transform = _session.Transform;
        var antialiasing = _session.Antialiasing;
        // Aliased wedges meet without seams or double-blended edges; the clip layer keeps the outline smooth.
        _session.Antialiasing = CanvasAntialiasing.Aliased;
        for (var i = 0; i < ConicSteps; i++)
        {
            _session.Transform = Matrix3x2.CreateRotation((float)conic.Start + i * step, center) * transform;
            _session.FillGeometry(wedge, ConicColor(conic.Stops, (i + 0.5) / ConicSteps));
        }
        _session.Transform = transform;
        _session.Antialiasing = antialiasing;
    }

    private Color ConicColor(IReadOnlyList<ProgressColorStop> stops, double t)
    {
        if (stops.Count == 0) return Color.FromArgb(0, 0, 0, 0);
        if (t <= stops[0].Offset) return Role(stops[0].Color, stops[0].Alpha);
        for (var i = 1; i < stops.Count; i++)
        {
            if (t > stops[i].Offset) continue;
            var a = Role(stops[i - 1].Color, stops[i - 1].Alpha);
            var b = Role(stops[i].Color, stops[i].Alpha);
            var span = stops[i].Offset - stops[i - 1].Offset;
            var u = span > 0 ? (t - stops[i - 1].Offset) / span : 1;
            byte Mix(byte from, byte to) => (byte)Math.Round(from + (to - from) * u);
            return Color.FromArgb(Mix(a.A, b.A), Mix(a.R, b.R), Mix(a.G, b.G), Mix(a.B, b.B));
        }
        var last = stops[stops.Count - 1];
        return Role(last.Color, last.Alpha);
    }

    private CanvasGeometry Polyline(IReadOnlyList<double> points, bool closed)
    {
        using var builder = new CanvasPathBuilder(_session);
        for (var i = 0; i + 1 < points.Count; i += 2)
        {
            var point = new Vector2((float)points[i], (float)points[i + 1]);
            if (i == 0) builder.BeginFigure(point);
            else builder.AddLine(point);
        }
        if (points.Count >= 2) builder.EndFigure(closed ? CanvasFigureLoop.Closed : CanvasFigureLoop.Open);
        return CanvasGeometry.CreatePath(builder);
    }

    private CanvasGeometry Arc(double cx, double cy, double r, double start, double end, bool sector)
    {
        using var builder = new CanvasPathBuilder(_session);
        var center = new Vector2((float)cx, (float)cy);
        var from = center + (float)r * new Vector2((float)Math.Cos(start), (float)Math.Sin(start));
        if (sector)
        {
            builder.BeginFigure(center);
            builder.AddLine(from);
        }
        else
        {
            builder.BeginFigure(from);
        }
        builder.AddArc(center, (float)r, (float)r, (float)start, (float)(end - start));
        builder.EndFigure(sector ? CanvasFigureLoop.Closed : CanvasFigureLoop.Open);
        return CanvasGeometry.CreatePath(builder);
    }

    private CanvasGeometry RoundedRect(double x, double y, double width, double height, double radius)
    {
        var r = (float)Math.Max(0, Math.Min(radius, Math.Min(width, height) / 2));
        return CanvasGeometry.CreateRoundedRectangle(_session, (float)x, (float)y, (float)Math.Max(0, width), (float)Math.Max(0, height), r, r);
    }

    private CanvasGeometry ClipGeometry(ProgressClipShape shape) => shape switch
    {
        ProgressClipShape.Rect rect => RoundedRect(rect.X, rect.Y, rect.Width, rect.Height, rect.Radius),
        ProgressClipShape.Circle circle => CanvasGeometry.CreateCircle(_session, (float)circle.Cx, (float)circle.Cy, (float)circle.R),
        ProgressClipShape.Polygon polygon => Polyline(polygon.Points, true),
        _ => throw new ArgumentOutOfRangeException(nameof(shape)),
    };

    private void Draw(IReadOnlyList<ProgressCommand> commands)
    {
        foreach (var command in commands)
        {
            switch (command)
            {
                case ProgressCommand.Line line:
                    using (var geometry = Polyline(new[] { line.X0, line.Y0, line.X1, line.Y1 }, false))
                        Stroke(geometry, line.LineWidth, line.Cap, line.Paint);
                    break;
                case ProgressCommand.Arc arc:
                    using (var geometry = Arc(arc.Cx, arc.Cy, arc.R, arc.Start, arc.End, false))
                        Stroke(geometry, arc.LineWidth, arc.Cap, arc.Paint);
                    break;
                case ProgressCommand.Polyline polyline:
                    using (var geometry = Polyline(polyline.Points, polyline.Closed))
                        Stroke(geometry, polyline.LineWidth, polyline.Cap, polyline.Paint);
                    break;
                case ProgressCommand.Circle circle:
                    using (var geometry = CanvasGeometry.CreateCircle(_session, (float)circle.Cx, (float)circle.Cy, (float)circle.R))
                        Fill(geometry, circle.Paint);
                    break;
                case ProgressCommand.Rect rect:
                    using (var geometry = RoundedRect(rect.X, rect.Y, rect.Width, rect.Height, rect.Radius))
                        Fill(geometry, rect.Paint);
                    break;
                case ProgressCommand.StrokeRect rect:
                    using (var geometry = RoundedRect(rect.X, rect.Y, rect.Width, rect.Height, rect.Radius))
                        Stroke(geometry, rect.LineWidth, ProgressStrokeCap.Butt, rect.Paint);
                    break;
                case ProgressCommand.Polygon polygon:
                    using (var geometry = Polyline(polygon.Points, true))
                        Fill(geometry, polygon.Paint);
                    break;
                case ProgressCommand.Sector sector:
                    using (var geometry = sector.End - sector.Start >= 2 * Math.PI
                        ? CanvasGeometry.CreateCircle(_session, (float)sector.Cx, (float)sector.Cy, (float)sector.R)
                        : Arc(sector.Cx, sector.Cy, sector.R, sector.Start, sector.End, true))
                        Fill(geometry, sector.Paint);
                    break;
                case ProgressCommand.Text text:
                    DrawText(text);
                    break;
                case ProgressCommand.Clip clip:
                    using (var geometry = ClipGeometry(clip.Shape))
                    using (_session.CreateLayer(1f, geometry))
                        Draw(clip.Commands);
                    break;
            }
        }
    }

    private void DrawText(ProgressCommand.Text text)
    {
        using var format = new CanvasTextFormat
        {
            FontSize = (float)text.Size,
            FontWeight = FontWeights.SemiBold,
            HorizontalAlignment = text.AlignRight ? CanvasHorizontalAlignment.Right : CanvasHorizontalAlignment.Center,
            VerticalAlignment = CanvasVerticalAlignment.Center,
            WordWrapping = CanvasWordWrapping.NoWrap,
        };
        var color = text.Paint is ProgressPaint.Solid solid ? Role(solid.Color, solid.Alpha) : _labelColor;
        _session.DrawText(text.Value, (float)text.X, (float)text.Y, color, format);
    }
}
