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

const pascal = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function webAttributes(d: ProgressDesign, value: string, attr: (name: string, v: string, literal: boolean) => string): string[] {
  const out: string[] = [];
  if (!d.indeterminate) out.push(attr('value', value, true));
  if (d.buffer) out.push(attr('buffer', '0.6', true));
  if (d.type !== 'circular') out.push(attr('type', d.type, false));
  if (d.variant) out.push(attr('variant', d.variant, false));
  if (d.thickness !== undefined) out.push(attr('thickness', String(d.thickness), true));
  if (d.segments !== undefined) out.push(attr('segments', String(d.segments), true));
  if (d.showLabel) out.push(attr('show-label', 'true', true));
  if (d.size !== undefined) out.push(attr('size', String(d.size), true));
  return out;
}

function html(d: ProgressDesign): string {
  const attrs = webAttributes(d, '0.4', (name, v) => `${name}="${v}"`);
  const open = `<loader-kit-progress${attrs.length ? ' ' + attrs.join(' ') : ''}>`;
  const inner = d.child === 'stop' ? '<button aria-label="Stop">■</button>' : d.child === 'button' ? '<button>Upload</button>' : '';
  return `<script type="module">\n  import '@loader-kit/web/progress-element';\n</script>\n\n${open}${inner}</loader-kit-progress>`;
}

function react(d: ProgressDesign): string {
  const camel = (name: string) => name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
  const attrs = webAttributes(d, 'progress', (name, v, literal) => {
    if (name === 'show-label') return 'showLabel';
    return literal ? `${camel(name)}={${v}}` : `${camel(name)}="${v}"`;
  });
  const props = attrs.length ? ' ' + attrs.join(' ') : '';
  const inner = d.child === 'stop' ? '<button aria-label="Stop" onClick={cancel}>■</button>' : d.child === 'button' ? '<button>Upload</button>' : '';
  const tag = inner ? `<LoaderKitProgress${props}>${inner}</LoaderKitProgress>` : `<LoaderKitProgress${props} />`;
  return `import { LoaderKitProgress } from '@loader-kit/web/react';\n\n${tag}`;
}

function compose(d: ProgressDesign): string {
  const args = [d.indeterminate ? 'value = null' : 'value = progress'];
  if (d.type !== 'circular') args.push(`type = ProgressType.${pascal(d.type)}`);
  if (d.variant) args.push(`variant = ProgressVariant.${pascal(d.variant)}`);
  if (d.buffer) args.push('buffer = 0.6');
  if (d.thickness !== undefined) args.push(`thickness = ${d.thickness}.dp`);
  if (d.segments !== undefined) args.push(`segments = ${d.segments}`);
  if (d.showLabel) args.push('showLabel = true');
  if (d.size !== undefined) args.push(`size = ${d.size}.dp`);
  if (d.type === 'linear') args.splice(1, 0, 'modifier = Modifier.fillMaxWidth()');
  const call = `LoaderKitProgress(\n    ${args.join(',\n    ')},\n)`;
  if (d.child === 'stop') return `${call} {\n    IconButton(onClick = cancel) { Icon(Icons.Filled.Stop, contentDescription = "Stop") }\n}`;
  if (d.child === 'button') return `${call} {\n    Button(onClick = upload) { Text("Upload") }\n}`;
  return call;
}

function swiftUI(d: ProgressDesign): string {
  const args = [d.indeterminate ? 'value: nil' : 'value: progress'];
  if (d.type !== 'circular') args.push(`type: .${d.type}`);
  if (d.variant) args.push(`variant: .${d.variant}`);
  const modifiers: string[] = [];
  if (d.buffer) modifiers.push('.buffer(0.6)');
  if (d.thickness !== undefined) modifiers.push(`.thickness(${d.thickness})`);
  if (d.segments !== undefined) modifiers.push(`.segments(${d.segments})`);
  if (d.showLabel) modifiers.push('.showLabel()');
  if (d.size !== undefined) modifiers.push(`.size(${d.size})`);
  const content =
    d.child === 'stop' ? ' {\n    Button(action: cancel) { Image(systemName: "stop.fill") }\n}'
    : d.child === 'button' ? ' {\n    Button("Upload", action: upload)\n}'
    : '';
  return `LoaderKitProgress(${args.join(', ')})${content}${modifiers.map((m) => `\n    ${m}`).join('')}`;
}

function xaml(d: ProgressDesign): string {
  const attrs: string[] = [];
  if (!d.indeterminate) attrs.push('Value="{x:Bind ViewModel.Progress, Mode=OneWay}"');
  if (d.type !== 'circular') attrs.push(`Type="${pascal(d.type)}"`);
  if (d.variant) attrs.push(`Variant="${pascal(d.variant)}"`);
  if (d.buffer) attrs.push('Buffer="0.6"');
  if (d.thickness !== undefined) attrs.push(`Thickness="${d.thickness}"`);
  if (d.segments !== undefined) attrs.push(`Segments="${d.segments}"`);
  if (d.showLabel) attrs.push('ShowLabel="True"');
  if (d.size !== undefined) attrs.push(`Size="${d.size}"`);
  const open = `<lk:LoaderKitProgress${attrs.length ? ' ' + attrs.join(' ') : ''}`;
  if (d.child === 'stop') return `${open}>\n    <Button Content="Stop" Click="OnCancel" />\n</lk:LoaderKitProgress>`;
  if (d.child === 'button') return `${open}>\n    <Button Content="Upload" Click="OnUpload" />\n</lk:LoaderKitProgress>`;
  return `${open} />`;
}

export function progressSnippets(d: ProgressDesign): Snippet[] {
  return [
    { id: 'html', label: 'HTML', lang: 'html', code: html(d) },
    { id: 'react', label: 'React', lang: 'tsx', code: react(d) },
    { id: 'compose', label: 'Compose', lang: 'kotlin', code: compose(d) },
    { id: 'swiftui', label: 'SwiftUI', lang: 'swift', code: swiftUI(d) },
    { id: 'xaml', label: 'XAML', lang: 'xml', code: xaml(d) },
  ];
}
