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

// ===== إعدادات SendGrid =====
// يمكن ضبطها مركزياً عبر window.APP_EMAIL_CONFIG داخل firebase-config.js
const SENDGRID_CONFIG = {
  apiKey: (window.APP_EMAIL_CONFIG && window.APP_EMAIL_CONFIG.apiKey) || 'SG.YOUR_SENDGRID_API_KEY_HERE',
  fromEmail: (window.APP_EMAIL_CONFIG && window.APP_EMAIL_CONFIG.fromEmail) || 'noreply@hospital.com',
  fromName: (window.APP_EMAIL_CONFIG && window.APP_EMAIL_CONFIG.fromName) || 'دائرة التدريب والتطوير المهني'
};

const EMAILJS_CONFIG = {
  serviceId: (window.APP_EMAIL_CONFIG && window.APP_EMAIL_CONFIG.emailjsServiceId) || '',
  templateId: (window.APP_EMAIL_CONFIG && window.APP_EMAIL_CONFIG.emailjsTemplateId) || '',
  publicKey: (window.APP_EMAIL_CONFIG && window.APP_EMAIL_CONFIG.emailjsPublicKey) || ''
};

const SEND_APPLICANT_CONFIRMATION_ON_SUBMIT = !!(
  window.APP_EMAIL_CONFIG && window.APP_EMAIL_CONFIG.sendApplicantConfirmationOnSubmit === true
);

function hasUsableFirebaseConfig() {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg) return false;
  const projectId = String(cfg.projectId || '');
  const storageBucket = String(cfg.storageBucket || '');
  return !!(
    projectId &&
    storageBucket &&
    !projectId.includes('YOUR_') &&
    !storageBucket.includes('YOUR_')
  );
}

const EMAIL_ENDPOINT = (window.APP_EMAIL_CONFIG && window.APP_EMAIL_CONFIG.endpoint) || '';

function hasSecureEmailEndpoint() {
  return typeof EMAIL_ENDPOINT === 'string' && /^https?:\/\//.test(EMAIL_ENDPOINT);
}

function hasDirectSendgridKey() {
  return !!(
    SENDGRID_CONFIG.apiKey &&
    !SENDGRID_CONFIG.apiKey.includes('YOUR_SENDGRID_API_KEY')
  );
}

function hasEmailJSConfig() {
  return !!(
    EMAILJS_CONFIG.serviceId &&
    EMAILJS_CONFIG.templateId &&
    EMAILJS_CONFIG.publicKey &&
    !EMAILJS_CONFIG.serviceId.includes('YOUR_') &&
    !EMAILJS_CONFIG.templateId.includes('YOUR_') &&
    !EMAILJS_CONFIG.publicKey.includes('YOUR_')
  );
}

function htmlToText(htmlValue) {
  return String(htmlValue || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractEmailPayloadFields(emailPayload) {
  const firstPersonalization = (emailPayload.personalizations && emailPayload.personalizations[0]) || {};
  const firstRecipient = (firstPersonalization.to && firstPersonalization.to[0]) || {};
  const htmlContent = (emailPayload.content || []).find(item => item.type === 'text/html');
  const textContent = (emailPayload.content || []).find(item => item.type === 'text/plain');

  return {
    toEmail: firstRecipient.email || '',
    toName: firstRecipient.name || '',
    subject: firstPersonalization.subject || '',
    fromEmail: (emailPayload.from && emailPayload.from.email) || SENDGRID_CONFIG.fromEmail,
    fromName: (emailPayload.from && emailPayload.from.name) || SENDGRID_CONFIG.fromName,
    messageHtml: (htmlContent && htmlContent.value) || '',
    messageText: (textContent && textContent.value) || htmlToText((htmlContent && htmlContent.value) || '')
  };
}

async function sendViaEmailJS(emailPayload) {
  const fields = extractEmailPayloadFields(emailPayload);
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      service_id: EMAILJS_CONFIG.serviceId,
      template_id: EMAILJS_CONFIG.templateId,
      user_id: EMAILJS_CONFIG.publicKey,
      template_params: {
        to_email: fields.toEmail,
        to_name: fields.toName,
        subject: fields.subject,
        from_email: fields.fromEmail,
        from_name: fields.fromName,
        message_html: fields.messageHtml,
        message_text: fields.messageText
      }
    })
  });

  if (response.ok) return true;
  const errorBody = await response.text();
  console.warn('⚠️ خطأ EmailJS:', errorBody);
  return false;
}

