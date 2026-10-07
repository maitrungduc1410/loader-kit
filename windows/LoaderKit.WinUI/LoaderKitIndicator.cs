using System;
using System.Collections.Generic;
using System.Numerics;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Automation.Peers;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Hosting;
using Microsoft.UI.Xaml.Media;
using Windows.Foundation;
using Windows.UI;
using Windows.UI.ViewManagement;

namespace LoaderKit.WinUI;

/// <summary>
/// A loading indicator drawn from a LoaderKit spec with Microsoft.UI.Composition.
/// The spec comes from <see cref="IndicatorSpec"/> if set, else from the JSON in <see cref="Spec"/>,
/// else from the built-in <see cref="Indicator"/>.
/// </summary>
public sealed class LoaderKitIndicator : Control
{
    /// <summary>Width and height when the layout does not size the control.</summary>
    public const double DefaultSize = 40;

    /// <summary>The built-in indicator shown when nothing else is set.</summary>
    public const string DefaultIndicator = "BallPulse";

    /// <summary>Identifies <see cref="Indicator"/>.</summary>
    public static readonly DependencyProperty IndicatorProperty =
        Register(nameof(Indicator), typeof(string), DefaultIndicator, control => control.ReloadSpec());

    /// <summary>Identifies <see cref="Spec"/>.</summary>
    public static readonly DependencyProperty SpecProperty =
        Register(nameof(Spec), typeof(string), null, control => control.ReloadSpec());

    /// <summary>Identifies <see cref="IndicatorSpec"/>.</summary>
    public static readonly DependencyProperty IndicatorSpecProperty =
        Register(nameof(IndicatorSpec), typeof(object), null, control => control.ReloadSpec());

    /// <summary>Identifies <see cref="Params"/>.</summary>
    public static readonly DependencyProperty ParamsProperty =
        Register(nameof(Params), typeof(object), null, control => control.ReloadSpec());

    /// <summary>Identifies <see cref="Color"/>.</summary>
    public static readonly DependencyProperty ColorProperty =
        Register(nameof(Color), typeof(Color), new Color { A = 255, R = 255, G = 255, B = 255 }, control => control.UpdateColors());

    /// <summary>Identifies <see cref="Colors"/>.</summary>
    public static readonly DependencyProperty ColorsProperty =
        Register(nameof(Colors), typeof(object), null, control => control.UpdateColors());

    /// <summary>Identifies <see cref="Speed"/>.</summary>
    public static readonly DependencyProperty SpeedProperty =
        Register(nameof(Speed), typeof(double), 1.0, control => control.UpdatePlayback());

    /// <summary>Identifies <see cref="IsAnimating"/>.</summary>
    public static readonly DependencyProperty IsAnimatingProperty =
        Register(nameof(IsAnimating), typeof(bool), true, control => control.UpdatePlayback());

    /// <summary>Identifies <see cref="HidesWhenStopped"/>.</summary>
    public static readonly DependencyProperty HidesWhenStoppedProperty =
        Register(nameof(HidesWhenStopped), typeof(bool), true, control => control.UpdatePlayback());

    /// <summary>Identifies <see cref="CycleProgress"/>.</summary>
    public static readonly DependencyProperty CycleProgressProperty =
        Register(nameof(CycleProgress), typeof(double?), null, control => control.UpdatePlayback());

    /// <summary>Identifies <see cref="RespectsReduceMotion"/>.</summary>
    public static readonly DependencyProperty RespectsReduceMotionProperty =
        Register(nameof(RespectsReduceMotion), typeof(bool), true, control => control.UpdatePlayback());

    private readonly IndicatorPlayback _playback = new();
    private readonly EventHandler<object> _renderingHandler;
    private readonly TypedEventHandler<UISettings, UISettingsAnimationsEnabledChangedEventArgs> _animationsHandler;
    private IndicatorRenderer? _renderer;
    private PreparedIndicator? _indicator;
    private UISettings? _uiSettings;
    private bool _isLoaded;
    private bool _listensToSettings;
    private bool _receivesFrames;
    private TimeSpan? _lastFrameTime;

    /// <summary>Creates the control showing <see cref="DefaultIndicator"/>.</summary>
    public LoaderKitIndicator()
    {
        IsTabStop = false;
        _renderingHandler = OnRendering;
        _animationsHandler = OnAnimationsEnabledChanged;
        Loaded += OnLoaded;
        Unloaded += OnUnloaded;
        SizeChanged += (_, _) => Rebuild();
        RegisterPropertyChangedCallback(VisibilityProperty, (_, _) => UpdatePlayback());
        ReloadSpec();
    }

