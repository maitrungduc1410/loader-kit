package io.github.maitrungduc1410.loaderkit

/** The only spec schema version this engine reads. */
public const val SCHEMA_VERSION: Int = 1

/** Distance from the viewer to the box for 3D rotations, in box units, when a spec sets none. */
public const val DEFAULT_PERSPECTIVE: Double = 2.5

/** A number, or a reference to one of the spec [params][IndicatorSpec.params]. */
public sealed interface Num {
    public data class Value(public val value: Double) : Num

    public data class Param(public val name: String) : Num
}

public fun Num(value: Double): Num = Num.Value(value)

/** References a spec parameter inside a layout, shape, track or rest value. */
public fun param(name: String): Num = Num.Param(name)

/** Where the elements of a part sit inside the unit box (SPEC §3). */
public sealed interface Layout {
    /** One element of `width × height` (default [size], itself default 1) centered at ([x], [y]), default 0.5. */
    public data class Single(
        public val size: Num? = null,
        public val width: Num? = null,
        public val height: Num? = null,
        public val x: Num? = null,
        public val y: Num? = null,
    ) : Layout

    /** [count] elements like [Single], all at the same place. */
    public data class Stack(
        public val count: Num,
        public val size: Num? = null,
        public val width: Num? = null,
        public val height: Num? = null,
        public val x: Num? = null,
        public val y: Num? = null,
    ) : Layout

    /** Without [itemWidth] the elements and gaps fill the box; with it the row is centered. */
    public data class Row(
        public val count: Num,
        public val gap: Num,
        public val itemWidth: Num? = null,
        public val itemHeight: Num? = null,
    ) : Layout

    public data class Grid(
        public val columns: Num,
        public val rows: Num,
        public val gap: Num,
    ) : Layout

    /** Element centers sit on a circle of radius `0.5 - itemSize / 2`, whatever [itemWidth] and [itemHeight]. */
    public data class Ring(
        public val count: Num,
        public val itemSize: Num,
        public val itemWidth: Num? = null,
        public val itemHeight: Num? = null,
        public val startAngle: Num? = null,
        public val orient: Boolean = false,
    ) : Layout
}

/** What every element of a part draws inside its rectangle (SPEC §4). Arcs go clockwise. */
public sealed interface Shape {
    /** A filled ellipse; with a [sweep] below 2π, the part of it cut off by a chord. */
    public data class Circle(
        /** Default -π/2, the top. */
        public val startAngle: Num? = null,
        /** Within (0, 2π], default 2π. */
        public val sweep: Num? = null,
    ) : Shape

    public data class Rect(public val cornerRadius: Num? = null) : Shape

    /** A stroked circle, or [segments] arcs of it, each trimmed by `strokeStart` and `strokeEnd`. */
    public data class Ring(
        public val strokeWidth: Num,
        /** Start of the first arc, default -π/2, the top. */
        public val startAngle: Num? = null,
        /** Angle of each arc, within (0, 2π], default 2π. */
        public val sweep: Num? = null,
        /** Number of arcs, evenly spaced, default 1. */
        public val segments: Num? = null,
    ) : Shape

    public data object Triangle : Shape

    public data object Line : Shape
}

/** Start offset of each element in seconds (SPEC §5.1). Offsets may be negative. */
public sealed interface Stagger {
    public data class Offsets(public val offsets: List<Double>) : Stagger

    public data class Each(public val each: Double, public val start: Double = 0.0) : Stagger
}

/** Element properties a [Track] can animate, with the value they keep without one (SPEC §5.1). */
public enum class AnimatableProperty(public val key: String, public val restValue: Double) {
    Scale("scale", 1.0),
    ScaleX("scaleX", 1.0),
    ScaleY("scaleY", 1.0),
    Opacity("opacity", 1.0),
    Rotate("rotate", 0.0),
    RotateX("rotateX", 0.0),
    RotateY("rotateY", 0.0),
    TranslateX("translateX", 0.0),
    TranslateY("translateY", 0.0),

    /** Start and end of the drawn part of each arc of a `ring` shape, as fractions of the arc. */
    StrokeStart("strokeStart", 0.0),
    StrokeEnd("strokeEnd", 1.0);

    public companion object {
        public fun fromKey(key: String): AnimatableProperty? = entries.firstOrNull { it.key == key }
    }
}

/** Properties a [GroupTrack] can animate; they transform a whole part around the box center (SPEC §5.5). */
public enum class GroupProperty(public val key: String, public val restValue: Double) {
    Scale("scale", 1.0),
    ScaleX("scaleX", 1.0),
    ScaleY("scaleY", 1.0),
    Opacity("opacity", 1.0),
    Rotate("rotate", 0.0),
    TranslateX("translateX", 0.0),
    TranslateY("translateY", 0.0);

    public companion object {
        public fun fromKey(key: String): GroupProperty? = entries.firstOrNull { it.key == key }
    }
}

public sealed interface Easing {
    public val controlPoints: CubicBezier
}

/** Named easings use the Core Animation control points; [Ease] is the CSS and Core Animation default. */
public enum class NamedEasing(public val key: String, override val controlPoints: CubicBezier) : Easing {
    Linear("linear", CubicBezier(0.0, 0.0, 1.0, 1.0)),
    Ease("ease", CubicBezier(0.25, 0.1, 0.25, 1.0)),
    EaseIn("easeIn", CubicBezier(0.42, 0.0, 1.0, 1.0)),
    EaseOut("easeOut", CubicBezier(0.0, 0.0, 0.58, 1.0)),
    EaseInOut("easeInOut", CubicBezier(0.42, 0.0, 0.58, 1.0));

