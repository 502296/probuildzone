// netlify/functions/get-offers.js

const { createClient } = require('@supabase/supabase-js');



exports.handler = async (event) => {

  try {

    const publicId = (event.queryStringParameters && event.queryStringParameters.id) || '';

    if (!publicId) return resp(400, { error: 'Missing id' });



    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);



    // نحول public_id -> UUID للوظيفة

    const { data: job, error: jobErr } = await supabase

      .from('homeowner_jobs')

      .select('id')

      .eq('public_id', publicId)

      .maybeSingle();

    if (jobErr) throw jobErr;

    if (!job) return resp(404, { error: 'Job not found' });



    const { data: offers, error: offersErr } = await supabase

      .from('job_offers')

      .select('id, amount, message, pro_name, phone, status, created_at')

      .eq('job_id', job.id)

      .order('created_at', { ascending: false });

    if (offersErr) throw offersErr;



    return resp(200, { offers: offers || [] });

  } catch (e) {

    console.error(e);

    return resp(500, { error: e.message || 'Server error' });

  }

};



function resp(statusCode, body) {

  return {

    statusCode,

    headers: {

      'Content-Type': 'application/json',

      'Access-Control-Allow-Origin': '*',

      'Cache-Control': 'no-store',

    },

    body: JSON.stringify(body),

  };

}
