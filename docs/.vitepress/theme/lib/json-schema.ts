// Just enough of JSON Schema draft-07 to drive editor hints: $ref into `definitions`, anyOf, oneOf,
// allOf, properties, additionalProperties, items, enum and const. Variants of a oneOf are told
// apart by their `type` const, the way the LoaderKit schema writes layouts and shapes.

export type JsonSchema = { readonly [keyword: string]: unknown };

/** One step from the root of the document: an object key or an array index. */
export interface PathStep {
  key: string | number;
  /** Value of the `type` field of the object that holds `key`, when it has one. */
  discriminator?: string;
}

export interface ValueHint {
  label: string;
  /** JSON text to insert. */
  insert: string;
  detail?: string;
}

const isSchema = (value: unknown): value is JsonSchema =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export class SchemaIndex {
  readonly root: JsonSchema;

  constructor(root: JsonSchema) {
    this.root = root;
  }

  resolve(schema: JsonSchema, depth = 0): JsonSchema {
    const ref = schema.$ref;
    if (typeof ref !== 'string' || depth > 16) return schema;
    const target = ref
      .replace(/^#\/?/, '')
      .split('/')
      .filter(Boolean)
      .reduce<unknown>((node, part) => (isSchema(node) ? node[part.replace(/~1/g, '/').replace(/~0/g, '~')] : undefined), this.root);
    return isSchema(target) ? this.resolve(target, depth + 1) : {};
  }

  /** The concrete alternatives of a schema, with combinators flattened. */
  branches(schema: JsonSchema, depth = 0): JsonSchema[] {
    const resolved = this.resolve(schema);
    if (depth > 16) return [resolved];
    const nested = (['anyOf', 'oneOf', 'allOf'] as const).flatMap((keyword) => {
      const list = resolved[keyword];
      return Array.isArray(list) ? list.filter(isSchema).flatMap((item) => this.branches(item, depth + 1)) : [];
    });
    return nested.length > 0 ? [resolved, ...nested] : [resolved];
  }

  /** Schemas that describe the value at `path`, before flattening (so their descriptions survive). */
  at(path: readonly PathStep[]): JsonSchema[] {
    let current: JsonSchema[] = [this.root];
    for (const step of path) {
      const next: JsonSchema[] = [];
      for (const candidate of current.flatMap((schema) => this.branches(schema))) {
        if (!matchesDiscriminator(candidate, step.discriminator)) continue;
        const child = typeof step.key === 'number' ? itemSchema(candidate, step.key) : propertySchema(candidate, step.key);
        if (child) next.push(this.resolve(child));
      }
      if (next.length === 0) return [];
      current = next;
    }
    return current;
  }

  /** Properties an object at `path` may have, with the schema of each. */
  properties(path: readonly PathStep[], discriminator?: string): Map<string, JsonSchema> {
    const result = new Map<string, JsonSchema>();
    for (const candidate of this.at(path).flatMap((schema) => this.branches(schema))) {
      if (!matchesDiscriminator(candidate, discriminator)) continue;
      if (!isSchema(candidate.properties)) continue;
      for (const [name, schema] of Object.entries(candidate.properties)) {
        if (isSchema(schema) && !result.has(name)) result.set(name, schema);
      }
    }
    return result;
  }

  /** True when an object at `path` accepts names of its own choosing, like `params`. */
  allowsAnyProperty(path: readonly PathStep[]): boolean {
    return this.at(path)
      .flatMap((schema) => this.branches(schema))
      .filter((schema) => schema.type === 'object' || isSchema(schema.properties))
      .some((schema) => schema.additionalProperties !== false);
  }

  description(schemas: readonly JsonSchema[]): string | undefined {
    for (const schema of schemas) {
      if (typeof schema.description === 'string') return schema.description;
    }
    for (const schema of schemas.flatMap((item) => this.branches(item))) {
      if (typeof schema.description === 'string') return schema.description;
    }
    return undefined;
  }

  /** A short type summary such as `number | { "$param": string }`. */
  summary(schemas: readonly JsonSchema[]): string {
    const parts = new Set<string>();
    for (const schema of schemas.flatMap((item) => this.branches(item))) {
      if ('const' in schema) parts.add(JSON.stringify(schema.const));
      else if (Array.isArray(schema.enum)) schema.enum.forEach((value) => parts.add(JSON.stringify(value)));
      else if (isSchema(schema.properties) && '$param' in schema.properties) parts.add('{ "$param": string }');
      else if (typeof schema.type === 'string') parts.add(schema.type);
    }
    return [...parts].join(' | ');
  }

  /** Values worth suggesting at `path`: enum members, consts and booleans. */
  values(path: readonly PathStep[]): ValueHint[] {
    const hints = new Map<string, ValueHint>();
    for (const schema of this.at(path).flatMap((item) => this.branches(item))) {
      if ('const' in schema) {
        const insert = JSON.stringify(schema.const);
        hints.set(insert, { label: insert, insert });
      }
      if (Array.isArray(schema.enum)) {
        for (const value of schema.enum) {
          const insert = JSON.stringify(value);
          hints.set(insert, { label: insert, insert });
        }
      }
      if (schema.type === 'boolean') {
        hints.set('true', { label: 'true', insert: 'true' });
        hints.set('false', { label: 'false', insert: 'false' });
      }
      if (isSchema(schema.properties) && '$param' in schema.properties) {
        hints.set('$param', { label: '{ "$param": … }', insert: '{ "$param": "" }', detail: 'param' });
      }
    }
    return [...hints.values()];
  }
}

function matchesDiscriminator(schema: JsonSchema, discriminator: string | undefined): boolean {
  if (discriminator === undefined || !isSchema(schema.properties)) return true;
  const type = schema.properties.type;
  return !(isSchema(type) && 'const' in type && type.const !== discriminator);
}

function propertySchema(schema: JsonSchema, key: string): JsonSchema | undefined {
  if (isSchema(schema.properties) && isSchema(schema.properties[key])) return schema.properties[key];
  if (isSchema(schema.additionalProperties)) return schema.additionalProperties;
  return undefined;
}

function itemSchema(schema: JsonSchema, index: number): JsonSchema | undefined {
  if (Array.isArray(schema.items)) {
    const item: unknown = schema.items[index];
    return isSchema(item) ? item : undefined;
  }
  return isSchema(schema.items) ? schema.items : undefined;
}