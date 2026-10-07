namespace LoaderKit;

/// <summary>
/// The playback rules of SPEC §8: an engine clock that renderers drive with frame deltas, and the spec time to draw.
/// </summary>
public sealed class IndicatorPlayback
{
    /// <summary>Spec time of the clock in seconds.</summary>
    public double Time { get; private set; }

    /// <summary>Clock rate; 1 by default. Zero, negative or NaN pauses the clock. Changing it never moves <see cref="Time"/>.</summary>
    public double Speed { get; set; } = 1;

    /// <summary>Whether the clock runs. Stopping freezes <see cref="Time"/>; starting again continues from it.</summary>
    public bool IsAnimating { get; set; } = true;

    /// <summary>Draw nothing while stopped.</summary>
    public bool HidesWhenStopped { get; set; } = true;

    /// <summary>
    /// A frozen point in [0, 1] of the animation cycle; it is not the progress of a task. While set, the clock is
    /// ignored and does not advance. NaN counts as unset.
    /// </summary>
    public double? CycleProgress { get; set; }

    /// <summary>The system asks for reduced motion and the engine respects it: draw a still frame.</summary>
    public bool ReduceMotion { get; set; }

    /// <summary>Whether the renderer draws anything.</summary>
    public bool IsVisible => IsAnimating || !HidesWhenStopped;

    /// <summary>Whether the clock advances, so the renderer needs frame callbacks.</summary>
    public bool IsRunning => IsAnimating && Speed > 0 && FrozenCycleProgress is null && !ReduceMotion;

    private double? FrozenCycleProgress => CycleProgress is { } cycleProgress && !double.IsNaN(cycleProgress) ? cycleProgress : null;

    /// <summary>Restarts the clock at 0, as when the spec or the params change.</summary>
    public void Restart() => Time = 0;

    /// <summary>Advances the clock by a frame delta in seconds, multiplied by <see cref="Speed"/>, while running.</summary>
    public void Advance(double seconds)
    {
        if (IsRunning && seconds > 0) Time += seconds * Speed;
    }

    /// <summary>The spec time to draw for <paramref name="indicator"/>.</summary>
    public double DisplayTime(PreparedIndicator indicator)
    {
        if (FrozenCycleProgress is { } cycleProgress) return indicator.TimeForCycleProgress(cycleProgress);
        if (ReduceMotion) return indicator.TimeForCycleProgress(0);
        return Time;
    }
}
