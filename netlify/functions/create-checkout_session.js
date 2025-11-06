// netlify/functions/create-checkout-session.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);



exports.handler = async (event) => {

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      body: JSON.stringify({ error: 'Method not allowed' }),

    };

  }



  try {

    const { customer_email } = JSON.parse(event.body || '{}');



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      line_items: [

        {

          price: process.env.STRIPE_PRICE_MONTHLY,

          quantity: 1,

        },

      ],

      success_url: `${process.env.SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${process.env.SITE_URL}/cancel`,

      customer_email: customer_email || undefined,

    });



    return {

      statusCode: 200,

      body: JSON.stringify({ id: session.id, url: session.url }),

    };

  } catch (err) {

    console.error('Stripe error:', err);

    return {

      statusCode: 500,

      body: JSON.stringify({ error: err.message }),

    };

  }

};
