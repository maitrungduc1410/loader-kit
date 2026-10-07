package io.github.maitrungduc1410.loaderkit

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs
import kotlin.math.pow

/** Mirrors `spec/test/easing.test.ts`. */
class EasingTest {

    @Test
    fun endpointsAreExact() {
        for (named in NamedEasing.entries) {
            val points = named.controlPoints
            assertEquals(0.0, points.transform(0.0), 0.0)
            assertEquals(1.0, points.transform(1.0), 0.0)
            assertEquals(0.0, points.transform(-0.5), 0.0)
            assertEquals(1.0, points.transform(1.5), 0.0)
        }
    }

    @Test
    fun linearIsTheIdentity() {
        for (x in listOf(0.1, 0.25, 0.5, 0.9)) assertEquals(x, NamedEasing.Linear.controlPoints.transform(x), 0.0)
    }

    @Test
    fun easeInOutIsSymmetric() {
        val easing = NamedEasing.EaseInOut.controlPoints
        for (x in listOf(0.1, 0.3, 0.45)) {
            assertTrue(abs(easing.transform(x) + easing.transform(1 - x) - 1) < 1e-9)
        }
    }

    @Test
    fun solvesXBeforeSamplingY() {
        val points = CubicBezier(0.2, 0.68, 0.18, 1.08)
        for (x in listOf(0.05, 0.2, 0.5, 0.8, 0.95)) {
            val y = points.transform(x)
            var lo = 0.0
            var hi = 1.0
            repeat(200) {
                val t = (lo + hi) / 2
                val xt = 3 * (1 - t).pow(2) * t * points.x1 + 3 * (1 - t) * t.pow(2) * points.x2 + t.pow(3)
                if (xt < x) lo = t else hi = t
            }
            val t = (lo + hi) / 2
            val expected = 3 * (1 - t).pow(2) * t * points.y1 + 3 * (1 - t) * t.pow(2) * points.y2 + t.pow(3)
            assertTrue("x=$x: $y vs $expected", abs(y - expected) < 1e-7)
        }
    }

    @Test
    fun overshootingCurvesLeaveTheUnitRange() {
        assertTrue(CubicBezier(0.2, 0.68, 0.18, 1.08).transform(0.8) > 1)
        assertTrue(CubicBezier(0.68, -0.55, 0.27, 1.55).transform(0.1) < 0)
    }

    @Test
    fun namedEasingsUseTheCoreAnimationControlPoints() {
        assertEquals(CubicBezier(0.0, 0.0, 1.0, 1.0), NamedEasing.Linear.controlPoints)
        assertEquals(CubicBezier(0.42, 0.0, 1.0, 1.0), NamedEasing.EaseIn.controlPoints)
        assertEquals(CubicBezier(0.0, 0.0, 0.58, 1.0), NamedEasing.EaseOut.controlPoints)
        assertEquals(CubicBezier(0.42, 0.0, 0.58, 1.0), NamedEasing.EaseInOut.controlPoints)
        val bezier = CubicBezier(0.1, 0.2, 0.3, 0.4)
        assertEquals(bezier, bezier.controlPoints)
    }
}
