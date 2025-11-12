// netlify/functions/save-homeowner-job.js



// رؤوس موحّدة (JSON + CORS) حتى لا يرجع HTML أبداً

const HEADERS = {

  'Content-Type': 'application/json; charset=utf-8',

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Methods': 'POST,OPTIONS',

};



exports.handler = async (event, context) => {

  try {

    // تعامل مع طلبات التمهيد CORS

    if (event.httpMethod === 'OPTIONS') {

      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };

    }



    if (event.httpMethod !== 'POST') {

      return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    }



    // تأكد أن البودي JSON وليس HTML

    let payload = {};

    try {

      payload = JSON.parse(event.body || '{}');

    } catch {

      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Body must be valid JSON' }) };

    }



    // استخرج الحقول (حقول إضافية اختيارية مدعومة)

    const {

      name,

      email,

      phone,

      address,

      description,

      city,

      state,

      title,      // Project title (اختياري)

      summary,    // Short summary (اختياري)

      files       // روابط ملفات/صور إن وُجدت (اختياري)

    } = payload;



    // تحقق الحقول الأساسية (عدّلها إذا أردت جعل phone غير إلزامي)

    if (!name || !email || !address || !description || !phone) {

      return {

        statusCode: 400,

        headers: HEADERS,

        body: JSON.stringify({ error: 'Missing required fields (name, email, phone, address, description)' })

      };

    }



    // معرف طلب بشكله اللطيف PBZ-XXXXX

    const job_id = 'PBZ-' + Math.floor(10000 + Math.random() * 90000);



    // استرجاع متغيرات البيئة

    const SUPABASE_URL = process.env.SUPABASE_URL;

    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;



    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {

      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'Supabase env vars not set' }) };

    }



    // أدخل في جدول homeowner_jobs عبر REST

    const res = await fetch(`${SUPABASE_URL}/rest/v1/homeowner_jobs`, {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        'apikey': SUPABASE_SERVICE_ROLE,

        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,

        'Prefer': 'return=representation'

      },

      body: JSON.stringify([{

        job_id,

        name, email, phone, address, description,

        city: city || null,

        state: state || null,

        title: title || null,

        summary: summary || null,

        files: files || null,

        user_agent: event.headers['user-agent'] || null,

        source_ip: (event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || '').split(',')[0] || null

      }])

    });



    const text = await res.text();

    let data;

    try { data = JSON.parse(text); } catch { data = null; }



    if (!res.ok) {

      // أعد رسالة مفهومة بدل HTML

      const msg = (data && (data.message || data.error)) || text.slice(0, 200);

      return { statusCode: 502, headers: HEADERS, body: JSON.stringify({ error: `Supabase insert failed: ${msg}` }) };

    }



    // نجح الإدخال

    const row = Array.isArray(data) ? data[0] : data;

    return {

      statusCode: 200,

      headers: HEADERS,

      body: JSON.stringify({ ok: true, job_id, row })

    };



  } catch (err) {

    console.error('save-homeowner-job error:', err);

    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'Internal error' }) };

  }

};
