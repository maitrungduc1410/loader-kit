---
description: "Dùng LoaderKit trên web với @loader-kit/web: class canvas LoaderKitView, custom element <loader-kit>, cách dùng với React, Vue, Svelte và lưu ý khi SSR."
---

# Web

`@loader-kit/web` vẽ các indicator của LoaderKit vào một `<canvas>`. Package có hai entry point:

- `@loader-kit/web`: class `LoaderKitView`, cùng các hàm cấp thấp hơn để bạn tự prepare và vẽ một spec. Import trong lúc server-side rendering vẫn an toàn.
- `@loader-kit/web/element`: đăng ký custom element `<loader-kit>`.

## Cài đặt {#install}

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

## Custom element {#the-custom-element}

Import entry của element một lần, trong trình duyệt. Nó sẽ định nghĩa `<loader-kit>` nếu tag này chưa được định nghĩa.

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

### Attribute {#attributes}

| Attribute | Giá trị | Mặc định |
| --- | --- | --- |
| `indicator` | tên một indicator có sẵn | `BallPulse` |
| `spec` | một spec tùy chỉnh dạng JSON. Được ưu tiên hơn `indicator` | không có |
| `params` | một object JSON, ví dụ `{"count":5}` | không có |
| `color` | màu CSS bất kỳ | CSS `color` của phần tử |
| `colors` | các màu CSS, cách nhau bằng dấu phẩy. Được ưu tiên hơn `color` | không có |
| `speed` | một con số. Bằng 0 hoặc nhỏ hơn thì tạm dừng | `1` |
| `animating` | `"false"` để dừng | đang chạy |
| `hides-when-stopped` | `"false"` để frame đứng yên vẫn hiển thị | ẩn khi dừng |
| `cycle-progress` | một số từ 0 đến 1, freeze frame tại đó | không có |
| `respects-reduce-motion` | `"false"` để bỏ qua `prefers-reduced-motion` | có tôn trọng |

Mỗi attribute cũng là một property viết kiểu camelCase: `indicator`, `spec`, `params`, `color`, `colors`, `speed`, `animating`, `hidesWhenStopped`, `cycleProgress`, `respectsReduceMotion`. Các property `spec`, `params` và `colors` còn nhận cả object và array:

```ts
const el = document.querySelector('loader-kit')!;
el.params = { count: 5 };
el.colors = ['#f43f5e', '#10b981'];
el.spec = mySpec; // truyền object luôn, không cần stringify
```

### Kích thước và màu {#size-and-color}

Mặc định phần tử có kích thước 40px x 40px. Chỉnh kích thước bằng CSS. Nếu không có attribute `color`, nó dùng CSS `color` của phần tử, nên tự ăn theo màu chữ và theme của bạn.

```css
loader-kit {
  width: 64px;
  height: 64px;
  color: var(--vp-c-brand-1);
}
```

### Lỗi {#errors}

Khi spec không vẽ được, phần tử sẽ không vẽ gì và dispatch event `loaderkit-error`. `detail.message` là thông báo lỗi, hoặc null khi một thay đổi sau đó đã sửa được lỗi.

```ts
el.addEventListener('loaderkit-error', (event) => {
  const { message } = (event as CustomEvent<{ message: string | null }>).detail;
  if (message) console.warn(message);
});
```

### Accessibility {#accessibility}

Phần tử có `role="progressbar"` không kèm giá trị (indeterminate) và `aria-label="Loading"`, trừ khi bạn tự đặt `aria-label`. Khi bị ẩn, nó có `aria-hidden`.

### Đổi tên tag {#a-different-tag-name}

```ts
import { defineLoaderKitElement } from '@loader-kit/web/element';

defineLoaderKitElement('my-loader');
```

Module này cũng export class `LoaderKitElement`.

## Class LoaderKitView {#the-loaderkitview-class}

