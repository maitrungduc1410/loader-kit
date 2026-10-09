package io.github.maitrungduc1410.loaderkit

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.io.File
import kotlin.math.abs

/** Runs the LoaderKitProgress vectors of `test-vectors/progress/` against the Kotlin implementation. */
class ProgressVectorsTest {
    private val dir: File = generateSequence(File("").absoluteFile) { it.parentFile }
        .map { File(it, "test-vectors/progress") }
        .first { File(it, "index.json").isFile }
    private fun load(name: String) = JSONObject(File(dir, name).readText())
    private val index = load("index.json")
    private val tolerance = index.getDouble("tolerance")
    private val files = index.getJSONArray("files").let { array -> (0 until array.length()).map { array.getString(it) } }

    private fun json(paint: ProgressPaint): Map<String, Any?> {
        fun stops(stops: List<ProgressColorStop>) = stops.map { mapOf("offset" to it.offset, "color" to it.color.key, "alpha" to it.alpha) }
        return when (paint) {
            is ProgressPaint.Solid -> mapOf("type" to "solid", "color" to paint.color.key, "alpha" to paint.alpha)
            is ProgressPaint.Linear -> mapOf("type" to "linear", "x0" to paint.x0, "y0" to paint.y0, "x1" to paint.x1, "y1" to paint.y1, "stops" to stops(paint.stops))
            is ProgressPaint.Radial -> mapOf("type" to "radial", "cx" to paint.cx, "cy" to paint.cy, "r" to paint.r, "stops" to stops(paint.stops))
            is ProgressPaint.Conic -> mapOf("type" to "conic", "cx" to paint.cx, "cy" to paint.cy, "start" to paint.start, "stops" to stops(paint.stops))
        }
    }

    private fun json(shape: ProgressClipShape): Map<String, Any?> = when (shape) {
        is ProgressClipShape.Rect -> mapOf("type" to "rect", "x" to shape.x, "y" to shape.y, "width" to shape.width, "height" to shape.height, "radius" to shape.radius)
        is ProgressClipShape.Circle -> mapOf("type" to "circle", "cx" to shape.cx, "cy" to shape.cy, "r" to shape.r)
        is ProgressClipShape.Polygon -> mapOf("type" to "polygon", "points" to shape.points)
    }

    private fun json(c: ProgressCommand): Map<String, Any?> = when (c) {
        is ProgressCommand.Line -> mapOf("op" to "line", "x0" to c.x0, "y0" to c.y0, "x1" to c.x1, "y1" to c.y1, "lineWidth" to c.lineWidth, "cap" to c.cap.key, "paint" to json(c.paint))
        is ProgressCommand.Arc -> mapOf("op" to "arc", "cx" to c.cx, "cy" to c.cy, "r" to c.r, "start" to c.start, "end" to c.end, "lineWidth" to c.lineWidth, "cap" to c.cap.key, "paint" to json(c.paint))
        is ProgressCommand.Polyline -> mapOf("op" to "polyline", "points" to c.points, "closed" to c.closed, "lineWidth" to c.lineWidth, "cap" to c.cap.key, "paint" to json(c.paint))
        is ProgressCommand.Circle -> mapOf("op" to "circle", "cx" to c.cx, "cy" to c.cy, "r" to c.r, "paint" to json(c.paint))
        is ProgressCommand.Rect -> mapOf("op" to "rect", "x" to c.x, "y" to c.y, "width" to c.width, "height" to c.height, "radius" to c.radius, "paint" to json(c.paint))
        is ProgressCommand.StrokeRect -> mapOf("op" to "strokeRect", "x" to c.x, "y" to c.y, "width" to c.width, "height" to c.height, "radius" to c.radius, "lineWidth" to c.lineWidth, "paint" to json(c.paint))
        is ProgressCommand.Polygon -> mapOf("op" to "polygon", "points" to c.points, "paint" to json(c.paint))
        is ProgressCommand.Sector -> mapOf("op" to "sector", "cx" to c.cx, "cy" to c.cy, "r" to c.r, "start" to c.start, "end" to c.end, "paint" to json(c.paint))
        is ProgressCommand.Text -> mapOf("op" to "text", "x" to c.x, "y" to c.y, "size" to c.size, "text" to c.text, "align" to if (c.alignRight) "right" else "center", "paint" to json(c.paint))
        is ProgressCommand.Clip -> mapOf("op" to "clip", "shape" to json(c.shape), "commands" to c.commands.map { json(it) })
    }

