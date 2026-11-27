import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const project = resolve(import.meta.dirname, '..');
const requestedPort = Number(process.argv.find((argument) => argument.startsWith('--port='))?.split('=')[1] ?? process.env.TD_PORT ?? 4173);
const initialPort = Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort < 65536 ? requestedPort : 4173;
const types = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.webp': 'image/webp' };

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  if (pathname === '/' || pathname === '/web') {
    response.writeHead(302, { Location: '/web/' }).end();
    return;
  }
  const relative = pathname === '/web/' ? 'web/index.html' : pathname.replace(/^\/+/, '');
  const file = resolve(project, relative);
  if (!file.startsWith(`${project}${sep}`)) {
    response.writeHead(403).end();
    return;
  }
  try {
    if (!(await stat(file)).isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    if (request.method === 'HEAD') response.end();
    else {
      const stream = createReadStream(file);
      stream.on('error', () => response.destroy());
      stream.pipe(response);
    }
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});

function listen(port, attemptsLeft = 10) {
  /** @param {Error & { code?: string }} error */
  const onError = (error) => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 0 && port < 65535) {
      listen(port + 1, attemptsLeft - 1);
      return;
    }
    console.error(`Unable to start Tower Defense alpha on 127.0.0.1:${port}: ${error.message}`);
    process.exitCode = 1;
  };
  server.once('error', onError);
  server.listen(port, '127.0.0.1', () => {
    server.removeListener('error', onError);
    console.log(`Tower Defense alpha: http://127.0.0.1:${port}`);
    console.log('Stop with Ctrl+C when finished.');
  });
}

listen(initialPort);
