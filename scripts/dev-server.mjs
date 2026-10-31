// Tiny local harness: serves public/ and routes /mcp and /api/* to the Vercel functions (vercel dev stand-in).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const port = process.env.PORT || 3123;
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'); let p = url.pathname;
  if (p === '/mcp') p = '/api/mcp';
  if (p.startsWith('/api/')) {
    const mod = await import(path.join(root, p + '.js'));
    let raw = ''; for await (const c of req) raw += c;
    req.body = raw ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : undefined;
    req.query = Object.fromEntries(url.searchParams);
    res.status = c => { res.statusCode = c; return res; };
    res.json = o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
    return mod.default(req, res);
  }
  let f = path.join(root, 'public', p === '/' ? 'index.html' : p);
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end('not found'); }
  res.end(fs.readFileSync(f));
}).listen(port, () => console.log(`listening on ${port}`));
