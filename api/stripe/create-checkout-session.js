// /api/stripe/create-checkout-session.js

// يعمل على Vercel Node 18 بدون الاعتماد على body

const Stripe = require('stripe');



module.exports = async (req, res) => {

  // سموح بـ CORS لو احتجته

  res.setHeader('Access-Control-Allow-Origin', '*');

  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');

  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {

    res.status(200).end();

    return;

  }



  if (req.method !== 'POST') {

    res.status(405).json({ error: 'Method Not Allowed' });

    return;

  }



  try {

    const { STRIPE_SECRET_KEY, STRIPE_PRICE_YEARLY, SITE_URL } = process.env;

    if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_YEARLY) {

      res.status(500).json({ error: 'Missing STRIPE env vars' });

      return;

    }



    const stripe = new Stripe(STRIPE_SECRET_KEY);



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      line_items: [{ price: STRIPE_PRICE_YEARLY, quantity: 1 }],

      // نحط التجربة هنا (حتى لو السعر ما عليه Trial)

      subscription_data: { trial_period_days: 30 },

      allow_promotion_codes: true,

      // نجمع الإيميل على صفحة Stripe مباشرة

      customer_creation: 'if_required',

      success_url: `${SITE_URL || 'http://localhost:3000'}/success.html?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${SITE_URL || 'http://localhost:3000'}/cancel.html`

    });



    res.status(200).json({ url: session.url });

  } catch (err) {

    console.error('Stripe error:', err);

    res.status(500).json({ error: 'Stripe error', details: err.message });

  }

};
