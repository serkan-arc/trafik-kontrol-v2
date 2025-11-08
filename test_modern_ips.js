const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  await page.goto('http://207.180.204.60:3001/login');
  await page.fill('input[type="email"]', 'admin@dtektracking.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/**', { timeout: 15000 });

  await page.goto('http://207.180.204.60:3001/dashboard/traffic/ips');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'modern_ips.png', fullPage: true });

  console.log('✅ Modern IPs screenshot saved');
  await browser.close();
})();
