package io.github.maitrungduc1410.loaderkit

import android.content.Context
import android.database.ContentObserver
import android.graphics.Canvas
import android.graphics.Color
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.AttributeSet
import android.util.Log
import android.util.TypedValue
import android.view.Choreographer
import android.view.View
import android.widget.ProgressBar
import androidx.annotation.ColorInt
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * A view that draws a LoaderKit indicator.
 *
 * Every property can be set on its own, in any order, and [reset] restores the defaults so a
 * view can be recycled. The indicator is the custom [spec] when one is set, otherwise the
 * built-in named [indicator]. Problems with either are reported to [onError] (or logged) and the
 * view draws nothing; it never throws for bad input.
 */
public class LoaderKitView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : View(context, attrs, defStyleAttr) {

    private val renderer = IndicatorRenderer()

    @ColorInt
    private val defaultColor: Int = themeForegroundColor(context)

    private var prepared: PreparedIndicator? = null
    private var customSpec: IndicatorSpec? = null
    private var specJson: String? = null
    private var specError: InvalidIndicatorSpecException? = null
    private var reloadSuspended = false

    private var time = 0.0
    private var lastFrameNanos = 0L
    private var clockRunning = false
    private var attached = false
    private var shown = false
    private var systemReducesMotion = false

    private val frameCallback = Choreographer.FrameCallback(::onFrame)
    private val motionObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
        override fun onChange(selfChange: Boolean) = refreshSystemMotion()
    }

    /** Name of the built-in indicator to draw when no [spec] is set. See [BuiltinIndicators.names]. */
    public var indicator: String? = DEFAULT_INDICATOR
        set(value) {
            if (field == value) return
            field = value
            if (customSpec == null && specError == null) reload()
        }

    /** A custom spec. It takes precedence over [indicator]; set null to go back to it. */
    public var spec: IndicatorSpec?
        get() = customSpec
        set(value) {
            specJson = null
            updateCustomSpec(value, null)
        }

    /** Param overrides by name. Names the spec does not declare are ignored. */
    public var params: Map<String, Double> = emptyMap()
        set(value) {
            if (field == value) return
            field = value.toMap()
            reload()
        }

    /** Color of every element, unless [colors] is set. */
    @get:ColorInt
    public var color: Int
        get() = renderer.color
        set(@ColorInt value) {
            if (renderer.color == value) return
            renderer.color = value
            invalidate()
        }

    /** Element `i` uses `colors[i % colors.size]`. Null or empty means every element uses [color]. */
    public var colors: IntArray?
        get() = renderer.colors?.copyOf()
        set(value) {
            renderer.colors = value?.copyOf()
            invalidate()
        }

    /** Playback rate; 1 is the speed of the spec. Zero, negative or non-finite values pause. */
    public var speed: Double = 1.0
        set(value) {
            field = value
            updateClock()
        }

    public var isAnimating: Boolean = true
        set(value) {
            if (field == value) return
            field = value
            updateClock()
            invalidate()
        }

    /** When true, the view draws nothing while [isAnimating] is false. */
    public var hidesWhenStopped: Boolean = true
        set(value) {
            if (field == value) return
            field = value
            invalidate()
        }

    /**
     * A frozen point of the animation cycle in [0, 1], not the progress of a task. Null follows
     * the clock; clearing it resumes where the clock was.
     */
    public var cycleProgress: Double? = null
        set(value) {
            val cycleProgress = value?.takeUnless { it.isNaN() }
            if (field == cycleProgress) return
            field = cycleProgress
            updateClock()
            invalidate()
        }

    /** When true, the view shows a still frame while the system has animations turned off. */
    public var respectsReduceMotion: Boolean = true
        set(value) {
            if (field == value) return
            field = value
            updateClock()
            invalidate()
        }

    /** Called with the problems of a spec, a JSON spec, an indicator name or params that cannot be drawn. */
    public var onError: ((InvalidIndicatorSpecException) -> Unit)? = null

    init {
        renderer.color = defaultColor
        val a = context.obtainStyledAttributes(attrs, R.styleable.LoaderKitView, defStyleAttr, 0)
        reloadSuspended = true
        try {
            a.getString(R.styleable.LoaderKitView_indicator)?.let { indicator = it }
            color = a.getColor(R.styleable.LoaderKitView_indicatorColor, defaultColor)
            speed = a.getFloat(R.styleable.LoaderKitView_speed, 1f).toDouble()
            hidesWhenStopped = a.getBoolean(R.styleable.LoaderKitView_hidesWhenStopped, true)
            if (a.hasValue(R.styleable.LoaderKitView_cycleProgress)) {
                cycleProgress = a.getFloat(R.styleable.LoaderKitView_cycleProgress, 0f).toDouble()
            }
        } finally {
            a.recycle()
            reloadSuspended = false
        }
        reload()
    }

    /** Sets [spec] from JSON. Invalid JSON is reported to [onError] and draws nothing; null clears the spec. */
    public fun setSpecJson(json: String?) {
        if (json == null) {
            spec = null
            return
        }
        if (json == specJson) return
        specJson = json
        try {
            updateCustomSpec(IndicatorSpec.parse(json), null)
        } catch (error: InvalidIndicatorSpecException) {
            updateCustomSpec(null, error)
        }
    }

    public fun start() {
        isAnimating = true
    }

    public fun stop() {
        isAnimating = false
    }

    /** Restores every property to its default and restarts the clock, e.g. before a view is reused. */
    public fun reset() {
        reloadSuspended = true
        try {
            spec = null
            indicator = DEFAULT_INDICATOR
            params = emptyMap()
            color = defaultColor
            colors = null
            speed = 1.0
            isAnimating = true
            hidesWhenStopped = true
            cycleProgress = null
            respectsReduceMotion = true
        } finally {
            reloadSuspended = false
        }
        reload()
    }

    private fun updateCustomSpec(spec: IndicatorSpec?, error: InvalidIndicatorSpecException?) {
        if (spec == customSpec && error == null && specError == null) return
        customSpec = spec
        specError = error
        reload()
    }

    private fun reload() {
        if (reloadSuspended) return
        prepared = try {
            specError?.let { throw it }
            val spec = customSpec ?: indicator?.let(BuiltinIndicators::require)
            spec?.let { PreparedIndicator(it, params) }
        } catch (error: InvalidIndicatorSpecException) {
            report(error)
            null
        }
        time = 0.0
        lastFrameNanos = 0L
        updateClock()
        invalidate()
    }

    private fun report(error: InvalidIndicatorSpecException) {
        val listener = onError
        if (listener != null) listener(error) else Log.w(TAG, error.message.orEmpty())
    }

    internal val clockTime: Double get() = time

    private val reducesMotion: Boolean get() = respectsReduceMotion && systemReducesMotion

    private fun updateClock() {
        val run = attached && shown && isAnimating && cycleProgress == null && prepared != null &&
            speed.isFinite() && speed > 0 && !reducesMotion
        if (run == clockRunning) return
        clockRunning = run
        lastFrameNanos = 0L
        val choreographer = Choreographer.getInstance()
        if (run) choreographer.postFrameCallback(frameCallback) else choreographer.removeFrameCallback(frameCallback)
    }

    private fun onFrame(frameTimeNanos: Long) {
        if (!clockRunning) return
        if (lastFrameNanos != 0L) time += (frameTimeNanos - lastFrameNanos) / 1e9 * speed
        lastFrameNanos = frameTimeNanos
        invalidate()
        Choreographer.getInstance().postFrameCallback(frameCallback)
    }

    private fun refreshSystemMotion() {
        val reduces = systemReducesMotion(context)
        if (reduces == systemReducesMotion) return
        systemReducesMotion = reduces
        updateClock()
        invalidate()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        attached = true
        context.contentResolver.registerContentObserver(
            Settings.Global.getUriFor(Settings.Global.ANIMATOR_DURATION_SCALE),
            false,
            motionObserver,
        )
        systemReducesMotion = systemReducesMotion(context)
        // Like ProgressBar: start on attach, then follow onVisibilityAggregated, which the
        // framework only sends at attach time once the window is visible.
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

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val intrinsic = (DEFAULT_SIZE_DP * resources.displayMetrics.density).roundToInt()
        setMeasuredDimension(
            resolveSize(max(suggestedMinimumWidth, intrinsic + paddingLeft + paddingRight), widthMeasureSpec),
            resolveSize(max(suggestedMinimumHeight, intrinsic + paddingTop + paddingBottom), heightMeasureSpec),
        )
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val indicator = prepared ?: return
        if (hidesWhenStopped && !isAnimating) return
        val contentWidth = width - paddingLeft - paddingRight
        val contentHeight = height - paddingTop - paddingBottom
        val size = min(contentWidth, contentHeight).toFloat()
        if (size <= 0f) return
        val t = cycleProgress?.let { indicator.timeForCycleProgress(it) }
            ?: if (reducesMotion) indicator.timeForCycleProgress(0.0) else time
        renderer.draw(
            canvas,
            indicator,
            t,
            paddingLeft + (contentWidth - size) / 2,
            paddingTop + (contentHeight - size) / 2,
            size,
        )
    }

    override fun getAccessibilityClassName(): CharSequence = ProgressBar::class.java.name

    public companion object {
        /** The built-in shown when no indicator is chosen. */
        public const val DEFAULT_INDICATOR: String = "BallPulse"

        /** Width and height used for `wrap_content`, in dp. */
        public const val DEFAULT_SIZE_DP: Int = 40

        private const val TAG = "LoaderKitView"

        @ColorInt
        private fun themeForegroundColor(context: Context): Int {
            val value = TypedValue()
            val resolved = context.theme.resolveAttribute(android.R.attr.colorForeground, value, true)
            return if (resolved && value.type in TypedValue.TYPE_FIRST_COLOR_INT..TypedValue.TYPE_LAST_COLOR_INT) {
                value.data
            } else {
                Color.BLACK
            }
        }
    }
}
