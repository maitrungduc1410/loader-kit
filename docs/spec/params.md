---
description: "Make a LoaderKit spec configurable: declare params with defaults, reference them with $param anywhere a number is allowed, and override them per view."
---

# Params

Params make one spec cover several variants. A param is a named number with a default value. Users override it by name, for example to show 5 dots instead of 3.

## Declare and use a param

1. Declare the param and its default in `params`.
2. Write `{ "$param": "name" }` where a number is allowed.

<<< @/examples/params-typing.json

<SpecExample id="params-typing" />

This typing indicator has three params:

| Param | Default | Used in |
| --- | --- | --- |
| `count` | 3 | `layout.count` |
| `rise` | -0.15 | the highest point of `translateY` (negative is up) |
| `dim` | 0.4 | the opacity between bounces |

## Where `$param` is allowed

Any number in a layout, a shape, track `values` or `rest` can be a `$param`. That includes counts, sizes, gaps, angles, stroke widths and corner radii.

These fields must be plain numbers: `duration`, part `duration`, `durations`, `stagger`, `keyTimes`, easing control points and `perspective`.

## Overriding params

Users pass overrides by name on every platform:

::: code-group

```html [HTML]
<loader-kit params='{"count": 4, "rise": -0.25}'></loader-kit>
```

```ts [TypeScript]
view.params = { count: 4, rise: -0.25 };
```

```kotlin [Kotlin]
loader.params = mapOf("count" to 4.0, "rise" to -0.25)
```

```swift [Swift]
loader.params = ["count": 4, "rise": -0.25]
```

```csharp [C#]
indicator.Params = new Dictionary<string, double> { ["count"] = 4, ["rise"] = -0.25 };
```

:::

## Rules

- Overrides for names the spec does not declare are ignored.
- A `$param` that names an undeclared param is a validation error: `layout.count uses unknown param "cout"`.
- Param defaults must be finite numbers.
- Counts are rounded to the nearest integer (0.5 rounds up) and are at least 1.
- Values that come from params are not range-checked by `validate()`. A `sweep` is clamped to [0, 2π], and a ring with no room for its stroke draws nothing.
- Changing params restarts the animation.

::: warning Params and element counts
A `stagger` array or `durations` must have one entry per element. `validate()` never compares list lengths with the element count, and when `count` comes from a param the count is only known once the user's params are applied. So a list that is too short is reported when the spec is prepared, not by `validate()`. Prefer `stagger: { "each": ... }` with a param count.
:::

## Naming tips

- Use names that describe the effect, not the field: `minScale` and `minOpacity` rather than `value1`.
- Pick defaults that look good on their own. Most users never override params.
- Keep the count of params small. A param that nobody changes is noise.