    private fun json(p: ResolvedProgress): Map<String, Any?> = mapOf(
        "type" to p.type.key, "variant" to p.variant.key, "thickness" to p.thickness, "trackGap" to p.trackGap,
        "segments" to p.segments.toDouble(), "showLabel" to p.showLabel, "stopIndicator" to p.stopIndicator,
        "strokeCap" to p.strokeCap.key, "amplitude" to p.amplitude, "wavelength" to p.wavelength,
        "waveSpeed" to p.waveSpeed, "sweepAngle" to p.sweepAngle, "cornerRadius" to p.cornerRadius, "speed" to p.speed,
    )

    private fun json(animator: ProgressAnimator): Map<String, Any?> {
        val s = animator.state
        return mapOf(
            "indeterminate" to s.indeterminate, "value" to s.value, "buffer" to s.buffer, "wave" to s.wave, "time" to s.time,
            "indeterminateTime" to s.indeterminateTime, "target" to animator.target, "moving" to animator.moving,
        )
    }

    private fun JSONObject.number(name: String): Double? = if (has(name) && !isNull(name)) getDouble(name) else null

    private fun JSONObject.bool(name: String): Boolean? = if (has(name) && !isNull(name)) getBoolean(name) else null

    private fun JSONObject.string(name: String): String? = if (has(name) && !isNull(name)) getString(name) else null

    private fun options(json: JSONObject) = ProgressOptions(
        type = ProgressType.of(json.string("type")),
        variant = ProgressVariant.of(json.string("variant")),
        thickness = json.number("thickness"),
        trackGap = json.number("trackGap"),
        segments = json.number("segments"),
        showLabel = json.bool("showLabel"),
        stopIndicator = json.bool("stopIndicator"),
        strokeCap = ProgressStrokeCap.of(json.string("strokeCap")),
        amplitude = json.number("amplitude"),
        wavelength = json.number("wavelength"),
        waveSpeed = json.number("waveSpeed"),
        sweepAngle = json.number("sweepAngle"),
        cornerRadius = json.number("cornerRadius"),
        speed = json.number("speed"),
    )

    private fun state(json: JSONObject) = ProgressState(
        indeterminate = json.getBoolean("indeterminate"),
        value = json.getDouble("value"),
        buffer = json.getDouble("buffer"),
        wave = json.getDouble("wave"),
        time = json.getDouble("time"),
        indeterminateTime = json.getDouble("indeterminateTime"),
    )

    private fun assertClose(actual: Any?, expected: Any?, path: String) {
        when (actual) {
            null -> assertTrue("$path: expected $expected, got null", expected == null || expected == JSONObject.NULL)
            is Boolean -> assertEquals(path, expected, actual)
            is Double -> {
                if (expected !is Number) fail("$path: expected $expected, got $actual")
                val number = (expected as Number).toDouble()
                assertTrue("$path: $actual != $number", abs(actual - number) <= tolerance)
            }
            is String -> assertEquals(path, expected, actual)
            is Map<*, *> -> {
                if (expected !is JSONObject) fail("$path: not an object")
                val obj = expected as JSONObject
                assertEquals("$path keys", obj.keys().asSequence().toSet(), actual.keys)
                for ((key, value) in actual) assertClose(value, obj.opt(key as String), "$path.$key")
            }
            is List<*> -> {
                if (expected !is JSONArray) fail("$path: not an array")
                val array = expected as JSONArray
                assertEquals("$path length", array.length(), actual.size)
                actual.forEachIndexed { i, value -> assertClose(value, array.get(i), "$path[$i]") }
            }
            else -> fail("$path: unexpected $actual")
        }
    }

    @Test
    fun indexListsEveryFile() {
        val onDisk = dir.list { _, name -> name.endsWith(".json") && name != "index.json" }.orEmpty().toSet()
        assertEquals(onDisk, files.toSet())
        assertEquals(12, files.size)
    }

