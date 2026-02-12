// سنة العام الحالية في التذييل
document.getElementById('year')?.textContent = new Date().getFullYear();

// قائمة الجوال (زر ☰)
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');
burger?.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// ===== حفظ البيانات في localStorage =====
function saveFormData(formName, formData) {
  let allSubmissions = JSON.parse(localStorage.getItem('formSubmissions')) || {};
  
  if (!allSubmissions[formName]) {
    allSubmissions[formName] = [];
  }
  
  // إضافة معلومات الوقت والتاريخ
  formData.submittedAt = new Date().toLocaleString('ar-SA');
  formData.id = Date.now();
  
  allSubmissions[formName].push(formData);
  localStorage.setItem('formSubmissions', JSON.stringify(allSubmissions));
  
  return true;
}

// ===== استمارة تدريب الطلاب والخريجين =====
const graduatesForm = document.getElementById('graduates-form');
if (graduatesForm) {
  graduatesForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(graduatesForm).entries());
    
    if (saveFormData('graduates', formData)) {
      alert('✅ تم تقديم الطلب بنجاح! يمكنك عرض طلبك من صفحة الإدارة.');
      graduatesForm.reset();
    }
  });
}

// ===== استمارة البرامج الداخلية - الموظفين =====
const internalEmployeesForm = document.getElementById('internal-employees-form');
if (internalEmployeesForm) {
  internalEmployeesForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(internalEmployeesForm).entries());
    
    if (saveFormData('internal-employees', formData)) {
      alert('✅ تم تقديم الطلب بنجاح! يمكنك عرض طلبك من صفحة الإدارة.');
      internalEmployeesForm.reset();
    }
  });
}

// ===== استمارة البرامج الداخلية - غير الموظفين =====
const internalOthersForm = document.getElementById('internal-others-form');
if (internalOthersForm) {
  internalOthersForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(internalOthersForm).entries());
    
    if (saveFormData('internal-others', formData)) {
      alert('✅ تم تقديم الطلب بنجاح! يمكنك عرض طلبك من صفحة الإدارة.');
      internalOthersForm.reset();
    }
  });
}

// ===== استمارة البرامج التدريبية - الموظفين =====
const trainingEmployeesForm = document.getElementById('training-employees-form');
if (trainingEmployeesForm) {
  trainingEmployeesForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(trainingEmployeesForm).entries());
    
    if (saveFormData('training-employees', formData)) {
      alert('✅ تم تقديم الطلب بنجاح! يمكنك عرض طلبك من صفحة الإدارة.');
      trainingEmployeesForm.reset();
    }
  });
}

// ===== استمارة البرامج التدريبية - غير الموظفين =====
const trainingOthersForm = document.getElementById('training-others-form');
if (trainingOthersForm) {
  trainingOthersForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(trainingOthersForm).entries());
    
    if (saveFormData('training-others', formData)) {
      alert('✅ تم تقديم الطلب بنجاح! يمكنك عرض طلبك من صفحة الإدارة.');
      trainingOthersForm.reset();
    }
  });
}

// ===== استمارة التواصل =====
const contactForm = document.getElementById('contactForm') || document.querySelector('form:has(textarea[name="message"])');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(contactForm).entries());
    
    if (saveFormData('contact', formData)) {
      alert('✅ تم استلام رسالتك بنجاح! سنعود إليك قريباً.');
      contactForm.reset();
    }
  });
}