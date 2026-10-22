import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat, mkdir, mkdtemp, cp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { getPages, origin, profiles } from '../src/pages.mjs';

async function files(dir) {
  const list = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) list.push(...await files(full)); else list.push(full);
  }
  return list;
}
const roots = ['dist', 'preview-dist'];

test('every generated footer uses the approved legal labels and language routes', async () => {
  for (const root of roots) for (const file of (await files(root)).filter(p => p.endsWith('.html'))) {
    const html = await readFile(file, 'utf8');
    const footer = html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0];
    assert.ok(footer, `Missing footer: ${file}`);
    assert.doesNotMatch(footer, /draft|entwurf/i, file);
    const de = html.includes('<html lang="de">');
    const legalLinks = de
      ? [['/de/impressum/', 'Impressum'], ['/de/datenschutz/', 'Datenschutz']]
      : [['/impressum/', 'Impressum'], ['/privacy/', 'Privacy']];
    for (const [href, label] of legalLinks) {
      assert.ok(footer.includes(`<a href="${href}">${label}</a>`), `${file}: expected ${label} linking to ${href}`);
    }
  }
});

test('public builds contain no server mail configuration or server dependencies', async () => {
  for (const root of roots) for (const file of await files(root)) {
    assert.doesNotMatch(file, /(?:^|[\\/])(?:server|node_modules|\.env)(?:[\\/]|$)/);
    if (/\.(html|js|json|txt)$/.test(file)) {
      assert.doesNotMatch(await readFile(file, 'utf8'), /GOOGLE_WORKSPACE_APP_PASSWORD|CONTACT_RATE_LIMIT_KEY_SECRET|process\.env|smtp\.gmail\.com|@vercel\/firewall|nodemailer/);
    }
  }
});

test('external links have new-tab safeguards and cues; mail links only display the email address', async () => {
  for (const root of roots) for (const file of (await files(root)).filter(p => p.endsWith('.html'))) {
    const html = await readFile(file, 'utf8');
    for (const [, attrs, body] of html.matchAll(/<a\b([^>]+)>([\s\S]*?)<\/a>/g)) {
      if (/href="https?:/.test(attrs)) {
        assert.match(attrs, /target="_blank"/); assert.match(attrs, /rel="noopener noreferrer"/);
        assert.match(body, html.includes('<html lang="de">') ? /öffnet in einem neuen Tab/ : /opens in a new tab/); assert.match(body, /↗/);
      }
      if (/href="mailto:/.test(attrs)) {
        assert.doesNotMatch(attrs, /class="[^"]*button/);
        assert.match(body.replaceAll('<wbr>', ''), /info@drblackburndigital.com/);
      }
    }
    assert.doesNotMatch(html, /GOOGLE_WORKSPACE_APP_PASSWORD/);
  }
});

test('default deployment output contains no unpublished product routes or assets', async () => {
  for (const file of await files('dist')) {
    assert.doesNotMatch(file, /unpublished-product/i);
    if (/\.(html|xml|json|txt)$/.test(file)) assert.doesNotMatch(await readFile(file, 'utf8'), /Owner &amp; CEO/i, file);
  }
  const config = JSON.parse(await readFile('vercel.json', 'utf8'));
  assert.equal(config.outputDirectory, 'dist');
  assert.equal(config.buildCommand, 'npm run build');
});

