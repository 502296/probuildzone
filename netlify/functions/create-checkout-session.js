const Stripe = require('stripe');
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });

    const SITE_URL = process.env.SITE_URL || 'http://localhost:8888';
    const body = JSON.parse(event.body || '{}');
    const {
      mode = 'subscription',
      priceName = 'MONTHLY',
      trial_days = 0,
      customer_email,
      metadata = {}
    } = body;

    const priceId =
      priceName === 'MONTHLY'
        ? process.env.STRIPE_PRICE_MONTHLY // price_...
        : null;

    if (!priceId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing STRIPE_PRICE_MONTHLY' }) };
    }

    const session = await stripe.checkout.sessions.create({
      mode, // 'subscription'
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/cancel.html`,
      customer_email: customer_email || undefined,
      metadata,
      subscription_data: trial_days > 0
        ? { trial_period_days: trial_days }
        : undefined,
      allow_promotion_codes: true,
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error('Checkout error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create session' }) };
  }
};
