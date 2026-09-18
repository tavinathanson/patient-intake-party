// A convenience static-file host. All game logic and case data stay in the browser.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const publicDir = fileURLToPath(new URL('./public/', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

export function createApp() {
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache');
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end('Method not allowed');
      return;
    }
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://static.local').pathname);
      const file = resolve(publicDir, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!file.startsWith(publicDir.endsWith(sep) ? publicDir : publicDir + sep) || !types[extname(file)]) {
        res.writeHead(404); res.end('Not found'); return;
      }
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': types[extname(file)] });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404); res.end('Not found');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT) || 4317;
  const server = createApp();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '0.0.0.0', () => console.log(`Intake Investigations → http://localhost:${port}\nStatic files only · all deductions happen in your browser`));
}
