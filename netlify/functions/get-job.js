// netlify/functions/get-job.js

const { createClient } = require('@supabase/supabase-js');



const supabaseUrl = process.env.SUPABASE_URL;

const supabaseKey =

  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;



const supabase = createClient(supabaseUrl, supabaseKey, {

  auth: { persistSession: false },

});



const headers = {

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Methods': 'GET, OPTIONS',

  'Access-Control-Allow-Headers': 'Content-Type',

};



exports.handler = async (event) => {

  if (event.httpMethod === 'OPTIONS') {

    return { statusCode: 200, headers, body: '' };

  }



  if (event.httpMethod !== 'GET') {

    return {

      statusCode: 405,

      headers,

      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),

    };

  }



  const publicId = event.queryStringParameters

    ? event.queryStringParameters.id

    : null;



  if (!publicId) {

    return {

      statusCode: 400,

      headers,

      body: JSON.stringify({ ok: false, error: 'Missing id' }),

    };

  }



  // 👇 مهم: نقرأ من homeowner_jobs ونبحث بـ public_id

  const { data, error } = await supabase

    .from('homeowner_jobs')

    .select(

      'public_id, name, city, state, zip, project_title, short_summary, full_description, created_at'

    )

    .eq('public_id', publicId)

    .maybeSingle();



  if (error) {

    console.error('get-job error:', error);

    return {

      statusCode: 500,

      headers,

      body: JSON.stringify({ ok: false, error: error.message }),

    };

  }



  if (!data) {

    return {

      statusCode: 404,

      headers,

      body: JSON.stringify({ ok: false, error: 'Job not found' }),

    };

  }



  return {

    statusCode: 200,

    headers,

    body: JSON.stringify({ ok: true, job: data }),

  };

};
