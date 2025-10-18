// pros.js

(function () {

  function $ (id) { return document.getElementById(id); }



  function openModal() {

    const modal = $('applyModal');

    if (!modal) return console.error('Missing #applyModal');

    modal.classList.remove('hidden');

    modal.setAttribute('aria-hidden', 'false');

  }

  function closeModal() {

    const modal = $('applyModal');

    if (!modal) return;

    modal.classList.add('hidden');

    modal.setAttribute('aria-hidden', 'true');

  }



  function boot() {

    const startBtn = $('startTrialBtn');

    const closeBtn = $('closeModal');

    if (!startBtn) { console.error('Missing #startTrialBtn'); return; }



    startBtn.addEventListener('click', openModal);

    if (closeBtn) closeBtn.addEventListener('click', closeModal);



    // اجعلها متاحة كـ fallback عبر onclick في الـ HTML

    window.showApplyModal = openModal;

    window.hideApplyModal = closeModal;



    // باقي كود الإرسال يبقى كما هو عندك…

  }



  if (document.readyState === 'loading') {

    document.addEventListener('DOMContentLoaded', boot);

  } else {

    boot();

  }

})();
