const Stripe = require('stripe');



exports.handler = async (event) => {

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

    const siteUrl = process.env.SITE_URL; // مثال أثناء الاختبار: https://probuildzone.netlify.app



    if (!secret || !priceId || !siteUrl) {

      return { statusCode: 500, body: 'Missing env vars (STRIPE_SECRET_KEY / STRIPE_PRICE_* / SITE_URL)' };

    }



    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' }); // ثابتة وحديثة



    const data = JSON.parse(event.body || '{}');

    const { name, email, phone, address, license, insurance, notes } = data;



    // إنشاء الـ Stripe session (ما غيرناه)

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



    // ------------- send to Google Sheets (new) -------------

    try {

      const gsUrl = process.env.GS_WEBAPP_URL;

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



        // Netlify على Node 18 فيه fetch جاهز

        fetch(gsUrl, {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify(payload),

        }).catch((err) => {

          console.error('Error sending to Google Sheets (fetch catch):', err);

        });

      }

    } catch (err) {

      console.error('GSheets integration failed:', err);

    }

    // -------------------------------------------------------



    return {

      statusCode: 200,

      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },

      body: JSON.stringify({ url: session.url }),

    };

  } catch (err) {

    console.error('Stripe session error:', err);

    return {

      statusCode: 500,

      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },

      body: JSON.stringify({ error: err.message }),

    };

  }

};
