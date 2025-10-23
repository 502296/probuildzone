// netlify/functions/create-checkout-session.js

const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



exports.handler = async (event) => {

  try {

    if (event.httpMethod !== 'POST') {

      return { statusCode: 405, body: 'Method Not Allowed' };

    }



    // بإمكانك قراءة بيانات إضافية من الواجهة لو أردت

    // const { email } = JSON.parse(event.body || '{}');



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      line_items: [

        {

          price: process.env.STRIPE_PRICE_MONTHLY, // 25$ شهري

          quantity: 1,

        }

      ],

      allow_promotion_codes: true,

      subscription_data: {

        // تجربة مجانية 30 يوم

        trial_period_days: 30

      },

      // لو تريد إجبار إدخال البريد حتى نستخدمه لاحقًا:

      customer_creation: 'always',

      success_url: `${process.env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${process.env.SITE_URL}/cancel.html`

    });



    return {

      statusCode: 200,

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ url: session.url })

    };

  } catch (err) {

    console.error('Stripe error:', err);

    return { statusCode: 500, body: 'Server error creating session' };

  }

};
