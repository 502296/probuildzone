// netlify/functions/post-job.js



const HEADERS = {

  'Content-Type': 'application/json',

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Methods': 'POST,OPTIONS'

};



exports.handler = async (event) => {

  // CORS preflight

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };



  // Allow POST only

  if (event.httpMethod !== 'POST') {

    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Method not allowed' }) };

  }



  // Parse JSON body

  let payload = {};

  try { payload = JSON.parse(event.body || '{}'); }

  catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Invalid JSON' }) }; }



  // Pick fields (all strings)

  const {

    title = null, summary = null, city = null, state = null,

    name, email, phone, address, description

  } = payload;



  // Required

  if (!name || !email || !phone || !address || !description) {

    return { statusCode: 400, headers: HEADERS,

      body: JSON.stringify({ ok:false, error:'Missing required fields (name, email, phone, address, description)' }) };

  }



  // Env

  const SUPABASE_URL = process.env.SUPABASE_URL;

  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {

    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Missing server env vars' }) };

  }



  // Insert via REST

  try {

    const res = await fetch(`${SUPABASE_URL}/rest/v1/homeowner_jobs`, {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        'apikey': SUPABASE_SERVICE_ROLE,

        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,

        'Prefer': 'return=representation'

      },

      body: JSON.stringify([{

        title, summary, city, state,

        name, email, phone, address, description

      }])

    });



    const data = await res.json().catch(() => ({}));

    if (!res.ok) {

      return { statusCode: res.status, headers: HEADERS,

        body: JSON.stringify({ ok:false, error: data?.message || 'Supabase insert failed' }) };

    }



    const row = Array.isArray(data) ? data[0] : data;

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok:true, job_id: row?.id || null }) };

  } catch (err) {

    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok:false, error: err.message || 'Server error' }) };

  }

};
