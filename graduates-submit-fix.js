(function () {
  const ATTACHMENT_FIELDS = ['applicantPhoto', 'cvFile', 'idCardCopy', 'universityLetter', 'otherAttachments'];

  function toAttachmentMeta(file, uploadResult) {
    if (!file) return undefined;
    const result = uploadResult && typeof uploadResult === 'object' ? uploadResult : {};
    const url = typeof result.url === 'string' ? result.url.trim() : '';
    const status = typeof result.status === 'string' ? result.status.trim() : '';
    const message = typeof result.message === 'string' ? result.message.trim() : '';
    return {
      name: String(result.name || file.name || 'attachment'),
      type: String(result.type || file.type || 'application/octet-stream'),
      size: Number(result.size || file.size || 0),
      source: url ? 'firebase-url' : 'upload-result',
      ...(url ? { url } : {}),
      ...(status ? { status } : {}),
      ...(message ? { message } : {})
    };
  }

  function toPersistableValue(value) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof File !== 'undefined' && value instanceof File) return undefined;
    if (typeof FileList !== 'undefined' && value instanceof FileList) return undefined;
    if (Array.isArray(value)) {
      return value.map((item) => toPersistableValue(item)).filter((item) => item !== undefined);
    }
    if (typeof value === 'object') {
      const normalized = {};
      for (const [key, nestedValue] of Object.entries(value)) {
        const nextValue = toPersistableValue(nestedValue);
        if (nextValue !== undefined) normalized[key] = nextValue;
      }
      return normalized;
    }
    return value;
  }

  function clonePlainData(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return value;
    }
  }

  function notifyByEmail(payload) {
    const target = { name: payload.assignedTo, email: payload.assignedEmail };
    if (typeof sendNotificationEmail === 'function') {
      Promise.resolve()
        .then(() => sendNotificationEmail(payload, target, 'confirm'))
        .catch((error) => console.error('❌ فشل إرسال إشعار البريد للخريجين:', error));
    }
  }

  function saveLocal(formName, payload) {
    let all = {};
    try {
      all = JSON.parse(localStorage.getItem('formSubmissions')) || {};
    } catch (_) {
      all = {};
    }
    if (!all[formName]) all[formName] = [];
    all[formName].push(clonePlainData(payload));
    localStorage.setItem('formSubmissions', JSON.stringify(all));
  }

  function isDataUrl(value) {
    return /^data:/i.test(String(value || '').trim());
  }

  async function persistGraduates(formData) {
    const cleaned = {};
    for (const [key, value] of Object.entries(formData)) {
      if (!String(key).startsWith('__')) cleaned[key] = value;
    }

    cleaned.submittedAt = new Date().toLocaleString('ar-SA');
    cleaned.submittedAtISO = new Date().toISOString();
    cleaned.id = Date.now();
    cleaned.formType = 'graduates';
    cleaned.department = cleaned.department || cleaned.specialtyDepartment || '';
    if (!cleaned.duration) {
      const from = cleaned.durationFrom || '';
      const to = cleaned.durationTo || '';
      cleaned.duration = from && to ? `${from} -> ${to}` : from || to || '';
    }
    cleaned.status = 'Pending';
    cleaned.assignedTo = 'قسم التدريب';
    cleaned.assignedEmail = 'fsalim@squ.edu.om';
    cleaned.createdAt = new Date().toISOString();

    await Promise.all(ATTACHMENT_FIELDS.map(async (field) => {
      const file = formData[field];
      if (!(file instanceof File) || !file.name || !file.size) return;

      try {
        let uploadResult = null;
        if (window.fileUpload && typeof window.fileUpload.uploadAttachment === 'function') {
          uploadResult = await window.fileUpload.uploadAttachment(file, field, cleaned);
        }
        const attachmentMeta = toAttachmentMeta(file, uploadResult);
        if (attachmentMeta && typeof attachmentMeta === 'object') {
          if (attachmentMeta.url && isDataUrl(attachmentMeta.url)) {
            if (field === 'applicantPhoto') {
              cleaned.__applicantPhotoDataUrl = attachmentMeta.url;
            }
            delete attachmentMeta.url;
            attachmentMeta.status = attachmentMeta.status || 'upload_failed';
            attachmentMeta.message = attachmentMeta.message || 'فشل رفع الملف وتم حفظ الطلب بدون رابط مرفق';
            attachmentMeta.source = 'upload-result';
          }
          cleaned[field] = attachmentMeta;
        }
      } catch (_) {
        cleaned[field] = {
          name: String(file.name || 'attachment'),
          type: String(file.type || 'application/octet-stream'),
          size: Number(file.size || 0),
          source: 'upload-result',
          status: 'upload_failed',
          message: 'فشل رفع الملف وتم حفظ الطلب بدون رابط مرفق'
        };
      }
    }));

    const persistable = toPersistableValue(cleaned) || {};
    delete persistable.applicantPhotoURL;
    delete persistable.cvFileURL;
    delete persistable.idCardCopyURL;
    delete persistable.universityLetterURL;
    delete persistable.otherAttachmentsURL;
    for (const [key, value] of Object.entries(persistable)) {
      if (value === undefined) delete persistable[key];
    }

    if (window.db) {
      try {
        const payload = clonePlainData(persistable);
        if (typeof window.withTimeout === 'function') {
          await window.withTimeout(window.db.collection('formSubmissions').add(payload), 6000, 'Firestore save timed out');
        } else {
          await window.db.collection('formSubmissions').add(payload);
        }
        notifyByEmail(payload);
        return { success: true, data: clonePlainData(payload), firestore: true };
      } catch (error) {
        saveLocal('graduates', persistable);
        notifyByEmail(persistable);
        return { success: true, data: clonePlainData(persistable), local: true, error };
      }
    }

    saveLocal('graduates', persistable);
    notifyByEmail(persistable);
    return { success: true, data: clonePlainData(persistable), local: true };
  }

  async function handleGraduatesSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : 'إرسال';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ جاري الإرسال...';
    }

    try {
      const fd = new FormData(form);
      const payload = {};

      for (const [key, value] of fd.entries()) {
        if (value instanceof File) {
          if (value.name && value.size > 0) {
            const validation = typeof window.validateFile === 'function' ? window.validateFile(value) : { valid: true };
            if (!validation.valid) throw new Error(validation.message || 'الملف غير صالح');
            payload[key] = value;

            if (key === 'applicantPhoto' && typeof window.fileToDataUrl === 'function') {
              try {
                payload.__applicantPhotoDataUrl = await window.fileToDataUrl(value);
              } catch (_) {}
            }
          }
          continue;
        }
        payload[key] = value;
      }

      const result = await persistGraduates(payload);
      if (!result.success) throw new Error('حدث خطأ أثناء حفظ الطلب، يرجى المحاولة مرة أخرى.');

      const previewSeed = {
        ...result.data,
        __applicantPhotoDataUrl: payload.__applicantPhotoDataUrl || result.data.__applicantPhotoDataUrl || ''
      };
      const previewData = typeof window.normalizePreviewData === 'function'
        ? window.normalizePreviewData('graduates', previewSeed)
        : previewSeed;

      window.__lastSubmissionPreviewData = previewData;
      if (typeof window.showSuccessMessage === 'function') {
        window.showSuccessMessage('graduates', previewData, !!result.local);
      }
      if (typeof window.openSubmissionPrintPreview === 'function') {
        try {
          window.openSubmissionPrintPreview('graduates', previewData);
        } catch (_) {}
      }
      form.reset();
    } catch (error) {
      if (typeof window.showErrorMessage === 'function') {
        window.showErrorMessage(error.message || 'حدث خطأ غير متوقع');
      } else {
        alert(error.message || 'حدث خطأ غير متوقع');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  }

  window.addEventListener('DOMContentLoaded', function () {
    const originalForm = document.getElementById('graduates-form');
    if (!originalForm || originalForm.dataset.safeSubmitBound === 'true') return;

    const replacementForm = originalForm.cloneNode(true);
    originalForm.parentNode.replaceChild(replacementForm, originalForm);
    replacementForm.dataset.safeSubmitBound = 'true';
    replacementForm.addEventListener('submit', handleGraduatesSubmit);
  });
})();