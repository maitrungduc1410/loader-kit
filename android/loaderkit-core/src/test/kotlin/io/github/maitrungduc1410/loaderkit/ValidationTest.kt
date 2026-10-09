package io.github.maitrungduc1410.loaderkit

import org.json.JSONObject
import org.json.JSONTokener
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

/** Mirrors `spec/test/validate.test.ts` and the messages of `validate.ts`, plus the guarantees an on-device engine needs. */
class ValidationTest {

    private val track = """{ "property": "opacity", "keyTimes": [0, 1], "values": [0, 1] }"""
    private val part = """{ "layout": { "type": "single" }, "shape": { "type": "circle" }, "tracks": [$track] }"""

    private val base = """
        {
          "schemaVersion": 1,
          "name": "Test",
          "duration": 1,
          "layout": { "type": "single" },
          "shape": { "type": "circle" },
          "tracks": [$track]
        }
    """.trimIndent()

    private val head = """{ "schemaVersion": 1, "name": "Test", "duration": 1 }"""

    /** `validate({ ...base, ...patch })`, each patch value given as JSON. */
    private fun errorsFor(vararg patch: Pair<String, String>): List<String> = patched(base, patch)

    /** `validate({ ...head, ...patch })`: a spec with `parts` and no inline group. */
    private fun withParts(vararg patch: Pair<String, String>): List<String> = patched(head, patch)

    private fun patched(json: String, patch: Array<out Pair<String, String>>): List<String> {
        val spec = JSONObject(json)
        for ((key, value) in patch) spec.put(key, JSONTokener(value).nextValue())
        return IndicatorSpec.validate(spec.toString())
    }

    /** `errorsFor({ tracks: [{ ...track, ...patch }] })`. */
    private fun withTrack(vararg patch: Pair<String, String>): List<String> {
        val item = JSONObject(track)
        for ((key, value) in patch) item.put(key, JSONTokener(value).nextValue())
        return errorsFor("tracks" to "[$item]")
    }

    private fun assertRejected(errors: List<String>) = assertTrue("expected errors", errors.isNotEmpty())

    @Test
    fun builtInIndicatorsAreValid() {
        assertEquals(50, BuiltinIndicators.names.size)
        for (name in BuiltinIndicators.names) {
            assertTrue(name in BuiltinIndicators)
            val spec = BuiltinIndicators.require(name)
            assertEquals(name, spec.name)
            assertEquals(emptyList<String>(), spec.validate())
        }
        assertNull(BuiltinIndicators["Nope"])
        assertThrows(InvalidIndicatorSpecException::class.java) { BuiltinIndicators.require("Nope") }
    }

    @Test
    fun baseFixtureIsValid() {
        assertEquals(emptyList<String>(), IndicatorSpec.validate(base))
    }

    @Test
    fun rejectsBadTopLevelFields() {
        assertEquals(listOf("schemaVersion must be 1"), errorsFor("schemaVersion" to "2"))
        assertEquals(listOf("name is required"), errorsFor("name" to "\"\""))
        assertEquals(listOf("duration must be a positive number"), errorsFor("duration" to "0"))
        assertEquals(listOf("params.a must be a finite number"), errorsFor("params" to """{ "a": "x" }"""))
        assertEquals(listOf("params must be an object"), errorsFor("params" to "[]"))
        assertEquals(listOf("perspective must be a positive number"), errorsFor("perspective" to "-1"))
        assertRejected(errorsFor("params" to """{ "a": 1e999 }"""))
        assertEquals(listOf("spec must be an object"), IndicatorSpec.validate("null"))
    }

    @Test
    fun rejectsBadLayouts() {
        assertEquals(
            listOf("layout.type must be one of single, stack, row, grid, ring"),
            errorsFor("layout" to """{ "type": "hex" }"""),
        )
        assertEquals(listOf("layout.count is required"), errorsFor("layout" to """{ "type": "row", "gap": 0.1 }"""))
        assertEquals(listOf("layout.count is required"), errorsFor("layout" to """{ "type": "stack" }"""))
        assertEquals(
            listOf("layout.x must be a number or { \$param }"),
            errorsFor("layout" to """{ "type": "single", "x": "left" }"""),
        )
        assertEquals(
            listOf("layout.size uses unknown param \"nope\""),
            errorsFor("layout" to """{ "type": "single", "size": { "${'$'}param": "nope" } }"""),
        )
        assertEquals(
            listOf("layout.size uses unknown param \"toString\""),
            errorsFor("layout" to """{ "type": "single", "size": { "${'$'}param": "toString" } }"""),
        )
        assertEquals(
            listOf("layout.orient must be a boolean"),
            errorsFor("layout" to """{ "type": "ring", "count": 3, "itemSize": 0.2, "orient": 1 }"""),
        )
        assertRejected(errorsFor("layout" to """{ "type": "single", "size": null }"""))
    }

