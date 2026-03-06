const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const fileUrl = 'file://' + path.resolve(__dirname, 'graduates.html');
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  // Fill fields
  await page.type('#grad-name', 'محمد أحمد');
  await page.type('#grad-email', 'm.ahmad@example.com');
  await page.type('#grad-phone', '0599001122');
  await page.type('#grad-university', 'جامعة المثال');
  await page.type('#grad-major', 'طب');
  await page.evaluate(() => document.querySelector('#grad-graduation').value = '2024-06-15');
  await page.type('#grad-message', 'اختبار إرسال النموذج');

  // Attach files (use existing asset)
  const fileInput1 = await page.$('#grad-certificate');
  const fileInput2 = await page.$('#grad-id');
  const assetPath = path.resolve(__dirname, 'assets', 'logo.png');
  await fileInput1.uploadFile(assetPath);
  await fileInput2.uploadFile(assetPath);

  // Handle alert dialog
  page.on('dialog', async dialog => {
    console.log('Dialog message:', dialog.message());
    await dialog.accept();
  });

  // Submit form
  await page.click('#graduates-form button[type="submit"]');

  // Wait a moment for localStorage write
  await page.waitForTimeout(500);

  // Read localStorage
  const stored = await page.evaluate(() => localStorage.getItem('formSubmissions'));
  console.log('LOCALSTORAGE:', stored);

  await browser.close();
})();
