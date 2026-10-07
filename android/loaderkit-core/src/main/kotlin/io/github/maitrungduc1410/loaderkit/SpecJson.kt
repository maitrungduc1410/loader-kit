package io.github.maitrungduc1410.loaderkit

import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import org.json.JSONTokener

/*
 * Specs are validated as a plain tree, the way the reference validator sees parsed JSON:
 * objects are Map<String, Any?>, arrays List<Any?>, numbers Double, plus String and Boolean.
 * A JSON null is [JsonNull]; a missing key reads as Kotlin null.
 */
internal object JsonNull

internal fun parseJson(json: String): Any? {
    try {
        val tokener = JSONTokener(json)
        val value = tokener.nextValue()
        if (tokener.nextClean() != '\u0000') throw JSONException("unexpected content after the spec")
        return toTree(value)
    } catch (error: JSONException) {
        throw InvalidIndicatorSpecException(listOf("spec is not valid JSON: ${error.message}"))
    }
}

private fun toTree(value: Any?): Any? = when (value) {
    null, JSONObject.NULL -> JsonNull
    is JSONObject -> buildMap { for (key in value.keys()) put(key, toTree(value.opt(key))) }
    is JSONArray -> List(value.length()) { toTree(value.opt(it)) }
    is Number -> value.toDouble()
    else -> value
}

internal fun writeJson(tree: Any?): String = StringBuilder().also { it.appendJson(tree) }.toString()

private fun StringBuilder.appendJson(value: Any?) {
    when (value) {
        null, JsonNull -> append("null")
        is Boolean -> append(value)
        is Double -> when {
            !value.isFinite() -> append("null")
            value == Math.rint(value) && kotlin.math.abs(value) < 1e15 -> append(value.toLong())
            else -> append(value)
        }
        is String -> {
            append('"')
            for (char in value) {
                when {
                    char == '"' -> append("\\\"")
                    char == '\\' -> append("\\\\")
                    char == '\n' -> append("\\n")
                    char == '\r' -> append("\\r")
                    char == '\t' -> append("\\t")
                    char < ' ' -> append("\\u%04x".format(char.code))
                    else -> append(char)
                }
            }
            append('"')
        }
        is Map<*, *> -> {
            append('{')
            value.entries.forEachIndexed { i, (key, item) ->
                if (i > 0) append(',')
                appendJson(key as String)
                append(':')
                appendJson(item)
            }
            append('}')
        }
        is List<*> -> {
            append('[')
            value.forEachIndexed { i, item ->
                if (i > 0) append(',')
                appendJson(item)
            }
            append(']')
        }
        else -> error("not a JSON value: $value")
    }
}

// ----- model -> tree -----

private fun Num.toTree(): Any = when (this) {
    is Num.Value -> value
    is Num.Param -> mapOf("\$param" to name)
}

private fun Easing.toTree(): Any = when (this) {
    is NamedEasing -> key
    is CubicBezier -> listOf(x1, y1, x2, y2)
}

private fun MutableMap<String, Any?>.putNum(key: String, value: Num?) {
    if (value != null) put(key, value.toTree())
}

internal fun IndicatorSpec.toSpecTree(): Map<String, Any?> = buildMap {
    put("schemaVersion", schemaVersion.toDouble())
    put("name", name)
    put("duration", duration)
    if (params.isNotEmpty()) put("params", params)
    perspective?.let { put("perspective", it) }
    val inline = parts.singleOrNull()?.takeIf { it.duration == null }
    if (inline != null) putPart(inline) else put("parts", parts.map { buildMap { putPart(it) } })
}

private fun MutableMap<String, Any?>.putPart(part: Part) {
    put("layout", part.layout.toTree())
    put("shape", part.shape.toTree())
    part.duration?.let { put("duration", it) }
    part.durations?.let { put("durations", it) }
    part.stagger?.let { put("stagger", it.toTree()) }
    if (part.rest.isNotEmpty()) put("rest", part.rest.entries.associate { (property, value) -> property.key to value.toTree() })
    if (part.tracks.isNotEmpty()) {
        put("tracks", part.tracks.map { trackTree(it.property.key, it.keyTimes, it.values, it.easing) })
    }
    if (part.groupTracks.isNotEmpty()) {
        put("groupTracks", part.groupTracks.map { trackTree(it.property.key, it.keyTimes, it.values, it.easing) })
    }
}

