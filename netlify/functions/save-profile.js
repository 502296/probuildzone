// netlify/functions/save-profile.js

import { createClient } from '@supabase/supabase-js';



export const handler = async (event) => {

  // السماح فقط بالـ POST

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      body: JSON.stringify({ error: 'Method Not Allowed' }),

    };

  }



  try {

    // 1) قراءة البيانات القادمة من الفورم كـ JSON

    const data = JSON.parse(event.body || '{}');



    // 2) ربط Supabase من خلال متغيرات البيئة في Netlify

    const supabaseUrl = process.env.SUPABASE_URL;

    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE; // حط السيرفس رول هنا



    if (!supabaseUrl || !supabaseKey) {

      return {

        statusCode: 500,

        body: JSON.stringify({ error: 'Supabase env vars missing' }),

      };

    }



    const supabase = createClient(supabaseUrl, supabaseKey);



    // 3) تجهيز الصف اللي راح ينحفظ

    const payload = {

      name: data.name || null,

      email: data.email || null,

      phone: data.phone || null,

      address: data.address || null,

      license: data.license || null,

      insurance: data.insurance || null,

      notes: data.notes || null,

      stripe_customer_id: data.stripe_customer_id || null,

      stripe_subscription_id: data.stripe_subscription_id || null,

    };



    // 4) الإدخال في الجدول

    const { error } = await supabase

      .from('pros_signups')

      .insert([payload]);



    if (error) {

      console.error('Supabase insert error:', error);

      return {

        statusCode: 500,

        body: JSON.stringify({ ok: false, error: error.message }),

      };

    }



    // 5) رجّع رد ناجح

    return {

      statusCode: 200,

      body: JSON.stringify({ ok: true, message: 'Pro saved' }),

    };

  } catch (err) {

    console.error('General error:', err);

    return {

      statusCode: 500,

      body: JSON.stringify({ ok: false, error: err.message }),

    };

  }

};
