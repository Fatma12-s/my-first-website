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
// استخدام window.db و window.firebase مباشرة
// يجب تعريف window.db في firebase-config.js
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
    name: 'قسم التدريب', 
    email: 'fsalim@squ.edu.om'
  },
  'internal-employees': { 
    name: 'قسم التدريب', 
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
async function sendNotificationEmail(applicantData, responsible, templateType = 'confirm') {
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

    // اختيار قالب البريد حسب النوع
    let templateId;
    if (templateType === 'confirm') templateId = mailConfig.emailjsTemplateIdConfirm;
    else if (templateType === 'approve') templateId = mailConfig.emailjsTemplateIdApprove;
    else if (templateType === 'reject') templateId = mailConfig.emailjsTemplateIdReject;
    else templateId = mailConfig.emailjsTemplateId;

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
      if (!mailConfig.emailjsServiceId || !templateId || !mailConfig.emailjsPublicKey) {
        return false;
      }

      const sendOne = async (targetEmail, targetName, subjectPrefix) => {
        const finalSubject = `${subjectPrefix} - ${applicantName}`;
        const payload = {
          service_id: mailConfig.emailjsServiceId,
          template_id: templateId,
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
  // استنسخ البيانات ونظف أي حقول ملفات إلى أسماء الملفات قبل التخزين
  const sanitize = (data) => {
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      if (String(k).startsWith('__')) continue;
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

  // تعريف cleaned قبل رفع المرفقات
  const cleaned = sanitize(formData);
  cleaned.submittedAt = new Date().toLocaleString('ar-SA');
  cleaned.submittedAtISO = new Date().toISOString();
  cleaned.id = Date.now();
  cleaned.formType = formName;

  // رفع المرفقات إلى Firebase Storage
  const attachmentFields = ['applicantPhoto', 'cv', 'idCard', 'universityLetter', 'otherAttachment'];
  for (const field of attachmentFields) {
    if (formData[field] && formData[field] instanceof File) {
      await window.fileUpload.uploadAttachment(formData[field], field, cleaned);
      // بعد الرفع، يتم حفظ رابط الملف في cleaned[field+'URL']
      cleaned[field] = undefined; // لا تحفظ الملف نفسه
    }
  }

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

  // حفظ في Firestore
  if (window.db) {
    try {
      await window.db.collection('formSubmissions').add(cleaned);
      console.log('✅ تم حفظ الطلب في Firestore مع روابط المرفقات');
      return { success: true, data: cleaned, firestore: true };
    } catch (err) {
      console.error('❌ خطأ في حفظ البيانات في Firestore:', err);
      // fallback: حفظ محلي
      saveToLocalStorage(formName, cleaned);
      return { success: false, error: err, local: true };
    }
  } else {
    saveToLocalStorage(formName, cleaned);
    return { success: true, data: cleaned, local: true };
  }
}

function saveToLocalStorage(formName, cleaned) {
  let all = {};
  try {
    all = JSON.parse(localStorage.getItem('formSubmissions')) || {};
  } catch (e) {
    all = {};
  }
  if (!all[formName]) all[formName] = [];

  // حذف أي روابط أو بيانات كبيرة قبل الحفظ
  const smallCleaned = {};
  for (const [k, v] of Object.entries(cleaned)) {
    if (typeof v === 'string' && v.length < 1000) {
      smallCleaned[k] = v;
    }
    // تجاهل أي بيانات كبيرة أو روابط
  }

  all[formName].push(smallCleaned);
  localStorage.setItem('formSubmissions', JSON.stringify(all));
}

// ===== استمارة تدريب الطلاب والخريجين =====
const graduatesForm = document.getElementById('graduates-form');
if (graduatesForm) {
  const applicantPhotoInput = document.getElementById('applicantPhoto');
  const applicantPhotoPreview = document.getElementById('applicantPhotoPreview');
  let applicantPhotoPreviewUrl = '';

  const clearApplicantPhotoPreview = () => {
    if (applicantPhotoPreviewUrl) {
      URL.revokeObjectURL(applicantPhotoPreviewUrl);
      applicantPhotoPreviewUrl = '';
    }
    if (applicantPhotoPreview) {
      applicantPhotoPreview.removeAttribute('src');
      applicantPhotoPreview.classList.remove('visible');
    }
  };

  if (applicantPhotoInput && applicantPhotoPreview) {
    applicantPhotoInput.addEventListener('change', () => {
      clearApplicantPhotoPreview();
      const file = applicantPhotoInput.files && applicantPhotoInput.files[0];
      if (!file || !isImageLikeFile(file)) return;

      applicantPhotoPreviewUrl = URL.createObjectURL(file);
      applicantPhotoPreview.src = applicantPhotoPreviewUrl;
      applicantPhotoPreview.classList.add('visible');
    });
  }

  graduatesForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleFormSubmit(graduatesForm, 'graduates');
    clearApplicantPhotoPreview();
  });

  const fillGraduatesDemoData = () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 21);
    const toDateInputValue = (d) => d.toISOString().slice(0, 10);

    const setValue = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    };
    const setChecked = (id, value = true) => {
      const el = document.getElementById(id);
      if (el) el.checked = value;
    };

    setChecked('undertakingAgree', true);
    setValue('grad-name', 'Fatma Salim (Demo)');
    setValue('address', 'Muscat - Oman (Demo Address)');
    setValue('grad-phone', '92512260');
    setValue('grad-email', 'demo.applicant@squ.edu.om');
    setValue('cardNo', '1214422');
    setValue('institute', 'Sultan Qaboos University (Demo)');
    setChecked('clinicalAttachment', true);
    setValue('specialty', 'Training & CPD');
    setValue('durationFrom', toDateInputValue(from));
    setValue('durationTo', toDateInputValue(to));
    setValue('objective1', 'Improve practical exposure in hospital training workflows.');
    setValue('objective2', 'Understand department reporting and patient communication process.');
    setChecked('idCardDeclaration', true);
    setValue('applicantSignature', 'Fatma Salim');
  };

  const buildGraduatesDemoPreviewData = async () => {
    const fd = new FormData(graduatesForm);
    const data = {
      id: `DEMO-${Date.now()}`,
      formType: 'graduates',
      submittedAt: new Date().toLocaleString('ar-SA'),
      status: 'Pending'
    };

    for (const [k, v] of fd.entries()) {
      if (v instanceof File) {
        if (v && v.name) {
          data[k] = { name: v.name, source: 'demo-file' };
          if (k === 'applicantPhoto' && isImageLikeFile(v)) {
            try {
              data.__applicantPhotoDataUrl = await fileToDataUrl(v);
            } catch (err) {
              console.warn('تعذر تجهيز معاينة صورة المتقدم:', err);
            }
          }
        }
      } else {
        data[k] = v;
      }
    }

    // التوافق مع حقول الطباعة/المراجعة
    data.department = data.department || data.specialtyDepartment || '';
    if (!data.duration) {
      const from = data.durationFrom || '';
      const to = data.durationTo || '';
      data.duration = from && to ? `${from} -> ${to}` : from || to || '';
    }

    return data;
  };

  // تفعيل زر معاينة PDF التجريبية بشكل مؤكد
  document.addEventListener('DOMContentLoaded', () => {
    const previewDemoPdfBtn = document.getElementById('previewDemoPdfBtn');
    if (previewDemoPdfBtn) {
      previewDemoPdfBtn.onclick = async () => {
        const previewData = await buildGraduatesDemoPreviewData();
        openSubmissionPrintPreview('graduates', previewData);
      };
    }
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
  if (window.firebase && window.firebase.storage && window.firebase.firestore) return;
  const scripts = [
    'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js'
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
  // لم يعد هناك رفع للسحابة أو استخدام Firebase
  const fallbackMeta = {
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    source: 'local-name'
  };
  try {
    const dataUrl = await fileToDataUrl(file);
    if (dataUrl) {
      return {
        ...fallbackMeta,
        source: 'inline-data',
        dataUrl,
        preview: dataUrl
      };
    }
  } catch (error) {
    // تجاهل أي خطأ في تحويل الملف
  }
  return fallbackMeta;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة.'));
      reader.readAsDataURL(file);
    } catch (err) {
      reject(err);
    }
  });
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
    // لم يعد هناك رفع للسحابة أو استخدام Firebase
    
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
        if (k === 'applicantPhoto' && isImageLikeFile(v)) {
          try {
            obj.__applicantPhotoDataUrl = await fileToDataUrl(v);
            obj.applicantPhotoDataUrl = obj.__applicantPhotoDataUrl;
          } catch (err) {
            console.warn('تعذر تجهيز معاينة صورة المتقدم:', err);
          }
        }
        const attachmentValue = await buildAttachmentValue(v, formName);
        if (k === 'applicantPhoto' && attachmentValue && typeof attachmentValue === 'object' && obj.applicantPhotoDataUrl) {
          attachmentValue.dataUrl = attachmentValue.dataUrl || obj.applicantPhotoDataUrl;
          attachmentValue.preview = attachmentValue.preview || obj.applicantPhotoDataUrl;
        }
        obj[k] = attachmentValue;
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
      const previewData = {
        ...result.data,
        __applicantPhotoDataUrl: obj.__applicantPhotoDataUrl || '',
        applicantPhotoDataUrl: obj.applicantPhotoDataUrl || ''
      };
      showSuccessMessage(formName, previewData, result.local);
      formEl.reset();
    } else {
      showErrorMessage('حدث خطأ أثناء حفظ الطلب، يرجى المحاولة مرة أخرى. لم يتم تفريغ البيانات.');
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

function isImageLikeFile(file) {
  if (!file) return false;
  const type = String(file.type || '').toLowerCase();
  const name = String(file.name || '').toLowerCase();
  return type.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(name);
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
  const type = String(file.type || '').toLowerCase();
  const name = String(file.name || '').toLowerCase();
  const extensionAllowed = /\.(pdf|jpg|jpeg|png)$/i.test(name);
  const mimeAllowed = allowedTypes.includes(type);
  if (!mimeAllowed && !extensionAllowed) {
    return { valid: false, message: `نوع الملف غير مدعوم: ${file.type}` };
  }
  return { valid: true };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPrintableLabel(key) {
  const labels = {
    id: 'رقم الطلب',
    submittedAt: 'تاريخ الإرسال',
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    address: 'العنوان',
    cardNo: 'رقم البطاقة',
    institute: 'الجهة',
    programRequirement: 'نوع البرنامج',
    specialtyDepartment: 'القسم',
    durationFrom: 'مدة التدريب من',
    durationTo: 'مدة التدريب إلى',
    objective1: 'هدف التدريب 1',
    objective2: 'هدف التدريب 2',
    applicantSignature: 'توقيع مقدم الطلب',
    undertakingAgree: 'الإقرار والتعهد',
    idCardDeclaration: 'تعهد البطاقة',
    applicantPhoto: 'صورة المتقدم',
    cvFile: 'السيرة الذاتية',
    universityLetter: 'خطاب الجامعة',
    idCardCopy: 'نسخة البطاقة',
    otherAttachments: 'مرفقات أخرى',
    status: 'حالة الطلب'
  };
  return labels[key] || key;
}

function getPrintableValue(value) {
  if (value === undefined || value === null || value === '') return '---';
  if (typeof value === 'object') {
    if (value.name) return value.name;
    if (value.url) return value.url;
    try {
      return JSON.stringify(value);
    } catch (err) {
      return String(value);
    }
  }
  if (String(value).toLowerCase() === 'on') return 'نعم';
  return String(value);
}

function printHtmlWithIframe(html) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => iframe.remove(), 3000);
    }, 250);
  };
}

