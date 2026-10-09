using System;
using System.Diagnostics;
using Microsoft.Graphics.Canvas.UI.Xaml;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Automation;
using Microsoft.UI.Xaml.Automation.Peers;
using Microsoft.UI.Xaml.Automation.Provider;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Markup;
using Microsoft.UI.Xaml.Media;
using Windows.Foundation;
using Windows.UI;
using Windows.UI.ViewManagement;

namespace LoaderKit.WinUI;

/// <summary>
/// A progress indicator: 30 designs across linear, circular, pie, gauge, liquid, border, bars, grid and battery,
/// determinate or indeterminate, drawn with Win2D from the same geometry as every other LoaderKit platform.
/// Value changes glide to the new value unless <see cref="Smooth"/> is false.
/// </summary>
/// <remarks>
/// <see cref="Child"/> is shown in the middle, or inside the stroke for <see cref="ProgressType.Border"/>.
/// Linear fills the available width and is as tall as its stroke; border wraps its child; every other type is
/// <see cref="Size"/> wide.
/// </remarks>
[ContentProperty(Name = nameof(Child))]
public sealed class LoaderKitProgress : UserControl
{
    /// <summary>Identifies <see cref="Value"/>.</summary>
    public static readonly DependencyProperty ValueProperty =
        Register(nameof(Value), typeof(double?), null, (control, args) => control.OnValueChanged(args));

    /// <summary>Identifies <see cref="Buffer"/>.</summary>
    public static readonly DependencyProperty BufferProperty =
        Register(nameof(Buffer), typeof(double?), null, (control, _) => control.OnBufferChanged());

    /// <summary>Identifies <see cref="Smooth"/>.</summary>
    public static readonly DependencyProperty SmoothProperty =
        Register(nameof(Smooth), typeof(bool), true, null);

    /// <summary>Identifies <see cref="Type"/>.</summary>
    public static readonly DependencyProperty TypeProperty =
        Register(nameof(Type), typeof(ProgressType), ProgressType.Circular, Reconfigure);

    /// <summary>Identifies <see cref="Variant"/>.</summary>
    public static readonly DependencyProperty VariantProperty =
        Register(nameof(Variant), typeof(ProgressVariant?), null, Reconfigure);

    /// <summary>Identifies <see cref="Thickness"/>.</summary>
    public static readonly DependencyProperty ThicknessProperty =
        Register(nameof(Thickness), typeof(double?), null, Reconfigure);

    /// <summary>Identifies <see cref="TrackGap"/>.</summary>
    public static readonly DependencyProperty TrackGapProperty =
        Register(nameof(TrackGap), typeof(double?), null, Reconfigure);

    /// <summary>Identifies <see cref="Segments"/>.</summary>
    public static readonly DependencyProperty SegmentsProperty =
        Register(nameof(Segments), typeof(int?), null, Reconfigure);

    /// <summary>Identifies <see cref="ShowLabel"/>.</summary>
    public static readonly DependencyProperty ShowLabelProperty =
        Register(nameof(ShowLabel), typeof(bool), false, Reconfigure);

    /// <summary>Identifies <see cref="StopIndicator"/>.</summary>
    public static readonly DependencyProperty StopIndicatorProperty =
        Register(nameof(StopIndicator), typeof(bool), true, Reconfigure);

    /// <summary>Identifies <see cref="StrokeCap"/>.</summary>
    public static readonly DependencyProperty StrokeCapProperty =
        Register(nameof(StrokeCap), typeof(ProgressStrokeCap), ProgressStrokeCap.Round, Reconfigure);

    /// <summary>Identifies <see cref="Amplitude"/>.</summary>
    public static readonly DependencyProperty AmplitudeProperty =
        Register(nameof(Amplitude), typeof(double?), null, Reconfigure);

    /// <summary>Identifies <see cref="Wavelength"/>.</summary>
    public static readonly DependencyProperty WavelengthProperty =
        Register(nameof(Wavelength), typeof(double?), null, Reconfigure);

