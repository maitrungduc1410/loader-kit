import { progressIntrinsicSize, resolveProgress } from '@loader-kit/spec';
import type { ProgressType, ProgressVariant } from '@loader-kit/spec';
import type { Snippet } from './snippets.ts';

/** One design of the progress gallery: a type, a variant and the few options that make it. */
export interface ProgressDesign {
  type: ProgressType;
  variant?: ProgressVariant;
  thickness?: number;
  segments?: number;
  showLabel?: boolean;
  /** Draws a buffer ahead of the value, like a video player. */
  buffer?: boolean;
  /** Always indeterminate, whatever the gallery mode. */
  indeterminate?: boolean;
  size?: number;
  /** What the gallery puts inside: a stop button in the middle, or a button the border goes around. */
  child?: 'stop' | 'button';
}

export const PROGRESS_DESIGNS: readonly ProgressDesign[] = [
  { type: 'linear' },
  { type: 'linear', indeterminate: true },
  { type: 'linear', variant: 'wavy' },
  { type: 'linear', variant: 'wavy', indeterminate: true },
  { type: 'circular' },
  { type: 'circular', indeterminate: true },
  { type: 'circular', variant: 'wavy' },
  { type: 'circular', variant: 'wavy', indeterminate: true },
  { type: 'pie' },
  { type: 'pie', indeterminate: true },
  { type: 'linear', variant: 'segmented' },
  { type: 'linear', variant: 'striped' },
  { type: 'linear', variant: 'shimmer' },
  { type: 'linear', variant: 'glow' },
  { type: 'linear', variant: 'dots' },
  { type: 'linear', variant: 'steps' },
  { type: 'linear', buffer: true },
  { type: 'linear', thickness: 16, showLabel: true },
  { type: 'circular', variant: 'segmented' },
  { type: 'circular', variant: 'gradient' },
  { type: 'circular', variant: 'ticks' },
  { type: 'circular', variant: 'dots' },
  { type: 'circular', showLabel: true, size: 64 },
  { type: 'circular', child: 'stop' },
  { type: 'gauge', showLabel: true, size: 64 },
  { type: 'liquid', showLabel: true, size: 64 },
  { type: 'border', child: 'button' },
  { type: 'bars' },
  { type: 'grid' },
  { type: 'battery', showLabel: true, size: 64 },
  { type: 'linear', variant: 'gradient' },
  { type: 'linear', variant: 'center' },
  { type: 'linear', variant: 'chevrons' },
  { type: 'linear', variant: 'ticks' },
  { type: 'circular', variant: 'glow' },
  { type: 'circular', variant: 'split' },
  { type: 'circular', variant: 'orbit' },
  { type: 'circular', variant: 'dual' },
  { type: 'pie', variant: 'segmented' },
  { type: 'gauge', variant: 'needle', showLabel: true, size: 64 },
  { type: 'gauge', variant: 'gradient' },
  { type: 'gauge', variant: 'dots' },
  { type: 'liquid', variant: 'heart', showLabel: true, size: 64 },
  { type: 'border', variant: 'glow', child: 'button' },
  { type: 'border', variant: 'segmented', child: 'button' },
  { type: 'bars', variant: 'dots' },
  { type: 'bars', variant: 'arcs' },
  { type: 'grid', variant: 'dots' },
  { type: 'battery', variant: 'segmented', size: 64 },
  { type: 'hourglass' },
];

export function designTitle(d: ProgressDesign): string {
  const parts: string[] = [d.type];
  if (d.variant) parts.push(d.variant);
  if (d.buffer) parts.push('buffer');
  if (d.showLabel) parts.push('label');
  if (d.child === 'stop') parts.push('stop');
  if (d.indeterminate) parts.push('indeterminate');
  return parts.join(' ');
}

