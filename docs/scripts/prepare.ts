// Writes the generated files of docs/public before VitePress runs (they are gitignored):
//   schema/v1.json: a copy of spec/schema.json, the public URL of the JSON Schema
//   llms.txt: a short summary of the project with links to the key pages, for LLM tools
//   llms-full.txt: SPEC.md and the English "Writing specs with AI" page in one file
// Usage: node docs/scripts/prepare.ts (run by the docs dev and build scripts)
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = 'https://maitrungduc1410.github.io/loader-kit/';
const repo = 'https://github.com/maitrungduc1410/loader-kit';
const path = (file: string) => fileURLToPath(new URL(`../../${file}`, import.meta.url));

function write(file: string, content: string) {
  mkdirSync(dirname(path(file)), { recursive: true });
  writeFileSync(path(file), content);
}

function read(file: string): string | null {
  return existsSync(path(file)) ? readFileSync(path(file), 'utf8') : null;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function description(page: string): string | undefined {
  const match = FRONTMATTER.exec(read(`docs/${page}`) ?? '');
  const line = match?.[1]?.split(/\r?\n/).find((l) => l.startsWith('description:'));
  return line?.slice('description:'.length).trim().replace(/^(['"])(.*)\1$/, '$2');
}

// ----- JSON Schema -----

if (existsSync(path('spec/schema.json'))) {
  mkdirSync(path('docs/public/schema'), { recursive: true });
  copyFileSync(path('spec/schema.json'), path('docs/public/schema/v1.json'));
} else {
  console.warn('prepare: spec/schema.json is missing, run `npm run generate` to publish schema/v1.json');
}

// ----- llms.txt -----

const sections: [string, [string, string][]][] = [
  [
    'Guide',
    [
      ['guide/index.md', 'What is LoaderKit?'],
      ['guide/getting-started.md', 'Getting started'],
      ['guide/indicators.md', 'Built-in indicators'],
      ['guide/customizing.md', 'Params, colors and size'],
      ['guide/playback.md', 'Playback'],
      ['guide/progress.md', 'Progress indicators'],
      ['guide/faq.md', 'FAQ'],
    ],
  ],
  [
    'Platforms',
    [
      ['platforms/web.md', 'Web'],
      ['platforms/android.md', 'Android'],
      ['platforms/apple.md', 'iOS and macOS'],
      ['platforms/windows.md', 'Windows'],
      ['platforms/react-native.md', 'React Native'],
    ],
  ],
  [
    'Custom indicators (experimental)',
    [
      ['spec/index.md', 'Your first indicator'],
      ['spec/layouts.md', 'Layouts'],
      ['spec/shapes.md', 'Shapes'],
      ['spec/tracks.md', 'Tracks and easing'],
      ['spec/timing.md', 'Timing and stagger'],
      ['spec/params.md', 'Params'],
      ['spec/using.md', 'Loading specs at runtime'],
      ['spec/reference.md', 'Spec reference'],
    ],
  ],
  [
    'Tools',
    [
      ['tools/playground.md', 'Playground'],
      ['tools/json-schema.md', 'JSON Schema'],
      ['tools/ai.md', 'Writing specs with AI'],
    ],
  ],
];

const url = (page: string) => site + page.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '');
const link = ([page, title]: [string, string]) => {
  const text = description(page);
  return `- [${title}](${url(page)})${text ? `: ${text}` : ''}`;
};

const llms = `# LoaderKit

> Loading indicators described as JSON data and rendered natively on Android (View, Jetpack Compose), iOS and macOS (UIKit, AppKit, SwiftUI), Windows (WinUI 3) and the web (React, Vue and Svelte components, a custom element, a canvas class). One spec format, one conformance suite, the same motion everywhere.

LoaderKit ships 50 built-in indicators (BallPulse, BallSpinFadeLoader, LineScale, ...), some with params such as \`count\` and \`minScale\`. A custom indicator is a schema v1 spec: groups of elements placed in a unit box by a layout (single, stack, row, grid, ring), drawn with a shape (circle, rect, ring, triangle, line), and animated by keyframe tracks (scale, opacity, rotate, translate, strokeStart, strokeEnd) with cubic bezier easing and per-element stagger. Writing custom specs is experimental: a minor release may change the schema; built-in names and params are stable.

LoaderKit also ships \`LoaderKitProgress\` (\`<loader-kit-progress>\` on the web): 50 progress designs across 10 types (linear, circular, pie, gauge, liquid, border, bars, grid, battery, hourglass), each with a value in [0, 1] or indeterminate (null), gliding smoothly between values by default. Progress designs are built in, not JSON specs.

Key facts for generating specs:
- Every spec needs \`"schemaVersion": 1\`, a \`name\`, a positive \`duration\` in seconds, a \`layout\`, a \`shape\` and at least one track (or a non-empty \`parts\` list).
- Coordinates are fractions of a unit box, origin top-left, y down. Angles are radians, positive is clockwise.
- Validate with the JSON Schema below, or with \`validate()\` from \`@loader-kit/spec\`.

${sections.map(([title, pages]) => `## ${title}\n\n${pages.map(link).join('\n')}`).join('\n\n')}

## Schema and source

- [JSON Schema v1](${site}schema/v1.json): the schema of a spec, for editors and validators
- [SPEC.md](${repo}/blob/master/SPEC.md): the normative spec that every engine follows
- [GitHub repository](${repo}): source, issues and releases

## Optional

- [llms-full.txt](${site}llms-full.txt): SPEC.md and the guide to writing specs with AI in one file
`;
write('docs/public/llms.txt', llms);

// ----- llms-full.txt -----

const strip = (markdown: string) => markdown.replace(FRONTMATTER, '').trim();
const spec = read('SPEC.md');
const ai = read('docs/tools/ai.md');
const full = [
  `# LoaderKit: full reference for LLM tools\n\nSource: ${site}\nJSON Schema: ${site}schema/v1.json`,
  spec && strip(spec),
  ai && `${strip(ai)}\n\nSource: ${url('tools/ai.md')}`,
]
  .filter(Boolean)
  .join('\n\n---\n\n');
write('docs/public/llms-full.txt', `${full}\n`);

console.log('prepare: wrote schema/v1.json, llms.txt and llms-full.txt to docs/public');
