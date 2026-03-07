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

// ===== إعدادات البريد (EmailJS أساسي + SendGrid احتياطي) =====
function getMailConfig() {
  const cfg = window.APP_EMAIL_CONFIG || window.EMAILJS_CONFIG || {};

  const clean = (value) => {
    const str = String(value || '').trim();
    return str && !str.includes('YOUR_') ? str : '';
  };

  const sendgridApiKey = clean(cfg.sendgridApiKey || cfg.apiKey);
  const sendgridFromEmail = clean(cfg.sendgridFromEmail || cfg.fromEmail);
  const sendgridFromName = clean(cfg.sendgridFromName || cfg.fromName) || 'دائرة التدريب والتطوير المهني';
  const sendApplicantCopy = cfg.sendApplicantCopy === true || String(cfg.sendApplicantCopy).toLowerCase() === 'true';

  return {
    sendgridApiKey,
    sendgridFromEmail,
    sendgridFromName,
    sendApplicantCopy,
    emailjsServiceId: clean(cfg.emailjsServiceId || cfg.serviceId),
    emailjsTemplateId: clean(cfg.emailjsTemplateId || cfg.templateId),
    emailjsPublicKey: clean(cfg.emailjsPublicKey || cfg.publicKey)
  };
}

// ===== قائمة المسؤولين (ملء البيانات الفعلية هنا) =====
const RESPONSIBLE_CONTACTS = {
  'graduates': { 
    name: 'مدير الموارد البشرية', 
    email: 'fsalim@squ.edu.om'
  },
  'internal-employees': { 
    name: 'مدير الموارد البشرية', 
    email: 'fsalim@squ.edu.om'
  },
  'internal-others': { 
    name: 'الموظف الإداري', 
    email: 'fsalim@squ.edu.om'
  },
  'training-employees': { 
    name: 'منسق التدريب', 
    email: 'fsalim@squ.edu.om'
  },
  'training-others': { 
    name: 'منسق التدريب', 
    email: 'fsalim@squ.edu.om'
  },
  'contact': { 
    name: 'الإدارة العامة', 
    email: 'fsalim@squ.edu.om'
  }
};

// ===== تعيين المسئول تلقائياً =====
function assignResponsible(formName) {
  return RESPONSIBLE_CONTACTS[formName] || { 
    name: 'الإدارة', 
    email: 'fsalim@squ.edu.om'
  };
}

