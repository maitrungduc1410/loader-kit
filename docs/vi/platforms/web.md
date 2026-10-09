---
description: "Dùng LoaderKit trên web với @loader-kit/web: component cho React, Vue và Svelte, custom element <loader-kit>, class canvas LoaderKitView và server-side rendering."
---

# Web

`@loader-kit/web` vẽ các indicator của LoaderKit vào một `<canvas>`. Chọn entry point hợp với app của bạn:

| Entry point | Bạn nhận được gì |
| --- | --- |
| `@loader-kit/web/react` | component `<LoaderKit>` cho React 17 trở lên |
| `@loader-kit/web/vue` | component `<LoaderKit>` cho Vue 3.3 trở lên |
| `@loader-kit/web/svelte` | component `<LoaderKit>` cho Svelte 4 và 5 |
| `@loader-kit/web/element` | custom element `<loader-kit>`, cho HTML thuần và các framework khác |
| `@loader-kit/web` | class `LoaderKitView`, cùng các hàm để bạn tự prepare và vẽ một spec |

Các component render element `<loader-kit>` và tự đăng ký nó, nên bạn không cần setup gì thêm. Mọi entry point đều import an toàn trong lúc server-side rendering.

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

React, Vue và Svelte là peer dependency tùy chọn: chỉ cần cài framework bạn đang dùng.

## React {#react}

```tsx
import { LoaderKit } from '@loader-kit/web/react';

export function Saving({ busy }: { busy: boolean }) {
  return <LoaderKit indicator="BallSpinFadeLoader" color="#7c3aed" size={48} animating={busy} />;
}
```

- Module được đánh dấu `'use client'`, nên với App Router của Next.js bạn có thể render `<LoaderKit>` ngay trong một Server Component, với các props serialize được. `onError` hoặc `ref` thì truyền từ một Client Component.
- `ref` trỏ tới element `<loader-kit>` (`LoaderKitElementApi`), ví dụ để đọc `ref.current.time`.
- `onError` nhận thông báo lỗi khi indicator không vẽ được, và nhận `null` khi nó vẽ lại được.

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

- Đây là một component Vue bình thường: không cần cấu hình compiler, chạy được với Nuxt và server-side rendering.
- Muốn dùng ở mọi nơi mà không phải import, hãy đăng ký một lần: `app.component('LoaderKit', LoaderKit)`.
- Template ref trên component expose `element`, chính là element `<loader-kit>`.

## Svelte {#svelte}

```svelte
<script lang="ts">
  import { LoaderKit } from '@loader-kit/web/svelte';

  let { busy }: { busy: boolean } = $props();
</script>

<LoaderKit indicator="BallSpinFadeLoader" color="#7c3aed" size={48} animating={busy} />
```

- Chạy được với Svelte 4 và 5, và với server-side rendering của SvelteKit. Package đi kèm source của component, plugin Svelte cho Vite sẽ compile nó cùng phần còn lại của app.
- `bind:element` cho bạn element `<loader-kit>`. `onError` nhận thông báo lỗi, và nhận `null` khi indicator vẽ lại được.
- Component được viết không dùng runes để cùng một source compile được với cả hai phiên bản. Nếu config Svelte 5 của bạn bật `runes` cho mọi file, hãy giới hạn nó trong code của bạn, ví dụ `runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true`.

## Props của component {#component-props}

Cả ba component nhận cùng một bộ props:

| Prop | Kiểu | Mặc định |
| --- | --- | --- |
| `indicator` | tên một indicator có sẵn | `'BallPulse'` |
| `spec` | `IndicatorSpec` hoặc chuỗi JSON. Được ưu tiên hơn `indicator` | không có |
| `params` | `Record<string, number>` hoặc chuỗi JSON | không có |
| `color` | màu CSS bất kỳ | CSS `color` của element |
| `colors` | `string[]`. Được ưu tiên hơn `color` khi không rỗng | không có |
| `speed` | `number`. Từ 0 trở xuống là tạm dừng | `1` |
| `animating` | `boolean` | `true` |
| `hidesWhenStopped` | `boolean` | `true` |
| `cycleProgress` | số từ 0 đến 1 để đứng yên ở frame đó. `null` thì chạy theo đồng hồ | `null` |
| `respectsReduceMotion` | `boolean` | `true` |
| `size` | số tính bằng px, hoặc độ dài CSS bất kỳ như `'3rem'` | 40px, trừ khi CSS đặt kích thước |
| `onError` (React, Svelte), `@error` (Vue) | `(message: string \| null) => void` | không có |

- Các attribute khác như `class`, `style`, `id` hay `aria-label` được chuyển xuống element `<loader-kit>`.
- Khi không có `size`, element rộng 40px, cao 40px theo style của chính nó, nên một class hay rule CSS bất kỳ đều đặt lại được kích thước (ví dụ `class="h-12 w-12"`).
- `spec` và `params` được so sánh dưới dạng JSON, nên truyền một object mới có cùng nội dung ở mỗi lần render sẽ không làm animation chạy lại từ đầu.
- Prop nào quay về undefined thì trở lại giá trị mặc định.

## Framework khác {#other-frameworks}

Với Angular, Solid, Lit, HTML thuần hay bất cứ gì khác, hãy dùng [custom element](#the-custom-element). Trong Angular, cho phép custom element trong component và import entry của element một lần:

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

## Custom element {#the-custom-element}

Dùng element trực tiếp trong HTML thuần, hoặc trong framework chưa có component ở trên. Import entry của element một lần. Nó sẽ định nghĩa `<loader-kit>` nếu tag này chưa được định nghĩa.

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

## Server-side rendering {#server-side-rendering}

- Mọi entry point đều import an toàn trên server: không entry nào đụng tới DOM global lúc import, và element chỉ được đăng ký ở nơi có `customElements`.
- Các component React, Vue và Svelte render `<loader-kit>` kèm đầy đủ attribute ngay trên server. Trong trình duyệt, element vẽ đúng indicator đó ngay khi được upgrade, và hydration giữ nguyên element mà server đã render.
- Khi JavaScript chưa load xong, element chưa có kích thước riêng. Hãy đặt `size` hoặc kích thước CSS để trang không bị xô lệch khi nó bắt đầu vẽ.
- Chỉ tạo `LoaderKitView` trong trình duyệt, ví dụ trong `useEffect`, `onMounted` hoặc `onMount`.

## Progress indicator {#progress}

`LoaderKitProgress` cho biết một tác vụ đã chạy được bao nhiêu: 50 mẫu thuộc 10 type, có value hoặc vô định, đổi value mượt.

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
view.value = 0.4;    // chạy mượt tới 0.4; null là vô định
view.destroy();
```

`LoaderKitProgress` cũng được export từ `@loader-kit/web/react`, `@loader-kit/web/vue` và `@loader-kit/web/svelte`, với props giống các attribute nhưng viết camelCase, và children cho nội dung ở giữa hoặc bên trong border. Giống `<loader-kit>`, phần tử này render được trên server và bắt đầu vẽ khi được upgrade.

Xem [Progress indicator](/vi/guide/progress) để biết mọi type, variant và option.

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

```tsx [React]
import { LoaderKit } from '@loader-kit/web/react';
import typingDots from './typing-dots.json';

<LoaderKit spec={typingDots} params={{ count: 4 }} />
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
