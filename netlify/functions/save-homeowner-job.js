// netlify/functions/save-homeowner-job.js

import { createClient } from '@supabase/supabase-js';



const supabase = createClient(

  process.env.SUPABASE_URL,

  process.env.SUPABASE_ANON_KEY

);



export const handler = async (event) => {

  // نقبل POST فقط

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      body: JSON.stringify({ ok: false, error: 'Method not allowed' })

    };

  }



  try {

    const body = JSON.parse(event.body || '{}');



    // هنا نحدد الحقول يدويًا عشان ما يروح شي غريب للجدول

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



    // نحذف المفاتيح اللي قيمتها null عشان ما نزعّل بوستجريس

    const cleanRow = {};

    for (const [k, v] of Object.entries(row)) {

      if (v !== null && v !== '') {

        cleanRow[k] = v;

      }

    }



    // لو جدولك اسمه غير هذا غيّر السطر تحت:

    const { data, error } = await supabase

      .from('homeowners_jobs')

      .insert([cleanRow])

      .select();



    if (error) {

      console.error('Supabase error:', error);

      return {

        statusCode: 400,

        body: JSON.stringify({

          ok: false,

          error: error.message,

          hint: 'Check table name/columns in Supabase'

        })

      };

    }



    return {

      statusCode: 200,

      body: JSON.stringify({

        ok: true,

        message: 'Job saved to Supabase',

        job: data?.[0] || null

      })

    };

  } catch (err) {

    console.error('Function parse error:', err);

    return {

      statusCode: 400,

      body: JSON.stringify({ ok: false, error: err.message })

    };

  }

};
