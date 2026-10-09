package io.github.maitrungduc1410.loaderkit

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt

/** Options with every default applied and every number made safe to draw with. */
public class ResolvedProgress(options: ProgressOptions = ProgressOptions()) {
    public val type: ProgressType = options.type ?: ProgressType.Circular
    public val variant: ProgressVariant = options.variant?.takeIf { it in type.variants } ?: type.variants[0]
    public val thickness: Double
    public val trackGap: Double
    public val segments: Int
    public val showLabel: Boolean = options.showLabel ?: false
    public val stopIndicator: Boolean = options.stopIndicator ?: true
    public val strokeCap: ProgressStrokeCap = options.strokeCap ?: ProgressStrokeCap.Round
    public val amplitude: Double
    public val wavelength: Double
    public val waveSpeed: Double

    /** Radians. */
    public val sweepAngle: Double
    public val cornerRadius: Double
    public val speed: Double

    init {
        val key = "${type.key}:${variant.key}"
        val linear = type == ProgressType.Linear
        val segmentsDefault = SEGMENTS[key] ?: SEGMENTS[type.key] ?: 1.0
        val segmentsMin = if (key == "linear:steps") 2 else 1
        val segmentsMax = if (type == ProgressType.Grid) 16 else 64
        thickness = max(0.5, finite(options.thickness, THICKNESS[key] ?: THICKNESS[type.key] ?: 4.0))
        trackGap = max(0.0, finite(options.trackGap, 4.0))
        val rounded = floor(finite(options.segments, segmentsDefault) + 0.5)
        segments = rounded.coerceIn(segmentsMin.toDouble(), segmentsMax.toDouble()).toInt()
        amplitude = max(0.0, finite(options.amplitude, if (linear) 3.0 else 2.0))
        wavelength = max(MIN_WAVELENGTH, finite(options.wavelength, if (linear) 40.0 else 15.0))
        waveSpeed = finite(options.waveSpeed, 1.0)
        sweepAngle = finite(options.sweepAngle, 270.0).coerceIn(30.0, 350.0) * PI / 180
        cornerRadius = max(0.0, finite(options.cornerRadius, 12.0))
        speed = finite(options.speed, 1.0)
    }

    /** True when [segments] changes how this type and variant draw. */
    public val usesSegments: Boolean
        get() = SEGMENTS.containsKey("${type.key}:${variant.key}") || type == ProgressType.Bars || type == ProgressType.Grid

    /** True when a linear label sits inside the bar rather than after it. */
    public val labelInside: Boolean
        get() = type == ProgressType.Linear && showLabel && thickness >= 14 &&
            (variant == ProgressVariant.Flat || variant == ProgressVariant.Striped || variant == ProgressVariant.Shimmer)

    /**
     * True when the indicator moves even with a fixed value (waves, stripes, sheens, liquid). With a
     * state, a wave that has flattened out does not count.
     */
    public fun hasAmbientMotion(state: ProgressState? = null): Boolean {
        if (type == ProgressType.Liquid || variant == ProgressVariant.Striped || variant == ProgressVariant.Shimmer) return true
        return variant == ProgressVariant.Wavy && (state == null || state.wave > 0)
    }

    /** Height of a linear indicator, which takes its width from the layout. */
    public val linearHeight: Double
        get() {
            val t = thickness
            var height = when (variant) {
                ProgressVariant.Wavy -> t + 2 * amplitude + 4
                ProgressVariant.Glow -> t + 18
                ProgressVariant.Dots -> max(6.0, t * 2) * 2.3
                ProgressVariant.Steps -> 2 * max(7.0, t * 1.75) + 4
                ProgressVariant.Chevrons -> 2 * max(3.0, t * 1.5) + t + 4
                ProgressVariant.Ticks -> 2 * max(4.0, t * 2.5) + t + 4
                else -> t + 4
            }
            if (showLabel && !labelInside) height = max(height, 18.0)
            return ceil(height)
        }

    /** Width a layout gives the indicator when nothing else sizes it; null fills the width (linear) or wraps the content (border). */
    public val intrinsicWidth: Double?
        get() = if (type == ProgressType.Linear || type == ProgressType.Border) null else ProgressGeometry.DEFAULT_SIZE

    /** Height a layout gives the indicator when nothing else sizes it; null wraps the content (border). */
    public val intrinsicHeight: Double?
        get() = when (type) {
            ProgressType.Linear -> linearHeight
            ProgressType.Border -> null
            ProgressType.Bars -> ProgressGeometry.DEFAULT_SIZE * 0.75
            ProgressType.Battery -> ProgressGeometry.DEFAULT_SIZE / 2
            else -> ProgressGeometry.DEFAULT_SIZE
        }

    /** Padding between a border and its content, so the stroke does not cover it. */
    public val contentInset: Double
        get() = when {
            type != ProgressType.Border -> 0.0
            variant == ProgressVariant.Glow -> thickness + trackGap + BORDER_GLOW
            else -> thickness + trackGap
        }

    override fun equals(other: Any?): Boolean = other is ResolvedProgress && fields == other.fields

    override fun hashCode(): Int = fields.hashCode()

    private val fields: List<Any>
        get() = listOf(
            type, variant, thickness, trackGap, segments, showLabel, stopIndicator, strokeCap,
            amplitude, wavelength, waveSpeed, sweepAngle, cornerRadius, speed,
        )

    private companion object {
        val THICKNESS = mapOf(
            "linear:flat" to 4.0, "linear:wavy" to 4.0, "linear:segmented" to 6.0, "linear:striped" to 10.0,
            "linear:shimmer" to 8.0, "linear:glow" to 3.0, "linear:dots" to 4.0, "linear:steps" to 3.0,
            "linear:gradient" to 6.0, "linear:chevrons" to 3.0, "linear:ticks" to 2.0,
            "circular:gradient" to 5.0, "circular:ticks" to 3.0, "circular:orbit" to 3.0, "circular:dual" to 3.0,
            "gauge" to 6.0, "gauge:needle" to 3.0, "liquid" to 3.0, "border" to 3.0, "bars:arcs" to 4.0,
            "battery" to 3.0, "hourglass" to 3.0,
        )
        val SEGMENTS = mapOf(
            "linear:segmented" to 10.0, "linear:dots" to 8.0, "linear:steps" to 4.0, "linear:chevrons" to 12.0,
            "linear:ticks" to 24.0, "circular:segmented" to 12.0, "circular:ticks" to 12.0, "circular:dots" to 10.0,
            "gauge:segmented" to 10.0, "gauge:needle" to 10.0, "gauge:dots" to 12.0, "pie:segmented" to 8.0,
            "border:segmented" to 20.0, "bars" to 5.0, "bars:arcs" to 4.0, "grid" to 5.0, "battery:segmented" to 5.0,
        )

        fun finite(value: Double?, fallback: Double): Double = if (value != null && value.isFinite()) value else fallback
    }
}

/** Turns resolved options and an animation state into draw commands, the same on every platform. */
public object ProgressGeometry {
    /** Default width and height of every type that does not fill its container or wrap its content. */
    public const val DEFAULT_SIZE: Double = 48.0

    /** Room a linear label takes after the bar when it does not fit inside. */
    public const val LABEL_WIDTH: Double = 44.0

    /** The percentage text of the labels, rounded half up. */
    public fun label(value: Double): String = "${floor(clamp01(value) * 100 + 0.5).toInt()}%"

    /** Fill order of the grid cells: diagonal by diagonal from the top-left, top row first. */
    public fun gridOrder(columns: Int): IntArray {
        if (columns <= 0) return IntArray(0)
        val rank = IntArray(columns * columns)
        var next = 0
        for (d in 0..2 * (columns - 1)) {
            for (r in max(0, d - columns + 1)..min(d, columns - 1)) rank[r * columns + (d - r)] = next++
        }
        return rank
    }

    /**
     * The draw commands for [p] in a [width] x [height] box. Linear and border fill the box; bars keep a
     * 4:3 shape, battery 2:1 and the other types a square, centered in the box.
     */
    public fun commands(p: ResolvedProgress, s: ProgressState, width: Double, height: Double): ProgressDrawing {
        val b = Builder(p, s)
        if (!(width > 0) || !(height > 0) || width.isInfinite() || height.isInfinite()) return ProgressDrawing(0.0, 0.0, b.out)
        return when (p.type) {
            ProgressType.Linear -> {
                b.linearAny(width, height)
                ProgressDrawing(0.0, 0.0, b.out)
            }
            ProgressType.Border -> {
                b.border(width, height)
                ProgressDrawing(0.0, 0.0, b.out)
            }
            ProgressType.Bars -> {
                val w = min(width, height * 4 / 3)
                val h = w * 3 / 4
                b.bars(w, h)
                ProgressDrawing((width - w) / 2, (height - h) / 2, b.out)
            }
            ProgressType.Battery -> {
                val w = min(width, height * 2)
                val h = w / 2
                b.battery(w, h)
                ProgressDrawing((width - w) / 2, (height - h) / 2, b.out)
            }
            else -> {
                val size = min(width, height)
                when (p.type) {
                    ProgressType.Circular -> b.circularAny(size)
                    ProgressType.Pie -> b.pie(size)
                    ProgressType.Gauge -> b.gauge(size)
                    ProgressType.Liquid -> b.liquid(size)
                    ProgressType.Hourglass -> b.hourglass(size)
                    else -> b.grid(size)
                }
                ProgressDrawing((width - size) / 2, (height - size) / 2, b.out)
            }
        }
    }
}

