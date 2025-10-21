// /api/stripe/create-checkout-session.js

// Creates a Stripe Checkout Session for a MONTHLY subscription with optional trial days.



const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });



module.exports = async (req, res) => {

  // --- CORS (مهم إذا كان الموقع على دومين و الـ API على دومين/ساب دومين آخر)

  res.setHeader('Access-Control-Allow-Origin', '*');

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });



  try {

    const body = req.body || {};

    const priceId = process.env.STRIPE_PRICE_MONTHLY;

    const siteURL = (process.env.SITE_URL || 'https://probuildzone.com').replace(/\/+$/, '');

    const trialDays = parseInt(process.env.STRIPE_TRIAL_DAYS || '0', 10);



    if (!priceId) {

      return res.status(400).json({ error: 'Missing STRIPE_PRICE_MONTHLY' });

    }



    const subscription_data = {

      metadata: {

        source: 'probuildzone',

        plan: 'monthly',

        email: body.email || ''

      }

    };



    if (trialDays > 0) {

      subscription_data.trial_period_days = trialDays;

      // اختياري: ماذا يحدث إذا انتهت التجربة بدون وسيلة دفع؟

      // subscription_data.trial_settings = {

      //   end_behavior: { missing_payment_method: 'cancel' }

      // };

    }



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      payment_method_types: ['card'],

      billing_address_collection: 'auto',

      customer_email: body.email || undefined, // يملأ الإيميل تلقائياً في Checkout

      allow_promotion_codes: true,

      line_items: [{ price: priceId, quantity: 1 }],

      subscription_data,

      success_url: `${siteURL}/pros.html?status=success&session_id={{CHECKOUT_SESSION_ID}}`,

      cancel_url: `${siteURL}/pros.html?status=cancel`

      // automatic_tax: { enabled: true }, // اختياري

    });



    return res.status(200).json({ url: session.url, id: session.id });

  } catch (err) {

    console.error('create-checkout-session error:', err);

    return res.status(500).json({ error: 'Server error', details: err.message });

  }

};
