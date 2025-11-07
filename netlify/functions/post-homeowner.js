// netlify/functions/post-homeowner.js



const { createClient } = require('@supabase/supabase-js');



const supabaseUrl = process.env.SUPABASE_URL;

const supabaseKey =

  process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;



exports.handler = async (event) => {

  // نسمح بس بالـ POST

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      body: JSON.stringify({ error: 'Method not allowed' }),

    };

  }



  if (!supabaseUrl || !supabaseKey) {

    return {

      statusCode: 500,

      body: JSON.stringify({

        error: 'Supabase env vars are missing (URL or KEY)',

      }),

    };

  }



  // نقرأ جسم الطلب

  let payload = {};

  try {

    payload = JSON.parse(event.body || '{}');

  } catch (e) {

    return {

      statusCode: 400,

      body: JSON.stringify({ error: 'Invalid JSON body' }),

    };

  }



  const supabase = createClient(supabaseUrl, supabaseKey);



  // 1) نحاول نلقى homeowner بنفس رقم الهاتف

  let homeownerId = null;



  if (payload.phone) {

    const { data: existing, error: findErr } = await supabase

      .from('homeowners')

      .select('id')

      .eq('phone', payload.phone)

      .maybeSingle();



    if (findErr) {

      console.error('Find homeowner error:', findErr);

      return {

        statusCode: 500,

        body: JSON.stringify({ error: findErr.message }),

      };

    }



    if (existing && existing.id) {

      homeownerId = existing.id;

    }

  }



  // 2) لو ما لقيناه ننشئ واحد جديد ونرجع الـ id

  if (!homeownerId) {

    const { data: inserted, error: insertErr } = await supabase

      .from('homeowners')

      .insert([

        {

          full_name: payload.full_name || null,

          phone: payload.phone || null,

          address: payload.address || null,

          email: payload.email || null,

        },

      ])

      .select('id')

      .single();



    if (insertErr) {

      console.error('Insert homeowner error:', insertErr);

      return {

        statusCode: 500,

        body: JSON.stringify({ error: insertErr.message }),

      };

    }



    homeownerId = inserted.id;

  }



  // 3) الحين ندخل الجوب في homeowner_jobs مربوط بنفس الـ UUID

  const { error: jobErr } = await supabase.from('homeowner_jobs').insert([

    {

      homeowner_id: homeownerId,

      category: payload.category || null,

      title: payload.title || payload.job_title || null,

      description: payload.description || null,

      address: payload.address || null,

    },

  ]);



  if (jobErr) {

    console.error('Insert job error:', jobErr);

    return {

      statusCode: 500,

      body: JSON.stringify({ error: jobErr.message }),

    };

  }



  return {

    statusCode: 200,

    body: JSON.stringify({ ok: true }),

  };

};
