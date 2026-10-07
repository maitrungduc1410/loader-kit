// Prints the release notes of one version: the CHANGELOG.md sections of every package for that
// version, merged by change type. An entry shared by several packages is printed once.
// Usage: node scripts/release-notes.mjs 1.2.3
import { existsSync, readFileSync } from 'node:fs';

const PACKAGES = ['spec', 'web', 'android', 'apple', 'windows'];
const ORDER = ['Major Changes', 'Minor Changes', 'Patch Changes'];

const version = process.argv[2];
if (!version) {
  console.error('usage: node scripts/release-notes.mjs <version>');
  process.exit(2);
}

/** @type {Map<string, string[]>} */
const groups = new Map();
let found = false;

for (const pkg of PACKAGES) {
  const file = new URL(`../${pkg}/CHANGELOG.md`, import.meta.url);
  if (!existsSync(file)) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  const start = lines.findIndex((line) => /^##\s+\[?v?([^\s\]]+)/.exec(line)?.[1] === version);
  if (start === -1) continue;
  found = true;
  let end = lines.findIndex((line, i) => i > start && /^##\s/.test(line));
  if (end === -1) end = lines.length;

  let heading = 'Changes';
  let entry = null;
  const flush = () => {
    if (entry === null) return;
    const text = entry.join('\n').trimEnd();
    const list = groups.get(heading) ?? [];
    if (!list.includes(text)) list.push(text);
    groups.set(heading, list);
    entry = null;
  };
  for (const line of lines.slice(start + 1, end)) {
    const match = /^###\s+(.+)/.exec(line);
    if (match) {
      flush();
      heading = match[1].trim();
    } else if (line.startsWith('- ')) {
      flush();
      entry = [line];
    } else if (entry !== null && (line.startsWith('  ') || line === '')) {
      entry.push(line);
    }
  }
  flush();
}

if (!found) {
  console.error(`No CHANGELOG.md has a section for ${version}`);
  process.exit(1);
}

const headings = [...groups.keys()].sort((a, b) => {
  const rank = (heading) => (ORDER.includes(heading) ? ORDER.indexOf(heading) : ORDER.length);
  return rank(a) - rank(b);
});
let notes = headings.map((heading) => `### ${heading}\n\n${groups.get(heading).join('\n')}`).join('\n\n');

// Links relative to the repository root would resolve against the releases page.
const repository = process.env.GITHUB_REPOSITORY;
if (repository) {
  const base = `https://github.com/${repository}/blob/${version}/`;
  notes = notes.replace(/\]\((?![a-z][a-z0-9+.-]*:|#|\/)([^)\s]+)\)/gi, `](${base}$1)`);
}
console.log(notes);