private const val TAU = PI * 2
private const val TOP = -PI / 2
private const val MIN_WAVY_SIZE = 32.0

/** Room the glow of border glow takes outside its stroke. */
private const val BORDER_GLOW = 4.0

/** Half the height of the heart of [heartPoints], for a half width of 1. */
private const val HEART_HALF_HEIGHT = 14.5 / 16

/** Shorter waves alias: the wave is sampled every 2 units of length. */
private const val MIN_WAVELENGTH = 8.0
private val BOLT = doubleArrayOf(0.15, -1.0, -0.55, 0.12, -0.05, 0.12, -0.2, 1.0, 0.55, -0.15, 0.05, -0.15)

private fun clamp01(x: Double): Double = min(1.0, max(0.0, x))

/** [x] modulo [m], always in [0, m). */
private fun mod(x: Double, m: Double): Double = x - floor(x / m) * m

private fun roundHalfUp(x: Double): Double = floor(x + 0.5)

private fun steps(x: Double): Int = ceil(x - 1e-9).toInt()

private fun bump(d: Double, width: Double): Double {
    val x = abs(d) / width
    return if (x >= 1) 0.0 else 0.5 + 0.5 * cos(PI * x)
}

private fun emphasized(x: Double) = cubicBezier(0.2, 0.0, 0.0, 1.0, x)

private fun standard(x: Double) = cubicBezier(0.4, 0.0, 0.2, 1.0, x)

private fun easeInOut(x: Double) = cubicBezier(0.65, 0.0, 0.35, 1.0, x)

private fun solid(color: ProgressColorRole, alpha: Double = 1.0): ProgressPaint = ProgressPaint.Solid(color, alpha)

private fun rectClip(x: Double, y: Double, width: Double, height: Double, radius: Double): ProgressClipShape =
    ProgressClipShape.Rect(x, y, width, height, max(0.0, min(radius, min(width / 2, height / 2))))

private fun labelSize(size: Double): Double = max(10.0, min(size * 0.22, 44.0))

private fun sheen(x: Double, width: Double, color: ProgressColorRole, peak: Double): ProgressPaint = ProgressPaint.Linear(
    x, 0.0, x + width, 0.0,
    listOf(ProgressColorStop(0.0, color, 0.0), ProgressColorStop(0.5, color, peak), ProgressColorStop(1.0, color, 0.0)),
)

private fun fade(cx: Double, cy: Double, r: Double, alpha: Double): ProgressPaint = ProgressPaint.Radial(
    cx, cy, r,
    listOf(ProgressColorStop(0.0, ProgressColorRole.Color, alpha), ProgressColorStop(1.0, ProgressColorRole.Color, 0.0)),
)

/** Active segments of the indeterminate linear indicator, as (start, end) fractions of the track. */
private fun linearSegments(u: Double): List<Pair<Double, Double>> {
    val head1 = emphasized(clamp01(u / 0.55))
    val tail1 = standard(clamp01((u - 0.15) / 0.55))
    val head2 = emphasized(clamp01((u - 0.5) / 0.42))
    val tail2 = standard(clamp01((u - 0.62) / 0.38))
    val segments = ArrayList<Pair<Double, Double>>(2)
    if (head1 - tail1 > 0.002) segments.add(tail1 to head1)
    if (head2 - tail2 > 0.002) segments.add(tail2 to head2)
    // The second segment enters on the left while the first is still leaving on the right.
    if (segments.size == 2 && segments[1].first < segments[0].first) segments.reverse()
    return segments
}

/** Arc of the indeterminate circular indicator, as (start, end) angles clockwise from the top. */
private fun circularArc(time: Double): Pair<Double, Double> {
    val cycle = 1.4
    val k = floor(time / cycle)
    val u = mod(time / cycle, 1.0)
    val head = easeInOut(clamp01(u / 0.5)) * 0.72
    val tail = easeInOut(clamp01((u - 0.5) / 0.5)) * 0.72
    val base = mod(k * 0.72 + time / 2.2, 1.0)
    return (base + tail) * TAU to (base + head) * TAU + 0.12
}

/** A heart centered at [cx], [cy] and [half] wide on each side, clockwise from the notch at the top. */
private fun heartPoints(cx: Double, cy: Double, half: Double): List<Double> {
    val points = ArrayList<Double>(144)
    for (i in 0 until 72) {
        val a = i * TAU / 72
        val sa = sin(a)
        val y = (-13 * cos(a) + 5 * cos(2 * a) + 2 * cos(3 * a) + cos(4 * a) - 2.5) / 16
        points.add(cx + half * sa * sa * sa)
        points.add(cy + half * y)
    }
    return points
}

private class BorderPath(val points: List<Double>, val lengths: List<Double>, val total: Double)

private class Builder(private val p: ResolvedProgress, private val s: ProgressState) {
    val out = ArrayList<ProgressCommand>()

    private fun nested(body: Builder.() -> Unit): List<ProgressCommand> = Builder(p, s).apply(body).out

    // ---------- primitives ----------

    fun hLine(x0: Double, x1: Double, y: Double, lineWidth: Double, cap: ProgressStrokeCap, paint: ProgressPaint) {
        if (x1 < x0) return
        out.add(ProgressCommand.Line(x0, y, x1, y, lineWidth, cap, paint))
    }

    fun arc(cx: Double, cy: Double, r: Double, start: Double, end: Double, lineWidth: Double, cap: ProgressStrokeCap, paint: ProgressPaint) {
        if (end <= start || r <= 0) return
        out.add(ProgressCommand.Arc(cx, cy, r, start, end, lineWidth, cap, paint))
    }

    fun circle(cx: Double, cy: Double, r: Double, paint: ProgressPaint) {
        if (r <= 0) return
        out.add(ProgressCommand.Circle(cx, cy, r, paint))
    }

    fun rect(x: Double, y: Double, width: Double, height: Double, radius: Double, paint: ProgressPaint) {
        if (width <= 0 || height <= 0) return
        out.add(ProgressCommand.Rect(x, y, width, height, max(0.0, min(radius, min(width / 2, height / 2))), paint))
    }

    fun text(x: Double, y: Double, size: Double, value: String, right: Boolean, paint: ProgressPaint) {
        out.add(ProgressCommand.Text(x, y, size, value, right, paint))
    }

    /** The label in the text color, and again in white where [fill] covers it. */
    fun invertedLabel(value: String, x: Double, y: Double, size: Double, fill: ProgressClipShape) {
        text(x, y, size, value, false, solid(ProgressColorRole.Label))
        out.add(ProgressCommand.Clip(fill, listOf(ProgressCommand.Text(x, y, size, value, false, solid(ProgressColorRole.White)))))
    }

    fun wave(x0: Double, x1: Double, y: Double, amp: Double, wavelength: Double, phase: Double, lineWidth: Double, cap: ProgressStrokeCap, paint: ProgressPaint) {
        if (x1 < x0) return
        val n = max(1, steps((x1 - x0) / 2))
        val points = ArrayList<Double>(2 * n + 2)
        for (i in 0..n) {
            val x = x0 + (x1 - x0) * i / n
            points.add(x)
            points.add(y + amp * sin((x - phase) / wavelength * TAU))
        }
        out.add(ProgressCommand.Polyline(points, false, lineWidth, cap, paint))
    }

    fun wavyArc(
        cx: Double, cy: Double, r: Double, amp: Double, waves: Double, phase: Double, start: Double, end: Double,
        lineWidth: Double, cap: ProgressStrokeCap, paint: ProgressPaint,
    ) {
        if (end <= start) return
        val n = max(8, steps((end - start) * r / 1.5))
        val points = ArrayList<Double>(2 * n + 2)
        for (i in 0..n) {
            val a = start + (end - start) * i / n
            val rr = r + amp * sin(waves * a - phase)
            points.add(cx + rr * cos(a))
            points.add(cy + rr * sin(a))
        }
        out.add(ProgressCommand.Polyline(points, false, lineWidth, cap, paint))
    }

    // ---------- linear ----------

    fun linearAny(w: Double, h: Double) {
        val inside = p.labelInside
        val outside = p.showLabel && !inside
        // A bar narrower than 20 next to the label is unreadable, so the label is left out instead.
        val labelFits = !outside || w - ProgressGeometry.LABEL_WIDTH >= 20
        val barWidth = if (outside && labelFits) w - ProgressGeometry.LABEL_WIDTH else w
        when (p.variant) {
            ProgressVariant.Segmented -> linearSegmented(barWidth, h)
            ProgressVariant.Striped -> linearStriped(barWidth, h)
            ProgressVariant.Shimmer -> linearShimmer(barWidth, h)
            ProgressVariant.Glow -> linearGlow(barWidth, h)
            ProgressVariant.Dots -> linearDots(barWidth, h)
            ProgressVariant.Steps -> linearSteps(barWidth, h)
            ProgressVariant.Gradient -> linearGradient(barWidth, h)
            ProgressVariant.Center -> linearCenter(barWidth, h)
            ProgressVariant.Chevrons -> linearChevrons(barWidth, h)
            ProgressVariant.Ticks -> linearTicks(barWidth, h)
            else -> linear(barWidth, h)
        }
        if (s.indeterminate || !p.showLabel || !labelFits) return
        val label = ProgressGeometry.label(s.value)
        if (outside) {
            text(w, h / 2, 12.5, label, true, solid(ProgressColorRole.Label))
            return
        }
        val t = p.thickness
        val v = clamp01(s.value)
        val r = if (p.strokeCap == ProgressStrokeCap.Round) t / 2 else 0.0
        val filled = if (p.variant == ProgressVariant.Flat) (if (v > 0.0005) v * (w - 2 * r) + 2 * r else 0.0) else v * w
        invertedLabel(label, w / 2, h / 2, roundHalfUp(min(t * 0.6, 15.0)), rectClip(0.0, 0.0, filled, h, 0.0))
    }

