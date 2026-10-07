using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

namespace LoaderKit;

/// <summary>The indicators that ship with LoaderKit, by name (for example <c>BallPulse</c>).</summary>
public static class BuiltinIndicators
{
    private static readonly ConcurrentDictionary<string, IndicatorSpec> Cache = new(StringComparer.Ordinal);

    /// <summary>Names of every built-in indicator.</summary>
    public static IReadOnlyList<string> Names => BuiltinIndicatorSpecs.Names;

    /// <summary>True when <paramref name="name"/> is a built-in indicator (case-sensitive).</summary>
    public static bool Contains(string name) => name is not null && BuiltinIndicatorSpecs.Json.ContainsKey(name);

    /// <summary>The spec of a built-in indicator.</summary>
    /// <exception cref="ArgumentException"><paramref name="name"/> is not a built-in indicator.</exception>
    public static IndicatorSpec Get(string name)
    {
        if (TryGet(name, out var spec)) return spec;
        throw new ArgumentException(
            $"\"{name}\" is not a built-in indicator. Built-in indicators: {string.Join(", ", Names)}",
            nameof(name));
    }

    /// <summary>Looks up the spec of a built-in indicator.</summary>
    public static bool TryGet(string name, [NotNullWhen(true)] out IndicatorSpec? spec)
    {
        if (name is null || !BuiltinIndicatorSpecs.Json.TryGetValue(name, out var json))
        {
            spec = null;
            return false;
        }
        spec = Cache.GetOrAdd(name, _ => IndicatorSpec.Parse(json));
        return true;
    }

    /// <summary>The JSON spec of a built-in indicator, as shipped in the spec package.</summary>
    /// <exception cref="ArgumentException"><paramref name="name"/> is not a built-in indicator.</exception>
    public static string GetJson(string name) =>
        name is not null && BuiltinIndicatorSpecs.Json.TryGetValue(name, out var json)
            ? json
            : throw new ArgumentException($"\"{name}\" is not a built-in indicator", nameof(name));
}
