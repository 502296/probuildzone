// netlify/functions/post-job.js

const HEADERS = {

  'Content-Type': 'application/json',

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Methods': 'POST,OPTIONS',

};



exports.handler = async (event) => {

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };

  if (event.httpMethod !== 'POST')   return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Method Not Allowed' }) };



  let payload = {};

  try { payload = JSON.parse(event.body || '{}'); }

  catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Invalid JSON body' }) }; }



  const {

    category = 'General',

    project_title,

    short_summary = null,

    city = null,

    state = null,

    contact_name,

    phone,

    email,

    full_address,

    full_description,

    files = null           // احتفظنا بها اختيارياً (json/array أو null)

  } = payload;



  // تحقق الحقول المطلوبة

  if (!project_title || !contact_name || !phone || !email || !full_address || !full_description) {

    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Missing required fields (project_title, contact_name, phone, email, full_address, full_description)' }) };

  }



  const SUPABASE_URL   = process.env.SUPABASE_URL;

  const SERVICE_ROLE   = process.env.SUPABASE_SERVICE_ROLE; // من Netlify env

  if (!SUPABASE_URL || !SERVICE_ROLE) {

    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Server not configured (Supabase env missing)' }) };

  }



  try {

    // REST insert

    const res = await fetch(`${SUPABASE_URL}/rest/v1/homeowner_jobs`, {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        'apikey': SERVICE_ROLE,

        'Authorization': `Bearer ${SERVICE_ROLE}`,

        'Prefer': 'return=representation'

      },

      body: JSON.stringify([{

        category,

        project_title,

        short_summary,

        city,

        state,

        contact_name,

        phone,

        email,

        full_address,

        full_description,

        files

      }])

    });



    const text = await res.text();

    let data;

    try { data = JSON.parse(text); } catch { data = null; }



    if (!res.ok || !data || !Array.isArray(data) || !data[0]?.id) {

      const errMsg = data?.message || text || `Insert failed (${res.status})`;

      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok:false, error: errMsg }) };

    }



    // بناء كود إنساني قصير (آخر 5 من الUUID بدون الشرطة) لسهولة المشاركة

    const id = data[0].id; // uuid

    const short = id.replace(/-/g,'').slice(-5).toUpperCase();

    const human_id = `PBZ-${short}`;



    return {

      statusCode: 200,

      headers: HEADERS,

      body: JSON.stringify({ ok:true, id, human_id })

    };

  } catch (e) {

    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok:false, error: e.message || 'Unknown error' }) };

  }

};
