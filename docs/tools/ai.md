---
description: "Write LoaderKit specs with an AI assistant: a describe, generate, validate and preview loop, copyable prompts, and a checklist of common AI mistakes."
---

# Writing specs with AI

A LoaderKit spec is a small JSON document with a published schema and a precise specification. That makes it a good task for an AI assistant: you describe the motion, the assistant writes the JSON, and tools tell you right away whether it is valid.

::: warning Experimental
Custom specs are experimental. Until the schema is declared stable, a minor release may change it. Give the assistant the current schema and SPEC, not what it remembers.
:::

## Why this works well

- **The schema is machine-readable.** The [JSON Schema](/tools/json-schema) lists every field, type and enum. An assistant that reads it does not need to guess field names.
- **The rules are written down.** The [specification](/spec/reference) defines units, angles, sampling and easing exactly. There is little room for interpretation.
- **Errors are precise.** `validate()` returns messages with paths, such as `tracks[0].values must have the same length as keyTimes`. You can paste them back to the assistant as they are.
- **Feedback is instant.** The [playground](/tools/playground) shows the result live, and a share link lets you send the exact spec back and forth.

## Give the assistant the docs

The site publishes two plain text files for language models:

| File | Contents |
| --- | --- |
| [`/llms.txt`](https://maitrungduc1410.github.io/loader-kit/llms.txt) | A short index of the documentation, with links |
| [`/llms-full.txt`](https://maitrungduc1410.github.io/loader-kit/llms-full.txt) | The full documentation in one file |

And the schema: `https://maitrungduc1410.github.io/loader-kit/schema/v1.json`.

If your assistant can browse, give it these URLs. If not, paste the schema and the parts of the SPEC you need into the conversation.

## The loop

1. **Describe** the indicator: elements, layout, motion, timing and feel. Mention a built-in that is close, if there is one.
2. **Generate** the spec with the assistant.
3. **Validate** it. Paste it into the [playground](/tools/playground), or run `validate()` from `@loader-kit/spec`.
4. **Preview** it in the playground at small and large sizes, on light and dark backgrounds. Scrub `cycleProgress` to check single frames.
5. **Refine.** Paste the errors back, or describe what feels wrong ("too fast", "the dots overlap"). Repeat from step 3.

When it looks right, add the `$schema` line, save it as a file and [load it in your app](/spec/using).

## Sample prompts

Copy a prompt and replace the parts in angle brackets.

### System prompt

Use this once at the start of a conversation, or as custom instructions.

```text
You write LoaderKit indicator specs (JSON, schema version 1).
Schema: https://maitrungduc1410.github.io/loader-kit/schema/v1.json
Specification: https://maitrungduc1410.github.io/loader-kit/spec/reference
Docs for models: https://maitrungduc1410.github.io/loader-kit/llms-full.txt

Rules:
- Output one JSON object only, no comments. Start with
  "$schema": "https://maitrungduc1410.github.io/loader-kit/schema/v1.json" and "schemaVersion": 1.
- All lengths are fractions of a square box of side 1. Origin top-left, y points down.
- Angles are radians. Positive is clockwise. 0 points right, -1.570796327 is the top.
  A full turn is 6.283185307. A sweep must not exceed 6.283185307.
- Times are seconds. "duration" is one cycle.
- A track has keyTimes (non-decreasing, within 0 to 1, start at 0 and end at 1 for a loop)
  and values of the same length. easing is a name (linear, ease, easeIn, easeOut,
  easeInOut), a cubic bezier [x1, y1, x2, y2] with x1 and x2 in [0, 1], or a list with
  exactly one easing per segment.
- At most one track per property in a list. strokeStart and strokeEnd need a ring shape.
- Use stagger { "each": seconds } to offset elements. Negative offsets start mid-cycle.
- Declare params with defaults and reference them as { "$param": "name" }.
- Colors are not part of the spec.
After the JSON, explain the design in three short bullet points.
```

### A new indicator from a description

```text
Make a three-dot typing indicator, like a chat app shows while someone is typing.
The dots sit in a row in the middle of the box. Each dot rises a little and becomes
fully opaque, then falls back and dims, one after another from left to right.
One cycle should last about 1.2 seconds, with a short pause where all dots rest.
Expose params for the number of dots and the rise height.
```

### Convert a CSS spinner

```text
Turn this CSS keyframes spinner into a LoaderKit spec. Keep the timing and easing.
Convert degrees to radians and pixel sizes to fractions of the box
(the CSS container is <40>px). Map animation-delay to stagger.

<paste the HTML and CSS here>
```

### Change the feel

```text
Here is a LoaderKit spec. Make it feel calmer: a longer cycle, softer easing,
a smaller scale change and less contrast in opacity. Keep the same layout and
the same number of elements. Explain each change in one line.

<paste the spec here>
```

### Fix validation errors

```text
validate() from @loader-kit/spec returned these errors for the spec below.
Explain each error in one sentence, then return the fixed spec.
Change only what is needed to fix the errors.

Errors:
<paste the errors here>

Spec:
<paste the spec here>
```

### Start from a built-in

```text
Start from the LoaderKit built-in "BallSpinFadeLoader" (a ring of dots that fade
and shrink one after another). Write a variant with 12 thin lines instead of dots,
each pointing away from the center (ring layout with orient: true and the line
shape). Keep the fade.
```

### Explain a spec

```text
Explain what this LoaderKit spec draws, frame by frame, for one cycle.
Describe where each element is at keyTimes 0, 0.25, 0.5 and 0.75.

<paste the spec here>
```

## Checklist of common AI mistakes

Check these before you paste the spec into your app. `validate()` catches the first group. The second group is valid JSON that looks wrong.

**Caught by `validate()`**

- `keyTimes` and `values` have different lengths.
- `keyTimes` go down somewhere, or go outside [0, 1].
- A list of easings has the wrong number of entries. It needs `keyTimes.length - 1`.
- A `$param` names a param that is not declared in `params`.
- Two tracks animate the same property.
- `strokeStart` or `strokeEnd` is used on a shape that is not a `ring`.
- A `sweep` slightly above 2π, such as `6.2832`. Use `6.283185307`.
- `schemaVersion` is missing, or the spec has no track at all.

**Valid, but looks wrong**

- **Degrees instead of radians.** `"values": [0, 360]` spins 57 turns per cycle. A full turn is `6.283185307`.
- **Pixels instead of box units.** `"translateY": -10` moves the element ten boxes away. Lengths are fractions of the box: `-0.1` is a tenth of it.
- **keyTimes that do not start at 0 or end at 1.** The value holds before the first and after the last key time, which can look like a stutter.
- **A loop that jumps.** The last value differs from the first, so the element snaps back at the end of each cycle. That is fine for a rotation from 0 to a full turn, not for a scale.
- **Forgotten stagger.** All elements move together when the description says "one after another".
- **Stagger longer than the cycle.** With `each` × `count` well above `duration`, waves overlap and look random.
- **Elements outside the box.** A large translation or scale pushes shapes past the edge, where the view may clip them.
- **y pointing the wrong way.** Negative `translateY` is up.
- **Colors in the spec.** Colors are set on the view, not in the spec. A `color` field is ignored by engines and flagged by the schema.

## See also

- [Custom indicators](/spec/): learn the format by building a spec.
- [JSON Schema](/tools/json-schema): editor setup and CI checks.
- [Using a spec](/spec/using): validation APIs and error messages.
