import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

const project = resolve(import.meta.dirname, '..');
const fromProject = path => relative(project, path).split(sep).join('/');
const imports = {};
const visited = new Set();
// Dependency-free packaging for the current static, relative ESM graph.
const moduleImport = /^(?:(?:import|export)\s+[^;\n]*?\bfrom\s+|import\s+)(['"])(\.\.?\/[^'"]+)\1/gm;

async function include(file) {
  const key = `kethra/${fromProject(file)}`;
  if (visited.has(file)) return key;
  visited.add(file);
  let text = await readFile(file, 'utf8');
  for (const match of [...text.matchAll(moduleImport)]) {
    const dependency = await include(resolve(dirname(file), match[2]));
    text = text.replace(match[0], match[0].replace(match[2], dependency));
  }
  imports[key] = `data:text/javascript;base64,${Buffer.from(text, 'utf8').toString('base64')}`;
  return key;
}

const entry = await include(resolve(project, 'web', 'app.mjs'));
const [template, style, mobile] = await Promise.all(['index.html', 'style.css', 'mobile.css'].map(name => readFile(resolve(project, 'web', name), 'utf8')));
const document = template
  .replace('    <link rel="stylesheet" href="style.css">\n    <link rel="stylesheet" href="mobile.css">', `    <style>\n${style}\n${mobile}\n    </style>`)
  .replace('<script type="module" src="app.mjs"></script>', `<script type="importmap">${JSON.stringify({ imports })}</script>\n    <script type="module">import "${entry}";</script>`);
const destination = resolve(process.argv[2] || 'release-web/Kethra_Incursion_Playtest.html');
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, document, 'utf8');
console.log(`Standalone playtest: ${destination}`);
