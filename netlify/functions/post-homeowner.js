// netlify/functions/post-homeowner.js

import { createClient } from '@supabase/supabase-js';



const supabaseUrl = process.env.SUPABASE_URL;

const supabaseKey =

  process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;



export async function handler(event) {

  // بس POST

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



  // البيانات جاية من الفورم

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



  // عدل اسم الجدول حسب اللي عملته في Supabase

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

    // هذا اللي كان يطلعلك “Invalid API key”

    return {

      statusCode: 400,

      body: JSON.stringify({ error: error.message }),

    };

  }



  return {

    statusCode: 200,

    body: JSON.stringify({ ok: true }),

  };

}
