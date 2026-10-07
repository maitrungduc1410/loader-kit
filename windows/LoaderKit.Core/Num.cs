using System;
using System.Collections.Generic;
using System.Globalization;

namespace LoaderKit;

/// <summary>
/// A spec number: either a literal value or a reference to a spec parameter (<c>{ "$param": "name" }</c>).
/// </summary>
public readonly struct Num : IEquatable<Num>
{
    private Num(double value, string? param)
    {
        Value = value;
        Param = param;
    }

    /// <summary>The literal value. Meaningless when <see cref="IsParam"/> is true.</summary>
    public double Value { get; }

    /// <summary>The referenced parameter name, or null for a literal.</summary>
    public string? Param { get; }

    /// <summary>True when this number references a parameter.</summary>
    public bool IsParam => Param is not null;

    /// <summary>A literal number.</summary>
    public static Num Of(double value) => new(value, null);

    /// <summary>A reference to the parameter <paramref name="name"/>.</summary>
    public static Num FromParam(string name) => new(0, name ?? throw new ArgumentNullException(nameof(name)));

    /// <summary>Converts a literal.</summary>
    public static implicit operator Num(double value) => Of(value);

    /// <summary>The value, looking parameters up in <paramref name="parameters"/> (already resolved).</summary>
    /// <exception cref="InvalidIndicatorSpecException">The parameter is not in <paramref name="parameters"/>.</exception>
    public double Resolve(IReadOnlyDictionary<string, double> parameters)
    {
        if (Param is null) return Value;
        if (parameters.TryGetValue(Param, out var value)) return value;
        throw new InvalidIndicatorSpecException($"Unknown param \"{Param}\"");
    }

    /// <inheritdoc />
    public bool Equals(Num other) => Param is null
        ? other.Param is null && Value.Equals(other.Value)
        : string.Equals(Param, other.Param, StringComparison.Ordinal);

    /// <inheritdoc />
    public override bool Equals(object? obj) => obj is Num other && Equals(other);

    /// <inheritdoc />
    public override int GetHashCode() => Param is null ? Value.GetHashCode() : StringComparer.Ordinal.GetHashCode(Param);

    /// <inheritdoc />
    public override string ToString() =>
        Param is null ? Value.ToString("R", CultureInfo.InvariantCulture) : $"{{ $param: {Param} }}";

    /// <summary>Equality.</summary>
    public static bool operator ==(Num left, Num right) => left.Equals(right);

    /// <summary>Inequality.</summary>
    public static bool operator !=(Num left, Num right) => !left.Equals(right);
}