/** A design as the panel tuned it: the code of every platform is written from it. */
export interface ProgressConfig extends ProgressDesign {
  /** `#rrggbb`, or null for the platform default. */
  color?: string | null;
  /** False draws every value as it comes instead of gliding to it. */
  smooth?: boolean;
}

const VALUE = 0.4;
const BUFFER = 0.6;

const pascal = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const round = (value: number, digits = 3) => Number(value.toFixed(digits));

function rgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1, 7), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const upper = (hex: string) => hex.slice(1, 7).toUpperCase();
const unit = (hex: string) => rgb(hex).map((channel) => round(channel / 255));
const indent = (text: string, spaces: number) => text.replace(/\n/g, `\n${' '.repeat(spaces)}`);

/** The options a config sets, in the order every snippet lists them. */
interface Fields {
  value: boolean;
  type?: ProgressType;
  variant?: ProgressVariant;
  /** Set only when turned off; an indeterminate indicator has no value to glide. */
  noSmooth: boolean;
  buffer?: number;
  thickness?: number;
  segments?: number;
  showLabel: boolean;
  size?: number;
  color?: string;
}

function fields(c: ProgressConfig): Fields {
  return {
    value: !c.indeterminate,
    type: c.type === 'circular' ? undefined : c.type,
    variant: c.variant,
    noSmooth: c.smooth === false && !c.indeterminate,
    buffer: c.buffer && !c.indeterminate ? BUFFER : undefined,
    thickness: c.thickness,
    segments: c.segments,
    showLabel: c.showLabel === true,
    size: c.size,
    color: c.color ?? undefined,
  };
}

/** A tag with its attributes on one line, or one per line when that gets long. */
function markup(tag: string, attrs: readonly string[], inner: string | null, selfClosing = true): string {
  const line = `<${tag}${attrs.map((a) => ` ${a}`).join('')}`;
  const multi = line.length > 64;
  const open = multi ? `<${tag}\n${attrs.map((a) => `  ${a}`).join('\n')}\n` : line;
  if (inner !== null) return `${open}>\n  ${indent(inner, 2)}\n</${tag}>`;
  if (selfClosing) return `${open}${multi ? '/>' : ' />'}`;
  return `${open}></${tag}>`;
}

/** Props of the React, Svelte and React Native components. */
function jsxAttrs(f: Fields, flag: (name: string) => string): string[] {
  const out: string[] = [];
  if (f.value) out.push('value={progress}');
  if (f.type) out.push(`type="${f.type}"`);
  if (f.variant) out.push(`variant="${f.variant}"`);
  if (f.noSmooth) out.push('smooth={false}');
  if (f.buffer !== undefined) out.push(`buffer={${f.buffer}}`);
  if (f.thickness !== undefined) out.push(`thickness={${f.thickness}}`);
  if (f.segments !== undefined) out.push(`segments={${f.segments}}`);
  if (f.showLabel) out.push(flag('showLabel'));
  if (f.size !== undefined) out.push(`size={${f.size}}`);
  if (f.color) out.push(`color="${f.color}"`);
  return out;
}

function react(c: ProgressConfig): string {
  const inner =
    c.child === 'stop' ? '<button aria-label="Stop" onClick={cancel}>■</button>'
    : c.child === 'button' ? '<button onClick={upload}>Upload</button>'
    : null;
  return `import { LoaderKitProgress } from '@loader-kit/web/react';\n\n${markup('LoaderKitProgress', jsxAttrs(fields(c), (n) => n), inner)}`;
}

