const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE_ERROR:', err.message));

  const targetUrl = process.env.TARGET_URL || 'http://localhost:8000/graduates.html';
  await page.goto(targetUrl, { waitUntil: 'networkidle0' });

  // Fill fields
  await page.type('#grad-name', 'محمد أحمد');
  await page.type('#grad-email', 'm.ahmad@example.com');
  await page.type('#grad-phone', '0599001122');
  await page.type('#address', 'مسقط - اختبار');
  await page.type('#cardNo', '12345678');
  await page.type('#institute', 'جامعة المثال');

  await page.evaluate(() => {
    const clinical = document.querySelector('#clinicalAttachment');
    if (clinical) clinical.checked = true;
  });
  await page.select('#specialty', 'Training & CPD');
  await page.evaluate(() => {
    document.querySelector('#durationFrom').value = '2026-03-10';
    document.querySelector('#durationTo').value = '2026-03-20';
  });

  await page.type('#objective1', 'اختبار هدف تدريبي أول');
  await page.type('#objective2', 'اختبار هدف تدريبي ثانٍ');
  await page.evaluate(() => {
    const undertakingAgree = document.querySelector('#undertakingAgree');
    const idCardDeclaration = document.querySelector('#idCardDeclaration');
    if (undertakingAgree) undertakingAgree.checked = true;
    if (idCardDeclaration) idCardDeclaration.checked = true;
  });
  await page.type('#applicantSignature', 'محمد أحمد');

  // Attach files (use existing asset)
  const fileInput1 = await page.$('#cvFile');
  const fileInput2 = await page.$('#universityLetter');
  const fileInput3 = await page.$('#idCardCopy');
  const assetPath = path.resolve(__dirname, 'assets', 'logo.png');
  await fileInput1.uploadFile(assetPath);
  await fileInput2.uploadFile(assetPath);
  await fileInput3.uploadFile(assetPath);

  // Handle alert dialog
  page.on('dialog', async dialog => {
    console.log('Dialog message:', dialog.message());
    await dialog.accept();
  });

  // Submit form
  const invalidFields = await page.evaluate(() => {
    const form = document.querySelector('#graduates-form');
    const list = Array.from(form.querySelectorAll(':invalid')).map(el => el.id || el.name || el.tagName);
    return {
      valid: form.checkValidity(),
      invalid: list
    };
  });
  console.log('VALIDATION:', JSON.stringify(invalidFields));

  await page.click('#graduates-form button[type="submit"]');

  // Wait a moment for localStorage write
  await new Promise(resolve => setTimeout(resolve, 4000));

  // Read localStorage
  const stored = await page.evaluate(() => localStorage.getItem('formSubmissions'));
  if (!stored) {
    console.log('LOCALSTORAGE: null');
  } else {
    try {
      const parsed = JSON.parse(stored);
      const gradsCount = Array.isArray(parsed.graduates) ? parsed.graduates.length : 0;
      const lastId = gradsCount ? parsed.graduates[gradsCount - 1].id : null;
      console.log('LOCALSTORAGE_SUMMARY:', JSON.stringify({
        keys: Object.keys(parsed),
        graduatesCount: gradsCount,
        lastGraduateId: lastId
      }));
    } catch (error) {
      console.log('LOCALSTORAGE_PARSE_ERROR:', error.message);
      console.log('LOCALSTORAGE_LEN:', stored.length);
    }
  }

  await browser.close();
})();
