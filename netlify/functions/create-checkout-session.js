// netlify/functions/create-checkout-session.js



const Stripe = require('stripe');



exports.handler = async (event) => {

  // نسمح فقط بالـ POST

  if (event.httpMethod !== 'POST') {

    return { statusCode: 405, body: 'Method Not Allowed' };

  }



  try {

    // ناخذ المتغيرات من Netlify

    const secret   = process.env.STRIPE_SECRET_KEY;

    const priceId  = process.env.STRIPE_PRICE_YEARLY || process.env.STRIPE_PRICE_MONTHLY;

    const siteUrl  = process.env.SITE_URL;

    const gsUrl    = process.env.GS_WEBAPP_URL; // 👈 رابط الويب آب تبع جوجل



    if (!secret || !priceId || !siteUrl) {

      return {

        statusCode: 500,

        body: 'Missing env vars (STRIPE_SECRET_KEY / STRIPE_PRICE_* / SITE_URL)',

      };

    }



    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });



    // الداتا القادمة من الفورم

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



    // نعمل جلسة سترايب

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



    // 👇 هنا نحاول نرسل نسخة من الداتا للـ Google Apps Script

    if (gsUrl) {

      // ما نخليه يفشل الطلب الرئيسي لو صار خطأ هنا

      try {

        await fetch(gsUrl, {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({

            ts: new Date().toISOString(),

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

            source: 'netlify-fn',

          }),

        });

      } catch (err) {

        console.error('GS_WEBAPP_URL fetch failed:', err.message);

        // ما نرمي error علشان المستخدم يكمل

      }

    }



    // نرجع رابط سترايب للفرونت

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
