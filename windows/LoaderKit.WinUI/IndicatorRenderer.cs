using System;
using System.Collections.Generic;
using System.Numerics;
using Microsoft.UI.Composition;
using Windows.UI;

namespace LoaderKit.WinUI;

/// <summary>
/// Draws a <see cref="PreparedIndicator"/> with one <see cref="ShapeVisual"/> per element. Each frame sets the
/// SPEC §6 matrix, group transform included, the opacity of every element and the trims of ring arcs.
/// </summary>
internal sealed class IndicatorRenderer : IDisposable
{
    /// <summary>Room around each shape so anti-aliased and stroked edges are not cut by the visual bounds.</summary>
    private const float Padding = 2;

    private const double FullTurn = 2 * Math.PI;

    /// <summary>
    /// Angle where the path of a <see cref="CompositionEllipseGeometry"/> starts: the top (12 o'clock), running
    /// clockwise on screen, the same convention as Lottie ellipses. Trims are measured along the path from there.
    /// </summary>
    private const double EllipsePathStart = -Math.PI / 2;

    private readonly Compositor _compositor;
    private readonly List<ElementVisual> _elements = new();
    private PreparedIndicator? _indicator;
    private ElementState[] _states = Array.Empty<ElementState>();
    private float _boxSize;
    private Vector2 _boxOrigin;

    public IndicatorRenderer(Compositor compositor)
    {
        _compositor = compositor;
        Root = compositor.CreateContainerVisual();
    }

    public ContainerVisual Root { get; }

    public void Build(PreparedIndicator? indicator, Vector2 viewSize, Color color, IReadOnlyList<Color>? colors)
    {
        Clear();
        Root.Size = viewSize;
        var side = Math.Min(viewSize.X, viewSize.Y);
        if (indicator is null || !(side > 0)) return;

        _indicator = indicator;
        _boxSize = side;
        _boxOrigin = new Vector2((viewSize.X - side) / 2, (viewSize.Y - side) / 2);
        _states = new ElementState[indicator.ElementCount];
        foreach (var part in indicator.Parts)
        {
            for (var i = 0; i < part.ElementCount; i++)
            {
                var brush = _compositor.CreateColorBrush(ColorFor(part.FirstIndex + i, color, colors));
                var element = CreateElement(part.Shape, part.Elements[i], side, brush);
                Root.Children.InsertAtTop(element.Visual);
                _elements.Add(element);
            }
        }
    }

    public void SetColors(Color color, IReadOnlyList<Color>? colors)
    {
        for (var i = 0; i < _elements.Count; i++) _elements[i].Brush.Color = ColorFor(i, color, colors);
    }

    public void Render(double time)
    {
        if (_indicator is null || _elements.Count == 0) return;
        _indicator.Evaluate(time, _states);
        var perspective = _indicator.Perspective;
        for (var i = 0; i < _elements.Count; i++)
        {
            var element = _elements[i];
            var state = _states[i];
            var transform = element.ToCenter
                * ElementTransform.Create(state, perspective, _boxSize, _boxOrigin.X, _boxOrigin.Y);
            if (!IsFinite(transform) || double.IsNaN(state.Opacity))
            {
                element.Visual.IsVisible = false;
                continue;
            }
            element.Visual.IsVisible = true;
            element.Visual.TransformMatrix = transform;
            element.Visual.Opacity = (float)Math.Clamp(state.Opacity, 0, 1);
            if (element.Arcs is { } arcs) TrimArcs(element, arcs, state.StrokeStart, state.StrokeEnd);
        }
    }

    public void Dispose()
    {
        Clear();
        Root.Dispose();
    }

    private void Clear()
    {
        Root.Children.RemoveAll();
        foreach (var element in _elements)
        {
            var visual = element.Visual;
            var shapes = new CompositionShape[visual.Shapes.Count];
            visual.Shapes.CopyTo(shapes, 0);
            visual.Shapes.Clear();
            foreach (var shape in shapes)
            {
                if (shape is CompositionSpriteShape sprite) sprite.Geometry?.Dispose();
                shape.Dispose();
            }
            var clip = visual.Clip;
            visual.Clip = null;
            clip?.Dispose();
            visual.Dispose();
            element.Brush.Dispose();
        }
        _elements.Clear();
        _indicator = null;
        _states = Array.Empty<ElementState>();
    }

