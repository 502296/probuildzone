// netlify/functions/post-offer.js

exports.handler = async (event) => {

  if (event.httpMethod !== 'POST') {

    return { statusCode: 405, body: 'Method Not Allowed' };

  }



  try {

    const SUPABASE_URL = process.env.SUPABASE_URL;

    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE; // مهم: service role

    if (!SUPABASE_URL || !SERVICE_ROLE) {

      return { statusCode: 500, body: JSON.stringify({ ok:false, error:'Missing Supabase env vars' }) };

    }



    const payload = JSON.parse(event.body || '{}');

    const { job_id, pro_name, amount, message } = payload;



    if (!job_id || !pro_name) {

      return { statusCode: 400, body: JSON.stringify({ ok:false, error:'job_id and pro_name are required' }) };

    }



    const res = await fetch(`${SUPABASE_URL}/rest/v1/pro_offers`, {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        apikey: SERVICE_ROLE,

        Authorization: `Bearer ${SERVICE_ROLE}`,

        Prefer: 'return=representation'

      },

      body: JSON.stringify([{ job_id, pro_name, amount, message }])

    });



    const rows = await res.json();

    if (!res.ok) {

      return { statusCode: res.status, body: JSON.stringify({ ok:false, error: rows?.message || 'Insert failed' }) };

    }



    return { statusCode: 200, body: JSON.stringify({ ok:true, offer: rows?.[0] || null }) };

  } catch (e) {

    return { statusCode: 500, body: JSON.stringify({ ok:false, error: e.message }) };

  }

};
