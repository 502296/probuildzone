// netlify/functions/get-job.js

const HEADERS = {

  'Content-Type': 'application/json',

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Methods': 'GET,OPTIONS',

};



exports.handler = async (event) => {

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };

  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ ok:false, error: 'Method not allowed' }) };



  const id = (event.queryStringParameters?.id || '').trim();

  if (!id) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Missing id' }) };



  const SUPABASE_URL = process.env.SUPABASE_URL;

  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE)

    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Server not configured' }) };



  try {

    const res = await fetch(`${SUPABASE_URL}/rest/v1/homeowner_jobs?job_id=eq.${encodeURIComponent(id)}&select=*`, {

      headers: {

        apikey: SUPABASE_SERVICE_ROLE,

        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,

        'Accept-Profile': 'public',

      }

    });

    const rows = await res.json();

    if (!Array.isArray(rows) || !rows.length) {

      return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ ok:false, error:'Job not found' }) };

    }

    const job = rows[0];



    // لاحقاً: اجلب العروض من جدول offers (اختياري اليوم)

    const offers = [];



    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok:true, job, offers }) };

  } catch (e) {

    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok:false, error: e.message }) };

  }

};
