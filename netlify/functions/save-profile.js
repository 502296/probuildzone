// netlify/functions/save-profile.js

import { createClient } from '@supabase/supabase-js';



export const handler = async (event) => {

  try {

    if (event.httpMethod !== 'POST') {

      return { statusCode: 405, body: 'Method Not Allowed' };

    }



    const data = JSON.parse(event.body || '{}');



    // تحقق من الحقول الأساسية

    if (!data.email || !data.name) {

      return { statusCode: 400, body: 'Missing required fields' };

    }



    // إنشاء عميل Supabase

    const supabase = createClient(

      process.env.SUPABASE_URL,

      process.env.SUPABASE_SERVICE_ROLE

    );



    // إدخال البيانات في جدول pros

    const { error } = await supabase.from('pros').insert([

      {

        full_name: data.name,

        email: data.email,

        phone: data.phone,

        company_address: data.address,

        license_no: data.license,

        insurance_no: data.insurance,

        notes: data.notes,

        stripe_status: 'pending',

        created_at: new Date(),

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

      body: JSON.stringify({ ok: true, message: 'Saved to Supabase' }),

    };

  } catch (err) {

    console.error('save-profile failed:', err);

    return {

      statusCode: 500,

      body: JSON.stringify({ ok: false, error: err.message }),

    };

  }

};
