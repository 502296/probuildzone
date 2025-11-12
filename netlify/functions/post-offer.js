// netlify/functions/post-offer.js

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



  // payload نتوقع:

  // { job_identifier: 'PBZ-99870' أو UUID,

  //   pro_name, company, phone, email, amount, message }

  const {

    job_identifier,

    pro_name,

    company = null,

    phone = null,

    email = null,

    amount = null,

    message = null

  } = payload;



  if (!job_identifier || !pro_name) {

    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Missing required fields (job_identifier, pro_name)' }) };

  }



  const SUPABASE_URL = process.env.SUPABASE_URL;

  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;



  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {

    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Server missing Supabase env vars' }) };

  }



  // دالة بسيطة لفحص UUID

  const isUUID = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

  const toPublicId = (s) => {

    const u = (s || '').toUpperCase();

    if (isUUID(u)) return null;

    const digits = u.replace(/^PBZ-/, '');

    if (/^\d{5}$/.test(digits)) return `PBZ-${digits}`;

    if (/^PBZ-\d{5}$/.test(u)) return u;

    return null;

  };



  try {

    // 1) نأتي بالـ job.id الحقيقي من homeowner_jobs

    let queryUrl;

    if (isUUID(job_identifier)) {

      queryUrl = `${SUPABASE_URL}/rest/v1/homeowner_jobs?select=id,public_id&limit=1&id=eq.${encodeURIComponent(job_identifier)}`;

    } else {

      const pid = toPublicId(job_identifier);

      if (!pid) {

        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Invalid job_identifier format' }) };

      }

      queryUrl = `${SUPABASE_URL}/rest/v1/homeowner_jobs?select=id,public_id&limit=1&public_id=eq.${encodeURIComponent(pid)}`;

    }



    const jres = await fetch(queryUrl, {

      headers: {

        'apikey': SUPABASE_SERVICE_ROLE,

        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`

      }

    });

    const jrows = await jres.json();

    if (!Array.isArray(jrows) || !jrows.length) {

      return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Job not found' }) };

    }

    const job_id = jrows[0].id;



    // 2) إدراج العرض في pro_offers

    const ires = await fetch(`${SUPABASE_URL}/rest/v1/pro_offers`, {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        'apikey': SUPABASE_SERVICE_ROLE,

        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,

        'Prefer': 'return=representation'

      },

      body: JSON.stringify([{

        job_id,

        pro_name,

        company,

        phone,

        email,

        amount,

        message

      }])

    });



    const out = await ires.json();

    if (!ires.ok) {

      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok:false, error: out?.message || 'Insert failed' }) };

    }



    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok:true, offer: out?.[0] || null }) };

  } catch (err) {

    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok:false, error: err.message }) };

  }

};
