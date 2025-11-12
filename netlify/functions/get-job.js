// netlify/functions/get-job.js

const HEADERS = {

  'Content-Type': 'application/json',

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Methods': 'GET,OPTIONS',

};



exports.handler = async (event) => {

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };



  const SUPABASE_URL = process.env.SUPABASE_URL;

  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

  if (!SUPABASE_URL || !SERVICE_ROLE) {

    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Server not configured' }) };

  }



  // يقبل ?id=UUID أو ?code=PBZ-12345

  const params = new URLSearchParams(event.queryStringParameters || {});

  let uuid = params.get('id');

  const code = params.get('code');



  if (!uuid && code) {

    // استرجاع عبر الكود: نبحث بآخر 5 من الUUID

    const suffix = (code || '').toUpperCase().replace('PBZ-','').trim();

    if (!/^[A-Z0-9]{5}$/.test(suffix)) {

      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Invalid code' }) };

    }

    // فلترة REST: نستخدم ilike على id النصي (بدون شرط دقيق)، أبسط حل:

    const res = await fetch(`${SUPABASE_URL}/rest/v1/homeowner_jobs?id=ilike.*${suffix}`, {

      headers: { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}` }

    });

    const rows = await res.json();

    const row = (rows || []).find(r => r.id && r.id.replace(/-/g,'').toUpperCase().endsWith(suffix));

    if (!row) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Not found' }) };

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok:true, job: row }) };

  }



  if (!uuid) {

    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Missing id or code' }) };

  }



  // استرجاع مباشر عبر uuid

  const res = await fetch(`${SUPABASE_URL}/rest/v1/homeowner_jobs?id=eq.${uuid}`, {

    headers: { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}` }

  });

  const data = await res.json();

  if (!Array.isArray(data) || !data[0]) {

    return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Not found' }) };

  }

  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok:true, job: data[0] }) };

};
