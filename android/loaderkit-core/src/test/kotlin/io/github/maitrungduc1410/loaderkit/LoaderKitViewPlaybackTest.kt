package io.github.maitrungduc1410.loaderkit

import android.app.Activity
import android.os.Looper
import android.provider.Settings
import android.widget.FrameLayout
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowChoreographer
import java.time.Duration

/** Playback rules of SPEC §8, driven by the real Choreographer frame clock. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class LoaderKitViewPlaybackTest {

    init {
        // Unpaused, Robolectric advances its clock on every frame, so a running clock never idles.
        ShadowChoreographer.setPaused(true)
        ShadowChoreographer.setFrameDelay(Duration.ofMillis(FRAME_MILLIS))
    }

    private val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
    private val container = FrameLayout(activity).also(activity::setContentView)
    private val view = LoaderKitView(activity).also(container::addView)

    /** A paused Robolectric Choreographer delivers one frame per idle call, so step frame by frame. */
    private fun advance(millis: Long) = repeat((millis / FRAME_MILLIS).toInt()) {
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofMillis(FRAME_MILLIS))
    }

    private fun assertClock(expected: Double) = assertEquals(expected, view.clockTime, 0.05)

    @Test
    fun clockFollowsSpeedAndStops() {
        advance(1000)
        assertClock(1.0)

        view.speed = 2.0
        advance(500)
        assertClock(2.0)

        view.stop()
        advance(500)
        assertClock(2.0)

        view.speed = 1.0
        view.start()
        advance(500)
        assertClock(2.5)

        view.speed = 0.0
        advance(500)
        assertClock(2.5)
    }

    @Test
    fun cycleProgressFreezesTheClockAndSpecChangesRestartIt() {
        advance(500)
        view.cycleProgress = 0.3
        advance(500)
        assertClock(0.5)
        view.cycleProgress = null
        advance(500)
        assertClock(1.0)

        view.params = mapOf("count" to 4.0)
        assertClock(0.0)
        view.color = 0xFF00FF00.toInt()
        view.colors = intArrayOf(0xFFFF0000.toInt())
        advance(500)
        assertClock(0.5)
    }

    @Test
    fun pausesWhileDetachedOrHidden() {
        advance(500)
        container.removeView(view)
        advance(500)
        assertClock(0.5)
        container.addView(view)
        advance(500)
        assertClock(1.0)

        // Robolectric windows never become visible, so the framework does not dispatch this itself.
        view.onVisibilityAggregated(false)
        advance(500)
        assertClock(1.0)
        view.onVisibilityAggregated(true)
        advance(500)
        assertClock(1.5)
    }

    @Test
    fun reducedMotionStopsTheClockUnlessIgnored() {
        Settings.Global.putFloat(activity.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 0f)
        advance(500)
        assertClock(0.0)

        view.respectsReduceMotion = false
        advance(500)
        assertClock(0.5)

        view.respectsReduceMotion = true
        Settings.Global.putFloat(activity.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f)
        advance(500)
        assertClock(1.0)
    }

    private companion object {
        const val FRAME_MILLIS = 10L
    }
}
