const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  const file = 'file://' + path.resolve(__dirname, '_navrh.html').split(path.sep).join('/');
  await page.goto(file, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const out = path.resolve(__dirname, 'HAZE-navrh-nase-projekty.pdf');
  // Full single-tall-page capture of the whole layout
  const h = await page.evaluate(() => document.body.scrollHeight);
  await page.pdf({ path: out, printBackground: true, width: '1280px', height: h + 'px', pageRanges: '1' });
  console.log('PDF:', out, 'height', h);
  await browser.close();
})();
