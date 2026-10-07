import type { Params } from '@loader-kit/spec';

/** What the indicator panels let people change, turned into code for each platform. */
export interface IndicatorConfig {
  indicator: string;
  /** Only the params that differ from the indicator defaults. */
  params: Params;
  /** `#rrggbb`, or null for the platform default. */
  color: string | null;
  /** `#rrggbb` values; wins over `color` when non-empty. */
  colors: readonly string[];
  speed: number;
  /** CSS px, dp or pt. */
  size: number;
}

export interface Snippet {
  id: string;
  label: string;
  lang: string;
  code: string;
}

const round = (value: number, digits = 3) => Number(value.toFixed(digits));
const num = (value: number) => String(round(value));
/** A Kotlin or Swift Double literal. */
const double = (value: number) => (Number.isInteger(round(value)) ? `${round(value)}.0` : num(value));

function rgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1, 7), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const upper = (hex: string) => hex.slice(1, 7).toUpperCase();
const unit = (hex: string) => rgb(hex).map((channel) => round(channel / 255));

const entries = (params: Params) => Object.entries(params);

function web(c: IndicatorConfig): string {
  const attrs = [`indicator="${c.indicator}"`];
  if (entries(c.params).length > 0) attrs.push(`params='${JSON.stringify(c.params)}'`);
  if (c.colors.length > 0) attrs.push(`colors="${c.colors.join(', ')}"`);
  else if (c.color) attrs.push(`color="${c.color}"`);
  if (c.speed !== 1) attrs.push(`speed="${num(c.speed)}"`);
  attrs.push(`style="width: ${c.size}px; height: ${c.size}px"`);
  return `<!-- Once, in your entry module: import '@loader-kit/web/element'; -->
<loader-kit
  ${attrs.join('\n  ')}
></loader-kit>`;
}

/** Component props: `{expr}` bindings for React and Svelte, `:prop="expr"` for Vue. */
function componentProps(c: IndicatorConfig, bind: (name: string, expr: string) => string): string[] {
  const props = [`indicator="${c.indicator}"`];
  if (entries(c.params).length > 0) {
    props.push(bind('params', `{ ${entries(c.params).map(([k, v]) => `${k}: ${num(v)}`).join(', ')} }`));
  }
  if (c.colors.length > 0) props.push(bind('colors', `[${c.colors.map((v) => `'${v}'`).join(', ')}]`));
  else if (c.color) props.push(`color="${c.color}"`);
  if (c.speed !== 1) props.push(bind('speed', num(c.speed)));
  props.push(bind('size', String(c.size)));
  return props;
}

const jsxBind = (name: string, expr: string) => `${name}={${expr}}`;

function react(c: IndicatorConfig): string {
  return `import { LoaderKit } from '@loader-kit/web/react';

<LoaderKit
  ${componentProps(c, jsxBind).join('\n  ')}
/>`;
}

function vue(c: IndicatorConfig): string {
  const props = componentProps(c, (name, expr) => `:${name}="${expr}"`);
  return `<script setup lang="ts">
import { LoaderKit } from '@loader-kit/web/vue';
</script>

<template>
  <LoaderKit
    ${props.join('\n    ')}
  />
</template>`;
}

function svelte(c: IndicatorConfig): string {
  return `<script lang="ts">
  import { LoaderKit } from '@loader-kit/web/svelte';
</script>

<LoaderKit
  ${componentProps(c, jsxBind).join('\n  ')}
/>`;
}

function webClass(c: IndicatorConfig): string {
  const options = [`indicator: '${c.indicator}'`];
  if (entries(c.params).length > 0) {
    options.push(`params: { ${entries(c.params).map(([k, v]) => `${k}: ${num(v)}`).join(', ')} }`);
  }
  if (c.colors.length > 0) options.push(`colors: [${c.colors.map((v) => `'${v}'`).join(', ')}]`);
  else if (c.color) options.push(`color: '${c.color}'`);
  if (c.speed !== 1) options.push(`speed: ${num(c.speed)}`);
  return `import { LoaderKitView } from '@loader-kit/web';

const host = document.querySelector<HTMLElement>('#loader')!;
host.style.width = host.style.height = '${c.size}px';

const loader = new LoaderKitView(host, {
  ${options.join(',\n  ')},
});
// loader.stop(), loader.start(), loader.destroy()`;
}

