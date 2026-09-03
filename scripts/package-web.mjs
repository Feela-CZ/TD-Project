import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const project = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(project, 'release-web');
const output = join(outputRoot, 'Tower Defense Alpha');

await rm(outputRoot, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(join(project, 'web'), join(output, 'web'), { recursive: true });
await cp(join(project, 'dist'), join(output, 'dist'), { recursive: true });
await writeFile(join(output, 'Start Tower Defense Alpha.html'), '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=web/index.html"><title>Opening Tower Defense Alpha…</title><p>Opening <a href="web/index.html">Tower Defense Alpha</a>…</p>', 'utf8');
await writeFile(join(output, 'Start Tower Defense Alpha.cmd'), `@echo off\r\nset "APP_ROOT=%~dp0"\r\nset "EDGE=%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"\r\nif not exist "%EDGE%" set "EDGE=%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe"\r\nif not exist "%EDGE%" (\r\n  start "" "%APP_ROOT%web\\index.html"\r\n  exit /b\r\n)\r\nstart "" "%EDGE%" --user-data-dir="%TEMP%\\TowerDefenseAlpha" --allow-file-access-from-files "%APP_ROOT%web\\index.html"\r\n`, 'utf8');
await writeFile(join(output, 'README.txt'), `TOWER DEFENSE — PORTABLE ALPHA\r\n\r\n1. Extract this entire folder anywhere on your computer.\r\n2. Double-click \"Start Tower Defense Alpha.cmd\".\r\n3. The game opens in a separate local Edge window.\r\n\r\nNo account, installation, internet connection, or data collection is required.\r\n\r\nThis is an early closed-test build. Please report the wave reached, build choices, and anything confusing or broken.\r\n`, 'utf8');
console.log(`Portable web alpha prepared in ${output}`);
