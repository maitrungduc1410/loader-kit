// Builds dist/esm (ES modules) and dist/cjs (CommonJS) from src/.
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..');
const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
const run = (...args: string[]) => execFileSync(process.execPath, [tsc, ...args], { cwd: pkg, stdio: 'inherit' });

rmSync(join(pkg, 'dist'), { recursive: true, force: true });
run('-p', 'tsconfig.build.json', '--outDir', 'dist/esm');
run(
  '-p',
  'tsconfig.build.json',
  '--outDir',
  'dist/cjs',
  '--module',
  'CommonJS',
  '--moduleResolution',
  'Node10',
  '--verbatimModuleSyntax',
  'false'
);
writeFileSync(join(pkg, 'dist/cjs/package.json'), `${JSON.stringify({ type: 'commonjs' })}\n`);
