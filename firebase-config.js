
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

// تحميل مكتبات Firebase إذا لم تكن موجودة
if (!window.firebase) {
  const scriptApp = document.createElement('script');
  scriptApp.src = "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
  document.head.appendChild(scriptApp);
  const scriptFirestore = document.createElement('script');
  scriptFirestore.src = "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
  document.head.appendChild(scriptFirestore);
  scriptFirestore.onload = initFirebase; // Ensure initFirebase runs after Firestore is loaded
}


// تهيئة التطبيق وقاعدة البيانات بعد تحميل المكتبات
// تعريف إعدادات Firebase على window
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDmNC9-8sRAHGqGSC9r_Zr3mk97tu3RFgc",
  authDomain: "squh-training.firebaseapp.com",
  projectId: "squh-training",
  storageBucket: "squh-training.appspot.com",
  messagingSenderId: "1064112237940",
  appId: "1:1064112237940:web:94905f060413b97ad6d021",
  measurementId: "G-NNKT4PCV5T"
};

// تهيئة التطبيق وقاعدة البيانات
function initFirebase() {
  if (window.firebase && window.firebase.initializeApp) {
    if (!window.firebase.apps || !window.firebase.apps.length) {
      window.firebase.initializeApp(window.FIREBASE_CONFIG);
    }
    window.db = window.firebase.firestore();
  }
}

// انتظر تحميل المكتبات ثم نفذ التهيئة
// لا حاجة لاستخدام setTimeout، سيتم استدعاء initFirebase بعد تحميل المكتبات