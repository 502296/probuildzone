// netlify/functions/save-profile.js



const corsHeaders = {

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Headers': 'Content-Type',

  'Access-Control-Allow-Methods': 'POST, OPTIONS',

};



exports.handler = async (event) => {

  // للـ CORS

  if (event.httpMethod === 'OPTIONS') {

    return {

      statusCode: 200,

      headers: corsHeaders,

      body: 'OK',

    };

  }



  // ما نقبل غير POST

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      headers: corsHeaders,

      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),

    };

  }



  const SUPABASE_URL = process.env.SUPABASE_URL; // مثال: https://xxxx.supabase.co

  const SUPABASE_KEY =

    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;



  // لو مافي مفاتيح

  if (!SUPABASE_URL || !SUPABASE_KEY) {

    return {

      statusCode: 500,

      headers: corsHeaders,

      body: JSON.stringify({

        ok: false,

        error: 'Supabase env vars missing',

      }),

    };

  }



  // نتأكد ماكو سلاش زايد

  const baseUrl = SUPABASE_URL.replace(/\/+$/, '');

  // اسم الجدول لازم يكون موجود في Supabase

  const tableUrl = `${baseUrl}/rest/v1/pros_signups`;



  // نقرأ البودي

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



  if (!payload.email) {

    return {

      statusCode: 400,

      headers: corsHeaders,

      body: JSON.stringify({ ok: false, error: 'email is required' }),

    };

  }



  try {

    // هنا الاتصال المباشر مع REST

    const resp = await fetch(tableUrl, {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

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



    // نرجّع نفس اللي رجعه Supabase (عشان تشوف الخطأ لو فيه)

    return {

      statusCode: resp.status,

      headers: {

        ...corsHeaders,

        'Content-Type': 'application/json',

      },

      body: text,

    };

  } catch (err) {

    // لو صار خطأ جوّا الفنكشن نفسها

    return {

      statusCode: 500,

      headers: corsHeaders,

      body: JSON.stringify({

        ok: false,

        error: err.message,

      }),

    };

  }

};
