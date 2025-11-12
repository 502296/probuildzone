// netlify/functions/get-job.js

const { createClient } = require('@supabase/supabase-js');



exports.handler = async (event) => {

  try {

    const publicId = event.queryStringParameters && event.queryStringParameters.id;

    if (!publicId) {

      return { statusCode: 400, body: JSON.stringify({ error: 'Missing id' }) };

    }



    // مفاتيح Supabase من متغيرات بيئة نتلايفي (لا تكتبها في الكود)

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);



    // نقرأ السجل من homeowner_jobs باستخدام public_id

    const { data, error } = await supabase

      .from('homeowner_jobs')

      .select('id, public_id, title, name, email, phone, address, summary, created_at')

      .eq('public_id', publicId)

      .maybeSingle();



    if (error) {

      console.error('get-job error:', error);

      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };

    }



    if (!data) {

      return { statusCode: 404, body: JSON.stringify({ job: null }) };

    }



    return { statusCode: 200, body: JSON.stringify({ job: data }) };

  } catch (e) {

    console.error(e);

    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };

  }

};
