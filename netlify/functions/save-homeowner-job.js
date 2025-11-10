// netlify/functions/save-homeowner-job.js



const { createClient } = require('@supabase/supabase-js');



const SUPABASE_URL = process.env.SUPABASE_URL;

const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;



// تأكيد شكل الرابط

function looksLikeSupabaseUrl(url) {

  return url && url.startsWith("https://") && url.includes(".supabase.co");

}



exports.handler = async (event) => {

  if (event.httpMethod !== "POST") {

    return {

      statusCode: 405,

      body: JSON.stringify({ ok: false, error: "Method not allowed" }),

    };

  }



  if (!SUPABASE_URL || !SUPABASE_KEY) {

    return {

      statusCode: 500,

      body: JSON.stringify({

        ok: false,

        error: "Missing Supabase environment variables on Netlify.",

      }),

    };

  }



  if (!looksLikeSupabaseUrl(SUPABASE_URL)) {

    return {

      statusCode: 500,

      body: JSON.stringify({

        ok: false,

        error: `SUPABASE_URL looks invalid: ${SUPABASE_URL}`,

      }),

    };

  }



  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);



  try {

    const payload = JSON.parse(event.body || "{}");



    const { data, error } = await supabase

      .from("homeowner_leads") // ← غيّر اسم الجدول هنا حسب جدولك في Supabase

      .insert([{

        category: payload.category || "General",

        project_title: payload.project_title || null,

        short_summary: payload.short_summary || null,

        city: payload.city || null,

        state: payload.state || null,

        contact_name: payload.contact_name || null,

        phone: payload.phone || null,

        email: payload.email || null,

        full_address: payload.full_address || null,

        full_description: payload.full_description || null,

      }])

      .select();



    if (error) {

      return {

        statusCode: 400,

        body: JSON.stringify({ ok: false, error: error.message }),

      };

    }



    return {

      statusCode: 200,

      body: JSON.stringify({ ok: true, data }),

    };

  } catch (err) {

    return {

      statusCode: 400,

      body: JSON.stringify({ ok: false, error: err.message }),

    };

  }

};
