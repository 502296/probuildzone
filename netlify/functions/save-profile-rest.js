// netlify/functions/save-profile-rest.js



export async function handler(event) {

  const headers = {

    'Access-Control-Allow-Origin': '*',

    'Access-Control-Allow-Headers': 'Content-Type',

    'Access-Control-Allow-Methods': 'POST, OPTIONS',

  };



  if (event.httpMethod === 'OPTIONS') {

    return { statusCode: 200, headers, body: 'OK' };

  }



  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      headers,

      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),

    };

  }



  const SUPABASE_URL = process.env.SUPABASE_URL;

  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE;



  if (!SUPABASE_URL || !SUPABASE_KEY) {

    return {

      statusCode: 500,

      headers,

      body: JSON.stringify({

        ok: false,

        error: 'Missing Supabase environment variables',

      }),

    };

  }



  let payload;

  try {

    payload = JSON.parse(event.body);

  } catch (e) {

    return {

      statusCode: 400,

      headers,

      body: JSON.stringify({ ok: false, error: 'Invalid JSON body' }),

    };

  }



  try {

    const response = await fetch(`${SUPABASE_URL}/rest/v1/pros_signups`, {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        apikey: SUPABASE_KEY,

        Authorization: `Bearer ${SUPABASE_KEY}`,

        Prefer: 'return=representation',

      },

      body: JSON.stringify(payload),

    });



    const data = await response.text();



    return {

      statusCode: response.status,

      headers,

      body: data,

    };

  } catch (err) {

    return {

      statusCode: 500,

      headers,

      body: JSON.stringify({ ok: false, error: err.message }),

    };

  }

}
