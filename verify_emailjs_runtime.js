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
    page.on('request', req => {
      if (req.url().includes('api.emailjs.com/api/v1.0/email/send')) {
        console.log('EMAILJS_REQUEST_STARTED');
      }
    });
    page.on('requestfailed', req => {
      if (req.url().includes('api.emailjs.com/api/v1.0/email/send')) {
        console.log('EMAILJS_REQUEST_FAILED:', req.failure() ? req.failure().errorText : 'unknown');
      }
    });

    await page.goto('https://squh-training.web.app/graduates.html', { waitUntil: 'networkidle0' });

    await page.type('#grad-name', 'اختبار تحقق');
    await page.type('#grad-email', 'verify@example.com');
    await page.type('#grad-phone', '0599001122');
    await page.type('#address', 'Muscat');
    await page.type('#cardNo', '12345678');
    await page.type('#institute', 'QA Institute');

    await page.evaluate(() => {
      const c = document.querySelector('#clinicalAttachment');
      if (c) c.checked = true;
    });

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
    await page.type('#applicantSignature', 'اختبار تحقق');

    const assetPath = path.resolve(__dirname, 'assets', 'squh-header-logo.jpg');
    await (await page.$('#cvFile')).uploadFile(assetPath);
    await (await page.$('#universityLetter')).uploadFile(assetPath);
    await (await page.$('#idCardCopy')).uploadFile(assetPath);

    const validity = await page.evaluate(() => {
      const form = document.querySelector('#graduates-form');
      const invalid = Array.from(form.querySelectorAll(':invalid')).map(el => el.id || el.name || el.tagName);
      return { valid: form.checkValidity(), invalid };
    });
    console.log('VALIDATION:', JSON.stringify(validity));

    const responsePromise = page.waitForResponse(
      res => res.url().includes('api.emailjs.com/api/v1.0/email/send'),
      { timeout: 20000 }
    );

    await page.click('#graduates-form button[type="submit"]');

    try {
      const res = await responsePromise;
      let body = '';
      try { body = await res.text(); } catch (_) {}
      console.log('EMAILJS_RESPONSE_STATUS:', res.status());
      console.log('EMAILJS_RESPONSE_BODY:', String(body).slice(0, 200));
    } catch (e) {
      console.log('EMAILJS_RESPONSE_TIMEOUT');
    }

    await new Promise(r => setTimeout(r, 3000));
    const status = await page.evaluate(() => {
      const modal = document.querySelector('.success-modal');
      const stored = localStorage.getItem('formSubmissions');
      let hasGraduates = false;
      try {
        const parsed = stored ? JSON.parse(stored) : null;
        hasGraduates = !!(parsed && Array.isArray(parsed.graduates) && parsed.graduates.length);
      } catch (_) {}
      return {
        hasSuccessModal: !!modal,
        hasStoredGraduates: hasGraduates
      };
    });
    console.log('SUBMISSION_STATUS:', JSON.stringify(status));
    console.log('VERIFY_DONE');
  } catch (e) {
    console.log('RUNTIME_ERROR:', e.message);
  } finally {
    if (browser) await browser.close();
  }
})();
