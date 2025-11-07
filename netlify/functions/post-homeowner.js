// netlify/functions/post-homeowner.js

const { createClient } = require('@supabase/supabase-js');



exports.handler = async (event) => {

  // نسمح فقط بالـ POST

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      body: JSON.stringify({ error: 'Method not allowed' }),

    };

  }



  // نقرأ المتغيرات من البيئة

  const supabaseUrl = process.env.SUPABASE_URL;

  const supabaseKey =

    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;



  if (!supabaseUrl || !supabaseKey) {

    console.log('Missing env vars', { supabaseUrl, hasKey: !!supabaseKey });

    return {

      statusCode: 500,

      body: JSON.stringify({

        error: 'Supabase env vars are missing (URL or KEY)',

      }),

    };

  }



  // نقرأ جسم الطلب

  let payload;

  try {

    payload = JSON.parse(event.body);

  } catch (err) {

    return {

      statusCode: 400,

      body: JSON.stringify({ error: 'Invalid JSON body' }),

    };

  }



  const supabase = createClient(supabaseUrl, supabaseKey);



  // ✅ غيّر اسم الجدول لو غير هذا

  const { error } = await supabase.from('homeowner_jobs').insert([

    {

      full_name: payload.full_name,

      phone: payload.phone,

      address: payload.address,

      title: payload.title,

      description: payload.description,

      created_at: new Date().toISOString(),

    },

  ]);



  if (error) {

    console.log('Supabase insert error:', error);

    return {

      statusCode: 400,

      body: JSON.stringify({ error: error.message }),

    };

  }



  return {

    statusCode: 200,

    body: JSON.stringify({ ok: true }),

  };

};
