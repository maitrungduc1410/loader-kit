@file:JvmName("Evaluator")

package io.github.maitrungduc1410.loaderkit

import kotlin.math.PI
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/**
 * Engines refuse specs with more elements in total, or more ring arcs (elements × `segments`
 * over every ring part), than this instead of running out of memory or time on a bad param (SPEC §9).
 */
public const val MAX_ELEMENTS: Int = 10_000

/** The state of one element at one point in time (SPEC §5.4). */
public data class ElementState(
    /** Global index across parts, the one colors use. */
    public val index: Int,
    /** Index of the part the element belongs to; 0 for a spec written without parts. */
    public val part: Int,
    /** Element center, before translation. */
    public val cx: Double,
    public val cy: Double,
    public val width: Double,
    public val height: Double,
    /** Combined scale: `scale * scaleX` and `scale * scaleY`. */
    public val scaleX: Double,
    public val scaleY: Double,
    /** Element opacity times group opacity. */
    public val opacity: Double,
    /** The layout rotation (ring `orient`) plus the `rotate` track. */
    public val rotate: Double,
    public val rotateX: Double,
    public val rotateY: Double,
    public val translateX: Double,
    public val translateY: Double,
    public val strokeStart: Double,
    public val strokeEnd: Double,
    /** Group transform around the box center, applied after the element transform. */
    public val groupScaleX: Double,
    public val groupScaleY: Double,
    public val groupRotate: Double,
    public val groupTranslateX: Double,
    public val groupTranslateY: Double,
)

/** Spec defaults merged with [overrides]. Overrides for names the spec does not declare are ignored. */
public fun resolveParams(spec: IndicatorSpec, overrides: Map<String, Double> = emptyMap()): Map<String, Double> {
    if (overrides.isEmpty()) return spec.params
    val resolved = LinkedHashMap(spec.params)
    for ((name, value) in overrides) if (name in resolved) resolved[name] = value
    return resolved
}

/** State of every element at spec time [t] (seconds, already multiplied by the speed). */
public fun evaluate(spec: IndicatorSpec, t: Double, params: Map<String, Double> = emptyMap()): List<ElementState> =
    PreparedIndicator(spec, params).evaluate(t)

/** Spec time for a frozen [cycleProgress] in [0, 1] of the spec duration (SPEC §8). */
public fun timeForCycleProgress(
    spec: IndicatorSpec,
    cycleProgress: Double,
    params: Map<String, Double> = emptyMap(),
): Double = PreparedIndicator(spec, params).timeForCycleProgress(cycleProgress)

/** A shape with its params resolved and its defaults filled in. */
internal sealed interface ResolvedShape {
    data class Circle(val startAngle: Double, val sweep: Double) : ResolvedShape

    data class Rect(val cornerRadius: Double) : ResolvedShape

    data class Ring(val strokeWidth: Double, val startAngle: Double, val sweep: Double, val segments: Int) : ResolvedShape

    data object Triangle : ResolvedShape

    data object Line : ResolvedShape
}

/**
 * A validated spec with its params resolved and its layouts laid out, ready to be sampled every
 * frame without allocating.
 *
 * @throws InvalidIndicatorSpecException when the spec is invalid, or when the params make it so
 *   (a stagger array shorter than the element count, a count that is not finite, …).
 */
