import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { getPages } from '../src/pages.mjs';
import { withLaunchBuild, serveBuild } from '../tests/helpers/launch-build.mjs';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
await mkdir('artifacts/screenshots', { recursive: true });
try {
  await withLaunchBuild(async ({ build }) => {
    for (const environment of ['production', 'preview']) for (const enabled of [false, true]) {
      const output = await build({ flag: String(enabled), environment });
      const server = await serveBuild(output);
      const context = await browser.newContext();
      const page = await context.newPage();
      const errors = [];
      const externalRequests = [];
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', route => {
        if (new URL(route.request().url()).origin !== server.origin) {
          externalRequests.push(route.request().url());
          return route.abort();
        }
        return route.continue();
      });
      try {
        const pages = getPages({ showMedicalGerman: enabled });
        for (const width of [1440, 1100, 390, 320]) {
          await page.setViewportSize({ width, height: 900 });
          for (const entry of pages) {
            const response = await page.goto(server.origin + entry.path);
            assert.equal(response.status(), 200, entry.path);
            const html = await page.content();
            if (!enabled) assert.doesNotMatch(html, /medical[\s_-]*german/i, entry.path);
            assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), environment === 'preview' || entry.noindex ? 'noindex, nofollow' : 'index, follow');
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${environment}/${enabled} ${entry.path} overflows at ${width}`);
            if (entry.navigation) {
              const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
              assert.deepEqual(axe.violations, [], `${entry.path} accessibility at ${width}`);
              assert.equal(await page.locator('h1').textContent(), 'MedicalGerman');
              const href = entry.lang === 'de' ? '/de/medicalgerman/' : '/medicalgerman/';
              assert.equal(await page.locator(`.desktop-nav a[href="${href}"]`).count(), 1);
              if (width === 390) {
                await page.locator('.mobile-nav summary').click();
                assert.ok(await page.locator(`.mobile-nav a[href="${href}"]`).isVisible());
                await page.locator('.mobile-nav summary').click();
              }
              if (environment === 'preview' && [1440, 390].includes(width)) await page.screenshot({ path: `artifacts/screenshots/launch-${entry.lang || 'en'}-${width}.png`, fullPage: true });
            }
            results.push({ environment, enabled, route: entry.path, width });
          }
        }
        for (const route of ['/medicalgerman/', '/de/medicalgerman/']) {
          const response = await page.goto(server.origin + route);
          assert.equal(response.status(), enabled ? 200 : 404, route);
          if (!enabled) assert.doesNotMatch(await page.content(), /medical[\s_-]*german/i);
        }
        if (enabled) {
          await page.goto(server.origin + '/medicalgerman/');
          await page.locator('.language-switch a[lang="de"]').click();
          assert.equal(new URL(page.url()).pathname, '/de/medicalgerman/');
          await page.locator('.language-switch a[lang="en"]').click();
          assert.equal(new URL(page.url()).pathname, '/medicalgerman/');
        } else {
          await page.goto(server.origin + '/?SHOW_MEDICALGERMAN=true');
          assert.doesNotMatch(await page.content(), /medical[\s_-]*german/i);
        }
        assert.deepEqual(errors, []);
        assert.deepEqual(externalRequests, []);
        console.log(`Passed ${environment}: flag ${enabled ? 'on' : 'off'} (${pages.length} routes, four widths).`);
      } finally {
        await context.close();
        await server.close();
      }
    }
  });
  await writeFile('artifacts/launch-browser-review.json', JSON.stringify(results, null, 2));
  console.log(`Launch matrix passed: ${results.length} page/viewport checks; both languages, flag states and deployment environments.`);
} finally {
  await browser.close();
}
