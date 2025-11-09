// assets/homeowner.js

const form = document.getElementById('homeowner-form');

const statusEl = document.getElementById('homeowner-status');



if (form) {

  form.addEventListener('submit', async (e) => {

    e.preventDefault();

    if (statusEl) statusEl.textContent = 'Sending...';



    const data = Object.fromEntries(new FormData(form).entries());



    // category from label

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

        statusEl.textContent = '✅ Job posted. Waiting for approval.';

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