    /// <summary>Raised when the spec, the JSON or the params cannot be used; <see cref="SpecError"/> has the problems.</summary>
    public event EventHandler<InvalidIndicatorSpecException>? SpecFailed;

    /// <summary>Name of a built-in indicator (see <see cref="BuiltinIndicators.Names"/>). Default <c>BallPulse</c>.</summary>
    public string? Indicator
    {
        get => (string?)GetValue(IndicatorProperty);
        set => SetValue(IndicatorProperty, value);
    }

    /// <summary>A custom spec as JSON. Takes precedence over <see cref="Indicator"/>.</summary>
    public string? Spec
    {
        get => (string?)GetValue(SpecProperty);
        set => SetValue(SpecProperty, value);
    }

    /// <summary>A custom spec. Takes precedence over <see cref="Spec"/> and <see cref="Indicator"/>.</summary>
    public global::LoaderKit.IndicatorSpec? IndicatorSpec
    {
        get => GetValue(IndicatorSpecProperty) as global::LoaderKit.IndicatorSpec;
        set => SetValue(IndicatorSpecProperty, value);
    }

    /// <summary>Overrides of the spec params by name. Assign a new dictionary to change them; this restarts the animation.</summary>
    public IReadOnlyDictionary<string, double>? Params
    {
        get => GetValue(ParamsProperty) as IReadOnlyDictionary<string, double>;
        set => SetValue(ParamsProperty, value);
    }

    /// <summary>Color of every element when <see cref="Colors"/> is empty. Default white.</summary>
    public Color Color
    {
        get => (Color)GetValue(ColorProperty);
        set => SetValue(ColorProperty, value);
    }

    /// <summary>Per-element colors: element <c>i</c> uses <c>Colors[i % Colors.Count]</c>. Overrides <see cref="Color"/>.</summary>
    public IReadOnlyList<Color>? Colors
    {
        get => GetValue(ColorsProperty) as IReadOnlyList<Color>;
        set => SetValue(ColorsProperty, value);
    }

    /// <summary>Playback rate. Default 1; zero or negative pauses. Changing it never makes the animation jump.</summary>
    public double Speed
    {
        get => (double)GetValue(SpeedProperty);
        set => SetValue(SpeedProperty, value);
    }

    /// <summary>Whether the animation runs. Stopping freezes it; starting again continues from where it stopped.</summary>
    public bool IsAnimating
    {
        get => (bool)GetValue(IsAnimatingProperty);
        set => SetValue(IsAnimatingProperty, value);
    }

    /// <summary>Draw nothing while <see cref="IsAnimating"/> is false. Default true.</summary>
    public bool HidesWhenStopped
    {
        get => (bool)GetValue(HidesWhenStoppedProperty);
        set => SetValue(HidesWhenStoppedProperty, value);
    }

    /// <summary>
    /// A frozen point of the animation cycle, in [0, 1]; it is not the progress of a task. Null (default) runs the
    /// clock; clearing it resumes the clock.
    /// </summary>
    public double? CycleProgress
    {
        get => (double?)GetValue(CycleProgressProperty);
        set => SetValue(CycleProgressProperty, value);
    }

    /// <summary>Draw a still frame when Windows animations are turned off (<see cref="UISettings.AnimationsEnabled"/>). Default true.</summary>
    public bool RespectsReduceMotion
    {
        get => (bool)GetValue(RespectsReduceMotionProperty);
        set => SetValue(RespectsReduceMotionProperty, value);
    }

    /// <summary>Why the current spec cannot be drawn, or null when it is drawn.</summary>
    public InvalidIndicatorSpecException? SpecError { get; private set; }

    /// <inheritdoc />
    protected override Size MeasureOverride(Size availableSize) =>
        new(Math.Min(DefaultSize, availableSize.Width), Math.Min(DefaultSize, availableSize.Height));

    /// <inheritdoc />
    protected override AutomationPeer OnCreateAutomationPeer() => new LoaderKitIndicatorAutomationPeer(this);

    private static DependencyProperty Register(
        string name,
        Type type,
        object? defaultValue,
        Action<LoaderKitIndicator> changed) =>
        DependencyProperty.Register(
            name,
            type,
            typeof(LoaderKitIndicator),
            new PropertyMetadata(defaultValue, (d, _) => changed((LoaderKitIndicator)d)));

    private void OnLoaded(object sender, RoutedEventArgs e)
    {
        _isLoaded = true;
        if (_renderer is null)
        {
            var compositor = ElementCompositionPreview.GetElementVisual(this).Compositor;
            _renderer = new IndicatorRenderer(compositor);
            ElementCompositionPreview.SetElementChildVisual(this, _renderer.Root);
        }
        _uiSettings ??= new UISettings();
        if (!_listensToSettings && OperatingSystem.IsWindowsVersionAtLeast(10, 0, 19041))
        {
            _uiSettings.AnimationsEnabledChanged += _animationsHandler;
            _listensToSettings = true;
        }
        Rebuild();
    }

