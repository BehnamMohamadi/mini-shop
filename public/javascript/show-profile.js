document.addEventListener('DOMContentLoaded', function() {
  // انتخاب عناصر
  const profileBtn = document.querySelector('.bx-user');
  const profilePopup = document.getElementById('profilePopup');
  const closeBtn = document.querySelector('.close-btn');
  const profileForm = document.getElementById('profileForm');

  // باز کردن پاپ‌آپ هنگام کلیک روی آیکون کاربر
  if (profileBtn) {
    profileBtn.addEventListener('click', function(e) {
      e.preventDefault();
      profilePopup.style.display = 'flex';
      document.body.style.overflow = 'hidden'; // جلوگیری از اسکرول صفحه
    });
  }

  // بستن پاپ‌آپ
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      profilePopup.style.display = 'none';
      document.body.style.overflow = 'auto';
    });
  }

  // بستن پاپ‌آپ هنگام کلیک خارج از آن
  window.addEventListener('click', function(event) {
    if (event.target === profilePopup) {
      profilePopup.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  });

  // مدیریت ارسال فرم
  if (profileForm) {
    profileForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // دریافت مقادیر جدید
      const newUsername = document.getElementById('username').value;
      const newJob = document.getElementById('job').value;
      const newEmail = document.getElementById('email').value;
      
      // در اینجا می‌توانید مقادیر را به سرور ارسال کنید
      console.log('Updated profile:', { newUsername, newJob, newEmail });
      
      // بستن پاپ‌آپ پس از ذخیره
      profilePopup.style.display = 'none';
      document.body.style.overflow = 'auto';
      
      // نمایش پیام موفقیت
      alert('Profile updated successfully!');
    });
  }
});