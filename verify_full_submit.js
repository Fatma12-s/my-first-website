const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE_ERROR:', err.message));
    page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

    await page.goto('https://squh-training.web.app/graduates.html', { waitUntil: 'networkidle0' });

    await page.evaluate(() => {
      window.__emailjsLogs = [];
      window.__submitLogs = [];
      const originalFetch = window.fetch.bind(window);
      const originalSetItem = window.localStorage.setItem.bind(window.localStorage);

      document.addEventListener('submit', (event) => {
        const target = event.target;
        const targetId = target && target.id ? target.id : '';
        window.__submitLogs.push({
          targetId,
          defaultPrevented: event.defaultPrevented,
          timestamp: Date.now()
        });
      }, true);

      window.fetch = async (...args) => {
        const url = String(args[0] || '');
        const response = await originalFetch(...args);
        if (url.includes('api.emailjs.com/api/v1.0/email/send')) {
          let body = '';
          try {
            body = await response.clone().text();
          } catch (_) {}
          window.__emailjsLogs.push({
            status: response.status,
            ok: response.ok,
            body: body.slice(0, 200)
          });
        }
        return response;
      };

      window.localStorage.setItem = function(key, value) {
        window.__submitLogs.push({ key, type: 'localStorage.setItem', timestamp: Date.now() });
        return originalSetItem(key, value);
      };
    });

    await page.type('#grad-name', 'اختبار نهائي');
    await page.type('#grad-email', 'verify@example.com');
    await page.type('#grad-phone', '0599001122');
    await page.type('#address', 'Muscat');
    await page.type('#cardNo', '12345678');
    await page.type('#institute', 'QA Institute');
    await page.evaluate(() => { const c = document.querySelector('#clinicalAttachment'); if (c) c.checked = true; });
    await page.select('#specialty', 'Training & CPD');
    await page.evaluate(() => {
      document.querySelector('#durationFrom').value = '2026-03-10';
      document.querySelector('#durationTo').value = '2026-03-20';
      const undertakingAgree = document.querySelector('#undertakingAgree');
      const idCardDeclaration = document.querySelector('#idCardDeclaration');
      if (undertakingAgree) undertakingAgree.checked = true;
      if (idCardDeclaration) idCardDeclaration.checked = true;
    });
    await page.type('#objective1', 'obj 1');
    await page.type('#objective2', 'obj 2');
    await page.type('#applicantSignature', 'اختبار نهائي');

    const assetPath = path.resolve(__dirname, 'assets', 'squh-header-logo.jpg');
    await (await page.$('#cvFile')).uploadFile(assetPath);
    await (await page.$('#universityLetter')).uploadFile(assetPath);
    await (await page.$('#idCardCopy')).uploadFile(assetPath);

    const validity = await page.evaluate(() => {
      const form = document.querySelector('#graduates-form');
      return {
        valid: form.checkValidity(),
        invalid: Array.from(form.querySelectorAll(':invalid')).map(el => el.id || el.name || el.tagName)
      };
    });
    console.log('VALIDATION:', JSON.stringify(validity));

    await page.click('#graduates-form button[type="submit"]');
    await new Promise(r => setTimeout(r, 8000));

    const finalResult = await page.evaluate(() => {
      const modal = document.querySelector('.success-modal');
      const logs = Array.isArray(window.__emailjsLogs) ? window.__emailjsLogs : [];
      const submitLogs = Array.isArray(window.__submitLogs) ? window.__submitLogs : [];
      const stored = localStorage.getItem('formSubmissions');
      let graduatesCount = 0;
      try {
        const parsed = stored ? JSON.parse(stored) : null;
        graduatesCount = Array.isArray(parsed && parsed.graduates) ? parsed.graduates.length : 0;
      } catch (_) {}
      return {
        hasSuccessModal: !!modal,
        graduatesCount,
        emailjsCalls: logs,
        submitLogs
      };
    });

    console.log('FINAL_RESULT:', JSON.stringify(finalResult));
    console.log('E2E_SUBMIT_DONE');
  } catch (error) {
    console.log('RUNTIME_ERROR:', error.message);
  } finally {
    if (browser) await browser.close();
  }
})();
