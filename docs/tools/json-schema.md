---
description: "Use the LoaderKit JSON Schema for editor hints in VS Code and JetBrains IDEs, validate specs in CI with ajv, and learn what only validate() can check."
---

# JSON Schema

LoaderKit publishes a JSON Schema (draft-07) for indicator specs. Editors use it to complete field names, show documentation on hover and flag mistakes while you type.

| | |
| --- | --- |
| Public URL | `https://maitrungduc1410.github.io/loader-kit/schema/v1.json` |
| npm | `@loader-kit/spec/schema.json` |

## Add `$schema` to a spec

The simplest setup works in most editors without configuration. Add a `$schema` field at the top of the file:

```json
{
  "$schema": "https://maitrungduc1410.github.io/loader-kit/schema/v1.json",
  "schemaVersion": 1,
  "name": "Blink",
  "duration": 1,
  "layout": { "type": "row", "count": 3, "gap": 0.1 },
  "shape": { "type": "circle" },
  "tracks": [{ "property": "opacity", "keyTimes": [0, 0.5, 1], "values": [1, 0.2, 1] }]
}
```

Engines ignore `$schema`, so you can ship the file as it is.

## VS Code

`$schema` is enough. To apply the schema to files without it, map file patterns in your settings (`.vscode/settings.json` for a project):

```json
{
  "json.schemas": [
    {
      "fileMatch": ["**/loaders/*.json", "*.loaderkit.json"],
      "url": "https://maitrungduc1410.github.io/loader-kit/schema/v1.json"
    }
  ]
}
```

To work offline, point `url` at the copy in `node_modules`:

```json
{
  "json.schemas": [
    {
      "fileMatch": ["**/loaders/*.json"],
      "url": "./node_modules/@loader-kit/spec/schema.json"
    }
  ]
}
```

## JetBrains IDEs

IntelliJ IDEA, WebStorm, Android Studio and Rider also read `$schema`. To map files without it:

1. Open **Settings** > **Languages & Frameworks** > **Schemas and DTDs** > **JSON Schema Mappings**.
2. Click **+** and name the mapping "LoaderKit".
3. Set **Schema file or URL** to `https://maitrungduc1410.github.io/loader-kit/schema/v1.json`.
4. Set **Schema version** to **JSON Schema version 7**.
5. Add a file path pattern, for example `loaders/*.json`.

## Validate in CI

Run two checks on every spec in your repository: the JSON Schema with [ajv](https://ajv.js.org/), and `validate()` from `@loader-kit/spec` for the rules a schema cannot express.

```sh
npm install --save-dev @loader-kit/spec ajv
```

```js
// scripts/check-loaders.mjs
import { readFileSync, readdirSync } from 'node:fs';
import Ajv from 'ajv';
import { validate } from '@loader-kit/spec';
import schema from '@loader-kit/spec/schema.json' with { type: 'json' };

const check = new Ajv({ allErrors: true }).compile(schema);
let failed = false;

for (const file of readdirSync('loaders').filter((name) => name.endsWith('.json'))) {
  const spec = JSON.parse(readFileSync(`loaders/${file}`, 'utf8'));
  const problems = validate(spec);
  if (!check(spec)) problems.push(...check.errors.map((e) => `${e.instancePath || '/'} ${e.message}`));
  if (problems.length > 0) {
    failed = true;
    console.error(`${file}:\n  ${problems.join('\n  ')}`);
  }
}

process.exit(failed ? 1 : 0);
```

```yaml
# .github/workflows/loaders.yml (one step)
- run: node scripts/check-loaders.mjs
```

## What the schema checks

- Required fields, such as `schemaVersion`, `name`, `duration`, `layout`, `shape`.
- Field types, enums (`layout.type`, `shape.type`, `property`, named easings) and simple ranges (positive durations, `keyTimes` within [0, 1], `sweep` within (0, 2π]).
- The two forms of a spec: inline group fields, or `parts` with no group fields at the top level.
- Unknown fields. The schema is stricter than the engines here: engines ignore unknown fields, but in a hand-written spec they are usually typos, such as `keytimes` for `keyTimes`.

## What only `validate()` checks

Some rules need more than one field. The schema leaves them to `validate()`, which every engine applies too:

| Rule | Example error |
| --- | --- |
| `keyTimes` never decrease | `tracks[0].keyTimes must be non-decreasing` |
| `values` has the same length as `keyTimes` | `tracks[0].values must have the same length as keyTimes` |
| A list of easings has one entry per segment | `tracks[0].easing needs one entry per segment (2)` |
| A `$param` names a declared param | `layout.count uses unknown param "cout"` |
| One track per property in a list | `tracks[1].property "scale" is animated by more than one track` |
| `strokeStart` and `strokeEnd` need a `ring` shape | `tracks[0].property "strokeEnd" needs a ring shape` |
| The spec animates something | `the spec needs at least one track or group track` |

A few checks need the element count with the user's params applied, so they run only when the spec is prepared: a `stagger` array or `durations` shorter than the element count, and the [element limits](/spec/using#limits). `prepare()` in `@loader-kit/web` runs them in JavaScript.

## See also

- [Using a spec](/spec/using): validation APIs on each platform.
- [Writing specs with AI](/tools/ai): the schema makes AI output easier to check.
- [Playground](/tools/playground): schema hints and `validate()` errors in the browser.