    /// <summary>SPEC §4: arc <c>k</c> is drawn from <c>a_k + s·sweep</c> to <c>a_k + e·sweep</c>, nothing when <c>e ≤ s</c>.</summary>
    private static void TrimArcs(ElementVisual element, Arc[] arcs, double strokeStart, double strokeEnd)
    {
        var start = Math.Clamp(strokeStart, 0, 1);
        var end = Math.Clamp(strokeEnd, 0, 1);
        if (start == element.LastStrokeStart && end == element.LastStrokeEnd) return;
        element.LastStrokeStart = start;
        element.LastStrokeEnd = end;
        var length = (end - start) * element.Sweep;
        var drawn = length > 0;
        var trimEnd = drawn ? (float)Math.Min(1, length / FullTurn) : 0;
        foreach (var arc in arcs)
        {
            arc.Shape.StrokeBrush = drawn ? element.Brush : null;
            if (!drawn) continue;
            arc.Geometry.TrimEnd = trimEnd;
            arc.Shape.RotationAngle = (float)(arc.StartAngle + start * element.Sweep - EllipsePathStart);
        }
    }

    private ElementVisual CreateElement(
        ResolvedShape shape,
        ElementGeometry geometry,
        float side,
        CompositionColorBrush brush)
    {
        var width = (float)Math.Max(0, geometry.Width * side);
        var height = (float)Math.Max(0, geometry.Height * side);
        var shortest = Math.Min(width, height);

        var visual = _compositor.CreateShapeVisual();
        visual.Size = new Vector2(width + 2 * Padding, height + 2 * Padding);
        visual.BackfaceVisibility = CompositionBackfaceVisibility.Visible;
        var toCenter = Matrix4x4.CreateTranslation(-(Padding + width / 2), -(Padding + height / 2), 0);

        switch (shape.Type)
        {
            case ShapeType.Rect:
            {
                var radius = (float)Math.Clamp(shape.CornerRadius * shortest, 0, shortest / 2);
                var sprite = RoundedRectangle(width, height, radius);
                sprite.FillBrush = brush;
                visual.Shapes.Add(sprite);
                break;
            }
            case ShapeType.Line:
            {
                var sprite = RoundedRectangle(width, height, shortest / 2);
                sprite.FillBrush = brush;
                visual.Shapes.Add(sprite);
                break;
            }
            case ShapeType.Ring:
                return Ring(visual, shape, width, height, brush, toCenter);
            case ShapeType.Triangle:
            {
                var sprite = Triangle(width, height);
                sprite.FillBrush = brush;
                visual.Shapes.Add(sprite);
                visual.Clip = _compositor.CreateInsetClip(0, 0, 0, Padding);
                visual.BorderMode = CompositionBorderMode.Soft;
                break;
            }
            case ShapeType.Circle when shape.Sweep < FullTurn - 1e-9:
                return CircleSegment(visual, shape, width, height, brush);
            default:
            {
                var sprite = Ellipse(width, height, new Vector2(width / 2, height / 2));
                sprite.FillBrush = brush;
                visual.Shapes.Add(sprite);
                break;
            }
        }
        return new ElementVisual(visual, brush, toCenter, null, 0);
    }

    /// <summary>
    /// One stroked ellipse per arc with flat caps; <see cref="TrimArcs"/> sets their trims every frame. Nothing is
    /// drawn when the stroke is not positive or leaves no radius (SPEC §9).
    /// </summary>
    private ElementVisual Ring(
        ShapeVisual visual,
        ResolvedShape shape,
        float width,
        float height,
        CompositionColorBrush brush,
        Matrix4x4 toCenter)
    {
        var shortest = Math.Min(width, height);
        var stroke = (float)Math.Max(0, shape.StrokeWidth * shortest);
        var radius = Math.Max(0, (shortest - stroke) / 2);
        if (!(stroke > 0) || !(radius > 0)) return new ElementVisual(visual, brush, toCenter, null, 0);
        var center = new Vector2(Padding + width / 2, Padding + height / 2);
        var arcs = new Arc[shape.Segments];
        for (var k = 0; k < arcs.Length; k++)
        {
            var geometry = _compositor.CreateEllipseGeometry();
            geometry.Center = center;
            geometry.Radius = new Vector2(radius, radius);
            var sprite = _compositor.CreateSpriteShape(geometry);
            sprite.CenterPoint = center;
            sprite.StrokeThickness = stroke;
            sprite.StrokeStartCap = CompositionStrokeCap.Flat;
            sprite.StrokeEndCap = CompositionStrokeCap.Flat;
            visual.Shapes.Add(sprite);
            arcs[k] = new Arc(sprite, geometry, shape.StartAngle + k * FullTurn / arcs.Length);
        }
        var element = new ElementVisual(visual, brush, toCenter, arcs, Math.Clamp(shape.Sweep, 0, FullTurn));
        TrimArcs(element, arcs, 0, 1);
        return element;
    }

