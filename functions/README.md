# Firebase Functions - Email Notifications

## Quick Start

1) Install Firebase CLI (once):

```bash
npm i -g firebase-tools
```

2) Login + link project:

```bash
firebase login
firebase use --add
```

3) Install dependencies:

```bash
cd functions
npm install
```

4) Set SendGrid secret key:

```bash
firebase functions:config:set sendgrid.key="SG.xxxxx"
```

5) Deploy function:

```bash
npm run deploy
```

## Endpoint URL

After deploy, copy the URL for `sendEmailNotification` and put it in:

`firebase-config.js`:

```js
window.APP_EMAIL_CONFIG = {
  endpoint: "https://us-central1-YOUR_PROJECT.cloudfunctions.net/sendEmailNotification",
  fromEmail: "noreply@your-domain.com",
  fromName: "دائرة التدريب والتطوير المهني"
};
```

## Notes

- This endpoint accepts SendGrid Mail Send payload.
- API key stays server-side (safe for production).
