package io.github.maitrungduc1410.loaderkit

import kotlin.math.PI

private val PROPERTIES = AnimatableProperty.entries.map { it.key }
private val GROUP_PROPERTIES = GroupProperty.entries.map { it.key }
private val STROKE_PROPERTIES = listOf(AnimatableProperty.StrokeStart.key, AnimatableProperty.StrokeEnd.key)
private val SHAPES = listOf("circle", "rect", "ring", "triangle", "line")
private val LAYOUTS = listOf("single", "stack", "row", "grid", "ring")
private val PART_FIELDS = listOf("layout", "shape", "tracks", "stagger", "durations", "rest", "groupTracks")
private val NAMED_EASINGS = NamedEasing.entries.map { it.key }

private class Fields(val required: List<String>, val optional: List<String>)

private val LAYOUT_FIELDS: Map<String, Fields> = mapOf(
    "single" to Fields(emptyList(), listOf("size", "width", "height", "x", "y")),
    "stack" to Fields(listOf("count"), listOf("size", "width", "height", "x", "y")),
    "row" to Fields(listOf("count", "gap"), listOf("itemWidth", "itemHeight")),
    "grid" to Fields(listOf("columns", "rows", "gap"), emptyList()),
    "ring" to Fields(listOf("count", "itemSize"), listOf("itemWidth", "itemHeight", "startAngle")),
)

private val SHAPE_FIELDS: Map<String, Fields> = mapOf(
    "circle" to Fields(emptyList(), listOf("startAngle", "sweep")),
    "rect" to Fields(emptyList(), listOf("cornerRadius")),
    "ring" to Fields(listOf("strokeWidth"), listOf("startAngle", "sweep", "segments")),
    "triangle" to Fields(emptyList(), emptyList()),
    "line" to Fields(emptyList(), emptyList()),
)

private fun isPositive(value: Any?) = value is Double && value.isFinite() && value > 0
private fun isFiniteNumber(value: Any?) = value is Double && value.isFinite()

