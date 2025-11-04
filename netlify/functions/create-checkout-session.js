const Stripe = require('stripe');



// بعض بيئات نتلايفاي ما يكون فيها fetch جاهز

const fetch = (...args) =>

  import('node-fetch').then(({ default: fetch }) => fetch(...args));



exports.handler = async (event) => {

  // السماح للـOPTIONS

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



  // نسمح بس للـPOST

  if (event.httpMethod !== 'POST') {

    return { statusCode: 405, body: 'Method Not Allowed' };

  }



  try {

    const secret  = process.env.STRIPE_SECRET_KEY;

    const priceId = process.env.STRIPE_PRICE_YEARLY || process.env.STRIPE_PRICE_MONTHLY;

    const siteUrl = process.env.SITE_URL;



    if (!secret || !priceId || !siteUrl) {

      return {

        statusCode: 500,

        body: 'Missing env vars (STRIPE_SECRET_KEY / STRIPE_PRICE_* / SITE_URL)',

      };

    }



    // 👇 Stripe مثل ما هو

    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });

    const data = JSON.parse(event.body || '{}');

    const { name, email, phone, address, license, insurance, notes } = data;



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      payment_method_types: ['card'],

      line_items: [{ price: priceId, quantity: 1 }],

      subscription_data: {

        trial_period_days: 30,

        metadata: { name, email, phone, address, license, insurance, notes },

      },

      customer_email: email,

      success_url: `${siteUrl}/success.html`,

      cancel_url: `${siteUrl}/cancel.html`,

    });

    // ☝️ هذا الجزء ما لمسناه



    // ========= إضافة حفظ Google Sheet =========

    try {

      // لو موجود في نتلايفاي خذه، لو مش موجود استخدم الرابط اللي جربته ونجح

      const gsUrl =

        process.env.GS_WEBAPP_URL ||

        'https://script.google.com/macros/s/AKfycbw_8IzfwoM6cdLEV4VCzpAM6AN9zYLLBXcdTYXjoA_Adqkcg4mmrTU5ErURz8D-aisw/exec';



      if (gsUrl) {

        const payload = {

          name,

          email,

          phone,

          address,

          license,

          insurance,

          notes,

          source_env: siteUrl,

          stripe_session_id: session.id,

        };



        await fetch(gsUrl, {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify(payload),

        });

      } else {

        console.error('GS_WEBAPP_URL is missing');

      }

    } catch (sheetErr) {

      // ما نخلي الخطأ يوقف Stripe

      console.error('Sheet error:', sheetErr);

    }

    // ========= نهاية إضافة حفظ Google Sheet =========



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
