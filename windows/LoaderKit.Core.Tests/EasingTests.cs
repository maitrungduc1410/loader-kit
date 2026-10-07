using System;

namespace LoaderKit.Tests;

public class EasingTests
{
    private static readonly Easing[] Named = { Easing.Linear, Easing.EaseIn, Easing.EaseOut, Easing.EaseInOut };

    [Fact]
    public void EndpointsAreExact()
    {
        foreach (var easing in Named)
        {
            Assert.Equal(0, easing.Evaluate(0));
            Assert.Equal(1, easing.Evaluate(1));
            Assert.Equal(0, easing.Evaluate(-0.5));
            Assert.Equal(1, easing.Evaluate(1.5));
        }
    }

    [Fact]
    public void LinearIsTheIdentity()
    {
        foreach (var x in new[] { 0.1, 0.25, 0.5, 0.9 }) Assert.Equal(x, Easing.Linear.Evaluate(x));
    }

    [Fact]
    public void EaseInOutIsSymmetric()
    {
        foreach (var x in new[] { 0.1, 0.3, 0.45 })
        {
            var a = Easing.EaseInOut.Evaluate(x);
            var b = Easing.EaseInOut.Evaluate(1 - x);
            Assert.True(Math.Abs(a + b - 1) < 1e-9);
        }
    }

    [Fact]
    public void SolvesXOfTBeforeSamplingY()
    {
        var easing = new Easing(0.2, 0.68, 0.18, 1.08);
        foreach (var x in new[] { 0.05, 0.2, 0.5, 0.8, 0.95 })
        {
            var y = easing.Evaluate(x);
            double lo = 0;
            double hi = 1;
            for (var i = 0; i < 200; i++)
            {
                var mid = (lo + hi) / 2;
                var xt = 3 * Math.Pow(1 - mid, 2) * mid * easing.X1 + 3 * (1 - mid) * mid * mid * easing.X2 + Math.Pow(mid, 3);
                if (xt < x) lo = mid;
                else hi = mid;
            }
            var t = (lo + hi) / 2;
            var expected = 3 * Math.Pow(1 - t, 2) * t * easing.Y1 + 3 * (1 - t) * t * t * easing.Y2 + Math.Pow(t, 3);
            Assert.True(Math.Abs(y - expected) < 1e-7, $"x={x}: {y} vs {expected}");
        }
    }

    [Fact]
    public void OvershootingCurvesLeaveTheUnitRange()
    {
        Assert.True(new Easing(0.2, 0.68, 0.18, 1.08).Evaluate(0.8) > 1);
        Assert.True(new Easing(0.68, -0.55, 0.27, 1.55).Evaluate(0.1) < 0);
    }

    [Fact]
    public void NamedEasingsUseTheCoreAnimationControlPoints()
    {
        Assert.True(Easing.TryGetNamed("linear", out var linear));
        Assert.Equal(new Easing(0, 0, 1, 1), linear);
        Assert.True(Easing.TryGetNamed("easeIn", out var easeIn));
        Assert.Equal(new Easing(0.42, 0, 1, 1), easeIn);
        Assert.True(Easing.TryGetNamed("easeOut", out var easeOut));
        Assert.Equal(new Easing(0, 0, 0.58, 1), easeOut);
        Assert.True(Easing.TryGetNamed("easeInOut", out var easeInOut));
        Assert.Equal(new Easing(0.42, 0, 0.58, 1), easeInOut);
        Assert.False(Easing.TryGetNamed("bounce", out _));
        Assert.False(Easing.TryGetNamed("toString", out _));
    }
}
