// netlify/functions/save-homeowner-job.js

import { createClient } from '@supabase/supabase-js';



// تأكد إن هذول موجودين في Netlify env

const supabase = createClient(

  process.env.SUPABASE_URL,

  process.env.SUPABASE_ANON_KEY

);



export const handler = async (event) => {

  // نسمح فقط بـ POST

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      body: JSON.stringify({ ok: false, error: 'Method not allowed' })

    };

  }



  try {

    const body = JSON.parse(event.body || '{}');



    // نجمع الحقول اللي تجي من الفورم

    const row = {

      project_title: body.project_title || body.title || null,

      short_summary: body.short_summary || body.summary || null,

      city: body.city || null,

      state: body.state || null,

      contact_name: body.contact_name || null,

      phone: body.phone || null,

      email: body.email || null,

      full_address: body.full_address || body.address || null,

      full_description: body.full_description || body.description_long || null,

      category: body.category || 'General'

    };



    // نرمي الحقول الفارغة

    const cleanRow = {};

    for (const [key, value] of Object.entries(row)) {

      if (value !== null && value !== '') {

        cleanRow[key] = value;

      }

    }



    // 👇 هنا التعديل المهم: نكتب في homeowners_jobs (بالـ s)

    const { data, error } = await supabase

      .from('homeowners_jobs')

      .insert([cleanRow])

      .select();



    if (error) {

      console.error('Supabase insert error:', error);

      return {

        statusCode: 400,

        body: JSON.stringify({

          ok: false,

          error: error.message,

          details: error

        })

      };

    }



    return {

      statusCode: 200,

      body: JSON.stringify({

        ok: true,

        message: 'Job saved to homeowners_jobs ✅',

        job: data?.[0] || null

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
