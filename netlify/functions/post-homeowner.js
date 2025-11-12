const { createClient } = require('@supabase/supabase-js');



exports.handler = async (event) => {

  // السماح فقط بـ POST

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ error: 'Method Not Allowed' }),

    };

  }



  // تأكد JSON صحيح

  let input;

  try {

    input = JSON.parse(event.body || '{}');

  } catch {

    return {

      statusCode: 400,

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ error: 'Invalid JSON body' }),

    };

  }



  const { name, email, phone, address, description } = input;



  // عميل Supabase باستخدام SERVICE_ROLE_KEY من متغيرات نتلايف

  const supabase = createClient(

    process.env.SUPABASE_URL,

    process.env.SUPABASE_SERVICE_ROLE_KEY,

    { auth: { persistSession: false } }

  );



  try {

    const { data, error } = await supabase

      .from('homeowner_jobs') // غيّر للاسم الفعلي للجدول عندك

      .insert([{ name, email, phone, address, description }])

      .select()

      .single();



    if (error) throw error;



    return {

      statusCode: 200,

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ ok: true, job: data }),

    };

  } catch (err) {

    console.error('post-job error:', err);

    return {

      statusCode: 500,

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ error: err.message }),

    };

  }

};
