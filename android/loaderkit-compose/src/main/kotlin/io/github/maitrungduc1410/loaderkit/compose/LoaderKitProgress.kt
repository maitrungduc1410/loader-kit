package io.github.maitrungduc1410.loaderkit.compose

import android.os.SystemClock
import androidx.annotation.AttrRes
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.progressSemantics
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import io.github.maitrungduc1410.loaderkit.ProgressAnimator
import io.github.maitrungduc1410.loaderkit.ProgressGeometry
import io.github.maitrungduc1410.loaderkit.ProgressOptions
import io.github.maitrungduc1410.loaderkit.ProgressRenderer
import io.github.maitrungduc1410.loaderkit.ProgressStrokeCap
import io.github.maitrungduc1410.loaderkit.ProgressType
import io.github.maitrungduc1410.loaderkit.ProgressVariant
import io.github.maitrungduc1410.loaderkit.ResolvedProgress
import kotlin.math.min

/** Default colors of [LoaderKitProgress], read from the Android theme. */
public object LoaderKitProgressDefaults {
    /** The accent color of the theme. */
    @Composable
    public fun color(): Color = themeColor(android.R.attr.colorAccent, Color.Black)

    /** The primary text color of the theme. */
    @Composable
    public fun labelColor(): Color = themeColor(android.R.attr.textColorPrimary, Color.Black)
}

@Composable
private fun themeColor(@AttrRes attr: Int, fallback: Color): Color {
    val context = LocalContext.current
    // The configuration key picks up a dark mode switch in apps that handle uiMode changes themselves.
    return remember(context, LocalConfiguration.current, attr) {
        val a = context.obtainStyledAttributes(intArrayOf(attr))
        try {
            Color(a.getColor(0, fallback.toArgb()))
        } finally {
            a.recycle()
        }
    }
}

/**
 * A progress indicator: linear, circular, pie, gauge, liquid, border, bars, grid, battery or hourglass.
 *
 * Linear fills the width it is offered; border takes the size of [content] plus its stroke; the
 * other types are [size] wide, or larger to fit [content], unless [modifier] sizes them. [content]
 * is centered over circular, pie and gauge (a stop button, for example).
 *
 * @param value progress in [0, 1]; null shows the indeterminate animation.
 * @param smooth move to a new value along a curve that follows the rhythm of the updates and
 *   never passes the real value, rather than jump to it.
 * @param buffer buffer of linear flat and wavy, in [0, 1].
 * @param trackColor null draws the track in [color] at 24% opacity.
 * @param segments number of segments, dots, ticks, steps, bars or grid columns; null takes the
 *   default of the variant.
 * @param sweepAngle arc of gauge, in degrees.
 * @param speed playback rate of the indeterminate animation; zero or negative pauses it.
 * @param respectsReduceMotion when true and the system has animations turned off, values jump,
 *   ambient motion stops and the indeterminate animation slows down.
 * @param contentDescription what screen readers announce, e.g. "Uploading video".
 */
@Composable
public fun LoaderKitProgress(
    value: Double?,
    modifier: Modifier = Modifier,
    type: ProgressType = ProgressType.Circular,
    variant: ProgressVariant? = null,
    smooth: Boolean = true,
    buffer: Double? = null,
    color: Color = LoaderKitProgressDefaults.color(),
    trackColor: Color? = null,
    labelColor: Color = LoaderKitProgressDefaults.labelColor(),
    thickness: Dp? = null,
    trackGap: Dp? = null,
    segments: Int? = null,
    showLabel: Boolean = false,
    stopIndicator: Boolean = true,
    strokeCap: ProgressStrokeCap = ProgressStrokeCap.Round,
    amplitude: Dp? = null,
    wavelength: Dp? = null,
    waveSpeed: Double = 1.0,
    sweepAngle: Double = 270.0,
    cornerRadius: Dp = 12.dp,
    speed: Double = 1.0,
    size: Dp = ProgressGeometry.DEFAULT_SIZE.dp,
    respectsReduceMotion: Boolean = true,
    contentDescription: String? = null,
    content: (@Composable () -> Unit)? = null,
) {
    val options = ProgressOptions(
        type = type,
        variant = variant,
        thickness = thickness?.value?.toDouble(),
        trackGap = trackGap?.value?.toDouble(),
        segments = segments?.toDouble(),
        showLabel = showLabel,
        stopIndicator = stopIndicator,
        strokeCap = strokeCap,
        amplitude = amplitude?.value?.toDouble(),
        wavelength = wavelength?.value?.toDouble(),
        waveSpeed = waveSpeed,
        sweepAngle = sweepAngle,
        cornerRadius = cornerRadius.value.toDouble(),
        speed = speed,
    )
    val resolved = remember(options) { ResolvedProgress(options) }
    val current = value?.takeUnless { it.isNaN() }
    val currentBuffer = buffer?.takeUnless { it.isNaN() }
    val animator = remember { ProgressAnimator(current, currentBuffer) }
    val reducesMotion = respectsReduceMotion && rememberSystemReducesMotion()
    var frame by remember { mutableLongStateOf(0L) }
    // Outlives the effect, which restarts on every new value: one per frame when the value is animated.
    val lastFrame = remember { LongArray(1) }

    LaunchedEffect(current, currentBuffer, resolved, reducesMotion) {
        val now = SystemClock.uptimeMillis() / 1000.0
        animator.setValue(current, now, smooth && !reducesMotion)
        animator.setBuffer(currentBuffer, now, smooth && !reducesMotion)
        frame++
        fun moving() = animator.moving ||
            (animator.indeterminate && resolved.speed > 0 && resolved.speed.isFinite()) ||
            (resolved.hasAmbientMotion(animator.state) && !reducesMotion)
        while (moving()) {
            withFrameNanos { nanos ->
                val last = lastFrame[0]
                // A long pause (the app in the background) should not fast-forward the animation.
                if (last != 0L) animator.step(min(0.1, (nanos - last) / 1e9), resolved.speed, reducesMotion)
                lastFrame[0] = nanos
                frame++
            }
        }
        lastFrame[0] = 0L
    }

    val renderer = remember { ProgressRenderer() }
    val sizing = when (resolved.type) {
        ProgressType.Linear -> Modifier.fillMaxWidth().height(resolved.linearHeight.dp)
        ProgressType.Border -> Modifier
        else -> Modifier.defaultMinSize(
            size,
            size * ((resolved.intrinsicHeight ?: 1.0) / (resolved.intrinsicWidth ?: 1.0)).toFloat(),
        )
    }
    val semantics = (if (current == null) Modifier.progressSemantics() else Modifier.progressSemantics(current.coerceIn(0.0, 1.0).toFloat()))
        .then(if (contentDescription == null) Modifier else Modifier.semantics { this.contentDescription = contentDescription })

    Box(
        modifier
            .then(sizing)
            .then(semantics)
            .drawBehind {
                frame
                val width = this.size.width / density
                val height = this.size.height / density
                if (width <= 0f || height <= 0f) return@drawBehind
                renderer.color = color.toArgb()
                renderer.trackColor = trackColor?.toArgb()
                renderer.labelColor = labelColor.toArgb()
                val drawing = ProgressGeometry.commands(resolved, animator.state, width.toDouble(), height.toDouble())
                drawIntoCanvas { renderer.draw(it.nativeCanvas, drawing, 0f, 0f, density) }
            },
        contentAlignment = Alignment.Center,
    ) {
        if (content != null) {
            Box(if (resolved.type == ProgressType.Border) Modifier.padding(resolved.contentInset.dp) else Modifier) {
                content()
            }
        }
    }
}
