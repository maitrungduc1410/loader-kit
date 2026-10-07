package io.github.maitrungduc1410.loaderkit

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.view.View.MeasureSpec
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class LoaderKitViewTest {

    private val view = LoaderKitView(ApplicationProvider.getApplicationContext())
    private val errors = mutableListOf<InvalidIndicatorSpecException>()

    init {
        view.onError = { errors += it }
    }

    private fun render(width: Int, height: Int): Bitmap {
        view.measure(
            MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
        )
        view.layout(0, 0, width, height)
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        view.draw(Canvas(bitmap))
        return bitmap
    }

    @Test
    fun wrapContentIsFortyDp() {
        view.measure(MeasureSpec.UNSPECIFIED, MeasureSpec.UNSPECIFIED)
        val expected = (40 * view.resources.displayMetrics.density).toInt()
        assertEquals(expected, view.measuredWidth)
        assertEquals(expected, view.measuredHeight)
    }

    @Test
    fun drawsBallPulseInTheCenteredBox() {
        view.color = Color.RED
        view.cycleProgress = 0.0
        val bitmap = render(300, 100)
        // The 100 px box starts at x = 100; ball centers sit at 0.15, 0.5 and 0.85 of it.
        for (x in listOf(115, 150, 185)) assertEquals("ball at $x", Color.RED, bitmap.getPixel(x, 50))
        assertEquals(Color.TRANSPARENT, bitmap.getPixel(50, 50))
        assertEquals(Color.TRANSPARENT, bitmap.getPixel(250, 50))
        assertEquals(Color.TRANSPARENT, bitmap.getPixel(150, 10))
    }

    @Test
    fun colorsCycleByElementIndex() {
        view.colors = intArrayOf(Color.RED, Color.BLUE)
        view.cycleProgress = 0.0
        val bitmap = render(100, 100)
        assertEquals(Color.RED, bitmap.getPixel(15, 50))
        assertEquals(Color.BLUE, bitmap.getPixel(50, 50))
        assertEquals(Color.RED, bitmap.getPixel(85, 50))
    }

    @Test
    fun hidesWhenStoppedByDefault() {
        assertTrue(view.hidesWhenStopped)
        view.color = Color.RED
        view.cycleProgress = 0.0
        view.stop()
        assertEquals(Color.TRANSPARENT, render(100, 100).getPixel(50, 50))
        view.hidesWhenStopped = false
        assertEquals(Color.RED, render(100, 100).getPixel(50, 50))
        view.hidesWhenStopped = true
        view.start()
        assertEquals(Color.RED, render(100, 100).getPixel(50, 50))
    }

    @Test
    fun badInputIsReportedAndDrawsNothing() {
        view.color = Color.RED
        view.cycleProgress = 0.0
        view.indicator = "Nope"
        assertEquals(1, errors.size)
        assertEquals(Color.TRANSPARENT, render(100, 100).getPixel(50, 50))

        view.setSpecJson("{ not json")
        assertEquals(2, errors.size)
        view.setSpecJson("""{"schemaVersion": 1}""")
        assertEquals(3, errors.size)
        assertNull(view.spec)

        view.setSpecJson(BuiltinIndicators.require("SquareSpin").toJson())
        assertEquals(3, errors.size)
        assertEquals("SquareSpin", view.spec?.name)
        assertEquals(Color.RED, render(100, 100).getPixel(50, 50))

        view.indicator = "BallPulse"
        view.spec = null
        assertEquals(3, errors.size)
        view.params = mapOf("count" to Double.NaN)
        assertEquals(4, errors.size)
    }

    @Test
    fun resetRestoresDefaults() {
        view.indicator = "SquareSpin"
        view.spec = BuiltinIndicators.require("BallSpinFadeLoader")
        view.params = mapOf("count" to 5.0)
        view.color = Color.RED
        view.colors = intArrayOf(Color.BLUE)
        view.speed = 2.0
        view.stop()
        view.hidesWhenStopped = false
        view.cycleProgress = 0.5
        view.respectsReduceMotion = false

        view.reset()

        assertEquals(LoaderKitView.DEFAULT_INDICATOR, view.indicator)
        assertNull(view.spec)
        assertEquals(emptyMap<String, Double>(), view.params)
        assertNull(view.colors)
        assertEquals(1.0, view.speed, 0.0)
        assertTrue(view.isAnimating)
        assertTrue(view.hidesWhenStopped)
        assertNull(view.cycleProgress)
        assertTrue(view.respectsReduceMotion)
        assertTrue(errors.isEmpty())
    }
}
