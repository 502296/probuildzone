// netlify/functions/create-checkout-session.js



const Stripe = require('stripe');



exports.handler = async (event) => {

  // CORS للمتصفح

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



  if (event.httpMethod !== 'POST') {

    return { statusCode: 405, body: 'Method Not Allowed' };

  }



  try {

    // 1) env vars

    const secret  = process.env.STRIPE_SECRET_KEY;

    const priceId = process.env.STRIPE_PRICE_YEARLY || process.env.STRIPE_PRICE_MONTHLY;

    const siteUrl = process.env.SITE_URL;

    const gsUrl   = process.env.GS_WEBAPP_URL; // ← هذا اللي حطّيناه في نتلايفاي



    if (!secret || !priceId || !siteUrl) {

      return {

        statusCode: 500,

        body: 'Missing env vars (STRIPE_SECRET_KEY / STRIPE_PRICE_* / SITE_URL)',

      };

    }



    // 2) بيانات جاية من الصفحة (لو حبيت تستخدمها)

    const bodyData = JSON.parse(event.body || '{}');

    const {

      name,

      email,

      phone,

      address,

      license,

      insurance,

      notes,

      zip,

      notify_opt_in,

    } = bodyData;



    // 3) Stripe

    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      payment_method_types: ['card'],

      line_items: [{ price: priceId, quantity: 1 }],

      subscription_data: {

        trial_period_days: 30,

        metadata: {

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



    // 4) إرسال البيانات إلى Google Apps Script (اللي سوّيناه قبل شوي)

    if (gsUrl) {

      try {

        await fetch(gsUrl, {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({

            name,

            email,

            phone,

            address,

            license,

            insurance,

            notes,

            zip,

            notify_opt_in,

            session_id: session.id,

          }),

        });

      } catch (sheetErr) {

        // ما نخرب الدفع لو الشيت فشل

        console.error('Sheet error:', sheetErr);

      }

    } else {

      console.warn('GS_WEBAPP_URL is not set – skipping sheet save.');

    }



    // 5) رجّع رابط سترايب للواجهة

    return {

      statusCode: 200,

      headers: {

        'Access-Control-Allow-Origin': '*',

        'Content-Type': 'application/json',

      },

      body: JSON.stringify({ url: session.url }),

    };

  } catch (err) {

    console.error('Stripe session error:', err);

    return {

      statusCode: 500,

      headers: {

        'Access-Control-Allow-Origin': '*',

        'Content-Type': 'application/json',

      },

      body: JSON.stringify({ error: err.message }),

    };

  }

};