function androidView(c: IndicatorConfig): string {
  const lines = [`indicator = "${c.indicator}"`];
  if (entries(c.params).length > 0) {
    lines.push(`params = mapOf(${entries(c.params).map(([k, v]) => `"${k}" to ${double(v)}`).join(', ')})`);
  }
  if (c.colors.length > 0) {
    lines.push(`colors = intArrayOf(${c.colors.map((v) => `Color.parseColor("#${upper(v)}")`).join(', ')})`);
  } else if (c.color) {
    lines.push(`color = Color.parseColor("#${upper(c.color)}")`);
  }
  if (c.speed !== 1) lines.push(`speed = ${double(c.speed)}`);
  return `val loader = LoaderKitView(context).apply {
    ${lines.join('\n    ')}
}
val size = (${c.size} * resources.displayMetrics.density).toInt()
container.addView(loader, ViewGroup.LayoutParams(size, size))`;
}

function compose(c: IndicatorConfig): string {
  const args = [`indicator = "${c.indicator}"`, `modifier = Modifier.size(${c.size}.dp)`];
  if (entries(c.params).length > 0) {
    args.push(`params = mapOf(${entries(c.params).map(([k, v]) => `"${k}" to ${double(v)}`).join(', ')})`);
  }
  if (c.colors.length > 0) args.push(`colors = listOf(${c.colors.map((v) => `Color(0xFF${upper(v)})`).join(', ')})`);
  else if (c.color) args.push(`color = Color(0xFF${upper(c.color)})`);
  if (c.speed !== 1) args.push(`speed = ${double(c.speed)}`);
  return `LoaderKitIndicator(
    ${args.join(',\n    ')},
)`;
}

const swiftParams = (params: Params) =>
  `[${entries(params).map(([k, v]) => `"${k}": ${num(v)}`).join(', ')}]`;

function uikit(c: IndicatorConfig): string {
  const color = (hex: string) => {
    const [r, g, b] = unit(hex);
    return `UIColor(red: ${r}, green: ${g}, blue: ${b}, alpha: 1)`;
  };
  const lines = [
    `import LoaderKit`,
    ``,
    `let loader = LoaderKitView(indicator: "${c.indicator}")`,
    `loader.frame = CGRect(x: 0, y: 0, width: ${c.size}, height: ${c.size})`,
  ];
  if (entries(c.params).length > 0) lines.push(`loader.params = ${swiftParams(c.params)}`);
  if (c.colors.length > 0) lines.push(`loader.colors = [\n    ${c.colors.map(color).join(',\n    ')},\n]`);
  else if (c.color) lines.push(`loader.color = ${color(c.color)}`);
  if (c.speed !== 1) lines.push(`loader.speed = ${num(c.speed)}`);
  lines.push(`view.addSubview(loader)`);
  return lines.join('\n');
}

function swiftui(c: IndicatorConfig): string {
  const color = (hex: string) => {
    const [r, g, b] = unit(hex);
    return `Color(red: ${r}, green: ${g}, blue: ${b})`;
  };
  const head =
    entries(c.params).length > 0
      ? `LoaderKitIndicator("${c.indicator}", params: ${swiftParams(c.params)})`
      : `LoaderKitIndicator("${c.indicator}")`;
  const modifiers: string[] = [];
  if (c.colors.length > 0) modifiers.push(`.colors([${c.colors.map(color).join(', ')}])`);
  else if (c.color) modifiers.push(`.color(${color(c.color)})`);
  if (c.speed !== 1) modifiers.push(`.speed(${num(c.speed)})`);
  modifiers.push(`.frame(width: ${c.size}, height: ${c.size})`);
  return `import LoaderKit
import SwiftUI

${head}
    ${modifiers.join('\n    ')}`;
}

