// ===== إضافة مؤشرات البدء لحقول الملفات =====
document.addEventListener('DOMContentLoaded', () => {
  // البحث عن جميع حقول الملفات وإضافة عرض للملف المختار
  document.querySelectorAll('input[type="file"]').forEach(fileInput => {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.size > 0) { // تجاهل الملفات الفارغة
        const validation = validateFile(file);
        const container = fileInput.closest('.form-group') || fileInput.parentElement;
        
        // احذف أي رسالة سابقة
        const existingMsg = container.querySelector('.file-status');
        if (existingMsg) existingMsg.remove();
        
        // أضف رسالة جديدة
        const msg = document.createElement('div');
        msg.className = 'file-status';
        msg.style.cssText = `
          margin-top: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          ${validation.valid 
            ? 'background: #e8f5e9; color: #2e7d32;' 
            : 'background: #ffebee; color: #d32f2f;'}
        `;
        
        if (validation.valid) {
          const sizeKB = (file.size / 1024).toFixed(1);
          msg.textContent = `✅ تم تحديد الملف: ${file.name} (${sizeKB} KB)`;
        } else {
          msg.textContent = `❌ ${validation.message}`;
          // امسح الملف إذا كان غير صالح
          fileInput.value = '';
        }
        
        container.appendChild(msg);
      }
    });
  });
});

// قائمة الجوال (زر ☰)
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');
burger?.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// ===== تعيين المسئول تلقائياً =====
function assignResponsible(formName) {
  const assignments = {
    'graduates': { name: 'HR Manager', email: 'hr@hospital.com' },
    'internal-employees': { name: 'HR Director', email: 'hr.director@hospital.com' },
    'internal-others': { name: 'Admin Officer', email: 'admin@hospital.com' },
    'training-employees': { name: 'Training Lead', email: 'training@hospital.com' },
    'training-others': { name: 'Training Coordinator', email: 'training.coord@hospital.com' },
    'contact': { name: 'General Admin', email: 'info@hospital.com' }
  };
  return assignments[formName] || { name: 'Admin', email: 'admin@hospital.com' };
}

// ===== إرسال إشعار بريدي =====
async function sendNotificationEmail(applicantData, responsible) {
  try {
    // يمكن استبدال هذا بخدمة بريد حقيقية (SendGrid, Mailgun، إلخ)
    const emailPayload = {
      to: responsible.email,
      cc: applicantData.email || '',
      subject: `🔔 طلب جديد من ${applicantData.name || 'متقدم'}`,
      body: `
        تم استقبال طلب جديد يحتاج موافقتك.
        
        بيانات المتقدم:
        - الاسم: ${applicantData.name || '---'}
        - البريد: ${applicantData.email || '---'}
        - الهاتف: ${applicantData.phone || '---'}
        - التاريخ: ${applicantData.submittedAt}
        
        برجاء مراجعة الطلب في لوحة التحكم.
      `
    };
    
    // حالياً نسجل الإشعار في Console (سيتم استبدالها بـ API حقيقية)
    console.log('📧 Notification Email:', emailPayload);
    return true;
  } catch (error) {
    console.error('خطأ إرسال البريد:', error);
    return false;
  }
}

// ===== حفظ البيانات في localStorage أو Firestore =====
async function saveFormData(formName, formData) {
  // استنسخ البيانات ونظف أي حقول ملفات إلى أسماء الملفات قبل التخزين
  const sanitize = (data) => {
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      try {
        if (typeof File !== 'undefined' && v instanceof File) {
          out[k] = v.name;
        } else if (typeof File !== 'undefined' && v instanceof FileList) {
          out[k] = Array.from(v).map(f => f.name).join('; ');
        } else {
          out[k] = v;
        }
      } catch (err) {
        out[k] = v;
      }
    }
    return out;
  };

  const cleaned = sanitize(formData);
  cleaned.submittedAt = new Date().toLocaleString('ar-SA');
  cleaned.submittedAtISO = new Date().toISOString();
  cleaned.id = Date.now();
  cleaned.formType = formName;
  
  // إضافة نظام الحالات والتعيين التلقائي
  cleaned.status = 'Pending'; // Pending, Approved, Rejected
  const responsible = assignResponsible(formName);
  cleaned.assignedTo = responsible.name;
  cleaned.assignedEmail = responsible.email;
  cleaned.createdAt = new Date().toISOString();
  
  // إرسال إشعار بريدي (يعمل بدون انتظار)
  sendNotificationEmail(cleaned, responsible);

  // إذا كان Firebase متاحاً، احفظ في Firestore
  if (window.FIREBASE_CONFIG && window.firebase && window.firebase.firestore) {
    try {
      const result = await window.firebase.firestore().collection('formSubmissions').add(cleaned);
      cleaned.firestoreId = result.id;
      return { success: true, data: cleaned };
    } catch (e) {
      console.error('Firebase Error:', e);
      // المتابعة مع localStorage كبديل
    }
  }

  // احفظ محلياً (Firebase متعطل أو غير متوفر)
  let allSubmissions = JSON.parse(localStorage.getItem('formSubmissions')) || {};
  if (!allSubmissions[formName]) allSubmissions[formName] = [];
  allSubmissions[formName].push(cleaned);
  localStorage.setItem('formSubmissions', JSON.stringify(allSubmissions));
  return { success: true, data: cleaned, local: true };
}

