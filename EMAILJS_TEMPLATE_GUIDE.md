# EmailJS Template Guide (for this project)

Use these exact variable names in your EmailJS template body:

- `{{to_email}}`
- `{{to_name}}`
- `{{subject}}`
- `{{from_name}}`
- `{{applicant_name}}`
- `{{applicant_email}}`
- `{{applicant_phone}}`
- `{{form_type}}`
- `{{submission_id}}`
- `{{submitted_at}}`
- `{{message_text}}`

## Suggested template body (HTML)

```html
<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.7;">
  <h3>{{subject}}</h3>
  <p><strong>إلى:</strong> {{to_name}}</p>
  <p><strong>الاسم:</strong> {{applicant_name}}</p>
  <p><strong>البريد:</strong> {{applicant_email}}</p>
  <p><strong>الهاتف:</strong> {{applicant_phone}}</p>
  <p><strong>نوع الطلب:</strong> {{form_type}}</p>
  <p><strong>رقم الطلب:</strong> {{submission_id}}</p>
  <p><strong>وقت الإرسال:</strong> {{submitted_at}}</p>
  <hr>
  <p>{{message_text}}</p>
</div>
```

## Required values in `email-config.js`

- `emailjsServiceId`
- `emailjsTemplateIdAdmin` (optional, for admin notifications)
- `emailjsTemplateId`
- `emailjsPublicKey`

Once these are set, form submission will try EmailJS first.
