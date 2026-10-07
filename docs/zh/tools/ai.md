---
description: "借助 AI 助手编写 LoaderKit spec：描述、生成、校验、预览的工作循环，可直接复制的提示词，以及 AI 常见错误清单。"
---

# 用 AI 编写 spec

LoaderKit spec 是一份很小的 JSON 文档，有公开的 schema 和精确的规范，非常适合交给 AI 助手来写：你描述动效，助手写 JSON，工具马上告诉你它是否有效。

::: warning 实验性功能
自定义 spec 目前仍是实验性功能。在 schema 宣布稳定之前，次版本更新可能会改动它。请把当前的 schema 和 SPEC 提供给助手，而不是让它凭记忆来写。
:::

## 为什么效果好 {#why-this-works-well}

- **schema 是机器可读的。** [JSON Schema](/zh/tools/json-schema) 列出了每个字段、类型和枚举。读过它的助手不必去猜字段名。
- **规则都写清楚了。** [规范](/zh/spec/reference)精确定义了单位、角度、采样和缓动，几乎没有自由发挥的空间。
- **错误信息很精确。** `validate()` 返回带路径的信息，比如 `tracks[0].values must have the same length as keyTimes`，可以原样粘贴回去给助手。
- **反馈是即时的。** [Playground](/zh/tools/playground) 实时显示效果，分享链接还能让你和助手来回传递同一份 spec。

## 把文档提供给助手 {#give-the-assistant-the-docs}

本站为大语言模型提供了两个纯文本文件：

| 文件 | 内容 |
| --- | --- |
| [`/llms.txt`](https://maitrungduc1410.github.io/loader-kit/llms.txt) | 文档的简短索引，附链接 |
| [`/llms-full.txt`](https://maitrungduc1410.github.io/loader-kit/llms-full.txt) | 合并成一个文件的完整文档 |

还有 schema：`https://maitrungduc1410.github.io/loader-kit/schema/v1.json`。

如果你的助手能浏览网页，直接把这些 URL 给它。不能的话，就把 schema 和需要的 SPEC 章节粘贴到对话里。

## 工作循环 {#the-loop}

1. **描述**加载动画：元素、布局、动作、时序和整体感觉。如果有相近的内置动画，也提一下。
2. **生成**：让助手写出 spec。
3. **校验**：粘贴到 [Playground](/zh/tools/playground)，或者运行 `@loader-kit/spec` 的 `validate()`。
4. **预览**：在 Playground 里分别用大尺寸和小尺寸、浅色和深色背景查看。拖动 `cycleProgress` 检查单帧。
5. **改进**：把错误粘贴回去，或者描述哪里不对劲（“太快了”“点重叠了”）。然后回到第 3 步。

效果满意后，加上 `$schema` 这一行，保存成文件，然后[在 App 中加载](/zh/spec/using)。

## 示例提示词 {#sample-prompts}

复制一条提示词，把尖括号里的部分换成你自己的内容。提示词保留英文，可以直接使用；尖括号里的描述用中文写也没问题。

### 系统提示词 {#system-prompt}

在对话开始时用一次，或者放进自定义指令里。

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

### 根据描述生成新的加载动画 {#a-new-indicator-from-a-description}

```text
Make a three-dot typing indicator, like a chat app shows while someone is typing.
The dots sit in a row in the middle of the box. Each dot rises a little and becomes
fully opaque, then falls back and dims, one after another from left to right.
One cycle should last about 1.2 seconds, with a short pause where all dots rest.
Expose params for the number of dots and the rise height.
```

### 转换 CSS spinner {#convert-a-css-spinner}

```text
Turn this CSS keyframes spinner into a LoaderKit spec. Keep the timing and easing.
Convert degrees to radians and pixel sizes to fractions of the box
(the CSS container is <40>px). Map animation-delay to stagger.

<paste the HTML and CSS here>
```

### 调整感觉 {#change-the-feel}

```text
Here is a LoaderKit spec. Make it feel calmer: a longer cycle, softer easing,
a smaller scale change and less contrast in opacity. Keep the same layout and
the same number of elements. Explain each change in one line.

<paste the spec here>
```

### 修复校验错误 {#fix-validation-errors}

```text
validate() from @loader-kit/spec returned these errors for the spec below.
Explain each error in one sentence, then return the fixed spec.
Change only what is needed to fix the errors.

Errors:
<paste the errors here>

Spec:
<paste the spec here>
```

### 从内置动画出发 {#start-from-a-built-in}

```text
Start from the LoaderKit built-in "BallSpinFadeLoader" (a ring of dots that fade
and shrink one after another). Write a variant with 12 thin lines instead of dots,
each pointing away from the center (ring layout with orient: true and the line
shape). Keep the fade.
```

### 解释一份 spec {#explain-a-spec}

```text
Explain what this LoaderKit spec draws, frame by frame, for one cycle.
Describe where each element is at keyTimes 0, 0.25, 0.5 and 0.75.

<paste the spec here>
```

## AI 常见错误清单 {#checklist-of-common-ai-mistakes}

把 spec 放进 App 之前，先对照检查一遍。第一组问题 `validate()` 能发现；第二组是合法的 JSON，但效果看起来不对。

**`validate()` 能发现的**

- `keyTimes` 和 `values` 长度不同。
- `keyTimes` 中间出现了下降，或者超出了 [0, 1]。
- 缓动列表的项数不对，应该是 `keyTimes.length - 1`。
- `$param` 引用的参数没有在 `params` 中声明。
- 两条 track 驱动同一个属性。
- 在非 `ring` 形状上用了 `strokeStart` 或 `strokeEnd`。
- `sweep` 略大于 2π，比如 `6.2832`。请用 `6.283185307`。
- 缺少 `schemaVersion`，或者 spec 一条 track 都没有。

**合法，但看起来不对**

- **用了角度而不是弧度。** `"values": [0, 360]` 每个周期会转 57 圈。一整圈是 `6.283185307`。
- **用了像素而不是方框单位。** `"translateY": -10` 会把元素移到十个方框之外。长度是方框边长的比例：`-0.1` 是十分之一。
- **keyTimes 不从 0 开始或不在 1 结束。** 第一个 key time 之前和最后一个之后，数值保持不变，看起来会像卡顿。
- **循环时跳变。** 最后一个值和第一个值不同，元素会在每个周期末尾突然跳回去。从 0 转到一整圈的旋转这样写没问题，缩放就不行。
- **忘了 stagger。** 描述里说的是“依次”，结果所有元素一起动。
- **stagger 比周期还长。** 当 `each` × `count` 远大于 `duration` 时，波浪互相重叠，看起来很杂乱。
- **元素超出方框。** 位移或缩放过大，会把形状推出边界，视图可能会把它裁掉。
- **y 轴方向搞反。** `translateY` 为负表示向上。
- **在 spec 里写颜色。** 颜色在视图上设置，不属于 spec。引擎会忽略 `color` 字段，schema 则会把它标出来。

## 另请参阅 {#see-also}

- [自定义加载动画](/zh/spec/)：通过动手编写 spec 来学习格式。
- [JSON Schema](/zh/tools/json-schema)：编辑器配置和 CI 检查。
- [使用 spec](/zh/spec/using)：校验 API 和错误信息。
