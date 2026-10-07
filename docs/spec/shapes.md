---
description: "LoaderKit spec shapes: circle, arc, rect, ring with segments and stroke trimming, triangle and line, each with a live example you can scrub."
---

# Shapes

Every element of a group draws the same shape, centered on the element and filling its width and height. A part has exactly one shape. To mix shapes, use [parts](/spec/timing#parts).

| Shape | Fields (default) | Draws |
| --- | --- | --- |
| `circle` | `startAngle` (-π/2), `sweep` (2π) | a filled ellipse, or a slice of it |
| `rect` | `cornerRadius` (0) | a filled rectangle |
| `ring` | `strokeWidth`, `startAngle` (-π/2), `sweep` (2π), `segments` (1) | a stroked circle, or arcs of it |
| `triangle` | none | a filled triangle pointing up |
| `line` | none | a bar with fully rounded ends |

Angles are in radians. -π/2 (about -1.5708) is the top, 0 is the right, and arcs go clockwise.

## circle

A filled ellipse inscribed in the element. In a square element it is a circle.

With `sweep` below 2π, only part of the disc is drawn: the area between the arc (from `startAngle` to `startAngle + sweep`) and the straight line that joins its ends. With `sweep` = π it is a half disc. With 3π/2 it is a disc with one side cut off by the chord.

<<< @/examples/shape-circle-arc.json

<SpecExample id="shape-circle-arc" />

## rect

A filled rectangle. `cornerRadius` is a fraction of the shorter side of the element, from 0 (square corners) to 0.5 (fully round ends).

<<< @/examples/shape-rect.json

<SpecExample id="shape-rect" />

## ring

A stroked circle. `strokeWidth` is a fraction of the shorter side of the element. The outer edge of the stroke touches the element, so the ring never grows outside it. Stroke ends are flat.

`sweep` draws only an arc of the circle:

<<< @/examples/shape-ring.json

<SpecExample id="shape-ring" />

### Segments

`segments` splits the ring into that many arcs, evenly spaced. Each arc starts at `startAngle + k × 2π / segments` and covers `sweep`.

<<< @/examples/shape-ring-segments.json

<SpecExample id="shape-ring-segments" />

### Trimming with strokeStart and strokeEnd

A ring has two extra properties that tracks can animate: `strokeStart` (rest value 0) and `strokeEnd` (rest value 1). They trim every arc, as fractions of the arc, like `strokeStart` and `strokeEnd` in Core Animation. Nothing is drawn when `strokeEnd` is at or below `strokeStart`.

Here the end grows from 0 to 1 in the first half of the cycle, then the start catches up in the second half:

<<< @/examples/shape-ring-trim.json

<SpecExample id="shape-ring-trim" />

::: warning Ring only
`strokeStart` and `strokeEnd` tracks and rest values need a `ring` shape. `validate()` reports them on any other shape.
:::

::: tip A disc that opens like a mouth
A ring whose `strokeWidth` is 0.5 is a full disc. Trimming it opens a slice. The built-in `Pacman` indicator works this way.
:::

## triangle

A filled isosceles triangle: top center, bottom right, bottom left.

<<< @/examples/shape-triangle.json

<SpecExample id="shape-triangle" />

## line

A filled rectangle with a corner radius of half its shorter side: a bar with round ends. Use it in a row for equalizer bars, or in an oriented ring for a spinner.

<<< @/examples/shape-line.json

<SpecExample id="shape-line" />

## Exact rules

The [specification](/spec/reference#_4-shapes) defines each shape precisely, including how arcs of an ellipse are measured.