function getFormTitle(formName) {
  const titles = {
    graduates: 'استمارة تدريب الطلاب والخريجين',
    'internal-employees': 'استمارة البرامج الداخلية - الموظفين',
    'internal-others': 'استمارة البرامج الداخلية - غير الموظفين',
    'training-employees': 'استمارة البرامج التدريبية - الموظفين',
    'training-others': 'استمارة البرامج التدريبية - غير الموظفين',
    contact: 'استمارة تواصل'
  };
  return titles[formName] || 'استمارة الطلب';
}

function getSquhHeaderLogoUrl() {
  try {
    return new URL('./assets/squh-header-logo.jpg', window.location.href).href;
  } catch (err) {
    return './assets/squh-header-logo.jpg';
  }
}

function getApplicantPhotoSrc(data) {
  const isRenderableImageSrc = (value) => {
    const src = String(value || '').trim();
    return /^(data:image\/|blob:|https?:\/\/|\.\/|\/)/i.test(src);
  };

  const directPreview = data && data.__applicantPhotoDataUrl;
  if (directPreview && isRenderableImageSrc(directPreview)) {
    return String(directPreview);
  }

  const storedPreview = data && data.applicantPhotoDataUrl;
  if (storedPreview && isRenderableImageSrc(storedPreview)) {
    return String(storedPreview);
  }

  const photo = data && data.applicantPhoto;
  if (photo && typeof photo === 'object' && photo.dataUrl && isRenderableImageSrc(photo.dataUrl)) {
    return String(photo.dataUrl);
  }
  if (photo && typeof photo === 'object' && photo.preview && isRenderableImageSrc(photo.preview)) {
    return String(photo.preview);
  }
  if (photo && typeof photo === 'object' && photo.url && isRenderableImageSrc(photo.url)) {
    return String(photo.url);
  }

  if (typeof photo === 'string' && isRenderableImageSrc(photo)) {
    return photo;
  }

  return '';
}

