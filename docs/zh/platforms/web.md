---
description: "在 Web 上使用 @loader-kit/web：React、Vue、Svelte 组件，<loader-kit> 自定义元素，LoaderKitView canvas 类，以及服务端渲染。"
---

# Web

`@loader-kit/web` 把 LoaderKit 加载动画绘制到 `<canvas>` 上。按你的项目选择合适的入口：

| 入口 | 提供的内容 |
| --- | --- |
| `@loader-kit/web/react` | `<LoaderKit>` 组件，适用于 React 17 及以上 |
| `@loader-kit/web/vue` | `<LoaderKit>` 组件，适用于 Vue 3.3 及以上 |
| `@loader-kit/web/svelte` | `<LoaderKit>` 组件，适用于 Svelte 4 和 5 |
| `@loader-kit/web/element` | `<loader-kit>` 自定义元素，适用于纯 HTML 和其他框架 |
| `@loader-kit/web` | `LoaderKitView` 类，以及自己准备和绘制 spec 的函数 |

这些组件会渲染 `<loader-kit>` 元素并自动完成注册，不需要任何额外配置。所有入口在服务端渲染时导入都是安全的。使用 ES 模块打包工具时，打包结果只包含你导入的组件对应的元素：只用 `LoaderKit` 的应用不会带上 `<loader-kit-progress>`，反之亦然。

## 安装 {#install}

::: code-group

```sh [npm]
npm install @loader-kit/web
```

```sh [yarn]
yarn add @loader-kit/web
```

```sh [pnpm]
pnpm add @loader-kit/web
```

:::

React、Vue 和 Svelte 都是可选的 peer dependency，只需安装你正在用的框架。

## React {#react}

```tsx
import { LoaderKit } from '@loader-kit/web/react';

export function Saving({ busy }: { busy: boolean }) {
  return <LoaderKit indicator="BallSpinFadeLoader" color="#7c3aed" size={48} animating={busy} />;
}
```

- 这个模块带有 `'use client'` 标记，所以在 Next.js App Router 中，可以直接在 Server Component 里渲染 `<LoaderKit>`，前提是 props 可以序列化。`onError` 和 `ref` 需要从 Client Component 传入。
- `ref` 指向 `<loader-kit>` 元素（`LoaderKitElementApi`），比如可以读取 `ref.current.time`。
- 动画无法绘制时，`onError` 会收到错误信息；恢复正常后会收到 `null`。

## Vue {#vue}

```vue
<script setup lang="ts">
import { LoaderKit } from '@loader-kit/web/vue';

defineProps<{ busy: boolean }>();

function onError(message: string | null) {
  if (message) console.warn(message);
}
</script>

<template>
  <LoaderKit indicator="BallSpinFadeLoader" color="#7c3aed" :size="48" :animating="busy" @error="onError" />
</template>
```

- 它就是一个普通的 Vue 组件：不需要任何编译器配置，也可以在 Nuxt 和服务端渲染中使用。
- 如果想在任何地方直接使用而不必每次导入，注册一次即可：`app.component('LoaderKit', LoaderKit)`。
- 在组件上使用模板 ref，可以拿到它暴露的 `element`，也就是 `<loader-kit>` 元素。

## Svelte {#svelte}

```svelte
<script lang="ts">
  import { LoaderKit } from '@loader-kit/web/svelte';

  let { busy }: { busy: boolean } = $props();
</script>

<LoaderKit indicator="BallSpinFadeLoader" color="#7c3aed" size={48} animating={busy} />
```

- 支持 Svelte 4 和 5，也支持 SvelteKit 的服务端渲染。包里附带组件源码，由 Vite 的 Svelte 插件和你的应用一起编译。
- `bind:element` 可以拿到 `<loader-kit>` 元素。`onError` 会收到错误信息，恢复正常后收到 `null`。
- 组件没有使用 runes 编写，这样同一份源码可以同时用 Svelte 4 和 5 编译。如果你的 Svelte 5 配置对所有文件都开启了 `runes`，请把它限制在你自己的代码上，例如 `runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true`。

## 组件 props {#component-props}

