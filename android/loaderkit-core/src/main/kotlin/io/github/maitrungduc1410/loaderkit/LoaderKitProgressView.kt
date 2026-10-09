package io.github.maitrungduc1410.loaderkit

import android.content.Context
import android.database.ContentObserver
import android.graphics.Canvas
import android.graphics.Color
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import android.util.AttributeSet
import android.view.Choreographer
import android.view.View
import android.view.ViewGroup
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.ProgressBar
import androidx.annotation.ColorInt
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * A progress indicator: linear, circular, pie, gauge, liquid, border, bars, grid, battery or hourglass.
 *
 * Set [value] to a number in [0, 1], or null for the indeterminate animation. With [smooth] on, a
 * new value is reached along a curve that follows the rhythm of the updates and never passes the
 * real value. Children are centered over circular, pie and gauge (a stop button, for example), and
 * framed by border, whose size comes from them. Bad numbers never throw: they take the defaults.
 */
public class LoaderKitProgressView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : ViewGroup(context, attrs, defStyleAttr) {

    private val renderer = ProgressRenderer()
    private var animator = ProgressAnimator()
    private var options = ProgressOptions()
    private var resolved = ResolvedProgress()

    @ColorInt
    private val defaultColor: Int

    @ColorInt
    private val defaultLabelColor: Int

    private var lastFrameNanos = 0L
    private var clockRunning = false
    private var announcedLabel: String? = null
    private var attached = false
    private var shown = false
    private var systemReducesMotion = false
    private var suspended = false

