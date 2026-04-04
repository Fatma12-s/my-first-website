const firebaseConfig = {
  apiKey: "AIzaSyDmNC9-8sRAHGqGSC9r_Zr3mk97tu3RFgc",
  authDomain: "squh-training.firebaseapp.com",
  projectId: "squh-training",
  storageBucket: "squh-training.firebasestorage.app",
  messagingSenderId: "1064112237940",
  appId: "1:1064112237940:web:94905f060413b97ad6d021",
  measurementId: "G-NNKT4PCV5T"
};

window.FIREBASE_CONFIG = firebaseConfig;

const FIREBASE_SDKS = {
  app: "https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js",
  auth: "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth-compat.js",
  firestore: "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore-compat.js",
  storage: "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage-compat.js"
};

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.getElementsByTagName('script')).find(script => script.src === src);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function getMissingFirebaseModules() {
  const missing = [];
  if (!(window.firebase && window.firebase.initializeApp)) missing.push('app');
  if (!(window.firebase && window.firebase.auth)) missing.push('auth');
  if (!(window.firebase && window.firebase.firestore)) missing.push('firestore');
  if (!(window.firebase && window.firebase.storage)) missing.push('storage');
  return missing;
}

function initFirebase() {
  try {
    if (!(window.firebase && window.firebase.initializeApp)) {
      throw new Error('Firebase App غير متوفر.');
    }

    if (!window.firebase.apps || !window.firebase.apps.length) {
      window.firebase.initializeApp(window.FIREBASE_CONFIG);
    }

    window.db = window.firebase.firestore ? window.firebase.firestore() : null;
    window.firebaseAuth = window.firebase.auth ? window.firebase.auth() : null;
    window.firebaseStorage = window.firebase.storage ? window.firebase.storage() : null;
    console.log('تم تهيئة Firebase بنجاح.');
    return true;
  } catch (e) {
    console.error('حدث خطأ أثناء تهيئة Firebase:', e);
    return false;
  }
}

window.ensureFirebaseReady = async function ensureFirebaseReady() {
  try {
    const missing = getMissingFirebaseModules();
    for (const moduleName of missing) {
      await loadScriptOnce(FIREBASE_SDKS[moduleName]);
    }
    return initFirebase();
  } catch (err) {
    console.error('فشل تحميل مكتبات Firebase:', err);
    return false;
  }
};

window.ensureFirebase = window.ensureFirebaseReady;
window.firebaseReadyPromise = window.ensureFirebaseReady();