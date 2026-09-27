import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContactHandler } from '../server/contact.mjs';

const future = process.argv.includes('--preview');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', future ? 'preview-dist' : 'dist');
const port = future ? 4174 : 4173;
const localContact = createContactHandler({ env: {} });
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json' };
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/api/contact/' || pathname === '/api/contact') return await localContact(req, res);
    if (pathname === '/__social/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' });
      res.end(await readFile(path.resolve(root, '../src/social-card.html')));
      return;
    }
    let target = path.resolve(root, `.${pathname}`);
    if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    const info = await stat(target).catch(() => null);
    if (info?.isDirectory()) {
      if (!pathname.endsWith('/')) { res.writeHead(308, { Location: `${pathname}/` }); res.end(); return; }
      target = path.join(target, 'index.html');
    }
    const data = await readFile(target).catch(() => null);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (!data) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(await readFile(path.join(root, '404.html'))); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(400); res.end('Bad request'); }
}).listen(port, '127.0.0.1', () => console.log(`${future ? 'Local preview' : 'Pre-acquisition site'}: http://127.0.0.1:${port}`));
