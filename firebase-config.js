// تحميل مكتبات Firebase عبر CDN
const firebaseConfig = {
  apiKey: "AIzaSyDmNC9-8sRAHGqGSC9r_Zr3mk97tu3RFgc",
  authDomain: "squh-training.firebaseapp.com",
  projectId: "squh-training",
  storageBucket: "squh-training.appspot.com",
  messagingSenderId: "1064112237940",
  appId: "1:1064112237940:web:94905f060413b97ad6d021",
  measurementId: "G-NNKT4PCV5T"
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
  scriptApp.src = "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
  scriptApp.onload = () => {
    const scriptFirestore = document.createElement('script');
    scriptFirestore.src = "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
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