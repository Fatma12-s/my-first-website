// رفع المرفقات إلى Firebase Storage

// رفع المرفقات إلى Firebase Storage
window.fileUpload = {
  uploadAttachment: async function(file, fieldName, cleaned) {
    if (file && file instanceof File) {
      try {
        const ok = await window.ensureFirebase?.();
        if (!ok) throw new Error('Firebase not initialized');
        const storage = window.firebase.storage.getStorage();
        const attachRef = window.firebase.storage.ref(storage, `attachments/${cleaned.id}_${fieldName}_${Date.now()}_${file.name}`);
        const snapshot = await window.firebase.storage.uploadBytes(attachRef, file);
        if (!snapshot) throw new Error('Upload failed');
        const url = await window.firebase.storage.getDownloadURL(attachRef);
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
