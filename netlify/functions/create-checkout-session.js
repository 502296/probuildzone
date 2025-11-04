// netlify/functions/create-checkout-session.js



const Stripe = require('stripe');



exports.handler = async (event) => {

  // نسمح بس بالـ POST

  if (event.httpMethod !== 'POST') {

    return { statusCode: 405, body: 'Method Not Allowed' };

  }



  try {

    const secret   = process.env.STRIPE_SECRET_KEY;

    const priceId  = process.env.STRIPE_PRICE_YEARLY || process.env.STRIPE_PRICE_MONTHLY;

    const siteUrl  = process.env.SITE_URL;

    const gsUrl    = process.env.GS_WEBAPP_URL;   // 👈 هذا رابط Google Apps Script



    if (!secret || !priceId || !siteUrl) {

      return {

        statusCode: 500,

        body: 'Missing env vars (STRIPE_SECRET_KEY / STRIPE_PRICE_* / SITE_URL)',

      };

    }



    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });



    // الداتا الجاية من الفورم

    const data = JSON.parse(event.body || '{}');



    const {

      biz,

      name,

      email,

      phone,

      address,

      license,

      insurance,

      notes,

      zip,

      notify_opt_in,

    } = data;



    // 1) نعمل جلسة Stripe

    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      payment_method_types: ['card'],

      line_items: [{ price: priceId, quantity: 1 }],

      subscription_data: {

        trial_period_days: 30,

        metadata: {

          biz,

          name,

          email,

          phone,

          address,

          license,

          insurance,

          notes,

          zip,

          notify_opt_in,

        },

      },

      customer_email: email,

      success_url: `${siteUrl}/success.html`,

      cancel_url: `${siteUrl}/cancel.html`,

    });



    // 2) نحاول نرسل نفس الداتا إلى Google Sheet (لو متوفر الرابط)

    if (gsUrl) {

      try {

        await fetch(gsUrl, {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({

            biz,

            name,

            email,

            phone,

            address,

            license,

            insurance,

            notes,

            zip,

            notify_opt_in,

            created_at: new Date().toISOString(),

          }),

        });

      } catch (err) {

        // ما نوقف Stripe لو الـ Sheet فشل

        console.error('Failed to send to Google Script:', err);

      }

    }



    // نرجّع رابط Stripe

    return {

      statusCode: 200,

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ url: session.url }),

    };



  } catch (err) {

    console.error('Stripe error:', err);

    return {

      statusCode: 500,

      body: JSON.stringify({ error: err.message }),

    };

  }

};
