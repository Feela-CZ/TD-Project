import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2];
if (!file || process.argv.length !== 3) {
  console.error('Usage: node longhorizon/prepare.mjs TASK.md');
  process.exit(2);
}

const task = readFileSync(resolve(file), 'utf8').trim();
const commit = /^Base commit: `([0-9a-f]{40})`\s*$/m.exec(task)?.[1];
if (!commit) throw new Error('The task must identify an immutable source commit using Base commit: `<40 hex digits>`.');
try {
  execFileSync('git', ['-C', root, 'cat-file', '-e', `${commit}^{commit}`], { stdio: 'ignore' });
} catch {
  throw new Error(`Source commit ${commit} is missing from this clone. Fetch the source branch and retry.`);
}

const gitText = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
let handoffCommit;
try {
  handoffCommit = gitText('rev-parse', '--verify', 'refs/remotes/origin/work-handoff^{commit}');
} catch {
  throw new Error('Missing origin/work-handoff. Fetch origin before preparing the brief.');
}
const handoff = gitText('show', `${handoffCommit}:WORK-HANDOFF.md`);

process.stdout.write(`# Kethra Incursion · LongHorizon brief

Work in the dedicated game checkout at \`${commit}\`. Check the source revision before executing. The task below controls the scope. Use the repository design specification, accepted decisions, and actual code as evidence. The appended handoff is background recorded on coordination commit \`${handoffCommit}\`; verify any facts that matter against the stated source revision.

Work in bounded steps and let the audit review actual artifacts. Record verified results, incomplete items, and the next action separately. Save the agreed output in the task checkout for a fresh session to pick up. Write the final summary in Czech, concisely, with concrete evidence and any decision the owner needs to make.

## Task

${task}

## Project handoff snapshot

${handoff}
`);
