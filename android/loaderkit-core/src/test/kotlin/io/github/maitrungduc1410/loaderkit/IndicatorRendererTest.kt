package io.github.maitrungduc1410.loaderkit

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import kotlin.math.PI

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class IndicatorRendererTest {

    private val renderer = IndicatorRenderer().apply { color = Color.RED }
    private val still = Track(AnimatableProperty.Opacity, listOf(0.0, 1.0), listOf(Num(1.0), Num(1.0)))

    /** Draws [spec] at t = 0 in a 200 px box. */
    private fun render(spec: IndicatorSpec, t: Double = 0.0): Bitmap {
        val bitmap = Bitmap.createBitmap(SIZE, SIZE, Bitmap.Config.ARGB_8888)
        renderer.draw(Canvas(bitmap), PreparedIndicator(spec), t, 0f, 0f, SIZE.toFloat())
        return bitmap
    }

    /** Pixel at box coordinates ([x], [y]) in [0, 1]. */
    private fun Bitmap.at(x: Double, y: Double): Int = getPixel((x * SIZE).toInt(), (y * SIZE).toInt())

    private fun ring(rest: Map<AnimatableProperty, Num> = emptyMap(), sweep: Double? = null, segments: Double? = null) =
        IndicatorSpec(
            name = "Ring",
            duration = 1.0,
            layout = Layout.Single(),
            shape = Shape.Ring(Num(0.1), sweep = sweep?.let(::Num), segments = segments?.let(::Num)),
            rest = rest,
            tracks = listOf(still),
        )

    @Test
    fun everyBuiltInDraws() {
        for (name in BuiltinIndicators.names) {
            val prepared = PreparedIndicator(BuiltinIndicators.require(name))
            val drawn = listOf(0.0, 0.25, 0.5, 0.75).count { cycleProgress ->
                val bitmap = Bitmap.createBitmap(SIZE, SIZE, Bitmap.Config.ARGB_8888)
                renderer.draw(Canvas(bitmap), prepared, prepared.timeForCycleProgress(cycleProgress), 0f, 0f, SIZE.toFloat())
                val pixels = IntArray(SIZE * SIZE).also { bitmap.getPixels(it, 0, SIZE, 0, 0, SIZE, SIZE) }
                pixels.any { Color.alpha(it) > 0 }
            }
            assertTrue("$name draws nothing", drawn > 0)
        }
    }

    @Test
    fun circleSegmentUsesTheParametricAngle() {
        // A 1 × 0.5 ellipse cut by the chord of its arc from 0 to π/4 (clockwise, so below the center).
        val spec = IndicatorSpec(
            name = "Segment",
            duration = 1.0,
            layout = Layout.Single(height = Num(0.5)),
            shape = Shape.Circle(startAngle = Num(0.0), sweep = Num(PI / 4)),
            tracks = listOf(still),
        )
        val bitmap = render(spec)
        assertEquals(Color.RED, bitmap.at(0.5 + 0.44, 0.5 + 0.1))
        // Inside the segment if the arc ended at the polar angle π/4, outside with the parametric one.
        assertEquals(Color.TRANSPARENT, bitmap.at(0.5 + 0.275, 0.5 + 0.198))
        assertEquals(Color.TRANSPARENT, bitmap.at(0.5, 0.5))
        assertEquals(Color.TRANSPARENT, bitmap.at(0.5 + 0.3, 0.5 - 0.1))
    }

    @Test
    fun ringTrimsEveryArc() {
        // Radius (1 - 0.1) / 2 = 0.45; points on it at 45° steps from the right, clockwise.
        val r = 0.45 * 0.7071
        val trimmed = render(ring(rest = mapOf(AnimatableProperty.StrokeStart to Num(0.25), AnimatableProperty.StrokeEnd to Num(0.5))))
        assertEquals("bottom right", Color.RED, trimmed.at(0.5 + r, 0.5 + r))
        assertEquals("top", Color.TRANSPARENT, trimmed.at(0.5, 0.05))
        assertEquals("top left", Color.TRANSPARENT, trimmed.at(0.5 - r, 0.5 - r))

        val segments = render(ring(sweep = PI / 2, segments = 2.0))
        assertEquals("top right", Color.RED, segments.at(0.5 + r, 0.5 - r))
        assertEquals("bottom left", Color.RED, segments.at(0.5 - r, 0.5 + r))
        assertEquals("bottom right", Color.TRANSPARENT, segments.at(0.5 + r, 0.5 + r))
        assertEquals("top left", Color.TRANSPARENT, segments.at(0.5 - r, 0.5 - r))

        val empty = render(ring(rest = mapOf(AnimatableProperty.StrokeStart to Num(0.6), AnimatableProperty.StrokeEnd to Num(0.4))))
        assertEquals(Color.TRANSPARENT, empty.at(0.5 + r, 0.5 + r))
        assertEquals(Color.TRANSPARENT, empty.at(0.5, 0.05))
    }

    @Test
    fun ringWithoutAPositiveStrokeThatFitsDrawsNothing() {
        val spec = IndicatorSpec(
            name = "Ring",
            duration = 1.0,
            params = mapOf("w" to 0.1),
            layout = Layout.Single(),
            shape = Shape.Ring(param("w")),
            tracks = listOf(still),
        )
        fun drawWith(strokeWidth: Double): Bitmap {
            val bitmap = Bitmap.createBitmap(SIZE, SIZE, Bitmap.Config.ARGB_8888)
            val prepared = PreparedIndicator(spec, mapOf("w" to strokeWidth))
            renderer.draw(Canvas(bitmap), prepared, 0.0, 0f, 0f, SIZE.toFloat())
            return bitmap
        }
        assertEquals(Color.RED, drawWith(0.1).at(0.5, 0.05))
        for (strokeWidth in listOf(0.0, -0.1, 1.5, Double.NaN)) {
            val pixels = IntArray(SIZE * SIZE).also { drawWith(strokeWidth).getPixels(it, 0, SIZE, 0, 0, SIZE, SIZE) }
            assertTrue("strokeWidth $strokeWidth draws", pixels.all { Color.alpha(it) == 0 })
        }
    }

    @Test
    fun groupTracksMoveTheWholePart() {
        fun groupTrack(property: GroupProperty, value: Double) =
            GroupTrack(property, listOf(0.0, 1.0), listOf(Num(value), Num(value)))
        val spec = IndicatorSpec(
            name = "Group",
            duration = 1.0,
            layout = Layout.Single(size = Num(0.2), x = Num(0.8)),
            shape = Shape.Circle(),
            groupTracks = listOf(groupTrack(GroupProperty.Rotate, PI / 2), groupTrack(GroupProperty.Opacity, 0.5)),
        )
        val bitmap = render(spec)
        val moved = bitmap.at(0.5, 0.8)
        assertEquals(128.0, Color.alpha(moved).toDouble(), 1.0)
        assertEquals(255.0, Color.red(moved).toDouble(), 2.0)
        assertEquals(0, Color.green(moved))
        assertEquals(Color.TRANSPARENT, bitmap.at(0.8, 0.5))
    }

    private companion object {
        const val SIZE = 200
    }
}
