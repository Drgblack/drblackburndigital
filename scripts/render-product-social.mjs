// Rebuild the original, code-native share artwork using DBD's existing design.
// Committed PNGs are copied only by flag-on builds; Chrome is not needed on Vercel.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const icon = (await readFile(new URL('../assets/favicon-96.png', import.meta.url))).toString('base64');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.route('https://**/*', route => route.abort());
  for (const de of [false, true]) {
    await page.setContent(`<!doctype html><html lang="${de ? 'de' : 'en'}"><head><meta charset="utf-8"><title>MedicalGerman share artwork</title><style>
      *{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#f8f7f3;color:#172b3a;font-family:'Segoe UI',Arial,sans-serif}.card{height:630px;padding:58px 72px;border-top:8px solid #075aaf;display:flex;flex-direction:column}.brand{display:flex;align-items:center;gap:16px;font-size:22px;font-weight:600}.brand img{width:52px;height:52px}.eyebrow{margin:55px 0 15px;font-size:14px;letter-spacing:2px;text-transform:uppercase;color:#53636c}h1{font-size:86px;letter-spacing:-4px;font-weight:500;line-height:1.05;margin:0 0 23px}.subtitle{font:38px/1.25 Georgia,serif;color:#075aaf;margin:0}.foot{margin-top:auto;border-top:1px solid #cdd7d6;padding-top:22px;display:flex;justify-content:space-between;gap:30px;font-size:17px;color:#53636c}
      </style></head><body><main class="card"><div class="brand"><img src="data:image/png;base64,${icon}" alt="">Dr. Blackburn Digital GmbH</div><p class="eyebrow">${de ? 'Unser Portfolio / Lernen' : 'Our portfolio / Learning'}</p><h1>MedicalGerman</h1><p class="subtitle">${de ? 'Medizinisches Deutsch.' : 'Medical German.'}</p><div class="foot"><span>${de ? 'Ein fokussiertes digitales Lernprodukt.' : 'A focused digital learning product.'}</span><span>drblackburndigital.com</span></div></main></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: fileURLToPath(new URL(`../assets/medicalgerman-${de ? 'de' : 'en'}.png`, import.meta.url)) });
  }
} finally {
  await browser.close();
}
