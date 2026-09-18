// Zero-dependency static server for the built Angular app.
// Railpack resolves the start command from package.json "scripts.start", so this
// file (not `ng serve`, and not Railpack's Caddy SPA mode) is what runs in production.
// fly.toml pins PORT=8080.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, 'dist/photo-intake/browser');
const PORT = Number(process.env.PORT) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

async function fileAt(urlPath) {
  // normalize() collapses any ../ before we join, so requests can't escape ROOT.
  const candidate = join(ROOT, normalize(decodeURIComponent(urlPath)));
  if (!candidate.startsWith(ROOT)) return null;
  try {
    const info = await stat(candidate);
    return info.isFile() ? candidate : null;
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' }).end('method not allowed');
    return;
  }

  const urlPath = new URL(req.url, 'http://localhost').pathname;
  // Anything we can't resolve falls back to index.html: it's a single-page app.
  const file = (await fileAt(urlPath)) ?? (await fileAt('/index.html'));

  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not built');
    return;
  }

  const isHashed = /\.[0-9A-Z]{8,}\./i.test(file);
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': isHashed ? 'public, max-age=31536000, immutable' : 'no-cache',
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => console.log(`serving ${ROOT} on :${PORT}`));
