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