    private fun linear(w: Double, h: Double) {
        val t = p.thickness
        val cap = p.strokeCap
        val r = if (cap == ProgressStrokeCap.Round) t / 2 else 0.0
        val cy = h / 2
        val x0 = r
        val x1 = w - r
        val len = x1 - x0
        val wavy = p.variant == ProgressVariant.Wavy
        val amp = if (wavy) p.amplitude * s.wave else 0.0
        val wavelength = p.wavelength
        val phase = mod(s.time * p.waveSpeed, 1.0) * wavelength
        val gap = p.trackGap + 2 * r
        val color = solid(ProgressColorRole.Color)
        val track = solid(ProgressColorRole.Track)
        fun active(a: Double, b: Double) {
            if (wavy && amp > 0.05) wave(x0 + a * len, x0 + b * len, cy, amp, wavelength, phase, t, cap, color)
            else hLine(x0 + a * len, x0 + b * len, cy, t, cap, color)
        }
        if (s.indeterminate) {
            var from = 0.0
            for ((a, b) in linearSegments(mod(s.indeterminateTime / 1.75, 1.0))) {
                val end = a * len - if (from == 0.0 && a == 0.0) 0.0 else gap
                if (end > from) hLine(x0 + from, x0 + end, cy, t, cap, track)
                from = b * len + gap
                active(a, b)
            }
            if (from < len) hLine(x0 + from, x1, cy, t, cap, track)
            return
        }
        val v = clamp01(s.value)
        var trackFrom = if (v > 0.0005) v * len + gap else 0.0
        if (s.buffer > 0) {
            val buffer = max(v, clamp01(s.buffer))
            if (buffer * len - trackFrom > 0.5) {
                hLine(x0 + trackFrom, x0 + buffer * len, cy, t, cap, solid(ProgressColorRole.Color, 0.5))
                trackFrom = buffer * len + gap
            }
        }
        if (trackFrom < len) hLine(x0 + trackFrom, x1, cy, t, cap, track)
        if (p.stopIndicator && trackFrom < len - t) circle(x1, cy, min(t, 4.0) / 2, color)
        if (v > 0.0005) active(0.0, v)
    }

    private fun linearSegmented(w: Double, h: Double) {
        val n = p.segments
        val t = p.thickness
        val y = h / 2 - t / 2
        val gap = max(2.0, p.trackGap)
        val width = (w - gap * (n - 1)) / n
        val radius = if (p.strokeCap == ProgressStrokeCap.Round) min(t / 2, width / 2) else 0.0
        val center = mod(s.indeterminateTime / 1.6, 1.0) * (n + 4) - 2
        for (i in 0 until n) {
            val x = i * (width + gap)
            rect(x, y, width, t, radius, solid(ProgressColorRole.Track))
            var fill = 1.0
            var alpha = 1.0
            if (s.indeterminate) alpha = bump(i + 0.5 - center, 2.2) else fill = clamp01(clamp01(s.value) * n - i)
            if (fill <= 0.001 || alpha <= 0.01 || width <= 0) continue
            val inner = nested { rect(x, y, width * fill, t, 0.0, solid(ProgressColorRole.Color, alpha)) }
            out.add(ProgressCommand.Clip(rectClip(x, y, width, t, radius), inner))
        }
    }

    private fun stripes(to: Double, y: Double, t: Double, spacing: Double, offset: Double, paint: ProgressPaint) {
        var x = -t - spacing * 2 + offset
        while (x < to + t) {
            out.add(ProgressCommand.Polygon(listOf(x, y + t, x + spacing, y + t, x + spacing + t, y, x + t, y), paint))
            x += spacing * 2
        }
    }

    private fun linearStriped(w: Double, h: Double) {
        val t = p.thickness
        val y = h / 2 - t / 2
        val radius = t / 2
        val spacing = max(6.0, t * 0.8)
        val offset = mod((if (s.indeterminate) s.indeterminateTime else s.time) * 26, spacing * 2)
        rect(0.0, y, w, t, radius, solid(ProgressColorRole.Track))
        val inner = nested {
            if (s.indeterminate) {
                stripes(w, y, t, spacing, offset, solid(ProgressColorRole.Color, 0.85))
            } else {
                val filled = w * clamp01(s.value)
                if (filled > 0.5) {
                    val fill = nested {
                        rect(0.0, y, filled, t, 0.0, solid(ProgressColorRole.Color))
                        stripes(filled, y, t, spacing, offset, solid(ProgressColorRole.White, 0.22))
                    }
                    out.add(ProgressCommand.Clip(rectClip(0.0, y, filled, t, radius), fill))
                }
            }
        }
        if (inner.isNotEmpty()) out.add(ProgressCommand.Clip(rectClip(0.0, y, w, t, radius), inner))
    }

    private fun linearShimmer(w: Double, h: Double) {
        val t = p.thickness
        val y = h / 2 - t / 2
        val radius = t / 2
        rect(0.0, y, w, t, radius, solid(ProgressColorRole.Track))
        val inner = nested {
            if (s.indeterminate) {
                val u = mod(s.indeterminateTime / 1.5, 1.0)
                val width = w * 0.45
                val x = -width + easeInOut(u) * (w + width)
                rect(x, y, width, t, 0.0, sheen(x, width, ProgressColorRole.Color, 1.0))
            } else {
                val filled = w * clamp01(s.value)
                if (filled > 0.5) {
                    val fill = nested {
                        rect(0.0, y, filled, t, 0.0, solid(ProgressColorRole.Color))
                        val u = mod(s.time, 2.2) / 1.5
                        if (u < 1) {
                            val width = max(36.0, w * 0.22)
                            val x = -width + u * (filled + width)
                            rect(x, y, width, t, 0.0, sheen(x, width, ProgressColorRole.White, 0.5))
                        }
                    }
                    out.add(ProgressCommand.Clip(rectClip(0.0, y, filled, t, radius), fill))
                }
            }
        }
        if (inner.isNotEmpty()) out.add(ProgressCommand.Clip(rectClip(0.0, y, w, t, radius), inner))
    }

    private fun linearGlow(w: Double, h: Double) {
        val t = p.thickness
        val cy = h / 2
        val cap = p.strokeCap
        val r = if (cap == ProgressStrokeCap.Round) t / 2 else 0.0
        val x0 = r + 2
        val x1 = w - r - 2
        val len = x1 - x0
        hLine(x0, x1, cy, t, cap, solid(ProgressColorRole.Color, 0.14))
        fun glow(a: Double, b: Double) {
            val head = x0 + b * len
            hLine(x0 + a * len, head, cy, t + 8, cap, solid(ProgressColorRole.Color, 0.12))
            hLine(x0 + a * len, head, cy, t + 4, cap, solid(ProgressColorRole.Color, 0.22))
            hLine(x0 + a * len, head, cy, t, cap, solid(ProgressColorRole.Color))
            val reach = t + 8
            rect(head - reach, cy - reach, 2 * reach, 2 * reach, 0.0, fade(head, cy, reach, 0.55))
        }
        if (s.indeterminate) {
            for ((a, b) in linearSegments(mod(s.indeterminateTime / 1.75, 1.0))) glow(a, b)
            return
        }
        val v = clamp01(s.value)
        if (v > 0.0005) glow(0.0, v)
    }

    private fun linearDots(w: Double, h: Double) {
        val n = p.segments
        val d = max(6.0, p.thickness * 2)
        val r = d / 2
        val cy = h / 2 + r * 0.45
        val spacing = (w - d) / max(1, n - 1)
        val center = mod(s.indeterminateTime / 1.5, 1.0) * (n + 3) - 1.5
        for (i in 0 until n) {
            val x = r + i * spacing
            circle(x, cy, r, solid(ProgressColorRole.Track))
            if (s.indeterminate) {
                val k = bump(i - center, 1.6)
                if (k > 0) circle(x, cy - k * r * 0.9, r * (0.75 + 0.25 * k), solid(ProgressColorRole.Color, k))
            } else {
                val fill = clamp01(clamp01(s.value) * n - i)
                if (fill > 0) circle(x, cy, r * sqrt(fill), solid(ProgressColorRole.Color))
            }
        }
    }

