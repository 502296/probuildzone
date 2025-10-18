module.exports = async (req, res) => {

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {

    // بارس البودي حتى لو جاء نص

    let body = req.body;

    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

    body = body || {};



    const { email = '', phone = '', company = '', full_name = '', areas = '', services = '' } = body;

    if (!email) return res.status(400).json({ error: 'Email is required' });



    const secret  = process.env.STRIPE_SECRET_KEY;

    const priceId = process.env.STRIPE_PRICE_YEARLY; // نستخدمه شهريًا الآن

    const baseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';

    if (!secret)  return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' });

    if (!priceId) return res.status(500).json({ error: 'Missing STRIPE_PRICE_YEARLY' });



    const p = new URLSearchParams();

    p.append('mode','subscription');

    p.append('success_url', `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`);

    p.append('cancel_url', `${baseUrl}/pros.html?canceled=true`);

    p.append('customer_email', email);

    p.append('line_items[0][price]', priceId);

    p.append('line_items[0][quantity]','1');

    p.append('payment_method_collection','always');

    p.append('billing_address_collection','required');

    p.append('phone_number_collection[enabled]','true');

    p.append('subscription_data[trial_period_days]','30');

    if (company)   p.append('subscription_data[metadata][company]', company);

    if (full_name) p.append('subscription_data[metadata][full_name]', full_name);

    if (areas)     p.append('subscription_data[metadata][areas]', areas);

    if (services)  p.append('subscription_data[metadata][services]', services);

    if (company)   p.append('metadata[company]', company);

    if (full_name) p.append('metadata[full_name]', full_name);

    p.append('custom_text[submit][message]','No charge today. Your 30-day free trial starts now.');

    p.append('custom_text[after_submit][message]','Thanks! No charge until day 31.');



    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {

      method: 'POST',

      headers: { 'Authorization': `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },

      body: p.toString()

    });



    const raw = await resp.text();

    let json; try { json = JSON.parse(raw); } catch { json = null; }

    if (!resp.ok || !json?.url) {

      return res.status(resp.status || 500).json({ error: json?.error?.message || raw.slice(0, 400) });

    }

    return res.status(200).json({ url: json.url });

  } catch (err) {

    return res.status(500).json({ error: err.message || String(err) });

  }

};
