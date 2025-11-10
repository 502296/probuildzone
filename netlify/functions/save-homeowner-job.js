// netlify/functions/save-homeowner-job.js

import { createClient } from '@supabase/supabase-js';



// لازم تكون موجودة في Netlify env

const supabase = createClient(

  process.env.SUPABASE_URL,

  process.env.SUPABASE_ANON_KEY

);



export const handler = async (event) => {

  // نسمح بـ POST فقط

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      body: JSON.stringify({ ok: false, error: 'Method not allowed' })

    };

  }



  try {

    const body = JSON.parse(event.body || '{}');



    // نجمع الحقول اللي تيجي من الفورم

    const row = {

      category: body.category || 'General',

      project_title: body.project_title || body.title || null,

      short_summary: body.short_summary || body.summary || null,

      city: body.city || null,

      state: body.state || null,

      contact_name: body.contact_name || null,

      phone: body.phone || null,

      email: body.email || null,

      full_address: body.full_address || body.address || null,

      full_description: body.full_description || body.description_long || null

    };



    // نشيل الفارغ منها

    const cleanRow = {};

    for (const [key, value] of Object.entries(row)) {

      if (value !== null && value !== '') {

        cleanRow[key] = value;

      }

    }



    // 👇 نكتب في الجدول النظيف الجديد

    const { data, error } = await supabase

      .from('homeowner_leads')

      .insert([cleanRow])

      .select();



    if (error) {

      console.error('Supabase insert error:', error);

      return {

        statusCode: 400,

        body: JSON.stringify({

          ok: false,

          error: error.message

        })

      };

    }



    return {

      statusCode: 200,

      body: JSON.stringify({

        ok: true,

        message: 'Job saved to homeowner_leads ✅',

        lead: data?.[0] || null

      })

    };

  } catch (err) {

    console.error('Function error:', err);

    return {

      statusCode: 400,

      body: JSON.stringify({ ok: false, error: err.message })

    };

  }

};