// ===== إرسال إشعار بريدي (EmailJS أساسي) =====
async function sendNotificationEmail(applicantData, responsible) {
  try {
    const mailConfig = getMailConfig();
    const applicantName = applicantData.name || applicantData.fullName || applicantData.applicantName || 'متقدم';
    const applicantEmail = applicantData.email || applicantData.applicantEmail || '---';
    const applicantPhone = applicantData.phone || applicantData.mobile || applicantData.telephone || '---';
    const submittedAt = applicantData.submittedAt || '---';
    const formType = applicantData.formType || '---';
    const submissionId = applicantData.id || '---';
    const freeTextMessage = applicantData.message || applicantData.notes || applicantData.objective1 || '';

    const detailsText =
      `الاسم: ${applicantName}\n` +
      `البريد: ${applicantEmail}\n` +
      `الهاتف: ${applicantPhone}\n` +
      `نوع الطلب: ${formType}\n` +
      `رقم الطلب: ${submissionId}\n` +
      `التاريخ: ${submittedAt}\n` +
      (freeTextMessage ? `الرسالة/الملاحظات: ${freeTextMessage}` : '');

    const sendViaSendGrid = async () => {
      if (!mailConfig.sendgridApiKey || !mailConfig.sendgridFromEmail) {
        return false;
      }

      const emailPayload = {
        personalizations: [
          {
            to: [{ email: responsible.email, name: responsible.name }],
            subject: `طلب جديد من ${applicantData.name || 'متقدم'}`
          }
        ],
        from: {
          email: mailConfig.sendgridFromEmail,
          name: mailConfig.sendgridFromName
        },
        content: [
          {
            type: 'text/plain',
            value:
              `تم استلام طلب جديد\n` +
              `الاسم: ${applicantData.name || '---'}\n` +
              `البريد: ${applicantData.email || '---'}\n` +
              `الهاتف: ${applicantData.phone || '---'}\n` +
              `نوع الطلب: ${applicantData.formType || '---'}\n` +
              `رقم الطلب: ${applicantData.id || '---'}\n` +
              `التاريخ: ${applicantData.submittedAt || '---'}`
          }
        ]
      };

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mailConfig.sendgridApiKey}`
        },
        body: JSON.stringify(emailPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SendGrid ${response.status}: ${errorText}`);
      }

      console.log('✅ تم إرسال البريد عبر SendGrid');
      return true;
    };

    const sendViaEmailJs = async () => {
      if (!mailConfig.emailjsServiceId || !mailConfig.emailjsTemplateId || !mailConfig.emailjsPublicKey) {
        return false;
      }

      const sendOne = async (targetEmail, targetName, subjectPrefix) => {
      const finalSubject = `${subjectPrefix} - ${applicantName}`;
      const payload = {
        service_id: mailConfig.emailjsServiceId,
        template_id: mailConfig.emailjsTemplateId,
        user_id: mailConfig.emailjsPublicKey,
        template_params: {
          // مفاتيح أساسية
          to_email: targetEmail,
          to_name: targetName,
          subject: finalSubject,
          from_name: 'دائرة التدريب والتطوير المهني',

          // مفاتيح المشروع الحالية
          applicant_name: applicantName,
          applicant_email: applicantEmail,
          applicant_phone: applicantPhone,
          form_type: formType,
          submission_id: submissionId,
          submitted_at: submittedAt,
          message_text: detailsText,

          // مفاتيح fallback لقوالب EmailJS الافتراضية
          title: finalSubject,
          name: applicantName,
          email: applicantEmail,
          phone: applicantPhone,
          time: submittedAt,
          message: detailsText,
          details: detailsText,
          reply_to: applicantEmail
        }
      };

      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`EmailJS ${response.status}: ${errorText}`);
      }
      };

      await sendOne(responsible.email, responsible.name, '🔔 طلب جديد يحتاج مراجعة');

      if (mailConfig.sendApplicantCopy && applicantData.email) {
        await sendOne(applicantData.email, applicantData.name || 'مقدم الطلب', '✅ تم استلام طلبك');
      }

      console.log('✅ تم إرسال البريد عبر EmailJS إلى المسؤول ومقدم الطلب');
      return true;
    };

    const sentByEmailJs = await sendViaEmailJs();
    if (sentByEmailJs) return true;

    // احتياطي: SendGrid (مفيد فقط إن كان هناك endpoint/Proxy مناسب)
    const sentBySendGrid = await sendViaSendGrid();
    if (sentBySendGrid) return true;

    if (!mailConfig.sendgridApiKey && !mailConfig.emailjsPublicKey) {
      console.log('📧 لم يتم ضبط إعدادات البريد بعد - سيتم حفظ الطلب بدون إرسال بريد');
      return true;
    }

    console.warn('⚠️ تم توفير إعدادات بريد جزئية فقط، يرجى استكمال التهيئة');
    return false;
  } catch (error) {
    console.error('❌ خطأ في إرسال البريد:', error);
    return false;
  }
}

// ===== حفظ البيانات في localStorage أو Firestore =====
async function saveFormData(formName, formData) {
  const FIRESTORE_SAVE_TIMEOUT_MS = 5000;

  const withTimeout = (promise, timeoutMs) =>
    Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firestore timeout')), timeoutMs);
      })
    ]);

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

  // توافق مع النسخة السابقة: حفظ حقول Section 2 بأسماء مفهومة للوحة الموافقات.
  if (formName === 'graduates') {
    cleaned.department = cleaned.department || cleaned.specialtyDepartment || '';
    if (!cleaned.duration) {
      const from = cleaned.durationFrom || '';
      const to = cleaned.durationTo || '';
      cleaned.duration = from && to ? `${from} -> ${to}` : from || to || '';
    }
  }
  
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
      const result = await withTimeout(
        window.firebase.firestore().collection('formSubmissions').add(cleaned),
        FIRESTORE_SAVE_TIMEOUT_MS
      );
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

function hasValidFirebaseConfig() {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || typeof cfg !== 'object') return false;
  const required = ['apiKey', 'projectId', 'storageBucket', 'appId'];
  return required.every((key) => {
    const value = String(cfg[key] || '').trim();
    return value && !value.includes('YOUR_');
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

  // للحفاظ على سرعة الإرسال، نكتفي ببيانات الملف الأساسية عند عدم توفر Firebase.
  return fallbackMeta;
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
    const useFirebase = hasValidFirebaseConfig();
    
    // تحقق من الملفات أولاً (تجاهل الملفات الفارغة والاختيارية)
    for (const [k, v] of fd.entries()) {
      if (v instanceof File && v.name && v.size > 0) {
        const validation = validateFile(v);
        if (!validation.valid) {
          throw new Error(validation.message);
        }
      }
    }

    // رفع/معالجة الملفات بالتوازي لتقليل وقت الانتظار
    const entries = Array.from(fd.entries());
    const fileTasks = entries
      .filter(([, v]) => v instanceof File && v.name && v.size > 0)
      .map(async ([k, v]) => {
        obj[k] = await buildAttachmentValue(v, formName, useFirebase);
      });
    await Promise.all(fileTasks);

    // الحقول النصية
    for (const [k, v] of entries) {
      if (!(v instanceof File)) {
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