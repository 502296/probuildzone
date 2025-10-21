// /api/stripe/create-checkout-session.js

module.exports = async (req, res) => {

  // CORS + Preflight

  res.setHeader('Access-Control-Allow-Origin', '*');

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');



  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {

    return res.status(405).json({ error: 'Method Not Allowed', hint: 'Use POST' });

  }



  // نحمّل stripe فقط عند الحاجة

  let Stripe;

  try {

    Stripe = require('stripe');

  } catch (e) {

    console.error('PBZ: Stripe SDK missing:', e?.message);

    return res.status(500).json({ error: 'Stripe SDK missing. Add "stripe" to package.json' });

  }



  // تحقق من المتغيّرات

  const key = process.env.STRIPE_SECRET_KEY;

  const priceId = process.env.STRIPE_PRICE_MONTHLY;

  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';



  if (!key)  return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY env var' });

  if (!priceId) return res.status(500).json({ error: 'Missing STRIPE_PRICE_MONTHLY env var' });



  try {

    const stripe = new Stripe(key);

    const { email, name, company, phone, address, city, state, zip } = req.body || {};



    const successUrl = `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl  = `${siteUrl}/cancel.html`;



    const trialDaysEnv = parseInt(process.env.TRIAL_DAYS, 10);

    const useTrial = Number.isInteger(trialDaysEnv) && trialDaysEnv > 0;



    const metadata = {};

    if (name)    metadata.name = String(name);

    if (company) metadata.company = String(company);

    if (phone)   metadata.phone = String(phone);

    if (address) metadata.address = String(address);

    if (city)    metadata.city = String(city);

    if (state)   metadata.state = String(state);

    if (zip)     metadata.zip = String(zip);



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      line_items: [{ price: priceId, quantity: 1 }],

      customer_email: email || undefined,

      success_url: successUrl,

      cancel_url: cancelUrl,

      allow_promotion_codes: true,

      subscription_data: {

        metadata,

        ...(useTrial ? { trial_period_days: trialDaysEnv } : {})

      },

      customer_creation: 'if_required'

    });



    return res.status(200).json({ url: session.url });

  } catch (err) {

    // نطبع للّوج ونرجّع رسالة مفهومة للواجهة

    console.error('PBZ: Stripe error:', err?.type || '', err?.message || err);

    return res.status(500).json({

      error: 'Failed to create checkout session',

      details: err?.message || 'Unknown error'

    });

  }

};