private fun Layout.toTree(): Map<String, Any?> = buildMap {
    when (val layout = this@toTree) {
        is Layout.Single -> {
            put("type", "single")
            putNum("size", layout.size)
            putNum("width", layout.width)
            putNum("height", layout.height)
            putNum("x", layout.x)
            putNum("y", layout.y)
        }
        is Layout.Stack -> {
            put("type", "stack")
            putNum("count", layout.count)
            putNum("size", layout.size)
            putNum("width", layout.width)
            putNum("height", layout.height)
            putNum("x", layout.x)
            putNum("y", layout.y)
        }
        is Layout.Row -> {
            put("type", "row")
            putNum("count", layout.count)
            putNum("gap", layout.gap)
            putNum("itemWidth", layout.itemWidth)
            putNum("itemHeight", layout.itemHeight)
        }
        is Layout.Grid -> {
            put("type", "grid")
            putNum("columns", layout.columns)
            putNum("rows", layout.rows)
            putNum("gap", layout.gap)
        }
        is Layout.Ring -> {
            put("type", "ring")
            putNum("count", layout.count)
            putNum("itemSize", layout.itemSize)
            putNum("itemWidth", layout.itemWidth)
            putNum("itemHeight", layout.itemHeight)
            putNum("startAngle", layout.startAngle)
            if (layout.orient) put("orient", true)
        }
    }
}

private fun Shape.toTree(): Map<String, Any?> = buildMap {
    when (val shape = this@toTree) {
        is Shape.Circle -> {
            put("type", "circle")
            putNum("startAngle", shape.startAngle)
            putNum("sweep", shape.sweep)
        }
        is Shape.Rect -> {
            put("type", "rect")
            putNum("cornerRadius", shape.cornerRadius)
        }
        is Shape.Ring -> {
            put("type", "ring")
            putNum("strokeWidth", shape.strokeWidth)
            putNum("startAngle", shape.startAngle)
            putNum("sweep", shape.sweep)
            putNum("segments", shape.segments)
        }
        Shape.Triangle -> put("type", "triangle")
        Shape.Line -> put("type", "line")
    }
}

private fun Stagger.toTree(): Any = when (this) {
    is Stagger.Offsets -> offsets
    is Stagger.Each -> mapOf("each" to each, "start" to start)
}

private fun trackTree(property: String, keyTimes: List<Double>, values: List<Num>, easing: TrackEasing?) = buildMap {
    put("property", property)
    put("keyTimes", keyTimes)
    put("values", values.map { it.toTree() })
    when (easing) {
        null -> Unit
        is TrackEasing.Uniform -> put("easing", easing.easing.toTree())
        is TrackEasing.PerSegment -> put("easing", easing.easings.map { it.toTree() })
    }
}

// ----- validated tree -> model -----

@Suppress("UNCHECKED_CAST")
private val Any?.obj: Map<String, Any?> get() = this as Map<String, Any?>
private val Any?.list: List<Any?> get() = this as List<*>
private val Any?.double: Double get() = this as Double

private fun numFrom(value: Any?): Num =
    if (value is Double) Num.Value(value) else Num.Param(value.obj["\$param"] as String)

private fun Map<String, Any?>.num(key: String): Num? = this[key]?.let(::numFrom)

private fun easingFrom(value: Any?): Easing =
    if (value is String) {
        NamedEasing.fromKey(value)!!
    } else {
        val (x1, y1, x2, y2) = value.list.map { it.double }
        CubicBezier(x1, y1, x2, y2)
    }

