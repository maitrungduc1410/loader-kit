using System;

namespace LoaderKit;

/// <summary>
/// The animation state of one progress indicator: the displayed value and buffer, the wave amplitude
/// and the clocks. Call <see cref="SetValue"/> and <see cref="SetBuffer"/> when the inputs change,
/// <see cref="Step"/> once per frame, and draw <see cref="State"/>.
/// </summary>
public sealed class ProgressAnimator
{
    private const double WaveStiffness = 120;

    private readonly Glide glide;
    private readonly Glide bufferGlide;
    private bool indeterminate;
    private double wave;
    private double waveVelocity;
    private double time;
    private double indeterminateTime;

    /// <summary>Creates an animator showing <paramref name="value"/>; null or NaN is indeterminate.</summary>
    public ProgressAnimator(double? value = null, double? buffer = null)
    {
        var determinate = IsValue(value);
        indeterminate = !determinate;
        glide = new Glide(determinate ? Clamp01(value!.Value) : 0);
        bufferGlide = new Glide(IsValue(buffer) ? Clamp01(buffer!.Value) : 0);
        wave = WaveTarget;
    }

    /// <summary>The value the indicator is moving to; null while indeterminate.</summary>
    public double? Target => indeterminate ? null : glide.Target;

    /// <summary>True while the value is unknown.</summary>
    public bool Indeterminate => indeterminate;

    /// <summary>True while the displayed value, the buffer or the wave amplitude are still moving.</summary>
    public bool Moving => glide.Active || bufferGlide.Active || wave != WaveTarget || waveVelocity != 0;

    /// <summary>What to draw now.</summary>
    public ProgressState State => new(indeterminate, indeterminate ? 0 : glide.Value, bufferGlide.Value, wave, time, indeterminateTime);

    private double WaveTarget => indeterminate || (glide.Target > 0.1 && glide.Target < 0.95) ? 1 : 0;

    /// <summary>
    /// Sets the real value; null or NaN switches to indeterminate. <paramref name="now"/> is a clock in
    /// seconds, used to measure the rhythm of updates. Leaving the indeterminate state starts again from 0.
    /// </summary>
    public void SetValue(double? value, double now, bool smooth)
    {
        if (!IsValue(value))
        {
            if (!indeterminate) glide.Jump(0);
            indeterminate = true;
            return;
        }
        var target = Clamp01(value!.Value);
        if (indeterminate)
        {
            indeterminate = false;
            glide.Jump(0);
            glide.LastAt = null;
        }
        if (target == glide.Target && (glide.Active || glide.Value == target)) return;
        glide.MoveTo(target, now, smooth);
    }

    /// <summary>Sets the buffer of linear flat and wavy; null or NaN removes it.</summary>
    public void SetBuffer(double? buffer, double now, bool smooth)
    {
        var target = IsValue(buffer) ? Clamp01(buffer!.Value) : 0;
        if (target == bufferGlide.Target && (bufferGlide.Active || bufferGlide.Value == target)) return;
        bufferGlide.MoveTo(target, now, smooth);
    }

    /// <summary>
    /// Advances by <paramref name="dt"/> seconds. A zero, negative or non-finite <paramref name="speed"/>
    /// pauses the indeterminate animation. With <paramref name="reduceMotion"/> the value and the wave jump
    /// to their targets, ambient motion stops and the indeterminate animation runs at half speed.
    /// </summary>
    public void Step(double dt, double speed, bool reduceMotion)
    {
        if (!(dt > 0) || double.IsInfinity(dt)) return;
        if (reduceMotion)
        {
            glide.Jump(glide.Target);
            bufferGlide.Jump(bufferGlide.Target);
        }
        else
        {
            if (!indeterminate) glide.Step(dt);
            bufferGlide.Step(dt);
            time += dt;
        }
        if (speed > 0 && !double.IsInfinity(speed)) indeterminateTime += dt * speed * (reduceMotion ? 0.5 : 1);
        var target = WaveTarget;
        if (reduceMotion)
        {
            wave = target;
            waveVelocity = 0;
        }
        else
        {
            // The exact solution of a critically damped spring, so long frames cannot make it diverge.
            var omega = Math.Sqrt(WaveStiffness);
            var offset = wave - target;
            var decay = Math.Exp(-omega * dt);
            var drift = (waveVelocity + omega * offset) * dt;
            waveVelocity = (waveVelocity - omega * drift) * decay;
            wave = Math.Min(1.2, Math.Max(0, target + (offset + drift) * decay));
            if (Math.Abs(wave - target) < 1e-4 && Math.Abs(waveVelocity) < 1e-3)
            {
                wave = target;
                waveVelocity = 0;
            }
        }
    }

    private static double Clamp01(double x) => Math.Min(1, Math.Max(0, x));

    private static bool IsValue(double? value) => value is { } v && !double.IsNaN(v);

    /// <summary>
    /// Moves the displayed value to each new value along a cubic Hermite curve. Its duration follows the
    /// rhythm of the updates, and both end slopes stay within three times the average slope, which keeps
    /// the curve monotone: the displayed value never passes the real one.
    /// </summary>
    private sealed class Glide
    {
        private const double RhythmGap = 1.5;
        private const double BackwardDuration = 0.4;
        private const double IsolatedDuration = 0.5;

        private double velocity;
        private double interval = IsolatedDuration;
        private double from;
        private double to;
        private double duration;
        private double startVelocity;
        private double endVelocity;
        private double elapsed;

        public Glide(double value)
        {
            Value = value;
            Target = value;
        }

        public double Value { get; private set; }

        public double Target { get; private set; }

        public double? LastAt { get; set; }

        public bool Active { get; private set; }

        public void Jump(double value)
        {
            Value = value;
            Target = value;
            velocity = 0;
            Active = false;
        }

        public void MoveTo(double target, double now, bool smooth)
        {
            var gap = LastAt is { } last ? now - last : double.PositiveInfinity;
            LastAt = now;
            if (!smooth)
            {
                Jump(target);
                return;
            }
            var rhythmic = gap >= 0 && gap < RhythmGap;
            interval = rhythmic ? interval * 0.5 + Math.Max(0.05, gap) * 0.5 : IsolatedDuration;
            Target = target;
            var distance = target - Value;
            if (Math.Abs(distance) < 1e-5)
            {
                Jump(target);
                return;
            }
            if (distance < 0)
            {
                duration = BackwardDuration;
                startVelocity = 0;
                endVelocity = 0;
            }
            else
            {
                duration = rhythmic ? Math.Min(1, Math.Max(0.25, interval * 1.15)) : IsolatedDuration;
                var slope = distance / duration;
                startVelocity = Math.Min(2.5 * slope, Math.Max(0, velocity));
                endVelocity = rhythmic && target < 1 ? 0.5 * slope : 0;
            }
            from = Value;
            to = target;
            elapsed = 0;
            Active = true;
        }

        public void Step(double dt)
        {
            if (!Active) return;
            elapsed += dt;
            var T = duration;
            var u = elapsed >= T - 1e-9 ? 1 : elapsed / T;
            var u2 = u * u;
            var u3 = u2 * u;
            var m0 = T * startVelocity;
            var m1 = T * endVelocity;
            Value = (2 * u3 - 3 * u2 + 1) * from + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * to + (u3 - u2) * m1;
            velocity = ((6 * u2 - 6 * u) * from + (3 * u2 - 4 * u + 1) * m0 + (-6 * u2 + 6 * u) * to + (3 * u2 - 2 * u) * m1) / T;
            if (u >= 1) Jump(to);
        }
    }
}