    private fun linearSteps(w: Double, h: Double) {
        val n = p.segments
        val t = p.thickness
        val radius = max(7.0, t * 1.75)
        val cy = h / 2
        val gap = 3.0
        val xs = DoubleArray(n) { radius + it * (w - 2 * radius) / (n - 1) }
        val position = if (s.indeterminate) -1.0 else clamp01(s.value) * (n - 1)
        val center = mod(s.indeterminateTime / 2.2, 1.0) * n - 0.5
        for (i in 0 until n - 1) {
            val a = xs[i] + radius + gap
            val b = xs[i + 1] - radius - gap
            hLine(a, b, cy, t, ProgressStrokeCap.Round, solid(ProgressColorRole.Track))
            if (s.indeterminate) {
                val lo = clamp01(center - 0.3 - i)
                val hi = clamp01(center + 0.3 - i)
                if (hi > lo) hLine(a + (b - a) * lo, a + (b - a) * hi, cy, t, ProgressStrokeCap.Round, solid(ProgressColorRole.Color))
            } else {
                val fill = clamp01(position - i)
                if (fill > 0) hLine(a, a + (b - a) * fill, cy, t, ProgressStrokeCap.Round, solid(ProgressColorRole.Color))
            }
        }
        for (i in 0 until n) {
            val x = xs[i]
            circle(x, cy, radius, solid(ProgressColorRole.Track))
            if (s.indeterminate) {
                val k = bump(i - center, 0.55)
                if (k > 0.01) circle(x, cy, radius, solid(ProgressColorRole.Color, k))
                continue
            }
            val done = clamp01((position - i + 0.12) / 0.12)
            if (done > 0) {
                circle(x, cy, radius * (0.4 + 0.6 * done), solid(ProgressColorRole.Color))
                if (done > 0.6) {
                    out.add(
                        ProgressCommand.Polyline(
                            listOf(x - radius * 0.38, cy + radius * 0.02, x - radius * 0.1, cy + radius * 0.3, x + radius * 0.4, cy - radius * 0.28),
                            false,
                            max(1.5, radius * 0.22),
                            ProgressStrokeCap.Round,
                            solid(ProgressColorRole.White, (done - 0.6) / 0.4),
                        ),
                    )
                }
            } else if (position > i - 1) {
                arc(x, cy, radius - 1, 0.0, TAU, 2.0, ProgressStrokeCap.Butt, solid(ProgressColorRole.Color))
            }
        }
    }

    private fun linearGradient(w: Double, h: Double) {
        val t = p.thickness
        val cap = p.strokeCap
        val r = if (cap == ProgressStrokeCap.Round) t / 2 else 0.0
        val cy = h / 2
        val x0 = r
        val x1 = w - r
        val len = x1 - x0
        hLine(x0, x1, cy, t, cap, solid(ProgressColorRole.Track))
        fun active(a: Double, b: Double) {
            val from = x0 + a * len
            val to = x0 + b * len
            val stops = listOf(ProgressColorStop(0.0, ProgressColorRole.Color, 0.15), ProgressColorStop(1.0, ProgressColorRole.Color, 1.0))
            hLine(from, to, cy, t, cap, ProgressPaint.Linear(from - r, 0.0, to + r, 0.0, stops))
        }
        if (s.indeterminate) {
            for ((a, b) in linearSegments(mod(s.indeterminateTime / 1.75, 1.0))) active(a, b)
            return
        }
        val v = clamp01(s.value)
        if (v > 0.0005) active(0.0, v)
    }

    private fun linearCenter(w: Double, h: Double) {
        val t = p.thickness
        val cap = p.strokeCap
        val r = if (cap == ProgressStrokeCap.Round) t / 2 else 0.0
        val cy = h / 2
        val x0 = r
        val len = w - 2 * r
        hLine(x0, x0 + len, cy, t, cap, solid(ProgressColorRole.Track))
        val half: Double
        var alpha = 1.0
        if (s.indeterminate) {
            val u = mod(s.indeterminateTime / 1.6, 1.0)
            half = emphasized(u) / 2
            alpha = 1 - standard(clamp01((u - 0.55) / 0.45))
        } else {
            half = clamp01(s.value) / 2
        }
        if (half > 0.00025 && alpha > 0.01) hLine(x0 + (0.5 - half) * len, x0 + (0.5 + half) * len, cy, t, cap, solid(ProgressColorRole.Color, alpha))
    }

    private fun linearChevrons(w: Double, h: Double) {
        val n = p.segments
        val t = p.thickness
        val cy = h / 2
        val half = max(3.0, t * 1.5)
        val cell = (w - t) / n
        val depth = min(cell * 0.5, half)
        if (cell <= 0) return
        val center = mod(s.indeterminateTime / 1.4, 1.0) * (n + 4) - 2
        for (i in 0 until n) {
            val x = t / 2 + i * cell + (cell - depth) / 2
            val points = listOf(x, cy - half, x + depth, cy, x, cy + half)
            out.add(ProgressCommand.Polyline(points, false, t, p.strokeCap, solid(ProgressColorRole.Track)))
            val k = if (s.indeterminate) bump(i + 0.5 - center, 3.0) else clamp01(clamp01(s.value) * n - i)
            if (k > 0.01) out.add(ProgressCommand.Polyline(points, false, t, p.strokeCap, solid(ProgressColorRole.Color, k)))
        }
    }

    private fun linearTicks(w: Double, h: Double) {
        val n = p.segments
        val t = p.thickness
        val cy = h / 2
        val long = max(4.0, t * 2.5)
        val short = long * 0.55
        val center = mod(s.indeterminateTime / 1.6, 1.0) * (n + 6) - 3
        for (i in 0 until n) {
            val x = if (n == 1) w / 2 else t / 2 + i * (w - t) / (n - 1)
            val reach = if (i % 4 == 0) long else short
            fun tick(paint: ProgressPaint) = ProgressCommand.Line(x, cy - reach, x, cy + reach, t, p.strokeCap, paint)
            out.add(tick(solid(ProgressColorRole.Track)))
            val k = if (s.indeterminate) bump(i - center, 3.5) else clamp01(clamp01(s.value) * n - i)
            if (k > 0.01) out.add(tick(solid(ProgressColorRole.Color, k)))
        }
    }

    // ---------- circular family ----------

    fun circularAny(size: Double) {
        when (p.variant) {
            ProgressVariant.Segmented -> segmentedArc(size / 2, size / 2, (size - p.thickness) / 2, TOP, TAU, true)
            ProgressVariant.Gradient -> circularGradient(size)
            ProgressVariant.Ticks -> circularTicks(size)
            ProgressVariant.Dots -> circularDots(size)
            ProgressVariant.Glow -> circularGlow(size)
            ProgressVariant.Split -> circularSplit(size)
            ProgressVariant.Orbit -> circularOrbit(size)
            ProgressVariant.Dual -> circularDual(size)
            else -> circular(size)
        }
        if (p.showLabel && !s.indeterminate) {
            text(size / 2, size / 2, labelSize(size), ProgressGeometry.label(s.value), false, solid(ProgressColorRole.Label))
        }
    }

    private fun circular(size: Double) {
        val t = p.thickness
        val cap = p.strokeCap
        val wavy = p.variant == ProgressVariant.Wavy && size >= MIN_WAVY_SIZE
        val ampMax = if (wavy) p.amplitude else 0.0
        val amp = ampMax * s.wave
        val cx = size / 2
        val cy = size / 2
        val r = (size - t) / 2 - ampMax
        if (r <= 0) return
        val gapAngle = (p.trackGap + if (cap == ProgressStrokeCap.Round) t else 0.0) / r
        val waves = max(3.0, roundHalfUp(TAU * r / p.wavelength))
        val phase = mod(s.time * p.waveSpeed, 1.0) * TAU
        val color = solid(ProgressColorRole.Color)
        val track = solid(ProgressColorRole.Track)
        fun active(start: Double, end: Double) {
            if (wavy && amp > 0.05) wavyArc(cx, cy, r, amp, waves, phase, start, end, t, cap, color)
            else arc(cx, cy, r, start, end, t, cap, color)
        }
        if (s.indeterminate) {
            val (a0, a1) = circularArc(s.indeterminateTime)
            arc(cx, cy, r, TOP + a1 + gapAngle, TOP + a0 + TAU - gapAngle, t, cap, track)
            active(TOP + a0, TOP + a1)
            return
        }
        val v = clamp01(s.value)
        if (v <= 0.0005) {
            arc(cx, cy, r, 0.0, TAU, t, ProgressStrokeCap.Butt, track)
            return
        }
        val sweep = v * TAU
        if (p.trackGap > 0 || v < 1) arc(cx, cy, r, TOP + sweep + gapAngle, TOP + TAU - gapAngle, t, cap, track)
        active(TOP, TOP + max(sweep, 0.0001))
    }

    /** Segments spread over [sweep] from [start]; a full circle also gets a gap at the seam. */
    private fun segmentedArc(cx: Double, cy: Double, r: Double, start: Double, sweep: Double, full: Boolean) {
        if (r <= 0) return
        val n = p.segments
        val count = n.toDouble()
        val t = p.thickness
        val cap = p.strokeCap
        val gapAngle = (max(2.0, p.trackGap) + if (cap == ProgressStrokeCap.Round) t else 0.0) / r
        val segment = (sweep - gapAngle * (if (full) count else count - 1)) / count
        if (segment <= 0.01) return
        val it = s.indeterminateTime
        val center = if (full) mod(it / 1.2, 1.0) * count else (0.5 - 0.5 * cos(it * PI)) * count
        for (i in 0 until n) {
            val a0 = start + i * (segment + gapAngle) + if (full) gapAngle / 2 else 0.0
            arc(cx, cy, r, a0, a0 + segment, t, cap, solid(ProgressColorRole.Track))
            if (s.indeterminate) {
                var d = i + 0.5 - center
                if (full) {
                    val m = mod(d, count)
                    d = min(m, count - m)
                }
                val k = bump(d, if (full) count * 0.32 else 2.0)
                if (k > 0.01) arc(cx, cy, r, a0, a0 + segment, t, cap, solid(ProgressColorRole.Color, k))
            } else {
                val fill = clamp01(clamp01(s.value) * count - i)
                if (fill > 0.001) arc(cx, cy, r, a0, a0 + segment * fill, t, cap, solid(ProgressColorRole.Color))
            }
        }
    }

