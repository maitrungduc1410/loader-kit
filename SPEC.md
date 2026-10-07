# LoaderKit indicator spec, schema version 1

An indicator is data: groups of elements placed in a unit box, and tracks that say how element
properties change over one cycle. Every engine (Android, Apple, Windows, and the reference
evaluator in `spec/src/evaluate.ts`) reads the same JSON and must produce the same element states.
The files in `test-vectors/` are the conformance suite: each engine runs them in its unit tests.

The TypeScript types in `spec/src/types.ts` are the schema. This document explains the meaning of
each field and the rules engines must follow.

> **Status.** The built-in indicators are stable. Writing your own spec is **experimental**: until
> the schema is declared stable, a minor release of `@loader-kit/spec` may change it. Built-in
> names and their params are not affected by such changes.

## 1. Coordinates and units

- The indicator is drawn in a square **box** whose side `S` is the smaller edge of the view, centered
  in the view. All spec lengths are fractions of `S`.
- Origin is the top-left of the box, x to the right, y **down**.
- Angles are radians. A positive angle turns clockwise on screen, and angle 0 points to the right.
- Times are seconds at speed 1.

## 2. Params

`params` holds named numbers with their defaults. Any `Num` field (layout values, shape values,
track values, rest values) can be a number or `{ "$param": "name" }`. Users override params by
name. Overrides for names the spec does not declare are ignored. A `$param` that names an
undeclared param is a validation error.

Counts (`stack.count`, `row.count`, `ring.count`, `grid.columns`, `grid.rows`, `ring` shape
`segments`) are rounded to the nearest integer (JavaScript `Math.round`, so `x.5` rounds up) and
are at least 1.

## 3. Parts and layouts

A spec is one group of elements, written inline with the fields `layout`, `shape`, `tracks`,
`stagger`, `durations`, `rest` and `groupTracks`, or a list of such groups in `parts`. A part also
accepts `duration`, the cycle length of that part (default: the spec `duration`). A spec with
`parts` must not set the group fields at the top level.

Parts are drawn in order and their elements are numbered in order across parts: the first element
of part 1 follows the last element of part 0. That global index is the one used for colors.

Each layout produces elements with a center `(cx, cy)`, a size `width × height` and a layout
rotation, indexed from 0 within the part.

| Layout | Elements |
| --- | --- |
| `single` `{size = 1, width = size, height = size, x = 0.5, y = 0.5}` | one element of `width × height` at `(x, y)` |
| `stack` `{count, size, width, height, x, y}` | `count` elements like `single`, all at the same place |
| `row` `{count, gap, itemWidth, itemHeight}` | `w = itemWidth ?? (1 - gap·(count-1)) / count`, `h = itemHeight ?? w`, `start = (1 - (count·w + (count-1)·gap)) / 2`, `cx = start + w/2 + i·(w+gap)`, `cy = 0.5` |
| `grid` `{columns, rows, gap}` | row-major, `w = (1 - gap·(columns-1)) / columns`, `h` likewise with rows, `cx = w/2 + col·(w+gap)`, `cy = h/2 + row·(h+gap)` |
| `ring` `{count, itemSize, itemWidth = itemSize, itemHeight = itemSize, startAngle = 0, orient = false}` | `r = 0.5 - itemSize/2`, `a = startAngle + i·2π/count`, `cx = 0.5 + r·cos a`, `cy = 0.5 + r·sin a`, size `itemWidth × itemHeight`; layout rotation `a + π/2` when `orient`, else 0 |

Without `itemWidth` a row fills the box and `start` is 0.

## 4. Shapes

Every element of a part draws the part's shape, centered on the element, filling its `w × h`
rectangle. Arcs go clockwise on screen from their start angle.

| Shape | Drawing |
| --- | --- |
| `circle` `{startAngle = -π/2, sweep = 2π}` | filled ellipse inscribed in the rectangle. With `sweep < 2π`, only the part between the arc from `startAngle` to `startAngle + sweep` and the chord that joins its ends |
| `rect` `{cornerRadius = 0}` | filled rectangle, corner radius `cornerRadius · min(w, h)` |
| `ring` `{strokeWidth, startAngle = -π/2, sweep = 2π, segments = 1}` | stroked circle of diameter `min(w, h) - stroke`, stroke `strokeWidth · min(w, h)`, so the outer edge touches the rectangle; see below |
| `triangle` | filled triangle: top-center, bottom-right, bottom-left |
| `line` | filled rectangle with corner radius `min(w, h) / 2` |

A `ring` is made of `segments` arcs. Arc `k` starts at `a_k = startAngle + k·2π/segments` and
covers `sweep`. The element properties `strokeStart` and `strokeEnd` (rest values 0 and 1) trim
every arc like Core Animation's `strokeStart` and `strokeEnd`: arc `k` is drawn from
`a_k + s·sweep` to `a_k + e·sweep`, with `s` and `e` the two values clamped to `[0, 1]`. Nothing is
drawn when `e ≤ s`. Stroke ends are flat (butt caps). Elliptical arcs of a `circle` use the
parametric angle: the point at angle `a` is `(w/2·cos a, h/2·sin a)`.