/** Every problem found in a spec tree; an empty list means it is a valid schema v1 spec. */
internal fun validateSpecTree(input: Any?): List<String> {
    if (input !is Map<*, *>) return listOf("spec must be an object")
    val errors = mutableListOf<String>()
    val paramNames = (input["params"] as? Map<*, *>)?.keys.orEmpty()

    fun checkNum(value: Any?, path: String) {
        when {
            value is Double -> if (!value.isFinite()) errors += "$path must be finite"
            value is Map<*, *> && value["\$param"] is String -> {
                val name = value["\$param"]
                if (name !in paramNames) errors += "$path uses unknown param \"$name\""
            }
            else -> errors += "$path must be a number or { \$param }"
        }
    }

    fun checkFields(target: Map<*, *>, fields: Fields, path: String) {
        for (key in fields.required) {
            val value = target[key]
            if (value == null) errors += "$path.$key is required" else checkNum(value, "$path.$key")
        }
        for (key in fields.optional) target[key]?.let { checkNum(it, "$path.$key") }
    }

    fun checkTracks(tracks: Any?, path: String, allowed: List<String>, stroke: Boolean): Int {
        if (tracks == null) return 0
        if (tracks !is List<*>) {
            errors += "$path must be an array"
            return 0
        }
        val seen = mutableSetOf<Any?>()
        tracks.forEachIndexed { i, track ->
            val trackPath = "$path[$i]"
            if (track !is Map<*, *>) {
                errors += "$trackPath must be an object"
                return@forEachIndexed
            }
            val property = track["property"]
            if (property !is String || property !in allowed) {
                errors += "$trackPath.property must be one of ${allowed.joinToString()}"
            } else if (property in seen) {
                errors += "$trackPath.property \"$property\" is animated by more than one track"
            } else if (property in STROKE_PROPERTIES && !stroke) {
                errors += "$trackPath.property \"$property\" needs a ring shape"
            }
            seen += property

            val keyTimes = track["keyTimes"]
            val values = track["values"]
            if (keyTimes !is List<*> || keyTimes.size < 2) {
                errors += "$trackPath.keyTimes needs at least 2 entries"
                return@forEachIndexed
            }
            keyTimes.forEachIndexed { k, value ->
                val previous = keyTimes.getOrNull(k - 1)
                if (value !is Double || !value.isFinite() || value < 0 || value > 1) {
                    errors += "$trackPath.keyTimes[$k] must be within [0, 1]"
                } else if (previous is Double && value < previous) {
                    errors += "$trackPath.keyTimes must be non-decreasing"
                }
            }
            if (values !is List<*> || values.size != keyTimes.size) {
                errors += "$trackPath.values must have the same length as keyTimes"
            } else {
                values.forEachIndexed { k, value -> checkNum(value, "$trackPath.values[$k]") }
            }

            val easing = track["easing"]
            if (easing != null) {
                if (isPerSegment(easing)) {
                    val easings = easing as List<*>
                    if (easings.size != keyTimes.size - 1) {
                        errors += "$trackPath.easing needs one entry per segment (${keyTimes.size - 1})"
                    }
                    easings.forEachIndexed { k, item -> checkEasing(item, "$trackPath.easing[$k]", errors) }
                } else {
                    checkEasing(easing, "$trackPath.easing", errors)
                }
            }
        }
        return tracks.size
    }

    /** Checks one group of elements; returns its number of tracks and group tracks. */
    fun checkPart(part: Map<*, *>, prefix: String): Int {
        fun at(field: String) = "$prefix$field"

        val layout = part["layout"]
        val layoutType = (layout as? Map<*, *>)?.get("type")
        if (layout !is Map<*, *> || layoutType !is String || layoutType !in LAYOUTS) {
            errors += "${at("layout.type")} must be one of ${LAYOUTS.joinToString()}"
        } else {
            checkFields(layout, LAYOUT_FIELDS.getValue(layoutType), at("layout"))
            layout["orient"]?.let { if (it !is Boolean) errors += "${at("layout.orient")} must be a boolean" }
        }

        val shape = part["shape"]
        val shapeType = (shape as? Map<*, *>)?.get("type")
        var stroke = false
        if (shape !is Map<*, *> || shapeType !is String || shapeType !in SHAPES) {
            errors += "${at("shape.type")} must be one of ${SHAPES.joinToString()}"
        } else {
            stroke = shapeType == "ring"
            checkFields(shape, SHAPE_FIELDS.getValue(shapeType), at("shape"))
            val sweep = shape["sweep"]
            if (sweep is Double && sweep.isFinite() && !(sweep > 0 && sweep <= 2 * PI + 1e-9)) {
                errors += "${at("shape.sweep")} must be within (0, 2π]"
            }
        }

        when (val stagger = part["stagger"]) {
            null -> Unit
            is List<*> -> stagger.forEachIndexed { i, value ->
                if (!isFiniteNumber(value)) errors += "${at("stagger[$i]")} must be a finite number"
            }
            else -> {
                val start = (stagger as? Map<*, *>)?.get("start")
                if (stagger !is Map<*, *> || !isFiniteNumber(stagger["each"])) {
                    errors += "${at("stagger")} must be an array of offsets or { each, start? }"
                } else if (start != null && !isFiniteNumber(start)) {
                    errors += "${at("stagger.start")} must be a finite number"
                }
            }
        }

        val duration = part["duration"]
        if (duration != null && prefix.isNotEmpty() && !isPositive(duration)) {
            errors += "${at("duration")} must be a positive number"
        }
        when (val durations = part["durations"]) {
            null -> Unit
            is List<*> -> durations.forEachIndexed { i, value ->
                if (!isPositive(value)) errors += "${at("durations[$i]")} must be a positive number"
            }
            else -> errors += "${at("durations")} must be an array"
        }

        when (val rest = part["rest"]) {
            null -> Unit
            is Map<*, *> -> for ((property, value) in rest) {
                when {
                    property !in PROPERTIES -> errors += "${at("rest.$property")} is not an animatable property"
                    property in STROKE_PROPERTIES && !stroke -> errors += "${at("rest.$property")} needs a ring shape"
                    else -> checkNum(value, at("rest.$property"))
                }
            }
            else -> errors += "${at("rest")} must be an object"
        }

        return checkTracks(part["tracks"], at("tracks"), PROPERTIES, stroke) +
            checkTracks(part["groupTracks"], at("groupTracks"), GROUP_PROPERTIES, stroke)
    }

    if (input["schemaVersion"] != SCHEMA_VERSION.toDouble()) errors += "schemaVersion must be $SCHEMA_VERSION"
    val name = input["name"]
    if (name !is String || name.isEmpty()) errors += "name is required"
    if (!isPositive(input["duration"])) errors += "duration must be a positive number"
    input["params"]?.let { declared ->
        if (declared !is Map<*, *>) {
            errors += "params must be an object"
        } else {
            for ((key, value) in declared) {
                if (!isFiniteNumber(value)) errors += "params.$key must be a finite number"
            }
        }
    }
    input["perspective"]?.let { perspective ->
        if (!isPositive(perspective)) errors += "perspective must be a positive number"
    }

    var animated = 0
    val parts = input["parts"]
    if (parts != null) {
        for (field in PART_FIELDS) {
            if (input[field] != null) errors += "$field must be set inside parts when the spec has parts"
        }
        if (parts !is List<*> || parts.isEmpty()) {
            errors += "parts must be a non-empty array"
        } else {
            parts.forEachIndexed { i, part ->
                if (part !is Map<*, *>) errors += "parts[$i] must be an object" else animated += checkPart(part, "parts[$i].")
            }
        }
    } else {
        animated = checkPart(input, "")
    }
    if (animated == 0 && errors.isEmpty()) errors += "the spec needs at least one track or group track"

    return errors
}

private fun checkEasing(easing: Any?, path: String, errors: MutableList<String>) {
    if (easing is String) {
        if (easing !in NAMED_EASINGS) errors += "$path \"$easing\" is not a named easing"
        return
    }
    if (easing !is List<*> || easing.size != 4 || easing.any { !isFiniteNumber(it) }) {
        errors += "$path must be a named easing or [x1, y1, x2, y2]"
        return
    }
    val x1 = easing[0] as Double
    val x2 = easing[2] as Double
    if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) errors += "$path x1 and x2 must be within [0, 1]"
}
