// assets/homeowner.js



const form = document.getElementById('homeowner-form');

const statusEl = document.getElementById('homeowner-status');

const btn = document.getElementById('postJobBtn');



// لو الصفحة القديمة كانت تربط الزر بفاكشن ثانية وتطلع الرسالة هذي

// نحن بنوقف أي handler قديم

if (btn) {

  btn.onclick = null;

}



if (form) {

  form.addEventListener('submit', async (e) => {

    e.preventDefault(); // أهم سطر: لا تستخدم الفحص القديم

    if (statusEl) statusEl.textContent = 'Sending...';



    // نجمع البيانات

    const data = Object.fromEntries(new FormData(form).entries());



    // نضيف الكاتيجوري لو موجود

    const catLabel = document.getElementById('categoryLabel');

    if (catLabel) {

      data.category = catLabel.textContent.replace('Category:', '').trim();

    }



    try {

      const res = await fetch('/.netlify/functions/post-homeowner', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(data),

      });



      const json = await res.json();



      if (json.ok) {

        statusEl.textContent = '✅ Job posted successfully.';

        form.reset();

      } else {

        statusEl.textContent = '❌ ' + (json.error || 'Could not save.');

      }

    } catch (err) {

      console.error(err);

      if (statusEl) statusEl.textContent = '❌ Network error.';

    }

  });

}
