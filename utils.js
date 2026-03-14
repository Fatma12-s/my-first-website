// دوال مساعدة
window.utils = {
  escapeHtml: function(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
  getPrintableLabel: function(key) {
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
};
