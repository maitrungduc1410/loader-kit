package io.github.maitrungduc1410.loaderkit

import java.util.concurrent.ConcurrentHashMap

/** The indicators that ship with LoaderKit, by name. */
public object BuiltinIndicators {
    /** Every built-in name, e.g. `"BallPulse"`. */
    public val names: List<String> get() = BuiltinIndicatorSpecs.names

    private val cache = ConcurrentHashMap<String, IndicatorSpec>()

    public operator fun contains(name: String): Boolean = name in BuiltinIndicatorSpecs.json

    /** The built-in spec called [name], or null when there is none. */
    public operator fun get(name: String): IndicatorSpec? {
        cache[name]?.let { return it }
        val json = BuiltinIndicatorSpecs.json[name] ?: return null
        return cache.getOrPut(name) { IndicatorSpec.parse(json) }
    }

    /** @throws InvalidIndicatorSpecException when there is no built-in called [name]. */
    public fun require(name: String): IndicatorSpec =
        get(name) ?: throw InvalidIndicatorSpecException(
            listOf("unknown indicator \"$name\", expected one of ${names.joinToString()}"),
        )
}
