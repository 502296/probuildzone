// netlify/functions/save-homeowner-job.js



const { createClient } = require('@supabase/supabase-js');



const SUPABASE_URL = process.env.SUPABASE_URL;

const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;



// helper: نتأكد أن الـ URL على شكل https://xxxxx.supabase.co

function looksLikeSupabaseUrl(url) {

  if (!url) return false;

  // لازم يبدأ بـ https:// و ينتهي بـ .supabase.co

  return url.startsWith('https://') && url.includes('.supabase.co');

}



exports.handler = async (event) => {

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      body: JSON.stringify({ ok: false, error: 'Method not allowed' })

    };

  }



  // لو واحد منهم ناقص

  if (!SUPABASE_URL || !SUPABASE_KEY) {

    return {

      statusCode: 500,

      body: JSON.stringify({

        ok: false,

        error: 'SUPABASE_URL or SUPABASE_ANON_KEY is missing from Netlify env.'

      })

    };

  }



  // لو الـ URL مو على شكل supabase.co

  if (!looksLikeSupabaseUrl(SUPABASE_URL)) {

    return {

      statusCode: 500,

      body: JSON.stringify({

        ok: false,

        error: `SUPABASE_URL doesn't look right. Current value = "${SUPABASE_URL}". Go to Supabase → Settings → API → copy "Project URL" (it looks like https://xxxx.supabase.co) and paste it into Netlify as SUPABASE_URL.`

      })

    };

  }



  // الآن نقدر ننشئ العميل

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);



  try {

    const payload = JSON.parse(event.body || '{}');



    const row = {

      category: payload.category || 'General',

      project_title: payload.project_title || payload.title || null,

      short_summary: payload.short_summary || payload.summary || null,

      city: payload.city || null,

      state: payload.state || null,

      contact_name: payload.contact_name || null,

      phone: payload.phone || null,

      email: payload.email || null,

      full_address: payload.full_address || payload.address || null,

      full_description: payload.full_description || payload.description_long || null,

    };



    const { data, error } = await supabase

      .from('homeowner_leads') // غيّرها لو جدولك اسمه شيء ثاني

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

      body: JSON.stringify({ ok: true, data: data?.[0] || null })

    };

  } catch (err) {

    return {

      statusCode: 400,

      body: JSON.stringify({ ok: false, error: err.message })

    };

  }

};
