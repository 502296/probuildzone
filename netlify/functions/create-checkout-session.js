// netlify/functions/create-checkout-session.js

const Stripe = require('stripe');



exports.handler = async (event) => {

  if (event.httpMethod !== 'POST') {

    return { statusCode: 405, body: 'Method Not Allowed' };

  }



  try {

    // ------------ env vars (تأكد إنها موجودة في Netlify) ------------

    const secret = process.env.STRIPE_SECRET_KEY;

    const priceId = process.env.STRIPE_PRICE_YEARLY || process.env.STRIPE_PRICE_MONTHLY;

    const siteUrl = process.env.SITE_URL;

    const gsUrl = process.env.GS_WEBAPP_URL || "https://script.google.com/macros/s/AKfycbwlS71A1Dlaf9Y4PSgSgH1DJV1MGjV2SrDRp3oXxMXHqE_J0Id-mS8ln_fNNgEjNiOq/exec";

    // -----------------------------------------------------------------



    if (!secret || !priceId || !siteUrl) {

      return {

        statusCode: 500,

        body: 'Missing env vars (STRIPE_SECRET_KEY / STRIPE_PRICE_* / SITE_URL)',

      };

    }



    // -------------------- Stripe logic (لم يتغير) --------------------

    // هذا هو الجزء الذي ينشئ الـCheckout Session في Stripe — لم نلمس هذا المنطق.

    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });

    const body = JSON.parse(event.body || '{}');



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      payment_method_types: ['card'],

      line_items: [{ price: priceId, quantity: 1 }],

      allow_promotion_codes: true,

      subscription_data: { trial_period_days: 30 }, // <-- كما هو

      success_url: `${siteUrl}/success.html`,

      cancel_url: `${siteUrl}/cancel.html`,

      customer_email: body.email,

      metadata: {

        name: body.name || '',

        phone: body.phone || '',

        address: body.address || '',

        license: body.license || '',

        insurance: body.insurance || '',

        notes: body.notes || '',

      },

    });

    // ------------------ نهاية Stripe logic (آمن تمامًا) ------------------



    // ---------- بعد الانتهاء من إنشاء الـsession نرسل نسخة للـGoogle Script ----------

    // هذا الجزء إضافي ولا يغيّر أي شيء في Stripe، فقط يخزن البيانات في الـSheet.

    let savedToSheet = true;



    if (gsUrl) {

      try {

        const payload = {

          name: body.name || '',

          email: body.email || '',

          phone: body.phone || '',

          address: body.address || '',

          license: body.license || '',

          insurance: body.insurance || '',

          notes: body.notes || '',

          source_env: 'staging',

          stripe_session_id: session.id,

        };



        const res = await fetch(gsUrl, {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify(payload),

        });



        const text = await res.text();

        console.log('Google Script response =>', text);



        let json = {};

        try {

          json = JSON.parse(text);

        } catch {

          savedToSheet = false;

        }



        if (!res.ok || json.ok === false) {

          savedToSheet = false;

        }



      } catch (err) {

        console.error('Error sending to Google Script:', err);

        savedToSheet = false;

      }

    } else {

      savedToSheet = false;

    }

    // -------------------------------------------------------------------------------



    // الرد النهائي للفرونت (الصفحة) — Stripe كما كان، وإضافة علامة savedToSheet للاطلاع.

    return {

      statusCode: 200,

      body: JSON.stringify({

        ok: true,

        url: session.url,

        savedToSheet,

      }),

    };



  } catch (err) {

    console.error('Checkout session error:', err);

    return {

      statusCode: 500,

      body: JSON.stringify({ ok: false, error: err.message }),

    };

  }

};