// ===== استمارة تدريب الطلاب والخريجين =====
const graduatesForm = document.getElementById('graduates-form');
if (graduatesForm) {
  graduatesForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleFormSubmit(graduatesForm, 'graduates');
  });
}

// ===== استمارة البرامج الداخلية - الموظفين =====
const internalEmployeesForm = document.getElementById('internal-employees-form');
if (internalEmployeesForm) {
  internalEmployeesForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleFormSubmit(internalEmployeesForm, 'internal-employees');
  });
}

// ===== استمارة البرامج الداخلية - غير الموظفين =====
const internalOthersForm = document.getElementById('internal-others-form');
if (internalOthersForm) {
  internalOthersForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleFormSubmit(internalOthersForm, 'internal-others');
  });
}

// ===== استمارة البرامج التدريبية - الموظفين =====
const trainingEmployeesForm = document.getElementById('training-employees-form');
if (trainingEmployeesForm) {
  trainingEmployeesForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleFormSubmit(trainingEmployeesForm, 'training-employees');
  });
}

// ===== استمارة البرامج التدريبية - غير الموظفين =====
const trainingOthersForm = document.getElementById('training-others-form');
if (trainingOthersForm) {
  trainingOthersForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleFormSubmit(trainingOthersForm, 'training-others');
  });
}

// ===== استمارة التواصل =====
const contactForm = document.getElementById('contactForm') || document.querySelector('form:has(textarea[name="message"])');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleFormSubmit(contactForm, 'contact');
  });
}

// ===== Firebase upload helpers (optional) =====
async function loadFirebaseSDK() {
  if (window.firebase && window.firebase.storage) return;
  const scripts = [
    'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js'
  ];
  for (const src of scripts) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }
}

async function ensureFirebase() {
  if (!window.FIREBASE_CONFIG) return false;
  if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
    await loadFirebaseSDK();
    try {
      window.firebase.initializeApp(window.FIREBASE_CONFIG);
    } catch (err) {
      // ignore if already initialized
    }
  }
  return !!(window.firebase && window.firebase.storage);
}

async function uploadFileToFirebase(file, remotePath) {
  if (!file || !file.name) return null;
  
  try {
    const ok = await ensureFirebase();
    if (!ok) {
      console.warn('Firebase Storage not available');
      return null;
    }
    
    if (!window.firebase || !window.firebase.storage) {
      console.warn('Firebase Storage SDK not loaded');
      return null;
    }

    const storageRef = window.firebase.storage().ref();
    const ref = storageRef.child(remotePath);
    
    // رفع الملف مع مراقبة التقدم
    const snapshot = await ref.put(file);
    
    // احصل على رابط التحميل
    const url = await snapshot.ref.getDownloadURL();
    console.log(`✅ File uploaded: ${remotePath}`);
    return url;
  } catch (error) {
    console.error(`Failed to upload file to Firebase:`, error);
    // إذا فشل Firebase، سيعود handleFormSubmit إلى حفظ اسم الملف فقط
    return null;
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('تعذر قراءة الملف محلياً'));
    reader.readAsDataURL(file);
  });
}

async function buildAttachmentValue(file, formName, useFirebase) {
  const fallbackMeta = {
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    source: 'local-name'
  };

  if (useFirebase) {
    const remotePath = `${formName}/${Date.now()}_${file.name}`;
    const url = await uploadFileToFirebase(file, remotePath);
    if (url) {
      return {
        ...fallbackMeta,
        source: 'firebase',
        url
      };
    }
  }

  try {
    const dataUrl = await fileToDataUrl(file);
    return {
      ...fallbackMeta,
      source: 'local-dataurl',
      dataUrl
    };
  } catch (error) {
    console.warn('تعذر حفظ الملف كرابط محلي، سيتم حفظ الاسم فقط:', error);
    return fallbackMeta;
  }
}

