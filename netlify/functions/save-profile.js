// netlify/functions/save-profile.js



const corsHeaders = {

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Headers': 'Content-Type',

  'Access-Control-Allow-Methods': 'POST, OPTIONS',

};



exports.handler = async (event) => {

  // preflight

  if (event.httpMethod === 'OPTIONS') {

    return {

      statusCode: 200,

      headers: corsHeaders,

      body: 'OK',

    };

  }



  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      headers: corsHeaders,

      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),

    };

  }



  const SUPABASE_URL = process.env.SUPABASE_URL;            // مثل: https://xxxx.supabase.co

  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;



  // نخليها ترجع لك الطول عشان تتأكد بنفسك

  if (!SUPABASE_URL || !SUPABASE_KEY) {

    return {

      statusCode: 500,

      headers: corsHeaders,

      body: JSON.stringify({

        ok: false,

        error: 'Missing Supabase env vars',

        url: SUPABASE_URL,

        keyLength: SUPABASE_KEY ? SUPABASE_KEY.length : 0,

      }),

    };

  }



  // نزيل أي / زيادة آخر الرابط

  const baseUrl = SUPABASE_URL.replace(/\/+$/, '');

  const tableUrl = `${baseUrl}/rest/v1/pros_signups`;



  let payload = {};

  try {

    payload = JSON.parse(event.body || '{}');

  } catch (e) {

    return {

      statusCode: 400,

      headers: corsHeaders,

      body: JSON.stringify({ ok: false, error: 'Invalid JSON body' }),

    };

  }



  // لو ما فيه ايميل نوقف

  if (!payload.email) {

    return {

      statusCode: 400,

      headers: corsHeaders,

      body: JSON.stringify({ ok: false, error: 'email is required' }),

    };

  }



  try {

    const resp = await fetch(tableUrl, {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        // هذان المطلوبان مع REST

        apikey: SUPABASE_KEY,

        Authorization: `Bearer ${SUPABASE_KEY}`,

        Prefer: 'return=representation',

      },

      body: JSON.stringify({

        name: payload.name || null,

        email: payload.email || null,

        phone: payload.phone || null,

        address: payload.address || null,

        license: payload.license || null,

        insurance: payload.insurance || null,

        notes: payload.notes || null,

        stripe_customer_id: payload.stripe_customer_id || null,

        stripe_subscription_id: payload.stripe_subscription_id || null,

      }),

    });



    const text = await resp.text();



    // نرجعه كما هو حتى لو كان خطأ من Supabase

    return {

      statusCode: resp.status,

      headers: {

        ...corsHeaders,

        'Content-Type': 'application/json',

      },

      body: text,

    };

  } catch (err) {

    // لو كان فيه خطأ غريب زي اللي عندك

    return {

      statusCode: 500,

      headers: corsHeaders,

      body: JSON.stringify({

        ok: false,

        error: err.message,

        // هذا يساعدنا نعرف طول المفتاح اللي وصل للفنكشن

        keyLength: SUPABASE_KEY.length,

        urlUsed: tableUrl,

      }),

    };

  }

};
