package io.github.maitrungduc1410.loaderkit

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.SweepGradient
import android.graphics.Typeface
import android.os.Build
import androidx.annotation.ColorInt
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Draws a [ProgressDrawing] on an Android [Canvas]. Coordinates of the drawing are in dp; [draw]
 * scales them by the density. One renderer can be reused for every frame.
 */
public class ProgressRenderer {
    /** The progress color. */
    @ColorInt
    public var color: Int = Color.BLACK

    /** The track color; null draws the track in [color] at 24% opacity. */
    @ColorInt
    public var trackColor: Int? = null

    /** The percentage color. */
    @ColorInt
    public var labelColor: Int = Color.BLACK

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val path = Path()
    private val oval = RectF()
    private val matrix = Matrix()
    private val typeface: Typeface =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) Typeface.create(Typeface.DEFAULT, 600, false) else Typeface.DEFAULT_BOLD

    /** Draws [drawing] with its box at [left], [top] in pixels, [density] pixels per dp. */
    public fun draw(canvas: Canvas, drawing: ProgressDrawing, left: Float, top: Float, density: Float) {
        val save = canvas.save()
        canvas.translate(left + drawing.x.toFloat() * density, top + drawing.y.toFloat() * density)
        canvas.scale(density, density)
        draw(canvas, drawing.commands)
        canvas.restoreToCount(save)
    }

    @ColorInt
    private fun role(role: ProgressColorRole, alpha: Double): Int {
        var factor = alpha
        val base = when (role) {
            ProgressColorRole.Color -> color
            ProgressColorRole.Track -> trackColor ?: color.also { factor *= DEFAULT_TRACK_ALPHA }
            ProgressColorRole.Label -> labelColor
            ProgressColorRole.White -> Color.WHITE
        }
        if (factor >= 1) return base
        val a = (Color.alpha(base) * max(0.0, factor)).roundToInt().coerceIn(0, 255)
        return (base and 0x00FFFFFF) or (a shl 24)
    }

    private fun stops(stops: List<ProgressColorStop>): Pair<IntArray, FloatArray> {
        val colors = IntArray(stops.size) { role(stops[it].color, stops[it].alpha) }
        var last = 0f
        val positions = FloatArray(stops.size) {
            last = max(last, stops[it].offset.toFloat().coerceIn(0f, 1f))
            last
        }
        return colors to positions
    }

    private fun apply(target: ProgressPaint) {
        paint.shader = null
        paint.color = Color.BLACK
        val gradientStops = when (target) {
            is ProgressPaint.Solid -> {
                paint.color = role(target.color, target.alpha)
                return
            }
            is ProgressPaint.Linear -> target.stops
            is ProgressPaint.Radial -> target.stops
            is ProgressPaint.Conic -> target.stops
        }
        if (gradientStops.size < 2) {
            gradientStops.firstOrNull()?.let { paint.color = role(it.color, it.alpha) }
            return
        }
        val (colors, positions) = stops(gradientStops)
        paint.shader = when (target) {
            is ProgressPaint.Solid -> null
            is ProgressPaint.Linear -> LinearGradient(
                target.x0.toFloat(), target.y0.toFloat(), target.x1.toFloat(), target.y1.toFloat(),
                colors, positions, Shader.TileMode.CLAMP,
            )
            is ProgressPaint.Radial -> RadialGradient(
                target.cx.toFloat(), target.cy.toFloat(), max(1e-3, target.r).toFloat(),
                colors, positions, Shader.TileMode.CLAMP,
            )
            is ProgressPaint.Conic -> SweepGradient(target.cx.toFloat(), target.cy.toFloat(), colors, positions).apply {
                matrix.setRotate(degrees(target.start), target.cx.toFloat(), target.cy.toFloat())
                setLocalMatrix(matrix)
            }
        }
    }

    private fun stroke(lineWidth: Double, cap: ProgressStrokeCap, target: ProgressPaint) {
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = lineWidth.toFloat()
        paint.strokeCap = if (cap == ProgressStrokeCap.Round) Paint.Cap.ROUND else Paint.Cap.BUTT
        paint.strokeJoin = Paint.Join.ROUND
        apply(target)
    }

    private fun fill(target: ProgressPaint) {
        paint.style = Paint.Style.FILL
        apply(target)
    }

    private fun polygon(points: List<Double>, closed: Boolean) {
        path.reset()
        var i = 0
        while (i + 1 < points.size) {
            if (i == 0) path.moveTo(points[0].toFloat(), points[1].toFloat()) else path.lineTo(points[i].toFloat(), points[i + 1].toFloat())
            i += 2
        }
        if (closed) path.close()
    }

    private fun roundRect(x: Double, y: Double, width: Double, height: Double, radius: Double) {
        val r = max(0.0, min(radius, min(width, height) / 2)).toFloat()
        path.reset()
        oval.set(x.toFloat(), y.toFloat(), (x + width).toFloat(), (y + height).toFloat())
        path.addRoundRect(oval, r, r, Path.Direction.CW)
    }

    private fun degrees(radians: Double) = Math.toDegrees(radians).toFloat()

    private fun draw(canvas: Canvas, commands: List<ProgressCommand>) {
        for (command in commands) {
            when (command) {
                is ProgressCommand.Line -> {
                    stroke(command.lineWidth, command.cap, command.paint)
                    canvas.drawLine(command.x0.toFloat(), command.y0.toFloat(), command.x1.toFloat(), command.y1.toFloat(), paint)
                }
                is ProgressCommand.Arc -> {
                    stroke(command.lineWidth, command.cap, command.paint)
                    val r = command.r.toFloat()
                    oval.set(command.cx.toFloat() - r, command.cy.toFloat() - r, command.cx.toFloat() + r, command.cy.toFloat() + r)
                    canvas.drawArc(oval, degrees(command.start), degrees(command.end - command.start), false, paint)
                }
                is ProgressCommand.Polyline -> {
                    stroke(command.lineWidth, command.cap, command.paint)
                    polygon(command.points, command.closed)
                    canvas.drawPath(path, paint)
                }
                is ProgressCommand.Circle -> {
                    fill(command.paint)
                    canvas.drawCircle(command.cx.toFloat(), command.cy.toFloat(), command.r.toFloat(), paint)
                }
                is ProgressCommand.Rect -> {
                    fill(command.paint)
                    roundRect(command.x, command.y, command.width, command.height, command.radius)
                    canvas.drawPath(path, paint)
                }
                is ProgressCommand.StrokeRect -> {
                    stroke(command.lineWidth, ProgressStrokeCap.Butt, command.paint)
                    roundRect(command.x, command.y, command.width, command.height, command.radius)
                    canvas.drawPath(path, paint)
                }
                is ProgressCommand.Polygon -> {
                    fill(command.paint)
                    polygon(command.points, true)
                    canvas.drawPath(path, paint)
                }
                is ProgressCommand.Sector -> {
                    fill(command.paint)
                    val r = command.r.toFloat()
                    oval.set(command.cx.toFloat() - r, command.cy.toFloat() - r, command.cx.toFloat() + r, command.cy.toFloat() + r)
                    val sweep = degrees(command.end - command.start)
                    path.reset()
                    if (sweep >= 360f) {
                        path.addOval(oval, Path.Direction.CW)
                    } else {
                        path.moveTo(command.cx.toFloat(), command.cy.toFloat())
                        path.arcTo(oval, degrees(command.start), sweep, false)
                        path.close()
                    }
                    canvas.drawPath(path, paint)
                }
                is ProgressCommand.Text -> {
                    fill(command.paint)
                    paint.typeface = typeface
                    paint.textSize = command.size.toFloat()
                    paint.textAlign = if (command.alignRight) Paint.Align.RIGHT else Paint.Align.CENTER
                    val metrics = paint.fontMetrics
                    canvas.drawText(command.text, command.x.toFloat(), command.y.toFloat() - (metrics.ascent + metrics.descent) / 2, paint)
                }
                is ProgressCommand.Clip -> {
                    val save = canvas.save()
                    when (val shape = command.shape) {
                        is ProgressClipShape.Rect -> roundRect(shape.x, shape.y, shape.width, shape.height, shape.radius)
                        is ProgressClipShape.Circle -> {
                            path.reset()
                            path.addCircle(shape.cx.toFloat(), shape.cy.toFloat(), shape.r.toFloat(), Path.Direction.CW)
                        }
                        is ProgressClipShape.Polygon -> polygon(shape.points, true)
                    }
                    canvas.clipPath(path)
                    draw(canvas, command.commands)
                    canvas.restoreToCount(save)
                }
            }
        }
    }

    public companion object {
        /** Opacity of the track when no track color is set. */
        public const val DEFAULT_TRACK_ALPHA: Double = 0.24
    }
}
