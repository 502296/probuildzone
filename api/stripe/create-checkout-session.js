// /api/stripe/create-checkout-session.js  (no stripe SDK)

module.exports = async (req, res) => {

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });



  try {

    const { email = '', phone = '', company = '', full_name = '', areas = '', services = '' } = req.body || {};

    if (!email) return res.status(400).json({ error: 'Email is required' });



    const secret = process.env.STRIPE_SECRET_KEY;

    const priceId = process.env.STRIPE_PRICE_YEARLY;  // نستخدمه للسعر الشهري حاليًا

    const baseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';



    if (!secret)  return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' });

    if (!priceId) return res.status(500).json({ error: 'Missing STRIPE_PRICE_YEARLY' });



    const params = new URLSearchParams();

    // أساسيات الجلسة

    params.append('mode', 'subscription');

    params.append('success_url', `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`);

    params.append('cancel_url', `${baseUrl}/pros.html?canceled=true`);

    params.append('customer_email', email);



    // عناصر السلة

    params.append('line_items[0][price]', priceId);

    params.append('line_items[0][quantity]', '1');



    // نجمع البطاقة الآن لكن الفوترة بعد التجربة

    params.append('payment_method_collection', 'always');

    params.append('billing_address_collection', 'required');



    // تفعيل جمع الهاتف في Checkout

    params.append('phone_number_collection[enabled]', 'true');



    // تجربة مجانية 30 يوم

    params.append('subscription_data[trial_period_days]', '30');



    // Metadata (اختياري لكنها مفيدة)

    if (company)   params.append('subscription_data[metadata][company]', company);

    if (full_name) params.append('subscription_data[metadata][full_name]', full_name);

    if (areas)     params.append('subscription_data[metadata][areas]', areas);

    if (services)  params.append('subscription_data[metadata][services]', services);

    if (company)   params.append('metadata[company]', company);

    if (full_name) params.append('metadata[full_name]', full_name);



    // نصوص مخصصة في صفحة Checkout

    params.append('custom_text[submit][message]', 'No charge today. Your 30-day free trial starts now.');

    params.append('custom_text[after_submit][message]', 'Thanks! No charge until day 31.');



    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {

      method: 'POST',

      headers: {

        'Authorization': `Bearer ${secret}`,

        'Content-Type': 'application/x-www-form-urlencoded'

      },

      body: params.toString()

    });



    const raw = await resp.text();

    let json; try { json = JSON.parse(raw); } catch { json = null; }



    if (!resp.ok || !json?.url) {

      // Stripe يرسل body مفيد عند الخطأ—نعرضه للمساعدة

      return res.status(resp.status || 500).json({ error: json?.error?.message || raw.slice(0, 400) });

    }



    return res.status(200).json({ url: json.url });

  } catch (err) {

    return res.status(500).json({ error: err.message || String(err) });

  }

};
