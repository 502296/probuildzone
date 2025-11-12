// netlify/functions/post-job.js

const HEADERS = {

  'Content-Type': 'application/json',

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Methods': 'POST,OPTIONS'

};



exports.handler = async (event) => {

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };

  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Method not allowed' }) };



  let payload = {};

  try { payload = JSON.parse(event.body || '{}'); }

  catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Invalid JSON' }) }; }



  const { category, title, summary, city, state, name, email, phone, address, description } = payload;

  if (!title || !name || !email || !phone || !address || !description) {

    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Missing required fields (title, name, email, phone, address, description)' }) };

  }



  const SUPABASE_URL = process.env.SUPABASE_URL;

  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE; // Service role

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {

    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Server missing Supabase env vars' }) };

  }



  // توليد public_id مثل PBZ-12345

  const digits = Math.floor(10000 + Math.random()*90000);

  const public_id = `PBZ-${digits}`;



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

        public_id,

        category: category || 'General',

        title, summary, city, state, name, email, phone, address, description

        // ملاحظة: لا نرسل files هنا

      }])

    });



    const body = await res.json();

    if (!res.ok) {

      return { statusCode: res.status, headers: HEADERS, body: JSON.stringify({ ok:false, error: (body && body.message) || 'Insert failed' }) };

    }



    const row = Array.isArray(body) ? body[0] : body;

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok:true, job_id: row.id, public_id: row.public_id }) };

  } catch (e) {

    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok:false, error: e.message || 'Server error' }) };

  }

};
