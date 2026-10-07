using System;
using System.Numerics;

namespace LoaderKit;

/// <summary>The render composition of SPEC §6 as a 4×4 matrix, for renderers that take one.</summary>
public static class ElementTransform
{
    /// <summary>
    /// The matrix <c>G · T(cx + tx, cy + ty) · P(d) · Rz · Ry · Rx · S(sx, sy)</c> of SPEC §6, group transform
    /// included, in the <see cref="System.Numerics"/> row-vector convention (<c>point · matrix</c>), scaled to the view.
    /// </summary>
    /// <param name="state">The element state.</param>
    /// <param name="perspective">The spec perspective distance in box units.</param>
    /// <param name="boxSize">Side of the box in view units.</param>
    /// <param name="boxX">Left edge of the box in the view.</param>
    /// <param name="boxY">Top edge of the box in the view.</param>
    /// <returns>
    /// A matrix that maps a point given relative to the element center in view units (<c>z = 0</c>) to view
    /// coordinates. The result is homogeneous when the element has a 3D rotation: divide x and y by w.
    /// </returns>
    public static Matrix4x4 Create(in ElementState state, double perspective, double boxSize, double boxX = 0, double boxY = 0)
    {
        var matrix = Matrix4x4.CreateScale((float)state.ScaleX, (float)state.ScaleY, 1);
        if (state.RotateX != 0) matrix *= RotationX(state.RotateX);
        if (state.RotateY != 0) matrix *= RotationY(state.RotateY);
        if (state.Rotate != 0) matrix *= RotationZ(state.Rotate);
        if (state.RotateX != 0 || state.RotateY != 0)
        {
            var projection = Matrix4x4.Identity;
            projection.M34 = (float)(-1 / (perspective * boxSize));
            matrix *= projection;
        }

        var hasGroup = state.GroupScaleX != 1
            || state.GroupScaleY != 1
            || state.GroupRotate != 0
            || state.GroupTranslateX != 0
            || state.GroupTranslateY != 0;
        if (!hasGroup)
        {
            return matrix * Matrix4x4.CreateTranslation(
                (float)(boxX + (state.Cx + state.TranslateX) * boxSize),
                (float)(boxY + (state.Cy + state.TranslateY) * boxSize),
                0);
        }

        var half = boxSize / 2;
        matrix *= Matrix4x4.CreateTranslation(
            (float)((state.Cx + state.TranslateX) * boxSize - half),
            (float)((state.Cy + state.TranslateY) * boxSize - half),
            0);
        matrix *= Matrix4x4.CreateScale((float)state.GroupScaleX, (float)state.GroupScaleY, 1);
        if (state.GroupRotate != 0) matrix *= RotationZ(state.GroupRotate);
        matrix *= Matrix4x4.CreateTranslation(
            (float)(boxX + half + state.GroupTranslateX * boxSize),
            (float)(boxY + half + state.GroupTranslateY * boxSize),
            0);
        return matrix;
    }

    /// <summary><c>y' = y·cos θ - z·sin θ</c>, <c>z' = y·sin θ + z·cos θ</c>.</summary>
    private static Matrix4x4 RotationX(double angle)
    {
        var (cos, sin) = ((float)Math.Cos(angle), (float)Math.Sin(angle));
        var matrix = Matrix4x4.Identity;
        matrix.M22 = cos;
        matrix.M23 = sin;
        matrix.M32 = -sin;
        matrix.M33 = cos;
        return matrix;
    }

    /// <summary><c>x' = x·cos θ + z·sin θ</c>, <c>z' = -x·sin θ + z·cos θ</c>.</summary>
    private static Matrix4x4 RotationY(double angle)
    {
        var (cos, sin) = ((float)Math.Cos(angle), (float)Math.Sin(angle));
        var matrix = Matrix4x4.Identity;
        matrix.M11 = cos;
        matrix.M13 = -sin;
        matrix.M31 = sin;
        matrix.M33 = cos;
        return matrix;
    }

    /// <summary><c>x' = x·cos θ - y·sin θ</c>, <c>y' = x·sin θ + y·cos θ</c> (clockwise on screen, y down).</summary>
    private static Matrix4x4 RotationZ(double angle)
    {
        var (cos, sin) = ((float)Math.Cos(angle), (float)Math.Sin(angle));
        var matrix = Matrix4x4.Identity;
        matrix.M11 = cos;
        matrix.M12 = sin;
        matrix.M21 = -sin;
        matrix.M22 = cos;
        return matrix;
    }
}
