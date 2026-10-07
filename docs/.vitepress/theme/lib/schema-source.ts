import { type JsonSchema, SchemaIndex } from './json-schema.ts';

// A glob, not an import, so the site still builds before spec/schema.json is generated.
const loaders = import.meta.glob<JsonSchema>('../../../../spec/schema.json', { import: 'default' });

/** The JSON Schema of `spec/schema.json`, or null when the repository has not generated it. */
export async function loadSchema(): Promise<SchemaIndex | null> {
  const load = Object.values(loaders)[0];
  if (!load) return null;
  try {
    return new SchemaIndex(await load());
  } catch {
    return null;
  }
}