private fun trackEasingFrom(easing: Any?): TrackEasing? = when {
    easing == null -> null
    isPerSegment(easing) -> TrackEasing.PerSegment(easing.list.map(::easingFrom))
    else -> TrackEasing.Uniform(easingFrom(easing))
}

/** Builds the model from a tree that [validateSpecTree] accepted. */
internal fun specFromTree(tree: Any?): IndicatorSpec {
    val spec = tree.obj
    val parts = spec["parts"]
    return IndicatorSpec(
        schemaVersion = spec["schemaVersion"].double.toInt(),
        name = spec["name"] as String,
        duration = spec["duration"].double,
        params = spec["params"]?.obj?.mapValues { it.value.double }.orEmpty(),
        perspective = spec["perspective"] as Double?,
        parts = if (parts == null) listOf(partFrom(spec, inline = true)) else parts.list.map { partFrom(it.obj, inline = false) },
    )
}

private fun partFrom(part: Map<String, Any?>, inline: Boolean): Part {
    val layout = part["layout"].obj
    val shape = part["shape"].obj
    return Part(
        layout = when (layout["type"]) {
            "single" -> Layout.Single(layout.num("size"), layout.num("width"), layout.num("height"), layout.num("x"), layout.num("y"))
            "stack" -> Layout.Stack(
                count = numFrom(layout["count"]),
                size = layout.num("size"),
                width = layout.num("width"),
                height = layout.num("height"),
                x = layout.num("x"),
                y = layout.num("y"),
            )
            "row" -> Layout.Row(numFrom(layout["count"]), numFrom(layout["gap"]), layout.num("itemWidth"), layout.num("itemHeight"))
            "grid" -> Layout.Grid(numFrom(layout["columns"]), numFrom(layout["rows"]), numFrom(layout["gap"]))
            else -> Layout.Ring(
                count = numFrom(layout["count"]),
                itemSize = numFrom(layout["itemSize"]),
                itemWidth = layout.num("itemWidth"),
                itemHeight = layout.num("itemHeight"),
                startAngle = layout.num("startAngle"),
                orient = layout["orient"] == true,
            )
        },
        shape = when (shape["type"]) {
            "circle" -> Shape.Circle(shape.num("startAngle"), shape.num("sweep"))
            "rect" -> Shape.Rect(shape.num("cornerRadius"))
            "ring" -> Shape.Ring(numFrom(shape["strokeWidth"]), shape.num("startAngle"), shape.num("sweep"), shape.num("segments"))
            "triangle" -> Shape.Triangle
            else -> Shape.Line
        },
        stagger = when (val stagger = part["stagger"]) {
            null -> null
            is List<*> -> Stagger.Offsets(stagger.map { it.double })
            else -> Stagger.Each(
                each = stagger.obj["each"].double,
                start = (stagger.obj["start"] as Double?) ?: 0.0,
            )
        },
        duration = if (inline) null else part["duration"] as Double?,
        durations = part["durations"]?.list?.map { it.double },
        rest = part["rest"]?.obj?.entries?.associate { (key, value) -> AnimatableProperty.fromKey(key)!! to numFrom(value) }.orEmpty(),
        tracks = part["tracks"]?.list.orEmpty().map { item ->
            val track = item.obj
            Track(
                property = AnimatableProperty.fromKey(track["property"] as String)!!,
                keyTimes = track["keyTimes"].list.map { it.double },
                values = track["values"].list.map(::numFrom),
                easing = trackEasingFrom(track["easing"]),
            )
        },
        groupTracks = part["groupTracks"]?.list.orEmpty().map { item ->
            val track = item.obj
            GroupTrack(
                property = GroupProperty.fromKey(track["property"] as String)!!,
                keyTimes = track["keyTimes"].list.map { it.double },
                values = track["values"].list.map(::numFrom),
                easing = trackEasingFrom(track["easing"]),
            )
        },
    )
}

/** A per-segment easing list is an array whose first item is not a number. */
internal fun isPerSegment(easing: Any?): Boolean =
    easing is List<*> && easing.isNotEmpty() && easing[0] !is Double
