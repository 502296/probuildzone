const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);



// POST /api/stripe/create-checkout-session

module.exports = async (req, res) => {

  if (req.method !== 'POST') {

    res.status(405).json({ error: 'Method not allowed' });

    return;

  }

  try {

    const { email, trial } = req.body || {};

    const price = process.env.STRIPE_PRICE_YEARLY; // price_... للاشتراك السنوي

    const successUrl = `${process.env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl  = `${process.env.SITE_URL}/cancel.html`;



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      line_items: [{ price, quantity: 1 }],

      customer_email: email || undefined,

      // مفعّل تجربة 30 يوم من السيرفر (بدون كشف أي مفاتيح بالفرونت)

      subscription_data: trial ? { trial_period_days: 30 } : {},

      allow_promotion_codes: true,

      success_url: successUrl,

      cancel_url: cancelUrl

    });



    res.status(200).json({ url: session.url });

  } catch (e) {

    res.status(400).json({ error: e.message });

  }

};
