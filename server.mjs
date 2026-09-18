// Production static server for the built app (dist/). No dependencies.
// Listens on 0.0.0.0:$PORT (default 8080, matching fly.toml).
// Only extensionless page routes fall back to index.html; a missing asset
// (e.g. the Stockfish .wasm) is a real 404, never an HTML page.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const PORT = Number(process.env.PORT) || 8080;
const HOST = '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.wasm', '.svg', '.txt']);

// Built files never change while the process runs, so cache reads in memory.
const cache = new Map();

async function load(path) {
  let entry = cache.get(path);
  if (!entry) {
    const info = await stat(path);
    if (!info.isFile()) throw Object.assign(new Error('not a file'), { code: 'ENOENT' });
    const body = await readFile(path);
    const ext = extname(path);
    entry = { body, gzip: COMPRESSIBLE.has(ext) ? gzipSync(body) : null };
    cache.set(path, entry);
  }
  return entry;
}

function resolveSafe(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const full = normalize(join(ROOT, decoded));
  return full === ROOT || full.startsWith(ROOT + sep) ? full : null;
}

async function send(req, res, filePath) {
  const ext = extname(filePath);
  const entry = await load(filePath);
  const headers = {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': filePath.includes(`${sep}assets${sep}`)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
    Vary: 'Accept-Encoding',
  };
  let body = entry.body;
  if (entry.gzip && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
    body = entry.gzip;
    headers['Content-Encoding'] = 'gzip';
  }
  headers['Content-Length'] = body.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
  res.end('Not found\n');
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }
  let pathname;
  try {
    pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  } catch {
    notFound(res);
    return;
  }
  const filePath = resolveSafe(pathname.endsWith('/') ? `${pathname}index.html` : pathname);
  if (!filePath) {
    notFound(res);
    return;
  }
  try {
    await send(req, res, filePath);
  } catch (err) {
    if (err?.code !== 'ENOENT' && err?.code !== 'ENOTDIR') {
      console.error(err);
      if (!res.headersSent) res.writeHead(500);
      res.end();
      return;
    }
    // Page routes (no file extension) get the app shell; assets get a 404.
    if (extname(pathname) === '') {
      try {
        await send(req, res, join(ROOT, 'index.html'));
        return;
      } catch {
        /* fall through */
      }
    }
    notFound(res);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`CHECKMATE CHECK-IN serving ${ROOT} on http://${HOST}:${PORT}`);
});
