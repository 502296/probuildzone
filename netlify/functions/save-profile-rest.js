// netlify/functions/save-profile-rest.js



import { createClient } from '@supabase/supabase-js';



export async function handler(event) {

  const headers = {

    'Access-Control-Allow-Origin': '*',

    'Access-Control-Allow-Headers': 'Content-Type',

    'Access-Control-Allow-Methods': 'POST, OPTIONS',

  };



  // السماح بطلبات OPTIONS (CORS preflight)

  if (event.httpMethod === 'OPTIONS') {

    return { statusCode: 200, headers, body: 'OK' };

  }



  // السماح فقط بطريقة POST

  if (event.httpMethod !== 'POST') {

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  }



  try {

    const data = JSON.parse(event.body || '{}');



    // إنشاء عميل Supabase

    const supabase = createClient(

      process.env.SUPABASE_URL,

      process.env.SUPABASE_SERVICE_ROLE

    );



    // إدخال البيانات في جدول pros_signups

    const { error } = await supabase.from('pros_signups').insert([

      {

        name: data.name,

        email: data.email,

        phone: data.phone,

        address: data.address,

        license: data.license,

        insurance: data.insurance,

        notes: data.notes,

      },

    ]);



    if (error) {

      console.error('Supabase insert error:', error);

      return {

        statusCode: 500,

        headers,

        body: JSON.stringify({ ok: false, error: error.message }),

      };

    }



    return {

      statusCode: 200,

      headers,

      body: JSON.stringify({ ok: true, message: 'Data saved successfully' }),

    };

  } catch (err) {

    console.error('Handler error:', err);

    return {

      statusCode: 500,

      headers,

      body: JSON.stringify({ ok: false, error: err.message }),

    };

  }

}