    /// <summary>
    /// The part of the ellipse between the arc and its chord. The ellipse is rotated so the chord is horizontal,
    /// an <see cref="InsetClip"/> removes the side without the arc, and the element matrix rotates it back.
    /// </summary>
    private ElementVisual CircleSegment(
        ShapeVisual visual,
        ResolvedShape shape,
        float width,
        float height,
        CompositionColorBrush brush)
    {
        double rx = width / 2.0, ry = height / 2.0;
        var start = shape.StartAngle;
        var sweep = Math.Max(0, shape.Sweep);
        var end = start + sweep;
        double x0 = rx * Math.Cos(start), y0 = ry * Math.Sin(start);
        double x1 = rx * Math.Cos(end), y1 = ry * Math.Sin(end);
        var chordAngle = Math.Atan2(y1 - y0, x1 - x0);
        double cos = Math.Cos(chordAngle), sin = Math.Sin(chordAngle);
        var chordY = -x0 * sin + y0 * cos;
        var middle = start + sweep / 2;
        var arcY = -rx * Math.Cos(middle) * sin + ry * Math.Sin(middle) * cos;

        var length = (float)(2 * Math.Max(rx, ry)) + 2 * Padding;
        var center = new Vector2(length / 2, length / 2);
        visual.Size = new Vector2(length, length);
        var toCenter = Matrix4x4.CreateTranslation(-center.X, -center.Y, 0) * Matrix4x4.CreateRotationZ((float)chordAngle);
        if (!(sweep > 0)) return new ElementVisual(visual, brush, toCenter, null, 0);

        var geometry = _compositor.CreateEllipseGeometry();
        geometry.Center = center;
        geometry.Radius = new Vector2((float)rx, (float)ry);
        var sprite = _compositor.CreateSpriteShape(geometry);
        sprite.CenterPoint = center;
        sprite.RotationAngle = (float)-chordAngle;
        sprite.FillBrush = brush;
        visual.Shapes.Add(sprite);

        var line = Math.Clamp(center.Y + (float)chordY, 0, length);
        visual.Clip = arcY < chordY
            ? _compositor.CreateInsetClip(0, 0, 0, length - line)
            : _compositor.CreateInsetClip(0, line, 0, 0);
        visual.BorderMode = CompositionBorderMode.Soft;
        return new ElementVisual(visual, brush, toCenter, null, 0);
    }

    private CompositionSpriteShape Ellipse(float width, float height, Vector2 radius)
    {
        var geometry = _compositor.CreateEllipseGeometry();
        geometry.Center = new Vector2(width / 2, height / 2);
        geometry.Radius = radius;
        var shape = _compositor.CreateSpriteShape(geometry);
        shape.Offset = new Vector2(Padding, Padding);
        return shape;
    }

    private CompositionSpriteShape RoundedRectangle(float width, float height, float radius)
    {
        var geometry = _compositor.CreateRoundedRectangleGeometry();
        geometry.Size = new Vector2(width, height);
        geometry.CornerRadius = new Vector2(radius, radius);
        var shape = _compositor.CreateSpriteShape(geometry);
        shape.Offset = new Vector2(Padding, Padding);
        return shape;
    }

    /// <summary>
    /// Composition has no polygon geometry without Win2D. A unit square mapped onto the rhombus
    /// (w/2, 0) (w, h) (w/2, 2h) (0, h) and clipped below y = h is the triangle top-center, bottom-right, bottom-left.
    /// </summary>
    private CompositionSpriteShape Triangle(float width, float height)
    {
        var geometry = _compositor.CreateRectangleGeometry();
        geometry.Size = Vector2.One;
        var shape = _compositor.CreateSpriteShape(geometry);
        shape.TransformMatrix = new Matrix3x2(width / 2, height, -width / 2, height, Padding + width / 2, Padding);
        return shape;
    }

    private static Color ColorFor(int index, Color color, IReadOnlyList<Color>? colors) =>
        colors is { Count: > 0 } ? colors[index % colors.Count] : color;

    private static bool IsFinite(Matrix4x4 m) => float.IsFinite(
        m.M11 + m.M12 + m.M13 + m.M14 + m.M21 + m.M22 + m.M23 + m.M24
        + m.M31 + m.M32 + m.M33 + m.M34 + m.M41 + m.M42 + m.M43 + m.M44);

    private sealed record Arc(CompositionSpriteShape Shape, CompositionEllipseGeometry Geometry, double StartAngle);

    private sealed class ElementVisual
    {
        public ElementVisual(ShapeVisual visual, CompositionColorBrush brush, Matrix4x4 toCenter, Arc[]? arcs, double sweep)
        {
            Visual = visual;
            Brush = brush;
            ToCenter = toCenter;
            Arcs = arcs;
            Sweep = sweep;
        }

        public ShapeVisual Visual { get; }

        public CompositionColorBrush Brush { get; }

        /// <summary>Maps the visual's local space to coordinates relative to the element center.</summary>
        public Matrix4x4 ToCenter { get; }

        /// <summary>The arcs of a ring element; null for other shapes and for a ring that draws nothing.</summary>
        public Arc[]? Arcs { get; }

        /// <summary>Angle covered by each arc, clamped to [0, 2π].</summary>
        public double Sweep { get; }

        public double LastStrokeStart { get; set; } = double.NaN;

        public double LastStrokeEnd { get; set; } = double.NaN;
    }
}
