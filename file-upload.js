// رفع المرفقات إلى Firebase Storage

// رفع المرفقات إلى Firebase Storage
window.fileUpload = {
  uploadAttachment: async function(file, fieldName, cleaned) {
    if (file && file instanceof File) {
      const buildResult = (overrides = {}) => ({
        name: String(overrides.name || file.name || 'attachment'),
        type: String(overrides.type || file.type || 'application/octet-stream'),
        size: Number(overrides.size || file.size || 0),
        ...(overrides.url ? { url: String(overrides.url) } : {}),
        ...(overrides.status ? { status: String(overrides.status) } : {}),
        ...(overrides.message ? { message: String(overrides.message) } : {})
      });

      const toDataUrl = (fileValue) => new Promise((resolve, reject) => {
        try {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(reader.error || new Error('file read failed'));
          reader.readAsDataURL(fileValue);
        } catch (error) {
          reject(error);
        }
      });

      try {
        const ok = await window.ensureFirebaseReady?.();
        if (!ok) throw new Error('Firebase not initialized');

        const storage = window.firebaseStorage || (window.firebase && window.firebase.storage && window.firebase.storage());
        if (!storage) throw new Error('Firebase Storage غير متوفر');

        const safeName = String(file.name || 'attachment').replace(/[^a-zA-Z0-9._-]+/g, '_');
        const attachRef = storage.ref(`attachments/${cleaned.id}_${fieldName}_${Date.now()}_${safeName}`);
        const uploadTask = attachRef.put(file);
        const timeoutMs = 8000;
        const snapshot = await Promise.race([
          uploadTask,
          new Promise((_, reject) => {
            setTimeout(() => {
              if (typeof uploadTask.cancel === 'function') {
                try {
                  uploadTask.cancel();
                } catch (_) {}
              }
              reject(new Error(`Upload timed out after ${timeoutMs}ms`));
            }, timeoutMs);
          })
        ]);
        if (!snapshot) throw new Error('Upload failed');
        const url = await attachRef.getDownloadURL();
        cleaned[fieldName + 'URL'] = url;
        console.log(`✅ [${fieldName}] Uploaded:`, url);
        return buildResult({ url });
      } catch (err) {
        console.error('❌ خطأ في رفع المرفق:', fieldName, err);
        try {
          const fallbackUrl = await toDataUrl(file);
          cleaned[fieldName + 'URL'] = fallbackUrl;
          console.warn(`⚠️ [${fieldName}] using local preview fallback instead of Firebase URL`);
          return buildResult({
            url: fallbackUrl,
            status: 'upload_failed',
            message: 'فشل رفع الملف وتم استخدام نسخة محلية مؤقتة'
          });
        } catch (fallbackError) {
          console.error('❌ تعذر تجهيز fallback للمرفق:', fieldName, fallbackError);
          cleaned[fieldName + 'URL'] = '';
          return buildResult({
            status: 'upload_failed',
            message: 'فشل رفع الملف'
          });
        }
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