    private fun circularGradient(size: Double) {
        val t = p.thickness
        val cx = size / 2
        val cy = size / 2
        val r = (size - t) / 2 - 1
        arc(cx, cy, r, 0.0, TAU, t, ProgressStrokeCap.Butt, solid(ProgressColorRole.Track))
        val head: Double
        val tail: Double
        if (s.indeterminate) {
            val it = s.indeterminateTime
            head = TOP + mod(it / 1.1, 1.0) * TAU
            tail = head - (0.62 + 0.12 * sin(it * 2.4)) * TAU
        } else {
            val v = clamp01(s.value)
            if (v <= 0.0005) return
            tail = TOP
            head = TOP + v * TAU
        }
        val stops = listOf(
            ProgressColorStop(0.0, ProgressColorRole.Color, if (s.indeterminate) 0.0 else 0.12),
            ProgressColorStop(min(1.0, (head - tail) / TAU), ProgressColorRole.Color, 1.0),
        )
        arc(cx, cy, r, tail, head, t, ProgressStrokeCap.Butt, ProgressPaint.Conic(cx, cy, tail, stops))
        val hx = cx + r * cos(head)
        val hy = cy + r * sin(head)
        circle(hx, hy, t * 1.25, fade(hx, hy, t * 1.25, 0.5))
        circle(hx, hy, t / 2, solid(ProgressColorRole.Color))
    }

    private fun circularTicks(size: Double) {
        val n = p.segments
        val count = n.toDouble()
        val t = p.thickness
        val outer = size / 2 - t / 2
        val inner = outer * 0.52
        val cx = size / 2
        val cy = size / 2
        val lead = mod(floor(s.indeterminateTime * count), count)
        for (i in 0 until n) {
            val a = TOP + i * TAU / count
            val ca = cos(a)
            val sa = sin(a)
            fun tick(paint: ProgressPaint) =
                ProgressCommand.Line(cx + inner * ca, cy + inner * sa, cx + outer * ca, cy + outer * sa, t, p.strokeCap, paint)
            if (s.indeterminate) {
                out.add(tick(solid(ProgressColorRole.Color, 1 - mod(lead - i, count) / count * 0.85)))
                continue
            }
            out.add(tick(solid(ProgressColorRole.Track)))
            val fill = clamp01(clamp01(s.value) * count - i)
            if (fill > 0) out.add(tick(solid(ProgressColorRole.Color, fill)))
        }
    }

    private fun circularDots(size: Double) {
        val n = p.segments
        val count = n.toDouble()
        val dr = max(1.5, p.thickness * 0.75)
        val r = size / 2 - dr * 1.35
        val cx = size / 2
        val cy = size / 2
        val center = mod(s.indeterminateTime / 1.1, 1.0) * count
        for (i in 0 until n) {
            val a = TOP + i * TAU / count
            val x = cx + r * cos(a)
            val y = cy + r * sin(a)
            circle(x, y, dr, solid(ProgressColorRole.Track))
            if (s.indeterminate) {
                val alpha = max(0.0, 1 - mod(center - i, count) / (count * 0.6))
                if (alpha > 0) circle(x, y, dr * (0.7 + 0.35 * alpha), solid(ProgressColorRole.Color, alpha))
                continue
            }
            val fill = clamp01(clamp01(s.value) * count - i)
            if (fill > 0) circle(x, y, dr * sqrt(fill), solid(ProgressColorRole.Color))
        }
    }

    /** Arc of the active part of a ring: the indeterminate arc, or from the top to the value. Null draws nothing. */
    private fun activeArc(): Pair<Double, Double>? {
        if (s.indeterminate) {
            val (a0, a1) = circularArc(s.indeterminateTime)
            return TOP + a0 to TOP + a1
        }
        val v = clamp01(s.value)
        return if (v > 0.0005) TOP to TOP + v * TAU else null
    }

    private fun circularGlow(size: Double) {
        val t = p.thickness
        val cap = p.strokeCap
        val cx = size / 2
        val cy = size / 2
        val r = (size - t) / 2 - 4
        if (r <= 0) return
        arc(cx, cy, r, 0.0, TAU, t, ProgressStrokeCap.Butt, solid(ProgressColorRole.Color, 0.14))
        val (a0, a1) = activeArc() ?: return
        arc(cx, cy, r, a0, a1, t + 8, cap, solid(ProgressColorRole.Color, 0.12))
        arc(cx, cy, r, a0, a1, t + 4, cap, solid(ProgressColorRole.Color, 0.22))
        arc(cx, cy, r, a0, a1, t, cap, solid(ProgressColorRole.Color))
        val hx = cx + r * cos(a1)
        val hy = cy + r * sin(a1)
        circle(hx, hy, t / 2 + 4, fade(hx, hy, t / 2 + 4, 0.5))
    }

    private fun circularSplit(size: Double) {
        val t = p.thickness
        val cap = p.strokeCap
        val cx = size / 2
        val cy = size / 2
        val r = (size - t) / 2
        if (r <= 0) return
        arc(cx, cy, r, 0.0, TAU, t, ProgressStrokeCap.Butt, solid(ProgressColorRole.Track))
        var tail = 0.0
        val head: Double
        if (s.indeterminate) {
            val u = mod(s.indeterminateTime / 1.6, 1.0)
            head = emphasized(clamp01(u / 0.6)) * PI
            tail = standard(clamp01((u - 0.3) / 0.7)) * PI
        } else {
            head = clamp01(s.value) * PI
        }
        if (head - tail <= 0.0005) return
        arc(cx, cy, r, TOP + tail, TOP + head, t, cap, solid(ProgressColorRole.Color))
        arc(cx, cy, r, TOP - head, TOP - tail, t, cap, solid(ProgressColorRole.Color))
    }

    private fun circularOrbit(size: Double) {
        val ring = max(1.0, p.thickness * 0.5)
        val dot = max(2.0, p.thickness)
        val cx = size / 2
        val cy = size / 2
        val r = size / 2 - dot * 1.6
        if (r <= 0) return
        arc(cx, cy, r, 0.0, TAU, ring, ProgressStrokeCap.Butt, solid(ProgressColorRole.Track))
        val head: Double
        val tail: Double
        var start = 0.0
        if (s.indeterminate) {
            head = TOP + mod(s.indeterminateTime / 1.2, 1.0) * TAU
            tail = head - 0.35 * TAU
        } else {
            tail = TOP
            head = TOP + clamp01(s.value) * TAU
            start = 0.15
        }
        if (head - tail > 0.0005) {
            val stops = listOf(
                ProgressColorStop(0.0, ProgressColorRole.Color, start),
                ProgressColorStop(min(1.0, (head - tail) / TAU), ProgressColorRole.Color, 1.0),
            )
            arc(cx, cy, r, tail, head, ring * 1.6, ProgressStrokeCap.Butt, ProgressPaint.Conic(cx, cy, tail, stops))
        }
        val hx = cx + r * cos(head)
        val hy = cy + r * sin(head)
        circle(hx, hy, dot * 1.6, fade(hx, hy, dot * 1.6, 0.35))
        circle(hx, hy, dot, solid(ProgressColorRole.Color))
    }

    private fun circularDual(size: Double) {
        val t = p.thickness
        val cap = p.strokeCap
        val cx = size / 2
        val cy = size / 2
        val outer = (size - t) / 2
        val inner = outer - t - max(2.0, p.trackGap * 0.75)
        if (inner <= 0) return
        arc(cx, cy, outer, 0.0, TAU, t, ProgressStrokeCap.Butt, solid(ProgressColorRole.Track))
        arc(cx, cy, inner, 0.0, TAU, t, ProgressStrokeCap.Butt, solid(ProgressColorRole.Track))
        if (s.indeterminate) {
            val (a0, a1) = circularArc(s.indeterminateTime)
            val (b0, b1) = circularArc(s.indeterminateTime * 1.3 + 0.7)
            arc(cx, cy, outer, TOP + a0, TOP + a1, t, cap, solid(ProgressColorRole.Color))
            arc(cx, cy, inner, TOP - b1, TOP - b0, t, cap, solid(ProgressColorRole.Color, 0.6))
            return
        }
        val v = clamp01(s.value)
        if (v <= 0.0005) return
        arc(cx, cy, outer, TOP, TOP + v * TAU, t, cap, solid(ProgressColorRole.Color))
        arc(cx, cy, inner, TOP - v * TAU, TOP, t, cap, solid(ProgressColorRole.Color, 0.6))
    }

    fun pie(size: Double) {
        if (p.variant == ProgressVariant.Segmented) {
            pieSegmented(size)
            return
        }
        val t = max(1.0, p.thickness * 0.6)
        val cx = size / 2
        val cy = size / 2
        val ring = (size - t) / 2
        val inner = ring - t / 2 - max(1.0, p.trackGap * 0.6)
        arc(cx, cy, ring, 0.0, TAU, t, ProgressStrokeCap.Butt, solid(ProgressColorRole.Color))
        circle(cx, cy, inner, solid(ProgressColorRole.Track))
        var start = TOP
        val end: Double
        if (s.indeterminate) {
            val u = s.indeterminateTime / 1.2
            start += mod(u, 1.0) * TAU
            end = start + (0.12 + 0.2 * (0.5 - 0.5 * cos(u * TAU))) * TAU
        } else {
            end = start + clamp01(s.value) * TAU
        }
        if (end - start < 0.0005 || inner <= 0) return
        out.add(ProgressCommand.Sector(cx, cy, inner, start, end, solid(ProgressColorRole.Color)))
    }

