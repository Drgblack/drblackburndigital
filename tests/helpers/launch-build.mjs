import assert from 'node:assert/strict';
import { mkdir, mkdtemp, cp, rm, readdir, readFile, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import path from 'node:path';

export async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(file)); else result.push(file);
  }
  return result;
}

export async function withLaunchBuild(run) {
  const parent = path.resolve('artifacts');
  await mkdir(parent, { recursive: true });
  const workspace = await mkdtemp(path.join(parent, 'launch-test-'));
  try {
    await mkdir(path.join(workspace, 'scripts'));
    for (const directory of ['src', 'assets']) await cp(directory, path.join(workspace, directory), { recursive: true });
    for (const file of ['scripts/build.mjs', 'scripts/assert-launch-output.mjs', 'favicon.ico', 'apple-touch-icon.png']) await cp(file, path.join(workspace, file));
    const build = async ({ flag, environment = 'production', preview = false } = {}) => {
      const env = { ...process.env, VERCEL_ENV: environment };
      delete env.SHOW_MEDICALGERMAN;
      if (flag !== undefined) env.SHOW_MEDICALGERMAN = flag;
      await promisify(execFile)(process.execPath, ['scripts/build.mjs', ...(preview ? ['--preview'] : [])], { cwd: workspace, env });
      return path.join(workspace, preview ? 'preview-dist' : 'dist');
    };
    return await run({ workspace, build });
  } finally {
    assert.equal(path.dirname(path.resolve(workspace)), parent);
    assert.ok(path.basename(workspace).startsWith('launch-test-'));
    await rm(workspace, { recursive: true, force: true });
  }
}

// An ephemeral static server for the isolated build. Never sends mail.
export async function serveBuild(root) {
  const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json' };
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname === '/api/contact/') {
        res.writeHead(req.method === 'GET' ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(req.method === 'GET' ? { enabled: false } : { ok: false }));
        return;
      }
      let target = path.resolve(root, `.${pathname}`);
      if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
      if ((await stat(target).catch(() => null))?.isDirectory()) {
        if (!pathname.endsWith('/')) { res.writeHead(308, { Location: `${pathname}/` }); res.end(); return; }
        target = path.join(target, 'index.html');
      }
      const data = await readFile(target).catch(() => null);
      res.writeHead(data ? 200 : 404, { 'Content-Type': data ? mime[path.extname(target)] || 'application/octet-stream' : mime['.html'] });
      res.end(data || await readFile(path.join(root, '404.html')));
    } catch { res.writeHead(400); res.end('Bad request'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeAllConnections(); })
  };
}
