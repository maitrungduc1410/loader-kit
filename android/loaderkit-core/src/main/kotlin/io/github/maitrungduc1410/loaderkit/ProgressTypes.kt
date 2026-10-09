package io.github.maitrungduc1410.loaderkit

/** The shape of a `LoaderKitProgress`. */
public enum class ProgressType(public val key: String) {
    Linear("linear"),
    Circular("circular"),
    Pie("pie"),
    Gauge("gauge"),
    Liquid("liquid"),
    Border("border"),
    Bars("bars"),
    Grid("grid"),
    Battery("battery");

    /** The variants this type accepts; the first one is its default. */
    public val variants: List<ProgressVariant>
        get() = when (this) {
            Linear -> listOf(
                ProgressVariant.Flat, ProgressVariant.Wavy, ProgressVariant.Segmented, ProgressVariant.Striped,
                ProgressVariant.Shimmer, ProgressVariant.Glow, ProgressVariant.Dots, ProgressVariant.Steps,
            )
            Circular -> listOf(
                ProgressVariant.Flat, ProgressVariant.Wavy, ProgressVariant.Segmented,
                ProgressVariant.Gradient, ProgressVariant.Ticks, ProgressVariant.Dots,
            )
            Gauge -> listOf(ProgressVariant.Flat, ProgressVariant.Segmented)
            else -> listOf(ProgressVariant.Flat)
        }

    public companion object {
        /** The type named `key`, or null. */
        public fun of(key: String?): ProgressType? = entries.firstOrNull { it.key == key }
    }
}

/** The style of a `LoaderKitProgress` within its type. */
public enum class ProgressVariant(public val key: String) {
    Flat("flat"),
    Wavy("wavy"),
    Segmented("segmented"),
    Striped("striped"),
    Shimmer("shimmer"),
    Glow("glow"),
    Dots("dots"),
    Steps("steps"),
    Gradient("gradient"),
    Ticks("ticks");

    public companion object {
        /** The variant named `key`, or null. */
        public fun of(key: String?): ProgressVariant? = entries.firstOrNull { it.key == key }
    }
}

public enum class ProgressStrokeCap(public val key: String) {
    Round("round"),
    Butt("butt");

    public companion object {
        /** The cap named `key`, or null. */
        public fun of(key: String?): ProgressStrokeCap? = entries.firstOrNull { it.key == key }
    }
}

/** Drawing options. Null options take the defaults of [ResolvedProgress]. */
public data class ProgressOptions(
    public val type: ProgressType? = null,
    public val variant: ProgressVariant? = null,
    /** Width of strokes and bars. Default depends on the type and variant. */
    public val thickness: Double? = null,
    /** Space between the progress and the track, or between segments. Default 4. */
    public val trackGap: Double? = null,
    /** Number of segments, dots, ticks, steps, bars or grid columns. Default depends on the variant. */
    public val segments: Double? = null,
    /** Show the percentage. Default false. */
    public val showLabel: Boolean? = null,
    /** Dot at the end of the track of linear flat and wavy. Default true. */
    public val stopIndicator: Boolean? = null,
    public val strokeCap: ProgressStrokeCap? = null,
    /** Wave amplitude of wavy. Default 3 for linear, 2 for circular. */
    public val amplitude: Double? = null,
    /** Wave length of wavy. Default 40 for linear, 15 for circular. */
    public val wavelength: Double? = null,
    /** Wave travel in wavelengths per second. Default 1. */
    public val waveSpeed: Double? = null,
    /** Arc of gauge, in degrees. Default 270. */
    public val sweepAngle: Double? = null,
    /** Corner radius of border. Default 12. */
    public val cornerRadius: Double? = null,
    /** Playback rate of the indeterminate animation. Default 1. */
    public val speed: Double? = null,
)

/** What [ProgressGeometry.commands] draws at one instant; [ProgressAnimator.state] produces it. */
public data class ProgressState(
    public val indeterminate: Boolean,
    /** Displayed value in [0, 1]; follows the real value when smoothing is on. */
    public val value: Double,
    /** Displayed buffer in [0, 1]; 0 draws no buffer. */
    public val buffer: Double = 0.0,
    /** Wave amplitude factor: 0 flat, 1 full. */
    public val wave: Double = 1.0,
    /** Seconds of ambient motion: wave travel, sheens and stripes. */
    public val time: Double = 0.0,
    /** Seconds of the indeterminate animation, already scaled by the speed. */
    public val indeterminateTime: Double = 0.0,
)

