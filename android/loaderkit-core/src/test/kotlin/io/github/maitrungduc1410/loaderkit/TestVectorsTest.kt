package io.github.maitrungduc1410.loaderkit

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized
import java.io.File
import kotlin.math.abs

/** Runs every conformance vector of `test-vectors/` (SPEC §10) against the Kotlin evaluator. */
@RunWith(Parameterized::class)
class TestVectorsTest(private val file: String) {

    private val vector = JSONObject(File(vectorsDir, file).readText())
    private val spec = IndicatorSpec.parse(vector.getJSONObject("spec").toString())
    private val params = vector.getJSONObject("params").let { json ->
        json.keys().asSequence().associateWith { json.getDouble(it) }
    }

    @Test
    fun specIsValid() {
        assertEquals(emptyList<String>(), spec.validate())
        assertEquals(spec, IndicatorSpec.parse(spec.toJson()))
    }

    @Test
    fun shapesMatch() {
        val expected = vector.getJSONArray("shapes")
        val shapes = PreparedIndicator(spec, params).shapes
        assertEquals("$file part count", expected.length(), shapes.size)
        for (p in 0 until expected.length()) {
            val want = expected.getJSONObject(p)
            val actual = shapes[p].fields()
            assertEquals("$file shapes[$p] fields", want.keys().asSequence().toSet(), actual.keys)
            for ((key, value) in actual) {
                if (value is String) {
                    assertEquals("$file shapes[$p].$key", want.getString(key), value)
                } else {
                    assertClose("$file shapes[$p].$key", want.getDouble(key), (value as Number).toDouble())
                }
            }
        }
    }

    @Test
    fun samplesMatch() {
        val samples = vector.getJSONArray("samples")
        assertTrue(samples.length() > 0)
        val prepared = PreparedIndicator(spec, params)
        val reused = MutableElementState()
        for (s in 0 until samples.length()) {
            val sample = samples.getJSONObject(s)
            val t = sample.getDouble("t")
            val expected = sample.getJSONArray("elements")
            val actual = evaluate(spec, t, params)
            assertEquals("$file t=$t element count", expected.length(), actual.size)
            for (i in 0 until expected.length()) {
                val element = expected.getJSONObject(i)
                assertEquals("$file t=$t #$i fields", FIELDS, element.keys().asSequence().toSet())
                prepared.evaluateInto(i, t, reused)
                val framePath = reused.toElementState()
                for (key in FIELDS) {
                    val want = element.getDouble(key)
                    assertClose("$file t=$t #$i $key", want, actual[i].field(key))
                    assertClose("$file t=$t #$i $key (frame path)", want, framePath.field(key))
                }
            }
        }
    }

    @Test
    fun cycleProgressMatches() {
        val items = vector.getJSONArray("cycleProgress")
        assertTrue(items.length() > 0)
        val prepared = PreparedIndicator(spec, params)
        for (i in 0 until items.length()) {
            val item = items.getJSONObject(i)
            val value = item.getDouble("cycleProgress")
            val t = item.getDouble("t")
            assertClose("$file cycleProgress=$value", t, timeForCycleProgress(spec, value, params))
            assertClose("$file cycleProgress=$value (prepared)", t, prepared.timeForCycleProgress(value))
        }
    }

    @Test
    fun indexListsEveryVector() {
        val onDisk = vectorsDir.list { _, name -> name.endsWith(".json") && name != "index.json" }.orEmpty().toSet()
        assertEquals(onDisk, files().toSet())
    }

    private fun assertClose(message: String, expected: Double, actual: Double) {
        assertTrue("$message: $actual != $expected", abs(actual - expected) <= tolerance)
    }

    companion object {
        private val vectorsDir: File = generateSequence(File("").absoluteFile) { it.parentFile }
            .map { File(it, "test-vectors") }
            .firstOrNull { File(it, "index.json").isFile }
            ?: error("test-vectors/index.json not found above ${File("").absolutePath}")

        private val index = JSONObject(File(vectorsDir, "index.json").readText())
        private val tolerance = index.getDouble("tolerance")

        @JvmStatic
        @Parameterized.Parameters(name = "{0}")
        fun files(): List<String> = index.getJSONArray("files").let { files ->
            List(files.length()) { files.getString(it) }
        }

        private val FIELDS = setOf(
            "index", "part", "cx", "cy", "width", "height", "scaleX", "scaleY", "opacity", "rotate",
            "rotateX", "rotateY", "translateX", "translateY", "strokeStart", "strokeEnd",
            "groupScaleX", "groupScaleY", "groupRotate", "groupTranslateX", "groupTranslateY",
        )

        private fun ElementState.field(key: String): Double = when (key) {
            "index" -> index.toDouble()
            "part" -> part.toDouble()
            "cx" -> cx
            "cy" -> cy
            "width" -> width
            "height" -> height
            "scaleX" -> scaleX
            "scaleY" -> scaleY
            "opacity" -> opacity
            "rotate" -> rotate
            "rotateX" -> rotateX
            "rotateY" -> rotateY
            "translateX" -> translateX
            "translateY" -> translateY
            "strokeStart" -> strokeStart
            "strokeEnd" -> strokeEnd
            "groupScaleX" -> groupScaleX
            "groupScaleY" -> groupScaleY
            "groupRotate" -> groupRotate
            "groupTranslateX" -> groupTranslateX
            "groupTranslateY" -> groupTranslateY
            else -> error("unknown element field $key")
        }

        private fun ResolvedShape.fields(): Map<String, Any> = when (this) {
            is ResolvedShape.Circle -> mapOf("type" to "circle", "startAngle" to startAngle, "sweep" to sweep)
            is ResolvedShape.Rect -> mapOf("type" to "rect", "cornerRadius" to cornerRadius)
            is ResolvedShape.Ring -> mapOf(
                "type" to "ring",
                "strokeWidth" to strokeWidth,
                "startAngle" to startAngle,
                "sweep" to sweep,
                "segments" to segments,
            )
            ResolvedShape.Triangle -> mapOf("type" to "triangle")
            ResolvedShape.Line -> mapOf("type" to "line")
        }
    }
}
