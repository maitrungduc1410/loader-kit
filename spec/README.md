# @loader-kit/spec

The indicator spec of [LoaderKit](https://maitrungduc1410.github.io/loader-kit/): loading
indicators described as data and rendered natively on Android, iOS, macOS, Windows and the web.

This package holds what every engine shares:

- the TypeScript types of a spec (schema version 1) and `defineIndicator()` to write one,
- `validate()`, which lists every problem of a spec,
- the 50 built-in indicators (`BUILTIN_INDICATORS`, `BUILTIN_INDICATOR_NAMES`),
- the reference evaluator (`evaluate()`, `prepareIndicator()`, `timeForCycleProgress()`), whose
  output every engine must reproduce,
- the JSON Schema of a spec, for editors and tools (`@loader-kit/spec/schema.json`),
- the reference geometry of the progress indicators (`resolveProgress()`, `progressCommands()`,
  `ProgressAnimator`), which turns options and time into draw commands that every platform
  reproduces.

To draw indicators in a browser, use [`@loader-kit/web`](https://www.npmjs.com/package/@loader-kit/web).

## Install

```sh
npm install @loader-kit/spec
```

## Write and check a spec

```ts
import { defineIndicator, validate } from '@loader-kit/spec';

export const Pulse = defineIndicator({
  name: 'Pulse',
  duration: 1,
  params: { count: 3 },
  layout: { type: 'row', count: { $param: 'count' }, gap: 0.1 },
  shape: { type: 'circle' },
  stagger: { each: 0.12 },
  tracks: [{ property: 'scale', keyTimes: [0, 0.5, 1], values: [1, 0.3, 1], easing: 'easeInOut' }],
});

validate(JSON.parse(userJson)); // [] when the spec is valid, else one message per problem
```

`defineIndicator()` throws an `InvalidIndicatorError` with the same messages.

## Evaluate

```ts
import { BUILTIN_INDICATORS, prepareIndicator } from '@loader-kit/spec';

const indicator = prepareIndicator(BUILTIN_INDICATORS.BallPulse, { count: 5 });
indicator.evaluate(0.4); // the state of every element 0.4 s into the animation
indicator.evaluate(indicator.timeForCycleProgress(0.25)); // a frozen frame
```

## Progress geometry

```ts
import { ProgressAnimator, progressCommands, resolveProgress } from '@loader-kit/spec';

const options = resolveProgress({ type: 'circular', variant: 'segmented' });
const animator = new ProgressAnimator(0);
animator.setValue(0.6, performance.now() / 1000, true); // glide to 0.6
animator.step(1 / 60, options.speed, false);            // once per frame
const { x, y, commands } = progressCommands(options, animator.state, 48, 48);
```

The commands (`line`, `arc`, `polyline`, `circle`, `rect`, `strokeRect`, `polygon`, `sector`,
`text`, `clip`) use solid, linear, radial or conic paints. `drawProgress()` in `@loader-kit/web`
draws them on a canvas.

## JSON Schema

Spec files can name the schema so editors offer completion and checks:

```json
{
  "$schema": "https://maitrungduc1410.github.io/loader-kit/schema/v1.json",
  "schemaVersion": 1,
  "name": "Pulse"
}
```

The same file ships in this package as `@loader-kit/spec/schema.json`. The schema catches typos
and wrong types; rules that span several fields (such as `keyTimes` and `values` lengths) are
checked by `validate()` only.

Built-in indicators are stable. Writing your own spec is experimental: the schema may change in a
minor release until it is declared stable.

See the [spec guide](https://maitrungduc1410.github.io/loader-kit/spec/) and the
[playground](https://maitrungduc1410.github.io/loader-kit/tools/playground).

## License

MIT
