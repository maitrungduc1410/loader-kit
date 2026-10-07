---
description: "LoaderKit spec timing: stagger elements, give each its own duration, set rest values, combine parts, move whole groups and add 3D perspective."
---

# Timing and composition

This page covers how elements are timed against each other, and how to build an indicator from several groups.

## Element time

Every element has a start offset (from `stagger`) and a cycle length (from `durations`, the part `duration` or the spec `duration`). At time `t`:

1. `local = t - offset`.
2. If `local` is negative, the element has not started and shows its [rest values](#rest-values).
3. Otherwise the cycle progress is `(local mod cycle) / cycle`, from 0 to 1, and every track is sampled at that point.

## Stagger {#stagger}

`stagger` delays elements so they move one after another. It has two forms.

`{ "each": 0.1, "start": 0 }` gives element `i` the offset `start + each × i` seconds. `start` is optional.

<<< @/examples/timing-wave.json

<SpecExample id="timing-wave" />

<TrackTimeline example="timing-wave" />

An array gives each element its own offset, by index. It must have at least one entry per element. The [grid example](/spec/layouts#grid) uses an array to start a wave from a corner.

### Negative offsets

Offsets can be negative. An element with a negative offset is already part way through its cycle at `t = 0`. Use this when every element should be visible from the first frame, as in the [stack ripple](/spec/layouts#stack): `[0, -0.5, -1]` with a 1.5 second cycle spreads three circles evenly.

::: tip Choosing offsets
For an even spread, use offsets of `cycle / count`. For a ring of 8 elements and a 1 second cycle, `each: 0.125` makes one full wave per cycle.
:::

## Rest values {#rest-values}

Before an element starts, and for every property without a track, the element shows its rest values: `scale`, `scaleX`, `scaleY`, `opacity` and `strokeEnd` are 1, every other property is 0.

`rest` changes them for a group. Here `rest: { "scale": 0 }` hides each dot until its stagger delay has passed, so the dots appear one by one at the start:

<<< @/examples/timing-rest.json

<SpecExample id="timing-rest" />

`rest` also places elements: a property without a track keeps its rest value forever. The [parts example](#parts) uses `rest.translateY` to put a dot above the center.

::: info Frozen frames skip the wait
When a view freezes a frame with [`cycleProgress`](/guide/playback#cycle-progress), the engine skips whole cycles until every element has started. So a frozen frame never shows elements at their start-up rest values.
:::

## Durations

`durations` gives each element its own cycle length, by index. It overrides the part and spec `duration`, and must have at least one entry per element. Elements with different cycles drift in and out of phase:

<<< @/examples/timing-durations.json

<SpecExample id="timing-durations" />

## Parts {#parts}

A spec is one group of elements, written inline. To combine groups with different layouts, shapes or tracks, list them in `parts`. Each part accepts `layout`, `shape`, `tracks`, `stagger`, `duration`, `durations`, `rest` and `groupTracks`.

- Parts are drawn in order, so later parts are on top.
- Element indices continue across parts: the first element of part 1 follows the last element of part 0. The `colors` setting uses these indices.
- A part's `duration` sets its own cycle length. The default is the spec `duration`.
- A spec with `parts` must not set the group fields at the top level.

Here part 0 is a large pulsing circle. Part 1 is a small dot placed above it with `rest`, blinking on a cycle twice as fast:

<<< @/examples/timing-parts.json

<SpecExample id="timing-parts" />

## Group tracks

`groupTracks` animate a whole group around the center of the box. They support `scale`, `scaleX`, `scaleY`, `opacity`, `rotate`, `translateX` and `translateY`. They run on the group's cycle, start at `t = 0` and ignore stagger. The group's `rest` does not apply to them.

Replace the blink of the small dot with a group rotation, and it orbits the center:

<<< @/examples/timing-group-tracks.json

<SpecExample id="timing-group-tracks" />

A group track is applied after the element transform. So element tracks move elements inside the group, and group tracks move the whole group.

## Perspective {#perspective}

`rotateX` and `rotateY` flip elements in 3D. `perspective` is the distance from the viewer to the box, in box units (default 2.5). A smaller value makes the 3D effect stronger. It is set once for the whole spec.

<<< @/examples/timing-perspective.json

<SpecExample id="timing-perspective" />

The built-in `SquareSpin` uses the same idea with a perspective of 2.5.

## Transform order

For each point of a shape, engines apply, in order: scale, `rotateX`, `rotateY`, `rotate`, perspective, translation to the element position, then the group transform. The [specification](/spec/reference#_6-rendering-an-element) gives the matrices.