public class PreparedIndicator(
    public val spec: IndicatorSpec,
    params: Map<String, Double> = emptyMap(),
) {
    /** Spec defaults merged with the overrides. */
    public val params: Map<String, Double> = resolveParams(spec, params)

    public val duration: Double get() = spec.duration

    public val perspective: Double = spec.perspective ?: DEFAULT_PERSPECTIVE

    /** Number of elements across every part. */
    public val elementCount: Int

    /** The shape of each part. */
    internal val shapes: List<ResolvedShape>

    private val parts: Array<PreparedPart>
    private val partOf: IntArray
    private val cx: DoubleArray
    private val cy: DoubleArray
    private val width: DoubleArray
    private val height: DoubleArray
    private val layoutRotate: DoubleArray
    private val offsets: DoubleArray
    private val durations: DoubleArray
    private val warmup: Double

    init {
        val problems = spec.validate()
        if (problems.isNotEmpty()) throw InvalidIndicatorSpecException(problems)

        val inline = spec.parts.size == 1 && spec.parts[0].duration == null
        val prefixes = List(spec.parts.size) { if (inline) "" else "parts[$it]." }
        val counts = IntArray(spec.parts.size) { layoutCount(spec.parts[it].layout, prefixes[it]) }
        val total = counts.fold(0L) { sum, count -> sum + count }
        if (total > MAX_ELEMENTS) fail("the spec has $total elements, the maximum is $MAX_ELEMENTS")
        elementCount = total.toInt()

        partOf = IntArray(elementCount)
        cx = DoubleArray(elementCount)
        cy = DoubleArray(elementCount)
        width = DoubleArray(elementCount)
        height = DoubleArray(elementCount)
        layoutRotate = DoubleArray(elementCount)
        offsets = DoubleArray(elementCount)
        durations = DoubleArray(elementCount)

        var first = 0
        parts = Array(spec.parts.size) { p ->
            val part = spec.parts[p]
            val count = counts[p]
            partOf.fill(p, first, first + count)
            fillLayout(part.layout, first, count)
            fillOffsets(part.stagger, first, count)
            val partDuration = part.duration ?: spec.duration
            val elementDurations = part.durations
            if (elementDurations == null) {
                durations.fill(partDuration, first, first + count)
            } else {
                if (elementDurations.size < count) {
                    fail("durations has ${elementDurations.size} entries but the layout has $count elements")
                }
                for (i in 0 until count) durations[first + i] = elementDurations[i]
            }
            first += count

            val rest = DoubleArray(ELEMENT_PROPERTIES.size) { ELEMENT_PROPERTIES[it].restValue }
            for ((property, value) in part.rest) rest[property.ordinal] = resolve(value)
            PreparedPart(
                duration = partDuration,
                rest = rest,
                tracks = Array(part.tracks.size) {
                    val track = part.tracks[it]
                    prepareTrack(track.property.ordinal, track.keyTimes, track.values, track.easing)
                },
                groupTracks = Array(part.groupTracks.size) {
                    val track = part.groupTracks[it]
                    prepareTrack(track.property.ordinal, track.keyTimes, track.values, track.easing)
                },
            )
        }
        shapes = spec.parts.mapIndexed { p, part -> resolveShape(part.shape, prefixes[p]) }
        val arcs = shapes.indices.fold(0L) { sum, p ->
            val shape = shapes[p]
            if (shape is ResolvedShape.Ring) sum + counts[p].toLong() * shape.segments else sum
        }
        if (arcs > MAX_ELEMENTS) fail("the spec draws $arcs ring arcs, the maximum is $MAX_ELEMENTS")

        val latest = offsets.fold(0.0) { acc, offset -> max(acc, offset) }
        warmup = ceil(latest / spec.duration) * spec.duration
    }

    /** State of every element at spec time [t]. */
    public fun evaluate(t: Double): List<ElementState> {
        val state = MutableElementState()
        return List(elementCount) { index ->
            evaluateInto(index, t, state)
            state.toElementState()
        }
    }

    /**
     * Spec time for a frozen [cycleProgress] in [0, 1] of the spec duration: whole cycles are
     * skipped until every element has started.
     */
    public fun timeForCycleProgress(cycleProgress: Double): Double =
        warmup + min(1.0, max(0.0, cycleProgress)) * spec.duration

    internal fun partOf(index: Int): Int = partOf[index]

    internal fun evaluateInto(index: Int, t: Double, out: MutableElementState) {
        val partIndex = partOf[index]
        val part = parts[partIndex]

        val values = out.values
        part.rest.copyInto(values)
        val local = t - offsets[index]
        if (local >= 0) {
            val p = (local % durations[index]) / durations[index]
            for (track in part.tracks) values[track.property] = track.sample(p)
        }

        val group = out.group
        GROUP_REST.copyInto(group)
        if (t >= 0) {
            val p = (t % part.duration) / part.duration
            for (track in part.groupTracks) group[track.property] = track.sample(p)
        }

        out.index = index
        out.part = partIndex
        out.cx = cx[index]
        out.cy = cy[index]
        out.width = width[index]
        out.height = height[index]
        out.scaleX = values[SCALE] * values[SCALE_X]
        out.scaleY = values[SCALE] * values[SCALE_Y]
        out.opacity = values[OPACITY] * group[GROUP_OPACITY]
        out.rotate = layoutRotate[index] + values[ROTATE]
        out.rotateX = values[ROTATE_X]
        out.rotateY = values[ROTATE_Y]
        out.translateX = values[TRANSLATE_X]
        out.translateY = values[TRANSLATE_Y]
        out.strokeStart = values[STROKE_START]
        out.strokeEnd = values[STROKE_END]
        out.groupScaleX = group[GROUP_SCALE] * group[GROUP_SCALE_X]
        out.groupScaleY = group[GROUP_SCALE] * group[GROUP_SCALE_Y]
        out.groupRotate = group[GROUP_ROTATE]
        out.groupTranslateX = group[GROUP_TRANSLATE_X]
        out.groupTranslateY = group[GROUP_TRANSLATE_Y]
    }

    private fun resolve(value: Num): Double = when (value) {
        is Num.Value -> value.value
        is Num.Param -> params[value.name] ?: fail("Unknown param \"${value.name}\"")
    }

    private fun resolveOr(value: Num?, fallback: Double): Double = if (value == null) fallback else resolve(value)

    /** Counts are rounded like JavaScript `Math.round` and are at least 1. */
    private fun count(value: Num, path: String): Int {
        val raw = resolve(value)
        if (!raw.isFinite()) fail("$path resolves to $raw, which is not a count")
        val floor = floor(raw)
        val rounded = max(1.0, if (raw - floor >= 0.5) floor + 1 else floor)
        if (rounded > MAX_ELEMENTS) fail("$path resolves to $raw, the maximum is $MAX_ELEMENTS")
        return rounded.toInt()
    }

    private fun layoutCount(layout: Layout, prefix: String): Int = when (layout) {
        is Layout.Single -> 1
        is Layout.Stack -> count(layout.count, "${prefix}layout.count")
        is Layout.Row -> count(layout.count, "${prefix}layout.count")
        is Layout.Ring -> count(layout.count, "${prefix}layout.count")
        is Layout.Grid -> {
            val total = count(layout.columns, "${prefix}layout.columns").toLong() *
                count(layout.rows, "${prefix}layout.rows")
            if (total > MAX_ELEMENTS) fail("${prefix}layout has $total elements, the maximum is $MAX_ELEMENTS")
            total.toInt()
        }
    }

    private fun fillLayout(layout: Layout, first: Int, count: Int) {
        fun place(i: Int, x: Double, y: Double, w: Double, h: Double, rotate: Double = 0.0) {
            cx[first + i] = x
            cy[first + i] = y
            width[first + i] = w
            height[first + i] = h
            layoutRotate[first + i] = rotate
        }
        fun stack(size: Num?, w: Num?, h: Num?, x: Num?, y: Num?) {
            val side = resolveOr(size, 1.0)
            val width = resolveOr(w, side)
            val height = resolveOr(h, side)
            val centerX = resolveOr(x, 0.5)
            val centerY = resolveOr(y, 0.5)
            for (i in 0 until count) place(i, centerX, centerY, width, height)
        }
        when (layout) {
            is Layout.Single -> stack(layout.size, layout.width, layout.height, layout.x, layout.y)
            is Layout.Stack -> stack(layout.size, layout.width, layout.height, layout.x, layout.y)
            is Layout.Row -> {
                val gap = resolve(layout.gap)
                val w = resolveOr(layout.itemWidth, (1 - gap * (count - 1)) / count)
                val h = resolveOr(layout.itemHeight, w)
                val start = (1 - (count * w + (count - 1) * gap)) / 2
                for (i in 0 until count) place(i, start + w / 2 + i * (w + gap), 0.5, w, h)
            }
            is Layout.Grid -> {
                val columns = count(layout.columns, "layout.columns")
                val rows = count(layout.rows, "layout.rows")
                val gap = resolve(layout.gap)
                val w = (1 - gap * (columns - 1)) / columns
                val h = (1 - gap * (rows - 1)) / rows
                for (i in 0 until count) {
                    place(i, w / 2 + (i % columns) * (w + gap), h / 2 + (i / columns) * (h + gap), w, h)
                }
            }
            is Layout.Ring -> {
                val size = resolve(layout.itemSize)
                val start = resolveOr(layout.startAngle, 0.0)
                val radius = 0.5 - size / 2
                val w = resolveOr(layout.itemWidth, size)
                val h = resolveOr(layout.itemHeight, size)
                for (i in 0 until count) {
                    val angle = start + (i * 2 * PI) / count
                    place(i, 0.5 + radius * cos(angle), 0.5 + radius * sin(angle), w, h, if (layout.orient) angle + PI / 2 else 0.0)
                }
            }
        }
    }

    private fun fillOffsets(stagger: Stagger?, first: Int, count: Int) {
        when (stagger) {
            null -> Unit
            is Stagger.Each -> for (i in 0 until count) offsets[first + i] = stagger.start + stagger.each * i
            is Stagger.Offsets -> {
                if (stagger.offsets.size < count) {
                    fail("stagger has ${stagger.offsets.size} entries but the layout has $count elements")
                }
                for (i in 0 until count) offsets[first + i] = stagger.offsets[i]
            }
        }
    }

    private fun resolveShape(shape: Shape, prefix: String): ResolvedShape = when (shape) {
        is Shape.Circle -> ResolvedShape.Circle(resolveOr(shape.startAngle, -PI / 2), resolveOr(shape.sweep, 2 * PI))
        is Shape.Rect -> ResolvedShape.Rect(resolveOr(shape.cornerRadius, 0.0))
        is Shape.Ring -> ResolvedShape.Ring(
            strokeWidth = resolve(shape.strokeWidth),
            startAngle = resolveOr(shape.startAngle, -PI / 2),
            sweep = resolveOr(shape.sweep, 2 * PI),
            segments = shape.segments?.let { count(it, "${prefix}shape.segments") } ?: 1,
        )
        Shape.Triangle -> ResolvedShape.Triangle
        Shape.Line -> ResolvedShape.Line
    }

    private fun prepareTrack(property: Int, keyTimes: List<Double>, values: List<Num>, easing: TrackEasing?) =
        PreparedTrack(
            property = property,
            keyTimes = keyTimes.toDoubleArray(),
            values = DoubleArray(values.size) { resolve(values[it]) },
            easings = Array(keyTimes.size - 1) { k ->
                when (easing) {
                    null -> NamedEasing.Linear.controlPoints
                    is TrackEasing.Uniform -> easing.easing.controlPoints
                    is TrackEasing.PerSegment -> easing.easings[k].controlPoints
                }
            },
        )

    private fun fail(message: String): Nothing = throw InvalidIndicatorSpecException(listOf(message))
}