function vue(c: ProgressConfig): string {
  const f = fields(c);
  const attrs: string[] = [];
  if (f.value) attrs.push(':value="progress"');
  if (f.type) attrs.push(`type="${f.type}"`);
  if (f.variant) attrs.push(`variant="${f.variant}"`);
  if (f.noSmooth) attrs.push(':smooth="false"');
  if (f.buffer !== undefined) attrs.push(`:buffer="${f.buffer}"`);
  if (f.thickness !== undefined) attrs.push(`:thickness="${f.thickness}"`);
  if (f.segments !== undefined) attrs.push(`:segments="${f.segments}"`);
  if (f.showLabel) attrs.push('show-label');
  if (f.size !== undefined) attrs.push(`:size="${f.size}"`);
  if (f.color) attrs.push(`color="${f.color}"`);
  const inner =
    c.child === 'stop' ? '<button aria-label="Stop" @click="cancel">■</button>'
    : c.child === 'button' ? '<button @click="upload">Upload</button>'
    : null;
  return `<script setup lang="ts">
import { LoaderKitProgress } from '@loader-kit/web/vue';
</script>

<template>
  ${indent(markup('LoaderKitProgress', attrs, inner), 2)}
</template>`;
}

function svelte(c: ProgressConfig): string {
  const inner =
    c.child === 'stop' ? '<button aria-label="Stop" on:click={cancel}>■</button>'
    : c.child === 'button' ? '<button on:click={upload}>Upload</button>'
    : null;
  return `<script lang="ts">
  import { LoaderKitProgress } from '@loader-kit/web/svelte';
</script>

${markup('LoaderKitProgress', jsxAttrs(fields(c), (n) => `${n}={true}`), inner)}`;
}

function html(c: ProgressConfig): string {
  const f = fields(c);
  const attrs: string[] = [];
  if (f.value) attrs.push(`value="${VALUE}"`);
  if (f.type) attrs.push(`type="${f.type}"`);
  if (f.variant) attrs.push(`variant="${f.variant}"`);
  if (f.noSmooth) attrs.push('smooth="false"');
  if (f.buffer !== undefined) attrs.push(`buffer="${f.buffer}"`);
  if (f.thickness !== undefined) attrs.push(`thickness="${f.thickness}"`);
  if (f.segments !== undefined) attrs.push(`segments="${f.segments}"`);
  if (f.showLabel) attrs.push('show-label');
  if (f.size !== undefined) attrs.push(`size="${f.size}"`);
  if (f.color) attrs.push(`color="${f.color}"`);
  const inner =
    c.child === 'stop' ? '<button aria-label="Stop">■</button>'
    : c.child === 'button' ? '<button>Upload</button>'
    : null;
  return `<script type="module">
  import '@loader-kit/web/progress-element';
</script>

${markup('loader-kit-progress', attrs, inner, false)}`;
}

function webClass(c: ProgressConfig): string {
  const f = fields(c);
  const options: string[] = [];
  if (f.type) options.push(`type: '${f.type}'`);
  if (f.variant) options.push(`variant: '${f.variant}'`);
  if (f.noSmooth) options.push('smooth: false');
  if (f.buffer !== undefined) options.push(`buffer: ${f.buffer}`);
  if (f.thickness !== undefined) options.push(`thickness: ${f.thickness}`);
  if (f.segments !== undefined) options.push(`segments: ${f.segments}`);
  if (f.showLabel) options.push('showLabel: true');
  if (f.color) options.push(`color: '${f.color}'`);
  const p = resolveProgress({ type: c.type, variant: c.variant, thickness: c.thickness, segments: c.segments, showLabel: c.showLabel });
  const intrinsic = progressIntrinsicSize(p);
  let sizing: string;
  if (c.type === 'linear') {
    sizing = `host.style.height = '${intrinsic.height}px'; // the width comes from your layout`;
  } else if (c.type === 'border') {
    sizing = `host.style.width = '160px';\nhost.style.height = '56px'; // the stroke runs along the edges of the host`;
  } else {
    const width = c.size ?? intrinsic.width ?? 48;
    const height = round((width * (intrinsic.height ?? 1)) / (intrinsic.width ?? 1), 1);
    sizing = `host.style.width = '${width}px';\nhost.style.height = '${height}px';`;
  }
  const content = c.child ? '\n// For content inside, use <loader-kit-progress> or a framework component.' : '';
  const create = options.length
    ? `const progress = new LoaderKitProgressView(host, {\n  ${options.join(',\n  ')},\n});`
    : 'const progress = new LoaderKitProgressView(host);';
  const value = f.value ? `\nprogress.value = ${VALUE}; // glides to every new value; null is indeterminate` : '';
  return `import { LoaderKitProgressView } from '@loader-kit/web';

const host = document.querySelector<HTMLElement>('#progress')!;
${sizing}${content}

${create}${value}`;
}

