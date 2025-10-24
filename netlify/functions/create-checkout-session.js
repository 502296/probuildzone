// netlify/functions/create-checkout-session.js

const Stripe = require('stripe');



exports.handler = async (event) => {

  if (event.httpMethod !== 'POST') {

    return { statusCode: 405, body: 'Method Not Allowed' };

  }



  try {

    const secret = process.env.STRIPE_SECRET_KEY;

    const priceId = process.env.STRIPE_PRICE_MONTHLY; // يجب أن يبدأ بـ price_

    const siteUrl = process.env.SITE_URL;             // مثل https://probuildzone.com أو https://probuildzone.netlify.app



    if (!secret || !priceId || !siteUrl) {

      const msg = `Missing env: STRIPE_SECRET_KEY=${!!secret}, STRIPE_PRICE_MONTHLY=${!!priceId}, SITE_URL=${!!siteUrl}`;

      console.error(msg);

      return { statusCode: 500, body: JSON.stringify({ ok:false, error: msg }) };

    }



    const stripe = new Stripe(secret);

    const { email } = JSON.parse(event.body || '{}');



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      payment_method_types: ['card'],

      customer_email: email || undefined,

      allow_promotion_codes: true,

      line_items: [{ price: priceId, quantity: 1 }],

      success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${siteUrl}/pros.html`,

      billing_address_collection: 'auto'

    });



    return { statusCode: 200, body: JSON.stringify({ ok:true, url: session.url }) };

  } catch (err) {

    console.error('create-checkout-session error:', err);

    return { statusCode: 500, body: JSON.stringify({ ok:false, error: err.message || 'Failed to create session' }) };

  }

};
