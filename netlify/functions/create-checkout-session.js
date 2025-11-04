const Stripe = require('stripe');

const fetch = require('node-fetch'); // <<< الأهم هنا



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

    const { name, email, phone, address, license, insurance, notes, zip, notify_opt_in } = data;



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      payment_method_types: ['card'],

      line_items: [{ price: priceId, quantity: 1 }],

      subscription_data: {

        trial_period_days: 30,

        metadata: { name, email, phone, address, license, insurance, notes, zip, notify_opt_in },

      },

      customer_email: email,

      success_url: `${siteUrl}/success.html`,

      cancel_url: `${siteUrl}/cancel.html`,

    });

    // ☝️ هذا الجزء ما لمسناه



    // ========= إرسال للـGoogle Sheet =========

    try {

      // رابط الويب آب الجديد اللي نسخته اليوم من سكربت جوجل

      const gsUrl =

        process.env.GS_WEBAPP_URL ||

        'https://script.google.com/macros/s/AKfycbxC8UJ2fxN9sQ11Xn0UrNeY7pNn6sSGU0e8e0n7kXAhsrdC2eCsUUwhNkX2x2jAHuYqs/exec';



      if (gsUrl) {

        const payload = {

          name: name || '',

          email: email || '',

          phone: phone || '',

          address: address || '',

          license: license || '',

          insurance: insurance || '',

          notes: notes || '',

          zip: zip || '',

          notify_opt_in: notify_opt_in || '',

          source_env: siteUrl,

          stripe_session_id: session.id,

        };



        const res = await fetch(gsUrl, {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify(payload),

        });



        const text = await res.text();

        console.log('GSHEET RESPONSE STATUS:', res.status);

        console.log('GSHEET RESPONSE BODY:', text);

      } else {

        console.error('GS_WEBAPP_URL is missing');

      }

    } catch (sheetErr) {

      console.error('Sheet error:', sheetErr);

    }

    // ========= نهاية الإرسال =========



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
