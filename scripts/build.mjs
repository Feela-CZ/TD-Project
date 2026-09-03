import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const project = resolve(import.meta.dirname, '..');
const source = resolve(project, 'src');
const output = resolve(project, 'dist');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of await readdir(source)) {
  if (!file.endsWith('.ts')) continue;
  const text = await readFile(resolve(source, file), 'utf8');
  // Sources deliberately use runtime-compatible TypeScript (JSDoc types only),
  // so Node's ESM output is a direct, reproducible emit without a dependency.
  await writeFile(resolve(output, file.replace(/\.ts$/, '.mjs')), text.replaceAll('.ts\'', '.mjs\''));
}

console.log(`Built ${output}`);
