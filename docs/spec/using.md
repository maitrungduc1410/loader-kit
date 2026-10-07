---
description: "Load a custom LoaderKit spec at runtime on the web, Android, iOS, macOS and Windows, validate it, read its errors, and stay within the engine limits."
---

# Using a spec

A spec is plain JSON. Ship it with your app, download it, or build it in code, then hand it to the engine of your platform.

::: warning Experimental
Custom specs are experimental. Until the schema is declared stable, a minor release may change it. Built-in indicators are not affected.
:::

## Load a spec

::: code-group

```ts [TypeScript]
import { LoaderKitView } from '@loader-kit/web';

const json = await (await fetch('/specs/typing-dots.json')).text();
const view = new LoaderKitView(host, {
  spec: json,                 // a JSON string or an object
  params: { count: 4 },
  onError: (message) => message && console.warn(message),
});
```

```html [HTML]
<loader-kit id="dots"></loader-kit>
<script type="module">
  import '@loader-kit/web/element';
  const el = document.querySelector('#dots');
  el.addEventListener('loaderkit-error', (e) => e.detail.message && console.warn(e.detail.message));
  el.spec = await (await fetch('/specs/typing-dots.json')).json();
</script>
```

```kotlin [Kotlin (View)]
val json = context.assets.open("typing-dots.json").bufferedReader().use { it.readText() }

loader.onError = { error -> error.errors.forEach { Log.w("Loader", it) } }
loader.setSpecJson(json)
```

```kotlin [Compose]
val spec = remember(json) { IndicatorSpec.parse(json) }   // throws InvalidIndicatorSpecException
LoaderKitIndicator(spec = spec, modifier = Modifier.size(48.dp))
```

```swift [Swift (UIKit)]
let url = Bundle.main.url(forResource: "typing-dots", withExtension: "json")!
let json = try String(contentsOf: url, encoding: .utf8)

loader.specJSON = json
if let error = loader.specError { print(error.problems) }
```

```swift [SwiftUI]
let spec = try IndicatorSpec(json: json)   // throws IndicatorSpecError
LoaderKitIndicator(spec: spec).frame(width: 48, height: 48)
```

```csharp [C#]
indicator.SpecFailed += (_, error) =>
{
    foreach (var problem in error.Errors) Debug.WriteLine(problem);
};
indicator.Spec = File.ReadAllText("typing-dots.json");
```

:::

A custom spec wins over the built-in `indicator` name on every platform. On Android, Windows and the web, clear the spec to go back to the indicator. On Apple platforms, `indicator`, `spec` and `specJSON` are one setting: setting `spec` replaces `indicator`, and clearing it draws nothing, so set `indicator` again to go back.

## Validate before you ship

Every engine validates a spec before drawing it, with the same rules. Check your specs early, so errors do not reach users:

| Where | API | Result |
| --- | --- | --- |
| JavaScript, Node, CI | `validate(spec)` from `@loader-kit/spec` or `@loader-kit/web` | `string[]`, empty when valid |
| JavaScript | `prepare({ spec }, params)` from `@loader-kit/web` | throws `InvalidIndicatorError` (also checks params and limits) |
| Android | `IndicatorSpec.validate(json)` / `IndicatorSpec.parse(json)` | `List<String>` / throws `InvalidIndicatorSpecException` |
| Apple | `IndicatorSpec.validate(json:)` / `IndicatorSpec(json:)` | `[String]` / throws `IndicatorSpecError` |
| Windows | `IndicatorSpec.TryParse(json, out spec, out errors)` / `IndicatorSpec.Parse(json)` | `bool` with errors / throws `InvalidIndicatorSpecException` |
| Editor | the [JSON Schema](/tools/json-schema) | hints and squiggles while you type |
| Browser | the [playground](/tools/playground) | live preview and every problem |

```ts
import { validate } from '@loader-kit/spec';
import spec from './typing-dots.json' with { type: 'json' };

const problems = validate(spec);
if (problems.length > 0) throw new Error(problems.join('\n'));
```

## Errors {#errors}

An error message names the field with its path, so you can find it fast:

```text
schemaVersion must be 1
duration must be a positive number
layout.count uses unknown param "cout"
tracks[0].values must have the same length as keyTimes
tracks[1].keyTimes must be non-decreasing
tracks[0].property "strokeEnd" needs a ring shape
parts[1].shape.sweep must be within (0, 2π]
tracks[0].easing needs one entry per segment (2)
the spec needs at least one track or group track
```

Views never crash on a bad spec. They draw nothing and report the error:

| Platform | Error report |
| --- | --- |
| Web | `specError`, the `onError` option, the `loaderkit-error` event |
| Android View | `onError` (logged when not set) |
| Compose | `IndicatorSpec.parse` throws before you call the composable. A spec made invalid by params logs a warning |
| Apple | `specError` (`IndicatorSpecError.problems`) |
| Windows | `SpecError` and the `SpecFailed` event |

Some problems are found only when the spec is prepared with the user's params, not by `validate()`:

- a `stagger` array or `durations` shorter than the number of elements;
- the [limits](#limits) below.

## Limits {#limits}

To keep drawing bounded, engines reject a spec, when it is prepared, that has:

- more than 10,000 elements in total, or
- more than 10,000 ring arcs (element count × `segments`, summed over the parts with a `ring` shape).

## Forward compatibility

Fields an engine does not know are ignored, so a later revision of schema version 1 can add optional fields. The [JSON Schema](/tools/json-schema) is stricter: it flags unknown fields, because in a hand-written spec they are usually typos.

## Playback still applies

A custom spec uses the same [playback](/guide/playback) settings as a built-in: speed, start and stop, `cycleProgress` and reduced motion. Changing the spec or its params restarts the animation.
