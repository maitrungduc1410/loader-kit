@file:JvmName("Easings")

package io.github.maitrungduc1410.loaderkit

import kotlin.math.abs

private const val EPSILON = 1e-7

/**
 * Eased progress for [x] in [0, 1] on the cubic bezier `(0,0) (x1,y1) (x2,y2) (1,1)`.
 *
 * Every LoaderKit engine uses this exact algorithm (SPEC §5.3): Newton-Raphson (at most 8 steps),
 * then bisection (at most 50 steps), both stopping at an error below 1e-7.
 */
public fun cubicBezier(x1: Double, y1: Double, x2: Double, y2: Double, x: Double): Double {
    if (x <= 0) return 0.0
    if (x >= 1) return 1.0
    if (x1 == y1 && x2 == y2) return x

    val cx = 3 * x1
    val bx = 3 * (x2 - x1) - cx
    val ax = 1 - cx - bx
    val cy = 3 * y1
    val by = 3 * (y2 - y1) - cy
    val ay = 1 - cy - by

    var t = x
    for (i in 0 until 8) {
        val error = ((ax * t + bx) * t + cx) * t - x
        if (abs(error) < EPSILON) return ((ay * t + by) * t + cy) * t
        val slope = (3 * ax * t + 2 * bx) * t + cx
        if (abs(slope) < EPSILON) break
        t -= error / slope
    }

    var lo = 0.0
    var hi = 1.0
    t = x
    for (i in 0 until 50) {
        val value = ((ax * t + bx) * t + cx) * t
        if (abs(value - x) < EPSILON) break
        if (value < x) lo = t else hi = t
        t = (lo + hi) / 2
    }
    return ((ay * t + by) * t + cy) * t
}
