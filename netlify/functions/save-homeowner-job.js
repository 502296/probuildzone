// netlify/functions/save-homeowner-job.js



const { createClient } = require('@supabase/supabase-js');



const SUPABASE_URL = process.env.SUPABASE_URL;

const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY; // أو service role لو تبغى



// helper: نتأكد الـ URL شكله صح

function isValidUrl(str) {

  try {

    new URL(str);

    return true;

  } catch {

    return false;

  }

}



exports.handler = async (event) => {

  // ما نقبل GET

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      body: JSON.stringify({ ok: false, error: 'Method not allowed' })

    };

  }



  // لو واحد من المتغيرات ناقص

  if (!SUPABASE_URL || !SUPABASE_KEY) {

    return {

      statusCode: 500,

      body: JSON.stringify({

        ok: false,

        error: 'Supabase env missing: please set SUPABASE_URL and SUPABASE_ANON_KEY in Netlify'

      })

    };

  }



  // لو الـ URL مو شكل URL

  if (!isValidUrl(SUPABASE_URL)) {

    return {

      statusCode: 500,

      body: JSON.stringify({

        ok: false,

        error: 'SUPABASE_URL is not a valid URL. Go to Supabase → Settings → API → copy Project URL (https://xxxx.supabase.co) and paste it in Netlify.'

      })

    };

  }



  // الآن نقدر ننشئ العميل

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);



  try {

    const body = JSON.parse(event.body || '{}');



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



    // ندخل في الجدول اللي صنعته (غير الاسم لو تبي)

    const { data, error } = await supabase

      .from('homeowner_leads')

      .insert([row])

      .select();



    if (error) {

      return {

        statusCode: 400,

        body: JSON.stringify({ ok: false, error: error.message })

      };

    }



    return {

      statusCode: 200,

      body: JSON.stringify({ ok: true, job: data?.[0] || null })

    };

  } catch (err) {

    return {

      statusCode: 400,

      body: JSON.stringify({ ok: false, error: err.message })

    };

  }

};
