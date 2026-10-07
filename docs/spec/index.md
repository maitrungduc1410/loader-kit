---
description: "Build your first custom LoaderKit indicator step by step: a JSON spec with a layout, a shape and keyframe tracks, previewed live at every step."
---

# Custom indicators

A custom indicator is a JSON spec that you write. Every LoaderKit engine reads it and draws it natively, with no new native code. This page builds one step by step. Each step shows the full spec and a live preview. Drag the slider under a preview to scrub through one cycle.

::: warning Experimental
Writing your own spec is experimental. Until the schema is declared stable, a minor release may change schema version 1. Built-in indicators and their params are not affected.
:::

## Concepts

| Term | Meaning |
| --- | --- |
| **Box** | The square the indicator is drawn in. Its side is the smaller edge of the view. All lengths are fractions of this side, from 0 to 1. The origin is the top-left corner and y points down. |
| **Layout** | Places elements in the box: `single`, `stack`, `row`, `grid` or `ring`. See [Layouts](/spec/layouts). |
| **Shape** | What each element draws: `circle`, `rect`, `ring`, `triangle` or `line`. See [Shapes](/spec/shapes). |
| **Track** | How one property (scale, opacity, rotate, ...) changes over one cycle, with keyframes. See [Tracks](/spec/tracks). |
| **Cycle** | One loop of the animation. `duration` is its length in seconds. |
| **Stagger** | A start delay per element, so elements move one after another. See [Timing](/spec/timing). |
| **Params** | Named numbers that users can override, such as `count`. See [Params](/spec/params). |

Angles are in **radians** (a full turn is 6.283185307) and a positive angle turns clockwise. Times are in seconds.

## Step 1: one dot that pulses

The smallest useful spec has a name, a duration, a layout, a shape and one track.

<<< @/examples/first-dot.json

<SpecExample id="first-dot" />

What each field does:

- `schemaVersion` is always `1` for now.
- `duration: 1` makes one cycle last 1 second.
- `layout` is `single`: one element in the middle of the box. `size: 0.5` makes it half the box.
- `shape` is `circle`: the element draws a filled circle.
- The track animates `scale`. At the start of the cycle (`keyTimes` 0) the scale is 1, in the middle (0.5) it is 0.4, at the end (1) it is 1 again. Between keyframes, the value moves in a straight line.

The `$schema` line is optional. It lets your editor check the file and suggest fields. See [JSON Schema](/tools/json-schema).

## Step 2: three dots in a row

Change the layout to a `row` of 3 elements with a gap of 0.1 between them. The row fills the width of the box, so each dot is `(1 - 2 × 0.1) / 3` wide.

<<< @/examples/first-row.json

<SpecExample id="first-row" />

The track applies to every element, so the three dots pulse together.

## Step 3: one after another

`stagger` delays each element. With `{ "each": 0.15 }`, element 0 starts at 0 seconds, element 1 at 0.15 seconds and element 2 at 0.3 seconds.

<<< @/examples/first-stagger.json

<SpecExample id="first-stagger" />

Before an element starts, it shows its **rest values** (scale 1, opacity 1). See [Rest values](/spec/timing#rest-values).

## Step 4: smoother motion

Add `easing` to slow the motion down near each keyframe, and a second track that fades the dots as they shrink. A list of tracks can animate each property at most once.

<<< @/examples/first-easing.json

<SpecExample id="first-easing" />

<TrackTimeline example="first-easing" />

The timeline plots the value of a track over one cycle for each element. The offsets between the curves are the stagger.

## Step 5: let users change it

Declare `params` with their default values, then use `{ "$param": "name" }` in place of a number. Users can now ask for 5 dots, or a deeper pulse, without a new spec.

<<< @/examples/first-params.json

<SpecExample id="first-params" />

## Use it in an app

Load the JSON with the engine of your platform. See [Using a spec](/spec/using) for each platform.

::: code-group

```html [HTML]
<loader-kit id="dots" params='{"count": 5}'></loader-kit>
<script type="module">
  import '@loader-kit/web/element';
  document.querySelector('#dots').spec = await (await fetch('/first-params.json')).json();
</script>
```

```kotlin [Kotlin (View)]
loader.spec = IndicatorSpec.parse(json)
loader.params = mapOf("count" to 5.0)
```

```swift [Swift (UIKit)]
loader.spec = try IndicatorSpec(json: json)
loader.params = ["count": 5]
```

```csharp [C#]
indicator.Spec = json;
indicator.Params = new Dictionary<string, double> { ["count"] = 5 };
```

:::

## Write it in TypeScript

You can also write a spec in TypeScript with `@loader-kit/spec`. `defineIndicator()` checks the spec when it runs and fills in `schemaVersion`, and `param()` writes a `$param` reference. Serialize the result to get the JSON that every engine reads.

```sh
npm install @loader-kit/spec
```

```ts
import { defineIndicator, param } from '@loader-kit/spec';

export const Blink = defineIndicator({
  name: 'Blink',
  duration: 0.9,
  params: { count: 4, low: 0.15 },
  layout: { type: 'row', count: param('count'), gap: 0.08 },
  shape: { type: 'rect', cornerRadius: 0.25 },
  stagger: { each: 0.15 },
  tracks: [
    { property: 'opacity', keyTimes: [0, 0.5, 1], values: [1, param('low'), 1], easing: 'easeInOut' },
  ],
});

console.log(JSON.stringify(Blink));
```

`defineIndicator()` throws an `InvalidIndicatorError` that lists every problem. The 33 built-in indicators are written this way.

## Where to next

- [Layouts](/spec/layouts): rows, grids, rings and stacks.
- [Shapes](/spec/shapes): circles, arcs, rings, rectangles, triangles and lines.
- [Tracks](/spec/tracks): keyframes and easing in detail.
- [Timing](/spec/timing): stagger, durations, parts, group tracks and 3D.
- [Params](/spec/params): make a spec configurable.
- [Playground](/tools/playground): edit a spec with live preview and validation.
- [Specification](/spec/reference): the normative rules for every field.