    @Test
    fun rejectsBadShapes() {
        assertEquals(listOf("shape.strokeWidth is required"), errorsFor("shape" to """{ "type": "ring" }"""))
        assertEquals(
            listOf("shape.sweep must be within (0, 2π]"),
            errorsFor("shape" to """{ "type": "ring", "strokeWidth": 0.1, "sweep": 7 }"""),
        )
        assertEquals(
            listOf("shape.sweep must be within (0, 2π]"),
            errorsFor("shape" to """{ "type": "circle", "sweep": 0 }"""),
        )
        assertEquals(
            listOf("shape.segments must be a number or { \$param }"),
            errorsFor("shape" to """{ "type": "ring", "strokeWidth": 0.1, "segments": "x" }"""),
        )
        assertEquals(
            listOf("shape.type must be one of circle, rect, ring, triangle, line"),
            errorsFor("shape" to """{ "type": 7 }"""),
        )
        assertEquals(
            emptyList<String>(),
            errorsFor("shape" to """{ "type": "circle", "startAngle": 0, "sweep": 6.283185307179586 }"""),
        )
    }

    @Test
    fun rejectsBadStaggerDurationsAndRest() {
        assertEquals(
            listOf("stagger must be an array of offsets or { each, start? }"),
            errorsFor("stagger" to """{ "each": "fast" }"""),
        )
        assertEquals(
            listOf("stagger.start must be a finite number"),
            errorsFor("stagger" to """{ "each": 0.1, "start": "x" }"""),
        )
        assertEquals(listOf("stagger[1] must be a finite number"), errorsFor("stagger" to """[0, "x"]"""))
        assertEquals(listOf("durations[1] must be a positive number"), errorsFor("durations" to "[1, 0]"))
        assertEquals(listOf("durations must be an array"), errorsFor("durations" to "3"))
        assertEquals(emptyList<String>(), errorsFor("durations" to "[0.5]", "rest" to """{ "opacity": 0.5 }"""))
        assertEquals(listOf("rest.skew is not an animatable property"), errorsFor("rest" to """{ "skew": 1 }"""))
        assertEquals(
            listOf("rest.opacity uses unknown param \"missing\""),
            errorsFor("rest" to """{ "opacity": { "${'$'}param": "missing" } }"""),
        )
        assertEquals(listOf("rest must be an object"), errorsFor("rest" to "3"))
    }

    @Test
    fun negativeStaggerOffsetsStartAnElementMidCycle() {
        val stack = """{ "type": "stack", "count": 2 }"""
        assertEquals(emptyList<String>(), errorsFor("layout" to stack, "stagger" to "[0, -0.5]"))
        assertEquals(emptyList<String>(), errorsFor("layout" to stack, "stagger" to """{ "each": -0.1, "start": 0.2 }"""))
    }

    @Test
    fun strokeTrimsNeedARingShape() {
        val trim = """{ "property": "strokeEnd", "keyTimes": [0, 1], "values": [0, 1] }"""
        assertEquals(listOf("tracks[0].property \"strokeEnd\" needs a ring shape"), errorsFor("tracks" to "[$trim]"))
        assertEquals(listOf("rest.strokeStart needs a ring shape"), errorsFor("rest" to """{ "strokeStart": 0.2 }"""))
        assertEquals(
            emptyList<String>(),
            errorsFor(
                "shape" to """{ "type": "ring", "strokeWidth": 0.1 }""",
                "tracks" to "[$trim]",
                "rest" to """{ "strokeStart": 0.2 }""",
            ),
        )
    }

