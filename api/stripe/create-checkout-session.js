// /api/stripe/create-checkout-session.js

// Runtime: Node 18 (تأكد من vercel.json)

const Stripe = require('stripe');



module.exports = async (req, res) => {

  try {

    if (req.method !== 'POST') {

      res.status(405).json({ error: 'Method Not Allowed' });

      return;

    }



    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const priceId = process.env.STRIPE_PRICE_YEARLY; // سعر سنوي مُفعّل عليه Trial من Stripe أو نضيف trial أدناه

    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';



    const { company, fullName, email, phone } = req.body || {};



    // حقل Email مهم لخلق/ربط العميل على Stripe

    if (!priceId || !process.env.STRIPE_SECRET_KEY) {

      res.status(500).json({ error: 'Missing STRIPE env vars' });

      return;

    }

    if (!email) {

      res.status(400).json({ error: 'Missing email' });

      return;

    }



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      line_items: [{ price: priceId, quantity: 1 }],

      // يمكنك استعمال الـ trial من السعر نفسه على Stripe، أو تفعيل أيام تجربة هنا:

      subscription_data: { trial_period_days: 30 },

      customer_email: email,

      metadata: {

        company: company || '',

        fullName: fullName || '',

        phone: phone || '',

        source: 'probuildzone-pros',

      },

      allow_promotion_codes: true,

      success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${siteUrl}/cancel.html`,

    });



    res.status(200).json({ url: session.url });

  } catch (err) {

    console.error('Stripe error:', err);

    res.status(500).json({ error: 'Stripe error', details: err.message });

  }

};
