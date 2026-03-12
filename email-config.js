// إعدادات البريد للموقع (EmailJS)
// عبئي القيم التالية من لوحة EmailJS ثم احفظي الملف.

window.APP_EMAIL_CONFIG = {
  emailjsServiceId: "service_bzfkj3q",
  emailjsTemplateIdConfirm: "template_confirm", // قالب تأكيد الاستلام
  emailjsTemplateIdApprove: "template_approve", // قالب الموافقة
  emailjsTemplateIdReject: "template_reject",   // قالب الرفض
  emailjsPublicKey: "XIbn_hYrfaNHp7Z0F",
  sendApplicantCopy: true,

  // اختياري (Legacy): لا تستخدميه إلا إذا كان لديكم endpoint آمن في الخلفية.
  sendgridApiKey: "",
  sendgridFromEmail: "",
  sendgridFromName: ""
};
