// /js/homeowner.js



const form = document.getElementById('homeowner-form');

const statusEl = document.getElementById('homeowner-status');



form.addEventListener('submit', async (e) => {

  e.preventDefault();

  statusEl.textContent = 'Sending...';



  const data = Object.fromEntries(new FormData(form).entries());



  // لو فيه لابل فيه الكاتيجوري

  const catLabel = document.getElementById('categoryLabel');

  if (catLabel) {

    data.category = catLabel.textContent.replace('Category:', '').trim();

  }



  try {

    const res = await fetch('/.netlify/functions/save-homeowner-job', {

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

    statusEl.textContent = '❌ Network error.';

  }

});