async function dispatchEmailPayload(emailPayload, testLogData) {
  try {
    if (hasSecureEmailEndpoint()) {
      const endpointResponse = await fetch(EMAIL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      });

      if (endpointResponse.ok) {
        return true;
      }

      const endpointError = await endpointResponse.text();
      console.warn('⚠️ فشل الإرسال عبر endpoint الآمن:', endpointError);
      return false;
    }

    if (hasEmailJSConfig()) {
      return await sendViaEmailJS(emailPayload);
    }

    if (hasDirectSendgridKey()) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SENDGRID_CONFIG.apiKey}`
        },
        body: JSON.stringify(emailPayload)
      });

      if (response.status === 202) {
        return true;
      }

      const error = await response.text();
      console.warn('⚠️ خطأ في إرسال البريد:', error);
      return false;
    }

    console.log('📧 وضع اختبار - لم يتم إرسال بريد فعلي:', testLogData);
    return true;
  } catch (error) {
    console.error('❌ خطأ أثناء محاولة إرسال البريد:', error);
    return false;
  }
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
    email: 'admin@hospital.com' 
  };
}

// ===== إرسال إشعار بريدي للمسؤول عبر SendGrid =====
async function sendResponsibleNotificationEmail(applicantData, responsible) {
  try {
    const emailPayload = {
      personalizations: [
        {
          to: [{ email: responsible.email, name: responsible.name }],
          subject: `🔔 طلب جديد من ${applicantData.name || 'متقدم'}`
        }
      ],
      from: {
        email: SENDGRID_CONFIG.fromEmail,
        name: SENDGRID_CONFIG.fromName
      },
      content: [
        {
          type: 'text/html',
          value: `
              <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; border-radius: 8px;">
                <h2 style="color: #295c4a;">🔔 طلب جديد يحتاج موافقتك</h2>
                <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
                  <h3 style="color: #41726a; border-bottom: 2px solid #e6f7f4; padding-bottom: 10px;">بيانات المتقدم</h3>
                  <table style="width: 100%; margin-top: 15px;">
                    <tr>
                      <td style="padding: 8px; font-weight: 600; width: 30%;">الاسم:</td>
                      <td style="padding: 8px;">${applicantData.name || '---'}</td>
                    </tr>
                    <tr style="background: #f9f9f9;">
                      <td style="padding: 8px; font-weight: 600;">البريد الإلكتروني:</td>
                      <td style="padding: 8px;">${applicantData.email || '---'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; font-weight: 600;">رقم الهاتف:</td>
                      <td style="padding: 8px;">${applicantData.phone || '---'}</td>
                    </tr>
                    <tr style="background: #f9f9f9;">
                      <td style="padding: 8px; font-weight: 600;">التاريخ:</td>
                      <td style="padding: 8px;">${applicantData.submittedAt || '---'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; font-weight: 600;">نوع الطلب:</td>
                      <td style="padding: 8px;">${applicantData.formType || '---'}</td>
                    </tr>
                    <tr style="background: #f9f9f9;">
                      <td style="padding: 8px; font-weight: 600;">رقم الطلب:</td>
                      <td style="padding: 8px;"><strong>${applicantData.id}</strong></td>
                    </tr>
                  </table>
                  <div style="margin-top: 20px; padding: 15px; background: #e6f7f4; border-right: 4px solid #295c4a; border-radius: 4px;">
                    <p style="margin: 0; color: #41726a;">
                      ⚠️ <strong>برجاء مراجعة الطلب في لوحة التحكم وتقديم الموافقة أو الرفض في أقرب وقت.</strong>
                    </p>
                  </div>
                </div>
                <div style="margin-top: 20px; text-align: center; color: #999; font-size: 12px;">
                  <p>هذا البريد تم إرساله تلقائياً من نظام إدارة الطلبات</p>
                </div>
              </div>
            `
        }
      ]
    };

    const sent = await dispatchEmailPayload(emailPayload, {
      to: responsible.email,
      from: SENDGRID_CONFIG.fromEmail,
      applicant: applicantData.name,
      submissionId: applicantData.id
    });

    if (sent) {
      console.log('✅ تم إرسال إشعار المسؤول:', responsible.email);
    }

    return sent;
  } catch (error) {
    console.error('❌ خطأ في إرسال البريد:', error);
    return false;
  }
}

// ===== إرسال بريد تأكيد للمُقدِّم =====
async function sendApplicantConfirmationEmail(applicantData) {
  if (!applicantData?.email) return true;

  try {
    const emailPayload = {
      personalizations: [
        {
          to: [{ email: applicantData.email, name: applicantData.name || 'المتقدم' }],
          subject: `✅ تم استلام طلبك رقم ${applicantData.id}`
        }
      ],
      from: {
        email: SENDGRID_CONFIG.fromEmail,
        name: SENDGRID_CONFIG.fromName
      },
      content: [
        {
          type: 'text/html',
          value: `
              <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; border-radius: 8px;">
                <h2 style="color: #295c4a;">✅ تم استلام طلبك بنجاح</h2>
                <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
                  <p style="margin: 0 0 12px;">مرحباً ${applicantData.name || 'عزيزي المتقدم'}،</p>
                  <p style="margin: 0 0 12px;">تم استلام طلبك بنجاح وسيتم مراجعته من الجهة المختصة.</p>
                  <table style="width: 100%; margin-top: 10px; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px; font-weight: 600; width: 35%;">رقم الطلب:</td>
                      <td style="padding: 8px;"><strong>${applicantData.id}</strong></td>
                    </tr>
                    <tr style="background: #f9f9f9;">
                      <td style="padding: 8px; font-weight: 600;">تاريخ التقديم:</td>
                      <td style="padding: 8px;">${applicantData.submittedAt || '---'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; font-weight: 600;">نوع الطلب:</td>
                      <td style="padding: 8px;">${applicantData.formType || '---'}</td>
                    </tr>
                    <tr style="background: #f9f9f9;">
                      <td style="padding: 8px; font-weight: 600;">الحالة الحالية:</td>
                      <td style="padding: 8px;">قيد المراجعة</td>
                    </tr>
                  </table>
                  <p style="margin: 16px 0 0; color: #41726a;">نرجو الاحتفاظ برقم الطلب للمتابعة لاحقاً.</p>
                </div>
                <div style="margin-top: 20px; text-align: center; color: #999; font-size: 12px;">
                  <p>هذه رسالة آلية، يرجى عدم الرد عليها مباشرة.</p>
                </div>
              </div>
            `
        }
      ]
    };

    const sent = await dispatchEmailPayload(emailPayload, {
      to: applicantData.email,
      applicant: applicantData.name,
      submissionId: applicantData.id
    });

    if (sent) {
      console.log('✅ تم إرسال بريد تأكيد للمُقدِّم:', applicantData.email);
    }

    return sent;
  } catch (error) {
    console.error('❌ خطأ في إرسال بريد المُقدِّم:', error);
    return false;
  }
}

// ===== إرسال إشعارات البريد (المسؤول + المُقدِّم) =====
function sendNotificationEmail(applicantData, responsible) {
  sendResponsibleNotificationEmail(applicantData, responsible);

  const applicantEmail = String((applicantData && applicantData.email) || '').trim().toLowerCase();
  const responsibleEmail = String((responsible && responsible.email) || '').trim().toLowerCase();
  const shouldSendApplicantConfirmation =
    SEND_APPLICANT_CONFIRMATION_ON_SUBMIT &&
    applicantEmail &&
    applicantEmail !== responsibleEmail;

  if (shouldSendApplicantConfirmation) {
    sendApplicantConfirmationEmail(applicantData);
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
  if (!hasUsableFirebaseConfig()) return false;
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
    const useFirebase = hasUsableFirebaseConfig();
    
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