test('every local preview page is labelled and noindexed; robots and sitemap exclude it', async () => {
  for (const file of (await files('preview-dist')).filter(p => p.endsWith('.html'))) {
    const html = await readFile(file, 'utf8');
    assert.match(html, /LOCAL PREVIEW — NOT FOR PUBLICATION/);
    assert.match(html, /name="robots" content="noindex, nofollow"/);
  }
  assert.match(await readFile('preview-dist/robots.txt', 'utf8'), /Disallow: \//);
  assert.doesNotMatch(await readFile('preview-dist/sitemap.xml', 'utf8'), /<loc>/);
  assert.equal(await stat('preview-dist/portfolio/unpublished-product/index.html').catch(() => null), null);
});

test('internal links, anchors and asset references resolve in both builds', async () => {
  for (const root of roots) for (const file of (await files(root)).filter(p => p.endsWith('.html'))) {
    const html = await readFile(file, 'utf8');
    for (const [, ref] of html.matchAll(/(?:href|src)="([^\"]+)"/g)) {
      if (!ref.startsWith('/') && !ref.startsWith('#')) continue;
      const url = new URL(ref, 'https://local.test/');
      const pathname = ref.startsWith('#') ? '' : url.pathname;
      const fragment = url.hash.slice(1);
      const target = pathname ? path.join(root, pathname, pathname.endsWith('/') ? 'index.html' : '') : file;
      assert.ok(await stat(target).catch(() => null), `${file}: missing ${ref}`);
      if (fragment) assert.ok((await readFile(target, 'utf8')).includes(`id="${fragment}"`), `${file}: missing anchor ${ref}`);
    }
  }
});

test('each page has one heading, canonical, unique metadata and valid linked entity data', async () => {
  for (const root of roots) {
    const titles = new Set();
    const descriptions = new Set();
    for (const p of getPages()) {
      const html = await readFile(path.join(root, p.path, 'index.html'), 'utf8');
      assert.doesNotMatch(html, /i\.G\.|in formation|in Gründung|registration pending|Eintragung ausstehend/i, `Outdated registration status on ${p.path}`);
      assert.equal([...html.matchAll(/<h1(?:\s|>)/g)].length, 1, p.path);
      assert.ok(html.includes(`rel="canonical" href="${origin}${p.path}"`));
      assert.ok(html.includes(`name="robots" content="${root === 'preview-dist' || p.noindex ? 'noindex, nofollow' : 'index, follow'}"`));
      assert.ok(!titles.has(p.title), p.title); titles.add(p.title);
      assert.ok(!descriptions.has(p.description), p.description); descriptions.add(p.description);
      const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
      const org = schema['@graph'].find(e => e['@type'] === 'Organization');
      assert.equal(org.legalName, 'Dr. Blackburn Digital GmbH');
      const person = schema['@graph'].find(e => e['@type'] === 'Person');
      if (org.founder) assert.equal(org.founder['@id'], person['@id']);
      if (person) assert.equal(person.worksFor['@id'], org['@id']);
      if (p.profile) {
        assert.deepEqual(person.sameAs, profiles.map(([url]) => url));
        assert.equal(schema['@graph'].find(e => e['@type'] === 'ProfilePage').mainEntity['@id'], person['@id']);
      } else if (person) assert.equal(person.sameAs, undefined);
      assert.equal(Boolean(org.owns), false);
      assert.equal(org.address?.streetAddress, undefined);
      if (p.path === '/') {
        assert.equal(org.alternateName, 'DBD');
        assert.equal(org.contactPoint.email, 'info@drblackburndigital.com');
        assert.equal(org.contactPoint.url, `${origin}/contact/`);
        assert.equal(org.address.addressLocality, 'Püttlingen');
      }
      assert.equal(schema['@graph'].some(e => e['@type'] === 'ProfilePage'), Boolean(p.profile));
      assert.ok(html.includes('og:image" content="https://www.drblackburndigital.com/assets/social-preview.png'));
    }
  }
});

test('all important pages are reachable by static HTML links, with ordered headings and no staging URLs', async () => {
  for (const root of roots) {
    const pages = getPages();
    const graph = new Map();
    for (const page of pages) {
      const html = await readFile(path.join(root, page.path, 'index.html'), 'utf8');
      assert.doesNotMatch(html, /localhost|127\.0\.0\.1|\.vercel\.app/);
      const headings = [...html.matchAll(/<h([1-6])\b/g)].map(match => Number(match[1]));
      for (let i = 1; i < headings.length; i++) assert.ok(headings[i] <= headings[i - 1] + 1, `Heading level skipped on ${root}${page.path}: ${headings}`);
      graph.set(page.path, [...html.matchAll(/<a\b[^>]*href="(\/[^"#]*)/g)].map(match => new URL(match[1], origin).pathname));
    }
    const seen = new Set(['/']);
    const queue = ['/'];
    while (queue.length) for (const destination of graph.get(queue.shift()) || []) if (!seen.has(destination)) { seen.add(destination); queue.push(destination); }
    for (const page of pages) assert.ok(seen.has(page.path), `${page.path} is not reachable without JavaScript`);
  }
});

test('sitemap contains only the canonical indexable default pages', async () => {
  const sitemap = await readFile('dist/sitemap.xml', 'utf8');
  const actual = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  assert.deepEqual(actual, getPages().filter(p => !p.noindex).map(p => `${origin}${p.path}`));
  const robots = await readFile('dist/robots.txt', 'utf8');
  assert.match(robots, /Allow: \//);
  assert.doesNotMatch(robots, /Disallow:/);
  assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
});

test('Vercel preview environment cannot produce indexable pages even with the normal build command', async () => {
  const artifactRoot = path.resolve('artifacts');
  await mkdir(artifactRoot, { recursive: true });
  const temporaryRoot = await mkdtemp(path.join(artifactRoot, 'staging-test-'));
  try {
    await mkdir(path.join(temporaryRoot, 'scripts'));
    for (const directory of ['src', 'assets']) await cp(directory, path.join(temporaryRoot, directory), { recursive: true });
    for (const file of ['scripts/build.mjs', 'scripts/assert-launch-output.mjs', 'favicon.ico', 'apple-touch-icon.png']) await cp(file, path.join(temporaryRoot, file));
    await promisify(execFile)(process.execPath, ['scripts/build.mjs'], { cwd: temporaryRoot, env: { ...process.env, VERCEL_ENV: 'preview' } });
    for (const file of (await files(path.join(temporaryRoot, 'dist'))).filter(file => file.endsWith('.html'))) assert.match(await readFile(file, 'utf8'), /name="robots" content="noindex, nofollow"/);
    assert.doesNotMatch(await readFile(path.join(temporaryRoot, 'dist/sitemap.xml'), 'utf8'), /<loc>/);
    assert.match(await readFile(path.join(temporaryRoot, 'dist/robots.txt'), 'utf8'), /Disallow: \//);
    assert.equal(await stat(path.join(temporaryRoot, 'index.html')).catch(() => null), null);
  } finally {
    // Verify the absolute deletion target is the temporary child we created.
    assert.equal(path.dirname(path.resolve(temporaryRoot)), artifactRoot);
    assert.ok(path.basename(temporaryRoot).startsWith('staging-test-'));
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('company pages contain only the corporate organisation', async () => {
  const profile = await readFile('preview-dist/greg-blackburn/index.html', 'utf8');
  assert.doesNotMatch(profile, /Owner &amp; CEO/);
  for (const file of (await files('preview-dist')).filter(p => p.endsWith('.html'))) {
    const html = await readFile(file, 'utf8');
    assert.doesNotMatch(html, />\s*(Start learning|Download the app|Subscribe)\s*</i);
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'];
    assert.equal(graph.filter(e => e['@type'] === 'Organization').length, 1);
  }
});

test('confirmed registration details and Communardo role are used', async () => {
  const profile = await readFile('dist/greg-blackburn/index.html', 'utf8');
  assert.match(profile, /Former Head of Knowledge Management &amp; Learning at Communardo/);
  assert.match(profile, /Knowledge &amp; Learning Centre/);
  assert.doesNotMatch(profile, /Chief Learning Officer/);
  for (const root of roots) for (const route of ['impressum', 'de/impressum']) {
    const legal = await readFile(path.join(root, route, 'index.html'), 'utf8');
    assert.match(legal, /<dd>HRB 112680<\/dd>/);
    assert.match(legal, /<dd>Amtsgericht Saarbrücken<\/dd>/);
    assert.doesNotMatch(legal, /VAT identification number|Umsatzsteuer-Identifikationsnummer|DE\d{9}/);
  }
});

test('translated pages have reciprocal language alternates and retain the shared form contract', async () => {
  for (const root of roots) {
    for (const [en, de] of [['/', '/de/'], ['/partnerships/', '/de/partnerschaften/'], ['/contact/', '/de/kontakt/'], ['/impressum/', '/de/impressum/'], ['/privacy/', '/de/datenschutz/'], ['/insights/', '/de/perspektiven/'], ['/insights/reviewing-a-learning-product/', '/de/perspektiven/lernprodukt-pruefen/'], ['/insights/knowledge-before-ai/', '/de/perspektiven/wissensgrundlage-vor-ki/']]) {
      for (const route of [en, de]) {
        const html = await readFile(path.join(root, route, 'index.html'), 'utf8');
        assert.match(html, route === de ? /<html lang="de">/ : /<html lang="en">/);
        assert.ok(html.includes(`hreflang="en" href="${origin}${en}"`));
        assert.ok(html.includes(`hreflang="de" href="${origin}${de}"`));
        assert.ok(html.includes(`hreflang="x-default" href="${origin}${en}"`));
        assert.ok(html.includes(`rel="canonical" href="${origin}${route}"`));
      }
    }
    const contact = await readFile(path.join(root, 'de/kontakt/index.html'), 'utf8');
    assert.match(contact, /action="\/api\/contact\/" method="post"/);
    assert.match(contact, /type="submit" disabled>Anfrage senden/);
    assert.match(contact, /href="\/de\/datenschutz\/"/);
    assert.doesNotMatch(contact, /href="\/privacy\/"/);
    assert.deepEqual([...contact.matchAll(/<(?:input|textarea|select)[^>]* name="([^"]+)"/g)].map(m => m[1]), ['name', 'organisation', 'email', 'type', 'message', 'website']);
  }
});

test('language switches stay on the matching page and are absent without a translation', async () => {
  for (const root of roots) {
    const pages = getPages();
    for (const page of pages) {
      const counterpart = page.lang === 'de' ? pages.find(p => p.path === page.englishPath) : pages.find(p => p.englishPath === page.path);
      const html = await readFile(path.join(root, page.path, 'index.html'), 'utf8');
      const menu = html.match(/<nav class="language-switch"[\s\S]*?<\/nav>/)?.[0];
      if (!counterpart) {
        assert.equal(menu, undefined, `Untranslated ${page.path} must not offer an unrelated destination`);
      } else {
        assert.ok(menu?.includes(`href="${counterpart.path}"`), `${page.path}: missing direct translation link`);
      }
    }
    for (const [en, de] of [['/insights/reviewing-a-learning-product/', '/de/perspektiven/lernprodukt-pruefen/'], ['/insights/knowledge-before-ai/', '/de/perspektiven/wissensgrundlage-vor-ki/']]) {
      const english = pages.find(p => p.path === en).body;
      const german = pages.find(p => p.path === de).body;
      assert.ok(german.replace(/<[^>]+>/g, '').length > 3000, `${de}: full article required`);
      assert.equal([...german.matchAll(/<h2>/g)].length, [...english.matchAll(/<h2>/g)].length);
      assert.deepEqual([...german.matchAll(/href="(https:[^"]+)"/g)].map(m => m[1]), [...english.matchAll(/href="(https:[^"]+)"/g)].map(m => m[1]));
      assert.ok(german.includes('/de/kontakt/?type=professional'));
    }
  }
});

test('legal notices show complete content in the selected language and stay out of the sitemap', async () => {
  for (const root of roots) {
    const en = await readFile(path.join(root, 'privacy/index.html'), 'utf8');
    const de = await readFile(path.join(root, 'de/datenschutz/index.html'), 'utf8');
    assert.match(en, /<h1>Privacy policy<\/h1>/);
    assert.doesNotMatch(en, /English summary|<h1>Datenschutzerklärung/);
    assert.match(en, /<h2>7\. Your rights<\/h2>/);
    assert.match(de, /<h2>7\. Ihre Rechte<\/h2>/);
    for (const html of [en, de]) {
      assert.match(html, /Vercel/); assert.match(html, /Google Workspace/); assert.match(html, /Namecheap/);
      assert.equal([...html.matchAll(/<h2>[1-7]\./g)].length, 7);
    }
    const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
    for (const route of ['/impressum/', '/privacy/', '/de/impressum/', '/de/datenschutz/']) {
      assert.ok(!sitemap.includes(`${origin}${route}`));
      assert.match(await readFile(path.join(root, route, 'index.html'), 'utf8'), /name="robots" content="noindex, nofollow"/);
    }
  }
});

test('editorial additions include the acquisition CTA and verified publication links', async () => {
  const home = await readFile('dist/index.html', 'utf8');
  assert.match(home, /class="button" href="\/contact\/\?type=acquisition">Discuss an acquisition/);
  const greg = await readFile('dist/greg-blackburn/index.html', 'utf8');
  assert.match(greg, /10\.53761\/1\.12\.2\.5/);
  assert.match(greg, /10\.1177\/2042753016653704/);
});
