const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);



module.exports = async (req, res) => {

  try {

    if (req.method !== 'POST') {

      res.status(405).json({ error: 'Method Not Allowed' });

      return;

    }



    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_MONTHLY || !process.env.SITE_URL) {

      res.status(500).json({ error: 'Server misconfigured: missing environment variables' });

      return;

    }



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      line_items: [{ price: process.env.STRIPE_PRICE_MONTHLY, quantity: 1 }],

      allow_promotion_codes: true,

      success_url: `${process.env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${process.env.SITE_URL}/cancel.html`

    });



    res.status(200).json({ url: session.url });

  } catch (err) {

    console.error('Stripe error:', err.message);

    res.status(500).json({ error: 'Something went wrong' });

  }

};
