// ملف إعدادات Firebase
// ضع بيانات الربط هنا

window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// إعدادات البريد لتفعيل إشعارات الإيميل عبر SendGrid
// ضع بياناتك الفعلية هنا
window.APP_EMAIL_CONFIG = {
  endpoint: "",
  emailjsServiceId: "service_bzfkj3q",
  emailjsTemplateId: "template_ihph0ia",
  // اختياري: قالب مخصص لإشعار القرار، وإن تُرك فارغًا سيتم استخدام emailjsTemplateId
  emailjsDecisionTemplateId: "",
  emailjsPublicKey: "XIbn_hYrfaNHp7Z0F",
  apiKey: "SG.YOUR_SENDGRID_API_KEY_HERE",
  fromEmail: "fsalim@squ.edu.om",
  fromName: "دائرة التدريب والتطوير المهني"
};