## 5. Tracks and time

### 5.1 Element time

Every element has a start offset `o_i` (see stagger) and a cycle length `D_i`: `durations[i]` if the
group has `durations`, else the part `duration`, else the spec `duration`. At spec time `t`:

- `local = t - o_i`
- if `local < 0` the element shows its **rest values** (like a Core Animation layer before its
  `beginTime`, no fill mode);
- otherwise the cycle progress is `p = (local mod D_i) / D_i`, in `[0, 1)`, and every track is
  sampled at `p`. A property without a track keeps its rest value.

Rest values are `scale`, `scaleX`, `scaleY`, `opacity` and `strokeEnd` = 1, every other property
= 0, unless the group's `rest` sets them.

Stagger: an array gives `o_i` directly and must have at least as many entries as elements;
`{each, start = 0}` gives `o_i = start + each·i`; no stagger means `o_i = 0`. Offsets may be
negative: such an element is already part way through its cycle at `t = 0`. `durations` must also
have at least as many entries as elements.

### 5.2 Sampling a track

`keyTimes` and `values` have the same length `n ≥ 2`, keyTimes are non-decreasing within `[0, 1]`.

1. If `p ≤ keyTimes[0]`, the value is `values[0]`. If `p ≥ keyTimes[n-1]`, it is `values[n-1]`.
2. Otherwise find the segment `k`: start at `k = 0` and increase it while `k < n-2` and
   `p ≥ keyTimes[k+1]`.
3. `u = (p - keyTimes[k]) / (keyTimes[k+1] - keyTimes[k])`, or `u = 1` if the segment has zero
   length (a zero-length segment is an instant jump).
4. The value is `values[k] + (values[k+1] - values[k]) · ease_k(u)`.

### 5.3 Easing

`easing` is either one easing used by every segment, or a list with exactly one easing per
segment (`n - 1` entries). An easing is a name or a cubic bezier `[x1, y1, x2, y2]` with
`x1, x2 ∈ [0, 1]` (y can overshoot). A list is per-segment when its first item is not a number.
Default: `linear`.

| Name | Control points |
| --- | --- |
| `linear` | `[0, 0, 1, 1]` |
| `ease` | `[0.25, 0.1, 0.25, 1]` (the CSS and Core Animation default) |
| `easeIn` | `[0.42, 0, 1, 1]` |
| `easeOut` | `[0, 0, 0.58, 1]` |
| `easeInOut` | `[0.42, 0, 0.58, 1]` |

`ease(x)` solves `bx(t) = x` for the bezier through `(0,0) (x1,y1) (x2,y2) (1,1)` and returns
`by(t)`. Engines that evaluate easing themselves must use the algorithm of `cubicBezier()` in
`spec/src/easing.ts` with the same constants:

- `x ≤ 0` → 0, `x ≥ 1` → 1, and `x1 == y1 && x2 == y2` → `x`;
- Newton-Raphson from `t = x`, at most 8 steps, return when `|bx(t) - x| < 1e-7`, stop when
  `|bx'(t)| < 1e-7`;
- then bisection on `[0, 1]` from `t = x`, at most 50 steps, stop when `|bx(t) - x| < 1e-7`;
- return `by(t)`.

Engines that hand curves to the platform animator (`CAMediaTimingFunction`,
`CubicBezierEasingFunction`) pass the control points through. Those solvers differ from the
reference by far less than a pixel.

### 5.4 Element state

The evaluator output for one element (`ElementState`):

- `index`, the global element index, and `part`, the index of its part (0 without `parts`);
- `cx, cy, width, height` from the layout;
- `scaleX = scale · scaleX`, `scaleY = scale · scaleY`;
- `rotate` = layout rotation + `rotate`;
- `opacity` = element `opacity` · group `opacity`;
- `rotateX`, `rotateY`, `translateX`, `translateY`, `strokeStart`, `strokeEnd`;
- the group transform: `groupScaleX = scale · scaleX` and `groupScaleY = scale · scaleY` of the
  group tracks, `groupRotate`, `groupTranslateX`, `groupTranslateY`.

### 5.5 Group tracks

`groupTracks` animate the whole group, around the center of the box: `scale`, `scaleX`,
`scaleY`, `opacity`, `rotate`, `translateX` and `translateY`. They run on the group's cycle (the
part `duration`, else the spec `duration`), start at `t = 0` and have no stagger:
`p = (t mod duration) / duration`. Without a group track a property keeps its rest value
(scales and opacity 1, the others 0); the group's `rest` does not apply to group tracks.

## 6. Rendering an element

Let `(x, y)` be a point of the shape relative to the element center, in box units. The rendered
point is obtained in this order:

