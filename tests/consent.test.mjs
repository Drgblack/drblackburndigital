import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getAnalyticsConfig } from '../src/consent.mjs';
import { getPages, origin } from '../src/pages.mjs';
import { withLaunchBuild, files } from './helpers/launch-build.mjs';

test('analytics fails closed without production opt-in and a confirmed site identifier', () => {
  assert.deepEqual(getAnalyticsConfig({}), { enabled: false });
  const active = { ANALYTICS_ENABLED: 'true', PLAUSIBLE_DOMAIN: 'drblackburndigital.com', VERCEL_ENV: 'production' };
  assert.equal(getAnalyticsConfig(active).enabled, true);
  for (const environment of [undefined, 'preview', 'development']) assert.equal(getAnalyticsConfig({ ...active, VERCEL_ENV: environment }).enabled, false);
  for (const value of [undefined, '', 'false', 'TRUE', '1']) assert.equal(getAnalyticsConfig({ ...active, ANALYTICS_ENABLED: value }).enabled, false);
  assert.equal(getAnalyticsConfig(active, true).enabled, false);
  for (const domain of [undefined, '', 'other.example', 'https://drblackburndigital.com', '</script>']) assert.throws(() => getAnalyticsConfig({ ...active, PLAUSIBLE_DOMAIN: domain }), /confirmed DBD/);
});

test('all eight legal drafts exist in both flag states with reciprocal languages and no indexing', async () => withLaunchBuild(async ({ build }) => {
  for (const enabled of [false, true]) {
    const output = await build({ flag: String(enabled) });
    const legal = getPages({ showMedicalGerman: enabled }).filter(page => page.legalDraft);
    assert.equal(legal.length, 8);
    const sitemap = await readFile(path.join(output, 'sitemap.xml'), 'utf8');
    for (const page of legal) {
      const html = await readFile(path.join(output, page.path, 'index.html'), 'utf8');
      const other = page.lang === 'de' ? legal.find(item => item.path === page.englishPath) : legal.find(item => item.englishPath === page.path);
      assert.ok(other, page.path);
      assert.match(html, /DRAFT/);
      assert.match(html, /TODO-CONFIRM/);
      assert.match(html, /name="robots" content="noindex, nofollow"/);
      assert.ok(html.includes(`hreflang="${other.lang || 'en'}" href="${origin}${other.path}"`));
      assert.ok(!sitemap.includes(origin + page.path));
      if (!enabled) assert.doesNotMatch(html, /medical[\s_-]*german/i);
    }
    for (const file of (await files(output)).filter(file => file.endsWith('.html'))) {
      const html = await readFile(file, 'utf8');
      const footer = html.match(/<footer[\s\S]*?<\/footer>/)[0];
      const de = html.includes('<html lang="de">');
      assert.ok(footer.includes(`href="${de ? '/de/agb/' : '/terms/'}"`));
      assert.ok(footer.includes(`href="${de ? '/de/erstattung-widerruf/' : '/refunds-withdrawal/'}"`));
      assert.match(footer, /data-consent-open/);
      assert.doesNotMatch(html, /<script[^>]+src="(?:https?:|\/\/)|<script[^>]+src="\/assets\/analytics.js"/);
    }
  }
}));

test('analytics configuration and privacy copy match the build; preview can never collect', async () => withLaunchBuild(async ({ build }) => {
  for (const environment of ['production', 'preview']) for (const analytics of [false, true]) {
    const output = await build({ environment, analytics });
    const enabled = environment === 'production' && analytics;
    const html = await readFile(path.join(output, 'contact/index.html'), 'utf8');
    const config = JSON.parse(html.match(/id="analytics-config">(.*?)<\/script>/s)[1]);
    assert.equal(config.enabled, enabled);
    if (enabled) assert.deepEqual(config, { enabled: true, domain: 'drblackburndigital.com', url: origin + '/contact/' });
    const privacy = await readFile(path.join(output, 'privacy/index.html'), 'utf8');
    assert.ok(privacy.includes(enabled ? 'configured but stays off' : 'currently disabled; no analytics data is sent'));
    assert.match(privacy, /180 days/);
    const notFound = await readFile(path.join(output, '404.html'), 'utf8');
    assert.match(notFound, /id="analytics-config">\{"enabled":false\}/);
  }
}));
