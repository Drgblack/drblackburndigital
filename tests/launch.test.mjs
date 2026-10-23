import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { getPages, origin } from '../src/pages.mjs';
import { isMedicalGermanEnabled } from '../src/launch.mjs';
import { files, withLaunchBuild } from './helpers/launch-build.mjs';

test('launch switch defaults off and accepts only the exact string true', () => {
  for (const value of [undefined, '', 'false', '0', '1', 'TRUE', 'yes', ' true ', true, false]) assert.equal(isMedicalGermanEnabled(value), false, String(value));
  assert.equal(isMedicalGermanEnabled('true'), true);
  assert.doesNotMatch(JSON.stringify(getPages()), /medical[\s_-]*german/i);
});

test('flag off emits no product bytes or paths; enabling and disabling cleans stale output', async () => withLaunchBuild(async ({ build, workspace }) => {
  const baseline = await build();
  const before = new Map(await Promise.all((await files(baseline)).filter(file => !file.endsWith('build-info.json')).map(async file => [path.relative(baseline, file), await readFile(file)])));
  const rootHome = await readFile(path.join(workspace, 'index.html'));
  for (const flag of ['true', 'false', undefined, 'TRUE']) {
    const output = await build({ flag });
    const enabled = flag === 'true';
    const all = await files(output);
    for (const file of all) {
      if (!enabled) {
        assert.doesNotMatch(path.relative(output, file), /medical[\s_-]*german/i);
        assert.doesNotMatch((await readFile(file)).toString('utf8'), /medical[\s_-]*german/i, file);
        if (!file.endsWith('build-info.json')) assert.deepEqual(await readFile(file), before.get(path.relative(output, file)), file);
      }
    }
    const expected = getPages({ showMedicalGerman: enabled });
    assert.equal(all.filter(file => file.endsWith('.html')).length, expected.length + 1);
    const sitemap = await readFile(path.join(output, 'sitemap.xml'), 'utf8');
    assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]), expected.filter(page => !page.noindex).map(page => origin + page.path));
    for (const route of ['medicalgerman/billing', 'de/medicalgerman/abrechnung', 'de/portfolio']) {
      assert.equal(Boolean(await stat(path.join(output, route, 'index.html')).catch(() => null)), enabled, route);
    }
    for (const lang of ['en', 'de']) {
      const image = path.join(output, `assets/medicalgerman-${lang}.png`);
      assert.equal(Boolean(await stat(image).catch(() => null)), enabled);
      if (enabled) {
        const bytes = await readFile(image);
        assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
        assert.equal(bytes.readUInt32BE(16), 1200);
        assert.equal(bytes.readUInt32BE(20), 630);
      }
    }
    for (const route of ['medicalgerman', 'de/medicalgerman']) {
      assert.equal(Boolean(await stat(path.join(output, route, 'index.html')).catch(() => null)), enabled);
      if (enabled) {
        const html = await readFile(path.join(output, route, 'index.html'), 'utf8');
        const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'];
        assert.equal(graph.find(item => item['@type'] === 'Product').name, 'MedicalGerman');
        assert.match(html, /TODO-CONFIRM/);
        assert.match(html, /name="robots" content="index, follow"/);
        for (const [lang, href] of [['en', '/medicalgerman/'], ['de', '/de/medicalgerman/']]) assert.ok(html.includes(`hreflang="${lang}" href="${origin}${href}"`));
      }
    }
    assert.deepEqual(await readFile(path.join(workspace, 'index.html')), rootHome, 'Tracked convenience homepage must never contain launch content');
  }
}));

