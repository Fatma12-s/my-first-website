### 1. تهيئة تطبيق Firebase

```javascript
// استيراد المكتبات المطلوبة من Firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// إعداد تكوين Firebase
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// تهيئة تطبيق Firebase
const app = initializeApp(firebaseConfig);

// تهيئة خدمات Firebase
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
```

### 2. تنفيذ المصادقة باستخدام البريد الإلكتروني وكلمة المرور

```javascript
// تسجيل مستخدم جديد
const registerUser = async (email, password) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("User registered:", userCredential.user);
    } catch (error) {
        console.error("Error registering user:", error);
    }
};

// تسجيل دخول مستخدم
const loginUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("User logged in:", userCredential.user);
    } catch (error) {
        console.error("Error logging in:", error);
    }
};

// تسجيل خروج مستخدم
const logoutUser = async () => {
    try {
        await signOut(auth);
        console.log("User logged out");
    } catch (error) {
        console.error("Error logging out:", error);
    }
};
```

### 3. تنفيذ عمليات CRUD على Firestore

```javascript
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";

// إضافة مستند جديد إلى Firestore
const addDocument = async (data) => {
    try {
        const docRef = await addDoc(collection(db, "yourCollectionName"), data);
        console.log("Document added with ID:", docRef.id);
    } catch (error) {
        console.error("Error adding document:", error);
    }
};

// قراءة المستندات من Firestore
const getDocuments = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "yourCollectionName"));
        querySnapshot.forEach((doc) => {
            console.log(`${doc.id} =>`, doc.data());
        });
    } catch (error) {
        console.error("Error getting documents:", error);
    }
};

// تحديث مستند في Firestore
const updateDocument = async (docId, newData) => {
    try {
        const docRef = doc(db, "yourCollectionName", docId);
        await updateDoc(docRef, newData);
        console.log("Document updated:", docId);
    } catch (error) {
        console.error("Error updating document:", error);
    }
};

// حذف مستند من Firestore
const deleteDocument = async (docId) => {
    try {
        const docRef = doc(db, "yourCollectionName", docId);
        await deleteDoc(docRef);
        console.log("Document deleted:", docId);
    } catch (error) {
        console.error("Error deleting document:", error);
    }
};
```

### 4. رفع وتحميل الملفات من Firebase Storage

```javascript
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// رفع ملف إلى Firebase Storage
const uploadFile = async (file) => {
    const storageRef = ref(storage, `uploads/${file.name}`);
    try {
        await uploadBytes(storageRef, file);
        console.log("File uploaded:", file.name);
    } catch (error) {
        console.error("Error uploading file:", error);
    }
};

// تحميل ملف من Firebase Storage
const downloadFile = async (fileName) => {
    const fileRef = ref(storage, `uploads/${fileName}`);
    try {
        const url = await getDownloadURL(fileRef);
        console.log("File available at:", url);
        return url; // يمكنك استخدام هذا الرابط لتحميل الملف
    } catch (error) {
        console.error("Error downloading file:", error);
    }
};
```

### ملاحظات

- تأكد من استبدال `YOUR_API_KEY` و`YOUR_AUTH_DOMAIN` وغيرها من القيم في `firebaseConfig` بالقيم الخاصة بمشروعك في Firebase.
- تأكد من أن لديك مجموعة في Firestore باسم `yourCollectionName` أو استبدلها باسم المجموعة التي تريد استخدامها.
- يمكنك استخدام الدوال المذكورة أعلاه في تطبيقك حسب الحاجة، مع التأكد من التعامل مع الأخطاء بشكل صحيح.

بهذا الشكل، يكون لديك كود حديث ومنظم باستخدام Firebase v9+ مع جميع الوظائف المطلوبة.