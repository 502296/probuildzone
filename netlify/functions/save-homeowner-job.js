// netlify/functions/save-homeowner-job.js



const { createClient } = require('@supabase/supabase-js');



// نقرأ المتغيرات من بيئة نتلايفي

const supabaseUrl = process.env.SUPABASE_URL;

const supabaseKey = process.env.SUPABASE_ANON_KEY;



// نجهّز العميل (لو مافي مفاتيح بنرجع خطأ واضح)

let supabase = null;

if (supabaseUrl && supabaseKey) {

  supabase = createClient(supabaseUrl, supabaseKey);

}



exports.handler = async (event) => {

  // نقبل POST فقط

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      body: JSON.stringify({ ok: false, error: 'Method not allowed' })

    };

  }



  // لو ما في مفاتيح

  if (!supabase) {

    return {

      statusCode: 500,

      body: JSON.stringify({

        ok: false,

        error: 'Supabase credentials are missing in Netlify environment'

      })

    };

  }



  try {

    const body = JSON.parse(event.body || '{}');



    // نبني السطر اللي بندخله

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



    // ننظف الفارغ

    const cleanRow = {};

    for (const [k, v] of Object.entries(row)) {

      if (v !== null && v !== '') {

        cleanRow[k] = v;

      }

    }



    // ندخل الجدول الجديد اللي سوّيناه

    const { data, error } = await supabase

      .from('homeowner_leads') // ← تأكد اسمه كذا في Supabase

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

        lead: data && data[0] ? data[0] : null

      })

    };

  } catch (err) {

    console.error('Function runtime error:', err);

    return {

      statusCode: 400,

      body: JSON.stringify({

        ok: false,

        error: err.message || 'Invalid request body'

      })

    };

  }

};
