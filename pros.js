// pros.js  — Netlify + Stripe Checkout (Monthly + 30d trial)

(function () {

  // Helpers

  function $(id) { return document.getElementById(id); }

  function show(el) { el && el.classList.remove('hidden'); }

  function hide(el) { el && el.classList.add('hidden'); }



  // Modal controls

  function openModal() {

    const modal = $('applyModal');

    if (!modal) return console.error('Missing #applyModal');

    show(modal);

    modal.setAttribute('aria-hidden', 'false');

  }



  function closeModal() {

    const modal = $('applyModal');

    if (!modal) return;

    hide(modal);

    modal.setAttribute('aria-hidden', 'true');

  }



  // Error / status helpers

  function setBusy(isBusy) {

    const btn = $('applySubmitBtn');

    if (!btn) return;

    btn.disabled = !!isBusy;

    btn.setAttribute('aria-busy', isBusy ? 'true' : 'false');

    if (isBusy) {

      btn.dataset._prevText = btn.innerText;

      btn.innerText = 'Processing...';

    } else {

      if (btn.dataset._prevText) btn.innerText = btn.dataset._prevText;

    }

  }



  function showError(msg) {

    // عنصر رسالة خطأ اختياري

    const e = $('applyError');

    if (e) {

      e.textContent = msg || 'Something went wrong. Please try again.';

      show(e);

    } else {

      // fallback

      alert(msg || 'Something went wrong. Please try again.');

    }

  }



  async function startCheckout(e) {

    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    hide($('applyError'));

    setBusy(true);



    try {

      // إن أردت إرسال بيانات النموذج كمرجع، استخرجها هنا:

      // const name = ($('fullName') || {}).value?.trim();

      // const phone = ($('phone') || {}).value?.trim();



      const res = await fetch('/.netlify/functions/create-checkout-session', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' }

        // body: JSON.stringify({ name, phone })

      });



      if (!res.ok) {

        const t = await res.text().catch(()=>'');

        throw new Error(`create-session failed: ${res.status} ${t}`);

      }



      const { url } = await res.json();

      if (!url) throw new Error('No session URL returned');

      window.location.href = url; // إلى Stripe Checkout

    } catch (err) {

      console.error(err);

      showError('Something went wrong. Please try again.');

      setBusy(false);

    }

  }



  function boot() {

    const startBtn = $('startTrialBtn');   // الزر في الصفحة لفتح المودال

    const closeBtn = $('closeModal');      // زر إغلاق المودال (اختياري)

    const form = $('applyForm');           // نموذج داخل المودال

    const submitBtn = $('applySubmitBtn'); // زر الإرسال داخل المودال



    if (!startBtn) {

      console.error('Missing #startTrialBtn');

      return;

    }



    // افتح المودال

    startBtn.addEventListener('click', openModal);

    if (closeBtn) closeBtn.addEventListener('click', closeModal);



    // إرسال النموذج → يبدأ Stripe Checkout

    if (form) {

      form.addEventListener('submit', startCheckout);

    }

    if (submitBtn) {

      // لو الزر داخل فورم ونريد منع submit الافتراضي أو لو زر مستقل

      submitBtn.addEventListener('click', startCheckout);

      submitBtn.setAttribute('type', 'button'); // يمنع submit مزدوج

    }



    // Fallbacks لو استُخدمت خصائص onclick في الـ HTML

    window.showApplyModal = openModal;

    window.hideApplyModal = closeModal;

    window.startProMonthlyTrial = startCheckout;

  }



  if (document.readyState === 'loading') {

    document.addEventListener('DOMContentLoaded', boot);

  } else {

    boot();

  }

})();