    private void OnUnloaded(object sender, RoutedEventArgs e)
    {
        _isLoaded = false;
        if (_listensToSettings && _uiSettings is not null && OperatingSystem.IsWindowsVersionAtLeast(10, 0, 19041))
        {
            _uiSettings.AnimationsEnabledChanged -= _animationsHandler;
            _listensToSettings = false;
        }
        UpdateFrameCallbacks();
        if (_renderer is not null)
        {
            ElementCompositionPreview.SetElementChildVisual(this, null);
            _renderer.Dispose();
            _renderer = null;
        }
    }

    private void OnAnimationsEnabledChanged(UISettings sender, UISettingsAnimationsEnabledChangedEventArgs args) =>
        DispatcherQueue.TryEnqueue(UpdatePlayback);

    private void ReloadSpec()
    {
        PreparedIndicator? indicator = null;
        InvalidIndicatorSpecException? error = null;
        try
        {
            indicator = new PreparedIndicator(ResolveSpec(), Params);
        }
        catch (InvalidIndicatorSpecException exception)
        {
            error = exception;
        }
        catch (ArgumentException exception)
        {
            error = new InvalidIndicatorSpecException(exception.Message);
        }

        _indicator = indicator;
        SpecError = error;
        _playback.Restart();
        Rebuild();
        if (error is not null) SpecFailed?.Invoke(this, error);
    }

    private global::LoaderKit.IndicatorSpec ResolveSpec()
    {
        if (IndicatorSpec is { } spec) return spec;
        var json = Spec;
        if (!string.IsNullOrWhiteSpace(json)) return global::LoaderKit.IndicatorSpec.Parse(json);
        var name = Indicator;
        if (string.IsNullOrEmpty(name)) throw new InvalidIndicatorSpecException("set Indicator, Spec or IndicatorSpec");
        if (BuiltinIndicators.TryGet(name, out var builtin)) return builtin;
        throw new InvalidIndicatorSpecException(
            $"\"{name}\" is not a built-in indicator. Built-in indicators: {string.Join(", ", BuiltinIndicators.Names)}");
    }

    private void Rebuild()
    {
        _renderer?.Build(_indicator, new Vector2((float)ActualWidth, (float)ActualHeight), Color, Colors);
        UpdatePlayback();
    }

    private void UpdateColors() => _renderer?.SetColors(Color, Colors);

    private void UpdatePlayback()
    {
        _playback.IsAnimating = IsAnimating;
        _playback.HidesWhenStopped = HidesWhenStopped;
        _playback.Speed = Speed;
        _playback.CycleProgress = CycleProgress;
        _playback.ReduceMotion = RespectsReduceMotion && _uiSettings is { AnimationsEnabled: false };
        if (_renderer is not null)
        {
            _renderer.Root.IsVisible = _indicator is not null && _playback.IsVisible;
            RenderFrame();
        }
        UpdateFrameCallbacks();
    }

    private void UpdateFrameCallbacks()
    {
        var wanted = _isLoaded
            && _renderer is not null
            && _indicator is not null
            && Visibility == Visibility.Visible
            && _playback.IsRunning;
        if (wanted == _receivesFrames) return;
        _receivesFrames = wanted;
        if (wanted)
        {
            _lastFrameTime = null;
            CompositionTarget.Rendering += _renderingHandler;
        }
        else
        {
            CompositionTarget.Rendering -= _renderingHandler;
        }
    }

    private void OnRendering(object? sender, object e)
    {
        if (e is RenderingEventArgs args)
        {
            var now = args.RenderingTime;
            if (_lastFrameTime is { } last && now > last) _playback.Advance((now - last).TotalSeconds);
            _lastFrameTime = now;
        }
        RenderFrame();
    }

    private void RenderFrame()
    {
        if (_renderer is not null && _indicator is not null) _renderer.Render(_playback.DisplayTime(_indicator));
    }

    private sealed class LoaderKitIndicatorAutomationPeer : FrameworkElementAutomationPeer
    {
        public LoaderKitIndicatorAutomationPeer(LoaderKitIndicator owner)
            : base(owner)
        {
        }

        protected override AutomationControlType GetAutomationControlTypeCore() => AutomationControlType.ProgressBar;

        protected override string GetClassNameCore() => nameof(LoaderKitIndicator);
    }
}
