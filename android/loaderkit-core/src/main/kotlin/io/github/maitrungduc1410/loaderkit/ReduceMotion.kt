package io.github.maitrungduc1410.loaderkit

import android.animation.ValueAnimator
import android.content.Context
import android.os.Build
import android.provider.Settings

/** True when the user turned animations off (Developer options or Accessibility > Remove animations). */
public fun systemReducesMotion(context: Context): Boolean {
    val scale = Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f)
    if (scale == 0f) return true
    return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !ValueAnimator.areAnimatorsEnabled()
}
