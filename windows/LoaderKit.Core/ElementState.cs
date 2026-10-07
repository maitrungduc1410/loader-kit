namespace LoaderKit;

/// <summary>Placement of one element from the layout, in box units.</summary>
/// <param name="Cx">Center x.</param>
/// <param name="Cy">Center y.</param>
/// <param name="Width">Element width.</param>
/// <param name="Height">Element height.</param>
/// <param name="Rotate">Rotation that comes from the layout (ring <c>orient</c>), in radians.</param>
public readonly record struct ElementGeometry(double Cx, double Cy, double Width, double Height, double Rotate);

/// <summary>The kind of a <see cref="ResolvedShape"/>.</summary>
public enum ShapeType
{
    /// <summary>A filled ellipse, or a segment of it.</summary>
    Circle,

    /// <summary>A filled rectangle, possibly with rounded corners.</summary>
    Rect,

    /// <summary>Stroked arcs of a circle.</summary>
    Ring,

    /// <summary>A filled triangle.</summary>
    Triangle,

    /// <summary>A bar with fully rounded ends.</summary>
    Line,
}

/// <summary>
/// The shape of a part with its params resolved and its defaults filled in. Fields that do not apply to
/// <paramref name="Type"/> are 0.
/// </summary>
/// <param name="Type">The shape kind.</param>
/// <param name="StartAngle">Circle and ring: where the (first) arc starts, radians.</param>
/// <param name="Sweep">Circle and ring: angle covered by each arc, radians.</param>
/// <param name="CornerRadius">Rect: corner radius as a fraction of the shorter side.</param>
/// <param name="StrokeWidth">Ring: stroke width as a fraction of the shorter side.</param>
/// <param name="Segments">Ring: number of arcs, at least 1.</param>
public readonly record struct ResolvedShape(
    ShapeType Type,
    double StartAngle = 0,
    double Sweep = 0,
    double CornerRadius = 0,
    double StrokeWidth = 0,
    int Segments = 0);

/// <summary>The state of one element at one point in time (SPEC §5.4).</summary>
/// <param name="Index">Global element index across parts; elements are drawn in this order and colored by it.</param>
/// <param name="Part">Index of the part the element belongs to; 0 for a spec written inline.</param>
/// <param name="Cx">Center x before translation, in box units.</param>
/// <param name="Cy">Center y before translation, in box units.</param>
/// <param name="Width">Element width in box units.</param>
/// <param name="Height">Element height in box units.</param>
/// <param name="ScaleX">Combined horizontal scale: <c>scale · scaleX</c>.</param>
/// <param name="ScaleY">Combined vertical scale: <c>scale · scaleY</c>.</param>
/// <param name="Opacity">Element opacity times group opacity; multiplies the alpha of the element color.</param>
/// <param name="Rotate">Layout rotation plus the <c>rotate</c> track, radians, clockwise on screen.</param>
/// <param name="RotateX">3D rotation around the horizontal axis, radians.</param>
/// <param name="RotateY">3D rotation around the vertical axis, radians.</param>
/// <param name="TranslateX">Horizontal translation in box units.</param>
/// <param name="TranslateY">Vertical translation in box units.</param>
/// <param name="StrokeStart">Start of the drawn part of each ring arc, as a fraction of the arc (not clamped).</param>
/// <param name="StrokeEnd">End of the drawn part of each ring arc, as a fraction of the arc (not clamped).</param>
/// <param name="GroupScaleX">Group transform: combined horizontal scale around the box center.</param>
/// <param name="GroupScaleY">Group transform: combined vertical scale around the box center.</param>
/// <param name="GroupRotate">Group transform: rotation around the box center, radians, clockwise.</param>
/// <param name="GroupTranslateX">Group transform: horizontal translation in box units.</param>
/// <param name="GroupTranslateY">Group transform: vertical translation in box units.</param>
public readonly record struct ElementState(
    int Index,
    int Part,
    double Cx,
    double Cy,
    double Width,
    double Height,
    double ScaleX,
    double ScaleY,
    double Opacity,
    double Rotate,
    double RotateX,
    double RotateY,
    double TranslateX,
    double TranslateY,
    double StrokeStart,
    double StrokeEnd,
    double GroupScaleX,
    double GroupScaleY,
    double GroupRotate,
    double GroupTranslateX,
    double GroupTranslateY);
