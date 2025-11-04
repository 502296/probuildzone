// netlify/functions/create-checkout-session.js



const Stripe = require("stripe");



exports.handler = async (event) => {

  // CORS + السماح لـ POST فقط

  if (event.httpMethod === "OPTIONS") {

    return {

      statusCode: 200,

      headers: {

        "Access-Control-Allow-Origin": "*",

        "Access-Control-Allow-Methods": "POST, OPTIONS",

        "Access-Control-Allow-Headers": "Content-Type",

      },

      body: "ok",

    };

  }



  if (event.httpMethod !== "POST") {

    return { statusCode: 405, body: "Method Not Allowed" };

  }



  try {

    // متغيرات البيئة

    const secret = process.env.STRIPE_SECRET_KEY;

    const priceId =

      process.env.STRIPE_PRICE_YEARLY || process.env.STRIPE_PRICE_MONTHLY;

    const siteUrl = process.env.SITE_URL;

    const gsUrl = process.env.GS_WEBAPP_URL; // ← هنا نحط رابط الويب آب لو موجود



    if (!secret || !priceId || !siteUrl) {

      return {

        statusCode: 500,

        body:

          "Missing env vars (STRIPE_SECRET_KEY / STRIPE_PRICE_* / SITE_URL)",

      };

    }



    // نقرأ بيانات الفورم اللي جت من الصفحة

    const data = JSON.parse(event.body || "{}");

    const {

      name = "",

      email = "",

      phone = "",

      address = "",

      license = "",

      insurance = "",

      notes = "",

    } = data;



    // Stripe

    const stripe = new Stripe(secret, { apiVersion: "2024-06-20" });



    const session = await stripe.checkout.sessions.create({

      mode: "subscription",

      payment_method_types: ["card"],

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

        },

      },

      customer_email: email || undefined,

      success_url: `${siteUrl}/success.html`,

      cancel_url: `${siteUrl}/cancel.html`,

    });



    // بعد ما نجح Stripe نحاول نرسل للـGoogle Apps Script

    let sheetStatus = "skipped";

    if (gsUrl) {

      try {

        // Netlify على Node 18 فيه fetch، فما نحتاج require('node-fetch')

        const res = await fetch(gsUrl, {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({

            timestamp: new Date().toISOString(),

            name,

            email,

            phone,

            address,

            license,

            insurance,

            notes,

            stripe_session_id: session.id,

          }),

        });



        if (res.ok) {

          sheetStatus = "ok";

        } else {

          sheetStatus = "failed:" + (await res.text());

          console.error("GS script error:", sheetStatus);

        }

      } catch (gsErr) {

        sheetStatus = "failed:" + gsErr.message;

        console.error("GS fetch failed:", gsErr);

      }

    }



    return {

      statusCode: 200,

      headers: {

        "Access-Control-Allow-Origin": "*",

        "Content-Type": "application/json",

      },

      body: JSON.stringify({

        url: session.url,

        sheet: sheetStatus,

      }),

    };

  } catch (err) {

    console.error("create-checkout-session error:", err);

    return {

      statusCode: 500,

      headers: {

        "Access-Control-Allow-Origin": "*",

        "Content-Type": "application/json",

      },

      body: JSON.stringify({ error: err.message }),

    };

  }

};