三个组件的 props 完全相同：

| Prop | 类型 | 默认值 |
| --- | --- | --- |
| `indicator` | 内置动画名称 | `'BallPulse'` |
| `spec` | `IndicatorSpec` 或 JSON 字符串，优先于 `indicator` | 无 |
| `params` | `Record<string, number>` 或 JSON 字符串 | 无 |
| `color` | 任意 CSS 颜色 | 元素的 CSS `color` |
| `colors` | `string[]`，非空时优先于 `color` | 无 |
| `speed` | `number`，小于等于 0 时暂停 | `1` |
| `animating` | `boolean` | `true` |
| `hidesWhenStopped` | `boolean` | `true` |
| `cycleProgress` | 0 到 1 之间的数，定格在这一帧；`null` 表示跟随时钟 | `null` |
| `respectsReduceMotion` | `boolean` | `true` |
| `size` | 以 px 为单位的数字，或任意 CSS 长度，如 `'3rem'` | 40px，除非 CSS 另行设置 |
| `onError`（React、Svelte）、`@error`（Vue） | `(message: string \| null) => void` | 无 |

- 其他属性，比如 `class`、`style`、`id` 或 `aria-label`，会传给 `<loader-kit>` 元素。
- 不传 `size` 时，元素靠自身样式默认为 40px × 40px，因此任何 class 或 CSS 规则都能覆盖它的尺寸（例如 `class="h-12 w-12"`）。
- `spec` 和 `params` 按 JSON 内容比较，所以每次渲染都传入内容相同的新对象，也不会让动画从头开始。
- 某个 prop 变回 undefined 时，会恢复为默认值。

## 其他框架 {#other-frameworks}

