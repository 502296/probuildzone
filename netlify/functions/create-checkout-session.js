
const Stripe = require('stripe');
exports.handler = async (event) => {
  // CORS + OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: 'ok'
    };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20'
    });
    const { priceId, customer_email, metadata } = JSON.parse(event.body || '{}');
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId || process.env.STRIPE_PRICE_MONTHLY,
          quantity: 1
        }
      ],
      success_url: `${process.env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL}/cancel.html`,
      allow_promotion_codes: true,
      customer_email: customer_email || undefined,
      billing_address_collection: 'auto',
     metadata: metadata || {}
    });
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: session.url })
    };
  } catch (err) {
    console.error('Stripe error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*' },
      body: JSON.stringify({ error: 'Failed to create checkout session' })
    };
  }
};
