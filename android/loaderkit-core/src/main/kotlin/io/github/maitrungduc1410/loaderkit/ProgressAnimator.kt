package io.github.maitrungduc1410.loaderkit

import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

private const val RHYTHM_GAP = 1.5
private const val BACKWARD_DURATION = 0.4
private const val ISOLATED_DURATION = 0.5
private const val WAVE_STIFFNESS = 120.0

private fun clamp01(x: Double): Double = min(1.0, max(0.0, x))

private fun Double?.isValue(): Boolean = this != null && !isNaN()

/**
 * Moves the displayed value to each new value along a cubic Hermite curve. Its duration follows the
 * rhythm of the updates, and both end slopes stay within three times the average slope, which keeps
 * the curve monotone: the displayed value never passes the real one.
 */
private class Glide(initial: Double) {
    var value = initial
        private set
    var target = initial
        private set
    var lastAt: Double? = null
    var active = false
        private set
    private var velocity = 0.0
    private var interval = ISOLATED_DURATION
    private var from = 0.0
    private var to = 0.0
    private var duration = 0.0
    private var startVelocity = 0.0
    private var endVelocity = 0.0
    private var elapsed = 0.0

    fun jump(value: Double) {
        this.value = value
        target = value
        velocity = 0.0
        active = false
    }

    fun moveTo(target: Double, now: Double, smooth: Boolean) {
        val gap = lastAt?.let { now - it } ?: Double.POSITIVE_INFINITY
        lastAt = now
        if (!smooth) {
            jump(target)
            return
        }
        val rhythmic = gap >= 0 && gap < RHYTHM_GAP
        interval = if (rhythmic) interval * 0.5 + max(0.05, gap) * 0.5 else ISOLATED_DURATION
        this.target = target
        val distance = target - value
        if (abs(distance) < 1e-5) {
            jump(target)
            return
        }
        if (distance < 0) {
            duration = BACKWARD_DURATION
            startVelocity = 0.0
            endVelocity = 0.0
        } else {
            duration = if (rhythmic) min(1.0, max(0.25, interval * 1.15)) else ISOLATED_DURATION
            val slope = distance / duration
            startVelocity = min(2.5 * slope, max(0.0, velocity))
            endVelocity = if (rhythmic && target < 1) 0.5 * slope else 0.0
        }
        from = value
        to = target
        elapsed = 0.0
        active = true
    }

    fun step(dt: Double) {
        if (!active) return
        elapsed += dt
        val T = duration
        val u = if (elapsed >= T - 1e-9) 1.0 else elapsed / T
        val u2 = u * u
        val u3 = u2 * u
        val m0 = T * startVelocity
        val m1 = T * endVelocity
        value = (2 * u3 - 3 * u2 + 1) * from + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * to + (u3 - u2) * m1
        velocity = ((6 * u2 - 6 * u) * from + (3 * u2 - 4 * u + 1) * m0 + (-6 * u2 + 6 * u) * to + (3 * u2 - 2 * u) * m1) / T
        if (u >= 1) jump(to)
    }
}

/**
 * The animation state of one progress indicator: the displayed value and buffer, the wave amplitude
 * and the clocks. Call [setValue] and [setBuffer] when the inputs change, [step] once per frame, and
 * draw [state].
 */
public class ProgressAnimator(value: Double? = null, buffer: Double? = null) {
    private val glide = Glide(if (value.isValue()) clamp01(value!!) else 0.0)
    private val bufferGlide = Glide(if (buffer.isValue()) clamp01(buffer!!) else 0.0)
    private var isIndeterminate = !value.isValue()
    private var wave = 0.0
    private var waveVelocity = 0.0
    private var time = 0.0
    private var indeterminateTime = 0.0

    init {
        wave = waveTarget
    }

    /** The value the indicator is moving to; null while indeterminate. */
    public val target: Double?
        get() = if (isIndeterminate) null else glide.target

    public val indeterminate: Boolean
        get() = isIndeterminate

    /** True while the displayed value, the buffer or the wave amplitude are still moving. */
    public val moving: Boolean
        get() = glide.active || bufferGlide.active || wave != waveTarget || waveVelocity != 0.0

    public val state: ProgressState
        get() = ProgressState(
            indeterminate = isIndeterminate,
            value = if (isIndeterminate) 0.0 else glide.value,
            buffer = bufferGlide.value,
            wave = wave,
            time = time,
            indeterminateTime = indeterminateTime,
        )

    /** The wave flattens near 0% and 100%, like Material 3 Expressive. */
    private val waveTarget: Double
        get() = if (isIndeterminate || (glide.target > 0.1 && glide.target < 0.95)) 1.0 else 0.0

    /**
     * Sets the real value; null or NaN switches to indeterminate. [now] is a clock in seconds, used to
     * measure the rhythm of updates. Leaving the indeterminate state starts again from 0.
     */
    public fun setValue(value: Double?, now: Double, smooth: Boolean) {
        if (!value.isValue()) {
            if (!isIndeterminate) glide.jump(0.0)
            isIndeterminate = true
            return
        }
        val target = clamp01(value!!)
        if (isIndeterminate) {
            isIndeterminate = false
            glide.jump(0.0)
            glide.lastAt = null
        }
        if (target == glide.target && (glide.active || glide.value == target)) return
        glide.moveTo(target, now, smooth)
    }

    /** Sets the buffer of linear flat and wavy; null or NaN removes it. */
    public fun setBuffer(buffer: Double?, now: Double, smooth: Boolean) {
        val target = if (buffer.isValue()) clamp01(buffer!!) else 0.0
        if (target == bufferGlide.target && (bufferGlide.active || bufferGlide.value == target)) return
        bufferGlide.moveTo(target, now, smooth)
    }

    /**
     * Advances by [dt] seconds. A zero, negative or non-finite [speed] pauses the indeterminate
     * animation. With [reduceMotion] the value and the wave jump to their targets, ambient motion stops
     * and the indeterminate animation runs at half speed.
     */
    public fun step(dt: Double, speed: Double, reduceMotion: Boolean) {
        if (!(dt > 0) || dt.isInfinite()) return
        if (reduceMotion) {
            glide.jump(glide.target)
            bufferGlide.jump(bufferGlide.target)
        } else {
            if (!isIndeterminate) glide.step(dt)
            bufferGlide.step(dt)
            time += dt
        }
        if (speed > 0 && !speed.isInfinite()) indeterminateTime += dt * speed * (if (reduceMotion) 0.5 else 1.0)
        val target = waveTarget
        if (reduceMotion) {
            wave = target
            waveVelocity = 0.0
        } else {
            // The exact solution of a critically damped spring, so long frames cannot make it diverge.
            val omega = sqrt(WAVE_STIFFNESS)
            val offset = wave - target
            val decay = exp(-omega * dt)
            val drift = (waveVelocity + omega * offset) * dt
            waveVelocity = (waveVelocity - omega * drift) * decay
            wave = min(1.2, max(0.0, target + (offset + drift) * decay))
            if (abs(wave - target) < 1e-4 && abs(waveVelocity) < 1e-3) {
                wave = target
                waveVelocity = 0.0
            }
        }
    }
}
