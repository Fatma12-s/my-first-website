خطوات سريعة لإعداد Firebase Storage للموقع الثابت

1) أنشئ مشروعًا جديدًا في console.firebase.google.com
2) فعّل خدمة Storage من قسم "Build > Storage".
3) أنشئ قواعد مناسبة لاختبارك. مثال تجريبي (غير آمن للإنتاج):

   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if true;
       }
     }
   }

4) من إعدادات المشروع (Project settings) انسخ تكوين الويب (Firebase SDK snippet) وضعه في ملف `firebase-config.js` بالشكل التالي:

   window.FIREBASE_CONFIG = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };

5) أضف المرجع لملف التكوين قبل `script.js` في كل صفحة نموذج لديك، مثال في أسفل الصفحة قبل سطر ` <script src="script.js"></script>`:

   <script src="firebase-config.js"></script>
   <script src="script.js"></script>

6) الآن عند إرسال نموذج يحتوي على ملفات، سيقوم `script.js` برفع الملفات إلى Firebase Storage وحفظ روابط التحميل في `localStorage` بدلاً من أسماء الملفات.

ملاحظة أمان: لا تستخدم قواعد التخزين المفتوحة في الإنتاج. أنشئ قواعد تسمح بالرفع للمستخدمين الموثوقين أو استخدم قواعد تحقق إضافية (مثلاً قاعدة تعتمد على Authentication أو شروط أخرى).

---

إعداد EmailJS لقالب قرار الموافقة/الرفض (مهم)

النظام في لوحة الإدارة يعتمد قالب EmailJS مخصص لقرار الطلب، ويجب أن يكون مختلفًا عن قالب Contact Us.

1) داخل EmailJS:
- ادخل إلى Email Services وتأكد من Service ID.
- أنشئ Template جديد باسم مثل: `training_decision`.
- انسخ Template ID الجديد (مختلف عن قالب التواصل).

2) عدّل `firebase-config.js`:

window.APP_EMAIL_CONFIG = {
  endpoint: "",
  emailjsServiceId: "YOUR_EMAILJS_SERVICE_ID",
  emailjsTemplateId: "YOUR_CONTACT_TEMPLATE_ID",
  emailjsDecisionTemplateId: "YOUR_DECISION_TEMPLATE_ID",
  emailjsPublicKey: "YOUR_EMAILJS_PUBLIC_KEY",
  apiKey: "SG.YOUR_SENDGRID_API_KEY_HERE",
  fromEmail: "noreply@your-domain.com",
  fromName: "Training & CPD"
};

3) المتغيرات التي يجب إضافتها داخل قالب قرار EmailJS:
- `subject`
- `applicant_name`
- `request_id`
- `decision_status_ar`
- `section2_status`
- `section2_approved_from`
- `section2_approved_to`
- `section2_department`
- `rejection_reason`
- `message_text`

4) مثال محتوى قالب (HTML) داخل EmailJS:

<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8">
  <h2>{{subject}}</h2>
  <p>عزيزي/عزيزتي {{applicant_name}}</p>
  <p>رقم الطلب: <strong>{{request_id}}</strong></p>
  <p>حالة القرار: <strong>{{decision_status_ar}}</strong></p>
  <hr>
  <p><strong>الموافقة (Section 2):</strong> {{section2_status}}</p>
  <p><strong>تاريخ البدء:</strong> {{section2_approved_from}}</p>
  <p><strong>تاريخ الانتهاء:</strong> {{section2_approved_to}}</p>
  <p><strong>القسم:</strong> {{section2_department}}</p>
  <p><strong>سبب الرفض (إن وجد):</strong> {{rejection_reason}}</p>
  <hr>
  <p>{{message_text}}</p>
</div>

5) اختبار سريع:
- من `admin.html` غيّر حالة طلب إلى Approved أو Rejected.
- إذا كانت الإعدادات صحيحة سيصل إيميل بعنوان واضح بدون `(no subject)`.
- إذا ظهر تنبيه إعدادات غير مفعّلة، راجع أن `emailjsDecisionTemplateId` موجود ومختلف عن `emailjsTemplateId`.