    /// <summary>Identifies <see cref="WaveSpeed"/>.</summary>
    public static readonly DependencyProperty WaveSpeedProperty =
        Register(nameof(WaveSpeed), typeof(double?), null, Reconfigure);

    /// <summary>Identifies <see cref="SweepAngle"/>.</summary>
    public static readonly DependencyProperty SweepAngleProperty =
        Register(nameof(SweepAngle), typeof(double?), null, Reconfigure);

    /// <summary>Identifies <see cref="ProgressCornerRadius"/>.</summary>
    public static readonly DependencyProperty ProgressCornerRadiusProperty =
        Register(nameof(ProgressCornerRadius), typeof(double?), null, Reconfigure);

    /// <summary>Identifies <see cref="Speed"/>.</summary>
    public static readonly DependencyProperty SpeedProperty =
        Register(nameof(Speed), typeof(double?), null, Reconfigure);

    /// <summary>Identifies <see cref="Size"/>.</summary>
    public static readonly DependencyProperty SizeProperty =
        Register(nameof(Size), typeof(double), ProgressGeometry.DefaultSize, (control, _) => control.InvalidateMeasure());

    /// <summary>Identifies <see cref="Color"/>.</summary>
    public static readonly DependencyProperty ColorProperty =
        Register(nameof(Color), typeof(Color?), null, (control, _) => control.Redraw());

    /// <summary>Identifies <see cref="TrackColor"/>.</summary>
    public static readonly DependencyProperty TrackColorProperty =
        Register(nameof(TrackColor), typeof(Color?), null, (control, _) => control.Redraw());

    /// <summary>Identifies <see cref="LabelColor"/>.</summary>
    public static readonly DependencyProperty LabelColorProperty =
        Register(nameof(LabelColor), typeof(Color?), null, (control, _) => control.Redraw());

    /// <summary>Identifies <see cref="RespectsReduceMotion"/>.</summary>
    public static readonly DependencyProperty RespectsReduceMotionProperty =
        Register(nameof(RespectsReduceMotion), typeof(bool), true, (control, _) => control.UpdateClock());

    /// <summary>Identifies <see cref="Child"/>.</summary>
    public static readonly DependencyProperty ChildProperty =
        Register(nameof(Child), typeof(UIElement), null, (control, _) => control._childHost.Child = control.Child);

    private static readonly Color FallbackAccent = Windows.UI.Color.FromArgb(255, 0, 120, 212);

    private readonly Grid _root = new();
    private readonly Border _childHost = new();
    private readonly EventHandler<object> _renderingHandler;
    private readonly TypedEventHandler<UISettings, UISettingsAnimationsEnabledChangedEventArgs> _animationsHandler;
    private readonly TypedEventHandler<CanvasControl, CanvasDrawEventArgs> _drawHandler;
    private readonly ProgressAnimator _animator = new();
    private ResolvedProgress _resolved = new();
    private CanvasControl? _canvas;
    private UISettings? _uiSettings;
    private bool _listensToSettings;
    private bool _receivesFrames;
    private TimeSpan? _lastFrameTime;

    /// <summary>Creates an indeterminate circular indicator.</summary>
    public LoaderKitProgress()
    {
        IsTabStop = false;
        _renderingHandler = OnRendering;
        _animationsHandler = OnAnimationsEnabledChanged;
        _drawHandler = OnDraw;
        _root.Children.Add(_childHost);
        Content = _root;
        UpdateChildLayout();
        Loaded += OnLoaded;
        Unloaded += OnUnloaded;
        ActualThemeChanged += (_, _) => Redraw();
        RegisterPropertyChangedCallback(ForegroundProperty, (_, _) => Redraw());
        RegisterPropertyChangedCallback(VisibilityProperty, (_, _) => UpdateClock());
    }

    /// <summary>Progress in [0, 1]; null or NaN shows the indeterminate animation. Out of range values are clamped.</summary>
    public double? Value
    {
        get => (double?)GetValue(ValueProperty);
        set => SetValue(ValueProperty, value);
    }

