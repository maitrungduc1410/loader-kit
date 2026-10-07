package io.github.maitrungduc1410.loaderkit

import kotlin.math.cos
import kotlin.math.sin

/**
 * Fills [out] with the row-major 3×3 projective matrix that maps a point of the shape, in pixels
 * relative to the element center, to view pixels:
 * `G · T(cx + tx, cy + ty) · P(d) · Rz · Ry · Rx · S` with
 * `G = T(0.5 + gtx, 0.5 + gty) · Rz(groupRotate) · S(gsx, gsy) · T(-0.5, -0.5)` (SPEC §6), for a
 * box of side [size] whose top-left corner is ([left], [top]).
 *
 * Shape points have z = 0, so the 4×4 transform reduces exactly to a 2D homogeneous matrix.
 */
internal fun elementMatrix(
    state: MutableElementState,
    perspective: Double,
    left: Double,
    top: Double,
    size: Double,
    out: DoubleArray,
) {
    val sinX = sin(state.rotateX)
    val cosX = cos(state.rotateX)
    val sinY = sin(state.rotateY)
    val cosY = cos(state.rotateY)
    val sinZ = sin(state.rotate)
    val cosZ = cos(state.rotate)
    val sx = state.scaleX
    val sy = state.scaleY

    // (x, y) -> (X, Y, Z) after scale, rotateX, rotateY and rotate.
    val xx = sx * cosY * cosZ
    val xy = sy * (sinX * sinY * cosZ - cosX * sinZ)
    val yx = sx * cosY * sinZ
    val yy = sy * (sinX * sinY * sinZ + cosX * cosZ)
    val zx = -sx * sinY
    val zy = sy * sinX * cosY

    // Perspective divides by w = (d - Z) / d, with d in pixels.
    val depth = perspective * size
    val wx = if (state.rotateX != 0.0 || state.rotateY != 0.0) -zx / depth else 0.0
    val wy = if (state.rotateX != 0.0 || state.rotateY != 0.0) -zy / depth else 0.0

    val tx = left + (state.cx + state.translateX) * size
    val ty = top + (state.cy + state.translateY) * size

    val m0 = xx + tx * wx
    val m1 = xy + tx * wy
    val m3 = yx + ty * wx
    val m4 = yy + ty * wy

    // The group transform is affine, around the box center, in view pixels.
    val sinG = sin(state.groupRotate)
    val cosG = cos(state.groupRotate)
    val a = cosG * state.groupScaleX
    val b = -sinG * state.groupScaleY
    val d = sinG * state.groupScaleX
    val e = cosG * state.groupScaleY
    val centerX = left + size / 2
    val centerY = top + size / 2
    val c = centerX + state.groupTranslateX * size - (a * centerX + b * centerY)
    val f = centerY + state.groupTranslateY * size - (d * centerX + e * centerY)

    out[0] = a * m0 + b * m3 + c * wx
    out[1] = a * m1 + b * m4 + c * wy
    out[2] = a * tx + b * ty + c
    out[3] = d * m0 + e * m3 + f * wx
    out[4] = d * m1 + e * m4 + f * wy
    out[5] = d * tx + e * ty + f
    out[6] = wx
    out[7] = wy
    out[8] = 1.0
}
