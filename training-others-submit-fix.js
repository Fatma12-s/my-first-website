(function () {
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
        if (nextValue !== undefined) {
          normalized[key] = nextValue;
        }
      }
      return normalized;
    }
    return value;
  }

  function clonePlainData(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function notifyByEmail(payload) {
    const target = { name: payload.assignedTo, email: payload.assignedEmail };
    if (typeof sendNotificationEmail === 'function') {
      Promise.resolve()
        .then(() => sendNotificationEmail(payload, target, 'confirm'))
        .catch((error) => console.error('❌ فشل إرسال إشعار البريد للتدريب الخارجي:', error));
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

  async function persistTrainingOthers(formData) {
    const cleaned = {};
    for (const [key, value] of Object.entries(formData)) {
      if (!String(key).startsWith('__')) {
        cleaned[key] = value;
      }
    }

    cleaned.submittedAt = new Date().toLocaleString('ar-SA');
    cleaned.submittedAtISO = new Date().toISOString();
    cleaned.id = Date.now();
    cleaned.formType = 'training-others';
    cleaned.status = 'Pending';
    cleaned.assignedTo = 'منسق التدريب';
    cleaned.assignedEmail = 'fsalim@squ.edu.om';
    cleaned.createdAt = new Date().toISOString();

    if (formData.receipt && formData.receipt instanceof File) {
      try {
        let uploadResult = null;
        if (window.fileUpload && typeof window.fileUpload.uploadAttachment === 'function') {
          uploadResult = await window.fileUpload.uploadAttachment(formData.receipt, 'receipt', cleaned);
        }
        const attachmentMeta = toAttachmentMeta(formData.receipt, uploadResult);
        if (attachmentMeta && typeof attachmentMeta === 'object') {
          if (attachmentMeta.url && /^data:/i.test(String(attachmentMeta.url))) {
            delete attachmentMeta.url;
            attachmentMeta.status = attachmentMeta.status || 'upload_failed';
            attachmentMeta.message = attachmentMeta.message || 'فشل رفع الملف وتم حفظ الطلب بدون رابط مرفق';
            attachmentMeta.source = 'upload-result';
          }
          cleaned.receipt = attachmentMeta;
        } else {
          delete cleaned.receipt;
        }
      } catch (error) {
        cleaned.receipt = {
          name: String(formData.receipt.name || 'attachment'),
          type: String(formData.receipt.type || 'application/octet-stream'),
          size: Number(formData.receipt.size || 0),
          source: 'upload-result',
          status: 'upload_failed',
          message: 'فشل رفع الملف وتم حفظ الطلب بدون رابط مرفق'
        };
      }
    }

    const persistable = toPersistableValue(cleaned) || {};
    delete persistable.receiptURL;
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
        saveLocal('training-others', persistable);
        notifyByEmail(persistable);
        return { success: true, data: clonePlainData(persistable), local: true, error };
      }
    }

    saveLocal('training-others', persistable);
    notifyByEmail(persistable);
    return { success: true, data: clonePlainData(persistable), local: true };
  }

  async function handleTrainingOthersSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : 'إرسال';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ جاري الإرسال...';
    }

    try {
      const formData = new FormData(form);
      const payload = {};

      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          if (value.name && value.size > 0) {
            const validation = typeof window.validateFile === 'function' ? window.validateFile(value) : { valid: true };
            if (!validation.valid) {
              throw new Error(validation.message || 'الملف غير صالح');
            }
            payload[key] = value;
          }
          continue;
        }
        payload[key] = value;
      }

      const result = await persistTrainingOthers(payload);
      if (!result.success) {
        throw new Error('حدث خطأ أثناء حفظ الطلب، يرجى المحاولة مرة أخرى.');
      }

      const previewData = typeof window.normalizePreviewData === 'function'
        ? window.normalizePreviewData('training-others', result.data)
        : result.data;
      window.__lastSubmissionPreviewData = previewData;

      if (typeof window.showSuccessMessage === 'function') {
        window.showSuccessMessage('training-others', previewData, !!result.local);
      }
      if (typeof window.openSubmissionPrintPreview === 'function') {
        try {
          window.openSubmissionPrintPreview('training-others', previewData);
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
    const originalForm = document.getElementById('training-others-form');
    if (!originalForm || originalForm.dataset.safeSubmitBound === 'true') return;

    const replacementForm = originalForm.cloneNode(true);
    originalForm.parentNode.replaceChild(replacementForm, originalForm);
    replacementForm.dataset.safeSubmitBound = 'true';
    replacementForm.addEventListener('submit', handleTrainingOthersSubmit);
  });
})();