    /// <summary>Buffer of linear flat and wavy, in [0, 1]; null draws none.</summary>
    public double? Buffer
    {
        get => (double?)GetValue(BufferProperty);
        set => SetValue(BufferProperty, value);
    }

    /// <summary>Move to a new value along a curve rather than jump to it. Default true.</summary>
    public bool Smooth
    {
        get => (bool)GetValue(SmoothProperty);
        set => SetValue(SmoothProperty, value);
    }

    /// <summary>The shape. Default <see cref="ProgressType.Circular"/>.</summary>
    public ProgressType Type
    {
        get => (ProgressType)GetValue(TypeProperty);
        set => SetValue(TypeProperty, value);
    }

    /// <summary>The style; null, or one the type does not have, takes the first of <see cref="ResolvedProgress.Variants"/>.</summary>
    public ProgressVariant? Variant
    {
        get => (ProgressVariant?)GetValue(VariantProperty);
        set => SetValue(VariantProperty, value);
    }

    /// <summary>Width of strokes and bars; null takes the default of the type and variant.</summary>
    public double? Thickness
    {
        get => (double?)GetValue(ThicknessProperty);
        set => SetValue(ThicknessProperty, value);
    }

    /// <summary>Space between the progress and the track, or between segments. Default 4.</summary>
    public double? TrackGap
    {
        get => (double?)GetValue(TrackGapProperty);
        set => SetValue(TrackGapProperty, value);
    }

    /// <summary>Number of segments, dots, ticks, steps, bars or grid columns; null takes the default of the type and variant.</summary>
    public int? Segments
    {
        get => (int?)GetValue(SegmentsProperty);
        set => SetValue(SegmentsProperty, value);
    }

    /// <summary>Show the percentage. Default false.</summary>
    public bool ShowLabel
    {
        get => (bool)GetValue(ShowLabelProperty);
        set => SetValue(ShowLabelProperty, value);
    }

    /// <summary>Dot at the end of the track of linear flat and wavy. Default true.</summary>
    public bool StopIndicator
    {
        get => (bool)GetValue(StopIndicatorProperty);
        set => SetValue(StopIndicatorProperty, value);
    }

    /// <summary>Stroke ends. Default <see cref="ProgressStrokeCap.Round"/>.</summary>
    public ProgressStrokeCap StrokeCap
    {
        get => (ProgressStrokeCap)GetValue(StrokeCapProperty);
        set => SetValue(StrokeCapProperty, value);
    }

    /// <summary>Wave amplitude of wavy. Default 3 for linear, 2 for circular.</summary>
    public double? Amplitude
    {
        get => (double?)GetValue(AmplitudeProperty);
        set => SetValue(AmplitudeProperty, value);
    }

    /// <summary>Wave length of wavy. Default 40 for linear, 15 for circular.</summary>
    public double? Wavelength
    {
        get => (double?)GetValue(WavelengthProperty);
        set => SetValue(WavelengthProperty, value);
    }

    /// <summary>Wave travel in wavelengths per second. Default 1.</summary>
    public double? WaveSpeed
    {
        get => (double?)GetValue(WaveSpeedProperty);
        set => SetValue(WaveSpeedProperty, value);
    }

    /// <summary>Arc of gauge, in degrees within [30, 350]. Default 270.</summary>
    public double? SweepAngle
    {
        get => (double?)GetValue(SweepAngleProperty);
        set => SetValue(SweepAngleProperty, value);
    }

    /// <summary>Corner radius of border. Default 12.</summary>
    public double? ProgressCornerRadius
    {
        get => (double?)GetValue(ProgressCornerRadiusProperty);
        set => SetValue(ProgressCornerRadiusProperty, value);
    }

    /// <summary>Playback rate of the indeterminate animation. Default 1; zero or negative values pause it, non-finite ones take the default.</summary>
    public double? Speed
    {
        get => (double?)GetValue(SpeedProperty);
        set => SetValue(SpeedProperty, value);
    }

