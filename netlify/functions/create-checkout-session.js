
const Stripe = require('stripe');



const ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const JSON_HDRS = {

  'Access-Control-Allow-Origin': ORIGIN,

  'Access-Control-Allow-Methods': 'POST, OPTIONS',

  'Access-Control-Allow-Headers': 'Content-Type, Authorization',

  'Content-Type': 'application/json'

};



exports.handler = async (event) => {

  try {

    // CORS preflight

    if (event.httpMethod === 'OPTIONS') {

      return { statusCode: 200, headers: JSON_HDRS, body: JSON.stringify({ ok: true }) };

    }



    if (event.httpMethod !== 'POST') {

      return { statusCode: 405, headers: JSON_HDRS, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    }



    // Parse body safely

    let body = {};

    try { body = JSON.parse(event.body || '{}'); } catch (_) {}



    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });



    // نستخدم السعر الشهري من البيئة؛ يمكن تمرير priceId من الواجهة إن لزم

    const priceId = body.priceId || process.env.STRIPE_PRICE_MONTHLY;



    if (!priceId) {

      return { statusCode: 400, headers: JSON_HDRS, body: JSON.stringify({ error: 'Missing price id' }) };

    }



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      line_items: [{ price: priceId, quantity: 1 }],

      success_url: `${process.env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${process.env.SITE_URL}/cancel.html`,

      allow_promotion_codes: true,

      billing_address_collection: 'auto',

      customer_email: body.customer_email || undefined,

      metadata: body.metadata || {}

    });



    return {

      statusCode: 200,

      headers: JSON_HDRS,

      body: JSON.stringify({ url: session.url })

    };

  } catch (err) {

    console.error('create-checkout-session error:', err);

    return {

      statusCode: 500,

      headers: JSON_HDRS, // ← مهم جدًا في مسار الخطأ

      body: JSON.stringify({ error: 'Failed to create checkout session' })

    };

  }

};
