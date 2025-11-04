// netlify/functions/create-checkout-session.js



const Stripe = require('stripe');



exports.handler = async (event) => {

  // CORS

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

    const secret  = process.env.STRIPE_SECRET_KEY;

    const priceId = process.env.STRIPE_PRICE_YEARLY || process.env.STRIPE_PRICE_MONTHLY;

    const siteUrl = process.env.SITE_URL;

    const gsUrl  = "https://script.google.com/macros/s/AKfycbyrPVGLAESUPdUvKxc3YpS-77CiZoipZo91y_yaKkwiTuHp5eDHsfDlKF6qA1ZXUSI3/exec";  // 👈 هنا رابط الويب آب



    if (!secret || !priceId || !siteUrl) {

      return {

        statusCode: 500,

        body: 'Missing env vars (STRIPE_SECRET_KEY / STRIPE_PRICE_* / SITE_URL)',

      };

    }



    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });

    const data = JSON.parse(event.body || '{}');



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

    } = data;



    // 1) أنشئ جلسة Stripe

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



    // 2) ابعث نفس الداتا للـ Google Web App (لو موجود)

    if (gsUrl) {

      const payload = {

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

      };



      // نتلايفاي على Node 18 فعنده fetch

      try {

        await fetch(gsUrl, {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify(payload),

        });

      } catch (sheetErr) {

        console.error('Error calling GS web app:', sheetErr);

        // ما نرجّع خطأ للمستخدم عشان ما نخرب الـ Stripe

      }

    }



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