    @Test
    fun partsAndGroupTracks() {
        val groupRotate = """{ "property": "rotate", "keyTimes": [0, 1], "values": [0, 1] }"""
        val rect = """{ "layout": { "type": "single" }, "shape": { "type": "rect" }, "duration": 2 }"""
        val bare = """{ "layout": { "type": "single" }, "shape": { "type": "circle" } }"""
        assertEquals(emptyList<String>(), withParts("parts" to "[$part, $rect]"))
        assertEquals(
            emptyList<String>(),
            withParts("parts" to """[{ "layout": { "type": "single" }, "shape": { "type": "circle" }, "groupTracks": [$groupRotate] }]"""),
        )
        assertEquals(listOf("the spec needs at least one track or group track"), withParts("parts" to "[$bare]"))
        assertEquals(listOf("parts must be a non-empty array"), withParts("parts" to "{}"))
        assertEquals(listOf("parts must be a non-empty array"), withParts("parts" to "null"))
        assertEquals(listOf("parts[0] must be an object"), withParts("parts" to "[3]"))
        assertEquals(
            listOf(
                "layout must be set inside parts when the spec has parts",
                "shape must be set inside parts when the spec has parts",
                "tracks must be set inside parts when the spec has parts",
                "parts must be a non-empty array",
            ),
            errorsFor("parts" to "[]"),
        )
        assertEquals(
            listOf(
                "layout must be set inside parts when the spec has parts",
                "durations must be set inside parts when the spec has parts",
            ),
            withParts("parts" to "[$part]", "layout" to """{ "type": "single" }""", "durations" to "[1]"),
        )
    }

