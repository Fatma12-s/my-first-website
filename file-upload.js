// رفع المرفقات إلى Firebase Storage

// رفع المرفقات إلى Firebase Storage
window.fileUpload = {
  uploadAttachment: async function(file, fieldName, cleaned) {
    if (file && file instanceof File) {
      const isRemoteStorageUrl = (value) => /^https:\/\//i.test(String(value || '').trim());
      const uploadTimeoutMs = 30000;
      const maxAttempts = 2;
      const buildResult = (overrides = {}) => ({
        name: String(overrides.name || file.name || 'attachment'),
        type: String(overrides.type || file.type || 'application/octet-stream'),
        size: Number(overrides.size || file.size || 0),
        ...(overrides.url ? { url: String(overrides.url) } : {}),
        ...(overrides.status ? { status: String(overrides.status) } : {}),
        ...(overrides.message ? { message: String(overrides.message) } : {})
      });

      const shouldRetryUpload = (error) => {
        const message = String((error && error.message) || '').toLowerCase();
        return message.includes('timed out')
          || message.includes('network')
          || message.includes('storage/retry-limit-exceeded')
          || message.includes('storage/unknown')
          || message.includes('storage/canceled');
      };

      const uploadOnce = async () => {
        const storage = window.firebaseStorage || (window.firebase && window.firebase.storage && window.firebase.storage());
        if (!storage) throw new Error('Firebase Storage غير متوفر');

        const safeName = String(file.name || 'attachment').replace(/[^a-zA-Z0-9._-]+/g, '_');
        const attachRef = storage.ref(`attachments/${cleaned.id}_${fieldName}_${Date.now()}_${safeName}`);
        const uploadTask = attachRef.put(file);
        const snapshot = await Promise.race([
          uploadTask,
          new Promise((_, reject) => {
            setTimeout(() => {
              if (typeof uploadTask.cancel === 'function') {
                try {
                  uploadTask.cancel();
                } catch (_) {}
              }
              reject(new Error(`Upload timed out after ${uploadTimeoutMs}ms`));
            }, uploadTimeoutMs);
          })
        ]);

        if (!snapshot) throw new Error('Upload failed');
        const url = await attachRef.getDownloadURL();
        if (!isRemoteStorageUrl(url)) {
          throw new Error('Firebase Storage returned a non-remote URL');
        }

        cleaned[fieldName + 'URL'] = url;
        return url;
      };

      try {
        const ok = await window.ensureFirebaseReady?.();
        if (!ok) throw new Error('Firebase not initialized');

        let uploadedUrl = '';
        let lastError = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            uploadedUrl = await uploadOnce();
            break;
          } catch (error) {
            lastError = error;
            if (attempt >= maxAttempts || !shouldRetryUpload(error)) {
              throw error;
            }
            console.warn(`⚠️ إعادة محاولة رفع المرفق ${fieldName} (${attempt}/${maxAttempts}) بسبب:`, error);
          }
        }

        if (!uploadedUrl) {
          throw lastError || new Error('Upload failed');
        }

        console.log(`✅ [${fieldName}] Uploaded:`, uploadedUrl);
        return buildResult({ url: uploadedUrl });
      } catch (err) {
        console.error('❌ خطأ في رفع المرفق:', fieldName, err);
        cleaned[fieldName + 'URL'] = '';
        return buildResult({
          status: 'upload_failed',
          message: 'فشل رفع الملف إلى Firebase Storage. لم يتم إنشاء رابط تنزيل صالح.'
        });
      }
    }
    return undefined;
  },
  getAttachmentUrl: function(file, formName) {
    // يبحث عن رابط التحميل في cleaned
    try {
      const all = JSON.parse(localStorage.getItem('formSubmissions')) || {};
      const arr = all[formName] || [];
      for (const item of arr) {
        for (const key of Object.keys(item)) {
          if (key.endsWith('URL') && item[key].includes(file.name)) {
            return item[key];
          }
        }
      }
    } catch (e) {}
    return '';
  }
};
