import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { getPages } from '../src/pages.mjs';

// Local review only. Start both development servers before running this script.
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const results = [];
const errors = [];
const requests = [];
page.on('request', request => requests.push(request.url()));
page.on('pageerror', error => errors.push(error.message));
await mkdir('artifacts/screenshots', { recursive: true });
try {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [port, paths] of [[4173, getPages(false).map(p => p.path)], [4174, getPages(true).map(p => p.path)]]) {
      for (const path of paths) {
        const response = await page.goto(`http://127.0.0.1:${port}${path}`);
        if (path === '/contact/' || path === '/de/kontakt/') await page.locator('#delivery-note:not([hidden])').waitFor();
        // Explicitly load below-fold images before checking them; lazy loading is not a broken asset.
        await page.evaluate(async () => {
          for (const image of document.images) image.loading = 'eager';
          await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
          await document.fonts.ready;
        });
        const layout = await page.evaluate(() => ({ viewport: innerWidth, contentWidth: document.documentElement.scrollWidth, brokenImages: [...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src) }));
        const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        results.push({ port, path, width, status: response.status(), ...layout, violations: accessibility.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) })) });
        if (width !== 320 && !['/company/', '/impressum/', '/privacy/'].includes(path)) {
          const slug = path === '/' ? 'home' : path.split('/').filter(Boolean).join('-');
          await page.screenshot({ path: `artifacts/screenshots/${port === 4174 ? 'future-' : ''}${slug}-${width === 1440 ? 'desktop' : 'mobile'}.png`, fullPage: true });
        }
      }
    }
  }
  // Exercise real CTA journeys, then intercept only local API responses for UI states.
  const formChecks = [];
  for (const port of [4173, 4174]) {
    for (const [en, de, enTitle, deTitle] of [['/privacy/', '/de/datenschutz/', 'Privacy policy', 'Datenschutzerklärung'], ['/impressum/', '/de/impressum/', 'Impressum', 'Impressum']]) {
      await page.goto(`http://127.0.0.1:${port}${en}`);
      assert.equal(await page.locator('h1').textContent(), enTitle);
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
      await page.locator('.language-switch a[lang="de"]').click();
      assert.equal(new URL(page.url()).pathname, de);
      assert.equal(await page.locator('h1').textContent(), deTitle);
      assert.equal(await page.locator('html').getAttribute('lang'), 'de');
      await page.locator('.language-switch a[lang="en"]').click();
      assert.equal(new URL(page.url()).pathname, en);
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    }
    await page.goto(`http://127.0.0.1:${port}/de/kontakt/`);
    await page.locator('main a[href="/de/datenschutz/"]').click();
    assert.equal(new URL(page.url()).pathname, '/de/datenschutz/');
    await page.locator('.footer-links a[href="/de/impressum/"]').click();
    assert.equal(new URL(page.url()).pathname, '/de/impressum/');
    await page.locator('.language-switch a[lang="en"]').click();
    await page.locator('.footer-links a[href="/privacy/"]').click();
    assert.equal(await page.locator('h1').textContent(), 'Privacy policy');
    for (const [en, de] of [['/insights/', '/de/perspektiven/'], ['/insights/reviewing-a-learning-product/', '/de/perspektiven/lernprodukt-pruefen/'], ['/insights/knowledge-before-ai/', '/de/perspektiven/wissensgrundlage-vor-ki/']]) {
      await page.goto(`http://127.0.0.1:${port}${en}`);
      await page.locator('.language-switch a[lang="de"]').click();
      assert.equal(new URL(page.url()).pathname, de);
      assert.equal(await page.locator('html').getAttribute('lang'), 'de');
      await page.locator('.language-switch a[lang="en"]').click();
      assert.equal(new URL(page.url()).pathname, en);
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    }
    for (const route of ['/portfolio/', '/greg-blackburn/', '/company/', '/404.html']) {
      await page.goto(`http://127.0.0.1:${port}${route}`);
      assert.equal(await page.locator('.language-switch').count(), 0);
    }
  }
  formChecks.push('Full English/German legal pages, reciprocal switches and contact/footer language journeys passed in both builds');
  formChecks.push('Insights index and both full articles switch directly EN/DE; untranslated pages have no misleading language switch');
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [path, label, type] of [['/partnerships/', 'Discuss a partnership', 'partnership'], ['/portfolio/', 'Introduce a business', 'acquisition'], ['/greg-blackburn/', 'Connect with Greg', 'professional']]) {
    await page.goto(`http://127.0.0.1:4173${path}`);
    await page.getByRole('link', { name: new RegExp(label) }).last().click();
    assert.equal(new URL(page.url()).searchParams.get('type'), type);
    assert.equal(await page.locator('#enquiry-type').inputValue(), type);
    formChecks.push(`${type} CTA/preselection passed`);
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://127.0.0.1:4173/contact/?type=partnership');
    await page.locator('#delivery-note:not([hidden])').waitFor();
    await page.screenshot({ path: `artifacts/screenshots/contact-partnership-${width === 1440 ? 'desktop' : 'mobile'}.png`, fullPage: true });
  }
  await page.goto('http://127.0.0.1:4173/contact/?type=unknown');
  assert.equal(await page.locator('#enquiry-type').inputValue(), 'general');
  await page.getByRole('button', { name: 'Send enquiry' }).click();
  assert.equal(await page.locator('#enquiry-name').evaluate(e => e.validity.valueMissing), true);
  assert.equal(await page.locator('#form-result').isVisible(), false);
  await page.locator('#enquiry-name').fill('Example Partner');
  await page.locator('#enquiry-email').fill('partner@example.org');
  await page.locator('#enquiry-message').fill('We would like to discuss a professional training partnership.');
  // The real local route is disabled and must preserve input on failure.
  await page.getByRole('button', { name: 'Send enquiry' }).click();
  await page.locator('#form-result.error').waitFor();
  assert.equal(await page.locator('#enquiry-name').inputValue(), 'Example Partner');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'form-result');
  const errorAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(errorAxe.violations, []);
  await page.screenshot({ path: 'artifacts/screenshots/contact-error-mobile.png', fullPage: true });
  let submission;
  let successfulPosts = 0;
  await page.route('**/api/contact/', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { enabled: true } });
    submission = route.request().postDataJSON();
    successfulPosts++;
    return route.fulfill({ json: { ok: true } });
  });
  await page.getByRole('button', { name: 'Send enquiry' }).click();
  await page.locator('#form-result.success').waitFor();
  assert.equal(submission.email, 'partner@example.org');
  assert.equal(submission.organisation, '');
  assert.equal(submission.website, '');
  assert.equal(await page.locator('#enquiry-form').isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'form-result');
  const successAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(successAxe.violations, []);
  await page.screenshot({ path: 'artifacts/screenshots/contact-success-mobile.png', fullPage: true });
  await page.locator('#enquiry-form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(successfulPosts, 1, 'Refresh or repeated submit event replayed the accepted enquiry');
  assert.equal(await page.locator('#enquiry-name').inputValue(), '');
  formChecks.push('Successful submission is not replayed by refresh or a repeated submit event');
  await page.unroute('**/api/contact/');
  formChecks.push('Invalid/unknown values, disabled delivery, error preservation/focus and mocked success passed; no real email sent');
  await page.goto('http://127.0.0.1:4173/contact/?type=partnership');
  await page.locator('#delivery-note:not([hidden])').waitFor();
  await page.locator('.language-switch a[lang="de"]').click();
  assert.equal(new URL(page.url()).pathname, '/de/kontakt/');
  assert.equal(await page.locator('#enquiry-type').inputValue(), 'partnership');
  await page.locator('#delivery-note:not([hidden])').waitFor();
  assert.match(await page.locator('#delivery-note').textContent(), /noch nicht aktiviert/);
  await page.locator('#enquiry-name').fill('Beispiel Partner');
  await page.locator('#enquiry-email').fill('partner@example.org');
  await page.locator('#enquiry-message').fill('Wir möchten eine Partnerschaft besprechen.');
  await page.getByRole('button', { name: 'Anfrage senden' }).click();
  await page.locator('#form-result.error').waitFor();
  assert.match(await page.locator('#form-result').textContent(), /leider nicht geklappt/);
  assert.equal(await page.locator('#enquiry-name').inputValue(), 'Beispiel Partner');
  await page.route('**/api/contact/', route => route.fulfill({ json: route.request().method() === 'POST' ? { ok: true } : { enabled: true } }));
  await page.getByRole('button', { name: 'Anfrage senden' }).click();
  await page.locator('#form-result.success').waitFor();
  assert.match(await page.locator('#form-result').textContent(), /Ihre Nachricht ist eingegangen/);
  await page.unroute('**/api/contact/');
  formChecks.push('German language switch preserves enquiry type; German disabled/error/success states passed');
  assert.deepEqual(await context.cookies(), []);
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  assert.deepEqual(requests.filter(url => !url.startsWith('http://127.0.0.1:')), []);
  formChecks.push('No cookies, browser storage or third-party browser requests observed');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173/');
  await page.keyboard.press('Tab');
  const skipVisible = await page.getByRole('link', { name: 'Skip to content' }).evaluate(e => e === document.activeElement && e.getBoundingClientRect().top >= 0);
  await page.keyboard.press('Enter');
  const skipWorks = await page.evaluate(() => document.activeElement.id === 'main');
  await page.locator('.mobile-nav summary').focus();
  await page.keyboard.press('Enter');
  const menuOpens = await page.locator('.mobile-nav').getAttribute('open') !== null;
  await page.getByRole('navigation', { name: 'Mobile', exact: true }).getByRole('link', { name: 'Partnerships' }).click();
  const menuNavigates = page.url().endsWith('/partnerships/');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4173/');
  const theme = await page.evaluate(() => ({ scheme: getComputedStyle(document.documentElement).colorScheme, scroll: getComputedStyle(document.documentElement).scrollBehavior }));
  const notFound = await page.goto('http://127.0.0.1:4173/portfolio/unpublished-product/');
  const futureRouteExcluded = notFound.status() === 404;
  const keyboard = { skipVisible, skipWorks, menuOpens, menuNavigates };
  const failures = results.filter(r => r.status !== 200 || r.contentWidth > r.viewport || r.brokenImages.length || r.violations.length);
  const report = { checked: results.length, failures, errors, keyboard, theme, futureRouteExcluded, formChecks, results };
  await writeFile('artifacts/browser-review.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ checked: report.checked, failures, errors, keyboard, theme, futureRouteExcluded, formChecks }, null, 2));
  if (failures.length || errors.length || Object.values(keyboard).some(v => !v) || !futureRouteExcluded) process.exitCode = 1;
} finally { await browser.close(); }
