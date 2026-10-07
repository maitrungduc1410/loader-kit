---
description: "在 Web 上使用 @loader-kit/web：LoaderKitView 类、自定义元素、React、Vue、Svelte 集成与 SSR 注意事项。"
---

# Web

`@loader-kit/web` 把 LoaderKit 加载动画绘制到 `<canvas>` 上。它有两个入口：

- `@loader-kit/web`：`LoaderKitView` 类，以及一些更底层的函数，方便你自己准备并绘制 spec。在服务端渲染时导入也是安全的。
- `@loader-kit/web/element`：注册 `<loader-kit>` 自定义元素。

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

## 自定义元素 {#the-custom-element}

在浏览器中导入一次 element 入口即可。如果 `<loader-kit>` 还没有被定义，它会完成定义。

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
  <LoaderKitPreview indicator="BallPulse" :params.prop="{ count: 5 }" :colors="['#f43f5e', '#f59e0b', '#10b981']" />
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

## React

在 effect 中使用这个类。视图只创建一次，props 变化时更新它的属性：

```tsx
import { useEffect, useRef } from 'react';
import { LoaderKitView, type LoaderKitOptions } from '@loader-kit/web';

export function Loader({ indicator = 'BallPulse', color, speed = 1, animating = true }: LoaderKitOptions) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<LoaderKitView | null>(null);

  useEffect(() => {
    view.current = new LoaderKitView(host.current!);
    return () => view.current?.destroy();
  }, []);

  useEffect(() => {
    const v = view.current!;
    v.indicator = indicator;
    v.color = color ?? null;
    v.speed = speed;
    v.animating = animating;
  }, [indicator, color, speed, animating]);

  return <div ref={host} style={{ width: 48, height: 48 }} />;
}
```

也可以在客户端导入 element 入口之后，直接渲染 `<loader-kit>`。这时 `params` 和 `colors` 要以字符串形式传入（`params='{"count":5}'`）。

## Vue

先告诉 Vue 编译器 `loader-kit` 是自定义元素，然后就能在模板中使用。只有元素已经定义好时，Vue 才会把值设置为 DOM 属性（property）。这里 element 入口是在 `onMounted` 里加载的，晚于首次渲染，所以对象和数组要用 `.prop` 修饰符绑定。否则 Vue 会把它写成 `params="[object Object]"` 这样的 attribute。

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue';

export default {
  plugins: [vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === 'loader-kit' } } })],
};
```

```vue
<script setup lang="ts">
import { onMounted } from 'vue';

onMounted(() => import('@loader-kit/web/element'));
</script>

<template>
  <loader-kit indicator="BallPulse" :params.prop="{ count: 5 }" :speed="1.5" style="width: 48px; height: 48px" />
</template>
```

## Svelte

Svelte 原生支持自定义元素，无需任何配置：

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  export let loading = true;

  onMount(() => import('@loader-kit/web/element'));
</script>

<loader-kit indicator="LineScale" animating={loading} style="width: 48px; height: 48px"></loader-kit>
```

## 服务端渲染 {#server-side-rendering}

- 在 SSR 期间导入 `@loader-kit/web` 是安全的：导入时不会访问任何 DOM 全局对象。只在浏览器中创建 `LoaderKitView`（放在 `useEffect`、`onMounted` 或 `onMount` 里）。
- `@loader-kit/web/element` 只在 `customElements` 存在时才注册元素。不过仍然建议在客户端导入它，例如在挂载钩子里用动态 `import()`，这样元素会在 hydration（水合）之后再升级。
- 服务端会把 `<loader-kit>` 渲染成一个空元素。给它设置 CSS 尺寸，这样开始绘制时页面就不会发生布局偏移。

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
