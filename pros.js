form.addEventListener('submit', async (e)=>{

  e.preventDefault();

  msg.textContent = 'Saving your application…'; msg.className = 'msg';



  const data = Object.fromEntries(new FormData(form).entries());

  if (!data.agree) { msg.textContent = 'Please accept the terms.'; msg.className = 'msg error'; return; }



  try {

    // 1) حفظ في Google Sheets عبر API

    const saveRes = await fetch('/api/pros/apply', {

      method: 'POST',

      headers: {'Content-Type':'application/json'},

      body: JSON.stringify(data)

    });



    const saveRaw = await saveRes.text();

    let saveJson; try { saveJson = JSON.parse(saveRaw); } catch { saveJson = null; }



    if (!saveRes.ok || !saveJson?.ok) {

      throw new Error((saveJson && saveJson.error) || saveRaw || 'Sheets relay error');

    }



    msg.textContent = 'Application saved. Creating your Stripe session…';



    // 2) إنشاء جلسة Stripe

    const stripeRes = await fetch('/api/stripe/create-checkout-session', {

      method:'POST',

      headers:{'Content-Type':'application/json'},

      body: JSON.stringify({

        email: data.email,

        phone: data.phone,

        company: data.company,

        full_name: data.full_name,

        areas: data.areas,

        services: data.services

      })

    });



    const stripeRaw = await stripeRes.text();

    let stripeJson; try { stripeJson = JSON.parse(stripeRaw); } catch { stripeJson = null; }



    if (!stripeRes.ok || !stripeJson?.url) {

      throw new Error((stripeJson && stripeJson.error) || stripeRaw || 'Stripe API error');

    }



    // 3) التحويل إلى Stripe

    window.location.href = stripeJson.url;



  } catch (err) {

    msg.textContent = err.message || 'Something went wrong';

    msg.className = 'msg error';

  }

});
