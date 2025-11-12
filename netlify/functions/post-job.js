// netlify/functions/post-job.js

const CORS_HEADERS = {

  'Content-Type': 'application/json',

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Methods': 'POST,OPTIONS',

};



exports.handler = async (event) => {

  // CORS preflight

  if (event.httpMethod === 'OPTIONS') {

    return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  }

  if (event.httpMethod !== 'POST') {

    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ ok:false, error:'Method not allowed' }) };

  }



  // اقرأ الـpayload

  let payload = {};

  try { payload = JSON.parse(event.body || '{}'); }

  catch {

    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ ok:false, error:'Invalid JSON body' }) };

  }



  // حقولنا الموحدة

  const {

    category = 'General',

    title = null,

    summary = null,

    city = null,

    state = null,

    name,

    email,

    phone,

    address,

    description,

  } = payload;



  // تحقق من الحقول المطلوبة

  if (!name || !email || !phone || !address || !description || !title) {

    return {

      statusCode: 400,

      headers: CORS_HEADERS,

      body: JSON.stringify({ ok:false, error:'Missing required fields (title, name, email, phone, address, description)' }),

    };

  }



  // متغيرات البيئة (من Netlify)

  const SUPABASE_URL = process.env.SUPABASE_URL;

  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;



  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {

    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ ok:false, error:'Server env is not configured' }) };

  }



  // جهّز السجل للإدخال

  const record = {

    category, title, summary, city, state,

    name, email, phone, address, description,

  };



  try {

    const res = await fetch(`${SUPABASE_URL}/rest/v1/homeowner_jobs`, {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        'apikey': SUPABASE_SERVICE_ROLE,

        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,

        'Prefer': 'return=representation', // يرجّع الصف المُضاف

      },

      body: JSON.stringify([record]),

    });



    const text = await res.text();

    let data;

    try { data = JSON.parse(text); } catch { data = null; }



    if (!res.ok) {

      const msg = (data && data.message) || text || `Supabase insert failed (${res.status})`;

      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ ok:false, error: msg }) };

    }



    const inserted = Array.isArray(data) ? data[0] : data;

    return {

      statusCode: 200,

      headers: CORS_HEADERS,

      body: JSON.stringify({ ok:true, job_id: inserted?.id || null }),

    };

  } catch (err) {

    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ ok:false, error: err.message || 'Unknown error' }) };

  }

};
