// /api/stripe/create-checkout-session.js

const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);



module.exports = async (req, res) => {

  // CORS الخفيف (إن لزم)

  res.setHeader('Access-Control-Allow-Origin', '*');

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');



  if (req.method === 'OPTIONS') {

    return res.status(200).end();

  }



  if (req.method !== 'POST') {

    return res.status(405).json({ error: 'Method not allowed' });

  }



  try {

    const { email, priceId, metadata } = req.body || {};

    const price = priceId || process.env.STRIPE_PRICE_YEARLY;

    if (!price) {

      return res.status(400).json({ error: 'Missing price id (STRIPE_PRICE_YEARLY env or priceId in body).' });

    }



    const site = process.env.SITE_URL || `https://${req.headers.host}`;



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      payment_method_types: ['card'],

      customer_email: email || undefined,

      line_items: [{ price, quantity: 1 }],

      allow_promotion_codes: true,

      // إن أردت فرض تجربة مجانية من هنا بدل إعدادها على السعر:

      // subscription_data: { trial_period_days: 30 },

      success_url: `${site}/success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${site}/cancel`,

      metadata: metadata || {}

    });



    return res.status(200).json({ id: session.id, url: session.url });

  } catch (err) {

    console.error('stripe/create-checkout-session error:', err);

    return res.status(500).json({ error: 'Stripe error', details: err.message });

  }

};