    /// <summary>Width of every type but linear and border when the layout does not size the control. Default 48.</summary>
    public double Size
    {
        get => (double)GetValue(SizeProperty);
        set => SetValue(SizeProperty, value);
    }

    /// <summary>The progress color; null uses the system accent color.</summary>
    public Color? Color
    {
        get => (Color?)GetValue(ColorProperty);
        set => SetValue(ColorProperty, value);
    }

    /// <summary>The track color; null draws the track in <see cref="Color"/> at 24% opacity.</summary>
    public Color? TrackColor
    {
        get => (Color?)GetValue(TrackColorProperty);
        set => SetValue(TrackColorProperty, value);
    }

    /// <summary>The label color; null uses <see cref="Control.Foreground"/>.</summary>
    public Color? LabelColor
    {
        get => (Color?)GetValue(LabelColorProperty);
        set => SetValue(LabelColorProperty, value);
    }

    /// <summary>
    /// When true and Windows animations are turned off (<see cref="UISettings.AnimationsEnabled"/>), values jump,
    /// ambient motion stops and the indeterminate animation slows down. Default true.
    /// </summary>
    public bool RespectsReduceMotion
    {
        get => (bool)GetValue(RespectsReduceMotionProperty);
        set => SetValue(RespectsReduceMotionProperty, value);
    }

    /// <summary>Shown in the middle, or inside the stroke for <see cref="ProgressType.Border"/>.</summary>
    public UIElement? Child
    {
        get => (UIElement?)GetValue(ChildProperty);
        set => SetValue(ChildProperty, value);
    }

    /// <summary>The options with every default applied.</summary>
    public ResolvedProgress ResolvedOptions => _resolved;

    private bool ReducesMotion => RespectsReduceMotion && _uiSettings is { AnimationsEnabled: false };

    private bool Moving
    {
        get
        {
            var speed = _resolved.Speed;
            return _animator.Moving
                || (_animator.Indeterminate && speed > 0 && !double.IsInfinity(speed))
                || (_resolved.HasAmbientMotion(_animator.State) && !ReducesMotion);
        }
    }

    /// <inheritdoc />
    protected override Windows.Foundation.Size MeasureOverride(Windows.Foundation.Size availableSize)
    {
        double width;
        double height;
        switch (_resolved.Type)
        {
            case ProgressType.Linear:
                width = double.IsInfinity(availableSize.Width) ? ValidSize : availableSize.Width;
                height = _resolved.LinearHeight;
                _root.Measure(new Windows.Foundation.Size(width, height));
                break;
            case ProgressType.Border:
                _root.Measure(availableSize);
                width = _root.DesiredSize.Width;
                height = _root.DesiredSize.Height;
                break;
            default:
                width = ValidSize;
                height = width * (_resolved.IntrinsicHeight ?? ProgressGeometry.DefaultSize) / ProgressGeometry.DefaultSize;
                _root.Measure(new Windows.Foundation.Size(width, height));
                break;
        }
        return new Windows.Foundation.Size(Math.Min(width, availableSize.Width), Math.Min(height, availableSize.Height));
    }

    /// <inheritdoc />
    protected override Windows.Foundation.Size ArrangeOverride(Windows.Foundation.Size finalSize)
    {
        _root.Arrange(new Rect(0, 0, finalSize.Width, finalSize.Height));
        return finalSize;
    }

    /// <inheritdoc />
    protected override AutomationPeer OnCreateAutomationPeer() => new LoaderKitProgressAutomationPeer(this);

    private double ValidSize
    {
        get
        {
            var size = Size;
            return !double.IsNaN(size) && !double.IsInfinity(size) && size >= 0 ? size : ProgressGeometry.DefaultSize;
        }
    }