private val ELEMENT_PROPERTIES = AnimatableProperty.entries
private val GROUP_REST = DoubleArray(GroupProperty.entries.size) { GroupProperty.entries[it].restValue }

private val SCALE = AnimatableProperty.Scale.ordinal
private val SCALE_X = AnimatableProperty.ScaleX.ordinal
private val SCALE_Y = AnimatableProperty.ScaleY.ordinal
private val OPACITY = AnimatableProperty.Opacity.ordinal
private val ROTATE = AnimatableProperty.Rotate.ordinal
private val ROTATE_X = AnimatableProperty.RotateX.ordinal
private val ROTATE_Y = AnimatableProperty.RotateY.ordinal
private val TRANSLATE_X = AnimatableProperty.TranslateX.ordinal
private val TRANSLATE_Y = AnimatableProperty.TranslateY.ordinal
private val STROKE_START = AnimatableProperty.StrokeStart.ordinal
private val STROKE_END = AnimatableProperty.StrokeEnd.ordinal
private val GROUP_SCALE = GroupProperty.Scale.ordinal
private val GROUP_SCALE_X = GroupProperty.ScaleX.ordinal
private val GROUP_SCALE_Y = GroupProperty.ScaleY.ordinal
private val GROUP_OPACITY = GroupProperty.Opacity.ordinal
private val GROUP_ROTATE = GroupProperty.Rotate.ordinal
private val GROUP_TRANSLATE_X = GroupProperty.TranslateX.ordinal
private val GROUP_TRANSLATE_Y = GroupProperty.TranslateY.ordinal

