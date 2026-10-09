// Compiles svelte/LoaderKit.svelte (or another component of svelte/) with Svelte 5 or Svelte 4 (installed as `svelte4`) and imports the
// result. The component's imports of the built package point at src/ instead, and the runtime
// imports at the browser or server build of the matching Svelte, so no build or bundler is needed.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const web = join(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);

export type SvelteVersion = 4 | 5;
export type Target = 'client' | 'server';

type Exports = Record<string, string | Record<string, string | Record<string, string>>>;

function svelteDir(version: SvelteVersion): string {
  return dirname(require.resolve(`${version === 5 ? 'svelte' : 'svelte4'}/package.json`));
}

/** The file URL of `specifier` ('svelte' or 'svelte/...') for the browser or the server. */
export function svelteModule(version: SvelteVersion, target: Target, specifier: string): string {
  const dir = svelteDir(version);
  const exports = (JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { exports: Exports }).exports;
  const key = specifier === 'svelte' ? '.' : `./${specifier.slice('svelte/'.length)}`;
  let entry: unknown = exports[key];
  // Conditions in the order a bundler for this target would pick them.
  const conditions = target === 'client' ? ['browser', 'import', 'default'] : ['import', 'default'];
  while (entry && typeof entry === 'object') {
    const map = entry as Record<string, unknown>;
    const condition = conditions.find((name) => name in map);
    if (!condition) throw new Error(`no ${target} export for ${specifier}`);
    entry = map[condition];
  }
  if (typeof entry !== 'string') throw new Error(`no export for ${specifier}`);
  return pathToFileURL(join(dir, entry)).href;
}

/** Svelte 5 output always hydrates; Svelte 4 client output hydrates only when compiled `hydratable`. */
export async function compileLoaderKit(
  version: SvelteVersion,
  target: Target,
  { hydratable = false, component = 'LoaderKit' } = {},
): Promise<unknown> {
  const source = readFileSync(join(web, `svelte/${component}.svelte`), 'utf8');
  const compiler = (await import(version === 5 ? 'svelte/compiler' : 'svelte4/compiler')) as {
    compile: (source: string, options: Record<string, unknown>) => { js: { code: string }; warnings: { code: string; message: string }[] };
  };
  const generate = version === 5 ? target : target === 'client' ? 'dom' : 'ssr';
  const options = version === 4 && hydratable ? { generate, hydratable } : { generate };
  const { js, warnings } = compiler.compile(source, { ...options, filename: `${component}.svelte` });
  if (warnings.length > 0) throw new Error(warnings.map((w) => `${w.code}: ${w.message}`).join('\n'));

  const resolve = (specifier: string) => {
    if (specifier.startsWith('../dist/esm/')) return pathToFileURL(join(web, 'src', specifier.slice('../dist/esm/'.length).replace(/\.js$/, '.ts'))).href;
    if (specifier === 'svelte' || specifier.startsWith('svelte/')) return svelteModule(version, target, specifier);
    return specifier;
  };
  const code = js.code.replace(
    /(\bfrom\s+|^import\s+)(['"])([^'"]+)\2/gm,
    (_match, prefix: string, _quote: string, specifier: string) => `${prefix}${JSON.stringify(resolve(specifier))}`,
  );

  // Test files run in parallel processes, so each compiles to a file of its own.
  const out = join(web, 'test/.svelte', `${component}-svelte${version}-${target}${hydratable ? '-hydratable' : ''}-${process.pid}.js`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, code);
  try {
    return ((await import(pathToFileURL(out).href)) as { default: unknown }).default;
  } finally {
    rmSync(out);
  }
}