    private static DependencyProperty Register(
        string name,
        System.Type type,
        object? defaultValue,
        Action<LoaderKitProgress, DependencyPropertyChangedEventArgs>? changed) =>
        DependencyProperty.Register(
            name,
            type,
            typeof(LoaderKitProgress),
            new PropertyMetadata(defaultValue, changed is null ? null : (d, args) => changed((LoaderKitProgress)d, args)));

    private static void Reconfigure(LoaderKitProgress control, DependencyPropertyChangedEventArgs args) => control.Reconfigure();

    private static double? Clean(double? value) => value is { } v && double.IsNaN(v) ? null : value;

    private static double Now() => Stopwatch.GetTimestamp() / (double)Stopwatch.Frequency;

    private void Reconfigure()
    {
        var previous = _resolved;
        _resolved = new ResolvedProgress(new ProgressOptions
        {
            Type = Type,
            Variant = Variant,
            Thickness = Thickness,
            TrackGap = TrackGap,
            Segments = Segments,
            ShowLabel = ShowLabel,
            StopIndicator = StopIndicator,
            StrokeCap = StrokeCap,
            Amplitude = Amplitude,
            Wavelength = Wavelength,
            WaveSpeed = WaveSpeed,
            SweepAngle = SweepAngle,
            CornerRadius = ProgressCornerRadius,
            Speed = Speed,
        });
        if (_resolved.Type != previous.Type || _resolved.LinearHeight != previous.LinearHeight || _resolved.ContentInset != previous.ContentInset)
        {
            UpdateChildLayout();
            InvalidateMeasure();
        }
        UpdateClock();
        Redraw();
    }

    private void UpdateChildLayout()
    {
        var border = _resolved.Type == ProgressType.Border;
        _childHost.Margin = new Microsoft.UI.Xaml.Thickness(_resolved.ContentInset);
        _childHost.HorizontalAlignment = border ? HorizontalAlignment.Stretch : HorizontalAlignment.Center;
        _childHost.VerticalAlignment = border ? VerticalAlignment.Stretch : VerticalAlignment.Center;
    }

    private void OnValueChanged(DependencyPropertyChangedEventArgs args)
    {
        var previous = Clean((double?)args.OldValue);
        var next = Clean((double?)args.NewValue);
        if (previous == next) return;
        _animator.SetValue(next, Now(), Glides);
        UpdateClock();
        Redraw();
        if ((previous is null) != (next is null))
        {
            // Determinate and indeterminate expose different patterns.
            FrameworkElementAutomationPeer.FromElement(this)?.InvalidatePeer();
        }
        else if (FrameworkElementAutomationPeer.FromElement(this) is LoaderKitProgressAutomationPeer peer
            && AutomationPeer.ListenerExists(AutomationEvents.PropertyChanged))
        {
            peer.RaisePropertyChangedEvent(RangeValuePatternIdentifiers.ValueProperty, Percent(previous), Percent(next));
        }
    }

    private void OnBufferChanged()
    {
        _animator.SetBuffer(Clean(Buffer), Now(), Glides);
        UpdateClock();
        Redraw();
    }

    // Values set before the control is shown, such as a XAML literal, start in place.
    private bool Glides => Smooth && !ReducesMotion && IsLoaded;

    private static double Percent(double? value) => Math.Floor(Math.Min(1, Math.Max(0, value ?? 0)) * 100 + 0.5);

    private void OnLoaded(object sender, RoutedEventArgs e)
    {
        if (_canvas is null)
        {
            _canvas = new CanvasControl { IsHitTestVisible = false };
            _canvas.Draw += _drawHandler;
            _root.Children.Insert(0, _canvas);
        }
        _uiSettings ??= new UISettings();
        if (!_listensToSettings && OperatingSystem.IsWindowsVersionAtLeast(10, 0, 19041))
        {
            _uiSettings.AnimationsEnabledChanged += _animationsHandler;
            _listensToSettings = true;
        }
        UpdateClock();
        Redraw();
    }

