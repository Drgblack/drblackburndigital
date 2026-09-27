import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

// Local laboratory sample only: not CrUX, Lighthouse or field Core Web Vitals.
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const mobile of [true, false]) {
    const context = await browser.newContext({ viewport: { width: mobile ? 390 : 1440, height: 900 }, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: mobile ? 150 : 40, downloadThroughput: (mobile ? 1.6 : 10) * 1000000 / 8, uploadThroughput: 750000 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: mobile ? 4 : 1 });
    await page.addInitScript(() => {
      window.labMetrics = { lcp: 0, cls: 0, longTasks: 0 };
      let windowStart = 0, lastShift = 0, windowScore = 0;
      new PerformanceObserver(list => {
        for (const item of list.getEntries()) window.labMetrics.lcp = item.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => {
        for (const item of list.getEntries()) {
          if (item.hadRecentInput) continue;
          if (item.startTime - lastShift > 1000 || item.startTime - windowStart > 5000) { windowStart = item.startTime; windowScore = 0; }
          windowScore += item.value; lastShift = item.startTime;
          window.labMetrics.cls = Math.max(window.labMetrics.cls, windowScore);
        }
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(list => {
        for (const item of list.getEntries()) window.labMetrics.longTasks += Math.max(0, item.duration - 50);
      }).observe({ type: 'longtask', buffered: true });
    });
    for (const pathname of ['/', '/greg-blackburn/', '/contact/']) {
      await page.goto(`http://127.0.0.1:4173${pathname}`, { waitUntil: 'load' });
      await page.waitForTimeout(1200);
      results.push({ device: mobile ? 'mobile' : 'desktop', path: pathname, ...await page.evaluate(() => ({
        fcpMs: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0),
        lcpMs: Math.round(window.labMetrics.lcp), cls: Number(window.labMetrics.cls.toFixed(4)),
        longTaskBlockingMs: Math.round(window.labMetrics.longTasks),
        transferredBytes: performance.getEntriesByType('resource').reduce((total, entry) => total + entry.transferSize, 0) + performance.getEntriesByType('navigation')[0].transferSize
      })) });
    }
    await context.close();
  }
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/performance-review.json', JSON.stringify({ sampledAt: new Date().toISOString(), method: 'Single local Chrome cold-cache sample per page/device. Mobile 1.6 Mbps/150 ms latency/4x CPU slowdown; desktop 10 Mbps/40 ms/1x. Observed through load + 1.2 seconds; long-task blocking is a diagnostic, not Lighthouse TBT. Contact delivery is disabled. No field INP or production CWV claim.', results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