    private fun pieSegmented(size: Double) {
        val n = p.segments
        val count = n.toDouble()
        val cx = size / 2
        val cy = size / 2
        val r = size / 2
        val gapAngle = if (n > 1) max(2.0, p.trackGap) / r else 0.0
        val segment = TAU / count - gapAngle
        if (segment <= 0.01) return
        val center = mod(s.indeterminateTime / 1.2, 1.0) * count
        for (i in 0 until n) {
            val a0 = TOP + i * (segment + gapAngle) + gapAngle / 2
            out.add(ProgressCommand.Sector(cx, cy, r, a0, a0 + segment, solid(ProgressColorRole.Track)))
            if (s.indeterminate) {
                val m = mod(i + 0.5 - center, count)
                val k = bump(min(m, count - m), count * 0.32)
                if (k > 0.01) out.add(ProgressCommand.Sector(cx, cy, r, a0, a0 + segment, solid(ProgressColorRole.Color, k)))
                continue
            }
            val fill = clamp01(clamp01(s.value) * count - i)
            if (fill > 0.001) out.add(ProgressCommand.Sector(cx, cy, r, a0, a0 + segment * fill, solid(ProgressColorRole.Color)))
        }
    }

    /** Value the gauge shows: the value, or a needle sweeping back and forth. */
    private fun gaugeValue(): Double =
        if (s.indeterminate) 0.5 - 0.5 * cos(s.indeterminateTime * PI * 0.8) else clamp01(s.value)

    private fun gaugeNeedle(size: Double, start: Double) {
        val t = p.thickness
        val n = p.segments
        val cx = size / 2
        val cy = size / 2
        val r = (size - t) / 2
        val sweep = p.sweepAngle
        val v = gaugeValue()
        val at = start + v * sweep
        arc(cx, cy, r, start, start + sweep, t, p.strokeCap, solid(ProgressColorRole.Track))
        if (v > 0.0005) arc(cx, cy, r, start, at, t, p.strokeCap, solid(ProgressColorRole.Color))
        val outer = r - t / 2 - max(1.5, size * 0.03)
        val inner = outer - max(2.0, size * 0.07)
        val tickWidth = max(1.0, t * 0.4)
        for (i in 0..n) {
            val a = start + i * sweep / n
            val ca = cos(a)
            val sa = sin(a)
            val lit = i.toDouble() / n <= v + 1e-9
            val paint = solid(if (lit) ProgressColorRole.Color else ProgressColorRole.Track)
            out.add(ProgressCommand.Line(cx + inner * ca, cy + inner * sa, cx + outer * ca, cy + outer * sa, tickWidth, ProgressStrokeCap.Round, paint))
        }
        val length = inner - max(1.5, size * 0.04)
        val base = max(1.5, size * 0.035)
        val ca = cos(at)
        val sa = sin(at)
        val needle = listOf(cx + length * ca, cy + length * sa, cx - base * sa, cy + base * ca, cx + base * sa, cy - base * ca)
        out.add(ProgressCommand.Polygon(needle, solid(ProgressColorRole.Color)))
        circle(cx, cy, max(2.5, size * 0.07), solid(ProgressColorRole.Color))
    }

    private fun gaugeGradient(size: Double, start: Double) {
        val t = p.thickness
        val cx = size / 2
        val cy = size / 2
        val r = (size - t) / 2
        val sweep = p.sweepAngle
        arc(cx, cy, r, start, start + sweep, t, p.strokeCap, solid(ProgressColorRole.Track))
        var from = start
        val to: Double
        if (s.indeterminate) {
            val length = 0.35 * sweep
            from = start + (0.5 - 0.5 * cos(s.indeterminateTime * PI)) * (sweep - length)
            to = from + length
        } else {
            to = start + clamp01(s.value) * sweep
        }
        if (to - from <= 0.0005) return
        // A round cap reaches back past `from`, where the conic would wrap around to its last stop.
        val lead = if (p.strokeCap == ProgressStrokeCap.Round) min(PI / 4, atan2(t / 2, max(r - t / 2, 1e-6))) else 0.0
        val stops = listOf(
            ProgressColorStop(0.0, ProgressColorRole.Color, 0.2),
            ProgressColorStop(lead / TAU, ProgressColorRole.Color, 0.2),
            ProgressColorStop((to - from + lead) / TAU, ProgressColorRole.Color, 1.0),
        )
        arc(cx, cy, r, from, to, t, p.strokeCap, ProgressPaint.Conic(cx, cy, from - lead, stops))
    }

    private fun gaugeDots(size: Double, start: Double) {
        val n = p.segments
        val count = n.toDouble()
        val dr = max(1.5, p.thickness * 0.5)
        val cx = size / 2
        val cy = size / 2
        val r = size / 2 - dr - 1
        val sweep = p.sweepAngle
        val center = (0.5 - 0.5 * cos(s.indeterminateTime * PI)) * count
        for (i in 0 until n) {
            val a = if (n == 1) start + sweep / 2 else start + i * sweep / (n - 1)
            val x = cx + r * cos(a)
            val y = cy + r * sin(a)
            circle(x, y, dr, solid(ProgressColorRole.Track))
            if (s.indeterminate) {
                val k = bump(i + 0.5 - center, 2.0)
                if (k > 0.01) circle(x, y, dr, solid(ProgressColorRole.Color, k))
                continue
            }
            val fill = clamp01(clamp01(s.value) * count - i)
            if (fill > 0) circle(x, y, dr * sqrt(fill), solid(ProgressColorRole.Color))
        }
    }

    fun gauge(size: Double) {
        val t = p.thickness
        val cap = p.strokeCap
        val cx = size / 2
        val cy = size / 2
        val r = (size - t) / 2
        val sweep = p.sweepAngle
        val start = PI / 2 + (TAU - sweep) / 2
        val end = start + sweep
        if (r > 0) {
            val gapAngle = (p.trackGap + if (cap == ProgressStrokeCap.Round) t else 0.0) / r
            if (p.variant == ProgressVariant.Needle) {
                gaugeNeedle(size, start)
            } else if (p.variant == ProgressVariant.Gradient) {
                gaugeGradient(size, start)
            } else if (p.variant == ProgressVariant.Dots) {
                gaugeDots(size, start)
            } else if (p.variant == ProgressVariant.Segmented) {
                segmentedArc(cx, cy, r, start, sweep, false)
            } else if (s.indeterminate) {
                val length = 0.24 * sweep
                val a = start + (0.5 - 0.5 * cos(s.indeterminateTime * PI)) * (sweep - length)
                arc(cx, cy, r, start, a - gapAngle, t, cap, solid(ProgressColorRole.Track))
                arc(cx, cy, r, a + length + gapAngle, end, t, cap, solid(ProgressColorRole.Track))
                arc(cx, cy, r, a, a + length, t, cap, solid(ProgressColorRole.Color))
            } else {
                val v = clamp01(s.value)
                if (v <= 0.0005) {
                    arc(cx, cy, r, start, end, t, cap, solid(ProgressColorRole.Track))
                } else {
                    arc(cx, cy, r, start + v * sweep + gapAngle, end, t, cap, solid(ProgressColorRole.Track))
                    arc(cx, cy, r, start, start + v * sweep, t, cap, solid(ProgressColorRole.Color))
                }
            }
        }
        if (p.showLabel && !s.indeterminate) {
            val needle = p.variant == ProgressVariant.Needle
            val y = if (needle) cy + r * 0.55 else cy
            text(cx, y, if (needle) labelSize(size) * 0.7 else labelSize(size), ProgressGeometry.label(s.value), false, solid(ProgressColorRole.Label))
        }
    }

    private fun liquidSurface(cx: Double, cy: Double, inner: Double, level: Double, amp: Double, wavelength: Double, phase: Double): List<Double> {
        val y = cy + inner - level * 2 * inner
        val left = cx - inner
        val right = cx + inner + 2
        val n = max(1, steps((right - left) / 2))
        val points = ArrayList<Double>(2 * n + 6)
        points.add(left)
        points.add(cy + inner + 1)
        for (i in 0..n) {
            val x = left + (right - left) * i / n
            points.add(x)
            points.add(y + amp * sin(x / wavelength * TAU + phase))
        }
        points.add(right)
        points.add(cy + inner + 1)
        return points
    }

    /** Like [liquidSurface], for a liquid filling the box from [top] to [bottom]. */
    private fun liquidSurfaceBox(
        left: Double, right: Double, top: Double, bottom: Double, level: Double, amp: Double, wavelength: Double, phase: Double,
    ): List<Double> {
        val y = bottom - level * (bottom - top)
        val end = right + 2
        val n = max(1, steps((end - left) / 2))
        val points = ArrayList<Double>(2 * n + 6)
        points.add(left)
        points.add(bottom + 1)
        for (i in 0..n) {
            val x = left + (end - left) * i / n
            points.add(x)
            points.add(y + amp * sin(x / wavelength * TAU + phase))
        }
        points.add(end)
        points.add(bottom + 1)
        return points
    }