    private void OnUnloaded(object sender, RoutedEventArgs e)
    {
        if (IsLoaded) return;
        if (_listensToSettings && _uiSettings is not null && OperatingSystem.IsWindowsVersionAtLeast(10, 0, 19041))
        {
            _uiSettings.AnimationsEnabledChanged -= _animationsHandler;
            _listensToSettings = false;
        }
        if (_canvas is not null)
        {
            // Win2D keeps its device and the Draw handler alive until the canvas leaves the tree this way.
            _canvas.Draw -= _drawHandler;
            _canvas.RemoveFromVisualTree();
            _root.Children.Remove(_canvas);
            _canvas = null;
        }
        UpdateClock();
    }

    private void OnAnimationsEnabledChanged(UISettings sender, UISettingsAnimationsEnabledChangedEventArgs args) =>
        DispatcherQueue.TryEnqueue(() =>
        {
            UpdateClock();
            Redraw();
        });

    private void Redraw() => _canvas?.Invalidate();

    private void UpdateClock()
    {
        var wanted = _canvas is not null && Visibility == Visibility.Visible && Moving;
        if (wanted == _receivesFrames) return;
        _receivesFrames = wanted;
        _lastFrameTime = null;
        if (wanted) CompositionTarget.Rendering += _renderingHandler;
        else CompositionTarget.Rendering -= _renderingHandler;
    }

    private void OnRendering(object? sender, object e)
    {
        if (e is RenderingEventArgs args)
        {
            var now = args.RenderingTime;
            if (_lastFrameTime is { } last && now > last)
            {
                // A long pause (the window minimized) should not fast-forward the animation.
                _animator.Step(Math.Min(0.1, (now - last).TotalSeconds), _resolved.Speed, ReducesMotion);
            }
            _lastFrameTime = now;
        }
        Redraw();
        UpdateClock();
    }

    private void OnDraw(CanvasControl sender, CanvasDrawEventArgs args)
    {
        var drawing = ProgressGeometry.Commands(_resolved, _animator.State, sender.ActualWidth, sender.ActualHeight);
        new ProgressRenderer(args.DrawingSession, ResolveColor(), TrackColor, ResolveLabelColor()).Draw(drawing);
    }

    private Color ResolveColor()
    {
        if (Color is { } color) return color;
        if (Application.Current?.Resources is { } resources
            && resources.TryGetValue("SystemAccentColor", out var accent)
            && accent is Color system)
        {
            return system;
        }
        return FallbackAccent;
    }

    private Color ResolveLabelColor()
    {
        if (LabelColor is { } color) return color;
        if (Foreground is SolidColorBrush brush) return brush.Color;
        return ActualTheme == ElementTheme.Dark
            ? Windows.UI.Color.FromArgb(255, 255, 255, 255)
            : Windows.UI.Color.FromArgb(255, 0, 0, 0);
    }

    private sealed class LoaderKitProgressAutomationPeer : FrameworkElementAutomationPeer, IRangeValueProvider
    {
        private readonly LoaderKitProgress _owner;

        public LoaderKitProgressAutomationPeer(LoaderKitProgress owner)
            : base(owner)
        {
            _owner = owner;
        }

        public double Value => Percent(Clean(_owner.Value));

        public double Minimum => 0;

        public double Maximum => 100;

        public double SmallChange => 0;

        public double LargeChange => 0;

        public bool IsReadOnly => true;

        public void SetValue(double value) => throw new InvalidOperationException("The value of a progress indicator is read only.");

        protected override AutomationControlType GetAutomationControlTypeCore() => AutomationControlType.ProgressBar;

        protected override string GetClassNameCore() => nameof(LoaderKitProgress);

        protected override string GetNameCore()
        {
            var name = base.GetNameCore();
            return string.IsNullOrEmpty(name) ? "Loading" : name;
        }

        protected override object? GetPatternCore(PatternInterface patternInterface) =>
            patternInterface == PatternInterface.RangeValue && Clean(_owner.Value) is not null
                ? this
                : base.GetPatternCore(patternInterface);
    }
}
