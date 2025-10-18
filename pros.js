const startBtn = document.getElementById('startTrialBtn');

const modal = document.getElementById('applyModal');

const closeBtn = document.getElementById('closeModal');

const form = document.getElementById('proApplyForm');

const msg = document.getElementById('formMsg');



startBtn.addEventListener('click', ()=>{ modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); });

closeBtn.addEventListener('click', ()=>{ modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); });



form.addEventListener('submit', async (e)=>{

  e.preventDefault();

  msg.textContent = 'Saving your application…'; msg.className = 'msg';



  const data = Object.fromEntries(new FormData(form).entries());

  if(!data.agree){ msg.textContent='Please accept the terms.'; msg.className='msg error'; return; }



  try {

    // 1) Save to our backend (which forwards to Google Sheets)

    const saveRes = await fetch('/api/pros/apply', {

      method: 'POST',

      headers: {'Content-Type':'application/json'},

      body: JSON.stringify(data)

    });

    const saveJson = await saveRes.json();

    if(!saveRes.ok){ throw new Error(saveJson?.error || 'Failed to save application'); }



    msg.textContent = 'Application saved. Creating your Stripe session…';



    // 2) Create Stripe Checkout Session (subscription w/ 30-day trial)

    const stripeRes = await fetch('/api/stripe/create-checkout-session', {

      method:'POST',

      headers:{'Content-Type':'application/json'},

      body: JSON.stringify({

        email: data.email,

        phone: data.phone,

        company: data.company,

        full_name: data.full_name,

        areas: data.areas,

        services: data.services,

      })

    });

    const stripeJson = await stripeRes.json();

    if(!stripeRes.ok || !stripeJson?.url){ throw new Error(stripeJson?.error || 'Failed to create checkout session'); }



    // 3) Redirect to Stripe

    window.location.href = stripeJson.url;

  } catch(err){

    msg.textContent = err.message || 'Something went wrong';

    msg.className = 'msg error';

  }

});
