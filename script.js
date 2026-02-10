// سنة العام الحالية في التذييل
document.getElementById('year').textContent = new Date().getFullYear();

// قائمة الجوال (زر ☰)
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');
burger?.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// إرسال نموذج التواصل (بدون خادم — رسالة نجاح تجريبية)
const form = document.getElementById('contactForm');
const status = document.getElementById('formStatus');
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());

  // تحقّق بسيط
  if(!data.name || !data.email || !data.message){
    status.textContent = 'يرجى تعبئة جميع الحقول.';
    status.style.color = 'crimson';
    return;
  }

  // هنا عادة نرسل البيانات إلى خادم/خدمة بريد
  // fetch('/api/contact', { method:'POST', body: JSON.stringify(data) ... })

  // محاكاة نجاح
  status.textContent = 'تم استلام رسالتك، سنعود إليك قريبًا. ✅';
  status.style.color = 'seagreen';
  form.reset();
});