function openSubmissionPrintPreview(formName, data) {
  const excluded = new Set([
    'submittedAtISO',
    'createdAt',
    'assignedEmail',
    'assignedTo',
    'reviewedAt',
    'managerSection2',
    'firestoreId',
    '__applicantPhotoDataUrl'
  ]);

  const applicantPhotoSrc = getApplicantPhotoSrc(data);

  const entries = Object.entries(data || {}).filter(([key]) => !excluded.has(key));
  const isGraduates = formName === 'graduates';

  const lineValue = (value) => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'object') {
      if (value.name) return escapeHtml(String(value.name));
      if (value.url) return escapeHtml(String(value.url));
      return '';
    }
    return escapeHtml(String(value));
  };
  const reqValue = String(data?.programRequirement || '').toUpperCase();
  const isClinical = reqValue.includes('CLINICAL') && !reqValue.includes('NON-CLINICAL');
  const isNonClinical = reqValue.includes('NON-CLINICAL');
  const undertakingAgreed = ['on', 'true', 'yes', '1'].includes(String(data?.undertakingAgree || '').toLowerCase());
  const declarationAgreed = ['on', 'true', 'yes', '1'].includes(String(data?.idCardDeclaration || '').toLowerCase());
  const isOpenableAsset = (value) => /^(https?:\/\/|data:|blob:|\.\/|\/)/i.test(String(value || '').trim());
  const getAttachmentSrc = (value) => {
    if (!value) return '';
    if (typeof value === 'object') {
      const candidate = value.dataUrl || value.url || value.preview || '';
      return isOpenableAsset(candidate) ? String(candidate) : '';
    }
    return isOpenableAsset(value) ? String(value) : '';
  };
  const getAttachmentName = (value, fallbackLabel) => {
    if (!value) return fallbackLabel;
    if (typeof value === 'object' && value.name) return String(value.name);
    if (typeof value === 'string' && !isOpenableAsset(value)) return String(value);
    return fallbackLabel;
  };
  const getAttachmentKind = (value, src, name) => {
    const type = typeof value === 'object' ? String(value.type || '').toLowerCase() : '';
    const lowerName = String(name || '').toLowerCase();
    const lowerSrc = String(src || '').toLowerCase();
    if (type.startsWith('image/') || /^data:image\//.test(lowerSrc) || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(lowerName || lowerSrc)) {
      return 'image';
    }
    if (type === 'application/pdf' || /^data:application\/pdf/.test(lowerSrc) || /\.pdf(\?|#|$)/i.test(lowerName || lowerSrc)) {
      return 'pdf';
    }
    return src ? 'link' : 'missing';
  };
  const attachmentFields = [
    { key: 'idCardCopy', label: 'ID Card Copy / نسخة البطاقة الشخصية' },
    { key: 'cvFile', label: 'CV / السيرة الذاتية' },
    { key: 'universityLetter', label: 'University Letter / خطاب الجامعة' },
    { key: 'otherAttachments', label: 'Other Attachments / مرفقات أخرى' }
  ];
  const attachmentSectionsHtml = isGraduates
    ? attachmentFields.map(({ key, label }) => {
        const value = data?.[key];
        if (!value) return '';
        const src = getAttachmentSrc(value);
        const fileName = getAttachmentName(value, label);
        const kind = getAttachmentKind(value, src, fileName);
        const mediaHtml = kind === 'image'
          ? `<div class="attachment-media attachment-image"><img src="${escapeHtml(src)}" alt="${escapeHtml(fileName)}"></div>`
          : kind === 'pdf'
            ? `<div class="attachment-media attachment-pdf"><iframe src="${escapeHtml(src)}#toolbar=0&navpanes=0&scrollbar=0" title="${escapeHtml(fileName)}"></iframe></div>`
            : src
              ? `<div class="attachment-media attachment-link"><a href="${escapeHtml(src)}" target="_blank" rel="noopener noreferrer">Open Attachment / فتح المرفق</a></div>`
              : `<div class="attachment-media attachment-missing">هذا المرفق محفوظ بالاسم فقط ولا يحتوي على محتوى قابل للعرض أو الطباعة.</div>`;

        return `
          <div class="attachment-section">
            <div class="attachment-head">Attachment / المرفق</div>
            <div class="attachment-label">${escapeHtml(label)}</div>
            <div class="attachment-file">File Name / اسم الملف: ${escapeHtml(fileName)}</div>
            ${mediaHtml}
          </div>
        `;
      }).filter(Boolean).join('')
    : '';

  const graduatesUndertakingHtml = isGraduates
    ? `
      <div class="undertaking-print section-block">
        <div class="section-head">Undertaking / إقرار وتعهد</div>
        <div class="undertaking-grid">
          <div class="u-head u-col-ar">إقرار وتعهد</div>
          <div class="u-head u-col-en">Undertaking</div>

          <div class="u-col-ar">الالتزام بلوائح مستشفى السلطان قابوس وجداول التدريب.</div>
          <div class="u-col-en">Adhere to SQUH regulations and training schedule.</div>

          <div class="u-col-ar">تحمّل المسؤولية الكاملة عن السلوك خلال فترة التدريب.</div>
          <div class="u-col-en">Be fully responsible for behavior during training period.</div>

          <div class="u-col-ar">الالتزام بقواعد اللباس للطلاب الطبيين والأطباء المتدربين (HWP-HDO-IPP-012) عند الانضمام إلى الفريق الطبي.</div>
          <div class="u-col-en">Follow Dress Code for Medical Students and Doctors in Training (HWP-HDO-IPP-012) if joining medical team.</div>

          <div class="u-col-ar">لا يتحمل المستشفى أي مسؤولية عن الحوادث أو الأضرار خلال فترة التدريب.</div>
          <div class="u-col-en">SQUH is not liable for accidents or harm during training.</div>

          <div class="u-col-ar">أي مخالفة قد تؤدي إلى إيقاف التدريب فورًا وإبلاغ الجهة الطالبة.</div>
          <div class="u-col-en">Any violation may result in immediate discontinuation and reporting to requesting institute.</div>

          <div class="u-col-ar">إعادة بطاقة التدريب في اليوم الأخير؛ التأخير لأكثر من 5 أيام يؤدي إلى مصادرة الوديعة القابلة للاسترداد.</div>
          <div class="u-col-en">Return training ID card on the last day; delay more than 5 days forfeits refundable deposit.</div>

          <div class="u-col-ar">بطاقة التدريب ملك لمستشفى السلطان قابوس وسوء الاستخدام أو الفقدان قد يؤدي إلى إجراءات قانونية.</div>
          <div class="u-col-en">Training card is property of SQUH and misuse/loss may lead to legal action.</div>
        </div>
        <div class="undertaking-agree">I agree / أوافق على الإقرار والتعهد: <strong>${undertakingAgreed ? 'Yes / نعم' : 'No / لا'}</strong></div>
      </div>
    `
    : '';

  const graduatesSection1Html = isGraduates
    ? `
      <div class="section-block">
        <div class="section-head">Section 1: Personal Information</div>
        <div class="personal-layout">
          <div class="personal-data-col">
            <table class="personal-table">
              <tbody>
                <tr><th>Full Name</th><td>${lineValue(data?.name || '---')}</td></tr>
                <tr><th>Nationality</th><td>${lineValue(data?.nationality || '---')}</td></tr>
                <tr><th>National ID / Card No</th><td>${lineValue(data?.nationalId || data?.cardNo || '---')}</td></tr>
                <tr><th>Address</th><td>${lineValue(data?.address || '---')}</td></tr>
                <tr><th>Telephone / GSM</th><td>${lineValue(data?.phone || '---')}</td></tr>
                <tr><th>Email</th><td>${lineValue(data?.email || '---')}</td></tr>
                <tr><th>Institute</th><td>${lineValue(data?.institute || '---')}</td></tr>
              </tbody>
            </table>
          </div>
          <div class="personal-photo-col">
            <div class="photo-box">
              ${applicantPhotoSrc
                ? `<img src="${escapeHtml(applicantPhotoSrc)}" alt="صورة المتقدم">`
                : `<div class="photo-placeholder">لا توجد صورة متقدم مرفقة</div>`}
            </div>
          </div>
        </div>
      </div>

      <div class="section-block">
        <div class="section-head">Section 2: Training Details</div>
        <div class="line-row requirement-row">
          <span class="line-label underline">Program Requirement:</span>
          <span class="check-box">${isClinical ? '&#10003;' : ''}</span>
          <span class="check-text">CLINICAL ATTACHMENT</span>
          <span class="check-box">${isNonClinical ? '&#10003;' : ''}</span>
          <span class="check-text">NON-CLINICAL ATTACHMENT <em>(please tick)</em></span>
        </div>
        <div class="line-row"><span class="line-label">Specialty / Department:</span><span class="line-value">${lineValue(data?.specialtyDepartment || data?.department || '---')}</span></div>
        <div class="line-row duration-row"><span class="line-label">DURATION: From</span><span class="line-value short">${lineValue(data?.durationFrom || '---')}</span><span class="line-label small">to</span><span class="line-value short">${lineValue(data?.durationTo || '---')}</span></div>
        <div class="line-row"><span class="line-label underline">SPECIFIC OBJECTIVES FOR THE TRAINING:</span></div>
        <div class="objective-line">${lineValue(data?.objective1 || '')}</div>
        <div class="objective-line">${lineValue(data?.objective2 || '')}</div>
      </div>
    `
    : '';
  const rows = entries
    .map(([key, value]) => {
      const label = escapeHtml(getPrintableLabel(key));
      if (key === 'applicantPhoto' && applicantPhotoSrc) {
        return `<tr><th>${label}</th><td>مرفقة (معروضة في أعلى الاستمارة)</td></tr>`;
      }
      const val = escapeHtml(getPrintableValue(value));
      return `<tr><th>${label}</th><td>${val}</td></tr>`;
    })
    .join('') || `<tr><th>بيانات الطلب</th><td>لا توجد بيانات متاحة للطباعة</td></tr>`;

  const section2Department = escapeHtml(
    getPrintableValue(
      data?.managerSection2?.department || data?.department || data?.specialtyDepartment || '---'
    )
  );
  const section2From = escapeHtml(
    getPrintableValue(data?.managerSection2?.durationFrom || data?.durationFrom || '---')
  );
  const section2To = escapeHtml(
    getPrintableValue(data?.managerSection2?.durationTo || data?.durationTo || '---')
  );
  const section2Html = isGraduates
    ? `
      <div class="section-block section2-block">
        <div class="section-head">Section 3: To be filled by the concerned department Director/HOD</div>
        <div class="line-row"><span class="line-label">Department:</span><span class="line-value">${section2Department}</span></div>
        <div class="line-row duration-row"><span class="line-label">DURATION: From</span><span class="line-value short">${section2From}</span><span class="line-label small">to</span><span class="line-value short">${section2To}</span></div>
        <div class="line-row requirement-row">
          <span class="line-label">Decision:</span>
          <span class="check-box"></span><span class="check-text">Approved</span>
          <span class="check-box"></span><span class="check-text">Rejected</span>
        </div>
        <div class="line-row"><span class="line-label">Director/HOD Notes:</span><span class="line-value">&nbsp;</span></div>
        <div class="line-row split">
          <div><span class="line-label">Director/HOD Name:</span><span class="line-value short">&nbsp;</span></div>
          <div><span class="line-label">Signature:</span><span class="line-value short">&nbsp;</span></div>
        </div>
        <div class="line-row"><span class="line-label">Date:</span><span class="line-value short">&nbsp;</span></div>
      </div>
    `
    : '';

  const graduatesDeclarationsHtml = isGraduates
    ? `
      <div class="section-block">
        <div class="section-head">Fees & Notes</div>
        <ul class="note-list">
          <li>Clinical Attachment Access / Observer ship: OR.23 (OR.20 refundable + OR.3 card cost).</li>
          <li>Non-Clinical Attachment: OR.13 (OR.10 refundable + OR.3 card cost).</li>
          <li>No facility/provision for transport, food, and accommodation.</li>
          <li>Non-government doctors (clinical access/observer ship): OR.100 per month.</li>
          <li>Non-government nurses/allied professionals (clinical access/observer ship): OR.75 per month.</li>
          <li>Completed form should be submitted at least 4 weeks before proposed attachment date.</li>
        </ul>
      </div>
    `
    : '';

  const logoUrl = escapeHtml(getSquhHeaderLogoUrl());

  const html = `<!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(getFormTitle(formName))}</title>
    <style>
      @page { size: A4 portrait; margin: 8mm; }
      * { box-sizing: border-box; }
      :root {
        --brand-ink: #111;
        --brand-mid: #111;
        --brand-soft: #eaf6f4;
        --brand-soft-2: #ffffff;
      }
      body {
        font-family: "Times New Roman", Tahoma, serif;
        margin: 0;
        color: var(--brand-ink);
        background: #fff;
        padding: 8px 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .paper {
        width: 100%;
        max-width: 194mm;
        margin: 8px auto;
        padding: 2mm;
      }
      .branding {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 6px;
        padding: 4px 8px;
        border: 1px solid var(--brand-mid);
        background: #fff;
        min-height: 92px;
      }
      .brand-logo {
        width: 170px;
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0 auto;
      }
      .photo-box {
        width: 120px;
        min-width: 120px;
        height: 150px;
        border: 2px solid var(--brand-mid);
        padding: 3px;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        justify-self: end;
      }
      .photo-box img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .personal-layout {
        direction: ltr;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 132px;
        gap: 8px;
        align-items: start;
        padding: 8px;
      }
      .personal-data-col { min-width: 0; }
      .personal-photo-col {
        display: flex;
        justify-content: flex-end;
      }
      .personal-table {
        width: 100%;
        border-collapse: collapse;
      }
      .personal-table th,
      .personal-table td {
        border: 1px solid var(--brand-mid);
        padding: 5px 7px;
        font-size: 12px;
        vertical-align: top;
      }
      .personal-table th {
        width: 34%;
        background: #f6f8f8;
        text-align: left;
        font-weight: 700;
      }
      .photo-placeholder {
        font-size: 10px;
        color: var(--brand-ink);
        text-align: center;
        padding: 8px;
      }
      .header {
        border: 1px solid var(--brand-mid);
        padding: 8px 12px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .title {
        margin: 0;
        color: var(--brand-ink);
        font-size: 24px;
        font-weight: 800;
        line-height: 1.2;
      }
      .sub {
        margin-top: 2px;
        color: var(--brand-ink);
        font-size: 16px;
        line-height: 1.25;
      }
      .request-id {
        font-size: 16px;
        color: #1f2937;
        font-weight: 700;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border: 1px solid #b9d8d3;
        padding: 6px 8px;
        vertical-align: top;
        font-size: 12px;
      }
      th {
        width: 34%;
        text-align: right;
        background: var(--brand-soft);
        color: var(--brand-ink);
      }
      .footer {
        margin-top: 14px;
        font-size: 11px;
        color: var(--brand-ink);
        text-align: center;
      }
      .section-block {
        border: 1px solid var(--brand-mid);
        margin-bottom: 8px;
      }
      .section-head {
        font-size: 15px;
        font-weight: 800;
        padding: 5px 10px;
        border-bottom: 1px solid var(--brand-mid);
        background: var(--brand-soft);
        color: var(--brand-ink);
        direction: ltr;
        text-align: left;
      }
      .sub-head {
        font-size: 14px;
        font-weight: 700;
        padding: 7px 12px 4px;
        color: var(--brand-ink);
        direction: ltr;
        text-align: left;
      }
      .line-row {
        padding: 4px 10px;
        direction: ltr;
        text-align: left;
        color: var(--brand-ink);
        display: flex;
        align-items: flex-end;
        gap: 6px;
      }
      .line-label {
        font-size: 12px;
        font-weight: 700;
        display: inline-block;
        min-width: 96px;
      }
      .line-label.small {
        font-size: 13px;
        min-width: auto;
        margin: 0;
      }
      .line-label.underline {
        text-decoration: underline;
      }
      .line-value {
        display: inline-flex;
        flex: 1;
        border-bottom: 1.5px solid var(--brand-mid);
        padding: 0 4px 2px;
        font-size: 12px;
        vertical-align: baseline;
        min-height: 18px;
      }
      .line-value.short {
        flex: 0 0 150px;
      }
      .line-row.split {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .line-row.split > div {
        display: flex;
        align-items: flex-end;
        gap: 6px;
      }
      .requirement-row {
        display: flex;
        align-items: center;
        gap: 7px;
        flex-wrap: wrap;
      }
      .check-box {
        width: 15px;
        height: 15px;
        border: 1.5px solid var(--brand-mid);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        line-height: 1;
      }
      .check-text {
        font-size: 12px;
        font-weight: 700;
      }
      .duration-row .line-value.short {
        flex-basis: 132px;
      }
      .objective-line {
        min-height: 22px;
        border-bottom: 1.5px solid var(--brand-mid);
        margin: 0 10px 6px;
        font-size: 12px;
        color: var(--brand-ink);
        direction: ltr;
        text-align: left;
        padding: 2px 4px;
      }
      .section2-block { margin-top: 8px; }
      .section2-block .line-label { min-width: 110px; }
      .note-list { margin: 4px 14px 8px; padding-left: 16px; direction: ltr; color: var(--brand-ink); }
      .note-list li { margin-bottom: 4px; font-size: 11px; line-height: 1.35; }
      .undertaking-print { break-inside: avoid; page-break-inside: avoid; }
      .undertaking-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
      .undertaking-grid > div {
        border-top: 1px solid var(--brand-mid);
        padding: 6px 8px;
        font-size: 11.5px;
        line-height: 1.45;
      }
      .u-head {
        background: #f3f7f6;
        font-weight: 800;
      }
      .u-col-ar {
        direction: rtl;
        text-align: right;
        border-left: 1px solid var(--brand-mid);
      }
      .u-col-en {
        direction: ltr;
        text-align: left;
      }
      .undertaking-grid .u-col-ar:not(.u-head)::before,
      .undertaking-grid .u-col-en:not(.u-head)::before {
        content: "• ";
        font-weight: 700;
      }
      .undertaking-agree {
        border-top: 1px solid var(--brand-mid);
        padding: 6px 8px;
        font-size: 11.5px;
        direction: ltr;
        text-align: left;
      }
      .attachment-section {
        page-break-before: always;
        break-before: page;
        border: 1px solid var(--brand-mid);
        padding: 10px;
      }
      .attachment-head {
        font-size: 16px;
        font-weight: 800;
        padding: 0 0 6px;
        margin-bottom: 8px;
        border-bottom: 1px solid var(--brand-mid);
        direction: ltr;
        text-align: left;
      }
      .attachment-label {
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .attachment-file {
        font-size: 11.5px;
        margin-bottom: 10px;
        color: #333;
        direction: ltr;
        text-align: left;
        word-break: break-word;
      }
      .attachment-media {
        width: 100%;
      }
      .attachment-image img {
        display: block;
        width: 100%;
        max-width: 100%;
        height: auto;
        max-height: 248mm;
        object-fit: contain;
        border: 1px solid #cbd5d1;
        background: #fff;
      }
      .attachment-pdf iframe {
        display: block;
        width: 100%;
        height: 245mm;
        border: 1px solid #cbd5d1;
        background: #fff;
      }
      .attachment-link,
      .attachment-missing {
        font-size: 12px;
        line-height: 1.6;
        padding: 10px;
        border: 1px dashed #cbd5d1;
        background: #fafcfc;
        direction: ltr;
        text-align: left;
      }
      .attachment-link a {
        color: #0f766e;
        text-decoration: underline;
      }
      .no-print {
        margin: 12px auto;
        width: 194mm;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .no-print button {
        padding: 8px 14px;
        border: 1px solid var(--brand-mid);
        background: var(--brand-soft-2);
        color: var(--brand-ink);
        cursor: pointer;
      }
      @media print {
        .no-print { display: none !important; }
        body { background: #fff; padding: 0; }
        .paper {
          width: 100%;
          max-width: 194mm;
          margin: 0 auto;
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="no-print">
      <button onclick="window.print()">حفظ كـ PDF / طباعة</button>
      <button onclick="window.close()" style="background:#6b7280;">إغلاق</button>
    </div>
    <div class="paper">
      <div class="branding">
        <img class="brand-logo" src="${logoUrl}" alt="شعار المؤسسة">
      </div>
      <div class="header">
        <div>
          <h1 class="title">${escapeHtml(getFormTitle(formName))}</h1>
          <div class="sub">دائرة التدريب والتطوير المهني المستمر</div>
        </div>
        <div class="request-id">رقم الطلب: ${escapeHtml(getPrintableValue(data.id || '---'))}</div>
      </div>
      ${isGraduates
        ? `${graduatesUndertakingHtml}${graduatesSection1Html}`
        : `<table><tbody>${rows}</tbody></table>`}
      ${graduatesDeclarationsHtml}
      ${section2Html}
      ${attachmentSectionsHtml}
      <div class="footer">تم إنشاء هذه النسخة تلقائيا من النظام لغرض الحفظ والأرشفة.</div>
    </div>
  </body>
  </html>`;

  const previewToken = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const previewStorageKey = `printPreviewHtml:${previewToken}`;

  try {
    sessionStorage.setItem(previewStorageKey, html);
    const previewUrl = `print-preview.html?token=${encodeURIComponent(previewToken)}`;
    const previewWindow = window.open(previewUrl, '_blank');

    if (!previewWindow) {
      sessionStorage.removeItem(previewStorageKey);
      printHtmlWithIframe(html);
      alert('تعذر فتح صفحة المعاينة في تبويب جديد. تم فتح المعاينة داخل الصفحة الحالية.');
    }
  } catch (err) {
    console.error('تعذر تجهيز صفحة المعاينة المنفصلة:', err);
    printHtmlWithIframe(html);
    alert('تعذر فتح صفحة المعاينة المنفصلة. تم فتح المعاينة داخل الصفحة الحالية.');
  }
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
  message += `\nحالة الطلب: في انتظار الموافقة`;
  message += `\nسيتم التواصل معك عبر البريد الإلكتروني قريباً.`;
  if (isLocal) {
    message += `\n\n⚠️ نُباه: تم حفظ طلبك محلياً`;
  }

  content.textContent = message;
  content.style.cssText = 'white-space: pre-line; line-height: 1.6; margin-bottom: 20px;';
  
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex; gap:10px; justify-content:center; flex-wrap:wrap;';

  const closeButton = document.createElement('button');
  closeButton.textContent = 'إغلاق';
  closeButton.style.cssText = `
    padding: 10px 24px;
    background: #295c4a;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    transition: opacity 0.2s;
  `;
  closeButton.onmouseover = () => closeButton.style.opacity = '0.9';
  closeButton.onmouseout = () => closeButton.style.opacity = '1';
  closeButton.onclick = () => {
    modal.remove();
    overlay.remove();
  };

  actions.appendChild(closeButton);

  const printButton = document.createElement('button');
  printButton.textContent = 'تنزيل الاستمارة (PDF)';
  printButton.style.cssText = `
    padding: 10px 24px;
    background: #1f7a8c;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    transition: opacity 0.2s;
  `;
  printButton.onmouseover = () => printButton.style.opacity = '0.9';
  printButton.onmouseout = () => printButton.style.opacity = '1';
  printButton.onclick = () => openSubmissionPrintPreview(formName, data);
  actions.appendChild(printButton);

  modal.appendChild(content);
  modal.appendChild(actions);
  
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