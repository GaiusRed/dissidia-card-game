import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';

const roots = {
  A: resolve('test-results/release-build-a'),
  B: resolve('test-results/release-build-b'),
};
let activeBuild = 'A';
const types = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  if (url.pathname === '/__test/build') {
    response.writeHead(200, { 'content-type': 'text/plain' }).end(activeBuild);
    return;
  }
  if (url.pathname === '/__test/switch' && request.method === 'POST') {
    const build = url.searchParams.get('build');
    if (build !== 'A' && build !== 'B') {
      response.writeHead(400).end('Build must be A or B.');
      return;
    }
    activeBuild = build;
    response.writeHead(204).end();
    return;
  }

  const root = roots[activeBuild];
  const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  let file = resolve(root, relativePath || 'index.html');
  if (file !== root && !file.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end('Forbidden.');
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, 'index.html');
  if (!existsSync(file) && !extname(relativePath)) file = resolve(root, 'index.html');
  if (!existsSync(file) || !file.startsWith(`${root}${sep}`)) {
    response.writeHead(404).end('Not found.');
    return;
  }
  response.writeHead(200, {
    'content-type': types[extname(file)] ?? 'application/octet-stream',
    'cache-control': file.endsWith('sw.js') ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  createReadStream(file).pipe(response);
}).listen(4174, '127.0.0.1', () => console.log('Release test server ready at http://127.0.0.1:4174'));
