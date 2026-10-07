using System;
using System.Collections.Generic;
using System.Linq;

namespace LoaderKit;

/// <summary>Thrown when a spec breaks the schema v1 rules. <see cref="Errors"/> lists every problem found.</summary>
public sealed class InvalidIndicatorSpecException : Exception
{
    /// <summary>Creates the exception from a list of problems.</summary>
    public InvalidIndicatorSpecException(IEnumerable<string> errors)
        : this(errors.ToArray())
    {
    }

    /// <summary>Creates the exception from a single problem.</summary>
    public InvalidIndicatorSpecException(string error)
        : this(new[] { error })
    {
    }

    private InvalidIndicatorSpecException(string[] errors)
        : base("Invalid indicator spec:\n- " + string.Join("\n- ", errors))
    {
        Errors = errors;
    }

    /// <summary>Every problem found, each naming the offending field.</summary>
    public IReadOnlyList<string> Errors { get; }
}
