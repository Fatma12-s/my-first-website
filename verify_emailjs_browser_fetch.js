const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://squh-training.web.app/graduates.html', { waitUntil: 'networkidle0' });

  const result = await page.evaluate(async () => {
    const cfg = window.APP_EMAIL_CONFIG || {};
    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: cfg.emailjsServiceId,
          template_id: cfg.emailjsTemplateId,
          user_id: cfg.emailjsPublicKey,
          template_params: {
            to_email: 'fsalim@squ.edu.om',
            to_name: 'Admin',
            subject: 'Browser Fetch Verification',
            from_email: 'noreply@example.com',
            from_name: 'Verifier',
            message_html: '<b>Browser test</b>',
            message_text: 'Browser test'
          }
        })
      });

      const text = await response.text();
      return { ok: response.ok, status: response.status, body: text.slice(0, 300) };
    } catch (error) {
      return { ok: false, status: -1, body: String(error && error.message ? error.message : error) };
    }
  });

  console.log('EMAILJS_BROWSER_RESULT:', JSON.stringify(result));
  await browser.close();
})();