const kotlinDouble = (value: number) => (Number.isInteger(value) ? `${value}.0` : String(value));

function androidView(c: ProgressConfig): string {
  const f = fields(c);
  const lines: string[] = [];
  if (f.type) lines.push(`type = ProgressType.${pascal(f.type)}`);
  if (f.variant) lines.push(`variant = ProgressVariant.${pascal(f.variant)}`);
  if (f.noSmooth) lines.push('smooth = false');
  if (f.thickness !== undefined) lines.push(`thickness = ${kotlinDouble(f.thickness)}`);
  if (f.segments !== undefined) lines.push(`segments = ${f.segments}`);
  if (f.showLabel) lines.push('showLabel = true');
  if (f.size !== undefined) lines.push(`size = ${kotlinDouble(f.size)}`);
  if (f.color) lines.push(`color = Color.parseColor("#${upper(f.color)}")`);
  if (f.buffer !== undefined) lines.push(`buffer = ${f.buffer}`);
  if (f.value) lines.push(`value = ${VALUE} // glides to every new value; null is indeterminate`);
  const create = lines.length
    ? `val progress = LoaderKitProgressView(context).apply {\n    ${lines.join('\n    ')}\n}`
    : 'val progress = LoaderKitProgressView(context)';
  const child =
    c.child === 'stop'
      ? `\nprogress.addView(ImageButton(context).apply {\n    setImageResource(R.drawable.ic_stop)\n    contentDescription = "Stop"\n    setOnClickListener { cancel() }\n})`
      : c.child === 'button'
        ? `\nprogress.addView(Button(context).apply {\n    text = "Upload"\n    setOnClickListener { upload() }\n})`
        : '';
  const width = c.type === 'linear' ? 'MATCH_PARENT' : 'WRAP_CONTENT';
  return `${create}${child}
container.addView(
    progress,
    ViewGroup.LayoutParams(ViewGroup.LayoutParams.${width}, ViewGroup.LayoutParams.WRAP_CONTENT),
)`;
}

function compose(c: ProgressConfig): string {
  const f = fields(c);
  const args = [f.value ? 'value = progress' : 'value = null'];
  if (c.type === 'linear') args.push('modifier = Modifier.fillMaxWidth()');
  if (f.type) args.push(`type = ProgressType.${pascal(f.type)}`);
  if (f.variant) args.push(`variant = ProgressVariant.${pascal(f.variant)}`);
  if (f.noSmooth) args.push('smooth = false');
  if (f.buffer !== undefined) args.push(`buffer = ${f.buffer}`);
  if (f.color) args.push(`color = Color(0xFF${upper(f.color)})`);
  if (f.thickness !== undefined) args.push(`thickness = ${f.thickness}.dp`);
  if (f.segments !== undefined) args.push(`segments = ${f.segments}`);
  if (f.showLabel) args.push('showLabel = true');
  if (f.size !== undefined) args.push(`size = ${f.size}.dp`);
  const call = `LoaderKitProgress(\n    ${args.join(',\n    ')},\n)`;
  if (c.child === 'stop') return `${call} {\n    IconButton(onClick = cancel) { Icon(Icons.Filled.Stop, contentDescription = "Stop") }\n}`;
  if (c.child === 'button') return `${call} {\n    Button(onClick = upload) { Text("Upload") }\n}`;
  return call;
}