test('product and billing content, language pairs, schema and share images agree', async () => withLaunchBuild(async ({ build }) => {
  const output = await build({ flag: 'true' });
  const pages = getPages({ showMedicalGerman: true });
  assert.equal(new Set(pages.map(page => page.path)).size, pages.length);
  const strip = html => html.replace(/<[^>]*>/g, '').replaceAll('&amp;', '&');
  for (const page of pages.filter(page => page.launchContent)) {
    const html = await readFile(path.join(output, page.path, 'index.html'), 'utf8');
    const de = page.lang === 'de';
    const en = page.englishPath || page.path;
    const german = pages.find(candidate => candidate.englishPath === en);
    assert.ok(german, `German counterpart for ${page.path}`);
    for (const [lang, route] of [['en', en], ['de', german.path], ['x-default', en]]) {
      assert.ok(html.includes(`hreflang="${lang}" href="${origin}${route}"`));
    }
    assert.ok(html.includes(`<link rel="canonical" href="${origin}${page.path}">`));
    assert.match(page.body, /TODO-CONFIRM/);
    const productRoute = de ? '/de/medicalgerman/' : '/medicalgerman/';
    assert.ok(page.body.includes(`href="${productRoute}"`) || page.navigation || page.parent?.[0] === productRoute);
    if (page.socialImage) {
      assert.ok(html.includes(`property="og:image" content="${origin}${page.socialImage}"`));
      assert.ok(html.includes(`name="twitter:image" content="${origin}${page.socialImage}"`));
      assert.ok(page.socialImage.endsWith(`-${de ? 'de' : 'en'}.png`));
    }
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'];
    assert.equal(graph.find(node => node['@type'] === 'Organization').legalName, 'Dr. Blackburn Digital GmbH');
    if (page.navigation) {
      const product = graph.find(node => node['@type'] === 'Product');
      assert.equal(product.name, 'MedicalGerman');
      assert.equal(product.url, origin + page.path);
      assert.equal(graph.find(node => node['@type'] === 'WebPage').mainEntity['@id'], product['@id']);
      assert.equal(product.image, origin + page.socialImage);
      assert.equal(product.offers, undefined, 'Do not invent prices');
      assert.equal(product.aggregateRating, undefined, 'Do not invent ratings');
      const faq = graph.find(node => node['@type'] === 'FAQPage');
      assert.equal(faq.inLanguage, de ? 'de' : 'en');
      assert.equal(faq.mainEntity.length, 6);
      for (const question of faq.mainEntity) {
        assert.ok(strip(page.body).includes(question.name));
        assert.ok(strip(page.body).includes(question.acceptedAnswer.text));
      }
      assert.match(page.body, /href="https:\/\/medicalgerman\.app" target="_blank" rel="noopener noreferrer"/);
      for (const id of ['preparation', 'pricing', 'faq']) assert.ok(page.body.includes(`id="${id}"`));
    }
    if (page.parent) {
      assert.ok(page.body.includes('mailto:info@drblackburndigital.com'));
      assert.ok(page.body.includes(de ? '/de/kontakt/?type=general' : '/contact/?type=general'));
      assert.ok(page.body.includes(de ? '/de/erstattung-widerruf/' : '/refunds-withdrawal/'));
      assert.ok(page.body.includes(de ? '/de/agb/' : '/terms/'));
    }
  }
}));

test('local links and asset references resolve in both flag states without fetching external sites', async () => withLaunchBuild(async ({ build }) => {
  for (const flag of ['false', 'true']) {
    const output = await build({ flag });
    for (const file of (await files(output)).filter(file => file.endsWith('.html'))) {
      const html = await readFile(file, 'utf8');
      for (const [, href] of html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)) {
        if (!href.startsWith('/') && !href.startsWith(origin + '/')) continue;
        const url = new URL(href.replaceAll('&amp;', '&'), origin);
        if (url.origin !== origin) continue;
        const target = path.join(output, url.pathname, url.pathname.endsWith('/') ? 'index.html' : '');
        assert.ok(await stat(target).catch(() => null), `${file}: missing ${href}`);
        if (url.hash) {
          const destination = await readFile(target, 'utf8');
          assert.ok(destination.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `${file}: missing anchor ${href}`);
        }
      }
    }
  }
}));

test('Vercel and local preview remain noindexed in both flag states', async () => withLaunchBuild(async ({ build }) => {
  for (const preview of [false, true]) for (const flag of ['false', 'true']) {
    const output = await build({ flag, environment: 'preview', preview });
    for (const file of (await files(output)).filter(file => file.endsWith('.html'))) {
      const html = await readFile(file, 'utf8');
      assert.match(html, /name="robots" content="noindex, nofollow"/, file);
      if (flag === 'false') assert.doesNotMatch(html, /medical[\s_-]*german/i, file);
    }
    assert.doesNotMatch(await readFile(path.join(output, 'sitemap.xml'), 'utf8'), /<loc>/);
    assert.match(await readFile(path.join(output, 'robots.txt'), 'utf8'), /Disallow: \//);
    assert.equal(Boolean(await stat(path.join(output, 'medicalgerman/index.html')).catch(() => null)), flag === 'true');
  }
}));

test('build fails closed and removes output if shared assets leak unpublished text', async () => withLaunchBuild(async ({ build, workspace }) => {
  await writeFile(path.join(workspace, 'assets/contact.js'), '// Accidental MedicalGerman mention');
  await assert.rejects(build(), /Unpublished product content in output/);
  assert.equal(await stat(path.join(workspace, 'dist')).catch(() => null), null);
  assert.equal(await stat(path.join(workspace, 'index.html')).catch(() => null), null);
}));
