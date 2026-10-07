import type { IndicatorSpec } from '@loader-kit/spec';

const files = import.meta.glob<string>('../../../examples/*.json', {
  eager: true,
  query: '?raw',
  import: 'default',
});

/** The example specs of `docs/examples/<id>.json`, as written (the playground shows the source). */
export const EXAMPLES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(files)
    .map(([path, source]) => [path.slice(path.lastIndexOf('/') + 1, -'.json'.length), source] as const)
    .sort(([a], [b]) => a.localeCompare(b)),
);

export const EXAMPLE_IDS = Object.keys(EXAMPLES);

export function exampleSpec(id: string): IndicatorSpec | null {
  const source = EXAMPLES[id];
  if (source === undefined) return null;
  try {
    return JSON.parse(source) as IndicatorSpec;
  } catch {
    return null;
  }
}

/** The `name` of an example, for menus; falls back to the id. */
export function exampleName(id: string): string {
  const name = (exampleSpec(id) as { name?: unknown } | null)?.name;
  return typeof name === 'string' && name.length > 0 ? name : id;
}
