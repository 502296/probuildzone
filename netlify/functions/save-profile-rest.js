// netlify/functions/save-profile-rest.js



const corsHeaders = {

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Headers': 'Content-Type',

  'Access-Control-Allow-Methods': 'POST, OPTIONS',

};



exports.handler = async (event) => {

  if (event.httpMethod === 'OPTIONS') {

    return { statusCode: 200, headers: corsHeaders, body: 'OK' };

  }



  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      headers: corsHeaders,

      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),

    };

  }



  const SUPABASE_URL = process.env.SUPABASE_URL;

  const SUPABASE_KEY =

    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;



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

      }),

    });



    const text = await resp.text();



    return {

      statusCode: resp.status,

      headers: {

        ...corsHeaders,

        'Content-Type': 'application/json',

      },

      body: text,

    };

  } catch (err) {

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
