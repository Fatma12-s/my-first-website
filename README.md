# 🎓 SQUH Training Portal — موقع التدريب

موقع ويب لإدارة طلبات التدريب في جامعة السلطان قابوس للصحة (SQUH).  
يتيح للمتقدمين تقديم طلبات التدريب، وللمسؤولين مراجعتها وإدارتها.

---

## ✨ الميزات الرئيسية

- 📋 نماذج تقديم للخريجين والموظفين والآخرين
- 📂 رفع المستندات وحفظها في Firebase Storage
- 🔔 إشعارات بريد إلكتروني تلقائية عبر EmailJS
- 👩‍💼 لوحة إدارة لمراجعة الطلبات والموافقة عليها أو رفضها
- 📊 لوحة بيانات مرئية (Dashboard Charts)
- 📄 تصدير الطلبات بصيغة PDF

---

## 🏗️ بنية المشروع

```
my-first-website/
├── index.html                  # الصفحة الرئيسية
├── about.html                  # صفحة عن الموقع
├── contact.html                # صفحة التواصل
├── programs.html               # برامج التدريب
├── graduates.html              # نموذج تقديم الخريجين
├── training-employees.html     # نموذج تقديم موظفي المستشفى
├── training-others.html        # نموذج تقديم الآخرين
├── internal-employees.html     # نموذج التدريب الداخلي
├── internal-others.html        # نموذج الداخلي للآخرين
├── admin.html                  # لوحة الإدارة
├── admin-login.html            # تسجيل دخول المدير
├── admin-register.html         # تسجيل مدير جديد
├── dashboard-chart.html        # لوحة الإحصائيات
├── profile.html                # الملف الشخصي
├── script.js                   # الكود الرئيسي
├── style.css                   # ملف التنسيقات
├── firebase-config.example.js  # نموذج إعدادات Firebase
├── email-config.example.js     # نموذج إعدادات EmailJS
├── firebase-js-app/            # تطبيق Node.js لـ Firebase
└── functions/                  # Firebase Cloud Functions
```

---

## 🚀 خطوات التثبيت والإعداد

### 1. نسخ المشروع

```bash
git clone https://github.com/Fatma12-s/my-first-website.git
cd my-first-website
```

### 2. إعداد Firebase

1. أنشئ مشروعًا جديدًا في [Firebase Console](https://console.firebase.google.com/)
2. فعّل خدمات **Firestore** و **Storage**
3. انسخ ملف الإعداد النموذجي:
   ```bash
   cp firebase-config.example.js firebase-config.js
   ```
4. افتح `firebase-config.js` وأدخل بيانات مشروعك:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_REAL_API_KEY",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project-id.appspot.com",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

### 3. إعداد EmailJS

1. سجّل في [EmailJS](https://www.emailjs.com/) وأنشئ خدمة وقوالب بريد
2. انسخ ملف الإعداد النموذجي:
   ```bash
   cp email-config.example.js email-config.js
   ```
3. افتح `email-config.js` وأدخل بياناتك:
   ```javascript
   window.APP_EMAIL_CONFIG = {
     emailjsServiceId: "service_xxxxxxx",
     emailjsTemplateIdConfirm: "template_xxxxxxx",
     emailjsPublicKey: "YOUR_PUBLIC_KEY",
     ...
   };
   ```

### 4. تشغيل الموقع

افتح `index.html` في متصفحك مباشرة، أو استخدم خادم محلي:

```bash
# باستخدام Python
python3 -m http.server 8080

# أو باستخدام VS Code Live Server
```

---

## 🔒 إرشادات الأمان

> ⚠️ **تحذير هام**: لا تُدرج ملفات الإعداد التي تحتوي على مفاتيح حقيقية في Git!

الملفات التالية مُضافة في `.gitignore` وتحتوي على بياناتك السرية:

| الملف | الوصف |
|-------|-------|
| `firebase-config.js` | مفاتيح Firebase الحقيقية |
| `email-config.js` | مفاتيح EmailJS الحقيقية |
| `.env` | متغيرات البيئة |

**بدلاً منها، استخدم الملفات النموذجية:**

| الملف | الوصف |
|-------|-------|
| `firebase-config.example.js` | نموذج إعداد Firebase (بدون مفاتيح) |
| `email-config.example.js` | نموذج إعداد EmailJS (بدون مفاتيح) |

### قواعد Firebase Security Rules

تأكد من إعداد قواعد أمان مناسبة في Firebase Console لحماية بياناتك.  
مثال على قواعد Firestore للإنتاج:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 🧪 الاختبارات

يتضمن المشروع اختبارات أساسية للتحقق من صحة ملفات الإعداد:

```bash
npm test
```

تتحقق الاختبارات من:
- ✅ وجود ملفات النماذج
- ✅ صحة بنية إعدادات Firebase
- ✅ صحة بنية إعدادات EmailJS
- ✅ عدم وجود مفاتيح حقيقية في ملفات النماذج

---

## 🛠️ التقنيات المستخدمة

| التقنية | الاستخدام |
|---------|-----------|
| HTML5 / CSS3 | واجهة المستخدم |
| JavaScript (Vanilla) | المنطق البرمجي |
| Firebase Firestore | قاعدة البيانات |
| Firebase Storage | تخزين الملفات |
| EmailJS | إرسال البريد الإلكتروني |
| Chart.js | الرسوم البيانية |

---

## 🤝 المساهمة

1. Fork المشروع
2. أنشئ فرعًا جديدًا: `git checkout -b feature/your-feature`
3. تأكد من عدم إدراج ملفات الإعداد السرية
4. أرسل Pull Request

---

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة ISC.
