import { createClient } from '@supabase/supabase-js';



export const handler = async (event) => {

  // السماح فقط بـ POST requests

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }),

    };

  }



  // قراءة البيانات المرسلة من النموذج

  const body = JSON.parse(event.body || '{}');



  const supabaseUrl =

    process.env.SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co';

  const supabaseKey =

    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;



  // تأكد من وجود المفاتيح

  if (!supabaseUrl || !supabaseKey) {

    return {

      statusCode: 500,

      body: JSON.stringify({ ok: false, error: 'Missing Supabase credentials' }),

    };

  }



  const supabase = createClient(supabaseUrl, supabaseKey);



  // إدخال البيانات في جدول homeowners

  const { data, error } = await supabase

    .from('homeowners')

    .insert([

      {

        full_name: body.full_name,

        phone: body.phone,

        address: body.address,

        title: body.title,

        description: body.description,

      },

    ]);



  if (error) {

    console.error('Supabase insert error:', error);

    return {

      statusCode: 500,

      body: JSON.stringify({ ok: false, error: error.message }),

    };

  }



  return {

    statusCode: 200,

    body: JSON.stringify({ ok: true, data }),

  };

};
