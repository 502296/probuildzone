// netlify/functions/create-checkout-session.js



const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



exports.handler = async (event) => {

  // السماح بطلبات OPTIONS (ضرورية لـ CORS)

  if (event.httpMethod === 'OPTIONS') {

    return {

      statusCode: 200,

      headers: {

        'Access-Control-Allow-Origin': '*',

        'Access-Control-Allow-Methods': 'POST, OPTIONS',

        'Access-Control-Allow-Headers': 'Content-Type',

      },

      body: 'ok',

    };

  }



  // نرفض أي طريقة غير POST

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      body: 'Method Not Allowed',

    };

  }



  try {

    const data = JSON.parse(event.body);

    const siteUrl = process.env.SITE_URL || 'https://probuildzone.netlify.app';



    // إنشاء جلسة Checkout في Stripe

    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      payment_method_types: ['card'],

      line_items: [

        {

          price: process.env.STRIPE_PRICE_YEARLY, // أو STRIPE_PRICE_MONTHLY

          quantity: 1,

        },

      ],

      allow_promotion_codes: true,

      success_url: `${siteUrl}/success.html`,

      cancel_url: `${siteUrl}/cancel.html`,

      metadata: {

        name: data.name || '',

        email: data.email || '',

        phone: data.phone || '',

        address: data.address || '',

        license: data.license || '',

        insurance: data.insurance || '',

        notes: data.notes || '',

      },

    });



    return {

      statusCode: 200,

      headers: { 'Access-Control-Allow-Origin': '*' },

      body: JSON.stringify({ url: session.url }),

    };

  } catch (err) {

    return {

      statusCode: 500,

      body: `Error creating checkout session: ${err.message}`,

    };

  }

};
