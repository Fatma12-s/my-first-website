// انسخ هذا الملف إلى "email-config.js" وأدخل بيانات EmailJS لديك
// ثم أضف <script src="email-config.js"></script> في صفحاتك قبل script.js

window.APP_EMAIL_CONFIG = {
  // معرّف الخدمة من لوحة تحكم EmailJS
  emailjsServiceId: "YOUR_SERVICE_ID",

  // معرّفات القوالب (Templates) من لوحة تحكم EmailJS
  emailjsTemplateIdConfirm: "YOUR_TEMPLATE_ID_CONFIRM",
  emailjsTemplateIdApprove: "YOUR_TEMPLATE_ID_APPROVE",
  emailjsTemplateIdReject: "YOUR_TEMPLATE_ID_REJECT",

  // المفتاح العام (Public Key) من إعدادات حساب EmailJS
  emailjsPublicKey: "YOUR_PUBLIC_KEY",

  // هل ترسل نسخة للمتقدم؟
  sendApplicantCopy: true
};