Angular、Solid、Lit、纯 HTML 或其他任何环境，都可以直接使用[自定义元素](#the-custom-element)。在 Angular 中，先在组件里允许自定义元素，再导入一次 element 入口：

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@loader-kit/web/element';

@Component({
  selector: 'app-saving',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<loader-kit indicator="BallSpinFadeLoader" [animating]="busy"></loader-kit>`,
})
export class SavingComponent {
  busy = true;
}
```

## 自定义元素 {#the-custom-element}

在纯 HTML 中，或者在上面没有现成组件的框架里，可以直接使用这个元素。导入一次 element 入口即可。如果 `<loader-kit>` 还没有被定义，它会完成定义。

```ts
import '@loader-kit/web/element';
```

```html
<loader-kit indicator="BallSpinFadeLoader" color="#7c3aed" speed="1.5"></loader-kit>
<loader-kit indicator="BallPulse" params='{"count":5}' colors="#f43f5e, #f59e0b, #10b981"></loader-kit>
<loader-kit cycle-progress="0.25" hides-when-stopped="false" animating="false"></loader-kit>
```

<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: center; margin: 16px 0;">
  <LoaderKitPreview indicator="BallSpinFadeLoader" color="#7c3aed" :speed="1.5" />
  <LoaderKitPreview indicator="BallPulse" :params="{ count: 5 }" :colors="['#f43f5e', '#f59e0b', '#10b981']" />
  <LoaderKitPreview indicator="BallPulse" :cycle-progress="0.25" />
</div>

### HTML 属性 {#attributes}

| 属性 | 值 | 默认值 |
| --- | --- | --- |
| `indicator` | 内置动画名称 | `BallPulse` |
| `spec` | JSON 格式的自定义 spec，优先于 `indicator` | 无 |
| `params` | JSON 对象，例如 `{"count":5}` | 无 |
| `color` | 任意 CSS 颜色 | 元素的 CSS `color` |
| `colors` | 用逗号分隔的 CSS 颜色，优先于 `color` | 无 |
| `speed` | 数字，小于等于 0 时暂停 | `1` |
| `animating` | `"false"` 表示停止 | 播放中 |
| `hides-when-stopped` | `"false"` 让定格的帧保持可见 | 停止时隐藏 |
| `cycle-progress` | 0 到 1 之间的数字，定格到对应的帧 | 无 |
| `respects-reduce-motion` | `"false"` 表示忽略 `prefers-reduced-motion` | 遵循 |

每个 HTML 属性都有对应的 camelCase 形式的 DOM 属性：`indicator`、`spec`、`params`、`color`、`colors`、`speed`、`animating`、`hidesWhenStopped`、`cycleProgress`、`respectsReduceMotion`。其中 `spec`、`params` 和 `colors` 还可以直接接收对象和数组：

```ts
const el = document.querySelector('loader-kit')!;
el.params = { count: 5 };
el.colors = ['#f43f5e', '#10b981'];
el.spec = mySpec; // 直接传对象，无需 stringify
```

### 尺寸与颜色 {#size-and-color}

元素默认是 40px × 40px，用 CSS 设置尺寸即可。没有 `color` 属性时，它使用元素的 CSS `color`，因此会跟随文字颜色和主题变化。

```css
loader-kit {
  width: 64px;
  height: 64px;
  color: var(--vp-c-brand-1);
}
```

### 错误处理 {#errors}

spec 无法绘制时，元素什么都不画，并派发一个 `loaderkit-error` 事件。`detail.message` 是错误信息；如果之后的修改修复了问题，它的值为 null。

```ts
el.addEventListener('loaderkit-error', (event) => {
  const { message } = (event as CustomEvent<{ message: string | null }>).detail;
  if (message) console.warn(message);
});
```

### 无障碍 {#accessibility}

元素带有 `role="progressbar"`，不带进度值（不确定进度），并且带有 `aria-label="Loading"`，除非你设置了自己的 `aria-label`。隐藏时它是 `aria-hidden` 的。

### 使用其他标签名 {#a-different-tag-name}

```ts
import { defineLoaderKitElement } from '@loader-kit/web/element';

defineLoaderKitElement('my-loader');
```

这个模块还导出了 `LoaderKitElement` 类。

## LoaderKitView 类 {#the-loaderkitview-class}

`LoaderKitView` 会在宿主元素内部创建一个 `<canvas>` 并在上面绘制。如果宿主本身就是 `<canvas>`，则直接画在宿主上。

```ts
import { LoaderKitView } from '@loader-kit/web';

const view = new LoaderKitView(document.querySelector('#loader')!, {
  indicator: 'BallPulse',
  params: { count: 5 },
  color: '#7c3aed',
  onError: (message) => {
    if (message) console.warn(message);
  },
});

view.speed = 2;
view.stop();
view.start();
view.destroy(); // 停止帧循环，移除 observer 和它创建的 canvas
```

### 选项与属性 {#options-and-properties}

每个选项同时也是属性，之后可以随时读取和修改。

| 选项 | 类型 | 默认值 |
| --- | --- | --- |
| `indicator` | 内置动画名称 | `'BallPulse'` |
| `spec` | `IndicatorSpec`、JSON 字符串或 `null`，优先于 `indicator` | `null` |
| `params` | `Record<string, number>` | `{}` |
| `color` | 任意 CSS 颜色，或 `null` | 宿主的 CSS `color`（`currentColor`） |
| `colors` | `string[]` 或 `null`，非空时优先于 `color` | `null` |
| `speed` | `number`，小于等于 0 时暂停 | `1` |
| `animating` | `boolean` | `true` |
| `hidesWhenStopped` | `boolean` | `true` |
| `cycleProgress` | 0 到 1 之间的数字，或 `null`（跟随时钟） | `null` |
| `respectsReduceMotion` | `boolean` | `true` |
| `onError` | `(message: string \| null) => void` | 无 |

只读成员：

| 成员 | 含义 |
| --- | --- |
| `canvas` | 正在绘制的 `HTMLCanvasElement` |
| `specError` | 当前的错误信息，或 `null` |
| `time` | 当前绘制的 spec 时间，单位为秒 |

视图根据宿主的大小来设置 canvas 尺寸，所以请用 CSS 设置宿主的尺寸。

## 服务端渲染 {#server-side-rendering}

- 所有入口在服务端导入都是安全的：导入时不会访问任何 DOM 全局对象，而且只有在存在 `customElements` 的环境里才会注册元素。
- React、Vue 和 Svelte 组件会在服务端渲染出带有全部属性的 `<loader-kit>`。到了浏览器里，元素一升级就会绘制同样的动画，hydration（水合）也会保留服务端渲染的元素。
- 在 JavaScript 加载完成之前，元素本身没有尺寸。请设置 `size` 或 CSS 尺寸，避免开始绘制时页面发生布局偏移。
- 只在浏览器中创建 `LoaderKitView`，例如放在 `useEffect`、`onMounted` 或 `onMount` 里。

## 进度指示器 {#progress}

`LoaderKitProgress` 用来显示任务完成了多少：9 种 type、30 种样式，支持确定与不确定状态，value 平滑过渡。

```html
<script type="module">
  import '@loader-kit/web/progress-element';
</script>

<loader-kit-progress type="linear" value="0.4"></loader-kit-progress>
<loader-kit-progress type="circular" show-label size="64"></loader-kit-progress>
```

```ts
import { LoaderKitProgressView } from '@loader-kit/web';

const view = new LoaderKitProgressView(host, { type: 'linear', variant: 'wavy' });
view.value = 0.4;    // 平滑过渡到 0.4；null 表示不确定状态
view.destroy();
```

`@loader-kit/web/react`、`@loader-kit/web/vue` 和 `@loader-kit/web/svelte` 也导出了 `LoaderKitProgress`，props 与属性相同但使用 camelCase，children 用于放在中间或 border 内部的内容。和 `<loader-kit>` 一样，这个元素可以在服务端渲染，upgrade 之后开始绘制。

所有 type、variant 和选项见[进度指示器](/zh/guide/progress)。

## 自定义 spec {#custom-specs}

spec 可以用对象或 JSON 传入。编写方法见[自定义加载动画](/zh/spec/)。

::: code-group

```ts [TypeScript]
import { LoaderKitView, validate } from '@loader-kit/web';

const json = await (await fetch('/specs/typing-dots.json')).text();

const problems = validate(JSON.parse(json));
if (problems.length > 0) console.warn(problems);

const view = new LoaderKitView(host, { spec: json, params: { count: 4 } });
```

```tsx [React]
import { LoaderKit } from '@loader-kit/web/react';
import typingDots from './typing-dots.json';

<LoaderKit spec={typingDots} params={{ count: 4 }} />
```

```html [HTML]
<loader-kit spec='{"schemaVersion":1,"name":"Blink","duration":1,"layout":{"type":"row","count":3,"gap":0.1},"shape":{"type":"circle"},"stagger":{"each":0.2},"tracks":[{"property":"opacity","keyTimes":[0,0.5,1],"values":[1,0.2,1]}]}'></loader-kit>
```

:::

## 不借助视图直接绘制 {#drawing-without-a-view}

借助 `prepare()` 和 `drawIndicator()`，你可以在自己的 canvas 上绘制，比如在游戏循环里，或者在 worker 中配合 `OffscreenCanvas` 使用。

```ts
import { prepare, drawIndicator } from '@loader-kit/web';

const prepared = prepare({ indicator: 'BallPulse' }, { count: 4 });
const ctx = canvas.getContext('2d')!;

function frame(now: number) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawIndicator(ctx, prepared, now / 1000, { width: canvas.width, height: canvas.height, color: '#7c3aed' });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

- `prepare(source, params?)` 解析内置名称或带参数的 spec，校验它，并检查[限制](/zh/spec/using#limits)。出错时抛出 `InvalidIndicatorError`（来自 `@loader-kit/spec`），它的 `errors` 列出了所有问题。
- `drawIndicator(ctx, prepared, t, frame)` 在 spec 时间 `t`（秒）绘制一帧，画在 context 中由 `x`、`y`、`width`、`height` 指定的矩形内。它不会清空 canvas，也不会访问 DOM。`frame.colors` 的作用与 `colors` 选项相同。

这个包还从 `@loader-kit/spec` 重新导出了 `validate`、`BUILTIN_INDICATOR_NAMES`，以及 `IndicatorSpec`、`Params`、`BuiltinIndicatorName` 类型。
