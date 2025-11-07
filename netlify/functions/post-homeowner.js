// netlify/functions/post-homeowner.js

import { createClient } from '@supabase/supabase-js';



const supabaseUrl = process.env.SUPABASE_URL;

const supabaseKey =

  process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;



export async function handler(event) {

  // نسمح بس بالـ POST

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      body: JSON.stringify({ error: 'Method not allowed' }),

    };

  }



  // تأكدنا من المتغيرات

  if (!supabaseUrl || !supabaseKey) {

    return {

      statusCode: 500,

      body: JSON.stringify({

        error: 'Supabase env vars are missing (URL or KEY)',

      }),

    };

  }



  // نقرأ البيانات من الفورم

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



  // 1) نحاول نلاقي الـ homeowner حسب الهاتف (تقدر تغيّرها للإيميل لو حاب)

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

      // لقيناه ✅

      homeownerId = existing.id;

    }

  }



  // 2) لو ما لقيناه، نسويه الآن ونجيب الـ UUID

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



  // 3) الآن نسجل الجوب في جدول homeowner_jobs ونربطه بـ homeowner_id

  const { error: jobErr } = await supabase.from('homeowner_jobs').insert([

    {

      homeowner_id: homeownerId, // 👈 هنا صار UUID حقيقي، مو null

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

}
