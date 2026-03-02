const functions = require('firebase-functions');
const sgMail = require('@sendgrid/mail');

function getSendGridKey() {
  try {
    const keyFromConfig = functions.config().sendgrid && functions.config().sendgrid.key;
    return keyFromConfig || process.env.SENDGRID_API_KEY || '';
  } catch (error) {
    return process.env.SENDGRID_API_KEY || '';
  }
}

exports.sendEmailNotification = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method-not-allowed' });
  }

  const apiKey = getSendGridKey();
  if (!apiKey || apiKey.includes('YOUR_')) {
    return res.status(500).json({ ok: false, error: 'sendgrid-key-not-configured' });
  }

  const payload = req.body || {};
  if (!payload.personalizations || !payload.from || !payload.content) {
    return res.status(400).json({ ok: false, error: 'invalid-payload' });
  }

  try {
    sgMail.setApiKey(apiKey);
    await sgMail.send(payload);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('sendEmailNotification failed:', error?.response?.body || error);
    return res.status(500).json({ ok: false, error: 'send-failed' });
  }
});
