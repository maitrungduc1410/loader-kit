---
description: "LoaderKit spec tracks: animate scale, opacity, rotation, translation and stroke trim with keyTimes, values and easing, with live curves and timelines."
---

# Tracks

A track says how one property of every element in a group changes over one cycle. It is a list of keyframes: `keyTimes` says when, `values` says what, and `easing` says how the value moves between two keyframes.

```json
{ "property": "scale", "keyTimes": [0, 0.5, 1], "values": [1, 0.4, 1], "easing": "easeInOut" }
```

## Properties

| Property | Rest value | Unit | Meaning |
| --- | --- | --- | --- |
| `scale` | 1 | factor | scales width and height |
| `scaleX`, `scaleY` | 1 | factor | scales one axis. Multiplied with `scale` |
| `opacity` | 1 | 0 to 1 | multiplies the alpha of the element color |
| `rotate` | 0 | radians | turns the element clockwise around its center |
| `rotateX`, `rotateY` | 0 | radians | 3D flips around the horizontal or vertical axis (see [Perspective](/spec/timing#perspective)) |
| `translateX`, `translateY` | 0 | box units | moves the element. 1 is the full box side. Negative y is up |
| `strokeStart`, `strokeEnd` | 0, 1 | 0 to 1 | trims the arcs of a [`ring`](/spec/shapes#trimming-with-strokestart-and-strokeend) shape |

A property without a track keeps its rest value. A property can appear at most once in `tracks` and at most once in `groupTracks`.

## keyTimes and values

`keyTimes` are points of the cycle, from 0 (the start) to 1 (the end). `values` has one value per key time. Rules:

- `keyTimes` and `values` have the same length, at least 2.
- `keyTimes` are within [0, 1] and never decrease.
- Before the first key time, the value is the first value. After the last key time, it is the last value.

To loop smoothly, start at 0, end at 1, and make the last value equal to the first.

### Holding and jumping

Two equal values in a row hold the value. Two equal key times in a row make an instant jump. Here the square shrinks, holds, grows, holds, and its opacity jumps from 1 to 0.4 in the middle of the cycle:

<<< @/examples/track-steps.json

<SpecExample id="track-steps" />

## Easing

Easing shapes the motion between two keyframes. The default is `linear`.

| Name | Cubic bezier | Feel |
| --- | --- | --- |
| `linear` | `[0, 0, 1, 1]` | constant speed |
| `ease` | `[0.25, 0.1, 0.25, 1]` | the CSS and Core Animation default |
| `easeIn` | `[0.42, 0, 1, 1]` | starts slow |
| `easeOut` | `[0, 0, 0.58, 1]` | ends slow |
| `easeInOut` | `[0.42, 0, 0.58, 1]` | starts and ends slow |

You can also give a cubic bezier `[x1, y1, x2, y2]`, like CSS `cubic-bezier()`. `x1` and `x2` must be within [0, 1]. `y1` and `y2` can go outside, which makes the value overshoot.

<EasingCurve />

The three dots below move with `linear`, `easeInOut` and the overshooting bezier `[0.34, 1.56, 0.64, 1]`:

<<< @/examples/track-easing.json

<SpecExample id="track-easing" />

### One easing per segment

A track with `n` key times has `n - 1` segments. `easing` can be one value for every segment, or a list with exactly one easing per segment. Here each dot rises with `easeOut`, falls with `easeIn`, then rests:

<<< @/examples/track-per-segment.json

<SpecExample id="track-per-segment" />

::: tip How a list is read
If the first item of `easing` is a number, the whole list is one bezier. Otherwise it is one easing per segment. So `[0.42, 0, 0.58, 1]` is one bezier, and `[[0.42, 0, 0.58, 1], "linear"]` is two segments.
:::

## Translation

`translateX` and `translateY` move an element from its layout position, in box units. Two tracks with the same key times can draw a path. This dot travels around a diamond:

<<< @/examples/track-translate.json

<SpecExample id="track-translate" />

## Reading a timeline

`<TrackTimeline>` plots each element's value over one cycle. This is the built-in `BallPulse`: a scale track from 1 to `minScale` and back, with a stagger of 0.12 seconds.

<TrackTimeline indicator="BallPulse" />

## Exact rules

The [specification](/spec/reference#_5-tracks-and-time) defines how a track is sampled and the exact easing algorithm that every engine uses.
