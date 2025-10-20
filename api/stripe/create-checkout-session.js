// /api/stripe/create-checkout-session.js

const Stripe = require('stripe');



module.exports = async (req, res) => {

  if (req.method !== 'POST') {

    res.status(405).json({ error: 'Method Not Allowed' });

    return;

  }



  try {

    const { STRIPE_SECRET_KEY, STRIPE_PRICE_ID, SITE_URL } = process.env;

    if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) {

      res.status(500).json({ error: 'Missing STRIPE env vars' });

      return;

    }



    const stripe = new Stripe(STRIPE_SECRET_KEY);



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],

      subscription_data: { trial_period_days: 30 },

      allow_promotion_codes: true,

      success_url: `${SITE_URL || 'http://localhost:3000'}/success.html?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${SITE_URL || 'http://localhost:3000'}/cancel.html`

    });



    res.status(200).json({ url: session.url });

  } catch (err) {

    console.error('Stripe error:', err);

    res.status(500).json({ error: 'Stripe error', details: err.message });

  }

};
