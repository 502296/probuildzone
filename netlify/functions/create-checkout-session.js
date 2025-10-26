// netlify/functions/create-checkout-session.js

const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });



exports.handler = async (event) => {

  // السماح فقط بـ POST

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      headers: { 'Allow': 'POST', 'Content-Type': 'application/json' },

      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' })

    };

  }



  try {

    const data = JSON.parse(event.body || '{}');



    const priceId =

      data.priceId ||

      process.env.STRIPE_PRICE_YEARLY ||     // price_... للاشتراك السنوي

      process.env.STRIPE_PRICE_MONTHLY;      // (اختياري) لو عندك الشهري



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      payment_method_types: ['card'],

      line_items: [{ price: priceId, quantity: 1 }],

      allow_promotion_codes: true,

      subscription_data: { trial_period_days: 30 }, // 30 يوم تجربة

      success_url: `${process.env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${process.env.SITE_URL}/cancel.html`

    });



    return {

      statusCode: 200,

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ url: session.url })

    };

  } catch (err) {

    console.error('Stripe create session error:', err);

    return {

      statusCode: 500,

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ error: 'Failed to create checkout session' })

    };

  }

};