function uikit(c: ProgressConfig): string {
  const f = fields(c);
  const args = [f.value ? `value: ${VALUE}` : 'value: nil'];
  if (f.type) args.push(`type: .${f.type}`);
  if (f.variant) args.push(`variant: .${f.variant}`);
  const lines = ['import LoaderKit', '', `let progress = LoaderKitProgressView(${args.join(', ')})`];
  if (f.noSmooth) lines.push('progress.smooth = false');
  if (f.thickness !== undefined) lines.push(`progress.thickness = ${f.thickness}`);
  if (f.segments !== undefined) lines.push(`progress.segments = ${f.segments}`);
  if (f.showLabel) lines.push('progress.showLabel = true');
  if (f.size !== undefined) lines.push(`progress.size = ${f.size}`);
  if (f.color) {
    const [r, g, b] = unit(f.color);
    lines.push(`progress.color = UIColor(red: ${r}, green: ${g}, blue: ${b}, alpha: 1)`);
  }
  if (f.buffer !== undefined) lines.push(`progress.buffer = ${f.buffer}`);
  if (c.child === 'stop') {
    lines.push(
      'let stop = UIButton(primaryAction: UIAction(image: UIImage(systemName: "stop.fill")) { _ in cancel() })',
      'stop.accessibilityLabel = "Stop"',
      'progress.contentView = stop',
    );
  } else if (c.child === 'button') {
    lines.push('progress.contentView = UIButton(primaryAction: UIAction(title: "Upload") { _ in upload() })');
  }
  lines.push(
    c.type === 'linear'
      ? 'progress.frame.size = CGSize(width: 240, height: progress.intrinsicContentSize.height)'
      : 'progress.frame.size = progress.intrinsicContentSize',
    'view.addSubview(progress)',
  );
  if (f.value) lines.push(`// progress.value = 0.8 glides to it; nil is indeterminate`);
  return lines.join('\n');
}

function swiftui(c: ProgressConfig): string {
  const f = fields(c);
  const args = [f.value ? 'value: progress' : 'value: nil'];
  if (f.type) args.push(`type: .${f.type}`);
  if (f.variant) args.push(`variant: .${f.variant}`);
  const modifiers: string[] = [];
  if (f.noSmooth) modifiers.push('.smooth(false)');
  if (f.buffer !== undefined) modifiers.push(`.buffer(${f.buffer})`);
  if (f.color) {
    const [r, g, b] = unit(f.color);
    modifiers.push(`.color(Color(red: ${r}, green: ${g}, blue: ${b}))`);
  }
  if (f.thickness !== undefined) modifiers.push(`.thickness(${f.thickness})`);
  if (f.segments !== undefined) modifiers.push(`.segments(${f.segments})`);
  if (f.showLabel) modifiers.push('.showLabel()');
  if (f.size !== undefined) modifiers.push(`.size(${f.size})`);
  const content =
    c.child === 'stop' ? ' {\n    Button(action: cancel) { Image(systemName: "stop.fill") }\n        .accessibilityLabel("Stop")\n}'
    : c.child === 'button' ? ' {\n    Button("Upload", action: upload)\n}'
    : '';
  return `import LoaderKit
import SwiftUI

LoaderKitProgress(${args.join(', ')})${content}${modifiers.map((m) => `\n    ${m}`).join('')}`;
}