    public companion object {
        public fun fromKey(key: String): NamedEasing? = entries.firstOrNull { it.key == key }
    }
}

/** A cubic-bezier easing through `(0,0) (x1,y1) (x2,y2) (1,1)`, like CSS `cubic-bezier()`. */
public data class CubicBezier(
    public val x1: Double,
    public val y1: Double,
    public val x2: Double,
    public val y2: Double,
) : Easing {
    override val controlPoints: CubicBezier get() = this

    public fun transform(x: Double): Double = cubicBezier(x1, y1, x2, y2, x)
}

/** One easing for every segment of a track, or one per segment. */
public sealed interface TrackEasing {
    public data class Uniform(public val easing: Easing) : TrackEasing

    public data class PerSegment(public val easings: List<Easing>) : TrackEasing
}

/** Animates one element property over the element cycle. */
public data class Track(
    public val property: AnimatableProperty,
    /** Non-decreasing, within [0, 1], same length as [values], at least 2 entries. */
    public val keyTimes: List<Double>,
    public val values: List<Num>,
    /** Default linear. */
    public val easing: TrackEasing? = null,
)

/** Animates the whole part over the part cycle, from `t = 0` and without stagger. */
public data class GroupTrack(
    public val property: GroupProperty,
    /** Non-decreasing, within [0, 1], same length as [values], at least 2 entries. */
    public val keyTimes: List<Double>,
    public val values: List<Num>,
    /** Default linear. */
    public val easing: TrackEasing? = null,
)

/** A group of elements that share a layout, a shape and tracks (SPEC §3). */
public data class Part(
    public val layout: Layout,
    public val shape: Shape,
    public val tracks: List<Track> = emptyList(),
    public val stagger: Stagger? = null,
    /** Cycle length of this part in seconds. Null uses the spec duration. */
    public val duration: Double? = null,
    /** Cycle length of each element, by index, overriding [duration]. Must cover every element. */
    public val durations: List<Double>? = null,
    /** Values of properties without a track, also shown before an element starts. */
    public val rest: Map<AnimatableProperty, Num> = emptyMap(),
    public val groupTracks: List<GroupTrack> = emptyList(),
)

/**
 * A LoaderKit indicator, schema version 1. See `SPEC.md` in the repository for the meaning of
 * every field. Build one in code, take a [built-in][BuiltinIndicators], or [parse] JSON.
 *
 * A spec is a list of [parts]; a spec written without `parts` is one part, and [toJson] writes
 * a single part without its own duration back in that inline form.
 */
public data class IndicatorSpec(
    public val name: String,
    /** Length of one cycle in seconds, at speed 1. A frozen `cycleProgress` is a point of this cycle. */
    public val duration: Double,
    public val parts: List<Part>,
    /** Parameter defaults. Users can override them by name. */
    public val params: Map<String, Double> = emptyMap(),
    public val perspective: Double? = null,
    public val schemaVersion: Int = SCHEMA_VERSION,
) {
    /** A spec made of one group of elements. */
    public constructor(
        name: String,
        duration: Double,
        layout: Layout,
        shape: Shape,
        tracks: List<Track> = emptyList(),
        params: Map<String, Double> = emptyMap(),
        stagger: Stagger? = null,
        durations: List<Double>? = null,
        rest: Map<AnimatableProperty, Num> = emptyMap(),
        groupTracks: List<GroupTrack> = emptyList(),
        perspective: Double? = null,
        schemaVersion: Int = SCHEMA_VERSION,
    ) : this(
        name = name,
        duration = duration,
        parts = listOf(Part(layout, shape, tracks, stagger, null, durations, rest, groupTracks)),
        params = params,
        perspective = perspective,
        schemaVersion = schemaVersion,
    )

    private val problems: List<String> by lazy { validateSpecTree(toSpecTree()) }

    /** Every problem with this spec (SPEC §9); an empty list means it is valid. */
    public fun validate(): List<String> = problems

    /** This spec as schema v1 JSON. */
    public fun toJson(): String = writeJson(toSpecTree())

    public companion object {
        /**
         * Parses and validates a schema v1 JSON spec.
         *
         * @throws InvalidIndicatorSpecException listing every problem when [json] is not a valid spec.
         */
        public fun parse(json: String): IndicatorSpec {
            val tree = parseJson(json)
            val errors = validateSpecTree(tree)
            if (errors.isNotEmpty()) throw InvalidIndicatorSpecException(errors)
            val spec = specFromTree(tree)
            PreparedIndicator(spec)
            return spec
        }

        /** Every problem with [json] as a schema v1 spec; an empty list means it is valid. */
        public fun validate(json: String): List<String> =
            try {
                parse(json)
                emptyList()
            } catch (error: InvalidIndicatorSpecException) {
                error.errors
            }
    }
}

/** Thrown when a spec, or the params applied to it, break the rules of SPEC §9. */
public class InvalidIndicatorSpecException(
    public val errors: List<String>,
) : IllegalArgumentException("Invalid indicator spec:\n- ${errors.joinToString("\n- ")}")
