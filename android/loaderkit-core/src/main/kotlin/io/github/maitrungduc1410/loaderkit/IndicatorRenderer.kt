package io.github.maitrungduc1410.loaderkit

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import androidx.annotation.ColorInt
import kotlin.math.PI
import kotlin.math.min
import kotlin.math.roundToInt

private const val FULL_TURN = 2 * PI

/** Sweeps this close to a full turn are drawn as closed shapes, without a seam. */
private const val FULL_TURN_EPSILON = 1e-9

/**
 * Draws a [PreparedIndicator] on a [Canvas] following SPEC §4, §6 and §7. [LoaderKitView] and the
 * Compose indicator both use it; it holds the scratch objects so [draw] never allocates.
 */
public class IndicatorRenderer {
    @ColorInt
    public var color: Int = Color.BLACK

    /** Element `i` uses `colors[i % colors.size]`; null or empty means every element uses [color]. */
    public var colors: IntArray? = null

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { strokeCap = Paint.Cap.BUTT }
    private val path = Path()
    private val oval = RectF()
    private val matrix = Matrix()
    private val values = DoubleArray(9)
    private val floats = FloatArray(9)
    private val state = MutableElementState()

    /** Draws [indicator] at spec time [time] in the square box of side [size] at ([left], [top]). */
    public fun draw(canvas: Canvas, indicator: PreparedIndicator, time: Double, left: Float, top: Float, size: Float) {
        if (size <= 0f) return
        val palette = colors?.takeIf { it.isNotEmpty() }
        for (index in 0 until indicator.elementCount) {
            indicator.evaluateInto(index, time, state)
            val base = if (palette != null) palette[index % palette.size] else color
            val alpha = (Color.alpha(base) * state.opacity.coerceIn(0.0, 1.0)).roundToInt()
            if (alpha == 0) continue

            elementMatrix(state, indicator.perspective, left.toDouble(), top.toDouble(), size.toDouble(), values)
            for (i in 0 until 9) floats[i] = values[i].toFloat()
            matrix.setValues(floats)

            paint.color = base
            paint.alpha = alpha
            val w = (state.width * size).toFloat()
            val h = (state.height * size).toFloat()
            canvas.save()
            canvas.concat(matrix)
            drawShape(canvas, indicator.shapes[state.part], w, h)
            canvas.restore()
        }
    }

    private fun drawShape(canvas: Canvas, shape: ResolvedShape, w: Float, h: Float) {
        val shorter = min(w, h)
        val halfW = w / 2
        val halfH = h / 2
        paint.style = Paint.Style.FILL
        when (shape) {
            is ResolvedShape.Circle -> {
                val sweep = shape.sweep.coerceIn(0.0, FULL_TURN)
                if (sweep >= FULL_TURN - FULL_TURN_EPSILON) {
                    canvas.drawOval(-halfW, -halfH, halfW, halfH, paint)
                } else if (sweep > 0) {
                    // Android arcs use the parametric angle on an oval, as SPEC §4 asks.
                    canvas.drawArc(-halfW, -halfH, halfW, halfH, degrees(shape.startAngle), degrees(sweep), false, paint)
                }
            }
            is ResolvedShape.Rect -> {
                val radius = (shape.cornerRadius * shorter).toFloat()
                if (radius > 0f) {
                    canvas.drawRoundRect(-halfW, -halfH, halfW, halfH, radius, radius, paint)
                } else {
                    canvas.drawRect(-halfW, -halfH, halfW, halfH, paint)
                }
            }
            is ResolvedShape.Ring -> drawRing(canvas, shape, shorter)
            ResolvedShape.Triangle -> {
                path.rewind()
                path.moveTo(0f, -halfH)
                path.lineTo(halfW, halfH)
                path.lineTo(-halfW, halfH)
                path.close()
                canvas.drawPath(path, paint)
            }
            ResolvedShape.Line -> canvas.drawRoundRect(-halfW, -halfH, halfW, halfH, shorter / 2, shorter / 2, paint)
        }
    }

    private fun drawRing(canvas: Canvas, shape: ResolvedShape.Ring, shorter: Float) {
        val start = state.strokeStart.coerceIn(0.0, 1.0)
        val end = state.strokeEnd.coerceIn(0.0, 1.0)
        if (end <= start) return
        val stroke = (shape.strokeWidth * shorter).toFloat()
        val radius = (shorter - stroke) / 2
        // Paint draws a hairline for a zero width and keeps the previous width for a negative one.
        if (!(stroke > 0f) || !(radius >= 0f)) return
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = stroke

        val arc = shape.sweep.coerceIn(0.0, FULL_TURN)
        val sweep = arc * (end - start)
        if (sweep <= 0) return
        if (sweep >= FULL_TURN - FULL_TURN_EPSILON) {
            canvas.drawCircle(0f, 0f, radius, paint)
            return
        }
        oval.set(-radius, -radius, radius, radius)
        val sweepDegrees = degrees(sweep)
        for (k in 0 until shape.segments) {
            val from = shape.startAngle + k * FULL_TURN / shape.segments + start * arc
            canvas.drawArc(oval, degrees(from), sweepDegrees, false, paint)
        }
    }

    private fun degrees(radians: Double): Float = Math.toDegrees(radians).toFloat()
}