    @Test
    fun resolveVectors() {
        val cases = load("resolve.json").getJSONArray("cases")
        for (i in 0 until cases.length()) {
            val c = cases.getJSONObject(i)
            val name = c.getString("description")
            val resolved = ResolvedProgress(options(c.getJSONObject("options")))
            assertClose(json(resolved), c.getJSONObject("resolved"), name)
            assertClose(mapOf("width" to resolved.intrinsicWidth, "height" to resolved.intrinsicHeight), c.getJSONObject("intrinsicSize"), "$name size")
            assertClose(resolved.contentInset, c.get("contentInset"), "$name inset")
        }
    }

    @Test
    fun geometryVectors() {
        val geometry = files.filter { it.startsWith("geometry-") }
        assertEquals(10, geometry.size)
        for (file in geometry) {
            val cases = load(file).getJSONArray("cases")
            assertTrue(cases.length() > 0)
            for (i in 0 until cases.length()) {
                val c = cases.getJSONObject(i)
                val drawing = ProgressGeometry.commands(
                    ResolvedProgress(options(c.getJSONObject("options"))),
                    state(c.getJSONObject("state")),
                    c.getDouble("width"),
                    c.getDouble("height"),
                )
                val name = "$file ${c.getString("description")}"
                assertClose(drawing.x, c.get("x"), "$name x")
                assertClose(drawing.y, c.get("y"), "$name y")
                assertClose(drawing.commands.map { json(it) }, c.getJSONArray("commands"), name)
            }
        }
    }

    @Test
    fun animatorVectors() {
        fun value(json: Any?): Double? = when (json) {
            is Number -> json.toDouble()
            "NaN" -> Double.NaN
            else -> null
        }
        val scenarios = load("animator.json").getJSONArray("scenarios")
        for (n in 0 until scenarios.length()) {
            val scenario = scenarios.getJSONObject(n)
            val name = scenario.getString("description")
            val initial = scenario.getJSONObject("initial")
            val animator = ProgressAnimator(value(initial.get("value")), value(initial.get("buffer")))
            assertClose(json(animator), scenario.getJSONObject("initialState"), "$name initial")
            var speed = scenario.getDouble("speed")
            var reduceMotion = scenario.getBoolean("reduceMotion")
            val events = scenario.getJSONArray("events").let { array -> (0 until array.length()).map { array.getJSONObject(it) } }
            val snapshots = scenario.getJSONArray("snapshots")
            val every = scenario.getInt("every")
            val fps = scenario.getDouble("fps")
            var next = 0
            for (frame in 0 until scenario.getInt("frames")) {
                for (event in events.filter { it.getInt("frame") == frame }) {
                    val now = frame / fps
                    when (event.getString("set")) {
                        "value" -> animator.setValue(value(event.get("value")), now, event.getBoolean("smooth"))
                        "buffer" -> animator.setBuffer(value(event.get("value")), now, event.getBoolean("smooth"))
                        "speed" -> speed = event.getDouble("value")
                        else -> reduceMotion = event.getBoolean("value")
                    }
                }
                animator.step(1.0 / fps, speed, reduceMotion)
                if (frame % every != 0) continue
                val expected = snapshots.getJSONObject(next++)
                assertEquals(frame, expected.getInt("frame"))
                expected.remove("frame")
                assertClose(json(animator), expected, "$name frame $frame")
            }
            assertEquals(name, snapshots.length(), next)
        }
    }

    @Test
    fun labelRoundsHalfUp() {
        assertEquals("13%", ProgressGeometry.label(0.125))
        assertEquals("1%", ProgressGeometry.label(0.005))
        assertEquals("100%", ProgressGeometry.label(2.0))
        assertEquals("0%", ProgressGeometry.label(-1.0))
    }

    @Test
    fun nonFiniteInput() {
        assertTrue(ProgressAnimator(Double.NaN).indeterminate)
        assertEquals(1.0, ProgressAnimator(Double.POSITIVE_INFINITY).target!!, 0.0)
        val resolved = ResolvedProgress(ProgressOptions(type = ProgressType.Linear, thickness = Double.NaN, segments = Double.POSITIVE_INFINITY, speed = Double.NaN))
        assertEquals(4.0, resolved.thickness, 0.0)
        assertEquals(1, resolved.segments)
        assertEquals(1.0, resolved.speed, 0.0)
        assertTrue(ProgressGeometry.commands(resolved, ProgressAnimator(0.5).state, Double.NaN, 10.0).commands.isEmpty())
    }
}