function xaml(c: ProgressConfig): string {
  const f = fields(c);
  const attrs: string[] = [];
  if (f.value) attrs.push('Value="{x:Bind ViewModel.Progress, Mode=OneWay}"');
  if (f.type) attrs.push(`Type="${pascal(f.type)}"`);
  if (f.variant) attrs.push(`Variant="${pascal(f.variant)}"`);
  if (f.noSmooth) attrs.push('Smooth="False"');
  if (f.buffer !== undefined) attrs.push(`Buffer="${f.buffer}"`);
  if (f.thickness !== undefined) attrs.push(`Thickness="${f.thickness}"`);
  if (f.segments !== undefined) attrs.push(`Segments="${f.segments}"`);
  if (f.showLabel) attrs.push('ShowLabel="True"');
  if (f.size !== undefined) attrs.push(`Size="${f.size}"`);
  const parts: string[] = [];
  // Color is nullable, which an attribute string cannot set.
  if (f.color) parts.push(`<lk:LoaderKitProgress.Color>\n  <Color>#${upper(f.color)}</Color>\n</lk:LoaderKitProgress.Color>`);
  if (c.child === 'stop') parts.push('<Button Content="Stop" Click="OnCancel" />');
  if (c.child === 'button') parts.push('<Button Content="Upload" Click="OnUpload" />');
  return `<!-- xmlns:lk="using:LoaderKit.WinUI" -->\n${markup('lk:LoaderKitProgress', attrs, parts.length ? parts.join('\n') : null)}`;
}

function csharp(c: ProgressConfig): string {
  const f = fields(c);
  const usings = ['using LoaderKit.WinUI;'];
  if (f.type || f.variant) usings.unshift('using LoaderKit;');
  if (f.color) usings.push('using Microsoft.UI;');
  if (c.child) usings.push('using Microsoft.UI.Xaml.Controls;');
  const lines: string[] = [];
  if (f.value) lines.push(`Value = ${VALUE}, // glides to every new value; null is indeterminate`);
  if (f.type) lines.push(`Type = ProgressType.${pascal(f.type)},`);
  if (f.variant) lines.push(`Variant = ProgressVariant.${pascal(f.variant)},`);
  if (f.noSmooth) lines.push('Smooth = false,');
  if (f.buffer !== undefined) lines.push(`Buffer = ${f.buffer},`);
  if (f.thickness !== undefined) lines.push(`Thickness = ${f.thickness},`);
  if (f.segments !== undefined) lines.push(`Segments = ${f.segments},`);
  if (f.showLabel) lines.push('ShowLabel = true,');
  if (f.size !== undefined) lines.push(`Size = ${f.size},`);
  if (f.color) {
    const [r, g, b] = rgb(f.color);
    lines.push(`Color = ColorHelper.FromArgb(255, ${r}, ${g}, ${b}),`);
  }
  if (c.child === 'stop') lines.push('Child = new Button { Content = "Stop" },');
  if (c.child === 'button') lines.push('Child = new Button { Content = "Upload" },');
  const create = lines.length ? `var progress = new LoaderKitProgress\n{\n    ${lines.join('\n    ')}\n};` : 'var progress = new LoaderKitProgress();';
  return `${usings.join('\n')}\n\n${create}`;
}

function reactNative(c: ProgressConfig): string {
  const imports = ["import { LoaderKitProgress } from 'react-native-loader-kit'; // 5.0 or later"];
  let inner: string | null = null;
  if (c.child === 'stop') {
    imports.unshift("import { Pressable, Text } from 'react-native';");
    inner = '<Pressable accessibilityLabel="Stop" onPress={cancel}>\n  <Text>■</Text>\n</Pressable>';
  } else if (c.child === 'button') {
    imports.unshift("import { Button } from 'react-native';");
    inner = '<Button title="Upload" onPress={upload} />';
  }
  return `${imports.join('\n')}\n\n${markup('LoaderKitProgress', jsxAttrs(fields(c), (n) => n), inner)}`;
}

/** The code of a design on every platform, in the same tabs as the built-in indicators. */
export function progressSnippets(c: ProgressConfig): Snippet[] {
  return [
    { id: 'react', label: 'React', lang: 'tsx', code: react(c) },
    { id: 'vue', label: 'Vue', lang: 'vue', code: vue(c) },
    { id: 'svelte', label: 'Svelte', lang: 'svelte', code: svelte(c) },
    { id: 'web', label: 'HTML', lang: 'html', code: html(c) },
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