    private fun liquidHeart(size: Double) {
        val ring = max(1.5, p.thickness * 0.6)
        val cx = size / 2
        val cy = size / 2
        val half = (size - ring) / 2
        val inner = half - ring / 2 - max(1.5, p.trackGap * 0.6)
        if (inner > 0) {
            val top = cy - inner * HEART_HALF_HEIGHT
            val bottom = cy + inner * HEART_HALF_HEIGHT
            val level = if (s.indeterminate) 0.5 + 0.14 * sin(s.indeterminateTime * 1.8) else clamp01(s.value)
            val amp = inner * if (s.indeterminate) 0.09 else 0.07 * s.wave
            val wavelength = inner * 1.35
            val cycles = s.time * p.waveSpeed * 0.8
            val front = liquidSurfaceBox(cx - inner, cx + inner, top, bottom, level, amp, wavelength, mod(cycles, 1.0) * TAU)
            val back = liquidSurfaceBox(cx - inner, cx + inner, top, bottom, level, amp * 0.8, wavelength, 2 - mod(cycles * 0.7, 1.0) * TAU)
            val content = nested {
                rect(cx - inner, top, inner * 2, bottom - top, 0.0, solid(ProgressColorRole.Track))
                out.add(ProgressCommand.Polygon(back, solid(ProgressColorRole.Color, 0.45)))
                out.add(ProgressCommand.Polygon(front, solid(ProgressColorRole.Color)))
                if (p.showLabel && !s.indeterminate) {
                    invertedLabel(ProgressGeometry.label(s.value), cx, cy - inner * 0.12, labelSize(size) * 0.8, ProgressClipShape.Polygon(front))
                }
            }
            out.add(ProgressCommand.Clip(ProgressClipShape.Polygon(heartPoints(cx, cy, inner)), content))
        }
        out.add(ProgressCommand.Polyline(heartPoints(cx, cy, half), true, ring, ProgressStrokeCap.Butt, solid(ProgressColorRole.Color)))
    }

    fun liquid(size: Double) {
        if (p.variant == ProgressVariant.Heart) {
            liquidHeart(size)
            return
        }
        val ring = max(1.5, p.thickness * 0.6)
        val cx = size / 2
        val cy = size / 2
        val outer = (size - ring) / 2
        val inner = outer - ring / 2 - max(1.5, p.trackGap * 0.6)
        arc(cx, cy, outer, 0.0, TAU, ring, ProgressStrokeCap.Butt, solid(ProgressColorRole.Color))
        if (inner <= 0) return
        val level = if (s.indeterminate) 0.5 + 0.14 * sin(s.indeterminateTime * 1.8) else clamp01(s.value)
        val amp = inner * if (s.indeterminate) 0.09 else 0.07 * s.wave
        val wavelength = inner * 1.35
        val cycles = s.time * p.waveSpeed * 0.8
        val front = liquidSurface(cx, cy, inner, level, amp, wavelength, mod(cycles, 1.0) * TAU)
        val back = liquidSurface(cx, cy, inner, level, amp * 0.8, wavelength, 2 - mod(cycles * 0.7, 1.0) * TAU)
        val content = nested {
            rect(cx - inner, cy - inner, inner * 2, inner * 2, 0.0, solid(ProgressColorRole.Track))
            out.add(ProgressCommand.Polygon(back, solid(ProgressColorRole.Color, 0.45)))
            out.add(ProgressCommand.Polygon(front, solid(ProgressColorRole.Color)))
            if (p.showLabel && !s.indeterminate) {
                invertedLabel(ProgressGeometry.label(s.value), cx, cy, labelSize(size), ProgressClipShape.Polygon(front))
            }
        }
        out.add(ProgressCommand.Clip(ProgressClipShape.Circle(cx, cy, inner), content))
    }

    // ---------- border ----------

