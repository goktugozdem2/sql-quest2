// Local stand-in for the Vercel routing layer, so the /u/:handle share card
// can be verified without `vercel dev` or a deploy.
//
// `npm run dev` (npx serve public) serves static files only — it does not run
// anything in api/, so the two routes that make a shared profile unfurl are
// invisible locally. That is exactly how the SVG-og:image bug survived: the
// card generator was deployed and "working", and nothing in the local loop
// ever looked at what a scraper would actually receive.
//
// Implements the same two rules as vercel.json:
//   /u/(.*)        → api/u.js        (?handle=$1)
//   /api/og-card   → api/og-card.js
// Everything else falls through to public/.
//
// Run: node scripts/dev-og-server.mjs [port]
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || 4322);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.ico': 'image/x-icon',
};

// Minimal shim of the (req, res) shape Vercel's Node runtime hands a handler.
function shim(req, res, query) {
  return [
    { ...req, query },
    {
      setHeader: (k, v) => res.setHeader(k, v),
      status(code) { this._code = code; return this; },
      send(body) { res.writeHead(this._code || 200); res.end(body); return this; },
      end() { res.writeHead(this._code || 200); res.end(); return this; },
    },
  ];
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    const u = /^\/u\/(.*)$/.exec(pathname);
    if (u) {
      const { default: handler } = await import('../api/u.js');
      const [rq, rs] = shim(req, res, { handle: u[1] });
      return void (await handler(rq, rs));
    }
    if (pathname === '/api/og-card') {
      const { default: handler } = await import('../api/og-card.js');
      const [rq, rs] = shim(req, res, { handle: url.searchParams.get('handle') || '' });
      return void (await handler(rq, rs));
    }
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    return void res.end(`handler error: ${e.stack}`);
  }

  // Static fallthrough, mirroring cleanUrls + trailingSlash.
  let rel = pathname.replace(/^\/+/, '');
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  let file = path.join(ROOT, 'public', rel);
  if (!file.startsWith(path.join(ROOT, 'public'))) {
    res.writeHead(403); return void res.end('nope');
  }
  if (!fs.existsSync(file) && fs.existsSync(`${file}.html`)) file = `${file}.html`;
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }); return void res.end('404');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log(`og dev server → http://localhost:${PORT}`);
  console.log(`  profile page : http://localhost:${PORT}/u/elena/`);
  console.log(`  card (PNG)   : http://localhost:${PORT}/api/og-card?handle=elena`);
});