private class PreparedPart(
    /** Cycle length of the group tracks. */
    val duration: Double,
    /** Values of properties without a track, by [AnimatableProperty] ordinal. */
    val rest: DoubleArray,
    val tracks: Array<PreparedTrack>,
    val groupTracks: Array<PreparedTrack>,
)

private class PreparedTrack(
    /** Ordinal of the [AnimatableProperty] or [GroupProperty] it drives. */
    val property: Int,
    val keyTimes: DoubleArray,
    val values: DoubleArray,
    val easings: Array<CubicBezier>,
) {
    /** Value at cycle progress [p] in [0, 1) (SPEC §5.2). */
    fun sample(p: Double): Double {
        val last = keyTimes.size - 1
        if (p <= keyTimes[0]) return values[0]
        if (p >= keyTimes[last]) return values[last]

        var k = 0
        while (k < last - 1 && p >= keyTimes[k + 1]) k++
        val start = keyTimes[k]
        val end = keyTimes[k + 1]
        val u = if (end > start) (p - start) / (end - start) else 1.0
        val easing = easings[k]
        val eased = cubicBezier(easing.x1, easing.y1, easing.x2, easing.y2, u)
        return values[k] + (values[k + 1] - values[k]) * eased
    }
}

/** Mutable twin of [ElementState], reused across frames by the renderers. */
internal class MutableElementState {
    var index = 0
    var part = 0
    var cx = 0.0
    var cy = 0.0
    var width = 0.0
    var height = 0.0
    var scaleX = 1.0
    var scaleY = 1.0
    var opacity = 1.0
    var rotate = 0.0
    var rotateX = 0.0
    var rotateY = 0.0
    var translateX = 0.0
    var translateY = 0.0
    var strokeStart = 0.0
    var strokeEnd = 1.0
    var groupScaleX = 1.0
    var groupScaleY = 1.0
    var groupRotate = 0.0
    var groupTranslateX = 0.0
    var groupTranslateY = 0.0

    /** Scratch property values of [PreparedIndicator.evaluateInto], by ordinal. */
    val values = DoubleArray(AnimatableProperty.entries.size)
    val group = DoubleArray(GroupProperty.entries.size)

    fun toElementState() = ElementState(
        index, part, cx, cy, width, height, scaleX, scaleY, opacity, rotate, rotateX, rotateY, translateX, translateY,
        strokeStart, strokeEnd, groupScaleX, groupScaleY, groupRotate, groupTranslateX, groupTranslateY,
    )
}