    /** Rounded rectangle path starting at the top center, clockwise, sampled about every 2 dp. */
    private fun borderPath(w: Double, h: Double, inset: Double, radius: Double): BorderPath {
        val left = inset
        val top = inset
        val right = w - inset
        val bottom = h - inset
        val r = max(0.0, min(radius, min((right - left) / 2, (bottom - top) / 2)))
        val mx = (left + right) / 2
        val points = arrayListOf(mx, top)
        fun line(x0: Double, y0: Double, x1: Double, y1: Double) {
            val n = max(1, steps(hypot(x1 - x0, y1 - y0) / 2))
            for (i in 1..n) {
                points.add(x0 + (x1 - x0) * i / n)
                points.add(y0 + (y1 - y0) * i / n)
            }
        }
        fun corner(cx: Double, cy: Double, a0: Double) {
            if (r <= 0) return
            val n = max(2, steps(r * PI / 4))
            for (i in 1..n) {
                val a = a0 + PI / 2 * (i.toDouble() / n)
                points.add(cx + r * cos(a))
                points.add(cy + r * sin(a))
            }
        }
        line(mx, top, right - r, top)
        corner(right - r, top + r, -PI / 2)
        line(right, top + r, right, bottom - r)
        corner(right - r, bottom - r, 0.0)
        line(right - r, bottom, left + r, bottom)
        corner(left + r, bottom - r, PI / 2)
        line(left, bottom - r, left, top + r)
        corner(left + r, top + r, PI)
        line(left + r, top, mx, top)
        val lengths = arrayListOf(0.0)
        var i = 2
        while (i < points.size) {
            lengths.add(lengths.last() + hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]))
            i += 2
        }
        return BorderPath(points, lengths, lengths.last())
    }

    /** Strokes the part of [path] from fraction [a] to fraction [b]; [b] above 1 wraps past the start. */
    private fun strokeAlong(path: BorderPath, a: Double, b: Double, lineWidth: Double, cap: ProgressStrokeCap, paint: ProgressPaint) {
        if (b > 1) {
            strokeAlong(path, a, 1.0, lineWidth, cap, paint)
            strokeAlong(path, 0.0, b - 1, lineWidth, cap, paint)
            return
        }
        val points = path.points
        val lengths = path.lengths
        val from = a * path.total
        val to = b * path.total
        if (to - from < 0.3) return
        fun at(d: Double): Triple<Double, Double, Int> {
            var i = 1
            while (i < lengths.size - 1 && lengths[i] < d) i++
            val f = (d - lengths[i - 1]) / max(1e-6, lengths[i] - lengths[i - 1])
            val x0 = points[2 * i - 2]
            val y0 = points[2 * i - 1]
            return Triple(x0 + (points[2 * i] - x0) * f, y0 + (points[2 * i + 1] - y0) * f, i)
        }
        val (sx, sy, si) = at(from)
        val (ex, ey, ei) = at(to)
        val result = arrayListOf(sx, sy)
        for (i in si until ei) {
            result.add(points[2 * i])
            result.add(points[2 * i + 1])
        }
        result.add(ex)
        result.add(ey)
        out.add(ProgressCommand.Polyline(result, false, lineWidth, cap, paint))
    }

    fun border(w: Double, h: Double) {
        val t = p.thickness
        val glow = if (p.variant == ProgressVariant.Glow) BORDER_GLOW else 0.0
        val inset = t / 2 + glow
        if (w <= 2 * inset || h <= 2 * inset) return
        val path = borderPath(w, h, inset, p.cornerRadius - inset)
        if (p.variant == ProgressVariant.Segmented) {
            borderSegmented(path)
            return
        }
        val track = if (glow > 0) solid(ProgressColorRole.Color, 0.14) else solid(ProgressColorRole.Track)
        out.add(ProgressCommand.Polyline(path.points.subList(0, path.points.size - 2).toList(), true, t, ProgressStrokeCap.Butt, track))
        fun active(a: Double, b: Double) {
            if (glow > 0) {
                strokeAlong(path, a, b, t + 2 * glow, p.strokeCap, solid(ProgressColorRole.Color, 0.12))
                strokeAlong(path, a, b, t + glow, p.strokeCap, solid(ProgressColorRole.Color, 0.22))
            }
            strokeAlong(path, a, b, t, p.strokeCap, solid(ProgressColorRole.Color))
        }
        if (s.indeterminate) {
            val (a0, a1) = circularArc(s.indeterminateTime)
            val from = mod(a0 / TAU, 1.0)
            active(from, from + (a1 - a0) / TAU)
        } else {
            val v = clamp01(s.value)
            if (v > 0.0005) active(0.0, v)
        }
    }

    private fun borderSegmented(path: BorderPath) {
        val n = p.segments
        val count = n.toDouble()
        val t = p.thickness
        val cap = p.strokeCap
        val gap = if (n > 1) (max(2.0, p.trackGap) + if (cap == ProgressStrokeCap.Round) t else 0.0) / path.total else 0.0
        val segment = 1 / count - gap
        if (segment <= 0) return
        val center = mod(s.indeterminateTime / 1.4, 1.0) * count
        for (i in 0 until n) {
            val a = i / count + gap / 2
            strokeAlong(path, a, a + segment, t, cap, solid(ProgressColorRole.Track))
            if (s.indeterminate) {
                val m = mod(i + 0.5 - center, count)
                val k = bump(min(m, count - m), count * 0.3)
                if (k > 0.01) strokeAlong(path, a, a + segment, t, cap, solid(ProgressColorRole.Color, k))
                continue
            }
            val fill = clamp01(clamp01(s.value) * count - i)
            if (fill > 0.001) strokeAlong(path, a, a + segment * fill, t, cap, solid(ProgressColorRole.Color))
        }
    }

    // ---------- bars, grid, battery ----------

    fun bars(w: Double, h: Double) {
        if (p.variant == ProgressVariant.Arcs) {
            barsArcs(w, h)
            return
        }
        val n = p.segments
        val gap = max(3.0, p.trackGap)
        val width = (w - gap * (n - 1)) / n
        if (width <= 0) return
        val radius = if (p.strokeCap == ProgressStrokeCap.Round) min(width * 0.3, 4.0) else 0.0
        val center = mod(s.indeterminateTime / 1.4, 1.0) * (n + 3) - 1.5
        for (i in 0 until n) {
            val height = h * (0.25 + 0.75 * (i + 1) / n)
            val x = i * (width + gap)
            val y = h - height
            val fill = if (s.indeterminate) bump(i + 0.5 - center, 1.6) else clamp01(clamp01(s.value) * n - i)
            if (p.variant == ProgressVariant.Dots) {
                val d = min(width, h)
                val pitch = d + max(1.5, gap * 0.5)
                val count = max(1, floor((height - d) / pitch + 1e-9).toInt() + 1)
                for (j in 0 until count) {
                    val dy = h - d / 2 - j * pitch
                    circle(x + width / 2, dy, d / 2, solid(ProgressColorRole.Track))
                    val k = clamp01(fill * count - j)
                    if (k > 0.01) circle(x + width / 2, dy, d / 2, solid(ProgressColorRole.Color, k))
                }
                continue
            }
            rect(x, y, width, height, radius, solid(ProgressColorRole.Track))
            if (fill <= 0.001) continue
            val inner = nested { rect(x, h - height * fill, width, height * fill, 0.0, solid(ProgressColorRole.Color)) }
            out.add(ProgressCommand.Clip(rectClip(x, y, width, height, radius), inner))
        }
    }

    private fun barsArcs(w: Double, h: Double) {
        val n = p.segments
        val t = p.thickness
        val spread = PI / 4
        val cx = w / 2
        val cy = h - t
        val outer = min(cy - t / 2, (w / 2 - t / 2) / sin(spread))
        if (outer <= 0) return
        circle(cx, cy, t * 0.8, solid(ProgressColorRole.Color))
        val center = mod(s.indeterminateTime / 1.4, 1.0) * (n + 2) - 1
        for (i in 0 until n) {
            val r = outer * (i + 1) / n
            arc(cx, cy, r, TOP - spread, TOP + spread, t, p.strokeCap, solid(ProgressColorRole.Track))
            val k = if (s.indeterminate) bump(i + 0.5 - center, 1.5) else clamp01(clamp01(s.value) * n - i)
            if (k > 0.01) arc(cx, cy, r, TOP - spread, TOP + spread, t, p.strokeCap, solid(ProgressColorRole.Color, k))
        }
    }

    fun grid(size: Double) {
        val k = p.segments
        val gap = max(2.0, p.trackGap * 0.75)
        val cell = (size - gap * (k - 1)) / k
        if (cell <= 0) return
        val radius = if (p.strokeCap == ProgressStrokeCap.Round) cell * 0.28 else cell * 0.08
        val rank = ProgressGeometry.gridOrder(k)
        val center = mod(s.indeterminateTime / 1.6, 1.0) * (2 * k + 1) - 1.5
        for (r in 0 until k) {
            for (c in 0 until k) {
                val x = c * (cell + gap)
                val y = r * (cell + gap)
                val dots = p.variant == ProgressVariant.Dots
                if (dots) circle(x + cell / 2, y + cell / 2, cell / 2, solid(ProgressColorRole.Track))
                else rect(x, y, cell, cell, radius, solid(ProgressColorRole.Track))
                val fill = if (s.indeterminate) bump(r + c - center, 1.8) else clamp01(clamp01(s.value) * k * k - rank[r * k + c])
                if (fill <= 0.01) continue
                val side = cell * (0.3 + 0.7 * fill)
                val paint = solid(ProgressColorRole.Color, min(1.0, fill * 1.6))
                if (dots) circle(x + cell / 2, y + cell / 2, side / 2, paint)
                else rect(x + (cell - side) / 2, y + (cell - side) / 2, side, side, radius * side / cell, paint)
            }
        }
    }

    fun battery(w: Double, h: Double) {
        val border = max(1.5, p.thickness * 0.5)
        val capWidth = max(3.0, w * 0.07)
        val bodyWidth = w - capWidth - border * 0.5
        val radius = h * 0.24
        if (bodyWidth - border > 0 && h - border > 0) {
            out.add(
                ProgressCommand.StrokeRect(
                    border / 2,
                    border / 2,
                    bodyWidth - border,
                    h - border,
                    max(0.0, min(radius, min((bodyWidth - border) / 2, (h - border) / 2))),
                    border,
                    solid(ProgressColorRole.Color, 0.7),
                ),
            )
        }
        rect(bodyWidth + border * 0.2, h * 0.34, w - bodyWidth - border * 0.2, h * 0.32, capWidth * 0.5, solid(ProgressColorRole.Color, 0.7))
        val pad = border + max(1.5, p.trackGap * 0.5)
        val iw = bodyWidth - 2 * pad
        val ih = h - 2 * pad
        if (iw <= 0 || ih <= 0) return
        val filled: Double
        var alpha = 1.0
        if (s.indeterminate) {
            val u = mod(s.indeterminateTime / 1.8, 1.0)
            filled = iw * easeInOut(clamp01(u / 0.8))
            if (u > 0.8) alpha = 1 - (u - 0.8) / 0.2
        } else {
            filled = iw * clamp01(s.value)
        }
        val content = nested {
            if (p.variant == ProgressVariant.Segmented) {
                val n = p.segments
                val gap = max(1.5, p.trackGap * 0.5)
                val cell = (iw - gap * (n - 1)) / n
                if (cell > 0) {
                    for (i in 0 until n) {
                        val x = pad + i * (cell + gap)
                        rect(x, pad, cell, ih, 0.0, solid(ProgressColorRole.Track))
                        val k = clamp01(filled / iw * n - i)
                        if (k > 0.01) rect(x, pad, cell, ih, 0.0, solid(ProgressColorRole.Color, alpha * k))
                    }
                }
            } else {
                rect(pad, pad, iw, ih, 0.0, solid(ProgressColorRole.Track))
                rect(pad, pad, filled, ih, 0.0, solid(ProgressColorRole.Color, alpha))
            }
            if (p.showLabel && !s.indeterminate) {
                invertedLabel(ProgressGeometry.label(s.value), pad + iw / 2, pad + ih / 2, max(10.0, min(ih * 0.55, 30.0)), rectClip(pad, pad, filled, ih, 0.0))
            }
        }
        out.add(ProgressCommand.Clip(rectClip(pad, pad, iw, ih, max(1.0, radius - pad * 0.7)), content))
        if (s.indeterminate) {
            val bx = pad + iw / 2
            val by = pad + ih / 2
            val k = ih * 0.42
            val points = ArrayList<Double>(BOLT.size)
            for (i in BOLT.indices step 2) {
                points.add(bx + BOLT[i] * k * 0.9)
                points.add(by + BOLT[i + 1] * k)
            }
            out.add(ProgressCommand.Polygon(points, solid(ProgressColorRole.White)))
            out.add(ProgressCommand.Polyline(points, true, 1.2, ProgressStrokeCap.Butt, solid(ProgressColorRole.Color)))
        }
    }

    // ---------- hourglass ----------

    fun hourglass(size: Double) {
        val ring = max(1.5, p.thickness * 0.5)
        val cx = size / 2
        val cy = size / 2
        val half = size * 0.3
        val top = size * 0.1
        val bottom = size * 0.9
        val neck = max(1.0, size * 0.035)
        val left = cx - half
        val right = cx + half
        val bulb = cy - top
        val v: Double
        var flip = 0.0
        if (s.indeterminate) {
            val u = mod(s.indeterminateTime / 2.4, 1.0)
            v = easeInOut(clamp01(u / 0.8))
            flip = PI * easeInOut(clamp01((u - 0.8) / 0.2))
        } else {
            v = clamp01(s.value)
        }
        val lift = 1 - 0.2 * sin(flip)
        val cos = cos(flip) * lift
        val sin = sin(flip) * lift
        fun turn(vararg points: Double): List<Double> {
            val turned = ArrayList<Double>(points.size)
            for (i in points.indices step 2) {
                val dx = points[i] - cx
                val dy = points[i + 1] - cy
                turned.add(cx + dx * cos - dy * sin)
                turned.add(cy + dx * sin + dy * cos)
            }
            return turned
        }
        val glass = turn(left, top, right, top, cx + neck, cy, right, bottom, left, bottom, cx - neck, cy)
        out.add(ProgressCommand.Polygon(glass, solid(ProgressColorRole.Track)))
        val upper = bulb * sqrt(1 - v)
        val sand = ArrayList<ProgressCommand>(2)
        if (v < 0.9995) sand.add(ProgressCommand.Polygon(turn(left, cy - upper, right, cy - upper, right, cy, left, cy), solid(ProgressColorRole.Color)))
        if (v > 0.0005) sand.add(ProgressCommand.Polygon(turn(left, cy + upper, right, cy + upper, right, bottom, left, bottom), solid(ProgressColorRole.Color)))
        out.add(ProgressCommand.Clip(ProgressClipShape.Polygon(glass), sand))
        if (v > 0.0005 && v < 0.9995 && flip == 0.0) {
            out.add(ProgressCommand.Line(cx, cy, cx, cy + upper, max(1.0, neck * 0.8), ProgressStrokeCap.Butt, solid(ProgressColorRole.Color)))
        }
        out.add(ProgressCommand.Polyline(glass, true, ring, ProgressStrokeCap.Butt, solid(ProgressColorRole.Color, 0.7)))
        for (y in doubleArrayOf(top, bottom)) {
            val cap = turn(left - ring * 1.5, y, right + ring * 1.5, y)
            out.add(ProgressCommand.Line(cap[0], cap[1], cap[2], cap[3], ring * 1.6, ProgressStrokeCap.Round, solid(ProgressColorRole.Color)))
        }
    }
}
