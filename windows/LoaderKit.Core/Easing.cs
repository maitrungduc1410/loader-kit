using System;
using System.Collections.Generic;

namespace LoaderKit;

/// <summary>
/// A cubic-bezier easing through <c>(0,0) (X1,Y1) (X2,Y2) (1,1)</c>, like CSS <c>cubic-bezier()</c>.
/// </summary>
public readonly record struct Easing(double X1, double Y1, double X2, double Y2)
{
    private const double Epsilon = 1e-7;

    /// <summary><c>[0, 0, 1, 1]</c>.</summary>
    public static Easing Linear { get; } = new(0, 0, 1, 1);

    /// <summary><c>[0.25, 0.1, 0.25, 1]</c>, the CSS and Core Animation default.</summary>
    public static Easing Ease { get; } = new(0.25, 0.1, 0.25, 1);

    /// <summary><c>[0.42, 0, 1, 1]</c>.</summary>
    public static Easing EaseIn { get; } = new(0.42, 0, 1, 1);

    /// <summary><c>[0, 0, 0.58, 1]</c>.</summary>
    public static Easing EaseOut { get; } = new(0, 0, 0.58, 1);

    /// <summary><c>[0.42, 0, 0.58, 1]</c>.</summary>
    public static Easing EaseInOut { get; } = new(0.42, 0, 0.58, 1);

    /// <summary>The spec names of the named easings.</summary>
    public static IReadOnlyList<string> Names { get; } = new[] { "linear", "ease", "easeIn", "easeOut", "easeInOut" };

    /// <summary>Looks up a named easing (<c>linear</c>, <c>ease</c>, <c>easeIn</c>, <c>easeOut</c>, <c>easeInOut</c>).</summary>
    public static bool TryGetNamed(string? name, out Easing easing)
    {
        switch (name)
        {
            case "linear": easing = Linear; return true;
            case "ease": easing = Ease; return true;
            case "easeIn": easing = EaseIn; return true;
            case "easeOut": easing = EaseOut; return true;
            case "easeInOut": easing = EaseInOut; return true;
            default: easing = default; return false;
        }
    }

    /// <summary>
    /// Eased progress for <paramref name="x"/>: solves <c>bx(t) = x</c> with Newton-Raphson (at most 8 steps),
    /// then bisection (at most 50 steps), both stopping at an error below 1e-7, and returns <c>by(t)</c>.
    /// </summary>
    public double Evaluate(double x)
    {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        if (X1 == Y1 && X2 == Y2) return x;

        var cx = 3 * X1;
        var bx = 3 * (X2 - X1) - cx;
        var ax = 1 - cx - bx;
        var cy = 3 * Y1;
        var by = 3 * (Y2 - Y1) - cy;
        var ay = 1 - cy - by;

        double SampleX(double t) => ((ax * t + bx) * t + cx) * t;
        double SampleY(double t) => ((ay * t + by) * t + cy) * t;
        double SlopeX(double t) => (3 * ax * t + 2 * bx) * t + cx;

        var t = x;
        for (var i = 0; i < 8; i++)
        {
            var error = SampleX(t) - x;
            if (Math.Abs(error) < Epsilon) return SampleY(t);
            var slope = SlopeX(t);
            if (Math.Abs(slope) < Epsilon) break;
            t -= error / slope;
        }

        double lo = 0;
        double hi = 1;
        t = x;
        for (var i = 0; i < 50; i++)
        {
            var value = SampleX(t);
            if (Math.Abs(value - x) < Epsilon) break;
            if (value < x) lo = t;
            else hi = t;
            t = (lo + hi) / 2;
        }
        return SampleY(t);
    }
}
