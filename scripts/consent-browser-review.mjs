import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { withLaunchBuild, serveBuild } from '../tests/helpers/launch-build.mjs';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [];
const endpoint = 'https://plausible.io/api/event';
const key = 'dbd-consent-v1';
await mkdir('artifacts/screenshots', { recursive: true });

async function session(origin, options = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const events = [], requests = [], errors = [];
  context.on('page', child => child.on('pageerror', error => errors.push(error.message)));
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', async route => {
    const request = route.request();
    requests.push(request.url());
    if (request.url() === endpoint) {
      assert.equal(request.headers().referer, undefined);
      assert.equal(request.headers().cookie, undefined);
      const event = request.postDataJSON();
      assert.deepEqual(Object.keys(event).sort(), ['domain', 'name', 'url']);
      assert.equal(event.domain, 'drblackburndigital.com');
      assert.ok(event.url.startsWith('https://www.drblackburndigital.com/'));
      assert.doesNotMatch(event.url, /[?#]/);
      events.push(event);
      return route.fulfill({ status: 202, body: '{}', contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    assert.equal(new URL(request.url()).origin, origin, 'Unexpected external request');
    return route.continue();
  });
  return { context, page, events, requests, errors };
}
const choose = (page, choice, dialog = false) => page.locator(`${dialog ? '#consent-dialog' : '.consent-banner'} [data-consent-choice="${choice}"]`).click();
async function openSettings(page) {
  await page.locator('.site-footer [data-consent-open]').click();
  assert.ok(await page.locator('#consent-dialog').isVisible());
}
async function allow(page, dialog = false) {
  const sent = page.waitForResponse(response => response.url() === endpoint);
  await choose(page, 'analytics', dialog);
  await sent;
  await page.waitForFunction(() => Boolean(window.dbdAnalytics));
}
async function fillAndSubmit(page, de = false) {
  await page.locator('#enquiry-name').fill('Private Test Name');
  await page.locator('#enquiry-email').fill('private-test@example.org');
  await page.locator('#enquiry-message').fill('Private enquiry contents must never be sent to analytics.');
  await page.getByRole('button', { name: de ? 'Anfrage senden' : 'Send enquiry' }).click();
  await page.locator('#form-result:not([hidden])').waitFor();
}

try {
  await withLaunchBuild(async ({ build }) => {
    for (const flag of ['false', 'true']) {
      const output = await build({ flag, analytics: true });
      const server = await serveBuild(output);
      try {
        for (const de of [false, true]) {
          const { context, page, events, requests, errors } = await session(server.origin);
          try {
            const route = de ? '/de/kontakt/' : '/contact/';
            let fail = false;
            await page.route('**/api/contact/', route => route.fulfill({ status: fail && route.request().method() === 'POST' ? 503 : 200, json: route.request().method() === 'GET' ? { enabled: true } : { ok: !fail } }));
            await page.goto(server.origin + route + '?email=private-test@example.org#private-fragment');
            assert.equal(events.length, 0);
            assert.equal(requests.some(url => url.endsWith('/assets/analytics.js')), false);
            assert.equal(await page.evaluate(() => localStorage.length), 0);
            await page.setViewportSize({ width: 390, height: 900 });
            assert.deepEqual((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations, []);
            await page.screenshot({ path: `artifacts/screenshots/consent-banner-${de ? 'de' : 'en'}.png`, fullPage: true });
            // A successful submission before consent must never be replayed.
            await fillAndSubmit(page, de);
            assert.equal(events.length, 0);
            await choose(page, 'essential');
            const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
            assert.equal(stored.analytics, false);
            assert.equal(stored.expiresAt - stored.createdAt, 180 * 86400000);
            await page.reload();
            assert.equal(await page.locator('.consent-banner').isVisible(), false);
            assert.equal(events.length, 0);
            await openSettings(page);
            assert.deepEqual((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations, []);
            await page.screenshot({ path: `artifacts/screenshots/consent-dialog-${de ? 'de' : 'en'}.png` });
            await page.keyboard.press('Escape');
            assert.equal(await page.locator('#consent-dialog').isVisible(), false);
            assert.ok(await page.locator('.site-footer [data-consent-open]').evaluate(element => element === document.activeElement));
            await openSettings(page);
            await allow(page, true);
            assert.deepEqual(events.map(event => event.name), ['pageview']);
            fail = true;
            await fillAndSubmit(page, de);
            assert.equal(events.length, 1, 'Failed submission must not count');
            fail = false;
            const sent = page.waitForResponse(endpoint);
            await page.getByRole('button', { name: de ? 'Anfrage senden' : 'Send enquiry' }).click();
            await sent;
            assert.deepEqual(events.map(event => event.name), ['pageview', 'ContactSubmission']);
            assert.equal(JSON.stringify(events).includes('private-test'), false);
            // Partner enquiries use the same successful-send contract.
            await page.goto(server.origin + route + '?type=partnership');
            await page.waitForFunction(() => Boolean(window.dbdAnalytics));
            const partnerSent = page.waitForResponse(response => response.url() === endpoint && response.request().postDataJSON().name === 'PartnerSubmission');
            await fillAndSubmit(page, de);
            await partnerSent;
            assert.equal(events.filter(event => event.name === 'PartnerSubmission').length, 1);
            await page.locator('#enquiry-form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
            assert.equal(events.filter(event => event.name === 'PartnerSubmission').length, 1);
            // Revoke in another tab; the first tab must stop immediately.
            const other = await context.newPage();
            await other.goto(server.origin + '/');
            await other.waitForFunction(() => Boolean(window.dbdAnalytics));
            await openSettings(other);
            await choose(other, 'essential', true);
            await page.waitForFunction(() => !window.dbdConsent.allowed());
            const count = events.length;
            await page.evaluate(() => window.dbdAnalytics.track('ContactSubmission'));
            assert.equal(events.length, count);
            await page.reload();
            await page.waitForLoadState('networkidle');
            assert.equal(events.length, count);
            assert.equal(await page.evaluate(() => Boolean(window.dbdAnalytics)), false);
            assert.deepEqual(await context.cookies(), []);
            assert.deepEqual(errors, []);
            checks.push(`flag ${flag}, ${de ? 'DE' : 'EN'}: opt-in, rejection, persistence, expiry data, modal keyboard/axe, successful-only conversions, no PII, cross-tab withdrawal`);
          } finally { await context.close(); }
        }
      } finally { await server.close(); }
    }

    const output = await build({ analytics: true });
    const server = await serveBuild(output);
    try {
      for (const stored of ['{bad json', JSON.stringify({ version: 9, analytics: true }), JSON.stringify({ version: 1, analytics: true, createdAt: 0, expiresAt: 180 * 86400000 })]) {
        const { context, page, events } = await session(server.origin);
        try {
          await context.addInitScript(({ key, stored }) => localStorage.setItem(key, stored), { key, stored });
          await page.goto(server.origin + '/');
          assert.ok(await page.locator('.consent-banner').isVisible());
          assert.equal(events.length, 0);
          assert.equal(await page.evaluate(() => window.dbdConsent.allowed()), false);
        } finally { await context.close(); }
      }
      checks.push('Malformed, changed-version and expired consent fail closed');

      const blocked = await session(server.origin);
      try {
        await blocked.context.addInitScript(() => { Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); }; });
        await blocked.page.goto(server.origin + '/');
        await allow(blocked.page);
        assert.equal(blocked.events.length, 1);
        await blocked.page.reload();
        assert.ok(await blocked.page.locator('.consent-banner').isVisible());
        assert.equal(blocked.events.length, 1);
        assert.deepEqual(blocked.errors, []);
        checks.push('Blocked storage uses memory-only consent and resets on navigation');
      } finally { await blocked.context.close(); }

      const race = await session(server.origin);
      try {
        let release;
        await race.page.route('**/api/contact/', route => route.fulfill({ json: route.request().method() === 'GET' ? { enabled: true } : { ok: true } }));
        await race.page.route('**/assets/analytics.js', route => new Promise(resolve => {
          release = async () => { await route.fulfill({ contentType: 'text/javascript', body: await readFile('assets/analytics.js', 'utf8') }); resolve(); };
        }));
        await race.page.goto(server.origin + '/contact/');
        const loading = race.page.waitForRequest('**/assets/analytics.js');
        await choose(race.page, 'analytics');
        await loading;
        await fillAndSubmit(race.page);
        assert.ok(await race.page.locator('#form-result.success').isVisible());
        await openSettings(race.page);
        await choose(race.page, 'essential', true);
        await release();
        await race.page.waitForFunction(() => Boolean(window.dbdAnalytics));
        assert.equal(race.events.length, 0);
        checks.push('Withdrawal while analytics script is loading clears queued conversions and prevents all events');
      } finally { await race.context.close(); }

      const delayed = await session(server.origin);
      try {
        let release;
        await delayed.page.route('**/api/contact/', route => route.fulfill({ json: route.request().method() === 'GET' ? { enabled: true } : { ok: true } }));
        await delayed.page.route('**/assets/analytics.js', route => new Promise(resolve => {
          release = async () => { await route.fulfill({ contentType: 'text/javascript', body: await readFile('assets/analytics.js', 'utf8') }); resolve(); };
        }));
        await delayed.page.goto(server.origin + '/contact/');
        const loading = delayed.page.waitForRequest('**/assets/analytics.js');
        await choose(delayed.page, 'analytics');
        await loading;
        await fillAndSubmit(delayed.page);
        const conversion = delayed.page.waitForResponse(response => response.url() === endpoint && response.request().postDataJSON().name === 'ContactSubmission');
        await release();
        await conversion;
        assert.deepEqual(delayed.events.map(event => event.name), ['pageview', 'ContactSubmission']);
        await delayed.page.unroute('**/assets/analytics.js');
        await delayed.page.reload();
        await delayed.page.evaluate(() => { window.dbdConsent = { track() { throw new Error('Analytics unavailable'); } }; });
        await fillAndSubmit(delayed.page);
        assert.ok(await delayed.page.locator('#form-result.success').isVisible());
        assert.deepEqual(delayed.errors, []);
        checks.push('Consented conversions survive slow script loading; analytics errors cannot change form success');
      } finally { await delayed.context.close(); }

      const nojs = await session(server.origin, { javaScriptEnabled: false });
      try {
        await nojs.page.goto(server.origin + '/de/erstattung-widerruf/');
        assert.equal(nojs.events.length, 0);
        assert.equal(await nojs.page.locator('.site-footer [data-consent-open]').isVisible(), false);
        assert.match(await nojs.page.locator('main').innerText(), /DRAFT/);
        checks.push('Legal content works without JavaScript; no analytics loads');
      } finally { await nojs.context.close(); }
    } finally { await server.close(); }

    for (const environment of ['production', 'preview']) {
      const output = await build({ environment, analytics: environment === 'preview' });
      const server = await serveBuild(output);
      const { context, page, events, requests } = await session(server.origin);
      try {
        await page.goto(server.origin + '/');
        assert.equal(await page.locator('.consent-banner').isVisible(), false);
        await openSettings(page);
        assert.ok(await page.locator('#consent-dialog [data-consent-choice="analytics"]').isDisabled());
        await choose(page, 'essential', true);
        assert.equal(events.length, 0);
        assert.equal(requests.some(url => url.endsWith('/assets/analytics.js')), false);
        checks.push(`${environment}: disabled analytics cannot be enabled by visitor controls`);
      } finally { await context.close(); await server.close(); }
    }
  });
  await writeFile('artifacts/consent-browser-review.json', JSON.stringify({ checks }, null, 2));
  console.log(JSON.stringify({ checks }, null, 2));
} finally { await browser.close(); }
