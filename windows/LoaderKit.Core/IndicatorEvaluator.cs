using System;
using System.Collections.Generic;

namespace LoaderKit;

/// <summary>
/// The reference evaluator (SPEC §2, §3, §5), a port of <c>spec/src/evaluate.ts</c>. To evaluate one spec every
/// frame, create a <see cref="PreparedIndicator"/> once instead.
/// </summary>
public static class IndicatorEvaluator
{
    private static readonly IReadOnlyDictionary<string, double> NoParams = new Dictionary<string, double>();

    /// <summary>The spec defaults merged with <paramref name="overrides"/>. Overrides for undeclared names are ignored.</summary>
    /// <exception cref="ArgumentException">An override of a declared param is not a finite number.</exception>
    public static IReadOnlyDictionary<string, double> ResolveParams(
        IndicatorSpec spec,
        IReadOnlyDictionary<string, double>? overrides = null)
    {
        if (spec is null) throw new ArgumentNullException(nameof(spec));
        var resolved = new Dictionary<string, double>(StringComparer.Ordinal);
        foreach (var param in spec.Params ?? NoParams) resolved[param.Key] = param.Value;
        if (overrides is null) return resolved;
        foreach (var param in overrides)
        {
            if (!resolved.ContainsKey(param.Key)) continue;
            if (!IndicatorSpecValidator.IsFinite(param.Value))
            {
                throw new ArgumentException($"param \"{param.Key}\" must be a finite number", nameof(overrides));
            }
            resolved[param.Key] = param.Value;
        }
        return resolved;
    }

    /// <summary>State of every element of <paramref name="spec"/> at spec time <paramref name="t"/> in seconds.</summary>
    /// <exception cref="InvalidIndicatorSpecException">The spec is invalid.</exception>
    public static IReadOnlyList<ElementState> Evaluate(
        IndicatorSpec spec,
        double t,
        IReadOnlyDictionary<string, double>? parameters = null) =>
        new PreparedIndicator(spec, parameters).Evaluate(t);

    /// <summary>
    /// Spec time for a frozen <paramref name="cycleProgress"/>, a point in [0, 1] of one cycle of the spec duration:
    /// <c>ceil(maxOffset / duration) · duration + cycleProgress · duration</c>.
    /// </summary>
    /// <exception cref="InvalidIndicatorSpecException">The spec is invalid.</exception>
    public static double TimeForCycleProgress(
        IndicatorSpec spec,
        double cycleProgress,
        IReadOnlyDictionary<string, double>? parameters = null) =>
        new PreparedIndicator(spec, parameters).TimeForCycleProgress(cycleProgress);
}
