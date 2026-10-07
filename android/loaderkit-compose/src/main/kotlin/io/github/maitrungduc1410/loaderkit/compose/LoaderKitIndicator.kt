package io.github.maitrungduc1410.loaderkit.compose

import android.database.ContentObserver
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import io.github.maitrungduc1410.loaderkit.BuiltinIndicators
import io.github.maitrungduc1410.loaderkit.IndicatorRenderer
import io.github.maitrungduc1410.loaderkit.IndicatorSpec
import io.github.maitrungduc1410.loaderkit.InvalidIndicatorSpecException
import io.github.maitrungduc1410.loaderkit.PreparedIndicator
import io.github.maitrungduc1410.loaderkit.systemReducesMotion

private const val TAG = "LoaderKitIndicator"

/**
 * Draws the built-in indicator called [indicator] (see [BuiltinIndicators.names]). It is 40.dp
 * square unless [modifier] sizes it. An unknown name or invalid [params] draw nothing.
 *
 * @param params param overrides by name; names the spec does not declare are ignored.
 * @param colors element `i` uses `colors[i % colors.size]`; null or empty means [color] for every element.
 * @param speed playback rate, 1 is the speed of the spec; zero or negative pauses.
 * @param cycleProgress a frozen point of the animation cycle in [0, 1], not the progress of a task;
 *   null follows the clock.
 * @param respectsReduceMotion when true, shows a still frame while the system has animations turned off.
 */
@Composable
public fun LoaderKitIndicator(
    indicator: String,
    modifier: Modifier = Modifier,
    params: Map<String, Double> = emptyMap(),
    color: Color = defaultColor(),
    colors: List<Color>? = null,
    speed: Double = 1.0,
    animating: Boolean = true,
    cycleProgress: Double? = null,
    respectsReduceMotion: Boolean = true,
) {
    val spec = remember(indicator) {
        BuiltinIndicators[indicator].also {
            if (it == null) Log.w(TAG, "unknown indicator \"$indicator\", expected one of ${BuiltinIndicators.names}")
        }
    }
    Indicator(spec, modifier, params, color, colors, speed, animating, cycleProgress, respectsReduceMotion)
}

/**
 * Draws a custom [spec], parsed with [IndicatorSpec.parse] or built in code. A spec that is
 * invalid, or made invalid by [params], draws nothing. See the other overload for the parameters.
 */
@Composable
public fun LoaderKitIndicator(
    spec: IndicatorSpec,
    modifier: Modifier = Modifier,
    params: Map<String, Double> = emptyMap(),
    color: Color = defaultColor(),
    colors: List<Color>? = null,
    speed: Double = 1.0,
    animating: Boolean = true,
    cycleProgress: Double? = null,
    respectsReduceMotion: Boolean = true,
) {
    Indicator(spec, modifier, params, color, colors, speed, animating, cycleProgress, respectsReduceMotion)
}

@Composable
private fun defaultColor(): Color = if (isSystemInDarkTheme()) Color.White else Color.Black

@Composable
private fun Indicator(
    spec: IndicatorSpec?,
    modifier: Modifier,
    params: Map<String, Double>,
    color: Color,
    colors: List<Color>?,
    speed: Double,
    animating: Boolean,
    cycleProgress: Double?,
    respectsReduceMotion: Boolean,
) {
    val prepared = remember(spec, params) {
        try {
            spec?.let { PreparedIndicator(it, params) }
        } catch (error: InvalidIndicatorSpecException) {
            Log.w(TAG, error.message.orEmpty())
            null
        }
    }
    var time by remember(prepared) { mutableDoubleStateOf(0.0) }
    val reducesMotion = respectsReduceMotion && rememberSystemReducesMotion()
    val currentSpeed by rememberUpdatedState(speed)
    val frozenProgress = cycleProgress?.takeUnless { it.isNaN() }
    val running = prepared != null && animating && frozenProgress == null && !reducesMotion &&
        speed.isFinite() && speed > 0

    LaunchedEffect(prepared, running) {
        if (!running) return@LaunchedEffect
        var last = 0L
        while (true) {
            withFrameNanos { now ->
                if (last != 0L) time += (now - last) / 1e9 * currentSpeed
                last = now
            }
        }
    }

    val renderer = remember { IndicatorRenderer() }
    val argb = color.toArgb()
    val palette = remember(colors) { colors?.map { it.toArgb() }?.toIntArray() }
    val frozen = frozenProgress ?: if (reducesMotion) 0.0 else null

    Canvas(modifier.size(40.dp)) {
        val indicator = prepared ?: return@Canvas
        val side = size.minDimension
        if (side <= 0f) return@Canvas
        val t = if (frozen != null) indicator.timeForCycleProgress(frozen) else time
        renderer.color = argb
        renderer.colors = palette
        drawIntoCanvas {
            renderer.draw(it.nativeCanvas, indicator, t, (size.width - side) / 2, (size.height - side) / 2, side)
        }
    }
}

@Composable
private fun rememberSystemReducesMotion(): Boolean {
    val context = LocalContext.current
    var reduces by remember(context) { mutableStateOf(systemReducesMotion(context)) }
    DisposableEffect(context) {
        val observer = object : ContentObserver(Handler(Looper.getMainLooper())) {
            override fun onChange(selfChange: Boolean) {
                reduces = systemReducesMotion(context)
            }
        }
        context.contentResolver.registerContentObserver(
            Settings.Global.getUriFor(Settings.Global.ANIMATOR_DURATION_SCALE),
            false,
            observer,
        )
        onDispose { context.contentResolver.unregisterContentObserver(observer) }
    }
    return reduces
}
