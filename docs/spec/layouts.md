---
description: "LoaderKit spec layouts: place elements in the unit box with single, stack, row, grid and ring, and see how each field changes the element boxes."
---

# Layouts

A layout places elements in the box. It gives each element a center, a width, a height and, for an oriented ring, a rotation. All lengths are fractions of the box side, and the box goes from 0 to 1 on both axes, with y pointing down.

Pick a layout kind and change its fields. The numbered boxes are the elements, in index order.

<LayoutVisualizer />

| Layout | Fields (default) | Elements |
| --- | --- | --- |
| `single` | `size` (1), `width` (`size`), `height` (`size`), `x` (0.5), `y` (0.5) | one element centered at `(x, y)` |
| `stack` | `count`, and the same fields as `single` | `count` elements at the same place |
| `row` | `count`, `gap`, `itemWidth`, `itemHeight` | a horizontal row, centered vertically |
| `grid` | `columns`, `rows`, `gap` | a grid that fills the box, row by row |
| `ring` | `count`, `itemSize`, `itemWidth`, `itemHeight`, `startAngle` (0), `orient` (false) | elements on a circle, clockwise |

Counts (`count`, `columns`, `rows`) are rounded to the nearest integer and are at least 1. Any number can be a [`$param`](/spec/params).

## single

One element. Without fields, it fills the box. Use `width` and `height` for a non-square element, and `x` and `y` to move its center.

<<< @/examples/layout-single.json

<SpecExample id="layout-single" />

## stack

`count` elements on top of each other, all at the same place. A stack is useful with stagger, so each copy is at a different point of its cycle. This ripple uses negative stagger offsets, so the three circles are already spread through the cycle on the first frame instead of starting together (see [Stagger](/spec/timing#stagger)).

<<< @/examples/layout-stack.json

<SpecExample id="layout-stack" />

## row

`count` elements side by side, with `gap` between two elements. The vertical center is always 0.5.

- Without `itemWidth`, the elements and gaps fill the width of the box: each element is `(1 - gap × (count - 1)) / count` wide.
- With `itemWidth`, the row has that element width and is centered.
- `itemHeight` defaults to the element width, so elements are square. Set it for tall bars.

<<< @/examples/layout-row.json

<SpecExample id="layout-row" />

## grid

`columns × rows` elements that fill the box, numbered row by row from the top-left. `gap` is the space between two cells, both across and down.

This example uses a stagger array (one offset per element) to start the wave from the bottom-left corner.

<<< @/examples/layout-grid.json

<SpecExample id="layout-grid" />

## ring

`count` elements on a circle, evenly spaced. Element 0 is at `startAngle` (0 is to the right of the center) and the others follow clockwise. The radius is `0.5 - itemSize / 2`, so the outer edge of the elements touches the box.

<<< @/examples/layout-ring.json

<SpecExample id="layout-ring" />

### Oriented elements

`itemWidth` and `itemHeight` change the element size but not the radius, which still comes from `itemSize`. With `orient: true`, each element is rotated so its top points away from the center. Use it with the `line` shape for a classic spinner.

<<< @/examples/layout-ring-orient.json

<SpecExample id="layout-ring-orient" />

::: tip Element order and colors
Element indices follow the layout order: left to right for a row, row by row for a grid, clockwise from `startAngle` for a ring. Stagger arrays, `durations` and the `colors` setting all use these indices.
:::

## Exact formulas

The [specification](/spec/reference#_3-parts-and-layouts) gives the exact formula for each layout.