    @Test
    fun errorPathsNameThePart() {
        fun partWith(key: String, value: String) = JSONObject(part).put(key, JSONTokener(value).nextValue()).toString()
        assertEquals(
            listOf("parts[0].layout.type must be one of single, stack, row, grid, ring"),
            withParts("parts" to "[${partWith("layout", """{ "type": "hex" }""")}]"),
        )
        assertEquals(
            listOf("parts[0].duration must be a positive number"),
            withParts("parts" to "[${partWith("duration", "0")}]"),
        )
        assertEquals(
            listOf("parts[1].tracks[0].keyTimes[1] must be within [0, 1]"),
            withParts("parts" to "[$part, ${partWith("tracks", """[{ "property": "opacity", "keyTimes": [0, 2], "values": [0, 1] }]""")}]"),
        )
        assertEquals(
            listOf("parts[0].rest.strokeEnd needs a ring shape"),
            withParts("parts" to "[${partWith("rest", """{ "strokeEnd": 0.5 }""")}]"),
        )
        assertEquals(
            listOf("parts[0].stagger[1] must be a finite number"),
            withParts("parts" to "[${partWith("stagger", """[0, "x"]""")}]"),
        )
    }

    @Test
    fun rejectsBadTracks() {
        assertEquals(
            listOf(
                "tracks[0].property must be one of scale, scaleX, scaleY, opacity, rotate, rotateX, rotateY, " +
                    "translateX, translateY, strokeStart, strokeEnd",
            ),
            withTrack("property" to "\"skew\""),
        )
        assertEquals(listOf("tracks[0].keyTimes needs at least 2 entries"), withTrack("keyTimes" to "[0]", "values" to "[0]"))
        assertEquals(listOf("tracks[0].keyTimes must be non-decreasing"), withTrack("keyTimes" to "[0.5, 0.2]"))
        assertEquals(listOf("tracks[0].keyTimes[1] must be within [0, 1]"), withTrack("keyTimes" to "[0, 1.5]"))
        assertEquals(listOf("tracks[0].keyTimes[1] must be within [0, 1]"), withTrack("keyTimes" to """[0, "a"]"""))
        assertEquals(listOf("tracks[0].values must have the same length as keyTimes"), withTrack("values" to "[0, 1, 2]"))
        assertEquals(listOf("tracks[0].values[1] must be a number or { \$param }"), withTrack("values" to """[0, "a"]"""))
        assertEquals(listOf("tracks[0].easing \"bounce\" is not a named easing"), withTrack("easing" to "\"bounce\""))
        assertEquals(listOf("tracks[0].easing \"constructor\" is not a named easing"), withTrack("easing" to "\"constructor\""))
        assertEquals(listOf("tracks[0].easing x1 and x2 must be within [0, 1]"), withTrack("easing" to "[1.5, 0, 0, 1]"))
        assertEquals(listOf("tracks[0].easing must be a named easing or [x1, y1, x2, y2]"), withTrack("easing" to "[]"))
        assertEquals(
            listOf("tracks[0].easing needs one entry per segment (1)"),
            withTrack("easing" to """["linear", "easeIn"]"""),
        )
        assertEquals(
            listOf("tracks[0].easing[1] x1 and x2 must be within [0, 1]"),
            withTrack("keyTimes" to "[0, 0.5, 1]", "values" to "[0, 1, 0]", "easing" to """["ease", [0, 0, 2, 1]]"""),
        )
        assertEquals(
            listOf("tracks[1].property \"opacity\" is animated by more than one track"),
            errorsFor("tracks" to "[$track, $track]"),
        )
        assertEquals(listOf("tracks[0] must be an object"), errorsFor("tracks" to "[1]"))
        assertEquals(listOf("tracks must be an array"), errorsFor("tracks" to "{}"))
        assertEquals(listOf("the spec needs at least one track or group track"), errorsFor("tracks" to "[]"))
    }

    @Test
    fun rejectsBadGroupTracks() {
        val scale = """{ "property": "scale", "keyTimes": [0, 1], "values": [0, 1] }"""
        assertEquals(
            listOf("groupTracks[0].property must be one of scale, scaleX, scaleY, opacity, rotate, translateX, translateY"),
            errorsFor("groupTracks" to """[{ "property": "rotateX", "keyTimes": [0, 1], "values": [0, 1] }]"""),
        )
        assertEquals(
            listOf("groupTracks[1].property \"scale\" is animated by more than one track"),
            errorsFor("groupTracks" to "[$scale, $scale]"),
        )
    }

    @Test
    fun throwsWithEveryProblemListed() {
        val error = assertThrows(InvalidIndicatorSpecException::class.java) {
            IndicatorSpec.parse(
                """
                {
                  "schemaVersion": 1, "name": "Custom", "duration": -1,
                  "layout": { "type": "row", "count": { "${'$'}param": "count" }, "gap": 0.1 },
                  "shape": { "type": "circle" },
                  "tracks": []
                }
                """.trimIndent(),
            )
        }
        assertTrue(error.errors.toString(), error.errors.size >= 2)
        assertTrue(error.errors.contains("layout.count uses unknown param \"count\""))
    }

    @Test
    fun catchesShortStaggerAndDurationsWhenPrepared() {
        fun spec(extra: String) = """
            {
              "schemaVersion": 1, "name": "Custom", "duration": 1,
              "layout": { "type": "row", "count": 3, "gap": 0.1 },
              "shape": { "type": "circle" },
              $extra,
              "tracks": [$track]
            }
        """.trimIndent()
        val stagger = assertThrows(InvalidIndicatorSpecException::class.java) {
            IndicatorSpec.parse(spec(""""stagger": [0, 0.1]"""))
        }
        assertEquals(listOf("stagger has 2 entries but the layout has 3 elements"), stagger.errors)
        val durations = assertThrows(InvalidIndicatorSpecException::class.java) {
            IndicatorSpec.parse(spec(""""durations": [1, 1]"""))
        }
        assertEquals(listOf("durations has 2 entries but the layout has 3 elements"), durations.errors)
    }

    @Test
    fun paramsThatBreakTheSpecAreRejected() {
        val spec = IndicatorSpec(
            name = "Custom",
            duration = 1.0,
            params = mapOf("count" to 2.0, "segments" to 2.0),
            layout = Layout.Row(count = param("count"), gap = Num(0.1)),
            shape = Shape.Ring(strokeWidth = Num(0.1), segments = param("segments")),
            stagger = Stagger.Offsets(listOf(0.0, 0.1)),
            tracks = listOf(Track(AnimatableProperty.Opacity, listOf(0.0, 1.0), listOf(Num(0.0), Num(1.0)))),
        )
        assertEquals(emptyList<String>(), spec.validate())
        assertEquals(2, PreparedIndicator(spec).elementCount)
        for (count in listOf(3.0, Double.NaN, Double.POSITIVE_INFINITY, 1e12)) {
            assertThrows(InvalidIndicatorSpecException::class.java) { PreparedIndicator(spec, mapOf("count" to count)) }
        }
        for (segments in listOf(Double.NaN, 1e12)) {
            assertThrows(InvalidIndicatorSpecException::class.java) {
                PreparedIndicator(spec, mapOf("segments" to segments))
            }
        }
    }

    @Test
    fun elementLimitCoversEveryPart() {
        val big = Part(
            layout = Layout.Grid(Num(80.0), Num(80.0), Num(0.0)),
            shape = Shape.Rect(),
            tracks = listOf(Track(AnimatableProperty.Opacity, listOf(0.0, 1.0), listOf(Num(0.0), Num(1.0)))),
        )
        val spec = IndicatorSpec(name = "Big", duration = 1.0, parts = listOf(big, big))
        val error = assertThrows(InvalidIndicatorSpecException::class.java) { PreparedIndicator(spec) }
        assertEquals(listOf("the spec has 12800 elements, the maximum is $MAX_ELEMENTS"), error.errors)
        assertEquals(6400, PreparedIndicator(spec.copy(parts = listOf(big))).elementCount)
    }

    @Test
    fun ringArcLimitCoversEveryRingPart() {
        val opacity = listOf(Track(AnimatableProperty.Opacity, listOf(0.0, 1.0), listOf(Num(0.0), Num(1.0))))
        fun rings(count: Double) = Part(Layout.Stack(Num(count)), Shape.Ring(Num(0.1), segments = Num(1000.0)), opacity)
        // Circles count as elements, not arcs.
        val dots = Part(Layout.Grid(Num(50.0), Num(50.0), Num(0.0)), Shape.Circle(), opacity)
        val tooMany = IndicatorSpec(name = "Arcs", duration = 1.0, parts = listOf(rings(8.0), rings(4.0), dots))
        val error = assertThrows(InvalidIndicatorSpecException::class.java) { PreparedIndicator(tooMany) }
        assertEquals(listOf("the spec draws 12000 ring arcs, the maximum is $MAX_ELEMENTS"), error.errors)
        val enough = tooMany.copy(parts = listOf(rings(6.0), rings(4.0), dots))
        assertEquals(2510, PreparedIndicator(enough).elementCount)
    }

    @Test
    fun badInputNeverThrowsAnythingElse() {
        val inputs = listOf(
            "", "{", "[]", "42", "\"spec\"", "{} trailing", "{\"schemaVersion\": 1}",
            """{"schemaVersion":1,"name":"x","duration":1,"layout":[],"shape":7,"tracks":[1,null,{}]}""",
            """{"schemaVersion":1,"name":"x","duration":1,"layout":{"type":"grid","columns":"a","rows":{},"gap":[]},""" +
                """"shape":{"type":"rect","cornerRadius":{"${'$'}param":3}},"stagger":"x","tracks":[{"property":"scale",""" +
                """"keyTimes":[0,"a",null],"values":{},"easing":[[],"x",null]}]}""",
            """{"schemaVersion":1,"name":"x","duration":1,"parts":[null,{"layout":{"type":"stack","count":null},""" +
                """"shape":{"type":"ring","strokeWidth":[],"sweep":"x","segments":{}},"rest":[],"durations":{},""" +
                """"groupTracks":[{"property":null}],"tracks":7}]}""",
        )
        for (input in inputs) {
            val errors = IndicatorSpec.validate(input)
            assertTrue("expected errors for $input", errors.isNotEmpty())
        }
    }

    @Test
    fun modelRoundTripsThroughJson() {
        for (name in BuiltinIndicators.names) {
            val spec = BuiltinIndicators.require(name)
            assertEquals(spec, IndicatorSpec.parse(spec.toJson()))
        }
        val inline = IndicatorSpec(
            name = "Inline",
            duration = 1.0,
            layout = Layout.Single(),
            shape = Shape.Circle(),
            tracks = listOf(Track(AnimatableProperty.Opacity, listOf(0.0, 1.0), listOf(Num(0.0), Num(1.0)))),
        )
        assertTrue(JSONObject(inline.toJson()).has("layout"))
        val withDuration = inline.copy(parts = listOf(inline.parts[0].copy(duration = 2.0)))
        assertTrue(JSONObject(withDuration.toJson()).has("parts"))
        assertEquals(withDuration, IndicatorSpec.parse(withDuration.toJson()))
    }
}
