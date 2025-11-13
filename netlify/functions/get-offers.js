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



  const publicId = event.queryStringParameters?.id || null;

  if (!publicId) {

    return {

      statusCode: 400,

      headers,

      body: JSON.stringify({ ok: false, error: 'Missing id' }),

    };

  }



  // 1) نحصل UUID للجوب عبر public_id

  const { data: jobRow, error: jobErr } = await supabase

    .from('homeowner_jobs')

    .select('id')

    .eq('public_id', publicId)

    .maybeSingle();



  if (jobErr) {

    return {

      statusCode: 500,

      headers,

      body: JSON.stringify({ ok: false, error: jobErr.message }),

    };

  }



  if (!jobRow) {

    return {

      statusCode: 404,

      headers,

      body: JSON.stringify({ ok: false, error: 'Job not found' }),

    };

  }



  const jobUUID = jobRow.id;



  // 2) الآن نجلب العروض التي لها job_id = هذا الـUUID

  const { data: offers, error: offErr } = await supabase

    .from('job_offers')

    .select('id, pro_id, amount, message, created_at')

    .eq('job_id', jobUUID)

    .order('created_at', { ascending: false });



  if (offErr) {

    return {

      statusCode: 500,

      headers,

      body: JSON.stringify({ ok: false, error: offErr.message }),

    };

  }



  return {

    statusCode: 200,

    headers,

    body: JSON.stringify({ ok: true, offers }),

  };

};