async function handleFormSubmit(formEl, formName) {
  const submitBtn = formEl.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn?.textContent || 'إرسال';
  
  // ظهر حالة التحميل
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ جاري الإرسال...';
  }

  try {
    const fd = new FormData(formEl);
    const obj = {};
    const useFirebase = !!window.FIREBASE_CONFIG;
    
    // تحقق من الملفات أولاً (تجاهل الملفات الفارغة والاختيارية)
    for (const [k, v] of fd.entries()) {
      if (v instanceof File && v.name && v.size > 0) {
        const validation = validateFile(v);
        if (!validation.valid) {
          throw new Error(validation.message);
        }
      }
    }

    // رفع الملفات أو احفظها محلياً كروابط قابلة للفتح (تجاهل الملفات الفارغة)
    for (const [k, v] of fd.entries()) {
      if (v instanceof File && v.name && v.size > 0) {
        obj[k] = await buildAttachmentValue(v, formName, useFirebase);
      } else if (!(v instanceof File)) {
        obj[k] = v;
      }
    }

    // حفظ الطلب
    const result = await saveFormData(formName, obj);
    if (result.success) {
      showSuccessMessage(formName, result.data, result.local);
      formEl.reset();
    } else {
      throw new Error('فشل حفظ البيانات');
    }
  } catch (error) {
    showErrorMessage(error.message || 'حدث خطأ غير متوقع');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  }
}

// ===== التحقق من صحة الملفات =====
function validateFile(file) {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  
  // تجاهل الملفات الفارغة (الاختيارية)
  if (!file || !file.size) {
    return { valid: true }; // ملف فارغ = لا توجد مشكلة (اختياري)
  }
  
  if (file.size > maxSize) return { valid: false, message: 'حجم الملف يتجاوز 5MB' };
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, message: `نوع الملف غير مدعوم: ${file.type}` };
  }
  return { valid: true };
}

// ===== عرض رسالة النجاح =====
function showSuccessMessage(formName, data, isLocal) {
  const container = document.body;
  const modal = document.createElement('div');
  modal.className = 'success-modal';
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 32px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    z-index: 10000;
    max-width: 500px;
    text-align: center;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    direction: rtl;
    animation: slideIn 0.3s ease-out;
  `;

  const content = document.createElement('div');
  let message = `✅ تم تقديم طلبك بنجاح!\n\n`;
  message += `رقم الطلب: ${data.id}\n`;
  message += `التاريخ: ${data.submittedAt}\n`;
  
  if (formName === 'graduates') {
    message += `\nحالة الطلب: في انتظار الموافقة\nسيتم التواصل معك قريباً`;
  }
  
  if (isLocal) {
    message += `\n\n⚠️ نُباه: تم حفظ طلبك محلياً`;
  }

  content.textContent = message;
  content.style.cssText = 'white-space: pre-line; line-height: 1.6; margin-bottom: 20px;';
  
  const button = document.createElement('button');
  button.textContent = 'إغلاق';
  button.style.cssText = `
    padding: 10px 24px;
    background: #295c4a;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    transition: opacity 0.2s;
  `;
  button.onmouseover = () => button.style.opacity = '0.9';
  button.onmouseout = () => button.style.opacity = '1';
  button.onclick = () => {
    modal.remove();
    overlay.remove();
  };

  modal.appendChild(content);
  modal.appendChild(button);
  
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 9999;
  `;
  overlay.onclick = () => {
    modal.remove();
    overlay.remove();
  };

  container.appendChild(overlay);
  container.appendChild(modal);
  
  // أضف CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translate(-50%, -60%);
        opacity: 0;
      }
      to {
        transform: translate(-50%, -50%);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
}

// ===== عرض رسالة الخطأ =====
function showErrorMessage(message) {
  const container = document.body;
  const modal = document.createElement('div');
  modal.className = 'error-modal';
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 32px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    z-index: 10000;
    max-width: 500px;
    text-align: center;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    direction: rtl;
    animation: slideIn 0.3s ease-out;
  `;

  const content = document.createElement('div');
  content.innerHTML = `❌ حدث خطأ<br><br>${message}`;
  content.style.cssText = 'line-height: 1.6; margin-bottom: 20px; color: #d32f2f;';
  
  const button = document.createElement('button');
  button.textContent = 'حسناً';
  button.style.cssText = `
    padding: 10px 24px;
    background: #d32f2f;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    transition: opacity 0.2s;
  `;
  button.onmouseover = () => button.style.opacity = '0.9';
  button.onmouseout = () => button.style.opacity = '1';
  button.onclick = () => {
    modal.remove();
    overlay.remove();
  };

  modal.appendChild(content);
  modal.appendChild(button);
  
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 9999;
  `;
  overlay.onclick = () => {
    modal.remove();
    overlay.remove();
  };

  container.appendChild(overlay);
  container.appendChild(modal);
}