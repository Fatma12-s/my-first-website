// رفع المرفقات إلى Firebase Storage

// رفع المرفقات إلى Firebase Storage
window.fileUpload = {
  uploadAttachment: async function(file, fieldName, cleaned) {
    if (file && file instanceof File) {
      try {
        const ok = await window.ensureFirebaseReady?.();
        if (!ok) throw new Error('Firebase not initialized');

        const storage = window.firebaseStorage || (window.firebase && window.firebase.storage && window.firebase.storage());
        if (!storage) throw new Error('Firebase Storage غير متوفر');

        const safeName = String(file.name || 'attachment').replace(/[^a-zA-Z0-9._-]+/g, '_');
        const attachRef = storage.ref(`attachments/${cleaned.id}_${fieldName}_${Date.now()}_${safeName}`);
        const snapshot = await attachRef.put(file);
        if (!snapshot) throw new Error('Upload failed');
        const url = await attachRef.getDownloadURL();
        cleaned[fieldName + 'URL'] = url;
        console.log(`✅ [${fieldName}] Uploaded:`, url);
      } catch (err) {
        console.error('❌ خطأ في رفع المرفق:', fieldName, err);
        cleaned[fieldName + 'URL'] = '';
      }
    }
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
