// تحميل مكتبات Firebase عبر CDN
// ⚠️ انسخ هذا الملف من firebase-config.example.js وأدخل بياناتك الحقيقية
// لا تُدرج هذا الملف في Git إذا كان يحتوي على مفاتيح حقيقية
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// تعريف إعدادات Firebase على window
window.FIREBASE_CONFIG = firebaseConfig;

// دالة لتحميل مكتبات Firebase عبر CDN
function loadFirebaseScripts(callback) {
  if (window.firebase && window.firebase.initializeApp) {
    callback();
    return;
  }
  const scriptApp = document.createElement('script');
  scriptApp.src = "https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js";
  scriptApp.onload = () => {
    const scriptFirestore = document.createElement('script');
    scriptFirestore.src = "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore-compat.js";
    scriptFirestore.onload = callback;
    scriptFirestore.onerror = () => {
      console.error("فشل تحميل مكتبة Firestore.");
    };
    document.head.appendChild(scriptFirestore);
  };
  scriptApp.onerror = () => {
    console.error("فشل تحميل مكتبة Firebase App.");
  };
  document.head.appendChild(scriptApp);
}

// تحميل المكتبات ثم التهيئة
loadFirebaseScripts(initFirebase);

// تهيئة التطبيق وقاعدة البيانات
function initFirebase() {
  try {
    if (window.firebase && window.firebase.initializeApp) {
      if (!window.firebase.apps || !window.firebase.apps.length) {
        window.firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      window.db = window.firebase.firestore();
      console.log("تم تهيئة Firebase بنجاح.");
    } else {
      console.error("Firebase غير متوفر بعد تحميل المكتبات.");
    }
  } catch (e) {
    console.error("حدث خطأ أثناء تهيئة Firebase:", e);
  }
}