/** Colors a command refers to. Renderers resolve them from the view's colors. */
public enum class ProgressColorRole(public val key: String) {
    /** The progress color. */
    Color("color"),

    /** The track color, or the progress color at 24% opacity. */
    Track("track"),

    /** Label text: the platform text color. */
    Label("label"),
    White("white"),
}

public data class ProgressColorStop(public val offset: Double, public val color: ProgressColorRole, public val alpha: Double)

public sealed interface ProgressPaint {
    public data class Solid(public val color: ProgressColorRole, public val alpha: Double) : ProgressPaint

    public data class Linear(
        public val x0: Double,
        public val y0: Double,
        public val x1: Double,
        public val y1: Double,
        public val stops: List<ProgressColorStop>,
    ) : ProgressPaint

    public data class Radial(public val cx: Double, public val cy: Double, public val r: Double, public val stops: List<ProgressColorStop>) : ProgressPaint

    /** Offsets are fractions of a turn, clockwise from [start]. */
    public data class Conic(public val cx: Double, public val cy: Double, public val start: Double, public val stops: List<ProgressColorStop>) : ProgressPaint
}

public sealed interface ProgressClipShape {
    public data class Rect(public val x: Double, public val y: Double, public val width: Double, public val height: Double, public val radius: Double) : ProgressClipShape

    public data class Circle(public val cx: Double, public val cy: Double, public val r: Double) : ProgressClipShape

    /** Flat list of x, y pairs. */
    public data class Polygon(public val points: List<Double>) : ProgressClipShape
}

/** One draw command. Coordinates are in dp with y pointing down; angles are radians, clockwise. */
public sealed interface ProgressCommand {
    public data class Line(
        public val x0: Double,
        public val y0: Double,
        public val x1: Double,
        public val y1: Double,
        public val lineWidth: Double,
        public val cap: ProgressStrokeCap,
        public val paint: ProgressPaint,
    ) : ProgressCommand

    /** Clockwise arc from [start] to [end]. */
    public data class Arc(
        public val cx: Double,
        public val cy: Double,
        public val r: Double,
        public val start: Double,
        public val end: Double,
        public val lineWidth: Double,
        public val cap: ProgressStrokeCap,
        public val paint: ProgressPaint,
    ) : ProgressCommand

    /** Stroked path through x, y pairs, with round joins. */
    public data class Polyline(
        public val points: List<Double>,
        public val closed: Boolean,
        public val lineWidth: Double,
        public val cap: ProgressStrokeCap,
        public val paint: ProgressPaint,
    ) : ProgressCommand

    public data class Circle(public val cx: Double, public val cy: Double, public val r: Double, public val paint: ProgressPaint) : ProgressCommand

    /** Filled rectangle with rounded corners. */
    public data class Rect(
        public val x: Double,
        public val y: Double,
        public val width: Double,
        public val height: Double,
        public val radius: Double,
        public val paint: ProgressPaint,
    ) : ProgressCommand

    /** Stroked rectangle with rounded corners. */
    public data class StrokeRect(
        public val x: Double,
        public val y: Double,
        public val width: Double,
        public val height: Double,
        public val radius: Double,
        public val lineWidth: Double,
        public val paint: ProgressPaint,
    ) : ProgressCommand

    /** Filled path through x, y pairs. */
    public data class Polygon(public val points: List<Double>, public val paint: ProgressPaint) : ProgressCommand

    /** Filled pie slice, clockwise from [start] to [end]. */
    public data class Sector(
        public val cx: Double,
        public val cy: Double,
        public val r: Double,
        public val start: Double,
        public val end: Double,
        public val paint: ProgressPaint,
    ) : ProgressCommand

    /** Semibold system text, vertically centered on [y]; [x] is the center, or the right edge. */
    public data class Text(
        public val x: Double,
        public val y: Double,
        public val size: Double,
        public val text: String,
        public val alignRight: Boolean,
        public val paint: ProgressPaint,
    ) : ProgressCommand

    /** Draws [commands] clipped to [shape]. */
    public data class Clip(public val shape: ProgressClipShape, public val commands: List<ProgressCommand>) : ProgressCommand
}

/** What to draw, in a box whose top-left corner is at [x], [y] in the view's bounds. */
public data class ProgressDrawing(public val x: Double, public val y: Double, public val commands: List<ProgressCommand>)