1. scale: `x·scaleX`, `y·scaleY`, `z = 0`;
2. `rotateX` (θ): `y' = y·cos θ - z·sin θ`, `z' = y·sin θ + z·cos θ`;
3. `rotateY` (θ): `x' = x·cos θ + z·sin θ`, `z' = -x·sin θ + z·cos θ`;
4. `rotate` (θ, clockwise on screen): `x' = x·cos θ - y·sin θ`, `y' = x·sin θ + y·cos θ`;
5. perspective, only when `rotateX` or `rotateY` is non-zero: with `d = perspective` (default 2.5),
   `x' = x · d / (d - z)`, `y' = y · d / (d - z)` (z points toward the viewer). This matches a
   Core Animation layer transform with `m34 = -1 / (d · S)`;
6. translate and place: `(cx + translateX + x, cy + translateY + y)`;
7. group transform around the box center: with `(gx, gy) = (x - 0.5, y - 0.5)`, scale by
   `groupScaleX, groupScaleY`, rotate by `groupRotate`, then add `(0.5 + groupTranslateX,
   0.5 + groupTranslateY)`; then multiply by `S` and add the box origin.

In matrix form, applied to column vectors:
`G · T(cx + tx, cy + ty) · P(d) · Rz · Ry · Rx · S(sx, sy)` with
`G = T(0.5 + gtx, 0.5 + gty) · Rz(groupRotate) · S(gsx, gsy) · T(-0.5, -0.5)`.

Opacity multiplies the alpha of the element color. Elements are drawn in index order.

## 7. Colors

An engine has one `color` for every element, or a `colors` list where element `i` (the global
index) uses `colors[i mod colors.length]`. Colors are not part of the spec.

## 8. Playback

These rules are the same on every platform. They are engine state, not part of the spec.

- **Clock.** The engine keeps a spec time `t`. While animating, `t` advances by
  `frameDelta · speed`. Changing `speed` never makes `t` jump. Default `speed` is 1; `speed ≤ 0` is
  treated as paused.
- **Changing the spec or params** restarts `t` at 0. Changing colors, speed or size does not.
- **Stopping** freezes `t`. With `hidesWhenStopped` (default true in the native views, like
  `UIActivityIndicatorView`) the view draws nothing while stopped. Starting again continues from
  the frozen `t`.
- **Cycle progress.** When a `cycleProgress` value in `[0, 1]` is set, the clock is ignored and the
  engine draws `t = timeForCycleProgress(cycleProgress)`:
  `ceil(maxOffset / duration) · duration + cycleProgress · duration`, where `duration` is the spec
  `duration` and `maxOffset` is the largest element start offset across all parts (0 if every
  offset is negative). Skipping whole cycles makes every element visible in a frozen frame.
  Clearing `cycleProgress` resumes the clock from where it was. It is a point of the animation
  cycle, not a progress value of a task.
- **Reduce motion.** When the system asks for reduced motion and the engine respects it (on by
  default), the engine draws a still frame at `timeForCycleProgress(0)` instead of animating.

## 9. Validation

`validate()` in `spec/src/validate.ts` is the reference list of rules. Engines must reject specs
that break them, with an error that names the problem, and must never crash on bad input. Among
them: `schemaVersion` must be 1; durations are positive; a spec has at least one track or group
track; a property is animated by one track at most per list; `strokeStart` and `strokeEnd`
(tracks or rest values) need a `ring` shape; `sweep` is within `(0, 2π]`; stagger offsets are
finite numbers. A `stagger` array or `durations` shorter than the element count, which depends on
params, is reported when the spec is prepared. Fields an engine does not know are ignored, so a
later revision can add optional fields. A spec file may name its JSON Schema with a `$schema`
field, which engines ignore as well.

`spec/schema.json` (published at `https://maitrungduc1410.github.io/loader-kit/schema/v1.json`
and as `@loader-kit/spec/schema.json`) is a JSON Schema of this format for editors and tools. It
checks field names, types and ranges, and it is stricter than engines in one way: an unknown field
is an error, since in a hand-written spec it is almost always a typo. Rules that relate several
fields (`keyTimes` order and length, `$param` names, stroke properties on a non-ring shape, one
track per property) are checked by `validate()` only.

Values that come from params are not range-checked by `validate()`. Renderers clamp a `sweep`
to `[0, 2π]` and draw nothing for a ring whose stroke is not positive or leaves no room for the
circle (a stroke of at least `min(w, h)`). To keep the
number of drawn shapes bounded, engines reject a spec with more than 10,000 elements in total
or more than 10,000 ring arcs (element count × `segments`, summed over the parts with a `ring`
shape) when it is prepared. The reference evaluator, which draws nothing, has no such limit.

## 10. Test vectors

`npm run generate` writes `test-vectors/*.json`, and `npm run check:generated` fails when they are out
of date. Each file contains:

- `spec`, `params`: the inputs;
- `shapes`: the shape of each part with params resolved and defaults filled in (`resolveShape()`);
- `samples`: a list of `{t, elements}` where `elements` are the `ElementState`s at time `t`;
- `cycleProgress`: a list of `{cycleProgress, t}` for `timeForCycleProgress`.

`test-vectors/index.json` lists the files and the tolerance (absolute, for every number). Engines
load the files from the repository at test time and compare every field of every element.
