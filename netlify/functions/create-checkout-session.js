const Stripe = require('stripe');

const { google } = require('googleapis'); // نحتاجها للـSheets



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



    if (!secret || !priceId || !siteUrl) {

      return {

        statusCode: 500,

        body: 'Missing env vars (STRIPE_SECRET_KEY / STRIPE_PRICE_* / SITE_URL)',

      };

    }



    // 👇 Stripe نفس ما هو

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

    // ☝️ ما لمسناه



    // ============ Google Sheets ============



    try {

      // 1) نقرأ الـJSON من المتغير

      const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT;

      if (!serviceAccountJson) {

        console.error('GOOGLE_SERVICE_ACCOUNT env var missing');

      } else {

        const creds = JSON.parse(serviceAccountJson);



        // 2) نكوّن auth

        const auth = new google.auth.JWT(

          creds.client_email,

          null,

          creds.private_key,

          ['https://www.googleapis.com/auth/spreadsheets']

        );



        // 3) نحدد الشيت

        const sheets = google.sheets({ version: 'v4', auth });

        const SHEET_ID = 'https://script.google.com/macros/s/AKfycbwriAYp5Mas7xpuyKvQgkWX8ZR0dzJeWZHblPvKhXDywmsGt7piyji8iNCzU1wjiR0P/exec'; // ← غيّرها

        const SHEET_NAME = 'Pros'; // ← اسم الشيت عندك



        // 4) نجهّز الصف

        const row = [

          new Date().toISOString(),

          name || '',

          email || '',

          phone || '',

          address || '',

          license || '',

          insurance || '',

          notes || '',

          zip || '',

          notify_opt_in || '',

          siteUrl,

          session.id,

        ];



        // 5) نرسل

        await sheets.spreadsheets.values.append({

          spreadsheetId: SHEET_ID,

          range: `${SHEET_NAME}!A:Z`,

          valueInputOption: 'USER_ENTERED',

          requestBody: {

            values: [row],

          },

        });



        console.log('Sheet append success');

      }

    } catch (sheetErr) {

      console.error('Sheet error:', sheetErr);

      // ما نرمي الخطأ عشان ما نخرب الرد على المتصفح

    }



    // ============ نهاية Google Sheets ============



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
