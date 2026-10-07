using System;
using System.Linq;
using System.Numerics;

namespace LoaderKit.Tests;

public class ElementTransformTests
{
    private const double BoxSize = 120;
    private const double BoxX = 10;
    private const double BoxY = 30;

    /// <summary>SPEC §6 step by step, in box units, then placed in the view.</summary>
    private static (double X, double Y) Reference(ElementState s, double perspective, double x, double y)
    {
        x *= s.ScaleX;
        y *= s.ScaleY;
        double z = 0;
        (y, z) = (y * Math.Cos(s.RotateX) - z * Math.Sin(s.RotateX), y * Math.Sin(s.RotateX) + z * Math.Cos(s.RotateX));
        (x, z) = (x * Math.Cos(s.RotateY) + z * Math.Sin(s.RotateY), -x * Math.Sin(s.RotateY) + z * Math.Cos(s.RotateY));
        (x, y) = (x * Math.Cos(s.Rotate) - y * Math.Sin(s.Rotate), x * Math.Sin(s.Rotate) + y * Math.Cos(s.Rotate));
        if (s.RotateX != 0 || s.RotateY != 0)
        {
            x = x * perspective / (perspective - z);
            y = y * perspective / (perspective - z);
        }
        x += s.Cx + s.TranslateX;
        y += s.Cy + s.TranslateY;
        var (gx, gy) = ((x - 0.5) * s.GroupScaleX, (y - 0.5) * s.GroupScaleY);
        (gx, gy) = (gx * Math.Cos(s.GroupRotate) - gy * Math.Sin(s.GroupRotate), gx * Math.Sin(s.GroupRotate) + gy * Math.Cos(s.GroupRotate));
        return (
            BoxX + (gx + 0.5 + s.GroupTranslateX) * BoxSize,
            BoxY + (gy + 0.5 + s.GroupTranslateY) * BoxSize);
    }

    private static ElementState State(
        double cx, double cy, double width, double height, double scaleX, double scaleY, double opacity,
        double rotate, double rotateX, double rotateY, double translateX, double translateY,
        double groupScaleX = 1, double groupScaleY = 1, double groupRotate = 0,
        double groupTranslateX = 0, double groupTranslateY = 0) => new(
        0, 0, cx, cy, width, height, scaleX, scaleY, opacity, rotate, rotateX, rotateY, translateX, translateY, 0, 1,
        groupScaleX, groupScaleY, groupRotate, groupTranslateX, groupTranslateY);

    private static void AssertMatches(ElementState state, double perspective)
    {
        var matrix = ElementTransform.Create(state, perspective, BoxSize, BoxX, BoxY);
        foreach (var (x, y) in new[] { (0.0, 0.0), (0.1, 0.0), (0.0, -0.1), (0.07, 0.04), (-0.12, 0.09) })
        {
            var point = Vector4.Transform(new Vector4((float)(x * BoxSize), (float)(y * BoxSize), 0, 1), matrix);
            var (expectedX, expectedY) = Reference(state, perspective, x, y);
            Assert.True(Math.Abs(point.X / point.W - expectedX) < 1e-3, $"x: {point.X / point.W} != {expectedX} for {state}");
            Assert.True(Math.Abs(point.Y / point.W - expectedY) < 1e-3, $"y: {point.Y / point.W} != {expectedY} for {state}");
        }
    }

    [Fact]
    public void MatchesTheSpecCompositionForEveryVectorSample()
    {
        foreach (var file in TestVectors.Files)
        {
            var vector = TestVectors.Load(file);
            var parameters = vector.GetProperty("params").EnumerateObject()
                .ToDictionary(param => param.Name, param => param.Value.GetDouble());
            var indicator = new PreparedIndicator(IndicatorSpec.Parse(vector.GetProperty("spec")), parameters);
            foreach (var sample in vector.GetProperty("samples").EnumerateArray())
            {
                foreach (var state in indicator.Evaluate(sample.GetProperty("t").GetDouble()))
                {
                    AssertMatches(state, indicator.Perspective);
                }
            }
        }
    }

    [Fact]
    public void MatchesTheSpecCompositionWithEveryPropertyAtOnce()
    {
        var state = State(0.4, 0.6, 0.3, 0.2, 1.3, 0.7, 1, 0.9, 0.6, -1.1, 0.05, -0.08);
        AssertMatches(state, 2.5);
        AssertMatches(state, 0.8);
        AssertMatches(state with { RotateX = 0, RotateY = 0 }, 2.5);
        var grouped = state with
        {
            GroupScaleX = 0.8, GroupScaleY = 1.2, GroupRotate = 2.1, GroupTranslateX = 0.03, GroupTranslateY = -0.06,
        };
        AssertMatches(grouped, 2.5);
        AssertMatches(grouped with { RotateX = 0, RotateY = 0 }, 2.5);
        AssertMatches(grouped with { GroupRotate = 0 }, 1.5);
    }

    [Fact]
    public void GroupRotateTurnsTheElementAroundTheBoxCenter()
    {
        var state = State(0.9, 0.5, 0.2, 0.2, 1, 1, 1, 0, 0, 0, 0, 0, groupRotate: Math.PI / 2);
        var matrix = ElementTransform.Create(state, 2.5, 100);
        Assert.Equal(50, matrix.M41, 3);
        Assert.Equal(90, matrix.M42, 3);
        Assert.Equal(Matrix4x4.Identity, ElementTransform.Create(State(0.5, 0.5, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0), 2.5, 100)
            * Matrix4x4.CreateTranslation(-50, -50, 0));
    }

    [Fact]
    public void PositiveRotateTurnsClockwiseOnScreen()
    {
        var state = State(0.5, 0.5, 1, 1, 1, 1, 1, Math.PI / 2, 0, 0, 0, 0);
        var matrix = ElementTransform.Create(state, 2.5, 100);
        var point = Vector2.Transform(new Vector2(10, 0), new Matrix3x2(matrix.M11, matrix.M12, matrix.M21, matrix.M22, matrix.M41, matrix.M42));
        Assert.Equal(50, point.X, 3);
        Assert.Equal(60, point.Y, 3);
    }

    [Fact]
    public void PerspectiveMatchesCoreAnimationM34()
    {
        var state = State(0.5, 0.5, 1, 1, 1, 1, 1, 0, 0.3, 0, 0, 0);
        var matrix = ElementTransform.Create(state, 2.5, 40);
        Assert.Equal(-Math.Cos(0.3) / (2.5 * 40), matrix.M34, 6);
        Assert.Equal(0, ElementTransform.Create(state with { RotateX = 0 }, 2.5, 40).M34);
    }
}