    private val frameCallback = Choreographer.FrameCallback(::onFrame)
    private val motionObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
        override fun onChange(selfChange: Boolean) = refreshSystemMotion()
    }

    /** Progress in [0, 1]; null or NaN shows the indeterminate animation. Out of range values are clamped. */
    public var value: Double? = null
        set(value) {
            val next = value?.takeUnless { it.isNaN() }
            if (field == next) return
            field = next
            animator.setValue(next, now(), smooth && !reducesMotion)
            updateAccessibility()
            changed()
        }

    /** Buffer of linear flat and wavy, in [0, 1]; null draws none. */
    public var buffer: Double? = null
        set(value) {
            val next = value?.takeUnless { it.isNaN() }
            if (field == next) return
            field = next
            animator.setBuffer(next, now(), smooth && !reducesMotion)
            changed()
        }

    /** Move to a new value along a curve rather than jump to it. */
    public var smooth: Boolean = true

    public var type: ProgressType?
        get() = options.type
        set(value) = configure(options.copy(type = value))

    public var variant: ProgressVariant?
        get() = options.variant
        set(value) = configure(options.copy(variant = value))

    /** Width of strokes and bars in dp; null takes the default of the type and variant. */
    public var thickness: Double?
        get() = options.thickness
        set(value) = configure(options.copy(thickness = value))

    /** Space between the progress and the track, or between segments, in dp. */
    public var trackGap: Double?
        get() = options.trackGap
        set(value) = configure(options.copy(trackGap = value))

    /** Number of segments, dots, ticks, steps, bars or grid columns. */
    public var segments: Int?
        get() = options.segments?.toInt()
        set(value) = configure(options.copy(segments = value?.toDouble()))

    public var showLabel: Boolean
        get() = resolved.showLabel
        set(value) = configure(options.copy(showLabel = value))

    /** Dot at the end of the track of linear flat and wavy. */
    public var stopIndicator: Boolean
        get() = resolved.stopIndicator
        set(value) = configure(options.copy(stopIndicator = value))

    public var strokeCap: ProgressStrokeCap
        get() = resolved.strokeCap
        set(value) = configure(options.copy(strokeCap = value))

    /** Wave amplitude of wavy, in dp. */
    public var amplitude: Double?
        get() = options.amplitude
        set(value) = configure(options.copy(amplitude = value))

    /** Wave length of wavy, in dp. */
    public var wavelength: Double?
        get() = options.wavelength
        set(value) = configure(options.copy(wavelength = value))

    /** Wave travel in wavelengths per second. */
    public var waveSpeed: Double?
        get() = options.waveSpeed
        set(value) = configure(options.copy(waveSpeed = value))

    /** Arc of gauge, in degrees. */
    public var sweepAngle: Double?
        get() = options.sweepAngle
        set(value) = configure(options.copy(sweepAngle = value))

    /** Corner radius of border, in dp. */
    public var cornerRadius: Double?
        get() = options.cornerRadius
        set(value) = configure(options.copy(cornerRadius = value))

    /** Playback rate of the indeterminate animation; zero or negative values pause it, non-finite ones take 1. */
    public var speed: Double?
        get() = options.speed
        set(value) = configure(options.copy(speed = value))

    /**
     * Diameter in dp of every type but linear and border for `wrap_content`, and the width of linear
     * when the parent leaves it unbounded.
     */
    public var size: Double = ProgressGeometry.DEFAULT_SIZE
        set(value) {
            val next = if (value.isFinite() && value >= 0) value else ProgressGeometry.DEFAULT_SIZE
            if (field == next) return
            field = next
            requestLayout()
        }

    @get:ColorInt
    public var color: Int
        get() = renderer.color
        set(@ColorInt value) {
            renderer.color = value
            invalidate()
        }

    /** The track color; null draws the track in [color] at 24% opacity. */
    @get:ColorInt
    public var trackColor: Int?
        get() = renderer.trackColor
        set(@ColorInt value) {
            renderer.trackColor = value
            invalidate()
        }

    @get:ColorInt
    public var labelColor: Int
        get() = renderer.labelColor
        set(@ColorInt value) {
            renderer.labelColor = value
            invalidate()
        }

    /** When true and the system has animations turned off, values jump, ambient motion stops and the indeterminate animation slows down. */
    public var respectsReduceMotion: Boolean = true
        set(value) {
            if (field == value) return
            field = value
            changed()
        }

    /** The options with every default applied. */
    public val resolvedOptions: ResolvedProgress get() = resolved

    init {
        setWillNotDraw(false)
        // obtainStyledAttributes needs the attributes in ascending order.
        val theme = context.obtainStyledAttributes(intArrayOf(android.R.attr.textColorPrimary, android.R.attr.colorAccent))
        try {
            defaultLabelColor = theme.getColor(0, Color.BLACK)
            defaultColor = theme.getColor(1, Color.BLACK)
        } finally {
            theme.recycle()
        }
        renderer.color = defaultColor
        renderer.labelColor = defaultLabelColor
        val a = context.obtainStyledAttributes(attrs, R.styleable.LoaderKitProgressView, defStyleAttr, 0)
        suspended = true
        try {
            val density = resources.displayMetrics.density
            fun dimension(index: Int): Double? = if (a.hasValue(index)) a.getDimension(index, 0f).toDouble() / density else null
            fun float(index: Int): Double? = if (a.hasValue(index)) a.getFloat(index, 0f).toDouble() else null
            fun flag(index: Int): Boolean? = if (a.hasValue(index)) a.getBoolean(index, false) else null
            options = ProgressOptions(
                type = ProgressType.of(a.getString(R.styleable.LoaderKitProgressView_progressType)),
                variant = ProgressVariant.of(a.getString(R.styleable.LoaderKitProgressView_progressVariant)),
                thickness = dimension(R.styleable.LoaderKitProgressView_progressThickness),
                trackGap = dimension(R.styleable.LoaderKitProgressView_progressTrackGap),
                segments = if (a.hasValue(R.styleable.LoaderKitProgressView_progressSegments)) {
                    a.getInt(R.styleable.LoaderKitProgressView_progressSegments, 0).toDouble()
                } else {
                    null
                },
                showLabel = flag(R.styleable.LoaderKitProgressView_progressShowLabel),
                stopIndicator = flag(R.styleable.LoaderKitProgressView_progressStopIndicator),
                strokeCap = ProgressStrokeCap.of(a.getString(R.styleable.LoaderKitProgressView_progressStrokeCap)),
                amplitude = dimension(R.styleable.LoaderKitProgressView_progressAmplitude),
                wavelength = dimension(R.styleable.LoaderKitProgressView_progressWavelength),
                waveSpeed = float(R.styleable.LoaderKitProgressView_progressWaveSpeed),
                sweepAngle = float(R.styleable.LoaderKitProgressView_progressSweepAngle),
                cornerRadius = dimension(R.styleable.LoaderKitProgressView_progressCornerRadius),
                speed = float(R.styleable.LoaderKitProgressView_speed),
            )
            resolved = ResolvedProgress(options)
            float(R.styleable.LoaderKitProgressView_progressValue)?.let { value = it }
            float(R.styleable.LoaderKitProgressView_progressBuffer)?.let { buffer = it }
            smooth = a.getBoolean(R.styleable.LoaderKitProgressView_progressSmooth, true)
            respectsReduceMotion = a.getBoolean(R.styleable.LoaderKitProgressView_progressRespectsReduceMotion, true)
            if (a.hasValue(R.styleable.LoaderKitProgressView_progressSize)) {
                size = dimension(R.styleable.LoaderKitProgressView_progressSize)!!
            }
            color = a.getColor(R.styleable.LoaderKitProgressView_progressColor, defaultColor)
            if (a.hasValue(R.styleable.LoaderKitProgressView_progressTrackColor)) {
                trackColor = a.getColor(R.styleable.LoaderKitProgressView_progressTrackColor, 0)
            }
            labelColor = a.getColor(R.styleable.LoaderKitProgressView_progressLabelColor, defaultLabelColor)
        } finally {
            a.recycle()
            suspended = false
        }
        animator = ProgressAnimator(value, buffer)
        updateAccessibility()
    }

    /** Sets every drawing option at once; null options take their defaults. */
    public fun configure(options: ProgressOptions) {
        if (options == this.options) return
        val previous = resolved
        this.options = options
        resolved = ResolvedProgress(options)
        if (suspended) return
        if (resolved.type != previous.type || resolved.linearHeight != previous.linearHeight ||
            resolved.contentInset != previous.contentInset
        ) {
            requestLayout()
        }
        changed()
    }

    /** Restores every property to its default, e.g. before a view is reused. */
    public fun reset() {
        suspended = true
        try {
            value = null
            buffer = null
            smooth = true
            size = ProgressGeometry.DEFAULT_SIZE
            color = defaultColor
            trackColor = null
            labelColor = defaultLabelColor
            respectsReduceMotion = true
        } finally {
            suspended = false
        }
        animator = ProgressAnimator()
        configure(ProgressOptions())
        requestLayout()
        changed()
    }

    private val reducesMotion: Boolean get() = respectsReduceMotion && systemReducesMotion

    private val moving: Boolean
        get() {
            val speed = resolved.speed
            return animator.moving || (animator.indeterminate && speed > 0 && speed.isFinite()) ||
                (resolved.hasAmbientMotion(animator.state) && !reducesMotion)
        }

    private fun now(): Double = SystemClock.uptimeMillis() / 1000.0

    private fun changed() {
        if (suspended) return
        updateClock()
        invalidate()
    }

    private fun updateClock() {
        val run = attached && shown && moving
        if (run == clockRunning) return
        clockRunning = run
        lastFrameNanos = 0L
        val choreographer = Choreographer.getInstance()
        if (run) choreographer.postFrameCallback(frameCallback) else choreographer.removeFrameCallback(frameCallback)
    }

    private fun onFrame(frameTimeNanos: Long) {
        if (!clockRunning) return
        if (lastFrameNanos != 0L) {
            // A long pause (the app in the background) should not fast-forward the animation.
            val dt = min(0.1, (frameTimeNanos - lastFrameNanos) / 1e9)
            animator.step(dt, resolved.speed, reducesMotion)
        }
        lastFrameNanos = frameTimeNanos
        invalidate()
        if (moving) {
            Choreographer.getInstance().postFrameCallback(frameCallback)
        } else {
            clockRunning = false
        }
    }

    private fun refreshSystemMotion() {
        val reduces = systemReducesMotion(context)
        if (reduces == systemReducesMotion) return
        systemReducesMotion = reduces
        changed()
    }

    private fun updateAccessibility() {
        val label = value?.let { ProgressGeometry.label(it) }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            stateDescription = label
        } else if (label != announcedLabel) {
            // Before stateDescription, ProgressBar announces its progress with this event.
            announcedLabel = label
            if (label != null) sendAccessibilityEvent(AccessibilityEvent.TYPE_VIEW_SELECTED)
        }
    }

    override fun shouldDelayChildPressedState(): Boolean = false

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        attached = true
        context.contentResolver.registerContentObserver(
            Settings.Global.getUriFor(Settings.Global.ANIMATOR_DURATION_SCALE),
            false,
            motionObserver,
        )
        systemReducesMotion = systemReducesMotion(context)
        shown = isShown
        updateClock()
    }

    override fun onDetachedFromWindow() {
        attached = false
        shown = false
        context.contentResolver.unregisterContentObserver(motionObserver)
        updateClock()
        super.onDetachedFromWindow()
    }

    override fun onVisibilityAggregated(isVisible: Boolean) {
        super.onVisibilityAggregated(isVisible)
        shown = isVisible
        updateClock()
    }

    private fun px(dp: Double): Int = (dp * resources.displayMetrics.density).roundToInt()

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val inset = px(resolved.contentInset)
        val horizontal = paddingLeft + paddingRight + 2 * inset
        val vertical = paddingTop + paddingBottom + 2 * inset
        var childWidth = 0
        var childHeight = 0
        for (i in 0 until childCount) {
            val child = getChildAt(i)
            if (child.visibility == View.GONE) continue
            measureChild(child, widthMeasureSpec, heightMeasureSpec, horizontal, vertical)
            childWidth = max(childWidth, child.measuredWidth)
            childHeight = max(childHeight, child.measuredHeight)
        }
        val width: Int
        val height: Int
        when (resolved.type) {
            ProgressType.Linear -> {
                // Like a horizontal ProgressBar, wrap_content takes the room it is offered.
                width = if (MeasureSpec.getMode(widthMeasureSpec) == MeasureSpec.UNSPECIFIED) {
                    px(size) + horizontal
                } else {
                    MeasureSpec.getSize(widthMeasureSpec)
                }
                height = px(resolved.linearHeight) + vertical
            }
            ProgressType.Border -> {
                width = childWidth + horizontal
                height = childHeight + vertical
            }
            else -> {
                val ratio = (resolved.intrinsicHeight ?: size) / (resolved.intrinsicWidth ?: size)
                width = max(px(size), childWidth) + horizontal
                height = max(px(size * ratio), childHeight) + vertical
            }
        }
        setMeasuredDimension(
            resolveSize(max(width, suggestedMinimumWidth), widthMeasureSpec),
            resolveSize(max(height, suggestedMinimumHeight), heightMeasureSpec),
        )
    }

    private fun measureChild(child: View, widthSpec: Int, heightSpec: Int, horizontal: Int, vertical: Int) {
        val params = child.layoutParams
        child.measure(
            getChildMeasureSpec(widthSpec, horizontal, params.width),
            getChildMeasureSpec(heightSpec, vertical, params.height),
        )
    }

    override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
        val inset = px(resolved.contentInset)
        val left = paddingLeft + inset
        val top = paddingTop + inset
        val right = r - l - paddingRight - inset
        val bottom = b - t - paddingBottom - inset
        for (i in 0 until childCount) {
            val child = getChildAt(i)
            if (child.visibility == View.GONE) continue
            val x = left + (right - left - child.measuredWidth) / 2
            val y = top + (bottom - top - child.measuredHeight) / 2
            child.layout(x, y, x + child.measuredWidth, y + child.measuredHeight)
        }
    }

    override fun generateDefaultLayoutParams(): LayoutParams = LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT)

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val density = resources.displayMetrics.density
        val width = (this.width - paddingLeft - paddingRight) / density
        val height = (this.height - paddingTop - paddingBottom) / density
        if (width <= 0f || height <= 0f) return
        val drawing = ProgressGeometry.commands(resolved, animator.state, width.toDouble(), height.toDouble())
        renderer.draw(canvas, drawing, paddingLeft.toFloat(), paddingTop.toFloat(), density)
    }

    override fun getAccessibilityClassName(): CharSequence = ProgressBar::class.java.name

    override fun onInitializeAccessibilityNodeInfo(info: AccessibilityNodeInfo) {
        super.onInitializeAccessibilityNodeInfo(info)
        val current = value ?: return
        val percent = (min(1.0, max(0.0, current)) * 100).toFloat()
        val type = AccessibilityNodeInfo.RangeInfo.RANGE_TYPE_PERCENT
        info.rangeInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            AccessibilityNodeInfo.RangeInfo(type, 0f, 100f, percent)
        } else {
            rangeInfo(type, percent)
        }
    }

    @Suppress("DEPRECATION")
    private fun rangeInfo(type: Int, percent: Float) = AccessibilityNodeInfo.RangeInfo.obtain(type, 0f, 100f, percent)
}
