// netlify/functions/save-homeowner.js

const { createClient } = require('@supabase/supabase-js');



exports.handler = async (event) => {

  const headers = {

    'Content-Type': 'application/json',

    'Access-Control-Allow-Origin': '*',

  };



  // نسمح فقط بالـ POST

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      headers,

      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),

    };

  }



  // نقرأ الـ env جوّا

  const supabaseUrl = process.env.SUPABASE_URL;

  const supabaseKey =

    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;



  if (!supabaseUrl || !supabaseKey) {

    console.log('Missing env vars for homeowner');

    return {

      statusCode: 500,

      headers,

      body: JSON.stringify({

        ok: false,

        error: 'Supabase env vars are missing',

      }),

    };

  }



  // نقرأ البيانات من الطلب

  let body;

  try {

    body = JSON.parse(event.body || '{}');

  } catch (err) {

    return {

      statusCode: 400,

      headers,

      body: JSON.stringify({ ok: false, error: 'Invalid JSON body' }),

    };

  }



  const supabase = createClient(supabaseUrl, supabaseKey);



  // عدّل أسماء الحقول حسب جدولك

  const row = {

    full_name: body.full_name || body.name || null,

    phone: body.phone || null,

    address: body.address || body.full_address || null,

    title: body.title || null,

    description: body.description || body.full_description || null,

    created_at: new Date().toISOString(),

  };



  // 👇 غيّر اسم الجدول لو غير هذا

  const { error } = await supabase.from('homeowner_jobs').insert([row]);



  if (error) {

    console.log('Supabase insert error:', error);

    return {

      statusCode: 500,

      headers,

      body: JSON.stringify({ ok: false, error: error.message }),

    };

  }



  return {

    statusCode: 200,

    headers,

    body: JSON.stringify({ ok: true }),

  };

};