`LoaderKitView` vẽ vào một `<canvas>` mà nó tự tạo bên trong phần tử host. Nếu host chính là một `<canvas>`, nó vẽ thẳng vào host.

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
view.destroy(); // dừng frame loop, gỡ các observer và canvas mà nó đã tạo
```

### Option và property {#options-and-properties}

Mỗi option cũng là một property mà bạn có thể đọc và gán lại sau.

| Option | Kiểu | Mặc định |
| --- | --- | --- |
| `indicator` | tên indicator có sẵn | `'BallPulse'` |
| `spec` | `IndicatorSpec`, chuỗi JSON, hoặc `null`. Được ưu tiên hơn `indicator` | `null` |
| `params` | `Record<string, number>` | `{}` |
| `color` | màu CSS bất kỳ, hoặc `null` | CSS `color` của host (`currentColor`) |
| `colors` | `string[]` hoặc `null`. Được ưu tiên hơn `color` khi không rỗng | `null` |
| `speed` | `number`. Bằng 0 hoặc nhỏ hơn thì tạm dừng | `1` |
| `animating` | `boolean` | `true` |
| `hidesWhenStopped` | `boolean` | `true` |
| `cycleProgress` | một số từ 0 đến 1, hoặc `null` để chạy theo đồng hồ | `null` |
| `respectsReduceMotion` | `boolean` | `true` |
| `onError` | `(message: string \| null) => void` | không có |

Các member chỉ đọc:

| Member | Ý nghĩa |
| --- | --- |
| `canvas` | `HTMLCanvasElement` đang được vẽ |
| `specError` | thông báo lỗi hiện tại, hoặc `null` |
| `time` | thời điểm trong spec đang được vẽ, tính bằng giây |

View lấy kích thước canvas theo host, nên bạn hãy đặt kích thước cho host bằng CSS.

## React {#react}

Dùng class này trong một effect. Tạo view một lần, rồi cập nhật property mỗi khi props thay đổi:

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

Bạn cũng có thể render thẳng `<loader-kit>` sau khi đã import entry của element ở phía client. Khi đó truyền `params` và `colors` dưới dạng chuỗi (`params='{"count":5}'`).

## Vue {#vue}

Báo cho Vue compiler biết `loader-kit` là custom element, rồi dùng nó trong template. Vue chỉ gán property khi element đã được define. Ở đây entry của element được load trong `onMounted`, tức là sau lần render đầu tiên, nên hãy bind object và array bằng modifier `.prop`. Nếu không, Vue sẽ ghi `params="[object Object]"` thành attribute.

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

## Svelte {#svelte}

Svelte hỗ trợ custom element mà không cần cấu hình gì:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  export let loading = true;

  onMount(() => import('@loader-kit/web/element'));
</script>

<loader-kit indicator="LineScale" animating={loading} style="width: 48px; height: 48px"></loader-kit>
```

## Server-side rendering {#server-side-rendering}

- Import `@loader-kit/web` trong lúc SSR là an toàn: lúc import nó không đụng tới DOM global nào. Chỉ tạo `LoaderKitView` trong trình duyệt (trong `useEffect`, `onMounted` hoặc `onMount`).
- `@loader-kit/web/element` chỉ đăng ký element khi có `customElements`. Dù vậy, bạn vẫn nên import nó ở client, ví dụ bằng `import()` động trong một mount hook, để element được upgrade sau khi hydration.
- Server render `<loader-kit>` thành một phần tử rỗng. Hãy đặt kích thước CSS cho nó để trang không bị xô lệch khi nó bắt đầu vẽ.

## Spec tùy chỉnh {#custom-specs}

Truyền spec dưới dạng object hoặc JSON. Xem [Indicator tùy chỉnh](/vi/spec/) để biết cách viết.

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

## Vẽ không cần view {#drawing-without-a-view}

`prepare()` và `drawIndicator()` cho phép bạn vẽ lên canvas của riêng mình, ví dụ trong game loop hoặc trong worker với `OffscreenCanvas`.

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

- `prepare(source, params?)` resolve một tên indicator có sẵn hoặc một spec kèm params, validate nó và kiểm tra các [giới hạn](/vi/spec/using#limits). Nó throw `InvalidIndicatorError` (từ `@loader-kit/spec`), trong đó `errors` liệt kê mọi lỗi.
- `drawIndicator(ctx, prepared, t, frame)` vẽ một frame tại thời điểm spec `t` (giây) vào hình chữ nhật `x`, `y`, `width`, `height` của context. Hàm này không xóa canvas và không đụng tới DOM. `frame.colors` hoạt động giống option `colors`.

Package cũng re-export `validate`, `BUILTIN_INDICATOR_NAMES` và các type `IndicatorSpec`, `Params`, `BuiltinIndicatorName` từ `@loader-kit/spec`.
