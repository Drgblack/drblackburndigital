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
