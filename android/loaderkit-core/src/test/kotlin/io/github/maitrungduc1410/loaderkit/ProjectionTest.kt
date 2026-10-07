package io.github.maitrungduc1410.loaderkit

import org.junit.Assert.assertEquals
import org.junit.Test
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

/** The renderer's matrix must reproduce the step-by-step composition of SPEC §6. */
class ProjectionTest {

    private data class Point(val x: Double, val y: Double)

    /** SPEC §6 applied literally in box units, group transform included, then placed in a box of side [size] at ([left], [top]). */
    private fun reference(s: MutableElementState, d: Double, left: Double, top: Double, size: Double, p: Point): Point {
        var x = p.x * s.scaleX
        var y = p.y * s.scaleY
        var z = 0.0
        run {
            val y1 = y * cos(s.rotateX) - z * sin(s.rotateX)
            z = y * sin(s.rotateX) + z * cos(s.rotateX)
            y = y1
        }
        run {
            val x1 = x * cos(s.rotateY) + z * sin(s.rotateY)
            z = -x * sin(s.rotateY) + z * cos(s.rotateY)
            x = x1
        }
        run {
            val x1 = x * cos(s.rotate) - y * sin(s.rotate)
            y = x * sin(s.rotate) + y * cos(s.rotate)
            x = x1
        }
        if (s.rotateX != 0.0 || s.rotateY != 0.0) {
            x = x * d / (d - z)
            y = y * d / (d - z)
        }
        x += s.cx + s.translateX
        y += s.cy + s.translateY
        run {
            val gx = (x - 0.5) * s.groupScaleX
            val gy = (y - 0.5) * s.groupScaleY
            x = gx * cos(s.groupRotate) - gy * sin(s.groupRotate) + 0.5 + s.groupTranslateX
            y = gx * sin(s.groupRotate) + gy * cos(s.groupRotate) + 0.5 + s.groupTranslateY
        }
        return Point(left + x * size, top + y * size)
    }

    private fun project(m: DoubleArray, x: Double, y: Double): Point {
        val w = m[6] * x + m[7] * y + m[8]
        return Point((m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w)
    }

    @Test
    fun matrixMatchesTheSpecComposition() {
        val random = Random(1410)
        val matrix = DoubleArray(9)
        repeat(500) { case ->
            val state = MutableElementState().apply {
                cx = random.nextDouble()
                cy = random.nextDouble()
                width = random.nextDouble(0.1, 1.0)
                height = random.nextDouble(0.1, 1.0)
                scaleX = random.nextDouble(-1.5, 1.5)
                scaleY = random.nextDouble(-1.5, 1.5)
                rotate = random.nextDouble(-7.0, 7.0)
                rotateX = if (case % 3 == 0) 0.0 else random.nextDouble(-7.0, 7.0)
                rotateY = if (case % 4 == 0) 0.0 else random.nextDouble(-7.0, 7.0)
                translateX = random.nextDouble(-0.3, 0.3)
                translateY = random.nextDouble(-0.3, 0.3)
                if (case % 5 != 0) {
                    groupScaleX = random.nextDouble(-1.5, 1.5)
                    groupScaleY = random.nextDouble(-1.5, 1.5)
                    groupRotate = random.nextDouble(-7.0, 7.0)
                    groupTranslateX = random.nextDouble(-0.3, 0.3)
                    groupTranslateY = random.nextDouble(-0.3, 0.3)
                }
            }
            val perspective = if (case % 2 == 0) DEFAULT_PERSPECTIVE else random.nextDouble(2.0, 10.0)
            val size = random.nextDouble(10.0, 500.0)
            val left = random.nextDouble(0.0, 100.0)
            val top = random.nextDouble(0.0, 100.0)
            elementMatrix(state, perspective, left, top, size, matrix)

            for (corner in listOf(Point(-0.5, -0.5), Point(0.5, -0.5), Point(0.5, 0.5), Point(-0.5, 0.5), Point(0.0, 0.0))) {
                val local = Point(corner.x * state.width, corner.y * state.height)
                val expected = reference(state, perspective, left, top, size, local)
                val actual = project(matrix, local.x * size, local.y * size)
                assertEquals("case $case x", expected.x, actual.x, 1e-9 * size)
                assertEquals("case $case y", expected.y, actual.y, 1e-9 * size)
            }
        }
    }
}