function xaml(c: IndicatorConfig): string {
  const attrs = [`Indicator="${c.indicator}"`];
  if (c.color && c.colors.length === 0) attrs.push(`Color="#${upper(c.color)}"`);
  if (c.speed !== 1) attrs.push(`Speed="${num(c.speed)}"`);
  attrs.push(`Width="${c.size}"`, `Height="${c.size}"`);
  const note =
    entries(c.params).length > 0 || c.colors.length > 0 ? '\n<!-- Params and Colors are set from code, see WinUI (C#). -->' : '';
  return `<!-- xmlns:lk="using:LoaderKit.WinUI" -->${note}\n<lk:LoaderKitIndicator ${attrs.join(' ')} />`;
}

function csharp(c: IndicatorConfig): string {
  const color = (hex: string) => {
    const [r, g, b] = rgb(hex);
    return `ColorHelper.FromArgb(255, ${r}, ${g}, ${b})`;
  };
  const lines = [`Indicator = "${c.indicator}"`];
  if (entries(c.params).length > 0) {
    lines.push(
      `Params = new Dictionary<string, double> { ${entries(c.params).map(([k, v]) => `["${k}"] = ${num(v)}`).join(', ')} }`,
    );
  }
  if (c.colors.length > 0) lines.push(`Colors = new[] { ${c.colors.map(color).join(', ')} }`);
  else if (c.color) lines.push(`Color = ${color(c.color)}`);
  if (c.speed !== 1) lines.push(`Speed = ${num(c.speed)}`);
  lines.push(`Width = ${c.size}`, `Height = ${c.size}`);
  return `using LoaderKit.WinUI;
using Microsoft.UI;

var loader = new LoaderKitIndicator
{
    ${lines.join(',\n    ')},
};`;
}

function reactNative(c: IndicatorConfig): string {
  const props = [`name="${c.indicator}"`];
  if (entries(c.params).length > 0) {
    props.push(`params={{ ${entries(c.params).map(([k, v]) => `${k}: ${num(v)}`).join(', ')} }}`);
  }
  const color = c.colors[0] ?? c.color;
  if (color) props.push(`color="${color}"`);
  if (c.speed !== 1) props.push(`speed={${num(c.speed)}}`);
  props.push(`style={{ width: ${c.size}, height: ${c.size} }}`);
  return `import { LoaderKitView } from 'react-native-loader-kit';

<LoaderKitView
  ${props.join('\n  ')}
/>`;
}

export function snippets(c: IndicatorConfig): Snippet[] {
  return [
    { id: 'react', label: 'React', lang: 'tsx', code: react(c) },
    { id: 'vue', label: 'Vue', lang: 'vue', code: vue(c) },
    { id: 'svelte', label: 'Svelte', lang: 'svelte', code: svelte(c) },
    { id: 'web', label: 'HTML', lang: 'html', code: web(c) },
    { id: 'web-ts', label: 'Web (TS)', lang: 'ts', code: webClass(c) },
    { id: 'android', label: 'Android View', lang: 'kotlin', code: androidView(c) },
    { id: 'compose', label: 'Compose', lang: 'kotlin', code: compose(c) },
    { id: 'uikit', label: 'UIKit', lang: 'swift', code: uikit(c) },
    { id: 'swiftui', label: 'SwiftUI', lang: 'swift', code: swiftui(c) },
    { id: 'xaml', label: 'WinUI (XAML)', lang: 'xml', code: xaml(c) },
    { id: 'csharp', label: 'WinUI (C#)', lang: 'csharp', code: csharp(c) },
    { id: 'react-native', label: 'React Native', lang: 'tsx', code: reactNative(c) },
  ];
}
