const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });



module.exports = async (req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });



  try {

    const priceId = process.env.STRIPE_PRICE_MONTHLY;

    const siteURL = (process.env.SITE_URL || 'https://probuildzone.com').replace(/\/+$/, '');

    const trialDays = parseInt(process.env.STRIPE_TRIAL_DAYS || '0', 10);



    const subscription_data = {};

    if (trialDays > 0) subscription_data.trial_period_days = trialDays;



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      line_items: [{ price: priceId, quantity: 1 }],

      customer_email: (req.body && req.body.email) || undefined,

      allow_promotion_codes: true,

      subscription_data,

      success_url: `${siteURL}/pros.html?status=success&session_id={{CHECKOUT_SESSION_ID}}`,

      cancel_url: `${siteURL}/pros.html?status=cancel`

    });



    res.status(200).json({ url: session.url, id: session.id });

  } catch (e) {

    console.error(e);

    res.status(500).json({ error: 'Server error', details: e.message });

  }

};
