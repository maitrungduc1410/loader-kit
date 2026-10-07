namespace LoaderKit.Tests;

public class PlaybackTests
{
    private static readonly PreparedIndicator BallPulse = new(BuiltinIndicators.Get("BallPulse"));

    [Fact]
    public void ClockAdvancesByFrameDeltaTimesSpeed()
    {
        var playback = new IndicatorPlayback();
        playback.Advance(0.5);
        Assert.Equal(0.5, playback.Time, 12);
        playback.Speed = 2;
        Assert.Equal(0.5, playback.Time, 12);
        playback.Advance(0.25);
        Assert.Equal(1.0, playback.Time, 12);
        Assert.Equal(playback.Time, playback.DisplayTime(BallPulse));
    }

    [Fact]
    public void NonPositiveSpeedPauses()
    {
        var playback = new IndicatorPlayback { Speed = 0 };
        Assert.False(playback.IsRunning);
        playback.Advance(1);
        Assert.Equal(0, playback.Time);
        playback.Speed = -1;
        playback.Advance(1);
        playback.Speed = double.NaN;
        playback.Advance(1);
        Assert.Equal(0, playback.Time);
    }

    [Fact]
    public void StoppingFreezesAndStartingContinues()
    {
        var playback = new IndicatorPlayback();
        playback.Advance(0.3);
        playback.IsAnimating = false;
        playback.Advance(10);
        Assert.Equal(0.3, playback.Time, 12);
        Assert.False(playback.IsVisible);
        playback.HidesWhenStopped = false;
        Assert.True(playback.IsVisible);
        playback.IsAnimating = true;
        playback.Advance(0.1);
        Assert.Equal(0.4, playback.Time, 12);
    }

    [Fact]
    public void RestartGoesBackToZero()
    {
        var playback = new IndicatorPlayback();
        playback.Advance(2);
        playback.Restart();
        Assert.Equal(0, playback.Time);
    }

    [Fact]
    public void CycleProgressIgnoresTheClockAndResumesWhenCleared()
    {
        var playback = new IndicatorPlayback();
        playback.Advance(0.2);
        playback.CycleProgress = 0.5;
        Assert.False(playback.IsRunning);
        playback.Advance(5);
        Assert.Equal(BallPulse.TimeForCycleProgress(0.5), playback.DisplayTime(BallPulse));
        Assert.Equal(0.75 + 0.375, playback.DisplayTime(BallPulse), 12);
        playback.CycleProgress = null;
        Assert.Equal(0.2, playback.DisplayTime(BallPulse), 12);
        playback.CycleProgress = double.NaN;
        Assert.True(playback.IsRunning);
    }

    [Fact]
    public void ReduceMotionDrawsTheFirstFullFrame()
    {
        var playback = new IndicatorPlayback { ReduceMotion = true };
        Assert.False(playback.IsRunning);
        playback.Advance(1);
        Assert.Equal(BallPulse.TimeForCycleProgress(0), playback.DisplayTime(BallPulse));
        playback.CycleProgress = 0.25;
        Assert.Equal(BallPulse.TimeForCycleProgress(0.25), playback.DisplayTime(BallPulse));
    }
}
