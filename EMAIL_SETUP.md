# إعداد إشعارات الإيميل (وضع آمن)

هذا المشروع يدعم طريقتين لإرسال الإيميل:

1. **آمن (مُوصى به):** عبر Endpoint (Cloud Function) بدون كشف SendGrid API Key في المتصفح.
2. **مباشر من المتصفح:** عبر `apiKey` داخل `firebase-config.js` (غير مناسب للإنتاج).

## 1) إعداد Endpoint آمن عبر Firebase Functions

### المتطلبات
- مشروع Firebase مفعل
- Node.js 20+
- Firebase CLI

### إنشاء Function
داخل مجلد جديد `functions` (أو مشروع functions الحالي) استخدم مثالًا مثل:

```js
// functions/index.js
const functions = require('firebase-functions');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(functions.config().sendgrid.key);

exports.sendEmailNotification = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const payload = req.body || {};
    if (!payload.personalizations || !payload.from || !payload.content) {
      return res.status(400).send('Invalid payload');
    }

    await sgMail.send(payload);
    return res.status(200).send({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ ok: false, error: 'send-failed' });
  }
});
```

### ضبط السرّ
```bash
firebase functions:config:set sendgrid.key="SG.xxxxx"
```

### النشر
```bash
firebase deploy --only functions:sendEmailNotification
```

بعد النشر ستحصل على رابط مثل:

`https://us-central1-YOUR_PROJECT.cloudfunctions.net/sendEmailNotification`

## 2) ربط الموقع بالـ endpoint

في `firebase-config.js`:

```js
window.APP_EMAIL_CONFIG = {
  endpoint: "https://us-central1-YOUR_PROJECT.cloudfunctions.net/sendEmailNotification",
  apiKey: "SG.YOUR_SENDGRID_API_KEY_HERE",
  fromEmail: "noreply@your-domain.com",
  fromName: "دائرة التدريب والتطوير المهني"
};
```

> عند وجود `endpoint` صحيح، الموقع سيستخدمه تلقائيًا أولًا.

## 3) اختبار سريع

1. افتح أي نموذج (مثل `contact.html`).
2. أرسل طلبًا تجريبيًا.
3. تأكد من وصول البريد للمسؤول والمتقدم.
4. من `admin.html` غيّر الحالة إلى موافقة/رفض وتأكد من وصول بريد القرار.

## ملاحظة أمنية
- لا تضع مفاتيح حساسة في الواجهة الأمامية بالإنتاج.
- استخدم دومًا `endpoint` آمن + أسرار على الخادم.
