package io.github.maitrungduc1410.loaderkit

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.view.View
import android.view.View.MeasureSpec
import android.view.ViewGroup
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.ProgressBar
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import kotlin.math.roundToInt

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class LoaderKitProgressViewTest {

    private val view = LoaderKitProgressView(ApplicationProvider.getApplicationContext())
    private val density = view.resources.displayMetrics.density
    private fun px(dp: Double) = (dp * density).roundToInt()

    private fun measure(width: Int = MeasureSpec.UNSPECIFIED, height: Int = MeasureSpec.UNSPECIFIED): Pair<Int, Int> {
        view.measure(width, height)
        return view.measuredWidth to view.measuredHeight
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
    fun wrapContentFollowsTheType() {
        assertEquals(px(48.0) to px(48.0), measure())
        view.size = 64.0
        view.type = ProgressType.Battery
        assertEquals(px(64.0) to px(32.0), measure())
        view.type = ProgressType.Linear
        val offered = MeasureSpec.makeMeasureSpec(300, MeasureSpec.AT_MOST)
        assertEquals(300 to px(view.resolvedOptions.linearHeight), measure(offered))
    }

    @Test
    fun borderWrapsItsChildren() {
        view.type = ProgressType.Border
        view.thickness = 3.0
        val child = View(view.context).apply { layoutParams = ViewGroup.LayoutParams(100, 40) }
        view.addView(child)
        val inset = px(3.0 + 4.0)
        assertEquals(100 + 2 * inset to 40 + 2 * inset, measure())
        view.layout(0, 0, view.measuredWidth, view.measuredHeight)
        assertEquals(inset, child.left)
        assertEquals(inset, child.top)
    }

    @Test
    fun childrenAreCentered() {
        val child = View(view.context).apply { layoutParams = ViewGroup.LayoutParams(20, 10) }
        view.addView(child)
        render(100, 100)
        assertEquals(40, child.left)
        assertEquals(45, child.top)
    }

    @Test
    fun drawsThePieAtTheValue() {
        view.type = ProgressType.Pie
        view.color = Color.RED
        view.smooth = false
        view.value = 0.5
        val bitmap = render(100, 100)
        assertEquals("the filled half", Color.RED, bitmap.getPixel(70, 50))
        assertNotEquals("the empty half", Color.RED, bitmap.getPixel(30, 50))
        view.trackColor = Color.BLUE
        assertEquals(Color.BLUE, render(100, 100).getPixel(30, 50))
    }

    @Test
    fun accessibilityReportsTheRealValueInPercent() {
        assertEquals(ProgressBar::class.java.name, view.accessibilityClassName)
        val info = AccessibilityNodeInfo()
        view.onInitializeAccessibilityNodeInfo(info)
        assertNull("indeterminate has no range", info.rangeInfo)
        view.value = 0.426
        val determinate = AccessibilityNodeInfo()
        view.onInitializeAccessibilityNodeInfo(determinate)
        assertEquals(AccessibilityNodeInfo.RangeInfo.RANGE_TYPE_PERCENT, determinate.rangeInfo.type)
        assertEquals(42.6f, determinate.rangeInfo.current, 1e-4f)
        assertEquals("43%", view.stateDescription)
    }

    @Test
    fun badNumbersTakeTheDefaultsAndResetRestoresThem() {
        view.type = ProgressType.Gauge
        view.thickness = Double.NaN
        assertEquals(6.0, view.resolvedOptions.thickness, 0.0)
        view.value = Double.NaN
        assertNull(view.value)
        view.size = -1.0
        assertEquals(ProgressGeometry.DEFAULT_SIZE, view.size, 0.0)
        view.showLabel = true
        view.trackColor = Color.GREEN
        view.reset()
        assertEquals(ProgressType.Circular, view.resolvedOptions.type)
        assertEquals(false, view.showLabel)
        assertNull(view.trackColor)
    }

    @Test
    fun readsEveryOptionFromXml() {
        val attrs = Robolectric.buildAttributeSet()
            .addAttribute(R.attr.progressType, "linear")
            .addAttribute(R.attr.progressVariant, "wavy")
            .addAttribute(R.attr.progressValue, "0.25")
            .addAttribute(R.attr.progressBuffer, "0.5")
            .addAttribute(R.attr.progressStopIndicator, "false")
            .addAttribute(R.attr.progressStrokeCap, "butt")
            .addAttribute(R.attr.progressAmplitude, "5dp")
            .addAttribute(R.attr.progressWavelength, "30dp")
            .addAttribute(R.attr.progressWaveSpeed, "2")
            .addAttribute(R.attr.progressSweepAngle, "200")
            .addAttribute(R.attr.progressCornerRadius, "8dp")
            .addAttribute(R.attr.progressRespectsReduceMotion, "false")
            .build()
        val xml = LoaderKitProgressView(ApplicationProvider.getApplicationContext(), attrs)
        val p = xml.resolvedOptions
        assertEquals(ProgressType.Linear, p.type)
        assertEquals(ProgressVariant.Wavy, p.variant)
        assertEquals(0.25, xml.value!!, 1e-6)
        assertEquals(0.5, xml.buffer!!, 1e-6)
        assertEquals(false, p.stopIndicator)
        assertEquals(ProgressStrokeCap.Butt, p.strokeCap)
        assertEquals(5.0, p.amplitude, 1e-3)
        assertEquals(30.0, p.wavelength, 1e-3)
        assertEquals(2.0, p.waveSpeed, 1e-6)
        assertEquals(200.0, Math.toDegrees(p.sweepAngle), 1e-6)
        assertEquals(8.0, p.cornerRadius, 1e-3)
        assertEquals(false, xml.respectsReduceMotion)
    }
}
